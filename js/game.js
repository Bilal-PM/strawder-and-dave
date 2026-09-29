/* LINESIDE — game engine.
 * Chapter 1 of "The Kestrel Vale Line" in an open world: walk the worn-out line, give Ruby a health check,
 * build a works plan in dependency order, run a community drop-in, make two Calls, and face the Funding Panel.
 *
 * Two kinds of score, deliberately separate:
 *   · The project dashboard in real units (float in weeks, contingency in £k, safety, evidence, team, town support %).
 *     Outcomes move it, and outcomes include luck.
 *   · Judgment Points (JP) and a career rank. They reward the quality of each decision (expert-graded) and,
 *     on the Calls, how well your confidence matched the quality of the call (calibration). Never luck.
 */
(function () {
  const PACK = LS.PACKS['kestrel-vale'], C1 = PACK.c1;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const ICON = {
    time: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15.5 6.5A4 4 0 0 0 8.5 9v3m0 0v5h8M6.5 12h6"/></svg>',
    safety: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/></svg>',
    evidence: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/></svg>',
    team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 1.8 6 5"/></svg>',
    town: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  const sgn = d => d > 0 ? '+' : '−';
  const METRICS = [
    { k: 'time', label: 'Float', long: 'Schedule float', color: '#7cc3e6', lo: -8, hi: 20, bar: 12, fmt: v => v + 'w', lfmt: v => `${v} week${Math.abs(v) === 1 ? '' : 's'}`, df: d => `${sgn(d)}${Math.abs(d)} wk float`,
      desc: 'Spare weeks before the opening date slips. Everyone wants to spend it. Guard it.' },
    { k: 'money', label: 'Contingency', long: 'Contingency', color: '#e9c46a', lo: 0, hi: 999, bar: 600, fmt: v => '£' + v + 'k', lfmt: v => `£${v}k`, df: d => `${sgn(d)}£${Math.abs(d)}k`,
      desc: 'Money held back for the risks you have found. The panel wants to see it justified.' },
    { k: 'safety', label: 'Safety', long: 'Safety culture', color: '#ef8a7a', lo: 0, hi: 100, bar: 100, fmt: v => v, lfmt: v => v + '/100', df: d => `${sgn(d)}${Math.abs(d)} Safety`,
      desc: 'How seriously the whole team takes safety, starting with you.' },
    { k: 'evidence', label: 'Evidence', long: 'Evidence', color: '#9fb6f5', lo: 0, hi: 100, bar: 100, fmt: v => v, lfmt: v => v + '/100', df: d => `${sgn(d)}${Math.abs(d)} Evidence`,
      desc: 'How much of your case is fact rather than hope.' },
    { k: 'team', label: 'Team', long: 'Team morale', color: '#9ad3a8', lo: 0, hi: 100, bar: 100, fmt: v => v, lfmt: v => v + '/100', df: d => `${sgn(d)}${Math.abs(d)} Team`,
      desc: 'Morale, and your team’s trust in you.' },
    { k: 'town', label: 'Town', long: 'Town support', color: '#f2a7c3', lo: 0, hi: 100, bar: 100, fmt: v => v + '%', lfmt: v => v + '%', df: d => `${sgn(d)}${Math.abs(d)}% Town`,
      desc: 'How much of Harrowby believes you. They have heard it all before.' }
  ];
  const MK = Object.fromEntries(METRICS.map(m => [m.k, m]));
  const GRADE = { best: 'Expert call', ok: 'Defensible', poor: 'Risky call' };
  const GSCORE = { best: 1, ok: 0.5, poor: 0 };
  const CONF = [{ v: 0.5, ic: '🪙', lb: 'Coin flip', pc: '50% sure' }, { v: 0.7, ic: '👍', lb: 'Fairly sure', pc: '70% sure' }, { v: 0.9, ic: '🎯', lb: 'Certain', pc: '90% sure' }];
  // Judgment Points per graded decision
  const JP = { event: { best: 40, ok: 20, poor: 0 }, talk: { best: 20, ok: 10, poor: 0 }, defect: { best: 30, ok: 15, poor: 0 }, dropin: { best: 30, ok: 10, poor: 0 }, planQ: { best: 25, ok: 12, poor: 0 }, panelQ: { best: 25, ok: 10, poor: 0 }, call: { best: 100, ok: 60, poor: 20 } };
  // Calibration bonus on the Calls: confidence that matches the quality of the call earns points; overconfidence costs.
  const CAL = { 0.9: { best: 20, ok: 0, poor: -20 }, 0.7: { best: 10, ok: 5, poor: -5 }, 0.5: { best: 0, ok: 5, poor: 10 } };
  const WEEKS = [1, 1, 2, 3, 3, 4, 5, 6, 6];
  const SCENES = { 1: ['dawn', 'clear'], 2: ['day', 'clear'], 3: ['day', 'clear'], 4: ['dusk', 'clear'], 5: ['overcast', 'rain'], 6: ['day', 'clear'] };
  const MONTH = { 1: 'March', 2: 'March', 3: 'March', 4: 'April', 5: 'April', 6: 'April' };

  // ---------- State ----------
  const START = { time: 6, money: 400, safety: 55, evidence: 20, team: 60, town: 34 };
  const fresh = () => ({
    v: 2, name: 'Sam', avatar: 0, ch: 0, week: 1, m: Object.assign({}, START),
    trust: Object.fromEntries(PACK.team.concat(['helen']).map(t => [t, 2])),
    jp: 0, jpLog: [], graded: [], judgment: [], ripples: [], trade: {}, talks: [],
    done: {}, flags: {}, defects: {}, hotspots: {}, plan: null, dropin: [], panel: null,
    chats: {}, notes: [], memo: false, events: [], seed: Math.floor(Math.random() * 1e9), ppe: false, ach: [], introDone: false, tutorial: 0, pos: null, started: Date.now()
  });
  let S = fresh();
  const SET = Object.assign({ sound: true, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, large: false, instant: false },
    (() => { try { return JSON.parse(localStorage.getItem('lineside_settings')) || {}; } catch (e) { return {}; } })());
  const saveSet = () => { try { localStorage.setItem('lineside_settings', JSON.stringify(SET)); } catch (e) { } applySet(); };
  function applySet() {
    document.body.classList.toggle('reduced', !!SET.reduced);
    document.body.classList.toggle('large-text', !!SET.large);
    if (world) world.reduced = !!SET.reduced;
    LS.audio.toggle(!!SET.sound);
  }
  // Achievements persist across playthroughs
  const ACHG = (() => { try { return JSON.parse(localStorage.getItem('lineside_ach')) || {}; } catch (e) { return {}; } })();
  const saveAch = () => { try { localStorage.setItem('lineside_ach', JSON.stringify(ACHG)); } catch (e) { } };

  const fill = t => String(t).replace(/\{name\}/g, esc(S.name));
  const cast = id => PACK.cast[id] || { name: '', role: '' };
  const first = id => cast(id).name.replace(/^Cllr /, '').split(' ')[0];
  // Portraits: generated images if provided (LS.PORTRAIT_IMG[id|'avatar0'..][mood] = data URI), else the vector portraits
  const face = (id, mood) => {
    const key = id === 'player' ? 'avatar' + S.avatar : id, P = LS.PORTRAIT_IMG && LS.PORTRAIT_IMG[key];
    if (P) { const src = P[mood || 'neutral'] || P.neutral; if (src) return `<img class="pimg" src="${src}" alt="">`; }
    return id === 'player' ? LS.portrait(PACK.avatars[S.avatar], mood) : LS.portrait(cast(id).look, mood);
  };

  // ---------- Input: one pending "advance" and one pending "choice" at a time ----------
  let onAdvance = null, onKey = null;
  document.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if ($('#board').classList.contains('on')) { if (e.key === 'Escape') closeBoard(); return; }
    if (/^[1-9]$/.test(e.key) && onKey) { const b = document.querySelector('[data-k="' + e.key + '"]'); if (b) { e.preventDefault(); b.click(); } return; }
    if ((e.key === 'Enter' || e.key === ' ') && onAdvance) { e.preventDefault(); onAdvance(); }
  });
  const live = t => { $('#live').textContent = t; };
  const modalCheck = () => document.body.classList.toggle('modal', ['panel', 'talk', 'board', 'report', 'chapter'].some(i => $('#' + i).classList.contains('on')));
  function layer(id, html) { if (id === 'panel' || id === 'report') hide('talk'); const el = $('#' + id); if (html !== undefined) el.innerHTML = html; el.classList.add('on'); modalCheck(); return el; }
  const hide = id => { const el = $('#' + id); if (el.classList.contains('on') && world) world.ignoreTapUntil = performance.now() + 300; el.classList.remove('on'); modalCheck(); };

  // ---------- Ranks, JP and achievements ----------
  function rankOf(jp) { const R = PACK.ranks; let i = 0; while (i + 1 < R.length && jp >= R[i + 1].jp) i++; return { i, name: R[i].name, at: R[i].jp, next: R[i + 1] || null }; }
  function gainJP(n, why) {
    if (!n) return;
    const before = rankOf(S.jp); S.jp = Math.max(0, S.jp + n); S.jpLog.push([why, n]);
    const el = $('#hudJQ'); hud();
    if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); const d = document.createElement('span'); d.className = 'delta'; d.textContent = (n > 0 ? '+' : '') + n + ' JP'; d.style.color = n > 0 ? '#ffe39a' : '#ffb0a6'; el.appendChild(d); setTimeout(() => d.remove(), 1700); }
    const after = rankOf(S.jp);
    if (after.i > before.i) setTimeout(() => { LS.audio.sfx('rankup'); showBadge('🎓', 'Promoted', after.name, `${S.jp} Judgment Points. Your calls are getting noticed.`); }, 600);
  }
  const achQ = []; let achBusy = false;
  function unlock(id) {
    if (S.ach.includes(id)) return; const a = PACK.achievements.find(a => a.id === id); if (!a) return;
    S.ach.push(id); ACHG[id] = ACHG[id] || Date.now(); saveAch(); save();
    showBadge(a.ic, 'Achievement unlocked', a.name, a.desc);
  }
  function showBadge(ic, eyebrow, name, desc) { achQ.push([ic, eyebrow, name, desc]); if (!achBusy) nextBadge(); }
  function nextBadge() {
    if (achQ.length && $('#panel').classList.contains('on') && !$('#report').classList.contains('on')) { achBusy = true; setTimeout(nextBadge, 600); return; }
    const n = achQ.shift(); if (!n) { achBusy = false; return; } achBusy = true;
    const el = $('#ach'); el.innerHTML = `<div class="ic">${n[0]}</div><div><div class="eb">🔓 ${esc(n[1])}</div><div class="nm">${esc(n[2])}</div><div class="ds">${esc(n[3])}</div></div>`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); LS.audio.sfx('unlock'); live(`${n[1]}: ${n[2]}. ${n[3]}`);
    setTimeout(() => { el.classList.remove('on'); setTimeout(nextBadge, 400); }, achQ.length ? 2400 : 3200);
  }

  // ---------- HUD ----------
  function hud(on) {
    const h = $('#hud');
    if (on === false) { h.classList.remove('on'); return; }
    h.classList.add('on');
    $('#hudCh').innerHTML = `<div class="eyebrow">Chapter 1 · Week ${S.week} of 6 · ${MONTH[S.week]}</div><div class="t">${esc(PACK.chapters[0].title)}</div>`;
    const mh = $('#hudMetrics');
    if (!mh.children.length) mh.innerHTML = METRICS.map(m => `<button class="metric" id="m_${m.k}" style="color:${m.color}" aria-label="${m.long}">${ICON[m.k]}<span class="lb">${m.label}</span><span class="v" style="color:var(--paper)"></span><span class="bar"><i style="background:${m.color}"></i></span></button>`).join('');
    S.mSeen = S.mSeen || {};
    METRICS.forEach(m => {
      const el = $('#m_' + m.k), v = S.m[m.k];
      el.querySelector('.v').textContent = m.fmt(v); el.querySelector('.bar i').style.width = clamp(100 * (v - Math.min(0, m.lo)) / m.bar, 0, 100) + '%';
      el.classList.toggle('low', m.k === 'time' ? v < 2 : m.k === 'money' ? v < 150 : v < 30);
      el.title = `${m.long}: ${m.lfmt(v)}. ${m.desc}`; el.setAttribute('aria-label', `${m.long} ${m.lfmt(v)}`);
      el.onclick = () => openBoard('project');
      el.classList.toggle('hidden', !S.mSeen[m.k] && !S.done.panel);
    });
    const r = rankOf(S.jp), jq = $('#hudJQ');
    jq.classList.add('on'); jq.innerHTML = `<b>⚖ ${S.jp}</b><span>JP · ${esc(r.name)}</span>`; jq.title = 'Judgment Points and career rank'; jq.onclick = () => openBoard('career');
  }
  function apply(e, trade) {
    if (!e) return;
    for (const [k, v] of Object.entries(e)) {
      const m = MK[k]; if (!m || !v) continue;
      S.m[k] = clamp(S.m[k] + v, m.lo, m.hi);
      S.mSeen = S.mSeen || {}; if (!S.mSeen[k]) { S.mSeen[k] = 1; setTimeout(() => tip('metric_' + k, `${m.long}: ${m.desc}`), 400); }
      if (trade) S.trade[k] = (S.trade[k] || 0) + v * (k === 'money' ? 0.1 : k === 'time' ? 3 : 1);
      const el = $('#m_' + k);
      if (el) {
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump', 'flash'); clearTimeout(el._ft); el._ft = setTimeout(() => el.classList.remove('flash'), 2400);
        const d = document.createElement('span'); d.className = 'delta'; d.textContent = (v > 0 ? '+' : '−') + (k === 'money' ? '£' + Math.abs(v) + 'k' : k === 'time' ? Math.abs(v) + 'w' : Math.abs(v) + (k === 'town' ? '%' : '')); d.style.color = v > 0 ? '#9ff0bf' : '#ffb0a6';
        el.appendChild(d); setTimeout(() => d.remove(), 1700);
      }
    }
    hud();
  }
  function chips(e, jp) {
    const p = Object.entries(e || {}).filter(([k, v]) => MK[k] && v).map(([k, v]) => `<span class="chip ${v > 0 ? 'pos' : 'neg'}">${MK[k].df(v)}</span>`);
    if (jp) p.unshift(`<span class="chip jp">+${jp} JP</span>`);
    return p.length ? p.join('') : '<span class="chip">No change on the dashboard</span>';
  }

  // ---------- Dialogue ----------
  function typewrite(el, text) {
    return new Promise(done => {
      if (SET.instant || SET.reduced) { el.textContent = text; done(); return; }
      let i = 0; el.textContent = '';
      const iv = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(iv); done(); } }, 16);
      el._finish = () => { clearInterval(iv); el.textContent = text; done(); };
    });
  }
  const whoHTML = (who, mood) => { const c = cast(who); return `<div class="who"><div class="face">${face(who, mood || 'neutral')}</div><div><div class="nm">${esc(c.name)}</div><div class="rl">${esc(c.role)}</div></div></div>`; };
  const nextHTML = `<div class="next"><span>Continue</span> <span class="kbd">↵</span><span class="arrow">▶</span></div>`;
  function waitAdvance(box, tx, typingRef) {
    return new Promise(res => { const go = () => { if (typingRef.on && tx._finish) { tx._finish(); return; } onAdvance = null; res(); }; onAdvance = go; box.addEventListener('click', go); });
  }
  // A line of dialogue. who: a cast id, 'note' (an info card) or 'narrator'. extra: HTML shown under the text.
  async function say(who, text, mood, title, extra) {
    text = fill(text); live((who === 'narrator' || who === 'note' ? '' : cast(who).name + ': ') + text);
    LS.audio.sfx('page');
    if (who === 'note') layer('talk', `<div class="dlg card note"><div class="eyebrow">${esc(title || '')}</div><div class="tx serif"></div>${extra || ''}${nextHTML}</div>`);
    else if (who === 'narrator') layer('talk', `<div class="narr" role="button" tabindex="0"><div class="tx"></div><div class="next"><span class="arrow">▼</span> Tap or press Enter</div></div>`);
    else layer('talk', `<div class="dlg card">${whoHTML(who, mood)}<div class="tx serif"></div>${extra || ''}${nextHTML}</div>`);
    const box = $('#talk').firstElementChild, tx = box.querySelector('.tx'), ref = { on: true };
    const p = typewrite(tx, text).then(() => { ref.on = false; });
    await waitAdvance(box, tx, ref); await p; LS.audio.sfx('tap');
  }
  // A question with options. Returns the index of the chosen option (in the original order).
  async function ask(who, text, options, o) {
    o = o || {};
    const order = o.shuffle ? shuffle(options.map((_, i) => i)) : options.map((_, i) => i);
    layer('talk', `<div class="dlg card ${o.cls || ''}">${o.eyebrow ? `<div class="eyebrow" style="margin-bottom:8px">${esc(o.eyebrow)}</div>` : ''}${who === 'note' ? '' : whoHTML(who, o.mood)}<div class="tx serif"></div><div class="choices" style="visibility:hidden"></div></div>`);
    const box = $('#talk .dlg'), tx = box.querySelector('.tx'), ch = box.querySelector('.choices');
    live((who === 'note' ? '' : cast(who).name + ': ') + fill(text));
    let done = false; const p = typewrite(tx, fill(text)).then(() => { done = true; });
    box.addEventListener('click', () => { if (!done && tx._finish) tx._finish(); }, { once: true });
    await p;
    ch.innerHTML = order.map((k, i) => `<button class="choice" data-k="${i + 1}" data-c="${k}"><span class="kbd">${i + 1}</span><span>${fill(options[k])}</span></button>`).join('');
    ch.style.visibility = 'visible'; ch.querySelector('button').focus({ preventScroll: true });
    const ci = await new Promise(res => { onKey = true; ch.querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); res(+b.dataset.c); }); });
    onKey = null; LS.audio.sfx('select');
    return ci;
  }
  function record(kind, id, title, grade, extra) { S.graded.push(Object.assign({ kind, id, title, grade }, extra || {})); }
  // Conversation with a choice, graded by an expert. Moves the dashboard, trust and JP.
  async function talk(t, id) {
    const ci = await ask(t.who, t.text, t.choices.map(c => c.t), { shuffle: true });
    const o = t.choices[ci], c = cast(t.who);
    apply(o.e, true);
    if (o.trust && S.trust[t.who] != null) S.trust[t.who] = clamp(S.trust[t.who] + o.trust, 0, 5);
    S.talks.push({ id, ci }); record('talk', id, `${first(t.who)}: first conversation`, o.grade);
    const jp = JP.talk[o.grade]; gainJP(jp, `${first(t.who)} · conversation`);
    const mood = o.trust > 0 ? 'smile' : o.trust < 0 ? 'concern' : 'neutral';
    const trustLine = o.trust > 0 ? `${first(t.who)} will remember that.` : o.trust < 0 ? `${first(t.who)} seems a little less sure of you.` : '';
    await say(t.who, o.reply, mood, null, `<div class="chips">${chips(o.e, jp)}</div>${trustLine ? `<div class="trustnote">${trustLine}</div>` : ''}`);
    hide('talk');
  }

  // ---------- Chapter card ----------
  async function chapterCard() {
    hide('talk'); LS.audio.sfx('chapter');
    const ch = PACK.chapters[0];
    layer('chapter', `<div><div class="n">Chapter One</div><div class="t">${esc(ch.title)}</div><div class="m">${esc(ch.phase)} · ${esc(ch.when)}</div><div class="rule"></div>${ch.objective ? `<p class="obj1">${esc(ch.objective)}</p>` : ''}<div class="go">Tap or press Enter to begin</div></div>`);
    live(`Chapter 1: ${ch.title}. ${ch.objective || ''}`);
    await new Promise(res => { function go() { onAdvance = null; res(); } setTimeout(() => { onAdvance = go; $('#chapter').onclick = go; }, 900); });
    hide('chapter');
  }
  function clickGo(el) {
    return new Promise(res => { const b = el.querySelector('[data-go]'); b.focus({ preventScroll: true }); const go = () => { onAdvance = null; LS.audio.sfx('tap'); hide(el.id); res(); }; b.onclick = go; onAdvance = go; });
  }

  // ---------- The Call ----------
  function head(call, tag) {
    const n = Object.keys(PACK.calls).indexOf(call.id) + 1;
    return `<div class="call-head"><span class="tag ${tag || ''}">The Call · ${n}/${Object.keys(PACK.calls).length}</span><span class="when">Chapter 1 · Week ${S.week}<br>Feasibility & funding</span></div>`;
  }
  async function doCall(id) {
    const call = Object.assign({ id }, PACK.calls[id]);
    hide('talk'); LS.audio.sfx('page');
    const order = shuffle(call.choices.map((_, k) => k));
    const from = call.from ? `<div class="from"><div class="mini">${face(call.from)}</div>Raised by ${esc(cast(call.from).name)}</div>` : '';
    const letters = 'ABCD';
    let ci;
    while (true) {
      const el = layer('panel', `<div class="center-wrap"><div class="card call" role="dialog" aria-labelledby="callT">${head(call)}<div class="call-body">
        ${from}<h2 id="callT">${esc(call.title)}</h2><p class="sit">${fill(call.text)}</p>
        <div class="kv"><div class="k"><h4>What you know</h4><ul>${call.known.map(k => `<li>${esc(k)}</li>`).join('')}</ul></div><div class="u"><h4>What you don't</h4><ul>${call.unknown.map(k => `<li>${esc(k)}</li>`).join('')}</ul></div></div>
        <div class="q">What's your call?</div>
        ${order.map((k, n) => `<button class="opt" data-k="${n + 1}" data-c="${k}"><span class="l">${letters[n]}</span><span><div class="t">${fill(call.choices[k].t)}</div><div class="d">${fill(call.choices[k].d || '')}</div></span></button>`).join('')}
      </div></div></div>`);
      el.querySelector('.call').scrollTop = 0;
      const t0 = performance.now();
      ci = await new Promise(res => { onKey = true; el.querySelectorAll('.opt').forEach(b => b.onclick = () => res(+b.dataset.c)); });
      call._secs = Math.round((performance.now() - t0) / 1000);
      LS.audio.sfx('select');
      const c = call.choices[ci], L = letters[order.indexOf(ci)];
      layer('panel', `<div class="center-wrap"><div class="card call">${head(call)}<div class="call-body">
        <h2>${esc(call.title)}</h2>
        <div class="opt picked"><span class="l">${L}</span><span><div class="t">${fill(c.t)}</div></span></div>
        <div class="q" style="margin-top:22px">How sure are you that's the right call?</div>
        <div class="conf">${CONF.map((x, n) => `<button data-k="${n + 1}" data-v="${n}"><span class="ic">${x.ic}</span><div class="lb">${x.lb}</div><div class="pc">${x.pc}</div></button>`).join('')}</div>
        <p class="hint">Good judgment isn't only picking well. It's knowing how sure to be. Confidence that matches the quality of your call earns bonus JP; being certain about a weak call costs you.</p>
        <div class="cta" style="justify-content:flex-start"><button class="btn line small" data-back>← Change my mind</button></div>
      </div></div></div>`);
      const r = await new Promise(res => { const el2 = $('#panel'); el2.querySelectorAll('.conf button').forEach(b => b.onclick = () => res(+b.dataset.v)); el2.querySelector('[data-back]').onclick = () => res(-1); });
      if (r < 0) continue;
      onKey = null;
      const pts = resolveCall(call, ci, CONF[r].v);
      await reveal(call, ci, CONF[r].v, pts);
      if (c.ach) unlock(c.ach);
      break;
    }
  }
  function resolveCall(call, ci, conf) {
    const c = call.choices[ci];
    apply(c.e, true);
    S.judgment.push({ id: call.id, title: call.title, ci, choice: c.t, grade: c.grade, conf, secs: call._secs || 0, principle: call.principle.name });
    record('call', call.id, call.title, c.grade, { conf });
    if (c.ripple) S.ripples.push({ title: c.ripple.title, text: c.ripple.text, later: c.ripple.later, from: call.title, choice: c.t });
    S.done[call.task] = true;
    const base = JP.call[c.grade], bonus = CAL[conf][c.grade];
    gainJP(base + bonus, `The Call · ${call.title}`);
    return { base, bonus };
  }
  function calibLine(conf, g) {
    if (conf >= 0.9) return g === 'best' ? ['🎯', `You were certain, and right. That's calibrated confidence.`]
      : g === 'ok' ? ['⚠️', `You were certain, but there was a stronger option. Certainty is a feeling, not evidence.`]
        : ['⚠️', `Overconfident. You were certain about a risky call. Before committing, ask: “What would have to be true for this to go wrong?”`];
    if (conf <= 0.5) return g === 'best' ? ['🪙', `You doubted yourself, but your instinct was sound. Trust it a little more.`]
      : g === 'poor' ? ['✓', `Good self-awareness: you sensed it was shaky. When unsure, look for the option that buys information or caps the downside.`]
        : ['✓', `Honest uncertainty on a genuinely hard call.`];
    return g === 'best' ? ['✓', `Fairly sure, and right. Well calibrated.`] : g === 'ok' ? ['✓', `Reasonable confidence for a defensible call.`] : ['⚠️', `You were fairly sure. Next time, look for what you might not be seeing.`];
  }
  async function reveal(call, ci, conf, pts) {
    const c = call.choices[ci], best = call.choices.find(x => x.grade === 'best');
    LS.audio.sfx('stamp'); setTimeout(() => LS.audio.sfx(c.grade === 'best' ? 'good' : c.grade === 'poor' ? 'bad' : 'tap'), 250);
    const [ic, cl] = calibLine(conf, c.grade);
    const el = layer('panel', `<div class="center-wrap"><div class="card call">${head(call, c.grade === 'best' ? 'teal' : c.grade === 'poor' ? 'rose' : 'gold')}<div class="call-body">
      <div class="verdict"><span class="stamp ${c.grade}">${GRADE[c.grade].toUpperCase()}</span><span class="your">You chose: <b>${fill(c.t)}</b></span></div>
      <div class="jpline"><span><b>+${pts.base}</b> JP decision</span><span class="${pts.bonus < 0 ? 'neg' : ''}"><b>${pts.bonus >= 0 ? '+' : '−'}${Math.abs(pts.bonus)}</b> JP calibration</span></div>
      <div class="chips">${chips(c.e)}</div>
      <div class="mentor"><div class="face">${face('moira', c.grade === 'best' ? 'smile' : c.grade === 'poor' ? 'concern' : 'neutral')}</div><div><div class="nm">Moira's take</div><div class="say">“${fill(c.why)}”</div>
        ${c.grade !== 'best' && best ? `<div class="alt">My call: <b>${fill(best.t)}</b> ${fill(best.why)}</div>` : ''}</div></div>
      <div class="principle"><div class="eyebrow">Principle</div><div class="pn">${esc(call.principle.name)}</div><div class="pt">${esc(call.principle.text)}</div></div>
      <div class="calib"><span>${ic}</span><span>${cl}</span></div>
      ${c.ripple ? `<div class="pending">⏳ This decision will echo in Chapter 2…</div>` : ''}
      <div class="cta"><button class="btn dark" data-go>Continue <span class="kbd" style="color:#fff">↵</span></button></div>
    </div></div></div>`);
    el.querySelector('.call').scrollTop = 0;
    live(`${GRADE[c.grade]}. ${c.why}`);
    await clickGo(el);
  }

  // ---------- Activity: the track walk (judge each defect) ----------
  async function defectCard(d) {
    const k = C1.defects.indexOf(d) + 1, order = shuffle(d.options.map((_, i) => i));
    const el = layer('panel', `<div class="center-wrap"><div class="card call defect"><div class="call-head"><span class="tag teal">Track walk · ${Object.keys(S.defects).length + 1} of 5</span><span class="when">The old trackbed<br>with Tom</span></div><div class="call-body">
      <div class="dhead"><span class="dicon">${d.icon}</span><h2>${esc(d.title)}</h2></div><p class="sit">${esc(d.see)}</p>
      <div class="q">How do you log it?</div>${order.map((i, n) => `<button class="opt" data-k="${n + 1}" data-c="${i}"><span class="l">${'ABC'[n]}</span><span><div class="t">${esc(d.options[i].t)}</div></span></button>`).join('')}
    </div></div></div>`);
    el.querySelector('.call').scrollTop = 0;
    const ci = await new Promise(res => { onKey = true; el.querySelectorAll('.opt').forEach(b => b.onclick = () => res(+b.dataset.c)); });
    onKey = null; LS.audio.sfx('select');
    const o = d.options[ci], jp = JP.defect[o.grade];
    S.defects[d.id] = o.grade; record('defect', d.id, d.title, o.grade); apply(o.e, true); gainJP(jp, `Track walk · ${d.title}`);
    LS.audio.sfx('stamp'); setTimeout(() => LS.audio.sfx(o.grade === 'best' ? 'good' : o.grade === 'poor' ? 'bad' : 'tap'), 250);
    const bestO = d.options.find(x => x.grade === 'best');
    const el2 = layer('panel', `<div class="center-wrap"><div class="card call defect"><div class="call-head"><span class="tag ${o.grade === 'best' ? 'teal' : o.grade === 'poor' ? 'rose' : 'gold'}">Logged · ${esc(d.title)}</span><span class="when">${Object.keys(S.defects).length} of 5 judged</span></div><div class="call-body">
      <div class="verdict"><span class="stamp ${o.grade}">${o.grade === 'best' ? 'SPOT ON' : o.grade === 'ok' ? 'PARTLY' : 'NOT QUITE'}</span><span class="your">You logged: <b>${esc(o.t)}</b></span></div>
      <div class="chips">${chips(o.e, jp)}</div>
      <div class="mentor"><div class="face">${face('tom', o.grade === 'best' ? 'smile' : o.grade === 'poor' ? 'concern' : 'neutral')}</div><div><div class="nm">Tom says</div><div class="say">“${esc(o.why)}”</div>${o.grade !== 'best' ? `<div class="alt">Tom would log: <b>${esc(bestO.t)}</b></div>` : ''}</div></div>
      <div class="cta"><button class="btn dark" data-go>Continue <span class="kbd" style="color:#fff">↵</span></button></div></div></div></div>`);
    el2.querySelector('.call').scrollTop = 0;
    await clickGo(el2);
    if (Object.keys(S.defects).length === C1.defects.length) {
      await say('tom', C1.walkDone, 'smile', null, `<div class="chips"><span class="chip pos">Defects list complete</span></div>`);
      S.done.walk = true;
      if (Object.values(S.defects).every(g => g === 'best')) unlock('eagle');
    }
  }

  // ---------- Activity: Ruby's health check ----------
  async function hotspot(h) {
    const firstTime = !S.hotspots[h.id];
    await say('gaz', h.text, 'smile', null, h.aside ? `<div class="trustnote"><i>${esc(h.aside)}</i></div>` : '');
    if (h.extra && !S.flags[h.id + 'Extra']) {
      const x = h.extra, pick = await ask('gaz', x.q, x.options);
      S.flags[h.id + 'Extra'] = true;
      if (h.id === 'cab') {
        if (pick === x.pick) { LS.audio.sfx(x.sfx); world.pop('shed', h.x, 150, x.after, 2); await wait(900); await say('narrator', x.after); await say('gaz', x.gaz, 'smile'); unlock(x.ach); }
        else await say('gaz', `Sensible. Boring, but sensible.`);
      } else {
        world.flags.pigeonGone = true; S.flags.pigeonGone = true;
        if (pick === x.pick) { LS.audio.sfx(x.sfx); await say('narrator', x.after); await say('gaz', x.gaz, 'smile'); unlock(x.ach); }
        else { LS.audio.sfx('coo'); await say('narrator', x.wrong); apply({ team: -1 }, false); }
      }
    }
    if (firstTime) {
      S.hotspots[h.id] = true; apply({ evidence: 3 }, true); gainJP(10, `Health check · ${h.title}`);
      toast(`Logged: ${h.title} · ${Object.keys(S.hotspots).length}/5`);
      if (Object.keys(S.hotspots).length === C1.hotspots.length) {
        await say('gaz', C1.healthDone, 'smile', null, `<div class="chips"><span class="chip pos">Health check complete</span></div>`);
        const HD = C1.healthDecision;
        if (HD) {
          const ci = await ask(HD.who || 'gaz', HD.q, HD.options.map(o => o.t), { shuffle: true, eyebrow: 'Your call' });
          const o = HD.options[ci], jp = JP.talk[o.grade];
          apply(o.e, true); record('talk', 'healthDecision', 'Ruby: what first', o.grade); gainJP(jp, 'Health check · what first');
          await say(HD.who || 'gaz', o.why, o.grade === 'best' ? 'smile' : o.grade === 'poor' ? 'concern' : 'neutral', null, `<div class="chips">${chips(o.e, jp)}</div>`);
        }
        S.done.health = true;
      }
    }
  }

  // ---------- Activity: the works plan ----------
  function planBoard() {
    const PL = C1.plan, all = PL.lanes.flatMap(l => l.cards.map(c => Object.assign({ lane: l.id, color: l.color }, c)));
    const byId = Object.fromEntries(all.map(c => [c.id, c]));
    let tray = shuffle(all.map(c => c.id)), placed = Object.fromEntries(PL.lanes.map(l => [l.id, []])), checks = 0, firstCorrect = null, verdict = null;
    const laneOf = id => PL.lanes.find(l => l.id === byId[id].lane);
    return new Promise(resolve => {
      const render = () => {
        const full = !tray.length;
        const laneHTML = l => {
          const tot = l.cards.reduce((a, c) => a + c.w, 0), p = placed[l.id];
          return `<div class="lane ${l.color}"><h4>${l.id === 'train' ? '🚂' : '🛤️'} ${esc(l.label)} <small>${l.cards.length} jobs</small></h4><ol>${l.cards.map((_, i) => {
            const id = p[i]; if (!id) return `<li class="slot empty"><span class="n">${i + 1}</span><span class="t">…</span></li>`;
            const c = byId[id], st = verdict ? (verdict[l.id][i] ? 'ok' : 'bad') : '';
            return `<li class="slot ${st}"><button data-rm="${id}" aria-label="Remove ${esc(c.t)}"><span class="n">${i + 1}</span><span class="t">${esc(c.t)}</span><span class="w">${c.w}w</span>${st === 'bad' ? `<span class="why">${esc(c.why)}</span>` : ''}</button></li>`;
          }).join('')}</ol></div>`;
        };
        const allOk = verdict && PL.lanes.every(l => verdict[l.id].every(Boolean));
        const el = layer('panel', `<div class="center-wrap"><div class="card call plan"><div class="call-head"><span class="tag gold">Works plan</span><span class="when">Project office<br>with Jo</span></div><div class="call-body">
          <h2>Put the work in order</h2><p class="sit small">${verdict && !allOk ? `Jo has marked the cards that are out of order and why. Tap one to take it back, then try again.` : `Tap a card to add it to the next slot in its lane. Tap a placed card to take it back.`}</p>
          <div class="tray" aria-label="Cards to place">${tray.map(id => { const c = byId[id]; return `<button class="pcard ${c.color}" data-add="${id}"><span>${esc(c.t)}</span><small>${esc(laneOf(id).label)} · ${c.w}w</small></button>`; }).join('') || `<div class="traydone">All cards placed.</div>`}</div>
          <div class="lanes">${PL.lanes.map(laneHTML).join('')}</div>
          <div class="cta"><button class="btn dark" id="pCheck" ${full ? '' : 'disabled'}>${checks ? 'Check again' : 'Check the plan'}</button></div>
        </div></div></div>`);
        el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const id = b.dataset.add, l = byId[id].lane; tray = tray.filter(x => x !== id); placed[l].push(id); verdict = null; LS.audio.sfx('place'); render(); });
        el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const id = b.dataset.rm, l = byId[id].lane; placed[l] = placed[l].filter(x => x !== id); tray.push(id); verdict = null; LS.audio.sfx('tap'); render(); });
        const chk = $('#pCheck'); if (chk) chk.onclick = () => {
          checks++;
          verdict = Object.fromEntries(PL.lanes.map(l => [l.id, l.cards.map((c, i) => placed[l.id][i] === c.id)]));
          const n = PL.lanes.reduce((a, l) => a + verdict[l.id].filter(Boolean).length, 0);
          if (firstCorrect === null) { firstCorrect = n; const jp = Math.round(100 * n / all.length); gainJP(jp, 'Works plan · sequencing'); record('plan', 'sequence', 'Works plan: sequencing', n === all.length ? 'best' : n >= Math.ceil(all.length * 0.66) ? 'ok' : 'poor', { n }); }
          if (n === all.length) { LS.audio.sfx('good'); questions(); } else { LS.audio.sfx('bad'); render(); }
        };
      };
      const questions = async () => {
        const qg = [];
        for (const [qi, q] of PL.questions.entries()) {
          const order = shuffle(q.options.map((_, i) => i));
          const tot = l => l.cards.reduce((a, c) => a + c.w, 0), max = Math.max(...PL.lanes.map(tot)), bg = PL.background || [];
          const lo = Math.min(0, ...bg.map(b => b.from)), hi = Math.max(max + 4, ...bg.map(b => b.from + b.w)), span = hi - lo, pc = v => 100 * (v - lo) / span;
          const bar = (cls, from, w, label) => `<div class="trk"><i class="${cls}" style="left:${pc(from)}%;width:${Math.min(100 - pc(from), 100 * w / span)}%">${label || ''}</i></div>`;
          const gantt = `<div class="gantt">${PL.lanes.map(l => `<div class="row"><span>${l.id === 'train' ? '🚂' : '🛤️'} ${esc(l.label)}</span>${bar(l.color, 0, tot(l), tot(l) + ' wk')}</div>`).join('')}${bg.map(b => `<div class="row bgrow"><span>${esc(b.t)}</span>${bar('grey', b.from, b.w)}</div>`).join('')}<div class="row"><span></span><div class="trk axis"><span style="left:${pc(0)}%">start on site</span></div></div></div>`;
          const el = layer('panel', `<div class="center-wrap"><div class="card call plan"><div class="call-head"><span class="tag gold">Works plan · question ${qi + 1} of ${PL.questions.length}</span><span class="when">Project office<br>with Jo</span></div><div class="call-body">
            <h2>${q.title || (qi ? 'The critical path' : 'When can Ruby run?')}</h2>${gantt}<p class="sit">${esc(q.q)}</p>
            ${order.map((i, n) => `<button class="opt" data-k="${n + 1}" data-c="${i}"><span class="l">${'ABC'[n]}</span><span><div class="t">${esc(q.options[i].t)}</div></span></button>`).join('')}</div></div></div>`);
          el.querySelector('.call').scrollTop = 0;
          const ci = await new Promise(res => { onKey = true; el.querySelectorAll('.opt').forEach(b => b.onclick = () => res(+b.dataset.c)); });
          onKey = null; LS.audio.sfx('select');
          const o = q.options[ci], jp = JP.planQ[o.grade]; qg.push(o.grade); record('planQ', 'q' + qi, qi ? 'Works plan: critical path' : 'Works plan: when to test', o.grade); gainJP(jp, 'Works plan · ' + (qi ? 'critical path' : 'test runs'));
          LS.audio.sfx(o.grade === 'best' ? 'good' : o.grade === 'poor' ? 'bad' : 'tap');
          const el2 = layer('panel', `<div class="center-wrap"><div class="card call plan"><div class="call-head"><span class="tag ${o.grade === 'best' ? 'teal' : o.grade === 'poor' ? 'rose' : 'gold'}">Works plan · question ${qi + 1} of ${PL.questions.length}</span><span class="when">Project office<br>with Jo</span></div><div class="call-body">
            <div class="verdict"><span class="stamp ${o.grade}">${GRADE[o.grade].toUpperCase()}</span><span class="your">You said: <b>${esc(o.t)}</b></span></div><div class="chips">${chips(null, jp)}</div>
            <div class="mentor"><div class="face">${face('jo', o.grade === 'best' ? 'smile' : 'neutral')}</div><div><div class="nm">Jo says</div><div class="say">“${esc(o.why)}”</div></div></div>
            <div class="cta"><button class="btn dark" data-go>Continue <span class="kbd" style="color:#fff">↵</span></button></div></div></div></div>`);
          await clickGo(el2);
        }
        S.plan = { first: firstCorrect, of: all.length, checks, q: qg };
        resolve();
      };
      render();
    });
  }

  // ---------- Activity: the drop-in ----------
  async function dropin() {
    const D = C1.dropin;
    world.entities.filter(e => e.audience).forEach(e => e.hidden = false);
    for (const [w, t] of D.intro) await say(w, t, 'smile');
    const grades = [];
    for (const q of D.questions) {
      const ci = await ask(q.who, q.text, q.choices.map(c => c.t), { shuffle: true, eyebrow: 'Question from the floor' });
      const o = q.choices[ci], jp = JP.dropin[o.grade];
      apply(o.e, true); grades.push(o.grade); record('dropin', q.who, `Drop-in: ${first(q.who)}'s question`, o.grade); gainJP(jp, `Drop-in · ${first(q.who)}`);
      if (o.ripple) S.ripples.push({ title: o.ripple.title, text: o.ripple.text, later: o.ripple.later, from: 'The drop-in', choice: o.t });
      await say(q.who, o.reply, o.grade === 'best' ? 'smile' : o.grade === 'poor' ? 'smile' : 'concern', null, `<div class="chips">${chips(o.e, jp)}</div>${o.ripple ? `<div class="pending">⏳ That will be remembered…</div>` : ''}`);
    }
    S.dropin = grades; S.done.dropin = true;
    world.entities.filter(e => e.audience).forEach(e => e.hidden = true);
    const allHonest = grades.every(g => g === 'best');
    await say('brian', allHonest ? D.outroAll : D.outroSome, 'smile');
    if (allHonest) unlock('biscuit');
  }

  // ---------- The Funding Panel (gate review) ----------
  function caseRows() {
    const dBest = Object.values(S.defects).filter(g => g === 'best').length, dOk = Object.values(S.defects).filter(g => g === 'ok').length;
    const f = S.judgment.find(j => j.id === 'forecast'), d = S.judgment.find(j => j.id === 'date');
    const pl = S.plan || { first: 0, of: 9, q: [] };
    const cp = pl.q[1] === 'best';
    const rows = [
      { k: 'safety', nm: 'Safety & approvals', tx: S.defects.crossing === 'best' ? 'Crossing treated as a top risk; council and safety regulator involved early' : 'No clear route yet to approval for the crossing', s: 0.5 * clamp((S.m.safety - 40) / 40, 0, 1) + 0.5 * GSCORE[S.defects.crossing || 'poor'], w: 10 },
      { k: 'track', nm: 'Track condition', tx: `${dBest} of 5 defects judged like an engineer`, s: (dBest + dOk * 0.5) / 5, w: 14 },
      { k: 'train', nm: 'Ruby', tx: (() => { const g = (S.graded.find(x => x.id === 'healthDecision') || {}).grade; return g === 'best' ? 'Health check done; long-lead parts and the asbestos survey planned first' : g === 'ok' ? 'Health check done; ordering waits for the full design' : 'Health check done; strip-down planned before an asbestos survey'; })(),
        s: 0.5 * (Object.keys(S.hotspots).length / 5) + 0.5 * (GSCORE[(S.graded.find(x => x.id === 'healthDecision') || {}).grade] || 0), w: 8 },
      { k: 'plan', nm: 'Works plan', tx: `${pl.first}/${pl.of} in order first time · critical path ${cp ? 'identified' : 'unclear'}`, s: (pl.first / pl.of) * 0.55 + ((GSCORE[pl.q[0]] || 0) + (GSCORE[pl.q[1]] || 0)) * 0.225, w: 20 },
      { k: 'forecast', nm: 'Ridership forecast', tx: !f ? '—' : f.grade === 'best' ? 'Independently checked, shown as a range' : f.grade === 'ok' ? 'Halved “to be safe”, with no evidence' : 'The consultant’s headline number', s: f ? GSCORE[f.grade] : 0, w: 16 },
      { k: 'date', nm: 'Opening date', tx: !d ? '—' : d.grade === 'best' ? 'A range, narrowing at each stage' : d.grade === 'ok' ? 'No date yet' : 'A fixed date: the bank holiday', s: d ? (d.grade === 'best' ? 1 : d.grade === 'ok' ? 0.6 : 0.2) : 0, w: 10 },
      { k: 'town', nm: 'Community', tx: `${S.m.town}% town support`, s: clamp((S.m.town - 30) / 40, 0, 1), w: 12 }
    ];
    const ev = S.graded.filter(g => g.kind === 'event');
    if (ev.length) rows.push({ k: 'events', nm: 'Handling surprises', tx: `${ev.filter(g => g.grade === 'best').length} of ${ev.length} handled like an expert`, s: ev.reduce((a, g) => a + GSCORE[g.grade], 0) / ev.length, w: 0 });
    return rows;
  }
  async function panelReview() {
    const PN = C1.panel;
    world.flags.panel = true; world.hallBanner = PACK.world.c1.panelBanner;
    for (const [w, t] of PN.intro) await say(w, t, 'neutral');
    const rows = caseRows();
    const el = layer('panel', `<div class="center-wrap"><div class="card call case"><div class="call-head"><span class="tag">Gate review</span><span class="when">Funding Panel<br>Harrowby Village Hall</span></div><div class="call-body">
      <h2>Your case</h2><p class="sit small">Everything you did over the last six weeks, on one page. This is what the panel sees.</p>
      <div class="caserows">${rows.map(r => `<div class="crow ${r.s >= 0.8 ? 'good' : r.s >= 0.45 ? 'mid' : 'bad'}"><span class="ic">${r.s >= 0.8 ? '✓' : r.s >= 0.45 ? '~' : '✗'}</span><span><b>${esc(r.nm)}</b><small>${esc(r.tx)}</small></span></div>`).join('')}</div>
      <p class="hint">The panel has ${PN.questions.length} questions for you.</p>
      <div class="cta"><button class="btn dark" data-go>Take questions <span class="kbd" style="color:#fff">↵</span></button></div></div></div></div>`);
    await clickGo(el);
    let qs = 0;
    for (const q of PN.questions) {
      const ci = await ask(q.who, q.text, q.choices.map(c => c.t), { shuffle: true, eyebrow: 'The Funding Panel' });
      const o = q.choices[ci], jp = JP.panelQ[o.grade]; qs += o.grade === 'best' ? 5 : o.grade === 'ok' ? 2 : 0;
      record('panelQ', q.who, `Panel: ${first(q.who)}'s question`, o.grade); gainJP(jp, `Panel · ${first(q.who)}`);
      await say(q.who, o.reply, o.grade === 'best' ? 'smile' : o.grade === 'poor' ? 'concern' : 'neutral', null, `<div class="chips">${chips(null, jp)}</div>`);
    }
    const evB = S.graded.filter(g => g.kind === 'event' && g.grade === 'best').length;
    qs = qs * 2 / Math.max(2, PN.questions.length);
    const score = clamp(Math.round(rows.reduce((a, r) => a + r.s * r.w, 0) + qs + evB * 2), 0, 100);
    const key = score >= 75 ? 'approved' : score >= 50 ? 'conditions' : 'deferred', out = PN.outcomes[key];
    const weakest = rows.filter(r => r.w).sort((a, b) => a.s - b.s)[0];
    const COND = { safety: 'a safety and approvals plan, starting with the Crag Lane crossing', track: 'a specialist track survey', train: 'a full condition report on Ruby', plan: 'a re-baselined works plan with the critical path shown', forecast: 'an independent check of the ridership forecast', date: 'a published date range instead of a single date', town: 'a community engagement plan' };
    S.panel = { score, outcome: key, weakest: weakest.k }; S.done.panel = true;
    apply(out.e, false); gainJP(out.jp, 'Funding Panel · ' + out.title);
    LS.audio.sfx('stamp'); setTimeout(() => LS.audio.sfx(key === 'approved' ? 'good' : key === 'deferred' ? 'bad' : 'tap'), 250);
    const el2 = layer('panel', `<div class="center-wrap"><div class="card call case"><div class="call-head"><span class="tag ${key === 'approved' ? 'teal' : key === 'deferred' ? 'rose' : 'gold'}">Panel decision</span><span class="when">Readiness ${score}/100</span></div><div class="call-body">
      <div class="verdict"><span class="stamp ${key === 'approved' ? 'best' : key === 'deferred' ? 'poor' : 'ok'}">${out.stamp}</span></div>
      <h2 style="margin-top:14px">${esc(out.title)}</h2><p class="sit">${esc(out.text)}${key !== 'approved' ? ` The weakest part of your case was <b>${esc(weakest.nm.toLowerCase())}</b>, so the panel wants ${esc(COND[weakest.k])}.` : ''}</p>
      <div class="meter"><i style="width:0%" id="readyBar"></i><span style="left:50%">50</span><span style="left:75%">75</span></div>
      <div class="chips">${chips(out.e, out.jp)}</div>
      <div class="cta"><button class="btn dark" data-go>Continue <span class="kbd" style="color:#fff">↵</span></button></div></div></div></div>`);
    requestAnimationFrame(() => setTimeout(() => { const b = $('#readyBar'); if (b) b.style.width = score + '%'; }, 200));
    await clickGo(el2);
    if (key === 'approved') unlock('green');
    await say('helen', key === 'approved' ? `Well. I've been to three launch events for this railway. I think I might finally get to go to an opening.` : key === 'conditions' ? `We're on. With homework. I like homework. Mostly.` : `Not yet, but not no. Let's go and get them what they asked for.`, key === 'deferred' ? 'concern' : 'smile');
  }

  // ---------- Scoring summaries ----------
  function stats() {
    const g = S.graded; if (!g.length) return null;
    const dec = g.reduce((a, x) => a + GSCORE[x.grade], 0) / g.length;
    const rated = S.judgment.filter(x => x.conf != null);
    const brier = rated.length ? rated.reduce((a, x) => a + Math.pow(x.conf - GSCORE[x.grade], 2), 0) / rated.length : 0.04;
    const score = Math.round(100 * (0.8 * dec + 0.2 * (1 - brier / 0.81)));
    return { score, dec, brier, n: g.length, best: g.filter(x => x.grade === 'best').length, calls: rated.length, callsBest: rated.filter(x => x.grade === 'best').length,
      over: rated.filter(x => x.conf >= 0.9 && x.grade === 'poor').length, under: rated.filter(x => x.conf <= 0.5 && x.grade === 'best').length };
  }
  const ARCH = {
    safety: ['The Guardian', `You never gamble with people. Nobody gets hurt on your watch, and your crews know it.`],
    evidence: ['The Detective', `You look before you leap. Facts first, promises second. Panels love you for it.`],
    time: ['The Sprinter', `You protect the schedule like it's your own. Momentum is your superpower.`],
    money: ['The Treasurer', `Every pound has a job. Sponsors sleep well with you holding the purse.`],
    team: ['The Captain', `You lead people, not plans. Your team would follow you onto the next job.`],
    town: ['The Neighbour', `You never forget who the railway is for. Harrowby trusts you, and that's rare.`],
    balanced: ['The Steady Hand', `You weigh every side and rarely over-rotate. Hard to rattle, hard to fool.`]
  };
  const BLIND = { safety: 'Safety, the one trade-off you can’t take back.', evidence: 'Evidence: hope isn’t a plan.', time: 'Time: lost weeks are rarely recovered.', money: 'Money: small leaks sink big projects.', team: 'People: watch the human cost of your wins.', town: 'The town: the railway is for them.' };
  function profile() {
    const keys = METRICS.map(m => m.k), vals = keys.map(k => S.trade[k] || 0);
    const max = Math.max(...vals), min = Math.min(...vals);
    const top = keys[vals.indexOf(max)], low = keys[vals.indexOf(min)];
    const a = (max - min < 8) ? ARCH.balanced : ARCH[top];
    return { name: a[0], desc: a[1], low, blind: min < 0 ? BLIND[low] : null, strength: MK[top].long, lowLabel: MK[low].long };
  }

  // ---------- Save ----------
  const SAVE = 'lineside_v2';
  function save() { if (!S.introDone) return; try { if (world && EX) S.pos = { room: world.room, x: Math.round(world.player.x), y: Math.round(world.player.y) }; localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { } }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE)); return s && s.v === 2 ? s : null; } catch (e) { return null; } }

  // ---------- Game flow ----------
  let world, EX = null;
  function setScene(sc) { world.set(sc); LS.audio.setMood(sc.weather === 'rain' ? 'tense' : sc.time === 'dusk' ? 'hopeful' : 'warm'); LS.audio.setWeather(sc.weather || 'clear'); }
  const sceneFor = w => ({ time: SCENES[w][0], season: 'spring', weather: SCENES[w][1], build: 0 });
  function updateWeek() {
    const n = C1.tasks.filter(t => S.done[t.id]).length, w = WEEKS[Math.min(n, WEEKS.length - 1)];
    if (w !== S.week) { S.week = w; setScene(sceneFor(w)); world.ppe = !!S.ppe; hud(); toast(`Week ${w} of 6 · ${MONTH[w]}`); }
  }
  async function runChapter() {
    world.chapter = 0; await world.ready; setScene(sceneFor(S.week)); setupWorld(); hud();
    if (!S.introDone) {
      await chapterCard();
      if (C1.coldOpen && C1.coldOpen.sunday) await coldOpen();
      else { for (const [who, text] of (C1.intro || [])) await say(who, text, 'smile'); hide('talk'); }
      S.introDone = true; S.exploreStart = Date.now();
    }
    save();
    await explore();
    await chapterEnd();
  }

  // ---------- Coach marks: explain each thing the first time it matters ----------
  function tip(key, fallback) {
    S.tips = S.tips || {}; if (S.tips[key]) return; const txt = (C1.tips && C1.tips[key]) || fallback; if (!txt) return;
    S.tips[key] = 1; const el = $('#tip'); el.innerHTML = `<span class="tk">Tip</span>${esc(fill(txt))}`; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(tip.t); tip.t = setTimeout(() => el.classList.remove('on'), 5200);
  }
  const MOVE_TIP = () => world.touch ? 'Drag the joystick to walk, or tap where you want to go. Tap Ⓐ or tap a person to talk.' : 'Walk with WASD or the arrow keys, or click where you want to go. Press E to talk or look.';

  // ---------- Cold open: a Sunday at dawn, the depot door open a crack ----------
  async function coldOpen() {
    const CO = C1.coldOpen, R = LS.WORLD.ROOMS, D = LS.WORLD.DOORS;
    setScene({ time: 'dawn', season: 'spring', weather: 'clear', build: 0 });
    const sp = LS.WORLD.tp(LS.LEVEL.spawn.tile[0], LS.LEVEL.spawn.tile[1]); world.place('outside', sp.x, sp.y, 'up');
    const team = world.entities.filter(e => e.team || e.town); team.forEach(e => { e._h = e.hidden; e.hidden = true; });
    const sd = world.entities.find(e => e.id === 'door_shed'); if (sd) sd.marker = null;
    for (const [who, text] of CO.sunday) await say(who, text, 'neutral'); hide('talk');
    // walk to the depot: the yard and apron are open this once (Moira's unlocked it)
    const apronOk = (room, tx, ty) => room === 'outside' && (LS.LEVEL.rows[ty][tx] === 'a' || LS.LEVEL.rows[ty][tx] === '!' && ty === 34);
    world.allow = apronOk; world.flags.openDepot = true;
    const shedDoor = D.shed; world.objective = { room: 'shed', x: R.shed.enter.x, y: R.shed.enter.y, label: CO.objective || 'The depot', doorLabel: CO.objective || 'The depot' };
    $('#obj').innerHTML = `<li class="next"><span class="bx"></span><span><b>${esc(CO.objective || 'Look inside the depot')}</b><small>Harrowby Depot, next to the station</small></span></li>`;
    world.paused = false; pad(true); tip(world.touch ? 'move_touch' : 'move_desktop', MOVE_TIP());
    await new Promise(res => { world.onEnterRoom = room => { if (room === 'shed') res(); }; world.onInteract = null; });
    // the dark depot: three finds by torchlight
    world.flags.dark = true; world.paused = true; pad(false);
    const finds = CO.finds || [], spots = { sheet: [15, 6, 15, 9], flask: [27, 9, 18, 11], window: [5, 6, 12, 10] };
    world.leash = { room: 'shed', x: R.shed.enter.x, y: R.shed.enter.y, r: 3.5 * LS.WORLD.T }; // stay by the door: there's an open pit and no kit
    const fe = finds.map((f, i) => { const s = spots[f.id] || [8 + i * 6, 7, 8 + i * 6, 7], p = LS.WORLD.tp(s[0], s[1]), q = LS.WORLD.tp(s[2], s[3]); return { kind: 'find', id: 'co_' + f.id, room: 'shed', x: p.x, y: p.y, sx: q.x, sy: q.y, h: 16, prompt: f.label, marker: 'find', f }; });
    const hidShed = world.entities.filter(e => e.room === 'shed' && e.kind !== 'find'); hidShed.forEach(e => { e._h2 = e.hidden; e.hidden = true; });
    world.entities.push(...fe);
    world.objective = { room: 'shed', x: fe[0] ? fe[0].x : 0, y: fe[0] ? fe[0].y : 0, label: 'Have a look round' };
    $('#obj').innerHTML = `<li class="next"><span class="bx"></span><span><em>Now</em><b>Have a look round</b><small>${fe.length} things catch your torch</small></span></li>`;
    world.paused = false; pad(true); tip('find');
    await new Promise(res => {
      world.onInteract = async e => {
        if (e.kind !== 'find') return;
        world.paused = true; pad(false);
        await say('narrator', e.f.text); hide('talk');
        e.marker = 'done'; e.prompt = null; e.found = true;
        const left = fe.filter(x => !x.found);
        if (!left.length) { res(); return; }
        world.objective = { room: 'shed', x: left[0].x, y: left[0].y, label: 'Have a look round' };
        world.paused = false; pad(true);
      };
    });
    world.paused = true; pad(false); world.objective = null;
    // Moira arrives
    const moira = world.entities.find(e => e.id === 'moira');
    const home = { room: moira.room, x: moira.x, y: moira.y };
    Object.assign(moira, { room: 'shed', x: R.shed.enter.x, y: R.shed.enter.y + 2, hidden: false, face: 'up' });
    LS.audio.sfx('door'); await wait(400);
    for (const [who, text] of CO.meet || []) await say(who, text, who === 'moira' ? 'smile' : 'neutral');
    if (CO.choice) { const ci = await ask(CO.choice.who || 'moira', CO.choice.q, CO.choice.options); S.flags.firstImpression = ci; }
    for (const [who, text] of CO.advice || []) await say(who, text, 'smile');
    hide('talk');
    // Monday
    world.fade = 1; world.flags.dark = false; world.allow = null; world.flags.openDepot = false; world.leash = null;
    fe.forEach(e => e.hidden = true); hidShed.forEach(e => e.hidden = e._h2);
    Object.assign(moira, home); team.forEach(e => e.hidden = e._h);
    setScene(sceneFor(1)); world.place('outside', sp.x, sp.y, 'up');
    layer('chapter', `<div><div class="n">The next morning</div><div class="t">Monday</div><div class="m">Week 1 · March</div><div class="rule"></div></div>`); await wait(SET.reduced ? 600 : 1600); hide('chapter');
    world.fade = 0; refreshWorld();
    for (const [who, text] of CO.monday || []) await say(who, text, 'smile');
    if (CO.promise) {
      const P = CO.promise, ci = await ask(P.who, P.text, P.choices.map(c => c.t), { shuffle: true, eyebrow: 'Your first call' });
      const o = P.choices[ci], jp = JP.talk[o.grade];
      apply(o.e, true); record('talk', 'promise', 'The first promise', o.grade); gainJP(jp, 'The first promise');
      if (o.ripple) S.ripples.push({ title: o.ripple.title, text: o.ripple.text, later: o.ripple.later, from: 'Your first morning', choice: o.t });
      await say(P.who, o.reply, o.grade === 'best' ? 'smile' : 'neutral', null, `<div class="chips">${chips(o.e, jp)}</div>`);
    }
    for (const [who, text] of CO.after || []) await say(who, text, 'smile');
    hide('talk');
  }

  // ---------- The open world ----------
  const WD = () => PACK.world, WC = () => PACK.world.c1;
  const task = id => C1.tasks.find(t => t.id === id);
  const avail = t => !S.done[t.id] && (t.needs || []).every(n => S.done[n]);
  const holderOf = id => WC().holders[id];
  const SHORT = { induction: 'induction', walk: 'track walk', health: 'health check', dropin: 'drop-in', plan: 'works plan', forecast: 'forecast Call', date: 'date Call' };
  const DOOR_NAME = { office: 'Project office', hall: 'Village hall', shed: 'Harrowby Depot' };
  function setupWorld() {
    const W = WD(), Lv = LS.LEVEL, tp = LS.WORLD.tp, ents = [];
    const at = (t, s) => { const p = tp(t[0], t[1]), q = s ? tp(s[0], s[1]) : p; return { x: p.x, y: p.y, sx: q.x, sy: q.y }; };
    const addE = (room, src, extra) => ents.push(Object.assign({ room }, at(src.tile, src.stand), extra));
    const INSPECT = { station: 'Look at the station', buffer: 'The buffer stop', depot: 'Look at the depot', signalbox: 'Look at the signal box', crag: 'Kestrel Crag viewpoint', cottage: 'Beck Cottage', packhorse: 'The packhorse bridge', noticeboard: 'Read the noticeboard', busstop: 'The bus stop', war_memorial: 'The war memorial', site_board: 'Read the site board', postbox: 'The post box', trap: 'Trap points', board: 'Project board', lockers: 'PPE locker', kettle: 'Make a brew', urn: 'Tea urn', table: 'The Funding Panel', hall_noticeboard: 'Hall noticeboard', workbench: "Gaz's workbench", cushions: 'Seat cushions' };
    const place = (room, list) => list.forEach(src => {
      const id = src.id;
      if (src.kind === 'npc') {
        const cid = id === 'helen_panel' ? 'helen' : id, c = cast(cid);
        if (id === 'helen_panel') return; // Helen walks to the hall herself for the panel
        const e = { kind: 'npc', id: cid, look: c.look, face: src.face || 'down', home: null };
        if (W.town[cid]) { e.town = true; if (src.wander) e.wander = src.wander; }
        else { e.team = true; e.name = first(cid); if (src.panel) { e.panel = true; e.hidden = true; } }
        addE(room, src, e); ents[ents.length - 1].home = { room, x: ents[ents.length - 1].x, y: ents[ents.length - 1].y };
      } else if (src.kind === 'defect') { const d = C1.defects.find(d => 'd_' + d.id === id); if (d) addE(room, src, { kind: 'defect', id, d, h: 12 }); }
      else if (src.kind === 'hotspot') { const h = C1.hotspots.find(h => 'h_' + h.id === id); if (h) addE(room, src, { kind: 'hotspot', id, hs: h, h: 34 }); }
      else if (src.kind === 'note') { const n = WC().notes.find(n => n.id === id); if (n) addE(room, src, { kind: 'note', id, n, h: 16 }); }
      else if (src.kind === 'memo') { if (!S.memo) addE(room, src, { kind: 'memo', id: 'memo', h: 8 }); }
      else if (src.kind === 'prop' && INSPECT[id]) addE(room, src, { kind: 'prop', id, label: INSPECT[id], h: id === 'table' ? 18 : 20, hidden: id === 'table' });
    });
    place('outside', Lv.outside);
    for (const [rid, R] of Object.entries(Lv.rooms)) place(rid, R.entities || []);
    // doors (outside) and exits (inside), clearly labelled
    for (const d of Object.values(LS.WORLD.DOORS)) ents.push({ kind: 'door', id: 'door_' + d.room, room: 'outside', x: d.doorX, y: d.doorY + 10, sx: d.x, sy: d.y, h: 26, door: d, prompt: `Enter ${DOOR_NAME[d.room].replace(/^Project/, 'the project').replace(/^Village/, 'the village')}` });
    for (const [rid, R] of Object.entries(LS.WORLD.ROOMS)) ents.push({ kind: 'exit', id: 'exit_' + rid, room: rid, x: R.exitX, y: R.exitY, sx: R.exitX, sy: R.exitY - 8, h: 6, prompt: 'Leave' });
    // the drop-in audience
    (Lv.rooms.hall.audience_seats || []).forEach(([tx, ty], k) => { const id = ['len', 'june', 'jess', 'dev', 'len', 'june'][k] || 'len'; const p = tp(tx, ty); ents.push({ kind: 'npc', id: 'aud_' + k, room: 'hall', x: p.x, y: p.y, look: k < 4 ? W.town[id].look : { skin: k % 2 ? '#c28f6a' : '#e7bf9c', hair: k % 2 ? '#231a16' : '#c9c4c0', hairStyle: k % 2 ? 'short' : 'bun', top: k % 2 ? '#34506e' : '#7a2e3b', topStyle: k % 2 ? 'tee' : 'cardigan' }, face: 'up', audience: true, hidden: !!S.done.dropin }); });
    // Sleeper the cat
    const spots = Lv.rooms.shed.cat_spots || [[2, 11]]; S.flags.catSpot = S.flags.catSpot ?? Math.floor(Math.random() * spots.length);
    const cs = tp(...spots[S.flags.catSpot % spots.length]); ents.push({ kind: 'cat', id: 'cat', room: 'shed', x: cs.x, y: cs.y, h: 10 });
    world.entities = ents; world.hallBanner = WC().hallBanner; world.ppe = !!S.ppe;
    world.flags = Object.assign(world.flags || {}, { pigeonGone: !!S.flags.pigeonGone, planned: !!S.done.plan, panel: false, drainCleared: false, dark: false, openDepot: false });
    world.invalidate('office'); world.invalidate('hall');
    world.player.look = PACK.avatars[S.avatar]; world.attract = false; world.paused = true;
    const sp = S.pos || { room: 'outside', ...tp(Lv.spawn.tile[0], Lv.spawn.tile[1]) }; world.place(sp.room, sp.x, sp.y, 'up');
    EX = { };
    world.onBlocked = why => { toast(W.blocked[why] || 'You can’t go that way.'); if (why === 'line_closed') tip('ppe_gate'); };
    world.onDoorRefused = async d => { if (EX.busy) return; EX.busy = true; world.paused = true; pad(false); const r = (W.doorRefused && W.doorRefused[d.room]) || ['gaz', `(through the door) Hi-vis and boots in the depot, please! See Hannah in the project office for your induction.`]; await say(r[0], r[1]); hide('talk'); EX.busy = false; world.paused = false; pad(true); };
    world.onFocus = f => { const b = $('#padA'); if (!b) return; if (!f) { b.classList.add('idle'); b.textContent = 'Ⓐ'; return; } b.classList.remove('idle'); b.textContent = (f.prompt || '').split(/[\s:·]/)[0].slice(0, 7) || 'Ⓐ'; if (f.kind === 'door') tip('door'); };
    refreshWorld();
  }
  // What should the player do next, and where is it?
  function currentTarget() {
    const p = world.player;
    const nearest = (list, room) => list.map(e => [e, e.room === world.room ? Math.hypot(e.x - p.x, e.y - p.y) : 1e6]).sort((a, b) => a[1] - b[1])[0];
    for (const t of C1.tasks) {
      if (!avail(t) || (S.track && S.track !== t.id && avail(task(S.track)))) continue;
      if (t.id === 'walk' && S.flags.walkOn) { const n = nearest(world.entities.filter(e => e.kind === 'defect' && !S.defects[e.d.id])); if (n) return { task: t, room: n[0].room, x: n[0].x, y: n[0].y, sx: n[0].sx, sy: n[0].sy, label: n[0].d.title }; }
      if (t.id === 'health' && S.flags.healthOn) { const n = nearest(world.entities.filter(e => e.kind === 'hotspot' && !S.hotspots[e.hs.id])); if (n) return { task: t, room: n[0].room, x: n[0].x, y: n[0].y, sx: n[0].sx, sy: n[0].sy, label: n[0].hs.label }; }
      if (t.id === 'panel') { const tb = world.entities.find(e => e.id === 'table'); return { task: t, room: 'hall', x: tb.x, y: tb.y, sx: tb.sx, sy: tb.sy, label: 'Funding Panel' }; }
      const who = holderOf(t.id), c = world.entities.find(e => e.kind === 'npc' && e.id === who && !e.hidden);
      if (c) return { task: t, room: c.room, x: c.x, y: c.y, sx: c.sx, sy: c.sy, label: first(who), npc: true };
    }
    return null;
  }
  function refreshWorld() {
    if (!EX) return;
    const tgt = currentTarget(), panelOn = avail(task('panel'));
    world.ppe = !!S.ppe;
    for (const e of world.entities) {
      e.marker = null;
      if (e.kind === 'door' || e.kind === 'exit' || e.kind === 'find') { if (e.kind === 'door' && e.door.needs === 'ppe' && !S.ppe) e.marker = 'lock'; continue; }
      if (e.kind === 'memo') { e.prompt = 'Pick up the loose page'; continue; }
      if (e.kind === 'note') { e.prompt = `Engineering note · ${e.n.title}`; if (!S.notes.includes(e.n.id)) e.marker = 'note'; continue; }
      if (e.kind === 'cat') { e.prompt = S.flags.cat ? 'Sleeper (asleep)' : 'Is that… a cat?'; continue; }
      if (e.kind === 'defect') { e.hidden = !S.flags.walkOn; const g = S.defects[e.d.id]; e.prompt = g ? `Logged: ${e.d.title}` : `Inspect: ${e.d.title}`; e.marker = g ? 'done' : 'find'; continue; }
      if (e.kind === 'hotspot') { e.hidden = !S.flags.healthOn; const g = S.hotspots[e.hs.id]; e.prompt = g ? `${e.hs.label} ✓` : `Check: ${e.hs.label}`; e.marker = g ? 'done' : 'find'; continue; }
      if (e.kind === 'prop') {
        e.prompt = e.label;
        if (e.id === 'lockers') e.prompt = S.ppe ? 'PPE locker (you’re wearing yours)' : 'PPE locker';
        if (e.id === 'table') { e.hidden = !panelOn; if (panelOn) { e.prompt = 'Begin the Funding Panel'; e.marker = 'task'; } }
        continue;
      }
      if (e.audience) { e.prompt = null; continue; }
      if (e.panel) { e.hidden = !panelOn; e.prompt = `Talk to ${first(e.id)}`; continue; }
      if (e.team) {
        if (e.id === 'helen') { const inHall = panelOn; if (inHall) Object.assign(e, { room: 'hall', ...LS.WORLD.tp(13, 3), sx: undefined, sy: undefined, face: 'down' }); else if (e.home && e.room !== e.home.room) Object.assign(e, e.home); }
        if (e.id === 'tom') { const f = S.flags.walkOn && !S.done.walk; if (f && !e.follow) { e.follow = true; } if (!f && e.follow) e.follow = false; }
        const tid = Object.keys(WC().holders).find(k => WC().holders[k] === e.id && !S.done[k]);
        const t = tid && task(tid);
        if (e.id === 'helen' && panelOn) { e.prompt = 'Begin the Funding Panel'; e.marker = 'task'; }
        else if (t && avail(t)) {
          const inProg = (tid === 'walk' && S.flags.walkOn) || (tid === 'health' && S.flags.healthOn);
          if (PACK.calls[tid]) { e.prompt = `The Call · ${PACK.calls[tid].title}`; e.marker = 'call'; tip('call'); }
          else if (inProg) e.prompt = `Talk to ${first(e.id)}`;
          else { e.prompt = `Talk to ${first(e.id)}`; e.marker = 'task'; }
        } else e.prompt = e.id === 'moira' ? 'Ask Moira' : `Chat with ${first(e.id)}`;
        continue;
      }
      if (e.town) e.prompt = `Chat with ${first(e.id)}`;
    }
    world.objective = tgt ? { room: tgt.room, x: tgt.x, y: tgt.y, sx: tgt.sx, sy: tgt.sy, npc: !!tgt.npc, label: tgt.label, doorLabel: `▼ ${DOOR_NAME[tgt.room] || 'Enter'}` } : null;
    // objective list: NOW (one clear objective), then what else is open, then what's locked
    const nextId = tgt && tgt.task.id;
    const sub = t => { let s = t.where; if (t.id === 'walk' && S.flags.walkOn) s = `${Object.keys(S.defects).length}/5 defects judged · Tom's with you`; if (t.id === 'health' && S.flags.healthOn) s = `${Object.keys(S.hotspots).length}/5 checks done`; return s; };
    const open = C1.tasks.filter(t => avail(t) && t.id !== nextId), locked = C1.tasks.filter(t => !S.done[t.id] && !avail(t)), doneN = C1.tasks.filter(t => S.done[t.id]).length;
    const items = [];
    if (tgt) items.push(`<li class="next"><span class="bx"></span><span><em>Now</em><b>${esc(tgt.task.label)}</b><small>${esc(sub(tgt.task))}</small></span></li>`);
    open.forEach(t => items.push(`<li class="alt" data-track="${t.id}"><span class="bx"></span><span><b>${esc(t.label)}</b><small>${esc(sub(t))} · tap to track</small></span></li>`));
    if (locked.length) items.push(`<li class="locked"><span class="bx">🔒</span><span><small>${locked.length} more unlock as you go${locked[0] ? ` · next: ${esc(locked[0].label.replace(/^The Call: /, ''))} (after the ${locked[0].needs.filter(n => !S.done[n]).map(n => SHORT[n]).join(', ')})` : ''}</small></span></li>`);
    if (doneN) items.push(`<li class="sum"><span class="bx">✓</span><span><small>${doneN} of ${C1.tasks.length} done</small></span></li>`);
    $('#obj').innerHTML = items.join('');
    $('#obj').querySelectorAll('[data-track]').forEach(li => li.onclick = () => { S.track = li.dataset.track; LS.audio.sfx('tap'); refreshWorld(); });
    if (tgt && tgt.npc) tip('person');
    if (LS.audio.setCrowd) LS.audio.setCrowd(world.flags.panel ? 0.15 : Math.min(1, world.entities.filter(e => e.room === 'hall' && e.kind === 'npc' && !e.hidden).length / 8));
  }
  function pad(on) { document.body.classList.toggle('exploring', !!on); }
  function explore() {
    world.paused = false; pad(true); refreshWorld();
    return new Promise(resolve => {
      world.onEnterRoom = () => { refreshWorld(); save(); };
      world.onInteract = async e => {
        world.paused = true; pad(false);
        const before = C1.tasks.filter(t => S.done[t.id]).length;
        try { await handle(e); } catch (err) { console.error(err); }
        hide('talk'); hide('panel'); world.speaker = null; world.ignoreTapUntil = performance.now() + 300; refreshWorld(); updateWeek(); refreshWorld();
        const after = C1.tasks.filter(t => S.done[t.id]).length;
        save(); // save the finished activity before any surprise can interrupt
        if (!S.done.panel && after > before) { try { await director(); } catch (err) { console.error(err); } hide('panel'); refreshWorld(); }
        save();
        if (S.done.panel) { world.onInteract = null; resolve(); return; }
        world.paused = false; pad(true);
      };
    });
  }
  const GATE = {
    tom: `Induction first. Hannah would have my guts for garters. She's in the project office.`,
    gaz: `Not without hi-vis and boots, pal. The inspection pit's open. Hannah in the project office will sort you out.`,
    jo: () => C1.plan.notReady,
    steve: `No plan, no costs. No costs, no case. Jo first, then me.`,
    helen: `Get Steve's numbers straight first. Then come and give me my poster date.`,
    priya: `The drop-in's once you've walked the line. They'll ask about it, and "I haven't looked yet" won't wash.`
  };
  async function handle(e) {
    const W = WD(), wc = W.c1;
    world.speaker = null;
    if (e.kind === 'memo') {
      S.memo = true; e.hidden = true; LS.audio.sfx('good'); unlock('page');
      await say('note', `“${wc.memoText}”`, null, 'A loose page, under the washing line'); return;
    }
    if (e.kind === 'note') {
      const n = e.n; if (!S.notes.includes(n.id)) { S.notes.push(n.id); apply({ evidence: 2 }, true); LS.audio.sfx('select'); }
      await say('note', n.text, null, `Engineering note · ${n.title}`);
      if (S.notes.length === wc.notes.length) unlock('anorak');
      return;
    }
    if (e.kind === 'cat') {
      LS.audio.sfx('meow');
      if (!S.flags.cat) { S.flags.cat = true; await say('note', `Sleeper, the depot cat, opens one eye, accepts exactly four strokes, and goes back to sleep. Supervision complete.`, null, 'Sleeper'); unlock('cat'); }
      else await say('note', `Sleeper is busy. Sleeping, mainly.`, null, 'Sleeper');
      return;
    }
    if (e.kind === 'defect') { if (S.defects[e.d.id]) { await say('note', `Already in the defects list: ${e.d.options.find(o => o.grade === S.defects[e.d.id]).t}`, null, e.d.title); return; } await defectCard(e.d); return; }
    if (e.kind === 'hotspot') { await hotspot(e.hs); return; }
    if (e.kind === 'prop') {
      const I = W.inspect;
      if (e.id === 'kettle') {
        if (!S.flags.kettle) { S.flags.kettle = true; apply({ team: 2 }, false); LS.audio.sfx('kettle'); await say('note', `You make a round of tea. Steve wants his “builder's”. Jo wants hers “as a concept”. Nobody says thank you, and everybody notices.`, null, 'The kettle'); unlock('kettle'); }
        else await say('note', `You've had three cups. Your hands are doing a little dance.`, null, 'The kettle');
        return;
      }
      if (e.id === 'lockers') { if (!S.ppe) await say('hannah', `Induction first, then kit. That's the rule, and I'm the rule.`); else await say('note', I.lockers, null, 'PPE locker'); return; }
      if (e.id === 'board') {
        await new Promise(res => { boardDone = res; openBoard('project'); });
        // Learning World hook: if the player chose "Learn planning" on the board, run the module (js/learn/), then carry on.
        if (LS.Learn && LS.Learn.wantsToStart()) await LS.Learn.startFromWorld(world);
        return;
      }
      if (e.id === 'table') { if (avail(task('panel'))) { if (S.events.length < 2) { await director(); hide('panel'); } await panelReview(); } return; }
      const txt = { noticeboard: () => I.noticeboard(S.m), station: () => I.station, depot: () => I.depot, signalbox: () => I.signalbox, cottage: () => I.cottage, packhorse: () => I.packhorse, crag: () => I.crag, buffer: () => I.buffer, urn: () => I.urn, workbench: () => I.workbench, cushions: () => I.cushions, busstop: () => I.busstop, war_memorial: () => I.war_memorial, site_board: () => I.site_board, postbox: () => I.postbox, hall_noticeboard: () => I.hall_noticeboard, trap: () => I.trap }[e.id];
      const val = txt && txt();
      await say('note', val || `Nothing out of the ordinary. Which, in Harrowby, is saying something.`, null, e.label);
      return;
    }
    if (e.kind !== 'npc') return;
    world.speaker = e.id;
    if (e.panel || (e.id === 'helen' && avail(task('panel')))) { if (S.events.length < 2) { await director(); hide('panel'); } await panelReview(); return; }
    if (e.town) { await townChat(e.id); return; }
    if (e.id === 'moira') { const t = currentTarget(); await say('moira', W.hints[t ? t.task.id : 'done'] || W.hints.done); return; }
    if (e.team) {
      const tid = Object.keys(wc.holders).find(k => wc.holders[k] === e.id && !S.done[k]);
      const t = tid && task(tid);
      if (t && avail(t)) { await runTask(tid); return; }
      if (t && !avail(t) && GATE[e.id]) { const g = GATE[e.id]; await say(e.id, typeof g === 'function' ? g() : g, 'neutral'); return; }
      const L = W.idle[e.id] || ['…']; await say(e.id, L[Math.floor(Math.random() * L.length)], 'smile');
    }
  }
  async function runTask(id) {
    if (id === 'induction') {
      await talk(C1.talks.hannah_induction, 'hannah_induction');
      S.done.induction = true; S.ppe = true; world.ppe = true; LS.audio.sfx('select'); toast('PPE on · the site gate, the trackbed and the depot are open to you now');
      return;
    }
    if (id === 'walk') {
      if (!S.flags.walkOn) { await talk(C1.talks.tom_walk, 'tom_walk'); S.flags.walkOn = true; toast('Tom walks with you · five defects to judge along the line'); }
      else await say('tom', `Water, wood, weeds, stone and people. You've got ${5 - Object.keys(S.defects).length} still to find. Follow the line east; I'm right behind you.`, 'smile');
      return;
    }
    if (id === 'health') {
      if (!S.flags.healthOn) { await talk(C1.talks.gaz_tour, 'gaz_tour'); S.flags.healthOn = true; toast('Check five areas of Ruby · look for ?'); }
      else await say('gaz', `Have a proper look round her. ${5 - Object.keys(S.hotspots).length} to go.`, 'smile');
      return;
    }
    if (id === 'plan') {
      await say('jo', C1.plan.intro, 'smile');
      await planBoard(); hide('panel');
      S.done.plan = true; world.flags.planned = true; world.invalidate('office'); apply({ evidence: 8, team: 3 }, true);
      if (S.plan.first === S.plan.of) unlock('order');
      await say('jo', C1.plan.done, 'smile');
      return;
    }
    if (id === 'forecast' || id === 'date') { await doCall(id); hide('panel'); return; }
    if (id === 'dropin') { await dropin(); return; }
  }
  async function townChat(id) {
    const W = WD(), tier = S.m.town >= 50 ? 1 : 0;
    await say(id, W.townLines[id][tier], tier ? 'smile' : 'concern');
    if (!S.chats[id]) { S.chats[id] = 1; apply({ town: 2 }, false); toast(`+2% Town support · you listened`); if (Object.keys(W.town).every(k => S.chats[k])) unlock('local'); }
  }
  let boardDone = null;

  // ---------- The Director: surprises that react to the world ----------
  // A seeded random stream per playthrough, so every run differs. Events are weighted by state (weather, town mood,
  // earlier choices). Paced like a good GM: only after a task is finished, never mid-activity, never in the first two
  // minutes, at least 90 seconds apart; up to 3 per chapter, at least 2 before the panel.
  function rand() { S.seed = (S.seed + 0x6D2B79F5) | 0; let t = S.seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  async function director() {
    if (S.done.panel || S.events.length >= 3 || !C1.events) return;
    if ((S.flags.walkOn && !S.done.walk) || (S.flags.healthOn && !S.done.health)) return;
    const doneN = C1.tasks.filter(t => S.done[t.id]).length, now = Date.now();
    const force = avail(task('panel')) && S.events.length < 2;
    if (!force) {
      if (now - (S.exploreStart || 0) < 90000 || now - (S.lastEventAt || 0) < 60000) return;
      if (S.events.length >= Math.min(3, 1 + Math.floor(doneN / 3))) return;
      if (rand() > (S.events.length === 0 && doneN >= 3 ? 0.8 : 0.5)) return;
    }
    const pool = C1.events.filter(ev => !S.events.some(x => x.id === ev.id) && (ev.after || []).every(a => S.done[a])).map(ev => [ev, ev.weight ? ev.weight(S) : 1]).filter(([, w]) => w > 0);
    if (!pool.length) return;
    let r = rand() * pool.reduce((a, [, w]) => a + w, 0), ev = pool[0][0];
    for (const [e, w] of pool) { if ((r -= w) <= 0) { ev = e; break; } }
    S.lastEventAt = now;
    await runEvent(ev);
  }
  async function runEvent(ev) {
    // telegraph it: a call comes in, you answer it
    LS.audio.sfx(/radio/i.test(ev.channel) ? 'radio' : /phone/i.test(ev.channel) ? 'phone' : 'door');
    const icon = /radio/i.test(ev.channel) ? '📻' : /phone/i.test(ev.channel) ? '📞' : '🚪';
    const ring = layer('panel', `<div class="center-wrap"><div class="card ringing"><div class="ric">${icon}</div><div class="rwho"><div class="mini">${face(ev.who, 'concern')}</div><div><b>${esc(cast(ev.who).name)}</b><small>${esc(ev.channel)} · something's come up</small></div></div><div class="cta" style="justify-content:center"><button class="btn dark" data-go>Answer <span class="kbd" style="color:#fff">↵</span></button></div></div></div>`);
    await clickGo(ring);
    const order = shuffle(ev.choices.map((_, i) => i));
    const hd = tag => `<div class="call-head"><span class="tag ${tag || 'rose'}">Out of the blue · ${esc(ev.channel)}</span><span class="when">Week ${S.week} of 6<br>A surprise from the Director</span></div>`;
    const el = layer('panel', `<div class="center-wrap"><div class="card call event">${hd()}<div class="call-body">
      <div class="from"><div class="mini">${face(ev.who, 'concern')}</div>${esc(cast(ev.who).name)} · ${esc(cast(ev.who).role)}</div>
      <h2>${esc(ev.title)}</h2><p class="sit">${fill(ev.text)}</p><div class="cause"><b>Why now:</b> ${esc(ev.cause ? ev.cause(S) : '')}</div>
      <div class="q">What do you do?</div>${order.map((i, n) => `<button class="opt" data-k="${n + 1}" data-c="${i}"><span class="l">${'ABC'[n]}</span><span><div class="t">${esc(ev.choices[i].t)}</div></span></button>`).join('')}
    </div></div></div>`);
    el.querySelector('.call').scrollTop = 0;
    const ci = await new Promise(res => { onKey = true; el.querySelectorAll('.opt').forEach(b => b.onclick = () => res(+b.dataset.c)); });
    onKey = null; LS.audio.sfx('select');
    const o = ev.choices[ci], jp = JP.event[o.grade];
    apply(o.e, true); record('event', ev.id, ev.title, o.grade); gainJP(jp, 'Surprise · ' + ev.title);
    if (o.ripple) S.ripples.push({ title: o.ripple.title, text: o.ripple.text, later: o.ripple.later, from: ev.title, choice: o.t });
    let luck = null;
    if (o.luck) { const hit = rand() < o.luck.p; luck = Object.assign({ hit, p: o.luck.p }, hit ? o.luck.good : o.luck.bad); }
    S.events.push({ id: ev.id, grade: o.grade, luck: luck ? luck.hit : null });
    if (ev.id === 'storm' && luck && luck.hit) world.flags.drainCleared = false;
    LS.audio.sfx('stamp'); setTimeout(() => LS.audio.sfx(o.grade === 'best' ? 'good' : o.grade === 'poor' ? 'bad' : 'tap'), 250);
    const best = ev.choices.find(x => x.grade === 'best');
    const lucky = luck && ((luck.hit && o.grade !== 'best') || (!luck.hit && o.grade === 'best'));
    const odds = luck ? Math.round(luck.p * 10) : 0;
    const el2 = layer('panel', `<div class="center-wrap"><div class="card call event">${hd(o.grade === 'best' ? 'teal' : o.grade === 'poor' ? 'rose' : 'gold')}<div class="call-body">
      <div class="verdict"><span class="stamp ${o.grade}">${GRADE[o.grade].toUpperCase()}</span><span class="your">You chose: <b>${esc(o.t)}</b></span></div>
      <div class="chips">${chips(o.e, jp)}</div>
      <div class="mentor"><div class="face">${face('moira', o.grade === 'best' ? 'smile' : o.grade === 'poor' ? 'concern' : 'neutral')}</div><div><div class="nm">Moira's take</div><div class="say">“${esc(o.why)}”</div>${o.grade !== 'best' ? `<div class="alt">My call: <b>${esc(best.t)}</b></div>` : ''}</div></div>
      ${luck ? `<div class="luck ${luck.hit ? 'good' : 'bad'}"><div class="eyebrow">What happened next · this goes well about ${odds} times in 10</div><p>${esc(luck.text)}</p><div class="chips">${chips(luck.e)}</div>${lucky ? `<small>${o.grade === 'best' ? 'A good decision with a bad outcome. That happens, and your JP are for the decision, not the dice.' : 'A lucky outcome from a risky decision. Enjoy it, but don’t count on it: JP judge the decision, not the dice.'}</small>` : ''}</div>` : ''}
      ${o.ripple ? `<div class="pending">⏳ This will echo in Chapter 2…</div>` : ''}
      <div class="cta"><button class="btn dark" data-go>Back to work <span class="kbd" style="color:#fff">↵</span></button></div></div></div></div>`);
    el2.querySelector('.call').scrollTop = 0;
    if (luck) apply(luck.e, false);
    await clickGo(el2);
  }

  // ---------- Chapter end: report, then what's next ----------
  async function chapterEnd() {
    pad(false); world.paused = true; world.objective = null;
    const key = S.panel.outcome;
    await say('moira', C1.end[key], key === 'deferred' ? 'neutral' : 'smile');
    if (S.memo) await say('moira', C1.end.secret, 'smile');
    hide('talk');
    try { localStorage.removeItem(SAVE); localStorage.setItem('lineside_c1_result', JSON.stringify({ name: S.name, jp: S.jp, outcome: key, m: S.m, ach: S.ach, at: Date.now() })); } catch (e) { }
    world.entities = []; world.room = 'outside'; world.attract = true; world.fitScale(); setScene({ time: 'dusk', season: 'spring', weather: 'clear', build: 0 });
    hud(false); EX = null;
    report();
  }
  function lessons() {
    const L = [
      ['Look before you promise', 'Walk the job, open up the machine, talk to the town. What you see with your own eyes beats any report written in 2019.'],
      ['Sequence the work', 'Some jobs have to wait for other jobs: drainage before track, bogies before brakes, static tests before test runs.'],
      ['The critical path sets the date', 'The longest chain of dependent work decides when you can open. Watch it, not the most exciting workstream.']
    ];
    S.judgment.forEach(j => L.push([PACK.calls[j.id].principle.name, PACK.calls[j.id].principle.text]));
    L.push(['Tell people the truth', 'Honest answers build support that lasts. Over-promises feel great for a week and come back for years.']);
    return L;
  }
  function report() {
    const st = stats(), pf = profile(), r = rankOf(S.jp), key = S.panel.outcome, out = C1.panel.outcomes[key];
    const toNext = r.next ? Math.round(100 * (S.jp - r.at) / (r.next.jp - r.at)) : 100;
    const C = 2 * Math.PI * 88, off = C * (1 - st.score / 100);
    const byKind = k => S.graded.filter(g => g.kind === k);
    const drow = (label, arr) => { if (!arr.length) return ''; const b = arr.filter(x => x.grade === 'best').length; const g = b === arr.length ? 'best' : b >= arr.length / 2 ? 'ok' : 'poor'; return `<div class="callrow"><span class="tt">${esc(label)}</span><span class="cf">${b}/${arr.length} expert</span><span class="gchip ${g}">${GRADE[g].toUpperCase()}</span></div>`; };
    let calib = st.calls ? `Of your ${st.calls} Calls, ${st.callsBest} matched the expert call.` : '';
    const certain = S.judgment.filter(j => j.conf >= 0.9);
    calib += certain.length ? ` You were “certain” ${certain.length} time${certain.length > 1 ? 's' : ''} and right ${certain.filter(j => j.grade === 'best').length}.` : ` You were never “certain”. That's fine, as long as caution isn't turning into indecision.`;
    if (st.over) calib += ` You were certain about a risky call: watch for overconfidence.`;
    else if (st.under) calib += ` You doubted an expert-grade call: your instincts are better than you think.`;
    const html = `<div class="report">
      <div class="hero"><div class="eyebrow" style="color:rgba(247,241,231,.7)">Chapter 1 complete · The Kestrel Vale Line</div><h1>Make the Case</h1><p>${esc(S.name)} spent six weeks looking at everything, then faced the Funding Panel.</p></div>
      <div class="card outcome"><span class="stamp ${key === 'approved' ? 'best' : key === 'deferred' ? 'poor' : 'ok'}">${out.stamp}</span><div><h2>${esc(out.title)}</h2><p>${esc(out.text)}</p><div class="meter"><i style="width:${S.panel.score}%"></i><span style="left:50%">50</span><span style="left:75%">75</span></div><small>Panel readiness ${S.panel.score}/100</small></div></div>
      <div class="card scorecard"><div class="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" stroke="#e8dcc8" stroke-width="14" fill="none"/><circle cx="100" cy="100" r="88" stroke="var(--ember)" stroke-width="14" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" id="ringArc" style="transition:stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)"/></svg><div class="num"><b id="ringNum">0</b><span>Judgment</span></div></div>
        <div class="arch"><div class="rank">${esc(r.name)} · ${S.jp} JP</div><div class="rankbar"><i style="width:${toNext}%"></i></div><small class="rnext">${r.next ? `${r.next.jp - S.jp} JP to ${esc(r.next.name)}` : 'Top rank'}</small><h2>${pf.name}</h2><p>${pf.desc}</p>${pf.blind ? `<div class="blind">Watch out for: ${pf.blind}</div>` : `<div class="blind good">Strength: ${esc(pf.strength)}</div>`}</div></div>
      <div class="rgrid">
        <div class="card rcard"><h3>The project dashboard</h3>${METRICS.map(m => { const d = S.m[m.k] - START[m.k]; return `<div class="mrow"><span class="nm">${m.long}</span><span class="tr"><i style="width:${clamp(100 * (S.m[m.k] - Math.min(0, m.lo)) / m.bar, 0, 100)}%;background:${m.color}"></i></span><span class="v">${m.fmt(S.m[m.k])}</span><span class="dv ${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}">${d ? (d > 0 ? '+' : '−') + (m.k === 'money' ? '£' + Math.abs(d) + 'k' : Math.abs(d)) : '·'}</span></div>`; }).join('')}</div>
        <div class="card rcard"><h3>How you judged</h3><p>Judgment <b>${st.score}</b>: ${st.best} of ${st.n} decisions matched the expert call. ${calib}</p><p class="hint" style="margin-top:10px">Judgment Points reward the quality of each decision, never luck. The dashboard shows outcomes, and outcomes include luck.</p></div>
      </div>
      <div class="card rcard" style="margin-bottom:16px"><h3>Your decisions</h3>
        ${drow('Conversations with the team', byKind('talk'))}${drow('Track walk: judging the defects', byKind('defect'))}${drow('Works plan: sequence & critical path', byKind('plan').concat(byKind('planQ')))}${drow('The drop-in: answering Harrowby', byKind('dropin'))}
        ${S.judgment.map(x => { const cf = CONF.find(c => c.v === x.conf); return `<div class="callrow"><span class="tt">The Call: ${esc(x.title)}</span><span class="cf">${cf ? cf.ic + ' ' + cf.lb : ''}</span><span class="gchip ${x.grade}">${GRADE[x.grade].toUpperCase()}</span></div>`; }).join('')}
        ${drow('Surprises from the Director', byKind('event'))}${drow('The Funding Panel’s questions', byKind('panelQ'))}</div>
      <div class="card rcard" style="margin-bottom:16px"><h3>Achievements · ${S.ach.length} of ${PACK.achievements.length} this run</h3><div class="badges">${PACK.achievements.map(a => `<div class="badge ${S.ach.includes(a.id) ? 'on' : ACHG[a.id] ? 'old' : ''}"><span class="ic">${S.ach.includes(a.id) || ACHG[a.id] ? a.ic : '🔒'}</span><b>${esc(a.name)}</b><small>${esc(S.ach.includes(a.id) || ACHG[a.id] ? a.desc : a.hint)}</small></div>`).join('')}</div></div>
      <div class="card rcard" style="margin-bottom:16px"><h3>Take these to your next project</h3>${lessons().map(([n, t]) => `<div class="lesson"><div class="pn">${esc(n)}</div><p>${esc(t)}</p></div>`).join('')}</div>
      ${S.ripples.length ? `<div class="card rcard echoes" style="margin-bottom:16px"><h3>⏳ Echoes: these will come back in Chapter 2</h3>${S.ripples.map(r => `<div class="lesson"><div class="pn">${esc(r.title)}</div><p>From ${esc(r.from)}: “${esc(r.choice)}”</p>${r.later ? `<p class="later">Coming in Chapter 2: ${esc(r.later)}</p>` : ''}</div>`).join('')}</div>` : ''}
      <div class="card finale"><div class="face">${face('moira', 'smile')}</div><div><div class="eyebrow" style="color:var(--gold)">Moira Kell</div><p style="margin-top:8px">“${fill(C1.end[key])}”</p>${S.memo ? `<p>“${fill(C1.end.secret)}”</p>` : `<p class="dim">(Somebody in this valley keeps a log. You didn't find it this time.)</p>`}</div></div>
      <details class="card rcard" style="margin-bottom:16px"><summary style="cursor:pointer;font-weight:700">For facilitators: discussion guide</summary><ol class="discuss" style="margin-top:12px">
        <li><b>Look before you promise.</b> What did the track walk and the health check tell you that no report could?</li>
        <li><b>Sequencing.</b> Why must the drainage come before the new track, and the bogies before the brakes? Where have you seen work done in the wrong order?</li>
        <li><b>The critical path.</b> Ruby had four weeks of float. What should you do with float, and who should know it exists?</li>
        ${S.judgment.map(x => `<li><b>${esc(x.title)}.</b> ${esc(PACK.calls[x.id].discuss)}</li>`).join('')}
        <li><b>Surprises.</b> Which surprise did you handle well but get an unlucky outcome from, or the other way round? Why is it important to judge the decision, not the outcome?</li>
        <li><b>The drop-in.</b> When is “I don't know yet” the strongest answer you can give?</li></ol></details>
      <div class="report-actions">
        <button class="btn primary" id="rNext">What's next →</button>
        <button class="btn ghost" id="rShare">Share my result</button>
        <button class="btn ghost" id="rCopy">Copy summary</button>
        <button class="btn ghost" id="rCSV">Download results (CSV)</button>
        <button class="btn ghost" id="rAgain">Replay Chapter 1</button>
      </div></div>`;
    achQ.length = 0; $('#ach').classList.remove('on');
    const el = layer('report', html); el.scrollTop = 0;
    requestAnimationFrame(() => setTimeout(() => {
      $('#ringArc').style.strokeDashoffset = off;
      const n = $('#ringNum'); let k = 0; const iv = setInterval(() => { k += Math.max(1, Math.round(st.score / 40)); if (k >= st.score) { k = st.score; clearInterval(iv); } n.textContent = k; }, 30);
    }, 300));
    LS.audio.sfx('good');
    $('#rNext').onclick = comingSoon; $('#rShare').onclick = openShare; $('#rCopy').onclick = copySummary; $('#rCSV').onclick = exportCSV;
    $('#rAgain').onclick = () => location.reload();
  }
  function comingSoon() {
    LS.audio.sfx('chapter');
    const el = layer('panel', `<div class="center-wrap"><div class="card soon"><div class="eyebrow">Coming next</div><h2>Chapter 2 · ${esc(PACK.chapters[1].title)}</h2><p class="lead">${esc(PACK.chapters[1].teaser)}</p>
      <div class="carry"><b>Your result carries forward:</b> ${C1.panel.outcomes[S.panel.outcome].title.toLowerCase()} · contingency ${MK.money.lfmt(S.m.money)} · float ${MK.time.lfmt(S.m.time)} · town support ${S.m.town}% · ${S.jp} JP (${esc(rankOf(S.jp).name)})${S.ripples.length ? ` · ${S.ripples.length} echo${S.ripples.length > 1 ? 'es' : ''} waiting` : ''}.</div>
      <ol class="roadmap">${PACK.chapters.map((c, i) => `<li class="${i === 0 ? 'done' : ''}"><span class="n">${i === 0 ? '✓' : i + 1}</span><span><b>${esc(c.title)}</b><small>${esc(c.phase)} · ${esc(c.when)}</small><em>${esc(c.teaser)}</em></span><span class="st">${i === 0 ? 'Complete' : 'Coming soon'}</span></li>`).join('')}</ol>
      <div class="cta" style="gap:10px;flex-wrap:wrap"><button class="btn line small" id="csBack">Back to my report</button><button class="btn dark" data-go>Back to the title</button></div></div></div>`);
    $('#csBack').onclick = () => hide('panel');
    el.querySelector('[data-go]').onclick = () => location.reload();
  }
  const shareURL = () => /^https?:/.test(location.protocol) && !/claude|anthropic/.test(location.host) ? location.origin + location.pathname : '';
  function summary() {
    const st = stats(), pf = profile(), r = rankOf(S.jp);
    return `🚆 LINESIDE: a game about judgment\nChapter 1, Make the Case: ${C1.panel.outcomes[S.panel.outcome].title}\n⚖ ${S.jp} JP · ${r.name} · Judgment ${st.score}/100\n🧭 Style: ${pf.name}\n🔓 ${S.ach.length}/${PACK.achievements.length} achievements\nCan you make better calls?${shareURL() ? ' ' + shareURL() : ''}`;
  }
  function toast(m, tries) { if (document.body.classList.contains('modal') && !$('#report').classList.contains('on') && (tries || 0) < 40) { setTimeout(() => toast(m, (tries || 0) + 1), 500); return; } const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
  function copySummary() {
    const txt = summary(), ok = () => toast('Copied. Paste it anywhere.');
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, () => fallback(txt, ok)); else fallback(txt, ok);
  }
  function fallback(txt, ok) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { } ta.remove(); }
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function exportCSV() {
    const st = stats(), pf = profile();
    const rows = [['player', 'pack', 'chapter', 'kind', 'decision', 'grade', 'confidence', 'luck']];
    S.graded.forEach(x => { const ev = x.kind === 'event' ? S.events.find(e => e.id === x.id) : null; rows.push([S.name, PACK.id, 1, x.kind, x.title, x.grade, x.conf == null ? '' : x.conf, ev && ev.luck != null ? (ev.luck ? 'lucky' : 'unlucky') : '']); });
    rows.push([]); rows.push(['summary', 'jp', S.jp, 'rank', rankOf(S.jp).name, 'judgment', st.score, 'style', pf.name, 'panel', S.panel.outcome, 'readiness', S.panel.score]);
    rows.push(['dashboard', ...METRICS.map(m => m.long + '=' + m.lfmt(S.m[m.k]))]);
    rows.push(['achievements', ...S.ach]);
    const csv = rows.map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
    download(`lineside-ch1-${S.name.replace(/\W+/g, '_')}.csv`, new Blob([csv], { type: 'text/csv' }));
    toast('Results downloaded. Nothing leaves this device unless you share it.');
  }

  // ---------- Share card ----------
  function wrap(x, text, X, Y, max, lh) { const w = text.split(' '); let line = ''; for (const word of w) { const t = line ? line + ' ' + word : word; if (x.measureText(t).width > max && line) { x.fillText(line, X, Y); line = word; Y += lh; } else line = t; } if (line) x.fillText(line, X, Y); return Y + lh; }
  async function card() {
    try { await Promise.all([document.fonts.load('600 60px Fraunces'), document.fonts.load('700 20px Inter')]); } catch (e) { }
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const st = stats(), pf = profile(), r = rankOf(S.jp), out = C1.panel.outcomes[S.panel.outcome];
    x.fillStyle = '#0e1220'; x.fillRect(0, 0, W, H);
    x.drawImage(world.snapshot(W, 760), 0, 0);
    const tg = x.createLinearGradient(0, 0, 0, 260); tg.addColorStop(0, 'rgba(14,18,32,.55)'); tg.addColorStop(1, 'rgba(14,18,32,0)'); x.fillStyle = tg; x.fillRect(0, 0, W, 260);
    const g = x.createLinearGradient(0, 380, 0, 800); g.addColorStop(0, 'rgba(14,18,32,0)'); g.addColorStop(1, 'rgba(14,18,32,1)'); x.fillStyle = g; x.fillRect(0, 380, W, 420);
    x.textAlign = 'center'; x.fillStyle = '#f7f1e7';
    x.font = '600 112px Fraunces, Georgia, serif'; x.fillText('LINESIDE', W / 2 + 8, 150);
    x.font = 'italic 400 34px Fraunces, Georgia, serif'; x.globalAlpha = 0.9; x.fillText('Chapter 1 · Make the Case', W / 2, 205); x.globalAlpha = 1;
    const cx = 250, cy = 890, R = 150;
    x.lineWidth = 26; x.strokeStyle = 'rgba(247,241,231,.15)'; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
    x.strokeStyle = '#d8643a'; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * st.score / 100); x.stroke();
    x.fillStyle = '#f7f1e7'; x.font = '600 120px Fraunces, Georgia, serif'; x.fillText(String(st.score), cx, cy + 40);
    x.font = '700 22px Inter, sans-serif'; x.fillStyle = 'rgba(247,241,231,.65)'; x.fillText('JUDGMENT', cx, cy + 84);
    x.textAlign = 'left';
    x.fillStyle = '#e7b04a'; x.font = '700 24px Inter, sans-serif'; x.fillText(`${r.name.toUpperCase()} · ${S.jp} JP`, 460, 790);
    x.fillStyle = '#f7f1e7'; x.font = '600 60px Fraunces, Georgia, serif'; const y2 = wrap(x, pf.name, 460, 866, 560, 66);
    x.font = '400 26px Inter, sans-serif'; x.fillStyle = 'rgba(247,241,231,.85)'; const y3 = wrap(x, pf.desc, 460, y2 + 2, 560, 36);
    x.fillStyle = S.panel.outcome === 'approved' ? '#8fe0b0' : S.panel.outcome === 'deferred' ? '#ef8a7a' : '#f2d27a'; x.font = '700 26px Inter, sans-serif'; x.fillText('Panel: ' + out.title, 460, Math.min(y3 + 10, 1082));
    const yy = 1140; x.font = '700 20px Inter, sans-serif';
    METRICS.forEach((m, k) => { const bx = 70 + k * 160; x.fillStyle = 'rgba(247,241,231,.7)'; x.fillText(m.label.toUpperCase(), bx, yy); x.fillStyle = 'rgba(247,241,231,.15)'; x.fillRect(bx, yy + 14, 136, 10); x.fillStyle = m.color; x.fillRect(bx, yy + 14, 136 * clamp((S.m[m.k] - Math.min(0, m.lo)) / m.bar, 0, 1), 10); x.fillStyle = '#f7f1e7'; x.font = '600 38px Fraunces, serif'; x.fillText(String(m.fmt(S.m[m.k])), bx, yy + 66); x.font = '700 20px Inter, sans-serif'; });
    x.textAlign = 'center'; x.fillStyle = 'rgba(247,241,231,.7)'; x.font = '600 24px Inter, sans-serif';
    x.fillText(`🔓 ${S.ach.length}/${PACK.achievements.length} achievements  ·  ${st.best}/${st.n} expert decisions`, W / 2, 1266);
    x.fillStyle = '#f7f1e7'; x.font = 'italic 400 32px Fraunces, serif'; x.fillText('Can you make better calls?', W / 2, 1316);
    return c;
  }
  async function openShare() {
    LS.audio.sfx('tap');
    const c = await card(), url = c.toDataURL('image/png');
    layer('share', `<div class="wrap"><img src="${url}" alt="Your LINESIDE result card"><div class="report-actions" style="margin:0"><button class="btn primary" id="sNative">Share</button><a class="btn ghost" href="${url}" download="lineside-result.png">Download image</a><button class="btn ghost" id="sCopy">Copy text</button><button class="btn ghost" id="sClose">Close</button></div></div>`);
    $('#sClose').onclick = () => hide('share'); $('#sCopy').onclick = copySummary;
    $('#sNative').onclick = () => c.toBlob(async b => {
      const f = new File([b], 'lineside-result.png', { type: 'image/png' });
      try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'LINESIDE', text: summary() }); return; } if (navigator.share) { await navigator.share({ title: 'LINESIDE', text: summary(), url: shareURL() || undefined }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      download('lineside-result.png', b); toast('Image saved. Post it with your summary.');
    });
  }

  // ---------- Board (menu) ----------
  let tab = 'project';
  function openBoard(t) {
    tab = t || tab; if (world) world.paused = true;
    const r = rankOf(S.jp), toNext = r.next ? Math.round(100 * (S.jp - r.at) / (r.next.jp - r.at)) : 100;
    const body = {
      project: () => METRICS.map(m => `<div class="dash"><div class="dtop"><span class="dic" style="color:${m.color}">${ICON[m.k]}</span><b>${m.long}</b><span class="dv">${m.lfmt(S.m[m.k])}</span></div><div class="tr"><i style="width:${clamp(100 * (S.m[m.k] - Math.min(0, m.lo)) / m.bar, 0, 100)}%;background:${m.color}"></i></div><small>${m.desc}</small></div>`).join('') +
        `<div class="econ"><h4>The Vale today</h4><p>3 of 8 high-street shops open · the 41 bus, twice a day · the Kestrel Arms open Thursday to Sunday · the doctor's has moved to Kestrelford.</p><p class="hint">Watch this change as the line comes back to life.</p></div>`,
      career: () => `<div class="career"><div class="big">⚖ ${S.jp} <small>JP</small></div><div class="rk">${esc(r.name)}</div><div class="rankbar"><i style="width:${toNext}%"></i></div><small>${r.next ? `${r.next.jp - S.jp} JP to ${esc(r.next.name)}` : 'Top rank'}</small>
        <ol class="ladder">${PACK.ranks.map((k, i) => `<li class="${i <= r.i ? 'on' : ''}"><span>${esc(k.name)}</span><small>${k.jp} JP</small></li>`).join('')}</ol>
        <p class="hint">Judgment Points reward the quality of each decision (graded by experts) and, on the Calls, how well your confidence matched your call. Luck never earns JP.</p></div>
        <h4 class="bh">Achievements · ${S.ach.length}/${PACK.achievements.length}</h4><div class="badges">${PACK.achievements.map(a => { const on = S.ach.includes(a.id) || ACHG[a.id]; return `<div class="badge ${S.ach.includes(a.id) ? 'on' : on ? 'old' : ''}"><span class="ic">${on ? a.ic : '🔒'}</span><b>${esc(a.name)}</b><small>${esc(on ? a.desc : a.hint)}</small></div>`; }).join('')}</div>`,
      team: () => PACK.team.concat(['helen']).map(t => `<div class="person"><div class="face">${face(t, S.trust[t] >= 3 ? 'smile' : S.trust[t] <= 1 ? 'concern' : 'neutral')}</div><div><div class="nm">${esc(cast(t).name)}</div><div class="rl">${esc(cast(t).role)}</div></div><div class="trust" aria-label="Trust ${S.trust[t]} of 5">${[0, 1, 2, 3, 4].map(k => `<i class="${k < S.trust[t] ? 'on' : ''}"></i>`).join('')}</div></div>`).join(''),
      journal: () => {
        const d = C1.defects.filter(x => S.defects[x.id]).map(x => `<div class="jentry"><span class="gchip ${S.defects[x.id]}">${S.defects[x.id] === 'best' ? 'SPOT ON' : S.defects[x.id] === 'ok' ? 'PARTLY' : 'NOT QUITE'}</span> <b>${x.icon} ${esc(x.title)}</b><div class="pt">${esc(x.options.find(o => o.grade === S.defects[x.id]).t)}</div></div>`).join('');
        const h = C1.hotspots.filter(x => S.hotspots[x.id]).map(x => `<li>${esc(x.title)}</li>`).join('');
        const j = S.judgment.map(x => { const c = PACK.calls[x.id]; return `<div class="jentry"><span class="gchip ${x.grade}">${GRADE[x.grade].toUpperCase()}</span> <span style="font-size:12px;color:var(--muted)">${esc(x.title)}</span><div class="pn">${esc(c.principle.name)}</div><div class="pt">${esc(c.principle.text)}</div></div>`; }).join('');
        return (d ? `<h4 class="bh">Defects list</h4>${d}` : '') + (h ? `<h4 class="bh">Ruby: condition notes</h4><ul class="hl">${h}</ul>` : '') + (j ? `<h4 class="bh">Principles</h4>${j}` : '') || `<p class="hint">Your defects list, Ruby's condition notes and the principles from each Call are collected here.</p>`;
      },
      settings: () => [['sound', 'Sound & music'], ['reduced', 'Reduce motion'], ['large', 'Larger text'], ['instant', 'Show text instantly']].map(([k, l]) => `<div class="set"><span>${l}</span><button class="switch ${SET[k] ? 'on' : ''}" role="switch" aria-checked="${!!SET[k]}" data-set="${k}" aria-label="${l}"></button></div>`).join('') +
        `<div style="margin-top:24px"><button class="btn line small" id="restart">Restart Chapter 1</button></div>`
    }[tab]();
    // Learning World hook: the office board offers the Planning module (and, once it's learned, the Planning Lens).
    const learnTop = LS.Learn && tab === 'project' && boardDone && world && world.room === 'office' ? LS.Learn.boardOffer() : '';
    const el = layer('board', `<div class="drawer" role="dialog" aria-label="Project board"><div class="drawer-head"><h3>Project board</h3><button class="iconbtn" style="background:var(--paper2);color:var(--ink)" id="bClose" aria-label="Close">${ICON.close}</button></div>
      <div class="tabs">${['project', 'career', 'team', 'journal', 'settings'].map(t => `<button class="${t === tab ? 'on' : ''}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><div class="drawer-body">${learnTop}${body}</div></div>`);
    el.onclick = e => { if (e.target === el) closeBoard(); };
    $('#bClose').onclick = closeBoard;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => openBoard(b.dataset.tab));
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { SET[b.dataset.set] = !SET[b.dataset.set]; saveSet(); openBoard('settings'); });
    if (LS.Learn) LS.Learn.bindBoardOffer(el, closeBoard);
    const rs = $('#restart'); if (rs) rs.onclick = () => { if (rs.dataset.armed) { try { localStorage.removeItem(SAVE); } catch (e) { } location.reload(); } else { rs.dataset.armed = 1; rs.textContent = 'Tap again to restart'; } };
  }
  function closeBoard() { hide('board'); if (boardDone) { const f = boardDone; boardDone = null; f(); } else if (EX && world.onInteract) world.paused = false; }

  // ---------- Title / setup / educators ----------
  function title() {
    world.chapter = 0; setScene({ time: 'dusk', season: 'spring', weather: 'clear', build: 0 });
    world.attract = true; world.paused = true; world.entities = []; world.room = 'outside'; world.fitScale();
    const sv = loadSave();
    layer('title', `<div class="brandmark">Groundwork Studio presents</div><div class="logo">LINESIDE</div><div class="tagline">A game about judgment.</div>
      <p class="packline">${esc(PACK.title)}: ${esc(PACK.blurb)}</p>
      <div class="title-actions"><button class="btn primary" id="tNew">${sv ? 'New game' : 'Begin Chapter 1'}</button>${sv ? `<button class="btn ghost" id="tCont">Continue · Week ${sv.week} of 6</button>` : ''}${LS.Learn ? `<button class="btn ghost" id="tLearn">Learn: Project Planning</button>` : ''}</div>
      <div class="title-foot"><button id="tEdu">Use it with your team</button><button id="tSet">Settings</button><span>Chapter 1 · about 15–20 minutes · best with sound</span></div>`);
    $('#tNew').onclick = () => { LS.audio.init(); LS.audio.sfx('select'); setup(); };
    if (sv) $('#tCont').onclick = () => { LS.audio.init(); S = Object.assign(fresh(), sv); hide('title'); runChapter(); };
    $('#tEdu').onclick = educators;
    // Learning World hook: the Planning module from the title (progress saves separately, in lineside_learn_v1)
    if ($('#tLearn')) $('#tLearn').onclick = () => { LS.audio.init(); LS.audio.sfx('select'); hide('title'); LS.Learn.start('planning', { from: 'title', world, onExit: title }); };
    $('#tSet').onclick = () => { LS.audio.init(); openBoard('settings'); };
  }
  function setup() {
    hide('title');
    let av = PACK.defaultAvatar || 0;
    const el = layer('setup', `<div class="center-wrap"><div class="card"><div class="eyebrow">${esc(PACK.sector)} · ${esc(PACK.budgetLabel)} · Chapter 1 of 6</div>
      <h2>You've been hired to reopen the Kestrel Vale Line.</h2><p>Three miles of worn-out track, a 1961 railcar called Ruby, and a town that has heard it all before. First job: look at everything, then make the case to the Funding Panel. There are no scores on the buttons, just the calls you make.</p>
      <div class="avatars" role="radiogroup" aria-label="Choose your portrait">${PACK.avatars.map((a, i) => `<button class="avatar ${i === av ? 'sel' : ''}" role="radio" aria-checked="${i === av}" data-a="${i}" aria-label="Portrait ${i + 1}">${(LS.PORTRAIT_IMG && LS.PORTRAIT_IMG['avatar' + i]) ? `<img class="pimg" src="${LS.PORTRAIT_IMG['avatar' + i].smile || LS.PORTRAIT_IMG['avatar' + i].neutral}" alt="">` : LS.portrait(a, 'smile')}</button>`).join('')}</div>
      <label class="eyebrow" for="pname">Your name</label><input class="field" id="pname" maxlength="18" autocomplete="off" placeholder="e.g. Sam" style="margin-top:8px">
      <div class="setup-row"><button class="btn dark" id="sGo">Take the job →</button><button class="btn line small" id="sBack">Back</button></div></div></div>`);
    el.querySelectorAll('.avatar').forEach(b => b.onclick = () => { el.querySelectorAll('.avatar').forEach(x => { x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); }); b.classList.add('sel'); b.setAttribute('aria-checked', 'true'); av = +b.dataset.a; LS.audio.sfx('tap'); });
    const go = () => { S = fresh(); S.name = ($('#pname').value.trim() || 'Sam').slice(0, 18); S.avatar = av; hide('setup'); LS.audio.sfx('select'); runChapter(); };
    $('#sGo').onclick = go; $('#pname').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#sBack').onclick = () => { hide('setup'); title(); };
    setTimeout(() => $('#pname').focus(), 400);
  }
  function educators() {
    const uses = [
      ['🎓', 'Internal training', 'Give new starters and graduates the experience of a real delivery before they are responsible for one: sequencing, safety, stakeholders and gate reviews.'],
      ['🤝', 'Team building', 'Play in pairs or small teams, then compare. Why did one team get approved and another deferred? It makes for a lively 30-minute debrief.'],
      ['🧭', 'Scenario analysis', 'Every run is different. The Director throws surprises weighted by what is happening, so teams can rehearse “what would we do if…” safely.'],
      ['📚', 'Practice after a course', 'Learn project management on a course, then practise judgment here. Choices are graded against expert reasoning and named principles.']
    ];
    const el = layer('panel', `<div class="center-wrap"><div class="card edu"><div class="eyebrow">For organisations, trainers & teams</div><h2>Judgment you can practise.</h2>
      <p class="lead">LINESIDE is a serious game: fun enough to finish, and built so people take real learning away. Chapter 1 takes 15–20 minutes, runs in any browser, and needs no install and no login.</p>
      <div class="uses">${uses.map(([i, t, d]) => `<div class="use"><span class="ic">${i}</span><b>${t}</b><p>${d}</p></div>`).join('')}</div>
      <h4>How it teaches</h4><ul>
        <li><b>Go and see.</b> Players walk the track, inspect the train and listen to the town before they commit to anything.</li>
        <li><b>Real sequencing.</b> Drainage before track, bogies before brakes, tests before opening. Players find the critical path themselves.</li>
        <li><b>No numbers on the buttons.</b> Learners weigh the situation, not the scoreboard.</li>
        <li><b>Confidence ratings.</b> Calibration is scored, so overconfidence is visible and correctable.</li>
        <li><b>The Director.</b> Surprises react to the world (weather, town mood, earlier choices), and some outcomes involve luck. Learners learn to judge decisions, not outcomes.</li>
        <li><b>A real gate review.</b> The Funding Panel judges the whole body of evidence, just like a stage gate.</li></ul>
      <h4>What you get at the end</h4><p>Judgment Points and a career rank, a Judgment score (decision quality plus calibration), a real-unit project dashboard, a decision-style profile, achievements, the key lessons, a facilitator discussion guide and a CSV export.</p>
      <h4>Beyond rail</h4><p>The engine runs on scenario packs. The same mechanics carry over to construction, healthcare, public services, IT delivery and more, and bespoke packs can be built around your own projects and processes.</p>
      <h4>Privacy</h4><p>Everything runs in the browser. No data leaves the device unless the learner exports or shares it.</p>
      <div class="cta"><button class="btn dark" data-go>Close</button></div></div></div>`);
    clickGo(el);
  }

  // ---------- Boot ----------
  function boot() {
    world = new LS.World($('#world'));
    const joy = $('#joy'), knob = $('#knob'); let jid = null;
    const jmove = e => { const r = joy.getBoundingClientRect(), R = r.width / 2; let dx = e.clientX - r.left - R, dy = e.clientY - r.top - R; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } world.stick = { x: dx / R, y: dy / R }; knob.style.transform = `translate(${dx}px,${dy}px)`; };
    const jend = () => { jid = null; world.stick = { x: 0, y: 0 }; knob.style.transform = ''; };
    joy.addEventListener('pointerdown', e => { e.preventDefault(); jid = e.pointerId; try { joy.setPointerCapture(jid); } catch (err) { } jmove(e); LS.audio.init(); });
    joy.addEventListener('pointermove', e => { if (e.pointerId === jid) jmove(e); });
    joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend); joy.addEventListener('lostpointercapture', jend);
    // never let the stick stay held: any finger lift anywhere, leaving the page, or a hidden tab releases it
    addEventListener('pointerup', e => { if (e.pointerId === jid) jend(); }); addEventListener('pointercancel', e => { if (e.pointerId === jid) jend(); });
    addEventListener('touchend', e => { if (jid != null && !e.touches.length) jend(); }); addEventListener('blur', jend);
    document.addEventListener('visibilitychange', () => { if (document.hidden) jend(); });
    // act on click (after the finger lifts), so the same tap can't also dismiss the dialogue it opens
    $('#padA').addEventListener('pointerdown', e => e.preventDefault());
    $('#padA').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); world.use(); });
    applySet();
    $('#hudMenu').innerHTML = ICON.menu; $('#hudMenu').onclick = () => openBoard();
    // keep the objective arrow clear of the HUD and the touch controls
    setInterval(() => {
      if (!world) return; const r = sel => { const el = $(sel); if (!el || !el.offsetParent) return null; return el.getBoundingClientRect(); };
      const hl = r('#hud .hud-left'), hr = r('#hud .hud-right'), pd = document.body.classList.contains('exploring') && world.touch ? 150 : 0, mob = innerWidth <= 720;
      world.safe = { t: Math.max(mob && hl ? hl.bottom : 0, hr ? hr.bottom : 0) + 6, l: !mob && hl ? hl.right + 6 : 0, r: 0, b: pd };
    }, 500);
    document.addEventListener('pointerdown', () => LS.audio.init(), { once: true });
    if (LS.Learn) LS.Learn.attachWorld(world);   // Learning World hook: the Planning lamp and the Planning Lens
    title();
    LS.game = { S: () => S, stats, profile, report, card, PACK, world: () => world, refreshWorld, currentTarget, avail: id => avail(task(id)), rankOf };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
