package expo.modules.pammitfruitdetector;

import android.graphics.Bitmap;
import android.graphics.RectF;
import android.os.SystemClock;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// 案内モード。判定の写真にハサミの先が写っていないとき、写真全体から取るところを探して一覧にし、
// 1つずつ実の場所を言う。作業者が葉に触れて「これ」と言うと KoreJudge が通常の判定をし、after() で次へ進む。
// AI実装計画の android-inference/GuideMode.java を移したもの。
//
// 順番（同じ順位なら大きい実から）:
//   contact - 大きい実のまわりで見つけた葉が実に重なり、密着している（LeafDepth）
//   shade   - 大きい実が陰で、その上に葉がある
//   pair    - 近すぎる実（FruitPair、確率0.7以上）。集まりのいちばん大きい実の場所で言う
// 葉は大きい実ごとに枠の3倍の切り抜きで LeafYolo が全部探す。「取って」で今の対象を済みにし、
// 「残して」なら同じ場所をもう一度言う。同じ対象で2回外れたら飛ばす。
// 一覧を捨てるのは呼び出し側（帽子の判定中が終わったら clear()）。
final class GuideMode {
    private static final int MAX_FRUITS = 4;  // 葉を探す実の数（大きい順。時間のため）
    private static final String[] GRID = {"左上", "上", "右上", "左", "真ん中", "右", "左下", "下", "右下"};
    private static final String[] SECTORS = {"右", "右下", "下", "左下", "左", "左上", "上", "右上"};

    static final class Target {
        final String kind;   // contact / shade / pair
        final String place;  // 「右上の実」「右上の辺りの実」など
        final String side;   // 実から見た葉の方向（contact・shade のとき）。それ以外は ""
        int misses;
        Target(String kind, String place, String side) { this.kind = kind; this.place = place; this.side = side; }
    }

    private final LeafDepth depth;
    private final LeafYolo leafYolo;
    private final List<Target> targets = new ArrayList<>();
    private int current = -1;
    long lastBuildMs;
    String lastSummary = "";

    GuideMode(LeafDepth depth, LeafYolo leafYolo) {
        this.depth = depth;
        this.leafYolo = leafYolo;
    }

    /** 前の写真で作った一覧を進めているあいだ true。 */
    boolean active() {
        return current >= 0;
    }

    void clear() {
        targets.clear();
        current = -1;
    }

    /** ハサミの先が写っていない写真から一覧を作り、最初に言う言葉を返す。 */
    String[] start(Bitmap image, List<RectF> fruits, String[] states, List<RectF> allFruits) throws Exception {
        long start = SystemClock.elapsedRealtime();
        clear();
        int W = image.getWidth(), H = image.getHeight();
        List<Integer> order = new ArrayList<>();
        for (int i = 0; i < fruits.size(); i++) order.add(i);
        order.sort(Comparator.comparingDouble(i -> -area(fruits.get(i))));
        List<Target> contact = new ArrayList<>(), shade = new ArrayList<>(), pair = new ArrayList<>();
        long segmentMs = 0;
        int segments = 0, depthRuns = depth.runs;
        if (!fruits.isEmpty()) {
            for (int n = 0; n < Math.min(MAX_FRUITS, order.size()); n++) {
                int i = order.get(n);
                RectF b = fruits.get(i);
                float half = Math.max(b.width(), b.height()) * 1.5f;
                int cl = Math.max(0, (int) (b.centerX() - half)), ct = Math.max(0, (int) (b.centerY() - half));
                int cw = Math.min(W, (int) (b.centerX() + half)) - cl, ch = Math.min(H, (int) (b.centerY() + half)) - ct;
                long t1 = SystemClock.elapsedRealtime();
                List<boolean[]> leaves = leafYolo.allLeaves(Bitmap.createBitmap(image, cl, ct, cw, ch));
                segmentMs += SystemClock.elapsedRealtime() - t1;
                segments++;
                float gx = 256f / cw, gy = 256f / ch;
                RectF box = new RectF((b.left - cl) * gx, (b.top - ct) * gy, (b.right - cl) * gx, (b.bottom - ct) * gy);
                String found = null, side = "";
                for (boolean[] leaf : leaves) {
                    String rel = KoreJudge.relation(leaf, box, false);
                    if (rel.equals("overlap")) {
                        String state = depth.state(image, b, leaf, cl, ct, cw, ch);
                        if ("contact".equals(state)) { found = "contact"; side = direction(leaf, box); break; }
                        rel = KoreJudge.relation(leaf, box, true);
                    }
                    if (rel.equals("above") && found == null && states[i].equals("mostly_shaded")) { found = "shade"; side = direction(leaf, box); }
                }
                if ("contact".equals(found)) contact.add(new Target("contact", place(b, allFruits, W, H), side));
                else if ("shade".equals(found)) shade.add(new Target("shade", place(b, allFruits, W, H), side));
            }
        }
        // 近すぎる実: 集まりごとに1つ。いちばん大きい実の場所で言う。
        boolean[] used = new boolean[allFruits.size()];
        List<RectF> byArea = new ArrayList<>(allFruits);
        byArea.sort(Comparator.comparingDouble(f -> -area(f)));
        for (RectF f : byArea) {
            int i = allFruits.indexOf(f);
            if (used[i]) continue;
            String scene = FruitPair.scene(i, allFruits);
            if (!scene.equals("fruit_pair") && !scene.equals("fruit_cluster")) continue;
            for (int j = 0; j < allFruits.size(); j++)
                if (j == i || (FruitPair.near(allFruits.get(i), allFruits.get(j))
                        && FruitPair.probability(allFruits.get(i), allFruits.get(j)) >= FruitPair.SURE)) used[j] = true;
            pair.add(new Target("pair", place(f, allFruits, W, H), ""));
        }
        targets.addAll(contact);
        targets.addAll(shade);
        targets.addAll(pair);
        lastBuildMs = SystemClock.elapsedRealtime() - start;
        lastSummary = String.format(java.util.Locale.JAPAN, "密着 %d・陰 %d・近すぎる %d ／ 葉YOLO 実ごと %d回 %d ms・奥行き %d回",
                contact.size(), shade.size(), pair.size(), segments, segmentMs, depth.runs - depthRuns);
        if (targets.isEmpty()) return words("none", null, 0);
        current = 0;
        return words("first", targets.get(0), targets.size());
    }

