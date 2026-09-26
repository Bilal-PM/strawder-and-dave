/* LINESIDE — game engine.
 * Plays a scenario pack (js/packs/*.js) as a cinematic narrative:
 * chapter card → ripples → story beats → team conversations → The Call(s) → chapter close.
 * Judgment is measured on two axes: decision quality (vs. an expert grading) and
 * calibration (stated confidence vs. how good the call was).
 */
(function () {
  const PACK = LS.PACKS['kestrel-vale'];
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ORD = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

  const ICON = {
    schedule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    budget: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15.5 6.5A4 4 0 0 0 8.5 9v3m0 0v5h8M6.5 12h6"/></svg>',
    safety: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/></svg>',
    quality: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    morale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 1.8 6 5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  const METRICS = [
    { k: 'schedule', label: 'Time', color: '#7cc3e6' }, { k: 'budget', label: 'Money', color: '#e9c46a' },
    { k: 'safety', label: 'Safety', color: '#ef8a7a' }, { k: 'quality', label: 'Quality', color: '#9fb6f5' },
    { k: 'morale', label: 'People', color: '#9ad3a8' }
  ];
  const GRADE = { best: 'Expert call', ok: 'Defensible', poor: 'Risky call' };
  const GSCORE = { best: 1, ok: 0.5, poor: 0 };
  const CONF = [{ v: 0.5, ic: '🪙', lb: 'Coin flip', pc: '50% sure' }, { v: 0.7, ic: '👍', lb: 'Fairly sure', pc: '70% sure' }, { v: 0.9, ic: '🎯', lb: 'Certain', pc: '90% sure' }];

  // ---------- State ----------
  const fresh = () => ({
    name: 'Sam', avatar: 0, ch: 0,
    m: { schedule: 70, budget: 70, safety: 70, quality: 70, morale: 70 },
    trust: Object.fromEntries(PACK.team.map(t => [t, 2])),
    judgment: [], ripples: [], trade: {}, talks: [], goodRipples: 0, started: Date.now()
  });
  let S = fresh();
  const SET = Object.assign({ sound: true, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, large: false, instant: false },
    (() => { try { return JSON.parse(localStorage.getItem('lineside_settings')) || {}; } catch (e) { return {}; } })());
  const saveSet = () => { try { localStorage.setItem('lineside_settings', JSON.stringify(SET)); } catch (e) { } applySet(); };
  function applySet() {
    document.body.classList.toggle('reduced', !!SET.reduced);
    document.body.classList.toggle('large-text', !!SET.large);
    if (scene) scene.reduced = !!SET.reduced;
    LS.audio.toggle(!!SET.sound);
  }

  const fill = t => String(t).replace(/\{name\}/g, esc(S.name));
  const cast = id => PACK.cast[id] || { name: '', role: '' };
  const face = (id, mood) => id === 'player' ? LS.portrait(PACK.avatars[S.avatar], mood) : LS.portrait(cast(id).look, mood);

  // ---------- Input: one pending "advance" and one pending "choice" at a time ----------
  let onAdvance = null, onKey = null;
  document.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if ($('#board').classList.contains('on') && e.key !== 'Escape') return;
    if (/^[1-9]$/.test(e.key) && onKey) { const b = document.querySelector('[data-k="' + e.key + '"]'); if (b) { e.preventDefault(); b.click(); } return; }
    if ((e.key === 'Enter' || e.key === ' ') && onAdvance) { e.preventDefault(); onAdvance(); }
    if (e.key === 'Escape' && $('#board').classList.contains('on')) closeBoard();
  });
  const live = t => { $('#live').textContent = t; };

  function layer(id, html) {
    const el = $('#' + id);
    if (html !== undefined) el.innerHTML = html;
    el.classList.add('on');
    return el;
  }
  const hide = id => $('#' + id).classList.remove('on');

  // ---------- HUD ----------
  function hud(on) {
    const h = $('#hud');
    if (on === false) { h.classList.remove('on'); return; }
    h.classList.add('on');
    const ch = PACK.chapters[Math.min(S.ch, PACK.chapters.length - 1)];
    $('#hudCh').innerHTML = `<div class="eyebrow">Chapter ${S.ch + 1} · Week ${ch.week} · ${ch.month}</div><div class="t">${esc(ch.title)}</div>`;
    const mh = $('#hudMetrics');
    if (!mh.children.length) mh.innerHTML = METRICS.map(m => `<div class="metric" id="m_${m.k}" style="color:${m.color}" title="${m.label}" aria-label="${m.label}">${ICON[m.k]}<span class="v" style="color:var(--paper)">70</span><span class="bar"><i style="background:${m.color}"></i></span></div>`).join('');
    METRICS.forEach(m => {
      const el = $('#m_' + m.k), v = S.m[m.k];
      el.querySelector('.v').textContent = v; el.querySelector('.bar i').style.width = v + '%';
      el.classList.toggle('low', v < 35); el.setAttribute('aria-label', m.label + ' ' + v);
    });
    const st = stats(true), jq = $('#hudJQ');
    if (st) { jq.classList.add('on'); jq.innerHTML = `⚖ ${st.score}`; jq.title = 'Judgment score'; } else jq.classList.remove('on');
  }
  function apply(e, trade) {
    if (!e) return;
    for (const [k, v] of Object.entries(e)) {
      if (S.m[k] === undefined || !v) continue;
      S.m[k] = Math.max(0, Math.min(100, S.m[k] + v));
      if (trade) S.trade[k] = (S.trade[k] || 0) + v;
      const el = $('#m_' + k);
      if (el) {
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        const d = document.createElement('span'); d.className = 'delta'; d.textContent = (v > 0 ? '+' : '') + v; d.style.color = v > 0 ? '#9ff0bf' : '#ffb0a6';
        el.appendChild(d); setTimeout(() => d.remove(), 1700);
      }
    }
    hud();
  }
  function chips(e) {
    const names = Object.fromEntries(METRICS.map(m => [m.k, m.label]));
    const p = Object.entries(e || {}).filter(([k, v]) => names[k] && v).map(([k, v]) => `<span class="chip ${v > 0 ? 'pos' : 'neg'}">${v > 0 ? '+' : ''}${v} ${names[k]}</span>`);
    return p.length ? p.join('') : '<span class="chip">No immediate change</span>';
  }

  // ---------- Story beats ----------
  function typewrite(el, text) {
    return new Promise(done => {
      if (SET.instant || SET.reduced) { el.textContent = text; done(); return; }
      let i = 0; el.textContent = '';
      const iv = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(iv); done(); } }, 16);
      el._finish = () => { clearInterval(iv); el.textContent = text; done(); };
    });
  }
  async function say(who, text, mood) {
    text = fill(text); live((who === 'narrator' ? '' : cast(who).name + ': ') + text);
    LS.audio.sfx('page');
    if (who === 'narrator') {
      layer('talk', `<div class="narr" role="button" tabindex="0"><div class="tx"></div><div class="next"><span class="arrow">▼</span> Tap or press Enter</div></div>`);
    } else {
      const c = cast(who);
      layer('talk', `<div class="dlg card"><div class="who"><div class="face">${face(who, mood || 'neutral')}</div><div><div class="nm">${esc(c.name)}</div><div class="rl">${esc(c.role)}</div></div></div><div class="tx serif"></div><div class="next"><span>Continue</span> <span class="kbd">↵</span><span class="arrow">▶</span></div></div>`);
    }
    const box = $('#talk').firstElementChild, tx = box.querySelector('.tx');
    let typing = true; const p = typewrite(tx, text).then(() => { typing = false; });
    await new Promise(res => {
      const go = () => { if (typing && tx._finish) { tx._finish(); return; } onAdvance = null; res(); };
      onAdvance = go; box.addEventListener('click', go);
    });
    await p; LS.audio.sfx('tap');
  }
  async function talk(t, id) {
    const c = cast(t.who);
    layer('talk', `<div class="dlg card"><div class="who"><div class="face">${face(t.who)}</div><div><div class="nm">${esc(c.name)}</div><div class="rl">${esc(c.role)}</div></div></div><div class="tx serif"></div><div class="choices" style="visibility:hidden"></div></div>`);
    const box = $('#talk .dlg'), tx = box.querySelector('.tx'), ch = box.querySelector('.choices');
    live(c.name + ': ' + fill(t.text));
    let done = false; const p = typewrite(tx, fill(t.text)).then(() => { done = true; });
    box.addEventListener('click', () => { if (!done && tx._finish) tx._finish(); }, { once: true });
    await p;
    ch.innerHTML = t.choices.map((o, i) => `<button class="choice" data-k="${i + 1}"><span class="kbd">${i + 1}</span><span>${fill(o.t)}</span></button>`).join('');
    ch.style.visibility = 'visible'; ch.querySelector('button').focus({ preventScroll: true });
    const ci = await new Promise(res => { onKey = true; ch.querySelectorAll('button').forEach((b, i) => b.onclick = e => { e.stopPropagation(); res(i); }); });
    onKey = null; LS.audio.sfx('select');
    const o = t.choices[ci];
    apply(o.e, true);
    if (o.trust) S.trust[t.who] = Math.max(0, Math.min(5, S.trust[t.who] + o.trust));
    S.talks.push({ id, ci });
    const mood = o.trust > 0 ? 'smile' : o.trust < 0 ? 'concern' : 'neutral';
    const trustLine = o.trust > 0 ? `${c.name.split(' ')[0]} will remember that.` : o.trust < 0 ? `${c.name.split(' ')[0]} seems a little less sure of you.` : '';
    layer('talk', `<div class="dlg card"><div class="who"><div class="face">${face(t.who, mood)}</div><div><div class="nm">${esc(c.name)}</div><div class="rl">${esc(c.role)}</div></div></div><div class="tx serif"></div><div class="chips">${chips(o.e)}</div>${trustLine ? `<div class="trustnote">${trustLine}</div>` : ''}<div class="next"><span>Continue</span> <span class="kbd">↵</span><span class="arrow">▶</span></div></div>`);
    const b2 = $('#talk .dlg'), t2 = b2.querySelector('.tx');
    let typing = true; typewrite(t2, fill(o.reply)).then(() => typing = false);
    await new Promise(res => { const go = () => { if (typing && t2._finish) { t2._finish(); return; } onAdvance = null; res(); }; onAdvance = go; b2.addEventListener('click', go); });
    hide('talk');
  }

  // ---------- Chapter cards ----------
  async function chapterCard(ch, i) {
    hide('talk'); LS.audio.sfx('chapter');
    layer('chapter', `<div><div class="n">Chapter ${ORD[i] || i + 1}</div><div class="t">${esc(ch.title)}</div><div class="m">${esc(ch.phase)} · ${esc(ch.month)} · Week ${ch.week} of 40</div><div class="rule"></div></div>`);
    live(`Chapter ${i + 1}: ${ch.title}`);
    await new Promise(res => { const t = setTimeout(go, SET.reduced ? 1500 : 3600); function go() { clearTimeout(t); onAdvance = null; res(); } onAdvance = go; $('#chapter').onclick = go; });
    hide('chapter');
  }
  async function chapterEnd(ch, i, start) {
    const d = {}; for (const k in S.m) if (S.m[k] !== start[k]) d[k] = S.m[k] - start[k];
    const el = layer('panel', `<div class="center-wrap"><div class="card chend"><div class="eyebrow">End of chapter ${i + 1}</div><h3>${esc(ch.title)}</h3><div class="chips" style="justify-content:center">${chips(d)}</div>
      <div class="moira-q"><div class="face">${face('moira')}</div><p>“${fill(ch.moira)}”</p></div>
      <div class="cta" style="justify-content:center"><button class="btn dark" data-go>Continue <span class="kbd" style="color:#fff">↵</span></button></div></div></div>`);
    await clickGo(el);
  }
  function clickGo(el) {
    return new Promise(res => { const b = el.querySelector('[data-go]'); b.focus({ preventScroll: true }); const go = () => { onAdvance = null; LS.audio.sfx('tap'); hide(el.id); res(); }; b.onclick = go; onAdvance = go; });
  }

  // ---------- The Call ----------
  function head(call, i, tag) {
    const ch = PACK.chapters[i];
    const n = Object.keys(PACK.calls).indexOf(call.id) + 1;
    return `<div class="call-head"><span class="tag ${tag || ''}">The Call · ${n}/${Object.keys(PACK.calls).length}</span><span class="when">Chapter ${i + 1} · Week ${ch.week}<br>${esc(ch.phase)}</span></div>`;
  }
  async function doCall(id, i) {
    const call = Object.assign({ id }, PACK.calls[id]);
    hide('talk'); LS.audio.sfx('page');
    const order = call.choices.map((_, k) => k).sort(() => Math.random() - 0.5);
    const from = call.from ? `<div class="from"><div class="mini">${face(call.from)}</div>Raised by ${esc(cast(call.from).name)}</div>` : '';
    const letters = 'ABCD';
    let ci;
    while (true) {
      const el = layer('panel', `<div class="center-wrap"><div class="card call" role="dialog" aria-labelledby="callT">${head(call, i)}<div class="call-body">
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
      layer('panel', `<div class="center-wrap"><div class="card call">${head(call, i)}<div class="call-body">
        <h2>${esc(call.title)}</h2>
        <div class="opt picked"><span class="l">${L}</span><span><div class="t">${fill(c.t)}</div></span></div>
        <div class="q" style="margin-top:22px">How sure are you that's the right call?</div>
        <div class="conf">${CONF.map((x, n) => `<button data-k="${n + 1}" data-v="${n}"><span class="ic">${x.ic}</span><div class="lb">${x.lb}</div><div class="pc">${x.pc}</div></button>`).join('')}</div>
        <p class="hint">Good judgment isn't only picking well — it's knowing how sure to be. Being certain about a weak call costs you.</p>
        <div class="cta" style="justify-content:flex-start"><button class="btn line small" data-back>← Change my mind</button></div>
      </div></div></div>`);
      const r = await new Promise(res => { const el2 = $('#panel'); el2.querySelectorAll('.conf button').forEach(b => b.onclick = () => res(+b.dataset.v)); el2.querySelector('[data-back]').onclick = () => res(-1); });
      if (r < 0) continue;
      onKey = null;
      resolveCall(call, ci, CONF[r].v, i, false);
      await reveal(call, ci, CONF[r].v, i);
      break;
    }
  }
  function resolveCall(call, ci, conf, chIdx, delegated) {
    const c = call.choices[ci];
    apply(c.e, true);
    S.judgment.push({ id: call.id, ch: chIdx, title: call.title, ci, choice: c.t, grade: c.grade, conf, secs: call._secs || 0, principle: call.principle.name, delegated });
    if (c.ripple) {
      const r = c.ripple, hit = Math.random() < (r.p == null ? 1 : r.p), out = hit ? r.hit : r.miss;
      if (out) S.ripples.push({ at: r.at, from: chIdx, title: call.title, choice: c.t, grade: c.grade, out, fired: false });
    }
  }
  function calibLine(conf, g) {
    if (conf >= 0.9) return g === 'best' ? ['🎯', `You were certain — and right. That's calibrated confidence.`]
      : g === 'ok' ? ['⚠️', `You were certain, but there was a stronger option. Certainty is a feeling, not evidence.`]
        : ['⚠️', `Overconfident. You were certain about a risky call. Before committing, ask: "What would have to be true for this to go wrong?"`];
    if (conf <= 0.5) return g === 'best' ? ['🪙', `You doubted yourself, but your instinct was sound. Trust it a little more.`]
      : g === 'poor' ? ['✓', `Good self-awareness — you sensed it was shaky. When unsure, look for the option that buys information or caps the downside.`]
        : ['✓', `Honest uncertainty on a genuinely hard call.`];
    return g === 'best' ? ['✓', `Fairly sure, and right. Well calibrated.`] : g === 'ok' ? ['✓', `Reasonable confidence for a defensible call.`] : ['⚠️', `You were fairly sure. Next time, look for what you might not be seeing.`];
  }
  async function reveal(call, ci, conf, i) {
    const c = call.choices[ci], best = call.choices.find(x => x.grade === 'best');
    LS.audio.sfx('stamp'); setTimeout(() => LS.audio.sfx(c.grade === 'best' ? 'good' : c.grade === 'poor' ? 'bad' : 'tap'), 250);
    const [ic, cl] = calibLine(conf, c.grade);
    const el = layer('panel', `<div class="center-wrap"><div class="card call">${head(call, i, c.grade === 'best' ? 'teal' : c.grade === 'poor' ? 'rose' : 'gold')}<div class="call-body">
      <div class="verdict"><span class="stamp ${c.grade}">${GRADE[c.grade].toUpperCase()}</span><span class="your">You chose: <b>${fill(c.t)}</b></span></div>
      <div class="chips">${chips(c.e)}</div>
      <div class="mentor"><div class="face">${face('moira', c.grade === 'best' ? 'smile' : c.grade === 'poor' ? 'concern' : 'neutral')}</div><div><div class="nm">Moira's take</div><div class="say">“${fill(c.why)}”</div>
        ${c.grade !== 'best' && best ? `<div class="alt">My call: <b>${fill(best.t)}</b> — ${fill(best.why)}</div>` : ''}</div></div>
      <div class="principle"><div class="eyebrow">Principle</div><div class="pn">${esc(call.principle.name)}</div><div class="pt">${esc(call.principle.text)}</div></div>
      <div class="calib"><span>${ic}</span><span>${cl}</span></div>
      ${c.ripple ? `<div class="pending">⏳ This decision has consequences that haven't landed yet…</div>` : ''}
      <div class="cta"><button class="btn dark" data-go>Continue <span class="kbd" style="color:#fff">↵</span></button></div>
    </div></div></div>`);
    el.querySelector('.call').scrollTop = 0;
    live(`${GRADE[c.grade]}. ${c.why}`);
    await clickGo(el);
  }

  // ---------- Ripples ----------
  const due = i => S.ripples.filter(r => !r.fired && i >= r.at);
  async function ripple(r) {
    r.fired = true;
    const e = r.out.e || {}, net = Object.values(e).reduce((a, b) => a + b, 0);
    const good = net > 0, bad = net < 0;
    LS.audio.sfx('ripple'); setTimeout(() => LS.audio.sfx(bad ? 'bad' : good ? 'good' : 'tap'), 500);
    if (good) S.goodRipples++;
    const fromCh = PACK.chapters[r.from], nowCh = PACK.chapters[Math.min(S.ch, PACK.chapters.length - 1)];
    const el = layer('panel', `<div class="center-wrap"><div class="card ripple">
      <span class="tag ${bad ? 'rose' : good ? 'teal' : ''}">Consequence</span>
      <div class="timeline"><span>Week ${fromCh.week}</span><span class="dot"></span><span class="ln"></span><span class="dot" style="background:${bad ? 'var(--poor)' : good ? 'var(--best)' : 'var(--ink)'}"></span><span>Week ${S.ch >= PACK.chapters.length ? 40 : nowCh.week}</span></div>
      <div class="was">Back in ${esc(fromCh.month)} — <b>${esc(r.title)}</b> — you chose: “${fill(r.choice)}”</div>
      <h2>${esc(r.out.title)}</h2><p>${fill(r.out.text)}</p><div class="chips">${chips(e)}</div>
      ${r.out.lesson ? `<div class="mentor"><div class="face">${face('moira')}</div><div><div class="nm">Moira</div><div class="say">“${fill(r.out.lesson)}”</div></div></div>` : ''}
      <div class="cta"><button class="btn dark" data-go>Continue <span class="kbd" style="color:#fff">↵</span></button></div></div></div>`);
    live(`Consequence: ${r.out.title}. ${r.out.text}`);
    await wait(250); apply(e, false);
    await clickGo(el);
  }

  // ---------- Scoring ----------
  function stats(live) {
    const j = S.judgment; if (!j.length) return null;
    const pw = live ? 2 : 0;
    const dec = (j.reduce((a, x) => a + GSCORE[x.grade], 0) + 0.5 * pw) / (j.length + pw);
    const rated = j.filter(x => x.conf != null);
    const brier = (rated.reduce((a, x) => a + Math.pow(x.conf - GSCORE[x.grade], 2), 0) + 0.04 * pw) / Math.max(1, rated.length + pw);
    const score = Math.round(100 * (0.75 * dec + 0.25 * (1 - brier / 0.81)));
    const certain = rated.filter(x => x.conf >= 0.9);
    return { score, dec, brier, n: j.length, best: j.filter(x => x.grade === 'best').length,
      certainN: certain.length, certainRight: certain.filter(x => x.grade === 'best').length,
      over: rated.filter(x => x.conf >= 0.9 && x.grade === 'poor').length, under: rated.filter(x => x.conf <= 0.5 && x.grade === 'best').length,
      avgSecs: Math.round(j.reduce((a, x) => a + (x.secs || 0), 0) / j.length) };
  }
  const rank = s => s >= 85 ? 'Seasoned judgment' : s >= 70 ? 'Sound judgment' : s >= 50 ? 'Developing judgment' : 'Learning the hard way';
  const ARCH = {
    safety: ['The Guardian', `You never gamble with people. Nobody goes home hurt on your watch — and your crews know it.`],
    quality: ['The Craftsperson', `Build it once, build it right. You'd rather be late than be wrong.`],
    schedule: ['The Sprinter', `You hit dates. Momentum is your superpower, and deadlines fear you.`],
    budget: ['The Treasurer', `Every pound has a job. Sponsors sleep well with you holding the purse.`],
    morale: ['The Captain', `You lead people, not plans. Your team would follow you onto the next job.`],
    balanced: ['The Steady Hand', `You weigh every side and rarely over-rotate. Hard to rattle, hard to fool.`]
  };
  const BLIND = { safety: 'Safety — the one trade-off you can’t take back.', quality: 'Quality — shortcuts come back as rework.', schedule: 'Time — lost weeks are rarely recovered.', budget: 'Money — small leaks sink big projects.', morale: 'People — watch the human cost of your wins.' };
  function profile() {
    const keys = METRICS.map(m => m.k), vals = keys.map(k => S.trade[k] || 0);
    const max = Math.max(...vals), min = Math.min(...vals);
    const top = keys[vals.indexOf(max)], low = keys[vals.indexOf(min)];
    const a = (max - min < 8) ? ARCH.balanced : ARCH[top];
    return { name: a[0], desc: a[1], low, blind: BLIND[low], lowLabel: METRICS.find(m => m.k === low).label };
  }

  // ---------- Save ----------
  function save() { try { localStorage.setItem('lineside_save', JSON.stringify(S)); } catch (e) { } }
  function loadSave() { try { return JSON.parse(localStorage.getItem('lineside_save')); } catch (e) { return null; } }

  // ---------- Game flow ----------
  let scene;
  const moodFor = sc => sc.season === 'winter' || sc.weather === 'rain' ? 'tense' : sc.build >= 5 ? 'hopeful' : 'warm';
  function setScene(sc) { scene.set(sc); LS.audio.setMood(moodFor(sc)); LS.audio.setWeather(sc.weather || 'clear'); }
  async function runChapter(i) {
    S.ch = i; save();
    const ch = PACK.chapters[i];
    setScene(ch.scene); hud();
    await chapterCard(ch, i);
    const start = Object.assign({}, S.m);
    for (const r of due(i)) await ripple(r);
    const worst = METRICS.filter(m => S.m[m.k] < 30);
    if (worst.length) await say('moira', `${worst.map(m => m.label).join(' and ')} ${worst.length > 1 ? 'are' : 'is'} in real trouble. If you don't steer it, events will start making decisions for you.`, 'concern');
    for (const [who, text] of ch.intro) await say(who, text);
    for (const tid of ch.talks) await talk(PACK.talks[tid], tid);
    for (const cid of ch.calls) await doCall(cid, i);
    if (ch.moira) await chapterEnd(ch, i, start);
  }
  async function run(from) {
    for (let i = from; i < PACK.chapters.length; i++) await runChapter(i);
    S.ch = PACK.chapters.length;
    for (const r of due(S.ch)) await ripple(r);
    const st = stats(false);
    setScene({ time: 'dusk', season: 'summer', weather: 'clear', build: 5, train: true });
    hud(false);
    await say('moira', PACK.finale.reveal, 'concern');
    await say('moira', st.score >= 75 ? PACK.finale.high : st.score >= 50 ? PACK.finale.mid : PACK.finale.low, 'smile');
    hide('talk');
    try { localStorage.removeItem('lineside_save'); } catch (e) { }
    report();
  }

  // ---------- Report ----------
  function report() {
    const st = stats(false), pf = profile(), j = S.judgment;
    const missed = j.filter(x => x.grade !== 'best').map(x => PACK.calls[x.id]);
    const nailed = j.filter(x => x.grade === 'best').map(x => PACK.calls[x.id]);
    const lessons = (missed.length ? missed : nailed).slice(0, 3);
    S.lesson = (lessons[0] || PACK.calls.name_date).principle.name;
    let calib = st.certainN ? `Of the ${st.certainN} call${st.certainN > 1 ? 's' : ''} you were “certain” about, ${st.certainRight} matched the expert call.` : `You were never “certain”. Careful — just make sure caution isn’t becoming indecision.`;
    if (st.over >= 2) calib += ` You were certain about ${st.over} risky calls: watch for overconfidence.`;
    else if (st.under >= 2) calib += ` You doubted ${st.under} expert calls: your instincts are better than you think.`;
    const C = 2 * Math.PI * 88, off = C * (1 - st.score / 100);
    const html = `<div class="report">
      <div class="hero"><div class="eyebrow" style="color:rgba(247,241,231,.7)">The Kestrel Vale Line · Judgment report</div><h1>Harrowby has its railway.</h1><p>${esc(S.name)} led a £10M reopening across 40 weeks and ${st.n} big calls.</p></div>
      <div class="card scorecard"><div class="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" stroke="#e8dcc8" stroke-width="14" fill="none"/><circle cx="100" cy="100" r="88" stroke="var(--ember)" stroke-width="14" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" id="ringArc" style="transition:stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)"/></svg><div class="num"><b id="ringNum">0</b><span>Judgment</span></div></div>
        <div class="arch"><div class="rank">${rank(st.score)}</div><h2>${pf.name}</h2><p>${pf.desc}</p><div class="blind">Blind spot: ${pf.blind}</div></div></div>
      <div class="rgrid">
        <div class="card rcard"><h3>Calibration</h3><p>${calib}</p><p style="margin-top:10px">Expert calls: <b>${st.best} of ${st.n}</b> · Average deliberation: <b>${st.avgSecs}s</b></p></div>
        <div class="card rcard"><h3>The project</h3>${METRICS.map(m => `<div class="mrow"><span class="nm">${m.label}</span><span class="tr"><i style="width:${S.m[m.k]}%;background:${m.color}"></i></span><span class="v">${S.m[m.k]}</span></div>`).join('')}</div>
      </div>
      <div class="card rcard" style="margin-bottom:16px"><h3>Your calls</h3>${j.map(x => { const cf = CONF.find(c => c.v === x.conf); return `<div class="callrow"><span class="w">Week ${PACK.chapters[x.ch].week}</span><span class="tt">${esc(x.title)}</span><span class="cf">${cf ? cf.ic + ' ' + cf.lb : 'delegated'}</span><span class="gchip ${x.grade}">${GRADE[x.grade].toUpperCase()}</span></div>`; }).join('')}</div>
      <div class="card rcard" style="margin-bottom:16px"><h3>Take these to your next project</h3>${lessons.map(c => `<div class="lesson"><div class="pn">${esc(c.principle.name)}</div><p>${esc(c.principle.text)}</p></div>`).join('')}</div>
      <div class="card finale"><div class="face">${face('moira', 'smile')}</div><div><div class="eyebrow" style="color:var(--gold)">Moira Kell</div><p style="margin-top:8px">“${fill(PACK.finale.reveal)}”</p><p>“${fill(st.score >= 75 ? PACK.finale.high : st.score >= 50 ? PACK.finale.mid : PACK.finale.low)}”</p></div></div>
      <div class="card rcard" style="margin-bottom:16px"><h3>Your team</h3>${PACK.team.map(t => `<div class="person"><div class="face">${face(t, S.trust[t] >= 3 ? 'smile' : S.trust[t] <= 1 ? 'concern' : 'neutral')}</div><div><div class="nm">${esc(cast(t).name)}</div><div class="rl">${esc(cast(t).role)}</div></div><div class="trust" aria-label="Trust ${S.trust[t]} of 5">${[0, 1, 2, 3, 4].map(k => `<i class="${k < S.trust[t] ? 'on' : ''}"></i>`).join('')}</div></div>`).join('')}</div>
      <details class="card rcard" style="margin-bottom:16px"><summary style="cursor:pointer;font-weight:700">For facilitators: discussion guide</summary><ol class="discuss" style="margin-top:12px">${j.map(x => `<li><b>${esc(x.title)}.</b> ${esc(PACK.calls[x.id].discuss)}</li>`).join('')}</ol></details>
      <div class="report-actions">
        <button class="btn primary" id="rShare">Share my result</button>
        <button class="btn ghost" id="rCopy">Copy summary</button>
        <button class="btn ghost" id="rCSV">Download results (CSV)</button>
        <button class="btn ghost" id="rAgain">Play again</button>
      </div></div>`;
    const el = layer('report', html); el.scrollTop = 0;
    requestAnimationFrame(() => setTimeout(() => {
      $('#ringArc').style.strokeDashoffset = off;
      const n = $('#ringNum'); let k = 0; const iv = setInterval(() => { k += Math.max(1, Math.round(st.score / 40)); if (k >= st.score) { k = st.score; clearInterval(iv); } n.textContent = k; }, 30);
    }, 300));
    LS.audio.sfx('good');
    $('#rShare').onclick = openShare; $('#rCopy').onclick = copySummary; $('#rCSV').onclick = exportCSV;
    $('#rAgain').onclick = () => location.reload();
  }
  const shareURL = () => /^https?:/.test(location.protocol) ? location.origin + location.pathname : '';
  function summary() {
    const st = stats(false), pf = profile();
    return `🚆 LINESIDE — a game about judgment\nI reopened the Kestrel Vale Line as ${pf.name}.\n⚖ Judgment ${st.score}/100 (${rank(st.score)})\n🎯 Expert calls ${st.best}/${st.n}\nBiggest lesson: “${S.lesson}”\nCan you make better calls?${shareURL() ? ' ' + shareURL() : ''}`;
  }
  function toast(m) { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => t.style.display = 'none', 2400); }
  function copySummary() {
    const txt = summary();
    const ok = () => toast('Copied — paste it anywhere');
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, () => fallback(txt, ok)); else fallback(txt, ok);
  }
  function fallback(txt, ok) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { } ta.remove(); }
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function exportCSV() {
    const st = stats(false), pf = profile();
    const rows = [['player', 'pack', 'chapter', 'week', 'call', 'choice', 'grade', 'confidence', 'seconds', 'principle']];
    S.judgment.forEach(x => rows.push([S.name, PACK.id, x.ch + 1, PACK.chapters[x.ch].week, x.title, x.choice, x.grade, x.conf, x.secs, x.principle]));
    rows.push([]); rows.push(['summary', 'judgment', st.score, 'rank', rank(st.score), 'style', pf.name, 'blind_spot', pf.lowLabel, 'expert_calls', st.best + '/' + st.n]);
    rows.push(['metrics', ...METRICS.map(m => m.label + '=' + S.m[m.k])]);
    const csv = rows.map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
    download(`lineside-${S.name.replace(/\W+/g, '_')}-results.csv`, new Blob([csv], { type: 'text/csv' }));
    toast('Results downloaded — nothing leaves this device unless you share it');
  }

  // ---------- Share card ----------
  function wrap(x, text, X, Y, max, lh) { const w = text.split(' '); let line = ''; for (const word of w) { const t = line ? line + ' ' + word : word; if (x.measureText(t).width > max && line) { x.fillText(line, X, Y); line = word; Y += lh; } else line = t; } if (line) x.fillText(line, X, Y); return Y + lh; }
  async function card() {
    try { await Promise.all([document.fonts.load('600 60px Fraunces'), document.fonts.load('700 20px Inter')]); } catch (e) { }
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const st = stats(false), pf = profile();
    x.fillStyle = '#0e1220'; x.fillRect(0, 0, W, H);
    x.drawImage(scene.snapshot(W, 760), 0, 0);
    const tg = x.createLinearGradient(0, 0, 0, 260); tg.addColorStop(0, 'rgba(14,18,32,.55)'); tg.addColorStop(1, 'rgba(14,18,32,0)'); x.fillStyle = tg; x.fillRect(0, 0, W, 260);
    const g = x.createLinearGradient(0, 380, 0, 800); g.addColorStop(0, 'rgba(14,18,32,0)'); g.addColorStop(1, 'rgba(14,18,32,1)'); x.fillStyle = g; x.fillRect(0, 380, W, 420);
    x.textAlign = 'center'; x.fillStyle = '#f7f1e7';
    x.font = '600 112px Fraunces, Georgia, serif'; x.fillText('LINESIDE', W / 2 + 8, 150);
    x.font = 'italic 400 34px Fraunces, Georgia, serif'; x.globalAlpha = 0.9; x.fillText('a game about judgment', W / 2, 205); x.globalAlpha = 1;
    // score ring
    const cx = 250, cy = 890, R = 150;
    x.lineWidth = 26; x.strokeStyle = 'rgba(247,241,231,.15)'; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
    x.strokeStyle = '#d8643a'; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * st.score / 100); x.stroke();
    x.fillStyle = '#f7f1e7'; x.font = '600 120px Fraunces, Georgia, serif'; x.fillText(String(st.score), cx, cy + 40);
    x.font = '700 22px Inter, sans-serif'; x.fillStyle = 'rgba(247,241,231,.65)'; x.fillText('JUDGMENT', cx, cy + 84);
    x.textAlign = 'left';
    x.fillStyle = '#e7b04a'; x.font = '700 24px Inter, sans-serif'; x.fillText(rank(st.score).toUpperCase(), 460, 790);
    x.fillStyle = '#f7f1e7'; x.font = '600 64px Fraunces, Georgia, serif'; const y2 = wrap(x, pf.name, 460, 868, 560, 70);
    x.font = '400 26px Inter, sans-serif'; x.fillStyle = 'rgba(247,241,231,.85)'; const y3 = wrap(x, pf.desc, 460, y2 + 2, 560, 36);
    x.fillStyle = '#ef8a7a'; x.font = '600 24px Inter, sans-serif'; x.fillText('Blind spot: ' + pf.lowLabel, 460, Math.min(y3 + 8, 1080));
    // metrics
    let yy = 1136; x.font = '700 22px Inter, sans-serif';
    METRICS.forEach((m, k) => { const bx = 90 + k * 186; x.fillStyle = 'rgba(247,241,231,.7)'; x.fillText(m.label.toUpperCase(), bx, yy); x.fillStyle = 'rgba(247,241,231,.15)'; x.fillRect(bx, yy + 14, 160, 10); x.fillStyle = m.color; x.fillRect(bx, yy + 14, 160 * S.m[m.k] / 100, 10); x.fillStyle = '#f7f1e7'; x.font = '600 40px Fraunces, serif'; x.fillText(String(S.m[m.k]), bx, yy + 70); x.font = '700 22px Inter, sans-serif'; });
    x.textAlign = 'center'; x.fillStyle = 'rgba(247,241,231,.7)'; x.font = '600 24px Inter, sans-serif';
    x.fillText(`Expert calls ${st.best}/${st.n}  ·  Biggest lesson: “${S.lesson}”`.slice(0, 80), W / 2, 1268);
    x.fillStyle = '#f7f1e7'; x.font = 'italic 400 32px Fraunces, serif'; x.fillText('Can you make better calls?', W / 2, 1316);
    return c;
  }
  async function openShare() {
    LS.audio.sfx('tap');
    const c = await card(), url = c.toDataURL('image/png');
    const el = layer('share', `<div class="wrap"><img src="${url}" alt="Your LINESIDE result card"><div class="report-actions" style="margin:0"><button class="btn primary" id="sNative">Share</button><a class="btn ghost" href="${url}" download="lineside-result.png">Download image</a><button class="btn ghost" id="sCopy">Copy text</button><button class="btn ghost" id="sClose">Close</button></div></div>`);
    $('#sClose').onclick = () => hide('share'); $('#sCopy').onclick = copySummary;
    $('#sNative').onclick = () => c.toBlob(async b => {
      const f = new File([b], 'lineside-result.png', { type: 'image/png' });
      try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'LINESIDE', text: summary() }); return; } if (navigator.share) { await navigator.share({ title: 'LINESIDE', text: summary(), url: shareURL() || undefined }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      download('lineside-result.png', b); toast('Image saved — post it with your summary');
    });
  }

  // ---------- Board (menu) ----------
  let tab = 'project';
  function openBoard(t) {
    tab = t || tab;
    const body = {
      project: () => METRICS.map(m => `<div class="mrow"><span class="nm">${m.label}</span><span class="tr"><i style="width:${S.m[m.k]}%;background:${m.color}"></i></span><span class="v">${S.m[m.k]}</span></div>`).join('') +
        (() => { const st = stats(true); return st ? `<div class="mrow" style="margin-top:22px"><span class="nm">Judgment</span><span class="tr"><i style="width:${st.score}%;background:var(--ember)"></i></span><span class="v">${st.score}</span></div><p class="hint">Calls made: ${st.n} of ${Object.keys(PACK.calls).length}. Your score blends how good your calls were with how well your confidence matched them.</p>` : `<p class="hint">Your Judgment score appears after your first Call.</p>`; })(),
      team: () => PACK.team.map(t => `<div class="person"><div class="face">${face(t)}</div><div><div class="nm">${esc(cast(t).name)}</div><div class="rl">${esc(cast(t).role)}</div></div><div class="trust">${[0, 1, 2, 3, 4].map(k => `<i class="${k < S.trust[t] ? 'on' : ''}"></i>`).join('')}</div></div>`).join(''),
      journal: () => S.judgment.length ? S.judgment.map(x => { const c = PACK.calls[x.id]; return `<div class="jentry"><span class="gchip ${x.grade}">${GRADE[x.grade].toUpperCase()}</span> <span style="font-size:12px;color:var(--muted)">Week ${PACK.chapters[x.ch].week} · ${esc(x.title)}</span><div class="pn">${esc(c.principle.name)}</div><div class="pt">${esc(c.principle.text)}</div></div>`; }).join('') : `<p class="hint">Principles you encounter at each Call are collected here.</p>`,
      settings: () => [['sound', 'Sound & music'], ['reduced', 'Reduce motion'], ['large', 'Larger text'], ['instant', 'Show text instantly']].map(([k, l]) => `<div class="set"><span>${l}</span><button class="switch ${SET[k] ? 'on' : ''}" role="switch" aria-checked="${!!SET[k]}" data-set="${k}" aria-label="${l}"></button></div>`).join('') +
        `<div style="margin-top:24px"><button class="btn line small" id="restart">Restart from chapter one</button></div>`
    }[tab]();
    const el = layer('board', `<div class="drawer" role="dialog" aria-label="Project board"><div class="drawer-head"><h3>Project board</h3><button class="iconbtn" style="background:var(--paper2);color:var(--ink)" id="bClose" aria-label="Close">${ICON.close}</button></div>
      <div class="tabs">${['project', 'team', 'journal', 'settings'].map(t => `<button class="${t === tab ? 'on' : ''}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><div class="drawer-body">${body}</div></div>`);
    el.onclick = e => { if (e.target === el) closeBoard(); };
    $('#bClose').onclick = closeBoard;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => openBoard(b.dataset.tab));
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { SET[b.dataset.set] = !SET[b.dataset.set]; saveSet(); openBoard('settings'); });
    const rs = $('#restart'); if (rs) rs.onclick = () => { if (rs.dataset.armed) { try { localStorage.removeItem('lineside_save'); } catch (e) { } location.reload(); } else { rs.dataset.armed = 1; rs.textContent = 'Tap again to restart'; } };
  }
  function closeBoard() { hide('board'); }

  // ---------- Title / setup / educators ----------
  function title() {
    setScene({ time: 'dusk', season: 'summer', weather: 'clear', build: 5, train: true });
    const sv = loadSave();
    layer('title', `<div class="brandmark">Groundwork Studio presents</div><div class="logo">LINESIDE</div><div class="tagline">A game about judgment.</div>
      <p class="packline">${esc(PACK.title)} — ${esc(PACK.blurb)}</p>
      <div class="title-actions"><button class="btn primary" id="tNew">${sv ? 'New project' : 'Begin'}</button>${sv ? `<button class="btn ghost" id="tCont">Continue · Chapter ${sv.ch + 1}</button>` : ''}</div>
      <div class="title-foot"><button id="tEdu">For educators & teams</button><button id="tSet">Settings</button><span>≈ 20 minutes · best with sound</span></div>`);
    $('#title').classList.add('on');
    $('#tNew').onclick = () => { LS.audio.init(); LS.audio.sfx('select'); setup(); };
    if (sv) $('#tCont').onclick = () => { LS.audio.init(); S = Object.assign(fresh(), sv); hide('title'); run(sv.ch); };
    $('#tEdu').onclick = educators;
    $('#tSet').onclick = () => { LS.audio.init(); openBoard('settings'); };
  }
  function setup() {
    hide('title');
    let av = 0;
    const el = layer('setup', `<div class="center-wrap"><div class="card"><div class="eyebrow">${esc(PACK.sector)} · ${esc(PACK.budgetLabel)} · 40 weeks</div>
      <h2>You've been asked to lead the reopening.</h2><p>Your decisions will shape a valley. There are no scores on the buttons and no right answers on screen — only the calls you make, and the ripples they send.</p>
      <div class="avatars" role="radiogroup" aria-label="Choose your portrait">${PACK.avatars.map((a, i) => `<button class="avatar ${i === 0 ? 'sel' : ''}" role="radio" aria-checked="${i === 0}" data-a="${i}" aria-label="Portrait ${i + 1}">${LS.portrait(a, 'smile')}</button>`).join('')}</div>
      <label class="eyebrow" for="pname">Your name</label><input class="field" id="pname" maxlength="18" autocomplete="off" placeholder="e.g. Sam" style="margin-top:8px">
      <div class="setup-row"><button class="btn dark" id="sGo">Take the job →</button><button class="btn line small" id="sBack">Back</button></div></div></div>`);
    el.querySelectorAll('.avatar').forEach(b => b.onclick = () => { el.querySelectorAll('.avatar').forEach(x => { x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); }); b.classList.add('sel'); b.setAttribute('aria-checked', 'true'); av = +b.dataset.a; LS.audio.sfx('tap'); });
    const go = () => { S = fresh(); S.name = ($('#pname').value.trim() || 'Sam').slice(0, 18); S.avatar = av; hide('setup'); LS.audio.sfx('select'); run(0); };
    $('#sGo').onclick = go; $('#pname').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#sBack').onclick = () => { hide('setup'); title(); };
    setTimeout(() => $('#pname').focus(), 400);
  }
  function educators() {
    const el = layer('panel', `<div class="center-wrap"><div class="card edu"><div class="eyebrow">For educators, L&D and teams</div><h2>Judgment you can practise.</h2>
      <p>LINESIDE turns the hardest part of professional work — making calls under uncertainty — into a 20-minute story that learners actually want to finish, and a debrief that sticks.</p>
      <h4>How it teaches</h4><ul>
        <li><b>No numbers on the buttons.</b> Learners weigh the situation, not the scoreboard.</li>
        <li><b>What you know / what you don't.</b> Every Call makes uncertainty explicit.</li>
        <li><b>Confidence ratings.</b> Calibration is scored, so overconfidence is visible and correctable.</li>
        <li><b>Ripples.</b> Consequences land weeks later — sometimes with luck involved — teaching learners to judge decisions, not outcomes.</li>
        <li><b>A mentor's reasoning.</b> Every Call closes with an expert take and a named principle.</li></ul>
      <h4>Running a session</h4><ul><li>20 minutes individual play (desktop, tablet or phone — no install, no login).</li><li>20–30 minutes debrief using the built-in discussion guide on the report screen.</li><li>Optional: learners download their results CSV to compare decision styles across a group.</li></ul>
      <h4>What's measured</h4><p>Decision quality against expert grading, calibration (a Brier-style score), deliberation time, decision style and blind spot, relationships with the team.</p>
      <h4>Privacy</h4><p>Everything runs in the browser. No data leaves the device unless the learner exports or shares it.</p>
      <h4>Scenario packs</h4><p>Now: <b>${esc(PACK.title)}</b> (${esc(PACK.sector)}). The engine is pack-driven, so the same mechanics carry to healthcare, construction, public services and finance.</p>
      <div class="cta"><button class="btn dark" data-go>Close</button></div></div></div>`);
    clickGo(el);
  }

  // ---------- Boot ----------
  function boot() {
    scene = new LS.Scene($('#scene'));
    applySet();
    $('#hudMenu').innerHTML = ICON.menu; $('#hudMenu').onclick = () => openBoard();
    document.addEventListener('pointerdown', () => LS.audio.init(), { once: true });
    title();
    LS.game = { S: () => S, stats, profile, report, card, PACK };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
