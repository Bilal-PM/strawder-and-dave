/* LINESIDE test helpers that run inside the page.
 *
 * Injected with addInitScript, so this runs before the game's own scripts. It defines window.__T.
 * It talks to the game only through the stable test API:
 *   LS.game.S(), LS.game.world(), LS.game.currentTarget(), LS.WORLD.{MAP,DOORS,ROOMS}, LS.PACKS['kestrel-vale'],
 *   and the DOM layers (#title #setup #chapter #talk #panel #report #board, class 'on' when visible).
 * No map coordinates are hardcoded here: every position comes from the running game.
 *
 * window.__T_CFG (set by the harness, same script) = { settings, gameSeed, policySeed }.
 */
(function () {
  const CFG = window.__T_CFG || {};
  const T = (window.__T = {
    cfg: CFG, mut: 0, frames: 0, layerLog: [], covered: [], violations: [], unknownChoices: [], asyncErrors: [],
    doneOrder: [], randBudget: 40, boardBudget: 3, backBudget: 2, planFix: false, notes: []
  });

  // ---------- Settings and seeding ----------
  // Game settings live in localStorage (e.g. {instant:true} shows dialogue text instantly). Written before the game boots.
  if (CFG.settings) { try { localStorage.setItem('lineside_settings', JSON.stringify(CFG.settings)); } catch (e) { } }
  const mulberry = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  if (CFG.gameSeed != null) Math.random = mulberry(CFG.gameSeed);   // makes a run close to reproducible
  T.rnd = mulberry(CFG.policySeed == null ? 1 : CFG.policySeed);     // the test policy's own random stream

  // ---------- Frame counter and DOM mutation counter ----------
  const tick = () => { T.frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  const LAYERS = T.LAYERS = ['title', 'setup', 'chapter', 'talk', 'panel', 'report', 'board', 'share'];
  const watch = () => {
    const main = document.querySelector('main') || document.body;
    new MutationObserver(recs => {
      T.mut++;
      for (const r of recs) if (r.type === 'attributes' && r.target.classList && r.target.classList.contains('layer')) {
        const id = r.target.id, isOn = r.target.classList.contains('on'), was = (r.oldValue || '').split(/\s+/).includes('on');
        if (isOn !== was) T.layerLog.push([id, isOn ? 'on' : 'off', T.frames]);
      }
    }).observe(main, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();

  // ---------- Basics ----------
  const $ = s => document.querySelector(s);
  const on = id => { const el = document.getElementById(id); return !!(el && el.classList.contains('on')); };
  T.on = on;
  T.layersOn = () => LAYERS.filter(on);
  T.ready = () => { try { return !!(window.LS && LS.game && LS.game.world && LS.game.world() && LS.WORLD && LS.PACKS); } catch (e) { return false; } };
  T.W = () => LS.game.world();
  T.S = () => LS.game.S();
  T.pack = () => LS.PACKS['kestrel-vale'];
  T.isIndoor = room => !!(LS.WORLD.ROOMS && LS.WORLD.ROOMS[room]);
  T.visibleEl = el => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.02) return false; }
    return true;
  };
  // Rendered and clickable (ignores opacity, so a card that is still fading in counts).
  T.rendered = el => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return false; }
    return true;
  };
  T.desc = el => {
    if (!el) return '(nothing)'; if (el.nodeType !== 1) return String(el.nodeName);
    let s = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].slice(0, 3).map(c => '.' + c).join('');
    const layer = el.closest && el.closest('.layer,#hud'); if (layer && layer !== el) s = (layer.id ? '#' + layer.id : '') + ' ' + s;
    const tx = (el.textContent || '').replace(/\s+/g, ' ').trim(); if (tx) s += ` "${tx.slice(0, 40)}${tx.length > 40 ? '…' : ''}"`;
    return s;
  };
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  T.hash = hashStr;

  // ---------- Where is the game? ----------
  const tagText = () => { const t = $('#panel .call-head .tag'); return t ? t.textContent.replace(/\s+/g, ' ').trim() : ''; };
  T.state = () => {
    if (!T.ready()) return { k: 'loading' };
    const L = T.layersOn(), w = T.W(), S = T.S();
    const base = { room: w.room, ppe: !!S.ppe, done: Object.keys(S.done || {}).filter(k => S.done[k]), graded: (S.graded || []).length, week: S.week, layers: L };
    const k = (() => {
      if (L.includes('share')) return { k: 'share' };
      if (L.includes('board')) return { k: 'board' };
      if (L.includes('panel')) {
        const p = $('#panel');
        if (p.querySelector('.tray')) return { k: 'plan', tag: tagText() };
        if (p.querySelector('.conf button')) return { k: 'conf', tag: tagText() };
        if (p.querySelector('.opt[data-c]')) return { k: 'opt', tag: tagText() };
        if (p.querySelector('[data-go]')) return { k: 'go', tag: tagText() };
        return { k: 'busy', why: 'panel without controls' };
      }
      if (L.includes('report')) return { k: 'report' };
      if (L.includes('chapter')) return { k: 'chapter' };
      if (L.includes('talk')) {
        const t = $('#talk'), bs = [...t.querySelectorAll('.choices button')].filter(T.rendered);
        const box = t.firstElementChild;
        const sub = box ? (box.classList.contains('narr') ? 'narr' : box.classList.contains('note') ? 'note' : 'dlg') : '';
        if (bs.length) return { k: 'choice', n: bs.length, sub };
        if (box) return { k: 'advance', sub };
        return { k: 'busy', why: 'empty talk layer' };
      }
      if (L.includes('setup')) return { k: 'setup' };
      if (L.includes('title')) return { k: 'title' };
      if (w.fadeDir) return { k: 'fade' };
      if (w.paused) return { k: 'busy', why: 'world paused' };
      return { k: 'explore' };
    })();
    return Object.assign(base, k);
  };
  // Changes whenever anything the driver cares about changes.
  T.sig = () => {
    if (!T.ready()) return 'loading';
    const w = T.W();
    return [T.mut, T.layersOn().join(','), w.room, w.paused ? 1 : 0, w.fadeDir || 0].join('#');
  };

  // ---------- Clicking like a person (with a hit test) ----------
  // Is el (or anything above it) in the middle of a CSS animation? Then its position isn't final yet.
  T.animating = el => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { try { if (n.getAnimations().some(a => a.playState === 'running' && isFinite(a.effect.getTiming().iterations))) return true; } catch (e) { return false; } } return false; };
  T.click = (el, o) => {
    o = o || {};
    if (!el) throw new Error('nothing to click');
    if (!o.noHit && !T.animating(el)) {
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { }
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) T.covered.push({ target: T.desc(el), by: 'off-screen', at: [Math.round(x), Math.round(y)] });
      else {
        const top = document.elementFromPoint(x, y);
        if (!top || !(top === el || el.contains(top))) T.covered.push({ target: T.desc(el), by: T.desc(top), at: [Math.round(x), Math.round(y)] });
      }
    }
    el.click();
  };

  // ---------- Expert grades from the content pack ----------
  const norm = t => String(t).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\{name\}/g, (T.ready() && T.S().name) || '').replace(/\s+/g, ' ').trim();
  T.norm = norm;
  T.gradeTable = () => {
    if (T._gt) return T._gt;
    const m = new Map(), pref = new Set(), seen = new Set();
    const walk = (o, depth) => {
      if (!o || typeof o !== 'object' || seen.has(o) || depth > 12) return; seen.add(o);
      if (typeof o.t === 'string' && typeof o.grade === 'string') { const k = norm(o.t); m.set(k, m.has(k) && m.get(k) !== o.grade ? 'ambiguous' : o.grade); }
      // un-graded side questions carry the "nice" answer as {options:[...], pick:n}
      if (Array.isArray(o.options) && typeof o.pick === 'number' && typeof o.options[o.pick] === 'string') pref.add(norm(o.options[o.pick]));
      for (const v of Array.isArray(o) ? o : Object.values(o)) walk(v, depth + 1);
    };
    const P = T.pack(); walk(P.c1, 0); walk(P.calls, 0);
    T._gt = { m, pref }; return T._gt;
  };
  T.btnText = b => { const t = b.querySelector('.t'); if (t) return norm(t.textContent); const sp = b.querySelectorAll('span'); return norm((sp.length ? sp[sp.length - 1] : b).textContent); };
  T.gradeOf = txt => { const g = T.gradeTable().m.get(norm(txt)); return g === 'ambiguous' ? null : g || null; };
  const RANK = { best: 3, ok: 2, poor: 1 };
  // 'expert-lastok': expert everywhere, except that on the last task before the final one (the panel) it gives the
  // defensible ('ok') answer. Used to make a specific save scenario happen every time.
  T.lastPhase = () => { const S = T.S(), ts = T.tasks(), fin = ts.reduce((a, t) => ((t.needs || []).length > ((a && a.needs) || []).length ? t : a), null), rem = ts.filter(t => !S.done[t.id]); return rem.length === 2 && rem.includes(fin); };
  T.pick = (btns, policy) => {
    if (!btns.length) throw new Error('no options to pick from');
    if (policy === 'random') return btns[Math.floor(T.rnd() * btns.length)];
    if (policy === 'expert-lastok' && T.lastPhase()) { const ok = btns.find(b => T.gradeOf(T.btnText(b)) === 'ok'); if (ok) return ok; }
    let best = btns[0], bs = -1;
    for (const b of btns) {
      const tx = T.btnText(b), g = T.gradeOf(tx);
      const s = g ? RANK[g] : T.gradeTable().pref.has(tx) ? 2.5 : 0;
      if (s > bs) { bs = s; best = b; }
    }
    if (bs === 0) T.unknownChoices.push(btns.map(b => T.btnText(b).slice(0, 40)).join(' / '));
    return best;
  };

  // ---------- Invariants ----------
  T.tasks = () => (T.pack().c1.tasks || []);
  T.checkDone = () => {
    if (!T.ready()) return; const S = T.S();
    if (T._S !== S) { T._S = S; T._prevDone = Object.assign({}, S.done); return; }   // new game or a resumed save: take a baseline
    const prev = T._prevDone || {};
    for (const t of T.tasks()) if (S.done[t.id] && !prev[t.id]) {
      const miss = (t.needs || []).filter(n => !prev[n]);
      if (miss.length) T.violations.push(`task "${t.id}" was completed before its needs were done (missing: ${miss.join(', ')})`);
      T.doneOrder.push(t.id);
    }
    T._prevDone = Object.assign({}, S.done);
  };
  T.checkTarget = tg => {
    const S = T.S(), t = T.tasks().find(x => x.id === tg.task.id); if (!t) return;
    if (S.done[t.id]) T.violations.push(`currentTarget() points at a finished task: ${t.id}`);
    const miss = (t.needs || []).filter(n => !S.done[n]);
    if (miss.length) T.violations.push(`currentTarget() points at "${t.id}" before its needs are done (missing: ${miss.join(', ')})`);
  };

  // ---------- The world: doors, targets, standing spots ----------
  // How close the player must stand to interact. Calibrated at runtime by T.calibrate() (probing world.focus);
  // this default is only used until then. anchor 'stand' = the entity's stand point (sx,sy) if it has one.
  T.INTERACT = { r: 20, yScale: 1.2, anchor: 'stand', calibrated: false };
  T.anchor = e => T.INTERACT.anchor === 'pos' ? { x: e.x, y: e.y } : { x: e.sx ?? e.x, y: e.sy ?? e.y };
  const idist = (e, x, y) => { const a = T.anchor(e); return Math.hypot(a.x - x, (a.y - y) * T.INTERACT.yScale); };
  T.idist = idist;
  T.free = (x, y) => !T.W().canStand(x, y);
  T.prompted = room => T.W().entities.filter(e => e.room === room && !e.hidden && e.prompt);
  // Where does a door/exit entity lead? Supports {to:{room,x,y}} and the tile world's kind:'door' / kind:'exit'.
  T.doorDest = e => {
    if (!e) return null;
    if (e.to && e.to.room) return { room: e.to.room, x: e.to.x, y: e.to.y };
    const R = LS.WORLD.ROOMS || {};
    if (e.kind === 'door' && e.door && e.door.room) { const rm = R[e.door.room] || {}; const en = rm.enter || {}; return { room: e.door.room, x: en.x, y: en.y }; }
    if (e.kind === 'exit' && R[e.room]) { const x = R[e.room].exitTo || {}; return { room: T._outdoor || 'outside', x: x.x, y: x.y }; }
    return null;
  };
  T.doors = () => T.W().entities.filter(e => !e.hidden && T.doorDest(e));
  // Shortest chain of doors from one room to another; returns the first door to use.
  T.doorTowards = (from, to) => {
    if (from === to) return null;
    const doors = T.doors(), prev = { [from]: null }, q = [from];
    while (q.length) {
      const r = q.shift();
      for (const d of doors.filter(d => d.room === r)) { const dest = T.doorDest(d).room; if (!(dest in prev)) { prev[dest] = d; q.push(dest); } }
    }
    if (!(to in prev)) return null;
    let d = prev[to]; while (d && d.room !== from) d = prev[d.room];
    return d;
  };
  T.depotRoom = () => {
    const w = T.W(), hs = w.entities.find(e => e.kind === 'hotspot');
    if (hs) return hs.room;
    const R = LS.WORLD.ROOMS || {}; return Object.keys(R).find(k => /depot/i.test(R[k].name || '')) || null;
  };
  // A standing spot within reach of e, preferring one where e is the nearest thing to interact with.
  T.spotNear = (e, o) => {
    o = o || {};
    const w = T.W(), room = e.room, others = T.prompted(room).filter(x => x !== e);
    if (w.room !== room) throw new Error(`spotNear: player is in ${w.room}, ${e.id} is in ${room}`);
    const a = T.anchor(e), R = T.INTERACT.r * 0.85, st = Math.max(1, Math.round(R / 8));
    let best = null, bs = Infinity;
    for (let dy = -R; dy <= R; dy += st) for (let dx = -R; dx <= R; dx += st) {
      const x = a.x + dx, y = a.y + dy, d = idist(e, x, y); if (d >= R) continue;
      if (!T.free(x, y)) continue;
      const nearest = others.every(q => idist(q, x, y) > d + 0.5);
      const s = (nearest ? 0 : 1000) + d;
      if (s < bs) { bs = s; best = { x, y, nearest }; }
    }
    return best;
  };
  T.teleport = (x, y) => { const w = T.W(); w.player.x = x; w.player.y = y; for (const k of ['target', 'path', 'use']) if (k in w.player) w.player[k] = null; if (w.snapCam) w.snapCam(); };
  // Interact the way a player does: stand within reach, wait until the game focuses the entity, press E.
  // Falls back to a direct call (and notes it) if the entity never becomes the focus.
  T.direct = e => {
    const w = T.W();
    if (e.kind === 'door' && w.tryDoor && e.door) return w.tryDoor(e.door);
    if (e.kind === 'exit' && w.exitRoom) return w.exitRoom();
    if (e.to && w.onInteract) { const r = w.onInteract(e); if (r && r.catch) r.catch(err => T.asyncErrors.push(String((err && err.stack) || err))); return; }
    if (!w.onInteract) { T.notes.push(`nothing handles interactions right now (world.onInteract is null) for ${e.kind}:${e.id}`); return; }
    const r = w.onInteract(e); if (r && r.catch) r.catch(err => T.asyncErrors.push(String((err && err.stack) || err)));
  };
  T.pressE = () => { for (const type of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(type, { key: 'e', code: 'KeyE', bubbles: true })); };
  T.interact = (e, o) => {
    o = o || {};
    const w = T.W(), sp = T.spotNear(e);
    if (sp) T.teleport(sp.x, sp.y); else T.notes.push(`no free standing spot within reach of ${e.kind}:${e.id}`);
    if (o.direct || !('focus' in w)) { T.direct(e); return sp; }
    let n = 0;
    const go = () => {
      if (w.paused || w.fadeDir) return;                      // something else took over
      if (w.focus === e) {
        T.pressE();
        const room = w.room, m0 = T.mut; let k = 0;
        const watch = () => { if (w.paused || w.fadeDir || w.room !== room || T.mut !== m0) return; if (++k > 30) { T.notes.push(`pressed E at ${e.kind}:${e.id} and nothing happened`); T.lastNoop = e.id; return; } requestAnimationFrame(watch); };
        requestAnimationFrame(watch); return;
      }
      if (++n > 10) { T.notes.push(`${e.kind}:${e.id} never became the interaction focus from ${sp ? Math.round(sp.x) + ',' + Math.round(sp.y) : 'its position'} (focus: ${w.focus ? w.focus.kind + ':' + w.focus.id : 'none'}); used a direct call`); T.direct(e); return; }
      requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
    return sp;
  };
  // Measure the interaction radius by probing world.focus around an isolated entity.
  T.calibrate = async () => {
    const w = T.W(); if (!('focus' in w) || w.paused) return T.INTERACT;
    const list = T.prompted(w.room);
    const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const keep = { x: w.player.x, y: w.player.y, face: w.player.face };
    const tryAnchor = async (e, anchor) => {
      const a = anchor === 'pos' ? { x: e.x, y: e.y } : { x: e.sx ?? e.x, y: e.sy ?? e.y };
      const probe = async (dx, dy) => { w.player.x = a.x + dx; w.player.y = a.y + dy; for (const k of ['target', 'path', 'use']) if (k in w.player) w.player[k] = null; await frame(); return w.focus === e; };
      if (!(await probe(0, 0))) return null;
      const along = async (ux, uy) => { let lo = 0, hi = 160; if (await probe(ux * hi, uy * hi)) return hi; while (hi - lo > 0.5) { const m = (lo + hi) / 2; if (await probe(ux * m, uy * m)) lo = m; else hi = m; } return lo; };
      const rx = await along(1, 0), ry = await along(0, 1);
      return rx && ry ? { r: Math.floor(rx), yScale: +(rx / ry).toFixed(3), anchor, calibrated: true, via: e.kind + ':' + e.id } : null;
    };
    try {
      const iso = list.filter(e => list.every(q => q === e || Math.hypot((q.sx ?? q.x) - (e.sx ?? e.x), (q.sy ?? q.y) - (e.sy ?? e.y)) > 200));
      for (const e of iso.slice(0, 3)) { const c = (await tryAnchor(e, 'stand')) || (await tryAnchor(e, 'pos')); if (c) { T.INTERACT = c; break; } }
    } finally { w.player.x = keep.x; w.player.y = keep.y; if (w.snapCam) w.snapCam(); }
    return T.INTERACT;
  };
  // What the player is being pointed at: the on-screen objective if the world has one, else currentTarget().
  T.objective = () => {
    const w = T.W(), o = w.objective, tg = LS.game.currentTarget();
    if (o && o.room) return { room: o.room, x: o.x, y: o.y, sx: o.sx, sy: o.sy, label: o.label, task: tg && tg.room === o.room && Math.hypot(tg.x - o.x, tg.y - o.y) < 2 ? tg.task : null, fromWorld: true };
    return tg;
  };
  T.targetEntity = tg => {
    const w = T.W(); let best = null, bd = 40;
    for (const e of w.entities) { if (e.room !== tg.room || e.hidden || !e.prompt || T.doorDest(e)) continue; const d = Math.hypot(e.x - tg.x, e.y - tg.y) - (e.kind === 'prop' ? 0.5 : 0); if (d < bd) { bd = d; best = e; } }
    return best;
  };

  // ---------- One driver step: look at the screen and act on it ----------
  const conf = policy => {
    const bs = [...document.querySelectorAll('#panel .conf button')];
    if (policy === 'random') { const back = $('#panel [data-back]'); if (back && T.backBudget > 0 && T.rnd() < 0.25) { T.backBudget--; return back; } return bs[Math.floor(T.rnd() * bs.length)]; }
    return bs[bs.length - 1];   // the expert picked the expert option, so "certain" is the calibrated answer
  };
  T.planStep = (policy, r) => {
    const p = $('#panel'), tray = [...p.querySelectorAll('[data-add]')];
    const PL = T.pack().c1.plan, order = PL && PL.lanes ? PL.lanes.flatMap(l => (l.cards || []).map(c => c.id)) : [];
    if (tray.length) {
      if (policy === 'random' && !T.planFix) { const b = tray[Math.floor(T.rnd() * tray.length)]; T.click(b); r.act = 'plan: place ' + b.dataset.add + ' (random)'; return; }
      for (const id of order) { const b = p.querySelector(`[data-add="${CSS.escape(id)}"]`); if (b) { T.click(b); r.act = 'plan: place ' + id; return; } }
      T.click(tray[0]); r.act = 'plan: place ' + tray[0].dataset.add + ' (not in the pack order)'; return;
    }
    if (p.querySelector('.slot.bad')) { let q, n = 0; while ((q = p.querySelector('[data-rm]')) && n++ < 60) q.click(); T.planFix = true; r.act = 'plan: take all cards back after a failed check'; return; }
    const chk = $('#pCheck'); if (chk && !chk.disabled) { T.click(chk); r.act = 'plan: check'; return; }
    r.err = 'works plan: tray empty, nothing marked wrong, and the check button is disabled';
  };
  T.exploreStep = (policy, r) => {
    const w = T.W(), ct = LS.game.currentTarget(), tg = T.objective();
    if (ct) T.checkTarget(ct);
    if (policy === 'random' && w.onInteract) {
      const menu = $('#hudMenu');
      if (T.boardBudget > 0 && T.rnd() < 0.05 && T.rendered(menu)) { T.boardBudget--; T.click(menu); r.act = 'random: open the project board'; return; }
      if (T.randBudget > 0 && T.rnd() < 0.3) {
        const list = T.prompted(w.room);
        if (list.length) { T.randBudget--; const e = list[Math.floor(T.rnd() * list.length)]; T.interact(e); r.act = `random: ${e.kind}:${e.id}`; r.key = 'rand:' + e.id + ':' + T.randBudget; return; }
      }
    }
    if (!tg) { r.err = 'exploring, but there is no objective (currentTarget() is null) and the chapter has not ended'; return; }
    r.target = tg.task ? tg.task.id : tg.label;
    if (tg.room !== w.room) {
      const d = T.doorTowards(w.room, tg.room);
      if (!d) { r.err = `no door path from "${w.room}" to "${tg.room}" (objective ${r.target})`; return; }
      T.interact(d); r.act = `door ${d.id}: ${w.room} → ${T.doorDest(d).room}`; r.key = 'door:' + d.id; return;
    }
    const e = T.targetEntity(tg);
    if (!e) {
      const hid = w.entities.find(x => x.room === tg.room && Math.hypot(x.x - tg.x, x.y - tg.y) < 40);
      r.err = `nothing to interact with at the objective "${r.target}" (${tg.label}) in ${tg.room}` + (hid ? ` (found ${hid.kind}:${hid.id}, hidden=${!!hid.hidden}, prompt=${JSON.stringify(hid.prompt)})` : ''); return;
    }
    T.interact(e); r.act = `${tg.task ? 'task ' + tg.task.id : 'objective'}: ${e.kind}:${e.id}`; r.key = 'ent:' + e.id;
  };
  T.step = (policy, stopExpr) => {
    const st = T.state(), r = { k: st.k, st, sigBefore: T.sig() };
    if (st.k === 'explore' && !T.INTERACT.calibrated && !T._calTried && 'focus' in T.W()) { T._calTried = true; r.needCal = true; return r; }
    if (stopExpr) { let stop = false; try { stop = !!(new Function('st', 'T', 'return (' + stopExpr + ')'))(st, T); } catch (e) { r.err = 'bad stop expression: ' + e.message; return r; } if (stop) { r.stop = true; return r; } }
    T.checkDone();
    try {
      switch (st.k) {
        case 'chapter': T.click($('#chapter'), { noHit: true }); r.act = 'chapter card'; break;
        case 'advance': T.click($('#talk').firstElementChild, { noHit: true }); r.act = 'advance ' + st.sub; break;
        case 'choice': { const b = T.pick([...document.querySelectorAll('#talk .choices button')].filter(T.rendered), policy); r.grade = T.gradeOf(T.btnText(b)); T.click(b); r.act = `choice [${r.grade || '?'}] ${T.btnText(b).slice(0, 50)}`; break; }
        case 'opt': { const b = T.pick([...document.querySelectorAll('#panel .opt[data-c]')].filter(T.rendered), policy); r.grade = T.gradeOf(T.btnText(b)); T.click(b); r.act = `${st.tag}: [${r.grade || '?'}] ${T.btnText(b).slice(0, 50)}`; break; }
        case 'conf': { const b = conf(policy); T.click(b); r.act = 'confidence: ' + (b.dataset.back != null ? 'change my mind' : b.textContent.replace(/\s+/g, ' ').trim()); break; }
        case 'go': T.click($('#panel [data-go]')); r.act = 'continue: ' + st.tag; break;
        case 'plan': T.planStep(policy, r); break;
        case 'board': {
          const tabs = [...document.querySelectorAll('#board [data-tab]')];
          if (policy === 'random' && tabs.length && T.rnd() < 0.6) { const b = tabs[Math.floor(T.rnd() * tabs.length)]; T.click(b); r.act = 'board tab ' + b.dataset.tab; }
          else { T.click($('#bClose')); r.act = 'close board'; }
          break;
        }
        case 'share': T.click($('#sClose')); r.act = 'close share'; break;
        case 'explore': T.exploreStep(policy, r); break;
        default: r.act = 'wait';
      }
    } catch (e) { r.err = String((e && e.stack) || e); }
    return r;
  };
  T.dump = () => {
    const out = { state: T.ready() ? T.state() : 'not ready', layers: T.layersOn() };
    try { const w = T.W(), S = T.S(); out.world = { room: w.room, paused: w.paused, fadeDir: w.fadeDir, player: [Math.round(w.player.x), Math.round(w.player.y)] }; out.done = S.done; out.target = LS.game.currentTarget() && { id: LS.game.currentTarget().task.id, room: LS.game.currentTarget().room, label: LS.game.currentTarget().label }; } catch (e) { }
    for (const id of T.layersOn()) out[id] = (document.getElementById(id).innerText || '').replace(/\s+/g, ' ').slice(0, 300);
    return out;
  };

  // ---------- Reachability: BFS over world.canStand ----------
  // Grid anchored at the start point, 4-neighbour moves of `step` world units.
  T.bfs = (o) => {
    const w = T.W(), keepRoom = w.room, keepPpe = w.ppe;
    w.room = o.room; if (o.ppe != null) w.ppe = o.ppe;
    try {
      const step = o.step, x0 = o.x, y0 = o.y, W = o.W, H = o.H;
      const i0 = -Math.floor(x0 / step), i1 = Math.floor((W - x0) / step), j0 = -Math.floor(y0 / step), j1 = Math.floor((H - y0) / step);
      const gw = i1 - i0 + 1, gh = j1 - j0 + 1, seen = new Uint8Array(gw * gh);
      const startBlocked = w.canStand(x0, y0);
      if (startBlocked) return { startBlocked: String(startBlocked), n: 0, has: () => false };
      const q = new Int32Array(gw * gh); let qh = 0, qt = 0;
      const k0 = (0 - j0) * gw + (0 - i0); seen[k0] = 1; q[qt++] = k0;
      while (qh < qt) {
        const k = q[qh++], gi = k % gw, gj = (k - gi) / gw;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = gi + di, nj = gj + dj; if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
          const nk = nj * gw + ni; if (seen[nk]) continue;
          const x = x0 + (ni + i0) * step, y = y0 + (nj + j0) * step;
          if (w.canStand(x, y)) { seen[nk] = 2; continue; }
          seen[nk] = 1; q[qt++] = nk;
        }
      }
      const has = (x, y) => { const i = Math.round((x - x0) / step) - i0, j = Math.round((y - y0) / step) - j0; return i >= 0 && j >= 0 && i < gw && j < gh && seen[j * gw + i] === 1; };
      // every reached point within reach of (ex, ey)
      const near = (e, R) => { const out = []; const ri = Math.ceil(R / step) + 1, rj = Math.ceil(R / T.INTERACT.yScale / step) + 1; const an = T.anchor(e), ci = Math.round((an.x - x0) / step), cj = Math.round((an.y - y0) / step);
        for (let dj = -rj; dj <= rj; dj++) for (let di = -ri; di <= ri; di++) { const i = ci + di - i0, j = cj + dj - j0; if (i < 0 || j < 0 || i >= gw || j >= gh || seen[j * gw + i] !== 1) continue; const x = x0 + (ci + di) * step, y = y0 + (cj + dj) * step; const d = idist(e, x, y); if (d < R) out.push([x, y, d]); } return out; };
      return { n: qt, has, near, step };
    } finally { w.room = keepRoom; w.ppe = keepPpe; }
  };
  // Reach report for a set of entities in one room.
  T.reach = (o) => {
    const w = T.W(), keepRoom = w.room, keepPpe = w.ppe;
    const g = T.bfs(o);
    if (g.startBlocked) return { startBlocked: g.startBlocked, reached: 0, items: [] };
    const R = T.INTERACT.r;
    const ents = w.entities.filter(e => e.room === o.room && e.prompt && (o.includeHidden || !e.hidden));
    const visible = w.entities.filter(e => e.room === o.room && e.prompt && !e.hidden);
    w.room = o.room; if (o.ppe != null) w.ppe = o.ppe;
    try {
      return {
        reached: g.n, items: ents.map(e => {
          const pts = g.near(e, R);
          const others = visible.filter(x => x !== e);
          const focusable = pts.some(([x, y, d]) => others.every(q => idist(q, x, y) > d));
          const closest = pts.length ? Math.round(Math.min(...pts.map(p => p[2]))) : null;
          return { kind: e.kind, id: e.id, x: Math.round(e.x), y: Math.round(e.y), hidden: !!e.hidden, prompt: String(e.prompt).slice(0, 50), reachable: pts.length > 0, focusable, closest, to: T.doorDest(e) ? T.doorDest(e).room : null };
        })
      };
    } finally { w.room = keepRoom; w.ppe = keepPpe; }
  };
  // Where is the closed line? Points blocked without PPE but walkable with it, sampled on a grid.
  T.lineScan = (o) => {
    const w = T.W(), keepRoom = w.room, keepPpe = w.ppe, step = o.step || 4, W = LS.WORLD.MAP.W, H = LS.WORLD.MAP.H;
    w.room = o.room;
    try {
      const pts = [], reasons = {};
      for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) {
        w.ppe = false; const a = w.canStand(x, y); if (!a) continue;
        w.ppe = true; const b = w.canStand(x, y);
        if (!b) { pts.push([x, y]); reasons[String(a)] = (reasons[String(a)] || 0) + 1; }
      }
      return { pts, reasons, step };
    } finally { w.room = keepRoom; w.ppe = keepPpe; }
  };
  T.standWith = (x, y, ppe) => { const w = T.W(), k = w.ppe; w.ppe = ppe; try { return w.canStand(x, y); } finally { w.ppe = k; } };

  // ---------- Live movement tracking (for keyboard walking tests) ----------
  // Records the player's position every frame, any frame where the player stands somewhere the game itself
  // says is blocked, and any toast shown meanwhile.
  T.trackStart = () => {
    const w = T.W(), trk = T.trk = { pts: [], intrusions: [], toasts: [], on: true, f0: T.frames };
    const f = () => {
      if (!trk.on) return;
      const p = w.player; trk.pts.push([p.x, p.y]);
      const b = w.canStand(p.x, p.y); if (b) trk.intrusions.push([Math.round(p.x), Math.round(p.y), String(b)]);
      const t = document.getElementById('toast'); if (t && t.classList.contains('on') && t.textContent && !trk.toasts.includes(t.textContent)) trk.toasts.push(t.textContent);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f); return true;
  };
  T.trackStop = () => { const t = T.trk; if (!t) return null; t.on = false; const ys = t.pts.map(p => p[1]), xs = t.pts.map(p => p[0]);
    return { frames: t.pts.length, intrusions: t.intrusions.slice(0, 5), nIntrusions: t.intrusions.length, toasts: t.toasts, minY: Math.min(...ys), maxY: Math.max(...ys), minX: Math.min(...xs), maxX: Math.max(...xs), end: t.pts[t.pts.length - 1] }; };
  // true once the player hasn't moved for n frames (after at least n+5 frames of tracking)
  T.stalled = n => { const p = T.trk && T.trk.pts; if (!p || p.length < n + 5) return false; const l = p.slice(-n); return l.every(q => Math.abs(q[0] - l[0][0]) < 0.01 && Math.abs(q[1] - l[0][1]) < 0.01); };
  T.outdoorRoom = () => { const d = T.W().entities.find(d => !T.isIndoor(d.room) && T.doorDest(d) && T.isIndoor(T.doorDest(d).room)); return (T._outdoor = d ? d.room : (T._outdoor || 'outside')); };

  // The closed line and its crossings, worked out from world.canStand alone.
  T.lineInfo = (room, step) => {
    step = step || 4;
    const sc = T.lineScan({ room, step }), pts = sc.pts;
    if (!pts.length) return { n: 0, reasons: sc.reasons, crossings: [] };
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const horiz = (x1 - x0) >= (y1 - y0);
    const P = (a, b) => horiz ? [a, b] : [b, a];   // along-line coordinate a, across-line coordinate b
    const cols = new Map();
    for (const [x, y] of pts) { const a = horiz ? x : y, b = horiz ? y : x; const c = cols.get(a); if (c) { c[0] = Math.min(c[0], b); c[1] = Math.max(c[1], b); } else cols.set(a, [b, b]); }
    const keys = [...cols.keys()].sort((p, q) => p - q);
    const w = T.W(), keepRoom = w.room, keepPpe = w.ppe;
    const free = (a, b, ppe) => { w.ppe = ppe; const [x, y] = P(a, b); return !w.canStand(x, y); };
    const crossings = [], gaps = [];
    w.room = room;
    try {
      for (let i = 1; i < keys.length; i++) {
        if (keys[i] - keys[i - 1] <= step * 1.5) continue;
        const A = cols.get(keys[i - 1]), B = cols.get(keys[i]), span = [Math.min(A[0], B[0]), Math.max(A[1], B[1])];
        const gap = { from: keys[i - 1], to: keys[i], span }; gaps.push(gap);
        const ok = [];
        for (let a = keys[i - 1] + step; a < keys[i]; a += 2) {
          let open = true, openPpe = true;
          for (let b = span[0] - 6; b <= span[1] + 6; b += 2) { if (!free(a, b, false)) open = false; if (!free(a, b, true)) openPpe = false; if (!open && !openPpe) break; }
          if (open) ok.push([a, openPpe]);
        }
        if (ok.length) crossings.push({ a0: ok[0][0], a1: ok[ok.length - 1][0], center: ok[Math.floor(ok.length / 2)][0], span, openWithPpe: ok.every(q => q[1]) });
      }
      // a spot just off the line, from which walking straight across leads onto it
      let walk = null;
      const mid = (keys[0] + keys[keys.length - 1]) / 2, order = keys.slice().sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid));
      for (const a of order) {
        const [c0, c1] = cols.get(a);
        let start = null; for (let b = c1 + 1; b <= c1 + 40; b += 1) if (free(a, b, false)) { start = b; break; }
        if (start == null) continue;
        let clear = true; for (let b = start; b >= c0; b -= 2) if (!free(a, b, true)) { clear = false; break; }
        if (!clear) continue;
        const [sx, sy] = P(a, start); walk = { x: sx, y: sy, a, band: [c0, c1], dir: horiz ? 'ArrowUp' : 'ArrowLeft', horiz }; break;
      }
      return { n: pts.length, reasons: sc.reasons, bbox: [x0, y0, x1, y1], horiz, extent: [keys[0], keys[keys.length - 1]], gaps: gaps.length, crossings, walk };
    } finally { w.room = keepRoom; w.ppe = keepPpe; }
  };

  // ---------- Layout audit ----------
  T.animsRunning = () => {
    try { return document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming && isFinite(a.effect.getTiming().iterations) && a.effect.target && a.effect.target.closest && a.effect.target.closest('.layer.on')).length; } catch (e) { return 0; }
  };
  T.audit = (o) => {
    o = o || {};
    const vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight, tol = 1, issues = [];
    const pageSW = document.documentElement.scrollWidth;
    if (pageSW > vw + tol) issues.push({ type: 'page-overflow', msg: `page scrolls horizontally: scrollWidth ${pageSW} > viewport ${vw}` });
    const roots = T.layersOn().map(id => document.getElementById(id)); const hud = $('#hud'); if (hud && hud.classList.contains('on')) roots.push(hud);
    const clipAnc = el => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.overflowX !== 'visible') return { el: n, mode: cs.overflowX }; } return null; };
    const seenMsg = new Set(), add = (type, el, msg) => { const k = type + T.desc(el); if (seenMsg.has(k)) return; seenMsg.add(k); issues.push({ type, el: T.desc(el), msg }); };
    for (const root of roots) for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      if (!T.visibleEl(el)) continue;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (el.classList.contains('delta')) continue;   // floating "+2" numbers are meant to drift
      // 1) horizontal overflow of the viewport
      if (r.right > vw + tol || r.left < -tol) {
        const a = clipAnc(el);
        const inScroller = a && (a.mode === 'auto' || a.mode === 'scroll') && a.el.getBoundingClientRect().right <= vw + tol && a.el.getBoundingClientRect().left >= -tol;
        const clippedAway = a && (a.mode === 'hidden' || a.mode === 'clip') && (a.el.getBoundingClientRect().right <= vw + tol && a.el.getBoundingClientRect().left >= -tol);
        if (!inScroller && !clippedAway) add('h-overflow', el, `extends ${r.left < 0 ? Math.round(-r.left) + 'px past the left' : Math.round(r.right - vw) + 'px past the right'} edge of the ${vw}px viewport`);
      }
      // 2) clipped text: an element with its own text that doesn't fit its box, or is cut off by a clipping ancestor
      const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (ownText) {
        const clips = v => v === 'hidden' || v === 'clip';
        if ((clips(cs.overflowX) && el.scrollWidth > el.clientWidth + tol) || (clips(cs.overflowY) && el.scrollHeight > el.clientHeight + tol))
          add('text-clipped', el, `text doesn't fit its box (${el.scrollWidth}×${el.scrollHeight} content in ${el.clientWidth}×${el.clientHeight})${cs.textOverflow === 'ellipsis' ? ', shown with an ellipsis' : ''}`);
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const ns = getComputedStyle(n);
          if (ns.overflowX === 'visible' && ns.overflowY === 'visible') continue;
          if (ns.overflowY === 'auto' || ns.overflowY === 'scroll') break;   // the user can scroll to it
          const nr = n.getBoundingClientRect();
          const cutX = clips(ns.overflowX) && (r.left < nr.left - tol || r.right > nr.right + tol), cutY = clips(ns.overflowY) && (r.top < nr.top - tol || r.bottom > nr.bottom + tol);
          if (cutX || cutY) add('text-clipped', el, `cut off by ${T.desc(n).split(' "')[0]} (${cutX ? 'horizontally' : 'vertically'})`);
          break;
        }
        // text in a fixed, non-scrolling layer that runs off the bottom/top of the screen
        if ((r.bottom > vh + tol || r.top < -tol) && !el.closest('#report') && !(() => { for (let n = el.parentElement; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.overflowY === 'auto' || s.overflowY === 'scroll') return true; } return false; })())
          add('text-offscreen', el, `text sits ${r.bottom > vh ? Math.round(r.bottom - vh) + 'px below the bottom' : Math.round(-r.top) + 'px above the top'} of the ${vh}px viewport and can't be scrolled to`);
      }
    }
    // 3) the HUD must not sit on top of an open dialogue card
    const card = on('talk') && $('#talk').firstElementChild;
    if (card && hud && hud.classList.contains('on') && T.visibleEl(card)) {
      const cr = card.getBoundingClientRect();
      const parts = [...hud.querySelectorAll('.hud-left > *, .hud-right > *, .hud-top > *, #hudMenu, .metric')].filter(T.visibleEl);
      for (const p of parts) {
        const pr = p.getBoundingClientRect();
        const ox = Math.min(pr.right, cr.right) - Math.max(pr.left, cr.left), oy = Math.min(pr.bottom, cr.bottom) - Math.max(pr.top, cr.top);
        if (ox > tol && oy > tol) add('hud-overlap', p, `HUD overlaps the dialogue card by ${Math.round(ox)}×${Math.round(oy)}px`);
      }
    }
    return { vw, vh, issues };
  };
})();
