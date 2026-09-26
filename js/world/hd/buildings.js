/* HD pass: buildings and structures (assets/hd/out/rail, assets/hd/out/town). Places each sprite on its map footprint,
 * letters its blank boards in crisp pixel text (no generated lettering in the art), and removes the 16px objects it
 * replaces. */
(function () {
  'use strict';
  const HD = LS.HD; if (!HD) return;
  const R = HD.R, T = HD.T;
  const REPLACES = new Set(['building', 'canopy', 'ppe_gate', 'buffer', 'site_board', 'bridge', 'cabinet', 'signal', 'washing']);
  // words for the blank boards: area/name/sign -> text ('' = leave blank)
  const WORDS = {
    'rail/station_closed/fascia': 'HARROWBY', 'rail/station_live/fascia': 'HARROWBY',
    'rail/running_in_board_closed/face': 'HARROWBY', 'rail/running_in_board_live/face': 'HARROWBY',
    'rail/project_office/banner': 'KESTREL VALE LINE  ·  PROJECT OFFICE', 'rail/welfare_cabin/board': 'WELFARE',
    'rail/stores_container/plate': 'STORES', 'rail/signal_box/nameboard': 'KESTREL JUNCTION',
    'rail/site_board/title': 'KESTREL VALE LINE', 'rail/depot/date_tablet': 'HARROWBY SHED  1889',
    'rail/limit_board/face': '20', 'rail/whistle_board/face': 'W', 'rail/milepost/plate': '12',
    'town/hall/datestone': '1911'
  };
  function wanted(name, live) {
    if (/_open$|^heras_|^ppe_plate$|^crossing_barrier_lowered|_lit$/.test(name)) return false;
    if (/_closed$|_closedline|_dead$/.test(name)) return !live;
    if (/_live$|^crossing_barrier_raised$/.test(name)) return live;
    return true;
  }
  // crisp pixel lettering: render with canvas text at art resolution, then snap alpha to on/off
  function letter(src, rects, area, name) {
    let c = null;
    for (const [key, r] of Object.entries(rects || {})) {
      if (!r) continue;
      const text = WORDS[`${area}/${name}/${key}`] ?? (/^[A-Z0-9' .·-]+$/.test(key) && key.length > 2 ? key : '');
      if (!text) continue;
      if (!c) { c = HD.cv(src.width, src.height); HD.G(c).drawImage(src, 0, 0); }
      const g = HD.G(c), [x, y, w, h] = r;
      const d = g.getImageData(x, y, w, h).data; let lum = 0; for (let i = 0; i < d.length; i += 4) lum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; lum /= d.length / 4;
      const ink = lum > 140 ? [42, 29, 34] : [250, 240, 214], shadow = lum > 140 ? null : [30, 22, 26];
      const t = HD.cv(w, h), tg = t.getContext('2d');
      let size = Math.min(h - 2, 20); tg.font = `bold ${size}px Inter, Arial, sans-serif`;
      while (size > 5 && tg.measureText(text).width > w - 4) { size--; tg.font = `bold ${size}px Inter, Arial, sans-serif`; }
      tg.fillStyle = '#000'; tg.textAlign = 'center'; tg.textBaseline = 'middle'; tg.fillText(text, w / 2, h / 2 + 0.5);
      const td = tg.getImageData(0, 0, w, h), out = g.getImageData(x, y, w, h);
      for (let i = 0; i < td.data.length; i += 4) if (td.data[i + 3] > 110) {
        if (shadow) { const j = i + 4 + w * 4; if (j < out.data.length && td.data[j + 3] <= 110) { out.data[j] = shadow[0]; out.data[j + 1] = shadow[1]; out.data[j + 2] = shadow[2]; } }
        out.data[i] = ink[0]; out.data[i + 1] = ink[1]; out.data[i + 2] = ink[2]; out.data[i + 3] = 255;
      }
      g.putImageData(out, x, y);
    }
    return c || src;
  }
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
      sc.objects = sc.objects.filter(o => !(REPLACES.has(o.kind) && inside(o))).concat(add);
    }
  });
})();
