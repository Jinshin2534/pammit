package expo.modules.pammitfruitdetector;

import android.graphics.Bitmap;

import java.util.ArrayDeque;

// ハサミの先に巻いた色テープ（薄いピンク）の先端を色で探す。AI実装計画の android-inference/TapeTip.java を移したもの。
// 色相 150〜179 か 0〜5（OpenCV の 0〜179）、彩度 15〜90、明度 170 以上。画像の端に触れる塊は手なので除く。
// 塊の彩度の中央値が42以下・明度の中央値が225以上のものだけ残す（肌は紙より彩度が高い）。
final class TapeTip {
    private TapeTip() {}

    /** 先端の {x, y}（画像の画素）。テープが見えなければ null。 */
    static float[] find(Bitmap bitmap, int minPixels) {
        int w = bitmap.getWidth(), h = bitmap.getHeight();
        int[] argb = new int[w * h];
        bitmap.getPixels(argb, 0, w, 0, 0, w, h);
        int[] sat = new int[w * h];
        int[] val = new int[w * h];
        boolean[] marker = new boolean[w * h];
        for (int i = 0; i < argb.length; i++) {
            int r = (argb[i] >> 16) & 255, g = (argb[i] >> 8) & 255, b = argb[i] & 255;
            int max = Math.max(r, Math.max(g, b)), min = Math.min(r, Math.min(g, b));
            int s = max == 0 ? 0 : (max - min) * 255 / max;
            sat[i] = s;
            val[i] = max;
            if (max == min || s < 15 || s > 90 || max < 170) continue;
            float hue;  // 度
            if (max == r) hue = 60f * (g - b) / (max - min);
            else if (max == g) hue = 60f * (b - r) / (max - min) + 120f;
            else hue = 60f * (r - g) / (max - min) + 240f;
            if (hue < 0) hue += 360f;
            int pilHue = (int) (hue / 360f * 255f);
            int cvHue = pilHue * 180 / 256;
            marker[i] = cvHue >= 150 || cvHue <= 5;
        }
        int[] label = new int[w * h];
        int next = 0;
        float bestX = -1, bestY = -1;
        int bestSize = 0;
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        int[] members = new int[w * h];
        for (int start = 0; start < marker.length; start++) {
            if (!marker[start] || label[start] != 0) continue;
            next++;
            int count = 0;
            boolean touchesEdge = false;
            queue.add(start);
            label[start] = next;
            while (!queue.isEmpty()) {
                int p = queue.poll();
                members[count++] = p;
                int x = p % w, y = p / w;
                if (x == 0 || y == 0 || x == w - 1 || y == h - 1) touchesEdge = true;
                int[] around = {p - 1, p + 1, p - w, p + w};
                for (int k = 0; k < 4; k++) {
                    int q = around[k];
                    if (q < 0 || q >= marker.length || label[q] != 0 || !marker[q]) continue;
                    if ((k == 0 && x == 0) || (k == 1 && x == w - 1)) continue;
                    label[q] = next;
                    queue.add(q);
                }
            }
            if (touchesEdge || count < minPixels || count <= bestSize) continue;
            if (median(sat, members, count) > 42 || median(val, members, count) < 225) continue;
            // 先端は、手が入ってくる下辺の中央からいちばん遠い画素。
            double far = -1;
            float tx = 0, ty = 0;
            for (int m = 0; m < count; m++) {
                int x = members[m] % w, y = members[m] / w;
                double d = Math.pow(x - w / 2.0, 2) + Math.pow(y - h, 2);
                if (d > far) { far = d; tx = x; ty = y; }
            }
            bestSize = count;
            bestX = tx;
            bestY = ty;
        }
        return bestSize > 0 ? new float[] {bestX, bestY} : null;
    }

    private static int median(int[] values, int[] members, int count) {
        int[] histogram = new int[256];
        for (int m = 0; m < count; m++) histogram[values[members[m]]]++;
        int seen = 0;
        for (int v = 0; v < 256; v++) {
            seen += histogram[v];
            if (seen * 2 >= count) return v;
        }
        return 255;
    }
}
