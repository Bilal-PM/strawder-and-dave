/* learning: plays the first Learning World module (Project Planning) end to end through the real UI, on desktop
 * and mobile. Everything is authored: the game must not load the AI tutor, and nothing may mention AI or models.
 *   title → "Learn: Project Planning" → the door (show me / new) → the Board (7 beats) → the Bench (the Planning
 *   Table's three challenges, including loop protection; three puzzles answered correctly) → the Brew (three authored
 *   voices; a misconception picked, countered and corrected; the teach-back) → Hour Eight (help from the voices; the
 *   expert path must reach Gold; a replay with an unsafe choice must be refused by Hannah and capped at "Not yet")
 *   → the Logbook (lamp lit) → back to the title.
 * Then: progress is saved in lineside_learn_v1 (not the chapter save), the office board in Chapter 1 offers the
 * module and shows the Planning Lens, and the module's numbers agree with the critical-path engine.
 * Every step is layout-audited (mobile FAILs on issues, desktop WARNs) and screenshotted into
 * tests/out/screens/learning/<viewport>/ (or $LS_LEARN_SHOTS/<viewport>/). */
'use strict';
const fs = require('fs');
const path = require('path');
const H = require('../lib/harness');

const TYPES = { 'h-overflow': 'overflows the viewport', 'page-overflow': 'page scrolls sideways', 'text-clipped': 'clipped text', 'text-offscreen': 'text off screen', covered: "button can't be tapped", 'hud-overlap': 'HUD over dialogue' };

