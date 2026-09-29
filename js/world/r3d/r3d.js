/* LINESIDE HD-2D renderer (vertical slice): the same world, drawn as a lit 3D diorama with Three.js.
 *
 *   Switch on:  index.html?render=3d          (or localStorage lineside_render = '3d'; ?render=2d forces 2D)
 *   Falls back to the 2D canvas renderer by itself when WebGL2 or the library is missing, or if anything throws.
 *
 * The engine (world.js) and the game (game.js) are untouched: world.loop() hands each frame to LS.R3D.draw(world, ctx,
 * t) when LS.R3D.active is set, and the 2D renderer runs when it returns false. Gameplay, collision, the camera's
 * follow and the clock all stay in world.js / atmos.js; this file only looks at them.
 *
 * A WebGL canvas sits under the 2D canvas (#world). The 2D canvas is cleared to transparent and carries only the UI
 * (markers, prompts, the objective arrow, the fade; js/world/r3d/r3d_ui.js), projected through the 3D camera.
 *
 * Pieces: r3d_scene.js turns a 2D scene into ground planes and upright sprite cards; this file owns the renderer,
 * the camera (perspective, 40 degrees down, 30 degree FOV), the characters (live sprite cards, drawn each frame with
 * the same LS.TileArt.drawActor / drawAnimal as 2D), the light (a sun and moon on the clock in atmos.js, sky and
 * ground ambient, the nearest lamps and lit windows as point lights, glows), fog and the post chain (depth of field
 * focused on the player, bloom, grade and vignette).
 */
