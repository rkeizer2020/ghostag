// Central game constants and shared helpers.
const GAME = {
  WIDTH: 900,
  HEIGHT: 600,

  // World is larger than the view; camera follows the player.
  WORLD_WIDTH: 1800,
  WORLD_HEIGHT: 1200,

  PLAYER_SPEED: 230,
  PLAYER_BOOST_SPEED: 360,
  BOOST_DURATION: 2500, // ms

  ENEMY_START_SPEED: 90,
  ENEMY_MAX_SPEED: 320,
  ENEMY_ACCEL_PER_SEC: 3.2, // speed gained per second survived

  CATCH_DISTANCE: 34,      // distance at which you get caught
  WARN_DISTANCE: 200,      // distance at which the sword starts trembling

  // Offensive abilities auto-aim at the Spook when it's this close, so a
  // point-blank Space press always connects instead of firing where you last
  // moved (which is usually AWAY from the chasing Spook).
  AUTO_AIM_RANGE: 175,

  ORB_COUNT: 20,
  ORB_POINTS: 10,
  ORB_COINS: 2,            // coins earned per orb (kept between runs)
  SURVIVE_POINTS_PER_SEC: 2,

  TREE_COUNT: 26,

  // Thrown-log trap: press Space to drop a log where you stand. When the
  // Spook walks over it, it is slowed for a while.
  LOG_COOLDOWN: 5000,      // ms between throws
  LOG_LIFESPAN: 10000,     // ms a log stays on the ground before fading
  LOG_SLOW_DURATION: 5000, // ms the Spook stays slowed
  LOG_SLOW_FACTOR: 0.4,    // enemy speed multiplier while slowed

  // Red ghost's forward smash
  SMASH_COOLDOWN: 6000,        // ms between smashes
  SMASH_RANGE: 155,            // how far the slash reaches
  SMASH_ARC: Math.PI * 0.62,   // width of the hit cone (~112 degrees)
  SMASH_STUN_DURATION: 3000,   // ms the Spook is stunned on hit
  SMASH_HIT_POINTS: 80,        // points for landing a smash on the Spook

  // Green ghost's shield
  SHIELD_DURATION: 1000,       // ms the shield stays up
  SHIELD_BONUS_POINTS: 100,    // points for blocking a hit
  SHIELD_BLOCK_STUN: 700,      // ms the Spook is knocked back/stunned on a block

  // Purple ghost's phase (walk through trees)
  PHASE_DURATION: 7500,        // ms of phasing
  PHASE_COOLDOWN: 5000,        // ms cooldown AFTER phasing ends

  // Yellow ghost's teleport dash
  DASH_RANGE: 155,             // short teleport distance
  DASH_POINTS: 10,             // points per dash
  DASH_INVULN: 400,            // ms of safety during/after the teleport

  // Brown ghost's power-up path
  PATH_ORBS: 5,                // orbs laid in a row
  PATH_SPACING: 74,            // px between path orbs
  PATH_START: 64,              // px ahead of the player where the path begins
  PATH_LIFESPAN: 8000,         // ms before an uncollected path orb fades

  // Pink ghost's heart arrow: a bolt fired straight ahead. On a hit the
  // Spook turns and flees the other way for a while.
  ARROW_COOLDOWN: 6000,        // ms between shots
  ARROW_SPEED: 660,            // px/s
  ARROW_LIFESPAN: 560,         // ms in flight (~370px range, "right in front")
  ARROW_FLEE_DURATION: 2000,   // ms the Spook runs away on a hit
  ARROW_HIT_POINTS: 40,        // points for landing a heart arrow

  // Black ghost's shotgun: two long-range pellets that stun the Spook.
  SHOTGUN_COOLDOWN: 5000,      // ms between shots
  SHOTGUN_SPEED: 980,          // px/s (fast)
  SHOTGUN_LIFESPAN: 720,       // ms in flight (~700px range - huge)
  SHOTGUN_SPREAD: 0.09,        // rad between the two pellets
  SHOTGUN_STUN_DURATION: 3000, // ms the Spook is stunned on hit

  // Magma ghost, ability 1: a mud pool trap. The Spook is slowed on contact.
  MUD_COOLDOWN: 5000,          // ms between drops
  MUD_LIFESPAN: 10000,         // ms the pool stays before fading
  MUD_SLOW_DURATION: 5000,     // ms the Spook stays slowed
  MUD_SLOW_FACTOR: 0.4,        // enemy speed multiplier while slowed
  MUD_HIT_POINTS: 80,          // points when the Spook walks through it

  // Magma ghost, ability 2: a fast fire slide that burns trees on its path.
  SLIDE_COOLDOWN: 4000,        // ms between slides
  SLIDE_RANGE: 260,            // mid-range dash distance
  SLIDE_DURATION: 260,         // ms the slide takes
  SLIDE_INVULN: 500,           // ms of safety during/after the slide
  SLIDE_POINTS: 30,            // points per slide
  SLIDE_BURN_RADIUS: 46,       // trees within this of the path are burned

  // Brown ghost: orbs are worth double points.
  BROWN_ORB_MULTIPLIER: 2,

  // Forest ghost, ability 1: chop the nearest tree for a burst of orbs.
  CHOP_COOLDOWN: 7500,         // ms between chops
  CHOP_ORBS: 5,                // bonus orbs dropped by a chopped tree
  CHOP_RANGE: 999999,          // chops the nearest tree anywhere on the map

  // Forest ghost, ability 2: grow a wall of trees behind you.
  GROW_COOLDOWN: 8000,         // ms between growths
  GROW_TREES: 1,               // trees grown per use
  GROW_DIST: 72,               // px behind the player where the wall appears
  GROW_SPREAD: 66,             // px between grown trees

  // Volt ghost, ability 1: a short burst of 3x speed.
  SPRINT_MULT: 3,              // speed multiplier while sprinting
  SPRINT_DURATION: 3000,       // ms the sprint lasts
  SPRINT_COOLDOWN: 7500,       // ms cooldown AFTER the sprint ends

  // Volt ghost, ability 2: a short-range taser that stuns the Spook.
  TASER_COOLDOWN: 7500,        // ms between zaps
  TASER_RANGE: 110,            // shorter reach than the smash
  TASER_ARC: Math.PI * 0.6,    // width of the forward cone (~108 degrees)
  TASER_STUN_DURATION: 2000,   // ms the Spook is stunned
  TASER_POINTS: 50,            // points for landing a taser
  SHOTGUN_HIT_POINTS: 60,      // points for landing a shotgun blast

  // Alien ghost, ability 1: hop in a UFO and become untouchable. Every time
  // the Spook "hits" you while flying you score points instead of dying.
  UFO_DURATION: 5000,          // ms the UFO stays up (untouchable)
  UFO_COOLDOWN: 7500,          // ms cooldown AFTER the effect ends
  UFO_HIT_POINTS: 50,          // points each time the Spook hits the UFO
  UFO_HIT_GRACE: 500,          // ms between scored hits (avoids one hit = many)

  // Alien ghost, ability 2: a laser that bounces off walls & trees forever
  // until it finally hits the Spook, which stuns it.
  LASER_COOLDOWN: 5000,        // ms between laser shots
  LASER_SPEED: 520,            // px/s (bounces around the whole map)
  LASER_STUN_DURATION: 3000,   // ms the Spook is stunned on a hit
  LASER_HIT_POINTS: 70,        // points for landing a laser
  LASER_MAX_LIFE: 20000,       // ms safety cap so a stray laser can't live forever

  // Lucky ghost: press Gamble for one of six random effects.
  GAMBLE_COOLDOWN: 6000,       // ms between gambles
  GAMBLE_ORBS: 6,              // "orb burst" outcome: bonus orbs scattered
  GAMBLE_ORB_BUFF_MS: 5000,    // "orb burst": double orb points for this long
  GAMBLE_SPEED_MS: 5000,       // "speed" outcome: 3x-speed burst duration
  GAMBLE_INVULN_MS: 5000,      // "shield": untouchable + walk through trees
  GAMBLE_STUN_MS: 3000,        // "stun" outcome: Spook frozen
  GAMBLE_FLEE_MS: 3000,        // "scare" outcome: Spook runs away
  GAMBLE_POINTS: 1000,         // "jackpot" outcome: bonus points

  // Ninja ghost, ability 1: a decoy the Spook chases instead of you.
  DECOY_COOLDOWN: 7000,        // ms between decoys
  DECOY_DURATION: 2500,        // ms the Spook is lured to the decoy

  // Ninja ghost, ability 2: a mid-range dash that stuns the Spook on contact.
  NINJA_DASH_COOLDOWN: 5000,   // ms between dashes
  NINJA_DASH_RANGE: 260,       // mid-range dash distance
  NINJA_DASH_DURATION: 200,    // ms the dash takes
  NINJA_DASH_INVULN: 450,      // ms of safety during/after the dash
  NINJA_DASH_STUN: 2000,       // ms the Spook is stunned if the dash hits it
  NINJA_DASH_POINTS: 40,       // points for slicing the Spook

  // Chrono ghost, ability 1: rewind to where you were ~2 seconds ago.
  REWIND_COOLDOWN: 6000,       // ms between rewinds
  REWIND_MS: 2000,             // how far back in time you jump
  REWIND_INVULN: 500,          // ms of safety right after arriving

  // Chrono ghost, ability 2: slow the whole map while you keep full speed.
  SLOWMO_COOLDOWN: 8000,       // ms between slow-mos
  SLOWMO_MS: 2500,             // how long the slow lasts
  SLOWMO_FACTOR: 0.25,         // enemy (and world) speed multiplier while slowed

  // Void ghost, ability 1: throw a black hole that pulls the Spook and orbs.
  VOID_COOLDOWN: 8000,         // ms between black holes
  VOID_MS: 3000,               // how long the black hole lasts
  VOID_THROW_DIST: 180,        // px ahead of you where it appears
  VOID_PULL_RADIUS: 900,       // half the map: orbs/Spook within this are pulled
  VOID_ENEMY_FACTOR: 0.7,      // Spook speed while being dragged toward the void
  VOID_ORB_SPEED: 320,         // px/s orbs slide toward the centre
  VOID_BLACKHOLE_DAMAGE: 1,    // damage dealt when the Spook reaches the void

  // Void ghost, ability 2: a bolt that damages + briefly stuns the Spook.
  // Only this character gives the Spook a healthbar (a boss to kill).
  VOID_SHOT_COOLDOWN: 5000,    // ms between bolts
  VOID_SHOT_SPEED: 820,        // px/s
  VOID_SHOT_LIFESPAN: 820,     // ms in flight (~670px range)
  VOID_SHOT_DAMAGE: 1,         // damage per bolt
  VOID_SHOT_STUN: 1000,        // ms the Spook is stunned on a hit
  SPOOK_MAX_HP: 100,           // Void boss: Spook health
  VOID_KILL_POINTS: 25000,     // points for defeating the Spook boss

  // Spider ghost, ability 1: a web that roots the Spook in place.
  WEB_COOLDOWN: 6000,          // ms between webs
  WEB_LIFESPAN: 9000,          // ms the web stays on the ground
  WEB_ROOT_MS: 2000,           // ms the Spook is fully stuck (can't move)
  WEB_POINTS: 50,              // points when the Spook gets webbed

  // Spider ghost, ability 2: zip to the nearest tree for a fast escape.
  ZIP_COOLDOWN: 5000,          // ms between ziplines
  ZIP_DURATION: 200,           // ms the zip takes
  ZIP_INVULN: 450,             // ms of safety during/after the zip

  // City map's vending machine: buy a soda, then Arrow Down sprays it.
  SODA_COST: 10,               // coins per soda
  SODA_BUY_COOLDOWN: 30000,    // ms between purchases from the machine
  SODA_SPEED: 620,             // px/s the soda splat travels
  SODA_LIFESPAN: 520,          // ms in flight (~320px, mid-range)
  SODA_STUN: 2500,             // ms the Spook is stunned on a hit
  SODA_POINTS: 40,             // points for hitting the Spook with soda
  SODA_FIRE_GAP: 300,          // ms guard so one key-press fires one soda

  COLORS: {
    bg: 0x1c130b,
    ground: 0x3d2b1a,      // brown earth
    ghost: 0xbfe6ff,
    ghostGlow: 0x6fb8ff,
    spook: 0x1e3a52,       // dark blue - blends into the fog
    spookEye: 0x8fb8d8,
    sword: 0xffe066,
    orb: 0xffd54a,
    tree: 0x2f6b3a,
    fog: 0x5aa0ff,
    ghostRed: 0xff8a8a,
    ghostRedGlow: 0xff5b6e,
    ghostGreen: 0x8fe6a0,
    ghostPurple: 0xc79cff,
    ghostYellow: 0xffe066,
    ghostBrown: 0xb98a5e,
    ghostPink: 0xff8fd0,
    ghostBlack: 0x4a4a5a,
    ghostMagma: 0x9a1a1a,
    ghostForest: 0x4a9e4a,
    ghostVolt: 0x4aa8ff,
    ghostAlien: 0x6bffb0,
    ghostLucky: 0x7be26a,
    ghostNinja: 0x33343f,
    ghostChrono: 0x2fd6c0,
    ghostVoid: 0x2a1a3a,
    ghostSpider: 0x243024,
  },
};

