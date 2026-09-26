/* LINESIDE — the explorable world (side-on 2.5D, Canvas 2D).
 * Harrowby (town) → hill path → Harrowby Station → the viaduct over Kestrel Beck
 * → site compound → Kestrel Junction. Two interiors: the site cabin and the village hall.
 * The game (js/game.js) supplies entities and reacts to interactions; this file owns
 * geography, rendering, movement, camera and input.
 */
window.LS = window.LS || {};
(function () {
  const { PAL, SEASON, mix, rgba, rng, pine } = LS.art;
  const W_WORLD = 5400;
  const VIA = { x1: 1960, x2: 3660, n: 11 }; VIA.span = (VIA.x2 - VIA.x1) / VIA.n;
  const PIER4 = VIA.x1 + 4 * VIA.span;
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * t);
  function terrain(x) {
    if (x < 1480) return 200 + 3 * Math.sin(x / 90);
    if (x < 1790) return 200 - 200 * ease((x - 1480) / 310) + 3 * Math.sin(1480 / 90) * (1 - ease((x - 1480) / 310));
    if (x < 1960) return 0;
    if (x < 2170) return 272 * ease((x - 1960) / 210);
    if (x < 3440) return 272 + 6 * Math.sin(x / 120);
    if (x < 3660) return 272 * (1 - ease((x - 3440) / 220));
    return 3 * Math.sin(x / 140);
  }
  const walkY = x => (x >= VIA.x1 && x <= VIA.x2) ? 0 : terrain(x);
  const LIGHT = { dawn: 0.28, day: 0.06, dusk: 0.36, overcast: 0.22, night: 0.6 };
  const ROOMS = {
    cabin: { w: 660, door: 612, exitTo: { room: 'outside', x: 3908 } },
    hall: { w: 940, door: 48, exitTo: { room: 'outside', x: 1122 } }
  };
  const DOORS = { cabin: 3908, hall: 1122 };

  class World {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.cfg = { time: 'dawn', season: 'spring', weather: 'clear', build: 0, train: false };
      this.entities = []; this.room = 'outside';
      this.player = { x: 3874, dir: 1, phase: 0, moving: false, target: null, look: null };
      this.keys = {}; this.hold = 0; this.paused = true; this.reduced = false;
      this.camX = 0; this.camY = 0; this.t0 = performance.now(); this.last = this.t0;
      this.fade = 0; this.fadeDir = 0; this.fadeCb = null;
      this.particles = []; this.objective = null; this.focus = null; this.touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      this.onInteract = null; this.onEnterRoom = null;
      this.mainTrain = { x: -9999, next: 4 }; this.grain = this.makeGrain();
      this.resize(); addEventListener('resize', () => this.resize());
      this.bindInput();
      requestAnimationFrame(t => this.loop(t));
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2); this.dpr = dpr;
      this.cv.width = Math.round(innerWidth * dpr); this.cv.height = Math.round(innerHeight * dpr);
      this.cv.style.width = innerWidth + 'px'; this.cv.style.height = innerHeight + 'px';
      this.baseS = Math.min(innerHeight / 500, innerWidth / (innerHeight > innerWidth * 1.2 ? 300 : 400)); this.fitScale();
    }
    fitScale() {
      let s = this.baseS;
      if (this.room !== 'outside') s = Math.max(s, Math.min(innerHeight / 380, innerWidth / 420));
      this.S = s; this.vw = innerWidth / s; this.vh = innerHeight / s;
    }
    makeGrain() { const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), d = x.createImageData(160, 160); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 16; } x.putImageData(d, 0, 0); return c; }
    set(cfg) {
      this.cfg = Object.assign({ weather: 'clear', train: false }, cfg); this.P = PAL[this.cfg.time] || PAL.day;
      this.particles = []; this.decorate();
    }
    // Static decoration derived from the build state (so construction visibly progresses)
    decorate() {
      const r = rng(5); const B = this.cfg.build;
      this.ivy = []; for (let i = 0; i < 26; i++) this.ivy.push([VIA.x1 + r() * (VIA.x2 - VIA.x1), 30 + r() * 60, 10 + r() * 40]);
      this.valleyTrees = []; for (let i = 0; i < 60; i++) { const x = 2000 + r() * 1620; this.valleyTrees.push([x, 30 + r() * 50, r()]); }
      this.hillTrees = []; for (let i = 0; i < 70; i++) { const x = r() * W_WORLD; if (x > 1900 && x < 3700) continue; if (x > 20 && x < 1300 && r() < 0.8) continue; this.hillTrees.push([x, 40 + r() * 70]); }
      this.fg = [60, 1560, 2150, 2760, 3350, 5250].map((w, i) => [w * 1.3, 120 + r() * 90, i % 2 === 0]);
      this.clouds = []; const n = this.cfg.time === 'overcast' ? 12 : 7; for (let i = 0; i < n; i++) this.clouds.push({ x: r() * 1600, y: 20 + r() * 150, w: 90 + r() * 150, s: 3 + r() * 5 });
      this.stars = []; for (let i = 0; i < 160; i++) this.stars.push([r(), r() * 0.55, r()]);
      this.scaffold = B === 3 ? [3, 4, 5, 8] : B === 4 ? [4] : [];
    }
    bindInput() {
      addEventListener('keydown', e => {
        if (e.target && e.target.tagName === 'INPUT') return;
        this.keys[e.key.toLowerCase()] = true;
        if (!this.paused && !e.defaultPrevented && (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.use(); }
      });
      addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
      addEventListener('blur', () => { this.keys = {}; this.hold = 0; });
      this.cv.addEventListener('pointerdown', e => {
        if (this.paused) return;
        const wx = this.camX + e.clientX / this.S, wy = this.camY + e.clientY / this.S;
        const hit = this.visible().find(en => Math.abs(en.x - wx) < 26 && wy > this.groundAt(en.x) - 90 && wy < this.groundAt(en.x) + 12);
        this.player.target = hit ? { x: hit.x + (this.player.x < hit.x ? -30 : 30), use: hit } : { x: wx };
      });
    }
    groundAt(x) { return this.room === 'outside' ? walkY(x) : 0; }
    visible() { return this.entities.filter(e => e.room === this.room && !e.hidden); }
    use() {
      if (this.paused || this.fadeDir) return;
      const f = this.focus; if (f && this.onInteract) { this.player.target = null; this.player.dir = f.x > this.player.x ? 1 : -1; f.dirFace = f.x > this.player.x ? -1 : 1; this.onInteract(f); }
    }
    enter(room, x) {
      this.fadeDir = 1; this.fadeCb = () => { this.room = room; this.player.x = x; this.player.target = null; this.snapCam(); if (this.onEnterRoom) this.onEnterRoom(room); };
    }
    place(room, x) { this.room = room; this.player.x = x; this.snapCam(); }
    snapCam() { const c = this.camTarget(); this.camX = c[0]; this.camY = c[1]; }
    camTarget() {
      const p = this.player;
      if (this.attract) { const u = 0.5 + 0.5 * Math.sin((performance.now() - this.t0) / 1000 * 0.035 - 1.2); return [1500 + u * (3300 - this.vw * 0.5), -this.vh * 0.62]; }
      if (this.room !== 'outside') { const R = ROOMS[this.room]; const cx = R.w < this.vw ? (R.w - this.vw) / 2 : Math.max(0, Math.min(R.w - this.vw, p.x - this.vw / 2)); return [cx, -this.vh * 0.82]; }
      return [Math.max(0, Math.min(W_WORLD - this.vw, p.x - this.vw / 2 + p.dir * this.vw * 0.08)), walkY(p.x) - this.vh * 0.62];
    }

    update(dt) {
      const p = this.player, t = (performance.now() - this.t0) / 1000;
      let dx = 0;
      if (!this.paused && !this.fadeDir) {
        if (this.keys['arrowleft'] || this.keys['a'] || this.hold < 0) dx = -1;
        if (this.keys['arrowright'] || this.keys['d'] || this.hold > 0) dx = 1;
        if (dx) p.target = null;
        else if (p.target) { const d = p.target.x - p.x; if (Math.abs(d) < 4) { const u = p.target.use; p.target = null; if (u) { this.focus = u; this.use(); } } else dx = Math.sign(d); }
      }
      const maxX = this.room === 'outside' ? W_WORLD - 20 : ROOMS[this.room].w - 20;
      const speed = 200 * (this.keys['shift'] ? 1.6 : 1);
      if (dx) { p.x = Math.max(20, Math.min(maxX, p.x + dx * speed * dt)); p.dir = dx; p.phase += dt * 11; p.moving = true; }
      else { p.moving = false; p.phase += dt * 2; }
      // NPC idle wander
      for (const e of this.entities) {
        if (e.kind !== 'npc' || e.room !== this.room) continue;
        e.phase = (e.phase || Math.random() * 6) + dt * (e.moving ? 9 : 2);
        if (e.wander && !this.paused) {
          e.wt = (e.wt || 0) - dt;
          if (e.wt <= 0) { e.goal = e.wander[0] + Math.random() * (e.wander[1] - e.wander[0]); e.wt = 3 + Math.random() * 6; }
          const d = (e.goal ?? e.x) - e.x; e.moving = Math.abs(d) > 3; if (e.moving) { e.x += Math.sign(d) * 45 * dt; e.dirFace = Math.sign(d); }
        } else e.moving = false;
      }
      // focus: nearest interactable in reach
      let best = null, bd = 48;
      if (!this.paused) for (const e of this.visible()) { const d = Math.abs(e.x - p.x); if (d < bd && e.prompt) { bd = d; best = e; } }
      this.focus = best;
      // camera
      const [tx, ty] = this.camTarget(), k = Math.min(1, dt * 5);
      this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
      // fade between rooms
      if (this.fadeDir) { this.fade += this.fadeDir * dt * 3.2; if (this.fade >= 1) { this.fade = 1; this.fadeDir = -1; if (this.fadeCb) { this.fadeCb(); this.fadeCb = null; } } if (this.fade <= 0 && this.fadeDir < 0) { this.fade = 0; this.fadeDir = 0; } }
      // main line trains at the junction
      const mt = this.mainTrain; mt.next -= dt; if (mt.next <= 0 && mt.x < -1000) { mt.x = W_WORLD + 60; mt.next = 24 + Math.random() * 20; }
      if (mt.x > -1000) { mt.x -= 520 * dt; if (mt.x < 4300) mt.x = -9999; }
    }

    loop(now) {
      requestAnimationFrame(t => this.loop(t));
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      if (!this.P) return;
      this.fitScale(); this.update(dt);
      const x = this.ctx, S = this.S * this.dpr, t = (now - this.t0) / 1000;
      LS.setLight(this.P, LIGHT[this.cfg.time] ?? 0.2);
      x.setTransform(S, 0, 0, S, 0, 0);
      if (this.room === 'outside') this.drawOutside(x, t); else this.drawRoom(x, t);
      this.drawOverlays(x, t);
    }

    /* ----------------------------- OUTSIDE ----------------------------- */
    drawOutside(x, t) {
      const P = this.P, vw = this.vw, vh = this.vh, cx = this.camX, cy = this.camY, S = this.S * this.dpr;
      const refY = -vh * 0.62, dy = cy - refY; // how far below deck level the camera is
      const winter = this.cfg.season === 'winter', veg = c => mix(c, SEASON[this.cfg.season].veg, SEASON[this.cfg.season].mix * (1 - P.lit * 0.6));
      // Sky
      const g = x.createLinearGradient(0, 0, 0, vh * 0.8); g.addColorStop(0, P.top); g.addColorStop(0.55, P.mid); g.addColorStop(1, P.hor);
      x.fillStyle = g; x.fillRect(0, 0, vw, vh);
      if (P.stars) for (const [sx, sy, a] of this.stars) { x.fillStyle = `rgba(255,255,240,${(0.3 + 0.7 * a) * P.stars * (0.7 + 0.3 * Math.sin(t * 2 + a * 9))})`; x.fillRect(sx * vw, sy * vh - dy * 0.02, 1.2, 1.2); }
      const sunX = P.sunPos[0] * vw - cx * 0.015, sunY = P.sunPos[1] * vh - dy * 0.03, sr = 22;
      const sg = x.createRadialGradient(sunX, sunY, 0, sunX, sunY, vw * 0.6); sg.addColorStop(0, rgba(P.sun, 0.5 * P.glow + 0.1)); sg.addColorStop(0.3, rgba(P.sun, 0.12 * P.glow)); sg.addColorStop(1, rgba(P.sun, 0));
      x.fillStyle = sg; x.fillRect(0, 0, vw, vh);
      if (this.cfg.weather !== 'rain' && this.cfg.time !== 'overcast') { x.fillStyle = P.sun; x.beginPath(); x.arc(sunX, sunY, sr, 0, 7); x.fill(); if (P.moon) { x.fillStyle = P.top; x.beginPath(); x.arc(sunX + 9, sunY - 4, sr * 0.86, 0, 7); x.fill(); } }
      // Clouds (flat, drifting)
      for (const c of this.clouds) {
        c.x += (this.reduced ? 0 : c.s) / 60; const px = ((c.x - cx * 0.04) % (vw + 400) + vw + 400) % (vw + 400) - 200, py = c.y - dy * 0.03;
        const base = this.cfg.time === 'overcast' ? mix(P.cloud, P.top, 0.25) : P.cloud;
        x.save(); x.beginPath(); for (let k = 0; k < 5; k++) { const u = (k + 0.5) / 5, r = c.w * 0.14 * (0.6 + Math.sin(u * Math.PI) * 0.8); x.moveTo(px + c.w * u + r, py - r * 0.5); x.arc(px + c.w * u, py - r * 0.5, r, 0, 7); }
        x.clip(); x.fillStyle = rgba(base, 0.85); x.fillRect(px - 60, py - 80, c.w + 120, 80); x.fillStyle = rgba(mix(base, P.top, 0.3), 0.85); x.fillRect(px - 60, py - c.w * 0.05, c.w + 120, 40); x.restore();
      }
      // Parallax ridges
      const ridge = (f, base, amp, seed, col, trees, tcol, snowCap, peaks) => {
        const off = cx * f, oy = base - dy * f * 0.9;
        const rr = rng(seed), ph = [rr() * 6, rr() * 6, rr() * 6];
        const h = peaks
          ? X => oy - amp * (0.62 * (1 - Math.abs(Math.sin(X / 330 + ph[0]))) + 0.28 * (1 - Math.abs(Math.sin(X / 128 + ph[1]))) + 0.1 * Math.sin(X / 37 + ph[2]))
          : X => oy + amp * (0.55 * Math.sin(X / 420 + ph[0]) + 0.3 * Math.sin(X / 170 + ph[1]) + 0.15 * Math.sin(X / 61 + ph[2]));
        x.beginPath(); x.moveTo(0, vh); for (let s = 0; s <= vw + 8; s += 8) x.lineTo(s, h(s + off)); x.lineTo(vw, vh); x.closePath(); x.fillStyle = col; x.fill();
        if (snowCap) { x.save(); x.clip(); x.fillStyle = rgba(mix('#ffffff', P.hor, 0.35), winter ? 0.8 : 0.5); x.beginPath(); x.moveTo(0, 0); for (let s = 0; s <= vw + 8; s += 8) x.lineTo(s, oy - amp * 0.58 + 5 * Math.sin((s + off) * 0.07)); x.lineTo(vw, 0); x.fill(); x.restore(); }
        if (trees) { const tr = rng(seed + 1); const first = Math.floor(off / 22) - 1; for (let i = first; i < first + vw / 22 + 3; i++) { const r2 = rng(seed * 1000 + i)(); if (r2 > trees) continue; const X = i * 22 - off; pine(x, X, h(i * 22) + 3, 14 + r2 * 22 / trees, tcol, winter ? rgba('#eef3f8', 0.7) : null); } }
      };
      ridge(0.05, vh * 0.5, vh * 0.22, 11, mix(P.far, P.hor, 0.3), 0, null, winter || this.cfg.season === 'spring', true);
      ridge(0.12, vh * 0.52, vh * 0.12, 23, mix(P.far, P.mid1, 0.5), 0, null, winter, true);
      ridge(0.24, vh * 0.55, 24, 37, veg(P.mid1), 0.5, veg(mix(P.mid1, P.mid2, 0.6)));
      ridge(0.42, vh * 0.62, 20, 53, veg(P.mid2), 0.75, veg(mix(P.mid2, P.near, 0.5)));
      // valley haze
      const hz = x.createLinearGradient(0, vh * 0.55, 0, vh); hz.addColorStop(0, rgba(this.cfg.time === 'night' ? '#1f2c48' : P.hor, 0)); hz.addColorStop(1, rgba(this.cfg.time === 'night' ? '#1f2c48' : P.hor, 0.25)); x.fillStyle = hz; x.fillRect(0, vh * 0.55, vw, vh * 0.45);

      // ---- Play plane (world coordinates) ----
      x.setTransform(S, 0, 0, S, -cx * S, -cy * S);
      const x0 = cx - 60, x1 = cx + vw + 60, bottom = cy + vh + 20;
      // trees on hills behind path
      for (const [tx, th] of this.hillTrees) if (tx > x0 - 40 && tx < x1 + 40) pine(x, tx, terrain(tx) + 2, th, veg(LS.tintS(P.near)), winter ? rgba('#eef3f8', 0.8) : null);
      // valley floor, beck and trees under the viaduct
      if (x1 > VIA.x1 - 200 && x0 < VIA.x2 + 200) {
        for (const [tx, th, r] of this.valleyTrees) if (tx > x0 - 30 && tx < x1 + 30) pine(x, tx, terrain(tx) + 4, th, veg(mix(P.mid2, P.near, 0.5 + r * 0.3)), winter ? rgba('#eef3f8', 0.7) : null);
      }
      // ground
      const grass = veg(mix('#5f7d4c', P.near, 0.15));
      x.beginPath(); x.moveTo(x0, bottom); for (let s = x0; s <= x1; s += 6) x.lineTo(s, terrain(s)); x.lineTo(x1, bottom); x.closePath(); x.fillStyle = LS.tint(winter ? '#dfe7ee' : grass); x.fill();
      x.beginPath(); for (let s = x0; s <= x1; s += 6) { const y = terrain(s) + 14; s === x0 ? x.moveTo(s, y) : x.lineTo(s, y); } x.lineTo(x1, bottom); x.lineTo(x0, bottom); x.fillStyle = LS.tintS(winter ? '#b9c6d2' : mix(grass, '#3b3024', 0.35)); x.fill();
      // grass tufts, flowers, stones (deterministic by x)
      const flowers = this.cfg.season === 'spring' || this.cfg.season === 'summer';
      for (let s = Math.floor(x0 / 11) * 11; s <= x1; s += 11) {
        const hsh = Math.abs(Math.sin(s * 12.9898) * 43758.5453) % 1, gy = terrain(s);
        if (s > VIA.x1 && s < VIA.x2 && gy > 100) { if (hsh < 0.5) continue; }
        x.strokeStyle = LS.tintS(winter ? '#c9d4de' : mix(grass, '#1f2a1c', 0.3 + hsh * 0.3)); x.lineWidth = 1.3;
        x.beginPath(); x.moveTo(s, gy + 1); x.lineTo(s - 2 + hsh * 4, gy - 4 - hsh * 7); x.moveTo(s + 3, gy + 1); x.lineTo(s + 4 + hsh * 2, gy - 3 - hsh * 5); x.stroke();
        if (flowers && hsh > 0.86) { x.fillStyle = LS.tint(['#f3ecdf', '#f2c230', '#d8566a', '#b48fd8'][Math.floor(hsh * 97) % 4]); x.beginPath(); x.arc(s + 1, gy - 7 - hsh * 4, 1.8, 0, 7); x.fill(); }
        if (hsh < 0.04) { x.fillStyle = LS.tintS('#8d877c'); x.beginPath(); x.ellipse(s, gy + 20 + hsh * 300, 6, 3.5, 0, 0, 7); x.fill(); }
      }
      const gg = x.createLinearGradient(0, cy + vh * 0.62, 0, cy + vh); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, rgba(P.fg, 0.55)); x.fillStyle = gg; x.fillRect(x0, cy + vh * 0.62, x1 - x0, vh * 0.4);
      this.drawFrontage(x, x0, x1, grass, winter);
      // Kestrel Beck
      if (x1 > 2560 && x0 < 3000) { x.fillStyle = LS.tint(this.cfg.time === 'night' ? '#2b4a6a' : '#6fa8c8'); x.beginPath(); x.ellipse(2780, terrain(2780) + 4, 170, 7, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 6; i++) x.fillRect(2650 + i * 45 + Math.sin(t + i) * 8, terrain(2780) + 3, 18, 1.2); }
      // footpath / trackbed
      x.strokeStyle = LS.tint(mix('#b9a98a', grass, 0.25)); x.lineWidth = 5; x.beginPath(); let started = false;
      for (let s = x0; s <= x1; s += 6) { if (s >= VIA.x1 && s <= VIA.x2) { started = false; continue; } const y = terrain(s) + 2; if (!started) { x.moveTo(s, y); started = true; } else x.lineTo(s, y); } x.stroke();

      this.drawViaduct(x, t, x0, x1, veg);
      this.drawDecor(x, t, x0, x1);
      // entities + player, sorted
      const list = this.visible().filter(e => e.kind === 'npc' && e.x > x0 - 40 && e.x < x1 + 40);
      for (const e of list) this.drawNPC(x, e, t);
      this.drawPlayer(x);
      this.drawMarkers(x, t);
      // foreground framing silhouettes
      x.setTransform(S, 0, 0, S, 0, 0);
      for (const [fx, h, big] of this.fg) { const sx = fx - cx * 1.3; if (sx < -200 || sx > vw + 200) continue; pine(x, sx, vh + 40 - dy * 0.3, h * (big ? 1.5 : 1), rgba(P.fg, 0.94), winter ? rgba('#dfe7ef', 0.35) : null); }
      this.drawWeather(x, t);
      if (this.cfg.time === 'night' || this.cfg.time === 'dusk') this.drawNight(x, t);
    }

    // Near-field detail below the walking line: road through town, dry-stone walls, hedgerows, ballast
    drawFrontage(x, x0, x1, grass, winter) {
      const T = LS.tint, TS = LS.tintS, hash = n => Math.abs(Math.sin(n * 91.345) * 47453.21) % 1;
      const a = Math.max(0, x0), b = Math.min(W_WORLD, x1);
      // Town street
      if (a < 1500) {
        const e = Math.min(b, 1500);
        x.fillStyle = T('#b8b0a2'); x.fillRect(a, 203, e - a, 8);
        x.fillStyle = T('#8c857a'); x.fillRect(a, 210, e - a, 2);
        x.fillStyle = T(winter ? '#8f969e' : '#474a51'); x.fillRect(a, 212, e - a, 44);
        x.fillStyle = T('#e9e2d4'); for (let s = Math.floor(a / 60) * 60; s < e; s += 60) x.fillRect(s, 233, 28, 2);
        x.fillStyle = T('#8c857a'); x.fillRect(a, 256, e - a, 3);
        x.fillStyle = T('#b8b0a2'); x.fillRect(a, 259, e - a, 6);
        this.stoneWall(x, a, e, 292, winter);
        this.hedge(x, a, e, 340, winter);
      }
      // Hill path: dry-stone wall following the slope
      if (b > 1480 && a < 1960) { for (let s = Math.max(a, 1480); s < Math.min(b, 1960); s += 16) this.stoneWall(x, s, s + 16, terrain(s) + 26, winter); }
      // Site compound and junction: ballast, fence line, hedgerow
      if (b > 3660) {
        const s0 = Math.max(a, 3660);
        for (let s = Math.floor(s0 / 5) * 5; s < b; s += 5) { const h = hash(s); x.fillStyle = TS(h < 0.5 ? '#8d877c' : '#a39c90'); x.fillRect(s, terrain(s) + 4 + h * 10, 3 + h * 2, 2); }
        x.strokeStyle = T('#6b6f74'); x.lineWidth = 1.2;
        for (let s = Math.floor(s0 / 40) * 40; s < b; s += 40) { const y = terrain(s) + 60; x.fillStyle = T('#6b5a48'); x.fillRect(s, y - 26, 3, 26); }
        x.beginPath(); for (const k of [0, 9, 18]) { x.moveTo(s0, terrain(s0) + 60 - 22 + k); x.lineTo(b, terrain(b) + 60 - 22 + k); } x.stroke();
        this.hedge(x, s0, b, 130, winter);
      }
      // Far left field edge
      if (a < 40) this.hedge(x, a, 40, 300, winter);
    }
    stoneWall(x, a, b, y, winter) {
      const T = LS.tint, TS = LS.tintS;
      x.fillStyle = TS('#8d877c'); x.fillRect(a, y - 18, b - a, 20);
      for (let s = Math.floor(a / 12) * 12; s < b; s += 12) for (let r = 0; r < 3; r++) {
        const h = Math.abs(Math.sin((s + r * 7) * 12.9898) * 43758.5453) % 1;
        x.fillStyle = T(h < 0.33 ? '#a39c90' : h < 0.66 ? '#958f84' : '#b0a99c');
        x.beginPath(); x.roundRect ? x.roundRect(s + (r % 2) * 5, y - 18 + r * 6.5, 10, 6, 2.5) : x.rect(s, y - 18 + r * 6.5, 10, 6); x.fill();
      }
      x.fillStyle = T(winter ? '#eef3f8' : '#6f8a5a'); x.fillRect(a, y - 21, b - a, 3);
    }
    hedge(x, a, b, y, winter) {
      const col = LS.tintS(mix('#3f5f3a', SEASON[this.cfg.season].veg, SEASON[this.cfg.season].mix));
      for (let s = Math.floor(a / 14) * 14 - 14; s < b + 14; s += 14) {
        const h = Math.abs(Math.sin(s * 3.1) * 9187.3) % 1, r = 12 + h * 10;
        x.fillStyle = col; x.beginPath(); x.arc(s, y - r * 0.6, r, 0, 7); x.fill();
        if (winter) { x.fillStyle = 'rgba(238,243,248,0.8)'; x.beginPath(); x.ellipse(s, y - r * 1.35, r * 0.7, 3.5, 0, 0, 7); x.fill(); }
      }
      x.fillStyle = col; x.fillRect(a - 14, y - 6, b - a + 28, 400);
    }
    drawViaduct(x, t, x0, x1, veg) {
      if (x1 < VIA.x1 - 60 || x0 > VIA.x2 + 60) return;
      const P = this.P, B = this.cfg.build, sp = VIA.span, pw = 34, r = (sp - pw) / 2, crown = 24, cyA = crown + r;
      const stone = LS.tint(P.stone), stoneS = LS.tintS(P.stone), stoneL = mix(stone, '#ffffff', 0.12);
      // scaffolding behind piers
      for (const k of this.scaffold) { const px = VIA.x1 + k * sp; this.drawScaffold(x, px - 40, px + 40, -44, terrain(px), k === 4); }
      for (let k = 0; k <= VIA.n; k++) { const px = VIA.x1 + k * sp; const gy = terrain(px) + 6; x.fillStyle = stone; x.fillRect(px - pw / 2, cyA - 4, pw, gy - cyA + 4); x.fillStyle = stoneS; x.fillRect(px + 2, cyA, pw / 2 - 2, gy - cyA); }
      for (let k = 0; k < VIA.n; k++) {
        const L = VIA.x1 + k * sp, R = L + sp, c = L + sp / 2;
        x.beginPath(); x.moveTo(L - 1, 0); x.lineTo(R + 1, 0); x.lineTo(R + 1, cyA); x.lineTo(c + r, cyA); x.arc(c, cyA, r, 0, Math.PI, true); x.lineTo(L - 1, cyA); x.closePath(); x.fillStyle = stone; x.fill();
        x.strokeStyle = stoneL; x.lineWidth = 4; x.beginPath(); x.arc(c, cyA, r + 2, Math.PI, 0); x.stroke();
        x.strokeStyle = rgba(stoneS, 0.6); x.lineWidth = 5; x.beginPath(); x.arc(c, cyA, r - 2, Math.PI, 0); x.stroke();
      }
      // courses
      x.fillStyle = rgba(stoneS, 0.16); for (let y = 6; y < 270; y += 9) x.fillRect(VIA.x1 - pw / 2, y, VIA.x2 - VIA.x1 + pw, 1);
      // cornice + parapet (behind the walkway)
      x.fillStyle = stoneS; x.fillRect(VIA.x1 - 20, 12, VIA.x2 - VIA.x1 + 40, 5);
      x.fillStyle = stoneL; x.fillRect(VIA.x1 - 20, -14, VIA.x2 - VIA.x1 + 40, 14);
      x.fillStyle = stoneS; x.fillRect(VIA.x1 - 20, -2, VIA.x2 - VIA.x1 + 40, 3);
      if (B <= 1) { // derelict: parapet gap, ivy, stains
        x.clearRect && null; x.fillStyle = mix(LS.tint(this.P.mid2), stoneS, 0.2); x.fillRect(VIA.x1 + sp * 3.2, -14, 60, 12);
        for (const [ix, ih, iw] of this.ivy) { x.fillStyle = veg(LS.tintS('#3f5f3a')); for (let k = 0; k < 14; k++) { const u = (k * 37 % 100) / 100, d = Math.pow((k * 53 % 100) / 100, 2) * ih; x.beginPath(); x.arc(ix + u * iw, -10 + d, 3 - d / ih * 1.5, 0, 7); x.fill(); } }
        x.fillStyle = rgba('#1c1a18', 0.18); for (let k = 0; k < VIA.n; k += 2) x.fillRect(VIA.x1 + k * sp + sp * 0.75, 18, 10, 60);
      }
      if (B === 1 || B === 2) { x.strokeStyle = '#f36b21'; x.lineWidth = 3; const px = PIER4; x.beginPath(); x.moveTo(px - 8, 120); x.lineTo(px + 8, 136); x.moveTo(px + 8, 120); x.lineTo(px - 8, 136); x.stroke(); }
      // rails on the deck (drawn behind the player)
      if (B >= 4) this.drawRails(x, VIA.x1 - 180, VIA.x2 + 40);
      // branch train
      if (this.cfg.train) { const cyc = 34, u = (t % cyc) / cyc, pos = u < 0.5 ? ease(u * 2) : 1 - ease((u - 0.5) * 2); const tx = 1840 + pos * (4300 - 1840); this.drawTrain(x, tx - 90, -2, u < 0.5 ? 1 : -1, '#1f6f6c'); }
    }
    drawRails(x, a, b) { x.fillStyle = LS.tintS('#6b5a48'); for (let s = a; s < b; s += 9) x.fillRect(s, -4, 5, 3); x.fillStyle = LS.tint('#a9adb2'); x.fillRect(a, -6, b - a, 1.6); }
    drawScaffold(x, l, r, top, bot, sheet) {
      x.strokeStyle = rgba(LS.tint('#d7d0c0'), 0.9); x.lineWidth = 1.4;
      for (let xx = l; xx <= r; xx += 20) { x.beginPath(); x.moveTo(xx, top); x.lineTo(xx, bot); x.stroke(); }
      for (let yy = top; yy <= bot; yy += 24) { x.beginPath(); x.moveTo(l, yy); x.lineTo(r, yy); x.stroke(); }
      x.beginPath(); for (let yy = top; yy < bot - 24; yy += 48) { x.moveTo(l, yy); x.lineTo(r, yy + 48); } x.stroke();
      if (sheet) { x.fillStyle = rgba(LS.tint('#2d6a8a'), 0.55); x.fillRect(l, top + 60, r - l, 90); }
    }
    drawTrain(x, px, py, dir, livery) {
      const P = this.P, body = LS.tint(livery), win = P.lit > 0.3 ? '#ffd88a' : LS.tint('#bfe3ec');
      for (let c = 0; c < 3; c++) { const cx = px + c * 62; x.fillStyle = body; x.beginPath(); x.roundRect ? x.roundRect(cx, py - 34, 60, 30, 6) : x.rect(cx, py - 34, 60, 30); x.fill();
        x.fillStyle = LS.tint('#f2c230'); x.fillRect(cx, py - 12, 60, 3); x.fillStyle = win; for (let k = 0; k < 5; k++) x.fillRect(cx + 5 + k * 11, py - 28, 8, 8); x.fillStyle = LS.tint('#222'); x.fillRect(cx + 8, py - 4, 10, 4); x.fillRect(cx + 42, py - 4, 10, 4); }
      const nose = dir > 0 ? px + 186 : px - 4; x.fillStyle = LS.tint('#f2c230'); x.fillRect(nose, py - 34, 4, 30);
      if (P.lit > 0.3) { const hg = x.createRadialGradient(nose, py - 18, 0, nose, py - 18, 80); hg.addColorStop(0, 'rgba(255,230,160,0.5)'); hg.addColorStop(1, 'rgba(255,230,160,0)'); x.fillStyle = hg; x.fillRect(nose - 80, py - 98, 160, 160); }
    }
    drawDecor(x, t, x0, x1) {
      const B = this.cfg.build, lit = this.P.lit, bld = LS.bld, at = (px, fn, k) => { if (px > x0 - 360 && px < x1 + 60) { k = k || 1.2; x.save(); x.translate(px, terrain(px + 40)); x.scale(k, k); x.translate(-px, 0); fn(); x.restore(); } };
      const ch = this.chapter || 0;
      // Town
      at(20, () => bld.school(x, 20, lit)); at(335, () => bld.cottage(x, 335, 1, lit)); at(452, () => bld.cottage(x, 452, 2, lit));
      at(578, () => bld.bakery(x, 578, lit, ch >= 2)); at(748, () => bld.busstop(x, 748));
      at(810, () => bld.pub(x, 810, lit)); at(1020, () => bld.hall(x, 1020, lit)); at(1236, () => bld.noticeboard(x, 1236));
      at(1290, () => bld.church(x, 1290, lit));
      for (const lx of [322, 790, 1228]) at(lx, () => bld.lamp(x, lx, lit), 1.1);
      if (ch >= 6) at(700, () => { for (let i = 0; i < 24; i++) { x.fillStyle = LS.tint(['#d8643a', '#f2c230', '#2c7c77', '#f3ecdf'][i % 4]); const bx = 300 + i * 40; x.beginPath(); x.moveTo(bx, -120 + Math.sin(i) * 3); x.lineTo(bx + 16, -120); x.lineTo(bx + 8, -110); x.fill(); } });
      // Station (on the plateau)
      if (x1 > 1700 && x0 < 2020) { x.save(); x.translate(1772, 0); x.scale(1.15, 1.15); x.translate(-1772, 0); bld.station(x, 1772, B, lit, ch >= 6); x.restore(); }
      if (B >= 4) this.drawRails(x, 1785, 1960);
      else { x.fillStyle = LS.tintS('#5a4a3a'); x.fillRect(1785, -3, 175, 2); }
      // Viaduct ends: fencing while closed, lamps once open
      if (B <= 2) { at(1962, () => bld.fence(x, 1962, 60, true)); }
      if (B >= 4) for (let k = 0; k <= VIA.n; k += 2) { const lx = VIA.x1 + k * VIA.span; if (lx > x0 && lx < x1) bld.lamp(x, lx, lit); }
      if (B === 1 || B === 2) { for (let k = 1; k < VIA.n; k += 2) { const fx = VIA.x1 + k * VIA.span + 40; if (fx > x0 && fx < x1) bld.flag(x, fx); } if (PIER4 > x0 && PIER4 < x1) bld.tripod(x, PIER4 + 30); }
      if (B === 3) { for (const sx of [2300, 3150]) if (sx > x0 - 100 && sx < x1) bld.materials(x, sx, 3); }
      // Site compound
      if (B >= 3 && x1 > 3560 && x0 < 4100) this.drawCrane(x, 3712, t);
      at(3760, () => bld.cabin(x, 3760, lit), 1.3); at(3990, () => bld.welfare(x, 3990, lit), 1.3);
      at(4150, () => bld.materials(x, 4150, B)); at(4480, () => bld.van(x, 4480));
      if (B >= 1) at(4300, () => bld.fence(x, 4300, 150, false));
      // Junction and main line
      if (x1 > 4380) {
        x.fillStyle = LS.tintS('#6b5a48'); x.fillRect(4380, -10, W_WORLD - 4380, 3);
        x.fillStyle = LS.tint('#a9adb2'); x.fillRect(4380, -12, W_WORLD - 4380, 1.4);
        if (B < 4) { x.fillStyle = LS.tintS('#5a4a3a'); x.fillRect(3660, -3, 720, 2); } else this.drawRails(x, 3660, 4400);
        if (this.mainTrain.x > -1000) this.drawTrain(x, this.mainTrain.x, -8, -1, '#6a2f6e');
        x.save(); x.translate(4690, 0); x.scale(1.3, 1.3); x.translate(-4690, 0); bld.signalbox(x, 4690); x.restore(); bld.signal(x, 4600, this.mainTrain.x > -1000 ? 'r' : 'g'); bld.signal(x, 5050, 'g'); bld.signal(x, 5290, 'r');
        x.fillStyle = LS.tint('#8a3b2e'); x.fillRect(W_WORLD - 30, -24, 8, 24); x.fillRect(W_WORLD - 40, -20, 28, 4);
      }
    }
    drawCrane(x, px, t) {
      const col = LS.tint('#e7b53a'), top = -330, a = Math.sin(t * 0.15) * 0.35;
      x.strokeStyle = col; x.lineWidth = 4; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, top); x.stroke();
      x.lineWidth = 1.2; for (let y = top; y < 0; y += 14) { x.beginPath(); x.moveTo(px - 5, y); x.lineTo(px + 5, y + 14); x.stroke(); }
      const jl = 360, jx = px - jl * Math.cos(a), jb = px + 90 * Math.cos(a);
      x.lineWidth = 4; x.beginPath(); x.moveTo(jb, top); x.lineTo(jx, top + 4); x.stroke();
      x.fillStyle = LS.tint('#6b6f74'); x.fillRect(jb - 20, top - 4, 24, 16);
      const hx = px - jl * 0.72 * Math.cos(a), hy = top + 150 + Math.sin(t * 0.6) * 10;
      x.lineWidth = 1; x.beginPath(); x.moveTo(hx, top + 3); x.lineTo(hx, hy); x.stroke();
      x.fillStyle = LS.tint('#8a6a3a'); x.fillRect(hx - 22, hy, 44, 8);
      if (this.P.lit > 0.4) { x.fillStyle = `rgba(255,60,50,${0.5 + 0.5 * Math.sin(t * 3)})`; x.beginPath(); x.arc(px, top - 5, 3, 0, 7); x.fill(); }
    }
    drawNPC(x, e, t) {
      const gy = this.groundAt(e.x), face = e.dirFace || e.facing || 1;
      LS.drawPerson(x, e.look, e.x, gy, face, e.phase || 0, e.moving, { work: e.work, wave: e.wave });
    }
    drawPlayer(x) {
      const p = this.player; if (!p.look) return;
      LS.drawPerson(x, p.look, p.x, this.groundAt(p.x), p.dir, p.phase, p.moving, { lamp: this.cfg.time === 'night' });
    }
    drawMarkers(x, t) {
      const f = this.focus;
      for (const e of this.visible()) {
        const gy = this.groundAt(e.x), top = gy - (e.kind === 'npc' ? 96 : (e.h || 70)) + Math.sin(t * 3 + e.x) * 3;
        if (e.marker === 'call') { x.fillStyle = '#d8643a'; x.beginPath(); x.arc(e.x, top, 9, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '800 13px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('!', e.x, top + 5); }
        else if (e.marker === 'task') { x.fillStyle = '#e7b04a'; x.beginPath(); x.moveTo(e.x, top - 8); x.lineTo(e.x + 7, top); x.lineTo(e.x, top + 8); x.lineTo(e.x - 7, top); x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.stroke(); }
        else if (e.marker === 'memo') { for (let k = 0; k < 4; k++) { const a = t * 2 + k * 1.57, rr = 8 + Math.sin(t * 3 + k) * 2; x.fillStyle = `rgba(255,236,170,${0.6 + 0.4 * Math.sin(t * 4 + k)})`; x.beginPath(); x.arc(e.x + Math.cos(a) * rr, gy - 22 + Math.sin(a) * rr, 1.8, 0, 7); x.fill(); } x.fillStyle = '#f7f1e7'; x.save(); x.translate(e.x, gy - 22); x.rotate(Math.sin(t) * 0.2); x.fillRect(-5, -6, 10, 12); x.fillStyle = '#b9a98a'; x.fillRect(-3, -3, 6, 1); x.fillRect(-3, 0, 6, 1); x.restore(); }
      }
      if (f && !this.paused) {
        const gy = this.groundAt(f.x), y = gy - (f.kind === 'npc' ? 118 : (f.h || 70) + 22);
        const label = (this.touch ? '' : 'E  ') + f.prompt;
        x.font = '700 11px Inter, sans-serif'; const w = x.measureText(label).width + 20;
        x.fillStyle = 'rgba(20,18,28,0.82)'; x.beginPath(); x.roundRect ? x.roundRect(f.x - w / 2, y - 12, w, 22, 11) : x.rect(f.x - w / 2, y - 12, w, 22); x.fill();
        x.fillStyle = '#f7f1e7'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, f.x, y); x.textBaseline = 'alphabetic';
      }
    }
    drawWeather(x, t) {
      const w = this.cfg.weather, vw = this.vw, vh = this.vh; if (w === 'clear') return;
      while (this.particles.length < (w === 'rain' ? 240 : 170)) this.particles.push({ x: Math.random() * vw, y: Math.random() * vh, z: 0.4 + Math.random() * 0.8, ph: Math.random() * 6 });
      if (w === 'rain') { x.strokeStyle = 'rgba(200,215,230,0.35)'; x.lineWidth = 1; x.beginPath(); for (const p of this.particles) { if (!this.reduced) { p.y += 12 * p.z; p.x -= 2.5 * p.z; } if (p.y > vh) { p.y = -20; p.x = Math.random() * vw * 1.2; } x.moveTo(p.x, p.y); x.lineTo(p.x - 3 * p.z, p.y + 13 * p.z); } x.stroke(); x.fillStyle = 'rgba(40,50,60,0.12)'; x.fillRect(0, 0, vw, vh); }
      else { x.fillStyle = 'rgba(245,248,255,0.85)'; for (const p of this.particles) { if (!this.reduced) { p.y += 0.8 * p.z; p.x += Math.sin(t + p.ph) * 0.4; } if (p.y > vh) { p.y = -5; p.x = Math.random() * vw; } x.beginPath(); x.arc(p.x, p.y, 1.1 * p.z + 0.4, 0, 7); x.fill(); } }
    }
    drawNight(x, t) {
      // Darkness with pools of light (player lantern, lamps, lit windows are pre-glowed)
      if (!this.dark) this.dark = document.createElement('canvas');
      const d = this.dark; if (d.width !== this.cv.width || d.height !== this.cv.height) { d.width = this.cv.width; d.height = this.cv.height; }
      const g = d.getContext('2d'), S = this.S * this.dpr, night = this.cfg.time === 'night';
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, d.width, d.height);
      g.fillStyle = night ? 'rgba(4,7,18,0.5)' : 'rgba(20,10,30,0.18)'; g.fillRect(0, 0, d.width, d.height);
      g.globalCompositeOperation = 'destination-out';
      const hole = (wx, wy, r) => { const sx = (wx - this.camX) * S, sy = (wy - this.camY) * S, R = r * S; const rg = g.createRadialGradient(sx, sy, 0, sx, sy, R); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(sx - R, sy - R, R * 2, R * 2); };
      const p = this.player; hole(p.x, this.groundAt(p.x) - 30, 140);
      if (this.room === 'outside') { for (const lx of [260, 700, 1130]) hole(lx, terrain(lx) - 58, 110); if (this.cfg.build >= 4) for (let k = 0; k <= VIA.n; k += 2) hole(VIA.x1 + k * VIA.span, -58, 100); hole(3830, -40, 120); hole(4720, -60, 120); hole(1880, -40, 110); }
      x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(d, 0, 0);
    }

    /* ----------------------------- ROOMS ----------------------------- */
    drawRoom(x, t) {
      const P = this.P, vw = this.vw, vh = this.vh, S = this.S * this.dpr, R = ROOMS[this.room];
      x.fillStyle = '#15121c'; x.fillRect(0, 0, vw, vh);
      x.setTransform(S, 0, 0, S, -this.camX * S, -this.camY * S);
      const H = 260, lit = P.lit, warm = c => mix(c, '#2a1d2a', 0.08 + lit * 0.18);
      if (this.room === 'cabin') {
        x.fillStyle = warm('#c9d2cf'); x.fillRect(-200, -700, R.w + 400, 700); x.fillStyle = warm('#b3bdb9'); x.fillRect(-200, -700, 200, 700); x.fillRect(R.w, -700, 200, 700);
        for (let i = 0; i < R.w; i += 60) { x.fillStyle = warm('#b9c3c0'); x.fillRect(i, -H, 2, H); }
        x.fillStyle = warm('#7c8a86'); x.fillRect(-200, -H, R.w + 400, 10);
        x.fillStyle = warm('#6e6358'); x.fillRect(-200, 0, R.w + 400, 200); x.fillStyle = warm('#5f554b'); for (let i = 0; i < R.w; i += 40) x.fillRect(i, 0, 1, 60);
        this.window(x, 110, -200, 150, 90);
        // desk + laptop
        x.fillStyle = warm('#8a6a4a'); x.fillRect(300, -58, 130, 8); x.fillRect(306, -50, 6, 50); x.fillRect(418, -50, 6, 50);
        x.fillStyle = warm('#2b2f36'); x.fillRect(340, -80, 40, 24); x.fillStyle = `rgba(150,210,230,${0.6 + 0.2 * Math.sin(t * 2)})`; x.fillRect(343, -77, 34, 18);
        x.fillStyle = warm('#f3ecdf'); x.fillRect(390, -62, 26, 4); x.fillRect(393, -66, 22, 4);
        // planning wall
        x.fillStyle = warm('#f3ecdf'); x.fillRect(450, -210, 150, 110); x.strokeStyle = warm('#9aa3a1'); x.lineWidth = 2; x.strokeRect(450, -210, 150, 110);
        const prog = (this.chapter || 0) / 8;
        ['#7cc3e6', '#e9c46a', '#ef8a7a', '#9fb6f5', '#9ad3a8'].forEach((c, i) => { x.fillStyle = warm('#e2dccf'); x.fillRect(462, -196 + i * 18, 126, 8); x.fillStyle = warm(c); x.fillRect(462 + i * 14, -196 + i * 18, Math.max(6, 126 * prog - i * 14), 8); });
        x.fillStyle = '#d8643a'; x.fillRect(462 + 126 * prog, -202, 2, 96);
        for (const [sx, sy, c] of [[610, -200, '#f2d54a'], [612, -176, '#9ad3a8'], [610, -152, '#ef8a7a']]) { x.fillStyle = warm(c); x.fillRect(sx, sy, 20, 18); }
        // kettle table
        x.fillStyle = warm('#8a6a4a'); x.fillRect(30, -44, 60, 6); x.fillRect(34, -38, 4, 38); x.fillRect(82, -38, 4, 38);
        x.fillStyle = warm('#e8e6e0'); x.beginPath(); x.roundRect ? x.roundRect(46, -64, 18, 20, 4) : x.rect(46, -64, 18, 20); x.fill(); x.fillStyle = warm('#d8643a'); x.fillRect(70, -52, 8, 8);
        // Moira's armchair
        x.fillStyle = warm('#5e7a68'); x.beginPath(); x.roundRect ? x.roundRect(160, -56, 60, 46, 8) : x.rect(160, -56, 60, 46); x.fill(); x.fillRect(156, -30, 68, 30);
        // door
        x.fillStyle = warm('#43565c'); x.fillRect(R.door - 18, -120, 36, 120); x.fillStyle = '#d9b56a'; x.fillRect(R.door + 10, -62, 4, 4);
        x.fillStyle = `rgba(255,248,220,${0.1})`; x.fillRect(-200, -700, R.w + 400, 700); // fluorescent wash
      } else {
        x.fillStyle = warm('#e8dcc6'); x.fillRect(-200, -700, R.w + 400, 700);
        x.fillStyle = warm('#8a6a4a'); x.fillRect(0, -110, R.w, 6); for (let i = 0; i < R.w; i += 16) { x.fillStyle = warm(i % 32 ? '#b58a5a' : '#a67c50'); x.fillRect(i, -104, 16, 104); }
        x.fillStyle = warm('#9a6e44'); x.fillRect(-200, 0, R.w + 400, 200); for (let i = 0; i < R.w; i += 26) { x.fillStyle = warm('#8a6038'); x.fillRect(i, 0, 1, 60); }
        for (const wx of [150, 380, 610]) this.window(x, wx, -250, 84, 118, true);
        // stage
        x.fillStyle = warm('#7a2e3b'); x.fillRect(720, -270, 220, 230); x.fillStyle = warm('#5a1e2b'); for (let i = 720; i < 940; i += 22) x.fillRect(i, -270, 8, 230);
        x.fillStyle = warm('#6b4a30'); x.fillRect(700, -40, 240, 40);
        x.fillStyle = warm('#f3ecdf'); x.fillRect(250, -292, 400, 24); x.fillStyle = warm('#3a3431'); x.font = '700 11px Inter, sans-serif'; x.textAlign = 'center'; x.fillText(this.hallBanner || 'KESTREL VALE LINE · COMMUNITY MEETING', 450, -276);
        // chairs
        for (let i = 0; i < 9; i++) { const cx = 200 + i * 52; x.fillStyle = warm('#5b6e73'); x.fillRect(cx, -34, 26, 4); x.fillRect(cx + 22, -56, 4, 26); x.fillRect(cx + 2, -30, 3, 30); x.fillRect(cx + 21, -30, 3, 30); }
        // tea urn
        x.fillStyle = warm('#8a6a4a'); x.fillRect(90, -46, 70, 6); x.fillRect(94, -40, 4, 40); x.fillRect(152, -40, 4, 40); x.fillStyle = warm('#c0c4c8'); x.fillRect(110, -80, 24, 34);
        x.fillStyle = warm('#3f2f28'); x.fillRect(R.door - 20, -130, 40, 130);
        if ((this.chapter || 0) >= 6) for (let i = 0; i < 30; i++) { x.fillStyle = warm(['#d8643a', '#f2c230', '#2c7c77', '#f3ecdf'][i % 4]); x.beginPath(); x.moveTo(i * 32, -250); x.lineTo(i * 32 + 16, -250); x.lineTo(i * 32 + 8, -238); x.fill(); }
      }
      const list = this.visible().filter(e => e.kind === 'npc');
      for (const e of list) this.drawNPC(x, e, t);
      this.drawPlayer(x); this.drawMarkers(x, t);
      x.setTransform(S, 0, 0, S, 0, 0);
      const vg = x.createRadialGradient(vw / 2, vh * 0.6, vh * 0.3, vw / 2, vh * 0.6, vw * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); x.fillStyle = vg; x.fillRect(0, 0, vw, vh);
    }
    window(x, px, py, w, h, arch) {
      const P = this.P; x.save(); x.beginPath(); if (arch) { x.moveTo(px, py + h); x.lineTo(px, py + w / 2); x.arc(px + w / 2, py + w / 2, w / 2, Math.PI, 0); x.lineTo(px + w, py + h); } else x.rect(px, py, w, h); x.closePath(); x.clip();
      const g = x.createLinearGradient(0, py, 0, py + h); g.addColorStop(0, P.top); g.addColorStop(1, P.hor); x.fillStyle = g; x.fillRect(px, py, w, h);
      x.fillStyle = P.mid1; x.beginPath(); x.moveTo(px, py + h * 0.75); for (let s = 0; s <= w; s += 6) x.lineTo(px + s, py + h * (0.62 + 0.08 * Math.sin(s / 20))); x.lineTo(px + w, py + h); x.lineTo(px, py + h); x.fill();
      if (this.cfg.weather === 'snow') { x.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 20; i++) x.fillRect(px + (i * 37 + performance.now() / 40) % w, py + (i * 53 + performance.now() / 25) % h, 1.5, 1.5); }
      x.restore(); x.strokeStyle = mix('#f3ecdf', P.near, 0.3); x.lineWidth = 4; x.strokeRect(px, py, w, h); x.lineWidth = 2; x.beginPath(); x.moveTo(px + w / 2, py); x.lineTo(px + w / 2, py + h); x.moveTo(px, py + h / 2); x.lineTo(px + w, py + h / 2); x.stroke();
    }

    /* ----------------------------- SCREEN OVERLAYS ----------------------------- */
    drawOverlays(x, t) {
      const S = this.S * this.dpr, vw = this.vw, vh = this.vh;
      x.setTransform(S, 0, 0, S, 0, 0);
      // objective pointer when the target is off-screen or in another room
      const o = this.objective;
      if (o && !this.paused) {
        let tx = null, label = o.label;
        if (o.room === this.room) tx = o.x;
        else if (this.room === 'outside') { tx = DOORS[o.room]; label = o.label; }
        else { tx = ROOMS[this.room].door; label = 'Exit'; }
        const sx = tx - this.camX;
        if (sx < 30 || sx > vw - 30) {
          const left = sx < 30, ax = left ? 26 : vw - 26, ay = vh * 0.46;
          x.fillStyle = 'rgba(20,18,28,0.75)'; x.beginPath(); x.arc(ax, ay, 16, 0, 7); x.fill();
          x.fillStyle = '#e7b04a'; x.beginPath(); if (left) { x.moveTo(ax - 7, ay); x.lineTo(ax + 4, ay - 7); x.lineTo(ax + 4, ay + 7); } else { x.moveTo(ax + 7, ay); x.lineTo(ax - 4, ay - 7); x.lineTo(ax - 4, ay + 7); } x.fill();
          x.font = '700 10px Inter, sans-serif'; x.textAlign = left ? 'left' : 'right'; x.fillStyle = '#f7f1e7'; x.fillText(label, left ? ax + 22 : ax - 22, ay + 4);
        }
      }
      // vignette + grain
      const vg = x.createRadialGradient(vw / 2, vh * 0.45, Math.min(vw, vh) * 0.35, vw / 2, vh * 0.5, Math.max(vw, vh) * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,6,14,0.45)'); x.fillStyle = vg; x.fillRect(0, 0, vw, vh);
      if (!this.reduced) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 0.55; x.fillStyle = x.createPattern(this.grain, 'repeat'); x.save(); x.translate((t * 97) % 160, (t * 61) % 160); x.fillRect(-160, -160, this.cv.width + 320, this.cv.height + 320); x.restore(); x.globalAlpha = 1; }
      if (this.fade > 0) { x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = `rgba(8,6,14,${this.fade})`; x.fillRect(0, 0, this.cv.width, this.cv.height); }
    }
    snapshot(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const s = Math.max(w / this.cv.width, h / this.cv.height), dw = this.cv.width * s, dh = this.cv.height * s; x.drawImage(this.cv, (w - dw) / 2, (h - dh) * 0.5, dw, dh); return c; }
  }
  LS.World = World;
  LS.WORLD = { W: W_WORLD, VIA, PIER4, ROOMS, DOORS, terrain, walkY };
})();