window.LS = window.LS || {};
(function () {
  'use strict';
  const q = location.search;
  const stored = (() => { try { return localStorage.getItem('lineside_render'); } catch (e) { return null; } })();
  const want = /[?&]render=3d\b/.test(q) || (!/[?&]render=2d\b/.test(q) && stored === '3d');
  const R3D = LS.R3D = { active: false, wanted: want, reason: null, stats: { fps: 0, ms: 0, frames: 0 } };
  if (!want) return;
  const say = m => { R3D.reason = m; try { console.warn('[LINESIDE 3D] ' + m + ' - using the 2D renderer'); } catch (e) { } };
  if (!window.LS_THREE_FACTORY) { say('three.js bundle missing'); return; }
  let gl = null, glCanvas = null;
  try {
    glCanvas = document.createElement('canvas'); glCanvas.id = 'world3d';
    gl = glCanvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  } catch (e) { gl = null; }
  if (!gl) { say('WebGL2 is not available'); return; }
  R3D.active = true;
  R3D.lockQuality = /[?&]r3dq=hi\b/.test(q);

  /* In 3D the sun casts real shadows, so the baked cast shadows are left out of the ground art; the baked contact
   * shadows (the dark line where a wall, post or trunk meets the ground) stay. Replaces the 'shadows' HD pass. */
  if (LS.HD && LS.HD.passes) {
    const P = LS.HD.passes.find(p => p.name === 'shadows');
    if (P) P.run = function (sc) {
      const HD = LS.HD, casters = sc.objects.filter(o => o.img && !/^(hd_overlay|hd_fence_v)$/.test(o.kind || '') && o.h > 6 && o.sortY < 1e5);
      const outside = !sc.anchors || sc.w > 1000, PAD = 12;
      const lay = (g, o, s, ky) => { const base = o.sortY, px = o.w / (s.width - 2 * PAD) * PAD, py = o.h / (s.height - 2 * PAD) * PAD; g.save(); g.transform(1, 0, 0, -ky, 0, (1 + ky) * base); g.drawImage(s, o.dx - px, o.dy - py, o.w + 2 * px, o.h + 2 * py); g.restore(); };
      sc.paint((g, ch) => {
        for (const o of casters) {
          const base = o.sortY; if (o.dx > ch.x + ch.w + 8 || o.dx + o.w < ch.x - 8 || base - 10 > ch.y + ch.h || base + 12 < ch.y) continue;
          const hard = HD.silhouette(o.img, 2), soft = HD.silhouette(o.img, 6), k = outside ? 1 : 0.7;
          for (const [d, al] of [[8, 0.16], [4.2, 0.2], [1.8, 0.26]]) { g.globalAlpha = al * k; lay(g, o, d > 3 ? soft : hard, Math.min(0.3, d / o.h)); }
        }
        g.globalAlpha = 1;
      });
    };
  }

  const DEG = Math.PI / 180, PITCH = 40 * DEG, FOV = 30;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a + (b - a) * t;
  const seedOf = k => { const s = String(k); let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return (h % 1000) / 1000; };
  let THREE = null, S = null;

  /* ------------------------------------------------------------------ init */
  function init(w) {
    THREE = R3D.THREE = window.LS_THREE_FACTORY();
    const cv2 = w.cv;
    Object.assign(glCanvas.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', display: 'block', imageRendering: 'auto', pointerEvents: 'none' });
    cv2.parentNode.insertBefore(glCanvas, cv2);
    const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, context: gl, antialias: false, alpha: false, stencil: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = true;
    renderer.autoClear = true;
    R3D.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    R3D.maxTex = renderer.capabilities.maxTextureSize;
    const mobile = Math.min(innerWidth, innerHeight) < 600 || w.touch;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2f6a45);
    scene.fog = new THREE.Fog(0xbcd0e6, 400, 1400);
    const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 20, 3000);
    // light
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.castShadow = true;
    const SM = mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(SM, SM); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.4; sun.shadow.radius = 3;
    const sc = sun.shadow.camera; sc.near = 1; sc.far = 1600;
    scene.add(sun); scene.add(sun.target);
    const hemi = new THREE.HemisphereLight(0xc8dcff, 0x6a6048, 1.6); scene.add(hemi);
    const NPL = mobile ? 6 : 10, pls = [];
    for (let i = 0; i < NPL; i++) { const p = new THREE.PointLight(0xffc27a, 0, 120, 1.3); p.castShadow = false; scene.add(p); pls.push(p); }
    const U = { uPlayer: { value: new THREE.Vector2(-1e5, -1e5) }, uHole: { value: new THREE.Vector3(0, 0, 1) } };
    S = R3D.S = { w, renderer, scene, camera, sun, hemi, pls, U, mobile, rooms: {}, cur: null, frame: 0, chunkKeep: mobile ? 12 : 20,
      pr: Math.min(devicePixelRatio || 1, mobile ? 2 : 2), size: [0, 0, 0], actors: [], glow: null, ft: 1 / 60, slowT: 0, quality: 2, lastT: performance.now() };
    // a software rasteriser (no GPU) starts at the lightest quality
    try { const ext = gl.getExtension('WEBGL_debug_renderer_info'), name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); R3D.gpu = String(name); if (/swiftshader|llvmpipe|software/i.test(R3D.gpu)) S.quality = 0; } catch (e) { }
    initPost(); initActors(); initGlow(); initTrain();
    if (R3D.initUI) R3D.initUI(w);
    // the share card snapshot: the 3D frame under the UI
    const snap0 = w.snapshot.bind(w);
    w.snapshot = function (W, H) {
      if (!R3D.active) return snap0(W, H);
      try { render(w, (performance.now() - w.t0) / 1000); } catch (e) { return snap0(W, H); }
      const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      const s = Math.max(W / glCanvas.width, H / glCanvas.height), dw = glCanvas.width * s, dh = glCanvas.height * s;
      x.drawImage(glCanvas, (W - dw) / 2, (H - dh) / 2, dw, dh);
      x.drawImage(this.cv, (W - dw) / 2, (H - dh) / 2, dw, dh);
      return c;
    };
    glCanvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fail('WebGL context lost'); });
  }

  function fail(m) {
    say(m); R3D.active = false;
    try { glCanvas.style.display = 'none'; } catch (e) { }
    if (S && S.w) { S.w.scenes = {}; }
  }

  /* ------------------------------------------------------------------ post */
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  // depth of field, gathered at half resolution (single-pass scatter-as-gather, after D. Gustafsson): rgb = the blurred
  // colour, a = how much blur landed on this pixel (its own, or a blurred neighbour's spilling over it)
  const DOF_FS = `
    uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear, uFar, uFocus, uRange, uScale, uMaxR, uStep, uNearK;
    varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
    float coc(float z){ float dz = z - uFocus; float k = dz < 0.0 ? uNearK : 1.0; return clamp((abs(dz) * k - uRange) / uScale, 0.0, 1.0) * uMaxR; }
    void main(){
      float cz = lin(texture2D(tDepth, vUv).x), cs = coc(cz);
      vec3 col = texture2D(tColor, vUv).rgb; float tot = 1.0, spill = 0.0; float r = uStep; float ang = 0.0;
      for (int i = 0; i < 120; i++) {
        if (r >= uMaxR) break;
        vec2 tc = vUv + vec2(cos(ang), sin(ang)) * r / uRes;
        vec3 sc = texture2D(tColor, tc).rgb; float sz = lin(texture2D(tDepth, tc).x); float ss = coc(sz);
        if (sz > cz) ss = clamp(ss, 0.0, cs * 2.0);
        float m = smoothstep(r - 0.5, r + 0.5, ss);
        col += mix(col / tot, sc, m); tot += 1.0; spill += m;
        ang += 2.39996323; r += uStep / r;
      }
      gl_FragColor = vec4(col / tot, clamp(max(cs / max(uMaxR, 0.001) * 2.5, spill / max(tot - 1.0, 1.0) * 3.0), 0.0, 1.0));
    }`;
  const GRADE_FS = `
    uniform sampler2D tDiffuse; uniform sampler2D tBlur; uniform float uDof; uniform vec3 uTint; uniform float uSat, uCon, uVig, uAspect, uFade; uniform vec3 uHaze; uniform float uHazeTop;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec4 b = texture2D(tBlur, vUv);
      c = mix(c, b.rgb, smoothstep(0.0, 1.0, b.a) * uDof);
      c *= uTint;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.18) * uCon + 0.18;
      c = mix(c, uHaze, uHazeTop * smoothstep(0.45, 1.0, vUv.y));
      vec2 d = vUv - 0.5; d.x *= uAspect;
      c *= 1.0 - uVig * smoothstep(0.35, 1.05, length(d));
      gl_FragColor = vec4(max(c, 0.0), 1.0);
      #include <colorspace_fragment>
    }`;
  function initPost() {
    const mk = () => { const t = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true }); return t; };
    S.rtScene = mk(); S.rtScene.depthTexture = new THREE.DepthTexture(4, 4); S.rtScene.depthTexture.type = THREE.UnsignedIntType;
    S.rtDof = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    S.dofMat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: DOF_FS, depthTest: false, depthWrite: false,
      uniforms: { tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2() }, uNear: { value: 1 }, uFar: { value: 100 }, uFocus: { value: 50 }, uRange: { value: 10 }, uScale: { value: 100 }, uMaxR: { value: 8 }, uStep: { value: 1 }, uNearK: { value: 1.6 } } });
    S.gradeMat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: GRADE_FS, depthTest: false, depthWrite: false,
      uniforms: { tDiffuse: { value: null }, tBlur: { value: null }, uDof: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1.08 }, uCon: { value: 1.04 }, uVig: { value: 0.28 }, uAspect: { value: 1 }, uFade: { value: 0 }, uHaze: { value: new THREE.Vector3(0.8, 0.85, 0.95) }, uHazeTop: { value: 0.1 } } });
    const quad = geo => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); m.frustumCulled = false; return m; };
    S.fsq = quad(); S.fsScene = new THREE.Scene(); S.fsScene.add(S.fsq); S.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    S.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.6, 0.85);
    S.bloom.renderToScreen = false;
  }
  function fsPass(mat, target) { S.fsq.material = mat; S.renderer.setRenderTarget(target); S.renderer.render(S.fsScene, S.fsCam); }

  function resize() {
    const W = innerWidth, H = innerHeight, pr = S.pr * (S.quality >= 2 ? 1 : S.quality >= 1 ? 0.75 : 0.5);
    if (S.size[0] === W && S.size[1] === H && S.size[2] === pr) return;
    S.size = [W, H, pr];
    S.renderer.setPixelRatio(pr); S.renderer.setSize(W, H, false);
    const bw = Math.max(1, Math.round(W * pr)), bh = Math.max(1, Math.round(H * pr));
    S.rtScene.setSize(bw, bh); S.rtDof.setSize(Math.ceil(bw / 2), Math.ceil(bh / 2));
    S.bloom.setSize(bw, bh);
    S.camera.aspect = W / H; S.camera.updateProjectionMatrix();
  }

  /* ------------------------------------------------------------------ characters */
  const BOX = { l: 20, r: 20, t: 42, b: 4 };   // world units round the feet that a character's card covers
  const RA = 3;                                 // art px per world unit
  function initActors() { S.actorGeo = null; }
  function slot(i) {
    let a = S.actors[i]; if (a) return a;
    const cw = (BOX.l + BOX.r) * RA, ch = (BOX.t + BOX.b) * RA, cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const tex = R3D.pixelTex(cv, { mips: false });
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    if (!S.actorGeo) {
      const geo = new THREE.PlaneGeometry(BOX.l + BOX.r, BOX.t + BOX.b); geo.translate((BOX.r - BOX.l) / 2 * 0, (BOX.t + BOX.b) / 2 - BOX.b, 0);
      const n = geo.attributes.normal, v = new THREE.Vector3(0, 0.35, 1).normalize(); for (let k = 0; k < n.count; k++) n.setXYZ(k, v.x, v.y, v.z);
      S.actorGeo = geo;
      const bc = document.createElement('canvas'); bc.width = bc.height = 64; const bg = bc.getContext('2d'), rg = bg.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(16,10,26,0.62)'); rg.addColorStop(0.5, 'rgba(16,10,26,0.3)'); rg.addColorStop(1, 'rgba(16,10,26,0)'); bg.fillStyle = rg; bg.fillRect(0, 0, 64, 64);
      const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
      S.blobMat = new THREE.MeshBasicMaterial({ map: bt, transparent: true, depthWrite: false, fog: true });
      S.blobGeo = new THREE.PlaneGeometry(1, 1); S.blobGeo.rotateX(-Math.PI / 2);
    }
    const mesh = new THREE.Mesh(S.actorGeo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    const blob = new THREE.Mesh(S.blobGeo, S.blobMat); blob.renderOrder = 1;
    S.scene.add(mesh); S.scene.add(blob);
    a = S.actors[i] = { cv, g, tex, mat, mesh, blob };
    return a;
  }
  // everything that moves: the same list, in the same order, as world.draw() makes for 2D
  function actorList(w, sc, t) {
    const L = [], p = w.player, cv = w._conv, art = w.art;
    if (!art) return L;
    const actor = (look, x, y, face, frame, opt) => L.push({ x, y, h: 0, bw: 7, fn: (g, X, Y) => art.drawActor(g, look, X, Y, face, frame, Object.assign({}, opt, { shadow: false, alpha: null })) });
    const animal = (kind, x, y, opt, h, bw) => L.push({ x, y, h: h || 0, bw: bw || 5, fn: (g, X, Y) => art.drawAnimal && art.drawAnimal(g, kind, X, Y, t, opt || {}) });
    for (const e of w.visible()) {
      if (e.kind === 'npc' && e.look) actor(e.look, e.x, e.y, w.shownFace(e), e.moving ? (e.phase || 0) : 0, { ppe: e.ppe, moving: e.moving, idle: t, seed: seedOf(e.id || e.name || e.x), talk: !!(cv && cv.e === e && cv.typing) });
      else if (e.kind === 'cat') animal('cat', e.x, e.y);
    }
    if (w.room === 'outside') {
      for (const s of w.sheep) { const v = Math.hypot(s.vx || 0, s.vy || 0); animal('sheep', s.x, s.y, v > 3 ? { face: s.face, anim: 'walk', fps: 1.1 * v, seed: s.seed } : { face: s.face, seed: s.seed }, 0, 9); }
      const duck = (sc.anchors && sc.anchors.duck) || null; if (duck && !w.flags.drainCleared) animal('duck', duck.x, duck.y, null, 0, 4);
    }
    if (w.room === 'shed' && !w.flags.pigeonGone) { const a = (sc.anchors && sc.anchors.pigeon) || { x: 24 * 16, y: 4 * 16 + 6 }; const sy = a.sortY != null ? a.sortY : a.y + 40; L.push({ x: a.x, y: sy, h: sy - a.y, bw: 0, fn: (g, X, Y) => art.drawAnimal && art.drawAnimal(g, 'pigeon', X, Y - (sy - a.y), t, {}), yOff: sy - a.y }); }
    if (p.look && !w.attract) actor(p.look, p.x, p.y, w.shownFace(p), p.moving ? p.phase : 0, { ppe: w.ppe, moving: p.moving, idle: t, seed: 0.37 });
    return L;
  }
  function updateActors(w, sc, t) {
    const L = actorList(w, sc, t), cam = S.camera.position, view = S.viewBox;
    let n = 0;
    for (const it of L) {
      if (view && (it.x < view[0] - 60 || it.x > view[2] + 60 || it.y < view[1] - 60 || it.y > view[3] + 80)) continue;
      const a = slot(n++), X = Math.round(it.x * RA) / RA, Y = Math.round(it.y * RA) / RA;
      const g = a.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, a.cv.width, a.cv.height);
      // the card is drawn in the frame of the character's feet (X, Y - yOff for a perched bird)
      const fy = Y - (it.yOff || 0);
      g.setTransform(RA, 0, 0, RA, -(X - BOX.l) * RA, -(fy - BOX.t) * RA); g.imageSmoothingEnabled = false;
      try { it.fn(g, X, fy); } catch (e) { }
      a.tex.needsUpdate = true;
      a.mesh.visible = true; a.mesh.position.set(X, it.h, Y + 0.4);
      a.mesh.rotation.y = Math.atan2(cam.x - X, cam.z - Y) * 0.85;
      a.blob.visible = it.bw > 0; a.blob.position.set(X, 0.12, Y + 0.3); a.blob.scale.set(it.bw * 2.4, 1, it.bw * 1.1);
    }
    for (let i = n; i < S.actors.length; i++) { S.actors[i].mesh.visible = false; S.actors[i].blob.visible = false; }
  }

  /* ------------------------------------------------------------------ glows (lamps and windows, for the bloom) */
  function initGlow() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * 256), 3));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(new Float32Array(256), 1));
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: 400 }, uK: { value: 0 }, uCol: { value: new THREE.Color(1.0, 0.72, 0.38) } },
      vertexShader: 'attribute float aSize; uniform float uScale; varying float vS; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(512.0, aSize * uScale / -mv.z); vS = aSize; }',
      fragmentShader: 'uniform float uK; uniform vec3 uCol; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; float a = exp(-r * r * 5.0) + 0.6 * exp(-r * r * 40.0); if (r > 1.0) discard; gl_FragColor = vec4(uCol * a * uK, 1.0); }'
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5;
    S.scene.add(pts); S.glow = pts;
  }
  function setGlows(st) {
    const L = st.lights, g = S.glow.geometry, P = g.attributes.position, Z = g.attributes.aSize;
    let n = 0;
    for (const l of L) { if (n >= 256) break; P.setXYZ(n, l.p.x, l.p.y, l.p.z + 0.5); Z.setX(n, l.win ? l.r * 0.6 : Math.max(10, l.r * 0.5)); n++; }
    P.needsUpdate = true; Z.needsUpdate = true; g.setDrawRange(0, n);
  }

  /* ------------------------------------------------------------------ the main-line train (a simple 3D unit) */
  function initTrain() {
    const grp = new THREE.Group(), body = new THREE.MeshLambertMaterial({ color: 0xc0cbdc }), roof = new THREE.MeshLambertMaterial({ color: 0x8b9bb4 }), win = new THREE.MeshLambertMaterial({ color: 0x3a4466, emissive: 0xffd9a0, emissiveIntensity: 0 }), end = new THREE.MeshLambertMaterial({ color: 0xfeae34 });
    for (let c = 0; c < 4; c++) {
      const car = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(22, 20, 54), body); b.position.y = 12; car.add(b);
      const r = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 52), roof); r.position.y = 23; car.add(r);
      for (const sx of [-11.2, 11.2]) { const wv = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 44), win); wv.position.set(sx, 15, 0); car.add(wv); }
      car.position.z = c * 56; car.userData.c = c;
      car.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      grp.add(car);
    }
    const e = new THREE.Mesh(new THREE.BoxGeometry(22, 8, 1), end); e.position.set(0, 10, -27.5); grp.children[0].add(e); grp.userData.end = e;
    grp.visible = false; S.scene.add(grp); S.train = grp; S.trainWin = win;
  }
  function updateTrain(w) {
    const T = S.train, m = w.mainTrain;
    if (w.room !== 'outside' || !m || m.y < -2000) { T.visible = false; return; }
    T.visible = true; const X = 119 * 16 + 4 + 12, dir = m.dir;
    T.children.forEach((car, c) => { car.position.set(X, 0, m.y + 27 + c * 56 * (dir > 0 ? -1 : 1)); });
    T.userData.end.position.z = dir > 0 ? 27.5 : -27.5;
    S.trainWin.emissiveIntensity = (w.nightK || 0) * 1.2;
  }

  /* ------------------------------------------------------------------ time of day */
  const C = (r, g, b) => new THREE.Color(r / 255, g / 255, b / 255);
  function lightFor(w, st) {
    const a = w._atm || {}, sky = a.sky || { tint: [255, 255, 255], str: 0, dark: 0, warm: 0, mist: 0 }, cur = a.cur || { cloud: 0.3, rain: 0 };
    const hour = a.hour != null ? a.hour : 12, inside = st.room !== 'outside';
    const night = clamp(sky.dark * 1.6, 0, 1), day = 1 - night, cloud = cur.cloud || 0, warm = clamp((sky.warm || 0) * (1 - cloud * 0.7), 0, 1);
    const tint = sky.tint.map(v => v / 255), str = sky.str || 0;
    const tintC = new THREE.Color(mix(1, tint[0], str), mix(1, tint[1], str), mix(1, tint[2], str));
    const sun = S.sun, hemi = S.hemi, PI = Math.PI;
    if (inside) {
      // the depot: soft daylight from the high north windows and the lamps; darker and warmer by night
      const dayIn = clamp(1 - sky.dark * 1.6, 0, 1) * (1 - cloud * 0.4);
      sun.color.setRGB(1, 0.97, 0.92); sun.intensity = PI * (0.18 + 0.32 * dayIn);
      S.sunDir = new THREE.Vector3(0.25, 1.0, -0.55).normalize();
      hemi.color.setRGB(0.95, 0.93, 0.9); hemi.groundColor.setRGB(0.55, 0.46, 0.38); hemi.intensity = PI * (0.38 + 0.2 * dayIn);
      S.lampK = 0.75 + 0.5 * (1 - dayIn); S.winK = 0; S.glowK = 0.35 + 0.4 * (1 - dayIn);
      S.fogC = new THREE.Color(0x1a1522); S.bg = new THREE.Color(0x120e1a);
      S.gradeTint = new THREE.Vector3(1.02, 0.99, 0.95); S.haze = 0;
      if (w.flags && w.flags.dark) { sun.intensity = PI * 0.03; hemi.intensity = PI * 0.06; S.lampK = 0; S.glowK = 0; S.torch = true; } else S.torch = false;
      return;
    }
    S.torch = false;
    // sun path: rises in the east (x+), noon a little east of south (so shadows read, falling north-west), sets west
    const hs = clamp((hour - 6) / 13.5, 0, 1), el = Math.max(10, 52 * Math.sin(PI * hs)) * DEG, az = mix(-100, 95, hs) * DEG - 22 * DEG * Math.sin(PI * hs);
    let dir = new THREE.Vector3(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const moon = new THREE.Vector3(-0.35, 0.8, 0.5).normalize();
    dir.lerp(moon, night).normalize(); S.sunDir = dir;
    const sunCol = new THREE.Color(1, 0.97, 0.92).lerp(C(255, 176, 104), warm).lerp(C(140, 160, 230), night);
    sun.color.copy(sunCol);
    sun.intensity = PI * (day * (0.95 - 0.55 * cloud) * (1 - 0.25 * warm) + night * 0.14);
    hemi.color.copy(new THREE.Color(0.78, 0.86, 1.0).lerp(C(255, 200, 170), warm * 0.5).lerp(C(70, 88, 160), night));
    hemi.groundColor.copy(new THREE.Color(0.5, 0.46, 0.36).lerp(C(30, 30, 50), night));
    hemi.intensity = PI * (day * (0.52 + 0.3 * cloud) + night * 0.28);
    S.lampK = night; S.winK = clamp(night * 1.15 + warm * 0.15, 0, 1); S.glowK = night;
    const haze = new THREE.Color(0.74, 0.82, 0.92).lerp(C(250, 196, 150), warm * 0.8).lerp(C(34, 40, 76), night).lerp(C(172, 180, 192), cur.rain || 0);
    S.fogC = haze; S.bg = new THREE.Color(0x2f6a45).lerp(C(18, 26, 38), night);
    S.gradeTint = new THREE.Vector3(tintC.r, tintC.g, tintC.b).lerp(new THREE.Vector3(1, 1, 1), 0.55);
    S.haze = 0.08 + 0.12 * (sky.mist || 0) + 0.08 * (cur.rain || 0);
  }

  /* ------------------------------------------------------------------ one frame */
  function roomState(w) {
    const sc = w.scene(w.room);
    let st = S.rooms[w.room];
    if (!st || st.sc !== sc) {
      if (st) R3D.disposeRoom(st);
      st = S.rooms[w.room] = R3D.buildRoom(w, sc, w.room);
      setGlows(st);
    }
    if (S.cur !== st) {
      if (S.cur && S.cur.grp.parent) S.scene.remove(S.cur.grp);
      S.scene.add(st.grp); S.cur = st; setGlows(st);
      for (const [k, v] of Object.entries(S.rooms)) if (v !== st && k !== 'outside') { R3D.disposeRoom(v); delete S.rooms[k]; }   // keep only the outside and the current room
    }
    return st;
  }

  // the ground rectangle the camera sees (world units), from the four corner rays
  function viewBox() {
    const cam = S.camera, ray = new THREE.Vector3(), o = cam.position; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [nx, ny] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ray.set(nx, ny, 0.5).unproject(cam).sub(o).normalize();
      const t = ray.y < -0.02 ? -o.y / ray.y : 4000;
      const x = o.x + ray.x * t, z = o.z + ray.z * t; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, z); y1 = Math.max(y1, z);
    }
    return [x0 - 32, y0 - 96, x1 + 32, y1 + 64];
  }

  R3D.zoom = 0.92;          // on-screen size at the player, relative to the 2D renderer's zoom
  function placeCamera(w) {
    const cam = S.camera, kpx = (w.S || 3) * R3D.zoom, H = innerHeight;
    const dist = H / (2 * Math.tan(FOV * DEG / 2) * kpx);
    const tx = w.camX + w.vw / 2, tz = w.camY + w.vh / 2 + 8;
    cam.position.set(tx, dist * Math.sin(PITCH), tz + dist * Math.cos(PITCH));
    cam.near = dist * 0.25; cam.far = dist * 7;
    cam.lookAt(tx, 0, tz); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    S.dist = dist; S.target = [tx, tz];
  }

  function render(w, t) {
    const dbg = R3D.dbg || {};
    resize();
    const st = roomState(w), sc = st.sc;
    placeCamera(w);
    const box = S.viewBox = viewBox();
    R3D.updateGround(st, box, S.frame, R3D.lockQuality ? 99 : 2);
    lightFor(w, st);
    const p = w.player, cam = S.camera;
    // shadow camera: an ortho box round the view, pointed along the light
    const cx = (box[0] + box[2]) / 2, cz = (box[1] + box[3]) / 2, half = Math.max(box[2] - box[0], box[3] - box[1]) / 2 + 40;
    const sd = S.sunDir; S.sun.target.position.set(cx, 0, cz); S.sun.position.set(cx + sd.x * 900, sd.y * 900, cz + sd.z * 900);
    const shc = S.sun.shadow.camera; shc.left = -half; shc.right = half; shc.top = half; shc.bottom = -half; shc.near = 100; shc.far = 2400; shc.updateProjectionMatrix();
    S.sun.target.updateMatrixWorld();
    // fog, background
    const fogNear = S.dist * 0.95, fogFar = S.dist * (st.room === 'outside' ? 3.4 : 6);
    S.scene.fog.color.copy(S.fogC); S.scene.fog.near = fogNear; S.scene.fog.far = fogFar; S.scene.background = S.bg;
    // emissive windows, lamps
    st.obj.mat.emissiveIntensity = S.winK * 1.25;
    const lk = S.lampK, tgt = S.target;
    const cand = lk > 0.02 ? st.lights.map(l => [l, Math.hypot(l.p.x - tgt[0], l.p.z - tgt[1]) * (l.win ? 1.5 : 1)]).sort((a, b) => a[1] - b[1]) : [];
    const plOn = lk > 0.02 && !dbg.noPoint;
    S.pls.forEach((pl, i) => {
      pl.visible = plOn;
      const c = cand[i];
      if (!c) { pl.intensity = 0; return; }
      const l = c[0]; pl.position.copy(l.p); if (!l.win) pl.position.y += 2;
      pl.distance = (st.room === 'outside' ? 3.2 : 2.4) * Math.max(24, l.r); pl.decay = 1.2;
      pl.color.setRGB(1, l.win ? 0.78 : 0.74, l.win ? 0.5 : 0.42);
      pl.intensity = lk * (l.win ? 40 : 120) * (st.room === 'outside' ? 1 : 0.6);
    });
    S.glow.material.uniforms.uK.value = S.glowK * (st.room === 'outside' ? 1 : 0.8);
    S.glow.material.uniforms.uScale.value = S.size[1] * S.size[2] / (2 * Math.tan(FOV * DEG / 2));
    // characters, train
    updateActors(w, sc, t); updateTrain(w);
    // the see-through window round the player behind a fading object
    const pv = new THREE.Vector3(p.x, 16, p.y).project(cam);
    S.U.uPlayer.value.set(p.x, p.y); S.U.uHole.value.set((pv.x + 1) / 2 * S.size[0] * S.size[2], (pv.y + 1) / 2 * S.size[1] * S.size[2], 30 * (w.S || 3) * R3D.zoom * S.size[2]);
    // render: scene -> depth of field -> bloom -> grade to screen
    const R = S.renderer, bw = S.rtScene.width, bh = S.rtScene.height;
    R.shadowMap.enabled = !dbg.noShadow;
    R.setRenderTarget(S.rtScene); if (dbg.noScene) R.clear(); else R.render(S.scene, cam);
    const night = S.glowK;
    // bloom first, straight onto the scene (so the lens blurs the glow too)
    S.bloom.strength = 0.18 + 0.75 * night; S.bloom.threshold = mix(0.92, 0.55, night); S.bloom.radius = 0.55;
    if (!dbg.noBloom) S.bloom.render(R, null, S.rtScene, 0, false);
    const u = S.dofMat.uniforms, focus = cam.position.distanceTo(new THREE.Vector3(p.x, 14, p.y)), px = S.size[2] / 2;
    const dofOn = (S.quality >= 1 || R3D.lockQuality) && !dbg.noDof;
    if (dofOn) {
      u.tColor.value = S.rtScene.texture; u.tDepth.value = S.rtScene.depthTexture; u.uRes.value.set(S.rtDof.width, S.rtDof.height);
      u.uNear.value = cam.near; u.uFar.value = cam.far; u.uFocus.value = w.attract ? S.dist : focus;
      u.uRange.value = S.dist * 0.07; u.uScale.value = S.dist * 0.45; u.uMaxR.value = (S.mobile ? 6 : 9) * px; u.uStep.value = (S.quality >= 2 || R3D.lockQuality ? 0.8 : 1.4) * Math.max(0.5, px);
      fsPass(S.dofMat, S.rtDof);
    }
    const gm = S.gradeMat.uniforms; gm.tDiffuse.value = S.rtScene.texture; gm.tBlur.value = S.rtDof.texture; gm.uDof.value = dofOn ? 1 : 0;
    gm.uTint.value.copy(S.gradeTint); gm.uAspect.value = S.size[0] / S.size[1];
    gm.uHaze.value.set(S.fogC.r, S.fogC.g, S.fogC.b); gm.uHazeTop.value = S.haze; gm.uVig.value = 0.26 + 0.18 * night;
    fsPass(S.gradeMat, null);
  }

  R3D.draw = function (w, x, t) {
    if (!R3D.active) return false;
    try {
      if (!S) init(w);
      const now = performance.now();
      const t0 = now;
      render(w, t);
      // the 2D canvas: transparent, UI only
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w.cv.width, w.cv.height);
      if (S.torch) R3D.torch(w, x);
      if (R3D.dbg && R3D.dbg.noUI) { } else if (R3D.drawUI) R3D.drawUI(w, x, t); else w.drawUI(x, t, w.camX, w.camY);
      S.frame++;
      // frame time (whole frame, from rAF to rAF) and adaptive quality: drop the resolution and the lens if it runs slow
      const dt = (now - S.lastT) / 1000; S.lastT = now; S.ft = S.ft * 0.95 + Math.min(0.25, dt) * 0.05; R3D.stats.cpu = performance.now() - t0;
      R3D.stats.frames = S.frame; R3D.stats.ms = S.ft * 1000; R3D.stats.fps = 1 / S.ft; R3D.stats.quality = S.quality; R3D.stats.pr = S.size[2];
      if (!R3D.lockQuality && S.frame > 8) {
        if (S.ft > 1 / 40) S.slowT += dt; else S.slowT = Math.max(0, S.slowT - dt * 0.5);
        if (S.slowT > 2 && S.quality > 0) { S.quality--; S.slowT = 0; }
      }
      return true;
    } catch (e) {
      console.warn('[LINESIDE 3D] renderer error', e);
      fail('renderer error: ' + (e && e.message));
      return false;
    }
  };
  // the dark depot's torch: a pool of light round the player, the rest dark (drawn on the UI layer, as in 2D)
  R3D.torch = function (w, x) {
    const pv = R3D.project(w.player.x, w.player.y, 14); if (!pv) return;
    const D = w.dpr, px = pv[0] * D, py = pv[1] * D, R = 70 * (w.S || 3) * R3D.zoom * D;
    const rg = x.createRadialGradient(px, py, R * 0.15, px, py, R); rg.addColorStop(0, 'rgba(8,6,14,0)'); rg.addColorStop(0.7, 'rgba(8,6,14,0.55)'); rg.addColorStop(1, 'rgba(8,6,14,0.93)');
    x.fillStyle = rg; x.fillRect(0, 0, w.cv.width, w.cv.height);
  };
  // world point (x, y feet, height h) -> CSS px on screen, or null behind the camera
  const _v = { x: 0 };
  R3D.project = function (x, y, h) {
    if (!S || !THREE) return null;
    const v = _v.v || (_v.v = new THREE.Vector3());
    v.set(x, h || 0, y).project(S.camera);
    if (v.z > 1) return null;
    return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight];
  };
  // CSS px on screen -> the 2D map point the tap means (first a character card, else the ground), as (x, y - height)
  R3D.unproject = function (sx, sy, w) {
    if (!S || !THREE) return null;
    const rc = S.rc || (S.rc = new THREE.Raycaster()), ndc = new THREE.Vector2(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1);
    rc.setFromCamera(ndc, S.camera);
    const vis = S.actors.filter(a => a.mesh.visible).map(a => a.mesh);
    const hit = rc.intersectObjects(vis, false)[0];
    if (hit) return [hit.point.x, hit.object.position.z - hit.point.y];
    const r = rc.ray; if (r.direction.y >= -1e-4) return null;
    const k = -r.origin.y / r.direction.y; return [r.origin.x + r.direction.x * k, r.origin.z + r.direction.z * k];
  };
})();
