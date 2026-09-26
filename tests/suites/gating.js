/* gating: the world obeys engineering logic.
 *   · the closed line: blocked without PPE, walkable with it (collision map, and live walking with the keyboard)
 *   · the depot door refuses you without PPE and lets you in with it
 *   · tasks unlock only when their `needs` are done
 *   · the level crossing is always walkable
 * Every position is worked out at runtime from world.canStand and the entity list; nothing is hardcoded. */
'use strict';
const H = require('../lib/harness');

const blur = page => page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
// Hold a key until a page condition is true (or the player is blocked), then release it. Returns the movement summary.
async function hold(page, key, doneExpr, o) {
  o = o || {};
  await blur(page);
  await page.evaluate(() => __T.trackStart());
  await page.keyboard.down(key);
  let reached = true;
  try { await page.waitForFunction(doneExpr, null, { timeout: o.timeout || 6000, polling: 'raf' }); }
  catch (e) { reached = false; }
  await page.keyboard.up(key);
  const trk = await page.evaluate(() => __T.trackStop());
  return Object.assign({ reached }, trk);
}
// PPE the honest way: play the first objective (the induction) until PPE is on.
async function getPpe(page) { await H.until(page, "T.S().ppe && st.k==='explore'", { timeoutMs: 60000 }); }

