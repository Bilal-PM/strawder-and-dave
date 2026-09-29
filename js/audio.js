/* LINESIDE — audio engine. Web Audio API only: every sound is synthesised, there are no asset files.
 *
 * ─── PUBLIC API ───────────────────────────────────────────────────────────────────────────────────────
 * Every call is safe before init() (state is remembered and applied at init) and does nothing at all if
 * the browser has no Web Audio.
 *
 *   LS.audio.init()                       Create the AudioContext (first call) or resume it. Call it from a user
 *                                         gesture (tap, click, key): mobile Safari only unlocks audio there. After
 *                                         init the engine also resumes itself on any later tap/key if the OS
 *                                         suspended it (iOS interruptions, tab switches).
 *   LS.audio.toggle(on)                   Sound on/off. Fades, then suspends the context to save battery.
 *   LS.audio.on                           Current on/off state (boolean).
 *   LS.audio.setMood(m)                   'warm' | 'tense' | 'hopeful'. The score changes cue at the next bar line.
 *   LS.audio.setWeather(w)                'clear' | 'rain' | 'snow'. Wind and rain beds, muffled indoors.
 *   LS.audio.setRoom(r)                   'outside' | 'office' | 'hall' | 'shed'. Swaps the ambience and the
 *                                         acoustic (reverb) and sets how present the score is. Cheap to repeat.
 *   LS.audio.setCrowd(x)                  0..1: how full the village hall is (murmur, teacups, chairs, the odd
 *                                         laugh). Heard in the hall only. Cheap to call every frame.
 *   LS.audio.setNear({ river, mainline }) 0..1 each: closeness to the beck (babbling bed) and to the main line
 *                                         (loudness/brightness of passing trains). Outside only; either key may
 *                                         be left out. Cheap to call every frame (changes < 0.01 are ignored).
 *   LS.audio.setVolume({ music, sfx, amb })  Optional mix levels 0..1 (defaults 0.55 / 0.8 / 0.8). A layer at 0
 *                                         also stops being generated, which saves CPU.
 *   LS.audio.sfx(name, opts)              One-shot sound. opts (optional): { vol: 0..2 multiplier, pan: -1..1 }.
 *     UI, non-diegetic, always in the key of the score:
 *       tap, select, page, stamp, good, bad, ripple, chapter, unlock, place, rankup (promotion fanfare)
 *     World, diegetic, heard through the current room's acoustic:
 *       peep          Ruby's horn with a flat battery (a wheezy little toot)
 *       horn          a proper two-tone diesel horn, high then low (for when she runs again); echoes outside
 *       door          opts.kind 'wood' | 'heavy', or opts.to = the room being entered. Heavy (the depot's big
 *                     rolling door) is used for kind 'heavy', to 'shed', or when leaving the shed.
 *       step_grass, step_gravel, step_ballast, step_wood, step_floor
 *                     quiet footsteps with random pitch/level and alternating feet; calls closer than 100 ms
 *                     apart are ignored, so calling it too often can't pile up
 *       train_pass    a main-line train going by (~8 s). Level follows setNear().mainline; opts.dir ±1 pans it
 *                     the way the train is moving. The first call switches autoTrains off.
 *       kettle, paper, radio (a two-way radio squelch), phone (UK double ring; opts.rings 1..3),
 *       crowd_laugh, meow, coo, clank
 *   LS.audio.autoTrains                   true until the game first calls sfx('train_pass'): distant main-line
 *                                         trains pass by themselves while mainline proximity > 0.
 *   LS.audio.meter()                      Dev tool: current output level { rms, peak } in dBFS.
 *   LS.audio.errors                       Dev tool: the last internal errors (the engine never throws).
 *
 * ─── WHAT PLAYS ───────────────────────────────────────────────────────────────────────────────────────
 * Score: felt piano (pre-rendered per octave), warm pad, Karplus–Strong harp and nylon guitar. The Lineside
 * theme is eight bars of pentatonic tune (a question that ends open, an answer that comes home). Each mood has
 * its own key, tempo, chords and accompaniment: warm (D major, 72 bpm, a harp figure like wheels over rail
 * joints), hopeful (E major, 80, flowing arpeggios, the tune an octave up), tense (D minor, 62, sparse guitar).
 * Sections swell and relax (intro, theme, bridge, theme with a second voice, a breath, sometimes a longer
 * rest), and after the first pass the form varies so the theme stays a treat rather than a loop.
 * Rooms: outside = breeze, leaves, birds (blackbird, robin, chiffchaff, great tit, wood pigeon), far-off sheep;
 * office = mains hum, room tone, typing, paper, someone's kettle; hall = room air, tea urn, murmur, teacups,
 * chairs, laughter (all scaled by setCrowd); shed = a big dark space, drips (more in rain) and Gaz's radio in
 * the back room playing the theme as 1960s light music, then the presenter talking.
 * Levels are metered: music about -27 dBFS RMS, UI peaks -17..-25, footsteps about -30, nothing above -8.
 *
 * ─── SIGNAL FLOW ──────────────────────────────────────────────────────────────────────────────────────
 *   music ─ duck ─ roomMix ─┬──────────────────────┐
 *                           └─ send ─ hall reverb ─┤
 *   ui sfx ─────────────────┬──────────────────────┤
 *                           └─ send ─ hall reverb ─┤
 *   world sfx ──────────────┬──────────────────────┼─ sum ─ bus compressor/limiter ─ master ─ speakers
 *   ambience ─(weather LP)──┤                      │
 *                           └─ send ─ room reverb ─┘   (room reverb is swapped by setRoom)
 *
 * CPU: shared noise and plucked-string buffers are made once (beck and rain lazily), piano notes are single
 * buffers, filters sweep at block rate, ambience beds exist only while audible and stop after a few silent
 * seconds, every one-shot stops its own nodes, and ambience events are skipped when many voices are sounding.
 */
