/* smoke: the page loads with no JS errors, the title and its buttons render, a new game gets you walking,
 * and the stable test API the suite depends on is all there. */
'use strict';
const H = require('../lib/harness');

module.exports = {
  name: 'smoke',
  about: 'Page loads with no JS errors; title + buttons render; a new game reaches free roam; the test API contract holds.',
  async run(t) {
    for (const vp of ['desktop', 'mobile']) {
      await t.check('title screen renders, no JS errors', vp, async r => {
        const P = await H.openPage({ viewport: vp, settings: null });   // default settings, like a first-time player
        try {
          await H.load(P.page);
          await P.page.waitForFunction(() => __T.frames > 30, null, { polling: 'raf' });   // let the canvas draw for a bit
          const s = await P.page.evaluate(() => {
            const vis = sel => { const el = document.querySelector(sel); return !!el && __T.visibleEl(el); };
            const inView = sel => { const el = document.querySelector(sel); if (!el) return false; const b = el.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight; };
            const hit = sel => { const el = document.querySelector(sel); if (!el) return 'missing'; const b = el.getBoundingClientRect(); const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return top === el || el.contains(top) ? 'ok' : 'covered by ' + __T.desc(top); };
            const cv = document.querySelector('#world'), x = cv.getContext('2d');
            const px = x.getImageData(0, 0, cv.width, cv.height).data; let mn = 255, mx = 0;
            for (let i = 0; i < px.length; i += 4 * 997) { const v = px[i] + px[i + 1] + px[i + 2]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
            const btns = [...document.querySelectorAll('#title button')].filter(__T.visibleEl);
            return {
              layers: __T.layersOn(), title: (document.querySelector('#title').innerText || '').trim().slice(0, 120),
              tNew: vis('#tNew'), tNewInView: inView('#tNew'), tNewHit: hit('#tNew'), tCont: !!document.querySelector('#tCont'),
              buttons: btns.map(b => ({ t: b.textContent.trim(), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), inView: (() => { const q = b.getBoundingClientRect(); return q.left >= 0 && q.right <= innerWidth && q.top >= 0 && q.bottom <= innerHeight; })() })),
              canvas: { w: cv.width, h: cv.height, contrast: mx - mn }, sw: document.documentElement.scrollWidth, vw: innerWidth
            };
          });
          r.ok(s.layers.length === 1 && s.layers[0] === 'title', `expected only #title to be on, got [${s.layers}]`);
          r.ok(/LINESIDE/i.test(s.title), `title text missing (got "${s.title}")`);
          r.ok(s.tNew && s.tNewInView, '#tNew is not visible inside the viewport');
          r.ok(s.tNewHit === 'ok', '#tNew cannot be clicked: ' + s.tNewHit);
          r.ok(!s.tCont, '#tCont (Continue) is shown on a first visit with no save');
          for (const b of s.buttons) r.ok(b.inView && b.w > 0 && b.h > 0, `title button "${b.t}" is off-screen or has no size`);
          r.ok(s.canvas.w > 0 && s.canvas.h > 0 && s.canvas.contrast > 30, `the world canvas looks blank (${JSON.stringify(s.canvas)})`);
          r.ok(s.sw <= s.vw + 1, `title page scrolls horizontally (${s.sw} > ${s.vw})`);
          r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
          r.ok(P.missing.length === 0, `files referenced by the page are missing: ${P.missing.join(', ')}`);
          r.note(`${s.buttons.length} buttons: ${s.buttons.map(b => b.t).join(' | ').slice(0, 80)}`);
        } finally { await P.close(); }
      });

      await t.check('new game reaches free roam', vp, async r => {
        const P = await H.openPage({ viewport: vp, settings: null, policySeed: t.seed });   // typewriter on: the driver taps through it
        try {
          await H.load(P.page);
          await P.page.evaluate(() => __T.click(document.querySelector('#tNew')));
          await P.page.waitForSelector('#setup.on #pname', { state: 'visible' });
          const setup = await P.page.evaluate(() => ({ pname: __T.visibleEl(document.querySelector('#pname')), go: __T.visibleEl(document.querySelector('#sGo')) }));
          r.ok(setup.pname && setup.go, 'setup screen: #pname or #sGo not visible');
          await P.page.fill('#pname', 'Smoke');
          await P.page.evaluate(() => __T.click(document.querySelector('#sGo')));
          const d = await H.drive(P.page, { stop: H.FREE_ROAM, timeoutMs: 90000 });
          const s = await P.page.evaluate(() => { const w = __T.W(), t = LS.game.currentTarget(); return { room: w.room, name: __T.S().name, hud: document.querySelector('#hud').classList.contains('on'), target: t && t.task.id, log: __T.layerLog.map(x => x[0] + ':' + x[1]).join(' ') }; });
          r.ok(s.name === 'Smoke', `player name not applied (S.name = ${s.name})`);
          r.ok(s.target, 'no objective (currentTarget() is null) at the start');
          r.ok(/chapter:on/.test(s.log), 'the chapter card never appeared');
          r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
          r.note(`walking after ${d.steps} steps in ${s.room}; first objective: ${s.target}`);
        } finally { await P.close(); }
      });
    }

    await t.check('stable test API contract', 'desktop', async r => {
      const P = await H.openPage({ viewport: 'desktop' });
      try {
        await H.newGame(P.page);
        const c = await P.page.evaluate(() => {
          const out = [], need = (cond, m) => { if (!cond) out.push(m); };
          const G = LS.game; need(G && typeof G.S === 'function' && typeof G.world === 'function' && typeof G.currentTarget === 'function', 'LS.game.S/world/currentTarget');
          const S = G.S(); for (const k of ['done', 'ppe', 'jp', 'm', 'ach', 'events', 'graded', 'judgment', 'week']) need(k in S, 'S.' + k);
          need(S.panel === null || typeof S.panel === 'object', 'S.panel');
          const w = G.world(); for (const k of ['entities', 'room', 'player', 'paused', 'fadeDir', 'ppe']) need(k in w, 'world.' + k);
          for (const k of ['canStand', 'onInteract', 'fitScale', 'snapCam']) need(typeof w[k] === 'function', `world.${k}()`);
          need(w.player && typeof w.player.x === 'number' && typeof w.player.y === 'number', 'world.player{x,y}');
          const kinds = new Set(['npc', 'prop', 'defect', 'hotspot', 'note', 'memo', 'cat']), extra = new Set(['door', 'exit', 'find']);
          const bad = w.entities.filter(e => !(kinds.has(e.kind) || extra.has(e.kind)) || typeof e.x !== 'number' || typeof e.y !== 'number' || !e.room || !e.id);
          const extraKinds = [...new Set(w.entities.filter(e => extra.has(e.kind)).map(e => e.kind))];
          need(Array.isArray(w.entities) && w.entities.length > 0, 'world.entities is a non-empty array');
          need(!bad.length, 'entities with unknown kind or missing id/room/x/y: ' + bad.slice(0, 5).map(e => e.kind + ':' + e.id).join(', '));
          need(typeof w.canStand(w.player.x, w.player.y) !== 'undefined', 'world.canStand returns a value');
          const t = G.currentTarget(); need(t && t.task && t.task.id && t.room && typeof t.x === 'number' && typeof t.y === 'number' && 'label' in t, 'currentTarget() {task:{id},room,x,y,label}');
          const W = LS.WORLD; need(W && W.MAP && W.MAP.W > 0 && W.MAP.H > 0, 'LS.WORLD.MAP{W,H}'); need(W && W.DOORS && typeof W.DOORS === 'object', 'LS.WORLD.DOORS'); need(W && W.ROOMS && typeof W.ROOMS === 'object', 'LS.WORLD.ROOMS');
          for (const [k, R] of Object.entries(W.ROOMS || {})) need(R.w > 0 && R.h > 0, `LS.WORLD.ROOMS.${k}{w,h}`);
          const P = LS.PACKS && LS.PACKS['kestrel-vale']; need(P, "LS.PACKS['kestrel-vale']");
          for (const k of ['tasks', 'talks', 'defects', 'plan', 'dropin', 'panel', 'events']) need(P && P.c1 && P.c1[k], 'pack.c1.' + k);
          need(P && P.calls, 'pack.calls');
          for (const id of ['title', 'setup', 'chapter', 'talk', 'panel', 'report', 'board']) need(document.getElementById(id), '#' + id);
          // doors: the brief promised {to:{room,x,y}}; the tile world uses kind:'door' {door:{room}} and kind:'exit'
          const withTo = w.entities.filter(e => e.to && e.to.room), doors = w.entities.filter(e => __T.doorDest(e));
          need(doors.length > 0, 'at least one door entity');
          for (const rm of Object.keys(W.ROOMS || {})) need(doors.some(d => __T.doorDest(d).room === rm), `a door into room "${rm}"`);
          const form = withTo.length ? 'e.to' : doors.some(d => d.kind === 'door') ? "kind:'door' (e.door.room) / kind:'exit', no e.to" : '?';
          return { missing: out, entities: w.entities.length, kinds: [...new Set(w.entities.map(e => e.kind))].join(','), rooms: Object.keys(W.ROOMS).join(','), tasks: P.c1.tasks.length, form, extraKinds };
        });
        for (const m of c.missing) r.fail('missing or wrong: ' + m);
        if (c.extraKinds.length) r.warn(`entity kinds outside the documented list: ${c.extraKinds.join(', ')}; doors are described as ${c.form}. The suite copes with both, but the API doc should say so.`);
        r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
        r.note(`${c.entities} entities (${c.kinds}) · rooms ${c.rooms} · ${c.tasks} tasks`);
      } finally { await P.close(); }
    });
  }
};
