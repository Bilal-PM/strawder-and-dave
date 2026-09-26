/* save: a mid-chapter reload followed by Continue resumes in the same room with the same state.
 *   1. after the induction (the player is inside a room)
 *   2. mid track walk, just after walking into the depot
 *   3. reloading in the middle of an activity rolls back cleanly to the last save, and replaying it doesn't double-count
 *   4. reloading while a Director surprise is on screen keeps the activity you had just finished
 * State is compared field by field (S minus its saved position, plus the room and player position). */
'use strict';
const H = require('../lib/harness');

const snap = page => page.evaluate(() => { const w = __T.W(), S = JSON.parse(JSON.stringify(__T.S())); const t = LS.game.currentTarget(); return { room: w.room, x: w.player.x, y: w.player.y, ppe: w.ppe, S, target: t && t.task.id }; });
function diff(a, b, pre, out) {
  out = out || []; pre = pre || '';
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const x = a ? a[k] : undefined, y = b ? b[k] : undefined;
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x) && pre.split('.').length < 3) diff(x, y, pre + k + '.', out);
    else out.push(`${pre}${k}: ${JSON.stringify(x === undefined ? null : x).slice(0, 80)} → ${JSON.stringify(y === undefined ? null : y).slice(0, 80)}`);
  }
  return out;
}
const IGNORE = ['pos'];   // S.pos is where the save was written; the live position is compared separately
const strip = S => { const c = Object.assign({}, S); for (const k of IGNORE) delete c[k]; return c; };

// Reload, check the title offers Continue, press it, and wait until the player can walk again.
async function reloadAndContinue(page, r, before) {
  await H.load(page);
  const t = await page.evaluate(() => { const b = document.querySelector('#tCont'); return b ? { vis: __T.visibleEl(b), text: b.textContent.trim() } : null; });
  if (!r.ok(t && t.vis, 'after reload the title has no visible Continue button (#tCont)')) return false;
  r.ok(!before || new RegExp('\\b' + before.S.week + '\\b').test(t.text), `Continue says "${t.text}" but the save is in week ${before && before.S.week}`);
  const mark = await page.evaluate(() => __T.layerLog.length);
  await page.evaluate(() => __T.click(document.querySelector('#tCont')));
  await H.until(page, "st.k==='explore'", { timeoutMs: 30000 });
  const replayed = await page.evaluate(n => __T.layerLog.slice(n).filter(x => x[0] === 'chapter' && x[1] === 'on').length, mark);
  r.ok(!replayed, 'Continue replayed the chapter card / intro');
  return true;
}
function compare(r, label, a, b, o) {
  o = o || {};
  r.ok(a.room === b.room, `${label}: resumed in "${b.room}", expected "${a.room}"`);
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  r.ok(d <= (o.posTol || 2), `${label}: resumed at ${Math.round(b.x)},${Math.round(b.y)}, expected ${Math.round(a.x)},${Math.round(a.y)} (${Math.round(d)} units away)`);
  r.ok(b.ppe === !!b.S.ppe, `${label}: world.ppe (${b.ppe}) does not match S.ppe (${b.S.ppe}) after resuming`);
  const dk = diff(strip(a.S), strip(b.S)).filter(x => !(o.allow || []).some(p => x.startsWith(p)));
  r.ok(!dk.length, `${label}: state changed across the reload:\n  ` + dk.slice(0, 12).join('\n  '));
  r.ok(a.target === b.target, `${label}: the objective changed from ${a.target} to ${b.target}`);
}
const dupGraded = S => { const seen = {}, d = []; for (const g of S.graded) { const k = g.kind + ':' + g.id; if (seen[k]) d.push(k); seen[k] = 1; } return d; };

