/* LINESIDE — cinematic landscape renderer (Canvas 2D).
 * Art direction: layered atmospheric landscape illustration (the proven look of
 * Firewatch / Alto's Odyssey): flat silhouettes, aerial perspective, strong
 * time-of-day palettes, slow parallax, weather, grain and vignette.
 * The Kestrel Vale viaduct evolves with the project (build 0 derelict → 5 open).
 */
window.LS = window.LS || {};
(function () {
  const PAL = {
    dawn:     { top: '#243a6b', mid: '#b9728a', hor: '#f7bd86', sun: '#ffe2b0', sunPos: [0.24, 0.47], far: '#8a6f93', mid1: '#5d4f78', mid2: '#433b62', near: '#2a2544', fg: '#15122a', stone: '#c48f79', stoneS: '#7a5068', cloud: '#f6c7b3', lit: 0.55, stars: 0.25, glow: 0.55 },
    day:      { top: '#3f86c9', mid: '#8fc0e0', hor: '#dcebf0', sun: '#fff7df', sunPos: [0.72, 0.16], far: '#9db6c6', mid1: '#6f9a88', mid2: '#4f7d67', near: '#315a48', fg: '#1a3328', stone: '#cfbca2', stoneS: '#8b8474', cloud: '#ffffff', lit: 0, stars: 0, glow: 0.25 },
    dusk:     { top: '#1b2446', mid: '#6d3f68', hor: '#f08555', sun: '#ffc27a', sunPos: [0.78, 0.5], far: '#6c4863', mid1: '#4c3452', mid2: '#3a2944', near: '#241a31', fg: '#120c1b', stone: '#a86a5c', stoneS: '#5a3848', cloud: '#f2a07e', lit: 0.8, stars: 0.35, glow: 0.7 },
    night:    { top: '#060a18', mid: '#101a33', hor: '#22365a', sun: '#eef1ff', sunPos: [0.8, 0.17], far: '#1f2b45', mid1: '#172238', mid2: '#121b2e', near: '#0c1322', fg: '#060911', stone: '#4a5470', stoneS: '#262e45', cloud: '#34405e', lit: 1, stars: 1, glow: 0.3, moon: true },
    overcast: { top: '#5f6c78', mid: '#8d989f', hor: '#b8bfc0', sun: '#dfe3e3', sunPos: [0.6, 0.2], far: '#8b9599', mid1: '#667370', mid2: '#51605b', near: '#34403c', fg: '#1d2523', stone: '#9d978b', stoneS: '#646a66', cloud: '#a5adb1', lit: 0.35, stars: 0, glow: 0.05 }
  };
  const SEASON = { // tint for vegetation layers
    spring: { veg: '#6f9a74', mix: 0.12 }, summer: { veg: '#7a9b52', mix: 0.14 },
    autumn: { veg: '#c1733a', mix: 0.28 }, winter: { veg: '#dfe6ee', mix: 0.18 }
  };

  // --- colour helpers ---
  function rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  function rgba(h, a) { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function ridge(W, base, amp, seed, freq) {
    const r = rng(seed), ph = [r() * 6, r() * 6, r() * 6, r() * 6];
    const f = freq || 1;
    return x => base + amp * (0.5 * Math.sin(x / W * 5.1 * f + ph[0]) + 0.3 * Math.sin(x / W * 11.3 * f + ph[1]) + 0.14 * Math.sin(x / W * 27 * f + ph[2]) + 0.06 * Math.sin(x / W * 61 * f + ph[3]));
  }
  function fillRidge(ctx, W, H, fn, color, step) {
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += (step || 6)) ctx.lineTo(x, fn(x));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  function pine(ctx, x, y, h, col, snow) {
    const w = h * 0.42;
    ctx.fillStyle = col;
    ctx.fillRect(x - h * 0.03, y - h * 0.18, h * 0.06, h * 0.2);
    for (let i = 0; i < 4; i++) {
      const ty = y - h * 0.15 - i * h * 0.22, tw = w * (1 - i * 0.2);
      ctx.beginPath(); ctx.moveTo(x - tw / 2, ty); ctx.lineTo(x, ty - h * 0.36); ctx.lineTo(x + tw / 2, ty); ctx.closePath(); ctx.fill();
      if (snow) { ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(x - tw * 0.18, ty - h * 0.25); ctx.lineTo(x, ty - h * 0.36); ctx.lineTo(x + tw * 0.18, ty - h * 0.25); ctx.closePath(); ctx.fill(); ctx.fillStyle = col; }
    }
  }
  function roundBlob(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

  class Scene {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.cfg = { time: 'dusk', season: 'summer', weather: 'clear', build: 5, train: true };
      this.mx = 0; this.my = 0; this.tx = 0; this.ty = 0;
      this.fade = null; this.reduced = false;
      this.particles = []; this.t0 = performance.now();
      this.resize();
      addEventListener('resize', () => { clearTimeout(this._rz); this._rz = setTimeout(() => this.resize(), 120); });
      addEventListener('pointermove', e => { this.tx = (e.clientX / innerWidth - 0.5) * 2; this.ty = (e.clientY / innerHeight - 0.5) * 2; });
      this.grain = this.makeGrain();
      requestAnimationFrame(t => this.loop(t));
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.W = innerWidth; this.H = innerHeight; this.dpr = dpr;
      this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
      this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
      this.build();
    }
    set(cfg, instant) {
      const next = Object.assign({ weather: 'clear', train: false }, cfg);
      if (JSON.stringify(next) === JSON.stringify(this.cfg)) return;
      if (!instant && this.layers) {
        const snap = document.createElement('canvas'); snap.width = this.cv.width; snap.height = this.cv.height;
        snap.getContext('2d').drawImage(this.cv, 0, 0);
        this.fade = { img: snap, start: performance.now(), dur: 1800 };
      }
      this.cfg = next; this.particles = []; this.build();
    }
    makeGrain() {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const x = c.getContext('2d'), d = x.createImageData(160, 160);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 18; }
      x.putImageData(d, 0, 0); return c;
    }
    layer(depth) {
      const pad = Math.round(60 * depth * this.dpr);
      const c = document.createElement('canvas'); c.width = this.cv.width + pad * 2; c.height = this.cv.height;
      const x = c.getContext('2d'); x.scale(this.dpr, this.dpr); x.translate(pad / this.dpr, 0);
      return { c, x, depth, pad };
    }
    // Build all static layers for the current config
    build() {
      const P = PAL[this.cfg.time] || PAL.day, S = SEASON[this.cfg.season] || SEASON.summer;
      const W = this.W, H = this.H, B = this.cfg.build | 0;
      this.P = P;
      const veg = c => mix(c, S.veg, S.mix * (1 - P.lit * 0.6));
      const winter = this.cfg.season === 'winter';
      const snow = winter ? mix('#eef3f8', P.hor, 0.35 + P.lit * 0.3) : null;
      const L = [];

      // Sky
      const sky = this.layer(0), sx = sky.x;
      const g = sx.createLinearGradient(0, 0, 0, H * 0.72);
      g.addColorStop(0, P.top); g.addColorStop(0.55, P.mid); g.addColorStop(1, P.hor);
      sx.fillStyle = g; sx.fillRect(-10, 0, W + 20, H);
      if (P.stars) { const r = rng(7); for (let i = 0; i < 220; i++) { sx.fillStyle = `rgba(255,255,240,${(0.2 + r() * 0.8) * P.stars})`; const s = r() < 0.06 ? 2 : 1; sx.fillRect(r() * W, r() * H * 0.5, s, s); } }
      const [spx, spy] = P.sunPos, sunX = spx * W, sunY = spy * H, sr = Math.max(18, Math.min(W, H) * 0.035);
      const sg = sx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(W, H) * 0.55);
      sg.addColorStop(0, rgba(P.sun, 0.55 * P.glow + 0.1)); sg.addColorStop(0.25, rgba(P.sun, 0.18 * P.glow)); sg.addColorStop(1, rgba(P.sun, 0));
      sx.fillStyle = sg; sx.fillRect(-10, 0, W + 20, H);
      if (this.cfg.weather !== 'rain' && this.cfg.time !== 'overcast') {
        sx.fillStyle = P.sun; sx.beginPath(); sx.arc(sunX, sunY, sr, 0, 7); sx.fill();
        if (P.moon) { sx.fillStyle = rgba(P.top, 0.9); sx.beginPath(); sx.arc(sunX + sr * 0.42, sunY - sr * 0.2, sr * 0.86, 0, 7); sx.fill(); }
      }
      L.push(sky);

      // Far mountains with aerial perspective
      const far = this.layer(0.15);
      const fr = ridge(W, H * 0.47, H * 0.13, 11, 0.8);
      fillRidge(far.x, W + 120, H, x => fr(x - 60), mix(P.far, P.hor, 0.25));
      if (winter || this.cfg.season === 'spring') { // snow caps
        // caps follow the ridge: filled between the ridge line and a ragged snow line
        const thr = H * (winter ? 0.44 : 0.4), jr = rng(17);
        far.x.beginPath(); far.x.moveTo(0, thr);
        for (let x = 0; x <= W + 120; x += 6) far.x.lineTo(x, Math.min(fr(x - 60), thr));
        for (let x = W + 120; x >= 0; x -= 6) far.x.lineTo(x, fr(x - 60) < thr ? thr + H * 0.01 * Math.sin(x * 0.07) + jr() * H * 0.008 : thr);
        far.x.closePath(); far.x.fillStyle = rgba(mix('#ffffff', P.hor, 0.35), winter ? 0.85 : 0.6); far.x.fill();
      }
      const far2 = ridge(W, H * 0.53, H * 0.08, 23, 1.3);
      fillRidge(far.x, W + 120, H, x => far2(x - 60), mix(P.far, P.mid1, 0.45));
      L.push(far);

      // Mid hills
      const m1 = this.layer(0.3);
      const r1 = ridge(W, H * 0.6, H * 0.05, 37, 1.6);
      fillRidge(m1.x, W + 120, H, x => r1(x - 60), veg(P.mid1));
      const rr = rng(41);
      for (let i = 0; i < 90; i++) { const x = rr() * (W + 120) - 60; pine(m1.x, x, r1(x) + 3, H * (0.018 + rr() * 0.02), veg(mix(P.mid1, P.mid2, 0.6)), snow); }
      L.push(m1);

      // Viaduct + valley floor + town
      const v = this.layer(0.45), vx = v.x;
      const r2 = x => H * 0.69 + H * 0.02 * Math.sin(x / W * 4 + 1);
      fillRidge(vx, W + 120, H, x => r2(x - 60), veg(P.mid2));
      this.drawViaduct(vx, W, H, P, B, veg, snow);
      this.drawTown(vx, W, H, P, B);
      L.push(v);

      // Near hills forming the valley sides (pines along ridge)
      const n = this.layer(0.7), nx = n.x;
      const rn = rng(59);
      const nr = x => { const u = x / W; const valley = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.06) / 0.9))), 1.6); return H * (0.66 + 0.15 * valley) + H * 0.012 * Math.sin(u * 23); };
      fillRidge(nx, W + 120, H, x => nr(x - 60), veg(P.near));
      for (let i = 0; i < 120; i++) { const x = rn() * (W + 120) - 60; const y = nr(x - 60); if (y > H * 0.79 && rn() < 0.7) continue; pine(nx, x, y + 4, H * (0.035 + rn() * 0.05), veg(mix(P.near, P.fg, 0.35)), snow); }
      L.push(n);

      // Foreground framing pines + grass
      const f = this.layer(1.1), fx = f.x;
      const fg = x => H * 0.93 + H * 0.02 * Math.sin(x / W * 9);
      fillRidge(fx, W + 140, H, x => fg(x - 70), P.fg);
      const rf = rng(71);
      for (let i = 0; i < 7; i++) pine(fx, -40 + rf() * W * 0.14, H * 1.02, H * (0.4 + rf() * 0.25), P.fg, snow ? rgba('#dfe7ef', 0.35) : null);
      for (let i = 0; i < 6; i++) pine(fx, W * 0.9 + rf() * W * 0.16, H * 1.02, H * (0.35 + rf() * 0.3), P.fg, snow ? rgba('#dfe7ef', 0.35) : null);
      for (let i = 0; i < 240; i++) { const x = rf() * (W + 140) - 70, y = fg(x - 70); fx.strokeStyle = P.fg; fx.lineWidth = 1.2; fx.beginPath(); fx.moveTo(x, y + 2); fx.lineTo(x + (rf() - 0.5) * 6, y - 4 - rf() * 10); fx.stroke(); }
      L.push(f);

      this.layers = L;
      // Cloud sprites
      this.clouds = [];
      const cr = rng(83), nC = this.cfg.time === 'overcast' ? 14 : (this.cfg.time === 'night' ? 5 : 8);
      for (let i = 0; i < nC; i++) {
        // Flat, hard-edged illustrated clouds: lit crown, shaded belly, flat base
        const cw = Math.min(110 + cr() * 190, W * (0.22 + cr() * 0.16)), ch = cw * 0.34, c = document.createElement('canvas');
        const pd = Math.ceil(ch * 0.8); c.width = cw + pd * 2; c.height = ch + 20 + pd; const x = c.getContext('2d'); x.translate(pd - 10, pd);
        const base = this.cfg.time === 'overcast' ? mix(P.cloud, P.top, 0.25) : P.cloud;
        const belly = mix(base, P.top, 0.3);
        const bumps = 4 + Math.floor(cr() * 3), baseY = 10 + ch;
        const rs = Array.from({ length: bumps }, (_, k) => ch * (0.3 + Math.sin((k + 0.5) / bumps * Math.PI) * 0.45) * (0.85 + cr() * 0.3));
        x.fillStyle = base; x.beginPath();
        rs.forEach((r, k) => { const u = (k + 0.5) / bumps; x.moveTo(10 + cw * u + r, baseY - r * 0.55); x.arc(10 + cw * u, baseY - r * 0.55, r, 0, 7); });
        x.fill();
        x.globalCompositeOperation = 'source-atop'; x.fillStyle = belly; x.fillRect(-pd, baseY - ch * 0.26, c.width, ch);
        x.globalCompositeOperation = 'destination-out'; x.fillRect(-pd, baseY, c.width, 40); x.globalCompositeOperation = 'source-over';
        this.clouds.push({ c, x: cr() * W * 1.4 - W * 0.2, y: H * (0.05 + cr() * (this.cfg.time === 'overcast' ? 0.33 : 0.26)), s: 3 + cr() * 6, a: this.cfg.time === 'overcast' ? 0.9 : 0.7 + cr() * 0.25 });
      }
      // Birds on clear days
      this.birds = (this.cfg.weather === 'clear' && this.cfg.time !== 'night') ? Array.from({ length: 7 }, (_, i) => ({ x: -100 - i * 26, y: H * 0.3 + (i % 3) * 14, ph: i })) : [];
    }

    drawViaduct(x, W, H, P, B, veg, snow) {
      const x1 = W * 0.08, x2 = W * 0.94, D = H * 0.585, n = 11, span = (x2 - x1) / n;
      const ground = H * 0.83, pierW = span * 0.2, rad = (span - pierW) / 2, spring = D + H * 0.022 + rad * 0.2;
      this.vd = { x1, x2, D, span, n };
      const lit = mix(P.stone, P.hor, 0.18), shadow = P.stoneS;
      // Stone mass with arches cut out
      const c = document.createElement('canvas'); c.width = W; c.height = H; const s = c.getContext('2d');
      s.fillStyle = lit; s.fillRect(x1, D, x2 - x1, ground - D);
      // piers darker on right faces
      for (let i = 0; i <= n; i++) { const px = x1 + i * span; s.fillStyle = mix(lit, shadow, 0.35); s.fillRect(px - pierW / 2 + pierW * 0.55, spring, pierW * 0.45, ground - spring); }
      // masonry courses
      s.globalAlpha = 0.12; s.fillStyle = shadow;
      for (let y = D + 6; y < ground; y += Math.max(5, H * 0.008)) s.fillRect(x1, y, x2 - x1, 1);
      s.globalAlpha = 1;
      s.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < n; i++) {
        const cx = x1 + i * span + span / 2;
        s.beginPath(); s.moveTo(cx - rad, ground + 2); s.lineTo(cx - rad, spring + rad); s.arc(cx, spring + rad, rad, Math.PI, 0); s.lineTo(cx + rad, ground + 2); s.closePath(); s.fill();
      }
      s.globalCompositeOperation = 'source-over';
      // soffit shadow just inside each arch for depth
      s.globalCompositeOperation = 'source-atop';
      s.strokeStyle = rgba(shadow, 0.55); s.lineWidth = Math.max(3, rad * 0.14);
      for (let i = 0; i < n; i++) { const cx = x1 + i * span + span / 2; s.beginPath(); s.moveTo(cx - rad - s.lineWidth / 2, ground); s.lineTo(cx - rad - s.lineWidth / 2, spring + rad); s.arc(cx, spring + rad, rad + s.lineWidth / 2, Math.PI, 0); s.lineTo(cx + rad + s.lineWidth / 2, ground); s.stroke(); }
      s.globalCompositeOperation = 'source-over';
      // arch rings (voussoirs)
      s.strokeStyle = mix(lit, '#ffffff', 0.15); s.lineWidth = Math.max(1.5, H * 0.004);
      for (let i = 0; i < n; i++) { const cx = x1 + i * span + span / 2; s.beginPath(); s.arc(cx, spring + rad, rad + s.lineWidth, Math.PI, 0); s.stroke(); }
      // deck, parapet, cornice shadow
      s.fillStyle = mix(lit, shadow, 0.5); s.fillRect(x1 - 4, D + H * 0.016, x2 - x1 + 8, H * 0.005);
      s.fillStyle = mix(lit, '#ffffff', 0.12); s.fillRect(x1 - 4, D - H * 0.012, x2 - x1 + 8, H * 0.012);
      if (B <= 1) { // derelict: missing parapet section, stains, vegetation
        s.globalCompositeOperation = 'destination-out'; s.fillRect(x1 + span * 3.3, D - H * 0.013, span * 0.7, H * 0.009); s.globalCompositeOperation = 'source-over';
        const r = rng(97);
        s.fillStyle = rgba(shadow, 0.35); for (let i = 0; i < n; i++) if (r() < 0.5) s.fillRect(x1 + i * span + span * 0.8, D + H * 0.01, span * 0.12, H * 0.08 * r());
        const ivy = mix(veg('#3f5f3a'), shadow, 0.35), ivyL = mix(ivy, lit, 0.2);
        for (let i = 0; i < 9; i++) { // ivy curtains hanging from the parapet and pier tops
          const ix = x1 + span * (0.3 + r() * (n - 0.6)), iw = span * (0.25 + r() * 0.45), ih = H * (0.02 + r() * 0.07);
          for (let k = 0; k < 70; k++) { // leaves cascade: dense at the top, thinning as they hang
            const u = r(), dy = Math.pow(r(), 2.2) * ih * (0.5 + Math.sin(u * Math.PI));
            roundBlob(s, ix + u * iw, D - H * 0.012 + dy, 1.2 + r() * 2.4 * (1 - dy / (ih * 1.6)), r() < 0.3 ? ivyL : ivy);
          }
        }
      }
      if (B === 1 || B === 2) { // survey marks
        for (let i = 0; i < 6; i++) { const px = x1 + span * (1.5 + i * 1.6); s.fillStyle = '#f36b21'; s.fillRect(px, D - H * 0.03, 2, H * 0.018); s.fillRect(px, D - H * 0.03, 7, 4); }
      }
      if (B === 3 || B === 4) { // scaffolding on piers
        s.strokeStyle = rgba('#d7d0c0', 0.85); s.lineWidth = 1;
        const piers = B === 3 ? [3, 4, 5, 8] : [4];
        for (const i of piers) { const px = x1 + i * span, l = px - pierW, r = px + pierW, t = D - H * 0.04;
          for (let xx = l; xx <= r; xx += pierW / 2) { s.beginPath(); s.moveTo(xx, t); s.lineTo(xx, ground); s.stroke(); }
          for (let yy = t; yy <= ground; yy += H * 0.022) { s.beginPath(); s.moveTo(l, yy); s.lineTo(r, yy); s.stroke(); }
          s.beginPath(); s.moveTo(l, t); s.lineTo(r, ground); s.stroke();
          s.fillStyle = rgba('#2d6a8a', 0.55); s.fillRect(l, t, r - l, H * 0.03); }
      }
      if (B >= 4) { // rails and lamps
        s.fillStyle = mix(shadow, '#1b1b1f', 0.5); s.fillRect(x1 - 4, D - H * 0.017, x2 - x1 + 8, 2);
        for (let i = 0; i <= n; i += 2) { const px = x1 + i * span; s.fillStyle = mix(shadow, '#111', 0.4); s.fillRect(px, D - H * 0.05, 2, H * 0.04); s.fillRect(px - 4, D - H * 0.05, 8, 2); }
      }
      if (snow) { s.fillStyle = snow; s.fillRect(x1 - 4, D - H * 0.016, x2 - x1 + 8, H * 0.005); }
      x.drawImage(c, 0, 0);
      this.pierW = pierW;
    }
    drawTown(x, W, H, P, B) {
      const r = rng(131), base = H * 0.8, lights = P.lit;
      const house = mix(P.mid2, P.near, 0.4), roof = mix(P.mid2, P.fg, 0.5);
      this.windows = [];
      for (let i = 0; i < 16; i++) {
        const hx = W * (0.5 + i * 0.024 + (r() - 0.5) * 0.01), hw = W * (0.014 + r() * 0.01), hh = H * (0.018 + r() * 0.014), hy = base - hh + r() * H * 0.012;
        x.fillStyle = house; x.fillRect(hx, hy, hw, hh + H * 0.02);
        x.fillStyle = roof; x.beginPath(); x.moveTo(hx - 2, hy); x.lineTo(hx + hw / 2, hy - hh * 0.6); x.lineTo(hx + hw + 2, hy); x.fill();
        if (lights > 0.2) for (let k = 0; k < 2; k++) if (r() < 0.35 + lights * 0.5) this.windows.push([hx + hw * (0.2 + k * 0.45), hy + hh * 0.35, Math.max(2, hw * 0.18), r()]);
      }
      // church spire
      const cx = W * 0.62; x.fillStyle = house; x.fillRect(cx, base - H * 0.07, W * 0.012, H * 0.08);
      x.beginPath(); x.moveTo(cx - 2, base - H * 0.07); x.lineTo(cx + W * 0.006, base - H * 0.12); x.lineTo(cx + W * 0.012 + 2, base - H * 0.07); x.fillStyle = roof; x.fill();
      // station platform at the far end once reopened
      if (B >= 4) { x.fillStyle = mix(P.stone, P.near, 0.4); x.fillRect(W * 0.86, H * 0.585 - H * 0.004, W * 0.07, H * 0.006); }
    }

    loop(now) {
      requestAnimationFrame(t => this.loop(t));
      if (!this.layers) return;
      const ctx = this.ctx, W = this.W, H = this.H, dpr = this.dpr, t = (now - this.t0) / 1000;
      const k = this.reduced ? 0 : 0.035;
      this.mx += ((this.reduced ? 0 : this.tx + Math.sin(t * 0.07) * 0.25) - this.mx) * k;
      this.my += ((this.reduced ? 0 : this.ty) - this.my) * k;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const draw = (L, dy) => ctx.drawImage(L.c, -L.pad - this.mx * L.pad, (dy || 0) * dpr);
      draw(this.layers[0]);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // clouds
      for (const c of this.clouds) {
        c.x += (this.reduced ? 0 : c.s) / 60; if (c.x > W + 50) c.x = -c.c.width;
        ctx.globalAlpha = c.a; ctx.drawImage(c.c, c.x - this.mx * 6, c.y); ctx.globalAlpha = 1;
      }
      // birds
      for (const b of this.birds) {
        b.x += this.reduced ? 0 : 0.6; if (b.x > W + 60) b.x = -80 - Math.random() * 400;
        const wy = Math.sin(t * 7 + b.ph) * 3; ctx.strokeStyle = rgba(this.P.fg, 0.7); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(b.x - 5, b.y + wy + Math.sin(b.ph + t) * 6); ctx.lineTo(b.x, b.y + 3 + Math.sin(b.ph + t) * 6); ctx.lineTo(b.x + 5, b.y + wy + Math.sin(b.ph + t) * 6); ctx.stroke();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      draw(this.layers[1]); draw(this.layers[2]); draw(this.layers[3]);
      // animated town windows + train + crane, in the viaduct layer's parallax space
      ctx.setTransform(dpr, 0, 0, dpr, (-this.layers[3].pad - this.mx * this.layers[3].pad) / 1 + this.layers[3].pad, 0);
      this.drawLive(ctx, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // valley mist
      if (!this.reduced || true) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const mist = ctx.createLinearGradient(0, H * 0.62, 0, H * 0.86);
        const mc = this.cfg.time === 'night' ? '#1f2c48' : this.P.hor;
        mist.addColorStop(0, rgba(mc, 0)); mist.addColorStop(0.6, rgba(mc, this.cfg.time === 'day' ? 0.18 : 0.3)); mist.addColorStop(1, rgba(mc, 0));
        ctx.fillStyle = mist; ctx.fillRect(0, H * 0.6, W, H * 0.3);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      draw(this.layers[4]); draw(this.layers[5]);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawWeather(ctx, W, H, t);
      // warm bloom from the sun, then vignette and grain
      if (this.P.glow > 0.3) {
        const [sx, sy] = this.P.sunPos; ctx.globalCompositeOperation = 'lighter';
        const bg = ctx.createRadialGradient(sx * W, sy * H, 0, sx * W, sy * H, W * 0.6);
        bg.addColorStop(0, rgba(this.P.sun, 0.12 * this.P.glow)); bg.addColorStop(1, rgba(this.P.sun, 0));
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
      }
      const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,6,14,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      if (!this.reduced) { ctx.globalAlpha = 0.6; ctx.fillStyle = ctx.createPattern(this.grain, 'repeat'); ctx.save(); ctx.translate((t * 97) % 160, (t * 61) % 160); ctx.fillRect(-160, -160, W + 320, H + 320); ctx.restore(); ctx.globalAlpha = 1; }
      // crossfade from previous scene
      if (this.fade) {
        const p = (now - this.fade.start) / this.fade.dur;
        if (p >= 1) this.fade = null;
        else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - p * p * (3 - 2 * p); ctx.drawImage(this.fade.img, 0, 0); ctx.globalAlpha = 1; }
      }
    }
    drawLive(ctx, t) {
      const W = this.W, H = this.H, P = this.P, vd = this.vd;
      // flickering windows
      for (const w of this.windows || []) {
        const f = 0.75 + 0.25 * Math.sin(t * (1 + w[3] * 2) + w[3] * 10);
        ctx.fillStyle = `rgba(255,${190 + Math.round(w[3] * 40)},110,${f * P.lit})`; ctx.fillRect(w[0], w[1], w[2], w[2] * 1.2);
      }
      // crane during construction
      if (this.cfg.build === 3 || this.cfg.build === 4) {
        const cx = vd.x1 + vd.span * 6.4, top = H * 0.36, base = H * 0.8;
        ctx.strokeStyle = mix('#e7b53a', P.near, 0.35 + P.lit * 0.3); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx, base); ctx.lineTo(cx, top); ctx.stroke();
        ctx.lineWidth = 1; for (let y = top; y < base; y += 10) { ctx.beginPath(); ctx.moveTo(cx - 3, y); ctx.lineTo(cx + 3, y + 10); ctx.stroke(); }
        const a = Math.sin(t * 0.15) * 0.25, jl = W * 0.16;
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - jl * 0.3 * Math.cos(a), top + 4); ctx.lineTo(cx + jl * Math.cos(a), top + 4 + jl * Math.sin(a) * 0.1); ctx.stroke();
        const hx = cx + jl * 0.75 * Math.cos(a), hy = top + 4;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + H * 0.14 + Math.sin(t * 0.6) * 4); ctx.stroke();
        ctx.fillStyle = mix('#8a6a3a', P.near, 0.3); ctx.fillRect(hx - 8, hy + H * 0.14 + Math.sin(t * 0.6) * 4, 16, 6);
        if (P.lit > 0.5) { ctx.fillStyle = `rgba(255,60,50,${0.5 + 0.5 * Math.sin(t * 3)})`; ctx.beginPath(); ctx.arc(cx, top - 3, 2.5, 0, 7); ctx.fill(); }
      }
      // the train
      if (this.cfg.train) {
        const len = W * 0.2, cycle = 26, p = ((t % cycle) / cycle);
        const x = vd.x1 - len - 40 + (vd.x2 - vd.x1 + len + 80) * p, y = vd.D - H * 0.012, h = H * 0.024;
        ctx.save(); ctx.beginPath(); ctx.rect(vd.x1 - 6, 0, vd.x2 - vd.x1 + 12, H); ctx.clip();
        const body = mix('#1f6f6c', P.near, P.lit * 0.55), win = P.lit > 0.3 ? '#ffd88a' : mix('#bfe3ec', P.hor, 0.3);
        for (let c = 0; c < 3; c++) {
          const cx = x + c * (len / 3 + 3), cw = len / 3;
          ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx, y - h, cw, h, 3) : ctx.rect(cx, y - h, cw, h); ctx.fill();
          ctx.fillStyle = mix('#f2c230', P.near, P.lit * 0.4); ctx.fillRect(cx, y - h * 0.32, cw, h * 0.12);
          ctx.fillStyle = win; for (let k = 0; k < 6; k++) ctx.fillRect(cx + cw * (0.07 + k * 0.15), y - h * 0.8, cw * 0.09, h * 0.32);
        }
        ctx.fillStyle = '#f2c230'; ctx.fillRect(x + len + 4, y - h, 4, h);
        if (P.lit > 0.3) { const hg = ctx.createRadialGradient(x + len + 8, y - h / 2, 0, x + len + 8, y - h / 2, 60); hg.addColorStop(0, 'rgba(255,230,160,0.5)'); hg.addColorStop(1, 'rgba(255,230,160,0)'); ctx.fillStyle = hg; ctx.fillRect(x + len - 50, y - 60, 120, 120); }
        ctx.restore();
      }
    }
    drawWeather(ctx, W, H, t) {
      const w = this.cfg.weather; if (w === 'clear') return;
      const target = w === 'rain' ? 260 : 180;
      while (this.particles.length < target) this.particles.push({ x: Math.random() * W, y: Math.random() * H, z: 0.4 + Math.random() * 0.8, ph: Math.random() * 6 });
      if (w === 'rain') {
        ctx.strokeStyle = 'rgba(200,215,230,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (const p of this.particles) {
          if (!this.reduced) { p.y += 14 * p.z; p.x -= 3 * p.z; }
          if (p.y > H) { p.y = -20; p.x = Math.random() * W * 1.2; }
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3 * p.z, p.y + 14 * p.z);
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(40,50,60,0.12)'; ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = 'rgba(245,248,255,0.85)';
        for (const p of this.particles) {
          if (!this.reduced) { p.y += 0.9 * p.z; p.x += Math.sin(t + p.ph) * 0.4; }
          if (p.y > H) { p.y = -5; p.x = Math.random() * W; }
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 * p.z + 0.4, 0, 7); ctx.fill();
        }
      }
    }
    snapshot(w, h) { // cover-crop current frame into w×h
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      const s = Math.max(w / this.cv.width, h / this.cv.height), dw = this.cv.width * s, dh = this.cv.height * s;
      x.drawImage(this.cv, (w - dw) / 2, (h - dh) * 0.62, dw, dh); return c;
    }
  }
  LS.Scene = Scene;
})();
