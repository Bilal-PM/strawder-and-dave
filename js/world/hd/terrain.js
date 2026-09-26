/* HD pass: terrain (assets/hd/out/terrain). Paints the ground surfaces, their edges (grass creeping over paths, kerbs,
 * water banks) and the closed line's track. Map characters that hold baked 16px features (fences, rocks, beds, the main
 * line, crossings, bridges, stepping stones, buildings) are left as they are until their HD pieces land. */
(function () {
  'use strict';
  const HD = LS.HD; if (!HD || !HD.A.terrain) return;
  const M = HD.A.terrain.manifest, R = HD.R, T = HD.T;
  const hash = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const BASE = { ',': 'lawn', '.': 'grass', '"': 'meadow', p: 'dirt', _: 'gravel', s: 'setts', '-': 'flags', r: 'tarmac', '%': 'tarmac', c: 'tarmac',
    a: 'concrete', e: 'platform', '^': 'platform_edge_N', w: 'water', ':': 'cess_old', '/': 'cess_old', z: 'cess_old', '=': 'ballast_old' };
  const SOFT = ',."', HARD = 'p:-rscae_%/z';
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
  HD.pass({
    name: 'terrain', room: 'outside', order: 10,
    run(sc, level, opts) {
      const rows = level.rows, at = (x, y) => (rows[y] || '')[x] || '', live = opts.lineState === 'live';
      sc.paint((g, ch) => {
        const tx0 = Math.floor(ch.x / T), ty0 = Math.floor(ch.y / T), tx1 = Math.ceil((ch.x + ch.w) / T), ty1 = Math.ceil((ch.y + ch.h) / T);
        const X0 = tx0 - 1, Y0 = ty0 - 1, X1 = tx1 + 1, Y1 = ty1 + 1;   // one tile of margin so sprites crossing a chunk edge are complete
        for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
          const c = at(x, y); let n = BASE[c]; if (!n) continue;
          if (c === '=' && live) n = 'ballast_live'; else if (c === '=' && hash(x, y, 7) < 0.25) n = 'ballast_old_weedy';
          if ((c === ':' || c === '/' || c === 'z') && live) n = 'cess_new';
          if (c === '^' && at(x, y + 1) !== 'e') n = 'platform';
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
        // closed line: horizontal track bands of '=' two rows deep
        const sl = live ? ['sleeper_new_H'] : ['sleeper_rotten_H', 'sleeper_weathered_H'], rail = live ? 'rail_live_H' : 'rail_rust_H';
        for (let y = Y0; y < Y1; y++) {
          if (at(tx0, y) === undefined) continue;
          let top = null; if (rows[y] && rows[y + 1]) top = y;
          for (let x = X0; x < X1; x++) {
            if (at(x, y) !== '=' || at(x, y + 1) !== '=' || at(x, y - 1) === '=') continue;
            const cy = (y + 1) * T;   // band centre (world units)
            for (let k = 0; k < 2; k++) { const sx = x * T + 4 + k * 8, v = Math.floor(hash(Math.round(sx), y, 19) * 6); sprite(g, sl[v % sl.length], v, sx, cy); }
            const e = M[rail], im = e && HD.img('terrain', e.file);
            if (im) for (const off of [29, 65]) g.drawImage(im, e.x, e.y, e.w, e.h, x * T, y * T + off / R, T, e.h / R);
          }
        }
      });
    }
  });
})();
