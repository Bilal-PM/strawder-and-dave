/* HD pass: nature and street props (assets/hd/out/props). Hedges and dry-stone walls are autotiled from the map
 * ('h', '#'); every 16px tree and piece of street furniture is swapped for its HD version at the same ground point.
 * Fingerposts and word signs stay 16px until their lettering is done in HD. */
(function () {
  'use strict';
  const HD = LS.HD; if (!HD || !HD.A.props) return;
  const M = HD.A.props.manifest, R = HD.R, T = HD.T;
  const hash = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const TREES = [['oak', 5], ['sycamore', 4], ['ash', 3], ['birch', 2], ['hawthorn', 2], ['rowan', 1], ['scots_pine', 1]];
  const TREE_W = TREES.reduce((a, t) => a + t[1], 0);
  const SWAP = { bench: 'bench', lamp: 'lamp_post', postbox: 'pillar_box', busstop: 'bus_stop', memorial: 'war_memorial', noticeboard: 'notice_board_m' };
  const obj = (name, gx, gy, extra) => {
    const e = M[name], im = e && HD.img('props', e.file); if (!im) return null;
    const o = Object.assign({ img: im, dx: gx - e.anchor[0] / R, dy: gy - e.anchor[1] / R, w: e.w / R, h: e.h / R, sortY: gy, kind: 'hd_prop', id: name }, extra || {});
    if (e.fade) o.fade = { x: o.dx + e.fade.x / R, y: o.dy + e.fade.y / R, w: e.fade.w / R, h: e.fade.h / R };
    return o;
  };
  function treeFor(x, y) {
    let r = hash(x, y, 7) * TREE_W, sp = 'oak';
    for (const [s, w] of TREES) { if ((r -= w) < 0) { sp = s; break; } }
    const size = hash(x, y, 11) < 0.55 ? 'l' : hash(x, y, 13) < 0.7 ? 'm' : 's';
    return M[`${sp}_${size}`] ? `${sp}_${size}` : 'oak_l';
  }
  HD.pass({
    name: 'props', room: 'outside', order: 30,
    run(sc, level) {
      const rows = level.rows, at = (x, y) => (rows[y] || '')[x] || '', add = [];
      // hedges and walls: 16-mask autotiles (N=1 E=2 S=4 W=8), two variants each
      for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
        const ch = at(x, y), fam = ch === 'h' ? 'hedge' : ch === '#' ? 'wall' : null; if (!fam) continue;
        const same = c => c === ch, mask = (same(at(x, y - 1)) ? 1 : 0) | (same(at(x + 1, y)) ? 2 : 0) | (same(at(x, y + 1)) ? 4 : 0) | (same(at(x - 1, y)) ? 8 : 0);
        const e = M[`${fam}_${mask}_${hash(x, y, 3) < 0.5 ? 0 : 1}`] || M[`${fam}_${mask}_0`], im = e && HD.img('props', e.file); if (!im) continue;
        const o = e.origin || [0, 0];
        add.push({ img: im, dx: x * T - o[0] / R, dy: y * T - o[1] / R, w: e.w / R, h: e.h / R, sortY: (y + 1) * T - 2, kind: 'hd_bound' });
      }
      // woodland: dense 't' masses get the tiling canopy (painted into the ground) with bulging edges and a front row
      // of trees on their southern boundary; every other 't' is a single HD tree
      const T4 = (e, i, j) => [((i % 4) + 4) % 4 * 48, ((j % 4) + 4) % 4 * 48];
      const mass = (x, y) => { if (at(x, y) !== 't') return false; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy) === 't') n++; return n >= 6; };
      const F = M.forest_fill, ES = M.forest_edge_s, EN = M.forest_edge_n, EE = M.forest_edge_e, EW = M.forest_edge_w;
      const fi = F && HD.img('props', F.file), es = ES && HD.img('props', ES.file), en = EN && HD.img('props', EN.file), ee = EE && HD.img('props', EE.file), ew = EW && HD.img('props', EW.file);
      const cells = {};
      const esCell = i => cells[i] || (cells[i] = (() => { const c = HD.cv(48, ES.h); HD.G(c).drawImage(es, i * 48, 0, 48, ES.h, 0, 0, 48, ES.h); return c; })());
      for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
        if (at(x, y) !== 't') continue;
        if (fi && mass(x, y)) {
          const [sx, sy] = T4(F, x, y);
          sc.paint(g => {
            g.drawImage(fi, sx, sy, 48, 48, x * T, y * T, T, T);
            if (en && at(x, y - 1) !== 't') g.drawImage(en, sx, 0, 48, EN.h, x * T, y * T - EN.h / R + 20 / R, T, EN.h / R);
            if (ee && at(x + 1, y) !== 't') g.drawImage(ee, 0, sy, EE.w, 48, x * T + T - 26 / R, y * T, EE.w / R, T);
            if (ew && at(x - 1, y) !== 't') g.drawImage(ew, 0, sy, EW.w, 48, x * T - EW.w / R + 26 / R, y * T, EW.w / R, T);
          });
          if (es && at(x, y + 1) !== 't') add.push({ img: esCell(sx / 48), dx: x * T, dy: (y + 1) * T - ES.anchor[1] / R, w: T, h: ES.h / R, sortY: (y + 1) * T - 2, kind: 'hd_tree' });
        } else {
          const n = obj(treeFor(x, y), x * T + 8, y * T + 14); if (n) add.push(n);
        }
      }
      // flower beds ('v'): planted up
      const BED = ['shrub_rose', 'foxgloves', 'shrub_s', 'willowherb', 'shrub_rose', 'dandelions'];
      for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
        if (at(x, y) !== 'v') continue;
        const n = obj(BED[Math.floor(hash(x, y, 41) * BED.length)], x * T + 5 + hash(x, y, 43) * 6, y * T + 12 + hash(x, y, 47) * 3);
        if (n) { n.fade = null; add.push(n); }
      }
      // fingerposts: HD post with the right arms; the words show as a readable label when the player walks up
      const ARROW = { N: '↑', E: '→', S: '↓', W: '←' }, posts = level.fingerposts || [];
      const fpFor = dirs => ['NESW', 'NEW', 'NE', 'EW'].find(k => dirs.every(d => k.includes(d))) || 'NESW';
      for (const fp of posts) {
        const dirs = fp.arms.map(a => a[0]), n = obj('fingerpost_' + fpFor(dirs), fp.tile[0] * T + 8, fp.tile[1] * T + 14);
        if (n) { n.labels = fp.arms.map(a => `${ARROW[a[0]] || ''}  ${a.slice(3)}`); n.kind = 'hd_fingerpost'; add.push(n); }
      }
      const nearPost = o => posts.some(fp => Math.abs(o.dx + (o.w || 0) / 2 - (fp.tile[0] * T + 8)) < 40 && Math.abs(o.sortY - (fp.tile[1] * T + 14)) < 24);
      const keep = [];
      for (const o of sc.objects) {
        if (o.kind === 'fingerpost' && posts.length && nearPost(o)) continue;
        const gx = o.dx + (o.w || 0) / 2, gy = o.sortY;
        if (o.kind === 'tree') continue;
        if (SWAP[o.kind]) { const n = obj(SWAP[o.kind], Math.round(gx), gy); if (n) { add.push(n); continue; } }
        keep.push(o);
      }
      sc.objects = keep.concat(add);
    }
  });
})();
