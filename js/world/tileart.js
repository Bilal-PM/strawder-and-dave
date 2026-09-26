/* LINESIDE — tile renderer ("TileArt"): Stardew-style 3/4 pixel art for the Kestrel Vale.
 * Kenney CC0 16px tiles (Tiny Town is the style anchor, RPG Urban for cast bodies and street
 * furniture) + rail pieces drawn here in the ENDESGA-32 palette. All images come from
 * LS.ATLAS (data URIs, see js/world/atlas.js), so canvases never get tainted on file:// and the
 * single-file bundle works. World units = pixels of a 16px tile; everything is drawn at integer
 * positions with smoothing off (the engine applies the integer zoom).
 *
 * API
 *   LS.TileArt.load()                          -> Promise; decodes the atlas (idempotent)
 *   LS.TileArt.buildOutside(level, opts)       -> Scene   opts = { lineState:'closed'|'live', season:'spring' }
 *   LS.TileArt.buildRoom(roomId, level, opts)  -> Scene   roomId 'office'|'hall'|'shed', opts = { flags:{ panel, planned } }
 *   LS.TileArt.drawAnimated(ctx, scene, t, x0, y0, x1, y1)  t = seconds (float); call after ground, before objects
 *   LS.TileArt.drawActor(ctx, look, x, y, facing, frame, opts)  x,y = feet; opts = { ppe, moving, alpha, shadow }
 *   LS.TileArt.drawAnimal(ctx, kind, x, y, t, opts)  kind 'cat'|'duck'|'sheep'|'pigeon'; t = seconds; opts = { facing:'left'|'right' or face:-1|1, alpha }
 *   LS.TileArt.actorHeight                     -> px from feet to top of head (for markers / nameplates)
 *
 * Scene = { w, h, ground, objects:[{ img, dx, dy, sortY, fade?, kind?, ... }], lights:[{ x, y, r }], anchors:{ name:{x,y} }, anim }
 *   Extras (optional to use): objects carry `kind` ('tree','building','lamp','bench','fingerpost','sign','canopy',
 *   'bridge','ppe_gate','furniture','marjorie', ...). PPE gates also carry `tiles` and `imgOpen` (the same gate swung open,
 *   for when the player has PPE). anchors.pigeon has `sortY` (draw Kevin after Marjorie). Outside anchors: duck, duck2,
 *   duck = flooded cess by the blocked drain on the closed line (beck otherwise), duckBeck,
 *   sheep1..6 (suggested grazing spots), door_office/door_hall/door_shed (door centre). Shed: pigeon, marjorieCab,
 *   radio, cushions, cat1..3 (from cat_spots), hotspots by id, exit. Every room has anchors.exit.
 */
