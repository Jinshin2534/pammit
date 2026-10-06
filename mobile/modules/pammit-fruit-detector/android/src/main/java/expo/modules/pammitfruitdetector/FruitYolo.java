package expo.modules.pammitfruitdetector;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;

import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

// 果実検出（fruit-yolo11n.onnx）。AI実装計画の android-inference/FruitYolo.java を移したもの。
// 1024角のレターボックス（灰色114）→ [1,5,21504] = cx,cy,w,h,score → スコア順に IoU 0.7 で NMS。
final class FruitYolo implements AutoCloseable {
    static final float MIN_SCORE = 0.3f;
    static final float NMS_IOU = 0.7f;
    private static final int SIZE = 1024;
    private final OrtEnvironment env = OrtEnvironment.getEnvironment();
    private final OrtSession session;

    static final class Detection {
        final RectF box;
        final float score;

        Detection(RectF box, float score) {
            this.box = box;
            this.score = score;
        }
    }

    FruitYolo(byte[] model) throws Exception {
        OrtSession.SessionOptions options = new OrtSession.SessionOptions();
        options.setIntraOpNumThreads(4);
        session = env.createSession(model, options);
    }

    /** 元画像のピクセル座標の枠。スコアの高い順。 */
    List<Detection> detect(Bitmap image) throws Exception {
        int width = image.getWidth(), height = image.getHeight();
        float scale = Math.min((float) SIZE / width, (float) SIZE / height);
        int w = Math.round(width * scale), h = Math.round(height * scale);
        // 余白の分け方は Ultralytics と同じ（左・上は round(余白/2-0.1)）
        int padX = Math.round((SIZE - w) / 2f - 0.1f), padY = Math.round((SIZE - h) / 2f - 0.1f);
        Bitmap letterbox = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(letterbox);
        canvas.drawColor(Color.rgb(114, 114, 114));
        Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG);
        Bitmap scaled = Bitmap.createScaledBitmap(image, w, h, true);
        canvas.drawBitmap(scaled, padX, padY, paint);
        if (scaled != image) scaled.recycle();
        int[] argb = new int[SIZE * SIZE];
        letterbox.getPixels(argb, 0, SIZE, 0, 0, SIZE, SIZE);
        letterbox.recycle();
        float[] chw = new float[3 * SIZE * SIZE];
        for (int i = 0; i < argb.length; i++) {
            chw[i] = ((argb[i] >> 16) & 255) / 255f;
            chw[SIZE * SIZE + i] = ((argb[i] >> 8) & 255) / 255f;
            chw[2 * SIZE * SIZE + i] = (argb[i] & 255) / 255f;
        }
        float[][][] out;
        try (OnnxTensor input = OnnxTensor.createTensor(env, FloatBuffer.wrap(chw), new long[] {1, 3, SIZE, SIZE});
             OrtSession.Result result = session.run(Collections.singletonMap("images", input))) {
            out = (float[][][]) result.get(0).getValue();
        }
        int n = out[0][0].length;
        List<float[]> candidates = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            float score = out[0][4][i];
            if (score < MIN_SCORE) continue;
            float cx = out[0][0][i], cy = out[0][1][i], bw = out[0][2][i], bh = out[0][3][i];
            candidates.add(new float[] {(cx - bw / 2 - padX) / scale, (cy - bh / 2 - padY) / scale,
                    (cx + bw / 2 - padX) / scale, (cy + bh / 2 - padY) / scale, score});
        }
        candidates.sort((a, b) -> Float.compare(b[4], a[4]));
        List<Detection> kept = new ArrayList<>();
        for (float[] c : candidates) {
            RectF box = new RectF(c[0], c[1], c[2], c[3]);
            boolean overlaps = false;
            for (Detection k : kept) if (iou(box, k.box) > NMS_IOU) { overlaps = true; break; }
            if (!overlaps) kept.add(new Detection(box, c[4]));
        }
        // NMS の後で画像内に収め、幅・高さが残るものだけ返す
        List<Detection> clipped = new ArrayList<>();
        for (Detection d : kept) {
            RectF box = new RectF(clamp(d.box.left, width), clamp(d.box.top, height),
                    clamp(d.box.right, width), clamp(d.box.bottom, height));
            if (box.width() > 0 && box.height() > 0) clipped.add(new Detection(box, d.score));
        }
        return clipped;
    }

    private static float clamp(float value, int max) {
        return Math.max(0, Math.min(max, value));
    }

    static float iou(RectF a, RectF b) {
        float ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        float iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        float inter = ix * iy;
        return inter / (a.width() * a.height() + b.width() * b.height() - inter + 1e-6f);
    }

    @Override public void close() throws Exception { session.close(); }
}
