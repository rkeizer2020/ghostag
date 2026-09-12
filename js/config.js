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

  ORB_COUNT: 13,
  ORB_POINTS: 10,
  SURVIVE_POINTS_PER_SEC: 2,

  TREE_COUNT: 26,

  // Thrown-log trap: press Space to drop a log where you stand. When the
  // Spook walks over it, it is slowed for a while.
  LOG_COOLDOWN: 2200,      // ms between throws
  LOG_LIFESPAN: 10000,     // ms a log stays on the ground before fading
  LOG_SLOW_DURATION: 5000, // ms the Spook stays slowed
  LOG_SLOW_FACTOR: 0.4,    // enemy speed multiplier while slowed

  COLORS: {
    bg: 0x081410,
    ground: 0x0d1f1a,
    ghost: 0xbfe6ff,
    ghostGlow: 0x6fb8ff,
    spook: 0x1e3a52,       // dark blue - blends into the fog
    spookEye: 0x8fb8d8,
    sword: 0xffe066,
    orb: 0xffd54a,
    tree: 0x2f6b3a,
    fog: 0x9fd8ff,
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
