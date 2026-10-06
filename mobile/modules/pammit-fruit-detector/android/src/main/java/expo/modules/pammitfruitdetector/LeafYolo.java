package expo.modules.pammitfruitdetector;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;

import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

// 葉の切り出し（leaf-yolo11n-seg.onnx、YOLO11n-seg）。AI実装計画の android-inference/LeafYolo.java を移したもの。
// 入力は正方形の切り抜きを640角に縮めたもの（余白なし）。出力 [1,37,8400] = cx,cy,w,h,score と係数32個、protos [1,32,160,160]。
// leafAt(): 切り抜きの256角の格子で、点を含むいちばん確かな葉。なければ点から NEAR 以内のいちばん近い葉。なければ null。
// allLeaves(): 案内モード用。任意の形の切り抜きの葉を全部、切り抜きの幅・高さに引き伸ばした256角の格子で返す。
final class LeafYolo implements AutoCloseable {
    private static final int SIZE = 640, PROTO = 160, COEFS = 32;
    private static final float MIN_SCORE = 0.1f, NEAR = 0.03f;
    private static final int MIN_PIXELS = 10;  // 256角の格子の画素数
    private final OrtEnvironment env = OrtEnvironment.getEnvironment();
    private final OrtSession session;
    long lastPreMs, lastInferMs, lastPostMs;

    LeafYolo(byte[] model) throws Exception {
        OrtSession.SessionOptions options = new OrtSession.SessionOptions();
        options.setIntraOpNumThreads(4);
        session = env.createSession(model, options);
    }

    /** 葉を全部返す（スコア MIN_SCORE 以上、IoU 0.7 で NMS、格子で MIN_PIXELS 画素以上）。スコアの高い順。 */
    List<boolean[]> allLeaves(Bitmap crop) throws Exception {
        long t0 = android.os.SystemClock.elapsedRealtime();
        int w = crop.getWidth(), h = crop.getHeight();
        float scale = (float) SIZE / Math.max(w, h);
        int sw = Math.round(w * scale), sh = Math.round(h * scale);
        float padX = (SIZE - sw) / 2f, padY = (SIZE - sh) / 2f;
        Bitmap letterbox = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(letterbox);
        canvas.drawColor(Color.rgb(114, 114, 114));
        canvas.drawBitmap(Bitmap.createScaledBitmap(crop, sw, sh, true), padX, padY, new Paint(Paint.FILTER_BITMAP_FLAG));
        Object[] result = run(letterbox, t0);
        float[][][] out = (float[][][]) result[0];
        float[][][] protos = ((float[][][][]) result[1])[0];
        long t2 = android.os.SystemClock.elapsedRealtime();
        List<float[]> boxes = new ArrayList<>();
        for (int i = 0; i < out[0][0].length; i++) {
            float score = out[0][4][i];
            if (score < MIN_SCORE) continue;
            float cx = out[0][0][i], cy = out[0][1][i], bw = out[0][2][i], bh = out[0][3][i];
            boxes.add(new float[] {cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2, score, i});
        }
        boxes.sort((a, b) -> Float.compare(b[4], a[4]));
        List<float[]> kept = new ArrayList<>();
        for (float[] b : boxes) {
            boolean overlaps = false;
            for (float[] k : kept) if (iou(b, k) > 0.7f) { overlaps = true; break; }
            if (!overlaps) kept.add(b);
        }
        List<boolean[]> leaves = new ArrayList<>();
        float k = (float) PROTO / SIZE;
        for (float[] b : kept) {
            float[] coef = new float[COEFS];
            for (int c = 0; c < COEFS; c++) coef[c] = out[0][5 + c][(int) b[5]];
            boolean[] m = new boolean[256 * 256];
            int count = 0;
            for (int y = 0; y < 256; y++) {
                float ly = (y + 0.5f) * h / 256f * scale + padY;  // レターボックス上の画素
                if (ly < b[1] || ly > b[3]) continue;
                int py = Math.min(PROTO - 1, (int) (ly * k));
                for (int x = 0; x < 256; x++) {
                    float lx = (x + 0.5f) * w / 256f * scale + padX;
                    if (lx < b[0] || lx > b[2]) continue;
                    int px = Math.min(PROTO - 1, (int) (lx * k));
                    float v = 0;
                    for (int c = 0; c < COEFS; c++) v += coef[c] * protos[c][py][px];
                    if (v > 0) { m[y * 256 + x] = true; count++; }
                }
            }
            if (count >= MIN_PIXELS) leaves.add(m);
        }
        lastPostMs = android.os.SystemClock.elapsedRealtime() - t2;
        return leaves;
    }

