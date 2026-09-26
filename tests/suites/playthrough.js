/* playthrough: a full Chapter 1, driven through the real UI.
 *   expert: always the expert-graded option, calibrated confidence, the works plan in dependency order → must end Approved.
 *   random: random options and confidence, random side trips (townsfolk, props, doors, the project board) → must reach the report.
 * Both must finish with no JS errors, never complete a task before its `needs`, and never point the objective at a locked task. */
'use strict';
const H = require('../lib/harness');

async function play(t, r, policy, vp, seed) {
  const P = await H.openPage({ viewport: vp, gameSeed: seed, policySeed: seed });
  try {
    await H.newGame(P.page, { policy, name: 'Tester' });
    const d = await H.drive(P.page, { policy, stop: "st.k==='report'", timeoutMs: 360000 });
    const s = await P.page.evaluate(() => {
      const S = __T.S(), tasks = __T.tasks();
      const g = S.graded.reduce((a, x) => (a[x.grade] = (a[x.grade] || 0) + 1, a), {});
      return {
        panel: S.panel, jp: S.jp, rank: LS.game.rankOf ? LS.game.rankOf(S.jp).name : '', ach: S.ach, week: S.week, m: S.m,
        events: S.events.map(e => `${e.id}:${e.grade}${e.luck == null ? '' : e.luck ? ':lucky' : ':unlucky'}`),
        graded: S.graded.length, grades: g, notBest: S.graded.filter(x => x.grade !== 'best').map(x => `${x.kind}:${x.id}=${x.grade}`),
        notDone: tasks.filter(x => !S.done[x.id]).map(x => x.id), doneOrder: __T.doneOrder.slice(),
        interact: __T.INTERACT, violations: __T.violations.slice(), covered: __T.covered.slice(), unknown: [...new Set(__T.unknownChoices)], asyncErrors: __T.asyncErrors.slice(), notes: [...new Set(__T.notes)],
        report: { on: document.querySelector('#report').classList.contains('on'), text: (document.querySelector('#report').innerText || '').length }
      };
    });
    // After the report: "What's next" opens and closes, and a reload offers no Continue for a finished chapter.
    const after = await P.page.evaluate(() => { const b = document.querySelector('#rNext'); if (!b) return 'no #rNext'; __T.click(b); return document.querySelector('#panel').classList.contains('on') ? 'ok' : 'panel did not open'; });
    if (after === 'ok') await P.page.evaluate(() => { const b = document.querySelector('#csBack'); if (b) b.click(); });
    await H.load(P.page);
    const cont = await P.page.evaluate(() => !!document.querySelector('#tCont'));

    r.ok(s.report.on && s.report.text > 200, 'the report did not render');
    r.ok(s.panel && s.panel.outcome, 'S.panel has no outcome at the end');
    if (policy === 'expert') {
      r.ok(s.panel && s.panel.outcome === 'approved', `expert play should be Approved, got ${s.panel && s.panel.outcome} (readiness ${s.panel && s.panel.score})`);
      if (s.notBest.length) r.warn(`expert policy made non-expert decisions (policy gap or content change): ${s.notBest.join(', ')}`);
      if (s.unknown.length) r.log(`choices with no grade in the pack: ${s.unknown.join(' | ')}`);
    }
    r.ok(!s.notDone.length, `tasks never completed: ${s.notDone.join(', ')}`);
    for (const v of [...new Set(s.violations)]) r.fail('gating: ' + v);
    for (const e of s.asyncErrors) r.fail('interaction threw: ' + e.split('\n')[0]);
    r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
    r.ok(Object.values(s.m).every(v => Number.isFinite(v)), 'a dashboard metric is not a number: ' + JSON.stringify(s.m));
    r.ok(s.jp > 0, 'no Judgment Points at the end');
    r.ok(after === 'ok', `"What's next": ${after}`);
    r.ok(!cont, 'after finishing the chapter, reloading still offers Continue');
    if (s.covered.length) r.warn(`${s.covered.length} click target(s) were covered by another element: ` + s.covered.slice(0, 3).map(c => `${c.target} under ${c.by}`).join('; '));
    for (const n of s.notes) r.log(n);
    r.log(`task order: ${s.doneOrder.join(' → ')}`);
    r.log(`interaction reach ${JSON.stringify(s.interact)}`);
    if (P.missing.length) r.log(`missing files (see smoke): ${P.missing.join(', ')}`);
    r.log(`dashboard: ${JSON.stringify(s.m)} · grades ${JSON.stringify(s.grades)} · achievements ${s.ach.join(', ')}`);
    r.note(`${s.panel ? s.panel.outcome : '?'} ${s.panel ? s.panel.score : '?'}/100 · ${s.jp} JP ${s.rank} · ${s.graded} decisions · ${s.ach.length} badges · surprises ${s.events.join(' ') || 'none'} · ${d.steps} steps · seed ${seed}`);
  } finally { await P.close(); }
}

module.exports = {
  name: 'playthrough',
  about: "Full Chapter 1 with an 'expert' policy (must be Approved) and a 'random' one (must reach the report), desktop and mobile.",
  async run(t) {
    let k = 0;
    for (const policy of ['expert', 'random']) for (const vp of ['desktop', 'mobile']) {
      const seed = t.seed + (k++);
      await t.check(`full Chapter 1, ${policy} policy`, vp, r => play(t, r, policy, vp, seed));
    }
  }
};
