/* LINESIDE post-processing: depth. An always-on "cosy diorama" lens that holds at every quality level (the adaptive
 * 'lite' mode only rebuilds it less often; it never switches it off).
 *
 * Focus follows DEPTH, not the screen row: every object is as sharp or as soft as the ground it stands on (its foot,
 * its sort y), so a lamp post or a fingerpost is either sharp or soft all the way up, never split by a band.
 *   - the in-focus band is wide: about +-3.4 tiles in front of and behind the player at desktop zoom (about +-6 on a
 *     phone), easing in over two tiles, and the far blur is capped at about two art pixels, so silhouettes read;
 *   - characters and animals (hd/depth_light.js records where each stands), every sign, fingerpost and board, the
 *     things the player can use and the building the objective is in are never blurred;
 *   - most of the blur goes on the true foreground: things standing well in front of the player, and the out-of-focus
 *     leaf sprays that drift across the bottom corners (parallax faster than the world).
 * Built on small canvases, blended onto the frame in one draw:
 *   1. the frame, copied once into a quarter-resolution canvas (L), is blurred (B);
 *   2. a depth mask (M) is drawn at the same size: the ground's blur per row, then each object's silhouette at its own
 *      foot's blur, nearer over farther, then the characters and signs cut back to sharp;
 *   3. B is cut by M, and over it go the aerial perspective (the top, farther north, of the view hazier and cooler, or
 *      warmer at golden hour), the vignette and the foreground leaves; the result is laid over the frame once;
 *   4. bloom: the brightest parts of L (lamps, lit windows, the sun on water), raised to the 8th power, blurred and
 *      added back (in lite mode only when the light is low).
 * The HUD stays crisp: world.draw() calls depthOfField() after grade() and before drawUI(). */
