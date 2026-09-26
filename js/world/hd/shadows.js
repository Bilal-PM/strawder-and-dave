/* HD pass: cast shadows and contact shadows (ambient occlusion). Every standing object (buildings, trees, walls,
 * hedges, fences, lamps, props) darkens the ground it stands on, baked into the ground chunks (so it costs nothing
 * per frame). Runs last, after every other pass.
 *   - contact shadow: the object's silhouette squashed almost flat under its base, twice (a wide soft skirt and a
 *     tight dark line), so walls, hedges, tree trunks and posts sit IN the ground rather than on it;
 *   - cast shadow: the silhouette laid down to the south-east, away from the north-west light, in two layers: a
 *     firmer core near the base and a longer, softer penumbra that fades as it goes. */
(function () {
  'use strict';
  const HD = LS.HD; if (!HD) return;
  const cache = new Map();
  const SKIP = /^(hd_overlay|hd_fence_v)$/;
  const PAD = 12;
  // a blurred dark silhouette of the image at half size (cached per image and softness)
  function silhouette(img, blur) {
    const k = cache.get(img) || {}; if (k[blur]) return k[blur];
    const w = Math.max(1, Math.round(img.width / 2)), h = Math.max(1, Math.round(img.height / 2)), c = HD.cv(w + 2 * PAD, h + 2 * PAD), g = c.getContext('2d');
    g.filter = `blur(${blur}px)`; g.drawImage(img, PAD, PAD, w, h); g.filter = 'none';
    g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(34,26,54)'; g.fillRect(0, 0, c.width, c.height);
    k[blur] = c; cache.set(img, k); return c;
  }
  HD.silhouette = silhouette;
  // draw silhouette s of object o under the transform that maps sprite point (x, y) to (x + kx*(base-y), base + ky*(base-y))
  function lay(g, o, s, kx, ky) {
    const base = o.sortY, px = o.w / (s.width - 2 * PAD) * PAD, py = o.h / (s.height - 2 * PAD) * PAD;
    g.save(); g.transform(1, 0, -kx, -ky, kx * base, (1 + ky) * base);
    g.drawImage(s, o.dx - px, o.dy - py, o.w + 2 * px, o.h + 2 * py); g.restore();
  }
  HD.pass({
    name: 'shadows', room: '*', order: 90,
    run(sc) {
      const casters = sc.objects.filter(o => o.img && !SKIP.test(o.kind || '') && o.h > 6 && o.sortY < 1e5);
      const outside = !sc.anchors || sc.w > 1000, alpha = outside ? 0.42 : 0.26;
      const K = 0.75, Mq = 0.38;   // lean east per unit of height, and how flat the shadow lies (south)
      sc.paint((g, ch) => {
        for (const o of casters) {
          const base = o.sortY, reach = o.h * K * 1.35;
          if (o.dx > ch.x + ch.w + 8 || o.dx + o.w + reach < ch.x - 8 || base - 10 > ch.y + ch.h || base + o.h * Mq * 1.35 + 8 < ch.y) continue;
          const hard = silhouette(o.img, 2), soft = silhouette(o.img, 6);
          // cast shadow: a long soft penumbra, then the firmer core over it
          g.globalAlpha = alpha * 0.42; lay(g, o, soft, K * 1.2, Mq * 1.2);
          g.globalAlpha = alpha * 0.78; lay(g, o, hard, K, Mq);
          // contact shadow: stacked, ever shallower layers make a smooth falloff from a dark line at the base to
          // nothing ~8 units out (a fixed depth in world units, so a tall building's skirt is no deeper than a post's)
          const k = outside ? 1 : 0.7;
          for (const [d, al] of [[8, 0.16], [4.2, 0.2], [1.8, 0.26]]) { g.globalAlpha = al * k; lay(g, o, d > 3 ? soft : hard, 0, Math.min(0.3, d / o.h)); }
        }
        g.globalAlpha = 1;
      });
    }
  });
  /* Interiors: ambient occlusion where the floor meets the walls, a soft shadow along the railcar's underside (over
   * the hard edge of the inspection pit), and warm light cones under the depot's pendant lamps and on the hall stage,
   * painted into the room's light overlay (drawn over everything, so the light falls on the train roof too). Baked. */
  const ROOMLIGHT = {
    shed: { lamps: [104, 226.7, 344, 464], shade: 22, cone: 50, stage: null },
    hall: { lamps: [], shade: 0, cone: 0, stage: [143, 20, 161, 34] },
    office: { lamps: [], shade: 0, cone: 0, stage: null }
  };
  const band = (g, x0, y0, x1, y1, a, vert) => {
    const gr = vert ? g.createLinearGradient(x0, 0, x1, 0) : g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, `rgba(26,18,40,${a})`); gr.addColorStop(0.35, `rgba(26,18,40,${(a * 0.45).toFixed(3)})`); gr.addColorStop(1, 'rgba(26,18,40,0)');
    g.fillStyle = gr; g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  };
  for (const room of Object.keys(ROOMLIGHT)) HD.pass({
    name: 'interior_light_' + room, room, order: 95,
    run(sc) {
      const L = ROOMLIGHT[room], W = sc.w, H = sc.h, wall = 32, side = 16;
      sc.paint(g => {
        g.save(); g.globalCompositeOperation = 'multiply';
        band(g, 0, wall, 0, wall + 12, 0.34); band(g, side, 0, side + 10, 0, 0.26, true); band(g, W - side, 0, W - side - 10, 0, 0.26, true); band(g, 0, H - side, 0, H - side - 7, 0.2);
        const m = sc.objects.find(o => o.kind === 'marjorie');
        if (m) {   // the railcar's underside: a soft dark skirt, blurred, over the pit's hard edge
          g.filter = 'blur(2.5px)'; g.fillStyle = 'rgba(20,14,30,0.34)'; g.fillRect(m.dx + 8, m.sortY - 12, m.w - 16, 16);
          g.fillStyle = 'rgba(20,14,30,0.22)'; g.fillRect(m.dx + 2, m.sortY - 2, m.w - 4, 10); g.filter = 'none';
        }
        g.restore();
      });
      const ov = sc.objects.find(o => o.kind === 'hd_overlay'); if (!ov || !ov.img) return;
      const c = HD.cv(ov.img.width, ov.img.height), g = c.getContext('2d'), k = ov.img.width / ov.w;
      g.drawImage(ov.img, 0, 0); g.scale(k, k); g.globalCompositeOperation = 'lighter';
      for (const lx of L.lamps) {   // a cone of warm light from each shade, and where it lands
        const y0 = L.shade, y1 = y0 + L.cone, gr = g.createLinearGradient(0, y0, 0, y1);
        gr.addColorStop(0, 'rgba(255,214,150,0.16)'); gr.addColorStop(1, 'rgba(255,200,130,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(lx - 6, y0); g.lineTo(lx + 6, y0); g.lineTo(lx + 26, y1); g.lineTo(lx - 26, y1); g.closePath(); g.fill();
        const rg = g.createRadialGradient(lx, y1 - 8, 0, lx, y1 - 8, 30); rg.addColorStop(0, 'rgba(255,196,120,0.14)'); rg.addColorStop(1, 'rgba(255,196,120,0)');
        g.save(); g.translate(lx, y1 - 8); g.scale(1, 0.45); g.translate(-lx, -(y1 - 8)); g.fillStyle = rg; g.fillRect(lx - 30, y1 - 38, 60, 60); g.restore();
      }
      if (L.stage) { const [x, y, w, h] = L.stage, rg = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 0.55);
        rg.addColorStop(0, 'rgba(255,206,140,0.14)'); rg.addColorStop(1, 'rgba(255,206,140,0)'); g.save(); g.translate(x + w / 2, y + h / 2); g.scale(1, h / w * 1.6); g.translate(-(x + w / 2), -(y + h / 2)); g.fillStyle = rg; g.fillRect(x - 20, y - w, w + 40, w * 2); g.restore(); }
      ov.img = c;
    }
  });
})();
