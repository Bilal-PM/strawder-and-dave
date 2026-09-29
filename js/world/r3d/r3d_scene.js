/* LINESIDE HD-2D renderer (js/world/r3d/*): building a 3D diorama from a 2D scene.
 *
 * Coordinates: three.js x = world x, z = world y (south, towards the camera), y = height. 1 unit = 1 world unit
 * (a tile is 16). The 2D art is an oblique 3/4 view (a point at height h is drawn h units up the screen), so every
 * sprite is stood back up from its base line (o.sortY):
 *   - rows below the base line (the foot of a tree, a post's contact shading) lie flat on the ground in front of it;
 *   - rows above it stand as an upright card at z = sortY;
 *   - for buildings, the roof rows (above the eave) lean back over the footprint (pitched roofs at ROOF_PITCH, flat
 *     roofs level), scaled so that from the design camera the sprite still projects exactly as it was painted.
 * All static sprites of a room go into one texture atlas (plus a matching atlas of their night "lit" overlays, used
 * as the emissive map) and a handful of merged meshes, bucketed in 256-unit cells so the camera culls them.
 * Ground: the HD ground chunks become textured planes, uploaded when they first come into view (LRU-limited).
 * Rooms: the top 32 units of the room art (the back wall) stand upright; the rest is the floor.
 */
