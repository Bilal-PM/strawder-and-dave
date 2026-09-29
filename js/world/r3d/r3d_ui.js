/* LINESIDE HD-2D renderer: the screen-space UI over the 3D view, and taps.
 *
 * The same markers, nameplates, sign labels, prompts, speech pops, objective chevron and edge arrow as
 * World.drawUI() (world.js), placed through the 3D camera instead of the 2D one. (World.drawUI maps world points
 * with a fixed 2D scale, so it can't be reused as it is; this is that function with its two mappings swapped for
 * LS.R3D.project. Keep the two in step.)
 * Taps: world.js turns a tap into a map point with camX + clientX / S. In 3D mode a capture listener on the canvas
 * works out the map point under the finger (a character card first, else the ground) and, for just that event,
 * offsets camX / camY so world.js's own arithmetic lands on it; a later listener puts them back.
 */
window.LS = window.LS || {};
(function () {
  'use strict';
  const R3D = LS.R3D; if (!R3D || !R3D.active) return;
  const T = 16;
  function rrect(x, X, Y, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, r); else x.rect(X, Y, w, h); }
  function circle(x, X, Y, r, col) { x.fillStyle = col; x.beginPath(); x.arc(X, Y, r, 0, 7); x.fill(); }
  function label(x, s, X, Y, col, size) { x.fillStyle = col; x.font = `800 ${size}px Inter, system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, X, Y); }

  R3D.initUI = function (w) {
    let saved = null;
    w.cv.addEventListener('pointerdown', e => {
      if (!R3D.active) return;
      const m = R3D.unproject(e.clientX, e.clientY, w); if (!m) return;
      saved = [w.camX, w.camY]; w.camX = m[0] - e.clientX / w.S; w.camY = m[1] - e.clientY / w.S;
    }, true);
    w.cv.addEventListener('pointerdown', () => { if (saved) { w.camX = saved[0]; w.camY = saved[1]; saved = null; } });
  };

  R3D.drawUI = function (w, x, t) {
    const D = w.dpr, P3 = R3D.project, ah = (w.art && w.art.actorHeight) || 26, Z = w.S * R3D.zoom;
    const big = w.touch ? 1.35 : 1;
    const WORLD = LS.WORLD, ROOMS = WORLD.ROOMS, DOORS = WORLD.DOORS;
    x.setTransform(D, 0, 0, D, 0, 0);
    const vis = w.visible(), o = w.objective, f = w.focus;
    const hOf = e => (e.kind === 'npc' ? ah + 2 : (e.h || 14));
    const top = e => P3(e.x, e.y, hOf(e)) || [-999, -999];
    // the breadcrumb path to the objective (drawCrumbs in world.js), on the ground
    const cr = w.crumbs;
    if (cr && !w.paused) for (let i = 1; i < cr.length; i++) {
      const q = WORLD.tp(cr[i][0], cr[i][1]), pp = P3(q.x, q.y - 2, 0); if (!pp) continue;
      const a = Math.max(0, 0.75 - i / cr.length * 0.6) * (0.75 + 0.25 * Math.sin(t * 4 - i * 0.6));
      x.fillStyle = `rgba(254,231,97,${a})`; x.beginPath(); x.ellipse(pp[0], pp[1], 1.6 * Z, 1.6 * Z * 0.65, 0, 0, 7); x.fill();
    }
    // nameplates
    x.font = `700 ${Math.round(11 * big)}px Inter, system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const e of vis) if (e.kind === 'npc' && e.name && !w.attract) {
      const [X, Y0] = top(e), Y = Y0 - 8 * big; if (X < -40 || X > innerWidth + 40 || Y < -20 || Y > innerHeight + 20) continue;
      const wd = x.measureText(e.name).width + 12;
      x.fillStyle = 'rgba(24,20,37,.72)'; rrect(x, X - wd / 2, Y - 8 * big, wd, 16 * big, 8 * big); x.fill();
      x.fillStyle = '#f7f1e7'; x.fillText(e.name, X, Y + 0.5);
    }
    // sign labels
    const scn = w.scenes[w.room], Pl = w.player;
    if (scn && !w.attract) for (const ob of scn.objects) {
      if (!ob.labels) continue;
      const gx = ob.dx + ob.w / 2, dist = Math.hypot(Pl.x - gx, Pl.y - ob.sortY); if (dist > 4.5 * T) continue;
      const pp = P3(gx, ob.sortY, ob.sortY - ob.dy); if (!pp) continue;
      const a = Math.max(0, Math.min(1, (4.5 * T - dist) / T)), X = pp[0], tp = pp[1] - 6 * big;
      x.font = `600 ${Math.round(11.5 * big)}px Inter, system-ui, sans-serif`; x.textAlign = 'left';
      const lh = 17 * big, wd = Math.max(...ob.labels.map(l => x.measureText(l).width)) + 20, h = ob.labels.length * lh + 10;
      const L0 = Math.max(8, Math.min(innerWidth - wd - 8, X - wd / 2)), T0 = Math.max(8, tp - h);
      x.globalAlpha = a; x.fillStyle = 'rgba(247,241,231,.96)'; rrect(x, L0, T0, wd, h, 8 * big); x.fill();
      x.strokeStyle = 'rgba(24,20,37,.25)'; x.lineWidth = 1; x.stroke();
      x.fillStyle = '#2a1d22'; ob.labels.forEach((l, i) => x.fillText(l, L0 + 10, T0 + 5 + lh * (i + 0.5)));
      x.globalAlpha = 1; x.textAlign = 'center';
    }
    // entity markers
    for (const e of vis) {
      if (e.kind === 'memo') { const m = P3(e.x, e.y, 6); if (m) for (let k = 0; k < 4; k++) { const a = t * 2 + k * 1.57; x.fillStyle = `rgba(255,236,170,${0.6 + 0.4 * Math.sin(t * 4 + k)})`; x.fillRect(m[0] + Math.cos(a) * 12 - 1.5, m[1] + Math.sin(a) * 7 - 1.5, 3, 3); } }
      if (!e.marker || w.attract) continue;
      const [X, Y0] = top(e), Y = Y0 - (e.kind === 'npc' && e.name ? 26 : 12) * big + Math.sin(t * 3 + e.x) * 2.5;
      if (X < -20 || X > innerWidth + 20 || Y < -20 || Y > innerHeight + 20) continue;
      x.save(); x.translate(X, Y); x.scale(big, big);
      if (e.marker === 'call') { circle(x, 0, 0, 10, '#d8643a'); label(x, '!', 0, 1, '#fff', 14); }
      else if (e.marker === 'task') { x.fillStyle = '#e7b04a'; x.beginPath(); x.moveTo(0, -9); x.lineTo(8, 0); x.lineTo(0, 9); x.lineTo(-8, 0); x.fill(); x.strokeStyle = 'rgba(24,20,37,.5)'; x.lineWidth = 1.5; x.stroke(); }
      else if (e.marker === 'find') { const pr = 0.5 + 0.5 * Math.sin(t * 4 + e.x); x.strokeStyle = `rgba(231,176,74,${0.6 + 0.4 * pr})`; x.lineWidth = 2.5; x.beginPath(); x.arc(0, 0, 9 + pr * 2, 0, 7); x.stroke(); circle(x, 0, 0, 7.5, 'rgba(24,20,37,.75)'); label(x, '?', 0, 1, '#fee761', 11); }
      else if (e.marker === 'done') { circle(x, 0, 4, 7, 'rgba(62,137,72,.95)'); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(-3, 4); x.lineTo(-0.5, 6.5); x.lineTo(3.5, 1.5); x.stroke(); }
      else if (e.marker === 'note') { circle(x, 0, 0, 9, '#2c7c77'); label(x, 'i', 0, 1, '#fff', 12); }
      else if (e.marker === 'lock') { circle(x, 0, 0, 9, 'rgba(24,20,37,.8)'); label(x, '🔒', 0, 1, '#fff', 10); }
      x.restore();
    }
    // speaking marker
    if (w.speaker) { const e = vis.find(v => v.kind === 'npc' && v.id === w.speaker); if (e) { const [X, Y0] = top(e), Y = Y0 - 10; x.fillStyle = '#f7f1e7'; rrect(x, X - 11, Y - 9, 22, 14, 7); x.fill(); x.beginPath(); x.moveTo(X - 3, Y + 5); x.lineTo(X, Y + 9); x.lineTo(X + 3, Y + 5); x.fill(); x.fillStyle = '#1b1e25'; for (let k = -1; k <= 1; k++) { x.beginPath(); x.arc(X + k * 5, Y - 2, 1.6, 0, 7); x.fill(); } } }
    // objective chevron / edge arrow
    if (o && !w.paused && !w.attract) {
      let tx, ty, lbl = o.label, kind = o.npc ? 'npc' : 'thing';
      if (o.room === w.room) { tx = o.x; ty = o.y; }
      else if (w.room === 'outside') { const d = DOORS[o.room]; tx = d.doorX; ty = d.doorY + 8; lbl = o.doorLabel || lbl; kind = 'door'; }
      else { const R = ROOMS[w.room]; tx = R.exitX; ty = R.exitY + 8; lbl = 'Exit'; kind = 'exit'; }
      const pp = P3(tx, ty, kind === 'npc' ? ah + 2 : kind === 'door' ? 30 : 20) || [innerWidth / 2, innerHeight * 2];
      const X = pp[0], Y = pp[1] - (kind === 'npc' ? 34 * big : kind === 'door' ? 6 : 0);
      const Sf = w.safe, onScreen = X > Sf.l + 10 && X < innerWidth - Sf.r - 10 && Y > Sf.t + 10 && Y < innerHeight - Sf.b - 10;
      if (onScreen) {
        const b = Math.abs(Math.sin(t * 3.2)) * 6;
        x.save(); x.translate(X, Y - b); x.scale(big, big);
        x.fillStyle = 'rgba(24,20,37,.35)'; x.beginPath(); x.moveTo(-9, -6); x.lineTo(9, -6); x.lineTo(0, 6); x.fill();
        x.fillStyle = '#fee761'; x.beginPath(); x.moveTo(-8, -8); x.lineTo(8, -8); x.lineTo(0, 4); x.fill(); x.strokeStyle = '#3e2731'; x.lineWidth = 1.5; x.stroke();
        if (kind === 'door' || kind === 'exit') { x.font = '800 11px Inter, system-ui, sans-serif'; const tw = x.measureText(lbl).width + 14; x.fillStyle = 'rgba(24,20,37,.85)'; rrect(x, -tw / 2, -30, tw, 17, 8.5); x.fill(); x.fillStyle = '#fee761'; x.fillText(lbl, 0, -21.5); }
        x.restore();
      } else {
        const cxs = (Sf.l + innerWidth - Sf.r) / 2, cys = (Sf.t + innerHeight - Sf.b) / 2, a = Math.atan2(Y - cys, X - cxs), m = 26;
        const hw = (innerWidth - Sf.l - Sf.r) / 2 - m, hh = (innerHeight - Sf.t - Sf.b) / 2 - m, k = Math.min(hw / Math.max(1e-3, Math.abs(Math.cos(a))), hh / Math.max(1e-3, Math.abs(Math.sin(a))));
        const ex = cxs + Math.cos(a) * k, ey = cys + Math.sin(a) * k;
        circle(x, ex, ey, 17 * big, 'rgba(24,20,37,.85)');
        x.save(); x.translate(ex, ey); x.rotate(a); x.scale(big, big); x.fillStyle = '#fee761'; x.beginPath(); x.moveTo(9, 0); x.lineTo(-5, -7); x.lineTo(-5, 7); x.fill(); x.restore();
        x.font = '700 11px Inter, system-ui, sans-serif'; const left = ex > innerWidth / 2; x.textAlign = left ? 'right' : 'left'; x.fillStyle = '#f7f1e7';
        x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 4; x.fillText(lbl, left ? ex - 24 * big : ex + 24 * big, ey); x.shadowBlur = 0; x.textAlign = 'center';
      }
    }
    // speech pops (their points are 2D-art points: lifted off the ground by nothing, so drawn where the art put them)
    const now = performance.now();
    for (const p of w.fx) { if (p.room !== w.room) continue; const pp = P3(p.x, p.y + 30, 30); if (!pp) continue; const u = (now - p.t0) / (p.until - p.t0); x.globalAlpha = Math.min(1, (1 - u) * 3); x.font = 'italic 700 14px Fraunces, Georgia, serif'; const wd = x.measureText(p.text).width + 18, X = pp[0], Y = pp[1] - u * 16; x.fillStyle = '#f7f1e7'; rrect(x, X - wd / 2, Y - 12, wd, 24, 12); x.fill(); x.fillStyle = '#1b1e25'; x.fillText(p.text, X, Y); x.globalAlpha = 1; }
    // interaction prompt
    if (f && !w.paused && !w.attract) {
      const [X, Y0] = top(f), Y = Y0 - (f.kind === 'npc' && f.name ? 30 : 14) * big - (f.marker ? 22 * big : 0);
      const key = w.touch ? '' : 'E'; x.font = `700 ${Math.round(12 * big)}px Inter, system-ui, sans-serif`;
      const wd = x.measureText(f.prompt).width + (key ? 34 : 20);
      x.fillStyle = 'rgba(24,20,37,.9)'; rrect(x, X - wd / 2, Y - 13 * big, wd, 26 * big, 13 * big); x.fill();
      if (key) { x.fillStyle = '#fee761'; rrect(x, X - wd / 2 + 5, Y - 9 * big, 18, 18 * big, 4); x.fill(); x.fillStyle = '#1b1e25'; x.fillText(key, X - wd / 2 + 14, Y + 0.5); }
      x.fillStyle = '#f7f1e7'; x.fillText(f.prompt, X + (key ? 12 : 0), Y + 0.5);
    }
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    // the fade between rooms (the vignette is in the 3D grade)
    if (w.fade > 0) { x.fillStyle = `rgba(8,6,14,${w.fade})`; x.fillRect(0, 0, innerWidth, innerHeight); }
  };
})();
