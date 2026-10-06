package expo.modules.pammitfruitdetector;

import android.graphics.Bitmap;
import android.graphics.RectF;
import android.os.SystemClock;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

// 帽子の1枚から、取る／残すを答える。AI実装計画の android-inference/KoreJudge.java を移したもの。
// 実の検出 → 実ごとの陰 → ハサミの先（色テープ）→ 先のまわりの葉を LeafYolo で切り出す → 答え。
// 先が実に触れていれば摘果（近すぎる実か、FruitPair）。
//
// 摘葉の決まり: 実に重なって写る葉は奥行き（LeafDepth）で分け、密着なら取る（言い切る）。
// 奥行きが答えを出せないときも重なりとして取る。手前で浮いている葉・実の奥の葉は重なりとして扱わず、
// 実の上にあって実が陰なら取る。陰か分からなければ残す。それ以外は残す。
//
// ハサミの先が写っていない写真は、帽子の判定中（最後の音声を鳴らし終えてから15秒以内、「これ」）なら
// 撮り直しを頼み、判定中でなければ（「お願い」）案内モード（GuideMode）を始める。
// 帽子からはどちらの言葉か届かないので、判定中かどうかは呼び出し側が渡す。
//
// 葉の切り出しは専用スレッドで、実の検出・陰の判定と同時に動かす。
final class KoreJudge implements AutoCloseable {
    static final class Answer {
        String say, why, scene, mode, verdict;
        int fruits, shaded;
        final Map<String, Long> timingMs = new LinkedHashMap<>();
    }

    private final FruitYolo yolo;
    private final ShadeClassifier shade;
    private final LeafYolo leafYolo;
    private final LeafDepth depth;
    private final GuideMode guide;
    private final ExecutorService leafThread = Executors.newSingleThreadExecutor();

    KoreJudge(FruitYolo yolo, ShadeClassifier shade, LeafYolo leafYolo, LeafDepth depth) {
        this.yolo = yolo;
        this.shade = shade;
        this.leafYolo = leafYolo;
        this.depth = depth;
        this.guide = new GuideMode(depth, leafYolo);
    }

    private static <T> T await(Future<T> future) throws Exception {
        try {
            return future.get();
        } catch (ExecutionException e) {
            throw e.getCause() instanceof Exception ? (Exception) e.getCause() : e;
        }
    }

