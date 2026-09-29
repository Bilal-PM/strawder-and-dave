/* HD pass: interiors (assets/hd/out/interiors). Replaces each room's 16px floor, walls and furniture with the HD room,
 * places Ruby in the shed and moves Kevin's perch to her guard's window. */
(function () {
  'use strict';
  const HD = LS.HD; if (!HD || !HD.A.interiors) return;
  const M = HD.A.interiors.manifest, R = HD.R, T = HD.T;
  const WORDS = {
    'interiors/marjorie/number_west': 'KVL 61', 'interiors/marjorie/number_east': 'KVL 61', 'interiors/marjorie/nameplate': 'MARJORIE',
    'interiors/board/lane_marjorie': 'MARJORIE', 'interiors/board/lane_track': 'TRACK',
    'interiors/board_planned/lane_marjorie': 'MARJORIE', 'interiors/board_planned/lane_track': 'TRACK',
    'interiors/sign_in/main': 'SIGN IN', 'interiors/exit_sign/main': 'EXIT', 'interiors/hall_walls/banner': 'HARROWBY VILLAGE HALL'
  };
  const lettered = {};
  const im = (name, e) => {
    const src = HD.img('interiors', e.file); if (!src) return null;
    let slots = e.text_slots || e.text_slot; if (!slots || !HD.letter) return src;
    if (Array.isArray(slots)) slots = { main: slots };
    return lettered[e.file] || (lettered[e.file] = HD.letter(src, slots, 'interiors', name, WORDS));
  };
  for (const room of ['office', 'hall', 'shed']) HD.pass({
    name: 'interior_' + room, room, order: 10,
    run(sc, level, opts) {
      const D = M[room]; if (!D) return;
      const flags = (opts && opts.flags) || {}, floor = HD.img('interiors', D.floor.file), walls = D.walls && im(room + '_walls', Object.assign({}, D.walls, { text_slots: D.text_slots }));
      if (!floor) return;
      sc.paint(g => { g.drawImage(floor, 0, 0, D.floor.w / R, D.floor.h / R); if (walls) g.drawImage(walls, 0, 0, D.walls.w / R, D.walls.h / R); });
      const add = [];
      const put = (name, e, extra) => {
        const i = im(name, e); if (!i || !e.at) return null;
        const o = Object.assign({ img: i, dx: (e.at[0] - e.anchor[0]) / R, dy: (e.at[1] - e.anchor[1]) / R, w: e.w / R, h: e.h / R, sortY: e.at[1] / R, kind: 'hd_room', id: name }, extra || {});
        if (e.fade) { const f = Array.isArray(e.fade) ? e.fade : [e.fade.x, e.fade.y, e.fade.w, e.fade.h]; o.fade = { x: f[0] * T, y: f[1] * T, w: f[2] * T, h: f[3] * T }; }
        add.push(o); return o;
      };
      for (const [name, e] of Object.entries(D.objects || {})) {
        if (!e.tile && name === 'chair') continue;
        if (name === 'board' && flags.planned) continue;
        if (name === 'board_planned' && !flags.planned) continue;
        if (e.hidden_until && !flags[e.hidden_until]) continue;
        put(name, e, /^exit_sign/.test(name) ? { sortY: 1e6 - 1 } : null);
      }
      if (room === 'shed' && M.marjorie) {
        const e = M.marjorie, o = put('marjorie', e, { kind: 'marjorie' });
        if (o && e.points) {
          sc.anchors = Object.assign({}, sc.anchors);
          const pt = k => e.points[k] && { x: o.dx + e.points[k][0] / R, y: o.dy + e.points[k][1] / R };
          if (e.points.pigeon) sc.anchors.pigeon = Object.assign(pt('pigeon'), { sortY: o.sortY + 1 });
          if (e.points.cab) sc.anchors.marjorieCab = pt('cab');
        }
      }
      if (D.overlay) { const ov = HD.img('interiors', D.overlay.file); if (ov) add.push({ img: ov, dx: 0, dy: 0, w: D.overlay.w / R, h: D.overlay.h / R, sortY: 1e6, kind: 'hd_overlay' }); }
      sc.objects = add;
    }
  });
})();
