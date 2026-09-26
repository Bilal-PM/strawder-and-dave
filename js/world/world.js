/* LINESIDE — the open world (top-down 3/4 view, Canvas 2D).
 *
 * Kestrel Vale, free to roam in any direction:
 *   Harrowby (SW) · Station Road → terminus station · the valley of Kestrel Beck (walk down, ford,
 *   packhorse bridge, foot of Pier 4) · the viaduct · site compound (E plateau) · trackbed → Kestrel
 *   Junction and the live main line · woods, fell and Kestrel Crag (N) · Moira's cottage · farmland (S).
 *
 * The build obeys engineering logic. The viaduct deck is only walkable while it's a construction site
 * with edge protection (build 3–4) AND you're wearing PPE; before that it's unassessed and fenced, after
 * that it's a live railway. Once trains run, the trackbed is fenced and you cross at the footbridge.
 */
window.LS = window.LS || {};
(function () {
  const { PAL, SEASON, mix, rgba, rng, pine } = LS.art;
  const MAP = { W: 3450, H: 2300 };
  const VIA = { x1: 1450, x2: 2150, yN: 872, yS: 922, H: 210, n: 11 }; VIA.span = (VIA.x2 - VIA.x1) / VIA.n;
  const PIER4 = { x: VIA.x1 + 4 * VIA.span, y: VIA.yS + VIA.H + 22 };
  const riverX = y => 1800 + 46 * Math.sin(y / 260) + 18 * Math.sin(y / 97);
  const CROSS = { ford: [1450, 1492], bridge: [1985, 2032], temp: [1232, 1272] };
  const TRACK = { y1: 880, y2: 922, x1: 1300, x2: 3250 }, FOOTBRIDGE = [2585, 2625];
  const LIGHT = { dawn: 0.14, day: 0.04, dusk: 0.2, overcast: 0.12, night: 0.4 };
  const GRADE = { dawn: ['#ffcfae', 0.32], day: null, dusk: ['#e79a8f', 0.34], overcast: ['#c3cad0', 0.3], night: ['#3b4a86', 0.62] };

  // Buildings: facade function (from sprites.js), x, front y, width, depth, scale
  const BUILDINGS = [
    { id: 'school', f: 'school', x: 150, y: 1290, w: 154, d: 70, k: 1.1 },
    { id: 'cot1', f: 'cottage', v: 1, x: 380, y: 1290, w: 99, d: 60, k: 1.1 },
    { id: 'cot2', f: 'cottage', v: 2, x: 500, y: 1290, w: 99, d: 60, k: 1.1 },
    { id: 'bakery', f: 'bakery', x: 625, y: 1290, w: 132, d: 64, k: 1.1 },
    { id: 'pub', f: 'pub', x: 790, y: 1290, w: 165, d: 70, k: 1.1 },
    { id: 'hall', f: 'hall', x: 990, y: 1290, w: 187, d: 80, k: 1.1, door: 1083 },
    { id: 'church', f: 'church', x: 250, y: 1560, w: 174, d: 80, k: 1.1 },
    { id: 'cot3', f: 'cottage', v: 3, x: 520, y: 1560, w: 99, d: 60, k: 1.1 },
    { id: 'cot4', f: 'cottage', v: 0, x: 640, y: 1560, w: 99, d: 60, k: 1.1 },
    { id: 'station', f: 'station', x: 1170, y: 1010, w: 204, d: 84, k: 1.2 },
    { id: 'cabin', f: 'cabin', x: 2400, y: 1110, w: 195, d: 66, k: 1.3, door: 2548 },
    { id: 'welfare', f: 'welfare', x: 2640, y: 1110, w: 143, d: 60, k: 1.3 },
    { id: 'signalbox', f: 'signalbox', x: 3120, y: 1010, w: 78, d: 50, k: 1.3 },
    { id: 'moira', f: 'cottage', v: 3, x: 1570, y: 560, w: 99, d: 60, k: 1.1 },
    { id: 'farm', f: 'cottage', v: 0, x: 560, y: 2080, w: 99, d: 60, k: 1.1 }
  ];
  const DOORS = { cabin: { x: 2548, y: 1122 }, hall: { x: 1083, y: 1302 } };
  const ROOMS = {
    cabin: { w: 520, h: 330, wall: 96, door: [230, 290], exitTo: { x: 2548, y: 1140 } },
    hall: { w: 760, h: 440, wall: 110, door: [350, 410], exitTo: { x: 1083, y: 1322 } }
  };
  const PATHS = [
    { id: 'high', w: 64, c: 'tarmac', p: [[40, 1335], [1300, 1335]] },
    { id: 'station', w: 40, c: 'tarmac', p: [[1150, 1335], [1235, 1200], [1270, 1030]] },
    { id: 'farm', w: 24, c: 'gravel', p: [[760, 1370], [760, 1760], [640, 2100]] },
    { id: 'valley', w: 20, c: 'path', p: [[1290, 1340], [1480, 1400], [1640, 1462], [1800, 1472], [1960, 1455], [2150, 1385], [2330, 1270], [2420, 1180]] },
    { id: 'moira', w: 18, c: 'path', p: [[1120, 1010], [1180, 820], [1400, 700], [1600, 600]] },
    { id: 'crag', w: 18, c: 'path', p: [[2605, 960], [2605, 860], [2520, 620], [2420, 340]] },
    { id: 'packhorse', w: 18, c: 'path', p: [[760, 1760], [1300, 1880], [1700, 2005], [1900, 2010], [2300, 1900], [2650, 1650]] },
    { id: 'pier', w: 22, c: 'gravel', minBuild: 1, p: [[2350, 1250], [2150, 1205], [1920, 1170], [1712, 1160]] },
    { id: 'haul', w: 46, c: 'gravel', minBuild: 2, p: [[2620, 1235], [2660, 1600], [2760, 2300]] },
    { id: 'haulbridge', w: 40, c: 'gravel', minBuild: 2, p: [[1712, 1160], [1770, 1252], [2150, 1252], [2350, 1250]] }
  ];

  class World {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.cfg = { time: 'dawn', season: 'spring', weather: 'clear', build: 0, train: false };
      this.chapter = 0; this.entities = []; this.room = 'outside'; this.ppe = false;
      this.player = { x: 2548, y: 1160, face: 'down', phase: 0, moving: false, target: null, look: null };
      this.keys = {}; this.stick = { x: 0, y: 0 }; this.paused = true; this.reduced = false;
      this.camX = 0; this.camY = 0; this.t0 = performance.now(); this.last = this.t0;
      this.fade = 0; this.fadeDir = 0; this.fadeCb = null; this.particles = []; this.objective = null; this.focus = null;
      this.touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      this.onInteract = null; this.onEnterRoom = null; this.onBlocked = null; this.lastBlock = 0;
      this.mainTrain = { y: -9999, next: 6, dir: 1 }; this.grain = this.makeGrain();
      this.resize(); addEventListener('resize', () => this.resize());
      this.bindInput(); this.set(this.cfg);
      requestAnimationFrame(t => this.loop(t));
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2); this.dpr = dpr;
      this.cv.width = Math.round(innerWidth * dpr); this.cv.height = Math.round(innerHeight * dpr);
      this.cv.style.width = innerWidth + 'px'; this.cv.style.height = innerHeight + 'px';
      const portrait = innerHeight > innerWidth * 1.2;
      this.baseS = Math.min(innerHeight / 560, innerWidth / (portrait ? 340 : 560)); this.fitScale();
    }
    fitScale() { let s = this.baseS; if (this.room !== 'outside') s = Math.max(s, Math.min(innerHeight / (ROOMS[this.room].h + 60), innerWidth / (ROOMS[this.room].w + 40))); this.S = s; this.vw = innerWidth / s; this.vh = innerHeight / s; }
    makeGrain() { const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), d = x.createImageData(160, 160); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 14; } x.putImageData(d, 0, 0); return c; }

    // ---------- Configuration ----------
    set(cfg) {
      this.cfg = Object.assign({ weather: 'clear', train: false }, cfg); this.P = PAL[this.cfg.time] || PAL.day;
      this.particles = []; this.populate(); this.buildCollision();
    }
    get build() { return this.cfg.build | 0; }
    deckState() { const b = this.build; return b <= 2 ? 'closed' : b <= 4 ? 'site' : 'live'; }
    populate() {
      const r = rng(9), B = this.build;
      // Trees: forests north, woods south-east, scattered elsewhere; avoid roads, water, buildings, rails
      this.trees = [];
      const ok = (x, y) => {
        if (x < 40 || x > 3230 || y < 150 || y > 2270) return false;
        if (Math.abs(x - riverX(y)) < 70) return false;
        if (y > 840 && y < 960 && x > 1150 && x < 3260) return false;
        if (x > VIA.x1 - 30 && x < VIA.x2 + 30 && y > 840 && y < VIA.yS + VIA.H + 40) return false;
        if (x > 2310 && x < 2980 && y > 940 && y < 1260) return false;
        if (x > 100 && x < 1320 && y > 1180 && y < 1700) return false;
        if (x > 120 && x < 1380 && y > 1690 && y < 2260) return false;
        for (const p of PATHS) { if (p.minBuild && B < p.minBuild) continue; if (distToPath(x, y, p.p) < p.w / 2 + 22) return false; }
        for (const b of BUILDINGS) if (x > b.x - 30 && x < b.x + b.w + 30 && y > b.y - b.d - 40 && y < b.y + 30) return false;
        return true;
      };
      const addForest = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); if (ok(x, y)) this.trees.push({ x, y, h: 44 + r() * 50, k: r() }); } };
      addForest(60, 160, 3200, 800, 260);         // northern woods and fell edge
      addForest(2200, 1320, 3220, 2260, 160);     // south-east woods
      addForest(1380, 1100, 2250, 2260, 120);     // valley sides
      addForest(40, 1150, 120, 2260, 30); addForest(1350, 1150, 1480, 1700, 20);
      this.trees.sort((a, b) => a.y - b.y);
      // Sheep in the fields
      this.sheep = []; for (let i = 0; i < 9; i++) this.sheep.push({ x: 200 + r() * 1050, y: 1760 + r() * 460, t: r() * 5, dx: 0, dy: 0, face: r() < 0.5 ? -1 : 1 });
      this.cloudShadows = []; for (let i = 0; i < 7; i++) this.cloudShadows.push({ x: r() * MAP.W, y: r() * MAP.H, w: 300 + r() * 400, h: 160 + r() * 200, s: 8 + r() * 10 });
      this.flock = { x: -200, y: 700, t: 0 };
      this.ivy = []; for (let i = 0; i < 18; i++) this.ivy.push([VIA.x1 + r() * (VIA.x2 - VIA.x1), 10 + r() * 50, 12 + r() * 30]);
    }
    buildCollision() {
      const C = 10, gw = Math.ceil(MAP.W / C), gh = Math.ceil(MAP.H / C), g = new Uint8Array(gw * gh);
      const rect = (x0, y0, x1, y1, v) => { for (let gy = Math.max(0, Math.floor(y0 / C)); gy < Math.min(gh, Math.ceil(y1 / C)); gy++) for (let gx = Math.max(0, Math.floor(x0 / C)); gx < Math.min(gw, Math.ceil(x1 / C)); gx++) g[gy * gw + gx] = v; };
      const B = this.build;
      rect(0, 0, MAP.W, 130, 1); rect(0, MAP.H - 30, MAP.W, MAP.H, 1); rect(0, 0, 30, MAP.H, 1); rect(3250, 0, MAP.W, MAP.H, 1);
      // river (with crossings)
      for (let y = 0; y < MAP.H; y += C) {
        const cross = (y >= CROSS.ford[0] && y <= CROSS.ford[1]) || (y >= CROSS.bridge[0] && y <= CROSS.bridge[1]) || (B >= 2 && y >= CROSS.temp[0] && y <= CROSS.temp[1]);
        if (!cross) { const cx = riverX(y); rect(cx - 30, y, cx + 30, y + C, 1); }
      }
      rect(VIA.x1 - 14, VIA.yS, VIA.x2 + 14, VIA.yS + VIA.H, 1);   // the viaduct's arches and piers
      rect(VIA.x1, VIA.yN, VIA.x2, VIA.yS, 2);                        // the deck (conditional)
      if (B >= 5) { rect(TRACK.x1, TRACK.y1, VIA.x1, TRACK.y2, 3); rect(VIA.x2, TRACK.y1, FOOTBRIDGE[0], TRACK.y2, 3); rect(FOOTBRIDGE[1], TRACK.y1, TRACK.x2, TRACK.y2, 3); }
      for (const b of BUILDINGS) rect(b.x + 4, b.y - b.d, b.x + b.w - 4, b.y - 4, 1);
      for (const t of this.trees) rect(t.x - 6, t.y - 6, t.x + 6, t.y + 2, 1);
      // compound fence with gates (west to the valley path, south to the haul road, north to the trackbed)
      if (B >= 1) { rect(2320, 950, 2330, 1160, 1); rect(2320, 1210, 2330, 1245, 1); rect(2330, 1238, 2590, 1246, 1); rect(2650, 1238, 2970, 1246, 1); rect(2962, 950, 2972, 1246, 1); rect(2330, 944, 2540, 952, 1); rect(2680, 944, 2970, 952, 1); }
      // field hedges with gaps
      rect(120, 1700, 700, 1710, 1); rect(820, 1700, 1380, 1710, 1); rect(120, 1700, 130, 2260, 1); rect(1370, 1700, 1380, 1820, 1); rect(1370, 1940, 1380, 2260, 1);
      this.grid = g; this.gw = gw; this.C = C;
      // rooms
      this.roomGrid = {};
      for (const [id, R] of Object.entries(ROOMS)) {
        const rgw = Math.ceil(R.w / C), rgh = Math.ceil(R.h / C), rg = new Uint8Array(rgw * rgh);
        const rr = (x0, y0, x1, y1) => { for (let gy = Math.max(0, Math.floor(y0 / C)); gy < Math.min(rgh, Math.ceil(y1 / C)); gy++) for (let gx = Math.max(0, Math.floor(x0 / C)); gx < Math.min(rgw, Math.ceil(x1 / C)); gx++) rg[gy * rgw + gx] = 1; };
        rr(0, 0, R.w, R.wall + 10); rr(0, 0, 14, R.h); rr(R.w - 14, 0, R.w, R.h); rr(0, R.h - 12, R.door[0], R.h); rr(R.door[1], R.h - 12, R.w, R.h);
        if (id === 'cabin') { rr(26, 118, 112, 150); rr(158, 116, 224, 168); rr(300, 186, 444, 224); }
        else { rr(250, 110, 510, 168); rr(40, 126, 142, 164); for (const ry of [240, 290]) { rr(120, ry, 355, ry + 22); rr(405, ry, 640, ry + 22); } }
        this.roomGrid[id] = { g: rg, w: rgw };
      }
    }
    blockedAt(x, y) {
      if (this.room !== 'outside') { const R = this.roomGrid[this.room]; const gx = Math.floor(x / this.C), gy = Math.floor(y / this.C); if (x < 0 || y < 0 || x >= ROOMS[this.room].w || y >= ROOMS[this.room].h) return 1; return R.g[gy * R.w + gx] ? 1 : 0; }
      const v = this.grid[Math.floor(y / this.C) * this.gw + Math.floor(x / this.C)];
      if (v === 2) { const st = this.deckState(); if (st === 'site' && this.ppe) return 0; return st === 'closed' ? 'deck_closed' : st === 'live' ? 'deck_live' : 'deck_ppe'; }
      if (v === 3) return 'track_live';
      return v ? 1 : 0;
    }
    canStand(x, y) { for (const [dx, dy] of [[-8, 0], [8, 0], [0, -4], [0, 3]]) { const b = this.blockedAt(x + dx, y + dy); if (b) return b; } return 0; }

    // ---------- Input ----------
    bindInput() {
      addEventListener('keydown', e => {
        if (e.target && e.target.tagName === 'INPUT') return;
        this.keys[e.key.toLowerCase()] = true;
        if (!this.paused && !e.defaultPrevented && (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.use(); }
      });
      addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
      addEventListener('blur', () => { this.keys = {}; this.stick = { x: 0, y: 0 }; });
      this.cv.addEventListener('pointerdown', e => {
        if (this.paused) return;
        const wx = this.camX + e.clientX / this.S, wy = this.camY + e.clientY / this.S;
        const hit = this.visible().filter(en => en.prompt).find(en => Math.abs(en.x - wx) < 28 && wy > en.y - 80 && wy < en.y + 14);
        this.player.target = hit ? { x: hit.x, y: hit.y + 22, use: hit } : { x: wx, y: wy };
      });
    }
    visible() { return this.entities.filter(e => e.room === this.room && !e.hidden); }
    use() {
      if (this.paused || this.fadeDir) return;
      const f = this.focus; if (!f || !this.onInteract) return;
      this.player.target = null; const p = this.player, dx = f.x - p.x, dy = f.y - p.y;
      p.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (f.kind === 'npc') f.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'up' : 'down');
      this.onInteract(f);
    }
    enter(room, x, y) { this.fadeDir = 1; this.fadeCb = () => { this.room = room; this.player.x = x; this.player.y = y; this.player.target = null; this.fitScale(); this.snapCam(); if (this.onEnterRoom) this.onEnterRoom(room); }; }
    place(room, x, y) { this.room = room; this.player.x = x; this.player.y = y; this.fitScale(); this.snapCam(); }
    snapCam() { const c = this.camTarget(); this.camX = c[0]; this.camY = c[1]; }
    camTarget() {
      const p = this.player;
      if (this.attract) { const t = (performance.now() - this.t0) / 1000, u = 0.5 + 0.5 * Math.sin(t * 0.04 - 1.4); return [1150 + u * 1400 - this.vw / 2 + 300, 700 + Math.sin(t * 0.03) * 120 - this.vh / 2 + 250]; }
      if (this.room !== 'outside') { const R = ROOMS[this.room]; const cx = R.w < this.vw ? (R.w - this.vw) / 2 : Math.max(0, Math.min(R.w - this.vw, p.x - this.vw / 2)); const cy = R.h + 20 < this.vh ? (R.h - this.vh) / 2 + 10 : Math.max(-20, Math.min(R.h + 20 - this.vh, p.y - this.vh / 2)); return [cx, cy]; }
      return [Math.max(0, Math.min(MAP.W - this.vw, p.x - this.vw / 2)), Math.max(0, Math.min(MAP.H - this.vh, p.y - 30 - this.vh / 2))];
    }

    // ---------- Update ----------
    update(dt) {
      const p = this.player, t = (performance.now() - this.t0) / 1000;
      let dx = 0, dy = 0;
      if (!this.paused && !this.fadeDir && !this.attract) {
        const k = this.keys;
        if (k['arrowleft'] || k['a']) dx -= 1; if (k['arrowright'] || k['d']) dx += 1;
        if (k['arrowup'] || k['w']) dy -= 1; if (k['arrowdown'] || k['s']) dy += 1;
        if (Math.abs(this.stick.x) > 0.2 || Math.abs(this.stick.y) > 0.2) { dx = this.stick.x; dy = this.stick.y; }
        if (dx || dy) p.target = null;
        else if (p.target) { const tx = p.target.x - p.x, ty = p.target.y - p.y, d = Math.hypot(tx, ty); if (d < 6) { const u = p.target.use; p.target = null; if (u) { this.focus = u; this.use(); } } else { dx = tx / d; dy = ty / d; } }
      }
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        dx /= Math.max(1, len); dy /= Math.max(1, len);
        const sp = 190 * (this.keys['shift'] ? 1.6 : 1) * dt;
        const nx = p.x + dx * sp, ny = p.y + dy * sp;
        const bx = this.canStand(nx, p.y), by = this.canStand(p.x, ny);
        if (!bx) p.x = nx; if (!by) p.y = ny;
        const why = [bx, by].find(b => typeof b === 'string');
        if (why && this.onBlocked && t - this.lastBlock > 3) { this.lastBlock = t; this.onBlocked(why); }
        if (bx && by && p.target) p.target = null;
        p.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        p.moving = true; p.phase += dt * 11;
      } else { p.moving = false; p.phase += dt * 2; }
      // NPCs idle and wander
      for (const e of this.entities) {
        if (e.kind !== 'npc' || e.room !== this.room) continue;
        e.phase = (e.phase || Math.random() * 6) + dt * (e.moving ? 9 : 2);
        if (e.wander && !this.paused) {
          e.wt = (e.wt || 0) - dt;
          if (e.wt <= 0) { e.goal = [e.home[0] + (Math.random() - 0.5) * e.wander, e.home[1] + (Math.random() - 0.5) * e.wander * 0.5]; e.wt = 3 + Math.random() * 6; }
          const gx = e.goal[0] - e.x, gy = e.goal[1] - e.y, d = Math.hypot(gx, gy);
          e.moving = d > 4; if (e.moving) { const nx = e.x + gx / d * 40 * dt, ny = e.y + gy / d * 40 * dt; if (!this.canStand(nx, ny)) { e.x = nx; e.y = ny; } else e.goal = [e.x, e.y]; e.face = Math.abs(gx) > Math.abs(gy) ? (gx > 0 ? 'right' : 'left') : (gy > 0 ? 'down' : 'up'); }
        } else e.moving = false;
      }
      // sheep graze
      for (const s of this.sheep) { s.t -= dt; if (s.t <= 0) { s.t = 2 + Math.random() * 5; const a = Math.random() * 6.28, m = Math.random() < 0.5 ? 0 : 14; s.dx = Math.cos(a) * m; s.dy = Math.sin(a) * m * 0.6; if (s.dx) s.face = s.dx > 0 ? 1 : -1; } const nx = s.x + s.dx * dt, ny = s.y + s.dy * dt; if (nx > 150 && nx < 1350 && ny > 1730 && ny < 2240) { s.x = nx; s.y = ny; } }
      for (const c of this.cloudShadows) { c.x += c.s * dt * (this.reduced ? 0 : 1); if (c.x > MAP.W + 400) c.x = -500; }
      this.flock.x += 90 * dt; if (this.flock.x > MAP.W + 300) { this.flock.x = -300; this.flock.y = 300 + Math.random() * 1500; }
      // focus
      let best = null, bd = 58;
      if (!this.paused) for (const e of this.visible()) { if (!e.prompt) continue; const d = Math.hypot(e.x - p.x, (e.y - p.y) * 1.3); if (d < bd) { bd = d; best = e; } }
      this.focus = best;
      const [tx, ty] = this.camTarget(), k = Math.min(1, dt * (this.attract ? 1 : 6));
      this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
      if (this.fadeDir) { this.fade += this.fadeDir * dt * 3.2; if (this.fade >= 1) { this.fade = 1; this.fadeDir = -1; if (this.fadeCb) { this.fadeCb(); this.fadeCb = null; } } if (this.fade <= 0 && this.fadeDir < 0) { this.fade = 0; this.fadeDir = 0; } }
      const mt = this.mainTrain; mt.next -= dt; if (mt.next <= 0 && mt.y < -2000) { mt.dir = Math.random() < 0.5 ? 1 : -1; mt.y = mt.dir > 0 ? -300 : MAP.H + 300; mt.next = 22 + Math.random() * 16; }
      if (mt.y > -2000) { mt.y += mt.dir * 620 * dt; if (mt.y > MAP.H + 400 || mt.y < -400) mt.y = -9999; }
    }

    loop(now) {
      requestAnimationFrame(t => this.loop(t));
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      if (!this.P) return;
      this.fitScale(); this.update(dt);
      const x = this.ctx, t = (now - this.t0) / 1000;
      LS.setLight(this.P, LIGHT[this.cfg.time] ?? 0.1);
      if (this.room === 'outside') this.drawOutside(x, t); else this.drawRoom(x, t);
      this.drawOverlays(x, t);
    }

    /* ============================== OUTSIDE ============================== */
    drawOutside(x, t) {
      const S = this.S * this.dpr, cx = this.camX, cy = this.camY, vw = this.vw, vh = this.vh, B = this.build, P = this.P;
      const season = this.cfg.season, winter = season === 'winter', veg = SEASON[season];
      const x0 = cx - 80, x1 = cx + vw + 80, y0 = cy - 120, y1 = cy + vh + 260;
      x.setTransform(S, 0, 0, S, -cx * S, -cy * S);
      const grass = winter ? '#dfe6ec' : mix({ spring: '#7aa65e', summer: '#86a94f', autumn: '#a1964f', winter: '#dfe6ec' }[season], P.near, LIGHT[this.cfg.time] * 0.6);
      x.fillStyle = grass; x.fillRect(x0, y0, x1 - x0, y1 - y0);
      // fell to the north
      const fell = x.createLinearGradient(0, 0, 0, 480); fell.addColorStop(0, winter ? '#e8edf2' : mix('#8a7a6a', grass, 0.35)); fell.addColorStop(1, rgba(grass, 0));
      x.fillStyle = fell; x.fillRect(x0, 0, x1 - x0, 480);
      // soft grass variation
      for (let gx = Math.floor(x0 / 120) * 120; gx < x1; gx += 120) for (let gy = Math.floor(y0 / 120) * 120; gy < y1; gy += 120) {
        const h = hash2(gx, gy); x.fillStyle = rgba(h < 0.5 ? '#ffffff' : '#1c2a14', winter ? 0.035 : 0.03 + h * 0.02);
        x.beginPath(); x.ellipse(gx + h * 80, gy + (1 - h) * 80, 70 + h * 50, 34 + h * 20, h, 0, 7); x.fill();
      }
      // fields with crop rows
      if (y1 > 1700) for (const [fx0, fx1, col] of [[130, 700, '#b9a55c'], [700, 1100, '#7f9a52'], [1100, 1370, '#a3b35e']]) {
        const c = winter ? '#e6ebef' : season === 'autumn' ? mix(col, '#9c6a3a', 0.35) : col;
        x.fillStyle = mix(c, P.near, LIGHT[this.cfg.time] * 0.6); x.fillRect(fx0, 1710, fx1 - fx0, 550);
        x.strokeStyle = rgba('#3a3020', 0.12); x.lineWidth = 3; for (let yy = 1730; yy < 2250; yy += 16) { x.beginPath(); x.moveTo(fx0 + 6, yy); x.lineTo(fx1 - 6, yy); x.stroke(); }
      }
      // the valley: slopes and floor
      const vg = x.createLinearGradient(1400, 0, 2200, 0);
      vg.addColorStop(0, rgba(P.fg, 0)); vg.addColorStop(0.12, rgba(P.fg, 0.16)); vg.addColorStop(0.2, rgba('#1e3a2a', 0.1)); vg.addColorStop(0.8, rgba('#1e3a2a', 0.1)); vg.addColorStop(0.88, rgba(P.fg, 0.16)); vg.addColorStop(1, rgba(P.fg, 0));
      x.fillStyle = vg; x.fillRect(1400, Math.max(y0, 0), 800, y1 - Math.max(y0, 0));
      for (const side of [1470, 2130]) { x.strokeStyle = rgba(P.fg, 0.12); x.lineWidth = 2; for (let yy = Math.floor(y0 / 40) * 40; yy < y1; yy += 40) { const o = hash2(side, yy) * 20; x.beginPath(); x.moveTo(side - 20 + o, yy); x.lineTo(side + 20 + o, yy + 26); x.stroke(); } }
      // compound hardstanding
      if (B >= 0) { x.fillStyle = mix('#b9ae98', P.near, 0.15); x.fillRect(2335, B >= 2 ? 955 : 1030, B >= 2 ? 630 : 420, B >= 2 ? 285 : 150); }
      // village green
      x.fillStyle = mix(grass, '#5f8a4a', 0.25); x.beginPath(); x.ellipse(960, 1440, 170, 70, 0, 0, 7); x.fill();
      // paths and roads
      for (const p of PATHS) { if (p.minBuild && B < p.minBuild) continue; this.drawPath(x, p, winter); }
      this.drawRiver(x, t, y0, y1, winter);
      this.drawTrackbed(x, t, winter);
      this.drawDeck(x, t);
      // ground detail
      const flowers = season === 'spring' || season === 'summer';
      for (let gx = Math.floor(x0 / 26) * 26; gx < x1; gx += 26) for (let gy = Math.floor(y0 / 26) * 26; gy < y1; gy += 26) {
        const h = hash2(gx * 1.3, gy * 0.7); if (h < 0.55) continue;
        const px = gx + h * 20, py = gy + (h * 37 % 1) * 20; if (this.onSurface(px, py)) continue;
        x.strokeStyle = rgba(winter ? '#9fb0bf' : '#2a3a1a', 0.35); x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 2, py - 6); x.moveTo(px + 3, py); x.lineTo(px + 4, py - 5); x.stroke();
        if (flowers && h > 0.93) { x.fillStyle = ['#f3ecdf', '#f2c230', '#d8566a', '#b48fd8'][Math.floor(h * 1000) % 4]; x.beginPath(); x.arc(px + 1, py - 7, 2, 0, 7); x.fill(); }
      }
      // cloud shadows
      if (this.cfg.time !== 'night') for (const c of this.cloudShadows) { x.fillStyle = 'rgba(20,30,40,0.07)'; x.beginPath(); x.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, 7); x.fill(); }

      // ---- sorted objects ----
      const L = [];
      const add = (y, fn) => L.push([y, fn]);
      for (const tr of this.trees) if (tr.x > x0 - 60 && tr.x < x1 + 60 && tr.y > y0 && tr.y < y1 + 60) add(tr.y, () => this.drawTree(x, tr, winter, veg));
      for (const b of BUILDINGS) if (b.x + b.w > x0 && b.x < x1 && b.y > y0 && b.y - 260 < y1) add(b.y, () => this.drawBuilding(x, b));
      if (x1 > VIA.x1 - 40 && x0 < VIA.x2 + 40 && y1 > VIA.yS - 20 && y0 < VIA.yS + VIA.H + 20) add(VIA.yS, () => this.drawElevation(x, t));
      this.decor(add, x0, x1, y0, y1, t);
      for (const s of this.sheep) if (s.x > x0 && s.x < x1 && s.y > y0 && s.y < y1) add(s.y, () => this.drawSheep(x, s, t));
      for (const e of this.visible()) if (e.kind === 'npc' && e.x > x0 - 40 && e.x < x1 + 40) add(e.y, () => LS.drawPerson4(x, e.look, e.x, e.y, e.face || 'down', e.phase || 0, e.moving, { work: e.work, wave: e.wave }));
      else if (e.kind === 'memo' && e.x > x0 && e.x < x1) add(e.y, () => {});
      if (this.player.look && !this.attract) add(this.player.y, () => LS.drawPerson4(x, this.player.look, this.player.x, this.player.y, this.player.face, this.player.phase, this.player.moving, { ppe: this.ppe, lamp: this.cfg.time === 'night' }));
      if (this.cfg.train && this.build >= 5) { const tr = this.branchTrainX(t); add(TRACK.y2 - 6, () => this.drawTrain(x, tr.x, TRACK.y2 - 8, tr.dir, this.chapter >= 7 ? '#1f6f6c' : '#d8643a')); }
      if (this.mainTrain.y > -2000) add(this.mainTrain.y + 200, () => this.drawMainTrain(x, this.mainTrain.y));
      L.sort((a, b) => a[0] - b[0]); for (const [, fn] of L) fn();
      // birds overhead
      if (this.cfg.time !== 'night' && this.cfg.weather === 'clear') { for (let i = 0; i < 6; i++) { const bx = this.flock.x - i * 24, by = this.flock.y + (i % 2) * 14 + Math.sin(t * 2 + i) * 4, w = Math.sin(t * 9 + i) * 3; x.strokeStyle = 'rgba(30,26,40,0.7)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(bx - 5, by + w); x.lineTo(bx, by + 2); x.lineTo(bx + 5, by + w); x.stroke(); x.fillStyle = 'rgba(0,0,0,0.08)'; x.beginPath(); x.ellipse(bx, by + 160, 4, 1.5, 0, 0, 7); x.fill(); } }
      this.drawMarkers(x, t);
      this.grade(x, t);
    }
    onSurface(px, py) {
      const B = this.build;
      if (py > TRACK.y1 - 8 && py < TRACK.y2 + 8 && px > TRACK.x1 - 20 && px < TRACK.x2) return true;
      if (Math.abs(px - riverX(py)) < 40) return true;
      if (px > VIA.x1 - 20 && px < VIA.x2 + 20 && py > VIA.yN - 20 && py < VIA.yS + VIA.H + 10) return true;
      for (const p of PATHS) { if (p.minBuild && B < p.minBuild) continue; if (distToPath(px, py, p.p) < p.w / 2 + 3) return true; }
      if (px > 2335 && px < 2965 && py > 955 && py < 1240) return true;
      return false;
    }
    drawPath(x, p, winter) {
      const P = this.P, poly = () => { x.beginPath(); p.p.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); };
      x.lineCap = 'round'; x.lineJoin = 'round';
      if (p.c === 'tarmac') {
        poly(); x.strokeStyle = mix('#c2baab', P.near, 0.1); x.lineWidth = p.w + 16; x.stroke();
        poly(); x.strokeStyle = mix('#8c857a', P.near, 0.1); x.lineWidth = p.w + 4; x.stroke();
        poly(); x.strokeStyle = mix(winter ? '#8f969e' : '#4a4d54', P.near, 0.1); x.lineWidth = p.w; x.stroke();
        if (p.id === 'high') { x.setLineDash([26, 30]); poly(); x.strokeStyle = 'rgba(240,235,220,.8)'; x.lineWidth = 2.5; x.stroke(); x.setLineDash([]); }
      } else {
        const col = p.c === 'gravel' ? '#a8a092' : '#c8b58c';
        poly(); x.strokeStyle = rgba(mix(col, '#3a3020', 0.4), 0.5); x.lineWidth = p.w + 5; x.stroke();
        poly(); x.strokeStyle = mix(winter ? '#e9edf1' : col, P.near, 0.12); x.lineWidth = p.w; x.stroke();
      }
    }
    drawRiver(x, t, y0, y1, winter) {
      const P = this.P, a = Math.max(0, y0), b = Math.min(MAP.H, y1);
      const water = this.cfg.time === 'night' ? '#2b4a6a' : mix('#5f9fc2', P.near, LIGHT[this.cfg.time] * 0.6);
      x.lineCap = 'round';
      const line = off => { x.beginPath(); for (let y = a; y <= b; y += 12) { const cx = riverX(y) + off; y === a ? x.moveTo(cx, y) : x.lineTo(cx, y); } };
      line(0); x.strokeStyle = mix('#8a7a5a', P.near, 0.2); x.lineWidth = 74; x.stroke();
      line(0); x.strokeStyle = water; x.lineWidth = 56; x.stroke();
      line(-8); x.strokeStyle = rgba('#ffffff', 0.12); x.lineWidth = 14; x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.45)';
      for (let y = Math.floor(a / 30) * 30; y < b; y += 30) { const f = (y + t * 40) % 30; const cx = riverX(y + f); x.fillRect(cx - 10 + hash2(y, 3) * 16, y + f, 10, 1.4); }
      // stepping stones at the ford
      if (b > CROSS.ford[0] && a < CROSS.ford[1]) { const yy = (CROSS.ford[0] + CROSS.ford[1]) / 2; for (let k = -2; k <= 2; k++) { x.fillStyle = mix('#a39c90', P.near, 0.15); x.beginPath(); x.ellipse(riverX(yy) + k * 12, yy + (k % 2) * 4, 7, 5, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(riverX(yy) + k * 12 - 6, yy + (k % 2) * 4 + 3, 12, 2); } }
    }
    drawTrackbed(x, t, winter) {
      const B = this.build, P = this.P;
      const seg = (a, b) => {
        x.fillStyle = B >= 3 ? mix('#8d877c', P.near, 0.12) : mix('#7d6f58', P.near, 0.15); x.fillRect(a, TRACK.y1, b - a, TRACK.y2 - TRACK.y1);
        if (B <= 2) { for (let s = a; s < b; s += 9) { const h = hash2(s, 1); if (h < 0.5) { x.fillStyle = mix('#5f7d4c', P.near, 0.2); x.beginPath(); x.arc(s, TRACK.y1 + 6 + h * 30, 3 + h * 4, 0, 7); x.fill(); } } }
        if (B >= 4) this.rails(x, a, b, TRACK.y1 + 12);
      };
      if (TRACK.x1 < VIA.x1) seg(TRACK.x1, VIA.x1);
      seg(VIA.x2, TRACK.x2);
      if (B >= 5) { // lineside fence once live, with the footbridge
        x.fillStyle = mix('#6b6f74', P.near, 0.1); for (let s = TRACK.x1; s < TRACK.x2; s += 30) { if (s > VIA.x1 && s < VIA.x2) continue; if (s > FOOTBRIDGE[0] - 10 && s < FOOTBRIDGE[1] + 10) continue; x.fillRect(s, TRACK.y2 + 2, 2, 12); x.fillRect(s, TRACK.y1 - 12, 2, 12); }
      }
      x.fillStyle = mix('#6b5a48', P.near, 0.1); x.fillRect(TRACK.x1 - 18, TRACK.y1 + 8, 10, 26); // buffer stop
      x.fillStyle = '#b8433f'; x.fillRect(TRACK.x1 - 18, TRACK.y1 + 8, 10, 5);
      // the main line (always live)
      x.fillStyle = mix('#8d877c', P.near, 0.12); x.fillRect(3262, 0, 76, MAP.H);
      this.railsV(x, 3280); this.railsV(x, 3318);
      x.fillStyle = mix('#6b6f74', P.near, 0.1); for (let y = 0; y < MAP.H; y += 30) x.fillRect(3248, y, 3, 20);
      // junction points: the branch tie-in happens in the track-laying chapter
      if (B >= 4) { x.strokeStyle = mix('#a9adb2', P.near, 0.1); x.lineWidth = 2; for (const o of [0, 16]) { x.beginPath(); x.moveTo(3120, TRACK.y1 + 12 + o); x.quadraticCurveTo(3240, TRACK.y1 + 12 + o, 3280 + o * 0.5, TRACK.y1 + 90 + o); x.stroke(); } }
    }
    rails(x, a, b, y) { x.fillStyle = mix('#5a4a3a', this.P.near, 0.1); for (let s = a; s < b; s += 8) x.fillRect(s, y - 4, 4, 24); x.fillStyle = mix('#b8bcc1', this.P.near, 0.1); x.fillRect(a, y, b - a, 2.2); x.fillRect(a, y + 14, b - a, 2.2); }
    railsV(x, px) { x.fillStyle = mix('#5a4a3a', this.P.near, 0.1); for (let y = 0; y < MAP.H; y += 8) x.fillRect(px - 5, y, 22, 4); x.fillStyle = mix('#b8bcc1', this.P.near, 0.1); x.fillRect(px, 0, 2.2, MAP.H); x.fillRect(px + 12, 0, 2.2, MAP.H); }
    drawDeck(x, t) {
      const B = this.build, P = this.P, stone = mix(P.stone, P.near, 0.08);
      x.fillStyle = mix(stone, '#ffffff', 0.08); x.fillRect(VIA.x1 - 14, VIA.yN - 10, VIA.x2 - VIA.x1 + 28, 10); // north parapet
      x.fillStyle = mix(stone, P.near, 0.3); x.fillRect(VIA.x1 - 14, VIA.yN - 2, VIA.x2 - VIA.x1 + 28, 3);
      x.fillStyle = B <= 2 ? mix('#7d6f58', P.near, 0.15) : B === 3 ? '#2b2d31' : mix('#8d877c', P.near, 0.12);
      x.fillRect(VIA.x1, VIA.yN, VIA.x2 - VIA.x1, VIA.yS - VIA.yN);
      if (B <= 2) { for (let s = VIA.x1; s < VIA.x2; s += 8) { const h = hash2(s, 7); if (h < 0.55) { x.fillStyle = mix('#5f7d4c', P.near, 0.2); x.beginPath(); x.arc(s, VIA.yN + 6 + h * 34, 2.5 + h * 4, 0, 7); x.fill(); } } }
      if (B === 3) { x.fillStyle = 'rgba(255,255,255,.06)'; for (let s = VIA.x1; s < VIA.x2; s += 60) x.fillRect(s, VIA.yN, 2, VIA.yS - VIA.yN); x.fillStyle = mix('#8d877c', P.near, 0.1); x.fillRect(VIA.x2 - 200, VIA.yN, 200, VIA.yS - VIA.yN); } // waterproofing membrane going down, ballast following
      if (B >= 4) this.rails(x, VIA.x1, VIA.x2, VIA.yN + 14);
      if (B === 3 || B === 4) { // edge protection that makes the deck a safe place of work
        for (const y of [VIA.yN + 2, VIA.yS - 6]) { x.fillStyle = '#f36b21'; for (let s = VIA.x1; s < VIA.x2; s += 22) x.fillRect(s, y, 12, 3); }
      }
      // end barriers
      const st = this.deckState();
      for (const ex of [VIA.x1 - 4, VIA.x2 - 6]) {
        if (st === 'closed') { x.fillStyle = '#f2c230'; x.fillRect(ex, VIA.yN, 10, VIA.yS - VIA.yN); x.fillStyle = '#1b1e25'; for (let k = 0; k < 5; k++) x.fillRect(ex, VIA.yN + 4 + k * 9, 10, 3); }
        else if (st === 'site' && !this.ppe) { x.fillStyle = '#2c7c77'; x.fillRect(ex, VIA.yN, 10, VIA.yS - VIA.yN); }
      }
      // footbridge over the trackbed
      if (B >= 5) { x.fillStyle = mix('#5a6468', P.near, 0.1); x.fillRect(FOOTBRIDGE[0], TRACK.y1 - 24, FOOTBRIDGE[1] - FOOTBRIDGE[0], TRACK.y2 - TRACK.y1 + 48); x.fillStyle = mix('#8a9398', P.near, 0.1); x.fillRect(FOOTBRIDGE[0], TRACK.y1 - 24, 4, TRACK.y2 - TRACK.y1 + 48); x.fillRect(FOOTBRIDGE[1] - 4, TRACK.y1 - 24, 4, TRACK.y2 - TRACK.y1 + 48); }
    }
    drawElevation(x, t) {
      const B = this.build, P = this.P, sp = VIA.span, pw = 16, r = (sp - pw) / 2, crown = 18, cyA = crown + r, H = VIA.H;
      const stone = LS.tint(P.stone), stoneS = LS.tintS(P.stone), stoneL = mix(stone, '#ffffff', 0.12);
      x.save(); x.translate(0, VIA.yS);
      // what you see through the arches: the valley beyond, and the beck under its arch
      x.fillStyle = mix('#2e4a36', P.near, 0.45); x.fillRect(VIA.x1, crown, VIA.x2 - VIA.x1, H - crown);
      const rx = riverX(VIA.yS + H); x.fillStyle = this.cfg.time === 'night' ? '#223a55' : mix('#4f8fb2', P.near, 0.4); x.fillRect(rx - 24, H - 34, 48, 34);
      for (let k = 0; k < VIA.n; k++) { const L = VIA.x1 + k * sp; x.fillStyle = rgba(P.fg, 0.25); x.fillRect(L, H - 50, sp, 50); }
      // piers
      for (let k = 0; k <= VIA.n; k++) { const px = VIA.x1 + k * sp; x.fillStyle = stone; x.fillRect(px - pw / 2, cyA - 4, pw, H - cyA + 4); x.fillStyle = stoneS; x.fillRect(px + 1, cyA, pw / 2 - 1, H - cyA); x.fillStyle = rgba('#000', 0.18); x.fillRect(px - pw / 2 - 2, H - 4, pw + 4, 6); }
      // spandrels and arch rings
      for (let k = 0; k < VIA.n; k++) {
        const L = VIA.x1 + k * sp, R = L + sp, c = L + sp / 2;
        x.beginPath(); x.moveTo(L - 1, 0); x.lineTo(R + 1, 0); x.lineTo(R + 1, cyA); x.lineTo(c + r, cyA); x.arc(c, cyA, r, 0, Math.PI, true); x.lineTo(L - 1, cyA); x.closePath(); x.fillStyle = stone; x.fill();
        x.strokeStyle = stoneL; x.lineWidth = 2.5; x.beginPath(); x.arc(c, cyA, r + 1.5, Math.PI, 0); x.stroke();
      }
      x.fillStyle = rgba(stoneS, 0.16); for (let y = 6; y < H; y += 7) x.fillRect(VIA.x1 - pw / 2, y, VIA.x2 - VIA.x1 + pw, 1);
      x.fillStyle = stoneS; x.fillRect(VIA.x1 - 14, 10, VIA.x2 - VIA.x1 + 28, 4);
      // south parapet (feet of anyone on the deck disappear behind it)
      x.fillStyle = stoneL; x.fillRect(VIA.x1 - 14, -12, VIA.x2 - VIA.x1 + 28, 12); x.fillStyle = stoneS; x.fillRect(VIA.x1 - 14, -2, VIA.x2 - VIA.x1 + 28, 3);
      if (B <= 1) { // derelict: parapet gap, ivy, water stains, a crack at Pier 4
        x.fillStyle = mix('#7d6f58', P.near, 0.15); x.fillRect(VIA.x1 + sp * 7.2, -12, 30, 10);
        for (const [ix, ih, iw] of this.ivy) for (let k = 0; k < 16; k++) { const u = (k * 37 % 100) / 100, d = Math.pow((k * 53 % 100) / 100, 2) * ih; x.fillStyle = mix('#3f5f3a', P.near, 0.3); x.beginPath(); x.arc(ix + u * iw, -8 + d, 2.4 - d / ih, 0, 7); x.fill(); }
        x.fillStyle = rgba('#1c1a18', 0.2); for (let k = 0; k < VIA.n; k += 2) x.fillRect(VIA.x1 + k * sp + sp * 0.7, 14, 6, 50);
        x.strokeStyle = rgba('#1c1a18', 0.6); x.lineWidth = 1.2; x.beginPath(); x.moveTo(PIER4.x - 2, cyA + 10); x.lineTo(PIER4.x + 2, cyA + 40); x.lineTo(PIER4.x - 1, cyA + 70); x.lineTo(PIER4.x + 3, cyA + 110); x.stroke();
      }
      if (B >= 1 && B <= 2) { x.strokeStyle = '#f36b21'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(PIER4.x - 6, 120); x.lineTo(PIER4.x + 6, 132); x.moveTo(PIER4.x + 6, 120); x.lineTo(PIER4.x - 6, 132); x.stroke(); }
      if (B === 3 || B === 4) { // scaffolding towers for masonry repair (Pier 4 last to be struck)
        for (const k of (B === 3 ? [2, 3, 4, 5, 8] : [4])) { const px = VIA.x1 + k * sp; x.strokeStyle = rgba('#e6dfcf', 0.9); x.lineWidth = 1; const l = px - 18, rr = px + 18;
          for (let xx = l; xx <= rr; xx += 9) { x.beginPath(); x.moveTo(xx, -16); x.lineTo(xx, H); x.stroke(); }
          for (let yy = -16; yy <= H; yy += 14) { x.beginPath(); x.moveTo(l, yy); x.lineTo(rr, yy); x.stroke(); }
          x.beginPath(); for (let yy = -16; yy < H - 28; yy += 28) { x.moveTo(l, yy); x.lineTo(rr, yy + 28); } x.stroke();
          if (k === 4) { x.fillStyle = rgba('#2d6a8a', 0.55); x.fillRect(l, 60, rr - l, 90); } }
      }
      if (B >= 4) for (let k = 0; k <= VIA.n; k += 2) { const px = VIA.x1 + k * sp; x.fillStyle = mix('#2d2f33', P.near, 0.1); x.fillRect(px, -46, 2.5, 34); x.fillRect(px - 4, -46, 10, 2.5); x.fillStyle = P.lit > 0.3 ? '#ffe2a0' : '#d9d4c8'; x.fillRect(px - 3, -44, 8, 2.5); }
      x.restore();
    }
    drawTree(x, tr, winter, veg) {
      const P = this.P, col = mix(mix('#2f5a3a', veg.veg, veg.mix * 0.8), P.near, 0.25 + tr.k * 0.2 + LIGHT[this.cfg.time] * 0.6);
      x.fillStyle = 'rgba(0,0,0,0.18)'; x.beginPath(); x.ellipse(tr.x + 6, tr.y + 2, tr.h * 0.28, tr.h * 0.1, 0, 0, 7); x.fill();
      if (tr.k > 0.72 && !winter) { // broadleaf
        x.fillStyle = mix('#5a4030', P.near, 0.3); x.fillRect(tr.x - 3, tr.y - tr.h * 0.4, 6, tr.h * 0.4);
        const leaf = this.cfg.season === 'autumn' ? mix('#c1733a', P.near, 0.3) : mix(col, '#7aa65e', 0.25);
        for (const [dx, dy, rr] of [[0, -0.62, 0.3], [-0.18, -0.5, 0.22], [0.18, -0.5, 0.22], [0, -0.78, 0.2]]) { x.fillStyle = leaf; x.beginPath(); x.arc(tr.x + dx * tr.h, tr.y + dy * tr.h, rr * tr.h, 0, 7); x.fill(); }
        x.fillStyle = rgba('#ffffff', 0.08); x.beginPath(); x.arc(tr.x - 0.08 * tr.h, tr.y - 0.72 * tr.h, 0.12 * tr.h, 0, 7); x.fill();
      } else pine(x, tr.x, tr.y + 2, tr.h, col, winter ? 'rgba(240,244,248,0.85)' : null);
    }
    drawBuilding(x, b) {
      const B = this.build, lit = this.P.lit, bld = LS.bld;
      x.fillStyle = 'rgba(0,0,0,0.16)'; x.fillRect(b.x + 8, b.y - 4, b.w, 10);
      x.fillStyle = LS.tintS('#6b6358'); x.fillRect(b.x + 4, b.y - b.d, b.w - 8, 6);
      x.save(); x.translate(b.x, b.y); x.scale(b.k, b.k); x.translate(-b.x, 0);
      const ch = this.chapter;
      switch (b.f) {
        case 'cottage': bld.cottage(x, b.x, b.v || 0, lit); break;
        case 'school': bld.school(x, b.x, lit); break;
        case 'bakery': bld.bakery(x, b.x, lit, ch >= 2); break;
        case 'pub': bld.pub(x, b.x, lit); break;
        case 'hall': bld.hall(x, b.x, lit); break;
        case 'church': bld.church(x, b.x, lit); break;
        case 'station': bld.station(x, b.x, B, lit, ch >= 6); break;
        case 'cabin': bld.cabin(x, b.x, lit); break;
        case 'welfare': bld.welfare(x, b.x, lit); break;
        case 'signalbox': bld.signalbox(x, b.x, lit); break;
      }
      x.restore();
      if (b.id === 'moira') { x.fillStyle = LS.tint('#f3ecdf'); x.fillRect(b.x + 20, b.y - 10, 60, 2); x.fillStyle = LS.tint('#3a3431'); x.font = '700 8px Inter, sans-serif'; x.fillText('BECK COTTAGE', b.x + 22, b.y + 12); }
    }
    decor(add, x0, x1, y0, y1, t) {
      const B = this.build, ch = this.chapter, bld = LS.bld, P = this.P, lit = P.lit;
      const at = (px, py, fn) => { if (px > x0 - 200 && px < x1 + 200 && py > y0 - 40 && py < y1 + 260) add(py, () => { x.save(); x.translate(0, py); fn(); x.restore(); }); };
      const x = this.ctx;
      for (const [lx, ly] of [[330, 1372], [700, 1372], [1060, 1372], [1245, 1150], [1300, 1030]]) at(lx, ly, () => bld.lamp(x, lx, lit));
      at(760, 1372, () => bld.busstop(x, 760)); at(905, 1395, () => bld.noticeboard(x, 905)); at(1000, 1450, () => bld.bench(x, 1000));
      at(760, 1305, () => bld.bench(x, 760));
      // the packhorse bridge (always) and the temporary haul-road bridge (enabling works)
      at(riverX(2008), 2034, () => this.packhorse(x, riverX(2008)));
      if (B >= 2) at(riverX(1252), 1276, () => this.tempBridge(x, riverX(1252)));
      // engineering activity, in the order it really happens
      if (ch === 0) { at(1415, 905, () => bld.tripod(x, 1415)); at(1300, 1060, () => bld.van(x, 1300)); }
      if (B === 1) at(PIER4.x - 64, PIER4.y + 12, () => this.rig(x, PIER4.x - 64, t));
      if (ch === 2) at(2250, 1040, () => this.tent(x, 2250));
      if (B >= 2) { at(2800, 1180, () => bld.materials(x, 2800, B)); at(2880, 1215, () => bld.van(x, 2880)); }
      if (B === 3 || B === 4) at(2230, 1000, () => this.crane(x, 2230, t));
      if (B === 4) at(2700, 912, () => this.tamper(x, 2700));
      if (B >= 1) at(2330, 1246, () => {});
      if (B >= 1) at(2450, 952, () => { bld.fence(x, 2330, 210, false); bld.fence(x, 2680, 280, false); });
      if (B >= 1) at(2330, 1246, () => { bld.fence(x, 2330, 260, false); bld.fence(x, 2650, 310, false); });
      at(2420, 340, () => bld.bench(x, 2400)); // Kestrel Crag viewpoint
      for (const [sx, sy] of [[3080, 870]]) at(sx, sy, () => bld.signal(x, sx, this.mainTrain.y > -2000 ? 'r' : 'g'));
      if (ch >= 6) at(1000, 1336, () => { for (let i = 0; i < 26; i++) { x.fillStyle = LS.tint(['#d8643a', '#f2c230', '#2c7c77', '#f3ecdf'][i % 4]); const bx = 60 + i * 48; x.beginPath(); x.moveTo(bx, -150 + Math.sin(i) * 4); x.lineTo(bx + 18, -150); x.lineTo(bx + 9, -138); x.fill(); } });
    }
    packhorse(x, cx) { const P = this.P, stone = LS.tint(P.stone); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(cx - 50, -4, 100, 8); x.fillStyle = stone; x.beginPath(); x.moveTo(cx - 52, 0); x.quadraticCurveTo(cx, -44, cx + 52, 0); x.lineTo(cx + 52, -10); x.quadraticCurveTo(cx, -56, cx - 52, -10); x.fill(); x.fillStyle = LS.tintS(P.stone); x.beginPath(); x.arc(cx, 2, 16, Math.PI, 0); x.fill(); }
    tempBridge(x, cx) { x.fillStyle = LS.tint('#5b6e73'); x.fillRect(cx - 60, -40, 120, 34); x.fillStyle = LS.tint('#f2c230'); for (let s = cx - 60; s < cx + 60; s += 20) x.fillRect(s, -44, 10, 4); x.fillStyle = LS.tintS('#3b3f44'); x.fillRect(cx - 60, -8, 120, 8); }
    rig(x, px, t) { const T = LS.tint; x.fillStyle = T('#e7b53a'); x.fillRect(px - 20, -22, 40, 16); x.fillStyle = T('#3b3f44'); x.fillRect(px - 22, -8, 44, 8); x.fillStyle = T('#c9cdd1'); x.fillRect(px - 2, -90, 4, 70); x.fillStyle = T('#e7b53a'); x.fillRect(px - 6, -96 + Math.sin(t * 6) * 3, 12, 10); }
    tent(x, px) { const T = LS.tint; x.fillStyle = T('#f3ecdf'); x.beginPath(); x.moveTo(px - 40, 0); x.lineTo(px, -46); x.lineTo(px + 40, 0); x.fill(); x.fillStyle = T('#2c7c77'); x.fillRect(px - 12, -18, 24, 18); x.fillStyle = T('#3b3f44'); x.fillRect(px + 44, -40, 30, 22); x.fillStyle = T('#f3ecdf'); x.fillRect(px + 46, -38, 26, 18); }
    tamper(x, px) { const T = LS.tint; x.fillStyle = T('#e7b53a'); x.fillRect(px - 50, -30, 100, 24); x.fillStyle = T('#3b3f44'); x.fillRect(px - 50, -6, 100, 6); x.fillStyle = T('#2b2f36'); x.fillRect(px + 30, -26, 16, 10); }
    crane(x, px, t) {
      const col = LS.tint('#e7b53a'), top = -300, a = t * 0.12, jl = 260;
      x.strokeStyle = col; x.lineWidth = 4; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, top); x.stroke();
      x.lineWidth = 1; for (let y = top; y < 0; y += 12) { x.beginPath(); x.moveTo(px - 4, y); x.lineTo(px + 4, y + 12); x.stroke(); }
      const jx = px - jl * Math.cos(a), jy = top + jl * Math.sin(a) * 0.3; // a 3/4 view of the jib slewing
      x.lineWidth = 4; x.beginPath(); x.moveTo(px + 70 * Math.cos(a), top - 70 * Math.sin(a) * 0.3); x.lineTo(jx, jy); x.stroke();
      const hx = px - jl * 0.7 * Math.cos(a), hy = top + jl * 0.7 * Math.sin(a) * 0.3;
      x.lineWidth = 1; x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx, hy + 120); x.stroke(); x.fillStyle = LS.tint('#8a6a3a'); x.fillRect(hx - 16, hy + 120, 32, 7);
      x.fillStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.ellipse(hx, 0 - (top - hy) * 0, 18, 5, 0, 0, 7);
      if (this.P.lit > 0.4) { x.fillStyle = `rgba(255,60,50,${0.5 + 0.5 * Math.sin(t * 3)})`; x.beginPath(); x.arc(px, top - 5, 3, 0, 7); x.fill(); }
    }
    drawSheep(x, s, t) { const T = LS.tint; x.save(); x.translate(s.x, s.y); x.scale(s.face, 1); x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(0, 0, 12, 3.5, 0, 0, 7); x.fill(); x.fillStyle = T('#2a2420'); x.fillRect(-7, -8, 2.5, 8); x.fillRect(5, -8, 2.5, 8); x.fillStyle = T('#efeae0'); for (const [dx, dy, r] of [[-5, -14, 6], [2, -15, 7], [7, -12, 5], [-1, -10, 6]]) { x.beginPath(); x.arc(dx, dy, r, 0, 7); x.fill(); } x.fillStyle = T('#2a2420'); x.beginPath(); x.ellipse(12, -15 + Math.sin(t + s.x) * 0.8, 4, 3.4, 0, 0, 7); x.fill(); x.restore(); }
    branchTrainX(t) { const cyc = 40, u = (t % cyc) / cyc, e = v => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, v))); const pos = u < 0.5 ? e((u - 0.05) / 0.4) : 1 - e((u - 0.55) / 0.4); return { x: TRACK.x1 + 10 + pos * (3150 - TRACK.x1 - 200), dir: u < 0.5 ? 1 : -1 }; }
    drawTrain(x, px, py, dir, livery) {
      const P = this.P, body = LS.tint(livery), win = P.lit > 0.3 ? '#ffd88a' : LS.tint('#bfe3ec');
      x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(px, py - 2, 190, 8);
      for (let c = 0; c < 3; c++) { const cx = px + c * 64; x.fillStyle = body; x.beginPath(); x.roundRect ? x.roundRect(cx, py - 40, 62, 36, 7) : x.rect(cx, py - 40, 62, 36); x.fill();
        x.fillStyle = LS.tintS(livery); x.fillRect(cx, py - 40, 62, 6); x.fillStyle = LS.tint('#f2c230'); x.fillRect(cx, py - 14, 62, 3); x.fillStyle = win; for (let k = 0; k < 5; k++) x.fillRect(cx + 5 + k * 11.5, py - 31, 8, 9); x.fillStyle = LS.tint('#222'); x.fillRect(cx + 8, py - 4, 10, 4); x.fillRect(cx + 44, py - 4, 10, 4); }
      const nose = dir > 0 ? px + 190 : px - 4; x.fillStyle = LS.tint('#f2c230'); x.fillRect(nose, py - 40, 4, 36);
    }
    drawMainTrain(x, y) { const T = LS.tint; for (let c = 0; c < 5; c++) { const cy = y + c * 76; x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(3276, cy + 6, 50, 72); x.fillStyle = T('#6a2f6e'); x.beginPath(); x.roundRect ? x.roundRect(3270, cy, 50, 72, 8) : x.rect(3270, cy, 50, 72); x.fill(); x.fillStyle = T('#8a4f8e'); x.fillRect(3276, cy + 6, 38, 60); x.fillStyle = T('#f2c230'); x.fillRect(3270, cy + (this.mainTrain.dir > 0 ? 66 : 0), 50, 6); } }
    drawMarkers(x, t) {
      const f = this.focus;
      for (const e of this.visible()) {
        const top = e.y - (e.kind === 'npc' ? 80 : (e.h || 60)) + Math.sin(t * 3 + e.x) * 3;
        if (e.marker === 'call') { x.fillStyle = '#d8643a'; x.beginPath(); x.arc(e.x, top, 9, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '800 13px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('!', e.x, top + 5); }
        else if (e.marker === 'task') { x.fillStyle = '#e7b04a'; x.beginPath(); x.moveTo(e.x, top - 8); x.lineTo(e.x + 7, top); x.lineTo(e.x, top + 8); x.lineTo(e.x - 7, top); x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.stroke(); }
        else if (e.marker === 'note') { x.fillStyle = '#2c7c77'; x.beginPath(); x.arc(e.x, top, 8, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '800 10px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('i', e.x, top + 3.5); }
        if (e.kind === 'memo') { for (let k = 0; k < 4; k++) { const a = t * 2 + k * 1.57, rr = 9 + Math.sin(t * 3 + k) * 2; x.fillStyle = `rgba(255,236,170,${0.6 + 0.4 * Math.sin(t * 4 + k)})`; x.beginPath(); x.arc(e.x + Math.cos(a) * rr, e.y - 8 + Math.sin(a) * rr * 0.6, 1.8, 0, 7); x.fill(); } x.save(); x.translate(e.x, e.y - 6); x.rotate(0.3 + Math.sin(t) * 0.1); x.fillStyle = '#f7f1e7'; x.fillRect(-6, -4, 12, 9); x.fillStyle = '#b9a98a'; x.fillRect(-4, -2, 8, 1); x.fillRect(-4, 1, 8, 1); x.restore(); }
      }
      if (f && !this.paused) {
        const y = f.y - (f.kind === 'npc' ? 100 : (f.h || 60) + 22), label = (this.touch ? '' : 'E  ') + f.prompt;
        x.font = '700 11px Inter, sans-serif'; const w = x.measureText(label).width + 20;
        x.fillStyle = 'rgba(20,18,28,0.85)'; x.beginPath(); x.roundRect ? x.roundRect(f.x - w / 2, y - 12, w, 22, 11) : x.rect(f.x - w / 2, y - 12, w, 22); x.fill();
        x.fillStyle = '#f7f1e7'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, f.x, y); x.textBaseline = 'alphabetic';
      }
    }
    // Colour grade + weather + night lighting (screen space)
    grade(x, t) {
      const g = GRADE[this.cfg.time], S = this.S * this.dpr;
      x.setTransform(1, 0, 0, 1, 0, 0);
      if (g) { x.globalCompositeOperation = 'multiply'; x.fillStyle = rgba(g[0], g[1]); x.fillRect(0, 0, this.cv.width, this.cv.height); x.globalCompositeOperation = 'source-over'; }
      if (this.cfg.time === 'dawn' || this.cfg.time === 'dusk') { const lg = x.createLinearGradient(this.cfg.time === 'dawn' ? 0 : this.cv.width, 0, this.cfg.time === 'dawn' ? this.cv.width : 0, this.cv.height); lg.addColorStop(0, rgba(this.P.sun, 0.18)); lg.addColorStop(0.6, rgba(this.P.sun, 0)); x.globalCompositeOperation = 'screen'; x.fillStyle = lg; x.fillRect(0, 0, this.cv.width, this.cv.height); x.globalCompositeOperation = 'source-over'; }
      x.setTransform(S, 0, 0, S, 0, 0);
      this.drawWeather(x, t);
      if (this.cfg.time === 'night' || this.cfg.time === 'dusk') this.drawNight(x);
    }
    drawWeather(x, t) {
      const w = this.cfg.weather, vw = this.vw, vh = this.vh; if (w === 'clear') return;
      while (this.particles.length < (w === 'rain' ? 260 : 200)) this.particles.push({ x: Math.random() * vw, y: Math.random() * vh, z: 0.4 + Math.random() * 0.8, ph: Math.random() * 6 });
      if (w === 'rain') { x.strokeStyle = 'rgba(200,215,230,0.35)'; x.lineWidth = 1; x.beginPath(); for (const p of this.particles) { if (!this.reduced) { p.y += 12 * p.z; p.x -= 2.5 * p.z; } if (p.y > vh) { p.y = -20; p.x = Math.random() * vw * 1.2; } x.moveTo(p.x, p.y); x.lineTo(p.x - 3 * p.z, p.y + 13 * p.z); } x.stroke(); }
      else { x.fillStyle = 'rgba(245,248,255,0.85)'; for (const p of this.particles) { if (!this.reduced) { p.y += 0.8 * p.z; p.x += Math.sin(t + p.ph) * 0.4; } if (p.y > vh) { p.y = -5; p.x = Math.random() * vw; } x.beginPath(); x.arc(p.x, p.y, 1.1 * p.z + 0.4, 0, 7); x.fill(); } }
    }
    drawNight(x) {
      if (!this.dark) this.dark = document.createElement('canvas');
      const d = this.dark; if (d.width !== this.cv.width || d.height !== this.cv.height) { d.width = this.cv.width; d.height = this.cv.height; }
      const g = d.getContext('2d'), S = this.S * this.dpr, night = this.cfg.time === 'night';
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, d.width, d.height);
      g.fillStyle = night ? 'rgba(4,7,18,0.5)' : 'rgba(20,10,30,0.12)'; g.fillRect(0, 0, d.width, d.height);
      g.globalCompositeOperation = 'destination-out';
      const hole = (wx, wy, r) => { const sx = (wx - this.camX) * S, sy = (wy - this.camY) * S, R = r * S; if (sx < -R || sy < -R || sx > d.width + R || sy > d.height + R) return; const rg = g.createRadialGradient(sx, sy, 0, sx, sy, R); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(sx - R, sy - R, R * 2, R * 2); };
      hole(this.player.x, this.player.y - 30, 150);
      if (this.room === 'outside') { for (const [lx, ly] of [[330, 1310], [700, 1310], [1060, 1310], [1245, 1090], [1300, 970]]) hole(lx, ly, 120); for (const b of BUILDINGS) hole(b.x + b.w / 2, b.y - 40, 90); if (this.build >= 3) hole(2640, 1080, 260); if (this.build >= 4) for (let k = 0; k <= VIA.n; k += 2) hole(VIA.x1 + k * VIA.span, VIA.yS - 40, 70); }
      x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(d, 0, 0);
    }

    /* ============================== ROOMS ============================== */
    drawRoom(x, t) {
      const S = this.S * this.dpr, R = ROOMS[this.room], P = this.P, lit = P.lit, warm = c => mix(c, '#2a1d2a', 0.06 + lit * 0.14);
      x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#15121c'; x.fillRect(0, 0, this.cv.width, this.cv.height);
      x.setTransform(S, 0, 0, S, -this.camX * S, -this.camY * S);
      const W = R.w, H = R.h, wall = R.wall;
      x.save(); x.beginPath(); x.rect(0, 0, W, H); x.clip();
      if (this.room === 'cabin') {
        x.fillStyle = warm('#b8a88c'); x.fillRect(0, wall, W, H - wall); x.fillStyle = warm('#a89878'); for (let i = 0; i < W; i += 30) for (let j = wall; j < H; j += 30) if (((i + j) / 30) % 2 < 1) x.fillRect(i, j, 30, 30);
        x.fillStyle = warm('#c9d2cf'); x.fillRect(0, 0, W, wall); for (let i = 0; i < W; i += 40) { x.fillStyle = warm('#b9c3c0'); x.fillRect(i, 0, 2, wall); }
        x.fillStyle = warm('#7c8a86'); x.fillRect(0, wall - 6, W, 6);
        this.window(x, 40, 14, 150, 60);
        x.fillStyle = warm('#f3ecdf'); x.fillRect(220, 12, 160, 70); x.strokeStyle = warm('#9aa3a1'); x.lineWidth = 2; x.strokeRect(220, 12, 160, 70);
        const prog = this.chapter / 8; ['#7cc3e6', '#e9c46a', '#ef8a7a', '#9fb6f5', '#9ad3a8'].forEach((c, i) => { x.fillStyle = warm('#e2dccf'); x.fillRect(230, 20 + i * 12, 140, 7); x.fillStyle = warm(c); x.fillRect(230 + i * 16, 20 + i * 12, Math.max(6, 140 * prog - i * 16), 7); }); x.fillStyle = '#d8643a'; x.fillRect(230 + 140 * prog, 14, 2, 64);
        for (let k = 0; k < 3; k++) { x.fillStyle = warm(k === 1 ? '#f07a28' : '#8a9aa0'); x.fillRect(410 + k * 32, 14, 28, 80); x.fillStyle = warm('#3b3f44'); x.fillRect(430 + k * 32, 48, 3, 10); }
        x.fillStyle = warm('#3b3f44'); x.font = '700 8px Inter, sans-serif'; x.fillText('PPE', 452, 10);
        x.fillStyle = warm('#43565c'); x.fillRect(R.door[0], H - 10, R.door[1] - R.door[0], 10);
      } else {
        x.fillStyle = warm('#a67c50'); x.fillRect(0, wall, W, H - wall); for (let j = wall; j < H; j += 14) { x.fillStyle = warm(j % 28 ? '#9a7248' : '#b08658'); x.fillRect(0, j, W, 13); }
        x.fillStyle = warm('#e8dcc6'); x.fillRect(0, 0, W, wall); x.fillStyle = warm('#8a6a4a'); x.fillRect(0, wall - 30, W, 30);
        for (const wx of [40, 560, 660]) this.window(x, wx, 14, 70, 60, true);
        x.fillStyle = warm('#7a2e3b'); x.fillRect(250, 0, 260, wall); x.fillStyle = warm('#5a1e2b'); for (let i = 250; i < 510; i += 20) x.fillRect(i, 0, 7, wall);
        x.fillStyle = warm('#f3ecdf'); x.fillRect(160, 6, 440, 18); x.fillStyle = warm('#3a3431'); x.font = '700 10px Inter, sans-serif'; x.textAlign = 'center'; x.fillText(this.hallBanner || 'KESTREL VALE LINE', 380, 19); x.textAlign = 'left';
        if (this.chapter >= 6) for (let i = 0; i < 30; i++) { x.fillStyle = warm(['#d8643a', '#f2c230', '#2c7c77', '#f3ecdf'][i % 4]); x.beginPath(); x.moveTo(i * 26, 28); x.lineTo(i * 26 + 13, 28); x.lineTo(i * 26 + 6, 38); x.fill(); }
        x.fillStyle = warm('#3f2f28'); x.fillRect(R.door[0], H - 10, R.door[1] - R.door[0], 10);
      }
      x.restore();
      x.fillStyle = warm('#5a4a3a'); x.fillRect(0, 0, 14, H); x.fillRect(W - 14, 0, 14, H); x.fillRect(0, H - 12, R.door[0], 12); x.fillRect(R.door[1], H - 12, W - R.door[1], 12);
      const L = [], add = (y, fn) => L.push([y, fn]);
      if (this.room === 'cabin') {
        add(150, () => { x.fillStyle = warm('#8a6a4a'); x.fillRect(26, 118, 86, 32); x.fillStyle = warm('#e8e6e0'); x.fillRect(40, 100, 16, 20); x.fillStyle = warm('#d8643a'); x.fillRect(66, 110, 8, 8); });
        add(168, () => { x.fillStyle = warm('#5e7a68'); x.beginPath(); x.roundRect ? x.roundRect(158, 104, 66, 64, 10) : x.rect(158, 104, 66, 64); x.fill(); x.fillStyle = warm('#4e6a58'); x.fillRect(158, 150, 66, 18); });
        add(224, () => { x.fillStyle = warm('#8a6a4a'); x.fillRect(300, 186, 144, 38); x.fillStyle = warm('#2b2f36'); x.fillRect(340, 166, 40, 26); x.fillStyle = `rgba(150,210,230,${0.6 + 0.2 * Math.sin(t * 2)})`; x.fillRect(343, 169, 34, 18); x.fillStyle = warm('#f3ecdf'); x.fillRect(396, 192, 30, 20); });
      } else {
        add(168, () => { x.fillStyle = warm('#6b4a30'); x.fillRect(250, 110, 260, 58); x.fillStyle = warm('#5a3a20'); x.fillRect(250, 160, 260, 8); });
        add(164, () => { x.fillStyle = warm('#8a6a4a'); x.fillRect(40, 126, 102, 38); x.fillStyle = warm('#c0c4c8'); x.fillRect(70, 98, 24, 34); });
        for (const ry of [240, 290]) for (let c = 0; c < 8; c++) { const cx = (c < 4 ? 130 : 180) + c * 58; add(ry + 22, () => { x.fillStyle = warm('#5b6e73'); x.fillRect(cx, ry, 30, 20); x.fillRect(cx, ry - 16, 30, 6); }); }
      }
      for (const e of this.visible()) if (e.kind === 'npc') add(e.y, () => LS.drawPerson4(x, e.look, e.x, e.y, e.face || 'down', e.phase || 0, e.moving, {}));
      if (this.player.look) add(this.player.y, () => LS.drawPerson4(x, this.player.look, this.player.x, this.player.y, this.player.face, this.player.phase, this.player.moving, { ppe: this.ppe }));
      L.sort((a, b) => a[0] - b[0]); for (const [, fn] of L) fn();
      this.drawMarkers(x, t);
      x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = 'rgba(255,240,210,0.06)'; x.fillRect(0, 0, this.cv.width, this.cv.height);
    }
    window(x, px, py, w, h, arch) {
      const P = this.P; x.save(); x.beginPath(); if (arch) { x.moveTo(px, py + h); x.lineTo(px, py + w / 2); x.arc(px + w / 2, py + w / 2, w / 2, Math.PI, 0); x.lineTo(px + w, py + h); } else x.rect(px, py, w, h); x.closePath(); x.clip();
      const g = x.createLinearGradient(0, py, 0, py + h); g.addColorStop(0, P.top); g.addColorStop(1, P.hor); x.fillStyle = g; x.fillRect(px, py, w, h);
      x.fillStyle = P.mid1; x.beginPath(); x.moveTo(px, py + h); for (let s = 0; s <= w; s += 6) x.lineTo(px + s, py + h * (0.62 + 0.1 * Math.sin(s / 16))); x.lineTo(px + w, py + h); x.fill();
      x.restore(); x.strokeStyle = mix('#f3ecdf', P.near, 0.3); x.lineWidth = 3; x.strokeRect(px, py, w, h); x.lineWidth = 1.5; x.beginPath(); x.moveTo(px + w / 2, py); x.lineTo(px + w / 2, py + h); x.stroke();
    }

    /* ============================== OVERLAYS ============================== */
    drawOverlays(x, t) {
      const S = this.S * this.dpr, vw = this.vw, vh = this.vh;
      x.setTransform(S, 0, 0, S, 0, 0);
      const o = this.objective;
      if (o && !this.paused && !this.attract) {
        let tx, ty, label = o.label;
        if (o.room === this.room) { tx = o.x; ty = o.y; }
        else if (this.room === 'outside') { tx = DOORS[o.room].x; ty = DOORS[o.room].y; }
        else { const R = ROOMS[this.room]; tx = (R.door[0] + R.door[1]) / 2; ty = R.h; label = 'Exit'; }
        const sx = tx - this.camX, sy = ty - 40 - this.camY;
        if (sx < 20 || sx > vw - 20 || sy < 20 || sy > vh - 20) {
          const cx = vw / 2, cy = vh / 2, a = Math.atan2(sy - cy, sx - cx), m = 30;
          const ex = Math.max(m, Math.min(vw - m, cx + Math.cos(a) * vw)), ey = Math.max(m + 60, Math.min(vh - m - 70, cy + Math.sin(a) * vh));
          x.fillStyle = 'rgba(20,18,28,0.8)'; x.beginPath(); x.arc(ex, ey, 16, 0, 7); x.fill();
          x.save(); x.translate(ex, ey); x.rotate(a); x.fillStyle = '#e7b04a'; x.beginPath(); x.moveTo(8, 0); x.lineTo(-5, -7); x.lineTo(-5, 7); x.fill(); x.restore();
          x.font = '700 10px Inter, sans-serif'; const left = ex > vw / 2; x.textAlign = left ? 'right' : 'left'; x.fillStyle = '#f7f1e7'; x.fillText(label, left ? ex - 22 : ex + 22, ey + 4);
        }
      }
      const vg = x.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.4, vw / 2, vh / 2, Math.max(vw, vh) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,6,14,0.38)'); x.fillStyle = vg; x.fillRect(0, 0, vw, vh);
      if (!this.reduced) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 0.5; x.fillStyle = x.createPattern(this.grain, 'repeat'); x.save(); x.translate((t * 97) % 160, (t * 61) % 160); x.fillRect(-160, -160, this.cv.width + 320, this.cv.height + 320); x.restore(); x.globalAlpha = 1; }
      if (this.fade > 0) { x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = `rgba(8,6,14,${this.fade})`; x.fillRect(0, 0, this.cv.width, this.cv.height); }
    }
    snapshot(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const s = Math.max(w / this.cv.width, h / this.cv.height), dw = this.cv.width * s, dh = this.cv.height * s; x.drawImage(this.cv, (w - dw) / 2, (h - dh) * 0.5, dw, dh); return c; }
  }
  function hash2(a, b) { return Math.abs(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1; }
  function distToPath(px, py, pts) { let best = 1e9; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; let u = ((px - ax) * dx + (py - ay) * dy) / l2; u = Math.max(0, Math.min(1, u)); const d = Math.hypot(px - ax - u * dx, py - ay - u * dy); if (d < best) best = d; } return best; }
  LS.World = World;
  LS.WORLD = { MAP, VIA, PIER4, ROOMS, DOORS, BUILDINGS, riverX, TRACK, FOOTBRIDGE };
})();
