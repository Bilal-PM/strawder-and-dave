/* LINESIDE Learning World: the Planning Table (the `network_table` explorable).
 *
 * A live network on a timeline. Every change runs a forward and backward pass (LS.Learn.cpm, which uses LS.AI.cpm
 * when the tutor is loaded) and the bars ripple to their new early starts. The critical chain glows lamp amber and a
 * flag shows the finish. Works with a mouse and keyboard, and with taps alone on a phone (no fine dragging needed).
 *
 *   const t = LS.Learn.Table(hostEl, cfg, opts)
 *   cfg:  { acts:[{id,t,dur,preds,row?,locked?,note?,fixed?,milestone?,ghost?}], tray:[…], unit, step, max, wall,
 *           wallLabel, clock:{startHour,startDay}, now, windows:[{act,to,label}] }
 *   opts: { editable:{dur,link,place,wall}, toggles:[…], onChange(state), onSay(who,text), readOnly, highlight:[ids],
 *           showFloat, showTimes, compact }
 *   t.state() -> {acts, cpm, finish, critical:[ids]} · t.set(acts) · t.select(id) · t.destroy()
 *
 * Accessibility: every card is a button with its times in the label; the finish is announced in a live region;
 * arrow keys stretch the selected card; Delete removes a selected link.
 */
