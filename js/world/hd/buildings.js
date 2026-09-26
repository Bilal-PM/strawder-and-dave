/* HD pass: buildings and structures (assets/hd/out/rail, assets/hd/out/town). Places each sprite on its map footprint,
 * letters its blank boards in crisp pixel text (no generated lettering in the art), and removes the 16px objects it
 * replaces. */
(function () {
  'use strict';
  const HD = LS.HD; if (!HD) return;
  const R = HD.R, T = HD.T;
  const REPLACES = new Set(['building', 'canopy', 'ppe_gate', 'buffer', 'site_board', 'bridge', 'cabinet', 'signal', 'washing', 'sign', 'trolley']);
  // words for the blank boards: area/name/sign -> text ('' = leave blank)
  const WORDS = {
    'rail/station_closed/fascia': 'HARROWBY', 'rail/station_live/fascia': 'HARROWBY',
    'rail/running_in_board_closed/face': 'HARROWBY', 'rail/running_in_board_live/face': 'HARROWBY',
    'rail/project_office/banner': 'KESTREL VALE LINE  ·  PROJECT OFFICE', 'rail/welfare_cabin/board': 'WELFARE',
    'rail/stores_container/plate': 'STORES', 'rail/signal_box/nameboard': 'KESTREL JUNCTION',
    'rail/site_board/title': 'KESTREL VALE LINE', 'rail/depot/date_tablet': 'HARROWBY SHED  1889',
    'rail/limit_board/face': 'LIMIT OF CLOSED LINE', 'rail/whistle_board/face': 'W', 'rail/milepost/plate': '12',
    'town/hall/datestone': '1911'
  };
  function wanted(name, live) {
    if (/_open$|^heras_|^ppe_plate$|^crossing_barrier_lowered|_lit$|^signal_colour_red$|^(palisade|wire|timber)_\d/.test(name)) return false;
    if (name === 'trap_points') return !live;
    if (/_closed$|_closedline|_dead$/.test(name)) return !live;
    if (/_live$|^crossing_barrier_raised$/.test(name)) return live;
    return true;
  }
  // crisp pixel lettering: render with canvas text at art resolution, then snap alpha to on/off
  function letter(src, rects, area, name, words) {
    let c = null;
    for (const [key, r] of Object.entries(rects || {})) {
      if (!r) continue;
      const text = (words || WORDS)[`${area}/${name}/${key}`] ?? (/^[A-Z0-9' .·-]+$/.test(key) && key.length > 2 ? key : '');
      if (!text) continue;
      if (!c) { c = HD.cv(src.width, src.height); HD.G(c).drawImage(src, 0, 0); }
      const g = HD.G(c), [x, y, w, h] = r;
      const d = g.getImageData(x, y, w, h).data; let lum = 0; for (let i = 0; i < d.length; i += 4) lum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; lum /= d.length / 4;
      const ink = lum > 140 ? [42, 29, 34] : [250, 240, 214], shadow = lum > 140 ? null : [30, 22, 26];
      const t = HD.cv(w, h), tg = t.getContext('2d');
      const fit = (lines, max) => { let size = Math.min(max, 20); tg.font = `bold ${size}px Inter, Arial, sans-serif`; while (size > 5 && Math.max(...lines.map(l => tg.measureText(l).width)) > w - 4) { size--; tg.font = `bold ${size}px Inter, Arial, sans-serif`; } return size; };
      let lines = [text], size = fit(lines, h - 2);
      if (size < 9 && text.includes(' ') && h >= 20) {   // too small on one line: wrap onto two
        const words = text.split(' '); let best = null;
        for (let i = 1; i < words.length; i++) { const two = [words.slice(0, i).join(' '), words.slice(i).join(' ')], sz = fit(two, Math.floor(h / 2) - 1); if (!best || sz > best[1]) best = [two, sz]; }
        if (best && best[1] > size) { lines = best[0]; size = best[1]; }
      }
      tg.font = `bold ${size}px Inter, Arial, sans-serif`; tg.fillStyle = '#000'; tg.textAlign = 'center'; tg.textBaseline = 'middle';
      lines.forEach((l, i) => tg.fillText(l, w / 2, h / 2 + 0.5 + (i - (lines.length - 1) / 2) * (size + 1)));
      const td = tg.getImageData(0, 0, w, h), out = g.getImageData(x, y, w, h);
      for (let i = 0; i < td.data.length; i += 4) if (td.data[i + 3] > 110) {
        if (shadow) { const j = i + 4 + w * 4; if (j < out.data.length && td.data[j + 3] <= 110) { out.data[j] = shadow[0]; out.data[j + 1] = shadow[1]; out.data[j + 2] = shadow[2]; } }
        out.data[i] = ink[0]; out.data[i + 1] = ink[1]; out.data[i + 2] = ink[2]; out.data[i + 3] = 255;
      }
      g.putImageData(out, x, y);
    }
    return c || src;
  }
  HD.letter = letter;
  const lettered = {};
  function area(sc, level, opts, name) {
    const A = HD.A[name]; if (!A) return { add: [], kill: [] };
    const live = opts.lineState === 'live', add = [], kill = [];
    for (const [id, e] of Object.entries(A.manifest)) {
      const origin = e && (e.map_origin || e.suggested_tile);
      if (!e || !e.file || !origin || !wanted(id, live)) continue;
      const src = HD.img(name, e.file); if (!src) continue;
      const im = lettered[name + id] || (lettered[name + id] = letter(src, e.signs || e.sign, name, id));
      const [tw, th] = e.tiles || [1, 1], [ax, ay] = e.anchor || [0, e.h];
      for (const [col, row] of (e.placements || [origin])) {
        const gx = col * T, gy = (row + th) * T, dx = gx - ax / R, dy = gy - ay / R;
        const p = { x0: col * T, x1: (col + tw) * T, y0: row * T, y1: gy }; kill.push(p);
        if (e.layer === 'ground') { sc.paint(g => g.drawImage(im, col * T, row * T, e.w / R, e.h / R)); continue; }
        const o = { img: im, dx, dy, w: e.w / R, h: e.h / R, sortY: e.sortY_map ? e.sortY_map / R : gy, kind: 'hd_' + name, id };
        if (e.fade) o.fade = { x: dx + e.fade.x / R, y: dy + e.fade.y / R, w: e.fade.w / R, h: e.fade.h / R + 16 };
        add.push(o);
        for (const l of e.lights || []) sc.lights.push({ x: dx + l[0] / R, y: dy + l[1] / R, r: l[2] / R });
      }
    }
    // lineside fencing ('f'): palisade, post-and-wire or timber post-and-rail by location (rule from tileart.js fenceStyle)
    const style = (x, y) => x >= 117 || (x >= 36 && x <= 81 && y >= 22 && y <= 34) ? 'palisade' : (x <= 36 && y >= 24 && y <= 31) ? 'timber' : 'wire';
    if (A.manifest.palisade_0_0) for (let y = 0; y < level.rows.length; y++) for (let x = 0; x < level.rows[y].length; x++) {
      const rw = level.rows; if (rw[y][x] !== 'f') continue;
      const is = (xx, yy) => { const c = (rw[yy] || '')[xx]; return c === 'f' || c === '!'; };
      const mask = (is(x, y - 1) ? 1 : 0) | (is(x + 1, y) ? 2 : 0) | (is(x, y + 1) ? 4 : 0) | (is(x - 1, y) ? 8 : 0);
      const v = ((x * 7 + y * 13) % 5) === 0 ? 1 : 0, e = A.manifest[`${style(x, y)}_${mask}_${v}`] || A.manifest[`${style(x, y)}_${mask}_0`], im = e && HD.img(name, e.file); if (!im) continue;
      add.push({ img: im, dx: x * T - e.origin[0] / R, dy: y * T - e.origin[1] / R, w: e.w / R, h: e.h / R, sortY: y * T + e.anchor[1] / R - e.origin[1] / R, kind: 'hd_fence' });
    }
    // Heras fencing: one panel per 'k' tile, east-west or north-south by its neighbours
    const H = A.manifest.heras_h, V = A.manifest.heras_v, rows = level.rows;
    if (H && V) for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] !== 'k') continue;
      const e = (rows[y][x - 1] === 'k' || rows[y][x + 1] === 'k') ? H : V, im = HD.img(name, e.file); if (!im) continue;
      add.push({ img: im, dx: x * T - e.anchor[0] / R, dy: (y + 1) * T - e.anchor[1] / R, w: e.w / R, h: e.h / R, sortY: (y + 1) * T - 1, kind: 'hd_fence' });
    }
    return { add, kill };
  }
  HD.pass({
    name: 'buildings', room: 'outside', order: 20,
    run(sc, level, opts) {
      sc.lights = (sc.lights || []).slice();
      const parts = ['rail', 'town'].map(n => area(sc, level, opts, n)), add = [].concat(...parts.map(p => p.add)), kill = [].concat(...parts.map(p => p.kill));
      const inside = o => { const cx = o.dx + (o.w || 0) / 2, sy = o.sortY; return kill.some(p => cx > p.x0 - 8 && cx < p.x1 + 8 && sy > p.y0 - 8 && sy <= p.y1 + 16); };
      // the blue-and-white PPE boards beside each PPE gate: HD plate, words as a walk-up label
      const plate = HD.A.rail && HD.A.rail.manifest.ppe_plate, pim = plate && HD.img('rail', plate.file), gates = [];
      for (const [id, e] of Object.entries((HD.A.rail || {}).manifest || {})) if (/^ppe_gate_\d_closed$/.test(id) && e.map_origin) gates.push(e);
      const nearGate = o => gates.some(e => { const gx = (e.map_origin[0] + (e.tiles || [1])[0] / 2) * T, gy = (e.map_origin[1] + 1) * T; return Math.abs(o.dx + o.w / 2 - gx) < 3.5 * T && Math.abs(o.sortY - gy) < 2.5 * T; });
      sc.objects = sc.objects.filter(o => {
        if (o.kind === 'sign' && pim && nearGate(o)) {
          add.push({ img: pim, dx: o.dx + o.w / 2 - plate.w / R / 2, dy: o.sortY - plate.h / R, w: plate.w / R, h: plate.h / R, sortY: o.sortY, kind: 'hd_sign', labels: ['PPE beyond this point', 'Hi-vis, hard hat and safety boots'] });
          return false;
        }
        return !(REPLACES.has(o.kind) && inside(o));
      }).concat(add);
    }
  });
})();
