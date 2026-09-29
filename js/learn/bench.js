/* LINESIDE Learning World: TRY, the Bench (the explorable's challenges, then three puzzles).
 *
 * Every puzzle follows the same rules (docs/LEARNING_WORLD.md §3.4): rate your confidence before it's marked, two
 * tries, feedback after every answer that explains why and is worded for the specific mistake, hints free but
 * recorded. Templates: `network` (find the critical path), `sequence` (order the possession, with parallel steps)
 * and `what_if` (predict the finish after a change). The puzzle's own numbers are re-checked with the CPM.
 */
window.LS = window.LS || {};
(function () {
  const L = LS.Learn, esc = L.esc, num = L.num;

  function shell(mod, pz, k, n) {
    return `<div class="lp" data-puzzle="${esc(pz.id)}">
      <div class="lp-head"><div class="eyebrow">Puzzle ${k} of ${n} · ${esc(pz.lo)} · ${esc(pz.tag)}</div><h2>${esc(pz.title)}</h2><p class="lp-intro">${esc(pz.intro)}</p><p class="lp-ask"><b>${esc(pz.ask)}</b></p></div>
      <div class="lp-body"></div>
      <div class="lp-foot">${L.confHTML()}<div class="lp-btns"><button class="btn line small" data-hint>Hint</button><span class="lp-tries"></span><button class="btn dark" data-check data-primary disabled>Check</button></div></div>
      <div class="lp-fb" aria-live="polite"></div></div>`;
  }
  const fbHTML = (kind, who, text, extra) => `<div class="lw-fb ${kind}">${L.lineHTML(who || 'jo', text, { mood: kind === 'good' ? 'smile' : kind === 'bad' ? 'concern' : 'neutral', noRole: true })}${extra || ''}</div>`;

  // Shared flow: confidence → check → feedback → retry (two tries) → reveal → continue.
  async function run(mod, P, pz, k, n, T) {
    const el = L.stage(shell(mod, pz, k, n));
    const body = el.querySelector('.lp-body'), fb = el.querySelector('.lp-fb'), chk = el.querySelector('[data-check]');
    const rec = P.bench[pz.id] = Object.assign({ tries: 0, hints: 0 }, P.bench[pz.id] && P.bench[pz.id].retake ? {} : {});
    let hintI = 0, ready = false;
    const getConf = L.bindConf(el, () => upd());
    const upd = () => { chk.disabled = !(getConf() && ready); };
    const api = T.mount(body, () => { ready = T.complete(); upd(); });
    el.querySelector('[data-hint]').onclick = () => { const h = pz.hints[Math.min(hintI, pz.hints.length - 1)]; hintI++; rec.hints++; P.hints = (P.hints || 0) + 1; L.save(); fb.innerHTML = fbHTML('hint', 'jo', h); L.sfx('tap'); };
    const tries = () => { el.querySelector('.lp-tries').textContent = rec.tries ? `Try ${Math.min(2, rec.tries + 1)} of 2` : ''; };
    while (true) {
      await L.pick(el, '[data-check]');
      rec.tries++; const r = T.mark();
      const conf = getConf();
      if (rec.tries === 1) { rec.firstTry = !!r.correct; rec.conf = conf ? conf.id : null; L.recordConf(P, pz.id, conf, r.correct); }
      (r.flags || []).forEach(f => L.flag(P, f, +1));
      if (r.correct && rec.tries > 1) (P.benchMc || []).forEach(f => L.flag(P, f, -1));
      P.benchMc = r.flags || [];
      L.sfx(r.correct ? 'good' : 'bad');
      const who = r.who || 'jo';
      if (r.correct || rec.tries >= 2) {
        rec.correct = !!r.correct; L.save();
        const reveal = r.correct ? '' : `<p class="lp-answer"><b>The answer:</b> ${esc(T.answerText())}</p>`;
        fb.innerHTML = fbHTML(r.correct ? 'good' : 'bad', who, r.say, reveal + `<div class="lp-reveal"></div><div class="lw-cta"><button class="btn dark" data-next data-primary>${k < n ? 'Next puzzle →' : 'Finish the Bench →'}</button></div>`);
        T.reveal && T.reveal(fb.querySelector('.lp-reveal'));
        api.lock && api.lock(); chk.disabled = true; el.querySelector('[data-hint]').disabled = true; el.querySelectorAll('[data-conf]').forEach(b => b.disabled = true);
        fb.scrollIntoView({ block: 'nearest', behavior: L.reduced() ? 'auto' : 'smooth' });
        if (T.after) await T.after(fb, P);
        await L.go(fb, '[data-next]');
        return rec;
      }
      fb.innerHTML = fbHTML('bad', who, r.say, `<p class="lp-again">One more go. Change your answer and check again.</p>`);
      tries(); L.save();
    }
  }

  // ---------- network: find the critical path ----------
  function networkT(pz) {
    const acts = pz.data.acts, R = L.cpm(acts);
    let path = new Set(), finish = null, fl = null, lock = false;
    // lay the network out by depth (longest chain of predecessors)
    const depth = {}; R.order.forEach(id => { depth[id] = Math.max(0, ...R.acts[id].preds.map(p => depth[p] + 1)); });
    const cols = {}; R.order.forEach(id => (cols[depth[id]] = cols[depth[id]] || []).push(id));
    const maxD = Math.max(...Object.keys(cols).map(Number));
    const xy = {}; Object.entries(cols).forEach(([d, ids]) => ids.forEach((id, i) => { xy[id] = [8 + (84 * d / Math.max(1, maxD)), ids.length === 1 ? 50 : 22 + 56 * i / (ids.length - 1)]; }));
    const T = {
      mount(body, onUpd) {
        const draw = () => {
          body.innerHTML = `<div class="lp-net">
            <div class="lp-graph" role="group" aria-label="The drain job as a network: tap the jobs on the critical path">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${acts.map(a => a.preds.map(p => `<line x1="${xy[p][0]}" y1="${xy[p][1]}" x2="${xy[a.id][0]}" y2="${xy[a.id][1]}" class="${path.has(p) && path.has(a.id) ? 'on' : ''}"/>`).join('')).join('')}</svg>
              ${acts.map(a => `<button class="lp-node ${path.has(a.id) ? 'on' : ''}" data-node="${a.id}" style="left:${xy[a.id][0]}%;top:${xy[a.id][1]}%" aria-pressed="${path.has(a.id)}" aria-label="${esc(a.id + ': ' + a.t + ', ' + a.dur + ' days')}"><b>${esc(a.id)}</b><small>${a.dur}d</small></button>`).join('')}
            </div>
            <table class="lp-tab"><thead><tr><th>Code</th><th>Activity</th><th>Days</th><th>Waits for</th></tr></thead><tbody>${acts.map(a => `<tr class="${path.has(a.id) ? 'on' : ''}" data-row="${a.id}"><td><b>${esc(a.id)}</b></td><td>${esc(a.t)}</td><td>${a.dur}</td><td>${a.preds.length ? esc(a.preds.join(' and ')) : '—'}</td></tr>`).join('')}</tbody></table>
            <div class="lp-pickrow"><div><div class="eyebrow">Finish at the end of day…</div><div class="lw-seg">${pz.data.finishOptions.map(v => `<button data-fin="${v}" class="${finish === v ? 'on' : ''}" aria-pressed="${finish === v}">${v}</button>`).join('')}</div></div>
              <div><div class="eyebrow">Float on B (days)</div><div class="lw-seg">${pz.data.floatOptions.map(v => `<button data-fl="${v}" class="${fl === v ? 'on' : ''}" aria-pressed="${fl === v}">${v}</button>`).join('')}</div></div></div></div>`;
          body.querySelectorAll('[data-node],[data-row]').forEach(b => b.onclick = () => { if (lock) return; const id = b.dataset.node || b.dataset.row; path.has(id) ? path.delete(id) : path.add(id); L.sfx('tap'); draw(); onUpd(); });
          body.querySelectorAll('[data-fin]').forEach(b => b.onclick = () => { if (lock) return; finish = +b.dataset.fin; L.sfx('tap'); draw(); onUpd(); });
          body.querySelectorAll('[data-fl]').forEach(b => b.onclick = () => { if (lock) return; fl = +b.dataset.fl; L.sfx('tap'); draw(); onUpd(); });
        };
        draw();
        return { lock() { lock = true; body.classList.add('locked'); } };
      },
      complete: () => path.size > 0 && finish != null && fl != null,
      mark() {
        const A = pz.answer, want = new Set(A.path), same = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
        const pathOk = same(path, want), finOk = finish === A.finish, flOk = fl === A.float.B;
        const F = w => pz.feedback.find(f => f.when === w);
        if (pathOk && finOk && flOk) return { correct: true, say: F('correct').say };
        if (same(path, new Set(['A', 'B', 'E', 'F'])) || (path.has('B') && !path.has('C'))) return { say: F('M1').say, flags: ['M1'], who: 'jo' };
        if (finish === 19) return { say: F('M5').say, flags: ['M5'] };
        if (pathOk && finOk) return { say: F('float').say };
        if (pathOk) return { say: F('finish').say };
        return { say: F('path').say };
      },
      answerText: () => `${pz.answer.path.join(' → ')}, finishing at the end of day ${pz.answer.finish}. B has ${pz.answer.float.B} days of float.`,
      reveal(host) { const t = L.Table(host, { acts: acts.map(a => Object.assign({ code: a.id }, a)), unit: 'd', unitLong: 'days', max: 16 }, { readOnly: true, showFloat: true, compact: true }); }
    };
    return T;
  }

  // ---------- sequence: order the possession (parallel steps allowed) ----------
  function sequenceT(pz) {
    const acts = pz.data.acts, by = Object.fromEntries(acts.map(a => [a.id, a]));
    const seed = [5, 2, 8, 0, 6, 3, 7, 1, 4]; let tray = seed.map(i => acts[i] && acts[i].id).filter(Boolean);
    let steps = [], hb = null, lock = false, mine = null;
    const finishOf = st => st.reduce((t, s) => t + Math.max(...s.map(id => by[id].dur)), 0);
    const valid = st => { const at = {}; st.forEach((s, i) => s.forEach(id => at[id] = i)); return acts.every(a => at[a.id] != null && a.preds.every(p => at[p] < at[a.id])); };
    const T = {
      mount(body, onUpd) {
        const draw = () => {
          body.innerHTML = `<div class="lp-seq">
            <div class="lp-tray" aria-label="Cards to place">${tray.map(id => { const a = by[id]; return `<div class="lp-card"><div><b><span class="lp-num">${esc(a.id)}</span> ${esc(a.t)}</b><small>${a.dur} h${a.clue ? ' · ' + esc(a.clue) : ''}</small></div><div class="lp-cardbtns"><button class="btn dark small" data-next="${a.id}">Next step</button>${steps.length ? `<button class="btn line small" data-along="${a.id}">Alongside step ${steps.length}</button>` : ''}</div></div>`; }).join('') || '<div class="lp-traydone">All nine cards are on the table.</div>'}</div>
            <ol class="lp-steps">${steps.map((s, i) => `<li><span class="lp-sn">${i + 1}</span><div class="lp-sc">${s.map(id => `<button class="lp-chip" data-back="${id}" aria-label="Take back ${esc(by[id].t)}"><span class="lp-num">${esc(id)}</span> ${esc(by[id].t)} <small>${by[id].dur} h</small></button>`).join('<span class="lp-par">alongside</span>')}</div><span class="lp-sh">${Math.max(...s.map(id => by[id].dur))} h</span></li>`).join('') || '<li class="empty">Your plan goes here. Tap “Next step” on a card to start.</li>'}</ol>
            ${steps.length ? `<p class="lp-total">Your plan adds up to <b>${finishOf(steps)} hours</b>.</p>` : ''}
            <div class="lp-pickrow"><div><div class="eyebrow">Ready to hand back at…</div><div class="lw-seg wrap">${pz.data.handbackOptions.map(o => `<button data-hb="${o.h}" class="${hb === o.h ? 'on' : ''}" aria-pressed="${hb === o.h}">${esc(o.t)}</button>`).join('')}</div></div></div></div>`;
          body.querySelectorAll('[data-next]').forEach(b => b.onclick = () => { if (lock) return; const id = b.dataset.next; tray = tray.filter(x => x !== id); steps.push([id]); L.sfx('place'); draw(); onUpd(); });
          body.querySelectorAll('[data-along]').forEach(b => b.onclick = () => { if (lock) return; const id = b.dataset.along; tray = tray.filter(x => x !== id); steps[steps.length - 1].push(id); L.sfx('place'); draw(); onUpd(); });
          body.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { if (lock) return; const id = b.dataset.back; steps = steps.map(s => s.filter(x => x !== id)).filter(s => s.length); tray.push(id); L.sfx('tap'); draw(); onUpd(); });
          body.querySelectorAll('[data-hb]').forEach(b => b.onclick = () => { if (lock) return; hb = +b.dataset.hb; L.sfx('tap'); draw(); onUpd(); });
        };
        draw();
        return { lock() { lock = true; body.classList.add('locked'); } };
      },
      complete: () => !tray.length && hb != null,
      mark() {
        const F = w => pz.feedback.find(f => f.when === w), ok = valid(steps), par = steps.some(s => s.includes('6') && s.includes('7'));
        mine = steps.map(s => s.slice());
        if (!ok) return { say: F('order').say };
        if (!par) return { say: F('series').say + (hb === finishOf(steps) ? ` Your sums are right for that order: ${finishOf(steps)} hours.` : '') };
        if (hb !== pz.answer.handback) return { say: F('handback').say };
        return { correct: true, say: F('correct').say };
      },
      answerText: () => `1 → 2 → 3 → 4 → 5 → (6 alongside 7) → 8 → 9: 48 hours, ready at 22:00 Sunday with 8 hours of margin.`,
      reveal(host) {
        const acts2 = acts.map(a => Object.assign({ code: a.id }, a));
        L.Table(host, { acts: acts2, unit: 'h', unitLong: 'hours', wall: pz.wall, wallLabel: pz.wallLabel, clock: { startHour: pz.start.hour, startDay: pz.start.day }, max: 56 }, { readOnly: true, showFloat: true, compact: true });
      },
      // the follow-up: a tamper fault
      async after(fb, P) {
        const F = pz.followUp, cta = fb.querySelector('.lw-cta'); cta.style.display = 'none';
        const box = document.createElement('div'); box.className = 'lp-follow';
        box.innerHTML = `<div class="eyebrow">Follow-up · the tamper</div><p class="lp-ask"><b>${esc(F.ask)}</b></p>${L.confHTML('How sure are you?')}<div class="lw-opts">${F.options.map((o, i) => `<button class="lw-opt" data-fo="${o.id}" data-n="${i + 1}" disabled><b>${esc(o.t)}</b></button>`).join('')}</div><div class="lp-ffb"></div>`;
        cta.parentNode.insertBefore(box, cta);
        const gc = L.bindConf(box, () => box.querySelectorAll('[data-fo]').forEach(b => b.disabled = false));
        const b = await L.pick(box, '[data-fo]'); const o = F.options.find(x => x.id === b.dataset.fo);
        box.querySelectorAll('[data-fo]').forEach(x => { x.disabled = true; x.classList.toggle('on', x === b); });
        L.recordConf(P, pz.id + 'b', gc(), !!o.correct);
        if (o.mc) L.flag(P, o.mc, +1);
        P.bench[pz.id].follow = { pick: o.id, correct: !!o.correct }; L.save();
        L.sfx(o.correct ? 'good' : 'bad');
        box.querySelector('.lp-ffb').innerHTML = fbHTML(o.correct ? 'good' : 'bad', o.mc === 'M6' ? 'tom' : 'jo', F.feedback[o.id]);
        if (!o.correct) box.querySelector('.lp-ffb').insertAdjacentHTML('beforeend', `<p class="lp-answer"><b>The answer:</b> ${esc(F.options.find(x => x.correct).t)}.</p>`);
        cta.style.display = '';
      }
    };
    return T;
  }

  // ---------- what_if: predict the finish ----------
  async function whatIf(mod, P, pz, k, n, o) {
    o = o || {};
    const base = mod.try.find(x => x.id === pz.base).data.acts;
    const el = L.stage(`<div class="lp" data-puzzle="${esc(pz.id)}"><div class="lp-head"><div class="eyebrow">${o.testOut ? 'Test-out' : `Puzzle ${k} of ${n}`} · ${esc(pz.lo)} · ${esc(pz.tag)}</div><h2>${esc(pz.title)}</h2><p class="lp-intro">${esc(pz.intro)}</p></div>
      <div class="lp-wbase"></div>
      <div class="lp-foot">${L.confHTML('Before you start: how sure are you of getting at least three of four?')}</div>
      <div class="lp-qs"></div></div>`);
    L.Table(el.querySelector('.lp-wbase'), { acts: base.map(a => Object.assign({ code: a.id }, a)), unit: 'd', unitLong: 'days', max: 16 }, { readOnly: true, compact: true });
    const gc = L.bindConf(el, () => { qs.classList.remove('wait'); });
    const qs = el.querySelector('.lp-qs'); qs.classList.add('wait');
    const res = { answers: {}, score: 0 };
    for (const q of pz.questions) {
      const box = document.createElement('div'); box.className = 'lp-wq'; box.dataset.q = q.id;
      box.innerHTML = `<div class="lp-wqh"><span class="lp-wql">${q.id}</span><b>${esc(q.change)}</b></div><div class="lw-seg">${q.options.map((v, i) => `<button data-wo="${v}" data-n="${i + 1}">Day ${v}</button>`).join('')}</div><div class="lp-wfb"></div>`;
      qs.appendChild(box);
      if (!gc()) await new Promise(r => { const iv = setInterval(() => { if (gc()) { clearInterval(iv); r(); } }, 60); });
      box.scrollIntoView({ block: 'nearest', behavior: L.reduced() ? 'auto' : 'smooth' });
      const b = await L.pick(box, '[data-wo]'), v = +b.dataset.wo, ok = v === q.answer;
      box.querySelectorAll('[data-wo]').forEach(x => { x.disabled = true; x.classList.toggle('on', x === b); x.classList.toggle('right', +x.dataset.wo === q.answer); });
      res.answers[q.id] = v; if (ok) res.score++;
      const mc = !ok && q.mc && q.mc[v]; if (mc) L.flag(P, mc, +1);
      L.sfx(ok ? 'good' : 'bad');
      const changed = base.map(a => Object.assign({ code: a.id }, a, q.set[a.id] != null ? { dur: q.set[a.id] } : {}));
      const r = L.cpm(changed);
      box.querySelector('.lp-wfb').innerHTML = fbHTML(ok ? 'good' : 'bad', q.id === 'd' ? 'tom' : 'jo', (ok ? '' : `It’s day ${q.answer}. `) + q.say) + `<div class="lp-wchart"></div>`;
      L.Table(box.querySelector('.lp-wchart'), { acts: changed, unit: 'd', unitLong: 'days', max: 16 }, { readOnly: true, compact: true, highlight: Object.keys(q.set) });
      if (r.finish !== q.answer) console.warn('[Learn] what-if ' + q.id + ' computes ' + r.finish + ' but the data says ' + q.answer);
    }
    const conf = gc(), passed = res.score >= pz.pass;
    L.recordConf(P, pz.id, conf, res.score === pz.questions.length);
    P.bench[pz.id] = Object.assign(P.bench[pz.id] || {}, { score: res.score, of: pz.questions.length, passed, firstTry: P.bench[pz.id] ? P.bench[pz.id].firstTry ?? passed : passed, answers: res.answers, conf: conf && conf.id });
    L.save();
    const end = document.createElement('div'); end.className = 'lp-wend';
    end.innerHTML = `<div class="lp-score ${passed ? 'good' : 'bad'}"><b>${res.score} of ${pz.questions.length}</b><span>${res.score === pz.questions.length ? 'Full marks' : passed ? 'Passed' : 'Not yet: three is a pass'}</span></div>${o.testOut ? `<p>${passed ? 'You’ve tested out of the Bench. Straight to the Brew.' : 'Not this time. Let’s do the Bench properly: the other two puzzles, then this one again.'}</p>` : ''}<div class="lw-cta"><button class="btn dark" data-primary data-next>${o.testOut ? (passed ? 'To the Brew →' : 'To Puzzle 1 →') : 'Finish the Bench →'}</button></div>`;
    qs.appendChild(end); end.scrollIntoView({ block: 'nearest' });
    await L.go(end, '[data-next]');
    return res;
  }

  // Explorable, then (for "have a go first") Puzzle 1.
  L.benchIntro = async function (mod, P, o) {
    P.bench = P.bench || {};
    if (!P.explorableDone) { await L.explorable(mod, P); P.explorableDone = true; L.save(); }
    if (o && o.tryFirst && !P.bench.p1done) { await run(mod, P, mod.try[0], 1, 3, networkT(mod.try[0])); P.bench.p1done = true; L.save(); }
  };

  L.steps.bench = async function (mod, P) {
    P.bench = P.bench || {};
    await L.benchIntro(mod, P);
    const pz = mod.try, n = pz.length;
    // professional test-out: pass Puzzle 3 first time and go straight to the Brew
    if (P.level === 'pro' && !P.bench.testOutTried) {
      const el = L.stage(`<div class="lw-between"><div class="eyebrow">You do this for a living</div><h2>Test out?</h2><p>Try Puzzle 3 first. Pass it first time and you go straight to the Brew.</p><div class="lw-cta"><button class="btn line" data-no>No, do the Bench</button><button class="btn dark" data-primary data-yes>Test out →</button></div></div>`);
      const b = await L.pick(el, '[data-yes],[data-no]'); P.bench.testOutTried = true; L.save();
      if (b.hasAttribute('data-yes')) {
        const r = await whatIf(mod, P, pz[2], 3, n, { testOut: true });
        if (r.score >= pz[2].pass) { P.testOut = true; P.bench.p3done = true; L.save(); return; }
      }
    }
    if (!P.bench.p1done) { await run(mod, P, pz[0], 1, n, networkT(pz[0])); P.bench.p1done = true; L.save(); }
    if (!P.bench.p2done) { await run(mod, P, pz[1], 2, n, sequenceT(pz[1])); P.bench.p2done = true; L.save(); }
    if (!P.bench.p3done) { await whatIf(mod, P, pz[2], 3, n); P.bench.p3done = true; L.save(); }
  };
})();
