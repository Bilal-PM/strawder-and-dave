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
  // Walk cadence. The walk cycle is 8 frames (two steps); phase counts frames and advances with distance, one frame
  // per stride(v) world units. At walking pace (80 u/s) that is 4 u a frame: 20 frames/s, five steps a second, the
  // brisk cadence the sprite's short chibi legs can carry. Cadence rises with the square root of speed (so slow NPCs
  // step slower but not in slow motion) and never lets the feet travel less than the ground (1.5 u a frame).
  const stride = v => Math.max(1.5, Math.sqrt(Math.max(0, v) * 80) / 20);
  // 4-way facing towards (dx, dy); `cur` is kept until the other axis is clearly bigger (no flicker on a diagonal)
  const dir4 = (dx, dy, cur) => { const ax = Math.abs(dx), ay = Math.abs(dy), H = 1.25; if ((cur === 'left' && dx < 0 || cur === 'right' && dx > 0) && ax * H >= ay) return cur; if ((cur === 'up' && dy < 0 || cur === 'down' && dy > 0) && ay * H >= ax) return cur; return ax > ay ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };
  const seedOf = k => { const s = String(k); let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return (h % 1000) / 1000; };
  // ground that kicks up dust underfoot: dirt path, gravel, setts, ballast, cess and yard (two or three tones each)
  const DUST = { p: ['#ead7b4', '#dcc39c', '#f3e6cc'], _: ['#e2ddd2', '#cfc9bc', '#f0ece4'], s: ['#d8d4cc', '#e8e5de'], y: ['#dcdcc8', '#ececdc'],
    ':': ['#dcd0bc', '#cbbfa8', '#ebe2d2'], '=': ['#dcd0bc', '#cbbfa8'], '/': ['#dcd0bc', '#cbbfa8'], b: ['#d8d8d0', '#c6c6be'], a: ['#dedad0', '#ccc8bc'], '!': ['#dcd0bc', '#cbbfa8'] };

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
      this.setFace(p, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      if (f.kind === 'door') { this.tryDoor(f.door); return; }
      if (f.kind === 'exit') { this.exitRoom(); return; }
      if (f.kind === 'npc') this.setFace(f, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'up' : 'down'));
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
      this.fadeCb = () => { this.room = room; this.player.x = x; this.player.y = y; this.player.face = face || this.player.face; this.player.path = null; this.trail = []; this.crumbs = null; this.dust = []; this.fitScale(); this.snapCam();
        for (const e of this.entities) if (e.follow && room === 'outside') { e.room = room; e.x = x; e.y = y + 10; }
        if (LS.audio && LS.audio.setRoom) LS.audio.setRoom(room);
        if (this.onEnterRoom) this.onEnterRoom(room); };
    }
    place(room, x, y, face) { this.dust = []; this.room = room; this.player.x = x; this.player.y = y; if (face) this.player.face = face; this.player.path = null; this.fitScale(); this.snapCam(); if (LS.audio && LS.audio.setRoom) LS.audio.setRoom(room); }
    // snap on room change or teleport: no easing, no look-ahead carried over, no leftover momentum
    snapCam() { this.look = { x: 0, y: 0 }; const p = this.player; p.vx = p.vy = 0; const c = this.camTarget(); this.camX = c[0]; this.camY = c[1]; this.cam1 = [c[0], c[1]]; this._cxs = null; }
    // Camera: two cascaded exponential followers (a critically damped spring: smooth start, no overshoot for any
    // monotonic move) chasing the player plus a look-ahead of up to 1.5 tiles in the walking direction. The look-ahead
    // eases in slowly and is held when the player stops, so the camera never drifts back past where it came to rest.
    updateCam(dt) {
      const p = this.player, L0 = this.look || (this.look = { x: 0, y: 0 });
      if (this.attract) { const [tx, ty] = this.camTarget(), k = Math.min(1, dt); this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k; this.cam1 = [this.camX, this.camY]; return; }
      const sp = Math.hypot(p.vx || 0, p.vy || 0);
      if (sp > 20 && !this.paused) { const kl = 1 - Math.exp(-dt / 0.55), m = Math.min(1, sp / 80); L0.x += ((p.vx / sp) * 24 * m - L0.x) * kl; L0.y += ((p.vy / sp) * 16 * m - L0.y) * kl; }
      // gentler glide into and back out of a conversation's two-shot
      const inConv = !!(this._conv && this._conv.e); this._convEase = inConv ? 0.9 : Math.max(0, (this._convEase || 0) - dt);
      const [tx, ty] = this.camTarget(), k = 1 - Math.exp(-dt * (this._convEase > 0 ? 5 : 15)), c1 = this.cam1 || (this.cam1 = [this.camX, this.camY]);
      c1[0] += (tx - c1[0]) * k; c1[1] += (ty - c1[1]) * k;
      this.camX += (c1[0] - this.camX) * k; this.camY += (c1[1] - this.camY) * k;
    }
    // Pixel-perfect camera: the ground scrolls in whole art pixels, and while the camera is following it is snapped
    // relative to the player (player snapped, then the player-to-camera offset snapped), so the player never jitters
    // against the screen and never slides against the ground. At rest it holds its last pixel (no 1 px pop).
    camPx(q) {
      const p = this.player, sn = v => Math.round(v * q) / q, prev = this._cxs;
      let cx, cy;
      const moving = !prev || prev.q !== q || Math.abs(this.camX - prev.rx) > 1e-4 || Math.abs(this.camY - prev.ry) > 1e-4;
      if (moving && p.look && !this.attract) { cx = sn(p.x) - sn(p.x - this.camX); cy = sn(p.y) - sn(p.y - this.camY); }
      else if (moving) { cx = sn(this.camX); cy = sn(this.camY); }
      else { cx = Math.abs(prev.cx - this.camX) <= 1 / q ? prev.cx : sn(this.camX); cy = Math.abs(prev.cy - this.camY) <= 1 / q ? prev.cy : sn(this.camY); }
      this._cxs = { q, rx: this.camX, ry: this.camY, cx, cy };
      return [cx, cy];
    }
    camTarget() {
      const p = this.player;
      if (this.attract) { const t = (performance.now() - this.t0) / 1000, u = 0.5 + 0.5 * Math.sin(t * 0.035 - 1.4); return [Math.max(0, Math.min(MAP.W - this.vw, (14 + u * 90) * T - this.vw / 2)), Math.max(0, Math.min(MAP.H - this.vh, 28 * T - this.vh / 2 + Math.sin(t * 0.03) * 60))]; }
      const lk = this.look || { x: 0, y: 0 }, c = this._conv;
      let fx = p.x + lk.x, fy = p.y + lk.y - 12;   // the point the camera centres on
      if (c && c.e) {   // in conversation: centre the pair, in the space between the HUD and the dialogue card
        const S = this.S || 1, hud = this.hudBottom() / S, card = Math.min(innerHeight, c.top != null && c.top > 0 ? c.top : innerHeight) / S, free = card - hud;
        const want = free > 44 ? hud + free / 2 : this.vh / 2;
        fx = (p.x + c.e.x) / 2; fy = (p.y + c.e.y) / 2 - 14 - want + this.vh / 2;
      }
      if (this.room !== 'outside') {
        const R = ROOMS[this.room], hud = this.hudBottom() / (this.S || 1);
        const cx = R.w < this.vw ? (R.w - this.vw) / 2 : Math.max(-8, Math.min(R.w + 8 - this.vw, fx - this.vw / 2));
        // a room shorter than the screen is centred in the space below the HUD (so the HUD sits over the letterbox,
        // not over the room's signage); one that only fits under the HUD sits on the bottom edge
        let cy = R.h + hud + 8 <= this.vh ? -(hud + (this.vh - hud - R.h) / 2) : R.h < this.vh - 30 ? R.h + 4 - this.vh : Math.max(-24, Math.min(R.h + 24 - this.vh, fy - this.vh / 2));
        // in conversation the two-shot wins, as long as at least half the screen stays on the room
        if (c && c.e) return [R.w < this.vw ? cx : Math.max(-this.vw / 2, Math.min(R.w - this.vw / 2, fx - this.vw / 2)), Math.max(Math.min(cy, -this.vh / 2), Math.min(Math.max(cy, R.h - this.vh / 2), fy - this.vh / 2))];
        return [cx, cy];
      }
      return [Math.max(0, Math.min(MAP.W - this.vw, fx - this.vw / 2)), Math.max(0, Math.min(MAP.H - this.vh, fy - this.vh / 2))];
    }
    // Bottom edge of the HUD band in CSS px (the top bar and the menu button), re-measured every half second.
    hudBottom() {
      const now = performance.now(), h = this._hudB;
      if (h && now - h.t < 500 && h.w === innerWidth && h.h === innerHeight) return h.v;
      let v = 0;
      if (typeof document !== 'undefined') for (const el of document.querySelectorAll('#hud .hud-top, #hudMenu')) { const r = el.getBoundingClientRect(); if (r.height > 0 && r.top < innerHeight * 0.3 && r.bottom < innerHeight * 0.3) v = Math.max(v, r.bottom); }
      this._hudB = { t: now, w: innerWidth, h: innerHeight, v };
      return v;
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
          if (d < 2.5) { p.path.shift(); if (!p.path.length) { const u = p.use; p.path = null; p.use = null; if (u) { this.focus = u; this.use(); } else this.checkDoorArrive(); }
            else { const n = p.path[0], nd = Math.hypot(n.x - p.x, n.y - p.y); if (nd > 1e-3) { dx = (n.x - p.x) / nd; dy = (n.y - p.y) / nd; } } }   // straight on to the next waypoint: no stall
          else { dx = tx / d; dy = ty / d; }
        }
      }
      const len = Math.hypot(dx, dy);
      // Weight: velocity eases towards the intended velocity (full speed in ~0.08 s) and bleeds off in ~0.06 s when
      // input stops. Path walking keeps its direction exactly (so it never cuts a corner) and eases only the speed.
      const vmax = 80 * (this.keys['shift'] ? 1.6 : 1);
      if (len > 0) { dx /= Math.max(1, len); dy /= Math.max(1, len); }
      let tvx = dx * vmax, tvy = dy * vmax;
      if (!manual && len > 0 && p.path && p.path.length === 1) {   // last waypoint: arrive, never overshoot
        const w = p.path[0], d = Math.hypot(w.x - p.x, w.y - p.y), cap = Math.min(vmax, 12 + d / 0.05);
        tvx = dx * cap; tvy = dy * cap;
      }
      p.vx = p.vx || 0; p.vy = p.vy || 0;
      if (len > 0 && !manual) { const cs = Math.hypot(p.vx, p.vy), ts = Math.hypot(tvx, tvy), ns = Math.min(ts, cs + vmax / 0.08 * dt); p.vx = dx / Math.hypot(dx, dy) * ns; p.vy = dy / Math.hypot(dx, dy) * ns; }
      else {
        const ex = tvx - p.vx, ey = tvy - p.vy, el = Math.hypot(ex, ey), rate = (len > 0 ? vmax / 0.08 : vmax / 0.06) * dt;
        if (el <= rate) { p.vx = tvx; p.vy = tvy; } else { p.vx += ex / el * rate; p.vy += ey / el * rate; }
      }
      const spd = Math.hypot(p.vx, p.vy);
      if (spd > 0.01) {
        const ox = p.x, oy = p.y, nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        const bx = this.canStand(nx, p.y), by = this.canStand(p.x, ny);
        if (!bx) p.x = nx; else p.vx = 0;
        if (!by) p.y = ny; else p.vy = 0;
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
        if (len > 0) this.faceTo(p, dx, dy);
        // the walk cycle advances with distance walked, at a cadence matched to speed (see stride()), so feet don't skate
        const moved = Math.hypot(p.x - ox, p.y - oy); p.moving = moved > 0.01; p.phase += moved / stride(moved / Math.max(1e-4, dt));
        const st = Math.floor((p.phase + 3) / 4); if (p.moving && st !== p.lastStep) { p.lastStep = st; if (LS.audio && LS.audio.sfx) LS.audio.sfx(this.stepSound(p.x, p.y)); this.footfall(p.x, p.y, p.vx, p.vy); }
        if (manual) this.checkDoorStep(dy);
        const lt = this.trail[this.trail.length - 1]; if (!lt || Math.hypot(lt.x - p.x, lt.y - p.y) > 6) { this.trail.push({ x: p.x, y: p.y }); if (this.trail.length > 40) this.trail.shift(); }
      } else { p.vx = p.vy = 0; p.moving = false; p.phase = 0; p.lastStep = -1; if (len > 0) this.faceTo(p, dx, dy); }
      this.tickTurn(p, dt);
      this.convTick();
      this.updateNPCs(dt);
      // sheep: ease into and out of each amble (no instant starts), and turn only when properly under way
      for (const s of this.sheep) {
        s.t -= dt; if (s.t <= 0) { s.t = 2 + Math.random() * 5; const a = Math.random() * 6.28, m = Math.random() < 0.5 ? 0 : 8; s.dx = Math.cos(a) * m; s.dy = Math.sin(a) * m * 0.6; }
        const k = 1 - Math.exp(-dt / 0.45); s.vx = (s.vx || 0) + (s.dx - (s.vx || 0)) * k; s.vy = (s.vy || 0) + (s.dy - (s.vy || 0)) * k;
        if (Math.abs(s.vx) > 1.5) s.face = s.vx > 0 ? 1 : -1;
        const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt; if (L.rows[Math.floor(ny / T)] && L.rows[Math.floor(ny / T)][Math.floor(nx / T)] === '"') { s.x = nx; s.y = ny; } else { s.vx = s.vy = s.dx = s.dy = 0; }
      }
      this.tickDust(dt);
      // focus: the nearest interactable within reach of its stand point
      let best = null, bd = 22;
      if (!this.paused) for (const e of this.visible()) { if (!e.prompt) continue; const d = Math.hypot((e.sx ?? e.x) - p.x, ((e.sy ?? e.y) - p.y) * 1.2); if (d < bd) { bd = d; best = e; } }
      if (best !== this.focus && this.onFocus) this.onFocus(best);
      this.focus = best;
      this.updateCam(dt);
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
      const p = this.player, cv = this._conv;
      for (const e of this.entities) {
        if (e.kind !== 'npc' || e.room !== this.room || e.hidden) continue;
        let gx = null, gy = null, speed = 40;
        const sb = e._sb;
        if (sb && (sb.room !== e.room || Math.min(Math.hypot(e.x - sb.x0, e.y - sb.y0), Math.hypot(e.x - sb.tx, e.y - sb.ty)) > 30)) e._sb = null;   // moved by the story
        if (e._sb) {   // the conversation step-back, and the step home again afterwards
          const back = !(cv && cv.e === e), X = back ? sb.x0 : sb.tx, Y = back ? sb.y0 : sb.ty;
          if (back && Math.hypot(X - e.x, Y - e.y) < 2.2) { e.x = X; e.y = Y; e._sb = null; } else { gx = X; gy = Y; speed = 34; }
        } else if (e.follow && !this.paused && e.room === this.room) {
          const behind = () => this.trail[Math.max(0, this.trail.length - 4)] || { x: p.x, y: p.y + 14 };
          const tr = behind();
          if (Math.hypot(tr.x - e.x, tr.y - e.y) > 10 && Math.hypot(p.x - e.x, p.y - e.y) > 20) { gx = tr.x; gy = tr.y; speed = 86; }
          // left far behind: catch up with a short fade (out 0.15 s, move, in 0.15 s) rather than a visible pop;
          // if they are off screen anyway they just step in behind the player
          if (!e.hop && Math.hypot(p.x - e.x, p.y - e.y) > 8 * T) {
            const off = e.x < this.camX - 24 || e.x > this.camX + this.vw + 24 || e.y < this.camY - 8 || e.y > this.camY + this.vh + 40;
            if (off) { const b = behind(); e.x = b.x; e.y = b.y; e.spd = 0; } else e.hop = { t: 0, moved: false };
          }
          if (e.hop) {
            e.hop.t += dt; gx = null;
            if (e.hop.t >= 0.15 && !e.hop.moved) { const b = behind(); e.x = b.x; e.y = b.y; e.spd = 0; e.hop.moved = true; }
            e.alpha = e.hop.t < 0.15 ? 1 - e.hop.t / 0.15 : Math.min(1, (e.hop.t - 0.15) / 0.15);
            if (e.hop.t >= 0.3) { e.hop = null; e.alpha = 1; }
          }
          // standing on someone (the trail ran through them): step aside a few units
          if (gx === null && !e.hop) { const [sx, sy, near] = this.separation(e, 0, 0); if (near < 9) { const l = Math.hypot(sx, sy) || 1, ax = e.x + sx / l * 10, ay = e.y + sy / l * 10; if (!this.canStand(ax, ay)) { gx = ax; gy = ay; speed = 30; } } }
        } else if (e.guide && !e.guide.done) {
          const G = e.guide, w = G.path[G.i];
          if (!w) { G.done = true; if (G.onDone) G.onDone(); }
          else if (Math.hypot(p.x - e.x, p.y - e.y) < 5 * T || G.i === 0) { gx = w.x; gy = w.y; speed = 70; if (Math.hypot(w.x - e.x, w.y - e.y) < 2.5) G.i++; }
        } else if (e.wander && !this.paused) {
          e.wt = (e.wt || 0) - dt;
          if (e.wt <= 0) { const [x0, y0, x1, y1] = e.wander; const tx = x0 + Math.floor(Math.random() * (x1 - x0 + 1)), ty = y0 + Math.floor(Math.random() * (y1 - y0 + 1)); const q = tp(tx, ty); e.goal = [q.x, q.y]; e.wt = 3 + Math.random() * 6; }
          if (e.goal) { gx = e.goal[0]; gy = e.goal[1]; }
        }
        // NPCs ease in (about 0.1 s to full pace) and ease out as they arrive (never past the goal)
        if (gx !== null) {
          const ddx = gx - e.x, ddy = gy - e.y, d = Math.hypot(ddx, ddy);
          e.moving = d > 2;
          if (e.moving) {
            const through = e.guide && e.guide.path && e.guide.i < e.guide.path.length - 1, cap = through ? speed : Math.min(speed, 10 + d / 0.08);
            e.spd = Math.min(cap, (e.spd || 0) + speed / 0.1 * dt);
            const st = Math.min(d, e.spd * dt);
            let ux = ddx / d, uy = ddy / d;
            if (e.follow) {   // separation: steer round anyone in the way instead of walking through them
              const [sx, sy] = this.separation(e, ux, uy), vx = ux + sx, vy = uy + sy, vl = Math.hypot(vx, vy);
              if (vl > 1e-3) { const nx = vx / vl, ny = vy / vl; if (!this.canStand(e.x + nx * st, e.y + ny * st)) { ux = nx; uy = ny; } }
            }
            e.x += ux * st; e.y += uy * st;
            this.faceTo(e, ux, uy); e.phase = (e.phase || 0) + st / stride(st / Math.max(1e-4, dt));
          } else { e.spd = 0; e.phase = 0; if (e.goal && e.wander) e.goal = null; }
        } else { e.moving = false; e.spd = 0; e.phase = 0; }
        if (!e.moving && !(e.guide && !e.guide.done)) this.lookAtPlayer(e, dt, cv && cv.e === e);
        this.tickTurn(e, dt);
      }
    }
    // Separation steering for a walking NPC: a push away from every other actor within about a tile, plus a sideways
    // component round anyone ahead (so they pass beside, not through). Radius 22 units. Returns [px, py, nearest distance].
    separation(e, ux, uy) {
      let sx = 0, sy = 0, near = 1e9;
      const others = this.entities.filter(o => o !== e && o.kind === 'npc' && o.room === this.room && !o.hidden);
      others.push(this.player);
      for (const o of others) {
        const rx = e.x - o.x, ry = e.y - o.y, d = Math.hypot(rx, ry); near = Math.min(near, d);
        if (d >= 22 || d < 1e-3) continue;
        const w = (22 - d) / 22; sx += rx / d * w * 1.8; sy += ry / d * w * 1.8;
        if (ux * -rx + uy * -ry > 0) { const tx = -uy, ty = ux, sg = (tx * rx + ty * ry) >= 0 ? 1 : -1; sx += tx * sg * w * 1.6; sy += ty * sg * w * 1.6; }
      }
      return [sx, sy, near];
    }
    // Idle NPCs notice you: within about 2.5 tiles they turn to face the player (4 directions, the new facing has to
    // hold for 0.2 s before they turn, so a player walking past doesn't make them twitch); once the player is more
    // than 3 tiles away they go back to how they were standing. In conversation the speaker turns straight away.
    lookAtPlayer(e, dt, talking) {
      const p = this.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy * 1.2);
      if (!['down', 'up', 'left', 'right'].includes(e.face || 'down')) return;
      const near = talking || d < (e.homeFace ? 3 * T : 2.5 * T);
      if (e.homeFace && e.homeAt && Math.hypot(e.x - e.homeAt[0], e.y - e.homeAt[1]) > 4) e.homeFace = null;   // moved by the story: forget
      if (near && !e.homeFace) { e.homeFace = e.face || 'down'; e.homeAt = [e.x, e.y]; }
      const want = near ? dir4(dx, dy, e.face) : e.homeFace;
      if (!want) return;
      if (want !== e.face) { e.lookT = (e.lookT || 0) + dt; if (talking || e.lookT >= (near ? 0.2 : 0.6)) { this.setFace(e, want); e.lookT = 0; } }
      else e.lookT = 0;
      if (!near && e.face === e.homeFace) e.homeFace = null;
    }
    // Conversation staging (presentation only): while a dialogue card is up, find who is speaking (the name on the
    // card, or world.speaker), turn the player and them to face each other, let the camera ease to the midpoint, and
    // tell the renderer while their line is still typing so the speaker's head nods along.
    convTick() {
      const now = performance.now();
      if (!this.paused || this.attract || typeof document === 'undefined') { this._conv = null; return; }
      const box = document.querySelector('#talk.on .dlg') || document.querySelector('#talk.on .narr');
      if (!box) { this._conv = null; return; }
      let id = this.speaker;
      const nm = box.querySelector('.who .nm'), name = nm && nm.textContent;
      if (name) {
        const pk = LS.PACKS && Object.values(LS.PACKS)[0], cast = pk && pk.cast;
        if (cast) { if (!this._castBy || this._castBy.n !== name) { const k = Object.keys(cast).find(k => cast[k] && cast[k].name === name); this._castBy = { n: name, id: k || null }; } if (this._castBy.id) id = this._castBy.id; }
      }
      const e = id && this.entities.find(v => v.kind === 'npc' && v.id === id && v.room === this.room && !v.hidden);
      const p = this.player, c = this._conv && this._conv.e === e ? this._conv : (this._conv = { e, len: 0, grew: -1e9, top: null, box: null });
      if (!e || Math.hypot(e.x - p.x, e.y - p.y) > 6 * T) { c.e = null; return; }
      const tx = box.querySelector('.tx'), n = tx ? tx.textContent.length : 0;
      if (box !== c.box) { c.box = box; c.len = 0; }
      if (n > c.len) c.grew = now; c.len = n; c.typing = now - c.grew < 140 && !!nm;
      if (!c.top || now - c.topT > 400) { c.top = box.getBoundingClientRect().top; c.topT = now; }
      // standing on top of each other (a scripted entrance can do that): the speaker takes a small step aside first
      const gap = Math.hypot(e.x - p.x, e.y - p.y);
      if (gap < 11 && !e._sb && !e.moving && !e.follow && !(e.guide && !e.guide.done)) {
        const l = gap > 0.5 ? gap : 1, ux = gap > 0.5 ? (e.x - p.x) / l : 0, uy = gap > 0.5 ? (e.y - p.y) / l : 1;
        const sd = e.x >= p.x ? 1 : -1;   // side by side reads best as a two-shot, so step to the side first
        for (const [dx, dy] of [[sd, 0], [-sd, 0], [ux, uy], [0, 1], [0, -1]]) { const tx = p.x + dx * 20, ty = p.y + dy * 16; if (!this.canStand(tx, ty)) { e._sb = { room: this.room, x0: e.x, y0: e.y, tx, ty }; break; } }
      }
      if (!p.moving && !e.moving) this.setFace(p, dir4(e.x - p.x, e.y - p.y, p.face));
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
    spawnSheep() { const r = LS.art ? LS.art.rng(4) : Math.random; const tiles = []; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (L.rows[y][x] === '"') tiles.push([x, y]); for (let i = 0; i < 9 && tiles.length; i++) { const [x, y] = tiles[Math.floor(r() * tiles.length)]; this.sheep.push({ x: x * T + 8, y: y * T + 12, t: r() * 5, dx: 0, dy: 0, vx: 0, vy: 0, face: 1, seed: i * 1.7 }); } }

    // ---------- Animation helpers ----------
    // Facing with hysteresis: near a diagonal the current facing holds until the other axis clearly wins, so a
    // diagonal walk (keyboard, joystick or A* path) never flickers between two rows of the sheet.
    faceTo(o, dx, dy) {
      const ax = Math.abs(dx), ay = Math.abs(dy), f = o.face, H = 1.35;
      if ((f === 'left' && dx < 0 || f === 'right' && dx > 0) && ax * H >= ay) return;
      if ((f === 'up' && dy < 0 || f === 'down' && dy > 0) && ay * H >= ax) return;
      this.setFace(o, ax > ay ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    }
    // A turn right round (left to right, up to down) passes through one in-between frame, like a real body turning.
    setFace(o, face) {
      if (!face || face === o.face) return;
      const opp = { left: 'right', right: 'left', up: 'down', down: 'up' }[o.face] === face;
      if (opp) { o.turnVia = (face === 'left' || face === 'right') ? 'down' : (o.lastSide || 'right'); o.turnT = 0.07; }
      if (face === 'left' || face === 'right') o.lastSide = face;
      o.face = face;
    }
    tickTurn(o, dt) { if (o.turnT > 0) o.turnT -= dt; }
    shownFace(o) { return o.turnT > 0 && o.turnVia ? o.turnVia : (o.face || 'down'); }
    // Footfalls outdoors on loose or hard ground kick up a few pixels of dust (a ripple instead, in the rain).
    footfall(x, y, vx, vy) {
      if (this.room !== 'outside' || this.reduced) return;
      const c = (L.rows[Math.floor(y / T)] || '')[Math.floor(x / T)] || '.', col = DUST[c]; if (!col) return;
      const a = this._atm, wet = a && a.cur && a.cur.rain > 0.3, D = this.dust || (this.dust = []);
      if (D.length > 60) D.splice(0, D.length - 60);
      const sp = Math.hypot(vx, vy) || 1, bx = -vx / sp, by = -vy / sp, side = ((this._foot = !this._foot) ? 1 : -1) * 2;
      const fx = x - by * side * 0.6, fy = y + 0.5;
      if (wet) { D.push({ ring: 1, x: fx, y: fy, t: 0, life: 0.45 }); return; }
      for (let i = 0; i < 4; i++) D.push({ x: fx + bx * 2 + (Math.random() - 0.5) * 3, y: fy - Math.random() * 0.8, vx: bx * (5 + Math.random() * 7) + (Math.random() - 0.5) * 7, vy: by * 3 - 2.5 - Math.random() * 3.5, t: 0, life: 0.28 + Math.random() * 0.1, c: col[i % col.length], s: 2 + (i & 1) });
    }
    tickDust(dt) { const D = this.dust; if (!D || !D.length) return; for (const d of D) { d.t += dt; if (!d.ring) { d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 1 - 4 * dt; d.vy *= 1 - 4 * dt; } } this.dust = D.filter(d => d.t < d.life); }
    drawDust(x) {
      const D = this.dust; if (!D || !D.length || this.room !== 'outside') return;
      const q = this.snapRes || 3, px = 1 / q;
      for (const d of D) {
        const u = d.t / d.life;
        if (d.ring) { x.globalAlpha = 0.55 * (1 - u); x.strokeStyle = '#dfe8f0'; x.lineWidth = px; x.beginPath(); x.ellipse(d.x, d.y, 1.5 + u * 5, (1.5 + u * 5) * 0.4, 0, 0, 7); x.stroke(); continue; }
        // a soft puff: a pixel cluster that swells by an art pixel, lifts and fades
        const n = d.s + (u > 0.35 ? 1 : 0), sz = n * px, hf = (n >> 1) * px, X = Math.round(d.x * q) / q - hf, Y = Math.round(d.y * q) / q - hf;
        x.globalAlpha = 0.78 * (1 - u) * (1 - u * 0.4); x.fillStyle = d.c;
        x.fillRect(X, Y, sz, sz); x.fillRect(X - px, Y + px, sz + 2 * px, Math.max(px, sz - 2 * px));
      }
      x.globalAlpha = 1;
    }
    pop(room, x, y, text, secs) { this.fx.push({ room, x, y, text, until: performance.now() + (secs || 1.6) * 1000, t0: performance.now() }); }
    invalidate(room) { delete this.scenes[room]; }

    loop(now) {
      requestAnimationFrame(t => this.loop(t));
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      this.fitScale(); this.update(dt);
      const t = (now - this.t0) / 1000;
      if (LS.setLight && this.P) LS.setLight(this.P, LIGHT[this.cfg.time] ?? 0.1);
      if (!(LS.R3D && LS.R3D.active && LS.R3D.draw(this, this.ctx, t))) this.draw(this.ctx, t);   // HD-2D renderer (js/world/r3d/), when switched on
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
      const [cx, cy] = this.camPx(snap);
      this.snapRes = snap; this._cx = cx; this._cy = cy;
      x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false;
      x.fillStyle = this.room === 'outside' ? '#265c42' : this.letterbox(x, sc, cx, cy, Z); x.fillRect(0, 0, this.cv.width, this.cv.height);
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
      this.drawDust(x);
      // y-sorted objects and actors
      const Lst = [], add = (y, fn) => Lst.push([y, fn]), p = this.player, cv = this._conv;
      for (const o of sc.objects) {
        const ow = o.w || o.img.width / res, oh = o.h || o.img.height / res;   // world-unit size (w/h optional)
        if (o.dx > x1 || o.dx + ow < x0 || o.dy > y1 || o.dy + oh < y0) continue;
        add(o.sortY, () => { const f = o.fade && p.x > o.fade.x && p.x < o.fade.x + o.fade.w && p.y > o.fade.y && p.y < o.fade.y + o.fade.h; if (f) x.globalAlpha = 0.5; x.drawImage(o.img, o.dx, o.dy, ow, oh); if (o.lit && this.nightK > 0.04) { x.globalAlpha = Math.min(1, this.nightK) * (f ? 0.5 : 1); x.drawImage(o.lit, o.dx, o.dy, ow, oh); } x.globalAlpha = 1; });
      }
      for (const e of this.visible()) {
        if (e.x < x0 - 30 || e.x > x1 + 30 || e.y < y0 - 40 || e.y > y1 + 40) continue;
        if (e.kind === 'npc') add(e.y, () => this.actor(x, e.look, e.x, e.y, this.shownFace(e), e.moving ? (e.phase || 0) : 0, { ppe: e.ppe, moving: e.moving, idle: t, seed: seedOf(e.id || e.name || e.x), talk: !!(cv && cv.e === e && cv.typing), alpha: e.alpha != null && e.alpha < 1 ? e.alpha : null }));
        else if (e.kind === 'cat') add(e.y, () => this.animal(x, 'cat', e.x, e.y, t));
      }
      if (this.room === 'outside') {
        for (const s of this.sheep) if (s.x > x0 && s.x < x1 && s.y > y0 && s.y < y1) add(s.y, () => { const v = Math.hypot(s.vx || 0, s.vy || 0); this.animal(x, 'sheep', s.x, s.y, t, v > 3 ? { face: s.face, anim: 'walk', fps: 1.1 * v, seed: s.seed } : { face: s.face, seed: s.seed }); });
        const duck = (sc.anchors && sc.anchors.duck) || tp(83, 22); if (!this.flags.drainCleared) add(duck.y, () => this.animal(x, 'duck', duck.x, duck.y, t));
        if (this.mainTrain.y > -2000) add(this.mainTrain.y + 160, () => this.drawMainTrain(x, this.mainTrain.y));
      }
      if (this.room === 'shed' && !this.flags.pigeonGone) { const a = (sc.anchors && sc.anchors.pigeon) || { x: 24 * T, y: 4 * T + 6 }; add(a.sortY != null ? a.sortY : a.y + 40, () => this.animal(x, 'pigeon', a.x, a.y, t)); }
      if (p.look && !this.attract) add(p.y, () => this.actor(x, p.look, p.x, p.y, this.shownFace(p), p.moving ? p.phase : 0, { ppe: this.ppe, moving: p.moving, idle: t, seed: 0.37 }));
      Lst.sort((a, b) => a[0] - b[0]); for (const [, fn] of Lst) fn();
      this.grade(x, t, sc);
      if (this.depthOfField) this.depthOfField(x);
      this.drawUI(x, t, cx, cy);
    }
    // Indoors, the space round a room smaller than the screen is filled with a dark wash of the room's own top-wall
    // and skirting colours (sampled once per scene), graded towards the screen edges, instead of flat black.
    letterbox(x, sc, cx, cy, Z) {
      const R = ROOMS[this.room]; if (!R) return '#181425';
      if (!sc._lb) {
        sc._lb = ['#1c1826', '#141120'];
        try {
          const c = document.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('2d', { willReadFrequently: true });
          const at = (wx, wy) => { if (sc.chunks) { const k = sc.chunks.find(k => wx >= k.x && wx < k.x + k.w && wy >= k.y && wy < k.y + k.h); if (!k) return null; const r = sc.res || 1; g.drawImage(k.img, (wx - k.x) * r, (wy - k.y) * r, 1, 1, 0, 0, 1, 1); } else { const r = sc.res || 1; g.drawImage(sc.ground, wx * r, wy * r, 1, 1, 0, 0, 1, 1); } return g.getImageData(0, 0, 1, 1).data; };
          const avg = wy => { let r = 0, gg = 0, b = 0, n = 0; for (let i = 1; i < 8; i++) { const d = at(R.w * i / 8, wy); if (d && d[3]) { r += d[0]; gg += d[1]; b += d[2]; n++; } } return n ? [r / n, gg / n, b / n] : null; };
          const dark = (c, k) => `rgb(${Math.round(c[0] * k + 14 * (1 - k))},${Math.round(c[1] * k + 11 * (1 - k))},${Math.round(c[2] * k + 22 * (1 - k))})`;
          const top = avg(3), bot = avg(R.h - 3);
          if (top && bot) sc._lb = [dark(top, 0.34), dark(bot, 0.34), dark(top, 0.14), dark(bot, 0.14)];
        } catch (e) { /* unreadable canvas: keep the plain dark fill */ }
      }
      const L = sc._lb; if (L.length < 4) return L[0];
      const H = this.cv.height, y0 = Math.max(0, Math.min(H, -cy * Z)), y1 = Math.max(0, Math.min(H, (R.h - cy) * Z));
      const gr = x.createLinearGradient(0, 0, 0, H || 1), f = v => Math.max(0, Math.min(1, v / (H || 1)));
      gr.addColorStop(0, L[2]); gr.addColorStop(f(y0), L[0]); gr.addColorStop(f(y1), L[1]); gr.addColorStop(1, L[3]);
      return gr;
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
      // Learning World hook (js/learn/core.js): the lit Planning lamp and the Planning Lens draw here, in screen space.
      if (this.onDrawUI) { try { this.onDrawUI(x, t, sx, sy, Z); } catch (e) { } x.textAlign = 'left'; x.textBaseline = 'alphabetic'; }
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
