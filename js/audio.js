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

  // ---- Background music: "Cell Block Lullaby" ----
  // A calm, melancholic prison theme: soft felt piano over slow strings, a low
  // drone and cold air, a distant bell, water drips and far-off metal clanks, all
  // in a stone-hall reverb. The tune is original (D minor, 3/4, 66 bpm); on every
  // second pass a cello takes the melody an octave lower. Notes are scheduled a
  // little ahead on the audio clock so the timing stays steady.
  music: null,
  musicGain: null,
  _mx: null, // per-AudioContext cache: music bus, reverb, piano wave, noise
  _song: null,

  _theme: {
    bpm: 66,
    // string-pad voicing + the piano's bass note (third = semitones above the root)
    chords: {
      Dm:   { pad: ['A3', 'D4', 'F4'],  bass: 'D3',  third: 3 },
      Bb:   { pad: ['Bb3', 'D4', 'F4'], bass: 'Bb2', third: 4 },
      Gm:   { pad: ['G3', 'Bb3', 'D4'], bass: 'G2',  third: 3 },
      A:    { pad: ['A3', 'C#4', 'E4'], bass: 'A2',  third: 4 },
      Asus: { pad: ['A3', 'D4', 'E4'],  bass: 'A2',  third: 5 },
      F:    { pad: ['A3', 'C4', 'F4'],  bass: 'F2',  third: 4 },
      C:    { pad: ['G3', 'C4', 'E4'],  bass: 'C3',  third: 4 },
    },
    // chords: [name, bars]; melody/bells: [note, beats] ('r' = rest).
    // arp: 'root' = one low note per chord, 'quarter'/'eighth' = rolling left hand.
    sections: {
      intro: { arp: 'root', toll: true, chords: [['Dm', 2], ['Gm', 1], ['Asus', 1]] },
      a: {
        arp: 'quarter', cello: true,
        chords: [['Dm', 2], ['Bb', 2], ['Gm', 2], ['Asus', 1], ['A', 1]],
        melody: [
          ['A4', 1], ['D5', 1], ['E5', 1],     ['F5', 2], ['E5', 1],
          ['D5', 1.5], ['C5', 0.5], ['Bb4', 1], ['F4', 3],
          ['G4', 1], ['Bb4', 1], ['D5', 1],    ['G5', 2], ['F5', 1],
          ['E5', 2], ['D5', 1],                ['C#5', 3],
        ],
      },
      a2: {
        arp: 'quarter', cello: true,
        chords: [['Dm', 2], ['Bb', 2], ['Gm', 2], ['A', 1], ['Dm', 1]],
        melody: [
          ['A4', 1], ['D5', 1], ['E5', 1],     ['F5', 1], ['G5', 1], ['A5', 1],
          ['F5', 2], ['D5', 1],                ['Bb4', 1], ['C5', 1], ['D5', 1],
          ['G5', 2], ['D5', 1],                ['Bb4', 2], ['A4', 1],
          ['E5', 1.5], ['D5', 0.5], ['C#5', 1], ['D5', 3],
        ],
      },
      b: {
        arp: 'eighth',
        chords: [['F', 1], ['C', 1], ['Dm', 1], ['Bb', 1], ['Gm', 1], ['C', 1], ['Bb', 1], ['A', 1]],
        melody: [
          ['C5', 1], ['F5', 1], ['A5', 1],     ['G5', 2], ['E5', 1],
          ['F5', 2], ['D5', 1],                ['Bb4', 1.5], ['C5', 0.5], ['D5', 1],
          ['G5', 1.5], ['F5', 0.5], ['D5', 1], ['E5', 2], ['C5', 1],
          ['D5', 3],                           ['C#5', 2], ['E5', 1],
        ],
      },
      rest: {
        arp: 'root', toll: true,
        chords: [['Dm', 2], ['Bb', 1], ['A', 1]],
        bells: [
          ['r', 1], ['D6', 1], ['A5', 1],      ['F5', 3],
          ['r', 1], ['F5', 1], ['D5', 1],      ['C#5', 3],
        ],
      },
    },
    form: ['a', 'a2', 'b', 'rest'],
  },

  _midi(name) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(name);
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    return base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  },

  _hz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  // Turn the score into per-eighth-note event lists, once.
  _compileTheme() {
    const th = this._theme;
    const beat = 60 / th.bpm;
    const hz = (n) => this._hz(n);
    const sections = {};
    Object.keys(th.sections).forEach((name) => {
      const s = th.sections[name];
      const bars = s.chords.reduce((n, c) => n + c[1], 0);
      const ev = Array.from({ length: bars * 6 }, () => []);
      let bar = 0;
      s.chords.forEach(([cn, len]) => {
        const c = th.chords[cn];
        const root = this._midi(c.bass);
        ev[bar * 6].push({ k: 'pad', f: c.pad.map((n) => hz(this._midi(n))), d: len * 3 * beat + 0.4 });
        for (let b = 0; b < len; b++) {
          const s0 = (bar + b) * 6;
          if (s.arp === 'root') {
            if (b === 0) ev[s0].push({ k: 'pno', f: hz(root), d: len * 3 * beat, v: 0.7 });
          } else if (s.arp === 'quarter') {
            [0, 7, 12 + c.third].forEach((iv, i) =>
              ev[s0 + i * 2].push({ k: 'pno', f: hz(root + iv), d: 2.5 * beat, v: i ? 0.4 : 0.65 }));
          } else {
            [0, 7, 12, 12 + c.third, 12, 7].forEach((iv, i) =>
              ev[s0 + i].push({ k: 'pno', f: hz(root + iv), d: 2 * beat, v: i ? 0.32 : 0.6 }));
          }
        }
        bar += len;
      });
      const line = (notes, k) => {
        let pos = 0;
        notes.forEach(([n, beats]) => {
          if (n !== 'r') ev[Math.round(pos * 2)].push({ k, f: hz(this._midi(n)), d: beats * beat });
          pos += beats;
        });
      };
      if (s.melody) line(s.melody, 'mel');
      if (s.bells) line(s.bells, 'bell');
      if (s.toll) ev[0].push({ k: 'toll', f: hz(this._midi('D3')) });
      sections[name] = { steps: bars * 6, ev, cello: !!s.cello };
    });
    return { step: beat / 2, sections, form: th.form };
  },

  // Shared music nodes for this AudioContext: swell bus, stone-hall reverb,
  // a piano-like waveform and a noise buffer.
  _musicSetup() {
    const ctx = this.ctx;
    if (this._mx && this._mx.ctx === ctx) return;
    const rate = ctx.sampleRate;

    this.musicGain = ctx.createGain();
    this.musicGain.connect(this.master);

    // reverb: ~3s of decaying stereo noise after a short pre-delay, darkened
    const len = Math.floor(rate * 3.6);
    const pre = Math.floor(rate * 0.03);
    const ir = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = pre; i < len; i++) {
        const x = (i - pre) / (len - pre);
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, 2.2) * Math.exp(-3 * x);
      }
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    const dark = ctx.createBiquadFilter();
    dark.type = 'lowpass';
    dark.frequency.value = 3000;
    dark.Q.value = 0;
    verb.connect(dark);
    dark.connect(this.musicGain);

    const amps = [0, 1, 0.45, 0.22, 0.12, 0.07, 0.04, 0.025, 0.015];
    const piano = ctx.createPeriodicWave(new Float32Array(amps.length), Float32Array.from(amps));

    const noise = ctx.createBuffer(1, Math.floor(rate * 3), rate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    this._mx = { ctx, verb, piano, noise };
  },

  startMusic() {
    this._ensure();
    if (!this.ctx) return;
    if (this.music && this.music.timer) return; // already playing
    this._musicBegin();
    const ahead = () => this._musicScheduleUntil(this.ctx.currentTime + 0.6);
    ahead();
    this.music.timer = setInterval(ahead, 150);
  },

  stopMusic() {
    const m = this.music;
    if (!m) return;
    if (m.timer) clearInterval(m.timer);
    this.music = null;
    // fade this run out; the reverb tail rings off on its own
    const t = this.ctx.currentTime;
    m.out.gain.cancelScheduledValues(t);
    m.out.gain.setTargetAtTime(0, t, 0.3);
    m.send.gain.cancelScheduledValues(t);
    m.send.gain.setTargetAtTime(0, t, 0.3);
    m.nodes.forEach((n) => { try { n.stop(t + 2.5); } catch (e) { /* already stopped */ } });
    setTimeout(() => { m.out.disconnect(); m.send.disconnect(); }, 3000);
  },

  // Set up one playthrough: its own dry/reverb sends (so stopping can fade it
  // without touching the next run), per-instrument mix buses and the drone.
  _musicBegin() {
    this._musicSetup();
    if (!this._song) this._song = this._compileTheme();
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(0.8, t);

    const out = ctx.createGain();
    const send = ctx.createGain();
    [out, send].forEach((g) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 2.5); // soft fade-in
    });
    out.connect(this.musicGain);
    send.connect(this._mx.verb);
    const bus = (dry, wet) => {
      const g = ctx.createGain();
      const d = ctx.createGain();
      const w = ctx.createGain();
      d.gain.value = dry;
      w.gain.value = wet;
      g.connect(d);
      d.connect(out);
      g.connect(w);
      w.connect(send);
      return g;
    };
    this.music = {
      timer: null, out, send, nodes: [],
      bus: {
        piano: bus(0.85, 0.4), strings: bus(0.75, 0.5), bell: bus(0.45, 0.8),
        amb: bus(0.2, 0.9), drone: bus(0.9, 0.15),
      },
      sec: 'intro', formIdx: -1, pos: 0, loop: 0, nextTime: t + 0.1,
    };
    this._mDrone(t);
  },

  _musicScheduleUntil(end) {
    const m = this.music;
    if (!m) return;
    const now = this.ctx.currentTime;
    while (m.nextTime < end) {
      // skip (don't cram in) steps we fell behind on, e.g. in a background tab
      if (m.nextTime > now - 0.05 && !this._muted) this._musicStep(m.nextTime);
      m.nextTime += this._song.step;
      if (++m.pos >= this._song.sections[m.sec].steps) {
        m.pos = 0;
        m.formIdx = (m.formIdx + 1) % this._song.form.length;
        if (m.formIdx === 0 && m.sec !== 'intro') m.loop++;
        m.sec = this._song.form[m.formIdx];
      }
    }
  },

  _musicStep(t) {
    const m = this.music;
    const sec = this._song.sections[m.sec];
    const cello = sec.cello && m.loop % 2 === 1;
    sec.ev[m.pos].forEach((e) => {
      if (e.k === 'pad') this._mStrings(t, e.f, e.d);
      else if (e.k === 'pno') this._mPiano(t, e.f, e.d, e.v);
      else if (e.k === 'mel') cello ? this._mCello(t, e.f / 2, e.d) : this._mPiano(t, e.f, e.d, 1);
      else if (e.k === 'bell') this._mBell(t, e.f);
      else if (e.k === 'toll') this._mToll(t, e.f);
    });
    // prison ambience: the odd water drip, and now and then a far-off clank
    if (Math.random() < 0.045) this._mDrip(t + Math.random() * this._song.step);
    if (m.pos % 6 === 0 && Math.random() < 0.06) this._mClank(t + Math.random() * 1.2);
  },

  // near = 0 (far) .. 1 (Spook right behind you): only a gentle swell, it stays calm
  setMusicIntensity(near) {
    if (!this.musicGain || !this.ctx) return;
    const target = 0.8 + Math.max(0, Math.min(1, near)) * 0.4; // 0.8 -> 1.2
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  },

  _mPan(node, pan) {
    if (!this.ctx.createStereoPanner) return node;
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    node.connect(p);
    return p;
  },

  // soft felt piano: two slightly detuned strings, brightness fading after the hammer
  _mPiano(t, f, dur, vel) {
    const ctx = this.ctx;
    t = Math.max(ctx.currentTime, t + (Math.random() - 0.5) * 0.014);
    const peak = 0.05 * vel;
    const ring = Math.min(2.4, Math.max(0.6, 1.5 * Math.sqrt(262 / f))); // low notes ring longer
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.006);
    g.gain.setTargetAtTime(peak * 0.4, t + 0.006, 0.09);
    g.gain.setTargetAtTime(0, t + 0.25, ring);
    g.gain.setTargetAtTime(0, t + dur, 0.35);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0;
    lp.frequency.setValueAtTime(Math.min(6500, f * 8), t);
    lp.frequency.setTargetAtTime(Math.max(380, f * 2.2), t + 0.01, 0.5);
    [-3, 3].forEach((cents) => {
      const o = ctx.createOscillator();
      o.setPeriodicWave(this._mx.piano);
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 2);
    });
    lp.connect(g);
    g.connect(this.music.bus.piano);
  },

  // slow-swelling string chord with a gentle shared vibrato
  _mStrings(t, freqs, dur) {
    const ctx = this.ctx;
    const vol = 0.012;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 1.3);
    g.gain.setTargetAtTime(0, t + dur, 0.7);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0;
    lp.frequency.value = 1000;
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.6;
    const depth = ctx.createGain();
    depth.gain.value = 5; // cents
    vib.connect(depth);
    freqs.forEach((f) => [-7, 7].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = cents + (Math.random() - 0.5) * 4;
      depth.connect(o.detune);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 4);
    }));
    vib.start(t);
    vib.stop(t + dur + 4);
    lp.connect(g);
    g.connect(this.music.bus.strings);
  },

  // bowed solo cello for the melody on alternate passes; vibrato blooms in
  _mCello(t, f, dur) {
    const ctx = this.ctx;
    const vol = 0.032;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.2);
    g.gain.setTargetAtTime(vol * 0.75, t + 0.2, 0.6);
    g.gain.setTargetAtTime(0, t + dur - 0.05, 0.22);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0;
    lp.frequency.value = Math.min(2200, f * 5);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(9, t + 0.6);
    vib.connect(depth);
    [-4, 4].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = cents;
      depth.connect(o.detune);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 1.5);
    });
    vib.start(t);
    vib.stop(t + dur + 1.5);
    lp.connect(g);
    g.connect(this.music.bus.strings);
  },

  // music-box / celesta glint
  _mBell(t, f) {
    const ctx = this.ctx;
    [[1, 0.035, 0.6], [4, 0.009, 0.12]].forEach(([ratio, vol, tau]) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.004, tau);
      o.connect(g);
      g.connect(this.music.bus.bell);
      o.start(t);
      o.stop(t + tau * 8);
    });
  },

  // a distant prison bell: inharmonic bell partials (hum, prime, minor third, ...)
  _mToll(t, f) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0;
    lp.frequency.value = 1500;
    lp.connect(this.music.bus.amb);
    [[0.5, 0.3, 3.0], [1, 0.4, 2.2], [1.19, 0.32, 1.8], [1.5, 0.16, 1.2],
      [2, 0.34, 1.4], [2.52, 0.1, 0.7], [3, 0.06, 0.5]].forEach(([ratio, vol, tau]) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * 0.14, t + 0.01);
      g.gain.setTargetAtTime(0, t + 0.01, tau);
      o.connect(g);
      g.connect(lp);
      o.start(t);
      o.stop(t + tau * 7);
    });
  },

  // a water drop: a tiny upward-gliding "plink", panned somewhere in the dark
  _mDrip(t) {
    const ctx = this.ctx;
    const f = 900 + Math.random() * 900;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.01, t + 0.003);
    g.gain.setTargetAtTime(0, t + 0.004, 0.035);
    o.connect(g);
    this._mPan(g, Math.random() * 1.6 - 0.8).connect(this.music.bus.amb);
    o.start(t);
    o.stop(t + 0.3);
  },

  // a far-off metal door or chain: struck-bar partials plus a short scrape of noise
  _mClank(t) {
    const ctx = this.ctx;
    const base = 150 + Math.random() * 90;
    const out = ctx.createGain();
    out.gain.value = 0.02;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0;
    lp.frequency.value = 2400;
    out.connect(lp);
    this._mPan(lp, Math.random() * 1.4 - 0.7).connect(this.music.bus.amb);
    const hit = (when, amt) => {
      [[1, 0.5, 0.9], [2.76, 0.35, 0.5], [5.4, 0.2, 0.28], [8.93, 0.12, 0.16]].forEach(([ratio, vol, tau]) => {
        const o = ctx.createOscillator();
        o.frequency.value = base * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(vol * amt, when + 0.002);
        g.gain.setTargetAtTime(0, when + 0.003, tau);
        o.connect(g);
        g.connect(out);
        o.start(when);
        o.stop(when + tau * 7);
      });
      const n = ctx.createBufferSource();
      n.buffer = this._mx.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800;
      bp.Q.value = 1.2;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.6 * amt, when);
      ng.gain.setTargetAtTime(0, when, 0.025);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(out);
      n.start(when, Math.random() * 2);
      n.stop(when + 0.2);
    };
    hit(t, 1);
    if (Math.random() < 0.6) hit(t + 0.16 + Math.random() * 0.1, 0.55); // the latch settling
  },

  // low D drone that slowly breathes, plus cold air drifting through the corridors
  _mDrone(t) {
    const ctx = this.ctx;
    const m = this.music;
    const g = ctx.createGain();
    g.gain.value = 1;
    const breath = ctx.createOscillator();
    breath.frequency.value = 0.07;
    const breathAmt = ctx.createGain();
    breathAmt.gain.value = 0.35;
    breath.connect(breathAmt);
    breathAmt.connect(g.gain);
    [[73.42, 0, 0.016], [73.42, 6, 0.012], [110, -3, 0.006]].forEach(([f, cents, vol]) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.detune.value = cents;
      const og = ctx.createGain();
      og.gain.value = vol;
      o.connect(og);
      og.connect(g);
      o.start(t);
      m.nodes.push(o);
    });
    g.connect(m.bus.drone);

    const air = ctx.createBufferSource();
    air.buffer = this._mx.noise;
    air.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 380;
    bp.Q.value = 0.8;
    const sweep = ctx.createOscillator();
    sweep.frequency.value = 0.045;
    const sweepAmt = ctx.createGain();
    sweepAmt.gain.value = 220;
    sweep.connect(sweepAmt);
    sweepAmt.connect(bp.frequency);
    const ag = ctx.createGain();
    ag.gain.value = 0.012;
    air.connect(bp);
    bp.connect(ag);
    ag.connect(m.bus.amb);
    [breath, air, sweep].forEach((n) => { n.start(t); m.nodes.push(n); });
  },
};
