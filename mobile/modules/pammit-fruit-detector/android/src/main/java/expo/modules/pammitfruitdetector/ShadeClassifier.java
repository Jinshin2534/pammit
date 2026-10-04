package expo.modules.pammitfruitdetector;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;

import java.nio.FloatBuffer;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// 「見えている果面の7割以上が陰」の判定（scene_encoder.onnx + shade70.onnx）。
// AI実装計画の android-inference/ShadeClassifier.java を移したもの。
// crop: 枠を上下左右20%広げて灰色127で224角へ。wide: 枠の中心から辺 3*max(w,h) の正方形、画像外は黒。
// scene: 画像全体を黒で224角へ。いずれも ImageNet の平均・標準偏差で正規化する。
final class ShadeClassifier implements AutoCloseable {
    static final float HIGH = 0.7f, LOW = 0.2f;
    private static final float[] MEAN = {0.485f, 0.456f, 0.406f};
    private static final float[] STD = {0.229f, 0.224f, 0.225f};
    private final OrtEnvironment env = OrtEnvironment.getEnvironment();
    private final OrtSession scene, shade;

    ShadeClassifier(byte[] sceneModel, byte[] shadeModel) throws Exception {
        OrtSession.SessionOptions options = new OrtSession.SessionOptions();
        options.setIntraOpNumThreads(4);
        scene = env.createSession(sceneModel, options);
        try {
            shade = env.createSession(shadeModel, options);
        } catch (Exception e) {
            scene.close();
            throw e;
        }
    }

    /** 各枠の果実が陰である確率。枠が0件ならモデルを動かさない。 */
    float[] probabilities(Bitmap image, List<RectF> boxes) throws Exception {
        int n = boxes.size();
        if (n == 0) return new float[0];
        float[] sceneVector;
        try (OnnxTensor input = tensor(pad(image, image.getWidth(), image.getHeight(), Color.BLACK, null));
             OrtSession.Result result = scene.run(Collections.singletonMap("image", input))) {
            sceneVector = ((float[][]) result.get(0).getValue())[0];
        }
        float[] crops = new float[n * 3 * 224 * 224], wides = new float[n * 3 * 224 * 224];
        float[] scenes = new float[n * 576];
        for (int i = 0; i < n; i++) {
            RectF b = boxes.get(i);
            float mw = b.width() * 0.2f, mh = b.height() * 0.2f;
            Rect context = new Rect(Math.round(Math.max(0, b.left - mw)), Math.round(Math.max(0, b.top - mh)),
                    Math.round(Math.min(image.getWidth(), b.right + mw)), Math.round(Math.min(image.getHeight(), b.bottom + mh)));
            // 丸めで幅・高さが0になると切り抜けないため、最低1画素にする
            if (context.width() < 1) context.right = Math.min(image.getWidth(), context.left + 1);
            if (context.height() < 1) context.bottom = Math.min(image.getHeight(), context.top + 1);
            context.left = Math.min(context.left, context.right - 1);
            context.top = Math.min(context.top, context.bottom - 1);
            Bitmap cropped = Bitmap.createBitmap(image, context.left, context.top, context.width(), context.height());
            fill(crops, i, pad(cropped, context.width(), context.height(), Color.rgb(127, 127, 127), null));
            if (cropped != image) cropped.recycle();
            float half = Math.max(b.width(), b.height()) * 1.5f;
            Rect wide = new Rect(Math.round(b.centerX() - half), Math.round(b.centerY() - half),
                    Math.round(b.centerX() + half), Math.round(b.centerY() + half));
            fill(wides, i, pad(image, wide.width(), wide.height(), Color.BLACK, wide));
            System.arraycopy(sceneVector, 0, scenes, i * 576, 576);
        }
        Map<String, OnnxTensor> inputs = new HashMap<>();
        try {
            inputs.put("crop", OnnxTensor.createTensor(env, FloatBuffer.wrap(crops), new long[] {n, 3, 224, 224}));
            inputs.put("wide", OnnxTensor.createTensor(env, FloatBuffer.wrap(wides), new long[] {n, 3, 224, 224}));
            inputs.put("scene", OnnxTensor.createTensor(env, FloatBuffer.wrap(scenes), new long[] {n, 576}));
            float[] probabilities = new float[n];
            try (OrtSession.Result result = shade.run(inputs)) {
                float[][] logits = (float[][]) result.get(0).getValue();
                for (int i = 0; i < n; i++) probabilities[i] = (float) (1 / (1 + Math.exp(-logits[i][0])));
            }
            return probabilities;
        } finally {
            for (OnnxTensor t : inputs.values()) t.close();
        }
    }

    static String state(float probability) {
        if (probability >= HIGH) return "mostly_shaded";
        return probability <= LOW ? "not_mostly_shaded" : "unknown";
    }

    // source（region を指定したときはその範囲。画像外は黒）を縦横比を保って224角の中央に置く
    private static Bitmap pad(Bitmap source, int w, int h, int background, Rect region) {
        Bitmap out = Bitmap.createBitmap(224, 224, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(out);
        canvas.drawColor(background);
        float scale = Math.min(224f / w, 224f / h);
        float dw = w * scale, dh = h * scale, ox = (224 - dw) / 2, oy = (224 - dh) / 2;
        Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG);
        if (region == null) {
            canvas.drawBitmap(source, null, new RectF(ox, oy, ox + dw, oy + dh), paint);
        } else {
            canvas.drawColor(Color.BLACK);
            Rect inside = new Rect(region);
            if (!inside.intersect(0, 0, source.getWidth(), source.getHeight())) return out;
            RectF target = new RectF(ox + (inside.left - region.left) * scale, oy + (inside.top - region.top) * scale,
                    ox + (inside.right - region.left) * scale, oy + (inside.bottom - region.top) * scale);
            canvas.drawBitmap(source, inside, target, paint);
        }
        return out;
    }

    private static void fill(float[] dest, int index, Bitmap bitmap) {
        int[] argb = new int[224 * 224];
        bitmap.getPixels(argb, 0, 224, 0, 0, 224, 224);
        bitmap.recycle();
        int base = index * 3 * 224 * 224;
        for (int i = 0; i < argb.length; i++) {
            dest[base + i] = (((argb[i] >> 16) & 255) / 255f - MEAN[0]) / STD[0];
            dest[base + 224 * 224 + i] = (((argb[i] >> 8) & 255) / 255f - MEAN[1]) / STD[1];
            dest[base + 2 * 224 * 224 + i] = ((argb[i] & 255) / 255f - MEAN[2]) / STD[2];
        }
    }

    private OnnxTensor tensor(Bitmap bitmap) throws Exception {
        float[] data = new float[3 * 224 * 224];
        fill(data, 0, bitmap);
        return OnnxTensor.createTensor(env, FloatBuffer.wrap(data), new long[] {1, 3, 224, 224});
    }

    @Override public void close() throws Exception {
        scene.close();
        shade.close();
    }
}
