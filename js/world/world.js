/* LINESIDE — the open world (top-down 3/4 view, Canvas 2D).
 *
 * The Kestrel Vale, free to roam in any direction:
 *   Harrowby (SW) · Station Road → Harrowby station, the depot (Marjorie's shed) and the project office ·
 *   the worn-out branch line running east over the little Beck Bridge, through the Crag Lane level crossing,
 *   to Kestrel Junction and the live main line · the beck valley (ford, packhorse bridge) ·
 *   woods, fell and Kestrel Crag (N) · Moira's cottage · farmland (S).
 *
 * The world obeys engineering logic. The old trackbed is closed and unsafe: you can walk it only once you've
 * had your site induction and are wearing PPE. The Crag Lane crossing is a public road, so it's always open.
 * The depot interior (with Marjorie) also needs PPE. Later chapters make the line live again, and then
 * nobody walks on it at all: you cross at the level crossing.
 */
window.LS = window.LS || {};
(function () {
  const { PAL, SEASON, mix, rgba, rng, pine } = LS.art;
  const MAP = { W: 3450, H: 2300 };
  const riverX = y => 1800 + 46 * Math.sin(y / 260) + 18 * Math.sin(y / 97);
  const CROSS = { ford: [1450, 1492], packhorse: [1985, 2032] };
  const TRACK = { y1: 880, y2: 922, x1: 1300, x2: 3250 };
  const BRIDGE = { x1: 1725, x2: 1865, H: 62 };
  const CROSSING = [2585, 2625];
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
    { id: 'depot', f: 'depot', x: 1410, y: 1075, w: 260, d: 116, k: 1 },
    { id: 'office', f: 'cabin', label: 'PROJECT OFFICE', x: 1420, y: 1240, w: 195, d: 66, k: 1.3 },
    { id: 'signalbox', f: 'signalbox', x: 3120, y: 1010, w: 78, d: 50, k: 1.3 },
    { id: 'moira', f: 'cottage', v: 3, x: 1570, y: 560, w: 99, d: 60, k: 1.1 },
    { id: 'farm', f: 'cottage', v: 0, x: 560, y: 2080, w: 99, d: 60, k: 1.1 }
  ];
  const DOORS = { office: { x: 1568, y: 1240 }, shed: { x: 1636, y: 1075 }, hall: { x: 1083, y: 1302 } };
  const ROOMS = {
    office: { w: 520, h: 330, wall: 96, door: [230, 290], exitTo: { x: 1568, y: 1264 }, name: 'the project office' },
    hall: { w: 760, h: 440, wall: 110, door: [350, 410], exitTo: { x: 1083, y: 1322 }, name: 'the village hall' },
    shed: { w: 900, h: 430, wall: 120, door: [420, 480], exitTo: { x: 1636, y: 1098 }, name: 'the depot' }
  };
  const PATHS = [
    { id: 'high', w: 64, c: 'tarmac', p: [[40, 1335], [1300, 1335]] },
    { id: 'station', w: 40, c: 'tarmac', p: [[1150, 1335], [1235, 1200], [1270, 1030]] },
    { id: 'yard', w: 30, c: 'gravel', p: [[1270, 1045], [1400, 1105], [1636, 1092]] },
    { id: 'officepath', w: 26, c: 'gravel', p: [[1235, 1200], [1330, 1262], [1568, 1262]] },
    { id: 'farm', w: 24, c: 'gravel', p: [[760, 1370], [760, 1760], [640, 2100]] },
    { id: 'valley', w: 20, c: 'path', p: [[1290, 1340], [1480, 1400], [1640, 1462], [1800, 1472], [1960, 1455], [2150, 1385], [2380, 1290], [2605, 1250]] },
    { id: 'moira', w: 18, c: 'path', p: [[1120, 1010], [1180, 820], [1400, 700], [1600, 600]] },
    { id: 'lane', w: 30, c: 'tarmac', p: [[2605, 1250], [2605, 700]] },
    { id: 'crag', w: 18, c: 'path', p: [[2605, 700], [2520, 620], [2420, 340]] },
    { id: 'junction', w: 18, c: 'path', p: [[2605, 1040], [2900, 1060], [3150, 1060]] },
    { id: 'packhorse', w: 18, c: 'path', p: [[760, 1760], [1300, 1880], [1700, 2005], [1900, 2010], [2300, 1900], [2650, 1650], [2605, 1250]] }
  ];

  class World {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.cfg = { time: 'dawn', season: 'spring', weather: 'clear', build: 0, train: false };
      this.chapter = 0; this.entities = []; this.room = 'outside'; this.ppe = false; this.flags = {};
      this.player = { x: 1290, y: 1100, face: 'down', phase: 0, moving: false, target: null, look: null };
      this.keys = {}; this.stick = { x: 0, y: 0 }; this.paused = true; this.reduced = false;
      this.camX = 0; this.camY = 0; this.t0 = performance.now(); this.last = this.t0;
      this.fade = 0; this.fadeDir = 0; this.fadeCb = null; this.particles = []; this.objective = null; this.focus = null;
      this.touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      this.onInteract = null; this.onEnterRoom = null; this.onBlocked = null; this.lastBlock = 0;
      this.mainTrain = { y: -9999, next: 6, dir: 1 }; this.grain = this.makeGrain(); this.fx = [];
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
    // A short-lived speech bubble or effect in world space (e.g. Marjorie's "peep")
    pop(room, x, y, text, secs) { this.fx.push({ room, x, y, text, until: performance.now() + (secs || 1.6) * 1000, t0: performance.now() }); }

    // ---------- Configuration ----------
    set(cfg) {
      this.cfg = Object.assign({ weather: 'clear', train: false }, cfg); this.P = PAL[this.cfg.time] || PAL.day;
      this.particles = []; this.populate(); this.buildCollision();
    }
    get build() { return this.cfg.build | 0; }
    // The branch line: 'closed' (worn out, walkable with PPE) until it's reopened, then 'live'
    lineState() { return this.build >= 5 ? 'live' : 'closed'; }
    populate() {
      const r = rng(9);
      this.trees = [];
      const ok = (x, y) => {
        if (x < 40 || x > 3230 || y < 150 || y > 2270) return false;
        if (Math.abs(x - riverX(y)) < 70) return false;
        if (y > 836 && y < 1010 && x > 1150 && x < 3260) return false;           // the line and its cess
        if (x > 1360 && x < 1745 && y > 900 && y < 1300) return false;            // station yard, depot, office
        if (x > 2540 && x < 2680 && y > 860 && y < 1300) return false;            // Crag Lane and the crossing
        if (x > 100 && x < 1320 && y > 1180 && y < 1700) return false;
        if (x > 120 && x < 1380 && y > 1690 && y < 2260) return false;
        for (const p of PATHS) if (distToPath(x, y, p.p) < p.w / 2 + 22) return false;
        for (const b of BUILDINGS) if (x > b.x - 30 && x < b.x + b.w + 30 && y > b.y - b.d - 40 && y < b.y + 30) return false;
        return true;
      };
      const addForest = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); if (ok(x, y)) this.trees.push({ x, y, h: 44 + r() * 50, k: r() }); } };
      addForest(60, 160, 3200, 800, 260);         // northern woods and fell edge
      addForest(2200, 1320, 3220, 2260, 160);     // south-east woods
      addForest(1380, 1100, 2250, 2260, 120);     // valley sides
      addForest(1900, 1000, 3200, 1320, 70);      // lineside woods east of the beck
      addForest(40, 1150, 120, 2260, 30); addForest(1350, 1150, 1480, 1700, 20);
      this.trees.sort((a, b) => a.y - b.y);
      this.sheep = []; for (let i = 0; i < 9; i++) this.sheep.push({ x: 200 + r() * 1050, y: 1760 + r() * 460, t: r() * 5, dx: 0, dy: 0, face: r() < 0.5 ? -1 : 1 });
      this.cloudShadows = []; for (let i = 0; i < 7; i++) this.cloudShadows.push({ x: r() * MAP.W, y: r() * MAP.H, w: 300 + r() * 400, h: 160 + r() * 200, s: 8 + r() * 10 });
      this.flock = { x: -200, y: 700, t: 0 };
      this.sleepers = []; for (let s = TRACK.x1 + 4; s < TRACK.x2; s += 9) this.sleepers.push({ s, h: hash2(s, 3), rot: (s > 1490 && s < 1570) ? 0.8 : hash2(s, 11) });
    }
    buildCollision() {
      const C = 10, gw = Math.ceil(MAP.W / C), gh = Math.ceil(MAP.H / C), g = new Uint8Array(gw * gh);
      const rect = (x0, y0, x1, y1, v) => { for (let gy = Math.max(0, Math.floor(y0 / C)); gy < Math.min(gh, Math.ceil(y1 / C)); gy++) for (let gx = Math.max(0, Math.floor(x0 / C)); gx < Math.min(gw, Math.ceil(x1 / C)); gx++) g[gy * gw + gx] = v; };
      rect(0, 0, MAP.W, 130, 1); rect(0, MAP.H - 30, MAP.W, MAP.H, 1); rect(0, 0, 30, MAP.H, 1); rect(3250, 0, MAP.W, MAP.H, 1);
      // the beck, with its two old crossings
      for (let y = 0; y < MAP.H; y += C) {
        const cross = (y >= CROSS.ford[0] && y <= CROSS.ford[1]) || (y >= CROSS.packhorse[0] && y <= CROSS.packhorse[1]);
        if (!cross) { const cx = riverX(y); rect(cx - 30, y, cx + 30, y + C, 1); }
      }
      // the branch line: conditional (2) along its length, including the Beck Bridge deck; the level crossing is a public road
      rect(TRACK.x1, TRACK.y1, TRACK.x2, TRACK.y2, this.lineState() === 'live' ? 3 : 2);
      rect(CROSSING[0], TRACK.y1, CROSSING[1], TRACK.y2, 0);
      rect(BRIDGE.x1 - 6, TRACK.y2, BRIDGE.x2 + 6, TRACK.y2 + BRIDGE.H, 1);   // the bridge's south face and wing walls
      rect(TRACK.x1 - 20, TRACK.y1 + 6, TRACK.x1 - 6, TRACK.y2 - 6, 1);       // buffer stop
      for (const b of BUILDINGS) rect(b.x + 4, b.y - b.d, b.x + b.w - 4, b.y - 4, 1);
      for (const t of this.trees) rect(t.x - 6, t.y - 6, t.x + 6, t.y + 2, 1);
      rect(2636, 952, 2676, 972, 1);                                           // the parked car on Crag Lane
      // field hedges with gaps
      rect(120, 1700, 700, 1710, 1); rect(820, 1700, 1380, 1710, 1); rect(120, 1700, 130, 2260, 1); rect(1370, 1700, 1380, 1820, 1); rect(1370, 1940, 1380, 2260, 1);
      this.grid = g; this.gw = gw; this.C = C;
      // rooms
      this.roomGrid = {};
      for (const [id, R] of Object.entries(ROOMS)) {
        const rgw = Math.ceil(R.w / C), rgh = Math.ceil(R.h / C), rg = new Uint8Array(rgw * rgh);
        const rr = (x0, y0, x1, y1) => { for (let gy = Math.max(0, Math.floor(y0 / C)); gy < Math.min(rgh, Math.ceil(y1 / C)); gy++) for (let gx = Math.max(0, Math.floor(x0 / C)); gx < Math.min(rgw, Math.ceil(x1 / C)); gx++) rg[gy * rgw + gx] = 1; };
        rr(0, 0, R.w, R.wall + 10); rr(0, 0, 14, R.h); rr(R.w - 14, 0, R.w, R.h); rr(0, R.h - 12, R.door[0], R.h); rr(R.door[1], R.h - 12, R.w, R.h);
        if (id === 'office') { rr(26, 118, 112, 150); rr(158, 116, 224, 168); rr(300, 186, 444, 224); }
        else if (id === 'hall') { rr(250, 110, 510, 168); rr(40, 126, 142, 164); for (const ry of [240, 290]) { rr(120, ry, 355, ry + 22); rr(405, ry, 640, ry + 22); } }
        else { rr(96, 140, 806, 240); rr(812, 180, 886, 236); rr(36, 318, 108, 346); }
        this.roomGrid[id] = { g: rg, w: rgw };
      }
    }
    blockedAt(x, y) {
      if (this.room !== 'outside') { const R = this.roomGrid[this.room]; const gx = Math.floor(x / this.C), gy = Math.floor(y / this.C); if (x < 0 || y < 0 || x >= ROOMS[this.room].w || y >= ROOMS[this.room].h) return 1; return R.g[gy * R.w + gx] ? 1 : 0; }
      const v = this.grid[Math.floor(y / this.C) * this.gw + Math.floor(x / this.C)];
      if (v === 2) return this.ppe ? 0 : 'line_closed';
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
      if (this.attract) { const t = (performance.now() - this.t0) / 1000, u = 0.5 + 0.5 * Math.sin(t * 0.04 - 1.4); return [1150 + u * 1400 - this.vw / 2 + 300, 760 + Math.sin(t * 0.03) * 120 - this.vh / 2 + 250]; }
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
      for (const s of this.sheep) { s.t -= dt; if (s.t <= 0) { s.t = 2 + Math.random() * 5; const a = Math.random() * 6.28, m = Math.random() < 0.5 ? 0 : 14; s.dx = Math.cos(a) * m; s.dy = Math.sin(a) * m * 0.6; if (s.dx) s.face = s.dx > 0 ? 1 : -1; } const nx = s.x + s.dx * dt, ny = s.y + s.dy * dt; if (nx > 150 && nx < 1350 && ny > 1730 && ny < 2240) { s.x = nx; s.y = ny; } }
      for (const c of this.cloudShadows) { c.x += c.s * dt * (this.reduced ? 0 : 1); if (c.x > MAP.W + 400) c.x = -500; }
      this.flock.x += 90 * dt; if (this.flock.x > MAP.W + 300) { this.flock.x = -300; this.flock.y = 300 + Math.random() * 1500; }
      let best = null, bd = 58;
      if (!this.paused) for (const e of this.visible()) { if (!e.prompt) continue; const d = Math.hypot(e.x - p.x, (e.y - p.y) * 1.3); if (d < bd) { bd = d; best = e; } }
      this.focus = best;
      const [tx, ty] = this.camTarget(), k = Math.min(1, dt * (this.attract ? 1 : 6));
      this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
      if (this.fadeDir) { this.fade += this.fadeDir * dt * 3.2; if (this.fade >= 1) { this.fade = 1; this.fadeDir = -1; if (this.fadeCb) { this.fadeCb(); this.fadeCb = null; } } if (this.fade <= 0 && this.fadeDir < 0) { this.fade = 0; this.fadeDir = 0; } }
      const mt = this.mainTrain; mt.next -= dt; if (mt.next <= 0 && mt.y < -2000) { mt.dir = Math.random() < 0.5 ? 1 : -1; mt.y = mt.dir > 0 ? -300 : MAP.H + 300; mt.next = 22 + Math.random() * 16; }
      if (mt.y > -2000) { mt.y += mt.dir * 620 * dt; if (mt.y > MAP.H + 400 || mt.y < -400) mt.y = -9999; }
      const now = performance.now(); this.fx = this.fx.filter(f => f.until > now);
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
      const S = this.S * this.dpr, cx = this.camX, cy = this.camY, vw = this.vw, vh = this.vh, P = this.P;
      const season = this.cfg.season, winter = season === 'winter', veg = SEASON[season];
      const x0 = cx - 80, x1 = cx + vw + 80, y0 = cy - 120, y1 = cy + vh + 260;
      x.setTransform(S, 0, 0, S, -cx * S, -cy * S);
      const grass = winter ? '#dfe6ec' : mix({ spring: '#7aa65e', summer: '#86a94f', autumn: '#a1964f', winter: '#dfe6ec' }[season], P.near, LIGHT[this.cfg.time] * 0.6);
      x.fillStyle = grass; x.fillRect(x0, y0, x1 - x0, y1 - y0);
      const fell = x.createLinearGradient(0, 0, 0, 480); fell.addColorStop(0, winter ? '#e8edf2' : mix('#8a7a6a', grass, 0.35)); fell.addColorStop(1, rgba(grass, 0));
      x.fillStyle = fell; x.fillRect(x0, 0, x1 - x0, 480);
      for (let gx = Math.floor(x0 / 120) * 120; gx < x1; gx += 120) for (let gy = Math.floor(y0 / 120) * 120; gy < y1; gy += 120) {
        const h = hash2(gx, gy); x.fillStyle = rgba(h < 0.5 ? '#ffffff' : '#1c2a14', winter ? 0.035 : 0.03 + h * 0.02);
        x.beginPath(); x.ellipse(gx + h * 80, gy + (1 - h) * 80, 70 + h * 50, 34 + h * 20, h, 0, 7); x.fill();
      }
      if (y1 > 1700) for (const [fx0, fx1, col] of [[130, 700, '#b9a55c'], [700, 1100, '#7f9a52'], [1100, 1370, '#a3b35e']]) {
        const c = winter ? '#e6ebef' : season === 'autumn' ? mix(col, '#9c6a3a', 0.35) : col;
        x.fillStyle = mix(c, P.near, LIGHT[this.cfg.time] * 0.6); x.fillRect(fx0, 1710, fx1 - fx0, 550);
        x.strokeStyle = rgba('#3a3020', 0.12); x.lineWidth = 3; for (let yy = 1730; yy < 2250; yy += 16) { x.beginPath(); x.moveTo(fx0 + 6, yy); x.lineTo(fx1 - 6, yy); x.stroke(); }
      }
      // the beck valley: slopes and floor
      const vg = x.createLinearGradient(1400, 0, 2200, 0);
      vg.addColorStop(0, rgba(P.fg, 0)); vg.addColorStop(0.12, rgba(P.fg, 0.16)); vg.addColorStop(0.2, rgba('#1e3a2a', 0.1)); vg.addColorStop(0.8, rgba('#1e3a2a', 0.1)); vg.addColorStop(0.88, rgba(P.fg, 0.16)); vg.addColorStop(1, rgba(P.fg, 0));
      x.fillStyle = vg; x.fillRect(1400, Math.max(y0, 1000), 800, y1 - Math.max(y0, 1000));
      // station yard hardstanding
      x.fillStyle = mix('#b9ae98', P.near, 0.15); x.fillRect(1372, 926, 340, 356);
      x.fillStyle = rgba('#5a5040', 0.12); for (let k = 0; k < 40; k++) { const h = hash2(k, 77); x.fillRect(1380 + h * 320, 960 + hash2(k, 5) * 300, 10 + h * 20, 2); }
      x.fillStyle = mix(grass, '#5f8a4a', 0.25); x.beginPath(); x.ellipse(960, 1440, 170, 70, 0, 0, 7); x.fill();
      for (const p of PATHS) this.drawPath(x, p, winter);
      this.drawRiver(x, t, y0, y1, winter);
      this.drawTrackbed(x, t, winter);
      const flowers = season === 'spring' || season === 'summer';
      for (let gx = Math.floor(x0 / 26) * 26; gx < x1; gx += 26) for (let gy = Math.floor(y0 / 26) * 26; gy < y1; gy += 26) {
        const h = hash2(gx * 1.3, gy * 0.7); if (h < 0.55) continue;
        const px = gx + h * 20, py = gy + (h * 37 % 1) * 20; if (this.onSurface(px, py)) continue;
        x.strokeStyle = rgba(winter ? '#9fb0bf' : '#2a3a1a', 0.35); x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 2, py - 6); x.moveTo(px + 3, py); x.lineTo(px + 4, py - 5); x.stroke();
        if (flowers && h > 0.93) { x.fillStyle = ['#f3ecdf', '#f2c230', '#d8566a', '#b48fd8'][Math.floor(h * 1000) % 4]; x.beginPath(); x.arc(px + 1, py - 7, 2, 0, 7); x.fill(); }
      }
      if (this.cfg.time !== 'night') for (const c of this.cloudShadows) { x.fillStyle = 'rgba(20,30,40,0.07)'; x.beginPath(); x.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, 7); x.fill(); }

      // ---- sorted objects ----
      const L = [];
      const add = (y, fn) => L.push([y, fn]);
      for (const tr of this.trees) if (tr.x > x0 - 60 && tr.x < x1 + 60 && tr.y > y0 && tr.y < y1 + 60) add(tr.y, () => this.drawTree(x, tr, winter, veg));
      for (const b of BUILDINGS) if (b.x + b.w > x0 && b.x < x1 && b.y > y0 && b.y - 260 < y1) add(b.y, () => this.drawBuilding(x, b));
      if (x1 > BRIDGE.x1 - 40 && x0 < BRIDGE.x2 + 40 && y1 > TRACK.y2 - 20 && y0 < TRACK.y2 + BRIDGE.H + 20) add(TRACK.y2, () => this.drawBridge(x, t));
      this.decor(add, x0, x1, y0, y1, t);
      for (const s of this.sheep) if (s.x > x0 && s.x < x1 && s.y > y0 && s.y < y1) add(s.y, () => this.drawSheep(x, s, t));
      for (const e of this.visible()) {
        if (e.kind === 'npc' && e.x > x0 - 40 && e.x < x1 + 40) add(e.y, () => LS.drawPerson4(x, e.look, e.x, e.y, e.face || 'down', e.phase || 0, e.moving, { work: e.work, wave: e.wave }));
        else if (e.kind === 'cat') add(e.y, () => this.drawCat(x, e.x, e.y, t));
      }
      if (this.player.look && !this.attract) add(this.player.y, () => LS.drawPerson4(x, this.player.look, this.player.x, this.player.y, this.player.face, this.player.phase, this.player.moving, { ppe: this.ppe, lamp: this.cfg.time === 'night' }));
      if (this.cfg.train && this.lineState() === 'live') { const tr = this.branchTrainX(t); add(TRACK.y2 - 6, () => this.drawTrain(x, tr.x, TRACK.y2 - 8, tr.dir, '#2f5e44')); }
      if (this.mainTrain.y > -2000) add(this.mainTrain.y + 200, () => this.drawMainTrain(x, this.mainTrain.y));
      L.sort((a, b) => a[0] - b[0]); for (const [, fn] of L) fn();
      if (this.cfg.time !== 'night' && this.cfg.weather === 'clear') { for (let i = 0; i < 6; i++) { const bx = this.flock.x - i * 24, by = this.flock.y + (i % 2) * 14 + Math.sin(t * 2 + i) * 4, w = Math.sin(t * 9 + i) * 3; x.strokeStyle = 'rgba(30,26,40,0.7)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(bx - 5, by + w); x.lineTo(bx, by + 2); x.lineTo(bx + 5, by + w); x.stroke(); x.fillStyle = 'rgba(0,0,0,0.08)'; x.beginPath(); x.ellipse(bx, by + 160, 4, 1.5, 0, 0, 7); x.fill(); } }
      this.drawMarkers(x, t);
      this.grade(x, t);
    }
    onSurface(px, py) {
      if (py > TRACK.y1 - 8 && py < TRACK.y2 + 8 && px > TRACK.x1 - 20 && px < TRACK.x2) return true;
      if (Math.abs(px - riverX(py)) < 40) return true;
      if (px > 1372 && px < 1712 && py > 926 && py < 1282) return true;
      for (const p of PATHS) if (distToPath(px, py, p.p) < p.w / 2 + 3) return true;
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
      if (b > CROSS.ford[0] && a < CROSS.ford[1]) { const yy = (CROSS.ford[0] + CROSS.ford[1]) / 2; for (let k = -2; k <= 2; k++) { x.fillStyle = mix('#a39c90', P.near, 0.15); x.beginPath(); x.ellipse(riverX(yy) + k * 12, yy + (k % 2) * 4, 7, 5, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(riverX(yy) + k * 12 - 6, yy + (k % 2) * 4 + 3, 12, 2); } }
    }
    // The branch line. Chapter 1: worn out — rusty bullhead rail, rotten sleepers, weeds, a flooded drain.
    drawTrackbed(x, t, winter) {
      const P = this.P, live = this.lineState() === 'live', T = LS.tint;
      // formation and ballast
      x.fillStyle = mix(live ? '#8d877c' : '#857a66', P.near, 0.12); x.fillRect(TRACK.x1, TRACK.y1, TRACK.x2 - TRACK.x1, TRACK.y2 - TRACK.y1);
      x.fillStyle = rgba('#3a3020', 0.18); x.fillRect(TRACK.x1, TRACK.y2 - 4, TRACK.x2 - TRACK.x1, 4);
      // bridge parapet on the north side (the south face is drawn as an object)
      const stone = mix(P.stone, P.near, 0.08);
      x.fillStyle = mix(stone, '#ffffff', 0.08); x.fillRect(BRIDGE.x1 - 8, TRACK.y1 - 9, BRIDGE.x2 - BRIDGE.x1 + 16, 9);
      x.fillStyle = mix(stone, P.near, 0.3); x.fillRect(BRIDGE.x1 - 8, TRACK.y1 - 2, BRIDGE.x2 - BRIDGE.x1 + 16, 2);
      if (!live) { x.fillStyle = mix('#857a66', P.near, 0.12); x.fillRect(BRIDGE.x1 + 58, TRACK.y1 - 9, 14, 6); } // missing coping stones
      // siding into the depot
      x.strokeStyle = mix(live ? '#b8bcc1' : '#8a5a3e', P.near, 0.1); x.lineWidth = 2;
      for (const o of [0, 14]) { x.beginPath(); x.moveTo(1336, TRACK.y2 - 8 + o * 0.2); x.quadraticCurveTo(1420, TRACK.y2 + 4 + o, 1470, 962 + o * 0.3); x.stroke(); }
      // sleepers
      const x0 = Math.max(TRACK.x1, this.camX - 60), x1 = Math.min(TRACK.x2, this.camX + this.vw + 60);
      for (const sl of this.sleepers) {
        if (sl.s < x0 || sl.s > x1) continue;
        if (sl.s > CROSSING[0] && sl.s < CROSSING[1]) continue;
        const rotten = !live && sl.rot > 0.7;
        x.fillStyle = mix(live ? '#5a4a3a' : rotten ? '#8a6a48' : '#4e4032', P.near, 0.1);
        if (rotten) { x.fillRect(sl.s, TRACK.y1 + 5, 4, 12); x.fillRect(sl.s + 1, TRACK.y1 + 21, 3, 11); }
        else x.fillRect(sl.s, TRACK.y1 + 5, 4, 30);
      }
      // rails (rusty bullhead while closed)
      const railC = mix(live ? '#b8bcc1' : '#8a5a3e', P.near, 0.1);
      for (const ry of [TRACK.y1 + 11, TRACK.y1 + 26]) {
        x.fillStyle = railC; x.fillRect(TRACK.x1, ry, TRACK.x2 - TRACK.x1, 2.4);
        if (!live) { x.fillStyle = rgba('#c98a5a', 0.5); x.fillRect(TRACK.x1, ry, TRACK.x2 - TRACK.x1, 0.8); x.fillStyle = mix('#3a3430', P.near, 0.1); for (let s = TRACK.x1 + 60; s < TRACK.x2; s += 120) x.fillRect(s, ry - 1, 1.5, 4.4); }
      }
      // weeds everywhere while closed
      if (!live) for (let s = Math.floor(x0 / 7) * 7; s < x1; s += 7) { const h = hash2(s, 1); if (h < 0.45) { x.fillStyle = mix(h < 0.2 ? '#6f8f4c' : '#56773f', P.near, 0.2); x.beginPath(); x.arc(s, TRACK.y1 + 4 + h * 80 % 36, 2 + h * 5, 0, 7); x.fill(); } }
      // the blocked drain by the bridge: a puddle with a duck in it
      if (!live && x0 < 1720 && x1 > 1660) {
        x.fillStyle = mix('#7fa9c2', P.near, 0.25); x.beginPath(); x.ellipse(1690, TRACK.y1 + 20, 24, 10, 0, 0, 7); x.fill();
        x.fillStyle = rgba('#ffffff', 0.25); x.beginPath(); x.ellipse(1684, TRACK.y1 + 17, 10, 3, 0, 0, 7); x.fill();
        const bob = Math.sin(t * 2) * 0.8, dx = 1694 + Math.sin(t * 0.4) * 8;
        x.fillStyle = T('#8a6a48'); x.beginPath(); x.ellipse(dx, TRACK.y1 + 19 + bob, 5.5, 3.4, 0, 0, 7); x.fill();
        x.fillStyle = T('#2f6b4a'); x.beginPath(); x.arc(dx + 5, TRACK.y1 + 15 + bob, 2.6, 0, 7); x.fill();
        x.fillStyle = T('#e7b53a'); x.fillRect(dx + 7, TRACK.y1 + 15 + bob, 3, 1.4);
      }
      // the Crag Lane level crossing: road across the line
      x.fillStyle = mix('#4a4d54', P.near, 0.1); x.fillRect(CROSSING[0], TRACK.y1 - 4, CROSSING[1] - CROSSING[0], TRACK.y2 - TRACK.y1 + 8);
      x.fillStyle = railC; for (const ry of [TRACK.y1 + 11, TRACK.y1 + 26]) x.fillRect(CROSSING[0], ry, CROSSING[1] - CROSSING[0], 2);
      x.fillStyle = 'rgba(240,235,220,.7)'; for (const yy of [TRACK.y1 - 10, TRACK.y2 + 8]) for (let k = 0; k < 4; k++) x.fillRect(CROSSING[0] + 4 + k * 9, yy, 5, 2);
      // buffer stop
      x.fillStyle = mix('#6b5a48', P.near, 0.1); x.fillRect(TRACK.x1 - 18, TRACK.y1 + 8, 10, 26);
      x.fillStyle = '#b8433f'; x.fillRect(TRACK.x1 - 18, TRACK.y1 + 8, 10, 5);
      x.fillStyle = '#c23b4a'; x.beginPath(); x.arc(TRACK.x1 - 13, TRACK.y1 + 6, 2.5, 0, 7); x.fill();
      // the main line (always live)
      x.fillStyle = mix('#8d877c', P.near, 0.12); x.fillRect(3262, 0, 76, MAP.H);
      this.railsV(x, 3280); this.railsV(x, 3318);
      x.fillStyle = mix('#6b6f74', P.near, 0.1); for (let y = 0; y < MAP.H; y += 30) x.fillRect(3248, y, 3, 20);
      // old junction points, rusted and clipped out of use
      x.strokeStyle = mix(live ? '#a9adb2' : '#8a5a3e', P.near, 0.1); x.lineWidth = 2; for (const o of [0, 15]) { x.beginPath(); x.moveTo(3150, TRACK.y1 + 11 + o); x.quadraticCurveTo(3236, TRACK.y1 + 11 + o, 3266 + o * 0.5, TRACK.y1 + 80 + o); x.stroke(); }
    }
    railsV(x, px) { x.fillStyle = mix('#5a4a3a', this.P.near, 0.1); for (let y = 0; y < MAP.H; y += 8) x.fillRect(px - 5, y, 22, 4); x.fillStyle = mix('#b8bcc1', this.P.near, 0.1); x.fillRect(px, 0, 2.2, MAP.H); x.fillRect(px + 12, 0, 2.2, MAP.H); }
    // Beck Bridge: a small three-arch stone bridge (1874) carrying the line over the beck
    drawBridge(x, t) {
      const P = this.P, stone = LS.tint(P.stone), stoneS = LS.tintS(P.stone), stoneL = mix(stone, '#ffffff', 0.12), H = BRIDGE.H;
      const w = BRIDGE.x2 - BRIDGE.x1, n = 3, sp = w / n, pw = 10, r = (sp - pw) / 2, cyA = 14 + r;
      x.save(); x.translate(0, TRACK.y2);
      x.fillStyle = mix('#2e4a36', P.near, 0.45); x.fillRect(BRIDGE.x1, 10, w, H - 10);
      const rx = riverX(TRACK.y2 + H); x.fillStyle = this.cfg.time === 'night' ? '#223a55' : mix('#4f8fb2', P.near, 0.4); x.fillRect(rx - 30, H - 22, 60, 22);
      x.fillStyle = 'rgba(255,255,255,.35)'; for (let k = 0; k < 3; k++) x.fillRect(rx - 20 + ((t * 20 + k * 17) % 40), H - 14 + k * 4, 8, 1.2);
      for (let k = 0; k < n; k++) {
        const L = BRIDGE.x1 + k * sp, R = L + sp, c = L + sp / 2;
        x.beginPath(); x.moveTo(L - 1, 0); x.lineTo(R + 1, 0); x.lineTo(R + 1, H); x.lineTo(c + r, H); x.lineTo(c + r, cyA); x.arc(c, cyA, r, 0, Math.PI, true); x.lineTo(c - r, H); x.lineTo(L - 1, H); x.closePath(); x.fillStyle = stone; x.fill();
        x.strokeStyle = stoneL; x.lineWidth = 2.5; x.beginPath(); x.arc(c, cyA, r + 1.5, Math.PI, 0); x.stroke();
      }
      // wing walls
      x.fillStyle = stoneS; x.beginPath(); x.moveTo(BRIDGE.x1 - 6, 0); x.lineTo(BRIDGE.x1, 0); x.lineTo(BRIDGE.x1, H); x.lineTo(BRIDGE.x1 - 22, H); x.fill();
      x.beginPath(); x.moveTo(BRIDGE.x2 + 6, 0); x.lineTo(BRIDGE.x2, 0); x.lineTo(BRIDGE.x2, H); x.lineTo(BRIDGE.x2 + 22, H); x.fill();
      x.fillStyle = rgba(stoneS, 0.18); for (let y = 6; y < H; y += 6) x.fillRect(BRIDGE.x1, y, w, 1);
      // south parapet (feet of anyone on the deck disappear behind it)
      x.fillStyle = stoneL; x.fillRect(BRIDGE.x1 - 8, -10, w + 16, 10); x.fillStyle = stoneS; x.fillRect(BRIDGE.x1 - 8, -2, w + 16, 3);
      if (this.lineState() !== 'live') {
        // loose stones, a sapling in the mortar, water stains, scour at the middle pier
        x.fillStyle = mix('#857a66', P.near, 0.12); x.fillRect(BRIDGE.x1 + 92, -10, 12, 5);
        x.fillStyle = rgba('#1c1a18', 0.22); for (const sx of [BRIDGE.x1 + 30, BRIDGE.x1 + 108]) x.fillRect(sx, 6, 5, 26);
        const mx = BRIDGE.x1 + sp * 1.5; x.strokeStyle = LS.tint('#5a4030'); x.lineWidth = 1.5; x.beginPath(); x.moveTo(mx + 12, 8); x.lineTo(mx + 18, -6); x.stroke();
        x.fillStyle = LS.tint('#6f9a4c'); for (const [a, b] of [[16, -8], [20, -10], [22, -5], [14, -4]]) { x.beginPath(); x.arc(mx + a, b, 3, 0, 7); x.fill(); }
        x.fillStyle = rgba('#1c2a3a', 0.35); x.beginPath(); x.ellipse(BRIDGE.x1 + sp * 2 - 1, H - 2, 12, 3, 0, 0, 7); x.fill();
      }
      x.restore();
    }
    drawTree(x, tr, winter, veg) {
      const P = this.P, col = mix(mix('#2f5a3a', veg.veg, veg.mix * 0.8), P.near, 0.25 + tr.k * 0.2 + LIGHT[this.cfg.time] * 0.6);
      x.fillStyle = 'rgba(0,0,0,0.18)'; x.beginPath(); x.ellipse(tr.x + 6, tr.y + 2, tr.h * 0.28, tr.h * 0.1, 0, 0, 7); x.fill();
      if (tr.k > 0.72 && !winter) {
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
      switch (b.f) {
        case 'cottage': bld.cottage(x, b.x, b.v || 0, lit); break;
        case 'school': bld.school(x, b.x, lit); break;
        case 'bakery': bld.bakery(x, b.x, lit, !!this.flags.bakeryBusy); break;
        case 'pub': bld.pub(x, b.x, lit); break;
        case 'hall': bld.hall(x, b.x, lit); break;
        case 'church': bld.church(x, b.x, lit); break;
        case 'station': bld.station(x, b.x, B, lit, B >= 5); break;
        case 'depot': bld.depot(x, b.x, lit); break;
        case 'cabin': bld.cabin(x, b.x, Math.max(lit, 0.3), b.label); break;
        case 'signalbox': bld.signalbox(x, b.x, lit); break;
      }
      x.restore();
      if (b.id === 'moira') { x.fillStyle = LS.tint('#f3ecdf'); x.fillRect(b.x + 20, b.y - 10, 60, 2); x.fillStyle = LS.tint('#3a3431'); x.font = '700 8px Inter, sans-serif'; x.fillText('BECK COTTAGE', b.x + 22, b.y + 12); }
    }
    decor(add, x0, x1, y0, y1, t) {
      const bld = LS.bld, P = this.P, lit = P.lit, T = LS.tint, live = this.lineState() === 'live';
      const at = (px, py, fn) => { if (px > x0 - 200 && px < x1 + 200 && py > y0 - 40 && py < y1 + 260) add(py, () => { x.save(); x.translate(0, py); fn(); x.restore(); }); };
      const x = this.ctx;
      for (const [lx, ly] of [[330, 1372], [700, 1372], [1060, 1372], [1245, 1150], [1300, 1030], [1700, 1110]]) at(lx, ly, () => bld.lamp(x, lx, lit));
      at(760, 1372, () => bld.busstop(x, 760)); at(905, 1395, () => bld.noticeboard(x, 905)); at(1000, 1450, () => bld.bench(x, 1000));
      at(760, 1305, () => bld.bench(x, 760)); at(1314, 1040, () => bld.bench(x, 1314));
      at(riverX(2008), 2034, () => this.packhorse(x, riverX(2008)));
      at(1330, 1190, () => bld.van(x, 1330));                                 // Tom's van in the yard
      at(1666, 1182, () => { for (let r = 0; r < 4; r++) { x.fillStyle = T(r % 2 ? '#5a4632' : '#6b5238'); x.fillRect(1630 + r * 3, -7 - r * 6, 64 - r * 6, 6); } });   // a stack of old sleepers
      at(2420, 340, () => bld.bench(x, 2400));
      for (const [sx, sy] of [[3080, 870]]) at(sx, sy, () => bld.signal(x, sx, this.mainTrain.y > -2000 ? 'r' : 'g'));
      // station gate sign: "temporarily closed"
      if (!live) at(1392, 1026, () => { x.fillStyle = T('#3b3f44'); x.fillRect(1392, -30, 2, 30); x.fillRect(1420, -30, 2, 30); x.fillStyle = T('#f3ecdf'); x.fillRect(1386, -44, 42, 18); x.fillStyle = T('#b8433f'); x.fillRect(1386, -44, 42, 4); x.fillStyle = T('#3a3431'); x.font = '700 4.2px Inter, sans-serif'; x.fillText('STATION TEMPORARILY', 1388, -34); x.fillText('CLOSED · 2009', 1394, -29); });
      // vegetation on the line: a bus-shelter-sized buddleia, a sapling, and a shopping trolley
      if (!live) {
        at(2372, 906, () => { for (const [a, b, r] of [[0, -18, 14], [-12, -10, 10], [12, -12, 11], [-4, -30, 10], [8, -28, 9]]) { x.fillStyle = T('#4f7a3c'); x.beginPath(); x.arc(2372 + a, b, r, 0, 7); x.fill(); } x.fillStyle = T('#a36fc4'); for (const [a, b] of [[-8, -30], [6, -36], [14, -20], [-16, -16], [0, -22]]) { x.beginPath(); x.ellipse(2372 + a, b, 2.5, 6, 0.3, 0, 7); x.fill(); } });
        at(2352, 900, () => { x.fillStyle = T('#5a4030'); x.fillRect(2351, -26, 2, 26); x.fillStyle = T('#6f9a4c'); for (const [a, b] of [[0, -28], [-5, -22], [5, -22]]) { x.beginPath(); x.arc(2352 + a, b, 5, 0, 7); x.fill(); } });
        at(2402, 916, () => { x.strokeStyle = T('#a9adb2'); x.lineWidth = 1; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(2394 + k * 4, -16); x.lineTo(2396 + k * 4, -6); x.stroke(); } x.strokeRect(2393, -17, 17, 11); x.beginPath(); x.moveTo(2410, -17); x.lineTo(2414, -21); x.stroke(); x.fillStyle = T('#2d2f33'); x.beginPath(); x.arc(2396, -2, 1.8, 0, 7); x.arc(2408, -2, 1.8, 0, 7); x.fill(); });
      }
      // Crag Lane crossing furniture: dead warning lights, rusted-open gates, St Andrew's crosses, a parked car and a post box
      at(2578, 878, () => this.crossingPost(x, 2578, live));
      at(2634, 934, () => this.crossingPost(x, 2634, live));
      at(2560, 936, () => { x.fillStyle = T(live ? '#f3ecdf' : '#b89a84'); x.fillRect(2518, -12, 58, 5); x.fillRect(2518, -4, 58, 3); x.fillStyle = T('#b8433f'); x.beginPath(); x.arc(2547, -9, 3.5, 0, 7); x.fill(); x.fillStyle = T('#3b3f44'); x.fillRect(2574, -16, 3, 16); });
      at(2656, 970, () => { x.fillStyle = T('#b8433f'); x.beginPath(); x.roundRect ? x.roundRect(2636, -22, 40, 16, 5) : x.rect(2636, -22, 40, 16); x.fill(); x.fillStyle = T('#8a2e30'); x.fillRect(2636, -10, 40, 4); x.fillStyle = T('#bfe3ec'); x.fillRect(2644, -20, 10, 6); x.fillRect(2658, -20, 10, 6); x.fillStyle = T('#222'); x.beginPath(); x.arc(2644, -5, 4, 0, 7); x.arc(2668, -5, 4, 0, 7); x.fill(); });
      at(2572, 968, () => { x.fillStyle = T('#c23b2f'); x.beginPath(); x.roundRect ? x.roundRect(2566, -22, 12, 22, [6, 6, 0, 0]) : x.rect(2566, -22, 12, 22); x.fill(); x.fillStyle = T('#1b1e25'); x.fillRect(2568, -15, 8, 1.5); });
      // the junction end: "branch closed" stop board
      if (!live) at(3222, 930, () => { x.fillStyle = T('#3b3f44'); x.fillRect(3230, -28, 2, 28); x.fillStyle = T('#b8433f'); x.fillRect(3220, -40, 22, 14); x.fillStyle = T('#f3ecdf'); x.font = '700 4px Inter, sans-serif'; x.fillText('BRANCH', 3223, -34); x.fillText('CLOSED', 3223, -29); });
    }
    crossingPost(x, px, live) {
      const T = LS.tint; x.fillStyle = T('#2d2f33'); x.fillRect(px, -46, 2.5, 46);
      x.fillStyle = T('#f3ecdf'); x.save(); x.translate(px + 1, -50); for (const a of [0.7, -0.7]) { x.save(); x.rotate(a); x.fillRect(-10, -1.5, 20, 3); x.restore(); } x.restore();
      x.fillStyle = T('#1b1e25'); x.fillRect(px - 9, -38, 20, 8);
      const on = live && Math.floor(performance.now() / 500) % 2;
      for (const k of [0, 1]) { x.fillStyle = live ? (on === k ? '#ff4a3d' : '#5a2a2a') : T('#6b6f74'); x.beginPath(); x.arc(px - 4 + k * 10, -34, 2.6, 0, 7); x.fill(); }
      x.fillStyle = T('#f2c230'); x.fillRect(px - 3, -24, 9, 7);
    }
    packhorse(x, cx) { const P = this.P, stone = LS.tint(P.stone); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(cx - 50, -4, 100, 8); x.fillStyle = stone; x.beginPath(); x.moveTo(cx - 52, 0); x.quadraticCurveTo(cx, -44, cx + 52, 0); x.lineTo(cx + 52, -10); x.quadraticCurveTo(cx, -56, cx - 52, -10); x.fill(); x.fillStyle = LS.tintS(P.stone); x.beginPath(); x.arc(cx, 2, 16, Math.PI, 0); x.fill(); }
    drawSheep(x, s, t) { const T = LS.tint; x.save(); x.translate(s.x, s.y); x.scale(s.face, 1); x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(0, 0, 12, 3.5, 0, 0, 7); x.fill(); x.fillStyle = T('#2a2420'); x.fillRect(-7, -8, 2.5, 8); x.fillRect(5, -8, 2.5, 8); x.fillStyle = T('#efeae0'); for (const [dx, dy, r] of [[-5, -14, 6], [2, -15, 7], [7, -12, 5], [-1, -10, 6]]) { x.beginPath(); x.arc(dx, dy, r, 0, 7); x.fill(); } x.fillStyle = T('#2a2420'); x.beginPath(); x.ellipse(12, -15 + Math.sin(t + s.x) * 0.8, 4, 3.4, 0, 0, 7); x.fill(); x.restore(); }
    // Sleeper, the depot cat: ginger, round, usually asleep
    drawCat(x, px, py, t) {
      const T = LS.tint, breathe = Math.sin(t * 1.6) * 0.6;
      x.save(); x.translate(px, py);
      x.fillStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.ellipse(0, 0, 13, 3, 0, 0, 7); x.fill();
      x.fillStyle = T('#d9894a'); x.beginPath(); x.ellipse(0, -7, 12, 7 + breathe * 0.3, 0, 0, 7); x.fill();
      x.strokeStyle = T('#d9894a'); x.lineWidth = 3.4; x.lineCap = 'round'; x.beginPath(); x.moveTo(10, -4); x.quadraticCurveTo(16, -2, 12, 2); x.quadraticCurveTo(4, 3, -4, 1); x.stroke();
      x.fillStyle = T('#b86a32'); for (const sx of [-4, 0, 4]) x.fillRect(sx, -13, 2, 5);
      x.fillStyle = T('#d9894a'); x.beginPath(); x.arc(-10, -9, 5.5, 0, 7); x.fill();
      x.beginPath(); x.moveTo(-14, -12); x.lineTo(-13, -18); x.lineTo(-10, -13); x.fill(); x.beginPath(); x.moveTo(-9, -13); x.lineTo(-6, -17); x.lineTo(-6, -11); x.fill();
      x.strokeStyle = T('#5a3a20'); x.lineWidth = 1; x.beginPath(); x.moveTo(-13, -9); x.lineTo(-11, -8.5); x.moveTo(-9, -9); x.lineTo(-7, -8.5); x.stroke();
      if (!this.reduced) { x.fillStyle = 'rgba(247,241,231,.8)'; x.font = '700 7px Inter, sans-serif'; const z = (t * 0.6) % 1; x.globalAlpha = 1 - z; x.fillText('z', -6 + z * 6, -22 - z * 10); x.globalAlpha = 1; }
      x.restore();
    }
    branchTrainX(t) { const cyc = 40, u = (t % cyc) / cyc, e = v => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, v))); const pos = u < 0.5 ? e((u - 0.05) / 0.4) : 1 - e((u - 0.55) / 0.4); return { x: TRACK.x1 + 10 + pos * (3150 - TRACK.x1 - 200), dir: u < 0.5 ? 1 : -1 }; }
    drawTrain(x, px, py, dir, livery) {
      const P = this.P, body = LS.tint(livery), win = P.lit > 0.3 ? '#ffd88a' : LS.tint('#bfe3ec');
      x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(px, py - 2, 130, 8);
      for (let c = 0; c < 2; c++) { const cx = px + c * 64; x.fillStyle = body; x.beginPath(); x.roundRect ? x.roundRect(cx, py - 40, 62, 36, 7) : x.rect(cx, py - 40, 62, 36); x.fill();
        x.fillStyle = LS.tint('#f3ecdf'); x.fillRect(cx, py - 14, 62, 2); x.fillStyle = win; for (let k = 0; k < 5; k++) x.fillRect(cx + 5 + k * 11.5, py - 31, 8, 9); x.fillStyle = LS.tint('#222'); x.fillRect(cx + 8, py - 4, 10, 4); x.fillRect(cx + 44, py - 4, 10, 4); }
      const nose = dir > 0 ? px + 126 : px - 4; x.fillStyle = LS.tint('#f2c230'); x.fillRect(nose, py - 40, 4, 36);
    }
    drawMainTrain(x, y) { const T = LS.tint; for (let c = 0; c < 5; c++) { const cy = y + c * 76; x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(3276, cy + 6, 50, 72); x.fillStyle = T('#6a2f6e'); x.beginPath(); x.roundRect ? x.roundRect(3270, cy, 50, 72, 8) : x.rect(3270, cy, 50, 72); x.fill(); x.fillStyle = T('#8a4f8e'); x.fillRect(3276, cy + 6, 38, 60); x.fillStyle = T('#f2c230'); x.fillRect(3270, cy + (this.mainTrain.dir > 0 ? 66 : 0), 50, 6); } }
    drawMarkers(x, t) {
      const f = this.focus;
      for (const e of this.visible()) {
        const top = e.y - (e.kind === 'npc' ? 80 : (e.h || 60)) + Math.sin(t * 3 + e.x) * 3;
        if (e.marker === 'call') { x.fillStyle = '#d8643a'; x.beginPath(); x.arc(e.x, top, 9, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '800 13px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('!', e.x, top + 5); }
        else if (e.marker === 'task') { x.fillStyle = '#e7b04a'; x.beginPath(); x.moveTo(e.x, top - 8); x.lineTo(e.x + 7, top); x.lineTo(e.x, top + 8); x.lineTo(e.x - 7, top); x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.stroke(); }
        else if (e.marker === 'find') { const pr = 0.5 + 0.5 * Math.sin(t * 4 + e.x); x.strokeStyle = `rgba(231,176,74,${0.5 + 0.5 * pr})`; x.lineWidth = 2; x.beginPath(); x.arc(e.x, top, 7 + pr * 2, 0, 7); x.stroke(); x.fillStyle = '#e7b04a'; x.font = '800 10px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('?', e.x, top + 3.5); }
        else if (e.marker === 'done') { x.fillStyle = 'rgba(93,138,110,.92)'; x.beginPath(); x.arc(e.x, top + 4, 6.5, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1.8; x.beginPath(); x.moveTo(e.x - 3, top + 4); x.lineTo(e.x - 0.5, top + 6.5); x.lineTo(e.x + 3.5, top + 1.5); x.stroke(); }
        else if (e.marker === 'note') { x.fillStyle = '#2c7c77'; x.beginPath(); x.arc(e.x, top, 8, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '800 10px Inter, sans-serif'; x.textAlign = 'center'; x.fillText('i', e.x, top + 3.5); }
        if (e.kind === 'memo') { for (let k = 0; k < 4; k++) { const a = t * 2 + k * 1.57, rr = 9 + Math.sin(t * 3 + k) * 2; x.fillStyle = `rgba(255,236,170,${0.6 + 0.4 * Math.sin(t * 4 + k)})`; x.beginPath(); x.arc(e.x + Math.cos(a) * rr, e.y - 8 + Math.sin(a) * rr * 0.6, 1.8, 0, 7); x.fill(); } x.save(); x.translate(e.x, e.y - 6); x.rotate(0.3 + Math.sin(t) * 0.1); x.fillStyle = '#f7f1e7'; x.fillRect(-6, -4, 12, 9); x.fillStyle = '#b9a98a'; x.fillRect(-4, -2, 8, 1); x.fillRect(-4, 1, 8, 1); x.restore(); }
      }
      // speech bubbles / effects
      const now = performance.now();
      for (const fx of this.fx) { if (fx.room !== this.room) continue; const u = (now - fx.t0) / (fx.until - fx.t0); x.globalAlpha = Math.min(1, (1 - u) * 3); x.font = 'italic 700 12px Fraunces, Georgia, serif'; const w = x.measureText(fx.text).width + 16, yy = fx.y - u * 14; x.fillStyle = '#f7f1e7'; x.beginPath(); x.roundRect ? x.roundRect(fx.x - w / 2, yy - 14, w, 20, 10) : x.rect(fx.x - w / 2, yy - 14, w, 20); x.fill(); x.fillStyle = '#1b1e25'; x.textAlign = 'center'; x.fillText(fx.text, fx.x, yy); x.globalAlpha = 1; }
      if (f && !this.paused) {
        const y = f.y - (f.kind === 'npc' ? 100 : (f.h || 60) + 22), label = (this.touch ? '' : 'E  ') + f.prompt;
        x.font = '700 11px Inter, sans-serif'; const w = x.measureText(label).width + 20;
        x.fillStyle = 'rgba(20,18,28,0.85)'; x.beginPath(); x.roundRect ? x.roundRect(f.x - w / 2, y - 12, w, 22, 11) : x.rect(f.x - w / 2, y - 12, w, 22); x.fill();
        x.fillStyle = '#f7f1e7'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, f.x, y); x.textBaseline = 'alphabetic';
      }
      x.textAlign = 'left';
    }
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
      if (this.room === 'outside') { for (const [lx, ly] of [[330, 1310], [700, 1310], [1060, 1310], [1245, 1090], [1300, 970], [1700, 1050]]) hole(lx, ly, 120); for (const b of BUILDINGS) hole(b.x + b.w / 2, b.y - 40, 90); }
      x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(d, 0, 0);
    }

    /* ============================== ROOMS ============================== */
    drawRoom(x, t) {
      const S = this.S * this.dpr, R = ROOMS[this.room], P = this.P, lit = P.lit, warm = c => mix(c, '#2a1d2a', 0.06 + lit * 0.14);
      x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#15121c'; x.fillRect(0, 0, this.cv.width, this.cv.height);
      x.setTransform(S, 0, 0, S, -this.camX * S, -this.camY * S);
      const W = R.w, H = R.h, wall = R.wall;
      x.save(); x.beginPath(); x.rect(0, 0, W, H); x.clip();
      if (this.room === 'office') {
        x.fillStyle = warm('#b8a88c'); x.fillRect(0, wall, W, H - wall); x.fillStyle = warm('#a89878'); for (let i = 0; i < W; i += 30) for (let j = wall; j < H; j += 30) if (((i + j) / 30) % 2 < 1) x.fillRect(i, j, 30, 30);
        x.fillStyle = warm('#c9d2cf'); x.fillRect(0, 0, W, wall); for (let i = 0; i < W; i += 40) { x.fillStyle = warm('#b9c3c0'); x.fillRect(i, 0, 2, wall); }
        x.fillStyle = warm('#7c8a86'); x.fillRect(0, wall - 6, W, 6);
        this.window(x, 40, 14, 150, 60);
        // the planning board: sticky notes in two lanes
        x.fillStyle = warm('#f3ecdf'); x.fillRect(214, 10, 172, 76); x.strokeStyle = warm('#9aa3a1'); x.lineWidth = 2; x.strokeRect(214, 10, 172, 76);
        const planned = this.flags.planned;
        for (let k = 0; k < 5; k++) { x.fillStyle = warm(planned ? '#f4a67a' : '#f4d27a'); x.fillRect(222 + k * 32 + (planned ? 0 : (k * 7) % 11), 18 + (planned ? 0 : (k * 13) % 9), 24, 16); }
        for (let k = 0; k < 4; k++) { x.fillStyle = warm(planned ? '#8fd0c4' : '#f4d27a'); x.fillRect(222 + k * 40 + (planned ? 0 : (k * 5) % 13), 52 + (planned ? 0 : (k * 11) % 10), 30, 16); }
        x.fillStyle = warm('#3a3431'); x.font = '700 6px Inter, sans-serif'; x.fillText('MARJORIE', 220, 16); x.fillText('TRACK', 220, 50);
        if (planned) { x.strokeStyle = '#d8643a'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(222, 78); x.lineTo(380, 78); x.stroke(); x.fillStyle = '#d8643a'; x.fillText('CRITICAL PATH', 330, 84); }
        for (let k = 0; k < 3; k++) { x.fillStyle = warm(k === 1 ? '#f07a28' : '#8a9aa0'); x.fillRect(410 + k * 32, 14, 28, 80); x.fillStyle = warm('#3b3f44'); x.fillRect(430 + k * 32, 48, 3, 10); }
        x.fillStyle = warm('#f2c230'); x.fillRect(446, 24, 12, 6); x.fillStyle = warm('#3b3f44'); x.font = '700 8px Inter, sans-serif'; x.fillText('PPE', 452, 10);
        x.fillStyle = warm('#43565c'); x.fillRect(R.door[0], H - 10, R.door[1] - R.door[0], 10);
      } else if (this.room === 'hall') {
        x.fillStyle = warm('#a67c50'); x.fillRect(0, wall, W, H - wall); for (let j = wall; j < H; j += 14) { x.fillStyle = warm(j % 28 ? '#9a7248' : '#b08658'); x.fillRect(0, j, W, 13); }
        x.fillStyle = warm('#e8dcc6'); x.fillRect(0, 0, W, wall); x.fillStyle = warm('#8a6a4a'); x.fillRect(0, wall - 30, W, 30);
        for (const wx of [40, 560, 660]) this.window(x, wx, 14, 70, 60, true);
        x.fillStyle = warm('#7a2e3b'); x.fillRect(250, 0, 260, wall); x.fillStyle = warm('#5a1e2b'); for (let i = 250; i < 510; i += 20) x.fillRect(i, 0, 7, wall);
        x.fillStyle = warm('#f3ecdf'); x.fillRect(150, 6, 460, 18); x.fillStyle = warm('#3a3431'); x.font = '700 10px Inter, sans-serif'; x.textAlign = 'center'; x.fillText(this.hallBanner || 'KESTREL VALE LINE', 380, 19); x.textAlign = 'left';
        x.fillStyle = warm('#3f2f28'); x.fillRect(R.door[0], H - 10, R.door[1] - R.door[0], 10);
      } else {
        // the depot: brick walls, the big doors, roof lights, a concrete floor with the road running through
        x.fillStyle = warm('#8f8a82'); x.fillRect(0, wall, W, H - wall);
        x.fillStyle = warm('#85807a'); for (let i = 0; i < W; i += 60) x.fillRect(i, wall, 1, H - wall); for (let j = wall; j < H; j += 60) x.fillRect(0, j, W, 1);
        x.fillStyle = rgba('#3a3430', 0.18); x.beginPath(); x.ellipse(620, 330, 60, 14, 0.1, 0, 7); x.fill(); x.beginPath(); x.ellipse(260, 360, 40, 9, 0, 0, 7); x.fill();
        x.fillStyle = warm('#8a4e3c'); x.fillRect(0, 0, W, wall); x.fillStyle = warm('#7a4232'); for (let j = 4; j < wall; j += 8) x.fillRect(0, j, W, 1);
        for (const wx of [60, 240, 620, 800]) { x.fillStyle = `rgba(220,235,245,${0.35 + lit * 0.2})`; x.beginPath(); x.moveTo(wx, 70); x.lineTo(wx, 30); x.arc(wx + 20, 30, 20, Math.PI, 0); x.lineTo(wx + 40, 70); x.fill(); x.strokeStyle = warm('#e3d6bf'); x.lineWidth = 2; x.stroke(); }
        x.fillStyle = warm('#3d5a3a'); x.fillRect(380, 10, 140, wall - 10); x.fillStyle = warm('#2f4a2e'); x.fillRect(449, 10, 2, wall - 10);
        x.fillStyle = warm('#e3d6bf'); x.fillRect(376, 6, 148, 5);
        x.fillStyle = warm('#f3ecdf'); x.fillRect(560, 76, 110, 20); x.fillStyle = warm('#b8433f'); x.font = '700 7px Inter, sans-serif'; x.fillText('DAYS SINCE LAST', 568, 85); x.fillText('INCIDENT: 6,213', 568, 93);
        // rails into the shed, running under Marjorie
        x.fillStyle = warm('#5a5048'); for (let s = 20; s < W; s += 16) x.fillRect(s, 226, 6, 18);
        x.fillStyle = warm('#9aa0a6'); x.fillRect(0, 230, W, 2.4); x.fillRect(0, 240, W, 2.4);
        x.fillStyle = warm('#43565c'); x.fillRect(R.door[0], H - 10, R.door[1] - R.door[0], 10);
      }
      x.restore();
      x.fillStyle = warm('#5a4a3a'); x.fillRect(0, 0, 14, H); x.fillRect(W - 14, 0, 14, H); x.fillRect(0, H - 12, R.door[0], 12); x.fillRect(R.door[1], H - 12, W - R.door[1], 12);
      const L = [], add = (y, fn) => L.push([y, fn]);
      if (this.room === 'office') {
        add(150, () => { x.fillStyle = warm('#8a6a4a'); x.fillRect(26, 118, 86, 32); x.fillStyle = warm('#e8e6e0'); x.fillRect(40, 100, 16, 20); x.fillStyle = warm('#d8643a'); x.fillRect(66, 110, 8, 8); x.fillStyle = warm('#f3ecdf'); x.fillRect(84, 108, 6, 10); x.fillRect(92, 110, 6, 8); });
        add(168, () => { x.fillStyle = warm('#5e7a68'); x.beginPath(); x.roundRect ? x.roundRect(158, 104, 66, 64, 10) : x.rect(158, 104, 66, 64); x.fill(); x.fillStyle = warm('#4e6a58'); x.fillRect(158, 150, 66, 18); });
        add(224, () => { x.fillStyle = warm('#8a6a4a'); x.fillRect(300, 186, 144, 38); x.fillStyle = warm('#2b2f36'); x.fillRect(340, 166, 40, 26); x.fillStyle = `rgba(150,210,230,${0.6 + 0.2 * Math.sin(t * 2)})`; x.fillRect(343, 169, 34, 18); x.fillStyle = warm('#f3ecdf'); x.fillRect(396, 192, 30, 20); x.fillStyle = warm('#e8e6e0'); x.fillRect(306, 194, 20, 14); });
      } else if (this.room === 'hall') {
        add(168, () => { x.fillStyle = warm('#6b4a30'); x.fillRect(250, 110, 260, 58); x.fillStyle = warm('#5a3a20'); x.fillRect(250, 160, 260, 8); if (this.flags.panel) { x.fillStyle = warm('#f3ecdf'); x.fillRect(262, 114, 236, 8); for (const cx of [300, 368, 436]) { x.fillStyle = warm('#ffffff'); x.fillRect(cx, 124, 10, 8); x.fillStyle = warm('#d8c7a0'); x.fillRect(cx + 16, 126, 18, 12); } } else { x.fillStyle = warm('#d8b36a'); x.beginPath(); x.ellipse(380, 124, 22, 6, 0, 0, 7); x.fill(); x.fillStyle = warm('#e8c98a'); for (let k = 0; k < 8; k++) { x.beginPath(); x.arc(366 + k * 4, 122 - (k % 2) * 2, 2.6, 0, 7); x.fill(); } } });
        add(164, () => { x.fillStyle = warm('#8a6a4a'); x.fillRect(40, 126, 102, 38); x.fillStyle = warm('#c0c4c8'); x.fillRect(70, 98, 24, 34); });
        for (const ry of [240, 290]) for (let c = 0; c < 8; c++) { const cx = (c < 4 ? 130 : 180) + c * 58; add(ry + 22, () => { x.fillStyle = warm('#5b6e73'); x.fillRect(cx, ry, 30, 20); x.fillRect(cx, ry - 16, 30, 6); }); }
      } else {
        add(236, () => this.drawMarjorie(x, t, warm));
        add(236, () => { x.fillStyle = warm('#6b4a30'); x.fillRect(812, 196, 74, 40); x.fillStyle = warm('#5a3a20'); x.fillRect(812, 230, 74, 6); x.fillStyle = warm('#2b2f36'); x.fillRect(820, 184, 20, 14); x.fillStyle = warm('#d8643a'); x.fillRect(846, 188, 10, 10); x.fillStyle = warm('#f3ecdf'); x.fillRect(862, 186, 16, 12); if (!this.reduced && Math.sin(t * 5) > 0) { x.fillStyle = 'rgba(247,241,231,.7)'; x.font = '700 8px Inter, sans-serif'; x.fillText('♪', 822 + Math.sin(t) * 4, 178 - (t * 8) % 10); } });
        add(346, () => { for (let k = 0; k < 4; k++) { x.fillStyle = warm(k % 2 ? '#3d5a8a' : '#4a6a9a'); x.fillRect(36 + (k % 2) * 4, 318 + k * 7 - 14, 72, 8); } });
      }
      for (const e of this.visible()) {
        if (e.kind === 'npc') add(e.y, () => LS.drawPerson4(x, e.look, e.x, e.y, e.face || 'down', e.phase || 0, e.moving, {}));
        else if (e.kind === 'cat') add(e.y, () => this.drawCat(x, e.x, e.y, t));
      }
      if (this.player.look) add(this.player.y, () => LS.drawPerson4(x, this.player.look, this.player.x, this.player.y, this.player.face, this.player.phase, this.player.moving, { ppe: this.ppe }));
      L.sort((a, b) => a[0] - b[0]); for (const [, fn] of L) fn();
      this.drawMarkers(x, t);
      x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = 'rgba(255,240,210,0.06)'; x.fillRect(0, 0, this.cv.width, this.cv.height);
    }
    // Marjorie: a 1961 diesel railcar, side on, standing on the depot road. Rails at y≈236.
    drawMarjorie(x, t, warm) {
      const X0 = 100, X1 = 800, top = 112, base = 206, green = warm('#2f5e44'), greenS = warm('#264d38'), f = this.flags;
      // bogies and wheels
      for (const bc of [212, 690]) {
        x.fillStyle = warm('#2b2d31'); x.fillRect(bc - 58, 206, 116, 14);
        x.fillStyle = warm('#44474d'); for (const s of [-30, 30]) { x.fillRect(bc + s - 8, 208, 16, 8); }
        for (const wo of [-34, 34]) { x.fillStyle = warm('#1d1f23'); x.beginPath(); x.arc(bc + wo, 222, 13, 0, 7); x.fill(); x.fillStyle = warm('#6b6f74'); x.beginPath(); x.arc(bc + wo, 222, 5, 0, 7); x.fill(); x.fillStyle = warm('#8a5a3e'); x.fillRect(bc + wo - 13, 233, 26, 2); }
      }
      // underframe: engines, gearboxes, fuel tank
      x.fillStyle = warm('#1f2226'); x.fillRect(X0 + 10, base, X1 - X0 - 20, 6);
      x.fillStyle = warm('#34373c'); x.fillRect(320, 210, 100, 16); x.fillRect(452, 210, 100, 16); x.fillStyle = warm('#44474d'); x.fillRect(578, 210, 44, 12);
      x.fillStyle = warm('#4a4d52'); for (let k = 0; k < 6; k++) x.fillRect(328 + k * 14, 212, 8, 3);
      // body
      x.fillStyle = green; x.beginPath(); x.roundRect ? x.roundRect(X0, top, X1 - X0, base - top, [18, 18, 4, 4]) : x.rect(X0, top, X1 - X0, base - top); x.fill();
      x.fillStyle = greenS; x.fillRect(X0, base - 16, X1 - X0, 16);
      x.fillStyle = warm('#e8dcb8'); x.fillRect(X0 + 4, base - 20, X1 - X0 - 8, 2); x.fillRect(X0 + 4, top + 16, X1 - X0 - 8, 1.5);
      // roof
      x.fillStyle = warm('#6b6f74'); x.beginPath(); x.roundRect ? x.roundRect(X0 + 6, top - 8, X1 - X0 - 12, 12, 6) : x.rect(X0 + 6, top - 8, X1 - X0 - 12, 12); x.fill();
      x.fillStyle = warm('#4a4d52'); for (const ex of [372, 506]) { x.fillRect(ex, top - 16, 8, 10); }
      // cab end (left): speed whiskers and cab windows
      x.fillStyle = warm('#e7c23a'); x.beginPath(); x.moveTo(X0, base - 22); x.lineTo(X0 + 26, base - 22); x.lineTo(X0 + 12, base - 6); x.lineTo(X0, base - 6); x.fill();
      x.fillStyle = warm('#bfd2d6'); x.fillRect(X0 + 10, top + 22, 28, 22); x.fillRect(X0 + 44, top + 22, 20, 22);
      x.fillStyle = f.cabDone ? warm('#ffe9a8') : warm('#d9d4c8'); x.beginPath(); x.arc(X0 + 8, base - 30, 4, 0, 7); x.fill();
      // saloon windows
      for (let wx = 180; wx < 700; wx += 42) { if (wx > 380 && wx < 420) continue; x.fillStyle = warm('#9fb6bd'); x.fillRect(wx, top + 22, 34, 26); x.fillStyle = rgba('#ffffff', 0.18); x.fillRect(wx + 2, top + 24, 10, 22); x.fillStyle = rgba('#3a3020', 0.25); x.fillRect(wx, top + 42, 34, 6); }
      // doors
      x.strokeStyle = warm('#1f3a2a'); x.lineWidth = 1.2; for (const dx of [150, 392, 720]) { x.strokeRect(dx, top + 18, 24, base - top - 22); x.fillStyle = warm('#9fb6bd'); x.fillRect(dx + 5, top + 24, 14, 18); }
      // guard's van window (with Kevin the pigeon, until he's shown the door)
      x.fillStyle = warm('#9fb6bd'); x.fillRect(752, top + 26, 26, 18);
      if (!f.pigeonGone) { const b = Math.sin(t * 3) * 1.2; x.fillStyle = warm('#8a8f99'); x.beginPath(); x.ellipse(765, top + 40 + b, 7, 5, 0, 0, 7); x.fill(); x.beginPath(); x.arc(770, top + 34 + b, 3.6, 0, 7); x.fill(); x.fillStyle = warm('#5aa27a'); x.fillRect(767, top + 36 + b, 5, 2); x.fillStyle = '#1b1e25'; x.fillRect(771, top + 33 + b, 1.4, 1.4); x.fillStyle = warm('#d8a050'); x.fillRect(773, top + 34 + b, 2.6, 1.3); }
      // rust patches and a tired nameplate
      x.fillStyle = rgba('#8a4a2a', 0.55); for (const [rx, ry, rw] of [[170, 188, 10], [404, 192, 14], [700, 186, 12], [742, 190, 8]]) { x.beginPath(); x.ellipse(rx, ry, rw, 4, 0, 0, 7); x.fill(); }
      x.fillStyle = warm('#1f3a2a'); x.fillRect(420, 160, 90, 14); x.fillStyle = warm('#e8dcb8'); x.font = '700 9px Fraunces, Georgia, serif'; x.textAlign = 'center'; x.fillText('MARJORIE', 465, 170.5);
      x.font = '700 6px Inter, sans-serif'; x.fillText('M50961', 130, 198); x.textAlign = 'left';
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
          x.font = '700 10px Inter, sans-serif'; const left = ex > vw / 2; x.textAlign = left ? 'right' : 'left'; x.fillStyle = '#f7f1e7'; x.fillText(label, left ? ex - 22 : ex + 22, ey + 4); x.textAlign = 'left';
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
  LS.WORLD = { MAP, ROOMS, DOORS, BUILDINGS, riverX, TRACK, BRIDGE, CROSSING };
})();
