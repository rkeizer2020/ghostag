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

  ORB_COUNT: 20,
  ORB_POINTS: 10,
  SURVIVE_POINTS_PER_SEC: 2,

  TREE_COUNT: 26,

  // Thrown-log trap: press Space to drop a log where you stand. When the
  // Spook walks over it, it is slowed for a while.
  LOG_COOLDOWN: 2200,      // ms between throws
  LOG_LIFESPAN: 10000,     // ms a log stays on the ground before fading
  LOG_SLOW_DURATION: 5000, // ms the Spook stays slowed
  LOG_SLOW_FACTOR: 0.4,    // enemy speed multiplier while slowed

  // Red ghost's forward smash
  SMASH_COOLDOWN: 1800,        // ms between smashes
  SMASH_RANGE: 155,            // how far the slash reaches
  SMASH_ARC: Math.PI * 0.62,   // width of the hit cone (~112 degrees)
  SMASH_STUN_DURATION: 3000,   // ms the Spook is stunned on hit

  // Green ghost's shield
  SHIELD_DURATION: 1000,       // ms the shield stays up
  SHIELD_BONUS_POINTS: 100,    // points for blocking a hit
  SHIELD_BLOCK_STUN: 700,      // ms the Spook is knocked back/stunned on a block

  // Purple ghost's phase (walk through trees)
  PHASE_DURATION: 7500,        // ms of phasing
  PHASE_COOLDOWN: 5000,        // ms cooldown AFTER phasing ends

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
  },
};

const Storage = {
  KEY: 'tagz.highscore',
  getHighscore() {
    try {
      const v = parseInt(localStorage.getItem(this.KEY), 10);
      return Number.isFinite(v) ? v : 0;
    } catch (e) {
      return 0;
    }
  },
  setHighscore(v) {
    try {
      localStorage.setItem(this.KEY, String(v));
    } catch (e) {
      /* private mode / storage disabled: silently ignore */
    }
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
      label: 'Blue Ghost', tex: 'ghost', ability: 'log',
      abilityName: 'Log', icon: '🪵', speedMul: 1.0, lives: 1, cooldown: 2200,
      desc: 'Drops a log behind you. The Spook is slowed for 5s when it steps over it.',
    },
    red: {
      label: 'Red Ghost', tex: 'ghostRed', ability: 'smash',
      abilityName: 'Smash', icon: '💥', speedMul: 1.0, lives: 1, cooldown: 1800,
      desc: 'Slashes forward with long range. On a hit the Spook is stunned for 3s.',
    },
    green: {
      label: 'Green Ghost', tex: 'ghostGreen', ability: 'shield',
      abilityName: 'Shield', icon: '🛡️', speedMul: 0.85, lives: 1, cooldown: 7500,
      desc: '1s shield. Blocks one hit, then gives a speed boost and +100 points. A bit slower.',
    },
    purple: {
      label: 'Purple Ghost', tex: 'ghostPurple', ability: 'phase',
      abilityName: 'Phase', icon: '🌀', speedMul: 0.85, lives: 2, cooldown: 5000,
      desc: '2 lives. Walk through trees for 7.5s (5s cooldown after). A bit slower.',
    },
  },
  CHAR_ORDER: ['blue', 'red', 'green', 'purple'],

  getCharacter() {
    try {
      const c = localStorage.getItem('tagz.character');
      return this.CHARACTERS[c] ? c : 'blue';
    } catch (e) {
      return 'blue';
    }
  },
  setCharacter(key) {
    if (!this.CHARACTERS[key]) return;
    try { localStorage.setItem('tagz.character', key); } catch (e) { /* ignore */ }
  },
  character() {
    return this.CHARACTERS[this.getCharacter()];
  },
};
