// Display info for each dual-ability mode (icon / label / accent colour).
const DUAL_INFO = {
  mud:    { icon: '🟤', label: 'Mud',    color: 0xc9a26a },
  slide:  { icon: '🔥', label: 'Slide',  color: 0xff8a3a },
  chop:   { icon: '🪓', label: 'Chop',   color: 0x8fe6a0 },
  grow:   { icon: '🌲', label: 'Grow',   color: 0x6fce6a },
  sprint: { icon: '💨', label: 'Sprint', color: 0x8fd0ff },
  taser:  { icon: '⚡', label: 'Taser',  color: 0xffe066 },
  ufo:    { icon: '🛸', label: 'UFO',    color: 0x6bffb0 },
  laser:  { icon: '🟢', label: 'Laser',  color: 0x2fff9a },
  decoy:  { icon: '🌀', label: 'Decoy',  color: 0xbfc2d0 },
  slice:  { icon: '⚔️', label: 'Dash',   color: 0xff6b7a },
  rewind: { icon: '⏪', label: 'Rewind', color: 0x2fd6c0 },
  slowmo: { icon: '⏱️', label: 'Slow-Mo', color: 0xffd54a },
  blackhole: { icon: '🕳️', label: 'Black Hole', color: 0xc79cff },
  vshot:  { icon: '🔮', label: 'Bolt',   color: 0xc79cff },
  webtrap: { icon: '🕸️', label: 'Web',   color: 0x9fff8a },
  zip:    { icon: '🧵', label: 'Zipline', color: 0x8fe6a0 },
};

