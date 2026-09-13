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
    return id === 'classic' || this.getOwnedSkins().includes(id);
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
      abilityName: 'Dash', icon: '⚡', speedMul: 1.0, lives: 1, cooldown: 3000,
      desc: 'Teleport past trees & the Spook. +10.',
    },
    brown: {
      label: 'Brown Ghost', tex: 'ghostBrown', ability: 'path', unlock: 1500,
      abilityName: 'Path', icon: '🪙', speedMul: 1.0, lives: 1, cooldown: 6000,
      desc: 'Lay a row of orbs ahead of you.',
    },
  },
  CHAR_ORDER: ['blue', 'red', 'green', 'purple', 'yellow', 'brown'],

  // A character is unlocked once your best score reaches its threshold.
  isUnlocked(key) {
    const c = this.CHARACTERS[key];
    if (!c) return false;
    return Storage.getHighscore() >= (c.unlock || 0);
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
  },
  SKIN_ORDER: ['classic', 'ember', 'frost', 'toxic', 'pumpkin', 'skull', 'crown', 'witch', 'rainbow'],

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
    if (Storage.getCoins() < (s.cost || 0)) return false;
    Storage.addCoins(-(s.cost || 0));
    Storage.addSkin(id);
    return true;
  },
};