module.exports = {
  name: 'gating',
  about: 'Closed line needs PPE (map + live walking), depot door refused without PPE, tasks unlock only after their needs, level crossing always open.',
  async run(t) {
    await t.check('closed line: blocked without PPE, walkable with it', 'desktop', async r => {
      const P = await H.openPage({ viewport: 'desktop', policySeed: t.seed });
      try {
        await H.newGame(P.page);
        const room = await P.page.evaluate(() => __T.outdoorRoom());
        const L = await P.page.evaluate(rm => __T.lineInfo(rm), room);
        if (!r.ok(L.n > 0, 'found no ground that is blocked without PPE and walkable with it (no closed line?)')) return;
        r.log(`closed line: ${L.n} sample points, bbox ${L.bbox.join(',')}, reasons ${JSON.stringify(L.reasons)}`);
        if (!r.ok(L.walk, 'could not find a spot beside the line from which to walk onto it')) return;
        const W = L.walk, onLine = W.horiz ? `__T.W().player.y <= ${W.band[1]}` : `__T.W().player.x <= ${W.band[1]}`;
        // 1) no PPE: walk at the line and get stopped at the edge
        await P.page.evaluate(([x, y]) => __T.teleport(x, y), [W.x, W.y]);
        // (keep pushing until the game explains itself, or ~4s of frames: it rate-limits that message to one every 3s)
        const a = await hold(P.page, W.dir, `${onLine} || (__T.stalled(12) && (__T.trk.toasts.length > 0 || __T.trk.pts.length > 240))`, { timeout: 10000 });
        r.ok(a.nIntrusions === 0, `without PPE the player stood on blocked ground ${a.nIntrusions} time(s), e.g. ${JSON.stringify(a.intrusions[0])}`);
        const aPos = await P.page.evaluate(() => { const p = __T.W().player; return { x: p.x, y: p.y, ppeFree: __T.standWith(p.x, p.y, false) }; });
        r.ok(!aPos.ppeFree && (W.horiz ? aPos.y > W.band[1] : aPos.x > W.band[1]), `without PPE the player got onto the closed line (at ${Math.round(aPos.x)},${Math.round(aPos.y)})`);
        if (!a.toasts.length) r.warn('walking into the closed line without PPE showed no message (toast) explaining why');
        else r.log('blocked message: ' + a.toasts[0]);
        // 2) earn PPE (induction), come back, walk onto the line
        await getPpe(P.page);
        await H.gotoRoom(P.page, room);
        await P.page.evaluate(([x, y]) => __T.teleport(x, y), [W.x, W.y]);
        const b = await hold(P.page, W.dir, `${onLine} || __T.stalled(12)`);
        const bPos = await P.page.evaluate(() => { const p = __T.W().player; return { x: p.x, y: p.y, noPpe: __T.standWith(p.x, p.y, false), ppe: __T.standWith(p.x, p.y, true) }; });
        r.ok(b.reached && bPos.noPpe && !bPos.ppe, `with PPE the player could not walk onto the line (stopped at ${Math.round(bPos.x)},${Math.round(bPos.y)})`);
        r.ok(b.nIntrusions === 0, `with PPE the player stood on blocked ground: ${JSON.stringify(b.intrusions[0])}`);
        r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
        r.note(`line found at ${L.horiz ? 'y' : 'x'} ${L.walk.band.join('–')}; no PPE: stopped at the edge; with PPE: onto the line`);
      } finally { await P.close(); }
    });

    await t.check('depot door refused without PPE, opens with PPE', 'desktop', async r => {
      const P = await H.openPage({ viewport: 'desktop', policySeed: t.seed });
      try {
        await H.newGame(P.page);
        const info = await P.page.evaluate(() => { const dep = __T.depotRoom(), d = __T.doors().find(d => d.to.room === dep); return { dep, door: d && { id: d.id, room: d.room } }; });
        if (!r.ok(info.dep && info.door, `could not find the depot room (${info.dep}) or its door`)) return;
        const tryDoor = async () => {
          await H.gotoRoom(P.page, info.door.room);
          const sp = await P.page.evaluate(id => { const d = __T.W().entities.find(e => e.id === id); const s = __T.spotNear(d); if (s) __T.teleport(s.x, s.y); return s; }, info.door.id);
          const f0 = await P.page.evaluate(() => __T.frames);
          await P.page.waitForFunction(f => __T.frames > f + 2, f0, { polling: 'raf' });
          await blur(P.page);
          const before = await P.page.evaluate(() => __T.layerLog.length);
          await P.page.keyboard.press('e');   // the real "interact" key
          let how = 'key E';
          const moved = await P.page.waitForFunction(dep => { const w = __T.W(); return w.fadeDir || w.room === dep || __T.layersOn().length > 0; }, info.dep, { timeout: 2000, polling: 'raf' }).then(() => true, () => false);
          if (!moved) { how = 'onInteract (E did nothing from the nearest free spot)'; await P.page.evaluate(id => __T.interact(__T.W().entities.find(e => e.id === id)), info.door.id); }
          await P.page.waitForFunction(dep => { const w = __T.W(); return (w.room === dep && !w.fadeDir) || __T.layersOn().length > 0; }, info.dep, { timeout: 6000, polling: 'raf' }).catch(() => { });
          const s = await P.page.evaluate(n => ({ room: __T.W().room, layers: __T.layersOn(), talk: (document.querySelector('#talk').innerText || '').replace(/\s+/g, ' ').slice(0, 120), log: __T.layerLog.slice(n) }), before);
          return { how, sp, s };
        };
        const a = await tryDoor();
        r.ok(a.s.room !== info.dep, `without PPE the player got into the depot (${a.s.room})`);
        r.ok(a.s.layers.includes('talk'), 'without PPE the door gave no explanation (no dialogue)');
        if (a.how !== 'key E') r.warn(`depot door: ${a.how}`);
        await H.until(P.page, "st.k==='explore'", { timeoutMs: 20000 });
        r.ok(await P.page.evaluate(dep => __T.W().room !== dep, info.dep), 'after the refusal the player ended up in the depot anyway');
        await getPpe(P.page);
        const b = await tryDoor();
        r.ok(b.s.room === info.dep, `with PPE the depot door did not let the player in (still in ${b.s.room}; layers ${b.s.layers})`);
        r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
        r.note(`no PPE: "${a.s.talk.slice(0, 70)}…"; with PPE: entered ${b.s.room}`);
      } finally { await P.close(); }
    });

    await t.check('tasks unlock only when their needs are done', 'desktop', async r => {
      const P = await H.openPage({ viewport: 'desktop', policySeed: t.seed, gameSeed: t.seed });
      try {
        await H.newGame(P.page);
        // (a) LS.game.avail agrees with the needs in the pack, at several points in the chapter
        const availCheck = async label => {
          const bad = await P.page.evaluate(() => { if (!LS.game.avail) return null; const S = __T.S(); return __T.tasks().filter(t => LS.game.avail(t.id) !== (!S.done[t.id] && (t.needs || []).every(n => S.done[n]))).map(t => t.id); });
          if (bad === null) r.log('LS.game.avail not exposed; skipped the direct check');
          else r.ok(!bad.length, `${label}: avail() disagrees with the needs for ${bad.join(', ')}`);
        };
        // (b) talking to the holder of a locked task must not start it
        const holders = await P.page.evaluate(() => { const w = __T.pack().world; return (w && w.c1 && w.c1.holders) || null; });
        const probeLocked = async label => {
          const locked = await P.page.evaluate(() => { const S = __T.S(); return __T.tasks().filter(t => !S.done[t.id] && !(t.needs || []).every(n => S.done[n])).map(t => ({ id: t.id, missing: t.needs.filter(n => !S.done[n]) })); });
          const probed = [];
          for (const tk of locked) {
            const who = holders && holders[tk.id]; if (!who) continue;
            const ent = await P.page.evaluate(id => { const e = __T.W().entities.find(e => e.kind === 'npc' && e.id === id && !e.hidden); return e && { room: e.room }; }, who);
            if (!ent) continue;
            const inRoom = await H.gotoRoom(P.page, ent.room, { allowRefusal: true });
            if (!inRoom) { await H.until(P.page, "st.k==='explore'", { timeoutMs: 20000 }); probed.push(`${tk.id} (${who}: can't even get into ${ent.room})`); continue; }
            const before = await P.page.evaluate(() => { const S = __T.S(); return JSON.stringify({ d: S.done, f: S.flags, g: S.graded.filter(g => g.kind !== 'event').length, j: S.judgment.length }); });
            await P.page.evaluate(id => __T.interact(__T.W().entities.find(e => e.kind === 'npc' && e.id === id && !e.hidden)), who);
            await P.page.waitForFunction(() => __T.layersOn().length > 0 || __T.W().paused, null, { timeout: 5000 }).catch(() => { });
            const choices = await P.page.evaluate(() => document.querySelectorAll('#talk .choices button, #panel .opt[data-c], #panel .tray').length);
            await H.until(P.page, "st.k==='explore'", { timeoutMs: 30000 });
            const after = await P.page.evaluate(() => { const S = __T.S(); const x = JSON.parse(JSON.stringify({ d: S.done, f: S.flags, g: S.graded.filter(g => g.kind !== 'event').length, j: S.judgment.length })); delete x.f.catSpot; return JSON.stringify(x); });
            const b = JSON.parse(before); delete b.f.catSpot;
            r.ok(after === JSON.stringify(b) && !choices, `${label}: talking to ${who} started "${tk.id}" although ${tk.missing.join(', ')} ${tk.missing.length > 1 ? 'are' : 'is'} not done`);
            probed.push(`${tk.id} (${who})`);
          }
          r.log(`${label}: locked tasks probed via their holder: ${probed.join(', ') || 'none'}`);
          return probed.length;
        };
        if (!holders) r.warn('the pack has no world.c1.holders map, so locked tasks were not probed directly (the playthrough invariants still apply)');
        await availCheck('at the start');
        let n = holders ? await probeLocked('at the start') : 0;
        await H.until(P.page, "T.S().done.induction && st.k==='explore'", { timeoutMs: 60000 });
        await availCheck('after the induction');
        if (holders) n += await probeLocked('after the induction');
        // play on to the works plan: walk + health unlock it, forecast and date stay locked
        await H.until(P.page, "T.S().done.walk && T.S().done.health && st.k==='explore'", { timeoutMs: 120000 });
        await availCheck('after the walk and health check');
        if (holders) n += await probeLocked('after the walk and health check');
        const v = await P.page.evaluate(() => [...new Set(__T.violations)]);
        for (const x of v) r.fail(x);
        r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
        r.note(`${n} locked-task probes, avail() checked at 3 points, no task finished before its needs`);
      } finally { await P.close(); }
    });

    await t.check('level crossing always walkable', 'desktop', async r => {
      const P = await H.openPage({ viewport: 'desktop', policySeed: t.seed });
      try {
        await H.newGame(P.page);
        const room = await P.page.evaluate(() => __T.outdoorRoom());
        const L = await P.page.evaluate(rm => __T.lineInfo(rm), room);
        if (!r.ok(L.n > 0, 'no closed line found')) return;
        r.log(`${L.gaps} gap(s) in the closed line; crossable without PPE: ${JSON.stringify(L.crossings)}`);
        if (!r.ok(L.crossings.length > 0, 'no place where the closed line can be crossed without PPE (the level crossing should always be open)')) return;
        for (const c of L.crossings) r.ok(c.openWithPpe, `crossing at ${c.center} is open without PPE but blocked with PPE`);
        // walk across it, there and back, without PPE
        const c = L.crossings[0], across = L.horiz ? 'y' : 'x';
        const start = await P.page.evaluate(([c, horiz]) => { for (let b = c.span[1] + 6; b < c.span[1] + 60; b += 2) { const [x, y] = horiz ? [c.center, b] : [b, c.center]; if (__T.free(x, y)) { __T.teleport(x, y); return [x, y]; } } return null; }, [c, L.horiz]);
        if (!r.ok(start, 'no free ground just beside the crossing')) return;
        const there = await hold(P.page, L.horiz ? 'ArrowUp' : 'ArrowLeft', `__T.W().player.${across} < ${c.span[0] - 4} || __T.stalled(15)`);
        r.ok(there.reached && there[L.horiz ? 'minY' : 'minX'] < c.span[0] - 4, `could not walk over the crossing without PPE (stopped at ${JSON.stringify(there.end)})`);
        r.ok(there.nIntrusions === 0, `stood on blocked ground while crossing: ${JSON.stringify(there.intrusions[0])}`);
        const back = await hold(P.page, L.horiz ? 'ArrowDown' : 'ArrowRight', `__T.W().player.${across} > ${c.span[1] + 4} || __T.stalled(15)`);
        r.ok(back.reached, `could not walk back over the crossing (stopped at ${JSON.stringify(back.end)})`);
        r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
        r.note(`crossing at ${L.horiz ? 'x' : 'y'} ${c.a0}–${c.a1}: walked over and back without PPE`);
      } finally { await P.close(); }
    });
  }
};
