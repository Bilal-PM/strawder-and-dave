/* LINESIDE — in-world illustration: characters and buildings (Canvas 2D, world units).
 * Same flat editorial language as the portraits: two-tone shading, simplified forms.
 * Everything is tinted by the chapter's light (LS.tint) so the world sits in its atmosphere.
 */
window.LS = window.LS || {};
(function () {
  const { mix, rgba } = LS.art;
  const shade = LS.shade;
  let P = LS.art.PAL.day, K = 0.1;
  // Set global lighting for this frame. k = how much colours fall toward the ambient shadow tone.
  LS.setLight = (pal, k) => { P = pal; K = k; };
  const T = c => mix(c, P.near, K);           // lit surface
  const TS = c => mix(c, P.near, Math.min(0.85, K + 0.22)); // shaded surface
  LS.tint = T; LS.tintS = TS;

  function rr(x, px, py, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(px, py, w, h, r); else x.rect(px, py, w, h); }

  /* Full-body character, feet at (0,0), ~74 units tall, facing +x when dir=1. */
  LS.drawPerson = function (x, look, px, py, dir, phase, moving, opt) {
    opt = opt || {};
    const s = opt.scale || 1;
    x.save(); x.translate(px, py); x.scale(dir * s, s);
    const sw = moving ? Math.sin(phase) : 0, bob = moving ? Math.abs(Math.cos(phase)) * 1.6 : Math.sin(phase * 0.35) * 0.5;
    const skin = T(look.skin), skinS = TS(look.skin);
    const top = T(look.top), topS = TS(look.top);
    const legs = T(look.legs || '#2f3542'), legsS = TS(look.legs || '#2f3542');
    const hair = T(look.hair), hairS = TS(look.hair);
    // shadow
    x.fillStyle = 'rgba(0,0,0,0.22)'; x.beginPath(); x.ellipse(0, 0, 13, 3.2, 0, 0, 7); x.fill();
    x.translate(0, -bob);
    // back leg, back arm
    const leg = (a, col) => { x.save(); x.translate(0, -27); x.rotate(a); x.fillStyle = col; rr(x, -3.6, 0, 7.2, 25, 3.5); x.fill(); x.fillStyle = T('#2a2420'); rr(x, -4, 22, 10, 5, 2.5); x.fill(); x.restore(); };
    const arm = (a, col) => { x.save(); x.translate(0, -48); x.rotate(a); x.fillStyle = col; rr(x, -3, 0, 6, 20, 3); x.fill(); x.fillStyle = skin; x.beginPath(); x.arc(0, 21, 3.2, 0, 7); x.fill(); x.restore(); };
    leg(-sw * 0.5, legsS); arm(sw * 0.55 + (opt.wave ? -2.2 : 0), topS);
    leg(sw * 0.5, legs);
    // torso
    x.fillStyle = top; x.beginPath(); x.moveTo(-9, -27); x.lineTo(-10, -45); x.quadraticCurveTo(-9, -52, 0, -52); x.quadraticCurveTo(9, -52, 10, -45); x.lineTo(9, -27); x.closePath(); x.fill();
    x.fillStyle = topS; x.beginPath(); x.moveTo(-9, -27); x.lineTo(-10, -45); x.quadraticCurveTo(-9, -52, -3, -52); x.lineTo(-2, -27); x.closePath(); x.fill();
    const ts = look.topStyle;
    if (ts === 'hivis') { x.fillStyle = T('#e6e9ea'); x.fillRect(-10, -38, 20, 2.6); x.fillRect(-10, -32, 20, 2.6); x.fillRect(3, -51, 2.4, 24); }
    if (ts === 'suit') { x.fillStyle = T('#f2efe9'); x.beginPath(); x.moveTo(2, -52); x.lineTo(8, -52); x.lineTo(5, -42); x.fill(); x.fillStyle = T(shade(look.top, -0.45)); x.fillRect(5, -50, 2, 10); }
    if (ts === 'cardigan') { x.fillStyle = T('#efe6d6'); x.beginPath(); x.moveTo(1, -52); x.lineTo(8, -52); x.lineTo(5, -30); x.lineTo(2, -30); x.fill(); }
    if (ts === 'jacket') { x.fillStyle = T(shade(look.top, 0.5)); x.beginPath(); x.moveTo(2, -52); x.lineTo(8, -52); x.lineTo(5, -45); x.fill(); }
    if (look.apron) { x.fillStyle = T(look.apron); rr(x, -6, -44, 15, 20, 3); x.fill(); }
    // neck + head
    x.fillStyle = skinS; x.fillRect(-2.5, -56, 6, 6);
    x.fillStyle = skin; x.beginPath(); x.ellipse(1, -64, 10.5, 11.5, 0, 0, 7); x.fill();
    x.fillStyle = skinS; x.beginPath(); x.ellipse(-3, -63, 5, 9, 0, 0, 7); x.globalAlpha = 0.35; x.fill(); x.globalAlpha = 1;
    // hair (back pieces first)
    const hs = look.hairStyle;
    x.fillStyle = hairS;
    if (hs === 'long') { rr(x, -11, -70, 12, 24, 6); x.fill(); }
    if (hs === 'bob') { rr(x, -11, -70, 12, 15, 6); x.fill(); }
    if (hs === 'ponytail') { x.beginPath(); x.ellipse(-12, -62, 4, 9, 0.4, 0, 7); x.fill(); }
    if (hs === 'bun') { x.beginPath(); x.arc(-6, -75, 5.5, 0, 7); x.fill(); }
    x.fillStyle = hair;
    if (hs === 'curly') { for (const [cx, cy, r] of [[-7, -70, 7], [0, -75, 7.5], [7, -72, 6.5], [-9, -63, 5.5]]) { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } }
    else if (hs !== 'bald') { x.beginPath(); x.ellipse(0, -68.5, 11, 7.8, 0, Math.PI, 0); x.lineTo(11, -66); x.quadraticCurveTo(4, -69, -2, -66); x.lineTo(-10, -58); x.closePath(); x.fill(); }
    if (look.beard) { x.beginPath(); x.moveTo(-6, -64); x.quadraticCurveTo(-3, -52, 5, -53); x.quadraticCurveTo(11, -55, 11, -64); x.quadraticCurveTo(6, -59, 1, -60); x.closePath(); x.fill(); }
    // face (3/4 view toward +x)
    x.fillStyle = T('#2a1d1a'); x.beginPath(); x.ellipse(6.5, -64, 1.3, 1.6, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(1.5, -64, 1.1, 1.5, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(224,112,106,0.22)'; x.beginPath(); x.arc(7, -60, 2.2, 0, 7); x.fill();
    if (look.glasses) { x.strokeStyle = T('#2b2522'); x.lineWidth = 1; x.beginPath(); x.arc(6.5, -64, 2.6, 0, 7); x.moveTo(4.2, -64); x.arc(1.6, -64, 2.4, 0, 7); x.stroke(); }
    if (look.hat) { x.fillStyle = T(look.hat); x.beginPath(); x.ellipse(1, -71, 11.5, 8, 0, Math.PI, 0); x.fill(); x.fillStyle = T(shade(look.hat, -0.1)); rr(x, -12, -72, 26, 3.2, 1.6); x.fill(); }
    if (look.cap) { x.fillStyle = T(look.cap); x.beginPath(); x.ellipse(0, -71, 11, 5.5, 0, Math.PI, 0); x.fill(); rr(x, 2, -72, 13, 3, 1.5); x.fill(); }
    // front arm
    arm(-sw * 0.55 + (opt.work ? Math.sin(phase * 2) * 0.6 - 0.6 : 0), top);
    if (opt.lamp) { x.fillStyle = '#ffe6a0'; x.beginPath(); x.arc(4, -26, 3, 0, 7); x.fill(); }
    x.restore();
  };

  /* ---------- Buildings (feet on ground at y=0) ---------- */
  function windows(x, cols, rows, px, py, w, h, gx, gy, lit, seed) {
    let k = seed || 1;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      k = (k * 9301 + 49297) % 233280; const on = lit > 0.25 && (k / 233280) < 0.35 + lit * 0.55;
      const wx = px + c * gx, wy = py + r * gy;
      x.fillStyle = on ? `rgba(255,${200 + (k % 40)},120,${0.55 + lit * 0.45})` : T('#3c4a5a');
      x.fillRect(wx, wy, w, h);
      x.fillStyle = T('#e9e2d4'); x.fillRect(wx - 1, wy + h, w + 2, 1.6);
      if (on && lit > 0.5) { const g = x.createRadialGradient(wx + w / 2, wy + h / 2, 0, wx + w / 2, wy + h / 2, 26); g.addColorStop(0, 'rgba(255,210,130,0.18)'); g.addColorStop(1, 'rgba(255,210,130,0)'); x.fillStyle = g; x.fillRect(wx - 26, wy - 26, w + 52, h + 52); }
    }
  }
  function gable(x, px, w, h, wall, roof, roofH) {
    x.fillStyle = T(wall); x.fillRect(px, -h, w, h);
    x.fillStyle = TS(wall); x.fillRect(px + w * 0.72, -h, w * 0.28, h);
    x.fillStyle = T(roof); x.beginPath(); x.moveTo(px - 5, -h); x.lineTo(px + w * 0.35, -h - roofH); x.lineTo(px + w * 0.65, -h - roofH); x.lineTo(px + w + 5, -h); x.fill();
    x.fillStyle = TS(roof); x.beginPath(); x.moveTo(px + w * 0.65, -h - roofH); x.lineTo(px + w + 5, -h); x.lineTo(px + w * 0.7, -h); x.fill();
  }
  function door(x, px, w, h, col) { x.fillStyle = T(col); rr(x, px, -h, w, h, [w / 2, w / 2, 0, 0]); x.fill(); x.fillStyle = T('#d9b56a'); x.beginPath(); x.arc(px + w * 0.78, -h * 0.45, 1.4, 0, 7); x.fill(); }
  function sign(x, px, py, w, h, bg, fg, text, size) {
    x.fillStyle = T(bg); rr(x, px, py, w, h, 2); x.fill();
    x.fillStyle = T(fg); x.font = `700 ${size || 9}px Inter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, px + w / 2, py + h / 2 + 0.5); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  }
  LS.bld = {
    cottage(x, px, v, lit) {
      const walls = ['#d9c6a5', '#c9b08c', '#e0d2b8', '#b9a07c'], roofs = ['#5d4a44', '#4b4f5a', '#6a4a3a', '#56463f'];
      gable(x, px, 90, 70, walls[v % 4], roofs[v % 4], 30);
      x.fillStyle = T('#6b5a50'); x.fillRect(px + 62, -122, 9, 26);
      windows(x, 2, 2, px + 12, -60, 16, 13, 46, 28, lit, v + 3);
      door(x, px + 37, 16, 28, ['#2f5d62', '#7a2e3b', '#3d5a3a', '#2f3e5e'][v % 4]);
    },
    bakery(x, px, lit, open) {
      gable(x, px, 120, 76, '#e8dcc8', '#7a3f35', 28);
      x.fillStyle = T(open ? '#c7563f' : '#8f8a82'); x.beginPath(); x.moveTo(px - 4, -44); x.lineTo(px + 124, -44); x.lineTo(px + 116, -30); x.lineTo(px + 4, -30); x.fill();
      for (let i = 0; i < 8; i++) { x.fillStyle = T(i % 2 ? '#f1e8da' : (open ? '#c7563f' : '#8f8a82')); x.fillRect(px + 2 + i * 15, -44, 15, 5); }
      windows(x, 1, 1, px + 10, -28, 60, 20, 0, 0, Math.max(lit, open ? 0.3 : 0), 7);
      door(x, px + 84, 18, 28, '#4b3a30');
      sign(x, px + 18, -70, 84, 16, '#2e2a26', '#f3d58a', "PRITCHARD'S", 8.5);
      if (!open) sign(x, px + 12, -26, 30, 10, '#f5f0e6', '#b8433f', 'CLOSED', 5.5);
    },
    pub(x, px, lit) {
      gable(x, px, 150, 84, '#efe7d9', '#3f3a3a', 30);
      x.fillStyle = T('#20382f'); x.fillRect(px, -30, 150, 30);
      windows(x, 3, 1, px + 16, -66, 22, 16, 45, 0, lit, 11); windows(x, 2, 1, px + 14, -24, 34, 16, 86, 0, Math.max(lit, 0.3), 13);
      door(x, px + 64, 20, 30, '#1a2a24');
      sign(x, px + 30, -94, 90, 14, '#20382f', '#e7c77a', 'THE KESTREL ARMS', 7.5);
      x.fillStyle = T('#3a2c22'); x.fillRect(px + 150, -80, 2, 40); x.fillRect(px + 150, -80, 16, 2);
      x.fillStyle = T('#caa24a'); rr(x, px + 156, -78, 18, 22, 2); x.fill();
      x.fillStyle = T('#5a3a2a'); x.fillRect(px - 30, -12, 26, 3); x.fillRect(px - 28, -9, 2, 9); x.fillRect(px - 8, -9, 2, 9);
    },
    hall(x, px, lit) {
      x.fillStyle = T('#b8a58c'); x.fillRect(px, -96, 170, 96);
      x.fillStyle = TS('#b8a58c'); x.fillRect(px + 130, -96, 40, 96);
      x.fillStyle = T('#4a4644'); x.beginPath(); x.moveTo(px - 6, -96); x.lineTo(px + 85, -130); x.lineTo(px + 176, -96); x.fill();
      windows(x, 4, 1, px + 14, -78, 18, 34, 40, 0, lit, 17);
      door(x, px + 72, 26, 40, '#3f2f28');
      sign(x, px + 36, -108, 98, 10, '#f3ecdf', '#3a3431', 'HARROWBY VILLAGE HALL · 1911', 6);
    },
    church(x, px, lit) {
      x.fillStyle = T('#a89e8e'); x.fillRect(px, -84, 110, 84);
      x.fillStyle = T('#4a4644'); x.beginPath(); x.moveTo(px - 5, -84); x.lineTo(px + 55, -112); x.lineTo(px + 115, -84); x.fill();
      x.fillStyle = T('#a89e8e'); x.fillRect(px + 110, -150, 34, 150);
      x.fillStyle = TS('#a89e8e'); x.fillRect(px + 132, -150, 12, 150);
      x.fillStyle = T('#4a4644'); x.beginPath(); x.moveTo(px + 106, -150); x.lineTo(px + 127, -210); x.lineTo(px + 148, -150); x.fill();
      windows(x, 3, 1, px + 16, -66, 12, 30, 32, 0, lit * 0.8, 19);
      x.fillStyle = T('#e9e2d4'); x.beginPath(); x.arc(px + 127, -128, 8, 0, 7); x.fill();
    },
    school(x, px, lit) {
      x.fillStyle = T('#c4704f'); x.fillRect(px, -64, 140, 64);
      x.fillStyle = T('#51453f'); x.fillRect(px - 4, -70, 148, 8);
      windows(x, 4, 1, px + 12, -50, 20, 22, 32, 0, lit, 23);
      sign(x, px + 30, -84, 80, 12, '#2f5d62', '#f3ecdf', 'HARROWBY PRIMARY', 6.5);
      for (let i = 0; i < 12; i++) { x.fillStyle = T('#5b534c'); x.fillRect(px + 150 + i * 8, -22, 2, 22); } x.fillRect(px + 150, -20, 96, 2);
    },
    busstop(x, px) {
      x.fillStyle = T('#3b4a52'); x.fillRect(px, -60, 3, 60); sign(x, px - 10, -70, 24, 14, '#f3ecdf', '#2f5d62', 'BUS', 7);
      sign(x, px - 22, -46, 48, 20, '#f3ecdf', '#3a3431', 'Service 41 · 2 a day', 4.6);
    },
    station(x, px, build, lit, bunting) {
      // platform
      x.fillStyle = T('#b3aa9c'); x.fillRect(px, -6, 170, 6); x.fillStyle = T(build >= 5 ? '#f2d54a' : '#8d857a'); x.fillRect(px, -7, 170, 2);
      // building
      x.fillStyle = T('#c9a987'); x.fillRect(px + 20, -62, 70, 56);
      x.fillStyle = T('#5d4a44'); x.beginPath(); x.moveTo(px + 14, -62); x.lineTo(px + 55, -84); x.lineTo(px + 96, -62); x.fill();
      if (build >= 5) {
        windows(x, 2, 1, px + 28, -46, 16, 20, 36, 0, Math.max(lit, 0.3), 29); door(x, px + 48, 14, 28, '#2f5d62');
        x.fillStyle = T('#2f5d62'); x.fillRect(px + 90, -58, 76, 4); for (let i = 0; i < 4; i++) x.fillRect(px + 96 + i * 22, -54, 2.5, 48);
        sign(x, px + 96, -76, 70, 14, '#2f5d62', '#f3ecdf', 'HARROWBY', 8);
        x.fillStyle = T('#f3ecdf'); x.beginPath(); x.arc(px + 130, -42, 5, 0, 7); x.fill(); x.strokeStyle = T('#2f5d62'); x.lineWidth = 1; x.stroke();
        x.fillStyle = T('#5a3a2a'); x.fillRect(px + 108, -14, 30, 3); x.fillRect(px + 110, -11, 2, 5); x.fillRect(px + 134, -11, 2, 5);
        for (const fx of [px + 6, px + 150]) { x.fillStyle = T('#6b4a3a'); x.fillRect(fx, -16, 14, 10); x.fillStyle = T('#d8566a'); for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(fx + 2 + k * 3.4, -17, 2.4, 0, 7); x.fill(); } }
      } else {
        x.fillStyle = T('#7a6a58'); for (let i = 0; i < 3; i++) x.fillRect(px + 28 + i * 20, -46, 16, 26);
        x.strokeStyle = T('#5a4a3a'); x.lineWidth = 1.2; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(px + 28 + i * 20, -46); x.lineTo(px + 44 + i * 20, -20); x.stroke(); }
        x.fillStyle = TS('#2f5d62'); x.save(); x.translate(px + 110, -62); x.rotate(0.12); x.fillRect(0, 0, 60, 12); x.restore();
        sign(x, px + 104, -78, 62, 12, '#6c7a78', '#d9d4c8', 'HARR  BY', 7);
        x.fillStyle = T('#4f6b45'); for (let i = 0; i < 14; i++) { x.beginPath(); x.arc(px + 10 + i * 12, -6 - (i % 3) * 2, 4 + (i % 2) * 2, 0, 7); x.fill(); }
      }
      if (bunting) { for (let i = 0; i < 16; i++) { x.fillStyle = T(['#d8643a', '#f2c230', '#2c7c77', '#f3ecdf'][i % 4]); x.beginPath(); x.moveTo(px + 10 + i * 10, -88 + Math.sin(i / 15 * Math.PI) * 8); x.lineTo(px + 20 + i * 10, -88 + Math.sin((i + 1) / 15 * Math.PI) * 8); x.lineTo(px + 15 + i * 10, -80 + Math.sin(i / 15 * Math.PI) * 8); x.fill(); } }
    },
    cabin(x, px, lit) {
      x.fillStyle = T('#8fa3a8'); rr(x, px, -64, 150, 60, 3); x.fill();
      x.fillStyle = TS('#8fa3a8'); x.fillRect(px, -18, 150, 14);
      for (let i = 1; i < 10; i++) { x.fillStyle = TS('#8fa3a8'); x.fillRect(px + i * 15, -64, 1, 46); }
      x.fillStyle = T('#3b3f44'); for (const bx of [px + 10, px + 128]) x.fillRect(bx, -4, 12, 4);
      windows(x, 2, 1, px + 14, -52, 28, 18, 40, 0, Math.max(lit, 0.35), 31);
      door(x, px + 104, 20, 44, '#43565c');
      sign(x, px + 12, -76, 70, 10, '#f2c230', '#1b1e25', 'SITE OFFICE', 6.5);
      x.fillStyle = T('#5b6e73'); x.fillRect(px + 100, -4, 28, 4);
    },
    welfare(x, px, lit) {
      x.fillStyle = T('#5d8a6e'); rr(x, px, -54, 110, 50, 3); x.fill(); x.fillStyle = TS('#5d8a6e'); x.fillRect(px, -16, 110, 12);
      windows(x, 2, 1, px + 12, -44, 22, 14, 34, 0, Math.max(lit, 0.25), 37);
      sign(x, px + 20, -66, 70, 10, '#f3ecdf', '#2c5a44', 'WELFARE · TEA', 6);
    },
    signalbox(x, px, lit) {
      x.fillStyle = T('#7a3f35'); x.fillRect(px, -50, 60, 50);
      x.fillStyle = T('#e7ddcb'); x.fillRect(px - 4, -82, 68, 32);
      windows(x, 4, 1, px, -78, 13, 18, 15.5, 0, Math.max(lit, 0.3), 41);
      x.fillStyle = T('#3a3434'); x.beginPath(); x.moveTo(px - 8, -82); x.lineTo(px + 30, -100); x.lineTo(px + 68, -82); x.fill();
      sign(x, px + 2, -46, 56, 10, '#f3ecdf', '#7a3f35', 'KESTREL JN', 6.5);
      x.fillStyle = T('#5a4a3a'); for (let i = 0; i < 6; i++) x.fillRect(px + 62, -50 + i * 8, 14, 2); x.fillRect(px + 74, -50, 2, 50);
    },
    signal(x, px, aspect) { x.fillStyle = T('#2d2f33'); x.fillRect(px, -80, 3, 80); rr(x, px - 5, -96, 13, 22, 3); x.fill(); x.fillStyle = aspect === 'g' ? '#63e08c' : '#ff4a3d'; x.beginPath(); x.arc(px + 1.5, aspect === 'g' ? -80 : -90, 3, 0, 7); x.fill(); },
    lamp(x, px, lit) { x.fillStyle = T('#2d2f33'); x.fillRect(px, -64, 2.5, 64); x.fillRect(px - 5, -64, 12, 2.5); x.fillStyle = lit > 0.3 ? '#ffe2a0' : T('#d9d4c8'); x.fillRect(px - 4, -61, 8, 3);
      if (lit > 0.3) { const g = x.createRadialGradient(px, -58, 0, px, -58, 70); g.addColorStop(0, `rgba(255,220,150,${0.3 * lit})`); g.addColorStop(1, 'rgba(255,220,150,0)'); x.fillStyle = g; x.fillRect(px - 70, -128, 140, 140); } },
    fence(x, px, w, danger) {
      for (let i = 0; i <= w; i += 26) { x.fillStyle = T('#8a9094'); x.fillRect(px + i, -34, 2, 34); x.fillStyle = T('#3b3f44'); x.fillRect(px + i - 4, -3, 10, 3); }
      x.strokeStyle = rgba(T('#9aa0a4'), 0.7); x.lineWidth = 0.6; for (let yy = -34; yy < 0; yy += 4) { x.beginPath(); x.moveTo(px, yy); x.lineTo(px + w, yy); x.stroke(); }
      if (danger) sign(x, px + w / 2 - 22, -26, 44, 12, '#f2c230', '#1b1e25', 'KEEP OUT', 6);
    },
    materials(x, px, build) {
      if (build < 2) return;
      x.fillStyle = T('#6b4a2e'); for (let r = 0; r < 4; r++) x.fillRect(px + r * 3, -8 - r * 7, 90 - r * 6, 6);
      x.fillStyle = T('#8a8f96'); for (let r = 0; r < 3; r++) x.fillRect(px + 110, -4 - r * 5, 120, 3);
      x.fillStyle = T('#5e6468'); x.beginPath(); x.moveTo(px + 250, 0); x.lineTo(px + 280, -28); x.lineTo(px + 310, 0); x.fill();
    },
    van(x, px) { x.fillStyle = T('#e8e6e0'); rr(x, px, -34, 70, 28, 4); x.fill(); x.fillStyle = T('#f07a28'); x.fillRect(px, -20, 70, 4); x.fillStyle = T('#3c4a5a'); x.fillRect(px + 52, -30, 14, 10); x.fillStyle = T('#222'); for (const w of [px + 14, px + 54]) { x.beginPath(); x.arc(w, -6, 6, 0, 7); x.fill(); } },
    tripod(x, px) { x.strokeStyle = T('#3b3f44'); x.lineWidth = 1.5; x.beginPath(); x.moveTo(px, -36); x.lineTo(px - 8, 0); x.moveTo(px, -36); x.lineTo(px + 8, 0); x.moveTo(px, -36); x.lineTo(px, 0); x.stroke(); x.fillStyle = T('#f2c230'); x.fillRect(px - 5, -44, 12, 8); },
    flag(x, px) { x.fillStyle = T('#3b3f44'); x.fillRect(px, -22, 1.5, 22); x.fillStyle = '#f36b21'; x.beginPath(); x.moveTo(px + 1.5, -22); x.lineTo(px + 10, -19); x.lineTo(px + 1.5, -16); x.fill(); },
    bench(x, px) { x.fillStyle = T('#5a3a2a'); x.fillRect(px, -12, 34, 3); x.fillRect(px, -20, 34, 3); x.fillRect(px + 2, -9, 2, 9); x.fillRect(px + 30, -9, 2, 9); },
    noticeboard(x, px) { x.fillStyle = T('#5a3a2a'); x.fillRect(px, -50, 3, 50); x.fillRect(px + 37, -50, 3, 50); x.fillStyle = T('#b78a55'); x.fillRect(px - 2, -62, 44, 30); x.fillStyle = T('#f3ecdf'); x.fillRect(px + 2, -58, 14, 10); x.fillRect(px + 20, -57, 16, 12); x.fillStyle = T('#d8643a'); x.fillRect(px + 6, -44, 12, 8); }
  };
})();

/* ---------- 4-direction characters for the top-down (3/4) world ---------- */
(function () {
  const T = c => LS.tint(c), TS = c => LS.tintS(c), shade = LS.shade;
  function rr(x, px, py, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(px, py, w, h, r); else x.rect(px, py, w, h); }
  // facing: 'down' (towards camera) | 'up' (away) | 'left' | 'right'
  LS.drawPerson4 = function (x, look, px, py, facing, phase, moving, opt) {
    opt = opt || {};
    if (opt.ppe) look = Object.assign({}, look, { top: '#f07a28', topStyle: 'hivis', hat: '#f4f1ea', cap: null });
    if (facing === 'left' || facing === 'right') { LS.drawPerson(x, look, px, py, facing === 'right' ? 1 : -1, phase, moving, Object.assign({ scale: opt.scale || 0.82 }, opt)); return; }
    const s = opt.scale || 0.82, back = facing === 'up';
    x.save(); x.translate(px, py); x.scale(s, s);
    const sw = moving ? Math.sin(phase) : 0, bob = moving ? Math.abs(Math.cos(phase)) * 1.6 : Math.sin(phase * 0.35) * 0.5;
    const skin = T(look.skin), skinS = TS(look.skin), top = T(look.top), topS = TS(look.top);
    const legs = T(look.legs || '#2f3542'), hair = T(look.hair), hairS = TS(look.hair);
    x.fillStyle = 'rgba(0,0,0,0.22)'; x.beginPath(); x.ellipse(0, 0, 14, 4, 0, 0, 7); x.fill();
    x.translate(0, -bob);
    // legs (alternate lift)
    for (const side of [-1, 1]) { const lift = moving ? Math.max(0, Math.sin(phase + (side > 0 ? Math.PI : 0))) * 4 : 0;
      x.fillStyle = legs; rr(x, side * 4.6 - 3.4, -27, 6.8, 25 - lift, 3); x.fill();
      x.fillStyle = T('#2a2420'); rr(x, side * 4.6 - 4, -4 - lift, 8, 5, 2.5); x.fill(); }
    // arms
    for (const side of [-1, 1]) { const a = side * (0.08 + (moving ? sw * side * 0.25 : 0));
      x.save(); x.translate(side * 10, -48); x.rotate(a); x.fillStyle = side > 0 ? topS : top; rr(x, -3, 0, 6, 20, 3); x.fill();
      x.fillStyle = skin; x.beginPath(); x.arc(0, 21, 3.2, 0, 7); x.fill(); x.restore(); }
    // torso
    x.fillStyle = top; x.beginPath(); x.moveTo(-10, -27); x.lineTo(-11, -46); x.quadraticCurveTo(-10, -53, 0, -53); x.quadraticCurveTo(10, -53, 11, -46); x.lineTo(10, -27); x.closePath(); x.fill();
    x.fillStyle = topS; x.fillRect(4, -50, 6, 23);
    const ts = look.topStyle;
    if (ts === 'hivis') { x.fillStyle = T('#e6e9ea'); x.fillRect(-11, -38, 22, 2.6); x.fillRect(-11, -32, 22, 2.6); if (!back) { x.fillRect(-6, -52, 2.4, 25); x.fillRect(3.6, -52, 2.4, 25); } else { x.fillRect(-7, -50, 14, 2.4); } }
    if (!back && ts === 'suit') { x.fillStyle = T('#f2efe9'); x.beginPath(); x.moveTo(-4, -53); x.lineTo(4, -53); x.lineTo(0, -41); x.fill(); x.fillStyle = T(shade(look.top, -0.45)); x.fillRect(-1, -50, 2, 11); }
    if (!back && ts === 'cardigan') { x.fillStyle = T('#efe6d6'); x.beginPath(); x.moveTo(-4, -53); x.lineTo(4, -53); x.lineTo(1.5, -28); x.lineTo(-1.5, -28); x.fill(); }
    if (!back && ts === 'jacket') { x.fillStyle = T(shade(look.top, 0.5)); x.beginPath(); x.moveTo(-5, -53); x.lineTo(5, -53); x.lineTo(0, -45); x.fill(); }
    if (!back && look.apron) { x.fillStyle = T(look.apron); rr(x, -7, -45, 14, 20, 3); x.fill(); }
    // neck + head
    x.fillStyle = skinS; x.fillRect(-3, -57, 6, 6);
    const hs = look.hairStyle;
    x.fillStyle = hairS;
    if (hs === 'long') { rr(x, -12, -70, 24, back ? 30 : 26, 7); x.fill(); }
    if (hs === 'bob') { rr(x, -12, -70, 24, 17, 7); x.fill(); }
    if (hs === 'ponytail' && back) { x.beginPath(); x.ellipse(0, -58, 4, 9, 0, 0, 7); x.fill(); }
    x.fillStyle = skin; x.beginPath(); x.ellipse(0, -65, 10.5, 11.5, 0, 0, 7); x.fill();
    x.fillStyle = hair;
    if (back) {
      if (hs === 'curly') { for (const [cx, cy, r] of [[-7, -69, 7], [0, -74, 7.5], [7, -69, 7], [0, -64, 8]]) { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } }
      else if (hs !== 'bald') { x.beginPath(); x.ellipse(0, -66, 11, 11, 0, 0, 7); x.fill(); }
      if (hs === 'bun') { x.beginPath(); x.arc(0, -77, 5.5, 0, 7); x.fill(); }
    } else {
      if (hs === 'curly') { for (const [cx, cy, r] of [[-8, -71, 6.5], [0, -76, 7.5], [8, -71, 6.5], [-10, -64, 4.5], [10, -64, 4.5]]) { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } }
      else if (hs !== 'bald') { x.beginPath(); x.ellipse(0, -69, 11.2, 8, 0, Math.PI, 0); x.quadraticCurveTo(6, -70, 0, -67); x.quadraticCurveTo(-6, -70, -11.2, -69); x.fill(); if (hs === 'long' || hs === 'bob') { x.fillRect(-11.5, -69, 4, 14); x.fillRect(7.5, -69, 4, 14); } }
      if (hs === 'bun') { x.beginPath(); x.arc(0, -78, 5, 0, 7); x.fill(); }
      if (look.beard) { x.beginPath(); x.moveTo(-9, -65); x.quadraticCurveTo(-7, -53, 0, -53); x.quadraticCurveTo(7, -53, 9, -65); x.quadraticCurveTo(4, -60, 0, -61); x.quadraticCurveTo(-4, -60, -9, -65); x.fill(); }
      x.fillStyle = T('#2a1d1a'); x.beginPath(); x.ellipse(-4, -65, 1.4, 1.7, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(4, -65, 1.4, 1.7, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(224,112,106,0.22)'; x.beginPath(); x.arc(-6.5, -61, 2, 0, 7); x.fill(); x.beginPath(); x.arc(6.5, -61, 2, 0, 7); x.fill();
      if (!look.beard) { x.strokeStyle = T('#8a3f3a'); x.lineWidth = 1.2; x.beginPath(); x.moveTo(-2.5, -59.5); x.quadraticCurveTo(0, -58, 2.5, -59.5); x.stroke(); }
      if (look.glasses) { x.strokeStyle = T('#2b2522'); x.lineWidth = 1; x.beginPath(); x.arc(-4, -65, 2.8, 0, 7); x.moveTo(6.8, -65); x.arc(4, -65, 2.8, 0, 7); x.moveTo(-1.2, -65); x.lineTo(1.2, -65); x.stroke(); }
    }
    if (look.hat) { x.fillStyle = T(look.hat); x.beginPath(); x.ellipse(0, -72, 12, 8.5, 0, Math.PI, 0); x.fill(); x.fillStyle = T(shade(look.hat, -0.1)); rr(x, -14, -73, 28, 3.4, 1.7); x.fill(); }
    if (look.cap) { x.fillStyle = T(look.cap); x.beginPath(); x.ellipse(0, -72, 11.5, 6, 0, Math.PI, 0); x.fill(); if (!back) { rr(x, -9, -73, 18, 3, 1.5); x.fill(); } }
    if (opt.lamp) { x.fillStyle = '#ffe6a0'; x.beginPath(); x.arc(10, -27, 3, 0, 7); x.fill(); }
    x.restore();
  };
})();
