/* HD pass: cast shadows. Every standing object (buildings, trees, walls, hedges, fences, lamps, props) casts a soft
 * shadow onto the ground, away from the north-west light: its silhouette, darkened, flattened and sheared to the
 * south-east, baked into the ground chunks (so it costs nothing per frame). Runs last, after every other pass. */
(function () {
  'use strict';
  const HD = LS.HD; if (!HD) return;
  const R = HD.R, cache = new Map();
  const SKIP = /^(hd_overlay|hd_fence_v)$/;
  // a blurred dark silhouette of the image (cached per image)
  function silhouette(img) {
    if (cache.has(img)) return cache.get(img);
    const w = Math.max(1, Math.round(img.width / 2)), h = Math.max(1, Math.round(img.height / 2)), c = HD.cv(w + 8, h + 8), g = c.getContext('2d');
    g.filter = 'blur(2px)'; g.drawImage(img, 4, 4, w, h); g.filter = 'none';
    g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(38,28,58)'; g.fillRect(0, 0, c.width, c.height);
    cache.set(img, c); return c;
  }
  HD.pass({
    name: 'shadows', room: '*', order: 90,
    run(sc) {
      const casters = sc.objects.filter(o => o.img && !SKIP.test(o.kind || '') && o.h > 6 && o.sortY < 1e5);
      const outside = !sc.anchors || sc.w > 1000, alpha = outside ? 0.42 : 0.26;
      const K = 0.75, Mq = 0.38;   // lean east per unit of height, and how flat the shadow lies (south)
      sc.paint((g, ch) => {
        g.globalAlpha = alpha;
        for (const o of casters) {
          const base = o.sortY, reach = o.h * K;
          if (o.dx > ch.x + ch.w + 4 || o.dx + o.w + reach < ch.x || base - 8 > ch.y + ch.h || base + o.h * Mq < ch.y) continue;
          const s = silhouette(o.img), px = o.w / (s.width - 8) * 4, py = o.h / (s.height - 8) * 4;
          // map a sprite point (x, y) to (x + K*(base-y), base + Mq*(base-y)): the silhouette laid down to the south-east
          g.save(); g.transform(1, 0, -K, -Mq, K * base, (1 + Mq) * base);
          g.drawImage(s, o.dx - px, o.dy - py, o.w + 2 * px, o.h + 2 * py); g.restore();
        }
        g.globalAlpha = 1;
      });
    }
  });
})();
