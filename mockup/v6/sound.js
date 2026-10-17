// =====================================================================
//  Sound: a generative ambient bed and small SFX, all synthesized with
//  Web Audio. No files. Starts on the first tap (browser autoplay rule).
// =====================================================================
window.Sound = (() => {
  let ctx = null;
  let master, music, sfx, verb, lp;
  let started = false;
  let muted = false;
  try { muted = localStorage.getItem('linor-mute') === '1'; } catch (e) {}
  let lastTick = 0;
  let chordTimer = null;
  let shimmerTimer = null;
  const voices = [];

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // Warm, slow progression. Every chord holds ~7s.
  const CHORDS = [
    [45, 52, 57, 60, 64], // Am
    [41, 48, 53, 57, 60], // F
    [48, 55, 60, 64, 67], // C
    [43, 50, 55, 59, 62], // G
  ];

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);

    // soft reverb from decaying noise
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    verb.buffer = buf;
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.5;
    verb.connect(verbGain).connect(master);

    music = ctx.createGain();
    music.gain.value = 0;
    lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.4;
    music.connect(lp);
    lp.connect(master);
    lp.connect(verb);
    // slow breathing on the filter
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 320;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();

    sfx = ctx.createGain();
    sfx.gain.value = 0.6;
    sfx.connect(master);
    sfx.connect(verb);
    return true;
  }

  function playChord(notes) {
    const t = ctx.currentTime;
    // release old voices
    for (const v of voices.splice(0)) {
      v.g.gain.cancelScheduledValues(t);
      v.g.gain.setTargetAtTime(0, t, 1.4);
      v.o.forEach((o) => o.stop(t + 6));
    }
    notes.forEach((n, i) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(i === 0 ? 0.09 : 0.055, t, 1.8);
      const o = [ctx.createOscillator(), ctx.createOscillator()];
      o[0].type = 'sine';
      o[1].type = 'triangle';
      o[0].frequency.value = midi(n);
      o[1].frequency.value = midi(n);
      o[0].detune.value = -5;
      o[1].detune.value = 6;
      o.forEach((x) => x.connect(g) && x.start(t));
      g.connect(music);
      voices.push({ g, o });
    });
  }

  function bed() {
    let k = 0;
    const step = () => {
      playChord(CHORDS[k++ % CHORDS.length]);
      chordTimer = setTimeout(step, 7000);
    };
    step();
    music.gain.setTargetAtTime(0.9, ctx.currentTime, 2.5);
    const shimmer = () => {
      ping(2400 + Math.random() * 2200, 0.02, 1.2);
      shimmerTimer = setTimeout(shimmer, 2500 + Math.random() * 4500);
    };
    shimmerTimer = setTimeout(shimmer, 3000);
  }

  // ---------------------------------------------------------------- sfx
  function ping(freq, vol = 0.1, decay = 0.6, type = 'sine', when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(sfx);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  function noise(dur, vol, from, to, type = 'bandpass', when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = 0.9;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(sfx);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  const api = {
    get muted() { return muted; },
    start() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (started) return;
      started = true;
      bed();
    },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('linor-mute', muted ? '1' : '0'); } catch (e) {}
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.15);
      return muted;
    },
    // one day passes under the ring
    tick() {
      if (!ctx) return;
      const now = performance.now();
      if (now - lastTick < 45) return;
      lastTick = now;
      ping(1500 + Math.random() * 300, 0.05, 0.08, 'sine');
    },
    // photo opens / closes
    whoosh(dur = 0.9) { noise(dur, 0.16, 180, 2400); },
    hush(dur = 0.5) { noise(dur, 0.1, 1800, 220); },
    // stamp lands
    chime() {
      ping(880, 0.12, 1.6);
      ping(1318.5, 0.07, 1.4, 'sine', 0.02);
      ping(1760, 0.05, 1.8, 'sine', 0.05);
      ping(55, 0.18, 0.35, 'sine');
    },
    sparkle(n = 8) {
      for (let i = 0; i < n; i++) ping(2000 + Math.random() * 2600, 0.035, 0.5, 'sine', i * 0.07 + Math.random() * 0.05);
    },
    puff() { noise(0.35, 0.14, 600, 160, 'lowpass'); },
    // "and you said yes"
    yes() {
      if (!ctx) return;
      [57, 64, 69, 76].forEach((n, i) => ping(midi(n), 0.08, 3.2, i % 2 ? 'triangle' : 'sine', i * 0.08));
      noise(1.6, 0.08, 300, 3000);
      api.sparkle(12);
    },
    step() { ping(660, 0.04, 0.25); },
    duck(on) { if (ctx && started) music.gain.setTargetAtTime(on ? 0.12 : 0.9, ctx.currentTime, 0.8); },
  };
  return api;
})();
