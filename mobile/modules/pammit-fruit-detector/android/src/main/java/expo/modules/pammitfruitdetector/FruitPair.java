package expo.modules.pammitfruitdetector;

import android.graphics.RectF;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;

// 近すぎる実（摘果。くっついているかではなく、農家が「どちらかを取る」と見る近さ）。AI実装計画の android-inference/FruitPair.java を移したもの。
// 実を枠の長辺を直径とする円とみなし、（すき間 / 小さい半径、中心距離 / 半径の和、大きい半径 / 小さい半径）の
// ロジスティック回帰で、近い2つが近すぎる確率を出す。近すぎる組はまとめて1つの集まりにする。
final class FruitPair {
    static final double[] WEIGHTS = {-0.5904, -5.8978, -4.1646};
    static final double BIAS = 9.9284, SURE = 0.7, UNSURE = 0.5, NEAR = 0.1;

    private FruitPair() {}

    static boolean near(RectF a, RectF b) {
        double gap = Math.max(0, Math.max(Math.max(a.left, b.left) - Math.min(a.right, b.right),
                Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)));
        return gap <= NEAR * Math.min(a.width(), b.width());
    }

    static double probability(RectF a, RectF b) {
        double ra = Math.max(a.width(), a.height()) / 2, rb = Math.max(b.width(), b.height()) / 2;
        double small = Math.max(Math.min(ra, rb), 1e-6), d = Math.hypot(a.centerX() - b.centerX(), a.centerY() - b.centerY());
        double z = BIAS + WEIGHTS[0] * (d - ra - rb) / small + WEIGHTS[1] * d / (ra + rb) + WEIGHTS[2] * Math.max(ra, rb) / small;
        return 1 / (1 + Math.exp(-z));
    }

    /** 触れた実の場面: fruit_cluster、fruit_pair、fruit_unsure、fruit_alone。 */
    static String scene(int index, List<RectF> boxes) {
        int n = boxes.size();
        double[][] p = new double[n][n];
        double best = 0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                if (near(boxes.get(i), boxes.get(j))) {
                    p[i][j] = p[j][i] = probability(boxes.get(i), boxes.get(j));
                    if (i == index || j == index) best = Math.max(best, p[i][j]);
                }
        List<Integer> members = new ArrayList<>();
        members.add(index);
        ArrayDeque<Integer> todo = new ArrayDeque<>(members);
        while (!todo.isEmpty()) {
            int i = todo.pop();
            for (int j = 0; j < n; j++)
                if (p[i][j] >= SURE && !members.contains(j)) { members.add(j); todo.push(j); }
        }
        if (members.size() >= 3) return "fruit_cluster";
        if (members.size() == 2) return "fruit_pair";
        return best >= UNSURE ? "fruit_unsure" : "fruit_alone";
    }
}