    /** `judging` は帽子の判定中（最後の音声を鳴らし終えてから15秒以内）なら true。 */
    Answer judge(Bitmap image, boolean judging) throws Exception {
        long start = SystemClock.elapsedRealtime();
        if (!judging) guide.clear();
        Answer answer = new Answer();
        int W = image.getWidth(), H = image.getHeight();
        Bitmap small = scaleToMax(image, 1000);  // テープの色の設定はこの大きさで決めた
        float k = (float) small.getWidth() / W;
        float[] tipSmall = TapeTip.find(small, 150);
        if (small != image) small.recycle();
        long tTip = SystemClock.elapsedRealtime();

        float[] tip = null;
        int side = 0, left = 0, top = 0;
        float px = 0, py = 0;
        Future<boolean[]> cutting = null;
        if (tipSmall != null) {
            tip = new float[] {tipSmall[0] / k, tipSmall[1] / k};
            // 先のまわり（画像の長辺の40%）の正方形。触れている点は、先から手と反対向きに長辺の3%ずらす
            side = (int) (Math.max(W, H) * 0.4f);
            left = (int) Math.min(Math.max(0, tip[0] - side / 2f), Math.max(0, W - side));
            top = (int) Math.min(Math.max(0, tip[1] - side * 0.6f), Math.max(0, H - side));
            side = Math.min(side, Math.min(W - left, H - top));
            double dx = tip[0] - W / 2.0, dy = tip[1] - H, n = Math.max(Math.hypot(dx, dy), 1), step = 0.03 * Math.max(W, H);
            px = (float) (tip[0] - left + dx / n * step);
            py = (float) (tip[1] - top + dy / n * step);
            Bitmap crop = Bitmap.createBitmap(image, left, top, side, side);
            float g = 256f / side, qx = px * g, qy = py * g;
            cutting = leafThread.submit(() -> leafYolo.leafAt(crop, qx, qy));
        }

        List<RectF> allFruits = new ArrayList<>();
        for (FruitYolo.Detection d : yolo.detect(image)) allFruits.add(d.box);
        // 摘果の相手の実は小さくても遠くてもよい。摘葉と案内は大きい（近い）実だけ
        List<RectF> fruits = new ArrayList<>(allFruits);
        fruits.removeIf(b -> b.width() / W < 0.04f);
        long tDetect = SystemClock.elapsedRealtime();
        float[] p = shade.probabilities(image, fruits);
        String[] states = new String[fruits.size()];
        for (int i = 0; i < states.length; i++) states[i] = ShadeClassifier.state(p[i]);
        long tShade = SystemClock.elapsedRealtime();
        answer.fruits = fruits.size();
        answer.shaded = count(states, "mostly_shaded");

        boolean[] leaf = null;
        int touchedFruit = -1;
        if (cutting != null) {
            leaf = await(cutting);
            // 点を含む葉が最優先。なければ先が実の中にあれば摘果。それもなければ点の近くの葉か、触った場所
            int gx = clamp(Math.round(px * 256f / side)), gy = clamp(Math.round(py * 256f / side));
            int onFruit = fruitAtTip(allFruits, tip);
            if (onFruit >= 0 && (leaf == null || !leaf[gy * 256 + gx])) {
                touchedFruit = onFruit;
                leaf = null;
            }
            if (touchedFruit < 0 && leaf == null) {
                // 葉の形が取れないときは「分からない」と言わず、触った場所（半径は長辺の2%）と実の位置で判定する
                leaf = disc(px * 256f / side, py * 256f / side, 0.02f * Math.max(W, H) * 256f / side);
            }
        }
        long tLeaf = SystemClock.elapsedRealtime();

        String[] guideWords = null;
        long depthMs = 0;
        String scene;
        if (tip == null && judging) {
            scene = "no_tip";
            answer.mode = "retake";
        } else if (tip == null) {
            scene = "guide";
            answer.mode = "guide";
            guideWords = guide.start(image, fruits, states, allFruits);
        } else if (touchedFruit >= 0) {
            scene = FruitPair.scene(touchedFruit, allFruits);
            answer.mode = "touch";
        } else {
            answer.mode = "touch";
            String relation = "none";
            int behind = 0, floating = 0;
            float g = 256f / side;
            for (int i = 0; i < fruits.size(); i++) {
                RectF b = fruits.get(i);
                RectF box = new RectF((b.left - left) * g, (b.top - top) * g, (b.right - left) * g, (b.bottom - top) * g);
                String r = relation(leaf, box, false);
                if (r.equals("overlap")) {
                    long t = SystemClock.elapsedRealtime();
                    String state = depth.state(image, b, leaf, left, top, side);
                    depthMs += SystemClock.elapsedRealtime() - t;
                    if (state == null || state.equals("contact")) {
                        relation = state == null ? "overlap" : "contact";
                        break;
                    }
                    if (state.equals("behind")) behind++; else floating++;
                    r = relation(leaf, box, true);
                }
                if (r.equals("above") && !relation.equals("above_shaded")) {
                    if (states[i].equals("mostly_shaded")) relation = "above_shaded";
                    else if (states[i].equals("unknown")) relation = "above_unsure";
                }
            }
            scene = !relation.equals("none") ? relation : fruits.isEmpty() ? "no_fruit"
                    : floating > 0 ? "floating" : behind > 0 ? "behind" : "other";
        }

        String[] words = guideWords != null ? guideWords : words(scene);
        answer.scene = scene;
        answer.say = words[0];
        answer.why = words[1];
        boolean cut = answer.say.startsWith("取って") || scene.equals("fruit_pair") || scene.equals("fruit_cluster");
        answer.verdict = answer.mode.equals("touch") ? (cut ? "cut" : "keep") : null;
        if (answer.mode.equals("touch") && guide.active()) {
            answer.say = answer.say + "。" + guide.after(cut)[0];
        }
        answer.timingMs.put("tip", tTip - start);
        answer.timingMs.put("detect", tDetect - tTip);
        answer.timingMs.put("shade", tShade - tDetect);
        answer.timingMs.put("leafWait", tLeaf - tShade);
        answer.timingMs.put("depth", depthMs);
        if (guideWords != null) answer.timingMs.put("guide", guide.lastBuildMs);
        answer.timingMs.put("total", SystemClock.elapsedRealtime() - start);
        return answer;
    }