module.exports = {
  name: 'save',
  about: 'Mid-chapter reload + Continue resumes in the same room with the same state (in a room, mid activity, during a surprise).',
  async run(t) {
    await t.check('reload + Continue after the induction, then mid track walk in the depot', 'desktop', async r => {
      const P = await H.openPage({ viewport: 'desktop', policySeed: t.seed, gameSeed: t.seed });
      try {
        await H.newGame(P.page);
        // 1) the first task done, standing in the room it happened in
        await H.until(P.page, "T.S().done.induction && st.k==='explore'", { timeoutMs: 60000 });
        const a = await snap(P.page);
        if (!(await reloadAndContinue(P.page, r, a))) return;
        const b = await snap(P.page);
        compare(r, 'after the induction', a, b);
        r.log(`1) resumed in ${b.room} at ${Math.round(b.x)},${Math.round(b.y)}, week ${b.S.week}, ${b.S.jp} JP, PPE ${b.S.ppe}`);
        // 2) part-way through the track walk, then walk into the depot (entering a room saves)
        await H.until(P.page, "Object.keys(T.S().defects).length >= 2 && st.k==='explore'", { timeoutMs: 60000 });
        const dep = await P.page.evaluate(() => __T.depotRoom());
        await H.gotoRoom(P.page, dep);
        const c = await snap(P.page);
        if (!(await reloadAndContinue(P.page, r, c))) return;
        const d = await snap(P.page);
        compare(r, 'mid track walk, in the depot', c, d);
        r.log(`2) resumed in ${d.room} with ${Object.keys(d.S.defects).length} defects judged, flags ${JSON.stringify(d.S.flags)}`);
        // and the chapter still plays to the end from here
        await H.until(P.page, "st.k==='report'", { timeoutMs: 240000 });
        const e = await snap(P.page);
        r.ok(!dupGraded(e.S).length, 'decisions recorded twice after resuming: ' + dupGraded(e.S).join(', '));
        r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
        r.note(`resumed in ${b.room} (after the induction) and ${d.room} (2 defects in); finished ${e.S.panel && e.S.panel.outcome}`);
      } finally { await P.close(); }
    });

    await t.check('reload in the middle of an activity rolls back to the last save', 'desktop', async r => {
      const P = await H.openPage({ viewport: 'desktop', policySeed: t.seed + 1, gameSeed: t.seed + 1 });
      try {
        await H.newGame(P.page);
        // get to a multi-question activity (the one after the walk and the health check), then answer one question
        await H.until(P.page, "T.S().done.walk && T.S().done.health && st.k==='explore'", { timeoutMs: 120000 });
        const a = await snap(P.page);
        const task = a.target, base = a.S.graded.filter(g => g.kind !== 'event').length;
        await H.until(P.page, `T.S().graded.filter(g => g.kind !== 'event').length > ${base} && st.k !== 'explore' && !T.S().done[${JSON.stringify(task)}]`, { timeoutMs: 60000 });
        const mid = await snap(P.page);
        r.log(`reloading in the middle of "${task}" after ${mid.S.graded.length - a.S.graded.length} new decision(s)`);
        if (!(await reloadAndContinue(P.page, r, a))) return;
        const b = await snap(P.page);
        compare(r, `mid "${task}"`, a, b);
        await H.until(P.page, `T.S().done[${JSON.stringify(task)}] && st.k==='explore'`, { timeoutMs: 60000 });
        const c = await snap(P.page);
        r.ok(!dupGraded(c.S).length, 'decisions recorded twice after replaying the activity: ' + dupGraded(c.S).join(', '));
        r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
        r.note(`reloaded mid "${task}": rolled back to the last save and replayed it cleanly`);
      } finally { await P.close(); }
    });

    await t.check('reload during a Director surprise keeps the finished activity', 'desktop', async r => {
      const P = await H.openPage({ viewport: 'desktop', policySeed: t.seed + 2, gameSeed: t.seed + 2 });
      try {
        await H.newGame(P.page);
        // Surprises pop up right after an activity ends (the Director guarantees at least two before the panel).
        await H.drive(P.page, { stop: "(st.k==='opt' || st.k==='go') && /Out of the blue/i.test(st.tag || '')", timeoutMs: 240000 });
        const mem = await snap(P.page);
        const newlyDone = Object.keys(mem.S.done).filter(k => mem.S.done[k]);
        await H.load(P.page);
        const hasCont = await P.page.evaluate(() => !!document.querySelector('#tCont'));
        if (!hasCont) { r.fail('no Continue after reloading during a surprise'); return; }
        await P.page.evaluate(() => __T.click(document.querySelector('#tCont')));
        await H.until(P.page, "st.k==='explore'", { timeoutMs: 30000 });
        const b = await snap(P.page);
        const lost = newlyDone.filter(k => !b.S.done[k]);
        const lostDecisions = mem.S.graded.filter(g => g.kind !== 'event').length - b.S.graded.filter(g => g.kind !== 'event').length;
        r.ok(!lost.length, `reloading while the surprise was on screen lost finished task(s): ${lost.join(', ')} (${lostDecisions} decision(s), ${mem.S.jp - b.S.jp} JP rolled back)`);
        if (!lost.length && lostDecisions > 0) r.warn(`reloading during the surprise rolled back ${lostDecisions} decision(s) made just before it`);
        r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
        r.note(`surprise appeared with [${newlyDone.join(', ')}] done; after reload+Continue: [${Object.keys(b.S.done).filter(k => b.S.done[k]).join(', ')}]`);
      } finally { await P.close(); }
    });
  }
};
