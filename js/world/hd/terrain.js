/* HD pass: terrain (assets/hd/out/terrain). Paints the ground surfaces, their edges (grass creeping over paths, kerbs,
 * water banks) and the closed line's track. Map characters that hold baked 16px features (fences, rocks, beds, the main
 * line, crossings, bridges, stepping stones, buildings) are left as they are until their HD pieces land. */
(function () {
  'use strict';
  const HD = LS.HD; if (!HD || !HD.A.terrain) return;
  const M = HD.A.terrain.manifest, R = HD.R, T = HD.T;
  const hash = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const BASE = { ',': 'lawn', '.': 'grass', '"': 'meadow', p: 'dirt', _: 'gravel', s: 'setts', '-': 'flags', r: 'tarmac', '%': 'tarmac', c: 'tarmac',
    a: 'concrete', v: 'soil', e: 'platform', '|': 'ballast_live', j: 'cess_old', l: 'tarmac', x: 'tarmac', b: 'cess_old', f: 'grass', '!': 'cess_old', m: 'setts', k: 'gravel', h: 'grass', '#': 'grass', g: 'dirt', '^': 'platform_edge_N', w: 'water', ':': 'cess_old', '/': 'cess_old', z: 'cess_old', '=': 'ballast_old' };
  const SOFT = ',."', HARD = 'p:-rscae_%/z';
  function vnoise(x, y, cell, s) {   // smooth value noise 0..1
    const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy); let fx = gx - x0, fy = gy - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  }
  function pick(e, x, y, s) {
    const n = e.cells.length, w = e.weights; if (!w) return e.cells[Math.floor(hash(x, y, s) * n)];
    let t = hash(x, y, s) * w.reduce((a, b) => a + b, 0); for (let i = 0; i < n; i++) if ((t -= w[i]) < 0) return e.cells[i]; return e.cells[n - 1];
  }
  function tile(g, name, x, y, s) {
    const e = M[name], im = e && HD.img('terrain', e.file); if (!im) return false;
    let c = pick(e, x, y, s || 1); if (Array.isArray(c[0])) c = c[0];   // animated sets: frame 0
    g.drawImage(im, e.x + c[0], e.y + c[1], e.w, e.h, x * T, y * T, e.w / R, e.h / R); return true;
  }
  function edges(g, at, x, y, set, other) {
    const o = (dx, dy) => other(at(x + dx, y + dy)), sd = { N: o(0, -1), S: o(0, 1), W: o(-1, 0), E: o(1, 0) }, used = {};
    for (const c of ['NW', 'NE', 'SW', 'SE']) if (sd[c[0]] && sd[c[1]]) { tile(g, `${set}_L_${c}`, x, y, 5); used[c[0]] = used[c[1]] = 1; }
    for (const s of 'NSEW') if (sd[s] && !used[s]) tile(g, `${set}_${s}`, x, y, 5);
    for (const [c, dx, dy] of [['NW', -1, -1], ['NE', 1, -1], ['SW', -1, 1], ['SE', 1, 1]]) if (!sd[c[0]] && !sd[c[1]] && o(dx, dy)) tile(g, `${set}_diag_${c}`, x, y, 5);
  }
  function sprite(g, name, v, wx, wy) {   // wx, wy = anchor point in world units
    const e = M[name], im = e && HD.img('terrain', e.file); if (!im) return;
    const c = e.cells[v % e.cells.length], w = e.w, h = e.h;
    g.drawImage(im, e.x + c[0], e.y + c[1], w, h, wx - e.anchor[0] / R, wy - e.anchor[1] / R, w / R, h / R);
  }

  /* ---------------------------------------------------------------- track (geometry ported from tileart.js) */
  const KIND = {
    old: { sl: ['sleeper_rotten', 'sleeper_weathered', 'sleeper_weathered'], rail: 'rail_rust', xs: 'rail_xsec_rust', bal: 'ballast_old' },
    rot: { sl: ['sleeper_rotten'], rail: 'rail_rust', xs: 'rail_xsec_rust', bal: 'ballast_old' },
    live: { sl: ['sleeper_new'], rail: 'rail_live', xs: 'rail_xsec_live', bal: 'ballast_live' },
    main: { sl: ['sleeper_concrete'], rail: 'rail_live', xs: 'rail_xsec_live', bal: 'ballast_live' }
  };
  const ent = n => { const e = M[n], im = e && HD.img('terrain', e.file); return im ? [e, im] : null; };
  function trackH(g, x0, x1, top, k) {                       // world units; top = band top (2 tiles deep)
    const cy = top + T;
    for (let sx = Math.ceil((x0 - 4) / 8) * 8 + 4; sx < x1; sx += 8) { const v = Math.floor(hash(Math.round(sx), top, 19) * 6); sprite(g, k.sl[v % k.sl.length] + '_H', v, sx, cy); }
    const r = ent(k.rail + '_H'); if (!r) return; const [e, im] = r;
    for (const off of [29, 65]) for (let x = x0; x < x1; x += T) { const w = Math.min(T, x1 - x); g.drawImage(im, e.x, e.y, w * R, e.h, x, top + off / R, w, e.h / R); }
  }
  function trackV(g, y0, y1, left, k) {                      // left = band left edge (2 tiles wide)
    const cx = left + T;
    for (let sy = Math.ceil((y0 - 4) / 8) * 8 + 4; sy < y1; sy += 8) { const v = Math.floor(hash(left, Math.round(sy), 23) * 4); sprite(g, k.sl[v % k.sl.length] + '_V', v, cx, sy); }
    const r = ent(k.rail + '_V'); if (!r) return; const [e, im] = r;
    for (const off of [29, 65]) for (let y = y0; y < y1; y += T) { const h = Math.min(T, y1 - y); g.drawImage(im, e.x, e.y, e.w, h * R, left + off / R, y, e.w / R, h); }
  }
  const bez = (p0, p1, p2, p3) => t => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
  function curve(g, P, kAt, skipRail) {
    const N = 360, pts = []; for (let i = 0; i <= N; i++) pts.push(P(i / N));
    // ballast bed: stroke the path with the ballast texture
    const b = ent(kAt(pts[N >> 1]).bal);
    if (b) { const c = HD.cv(48, 48); HD.G(c).drawImage(b[1], b[0].x, b[0].y, 48, 48, 0, 0, 48, 48); const pat = g.createPattern(c, 'repeat'); pat.setTransform && pat.setTransform(new DOMMatrix().scale(1 / R));
      g.save(); g.strokeStyle = pat; g.lineWidth = 30; g.lineCap = 'butt'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.restore(); }
    // sleepers every 8 world units of arc, turned to the curve
    let acc = 0;
    for (let i = 1; i <= N; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; acc += Math.hypot(x1 - x0, y1 - y0); if (acc < 8) continue; acc -= 8;
      const k = kAt({ x: x1, y: y1 }), v = Math.floor(hash(Math.round(x1), Math.round(y1), 31) * 6), s = ent(k.sl[v % k.sl.length] + '_H'); if (!s) continue;
      const [e, im] = s, c = e.cells[v % e.cells.length], ang = Math.atan2(y1 - y0, x1 - x0);
      g.save(); g.translate(x1, y1); g.rotate(ang); g.drawImage(im, e.x + c[0], e.y + c[1], e.w, e.h, -e.anchor[0] / R, -e.anchor[1] / R, e.w / R, e.h / R); g.restore();
    }
    // rails: stamp the 1px cross-section along each rail, heads 6 world units either side of the centre line
    for (let i = 1; i <= N * 2; i++) {
      const t = i / (N * 2), p = P(t), q = P(Math.max(0, t - 0.002)), ang = Math.atan2(p[1] - q[1], p[0] - q[0]), nx = -Math.sin(ang), ny = Math.cos(ang);
      const pt = { x: p[0], y: p[1] }; if (skipRail && skipRail(pt)) continue;
      const r = ent(kAt(pt).xs); if (!r) continue; const [e, im] = r;
      for (const off of [-6, 6]) { g.save(); g.translate(p[0] + nx * off, p[1] + ny * off); g.rotate(ang); g.drawImage(im, e.x, e.y, 1, e.h, -0.2, -e.h / R / 2, 0.45, e.h / R); g.restore(); }
    }
  }
  function drawTrack(g, rows, at, live, level) {
    const W = rows[0].length, H = rows.length;
    let ty = -1; for (let y = 0; y < H && ty < 0; y++) for (let x = 0; x < W; x++) if (at(x, y) === '=' && at(x, y + 1) === '=') { ty = y; break; }
    if (ty < 0) return;
    let mainX = -1; for (let x = 0; x < W; x++) if (at(x, ty) === '|') { mainX = x; break; }
    const cross = []; for (let x = 0; x < W; x++) if (at(x, ty) === 'x') cross.push(x);
    const cx0 = cross.length ? cross[0] : -1, cx1 = cross.length ? cross[cross.length - 1] : -1;
    let jx0 = W; for (let x = 0; x < W; x++) if (at(x, ty) === 'j') { jx0 = x; break; } if (jx0 === W) jx0 = mainX > 0 ? mainX - 2 : W - 8;
    let bx0 = 0; for (let x = 0; x < W; x++) if (at(x, ty) === '=' || at(x, ty) === '$') { bx0 = x; break; }
    let sidRow = -1, tx0 = W, tx1 = -1, depotE = -1;
    for (let y = ty + 2; y < H && sidRow < 0; y++) for (let x = 1; x < W; x++) if (at(x, y) === '/' && at(x - 1, y) === 'N') { sidRow = y; depotE = x; break; }
    if (sidRow > 0) for (let y = ty + 2; y < sidRow; y++) for (let x = 0; x < W; x++) if (at(x, y) === '/') { tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); }
    const def = id => { const o = (level.outside || []).find(e => e.id === id); return o ? o.tile : null; };
    const branch = live ? KIND.live : KIND.old, ds = def('d_sleepers'), rot = ds ? [(ds[0] - 1) * T, (ds[0] + 3) * T] : null;
    const branchC = ty * T + 16, sidC = (sidRow + 1) * T;
    // main line: two tracks, full height except under the road bridge
    if (mainX >= 0) for (let k = 0; k < 2; k++) {
      const col = mainX + k * 2; let y = 0;
      while (y < H) { if (at(col, y) === '%') { y++; continue; } let y1 = y; while (y1 + 1 < H && at(col, y1 + 1) !== '%') y1++; trackV(g, y * T, (y1 + 1) * T, col * T, KIND.main); y = y1 + 1; }
    }
    // branch running line (rotten sleepers at the worst spot), broken by the crossing deck
    const segs = cx0 >= 0 ? [[bx0 * T, cx0 * T], [(cx1 + 1) * T, (jx0 - 4) * T]] : [[bx0 * T, (jx0 - 4) * T]];
    for (const [a, b] of segs) {
      if (rot && !live && a < rot[1] && b > rot[0]) { trackH(g, a, rot[0], ty * T, branch); trackH(g, rot[0], rot[1], ty * T, KIND.rot); trackH(g, rot[1], b, ty * T, branch); }
      else trackH(g, a, b, ty * T, branch);
    }
    // crossing deck: timber (closed) or rubber (live) slices across the band
    if (cx0 >= 0) { const d = ent(live ? 'xing_rubber_H' : 'xing_timber_H'); if (d) for (let x = cx0; x <= cx1; x++) { const [e, im] = d, c = e.cells[x % e.cells.length]; g.drawImage(im, e.x + c[0], e.y + c[1], e.w, e.h, x * T, ty * T, T, 2 * T); } }
    // siding into the depot + the turnout
    if (sidRow > 0 && tx1 >= 0) {
      const b = ent(branch.bal); if (b) for (let x = depotE; x < tx0 - 2; x++) for (const yy of [sidRow, sidRow + 1]) { const [e, im] = b, c = e.cells[0]; g.drawImage(im, e.x + c[0], e.y + c[1], 48, 48, x * T, yy * T, T, T); }
      trackH(g, depotE * T, (tx0 - 3) * T + 4, sidRow * T, branch);
      curve(g, bez([(tx1 + 4) * T, branchC], [tx1 * T, branchC], [(tx0 + 1) * T, sidC], [(tx0 - 3) * T, sidC]), () => branch, p => p.y < ty * T + 27 && p.x > (tx1 + 1) * T);
    }
    // junction onto the main line (live beyond the limit of closed line)
    const jEnd = mainX >= 0 ? mainX * T + 16 : 120 * T;
    curve(g, bez([(jx0 - 5) * T, branchC], [(jx0 - 0.2) * T, branchC], [jEnd, (ty + 1.8) * T], [jEnd, (ty + 6) * T]), p => (p.x < (jx0 - 1) * T ? branch : KIND.live));
  }

  HD.pass({
    name: 'terrain', room: 'outside', order: 10,
    run(sc, level, opts) {
      const rows = level.rows, at = (x, y) => (rows[y] || '')[x] || '', live = opts.lineState === 'live';
      sc.paint((g, ch) => {
        const tx0 = Math.floor(ch.x / T), ty0 = Math.floor(ch.y / T), tx1 = Math.ceil((ch.x + ch.w) / T), ty1 = Math.ceil((ch.y + ch.h) / T);
        const X0 = tx0 - 1, Y0 = ty0 - 1, X1 = tx1 + 1, Y1 = ty1 + 1;   // one tile of margin so sprites crossing a chunk edge are complete
        for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
          const c = at(x, y); let n = BASE[c]; if (!n) continue;
          if (c === '=' && live) n = 'ballast_live';
          if ((c === ':' || c === '/' || c === 'z' || c === 'j') && live) n = 'cess_new';
          else if (c === ':' || c === '/' || c === 'z' || c === 'j') n = vnoise(x, y, 4.5, 51) > 0.58 ? 'cess_old' : 'ballast_old';   // weeds in clumps, not every tile
          if (c === '=' && !live) n = vnoise(x, y, 5, 53) > 0.62 ? 'ballast_old_weedy' : 'ballast_old';
          if (c === 'f' || c === 'h' || c === '#') {   // under a boundary: match the ground beside it
            const nb = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)];
            n = nb.some(k => k === ':' || k === '/' || k === 'j') ? (live ? 'cess_new' : 'cess_old') : nb.includes('|') ? 'ballast_live' : nb.includes(',') ? 'lawn' : nb.includes('"') ? 'meadow' : 'grass';
          }
          if (c === 'm') { const nb = [at(x - 1, y), at(x + 1, y), at(x, y + 1)].map(k => BASE[k]).filter(Boolean); n = nb[0] || 'flags'; }
          if (c === '^' && at(x, y + 1) !== 'e') n = 'platform';
          if (c === 'b' && (at(x, y - 1) === 'b' && at(x, y + 1) === 'b')) n = live ? 'ballast_live' : 'ballast_old';   // track band over the bridge
          if (c === '|' && live === false) n = 'ballast_live';
          tile(g, n, x, y, 1);
        }
        for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
          const c = at(x, y); if (!BASE[c]) continue;
          if (c === 'w') edges(g, at, x, y, 'bank', k => k !== 'w' && k !== 'b' && k !== 'o');
          if (c === 'p') edges(g, at, x, y, 'path_edge', k => SOFT.includes(k));
          if (c === '-') edges(g, at, x, y, 'kerb', k => k === 'r' || k === '%' || k === 'c');
          if (HARD.includes(c)) { edges(g, at, x, y, 'grass_edge', k => k === '.'); edges(g, at, x, y, 'lawn_edge', k => k === ',' || k === '"'); }
        }
        // road markings: lift the 16px markings (white, yellow, bay grey) off the old ground onto the HD tarmac, worn a little
        const base = sc.base && sc.base.ground, r0 = (sc.base && sc.base.res) || 1;
        if (base) {
          const bx = Math.max(0, X0 * T), by = Math.max(0, Y0 * T), bw = Math.min(base.width / r0, X1 * T) - bx, bh = Math.min(base.height / r0, Y1 * T) - by;
          if (bw > 0 && bh > 0) {
            const d = base.getContext('2d').getImageData(bx * r0, by * r0, bw * r0, bh * r0).data, W = bw * r0;
            const ink = { 'ffffff': 'rgba(236,236,228,0.92)', 'c0cbdc': 'rgba(200,204,206,0.75)', 'feae34': 'rgba(236,190,72,0.95)' };
            for (let py = 0; py < bh * r0; py++) for (let px = 0; px < W; px++) {
              const i = (py * W + px) * 4, key = ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).padStart(6, '0'), col = ink[key]; if (!col) continue;
              const wx = bx + px / r0, wy = by + py / r0, cch = at(Math.floor(wx / T), Math.floor(wy / T));
              if (cch !== 'r' && cch !== '%' && cch !== 'c') continue;
              if (hash(Math.floor(wx * 3), Math.floor(wy * 3), 29) < 0.08) continue;
              g.fillStyle = col; g.fillRect(wx, wy, 1 / r0, 1 / r0);
            }
          }
        }
        drawTrack(g, rows, at, live, level);
        // door mats: a coir mat on every 'm' tile, so entrances read at a glance
        for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (at(x, y) === 'm') {
          const px = x * T, py = y * T;
          g.fillStyle = 'rgba(42,29,50,0.28)'; g.fillRect(px + 1.6, py + 3.3, 13.4, 9);
          g.fillStyle = '#6e4f33'; g.fillRect(px + 1.3, py + 2.7, 13.4, 9);
          g.fillStyle = '#a8814f'; g.fillRect(px + 2, py + 3.3, 12, 7.7);
          g.fillStyle = '#c29a62'; for (let k = 0; k < 12; k += 1.34) g.fillRect(px + 2 + k, py + 3.3, 0.34, 7.7);
          g.fillStyle = '#8a6a40'; g.fillRect(px + 2, py + 10.3, 12, 0.67);
        }
      });
    }
  });
})();
