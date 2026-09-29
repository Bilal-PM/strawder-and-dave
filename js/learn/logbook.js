/* LINESIDE Learning World: LOOK BACK, the Logbook (Moira's kitchen table at Beck Cottage).
 *
 * Your timeline next to an expert's, how your confidence compared with your results (calibration), luck shown as
 * luck (it never changes the grade), your takeaway line, one sentence from Moira, and the lamp. Lighting the lamp
 * unlocks the Planning Lens and books the lamp checks (spaced retrieval at 1, 3, 7 and 21 days; any misconception
 * still flagged at 2 or more after the Brew books its own check).
 */
window.LS = window.LS || {};
(function () {
  const L = LS.Learn, esc = L.esc, num = L.num;
  const DAY = 864e5;

  L.steps.logbook = async function (mod, P) {
    const D = mod.do, LB = mod.lookBack, st = P.line || { actions: [], decisions: [], grade: { total: 0, band: 'notyet', dims: [] } };
    const g = st.grade || { total: 0, band: 'notyet', dims: [] };
    const ev = id => D.evidence.find(e => e.id === id) || { label: id };
    const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    // expert timeline, with its own clock
    let t = D.clock.startMin; const expert = D.expertOrder.map(id => { t += ev(id).cost; return { id, at: t }; });
    const foundPipe = st.actions.find(a => a.id === 'tom' || a.id === 'dig');
    // calibration across the checkpoints
    const conf = (P.conf || []).filter(c => c.id);
    const certain = conf.filter(c => c.id === 'certain'), certRight = certain.filter(c => c.ok).length;
    const right = conf.filter(c => c.ok).length;
    const calLine = conf.length ? `${certain.length ? `You were certain ${certain.length} time${certain.length > 1 ? 's' : ''} and right ${certRight === certain.length ? (certRight === 1 ? 'that time' : 'every time') : certRight}.` : 'You were never “certain”.'} Overall you got ${right} of ${conf.length} checkpoints right first time.` : 'No confidence ratings yet.';
    const calNote = certain.length && certRight < certain.length ? 'Certainty is a feeling, not evidence. Before you commit, ask what would have to be true for you to be wrong.' : conf.filter(c => c.id === 'unsure' && c.ok).length >= 2 ? 'You doubted yourself more than your answers deserved. Trust your working a little more.' : 'Your confidence matched your results. That’s calibration, and it’s rarer than knowledge.';
    const confLabel = { unsure: 'Unsure', fairly: 'Fairly sure', certain: 'Certain' }, where = { p1: 'Puzzle 1 · critical path', p2: 'Puzzle 2 · possession', p2b: 'Puzzle 2 · the tamper', p3: 'Puzzle 3 · what slips', 'hour-eight': 'Hour Eight · diagnosis' };
    // Moira's sentence
    const first = st.actions[0] && st.actions[0].id;
    const M = LB.moira, moira = g.unsafe && g.unsafe.length ? M.unsafe : first === 'dig' ? M.digFirst : first === 'tom' ? M.tomFirst : first === 'steve' ? M.ballastFirst : M.default;
    // light the lamp (the best band so far is kept)
    const order = ['notyet', 'bronze', 'silver', 'gold'], best = [P.lamp && P.lamp.band, P.lineBest && P.lineBest.band, g.band].filter(Boolean);
    const band = best.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] || 'notyet', lit = band !== 'notyet';
    const flagged = Object.entries(P.flags || {}).filter(([, v]) => v >= 2).map(([k]) => k);
    const now = Date.now();
    if (lit) {
      const checks = LB.retrieval.map((d, i) => ({ id: LB.lampChecks[i % LB.lampChecks.length].id, at: now + d * DAY, day: d }));
      if (flagged.length) checks.push({ id: LB.lampChecks[0].id, at: now + 2 * DAY, day: 2, mc: flagged[0] });
      P.lamp = { band, at: (P.lamp && P.lamp.at) || now, checks: (P.lamp && P.lamp.checks && P.lamp.checks.some(c => !c.done)) ? P.lamp.checks : checks };
    } else P.lamp = { band: 'notyet', at: null, checks: [] };
    P.completedAt = now; L.save();
    const bandT = (D.bands.find(b => b.id === band) || {}).t;
    const dayLbl = d => d === 1 ? 'tomorrow' : `in ${d} days`;
    const who = id => L.person(id, mod).name.split(' ')[0];
    const tl = (list, cls) => `<ol class="lk-tl ${cls}">${list.map(a => `<li class="sig-${esc(ev(a.id).signal || '')}"><span>${esc(hm(a.at))}</span><b>${esc(ev(a.id).label)}</b></li>`).join('') || '<li class="empty">Nothing checked</li>'}</ol>`;
    const dec = id => (D.decisions.find(d => d.id === id) || {}).t || id;
    const el = L.stage(`<div class="lk">
      <div class="lk-head"><div class="lk-lamp ${band}"><div class="lw-bigLamp ${band} ${lit ? 'lighting' : ''}"><span></span></div><b>${esc(bandT)}</b><small>${lit ? esc(mod.lamp.label) + ' is lit' : 'The lamp waits for you'}</small></div>
        <div class="lk-moira">${L.lineHTML('moira', moira, { mood: 'smile' })}</div></div>
      <div class="lk-grid">
        <section class="lk-card"><h3>Your morning against an expert’s</h3><div class="lk-two"><div><div class="eyebrow">You</div>${tl(st.actions, 'you')}</div><div><div class="eyebrow">An expert</div>${tl(expert, 'exp')}</div></div>
          <p class="lk-p">${foundPipe ? `You found the pipe at ${esc(hm(foundPipe.at))}.` : 'You never found out what was holding up the dig.'} You chose: ${st.decisions.length ? st.decisions.map(id => `<b>${esc(dec(id))}</b>`).join('; ') : 'nothing'}.</p>
          <p class="lk-p dim">An expert would: ${esc(LB.expertLine)}</p>
          <p class="lk-p">${(st.help || []).length ? `You asked for help ${st.help.length} time${st.help.length > 1 ? 's' : ''}: ${st.help.map(h => `${esc(who(h.who))} (${esc(h.stage)})`).join(', ')}.${st.help.some(h => h.cost) ? ' You spent your favour with Pat.' : ''} That’s independence, not a mark against you.` : 'You worked it out without asking anyone. Next time, don’t be shy: Pat’s favour is there to be used.'}</p></section>
        <section class="lk-card"><h3>Confidence against results</h3><p class="lk-cal">${esc(calLine)}</p><ul class="lk-conf">${conf.map(c => `<li class="${c.ok ? 'ok' : 'no'}"><span>${esc(where[c.where] || c.where)}</span><em>${esc(confLabel[c.id] || '')}</em><b>${c.ok ? '✓' : '✗'}</b></li>`).join('')}</ul><p class="lk-p dim">${esc(calNote)}</p></section>
        <section class="lk-card"><h3>Luck and judgement</h3><p class="lk-p">${esc(st.luck || D.luck[0].t)}</p><p class="lk-p dim">Your grade is for your decisions, never the dice.</p>
          <div class="lk-score"><b>${g.total}</b><span>/ 100 on your last Hour Eight${P.lineBest && P.lineBest.total !== g.total ? ` · best ${P.lineBest.total}` : ''}</span></div><ul class="lk-dims">${(g.dims || []).map(d => `<li><span>${esc(d.dim)}</span><i><b style="width:${100 * d.got / d.points}%"></b></i><em>${d.got}/${d.points}</em></li>`).join('')}</ul></section>
        <section class="lk-card"><h3>Your takeaway</h3><blockquote>“${esc(P.takeaway || mod.talk.takeaways[0])}”</blockquote>
          ${P.brew && P.brew.teach ? `<p class="lk-p">Teach-back to ${esc(L.person(mod.talk.teachBack.who, mod).name.split(' ')[0])}: ${P.brew.teach.hit.length} of ${P.brew.teach.of} key points.</p>` : ''}
          ${flagged.length ? `<p class="lk-p">Still worth a look: ${flagged.map(id => esc((L.mcById(mod, id) || {}).short || id)).join(', ')}. A lamp check is booked for it.</p>` : '<p class="lk-p dim">No misconceptions left flagged.</p>'}</section>
        <section class="lk-card wide"><h3>${lit ? 'In Harrowby now' : 'When the lamp is lit'}</h3><ul class="lk-unlocks">
          <li class="${lit ? 'on' : ''}"><span class="lw-lampicon ${lit ? 'lit' : ''}"></span><b>${esc(mod.lamp.label)}</b><small>${lit ? 'Lit ' + esc(mod.lamp.where) + '.' : 'Score 45 or more on Hour Eight, with no unsafe choices.'}</small></li>
          <li class="${lit ? 'on' : ''}"><span class="lk-lens">◎</span><b>${esc(mod.lens.label)}</b><small>${lit ? 'Hold Q in the project office (or use the board) to see the critical chain.' : 'Unlocks with the lamp.'}</small></li>
          <li class="${lit ? 'on' : ''}"><span class="lk-board">▦</span><b>The project office board</b><small>${lit ? 'Now a working plan you can inspect.' : 'Set dressing, for now.'}</small></li>
          <li class="${lit ? 'on' : ''}"><span class="lk-cal2">⟳</span><b>Lamp checks</b><small>${lit ? P.lamp.checks.map(c => `${esc(who(LB.lampChecks.find(x => x.id === c.id).who))} ${dayLbl(c.day)}`).join(' · ') : 'Short questions from the town, spaced out so it sticks.'}</small></li></ul></section>
      </div>
      <div class="lw-cta"><button class="btn line" data-again>${lit ? 'Replay Hour Eight' : 'Try Hour Eight again'}</button><button class="btn dark" data-primary data-home>Back to Harrowby →</button></div></div>`);
    if (lit) { L.sfx('unlock'); L.announce(`${mod.lamp.label} lit: ${bandT}. The ${mod.lens.label} is unlocked.`); }
    const b = await L.pick(el, '[data-home],[data-again]');
    if (b.hasAttribute('data-again')) { P.variant = 'v2'; L.save(); return { goto: 'line' }; }
    L.sfx('tap');
  };
})();