window.LS = window.LS || {};
(function () {
  'use strict';
  const T = 16;

  /* ------------------------------------------------------------------ palette (ENDESGA-32 + Tiny Town) */
  const K = {
    out: '#3e2731', ttOut: '#3f2631', blk: '#181425', s4: '#262b44', s3: '#3a4466', s2: '#5a6988', s1: '#8b9bb4',
    s0: '#c0cbdc', wh: '#ffffff', rd0: '#be4a2f', or0: '#d77643', sand: '#ead4aa', tan: '#e4a672', br: '#b86f50',
    brD: '#733e39', wine: '#a22633', red: '#e43b44', or: '#f77622', yel: '#feae34', yelL: '#fee761',
    g1: '#63c74d', g2: '#3e8948', g3: '#265c42', g4: '#193c3e', bD: '#124e89', b: '#0099db', bL: '#2ce8f5',
    pk: '#ff0044', plum: '#68386c', mag: '#b55088', rose: '#f6757a', skin: '#e8b796', skinD: '#c28569',
    grass: '#84c669', grassD: '#479f4a', woodL: '#eaa56c', wood: '#bd6c4a', woodD: '#763b36', woodM: '#cf8254'
  };
  const SHADOW = 'rgba(38,43,68,0.40)';

  /* ------------------------------------------------------------------ small utilities */
  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    return c;
  }
  function G(c) { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; }
  function R(g, x, y, w, h, col) { if (w <= 0 || h <= 0) return; g.fillStyle = col; g.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function P(g, x, y, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); }
  function hash(x, y, s) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 1, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function rng(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(arr, r) { return arr[Math.min(arr.length - 1, Math.floor(r * arr.length))]; }
  // pixel ellipse (filled), crisp
  function ell(g, cx, cy, rx, ry, col) {
    g.fillStyle = col;
    for (let dy = -ry; dy <= ry; dy++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))));
      if (w > 0) g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1);
    }
  }
  function hexRGB(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgbHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  // shade toward a cool dark (negative k) or a warm light (positive k), keeps pixel-art hue shift
  function shade(hex, k) {
    const [r, g, b] = hexRGB(hex);
    if (k < 0) { const t = -k; return rgbHex(r + (38 - r) * t, g + (43 - g) * t, b + (68 - b) * t); }
    return rgbHex(r + (255 - r) * k, g + (246 - g) * k, b + (220 - b) * k);
  }

  /* ------------------------------------------------------------------ 3x5 pixel font (world lettering) */
  const GLYPH = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', ' ': '000000000000000', '.': '000000000000010', '·': '000000010000000', '-': '000000111000000',
    "'": '010010000000000', '’': '010010000000000', '!': '010010010000010', '&': '010101010101011', ':': '000010000010000',
    ',': '000000000010100', '/': '001001010100100', '?': '110001010000010', '(': '010100100100010', ')': '010001001001010',
    '↑': '010111010010010', '↓': '010010010111010', '→': '100010001010100', '←': '001010100010001', '+': '000010111010000',
    '½': '100101010101011', '¾': '110010110101011', '#': '101111101111101'
  };
  function textW(s) { return s.length ? s.length * 4 - 1 : 0; }
  function text(g, s, x, y, col, shadowCol) {
    s = String(s).toUpperCase();
    if (shadowCol) text(g, s, x, y + 1, shadowCol);
    g.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const gl = GLYPH[s[i]] || GLYPH['?'];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) if (gl.charCodeAt(r * 3 + c) === 49) g.fillRect(x + i * 4 + c, y + r, 1, 1);
      }
    }
    return textW(s);
  }
  function textC(g, s, cx, y, col, sh) { return text(g, s, Math.round(cx - textW(String(s)) / 2), y, col, sh); }
  // a painted board with centred lines of lettering
  function board(g, x, y, w, h, bg, ink, lines, frame) {
    R(g, x, y, w, h, frame || K.out); R(g, x + 1, y + 1, w - 2, h - 2, bg);
    const n = lines.length, lh = 6, top = y + Math.round((h - (n * lh - 1)) / 2);
    lines.forEach((ln, i) => textC(g, ln, x + w / 2, top + i * lh, ink));
  }

  /* ------------------------------------------------------------------ atlas */
  const IMG = {};
  let IDX = null, loading = null;
  const SPR = {}; // derived sprite canvases
  function load() {
    if (loading) return loading;
    const A = LS.ATLAS || {};
    IDX = LS.ATLAS_INDEX || {};
    loading = Promise.all(Object.keys(A).map(k => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => { IMG[k] = im; res(); };
      im.onerror = () => rej(new Error('TileArt: atlas image failed: ' + k));
      im.src = A[k];
    }))).then(prepare);
    return loading;
  }
  // Tiny Town tile (col,row) at dx,dy
  function tt(g, c, r, dx, dy, w, h) { w = w || 1; h = h || 1; g.drawImage(IMG.tt, c * T, r * T, w * T, h * T, dx | 0, dy | 0, w * T, h * T); }
  function ttp(g, sx, sy, sw, sh, dx, dy) { g.drawImage(IMG.tt, sx, sy, sw, sh, dx | 0, dy | 0, sw, sh); }
  function urRect(name) { return (IDX.ur || {})[name]; }
  function ur(g, name, dx, dy, flip) {
    const r = urRect(name); if (!r) return;
    if (flip) { g.save(); g.translate((dx | 0) + r[2], dy | 0); g.scale(-1, 1); g.drawImage(IMG.ur, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); g.restore(); }
    else g.drawImage(IMG.ur, r[0], r[1], r[2], r[3], dx | 0, dy | 0, r[2], r[3]);
  }
  // copy a region of an image into its own canvas, optional colour map {fromHex: toHex}
  function cut(img, sx, sy, sw, sh, map) {
    const c = cv(sw, sh), g = G(c); g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    if (map) recolour(c, map);
    return c;
  }
  function recolour(c, map) {
    const g = G(c), d = g.getImageData(0, 0, c.width, c.height), a = d.data;
    const m = {}; Object.keys(map).forEach(k => { m[hexRGB(k).join(',')] = hexRGB(map[k]); });
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) continue;
      const t = m[a[i] + ',' + a[i + 1] + ',' + a[i + 2]];
      if (t) { a[i] = t[0]; a[i + 1] = t[1]; a[i + 2] = t[2]; }
    }
    g.putImageData(d, 0, 0);
    return c;
  }

  /* ------------------------------------------------------------------ derived sprites (built once after load) */
  const CL = { OUT: 1, HAIR_HI: 2, HAIR: 3, HAIR_DK: 4, SKIN_HI: 5, SKIN: 6, SKIN_DK: 7, EYE: 8, MOUTH: 9, TOP_HI: 10, TOP: 11, TOP_DK: 12, LEGS: 13, LEGS_DK: 14, SHOE: 15, HAT: 16, HAT_DK: 17, HAT_HI: 18, BAND: 19, FRAME: 20, ERASE: 99 };
  let CHAR = null; // { cells: {name: [ [Uint8Array x9] ]}, cw, ch }

  function prepare() {
    // --- character class maps
    const ci = IDX.chars || { order: [], cellW: 16, cellH: 18 };
    const im = IMG.chars, c = cv(im.width, im.height), g = G(c);
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const cells = {};
    ci.order.forEach((name, ri) => {
      cells[name] = [];
      for (let k = 0; k < 9; k++) {
        const a = new Uint8Array(ci.cellW * ci.cellH);
        for (let y = 0; y < ci.cellH; y++) for (let x = 0; x < ci.cellW; x++) {
          const i = ((ri * ci.cellH + y) * c.width + (k * ci.cellW + x)) * 4;
          a[y * ci.cellW + x] = d[i + 3] ? d[i] : 0;
        }
        cells[name].push(a);
      }
    });
    CHAR = { cells, cw: ci.cellW, ch: ci.cellH };

    // --- trees
    SPR.treeTall = cut(IMG.tt, 64, 0, 16, 32);                      // Tiny Town conifer
    SPR.treeTallD = cut(IMG.tt, 64, 0, 16, 32, { '#84c669': '#479f4a', '#479f4a': '#265c42' });
    SPR.treeGold = cut(IMG.tt, 48, 0, 16, 32);
    // round broadleaf: Tiny Town bush crown on a trunk
    SPR.treeRound = roundTree(false);
    SPR.treeBlossom = roundTree(true);
    // forest-mass tree cut from the Tiny Town cluster (single crown, 12x15)
    const ft = cv(12, 15), fg = G(ft);
    fg.drawImage(IMG.tt, 114, 7, 12, 15, 0, 0, 12, 15);
    // clean neighbour pixels on the lower corners (the cluster overlaps)
    const fd = fg.getImageData(0, 0, 12, 15);
    for (let y = 9; y < 15; y++) for (let x = 0; x < 12; x++) {
      const inside = Math.abs(x - 5.5) <= 5.5 - Math.max(0, (y - 11)) * 1.2;
      if (!inside) fd.data[(y * 12 + x) * 4 + 3] = 0;
    }
    fg.putImageData(fd, 0, 0);
    SPR.forest = ft;
    SPR.forestD = recolour(cutCanvas(ft), { '#84c669': '#479f4a', '#479f4a': '#265c42' });
    SPR.forestL = recolour(cutCanvas(ft), { '#479f4a': '#63c74d' });
    // lamp, bench, bins from RPG Urban (LUT-baked)
    ['lamp', 'benchF', 'benchS', 'bin_grey', 'bin_grey2', 'bin_red', 'barrier_rw', 'barrier_yb', 'crate'].forEach(n => {
      const r = urRect(n); if (r) SPR[n] = cut(IMG.ur, r[0], r[1], r[2], r[3]);
    });
    SPR.shadowActor = (() => { const s = cv(12, 5), sg = G(s); ell(sg, 6, 2, 5, 1, 'rgba(38,43,68,0.38)'); return s; })();
    SPR.textures = makeTextures();
  }
  function cutCanvas(src) { const c = cv(src.width, src.height); G(c).drawImage(src, 0, 0); return c; }

  function roundTree(blossom) {
    const c = cv(16, 26), g = G(c);
    // trunk
    R(g, 6, 15, 4, 10, K.ttOut); R(g, 7, 15, 2, 9, K.wood); P(g, 7, 16, K.woodL);
    R(g, 5, 24, 6, 2, K.ttOut);
    g.drawImage(IMG.tt, 80, 0, 16, 16, 0, 0, 16, 16);
    if (blossom) {
      const r = rng(7);
      for (let i = 0; i < 22; i++) {
        const x = 3 + Math.floor(r() * 10), y = 2 + Math.floor(r() * 11);
        const d = g.getImageData(x, y, 1, 1).data;
        if (d[3] && !(d[0] === 63 && d[1] === 38)) P(g, x, y, r() < 0.55 ? K.rose : K.wh);
      }
    }
    return c;
  }

  /* ------------------------------------------------------------------ ground textures (16x16 variants) */
  function tex(n, fn) { const out = []; for (let i = 0; i < n; i++) { const c = cv(T, T); fn(G(c), rng(1000 + i * 97 + n * 13), i); out.push(c); } return out; }
  function speckle(g, r, base, dots, w, h) {
    R(g, 0, 0, w || T, h || T, base);
    dots.forEach(([col, p]) => {
      for (let y = 0; y < (h || T); y++) for (let x = 0; x < (w || T); x++) if (r() < p) P(g, x, y, col);
    });
  }
  function pebbles(g, r, base, cols) {
    R(g, 0, 0, T, T, base);
    for (let y = 0; y < T; y += 2) for (let x = (y >> 1) & 1; x < T; x += 2) {
      let v = r(), col = null;
      for (const [c, p] of cols) { if (v < p) { col = c; break; } v -= p; }
      if (col) { R(g, x, y, 2, 2, col); P(g, x, y, shade(col, 0.18)); }
    }
  }
  function makeTextures() {
    const X = {};
    X.asphalt = tex(6, (g, r) => speckle(g, r, K.s2, [[K.s3, 0.045], [K.s1, 0.012]]));
    X.tarmacD = tex(4, (g, r) => speckle(g, r, K.s3, [[K.s2, 0.05], [K.s4, 0.025]]));
    X.lane = tex(6, (g, r) => speckle(g, r, K.s2, [[K.s3, 0.06], [K.s1, 0.03], [K.brD, 0.012]]));
    X.gravel = tex(6, (g, r) => pebbles(g, r, K.s1, [[K.s2, 0.13], [K.s0, 0.05], [shade(K.s1, -0.1), 0.2]]));
    X.gravelWarm = tex(6, (g, r) => pebbles(g, r, K.s1, [[K.s2, 0.2], [K.s0, 0.08], [K.tan, 0.03]]));
    X.ballastOld = tex(8, (g, r) => { pebbles(g, r, K.s2, [[K.s1, 0.2], [K.s3, 0.2], [K.brD, 0.1]]); for (let k = 0; k < 2; k++) if (r() < 0.5) { const x = r() * 14 | 0, y = r() * 14 | 0; P(g, x, y, K.g3); P(g, x + 1, y, K.g2); } });
    X.ballastNew = tex(8, (g, r) => pebbles(g, r, K.s2, [[K.s1, 0.36], [K.s0, 0.08], [K.s3, 0.1]]));
    X.ballastLive = tex(8, (g, r) => pebbles(g, r, K.s2, [[K.s1, 0.3], [K.s3, 0.14]]));
    X.cessOld = tex(8, (g, r) => { speckle(g, r, K.s2, [[K.s3, 0.05], [K.brD, 0.025], [K.s1, 0.03]]); for (let k = 0; k < 3; k++) { const x = r() * 14 | 0, y = r() * 14 | 0; if (r() < 0.5) { P(g, x, y, K.s1); P(g, x + 1, y, K.s1); P(g, x, y + 1, K.s3); P(g, x + 1, y + 1, K.s3); } } });
    X.cessNew = tex(8, (g, r) => speckle(g, r, K.s2, [[K.s3, 0.07], [K.s1, 0.07], [K.brD, 0.02]]));
    X.concrete = tex(6, (g, r) => { speckle(g, r, K.s1, [[K.s0, 0.03], [K.s2, 0.035]]); if (r() < 0.35) { const x = r() * 12 | 0, y = r() * 12 | 0; R(g, x, y, 3, 2, shade(K.s1, -0.12)); } });
    X.setts = tex(4, (g, r, i) => {
      R(g, 0, 0, T, T, K.s3);
      for (let row = 0; row < 4; row++) for (let col = -1; col < 5; col++) {
        const x = col * 4 + (row % 2 ? 2 : 0), y = row * 4;
        const v = r();
        R(g, x, y, 3, 3, v < 0.55 ? K.s1 : (v < 0.92 ? K.s2 : shade(K.s1, 0.15)));
        if (v < 0.55) P(g, x, y, shade(K.s1, 0.25));
      }
    });
    X.cobblesWarm = tex(4, (g, r) => {
      R(g, 0, 0, T, T, K.brD);
      for (let row = 0; row < 4; row++) for (let col = -1; col < 5; col++) {
        const x = col * 4 + (row % 2 ? 2 : 0), y = row * 4, v = r();
        R(g, x, y, 3, 3, v < 0.45 ? K.s2 : (v < 0.8 ? K.s1 : K.br));
        P(g, x, y, K.s0);
      }
    });
    X.pave = tex(4, (g, r) => {
      R(g, 0, 0, T, T, K.s1);
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
        const x = sx * 8, y = sy * 8;
        R(g, x + 7, y, 1, 8, K.s2); R(g, x, y + 7, 8, 1, K.s2); P(g, x, y, K.s0);
        if (r() < 0.25) P(g, x + 2 + (r() * 4 | 0), y + 2 + (r() * 4 | 0), K.s2);
        if (r() < 0.12) R(g, x + 1, y + 1, 5, 5, shade(K.s1, 0.12));
      }
    });
    X.slabBig = tex(4, (g, r) => {
      R(g, 0, 0, T, T, K.s1);
      R(g, 15, 0, 1, T, K.s2); R(g, 0, 7, T, 1, K.s2); P(g, 0, 0, K.s0); P(g, 0, 8, K.s0);
      for (let k = 0; k < 6; k++) P(g, r() * 15 | 0, r() * 15 | 0, r() < 0.5 ? K.s2 : K.s0);
    });
    X.platform = tex(6, (g, r) => { speckle(g, r, K.s2, [[K.s3, 0.06], [K.s1, 0.04]]); if (r() < 0.3) { let x = r() * 12 | 0, y = r() * 12 | 0; for (let k = 0; k < 5; k++) { P(g, x, y, K.s3); x += r() < 0.5 ? 1 : 0; y += 1; } } });
    X.soil = tex(4, (g, r) => speckle(g, r, K.brD, [[K.out, 0.14], [K.br, 0.08]]));
    X.earth = tex(4, (g, r) => speckle(g, r, K.br, [[K.brD, 0.18], [K.tan, 0.08]]));
    X.forestFloor = tex(4, (g, r) => speckle(g, r, K.grassD, [[K.g3, 0.10], [K.grass, 0.04]]));
    X.grassCustom = tex(8, (g, r, i) => {
      g.drawImage(IMG.tt, 0, 0, T, T, 0, 0, T, T);
      const kinds = ['tuft', 'tuft2', 'daisy', 'butter', 'clover', 'tuft', 'long', 'daisy2'];
      const k = kinds[i];
      const x = 3 + (r() * 9 | 0), y = 4 + (r() * 8 | 0);
      if (k === 'tuft' || k === 'tuft2') { P(g, x, y, K.grassD); P(g, x + 2, y, K.grassD); P(g, x + 1, y - 1, K.grassD); if (k === 'tuft2') { P(g, x + 5, y + 3, K.grassD); P(g, x + 6, y + 2, K.grassD); } }
      if (k === 'long') { for (let j = 0; j < 4; j++) { P(g, x + j * 2, y - (j % 2), K.grassD); P(g, x + j * 2, y + 1 - (j % 2), K.g2); } }
      if (k === 'daisy' || k === 'daisy2') { [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => P(g, x + dx, y + dy, K.wh)); P(g, x, y, K.yel); if (k === 'daisy2') { P(g, x + 5, y + 3, K.wh); P(g, x + 6, y + 2, K.wh); } }
      if (k === 'butter') { P(g, x, y, K.yel); P(g, x + 1, y, K.yelL); P(g, x + 4, y + 2, K.yel); P(g, x + 4, y + 3, K.grassD); }
      if (k === 'clover') { P(g, x, y, K.g2); P(g, x + 1, y, K.g2); P(g, x, y + 1, K.g2); P(g, x + 1, y - 1, K.grassD); }
    });
    X.lawnStripe = tex(2, (g, r, i) => {
      g.drawImage(IMG.tt, 0, 0, T, T, 0, 0, T, T);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (((x + y * 2) % 4 === 0)) P(g, x, y, K.g1);
    });
    return X;
  }
  function texAt(arr, x, y, s) { return arr[Math.floor(hash(x, y, s || 3) * arr.length)]; }

  /* ================================================================== OUTSIDE: map analysis */
  const WALKABLE = '.,"rl-pse_cxnogmy%:=/b!za';
  const HARD = { road: 1, lane: 1, pave: 1, setts: 1, platform: 1, hard: 1, carpark: 1, crossing: 1, yard: 1, apron: 1, mat: 1, bridge: 1, farm: 1 };
  function mkWorld(level) {
    const rows = level.rows, H = rows.length, W = rows[0].length;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 't' : rows[y][x];
    const w = { level, rows, W, H, at };
    w.walk = (x, y) => WALKABLE.indexOf(at(x, y)) >= 0;
    w.isBld = (x, y) => /[A-Z0-9*]/.test(at(x, y));
    const sc = {};
    w.surf = (x, y) => {
      const key = x + ',' + y; if (key in sc) return sc[key];
      return (sc[key] = surfOf(w, x, y));
    };
    return w;
  }
  function surfOf(w, x, y) {
    const ch = w.at(x, y);
    switch (ch) {
      case '.': return 'grass'; case ',': return 'lawn'; case '"': return 'pasture';
      case 'r': case '%': return 'road'; case 'l': return 'lane'; case 'p': return 'path'; case 's': return 'setts';
      case 'e': return 'platform'; case '_': return 'hard'; case 'c': return 'carpark'; case 'x': return 'crossing';
      case 'y': return 'yard'; case 'a': return 'apron'; case ':': case '/': case 'z': return 'cess';
      case '=': case '$': return 'track'; case 'w': case 'o': return 'water'; case 'm': return 'mat';
      case '|': case 'j': return 'main'; case 'b': return 'bridge'; case '^': return 'platform';
      case '-': {
        const n = w.at(x, y - 1), s = w.at(x, y + 1);
        if ((n === 'r' || n === '%') && (s === 'r' || s === '%')) return 'road';
        return 'pave';
      }
      case 'n': {
        for (let d = 1; d < 12; d++) {
          const l = w.at(x - d, y); if (l !== 'n') return l === 'r' ? 'road' : (l === '-' ? 'pave' : 'path');
        }
        return 'road';
      }
      case 'g': case '!': {
        const cand = [w.at(x, y - 1), w.at(x, y + 1), w.at(x - 1, y), w.at(x + 1, y)];
        for (const c of cand) {
          if (c === 'p' || c === 'm') return 'path';
          if (c === 'e') return 'platform'; if (c === '_') return 'hard'; if (c === 'a') return 'apron';
          if (c === '-') return 'pave'; if (c === ':') return 'cess'; if (c === 's') return 'setts'; if (c === 'y') return 'yard';
        }
        return 'grass';
      }
      case 'f': case 'k': {
        const n = [w.at(x, y - 1), w.at(x, y + 1), w.at(x - 1, y), w.at(x + 1, y)];
        const rl = n.filter(c => c === ':' || c === '_' || c === 'a' || c === '|' || c === '=' || c === 'f').length;
        if (rl >= 3 && n.some(c => c === ':' || c === '_' || c === 'a')) return 'cessFence';
        return 'grass';
      }
      default: {
        if (/[A-Z0-9*]/.test(ch)) { // building footprint: sit on whatever the frontage is (compound gravel, apron...)
          for (let d = 1; d < 9; d++) { const c = w.at(x, y + d); if (!/[A-Z0-9*]/.test(c)) { if ('_as'.indexOf(c) >= 0) return surfOf(w, x, y + d); break; } }
        }
        return 'grass';
      }
    }
  }

  /* ================================================================== base terrain */
  function noise2(x, y, s) { // smooth value noise, cell = 1
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function grassTile(g, x, y, kind) {
    const X = SPR.textures, px = x * T, py = y * T, r = hash(x, y, 11), r2 = hash(x, y, 12);
    const patch = noise2(x / 5, y / 5, 5);
    if (kind === 'lawn') {
      g.drawImage(((x >> 1) & 1) ? X.lawnStripe[0] : IMG.tt, ((x >> 1) & 1) ? 0 : 0, 0, T, T, px, py, T, T);
      if (r < 0.05) g.drawImage(X.grassCustom[2 + (r2 < 0.5 ? 0 : 5)], px, py);
      return;
    }
    if (kind === 'pasture') {
      if (r < 0.22 + patch * 0.15) tt(g, 1, 0, px, py);
      else if (r < 0.46) g.drawImage(pick([X.grassCustom[0], X.grassCustom[1], X.grassCustom[4], X.grassCustom[6], X.grassCustom[3]], r2), px, py);
      else tt(g, 0, 0, px, py);
      return;
    }
    // verge / general grass
    const tuft = 0.08 + patch * 0.10;
    if (r < tuft) tt(g, 1, 0, px, py);
    else if (r < tuft + 0.035) tt(g, 2, 0, px, py);
    else if (r < tuft + 0.10) g.drawImage(X.grassCustom[Math.floor(r2 * 8)], px, py);
    else tt(g, 0, 0, px, py);
  }
  // Tiny Town dirt path 9-slice, autotiled per 8x8 quadrant (inner corners drawn by hand)
  function pathTile(g, w, x, y, joins) {
    const px = x * T, py = y * T;
    const J = (dx, dy) => joins(w, x + dx, y + dy);
    const n = J(0, -1), s = J(0, 1), e = J(1, 0), wv = J(-1, 0);
    const quads = [[0, 0, n, wv, J(-1, -1)], [8, 0, n, e, J(1, -1)], [0, 8, s, wv, J(-1, 1)], [8, 8, s, e, J(1, 1)]];
    quads.forEach(([qx, qy, v, h, dg]) => {
      let col, row;
      const top = qy === 0, left = qx === 0;
      if (!v && !h) { col = left ? 0 : 2; row = top ? 1 : 3; }
      else if (!v && h) { col = 1; row = top ? 1 : 3; }
      else if (v && !h) { col = left ? 0 : 2; row = 2; }
      else { col = 1; row = 2; }
      ttp(g, col * T + qx, row * T + qy, 8, 8, px + qx, py + qy);
      if (v && h && !dg) { // inner corner notch of grass
        const cx = left ? px : px + 15, cy = top ? py : py + 15, sx = left ? 1 : -1, sy = top ? 1 : -1;
        P(g, cx, cy, K.grass); P(g, cx + sx, cy, K.grass); P(g, cx, cy + sy, K.grass); P(g, cx + 2 * sx, cy, K.grassD); P(g, cx, cy + 2 * sy, K.grassD);
      }
    });
  }
  function joinPath(w, x, y) {
    const ch = w.at(x, y);
    if ('pmgon!'.indexOf(ch) >= 0) return true;
    const s = w.surf(x, y);
    if (HARD[s] || w.isBld(x, y) || ch === '#') return true;
    return false;
  }
  function texTile(g, arr, x, y, s) { g.drawImage(texAt(arr, x, y, s), x * T, y * T); }

  function drawBase(g, w, st) {
    const X = SPR.textures;
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      const s = w.surf(x, y), ch = w.at(x, y), px = x * T, py = y * T;
      switch (s) {
        case 'grass': grassTile(g, x, y, (ch === 't') ? 'verge' : 'verge'); break;
        case 'lawn': grassTile(g, x, y, 'lawn'); break;
        case 'pasture': grassTile(g, x, y, 'pasture'); break;
        case 'road': texTile(g, X.asphalt, x, y); break;
        case 'crossing': texTile(g, X.lane, x, y); break;
        case 'lane': laneTile(g, w, x, y); break;
        case 'pave': texTile(g, X.pave, x, y); break;
        case 'path': pathTile(g, w, x, y, joinPath); break;
        case 'setts': texTile(g, X.setts, x, y); break;
        case 'platform': texTile(g, st.live ? X.slabBig : X.platform, x, y); break;
        case 'hard': texTile(g, X.gravel, x, y); break;
        case 'carpark': texTile(g, y < 20 ? X.gravel : X.tarmacD, x, y); break;
        case 'yard': if (y < 60) texTile(g, X.asphalt, x, y); else farmyard(g, w, x, y); break;
        case 'apron': texTile(g, X.concrete, x, y); break;
        case 'cess': case 'cessFence': texTile(g, st.live ? X.cessNew : X.cessOld, x, y); break;
        case 'track': case 'bridge': texTile(g, st.live ? X.cessNew : X.cessOld, x, y); break;
        case 'main': texTile(g, X.ballastLive, x, y); break;
        case 'water': grassTile(g, x, y, 'verge'); break;
        case 'mat': matBase(g, w, x, y); break;
        default: grassTile(g, x, y, 'verge');
      }
      if (ch === 't' && isForestMass(w, x, y)) texTile(g, X.forestFloor, x, y);
      if (!st.live && (s === 'cess' || s === 'cessFence') && ch !== 'z') weeds(g, x, y, noise2(x / 3.5, y / 3.5, 17) - (y === 19 || y === 22 ? 0.25 : 0));
    }
  }
  // closed railway land: grass and weeds creeping over the cinders in patches
  const WEEDS = {};
  function weeds(g, x, y, n) {
    const d = Math.max(0, (n - 0.42) * 2.2);
    if (d <= 0.25) return;
    const lvl = Math.min(3, Math.floor(d * 3)), v = Math.floor(hash(x, y, 24) * 4), key = lvl + '_' + v;
    let c = WEEDS[key];
    if (!c) {
      c = cv(T, T); const wg = G(c), dd = (lvl + 1) / 3;
      for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < T; xx++) {
        const h = hash(xx + v * 16, yy, 23), m = noise2((xx + v * 16) / 5, yy / 5, 29);
        if (m * dd > 0.5) P(wg, xx, yy, h < 0.2 ? K.grassD : (h < 0.7 ? K.grass : K.g2));
        else if (m * dd > 0.36 && h < 0.3) P(wg, xx, yy, K.grassD);
      }
      WEEDS[key] = c;
    }
    g.drawImage(c, x * T, y * T);
  }
  function matBase(g, w, x, y) {
    const X = SPR.textures, s = w.surf(x, y + 1);
    // stone step / flag on whatever surrounds the mat
    const around = w.surf(x - 1, y) === 'mat' ? w.surf(x + 1, y) : w.surf(x - 1, y);
    if (around === 'lawn' || around === 'grass' || around === 'pasture') { grassTile(g, x, y, 'lawn'); const px = x * T, py = y * T; R(g, px + 2, py + 1, 12, 6, K.s2); R(g, px + 3, py + 1, 10, 5, K.s1); P(g, px + 3, py + 1, K.s0); R(g, px + 3, py + 8, 10, 6, K.s2); R(g, px + 4, py + 8, 8, 5, K.s1); P(g, px + 4, py + 8, K.s0); }
    else if (around === 'apron') texTile(g, X.concrete, x, y);
    else if (around === 'setts') texTile(g, X.setts, x, y);
    else if (around === 'hard') texTile(g, X.gravel, x, y);
    else if (around === 'yard') texTile(g, y < 60 ? X.asphalt : X.cobblesWarm, x, y);
    else if (around === 'cess') texTile(g, X.cessOld, x, y);
    else texTile(g, X.pave, x, y);
    void s;
  }
  const FARM = [];
  function farmyard(g, w, x, y) {
    const px = x * T, py = y * T;
    const nearB = w.isBld(x, y - 1) || w.at(x, y - 1) === 'm' || w.isBld(x, y - 2);
    if (nearB) { texTile(g, SPR.textures.cobblesWarm, x, y); return; }
    if (!FARM.length) for (let v = 0; v < 8; v++) {
      const c = cv(T, T), fg = G(c);
      for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < T; xx++) {
        const n = noise2((xx + v * 16) / 9, (yy + v * 5) / 7, 141), h = hash(xx + v * 16, yy, 142);
        let col = n > 0.62 ? K.br : (n < 0.3 ? K.woodL : K.tan);
        if (h < 0.05) col = K.brD; else if (h > 0.985) col = K.yelL; else if (h > 0.975) col = K.sand;
        P(fg, xx, yy, col);
      }
      FARM.push(c);
    }
    g.drawImage(FARM[Math.floor(hash(x, y, 140) * FARM.length)], px, py);
    if (hash(x, y, 143) < 0.12) { ell(g, px + 8, py + 9, 5, 2, K.brD); ell(g, px + 8, py + 9, 4, 1, K.bD); P(g, px + 6, py + 9, K.b); }
    if (hash(x, y, 144) < 0.25) for (let k = 0; k < 5; k++) { const sx = px + (hash(x, k, 145) * 14 | 0), sy = py + (hash(y, k, 146) * 14 | 0); P(g, sx, sy, K.yelL); P(g, sx + 1, sy + 1, K.yel); }
  }
  function laneTile(g, w, x, y) {
    const X = SPR.textures, px = x * T, py = y * T;
    let run = 1; for (let d = 1; w.at(x - d, y) === 'l'; d++) run++; for (let d = 1; w.at(x + d, y) === 'l'; d++) run++;
    let first = x; while (w.at(first - 1, y) === 'l') first--;
    if (run <= 2) { // farm track: two dirt ruts with a grass crown
      grassTile(g, x, y, 'verge');
      const lx = first * T;
      [lx + 3, lx + 20].forEach(rx => {
        for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < 9; xx++) {
          const gx = rx + xx; if (gx < px || gx >= px + T) continue;
          const hv = hash(gx, py + yy, 21);
          const col = (xx === 0 || xx === 8) ? (hv < 0.6 ? K.grassD : K.grass) : (xx === 1 || xx === 7 ? K.wood : (hv < 0.08 ? K.wood : (hv < 0.14 ? K.sand : K.woodL)));
          P(g, gx, py + yy, col);
        }
      });
      return;
    }
    texTile(g, X.lane, x, y);
    // ragged verges where the lane meets grass
    const soft = (dx) => { const s = w.surf(x + dx, y); return s === 'grass' || s === 'lawn' || s === 'pasture' || s === 'water'; };
    for (let yy = 0; yy < T; yy++) {
      if (soft(-1)) { const k = hash(x, py + yy, 31) < 0.5 ? 1 : (hash(x, py + yy, 32) < 0.3 ? 2 : 0); R(g, px, py + yy, k, 1, K.grass); P(g, px + k, py + yy, K.s3); }
      if (soft(1)) { const k = hash(x, py + yy, 33) < 0.5 ? 1 : (hash(x, py + yy, 34) < 0.3 ? 2 : 0); R(g, px + T - k, py + yy, k, 1, K.grass); P(g, px + T - 1 - k, py + yy, K.s3); }
    }
  }

  /* ================================================================== forest analysis */
  function isForestMass(w, x, y) {
    if (w.at(x, y) !== 't') return false;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && w.at(x + dx, y + dy) === 't') n++;
    return n >= 6;
  }

  /* ================================================================== water (the beck) */
  function beckSpans(w) {
    const sp = [];
    for (let y = 0; y < w.H; y++) {
      let a = -1, b = -1;
      for (let x = 0; x < w.W; x++) if (w.at(x, y) === 'w' || w.at(x, y) === 'o') { if (a < 0) a = x; b = x; }
      sp.push(a < 0 ? null : [a, b]);
    }
    // bridges: interpolate between the nearest rows with water
    for (let y = 0; y < w.H; y++) if (!sp[y]) {
      let u = y - 1; while (u >= 0 && !sp[u]) u--;
      let d = y + 1; while (d < w.H && !sp[d]) d++;
      const A = u >= 0 ? sp[u] : null, B = d < w.H ? sp[d] : null;
      if (A && B && d - u < 10) { const t = (y - u) / (d - u); sp[y] = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]; }
      else sp[y] = null;
    }
    return sp;
  }
  function beckEdge(sp, py, side) {
    const t = (py - 8) / T, y0 = Math.floor(t), u = t - y0;
    const e = (y) => { const s = sp[Math.max(0, Math.min(sp.length - 1, y))]; return s ? (side ? (s[1] + 1) * T : s[0] * T) : null; };
    const a = e(y0), b = e(y0 + 1);
    if (a == null && b == null) return null;
    const va = a == null ? b : a, vb = b == null ? a : b, k = u * u * (3 - 2 * u);
    return Math.round(va + (vb - va) * k + Math.sin(py / 9 + (side ? 2.1 : 0.4)) * 1.2 + Math.sin(py / 29 + side) * 1.4);
  }
  function drawWater(g, w, S) {
    const sp = beckSpans(w);
    S._beck = sp;
    const H = w.H * T;
    const hardAt = (px, py) => { const s = w.surf(px >> 4, py >> 4); return HARD[s] || s === 'path' || s === 'cess' || s === 'track'; };
    for (let py = 0; py < H; py++) {
      const L = beckEdge(sp, py, 0), Rr = beckEdge(sp, py, 1);
      if (L == null || Rr == null) continue;
      const deck = 'bn'.indexOf(w.at((L + Rr) >> 5, py >> 4)) >= 0;
      if (deck) continue;
      // banks
      if (!hardAt(L - 3, py)) { R(g, L - 4, py, 2, 1, K.g3); }
      R(g, L - 2, py, 2, 1, K.brD);
      R(g, Rr, py, 2, 1, K.brD);
      if (!hardAt(Rr + 3, py)) R(g, Rr + 2, py, 2, 1, K.g3);
      // water body with darker (deep) edges
      R(g, L, py, Rr - L, 1, K.b);
      R(g, L, py, 2, 1, K.bD); R(g, Rr - 2, py, 2, 1, K.bD);
      if (hash(0, py, 41) < 0.5) P(g, L + 2, py, K.bD);
      if (hash(1, py, 41) < 0.5) P(g, Rr - 3, py, K.bD);
    }
    // reeds + glint sites
    const glints = S.anim.glints;
    for (let y = 0; y < w.H; y++) {
      const s = sp[y]; if (!s) continue;
      const bridge = 'bqno'.indexOf(w.at(Math.round(s[0]), y)) >= 0 || 'bqno'.indexOf(w.at(Math.round(s[1]), y)) >= 0;
      if (bridge) continue;
      for (let k = 0; k < 2; k++) {
        const py = y * T + 3 + Math.floor(hash(y, k, 43) * 11);
        const L = beckEdge(sp, py, 0), Rr = beckEdge(sp, py, 1);
        if (L == null) continue;
        const gx = L + 4 + Math.floor(hash(y, k, 44) * Math.max(1, Rr - L - 10));
        glints.push({ x: gx, y: py, p: hash(y, k, 45) * 3, l: 2 + (hash(y, k, 46) < 0.5 ? 1 : 0) });
      }
      if (hash(y, 0, 47) < 0.22) reeds(g, beckEdge(sp, y * T + 8, 0) - 3, y * T + 8, -1);
      if (hash(y, 1, 47) < 0.22) reeds(g, beckEdge(sp, y * T + 8, 1) + 2, y * T + 8, 1);
    }
  }
  function reeds(g, x, y, dir) {
    for (let i = 0; i < 3; i++) {
      const xx = x + i * dir * 2, h = 5 + ((i * 7 + x) % 3);
      R(g, xx, y - h, 1, h, i === 1 ? K.g2 : K.g3);
      if (i === 1) { R(g, xx, y - h - 2, 1, 2, K.brD); }
    }
  }

  /* ================================================================== roads, pavements, kerbs, markings */
  const isRoadS = s => s === 'road' || s === 'crossing';
  const isSoftS = s => s === 'grass' || s === 'lawn' || s === 'pasture';
  function drawRoadEdges(g, w) {
    const X = SPR.textures;
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      const s = w.surf(x, y), px = x * T, py = y * T;
      if (s === 'pave') {
        const N = w.surf(x, y - 1), S = w.surf(x, y + 1), E = w.surf(x + 1, y), Wd = w.surf(x - 1, y);
        if (isRoadS(S)) { R(g, px, py + 12, T, 1, K.s0); R(g, px, py + 13, T, 2, K.s2); R(g, px, py + 15, T, 1, K.s3); }
        if (isRoadS(N)) { R(g, px, py, T, 1, K.s3); R(g, px, py + 1, T, 2, K.s0); }
        if (isRoadS(E)) { R(g, px + 13, py, 2, T, K.s0); R(g, px + 15, py, 1, T, K.s3); }
        if (isRoadS(Wd)) { R(g, px, py, 1, T, K.s3); R(g, px + 1, py, 2, T, K.s0); }
        // rounded inner kerb corners
        const corner = (cx, cy, sx, sy) => {
          for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) {
            const d = Math.hypot(7 - dx, 7 - dy);
            const X0 = cx + sx * dx, Y0 = cy + sy * dy;
            if (d > 7.2) g.drawImage(texAt(X.asphalt, x, y), (X0 - px) & 15, (Y0 - py) & 15, 1, 1, X0, Y0, 1, 1);
            else if (d > 5.6) P(g, X0, Y0, K.s0);
            else if (d > 4.6) P(g, X0, Y0, K.s2);
          }
        };
        if (isRoadS(N) && isRoadS(Wd) && isRoadS(w.surf(x - 1, y - 1))) corner(px, py, 1, 1);
        if (isRoadS(N) && isRoadS(E) && isRoadS(w.surf(x + 1, y - 1))) corner(px + 15, py, -1, 1);
        if (isRoadS(S) && isRoadS(Wd) && isRoadS(w.surf(x - 1, y + 1))) corner(px, py + 15, 1, -1);
        if (isRoadS(S) && isRoadS(E) && isRoadS(w.surf(x + 1, y + 1))) corner(px + 15, py + 15, -1, -1);
        // pavement -> grass: 1px dark green shadow on the grass side, slab lip on the south
        if (isSoftS(S) || S === 'mat') { R(g, px, py + 15, T, 1, K.s2); if (isSoftS(S)) R(g, px, py + 16, T, 1, K.grassD); }
        if (isSoftS(N)) R(g, px, py - 1, T, 1, K.grassD);
        if (isSoftS(E)) R(g, px + 16, py, 1, T, K.grassD);
        if (isSoftS(Wd)) R(g, px - 1, py, 1, T, K.grassD);
      } else if (s === 'road') {
        const N = w.surf(x, y - 1), S = w.surf(x, y + 1), E = w.surf(x + 1, y), Wd = w.surf(x - 1, y);
        const hardish = z => isRoadS(z) || z === 'pave' || z === 'lane' || z === 'setts' || z === 'carpark' || z === 'hard' || z === 'apron' || z === 'yard' || z === 'main';
        if (!hardish(S)) { R(g, px, py + 15, T, 1, K.s3); if (isSoftS(S)) R(g, px, py + 16, T, 1, K.grassD); }
        if (!hardish(N)) { R(g, px, py, T, 1, K.s3); }
        if (!hardish(E)) { R(g, px + 15, py, 1, T, K.s3); }
        if (!hardish(Wd)) { R(g, px, py, 1, T, K.s3); }
      } else if (s === 'setts' || s === 'hard' || s === 'apron' || s === 'carpark' || s === 'yard' || s === 'platform') {
        const S = w.surf(x, y + 1), N = w.surf(x, y - 1), E = w.surf(x + 1, y), Wd = w.surf(x - 1, y);
        if (isSoftS(S)) { R(g, px, py + 15, T, 1, K.s3); R(g, px, py + 16, T, 1, K.grassD); }
        if (isSoftS(N)) R(g, px, py, T, 1, K.s3);
        if (isSoftS(E)) R(g, px + 15, py, 1, T, K.s3);
        if (isSoftS(Wd)) R(g, px, py, 1, T, K.s3);
      }
    }
  }
  // centre lines, give-way, double yellows, school keep-clear, bus stop cage, car park bays
  function drawMarkings(g, w) {
    const roadAt = (x, y) => w.surf(x, y) === 'road';
    // E-W carriageways: columns whose vertical road run is 3..4 tiles
    for (let x = 0; x < w.W; x++) {
      let y = 0;
      while (y < w.H) {
        if (!roadAt(x, y)) { y++; continue; }
        let y1 = y; while (roadAt(x, y1 + 1)) y1++;
        const run = y1 - y + 1;
        if (run >= 3 && run <= 4) {
          const cy = Math.round((y + y1 + 1) * T / 2) - 1;
          for (let k = 0; k < T; k++) { const gx = x * T + k; if (gx % 16 < 8) P(g, gx, cy, K.wh), P(g, gx, cy + 1, K.s0); }
        }
        y = y1 + 1;
      }
    }
    for (let y = 0; y < w.H; y++) {
      let x = 0;
      while (x < w.W) {
        if (!roadAt(x, y)) { x++; continue; }
        let x1 = x; while (roadAt(x1 + 1, y)) x1++;
        const run = x1 - x + 1;
        if (run >= 3 && run <= 4) {
          // skip if this row is inside an E-W road (junction box)
          const ew = roadAt(x - 1, y) || roadAt(x1 + 1, y);
          if (!ew) {
            const cx = Math.round((x + x1 + 1) * T / 2) - 1;
            for (let k = 0; k < T; k++) { const gy = y * T + k; if (gy % 16 < 8) { P(g, cx, gy, K.wh); P(g, cx + 1, gy, K.s0); } }
          }
        }
        x = x1 + 1;
      }
    }
    // give-way lines where a N-S road meets an E-W one (row above/below is a wide road row)
    for (let y = 1; y < w.H - 1; y++) for (let x = 0; x < w.W; x++) {
      if (!roadAt(x, y)) continue;
      const wideBelow = roadAt(x - 3, y + 1) && roadAt(x + 3, y + 1) && !(roadAt(x - 3, y) && roadAt(x + 3, y));
      const wideAbove = roadAt(x - 3, y - 1) && roadAt(x + 3, y - 1) && !(roadAt(x - 3, y) && roadAt(x + 3, y));
      if (wideBelow) for (let k = 0; k < T; k += 4) { R(g, x * T + k, y * T + 11, 2, 1, K.wh); R(g, x * T + k, y * T + 14, 2, 1, K.wh); }
      if (wideAbove) for (let k = 0; k < T; k += 4) { R(g, x * T + k, y * T + 1, 2, 1, K.wh); R(g, x * T + k, y * T + 4, 2, 1, K.wh); }
    }
    const L = w.level;
    // double yellow lines along Station Road outside the station (south kerb)
    for (let x = 22; x <= 36; x++) if (roadAt(x, 37) && w.surf(x, 38) === 'pave') { R(g, x * T, 37 * T + 10, T, 1, K.yel); R(g, x * T, 37 * T + 12, T, 1, K.yel); }
    // SCHOOL KEEP CLEAR zig-zags on the main road outside the school gate
    const school = findBuilding(w, 'E');
    if (school) {
      const x0 = school.x0 * T, x1 = (school.x1 + 1) * T;
      let ry = -1; for (let y = school.y1; y < w.H; y++) if (roadAt(school.x0 + 3, y)) { ry = y; break; }
      if (ry > 0) {
        for (let px = x0; px < x1; px++) { const ph = (px - x0) % 8, yy = ry * T + 2 + (ph < 4 ? ph : 8 - ph); P(g, px, yy, K.yel); }
        textC(g, 'SCHOOL KEEP CLEAR', (x0 + x1) / 2, ry * T + 8, K.yel);
      }
    }
    // playground markings: hopscotch + a painted circle
    if (school) {
      const yy = (school.y1 + 1) * T + 4, xx = (school.x0 + 1) * T + 4;
      if (w.surf(school.x0 + 1, school.y1 + 1) === 'yard') {
        const cells = [[0, 0], [9, 0], [18, -4], [18, 4], [27, 0], [36, -4], [36, 4], [45, 0]];
        cells.forEach(([dx, dy], i) => { const cx = xx + dx, cy = yy + 6 + dy; R(g, cx, cy - 4, 9, 1, K.yel); R(g, cx, cy + 4, 9, 1, K.yel); R(g, cx, cy - 4, 1, 9, K.yel); R(g, cx + 8, cy - 4, 1, 9, K.yel); text(g, String(i + 1), cx + 3, cy - 2, K.wh); });
        const ccx = (school.x1 - 1) * T, ccy = yy + 8;
        for (let a = 0; a < 40; a++) { const an = a / 40 * Math.PI * 2; P(g, Math.round(ccx + Math.cos(an) * 11), Math.round(ccy + Math.sin(an) * 7), K.wh); }
      }
    }
    // bus stop cage on the carriageway beside the stop
    const bs = (L.outside || []).find(o => o.id === 'busstop');
    if (bs) {
      const [bx, by] = bs.tile; let ry = -1;
      for (let y = by; y > by - 4; y--) if (roadAt(bx, y)) { ry = y; break; }
      if (ry > 0) {
        const x0 = (bx - 2) * T, x1 = (bx + (bs.size ? bs.size[0] : 1) + 2) * T, yy = ry * T + 2;
        for (let px = x0; px < x1; px += 4) { R(g, px, yy, 2, 1, K.yel); R(g, px, yy + 12, 2, 1, K.yel); }
        R(g, x0, yy, 1, 13, K.yel); R(g, x1 - 1, yy, 1, 13, K.yel);
        textC(g, 'BUS STOP', (x0 + x1) / 2, yy + 4, K.yel);
      }
    }
    // car park bays: lines at tile boundaries on the long side of each car park block
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      if (w.surf(x, y) !== 'carpark' || y < 20) continue;
      const Wd = w.surf(x - 1, y) === 'carpark', E = w.surf(x + 1, y) === 'carpark';
      const N = w.surf(x, y - 1) === 'carpark', S = w.surf(x, y + 1) === 'carpark';
      // tall car park (N-S): bays along W and E edges, lines horizontal
      let cw = 1; for (let d = 1; w.surf(x - d, y) === 'carpark'; d++) cw++; for (let d = 1; w.surf(x + d, y) === 'carpark'; d++) cw++;
      let ch = 1; for (let d = 1; w.surf(x, y - d) === 'carpark'; d++) ch++; for (let d = 1; w.surf(x, y + d) === 'carpark'; d++) ch++;
      if (ch > cw) {
        let xi = 0; while (w.surf(x - xi - 1, y) === 'carpark') xi++;
        if ((xi <= 1 || xi >= cw - 2) && N) R(g, x * T + (xi === 0 || xi === cw - 1 ? 2 : 0), y * T, xi === 0 || xi === cw - 1 ? 14 : T, 1, K.s0);
      } else {
        let yi = 0; while (w.surf(x, y - yi - 1) === 'carpark') yi++;
        if (Wd) R(g, x * T, y * T + (yi === 0 ? 2 : 0), 1, yi === 0 ? 14 : T, K.s0);
      }
      void E; void S;
    }
  }
  function findBuilding(w, letter) {
    const B = w.buildings || [];
    return B.find(b => b.letter === letter);
  }

  /* ================================================================== railway */
  function railKind(kind) {
    const X = SPR.textures;
    if (kind === 'old') return { ballast: X.ballastOld, sl: K.brD, slHi: K.br, slLo: K.out, rail: K.br, head: K.tan, old: true };
    if (kind === 'new') return { ballast: X.ballastNew, sl: K.s1, slHi: K.s0, slLo: K.s3, rail: K.s1, head: K.wh, glint: K.wh };
    return { ballast: X.ballastLive, sl: K.s1, slHi: K.s0, slLo: K.s3, rail: K.s1, head: K.s0, glint: K.wh };
  }
  function fillTex(g, arr, x, y, w, h, seed) { // texture fill of an arbitrary px rect (tile-aligned sampling)
    for (let ty = Math.floor(y / T); ty * T < y + h; ty++) for (let tx = Math.floor(x / T); tx * T < x + w; tx++) {
      const sx = Math.max(x, tx * T), sy = Math.max(y, ty * T), ex = Math.min(x + w, tx * T + T), ey = Math.min(y + h, ty * T + T);
      if (ex > sx && ey > sy) g.drawImage(texAt(arr, tx, ty, seed), sx - tx * T, sy - ty * T, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
    }
  }
  function trackH(g, x0, x1, y, st, opt) {
    opt = opt || {};
    const w = x1 - x0;
    if (!opt.noBallast) {
      fillTex(g, st.ballast, x0, y + 1, w, 30, 5);
      R(g, x0, y, w, 1, K.s3); R(g, x0, y + 31, w, 1, K.s3);
    }
    for (let sx = x0 + 2; sx < x1 - 2; sx += 8) {
      const r = hash(sx, y, 51), rot = st.old && (r < 0.16 || (opt.rotten && sx >= opt.rotten[0] && sx < opt.rotten[1] && r < 0.75));
      if (st.old && r > 0.975 && !opt.rotten) continue;
      if (rot) {
        R(g, sx, y + 5, 4, 22, K.out); R(g, sx, y + 5, 4, 1, K.brD);
        R(g, sx + 1, y + 8 + (r * 6 | 0), 1, 9, K.s4); if (r < 0.08) R(g, sx, y + 22, 4, 5, texColour(st));
        P(g, sx + 3, y + 12, K.g2);
      } else {
        R(g, sx, y + 5, 4, 22, st.sl); R(g, sx, y + 5, 4, 1, st.slHi); R(g, sx, y + 26, 4, 1, st.slLo);
        if (!st.old) { P(g, sx, y + 8, K.s3); P(g, sx + 3, y + 8, K.s3); P(g, sx, y + 20, K.s3); P(g, sx + 3, y + 20, K.s3); }
      }
      if (st.old && hash(sx, y, 52) < 0.34) { // weeds in the cribs
        const wx = sx + 5, wy = y + 6 + Math.floor(hash(sx, y, 53) * 18);
        P(g, wx, wy, K.g2); P(g, wx + 1, wy - 1, K.g1); P(g, wx + 1, wy, K.g3); if (hash(sx, y, 54) < 0.4) P(g, wx - 1, wy - 1, K.g2);
      }
    }
    for (const ry of [y + 9, y + 21]) {
      R(g, x0, ry + 2, w, 1, K.s4); R(g, x0, ry, w, 2, st.rail); R(g, x0, ry, w, 1, st.head);
      if (st.glint) for (let gx = x0 + 5; gx < x1; gx += 23) P(g, gx, ry, st.glint);
    }
  }
  function texColour(st) { return st.old ? K.s2 : K.s1; }
  function trackV(g, x, y0, y1, st) {
    const h = y1 - y0;
    fillTex(g, st.ballast, x + 1, y0, 30, h, 6);
    R(g, x, y0, 1, h, K.s3); R(g, x + 31, y0, 1, h, K.s3);
    for (let sy = y0 + 1; sy < y1 - 2; sy += 6) { R(g, x + 5, sy, 22, 3, st.sl); R(g, x + 5, sy, 22, 1, st.slHi); R(g, x + 5, sy + 2, 22, 1, st.slLo); }
    for (const rx of [x + 9, x + 21]) {
      R(g, rx, y0, 2, h, st.rail); R(g, rx, y0, 1, h, st.head); R(g, rx + 2, y0, 1, h, K.s4);
      if (st.glint) for (let gy = y0 + 7; gy < y1; gy += 29) P(g, rx, gy, st.glint);
    }
  }
  // cubic bezier sampled by arc length
  function bez(p0, p1, p2, p3) {
    const pts = []; let L = 0, prev = null;
    for (let i = 0; i <= 400; i++) {
      const t = i / 400, u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      if (prev) L += Math.hypot(x - prev[0], y - prev[1]);
      pts.push([x, y, L]); prev = [x, y];
    }
    const at = (s) => {
      let i = 1; while (i < pts.length - 1 && pts[i][2] < s) i++;
      const a = pts[i - 1], b = pts[i], k = (s - a[2]) / Math.max(1e-6, b[2] - a[2]);
      const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k;
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      return { x, y, tx: dx / d, ty: dy / d };
    };
    return { len: L, at };
  }
  function curveBallast(g, c, st) {
    const xs = [], ys = [];
    for (let s = 0; s <= c.len; s += 4) { const p = c.at(s); xs.push(p.x); ys.push(p.y); }
    const bx = Math.floor(Math.min(...xs) - 18), by = Math.floor(Math.min(...ys) - 18);
    const bw = Math.ceil(Math.max(...xs) + 18) - bx, bh = Math.ceil(Math.max(...ys) + 18) - by;
    const m = cv(bw, bh), mg = G(m);
    mg.fillStyle = '#000';
    for (let s = 0; s <= c.len; s += 2) {
      const p = c.at(s);
      for (let dy = -15; dy <= 15; dy++) { const hw = Math.floor(Math.sqrt(225 - dy * dy)); mg.fillRect(Math.round(p.x - bx - hw), Math.round(p.y - by + dy), hw * 2, 1); }
    }
    mg.globalCompositeOperation = 'source-in';
    fillTex(mg, st.ballast, 0, 0, bw, bh, 7);
    mg.globalCompositeOperation = 'source-over';
    g.drawImage(m, bx, by);
  }
  function plotSeg(g, p, u0, u1, v0, v1, col) { // rotated rect, crisp pixels
    for (let u = u0; u <= u1; u += 0.5) for (let v = v0; v <= v1; v += 0.5) {
      P(g, Math.round(p.x - p.ty * u + p.tx * v), Math.round(p.y + p.tx * u + p.ty * v), col);
    }
  }
  function curveTrack(g, c, stAt, skip) {
    for (let s = 3; s < c.len - 1; s += 8) {
      const p = c.at(s), st = stAt(p);
      if (skip && skip(p)) continue;
      plotSeg(g, p, -11, 11, -1.5, 1.5, st.sl);
      plotSeg(g, p, -11, 11, -1.5, -1.5, st.slHi);
    }
    for (const off of [-6, 6]) {
      for (let s = 0; s <= c.len; s += 0.6) { const p = c.at(s); P(g, Math.round(p.x - p.ty * off), Math.round(p.y + p.tx * off) + 2, K.s4); }
      for (let s = 0; s <= c.len; s += 0.6) {
        const p = c.at(s), st = stAt(p), x = Math.round(p.x - p.ty * off), y = Math.round(p.y + p.tx * off);
        R(g, x, y, 2, 2, st.rail); P(g, x, y, st.head);
      }
    }
  }

  function drawRailway(g, w, S, st) {
    const branch = railKind(st.live ? 'new' : 'old'), live = railKind('live');
    const X = SPR.textures;
    // locate features from the map
    let ty = 20; for (let y = 0; y < w.H; y++) if (w.rows[y].indexOf('=') >= 0) { ty = y; break; } // branch running line (2 rows)
    let bx0 = 0; while (bx0 < w.W && w.at(bx0, ty) !== '$' && w.at(bx0, ty) !== '=') bx0++;
    let mainX = -1; for (let x = 0; x < w.W; x++) if (w.at(x, 0) === '|') { mainX = x; break; }
    const cross = []; for (let x = 0; x < w.W; x++) if (w.at(x, ty) === 'x') cross.push(x);
    const cx0 = cross.length ? cross[0] : -1, cx1 = cross.length ? cross[cross.length - 1] : -1;
    let jx0 = w.W; for (let x = 0; x < w.W; x++) if (w.at(x, ty) === 'j') { jx0 = x; break; }
    if (jx0 === w.W) jx0 = mainX > 0 ? mainX - 2 : w.W - 8;
    // depot siding: '/' rows next to the shed + the turnout columns between it and the running line
    let sidRow = -1, tx0 = w.W, tx1 = -1, depotE = -1;
    for (let y = ty + 2; y < w.H && sidRow < 0; y++) for (let x = 1; x < w.W; x++) if (w.at(x, y) === '/' && w.at(x - 1, y) === 'N') { sidRow = y; depotE = x; break; }
    if (sidRow > 0) for (let y = ty + 2; y < sidRow; y++) for (let x = 0; x < w.W; x++) if (w.at(x, y) === '/') { tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); }
    const S0 = w.level.outside || [], def = id => { const o = S0.find(e => e.id === id); return o ? o.tile : null; };
    const branchC = ty * T + 16, sidC = (sidRow + 1) * T;
    const sid = sidRow > 0 && tx1 >= 0 ? bez([(tx1 + 4) * T, branchC], [tx1 * T, branchC], [(tx0 + 1) * T, sidC], [(tx0 - 3) * T, sidC]) : null;
    const jEnd = mainX >= 0 ? mainX * T + 16 : 120 * T;
    const junc = bez([(jx0 - 5) * T, branchC], [(jx0 - 0.2) * T, branchC], [jEnd, (ty + 1.8) * T], [jEnd, (ty + 6) * T]);
    S._rail = { ty, jx0, mainX, cx0, cx1 };
    if (sid) curveBallast(g, sid, branch);
    curveBallast(g, junc, live);
    // main line: two tracks, full height except under the road bridge (deck drawn as an object)
    if (mainX >= 0) {
      for (let k = 0; k < 2; k++) {
        const x = (mainX + k * 2) * T;
        let y = 0;
        while (y < w.H) {
          if (w.at(mainX + k * 2, y) === '%') { y++; continue; }
          let y1 = y; while (y1 + 1 < w.H && w.at(mainX + k * 2, y1 + 1) !== '%') y1++;
          trackV(g, x, y * T, (y1 + 1) * T, live);
          y = y1 + 1;
        }
      }
      R(g, mainX * T + 31, 0, 2, w.H * T, K.s3); // six-foot line between the tracks
    }
    // branch running line
    const ds = def('d_sleepers'), rot = ds ? [(ds[0] - 1) * T, (ds[0] + 3) * T] : null;
    if (cx0 >= 0) { trackH(g, bx0 * T, cx0 * T, ty * T, branch, { rotten: st.live ? null : rot }); trackH(g, (cx1 + 1) * T, (jx0 - 4) * T, ty * T, branch); }
    else trackH(g, bx0 * T, (jx0 - 4) * T, ty * T, branch, { rotten: st.live ? null : rot });
    // siding into the depot + the turnout
    if (sid) { trackH(g, depotE * T, (tx0 - 3) * T + 4, sidRow * T, branch); curveTrack(g, sid, () => branch, p => p.y < ty * T + 27 && p.x > (tx1 + 1) * T); }
    // junction onto the main line (live beyond the limit of closed line)
    curveTrack(g, junc, p => (p.x < (jx0 - 1) * T ? branch : live));
    // crossing deck: rails inset as head lines only, concrete panels, flangeways
    if (cx0 >= 0) {
      const X0 = cx0 * T, W0 = (cx1 - cx0 + 1) * T, Y = ty * T;
      R(g, X0, Y + 4, W0, 24, K.s1);
      for (let px = X0; px < X0 + W0; px += 8) R(g, px, Y + 4, 1, 24, K.s2);
      R(g, X0, Y + 4, W0, 1, K.s0); R(g, X0, Y + 27, W0, 1, K.s2);
      for (const ry of [Y + 9, Y + 21]) { R(g, X0, ry - 1, W0, 1, K.s4); R(g, X0, ry, W0, 1, st.live ? K.s0 : K.tan); R(g, X0, ry + 1, W0, 1, K.s2); R(g, X0, ry + 2, W0, 1, K.s4); }
      // stop lines one tile before each side of the deck
      let ny = ty; while (w.at(cx0, ny - 1) === 'x') ny--;
      let sy = ty; while (w.at(cx0, sy + 1) === 'x') sy++;
      R(g, X0, (ny - 1) * T + 10, W0, 2, K.wh); R(g, X0, (sy + 1) * T + 4, W0, 2, K.wh);
    }
    // platform coping + tactile strip + yellow line, retaining face where the platform meets lower ground
    for (let x = 0; x < w.W; x++) {
      if (w.at(x, 22) === '^') {
        const px = x * T, py = 22 * T;
        texTile(g, st.live ? X.slabBig : X.platform, x, 22);
        R(g, px, py, T, 1, K.s4); R(g, px, py + 1, T, 4, K.s0); R(g, px, py + 5, T, 1, K.s1);
        for (let k = 0; k < T; k += 8) R(g, px + k, py + 1, 1, 4, K.s1);
        R(g, px, py + 6, T, 3, st.live ? K.sand : K.tan);
        for (let k = 1; k < T; k += 2) P(g, px + k, py + 7, st.live ? K.tan : K.br);
        R(g, px, py + 11, T, 2, st.live ? K.yel : K.or0);
        if (!st.live && hash(x, 22, 61) < 0.3) { P(g, px + 5, py + 5, K.g2); P(g, px + 6, py + 4, K.g1); }
      }
      if (w.at(x, 24) === 'e') {
        const s = w.at(x, 25);
        if (s !== 'e' && !w.isBld(x, 25)) { const py = 25 * T; R(g, x * T, py - 3, T, 3, K.rd0); for (let k = 0; k < T; k += 4) P(g, x * T + k, py - 2, K.brD); R(g, x * T, py, T, 1, K.s4); }
      }
      if (!st.live && w.at(x, 23) === 'e' && hash(x, 23, 62) < 0.25) { const px = x * T + 3 + (hash(x, 23, 63) * 9 | 0), py = 23 * T + 2 + (hash(x, 23, 64) * 20 | 0); P(g, px, py, K.g2); P(g, px + 1, py - 1, K.g1); P(g, px - 1, py - 1, K.g2); }
    }
    // anti-trespass guards: rubber pyramids panels on the cess + four-foot either side of the crossing
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (w.at(x, y) === 'z') {
      const px = x * T, py = y * T;
      R(g, px + 1, py + 1, 14, 14, K.s3);
      for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) { const ax = px + 2 + k * 3 + (j % 2), ay = py + 2 + j * 3; P(g, ax + 1, ay, K.s1); P(g, ax, ay + 1, K.s2); P(g, ax + 2, ay + 1, K.s4); }
      R(g, px + 1, py + 15, 14, 1, K.s4);
      const bY = ty * T;
      if (y === 20 || y === 21) for (const ry of [bY + 9, bY + 21]) if (ry >= py && ry < py + T) { R(g, px, ry + 2, T, 1, K.s4); R(g, px, ry, T, 2, branch.rail); R(g, px, ry, T, 1, branch.head); }
    }
    // defects (closed line only): rotten-sleeper patch is in trackH; drain, vegetation, trolley
    if (!st.live) {
      // blocked catchpit at the west abutment of Beck Bridge
      const dd = def('d_drain') || [83, 22], cpx = dd[0] * T + 2, cpy = dd[1] * T + 3;
      R(g, cpx, cpy, 12, 10, K.s0); R(g, cpx + 1, cpy + 1, 10, 8, K.s2); R(g, cpx + 2, cpy + 2, 8, 6, K.bD);
      R(g, cpx + 2, cpy + 5, 8, 3, K.br); P(g, cpx + 4, cpy + 3, K.b); R(g, cpx, cpy + 10, 12, 1, K.s4);
      // the drain has backed up: standing water on the cess (a duck has moved in)
      const pdx = cpx - 12, pdy = cpy + 8;
      ell(g, pdx, pdy, 10, 3, K.brD); ell(g, pdx, pdy, 9, 2, K.bD); ell(g, pdx - 1, pdy - 1, 6, 1, K.b); P(g, pdx - 4, pdy - 1, K.bL); P(g, pdx + 3, pdy, K.bL);
      R(g, cpx - 3, cpy + 9, 4, 2, K.bD);
      S.anim.ripples.push({ x: pdx, y: pdy + 1, p: 0.3 });
      S._duck = { x: pdx, y: pdy + 3 };
      // buddleia + sycamore sapling + an abandoned shopping trolley on the track in the cutting
      const dv = def('d_veg') || [97, 20];
      buddleia(g, (dv[0] - 1) * T + 2, (dv[1] + 1) * T + 10); sapling(g, (dv[0] + 1) * T + 9, (dv[1] + 1) * T + 12); trolley(g, dv[0] * T + 1, dv[1] * T + 8);
    }
    S._curves = { sid, junc };
  }
  function buddleia(g, x, y) {
    R(g, x + 3, y - 4, 2, 5, K.g3);
    ell(g, x + 4, y - 7, 5, 4, K.g2); ell(g, x + 3, y - 8, 3, 2, K.g1);
    [[1, -12], [6, -11], [8, -8], [0, -8]].forEach(([dx, dy]) => { R(g, x + dx, y + dy, 2, 3, K.plum); P(g, x + dx, y + dy, K.mag); });
    R(g, x, y, 9, 1, K.s4);
  }
  function sapling(g, x, y) {
    R(g, x, y - 7, 1, 8, K.brD);
    ell(g, x, y - 10, 4, 3, K.g2); P(g, x - 2, y - 11, K.g1); P(g, x + 1, y - 12, K.g1); R(g, x - 3, y, 7, 1, K.s4);
  }
  function trolley(g, x, y) {
    R(g, x, y, 12, 1, K.s0); R(g, x, y + 6, 12, 1, K.s1); R(g, x, y, 1, 7, K.s0); R(g, x + 11, y, 1, 7, K.s1);
    for (let k = 2; k < 11; k += 2) R(g, x + k, y + 1, 1, 5, K.s1);
    R(g, x + 11, y - 3, 1, 3, K.s0); R(g, x + 11, y - 3, 4, 1, K.red);
    P(g, x + 1, y + 8, K.s4); P(g, x + 10, y + 8, K.s4); R(g, x, y + 9, 12, 1, 'rgba(38,43,68,0.35)');
  }

  /* ------------------------------------------------------------------ bridges (drawn into the ground) */
  function drawBridges(g, w, S, st) {
    // group 'q' rows into bridges: a bridge is a run of q on row A (north) and row B (south) over the beck
    const runs = [];
    for (let y = 0; y < w.H; y++) {
      let x = 0;
      while (x < w.W) {
        if (w.at(x, y) !== 'q') { x++; continue; }
        let x1 = x; while (w.at(x1 + 1, y) === 'q') x1++;
        runs.push({ y, x0: x, x1 }); x = x1 + 1;
      }
    }
    const used = new Set();
    runs.forEach((a, i) => {
      if (used.has(i)) return;
      const bi = runs.findIndex((b, j) => j > i && !used.has(j) && b.x0 === a.x0 && b.x1 === a.x1 && b.y > a.y && b.y - a.y <= 7);
      if (bi < 0) return;
      used.add(i); used.add(bi);
      const b = runs[bi];
      const kind = w.at(a.x0, a.y + 1) === 'b' ? 'rail' : (b.y - a.y <= 2 ? 'packhorse' : 'road');
      bridge(g, w, S, st, a.x0, a.x1, a.y, b.y, kind);
    });
  }
  function bridge(g, w, S, st, x0, x1, yN, yS, kind) {
    const X0 = x0 * T, X1 = (x1 + 1) * T, Wd = X1 - X0;
    const hump = kind === 'packhorse';
    // deck surface between parapets
    if (kind === 'road') { /* road + pavement already drawn */ }
    if (kind === 'packhorse') { for (let x = x0; x <= x1; x++) texTile(g, SPR.textures.cobblesWarm, x, yN + 1); }
    const humpY = (px) => hump ? -Math.round(3 * Math.sin(Math.PI * (px - X0) / Wd)) : 0;
    // north parapet: coping top + inner face
    for (let px = X0; px < X1; px++) {
      const h = humpY(px), yb = (yN + 1) * T;
      R(g, px, yb - 7 + h, 1, 3, K.s1); P(g, px, yb - 7 + h, K.s0); R(g, px, yb - 4 + h, 1, 4 - h, K.s2); P(g, px, yb - 1, K.s3);
      if (px % 8 === 0) P(g, px, yb - 6 + h, K.s2);
    }
    // south parapet: coping top, then the south elevation (visible) with arches
    const top = yS * T + (kind === 'rail' ? 0 : 2);
    const faceH = kind === 'rail' ? 26 : (kind === 'road' ? 20 : 14);
    for (let px = X0; px < X1; px++) {
      const h = humpY(px);
      R(g, px, top + h, 1, 3, K.s0); P(g, px, top + 3 + h, K.s1); R(g, px, top + 4 + h, 1, 2, K.s1);
      R(g, px, top + 6 + h, 1, faceH - 6 - h, K.s2);
      if (px % 8 === 0) R(g, px, top + h, 1, 3, K.s1);
    }
    R(g, X0, top + 6, Wd, 1, K.s3); // string course shadow
    // stone coursing on the face
    for (let yy = top + 8; yy < top + faceH; yy += 4) for (let px = X0 + ((yy >> 2) % 2) * 3; px < X1; px += 7) P(g, px, yy, K.s3);
    // arches: rail = 3, road = 3 small, packhorse = 1 segmental
    const nA = hump ? 1 : 3, pier = hump ? 0 : 9;
    const span = Math.floor((Wd - 8 - pier * (nA - 1)) / nA);
    const water = S._beck;
    for (let i = 0; i < nA; i++) {
      const ax = X0 + 4 + i * (span + pier), rad = span / 2, cx = ax + rad;
      const spring = top + faceH, rise = hump ? 11 : Math.min(rad, faceH - 8);
      for (let px = ax; px < ax + span; px++) {
        const d = (px + 0.5 - cx) / rad, hh = Math.round(rise * Math.sqrt(Math.max(0, 1 - d * d)));
        if (hh <= 0) continue;
        R(g, px, spring - hh, 1, hh, K.s4);
        P(g, px, spring - hh - 1, K.s0); // voussoir highlight
        if ((px - ax) % 4 === 0) P(g, px, spring - hh - 2, K.s1);
      }
      // water glimpsed under the arch
      R(g, ax + 2, spring - 3, span - 4, 1, K.bD);
    }
    // cutwaters at the piers + shadow on the water to the south
    for (let i = 1; i < nA; i++) {
      const pxc = X0 + 4 + i * (span + pier) - Math.ceil(pier / 2), sy = top + faceH;
      for (let k = 0; k < 4; k++) R(g, pxc - 4 + k, sy + k, 9 - 2 * k, 1, k === 0 ? K.s1 : K.s2);
      S.anim.ripples.push({ x: pxc, y: sy + 5, p: i * 0.7 });
    }
    const sh = top + faceH;
    for (let yy = sh; yy < sh + 6; yy++) {
      const L = water ? beckEdge(water, yy, 0) : X0, Rr = water ? beckEdge(water, yy, 1) : X1;
      if (L == null) continue;
      g.fillStyle = 'rgba(18,78,137,' + (0.55 - (yy - sh) * 0.08) + ')';
      g.fillRect(Math.max(L, X0), yy, Math.min(Rr, X1) - Math.max(L, X0), 1);
    }
    R(g, X0, sh, Wd, 1, K.s4);
    // defect: loose parapet stone mid-span on Beck Bridge (closed line)
    if (kind === 'rail' && !st.live) {
      const mx = X0 + Math.floor(Wd / 2) + 2;
      R(g, mx, top, 6, 3, K.s1); R(g, mx + 1, top - 1, 5, 1, K.s0); R(g, mx + 6, top + 1, 1, 2, K.s4);
      P(g, mx - 3, top + 8, K.s4); P(g, mx - 2, top + 9, K.s4); P(g, mx - 2, top + 10, K.s4); P(g, mx - 1, top + 11, K.s4);
      P(g, mx + 9, top + 12, K.g2); P(g, mx + 10, top + 11, K.g1);
    }
  }

  /* ================================================================== hedges, walls, fences, beds, rocks */
  function drawBoundaries(g, w, S, st) {
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      const ch = w.at(x, y);
      if (ch === 'h') hedgeTile(g, w, x, y);
      else if (ch === '#') { if (!isMemorial(w, x, y)) wallTile(g, w, x, y); }
      else if (ch === 'f') fenceTile(g, w, x, y, S);
      else if (ch === 'k') herasTile(g, w, x, y);
      else if (ch === 'v') bedTile(g, w, x, y);
      else if (ch === '+') graveTile(g, w, x, y);
      else if (ch === 'o') stoneTile(g, w, x, y, S);
    }
    // crag rocks, north to south so southern boulders overlap
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (w.at(x, y) === '&') rockTile(g, w, x, y);
  }
  function isMemorial(w, x, y) {
    const n = ['#'].indexOf(w.at(x - 1, y)) + ['#'].indexOf(w.at(x + 1, y)) + ['#'].indexOf(w.at(x, y - 1)) + ['#'].indexOf(w.at(x, y + 1));
    return n === -4; // isolated '#': the war memorial (drawn as an object)
  }
  function leafy(g, x0, y0, w0, h0, seed, base, hi, dk) {
    for (let y = y0; y < y0 + h0; y++) for (let x = x0; x < x0 + w0; x++) {
      const r = hash(x, y, seed), cl = hash(x >> 2, y >> 2, seed + 1);
      P(g, x, y, r < 0.12 ? dk : ((cl < 0.5 && ((x + y) & 3) === 0) || r > 0.9 ? hi : base));
    }
  }
  const HEDGE = {};
  function hedgeTile(g, w, x, y) {
    const Hh = (dx, dy) => w.at(x + dx, y + dy) === 'h';
    const l = Hh(-1, 0) ? 0 : 1, r = Hh(1, 0) ? 0 : 1, t = Hh(0, -1) ? 0 : 3, south = !Hh(0, 1);
    const v = Math.floor(hash(x, y, 70) * 4), key = l + '' + r + t + (south ? 1 : 0) + v;
    let c = HEDGE[key];
    if (!c) {
      c = cv(T, T + 2); const hg = G(c);
      const faceH = south ? 5 : 0, topH = T - t - faceH, o = v * 37;
      leafy(hg, l, t, T - l - r, topH, 71 + v, K.g2, K.g1, K.g3);
      if (south) {
        for (let xx = l; xx < T - r; xx++) {
          const k = hash(xx + o, 3, 72);
          R(hg, xx, T - faceH, 1, faceH, K.g3);
          if (k < 0.35) P(hg, xx, T - faceH, K.g2);
          if (k > 0.8) P(hg, xx, T - faceH + 2, K.g4);
        }
        R(hg, l, T - 1, T - l - r, 1, K.g4);
        hg.fillStyle = SHADOW; hg.fillRect(l + 1, T, T - l - r, 2);
      }
      if (t) R(hg, l + (l ? 1 : 0), t, T - l - r - (l ? 1 : 0) - (r ? 1 : 0), 1, K.g4);
      if (l) R(hg, 0, t + 1, 1, T - t - 1 - (south ? 1 : 0), K.g4);
      if (r) R(hg, T - 1, t + 1, 1, T - t - 1 - (south ? 1 : 0), K.g4);
      HEDGE[key] = c;
    }
    g.drawImage(c, x * T, y * T);
  }
  function wallTile(g, w, x, y) {
    const Wl = (dx, dy) => { const c = w.at(x + dx, y + dy); return c === '#' && !isMemorial(w, x + dx, y + dy); };
    const px = x * T, py = y * T;
    const horiz = Wl(-1, 0) || Wl(1, 0) || !(Wl(0, -1) || Wl(0, 1));
    const vert = Wl(0, -1) || Wl(0, 1);
    const tops = [];
    if (horiz) tops.push([Wl(-1, 0) ? 0 : 2, 5, (Wl(1, 0) ? T : 14) - (Wl(-1, 0) ? 0 : 2), 5]);
    if (vert) tops.push([4, Wl(0, -1) ? 0 : 3, 8, (Wl(0, 1) ? T : 10) - (Wl(0, -1) ? 0 : 3)]);
    // faces first (south faces under each top that ends)
    tops.forEach(([tx, ty, tw, th]) => {
      const bottom = ty + th;
      if (bottom < T || !Wl(0, 1)) {
        const fh = Math.min(6, T - bottom + 2);
        for (let yy = 0; yy < fh; yy++) for (let xx = 0; xx < tw; xx++) {
          const gx = px + tx + xx, gy = py + bottom + yy, r = hash(gx >> 1, (gy + (gx >> 2)) >> 1, 73);
          P(g, gx, gy, (hash(gx, gy, 74) < 0.16) ? K.s3 : (r < 0.4 ? K.s2 : (r < 0.8 ? K.s1 : K.s0)));
        }
        R(g, px + tx, py + bottom + fh - 1, tw, 1, K.s3);
        g.fillStyle = SHADOW; g.fillRect(px + tx + 1, py + bottom + fh, tw, 1);
      }
    });
    tops.forEach(([tx, ty, tw, th]) => {
      R(g, px + tx, py + ty, tw, th, K.s1);
      if (tw > th) { for (let xx = 0; xx < tw; xx += 2) { R(g, px + tx + xx, py + ty, 1, th, K.s0); P(g, px + tx + xx + 1, py + ty + th - 1, K.s2); } R(g, px + tx, py + ty + th - 1, tw, 1, K.s2); }
      else { // N-S wall seen from above: irregular through-stones with capstones along the crest
        for (let yy = 0; yy < th; yy++) for (let xx = 0; xx < tw; xx++) {
          const gx = px + tx + xx, gy = py + ty + yy, st = hash(gx >> 1, (gy + ((gx >> 1) & 1) * 2) >> 2, 75);
          const edge = ((gy + ((gx >> 1) & 1) * 2) & 3) === 3;
          P(g, gx, gy, edge ? K.s2 : (st < 0.35 ? K.s0 : (st < 0.8 ? K.s1 : K.s2)));
        }
        R(g, px + tx, py + ty, 1, th, K.s3); R(g, px + tx + tw - 1, py + ty, 1, th, K.s3);
        g.fillStyle = SHADOW; g.fillRect(px + tx + tw, py + ty, 2, th);
      }
      if (!Wl(0, -1) && tw > th) R(g, px + tx, py + ty - 1, tw, 1, K.s3);
    });
  }
  function fenceStyle(w, x, y) {
    if (x >= 117) return 'palisade';
    if (x >= 36 && x <= 81 && y >= 22 && y <= 34) return 'palisade';
    if (x <= 36 && y >= 24 && y <= 31) return 'timber';
    return 'wire';
  }
  function fenceTile(g, w, x, y, S) {
    const F = (dx, dy) => { const c = w.at(x + dx, y + dy); return c === 'f' || c === '!' || c === 'g' || c === 'q'; };
    const style = fenceStyle(w, x, y), px = x * T, py = y * T;
    if (S._skipFence && S._skipFence(x, y)) return;
    const eW = F(-1, 0) || F(1, 0), nS = F(0, -1) || F(0, 1);
    const horiz = eW || !nS, vert = nS;
    if (style === 'timber') {
      if (horiz && vert) {
        const col = F(-1, 0) ? (F(1, 0) ? 9 : 10) : 8, row = F(0, -1) ? (F(0, 1) ? 4 : 5) : 3;
        if (col === 9) { tt(g, 9, 6, px, py); if (F(0, 1)) tt(g, 11, 4, px, py); }
        else tt(g, col, row, px, py);
      } else if (horiz) tt(g, F(-1, 0) ? (F(1, 0) ? 9 : 10) : (F(1, 0) ? 8 : 9), 6, px, py);
      else tt(g, 11, F(0, -1) ? (F(0, 1) ? 4 : 5) : 3, px, py);
      return;
    }
    if (style === 'wire') {
      if (horiz) {
        for (const wy of [py + 6, py + 9, py + 12]) for (let xx = px; xx < px + T; xx++) if ((xx + wy) % 5) P(g, xx, wy, K.s1);
        for (const ox of [3, 11]) { R(g, px + ox, py + 4, 2, 11, K.woodD); P(g, px + ox, py + 4, K.wood); R(g, px + ox + 2, py + 13, 2, 2, SHADOW); }
      }
      if (vert) {
        for (let yy = py; yy < py + T; yy++) if (yy % 5) { P(g, px + 7, yy, K.s1); P(g, px + 9, yy, K.s0); }
        for (const oy of [2, 10]) { R(g, px + 7, py + oy, 3, 3, K.woodD); P(g, px + 7, py + oy, K.wood); }
      }
      return;
    }
    // palisade (galvanised steel pales)
    if (horiz) {
      for (let xx = px; xx < px + T; xx += 2) { R(g, xx, py + 2, 1, 12, (xx & 2) ? K.s1 : K.s0); P(g, xx, py + 1, K.s2); P(g, xx + 1, py + 13, K.s3); R(g, xx + 1, py + 3, 1, 10, K.s2); }
      R(g, px, py + 4, T, 1, K.s3); R(g, px, py + 11, T, 1, K.s3);
      if ((x & 1) === 0) R(g, px, py + 1, 2, 14, K.s3);
      g.fillStyle = SHADOW; g.fillRect(px, py + 14, T, 2);
    }
    if (vert) {
      R(g, px + 5, py, 6, T, K.s3);
      for (let yy = py; yy < py + T; yy += 2) { R(g, px + 6, yy, 4, 1, K.s0); R(g, px + 6, yy + 1, 4, 1, K.s1); }
      R(g, px + 5, py, 1, T, K.s2);
      g.fillStyle = SHADOW; g.fillRect(px + 11, py, 2, T);
    }
  }
  function herasTile(g, w, x, y) {
    const F = (dx, dy) => { const c = w.at(x + dx, y + dy); return c === 'k' || c === 'g'; };
    const px = x * T, py = y * T, horiz = F(-1, 0) || F(1, 0), vert = F(0, -1) || F(0, 1);
    if (horiz) {
      for (let yy = py + 3; yy < py + 12; yy++) for (let xx = px; xx < px + T; xx++) if (((xx + yy) & 1) === 0) P(g, xx, yy, K.s1);
      R(g, px, py + 2, T, 1, K.s0); R(g, px, py + 12, T, 1, K.s0);
      R(g, px, py + 2, 1, 11, K.s0); R(g, px - 2, py + 12, 5, 3, K.s1); R(g, px - 2, py + 14, 5, 1, K.s3);
      g.fillStyle = SHADOW; g.fillRect(px, py + 15, T, 1);
    }
    if (vert) {
      for (let yy = py; yy < py + T; yy++) { if (yy & 1) P(g, px + 8, yy, K.s1); }
      R(g, px + 7, py, 1, T, K.s0); R(g, px + 9, py, 1, T, K.s0);
      R(g, px + 5, py + 6, 7, 4, K.s1); R(g, px + 5, py + 9, 7, 1, K.s3);
      g.fillStyle = SHADOW; g.fillRect(px + 10, py, 2, T);
    }
  }
  function bedTile(g, w, x, y) {
    const px = x * T, py = y * T;
    const veg = (x >= 23 && x <= 37 && y >= 39 && y <= 47) || (y < 15 && x >= 47 && x <= 65);
    const B = (dx, dy) => w.at(x + dx, y + dy) === 'v';
    const l = B(-1, 0) ? 0 : 1, r = B(1, 0) ? 0 : 1, t = B(0, -1) ? 0 : 2, b = B(0, 1) ? 0 : 2;
    fillTex(g, SPR.textures.soil, px + l, py + t, T - l - r, T - t - b, 8);
    const edge = veg ? K.woodD : K.s1;
    if (t) R(g, px + l, py + t - 1, T - l - r, 1, edge);
    if (b) { R(g, px + l, py + T - b, T - l - r, 1, edge); R(g, px + l, py + T - b + 1, T - l - r, 1, K.s3); }
    if (l) R(g, px, py + t, 1, T - t - b, edge);
    if (r) R(g, px + T - 1, py + t, 1, T - t - b, edge);
    const rr = rng(x * 131 + y * 7);
    if (veg) {
      const kind = Math.floor(hash(x, y >> 1, 75) * 3);
      for (let k = 0; k < 2; k++) {
        const yy = py + 4 + k * 7;
        for (let xx = px + 3; xx < px + 14; xx += 5) {
          if (kind === 0) { ell(g, xx, yy, 2, 2, K.g2); P(g, xx - 1, yy - 1, K.g1); P(g, xx, yy, K.g1); P(g, xx + 1, yy + 2, K.g3); }
          else if (kind === 1) { P(g, xx, yy, K.g1); P(g, xx - 1, yy - 1, K.g1); P(g, xx + 1, yy - 1, K.g2); P(g, xx, yy + 1, K.g3); }
          else { R(g, xx, yy - 3, 1, 5, K.woodD); P(g, xx - 1, yy - 2, K.g2); P(g, xx + 1, yy - 1, K.g1); P(g, xx - 1, yy, K.g2); }
        }
      }
    } else {
      // cottage-garden bed: low foliage clumps with a few blooms of one or two colours per tile
      const cols = [K.red, K.yel, K.wh, K.rose, K.mag, K.yelL, K.plum];
      const c1 = cols[(hash(x, y, 76) * cols.length) | 0], c2 = cols[(hash(x, y, 77) * cols.length) | 0];
      for (let k = 0; k < 3; k++) {
        const fx = px + 3 + k * 5 + (rr() * 2 | 0), fy = py + 5 + (rr() * 5 | 0);
        ell(g, fx, fy, 3, 2, K.g3); ell(g, fx - 1, fy - 1, 2, 1, K.g2); P(g, fx - 1, fy - 2, K.g1);
        const n = 1 + (rr() * 2 | 0);
        for (let j = 0; j < n; j++) { const bx = fx - 2 + (rr() * 4 | 0), by = fy - 2 + (rr() * 3 | 0), c = rr() < 0.6 ? c1 : c2; P(g, bx, by, c); P(g, bx + 1, by, shade(c, -0.2)); }
      }
    }
  }
  function graveTile(g, w, x, y) {
    const px = x * T + 4 + Math.floor(hash(x, y, 81) * 3), py = y * T + 3, dark = hash(x, y, 82) < 0.3, cross = hash(x, y, 83) < 0.15;
    const c = dark ? K.s2 : K.s1, hi = dark ? K.s1 : K.s0;
    g.fillStyle = SHADOW; g.fillRect(px + 2, py + 10, 8, 2);
    if (cross) {
      R(g, px + 2, py - 1, 3, 12, K.s3); R(g, px - 1, py + 2, 9, 3, K.s3);
      R(g, px + 3, py, 1, 10, c); R(g, px, py + 3, 7, 1, c); P(g, px + 3, py, hi);
    } else {
      R(g, px, py + 1, 8, 10, K.s3); R(g, px + 1, py, 6, 1, K.s3);
      R(g, px + 1, py + 1, 6, 9, c); R(g, px + 1, py + 1, 6, 1, hi); P(g, px + 1, py + 2, hi);
      R(g, px + 2, py + 4, 4, 1, K.s2); R(g, px + 2, py + 6, 3, 1, K.s2);
      R(g, px + 1, py + 8, 6, 2, K.s2);
      if (hash(x, y, 84) < 0.4) P(g, px + 5, py + 3, K.g2);
    }
    R(g, px - 1, py + 10, 10, 1, K.s3);
  }
  function stoneTile(g, w, x, y, S) {
    const cx = x * T + 8 + Math.round((hash(x, y, 85) - 0.5) * 4), cy = y * T + 8;
    ell(g, cx, cy + 2, 6, 3, K.s3); ell(g, cx, cy, 6, 3, K.s1); ell(g, cx - 1, cy - 1, 3, 1, K.s0);
    R(g, cx - 5, cy + 4, 10, 1, K.bD);
    S.anim.ripples.push({ x: cx, y: cy + 5, p: hash(x, y, 86) * 3 });
  }
  // gritstone outcrop: one continuous rock mass with faceted top, south-facing cliff faces, heather in the cracks
  function rockTile(g, w, x, y) {
    const A = (dx, dy) => w.at(x + dx, y + dy) === '&';
    const px = x * T, py = y * T;
    const south = !A(0, 1), north = !A(0, -1), west = !A(-1, 0), east = !A(1, 0);
    const face = south ? 7 : 0;
    for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < T; xx++) {
      const gx = px + xx, gy = py + yy;
      const jag = south ? Math.floor(hash(gx >> 2, py, 139) * 3) : 0;
      if (south && yy >= T - jag) continue;
      // rounded outer corners
      const cxd = west && xx < 3 ? 3 - xx : (east && xx > 12 ? xx - 12 : 0);
      const cyd = north && yy < 3 ? 3 - yy : (south && yy > T - face - 4 && yy < T - face ? 0 : 0);
      if (cxd + cyd > 3) continue;
      if (north && yy < 2 && (hash(gx, 0, 131) < 0.5 || yy === 0)) continue;
      if (yy >= T - face - jag) { // cliff face
        const f = yy - (T - face - jag);
        const fiss = hash(gx >> 1, py, 133) < 0.22;
        P(g, gx, gy, f === face - 1 ? K.s4 : (fiss ? K.s3 : (f < 2 ? K.s2 : (hash(gx, gy, 134) < 0.2 ? K.s3 : K.s2))));
        continue;
      }
      const v = noise2(gx / 7, gy / 6, 135) + 0.5 * noise2(gx / 3, gy / 3, 136);
      let col = v > 1.02 ? K.s0 : (v > 0.66 ? K.s1 : (v > 0.47 ? K.s2 : K.s1));
      if (v > 0.44 && v < 0.49) col = K.s3;
      if (hash(gx, gy, 137) < 0.012) col = K.g2;
      P(g, gx, gy, col);
    }
    // outline on exposed edges
    if (north) for (let xx = 0; xx < T; xx++) { const top = hash(px + xx, 0, 131) < 0.5 ? 2 : 1; P(g, px + xx, py + top - 1 + (west && xx < 2 ? 2 - xx : 0) + (east && xx > 13 ? xx - 13 : 0), K.s3); }
    if (west) R(g, px, py + 3, 1, T - 3 - face, K.s3);
    if (east) R(g, px + T - 1, py + 3, 1, T - 3 - face, K.s3);
    if (south) { R(g, px, py + T - face - 1, T, 1, K.s0); g.fillStyle = SHADOW; g.fillRect(px + 1, py + T, T, 3); }
    // heather + bilberry tufts in the joints
    const r = rng(x * 71 + y * 19);
    if (r() < 0.55) { const hx = px + 2 + (r() * 11 | 0), hy = py + 3 + (r() * Math.max(1, T - face - 6) | 0); P(g, hx, hy, K.plum); P(g, hx + 1, hy - 1, K.mag); P(g, hx + 2, hy, K.plum); P(g, hx + 1, hy + 1, K.g3); P(g, hx - 1, hy + 1, K.g2); }
    if (r() < 0.3) { const hx = px + 2 + (r() * 11 | 0), hy = py + 2 + (r() * 6 | 0); P(g, hx, hy, K.g2); P(g, hx + 1, hy - 1, K.g1); P(g, hx - 1, hy, K.g3); }
  }

  /* ================================================================== trees */
  function drawTrees(g, w, S, st) {
    const items = [];
    const walk = (x, y) => w.walk(x, y);
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      if (w.at(x, y) !== 't') continue;
      if (isForestMass(w, x, y)) {
        const southOpen = w.at(x, y + 1) !== 't';
        const h = hash(x, y, 91);
        if (southOpen && h < 0.85) items.push({ spr: h < 0.12 ? SPR.treeTallD : SPR.treeTall, x: x * T, y: y * T + 14 - 30, base: y * T + 14 });
        else items.push({ spr: h < 0.3 ? SPR.forestD : (h > 0.9 ? SPR.forestL : SPR.forest), x: x * T + 2, y: y * T + 13 - 14, base: y * T + 13 });
        if (w.at(x + 1, y) === 't' && w.at(x, y + 1) === 't' && w.at(x + 1, y + 1) === 't' && isForestMass(w, x + 1, y + 1) && isForestMass(w, x, y + 1) && w.at(x, y + 2) === 't' && w.at(x + 1, y + 2) === 't') {
          const h2 = hash(x, y, 92);
          items.push({ spr: h2 < 0.35 ? SPR.forestD : SPR.forest, x: x * T + 10, y: y * T + 21 - 14, base: y * T + 21 });
        }
      } else {
        // single tree: an object (fades when the player walks behind it)
        const lawnish = [w.surf(x - 1, y), w.surf(x + 1, y), w.surf(x, y + 1), w.surf(x, y - 1)].some(s => s === 'lawn');
        const h = hash(x, y, 93);
        let spr = SPR.treeTall, top = 30;
        if (lawnish) { spr = (st.season === 'spring' && h < 0.5) ? SPR.treeBlossom : SPR.treeRound; top = 25; }
        else if (h < 0.35) { spr = SPR.treeRound; top = 25; }
        else if (h > 0.93) spr = SPR.treeTallD;
        const dx = x * T, dy = y * T + 14 - top;
        treeShadow(g, x * T + 8, y * T + 14, top > 26 ? 7 : 8);
        const needsObj = walk(x, y - 1) || walk(x - 1, y - 1) || walk(x + 1, y - 1) || walk(x - 1, y) || walk(x + 1, y);
        if (needsObj) S.objects.push({ img: spr, dx, dy, sortY: y * T + 14, fade: { x: x * T - 4, y: dy - 2, w: T + 8, h: y * T + 10 - dy }, kind: 'tree' });
        else items.push({ spr, x: dx, y: dy, base: y * T + 14 });
      }
    }
    items.sort((a, b) => a.base - b.base);
    items.forEach(it => g.drawImage(it.spr, it.x, it.y));
  }
  function treeShadow(g, x, y, rx) {
    g.fillStyle = SHADOW;
    for (let dy = -2; dy <= 2; dy++) { const hw = Math.round(rx * Math.sqrt(1 - (dy * dy) / 9)); g.fillRect(x + 3 - hw, y + dy, hw * 2, 1); }
  }

  /* ================================================================== buildings: Tiny Town facade kit */
  const ROOFC = { slate: 0, red: 4 }, WALLC = { brick: 0, stone: 4 };
  function roofRect(g, x, y, w, h, kind) {
    const c0 = ROOFC[kind] * T;
    const row = (i) => i < 5 ? 64 + i : (i >= h - 2 ? 94 + (i - (h - 2)) : 69 + ((i - 5) % 10));
    for (let cx = 0; cx < w; cx += T) {
      const col = cx === 0 ? 0 : (cx + T >= w ? 2 : 1), cw = Math.min(T, w - cx);
      const sx = c0 + col * T + (col === 2 ? T - cw : 0);
      for (let i = 0; i < h; i++) g.drawImage(IMG.tt, sx, row(i), cw, 1, x + cx, y + i, cw, 1);
    }
  }
  function wallRect(g, x, y, w, h, kind) {
    const c0 = WALLC[kind] * T;
    for (let cx = 0; cx < w; cx += T) {
      const col = cx === 0 ? 0 : (cx + T >= w ? 3 : 1), cw = Math.min(T, w - cx);
      const sx = c0 + col * T + (col === 3 ? T - cw : 0);
      for (let i = 0; i < h; i += T) { const hh = Math.min(T, h - i); g.drawImage(IMG.tt, sx, 96, cw, hh, x + cx, y + i, cw, hh); }
    }
  }
  function ttWin(g, x, y, kind) { ttp(g, WALLC[kind] * T, 112, T, T, x, y); }
  function ttDoor(g, x, y, kind, dbl) { ttp(g, WALLC[kind] * T + (dbl ? 32 : 16), 112, dbl ? 32 : 16, T, x, y); }
  function gableTT(g, x, y, roof) { ttp(g, (ROOFC[roof] + 3) * T, 80, T, T, x, y); }
  function chimney(g, x, y, kind) { // (x,y): bottom-left where it meets the roof; rises 12px
    const body = kind === 'brick' ? K.rd0 : K.s1, dk = kind === 'brick' ? K.brD : K.s2, hi = kind === 'brick' ? K.or0 : K.s0;
    R(g, x - 1, y - 13, 10, 16, K.ttOut);
    R(g, x, y - 12, 8, 15, body); R(g, x, y - 12, 8, 1, hi); R(g, x, y - 10, 8, 1, dk);
    for (let yy = y - 8; yy < y + 2; yy += 3) for (let xx = x + ((yy >> 1) & 1) * 2; xx < x + 8; xx += 4) P(g, xx, yy, dk);
    R(g, x + 1, y - 16, 2, 4, K.ttOut); R(g, x + 5, y - 16, 2, 4, K.ttOut); P(g, x + 1, y - 16, K.rd0); P(g, x + 5, y - 16, K.rd0);
  }
  function drainpipe(g, x, y0, y1) { R(g, x - 1, y0, 4, 3, K.s3); R(g, x, y0 + 3, 2, y1 - y0 - 4, K.s3); P(g, x, y0 + 3, K.s2); R(g, x - 1, y1 - 2, 4, 2, K.s3); }
  function windowBox(g, x, y) { // under a 16px window tile at (x, y)
    R(g, x + 1, y + 13, 14, 4, K.ttOut); R(g, x + 2, y + 14, 12, 2, K.wood);
    const r = rng(x * 17 + y);
    for (let k = 0; k < 6; k++) { const fx = x + 2 + (k * 2) + (r() * 2 | 0); P(g, fx, y + 12, K.g2); P(g, fx, y + 11, pick([K.red, K.rose, K.yel, K.wh, K.mag], r())); }
  }
  function planter(g, x, y) { // half-barrel with flowers, (x,y) = bottom-left
    R(g, x, y - 7, 12, 7, K.ttOut); R(g, x + 1, y - 6, 10, 5, K.wood); R(g, x + 1, y - 4, 10, 1, K.s3); R(g, x + 1, y - 6, 10, 1, K.woodL);
    ell(g, x + 6, y - 9, 5, 3, K.g3); ell(g, x + 5, y - 10, 3, 2, K.g2);
    [[3, -11], [7, -12], [9, -9], [5, -8]].forEach(([dx, dy], i) => P(g, x + dx, y + dy, [K.red, K.yel, K.wh, K.rose][i]));
  }
  function curtain(g, x, y, col) { R(g, x + 4, y + 4, 2, 7, col); R(g, x + 10, y + 4, 2, 7, col); }
  function signBoard(g, cx, y, lines, bg, ink, pad) {
    pad = pad || 3;
    const w = Math.max(...lines.map(textW)) + pad * 2 + 2, h = lines.length * 6 + 3;
    const x = Math.round(cx - w / 2);
    R(g, x + 1, y + h, w, 1, 'rgba(38,43,68,0.5)');
    board(g, x, y, w, h, bg, ink, lines, K.ttOut);
    return { x, y, w, h };
  }
  function fanlight(g, x, y, lit) { // semicircular light over a door tile at (x, y) = top of door tile
    R(g, x + 3, y - 5, 10, 5, K.ttOut); R(g, x + 4, y - 4, 8, 4, lit ? K.yelL : K.s3); if (lit) { R(g, x + 4, y - 1, 8, 1, K.yel); P(g, x + 7, y - 4, K.wh); }
  }
  function tallWindowArch(g, x, y, h, broken) { // custom round-headed industrial window 10 x h
    R(g, x - 1, y - 1, 12, h + 2, K.ttOut); R(g, x - 2, y + h, 14, 2, K.s1); R(g, x - 2, y + h + 1, 14, 1, K.s3);
    R(g, x, y + 2, 10, h - 2, K.s3); R(g, x + 1, y, 8, 2, K.s3);
    for (let yy = y + 2; yy < y + h; yy++) for (let xx = x; xx < x + 10; xx++) {
      const bar = (xx - x) % 3 === 2 || (yy - y) % 4 === 3;
      if (!bar) P(g, xx, yy, broken && hash(xx >> 1, yy >> 2, 99) < 0.18 ? K.s4 : ((xx + yy) % 7 === 0 ? K.s0 : K.bD));
    }
    R(g, x - 1, y - 3, 12, 2, K.rd0); R(g, x + 1, y - 4, 8, 1, K.rd0); // brick arch
  }
  function lancet(g, x, y, h) { // pointed church window 6 x h, stained glass
    R(g, x - 1, y + 2, 8, h, K.s3); R(g, x, y, 6, 2, K.s3); R(g, x + 1, y - 1, 4, 1, K.s3); R(g, x + 2, y - 2, 2, 1, K.s3);
    const cols = [K.bD, K.red, K.yel, K.b, K.g2, K.plum];
    for (let yy = y; yy < y + h + 1; yy++) for (let xx = x; xx < x + 6; xx++) {
      if (yy < y + 2 && (xx === x || xx === x + 5)) continue;
      P(g, xx, yy, (xx - x) === 3 || (yy - y) % 5 === 4 ? K.s3 : cols[(hash(xx >> 1, yy >> 2, 98) * cols.length) | 0]);
    }
    R(g, x - 2, y + h + 1, 10, 2, K.s0);
  }
  function shadowPoly(g, x0, y0, x1, y1, d) {
    d = d || 7;
    g.fillStyle = SHADOW; g.beginPath();
    g.moveTo(x1, y0 + 2); g.lineTo(x1 + d, y0 + d + 2); g.lineTo(x1 + d, y1 + d); g.lineTo(x0 + d, y1 + d); g.lineTo(x0, y1); g.lineTo(x1, y1); g.closePath();
    // crisp fill via rects instead of antialiased path
    for (let yy = y0 + 2; yy < y1 + d; yy++) {
      let a, b;
      if (yy < y1) { a = x1; b = x1 + Math.min(d, yy - y0 - 2 + 1); }
      else { a = x0 + Math.min(d, yy - y1 + 1); b = x1 + d; }
      if (b > a) g.fillRect(a, yy, b - a, 1);
    }
  }

  function findBuildings(w) {
    const seen = new Set(), out = [];
    const LET = 'SNOWCHAPVMEYFRB';
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      const ch = w.at(x, y);
      if (LET.indexOf(ch) < 0 || seen.has(x + ',' + y)) continue;
      const st = [[x, y]]; seen.add(x + ',' + y);
      let x0 = x, x1 = x, y0 = y, y1 = y;
      while (st.length) {
        const [cx, cy] = st.pop();
        x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const nx = cx + dx, ny = cy + dy, c = w.at(nx, ny), k = nx + ',' + ny;
          if (!seen.has(k) && (c === ch || '123*'.indexOf(c) >= 0)) { seen.add(k); st.push([nx, ny]); }
        });
      }
      const doors = [];
      for (let xx = x0; xx <= x1; xx++) { const c = w.at(xx, y1); if ('123*'.indexOf(c) >= 0) doors.push({ x: xx, ch: c }); }
      out.push({ letter: ch, x0, y0, x1, y1, doors });
    }
    return out;
  }

  // entrance cues on the ground: warm glow + coir doormat + stone step
  function doorGround(g, S, tx, ty, lit) {
    const px = tx * T, py = (ty + 1) * T;
    R(g, px + 1, py, 14, 3, K.s1); R(g, px + 1, py, 14, 1, K.s0); R(g, px + 1, py + 3, 14, 1, K.s3);
    if (!lit) return;
    R(g, px + 2, py + 5, 12, 8, K.brD); R(g, px + 3, py + 6, 10, 6, K.br);
    for (let k = 0; k < 10; k += 2) P(g, px + 3 + k, py + 7 + (k % 4 === 0 ? 0 : 2), K.tan);
    g.fillStyle = 'rgba(254,231,97,0.35)';
    for (let dy = -4; dy <= 4; dy++) { const hw = Math.round(13 * Math.sqrt(1 - (dy * dy) / 25)); g.fillRect(px + 8 - hw, py + 3 + dy, hw * 2, 1); }
    S.lights.push({ x: px + 8, y: py, r: 34 });
  }

  function buildBuildings(g, w, S, st) {
    w.buildings.forEach(b => {
      const fn = BLD[b.letter];
      if (!fn) return;
      const bw = (b.x1 - b.x0 + 1) * T, bh = (b.y1 - b.y0 + 1) * T;
      const r = fn(b, bw, bh, st, S, w);
      if (!r) return;
      const { c, ov } = r;
      const o = { img: c, dx: b.x0 * T - (r.left || 0), dy: b.y0 * T - ov, sortY: (b.y1 + 1) * T, kind: 'building', id: b.letter };
      if (r.fade) o.fade = r.fade;
      S.objects.push(o);
      shadowPoly(g, b.x0 * T + (r.shadowInset || 0), b.y0 * T + (r.shadowTop || 8), (b.x1 + 1) * T, (b.y1 + 1) * T);
      b.doors.forEach(d => doorGround(g, S, d.x, b.y1, '123'.indexOf(d.ch) >= 0));
    });
  }
  function base(bw, bh, ov) { const c = cv(bw, bh + ov); return { c, g: G(c) }; }
  function winLights(S, b, ov, list) { list.forEach(([x, y]) => S.lights.push({ x: b.x0 * T + x + 8, y: b.y0 * T - ov + y + 8, r: 14, win: true })); }

  const BLD = {};
  // --- generic two-storey village building
  function village(b, bw, bh, o, S) {
    const ov = 16, { c, g } = base(bw, bh, ov);
    const roofH = o.roofH || 42, wallY = ov + roofH, H = ov + bh;
    roofRect(g, 0, ov, bw, roofH, o.roof);
    (o.chimneys || []).forEach(cx => chimney(g, cx, ov + 8, o.wall === 'brick' ? 'brick' : 'stone'));
    wallRect(g, 0, wallY, bw, bh - roofH, o.wall);
    R(g, 0, wallY, bw, 1, K.ttOut); R(g, 0, H - 2, bw, 1, o.wall === 'stone' ? K.s2 : K.woodD); R(g, 0, H - 1, bw, 1, K.ttOut);
    const lit = [];
    (o.up || []).forEach(x => { ttWin(g, x, wallY + 2, o.wall); curtain(g, x, wallY + 2, o.curtain || K.rose); lit.push([x, wallY + 2]); if (o.boxesUp) windowBox(g, x, wallY + 2); });
    (o.down || []).forEach(x => { ttWin(g, x, H - 17, o.wall); lit.push([x, H - 17]); if (o.boxes) windowBox(g, x, H - 17); });
    (o.doors || []).forEach(d => {
      ttDoor(g, d.x, H - 16, o.wall, d.dbl);
      if (d.enter) fanlight(g, d.x, H - 16, true);
    });
    (o.gables || []).forEach(x => gableTT(g, x, ov + roofH - 16, o.roof));
    if (o.pipes !== false) { drainpipe(g, 3, wallY, H - 1); drainpipe(g, bw - 5, wallY, H - 1); }
    winLights(S, b, ov, lit);
    return { c, g, ov, wallY, H, roofH };
  }
  BLD.V = (b, bw, bh, st, S) => { // cottages (two variants by position)
    const alt = b.x0 > 68;
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 2) - b.x0;
    const r = village(b, bw, bh, { roof: alt ? 'red' : 'slate', wall: alt ? 'brick' : 'stone', chimneys: [4, bw - 12], up: [12, bw - 28], down: [Math.max(4, dx * T - 22), Math.min(bw - 36, dx * T + 26)], doors: [{ x: dx * T }], gables: [dx * T], boxes: true, curtain: alt ? K.bL : K.rose }, S);
    const { g, H } = r;
    if (!alt) { // climbing rose round the door
      for (let k = 0; k < 18; k++) { const yy = H - 30 + (k % 9) * 3, xx = dx * T + (k < 9 ? -1 : 15); P(g, xx, yy, K.g2); P(g, xx + (k < 9 ? 1 : -1), yy + 1, K.g3); if (k % 3 === 0) P(g, xx, yy + 1, K.red); }
    }
    g.drawImage(SPR.bin_grey || cv(1, 1), bw - 16, H - 16);
    return r;
  };
  BLD.F = (b, bw, bh, st, S) => { // farmhouse
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 3) - b.x0;
    const r = village(b, bw, bh, { roof: 'slate', wall: 'stone', chimneys: [4, bw - 12], up: [16, 48, 96], down: [16, 80, 96].filter(v => Math.abs(v - dx * T) >= 16), doors: [{ x: dx * T }], gables: [dx * T], boxes: false }, S);
    return r;
  };
  BLD.A = (b, bw, bh, st, S) => { // The Kestrel Arms
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 4) - b.x0;
    const r = village(b, bw, bh, { roof: 'slate', wall: 'stone', roofH: 40, chimneys: [6, bw - 14], up: [16, 64, 112], down: [16, 32, 96, 112], doors: [{ x: dx * T }], boxesUp: true, curtain: K.wine }, S);
    const { g, wallY, H } = r;
    // fascia between storeys
    const fy = wallY + 20;
    R(g, 8, fy, bw - 16, 11, K.ttOut); R(g, 9, fy + 1, bw - 18, 9, K.g4); R(g, 9, fy + 1, bw - 18, 1, K.g3);
    textC(g, 'THE KESTREL ARMS', bw / 2, fy + 3, K.yel, K.out);
    // hanging sign with a kestrel, on a bracket left of the door
    const sx = dx * T - 14, sy = wallY + 34;
    R(g, sx - 2, sy - 2, 16, 1, K.ttOut); R(g, sx + 13, sy - 4, 1, 4, K.ttOut);
    R(g, sx, sy - 1, 1, 2, K.ttOut); R(g, sx + 11, sy - 1, 1, 2, K.ttOut);
    R(g, sx - 1, sy + 1, 14, 13, K.ttOut); R(g, sx, sy + 2, 12, 11, K.sand);
    // kestrel: brown wings, grey head, hovering
    R(g, sx + 2, sy + 6, 8, 2, K.br); R(g, sx + 1, sy + 5, 2, 1, K.brD); R(g, sx + 9, sy + 5, 2, 1, K.brD);
    R(g, sx + 5, sy + 4, 2, 5, K.br); R(g, sx + 5, sy + 3, 2, 2, K.s2); P(g, sx + 5, sy + 3, K.out); R(g, sx + 5, sy + 9, 2, 2, K.brD);
    P(g, sx + 3, sy + 7, K.out); P(g, sx + 8, sy + 7, K.out);
    // hanging baskets + lantern
    [[dx * T + 20, wallY + 34]].forEach(([hx, hy]) => { R(g, hx + 3, hy - 2, 1, 3, K.ttOut); ell(g, hx + 3, hy + 3, 4, 3, K.g2); [[1, 2], [4, 1], [6, 4], [2, 5]].forEach(([a, bb]) => P(g, hx + a, hy + bb, pick([K.rose, K.mag, K.wh, K.yel], hash(hx, a, bb)))); });
    R(g, dx * T + 6, H - 22, 4, 5, K.ttOut); R(g, dx * T + 7, H - 21, 2, 3, K.yelL);
    S.lights.push({ x: b.x0 * T + dx * T + 8, y: b.y0 * T - 16 + H - 20, r: 22 });
    g.drawImage(SPR.crate || cv(1, 1), bw - 16, H - 14);
    return r;
  };
  BLD.P = (b, bw, bh, st, S) => { // Pritchard's bakery
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 3) - b.x0;
    const r = village(b, bw, bh, { roof: 'red', wall: 'brick', roofH: 40, chimneys: [bw - 14], up: [24, 88], down: [], doors: [{ x: dx * T }], curtain: K.wh, pipes: false }, S);
    const { g, wallY, H } = r;
    // fascia
    const fy = wallY + 20;
    R(g, 4, fy, bw - 8, 10, K.ttOut); R(g, 5, fy + 1, bw - 10, 8, K.g3); R(g, 5, fy + 1, bw - 10, 1, K.g2);
    textC(g, "PRITCHARD'S", bw / 2, fy + 3, K.yelL, K.g4);
    // shop windows with bread on shelves
    const shop = (x0, x1) => {
      R(g, x0, H - 20, x1 - x0, 18, K.ttOut); R(g, x0 + 1, H - 19, x1 - x0 - 2, 16, K.bD);
      R(g, x0 + 1, H - 12, x1 - x0 - 2, 1, K.woodD); R(g, x0 + 1, H - 5, x1 - x0 - 2, 2, K.woodD);
      for (let xx = x0 + 3; xx < x1 - 4; xx += 5) { R(g, xx, H - 15, 4, 3, K.tan); P(g, xx + 1, H - 15, K.sand); R(g, xx + 1, H - 8, 3, 3, K.br); P(g, xx + 1, H - 8, K.tan); }
      P(g, x0 + 2, H - 18, K.bL); P(g, x0 + 3, H - 18, K.bL); P(g, x0 + 2, H - 17, K.bL);
      R(g, x0 - 1, H - 3, x1 - x0 + 2, 2, K.s1);
      S.lights.push({ x: b.x0 * T + (x0 + x1) / 2, y: b.y0 * T - 16 + H - 10, r: 20, win: true });
    };
    shop(6, dx * T - 3); shop(dx * T + 19, bw - 6);
    // striped awning over the shopfront
    const ay = fy + 11;
    for (let xx = 2; xx < bw - 2; xx++) {
      const stripe = Math.floor((xx - 2) / 4) % 2 ? K.wh : K.red;
      R(g, xx, ay, 1, 7, stripe); P(g, xx, ay, K.ttOut);
      const sc = ((xx - 2) % 4) < 2 ? 1 : 0; R(g, xx, ay + 7, 1, 1 + sc, stripe); P(g, xx, ay + 8 + sc, K.ttOut);
    }
    R(g, 2, ay + 1, bw - 4, 1, 'rgba(255,255,255,0.35)');
    return r;
  };
  BLD.H = (b, bw, bh, st, S) => { // village hall (enterable)
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 5) - b.x0;
    const ov = 16, { c, g } = base(bw, bh, ov);
    const roofH = 44, wallY = ov + roofH, H = ov + bh;
    roofRect(g, 0, ov, bw, roofH, 'slate');
    chimney(g, bw - 22, ov + 8, 'brick');
    gableTT(g, dx * T, ov + roofH - 16, 'slate');
    wallRect(g, 0, wallY, bw, bh - roofH, 'brick');
    R(g, 0, wallY, bw, 1, K.ttOut); R(g, 0, H - 2, bw, 1, K.woodD); R(g, 0, H - 1, bw, 1, K.ttOut);
    const lit = [];
    [1, 3, 8, 10].forEach(tx => { ttWin(g, tx * T, H - 33, 'brick'); ttWin(g, tx * T, H - 17, 'brick'); lit.push([tx * T, H - 25]); });
    ttDoor(g, dx * T, H - 16, 'brick'); fanlight(g, dx * T, H - 16, true);
    signBoard(g, dx * T + 8, wallY + 3, ['VILLAGE HALL'], K.sand, K.brD);
    // small noticeboard + date stone
    R(g, dx * T + 24, H - 30, 12, 9, K.ttOut); R(g, dx * T + 25, H - 29, 10, 7, K.woodD); P(g, dx * T + 27, H - 27, K.wh); P(g, dx * T + 31, H - 26, K.yelL); P(g, dx * T + 29, H - 28, K.rose);
    drainpipe(g, 3, wallY, H - 1); drainpipe(g, bw - 5, wallY, H - 1);
    if (SPR.bin_grey) { g.drawImage(SPR.bin_grey, bw - 17, H - 15); g.drawImage(SPR.bin_grey2, bw - 30, H - 15); }
    planter(g, dx * T - 14, H);
    winLights(S, b, ov, lit);
    return { c, ov };
  };
  BLD.E = (b, bw, bh, st, S) => { // Harrowby Primary
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 5) - b.x0;
    const ov = 24, { c, g } = base(bw, bh, ov);
    const roofH = 34, wallY = ov + roofH, H = ov + bh;
    roofRect(g, 0, ov, bw, roofH, 'slate');
    // bell-cote on the ridge
    const bx = dx * T + 2;
    R(g, bx - 1, ov - 17, 14, 21, K.ttOut); R(g, bx, ov - 16, 12, 20, K.s1); R(g, bx + 3, ov - 12, 6, 9, K.s4);
    R(g, bx + 5, ov - 11, 2, 1, K.yel); R(g, bx + 4, ov - 10, 4, 3, K.yel); P(g, bx + 5, ov - 7, K.or);
    R(g, bx + 1, ov - 20, 10, 3, K.ttOut); R(g, bx + 3, ov - 22, 6, 2, K.ttOut); R(g, bx + 2, ov - 19, 8, 2, K.s0);
    chimney(g, 8, ov + 8, 'stone'); chimney(g, bw - 16, ov + 8, 'stone');
    gableTT(g, dx * T, ov + roofH - 16, 'slate');
    wallRect(g, 0, wallY, bw, bh - roofH, 'stone');
    R(g, 0, wallY, bw, 1, K.ttOut); R(g, 0, H - 2, bw, 1, K.s2); R(g, 0, H - 1, bw, 1, K.ttOut);
    const lit = [];
    [1, 2, 3, 7, 8, 9, 10].forEach(tx => { if (Math.abs(tx - dx) < 2) return; ttWin(g, tx * T, H - 32, 'stone'); ttWin(g, tx * T, H - 17, 'stone'); lit.push([tx * T, H - 25]); });
    ttDoor(g, dx * T, H - 16, 'stone');
    signBoard(g, dx * T + 8, wallY + 2, ['HARROWBY PRIMARY'], K.bD, K.wh);
    // children's paintings in a window
    P(g, 2 * T + 5, H - 12, K.red); P(g, 2 * T + 9, H - 11, K.yel); P(g, 8 * T + 6, H - 12, K.g1);
    drainpipe(g, 3, wallY, H - 1); drainpipe(g, bw - 5, wallY, H - 1);
    winLights(S, b, ov, lit);
    return { c, ov };
  };
  BLD.M = (b, bw, bh, st, S) => { // Beck Cottage (Moira)
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 3) - b.x0;
    const r = village(b, bw, bh, { roof: 'slate', wall: 'stone', roofH: 38, chimneys: [5, bw - 13], up: [], down: [16, 80], doors: [{ x: dx * T }], gables: [dx * T], boxes: true, curtain: K.bL }, S);
    const { g, wallY, H } = r;
    // dormer windows in the roof
    [16, 80].forEach(x => { ttp(g, 48, 64, T, T, x, 16 + 6); });
    signBoard(g, dx * T + 8, wallY + 1, ['BECK COTTAGE'], K.s3, K.s0, 2);
    // roses round the door
    for (let k = 0; k < 20; k++) { const yy = H - 30 + (k % 10) * 3, xx = dx * T + (k < 10 ? -1 : 15); P(g, xx, yy, K.g2); P(g, xx + (k < 10 ? 1 : -1), yy + 1, K.g3); if (k % 3 === 1) P(g, xx, yy + 1, k % 2 ? K.rose : K.red); }
    return r;
  };
  BLD.R = (b, bw, bh, st, S) => { // stone barn with big doors
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 2) - b.x0;
    const ov = 8, { c, g } = base(bw, bh, ov);
    const roofH = 44, wallY = ov + roofH, H = ov + bh;
    roofRect(g, 0, ov, bw, roofH, 'red');
    wallRect(g, 0, wallY, bw, bh - roofH, 'stone');
    R(g, 0, wallY, bw, 1, K.ttOut); R(g, 0, H - 1, bw, 1, K.ttOut);
    // big timber doors (2 tiles) + hay loft
    const x0 = dx * T - 8, dw = 32;
    R(g, x0 - 1, H - 34, dw + 2, 34, K.ttOut); R(g, x0, H - 33, dw, 33, K.wood);
    for (let xx = x0 + 3; xx < x0 + dw; xx += 4) R(g, xx, H - 33, 1, 33, K.woodD);
    R(g, x0 + 15, H - 33, 2, 33, K.ttOut);
    for (let k = 0; k < 14; k++) { P(g, x0 + 1 + k, H - 3 - k * 2, K.woodL); P(g, x0 + 17 + k, H - 31 + k * 2, K.woodL); }
    R(g, x0 + 8, wallY - 2, 16, 12, K.ttOut); R(g, x0 + 9, wallY - 1, 14, 10, K.s4);
    for (let k = 0; k < 10; k++) P(g, x0 + 10 + (hash(k, 1, 7) * 12 | 0), wallY + 4 + (hash(k, 2, 7) * 5 | 0), K.yel);
    R(g, x0 + 9, wallY + 6, 14, 3, K.yel); R(g, x0 + 9, wallY + 6, 14, 1, K.yelL);
    [8, bw - 12].forEach(xx => { R(g, xx, wallY + 12, 3, 12, K.s4); });
    return { c, ov };
  };
  BLD.Y = (b, bw, bh, st, S) => { // St church: west tower + nave + south porch
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 4) - b.x0;
    const ov = 34, { c, g } = base(bw, bh, ov);
    const tw = 48, H = ov + bh, roofH = 58, wallY = ov + roofH;
    // nave
    roofRect(g, tw, ov + 4, bw - tw, roofH - 4, 'slate');
    wallRect(g, tw, wallY, bw - tw, bh - roofH, 'stone');
    R(g, tw, wallY, bw - tw, 1, K.ttOut); R(g, tw, H - 2, bw - tw, 1, K.s2); R(g, tw, H - 1, bw - tw, 1, K.ttOut);
    for (let lx = tw + 36; lx < bw - 8; lx += 26) { if (Math.abs(lx + 3 - (dx * T + 8)) < 24) continue; lancet(g, lx, wallY + 12, 22); S.lights.push({ x: b.x0 * T + lx + 3, y: b.y0 * T - ov + wallY + 22, r: 14, win: true }); }
    // cross on the east gable
    R(g, bw - 8, ov - 3, 2, 9, K.s1); R(g, bw - 10, ov - 1, 6, 2, K.s1);
    // porch
    const px0 = dx * T - 6, pw = 28;
    R(g, px0 - 1, wallY - 8, pw + 2, 9, K.ttOut);
    for (let k = 0; k < pw / 2; k++) { R(g, px0 + k, wallY - 1 - Math.min(k, 7), 1, Math.min(k, 7) + 1, K.s2); R(g, px0 + pw - 1 - k, wallY - 1 - Math.min(k, 7), 1, Math.min(k, 7) + 1, K.s2); }
    wallRect(g, px0, wallY, pw, bh - roofH, 'stone');
    R(g, px0 - 1, wallY, 1, bh - roofH, K.ttOut); R(g, px0 + pw, wallY, 1, bh - roofH, K.ttOut);
    R(g, dx * T + 1, H - 22, 14, 22, K.ttOut); R(g, dx * T + 2, H - 20, 12, 20, K.woodD); R(g, dx * T + 3, H - 23, 10, 2, K.ttOut);
    for (let xx = dx * T + 4; xx < dx * T + 13; xx += 3) R(g, xx, H - 19, 1, 19, K.ttOut);
    P(g, dx * T + 11, H - 10, K.yel);
    // tower
    const ty0 = 12;
    R(g, 0, ty0 + 6, tw, H - ty0 - 6, K.ttOut);
    for (let yy = ty0 + 7; yy < H - 1; yy++) for (let xx = 1; xx < tw - 1; xx++) {
      const course = ((yy - ty0) % 6 === 0), joint = ((xx + ((yy / 6 | 0) % 2) * 5) % 10 === 0);
      P(g, xx, yy, course || joint ? K.s2 : (xx > tw - 10 ? K.s2 : (hash(xx >> 2, yy >> 1, 97) < 0.12 ? K.s0 : K.s1)));
    }
    for (let xx = 1; xx < tw - 1; xx += 8) { R(g, xx, ty0, 6, 7, K.ttOut); R(g, xx + 1, ty0 + 1, 4, 6, K.s1); P(g, xx + 1, ty0 + 1, K.s0); }
    R(g, 1, ty0 + 7, tw - 2, 2, K.s0); R(g, 1, ty0 + 9, tw - 2, 1, K.s3);
    // belfry louvres
    [[8, ty0 + 14], [28, ty0 + 14]].forEach(([lx, ly]) => { R(g, lx, ly, 12, 16, K.ttOut); R(g, lx + 1, ly + 2, 10, 14, K.s4); R(g, lx + 2, ly, 8, 2, K.ttOut); for (let yy = ly + 4; yy < ly + 16; yy += 3) R(g, lx + 1, yy, 10, 1, K.s2); });
    // clock
    const cx = tw / 2, cy = ty0 + 42; ell(g, cx, cy, 7, 7, K.ttOut); ell(g, cx, cy, 6, 6, K.wh); R(g, cx, cy - 4, 1, 5, K.out); R(g, cx, cy, 4, 1, K.out); P(g, cx - 5, cy, K.s2); P(g, cx + 5, cy, K.s2); P(g, cx, cy - 5, K.s2); P(g, cx, cy + 5, K.s2);
    // lower lancet
    lancet(g, tw / 2 - 3, ty0 + 64, 16);
    R(g, 1, H - 2, tw - 2, 1, K.s2);
    // weathercock
    R(g, tw / 2, ty0 - 11, 1, 11, K.s3); R(g, tw / 2 - 3, ty0 - 7, 7, 1, K.s3);
    R(g, tw / 2 - 2, ty0 - 12, 5, 2, K.yel); P(g, tw / 2 + 2, ty0 - 13, K.yel); P(g, tw / 2 - 3, ty0 - 13, K.yel); P(g, tw / 2 + 3, ty0 - 12, K.or);
    return { c, ov, fade: { x: b.x0 * T - 4, y: (b.y0 - 2) * T, w: tw + 8, h: 2 * T } };
  };
  BLD.S = (b, bw, bh, st, S) => { // Harrowby station (closed 2009)
    const ov = 16, { c, g } = base(bw, bh, ov);
    const roofH = 44, wallY = ov + roofH, H = ov + bh;
    const d0 = b.doors.length ? b.doors[0].x - b.x0 : 6;
    roofRect(g, 0, ov, bw, roofH, 'slate');
    chimney(g, 2 * T + 4, ov + 8, 'stone'); chimney(g, bw - 3 * T + 4, ov + 8, 'stone');
    wallRect(g, 0, wallY, bw, bh - roofH, 'stone');
    R(g, 0, wallY, bw, 1, K.ttOut); R(g, 0, H - 2, bw, 1, K.s2); R(g, 0, H - 1, bw, 1, K.ttOut);
    // tall sash windows (two stacked Tiny Town windows), two boarded up
    const wins = [1, 3, bw / T - 4, bw / T - 2];
    wins.forEach((tx, i) => {
      ttWin(g, tx * T, H - 33, 'stone'); ttWin(g, tx * T, H - 17, 'stone');
      if (i === 1 || i === 2) { // boarded
        for (let k = 0; k < 3; k++) { R(g, tx * T + 2, H - 30 + k * 9, 12, 3, K.woodL); R(g, tx * T + 2, H - 28 + k * 9, 12, 1, K.wood); }
        R(g, tx * T + 3, H - 30, 2, 26, K.wood);
      }
    });
    // double doors (closed), notice pinned on them
    ttDoor(g, d0 * T, H - 16, 'stone', true);
    R(g, d0 * T + 3, H - 14, 26, 8, K.ttOut); R(g, d0 * T + 4, H - 13, 24, 6, K.wh); text(g, 'CLOSED', d0 * T + 5, H - 13, K.red);
    R(g, d0 * T + 11, H - 5, 10, 4, K.wh); R(g, d0 * T + 12, H - 4, 8, 1, K.s1); R(g, d0 * T + 12, H - 2, 6, 1, K.s1);
    // canopy fascia over the entrance: timber valance with the station name
    const fx0 = (d0 - 2) * T, fx1 = (d0 + 4) * T;
    R(g, fx0, H - 30, fx1 - fx0, 11, K.ttOut); R(g, fx0 + 1, H - 29, fx1 - fx0 - 2, 9, K.g3); R(g, fx0 + 1, H - 29, fx1 - fx0 - 2, 1, K.g2);
    textC(g, 'HARROWBY', (fx0 + fx1) / 2, H - 27, K.sand, K.g4);
    for (let xx = fx0; xx < fx1; xx++) { const k = (xx - fx0) % 4; R(g, xx, H - 19, 1, k < 2 ? 3 : 2, k === 0 ? K.s0 : K.sand); }
    R(g, fx0 + 2, H - 17, 2, 17, K.ttOut); R(g, fx1 - 4, H - 17, 2, 17, K.ttOut); P(g, fx0 + 2, H - 17, K.g3); P(g, fx1 - 4, H - 17, K.g3);
    // poster frames + clock
    [(d0 - 1) * T + 3, (d0 + 2) * T + 3].forEach(px => { R(g, px, H - 15, 10, 12, K.g4); R(g, px + 1, H - 14, 8, 10, K.sand); R(g, px + 2, H - 13, 6, 3, K.bD); R(g, px + 2, H - 9, 6, 1, K.s1); R(g, px + 2, H - 7, 4, 1, K.s1); });
    ell(g, (d0 + 1) * T, wallY + 8, 4, 4, K.ttOut); ell(g, (d0 + 1) * T, wallY + 8, 3, 3, K.wh); P(g, (d0 + 1) * T, wallY + 6, K.out); P(g, (d0 + 1) * T, wallY + 7, K.out); P(g, (d0 + 1) * T + 1, wallY + 8, K.out);
    drainpipe(g, 3, wallY, H - 1); drainpipe(g, bw - 5, wallY, H - 1);
    planter(g, 6, H); planter(g, bw - 18, H);
    return { c, ov };
  };
  BLD.N = (b, bw, bh, st, S) => { // Harrowby depot 1911: brick engine shed, siding enters the east gable
    const ov = 12, { c, g } = base(bw, bh, ov);
    const mw = bw - T, roofH = 44, wallY = ov + roofH, H = ov + bh;
    roofRect(g, 0, ov, mw, roofH, 'slate');
    // smoke ventilator along the ridge + roof lights
    R(g, 16, ov - 5, mw - 32, 9, K.ttOut); R(g, 17, ov - 4, mw - 34, 7, K.s2); R(g, 17, ov - 4, mw - 34, 1, K.s0);
    for (let xx = 19; xx < mw - 18; xx += 3) R(g, xx, ov - 2, 1, 4, K.s4);
    for (let xx = 40; xx < mw - 30; xx += 48) { R(g, xx, ov + 16, 14, 9, K.ttOut); R(g, xx + 1, ov + 17, 12, 7, K.bD); R(g, xx + 1, ov + 17, 12, 1, K.bL); P(g, xx + 3, ov + 19, K.bL); }
    wallRect(g, 0, wallY, mw, bh - roofH, 'brick');
    R(g, 0, wallY, mw, 1, K.ttOut); R(g, 0, H - 2, mw, 1, K.woodD); R(g, 0, H - 1, mw, 1, K.ttOut);
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 9) - b.x0;
    for (let tx = 1; tx < mw / T - 1; tx += 2) {
      if (Math.abs(tx - dx) <= 2) continue;
      tallWindowArch(g, tx * T + 3, wallY + 14, 24, !st.live && hash(tx, 3, 5) < 0.6);
    }
    ttDoor(g, dx * T, H - 16, 'brick'); fanlight(g, dx * T, H - 16, true);
    signBoard(g, dx * T + 8, wallY + 3, ['HARROWBY DEPOT 1911'], K.sand, K.brD);
    // yellow PPE ONLY plate beside the door
    R(g, dx * T + 18, H - 24, 21, 15, K.ttOut); R(g, dx * T + 19, H - 23, 19, 13, K.yel); R(g, dx * T + 19, H - 23, 19, 1, K.yelL);
    textC(g, 'PPE', dx * T + 28.5, H - 22, K.out); textC(g, 'ONLY', dx * T + 28.5, H - 16, K.out);
    drainpipe(g, 3, wallY, H - 1); drainpipe(g, mw - 5, wallY, H - 1);
    // east gable face (in shade) with the big arched train doors where the siding enters
    const ex = mw;
    R(g, ex, ov + 2, T, H - ov - 2, K.ttOut);
    for (let yy = ov + 3; yy < H - 1; yy++) for (let xx = ex + 1; xx < ex + T; xx++) {
      const sl = yy < ov + 3 + (xx - ex); if (sl) continue;
      P(g, xx, yy, ((yy % 4 === 0) || ((xx + ((yy >> 2) & 1) * 3) % 6 === 0)) ? K.ttOut : K.woodD);
    }
    const dy0 = ov + 20, dyb = ov + 70;
    R(g, ex + 1, dy0 - 2, 14, dyb - dy0 + 2, K.sand);
    R(g, ex + 2, dy0, 12, dyb - dy0, K.g3);
    for (let xx = ex + 3; xx < ex + 14; xx += 3) R(g, xx, dy0 + 1, 1, dyb - dy0 - 1, K.g4);
    R(g, ex + 7, dy0, 1, dyb - dy0, K.ttOut); R(g, ex + 3, dy0 - 3, 10, 1, K.sand); R(g, ex + 5, dy0 - 4, 6, 1, K.sand);
    R(g, ex + 2, dy0 + 18, 12, 1, K.g2); R(g, ex + 2, dy0 + 34, 12, 1, K.g2);
    return { c, ov };
  };
  BLD.B = (b, bw, bh, st, S) => { // Kestrel Junction signal box
    const ov = 10, { c, g } = base(bw, bh, ov);
    const H = ov + bh;
    // hipped slate roof
    const rh = 22;
    roofRect(g, 0, ov, bw, rh, 'slate');
    g.clearRect(0, ov, 6, 5); g.clearRect(bw - 6, ov, 6, 5);
    R(g, 6, ov, bw - 12, 2, K.ttOut);
    R(g, bw / 2 - 1, ov - 7, 2, 7, K.ttOut); P(g, bw / 2 - 1, ov - 8, K.s0);
    // operating floor windows (cream + green timber)
    const wy = ov + rh;
    R(g, 0, wy, bw, 22, K.ttOut); R(g, 1, wy, bw - 2, 21, K.sand);
    for (let xx = 3; xx < bw - 3; xx += 8) { R(g, xx, wy + 2, 7, 12, K.g3); R(g, xx + 1, wy + 3, 5, 10, K.bD); R(g, xx + 1, wy + 3, 5, 1, K.bL); R(g, xx + 3, wy + 3, 1, 10, K.g3); R(g, xx + 1, wy + 8, 5, 1, K.g3); P(g, xx + 2, wy + 4, K.bL); }
    R(g, 1, wy + 15, bw - 2, 2, K.g3);
    S.lights.push({ x: b.x0 * T + bw / 2, y: b.y0 * T - ov + wy + 8, r: 26, win: true });
    // nameboard
    const nb = wy + 22;
    R(g, 2, nb, bw - 4, 9, K.ttOut); R(g, 3, nb + 1, bw - 6, 7, K.wine); textC(g, 'KESTREL JUNCTION', bw / 2, nb + 2, K.wh);
    // brick locking room
    const ly = nb + 9;
    wallRect(g, 0, ly, bw, H - ly, 'brick'); R(g, 0, ly, bw, 1, K.ttOut); R(g, 0, H - 1, bw, 1, K.ttOut);
    [[8, ly + 6], [bw - 18, ly + 6]].forEach(([xx, yy]) => { R(g, xx, yy, 10, 7, K.ttOut); R(g, xx + 1, yy + 1, 8, 5, K.s3); R(g, xx + 1, yy + 1, 8, 1, K.s2); });
    const dx = (b.doors[0] ? b.doors[0].x : b.x0 + 2) - b.x0;
    R(g, dx * T + 3, H - 15, 10, 15, K.ttOut); R(g, dx * T + 4, H - 14, 8, 14, K.g3); P(g, dx * T + 10, H - 7, K.yel);
    // external stair up the east side to the operating floor
    for (let k = 0; k < 8; k++) { R(g, bw - 16 + k * 1, H - 4 - k * 4, 12, 2, K.wood); R(g, bw - 16 + k, H - 2 - k * 4, 12, 1, K.woodD); }
    R(g, bw - 4, wy + 18, 1, H - wy - 18, K.wh);
    return { c, ov };
  };
  // --- modular site cabins (custom, flat roofs)
  function cabin(g, x, y, w, h, body, seam, roofCol) {
    R(g, x, y, w, h, K.ttOut);
    R(g, x + 1, y + 1, w - 2, 6, roofCol || K.s0); R(g, x + 1, y + 6, w - 2, 1, K.s1);
    R(g, x + 1, y + 7, w - 2, h - 9, body);
    for (let xx = x + 4; xx < x + w - 2; xx += 6) R(g, xx, y + 7, 1, h - 9, seam);
    R(g, x + 1, y + h - 2, w - 2, 1, seam);
  }
  function cabinWindow(g, x, y) { R(g, x, y, 14, 9, K.s3); R(g, x + 1, y + 1, 12, 7, K.bD); R(g, x + 1, y + 1, 12, 1, K.bL); P(g, x + 3, y + 3, K.bL); R(g, x, y + 9, 14, 1, K.s2); }
  BLD.O = (b, bw, bh, st, S) => { // two-storey project office
    const ov = 4, { c, g } = base(bw, bh, ov);
    const H = ov + bh, dx = (b.doors[0] ? b.doors[0].x : b.x0 + 6) - b.x0;
    cabin(g, 0, ov, bw, 30, K.s0, K.s1);
    cabin(g, 0, ov + 28, bw, bh - 30, K.s0, K.s1, K.s1);
    for (let xx = 10; xx < bw - 10; xx += 30) { if (xx > bw - 44) break; cabinWindow(g, xx, ov + 12); S.lights.push({ x: b.x0 * T + xx + 7, y: b.y0 * T - ov + ov + 16, r: 14, win: true }); }
    for (let xx = 10; xx < bw - 12; xx += 30) { if (Math.abs(xx + 7 - (dx * T + 8)) < 20 || xx + 18 > bw - 44) continue; cabinWindow(g, xx, ov + 42); S.lights.push({ x: b.x0 * T + xx + 7, y: b.y0 * T + 46, r: 14, win: true }); }
    // banner sign between storeys
    const sy = ov + 28;
    R(g, 12, sy - 1, bw - 24, 10, K.ttOut); R(g, 13, sy, bw - 26, 8, K.wh); R(g, 13, sy + 7, bw - 26, 1, K.s0);
    textC(g, 'KESTREL VALE LINE · PROJECT OFFICE', bw / 2, sy + 2, K.bD);
    // door + step + handrail
    R(g, dx * T + 2, H - 22, 12, 21, K.ttOut); R(g, dx * T + 3, H - 21, 10, 19, K.bD); R(g, dx * T + 5, H - 19, 6, 6, K.bL); R(g, dx * T + 5, H - 19, 6, 1, K.wh);
    P(g, dx * T + 11, H - 11, K.yel); R(g, dx * T, H - 3, 16, 3, K.s1); R(g, dx * T, H - 3, 16, 1, K.s0);
    R(g, dx * T + 3, H - 30, 10, 6, K.ttOut); R(g, dx * T + 4, H - 29, 8, 4, K.yelL);
    // blocks under the cabin
    for (let xx = 4; xx < bw - 8; xx += 40) R(g, xx, H - 2, 8, 2, K.s3);
    // external steel stair to the upper floor (east end) with yellow handrail
    const sx = bw - 44;
    for (let k = 0; k < 7; k++) { R(g, sx + k * 4, H - 5 - k * 4, 6, 2, K.s2); R(g, sx + k * 4, H - 5 - k * 4, 6, 1, K.s1); }
    for (let k = 0; k < 28; k++) P(g, sx + k, H - 14 - k, K.yel);
    R(g, sx + 28, ov + 30, 14, 2, K.s2); R(g, sx + 28, ov + 22, 1, 8, K.yel); R(g, sx + 41, ov + 22, 1, 8, K.yel); R(g, sx + 28, ov + 22, 14, 1, K.yel);
    R(g, sx + 31, ov + 9, 8, 19, K.ttOut); R(g, sx + 32, ov + 10, 6, 18, K.s2);
    return { c, ov };
  };
  BLD.W = (b, bw, bh, st, S) => { // welfare cabin
    const ov = 2, { c, g } = base(bw, bh, ov);
    const H = ov + bh, dx = (b.doors[0] ? b.doors[0].x : b.x0 + 3) - b.x0;
    cabin(g, 0, ov, bw, bh, K.g2, K.g3, K.s0);
    cabinWindow(g, 8, ov + 16); cabinWindow(g, bw - 22, ov + 16);
    R(g, dx * T + 2, H - 24, 12, 22, K.ttOut); R(g, dx * T + 3, H - 23, 10, 20, K.g3); P(g, dx * T + 11, H - 12, K.s0);
    R(g, 20, ov + 9, 36, 7, K.wh); text(g, 'WELFARE', 22, ov + 10, K.g3);
    R(g, dx * T, H - 3, 16, 3, K.s1);
    R(g, bw - 8, ov - 1, 4, 3, K.or); // beacon
    S.anim.flash.push({ x: b.x0 * T + bw - 7, y: b.y0 * T - 1, col: K.or, p: 0 });
    return { c, ov };
  };
  BLD.C = (b, bw, bh, st, S) => { // stores container
    const ov = 2, { c, g } = base(bw, bh, ov), H = ov + bh;
    R(g, 0, ov, bw, bh, K.ttOut); R(g, 1, ov + 1, bw - 2, 8, K.bD); R(g, 1, ov + 1, bw - 2, 1, K.b);
    R(g, 1, ov + 9, bw - 2, bh - 10, K.bD);
    for (let xx = 3; xx < bw - 2; xx += 3) R(g, xx, ov + 10, 1, bh - 12, K.s4);
    R(g, 1, ov + 9, bw - 2, 1, K.s4);
    text(g, 'STORES', bw / 2 - 11, ov + 22, K.wh);
    R(g, bw - 10, H - 18, 2, 12, K.s1); R(g, bw - 6, H - 18, 2, 12, K.s1);
    return { c, ov };
  };

  /* ================================================================== props */
  function obj(S, img, dx, dy, sortY, fade, extra) {
    const o = { img, dx: Math.round(dx), dy: Math.round(dy), sortY: Math.round(sortY) };
    if (fade) o.fade = fade;
    if (extra) Object.assign(o, extra);
    S.objects.push(o); return o;
  }
  function footShadow(g, x, y, rx) { g.fillStyle = SHADOW; for (let dy = -1; dy <= 1; dy++) { const hw = Math.round(rx * Math.sqrt(1 - (dy * dy) / 4)); g.fillRect(x - hw + 2, y + dy, hw * 2, 1); } }

  const PROP = {};
  PROP.lampCanvas = () => SPR.lamp;
  function railwayLamp() { // Moira's rescued station lamp (black, square lantern)
    const c = cv(9, 30), g = G(c);
    R(g, 3, 9, 3, 21, K.ttOut); R(g, 4, 10, 1, 19, K.s3); R(g, 2, 27, 5, 3, K.ttOut);
    R(g, 0, 1, 9, 9, K.ttOut); R(g, 1, 3, 7, 5, K.yelL); R(g, 1, 3, 7, 1, K.yel); R(g, 4, 3, 1, 5, K.ttOut);
    R(g, 1, 0, 7, 2, K.ttOut); P(g, 4, -1, K.ttOut); R(g, 3, 8, 3, 1, K.s3);
    return c;
  }
  function pillarBox() {
    const c = cv(10, 18), g = G(c);
    R(g, 1, 3, 8, 14, K.ttOut); R(g, 2, 1, 6, 2, K.ttOut); R(g, 0, 16, 10, 2, K.ttOut);
    R(g, 2, 3, 6, 11, K.red); R(g, 2, 3, 1, 11, K.rose); R(g, 7, 3, 1, 11, K.wine);
    R(g, 3, 2, 4, 1, K.red); R(g, 1, 5, 8, 1, K.wine);
    R(g, 3, 7, 4, 1, K.s4); R(g, 4, 9, 2, 2, K.wh);
    R(g, 2, 14, 6, 2, K.s4);
    return c;
  }
  function carCanvas() { // red hatchback parked north-south, nose to the south (towards the camera)
    const c = cv(18, 34), g = G(c);
    R(g, 1, 1, 16, 32, K.ttOut); R(g, 2, 0, 14, 1, K.ttOut);
    R(g, 2, 1, 14, 31, K.red); R(g, 2, 1, 1, 31, K.rose); R(g, 15, 1, 1, 31, K.wine);
    R(g, 3, 3, 12, 4, K.bD); R(g, 3, 3, 12, 1, K.bL);          // rear window
    R(g, 3, 8, 12, 10, K.rd0); R(g, 4, 9, 10, 1, K.red);        // roof
    R(g, 3, 18, 12, 5, K.bD); R(g, 4, 18, 4, 1, K.bL); P(g, 4, 19, K.bL); // windscreen
    R(g, 3, 23, 12, 5, K.red); R(g, 4, 24, 10, 1, K.rose);      // bonnet
    R(g, 2, 28, 14, 4, K.wine); R(g, 4, 29, 10, 2, K.s3); R(g, 2, 29, 2, 2, K.yelL); R(g, 14, 29, 2, 2, K.yelL); // grille + lamps
    R(g, 1, 32, 16, 2, K.s1); R(g, 1, 33, 16, 1, K.s3);        // bumper
    R(g, 0, 6, 2, 5, K.s4); R(g, 16, 6, 2, 5, K.s4); R(g, 0, 23, 2, 5, K.s4); R(g, 16, 23, 2, 5, K.s4); // tyres
    R(g, 0, 17, 2, 2, K.wine); R(g, 16, 17, 2, 2, K.wine); // mirrors
    return c;
  }
  function benchCanvas() { return SPR.benchF; }
  function shortArm(s) {
    s = s.replace(/^[NSEW]:\s*/, '').split('·')[0].replace(/\(.*?\)/g, '').trim().toUpperCase();
    const map = { 'PUBLIC FOOTPATH': 'FOOTPATH', 'HARROWBY STATION': 'STATION', 'KESTREL CRAG VIEWPOINT': 'CRAG VIEW', 'KESTREL JUNCTION': 'JUNCTION', 'STATION YARD': 'STN YARD', 'PACKHORSE BRIDGE': 'PACKHORSE', 'LEVEL CROSSING': 'CROSSING', 'STEPPING STONES': 'STEPPING ST', 'FELL PATH': 'FELL PATH', 'KESTRELFORD ROAD': 'K\'FORD RD', 'HOME FARM': 'HOME FARM', 'BECK COTTAGE': 'BECK COTT', 'HARROWBY CHURCH': 'CHURCH', 'HIGH STREET': 'HIGH ST' };
    Object.keys(map).forEach(k => { if (s.indexOf(k) === 0) s = map[k] + s.slice(k.length); });
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length > 11) { const parts = s.split(' '); s = parts[0].slice(0, 11); if (parts.length > 1 && /\d/.test(parts[parts.length - 1]) && s.length + parts[parts.length - 1].length < 12) s += ' ' + parts[parts.length - 1]; }
    return s;
  }
  function fingerpost(fp) {
    const arms = fp.arms.map(a => ({ d: a.trim()[0], t: shortArm(a) }));
    const ord = { N: 0, E: 1, W: 2, S: 3 };
    arms.sort((a, b) => ord[a.d] - ord[b.d]);
    const lw = a => textW(a.t) + 7;
    let left = 4, right = 4;
    arms.forEach(a => { if (a.d === 'W') left = Math.max(left, lw(a) + 2); else right = Math.max(right, lw(a) + 2); });
    const ah = 8, H = arms.length * ah + 14, Wd = left + right + 2;
    const c = cv(Wd, H), g = G(c), px = left;
    R(g, px - 1, 2, 4, H - 2, K.ttOut); R(g, px, 3, 2, H - 4, K.wh); R(g, px + 1, 3, 1, H - 4, K.s0);
    R(g, px - 1, 0, 4, 3, K.ttOut); P(g, px, 1, K.s1);
    arms.forEach((a, i) => {
      const y = 4 + i * ah, s = a.t, w = lw(a);
      if (a.d === 'W') {
        const x1 = px - 1, x0 = x1 - w;
        R(g, x0 + 2, y, w - 2, 7, K.ttOut); R(g, x0 + 1, y + 1, 1, 5, K.ttOut); P(g, x0, y + 3, K.ttOut);
        R(g, x0 + 3, y + 1, w - 4, 5, K.wh); R(g, x0 + 2, y + 2, 1, 3, K.wh);
        text(g, s, x0 + 4, y + 1, K.out);
      } else {
        const x0 = px + 2;
        R(g, x0, y, w - 2, 7, K.ttOut); R(g, x0 + w - 2, y + 1, 1, 5, K.ttOut); P(g, x0 + w - 1, y + 3, K.ttOut);
        R(g, x0 + 1, y + 1, w - 4, 5, K.wh); R(g, x0 + w - 3, y + 2, 1, 3, K.wh);
        text(g, s, x0 + 2, y + 1, K.out);
      }
    });
    return { c, px };
  }
  function noticeBoard() {
    const c = cv(24, 26), g = G(c);
    R(g, 3, 12, 2, 14, K.ttOut); R(g, 19, 12, 2, 14, K.ttOut); P(g, 3, 13, K.wood); P(g, 19, 13, K.wood);
    R(g, 0, 0, 24, 3, K.ttOut); R(g, 1, 1, 22, 1, K.woodD);
    R(g, 1, 3, 22, 14, K.ttOut); R(g, 2, 4, 20, 12, K.g3);
    [[3, 5, 6, 5, K.wh], [10, 5, 5, 7, K.yelL], [16, 6, 5, 5, K.rose], [4, 11, 5, 4, K.bL], [11, 12, 7, 3, K.wh]].forEach(([x, y, w, h, col]) => { R(g, x, y, w, h, col); P(g, x + 1, y, K.red); R(g, x + 1, y + 2, w - 2, 1, K.s1); });
    return c;
  }
  function busStop(size) {
    const W = size * T, c = cv(W + 14, 34), g = G(c);
    // shelter
    R(g, 2, 4, W - 4, 4, K.ttOut); R(g, 3, 5, W - 6, 2, K.s2); R(g, 3, 5, W - 6, 1, K.s1);
    R(g, 3, 8, 2, 24, K.ttOut); R(g, W - 5, 8, 2, 24, K.ttOut);
    R(g, 5, 8, W - 10, 18, 'rgba(192,203,220,0.35)'); R(g, 5, 8, W - 10, 1, K.s0);
    for (let x = 8; x < W - 8; x += 12) R(g, x, 9, 1, 3, 'rgba(255,255,255,0.7)');
    R(g, 7, 22, W - 14, 3, K.ttOut); R(g, 8, 22, W - 16, 2, K.wood);
    R(g, W - 16, 11, 7, 9, K.ttOut); R(g, W - 15, 12, 5, 7, K.wh); R(g, W - 14, 13, 3, 1, K.s2); R(g, W - 14, 15, 3, 1, K.s2);
    // flag on a pole
    const fx = W + 5;
    R(g, fx, 6, 2, 28, K.ttOut); P(g, fx, 7, K.s1);
    R(g, fx - 5, 0, 12, 15, K.ttOut); R(g, fx - 4, 1, 10, 13, K.wh); ell(g, fx + 1, 4, 3, 2, K.red); R(g, fx - 1, 4, 4, 1, K.wh);
    R(g, fx - 4, 8, 10, 6, K.yelL); text(g, '41', fx - 2, 8, K.out);
    return c;
  }
  function memorial() {
    const c = cv(18, 34), g = G(c);
    R(g, 0, 28, 18, 6, K.ttOut); R(g, 1, 29, 16, 4, K.s1); R(g, 1, 29, 16, 1, K.s0);
    R(g, 3, 24, 12, 5, K.ttOut); R(g, 4, 25, 10, 3, K.s1); R(g, 4, 25, 10, 1, K.s0);
    R(g, 6, 5, 6, 20, K.ttOut); R(g, 7, 6, 4, 19, K.s0); R(g, 10, 6, 1, 19, K.s1);
    R(g, 2, 8, 14, 5, K.ttOut); R(g, 3, 9, 12, 3, K.s0); R(g, 3, 11, 12, 1, K.s1);
    R(g, 7, 1, 4, 5, K.ttOut); R(g, 8, 2, 2, 4, K.s0);
    for (let a = 0; a < 12; a++) { const x = 9 + Math.round(4 * Math.cos(a / 12 * 6.283)), y = 27 + Math.round(2 * Math.sin(a / 12 * 6.283)); P(g, x, y, a % 2 ? K.red : K.g3); }
    R(g, 7, 18, 4, 1, K.s2); R(g, 7, 20, 4, 1, K.s2);
    return c;
  }
  function siteBoard() {
    const W = 72, c = cv(W, 40), g = G(c);
    R(g, 6, 24, 3, 16, K.ttOut); R(g, W - 9, 24, 3, 16, K.ttOut); P(g, 7, 25, K.s1); P(g, W - 8, 25, K.s1);
    R(g, 0, 0, W, 29, K.ttOut); R(g, 1, 1, W - 2, 27, K.wh);
    R(g, 1, 1, W - 2, 12, K.bD);
    textC(g, 'KESTREL VALE LINE', W / 2, 2, K.wh); textC(g, 'REOPENING', W / 2, 8, K.yel);
    textC(g, 'VISITORS REPORT', W / 2, 15, K.bD); textC(g, 'TO SITE OFFICE', W / 2, 21, K.bD);
    return c;
  }
  function washingLine(len) {
    const c = cv(len + 4, 26), g = G(c);
    R(g, 1, 4, 2, 22, K.woodD); R(g, len + 1, 4, 2, 22, K.woodD); R(g, 0, 3, 4, 2, K.woodD); R(g, len, 3, 4, 2, K.woodD);
    for (let x = 2; x < len + 2; x++) P(g, x, 4 + Math.round(2 * Math.sin(Math.PI * (x - 2) / len)), K.s1);
    const items = [[8, 10, 12, K.wh, K.s0], [22, 8, 8, K.b, K.bD], [33, 9, 9, K.or, K.yelL], [45, 4, 5, K.red, K.wine], [52, 4, 5, K.red, K.wine], [60, 9, 10, K.yel, K.or]];
    items.forEach(([x, w, h, col, dk]) => {
      if (x + w > len) return;
      const y = 5 + Math.round(2 * Math.sin(Math.PI * (x + w / 2) / len));
      R(g, x, y, w, h, col); R(g, x, y + h - 1, w, 1, dk); R(g, x + w - 1, y, 1, h, dk); P(g, x + 1, y - 1, K.woodD); P(g, x + w - 2, y - 1, K.woodD);
      if (col === K.or) { R(g, x, y + 4, w, 1, K.s0); }
    });
    return c;
  }
  function bufferStop(live) {
    const c = cv(22, 44), g = G(c);
    // timber/steel frame seen from the south: beam across both rails with buffers facing east
    R(g, 2, 12, 6, 28, K.ttOut); R(g, 3, 13, 4, 26, live ? K.red : K.wine);
    for (let y = 14; y < 38; y += 6) R(g, 3, y, 4, 3, live ? K.wh : K.sand);
    [16, 28].forEach(y => { R(g, 7, y, 6, 5, K.ttOut); R(g, 8, y + 1, 4, 3, K.s1); R(g, 12, y, 3, 5, K.ttOut); R(g, 13, y + 1, 1, 3, K.s0); });
    R(g, 0, 36, 10, 4, K.ttOut); R(g, 1, 37, 8, 2, K.brD);
    R(g, 3, 7, 4, 6, K.ttOut); R(g, 4, 8, 2, 3, live ? K.red : K.wine); // lamp
    // the red rose growing up the frame
    [[0, 26], [1, 22], [0, 18], [1, 30]].forEach(([x, y]) => { P(g, x, y, K.g2); P(g, x + 1, y + 1, K.g3); });
    [[0, 21], [1, 25], [0, 29]].forEach(([x, y]) => { R(g, x, y, 2, 2, K.red); P(g, x, y, K.rose); });
    return c;
  }
  function nameBoard(name) {
    const w = textW(name) + 14, c = cv(w, 22), g = G(c);
    R(g, 3, 10, 2, 12, K.ttOut); R(g, w - 5, 10, 2, 12, K.ttOut);
    R(g, 0, 0, w, 12, K.ttOut); R(g, 1, 1, w - 2, 10, K.wh); R(g, 2, 2, w - 4, 8, K.g3);
    textC(g, name, w / 2, 4, K.sand);
    return c;
  }
  function limitBoard(live) {
    const c = cv(48, 26), g = G(c);
    R(g, 22, 12, 2, 14, K.ttOut);
    R(g, 0, 0, 48, 14, K.ttOut); R(g, 1, 1, 46, 12, K.wh); textC(g, 'LIMIT OF', 24, 2, K.out); textC(g, 'CLOSED LINE', 24, 8, K.out);
    if (live) { R(g, 2, 6, 44, 1, K.red); }
    return c;
  }
  function signalColour(aspect) {
    const c = cv(10, 34), g = G(c);
    R(g, 4, 10, 2, 24, K.ttOut); R(g, 3, 31, 4, 3, K.ttOut);
    R(g, 0, 0, 10, 14, K.ttOut); R(g, 1, 1, 8, 12, K.s4);
    const cols = { red: [K.red, K.s3, K.s3], green: [K.s3, K.s3, K.g1], dead: [K.s3, K.s3, K.s3] }[aspect];
    [[2, 2], [2, 6], [2, 10]].forEach(([x, y], i) => { R(g, x + 1, y - 1, 4, 3, cols[i]); if (cols[i] !== K.s3) P(g, x + 1, y - 1, K.wh); });
    R(g, 0, 14, 10, 1, K.ttOut); R(g, 1, 20, 8, 1, K.s3);
    return c;
  }
  function semaphore() { // disused branch home signal: rusty post, arm at danger, lamp out
    const c = cv(20, 44), g = G(c);
    R(g, 8, 4, 3, 40, K.ttOut); R(g, 9, 5, 1, 38, K.br);
    R(g, 7, 0, 5, 4, K.ttOut); P(g, 9, 1, K.brD);
    R(g, 10, 8, 10, 4, K.ttOut); R(g, 11, 9, 8, 2, K.rd0); R(g, 16, 9, 1, 2, K.sand);
    R(g, 5, 10, 4, 4, K.ttOut); P(g, 6, 11, K.s3);
    for (let y = 16; y < 42; y += 4) P(g, 7, y, K.ttOut), P(g, 11, y + 2, K.ttOut);
    return c;
  }
  function crossingSign(live) { // St Andrew's cross + (dead) wig-wag lights on a post
    const c = cv(16, 38), g = G(c);
    R(g, 7, 12, 2, 26, K.ttOut); P(g, 7, 13, K.s1);
    for (let k = 0; k < 11; k++) { R(g, 2 + k, 1 + k, 2, 2, K.ttOut); R(g, 12 - k, 1 + k, 2, 2, K.ttOut); }
    for (let k = 0; k < 10; k++) { P(g, 3 + k, 2 + k, k % 4 < 2 ? K.wh : K.red); P(g, 12 - k, 2 + k, k % 4 < 2 ? K.wh : K.red); }
    R(g, 1, 15, 14, 6, K.ttOut); R(g, 2, 16, 12, 4, K.s4);
    ell(g, 4, 18, 2, 1, live ? K.red : K.wine); ell(g, 12, 18, 2, 1, live ? K.red : K.wine);
    R(g, 5, 22, 6, 4, K.ttOut); R(g, 6, 23, 4, 2, K.yel); // yellow "another train coming" box
    return c;
  }
  function crossingGate(len) { // old white timber gate, left rusted open along the fence
    const c = cv(len, 16), g = G(c);
    R(g, 0, 3, len, 1, K.ttOut); R(g, 0, 12, len, 1, K.ttOut);
    R(g, 0, 4, len, 2, K.s0); R(g, 0, 8, len, 2, K.s0); R(g, 0, 11, len, 1, K.s0);
    for (let x = 0; x < len; x += 6) R(g, x, 4, 1, 8, K.s1);
    R(g, 0, 4, len, 1, K.wh);
    const m = Math.floor(len / 2); ell(g, m, 7, 3, 3, K.ttOut); ell(g, m, 7, 2, 2, K.red);
    for (let k = 0; k < 6; k++) P(g, (hash(k, len, 3) * len) | 0, 5 + (hash(k, 2, len) * 6 | 0), K.br);
    for (let x = 1; x < len; x += 3) { P(g, x, 14, K.g2); P(g, x + 1, 13, K.g1); }
    return c;
  }
  function ppeSign() { // blue & white "PPE beyond this point" plate on a short post
    const c = cv(40, 28), g = G(c);
    R(g, 19, 21, 2, 7, K.ttOut); P(g, 19, 22, K.s1);
    R(g, 0, 0, 40, 22, K.ttOut); R(g, 1, 1, 38, 20, K.wh); R(g, 1, 1, 38, 6, K.bD);
    ell(g, 14, 4, 3, 2, K.wh); R(g, 12, 4, 5, 1, K.bD); P(g, 14, 3, K.bD);
    R(g, 23, 2, 5, 4, K.wh); P(g, 25, 2, K.bD);
    textC(g, 'PPE BEYOND', 20, 8, K.bD); textC(g, 'THIS POINT', 20, 14, K.bD);
    return c;
  }
  function ppeGate(n, vertical, open) {
    const W = vertical ? 16 : n * T, c = cv(W, vertical ? n * T + 8 : 24), g = G(c);
    if (!vertical) {
      R(g, 0, 7, 2, 14, K.ttOut); R(g, W - 2, 7, 2, 14, K.ttOut); P(g, 0, 7, K.s1); P(g, W - 2, 7, K.s1);
      if (!open) {
        const leaves = n > 1 ? 2 : 1, lw = (W - 4) / leaves;
        for (let l = 0; l < leaves; l++) {
          const x0 = 2 + l * lw;
          R(g, x0, 10, lw, 1, K.s2); R(g, x0, 17, lw, 1, K.s2); R(g, x0, 9, lw, 1, K.ttOut); R(g, x0, 19, lw, 1, K.ttOut);
          for (let x = x0 + 1; x < x0 + lw - 1; x += 3) { R(g, x, 7, 2, 12, K.s1); P(g, x, 7, K.s0); P(g, x, 6, K.s2); }
          R(g, x0, 7, 1, 13, K.ttOut); R(g, x0 + lw - 1, 7, 1, 13, K.ttOut);
        }
        const mx = Math.round(W / 2);
        for (let x = mx - 6; x < mx + 6; x += 2) P(g, x, 13, K.s3);
        R(g, mx - 2, 13, 4, 4, K.ttOut); R(g, mx - 1, 14, 2, 2, K.yel); R(g, mx - 1, 11, 2, 2, K.ttOut);
      } else {
        R(g, 2, 0, 2, 20, K.s1); for (let y = 1; y < 20; y += 3) P(g, 2, y, K.s0);
        if (n > 1) { R(g, W - 4, 0, 2, 20, K.s1); for (let y = 1; y < 20; y += 3) P(g, W - 4, y, K.s0); }
      }
      g.fillStyle = SHADOW; g.fillRect(1, 21, W - 1, 2);
    } else {
      const H = n * T;
      if (!open) {
        for (let y = 4; y < H + 6; y += 2) { R(g, 6, y, 4, 1, K.s0); R(g, 6, y + 1, 4, 1, K.s2); }
        R(g, 5, 4, 1, H + 2, K.s2); R(g, 10, 4, 1, H + 2, K.s3);
        R(g, 6, H / 2 + 2, 4, 4, K.ttOut); R(g, 7, H / 2 + 3, 2, 2, K.yel);
      } else { R(g, 3, 4, 2, H + 2, K.s1); }
      g.fillStyle = SHADOW; g.fillRect(10, 4, 2, H + 2);
    }
    return c;
  }
  // public gates: groups of 'g' in a barrier line, drawn open and pinned back (ground layer)
  function drawGates(g, w, S, st) {
    const done = new Set();
    const barrier = c => 'hfk#q'.indexOf(c) >= 0;
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      if (w.at(x, y) !== 'g' || done.has(x + ',' + y)) continue;
      let x1 = x; while (w.at(x1 + 1, y) === 'g') x1++;
      for (let k = x; k <= x1; k++) done.add(k + ',' + y);
      const ew = barrier(w.at(x - 1, y)) || barrier(w.at(x1 + 1, y)) || x1 > x;
      const line = w.at(x - 1, y) !== 'g' && barrier(w.at(x - 1, y)) ? w.at(x - 1, y) : w.at(x1 + 1, y);
      const stone = line === '#', site = line === 'k';
      const px0 = x * T, px1 = (x1 + 1) * T, py = y * T;
      if (ew) {
        const post = (px) => {
          if (stone) { R(g, px - 3, py + 1, 6, 14, K.ttOut); R(g, px - 2, py + 2, 4, 12, K.s1); R(g, px - 3, py, 6, 2, K.s0); }
          else if (site) { R(g, px - 1, py + 2, 2, 11, K.s0); R(g, px - 3, py + 12, 6, 3, K.s1); }
          else { R(g, px - 2, py + 1, 4, 14, K.ttOut); R(g, px - 1, py + 2, 2, 12, K.wood); P(g, px - 1, py + 2, K.woodL); }
        };
        post(px0); post(px1);
        // leaves pinned back over the adjoining barrier
        const leaf = (lx, dir) => {
          const L = Math.min(14, (x1 - x + 1) * 8);
          const a = dir < 0 ? lx - L : lx;
          if (site) { for (let yy = py + 3; yy < py + 12; yy++) for (let xx = a; xx < a + L; xx++) if (((xx + yy) & 1) === 0) P(g, xx, yy, K.s0); R(g, a, py + 2, L, 1, K.s0); R(g, a, py + 12, L, 1, K.s0); return; }
          for (const yy of [py + 4, py + 7, py + 10]) { R(g, a, yy, L, 2, K.ttOut); R(g, a, yy, L, 1, K.woodL); }
          for (let k = 0; k < L; k += 2) P(g, a + (dir < 0 ? L - 1 - k : k), py + 4 + Math.min(7, k * 0.6 | 0), K.wood);
          R(g, dir < 0 ? a + L - 1 : a, py + 3, 2, 10, K.ttOut);
        };
        leaf(px0 - 2, -1); if (x1 > x) leaf(px1 + 2, 1);
      } else {
        // N-S barrier: gate leaf seen edge-on, swung back north
        R(g, px0 + 6, py - 6, 3, 10, K.ttOut); R(g, px0 + 7, py - 5, 1, 8, stone ? K.s1 : K.woodL);
        R(g, px0 + 5, py + 12, 5, 4, K.ttOut); R(g, px0 + 6, py + 12, 3, 3, stone ? K.s1 : K.wood);
      }
    }
    // PPE access gates: objects with an open variant + blue/white board
    const pg = w.level.gates && w.level.gates.ppe ? w.level.gates.ppe.slice() : [];
    const byRow = {};
    pg.forEach(([x, y]) => { (byRow[y] = byRow[y] || []).push(x); });
    Object.keys(byRow).forEach(yk => {
      const y = +yk, xs = byRow[y].sort((a, b) => a - b);
      let grp = [];
      const flush = () => {
        if (!grp.length) return;
        const x0 = grp[0], x1 = grp[grp.length - 1];
        const vertical = !(barrier(w.at(x0 - 1, y)) || barrier(w.at(x1 + 1, y))) && (barrier(w.at(x0, y - 1)) || barrier(w.at(x0, y + 1)));
        const n = x1 - x0 + 1;
        obj(S, ppeGate(n, vertical, false), x0 * T, y * T + 14 - 22, y * T + 14, null, { kind: 'ppe_gate', tiles: grp.map(x => [x, y]), imgOpen: ppeGate(n, vertical, true) });
        // pick the side of the gate where the plate hides the least walkable ground / defect stands
        const stands = new Set(); (w.level.outside || []).forEach(o => { if (o.tile) stands.add(o.tile.join(',')); if (o.stand) stands.add(o.stand.join(',')); });
        const cost = (tx0) => { let n = 0; for (let yy = y - 1; yy <= y; yy++) for (let xx = tx0; xx < tx0 + 3; xx++) { if (w.walk(xx, yy)) n++; if (stands.has(xx + ',' + yy) || stands.has(xx + ',' + (yy - 1))) n += 10; } return n; };
        const right = (x1 + 1) * T + 1, left = x0 * T - 41;
        const signX = cost(x1 + 1) <= cost(x0 - 3) ? right : left;
        const sc = ppeSign();
        obj(S, sc, signX, y * T + 15 - sc.height, y * T + 14, { x: signX - 2, y: y * T - 14, w: 44, h: 16 }, { kind: 'sign' });
        grp = [];
      };
      xs.forEach(x => { if (grp.length && x !== grp[grp.length - 1] + 1) flush(); grp.push(x); });
      flush();
    });
  }

  function drawProps(g, w, S, st) {
    const L = w.level, lamps = (L.lamps && L.lamps.tiles) || [];
    lamps.forEach(([x, y]) => {
      let ox = 0;
      const ch = w.at(x, y);
      const moira = ch === 'm' && w.at(x, y - 1) === '*' && y < 20;
      if (ch === 'm' || '123*'.indexOf(w.at(x, y - 1)) >= 0) ox = -11;
      const img = moira ? railwayLamp() : SPR.lamp;
      const lx = x * T + 8 + ox - Math.floor(img.width / 2), ly = y * T + 15 - img.height;
      footShadow(g, x * T + 8 + ox, y * T + 14, 3);
      obj(S, img, lx, ly, y * T + 14, null, { kind: 'lamp' });
      S.lights.push({ x: x * T + 8 + ox, y: ly + 5, r: 44, lamp: true });
    });
    (L.benches || []).forEach(([x, y]) => {
      footShadow(g, x * T + 8, y * T + 14, 7);
      obj(S, SPR.benchF, x * T, y * T, y * T + 14, null, { kind: 'bench' });
    });
    (L.fingerposts || []).forEach(fp => {
      const [x, y] = fp.tile, { c, px } = fingerpost(fp);
      const dx = x * T + 8 - px, dy = y * T + 15 - c.height;
      footShadow(g, x * T + 8, y * T + 14, 3);
      obj(S, c, dx, dy, y * T + 14, { x: dx, y: dy, w: c.width, h: y * T + 6 - dy }, { kind: 'fingerpost' });
    });
    (L.outside || []).forEach(o => {
      if (o.kind !== 'prop') return;
      const [x, y] = o.tile;
      if (o.id === 'car') { const c = carCanvas(); shadowPoly(g, x * T, y * T + 4, x * T + 16, y * T + 32, 4); obj(S, c, x * T - 1, y * T - 2, (y + (o.size ? o.size[1] : 2)) * T - 1, null, { kind: 'car' }); }
      if (o.id === 'postbox') { const c = pillarBox(); footShadow(g, x * T + 8, y * T + 14, 5); obj(S, c, x * T + 3, y * T + 15 - c.height, y * T + 14, null, { kind: 'postbox' }); }
      if (o.id === 'noticeboard') { const c = noticeBoard(); footShadow(g, x * T + 8, y * T + 14, 8); obj(S, c, x * T - 4, y * T + 15 - c.height, y * T + 14, { x: x * T - 6, y: y * T - 12, w: 28, h: 14 }, { kind: 'noticeboard' }); }
      if (o.id === 'busstop') { const n = o.size ? o.size[0] : 3, c = busStop(n); shadowPoly(g, x * T + 2, y * T + 6, (x + n) * T - 2, y * T + 15, 4); obj(S, c, x * T, y * T + 15 - c.height, y * T + 14, { x: x * T, y: y * T - 20, w: n * T + 14, h: 22 }, { kind: 'busstop' }); }
      if (o.id === 'war_memorial') { const c = memorial(); footShadow(g, x * T + 8, y * T + 14, 9); obj(S, c, x * T - 1, y * T + 15 - c.height, y * T + 14, { x: x * T - 2, y: y * T - 18, w: 20, h: 18 }, { kind: 'memorial' }); }
      if (o.id === 'site_board') { const c = siteBoard(), dx = (x + 1) * T - c.width - 2; obj(S, c, dx, y * T + 15 - c.height, y * T + 14, { x: dx, y: y * T - 26, w: c.width, h: 26 }, { kind: 'site_board' }); }
      if (o.id === 'washing_line') { const c = washingLine(72), dx = x * T - 32; obj(S, c, dx, y * T + 15 - c.height, y * T + 14, { x: dx, y: y * T - 12, w: c.width, h: 14 }, { kind: 'washing' }); }
    });
    // buffer stop with the red rose
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (w.at(x, y) === '$' && w.at(x, y - 1) !== '$') {
      const c = bufferStop(st.live); obj(S, c, x * T + 2, y * T + 2 - 6, (y + 2) * T - 1, null, { kind: 'buffer' });
      S.lights.push({ x: x * T + 7, y: y * T + 5, r: 10 });
    }
    // platform running-in board + canopy over the platform
    let pe0 = -1, pe1 = -1; for (let x = 0; x < w.W; x++) if (w.at(x, 23) === 'e') { if (pe0 < 0) pe0 = x; pe1 = x; }
    if (pe0 >= 0) {
      const nb = nameBoard('HARROWBY'), bx = (pe1 - 5) * T;
      obj(S, nb, bx, 25 * T + 14 - nb.height + 2, 25 * T + 14, { x: bx - 2, y: 23 * T, w: nb.width + 4, h: 2 * T }, { kind: 'sign' });
      const stn = w.buildings.find(b => b.letter === 'S');
      if (stn) {
        const cx0 = (stn.x0 + 1) * T, cx1 = (stn.x1) * T, cy0 = 23 * T - 2, cy1 = 25 * T + 2;
        const c = cv(cx1 - cx0, cy1 - cy0 + 12), cg = G(c);
        roofRect(cg, 0, 0, cx1 - cx0, 18, 'slate');
        for (let xx = 0; xx < cx1 - cx0; xx++) { const k = xx % 4; R(cg, xx, 18, 1, k < 2 ? 4 : 2, k === 0 ? K.s0 : K.sand); P(cg, xx, 18 + (k < 2 ? 4 : 2), K.ttOut); }
        for (let xx = 6; xx < cx1 - cx0; xx += 32) { R(cg, xx, 20, 2, c.height - 20, K.ttOut); R(cg, xx, 20, 1, c.height - 22, K.g3); R(cg, xx - 1, c.height - 3, 4, 3, K.ttOut); }
        // hanging platform lamp
        R(cg, (cx1 - cx0) / 2, 22, 1, 3, K.ttOut); R(cg, (cx1 - cx0) / 2 - 2, 25, 5, 4, K.ttOut); R(cg, (cx1 - cx0) / 2 - 1, 26, 3, 2, st.live ? K.yelL : K.s3);
        obj(S, c, cx0, cy0, 24 * T + 15, { x: cx0, y: 22 * T + 8, w: cx1 - cx0, h: 2 * T + 6 }, { kind: 'canopy' });
        g.fillStyle = 'rgba(38,43,68,0.22)'; g.fillRect(cx0 + 4, 23 * T + 20, cx1 - cx0 - 4, 10);
      }
    }
    // limit of closed line board, signals
    const RL = S._rail || { ty: 20, jx0: 117 }, lbx = RL.jx0 - 1, lby = RL.ty + 2;
    const lb = limitBoard(st.live); obj(S, lb, lbx * T + 8 - 23, lby * T + 15 - lb.height, lby * T + 14, { x: lbx * T - 16, y: (lby - 1) * T, w: 48, h: 16 }, { kind: 'sign' });
    let mainX = -1; for (let x = 0; x < w.W; x++) if (w.at(x, 0) === '|') { mainX = x; break; }
    if (mainX > 0) {
      const s1 = signalColour('green'); obj(S, s1, (mainX - 1) * T + 3, 30 * T + 15 - s1.height, 30 * T + 14, null, { kind: 'signal' }); S.lights.push({ x: (mainX - 1) * T + 8, y: 30 * T - 8, r: 8 });
      const s2 = signalColour('red'); obj(S, s2, (mainX + 4) * T + 3, 12 * T + 15 - s2.height, 12 * T + 14, null, { kind: 'signal' }); S.lights.push({ x: (mainX + 4) * T + 8, y: 12 * T - 16, r: 8 });
      const s3 = signalColour(st.live ? 'red' : 'dead'); obj(S, s3, (mainX - 2) * T + 3, 18 * T + 15 - s3.height, 18 * T + 14, null, { kind: 'signal' });
    }
    if (w.at(36, RL.ty - 2) === 'f') { const sem = semaphore(); obj(S, sem, 36 * T, (RL.ty - 2) * T + 15 - sem.height, (RL.ty - 2) * T + 14, null, { kind: 'signal' }); }
    // Crag Lane crossing furniture
    const cross = []; for (let x = 0; x < w.W; x++) if (w.at(x, RL.ty) === 'x') cross.push(x);
    if (cross.length) {
      const x0 = cross[0], x1 = cross[cross.length - 1];
      let ny = RL.ty; while (w.at(x0, ny - 1) === 'x') ny--;
      let sy = RL.ty; while (w.at(x0, sy + 1) === 'x') sy++;
      if (!st.live) {
        const gl = crossingGate(40);
        g.drawImage(gl, (x0 - 1) * T - 40 + 14, ny * T + 1); g.drawImage(gl, (x1 + 1) * T + 2, ny * T + 1);
        g.drawImage(gl, (x0 - 1) * T - 40 + 14, sy * T + 1); g.drawImage(gl, (x1 + 1) * T + 2, sy * T + 1);
        [[x0 - 1, ny], [x1 + 1, ny], [x0 - 1, sy], [x1 + 1, sy]].forEach(([px, py]) => { R(g, px * T + 6, py * T - 2, 5, 17, K.ttOut); R(g, px * T + 7, py * T - 1, 3, 15, K.wh); R(g, px * T + 6, py * T - 4, 5, 3, K.ttOut); });
      } else {
        [[x0 - 1, ny - 1], [x1 + 1, sy + 1]].forEach(([px, py]) => { R(g, px * T + 5, py * T + 2, 6, 12, K.ttOut); R(g, px * T + 6, py * T + 3, 4, 10, K.s0); });
      }
      const cs = crossingSign(st.live);
      obj(S, cs, (x1 + 1) * T + 8 - 8, (ny - 1) * T + 15 - cs.height, (ny - 1) * T + 14, { x: (x1 + 1) * T - 4, y: (ny - 3) * T, w: 24, h: 2 * T }, { kind: 'sign' });
      obj(S, cs, (x0 - 1) * T + 8 - 8, (sy + 1) * T + 15 - cs.height, (sy + 1) * T + 14, { x: (x0 - 1) * T - 4, y: (sy - 1) * T, w: 24, h: 2 * T }, { kind: 'sign' });
      // control cabinet
      const cb = cv(12, 16), cg = G(cb); R(cg, 0, 0, 12, 16, K.ttOut); R(cg, 1, 1, 10, 14, K.s1); R(cg, 1, 1, 10, 2, K.s0); R(cg, 5, 4, 1, 10, K.s2); P(cg, 8, 8, K.yel);
      obj(S, cb, (x1 + 2) * T + 2, (sy + 1) * T + 15 - 16, (sy + 1) * T + 14, null, { kind: 'cabinet' });
    }
    // rail bridge deck over the road (object: fades when you walk underneath)
    if (mainX > 0) {
      let y0 = -1, y1 = -1; for (let y = 0; y < w.H; y++) if (w.at(mainX, y) === '%') { if (y0 < 0) y0 = y; y1 = y; }
      if (y0 >= 0) {
        const X0 = (mainX - 1) * T + 8, Wd = 6 * T - 16, Y0 = y0 * T - 4, Hh = (y1 - y0 + 1) * T + 12;
        const c = cv(Wd, Hh), cg = G(c);
        R(cg, 0, 0, Wd, Hh, K.s2);
        const lv = railKind('live');
        for (let k = 0; k < 2; k++) trackV(cg, 8 + k * 32, 0, Hh - 10, lv);
        R(cg, 0, 0, 6, Hh - 10, K.s1); R(cg, 0, 0, 2, Hh - 10, K.s0); R(cg, Wd - 6, 0, 6, Hh - 10, K.s1); R(cg, Wd - 2, 0, 2, Hh - 10, K.s0);
        R(cg, 6, 0, 1, Hh - 10, K.s3); R(cg, Wd - 7, 0, 1, Hh - 10, K.s3);
        R(cg, 0, Hh - 10, Wd, 10, K.s3); for (let xx = 0; xx < Wd; xx += 6) R(cg, xx, Hh - 10, 1, 10, K.s4); R(cg, 0, Hh - 10, Wd, 1, K.s1); R(cg, 0, Hh - 1, Wd, 1, K.s4);
        obj(S, c, X0, Y0, (y1 + 1) * T + 2, { x: X0, y: y0 * T - 2, w: Wd, h: (y1 - y0 + 1) * T + 4 }, { kind: 'bridge' });
        g.fillStyle = 'rgba(24,20,37,0.35)'; g.fillRect(X0 + 2, y0 * T, Wd, (y1 - y0 + 1) * T);
      }
    }
  }

  /* ================================================================== OUTSIDE scene */
  function buildOutside(level, opts) {
    if (!IMG.tt) throw new Error('TileArt.buildOutside: call TileArt.load() first');
    opts = opts || {};
    level = level || LS.LEVEL;
    const st = { live: opts.lineState === 'live', season: opts.season || 'spring' };
    const w = mkWorld(level);
    w.buildings = findBuildings(w);
    const S = { w: w.W * T, h: w.H * T, ground: cv(w.W * T, w.H * T), objects: [], lights: [], anchors: {}, anim: { glints: [], ripples: [], flash: [], smoke: [] }, kind: 'outside' };
    const g = G(S.ground);
    const tm = {}, now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let t0 = now();
    const step = (name, fn) => { fn(); const t1 = now(); tm[name] = Math.round((t1 - t0) * 10) / 10; t0 = t1; };
    step('base', () => drawBase(g, w, st));
    step('water', () => drawWater(g, w, S));
    step('roads', () => { drawRoadEdges(g, w); drawMarkings(g, w); });
    step('rail', () => drawRailway(g, w, S, st));
    const junc = S._curves && S._curves.junc;
    S._skipFence = (x, y) => {
      if (!junc) return false;
      for (let s = 0; s <= junc.len; s += 4) { const p = junc.at(s); if (Math.abs(p.x - (x * T + 8)) < 20 && Math.abs(p.y - (y * T + 8)) < 20) return true; }
      return false;
    };
    step('bridges', () => drawBridges(g, w, S, st));
    step('bounds', () => drawBoundaries(g, w, S, st));
    step('gates', () => drawGates(g, w, S, st));
    step('trees', () => drawTrees(g, w, S, st));
    step('buildings', () => buildBuildings(g, w, S, st));
    step('props', () => drawProps(g, w, S, st));
    S.timing = tm;
    // anchors
    const sp = S._beck || [];
    const beckAt = (y) => sp[y] ? { x: Math.round((sp[y][0] + sp[y][1] + 1) * T / 2), y: y * T + 10 } : null;
    S.anchors.duckBeck = beckAt(64) || beckAt(45) || { x: 0, y: 0 };
    S.anchors.duck = S._duck || S.anchors.duckBeck; // closed line: paddling in the flooded cess by the blocked drain
    S.anchors.duck2 = beckAt(46) || S.anchors.duckBeck;
    const r = rng(99); let n = 0;
    for (let k = 0; k < 400 && n < 6; k++) {
      const x = 3 + Math.floor(r() * (w.W - 6)), y = Math.floor(r() * w.H);
      let ok = w.at(x, y) === '"';
      for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -2; dx <= 2 && ok; dx++) if (w.at(x + dx, y + dy) !== '"') ok = false;
      if (ok) { S.anchors['sheep' + (++n)] = { x: x * T + 8, y: y * T + 12 }; }
    }
    (level.doors || []).forEach(d => { S.anchors[d.id] = { x: d.tile[0] * T + 8, y: (d.tile[1] + 1) * T }; });
    // chimney smoke for a few homes
    w.buildings.filter(b => 'VMF'.indexOf(b.letter) >= 0).forEach((b, i) => S.anim.smoke.push({ x: b.x0 * T + 8, y: b.y0 * T - 14, p: i * 0.37 }));
    S.objects.sort((a, b) => a.sortY - b.sortY);
    delete S._skipFence; delete S._curves; delete S._beck; delete S._rail; delete S._duck;
    return S;
  }

  /* ================================================================== animated overlays */
  function drawAnimated(ctx, scene, t, x0, y0, x1, y1) {
    if (!scene || !scene.anim) return;
    const A = scene.anim;
    t = (t || 0) * 1000; // engine passes seconds
    if (x0 == null) { x0 = 0; y0 = 0; x1 = scene.w; y1 = scene.h; }
    const inR = (x, y, m) => x >= x0 - m && x <= x1 + m && y >= y0 - m && y <= y1 + m;
    ctx.fillStyle = K.bL;
    for (let i = 0; i < A.glints.length; i++) {
      const q = A.glints[i]; if (!inR(q.x, q.y, 4)) continue;
      const ph = Math.floor(t / 520 + q.p) % 3;
      if (ph === 0) ctx.fillRect(q.x, q.y, q.l, 1);
      else if (ph === 1) { ctx.fillRect(q.x + 1, q.y, q.l - 1, 1); }
    }
    for (let i = 0; i < A.ripples.length; i++) {
      const q = A.ripples[i]; if (!inR(q.x, q.y, 10)) continue;
      const k = ((t / 1700 + q.p) % 1 + 1) % 1, rx = 2 + Math.round(k * 5), ry = 1 + Math.round(k * 2);
      ctx.globalAlpha = 0.7 * (1 - k); ctx.fillStyle = K.wh;
      for (let a = 0; a < 14; a++) { const an = a / 14 * Math.PI * 2; ctx.fillRect(Math.round(q.x + Math.cos(an) * rx), Math.round(q.y + Math.sin(an) * ry), 1, 1); }
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < A.flash.length; i++) {
      const q = A.flash[i]; if (!inR(q.x, q.y, 8)) continue;
      const on = ((t / 1100 + (q.p || 0)) % 1) < 0.35;
      if (on) { ctx.fillStyle = K.yelL; ctx.fillRect(q.x, q.y, 2, 2); ctx.globalAlpha = 0.35; ctx.fillStyle = q.col || K.or; ctx.fillRect(q.x - 2, q.y - 1, 6, 4); ctx.globalAlpha = 1; }
    }
    for (let i = 0; i < A.smoke.length; i++) {
      const q = A.smoke[i]; if (!inR(q.x, q.y, 30)) continue;
      for (let k = 0; k < 3; k++) {
        const ph = ((t / 2600 + q.p + k / 3) % 1);
        const px = Math.round(q.x + Math.sin(ph * 5 + k) * 2 + ph * 6), py = Math.round(q.y - ph * 22);
        ctx.globalAlpha = 0.45 * (1 - ph); ctx.fillStyle = K.s0;
        const s = 2 + Math.round(ph * 3); ctx.fillRect(px, py, s, s - 1);
        ctx.globalAlpha = 1;
      }
    }
    if (A.custom) A.custom.forEach(fn => fn(ctx, t, x0, y0, x1, y1));
  }

  /* ================================================================== actors (RPG Urban bodies, palette-swapped per look) */
  const LOOKS = new Map();
  const EX = { BANDV: 21, SHIRT: 22, TIE: 23, APRON: 24, APRON_DK: 25, ZIP: 26 };
  function lookSheet(look, ppe) {
    const key = JSON.stringify(look || {}) + (ppe ? '|ppe' : '');
    let sh = LOOKS.get(key); if (sh) return sh;
    look = look || {};
    const cw = CHAR.cw, ch = CHAR.ch, cells = CHAR.cells;
    const style = cells[look.hairStyle] ? look.hairStyle : 'short';
    const hard = !!(ppe || look.hat);
    const capOn = !hard && !!look.cap;
    const vest = ppe && look.topStyle !== 'hivis';
    const topCol = vest ? '#feae34' : (look.top || '#3e8948');
    const hiVis = look.topStyle === 'hivis' || vest;
    const legsCol = look.legs || (look.topStyle === 'suit' ? shade(look.top || '#34506e', -0.35) : '#3a4466');
    const hatCol = hard ? (look.hat || '#f4f1ea') : (look.cap || '#5a6988');
    const skin = look.skin || '#e8b796', hair = look.hair || '#5a3a26';
    const bandCol = /^#f|#e/.test(topCol) && hexRGB(topCol)[1] > 190 ? '#dfe6ee' : '#fee761';
    const PAL = {};
    PAL[CL.OUT] = '#3e2731';
    PAL[CL.HAIR_HI] = shade(hair, 0.28); PAL[CL.HAIR] = hair; PAL[CL.HAIR_DK] = shade(hair, -0.32);
    PAL[CL.SKIN_HI] = shade(skin, 0.14); PAL[CL.SKIN] = skin; PAL[CL.SKIN_DK] = shade(skin, -0.2);
    PAL[CL.EYE] = '#262b44'; PAL[CL.MOUTH] = shade(skin, -0.32);
    PAL[CL.TOP_HI] = shade(topCol, 0.22); PAL[CL.TOP] = topCol; PAL[CL.TOP_DK] = shade(topCol, -0.3);
    PAL[CL.LEGS] = legsCol; PAL[CL.LEGS_DK] = shade(legsCol, -0.3); PAL[CL.SHOE] = '#262b44';
    PAL[CL.HAT] = hatCol; PAL[CL.HAT_DK] = shade(hatCol, -0.28); PAL[CL.HAT_HI] = shade(hatCol, 0.35); PAL[CL.BAND] = shade(hatCol, -0.45);
    PAL[CL.FRAME] = '#262b44';
    PAL[EX.BANDV] = bandCol; PAL[EX.SHIRT] = '#f4f1ea'; PAL[EX.TIE] = look.topStyle === 'suit' ? '#a22633' : shade(topCol, -0.4);
    PAL[EX.APRON] = look.apron || '#f3ecdf'; PAL[EX.APRON_DK] = shade(look.apron || '#f3ecdf', -0.18); PAL[EX.ZIP] = shade(topCol, -0.42);
    const rgb = {}; Object.keys(PAL).forEach(k => { rgb[k] = hexRGB(PAL[k]); });
    const c = cv(cw * 4, ch * 3), g = G(c), img = g.createImageData(c.width, c.height), D = img.data;
    const dirs = [['down', 1, false], ['up', 2, false], ['left', 0, false], ['right', 0, true]];
    const topSet = new Set([CL.TOP, CL.TOP_HI, CL.TOP_DK]);
    dirs.forEach(([, view, mirror], di) => {
      for (let f = 0; f < 3; f++) {
        const k = view * 3 + f, a = new Uint8Array(cells[style][k]);
        const over = (name) => { const o = cells[name] && cells[name][k]; if (!o) return; for (let i = 0; i < a.length; i++) if (o[i]) a[i] = o[i] === CL.ERASE ? 0 : o[i]; };
        if (hard) {
          const o = cells.o_hardhat[k]; let top = ch;
          for (let i = 0; i < o.length; i++) if (o[i] && o[i] !== CL.ERASE) { top = Math.min(top, Math.floor(i / cw)); }
          for (let i = 0; i < top * cw; i++) a[i] = 0;
          over('o_hardhat');
        } else if (capOn) over('o_cap');
        if (look.beard) over('o_beard');
        if (look.glasses) over('o_glasses');
        // torso styling
        let t0 = ch, t1 = -1;
        for (let i = 0; i < a.length; i++) if (topSet.has(a[i])) { const y = Math.floor(i / cw); t0 = Math.min(t0, y); t1 = Math.max(t1, y); }
        if (t1 >= 0) {
          for (let y = t0; y <= t1; y++) for (let x = 0; x < cw; x++) {
            const i = y * cw + x; if (!topSet.has(a[i])) continue;
            if (hiVis) { if (y === t0 + 1) a[i] = EX.BANDV; }
            else if (look.topStyle === 'suit' && view === 1) { if (y === t0 && (x === 7 || x === 8)) a[i] = EX.SHIRT; if (y === t0 + 1 && x === 8) a[i] = EX.TIE; if (y === t0 + 1 && x === 7) a[i] = EX.SHIRT; }
            else if (look.topStyle === 'cardigan' && view === 1) { if (y > t0 && (x === 7 || x === 8)) a[i] = EX.SHIRT; }
            else if (look.topStyle === 'jacket') { if (y === t0) a[i] = CL.TOP_HI; if (view === 1 && y > t0 && x === 8) a[i] = EX.ZIP; }
          }
          if (look.apron && view !== 2) {
            const xa = view === 1 ? [6, 9] : [4, 7];
            for (let y = t0 + 1; y <= t1 + 2; y++) for (let x = xa[0]; x <= xa[1]; x++) { const i = y * cw + x; if (a[i] && a[i] !== CL.OUT && a[i] !== CL.SKIN && a[i] !== CL.SKIN_DK && a[i] !== CL.SKIN_HI) a[i] = (x === xa[1]) ? EX.APRON_DK : EX.APRON; }
          }
        }
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
          const v = a[y * cw + (mirror ? cw - 1 - x : x)]; if (!v) continue;
          const col = rgb[v] || rgb[CL.OUT], o = ((f * ch + y) * c.width + di * cw + x) * 4;
          D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
        }
      }
    });
    g.putImageData(img, 0, 0);
    sh = c; LOOKS.set(key, sh);
    return sh;
  }
  const DIRI = { down: 0, up: 1, left: 2, right: 3 };
  const WALK = [0, 1, 0, 2];
  function drawActor(ctx, look, x, y, facing, frame, opts) {
    if (!CHAR) return;
    opts = opts || {};
    const sh = lookSheet(look, !!opts.ppe);
    const di = DIRI[facing] != null ? DIRI[facing] : 0;
    const f = (opts.moving === false || !frame) ? 0 : WALK[((frame | 0) % 4 + 4) % 4];
    const a = opts.alpha == null ? 1 : opts.alpha, prev = ctx.globalAlpha;
    const X = Math.round(x), Y = Math.round(y);
    ctx.globalAlpha = prev * a;
    if (opts.shadow !== false) ctx.drawImage(SPR.shadowActor, X - 6, Y - 3);
    ctx.drawImage(sh, di * CHAR.cw, f * CHAR.ch, CHAR.cw, CHAR.ch, X - 8, Y - CHAR.ch + 1, CHAR.cw, CHAR.ch);
    ctx.globalAlpha = prev;
  }

  /* ================================================================== animals (drawn here in ENDESGA-32) */
  const ANI = {};
  function aniSprites() {
    if (ANI.ready) return ANI;
    const mk = (w, h, fn) => { const c = cv(w, h); fn(G(c)); return c; };
    // Sleeper the depot cat: ginger tabby curled nose-to-tail (two breathing frames)
    const cat = (breathe) => mk(16, 10, g => {
      const b = breathe ? 1 : 0;
      R(g, 2, 3 - b, 11, 6 + b, K.out); R(g, 1, 4, 13, 4, K.out);
      R(g, 3, 4 - b, 9, 4 + b, K.or0); R(g, 2, 5, 11, 2, K.or0); R(g, 3, 4 - b, 9, 1, K.tan);
      [[5, 4], [8, 5], [10, 4]].forEach(([x, y]) => R(g, x, y - b, 1, 2, K.brD));
      R(g, 1, 7, 7, 2, K.out); R(g, 2, 7, 6, 1, K.or0); P(g, 2, 7, K.tan);   // tail wrapped round
      R(g, 10, 3 - b, 4, 4, K.out); R(g, 11, 4 - b, 3, 2, K.or0); P(g, 11, 2 - b, K.out); P(g, 13, 2 - b, K.out); // head tucked
      P(g, 12, 5 - b, K.out);
    });
    ANI.cat = [cat(0), cat(1)];
    ANI.duck = [0, 1].map(k => mk(12, 9, g => {
      R(g, 1, 3, 10, 5, K.out); R(g, 2, 4, 8, 3, K.s1); R(g, 2, 4, 8, 1, K.s0); R(g, 8, 3, 3, 3, K.brD); R(g, 9, 6, 2, 1, K.brD);
      R(g, 1, 5, 2, 2, K.s3); // tail
      R(g, 7, 0, 4, 4, K.out); R(g, 8, 1, 2, 2, K.g2); P(g, 9, 1, K.g1); R(g, 11, 2, 1, 1, K.yel); P(g, 8, 3, K.wh);
      if (k) R(g, 3, 3, 3, 1, K.s0);
      R(g, 1, 8, 10, 1, 'rgba(18,78,137,0.6)');
    }));
    ANI.sheep = [0, 1].map(k => mk(16, 13, g => {
      R(g, 3, 9, 2, 4, K.s4); R(g, 10, 9, 2, 4, K.s4);
      R(g, 1, 2, 13, 9, K.out); R(g, 2, 1, 11, 1, K.out);
      R(g, 2, 2, 11, 8, K.wh); R(g, 2, 8, 11, 2, K.s0);
      [[3, 3], [6, 2], [9, 3], [5, 5], [10, 6], [3, 7]].forEach(([x, y]) => P(g, x, y, K.s0));
      const hy = k ? 6 : 3;
      R(g, 11, hy, 5, 5, K.out); R(g, 12, hy + 1, 3, 3, K.s4); P(g, 14, hy + 1, K.s3); P(g, 13, hy + 1, K.wh);
      R(g, 11, hy - 1, 2, 1, K.s4);
    }));
    ANI.pigeon = [0, 1].map(k => mk(10, 9, g => {
      R(g, 1, 3, 8, 5, K.out); R(g, 2, 4, 6, 3, K.s1); R(g, 2, 6, 6, 1, K.s2); R(g, 1, 4, 2, 2, K.s3);
      const hx = k ? 7 : 6;
      R(g, hx, 0, 3, 4, K.out); R(g, hx, 1, 2, 2, K.s2); P(g, hx, 3, K.mag); P(g, hx + 1, 3, K.g2); P(g, hx + 3, 2, K.s0); P(g, hx + 1, 1, K.out);
      R(g, 3, 8, 1, 1, K.rose); R(g, 6, 8, 1, 1, K.rose);
    }));
    ANI.ready = true;
    return ANI;
  }
  function drawAnimal(ctx, kind, x, y, t, opts) {
    if (!IMG.tt) return;
    opts = opts || {};
    const A = aniSprites(), X = Math.round(x), Y = Math.round(y);
    t = (t || 0) * 1000; // seconds -> ms
    const flip = opts.facing === 'left' || opts.face === 'left' || opts.face === -1;
    const put = (spr, dx, dy) => {
      if (flip) { ctx.save(); ctx.translate(X + dx + spr.width, Y + dy); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); }
      else ctx.drawImage(spr, X + dx, Y + dy);
    };
    const prev = ctx.globalAlpha; if (opts.alpha != null) ctx.globalAlpha = prev * opts.alpha;
    if (kind === 'cat') {
      ctx.drawImage(SPR.shadowActor, X - 6, Y - 3);
      put(A.cat[Math.floor(t / 900) % 2], -8, -9);
      for (let k = 0; k < 3; k++) {
        const ph = ((t / 2400) + k / 3) % 1, zx = X + 5 + Math.round(ph * 6 + Math.sin(ph * 6) * 1.5), zy = Y - 11 - Math.round(ph * 12);
        ctx.globalAlpha = prev * (1 - ph) * 0.9; ctx.fillStyle = K.wh;
        const s = ph < 0.4 ? 2 : 3;
        ctx.fillRect(zx, zy, s, 1); ctx.fillRect(zx + s - 2, zy + 1, 1, 1); if (s === 3) ctx.fillRect(zx + 1, zy + 1, 1, 1); ctx.fillRect(zx, zy + 2, s, 1);
      }
      ctx.globalAlpha = prev;
    } else if (kind === 'duck') {
      const bob = Math.round(Math.sin(t / 420) * 1);
      put(A.duck[Math.floor(t / 1300) % 2], -6, -8 + bob);
      ctx.globalAlpha = prev * 0.5; ctx.fillStyle = K.wh; ctx.fillRect(X - 7, Y + 1, 2, 1); ctx.fillRect(X + 6, Y + 1, 2, 1); ctx.globalAlpha = prev;
    } else if (kind === 'sheep') {
      ctx.drawImage(SPR.shadowActor, X - 6, Y - 2);
      const graze = (Math.floor(t / 1700 + (opts.seed || X * 0.013)) % 3) === 0 ? 1 : 0;
      put(A.sheep[graze], -8, -12);
    } else if (kind === 'pigeon') {
      const bob = (Math.floor(t / 350) % 4) === 0 ? 1 : 0;
      put(A.pigeon[bob], -5, -8);
    }
    ctx.globalAlpha = prev;
  }

  /* ================================================================== ROOMS (3/4 interiors) */
  const ROOM_STYLE = {
    office: { wallUp: K.s0, wallLo: K.s0, dado: K.s1, skirt: K.bD, cap: K.s3, floor: 'carpet' },
    hall: { wallUp: K.tan, wallLo: K.wood, dado: K.woodD, skirt: K.woodD, cap: K.brD, floor: 'parquet' },
    shed: { wallUp: 'brick', wallLo: 'brick', dado: K.brD, skirt: K.s3, cap: K.brD, floor: 'concrete' }
  };
  function floorTile(g, kind, x, y) {
    const px = x * T, py = y * T;
    if (kind === 'carpet') {
      R(g, px, py, T, T, ((x + y) & 1) ? '#62728f' : K.s2);
      for (let k = 0; k < 5; k++) P(g, px + (hash(x, y, k) * 16 | 0), py + (hash(y, x, k) * 16 | 0), shade(K.s2, -0.12));
      if (((x + y) & 1) === 0) for (let k = 2; k < 14; k += 4) R(g, px + k, py + 2, 1, 12, shade(K.s2, 0.06));
    } else if (kind === 'parquet') {
      for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) {
        const bx = px + i * 8, by = py + j * 4 + (i ? 2 : 0), c = hash(x * 2 + i, y * 4 + j, 3) < 0.5 ? K.woodL : K.woodM;
        R(g, bx, by, 8, 4, c); R(g, bx, by + 3, 8, 1, K.wood); R(g, bx + 7, by, 1, 4, K.wood);
      }
    } else { // concrete
      g.drawImage(texAt(SPR.textures.concrete, x, y), px, py);
      if (hash(x, y, 9) < 0.12) { ell(g, px + 8, py + 8, 4, 2, K.s2); P(g, px + 7, py + 7, K.s3); }
      if (x % 4 === 0) R(g, px, py, 1, T, K.s2);
    }
  }
  function roomBase(grid, style, rid) {
    const H = grid.length, W = grid[0].length;
    const c = cv(W * T, H * T), g = G(c);
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '#' : grid[y][x];
    // floor everywhere first (so furniture footprints have floor under them)
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) floorTile(g, style.floor, x, y);
    // north wall face (rows 0-1)
    const wy0 = 0, wy1 = 2 * T;
    if (style.wallUp === 'brick') {
      for (let x = 0; x < W; x++) { ttp(g, 16, 96, T, T, x * T, 0); ttp(g, 16, 96, T, T, x * T, T); }
      g.fillStyle = 'rgba(38,43,68,0.25)'; g.fillRect(0, 0, W * T, wy1);
    } else {
      R(g, 0, wy0, W * T, 20, style.wallUp); R(g, 0, 20, W * T, 12, style.wallLo);
      R(g, 0, 19, W * T, 2, style.dado);
      if (rid === 'hall') for (let x = 0; x < W * T; x += 8) R(g, x, 21, 1, 9, K.woodD);
    }
    R(g, 0, 0, W * T, 3, K.out); R(g, 0, 3, W * T, 1, style.cap);
    R(g, 0, wy1 - 3, W * T, 3, style.skirt); R(g, 0, wy1 - 1, W * T, 1, K.out);
    // windows in the wall face
    for (let x = 0; x < W; x++) if (at(x, 1) === 'w' && at(x - 1, 1) !== 'w') {
      let x1 = x; while (at(x1 + 1, 1) === 'w') x1++;
      const X0 = x * T + 2, Wd = (x1 - x + 1) * T - 4;
      if (rid === 'shed') { // tall arched brick windows
        R(g, X0 - 1, 5, Wd + 2, 24, K.out); R(g, X0, 8, Wd, 20, K.bL); R(g, X0 + 2, 6, Wd - 4, 2, K.bL);
        R(g, X0, 20, Wd, 8, K.g2); R(g, X0, 20, Wd, 1, K.g1);
        for (let xx = X0 + 4; xx < X0 + Wd; xx += 5) R(g, xx, 6, 1, 22, K.s3);
        for (let yy = 11; yy < 28; yy += 5) R(g, X0, yy, Wd, 1, K.s3);
        R(g, X0 - 2, 4, Wd + 4, 2, K.rd0); R(g, X0 - 2, 28, Wd + 4, 2, K.s1);
      } else {
        R(g, X0 - 1, 6, Wd + 2, 20, K.out); R(g, X0, 7, Wd, 18, K.bL); R(g, X0, 17, Wd, 8, K.g2); R(g, X0, 17, Wd, 1, K.g1);
        R(g, X0 + 4, 19, 6, 3, K.g3); ell(g, X0 + Wd - 7, 18, 4, 3, K.g3);
        R(g, X0 + Math.floor(Wd / 2), 7, 1, 18, K.wh); R(g, X0, 15, Wd, 1, K.wh);
        R(g, X0 - 2, 25, Wd + 4, 2, K.wh); R(g, X0 - 2, 27, Wd + 4, 1, K.s1);
        R(g, X0 - 3, 6, 3, 19, K.rose); R(g, X0 + Wd, 6, 3, 19, K.rose);
        if (rid === 'hall') { R(g, X0 - 3, 6, 3, 19, K.wine); R(g, X0 + Wd, 6, 3, 19, K.wine); }
      }
    }
    // side walls + south wall (dark wall tops), keep the exit gap and 'G' doors
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = at(x, y), px = x * T, py = y * T;
      if (ch !== '#') continue;
      if (y <= 1 && x > 0 && x < W - 1) continue; // north wall already drawn
      R(g, px, py, T, T, K.out);
      if (y === H - 1) { R(g, px, py, T, 3, style.cap); R(g, px, py + 3, T, 1, K.s4); }
      else if (x === 0) { R(g, px + 12, py, 4, T, style.cap); R(g, px + 15, py, 1, T, K.s4); }
      else if (x === W - 1) { R(g, px, py, 4, T, style.cap); R(g, px, py, 1, T, K.s4); }
    }
    return { c, g, W, H, at };
  }
  function exitDoor(g, S, grid, style) {
    const H = grid.length, W = grid[0].length;
    let x0 = -1, x1 = -1;
    for (let x = 0; x < W; x++) if (grid[H - 1][x] === 'X') { if (x0 < 0) x0 = x; x1 = x; }
    if (x0 < 0) return null;
    const px0 = x0 * T, px1 = (x1 + 1) * T, py = (H - 1) * T;
    // threshold + frame posts
    R(g, px0, py, px1 - px0, T, K.s1); R(g, px0, py, px1 - px0, 2, K.s0); R(g, px0, py + 13, px1 - px0, 3, K.g3);
    R(g, px0 - 3, py - 10, 3, 26, K.out); R(g, px1, py - 10, 3, 26, K.out); R(g, px0 - 2, py - 9, 1, 24, style.cap); R(g, px1 + 1, py - 9, 1, 24, style.cap);
    // daylight spilling in through the doorway
    for (let k = 0; k < 30; k++) {
      const yy = py - 1 - k, spread = Math.round(k * 0.45);
      g.fillStyle = 'rgba(254,231,97,' + (0.26 * (1 - k / 30)).toFixed(3) + ')';
      g.fillRect(px0 - spread, yy, px1 - px0 + spread * 2, 1);
    }
    // mat
    let mx0 = -1, mx1 = -1;
    for (let x = 0; x < W; x++) if (grid[H - 2][x] === 'm') { if (mx0 < 0) mx0 = x; mx1 = x; }
    if (mx0 >= 0) { const mpx = mx0 * T + 1, mpy = (H - 2) * T + 3, mw = (mx1 - mx0 + 1) * T - 2; R(g, mpx, mpy, mw, 11, K.brD); R(g, mpx + 1, mpy + 1, mw - 2, 9, K.br); for (let k = 2; k < mw - 2; k += 3) P(g, mpx + k, mpy + 3 + (k % 2) * 4, K.tan); }
    // green EXIT sign over the door (on the south wall)
    const sw = 27, sx = Math.round((px0 + px1) / 2 - sw / 2), sy = py + 3;
    R(g, sx, sy, sw, 9, K.out); R(g, sx + 1, sy + 1, sw - 2, 7, K.g2); text(g, 'EXIT', sx + 3, sy + 2, K.wh);
    R(g, sx + 19, sy + 2, 2, 2, K.wh); R(g, sx + 19, sy + 4, 3, 1, K.wh); R(g, sx + 20, sy + 5, 1, 2, K.wh); P(g, sx + 22, sy + 3, K.wh);
    S.lights.push({ x: (px0 + px1) / 2, y: py, r: 40 });
    S.anchors.exit = { x: Math.round((px0 + px1) / 2), y: py - 2 };
    return { x0, x1 };
  }
  function comps(grid, letters) {
    const H = grid.length, W = grid[0].length, seen = new Set(), out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = grid[y][x];
      if (letters.indexOf(ch) < 0 || seen.has(x + ',' + y)) continue;
      const st = [[x, y]]; seen.add(x + ',' + y); let x0 = x, x1 = x, y0 = y, y1 = y;
      while (st.length) {
        const [cx, cy] = st.pop(); x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && grid[ny][nx] === ch && !seen.has(nx + ',' + ny)) { seen.add(nx + ',' + ny); st.push([nx, ny]); } });
      }
      out.push({ ch, x0, y0, x1, y1, w: (x1 - x0 + 1) * T, h: (y1 - y0 + 1) * T });
    }
    return out;
  }
  function furn(S, b, ov, draw, fade) {
    const c = cv(b.w, b.h + ov), g = G(c);
    draw(g, b.w, b.h + ov, ov);
    const o = { img: c, dx: b.x0 * T, dy: b.y0 * T - ov, sortY: (b.y1 + 1) * T, kind: 'furniture', id: b.ch };
    if (fade) o.fade = fade;
    S.objects.push(o);
    // contact shadow
    return o;
  }
  function furnShadow(g, b) { g.fillStyle = 'rgba(38,43,68,0.30)'; g.fillRect(b.x0 * T + 3, (b.y1 + 1) * T - 1, b.w - 1, 3); g.fillRect(b.x1 * T + T, b.y0 * T + 6, 3, b.h - 4); }
  function counterBox(g, w, h, top, front, topH) {
    R(g, 0, 0, w, h, K.out); R(g, 1, 1, w - 2, topH, top); R(g, 1, 1, w - 2, 1, shade(top, 0.3));
    R(g, 1, topH + 1, w - 2, h - topH - 2, front); R(g, 1, topH + 1, w - 2, 1, shade(front, -0.3));
  }
  function mug(g, x, y, col) { R(g, x, y, 3, 3, K.out); R(g, x, y, 2, 2, col); P(g, x + 2, y + 1, K.out); }
  function stickyBoard(g, x0, y0, w, h, planned) {
    R(g, x0, y0, w, h, K.out); R(g, x0 + 1, y0 + 1, w - 2, h - 2, K.wh); R(g, x0 + 1, y0 + h - 2, w - 2, 1, K.s0);
    const lane = Math.floor((h - 4) / 2);
    R(g, x0 + 1, y0 + 2 + lane, w - 2, 1, K.s1);
    text(g, 'CASE', x0 + 3, y0 + 3, K.bD); text(g, 'PLAN', x0 + 3, y0 + 3 + lane, K.bD);
    const cols = [K.yelL, K.rose, K.bL, K.g1, K.tan];
    const r = rng(planned ? 11 : 7);
    for (let l = 0; l < 2; l++) {
      const ly = y0 + 2 + l * lane;
      const n = 7;
      for (let k = 0; k < n; k++) {
        let nx, ny, col;
        if (planned) { nx = x0 + 22 + k * 10; ny = ly + 2 + (k % 2) * 0; col = cols[(k + l) % 3]; }
        else { nx = x0 + 20 + (r() * (w - 30) | 0); ny = ly + 1 + (r() * (lane - 7) | 0); col = cols[(r() * cols.length) | 0]; }
        R(g, nx, ny, 7, 6, col); R(g, nx, ny + 5, 7, 1, shade(col, -0.25)); R(g, nx + 1, ny + 2, 4, 1, K.s2);
      }
      if (planned) for (let k = 0; k < 6; k++) { R(g, x0 + 29 + k * 10, ly + 4, 3, 1, K.bD); P(g, x0 + 31 + k * 10, ly + 3, K.bD); P(g, x0 + 31 + k * 10, ly + 5, K.bD); }
    }
    R(g, x0 + 4, y0 + h - 1, 14, 2, K.s2); R(g, x0 + 6, y0 + h - 2, 2, 1, K.red); R(g, x0 + 9, y0 + h - 2, 2, 1, K.bD);
  }

  function buildRoom(roomId, level, opts) {
    if (!IMG.tt) throw new Error('TileArt.buildRoom: call TileArt.load() first');
    level = level || LS.LEVEL; opts = opts || {};
    const flags = opts.flags || {};
    const room = level.rooms[roomId]; if (!room) throw new Error('TileArt: no room ' + roomId);
    const grid = room.grid, style = ROOM_STYLE[roomId] || ROOM_STYLE.office;
    const { c, g, W, H } = roomBase(grid, style, roomId);
    const S = { w: W * T, h: H * T, ground: c, objects: [], lights: [], anchors: {}, anim: { glints: [], ripples: [], flash: [], smoke: [], custom: [] }, kind: 'room', room: roomId };
    exitDoor(g, S, grid, style);
    const parts = comps(grid, 'BkLTdpsuSncbWMG');
    const ceilingLamps = [];
    if (roomId === 'office') buildOffice(g, S, parts, flags);
    if (roomId === 'hall') buildHall(g, S, parts, flags);
    if (roomId === 'shed') buildShed(g, S, grid, parts, flags, room);
    for (let x = 4; x < W - 2; x += 8) ceilingLamps.push(x);
    ceilingLamps.forEach(x => S.lights.push({ x: x * T, y: 5 * T, r: 60 }));
    (room.entities || []).forEach(e => { if (e.kind === 'prop' || e.kind === 'hotspot') S.anchors[e.id] = { x: e.tile[0] * T + 8, y: e.tile[1] * T + 8 }; });
    S.objects.sort((a, b) => a.sortY - b.sortY);
    return S;
  }

  function buildOffice(g, S, parts, flags) {
    parts.forEach(b => {
      if (b.ch === 'B') { // project board on the wall
        stickyBoard(g, b.x0 * T - 2, 5, b.w + 4, 25, !!flags.planned);
        return;
      }
      furnShadow(g, b);
      if (b.ch === 'k') furn(S, b, 6, (cg, w, h, ov) => {
        counterBox(cg, w, h - ov, K.s0, K.wood, 12);
        cg.translate(0, 0);
        for (let x = 4; x < w - 2; x += 10) { R(cg, x, 16, 7, 12, K.woodD); P(cg, x + 5, 22, K.yel); }
        // kettle, mugs, tea caddy
        R(cg, 5, 0, 8, 9, K.out); R(cg, 6, 1, 6, 7, K.s1); R(cg, 6, 1, 2, 7, K.s0); R(cg, 12, 3, 2, 3, K.out); R(cg, 8, -1 + 1, 3, 1, K.out);
        mug(cg, 17, 5, K.red); mug(cg, 22, 6, K.bL); R(cg, 26, 1, 4, 8, K.out); R(cg, 27, 2, 2, 6, K.g3);
      });
      if (b.ch === 'L') furn(S, b, 8, (cg, w, h, ov) => {
        R(cg, 0, ov, w, h - ov, K.out); R(cg, 1, ov + 1, w - 2, 7, K.s0);
        R(cg, 1, ov + 8, w - 2, h - ov - 9, K.s1);
        for (let x = 1; x < w - 1; x += 8) { R(cg, x + 7, ov + 8, 1, h - ov - 9, K.s3); for (let y = ov + 11; y < ov + 16; y += 2) R(cg, x + 2, y, 4, 1, K.s2); R(cg, x + 5, ov + 20, 1, 2, K.s4); }
        R(cg, 10, ov + 23, 5, 5, K.wh); text(cg, 'N', 11, ov + 23, K.red);
        // hard hats + hi-vis on top / hanging
        ell(cg, 6, ov + 2, 4, 3, K.out); ell(cg, 6, ov + 2, 3, 2, K.wh); R(cg, 2, ov + 4, 9, 1, K.out);
        ell(cg, 20, ov + 2, 4, 3, K.out); ell(cg, 20, ov + 2, 3, 2, K.or); R(cg, 16, ov + 4, 9, 1, K.out);
        R(cg, 25, ov + 12, 6, 10, K.or); R(cg, 25, ov + 16, 6, 1, K.yelL);
      });
      if (b.ch === 'T') furn(S, b, 8, (cg, w, h, ov) => {
        for (let x = 6; x < w - 6; x += 14) { R(cg, x, 0, 8, 10, K.out); R(cg, x + 1, 1, 6, 8, K.bD); }
        R(cg, 0, ov + 2, w, 18, K.out); R(cg, 1, ov + 3, w - 2, 15, K.wood); R(cg, 1, ov + 3, w - 2, 1, K.woodL);
        R(cg, 1, ov + 18, w - 2, 2, K.woodD); R(cg, 3, ov + 20, 2, h - ov - 21, K.out); R(cg, w - 5, ov + 20, 2, h - ov - 21, K.out);
        R(cg, 10, ov + 6, 18, 9, K.wh); R(cg, 11, ov + 7, 16, 1, K.bL); R(cg, 12, ov + 9, 10, 1, K.s1); R(cg, 12, ov + 11, 13, 1, K.s1); R(cg, 22, ov + 12, 4, 2, K.red);
        mug(cg, 36, ov + 8, K.yel); mug(cg, 50, ov + 10, K.wh); R(cg, 42, ov + 6, 6, 8, K.wh); R(cg, 43, ov + 7, 4, 1, K.s1);
        for (let x = 8; x < w - 6; x += 22) { R(cg, x, h - 10, 10, 10, K.out); R(cg, x + 1, h - 9, 8, 5, K.bD); R(cg, x + 1, h - 4, 1, 4, K.out); R(cg, x + 8, h - 4, 1, 4, K.out); }
      });
      if (b.ch === 'd') furn(S, b, 10, (cg, w, h, ov) => {
        R(cg, 0, ov + 2, w, 14, K.out); R(cg, 1, ov + 3, w - 2, 11, K.woodL); R(cg, 1, ov + 14, w - 2, 2, K.wood);
        R(cg, 1, ov + 16, 12, h - ov - 17, K.wood); R(cg, 2, ov + 18, 10, 1, K.woodD); R(cg, 2, ov + 23, 10, 1, K.woodD); R(cg, w - 3, ov + 16, 2, h - ov - 16, K.out);
        R(cg, 8, 0, 18, 13, K.out); R(cg, 9, 1, 16, 10, K.bD); R(cg, 10, 2, 14, 1, K.bL); R(cg, 10, 4, 9, 1, K.b); R(cg, 10, 6, 11, 1, K.b); R(cg, 16, 13, 3, ov - 9, K.out);
        R(cg, 9, ov + 8, 14, 3, K.s1); R(cg, 4, ov + 6, 4, 5, K.wh); mug(cg, 25, ov + 6, K.g2);
      });
      if (b.ch === 'p') furn(S, b, 6, (cg, w, h, ov) => {
        counterBox(cg, w, h - ov + 0, K.s1, K.s2, 4); cg.translate(0, 0);
        for (let y = 7; y < h - 2; y += 3) R(cg, 2, y, w - 4, 1, K.s3);
        for (let x = 6; x < w - 4; x += 12) R(cg, x, 9, 4, 1, K.s0);
        R(cg, 4, 0, 26, 4, K.out); R(cg, 5, 1, 24, 2, K.wh); R(cg, 5, 1, 2, 2, K.bL); R(cg, 18, 3, 22, 3, K.out); R(cg, 19, 3, 20, 2, K.sand);
      });
      if (b.ch === 's') furn(S, b, 6, (cg, w, h, ov) => {
        R(cg, 0, ov + 2, w, h - ov - 2, K.out); R(cg, 1, ov + 3, w - 2, 9, K.woodL); R(cg, 1, ov + 12, w - 2, h - ov - 13, K.bD);
        R(cg, 1, ov + 12, w - 2, 1, K.b);
        textC(cg, 'SIGN IN', w / 2, ov + 16, K.wh);
        R(cg, 4, ov + 4, 12, 6, K.wh); R(cg, 10, ov + 4, 1, 6, K.s1); R(cg, 5, ov + 6, 4, 1, K.s1); R(cg, 11, ov + 7, 4, 1, K.s1); R(cg, 17, ov + 6, 6, 1, K.bD);
        R(cg, 24, 0, 5, 6, K.out); R(cg, 25, 1, 3, 4, K.yel); // bell / lamp
      });
    });
    // wall clock + safety poster
    ell(g, 3 * T + 8 + 32, 12, 4, 4, K.out); ell(g, 3 * T + 8 + 32, 12, 3, 3, K.wh); P(g, 3 * T + 40, 10, K.out); P(g, 3 * T + 41, 12, K.out);
    R(g, 14 * T + 2, 7, 12, 15, K.out); R(g, 14 * T + 3, 8, 10, 13, K.g2); R(g, 14 * T + 5, 10, 6, 6, K.wh); R(g, 14 * T + 7, 11, 2, 4, K.g2); R(g, 14 * T + 4, 17, 8, 1, K.wh); R(g, 14 * T + 4, 19, 6, 1, K.wh);
    S.anchors.board = { x: 11 * T, y: 2 * T };
  }

  function buildHall(g, S, parts, flags) {
    parts.forEach(b => {
      if (b.ch === 'B') { // bunting + banner over the stage
        const x0 = b.x0 * T, x1 = (b.x1 + 1) * T;
        R(g, x0 - 20, 4, 20, 26, K.wine); R(g, x1, 4, 20, 26, K.wine); for (let y = 4; y < 30; y += 3) { P(g, x0 - 14, y, K.red); P(g, x1 + 13, y, K.red); }
        R(g, x0 + 8, 6, x1 - x0 - 16, 12, K.out); R(g, x0 + 9, 7, x1 - x0 - 18, 10, K.wh); R(g, x0 + 9, 16, x1 - x0 - 18, 1, K.s0);
        textC(g, 'KESTREL VALE LINE', (x0 + x1) / 2, 9, K.bD);
        const cols = [K.red, K.yel, K.b, K.g1, K.wh];
        for (let x = 2 * T; x < 26 * T; x += 6) { const y = 3 + Math.round(2 * Math.sin((x - 32) / 40)); P(g, x, y, K.out); R(g, x + 1, y + 1, 3, 2, cols[(x / 6) % 5 | 0]); P(g, x + 2, y + 3, cols[(x / 6) % 5 | 0]); }
        return;
      }
      if (b.ch === 'S') { furn(S, b, 0, (cg, w, h) => { R(cg, 0, 0, w, h, K.out); R(cg, 1, 1, w - 2, 9, K.woodL); for (let x = 1; x < w; x += 6) R(cg, x, 1, 1, 9, K.wood); R(cg, 1, 10, w - 2, h - 11, K.woodD); for (let x = 4; x < w; x += 12) R(cg, x, 11, 1, h - 12, K.out); R(cg, 1, 10, w - 2, 1, K.wood); }); return; }
      furnShadow(g, b);
      if (b.ch === 'u') furn(S, b, 14, (cg, w, h, ov) => {
        R(cg, 0, ov + 4, w, h - ov - 4, K.out); R(cg, 1, ov + 5, w - 2, 10, K.wh); R(cg, 1, ov + 15, w - 2, h - ov - 16, K.s0);
        for (let x = 2; x < w - 1; x += 5) R(cg, x, ov + 15, 1, h - ov - 16, K.wh);
        R(cg, 5, 0, 12, ov + 10, K.out); R(cg, 6, 1, 10, ov + 8, K.s1); R(cg, 6, 1, 3, ov + 8, K.s0); R(cg, 8, -1 + 1, 6, 1, K.s3); R(cg, 16, ov + 4, 3, 2, K.out);
        mug(cg, 20, ov + 7, K.wh); mug(cg, 24, ov + 9, K.wh); mug(cg, 20, ov + 11, K.wh); ell(cg, 25, ov + 5, 3, 1, K.tan);
      });
      if (b.ch === 'n') furn(S, b, 14, (cg, w, h, ov) => {
        R(cg, 4, ov + 6, 2, h - ov - 6, K.out); R(cg, w - 6, ov + 6, 2, h - ov - 6, K.out);
        R(cg, 0, 0, w, ov + 8, K.out); R(cg, 1, 1, w - 2, ov + 6, K.br);
        [[3, 3, K.wh], [11, 2, K.yelL], [20, 4, K.rose], [5, 11, K.bL], [15, 12, K.wh]].forEach(([x, y, col]) => { R(cg, x, y, 7, 6, col); P(cg, x + 3, y, K.red); R(cg, x + 1, y + 2, 5, 1, K.s1); });
      });
      if (b.ch === 'T') furn(S, b, 6, (cg, w, h, ov) => {
        for (let x = 12; x < w - 8; x += 32) { R(cg, x, 0, 10, 9, K.out); R(cg, x + 1, 1, 8, 7, K.wine); }
        R(cg, 0, ov, w, h - ov, K.out); R(cg, 1, ov + 1, w - 2, 5, K.wh); R(cg, 1, ov + 6, w - 2, h - ov - 7, K.s0);
        for (let x = 4; x < w - 2; x += 7) R(cg, x, ov + 7, 1, h - ov - 8, K.wh);
        if (flags.panel) {
          for (let x = 16; x < w - 12; x += 32) { R(cg, x, ov - 3, 12, 5, K.out); R(cg, x + 1, ov - 2, 10, 3, K.wh); R(cg, x + 2, ov - 1, 8, 1, K.s2); mug(cg, x + 14, ov + 1, K.wh); }
          R(cg, w / 2 - 3, ov - 5, 6, 8, K.out); R(cg, w / 2 - 2, ov - 4, 4, 6, K.bL); P(cg, w / 2 - 2, ov - 4, K.wh);
          R(cg, 6, ov + 2, 8, 3, K.bD); R(cg, w - 14, ov + 2, 8, 3, K.bD);
        }
      });
      if (b.ch === 'c') furn(S, b, 4, (cg, w, h, ov) => {
        for (let x = 0; x < w; x += T) {
          R(cg, x + 3, 0, 10, 8, K.out); R(cg, x + 4, 1, 8, 6, K.bD); R(cg, x + 4, 1, 8, 1, K.b);
          R(cg, x + 2, 8, 12, 4, K.out); R(cg, x + 3, 8, 10, 3, K.b);
          R(cg, x + 3, 12, 1, h - 12, K.out); R(cg, x + 12, 12, 1, h - 12, K.out);
        }
      });
      if (b.ch === 'p') furn(S, b, 18, (cg, w, h, ov) => {
        const left = b.x0 < 5;
        const sx = left ? 2 : w - 16;
        for (let k = 0; k < 9; k++) { R(cg, sx, h - 8 - k * 3, 14, 3, K.out); R(cg, sx + 1, h - 8 - k * 3, 12, 2, K.bD); P(cg, sx + 1, h - 8 - k * 3, K.b); }
        R(cg, sx + 1, h - 6, 1, 6, K.out); R(cg, sx + 12, h - 6, 1, 6, K.out);
        const px = left ? w - 14 : 2;
        R(cg, px + 2, h - 9, 10, 9, K.out); R(cg, px + 3, h - 8, 8, 7, K.rd0);
        ell(cg, px + 7, h - 15, 6, 6, K.g3); ell(cg, px + 6, h - 16, 4, 4, K.g2); P(cg, px + 4, h - 18, K.g1); P(cg, px + 8, h - 20, K.g1);
      });
    });
    S.anchors.stage = { x: 14 * T, y: 3 * T };
  }

  function marjorie(g, W, H, ov) {
    // 1961 railcar, 3/4 side view: roof seen from above, south side face, underframe + bogies
    const L = W;
    const out = K.ttOut;
    // roof
    R(g, 4, 1, L - 8, 13, out); R(g, 2, 3, L - 4, 10, out);
    R(g, 5, 2, L - 10, 11, K.s1); R(g, 3, 4, L - 6, 8, K.s1); R(g, 5, 3, L - 10, 1, K.s0); R(g, 3, 12, L - 6, 1, K.s2);
    for (let x = 30; x < L - 30; x += 24) R(g, x, 6, 6, 3, K.s2);
    [150, 250].forEach(x => { R(g, x, -2 + 2, 4, 6, out); R(g, x + 1, 1, 2, 4, K.s3); });
    // body side
    const by = 14, bh = 27;
    R(g, 0, by, L, bh + 1, out);
    R(g, 1, by, L - 2, bh, K.g3); R(g, 1, by, L - 2, 3, K.g2); R(g, 1, by + 3, L - 2, 1, K.sand);
    R(g, 1, by + 15, L - 2, 1, K.sand); R(g, 1, by + bh - 1, L - 2, 1, K.g4);
    // yellow ends + cab windows
    [[1, 1], [L - 15, -1]].forEach(([x, dir]) => {
      R(g, x, by + 4, 14, bh - 4, K.yel); R(g, x, by + 4, 14, 1, K.yelL);
      R(g, x + (dir > 0 ? 3 : 2), by + 5, 9, 7, out); R(g, x + (dir > 0 ? 4 : 3), by + 6, 7, 5, K.s4); P(g, x + (dir > 0 ? 5 : 4), by + 6, K.s1); P(g, x + (dir > 0 ? 6 : 5), by + 7, K.s1);
      R(g, x + (dir > 0 ? 2 : 10), by + 20, 2, 2, K.s0);
      for (let k = 0; k < 5; k++) P(g, x + (dir > 0 ? 13 - k : k), by + 13 + k, K.sand);
    });
    // passenger windows + doors; guard's van near the east end
    const gv0 = L - 86, gv1 = L - 34;
    const doors = [34, 118, 208, gv0 + 4, gv1 - 16];
    for (let x = 22; x < L - 22; x += 13) {
      if (doors.some(d => x + 10 > d && x < d + 14)) continue;
      if (x > gv0 && x < gv1) continue;
      R(g, x, by + 5, 10, 9, out); R(g, x + 1, by + 6, 8, 7, K.s4); P(g, x + 2, by + 6, K.s1); P(g, x + 3, by + 7, K.s1); P(g, x + 6, by + 10, K.s2);
    }
    doors.forEach(d => { R(g, d, by + 4, 12, bh - 4, K.g4); R(g, d + 1, by + 4, 10, bh - 5, K.g3); R(g, d + 3, by + 6, 6, 6, out); R(g, d + 4, by + 7, 4, 4, K.s4); R(g, d + 1, by + 8, 1, 10, K.s0); R(g, d + 10, by + 8, 1, 10, K.s0); P(g, d + 8, by + 16, K.yel); });
    // guard's van window (Kevin's), with a sill
    const kx = gv0 + 24;
    R(g, kx, by + 5, 12, 9, out); R(g, kx + 1, by + 6, 10, 7, K.s3); R(g, kx + 1, by + 6, 10, 1, K.s2); R(g, kx - 1, by + 14, 14, 1, K.s1);
    // rust + tired paint
    for (let k = 0; k < 140; k++) {
      const x = 3 + (hash(k, 1, 77) * (L - 6) | 0), y = by + 17 + (hash(k, 2, 77) * 9 | 0);
      if (x < 15 || x > L - 16) continue;
      P(g, x, y, hash(k, 3, 77) < 0.6 ? K.brD : K.br);
    }
    for (let k = 0; k < 10; k++) { const x = 20 + (hash(k, 4, 77) * (L - 40) | 0); R(g, x, by + 24, 3 + (k % 3), 2, K.br); P(g, x + 1, by + 23, K.brD); }
    // nameplate + running number
    const nx = 150;
    R(g, nx, by + 18, 37, 9, out); R(g, nx + 1, by + 19, 35, 7, K.wine); R(g, nx + 1, by + 19, 35, 1, K.yel); R(g, nx + 1, by + 25, 35, 1, K.yel);
    text(g, 'MARJORIE', nx + 3, by + 20, K.yel);
    text(g, 'E79961', 22, by + 20, K.sand); text(g, 'E79961', L - 48, by + 20, K.sand);
    // underframe: solebar, engines, tanks, bogies
    const uy = by + bh + 1;
    R(g, 2, uy, L - 4, 3, K.blk); R(g, 2, uy, L - 4, 1, K.s4);
    [[128, 40], [222, 40]].forEach(([x, w]) => { R(g, x, uy + 2, w, 7, K.s4); R(g, x + 1, uy + 3, w - 2, 5, K.s3); for (let xx = x + 3; xx < x + w - 3; xx += 5) R(g, xx, uy + 4, 2, 3, K.s2); });
    R(g, 180, uy + 3, 30, 5, K.s4); R(g, 181, uy + 4, 28, 3, K.s3); R(g, 182, uy + 4, 26, 1, K.s2);
    [[38, 70], [L - 108, 70]].forEach(([x, w]) => {
      R(g, x, uy + 2, w, 5, K.blk);
      [x + 12, x + w - 12].forEach(cx => { ell(g, cx, uy + 8, 6, 5, K.blk); ell(g, cx, uy + 8, 4, 3, K.s3); P(g, cx, uy + 8, K.s1); R(g, cx - 8, uy + 3, 16, 2, K.s4); });
      for (let xx = x + 26; xx < x + w - 26; xx += 3) { P(g, xx, uy + 4, K.s2); P(g, xx + 1, uy + 5, K.s2); }
    });
    // buffers + couplings
    [[-1, 1], [L - 3, -1]].forEach(([x]) => { R(g, x, by + bh - 6, 4, 3, K.s3); R(g, x, by + bh - 1, 4, 3, K.s3); });
  }
  function buildShed(g, S, grid, parts, flags, room) {
    const H = grid.length, W = grid[0].length;
    // rails across rows 5-6 (embedded in the concrete floor) + an inspection pit under Marjorie
    const ry = 5 * T;
    R(g, 1 * T, ry + 1, (W - 1) * T, 30, K.s2);
    for (let x = T; x < W * T; x += 8) R(g, x, ry + 5, 4, 22, K.s3);
    R(g, 6 * T, ry + 12, 20 * T, 8, K.s4); R(g, 6 * T, ry + 12, 20 * T, 1, K.blk);
    for (const yy of [ry + 9, ry + 21]) { R(g, T, yy + 2, (W - 1) * T, 1, K.s4); R(g, T, yy, (W - 1) * T, 2, K.s1); R(g, T, yy, (W - 1) * T, 1, K.s0); }
    // east wall 'G': big closed doors, rails run out under them
    for (let y = 0; y < H; y++) if (grid[y][W - 1] === 'G') {
      const px = (W - 1) * T, py = y * T;
      R(g, px, py, T, T, K.out); R(g, px + 1, py, 11, T, K.g3); for (let yy = py; yy < py + T; yy += 4) R(g, px + 1, yy, 11, 1, K.g4);
      R(g, px + 12, py, 4, T, K.brD);
    }
    let gy0 = -1, gy1 = -1; for (let y = 0; y < H; y++) if (grid[y][W - 1] === 'G') { if (gy0 < 0) gy0 = y; gy1 = y; }
    if (gy0 >= 0) { R(g, (W - 1) * T + 1, ((gy0 + gy1 + 1) / 2) * T, 11, 1, K.out); R(g, (W - 1) * T, gy0 * T, 2, (gy1 - gy0 + 1) * T, K.sand); R(g, (W - 1) * T + 4, (gy0 + 2) * T + 2, 3, 3, K.yel); }
    parts.forEach(b => {
      if (b.ch === 'M') {
        const ov = 14;
        const o = furn(S, b, ov, (cg, w, h) => marjorie(cg, w, h, ov), { x: b.x0 * T, y: (b.y0 - 2) * T + 6, w: b.w, h: 2 * T - 2 });
        o.kind = 'marjorie';
        // pigeon on the guard's van window sill + cab window anchors
        const kx = b.w - 86 + 24;
        S.anchors.pigeon = { x: b.x0 * T + kx + 6, y: b.y0 * T - ov + 14 + 14, sortY: o.sortY + 1 };
        S.anchors.marjorieCab = { x: b.x0 * T + 8, y: b.y0 * T - ov + 14 + 8 };
        g.fillStyle = 'rgba(24,20,37,0.35)'; g.fillRect(b.x0 * T + 6, (b.y1 + 1) * T - 4, b.w - 8, 4);
        return;
      }
      if (b.ch === 'G') return;
      furnShadow(g, b);
      if (b.ch === 'b') furn(S, b, 6, (cg, w, h, ov) => {
        const cols = [[K.g3, K.red], [K.bD, K.yel], [K.wine, K.g2], [K.g3, K.bL]];
        for (let k = 0; k < 4; k++) {
          const y = h - 10 - k * 6 + (k % 2), x = 2 + (k % 2) * 3, [c1, c2] = cols[k];
          R(cg, x, y, w - 6, 8, K.out); R(cg, x + 1, y + 1, w - 8, 6, c1);
          for (let xx = x + 2; xx < x + w - 8; xx += 4) { P(cg, xx, y + 2, c2); P(cg, xx + 2, y + 4, c2); }
        }
      });
      if (b.ch === 'W') furn(S, b, 12, (cg, w, h, ov) => {
        R(cg, 0, ov + 2, w, 12, K.out); R(cg, 1, ov + 3, w - 2, 9, K.wood); R(cg, 1, ov + 3, w - 2, 1, K.woodL);
        R(cg, 1, ov + 12, w - 2, 2, K.woodD); R(cg, 2, ov + 14, 2, h - ov - 14, K.out); R(cg, w - 4, ov + 14, 2, h - ov - 14, K.out);
        R(cg, 4, ov + 20, w - 8, 3, K.woodD);
        // vice, spanners, oil can, radio with aerial
        R(cg, 4, ov - 1, 8, 5, K.out); R(cg, 5, ov, 6, 3, K.s2); R(cg, 11, ov + 1, 3, 1, K.s3);
        for (let k = 0; k < 3; k++) { R(cg, 16 + k * 4, ov + 5, 1, 6, K.s0); P(cg, 15 + k * 4, ov + 5, K.s0); P(cg, 17 + k * 4, ov + 5, K.s0); }
        R(cg, 30, ov + 1, 5, 6, K.out); R(cg, 31, ov + 2, 3, 4, K.red); R(cg, 34, ov - 2, 1, 4, K.out);
        R(cg, w - 18, ov - 4, 14, 9, K.out); R(cg, w - 17, ov - 3, 12, 7, K.brD); R(cg, w - 16, ov - 2, 5, 5, K.s3); R(cg, w - 10, ov - 2, 4, 2, K.yelL); P(cg, w - 8, ov + 1, K.s0);
        R(cg, w - 6, 0, 1, ov - 4, K.out); P(cg, w - 6, 0, K.s0);
      });
    });
    // radio music notes (animated) + a work lamp glow
    const wb = parts.find(b => b.ch === 'W');
    if (wb) {
      const rx = (wb.x1 + 1) * T - 12, ryy = wb.y0 * T - 6;
      S.anchors.radio = { x: rx, y: ryy };
      S.lights.push({ x: rx, y: ryy, r: 30 });
      S.anim.custom.push((ctx, t) => { // t in ms (converted by drawAnimated)
        for (let k = 0; k < 2; k++) {
          const ph = ((t / 1800) + k / 2) % 1, nx = Math.round(rx + 4 + ph * 8 + Math.sin(ph * 7) * 2), ny = Math.round(ryy - 6 - ph * 14);
          ctx.globalAlpha = 1 - ph; ctx.fillStyle = K.wh; ctx.fillRect(nx, ny, 1, 4); ctx.fillRect(nx - 2, ny + 3, 2, 2); ctx.fillRect(nx + 1, ny, 2, 1); ctx.globalAlpha = 1;
        }
      });
    }
    const cb = parts.find(b => b.ch === 'b'); if (cb) S.anchors.cushions = { x: cb.x0 * T + 16, y: cb.y0 * T + 4 };
    ((room && room.cat_spots) || []).forEach((p, i) => { S.anchors['cat' + (i + 1)] = { x: p[0] * T + 8, y: p[1] * T + 14 }; });
  }

  /* ================================================================== public API */
  LS.TileArt = {
    load,
    buildOutside,
    buildRoom,
    drawAnimated,
    drawActor,
    drawAnimal,
    actorHeight: 16,
    T,
    palette: K,
    text: (ctx, s, x, y, col) => text(ctx, s, x, y, col || K.wh),
    textWidth: textW
  };
})();