// Randomly-chosen map themes. Each run picks one. Every biome swaps the
// ground, trees, fog and background tint for a different look; gameplay is
// identical across them.
const Biomes = {
  LIST: {
    forest: {
      key: 'forest', label: 'Forest', icon: '🌲',
      bg: 0x1c130b, ground: 'ground', tree: 'tree', fog: 'fog',
      firefly: 0xbfe6ff, snowfall: false,
    },
    graveyard: {
      key: 'graveyard', label: 'Graveyard', icon: '🪦',
      bg: 0x0e0f13, ground: 'ground_graveyard', tree: 'tree_graveyard', fog: 'fog_graveyard',
      firefly: 0x9fffc0, snowfall: false,
    },
    snow: {
      key: 'snow', label: 'Snow', icon: '❄️',
      bg: 0x1a2431, ground: 'ground_snow', tree: 'tree_snow', fog: 'fog_snow',
      firefly: 0xffffff, snowfall: true,
    },
    city: {
      key: 'city', label: 'City', icon: '🏙️',
      bg: 0x12141d, ground: 'ground_city', tree: 'tree_city', fog: 'fog_city',
      firefly: 0xffe6a0, snowfall: false, vending: true,
    },
  },
  ORDER: ['forest', 'graveyard', 'snow', 'city'],
  pick() {
    const k = this.ORDER[Math.floor(Math.random() * this.ORDER.length)];
    return this.LIST[k] || this.LIST.forest;
  },
  // The map-roll screen chooses the biome up front so the roulette can land on
  // it; the Game scene then consumes that choice instead of picking its own.
  _next: null,
  setNext(b) { this._next = b; },
  consumeNext() {
    const b = this._next;
    this._next = null;
    return b || this.pick();
  },
};

