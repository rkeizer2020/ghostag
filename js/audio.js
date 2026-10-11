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

  // ---- Background music ----
  // Four calm, Hollow Knight-flavoured themes with original melodies, fully
  // synthesised (no audio files):
  //  - prison  "Cell Block Lullaby": felt piano over slow strings (cello on every
  //            second pass), a distant bell, water drips and far-off clanks.
  //  - sewer   "Drain Tunnels": bouncing pizzicato, a reedy clarinet tune (bubbly
  //            marimba on every second pass), flowing water, bubbles and echoes.
  //  - factory "Cogwork Hall": a ticking celesta ostinato over a slow machine
  //            pulse, a viola tune (muted horn on every second pass), steam and a
  //            far-off hammer.
  //  - freezetown "Snowlight Waltz": a cosy winter waltz; music-box tune (flute
  //            on every second pass), sleigh bells, wind chimes, a soft choir, a
  //            church bell, snowy wind and a crackling fireplace.
  // Notes are scheduled a little ahead on the audio clock so timing stays steady.
  music: null,
  musicGain: null,
  _mx: null,    // per-AudioContext cache: music bus, reverb, piano wave, noise
  _songs: {},   // compiled scores, per theme

  // Score format. chords: name -> string-pad voicing + bass note (third = semitones
  // above the root). Sections list chords as [name, bars]; melody/counter lines as
  // [note, beats] ('r' = rest). layers are accompaniment patterns: [eighth-step,
  // degree (r/t/f = root/third/fifth, null = unpitched), octave, velocity], played
  // every bar, or once per chord when chord: true. mel picks the melody instrument
  // (+ octave shift); sections with alt: true rotate through it on each pass.
  _themes: {
    prison: {
      bpm: 66, meter: 3, wet: 1, amb: 'prison', bed: 'air',
      drone: [[73.42, 0, 0.016], [73.42, 6, 0.012], [110, -3, 0.006]],
      pad: { vol: 0.012, cutoff: 1000 },
      mel: [['piano', 0], ['cello', -1]],
      counter: 'bell',
      patterns: {
        root:    { inst: 'piano', chord: true, notes: [[0, 'r', 0, 0.7]] },
        quarter: { inst: 'piano', beats: 2.5, notes: [[0, 'r', 0, 0.65], [2, 'f', 0, 0.4], [4, 't', 1, 0.4]] },
        eighth:  {
          inst: 'piano', beats: 2,
          notes: [[0, 'r', 0, 0.6], [1, 'f', 0, 0.32], [2, 'r', 1, 0.32], [3, 't', 1, 0.32], [4, 'r', 1, 0.32], [5, 'f', 0, 0.32]],
        },
      },
      chords: {
        Dm:   { pad: ['A3', 'D4', 'F4'],  bass: 'D3',  third: 3 },
        Bb:   { pad: ['Bb3', 'D4', 'F4'], bass: 'Bb2', third: 4 },
        Gm:   { pad: ['G3', 'Bb3', 'D4'], bass: 'G2',  third: 3 },
        A:    { pad: ['A3', 'C#4', 'E4'], bass: 'A2',  third: 4 },
        Asus: { pad: ['A3', 'D4', 'E4'],  bass: 'A2',  third: 5 },
        F:    { pad: ['A3', 'C4', 'F4'],  bass: 'F2',  third: 4 },
        C:    { pad: ['G3', 'C4', 'E4'],  bass: 'C3',  third: 4 },
      },
      sections: {
        intro: { layers: ['root'], hits: [[0, 'toll', 'D3']], chords: [['Dm', 2], ['Gm', 1], ['Asus', 1]] },
        a: {
          layers: ['quarter'], alt: true,
          chords: [['Dm', 2], ['Bb', 2], ['Gm', 2], ['Asus', 1], ['A', 1]],
          melody: [
            ['A4', 1], ['D5', 1], ['E5', 1],     ['F5', 2], ['E5', 1],
            ['D5', 1.5], ['C5', 0.5], ['Bb4', 1], ['F4', 3],
            ['G4', 1], ['Bb4', 1], ['D5', 1],    ['G5', 2], ['F5', 1],
            ['E5', 2], ['D5', 1],                ['C#5', 3],
          ],
        },
        a2: {
          layers: ['quarter'], alt: true,
          chords: [['Dm', 2], ['Bb', 2], ['Gm', 2], ['A', 1], ['Dm', 1]],
          melody: [
            ['A4', 1], ['D5', 1], ['E5', 1],     ['F5', 1], ['G5', 1], ['A5', 1],
            ['F5', 2], ['D5', 1],                ['Bb4', 1], ['C5', 1], ['D5', 1],
            ['G5', 2], ['D5', 1],                ['Bb4', 2], ['A4', 1],
            ['E5', 1.5], ['D5', 0.5], ['C#5', 1], ['D5', 3],
          ],
        },
        b: {
          layers: ['eighth'],
          chords: [['F', 1], ['C', 1], ['Dm', 1], ['Bb', 1], ['Gm', 1], ['C', 1], ['Bb', 1], ['A', 1]],
          melody: [
            ['C5', 1], ['F5', 1], ['A5', 1],     ['G5', 2], ['E5', 1],
            ['F5', 2], ['D5', 1],                ['Bb4', 1.5], ['C5', 0.5], ['D5', 1],
            ['G5', 1.5], ['F5', 0.5], ['D5', 1], ['E5', 2], ['C5', 1],
            ['D5', 3],                           ['C#5', 2], ['E5', 1],
          ],
        },
        rest: {
          layers: ['root'], hits: [[0, 'toll', 'D3']],
          chords: [['Dm', 2], ['Bb', 1], ['A', 1]],
          counter: [
            ['r', 1], ['D6', 1], ['A5', 1],      ['F5', 3],
            ['r', 1], ['F5', 1], ['D5', 1],      ['C#5', 3],
          ],
        },
      },
      form: ['a', 'a2', 'b', 'rest'],
    },

    sewer: {
      bpm: 84, meter: 4, wet: 1.2, amb: 'sewer', bed: 'water',
      echo: { time: 0.42, fb: 0.38, amb: 0.6, bell: 0.35, keys: 0.12 },
      drone: [[82.41, 0, 0.012], [82.41, 7, 0.009], [123.47, -4, 0.005]],
      pad: { vol: 0.011, cutoff: 750, wobble: 0.18, depth: 300 },
      mel: [['reed', 0], ['marimba', 0]],
      counter: 'marimba',
      patterns: {
        bounce: {
          inst: 'pizz', beats: 0.5,
          notes: [[0, 'r', 0, 0.75], [2, 'f', 0, 0.45], [4, 'r', 1, 0.5], [6, 'f', 0, 0.45], [7, 't', 0, 0.3]],
        },
        root: { inst: 'pizz', chord: true, notes: [[0, 'r', 0, 0.7], [4, 'f', 0, 0.35]] },
      },
      chords: {
        Em: { pad: ['G3', 'B3', 'E4'],   bass: 'E2', third: 3 },
        A:  { pad: ['A3', 'C#4', 'E4'],  bass: 'A2', third: 4 },
        C:  { pad: ['G3', 'C4', 'E4'],   bass: 'C3', third: 4 },
        D:  { pad: ['F#3', 'A3', 'D4'],  bass: 'D3', third: 4 },
        Bm: { pad: ['F#3', 'B3', 'D4'],  bass: 'B2', third: 3 },
        G:  { pad: ['G3', 'B3', 'D4'],   bass: 'G2', third: 4 },
        Am: { pad: ['A3', 'C4', 'E4'],   bass: 'A2', third: 3 },
        B7: { pad: ['A3', 'D#4', 'F#4'], bass: 'B2', third: 4 },
      },
      sections: {
        intro: { layers: ['bounce'], chords: [['Em', 2], ['A', 2]] },
        a: {
          layers: ['bounce'], alt: true,
          chords: [['Em', 1], ['A', 1], ['Em', 1], ['A', 1], ['C', 1], ['D', 1], ['Bm', 1], ['B7', 1]],
          melody: [
            ['r', 0.5], ['B4', 0.5], ['E5', 0.5], ['F#5', 0.5], ['G5', 1], ['F#5', 1],
            ['E5', 1.5], ['C#5', 0.5], ['A4', 2],
            ['r', 0.5], ['B4', 0.5], ['E5', 0.5], ['F#5', 0.5], ['G5', 1], ['A5', 1],
            ['F#5', 1], ['E5', 1], ['C#5', 2],
            ['E5', 1], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
            ['D5', 1], ['F#5', 1], ['A5', 2],
            ['F#5', 1.5], ['E5', 0.5], ['D5', 1], ['B4', 1],
            ['F#5', 1], ['D#5', 1], ['B4', 2],
          ],
        },
        a2: {
          layers: ['bounce'], alt: true,
          chords: [['Em', 1], ['A', 1], ['Em', 1], ['A', 1], ['C', 1], ['D', 1], ['B7', 1], ['Em', 1]],
          melody: [
            ['r', 0.5], ['B4', 0.5], ['E5', 0.5], ['F#5', 0.5], ['G5', 1], ['F#5', 1],
            ['E5', 1.5], ['C#5', 0.5], ['A4', 2],
            ['r', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['B5', 1], ['A5', 1],
            ['G5', 1], ['F#5', 1], ['E5', 2],
            ['C5', 1], ['E5', 1], ['G5', 1], ['E5', 1],
            ['F#5', 1], ['A5', 1], ['F#5', 0.5], ['E5', 0.5], ['D5', 1],
            ['B4', 1], ['D#5', 1], ['F#5', 1], ['A5', 1],
            ['G5', 1], ['E5', 3],
          ],
        },
        b: {
          layers: ['bounce'],
          chords: [['C', 1], ['G', 1], ['D', 1], ['Em', 1], ['C', 1], ['G', 1], ['Am', 1], ['B7', 1]],
          melody: [
            ['G5', 2], ['E5', 1], ['C5', 1],
            ['D5', 2], ['B4', 2],
            ['A4', 1], ['D5', 1], ['F#5', 2],
            ['E5', 3], ['r', 1],
            ['G5', 1], ['A5', 1], ['G5', 1], ['E5', 1],
            ['D5', 2], ['G5', 2],
            ['E5', 1], ['C5', 1], ['A4', 1], ['C5', 1],
            ['B4', 2], ['D#5', 2],
          ],
        },
        rest: {
          layers: ['root'],
          chords: [['Em', 2], ['C', 1], ['B7', 1]],
          counter: [
            ['r', 1], ['B5', 0.5], ['G5', 0.5], ['E5', 2],
            ['r', 2], ['F#5', 0.5], ['E5', 0.5], ['B4', 1],
            ['r', 1], ['G5', 1], ['E5', 2],
            ['F#5', 2], ['D#5', 2],
          ],
        },
      },
      form: ['a', 'a2', 'b', 'rest'],
    },

    factory: {
      bpm: 76, meter: 4, wet: 0.9, amb: 'factory', bed: 'machine',
      drone: [[65.41, 0, 0.012], [65.41, 5, 0.009], [98, -3, 0.005]],
      pad: { vol: 0.01, cutoff: 900, trem: 6.5 },
      mel: [['cello', 0], ['horn', -1]],
      counter: 'celesta',
      patterns: {
        gears: {
          inst: 'celesta', beats: 1,
          notes: [[0, 'r', 1, 0.5], [1, 'f', 1, 0.3], [2, 't', 2, 0.35], [3, 'f', 1, 0.3],
            [4, 'r', 1, 0.45], [5, 'f', 1, 0.3], [6, 't', 2, 0.35], [7, 'f', 1, 0.3]],
        },
        low: { inst: 'horn', chord: true, notes: [[0, 'r', 0, 0.55]] },
        pulse: { inst: 'thump', notes: [[0, null, 0, 1], [4, null, 0, 0.6]] },
        tick: { inst: 'tick', notes: [[2, null, 0, 0.6], [6, null, 0, 0.6], [7, null, 0, 0.3]] },
      },
      chords: {
        Cm:   { pad: ['G3', 'C4', 'Eb4'],  bass: 'C3',  third: 3 },
        Ab:   { pad: ['Ab3', 'C4', 'Eb4'], bass: 'Ab2', third: 4 },
        Fm:   { pad: ['F3', 'Ab3', 'C4'],  bass: 'F2',  third: 3 },
        G:    { pad: ['G3', 'B3', 'D4'],   bass: 'G2',  third: 4 },
        Gsus: { pad: ['G3', 'C4', 'D4'],   bass: 'G2',  third: 5 },
        Eb:   { pad: ['G3', 'Bb3', 'Eb4'], bass: 'Eb3', third: 4 },
        Bb:   { pad: ['F3', 'Bb3', 'D4'],  bass: 'Bb2', third: 4 },
      },
      sections: {
        intro: { layers: ['pulse', 'gears', 'low'], chords: [['Cm', 2]] },
        a: {
          layers: ['pulse', 'tick', 'gears', 'low'], alt: true,
          chords: [['Cm', 1], ['Ab', 1], ['Fm', 1], ['G', 1], ['Cm', 1], ['Ab', 1], ['Fm', 1], ['G', 1]],
          melody: [
            ['G4', 2], ['C5', 1], ['D5', 1],     ['Eb5', 3], ['D5', 1],
            ['C5', 2], ['Ab4', 2],               ['D5', 2], ['B4', 2],
            ['C5', 2], ['Eb5', 1], ['G5', 1],    ['Ab5', 2], ['G5', 1], ['Eb5', 1],
            ['F5', 2], ['C5', 1], ['Ab4', 1],    ['G4', 1], ['B4', 1], ['D5', 2],
          ],
        },
        a2: {
          layers: ['pulse', 'tick', 'gears', 'low'], alt: true,
          chords: [['Cm', 1], ['Ab', 1], ['Fm', 1], ['G', 1], ['Cm', 1], ['Ab', 1], ['G', 1], ['Cm', 1]],
          melody: [
            ['G4', 2], ['C5', 1], ['D5', 1],     ['Eb5', 2], ['F5', 1], ['Eb5', 1],
            ['Ab5', 2], ['G5', 1], ['F5', 1],    ['G5', 2], ['D5', 2],
            ['Eb5', 2], ['D5', 1], ['C5', 1],    ['C5', 2], ['Eb5', 2],
            ['D5', 2], ['B4', 2],                ['C5', 4],
          ],
        },
        b: {
          layers: ['pulse', 'tick', 'gears', 'low'],
          chords: [['Eb', 1], ['Bb', 1], ['Cm', 1], ['Ab', 1], ['Fm', 1], ['Bb', 1], ['Gsus', 1], ['G', 1]],
          melody: [
            ['Bb4', 2], ['Eb5', 2],              ['D5', 2], ['F5', 2],
            ['G5', 3], ['Eb5', 1],               ['Eb5', 2], ['C5', 2],
            ['F5', 2], ['Ab5', 2],               ['F5', 2], ['D5', 2],
            ['C5', 2], ['D5', 2],                ['B4', 4],
          ],
        },
        rest: {
          layers: ['pulse', 'low'], hits: [[0, 'whistle', 'C5']],
          chords: [['Cm', 1], ['Ab', 1], ['Fm', 1], ['G', 1]],
          counter: [
            ['r', 1], ['C6', 1], ['G5', 1], ['Eb5', 1],
            ['r', 1], ['C6', 1], ['Ab5', 1], ['Eb5', 1],
            ['r', 1], ['C6', 1], ['Ab5', 1], ['F5', 1],
            ['r', 1], ['B5', 1], ['G5', 1], ['D5', 1],
          ],
        },
      },
      form: ['a', 'a2', 'b', 'rest'],
    },

    freezetown: {
      bpm: 72, meter: 3, wet: 1.1, amb: 'freezetown', bed: 'wind',
      drone: [[98, 0, 0.008], [98, 5, 0.006], [146.83, -3, 0.004]],
      pad: { vol: 0.011, cutoff: 1100 },
      mel: [['musicbox', 0], ['flute', 0]],
      counter: 'musicbox',
      patterns: {
        root:   { inst: 'piano', chord: true, notes: [[0, 'r', 0, 0.6]] },
        waltz:  { inst: 'piano', beats: 1.5, notes: [[0, 'r', 0, 0.55], [2, 't', 1, 0.28], [4, 'f', 1, 0.28]] },
        jingle: { inst: 'sleigh', notes: [[0, null, 0, 0.8], [2, null, 0, 0.4], [4, null, 0, 0.4], [5, null, 0, 0.25]] },
      },
      chords: {
        G:  { pad: ['G3', 'B3', 'D4'],   bass: 'G2', third: 4 },
        Em: { pad: ['G3', 'B3', 'E4'],   bass: 'E2', third: 3 },
        C:  { pad: ['G3', 'C4', 'E4'],   bass: 'C3', third: 4 },
        Cm: { pad: ['G3', 'C4', 'Eb4'],  bass: 'C3', third: 3 },
        D:  { pad: ['F#3', 'A3', 'D4'],  bass: 'D3', third: 4 },
        Am: { pad: ['A3', 'C4', 'E4'],   bass: 'A2', third: 3 },
        Bm: { pad: ['F#3', 'B3', 'D4'],  bass: 'B2', third: 3 },
        B7: { pad: ['A3', 'D#4', 'F#4'], bass: 'B2', third: 4 },
      },
      sections: {
        intro: {
          layers: ['root'], hits: [[0, 'chimes', 'G5'], [0, 'toll', 'G3']],
          chords: [['G', 2], ['C', 1], ['Cm', 1]],
        },
        a: {
          layers: ['waltz'], alt: true,
          chords: [['G', 1], ['Em', 1], ['C', 1], ['D', 1], ['G', 1], ['Em', 1], ['Am', 1], ['D', 1]],
          melody: [
            ['B4', 1], ['D5', 1], ['G5', 1],     ['F#5', 1.5], ['E5', 0.5], ['B4', 1],
            ['C5', 1], ['E5', 1], ['G5', 1],     ['F#5', 2], ['D5', 1],
            ['B4', 1], ['D5', 1], ['G5', 1],     ['B5', 1.5], ['A5', 0.5], ['G5', 1],
            ['E5', 1.5], ['D5', 0.5], ['C5', 1], ['A4', 3],
          ],
        },
        a2: {
          layers: ['waltz', 'jingle'], alt: true,
          chords: [['G', 1], ['Em', 1], ['C', 1], ['Cm', 1], ['G', 1], ['Am', 1], ['D', 1], ['G', 1]],
          melody: [
            ['B4', 1], ['D5', 1], ['G5', 1],     ['F#5', 1.5], ['E5', 0.5], ['B4', 1],
            ['C5', 1], ['E5', 1], ['G5', 1],     ['G5', 1], ['Eb5', 1], ['C5', 1],
            ['D5', 2], ['B4', 1],                ['C5', 1], ['E5', 1], ['A5', 1],
            ['F#5', 1.5], ['E5', 0.5], ['F#5', 1], ['G5', 3],
          ],
        },
        b: {
          layers: ['waltz', 'jingle'], choir: true,
          chords: [['Em', 1], ['Bm', 1], ['C', 1], ['G', 1], ['Am', 1], ['B7', 1], ['Em', 1], ['D', 1]],
          melody: [
            ['E5', 2], ['G5', 1],                ['F#5', 2], ['D5', 1],
            ['E5', 1.5], ['D5', 0.5], ['C5', 1], ['B4', 2], ['D5', 1],
            ['C5', 1], ['E5', 1], ['A5', 1],     ['A5', 1.5], ['F#5', 0.5], ['D#5', 1],
            ['E5', 3],                           ['F#5', 1], ['E5', 1], ['D5', 1],
          ],
        },
        rest: {
          layers: ['root', 'jingle'], choir: true, hits: [[0, 'chimes', 'G5'], [0, 'toll', 'G3']],
          chords: [['C', 1], ['Cm', 1], ['G', 1], ['D', 1]],
          counter: [
            ['r', 1], ['E6', 1], ['C6', 1],      ['r', 1], ['Eb6', 1], ['C6', 1],
            ['B5', 1], ['G5', 1], ['D5', 1],     ['A5', 2], ['F#5', 1],
          ],
        },
      },
      form: ['a', 'a2', 'b', 'rest'],
    },
  },

  _midi(name) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(name);
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    return base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  },

  _hz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  // Turn a theme's score into per-eighth-note event lists, once.
  _compileTheme(key) {
    const th = this._themes[key];
    const beat = 60 / th.bpm;
    const spb = th.meter * 2; // eighth-note steps per bar
    const hz = (n) => this._hz(this._midi(n));
    const sections = {};
    Object.keys(th.sections).forEach((name) => {
      const s = th.sections[name];
      const bars = s.chords.reduce((n, c) => n + c[1], 0);
      const ev = Array.from({ length: bars * spb }, () => []);
      const play = (at, p, c, beats) => p.notes.forEach(([step, deg, oct, v]) => {
        const iv = deg === 'r' ? 0 : deg === 't' ? c.third : 7;
        const f = deg ? this._hz(this._midi(c.bass) + iv + oct * 12) : 0;
        ev[at + step].push({ k: 'note', inst: p.inst, f, d: beats * beat, v });
      });
      let bar = 0;
      s.chords.forEach(([cn, len]) => {
        const c = th.chords[cn];
        ev[bar * spb].push({ k: 'pad', f: c.pad.map(hz), d: len * th.meter * beat + 0.4 });
        if (s.choir) ev[bar * spb].push({ k: 'choir', f: c.pad.map(hz), d: len * th.meter * beat + 0.4 });
        (s.layers || []).forEach((pn) => {
          const p = th.patterns[pn];
          if (p.chord) play(bar * spb, p, c, p.beats || len * th.meter);
          else for (let b = 0; b < len; b++) play((bar + b) * spb, p, c, p.beats || 1);
        });
        bar += len;
      });
      const line = (notes, k) => {
        let pos = 0;
        notes.forEach(([n, beats]) => {
          if (n !== 'r') ev[Math.round(pos * 2)].push({ k, f: hz(n), d: beats * beat });
          pos += beats;
        });
      };
      if (s.melody) line(s.melody, 'mel');
      if (s.counter) line(s.counter, 'ctr');
      (s.hits || []).forEach(([step, inst, n]) => ev[step].push({ k: 'note', inst, f: hz(n), d: 0, v: 1 }));
      sections[name] = { steps: bars * spb, ev, alt: !!s.alt };
    });
    return { step: beat / 2, spb, sections };
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

  // theme: 'prison' (default), 'sewer', 'factory' or 'freezetown'
  startMusic(theme) {
    this._ensure();
    if (!this.ctx) return;
    const key = this._themes[theme] ? theme : 'prison';
    if (this.music) {
      if (this.music.key === key) return; // already playing
      this.stopMusic();
    }
    this._musicBegin(key);
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
    setTimeout(() => m.links.forEach((n) => n.disconnect()), 3000);
  },

  // Set up one playthrough: its own dry/reverb sends (so stopping can fade it
  // without touching the next run), per-instrument mix buses, the drone and the
  // theme's background bed.
  _musicBegin(key) {
    this._musicSetup();
    if (!this._songs[key]) this._songs[key] = this._compileTheme(key);
    const th = this._themes[key];
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
    const links = [out, send];

    // optional tunnel echo: a darkened feedback delay
    let echo = null;
    if (th.echo) {
      echo = ctx.createGain();
      const delay = ctx.createDelay(1);
      delay.delayTime.value = th.echo.time;
      const fb = ctx.createGain();
      fb.gain.value = th.echo.fb;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 1800;
      tone.Q.value = 0;
      echo.connect(delay);
      delay.connect(tone);
      tone.connect(fb);
      fb.connect(delay);
      tone.connect(out);
      tone.connect(send);
      links.push(echo, delay, tone, fb);
    }

    const bus = (name, dry, wet) => {
      const g = ctx.createGain();
      const d = ctx.createGain();
      const w = ctx.createGain();
      d.gain.value = dry;
      w.gain.value = wet * th.wet;
      g.connect(d);
      d.connect(out);
      g.connect(w);
      w.connect(send);
      if (echo && th.echo[name]) {
        const e = ctx.createGain();
        e.gain.value = th.echo[name];
        g.connect(e);
        e.connect(echo);
      }
      return g;
    };
    this.music = {
      key, timer: null, out, send, links, nodes: [],
      bus: {
        keys: bus('keys', 0.85, 0.4), strings: bus('strings', 0.75, 0.5), bell: bus('bell', 0.45, 0.8),
        amb: bus('amb', 0.2, 0.9), drone: bus('drone', 0.9, 0.15), perc: bus('perc', 0.6, 0.35),
      },
      sec: 'intro', formIdx: -1, pos: 0, loop: 0, nextTime: t + 0.1,
    };
    this._mDrone(t, th.drone);
    this._beds[th.bed].call(this, t, this.music);
  },

  _musicScheduleUntil(end) {
    const m = this.music;
    if (!m) return;
    const song = this._songs[m.key];
    const form = this._themes[m.key].form;
    const now = this.ctx.currentTime;
    while (m.nextTime < end) {
      // skip (don't cram in) steps we fell behind on, e.g. in a background tab
      if (m.nextTime > now - 0.05 && !this._muted) this._musicStep(m.nextTime);
      m.nextTime += song.step;
      if (++m.pos >= song.sections[m.sec].steps) {
        m.pos = 0;
        m.formIdx = (m.formIdx + 1) % form.length;
        if (m.formIdx === 0 && m.sec !== 'intro') m.loop++;
        m.sec = form[m.formIdx];
      }
    }
  },

  _musicStep(t) {
    const m = this.music;
    const th = this._themes[m.key];
    const sec = this._songs[m.key].sections[m.sec];
    const [melInst, melOct] = th.mel[sec.alt ? m.loop % th.mel.length : 0];
    sec.ev[m.pos].forEach((e) => {
      if (e.k === 'pad') this._mPad(t, e.f, e.d, th.pad);
      else if (e.k === 'choir') this._mChoir(t, e.f, e.d);
      else if (e.k === 'mel') this._inst[melInst].call(this, t, e.f * Math.pow(2, melOct), e.d, 1);
      else if (e.k === 'ctr') this._inst[th.counter].call(this, t, e.f, e.d, 1);
      else this._inst[e.inst].call(this, t, e.f, e.d, e.v);
    });
    this._amb[th.amb].call(this, t, m);
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

  // slow-swelling string chord with a gentle shared vibrato; optionally an
  // underwater filter wobble or a shimmering tremolo
  _mPad(t, freqs, dur, o) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vol, t + 1.3);
    g.gain.setTargetAtTime(0, t + dur, 0.7);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0;
    lp.frequency.value = o.cutoff;
    const lfos = [];
    const lfo = (rate, amount, param) => {
      const l = ctx.createOscillator();
      l.frequency.value = rate;
      const a = ctx.createGain();
      a.gain.value = amount;
      l.connect(a);
      a.connect(param);
      lfos.push(l);
      return a;
    };
    const vib = ctx.createOscillator(); // shared vibrato, in cents
    vib.frequency.value = 4.6;
    const depth = ctx.createGain();
    depth.gain.value = 5;
    vib.connect(depth);
    lfos.push(vib);
    if (o.wobble) lfo(o.wobble, o.depth, lp.frequency);
    let tail = lp;
    if (o.trem) {
      const tr = ctx.createGain();
      tr.gain.value = 0.75;
      lfo(o.trem, 0.25, tr.gain);
      lp.connect(tr);
      tail = tr;
    }
    freqs.forEach((f) => [-7, 7].forEach((cents) => {
      const v = ctx.createOscillator();
      v.type = 'sawtooth';
      v.frequency.value = f;
      v.detune.value = cents + (Math.random() - 0.5) * 4;
      depth.connect(v.detune);
      v.connect(lp);
      v.start(t);
      v.stop(t + dur + 4);
    }));
    lfos.forEach((l) => { l.start(t); l.stop(t + dur + 4); });
    tail.connect(g);
    g.connect(this.music.bus.strings);
  },

  // Instruments, all called as (time, frequency, duration, velocity).
  _inst: {
    // soft felt piano: two slightly detuned strings, brightness fading after the hammer
    piano(t, f, dur, vel) {
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
      g.connect(this.music.bus.keys);
    },

    // bowed cello/viola; vibrato blooms in after the attack
    cello(t, f, dur, vel) {
      const ctx = this.ctx;
      const vol = 0.032 * vel;
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

    // soft clarinet: hollow square tone, a breathy swell and a little vibrato
    reed(t, f, dur, vel) {
      const ctx = this.ctx;
      const vol = 0.016 * vel;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.05);
      g.gain.setTargetAtTime(vol * 0.8, t + 0.05, 0.3);
      g.gain.setTargetAtTime(0, t + dur * 0.92, 0.07);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0;
      lp.frequency.value = Math.min(3200, f * 3.5);
      const vib = ctx.createOscillator();
      vib.frequency.value = 5.5;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(7, t + 0.35);
      vib.connect(depth);
      [['square', 1], ['triangle', 0.5]].forEach(([type, amt]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        depth.connect(o.detune);
        const a = ctx.createGain();
        a.gain.value = amt;
        o.connect(a);
        a.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.6);
      });
      vib.start(t);
      vib.stop(t + dur + 0.6);
      lp.connect(g);
      g.connect(this.music.bus.strings);
    },

    // muted horn: brass-like swell that brightens as it opens up
    horn(t, f, dur, vel) {
      const ctx = this.ctx;
      const vol = 0.026 * vel;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.35);
      g.gain.setTargetAtTime(0, t + dur, 0.4);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0;
      lp.frequency.setValueAtTime(f * 1.2, t);
      lp.frequency.linearRampToValueAtTime(Math.min(2000, f * 3), t + 0.4);
      lp.frequency.setTargetAtTime(Math.min(1500, f * 2.2), t + 0.4, 1);
      [-5, 5].forEach((cents) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = cents;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 2.5);
      });
      lp.connect(g);
      g.connect(this.music.bus.strings);
    },

    // plucked string (pizzicato) with a woody, quickly-closing filter
    pizz(t, f, dur, vel) {
      const ctx = this.ctx;
      t = Math.max(ctx.currentTime, t + (Math.random() - 0.5) * 0.01);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07 * vel, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.005, Math.min(0.3, Math.max(0.08, 0.16 * Math.sqrt(220 / f))));
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 2;
      lp.frequency.setValueAtTime(Math.min(5000, f * 7), t);
      lp.frequency.setTargetAtTime(f * 1.5, t + 0.005, 0.06);
      [['triangle', 0, 1], ['sawtooth', 5, 0.5]].forEach(([type, cents, amt]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = cents;
        const a = ctx.createGain();
        a.gain.value = amt;
        o.connect(a);
        a.connect(lp);
        o.start(t);
        o.stop(t + 1.2);
      });
      lp.connect(g);
      g.connect(this.music.bus.keys);
    },

    // wooden marimba with a watery little pitch "blub" on the attack
    marimba(t, f, dur, vel) {
      const ctx = this.ctx;
      [[1, 0.05, 0.4], [4, 0.012, 0.05]].forEach(([ratio, vol, tau]) => {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(f * ratio * 0.96, t);
        o.frequency.exponentialRampToValueAtTime(f * ratio, t + 0.03);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol * vel, t + 0.003);
        g.gain.setTargetAtTime(0, t + 0.004, tau);
        o.connect(g);
        g.connect(this.music.bus.keys);
        o.start(t);
        o.stop(t + tau * 8);
      });
    },

    // music-box / celesta glint
    bell(t, f, dur, vel) {
      this._mGlint(t, f, vel, 0.6);
    },

    // shorter glassy celesta for the factory's turning-gears ostinato
    celesta(t, f, dur, vel) {
      this._mGlint(t, f, vel * 1.6, 0.3);
    },

    // a distant prison bell: inharmonic bell partials (hum, prime, minor third, ...)
    toll(t, f) {
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

    // a far-off factory whistle: a minor chord of pipes rising as the steam builds
    whistle(t, f) {
      const ctx = this.ctx;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.012, t + 0.5);
      g.gain.setValueAtTime(0.012, t + 2);
      g.gain.setTargetAtTime(0, t + 2, 0.5);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0;
      lp.frequency.value = 2500;
      [1, 1.19, 1.5].forEach((ratio) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f * ratio * 0.94, t);
        o.frequency.exponentialRampToValueAtTime(f * ratio, t + 0.45);
        o.connect(lp);
        o.start(t);
        o.stop(t + 5);
      });
      lp.connect(g);
      this._mPan(g, -0.4).connect(this.music.bus.amb);
    },

    // distant machine press: a low, muffled thud
    thump(t, f, dur, vel) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(70, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09 * vel, t + 0.005);
      g.gain.setTargetAtTime(0, t + 0.006, 0.12);
      o.connect(g);
      g.connect(this.music.bus.perc);
      o.start(t);
      o.stop(t + 0.9);
      this._mNoiseHit(t, 'lowpass', 300, 0.05 * vel, 0.04, this.music.bus.perc);
    },

    // small metallic tick of turning gears
    tick(t, f, dur, vel) {
      const ctx = this.ctx;
      const g = ctx.createGain();
      g.gain.value = 1;
      const out = this._mPan(g, 0.3);
      out.connect(this.music.bus.perc);
      this._mNoiseHit(t, 'highpass', 5000, 0.02 * vel, 0.012, g);
      [2350, 3710].forEach((hz) => {
        const o = ctx.createOscillator();
        o.frequency.value = hz;
        const pg = ctx.createGain();
        pg.gain.setValueAtTime(0, t);
        pg.gain.linearRampToValueAtTime(0.006 * vel, t + 0.002);
        pg.gain.setTargetAtTime(0, t + 0.003, 0.05);
        o.connect(pg);
        pg.connect(g);
        o.start(t);
        o.stop(t + 0.4);
      });
    },

    // glockenspiel / music box: struck-bar partials ringing out
    musicbox(t, f, dur, vel) {
      const ctx = this.ctx;
      [[1, 0.045, 1.1], [2.76, 0.012, 0.3], [5.4, 0.005, 0.12]].forEach(([ratio, vol, tau]) => {
        const o = ctx.createOscillator();
        o.frequency.value = f * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol * vel, t + 0.003);
        g.gain.setTargetAtTime(0, t + 0.004, tau);
        o.connect(g);
        g.connect(this.music.bus.keys);
        o.start(t);
        o.stop(t + tau * 8);
      });
    },

    // soft wooden flute: a breathy "chiff", then a pure tone with gentle vibrato
    flute(t, f, dur, vel) {
      const ctx = this.ctx;
      const vol = 0.03 * vel;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.08);
      g.gain.setTargetAtTime(vol * 0.85, t + 0.08, 0.4);
      g.gain.setTargetAtTime(0, t + dur - 0.04, 0.12);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0;
      lp.frequency.value = Math.min(4000, f * 3);
      const vib = ctx.createOscillator();
      vib.frequency.value = 4.8;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(8, t + 0.5);
      vib.connect(depth);
      [['sine', 1], ['triangle', 0.35]].forEach(([type, amt]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        depth.connect(o.detune);
        const a = ctx.createGain();
        a.gain.value = amt;
        o.connect(a);
        a.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.8);
      });
      vib.start(t);
      vib.stop(t + dur + 0.8);
      lp.connect(g);
      this._mNoiseHit(t, 'bandpass', f * 2, 0.01 * vel, 0.06, g);
      g.connect(this.music.bus.strings);
    },

    // a shake of sleigh bells
    sleigh(t, f, dur, vel) {
      this._mJingle(t, vel, this.music.bus.perc, 0.25);
    },

    // a sparkle of wind chimes running up a pentatonic scale
    chimes(t, f) {
      [0, 2, 4, 7, 9, 12, 14, 16].forEach((semis, i) =>
        this._mGlint(t + i * 0.07, f * Math.pow(2, semis / 12), 0.25, 0.9));
    },
  },

  // a cluster of tiny jingle bells: bright inharmonic pings plus a little shimmer
  _mJingle(t, vel, dest, pan) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 1;
    this._mPan(g, pan).connect(dest);
    const n = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const when = t + i * 0.008 + Math.random() * 0.025;
      const base = 3800 + Math.random() * 1400;
      [1, 1.47].forEach((ratio) => {
        const o = ctx.createOscillator();
        o.frequency.value = base * ratio;
        const pg = ctx.createGain();
        pg.gain.setValueAtTime(0, when);
        pg.gain.linearRampToValueAtTime(0.011 * vel, when + 0.002);
        pg.gain.setTargetAtTime(0, when + 0.003, 0.05 + Math.random() * 0.05);
        o.connect(pg);
        pg.connect(g);
        o.start(when);
        o.stop(when + 0.8);
      });
    }
    this._mNoiseHit(t, 'highpass', 7000, 0.03 * vel, 0.03, g);
  },

  // soft "aah" choir: sawtooth voices shaped by vowel formants, swelling slowly
  _mChoir(t, freqs, dur) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03, t + 1.6);
    g.gain.setTargetAtTime(0, t + dur, 0.8);
    const mix = ctx.createGain();
    mix.gain.value = 1;
    [[700, 2.5, 1], [1150, 3, 0.55], [2600, 4, 0.2]].forEach(([hz, q, amt]) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = hz;
      bp.Q.value = q;
      const a = ctx.createGain();
      a.gain.value = amt;
      mix.connect(bp);
      bp.connect(a);
      a.connect(g);
    });
    const vib = ctx.createOscillator();
    vib.frequency.value = 5;
    const depth = ctx.createGain();
    depth.gain.value = 6;
    vib.connect(depth);
    freqs.forEach((f) => [-8, 8].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = cents + (Math.random() - 0.5) * 6;
      depth.connect(o.detune);
      o.connect(mix);
      o.start(t);
      o.stop(t + dur + 4);
    }));
    vib.start(t);
    vib.stop(t + dur + 4);
    g.connect(this.music.bus.strings);
  },

  // a few pops and snaps from a fireplace in one of the houses
  _mCrackle(t) {
    const g = this.ctx.createGain();
    g.gain.value = 1;
    this._mPan(g, Math.random() * 1.2 - 0.6).connect(this.music.bus.perc);
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      this._mNoiseHit(t + Math.random() * 0.15, 'highpass', 1500 + Math.random() * 2500,
        0.02 + Math.random() * 0.02, 0.003 + Math.random() * 0.004, g);
    }
  },

  _mGlint(t, f, vel, tau) {
    const ctx = this.ctx;
    [[1, 0.035, tau], [4, 0.009, tau / 5]].forEach(([ratio, vol, decay]) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * vel, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.004, decay);
      o.connect(g);
      g.connect(this.music.bus.bell);
      o.start(t);
      o.stop(t + decay * 8);
    });
  },

  // short filtered burst from the shared noise buffer
  _mNoiseHit(t, type, freq, vol, tau, dest) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this._mx.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.setTargetAtTime(0, t, tau);
    n.connect(f);
    f.connect(g);
    g.connect(dest);
    n.start(t, Math.random() * 2);
    n.stop(t + tau * 8);
  },

  // Random ambience, rolled on every eighth-note step.
  _amb: {
    prison(t, m) {
      const step = this._songs[m.key].step;
      if (Math.random() < 0.045) this._mDrip(t + Math.random() * step);
      if (m.pos % this._songs[m.key].spb === 0 && Math.random() < 0.06) {
        this._mClank(t + Math.random() * 1.2, 150 + Math.random() * 90);
      }
    },
    sewer(t, m) {
      const step = this._songs[m.key].step;
      if (Math.random() < 0.06) this._mDrip(t + Math.random() * step);
      if (Math.random() < 0.02) this._mBubbles(t + Math.random() * step);
    },
    factory(t, m) {
      if (m.pos % this._songs[m.key].spb !== 0) return;
      if (Math.random() < 0.07) this._mSteam(t + Math.random() * 2);
      if (Math.random() < 0.05) {
        // a far-off hammer: two or three blows on an anvil
        const base = 300 + Math.random() * 120;
        const blows = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < blows; i++) this._mClank(t + i * 0.62, base);
      }
    },
    freezetown(t, m) {
      const song = this._songs[m.key];
      if (Math.random() < 0.05) this._mCrackle(t + Math.random() * song.step);
      if (m.pos % song.spb === 0 && Math.random() < 0.04) {
        // a sleigh passing somewhere far off in the snow
        const pan = Math.random() * 1.4 - 0.7;
        for (let i = 0; i < 8; i++) this._mJingle(t + i * 0.32, 0.35 * (1 - Math.abs(i - 3.5) / 5), this.music.bus.amb, pan);
      }
    },
  },

  // Continuous background beds, one per theme, started with the run.
  _beds: {
    // cold air drifting through the corridors: soft, slowly-swept filtered noise
    air(t, m) {
      this._mNoiseBed(t, 'bandpass', 380, 0.8, 0.012, [[0.045, 220, 'freq']]);
    },
    // running water: a babbling band of noise plus a low rumble of the flow
    water(t, m) {
      this._mNoiseBed(t, 'bandpass', 1000, 0.7, 0.02, [[0.11, 0.0085, 'gain'], [0.7, 0.0055, 'gain'], [1.3, 0.004, 'gain']]);
      this._mNoiseBed(t, 'lowpass', 220, 0, 0.04, [[0.08, 60, 'freq']]);
    },
    // the hall's machinery: low hum and a rumble that rocks like a conveyor
    machine(t, m) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 65.41;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 140;
      lp.Q.value = 0;
      const g = ctx.createGain();
      g.gain.value = 0.012;
      o.connect(lp);
      lp.connect(g);
      g.connect(m.bus.drone);
      o.start(t);
      m.nodes.push(o);
      this._mNoiseBed(t, 'lowpass', 150, 0, 0.02, [[0.5, 0.007, 'gain']]);
    },
    // snowy wind gusting around the houses, with a thin whistle through the gaps
    wind(t, m) {
      this._mNoiseBed(t, 'bandpass', 550, 1.2, 0.0085, [[0.06, 300, 'freq'], [0.13, 0.0042, 'gain']]);
      this._mNoiseBed(t, 'bandpass', 1500, 6, 0.004, [[0.09, 500, 'freq']]);
    },
  },

  // looping filtered noise with slow LFOs on its filter ('freq') or level ('gain')
  _mNoiseBed(t, type, freq, q, vol, lfos) {
    const ctx = this.ctx;
    const m = this.music;
    const src = ctx.createBufferSource();
    src.buffer = this._mx.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(m.bus.amb);
    lfos.forEach(([rate, amount, target]) => {
      const l = ctx.createOscillator();
      l.frequency.value = rate;
      const a = ctx.createGain();
      a.gain.value = amount;
      l.connect(a);
      a.connect(target === 'freq' ? f.frequency : g.gain);
      l.start(t);
      m.nodes.push(l);
    });
    src.start(t, Math.random() * 2);
    m.nodes.push(src);
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

  // a few air bubbles rising through the water
  _mBubbles(t) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 1;
    this._mPan(g, Math.random() * 1.4 - 0.7).connect(this.music.bus.amb);
    const n = 2 + Math.floor(Math.random() * 4);
    let when = t;
    for (let i = 0; i < n; i++) {
      const f = 250 + Math.random() * 450;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f, when);
      o.frequency.exponentialRampToValueAtTime(f * 1.8, when + 0.04 + Math.random() * 0.04);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0, when);
      bg.gain.linearRampToValueAtTime(0.015, when + 0.004);
      bg.gain.setTargetAtTime(0, when + 0.005, 0.03);
      o.connect(bg);
      bg.connect(g);
      o.start(when);
      o.stop(when + 0.25);
      when += 0.05 + Math.random() * 0.1;
    }
  },

  // a hiss of steam escaping a valve somewhere in the hall
  _mSteam(t) {
    const ctx = this.ctx;
    const hold = 0.5 + Math.random();
    const n = ctx.createBufferSource();
    n.buffer = this._mx.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000;
    bp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.018, t + 0.3);
    g.gain.setValueAtTime(0.018, t + 0.3 + hold);
    g.gain.setTargetAtTime(0, t + 0.3 + hold, 0.3);
    n.connect(bp);
    bp.connect(g);
    this._mPan(g, Math.random() * 1.6 - 0.8).connect(this.music.bus.amb);
    n.start(t, Math.random() * 0.5);
    n.stop(t + hold + 2.5);
  },

  // a far-off metal door, chain or anvil: struck-bar partials plus a short scrape
  _mClank(t, base) {
    const ctx = this.ctx;
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
      const bp = ctx.createGain();
      bp.gain.value = 1;
      bp.connect(out);
      this._mNoiseHit(when, 'bandpass', 1800, 0.6 * amt, 0.025, bp);
    };
    hit(t, 1);
    if (Math.random() < 0.6) hit(t + 0.16 + Math.random() * 0.1, 0.55); // the latch settling
  },

  // low drone on the theme's root that slowly breathes
  _mDrone(t, voices) {
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
    breath.start(t);
    m.nodes.push(breath);
    voices.forEach(([f, cents, vol]) => {
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
  },
};