    /** 640角の画像でモデルを動かし {output0, output1} を返す。lastPreMs・lastInferMs を記録する。 */
    private Object[] run(Bitmap input, long t0) throws Exception {
        int[] argb = new int[SIZE * SIZE];
        input.getPixels(argb, 0, SIZE, 0, 0, SIZE, SIZE);
        float[] chw = new float[3 * SIZE * SIZE];
        for (int i = 0; i < argb.length; i++) {
            chw[i] = ((argb[i] >> 16) & 255) / 255f;
            chw[SIZE * SIZE + i] = ((argb[i] >> 8) & 255) / 255f;
            chw[2 * SIZE * SIZE + i] = (argb[i] & 255) / 255f;
        }
        long t1 = android.os.SystemClock.elapsedRealtime();
        try (OnnxTensor tensor = OnnxTensor.createTensor(env, FloatBuffer.wrap(chw), new long[] {1, 3, SIZE, SIZE});
             OrtSession.Result result = session.run(Collections.singletonMap("images", tensor))) {
            Object[] out = {result.get(0).getValue(), result.get(1).getValue()};
            lastPreMs = t1 - t0;
            lastInferMs = android.os.SystemClock.elapsedRealtime() - t1;
            return out;
        }
    }

    /** (pointX, pointY) は正方形の切り抜きの256角の格子での位置。 */
    boolean[] leafAt(Bitmap crop, float pointX, float pointY) throws Exception {
        long t0 = android.os.SystemClock.elapsedRealtime();
        Object[] result = run(Bitmap.createScaledBitmap(crop, SIZE, SIZE, true), t0);
        float[][][] out = (float[][][]) result[0];
        float[][][][] protos = (float[][][][]) result[1];
        long t2 = android.os.SystemClock.elapsedRealtime();
        // 枠が点から NEAR 以内に来る候補。スコアの高い順、IoU 0.7 で NMS。
        float px = pointX * SIZE / 256f, py = pointY * SIZE / 256f, near = NEAR * SIZE;
        List<float[]> boxes = new ArrayList<>();
        for (int i = 0; i < out[0][0].length; i++) {
            float score = out[0][4][i];
            if (score < MIN_SCORE) continue;
            float cx = out[0][0][i], cy = out[0][1][i], w = out[0][2][i], h = out[0][3][i];
            float x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2;
            if (px < x0 - near || px > x1 + near || py < y0 - near || py > y1 + near) continue;
            boxes.add(new float[] {x0, y0, x1, y1, score, i});
        }
        boxes.sort((a, b) -> Float.compare(b[4], a[4]));
        List<float[]> kept = new ArrayList<>();
        for (float[] b : boxes) {
            boolean overlaps = false;
            for (float[] k : kept) if (iou(b, k) > 0.7f) { overlaps = true; break; }
            if (!overlaps) kept.add(b);
        }
        boolean[] best = null;
        double bestDistance = Double.MAX_VALUE;
        for (float[] b : kept) {
            boolean[] m = mask(out, protos[0], (int) b[5], b);
            int gx = Math.max(0, Math.min(255, Math.round(pointX))), gy = Math.max(0, Math.min(255, Math.round(pointY)));
            if (m[gy * 256 + gx]) { best = m; break; }  // 点を含む中でスコアがいちばん高い葉
            double d = Double.MAX_VALUE;
            for (int i = 0; i < m.length; i++) {
                if (!m[i]) continue;
                double dx = i % 256 - pointX, dy = i / 256 - pointY;
                d = Math.min(d, dx * dx + dy * dy);
            }
            if (d <= Math.pow(NEAR * 256, 2) && d < bestDistance) { bestDistance = d; best = m; }
        }
        lastPostMs = android.os.SystemClock.elapsedRealtime() - t2;
        return best;
    }

    /** 256角の格子の葉のマスク。枠の中で sigmoid(係数・protos) > 0.5 の画素。 */
    private static boolean[] mask(float[][][] out, float[][][] protos, int index, float[] box) {
        float[] coef = new float[COEFS];
        for (int c = 0; c < COEFS; c++) coef[c] = out[0][5 + c][index];
        boolean[] m = new boolean[256 * 256];
        float k = (float) PROTO / 256f, s = 256f / SIZE;
        int x0 = Math.max(0, (int) (box[0] * s)), y0 = Math.max(0, (int) (box[1] * s));
        int x1 = Math.min(255, (int) Math.ceil(box[2] * s)), y1 = Math.min(255, (int) Math.ceil(box[3] * s));
        for (int y = y0; y <= y1; y++) {
            int py = Math.min(PROTO - 1, (int) ((y + 0.5f) * k));
            for (int x = x0; x <= x1; x++) {
                int px = Math.min(PROTO - 1, (int) ((x + 0.5f) * k));
                float v = 0;
                for (int c = 0; c < COEFS; c++) v += coef[c] * protos[c][py][px];
                m[y * 256 + x] = v > 0;  // sigmoid(v) > 0.5
            }
        }
        return m;
    }

    private static float iou(float[] a, float[] b) {
        float ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
        float iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
        float inter = ix * iy;
        return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter + 1e-6f);
    }

    @Override public void close() throws Exception { session.close(); }
}
