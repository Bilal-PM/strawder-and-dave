/* LINESIDE Learning World: SEE, the Board (animated explainer beats) and the explorable (Jo's Planning Table).
 *
 * Beats are short: one idea, one picture, one line from the host and a Next button, always skippable. The first two
 * beats draw sticky notes on the whiteboard (they slide from a scatter into a network, and the arrows draw
 * themselves); the rest reuse the live Planning Table read-only, so what you're shown is exactly what you'll poke.
 * "Let me have a go first" (style 'try') runs the explorable and Puzzle 1 before the beats.
 */
window.LS = window.LS || {};
(function () {
  const L = LS.Learn, esc = L.esc, num = L.num;

  // Whiteboard positions (percent of the board) for the note stages.
  const POS = {
    notes: { kettle: [6, 10, -4], mugs: [58, 6, 3], bags: [30, 46, 5], pour: [74, 44, -3], brew: [8, 66, 2], milk: [50, 70, -5] },
    links: { kettle: [2, 16, 0], mugs: [2, 62, 0], bags: [22, 62, 0], pour: [43, 39, 0], brew: [63, 39, 0], milk: [82, 39, 0] },
    // phones: a snake in three columns, so notes never overlap
    linksN: { kettle: [2, 4, 0], pour: [35, 4, 0], brew: [68, 4, 0], mugs: [2, 58, 0], bags: [35, 58, 0], milk: [68, 58, 0] }
  };
  const narrow = () => innerWidth < 640;
  const posFor = st => st === 'links' && narrow() ? POS.linksN : POS[st] || POS.links;
  const COL = { kettle: '#ffe08a', mugs: '#bfe3ff', bags: '#c9f0c4', pour: '#ffd0b8', brew: '#f5c8e6', milk: '#fff2c4' };

  function notesHTML(acts, stage, picked) {
    const P = posFor(stage);
    return `<div class="lb-notes stage-${stage}">${acts.map(a => { const p = P[a.id] || [0, 0, 0]; return `<button class="lb-note ${picked === a.id ? 'picked' : ''}" data-note="${a.id}" style="left:${p[0]}%;top:${p[1]}%;--rot:${p[2]}deg;--nc:${COL[a.id] || '#fff2c4'}"><b>${esc(a.t)}</b><small>${num(a.dur)} min</small></button>`; }).join('')}
      <svg class="lb-arrows" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg></div>`;
  }
  // Arrows between notes, measured from the DOM once the notes have slid into place.
  function drawArrows(board, acts) {
    const svg = board.querySelector('.lb-arrows'); if (!svg) return;
    const br = svg.getBoundingClientRect(); if (!br.width) return;
    svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
    const rect = id => { const n = board.querySelector(`[data-note="${id}"]`); const r = n.getBoundingClientRect(); return { l: r.left - br.left, r: r.right - br.left, t: r.top - br.top, b: r.bottom - br.top, cy: r.top - br.top + r.height / 2 }; };
    let out = '<defs><marker id="lbm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#3a3d45"/></marker></defs>', k = 0;
    acts.forEach(s => s.preds.forEach(p => {
      const a = rect(p), b = rect(s.id);
      let d;
      if (b.l > a.r - 4) { const x1 = a.r + 2, y1 = a.cy, x2 = b.l - 3, y2 = b.cy, mx = (x1 + x2) / 2; d = `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`; }
      else { const cx = (a.l + a.r) / 2, up = b.b < a.t, y1 = up ? a.t - 2 : a.b + 2, y2 = up ? b.b + 3 : b.t - 3; d = `M${cx} ${y1} L${cx} ${y2}`; }
      out += `<path class="lb-arrow" style="animation-delay:${0.15 + 0.22 * k++}s" d="${d}" marker-end="url(#lbm)"/>`;
    }));
    svg.innerHTML = out;
  }

  // The weekend calendar for B6: Friday night to Monday morning, the plan inside, the wall at 06:00 Monday.
  function wallHTML() {
    const pc = h => 100 * h / 60, days = [['Fri', 0, 2], ['Saturday', 2, 26], ['Sunday', 26, 50], ['Monday', 50, 60]];
    return `<div class="lb-cal"><div class="lb-caldays">${days.map(([d, a, b]) => b - a > 6 ? `<span style="left:${pc((a + b) / 2)}%">${d}</span>` : '').join('')}</div>
      <div class="lb-caltrack">${[2, 26, 50].map(h => `<b class="lb-mid" style="left:${pc(h)}%"></b>`).join('')}<i class="lb-plan" style="width:${pc(48)}%"><span>The plan: 48 hours of work</span></i><i class="lb-margin" style="left:${pc(48)}%;width:${pc(8)}%"><span>8 h</span></i><i class="lb-wall" style="left:${pc(56)}%"><span>HANDBACK 06:00 MON</span></i></div>
      <div class="lb-calaxis"><span style="left:0">22:00 Fri</span><span class="r" style="left:${pc(48)}%">22:00 Sun</span></div>
      <div class="lb-callegend"><span><i class="k plan"></i>The work</span><span><i class="k margin"></i>Margin: room for faults</span><span><i class="k wall"></i>The wall: trains are waiting</span></div></div>`;
  }

  async function beats(mod, P, opt) {
    opt = opt || {};
    const B = mod.see.beats, cfg = mod.see.explorable.config, tell = P.style === 'tell';
    let i = 0, picked = null, table = null;
    const stage = L.stage(`<div class="lb">
      <div class="lb-head"><div class="eyebrow" id="lbEye"></div><h2 id="lbTitle"></h2></div>
      <div class="lb-board" id="lbBoard" aria-live="polite"></div>
      <div class="lb-say" id="lbSay"></div>
      <div class="lb-nav"><div class="lb-dots">${B.map((b, k) => `<i data-dot="${k}"></i>`).join('')}</div>
        <div class="lb-btns"><button class="btn line small" id="lbBack">Back</button><button class="btn line small" id="lbSkip">${opt.after ? 'Skip to the puzzles' : 'Skip to the Planning Table'}</button><button class="btn dark" id="lbNext" data-primary>Next →</button></div></div></div>`);
    const board = stage.querySelector('#lbBoard');
    const show = async () => {
      const b = B[i]; if (table) { table.destroy(); table = null; }
      stage.querySelector('#lbEye').textContent = `${opt.after ? 'The why · ' : ''}Beat ${i + 1} of ${B.length} · ${b.teaches}`;
      stage.querySelector('#lbTitle').textContent = b.title;
      stage.querySelectorAll('[data-dot]').forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('past', k < i); });
      stage.querySelector('#lbBack').disabled = i === 0;
      stage.querySelector('#lbNext').textContent = i === B.length - 1 ? (opt.after ? 'On to the puzzles →' : 'Open the Planning Table →') : 'Next →';
      const base = cfg.acts.map(a => Object.assign({}, a));
      if (b.visual === 'notes' || b.visual === 'links') {
        const prevNotes = board.querySelector('.lb-notes');
        if (prevNotes && b.visual === 'links') { prevNotes.className = 'lb-notes stage-links'; Object.entries(posFor('links')).forEach(([id, p]) => { const n = prevNotes.querySelector(`[data-note="${id}"]`); if (n) { n.style.left = p[0] + '%'; n.style.top = p[1] + '%'; n.style.setProperty('--rot', p[2] + 'deg'); } }); }
        else board.innerHTML = notesHTML(base, b.visual, picked);
        if (b.visual === 'links') setTimeout(() => drawArrows(board, base), L.reduced() ? 0 : 620);
        board.querySelectorAll('[data-note]').forEach(n => n.onclick = () => {
          if (b.ask !== 'first') return; picked = n.dataset.note; board.querySelectorAll('[data-note]').forEach(x => x.classList.toggle('picked', x === n));
          const r = mod.see.firstPick[picked]; if (r) { sayEl.innerHTML = L.lineHTML('jo', r, { mood: picked === 'kettle' ? 'smile' : 'neutral', noRole: true }); L.sfx('tap'); }
        });
      } else if (b.visual === 'wall') {
        board.innerHTML = wallHTML();
      } else {
        board.innerHTML = '<div class="lb-tablehost"></div>';
        let acts = base;
        if (b.visual === 'shift') acts = base.map(a => a.id === 'mugs' ? Object.assign({}, a, { dur: 3 }) : a);
        table = L.Table(board.querySelector('.lb-tablehost'), Object.assign({}, cfg, { acts, tray: [], title: null, max: 8 }), { readOnly: true, plain: b.visual === 'timeline', showFloat: b.visual === 'float', compact: true });
        if (b.visual === 'shift') { setTimeout(() => { if (table) board.querySelector('.lt').classList.add('swapped'); }, 60); }
      }
      const sayEl = stage.querySelector('#lbSay');
      sayEl.innerHTML = L.lineHTML('jo', '', { mood: 'smile', noRole: true });
      await L.type(sayEl.querySelector('.lw-tx'), tell ? b.tell : b.say);
      L.announce(`${b.title}. ${tell ? b.tell : b.say}`);
    };
    const sayEl = stage.querySelector('#lbSay');
    await show();
    P.boardBeats = P.boardBeats || {};
    return new Promise(res => {
      stage.querySelector('#lbNext').onclick = async () => { L.sfx('page'); P.boardBeats[B[i].id] = true; if (i === B.length - 1) { if (table) table.destroy(); res('done'); return; } i++; await show(); };
      stage.querySelector('#lbBack').onclick = async () => { if (i > 0) { i--; await show(); } };
      stage.querySelector('#lbSkip').onclick = () => { L.sfx('tap'); P.skippedBeats = true; if (table) table.destroy(); res('skip'); };
    });
  }

  // ---------- The explorable: Jo's Planning Table with its built-in challenges ----------
  L.explorable = async function (mod, P) {
    const X = mod.see.explorable, cfg = X.config, C = X.challenges;
    P.explore = P.explore || { done: {}, hints: 0 };
    let ci = C.findIndex(c => !P.explore.done[c.id]); if (ci < 0) ci = C.length;
    const stage = L.stage(`<div class="lx">
      <div class="lx-main"><div class="lx-tablehost" id="lxTable"></div></div>
      <aside class="lx-side"><div class="eyebrow">Challenges</div><ol class="lx-list" id="lxList"></ol>
        <div class="lx-jo" id="lxJo"></div>
        <div class="lx-actions"><button class="btn line small" id="lxHint">Ask Jo for a hint</button><button class="btn dark" id="lxNext" data-primary disabled>Next challenge →</button></div></aside></div>`);
    const jo = stage.querySelector('#lxJo');
    const joSay = (who, t, mood) => { jo.innerHTML = L.lineHTML(who || 'jo', t, { mood: mood || 'neutral', noRole: true }); L.announce(t); };
    const setupFor = c => {
      const tray = (cfg.tray || []).filter(t => c && t.challenge === C.indexOf(c) + 1);
      return { acts: cfg.acts.map(a => Object.assign({}, a)), tray };
    };
    const list = () => { stage.querySelector('#lxList').innerHTML = C.map((c, k) => `<li class="${P.explore.done[c.id] ? 'done' : ''} ${k === ci ? 'now' : ''}"><span class="bx">${P.explore.done[c.id] ? '✓' : k + 1}</span><span><b>${esc(c.title)}</b><small>${esc(c.goal)}</small></span></li>`).join('') + `<li class="${ci >= C.length ? 'now' : ''} bridge"><span class="bx">${C.length + 1}</span><span><b>${esc(X.bridge.title)}</b><small>The Crag Lane drain job, over at the Bench.</small></span></li>`; };
    const checkC = (c, st) => {
      if (!st.cpm) return false; const k = c.check, A = st.cpm.acts;
      if (k.critical && !(A[k.critical] && A[k.critical].critical && A.kettle)) return false;
      if (k.finishBelow != null && !(st.finish < k.finishBelow)) return false;
      if (k.linked && !(A[k.linked[1]] && A[k.linked[1]].preds.includes(k.linked[0]))) return false;
      if (k.dur && !(A[k.dur[0]] && A[k.dur[0]].dur >= k.dur[1])) return false;
      if (k.finish != null && Math.abs(st.finish - k.finish) > 1e-6) return false;
      return true;
    };
    let table = null, doneNow = false;
    const load = () => {
      if (table) table.destroy();
      const c = C[ci], s = setupFor(c);
      table = L.Table(stage.querySelector('#lxTable'), Object.assign({}, cfg, { acts: s.acts, tray: s.tray }), {
        onSay: (who, t) => joSay(who, t, 'neutral'),
        onChange: st => { if (!c || doneNow) return; if (checkC(c, st)) { doneNow = true; P.explore.done[c.id] = true; L.save(); L.sfx('good'); joSay('jo', c.done, 'smile'); list(); stage.querySelector('#lxNext').disabled = false; stage.querySelector('#lxNext').textContent = ci === C.length - 1 ? `${X.bridge.title} →` : 'Next challenge →'; stage.querySelector('.lx').classList.add('win'); setTimeout(() => { const el = stage.querySelector('.lx'); if (el) el.classList.remove('win'); }, 900); } }
      });
      doneNow = false; list();
      stage.querySelector('#lxNext').disabled = true;
      if (c) joSay('jo', `${c.title}. ${c.goal}`, 'smile');
    };
    if (ci >= C.length) { ci = C.length; }
    else load();
    if (ci >= C.length) { if (table) table.destroy(); return; }
    return new Promise(res => {
      stage.querySelector('#lxHint').onclick = () => { const c = C[ci]; if (!c) return; P.explore.hints++; P.hints = (P.hints || 0) + 1; L.save(); joSay('jo', c.hint, 'neutral'); L.sfx('tap'); };
      stage.querySelector('#lxNext').onclick = () => {
        L.sfx('page'); ci++;
        if (ci >= C.length) { if (table) table.destroy(); joSay('jo', X.bridge.say, 'smile'); res(); return; }
        load();
      };
    });
  };

  // ---------- The step ----------
  L.steps.board = async function (mod, P) {
    if (P.style === 'try' && !P.triedFirst) {
      // productive failure: have a go first, then hear the idea
      await L.benchIntro(mod, P, { tryFirst: true });
      P.triedFirst = true; L.save();
      L.shell(mod, 'board');
      await beats(mod, P, { after: true });
      return;
    }
    await beats(mod, P);
  };
})();
