/* LINESIDE atmosphere: a running day-night clock, a weather director, and ambient motion.
 *
 * - Clock: starts at the scene's time of day (dawn, day, dusk, night) and runs on, 1 game hour per 40 s by default;
 *   the sky colour, darkness and warmth are keyframed by hour and blended every frame.
 * - Weather: clear, fair (cloud shadows sweep the valley), overcast, drizzle and rain, each lasting a minute or two,
 *   blended smoothly. Rain brings streaks on the wind, splash rings on the ground and a wet, cooler grade.
 * - Night: the valley darkens; lamps, lit windows and doorways (scene.lights and buildings' lit overlays) glow.
 * - Ambient motion: drifting cloud shadows, low dawn mist, golden-hour light shafts, birds by day, moths round the lamps at night.
 *
 * Patches LS.World.prototype (grade, drawWeather, drawNight, update). Respects world.reduced (fewer, slower effects).
 */
window.LS = window.LS || {};
(function () {
  'use strict';
  const W = LS.World; if (!W) return;
  const P = W.prototype, baseUpdate = P.update, baseSet = P.set;
  const HOURS_PER_SEC = 1 / 40;
  // hour, sky tint (multiply), tint strength, darkness, warmth (golden light), mist
  const SKY = [
    [0, [52, 64, 128], 0.55, 0.66, 0, 0], [4.6, [52, 64, 128], 0.55, 0.66, 0, 0.1], [5.6, [110, 96, 160], 0.42, 0.42, 0.1, 0.5],
    [6.6, [255, 200, 180], 0.16, 0.08, 0.75, 0.7], [8, [255, 236, 214], 0.1, 0, 0.25, 0.15], [12, [255, 255, 255], 0, 0, 0, 0],
    [16.4, [255, 242, 220], 0.07, 0, 0.15, 0], [18.2, [255, 186, 110], 0.32, 0, 1, 0], [19.3, [232, 136, 150], 0.36, 0.16, 0.55, 0.1],
    [20.3, [104, 92, 160], 0.5, 0.45, 0.1, 0.1], [21.5, [52, 64, 128], 0.55, 0.66, 0, 0], [24, [52, 64, 128], 0.55, 0.66, 0, 0]
  ];
  const START = { dawn: 6.4, day: 11.5, overcast: 13, dusk: 18.4, night: 22.5 };
  const STATES = {
    clear: { cloud: 0.08, rain: 0, wind: 0.2, w: 3 }, fair: { cloud: 0.45, rain: 0, wind: 0.4, w: 4 }, overcast: { cloud: 0.9, rain: 0, wind: 0.5, w: 2 },
    drizzle: { cloud: 0.85, rain: 0.35, wind: 0.5, w: 1.2 }, rain: { cloud: 1, rain: 0.85, wind: 0.8, w: 1 }
  };
  const mix = (a, b, t) => a + (b - a) * t;
  const BLOB = {};   // pre-drawn soft radial blobs, drawn scaled with globalAlpha (far cheaper than gradients every frame)
  function blob(rgb) {
    if (BLOB[rgb]) return BLOB[rgb];
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, `rgba(${rgb},1)`); rg.addColorStop(0.45, `rgba(${rgb},0.55)`); rg.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    return (BLOB[rgb] = c);
  }
  const stamp = (x, img, sx, sy, R, alpha, sq) => { if (alpha <= 0.003) return; x.globalAlpha = Math.min(1, alpha); x.drawImage(img, sx - R, sy - R * (sq || 1), 2 * R, 2 * R * (sq || 1)); };
  function sky(h) {
    h = ((h % 24) + 24) % 24; let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
    const a = SKY[i], b = SKY[i + 1], t = (h - a[0]) / (b[0] - a[0] || 1), s = t * t * (3 - 2 * t);
    return { tint: a[1].map((c, k) => mix(c, b[1][k], s)), str: mix(a[2], b[2], s), dark: mix(a[3], b[3], s), warm: mix(a[4], b[4], s), mist: mix(a[5], b[5], s) };
  }
  let PATCHC = null;   // a soft oblong of window light
  const PATCH = () => { if (PATCHC) return PATCHC; const c = document.createElement('canvas'); c.width = 32; c.height = 64; const g = c.getContext('2d');
    const gy = g.createLinearGradient(0, 0, 0, 64); gy.addColorStop(0, 'rgba(255,238,200,1)'); gy.addColorStop(1, 'rgba(255,230,190,0)'); g.fillStyle = gy; g.fillRect(4, 0, 24, 64);
    g.globalCompositeOperation = 'destination-in'; const gx = g.createLinearGradient(0, 0, 32, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.3, 'rgba(0,0,0,1)'); gx.addColorStop(0.7, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gx; g.fillRect(0, 0, 32, 64);
    return (PATCHC = c); };
  const bucket = h => (h >= 5.2 && h < 8 ? 'dawn' : h >= 8 && h < 17.8 ? 'day' : h >= 17.8 && h < 20.6 ? 'dusk' : 'night');

  function A(w) {   // lazily attached state
    if (w._atm) return w._atm;
    const r = Math.random;
    return (w._atm = {
      hour: 11, state: 'fair', left: 90, cur: Object.assign({}, STATES.fair), clouds: Array.from({ length: 9 }, () => ({ x: r() * 2200, y: r() * 1400, r: 90 + r() * 170, s: 0.7 + r() * 0.6 })),
      drops: [], rings: [], birds: [], shaft: r() * 100, rainOn: false
    });
  }
  function pickState(cur) {
    const opts = Object.entries(STATES).filter(([k]) => k !== cur), tot = opts.reduce((a, [, v]) => a + v.w, 0);
    let t = Math.random() * tot; for (const [k, v] of opts) if ((t -= v.w) < 0) return k; return 'fair';
  }

  P.set = function (cfg) {
    baseSet.call(this, cfg);
    const a = A(this);
    if (cfg && cfg.time && START[cfg.time] != null) a.hour = START[cfg.time];
    if (cfg && cfg.weather) { a.state = cfg.weather === 'rain' ? 'rain' : cfg.time === 'overcast' ? 'overcast' : cfg.weather === 'clear' ? 'fair' : 'fair'; a.left = 70 + Math.random() * 60; }
    Object.assign(a.cur, STATES[a.state]);
  };

  P.update = function (dt) {
    baseUpdate.call(this, dt);
    const a = A(this); a.dt = Math.min(0.05, dt || 0.016);
    // adaptive quality: if frames run long for a few seconds (slow GPU), drop to the lighter atmosphere
    a.ft = (a.ft || 0.0167) * 0.97 + (dt || 0.0167) * 0.03; a.slowT = a.ft > 0.019 ? (a.slowT || 0) + dt : 0;
    if (a.slowT > 1.5 && !a.lite) a.lite = true;
    if (!this.attract && !this.paused) a.hour = (a.hour + dt * HOURS_PER_SEC) % 24;
    a.left -= dt; if (a.left <= 0) { a.state = pickState(a.state); a.left = 60 + Math.random() * 110; }
    const tgt = STATES[a.state], k = 1 - Math.exp(-dt / 9);
    for (const key of ['cloud', 'rain', 'wind']) a.cur[key] += (tgt[key] - a.cur[key]) * k;
    this.cfg.time = bucket(a.hour); this.cfg.weather = a.cur.rain > 0.2 ? 'rain' : 'clear';
    const on = a.cur.rain > 0.25 && this.room === 'outside';
    if (on !== a.rainOn) { a.rainOn = on; if (LS.audio && LS.audio.setWeather) LS.audio.setWeather(on ? 'rain' : 'clear'); }
    const S = sky(a.hour); a.sky = S; this.nightK = Math.min(1, S.dark * 1.6);
  };
  P.drawNight = function () { };
  P.drawWeather = function () { };

  P.grade = function (x, t, sc) {
    const a = A(this), S = a.sky || sky(a.hour), c = a.cur; a.dt = a.dt || 0.016; const D = this.cv, Z = this.S * this.dpr, cx = this.camX, cy = this.camY;
    const toS = (wx, wy) => [(wx - cx) * Z, (wy - cy) * Z], red = this.reduced;
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (this.room !== 'outside') {   // interiors: daylight through the windows, soft air, the depot torch in the cold open
      const day = Math.max(0, 1 - S.dark * 1.6) * (1 - c.cloud * 0.5), h = a.hour;
      // window light lying across the floor, sliding with the sun (east in the morning light, west by evening)
      const WIN = { shed: [64, 176, 288, 400], hall: [64, 400], office: [64, 272] }[this.room];
      if (WIN && day > 0.05 && !this.flags.dark) {
        const P = PATCH(), off = (12 - h) * 3.2, len = 34 + Math.abs(12 - h) * 3;
        x.globalCompositeOperation = 'lighter'; x.imageSmoothingEnabled = true;
        for (const wx of WIN) {
          const [sx, sy] = toS(wx + off - 13, 36); x.globalAlpha = 0.16 * day;
          x.setTransform(1, 0, (off / len) * 0.9, 1, sx, sy); x.drawImage(P, 0, 0, 26 * Z, len * Z);
        }
        x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
      }
      x.fillStyle = day > 0.5 ? 'rgba(236,240,255,0.03)' : 'rgba(255,226,180,0.06)'; x.fillRect(0, 0, D.width, D.height);
      if (this.flags.dark) {
        const px = (this.player.x - cx) * Z, py = (this.player.y - 14 - cy) * Z, R = 70 * Z, rg = x.createRadialGradient(px, py, R * 0.15, px, py, R);
        rg.addColorStop(0, 'rgba(8,6,14,0)'); rg.addColorStop(0.7, 'rgba(8,6,14,0.55)'); rg.addColorStop(1, 'rgba(8,6,14,0.93)'); x.fillStyle = rg; x.fillRect(0, 0, D.width, D.height);
      }
      return;
    }
    // Everything soft is built on two quarter-resolution layers and blended onto the screen once each:
    //   M (multiply): sky tint, cloud shadows, night darkness with light pools cut out
    //   G (screen):   golden glow and shafts, dawn mist, lamp glows, fireflies
    const q = 4, lw = Math.ceil(D.width / q), lh = Math.ceil(D.height / q), Zq = Z / q;
    const layer = k => { const c = this[k] || (this[k] = document.createElement('canvas')); if (c.width !== lw || c.height !== lh) { c.width = lw; c.height = lh; } const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, lw, lh); return [c, g]; };
    const toQ = (wx, wy) => [(wx - cx) * Zq, (wy - cy) * Zq];
    // the soft layers change slowly: rebuild them every other frame and reuse them in between
    a.fr = (a.fr || 0) + 1;
    if (a.fr % (a.lite ? 4 : 2) !== 1 && this._atmM && this._atmM.width === lw && a.lastCam && Math.abs(a.lastCam[0] - cx) < 2 && Math.abs(a.lastCam[1] - cy) < 2) {
      x.imageSmoothingEnabled = true;
      if (a.useM) { x.globalCompositeOperation = 'multiply'; x.drawImage(this._atmM, 0, 0, lw * q, lh * q); }
      if (a.useG && !a.lite) { x.globalCompositeOperation = 'lighter'; x.drawImage(this._atmG, 0, 0, lw * q, lh * q); }
      x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
      return this.drawRain(x, t, a, c, D, Z, cx, cy, toS, red, S);
    }
    a.lastCam = [cx, cy];
    const [Mc, M] = layer('_atmM'), [Gc, Gg] = layer('_atmG');
    let useM = false, useG = false;
    // sky tint, greyed by cloud and rain
    const grey = Math.min(1, c.cloud * 0.35 + c.rain * 0.3), tint = S.tint.map((v, i) => mix(v, [150, 158, 172][i], grey)), str = Math.max(S.str, grey * 0.5);
    const tintC = tint.map(v => Math.round(mix(255, v, str)));
    if (str > 0.01) { M.fillStyle = `rgb(${tintC.join(',')})`; M.fillRect(0, 0, lw, lh); useM = true; }
    else { M.fillStyle = '#fff'; M.fillRect(0, 0, lw, lh); }
    // cloud shadows drifting on the wind
    const shade = c.cloud * (1 - c.cloud * 0.45) * (1 - S.dark);
    if (!red) for (const cl of a.clouds) { cl.x += (6 + c.wind * 22) * cl.s * a.dt; cl.y += 1.2 * a.dt; if (cl.x - cl.r > 2300) { cl.x = -cl.r; cl.y = Math.random() * 1400; } if (cl.y > 1500) cl.y = -cl.r; }
    if (shade > 0.1 && !a.lite) {
      M.globalCompositeOperation = 'multiply';
      for (const cl of a.clouds) { const [sx, sy] = toQ(cl.x, cl.y), R = cl.r * Zq; if (sx < -R || sy < -R || sx > lw + R || sy > lh + R) continue; stamp(M, blob('96,104,140'), sx, sy, R, 0.55 * shade, 0.7); }
      M.globalAlpha = 1; M.globalCompositeOperation = 'source-over'; useM = true;
    }
    // low sun: long soft shadows raking across the ground, away from the sun (east at dusk, west at dawn), laid over
    // the baked midday ones; drawn at quarter resolution from the blurred silhouettes shadows.js keeps
    const lowSun = S.warm * (1 - c.cloud * 0.85) * (1 - S.dark);
    if (lowSun > 0.08 && LS.HD && LS.HD.silhouette) {
      const dir = a.hour > 12 ? 1 : -1, kx = 2.3 * dir, ky = 0.22, x0 = cx - 40, x1 = cx + this.vw + 40, y0 = cy - 20, y1 = cy + this.vh + 60;
      M.save(); M.setTransform(Zq, 0, 0, Zq, -cx * Zq, -cy * Zq); M.globalAlpha = Math.min(0.4, 0.5 * lowSun);
      const casters = sc._sunCasters || (sc._sunCasters = sc.objects.filter(o => o.img && o.h > 8 && o.sortY < 1e5 && !/^(hd_overlay|hd_fence_v)$/.test(o.kind || '')));
      for (const o of casters) {
        const base = o.sortY, reach = o.h * Math.abs(kx);
        if (base < y0 || base - o.h > y1 || o.dx + o.w + (dir > 0 ? reach : 0) < x0 || o.dx - (dir < 0 ? reach : 0) > x1) continue;
        const s = LS.HD.silhouette(o.img, 6), pd = 12, px = o.w / (s.width - 2 * pd) * pd, py = o.h / (s.height - 2 * pd) * pd;
        M.save(); M.transform(1, 0, -kx, -ky, kx * base, (1 + ky) * base); M.drawImage(s, o.dx - px, o.dy - py, o.w + 2 * px, o.h + 2 * py); M.restore();
      }
      M.restore(); M.globalAlpha = 1; useM = true;
    }
    // night: darkness (a moonlit blue, not black), with pools of light cut out at lamps, windows, doorways and,
    // more gently, around the player; a light only counts while its source is on screen (no glow without a lamp)
    if (S.dark > 0.02) {
      M.globalCompositeOperation = 'multiply'; M.fillStyle = `rgba(34,46,104,${0.64 * S.dark})`; M.fillRect(0, 0, lw, lh);
      const vis = L => { const m = Math.min(L.x - cx, cx + this.vw - L.x, L.y - cy, cy + this.vh - L.y); return m < -12 ? 0 : Math.min(1, (m + 12) / 16); };
      M.globalCompositeOperation = 'destination-out';
      // street lamps light the ground at their foot too: a flattened pool ~42 units below the lantern
      const pool = L => L.r >= 40 && !L.win;
      for (const L of (sc.lights || [])) { const v = vis(L); if (v <= 0) continue; const [sx, sy] = toQ(L.x, L.y), R = (L.r || 20) * Zq * 1.3; stamp(M, blob('0,0,0'), sx, sy, pool(L) ? R * 0.75 : R, 0.9 * S.dark * v); if (pool(L)) { const [px, py] = toQ(L.x, L.y + 42); stamp(M, blob('0,0,0'), px, py, 40 * Zq, 0.85 * S.dark * v, 0.45); } }
      { const [sx, sy] = toQ(this.player.x, this.player.y - 12); stamp(M, blob('0,0,0'), sx, sy, 22 * Zq * 1.3, 0.55 * S.dark); }
      M.globalAlpha = 1; M.globalCompositeOperation = 'source-over'; useM = true;
      Gg.globalCompositeOperation = 'lighter';
      for (const L of sc.lights || []) { const v = vis(L); if (v <= 0) continue; const fl = red ? 1 : 0.92 + 0.08 * Math.sin(t * 7 + L.x), [sx, sy] = toQ(L.x, L.y), R = (L.r || 20) * Zq * (pool(L) ? 0.6 : 0.9); stamp(Gg, blob('255,184,96'), sx, sy, R, (L.win ? 0.28 : 0.5) * S.dark * v * fl); if (pool(L)) { const [px, py] = toQ(L.x, L.y + 42); stamp(Gg, blob('255,176,90'), px, py, 34 * Zq, 0.3 * S.dark * v * fl, 0.45); } }
      // a few moths about each lit street lamp (March: no fireflies)
      if (!red && c.rain < 0.2 && S.dark > 0.3) for (const L of sc.lights || []) {
        if (!(L.r >= 40) || vis(L) < 1) continue;
        for (let k = 0; k < 3; k++) {
          const ph = L.x * 0.37 + k * 2.1, mx = L.x + Math.cos(t * (1.3 + k * 0.4) + ph) * (4 + k * 2.5) + Math.sin(t * 3.1 + ph) * 1.2, my = L.y + 2 + Math.sin(t * (1.7 + k * 0.3) + ph * 1.3) * (3 + k * 1.5);
          const [sx, sy] = toQ(mx, my); stamp(Gg, blob('255,240,214'), sx, sy, 0.9 * this.dpr, (0.55 + 0.45 * Math.sin(t * 9 + ph)) * S.dark);
        }
      }
      Gg.globalAlpha = 1; Gg.globalCompositeOperation = 'source-over'; useG = true;
    }
    // golden hour: warm wash and slow light shafts (clear skies only)
    const warm = S.warm * (1 - c.cloud * 0.8);
    if (warm > 0.03) {
      Gg.fillStyle = `rgba(255,170,90,${0.12 * warm})`; Gg.fillRect(0, 0, lw, lh);
      if (!red) {
        a.shaft += a.dt;
        for (let i = 0; i < 4; i++) {
          const px = ((Math.sin(a.shaft * 0.05 + i * 1.7) * 0.5 + 0.5) * 1.3 - 0.15) * lw, w = lw * (0.1 + 0.05 * i), gr = Gg.createLinearGradient(0, 0, w, 0);
          gr.addColorStop(0, 'rgba(255,200,120,0)'); gr.addColorStop(0.5, `rgba(255,196,120,${0.1 * warm})`); gr.addColorStop(1, 'rgba(255,200,120,0)');
          Gg.save(); Gg.translate(px, 0); Gg.transform(1, 0, -0.5, 1, 0, 0); Gg.fillStyle = gr; Gg.fillRect(0, 0, w, lh); Gg.restore();
        }
      }
      useG = true;
    }
    // dawn mist lying low over the valley
    if (S.mist > 0.05 && !red) {
      for (let i = 0; i < 5; i++) { const y = lh * (0.25 + i * 0.17) + Math.sin(t * 0.2 + i) * 3; Gg.globalAlpha = 0.25 * S.mist; Gg.drawImage(blob('236,236,244'), -lw * 0.2 + Math.sin(t * 0.05 + i * 2) * 10, y - 15, lw * 1.4, 30); }
      Gg.globalAlpha = 1; useG = true;
    }
    x.imageSmoothingEnabled = true;
    if (useM) { x.globalCompositeOperation = 'multiply'; x.drawImage(Mc, 0, 0, lw * q, lh * q); }
    if (useG && !a.lite) { x.globalCompositeOperation = 'lighter'; x.drawImage(Gc, 0, 0, lw * q, lh * q); }
    x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
    a.useM = useM; a.useG = useG;
    this.drawRain(x, t, a, c, D, Z, cx, cy, toS, red, S);
  };
  // depth of field, aerial perspective, vignette, bloom and foreground leaves: js/world/hd/depth.js (P.depthOfField)
  P.drawRain = function (x, t, a, c, D, Z, cx, cy, toS, red, S) {
    // 6. rain: streaks on the wind, splash rings on the ground
    if (c.rain > 0.03) {
      const n = Math.round((red ? 60 : 260) * c.rain), k = this.dpr * this.S / 3, lean = 2 + c.wind * 5;
      while (a.drops.length < n) a.drops.push({ x: Math.random() * D.width * 1.2, y: Math.random() * D.height, z: 0.5 + Math.random() * 0.7 });
      a.drops.length = Math.min(a.drops.length, n);
      x.strokeStyle = `rgba(200,210,228,${0.35 + 0.2 * c.rain})`; x.lineWidth = Math.max(1, this.dpr); x.beginPath();
      for (const p of a.drops) { if (!red) { p.y += 15 * p.z * k; p.x -= lean * p.z * k; } if (p.y > D.height) { p.y = -20; p.x = Math.random() * D.width * 1.2; } x.moveTo(p.x, p.y); x.lineTo(p.x - lean * p.z * k * 0.8, p.y + 11 * p.z * k); }
      x.stroke();
      if (!red) {
        if (Math.random() < c.rain * 0.9) a.rings.push({ x: cx + Math.random() * this.vw, y: cy + Math.random() * this.vh, t: 0 });
        x.strokeStyle = 'rgba(220,230,240,0.5)'; x.lineWidth = Math.max(1, this.dpr * 0.8);
        a.rings = a.rings.filter(r => (r.t += a.dt) < 0.5);
        for (const r of a.rings) { const [sx, sy] = toS(r.x, r.y), R = (1 + r.t * 10) * Z * 0.5; x.globalAlpha = 1 - r.t * 2; x.beginPath(); x.ellipse(sx, sy, R, R * 0.45, 0, 0, 7); x.stroke(); }
        x.globalAlpha = 1;
      }
    }
    // 7. birds crossing a fair-weather daytime sky
    if (!red && S.dark < 0.2 && c.rain < 0.1) {
      if (Math.random() < 0.0025) { const y = Math.random() * D.height * 0.6, dir = Math.random() < 0.5 ? 1 : -1; for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) a.birds.push({ x: dir > 0 ? -40 - i * 30 : D.width + 40 + i * 30, y: y + (i % 2) * 18 + i * 6, v: dir * (2.2 + Math.random() * 0.4) * this.dpr, p: Math.random() * 6 }); }
      a.birds = a.birds.filter(b => b.x > -120 && b.x < D.width + 120);
      x.strokeStyle = 'rgba(40,36,52,0.8)'; x.lineWidth = Math.max(1.2, this.dpr * 1.2);
      for (const b of a.birds) { b.x += b.v; b.p += 0.25; const f = Math.sin(b.p) * 4 * this.dpr, s = 6 * this.dpr; x.beginPath(); x.moveTo(b.x - s, b.y - f); x.quadraticCurveTo(b.x - s * 0.4, b.y - s * 0.3, b.x, b.y); x.quadraticCurveTo(b.x + s * 0.4, b.y - s * 0.3, b.x + s, b.y - f); x.stroke(); }
    }
  };

  // time of day for the HUD or anything else that wants it
  P.clock = function () { const a = A(this); return { hour: a.hour, weather: a.state, rain: a.cur.rain, cloud: a.cur.cloud }; };
})();
