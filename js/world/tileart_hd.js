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
  function drawActor(ctx, look, x, y, facing, frame, opts) {
    opts = opts || {};
    const slot = CH.byLook.get(lookKey(look)), e = slot && ((opts.ppe && slot.ppe) || slot.plain), im = e && img('chars', e.file);
    if (!im) return BASE.drawActor(ctx, look, x, y, facing, frame, opts);
    const [fw, fh] = e.frame || [32, 64], [ax, ay] = e.anchor || [16, 62], cols = e.cols || 5;
    const rows = e.rows || ['down', 'up', 'left', 'right'], row = Math.max(0, rows.indexOf(facing));
    const col = opts.moving ? 1 + (((frame | 0) % (cols - 1)) + (cols - 1)) % (cols - 1) : 0;
    if (opts.alpha != null && opts.alpha < 1) ctx.globalAlpha = opts.alpha;
    if (opts.shadow !== false) { ctx.fillStyle = 'rgba(42,29,50,0.16)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 2.2, 9, 2.6, 0.32, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(42,29,50,0.3)'; ctx.beginPath(); ctx.ellipse(x, y - 0.5, 6.5, 2.2, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.drawImage(im, col * fw, row * fh, fw, fh, x - ax / R, y - ay / R, fw / R, fh / R);
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
      const [fw, fh] = e.frame, [ax, ay] = e.anchor || [fw / 2, fh - 2], f = Math.floor(t * 2 + (x % 7)) % a[1];
      if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
      ctx.drawImage(im, f * fw, a[0] * fh, fw, fh, x - ax / R, y - ay / R, fw / R, fh / R);
      if (opts.alpha != null) ctx.globalAlpha = 1;
    }
  };

  const ART = LS.TileArt = Object.assign({}, BASE, { res: R, load, buildOutside, buildRoom, drawActor, drawAnimal });
  Object.defineProperty(ART, 'actorHeight', { get: () => CH.byLook.size ? 30 : BASE.actorHeight });
})();