window.LS = window.LS || {};
(function () {
  'use strict';
  const R3D = LS.R3D; if (!R3D || !R3D.active) return;
  const DEG = Math.PI / 180;
  const PITCH = 40 * DEG;                    // design camera pitch: the lean of roofs is solved for it
  const ROOF_PITCH = 35 * DEG;
  // eave: fraction of the sprite's height (from the top) that is roof; flat: a flat roof seen from above
  const BUILDINGS = {
    bakery: { eave: 0.40 }, barn: { eave: 0.28 }, beck_cottage: { eave: 0.42 }, cottage_a: { eave: 0.42 }, cottage_b: { eave: 0.42 },
    farmhouse: { eave: 0.42 }, hall: { eave: 0.55 }, pub: { eave: 0.36 }, school: { eave: 0.42 }, church: { eave: 0.0 },
    depot: { eave: 0.52 }, station_closed: { eave: 0.45 }, station_live: { eave: 0.45 }, signal_box: { eave: 0.30 },
    project_office: { eave: 0.18, flat: true }, welfare_cabin: { eave: 0.15, flat: true }, stores_container: { eave: 0.10, flat: true },
    station_canopy_closed: { eave: 0.30, flat: true }, station_canopy_live: { eave: 0.30, flat: true }
  };
  const CELL = 256;
  let THREE = null;
  R3D.BUILDINGS = BUILDINGS;

  /* ---------------------------------------------------------------- texture helpers */
  function pixelTex(img, o) {
    o = o || {};
    const t = new THREE.CanvasTexture(img);
    t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = o.mips === false ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = o.mips !== false;
    t.anisotropy = R3D.aniso || 1;
    t.flipY = o.flipY !== false;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }
  R3D.pixelTex = pixelTex;

  /* ---------------------------------------------------------------- atlas packing (shelf) */
  function pack(items, maxW) {   // items: {w, h} in px -> sets .x, .y; returns height used
    const PAD = 4, order = items.slice().sort((a, b) => b.h - a.h);
    let x = PAD, y = PAD, rowH = 0;
    for (const it of order) {
      if (x + it.w + PAD > maxW) { x = PAD; y += rowH + PAD; rowH = 0; }
      it.x = x; it.y = y; x += it.w + PAD; rowH = Math.max(rowH, it.h);
    }
    return y + rowH + PAD;
  }

  /* ---------------------------------------------------------------- the fade window (see-through round the player) */
  // Objects with a fade rect cut a soft round window round the player while the player stands inside the rect.
  function holeShader(mat, U) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uPlayer = U.uPlayer; sh.uniforms.uHole = U.uHole;
      sh.vertexShader = 'attribute vec4 aFade;\nuniform vec2 uPlayer;\nvarying float vHole;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n  vHole = (aFade.z > 0.0 && uPlayer.x > aFade.x && uPlayer.x < aFade.x + aFade.z && uPlayer.y > aFade.y && uPlayer.y < aFade.y + aFade.w) ? 1.0 : 0.0;');
      sh.fragmentShader = 'uniform vec3 uHole;\nvarying float vHole;\n' + sh.fragmentShader.replace('void main() {',
        'void main() {\n  if (vHole > 0.5) { float dh = distance(gl_FragCoord.xy, uHole.xy) / uHole.z; float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));\n    if (dh < 1.0 && smoothstep(0.7, 1.0, dh) < n) discard; }');
    };
    mat.customProgramCacheKey = () => 'lsHole';
  }

  /* ---------------------------------------------------------------- objects -> merged cards */
  function buildObjects(sc, room, U) {
    const objs = sc.objects.filter(o => o.img && o.img.width && o.kind !== 'hd_overlay');
    const res = sc.res || 1;
    // unique (img, lit) pairs
    const keyOf = new Map(), items = [];
    for (const o of objs) {
      let m = keyOf.get(o.img); if (!m) keyOf.set(o.img, m = new Map());
      let it = m.get(o.lit || null);
      if (!it) { it = { img: o.img, lit: o.lit || null, w: o.img.width, h: o.img.height }; m.set(o.lit || null, it); items.push(it); }
      o._r3dIt = it;
    }
    const maxT = Math.min(4096, R3D.maxTex || 4096);
    let AW = 2048; let AH = pack(items, AW);
    if (AH > AW) { AW = maxT; AH = pack(items, AW); }
    AH = Math.min(maxT, Math.pow(2, Math.ceil(Math.log2(AH))));
    const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    let anyLit = false;
    for (const it of items) { g.drawImage(it.img, it.x, it.y); if (it.lit) anyLit = true; }
    let litCv = null;
    if (anyLit) {
      litCv = document.createElement('canvas'); litCv.width = AW; litCv.height = AH;
      const l = litCv.getContext('2d'); l.imageSmoothingEnabled = false; l.fillStyle = '#000'; l.fillRect(0, 0, AW, AH);
      for (const it of items) if (it.lit) l.drawImage(it.lit, it.x, it.y, it.w, it.h);
    }
    const map = pixelTex(cv, { flipY: false }), emap = litCv ? pixelTex(litCv, { flipY: false }) : null;
    const mat = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.FrontSide, emissive: emap ? 0xffffff : 0x000000, emissiveMap: emap, emissiveIntensity: 0 });
    mat.shadowSide = THREE.DoubleSide;
    holeShader(mat, U);
    // geometry buckets
    const buckets = new Map(), same = new Map();
    const bucket = (x, z) => { const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL); let b = buckets.get(k); if (!b) buckets.set(k, b = { p: [], n: [], uv: [], f: [], idx: [] }); return b; };
    const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    const wallN = new THREE.Vector3(0, 0.35, 1).normalize();
    const cards = [];   // for lights: which card a 2D point lies on
    let flapK = 0;
    objs.forEach((o, i) => {
      const it = o._r3dIt, ow = o.w || o.img.width / res, oh = o.h || o.img.height / res;
      const x0 = o.dx, x1 = o.dx + ow, top = o.dy, bot = o.dy + oh;
      const u0 = it.x / AW, u1 = (it.x + it.w) / AW, vOf = Y => (it.y + (Y - top) / oh * it.h) / AH;
      const fd = o.fade ? [o.fade.x, o.fade.y, o.fade.w, o.fade.h] : [0, 0, 0, 0];
      const flatAll = o.sortY >= 1e5;
      let base = flatAll ? top : Math.max(top, Math.min(bot, o.sortY));
      const nth = same.get(o.sortY) || 0; same.set(o.sortY, nth + 1);
      const zb = base - 0.06 + Math.min(0.05, nth * 0.004);   // equal base lines: later objects in front (as the 2D sort)
      const B = bucket((x0 + x1) / 2, base);
      const quad = (a, b, c, d, n, va, vb) => {   // a,b bottom-left/right (row vb), c,d top-left/right (row va)
        const s = B.p.length / 3;
        B.p.push(...a, ...b, ...c, ...d);
        for (let k = 0; k < 4; k++) { B.n.push(n.x, n.y, n.z); B.f.push(...fd); }
        B.uv.push(u0, vb, u1, vb, u0, va, u1, va);
        B.idx.push(s, s + 1, s + 2, s + 2, s + 1, s + 3);
      };
      const up = { x: 0, y: 1, z: 0 };
      // 1. the part below the base line: flat on the ground, in front of the card
      if (bot > base + 0.01) {
        const y = 0.03 + (flapK++ % 40) * 0.004;
        quad([x0, y, bot], [x1, y, bot], [x0, y, base], [x1, y, base], up, vOf(base), vOf(bot));
      }
      if (flatAll) return;
      // 2. the wall, and 3. the roof leaning back
      const B0 = BUILDINGS[o.id], eave = B0 && B0.eave > 0 ? top + oh * B0.eave : top, He = base - eave;
      if (He > 0.01) quad([x0, 0, zb], [x1, 0, zb], [x0, He, zb], [x1, He, zb], wallN, vOf(eave), vOf(base));
      if (eave > top + 0.01) {
        const phi = B0.flat ? 0 : ROOF_PITCH, s = cp / Math.sin(phi + PITCH), ra = s * Math.sin(phi), rb = s * Math.cos(phi), u = eave - top;
        const n = new THREE.Vector3(0, rb, ra).normalize();
        quad([x0, He, zb], [x1, He, zb], [x0, He + u * ra, zb - u * rb], [x1, He + u * ra, zb - u * rb], n, vOf(top), vOf(eave));
      }
      cards.push({ x0, x1, top, base, eave, He, zb, B0, o, area: ow * oh });
    });
    const group = new THREE.Group();
    for (const b of buckets.values()) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      geo.setAttribute('aFade', new THREE.Float32BufferAttribute(b.f, 4));
      geo.setIndex(b.idx); geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    }
    return { group, mat, map, emap, cards, atlas: [AW, AH] };
  }

  // a 2D point (x, y) of the oblique art -> the 3D point it was painted from: on the smallest card that contains it
  function lift2D(cards, x, y, fallbackH) {
    let best = null;
    for (const c of cards) if (x >= c.x0 && x <= c.x1 && y >= c.top && y <= c.base && (!best || c.area < best.area)) best = c;
    if (!best) return new THREE.Vector3(x, fallbackH || 2, y);
    if (y >= best.eave || !best.B0) return new THREE.Vector3(x, best.base - y, best.zb + 1.5);
    const phi = best.B0.flat ? 0 : ROOF_PITCH, s = Math.cos(PITCH) / Math.sin(phi + PITCH), u = best.eave - y;
    return new THREE.Vector3(x, best.He + u * s * Math.sin(phi), best.zb - u * s * Math.cos(phi) + 1.5);
  }

  /* ---------------------------------------------------------------- ground */
  function groundChunks(sc, room) {
    const chunks = sc.chunks || [{ x: 0, y: 0, w: sc.w, h: sc.h, get img() { return sc.ground; } }];
    const out = [];
    const WALL = room === 'outside' ? 0 : 32;
    for (const c of chunks) {
      const e = { c, tex: null, meshes: [], lastSeen: -1, mat: new THREE.MeshLambertMaterial({ color: room === 'outside' ? 0x3d7a4e : 0x2a2230 }) };
      // floor part
      const fy0 = Math.max(c.y, WALL), fy1 = c.y + c.h;
      const mk = (y0, y1, wall) => {
        if (y1 <= y0) return;
        const geo = new THREE.PlaneGeometry(c.w, y1 - y0);
        const uv = geo.attributes.uv;   // PlaneGeometry: v=1 at the top edge; flipY textures have v=1 at the image top
        for (let i = 0; i < uv.count; i++) { const v = uv.getY(i); uv.setY(i, 1 - ((v > 0.5 ? y0 : y1) - c.y) / c.h); }
        const m = new THREE.Mesh(geo, e.mat);
        if (wall) { m.position.set(c.x + c.w / 2, (y1 - y0) / 2, WALL - 0.3); }
        else { m.rotation.x = -Math.PI / 2; m.position.set(c.x + c.w / 2, 0, (y0 + y1) / 2); }
        m.receiveShadow = true; m.castShadow = !!wall;
        e.meshes.push(m);
      };
      mk(fy0, fy1, false);
      if (WALL && c.y < WALL) mk(c.y, Math.min(WALL, fy1), true);
      out.push(e);
    }
    return out;
  }

  /* ---------------------------------------------------------------- a room's 3D state */
  R3D.buildRoom = function (w, sc, room) {
    THREE = R3D.THREE;
    const S = R3D.S, U = S.U;
    const grp = new THREE.Group(); grp.name = 'room:' + room;
    const obj = buildObjects(sc, room, U);
    grp.add(obj.group);
    const ground = groundChunks(sc, room);
    for (const e of ground) for (const m of e.meshes) grp.add(m);
    // beyond the edges: a wide plane in the map-edge colour (outside), a dark floor round a room
    const out = new THREE.Mesh(new THREE.PlaneGeometry(sc.w + 6000, sc.h + 6000), new THREE.MeshLambertMaterial({ color: room === 'outside' ? 0x2f6a45 : 0x100c18 }));
    out.rotation.x = -Math.PI / 2; out.position.set(sc.w / 2, -0.6, sc.h / 2); out.receiveShadow = room === 'outside';
    grp.add(out);
    // lights: 3D positions for the scene's 2D light points
    const lights = (sc.lights || []).map(l => {
      const p = room === 'outside' ? lift2D(obj.cards, l.x, l.y, 2) : new THREE.Vector3(l.x, l.y < 100 && l.r >= 50 ? 46 : 14, l.y);
      return { p, r: l.r || 30, win: !!l.win };
    });
    return { sc, room, grp, obj, ground, lights, built: 0 };
  };

  // upload ground chunk textures that are (nearly) in view; drop the least recently seen past the budget
  R3D.updateGround = function (st, box, frame, budget) {
    let made = 0; const keep = R3D.S.chunkKeep;
    for (const e of st.ground) {
      const c = e.c, vis = c.x < box[2] && c.x + c.w > box[0] && c.y < box[3] && c.y + c.h > box[1];
      if (!vis) continue;
      e.lastSeen = frame;
      if (!e.tex && (made < budget || !st.built)) {
        e.tex = pixelTex(c.img); e.mat.map = e.tex; e.mat.color.set(0xffffff); e.mat.needsUpdate = true; made++;
      }
    }
    st.built = 1;
    const live = st.ground.filter(e => e.tex);
    if (live.length > keep) {
      live.sort((a, b) => a.lastSeen - b.lastSeen);
      for (const e of live.slice(0, live.length - keep)) { if (e.lastSeen === frame) break; e.tex.dispose(); e.tex = null; e.mat.map = null; e.mat.color.set(st.room === 'outside' ? 0x3d7a4e : 0x2a2230); e.mat.needsUpdate = true; }
    }
    return made;
  };

  R3D.disposeRoom = function (st) {
    st.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const e of st.ground) { if (e.tex) e.tex.dispose(); e.mat.dispose(); }
    st.obj.map.dispose(); if (st.obj.emap) st.obj.emap.dispose(); st.obj.mat.dispose();
    if (st.grp.parent) st.grp.parent.remove(st.grp);
  };
})();