class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const WW = GAME.WORLD_WIDTH;
    const WH = GAME.WORLD_HEIGHT;

    // use the map the roll screen landed on (or pick one if launched directly)
    this.biome = Biomes.consumeNext();

    this.physics.world.setBounds(0, 0, WW, WH);
    this.cameras.main.setBounds(0, 0, WW, WH);
    this.cameras.main.setBackgroundColor(this.biome.bg);

    // tiled floor for the chosen biome
    this.add.tileSprite(0, 0, WW, WH, this.biome.ground).setOrigin(0).setDepth(-10);
    this.createFog();

    // state
    this.score = 0;
    this.elapsed = 0;
    this.enemySpeed = GAME.ENEMY_START_SPEED;
    this.boostUntil = 0;
    this.slowUntil = 0;
    this.stunUntil = 0;
    this.fleeUntil = 0;
    this.sprintUntil = 0;
    this.ufoUntil = 0;
    this.lastUfoHit = 0;
    this.lureUntil = 0;       // Ninja decoy: Spook chases lurePoint instead of you
    this.lurePoint = null;
    this.orbBonusUntil = 0;   // Lucky gamble: double orb points for a while
    this.slowMoUntil = 0;     // Chrono slow-mo: whole map runs slow
    this.posHistory = [];     // Chrono rewind: recent {t,x,y} samples
    this.blackHole = null;    // Void black hole currently on the map
    this.spookHp = GAME.SPOOK_MAX_HP; // Void boss: Spook health (only that char)
    this.rootUntil = 0;       // Spider web: Spook fully stuck in place
    this.invulnUntil = 0;
    this.shieldUntil = 0;
    this.phaseUntil = 0;
    this.phasing = false;
    this.gameOver = false;
    this.lastWarnBeep = 0;

    // selected character + its ability
    this.charKey = Settings.getCharacter();
    this.character = Settings.CHARACTERS[this.charKey];
    // equipped cosmetic skin overrides the look (classic = character colour)
    this.skin = Settings.skin();
    this.playerTex = (this.skin.kind === 'default') ? this.character.tex : this.skin.tex;
    this.runCoins = 0;
    this.charSpeedMul = this.character.speedMul || 1;
    this.lives = this.character.lives || 1;
    this.abilityCooldown = this.character.cooldown || 2000;
    this.abilityReadyAt = 0; // time (ms) when the ability can be used again
    this.faceDir = new Phaser.Math.Vector2(0, -1); // starts facing the Spook

    // difficulty scaling
    const diff = Settings.difficulty();
    this.difficultyKey = Settings.getDifficulty();
    this.enemyStart = GAME.ENEMY_START_SPEED * diff.speedMul;
    this.enemyMax = GAME.ENEMY_MAX_SPEED * diff.speedMul;
    this.enemyAccel = GAME.ENEMY_ACCEL_PER_SEC * diff.accelMul;
    this.enemySpeed = this.enemyStart;

    // stuck-on-a-tree detection / escape steering
    this.enemyPrevX = null;
    this.enemyPrevY = null;
    this.stuckTime = 0;
    this.escapeUntil = 0;
    this.escapeSign = 1;

    // trees (static obstacles)
    this.trees = this.physics.add.staticGroup();
    this.placeTrees();

    // dropped logs (traps that slow the Spook)
    this.logs = this.physics.add.group({ allowGravity: false, immovable: true });

    // player
    this.player = this.physics.add.image(WW * 0.5, WH * 0.75, this.playerTex);
    this.player.setCircle(16, 8, 14);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // enemy spook + its sword (sword is a separate sprite held above)
    this.enemy = this.physics.add.image(WW * 0.5, WH * 0.15, 'spook');
    this.enemy.setCircle(18, 12, 14);
    this.enemy.setCollideWorldBounds(true);
    this.enemy.setDepth(10);
    this.sword = this.add.image(this.enemy.x, this.enemy.y - 44, 'sword').setDepth(11);

    // cosmetic hat overlay (some skins) that follows the player
    this.hat = null;
    if (this.skin.hat) {
      // bottom-anchored so the hat sits ABOVE the head, never over the face
      this.hat = this.add.image(this.player.x, this.player.y, this.skin.hat).setOrigin(0.5, 1).setDepth(12);
    }
    // owner skin: coloured face patch (in the character's colour) over gold body
    this.faceFx = null;
    if (this.skin.kind === 'owner') {
      this.faceFx = this.add.image(this.player.x, this.player.y, 'ownerFace')
        .setDepth(11).setScale(0.8).setTint(Settings.charColor(this.charKey));
    }

    // atmosphere: shadows, a glow around the ghost, and drifting fireflies
    this.createAtmosphere();

    // collisions with trees (player collider is toggled off while phasing)
    this.playerTreeCollider = this.physics.add.collider(this.player, this.trees);
    this.physics.add.collider(this.enemy, this.trees);

    // the Spook steps on a log -> slowed
    this.physics.add.overlap(this.enemy, this.logs, this.hitLog, null, this);

    // dropped mud pools (Magma ability 1) that slow the Spook on contact
    this.mudpools = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.enemy, this.mudpools, this.hitMud, null, this);

    // spider webs that root the Spook in place on contact
    this.webs = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.enemy, this.webs, this.hitWeb, null, this);

    // fired projectiles (pink's heart arrow, black's shotgun pellets)
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.projectiles, this.enemy, this.hitProjectile, null, this);

    // Alien's bouncing laser: ricochets off the world edges and trees, and
    // stuns the Spook when it finally connects.
    this.lasers = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.lasers, this.trees);
    this.physics.add.overlap(this.lasers, this.enemy, this.hitLaser, null, this);

    // orbs
    this.orbs = this.physics.add.group();
    for (let i = 0; i < GAME.ORB_COUNT; i++) this.spawnOrb();
    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);

    // camera follows player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => this.useAbility());
    // dual-ability characters (Magma, Forest): Shift swaps between abilities
    this.dualModes = this.character.modes || [];
    this.dualMode = this.dualModes[0] || null;
    this.dualReady = {};                    // per-mode cooldown timers
    this.dualModes.forEach((m) => { this.dualReady[m] = 0; });
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.shiftKey.on('down', () => this.switchDualMode());
    this.joystick = null;
    if (this.sys.game.device.input.touch) {
      this.joystick = new VirtualJoystick(this);
    }

    // boost particle trail
    this.trail = this.add.particles(0, 0, 'spark', {
      speed: 0, lifespan: 300, scale: { start: 0.7, end: 0 },
      alpha: { start: 0.5, end: 0 }, tint: this.skin.trail || 0x6fb8ff, frequency: -1, depth: 9,
    });

    this.buildHUD();
    this.announceBiome();

    // Void ghost turns the Spook into a boss with a health bar
    this.spookHpBar = (this.charKey === 'void') ? this.add.graphics().setDepth(20) : null;

    this.input.keyboard.on('keydown-M', () => this.toggleMute());
    this.input.keyboard.on('keydown-P', () => this.togglePause());

    // background music for the chase; stops when the scene ends
    SFX.startMusic();
    this.events.once('shutdown', () => SFX.stopMusic());
  }

  // Brief centred banner naming the randomly-chosen map for this run.
  announceBiome() {
    const W = this.scale.width;
    const label = (this.biome.icon || '') + '  ' + (this.biome.label || 'Forest');
    const txt = this.add.text(W / 2, 74, label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setAlpha(0).setShadow(0, 3, '#000', 8);
    this.tweens.add({
      targets: txt, alpha: { from: 0, to: 1 }, y: 84, duration: 400, ease: 'Back.out',
      hold: 1400, yoyo: true,
      onComplete: () => txt.destroy(),
    });
  }

  createAtmosphere() {
    const WW = GAME.WORLD_WIDTH, WH = GAME.WORLD_HEIGHT;
    // soft shadows under the player and the Spook
    this.playerShadow = this.add.image(this.player.x, this.player.y + 22, 'shadowBlob').setDepth(9).setAlpha(0.5);
    this.enemyShadow = this.add.image(this.enemy.x, this.enemy.y + 26, 'shadowBlob').setDepth(9).setAlpha(0.5).setScale(1.15);
    // a gentle glow that follows the ghost, tinted by the skin's trail colour
    this.playerGlow = this.add.image(this.player.x, this.player.y, 'glow')
      .setDepth(9).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(this.skin.trail || 0x6fb8ff).setAlpha(0.5).setScale(0.9);
    this.tweens.add({
      targets: this.playerGlow, alpha: { from: 0.35, to: 0.6 }, scale: { from: 0.85, to: 1.0 },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    // drifting motes, tinted for the biome (fireflies / spirit wisps / snow glints)
    const moteTint = this.biome.firefly || 0xbfe6ff;
    for (let i = 0; i < 16; i++) {
      const f = this.add.image(Phaser.Math.Between(0, WW), Phaser.Math.Between(0, WH), 'firefly')
        .setDepth(8).setBlendMode(Phaser.BlendModes.ADD).setTint(moteTint)
        .setScale(Phaser.Math.FloatBetween(0.5, 1.1)).setAlpha(0);
      this.tweens.add({ targets: f, alpha: { from: 0.15, to: 0.8 }, duration: Phaser.Math.Between(1200, 2600), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
      this.tweens.add({ targets: f, x: f.x + Phaser.Math.Between(-70, 70), y: f.y + Phaser.Math.Between(-50, 50), duration: Phaser.Math.Between(5000, 9000), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    // Snow biome: gentle falling snowflakes drifting down the whole map
    if (this.biome.snowfall) {
      this.snow = this.add.particles(0, 0, 'firefly', {
        x: { min: 0, max: WW }, y: { min: -20, max: WH },
        quantity: 2, frequency: 90, lifespan: 6000,
        speedY: { min: 30, max: 70 }, speedX: { min: -18, max: 18 },
        scale: { min: 0.12, max: 0.3 }, alpha: { start: 0.9, end: 0.3 },
        tint: 0xffffff, blendMode: Phaser.BlendModes.SCREEN, depth: 8,
      });
    }
  }

  createFog() {
    // several large soft puffs drifting slowly for a misty forest feel
    this.fogLayer = this.add.container(0, 0).setDepth(8);
    const WW = GAME.WORLD_WIDTH, WH = GAME.WORLD_HEIGHT;
    for (let i = 0; i < 11; i++) {
      const puff = this.add.image(
        Phaser.Math.Between(0, WW), Phaser.Math.Between(0, WH), this.biome.fog
      );
      puff.setScale(Phaser.Math.FloatBetween(2.0, 3.8));
      puff.setAlpha(Phaser.Math.FloatBetween(0.30, 0.5));
      puff.setBlendMode(Phaser.BlendModes.SCREEN);
      this.fogLayer.add(puff);
      this.tweens.add({
        targets: puff,
        x: puff.x + Phaser.Math.Between(-160, 160),
        y: puff.y + Phaser.Math.Between(-90, 90),
        duration: Phaser.Math.Between(8000, 16000),
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }
  }

  placeTrees() {
    const WW = GAME.WORLD_WIDTH, WH = GAME.WORLD_HEIGHT;
    const spots = [];
    let attempts = 0;
    while (spots.length < GAME.TREE_COUNT && attempts < 800) {
      attempts++;
      const x = Phaser.Math.Between(100, WW - 100);
      const y = Phaser.Math.Between(100, WH - 100);
      // keep clear of the player/enemy spawn columns
      if (Math.abs(x - WW * 0.5) < 90 && (y > WH * 0.6 || y < WH * 0.3)) continue;
      if (spots.some((s) => Phaser.Math.Distance.Between(s.x, s.y, x, y) < 110)) continue;
      spots.push({ x, y });
    }
    // sort by y so nearer trees overlap farther ones naturally
    spots.sort((a, b) => a.y - b.y);
    spots.forEach((s) => {
      const t = this.trees.create(s.x, s.y, this.biome.tree);
      t.setDepth(5 + s.y / GAME.WORLD_HEIGHT); // depth by row
      // collision only around the trunk, so you can brush past the canopy
      t.body.setSize(20, 24, true);
      t.body.setOffset((t.width - 20) / 2, t.height - 30);
      t.refreshBody();
    });
  }

  useAbility() {
    if (this.gameOver) return;
    const now = this.time.now;

    // dual ability (Magma, Forest): each mode has its own cooldown
    if (this.character.ability === 'dual') {
      if (!this.dualMode || now < (this.dualReady[this.dualMode] || 0)) return;
      const cd = this.runDualMode(this.dualMode, now);
      this.dualReady[this.dualMode] = now + cd;
      this.updateLogHud();
      return;
    }

    if (now < this.abilityReadyAt) return;

    switch (this.character.ability) {
      case 'smash':
        this.smash();
        this.abilityReadyAt = now + this.abilityCooldown;
        break;
      case 'shield':
        this.activateShield(now);
        this.abilityReadyAt = now + this.abilityCooldown;
        break;
      case 'phase':
        this.activatePhase(now); // sets its own ready time (cooldown after it ends)
        break;
      case 'dash':
        this.dash(now);
        this.abilityReadyAt = now + this.abilityCooldown;
        break;
      case 'path':
        this.makePath();
        this.abilityReadyAt = now + this.abilityCooldown;
        break;
      case 'arrow':
        this.fireArrow();
        this.abilityReadyAt = now + this.abilityCooldown;
        break;
      case 'shotgun':
        this.fireShotgun();
        this.abilityReadyAt = now + this.abilityCooldown;
        break;
      case 'gamble':
        this.gamble(now);
        this.abilityReadyAt = now + this.abilityCooldown;
        break;
      case 'log':
      default:
        this.dropLog();
        this.abilityReadyAt = now + this.abilityCooldown;
        break;
    }
    this.updateLogHud();
  }

  dash(now) {
    const range = GAME.DASH_RANGE;
    const fromX = this.player.x, fromY = this.player.y;
    const nx = Phaser.Math.Clamp(fromX + this.faceDir.x * range, 20, GAME.WORLD_WIDTH - 20);
    const ny = Phaser.Math.Clamp(fromY + this.faceDir.y * range, 20, GAME.WORLD_HEIGHT - 20);

    // afterimage at the old spot
    const ghostImg = this.add.image(fromX, fromY, this.playerTex).setAlpha(0.5).setDepth(9);
    this.tweens.add({ targets: ghostImg, alpha: 0, scale: 0.7, duration: 260, onComplete: () => ghostImg.destroy() });

    this.player.setPosition(nx, ny);
    this.player.setVelocity(0, 0);
    this.score += GAME.DASH_POINTS;
    this.invulnUntil = now + GAME.DASH_INVULN; // pass through the Spook safely
    SFX.boost();

    for (let i = 0; i < 8; i++) {
      this.trail.emitParticleAt(nx + Phaser.Math.Between(-10, 10), ny + Phaser.Math.Between(-10, 10));
    }
  }

  makePath() {
    for (let i = 0; i < GAME.PATH_ORBS; i++) {
      const d = GAME.PATH_START + i * GAME.PATH_SPACING;
      const x = Phaser.Math.Clamp(this.player.x + this.faceDir.x * d, 30, GAME.WORLD_WIDTH - 30);
      const y = Phaser.Math.Clamp(this.player.y + this.faceDir.y * d, 30, GAME.WORLD_HEIGHT - 30);
      const orb = this.orbs.create(x, y, 'orb');
      orb.setCircle(8, 6, 6);
      orb.setDepth(6);
      orb.isPath = true; // bonus orb: collecting it doesn't respawn a field orb
      orb.setScale(0.4);
      this.tweens.add({ targets: orb, scale: { from: 0.9, to: 1.15 }, duration: 600, yoyo: true, repeat: -1 });
      this.time.delayedCall(GAME.PATH_LIFESPAN, () => { if (orb.active) orb.destroy(); });
    }
    SFX.click();
  }

  // Shared spawner for fired projectiles. Flies from the player in `angle`.
  spawnProjectile(kind, angle, speed, lifespan, tex, tint) {
    const p = this.projectiles.create(this.player.x, this.player.y, tex);
    p.kind = kind;
    p.setDepth(11).setRotation(angle);
    if (tint != null) p.setTint(tint);
    p.body.allowGravity = false;
    p.setBodySize(16, 16);
    p.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    // small spark trail behind the shot
    this.trail.emitParticleAt(this.player.x, this.player.y);
    this.time.delayedCall(lifespan, () => { if (p.active) p.destroy(); });
    return p;
  }

  fireArrow() {
    const ang = this.aimAngle();
    this.spawnProjectile('arrow', ang, GAME.ARROW_SPEED, GAME.ARROW_LIFESPAN, 'heartArrow');
    SFX.click();
  }

  fireShotgun() {
    const ang = this.aimAngle();
    this.spawnProjectile('shotgun', ang - GAME.SHOTGUN_SPREAD, GAME.SHOTGUN_SPEED, GAME.SHOTGUN_LIFESPAN, 'pellet');
    this.spawnProjectile('shotgun', ang + GAME.SHOTGUN_SPREAD, GAME.SHOTGUN_SPEED, GAME.SHOTGUN_LIFESPAN, 'pellet');
    this.cameras.main.shake(90, 0.005);
    SFX.slash();
  }

  hitProjectile(a, b) {
    const proj = a && a.kind ? a : b;
    if (!proj || !proj.active) return;
    const kind = proj.kind;
    proj.destroy();
    if (kind === 'arrow') this.arrowHit();
    else if (kind === 'shotgun') this.shotgunHit();
    else if (kind === 'vshot') this.voidShotHit();
  }

  // Pink: the Spook turns tail and flees for a couple of seconds.
  arrowHit() {
    const now = this.time.now;
    if (now < this.stunUntil || now < this.fleeUntil) return; // already reacting
    this.fleeUntil = now + GAME.ARROW_FLEE_DURATION;
    this.score += GAME.ARROW_HIT_POINTS;
    SFX.boost();
    this.enemy.setTint(0xff8fd0);
    for (let i = 0; i < 8; i++) {
      this.trail.emitParticleAt(this.enemy.x + Phaser.Math.Between(-14, 14), this.enemy.y + Phaser.Math.Between(-14, 8));
    }
    const txt = this.add.text(this.enemy.x, this.enemy.y - 54, '💘 FLEE! +' + GAME.ARROW_HIT_POINTS, {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ff8fd0',
    }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  // Black: a shotgun blast stuns the Spook. Only the first pellet counts.
  shotgunHit() {
    const now = this.time.now;
    if (now < this.stunUntil) return; // already stunned by the first pellet
    this.stunUntil = now + GAME.SHOTGUN_STUN_DURATION;
    this.score += GAME.SHOTGUN_HIT_POINTS;
    this.enemy.setVelocity(0, 0);
    SFX.caught();
    this.cameras.main.shake(170, 0.011);
    for (let i = 0; i < 12; i++) {
      this.trail.emitParticleAt(this.enemy.x + Phaser.Math.Between(-16, 16), this.enemy.y + Phaser.Math.Between(-16, 8));
    }
    const txt = this.add.text(this.enemy.x, this.enemy.y - 54, 'STUNNED! +' + GAME.SHOTGUN_HIT_POINTS, {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffe066',
    }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  // ---- Dual abilities (Shift to switch); each mode has its own cooldown ----
  // Run one dual mode and return its cooldown in ms.
  runDualMode(mode, now) {
    switch (mode) {
      case 'mud':   this.dropMud();       return GAME.MUD_COOLDOWN;
      case 'slide': this.fireSlide(now);  return GAME.SLIDE_COOLDOWN;
      case 'chop':  this.chopTree();      return GAME.CHOP_COOLDOWN;
      case 'grow':  this.growTrees();     return GAME.GROW_COOLDOWN;
      // Volt's sprint: cooldown starts only AFTER the 3s effect ends
      case 'sprint': this.startSprint(now); return GAME.SPRINT_DURATION + GAME.SPRINT_COOLDOWN;
      case 'taser':  this.taser();         return GAME.TASER_COOLDOWN;
      // Alien's UFO: cooldown starts only AFTER the 5s untouchable effect ends
      case 'ufo':   this.startUfo(now);   return GAME.UFO_DURATION + GAME.UFO_COOLDOWN;
      case 'laser': this.fireLaser();     return GAME.LASER_COOLDOWN;
      // Ninja: decoy lure / mid-range dash slice
      case 'decoy': this.spawnDecoy(now); return GAME.DECOY_COOLDOWN;
      case 'slice': this.ninjaDash(now);  return GAME.NINJA_DASH_COOLDOWN;
      // Chrono: rewind in time / slow the whole map
      case 'rewind': this.rewind(now);    return GAME.REWIND_COOLDOWN;
      case 'slowmo': this.startSlowMo(now); return GAME.SLOWMO_COOLDOWN;
      // Void: black hole / damaging bolt
      case 'blackhole': this.castBlackHole(now); return GAME.VOID_COOLDOWN;
      case 'vshot': this.fireVoidShot();  return GAME.VOID_SHOT_COOLDOWN;
      // Spider: web trap / zipline to nearest tree
      case 'webtrap': this.dropWeb();     return GAME.WEB_COOLDOWN;
      case 'zip': this.zipline(now);      return GAME.ZIP_COOLDOWN;
      default:      return 2000;
    }
  }

  switchDualMode() {
    if (this.gameOver || this.character.ability !== 'dual' || this.dualModes.length < 2) return;
    const i = this.dualModes.indexOf(this.dualMode);
    this.dualMode = this.dualModes[(i + 1) % this.dualModes.length];
    const info = DUAL_INFO[this.dualMode] || { icon: '', label: this.dualMode, color: 0xffffff };
    SFX.click();
    this.floatText(info.icon + ' ' + info.label.toUpperCase(), info.color);
    this.updateLogHud();
  }

  // ---- Forest ghost: chop a tree for orbs / grow a wall of trees ----
  chopTree() {
    // nearest tree to the player (chops anywhere on the map)
    let nearest = null, best = Infinity;
    this.trees.children.iterate((t) => {
      if (!t) return;
      const d = Phaser.Math.Distance.Between(t.x, t.y, this.player.x, this.player.y);
      if (d < best) { best = d; nearest = t; }
    });
    let ox = this.player.x, oy = this.player.y;
    if (nearest) {
      ox = nearest.x; oy = nearest.y;
      const chip = this.add.image(ox, oy, 'log').setScale(0.5).setDepth(9);
      this.tweens.add({ targets: chip, scale: 0, angle: 140, alpha: 0, duration: 420, onComplete: () => chip.destroy() });
      nearest.destroy();
    }
    for (let i = 0; i < 10; i++) {
      this.trail.emitParticleAt(ox + Phaser.Math.Between(-16, 16), oy + Phaser.Math.Between(-16, 16));
    }
    // scatter bonus orbs where the tree stood
    for (let i = 0; i < GAME.CHOP_ORBS; i++) {
      const a = (i / GAME.CHOP_ORBS) * Math.PI * 2;
      const x = Phaser.Math.Clamp(ox + Math.cos(a) * 42, 30, GAME.WORLD_WIDTH - 30);
      const y = Phaser.Math.Clamp(oy + Math.sin(a) * 42, 30, GAME.WORLD_HEIGHT - 30);
      const orb = this.orbs.create(x, y, 'orb');
      orb.setCircle(8, 6, 6);
      orb.setDepth(6);
      orb.isPath = true; // bonus orb: doesn't respawn a field orb
      orb.setScale(0.4);
      this.tweens.add({ targets: orb, scale: { from: 0.9, to: 1.15 }, duration: 600, yoyo: true, repeat: -1 });
      this.time.delayedCall(GAME.PATH_LIFESPAN, () => { if (orb.active) orb.destroy(); });
    }
    SFX.slash();
    this.floatText('🪓 +5 orbs', 0x8fe6a0);
  }

  growTrees() {
    // behind the player = opposite the facing direction; spread sideways
    const bx = -this.faceDir.x, by = -this.faceDir.y;
    const perpX = -this.faceDir.y, perpY = this.faceDir.x;
    for (let i = 0; i < GAME.GROW_TREES; i++) {
      const off = (i - (GAME.GROW_TREES - 1) / 2) * GAME.GROW_SPREAD;
      const x = Phaser.Math.Clamp(this.player.x + bx * GAME.GROW_DIST + perpX * off, 60, GAME.WORLD_WIDTH - 60);
      const y = Phaser.Math.Clamp(this.player.y + by * GAME.GROW_DIST + perpY * off, 60, GAME.WORLD_HEIGHT - 60);
      const t = this.trees.create(x, y, this.biome.tree);
      t.setDepth(5 + y / GAME.WORLD_HEIGHT);
      t.body.setSize(20, 24, true);
      t.body.setOffset((t.width - 20) / 2, t.height - 30);
      t.refreshBody();
      t.setAlpha(0.2);
      this.tweens.add({ targets: t, alpha: 1, duration: 300 });
      for (let k = 0; k < 5; k++) {
        this.trail.emitParticleAt(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10));
      }
    }
    SFX.click();
    this.floatText('🌲 tree!', 0x6fce6a);
  }

  // ---- Volt ghost: speed sprint / short-range taser ----
  startSprint(now) {
    this.sprintUntil = now + GAME.SPRINT_DURATION;
    SFX.boost();
    this.floatText('💨 SPRINT x' + GAME.SPRINT_MULT + '!', 0x8fd0ff);
  }

  taser() {
    const ang = this.aimAngle();
    const zx = this.player.x + Math.cos(ang) * 42;
    const zy = this.player.y + Math.sin(ang) * 42;
    const fx = this.add.image(zx, zy, 'zap').setRotation(ang).setDepth(12).setScale(0.8).setAlpha(0.95);
    this.tweens.add({ targets: fx, scale: 1.3, alpha: 0, duration: 220, onComplete: () => fx.destroy() });
    this.cameras.main.shake(80, 0.004);
    SFX.slash();

    // hit test: enemy within the short range and inside the forward cone
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
    if (dist <= GAME.TASER_RANGE && this.time.now >= this.stunUntil) {
      const toEnemy = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(toEnemy - ang));
      if (diff <= GAME.TASER_ARC / 2) {
        this.stunUntil = this.time.now + GAME.TASER_STUN_DURATION;
        this.score += GAME.TASER_POINTS;
        this.enemy.setVelocity(0, 0);
        SFX.caught();
        for (let i = 0; i < 10; i++) {
          this.trail.emitParticleAt(this.enemy.x + Phaser.Math.Between(-14, 14), this.enemy.y + Phaser.Math.Between(-14, 8));
        }
        const txt = this.add.text(this.enemy.x, this.enemy.y - 54, '⚡ ZAP! +' + GAME.TASER_POINTS, {
          fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffe066',
        }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
        this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
      }
    }
  }

  // ---- Alien ghost: UFO (untouchable) / bouncing laser ----
  startUfo(now) {
    this.ufoUntil = now + GAME.UFO_DURATION;
    this.lastUfoHit = 0;
    if (this.ufoSprite) this.ufoSprite.destroy();
    this.ufoSprite = this.add.image(this.player.x, this.player.y - 20, 'ufo').setDepth(13).setScale(0.4);
    this.tweens.add({ targets: this.ufoSprite, scale: 1, duration: 220, ease: 'Back.out' });
    SFX.boost();
    this.floatText('🛸 UFO! untouchable', 0x6bffb0);
    this.time.delayedCall(GAME.UFO_DURATION, () => this.endUfo());
  }

  endUfo() {
    if (this.ufoSprite) {
      const s = this.ufoSprite;
      this.ufoSprite = null;
      this.tweens.add({ targets: s, scale: 0, alpha: 0, y: s.y - 30, duration: 260,
        onComplete: () => s.destroy() });
    }
  }

  // Called from caught() while the UFO is up: score instead of dying.
  ufoHit(now) {
    if (now - this.lastUfoHit < GAME.UFO_HIT_GRACE) { this.knockbackEnemy(80); return; }
    this.lastUfoHit = now;
    this.score += GAME.UFO_HIT_POINTS;
    this.knockbackEnemy(120);
    SFX.boost();
    this.cameras.main.shake(90, 0.005);
    if (this.ufoSprite) {
      this.tweens.add({ targets: this.ufoSprite, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 1 });
    }
    for (let i = 0; i < 8; i++) {
      const p = this.trail.emitParticleAt(this.enemy.x + Phaser.Math.Between(-12, 12), this.enemy.y + Phaser.Math.Between(-12, 8));
      if (p && p.setTint) p.setTint(0x6bffb0);
    }
    const txt = this.add.text(this.enemy.x, this.enemy.y - 54, '🛸 +' + GAME.UFO_HIT_POINTS, {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#6bffb0',
    }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  // Fire a laser in the exact direction you're facing (no auto-aim). It
  // ricochets off the map edges and trees and stays alive until it hits the
  // Spook, so several lasers can be bouncing around the map at once.
  fireLaser() {
    // shoot the way the ghost is looking, not toward the Spook
    const ang = Math.atan2(this.faceDir.y, this.faceDir.x);
    const l = this.lasers.create(this.player.x, this.player.y, 'laser');
    l.setDepth(12).setRotation(ang);
    l.body.allowGravity = false;
    l.setCircle(6, 11, 1);
    l.setBounce(1, 1);
    l.setCollideWorldBounds(true);
    l.body.onWorldBounds = false;
    l.setVelocity(Math.cos(ang) * GAME.LASER_SPEED, Math.sin(ang) * GAME.LASER_SPEED);
    l.isLaser = true; // marker so the overlap callback can tell it from the Spook
    l.bornAt = this.time.now;
    SFX.slash();
  }

  hitLaser(a, b) {
    // Phaser may pass (laser, enemy) or (enemy, laser) — pick the laser out.
    const laser = (a && a.isLaser) ? a : b;
    if (!laser || !laser.active) return;
    const now = this.time.now;
    laser.destroy();
    if (now < this.stunUntil) return; // already stunned
    this.stunUntil = now + GAME.LASER_STUN_DURATION;
    this.score += GAME.LASER_HIT_POINTS;
    this.enemy.setVelocity(0, 0);
    SFX.caught();
    this.cameras.main.shake(160, 0.01);
    for (let i = 0; i < 12; i++) {
      const p = this.trail.emitParticleAt(this.enemy.x + Phaser.Math.Between(-16, 16), this.enemy.y + Phaser.Math.Between(-16, 8));
      if (p && p.setTint) p.setTint(0x2fff9a);
    }
    const txt = this.add.text(this.enemy.x, this.enemy.y - 54, '🟢 STUNNED! +' + GAME.LASER_HIT_POINTS, {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#2fff9a',
    }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  // ---- Lucky ghost: Gamble for one of six random effects ----
  gamble(now) {
    const roll = Phaser.Math.Between(0, 5);
    this.cameras.main.flash(120, 255, 240, 160);
    switch (roll) {
      case 0: { // orb burst + double-orb-points buff
        const ox = this.player.x, oy = this.player.y;
        for (let i = 0; i < GAME.GAMBLE_ORBS; i++) {
          const a = (i / GAME.GAMBLE_ORBS) * Math.PI * 2;
          const x = Phaser.Math.Clamp(ox + Math.cos(a) * 46, 30, GAME.WORLD_WIDTH - 30);
          const y = Phaser.Math.Clamp(oy + Math.sin(a) * 46, 30, GAME.WORLD_HEIGHT - 30);
          const orb = this.orbs.create(x, y, 'orb');
          orb.setCircle(8, 6, 6); orb.setDepth(6); orb.isPath = true; orb.setScale(0.4);
          this.tweens.add({ targets: orb, scale: { from: 0.9, to: 1.15 }, duration: 600, yoyo: true, repeat: -1 });
          this.time.delayedCall(GAME.PATH_LIFESPAN, () => { if (orb.active) orb.destroy(); });
        }
        this.orbBonusUntil = now + GAME.GAMBLE_ORB_BUFF_MS;
        SFX.pickup(); this.floatText('🍀 ORB BURST! x2 orbs', 0xffd54a);
        break;
      }
      case 1: // 3x speed burst (reuses the sprint multiplier)
        this.sprintUntil = now + GAME.GAMBLE_SPEED_MS;
        SFX.boost(); this.floatText('💨 SPEED x3!', 0x9be87a);
        break;
      case 2: // invincible + walk through trees
        this.invulnUntil = now + GAME.GAMBLE_INVULN_MS;
        this.playerTreeCollider.active = false;
        this.time.delayedCall(GAME.GAMBLE_INVULN_MS, () => {
          if (!(this.charKey === 'purple' && this.phasing)) this.playerTreeCollider.active = true;
        });
        this.tweens.add({ targets: this.player, alpha: 0.45, duration: 200, yoyo: true, repeat: 11,
          onComplete: () => { if (this.player.active) this.player.setAlpha(this.phasing ? 0.45 : 1); } });
        SFX.boost(); this.floatText('🛡️ INVINCIBLE!', 0x9fffce);
        break;
      case 3: // stun the Spook
        this.stunUntil = now + GAME.GAMBLE_STUN_MS;
        this.enemy.setVelocity(0, 0);
        SFX.caught(); this.cameras.main.shake(140, 0.008);
        this.floatText('⚡ STUN!', 0xffe066);
        break;
      case 4: // jackpot points
        this.score += GAME.GAMBLE_POINTS;
        SFX.pickup(); this.floatText('🎯 +' + GAME.GAMBLE_POINTS + '!', 0xffd54a);
        break;
      default: // scare the Spook away
        this.fleeUntil = now + GAME.GAMBLE_FLEE_MS;
        SFX.boost(); this.floatText('😱 SPOOK SCARED!', 0xff8fd0);
        break;
    }
  }

  // ---- Ninja ghost: decoy lure / mid-range dash slice ----
  spawnDecoy(now) {
    // send the Spook to this spot for a while
    this.lurePoint = { x: this.player.x, y: this.player.y };
    this.lureUntil = now + GAME.DECOY_DURATION;

    if (this.decoySprite) this.decoySprite.destroy();
    if (this.decoyGlow) this.decoyGlow.destroy();
    this.decoyGlow = this.add.image(this.player.x, this.player.y, 'glow')
      .setDepth(8).setBlendMode(Phaser.BlendModes.ADD).setTint(0xbfc2d0).setAlpha(0.5).setScale(0.9);
    this.decoySprite = this.add.image(this.player.x, this.player.y, this.playerTex)
      .setDepth(9).setAlpha(0.65).setFlipX(this.player.flipX);
    this.tweens.add({ targets: this.decoySprite, alpha: { from: 0.65, to: 0.4 }, duration: 400, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.decoyGlow, scale: { from: 0.85, to: 1.05 }, alpha: { from: 0.5, to: 0.25 }, duration: 500, yoyo: true, repeat: -1 });

    SFX.click();
    this.floatText('🌀 DECOY!', 0xbfc2d0);
    this.time.delayedCall(GAME.DECOY_DURATION, () => this.clearDecoy());
  }

  clearDecoy() {
    if (this.decoySprite) {
      const s = this.decoySprite; this.decoySprite = null;
      this.tweens.add({ targets: s, alpha: 0, scale: 0.6, duration: 260, onComplete: () => s.destroy() });
    }
    if (this.decoyGlow) { this.decoyGlow.destroy(); this.decoyGlow = null; }
  }

  ninjaDash(now) {
    const fromX = this.player.x, fromY = this.player.y;
    const toX = Phaser.Math.Clamp(fromX + this.faceDir.x * GAME.NINJA_DASH_RANGE, 20, GAME.WORLD_WIDTH - 20);
    const toY = Phaser.Math.Clamp(fromY + this.faceDir.y * GAME.NINJA_DASH_RANGE, 20, GAME.WORLD_HEIGHT - 20);

    this.invulnUntil = now + GAME.NINJA_DASH_INVULN;
    SFX.slash();
    this.cameras.main.shake(90, 0.004);

    // pass through trees during the dash
    this.playerTreeCollider.active = false;

    // a bright slice streak in the dash direction
    const ang = Math.atan2(this.faceDir.y, this.faceDir.x);
    const fx = this.add.image(fromX, fromY, 'slash').setRotation(ang).setDepth(12).setScale(0.7).setAlpha(0.9);
    this.tweens.add({ targets: fx, x: toX, y: toY, alpha: 0, duration: GAME.NINJA_DASH_DURATION + 120, onComplete: () => fx.destroy() });

    // slice hit: does the dash line pass through the Spook?
    if (now >= this.stunUntil) {
      const d = this.distToSegment(this.enemy.x, this.enemy.y, fromX, fromY, toX, toY);
      if (d <= 46) {
        this.stunUntil = now + GAME.NINJA_DASH_STUN;
        this.score += GAME.NINJA_DASH_POINTS;
        this.enemy.setVelocity(0, 0);
        SFX.caught();
        for (let i = 0; i < 10; i++) {
          this.trail.emitParticleAt(this.enemy.x + Phaser.Math.Between(-14, 14), this.enemy.y + Phaser.Math.Between(-14, 8));
        }
        const txt = this.add.text(this.enemy.x, this.enemy.y - 54, '⚔️ SLICE! +' + GAME.NINJA_DASH_POINTS, {
          fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ff6b7a',
        }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
        this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
      }
    }

    // glide the player across, leaving a trail
    this.player.setVelocity(0, 0);
    this.tweens.add({
      targets: this.player, x: toX, y: toY, duration: GAME.NINJA_DASH_DURATION, ease: 'Quad.out',
      onUpdate: () => { this.trail.emitParticleAt(this.player.x, this.player.y); },
      onComplete: () => {
        if (!(this.charKey === 'purple' && this.phasing)) this.playerTreeCollider.active = true;
      },
    });
  }

  // ---- Chrono ghost: rewind in time / slow the whole map ----
  rewind(now) {
    // find the recorded position closest to REWIND_MS ago
    const want = now - GAME.REWIND_MS;
    let best = null, bestDiff = Infinity;
    for (const p of this.posHistory) {
      const diff = Math.abs(p.t - want);
      if (diff < bestDiff) { bestDiff = diff; best = p; }
    }
    if (!best) best = this.posHistory[0];
    const fromX = this.player.x, fromY = this.player.y;
    const tx = best ? best.x : fromX, ty = best ? best.y : fromY;

    // ghostly echo left behind at the old spot
    const echo = this.add.image(fromX, fromY, this.playerTex).setDepth(9).setAlpha(0.6).setTint(0x2fd6c0);
    this.tweens.add({ targets: echo, alpha: 0, scale: 0.7, duration: 400, onComplete: () => echo.destroy() });

    this.player.setPosition(tx, ty);
    this.invulnUntil = now + GAME.REWIND_INVULN;
    for (let i = 0; i < 10; i++) {
      const p = this.trail.emitParticleAt(tx + Phaser.Math.Between(-14, 14), ty + Phaser.Math.Between(-14, 14));
      if (p && p.setTint) p.setTint(0x2fd6c0);
    }
    SFX.boost();
    this.floatText('⏪ REWIND!', 0x2fd6c0);
  }

  startSlowMo(now) {
    this.slowMoUntil = now + GAME.SLOWMO_MS;
    // a cool tint wash over the world to sell the slow-mo
    if (this.slowMoFx) this.slowMoFx.destroy();
    this.slowMoFx = this.add.rectangle(GAME.WORLD_WIDTH / 2, GAME.WORLD_HEIGHT / 2, GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT, 0x2fd6c0, 0.14)
      .setDepth(7).setBlendMode(Phaser.BlendModes.SCREEN);
    this.time.delayedCall(GAME.SLOWMO_MS, () => { if (this.slowMoFx) { this.slowMoFx.destroy(); this.slowMoFx = null; } });
    SFX.boost();
    this.floatText('⏱️ SLOW-MO!', 0xffd54a);
  }

  // ---- Void ghost: throw a black hole that pulls the Spook and vacuums orbs ----
  castBlackHole(now) {
    const vx = Phaser.Math.Clamp(this.player.x + this.faceDir.x * GAME.VOID_THROW_DIST, 40, GAME.WORLD_WIDTH - 40);
    const vy = Phaser.Math.Clamp(this.player.y + this.faceDir.y * GAME.VOID_THROW_DIST, 40, GAME.WORLD_HEIGHT - 40);
    if (this.blackHole && this.blackHole.sprite) this.blackHole.sprite.destroy();
    const sprite = this.add.image(vx, vy, 'voidHole').setDepth(10).setScale(0.3);
    this.tweens.add({ targets: sprite, scale: 1, duration: 220, ease: 'Back.out' });
    this.blackHole = { x: vx, y: vy, until: now + GAME.VOID_MS, sprite };
    SFX.slash();
    this.floatText('🕳️ BLACK HOLE!', 0xc79cff);
    this.time.delayedCall(GAME.VOID_MS, () => this.clearBlackHole());
  }

  clearBlackHole() {
    if (this.blackHole && this.blackHole.sprite) {
      const s = this.blackHole.sprite;
      this.tweens.add({ targets: s, scale: 0, alpha: 0, angle: 180, duration: 260, onComplete: () => s.destroy() });
    }
    this.blackHole = null;
  }

  // Per-frame: spin the hole, vacuum nearby orbs into it and award them to you.
  updateBlackHole(time) {
    const bh = this.blackHole;
    if (!bh || !bh.sprite) return;
    bh.sprite.rotation += 0.15;
    // the Spook reaching the void takes 1 damage (once per black hole)
    if (!bh.damaged && Phaser.Math.Distance.Between(this.enemy.x, this.enemy.y, bh.x, bh.y) < 40) {
      bh.damaged = true;
      this.damageSpook(GAME.VOID_BLACKHOLE_DAMAGE, this.time.now);
    }
    const r = GAME.VOID_PULL_RADIUS;
    this.orbs.children.iterate((orb) => {
      if (!orb || !orb.active) return;
      const d = Phaser.Math.Distance.Between(orb.x, orb.y, bh.x, bh.y);
      if (d > r) return;
      if (d < 16) { this.vacuumOrb(orb); return; }
      const a = Phaser.Math.Angle.Between(orb.x, orb.y, bh.x, bh.y);
      const step = GAME.VOID_ORB_SPEED * (1 / 60);
      orb.x += Math.cos(a) * step;
      orb.y += Math.sin(a) * step;
    });
  }

  // An orb reached the void: award it to the player (like collecting it).
  vacuumOrb(orb) {
    const wasPath = orb.isPath;
    orb.destroy();
    const orbMult = (this.charKey === 'brown' || this.time.now < this.orbBonusUntil) ? GAME.BROWN_ORB_MULTIPLIER : 1;
    this.score += GAME.ORB_POINTS * orbMult;
    this.runCoins += GAME.ORB_COINS;
    Storage.addCoins(GAME.ORB_COINS);
    if (this.coinsText) this.coinsText.setText('🪙 ' + this.runCoins);
    SFX.pickup();
    if (this.blackHole) {
      for (let i = 0; i < 3; i++) {
        const p = this.trail.emitParticleAt(this.blackHole.x + Phaser.Math.Between(-8, 8), this.blackHole.y + Phaser.Math.Between(-8, 8));
        if (p && p.setTint) p.setTint(0xc79cff);
      }
    }
    if (!wasPath) this.spawnOrb(); // keep the field stocked
  }

  // Void bolt: fired the way you face; damages + briefly stuns the Spook.
  fireVoidShot() {
    const ang = Math.atan2(this.faceDir.y, this.faceDir.x);
    this.spawnProjectile('vshot', ang, GAME.VOID_SHOT_SPEED, GAME.VOID_SHOT_LIFESPAN, 'pellet', 0xc79cff);
    SFX.click();
  }

  voidShotHit() {
    const now = this.time.now;
    this.stunUntil = Math.max(this.stunUntil, now + GAME.VOID_SHOT_STUN);
    this.enemy.setVelocity(0, 0);
    for (let i = 0; i < 6; i++) {
      const p = this.trail.emitParticleAt(this.enemy.x + Phaser.Math.Between(-12, 12), this.enemy.y + Phaser.Math.Between(-12, 8));
      if (p && p.setTint) p.setTint(0xc79cff);
    }
    this.damageSpook(GAME.VOID_SHOT_DAMAGE, now);
  }

  // Void boss: chip the Spook's health; on 0 it's defeated for a big reward.
  damageSpook(amount, now) {
    if (this.charKey !== 'void') return;
    this.spookHp -= amount;
    this.updateSpookHpBar();
    const t = this.add.text(this.enemy.x, this.enemy.y - 62, '-' + amount, {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ff8fd0',
    }).setOrigin(0.5).setDepth(21).setShadow(0, 2, '#000', 3);
    this.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 700, onComplete: () => t.destroy() });
    if (this.spookHp <= 0) this.killSpook(now);
  }

  killSpook(now) {
    this.score += GAME.VOID_KILL_POINTS;
    SFX.caught();
    this.cameras.main.shake(320, 0.02);
    this.cameras.main.flash(300, 200, 120, 255);
    for (let i = 0; i < 24; i++) {
      const p = this.trail.emitParticleAt(this.enemy.x + Phaser.Math.Between(-26, 26), this.enemy.y + Phaser.Math.Between(-26, 26));
      if (p && p.setTint) p.setTint(Phaser.Math.RND.pick([0xc79cff, 0x8f5fd0, 0xffffff]));
    }
    const big = this.add.text(this.scale.width / 2, this.scale.height * 0.4, '🕳️ SPOOK DOWN!\n+' + GAME.VOID_KILL_POINTS, {
      fontFamily: 'system-ui, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#c79cff', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setShadow(0, 3, '#000', 8);
    this.tweens.add({ targets: big, scale: { from: 1.3, to: 1 }, alpha: { from: 1, to: 0 }, duration: 1600, onComplete: () => big.destroy() });

    // respawn: same speed it died at, full health, dropped far from the player
    this.spookHp = GAME.SPOOK_MAX_HP;
    this.stunUntil = 0; this.fleeUntil = 0; this.slowUntil = 0; this.slowMoUntil = 0;
    const nx = this.player.x < GAME.WORLD_WIDTH / 2 ? GAME.WORLD_WIDTH - 90 : 90;
    const ny = this.player.y < GAME.WORLD_HEIGHT / 2 ? GAME.WORLD_HEIGHT - 90 : 90;
    this.enemy.setPosition(nx, ny);
    this.enemy.clearTint();
    this.updateSpookHpBar();
  }

  updateSpookHpBar() {
    if (this.charKey !== 'void' || !this.spookHpBar) return;
    const g = this.spookHpBar; g.clear();
    const w = 50, h = 6;
    const x = this.enemy.x - w / 2, y = this.enemy.y - 50;
    const frac = Phaser.Math.Clamp(this.spookHp / GAME.SPOOK_MAX_HP, 0, 1);
    g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, 3);
    g.fillStyle(0x3a2030, 1); g.fillRect(x, y, w, h);
    g.fillStyle(frac > 0.3 ? 0xff5b6e : 0xffd54a, 1); g.fillRect(x, y, w * frac, h);
  }

  // ---- Spider ghost: web trap / zipline to the farthest tree ----
  dropWeb() {
    const web = this.webs.create(this.player.x, this.player.y, 'web');
    web.setDepth(4);
    web.setBodySize(64, 40);
    web.setImmovable(true);
    web.body.allowGravity = false;
    web.setScale(0.4).setAlpha(0.95);
    this.tweens.add({ targets: web, scale: 1, duration: 180, ease: 'Back.out' });
    SFX.click();
    this.time.delayedCall(GAME.WEB_LIFESPAN - 1500, () => {
      if (web.active) this.tweens.add({ targets: web, alpha: 0.15, duration: 1500 });
    });
    this.time.delayedCall(GAME.WEB_LIFESPAN, () => { if (web.active) web.destroy(); });
    this.floatText('🕸️ WEB!', 0x9fff8a);
  }

  hitWeb(enemy, web) {
    if (!web.active) return;
    web.destroy();
    const now = this.time.now;
    this.rootUntil = now + GAME.WEB_ROOT_MS;
    this.enemy.setVelocity(0, 0);
    this.score += GAME.WEB_POINTS;
    SFX.caught();
    for (let i = 0; i < 8; i++) {
      const p = this.trail.emitParticleAt(this.enemy.x + Phaser.Math.Between(-14, 14), this.enemy.y + Phaser.Math.Between(-14, 8));
      if (p && p.setTint) p.setTint(0x9fff8a);
    }
    const txt = this.add.text(this.enemy.x, this.enemy.y - 54, '🕸️ STUCK! +' + GAME.WEB_POINTS, {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#9fff8a',
    }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  zipline(now) {
    // FARTHEST tree anywhere on the map (biggest possible escape)
    let target = null, best = -1;
    this.trees.children.iterate((t) => {
      if (!t) return;
      const d = Phaser.Math.Distance.Between(t.x, t.y, this.player.x, this.player.y);
      if (d > best) { best = d; target = t; }
    });
    if (!target) { this.floatText('no tree!', 0x9fff8a); return; }

    // land just short of the tree so you don't get stuck in its trunk
    const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const toX = Phaser.Math.Clamp(target.x - Math.cos(a) * 30, 20, GAME.WORLD_WIDTH - 20);
    const toY = Phaser.Math.Clamp(target.y - Math.sin(a) * 30, 20, GAME.WORLD_HEIGHT - 20);

    // a web line drawn from the player to the tree
    const line = this.add.line(0, 0, this.player.x, this.player.y, target.x, target.y, 0xe6ffe6, 0.9)
      .setOrigin(0, 0).setDepth(12).setLineWidth(1.5);
    this.tweens.add({ targets: line, alpha: 0, duration: GAME.ZIP_DURATION + 160, onComplete: () => line.destroy() });

    this.invulnUntil = now + GAME.ZIP_INVULN;
    this.playerTreeCollider.active = false;
    this.player.setVelocity(0, 0);
    SFX.boost();
    this.floatText('🧵 ZIP!', 0x8fe6a0);
    this.tweens.add({
      targets: this.player, x: toX, y: toY, duration: GAME.ZIP_DURATION, ease: 'Quad.out',
      onUpdate: () => {
        const p = this.trail.emitParticleAt(this.player.x, this.player.y);
        if (p && p.setTint) p.setTint(0x9fff8a);
      },
      onComplete: () => {
        if (!(this.charKey === 'purple' && this.phasing)) this.playerTreeCollider.active = true;
      },
    });
  }

  // Mud pool trap: slows the Spook and scores when it walks through.
  dropMud() {
    const mud = this.mudpools.create(this.player.x, this.player.y, 'mud');
    mud.setDepth(4);
    mud.setBodySize(72, 30);
    mud.setImmovable(true);
    mud.body.allowGravity = false;
    mud.setScale(0.4).setAlpha(0.96);
    this.tweens.add({ targets: mud, scale: 1, duration: 180, ease: 'Back.out' });
    SFX.click();
    this.time.delayedCall(GAME.MUD_LIFESPAN - 1500, () => {
      if (mud.active) this.tweens.add({ targets: mud, alpha: 0.15, duration: 1500 });
    });
    this.time.delayedCall(GAME.MUD_LIFESPAN, () => { if (mud.active) mud.destroy(); });
  }

  hitMud(enemy, mud) {
    if (!mud.active) return;
    mud.destroy();
    this.slowUntil = this.time.now + GAME.MUD_SLOW_DURATION;
    this.score += GAME.MUD_HIT_POINTS;
    SFX.boost();
    for (let i = 0; i < 8; i++) {
      this.trail.emitParticleAt(enemy.x + Phaser.Math.Between(-12, 12), enemy.y + Phaser.Math.Between(-6, 12));
    }
    const txt = this.add.text(enemy.x, enemy.y - 50, 'STUCK! +' + GAME.MUD_HIT_POINTS, {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#c9a26a',
    }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  // Fire slide: a fast mid-range dash that burns any trees on its path.
  fireSlide(now) {
    const fromX = this.player.x, fromY = this.player.y;
    const toX = Phaser.Math.Clamp(fromX + this.faceDir.x * GAME.SLIDE_RANGE, 20, GAME.WORLD_WIDTH - 20);
    const toY = Phaser.Math.Clamp(fromY + this.faceDir.y * GAME.SLIDE_RANGE, 20, GAME.WORLD_HEIGHT - 20);

    this.score += GAME.SLIDE_POINTS;
    this.invulnUntil = now + GAME.SLIDE_INVULN;
    SFX.boost();
    this.cameras.main.shake(120, 0.005);

    // pass through trees during the slide
    this.playerTreeCollider.active = false;

    // burn trees close to the slide path
    this.burnTreesAlong(fromX, fromY, toX, toY);

    // glide the player across, leaving a fiery trail
    this.player.setVelocity(0, 0);
    this.tweens.add({
      targets: this.player, x: toX, y: toY, duration: GAME.SLIDE_DURATION, ease: 'Quad.out',
      onUpdate: () => {
        const p = this.trail.emitParticleAt(this.player.x, this.player.y);
        if (p && p.setTint) p.setTint(0xff7a2a);
      },
      onComplete: () => {
        // restore tree collision unless the purple phase is active
        if (!(this.charKey === 'purple' && this.phasing)) this.playerTreeCollider.active = true;
      },
    });
  }

  burnTreesAlong(x1, y1, x2, y2) {
    const r = GAME.SLIDE_BURN_RADIUS;
    const toBurn = [];
    this.trees.children.iterate((t) => {
      if (!t) return;
      if (this.distToSegment(t.x, t.y, x1, y1, x2, y2) <= r) toBurn.push(t);
    });
    toBurn.forEach((t) => {
      const tx = t.x, ty = t.y;
      t.destroy();
      // fiery burst where the tree stood
      const flame = this.add.image(tx, ty, 'spark').setTint(0xff6a1a).setScale(3).setDepth(9);
      this.tweens.add({ targets: flame, scale: 6, alpha: 0, duration: 420, onComplete: () => flame.destroy() });
      for (let i = 0; i < 10; i++) {
        const p = this.trail.emitParticleAt(tx + Phaser.Math.Between(-16, 16), ty + Phaser.Math.Between(-20, 10));
        if (p && p.setTint) p.setTint(Phaser.Math.RND.pick([0xff7a2a, 0xffb020, 0xff3a10]));
      }
    });
  }

  // Shortest distance from point (px,py) to the segment (x1,y1)-(x2,y2).
  distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
    t = Phaser.Math.Clamp(t, 0, 1);
    return Phaser.Math.Distance.Between(px, py, x1 + t * dx, y1 + t * dy);
  }

  activateShield(now) {
    this.shieldUntil = now + GAME.SHIELD_DURATION;
    if (this.shieldFx) this.shieldFx.destroy();
    this.shieldFx = this.add.image(this.player.x, this.player.y, 'shield').setDepth(11).setAlpha(0.95);
    this.tweens.add({ targets: this.shieldFx, scale: { from: 0.7, to: 1.05 }, duration: 200, ease: 'Back.out' });
    SFX.click();
  }

  activatePhase(now) {
    this.phaseUntil = now + GAME.PHASE_DURATION;
    this.abilityReadyAt = this.phaseUntil + GAME.PHASE_COOLDOWN; // cooldown starts after it ends
    SFX.boost();
    const txt = this.add.text(this.player.x, this.player.y - 44, 'PHASE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#d8b0ff',
    }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
    this.tweens.add({ targets: txt, y: txt.y - 26, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
  }

  // Direction an offensive ability fires: normally your facing, but when the
  // Spook is close it auto-aims at the Spook so point-blank hits always land.
  aimAngle() {
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
    if (dist <= GAME.AUTO_AIM_RANGE) {
      return Phaser.Math.Angle.Between(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
    }
    return Math.atan2(this.faceDir.y, this.faceDir.x);
  }

  smash() {
    const ang = this.aimAngle();
    const cos = Math.cos(ang), sin = Math.sin(ang);

    // slash visual sweeping in front of the player
    const slash = this.add.image(this.player.x, this.player.y, 'slash')
      .setDepth(12).setRotation(ang).setScale(0.7).setAlpha(0.95).setTint(0xffdede);
    this.tweens.add({ targets: slash, scale: 2.1, alpha: 0, duration: 240, ease: 'Quad.out',
      onComplete: () => slash.destroy() });
    this.cameras.main.shake(90, 0.004);
    SFX.slash();

    // hit test: enemy within range and inside the forward cone
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
    if (dist <= GAME.SMASH_RANGE && this.time.now >= this.stunUntil) {
      const toEnemy = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(toEnemy - ang));
      if (diff <= GAME.SMASH_ARC / 2) this.stunEnemy();
    }
  }

  stunEnemy() {
    this.stunUntil = this.time.now + GAME.SMASH_STUN_DURATION;
    this.score += GAME.SMASH_HIT_POINTS;
    this.enemy.setVelocity(0, 0);
    SFX.caught();
    this.cameras.main.shake(180, 0.012);
    for (let i = 0; i < 12; i++) {
      this.trail.emitParticleAt(this.enemy.x + Phaser.Math.Between(-16, 16), this.enemy.y + Phaser.Math.Between(-16, 8));
    }
    const txt = this.add.text(this.enemy.x, this.enemy.y - 54, 'STUNNED! +' + GAME.SMASH_HIT_POINTS, {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffe066',
    }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  dropLog() {
    const log = this.logs.create(this.player.x, this.player.y, 'log');
    log.setDepth(4);
    log.setBodySize(78, 34);
    log.setImmovable(true);
    log.body.allowGravity = false;
    log.setAngle(Phaser.Math.Between(-20, 20));
    log.setScale(0.4);
    this.tweens.add({ targets: log, scale: 1, duration: 180, ease: 'Back.out' });
    SFX.click();

    // fade out and remove near the end of its life
    this.time.delayedCall(GAME.LOG_LIFESPAN - 1500, () => {
      if (!log.active) return;
      this.tweens.add({ targets: log, alpha: 0.15, duration: 1500 });
    });
    this.time.delayedCall(GAME.LOG_LIFESPAN, () => { if (log.active) log.destroy(); });

    this.updateLogHud();
  }

  hitLog(enemy, log) {
    if (!log.active) return;
    log.destroy();
    this.slowUntil = this.time.now + GAME.LOG_SLOW_DURATION;
    this.abilityReadyAt = this.time.now; // refresh the log cooldown immediately
    this.updateLogHud();
    SFX.boost();
    // leafy puff where the Spook trips
    for (let i = 0; i < 8; i++) {
      this.trail.emitParticleAt(enemy.x + Phaser.Math.Between(-12, 12), enemy.y + Phaser.Math.Between(-6, 12));
    }
    const txt = this.add.text(enemy.x, enemy.y - 50, 'SLOW!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#9fe0ff',
    }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
  }

  spawnOrb() {
    const WW = GAME.WORLD_WIDTH, WH = GAME.WORLD_HEIGHT;
    let x, y, ok = false, tries = 0;
    while (!ok && tries < 60) {
      tries++;
      x = Phaser.Math.Between(60, WW - 60);
      y = Phaser.Math.Between(60, WH - 60);
      ok = true;
      this.trees.children.iterate((g) => {
        if (g && Phaser.Math.Distance.Between(g.x, g.y, x, y) < 64) ok = false;
      });
      if (this.player && Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) < 120) ok = false;
    }
    const orb = this.orbs.create(x, y, 'orb');
    orb.setCircle(8, 6, 6);
    orb.setDepth(6);
    this.tweens.add({ targets: orb, scale: { from: 0.85, to: 1.15 }, duration: 600, yoyo: true, repeat: -1 });
  }

  collectOrb(player, orb) {
    const wasPath = orb.isPath;
    const ox = orb.x, oy = orb.y;
    orb.destroy();
    // Brown ghost (always) or Lucky's orb-burst buff earn double orb points
    const doubleOrbs = (this.charKey === 'brown') || (this.time.now < this.orbBonusUntil);
    const orbMult = doubleOrbs ? GAME.BROWN_ORB_MULTIPLIER : 1;
    this.score += GAME.ORB_POINTS * orbMult;
    if (orbMult > 1) this.floatText('+' + (GAME.ORB_POINTS * orbMult), 0xffd54a);
    this.runCoins += GAME.ORB_COINS;
    Storage.addCoins(GAME.ORB_COINS);
    if (this.coinsText) this.coinsText.setText('🪙 ' + this.runCoins);
    this.boostUntil = this.time.now + GAME.BOOST_DURATION;
    SFX.pickup();
    SFX.boost();
    // subtle local sparkle at the orb (no full-screen colour flash)
    for (let i = 0; i < 5; i++) {
      this.trail.emitParticleAt(ox + Phaser.Math.Between(-8, 8), oy + Phaser.Math.Between(-8, 8));
    }
    // energy pulse ring around the ghost
    this.energyPulse(this.player.x, this.player.y);
    // only field orbs keep the map stocked; bonus path orbs don't respawn
    if (!wasPath) this.spawnOrb();
  }

  energyPulse(x, y) {
    const color = this.boostTint();
    const ring = this.add.circle(x, y, 16, 0x000000, 0)
      .setStrokeStyle(3, color, 0.9).setDepth(11);
    this.tweens.add({
      targets: ring, scale: 3.2, alpha: 0, duration: 430, ease: 'Quad.out',
      onComplete: () => ring.destroy(),
    });
  }

  buildHUD() {
    const W = this.scale.width;
    this.scoreText = this.add.text(16, 14, 'Score: 0', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
    }).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 4);

    this.hiText = this.add.text(16, 42, 'Best (' + Settings.difficulty().label + '): ' + Storage.getHighscore(this.difficultyKey), {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ffd54a',
    }).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 4);

    // coins earned this run
    this.coinsText = this.add.text(16, 64, '🪙 0', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffd54a',
    }).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 4);

    // lives (only shown for characters with more than one life)
    this.livesText = this.add.text(16, 88, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ff8a8a',
    }).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 4);
    this.updateLivesHud();

    this.muteBtn = this.add.text(W - 16, 14, SFX.muted ? '🔇' : '🔊', {
      fontSize: '26px',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(2000).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', (p, x, y, event) => {
      if (event) event.stopPropagation();
      this.toggleMute();
    });

    // atmospheric vignette: soft darkening at the screen edges
    this.vignette = this.add.image(0, 0, 'vignette')
      .setOrigin(0).setScrollFactor(0).setDepth(900).setDisplaySize(W, this.scale.height);

    // danger vignette (screen edge glow when the spook is close)
    this.danger = this.add.rectangle(0, 0, W, this.scale.height, 0xff2b2b)
      .setOrigin(0).setScrollFactor(0).setDepth(1500).setAlpha(0);

    // log-throw readiness indicator (bottom-left)
    const H = this.scale.height;
    this.logHud = this.add.text(16, H - 34, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#c9a26a',
    }).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 4);
    this.updateLogHud();

    // touch: a button to use the ability
    if (this.sys.game.device.input.touch) {
      const label = this.character.icon + ' ' + this.character.abilityName.toUpperCase();
      this.logBtn = this.add.text(W - 20, H - 20, label, {
        fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
        backgroundColor: this.charKey === 'red' ? '#4a1e24' : '#3a2a1e', padding: { x: 16, y: 12 },
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(2000).setInteractive({ useHandCursor: true });
      this.logBtn.on('pointerdown', (p, x, y, event) => {
        if (event) event.stopPropagation();
        this.useAbility();
      });
      // dual characters get a second button to switch abilities
      if (this.character.ability === 'dual') {
        this.switchBtn = this.add.text(W - 20, H - 78, '🔄 SWITCH', {
          fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
          backgroundColor: '#3a1e1e', padding: { x: 14, y: 10 },
        }).setOrigin(1, 1).setScrollFactor(0).setDepth(2000).setInteractive({ useHandCursor: true });
        this.switchBtn.on('pointerdown', (p, x, y, event) => {
          if (event) event.stopPropagation();
          this.switchDualMode();
        });
      }
    }

    // keep the HUD anchored to the corners when the window resizes
    this.layoutHud();
    const onResize = () => this.layoutHud();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  layoutHud() {
    const W = this.scale.width, H = this.scale.height;
    if (this.muteBtn) this.muteBtn.setPosition(W - 16, 14);
    if (this.vignette) this.vignette.setDisplaySize(W, H).setPosition(0, 0);
    if (this.danger) this.danger.setDisplaySize(W, H).setPosition(0, 0);
    if (this.logHud) this.logHud.setPosition(16, H - 34);
    if (this.logBtn) this.logBtn.setPosition(W - 20, H - 20);
    if (this.switchBtn) this.switchBtn.setPosition(W - 20, H - 78);
  }

  updateLogHud() {
    if (!this.logHud) return;
    const now = this.time.now;

    // dual ability (Magma, Forest): show the current mode + its own cooldown
    if (this.character.ability === 'dual' && this.dualMode) {
      const info = DUAL_INFO[this.dualMode] || { icon: '', label: this.dualMode };
      const ready = now >= (this.dualReady[this.dualMode] || 0);
      this.logHud.setText(this.character.icon + ' ' + info.icon + ' ' + info.label
        + (ready ? ' ready (space)' : ' ...') + '  ·  shift: swap');
      this.logHud.setColor(ready ? '#d8e6b0' : '#6b5a44');
      return;
    }

    const phasingNow = this.character.ability === 'phase' && now < this.phaseUntil;
    const ready = now >= this.abilityReadyAt;
    const name = this.character.abilityName;
    let label;
    if (phasingNow) label = this.character.icon + ' ' + name + ' active';
    else if (ready) label = this.character.icon + ' ' + name + ' ready (space)';
    else label = this.character.icon + ' ...';
    this.logHud.setText(label);
    this.logHud.setColor(phasingNow ? '#d8b0ff' : (ready ? '#d8e6b0' : '#6b5a44'));
  }

  updateLivesHud() {
    if (!this.livesText) return;
    this.livesText.setText(this.lives > 1 || this.character.lives > 1 ? '❤'.repeat(Math.max(0, this.lives)) : '');
  }

  toggleMute() {
    SFX.unlock();
    const muted = SFX.toggleMute();
    this.muteBtn.setText(muted ? '🔇' : '🔊');
  }

  togglePause() {
    if (this.gameOver) return;
    if (this.physics.world.isPaused) {
      this.physics.world.resume();
    } else {
      this.physics.world.pause();
    }
  }

  update(time, delta) {
    if (this.gameOver) return;
    const dt = delta / 1000;
    this.elapsed += dt;

    // score from survival time
    this.score += GAME.SURVIVE_POINTS_PER_SEC * dt;
    this.scoreText.setText('Score: ' + Math.floor(this.score));

    // enemy ramps up the longer you live
    this.enemySpeed = Math.min(
      this.enemyMax,
      this.enemyStart + this.enemyAccel * this.elapsed
    );

    this.recordHistory(time);
    this.handlePlayer(time);
    this.handleEnemy(time, dt);
    this.updateBlackHole(time);
    if (this.spookHpBar) this.updateSpookHpBar();
    this.handleSwordAndDanger(time);
    this.updateLogHud();
  }

  // Chrono rewind: keep a short trail of recent positions to jump back to.
  recordHistory(time) {
    const h = this.posHistory;
    if (!h.length || time - h[h.length - 1].t >= 100) {
      h.push({ t: time, x: this.player.x, y: this.player.y });
      // keep a little more than REWIND_MS worth of samples
      const cutoff = time - (GAME.REWIND_MS + 600);
      while (h.length > 2 && h[0].t < cutoff) h.shift();
    }
  }

  handlePlayer(time) {
    this.updateAbilityVisuals(time);

    const boosting = time < this.boostUntil;
    // some characters (Forest) get a bigger speed multiplier while boosted
    const boostMul = this.character.boostSpeedMul || this.charSpeedMul;
    let speed = boosting
      ? GAME.PLAYER_BOOST_SPEED * boostMul
      : GAME.PLAYER_SPEED * this.charSpeedMul;
    // Volt's sprint: a short burst of 3x speed
    const sprinting = time < this.sprintUntil;
    if (sprinting) speed *= GAME.SPRINT_MULT;

    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;

    if (this.joystick) {
      const d = this.joystick.direction;
      if (d.lengthSq() > 0.02) { vx = d.x; vy = d.y; }
    }

    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.lengthSq() > 0) {
      v.normalize().scale(speed);
      // remember facing direction for the smash
      this.faceDir.set(v.x, v.y).normalize();
    }
    this.player.setVelocity(v.x, v.y);

    // face movement direction (flip only)
    if (v.x < -1) this.player.setFlipX(true);
    else if (v.x > 1) this.player.setFlipX(false);

    // boost visuals / rainbow skin
    if (this.skin.rainbow) {
      const hue = (time * 0.00012) % 1;
      this.player.setTint(Phaser.Display.Color.HSVToRGB(hue, 0.7, 1).color);
      if (boosting && v.lengthSq() > 0 && Math.random() < 0.6) {
        this.trail.emitParticleAt(this.player.x, this.player.y + 10);
      }
    } else if (boosting) {
      this.player.setTint(this.boostTint());
      if (v.lengthSq() > 0 && Math.random() < 0.6) {
        this.trail.emitParticleAt(this.player.x, this.player.y + 10);
      }
    } else {
      this.player.clearTint();
    }

    // sprint leaves a strong streak of sparks
    if (sprinting && v.lengthSq() > 0) {
      this.trail.emitParticleAt(this.player.x, this.player.y + 8);
      this.trail.emitParticleAt(this.player.x, this.player.y);
    }

    // shadow + glow follow the ghost
    if (this.playerShadow) this.playerShadow.setPosition(this.player.x, this.player.y + 22);
    if (this.playerGlow) this.playerGlow.setPosition(this.player.x, this.player.y);

    // hat overlay follows the ghost (bottom edge rests just above the head)
    if (this.hat) {
      this.hat.setPosition(this.player.x, this.player.y - this.player.displayHeight * 0.34);
      this.hat.setFlipX(this.player.flipX);
    }
    // owner face patch follows the ghost
    if (this.faceFx) {
      this.faceFx.setPosition(this.player.x, this.player.y - this.player.displayHeight * 0.125);
    }
    // Alien UFO hovers over the ghost while active; a soft green glow trails it
    if (this.ufoSprite) {
      this.ufoSprite.setPosition(this.player.x, this.player.y - 20 + Math.sin(time * 0.006) * 2);
      if (v.lengthSq() > 0 && Math.random() < 0.5) {
        const p = this.trail.emitParticleAt(this.player.x, this.player.y + 6);
        if (p && p.setTint) p.setTint(0x6bffb0);
      }
    }
    // keep the bouncing laser pointing where it's actually travelling
    if (this.lasers) {
      this.lasers.children.iterate((l) => {
        if (l && l.active && l.body) l.setRotation(Math.atan2(l.body.velocity.y, l.body.velocity.x));
      });
    }
  }

  boostTint() {
    return { red: 0xffb0b0, green: 0xbfffce, purple: 0xe4c8ff, yellow: 0xfff0a0, brown: 0xe6c89a, pink: 0xffc0e8, black: 0xc8c8dc, magma: 0xff9a4a, forest: 0xbfffce, volt: 0xd0ecff, alien: 0xbfffe0, lucky: 0xdfffa0, ninja: 0xcfd2e0, chrono: 0xaff0e8, void: 0xd8bfff, spider: 0xbfffb0 }[this.charKey] || 0x9fe0ff;
  }

  // Keeps the shield bubble on the player and toggles tree-phasing on/off.
  updateAbilityVisuals(time) {
    // shield bubble follows the player, disappears when it expires
    if (this.shieldFx) {
      if (time < this.shieldUntil) {
        this.shieldFx.setPosition(this.player.x, this.player.y);
      } else {
        this.shieldFx.destroy();
        this.shieldFx = null;
      }
    }

    // phasing: pass through trees + go translucent
    if (this.charKey === 'purple') {
      const phasing = time < this.phaseUntil;
      if (phasing !== this.phasing) {
        this.phasing = phasing;
        this.playerTreeCollider.active = !phasing;
        this.player.setAlpha(phasing ? 0.45 : 1);
      }
    }
  }

  handleEnemy(time, dt) {
    if (this.enemyShadow) this.enemyShadow.setPosition(this.enemy.x, this.enemy.y + 26);
    // stunned: frozen and helpless (cannot move or catch)
    if (time < this.stunUntil) {
      this.enemy.setVelocity(0, 0);
      this.enemy.setTint(0xffe066);
      this.enemy.setAngle(Math.sin(time / 55) * 7);
      this.enemyPrevX = this.enemy.x;
      this.enemyPrevY = this.enemy.y;
      return;
    }
    // rooted by a spider web: fully stuck in place (cannot move or catch)
    if (time < this.rootUntil) {
      this.enemy.setVelocity(0, 0);
      this.enemy.setTint(0x9fff8a);
      this.enemy.setAngle(0);
      this.enemyPrevX = this.enemy.x;
      this.enemyPrevY = this.enemy.y;
      return;
    }
    this.enemy.setAngle(0);

    const slowed = time < this.slowUntil;
    const slowMo = time < this.slowMoUntil;
    let factor = slowed ? GAME.LOG_SLOW_FACTOR : 1;
    if (slowMo) factor = Math.min(factor, GAME.SLOWMO_FACTOR); // Chrono slow-mo
    // Void black hole drags the Spook a little slower while it's being pulled
    const pulling = this.blackHole && this.blackHole.sprite;
    if (pulling) factor = Math.min(factor, GAME.VOID_ENEMY_FACTOR);
    const speed = this.enemySpeed * factor;

    // Ninja decoy: chase the decoy's spot instead of the real player for a bit
    const luring = time < this.lureUntil && this.lurePoint;
    let tgtX = luring ? this.lurePoint.x : this.player.x;
    let tgtY = luring ? this.lurePoint.y : this.player.y;
    // a black hole overrides the target: the Spook is dragged toward the void
    if (pulling) { tgtX = this.blackHole.x; tgtY = this.blackHole.y; }

    // direction straight at the current target (player, decoy, or void)
    const chase = Phaser.Math.Angle.Between(this.enemy.x, this.enemy.y, tgtX, tgtY);

    // Frightened by a heart arrow: run the OTHER way for a bit. Otherwise,
    // while escaping a tree, steer off to one side of the chase line (still
    // angled forward) so the Spook arcs around whatever is blocking the way.
    const fleeing = time < this.fleeUntil;
    let ang = chase;
    if (fleeing) {
      ang = chase + Math.PI; // flee directly away from the player
    } else if (time < this.escapeUntil) {
      ang = chase + this.escapeSign * (Math.PI * 0.42);
    }

    this.enemy.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    this.enemy.setFlipX(tgtX < this.enemy.x);

    // tint by current state
    if (pulling) this.enemy.setTint(0xc79cff);
    else if (luring) this.enemy.setTint(0xbfc2d0);
    else if (fleeing) this.enemy.setTint(0xff8fd0);
    else if (slowMo) this.enemy.setTint(0x9ff0e6);
    else if (slowed) this.enemy.setTint(0x6fd0ff);
    else this.enemy.clearTint();

    this.detectStuck(time, dt, speed);

    // while lured to a decoy you can't be caught (that's the whole point)
    const dist = Phaser.Math.Distance.Between(this.enemy.x, this.enemy.y, this.player.x, this.player.y);
    if (!fleeing && !luring && dist < GAME.CATCH_DISTANCE) this.caught();
  }

  detectStuck(time, dt, speed) {
    if (this.enemyPrevX === null) {
      this.enemyPrevX = this.enemy.x;
      this.enemyPrevY = this.enemy.y;
      return;
    }
    const moved = Phaser.Math.Distance.Between(this.enemyPrevX, this.enemyPrevY, this.enemy.x, this.enemy.y);
    const expected = speed * dt;
    this.enemyPrevX = this.enemy.x;
    this.enemyPrevY = this.enemy.y;

    // Blocked = it wanted to move but barely did (a tree is in the way).
    if (expected > 1 && moved < expected * 0.35) {
      this.stuckTime += dt;
    } else if (time >= this.escapeUntil) {
      // moving freely again and not mid-escape: clear the counter
      this.stuckTime = 0;
    }

    if (this.stuckTime > 0.18) {
      if (time < this.escapeUntil) {
        // still blocked mid-escape: this side is jammed too, try the other
        this.escapeSign *= -1;
      } else {
        // fresh block: steer toward the more open side (away from tree centre
        // when known, otherwise keep the current side)
        this.escapeSign = this.pickEscapeSide();
      }
      this.escapeUntil = time + 550;
      this.stuckTime = 0;
    }
  }

  // Choose which way to arc around: whichever perpendicular points away from
  // the nearest tree, so we head toward open space.
  pickEscapeSide() {
    let nearest = null, best = Infinity;
    this.trees.children.iterate((t) => {
      if (!t) return;
      const d = Phaser.Math.Distance.Between(t.x, t.y, this.enemy.x, this.enemy.y);
      if (d < best) { best = d; nearest = t; }
    });
    if (!nearest) return this.escapeSign;
    const chase = Phaser.Math.Angle.Between(this.enemy.x, this.enemy.y, this.player.x, this.player.y);
    const toTree = Phaser.Math.Angle.Between(this.enemy.x, this.enemy.y, nearest.x, nearest.y);
    // positive cross => tree is on the left of the chase line; go right (-1)
    const cross = Math.sin(toTree - chase);
    return cross > 0 ? -1 : 1;
  }

  handleSwordAndDanger(time) {
    const dist = Phaser.Math.Distance.Between(this.enemy.x, this.enemy.y, this.player.x, this.player.y);
    const near = Phaser.Math.Clamp(1 - (dist - GAME.CATCH_DISTANCE) / (GAME.WARN_DISTANCE - GAME.CATCH_DISTANCE), 0, 1);

    // sword sits above the spook and trembles harder as danger rises
    const shake = near * 8;
    const bx = this.enemy.x + Phaser.Math.Between(-shake, shake) * 0.5;
    const by = this.enemy.y - 44 + Phaser.Math.Between(-shake, shake) * 0.5;
    this.sword.setPosition(bx, by);
    this.sword.setFlipX(this.enemy.flipX);
    this.sword.setAngle(Phaser.Math.Between(-shake, shake) - 2);
    this.sword.setDepth(11);
    // glow brighter when threatening
    this.sword.setScale(1 + near * 0.25);
    this.sword.setTint(near > 0.05 ? 0xffef99 : 0xffffff);

    // red danger vignette + swell the music louder as the Spook closes in
    this.danger.setAlpha(near * 0.22);
    SFX.setMusicIntensity(near);
  }

  caught() {
    if (this.gameOver) return;
    const now = this.time.now;
    if (now < this.invulnUntil) return; // grace after a block / life loss

    // Alien UFO: untouchable, and each hit scores instead of killing
    if (now < this.ufoUntil) { this.ufoHit(now); return; }

    // Green shield blocks the hit
    if (now < this.shieldUntil) { this.blockWithShield(now); return; }

    // Extra lives (Purple): survive the hit and lose one life
    if (this.lives > 1) { this.loseLife(now); return; }

    this.die();
  }

  blockWithShield(now) {
    this.shieldUntil = 0;
    this.score += GAME.SHIELD_BONUS_POINTS;
    this.boostUntil = now + GAME.BOOST_DURATION;
    this.stunUntil = now + GAME.SHIELD_BLOCK_STUN;
    this.invulnUntil = now + GAME.SHIELD_BLOCK_STUN;
    this.knockbackEnemy(90);
    SFX.boost();
    if (this.shieldFx) {
      this.tweens.add({ targets: this.shieldFx, scale: 1.8, alpha: 0, duration: 260,
        onComplete: () => { if (this.shieldFx) { this.shieldFx.destroy(); this.shieldFx = null; } } });
    }
    this.floatText('BLOCKED! +100', 0x9fffce);
  }

  loseLife(now) {
    this.lives -= 1;
    this.updateLivesHud();
    this.stunUntil = now + 900;
    this.invulnUntil = now + 1300;
    this.knockbackEnemy(110);
    SFX.caught();
    this.cameras.main.shake(180, 0.01);
    // brief blink to show invulnerability
    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 130, yoyo: true, repeat: 4,
      onComplete: () => { if (this.player.active) this.player.setAlpha(this.phasing ? 0.45 : 1); } });
    this.floatText('-1 LIFE', 0xff8a8a);
  }

  knockbackEnemy(px) {
    const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.enemy.x, this.enemy.y);
    const nx = Phaser.Math.Clamp(this.enemy.x + Math.cos(a) * px, 20, GAME.WORLD_WIDTH - 20);
    const ny = Phaser.Math.Clamp(this.enemy.y + Math.sin(a) * px, 20, GAME.WORLD_HEIGHT - 20);
    this.enemy.setPosition(nx, ny);
  }

  floatText(msg, color) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const txt = this.add.text(this.player.x, this.player.y - 48, msg, {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: hex,
    }).setOrigin(0.5).setDepth(20).setShadow(0, 2, '#000', 4);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  die() {
    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.enemy.setVelocity(0, 0);
    this.physics.pause();
    SFX.caught();

    const px = this.player.x, py = this.player.y;

    // the Spook looms over the victim and raises its blade with a wind-up
    this.enemy.setPosition(px, py - 34);
    this.enemy.setDepth(1560);
    this.cameras.main.stopFollow();
    // blade points DOWN (angle ~180) so the edge — not the hilt — does the cut
    this.sword.setPosition(px + 22, py - 84).setAngle(150).setScale(1.55).setTint(0xffffff).setDepth(1600);

    // 1) anticipation: raise the blade up-right, then slash down through
    this.tweens.add({
      targets: this.sword, x: px + 32, y: py - 98, angle: 152, duration: 160, ease: 'Back.out',
      onComplete: () => this.swingSword(px, py),
    });
  }

  // 2) fast diagonal slash (blade-first) with a bright motion streak
  swingSword(px, py) {
    SFX.slash();
    const streak = this.add.image(px, py - 6, 'slash')
      .setDepth(1590).setRotation(-Math.PI / 4).setScale(0.25, 0.95).setAlpha(0).setTint(0xffffff);
    this.tweens.add({ targets: streak, alpha: { from: 0.95, to: 0 }, scaleX: 2.4, duration: 230, ease: 'Quad.out', onComplete: () => streak.destroy() });
    // end with the blade lying ACROSS the ghost (hilt stays up high, out of it)
    this.tweens.add({
      targets: this.sword, x: px - 8, y: py - 14, angle: 196, duration: 95, ease: 'Quad.in',
      onComplete: () => this.impactSlice(px, py),
    });
  }

  // 3) impact: hit-stop flash, a clean cut line, then the ghost falls apart
  impactSlice(px, py) {
    this.cameras.main.flash(70, 255, 255, 255);
    this.cameras.main.shake(240, 0.022);
    const cut = this.add.rectangle(px, py, 82, 4, 0xffffff).setDepth(1610).setAngle(-32).setAlpha(0.95);
    this.tweens.add({ targets: cut, alpha: 0, scaleX: 1.5, duration: 210, onComplete: () => cut.destroy() });
    this.time.delayedCall(70, () => {
      this.cameras.main.flash(140, 255, 80, 80);
      this.splitGhost(px, py);
    });
  }

  splitGhost(px, py) {
    this.player.setVisible(false);
    if (this.hat) this.hat.setVisible(false);
    if (this.faceFx) this.faceFx.setVisible(false);
    if (this.playerGlow) this.playerGlow.setVisible(false);
    if (this.playerShadow) this.playerShadow.setVisible(false);

    const tint = this.skin.trail || 0x9fd0ff;

    // two halves of the ghost, split along the diagonal cut
    const leftHalf = this.add.image(px, py, this.playerTex).setDepth(1580).setCrop(0, 0, 24, 56);
    const rightHalf = this.add.image(px, py, this.playerTex).setDepth(1580).setCrop(24, 0, 24, 56);

    // stage 1: the halves pop apart along the cut, stage 2: tumble and fade
    this.tweens.add({
      targets: leftHalf, x: px - 12, y: py - 6, duration: 90, ease: 'Quad.out',
      onComplete: () => this.tweens.add({ targets: leftHalf, x: px - 84, y: py + 74, angle: -120, alpha: 0, duration: 820, ease: 'Quad.in' }),
    });
    this.tweens.add({
      targets: rightHalf, x: px + 12, y: py + 6, duration: 90, ease: 'Quad.out',
      onComplete: () => this.tweens.add({ targets: rightHalf, x: px + 84, y: py + 82, angle: 120, alpha: 0, duration: 820, ease: 'Quad.in' }),
    });

    // a burst of wisps in the ghost's colour
    this.trail.setDepth(1585);
    for (let i = 0; i < 20; i++) {
      const p = this.trail.emitParticleAt(px + Phaser.Math.Between(-12, 12), py + Phaser.Math.Between(-12, 12));
      if (p && p.setTint) p.setTint(tint);
    }
    // bright shard streaks flying along the cut
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 4 + Phaser.Math.FloatBetween(-0.55, 0.55);
      const dist = Phaser.Math.Between(40, 95);
      const shard = this.add.rectangle(px, py, Phaser.Math.Between(6, 14), 2, 0xffffff).setDepth(1586).setRotation(a).setAlpha(0.9);
      this.tweens.add({ targets: shard, x: px + Math.cos(a) * dist, y: py + Math.sin(a) * dist, alpha: 0, duration: Phaser.Math.Between(300, 520), ease: 'Quad.out', onComplete: () => shard.destroy() });
    }

    this.time.delayedCall(1000, () => {
      const dkey = this.difficultyKey;
      const oldBest = Storage.getHighscore(dkey);
      const oldOverall = Storage.bestOverall();
      const finalScore = Math.floor(this.score);
      const isNew = finalScore > oldBest;
      if (isNew) Storage.setHighscore(finalScore, dkey);
      const newOverall = Storage.bestOverall();
      Auth.queuePush(); // sync best score + coins to the cloud account
      // characters unlock by overall best across difficulties
      const newUnlocks = Settings.CHAR_ORDER
        .filter((k) => {
          const u = Settings.CHARACTERS[k].unlock || 0;
          return u > 0 && u > oldOverall && u <= newOverall;
        })
        .map((k) => Settings.CHARACTERS[k].label);
      this.scene.start('GameOver', { score: finalScore, isNew, newUnlocks, coins: this.runCoins, difficulty: dkey });
    });
  }
}