    /** {答え, 「なんで？」の理由}。言葉は docs/voice-wording.md の表どおり。葉の形が取れなかったときも同じ言葉。 */
    static String[] words(String scene) {
        switch (scene) {
            case "no_tip": return new String[] {"ハサミの先が見えません。もう一度お願いします",
                    "ハサミの先の色テープが、写真に写っていませんでした"};
            case "no_fruit": return new String[] {"残してください",
                    "近くに実が写っていません。取る理由になる実がないので残します"};
            case "contact": return new String[] {"取ってください",
                    "実に付いています。付いたままだと、下が黄白色の色むらになり、収穫まで残ります"};
            case "floating": return new String[] {"残してください",
                    "実には付いておらず、実を陰にもしていません。取る理由がないので残します"};
            case "behind": return new String[] {"残してください",
                    "実の奥にある葉で、実には付いていません。取る理由がないので残します"};
            case "overlap": return new String[] {"取ってください",
                    "実に付いたままだと、下が黄白色の色むらになり、収穫まで残ります。いちばん先に取る葉です"};
            case "above_shaded": return new String[] {"取ってください",
                    "実を陰にしている葉です。収穫20日前までは、こういう葉を取って実に日を当てます"};
            case "above_unsure": return new String[] {"残してください",
                    "実が陰になっているか、写真では分かりませんでした。迷ったときは残します"};
            case "fruit_pair": return new String[] {"どちらか1つ取ってください",
                    "実同士が近すぎます。傷がなく形がいい方を残してください"};
            case "fruit_cluster": return new String[] {"どれか1つ取ってください",
                    "実がいくつも近くに集まっています。傷がなく形がいい実を残してください"};
            case "fruit_unsure": return new String[] {"残してください",
                    "近すぎるかどうか、写真では分かりませんでした。迷ったときは残します"};
            case "fruit_alone": return new String[] {"残してください",
                    "ほかの実から十分に離れています"};
            default: return new String[] {"残してください",
                    "実に重なっておらず、実を陰にもしていません。葉は実を育てるので、取る理由がなければ残します"};
        }
    }

    /** 先を楕円の中に含む実（楕円の単位で中心がいちばん近いもの）。なければ -1。 */
    private static int fruitAtTip(List<RectF> fruits, float[] tip) {
        int best = -1;
        double bestE = 1;
        for (int f = 0; f < fruits.size(); f++) {
            RectF b = fruits.get(f);
            double e = Math.pow((tip[0] - b.centerX()) / Math.max(b.width() / 2, 1), 2)
                    + Math.pow((tip[1] - b.centerY()) / Math.max(b.height() / 2, 1), 2);
            if (e <= bestE) {
                bestE = e;
                best = f;
            }
        }
        return best;
    }

    private static boolean[] disc(float cx, float cy, float r) {
        boolean[] m = new boolean[256 * 256];
        for (int i = 0; i < m.length; i++) {
            float x = i % 256 - cx, y = i / 256 - cy;
            m[i] = x * x + y * y <= r * r;
        }
        return m;
    }

    /**
     * 葉と実の関係。"overlap"（実の楕円の8%以上を覆う）、"above"（実の上にあって近い）、"none"。
     * behind が true なら、葉は実の奥と分かっているので overlap にしない。
     */
    static String relation(boolean[] leaf, RectF box, boolean behind) {
        double cx = box.centerX(), cy = box.centerY(), rx = Math.max(box.width() / 2, 1), ry = Math.max(box.height() / 2, 1);
        int cover = 0, near = 0, n = 0, inX = 0;
        double sumY = 0;
        for (int i = 0; i < leaf.length; i++) {
            if (!leaf[i]) continue;
            double x = i % 256, y = i / 256, e = Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2);
            n++;
            sumY += y;
            if (e <= 1.05 * 1.05) cover++;
            if (e <= 4.0) near++;
            if (x >= box.left && x <= box.right) inX++;
        }
        double fruitArea = Math.PI * rx * ry;
        if (n == 0 || near == 0) return "none";
        if (!behind && cover / fruitArea >= 0.08) return "overlap";
        if (sumY / n < cy && (double) inX / n >= 0.3) return "above";
        return "none";
    }

    private static Bitmap scaleToMax(Bitmap image, int max) {
        float k = Math.min(1f, (float) max / Math.max(image.getWidth(), image.getHeight()));
        return k >= 1f ? image
                : Bitmap.createScaledBitmap(image, Math.round(image.getWidth() * k), Math.round(image.getHeight() * k), true);
    }

    private static int clamp(int v) {
        return Math.max(0, Math.min(255, v));
    }

    private static int count(String[] states, String value) {
        int c = 0;
        for (String s : states) if (s.equals(value)) c++;
        return c;
    }

    /** モデルは呼び出し側が閉じる。 */
    @Override public void close() {
        leafThread.shutdown();
    }
}
