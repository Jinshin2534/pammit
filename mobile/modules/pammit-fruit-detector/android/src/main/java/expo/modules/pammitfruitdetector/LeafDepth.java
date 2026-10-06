package expo.modules.pammitfruitdetector;

import android.graphics.Bitmap;
import android.graphics.Rect;
import android.graphics.RectF;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;

import java.nio.FloatBuffer;
import java.util.Arrays;
import java.util.Collections;

// 実に重なって写る葉が、実に付いているか・手前で浮いているか・実の奥か（Depth Anything V2 Small、相対的な奥行き、大きいほど手前）。
// AI実装計画の android-inference/LeafDepth.java を移したもの。実の枠の3倍の正方形（画像内に切り詰め）を252角にして推定する。
// 実の楕円の中で、葉の画素の奥行きの中央値が残りより小さければ奥。手前のとき、その差を切り抜きの奥行きの幅
// （95パーセンタイル - 5パーセンタイル）で割った値が CONTACT_GAP 未満なら密着。CPU のほうが XNNPACK より速い。
final class LeafDepth implements AutoCloseable {
    static final int SIZE = 252;
    private static final int MIN_LEAF = 5, MIN_FRUIT = 20;
    static final float CONTACT_GAP = 0.04f;
    private static final float[] MEAN = {0.485f, 0.456f, 0.406f};
    private static final float[] STD = {0.229f, 0.224f, 0.225f};
    private final OrtEnvironment env = OrtEnvironment.getEnvironment();
    private final OrtSession session;
    // 直前の実の切り抜きの奥行き。同じ写真・同じ実を続けて聞かれたら使い回す（案内モードは1つの実のまわりの葉を何枚も試す）。
    private Bitmap lastImage;
    private RectF lastFruit;
    private float[] lastDepth;
    int runs;

    LeafDepth(byte[] model) throws Exception {
        OrtSession.SessionOptions options = new OrtSession.SessionOptions();
        options.setIntraOpNumThreads(4);
        session = env.createSession(model, options);
    }

    /** 葉が実の奥なら true、手前なら false。どちらかの見えている部分が少なすぎれば null。 */
    Boolean behind(Bitmap image, RectF fruit, boolean[] leaf, int left, int top, int side) throws Exception {
        String state = state(image, fruit, leaf, left, top, side);
        return state == null ? null : state.equals("behind");
    }

    /**
     * "behind"（奥）、"contact"（密着）、"floating"（手前で浮いている）。どちらかの見えている部分が少なすぎれば null。
     * `leaf` は画像の正方形の範囲 (left, top, side) にかけた256角のマスク。
     */
    String state(Bitmap image, RectF fruit, boolean[] leaf, int left, int top, int side) throws Exception {
        return state(image, fruit, leaf, left, top, side, side);
    }

    /** 同じ判定。`leaf` は範囲 (left, top, width, height) にかけた256角のマスク。 */
    String state(Bitmap image, RectF fruit, boolean[] leaf, int left, int top, int width, int height) throws Exception {
        float half = Math.max(fruit.width(), fruit.height()) * 1.5f;
        Rect box = new Rect(Math.max(0, (int) (fruit.centerX() - half)), Math.max(0, (int) (fruit.centerY() - half)),
                Math.min(image.getWidth(), (int) (fruit.centerX() + half)), Math.min(image.getHeight(), (int) (fruit.centerY() + half)));
        float[] depth;
        if (image == lastImage && fruit.equals(lastFruit)) {
            depth = lastDepth;
        } else {
            depth = depth(Bitmap.createScaledBitmap(
                    Bitmap.createBitmap(image, box.left, box.top, box.width(), box.height()), SIZE, SIZE, true));
            lastImage = image;
            lastFruit = new RectF(fruit);
            lastDepth = depth;
            runs++;
        }
        float sx = (float) box.width() / SIZE, sy = (float) box.height() / SIZE, g = 256f / width, h = 256f / height;
        float cx = fruit.centerX(), cy = fruit.centerY(), rx = Math.max(fruit.width() / 2, 1), ry = Math.max(fruit.height() / 2, 1);
        float[] on = new float[SIZE * SIZE], rest = new float[SIZE * SIZE];
        int nOn = 0, nRest = 0;
        for (int v = 0; v < SIZE; v++) {
            float y = box.top + (v + 0.5f) * sy;
            for (int u = 0; u < SIZE; u++) {
                float x = box.left + (u + 0.5f) * sx;
                if (Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) > 1) continue;
                int gx = (int) ((x - left) * g), gy = (int) ((y - top) * h);
                boolean isLeaf = gx >= 0 && gx < 256 && gy >= 0 && gy < 256 && leaf[gy * 256 + gx];
                if (isLeaf) on[nOn++] = depth[v * SIZE + u];
                else rest[nRest++] = depth[v * SIZE + u];
            }
        }
        if (nOn < MIN_LEAF || nRest < MIN_FRUIT) return null;
        float gap = median(on, nOn) - median(rest, nRest);
        if (gap < 0) return "behind";
        float spread = percentile(depth, 0.95f) - percentile(depth, 0.05f) + 1e-6f;
        return gap / spread < CONTACT_GAP ? "contact" : "floating";
    }

    private float[] depth(Bitmap crop) throws Exception {
        int[] argb = new int[SIZE * SIZE];
        crop.getPixels(argb, 0, SIZE, 0, 0, SIZE, SIZE);
        float[] data = new float[3 * SIZE * SIZE];
        for (int i = 0; i < argb.length; i++) {
            data[i] = (((argb[i] >> 16) & 255) / 255f - MEAN[0]) / STD[0];
            data[SIZE * SIZE + i] = (((argb[i] >> 8) & 255) / 255f - MEAN[1]) / STD[1];
            data[2 * SIZE * SIZE + i] = ((argb[i] & 255) / 255f - MEAN[2]) / STD[2];
        }
        try (OnnxTensor input = OnnxTensor.createTensor(env, FloatBuffer.wrap(data), new long[] {1, 3, SIZE, SIZE});
             OrtSession.Result result = session.run(Collections.singletonMap("image", input))) {
            float[][] d = ((float[][][]) result.get(0).getValue())[0];  // 出力は 1 x 252 x 252
            float[] out = new float[SIZE * SIZE];
            for (int v = 0; v < SIZE; v++) System.arraycopy(d[v], 0, out, v * SIZE, SIZE);
            return out;
        }
    }

    /** 線形補間のパーセンタイル（numpy.percentile と同じ）。 */
    private static float percentile(float[] values, float q) {
        float[] sorted = values.clone();
        Arrays.sort(sorted);
        float pos = q * (sorted.length - 1);
        int i = (int) pos;
        return i + 1 < sorted.length ? sorted[i] + (pos - i) * (sorted[i + 1] - sorted[i]) : sorted[i];
    }

    private static float median(float[] values, int n) {
        float[] sorted = Arrays.copyOf(values, n);
        Arrays.sort(sorted);
        return n % 2 == 1 ? sorted[n / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    }

    @Override public void close() throws Exception {
        session.close();
    }
}
