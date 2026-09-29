/* LINESIDE Learning World: TALK, the Brew (the discussion room).
 *
 * Fully authored, so it's predictable and easy to sign off: a panel of three voices at different stages (a newcomer,
 * someone mid-career, and a veteran with the best judgement and the tricks of the trade). Each beat opens with two of
 * them disagreeing; you pick from two to four choices; every voice reacts to your choice in its own way. Pick a
 * misconception and the others counter it, then you get another go. Beats branch on how you did at the Bench, so the
 * room remembers you. It ends with a teach-back to the newcomer (pick what you'd tell him) and your takeaway line.
 */
window.LS = window.LS || {};
(function () {
  const L = LS.Learn, esc = L.esc;

  L.steps.brew = async function (mod, P) {
    const Tk = mod.talk, host = Tk.host, panel = Tk.panel;
    P.brew = { answers: [], teach: null, takeaway: null, mcSeen: [] };
    const seats = [host].concat(panel.map(p => p.id));
    const stage = L.stage(`<div class="lr">
      <div class="lr-head"><div><div class="eyebrow">The Brew · the kettle corner</div><h2>Settle it round the table</h2></div>
        <div class="lr-table" id="lrTable">${seats.map(id => { const p = panel.find(x => x.id === id); return `<div class="lr-seat" data-seat="${id}"><div class="lw-face">${L.face(id, 'smile', mod)}</div><span>${esc(L.person(id, mod).name.split(' ')[0])}</span><em>${esc(p ? p.label : 'Host')}</em></div>`; }).join('')}</div></div>
      <div class="lr-log" id="lrLog" role="log" aria-live="polite"></div>
      <div class="lr-compose" id="lrCompose"></div></div>`);
    stage.classList.add('fill');   // the transcript scrolls; the choices stay put underneath it
    const log = stage.querySelector('#lrLog'), comp = stage.querySelector('#lrCompose');
    const scroll = () => { requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; }); };
    const speaking = id => stage.querySelectorAll('[data-seat]').forEach(s => s.classList.toggle('talking', s.dataset.seat === id));
    const levelOf = id => (panel.find(p => p.id === id) || {}).level;
    // a line from one of the voices, with a short "typing" pause first (none with instant text or reduced motion)
    const line = async (who, text, o) => {
      o = o || {};
      speaking(who);
      const t = document.createElement('div'); t.className = 'lr-typing who-' + who; t.innerHTML = `<div class="lw-face">${L.face(who, 'neutral', mod)}</div><span><i></i><i></i><i></i></span>`;
      log.appendChild(t); scroll();
      await L.wait(L.instant() ? 0 : Math.min(900, 260 + text.length * 5));
      t.remove();
      const d = document.createElement('div'); d.innerHTML = L.lineHTML(who, text, { mood: o.mood || 'neutral', noRole: true, cls: `lr-msg lv-${levelOf(who) || 'host'} ${o.cls || ''}` }); const el = d.firstElementChild;
      if (o.tag) el.querySelector('.lw-nm').insertAdjacentHTML('beforeend', ` <em class="lr-tag ${o.tagCls || ''}">${esc(o.tag)}</em>`);
      log.appendChild(el); scroll(); L.announce(`${L.person(who, mod).name}: ${text}`);
      return el;
    };
    const mine = text => { const d = document.createElement('div'); d.className = 'lr-me'; d.innerHTML = `<div class="lr-mebub">${esc(text)}</div>`; log.appendChild(d); scroll(); };
    const divider = t => { const d = document.createElement('div'); d.className = 'lr-beat'; d.innerHTML = `<span>${esc(t)}</span>`; log.appendChild(d); scroll(); };
    // numbered choices (keys 1–4); resolves with the chosen one
    const choose = (list, lead) => new Promise(res => {
      comp.innerHTML = `${lead ? `<div class="lr-lead">${esc(lead)}</div>` : ''}<div class="lr-chips">${list.map((c, i) => `<button class="lr-chip" data-chip="${i}" data-n="${i + 1}"><span class="k">${i + 1}</span>${esc(c.t)}</button>`).join('')}</div>`;
      comp.querySelectorAll('[data-chip]').forEach(b => b.onclick = () => { const c = list[+b.dataset.chip]; comp.innerHTML = ''; L.sfx('select'); res(c); });
    });
    // what the Bench tells us about this learner
    const B = P.bench || {}, benchFlags = {
      p1: B.p1 ? (B.p1.firstTry ? 'p1Right' : 'p1Wrong') : null,
      p3d: B.p3 && B.p3.answers && B.p3.answers.d != null && B.p3.answers.d !== 12 ? 'p3Wrong' : null,
      p2b: B.p2 && B.p2.follow && !B.p2.follow.correct ? 'tamperWrong' : null
    };

    for (const [who, text] of Tk.intro) await line(who, text, { mood: 'smile' });
    for (const bt of Tk.beats) {
      divider(bt.title);
      for (const k of Object.keys(bt.bench || {})) { const key = benchFlags[k]; if (key && bt.bench[k].includes(key) && Tk.benchLines[key]) { const [w, t] = Tk.benchLines[key]; await line(w, t, { mood: 'smile', tag: 'remembers the Bench', tagCls: 'warm' }); } }
      for (const [who, text] of bt.setup) await line(who, text, { cls: 'ask' });
      await line(host, bt.ask, { cls: 'ask', mood: 'smile' });
      const rec = { id: bt.id, picks: [] };
      let left = bt.choices.slice(), wasWrong = false;
      while (left.length) {
        const c = await choose(left, 'Your call:');
        mine(c.t); rec.picks.push({ t: c.t, kind: c.kind, mc: c.mc || null });
        for (const [who, text] of c.react) {
          const vet = levelOf(who) === 'veteran', tag = vet && c.kind === 'best' ? 'trick of the trade' : c.mc && levelOf(who) === 'mid' ? 'misconception: ' + ((L.mcById(mod, c.mc) || {}).short || '') : null;
          await line(who, text, { mood: c.kind === 'best' || levelOf(who) === 'newcomer' ? 'smile' : 'neutral', cls: vet ? 'vet' : '', tag, tagCls: vet && c.kind === 'best' ? 'vet' : 'mc' });
        }
        if (c.kind === 'best') {
          if (wasWrong) { P.brew.mcSeen.filter(m => rec.picks.some(p => p.mc === m)).forEach(m => L.flag(P, m, -1)); await line(host, 'That’s a shift from where you started. Nice. Keep hold of that one.', { mood: 'smile' }); }
          break;
        }
        if (c.mc) { L.flag(P, c.mc, +1); if (!P.brew.mcSeen.includes(c.mc)) P.brew.mcSeen.push(c.mc); }
        wasWrong = wasWrong || !!c.mc;
        left = left.filter(x => x !== c);
        await line(host, left.length === 1 ? 'Want another go? There’s one answer left, and I think you know which.' : c.mc ? 'Hear them out, then have another go.' : 'Fair. Have another go if you like.', { cls: 'ask' });
      }
      rec.first = rec.picks[0] && rec.picks[0].kind;
      P.brew.answers.push(rec); L.save();
    }

    // ---------- teach-back to the newcomer: pick what you'd tell him ----------
    const TB = Tk.teachBack, tbName = L.person(TB.who, mod).name.split(' ')[0];
    divider('Teach it back');
    await line(TB.who, TB.text, { mood: 'smile', cls: 'ask', tag: 'teach-back' });
    const picked = new Set();
    comp.classList.add('tall');
    comp.innerHTML = `<div class="lr-tb"><div class="lr-lead">Pick up to ${TB.pick} lines to tell ${esc(tbName)}:</div><div class="lr-cards">${TB.cards.map((c, i) => `<button class="lr-card" data-tbc="${c.id}" data-n="${i + 1}" aria-pressed="false"><span class="bx"></span><span>${esc(c.t)}</span></button>`).join('')}</div>
      <div class="lw-cta"><button class="btn dark" data-tbsend data-primary disabled>Tell ${esc(tbName)}</button></div></div>`;
    const send = comp.querySelector('[data-tbsend]');
    comp.querySelectorAll('[data-tbc]').forEach(b => b.onclick = () => {
      const id = b.dataset.tbc; if (picked.has(id)) picked.delete(id); else if (picked.size < TB.pick) picked.add(id);
      comp.querySelectorAll('[data-tbc]').forEach(x => { const on = picked.has(x.dataset.tbc); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      send.disabled = !picked.size; L.sfx('tap');
    });
    await L.pick(comp, '[data-tbsend]');
    const chosen = TB.cards.filter(c => picked.has(c.id));
    comp.innerHTML = ''; comp.classList.remove('tall');
    mine(chosen.map(c => c.t).join(' '));
    const keys = TB.cards.filter(c => c.key), hit = chosen.filter(c => c.key).map(c => c.id), wrong = chosen.filter(c => c.mc);
    for (const w of wrong) { L.flag(P, w.mc, +1); await line(w.fix[0], w.fix[1], { tag: 'misconception: ' + ((L.mcById(mod, w.mc) || {}).short || ''), tagCls: 'mc' }); }
    const all = hit.length === keys.length && !wrong.length;
    const el = await line(TB.who, (all ? TB.done.all : TB.done.some)[1], { mood: 'smile' });
    el.querySelector('.lw-tx').insertAdjacentHTML('afterend', `<ul class="lr-kp">${keys.map(k => `<li class="${hit.includes(k.id) ? 'on' : ''}">${hit.includes(k.id) ? '✓' : '○'} ${esc(k.label || k.t.split(/[:.]/)[0])}</li>`).join('')}</ul>`);
    await line(TB.pat[0], TB.pat[1], { cls: 'vet', tag: 'trick of the trade', tagCls: 'vet' });
    P.brew.teach = { hit, of: keys.length, wrong: wrong.map(w => w.mc) }; L.save();

    // ---------- the takeaway line ----------
    await line(host, 'Last thing. One line for your Logbook: what will you take away?', { mood: 'smile' });
    const tk = await choose(Tk.takeaways.map(t => ({ t })), 'Your takeaway:');
    P.brew.takeaway = P.takeaway = tk.t; mine(tk.t); L.save();
    await line(host, 'Kettle’s cold, work’s waiting. Tom’s on nights at Crag Lane this weekend, and you’re taking over from him at ten past six. Callum’s on his gang. Amira and Pat are on the end of a phone.', { mood: 'smile' });
    comp.innerHTML = `<div class="lw-cta"><button class="btn dark" data-primary data-out>Head out to the line →</button></div>`;
    await L.go(comp, '[data-out]');
  };
})();
