/* LINESIDE HD renderer: 48 art px per map tile (scene.res = 3), drawn from the HD atlas (js/world/atlas_hd.js, built
 * by assets/hd/pack.py from the generators in assets/hd/<area>/). Wraps the 16px renderer (js/world/tileart.js) and
 * replaces it piece by piece: anything the HD atlas already covers is drawn in HD, everything else falls back to the
 * 16px art scaled up, so the game always works while the art is being made.
 *
 * Same contract as LS.TileArt (see tileart.js), plus `res: 3`. Ground chunks are drawn lazily when they first come into view and the least recently used are dropped,
 * so the full 6144x4032 art-px world never has to sit in memory (phones). Add ?art=classic to the URL to see the 16px art.
 */
window.LS = window.LS || {};
(function () {
  'use strict';
  const BASE = LS.TileArt, A = LS.ATLAS_HD;
  if (!BASE || !A || /[?&]art=classic\b/.test(location.search)) return;
  const R = 3, T = 16, CHUNK = 256, KEEP = 28; // art px per world unit; world units per tile; chunk size (world units); chunks kept in memory
  const IMG = {};                             // 'area/file' -> HTMLImageElement
  const img = (area, file) => IMG[area + '/' + file];
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const G = c => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; };

  /* ------------------------------------------------------------------ loading */
  let loaded = null;
  function load() {
    if (loaded) return loaded;
    const jobs = [];
    for (const area of Object.keys(A)) for (const [file, uri] of Object.entries(A[area].img || {})) {
      jobs.push(new Promise(res => { const i = new Image(); i.onload = () => { IMG[area + '/' + file] = i; res(); }; i.onerror = () => { console.warn('HD art failed to load', area, file); res(); }; i.src = uri; }));
    }
    loaded = Promise.all([BASE.load(), ...jobs]).then(() => { indexChars(); if (HD.onLoad) HD.onLoad(); });
    return loaded;
  }

  /* ------------------------------------------------------------------ characters */
  const CH = { byLook: new Map(), animals: {} };
  const lookKey = l => l ? JSON.stringify(Object.keys(l).sort().reduce((o, k) => (o[k] = l[k], o), {})) : '';
  function indexChars() {
    const m = A.chars && A.chars.manifest; if (!m) return;
    for (const [name, e] of Object.entries(m)) {
      if (!e || !e.file) continue;
      if (e.anims) { CH.animals[e.id || name] = e; continue; }
      if (!e.look) continue;
      const k = lookKey(e.look), slot = CH.byLook.get(k) || {};
      slot[e.ppe ? 'ppe' : 'plain'] = e; CH.byLook.set(k, slot);
    }
  }
  const ROW = { down: 0, up: 1, left: 2, right: 3 };
  // Deterministic 0..1 hash of a character seed and an integer slot (cycle number, syllable number).
  const hsh = (a, b) => { let h = Math.imul((a * 1000) | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  // Idle: the four idle columns are k0 rest, k1 breathing in, k2 held, k3 rest with the eyes shut. Breath and blink
  // are separate: the breath ping-pongs 0-1-2-1-0 over a slow 3.5-4.1 s cycle (length and phase set by the seed),
  // holding the rest pose longest; a blink is its own ~120 ms event, dropped into the rest part of about three cycles
  // in four at a random moment (so 2.5-7 s apart), now and then a double blink. Returns [k, blinking].
  const BR = [[0.40, 0], [0.50, 1], [0.70, 2], [0.80, 1], [1, 0]];   // cumulative fraction of the cycle -> idle frame
  function idleFrame(t, seed) {
    const len = 3.5 + seed * 0.6, tt = t + seed * 13.7, n = Math.floor(tt / len), u = tt / len - n;
    let k = 0; for (const [f, kk] of BR) if (u < f) { k = kk; break; }
    if (k === 0 && u < 0.40) {   // blinks only land on the rest pose (the blink column is the rest pose with shut eyes)
      const h = hsh(seed * 97 + 1, n);
      if (h < 0.82) {
        const at = (0.04 + 0.26 * hsh(seed * 53 + 2, n)) * len, dt = u * len - at;
        if ((dt >= 0 && dt < 0.12) || (hsh(seed * 31 + 3, n) < 0.22 && dt >= 0.26 && dt < 0.38)) return [0, true];
      }
    }
    return [k, false];
  }
  // Talking: the head nods by one art pixel in syllable-length beats (about 7 a second) with short word gaps.
  function talkNod(t, seed) { const n = Math.floor(t * 7 + seed * 5); return hsh(seed * 17 + 5, n) > 0.45 && hsh(seed * 7 + 9, Math.floor(n / 4)) > 0.2; }
  // Sheet layout: one row per facing. Col 0 stands; the walk and idle ranges come from the manifest (walk: [first, n],
  // idle: [first, n]); sheets without them (the older 9-column sheets) walk on cols 1..cols-1 and breathe in code.
  // `frame` is the walk phase in frames of an 8-frame cycle (fractional is fine); opts.idle is the clock in seconds,
  // opts.seed (0..1) offsets each character so a crowd doesn't breathe or blink in step, and opts.talk nods the head.
  function drawActor(ctx, look, x, y, facing, frame, opts) {
    opts = opts || {};
    const slot = CH.byLook.get(lookKey(look)), e = slot && ((opts.ppe && slot.ppe) || slot.plain), im = e && img('chars', e.file);
    if (!im) return BASE.drawActor(ctx, look, x, y, facing, frame | 0, opts);
    const [fw, fh] = e.frame || [32, 64], [ax, ay] = e.anchor || [16, 62], cols = e.cols || 5;
    const rows = e.rows || ['down', 'up', 'left', 'right'], row = Math.max(0, rows.indexOf(facing));
    const big = cols >= 13, walk = e.walk || (big ? [1, 8] : [1, cols - 1]), idle = e.idle || (big ? [9, 4] : null), seed = opts.seed || 0;
    let col = 0, drop = 0, cut = 0;   // drop: art px the upper body sits lower, above row `cut` of the frame
    if (opts.moving) { const n = walk[1], f = Math.floor((+frame || 0) * n / 8); col = walk[0] + ((f % n) + n) % n; }
    else if (opts.idle != null) {
      if (idle && idle[1] >= 4) { const [k, bl] = idleFrame(opts.idle, seed); col = idle[0] + (bl ? 3 : k); }
      else if (idle && idle[1] > 0) col = idle[0] + Math.floor(opts.idle * 0.8 + seed * 7.3) % idle[1];
      else if (Math.sin((opts.idle + seed * 9.1) * 2 * Math.PI / 3.8) > 0.35) { drop = 1; cut = Math.max(8, ay - 36); }   // fallback: shoulders settle 1 art px on the out-breath
      if (opts.talk && talkNod(opts.idle, seed)) { drop = 1; cut = Math.round(fh * 0.44); }   // head only (the neck is at ~44% of the frame)
    }
    if (opts.alpha != null && opts.alpha < 1) ctx.globalAlpha = opts.alpha;
    if (opts.shadow !== false) { ctx.fillStyle = 'rgba(42,29,50,0.16)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 2.2, 9, 2.6, 0.32, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(42,29,50,0.3)'; ctx.beginPath(); ctx.ellipse(x, y - 0.5, 6.5, 2.2, 0, 0, Math.PI * 2); ctx.fill(); }
    const sx = col * fw, sy = row * fh, dx = x - ax / R, dy = y - ay / R;
    if (!drop) ctx.drawImage(im, sx, sy, fw, fh, dx, dy, fw / R, fh / R);
    else {   // split: the lower part stays put, the part above `cut` is drawn one art pixel lower
      ctx.drawImage(im, sx, sy + cut, fw, fh - cut, dx, dy + cut / R, fw / R, (fh - cut) / R);
      ctx.drawImage(im, sx, sy, fw, cut, dx, dy + drop / R, fw / R, cut / R);
    }
    if (opts.alpha != null && opts.alpha < 1) ctx.globalAlpha = 1;
  }
  function drawAnimal(ctx, kind, x, y, t, opts) {
    const e = CH.animals[kind], im = e && img('chars', e.file);
    if (!im) return BASE.drawAnimal(ctx, kind, x, y, t, opts);
    return HD.animal(ctx, e, im, kind, x, y, t, opts || {});
  }

  /* ------------------------------------------------------------------ scenes */
  // Upscale a 16px scene to res 3 (nearest-neighbour) and let the HD passes paint over it. Chunks render on demand.
  function lift(sc0, room, level, opts) {
    const w = sc0.w, h = sc0.h, r0 = sc0.res || 1, chunks = [], ops = [], built = [];
    const sc = Object.assign({}, sc0, { res: R, chunks, ground: null, base: sc0 });
    sc.objects = sc0.objects.map(o => Object.assign({}, o, { w: o.w || o.img.width / r0, h: o.h || o.img.height / r0 }));
    // passes call sc.paint(fn): fn(g, chunk) draws in world units (g is pre-scaled), once per chunk as it is built
    sc.paint = fn => ops.push(fn);
    const render = c => {
      const cvs = cv(c.w * R, c.h * R), g = G(cvs);
      g.drawImage(sc0.ground, c.x * r0, c.y * r0, c.w * r0, c.h * r0, 0, 0, c.w * R, c.h * R);
      for (const fn of ops) { g.save(); g.scale(R, R); g.translate(-c.x, -c.y); try { fn(g, c); } catch (e) { console.error('HD paint', e); } g.restore(); }
      built.push(c); if (built.length > KEEP) { const old = built.shift(); old._img = null; }
      return cvs;
    };
    for (let y = 0; y < h; y += CHUNK) for (let x = 0; x < w; x += CHUNK) {
      const c = { x, y, w: Math.min(CHUNK, w - x), h: Math.min(CHUNK, h - y), _img: null };
      Object.defineProperty(c, 'img', { get() { if (!c._img) c._img = render(c); else { const i = built.indexOf(c); if (i >= 0 && i < built.length - 1) { built.splice(i, 1); built.push(c); } } return c._img; } });
      chunks.push(c);
    }
    for (const p of HD.passes) if (p.room === room || p.room === '*') try { p.run(sc, level, opts || {}, HD); } catch (e) { console.error('HD pass', p.name, e); }
    return sc;
  }
  function buildOutside(level, opts) { return lift(BASE.buildOutside(level, opts), 'outside', level, opts); }
  function buildRoom(roomId, level, opts) { return lift(BASE.buildRoom(roomId, level, opts), roomId, level, opts); }

  // Passes: area modules (js/world/hd/*.js) register { name, room: 'outside'|'office'|'hall'|'shed'|'*', run(sc, level, opts, HD) }.
  const HD = LS.HD = {
    R, T, A, IMG, img, cv, G, passes: [], onLoad: null,
    pass(p) { HD.passes.push(p); HD.passes.sort((a, b) => (a.order || 0) - (b.order || 0)); },
    animal(ctx, e, im, kind, x, y, t, opts) {   // idle animation per kind, facing left or right
      const base = opts.anim || { cat: 'sit', duck: 'swim', pigeon: 'idle', sheep: 'graze' }[kind] || Object.keys(e.anims)[0].replace(/_(left|right)$/, '');
      const left = (opts.face != null ? opts.face < 0 : opts.facing === 'left');
      const a = e.anims[`${base}_${left ? 'left' : 'right'}`] || e.anims[base] || Object.values(e.anims)[0];
      const [fw, fh] = e.frame, [ax, ay] = e.anchor || [fw / 2, fh - 2], f = Math.floor(t * (opts.fps || 2) + (opts.seed != null ? opts.seed * 7 : (x % 7))) % a[1];   // a seed keeps a moving animal's frame from flickering with x
      if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
      ctx.drawImage(im, f * fw, a[0] * fh, fw, fh, x - ax / R, y - ay / R, fw / R, fh / R);
      if (opts.alpha != null) ctx.globalAlpha = 1;
    }
  };

  const ART = LS.TileArt = Object.assign({}, BASE, { res: R, load, buildOutside, buildRoom, drawActor, drawAnimal });
  Object.defineProperty(ART, 'actorHeight', { get: () => CH.byLook.size ? 30 : BASE.actorHeight });
})();
