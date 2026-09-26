/* LINESIDE — the open world engine (tile-based, Stardew-style 3/4 view).
 *
 * Map and placements come from js/world/level.js (LS.LEVEL, validated by the level designer). Art comes from
 * js/world/tileart.js (LS.TileArt, built by the technical artist from the art director's spec); if it isn't
 * loaded, a plain fallback renderer keeps the game playable.
 *
 * Engineering logic is enforced by the collision grid: public tiles are always walkable; the closed line (cess,
 * track, Beck Bridge deck, PPE gates, depot apron) needs a site induction and PPE; the live main line is never
 * walkable. The level crossing is a public road.
 *
 * Movement: keyboard / joystick, or tap-to-walk with A* pathfinding. Doors: walk onto the mat and step up (or tap
 * the door) to go in; in rooms, walk out through the marked EXIT. World units are pixels of a 16px tile.
 */
window.LS = window.LS || {};
(function () {
  const L = LS.LEVEL, T = L.T || 16, COLS = L.rows[0].length, ROWS = L.rows.length;
  const MAP = { W: COLS * T, H: ROWS * T };
  const PUB = new Set('.,"rl-pse_cxnogmy%'.split('')), PPE = new Set(':=/b!za'.split(''));
  const LIGHT = { dawn: 0.14, day: 0.04, dusk: 0.2, overcast: 0.12, night: 0.4 };
  const GRADE = { dawn: ['#ffcfae', 0.28], day: null, dusk: ['#e79a8f', 0.32], overcast: ['#c3cad0', 0.26], night: ['#3b4a86', 0.6] };
  const tp = (tx, ty) => ({ x: tx * T + 8, y: ty * T + 12 });      // feet position for a tile
  const toTile = (x, y) => [Math.floor(x / T), Math.floor((y - 1) / T)];

  // Rooms and doors from the level data
  const ROOMS = {};
  for (const [id, R] of Object.entries(L.rooms)) {
    const cols = R.grid[0].length, rows = R.grid.length, xs = [];
    R.grid[rows - 1].split('').forEach((c, i) => { if (c === 'X') xs.push(i); });
    ROOMS[id] = { id, name: R.name, grid: R.grid, cols, rows, w: cols * T, h: rows * T, enter: tp(R.enter_at[0], R.enter_at[1]),
      exitTo: tp(R.exit_to.tile[0], R.exit_to.tile[1]), exitX: (xs[0] + xs[xs.length - 1] + 1) / 2 * T, exitY: (rows - 1) * T + 8, entities: R.entities || [], catSpots: R.cat_spots || [] };
  }
  const DOORS = {};
  for (const d of L.doors) { const m = tp(d.mat[0], d.mat[1]); DOORS[d.to.room] = { id: d.id, room: d.to.room, needs: d.needs, mat: d.mat, tile: d.tile, x: m.x, y: m.y, doorX: d.tile[0] * T + 8, doorY: d.tile[1] * T + 4 }; }

  // ---------- A* on a tile grid ----------
  function astar(grid, cols, rows, sx, sy, gx, gy, ok) {
    const N = cols * rows, g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = [], push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
    const s = sy * cols + sx, goal = gy * cols + gx; g[s] = 0; push(s, h(sx, sy));
    let n = 0;
    while (heap.length && n++ < 40000) {
      const [, k] = pop(); if (closed[k]) continue; closed[k] = 1;
      if (k === goal) { const out = []; let c = k; while (c !== -1) { out.push([c % cols, (c / cols) | 0]); c = came[c]; } return out.reverse(); }
      const x = k % cols, y = (k / cols) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const nk = ny * cols + nx; if (closed[nk] || !ok(grid[nk], nk)) continue;
        if (dx && dy && (!ok(grid[y * cols + nx], y * cols + nx) || !ok(grid[ny * cols + x], ny * cols + x))) continue; // no corner cutting
        const ng = g[k] + (dx && dy ? 1.414 : 1); if (ng < g[nk]) { g[nk] = ng; came[nk] = k; push(nk, ng + h(nx, ny)); }
      }
    }
    return null;
  }

  class World {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.cfg = { time: 'dawn', season: 'spring', weather: 'clear', build: 0, train: false };
      this.chapter = 0; this.entities = []; this.room = 'outside'; this.ppe = false; this.flags = {};
      const sp = tp(L.spawn.tile[0], L.spawn.tile[1]);
      this.player = { x: sp.x, y: sp.y, face: 'up', phase: 0, moving: false, path: null, use: null, look: null };
      this.keys = {}; this.stick = { x: 0, y: 0 }; this.paused = true; this.reduced = false; this.showPath = true;
      this.camX = 0; this.camY = 0; this.t0 = performance.now(); this.last = this.t0;
      this.fade = 0; this.fadeDir = 0; this.fadeCb = null; this.particles = []; this.objective = null; this.focus = null;
      this.touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      this.onInteract = null; this.onEnterRoom = null; this.onBlocked = null; this.onDoorRefused = null; this.lastBlock = -10;
      this.mainTrain = { y: -9999, next: 8, dir: 1 }; this.fx = []; this.scenes = {}; this.trail = []; this.crumbs = null; this.crumbT = 0;
      this.safe = { l: 0, t: 0, r: 0, b: 0 }; this.speaker = null; this.ignoreTapUntil = 0;
      this.art = null; this.ready = (LS.TileArt ? LS.TileArt.load().then(() => { this.art = LS.TileArt; this.scenes = {}; }).catch(e => console.error('TileArt', e)) : Promise.resolve());
      this.sheep = []; this.resize(); addEventListener('resize', () => this.resize());
      this.bindInput(); this.set(this.cfg);
      requestAnimationFrame(t => this.loop(t));
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2); this.dpr = dpr;
      this.cv.width = Math.round(innerWidth * dpr); this.cv.height = Math.round(innerHeight * dpr);
      this.cv.style.width = innerWidth + 'px'; this.cv.style.height = innerHeight + 'px';
      this.fitScale();
    }
    // Integer zoom: about 26 x 15 tiles of view on desktop (3x at 1440x900), 2x on phones. Rooms zoom in a step if they fit.
    fitScale() {
      let z = Math.max(2, Math.min(4, Math.floor(Math.min(innerWidth / (26 * T), innerHeight / (15 * T)))));
      if (this.room !== 'outside') { const R = ROOMS[this.room]; const zr = Math.floor(Math.min(innerWidth / (R.w + 24), (innerHeight - 40) / (R.h + 24))); z = Math.max(z, Math.min(5, zr)); }
      // HD art (scene res r art px per world unit) must land on whole device pixels: zoom x dpr must be a multiple of r.
      // At res 3 that means zoom 3 (phones, small windows) or 6 (desktop: a tile is 96 px, people ~190 px tall).
      const r = (this.art && this.art.res) || 1;
      if (r > 1) { const d = this.dpr || 1, big = innerWidth >= 1100 && innerHeight >= 620; z = big ? 2 * r : r; while ((z * d) % r) z++; }
      this.S = z; this.vw = innerWidth / z; this.vh = innerHeight / z;
    }

    // ---------- Configuration and collision ----------
    set(cfg) {
      const prevLine = this.lineState && this.cfg && this.lineState();
      this.cfg = Object.assign({ weather: 'clear', train: false }, cfg); this.P = LS.art ? (LS.art.PAL[this.cfg.time] || LS.art.PAL.day) : null;
      this.particles = []; this.buildCollision();
      if (prevLine !== this.lineState()) delete this.scenes.outside;
      if (!this.sheep.length) this.spawnSheep();
    }
    get build() { return this.cfg.build | 0; }
    lineState() { return (this.cfg && this.cfg.build >= 5) ? 'live' : 'closed'; }
    buildCollision() {
      const live = this.lineState() === 'live', g = new Uint8Array(COLS * ROWS);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = L.rows[y][x]; g[y * COLS + x] = PUB.has(c) ? 0 : PPE.has(c) ? (live && c !== '!' && c !== 'a' ? 3 : 2) : (c === 'j' || c === '|') ? 4 : 1; }
      for (const e of L.outside) if (e.blocks) { const [w, h] = e.size || [1, 1]; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g[(e.tile[1] + j) * COLS + e.tile[0] + i] = 1; }
      this.grid = { outside: { g, cols: COLS, rows: ROWS } };
      for (const [id, R] of Object.entries(ROOMS)) {
        const rg = new Uint8Array(R.cols * R.rows);
        R.grid.forEach((row, y) => row.split('').forEach((c, x) => { rg[y * R.cols + x] = (c === '.' || c === 'm' || c === 'X' || (id === 'shed' && c === '=' && y >= 2)) ? 0 : 1; }));
        this.grid[id] = { g: rg, cols: R.cols, rows: R.rows };
      }
    }
    cell(room, tx, ty) { const G = this.grid[room]; if (tx < 0 || ty < 0 || tx >= G.cols || ty >= G.rows) return 1; return G.g[ty * G.cols + tx]; }
    blockedAt(x, y) {
      const tx = Math.floor(x / T), ty = Math.floor(y / T), v = this.cell(this.room, tx, ty);
      if (v === 2) return this.ppe || (this.allow && this.allow(this.room, tx, ty)) ? 0 : 'line_closed';
      if (v === 3) return 'track_live';
      if (v === 4) return 'junction_live';
      return v ? 1 : 0;
    }
    canStand(x, y) { for (const [dx, dy] of [[-5, -3], [5, -3], [-5, 2], [5, 2]]) { const b = this.blockedAt(x + dx, y + dy); if (b) return b; } return 0; }
    passable(v, room, tx, ty) { return v === 0 || (v === 2 && (this.ppe || (this.allow && this.allow(room, tx, ty)))); }
    findPath(room, fromX, fromY, toX, toY) {
      const G = this.grid[room]; const ok = (v, k) => this.passable(v, room, k % G.cols, (k / G.cols) | 0);
      let [sx, sy] = toTile(fromX, fromY); let [gx, gy] = toTile(toX, toY);
      const okAt = (x, y) => x >= 0 && y >= 0 && x < G.cols && y < G.rows && ok(this.cell(room, x, y), y * G.cols + x);
      const near = (x, y) => { if (okAt(x, y)) return [x, y]; for (let r = 1; r < 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (okAt(x + dx, y + dy)) return [x + dx, y + dy]; } return null; };
      const s = near(sx, sy), gl = near(gx, gy); if (!s || !gl) return null;
      return astar(G.g, G.cols, G.rows, s[0], s[1], gl[0], gl[1], ok);
    }
    tileToPx(tx, ty) { return tp(tx, ty); }
    stepSound(x, y) {
      if (this.room === 'hall') return 'step_wood'; if (this.room !== 'outside') return 'step_floor';
      const c = (L.rows[Math.floor(y / T)] || '')[Math.floor(x / T)] || '.';
      return ':=/bza'.includes(c) ? 'step_ballast' : 'p_!y'.includes(c) ? 'step_gravel' : 'rl-xsecnoq^#+kgm%'.includes(c) ? 'step_floor' : 'step_grass';
    }

    // ---------- Input ----------
    bindInput() {
      addEventListener('keydown', e => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        this.keys[e.key.toLowerCase()] = true;
        if (!this.paused && !e.defaultPrevented && (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.use(); }
      });
      addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
      addEventListener('blur', () => { this.keys = {}; this.stick = { x: 0, y: 0 }; });
      this.cv.addEventListener('pointerdown', e => {
        if (this.paused || this.fadeDir || performance.now() < this.ignoreTapUntil) return;
        const wx = this.camX + e.clientX / this.S, wy = this.camY + e.clientY / this.S;
        const ah = (this.art && this.art.actorHeight) || 26;
        const hit = this.visible().filter(en => en.prompt).sort((a, b) => b.y - a.y).find(en => Math.abs(en.x - wx) < 12 && wy > en.y - (en.kind === 'npc' ? ah + 4 : 22) && wy < en.y + 6);
        if (hit) this.walkTo(hit.sx ?? hit.x, hit.sy ?? hit.y, hit);
        else this.walkTo(wx, wy, null);
      });
    }
    walkTo(x, y, use) {
      const p = this.player, path = this.findPath(this.room, p.x, p.y, x, y);
      if (!path) { p.path = null; p.use = null; if (use && use.kind === 'door') this.tryDoor(use.door); return; }
      p.path = path.slice(1).map(([tx, ty]) => tp(tx, ty)); p.use = use || null;
      if (!p.path.length && use) { this.focus = use; this.use(); }
    }
    visible() { return this.entities.filter(e => e.room === this.room && !e.hidden); }
    use() {
      if (this.paused || this.fadeDir) return;
      const f = this.focus; if (!f) return;
      this.player.path = null; this.player.use = null;
      const p = this.player, dx = f.x - p.x, dy = f.y - p.y;
      p.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (f.kind === 'door') { this.tryDoor(f.door); return; }
      if (f.kind === 'exit') { this.exitRoom(); return; }
      if (f.kind === 'npc') f.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'up' : 'down');
      if (this.onInteract) this.onInteract(f);
    }
    tryDoor(d) {
      const t = performance.now();
      if (d.needs === 'ppe' && !this.ppe && !(this.flags && this.flags.openDepot)) { if (t - (this.lastRefuse || -1e9) > 2500) { this.lastRefuse = t; if (this.onDoorRefused) this.onDoorRefused(d); } return; }
      const R = ROOMS[d.room]; this.enter(d.room, R.enter.x, R.enter.y, 'up');
      if (LS.audio && LS.audio.sfx) LS.audio.sfx('door', { to: d.room });
    }
    exitRoom() { const R = ROOMS[this.room]; this.enter('outside', R.exitTo.x, R.exitTo.y, 'down'); if (LS.audio && LS.audio.sfx) LS.audio.sfx('door'); }
    enter(room, x, y, face) {
      if (this.fadeDir) return;
      this.fadeDir = 1; this.player.path = null;
      this.fadeCb = () => { this.room = room; this.player.x = x; this.player.y = y; this.player.face = face || this.player.face; this.player.path = null; this.trail = []; this.crumbs = null; this.fitScale(); this.snapCam();
        for (const e of this.entities) if (e.follow && room === 'outside') { e.room = room; e.x = x; e.y = y + 10; }
        if (LS.audio && LS.audio.setRoom) LS.audio.setRoom(room);
        if (this.onEnterRoom) this.onEnterRoom(room); };
    }
    place(room, x, y, face) { this.room = room; this.player.x = x; this.player.y = y; if (face) this.player.face = face; this.player.path = null; this.fitScale(); this.snapCam(); if (LS.audio && LS.audio.setRoom) LS.audio.setRoom(room); }
    snapCam() { const c = this.camTarget(); this.camX = c[0]; this.camY = c[1]; }
    camTarget() {
      const p = this.player;
      if (this.attract) { const t = (performance.now() - this.t0) / 1000, u = 0.5 + 0.5 * Math.sin(t * 0.035 - 1.4); return [Math.max(0, Math.min(MAP.W - this.vw, (14 + u * 90) * T - this.vw / 2)), Math.max(0, Math.min(MAP.H - this.vh, 28 * T - this.vh / 2 + Math.sin(t * 0.03) * 60))]; }
      if (this.room !== 'outside') {
        const R = ROOMS[this.room];
        const cx = R.w < this.vw ? (R.w - this.vw) / 2 : Math.max(-8, Math.min(R.w + 8 - this.vw, p.x - this.vw / 2));
        const cy = R.h < this.vh - 30 ? (R.h - this.vh) / 2 + 12 : Math.max(-24, Math.min(R.h + 24 - this.vh, p.y - this.vh / 2));
        return [cx, cy];
      }
      return [Math.max(0, Math.min(MAP.W - this.vw, p.x - this.vw / 2)), Math.max(0, Math.min(MAP.H - this.vh, p.y - 12 - this.vh / 2))];
    }

    // ---------- Update ----------
    update(dt) {
      const p = this.player, t = (performance.now() - this.t0) / 1000;
      let dx = 0, dy = 0, manual = false;
      if (!this.paused && !this.fadeDir && !this.attract) {
        const k = this.keys;
        if (k['arrowleft'] || k['a']) dx -= 1; if (k['arrowright'] || k['d']) dx += 1;
        if (k['arrowup'] || k['w']) dy -= 1; if (k['arrowdown'] || k['s']) dy += 1;
        const sm = Math.hypot(this.stick.x, this.stick.y);
        if (sm > 0.22) { const m = Math.min(1, (sm - 0.22) / 0.6), c = 0.45 + 0.55 * m; dx = this.stick.x / sm * c; dy = this.stick.y / sm * c; }
        if (dx || dy) { manual = true; p.path = null; p.use = null; }
        else if (p.path && p.path.length) {
          const w = p.path[0], tx = w.x - p.x, ty = w.y - p.y, d = Math.hypot(tx, ty);
          if (d < 2.5) { p.path.shift(); if (!p.path.length) { const u = p.use; p.path = null; p.use = null; if (u) { this.focus = u; this.use(); } else this.checkDoorArrive(); } }
          else { dx = tx / d; dy = ty / d; }
        }
      }
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        dx /= Math.max(1, len); dy /= Math.max(1, len);
        const sp = 80 * (this.keys['shift'] ? 1.6 : 1) * dt;
        const nx = p.x + dx * sp, ny = p.y + dy * sp, ox = p.x, oy = p.y;
        const bx = this.canStand(nx, p.y), by = this.canStand(p.x, ny);
        if (!bx) p.x = nx; if (!by) p.y = ny;
        const lz = this.leash; if (lz && lz.room === this.room) { const ddx = p.x - lz.x, ddy = p.y - lz.y, dd = Math.hypot(ddx, ddy); if (dd > lz.r) { p.x = lz.x + ddx / dd * lz.r; p.y = lz.y + ddy / dd * lz.r; } }
        const why = [bx, by].find(b => typeof b === 'string');
        if (why && t - this.lastBlock > 3) {
          this.lastBlock = t;
          // walking into the depot yard gate before your induction: that's the depot saying no, not the line
          const ch = this.room === 'outside' ? ((L.rows[Math.floor((ny + 2) / T)] || '')[Math.floor(nx / T)] || '') : '', D = DOORS.shed;
          if (why === 'line_closed' && D && (ch === 'a' || (ch === '!' && Math.abs(ny - D.y) < 5 * T && Math.abs(nx - D.x) < 3 * T))) this.tryDoor(D);
          else if (this.onBlocked) this.onBlocked(why);
        }
        if (bx && by && p.path) { p.path = null; p.use = null; }
        p.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        // the walk cycle advances with distance walked (one frame per 4.5 world units: a full 8-frame cycle every ~2 tiles), so feet don't slide
        const moved = Math.hypot(p.x - ox, p.y - oy); p.moving = moved > 0.01; p.phase += moved / 4.5;
        const st = Math.floor(p.phase / 4); if (p.moving && st !== p.lastStep) { p.lastStep = st; if (LS.audio && LS.audio.sfx) LS.audio.sfx(this.stepSound(p.x, p.y)); }
        if (manual) this.checkDoorStep(dy);
        const lt = this.trail[this.trail.length - 1]; if (!lt || Math.hypot(lt.x - p.x, lt.y - p.y) > 6) { this.trail.push({ x: p.x, y: p.y }); if (this.trail.length > 40) this.trail.shift(); }
      } else { p.moving = false; p.phase = 0; p.lastStep = -1; }
      this.updateNPCs(dt);
      for (const s of this.sheep) { s.t -= dt; if (s.t <= 0) { s.t = 2 + Math.random() * 5; const a = Math.random() * 6.28, m = Math.random() < 0.5 ? 0 : 8; s.dx = Math.cos(a) * m; s.dy = Math.sin(a) * m * 0.6; if (s.dx) s.face = s.dx > 0 ? 1 : -1; } const nx = s.x + s.dx * dt, ny = s.y + s.dy * dt; if (L.rows[Math.floor(ny / T)] && L.rows[Math.floor(ny / T)][Math.floor(nx / T)] === '"') { s.x = nx; s.y = ny; } }
      // focus: the nearest interactable within reach of its stand point
      let best = null, bd = 22;
      if (!this.paused) for (const e of this.visible()) { if (!e.prompt) continue; const d = Math.hypot((e.sx ?? e.x) - p.x, ((e.sy ?? e.y) - p.y) * 1.2); if (d < bd) { bd = d; best = e; } }
      if (best !== this.focus && this.onFocus) this.onFocus(best);
      this.focus = best;
      const [tx, ty] = this.camTarget(), k = this.attract ? Math.min(1, dt) : 1 - Math.exp(-dt * 11);
      this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
      if (this.fadeDir) { this.fade += this.fadeDir * dt * 3.2; if (this.fade >= 1) { this.fade = 1; this.fadeDir = -1; if (this.fadeCb) { this.fadeCb(); this.fadeCb = null; } } if (this.fade <= 0 && this.fadeDir < 0) { this.fade = 0; this.fadeDir = 0; } }
      const mt = this.mainTrain; mt.next -= dt; if (mt.next <= 0 && mt.y < -2000) { mt.dir = Math.random() < 0.5 ? 1 : -1; mt.y = mt.dir > 0 ? -200 : MAP.H + 200; mt.next = 24 + Math.random() * 18; if (LS.audio && LS.audio.sfx && this.room === 'outside' && Math.abs(this.player.x - 120 * T) < 30 * T) LS.audio.sfx('train_pass', { dir: mt.dir }); }
      if (mt.y > -2000) { mt.y += mt.dir * 260 * dt; if (mt.y > MAP.H + 400 || mt.y < -400) mt.y = -9999; }
      const now = performance.now(); this.fx = this.fx.filter(f => f.until > now);
      // breadcrumb path to the objective
      this.crumbT -= dt; if (this.crumbT <= 0) { this.crumbT = 0.35; this.crumbs = this.computeCrumbs(); }
      if (LS.audio && LS.audio.setNear && this.room === 'outside') { const rx = 88 * T; LS.audio.setNear({ river: Math.max(0, 1 - Math.abs(p.x - rx) / (14 * T)), mainline: Math.max(0, 1 - Math.abs(p.x - 120 * T) / (18 * T)) }); }
    }
    // Stepping up onto a door from its mat goes in; stepping down through a room's EXIT goes out.
    checkDoorStep(dy) {
      const p = this.player, [tx, ty] = toTile(p.x, p.y);
      if (this.room === 'outside') { if (dy < -0.3) for (const d of Object.values(DOORS)) if (d.mat[0] === tx && d.mat[1] === ty && p.y < d.y + 1) { this.tryDoor(d); return; } }
      else { const R = ROOMS[this.room]; if (dy > 0.3 && R.grid[ty] && R.grid[Math.min(R.rows - 1, ty + (p.y % T > 11 ? 1 : 0))][tx] === 'X') this.exitRoom(); }
    }
    checkDoorArrive() {
      const p = this.player, [tx, ty] = toTile(p.x, p.y);
      if (this.room === 'outside') { for (const d of Object.values(DOORS)) if (d.mat[0] === tx && d.mat[1] === ty) { this.tryDoor(d); return; } }
      else { const R = ROOMS[this.room]; if (R.grid[ty] && R.grid[ty][tx] === 'X') this.exitRoom(); }
    }
    updateNPCs(dt) {
      const p = this.player;
      for (const e of this.entities) {
        if (e.kind !== 'npc' || e.room !== this.room || e.hidden) continue;
        let gx = null, gy = null, speed = 40;
        if (e.follow && !this.paused && e.room === this.room) {
          const tr = this.trail[Math.max(0, this.trail.length - 4)] || { x: p.x, y: p.y + 14 };
          if (Math.hypot(tr.x - e.x, tr.y - e.y) > 10 && Math.hypot(p.x - e.x, p.y - e.y) > 20) { gx = tr.x; gy = tr.y; speed = 86; }
          if (Math.hypot(p.x - e.x, p.y - e.y) > 8 * T) { e.x = p.x; e.y = p.y + 12; }
        } else if (e.guide && !e.guide.done) {
          const G = e.guide, w = G.path[G.i];
          if (!w) { G.done = true; if (G.onDone) G.onDone(); }
          else if (Math.hypot(p.x - e.x, p.y - e.y) < 5 * T || G.i === 0) { gx = w.x; gy = w.y; speed = 70; if (Math.hypot(w.x - e.x, w.y - e.y) < 2.5) G.i++; }
        } else if (e.wander && !this.paused) {
          e.wt = (e.wt || 0) - dt;
          if (e.wt <= 0) { const [x0, y0, x1, y1] = e.wander; const tx = x0 + Math.floor(Math.random() * (x1 - x0 + 1)), ty = y0 + Math.floor(Math.random() * (y1 - y0 + 1)); const q = tp(tx, ty); e.goal = [q.x, q.y]; e.wt = 3 + Math.random() * 6; }
          if (e.goal) { gx = e.goal[0]; gy = e.goal[1]; }
        }
        if (gx !== null) {
          const ddx = gx - e.x, ddy = gy - e.y, d = Math.hypot(ddx, ddy);
          e.moving = d > 2; if (e.moving) { const st = Math.min(d, speed * dt); e.x += ddx / d * st; e.y += ddy / d * st; e.face = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up'); e.phase = (e.phase || 0) + st / 4.5; }
          else if (e.goal && e.wander) e.goal = null;
        } else e.moving = false;
      }
    }
    // Guide an NPC along a path (they wait if the player lags). Resolves on arrival.
    guide(e, tx, ty) {
      return new Promise(res => {
        const path = this.findPathFree(e.room, e.x, e.y, tp(tx, ty).x, tp(tx, ty).y) || [[tx, ty]];
        e.guide = { path: path.slice(1).map(([a, b]) => tp(a, b)), i: 0, done: false, onDone: () => { e.guide = null; e.moving = false; res(); } };
      });
    }
    findPathFree(room, fx, fy, gx, gy) { const was = this.ppe; this.ppe = false; const r = this.findPath(room, fx, fy, gx, gy); this.ppe = was; return r; }
    computeCrumbs() {
      const o = this.objective; if (!o || this.paused || !this.showPath || this.attract) return null;
      let gx, gy;
      if (o.room === this.room) { gx = o.sx ?? o.x; gy = o.sy ?? o.y; }
      else if (this.room === 'outside') { const d = DOORS[o.room]; if (!d) return null; gx = d.x; gy = d.y; }
      else { const R = ROOMS[this.room]; gx = R.exitX; gy = R.exitY; }
      const p = this.player; if (Math.hypot(gx - p.x, gy - p.y) < 28) return null;
      const path = this.findPath(this.room, p.x, p.y, gx, gy); return path ? path.slice(1, 60) : null;
    }
    spawnSheep() { const r = LS.art ? LS.art.rng(4) : Math.random; const tiles = []; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (L.rows[y][x] === '"') tiles.push([x, y]); for (let i = 0; i < 9 && tiles.length; i++) { const [x, y] = tiles[Math.floor(r() * tiles.length)]; this.sheep.push({ x: x * T + 8, y: y * T + 12, t: r() * 5, dx: 0, dy: 0, face: 1 }); } }
    pop(room, x, y, text, secs) { this.fx.push({ room, x, y, text, until: performance.now() + (secs || 1.6) * 1000, t0: performance.now() }); }
    invalidate(room) { delete this.scenes[room]; }

    loop(now) {
      requestAnimationFrame(t => this.loop(t));
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      this.fitScale(); this.update(dt);
      const t = (now - this.t0) / 1000;
      if (LS.setLight && this.P) LS.setLight(this.P, LIGHT[this.cfg.time] ?? 0.1);
      this.draw(this.ctx, t);
    }

    /* ============================== DRAWING ============================== */
    scene(room) {
      if (this.scenes[room]) return this.scenes[room];
      let sc;
      if (this.art) sc = room === 'outside' ? this.art.buildOutside(L, { lineState: this.lineState(), season: this.cfg.season }) : this.art.buildRoom(room, L, { flags: this.flags });
      else sc = this.fallbackScene(room);
      return (this.scenes[room] = sc);
    }
    draw(x, t) {
      const Z = this.S * this.dpr, sc = this.scene(this.room), snap = Math.min(Z, sc.res || Z);
      // snap the camera to the art-pixel grid (and so to whole device pixels): actors snap to the same grid, so nothing
      // shimmers against the ground while the camera follows the player
      const cx = Math.round(this.camX * snap) / snap, cy = Math.round(this.camY * snap) / snap;
      this.snapRes = snap;
      x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false;
      x.fillStyle = this.room === 'outside' ? '#265c42' : '#181425'; x.fillRect(0, 0, this.cv.width, this.cv.height);
      // Art may be authored at any density: scene.res = art pixels per world unit (1 = 16px tiles, 4 = 64px tiles).
      // scene.smooth = true for painted (non-pixel) art.
      const res = sc.res || 1, smooth = !!sc.smooth;
      x.setTransform(Z, 0, 0, Z, -cx * Z, -cy * Z); x.imageSmoothingEnabled = smooth; if (smooth) x.imageSmoothingQuality = 'high';
      const x0 = Math.max(0, Math.floor(cx) - 2), y0 = Math.max(0, Math.floor(cy) - 2), x1 = Math.min(sc.w, Math.ceil(cx + this.vw) + 2), y1 = Math.min(sc.h, Math.ceil(cy + this.vh) + 2);
      // ground: one canvas, or (for high-resolution art) an array of chunks { img, x, y, w, h } in world units
      if (sc.chunks) { for (const c of sc.chunks) if (c.x < x1 && c.x + c.w > x0 && c.y < y1 && c.y + c.h > y0) x.drawImage(c.img, c.x, c.y, c.w, c.h); }
      else if (x1 > x0 && y1 > y0) x.drawImage(sc.ground, x0 * res, y0 * res, (x1 - x0) * res, (y1 - y0) * res, x0, y0, x1 - x0, y1 - y0);
      if (this.art && this.art.drawAnimated) this.art.drawAnimated(x, sc, t, x0, y0, x1, y1);
      this.drawCrumbs(x, t);
      // y-sorted objects and actors
      const Lst = [], add = (y, fn) => Lst.push([y, fn]), p = this.player;
      for (const o of sc.objects) {
        const ow = o.w || o.img.width / res, oh = o.h || o.img.height / res;   // world-unit size (w/h optional)
        if (o.dx > x1 || o.dx + ow < x0 || o.dy > y1 || o.dy + oh < y0) continue;
        add(o.sortY, () => { const f = o.fade && p.x > o.fade.x && p.x < o.fade.x + o.fade.w && p.y > o.fade.y && p.y < o.fade.y + o.fade.h; if (f) x.globalAlpha = 0.5; x.drawImage(o.img, o.dx, o.dy, ow, oh); if (o.lit && this.nightK > 0.04) { x.globalAlpha = Math.min(1, this.nightK) * (f ? 0.5 : 1); x.drawImage(o.lit, o.dx, o.dy, ow, oh); } x.globalAlpha = 1; });
      }
      for (const e of this.visible()) {
        if (e.x < x0 - 30 || e.x > x1 + 30 || e.y < y0 - 40 || e.y > y1 + 40) continue;
        if (e.kind === 'npc') add(e.y, () => this.actor(x, e.look, e.x, e.y, e.face || 'down', e.moving ? Math.floor(e.phase || 0) : 0, { ppe: e.ppe, moving: e.moving }));
        else if (e.kind === 'cat') add(e.y, () => this.animal(x, 'cat', e.x, e.y, t));
      }
      if (this.room === 'outside') {
        for (const s of this.sheep) if (s.x > x0 && s.x < x1 && s.y > y0 && s.y < y1) add(s.y, () => this.animal(x, 'sheep', s.x, s.y, t, { face: s.face }));
        const duck = (sc.anchors && sc.anchors.duck) || tp(83, 22); if (!this.flags.drainCleared) add(duck.y, () => this.animal(x, 'duck', duck.x, duck.y, t));
        if (this.mainTrain.y > -2000) add(this.mainTrain.y + 160, () => this.drawMainTrain(x, this.mainTrain.y));
      }
      if (this.room === 'shed' && !this.flags.pigeonGone) { const a = (sc.anchors && sc.anchors.pigeon) || { x: 24 * T, y: 4 * T + 6 }; add(a.sortY != null ? a.sortY : a.y + 40, () => this.animal(x, 'pigeon', a.x, a.y, t)); }
      if (p.look && !this.attract) add(p.y, () => this.actor(x, p.look, p.x, p.y, p.face, p.moving ? Math.floor(p.phase) : 0, { ppe: this.ppe, moving: p.moving }));
      Lst.sort((a, b) => a[0] - b[0]); for (const [, fn] of Lst) fn();
      this.grade(x, t, sc);
      this.drawUI(x, t, cx, cy);
    }
    actor(x, look, px, py, face, frame, opt) {
      const q = this.snapRes || 1;
      if (this.art) return this.art.drawActor(x, look, Math.round(px * q) / q, Math.round(py * q) / q, face, frame, opt);
      if (LS.drawPerson4) { x.save(); x.translate(px, py); x.scale(0.34, 0.34); LS.drawPerson4(x, look, 0, 0, face, frame, opt.moving, { ppe: opt.ppe }); x.restore(); return; }
      x.fillStyle = look.top || '#888'; x.fillRect(px - 4, py - 14, 8, 14);
    }
    animal(x, kind, px, py, t, opt) {
      const q = this.snapRes || 1; if (this.art && this.art.drawAnimal) return this.art.drawAnimal(x, kind, Math.round(px * q) / q, Math.round(py * q) / q, t, opt || {});
      x.fillStyle = kind === 'cat' ? '#d9894a' : kind === 'sheep' ? '#efeae0' : kind === 'duck' ? '#8a6a48' : '#8a8f99'; x.beginPath(); x.ellipse(px, py - 3, kind === 'sheep' ? 6 : 4, 3, 0, 0, 7); x.fill();
    }
    drawMainTrain(x, y) {
      const X = 119 * T + 4, dir = this.mainTrain.dir;
      for (let c = 0; c < 4; c++) {
        const cy = y + c * 56 * (dir > 0 ? -1 : 1);
        x.fillStyle = 'rgba(24,20,37,.35)'; x.fillRect(X + 3, cy + 3, 24, 54);
        x.fillStyle = '#c0cbdc'; x.fillRect(X, cy, 24, 54); x.fillStyle = '#8b9bb4'; x.fillRect(X, cy, 3, 54); x.fillRect(X + 21, cy, 3, 54);
        x.fillStyle = '#3a4466'; x.fillRect(X + 5, cy + 4, 14, 46); x.fillStyle = '#5a6988'; for (let k = 0; k < 5; k++) x.fillRect(X + 7, cy + 8 + k * 9, 10, 1);
        if (c === 0) { x.fillStyle = '#feae34'; x.fillRect(X, dir > 0 ? cy + 50 : cy, 24, 4); }
      }
    }
    drawCrumbs(x, t) {
      const c = this.crumbs; if (!c || this.paused) return;
      for (let i = 1; i < c.length; i += 1) {
        const q = tp(c[i][0], c[i][1]), a = Math.max(0, 0.75 - i / c.length * 0.6) * (0.75 + 0.25 * Math.sin(t * 4 - i * 0.6));
        x.fillStyle = `rgba(254,231,97,${a})`; x.beginPath(); x.arc(q.x, q.y - 2, 1.6, 0, 7); x.fill();
      }
    }
    grade(x, t, sc) {
      const g = GRADE[this.cfg.time];
      x.setTransform(1, 0, 0, 1, 0, 0);
      if (this.room === 'outside') {
        if (g) { x.globalCompositeOperation = 'multiply'; x.fillStyle = hexA(g[0], g[1]); x.fillRect(0, 0, this.cv.width, this.cv.height); x.globalCompositeOperation = 'source-over'; }
        if (this.cfg.time === 'dusk' || this.cfg.time === 'night') this.drawNight(x, sc);
        this.drawWeather(x, t);
      } else {
        x.fillStyle = 'rgba(255,236,200,0.05)'; x.fillRect(0, 0, this.cv.width, this.cv.height);
        if (this.flags.dark) { // a torch beam in the dark depot
          const Z = this.S * this.dpr, px = (this.player.x - this.camX) * Z, py = (this.player.y - 14 - this.camY) * Z, R = 70 * Z;
          const rg = x.createRadialGradient(px, py, R * 0.15, px, py, R); rg.addColorStop(0, 'rgba(8,6,14,0)'); rg.addColorStop(0.7, 'rgba(8,6,14,0.55)'); rg.addColorStop(1, 'rgba(8,6,14,0.93)');
          x.fillStyle = rg; x.fillRect(0, 0, this.cv.width, this.cv.height);
        }
      }
    }
    drawWeather(x, t) {
      const w = this.cfg.weather, vw = this.cv.width, vh = this.cv.height; if (w === 'clear') return;
      while (this.particles.length < (w === 'rain' ? 220 : 180)) this.particles.push({ x: Math.random() * vw, y: Math.random() * vh, z: 0.4 + Math.random() * 0.8 });
      const k = this.dpr * this.S / 3;
      if (w === 'rain') { x.strokeStyle = 'rgba(192,203,220,0.45)'; x.lineWidth = Math.max(1, this.dpr); x.beginPath(); for (const p of this.particles) { if (!this.reduced) { p.y += 14 * p.z * k; p.x -= 3 * p.z * k; } if (p.y > vh) { p.y = -20; p.x = Math.random() * vw * 1.2; } x.moveTo(p.x, p.y); x.lineTo(p.x - 3 * p.z * k, p.y + 12 * p.z * k); } x.stroke(); }
      else { x.fillStyle = 'rgba(245,248,255,0.85)'; for (const p of this.particles) { if (!this.reduced) { p.y += 1 * p.z * k; p.x += Math.sin(t + p.z * 9) * 0.5; } if (p.y > vh) { p.y = -5; p.x = Math.random() * vw; } x.fillRect(p.x, p.y, 2 * k + 1, 2 * k + 1); } }
    }
    drawNight(x, sc) {
      if (!this.dark) this.dark = document.createElement('canvas');
      const d = this.dark; if (d.width !== this.cv.width || d.height !== this.cv.height) { d.width = this.cv.width; d.height = this.cv.height; }
      const g = d.getContext('2d'), Z = this.S * this.dpr, night = this.cfg.time === 'night';
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, d.width, d.height);
      g.fillStyle = night ? 'rgba(8,10,28,0.55)' : 'rgba(30,14,40,0.14)'; g.fillRect(0, 0, d.width, d.height);
      g.globalCompositeOperation = 'destination-out';
      const hole = (wx, wy, r) => { const sx = (wx - this.camX) * Z, sy = (wy - this.camY) * Z, R = r * Z; if (sx < -R || sy < -R || sx > d.width + R || sy > d.height + R) return; const rg = g.createRadialGradient(sx, sy, 0, sx, sy, R); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(sx - R, sy - R, R * 2, R * 2); };
      hole(this.player.x, this.player.y - 10, 60);
      for (const l of (sc.lights || [])) hole(l.x, l.y, l.r || 40);
      x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(d, 0, 0);
      if (!night) return;
      x.globalCompositeOperation = 'lighter';
      for (const l of (sc.lights || [])) { const sx = (l.x - this.camX) * Z, sy = (l.y - this.camY) * Z, R = (l.r || 40) * Z * 0.6; if (sx < -R || sy < -R || sx > d.width + R || sy > d.height + R) continue; const rg = x.createRadialGradient(sx, sy, 0, sx, sy, R); rg.addColorStop(0, 'rgba(254,231,97,0.16)'); rg.addColorStop(1, 'rgba(254,231,97,0)'); x.fillStyle = rg; x.fillRect(sx - R, sy - R, R * 2, R * 2); }
      x.globalCompositeOperation = 'source-over';
    }

    // Screen-space UI over the world: markers, the objective chevron, nameplates, prompts, speech pops, the off-screen arrow.
    drawUI(x, t, cx, cy) {
      const D = this.dpr, Z = this.S, sx = wx => (wx - cx) * Z, sy = wy => (wy - cy) * Z, ah = (this.art && this.art.actorHeight) || 26;
      const big = this.touch ? 1.35 : 1;
      x.setTransform(D, 0, 0, D, 0, 0);
      const vis = this.visible(), o = this.objective, f = this.focus;
      const topOf = e => sy(e.y - (e.kind === 'npc' ? ah + 2 : (e.h || 14)));
      // nameplates for team members
      x.font = `700 ${Math.round(11 * big)}px Inter, system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const e of vis) if (e.kind === 'npc' && e.name && !this.attract) {
        const X = sx(e.x), Y = topOf(e) - 8 * big; if (X < -40 || X > innerWidth + 40 || Y < -20 || Y > innerHeight + 20) continue;
        const w = x.measureText(e.name).width + 12;
        x.fillStyle = 'rgba(24,20,37,.72)'; rrect(x, X - w / 2, Y - 8 * big, w, 16 * big, 8 * big); x.fill();
        x.fillStyle = '#f7f1e7'; x.fillText(e.name, X, Y + 0.5);
      }
      // sign labels: fingerposts and boards whose words would be too small in the art show them when you walk up
      const scn = this.scenes[this.room], P = this.player;
      if (scn && !this.attract) for (const ob of scn.objects) {
        if (!ob.labels) continue;
        const gx = ob.dx + ob.w / 2, dist = Math.hypot(P.x - gx, P.y - ob.sortY); if (dist > 4.5 * T) continue;
        const a = Math.max(0, Math.min(1, (4.5 * T - dist) / T)), X = sx(gx), top = sy(ob.dy) - 6 * big;
        x.font = `600 ${Math.round(11.5 * big)}px Inter, system-ui, sans-serif`; x.textAlign = 'left';
        const lh = 17 * big, w = Math.max(...ob.labels.map(l => x.measureText(l).width)) + 20, h = ob.labels.length * lh + 10;
        const L0 = Math.max(8, Math.min(innerWidth - w - 8, X - w / 2)), T0 = Math.max(8, top - h);
        x.globalAlpha = a; x.fillStyle = 'rgba(247,241,231,.96)'; rrect(x, L0, T0, w, h, 8 * big); x.fill();
        x.strokeStyle = 'rgba(24,20,37,.25)'; x.lineWidth = 1; x.stroke();
        x.fillStyle = '#2a1d22'; ob.labels.forEach((l, i) => x.fillText(l, L0 + 10, T0 + 5 + lh * (i + 0.5)));
        x.globalAlpha = 1; x.textAlign = 'center';
      }
      // entity markers
      for (const e of vis) {
        if (e.kind === 'memo') { for (let k = 0; k < 4; k++) { const a = t * 2 + k * 1.57; x.fillStyle = `rgba(255,236,170,${0.6 + 0.4 * Math.sin(t * 4 + k)})`; x.fillRect(sx(e.x) + Math.cos(a) * 12 - 1.5, sy(e.y - 6) + Math.sin(a) * 7 - 1.5, 3, 3); } }
        if (!e.marker || this.attract) continue;
        const X = sx(e.x), Y = topOf(e) - (e.kind === 'npc' && e.name ? 26 : 12) * big + Math.sin(t * 3 + e.x) * 2.5;
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
      if (this.speaker) { const e = vis.find(v => v.kind === 'npc' && v.id === this.speaker); if (e) { const X = sx(e.x), Y = topOf(e) - 10; x.fillStyle = '#f7f1e7'; rrect(x, X - 11, Y - 9, 22, 14, 7); x.fill(); x.beginPath(); x.moveTo(X - 3, Y + 5); x.lineTo(X, Y + 9); x.lineTo(X + 3, Y + 5); x.fill(); x.fillStyle = '#1b1e25'; for (let k = -1; k <= 1; k++) { x.beginPath(); x.arc(X + k * 5, Y - 2, 1.6, 0, 7); x.fill(); } } }
      // objective: a bouncing chevron over the target when on screen, an edge arrow when not
      if (o && !this.paused && !this.attract) {
        let tx, ty, lbl = o.label, kind = o.npc ? 'npc' : 'thing';
        if (o.room === this.room) { tx = o.x; ty = o.y; }
        else if (this.room === 'outside') { const d = DOORS[o.room]; tx = d.doorX; ty = d.doorY + 8; lbl = o.doorLabel || lbl; kind = 'door'; }
        else { const R = ROOMS[this.room]; tx = R.exitX; ty = R.exitY + 8; lbl = 'Exit'; kind = 'exit'; }
        const X = sx(tx), Y = sy(ty) - (kind === 'npc' ? (ah + 2) * Z + 34 * big : kind === 'door' ? 30 * Z + 6 : 20 * Z);
        const S = this.safe, onScreen = X > S.l + 10 && X < innerWidth - S.r - 10 && Y > S.t + 10 && Y < innerHeight - S.b - 10;
        if (onScreen) {
          const b = Math.abs(Math.sin(t * 3.2)) * 6;
          x.save(); x.translate(X, Y - b); x.scale(big, big);
          x.fillStyle = 'rgba(24,20,37,.35)'; x.beginPath(); x.moveTo(-9, -6); x.lineTo(9, -6); x.lineTo(0, 6); x.fill();
          x.fillStyle = '#fee761'; x.beginPath(); x.moveTo(-8, -8); x.lineTo(8, -8); x.lineTo(0, 4); x.fill(); x.strokeStyle = '#3e2731'; x.lineWidth = 1.5; x.stroke();
          if (kind === 'door' || kind === 'exit') { x.font = '800 11px Inter, system-ui, sans-serif'; const tw = x.measureText(lbl).width + 14; x.fillStyle = 'rgba(24,20,37,.85)'; rrect(x, -tw / 2, -30, tw, 17, 8.5); x.fill(); x.fillStyle = '#fee761'; x.fillText(lbl, 0, -21.5); }
          x.restore();
        } else {
          const cxs = (S.l + innerWidth - S.r) / 2, cys = (S.t + innerHeight - S.b) / 2, a = Math.atan2(Y - cys, X - cxs), m = 26;
          const hw = (innerWidth - S.l - S.r) / 2 - m, hh = (innerHeight - S.t - S.b) / 2 - m, k = Math.min(hw / Math.max(1e-3, Math.abs(Math.cos(a))), hh / Math.max(1e-3, Math.abs(Math.sin(a))));
          const ex = cxs + Math.cos(a) * k, ey = cys + Math.sin(a) * k;
          circle(x, ex, ey, 17 * big, 'rgba(24,20,37,.85)');
          x.save(); x.translate(ex, ey); x.rotate(a); x.scale(big, big); x.fillStyle = '#fee761'; x.beginPath(); x.moveTo(9, 0); x.lineTo(-5, -7); x.lineTo(-5, 7); x.fill(); x.restore();
          x.font = '700 11px Inter, system-ui, sans-serif'; const left = ex > innerWidth / 2; x.textAlign = left ? 'right' : 'left'; x.fillStyle = '#f7f1e7';
          x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 4; x.fillText(lbl, left ? ex - 24 * big : ex + 24 * big, ey); x.shadowBlur = 0; x.textAlign = 'center';
        }
      }
      // speech pops
      const now = performance.now();
      for (const p of this.fx) { if (p.room !== this.room) continue; const u = (now - p.t0) / (p.until - p.t0); x.globalAlpha = Math.min(1, (1 - u) * 3); x.font = 'italic 700 14px Fraunces, Georgia, serif'; const w = x.measureText(p.text).width + 18, X = sx(p.x), Y = sy(p.y) - u * 16; x.fillStyle = '#f7f1e7'; rrect(x, X - w / 2, Y - 12, w, 24, 12); x.fill(); x.fillStyle = '#1b1e25'; x.fillText(p.text, X, Y); x.globalAlpha = 1; }
      // interaction prompt
      if (f && !this.paused && !this.attract) {
        const X = sx(f.x), Y = topOf(f) - (f.kind === 'npc' && f.name ? 30 : 14) * big - (f.marker ? 22 * big : 0);
        const key = this.touch ? '' : 'E'; x.font = `700 ${Math.round(12 * big)}px Inter, system-ui, sans-serif`;
        const w = x.measureText(f.prompt).width + (key ? 34 : 20);
        x.fillStyle = 'rgba(24,20,37,.9)'; rrect(x, X - w / 2, Y - 13 * big, w, 26 * big, 13 * big); x.fill();
        if (key) { x.fillStyle = '#fee761'; rrect(x, X - w / 2 + 5, Y - 9 * big, 18, 18 * big, 4); x.fill(); x.fillStyle = '#1b1e25'; x.fillText(key, X - w / 2 + 14, Y + 0.5); }
        x.fillStyle = '#f7f1e7'; x.fillText(f.prompt, X + (key ? 12 : 0), Y + 0.5);
      }
      x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      // vignette and fade
      const vw = innerWidth, vh = innerHeight;
      const vg = x.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.45, vw / 2, vh / 2, Math.max(vw, vh) * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,6,14,0.3)'); x.fillStyle = vg; x.fillRect(0, 0, vw, vh);
      if (this.fade > 0) { x.fillStyle = `rgba(8,6,14,${this.fade})`; x.fillRect(0, 0, vw, vh); }
    }

    // A plain renderer used only if the art module is missing
    fallbackScene(room) {
      const COL = { '.': '#63c74d', ',': '#6fcf58', '"': '#8fd16a', r: '#5a6988', l: '#7a7f8c', '-': '#c0cbdc', p: '#e4a672', s: '#9aa5b8', e: '#b8c2d3', _: '#a9a9a9', c: '#6f7a90', x: '#5a6988', n: '#8b9bb4', o: '#8b9bb4', g: '#b86f50', m: '#c28569', y: '#b8b8a0', '%': '#3a4466', ':': '#8a7d68', '=': '#6b5a48', '/': '#6b5a48', b: '#8b9bb4', '!': '#2c7c77', z: '#f2c230', a: '#9a9a8a', t: '#265c42', h: '#3e8948', f: '#5a6988', k: '#8b9bb4', '#': '#9aa0a8', w: '#0099db', q: '#8b9bb4', '^': '#e8e8e8', '|': '#3a4466', j: '#3a4466', '&': '#6f6a61', '+': '#c0cbdc', $: '#b8433f', v: '#e43b44' };
      const rows = room === 'outside' ? L.rows : ROOMS[room].grid, w = rows[0].length * T, h = rows.length * T;
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      rows.forEach((row, y) => row.split('').forEach((ch, xx) => { g.fillStyle = room === 'outside' ? (COL[ch] || (/[A-Z]/.test(ch) ? '#b86f50' : /[0-9*]/.test(ch) ? '#3e2731' : '#63c74d')) : (ch === '#' ? '#3e2731' : ch === '.' || ch === 'm' || ch === 'X' ? '#c28569' : '#733e39'); g.fillRect(xx * T, y * T, T, T); }));
      return { w, h, ground: c, objects: [], lights: [], anchors: {} };
    }
    snapshot(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; const s = Math.max(w / this.cv.width, h / this.cv.height), dw = this.cv.width * s, dh = this.cv.height * s; x.drawImage(this.cv, (w - dw) / 2, (h - dh) * 0.5, dw, dh); return c; }
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function rrect(x, X, Y, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, r); else x.rect(X, Y, w, h); }
  function circle(x, X, Y, r, col) { x.fillStyle = col; x.beginPath(); x.arc(X, Y, r, 0, 7); x.fill(); }
  function label(x, s, X, Y, col, size) { x.fillStyle = col; x.font = `800 ${size}px Inter, system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, X, Y); }
  LS.World = World;
  LS.WORLD = { MAP, T, ROOMS, DOORS, tp, toTile, level: L };
})();
