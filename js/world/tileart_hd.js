/* LINESIDE HD renderer: 32 art px per map tile (scene.res = 2), drawn from the HD atlas (js/world/atlas_hd.js, built
 * by assets/hd/pack.py from the generators in assets/hd/<area>/). Wraps the 16px renderer (js/world/tileart.js) and
 * replaces it piece by piece: anything the HD atlas already covers is drawn in HD, everything else falls back to the
 * 16px art scaled up, so the game always works while the art is being made.
 *
 * Same contract as LS.TileArt (see tileart.js), plus `res: 2`. Add ?art=classic to the URL to see the 16px art.
 */
window.LS = window.LS || {};
(function () {
  'use strict';
  const BASE = LS.TileArt, A = LS.ATLAS_HD;
  if (!BASE || !A || /[?&]art=classic\b/.test(location.search)) return;
  const R = 2, T = 16, CHUNK = 512;          // art px per world unit; world units per tile; chunk size (world units)
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
      if (e.anims) { CH.animals[name] = e; continue; }
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
    ctx.drawImage(im, col * fw, row * fh, fw, fh, x - ax / R, y - ay / R, fw / R, fh / R);
    if (opts.alpha != null && opts.alpha < 1) ctx.globalAlpha = 1;
  }
  function drawAnimal(ctx, kind, x, y, t, opts) {
    const e = CH.animals[kind], im = e && img('chars', e.file);
    if (!im) return BASE.drawAnimal(ctx, kind, x, y, t, opts);
    return HD.animal(ctx, e, im, kind, x, y, t, opts || {});
  }

  /* ------------------------------------------------------------------ scenes */
  // Upscale a 16px scene to res 2 (nearest-neighbour), then let the HD passes paint over it.
  function lift(sc0, room, level, opts) {
    const w = sc0.w, h = sc0.h, chunks = [];
    for (let y = 0; y < h; y += CHUNK) for (let x = 0; x < w; x += CHUNK) {
      const cw = Math.min(CHUNK, w - x), ch = Math.min(CHUNK, h - y), c = cv(cw * R, ch * R), g = G(c);
      g.drawImage(sc0.ground, x * (sc0.res || 1), y * (sc0.res || 1), cw * (sc0.res || 1), ch * (sc0.res || 1), 0, 0, cw * R, ch * R);
      chunks.push({ img: c, g, x, y, w: cw, h: ch });
    }
    const objects = sc0.objects.map(o => Object.assign({}, o, { w: o.w || o.img.width / (sc0.res || 1), h: o.h || o.img.height / (sc0.res || 1) }));
    const sc = Object.assign({}, sc0, { res: R, chunks, objects, ground: null, base: sc0 });
    // paint into every chunk a callback draws on: fn(g) with g translated so world units x R art px line up
    sc.paint = fn => { for (const c of chunks) { c.g.save(); c.g.translate(-c.x * R, -c.y * R); fn(c.g, c); c.g.restore(); } };
    for (const p of HD.passes) if (p.room === room || p.room === '*') try { p.run(sc, level, opts || {}, HD); } catch (e) { console.error('HD pass', p.name, e); }
    for (const c of chunks) delete c.g;
    return sc;
  }
  function buildOutside(level, opts) { return lift(BASE.buildOutside(level, opts), 'outside', level, opts); }
  function buildRoom(roomId, level, opts) { return lift(BASE.buildRoom(roomId, level, opts), roomId, level, opts); }

  // Passes: area modules (js/world/hd/*.js) register { name, room: 'outside'|'office'|'hall'|'shed'|'*', run(sc, level, opts, HD) }.
  const HD = LS.HD = {
    R, T, A, IMG, img, cv, G, passes: [], onLoad: null,
    pass(p) { HD.passes.push(p); HD.passes.sort((a, b) => (a.order || 0) - (b.order || 0)); },
    animal(ctx, e, im, kind, x, y, t, opts) {   // default animal drawer: first anim, looping at 4 fps
      const names = Object.keys(e.anims || {}), a = e.anims[opts.anim] || e.anims[names[0]], [fw, fh] = e.frame, [ax, ay] = e.anchor || [fw / 2, fh - 2];
      const f = Math.floor(t * 4) % a[1], flip = (opts.face || (opts.facing === 'left' ? -1 : 1)) < 0;
      ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
      if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
      ctx.drawImage(im, f * fw, a[0] * fh, fw, fh, -ax / R, -ay / R, fw / R, fh / R); ctx.restore();
    }
  };

  const ART = LS.TileArt = Object.assign({}, BASE, { res: R, load, buildOutside, buildRoom, drawActor, drawAnimal });
  Object.defineProperty(ART, 'actorHeight', { get: () => CH.byLook.size ? 30 : BASE.actorHeight });
})();
