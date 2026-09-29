/* LINESIDE Learning World: TALK, the Brew (the discussion room).
 *
 * Jo chairs; Pat and Amira disagree on purpose; Tom grounds them; the learner settles it; Dev asks for the
 * teach-back. The engine decides every move (affirm, probe, counter, debate, scaffold, bring it back, teach-back);
 * the classmates only voice it. Free text is classified by the module's own cue rules plus LS.AI.classify, and the
 * tutor's line comes from LS.AI.say (scripted by default; an on-device model only rephrases it, and only if the
 * player opted in). Safety questions always get Hannah's authored line. Nothing waits on a model: every reply
 * arrives within the tutor's deadline, and the authored line is the fallback.
 */
window.LS = window.LS || {};
(function () {
  const L = LS.Learn, esc = L.esc;

  L.steps.brew = async function (mod, P) {
    const Tk = mod.talk, chair = Tk.chair, concept = Tk.ai && Tk.ai.concept;
    P.brew = { answers: [], teach: null, takeaway: null, mcSeen: [] };
    try { if (LS.AI && LS.AI.reset) LS.AI.reset(); } catch (e) { }
    const around = ['jo', 'pat', 'amira', 'tom'];
    const stage = L.stage(`<div class="lr">
      <div class="lr-head"><div><div class="eyebrow">The Brew · the kettle corner</div><h2>Settle it round the table</h2></div>
        <div class="lr-table" id="lrTable">${around.map(id => `<div class="lr-seat" data-seat="${id}"><div class="lw-face">${L.face(id, 'smile', mod)}</div><span>${esc(L.person(id, mod).name.split(' ')[0])}</span></div>`).join('')}<div class="lr-seat dev off" data-seat="dev"><div class="lw-face">${L.face('dev', 'smile', mod)}</div><span>Dev</span></div></div></div>
      <div class="lr-log" id="lrLog" role="log" aria-live="polite"></div>
      <div class="lr-compose" id="lrCompose"></div>
      <div class="lr-ai" id="lwAiStatus">${esc(L.aiLabel())}</div></div>`);
    stage.classList.add('fill');   // the transcript scrolls; the composer stays put underneath it
    const log = stage.querySelector('#lrLog'), comp = stage.querySelector('#lrCompose');
    const scroll = () => { requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; }); };
    const speaking = id => stage.querySelectorAll('[data-seat]').forEach(s => s.classList.toggle('talking', s.dataset.seat === id));
    // a persona line, with a short typing indicator first
    const line = async (who, text, o) => {
      o = o || {};
      speaking(who);
      const t = document.createElement('div'); t.className = 'lr-typing who-' + who; t.innerHTML = `<div class="lw-face">${L.face(who, 'neutral', mod)}</div><span><i></i><i></i><i></i></span>`;
      log.appendChild(t); scroll();
      await L.wait(L.instant() ? 0 : Math.min(900, 280 + text.length * 6));
      t.remove();
      const d = document.createElement('div'); d.innerHTML = L.lineHTML(who, text, { mood: o.mood || 'neutral', noRole: true, cls: 'lr-msg ' + (o.cls || '') }); const el = d.firstElementChild;
      if (o.tag) el.querySelector('.lw-nm').insertAdjacentHTML('beforeend', ` <em class="lr-tag ${o.tagCls || ''}">${esc(o.tag)}</em>`);
      log.appendChild(el); scroll(); L.announce(`${L.person(who, mod).name}: ${text}`);
      return el;
    };
    const mine = (text) => { const d = document.createElement('div'); d.className = 'lr-me'; d.innerHTML = `<div class="lr-mebub">${esc(text)}</div>`; log.appendChild(d); scroll(); };
    const aiSay = (who, ctx) => {
      const c = Object.assign({ concept: concept, playerName: (LS.game && LS.game.S && LS.game.S().name) || undefined }, ctx);
      try { return LS.AI ? LS.AI.say(LS.AI.personas[who] ? who : chair, c) : Promise.resolve(null); } catch (e) { return Promise.resolve(null); }
    };
    // the composer: chips (numbered) and a free-text box; resolves with {via, text, chip}
    const ask = (chips, o) => new Promise(res => {
      o = o || {};
      comp.innerHTML = `<div class="lr-chips">${chips.map((c, i) => `<button class="lr-chip" data-chip="${i}" data-n="${i + 1}"><span class="k">${i + 1}</span>${esc(c.t)}</button>`).join('')}</div>
        ${o.noText ? '' : `<div class="lr-free"><input id="lrText" class="field" autocomplete="off" maxlength="300" aria-label="Or answer in your own words" placeholder="${esc(o.placeholder || 'Or say it in your own words…')}"><button class="btn dark small" data-send>Send</button></div>`}`;
      comp.querySelectorAll('[data-chip]').forEach(b => b.onclick = () => { const c = chips[+b.dataset.chip]; comp.innerHTML = ''; L.sfx('select'); res({ via: 'chip', text: c.t, chip: c }); });
      const s = comp.querySelector('[data-send]'), inp = comp.querySelector('#lrText');
      if (s) s.onclick = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } comp.innerHTML = ''; L.sfx('select'); res({ via: 'text', text: v }); };
      if (inp && !('ontouchstart' in window)) setTimeout(() => { if (inp.isConnected) inp.focus({ preventScroll: true }); }, 50);
    });
    // Decide the move for an answer.
    const judge = (pr, ans) => {
      if (ans.via === 'chip') return { move: ans.chip.move, mc: /^M\d+$/.test(ans.chip.move) ? ans.chip.move : null, conf: 1 };
      const h = L.listen(mod, ans.text);
      if (h.safety) return { move: 'safety', h };
      const rel = h.mc.filter(m => pr.targets.includes(m)), any = h.mc[0];
      if (rel.length || any) return { move: rel[0] || any, mc: rel[0] || any, h, conf: h.confidence };
      const good = (pr.good || []).some(g => new RegExp(g, 'i').test(ans.text));
      if (good && (h.understood.length || ans.text.split(/\s+/).length >= 5)) return { move: 'correct', h, conf: Math.max(0.7, h.confidence) };
      if (good || h.understood.length) return { move: 'partial', h, conf: 0.6 };
      return { move: 'unclear', h, conf: h.confidence };
    };

    for (const [who, text] of Tk.intro) await line(who, text, { mood: 'smile' });
    for (const pr of Tk.prompts) {
      await line(pr.who, pr.text, { mood: 'neutral', cls: 'ask' });
      if (pr.debate) await line(pr.debate.who, pr.debate.say + ' Who’s right?', { mood: 'smile', tag: 'disagrees', tagCls: 'warm' });
      const rec = { id: pr.id, tries: [] };
      let settled = false, rounds = 0, counterDone = false;
      while (!settled && rounds < 3) {
        rounds++;
        const ans = await ask(pr.chips);
        mine(ans.text);
        const j = judge(pr, ans);
        rec.tries.push({ via: ans.via, text: ans.text, move: j.move, mc: j.mc || null });
        // the tutor listens to free text (and voices the move); authored lines are always the fallback
        const tutor = await aiSay(chair, { answer: ans.text, mode: 'react' });
        if (j.move === 'safety') {
          await line('hannah', (tutor && tutor.intent === 'safety' && tutor.text) || mod.do.coach.safety.say, { mood: 'neutral', tag: 'safety: always Hannah', tagCls: 'safe' });
          await line(chair, 'Back to the plan, then. ' + pr.text, { cls: 'ask' });
          continue;
        }
        if (j.move === 'correct') {
          if (counterDone) { P.brew.mcSeen.forEach(m => L.flag(P, m, -1)); await line(chair, (tutor && tutor.intent === 'praise' && /shift|better|got there/i.test(tutor.text) ? tutor.text.split(/[.!]\s/)[0].replace(/[.!]?$/, '. ') : 'That’s a shift from earlier. Nice. ') + 'Keep hold of that.', { mood: 'smile' }); }
          await line(pr.affirm.who, pr.affirm.say, { mood: 'smile', tag: 'affirm and extend' });
          settled = true; break;
        }
        if (/^M\d+$/.test(j.move)) {
          const m = L.mcById(mod, j.move);
          L.flag(P, j.move, +1); if (!P.brew.mcSeen.includes(j.move)) P.brew.mcSeen.push(j.move);
          rec.mc = j.move;
          // counter-example from the matching classmate, then a Socratic probe from the tutor, then ask again
          await line(m.counter.who, m.counter.say, { mood: 'neutral', tag: 'misconception: ' + m.short, tagCls: 'mc' });
          const probe = tutor && tutor.intent === 'probe' ? tutor.text : (pr.probe && pr.probe.say);
          if (probe) await line(tutor && tutor.intent === 'probe' ? chair : pr.probe.who, probe, { cls: 'ask' });
          counterDone = true;
          if (rounds >= 2) { await line(chair, 'Let’s settle it: ' + pr.chips.find(c => c.move === 'correct').t, { mood: 'smile' }); settled = true; }
          continue;
        }
        if (j.move === 'partial') {
          await line(pr.probe.who, (tutor && (tutor.intent === 'partial' || tutor.intent === 'socratic') && rounds === 1 ? tutor.text.replace(/\?[^?]*$/, '?') + ' ' : '') + pr.probe.say, { cls: 'ask', tag: 'probe' });
          if (rounds >= 2) { await line(pr.affirm.who, pr.affirm.say, { mood: 'smile' }); settled = true; }
          continue;
        }
        // unclear: redirect, scaffold, or ask a clarifying question rather than guess (confidence gate)
        if (tutor && tutor.intent === 'redirect') { await line(Tk.redirect.who, Tk.redirect.say, { mood: 'smile', tag: 'bring it back' }); await line(pr.who, pr.text, { cls: 'ask' }); continue; }
        if (tutor && tutor.intent === 'clarify') { await line(chair, tutor.text, { tag: 'scaffold' }); }
        const two = [pr.chips.find(c => c.move === 'correct'), pr.chips.find(c => /^M/.test(c.move))].filter(Boolean);
        await line(chair, `I want to be sure I’ve got you. Did you mean “${two[0].t}” or “${two[1] ? two[1].t : 'something else'}”?`, { cls: 'ask', tag: 'clarify' });
      }
      P.brew.answers.push(rec); L.save();
    }

    // ---------- teach-back to Dev ----------
    const TB = Tk.teachBack; stage.querySelector('[data-seat="dev"]').classList.remove('off');
    await line('jo', 'Here’s Dev. He’s seventeen and wants to study engineering. Over to you.', { mood: 'smile' });
    await line(TB.who, TB.text, { mood: 'smile', cls: 'ask', tag: 'teach-back' });
    let hit = [], text = '', tries = 0;
    const kp = TB.keyPoints;
    while (tries < 2) {
      tries++; comp.classList.add('tall');
      comp.innerHTML = `<div class="lr-tb"><label class="eyebrow" for="lrTB">Explain it to Dev</label><textarea id="lrTB" class="field" rows="3" maxlength="600" placeholder="Like he’s never seen a plan. Tap the lines below to borrow one, then edit.">${esc(text)}</textarea>
        <div class="lr-chips small">${TB.chips.map((c, i) => `<button class="lr-chip" data-tbc="${i}">＋ ${esc(c)}</button>`).join('')}</div>
        <div class="lw-cta"><button class="btn dark" data-tbsend data-primary>Tell Dev</button></div></div>`;
      const ta = comp.querySelector('#lrTB');
      comp.querySelectorAll('[data-tbc]').forEach(b => b.onclick = () => { ta.value = (ta.value.trim() + ' ' + TB.chips[+b.dataset.tbc]).trim(); b.disabled = true; L.sfx('tap'); });
      await new Promise(res => comp.querySelector('[data-tbsend]').onclick = () => { if (!ta.value.trim()) { ta.focus(); return; } res(); });
      text = ta.value.trim(); comp.innerHTML = ''; comp.classList.remove('tall'); mine(text);
      const h = L.listen(mod, text);
      hit = kp.filter(k => new RegExp(k.re, 'i').test(text)).map(k => k.id);
      if (h.understood.includes('critical_path') && !hit.includes('K4')) hit.push('K4');
      if (h.understood.includes('float') && !hit.includes('K5')) hit.push('K5');
      if (h.understood.includes('change') && !hit.includes('K7')) hit.push('K7');
      const miss = kp.filter(k => !hit.includes(k.id));
      const check = `<ul class="lr-kp">${kp.map(k => `<li class="${hit.includes(k.id) ? 'on' : ''}">${hit.includes(k.id) ? '✓' : '○'} ${esc(k.label)}</li>`).join('')}</ul>`;
      if (h.mc.length) { const m = L.mcById(mod, h.mc[0]); L.flag(P, m.id, +1); await line(m.counter.who, m.counter.say, { tag: 'misconception: ' + m.short, tagCls: 'mc' }); }
      if (miss.length === 0 || (hit.length >= 3 && tries === 1) || tries >= 2) {
        const el = await line('dev', hit.length >= 3 ? 'Oh, that makes sense. So it’s not the biggest job, it’s the longest chain, and it can move. I’m writing that down.' : 'I think I get some of it. Jo, can I have the rest on a sticky note?', { mood: 'smile' });
        el.querySelector('.lw-tx').insertAdjacentHTML('afterend', check);
        break;
      }
      const el = await line('dev', `Okay, I’m with you on ${hit.length ? kp.filter(k => hit.includes(k.id)).map(k => k.label.toLowerCase()).join(' and ') : 'some of it'}. But ${miss[0].id === 'K5' ? 'what about the jobs that aren’t on it? Can they be late?' : miss[0].id === 'K7' ? 'does it stay the same forever?' : miss[0].id === 'K4' ? 'which chain actually decides when you finish?' : 'how do the jobs connect?'}`, { mood: 'neutral', cls: 'ask' });
      el.querySelector('.lw-tx').insertAdjacentHTML('afterend', check);
    }
    P.brew.teach = { text, hit, of: kp.length }; L.save();

    // ---------- the takeaway line ----------
    await line('jo', 'Last thing. One line for your Logbook: what will you take away? Pick one and make it yours.', { mood: 'smile' });
    comp.innerHTML = `<div class="lr-tb"><div class="lr-chips small">${Tk.takeaways.map((t, i) => `<button class="lr-chip" data-tk="${i}" data-n="${i + 1}"><span class="k">${i + 1}</span>${esc(t)}</button>`).join('')}</div>
      <label class="eyebrow" for="lrTk">Your takeaway</label><input id="lrTk" class="field" maxlength="160" value="${esc(Tk.takeaways[0])}"><div class="lw-cta"><button class="btn dark" data-primary data-tksave>Put it in the Logbook →</button></div></div>`;
    const tk = comp.querySelector('#lrTk');
    comp.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { tk.value = Tk.takeaways[+b.dataset.tk]; tk.focus(); });
    await L.go(comp, '[data-tksave]');
    P.brew.takeaway = P.takeaway = (tk.value.trim() || Tk.takeaways[0]).slice(0, 160);
    comp.innerHTML = '';
    L.save();
    await line('jo', 'Kettle’s cold, work’s waiting. Tom’s on nights at Crag Lane this weekend. You’re taking over from him at ten past six.', { mood: 'smile' });
    comp.innerHTML = `<div class="lw-cta"><button class="btn dark" data-primary data-out>Head out to the line →</button></div>`;
    await L.go(comp, '[data-out]');
  };
})();
