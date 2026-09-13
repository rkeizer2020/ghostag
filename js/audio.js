// Tiny Web Audio sound engine - no audio files needed.
// All effects are synthesised on the fly. Mute state persists per device.
const SFX = {
  ctx: null,
  master: null,
  _muted: false,
  _volume: 0.6,

  init() {
    try {
      this._muted = localStorage.getItem('tagz.muted') === '1';
      const v = parseFloat(localStorage.getItem('tagz.volume'));
      if (Number.isFinite(v)) this._volume = Phaser.Math.Clamp(v, 0, 1);
    } catch (e) {
      this._muted = false;
    }
  },

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this._effectiveGain();
    this.master.connect(this.ctx.destination);
  },

  _effectiveGain() {
    return this._muted ? 0 : this._volume;
  },

  get volume() {
    return this._volume;
  },

  setVolume(v) {
    this._volume = Phaser.Math.Clamp(v, 0, 1);
    try { localStorage.setItem('tagz.volume', String(this._volume)); } catch (e) { /* ignore */ }
    if (this.master) this.master.gain.value = this._effectiveGain();
  },

  // Call from a user gesture to unlock audio on mobile browsers.
  unlock() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  get muted() {
    return this._muted;
  },

  toggleMute() {
    this._muted = !this._muted;
    try {
      localStorage.setItem('tagz.muted', this._muted ? '1' : '0');
    } catch (e) { /* ignore */ }
    if (this.master) this.master.gain.value = this._effectiveGain();
    return this._muted;
  },

  _tone(freq, dur, type = 'sine', vol = 0.3, glideTo = null) {
    this._ensure();
    if (!this.ctx || this._muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo !== null) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  _noise(dur, vol = 0.3) {
    this._ensure();
    if (!this.ctx || this._muted) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  },

  pickup() {
    this._tone(660, 0.09, 'triangle', 0.25);
    setTimeout(() => this._tone(990, 0.12, 'triangle', 0.25), 60);
  },

  boost() {
    this._tone(300, 0.25, 'sawtooth', 0.2, 900);
  },

  warn() {
    this._tone(120, 0.08, 'square', 0.15);
  },

  // Eerie 4-note motif that plays as the Spook closes in. intensity 0..1
  // brings the notes closer together and a touch louder.
  spooky(intensity = 0.5) {
    this._ensure();
    if (!this.ctx || this._muted) return;
    const t0 = this.ctx.currentTime;
    const notes = [466.16, 440.00, 349.23, 311.13]; // A#4, A4, F4, D#4 - foreboding descent
    const gap = 0.22 - intensity * 0.07;
    const dur = 0.34;
    const vol = 0.09 + intensity * 0.09;
    notes.forEach((f, i) => this._spookyNote(f, t0 + i * gap, dur, vol));
  },

  _spookyNote(freq, when, dur, vol) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, when);
    // gentle vibrato for a ghostly waver
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 6;
    lfoGain.gain.value = freq * 0.013;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
    lfo.start(when);
    lfo.stop(when + dur + 0.05);
  },

  caught() {
    this._noise(0.25, 0.4);
    this._tone(200, 0.5, 'sawtooth', 0.3, 60);
    setTimeout(() => this._tone(90, 0.6, 'square', 0.3, 40), 120);
  },

  click() {
    this._tone(520, 0.06, 'square', 0.2);
  },

  slash() {
    this._noise(0.14, 0.28);
    this._tone(700, 0.14, 'sawtooth', 0.18, 180);
  },

  // ---- Background music: a slow, eerie looping tune that swells near the Spook ----
  music: null,
  musicGain: null,

  startMusic() {
    this._ensure();
    if (!this.ctx) return;
    if (this.music && this.music.timer) return; // already playing

    // dedicated music bus so we can swell the whole track near the Spook
    if (!this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
    }
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.value = 0.6;

    const stepMs = 330;
    // 16-step loop: uneasy chromatic bass + a minor/tritone melody (spooky)
    const bass = { 0: 110.00, 4: 103.83, 8: 87.31, 12: 98.00 };  // A2 G#2 F2 G2
    const mel  = { 0: 329.63, 2: 233.08, 5: 277.18, 8: 349.23, 10: 233.08, 13: 329.63, 15: 311.13 };

    this.music = { step: 0, timer: null };
    const tick = () => {
      const s = this.music.step % 16;
      if (s === 0) this._pad(55.00, 5.6, 0.05, 'sine', 0);       // low drone once per loop
      if (bass[s]) this._pad(bass[s], 1.7, 0.06, 'triangle', 7);
      if (mel[s]) this._pad(mel[s], 0.85, 0.045, 'sine', 8);
      this.music.step++;
    };
    tick();
    this.music.timer = setInterval(tick, stepMs);
  },

  stopMusic() {
    if (this.music && this.music.timer) {
      clearInterval(this.music.timer);
      this.music.timer = null;
    }
  },

  // near = 0 (far) .. 1 (Spook right behind you): swells the music louder
  setMusicIntensity(near) {
    if (!this.musicGain || !this.ctx) return;
    const target = 0.55 + Math.max(0, Math.min(1, near)) * 1.05; // 0.55 -> 1.6
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.3);
  },

  // two slightly detuned voices give a haunting, wavering texture
  _pad(freq, dur, vol, type, detune) {
    if (!this.ctx || this._muted) return;
    const bus = this.musicGain || this.master;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(bus);
    const d = detune || 0;
    [-d, d].forEach((cents) => {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = cents;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  },
};
