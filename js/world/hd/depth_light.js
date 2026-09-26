/* LINESIDE lighting on the characters, and the little things that sit them in the world. Patches LS.World.prototype:
 *
 *   actor()  every character is drawn once into a small art-resolution canvas, and from that one frame come
 *              - a contact shadow: the boots' own silhouette squashed flat under them (a tight dark core that holds
 *                on the darkest setts), over a soft ambient-occlusion skirt; it lightens as a foot lifts;
 *              - a cast shadow: the frame's silhouette laid down along the light, the same model as the baked world
 *                shadows (hd/shadows.js): south-east at midday, long and raking at dawn and dusk, and at night
 *                thrown away from the nearest lamp;
 *              - light: near a lamp (night) or in the low sun, a warm tint, a one-pixel rim on the edge facing the
 *                light and a slight falling-off on the side away from it.
 *   animal() a soft contact shadow under the cat, sheep and pigeon.
 *   draw()   records where the characters stand (the lens in hd/depth.js keeps them sharp), and where the player
 *            walks behind a fading tree or building, cuts one soft round window through the whole object around them
 *            instead of fading it to half (no see-through rectangles, no fence bars striped through a canopy).
 *   drawDust() no footstep dust on the setts (it read as stains there): dirt, gravel, ballast and yard only.
 *   scene()  once per built scene: the station's glazed windows and fanlight get a warm lit overlay and light
 *            sources, so the opening forecourt glows at night like the high street.
 * Everything is cached or drawn into canvases the size of one sprite, so the cost is a few small draws a character. */