async function play(t, r, vp) {
  const dir = path.join(process.env.LS_LEARN_SHOTS || path.join(H.OUT, 'screens', 'learning'), vp);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const P = await H.openPage({ viewport: vp, policySeed: t.seed, gameSeed: t.seed });
  const page = P.page, mobile = vp === 'mobile';
  const found = new Map(); let n = 0;
  const act = async sel => { await page.waitForSelector(sel, { state: 'visible', timeout: 15000 }).catch(async e => { const tx = await page.evaluate(() => (document.querySelector('#lwStage') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 300)).catch(() => ''); throw new Error(`waiting for ${sel}: ${e.message.split('\n')[0]} · screen: ${tx}`); }); const el = await page.$(sel); await el.scrollIntoViewIfNeeded().catch(() => { }); if (mobile) await el.tap(); else await el.click(); };
  const has = sel => page.$(sel).then(Boolean);
  const text = sel => page.$eval(sel, e => e.innerText).catch(() => '');
  const shot = async (key, audit) => {
    await H.settle(page, 3000);
    await page.screenshot({ path: path.join(dir, `${String(n++).padStart(2, '0')}_${key}.png`) });
    if (audit === false) return;
    const a = await page.evaluate(() => __T.audit());
    for (const i of a.issues) { const k = i.type + '|' + (i.el || ''); if (!found.has(k)) found.set(k, Object.assign({ screens: [] }, i)); const f = found.get(k); if (f.screens.length < 4) f.screens.push(key); }
  };
  try {
    await H.load(page);
    await page.evaluate(() => { if (!__T.LAYERS.includes('learn')) __T.LAYERS.push('learn'); localStorage.removeItem('lineside_learn_v1'); });
    r.ok(await has('#tLearn'), 'the title has no "Learn: Project Planning" button');
    await shot('title');
    await act('#tLearn');
    await page.waitForSelector('#learn.on .lw-door');
    r.ok(await page.evaluate(() => !(window.LS && LS.AI) && !document.querySelector('script[src*="js/ai/"]')), 'the game should not load the AI tutor any more');
    await shot('door');
    await act('[data-style="show"]'); await act('[data-level="new"]'); await act('#lwBegin');

    // ---- "Save and leave" part-way through, then pick up where you left off ----
    await page.waitForSelector('.lb-note[data-note="kettle"]');
    await act('#lwLeave');
    await page.waitForFunction(() => !document.querySelector('#learn').classList.contains('on') && document.querySelector('#title.on #tLearn'), null, { timeout: 8000 }).catch(() => r.fail('“Save and leave” did not return to the title'));
    await act('#tLearn');
    await page.waitForSelector('#learn.on .lb', { timeout: 8000 }).catch(() => r.fail('coming back did not resume at the Board (without asking how you like to learn again)'));

    // ---- the Board ----
    await page.waitForSelector('.lb-note[data-note="kettle"]');
    await act('.lb-note[data-note="mugs"]');
    r.ok(/kettle/i.test(await text('#lbSay')), 'tapping a note on the first beat got no reply from Jo');
    await shot('board-b1');
    for (let i = 1; i < 7; i++) { await act('#lbNext'); await page.waitForFunction(k => document.querySelector('#lbEye') && document.querySelector('#lbEye').textContent.includes(`Beat ${k} of`), i + 1); if (i === 1 || i === 3 || i === 5) await shot('board-b' + (i + 1)); }
    await act('#lbNext');
    await page.waitForSelector('.lw-between [data-primary]'); await shot('between-1');
    await act('.lw-between [data-primary]');

    // ---- the Bench: the Planning Table ----
    await page.waitForSelector('#lxTable .lt-name[data-act="mugs"]');
    await shot('table-c1');
    // loop protection: make the kettle wait for the milk
    await act('#lxTable [data-out="milk"]'); await act('#lxTable .lt-name[data-act="kettle"]');
    r.ok(/wait for itself/i.test(await text('#lxJo')), 'a dependency loop was not refused with Jo’s line');
    await act('#lxTable .lt-name[data-act="mugs"]');
    for (let i = 0; i < 3; i++) await act('#lxTable [data-dur="+"]');
    await page.waitForSelector('#lxNext:not([disabled])', { timeout: 5000 }).catch(() => r.fail('challenge 1 (make the mugs critical) did not complete'));
    await shot('table-c1-done');
    await act('#lxNext');
    await act('#lxTable [data-place="urn"]');
    await page.waitForSelector('#lxNext:not([disabled])', { timeout: 5000 }).catch(() => r.fail('challenge 2 (tea under 6 minutes) did not complete'));
    const fin2 = await text('#lxTable .lt-finish b'); r.ok(fin2 === '5.5', `with the urn the finish should be 5.5 (shows ${fin2})`);
    await act('#lxNext');
    await act('#lxTable [data-place="shop"]');
    await act('#lxTable [data-linkfrom="shop"]'); await act('#lxTable .lt-name[data-act="milk"]');
    await act('#lxTable .lt-name[data-act="shop"]');
    for (let i = 0; i < 4; i++) await act('#lxTable [data-dur="+"]');
    await page.waitForSelector('#lxNext:not([disabled])', { timeout: 5000 }).catch(() => r.fail('challenge 3 (the milk run) did not complete'));
    const fin3 = await text('#lxTable .lt-finish b'); r.ok(fin3 === '7.5', `with a 7-minute milk run the finish should be 7.5 (shows ${fin3})`);
    await shot('table-c3-done');
    await act('#lxNext');

    // ---- Puzzle 1: find the critical path ----
    await page.waitForSelector('.lp[data-puzzle="p1"]');
    for (const id of ['A', 'C', 'D', 'E', 'F']) await act(`[data-node="${id}"]`);
    await act('[data-fin="14"]'); await act('[data-fl="2"]');
    await shot('p1');
    await act('.lp-foot [data-conf="certain"]'); await act('[data-check]');
    await page.waitForSelector('.lp-fb .lw-fb.good', { timeout: 5000 }).catch(() => r.fail('Puzzle 1: the correct answer was not marked correct'));
    await shot('p1-feedback');
    await act('.lp-fb [data-next]');
    // ---- Puzzle 2: the possession (with 6 and 7 side by side), then the tamper follow-up ----
    await page.waitForSelector('.lp[data-puzzle="p2"]');
    for (const id of ['1', '2', '3', '4', '5', '6']) await act(`.lp-tray [data-next="${id}"]`);
    await act('.lp-tray [data-along="7"]'); await act('.lp-tray [data-next="8"]'); await act('.lp-tray [data-next="9"]');
    await act('[data-hb="48"]');
    await shot('p2');
    await act('.lp-foot [data-conf="fairly"]'); await act('[data-check]');
    await page.waitForSelector('.lp-fb .lw-fb.good', { timeout: 5000 }).catch(() => r.fail('Puzzle 2: the correct plan was not marked correct'));
    await act('.lp-follow [data-conf="fairly"]'); await act('[data-fo="yes3"]');
    await page.waitForSelector('.lp-ffb .lw-fb.good', { timeout: 5000 }).catch(() => r.fail('Puzzle 2 follow-up: 03:00 Monday was not marked correct'));
    await shot('p2-follow');
    await act('.lp-fb [data-next]');
    // ---- Puzzle 3: what slips if… ----
    await page.waitForSelector('.lp[data-puzzle="p3"]');
    await act('.lp-foot [data-conf="certain"]');
    for (const [q, v] of [['a', 14], ['b', 15], ['c', 12], ['d', 12]]) { await act(`.lp-wq[data-q="${q}"] [data-wo="${v}"]`); }
    await page.waitForSelector('.lp-score.good');
    r.ok(/4 of 4/.test(await text('.lp-score')), 'Puzzle 3: four correct answers did not score 4 of 4');
    await shot('p3');
    await act('.lp-wend [data-next]');
    await page.waitForSelector('.lw-between [data-primary]'); await act('.lw-between [data-primary]');

    // ---- the Brew: three authored voices ----
    const chip = async i => { await page.waitForSelector('#lrCompose [data-chip]', { timeout: 20000 }); await act(`#lrCompose [data-chip="${i}"]`); };
    await page.waitForSelector('#lrCompose [data-chip]', { timeout: 20000 });
    r.ok(/remembers the bench/i.test(await text('#lrLog')), 'the Brew did not remember how you did at the Bench');
    await shot('brew');
    await chip(1);                                                   // b1: the misconception ("the biggest job is critical")
    await page.waitForSelector('.lr-tag.mc', { timeout: 10000 }).catch(() => r.fail('picking “the biggest job is critical” was not flagged as a misconception'));
    const counter = await text('#lrLog');
    r.ok(/A-C-D|add up the chains|chain wins/i.test(counter), 'the misconception was not countered by the other voices');
    await shot('brew-misconception');
    await chip(0);                                                   // then the best answer
    await page.waitForFunction(() => /shift from where you started/i.test(document.querySelector('#lrLog').innerText), null, { timeout: 10000 }).catch(() => r.fail('no “that’s a shift” acknowledgement after correcting the misconception'));
    r.ok(/trick of the trade/i.test(await text('#lrLog')), 'the veteran never shared a trick of the trade');
    for (let i = 0; i < 4; i++) await chip(0);                       // b2–b5: the best answers
    await page.waitForSelector('[data-tbc="K3"]', { timeout: 20000 });
    for (const k of ['K3', 'K4', 'K5', 'K7']) await act(`[data-tbc="${k}"]`);
    await shot('brew-teachback');
    await act('[data-tbsend]');
    await page.waitForSelector('.lr-kp', { timeout: 10000 });
    const kp = await page.$$eval('.lr-kp li.on', l => l.length); r.ok(kp === 4, `the teach-back hit only ${kp} of 4 key points`);
    await chip(0);                                                   // the takeaway
    await page.waitForSelector('[data-out]', { timeout: 20000 }); await shot('brew-end');
    const flags = await page.evaluate(() => JSON.parse(localStorage.getItem('lineside_learn_v1')).modules.planning.flags);
    r.ok((flags.M1 || 0) === 0, `the M1 flag should have fallen after it was corrected (flags ${JSON.stringify(flags)})`);
    const words = await text('#learn'); r.ok(!/\b(AI|model|download)\b/i.test(words), 'the Brew mentions AI, models or downloads');
    await act('[data-out]');
    await page.waitForSelector('.lw-between [data-primary]'); await act('.lw-between [data-primary]');

    // ---- Hour Eight: the expert path ----
    await page.waitForSelector('.lo-intro'); await shot('line-intro');
    await act('.lo-intro [data-primary]');
    await page.waitForSelector('[data-ev="tom"]'); await shot('line-find');
    for (const id of ['tom', 'dig', 'crane', 'permit', 'hannah', 'gaz']) { await act(`[data-ev="${id}"]`); if (id === 'dig') await shot('line-evidence'); await act('.lo-found [data-ok]'); }
    // help from the three voices: the newcomer's nudge is free, the veteran's costs the one favour; Hannah on the tests
    await act('[data-coach]'); await page.waitForSelector('.lo-call [data-voice="callum"]');
    await act('[data-voice="callum"]'); r.ok(/trench|waiting/i.test(await text('.lo-answer')), 'Callum gave no hint');
    await act('[data-voice="pat"]'); r.ok(/Loud problems|half six/i.test(await text('.lo-answer')), 'Pat gave no hint');
    r.ok(/0 favours left/i.test(await text('.lo-call .eyebrow')), 'asking Pat did not use the favour');
    await act('[data-safe]'); r.ok(/Hannah/i.test(await text('.lo-answer .lw-nm')), 'asking about the crossing tests did not get Hannah’s line');
    await shot('line-help');
    await act('[data-hang]');
    await act('[data-board]');
    await page.waitForSelector('.lo-cabin'); await act('[data-apply="S3"]');
    await act('[data-coach]'); await page.waitForSelector('.lo-call [data-voice="amira"]');
    r.ok(await page.$eval('[data-voice="pat"]', b => b.disabled), 'Pat can still be asked after the favour was used');
    await act('[data-voice="amira"]'); r.ok(/crane/i.test(await text('.lo-answer')), 'Amira gave no hint at the cabin board');
    await act('[data-hang]');
    const fin8 = await text('.lo-tablehost .lt-finish b'); r.ok(/06:00/.test(fin8), `with S3 +3 h the cabin board should finish at 06:00 Mon (hour 56), shows ${fin8}`);
    await act('[data-dq="q1"][data-do="S3"]'); await act('[data-dq="q2"][data-do="56"]'); await act('[data-dq="q3"][data-do="crane"]'); await act('.lo-diag [data-conf="certain"]');
    await shot('line-cabin');
    await act('[data-decide]');
    for (const d of ['D1', 'D3', 'D6', 'D7']) await act(`[data-dec="${d}"]`);
    await shot('line-decide');
    await act('[data-confirm]');
    await act('.lo-ring [data-primary]');
    for (const [k, v] of [['status', 'risk'], ['why', 'pipe'], ['doing', 'D1'], ['doing', 'D3'], ['doing', 'D6'], ['doing', 'D7'], ['margin', '4.5'], ['next', '18'], ['need', 'fallback']]) await act(`[data-ck="${k}"][data-cv="${v}"]`);
    await shot('line-call');
    await act('.lo-callb [data-send]');
    await page.waitForSelector('.lo-result');
    const g1 = await page.evaluate(() => JSON.parse(localStorage.getItem('lineside_learn_v1')).modules.planning.line.grade);
    r.ok(g1.band === 'gold' && g1.total >= 85, `the expert path should reach Gold (got ${g1.band}, ${g1.total}/100: ${JSON.stringify(g1.dims)})`);
    await shot('line-result');
    // ---- Hour Eight again, with an unsafe choice ----
    await act('.lo-result [data-replay]');
    await page.waitForSelector('.lw-between [data-primary]'); await act('.lw-between [data-primary]');
    await act('.lo-intro [data-primary]');
    for (const id of ['tom', 'dig']) { await act(`[data-ev="${id}"]`); await act('.lo-found [data-ok]'); }
    await act('[data-board]'); await act('[data-apply="S3"]');
    await act('[data-dq="q1"][data-do="S3"]'); await act('[data-dq="q2"][data-do="56"]'); await act('[data-dq="q3"][data-do="crane"]'); await act('.lo-diag [data-conf="fairly"]');
    await act('[data-decide]');
    await act('[data-dec="D5"]');
    await page.waitForSelector('.lw-line.refusal');
    r.ok(/Hannah/.test(await text('.lw-line.refusal .lw-nm')), 'cutting the crossing tests was not refused by Hannah');
    await shot('line-unsafe');
    await act('[data-confirm]'); await act('.lo-ring [data-primary]');
    for (const [k, v] of [['status', 'risk'], ['why', 'pipe'], ['margin', '0'], ['next', '18'], ['need', 'fallback']]) await act(`[data-ck="${k}"][data-cv="${v}"]`);
    await act('.lo-callb [data-send]');
    await page.waitForSelector('.lo-result .lo-gate', { timeout: 8000 }).catch(() => r.fail('an unsafe choice did not show the safety gate'));
    const g2 = await page.evaluate(() => JSON.parse(localStorage.getItem('lineside_learn_v1')).modules.planning.line.grade);
    r.ok(g2.band === 'notyet', `an unsafe choice must cap Hour Eight at "Not yet" (got ${g2.band}, ${g2.total})`);
    await shot('line-unsafe-result');
    await act('.lo-result [data-next]');
    await page.waitForSelector('.lw-between [data-primary]'); await act('.lw-between [data-primary]');

    // ---- the Logbook ----
    await page.waitForSelector('.lk');
    const lb = await page.evaluate(() => JSON.parse(localStorage.getItem('lineside_learn_v1')).modules.planning);
    r.ok(lb.lamp && lb.lamp.band === 'gold', `the lamp should keep the best band (gold), got ${lb.lamp && lb.lamp.band}`);
    r.ok(lb.lamp && lb.lamp.checks && lb.lamp.checks.length >= 4, 'no lamp checks were booked');
    r.ok(/certain/i.test(await text('.lk-cal')), 'the Logbook shows no calibration line');
    await shot('logbook');
    await page.evaluate(() => { const el = document.querySelector('#lwStage'); el.scrollTop = el.scrollHeight; });
    await shot('logbook-bottom');
    await act('[data-home]');
    await page.waitForFunction(() => !document.querySelector('#learn').classList.contains('on') && document.querySelector('#title').classList.contains('on'), null, { timeout: 8000 }).catch(() => r.fail('leaving the Logbook did not return to the title'));
    const saves = await page.evaluate(() => ({ learn: JSON.parse(localStorage.getItem('lineside_learn_v1')).modules.planning.step, chapter: localStorage.getItem('lineside_v2') }));
    r.ok(saves.learn === 'done', `module progress should be "done" (got ${saves.learn})`);
    r.ok(!saves.chapter, 'the module wrote into the Chapter 1 save');
    const sc = await page.evaluate(() => LS.Learn.selfCheck(LS.MODULES.planning));
    for (const c of sc) r.ok(c.ok, `numbers disagree with the critical-path engine: ${c.what}: ${c.bad.join(', ')}`);

    // ---- in the world: the office board offers the module, and the Planning Lens is live ----
    await H.newGame(page, { name: 'Lamp' });
    await H.gotoRoom(page, 'office');
    await page.evaluate(() => { const e = __T.W().entities.find(e => e.id === 'board' && e.room === 'office'); __T.interact(e); });
    await page.waitForSelector('#board.on #bLearn', { timeout: 8000 }).catch(() => r.fail('the office board did not offer the Planning module'));
    r.ok(await has('#board .lw-lensplan .lw-lp.crit'), 'the office board shows no Planning Lens view of the works plan after mastery');
    await shot('world-board-offer');
    if (await has('#bLens')) await act('#bLens');
    await act('#bLearn');
    await page.waitForSelector('#learn.on .lw-hub', { timeout: 8000 });
    await shot('world-hub');
    await act('.lw-hub [data-primary]');
    await page.waitForFunction(() => !document.querySelector('#learn').classList.contains('on') && __T.W().room === 'office' && !__T.W().paused, null, { timeout: 8000 }).catch(() => r.fail('leaving the module did not return you to the office in Chapter 1'));
    // and "Save and leave" from inside the module must hand Chapter 1 back too
    await page.evaluate(() => { const e = __T.W().entities.find(e => e.id === 'board' && e.room === 'office'); __T.interact(e); });
    await act('#bLearn'); await page.waitForSelector('#learn.on .lw-hub', { timeout: 8000 });
    await act('#lwLeave');
    await page.waitForFunction(() => !document.querySelector('#learn').classList.contains('on') && __T.W().room === 'office' && !__T.W().paused && !!__T.W().onInteract, null, { timeout: 8000 }).catch(() => r.fail('“Save and leave” from the office did not give Chapter 1 back (world still paused)'));
    await shot('world-office-lens', false);
    await H.gotoRoom(page, 'outside');
    await page.evaluate(() => { const p = LS.WORLD.tp(63, 46); __T.teleport(p.x, p.y); });
    await shot('world-lamp', false);
    const st = await page.evaluate(() => ({ done: Object.keys(__T.S().done || {}).filter(k => __T.S().done[k]), lens: LS.Learn.lens }));
    r.log(`back in Chapter 1: done=[${st.done}] lens=${st.lens}`);

    for (const i of found.values()) { const m = `${TYPES[i.type] || i.type}: ${i.el ? i.el + ' ' : ''}${i.msg} [on: ${i.screens.join('; ')}]`; if (mobile) r.fail(m); else r.warn(m); }
    r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
    r.note(`${n} screens · Hour Eight ${g1.total}/100 ${g1.band}, unsafe replay ${g2.band} · ${found.size ? found.size + ' layout issues' : 'layout clean'}`);
  } catch (e) { if (P.errors.length) r.log('JS errors so far:\n' + H.fmtErrors(P.errors)); throw e; }
  finally { await P.close(); }
}

module.exports = {
  name: 'learning',
  about: 'Plays the Project Planning module end to end (Board, Bench, Brew, Hour Eight, Logbook) (all authored, no AI); audits every screen.',
  async run(t) {
    for (const vp of ['desktop', 'mobile']) await t.check('Project Planning module, end to end', vp, r => play(t, r, vp));
  }
};