    /** 一覧を進めているあいだの判定のあとに足す言葉。`removed` は答えが「取って」（葉か近すぎる実）のとき true。 */
    String[] after(boolean removed) {
        Target t = targets.get(current);
        if (!removed && ++t.misses < 2) return words("again", t, 0);
        boolean skipped = !removed;
        current++;
        if (current >= targets.size()) {
            Target last = t;
            clear();
            return words(skipped ? "skip_done" : "done", last, 0);
        }
        return words(skipped ? "skip_next" : "next", targets.get(current), 0);
    }

    /** {言う言葉, 「なんで？」の理由}。言葉は docs/voice-wording.md の G1〜G10。 */
    private static String[] words(String step, Target t, int count) {
        switch (step) {
            case "none": return new String[] {"この辺りは大丈夫です",
                    "取る葉や近すぎる実が、写真に写っていませんでした"};
            case "first": return new String[] {"取るところが" + count + "つあります。" + where(t) + ask(t), reason(t)};
            // 「〜と聞いてください」は最初の案内だけ
            case "again": return new String[] {t.kind.equals("pair") ? where(t)
                    : "取る葉は、" + t.place + "の" + t.side + "の辺りにあります。", reason(t)};
            case "next": return new String[] {"次は、" + where(t), reason(t)};
            case "skip_next": return new String[] {"この実は飛ばします。次は、" + where(t), reason(t)};
            case "done": return new String[] {"この辺りは終わりです", null};
            default: return new String[] {"この実は飛ばします。この辺りは終わりです", null};  // skip_done
        }
    }

    private static String where(Target t) {
        return t.kind.equals("pair") ? t.place + "が、ほかの実と近すぎます。" : t.place + "に、取る葉があります。";
    }

    private static String ask(Target t) {
        return t.kind.equals("pair") ? "どちらかに触れて「これ？」と聞いてください" : "そこに触れて「これ？」と聞いてください";
    }

    private static String reason(Target t) {
        switch (t.kind) {
            case "contact": return "実に付いている葉があります。付いたままだと、下が黄白色の色むらになります";
            case "shade": return "実が陰になっています。上の葉を取ると、実に日が当たります";
            default: return "実同士が近すぎます。どちらか1つを取ります";
        }
    }

    /** 実の場所の言い方（AI実装計画の ai/guidance.py describe_fruit）。1つに絞れなければ「右上の辺りの実」。 */
    static String place(RectF target, List<RectF> fruits, int W, int H) {
        String cell = grid(target, W, H);
        List<RectF> same = new ArrayList<>();
        for (RectF f : fruits) if (grid(f, W, H).equals(cell)) same.add(f);
        if (same.size() <= 1) return cell + "の実";
        same.sort(Comparator.comparingDouble(f -> -area(f)));
        if (same.get(0) == target && area(same.get(0)) > 1.4 * area(same.get(1))) return cell + "の、いちばん大きい実";
        same.sort(Comparator.comparingDouble(f -> f.top + f.bottom));
        if (same.get(0) == target) return cell + "の、いちばん上の実";
        if (same.get(same.size() - 1) == target) return cell + "の、いちばん下の実";
        return cell + "の辺りの実";
    }

    private static String grid(RectF b, int W, int H) {
        int row = Math.min((int) (b.centerY() / H * 3), 2), col = Math.min((int) (b.centerX() / W * 3), 2);
        return GRID[row * 3 + col];
    }

    /** 実の中心から見た葉の方向（ai/guidance.py direction と同じ）。 */
    private static String direction(boolean[] leaf, RectF box) {
        double sx = 0, sy = 0;
        int n = 0;
        for (int i = 0; i < leaf.length; i++) if (leaf[i]) { sx += i % 256; sy += i / 256; n++; }
        double angle = (Math.toDegrees(Math.atan2(sy / n - box.centerY(), sx / n - box.centerX())) + 360) % 360;
        return SECTORS[(int) (((angle + 22.5) % 360) / 45)];
    }

    private static double area(RectF b) {
        return (double) b.width() * b.height();
    }
}