window.LS = window.LS || {};
(function () {
  'use strict';
  const W = LS.World; if (!W) return;
  const P = W.prototype, baseActor = P.actor, baseAnimal = P.animal, baseDraw = P.draw, baseDust = P.drawDust, baseScene = P.scene;
  const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  const ctx2 = c => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; };
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const R = 3;                                   // art px per world unit (the HD art)
  // a soft round blob (alpha 1 in the middle) for contact shadows, drawn scaled
  const BLOB = (() => { const c = cvs(64, 64), g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(14,10,24,1)'); r.addColorStop(0.45, 'rgba(14,10,24,0.7)'); r.addColorStop(1, 'rgba(14,10,24,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c; })();
  const blobAt = (x, X, Y, rx, ry, a) => { if (a <= 0.004) return; x.globalAlpha = a; x.drawImage(BLOB, X - rx, Y - ry, rx * 2, ry * 2); };

  /* ------------------------------------------------------------ the light at a point */
  // Where the light comes from for a character at (X, Y): { kx, ky } lays the shadow (per unit of height: east, south),
  // a = shadow strength, and the light for the rim: (lx, ly) unit vector towards it, I its strength, rgb its colour.
  P.lightAt = function (X, Y) {
    const a = this._atm || {}, S = a.sky || { dark: 0, warm: 0 }, c = a.cur || { cloud: 0.3, rain: 0 }, sc = this.scenes && this.scenes[this.room];
    const inside = this.room !== 'outside', dark = inside ? 0 : clamp(S.dark * 1.5, 0, 1);
    const cloud = inside ? 0.5 : c.cloud, lowSun = inside ? 0 : clamp(S.warm * (1 - c.cloud * 0.85), 0, 1) * (1 - dark);
    // the sun (indoors: the windows, high on the north wall, so a short shadow towards the camera)
    const dir = (a.hour || 12) > 12 ? 1 : -1;
    let kx = inside ? 0.12 : mix(0.75, 2.3 * dir, lowSun), ky = inside ? 0.3 : mix(0.38, 0.22, lowSun);
    let sa = inside ? 0.4 : (0.7 + 0.1 * lowSun) * (1 - cloud * 0.45) * (1 - dark);
    let lx = -kx, ly = -ky, I = inside ? 0 : lowSun * 0.9, rgb = [255, 190, 120];
    // at night, the nearest lamp (or lit window) takes over
    if (dark > 0.05 && sc && sc.lights) {
      let best = null, bs = 0;
      for (const L of sc.lights) {
        const r = (L.r || 20) * (L.win ? 1.6 : 2.2), dx = X - L.x, dy = Y - L.y, d = Math.hypot(dx, dy); if (d > r) continue;
        const s = (1 - d / r) * (L.win ? 0.6 : 1); if (s > bs) { bs = s; best = [dx, dy, d, L]; }
      }
      if (best) {
        const [dx, dy, d] = best, n = Math.max(1, d), len = 0.35 + d / 36;
        kx = mix(kx, dx / n * len, dark); ky = mix(ky, dy / n * len * 0.55, dark);
        sa = mix(sa, 0.5 * Math.min(1, bs * 1.6), dark); lx = -dx / n; ly = -dy / n - 0.4; I = Math.max(I, bs * dark * 1.3); rgb = [255, 184, 104];
      } else { kx = mix(kx, 0.5, dark); ky = mix(ky, 0.3, dark); sa = mix(sa, 0.14, dark); lx = mix(lx, -0.55, dark); ly = mix(ly, -0.85, dark); I = Math.max(I, 0.5 * dark); rgb = dark > 0.5 ? [150, 176, 255] : rgb; }   // moonlight: a cool rim from the north-west
    }
    const ln = Math.hypot(lx, ly) || 1;
    return { kx, ky, a: sa, lx: lx / ln, ly: ly / ln, I: clamp(I, 0, 1), rgb, dark, lowSun };
  };

  /* ------------------------------------------------------------ characters */
  const BW = 20, BH = 36, BL = 10, BT = 33;     // the frame box around the feet (world units): 16 x 32 frames and a little spare
  const A = cvs(BW * R, BH * R), ga = ctx2(A), Sil = cvs(BW * R, BH * R), gs = ctx2(Sil), Rim = cvs(BW * R, BH * R), gr = ctx2(Rim);
  const Soft = cvs(BW, BH), gso = Soft.getContext('2d');
  P.actor = function (x, look, px, py, face, frame, opt) {
    if (!this.art || !this.art.drawActor || !LS.HD) return baseActor.call(this, x, look, px, py, face, frame, opt);
    opt = opt || {};
    const q = this.snapRes || 1, X = Math.round(px * q) / q, Y = Math.round(py * q) / q;
    (this._dActors || (this._dActors = [])).push([X, Y, 32]);
    const left = X - BL, top = Y - BT, lt = this.lightAt(X, Y);
    // 1. the frame, alone, at art resolution
    ga.setTransform(1, 0, 0, 1, 0, 0); ga.globalCompositeOperation = 'source-over'; ga.globalAlpha = 1; ga.clearRect(0, 0, A.width, A.height);
    ga.setTransform(R, 0, 0, R, -left * R, -top * R);
    this.art.drawActor(ga, look, X, Y, face, frame, Object.assign({}, opt, { shadow: false, alpha: null }));
    ga.setTransform(1, 0, 0, 1, 0, 0);
    // 2. its silhouette (dark), and a soft copy at a third of the size for the cast shadow
    gs.globalCompositeOperation = 'copy'; gs.drawImage(A, 0, 0); gs.globalCompositeOperation = 'source-in'; gs.fillStyle = 'rgb(20,14,32)'; gs.fillRect(0, 0, Sil.width, Sil.height); gs.globalCompositeOperation = 'source-over';
    gso.globalCompositeOperation = 'copy'; gso.imageSmoothingEnabled = true; gso.drawImage(Sil, 0, 0, Soft.width, Soft.height); gso.globalCompositeOperation = 'source-over';
    const fade = opt.alpha != null ? opt.alpha : 1, lift = opt.moving ? Math.abs(Math.sin((+frame || 0) * Math.PI / 4)) : 0;
    x.save();
    // 3. cast shadow along the light: a soft long one and a firmer short one near the feet
    if (lt.a > 0.02) {
      x.imageSmoothingEnabled = true;
      const lay = (k, al, img) => { x.save(); x.globalAlpha = al * fade; x.transform(1, 0, -lt.kx * k, -lt.ky * k, lt.kx * k * Y, (1 + lt.ky * k) * Y); x.drawImage(img, left, top + 0.6, BW, BH); x.restore(); };
      lay(1, lt.a * 0.62, Soft); lay(0.5, lt.a * 0.42, Soft);
      x.imageSmoothingEnabled = false;
    }
    // 4. contact: a soft skirt, then the boots' own silhouette squashed flat under them, and a tight core
    x.imageSmoothingEnabled = true; x.globalCompositeOperation = 'source-over';
    blobAt(x, X + lt.kx * 1.2, Y + 0.7, 10.5 - lift, 3.6, 0.58 * fade); blobAt(x, X, Y + 0.4, 7 - lift, 2.3, 0.4 * fade);
    const fh = 3.2, sy = (BT - fh) * R;   // the bottom 3.2 units of the frame: boots and turn-ups
    x.globalAlpha = (0.66 - 0.2 * lift) * fade; x.drawImage(Sil, 0, sy, Sil.width, fh * R, left, Y - 0.55, BW, 1.5);
    blobAt(x, X, Y + 0.1, 4.6 - lift * 0.6, 1.3, (0.6 - 0.18 * lift) * fade);
    x.globalAlpha = 1; x.imageSmoothingEnabled = false;
    // 5. light on the figure: warm tint, rim towards the light, falling off away from it
    if (lt.I > 0.04) {
      const [r, g, b] = lt.rgb, I = lt.I;
      ga.globalCompositeOperation = 'source-atop';
      ga.fillStyle = `rgba(${r},${g},${b},${(0.1 * I).toFixed(3)})`; ga.fillRect(0, 0, A.width, A.height);
      const cxp = BL * R, cyp = (BT - 14) * R, gx = ga.createLinearGradient(cxp + lt.lx * 24, cyp + lt.ly * 24, cxp - lt.lx * 24, cyp - lt.ly * 24);
      gx.addColorStop(0, 'rgba(20,14,40,0)'); gx.addColorStop(1, `rgba(20,14,40,${(0.2 * I).toFixed(3)})`); ga.fillStyle = gx; ga.fillRect(0, 0, A.width, A.height);
      // rim: the frame's pixels whose neighbour towards the light is empty
      const ux = Math.round(lt.lx * 1.4), uy = Math.round(lt.ly * 1.4);
      if (ux || uy) {
        gr.globalCompositeOperation = 'copy'; gr.drawImage(A, 0, 0); gr.globalCompositeOperation = 'destination-out'; gr.drawImage(A, -ux, -uy);
        gr.globalCompositeOperation = 'source-in'; gr.fillStyle = `rgb(${Math.min(255, r + 10)},${Math.min(255, g + 40)},${Math.min(255, b + 60)})`; gr.fillRect(0, 0, Rim.width, Rim.height);
        ga.globalAlpha = Math.min(0.9, 1.7 * I); ga.drawImage(Rim, 0, 0); ga.globalAlpha = 1;
      }
      ga.globalCompositeOperation = 'source-over';
    }
    // 6. the figure
    x.globalAlpha = fade; x.drawImage(A, left, top, BW, BH);
    x.restore();
  };
  const ANIMAL = { cat: [4.2, 1.4, 0.3], sheep: [8, 2.4, 0.3], pigeon: [2.4, 0.8, 0.28] };
  P.animal = function (x, kind, px, py, t, opt) {
    const q = this.snapRes || 1, X = Math.round(px * q) / q, Y = Math.round(py * q) / q, s = ANIMAL[kind];
    (this._dActors || (this._dActors = [])).push([X, Y, kind === 'sheep' ? 16 : 10]);
    if (s && LS.HD) { x.save(); x.imageSmoothingEnabled = true; blobAt(x, X, Y + 0.2, s[0], s[1], s[2]); blobAt(x, X, Y, s[0] * 0.55, s[1] * 0.5, s[2] * 0.8); x.restore(); }
    return baseAnimal.call(this, x, kind, px, py, t, opt);
  };

  /* ------------------------------------------------------------ seeing through what you walk behind */
  function holed(o, p, key, k) {
    const im = o[key]; if (!im) return null;
    const H = o._hole || (o._hole = {}), sx = im.width / o.w, sy = im.height / o.h;
    const ix = Math.round((p.x - o.dx) * sx), iy = Math.round((p.y - 13 - o.dy) * sy), kk = ix + ',' + iy + ',' + k.toFixed(2);
    const c = H[key] || (H[key] = { c: cvs(im.width, im.height), k: '' });
    if (c.k === kk && c.src === im) return c.c;
    c.k = kk; c.src = im; const g = c.c.getContext('2d'); g.globalCompositeOperation = 'copy'; g.drawImage(im, 0, 0); g.globalCompositeOperation = 'destination-out';
    const r = 19 * sx, rg = g.createRadialGradient(ix, iy, 0, ix, iy, r);
    rg.addColorStop(0, `rgba(0,0,0,${(0.84 * k).toFixed(3)})`); rg.addColorStop(0.5, `rgba(0,0,0,${(0.72 * k).toFixed(3)})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(ix - r, iy - r, 2 * r, 2 * r); g.globalCompositeOperation = 'source-over';
    return c.c;
  }
  // is the player standing behind (north of) this fadeable object, under its sprite?
  const behind = (o, p) => { const f = o.fade; return (p.x > f.x && p.x < f.x + f.w && p.y > f.y && p.y < f.y + f.h) || (p.y < o.sortY - 1 && p.y > o.dy + 8 && p.x > o.dx + 5 && p.x < o.dx + o.w - 5); };
  P.draw = function (x, t) {
    this._dActors = [];
    const sc = this.scenes[this.room], p = this.player, swap = [], dt = Math.min(0.1, Math.max(0, t - (this._dT || t))); this._dT = t;
    if (sc && p && !this.attract && LS.HD) for (const o of sc.objects) {
      if (!o.fade || !o.w || !o.h) continue;
      const want = behind(o, p) ? 1 : 0; o._hk = o._hk == null ? want : o._hk + (want - o._hk) * Math.min(1, dt * 9); if (Math.abs(o._hk - want) < 0.02) o._hk = want;
      if (o._hk <= 0) continue;
      const im = holed(o, p, 'img', o._hk); if (!im) continue;
      swap.push([o, o.img, o.lit, o.fade]); o.img = im; if (o.lit) o.lit = holed(o, p, 'lit', o._hk); o.fade = null;
    }
    try { return baseDraw.call(this, x, t); }
    finally { for (const [o, im, lit, f] of swap) { o.img = im; o.lit = lit; o.fade = f; } }
  };

  /* ------------------------------------------------------------ dust only on loose ground */
  if (baseDust) P.drawDust = function (x) {
    const D = this.dust, L = LS.LEVEL; if (!D || !D.length || !L) return baseDust.call(this, x);
    const keep = D.filter(d => d.ring || ((L.rows[Math.floor(d.y / 16)] || '')[Math.floor(d.x / 16)] || '') !== 's');
    if (keep.length === D.length) return baseDust.call(this, x);
    this.dust = keep; try { return baseDust.call(this, x); } finally { this.dust = D; }
  };

  /* ------------------------------------------------------------ the station's windows at night */
  function stationLit(o, sc) {
    const im = o.img, w = im.width, h = im.height, c = cvs(w, h), g = c.getContext('2d');
    let d; try { g.drawImage(im, 0, 0); d = g.getImageData(0, 0, w, h); } catch (e) { return; }
    const out = g.createImageData(w, h), px = d.data, op = out.data, cols = new Map();
    // glass: blue-dominant pixels on the ground-floor frontage (the roof slates above, the drainpipes at the ends are not)
    const y0 = Math.round(h * 0.56), y1 = Math.round(h * 0.88), x0 = Math.round(w * 0.06), x1 = Math.round(w * 0.925);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4, r = px[i], gg = px[i + 1], b = px[i + 2], al = px[i + 3];
      if (al < 200 || !(b > r + 22 && b >= gg - 4)) continue;
      const lum = (r + gg + b) / 3, t = (y - y0) / (y1 - y0);
      op[i] = 255; op[i + 1] = Math.round(206 - 20 * t + Math.min(30, lum * 0.2)); op[i + 2] = Math.round(120 + Math.min(70, lum * 0.35)); op[i + 3] = Math.round(235 - 40 * (lum > 150 ? 1 : 0));
      const k = Math.floor(x / 24); const e = cols.get(k) || { n: 0, x: 0, y: 0 }; e.n++; e.x += x; e.y += y; cols.set(k, e);
    }
    g.putImageData(out, 0, 0);
    o.lit = c;
    // one light source per pane cluster, so the grade opens a warm pool and the lens blooms it
    const groups = [];
    for (const [k, e] of [...cols.entries()].sort((a, b) => a[0] - b[0])) { if (e.n < 20) continue; const last = groups[groups.length - 1]; if (last && k - last.k <= 1) { last.n += e.n; last.x += e.x; last.y += e.y; last.k = k; } else groups.push(Object.assign({ k }, e)); }
    for (const e of groups) sc.lights.push({ x: o.dx + e.x / e.n / w * o.w, y: o.dy + e.y / e.n / h * o.h, r: 18, win: true });
  }
  P.scene = function (room) {
    const sc = baseScene.call(this, room);
    if (sc && !sc._dPrep) {
      sc._dPrep = true;
      if (room === 'outside' && LS.HD) for (const o of sc.objects) if (/^station_(closed|live)$/.test(o.id || '') && !o.lit && o.img && o.img.width) { sc.lights = (sc.lights || []).slice(); stationLit(o, sc); }
    }
    return sc;
  };
})();
