/* LINESIDE Learning World: DO, Out on the line ("Hour Eight").
 *
 * You're dropped into the middle of something already going on: Saturday, 06:10, hour eight of a 56-hour road
 * closure at the Crag Lane crossing. The clock moves only when you act (so it's calm and accessible). Find out,
 * put the new times on the cabin board, diagnose, decide, then make the 07:00 status call from sentence chips.
 * Help comes from the Brew's three voices: authored hints at three levels for each stage (the veteran's costs your
 * one favour), and a straight answer from Hannah on the crossing tests. Nothing here is generated. The rubric is deterministic; unsafe choices cap it at "Not yet".
 */
window.LS = window.LS || {};
(function () {
  const L = LS.Learn, esc = L.esc, num = L.num;
  const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const money = v => '£' + v.toLocaleString('en-GB');

  // The engine's truth: what really happens, given the surprise and the chosen decisions.
  L.hourEight = function (D, chosen, variant) {
    const has = id => chosen.includes(id), V = variant || {};
    const acts = D.plan.acts.map(a => Object.assign({}, a, { preds: a.preds.slice() }));
    const set = (id, v) => { acts.find(a => a.id === id).dur = v; };
    set('S3', 6 + 3 - (has('D1') ? 1.5 : 0));
    if (has('D3')) set('S9', 3);
    set('BAL', 16);
    const craneTo = (V.craneTo || D.plan.crane.to) + (has('D2') ? 2 : 0);
    const r = L.cpm(acts), s4 = r.acts.S4, clash = s4.ef > craneTo + 1e-6;
    const finish = r.finish + (clash ? 10 : 0), margin = D.plan.wall - finish;
    const cost = D.decisions.filter(d => has(d.id)).reduce((a, d) => a + (d.cost || 0), 0);
    // was the crane extension needed? (the same decisions without D2)
    let waste = false;
    if (has('D2')) { const w = L.hourEight(D, chosen.filter(x => x !== 'D2'), variant); waste = !w.clash; }
    return { acts, cpm: r, finish, margin, clash, craneTo, cost, waste, s4ef: s4.ef, ballastFloat: r.acts.BAL.tf };
  };

  // Deterministic rubric (docs/LEARNING_WORLD.md §3.6). Returns {dims:[{dim,points,got,why}], total, band, unsafe}.
  L.gradeHourEight = function (D, st, variant) {
    const seen = id => st.actions.some(a => a.id === id), ch = st.decisions, has = id => ch.includes(id);
    const out = L.hourEight(D, ch, variant), unsafe = ch.filter(id => (D.decisions.find(d => d.id === id) || {}).safetyFail);
    const dims = [];
    // Find out
    let f = 0; const fw = [];
    if (st.actions.some(a => a.id === 'tom') || seen('dig')) { f += 10; fw.push(seen('tom') ? 'heard Tom before he went home' : 'went to the dig'); } else fw.push('never confirmed the pipe (Tom or the dig)');
    if (seen('crane')) { f += 5; fw.push('checked the crane sheet'); } else fw.push('missed the crane sheet');
    if (seen('permit')) { f += 5; fw.push('read the permit'); } else fw.push('missed the permit');
    dims.push({ dim: 'Find out', points: 20, got: f, why: fw.join('; ') });
    // Diagnose
    let d = 0; const dw = [], dg = st.diag || {};
    if (dg.q1 === 'S3') { d += 10; dw.push('named the dig-out as the critical problem'); } else dw.push('didn’t name the dig-out as the problem');
    if (dg.q2 === '56') { d += 5; dw.push('new finish hour 56, zero margin'); } else dw.push('new finish wrong (it’s hour 56)');
    if (dg.q3 === 'crane') { d += 5; dw.push('spotted the crane clash'); } else dw.push('missed the crane clash');
    if (dg.q1 !== 'BAL' && dg.q3 !== 'ballast') { d += 5; dw.push('kept the ballast in its place (not critical)'); } else dw.push('called the late ballast critical');
    const loudFirst = (st.actions[0] && st.actions[0].id === 'steve') || has('D4');
    if (loudFirst) { d = Math.max(0, d - 10); dw.push('chased the loud problem first'); }
    dims.push({ dim: 'Diagnose', points: 25, got: d, why: dw.join('; ') });
    // Decide
    let e = 0; const ew = [];
    if (unsafe.length) ew.push('chose something unsafe, so Decide scores nothing');
    else {
      if (out.clash) ew.push('the crane went home before the culvert was in');
      else if (out.margin >= 4) { e += 15; ew.push(`margin back to ${num(out.margin)} h`); }
      else if (out.margin >= 2 || (out.margin >= 1.5 && has('D7'))) { e += 10; ew.push(`margin ${num(out.margin)} h${out.margin < 2 ? ', workable with the checkpoint' : ''}`); }
      else if (out.margin > 0) { e += 5; ew.push(`only ${num(out.margin)} h of margin`); }
      else ew.push('no margin before the wall');
      if (!out.clash && out.margin > 0) {
        if (!out.waste && !has('D4') && out.cost <= 5000) { e += 10; ew.push(`no money spent for nothing (${money(out.cost)})`); }
        else { e += 5; ew.push(out.waste ? 'the crane extension was spent for nothing' : has('D4') ? 'a morning spent chasing the ballast' : 'costly'); }
      }
    }
    dims.push({ dim: 'Decide', points: 25, got: e, why: ew.join('; ') });
    // Tell
    let t = 0; const tw = [], c = st.call || {};
    if (c.status === 'risk') { t += 4; tw.push('“at risk”'); } else tw.push('status not “at risk”');
    if (c.why === 'pipe') { t += 4; tw.push('the real cause'); } else tw.push('not the real cause');
    const acts = (c.doing || []).filter(x => ch.includes(x));
    if (acts.length && acts.length === (c.doing || []).length) { t += 4; tw.push('what you’re doing'); } else tw.push(acts.length ? 'some actions you didn’t take' : 'no actions');
    if (c.margin != null && Math.abs(c.margin - (out.clash ? 0 : Math.max(0, out.margin))) < 0.01) { t += 4; tw.push('the true margin'); } else tw.push('margin not right');
    if (c.next === '18') { t += 2; tw.push('a time for the next update'); }
    if (c.need === 'fallback') { t += 2; tw.push('the fallback'); }
    dims.push({ dim: 'Tell', points: 20, got: t, why: tw.join('; ') });
    // Control
    dims.push({ dim: 'Control', points: 10, got: has('D7') ? 10 : 0, why: has('D7') ? 'set a checkpoint with a fallback' : 'no checkpoint or trigger' });
    const total = dims.reduce((a, x) => a + x.got, 0);
    const band = unsafe.length ? D.bands.find(b => b.id === 'notyet') : D.bands.find(b => total >= b.min);
    return { dims, total, band: band.id, bandT: band.t, unsafe, outcome: out, loudFirst };
  };

  L.steps.line = async function (mod, P) {
    const D = mod.do, V = P.variant ? (D.variants || []).find(v => v.id === P.variant) : null;
    const say = (id, dflt) => (V && V.say && V.say[id]) || dflt;
    const st = P.line = { actions: [], clock: D.clock.startMin, found: {}, board: {}, diag: {}, decisions: [], call: null, help: [], stage: 'find', variant: P.variant || null, started: Date.now() };
    L.save();
    // 1) dropped in
    let el = L.stage(`<div class="lo-intro"><div class="lo-clock big"><span>${esc(D.when)}</span><b>${esc(D.clock.start)}</b><small>Hour ${D.clock.nowHour} of ${D.plan.wall}</small></div>
      <div class="eyebrow">${esc(D.where)}${V ? ' · replay: ' + esc(V.note) : ''}</div><h2>${esc(D.title)}</h2><p class="lo-setup">${esc(D.setup)}</p><p class="lo-arrive"><i>${esc(D.arrive)}</i></p>
      <div class="lo-rules"><div><b>50 minutes</b><small>until the 07:00 call</small></div><div><b>The clock</b><small>moves when you act, not while you think</small></div><div><b>Ask for help</b><small>Callum’s on site; Amira and Pat are a phone call away (Pat’s costs a favour)</small></div></div>
      <div class="lw-cta"><button class="btn dark" data-primary>Step into the cabin →</button></div></div>`);
    await L.go(el);

    // 2) find out
    const ev = D.evidence;
    const avail = e => (e.until == null || st.clock < e.until) && (e.after == null || st.clock >= e.after) && !st.found[e.id] && !(e.id === 'sheet' && st.found.tom);
    const timeLeft = () => D.clock.callMin - st.clock;
    const favoursLeft = () => D.help.favours - st.help.filter(h => h.cost).length;
    const coachBtn = `<button class="lo-coach" data-coach aria-label="Ask for help"><span class="lo-faces">${D.help.voices.map(v => `<i>${L.face(v.id, 'smile', mod)}</i>`).join('')}</span> Ask for help <small data-coachn>${st.help.length ? st.help.length + ' asked' : favoursLeft() + ' favour'}</small></button>`;
    const bar = () => `<div class="lo-bar"><div class="lo-clock"><b>${hm(st.clock)}</b><small>Sat · hour ${Math.floor(D.clock.nowHour + (st.clock - D.clock.startMin + 10) / 60)} of ${D.plan.wall}</small></div><div class="lo-left ${timeLeft() <= 10 ? 'low' : ''}"><b>${Math.max(0, timeLeft())} min</b><small>to the 07:00 call</small></div>${coachBtn}</div>`;
    const mapPins = () => ev.map((e, i) => `<span class="lo-pin ${st.found[e.id] ? 'seen' : ''} ${avail(e) ? '' : 'gone'}" style="left:${e.map[0]}%;top:${e.map[1]}%" aria-hidden="true">${i + 1}</span>`).join('');
    const notebook = () => ev.filter(e => st.found[e.id]).map(e => `<li><b>${esc(e.label)}</b> <small>${esc(hm(st.found[e.id].at))}</small><p>${esc(say(e.id, e.say))}</p></li>`).join('') || '<li class="empty">Nothing yet. Choose what to check first.</li>';
    const findHTML = () => `<div class="lo-find"><div class="lo-mapwrap"><div class="lo-map" role="img" aria-label="Map of the Crag Lane site: the crossing, the dig, the compound, the site and welfare cabins">${siteSVG()}${mapPins()}</div>
      <ol class="lo-ev">${ev.map((e, i) => { const a = avail(e), f = st.found[e.id]; return `<li><button class="lo-evb ${f ? 'seen' : ''}" data-ev="${e.id}" ${a ? '' : 'disabled'}><span class="lo-n">${i + 1}</span><span><b>${esc(e.label)}</b><small>${esc(e.where)}${e.id === 'tom' ? ' · until 06:30' : e.id === 'sheet' ? ' · after 06:30' : ''}</small></span><span class="lo-cost">${f ? 'Checked' : !a ? (e.id === 'tom' ? 'Gone home' : '—') : e.cost + ' min'}</span></button></li>`; }).join('')}</ol></div>
      <div class="lo-note"><div class="eyebrow">Your notebook</div><ul>${notebook()}</ul>
      <div class="lw-cta"><button class="btn dark" data-board data-primary>Open the cabin board →</button></div></div></div>`;
    // Help: the three voices from the Brew. Each has an authored hint for the stage you're at; the veteran's is the
    // most insightful and costs your one favour. There's also a straight answer from Hannah on the crossing tests.
    const coachUI = async () => {
      const voiceHTML = v => { const p = L.person(v.id, mod), used = st.help.some(h => h.who === v.id && h.stage === st.stage), out = v.cost && favoursLeft() < v.cost && !used;
        return `<button class="lo-voice lv${v.level}" data-voice="${v.id}" ${out ? 'disabled' : ''}><span class="lw-face">${L.face(v.id, 'smile', mod)}</span><span class="lo-vt"><b>${esc(p.name)}</b><small>${esc((mod.talk.panel.find(x => x.id === v.id) || {}).label || '')} · ${esc(v.how)}</small></span><span class="lo-vc">${v.cost ? (out ? 'Favour used' : used ? 'Asked' : `${v.cost} favour`) : used ? 'Asked' : 'Free'}</span></button>`; };
      const box = L.modal(`<div class="lo-callin"><div class="eyebrow">Ask for help · ${favoursLeft()} favour left</div><h3>Who do you turn to?</h3>
        <div class="lo-voices">${D.help.voices.map(voiceHTML).join('')}</div>
        <button class="lo-safe" data-safe>🦺 ${esc(D.help.safety.ask)}</button>
        <div class="lo-answer" aria-live="polite"></div>
        <div class="lw-cta"><button class="btn dark small" data-hang>Back to it</button></div></div>`, 'lo-call');
      const answer = box.querySelector('.lo-answer');
      box.querySelectorAll('[data-voice]').forEach(b => b.onclick = () => {
        const v = D.help.voices.find(x => x.id === b.dataset.voice), again = st.help.some(h => h.who === v.id && h.stage === st.stage);
        if (!again) { st.help.push({ who: v.id, level: v.level, stage: st.stage, cost: v.cost || 0, at: st.clock }); L.save(); }
        answer.innerHTML = L.lineHTML(v.id, v.hints[st.stage] || v.hints.find, { mood: 'smile', noRole: true, cls: v.level === 3 ? 'vet' : '' });
        box.querySelector('.eyebrow').textContent = `Ask for help · ${favoursLeft()} favour left`;
        box.querySelectorAll('[data-voice]').forEach(x => { const vv = D.help.voices.find(y => y.id === x.dataset.voice); if (vv.cost && favoursLeft() < vv.cost && !st.help.some(h => h.who === vv.id && h.stage === st.stage)) { x.disabled = true; x.querySelector('.lo-vc').textContent = 'Favour used'; } if (x === b) x.querySelector('.lo-vc').textContent = 'Asked'; });
        L.sfx(v.level === 3 ? 'good' : 'tap');
        if (v.level >= 2 && st.stage === 'cabin' && onCoach) onCoach(3);
      });
      box.querySelector('[data-safe]').onclick = () => { st.safetyAsked = true; answer.innerHTML = L.lineHTML(D.help.safety.who, D.help.safety.say, { mood: 'neutral', noRole: true }); L.sfx('tap'); };
      await L.pick(box, '[data-hang]'); L.closeModal(box);
      showBar();
    };
    // the clock, the time to the call and the help button sit in a bar above the step (it never scrolls away)
    let onCoach = null;
    const showBar = () => { const sub = L.sub(bar()); const c = sub && sub.querySelector('[data-coach]'); if (c) c.onclick = () => { if (!document.querySelector('#learn .lw-modal')) coachUI(); }; };
    let timeUp = false;
    while (true) {
      el = L.stage(`<div class="lo">${findHTML()}</div>`);
      showBar();
      const b = await L.pick(el, '[data-ev],[data-board]');
      if (b.hasAttribute('data-board')) break;
      const e = ev.find(x => x.id === b.dataset.ev);
      st.clock += e.cost; st.found[e.id] = { at: st.clock }; st.actions.push({ id: e.id, at: st.clock }); L.save();
      L.sfx(e.who ? 'page' : 'select');
      // the finding, as a card
      const ov = L.modal(`<div class="lo-foundin"><div class="eyebrow">${esc(hm(st.clock))} · ${esc(e.where)}</div><h3>${esc(e.label)}</h3>${e.who ? L.lineHTML(e.who, say(e.id, e.say), { mood: e.signal === 'distractor' ? 'concern' : 'neutral' }) : `<p class="lo-read">${esc(say(e.id, e.say))}</p>`}
        ${e.lens && L.mastered('planning') ? `<p class="lo-lens">Planning Lens: ${esc(e.lens)} glows amber on the cabin board.</p>` : ''}<div class="lw-cta"><button class="btn dark" data-primary data-ok>Noted</button></div></div>`, 'lo-found');
      await L.go(ov, '[data-ok]'); L.closeModal(ov);
      if (timeLeft() <= 0) { timeUp = true; break; }
    }
    if (timeUp) {
      showBar(); el = L.stage(`<div class="lo"><div class="lw-between"><div class="eyebrow">07:00</div><h2>Helen’s ringing in a minute</h2><p>No more looking. Put what you’ve got on the cabin board, decide, and make the call.</p><div class="lw-cta"><button class="btn dark" data-primary>To the cabin board →</button></div></div></div>`);
      await L.go(el);
    }

    // 3) the cabin board: put the new times in, then diagnose
    const knowS3 = st.found.tom || st.found.dig, knowSheet = st.found.sheet;
    const acts0 = D.plan.acts.map(a => Object.assign({ code: a.id }, a, { preds: a.preds.slice() }));
    const craneTo = (V && V.craneTo) || D.plan.crane.to;
    const tcfg = { acts: acts0, unit: 'h', unitLong: 'hours', wall: D.plan.wall, wallLabel: D.plan.wallLabel, clock: { startHour: D.clock.startHour, startDay: D.clock.startDay }, now: D.clock.nowHour + 10 / 60, windows: st.found.crane ? [{ act: 'S4', to: craneTo, label: 'crane' }] : [], max: 58, step: 0.5, maxDur: 24, title: 'The cabin board', subtitle: 'Crag Lane crossing · hours from 22:00 Friday' };
    const diagHTML = () => `<div class="lo-diag"><div class="eyebrow">What’s going on?</div>${['q1', 'q2', 'q3'].map(k => { const q = D.diagnose[k]; return `<div class="lo-q" data-q="${k}"><b>${esc(q.ask)}</b><div class="lw-opts">${q.options.map(o => `<button class="lw-opt small ${st.diag[k] === o.id ? 'on' : ''}" data-dq="${k}" data-do="${o.id}" aria-pressed="${st.diag[k] === o.id}">${esc(o.t)}</button>`).join('')}</div></div>`; }).join('')}${L.confHTML('How sure are you of your diagnosis?')}</div>`;
    el = L.stage(`<div class="lo"><div class="lo-cabin"><div class="lo-found-chips">${knowS3 ? `<button class="lo-apply" data-apply="S3">Found: S3 dig-out +3 h (the ${V ? 'cable' : 'pipe'}) · <b>Put it on the board</b></button>` : ''}${knowSheet && !knowS3 ? `<span class="lo-fc">Handover sheet: extra time on S3, “TBC”. Stretch S3 yourself.</span>` : ''}${st.found.steve ? `<button class="lo-apply" data-apply="BAL">Found: ballast now arrives 14:00 (hour 16) · <b>Put it on the board</b></button>` : ''}${st.found.crane ? `<span class="lo-fc">Crane window shown on S4: hire ends ${esc(hm(((craneTo + D.clock.startHour) % 24) * 60))}</span>` : ''}${!knowS3 && !knowSheet ? '<span class="lo-fc">You haven’t found out what’s behind yet. The board shows the original plan.</span>' : ''}</div>
      <div class="lo-tablehost"></div>${diagHTML()}<div class="lw-cta"><button class="btn dark" data-primary data-decide disabled>Decide what to do →</button></div></div></div>`);
    const table = L.Table(el.querySelector('.lo-tablehost'), tcfg, { editable: { dur: true }, toggles: ['float', 'times'], hint: 'Tap a job to stretch it. Put in what you found and watch the finish, the wall and the crane window.', onSay: (who, t) => { const n = el.querySelector('.lo-say'); if (n) n.remove(); el.querySelector('.lo-tablehost').insertAdjacentHTML('afterend', `<div class="lo-say">${L.lineHTML(who, t, { noRole: true })}</div>`); } });
    st.stage = 'cabin';
    el.querySelectorAll('[data-apply]').forEach(b => b.onclick = () => { const id = b.dataset.apply; if (id === 'S3') table.setDur('S3', 9); if (id === 'BAL') table.setDur('BAL', 16); st.board[id] = true; b.disabled = true; b.classList.add('done'); L.sfx('place'); L.save(); });
    const gc = L.bindConf(el, () => upd());
    const upd = () => { el.querySelector('[data-decide]').disabled = !(st.diag.q1 && st.diag.q2 && st.diag.q3 && gc()); };
    el.querySelectorAll('[data-dq]').forEach(b => b.onclick = () => { const k = b.dataset.dq; st.diag[k] = b.dataset.do; el.querySelectorAll(`[data-dq="${k}"]`).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); L.sfx('tap'); L.save(); upd(); });
    onCoach = () => table.highlight(['S3', 'S4']);   // asking Amira or Pat here lights up the two jobs that matter
    await L.go(el, '[data-decide]');
    const dconf = gc(), dOk = st.diag.q1 === 'S3' && st.diag.q2 === '56' && st.diag.q3 === 'crane';
    L.recordConf(P, 'hour-eight', dconf, dOk);
    st.boardActs = table.state().acts.map(a => ({ id: a.id, dur: a.dur })); table.destroy();

    // 4) decide
    st.stage = 'decide'; onCoach = null;
    const model = () => {   // the learner's own model (their board) plus the decisions' effects
      const acts = D.plan.acts.map(a => { const b = st.boardActs.find(x => x.id === a.id); return Object.assign({}, a, { dur: b ? b.dur : a.dur, preds: a.preds.slice() }); });
      if (st.decisions.includes('D1')) { const s3 = acts.find(a => a.id === 'S3'); if (s3.dur > 6) s3.dur = Math.max(6, s3.dur - 1.5); }
      if (st.decisions.includes('D3')) acts.find(a => a.id === 'S9').dur = 3;
      const r = L.cpm(acts), to = craneTo + (st.decisions.includes('D2') ? 2 : 0);
      return { acts, r, clash: st.found.crane && r.acts.S4.ef > to + 1e-6, to };
    };
    const refusals = [];
    while (true) {
      const m = model(), cost = D.decisions.filter(d => st.decisions.includes(d.id)).reduce((a, d) => a + (d.cost || 0), 0);
      el = L.stage(`<div class="lo"><div class="lo-decide"><div class="lo-dhead"><div><div class="eyebrow">Decide</div><h2>What will you do?</h2><p>Choose any, then confirm. Each has a cost and an effect on the plan.</p></div>
        <div class="lo-proj ${m.clash || D.plan.wall - m.r.finish < 2 ? 'warn' : ''}"><span>On your board</span><b>${num(D.plan.wall - m.r.finish)} h</b><small>margin before the wall${m.clash ? ' · crane clash on S4' : ''}</small><em>${money(cost)} committed</em></div></div>
        <div class="lo-dec">${D.decisions.map(d => { const on = st.decisions.includes(d.id), locked = d.needs && !st.found[d.needs]; return `<button class="lo-db ${on ? 'on' : ''} ${d.safetyFail && on ? 'refused' : ''}" data-dec="${d.id}" aria-pressed="${on}" ${locked ? 'disabled' : ''}><span class="lo-dt"><b>${esc(d.t)}</b><small>${locked ? 'You haven’t heard about this yet.' : esc(d.d || '')}</small></span><span class="lo-dc">${d.costLabel ? esc(d.costLabel) : d.cost ? money(d.cost) : 'Free'}</span></button>`; }).join('')}</div>
        <div class="lo-sayhost">${refusals.map(r => r).join('')}</div>
        <div class="lw-cta"><button class="btn dark" data-primary data-confirm>Confirm and take the call →</button></div></div></div>`);
      const b = await L.pick(el, '[data-dec],[data-confirm]');
      if (b.hasAttribute('data-confirm')) break;
      const d = D.decisions.find(x => x.id === b.dataset.dec);
      if (st.decisions.includes(d.id)) { if (!d.safetyFail) st.decisions = st.decisions.filter(x => x !== d.id); }
      else {
        st.decisions.push(d.id); L.sfx(d.safetyFail ? 'bad' : 'place');
        if (d.safetyFail) refusals.push(L.lineHTML(d.refusedBy, d.refusal, { mood: 'concern', cls: 'refusal' }));
      }
      L.save();
    }

    // 5) the 07:00 call
    st.stage = 'call';
    const out = L.hourEight(D, st.decisions, V);
    const R = D.report, chosenActs = D.decisions.filter(d => st.decisions.includes(d.id) && !d.safetyFail && !d.trap);
    const truthMargin = out.clash ? 0 : Math.max(0, out.margin);
    const marginOpts = Array.from(new Set([0, 1.5, 3, 4.5, truthMargin, Math.max(0, D.plan.wall - model().r.finish)])).sort((a, b) => a - b);
    const call = { status: null, why: null, doing: [], margin: null, next: null, need: null, free: '' };
    const row = (k, lbl, chips, multi) => `<div class="lo-crow" data-row="${k}"><span class="lo-cl">${esc(lbl)}</span><div class="lo-cc">${chips.map(c => `<button class="lo-chip ${(multi ? call[k].includes(c.id) : call[k] === c.id) ? 'on' : ''}" data-ck="${k}" data-cv="${esc(c.id)}" aria-pressed="${multi ? call[k].includes(c.id) : call[k] === c.id}">${esc(c.t)}</button>`).join('')}</div></div>`;
    const sentence = () => {
      const pick = (k, list) => (list.find(c => c.id === call[k]) || {}).t;
      const parts = [pick('status', R.status.chips), pick('why', R.why.chips) && `because of: ${pick('why', R.why.chips).toLowerCase()}`, call.doing.length && `We’re ${call.doing.map(id => (D.decisions.find(d => d.id === id) || {}).t.toLowerCase()).join('; and ')}`, call.margin != null && `Margin now about ${num(call.margin)} hours`, pick('next', R.next.chips), pick('need', R.need.chips) && `From you: ${pick('need', R.need.chips).toLowerCase()}`].filter(Boolean);
      return parts.length ? parts.join('. ') + '.' : 'Tap the chips to build your update.';
    };
    const ring = L.stage(`<div class="lo"><div class="lo-ring"><div class="lo-phone">📞</div><div class="lo-rwho"><div class="lw-face">${L.face('helen', 'neutral', mod)}</div><div><b>${esc(L.person('helen').name)}</b><small>with the council’s highways officer · 07:00 status call</small></div></div><div class="lw-cta"><button class="btn dark" data-primary>Answer</button></div></div></div>`);
    L.sfx('phone'); await L.go(ring);
    while (true) {
      el = L.stage(`<div class="lo"><div class="lo-callb"><div class="eyebrow">07:00 · status call</div><h2>Tell them where you are</h2>
        ${L.lineHTML('helen', 'Morning. Where are we with Crag Lane?', { mood: 'neutral', noRole: true })}
        <div class="lo-builder">${row('status', R.status.label, R.status.chips)}${row('why', R.why.label, R.why.chips)}${row('doing', R.doing.label, chosenActs.map(d => ({ id: d.id, t: d.t })).concat(chosenActs.length ? [] : [{ id: 'none', t: 'Nothing yet' }]), true)}${row('margin', R.margin.label, marginOpts.map(v => ({ id: String(v), t: num(v) + ' h' })))}${row('next', R.next.label, R.next.chips)}${row('need', R.need.label, R.need.chips)}</div>
        <div class="lo-preview"><div class="eyebrow">What you’ll say</div><p>${esc(sentence())}</p></div>
        <label class="eyebrow" for="loFree">Anything to add? (optional)</label><textarea id="loFree" class="field" rows="2" maxlength="400">${esc(call.free)}</textarea>
        <div class="lw-cta"><button class="btn dark" data-primary data-send ${call.status && call.why && call.margin != null && call.next && call.need ? '' : 'disabled'}>Make the call →</button></div></div></div>`);
      const b = await L.pick(el, '[data-ck],[data-send]');
      call.free = el.querySelector('#loFree').value;
      if (b.hasAttribute('data-send')) break;
      const k = b.dataset.ck, v = b.dataset.cv;
      if (k === 'doing') { if (v === 'none') call.doing = []; else call.doing = call.doing.includes(v) ? call.doing.filter(x => x !== v) : call.doing.concat(v); }
      else call[k] = k === 'margin' ? +v : v;
      L.sfx('tap');
    }
    st.call = call; L.save();

    // 6) the result
    const g = L.gradeHourEight(D, st, V);
    st.grade = { total: g.total, band: g.band, dims: g.dims.map(d => ({ dim: d.dim, got: d.got, points: d.points })), unsafe: g.unsafe, margin: g.outcome.margin, clash: g.outcome.clash, cost: g.outcome.cost };
    const luck = D.luck[Math.random() < D.luck[0].p ? 0 : 1]; st.luck = luck.t;
    const ORD = ['notyet', 'bronze', 'silver', 'gold'];
    if (!P.lineBest || ORD.indexOf(g.band) > ORD.indexOf(P.lineBest.band) || (g.band === P.lineBest.band && g.total > P.lineBest.total)) P.lineBest = { band: g.band, total: g.total, at: Date.now() };
    L.save();
    L.sfx(g.band === 'notyet' ? 'bad' : 'good');
    const helenReply = g.unsafe.length ? 'Hannah’s told me what you asked for. We’ll talk about that. For now, do it properly.' : g.dims[3].got >= 16 ? 'Clear, honest and with a plan B. That’s exactly what I needed. Speak at six.' : 'Right. I’ve got the gist. Can you send me the rest in writing?';
    L.sub('');
    el = L.stage(`<div class="lo"><div class="lo-result"><div class="lo-rtop"><div>${L.lineHTML('helen', helenReply, { mood: g.unsafe.length ? 'concern' : 'smile', noRole: true })}</div>
      <div class="lo-band ${g.band}"><span class="lw-bigLamp ${g.band}"><span></span></span><b>${esc(g.bandT)}</b><small>${g.total} / 100</small></div></div>
      ${g.unsafe.length ? `<div class="lo-gate"><b>Safety is a gate, not a trade-off.</b> You chose ${g.unsafe.map(id => esc(D.decisions.find(d => d.id === id).t.toLowerCase())).join(' and ')}. That caps the scenario at “Not yet”, whatever the rest of the score.</div>` : ''}
      <div class="lo-dims">${g.dims.map(d => `<div class="lo-dim"><div class="lo-dimh"><b>${esc(d.dim)}</b><span>${d.got} / ${d.points}</span></div><div class="lo-dbar"><i style="width:${100 * d.got / d.points}%"></i></div><small>${esc(d.why)}</small></div>`).join('')}</div>
      <div class="lo-outcome"><div><span>What really happened</span><b>${g.outcome.clash ? 'Crane clash' : num(g.outcome.margin) + ' h'}</b><small>${g.outcome.clash ? 'the crane went home with the culvert half in' : 'margin before the road reopens'} · ${money(g.outcome.cost)} spent</small></div></div>
      <div class="lo-expert"><div class="eyebrow">What an expert would have said</div><p>“${esc((V && V.expertLine) || D.expertLine)}”</p></div>
      <div class="lw-cta"><button class="btn line" data-replay>Replay with a fresh variation</button><button class="btn dark" data-primary data-next>To the Logbook →</button></div></div></div>`);
    const nb = await L.pick(el, '[data-next],[data-replay]');
    if (nb.hasAttribute('data-replay')) { P.variant = P.variant ? null : 'v2'; L.save(); return { goto: 'line' }; }
  };

  // A simple plan of the site (decorative): the road, the railway, the dig at the crossing, the compound and cabins.
  function siteSVG() {
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <rect width="100" height="100" fill="#8fb676"/><rect x="0" y="0" width="100" height="100" fill="url(#loTex)" opacity=".25"/>
      <defs><pattern id="loTex" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#6f9a5a"/></pattern><pattern id="loSl" width="3" height="10" patternUnits="userSpaceOnUse"><rect width="1.4" height="10" fill="#6b5a48"/></pattern></defs>
      <rect x="36" y="0" width="16" height="100" fill="#8a8d94"/><line x1="44" y1="0" x2="44" y2="100" stroke="#e8e2c8" stroke-width=".6" stroke-dasharray="3 3"/>
      <rect x="0" y="44" width="100" height="10" fill="#b6ab98"/><rect x="0" y="45" width="100" height="8" fill="url(#loSl)"/><line x1="0" y1="46.5" x2="100" y2="46.5" stroke="#5b5f68" stroke-width=".8"/><line x1="0" y1="51.5" x2="100" y2="51.5" stroke="#5b5f68" stroke-width=".8"/>
      <rect x="36" y="42" width="24" height="16" rx="1.5" fill="#8a6a45"/><rect x="38" y="44" width="20" height="12" rx="1" fill="#6e5236"/><line x1="40" y1="50" x2="57" y2="50" stroke="#c8b89a" stroke-width="1.2" stroke-dasharray="1.6 1"/>
      <rect x="62" y="64" width="34" height="30" rx="2" fill="#c9c3b3" stroke="#9a927e" stroke-width=".6" stroke-dasharray="1.5 1"/><rect x="66" y="68" width="10" height="7" fill="#e9b949"/><rect x="80" y="76" width="12" height="4" fill="#7b7f89"/><rect x="80" y="82" width="12" height="4" fill="#7b7f89"/>
      <rect x="8" y="58" width="16" height="9" rx="1" fill="#e8e1d3" stroke="#8a8272" stroke-width=".5"/><rect x="4" y="30" width="14" height="8" rx="1" fill="#d9e4ea" stroke="#7c8a92" stroke-width=".5"/>
      <rect x="33" y="22" width="3" height="18" fill="#c2474f"/><rect x="52" y="58" width="3" height="18" fill="#c2474f"/>
      <path d="M70 0 C72 14 80 20 96 22" stroke="#6f9ac4" stroke-width="2.4" fill="none" opacity=".7"/>
    </svg>`;
  }
})();