const Storage = {
  // Bump to wipe everyone's high scores once (applied on load / next login).
  RESET_ID: '2',
  // Bump to wipe ONLY the Normal board once (keeps Easy & Hard).
  NORMAL_RESET_ID: '1',

  _hsKey(d) { return 'tagz.hs.' + d; },

  // Per-difficulty best score. `d` defaults to the current difficulty.
  getHighscore(d) {
    d = d || (typeof Settings !== 'undefined' ? Settings.getDifficulty() : 'normal');
    try {
      const v = parseInt(localStorage.getItem(this._hsKey(d)), 10);
      return Number.isFinite(v) ? v : 0;
    } catch (e) {
      return 0;
    }
  },
  setHighscore(v, d) {
    d = d || (typeof Settings !== 'undefined' ? Settings.getDifficulty() : 'normal');
    try { localStorage.setItem(this._hsKey(d), String(v)); } catch (e) { /* ignore */ }
  },
  allHighscores() {
    return { easy: this.getHighscore('easy'), normal: this.getHighscore('normal'), hard: this.getHighscore('hard') };
  },
  setAllHighscores(o) {
    this.setHighscore(o.easy || 0, 'easy');
    this.setHighscore(o.normal || 0, 'normal');
    this.setHighscore(o.hard || 0, 'hard');
  },
  bestOverall() {
    return Math.max(this.getHighscore('easy'), this.getHighscore('normal'), this.getHighscore('hard'));
  },
  applyResetIfNeeded() {
    try {
      if (localStorage.getItem('tagz.resetId') !== this.RESET_ID) {
        localStorage.removeItem('tagz.highscore'); // old single score
        this.setAllHighscores({ easy: 0, normal: 0, hard: 0 });
        localStorage.setItem('tagz.resetId', this.RESET_ID);
      }
      // one-time wipe of ONLY the Normal board (Easy & Hard are kept)
      if (localStorage.getItem('tagz.normalResetId') !== this.NORMAL_RESET_ID) {
        this.setHighscore(0, 'normal');
        localStorage.setItem('tagz.normalResetId', this.NORMAL_RESET_ID);
      }
    } catch (e) { /* ignore */ }
  },

  // Founder perk: all characters unlocked regardless of score.
  allCharsUnlocked() {
    try { return localStorage.getItem('tagz.unlockall') === '1'; } catch (e) { return false; }
  },
  setAllCharsUnlocked() {
    try { localStorage.setItem('tagz.unlockall', '1'); } catch (e) { /* ignore */ }
  },

  // ---- Coins (currency kept between runs, spent on skins) ----
  getCoins() {
    try {
      const v = parseInt(localStorage.getItem('tagz.coins'), 10);
      return Number.isFinite(v) ? v : 0;
    } catch (e) {
      return 0;
    }
  },
  addCoins(n) {
    try {
      localStorage.setItem('tagz.coins', String(Math.max(0, this.getCoins() + n)));
    } catch (e) { /* ignore */ }
  },

  // ---- Owned skins ('classic' is always owned) ----
  getOwnedSkins() {
    try {
      const s = localStorage.getItem('tagz.skins');
      const arr = s ? s.split(',').filter(Boolean) : [];
      if (!arr.includes('classic')) arr.push('classic');
      return arr;
    } catch (e) {
      return ['classic'];
    }
  },
  isSkinOwned(id) {
    if (id === 'owner') return this.isOwnerUnlocked();
    if (id === 'wizgnome') return this.isFounderUnlocked(); // founder-exclusive
    return id === 'classic' || this.getOwnedSkins().includes(id);
  },
  isOwnerUnlocked() {
    try {
      return localStorage.getItem('tagz.owner') === '1';
    } catch (e) {
      return false;
    }
  },
  // Founder accounts (merlinos24, azarios88) only: unlocks founder-exclusive
  // cosmetics like the Wizard Gnome skin.
  isFounderUnlocked() {
    try {
      return localStorage.getItem('tagz.founder') === '1';
    } catch (e) {
      return false;
    }
  },
  setFounderUnlocked() {
    try { localStorage.setItem('tagz.founder', '1'); } catch (e) { /* ignore */ }
  },
  addSkin(id) {
    try {
      const arr = this.getOwnedSkins();
      if (!arr.includes(id)) {
        arr.push(id);
        localStorage.setItem('tagz.skins', arr.join(','));
      }
    } catch (e) { /* ignore */ }
  },
};

