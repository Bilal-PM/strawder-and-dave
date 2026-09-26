/* LINESIDE — generative ambient score + UI sound (Web Audio, no assets).
 * A slow pad progression with sparse "felt piano" notes through a synthetic
 * reverb, plus weather ambience (wind, rain) and quiet UI sounds.
 */
window.LS = window.LS || {};
(function () {
  const A = LS.audio = { ctx: null, on: true, music: 0.55, sfxVol: 0.8, mood: 'warm', weather: 'clear' };
  let master, musicBus, sfxBus, verb, windNode, rainNode, padTimer, pianoTimer, step = 0;
  const MOODS = {
    warm:   { chords: [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]], scale: [62, 64, 66, 69, 71, 74, 76, 78, 81] },
    tense:  { chords: [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 58, 62], [40, 47, 52, 55, 59]], scale: [57, 59, 60, 64, 67, 69, 71, 72, 76] },
    hopeful:{ chords: [[48, 55, 60, 64, 67], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62]], scale: [60, 62, 64, 67, 69, 72, 74, 76, 79] }
  };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function impulse(ctx, secs, decay) {
    const len = ctx.sampleRate * secs, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function noiseBuffer(ctx) {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return b;
  }
  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = A.ctx;
    master = c.createGain(); master.gain.value = A.on ? 0.9 : 0; master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.connect(master);
    verb = c.createConvolver(); verb.buffer = impulse(c, 3.6, 2.6);
    const verbGain = c.createGain(); verbGain.gain.value = 0.55; verb.connect(verbGain); verbGain.connect(comp);
    musicBus = c.createGain(); musicBus.gain.value = A.music * 0.5; musicBus.connect(comp); musicBus.connect(verb);
    sfxBus = c.createGain(); sfxBus.gain.value = A.sfxVol * 0.5; sfxBus.connect(comp);
    // weather beds
    const nb = noiseBuffer(c);
    const mk = (type, freq, q) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(comp); s.start(); return { g, f }; };
    windNode = mk('bandpass', 420, 0.6); rainNode = mk('highpass', 1800, 0.4);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg); lg.connect(windNode.f.frequency); lfo.start();
    A.setWeather(A.weather); startMusic();
  };
  function pad(notes, dur) {
    const c = A.ctx, t = c.currentTime;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.1, t + dur * 0.35); g.gain.linearRampToValueAtTime(0, t + dur * 1.1);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.3; f.connect(g); g.connect(musicBus);
    notes.forEach((m, i) => { for (const det of [-6, 6]) { const o = c.createOscillator(); o.type = i === 0 ? 'triangle' : 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det; const og = c.createGain(); og.gain.value = i === 0 ? 0.5 : 0.12; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur * 1.15); } });
  }
  function piano(m, vel) {
    const c = A.ctx, t = c.currentTime;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 3.2);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; f.connect(g); g.connect(musicBus);
    [[1, 'sine', 1], [2, 'sine', 0.25], [3, 'triangle', 0.08]].forEach(([h, type, a]) => { const o = c.createOscillator(); o.type = type; o.frequency.value = mtof(m) * h; const og = c.createGain(); og.gain.value = a; o.connect(og); og.connect(f); o.start(t); o.stop(t + 3.3); });
  }
  function startMusic() {
    clearInterval(padTimer); clearTimeout(pianoTimer);
    const bar = 8;
    const playPad = () => { if (!A.ctx || !A.on) return; const M = MOODS[A.mood] || MOODS.warm; pad(M.chords[step % M.chords.length], bar); step++; };
    playPad(); padTimer = setInterval(playPad, bar * 1000);
    const tick = () => { if (A.ctx && A.on) { const M = MOODS[A.mood] || MOODS.warm; piano(M.scale[Math.floor(Math.random() * M.scale.length)], 0.5 + Math.random() * 0.5); if (Math.random() < 0.3) setTimeout(() => piano(M.scale[Math.floor(Math.random() * M.scale.length)], 0.4), 420); }
      pianoTimer = setTimeout(tick, 1800 + Math.random() * 3200); };
    pianoTimer = setTimeout(tick, 1500);
  }
  A.setMood = m => { A.mood = m; };
  A.setWeather = w => {
    A.weather = w; if (!A.ctx) return; const t = A.ctx.currentTime;
    windNode.g.gain.linearRampToValueAtTime(w === 'snow' ? 0.16 : w === 'rain' ? 0.08 : 0.04, t + 2);
    rainNode.g.gain.linearRampToValueAtTime(w === 'rain' ? 0.12 : 0, t + 2);
  };
  A.toggle = on => { A.on = on; if (master) master.gain.linearRampToValueAtTime(on ? 0.9 : 0, A.ctx.currentTime + 0.4); };
  A.sfx = function (type) {
    if (!A.ctx || !A.on) return; const c = A.ctx, t = c.currentTime;
    const tone = (f, d, type, v, when) => { const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t + (when || 0)); g.gain.linearRampToValueAtTime(v, t + (when || 0) + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + (when || 0) + d); o.connect(g); g.connect(sfxBus); o.start(t + (when || 0)); o.stop(t + (when || 0) + d + 0.05); };
    const noise = (d, freq, v) => { const s = c.createBufferSource(); s.buffer = noiseBuffer(c); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + d); };
    switch (type) {
      case 'tap': tone(880, 0.08, 'sine', 0.12); break;
      case 'select': tone(660, 0.12, 'sine', 0.14); tone(990, 0.18, 'sine', 0.08, 0.05); break;
      case 'page': noise(0.25, 2400, 0.25); break;
      case 'stamp': tone(90, 0.25, 'sine', 0.5); noise(0.12, 600, 0.6); break;
      case 'good': [72, 76, 79, 84].forEach((m, i) => tone(mtof(m), 1.2, 'sine', 0.1, i * 0.08)); break;
      case 'bad': tone(mtof(45), 1.1, 'triangle', 0.22); tone(mtof(46), 1.1, 'triangle', 0.14, 0.02); break;
      case 'ripple': for (let i = 0; i < 5; i++) tone(mtof(84 - i * 3), 0.6, 'sine', 0.06, i * 0.07); break;
      case 'chapter': [60, 67, 72].forEach((m, i) => tone(mtof(m), 2.4, 'sine', 0.09, i * 0.18)); break;
    }
  };
})();
