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
};
