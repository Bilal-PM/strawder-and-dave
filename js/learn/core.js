/* LINESIDE Learning World: the module runner (LS.Learn).
 *
 * Runs any module in LS.MODULES (see js/packs/learn-planning.js and docs/LEARNING_WORLD.md §5) through the Lineside
 * Loop: Board → Bench → Brew → Out on the line → Logbook. Each step lives in its own file (board.js, bench.js,
 * brew.js, line.js, logbook.js) and registers itself in LS.Learn.steps. This file holds what they share:
 *   · progress, saved separately from the chapter save, in localStorage 'lineside_learn_v1' (saved at every step);
 *   · the #learn overlay (a card over the living world, with the loop strip and "Save and leave");
 *   · portraits and dialogue lines, confidence ratings, keyboard handling;
 *   · everything the characters say is authored in the module data (no generated text, nothing downloaded);
 *   · world integration: backdrops for each step, the lit Planning lamp and the Planning Lens.
 *
 * Nothing here runs unless the player chooses to learn: Chapter 1 is unchanged. Classic script, works from file://.
 */
window.LS = window.LS || {};
(function () {
  const L = LS.Learn = LS.Learn || {};
  const esc = L.esc, num = L.num;
  const $ = s => document.querySelector(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  L.wait = wait;
  L.steps = L.steps || {};
  L.STEPS = [
    { id: 'board', n: 1, name: 'The Board', short: 'Board', verb: 'See', where: 'Whiteboard, project office' },
    { id: 'bench', n: 2, name: 'The Bench', short: 'Bench', verb: 'Try', where: 'Jo’s Planning Table' },
    { id: 'brew', n: 3, name: 'The Brew', short: 'Brew', verb: 'Talk', where: 'Kettle corner' },
    { id: 'line', n: 4, name: 'Out on the line', short: 'The line', verb: 'Do', where: 'Crag Lane crossing' },
    { id: 'logbook', n: 5, name: 'The Logbook', short: 'Logbook', verb: 'Look back', where: 'Beck Cottage' }
  ];

  // ---------- Settings (the game's own) and reduced motion ----------
  const gameSet = () => { try { return JSON.parse(localStorage.getItem('lineside_settings')) || {}; } catch (e) { return {}; } };
  L.reduced = () => !!(gameSet().reduced || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));
  L.instant = () => !!gameSet().instant || L.reduced();
  L.sfx = n => { try { if (LS.audio && LS.audio.sfx) LS.audio.sfx(n); } catch (e) { } };

  // ---------- Progress store ----------
  const KEY = 'lineside_learn_v1';
  L.load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) { } return { v: 1, modules: {}, settings: {} }; };
  L.save = st => { try { localStorage.setItem(KEY, JSON.stringify(st || L.store)); } catch (e) { } };
  L.store = L.load();
  L.prog = id => {
    const m = L.store.modules;
    if (!m[id]) m[id] = { step: 'board', style: null, level: null, done: {}, flags: {}, conf: [], hints: 0, started: Date.now() };
    return m[id];
  };
  L.flag = (P, mid, d) => { if (!mid) return; P.flags[mid] = Math.max(0, Math.min(3, (P.flags[mid] || 0) + d)); };
  L.mastered = id => { const p = L.store.modules[id]; return !!(p && p.lamp && p.lamp.band && p.lamp.band !== 'notyet'); };
  L.lampOf = id => { const p = L.store.modules[id]; return p && p.lamp || null; };

  // ---------- Cast: portraits for anyone (pack cast, townsfolk, module personas) ----------
  const PACK = () => LS.PACKS && LS.PACKS['kestrel-vale'];
  L.person = (id, mod) => {
    const P = PACK() || {}, c = (P.cast || {})[id], town = P.world && P.world.town && P.world.town[id];
    const mp = mod && mod.talk && (mod.talk.panel || []).find(p => p.id === id);
    const look = (mp && mp.look) || (c && c.look) || (town && town.look) || null;
    return { id, name: (mp && mp.name) || (c && c.name) || (town && town.name) || id, role: (mp && mp.role) || (c && c.role) || (town && town.role) || '', look };
  };
  L.face = (id, mood, mod) => {
    const I = LS.PORTRAIT_IMG && LS.PORTRAIT_IMG[id];
    if (I) { const src = I[mood || 'neutral'] || I.neutral; if (src) return `<img class="pimg" src="${src}" alt="">`; }
    const p = L.person(id, mod || L.cur);
    return p.look && LS.portrait ? LS.portrait(p.look, mood || 'neutral') : `<span class="lw-initial">${esc((p.name || '?')[0])}</span>`;
  };

  // ---------- The overlay ----------
  let root = null, stageEl = null, keyH = null;
  function ensureRoot() {
    root = $('#learn');
    if (!root) { root = document.createElement('section'); root.id = 'learn'; root.className = 'layer'; (document.querySelector('main') || document.body).appendChild(root); }
    return root;
  }
  L.shell = function (mod, stepId) {
    ensureRoot();
    const P = L.prog(mod.id);
    const strip = L.STEPS.map(s => `<li class="${P.done[s.id] ? 'done' : ''} ${s.id === stepId ? 'now' : ''}"><span class="n">${P.done[s.id] ? '✓' : s.n}</span><span class="nm">${esc(s.name)}</span><span class="nms">${esc(s.short)}</span></li>`).join('');
    root.innerHTML = `<div class="lw" role="dialog" aria-modal="true" aria-label="${esc(mod.title)}: ${esc((L.STEPS.find(s => s.id === stepId) || {}).name || '')}">
      <header class="lw-top"><div class="lw-brand"><span class="lw-lampicon ${L.mastered(mod.id) ? 'lit' : ''}"></span><div><div class="eyebrow">Learn · Module 1</div><b>${esc(mod.title)}</b></div></div>
        <ol class="lw-strip" aria-label="The Lineside Loop">${strip}</ol>
        <button class="lw-leave" id="lwLeave" aria-label="Save and leave">Save &amp; leave</button></header>
      <div class="lw-sub" id="lwSub"></div><div class="lw-stage" id="lwStage"></div></div>`;
    root.classList.add('on'); document.body.classList.add('learning', 'modal');
    stageEl = root.querySelector('#lwStage');
    root.querySelector('#lwLeave').onclick = () => L.leave();
    return stageEl;
  };
  // A moment card over the step (a finding, a phone call). The step underneath is hidden while it's open.
  L.modal = (html, cls) => { const lw = root.querySelector('.lw'), m = document.createElement('div'); m.className = 'lw-modal ' + (cls || ''); m.innerHTML = `<div class="lw-modalin">${html}</div>`; m.style.top = ((lw.querySelector('.lw-top').offsetHeight || 60) + (lw.querySelector('#lwSub').offsetHeight || 0)) + 'px'; lw.appendChild(m); stageEl.classList.add('under'); return m; };
  L.closeModal = m => { if (m) m.remove(); if (stageEl && !root.querySelector('.lw-modal')) stageEl.classList.remove('under'); };
  L.sub = html => { const s = root && root.querySelector('#lwSub'); if (s) s.innerHTML = html || ''; return s; };
  L.stage = html => { if (html != null) { stageEl.innerHTML = html; stageEl.scrollTop = 0; } return stageEl; };
  L.isOn = () => !!(root && root.classList.contains('on'));

  // Keyboard: Enter presses the primary button; 1–9 pick numbered chips; Esc asks to leave. Scoped to the overlay.
  function bindKeys() {
    if (keyH) return;
    keyH = e => {
      if (!L.isOn()) return;
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const s = root.querySelector('[data-send]'); if (s) { e.preventDefault(); s.click(); } } return; }
      if (e.key === 'Enter' || (e.key === ' ' && !(e.target && e.target.tagName === 'BUTTON'))) {
        if (e.target && e.target.tagName === 'BUTTON' && root.contains(e.target)) return;   // the focused button handles it
        const b = [...root.querySelectorAll('[data-primary]')].filter(x => !x.disabled && x.offsetParent).pop(); if (b) { e.preventDefault(); b.click(); }
        return;
      }
      if (/^[1-9]$/.test(e.key)) { const b = [...root.querySelectorAll(`[data-n="${e.key}"]`)].filter(x => !x.disabled && x.offsetParent)[0]; if (b) { e.preventDefault(); b.click(); } }
    };
    document.addEventListener('keydown', keyH, true);
  }

  // A line of dialogue inside a step: portrait, name, text (typed unless instant / reduced motion).
  L.lineHTML = (who, text, o) => {
    o = o || {}; const p = L.person(who, L.cur);
    return `<div class="lw-line ${o.cls || ''} who-${esc(who)}"><div class="lw-face">${L.face(who, o.mood, L.cur)}</div><div class="lw-bubble"><div class="lw-nm">${esc(p.name)}${p.role && !o.noRole ? ` <small>${esc(p.role)}</small>` : ''}</div><div class="lw-tx">${o.html ? text : esc(text)}</div></div></div>`;
  };
  L.type = (el, text) => new Promise(done => {
    if (!el) return done();
    if (L.instant()) { el.textContent = text; return done(); }
    let i = 0; el.textContent = ''; const iv = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(iv); done(); } }, 14);
    el.addEventListener('click', () => { clearInterval(iv); el.textContent = text; done(); }, { once: true });
  });
  L.announce = t => { const lv = $('#live'); if (lv) lv.textContent = t; };
  // Wait for one of the buttons matching `sel` inside `el`; resolves with the button.
  L.pick = (el, sel) => new Promise(res => { el.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => { if (b.disabled) return; res(b); }, { once: true })); });
  L.go = (el, sel) => L.pick(el, sel || '[data-primary]').then(b => { L.sfx('tap'); return b; });

  // Confidence first (Unsure / Fairly sure / Certain), marked later for calibration.
  L.CONF = [{ v: 0.5, id: 'unsure', t: 'Unsure', ic: '🌫' }, { v: 0.7, id: 'fairly', t: 'Fairly sure', ic: '👍' }, { v: 0.9, id: 'certain', t: 'Certain', ic: '🎯' }];
  L.confHTML = (label) => `<div class="lw-conf" role="group" aria-label="How sure are you?"><div class="eyebrow">${esc(label || 'How sure are you? (rate it before it’s marked)')}</div><div class="lw-confrow">${L.CONF.map((c, i) => `<button class="lw-confb" data-conf="${c.id}" aria-pressed="false"><span>${c.ic}</span>${esc(c.t)}</button>`).join('')}</div></div>`;
  L.bindConf = (el, onPick) => {
    let v = null;
    el.querySelectorAll('[data-conf]').forEach(b => b.onclick = () => { v = L.CONF.find(c => c.id === b.dataset.conf); el.querySelectorAll('[data-conf]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); L.sfx('tap'); if (onPick) onPick(v); });
    return () => v;
  };
  L.recordConf = (P, where, conf, ok) => { P.conf = (P.conf || []).filter(c => c.where !== where); P.conf.push({ where, conf: conf ? conf.v : null, id: conf ? conf.id : null, ok: !!ok }); };

  L.mcById = (mod, id) => (mod.concept.misconceptions || []).find(m => m.id === id);

  // ---------- World integration ----------
  let world = null, saved = null, from = 'title', onExitCb = null;
  const W = () => world || (LS.game && LS.game.world && LS.game.world());
  const BACK = {
    office: { room: 'office', tile: [10, 5], cfg: { time: 'day', season: 'spring', weather: 'clear', build: 0 } },
    line: { room: 'outside', tile: [103, 24], cfg: { time: 'dawn', season: 'spring', weather: 'clear', build: 0 } },
    cottage: { room: 'outside', tile: [55, 15], cfg: { time: 'dusk', season: 'spring', weather: 'clear', build: 0 } }
  };
  L.backdrop = function (k) {
    const w = W(), b = BACK[k]; if (!w || !b || !LS.WORLD) return;
    try { w.set(Object.assign({}, b.cfg)); const p = LS.WORLD.tp(b.tile[0], b.tile[1]); w.attract = false; w.paused = true; w.place(b.room, p.x, p.y, 'up'); if (LS.audio && LS.audio.setMood) LS.audio.setMood(k === 'line' ? 'tense' : 'warm'); } catch (e) { }
  };
  const STEP_BACK = { board: 'office', bench: 'office', brew: 'office', line: 'line', logbook: 'cottage' };

  // Draws the lit Planning lamp by the office door and, with the Lens on, the critical chain over Jo's board.
  function drawUI(x, t, sx, sy, Z) {
    const w = W(); if (!w || !L.mastered('planning') || w.attract) return;
    const T = LS.WORLD.T, band = (L.lampOf('planning') || {}).band;
    const glow = (X, Y, r, a) => { const g = x.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, `rgba(255,214,120,${a})`); g.addColorStop(0.4, `rgba(255,170,60,${a * 0.45})`); g.addColorStop(1, 'rgba(255,170,60,0)'); x.fillStyle = g; x.beginPath(); x.arc(X, Y, r, 0, 7); x.fill(); };
    const fl = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.1);
    if (w.room === 'outside') {
      // the lamp post by the project office door
      const X = sx(64 * T + 4), Y = sy(43 * T + 2), s = Z;
      x.fillStyle = '#2a2430'; x.fillRect(X - 1.2 * s, Y - 22 * s, 2.4 * s, 22 * s); x.fillRect(X - 3 * s, Y - 1 * s, 6 * s, 2 * s);
      glow(X, Y - 25 * s, 40 * s, 0.9 * fl);
      x.fillStyle = band === 'gold' ? '#d7a73c' : band === 'silver' ? '#c9ccd2' : '#b0784a'; x.fillRect(X - 4 * s, Y - 30 * s, 8 * s, 2 * s); x.fillRect(X - 3.5 * s, Y - 22 * s, 7 * s, 1.5 * s);
      x.fillStyle = `rgba(255,226,150,${fl})`; x.fillRect(X - 3 * s, Y - 28 * s, 6 * s, 6 * s);
    }
    if (w.room === 'office' && L.lens) {
      // the Planning Lens: the whiteboard becomes a working plan, with the critical chain lit in lamp amber
      const X0 = sx(8 * T), Y0 = sy(1 * T + 2), Wd = 6 * T * Z, H = 0.9 * T * Z;
      const pl = PACK() && PACK().c1 && PACK().c1.plan; if (!pl) return;
      const lanes = pl.lanes, tot = l => l.cards.reduce((a, c) => a + c.w, 0), max = Math.max(...lanes.map(tot));
      x.save(); x.globalAlpha = 0.95; x.fillStyle = 'rgba(20,16,30,.55)'; x.fillRect(X0 - 4, Y0 - 4, Wd + 8, H + 8);
      lanes.forEach((l, i) => {
        let cx = X0; const y = Y0 + i * (H / 2) + 3, crit = tot(l) === max;
        l.cards.forEach(c => { const w2 = Wd * c.w / max - 2; x.fillStyle = crit ? `rgba(255,${190 + 30 * fl | 0},90,.95)` : 'rgba(210,214,224,.8)'; x.fillRect(cx, y, w2, H / 2 - 6); if (crit) { x.strokeStyle = 'rgba(255,230,160,.9)'; x.lineWidth = 1; x.strokeRect(cx, y, w2, H / 2 - 6); } cx += w2 + 2; });
      });
      glow(X0 + Wd, Y0 + H / 2, 18 * Z, 0.6 * fl);
      x.font = `700 ${Math.round(11)}px Inter, system-ui, sans-serif`; x.textAlign = 'center'; x.fillStyle = '#ffe39a';
      x.fillText('Planning Lens · critical chain: the track', X0 + Wd / 2, Y0 + H + 16);
      x.restore();
    }
  }
  L.lens = false;
  L.attachWorld = function (w) {
    world = w;
    if (!w || w._learnHooked) return; w._learnHooked = true;
    const prev = w.onDrawUI;
    w.onDrawUI = function (x, t, sx, sy, Z) { if (prev) prev.call(this, x, t, sx, sy, Z); try { drawUI(x, t, sx, sy, Z); } catch (e) { } };
    // Hold Q (or tap the Lens chip on a phone) for the Planning Lens, once Planning is learned
    addEventListener('keydown', e => { if ((e.key === 'q' || e.key === 'Q') && L.mastered('planning') && !L.isOn() && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) L.lens = true; });
    addEventListener('keyup', e => { if (e.key === 'q' || e.key === 'Q') L.lens = L.lensLatched || false; });
  };
  L.toggleLens = () => { L.lensLatched = !L.lensLatched; L.lens = L.lensLatched; return L.lens; };

  // Offer shown on the project office board (game.js adds it to the board drawer when you use the board in the office).
  L.boardOffer = function () {
    const mod = LS.MODULES && LS.MODULES.planning; if (!mod) return '';
    const P = L.store.modules.planning, lit = L.mastered('planning'), at = P && !lit ? L.STEPS.find(s => s.id === P.step) : null;
    const plan = PACK() && PACK().c1 && PACK().c1.plan;
    let lens = '';
    if (lit && plan) {
      const tot = l => l.cards.reduce((a, c) => a + c.w, 0), max = Math.max(...plan.lanes.map(tot));
      lens = `<div class="lw-lensplan" aria-label="Planning Lens: the works plan"><div class="eyebrow">Planning Lens · Jo’s works plan</div>${plan.lanes.map(l => `<div class="lw-lp ${tot(l) === max ? 'crit' : ''}"><span>${esc(l.label)}</span><i style="width:${(100 * tot(l) / max).toFixed(1)}%">${tot(l)} wk</i></div>`).join('')}<small>${plan.lanes.filter(l => tot(l) === max).map(l => esc(l.label)).join(', ')} is the critical chain. The others have float: ${plan.lanes.filter(l => tot(l) < max).map(l => `${esc(l.label)} ${max - tot(l)} weeks`).join(', ')}.</small></div>`;
    }
    const lensBtn = lit ? `<button class="btn line small" id="bLens" aria-pressed="${!!L.lensLatched}">${L.lensLatched ? 'Lens on' : 'Lens off'}</button>` : '';
    return `<div class="lw-offer ${lit ? 'lit' : ''}"><span class="lw-lampicon ${lit ? 'lit' : ''}"></span><div><b>${lit ? 'The Planning lamp is lit' : 'Learn planning at the Board'}</b><small>${lit ? 'Replay any step, or hold Q for the Planning Lens.' : at ? `Pick up where you left off: ${esc(at.name)}.` : `Jo’s back room: Board, Bench, Brew, then out on the line. About ${mod.minutes} minutes, and you can stop at any step.`}</small></div>${lensBtn}<button class="btn dark small" id="bLearn">${lit ? 'Open the module' : at && P.done && Object.keys(P.done).length ? 'Carry on' : 'Learn planning'}</button></div>${lens}`;
  };
  // Wires the offer's buttons; `close` closes the board drawer (the game then calls startFromWorld).
  L.bindBoardOffer = function (el, close) {
    const b = el.querySelector('#bLearn'); if (b) b.onclick = () => { L.request('planning'); L.sfx('select'); close(); };
    const l = el.querySelector('#bLens'); if (l) l.onclick = () => { const on = L.toggleLens(); l.textContent = on ? 'Lens on' : 'Lens off'; l.setAttribute('aria-pressed', on); L.sfx('tap'); };
  };
  let pending = null;
  L.request = id => { pending = id || 'planning'; };
  L.wantsToStart = () => !!pending;
  // Called by game.js after the board drawer closes, if the player chose to learn. Resolves when they leave.
  L.startFromWorld = function (w) { const id = pending; pending = null; return L.start(id, { from: 'world', world: w }); };

  // ---------- The runner ----------
  L.cur = null;
  L.start = async function (id, o) {
    o = o || {}; id = id || 'planning';
    const mod = LS.MODULES && LS.MODULES[id]; if (!mod) return;
    if (L.busy) return; L.busy = true;
    L.cur = mod; from = o.from || 'title'; onExitCb = o.onExit || null;
    world = o.world || W(); if (world) L.attachWorld(world);
    L.selfCheck(mod);
    const w = W();
    saved = w ? { room: w.room, x: w.player.x, y: w.player.y, face: w.player.face, cfg: Object.assign({}, w.cfg), attract: w.attract, paused: w.paused, entities: w.entities, objective: w.objective } : null;
    if (w && from === 'title') { w.entities = []; w.objective = null; }
    bindKeys();
    const P = L.prog(id); L.save();
    L.leaving = false;
    // "Save and leave" can happen at any moment: the run resolves as soon as the player leaves, whatever step it's in.
    const left = new Promise(res => { L._left = res; });
    const run = async () => {
    try {
      // the door: how do you like to learn? (first time only; changeable from the loop card)
      if (!P.style) { await L.door(mod, P); if (L.leaving) return; }
      let justDone = null;
      while (!L.leaving) {
        const next = P.step;
        if (next === 'done') { if (justDone === 'logbook') break; await L.hub(mod, P); if (L.leaving || P.step === 'done') break; justDone = null; continue; }
        const fn = L.steps[next]; if (!fn) break;
        L.backdrop(STEP_BACK[next]);
        L.shell(mod, next);
        const r = await fn(mod, P, L);
        if (L.leaving) break;
        if (r === 'leave') { await L.leave(true); break; }
        P.done[next] = true; justDone = next;
        const order = L.STEPS.map(s => s.id), i = order.indexOf(next);
        P.step = r && r.goto ? r.goto : (order[i + 1] || 'done');
        if (P.replaying && !(r && r.goto)) { P.replaying = null; P.step = 'done'; }   // a replayed step goes back to the module card
        L.save();
        if (P.step !== 'done' && !L.leaving) { const c = await L.between(mod, P, next); if (c === 'leave') { await L.leave(true); break; } }
      }
    } catch (e) { console.error(e); }
    finally { if (!L.leaving) L.leave(true); }
    };
    await Promise.race([run(), left]);
    L.busy = false;
  };
  L.door = async function (mod, P) {
    L.backdrop('office'); L.shell(mod, 'board');
    const O = mod.see.open;
    const el = L.stage(`<div class="lw-door">
      <div class="lw-doorhead">${L.lineHTML(O.who, O.say, { mood: 'smile' })}</div>
      <div class="lw-loop">${L.STEPS.map(s => `<div class="lw-loopstep"><span class="n">${s.n}</span><b>${esc(s.name)}</b><small>${esc(s.verb)} · ${esc(s.where)}</small></div>`).join('<i class="lw-arrow">→</i>')}</div>
      <div class="lw-q"><div class="eyebrow">How would you like to learn?</div><div class="lw-opts3">${O.styles.map((s, i) => `<button class="lw-opt" data-style="${s.id}" data-n="${i + 1}" aria-pressed="false"><b>${esc(s.t)}</b><small>${esc(s.d)}</small></button>`).join('')}</div></div>
      <div class="lw-q"><div class="eyebrow">And you are…</div><div class="lw-opts2">${O.levels.map((s, i) => `<button class="lw-opt" data-level="${s.id}" aria-pressed="false"><b>${esc(s.t)}</b>${s.d ? `<small>${esc(s.d)}</small>` : ''}</button>`).join('')}</div></div>
      <div class="lw-cta"><button class="btn dark" data-primary id="lwBegin" disabled>Begin at the Board →</button></div>
      <p class="lw-fine">${esc(mod.signOff)}. Progress saves at every step.</p></div>`);
    let style = null, level = null;
    const upd = () => { el.querySelector('#lwBegin').disabled = !(style && level); };
    el.querySelectorAll('[data-style]').forEach(b => b.onclick = () => { style = b.dataset.style; el.querySelectorAll('[data-style]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); L.sfx('tap'); upd(); });
    el.querySelectorAll('[data-level]').forEach(b => b.onclick = () => { level = b.dataset.level; el.querySelectorAll('[data-level]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); L.sfx('tap'); upd(); });
    await L.go(el, '#lwBegin');
    P.style = style; P.level = level; L.save();
  };
  // Between steps: a small card with the loop, "Next" and "Take a break".
  L.between = async function (mod, P, doneId) {
    const d = L.STEPS.find(s => s.id === doneId), n = L.STEPS.find(s => s.id === P.step);
    L.shell(mod, P.step);
    const loop = `<ol class="lw-mini">${L.STEPS.map(s => `<li class="${P.done[s.id] ? 'done' : ''} ${s.id === n.id ? 'next' : ''}"><span>${P.done[s.id] ? '✓' : s.n}</span><b>${esc(s.short)}</b></li>`).join('')}</ol>`;
    const el = L.stage(`<div class="lw-between"><div class="lw-tick">✓</div><div class="eyebrow">${esc(d.name)} · done</div><h2>Next: ${esc(n.name)}</h2>${loop}<p>${esc(n.verb)} · ${esc(n.where)}. Your progress is saved, so you can stop here and come back.</p>
      <div class="lw-cta"><button class="btn line" data-break>Take a break</button><button class="btn dark" data-primary>On to ${esc(n.name)} →</button></div></div>`);
    L.sfx('good');
    const b = await L.pick(el, '[data-primary],[data-break]');
    return b.hasAttribute('data-break') ? 'leave' : 'next';
  };
  // After completion: the module card (replay a step, lamp checks, change how you learn).
  L.hub = async function (mod, P) {
    L.backdrop('cottage'); L.shell(mod, 'logbook');
    const lamp = P.lamp || {}, due = L.dueCheck(mod, P);
    const el = L.stage(`<div class="lw-hub"><div class="lw-bigLamp ${lamp.band || ''}"><span></span></div><div class="eyebrow">${esc(mod.lamp.label)} · ${esc((mod.do.bands.find(b => b.id === lamp.band) || {}).t || '')}</div><h2>${esc(mod.title)}</h2><p>${esc(mod.lens.label)}: ${esc(mod.lens.desc)}</p>
      ${due ? `<div class="lw-due"><b>Lamp check due.</b> ${esc(L.person(due.who).name)} has a 60-second question for you.<button class="btn dark small" data-check>Answer it</button></div>` : ''}
      <div class="lw-replay">${L.STEPS.map(s => `<button class="lw-opt" data-replay="${s.id}"><b>${s.n}. ${esc(s.name)}</b><small>${esc(s.verb)}</small></button>`).join('')}</div>
      <div class="lw-cta"><button class="btn dark" data-primary>Back to Harrowby</button></div></div>`);
    const b = await L.pick(el, '[data-primary],[data-replay],[data-check]');
    if (b.hasAttribute('data-replay')) { P.step = b.dataset.replay; P.replaying = b.dataset.replay; if (P.step === 'line') P.variant = P.variant ? null : 'v2'; L.save(); return; }
    if (b.hasAttribute('data-check')) { await L.lampCheck(mod, P, due); return; }
    L.leaving = true; await L.leave(true);
  };
  L.dueCheck = (mod, P) => { const cs = P.lamp && P.lamp.checks; if (!cs) return null; const now = Date.now(), c = cs.find(c => !c.done && c.at <= now); return c ? Object.assign({}, mod.lookBack.lampChecks.find(x => x.id === c.id), { at: c.at }) : null; };
  L.lampCheck = async function (mod, P, q) {
    L.shell(mod, 'logbook');
    const el = L.stage(`<div class="lw-check">${L.lineHTML(q.who, q.ask, { mood: 'smile' })}<p class="lw-ctx">${esc(q.context)}</p><div class="lw-opts">${q.options.map((o, i) => `<button class="lw-opt" data-o="${i}" data-n="${i + 1}"><b>${esc(o.t)}</b></button>`).join('')}</div></div>`);
    const b = await L.pick(el, '[data-o]'), ok = +b.dataset.o === q.answer;
    const c = P.lamp.checks.find(c => c.id === q.id && !c.done); if (c) { c.done = Date.now(); c.ok = ok; }
    L.save();
    el.insertAdjacentHTML('beforeend', `<div class="lw-fb ${ok ? 'good' : 'bad'}"><b>${ok ? 'Lamp relit.' : 'Not quite.'}</b> ${esc(q.say)}</div><div class="lw-cta"><button class="btn dark" data-primary>Done</button></div>`);
    L.sfx(ok ? 'good' : 'bad'); await L.go(el);
  };
  L.leave = async function (quiet) {
    if (!L.cur && L.leaving) return;
    L.leaving = true;
    const w = W();
    if (root) root.classList.remove('on');
    document.body.classList.remove('learning');
    if (!document.querySelector('.layer.on:not(#learn)')) document.body.classList.remove('modal');
    L.save();
    if (w && saved) {
      try { w.set(saved.cfg); w.entities = saved.entities; w.objective = saved.objective; w.attract = saved.attract; w.place(saved.room, saved.x, saved.y, saved.face); w.paused = saved.paused; if (from === 'world') w.ignoreTapUntil = performance.now() + 400; } catch (e) { }
    }
    saved = null; L.cur = null;
    const cb = onExitCb; onExitCb = null;
    L.busy = false;
    if (cb) try { cb(); } catch (e) { }
    if (L._left) { const f = L._left; L._left = null; f(); }
  };

  // Re-derive the module's key numbers with the CPM; warn loudly if the data and the maths disagree.
  L.selfCheck = function (mod) {
    const out = [];
    (mod.selfCheck || []).forEach(c => {
      const acts = c.net.split('.').reduce((o, k) => o && o[k], mod);
      try { const r = L.cpm(acts); const bad = []; if (c.finish != null && r.finish !== c.finish) bad.push(`finish ${r.finish} ≠ ${c.finish}`); Object.entries(c.float || {}).forEach(([k, v]) => { if (r.acts[k].tf !== v) bad.push(`float ${k} ${r.acts[k].tf} ≠ ${v}`); }); out.push({ what: c.what, ok: !bad.length, bad }); if (bad.length) console.warn('[Learn] ' + c.what + ': ' + bad.join(', ')); }
      catch (e) { out.push({ what: c.what, ok: false, bad: [String(e.message)] }); }
    });
    L.lastSelfCheck = out; return out;
  };

  L.num = num; L.esc = esc;
})();
