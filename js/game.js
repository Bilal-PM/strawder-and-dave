/* LINESIDE — game engine.
 * Chapter 1 of "The Kestrel Vale Line" in an open world: walk the worn-out line, give Marjorie a health check,
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
  const JP = { talk: { best: 20, ok: 10, poor: 0 }, defect: { best: 30, ok: 15, poor: 0 }, dropin: { best: 30, ok: 10, poor: 0 }, planQ: { best: 25, ok: 12, poor: 0 }, panelQ: { best: 25, ok: 10, poor: 0 }, call: { best: 100, ok: 60, poor: 20 } };
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
    chats: {}, notes: [], memo: false, ppe: false, ach: [], introDone: false, tutorial: 0, pos: null, started: Date.now()
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
  const face = (id, mood) => id === 'player' ? LS.portrait(PACK.avatars[S.avatar], mood) : LS.portrait(cast(id).look, mood);

  // ---------- Input: one pending "advance" and one pending "choice" at a time ----------
  let onAdvance = null, onKey = null;
  document.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if ($('#board').classList.contains('on')) { if (e.key === 'Escape') closeBoard(); return; }
    if (/^[1-9]$/.test(e.key) && onKey) { const b = document.querySelector('[data-k="' + e.key + '"]'); if (b) { e.preventDefault(); b.click(); } return; }
    if ((e.key === 'Enter' || e.key === ' ') && onAdvance) { e.preventDefault(); onAdvance(); }
  });
  const live = t => { $('#live').textContent = t; };
  function layer(id, html) { if (id === 'panel' || id === 'report') hide('talk'); const el = $('#' + id); if (html !== undefined) el.innerHTML = html; el.classList.add('on'); return el; }
  const hide = id => $('#' + id).classList.remove('on');

  // ---------- Ranks, JP and achievements ----------
  function rankOf(jp) { const R = PACK.ranks; let i = 0; while (i + 1 < R.length && jp >= R[i + 1].jp) i++; return { i, name: R[i].name, at: R[i].jp, next: R[i + 1] || null }; }
  function gainJP(n, why) {
    if (!n) return;
    const before = rankOf(S.jp); S.jp = Math.max(0, S.jp + n); S.jpLog.push([why, n]);
    const el = $('#hudJQ'); hud();
    if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); const d = document.createElement('span'); d.className = 'delta'; d.textContent = (n > 0 ? '+' : '') + n + ' JP'; d.style.color = n > 0 ? '#ffe39a' : '#ffb0a6'; el.appendChild(d); setTimeout(() => d.remove(), 1700); }
    const after = rankOf(S.jp);
    if (after.i > before.i) setTimeout(() => showBadge('🎓', 'Promoted', after.name, `${S.jp} Judgment Points. Your calls are getting noticed.`), 600);
  }
  const achQ = []; let achBusy = false;
  function unlock(id) {
    if (S.ach.includes(id)) return; const a = PACK.achievements.find(a => a.id === id); if (!a) return;
    S.ach.push(id); ACHG[id] = ACHG[id] || Date.now(); saveAch(); save();
    showBadge(a.ic, 'Achievement unlocked', a.name, a.desc);
  }
  function showBadge(ic, eyebrow, name, desc) { achQ.push([ic, eyebrow, name, desc]); if (!achBusy) nextBadge(); }
  function nextBadge() {
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
    if (!mh.children.length) mh.innerHTML = METRICS.map(m => `<button class="metric" id="m_${m.k}" style="color:${m.color}" aria-label="${m.long}">${ICON[m.k]}<span class="v" style="color:var(--paper)"></span><span class="bar"><i style="background:${m.color}"></i></span></button>`).join('');
    METRICS.forEach(m => {
      const el = $('#m_' + m.k), v = S.m[m.k];
      el.querySelector('.v').textContent = m.fmt(v); el.querySelector('.bar i').style.width = clamp(100 * (v - Math.min(0, m.lo)) / m.bar, 0, 100) + '%';
      el.classList.toggle('low', m.k === 'time' ? v < 2 : m.k === 'money' ? v < 150 : v < 30);
      el.title = `${m.long}: ${m.lfmt(v)}. ${m.desc}`; el.setAttribute('aria-label', `${m.long} ${m.lfmt(v)}`);
      el.onclick = () => openBoard('project');
    });
    const r = rankOf(S.jp), jq = $('#hudJQ');
    jq.classList.add('on'); jq.innerHTML = `<b>⚖ ${S.jp}</b><span>JP · ${esc(r.name)}</span>`; jq.title = 'Judgment Points and career rank'; jq.onclick = () => openBoard('career');
  }
  function apply(e, trade) {
    if (!e) return;
    for (const [k, v] of Object.entries(e)) {
      const m = MK[k]; if (!m || !v) continue;
      S.m[k] = clamp(S.m[k] + v, m.lo, m.hi);
      if (trade) S.trade[k] = (S.trade[k] || 0) + v * (k === 'money' ? 0.1 : k === 'time' ? 3 : 1);
      const el = $('#m_' + k);
      if (el) {
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
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
    layer('chapter', `<div><div class="n">Chapter One</div><div class="t">${esc(ch.title)}</div><div class="m">${esc(ch.phase)} · ${esc(ch.when)}</div><div class="rule"></div></div>`);
    live(`Chapter 1: ${ch.title}`);
    await new Promise(res => { const t = setTimeout(go, SET.reduced ? 1500 : 3600); function go() { clearTimeout(t); onAdvance = null; res(); } onAdvance = go; $('#chapter').onclick = go; });
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
    if (c.ripple) S.ripples.push({ title: c.ripple.title, text: c.ripple.text, from: call.title, choice: c.t });
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

  // ---------- Activity: Marjorie's health check ----------
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
      if (Object.keys(S.hotspots).length === C1.hotspots.length) { await say('gaz', C1.healthDone, 'smile', null, `<div class="chips"><span class="chip pos">Health check complete</span></div>`); S.done.health = true; }
    }
  }

  // ---------- Activity: the works plan ----------
  function planBoard() {
    const PL = C1.plan, all = PL.lanes.flatMap(l => l.cards.map(c => Object.assign({ lane: l.id, color: l.color }, c)));
    const byId = Object.fromEntries(all.map(c => [c.id, c]));
    let tray = shuffle(all.map(c => c.id)), placed = { train: [], track: [] }, checks = 0, firstCorrect = null, verdict = null;
    const laneOf = id => PL.lanes.find(l => l.id === byId[id].lane);
    return new Promise(resolve => {
      const render = () => {
        const full = !tray.length;
        const laneHTML = l => {
          const tot = l.cards.reduce((a, c) => a + c.w, 0), p = placed[l.id];
          return `<div class="lane ${l.color}"><h4>${l.id === 'train' ? '🚂' : '🛤️'} ${esc(l.label)} <small>${tot} weeks</small></h4><ol>${l.cards.map((_, i) => {
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
          if (firstCorrect === null) { firstCorrect = n; const jp = Math.round(100 * n / all.length); gainJP(jp, 'Works plan · sequencing'); record('plan', 'sequence', 'Works plan: sequencing', n === all.length ? 'best' : n >= 6 ? 'ok' : 'poor', { n }); }
          if (n === all.length) { LS.audio.sfx('good'); questions(); } else { LS.audio.sfx('bad'); render(); }
        };
      };
      const questions = async () => {
        const qg = [];
        for (const [qi, q] of PL.questions.entries()) {
          const order = shuffle(q.options.map((_, i) => i));
          const tot = l => l.cards.reduce((a, c) => a + c.w, 0), [tr, tk] = PL.lanes, max = Math.max(tot(tr), tot(tk));
          const gantt = `<div class="gantt"><div class="row"><span>🚂 ${esc(tr.label)}</span><i class="ember" style="width:${100 * tot(tr) / (max + 4)}%">${tot(tr)} wk</i></div><div class="row"><span>🛤️ ${esc(tk.label)}</span><i class="teal" style="width:${100 * tot(tk) / (max + 4)}%">${tot(tk)} wk</i></div><div class="row"><span>🧪 Test runs</span><i class="gold" style="margin-left:${100 * max / (max + 4)}%;width:${100 * 4 / (max + 4)}%">?</i></div></div>`;
          const el = layer('panel', `<div class="center-wrap"><div class="card call plan"><div class="call-head"><span class="tag gold">Works plan · question ${qi + 1} of 2</span><span class="when">Project office<br>with Jo</span></div><div class="call-body">
            <h2>${qi ? 'The critical path' : 'When can Marjorie run?'}</h2>${gantt}<p class="sit">${esc(q.q)}</p>
            ${order.map((i, n) => `<button class="opt" data-k="${n + 1}" data-c="${i}"><span class="l">${'ABC'[n]}</span><span><div class="t">${esc(q.options[i].t)}</div></span></button>`).join('')}</div></div></div>`);
          el.querySelector('.call').scrollTop = 0;
          const ci = await new Promise(res => { onKey = true; el.querySelectorAll('.opt').forEach(b => b.onclick = () => res(+b.dataset.c)); });
          onKey = null; LS.audio.sfx('select');
          const o = q.options[ci], jp = JP.planQ[o.grade]; qg.push(o.grade); record('planQ', 'q' + qi, qi ? 'Works plan: critical path' : 'Works plan: when to test', o.grade); gainJP(jp, 'Works plan · ' + (qi ? 'critical path' : 'test runs'));
          LS.audio.sfx(o.grade === 'best' ? 'good' : o.grade === 'poor' ? 'bad' : 'tap');
          const el2 = layer('panel', `<div class="center-wrap"><div class="card call plan"><div class="call-head"><span class="tag ${o.grade === 'best' ? 'teal' : o.grade === 'poor' ? 'rose' : 'gold'}">Works plan · question ${qi + 1} of 2</span><span class="when">Project office<br>with Jo</span></div><div class="call-body">
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
      if (o.ripple) S.ripples.push({ title: o.ripple.title, text: o.ripple.text, from: 'The drop-in', choice: o.t });
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
      { k: 'track', nm: 'Track condition', tx: `${dBest} of 5 defects judged like an engineer`, s: (dBest + dOk * 0.5) / 5, w: 18 },
      { k: 'train', nm: 'Marjorie', tx: 'Full health check with Gaz', s: Object.keys(S.hotspots).length / 5, w: 8 },
      { k: 'plan', nm: 'Works plan', tx: `${pl.first}/${pl.of} in order first time · critical path ${cp ? 'identified' : 'unclear'}`, s: (pl.first / pl.of) * 0.55 + ((GSCORE[pl.q[0]] || 0) + (GSCORE[pl.q[1]] || 0)) * 0.225, w: 26 },
      { k: 'forecast', nm: 'Ridership forecast', tx: !f ? '—' : f.grade === 'best' ? 'Independently checked, shown as a range' : f.grade === 'ok' ? 'Halved “to be safe”, with no evidence' : 'The consultant’s headline number', s: f ? GSCORE[f.grade] : 0, w: 16 },
      { k: 'date', nm: 'Opening date', tx: !d ? '—' : d.grade === 'best' ? 'A range, narrowing at each stage' : d.grade === 'ok' ? 'No date yet' : 'A fixed date: the bank holiday', s: d ? (d.grade === 'best' ? 1 : d.grade === 'ok' ? 0.6 : 0.2) : 0, w: 10 },
      { k: 'town', nm: 'Community', tx: `${S.m.town}% town support`, s: clamp((S.m.town - 30) / 40, 0, 1), w: 12 }
    ];
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
      <p class="hint">The panel has two questions for you.</p>
      <div class="cta"><button class="btn dark" data-go>Take questions <span class="kbd" style="color:#fff">↵</span></button></div></div></div></div>`);
    await clickGo(el);
    let qs = 0;
    for (const q of PN.questions) {
      const ci = await ask(q.who, q.text, q.choices.map(c => c.t), { shuffle: true, eyebrow: 'The Funding Panel' });
      const o = q.choices[ci], jp = JP.panelQ[o.grade]; qs += o.grade === 'best' ? 5 : o.grade === 'ok' ? 2 : 0;
      record('panelQ', q.who, `Panel: ${first(q.who)}'s question`, o.grade); gainJP(jp, `Panel · ${first(q.who)}`);
      await say(q.who, o.reply, o.grade === 'best' ? 'smile' : o.grade === 'poor' ? 'concern' : 'neutral', null, `<div class="chips">${chips(null, jp)}</div>`);
    }
    const score = Math.round(rows.reduce((a, r) => a + r.s * r.w, 0) + qs);
    const key = score >= 75 ? 'approved' : score >= 50 ? 'conditions' : 'deferred', out = PN.outcomes[key];
    const weakest = rows.slice().sort((a, b) => a.s - b.s)[0];
    const COND = { track: 'a specialist track survey', train: 'a full condition report on Marjorie', plan: 'a re-baselined works plan with the critical path shown', forecast: 'an independent check of the ridership forecast', date: 'a published date range instead of a single date', town: 'a community engagement plan' };
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
    return { name: a[0], desc: a[1], low, blind: BLIND[low], lowLabel: MK[low].long };
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
    world.chapter = 0; setScene(sceneFor(S.week)); setupWorld(); hud();
    if (!S.introDone) {
      await chapterCard();
      for (const [who, text] of C1.intro) await say(who, text, 'smile');
      hide('talk'); S.introDone = true;
    }
    if (!S.tutorial) { S.tutorial = 1; await say('note', world.touch ? `Harrowby is yours to explore. Move with the joystick or tap where you want to go, and tap Ⓐ or tap a person to talk. Gold diamonds mark people to see, ? marks something to inspect, the orange ! is a Call, and blue i is an engineering note. Your list is top left. Some jobs have to wait for others, just like on a real project.` : `Harrowby is yours to explore. Walk with WASD or the arrow keys (Shift to hurry), or click where you want to go. Press E to talk or look. Gold diamonds mark people to see, ? marks something to inspect, the orange ! is a Call, and blue i is an engineering note. Your list is top left. Some jobs have to wait for others, just like on a real project.`, null, 'How to play'); hide('talk'); }
    save();
    await explore();
    await chapterEnd();
  }

  // ---------- The open world ----------
  const WD = () => PACK.world, WC = () => PACK.world.c1;
  const task = id => C1.tasks.find(t => t.id === id);
  const avail = t => !S.done[t.id] && (t.needs || []).every(n => S.done[n]);
  const holderOf = id => WC().holders[id];
  const SHORT = { induction: 'induction', walk: 'track walk', health: 'health check', dropin: 'drop-in', plan: 'works plan', forecast: 'forecast Call', date: 'date Call' };
  function setupWorld() {
    const W = WD(), wc = W.c1;
    const ents = [];
    wc.cast.forEach(c => ents.push({ kind: 'npc', id: c.id, room: c.room, x: c.x, y: c.y, home: [c.x, c.y], look: cast(c.id).look, face: c.face || 'down', team: true }));
    wc.panelCast.forEach(c => { if (c.id !== 'helen') ents.push({ kind: 'npc', id: c.id, room: c.room, x: c.x, y: c.y, look: cast(c.id).look, face: 'down', team: true, panel: true, hidden: true }); });
    Object.entries(W.town).forEach(([id, t]) => ents.push({ kind: 'npc', id, room: 'outside', x: t.at[0], y: t.at[1], home: t.at, wander: t.wander, look: t.look, town: true, face: 'down' }));
    // the drop-in audience, seated in the hall
    const aud = [['len', 180, 262], ['june', 250, 262], ['jess', 470, 262], ['dev', 540, 312], ['c1', 300, 312], ['c2', 600, 262]];
    const extra = [{ skin: '#e7bf9c', hair: '#c9c4c0', hairStyle: 'bun', top: '#7a2e3b', topStyle: 'cardigan' }, { skin: '#c28f6a', hair: '#231a16', hairStyle: 'short', top: '#34506e', topStyle: 'tee' }];
    aud.forEach(([id, x, y], k) => ents.push({ kind: 'npc', id: 'aud_' + id, room: 'hall', x, y, look: W.town[id] ? W.town[id].look : extra[k % 2], face: 'up', audience: true, hidden: !!S.done.dropin }));
    const prop = (id, room, x, y, label, extra) => ents.push(Object.assign({ kind: 'prop', id, room, x, y, label, h: 60 }, extra));
    const D = LS.WORLD.DOORS, R = LS.WORLD.ROOMS;
    prop('door_office', 'outside', D.office.x, D.office.y + 6, 'Enter the project office', { to: { room: 'office', x: 260, y: 296 }, h: 70 });
    prop('door_shed', 'outside', D.shed.x, D.shed.y + 6, 'Enter the depot', { to: { room: 'shed', x: 450, y: 392 }, h: 60 });
    prop('door_hall', 'outside', D.hall.x, D.hall.y + 6, 'Enter the village hall', { to: { room: 'hall', x: 380, y: 404 }, h: 70 });
    prop('exit_office', 'office', 260, 318, 'Leave', { to: { room: 'outside', x: R.office.exitTo.x, y: R.office.exitTo.y }, h: 30 });
    prop('exit_hall', 'hall', 380, 428, 'Leave', { to: { room: 'outside', x: R.hall.exitTo.x, y: R.hall.exitTo.y }, h: 30 });
    prop('exit_shed', 'shed', 450, 418, 'Leave', { to: { room: 'outside', x: R.shed.exitTo.x, y: R.shed.exitTo.y }, h: 30 });
    prop('noticeboard', 'outside', 925, 1402, 'Read the noticeboard', { h: 70 });
    prop('station', 'outside', 1282, 1044, 'Look at the station', { h: 110 });
    prop('depot', 'outside', 1520, 1086, 'Look at the depot', { h: 130 });
    prop('buffer', 'outside', 1276, 916, 'The buffer stop', { h: 40 });
    prop('signalbox', 'outside', 3160, 1030, 'Visit the signal box', { h: 110 });
    prop('crag', 'outside', 2430, 350, 'Kestrel Crag viewpoint', { h: 40 });
    prop('cottage', 'outside', 1586, 574, 'Beck Cottage', { h: 90 });
    prop('packhorse', 'outside', LS.WORLD.riverX(2008) + 70, 2030, 'The packhorse bridge', { h: 40 });
    prop('board', 'office', 300, 112, 'Project board', { h: 20 });
    prop('lockers', 'office', 470, 112, 'PPE locker', { h: 20 });
    prop('kettle', 'office', 70, 164, 'Make a brew', { h: 50 });
    prop('urn', 'hall', 92, 176, 'Tea urn', { h: 60 });
    prop('table', 'hall', 380, 176, 'The Funding Panel', { h: 50, hidden: true });
    prop('workbench', 'shed', 850, 248, "Gaz's workbench", { h: 60 });
    prop('cushions', 'shed', 120, 350, 'Seat cushions', { h: 40 });
    const spots = wc.catSpots; S.flags.catSpot = S.flags.catSpot ?? Math.floor(Math.random() * spots.length);
    const cs = spots[S.flags.catSpot]; ents.push({ kind: 'cat', id: 'cat', room: 'shed', x: cs[0], y: cs[1], h: 30 });
    wc.notes.forEach(n => ents.push({ kind: 'note', id: n.id, room: 'outside', x: n.x, y: n.y, h: 50, n }));
    if (!S.memo) ents.push({ kind: 'memo', id: 'memo', room: wc.memo.room, x: wc.memo.x, y: wc.memo.y, h: 26 });
    C1.defects.forEach(d => ents.push({ kind: 'defect', id: 'd_' + d.id, room: 'outside', x: d.x, y: 902, h: 40, d }));
    C1.hotspots.forEach(h => ents.push({ kind: 'hotspot', id: 'h_' + h.id, room: 'shed', x: h.x, y: 254, h: 130, hs: h }));
    world.entities = ents; world.hallBanner = wc.hallBanner; world.ppe = !!S.ppe;
    world.flags = { pigeonGone: !!S.flags.pigeonGone, planned: !!S.done.plan, panel: false };
    world.player.look = PACK.avatars[S.avatar]; world.attract = false; world.paused = true;
    const sp = S.pos || wc.spawn; world.place(sp.room, sp.x, sp.y);
    EX = { wc };
    world.onBlocked = why => toast(W.blocked[why] || 'You can’t go that way.');
    refreshWorld();
  }
  // What should the player do next, and where is it?
  function currentTarget() {
    const wc = WC();
    for (const t of C1.tasks) {
      if (!avail(t)) continue;
      if (t.id === 'walk' && S.flags.walkOn) { const d = C1.defects.find(d => !S.defects[d.id]); if (d) return { task: t, room: 'outside', x: d.x, y: 902, label: d.title }; }
      if (t.id === 'health' && S.flags.healthOn) { const h = C1.hotspots.find(h => !S.hotspots[h.id]); if (h) return { task: t, room: 'shed', x: h.x, y: 254, label: h.label }; }
      if (t.id === 'panel') return { task: t, room: 'hall', x: 380, y: 176, label: 'Funding Panel' };
      const who = holderOf(t.id), c = world.entities.find(e => e.kind === 'npc' && e.id === who && !e.hidden);
      if (c) return { task: t, room: c.room, x: c.x, y: c.y, label: first(who) };
    }
    return null;
  }
  function refreshWorld() {
    if (!EX) return;
    const tgt = currentTarget(), panelOn = avail(task('panel'));
    world.ppe = !!S.ppe;
    for (const e of world.entities) {
      e.marker = null;
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
        if (e.id === 'helen') { const inHall = panelOn; e.room = inHall ? 'hall' : 'outside'; e.x = inHall ? 380 : e.home[0]; e.y = inHall ? 182 : e.home[1]; e.face = 'down'; }
        const tid = Object.keys(WC().holders).find(k => WC().holders[k] === e.id && !S.done[k]);
        const t = tid && task(tid);
        if (e.id === 'helen' && panelOn) { e.prompt = 'Begin the Funding Panel'; e.marker = 'task'; }
        else if (t && avail(t)) {
          const inProg = (tid === 'walk' && S.flags.walkOn) || (tid === 'health' && S.flags.healthOn);
          if (PACK.calls[tid]) { e.prompt = `The Call · ${PACK.calls[tid].title}`; e.marker = 'call'; }
          else if (inProg) e.prompt = `Talk to ${first(e.id)}`;
          else { e.prompt = `Talk to ${first(e.id)}`; e.marker = 'task'; }
        } else e.prompt = e.id === 'moira' ? 'Ask Moira' : `Chat with ${first(e.id)}`;
        continue;
      }
      if (e.town) e.prompt = `Chat with ${first(e.id)}`;
    }
    world.objective = tgt ? { room: tgt.room, x: tgt.x, y: tgt.y, label: tgt.room !== world.room && world.room === 'outside' ? ({ office: 'Project office', hall: 'Village hall', shed: 'Depot' })[tgt.room] : tgt.label } : null;
    // objective list
    const nextId = tgt && tgt.task.id;
    let doneN = 0, lockedN = 0, shownLocked = false;
    const items = [];
    C1.tasks.forEach(t => {
      const d = !!S.done[t.id], a = avail(t);
      if (d) { doneN++; return; }
      let sub = t.where;
      if (t.id === 'walk' && S.flags.walkOn) sub = `${Object.keys(S.defects).length}/5 defects judged`;
      if (t.id === 'health' && S.flags.healthOn) sub = `${Object.keys(S.hotspots).length}/5 checks done`;
      if (!a) { lockedN++; if (shownLocked) return; shownLocked = true; sub = 'after the ' + t.needs.filter(n => !S.done[n]).map(n => SHORT[n]).join(', '); }
      items.push(`<li class="${t.id === nextId ? 'next' : a ? '' : 'locked'}"><span class="bx">${a ? '' : '🔒'}</span><span><b>${esc(t.label)}</b><small>${esc(sub)}</small></span></li>`);
    });
    if (doneN || lockedN > 1) items.unshift(`<li class="sum"><span class="bx">✓</span><span><small>${doneN} of ${C1.tasks.length} done${lockedN > 1 ? ` · ${lockedN - 1} more unlock as you go` : ''}</small></span></li>`);
    $('#obj').innerHTML = items.join('') + `<li class="memo"><span class="bx">✎</span><span><small>Notes ${S.notes.length}/${WC().notes.length} · Badges ${S.ach.length}/${PACK.achievements.length}</small></span></li>`;
  }
  function pad(on) { document.body.classList.toggle('exploring', !!on); }
  function explore() {
    world.paused = false; pad(true); refreshWorld();
    return new Promise(resolve => {
      world.onEnterRoom = () => { refreshWorld(); save(); };
      world.onInteract = async e => {
        if (e.to && !(e.id === 'door_shed' && !S.ppe)) { world.enter(e.to.room, e.to.x, e.to.y); LS.audio.sfx('page'); return; }
        world.paused = true; pad(false);
        try { await handle(e); } catch (err) { console.error(err); }
        hide('talk'); hide('panel'); refreshWorld(); updateWeek(); refreshWorld(); save();
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
    helen: `Get Steve's numbers straight first. Then come and give me my poster date.`
  };
  async function handle(e) {
    const W = WD(), wc = W.c1;
    if (e.id === 'door_shed') { await say('gaz', `(through the door) Hi-vis and boots in the depot, please! See Hannah in the project office for your induction.`); return; }
    if (e.kind === 'memo') {
      S.memo = true; e.hidden = true; LS.audio.sfx('good'); unlock('page');
      await say('note', `“${wc.memoText}”`, null, 'A loose page, tucked under the gate'); return;
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
    if (e.kind === 'defect') { if (S.defects[e.d.id]) { await say('note', `Already in the defects list. ${e.d.options.find(o => o.grade === S.defects[e.d.id]).t}`, null, e.d.title); return; } await defectCard(e.d); return; }
    if (e.kind === 'hotspot') { await hotspot(e.hs); return; }
    if (e.kind === 'prop') {
      const I = W.inspect;
      if (e.id === 'kettle') {
        if (!S.flags.kettle) { S.flags.kettle = true; apply({ team: 2 }, false); await say('note', `You make a round of tea. Steve wants his “builder's”. Jo wants hers “as a concept”. Nobody says thank you, and everybody notices.`, null, 'The kettle'); unlock('kettle'); }
        else await say('note', `You've had three cups. Your hands are doing a little dance.`, null, 'The kettle');
        return;
      }
      if (e.id === 'lockers') { if (!S.ppe) await say('hannah', `Induction first, then kit. That's the rule, and I'm the rule.`); else await say('note', I.lockers, null, 'PPE locker'); return; }
      if (e.id === 'board') { await new Promise(res => { boardDone = res; openBoard('project'); }); return; }
      if (e.id === 'table') { if (avail(task('panel'))) await panelReview(); return; }
      const txt = { noticeboard: () => I.noticeboard(S.m), station: () => I.station, depot: () => I.depot, signalbox: () => I.signalbox, cottage: () => I.cottage, packhorse: () => I.packhorse, crag: () => I.crag, buffer: () => I.buffer, urn: () => I.urn, workbench: () => I.workbench, cushions: () => I.cushions }[e.id];
      if (txt) await say('note', txt(), null, e.label);
      return;
    }
    if (e.kind !== 'npc') return;
    if (e.panel || (e.id === 'helen' && avail(task('panel')))) { await panelReview(); return; }
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
      S.done.induction = true; S.ppe = true; world.ppe = true; LS.audio.sfx('select'); toast('PPE on · the old trackbed and the depot are now open to you');
      return;
    }
    if (id === 'walk') {
      if (!S.flags.walkOn) { await talk(C1.talks.tom_walk, 'tom_walk'); S.flags.walkOn = true; toast('Five defects to find along the line · look for ?'); }
      else await say('tom', `Water, wood, weeds, stone and people. You've got ${5 - Object.keys(S.defects).length} still to find. Follow the line east.`, 'smile');
      return;
    }
    if (id === 'health') {
      if (!S.flags.healthOn) { await talk(C1.talks.gaz_tour, 'gaz_tour'); S.flags.healthOn = true; toast('Check five areas of Marjorie · look for ?'); }
      else await say('gaz', `Have a proper look round her. ${5 - Object.keys(S.hotspots).length} to go.`, 'smile');
      return;
    }
    if (id === 'plan') {
      await say('jo', C1.plan.intro, 'smile');
      await planBoard(); hide('panel');
      S.done.plan = true; world.flags.planned = true; apply({ evidence: 8, team: 3 }, true);
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
        <div class="arch"><div class="rank">${esc(r.name)} · ${S.jp} JP</div><div class="rankbar"><i style="width:${toNext}%"></i></div><small class="rnext">${r.next ? `${r.next.jp - S.jp} JP to ${esc(r.next.name)}` : 'Top rank'}</small><h2>${pf.name}</h2><p>${pf.desc}</p><div class="blind">Watch out for: ${pf.blind}</div></div></div>
      <div class="rgrid">
        <div class="card rcard"><h3>The project dashboard</h3>${METRICS.map(m => { const d = S.m[m.k] - START[m.k]; return `<div class="mrow"><span class="nm">${m.long}</span><span class="tr"><i style="width:${clamp(100 * (S.m[m.k] - Math.min(0, m.lo)) / m.bar, 0, 100)}%;background:${m.color}"></i></span><span class="v">${m.fmt(S.m[m.k])}</span><span class="dv ${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}">${d ? (d > 0 ? '+' : '−') + (m.k === 'money' ? '£' + Math.abs(d) + 'k' : Math.abs(d)) : '·'}</span></div>`; }).join('')}</div>
        <div class="card rcard"><h3>How you judged</h3><p>Judgment <b>${st.score}</b>: ${st.best} of ${st.n} decisions matched the expert call. ${calib}</p><p class="hint" style="margin-top:10px">Judgment Points reward the quality of each decision, never luck. The dashboard shows outcomes, and outcomes include luck.</p></div>
      </div>
      <div class="card rcard" style="margin-bottom:16px"><h3>Your decisions</h3>
        ${drow('Conversations with the team', byKind('talk'))}${drow('Track walk: judging the defects', byKind('defect'))}${drow('Works plan: sequence & critical path', byKind('plan').concat(byKind('planQ')))}${drow('The drop-in: answering Harrowby', byKind('dropin'))}
        ${S.judgment.map(x => { const cf = CONF.find(c => c.v === x.conf); return `<div class="callrow"><span class="tt">The Call: ${esc(x.title)}</span><span class="cf">${cf ? cf.ic + ' ' + cf.lb : ''}</span><span class="gchip ${x.grade}">${GRADE[x.grade].toUpperCase()}</span></div>`; }).join('')}
        ${drow('The Funding Panel’s questions', byKind('panelQ'))}</div>
      <div class="card rcard" style="margin-bottom:16px"><h3>Achievements · ${S.ach.length} of ${PACK.achievements.length} this run</h3><div class="badges">${PACK.achievements.map(a => `<div class="badge ${S.ach.includes(a.id) ? 'on' : ACHG[a.id] ? 'old' : ''}"><span class="ic">${S.ach.includes(a.id) || ACHG[a.id] ? a.ic : '🔒'}</span><b>${esc(a.name)}</b><small>${esc(S.ach.includes(a.id) || ACHG[a.id] ? a.desc : a.hint)}</small></div>`).join('')}</div></div>
      <div class="card rcard" style="margin-bottom:16px"><h3>Take these to your next project</h3>${lessons().map(([n, t]) => `<div class="lesson"><div class="pn">${esc(n)}</div><p>${esc(t)}</p></div>`).join('')}</div>
      ${S.ripples.length ? `<div class="card rcard echoes" style="margin-bottom:16px"><h3>⏳ Echoes: these will come back in Chapter 2</h3>${S.ripples.map(r => `<div class="lesson"><div class="pn">${esc(r.title)}</div><p>From ${esc(r.from)}: “${esc(r.choice)}”</p></div>`).join('')}</div>` : ''}
      <div class="card finale"><div class="face">${face('moira', 'smile')}</div><div><div class="eyebrow" style="color:var(--gold)">Moira Kell</div><p style="margin-top:8px">“${fill(C1.end[key])}”</p>${S.memo ? `<p>“${fill(C1.end.secret)}”</p>` : `<p class="dim">(Somebody in this valley keeps a log. You didn't find it this time.)</p>`}</div></div>
      <details class="card rcard" style="margin-bottom:16px"><summary style="cursor:pointer;font-weight:700">For facilitators: discussion guide</summary><ol class="discuss" style="margin-top:12px">
        <li><b>Look before you promise.</b> What did the track walk and the health check tell you that no report could?</li>
        <li><b>Sequencing.</b> Why must the drainage come before the new track, and the bogies before the brakes? Where have you seen work done in the wrong order?</li>
        <li><b>The critical path.</b> Marjorie had four weeks of float. What should you do with float, and who should know it exists?</li>
        ${S.judgment.map(x => `<li><b>${esc(x.title)}.</b> ${esc(PACK.calls[x.id].discuss)}</li>`).join('')}
        <li><b>The drop-in.</b> When is “I don't know yet” the strongest answer you can give?</li></ol></details>
      <div class="report-actions">
        <button class="btn primary" id="rNext">What's next →</button>
        <button class="btn ghost" id="rShare">Share my result</button>
        <button class="btn ghost" id="rCopy">Copy summary</button>
        <button class="btn ghost" id="rCSV">Download results (CSV)</button>
        <button class="btn ghost" id="rAgain">Replay Chapter 1</button>
      </div></div>`;
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
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
  function copySummary() {
    const txt = summary(), ok = () => toast('Copied. Paste it anywhere.');
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, () => fallback(txt, ok)); else fallback(txt, ok);
  }
  function fallback(txt, ok) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { } ta.remove(); }
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function exportCSV() {
    const st = stats(), pf = profile();
    const rows = [['player', 'pack', 'chapter', 'kind', 'decision', 'grade', 'confidence']];
    S.graded.forEach(x => rows.push([S.name, PACK.id, 1, x.kind, x.title, x.grade, x.conf == null ? '' : x.conf]));
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
        return (d ? `<h4 class="bh">Defects list</h4>${d}` : '') + (h ? `<h4 class="bh">Marjorie: condition notes</h4><ul class="hl">${h}</ul>` : '') + (j ? `<h4 class="bh">Principles</h4>${j}` : '') || `<p class="hint">Your defects list, Marjorie's condition notes and the principles from each Call are collected here.</p>`;
      },
      settings: () => [['sound', 'Sound & music'], ['reduced', 'Reduce motion'], ['large', 'Larger text'], ['instant', 'Show text instantly']].map(([k, l]) => `<div class="set"><span>${l}</span><button class="switch ${SET[k] ? 'on' : ''}" role="switch" aria-checked="${!!SET[k]}" data-set="${k}" aria-label="${l}"></button></div>`).join('') +
        `<div style="margin-top:24px"><button class="btn line small" id="restart">Restart Chapter 1</button></div>`
    }[tab]();
    const el = layer('board', `<div class="drawer" role="dialog" aria-label="Project board"><div class="drawer-head"><h3>Project board</h3><button class="iconbtn" style="background:var(--paper2);color:var(--ink)" id="bClose" aria-label="Close">${ICON.close}</button></div>
      <div class="tabs">${['project', 'career', 'team', 'journal', 'settings'].map(t => `<button class="${t === tab ? 'on' : ''}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><div class="drawer-body">${body}</div></div>`);
    el.onclick = e => { if (e.target === el) closeBoard(); };
    $('#bClose').onclick = closeBoard;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => openBoard(b.dataset.tab));
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { SET[b.dataset.set] = !SET[b.dataset.set]; saveSet(); openBoard('settings'); });
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
      <div class="title-actions"><button class="btn primary" id="tNew">${sv ? 'New game' : 'Begin Chapter 1'}</button>${sv ? `<button class="btn ghost" id="tCont">Continue · Week ${sv.week} of 6</button>` : ''}</div>
      <div class="title-foot"><button id="tEdu">For educators & teams</button><button id="tSet">Settings</button><span>Chapter 1 · about 15–20 minutes · best with sound</span></div>`);
    $('#tNew').onclick = () => { LS.audio.init(); LS.audio.sfx('select'); setup(); };
    if (sv) $('#tCont').onclick = () => { LS.audio.init(); S = Object.assign(fresh(), sv); hide('title'); runChapter(); };
    $('#tEdu').onclick = educators;
    $('#tSet').onclick = () => { LS.audio.init(); openBoard('settings'); };
  }
  function setup() {
    hide('title');
    let av = 0;
    const el = layer('setup', `<div class="center-wrap"><div class="card"><div class="eyebrow">${esc(PACK.sector)} · ${esc(PACK.budgetLabel)} · Chapter 1 of 6</div>
      <h2>You've been hired to reopen the Kestrel Vale Line.</h2><p>Three miles of worn-out track, a 1961 railcar called Marjorie, and a town that has heard it all before. First job: look at everything, then make the case to the Funding Panel. There are no scores on the buttons, just the calls you make.</p>
      <div class="avatars" role="radiogroup" aria-label="Choose your portrait">${PACK.avatars.map((a, i) => `<button class="avatar ${i === 0 ? 'sel' : ''}" role="radio" aria-checked="${i === 0}" data-a="${i}" aria-label="Portrait ${i + 1}">${LS.portrait(a, 'smile')}</button>`).join('')}</div>
      <label class="eyebrow" for="pname">Your name</label><input class="field" id="pname" maxlength="18" autocomplete="off" placeholder="e.g. Sam" style="margin-top:8px">
      <div class="setup-row"><button class="btn dark" id="sGo">Take the job →</button><button class="btn line small" id="sBack">Back</button></div></div></div>`);
    el.querySelectorAll('.avatar').forEach(b => b.onclick = () => { el.querySelectorAll('.avatar').forEach(x => { x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); }); b.classList.add('sel'); b.setAttribute('aria-checked', 'true'); av = +b.dataset.a; LS.audio.sfx('tap'); });
    const go = () => { S = fresh(); S.name = ($('#pname').value.trim() || 'Sam').slice(0, 18); S.avatar = av; hide('setup'); LS.audio.sfx('select'); runChapter(); };
    $('#sGo').onclick = go; $('#pname').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#sBack').onclick = () => { hide('setup'); title(); };
    setTimeout(() => $('#pname').focus(), 400);
  }
  function educators() {
    const el = layer('panel', `<div class="center-wrap"><div class="card edu"><div class="eyebrow">For educators, L&D and teams</div><h2>Judgment you can practise.</h2>
      <p>LINESIDE turns the hardest part of professional work, making calls under uncertainty, into a story people actually want to finish, followed by a debrief that sticks. Chapter 1 takes 15–20 minutes.</p>
      <h4>How it teaches</h4><ul>
        <li><b>Go and see.</b> Players walk the track, inspect the train and hear from the town before they commit to anything.</li>
        <li><b>Real sequencing.</b> Players order the works (drainage before track, bogies before brakes) and find the critical path.</li>
        <li><b>No numbers on the buttons.</b> Learners weigh the situation, not the scoreboard.</li>
        <li><b>Confidence ratings.</b> Calibration is scored, so overconfidence is visible and correctable.</li>
        <li><b>Echoes.</b> Some promises come back in later chapters, which teaches learners to judge decisions, not outcomes.</li>
        <li><b>A gate review.</b> The Funding Panel judges the whole case, like a real stage gate.</li></ul>
      <h4>What's measured</h4><p>Judgment Points and career rank (decision quality plus calibration), a real-unit project dashboard, a decision-style profile and a discussion guide.</p>
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
    joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
    $('#padA').addEventListener('pointerdown', e => { e.preventDefault(); world.use(); });
    applySet();
    $('#hudMenu').innerHTML = ICON.menu; $('#hudMenu').onclick = () => openBoard();
    document.addEventListener('pointerdown', () => LS.audio.init(), { once: true });
    title();
    LS.game = { S: () => S, stats, profile, report, card, PACK, world: () => world, refreshWorld, currentTarget, avail: id => avail(task(id)), rankOf };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
