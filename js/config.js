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

  ORB_COUNT: 7,
  ORB_POINTS: 10,
  SURVIVE_POINTS_PER_SEC: 2,

  GRAVESTONE_COUNT: 14,

  COLORS: {
    bg: 0x0a0812,
    ground: 0x141024,
    ghost: 0xbfe6ff,
    ghostGlow: 0x6fb8ff,
    spook: 0x2a1440,
    spookEye: 0xff2b2b,
    sword: 0xffe066,
    orb: 0xffd54a,
    grave: 0x6b6f7a,
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