window.LS = window.LS || {};
(function () {
  'use strict';
  const A = LS.audio = {
    ctx: null, on: true, music: 0.55, sfxVol: 0.8, amb: 0.8,
    mood: 'warm', weather: 'clear', room: 'outside', crowd: 0, near: { river: 0, mainline: 0 },
    autoTrains: true, errors: []
  };
  const AC = window.AudioContext || window.webkitAudioContext;
  const MASTER = 0.8, MUSIC = 2.5, UIGAIN = 1.6;   // bus trims, set by metering
  let c = null;                  // the AudioContext
  const N = {};                  // persistent nodes
  const B = {};                  // cached buffers
  const W = {};                  // periodic waves
  let timer = null, lastTick = 0, resumeAsk = 0, offTimer = null;

  // ---------- small helpers ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const clamp01 = v => Math.max(0, Math.min(1, +v || 0));
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const G = (v, dest) => { const g = c.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; };
  // Filters run their coefficients at block rate: sweeps still sound smooth, and it saves a lot of CPU
  const kRate = n => { try { n.frequency.automationRate = n.Q.automationRate = n.gain.automationRate = n.detune.automationRate = 'k-rate'; } catch (e) { } };
  const F = (type, f, q, dest) => { const n = c.createBiquadFilter(); kRate(n); n.type = type; n.frequency.value = f; if (q != null) n.Q.value = q; if (dest) n.connect(dest); return n; };
  const PAN = (p, dest) => { if (!c.createStereoPanner) return dest; const n = c.createStereoPanner(); n.pan.value = Math.max(-1, Math.min(1, p || 0)); n.connect(dest); return n; };
  const O = (wave, f, dest) => { const o = c.createOscillator(); if (typeof wave === 'string') o.type = wave; else o.setPeriodicWave(wave); o.frequency.value = f; if (dest) o.connect(dest); return o; };
  const SRC = (buf, dest, rate) => { const s = c.createBufferSource(); s.buffer = buf; if (rate) s.playbackRate.value = rate; if (dest) s.connect(dest); return s; };
  // start a noise source at a random point, so no two hits sound identical
  const startAt = (s, t, len) => { s.start(t, Math.random() * Math.max(0, s.buffer.duration - (len || 0) - 0.05)); s.stop(t + (len || 0) + 0.05); };
  // attack / hold / exponential decay on a gain; returns the end time
  function env(g, t, a, peak, d, hold) {
    const p = g.gain; peak = Math.max(0.00011, peak);
    p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(peak, t + a);
    if (hold) p.setValueAtTime(peak, t + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t + a + (hold || 0) + d);
    return t + a + (hold || 0) + d;
  }
  // a crude voice counter so ambience never piles up nodes
  let voices = [];
  function roomFor(n) { const t = c.currentTime; voices = voices.filter(e => e > t); return voices.length + (n || 1) <= 36; }
  function hold(until, n) { for (let i = 0; i < (n || 1); i++) voices.push(until); }

  // ---------- buffers (made once) ----------
  // fill(d, sr) writes len + fold samples; the tail is folded onto the head so the buffer loops seamlessly
  function loopBuf(secs, fill, ch) {
    const sr = c.sampleRate, len = Math.floor(sr * secs), fold = Math.floor(sr * 0.05), chs = ch || 1;
    const b = c.createBuffer(chs, len, sr);
    for (let k = 0; k < chs; k++) {
      const x = new Float32Array(len + fold); fill(x, sr, k);
      const d = b.getChannelData(k);
      for (let i = 0; i < len; i++) d[i] = x[i];
      for (let i = 0; i < fold; i++) { const u = i / fold; d[i] = x[i] * u + x[len + i] * (1 - u); }
    }
    return b;
  }
  const white = d => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; };
  const pink = d => { let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; } };
  const brown = d => { let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } };

  // Synthetic reverb: decaying noise that gets darker as it decays, plus a few early reflections
  function impulse(secs, decay, damp, er, pre) {
    const sr = c.sampleRate, len = Math.floor(sr * secs), b = c.createBuffer(2, len, sr), p0 = Math.floor(sr * (pre || 0));
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let i = p0; i < len; i++) {
        const u = (i - p0) / (len - p0), a = damp + (0.97 - damp) * u;
        lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
        d[i] = lp * Math.sqrt((1 + a) / (1 - a)) * Math.pow(1 - u, decay);
      }
      (er || []).forEach(([s, g], k) => { const i = Math.floor(sr * s * (ch ? 1.07 : 1)); if (i < len) d[i] += g * (k % 2 ? -1 : 1); });
    }
    return b;
  }
  // Karplus–Strong plucked string, rendered once and transposed with playbackRate
  function pluck(f, secs, bright, decay) {
    const sr = c.sampleRate, len = Math.floor(sr * secs), b = c.createBuffer(1, len, sr), d = b.getChannelData(0);
    const P = Math.max(4, Math.round(sr / f)), ring = new Float32Array(P);
    let lp = 0, mean = 0;
    for (let i = 0; i < P; i++) { lp += ((Math.random() * 2 - 1) - lp) * bright; ring[i] = lp; mean += lp; }
    mean /= P; for (let i = 0; i < P; i++) ring[i] -= mean;
    let idx = 0, pk = 0;
    for (let i = 0; i < len; i++) { const a = ring[idx], n = ring[(idx + 1) % P]; d[i] = a; ring[idx] = decay * 0.5 * (a + n); idx = (idx + 1) % P; pk = Math.max(pk, Math.abs(a)); }
    const fade = Math.floor(sr * 0.2);
    for (let i = 0; i < len; i++) { d[i] /= (pk || 1); if (i > len - fade) d[i] *= (len - i) / fade; }
    b.f0 = sr / (P + 0.5);
    return b;
  }
  // The beck: hundreds of tiny rising "bubbles" over a soft wash, written round a loop
  function brookBuf() {
    return loopBuf(7, (d, sr) => {
      const n = d.length;
      for (let k = 0; k < 1100; k++) {
        const at = (Math.random() * n) | 0, f0 = rnd(280, 1300) * (Math.random() < 0.15 ? 1.9 : 1), r = rnd(1.3, 2.4);
        const len = (sr * rnd(0.01, 0.045)) | 0, amp = Math.pow(Math.random(), 2) * 0.35, att = sr * 0.0015; let ph = 0;
        for (let i = 0; i < len; i++) { const u = i / len; ph += 6.2832 * f0 * (1 + (r - 1) * u * u) / sr; d[(at + i) % n] += Math.sin(ph) * amp * (1 - u) * (1 - u) * Math.min(1, i / att); }
      }
      let lp = 0; for (let i = 0; i < n; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.2; d[i] += lp * 0.12; }
      for (let i = n; i < d.length; i++) d[i] = d[i - n];
    });
  }
  // Rain drops: short damped ticks at random, written round a loop
  function rainBuf() {
    return loopBuf(6, (d, sr) => {
      const n = d.length;
      for (let k = 0; k < 1700; k++) {
        const at = (Math.random() * n) | 0, f = rnd(1800, 6500), tau = sr * rnd(0.0008, 0.004), len = (tau * 5) | 0, amp = Math.pow(Math.random(), 1.6) * 0.5;
        for (let i = 0; i < len; i++) d[(at + i) % n] += Math.sin(6.2832 * f * i / sr) * Math.exp(-i / tau) * amp;
      }
      for (let i = n; i < d.length; i++) d[i] = d[i - n];
    });
  }
  const PIANO_H = [0, 1, 0.42, 0.16, 0.09, 0.045, 0.025, 0.012];
  function makeWave(harm) { const re = new Float32Array(harm.length), im = new Float32Array(harm); return c.createPeriodicWave(re, im); }

  const ROOM_IR = {
    outside: () => impulse(1.5, 4.5, 0.35, [[0.17, 0.25], [0.31, 0.16], [0.52, 0.08]], 0.01),
    office: () => impulse(0.55, 3, 0.55, [[0.007, 0.4], [0.013, 0.3], [0.021, 0.2]]),
    hall: () => impulse(1.6, 3, 0.42, [[0.016, 0.35], [0.029, 0.25], [0.043, 0.18]], 0.008),
    shed: () => impulse(3.4, 2, 0.22, [[0.031, 0.3], [0.058, 0.24], [0.094, 0.18], [0.14, 0.1]], 0.015)
  };
  const ROOMS = { outside: 1, office: 1, hall: 1, shed: 1 };
  const ir = r => B['ir_' + r] || (B['ir_' + r] = ROOM_IR[r]());

  // ---------- ambience beds: started only while audible, stopped after a few silent seconds ----------
  function Bed(dest, make) { this.dest = dest; this.make = make; this.g = null; this.srcs = null; this.v = 0; this.idle = 0; }
  Bed.prototype.set = function (v, secs) {
    this.v = v; const t = c.currentTime;
    if (v > 0.0003 && !this.g) {
      this.g = G(0, this.dest()); this.srcs = [];
      const srcs = this.srcs, L = (buf, rate) => { const s = SRC(buf, null, rate); s.loop = true; s.start(t, Math.random() * buf.duration * 0.9); srcs.push(s); return s; };
      const mod = (rate, depth, param) => { const s = L(B.brown, rate); s.connect(G(depth, param)); };
      try { this.make(this.g, L, mod); } catch (e) { note(e); }
    }
    if (this.g) this.g.gain.setTargetAtTime(v, t, Math.max(0.05, (secs == null ? 1 : secs) / 3));
  };
  Bed.prototype.tick = function (dt) {
    if (!this.g || this.v > 0.0003) { this.idle = 0; return; }
    if ((this.idle += dt) > 5) { this.srcs.forEach(s => { try { s.stop(); } catch (e) { } }); try { this.g.disconnect(); } catch (e) { } this.g = this.srcs = null; this.idle = 0; }
  };
  const toWx = () => N.wx, toAmb = () => N.amb;
  const BED = {};
  function makeBeds() {
    BED.wind = new Bed(toWx, (out, L, mod) => {            // a light breeze, in slow gusts
      const bp = F('bandpass', 420, 0.6), g = G(1, out); L(B.pink).connect(bp); bp.connect(g);
      mod(0.002, 380, bp.frequency); mod(0.0027, 1.4, g.gain);
    });
    BED.leaves = new Bed(toWx, (out, L, mod) => {          // leaves and grass stirring
      const hp = F('highpass', 2800, 0.5), g = G(1, out); L(B.pink).connect(hp); hp.connect(g); mod(0.0023, 2.2, g.gain);
    });
    BED.rainHiss = new Bed(toWx, (out, L) => { const hp = F('highpass', 2600, 0.5), lp = F('lowpass', 9000, 0.5, out); L(B.white).connect(hp); hp.connect(lp); });
    BED.rainDrops = new Bed(toWx, (out, L) => {
      B.rain = B.rain || rainBuf(); const hp = F('highpass', 1000, 0.5, out);
      L(B.rain, 1).connect(hp); L(B.rain, 0.83).connect(G(0.7, hp));
    });
    BED.river = new Bed(toAmb, (out, L, mod) => {          // the beck, babbling
      B.brook = B.brook || brookBuf();
      const sh = F('highshelf', 3500, null, out); sh.gain.value = -6;
      L(B.brook, 1).connect(sh); L(B.brook, 0.87).connect(G(0.6, sh));
      const bp = F('bandpass', 900, 3), g = G(0.5, sh); L(B.pink).connect(bp); bp.connect(g);
      mod(0.03, 900, bp.frequency); mod(0.02, 1.2, g.gain);
    });
    BED.hum = new Bed(toAmb, (out) => {                     // UK mains hum: 100 Hz with a little 50 and 200
      [[100, 0.6], [50, 0.5], [200, 0.12], [300, 0.04]].forEach(([f, v]) => { const o = O('sine', f, G(v, out)); o.start(); BED.hum.srcs.push(o); });
    });
    BED.office = new Bed(toAmb, (out, L, mod) => {          // portakabin room tone: fridge, fan, the kettle cooling
      const lp = F('lowpass', 320, 0.5, out); L(B.brown).connect(lp);
      const bp = F('bandpass', 4800, 1.2), g = G(0.05, out); L(B.pink).connect(bp); bp.connect(g); mod(0.003, 0.08, g.gain);
    });
    BED.hall = new Bed(toAmb, (out, L, mod) => {            // big room air and the tea urn simmering
      const lp = F('lowpass', 260, 0.5, out); L(B.brown).connect(lp);
      const bp = F('bandpass', 620, 4), g = G(0.18, out); L(B.pink).connect(bp); bp.connect(g); mod(0.035, 0.5, g.gain);
    });
    BED.murmur = new Bed(toAmb, (out, L, mod) => {          // many people talking quietly
      const lp = F('lowpass', 2400, 0.5, out);
      [[380, 1.4, 0.026, 1], [900, 1.8, 0.034, 0.8], [1900, 2, 0.041, 0.35]].forEach(([f, q, r, v]) => {
        const bp = F('bandpass', f, q), g = G(v, lp); L(B.pink).connect(bp); bp.connect(g); mod(r, v * 2.2, g.gain);
      });
    });
    BED.shed = new Bed(toAmb, (out, L, mod) => {            // the depot: a deep space, wind whistling faintly in the gaps
      const lp = F('lowpass', 170, 0.5, out); L(B.brown).connect(lp);
      const bp = F('bandpass', 1750, 9), g = G(0.12, out); L(B.pink).connect(bp); bp.connect(g); mod(0.0021, 0.3, g.gain);
    });
  }

  // ---------- the graph ----------
  function build() {
    B.white = loopBuf(3, white); B.pink = loopBuf(4, pink); B.brown = loopBuf(4, brown);
    B.harp = pluck(440, 3.5, 0.5, 0.9985); B.gtr = pluck(196, 3, 0.32, 0.996);
    W.piano = makeWave(PIANO_H);
    W.pad = makeWave([0, 1, 0.5, 0.3, 0.18, 0.1, 0.06, 0.035, 0.02]);
    W.horn = makeWave([0, 1, 0.85, 0.7, 0.55, 0.42, 0.3, 0.22, 0.15, 0.1, 0.07, 0.05]);
    W.radio = makeWave([0, 1, 0.1, 0.33, 0.05, 0.16, 0.02, 0.07]);
    const lim = c.createDynamicsCompressor();       // gentle bus compression that also limits peaks
    lim.threshold.value = -12; lim.knee.value = 8; lim.ratio.value = 6; lim.attack.value = 0.004; lim.release.value = 0.25;
    N.master = G(A.on ? MASTER : 0, c.destination); lim.connect(N.master);
    N.sum = G(1, lim);
    N.verbM = c.createConvolver(); N.verbM.buffer = impulse(2.6, 2.6, 0.35, null, 0.02); N.verbM.connect(G(0.6, N.sum));
    N.room = G(0.12); swapRoomVerb(A.room);
    N.music = G(A.music * MUSIC); N.duck = G(1); N.musicMix = G(1, N.sum);
    N.music.connect(N.duck); N.duck.connect(N.musicMix); N.musicMix.connect(G(0.5, N.verbM));
    N.ui = G(A.sfxVol * UIGAIN, N.sum); N.ui.connect(G(0.25, N.verbM));
    N.world = G(A.sfxVol, N.sum); N.world.connect(N.room);
    N.amb = G(A.amb, N.sum); N.amb.connect(N.room);
    N.wx = G(1); N.wxLP = F('lowpass', 16000, 0.5, N.amb); N.wx.connect(N.wxLP);
    N.radio = G(0, N.world); const rl = F('lowpass', 2000, 0.8, N.radio), rp = F('peaking', 1200, 1.2, rl); rp.gain.value = 4;   // a small speaker through a wall
    N.radioIn = G(1, F('highpass', 380, 0.7, rp));
    makeBeds();
    BED.radioHiss = new Bed(() => N.radioIn, (out, L) => { L(B.white).connect(F('bandpass', 3000, 0.7, out)); });
  }
  function swapRoomVerb(r) {
    const t = c.currentTime, cv = c.createConvolver(); cv.buffer = ir(r);
    const out = G(0, N.sum); cv.connect(out); N.room.connect(cv); out.gain.setTargetAtTime(1, t, 0.12);
    const old = N.roomVerb; N.roomVerb = { cv, out, r };
    if (old) {
      old.out.gain.setTargetAtTime(0, t, 0.12);
      setTimeout(() => {
        try { N.room.disconnect(old.cv); } catch (e) { try { N.room.disconnect(); N.room.connect(N.roomVerb.cv); } catch (e2) { } }
        try { old.cv.disconnect(); old.out.disconnect(); } catch (e) { }
      }, 1500);
    }
  }
  // Where the score sits and how each space sounds
  const ROOMMIX = {
    outside: { send: 0.12, music: 1, lp: 16000, wx: 1 },
    office: { send: 0.14, music: 0.85, lp: 2200, wx: 0.8 },
    hall: { send: 0.3, music: 0.85, lp: 1200, wx: 0.45 },
    shed: { send: 0.55, music: 0.5, lp: 1700, wx: 0.7 }
  };
  const RIVER = 0.16;
  function mix(secs) {
    if (!c || !N.sum) return;
    const s = secs == null ? 1.2 : secs, t = c.currentTime, r = A.room, M = ROOMMIX[r], out = r === 'outside', w = A.weather, rain = w === 'rain', snow = w === 'snow';
    const st = (p, v, k) => p.setTargetAtTime(v, t, Math.max(0.03, (k == null ? s : k) / 3));
    st(N.room.gain, M.send, 0.3); st(N.wxLP.frequency, M.lp, 0.3);
    st(N.musicMix.gain, r === 'hall' ? M.music - 0.35 * A.crowd : M.music);
    BED.wind.set((snow ? 0.18 : rain ? 0.1 : 0.055) * (out ? 1 : r === 'shed' ? 0.45 : 0.3), s);
    BED.leaves.set(out ? (snow ? 0.05 : rain ? 0.02 : 0.035) : 0, s);
    BED.rainHiss.set(rain ? 0.02 * M.wx : 0, s * 2);
    BED.rainDrops.set(rain ? 0.09 * M.wx : 0, s * 2);
    BED.river.set(out ? A.near.river * RIVER : 0, s);
    BED.hum.set(r === 'office' ? 0.004 : 0, s);
    BED.office.set(r === 'office' ? 0.02 : 0, s);
    BED.hall.set(r === 'hall' ? 0.02 : 0, s);
    BED.murmur.set(r === 'hall' ? 0.01 + A.crowd * 0.145 : 0, s);
    BED.shed.set(r === 'shed' ? 0.026 : 0, s);
    st(N.radio.gain, r === 'shed' ? 1 : 0, 0.6); BED.radioHiss.set(r === 'shed' ? 0.02 : 0, 0.6);
  }

  // ---------- instruments ----------
  // Felt piano: soft hammer, two slightly detuned strings, brightness that fades faster than the note.
  // It is synthesised once per octave-ish into samples (OfflineAudioContext, at start-up), then each note is a
  // single transposed buffer: the same sound for a fraction of the CPU. Until the samples exist it plays live.
  const tilt = m => 1 - Math.max(0, Math.min(1, (m - 70) / 30)) * 0.45;
  function pianoSynth(t, m, vel, len, dest, low, natural) {
    vel = Math.max(0.05, Math.min(1.2, vel));
    const f = mtof(m), g = G(0, dest || N.music), lp = F('lowpass', 1000, 0.5, g);
    const o1 = O(W.piano, f, lp), o2 = O(W.piano, f, G(0.45, lp)); o2.detune.value = natural ? 3.5 : rnd(2.5, 5) * (Math.random() < 0.5 ? -1 : 1);
    const pk = Math.max(0.0003, 0.1 * vel * tilt(m) * (dest ? 1 : LV.piano)), l = Math.max(len, 0.5), end = natural ? t + len : t + l + (low ? 2.2 : 1.6);
    lp.frequency.setValueAtTime(Math.min(8000, f * (2 + 5 * vel)), t); lp.frequency.exponentialRampToValueAtTime(Math.max(180, f * 1.3), t + 1.5);
    const p = g.gain; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(pk, t + 0.005 + (1 - Math.min(1, vel)) * 0.006);
    p.exponentialRampToValueAtTime(pk * 0.35, t + 0.4); p.exponentialRampToValueAtTime(pk * 0.12, natural ? end - 1.6 : t + l); p.exponentialRampToValueAtTime(0.0001, end);
    o1.start(t); o2.start(t); o1.stop(end + 0.05); o2.stop(end + 0.05);
    if (!low && vel > 0.35) { const n = SRC(B.pink), nl = F('lowpass', 700, 0.7), ng = G(0, dest || N.music); n.connect(nl); nl.connect(ng); env(ng, t, 0.002, 0.018 * vel, 0.035); startAt(n, t, 0.05); }
  }
  const PIANO_AT = [40, 48, 56, 64, 72, 80, 88], PIANO_VEL = 0.8;
  function renderPiano() {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC || B.piano) return;
    const sr = c.sampleRate, dur = m => m < 60 ? 4.5 : m < 76 ? 3.5 : 2.5, slots = []; let at = 0.02;
    PIANO_AT.forEach(m => { slots.push({ m, at, d: dur(m) }); at += dur(m) + 0.05; });
    let off; try { off = new OAC(1, Math.ceil(sr * at), sr); } catch (e) { return; }
    const real = c, rw = W.piano; let fired = false;
    try { c = off; W.piano = makeWave(PIANO_H); slots.forEach(s => pianoSynth(s.at, s.m, PIANO_VEL, s.d, off.destination, s.m < 52, true)); }
    catch (e) { note(e); return; } finally { c = real; W.piano = rw; }
    const done = buf => {
      if (fired || !buf || !c) return; fired = true; const src = buf.getChannelData(0);
      B.piano = slots.map(s => { const n = Math.floor(sr * s.d), b = c.createBuffer(1, n, sr), d = b.getChannelData(0), o = Math.floor(sr * s.at), fade = Math.floor(sr * 0.05); for (let i = 0; i < n; i++) d[i] = src[o + i] * (i > n - fade ? (n - i) / fade : 1); b.m = s.m; return b; });
    };
    off.oncomplete = e => done(e.renderedBuffer);
    try { const p = off.startRendering(); if (p && p.then) p.then(done, note); } catch (e) { note(e); }
  }
  function piano(t, m, vel, len, dest, low) {
    if (!B.piano) return pianoSynth(t, m, vel, len, dest, low);
    vel = Math.max(0.05, Math.min(1.2, vel));
    let smp = B.piano[0]; for (const b of B.piano) if (Math.abs(b.m - m) < Math.abs(smp.m - m)) smp = b;
    const rate = Math.pow(2, (m - smp.m) / 12), s = SRC(smp, null, rate), g = G(0, dest || N.music);
    const gain = Math.max(0.003, (vel / PIANO_VEL) * (tilt(m) / tilt(smp.m)) * (dest ? 1 : LV.piano));
    s.connect(vel < 0.55 ? F('lowpass', Math.min(8000, mtof(m) * (2 + 4 * vel)), 0.5, g) : g);
    const l = Math.max(len, 0.5), bufEnd = t + smp.duration / rate, rel = t + l + (low ? 1.3 : 0.9);
    const p = g.gain; p.setValueAtTime(gain, t);
    if (rel + 0.7 < bufEnd) { p.setValueAtTime(gain, rel); p.exponentialRampToValueAtTime(0.0003 * gain, rel + 0.7); s.start(t); s.stop(rel + 0.72); }
    else { s.start(t); s.stop(bufEnd); }
  }
  // Warm pad: detuned soft-saw pairs through a swelling low-pass
  function padChord(t, notes, len, lvl, cut, dest) {
    const g = G(0, dest || N.music), lp = F('lowpass', cut * 0.5, 0.5, g), end = t + len * 1.45; lvl *= dest ? 1 : LV.pad;
    lp.frequency.setValueAtTime(cut * 0.5, t); lp.frequency.linearRampToValueAtTime(cut, t + len * 0.5); lp.frequency.linearRampToValueAtTime(cut * 0.55, end);
    const p = g.gain; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(lvl, t + len * 0.3); p.setValueAtTime(lvl, t + len); p.linearRampToValueAtTime(0.0001, end);
    notes.forEach(m => [-7, 7].forEach(dt => { const o = O(W.pad, mtof(m), lp); o.detune.value = dt + rnd(-2, 2); o.start(t); o.stop(end + 0.05); }));
  }
  // Harp (and nylon guitar): a Karplus–Strong pluck, transposed
  function harp(t, m, vel, dest, buf) {
    buf = buf || B.harp; const f = mtof(m), rate = f / buf.f0, len = Math.min(3.4, buf.duration / rate);
    const hv = 0.085 * vel * (dest ? 1 : LV.harp), s = SRC(buf, null, rate), g = G(hv, dest || N.music), lp = F('lowpass', Math.min(9000, f * 6), 0.3, g); s.connect(lp);
    g.gain.setValueAtTime(hv, t + len - 0.25); g.gain.linearRampToValueAtTime(0.0001, t + len);
    s.start(t); s.stop(t + len + 0.02);
  }
  // Soft brass for the promotion fanfare
  function brass(t, m, len, v, dest) {
    const f = mtof(m), g = G(0, dest), lp = F('lowpass', 350, 0.7, g);
    [-6, 6].forEach(dt => { const o = O(W.pad, f, lp); o.detune.value = dt; o.start(t); o.stop(t + len + 0.45); });
    lp.frequency.setValueAtTime(350, t); lp.frequency.linearRampToValueAtTime(350 + 1800 * v, t + 0.07); lp.frequency.exponentialRampToValueAtTime(800 + 500 * v, t + 0.35);
    const p = g.gain; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(0.045 * v, t + 0.05); p.linearRampToValueAtTime(0.036 * v, t + len); p.linearRampToValueAtTime(0.0001, t + len + 0.35);
  }
  function duck(amt, secs) { if (!N.duck) return; const t = c.currentTime, p = N.duck.gain; p.setTargetAtTime(1 - amt, t, 0.08); p.setTargetAtTime(1, t + secs, 0.7); }

  // ---------- the score ----------
  // The Lineside theme: scale degrees (0 = tonic, pentatonic, hummable) and lengths in beats. null = rest.
  // Bars 1–4 ask a question and end open on the fifth; bars 5–8 answer it and come home.
  const THEME = [
    [[0, .5], [1, .5], [2, 1], [4, 1.5], [2, .5]],
    [[1, 1.5], [0, .5], [-2, 2]],
    [[0, .5], [1, .5], [2, 1], [4, 1], [5, 1]],
    [[4, 3], [null, 1]],
    [[5, .5], [4, .5], [2, 1], [4, 1.5], [2, .5]],
    [[1, 1.5], [2, .5], [1, 1], [0, 1]],
    [[-2, 1], [0, 1], [1, 1], [2, .5], [1, .5]],
    [[0, 3], [null, 1]]
  ];
  const SCALE = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10] };
  const NO9 = { maj: [2, 6], min: [1, 4] };
  const semi = (md, d) => SCALE[md][((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const fit = (m, lo, hi) => { while (m > hi) m -= 12; while (m < lo) m += 12; return m; };
  // Chords are scale degrees ('4s' = sus4). A = under the theme, B = the bridge, R = a breath.
  const MOODS = {
    warm:    { key: 62, mode: 'maj', bpm: 72, bright: 1,    oct: 0,  lvl: 1,    harp: 'rail',   A: [0, 3, 5, 3, 5, 1, '4s', 0], B: [3, 0, 1, 4, 3, 2, 5, '4s'], R: [0, 3, 0, 3] },
    hopeful: { key: 64, mode: 'maj', bpm: 80, bright: 1.25, oct: 12, lvl: 1.05, harp: 'flow',   A: [0, 4, 5, 3, 0, 3, '4s', 0], B: [3, 4, 2, 5, 3, 4, 0, '4s'], R: [3, 0, 3, 4] },
    tense:   { key: 62, mode: 'min', bpm: 62, bright: 0.7,  oct: 0,  lvl: 0.85, harp: 'sparse', A: [0, 5, 3, 2, 5, 6, 3, 0],    B: [5, 6, 0, 0, 3, 5, 6, 6],    R: [0, 5, 0, 6] }
  };
  const S = { mood: null, secs: [], si: 0, bi: 0, next: 0, last: 74 };
  const LV = { piano: 1, pad: 0.45, harp: 3.5 };   // score balance (measured)
  // A new cue states the theme in full; after that each pass varies, so the theme stays a treat, not a loop.
  function plan(mood, fresh) {
    const Mo = MOODS[mood], A1 = { n: 'A', prog: Mo.A, vel: 0.72, theme: 1 }, A2 = { n: 'A', prog: Mo.A, vel: 0.78, theme: 2 },
      Bb = { n: 'B', prog: Mo.B, vel: 0.85 }, R = { n: 'R', prog: Mo.R, vel: 0.42 }, rest = { n: 'R', prog: Mo.R, vel: 0.3, bare: 1 };
    if (fresh) return [{ n: 'I', prog: Mo.R.slice(0, 2), vel: 0.45 }, A1, Bb, mood === 'tense' ? R : A2, R].concat(Math.random() < 0.45 ? [rest] : []);
    const r = Math.random();
    if (r < 0.3) return [A1, Bb, R];
    if (r < 0.55) return [Bb, mood === 'tense' ? Object.assign({}, A1, { half: 1 }) : A2, R, rest];
    if (r < 0.8) return [Bb, Object.assign({}, Bb, { vel: 0.7 }), rest];                    // no theme this time
    return [Object.assign({}, A1, { half: 1 }), R, rest];                                     // just the question, left open
  }
  const hum = () => rnd(-0.008, 0.012);
  function scheduleBar(t) {
    const want = MOODS[A.mood] ? A.mood : 'warm';
    if (S.mood !== want || !S.secs.length) { S.mood = want; S.secs = plan(S.mood, true); S.si = S.bi = 0; }
    const Mo = MOODS[S.mood], sec = S.secs[S.si], beat = 60 / Mo.bpm;
    playBar(t, Mo, sec, S.bi, sec.prog[S.bi], beat);
    if (++S.bi >= sec.prog.length) { S.bi = 0; if (++S.si >= S.secs.length) { S.secs = plan(S.mood, false); S.si = 0; } }
    return beat * 4;
  }
  function playBar(t, Mo, sec, bi, ch, beat) {
    const r = parseInt(ch, 10), sus = typeof ch === 'string', md = Mo.mode, P = d => Mo.key + semi(md, d), bar = beat * 4, v = sec.vel * Mo.lvl;
    const tones = sus ? [r, r + 3, r + 4] : [r, r + 2, r + 4], nine = NO9[md].indexOf(((r % 7) + 7) % 7) < 0;
    // pad, voiced round G3–D4, swelling with the section's dynamic
    padChord(t, tones.concat([nine ? r + 8 : r + 7]).map(d => fit(P(d) - 12, 50, 64)), bar, 0.011 * (0.55 + 0.6 * v), 850 * Mo.bright * (0.7 + 0.5 * v));
    // bass: a low piano root, with the fifth on beat three when the music is fuller
    const bass = fit(P(r) - 24, 38, 50);
    if (sec.n !== 'R' || bi % 2 === 0) piano(t + hum(), bass, (sec.bare ? 0.3 : 0.5) * v, beat * 3, null, 1);
    if (sec.n === 'B' || sec.theme === 2) piano(t + beat * 2 + hum(), fit(bass + 7, 43, 57), 0.32 * v, beat * 2, null, 1);
    // harp / guitar
    const hv = sec.theme ? 0.75 : 1, hN = d => fit(P(d), 64, 86);
    if (sec.n === 'I' || sec.n === 'R') { if (!sec.bare || bi % 2) { harp(t + hum(), hN(r + 7), 0.28 * v * 2); if (Math.random() < 0.6) harp(t + beat * 2 + hum(), hN(r + 4), 0.22 * v * 2); } }
    else if (Mo.harp === 'sparse' && sec.n !== 'B') { harp(t + hum(), fit(P(r + 4), 50, 64), 0.5 * v, null, B.gtr); harp(t + beat * 2.5 + hum(), fit(P(r + 2), 50, 64), 0.4 * v, null, B.gtr); }
    else if (Mo.harp === 'rail' && sec.n !== 'B') {          // da-da … da-da: wheels over rail joints
      [[0, r + 4, 1], [0.5, r + 7, 0.7], [2, r + 2, 0.9], [2.5, r + 4, 0.65]].forEach(([b, d, a]) => harp(t + b * beat + hum(), hN(d), 0.42 * a * v * hv));
    } else {                                                   // flowing arpeggio (the bridge, and hopeful)
      [r, r + 2, r + 4, r + 7, r + 9, r + 7, r + 4, r + 2].forEach((d, i) => harp(t + i * beat * 0.5 + hum(), fit(P(d), 57, 84), (i === 0 ? 0.5 : 0.34) * v * hv));
    }
    // melody
    if (sec.theme && !(sec.half && bi % 8 >= 4)) {
      // second voice: the nearest chord tone at least a minor third below the tune, so it always agrees with the pad
      const harmony = m => { let best = 0; [-7, 0, 7].forEach(o => tones.forEach(d => { const q = P(d + o) + oct; if (m - q >= 3 && q > best) best = q; })); return best; };
      let pos = 0; const bars = THEME[bi % 8], oct = Mo.oct + (sec.theme === 2 && Mo.oct === 0 && S.mood !== 'tense' ? 12 : 0), end = bi % 4 === 3;
      bars.forEach(([d, len]) => {
        if (d != null) {
          const tt = t + pos * beat + hum(), m = P(d) + oct, vel = v * (0.82 + 0.22 * (d + 2) / 7) * (end ? 0.85 : 1) * rnd(0.93, 1.05);
          if (sec.theme === 2 && len >= 1 && pos > 0 && Math.random() < 0.2) piano(tt - 0.07, P(d + 1) + oct, vel * 0.35, 0.1);
          piano(tt, m, vel, len * beat);
          if (sec.theme === 2 && len >= 1) { const h = harmony(m); if (h) piano(tt + 0.01, h, vel * 0.5, len * beat); }
          if (sec.theme === 2 && len >= 1.5) harp(tt + 0.015, m + 12, 0.3 * v);
          S.last = m;
        }
        pos += len;
      });
    } else if (sec.n === 'B' || sec.half) {                   // a quiet counter-line from the chord tones
      const rh = pick([[0, 1.5, 3], [0.5, 2, 3], [0, 2.5], [1, 2, 2.5]]);
      rh.forEach(b => {
        const cands = tones.concat([r + 7]).map(d => fit(P(d) + Mo.oct, 66, 83));
        cands.sort((x, y) => Math.abs(x - S.last) - Math.abs(y - S.last));
        const m = cands[Math.random() < 0.6 ? 0 : 1]; S.last = m;
        piano(t + b * beat + hum(), m, 0.45 * v * rnd(0.9, 1.05), beat * 1.2);
      });
    } else if (!sec.bare && Math.random() < 0.5) piano(t + beat * rnd(0, 2) + hum(), fit(P(r + pick([7, 9, 4])) + Mo.oct, 72, 86), 0.3 * v, beat * 2);
  }
  function musicTick(now) {
    if (S.next < now + 0.05) S.next = now + 0.1;      // fell behind (e.g. a background tab): pick up cleanly
    while (S.next < now + 0.6) { let bar = 3; try { bar = scheduleBar(S.next); } catch (e) { note(e); } S.next += bar; }
  }

  // ---------- one-shot building blocks ----------
  function blip(t, f, len, v, dest, type, f2) {
    const o = O(type || 'sine', f), g = G(0, dest); o.connect(g);
    if (f2) { o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + len); }
    const e = env(g, t, 0.004, v, len); o.start(t); o.stop(e + 0.02); return e;
  }
  // filtered noise hit: { buf, type, f, f2, q, v, a, d, dest }
  function hit(t, o) {
    const s = SRC(o.buf || B.white), fl = F(o.type || 'bandpass', o.f, o.q == null ? 1 : o.q), g = G(0, o.dest); s.connect(fl); fl.connect(g);
    const a = o.a || 0.003;
    if (o.f2) { fl.frequency.setValueAtTime(o.f, t); fl.frequency.exponentialRampToValueAtTime(o.f2, t + a + o.d); }
    const e = env(g, t, a, o.v, o.d); startAt(s, t, e - t); return e;
  }
  // a quick run of tiny grains (gravel, ballast, keyboards)
  function grains(t, dest, f, q, n, gap, v, dec) {
    const s = SRC(B.white), bp = F('bandpass', f, q), g = G(0, dest), p = g.gain; s.connect(bp); bp.connect(g);
    let tt = t; p.setValueAtTime(0.0001, t);
    for (let i = 0; i < n; i++) { const d = rnd(dec[0], dec[1]); p.setValueAtTime(Math.max(0.0002, v * rnd(0.35, 1) * (1 - i / (n * 1.5))), tt); p.exponentialRampToValueAtTime(0.0001, tt + d); tt += d + rnd(gap[0], gap[1]); }
    startAt(s, t, tt - t + 0.02); return tt;
  }
  function creak(t, len, dest, v) {
    const o = O('sawtooth', 160), bp = F('bandpass', 900, 7), g = G(0, dest); o.connect(bp); bp.connect(g);
    const fr = o.frequency; fr.setValueAtTime(rnd(130, 170), t); for (let i = 1; i <= 5; i++) fr.linearRampToValueAtTime(rnd(120, 240), t + len * i / 5);
    env(g, t, len * 0.3, v || 0.05, len * 0.7); o.start(t); o.stop(t + len + 0.05);
  }
  // a muffled voice: formant-filtered buzz in syllables (hall chatter, the radio presenter)
  function voice(t, f, dest, v) {
    const len = rnd(0.2, 0.55), o = O('sawtooth', f), bp = F('bandpass', pick([520, 720, 1000, 1300]), 4), g = G(0, dest), p = g.gain; o.connect(bp); bp.connect(g);
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * rnd(0.85, 1.15), t + len);
    bp.frequency.setValueAtTime(bp.frequency.value, t); bp.frequency.linearRampToValueAtTime(pick([520, 720, 1000, 1300]), t + len);
    p.setValueAtTime(0.0001, t); let tt = t; const n = 1 + ((len / 0.13) | 0);
    for (let i = 0; i < n; i++) { p.linearRampToValueAtTime(v * rnd(0.5, 1), tt + 0.03); p.linearRampToValueAtTime(v * 0.12, tt + 0.11); tt += 0.13; }
    p.linearRampToValueAtTime(0.0001, tt + 0.05); o.start(t); o.stop(tt + 0.1); return tt - t + 0.1;
  }

  // ---------- outside: birds and sheep ----------
  function chirp(t, f0, f1, len, v, dest) {
    const o = O('sine', f0), g = G(0, dest); o.connect(g);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len);
    const p = g.gain; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(v, t + len * 0.2); p.exponentialRampToValueAtTime(0.0001, t + len);
    o.start(t); o.stop(t + len + 0.02);
  }
  function coo(t, f, len, v, dest) {
    const g = G(0, dest), o = O('sine', f, g), o2 = O('sine', f * 2, G(0.12, g)), p = g.gain;
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.94, t + len);
    o2.frequency.setValueAtTime(f * 2, t); o2.frequency.linearRampToValueAtTime(f * 1.88, t + len);
    p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(v, t + len * 0.3); p.linearRampToValueAtTime(v * 0.7, t + len * 0.7); p.linearRampToValueAtTime(0.0001, t + len);
    o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05);
  }
  const BIRDS = {
    blackbird(t, d) {           // mellow, fluty phrases with a twittered ending
      let tt = t; const n = 3 + ((Math.random() * 4) | 0), base = rnd(1500, 2100);
      for (let i = 0; i < n; i++) { const f = base * pick([1, 1.125, 1.25, 1.333, 1.5, 0.89]), len = rnd(0.09, 0.22); chirp(tt, f, f * rnd(0.85, 1.2), len, 0.55, d); tt += len + rnd(0.03, 0.09); }
      if (Math.random() < 0.6) for (let i = 0; i < 4; i++) { const f = rnd(4500, 6200); chirp(tt, f, f * 0.8, 0.03, 0.12, d); tt += 0.045; }
      return tt - t;
    },
    robin(t, d) {               // thin, tumbling, tinkly
      let tt = t; const n = 5 + ((Math.random() * 6) | 0);
      for (let i = 0; i < n; i++) { const f = rnd(2500, 5500), len = rnd(0.03, 0.09); chirp(tt, f, f * rnd(0.6, 1.5), len, 0.3, d); tt += len + rnd(0.015, 0.06); }
      return tt - t;
    },
    chiffchaff(t, d) { const n = 4 + ((Math.random() * 5) | 0); for (let i = 0; i < n; i++) { const f = i % 2 ? 4300 : 5200; chirp(t + i * 0.3, f * 1.05, f * 0.9, 0.07, 0.2, d); } return n * 0.3; },
    greattit(t, d) {            // tea-cher, tea-cher
      const n = 3 + ((Math.random() * 3) | 0), hi = rnd(4300, 4900), lo = hi * 0.72;
      for (let i = 0; i < n; i++) { chirp(t + i * 0.36, hi, hi * 0.97, 0.08, 0.22, d); chirp(t + i * 0.36 + 0.12, lo, lo * 0.98, 0.14, 0.18, d); }
      return n * 0.36;
    },
    pigeon(t, d) {              // a wood pigeon, far off: coo-COO-coo, coo-coo
      const f = rnd(330, 390); [[0, 0.3, 0.6], [0.42, 0.45, 1], [0.98, 0.25, 0.6], [1.5, 0.3, 0.7], [1.9, 0.3, 0.6]].forEach(([o, l, a]) => coo(t + o, f, l, a * 1.6, d));
      return 2.3;
    }
  };
  function birdPhrase(t) {
    const w = A.weather, dusk = A.mood === 'hopeful';
    const sp = pick(dusk ? ['blackbird', 'blackbird', 'robin', 'pigeon'] : ['blackbird', 'blackbird', 'robin', 'robin', 'chiffchaff', 'greattit', 'pigeon']);
    const dist = rnd(0.15, 1), lvl = 0.055 * (1 - dist * 0.6) * (w === 'rain' ? 0.5 : w === 'snow' ? 0.4 : 1);
    const lp = F('lowpass', 3500 + 7000 * (1 - dist), 0.5, N.amb), into = G(lvl, PAN(rnd(-0.8, 0.8), lp));
    hold(t + BIRDS[sp](t, into), 8);
  }
  function baa(t, v, pan) {
    const f = rnd(165, 235), len = rnd(0.55, 0.9), o = O('sawtooth', f), lfo = O('sine', rnd(6.5, 8.5));
    lfo.connect(G(f * 0.035, o.frequency)); const am = G(0.75); lfo.connect(G(0.25, am.gain));
    const out = G(0, PAN(pan, N.amb)), lp = F('lowpass', 1600, 0.5, out), f1 = F('bandpass', 700, 3, lp), f2 = F('bandpass', 1500, 4, G(0.6, lp));
    o.connect(am); am.connect(f1); am.connect(f2);
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.06, t + 0.1); o.frequency.linearRampToValueAtTime(f * 0.9, t + len);
    const e = env(out, t, 0.06, v, len * 0.5, len * 0.4); o.start(t); lfo.start(t); o.stop(e + 0.05); lfo.stop(e + 0.05); hold(e, 3);
  }

  // ---------- the main line: a train going by ----------
  const TR = { nextAuto: 0 };
  function trainPass(t, o) {
    const prox = o.near != null ? clamp01(o.near) : A.room === 'outside' ? Math.max(0.12, A.near.mainline) : 0.05;
    const v = (o.vol == null ? 1 : o.vol) * (0.2 + 0.8 * prox), dir = o.dir < 0 ? -1 : o.dir > 0 ? 1 : pick([-1, 1]), len = rnd(7.5, 9.5), mid = t + len * 0.5, end = t + len;
    const cp = x => Math.max(-1, Math.min(1, x)), base = o.pan != null ? +o.pan : 0.35, cut = 350 + 3800 * prox;
    const out = G(1, o.dest || N.world), pn = PAN(cp(base - 0.35 * dir), out), lp = F('lowpass', cut * 0.35, 0.5, pn);
    if (pn.pan) { pn.pan.setValueAtTime(cp(base - 0.35 * dir), t); pn.pan.linearRampToValueAtTime(cp(base + 0.35 * dir), end); }
    lp.frequency.setValueAtTime(cut * 0.35, t); lp.frequency.exponentialRampToValueAtTime(cut, mid); lp.frequency.exponentialRampToValueAtTime(cut * 0.3, end);
    const swell = (g, pk) => { const p = g.gain; p.setValueAtTime(0.0001, t); p.exponentialRampToValueAtTime(pk * 0.25, mid - 1.4); p.linearRampToValueAtTime(pk, mid - 0.2); p.linearRampToValueAtTime(pk * 0.8, mid + 0.6); p.exponentialRampToValueAtTime(pk * 0.2, mid + 2); p.exponentialRampToValueAtTime(0.0001, end); };
    const r = SRC(B.brown), rl = F('lowpass', 200, 0.7), rg = G(0, lp); r.connect(rl); rl.connect(rg); swell(rg, 1.2 * v); startAt(r, t, len);      // rumble
    const w = SRC(B.pink), wb = F('bandpass', 850, 0.6), wg = G(0, lp); w.connect(wb); wb.connect(wg); swell(wg, 0.7 * v); startAt(w, t, len);      // wheels on rail
    const m = O('triangle', 196), mg = G(0, lp); m.connect(mg); m.frequency.setValueAtTime(196, mid - 0.5); m.frequency.linearRampToValueAtTime(174, mid + 0.5); swell(mg, 0.025 * v); m.start(t); m.stop(end + 0.05);   // motor note, Doppler
    const k = SRC(B.white), kb = F('bandpass', 1300, 1.1), kg = G(0, lp), kp = kg.gain; k.connect(kb); kb.connect(kg); kp.setValueAtTime(0.0001, t);
    const gap = rnd(0.32, 0.42);
    for (let tt = mid - 1.6; tt < mid + 1.8; tt += gap * rnd(0.95, 1.05)) {        // bogies over the joints: da-dum … da-dum
      const a = Math.max(0.0002, 0.4 * v * (1 - Math.abs(tt - mid) / 2.2));
      kp.setValueAtTime(a, tt); kp.exponentialRampToValueAtTime(0.0001, tt + 0.03); kp.setValueAtTime(a * 0.8, tt + 0.085); kp.exponentialRampToValueAtTime(0.0001, tt + 0.115);
    }
    startAt(k, t, len); hold(end, 6);
  }

  // ---------- rooms: little events that make each space feel lived in ----------
  const OFF = { kettle: 0 }, SHED = { leaks: [1250, 1800] };
  function clink(t, v, pan) { const out = PAN(pan, N.world), r = rnd(0.94, 1.06); blip(t, 2600 * r, 0.18, v, out); blip(t, 4100 * r, 0.12, v * 0.6, out); blip(t, 6150 * r, 0.06, v * 0.25, out); }
  function drip(t, f, v) {
    const o = O('sine', f), g = G(0, N.world); o.connect(g);
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * rnd(1.5, 2.1), t + 0.04);
    const e = env(g, t, 0.002, v, rnd(0.06, 0.11)); o.start(t); o.stop(e + 0.02); hold(e, 2);
  }
  // Gaz's radio, in the back room of the depot: the Lineside theme as 1960s light music, then the presenter
  const RADIO = { mode: 'off', next: 0 };
  function rtone(t, m, len, v, lead) {
    const o = O(W.radio, mtof(m)), g = G(0, N.radioIn); o.connect(g);
    if (lead) { o.frequency.setValueAtTime(mtof(m) * 0.99, t); o.frequency.linearRampToValueAtTime(mtof(m), t + 0.04); }
    const e = lead ? env(g, t, 0.02, 0.014 * v, len * 0.5 + 0.1, len * 0.5) : env(g, t, 0.006, 0.014 * v, len);
    o.start(t); o.stop(e + 0.02);
  }
  function radioBar(t, bi) {
    const beat = 60 / RADIO.bpm, P = d => RADIO.key + semi('maj', d), ch = parseInt(MOODS.warm.A[bi % 8], 10);
    rtone(t, fit(P(ch) - 24, 40, 52), beat * 0.7, 0.55); rtone(t + 2 * beat, fit(P(ch + 4) - 24, 40, 55), beat * 0.7, 0.5);   // oom …
    [1, 3].forEach(b => [ch, ch + 2, ch + 4].forEach(d => rtone(t + b * beat, fit(P(d), 57, 69), beat * 0.3, 0.16)));          // … pah
    let pos = 0;
    THEME[bi % 8].forEach(([d, len]) => { if (d != null) rtone(t + (pos + (pos % 1 === 0.5 ? 0.16 : 0)) * beat, P(d) + 12, len * beat * 0.85, 0.45, true); pos += len; });
  }
  function radioTick(now, dt) {
    const R = RADIO;
    if (R.mode === 'off') { if (now >= R.next) { R.mode = 'tune'; R.key = pick([62, 65, 67]); R.bpm = pick([104, 112, 120]); R.bi = 0; R.t = now + 0.2; } return; }
    if (R.mode === 'tune') {
      while (R.t < now + 0.6 && R.bi < 16) { radioBar(R.t, R.bi++); R.t += 240 / R.bpm; }
      if (R.bi >= 16 && now > R.t) { R.mode = 'talk'; R.until = now + rnd(6, 11); R.vf = pick([115, 135, 190, 210]); R.vnext = now + 0.8; }
      return;
    }
    if (now > R.until) { R.mode = 'off'; R.next = now + rnd(1.5, 4); return; }
    if (now > R.vnext) R.vnext = now + voice(now + 0.05, R.vf * rnd(0.9, 1.15), N.radioIn, 0.06) + rnd(0.05, 0.45);
  }
  function typing(t) { const n = 5 + ((Math.random() * 12) | 0); const e = grains(t, PAN(rnd(-0.5, 0.2), N.world), 3200, 1.2, n, [0.06, 0.16], 0.035, [0.006, 0.012]); hold(e, 2); }
  function ambTick(now, dt) {
    const r = A.room, t = now + 0.05, w = A.weather, chance = rate => Math.random() < rate * dt;
    if (r === 'outside') {
      const br = w === 'rain' ? 0.05 : w === 'snow' ? 0.03 : A.mood === 'hopeful' ? 0.13 : 0.2;
      if (chance(br) && roomFor(8)) birdPhrase(t);
      if (w !== 'snow' && chance(1 / 32) && roomFor(3)) { baa(t, 0.1 * rnd(0.5, 1), rnd(-0.7, 0.7)); if (Math.random() < 0.35) baa(t + rnd(0.9, 1.6), 0.06, rnd(-0.7, 0.7)); }
      if (A.autoTrains && A.near.mainline > 0.03 && now > TR.nextAuto) { TR.nextAuto = now + rnd(45, 100); trainPass(t, {}); }
    } else if (r === 'office') {
      if (chance(1 / 22) && roomFor(2)) typing(t);
      if (chance(1 / 75) && roomFor(3)) SFX.paper(t, {}, G(0.3, PAN(rnd(-0.5, 0.5), N.world)));
      if (now > OFF.kettle) { OFF.kettle = now + rnd(150, 260); if (roomFor(6)) SFX.kettle(t, {}, G(0.3, PAN(-0.45, N.world))); }
    } else if (r === 'hall') {
      const k = A.crowd;
      if (chance(k * 1.6) && roomFor(2)) voice(t, rnd(100, 240), G(1, PAN(rnd(-0.7, 0.7), F('lowpass', 1300, 0.5, N.amb))), 0.05 + 0.05 * Math.random());
      if (chance(0.02 + k * 0.12) && roomFor(3)) clink(t, 0.01 + 0.012 * Math.random(), rnd(-0.8, 0.8));
      if (chance(0.004 + k * 0.03) && roomFor(2)) creak(t, rnd(0.25, 0.5), PAN(rnd(-0.8, 0.8), N.world), 0.025);
      if (k > 0.3 && chance(k * 0.008) && roomFor(12)) SFX.crowd_laugh(t, {}, G(0.35, N.world));
    } else if (r === 'shed') {
      if (chance(w === 'rain' ? 0.75 : 0.3) && roomFor(2)) drip(t, pick(SHED.leaks) * rnd(0.97, 1.03), 0.03 + 0.03 * Math.random());
      radioTick(now, dt);
    }
  }

  // ---------- one-shot sounds ----------
  // UI sounds use notes that sit in any of the score's keys (root, fifth, ninth), so they never clash with it
  const KEY = () => (MOODS[S.mood || A.mood] || MOODS.warm).key;
  function mallet(t, m, v, dest) { const f = mtof(m); blip(t, f, 0.32, v, dest); blip(t, f * 3.98, 0.05, v * 0.22, dest); }
  function hornTone(t, f, len, v, dest, weak) {
    const g = G(0, dest), lp = F('lowpass', weak ? 1100 : 2600, 0.6, g), pk = F('peaking', 950, 1, lp); pk.gain.value = weak ? 2 : 5;
    [-5, 5].forEach(dt => {
      const o = O(W.horn, f, pk), fr = o.frequency; o.detune.value = dt;
      fr.setValueAtTime(f * 0.96, t); fr.exponentialRampToValueAtTime(f, t + 0.08);
      if (weak) { fr.setValueAtTime(f, t + 0.1); fr.linearRampToValueAtTime(f * 0.86, t + len); }
      o.start(t); o.stop(t + len + 0.25);
    });
    const p = g.gain; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(v, t + 0.05);
    p.linearRampToValueAtTime(weak ? v * 0.3 : v * 0.92, t + len); p.linearRampToValueAtTime(0.0001, t + len + (weak ? 0.08 : 0.16));
    hit(t, { buf: B.pink, f: 1400, q: 0.7, v: v * (weak ? 0.7 : 0.2), a: 0.04, d: len, dest });
  }
  const SFX = {
    // UI
    tap(t, o, out) { const r = rnd(0.98, 1.02); blip(t, 1320 * r, 0.06, 0.06, out, 'sine', 950 * r); hit(t, { f: 3200, q: 1.5, v: 0.02, d: 0.012, dest: out }); },
    select(t, o, out) { const m = fit(KEY() + 7, 76, 88); mallet(t, m, 0.07, out); mallet(t + 0.06, m + 5, 0.05, out); },
    page(t, o, out) { hit(t, { buf: B.pink, f: 1800, f2: 4200, q: 0.8, v: 0.25, a: 0.04, d: 0.18, dest: out }); },
    stamp(t, o, out) { blip(t, 120, 0.16, 0.08, out, 'sine', 55); hit(t, { buf: B.brown, type: 'lowpass', f: 900, v: 0.15, d: 0.07, dest: out }); hit(t + 0.005, { f: 1600, q: 1.5, v: 0.03, d: 0.03, dest: out }); },
    good(t, o, out) { const b = fit(KEY(), 62, 73); [0, 7, 12, 19].forEach((s, i) => harp(t + i * 0.07, b + s, 0.6, out)); piano(t + 0.3, b + 12, 0.4, 0.8, out); },
    bad(t, o, out) { const b = fit(KEY(), 60, 71); piano(t, b + 7, 0.3, 0.3, out); piano(t + 0.2, b + 5, 0.26, 0.7, out); harp(t + 0.2, b - 12, 0.35, out, B.gtr); },
    ripple(t, o, out) { const b = fit(KEY(), 62, 73); [24, 19, 14, 12, 7].forEach((s, i) => harp(t + i * 0.065, b + s, 0.4, out)); piano(t + 0.36, b + 7, 0.25, 1, out); },
    chapter(t, o, out) {
      const b = fit(KEY(), 60, 71); duck(0.5, 2.5);
      padChord(t, [b - 12, b - 5, b, b + 7], 2.2, 0.012, 1100, out);
      [b - 12, b + 7, b + 12, b + 14].forEach((m, i) => piano(t + i * 0.12, m, i ? 0.4 : 0.5, 1.6, out, !i));
      harp(t + 0.55, b + 19, 0.4, out);
    },
    unlock(t, o, out) { const b = fit(KEY(), 62, 73); [7, 12, 14, 19, 24].forEach((s, i) => harp(t + i * 0.055, b + s, 0.45, out)); blip(t + 0.3, mtof(b + 24), 1.1, 0.02, out); blip(t + 0.3, mtof(b + 24) * 2.76, 0.4, 0.006, out); },
    place(t, o, out) { const r = rnd(0.96, 1.04); blip(t, 540 * r, 0.07, 0.07, out, 'triangle', 420 * r); hit(t, { f: 1100 * r, q: 2, v: 0.05, d: 0.03, dest: out }); },
    rankup(t, o, out) {        // da-da-daaa: root, fifth, octave, with a harp run and a bell on top
      const b = fit(KEY(), 55, 66); duck(0.55, 2.6); out.gain.value *= 0.7;
      brass(t, b, 0.12, 0.75, out); brass(t + 0.16, b + 7, 0.12, 0.8, out);
      [b + 12, b + 7, b].forEach((m, i) => brass(t + 0.32, m, 1.1, [1, 0.6, 0.55][i], out));
      [0, 2, 7, 12, 14, 19, 24].forEach((s, i) => harp(t + 0.3 + i * 0.03, b + 12 + s, 0.35, out));
      piano(t + 0.36, b + 24, 0.45, 1.2, out);
    },
    // world
    peep(t, o, out) { hornTone(t, 330, 0.3, 0.05, out, true); },          // Ruby with a flat battery
    horn(t, o, out) {                                                         // two-tone: high then low
      hornTone(t, 370, 0.55, 0.09, out); hornTone(t + 0.62, 311, 0.8, 0.085, out);
      if (A.room === 'outside') [[0.38, 0.16], [0.8, 0.07]].forEach(([d, v]) => { const dl = c.createDelay(1); dl.delayTime.value = d; out.connect(dl); dl.connect(G(v, F('lowpass', 1400, 0.5, N.world))); });   // off the valley sides
    },
    train_pass(t, o) { trainPass(t, o); },
    meow(t, o, out) {
      const f = rnd(0.95, 1.08), s = O('sawtooth', 520 * f), bp = F('bandpass', 900, 5), g = G(0, F('lowpass', 2500, 0.5, out)); s.connect(bp); bp.connect(g);
      s.frequency.setValueAtTime(480 * f, t); s.frequency.linearRampToValueAtTime(760 * f, t + 0.18); s.frequency.linearRampToValueAtTime(430 * f, t + 0.55);
      bp.frequency.setValueAtTime(800, t); bp.frequency.linearRampToValueAtTime(1800, t + 0.2); bp.frequency.linearRampToValueAtTime(700, t + 0.55);
      env(g, t, 0.05, 0.2, 0.5); s.start(t); s.stop(t + 0.6);
    },
    coo(t, o, out) { for (let i = 0; i < 3; i++) coo(t + i * 0.3, 330 - i * 10, 0.24, 0.08, out); for (let i = 0; i < 5; i++) hit(t + 0.95 + i * 0.07, { buf: B.pink, f: 1000, q: 0.8, v: 0.06, d: 0.04, dest: out }); },
    clank(t, o, out) { [[420, 0.03, 0.5], [1130, 0.018, 0.35], [1870, 0.011, 0.25], [2650, 0.007, 0.2]].forEach(([f, v, d]) => blip(t, f * rnd(0.98, 1.02), d, v, out)); hit(t, { f: 3000, q: 1, v: 0.06, d: 0.02, dest: out }); blip(t, 150, 0.1, 0.04, out, 'triangle'); },
    door(t, o, out) {
      out.gain.value *= 0.6;
      const heavy = o.kind === 'heavy' || (o.kind !== 'wood' && (o.to === 'shed' || A.room === 'shed'));
      if (heavy) {                                                            // the depot's big door, rolling
        hit(t, { f: 900, q: 3, v: 0.08, d: 0.05, dest: out });
        hit(t + 0.05, { buf: B.brown, type: 'lowpass', f: 300, v: 0.35, a: 0.25, d: 0.5, dest: out });
        [[620, 0.012], [915, 0.008], [1480, 0.005]].forEach(([f, v]) => blip(t + 0.08, f, 0.5, v, out));
        hit(t + 0.85, { buf: B.brown, type: 'lowpass', f: 160, v: 0.5, d: 0.3, dest: out }); blip(t + 0.85, 70, 0.3, 0.12, out, 'sine', 45);
        hit(t + 0.86, { f: 1300, q: 5, v: 0.05, d: 0.2, dest: out });
      } else {                                                                // latch, maybe a creak, a soft close
        hit(t, { f: 2600, q: 2, v: 0.09, d: 0.015, dest: out }); hit(t + 0.03, { f: 1700, q: 3, v: 0.05, d: 0.01, dest: out });
        if (Math.random() < 0.55) creak(t + 0.06, rnd(0.25, 0.4), out, 0.04);
        const tc = t + rnd(0.5, 0.6);
        hit(tc, { buf: B.brown, type: 'lowpass', f: 200, v: 0.4, d: 0.16, dest: out }); blip(tc, 85, 0.14, 0.1, out, 'sine', 55);
        hit(tc + 0.012, { f: 3000, q: 2, v: 0.06, d: 0.012, dest: out });
      }
    },
    step_grass(t, o, out, pv) { hit(t, { buf: B.pink, f: 2200 * pv, q: 0.9, v: 0.06, a: 0.012, d: 0.1, dest: out }); hit(t, { buf: B.brown, type: 'lowpass', f: 260 * pv, v: 0.12, a: 0.005, d: 0.05, dest: out }); },
    step_gravel(t, o, out, pv) { grains(t, out, 2600 * pv, 0.7, 6, [0.002, 0.012], 0.07, [0.004, 0.009]); hit(t, { buf: B.brown, type: 'lowpass', f: 220 * pv, v: 0.1, d: 0.05, dest: out }); },
    step_ballast(t, o, out, pv) {
      grains(t, out, 1300 * pv, 0.8, 8, [0.004, 0.016], 0.09, [0.005, 0.012]); hit(t, { buf: B.brown, type: 'lowpass', f: 170 * pv, v: 0.14, d: 0.07, dest: out });
      if (Math.random() < 0.3) blip(t + rnd(0.02, 0.08), 2300 * pv, 0.025, 0.012, out, 'triangle');
    },
    step_wood(t, o, out, pv) { blip(t, 140 * pv, 0.08, 0.06, out, 'sine', 90 * pv); hit(t, { f: 650 * pv, q: 3, v: 0.07, d: 0.05, dest: out }); if (Math.random() < 0.08) creak(t + 0.02, 0.18, out, 0.02); },
    step_floor(t, o, out, pv) { hit(t, { f: 2800 * pv, q: 0.8, v: 0.04, d: 0.03, dest: out }); blip(t, 100 * pv, 0.05, 0.05, out, 'sine', 70 * pv); },
    kettle(t, o, out) {
      out.gain.value *= 1.6;
      const s = SRC(B.pink), bp = F('bandpass', 300, 1.4), g = G(0, out), am = G(1, g); s.connect(bp); bp.connect(am);   // the boil, rising
      const lfo = SRC(B.brown, null, 0.05); lfo.connect(G(1.6, am.gain));
      bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1100, t + 2.3);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 2.1); g.gain.linearRampToValueAtTime(0.0001, t + 2.45);
      startAt(s, t, 2.5); startAt(lfo, t, 2.5);
      hit(t + 2.4, { f: 2600, q: 2, v: 0.08, d: 0.02, dest: out }); blip(t + 2.4, 1700, 0.03, 0.02, out);                   // click
      const ps = SRC(B.white), pb = F('bandpass', 600, 7), pg = G(0, out); ps.connect(pb); pb.connect(pg);                  // pour: rises as the mug fills
      pb.frequency.setValueAtTime(600, t + 2.8); pb.frequency.exponentialRampToValueAtTime(1500, t + 3.9);
      pg.gain.setValueAtTime(0.0001, t + 2.8); pg.gain.linearRampToValueAtTime(0.09, t + 2.95); pg.gain.setValueAtTime(0.09, t + 3.75); pg.gain.linearRampToValueAtTime(0.0001, t + 3.95);
      startAt(ps, t + 2.8, 1.2);
      [4.15, 4.38, 4.6].forEach((d, i) => { blip(t + d, 3100 * rnd(0.98, 1.02), 0.14, 0.015 * (1 - i * 0.2), out); blip(t + d, 4900, 0.08, 0.006, out); });   // and a stir
    },
    crowd_laugh(t, o, out) {
      const lp = F('lowpass', 2400, 0.5, out), vin = G(1); vin.connect(F('bandpass', 750, 2, lp)); vin.connect(F('bandpass', 1250, 3, G(0.6, lp)));
      const n = 5 + ((Math.random() * 3) | 0);
      for (let k = 0; k < n; k++) {
        const st = t + rnd(0, 0.35), f = rnd(140, 300), o1 = O('sawtooth', f), g = G(0, PAN(rnd(-0.6, 0.6), vin)), p = g.gain; o1.connect(g);
        const rate = rnd(4.5, 6.5), cnt = 3 + ((Math.random() * 4) | 0), v0 = rnd(0.03, 0.05); let tt = st;
        p.setValueAtTime(0.0001, st);
        for (let i = 0; i < cnt; i++) { const a = v0 * Math.pow(0.8, i); p.linearRampToValueAtTime(a, tt + 0.025); p.linearRampToValueAtTime(a * 0.08, tt + 0.6 / rate); tt += 1 / rate; }
        p.linearRampToValueAtTime(0.0001, tt + 0.05);
        o1.frequency.setValueAtTime(f * 1.08, st); o1.frequency.linearRampToValueAtTime(f * 0.9, tt);
        o1.start(st); o1.stop(tt + 0.1);
      }
      hit(t, { buf: B.pink, f: 1100, q: 0.8, v: 0.05, a: 0.15, d: 1.1, dest: lp });
    },
    paper(t, o, out) {
      const s = SRC(B.white), bp = F('bandpass', 3200, 0.7), g = G(0, out), p = g.gain; s.connect(bp); bp.connect(g);
      p.setValueAtTime(0.0001, t); let tt = t;
      for (let i = 0; i < 3; i++) { const len = rnd(0.07, 0.12), a = rnd(0.07, 0.11); for (let j = 0; j < 4; j++) p.linearRampToValueAtTime(a * rnd(0.4, 1), tt + len * (j + 0.5) / 4); p.linearRampToValueAtTime(0.002, tt + len + 0.02); tt += len + 0.02 + rnd(0.03, 0.06); }
      p.linearRampToValueAtTime(0.0001, tt + 0.02); startAt(s, t, tt - t + 0.05);
      hit(t + 0.02, { buf: B.pink, f: 1200, q: 0.8, v: 0.05, a: 0.05, d: 0.2, dest: out });
    },
    radio(t, o, out) {
      out.gain.value *= 1.4;
      hit(t, { f: 2400, q: 2, v: 0.05, d: 0.01, dest: out });
      const s = SRC(B.white), hp = F('highpass', 500, 0.7), bp = F('bandpass', 1800, 1.1), g = G(0, out), p = g.gain; s.connect(hp); hp.connect(bp); bp.connect(g);
      p.setValueAtTime(0.0001, t + 0.012); let tt = t + 0.015; for (let i = 0; i < 9; i++) { p.linearRampToValueAtTime(rnd(0.05, 0.1), tt); tt += 0.025; }
      p.linearRampToValueAtTime(0.03, tt); p.linearRampToValueAtTime(0.0001, tt + 0.012); startAt(s, t, tt - t + 0.05);
      blip(tt + 0.03, 1250, 0.06, 0.025, out);                                // roger pip
    },
    phone(t, o, out) {                                                         // UK double ring: brr-brr … brr-brr
      const rings = Math.max(1, Math.min(3, (o.rings | 0) || 1)), eg = G(0, F('lowpass', 3200, 0.5, out)), trem = G(0.5, eg), lfo = O('triangle', 19);
      lfo.connect(G(0.5, trem.gain));
      const bells = [[1180, 1], [1480, 0.8], [2360, 0.12]].map(([f, a]) => O('sine', f, G(a, trem)));
      const p = eg.gain; p.setValueAtTime(0.0001, t); let tt = t;
      for (let r = 0; r < rings; r++) { [0, 0.6].forEach(d => { const s0 = tt + d; p.setValueAtTime(0.0001, s0); p.linearRampToValueAtTime(0.05, s0 + 0.02); p.setValueAtTime(0.05, s0 + 0.38); p.linearRampToValueAtTime(0.0001, s0 + 0.42); }); tt += 3; }
      const end = tt - 3 + 1.1; [lfo].concat(bells).forEach(x => { x.start(t); x.stop(end); });
    }
  };
  const UI = { tap: 1, select: 1, page: 1, stamp: 1, good: 1, bad: 1, ripple: 1, chapter: 1, unlock: 1, place: 1, rankup: 1 };
  const STEP = { last: 0, foot: 0 }, STEPTRIM = { step_gravel: 1.2, step_ballast: 1.4, step_wood: 0.7, step_floor: 0.75 };

  // ---------- engine ----------
  function note(e) { if (A.errors.length < 20) A.errors.push(String((e && e.message) || e)); }
  const quiet = p => { if (p && p.catch) p.catch(() => { }); };
  function resume() { if (!c || c.state === 'running' || c.state === 'closed') return; resumeAsk = performance.now(); try { quiet(c.resume()); } catch (e) { } }
  function live() { return !!(c && N.sum && A.on && c.state !== 'closed' && (c.state === 'running' || performance.now() - resumeAsk < 600)); }
  function tick() {
    if (!c) return;
    const now = c.currentTime;
    if (c.state !== 'running' || !A.on) { lastTick = now; return; }
    const dt = Math.min(0.5, Math.max(0, now - lastTick)); lastTick = now;
    try { if (A.music > 0) musicTick(now); else S.next = 0; if (A.amb > 0 || A.sfxVol > 0) ambTick(now, dt); for (const k in BED) BED[k].tick(dt); } catch (e) { note(e); }
  }
  function onVis() { if (!c) return; if (document.hidden) { if (c.state === 'running') try { quiet(c.suspend()); } catch (e) { } } else if (A.on) resume(); }
  function onGesture() { if (c && A.on && c.state !== 'running') resume(); }

  A.init = function () {
    if (c) { if (A.on) resume(); return; }
    if (!AC) return;
    try { c = new AC(); } catch (e) { c = null; return; }
    A.ctx = c;
    try { build(); } catch (e) { note(e); try { quiet(c.close()); } catch (e2) { } c = A.ctx = null; Object.keys(N).forEach(k => delete N[k]); return; }
    try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, c.sampleRate); s.connect(c.destination); s.start(0); } catch (e) { }   // iOS unlock
    resume(); mix(0.1);
    try { renderPiano(); } catch (e) { note(e); }
    SHED.leaks = [rnd(1100, 1400), rnd(1650, 1950)];
    S.next = 0; TR.nextAuto = c.currentTime + rnd(25, 50); OFF.kettle = c.currentTime + rnd(30, 80); RADIO.next = c.currentTime + 1;
    lastTick = c.currentTime; timer = setInterval(tick, 100);
    setTimeout(() => (window.requestIdleCallback || setTimeout)(() => { try { B.brook = B.brook || brookBuf(); } catch (e) { note(e); } }), 4000);   // warm the beck up before it's needed
    document.addEventListener('visibilitychange', onVis);
    ['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, onGesture, { capture: true, passive: true }));
  };
  A.toggle = function (on) {
    A.on = !!on; if (!c || !N.master) return;
    const t = c.currentTime, p = N.master.gain;
    p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(A.on ? MASTER : 0, t + 0.4);
    clearTimeout(offTimer);
    if (A.on) resume(); else offTimer = setTimeout(() => { if (c && !A.on && c.state === 'running') try { quiet(c.suspend()); } catch (e) { } }, 600);
  };
  A.setMood = function (m) { A.mood = MOODS[m] ? m : 'warm'; };
  A.setWeather = function (w) { w = w === 'rain' || w === 'snow' ? w : 'clear'; if (w === A.weather && c) return; A.weather = w; mix(2); };
  A.setRoom = function (r) {
    r = ROOMS[r] ? r : 'outside'; if (r === A.room && (!c || (N.roomVerb && N.roomVerb.r === r))) return;
    A.room = r; if (!c || !N.sum) return;
    swapRoomVerb(r);
    const now = c.currentTime;
    if (r === 'office') OFF.kettle = Math.max(OFF.kettle, now + rnd(30, 80));
    if (r === 'shed') { RADIO.mode = 'off'; RADIO.next = now + rnd(0.8, 2); }
    mix(0.8);
  };
  A.setCrowd = function (x) {
    x = clamp01(x); if (Math.abs(x - A.crowd) < 0.01 && !(x === 0 && A.crowd)) return; A.crowd = x;
    if (c && N.sum && A.room === 'hall') { BED.murmur.set(0.01 + x * 0.145, 1.5); N.musicMix.gain.setTargetAtTime(ROOMMIX.hall.music - 0.35 * x, c.currentTime, 0.5); }
  };
  A.setNear = function (o) {
    if (!o) return; let ch = false;
    ['river', 'mainline'].forEach(k => { if (o[k] == null) return; const v = clamp01(o[k]); if (Math.abs(v - A.near[k]) >= 0.01 || (v === 0 && A.near[k])) { A.near[k] = v; ch = true; } });
    if (ch && c && N.sum) BED.river.set(A.room === 'outside' ? A.near.river * RIVER : 0, 0.6);
  };
  A.setVolume = function (o) {
    o = o || {}; if (o.music != null) A.music = clamp01(o.music); if (o.sfx != null) A.sfxVol = clamp01(o.sfx); if (o.amb != null) A.amb = clamp01(o.amb);
    if (!c || !N.sum) return; const t = c.currentTime;
    N.music.gain.setTargetAtTime(A.music * MUSIC, t, 0.1); N.ui.gain.setTargetAtTime(A.sfxVol * UIGAIN, t, 0.1); N.world.gain.setTargetAtTime(A.sfxVol, t, 0.1); N.amb.gain.setTargetAtTime(A.amb, t, 0.1);
  };
  A.sfx = function (name, opts) {
    const fn = SFX[name]; if (!fn || !live()) return;
    const o = opts || {}, t = c.currentTime + 0.01, step = name.slice(0, 5) === 'step_';
    if (step) { if (t - STEP.last < 0.1) return; STEP.last = t; STEP.foot ^= 1; }
    if (name === 'train_pass') A.autoTrains = false;
    try {
      const vol = (o.vol == null ? 1 : Math.max(0, Math.min(2, +o.vol || 0))) * (step ? rnd(0.75, 1) : 1);
      const pan = o.pan != null ? +o.pan : step ? (STEP.foot ? -0.05 : 0.05) : 0;
      fn(t, o, G(vol * (STEPTRIM[name] || 1), PAN(pan, UI[name] ? N.ui : N.world)), step ? rnd(0.92, 1.08) : 1);
    } catch (e) { note(e); }
  };
  // Dev tool: the output level right now, in dBFS ({ rms, peak }). Not needed by the game.
  A.meter = function () {
    if (!c || !N.master) return null;
    if (!N.an) { N.an = c.createAnalyser(); N.an.fftSize = 2048; N.master.connect(N.an); N.anBuf = new Float32Array(2048); }
    N.an.getFloatTimeDomainData(N.anBuf); let s = 0, pk = 0; for (const v of N.anBuf) { s += v * v; pk = Math.max(pk, Math.abs(v)); }
    const db = x => x > 0 ? Math.round(200 * Math.log10(x)) / 10 : -Infinity;
    return { rms: db(Math.sqrt(s / N.anBuf.length)), peak: db(pk) };
  };
})();
