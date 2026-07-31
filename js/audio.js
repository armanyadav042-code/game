/* =====================================================================
   audio.js — tiny WebAudio synth. No assets, all sounds generated.
   ===================================================================== */
"use strict";

const AudioSys = (() => {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let musicTimer = null;
  let sfxOn = true, musicOn = true;

  /** Lazily create the AudioContext (must happen after a user gesture). */
  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
    } catch (e) { /* audio unsupported — game still works */ }
  }
  function resume() { if (ctx && ctx.state === "suspended") ctx.resume(); }

  /** One-shot oscillator blip. */
  function tone(freq, dur, type = "square", vol = 0.2, slide = 0) {
    if (!ctx || !sfxOn) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /** Filtered noise burst — used for impacts / breaks. */
  function noise(dur, vol = 0.3, freq = 800) {
    if (!ctx || !sfxOn) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  /* ---- Named sound effects ---- */
  const SFX = {
    hit()   { noise(0.07, 0.22, rand(900, 1400)); tone(rand(150, 210), 0.06, "triangle", 0.12, -60); },
    crit()  { noise(0.12, 0.34, 2200); tone(500, 0.14, "sawtooth", 0.16, -260); tone(760, 0.1, "square", 0.1, -300); },
    break_(){ noise(0.4, 0.42, 700); tone(120, 0.32, "sawtooth", 0.2, -70); tone(240, 0.22, "triangle", 0.14, -140); },
    coin()  { tone(920, 0.07, "square", 0.1); setTimeout(() => tone(1380, 0.1, "square", 0.1), 55); },
    buy()   { tone(520, 0.07, "square", 0.14); setTimeout(() => tone(780, 0.09, "square", 0.14), 60); },
    deny()  { tone(180, 0.14, "sawtooth", 0.12, -60); },
    ach()   { [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.12, "triangle", 0.14), i * 80)); },
    prestige(){ [220, 330, 440, 660, 880].forEach((f, i) => setTimeout(() => tone(f, 0.25, "sawtooth", 0.12), i * 100)); noise(0.6, 0.3, 500); },
    boss()  { tone(90, 0.5, "sawtooth", 0.22, -30); setTimeout(() => tone(70, 0.6, "sawtooth", 0.2, -20), 250); },
    ui()    { tone(640, 0.045, "square", 0.07); },
  };

  function play(name) {
    if (!ctx || !sfxOn) return;
    resume();
    const fn = name === "break" ? SFX.break_ : SFX[name];
    if (fn) fn();
  }

  /* ---- Ambient music: a slow generative arpeggio loop ---- */
  const SCALE = [130.81, 155.56, 174.61, 196.0, 233.08, 261.63, 311.13, 349.23];
  let step = 0;
  function musicTick() {
    if (!ctx || !musicOn) return;
    const t = ctx.currentTime;
    const f = SCALE[[0, 2, 4, 7, 4, 2, 5, 3][step % 8]] * (step % 16 < 8 ? 1 : 1.5);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 1.5);
    // soft bass every 4 steps
    if (step % 4 === 0) {
      const b = ctx.createOscillator(), bg = ctx.createGain();
      b.type = "sine"; b.frequency.value = f / 4;
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.exponentialRampToValueAtTime(1.2, t + 0.08);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      b.connect(bg); bg.connect(musicGain);
      b.start(t); b.stop(t + 2);
    }
    step++;
  }
  function startMusic() {
    if (musicTimer || !ctx) return;
    musicTimer = setInterval(musicTick, 460);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

  return {
    init, resume, play,
    setSfx(v)   { sfxOn = v; },
    setMusic(v) { musicOn = v; if (v) startMusic(); else stopMusic(); },
    startMusic,
  };
})();