window.LS = window.LS || {};
(function () {
  'use strict';
  const W = LS.World; if (!W) return;
  const P = W.prototype;
  const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  const fit = (c, w, h) => { w = Math.max(1, w | 0); h = Math.max(1, h | 0); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; };
  const ctx2 = c => c.getContext('2d');
  const smooth = t => t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HAS_FILTER = (() => { try { const g = ctx2(cvs(2, 2)); g.filter = 'blur(1px)'; return g.filter === 'blur(1px)'; } catch (e) { return false; } })();
  const K = {};   // work canvases, reused every frame
  const get = k => K[k] || (K[k] = cvs(1, 1));
  const T = 16;

  // blur `src` into `dst` by radius r (in dst pixels): the canvas filter if there is one, otherwise a down-and-up chain
  function blurInto(dst, src, r) {
    const g = ctx2(dst); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy'; g.globalAlpha = 1; g.imageSmoothingEnabled = true;
    if (HAS_FILTER) { g.filter = `blur(${r.toFixed(2)}px)`; g.drawImage(src, 0, 0, dst.width, dst.height); g.filter = 'none'; }
    else {
      const f = Math.max(2, Math.round(r * 1.5)), t = fit(get('_chain'), Math.ceil(dst.width / f), Math.ceil(dst.height / f)), h = ctx2(t);
      h.imageSmoothingEnabled = true; h.globalCompositeOperation = 'copy'; h.drawImage(src, 0, 0, t.width, t.height);
      g.drawImage(t, 0, 0, dst.width, dst.height);
    }
    g.globalCompositeOperation = 'source-over';
  }

  // the look per time of day: haze colour and strength at the top of the view, vignette darkness, bloom strength
  function look(w) {
    const a = w._atm || {}, S = a.sky || { dark: 0, warm: 0, mist: 0 }, c = a.cur || { cloud: 0.3, rain: 0 };
    const dark = Math.min(1, S.dark * 1.5), warm = (S.warm || 0) * (1 - c.cloud * 0.6), wet = Math.min(1, (c.rain || 0) * 1.4);
    const day = [190, 210, 236], gold = [255, 204, 156], night = [70, 86, 150], rain = [178, 188, 200];
    const mixc = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
    let hz = mixc(day, gold, Math.min(1, warm * 1.2)); hz = mixc(hz, night, dark); hz = mixc(hz, rain, wet * (1 - dark));
    return {
      haze: hz.map(Math.round), hazeA: 0.2 + 0.1 * wet + 0.12 * (S.mist || 0) - 0.1 * dark - 0.06 * warm,
      vig: 0.2 + 0.2 * dark + 0.08 * warm,
      bloom: 0.2 + 0.6 * dark + 0.1 * warm, dark, warm
    };
  }

  /* ------------------------------------------------------------ depth of field: how soft is depth y? */
  // f(wy): 0 in focus .. 1 fully soft, from the world y of the player's feet. Behind (north) eases to `farMax` only;
  // in front (south, towards the camera) to 1.
  function focusFn(w, inside) {
    const V = w.vh / T;                                                     // view height in tiles (9.4 desktop, 17.6 phone)
    const far0 = (inside ? Math.max(3.6, 0.4 * V) : Math.max(3.4, 0.35 * V)) * T, near0 = (inside ? Math.max(3.2, 0.36 * V) : Math.max(2.5, 0.3 * V)) * T;
    const ramp = 2 * T, farMax = inside ? 0.45 : 0.7, nearMax = inside ? 0.6 : 1, fy = w.player.y;
    return wy => { const d = wy - fy; return d < 0 ? farMax * smooth(clamp((-d - far0) / ramp, 0, 1)) : nearMax * smooth(clamp((d - near0) / ramp, 0, 1)); };
  }
  const SHARP = /sign|fingerpost|board|notice|busstop|bus_stop|limit|milepost|ppe|exit/i;
  // a soft-edged pill that cuts a character back to sharp (solid to 70 % of its radius)
  const PILL = (() => { const c = cvs(64, 64), g = ctx2(c), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.7, 'rgba(0,0,0,1)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c; })();

  // Returns where the mask is non-zero, for the blit: { rows: [[y0, y1]] of ground bands, boxes: [[x0, y0, x1, y1]] } (small px)
  function buildMask(w, m, sw, sh, q, Z, cx, cy, inside) {
    const g = ctx2(m), f = focusFn(w, inside), Zq = Z / q, sc = w.scenes[w.room], occ = { rows: [], boxes: [] };
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy';
    // the ground, row by row
    const gr = g.createLinearGradient(0, 0, 0, sh), N = 16;
    let run = null;
    for (let i = 0; i <= N; i++) { const u = i / N, wy = cy + u * sh / Zq, v = f(wy); gr.addColorStop(u, `rgba(0,0,0,${v.toFixed(3)})`); }
    for (let y = 0; y < sh; y += 2) { const on = f(cy + (y + 1) / Zq) > 0.004 || f(cy + y / Zq) > 0.004; if (on && !run) occ.rows.push(run = [y, y + 2]); else if (on) run[1] = y + 2; else run = null; }
    g.fillStyle = gr; g.fillRect(0, 0, sw, sh);
    g.globalCompositeOperation = 'source-over';
    if (!sc) return occ;
    g.setTransform(Zq, 0, 0, Zq, -cx * Zq, -cy * Zq); g.imageSmoothingEnabled = true;
    const vw = sw / Zq, vh = sh / Zq, x0 = cx - 8, x1 = cx + vw + 8, y0 = cy - 8, y1 = cy + vh + 8;
    // the building the objective sits in (or the thing itself) stays sharp
    const ob = w.objective; let tx = null, ty = null;
    if (ob) { if (ob.room === w.room) { tx = ob.x; ty = ob.y; } else if (w.room === 'outside' && LS.WORLD && LS.WORLD.DOORS[ob.room]) { const d = LS.WORLD.DOORS[ob.room]; tx = d.doorX; ty = d.doorY; } }
    // 2. every object at its foot's depth, in draw order (nearer over farther)
    const list = [];
    for (const o of sc.objects) {
      if (!o.img || !o.w || o.sortY >= 1e5 || o.dx > x1 || o.dx + o.w < x0 || o.dy > y1 || o.dy + o.h < y0) continue;
      const keep = !!o.labels || SHARP.test(o.kind || '') || SHARP.test(o.id || '') || (tx != null && tx > o.dx && tx < o.dx + o.w && ty > o.dy && ty < o.sortY + 6);
      const tgt = keep ? 0 : f(o.sortY), top = f(o.dy), bot = f(o.dy + o.h), lo = Math.min(top, bot, tgt), hi = Math.max(top, bot);
      if (Math.abs(hi - tgt) < 0.04 && Math.abs(lo - tgt) < 0.04 && tgt === lo) continue;   // already right from the ground rows
      list.push([o, tgt]);
    }
    list.sort((a, b) => a[0].sortY - b[0].sortY);
    const sil = LS.HD && LS.HD.silhouette;
    for (const [o, tgt] of list) {
      if (tgt > 0.004) occ.boxes.push([(o.dx - cx) * Zq - 2, (o.dy - cy) * Zq - 2, (o.dx + o.w - cx) * Zq + 2, (o.dy + o.h - cy) * Zq + 2]);
      let s = o.img, px = 0, py = 0;
      if (sil) { s = sil(o.img, 1); const pd = 12; px = o.w / (s.width - 2 * pd) * pd; py = o.h / (s.height - 2 * pd) * pd; }
      g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1; g.drawImage(s, o.dx - px, o.dy - py, o.w + 2 * px, o.h + 2 * py);
      if (tgt > 0.01) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = tgt; g.drawImage(s, o.dx - px, o.dy - py, o.w + 2 * px, o.h + 2 * py); }
    }
    // 3. characters, animals and the things you can use: always sharp
    g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1;
    for (const [X, Y, h] of w._dActors || []) g.drawImage(PILL, X - 11, Y - h - 5, 22, h + 9);
    for (const e of w.visible ? w.visible() : []) if (e.prompt || e.marker) g.drawImage(PILL, e.x - 14, e.y - 26, 28, 32);
    g.globalCompositeOperation = 'source-over'; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    return occ;
  }

  /* ------------------------------------------------------------ foreground leaves */
  // a few out-of-focus leaf sprays, drawn once: dark leaves with a lighter rim, heavily blurred
  let LEAVES = null;
  function leaves() {
    if (LEAVES) return LEAVES;
    LEAVES = [];
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 4; k++) {
      const S = 200, c = cvs(S, S), g = ctx2(c), n = 7 + (k % 3) * 2, base = k % 2 ? [34, 62, 40] : [44, 70, 36];
      g.translate(S * 0.5, S * 0.95);
      g.strokeStyle = `rgb(${base.map(v => v - 10).join(',')})`; g.lineWidth = 5; g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (rnd() - 0.5) * 2.2, len = 60 + rnd() * 80, ex = Math.cos(ang) * len, ey = Math.sin(ang) * len;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(ex * 0.3, ey * 0.7, ex, ey); g.stroke();
        for (let j = 0; j < 3; j++) {
          const t = 0.4 + j * 0.28, lx = ex * t, ly = ey * t, la = ang + (j % 2 ? 0.8 : -0.8) + (rnd() - 0.5) * 0.4, L = 34 + rnd() * 22;
          g.save(); g.translate(lx, ly); g.rotate(la);
          g.fillStyle = `rgb(${base.map((v, q) => Math.round(v + rnd() * 16 + (q === 1 ? 10 : 0))).join(',')})`;
          g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.5, -L * 0.34, L, 0); g.quadraticCurveTo(L * 0.5, L * 0.34, 0, 0); g.fill(); g.restore();
        }
      }
      let out = c;
      if (HAS_FILTER) { const b = cvs(S, S), h = ctx2(b); h.filter = 'blur(5px)'; h.drawImage(c, 0, 0); out = b; }
      else { const b = cvs(S / 6, S / 6), h = ctx2(b); h.imageSmoothingEnabled = true; h.drawImage(c, 0, 0, b.width, b.height); out = b; }
      LEAVES.push(out);
    }
    return LEAVES;
  }
  // each of the four slots gets its spray pre-rotated at half the device size (re-baked darker as night falls)
  let BAKED = null, BAKEDK = 0;
  function baked(sz, dark, warm) {
    const lv = Math.round(dark * 8) / 8, wv = Math.round(warm * 4) / 4, key = sz + ':' + lv + ':' + wv;
    if (BAKED && BAKEDK === key) return BAKED;
    const sp = leaves(), n = Math.ceil(sz * 0.75); BAKED = []; BAKEDK = key;
    for (let i = 0; i < 4; i++) {
      const side = i >> 1, k = i & 1, rot = side ? -0.5 - 0.25 * k : 0.5 + 0.25 * k, c = cvs(n, n), g = ctx2(c);
      g.imageSmoothingEnabled = true; g.translate(n / 2, n * 0.95); g.rotate(rot);
      const f = []; if (lv > 0) f.push(`brightness(${(1 - 0.72 * lv).toFixed(2)})`); if (wv > 0) f.push(`sepia(${(0.35 * wv).toFixed(2)})`); if (f.length) g.filter = f.join(' ');
      g.drawImage(sp[i % sp.length], -sz / 4, -sz / 2, sz / 2, sz / 2); g.filter = 'none';
      BAKED.push(c);
    }
    return BAKED;
  }
  // drawn into the half-resolution layer C, in C's pixels
  function drawLeaves(w, C, L) {
    const x = ctx2(C), D = { width: C.width * 2, height: C.height * 2 }, cx = w._cx != null ? w._cx : w.camX, cy = w._cy != null ? w._cy : w.camY, Z = w.S * w.dpr;
    const sz = Math.round(Math.min(D.width, D.height) * 0.4), par = 1.6, sprites = baked(sz, L.dark, L.warm);   // parallax: 1.6x the world
    const t = performance.now() / 1000, sway = w.reduced ? 0 : 1, n = sprites[0].width * 2;
    x.setTransform(0.5, 0, 0, 0.5, 0, 0); x.imageSmoothingEnabled = false; x.globalCompositeOperation = 'source-over';
    const Pd = sz * 1.4, off = -cx * Z * par - cy * Z * 0.25;
    for (let side = 0; side < 2; side++) for (let k = 0; k < 2; k++) {
      const u = ((((off + (side ? Pd * 0.3 : 0)) / Pd + k * 0.5) % 1) + 1) % 1, al = Math.sin(u * Math.PI);
      if (al <= 0.02) continue;
      const i = side * 2 + k, X = (side ? D.width - sz * 0.35 : sz * 0.35) + (u - 0.5) * Pd * 0.6 + Math.sin(t * 0.55 + i * 1.9) * sz * 0.02 * sway, Y = D.height + sz * (0.08 + 0.1 * k);
      x.globalAlpha = 0.74 * al * al;
      x.drawImage(sprites[i], Math.round(X - n / 2), Math.round(Y - n * 0.95), n, n);
    }
    x.globalAlpha = 1; x.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ------------------------------------------------------------ the lens */
  // Every layer is smoothed up to HALF resolution (a quarter of the pixels) and then scaled the last 2x without
  // smoothing: the content is soft, and one art pixel is 2 device px, so it can't be seen (a smoothed full-screen
  // upscale costs ~4 ms in the software-rendered test browser, a nearest-neighbour one ~0.8 ms).
  function toHalf(key, src, sw, sh, op) {
    const C = fit(get(key), sw * 2, sh * 2), g = ctx2(C); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true;
    g.globalAlpha = 1; g.globalCompositeOperation = 'copy'; g.drawImage(src, 0, 0, sw * 2, sh * 2);
    if (op) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = op; g.drawImage(C, 0, 0); g.globalAlpha = 1; }
    g.globalCompositeOperation = 'source-over';
    return C;
  }
  function blit(x, C, k, ox, oy) { x.drawImage(C, 0, 0, C.width, C.height, Math.round(ox || 0), Math.round(oy || 0), C.width * k, C.height * k); }
  let VIG = null, VIGK = '';
  const VIG0 = 0.3, HAZE = 0.34;   // the vignette starts 60 % of the way out to the corners
  function vignette(sw, sh, v) {
    // dark at the edges as alpha (drawn source-over): the same as multiplying the frame towards a warm dark
    const k = sw + ',' + sh + ',' + v.toFixed(2); if (VIGK === k) return VIG; VIGK = k; VIG = fit(VIG || cvs(1, 1), sw, sh);
    const g = ctx2(VIG), vg = g.createRadialGradient(sw / 2, sh * 0.5, Math.hypot(sw, sh) * VIG0, sw / 2, sh * 0.5, Math.hypot(sw, sh) * 0.54);
    vg.addColorStop(0, 'rgba(22,16,30,0)'); vg.addColorStop(0.5, `rgba(22,16,30,${(v * 0.35).toFixed(3)})`); vg.addColorStop(1, `rgba(22,16,30,${v.toFixed(3)})`);
    g.globalCompositeOperation = 'copy'; g.fillStyle = vg; g.fillRect(0, 0, sw, sh); return VIG;
  }

  // Only the parts of the lens layer that hold anything are laid on the frame: the layer is cut into a 16 x 12 grid
  // and a block is drawn if the ground bands, a blurred object, the haze, the vignette or the leaves reach it (worked
  // out from what was drawn, not read back); runs of blocks in a grid row go down as one draw.
  const GX = 16, GY = 12;
  function spans(sw, sh, occ, haze, leaf) {
    const bw = sw / GX, bh = sh / GY, on = new Uint8Array(GX * GY), cxs = sw / 2, cys = sh / 2, r0 = Math.hypot(sw, sh) * VIG0;
    for (let j = 0; j < GY; j++) {
      const y0 = j * bh, y1 = y0 + bh;
      const row = occ.rows.some(([a, b]) => a < y1 && b > y0) || (haze && y0 < sh * HAZE);
      for (let i = 0; i < GX; i++) {
        const x0 = i * bw, x1 = x0 + bw, dx = Math.max(Math.abs(x0 - cxs), Math.abs(x1 - cxs)), dy = Math.max(Math.abs(y0 - cys), Math.abs(y1 - cys));
        on[j * GX + i] = row || Math.hypot(dx, dy) > r0 || occ.boxes.some(b => b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0) ||
          (leaf > 0 && y1 > sh - leaf * 1.05 && (x0 < leaf * 1.1 || x1 > sw - leaf * 1.1)) ? 1 : 0;
      }
    }
    const out = [];
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { if (!on[j * GX + i]) continue; let k = i; while (k + 1 < GX && on[j * GX + k + 1]) k++; out.push([i * bw, j * bh, (k + 1) * bw, (j + 1) * bh]); i = k; }
    // merge identical spans in consecutive rows into taller rectangles
    const m = []; for (const r of out) { const p = m.find(q => q[0] === r[0] && q[2] === r[2] && Math.abs(q[3] - r[1]) < 0.01); if (p) p[3] = r[3]; else m.push(r.slice()); }
    return m;
  }
  function blitSpans(x, C, k, sp, ox, oy) {
    ox = Math.round(ox || 0); oy = Math.round(oy || 0);
    if (!sp) return blit(x, C, k, ox, oy);
    for (const [x0, y0, x1, y1] of sp) {   // small px -> C px (x2) -> device px (x k), on even C pixels
      const a = Math.floor(x0) * 2, b = Math.floor(y0) * 2, c = Math.min(C.width, Math.ceil(x1) * 2), d = Math.min(C.height, Math.ceil(y1) * 2);
      if (c > a && d > b) x.drawImage(C, a, b, c - a, d - b, ox + a * k, oy + b * k, (c - a) * k, (d - b) * k);
    }
  }
  P.depthOfField = function (x) {
    const a = this._atm || {}, lite = !!a.lite, D = this.cv, inside = this.room !== 'outside';
    const Z = this.S * this.dpr, tile = Z * T;                // device px per map tile (96 at desktop and phone)
    const q = Math.max(3, Math.round(tile / 24));            // small-canvas scale (quarter resolution at 96 px tiles)
    const sw = Math.ceil(D.width / q), sh = Math.ceil(D.height / q), s = tile / 96;
    const L = look(this);
    const cx = this._cx != null ? this._cx : this.camX, cy = this._cy != null ? this._cy : this.camY;
    // lite: the lens layer is rebuilt every fourth frame (and the bloom on another); in between the last one is laid
    // down again, shifted by however far the camera has moved since, so it stays registered with the world
    const st = this._dofS || (this._dofS = { n: 0 }); st.n++;
    const key = [sw, sh, lite, inside, this.room].join(), fresh = st.key !== key; st.key = key;
    const jumped = cam => !cam || Math.abs(cam[0] - cx) * Z > 64 || Math.abs(cam[1] - cy) * Z > 64;
    const bloomOn = (!lite || L.dark > 0.25) && L.bloom > 0.05;
    const doBlur = !lite || fresh || st.n % 4 === 0 || jumped(st.camB), doBloom = bloomOn && (!lite || fresh || st.n % 4 === 2 || jumped(st.camL) || !st.bloomed);
    // 1. the frame, small
    const Lc = fit(get('L'), sw, sh);
    if (doBlur || doBloom) { const lg = ctx2(Lc); lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'copy'; lg.imageSmoothingEnabled = true; lg.drawImage(D, 0, 0, sw, sh); lg.globalCompositeOperation = 'source-over'; }
    if (doBlur) {
      // 2. blurred copy, cut by the depth mask
      const B = fit(get('B'), sw, sh), bg = ctx2(B);
      blurInto(B, Lc, 1.25 * s * 4 / q);
      const M = fit(get('M'), sw, sh), occ = buildMask(this, M, sw, sh, q, Z, cx, cy, inside);
      // the near foreground goes softer still: a heavier blur (from an eighth-resolution copy) mixed in by mask^3,
      // so it only tells where the mask is strong (in front of the player), never on the capped far plane
      if (!lite) {
        const Hs = fit(get('H'), Math.ceil(sw / 2), Math.ceil(sh / 2)); blurInto(Hs, Lc, 1.6 * s * 4 / q);
        const Tt = fit(get('T'), sw, sh), tg = ctx2(Tt); tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'copy'; tg.imageSmoothingEnabled = true; tg.drawImage(Hs, 0, 0, sw, sh);
        tg.globalCompositeOperation = 'destination-in'; tg.drawImage(M, 0, 0); tg.drawImage(M, 0, 0); tg.drawImage(M, 0, 0); tg.globalCompositeOperation = 'source-over';
        bg.drawImage(Tt, 0, 0);
      }
      bg.globalCompositeOperation = 'destination-in'; bg.drawImage(M, 0, 0); bg.globalCompositeOperation = 'source-over';
      // 3. aerial perspective over the top of the view (farther north: hazier, cooler; warmer at golden hour)
      if (!inside) {
        const hz = bg.createLinearGradient(0, 0, 0, sh * HAZE), [r, g, b] = L.haze, ha = Math.max(0, L.hazeA);
        hz.addColorStop(0, `rgba(${r},${g},${b},${ha.toFixed(3)})`); hz.addColorStop(0.45, `rgba(${r},${g},${b},${(ha * 0.4).toFixed(3)})`); hz.addColorStop(1, `rgba(${r},${g},${b},0)`);
        bg.fillStyle = hz; bg.fillRect(0, 0, sw, sh * HAZE);
      }
      bg.drawImage(vignette(sw, sh, L.vig * (inside ? 0.8 : 1)), 0, 0);
      const C = toHalf('C', B, sw, sh); st.camB = [cx, cy];
      // foreground depth outdoors: out-of-focus leaves framing the bottom corners
      const leavesOn = !inside && !this.attract; if (leavesOn) drawLeaves(this, C, L);
      st.spans = spans(sw, sh, occ, !inside && L.hazeA > 0, leavesOn ? Math.min(D.width, D.height) * 0.4 / q : 0);
    }
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
    blitSpans(x, get('C'), q / 2, st.spans, (st.camB[0] - cx) * Z, (st.camB[1] - cy) * Z);
    // 4. bloom from the brightest parts of the frame (lite: only when the light is low, when it matters most)
    if (bloomOn) {
      if (doBloom) {
        const bw = Math.ceil(sw / 2), bh = Math.ceil(sh / 2), Hb = fit(get('Hb'), bw, bh), hb = ctx2(Hb);
        hb.setTransform(1, 0, 0, 1, 0, 0); hb.globalCompositeOperation = 'copy'; hb.imageSmoothingEnabled = true; hb.drawImage(Lc, 0, 0, bw, bh);
        hb.globalCompositeOperation = 'multiply'; hb.drawImage(Hb, 0, 0); hb.drawImage(Hb, 0, 0); hb.drawImage(Hb, 0, 0);   // v^8: only the bright survives
        hb.globalCompositeOperation = 'source-over';
        const Bb = fit(get('Bb'), bw, bh); blurInto(Bb, Hb, 3 * s * 4 / q);
        const C2 = toHalf('C2', Bb, sw, sh, L.dark > 0.3 ? 0.6 * Math.min(1, L.dark) : 0);   // night: stronger
        // lite: atmos.js no longer lays its own glow layer (lamp pools, moths) over the frame, so it rides along here
        const G = this._atmG; if (lite && G && a.useG && !inside) { const g2 = ctx2(C2); g2.globalCompositeOperation = 'lighter'; g2.imageSmoothingEnabled = true; g2.drawImage(G, 0, 0, C2.width, C2.height); g2.globalCompositeOperation = 'source-over'; }
        st.camL = [cx, cy]; st.bloomed = true;
      }
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(1, L.bloom * 0.8);
      blit(x, get('C2'), q / 2, (st.camL[0] - cx) * Z, (st.camL[1] - cy) * Z);
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    } else st.bloomed = false;
    x.restore();
    x.imageSmoothingEnabled = false;
  };
  P.depthLook = function () { return look(this); };
})();