window.LS = window.LS || {};
(function () {
  const L = LS.Learn = LS.Learn || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = v => { const r = Math.round(v * 100) / 100; return String(r).replace(/\.0+$/, ''); };
  L.num = num; L.esc = esc;

  // ---------- Critical path method ----------
  function ownCpm(acts) {
    const by = {}, order = [], seen = {}, tmp = {};
    acts.forEach(a => { by[a.id] = Object.assign({ preds: [] }, a); });
    const visit = id => { if (seen[id]) return; if (tmp[id]) throw new Error('dependency loop at ' + id); tmp[id] = 1; by[id].preds.forEach(p => { if (!by[p]) throw new Error('unknown predecessor ' + p); visit(p); }); tmp[id] = 0; seen[id] = 1; order.push(id); };
    acts.forEach(a => visit(a.id));
    order.forEach(id => { const a = by[id]; a.es = 0; a.preds.forEach(p => { a.es = Math.max(a.es, by[p].ef); }); a.ef = a.es + a.dur; });
    let finish = 0; order.forEach(id => { finish = Math.max(finish, by[id].ef); });
    const succ = {}; order.forEach(id => succ[id] = []); order.forEach(id => by[id].preds.forEach(p => succ[p].push(id)));
    for (let i = order.length - 1; i >= 0; i--) { const a = by[order[i]]; a.lf = finish; succ[a.id].forEach(s => { a.lf = Math.min(a.lf, by[s].ls); }); a.ls = a.lf - a.dur; a.tf = a.ls - a.es; a.critical = a.tf === 0; }
    return { finish, acts: by, order };
  }
  // Rounds away floating-point dust (0.1 + 0.2) so float is exactly zero on the critical chain.
  L.cpm = function (acts) {
    const clean = acts.map(a => Object.assign({}, a, { dur: Math.round((+a.dur || 0) * 1000) / 1000, preds: (a.preds || []).slice() }));
    const r = (LS.AI && LS.AI.cpm) ? LS.AI.cpm(clean) : ownCpm(clean);
    const fix = v => Math.round(v * 1000) / 1000;
    const succ = {}; Object.keys(r.acts).forEach(id => succ[id] = []);
    Object.values(r.acts).forEach(a => { ['es', 'ef', 'ls', 'lf', 'tf'].forEach(k => a[k] = fix(a[k])); a.critical = Math.abs(a.tf) < 1e-6; a.preds.forEach(p => succ[p].push(a.id)); });
    r.finish = fix(r.finish); r.succ = succ;
    r.critEdge = (p, s) => r.acts[p].critical && r.acts[s].critical && Math.abs(r.acts[p].ef - r.acts[s].es) < 1e-6;
    r.criticalIds = r.order.filter(id => r.acts[id].critical && !r.acts[id].ghost);
    // every critical chain from a start to the finish (for the "Critical: A → C → …" line)
    r.chains = [];
    const walk = (id, path) => { const nx = succ[id].filter(s => r.critEdge(id, s)); if (!nx.length) { if (Math.abs(r.acts[id].ef - r.finish) < 1e-6) r.chains.push(path); return; } nx.forEach(s => walk(s, path.concat(s))); };
    r.order.filter(id => r.acts[id].critical && !r.acts[id].preds.some(p => r.critEdge(p, id))).forEach(id => walk(id, [id]));
    return r;
  };
  // Would linking from -> to make a loop? (true if `from` already depends on `to`)
  L.wouldLoop = function (acts, from, to) {
    if (from === to) return true;
    const by = {}; acts.forEach(a => by[a.id] = a);
    const stack = [from], seen = {};
    while (stack.length) { const id = stack.pop(); if (id === to) return true; if (seen[id]) continue; seen[id] = 1; ((by[id] && by[id].preds) || []).forEach(p => stack.push(p)); }
    return false;
  };
  // "22:00 Fri" style clock labels for hour-based plans
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  L.clockAt = function (clock, h) {
    if (!clock) return null;
    const total = clock.startHour + h, day = (DAYS.indexOf(clock.startDay) + Math.floor(total / 24)) % 7, hr = ((total % 24) + 24) % 24;
    const hh = Math.floor(hr), mm = Math.round((hr - hh) * 60);
    return { t: String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), day: DAYS[day], short: DAYS[day].slice(0, 3) };
  };

  // ---------- The table ----------
  L.Table = function (host, cfg, opts) {
    opts = Object.assign({ editable: { dur: true, link: true, place: true, wall: true }, toggles: ['float', 'times', 'wall', 'tidy'], onChange: null, onSay: null }, opts || {});
    const ed = opts.readOnly ? {} : (opts.editable || {});
    const unit = cfg.unit || '', step = cfg.step || 1;
    let acts = cfg.acts.map((a, i) => Object.assign({ row: i }, a, { preds: (a.preds || []).slice() }));
    let tray = (cfg.tray || []).map(a => Object.assign({}, a, { preds: (a.preds || []).slice() }));
    let sel = null, selLink = null, linkFrom = null, showFloat = !!opts.showFloat, showTimes = !!opts.showTimes, wall = cfg.wall != null ? cfg.wall : null, wallOn = wall != null;
    let undo = [], R = null, lastFinish = null, wobble = null, highlight = opts.highlight || [];
    const uid = 'lt' + Math.random().toString(36).slice(2, 7);
    host.classList.add('lt-host');

    const snapshot = () => { undo.push(JSON.stringify({ acts, tray, wall, wallOn })); if (undo.length > 40) undo.shift(); };
    const byId = id => acts.find(a => a.id === id);
    const say = (who, t) => { if (opts.onSay) opts.onSay(who, t); };
    const U = v => `${num(v)} ${unit}`.trim();

    function compute() {
      try { R = L.cpm(acts); } catch (e) { R = null; }
      return R;
    }
    function state() { compute(); return { acts: acts.map(a => Object.assign({}, a)), cpm: R, finish: R ? R.finish : null, critical: R ? R.criticalIds : [], wall: wallOn ? wall : null, tray: tray.slice() }; }
    function changed(fromUser) {
      compute(); render();
      if (R && lastFinish != null && R.finish !== lastFinish) announce(`Finish now ${U(R.finish)}.`);
      if (R) lastFinish = R.finish;
      if (opts.onChange) opts.onChange(state(), fromUser);
    }
    function announce(t) { const lv = document.getElementById('live'); if (lv) lv.textContent = t; }

    // ---- rendering ----
    function render() {
      compute();
      const rows = acts.slice().sort((a, b) => a.row - b.row);
      const fin = R ? R.finish : 0;
      const maxT = Math.max(cfg.max || 0, fin, wallOn ? wall : 0, ...(cfg.windows || []).map(w => w.to)) * 1.06 || 1;
      const pc = v => (100 * v / maxT);
      // axis ticks: as many as fit (about one per 56 px of track, fewer for clock labels)
      const trackW = Math.max(160, (host.clientWidth || 600) * 0.66), room = Math.max(3, Math.floor(trackW / (cfg.clock ? 74 : 34)));
      const tickStep = [0.5, 1, 2, 4, 6, 8, 12, 24].find(s => s >= step && maxT / s <= room) || 24;
      const ticks = []; for (let v = 0; v <= maxT + 1e-9; v += tickStep) ticks.push(Math.round(v * 100) / 100);
      const crit = R ? R.criticalIds : [];
      const critLine = R && R.chains.length ? R.chains.slice(0, 2).map(c => c.map(id => esc(byId(id).code || byId(id).t)).join(' → ')).join('<br>and ') : '—';
      const margin = wallOn && R ? wall - fin : null;
      const selA = sel && byId(sel);
      const tog = (k, lbl, on) => `<button class="lt-tog ${on ? 'on' : ''}" data-tog="${k}" aria-pressed="${!!on}">${lbl}</button>`;
      const tools = opts.readOnly ? '' : `<div class="lt-tools">${(opts.toggles || []).map(k => k === 'float' ? tog('float', 'Float', showFloat) : k === 'times' ? tog('times', 'Early / late times', showTimes) : k === 'wall' && ed.wall ? tog('wall', 'Finish wall', wallOn) + (wallOn ? `<span class="lt-step"><button data-wall="-" aria-label="Move the wall earlier">−</button><b>${num(wall)}</b><button data-wall="+" aria-label="Move the wall later">+</button></span>` : '') : k === 'tidy' ? `<button class="lt-tog" data-tidy>Tidy</button>` : '').join('')}${undo.length && !opts.readOnly ? '<button class="lt-tog" data-undo>Undo</button>' : ''}</div>`;
      const clk = v => { const c = L.clockAt(cfg.clock, v); return c ? `${c.t} ${c.short}` : U(v); };
      const rowHTML = a => {
        const x = R && R.acts[a.id], isC = x && x.critical && !a.ghost, isSel = sel === a.id, fl = x ? x.tf : 0;
        const neg = wallOn && x && (x.ef > wall);
        const win = (cfg.windows || []).find(w => w.act === a.id), clash = win && x && x.ef > win.to + 1e-6;
        const hl = highlight.includes(a.id);
        const lbl = `${a.t}, ${U(a.dur)}${x ? `, starts at ${num(x.es)}, finishes at ${num(x.ef)}${isC ? ', critical' : `, float ${num(fl)}`}` : ''}`;
        return `<div class="lt-row ${isC ? 'crit' : ''} ${isSel ? 'sel' : ''} ${a.ghost ? 'ghost' : ''} ${wobble === a.id ? 'wob' : ''} ${hl ? 'hl' : ''}" data-row="${a.id}">
          <button class="lt-name" data-act="${esc(a.id)}" aria-label="${esc(lbl)}" aria-pressed="${isSel}">${a.code ? `<span class="lt-code">${esc(a.code)}</span>` : ''}<span class="lt-t">${esc(a.t)}</span><small>${esc(U(a.dur))}${a.locked ? ' · fixed' : ''}${a.note ? ' · ' + esc(a.note) : ''}</small></button>
          <div class="lt-track">
            ${x && showFloat && fl > 0 && !a.ghost ? `<i class="lt-float" style="left:${pc(x.ef)}%;width:${pc(fl)}%"></i>` : ''}
            ${win ? `<i class="lt-win ${clash ? 'bad' : ''}" style="left:0;width:${pc(win.to)}%"></i>` : ''}
            ${x ? `<i class="lt-bar ${isC ? 'crit' : ''} ${neg || clash ? 'neg' : ''} ${a.dur === 0 ? 'zero' : ''}" data-act="${esc(a.id)}" aria-hidden="true" style="left:${pc(x.es)}%;width:${Math.max(0, pc(a.dur))}%">${ed.dur && !a.locked && !a.fixed && !a.ghost ? '<span class="lt-grip" data-grip="' + esc(a.id) + '"></span>' : ''}</i>
            <span class="lt-dur ${pc(x.ef) > 82 ? 'in' : ''}" style="left:${pc(x.ef)}%">${esc(num(a.dur))}</span>
            ${ed.link && !a.ghost ? `<button class="lt-out" data-out="${esc(a.id)}" style="left:${pc(x.ef)}%" aria-label="Make another job wait for ${esc(a.t)}" title="Link: make another job wait for this one"></button>` : ''}
            ${showTimes ? `<span class="lt-times" style="left:${pc(x.es)}%">ES ${num(x.es)} · EF ${num(x.ef)} · LS ${num(x.ls)} · LF ${num(x.lf)}</span>` : ''}` : ''}
          </div></div>`;
      };
      const flagX = pc(fin);
      host.innerHTML = `<div class="lt ${opts.compact ? 'compact' : ''} ${opts.plain ? 'plain' : ''} ${linkFrom ? 'linking' : ''}" id="${uid}">
        <div class="lt-top">
          <div class="lt-title">${cfg.title ? `<div class="eyebrow">${esc(cfg.subtitle || '')}</div><h3>${esc(cfg.title)}</h3>` : ''}</div>
          <div class="lt-finish" aria-hidden="true"><span>Finish</span><b>${R ? esc(cfg.clock ? clk(fin) : num(fin)) : '—'}</b><small>${R && !cfg.clock ? esc(cfg.unitLong || unit) : R ? 'hour ' + num(fin) : 'loop!'}</small>${margin != null ? `<em class="${margin < 0 ? 'neg' : margin < 2 ? 'thin' : ''}">${margin < 0 ? num(-margin) + ' ' + esc(unit) + ' past the wall' : num(margin) + ' ' + esc(unit) + ' margin'}</em>` : ''}</div>
        </div>
        ${tools}
        <div class="lt-body">
          <div class="lt-rows">${rows.map(rowHTML).join('')}</div>
          <div class="lt-overlay" aria-hidden="true">
            <svg class="lt-svg"><defs><marker id="${uid}m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs><g class="lt-links"></g></svg>
            ${R ? `<div class="lt-flag" style="left:${flagX}%"><span>${esc(cfg.clock ? clk(fin) : U(fin))}</span></div>` : ''}
            ${wallOn ? `<div class="lt-wall" style="left:${pc(wall)}%"><span>${esc(cfg.wallLabel || 'WALL ' + U(wall))}</span></div>${margin > 0 ? `<div class="lt-margin" style="left:${flagX}%;width:${pc(margin)}%"></div>` : ''}` : ''}
            ${cfg.now != null ? `<div class="lt-now" style="left:${pc(cfg.now)}%"><span>Now</span></div>` : ''}
          </div>
        </div>
        <div class="lt-axis">${ticks.map(v => `<span style="left:${pc(v)}%">${esc(cfg.clock ? (L.clockAt(cfg.clock, v).t) : num(v))}</span>`).join('')}</div>
        <div class="lt-crit"><span class="lt-lamp"></span><span>${R ? `<b>Critical path</b> ${critLine}` : `<b>That makes a loop.</b> Undo it to carry on.`}</span></div>
        ${inspector(selA)}
        ${ed.place && tray.length ? `<div class="lt-tray"><div class="eyebrow">In the tray</div>${tray.map(c => `<div class="lt-card"><div><b>${esc(c.t)}</b><small>${esc(U(c.dur))}${c.note ? ' · ' + esc(c.note) : ''}</small></div><button class="btn dark small" data-place="${esc(c.id)}">${c.replaces ? 'Swap in' : 'Place'}</button></div>`).join('')}</div>` : ''}
      </div>`;
      bind();
      requestAnimationFrame(drawLinks);
      clearTimeout(host._lt); host._lt = setTimeout(drawLinks, 170);
    }
    function inspector(a) {
      if (opts.readOnly) return '';
      if (linkFrom) { const f = byId(linkFrom); return `<div class="lt-insp link"><span>Linking from <b>${esc(f.t)}</b>. Tap the job that has to wait for it.</span><button class="btn line small" data-cancel>Cancel</button></div>`; }
      if (selLink) { const [p, s] = selLink.split('>'); return `<div class="lt-insp"><span><b>${esc(byId(p).t)}</b> → <b>${esc(byId(s).t)}</b></span><button class="btn line small lt-bin" data-unlink aria-label="Remove this link">🗑 Remove link</button></div>`; }
      if (!a) return `<div class="lt-insp hint"><span>${esc(opts.hint || (ed.dur ? 'Tap a job to stretch or shrink it.' : 'Tap a job to see its times.'))}${ed.link ? ' Tap the dot at the end of a bar to link it to another job.' : ''}</span></div>`;
      const x = R && R.acts[a.id];
      return `<div class="lt-insp"><span class="lt-it"><b>${esc(a.t)}</b><small>${x ? (x.critical ? 'Critical: zero float' : `Float ${esc(U(x.tf))}`) + ` · starts ${esc(cfg.clock ? clkS(x.es) : num(x.es))}, ends ${esc(cfg.clock ? clkS(x.ef) : num(x.ef))}` : ''}</small></span>
        ${ed.dur && !a.ghost ? `<span class="lt-step big"><button data-dur="-" aria-label="Shorten ${esc(a.t)}">−</button><b>${esc(num(a.dur))}</b><button data-dur="+" aria-label="Lengthen ${esc(a.t)}">+</button></span>` : ''}
        ${ed.link && !a.ghost ? `<button class="btn line small" data-linkfrom="${esc(a.id)}">⟶ Link</button>` : ''}
        ${a.fromTray ? `<button class="btn line small" data-remove="${esc(a.id)}">Back to tray</button>` : ''}</div>`;
    }
    const clkS = v => { const c = L.clockAt(cfg.clock, v); return c ? `${c.t} ${c.short}` : num(v); };

    function drawLinks() {
      const g = host.querySelector('.lt-links'), svg = host.querySelector('.lt-svg'); if (!g || !svg || !R) { if (g) g.innerHTML = ''; return; }
      const sr = svg.getBoundingClientRect(); if (!sr.width) return;
      svg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
      const pos = id => { const b = host.querySelector(`.lt-row[data-row="${CSS.escape(id)}"] .lt-bar`); if (!b) return null; const r = b.getBoundingClientRect(); return { l: r.left - sr.left, r: r.right - sr.left, y: r.top - sr.top + r.height / 2, h: r.height }; };
      let out = '';
      acts.forEach(s => s.preds.forEach(p => {
        const a = pos(p), b = pos(s.id); if (!a || !b) return;
        const c = R.critEdge(p, s.id), k = p + '>' + s.id, x1 = a.r, y1 = a.y, x2 = b.l, y2 = b.y, mx = Math.max(x1 + 7, Math.min(x2 - 4, x1 + 14));
        const d = x2 >= x1 + 12 ? `M${x1} ${y1} H${mx} V${y2} H${x2}` : `M${x1} ${y1} C${x1 + 26} ${y1}, ${x2 - 26} ${y2}, ${x2} ${y2}`;
        out += `<g class="lt-link ${c ? 'crit' : ''} ${selLink === k ? 'sel' : ''} ${byId(p).ghost ? 'ghost' : ''}" data-link="${esc(k)}"><path class="hit" d="${d}"/><path class="ln" d="${d}" marker-end="url(#${uid}m)"/></g>`;
      }));
      g.innerHTML = out;
      if (!opts.readOnly && ed.link) g.querySelectorAll('[data-link]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); selLink = el.dataset.link; sel = null; linkFrom = null; render(); }));
    }

    // ---- actions ----
    function setDur(id, v, fromUser) {
      const a = byId(id); if (!a) return;
      if (a.locked) { say(cfg.lockWho || 'jo', a.locked); wob(id); return; }
      if (a.fixed) { say('hannah', a.fixed); wob(id); return; }
      v = Math.max(0, Math.min(cfg.maxDur || 99, Math.round(v / step) * step));
      if (v === a.dur) return;
      snapshot(); a.dur = v; changed(fromUser);
    }
    function link(from, to) {
      const s = byId(to); if (!s || from === to) return;
      if (s.preds.includes(from)) { linkFrom = null; render(); say('jo', 'Those two are already linked.'); return; }
      if (L.wouldLoop(acts, from, to)) { linkFrom = null; wob(to); say('jo', cfg.loopLine || 'That’d make a job wait for itself.'); return; }
      snapshot(); s.preds.push(from); linkFrom = null; sel = null; changed(true);
    }
    function wob(id) { wobble = id; render(); setTimeout(() => { if (wobble === id) { wobble = null; const r = host.querySelector(`.lt-row[data-row="${CSS.escape(id)}"]`); if (r) r.classList.remove('wob'); } }, 520); }
    function place(id) {
      const c = tray.find(t => t.id === id); if (!c) return;
      snapshot();
      tray = tray.filter(t => t !== c);
      const n = Object.assign({}, c, { fromTray: true, preds: (c.preds || []).slice() });
      if (c.replaces && byId(c.replaces)) {
        const old = byId(c.replaces);
        n.row = old.row; n.preds = old.preds.slice();
        acts.forEach(a => { a.preds = a.preds.map(p => p === old.id ? n.id : p); });
        acts = acts.filter(a => a !== old);
        tray.push(Object.assign({}, old, { preds: old.preds, replaces: n.id, swappedOut: true }));
        acts.push(n);
      } else { n.row = Math.max(-1, ...acts.map(a => a.row)) + 1; acts.push(n); }
      sel = n.id; changed(true);
    }
    function unplace(id) {
      const a = byId(id); if (!a || !a.fromTray) return;
      snapshot();
      if (a.replaces && tray.find(t => t.id === a.replaces)) { place(a.replaces); return; }
      acts.forEach(x => { x.preds = x.preds.filter(p => p !== id); }); acts = acts.filter(x => x !== a);
      const c = Object.assign({}, a); delete c.fromTray; c.preds = []; tray.push(c); sel = null; changed(true);
    }
    function bind() {
      const q = s => host.querySelectorAll(s);
      q('[data-act]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation(); const id = b.dataset.act;
        if (linkFrom) { link(linkFrom, id); return; }
        if (opts.readOnly && !opts.selectable) return;
        selLink = null; sel = sel === id ? null : id; render();
        const nb = host.querySelector(`.lt-name[data-act="${CSS.escape(id)}"]`); if (nb && sel) nb.focus({ preventScroll: true });
      }));
      q('[data-out]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); linkFrom = b.dataset.out; sel = null; selLink = null; render(); }));
      q('[data-linkfrom]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); linkFrom = b.dataset.linkfrom; sel = null; render(); }));
      q('[data-cancel]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); linkFrom = null; render(); }));
      q('[data-unlink]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); removeLink(); }));
      q('[data-dur]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const a = byId(sel); if (a) setDur(a.id, a.dur + (b.dataset.dur === '+' ? step : -step), true); }));
      q('[data-place]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); place(b.dataset.place); }));
      q('[data-remove]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); unplace(b.dataset.remove); }));
      q('[data-tog]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const k = b.dataset.tog; if (k === 'float') showFloat = !showFloat; if (k === 'times') showTimes = !showTimes; if (k === 'wall') { wallOn = !wallOn; if (wall == null) wall = Math.ceil((R ? R.finish : 6) + 1); } render(); if (opts.onChange) opts.onChange(state(), true); }));
      q('[data-wall]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); wall = Math.max(0, wall + (b.dataset.wall === '+' ? step : -step)); render(); if (opts.onChange) opts.onChange(state(), true); }));
      q('[data-tidy]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (!R) return; snapshot(); acts.slice().sort((a, b) => (R.acts[a.id].es - R.acts[b.id].es) || (a.row - b.row)).forEach((a, i) => a.row = i); render(); }));
      q('[data-undo]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const s = undo.pop(); if (!s) return; const o = JSON.parse(s); acts = o.acts; tray = o.tray; wall = o.wall; wallOn = o.wallOn; sel = null; selLink = null; linkFrom = null; changed(true); }));
      const body = host.querySelector('.lt-body'); if (body) body.addEventListener('click', () => { if (sel || selLink || linkFrom) { sel = null; selLink = null; linkFrom = null; render(); } });
      // desktop: drag a bar's right edge to stretch it; drag from the dot to another job to link
      q('[data-grip]').forEach(gp => gp.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation(); const id = gp.dataset.grip, a = byId(id), tr = gp.closest('.lt-track').getBoundingClientRect();
        const maxT = Math.max(cfg.max || 0, R ? R.finish : 0, wallOn ? wall : 0) * 1.06, x0 = e.clientX, d0 = a.dur, perPx = maxT / tr.width;
        const mv = ev => { const v = d0 + (ev.clientX - x0) * perPx; const nv = Math.max(0, Math.round(v / step) * step); if (nv !== byId(id).dur) { if (a.locked || a.fixed) return; byId(id).dur = nv; compute(); render(); } };
        const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (byId(id).dur !== d0) { const nv = byId(id).dur; byId(id).dur = d0; setDur(id, nv, true); } else if (a.locked || a.fixed) setDur(id, d0 + step, true); };
        addEventListener('pointermove', mv); addEventListener('pointerup', up);
      }));
      q('[data-out]').forEach(o => o.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse') return; e.preventDefault(); const from = o.dataset.out; let moved = false;
        const svg = host.querySelector('.lt-svg'), sr = svg.getBoundingClientRect(), orr = o.getBoundingClientRect(), g = host.querySelector('.lt-links');
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('class', 'lt-drag'); g.appendChild(tmp);
        const mv = ev => { moved = true; tmp.setAttribute('d', `M${orr.left + orr.width / 2 - sr.left} ${orr.top + orr.height / 2 - sr.top} L${ev.clientX - sr.left} ${ev.clientY - sr.top}`); };
        const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); tmp.remove(); if (!moved) return; const t = document.elementFromPoint(ev.clientX, ev.clientY), row = t && t.closest && t.closest('.lt-row'); if (row && row.dataset.row !== from) link(from, row.dataset.row); };
        addEventListener('pointermove', mv); addEventListener('pointerup', up);
      }));
    }
    function removeLink() { if (!selLink) return; const [p, s] = selLink.split('>'); snapshot(); const a = byId(s); a.preds = a.preds.filter(x => x !== p); selLink = null; changed(true); }
    const onKey = e => {
      if (!host.isConnected) { removeEventListener('keydown', onKey); return; }
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selLink) { e.preventDefault(); removeLink(); return; }
      if (e.key === 'Escape' && (sel || selLink || linkFrom)) { e.preventDefault(); e.stopPropagation(); sel = null; selLink = null; linkFrom = null; render(); return; }
      if (sel && ed.dur && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); const a = byId(sel); setDur(a.id, a.dur + (e.key === 'ArrowRight' ? step : -step), true); const nb = host.querySelector(`.lt-name[data-act="${CSS.escape(sel || '')}"]`); if (nb) nb.focus({ preventScroll: true }); }
    };
    addEventListener('keydown', onKey);
    let ro = null; try { ro = new ResizeObserver(() => drawLinks()); ro.observe(host); } catch (e) { }
    render(); lastFinish = R ? R.finish : null;
    return {
      state, render,
      set(newActs, o) { acts = newActs.map((a, i) => Object.assign({ row: i }, a, { preds: (a.preds || []).slice() })); if (o && o.tray) tray = o.tray.map(t => Object.assign({}, t)); if (o && 'wall' in o) { wall = o.wall; wallOn = o.wall != null; } sel = null; selLink = null; linkFrom = null; undo = []; changed(false); },
      setDur: (id, v) => setDur(id, v, false), select(id) { sel = id; render(); }, highlight(ids) { highlight = ids || []; render(); },
      toggle(k, v) { if (k === 'float') showFloat = v; if (k === 'times') showTimes = v; render(); },
      place, link: (a, b) => link(a, b), unlink(p, s) { selLink = p + '>' + s; removeLink(); },
      destroy() { removeEventListener('keydown', onKey); if (ro) ro.disconnect(); host.innerHTML = ''; }
    };
  };
})();