// Difficulty presets and the player's chosen difficulty (persisted).
const Settings = {
  DIFFICULTIES: {
    easy:   { label: 'Easy',   speedMul: 0.78, accelMul: 0.65 },
    normal: { label: 'Normal', speedMul: 1.0,  accelMul: 1.0 },
    hard:   { label: 'Hard',   speedMul: 1.28, accelMul: 1.6 },
  },
  ORDER: ['easy', 'normal', 'hard'],

  getDifficulty() {
    try {
      const d = localStorage.getItem('tagz.difficulty');
      return this.DIFFICULTIES[d] ? d : 'normal';
    } catch (e) {
      return 'normal';
    }
  },
  setDifficulty(key) {
    if (!this.DIFFICULTIES[key]) return;
    try { localStorage.setItem('tagz.difficulty', key); } catch (e) { /* ignore */ }
  },
  difficulty() {
    return this.DIFFICULTIES[this.getDifficulty()];
  },

  // Playable characters and their special ability.
  CHARACTERS: {
    blue: {
      label: 'Blue Ghost', tex: 'ghost', ability: 'log', unlock: 0,
      abilityName: 'Log', icon: '🪵', speedMul: 1.0, lives: 1, cooldown: 5000,
      desc: 'Drop a log; slows the Spook 5s.',
    },
    red: {
      label: 'Red Ghost', tex: 'ghostRed', ability: 'smash', unlock: 100,
      abilityName: 'Smash', icon: '💥', speedMul: 1.0, lives: 1, cooldown: 6000,
      desc: 'Long forward slash; stuns 3s on hit.',
    },
    green: {
      label: 'Green Ghost', tex: 'ghostGreen', ability: 'shield', unlock: 200,
      abilityName: 'Shield', icon: '🛡️', speedMul: 0.85, lives: 1, cooldown: 7500,
      desc: '1s shield; blocks a hit, then boost +100. Bit slower.',
    },
    purple: {
      label: 'Purple Ghost', tex: 'ghostPurple', ability: 'phase', unlock: 500,
      abilityName: 'Phase', icon: '🌀', speedMul: 0.85, lives: 2, cooldown: 5000,
      desc: '2 lives; walk through trees 7.5s. Bit slower.',
    },
    yellow: {
      label: 'Yellow Ghost', tex: 'ghostYellow', ability: 'dash', unlock: 900,
      abilityName: 'Dash', icon: '⚡', speedMul: 1.15, lives: 1, cooldown: 3000,
      desc: 'Fastest ghost. Teleport past trees & the Spook. +10.',
    },
    brown: {
      label: 'Brown Ghost', tex: 'ghostBrown', ability: 'path', unlock: 1500,
      abilityName: 'Path', icon: '🪙', speedMul: 1.0, lives: 1, cooldown: 6000,
      desc: 'Lay a row of orbs ahead. Orbs are worth DOUBLE points!',
    },
    pink: {
      label: 'Pink Ghost', tex: 'ghostPink', ability: 'arrow', unlock: 2000,
      abilityName: 'Heart Arrow', icon: '💘', speedMul: 1.15, lives: 1, cooldown: 6000,
      desc: 'Fire a heart arrow; the Spook flees 2s on a hit. Fast.',
    },
    black: {
      label: 'Black Ghost', tex: 'ghostBlack', ability: 'shotgun', unlock: 3500,
      abilityName: 'Shotgun', icon: '🔫', speedMul: 1.15, lives: 1, cooldown: 5000,
      desc: 'Two long-range pellets; stuns the Spook 3s. Fast.',
    },
    magma: {
      label: 'Magma Ghost', tex: 'ghostMagma', ability: 'dual', unlock: 5000,
      abilityName: 'Mud / Slide', icon: '🔥', speedMul: 1.0, lives: 1,
      modes: ['mud', 'slide'],
      // per-mode cooldowns live in GAME.MUD_COOLDOWN / GAME.SLIDE_COOLDOWN
      desc: 'Shift swaps abilities: mud trap (slow, +80) or a fire slide through trees (+30).',
    },
    forest: {
      label: 'Forest Ghost', tex: 'ghostForest', ability: 'dual', unlock: 6500,
      abilityName: 'Chop / Grow', icon: '🌲', speedMul: 0.85, boostSpeedMul: 1.15, lives: 1,
      modes: ['chop', 'grow'],
      // cooldowns: GAME.CHOP_COOLDOWN / GAME.GROW_COOLDOWN
      desc: 'Shift swaps: chop a tree for 5 orbs, or grow a tree behind you. Extra-fast on pickups.',
    },
    volt: {
      label: 'Volt Ghost', tex: 'ghostVolt', ability: 'dual', unlock: 10000,
      abilityName: 'Sprint / Taser', icon: '⚡', speedMul: 1.15, lives: 1,
      modes: ['sprint', 'taser'],
      // cooldowns: GAME.SPRINT_* / GAME.TASER_COOLDOWN
      desc: 'Shift swaps: a 3x speed sprint (3s), or a short taser that stuns the Spook 2s. Fast.',
    },
    alien: {
      label: 'Alien Ghost', tex: 'ghostAlien', ability: 'dual', unlock: 12000,
      abilityName: 'UFO / Laser', icon: '👽', speedMul: 1.15, lives: 1,
      modes: ['ufo', 'laser'],
      // cooldowns: GAME.UFO_* / GAME.LASER_COOLDOWN
      desc: 'Shift swaps: a UFO that makes you untouchable 5s (+50 per hit), or a laser that bounces around the map until it stuns the Spook. Fast.',
    },
    lucky: {
      label: 'Lucky Ghost', tex: 'ghostLucky', ability: 'gamble', unlock: 1200,
      abilityName: 'Gamble', icon: '🍀', speedMul: 1.0, lives: 1, cooldown: 6000,
      desc: 'Gamble for a random reward: orb burst (+double orbs), 3x speed, invincible, Spook stun, +1000, or a scared Spook!',
    },
    ninja: {
      label: 'Ninja Ghost', tex: 'ghostNinja', ability: 'dual', unlock: 4500,
      abilityName: 'Decoy / Dash', icon: '🥷', speedMul: 1.0, lives: 1,
      modes: ['decoy', 'slice'],
      // cooldowns: GAME.DECOY_COOLDOWN / GAME.NINJA_DASH_COOLDOWN
      desc: 'Shift swaps: drop a decoy the Spook chases, or a mid-range dash slice that stuns it.',
    },
    chrono: {
      label: 'Chrono Ghost', tex: 'ghostChrono', ability: 'dual', unlock: 5500,
      abilityName: 'Rewind / Slow-Mo', icon: '⏱️', speedMul: 1.0, lives: 1,
      modes: ['rewind', 'slowmo'],
      // cooldowns: GAME.REWIND_COOLDOWN / GAME.SLOWMO_COOLDOWN
      desc: 'Shift swaps: rewind to where you were 2s ago, or slow the whole map 2.5s while you stay fast.',
    },
    void: {
      label: 'Void Ghost', tex: 'ghostVoid', ability: 'dual', unlock: 6000,
      abilityName: 'Black Hole / Bolt', icon: '🕳️', speedMul: 0.85, lives: 1,
      modes: ['blackhole', 'vshot'],
      // cooldowns: GAME.VOID_COOLDOWN / GAME.VOID_SHOT_COOLDOWN
      desc: 'Shift swaps: a half-map black hole (pulls Spook + orbs), or a bolt that damages the Spook. The Spook has 100 HP — kill it for 25000!',
    },
    spider: {
      label: 'Spider Ghost', tex: 'ghostSpider', ability: 'dual', unlock: 4000,
      abilityName: 'Web / Zipline', icon: '🕸️', speedMul: 1.0, lives: 1,
      modes: ['webtrap', 'zip'],
      // cooldowns: GAME.WEB_COOLDOWN / GAME.ZIP_COOLDOWN
      desc: 'Shift swaps: drop a web that roots the Spook in place 2s, or zip to the farthest tree for a big escape.',
    },
  },
  CHAR_ORDER: ['blue', 'red', 'green', 'purple', 'yellow', 'brown', 'pink', 'black', 'magma', 'forest', 'volt', 'alien', 'lucky', 'ninja', 'chrono', 'void', 'spider'],

  // A character is unlocked once your best score reaches its threshold.
  isUnlocked(key) {
    const c = this.CHARACTERS[key];
    if (!c) return false;
    if (key === 'blue') return true;
    if (Storage.allCharsUnlocked()) return true; // founder perk
    return Storage.bestOverall() >= (c.unlock || 0);
  },

  getCharacter() {
    try {
      const c = localStorage.getItem('tagz.character');
      if (this.CHARACTERS[c] && this.isUnlocked(c)) return c;
    } catch (e) { /* ignore */ }
    return 'blue';
  },
  setCharacter(key) {
    if (!this.CHARACTERS[key] || !this.isUnlocked(key)) return;
    try { localStorage.setItem('tagz.character', key); } catch (e) { /* ignore */ }
  },
  character() {
    return this.CHARACTERS[this.getCharacter()];
  },

  // ---- Skins: cosmetic looks bought with coins (no gameplay effect) ----
  // kind 'default' uses the equipped character's own colour; others override
  // the ghost's look. `hat` overlays an accessory; `rainbow` cycles the tint.
  SKINS: {
    classic: { name: 'Classic', cost: 0, kind: 'default', trail: 0x6fb8ff },
    ember:   { name: 'Ember',   cost: 80,  tex: 'skinEmber',  trail: 0xff7a2a },
    frost:   { name: 'Frost',   cost: 80,  tex: 'skinFrost',  trail: 0x9fe0ff },
    toxic:   { name: 'Toxic',   cost: 120, tex: 'skinToxic',  trail: 0x7fff5a },
    pumpkin: { name: 'Pumpkin', cost: 150, tex: 'skinPumpkin', trail: 0xff9a2a },
    skull:   { name: 'Skull',   cost: 200, tex: 'skinSkull',  trail: 0xcfd8e0 },
    crown:   { name: 'Royal',   cost: 300, tex: 'skinNeutral', hat: 'hatCrown', trail: 0xffd54a },
    witch:   { name: 'Witch',   cost: 300, tex: 'skinNeutral', hat: 'hatWitch', trail: 0xb98fe0 },
    rainbow: { name: 'Rainbow', cost: 500, tex: 'skinWhite', trail: 0xffffff, rainbow: true },
    // premium cosmetics
    galaxy:  { name: 'Galaxy',  cost: 650,  tex: 'skinGalaxy',  trail: 0xb98fe0 },
    neon:    { name: 'Neon',    cost: 800,  tex: 'skinNeon',    trail: 0x2ffff0 },
    angel:   { name: 'Angel',   cost: 900,  tex: 'skinWhite',   hat: 'hatHalo',  trail: 0xfff0b0 },
    devil:   { name: 'Devil',   cost: 900,  tex: 'skinDevil',   hat: 'hatHorns', trail: 0xff3020 },
    diamond: { name: 'Diamond', cost: 1200, tex: 'skinDiamond', trail: 0xbfefff },
    // themed (original designs - not affiliated with any brand)
    gnome:    { name: 'Blue Gnome',   cost: 700,  tex: 'skinSmurf',       hat: 'hatGnome', trail: 0x5ab0ff },
    sorcerer: { name: 'Sorcerer',     cost: 850,  tex: 'skinWizard',      trail: 0xffd54a },
    // founder-exclusive: not in the shop, only merlinos24 / azarios88
    wizgnome: { name: 'Wizard Gnome', cost: 0, kind: 'founder', tex: 'skinWizardGnome', hat: 'hatGnome', trail: 0x9fd2ff },
    // owner-only: gold "rich" look with the face in the character's colour
    owner:   { name: 'Rich', cost: 0, kind: 'owner', tex: 'skinGold', hat: 'hatMoney', trail: 0xffd54a },
  },
  SKIN_ORDER: ['classic', 'ember', 'frost', 'toxic', 'pumpkin', 'skull', 'crown', 'witch', 'rainbow', 'galaxy', 'neon', 'angel', 'devil', 'diamond', 'gnome', 'sorcerer', 'wizgnome', 'owner'],

  // body colour for each character (used to tint the owner skin's face)
  charColor(key) {
    return { blue: 0xbfe6ff, red: 0xff8a8a, green: 0x8fe6a0, purple: 0xc79cff, yellow: 0xffe066, brown: 0xb98a5e, pink: 0xff8fd0, black: 0xb0b0c8, magma: 0xff6a3a, forest: 0x8fe6a0, volt: 0x6fd0ff, alien: 0x6bffb0, lucky: 0x9be87a, ninja: 0xbfc2d0, chrono: 0x7fe8e0, void: 0xb98fe0, spider: 0x8fe6a0 }[key] || 0xbfe6ff;
  },

  getSkin() {
    try {
      const s = localStorage.getItem('tagz.skin');
      if (this.SKINS[s] && Storage.isSkinOwned(s)) return s;
    } catch (e) { /* ignore */ }
    return 'classic';
  },
  setSkin(id) {
    if (!this.SKINS[id] || !Storage.isSkinOwned(id)) return;
    try { localStorage.setItem('tagz.skin', id); } catch (e) { /* ignore */ }
  },
  skin() {
    return this.SKINS[this.getSkin()];
  },
  buySkin(id) {
    const s = this.SKINS[id];
    if (!s) return false;
    if (Storage.isSkinOwned(id)) return true;
    // owner/founder skins can never be bought with coins
    if (s.kind === 'owner' || s.kind === 'founder') return false;
    if (Storage.getCoins() < (s.cost || 0)) return false;
    Storage.addCoins(-(s.cost || 0));
    Storage.addSkin(id);
    return true;
  },
};
