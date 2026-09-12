class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const WW = GAME.WORLD_WIDTH;
    const WH = GAME.WORLD_HEIGHT;

    this.physics.world.setBounds(0, 0, WW, WH);
    this.cameras.main.setBounds(0, 0, WW, WH);
    this.cameras.main.setBackgroundColor(GAME.COLORS.bg);

    // tiled ground
    this.add.tileSprite(0, 0, WW, WH, 'ground').setOrigin(0).setDepth(-10);

    // state
    this.score = 0;
    this.elapsed = 0;
    this.enemySpeed = GAME.ENEMY_START_SPEED;
    this.boostUntil = 0;
    this.gameOver = false;
    this.lastWarnBeep = 0;

    // gravestones (static obstacles)
    this.graves = this.physics.add.staticGroup();
    this.placeGravestones();

    // player
    this.player = this.physics.add.image(WW * 0.5, WH * 0.75, 'ghost');
    this.player.setCircle(16, 8, 14);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // enemy spook + its sword (sword is a separate sprite held above)
    this.enemy = this.physics.add.image(WW * 0.5, WH * 0.15, 'spook');
    this.enemy.setCircle(18, 12, 14);
    this.enemy.setCollideWorldBounds(true);
    this.enemy.setDepth(10);
    this.sword = this.add.image(this.enemy.x, this.enemy.y - 44, 'sword').setDepth(11);

    // collisions with gravestones
    this.physics.add.collider(this.player, this.graves);
    this.physics.add.collider(this.enemy, this.graves);

    // orbs
    this.orbs = this.physics.add.group();
    for (let i = 0; i < GAME.ORB_COUNT; i++) this.spawnOrb();
    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);

    // camera follows player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.joystick = null;
    if (this.sys.game.device.input.touch) {
      this.joystick = new VirtualJoystick(this);
    }

    // boost particle trail
    this.trail = this.add.particles(0, 0, 'spark', {
      speed: 0, lifespan: 300, scale: { start: 0.7, end: 0 },
      alpha: { start: 0.5, end: 0 }, tint: 0x6fb8ff, frequency: -1, depth: 9,
    });

    this.buildHUD();

    this.input.keyboard.on('keydown-M', () => this.toggleMute());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
  }

  placeGravestones() {
    const WW = GAME.WORLD_WIDTH, WH = GAME.WORLD_HEIGHT;
    const spots = [];
    let attempts = 0;
    while (spots.length < GAME.GRAVESTONE_COUNT && attempts < 400) {
      attempts++;
      const x = Phaser.Math.Between(120, WW - 120);
      const y = Phaser.Math.Between(120, WH - 120);
      // keep clear of the player/enemy spawn columns
      if (Math.abs(x - WW * 0.5) < 90 && (y > WH * 0.6 || y < WH * 0.3)) continue;
      if (spots.some((s) => Phaser.Math.Distance.Between(s.x, s.y, x, y) < 140)) continue;
      spots.push({ x, y });
    }
    spots.forEach((s) => {
      const g = this.graves.create(s.x, s.y, 'grave');
      g.setDepth(5);
      // tighten the body to the stone slab (not the shadow)
      g.body.setSize(38, 46, true);
      g.body.setOffset((g.width - 38) / 2, 14);
      g.refreshBody();
    });
  }

  spawnOrb() {
    const WW = GAME.WORLD_WIDTH, WH = GAME.WORLD_HEIGHT;
    let x, y, ok = false, tries = 0;
    while (!ok && tries < 60) {
      tries++;
      x = Phaser.Math.Between(60, WW - 60);
      y = Phaser.Math.Between(60, WH - 60);
      ok = true;
      this.graves.children.iterate((g) => {
        if (g && Phaser.Math.Distance.Between(g.x, g.y, x, y) < 70) ok = false;
      });
      if (this.player && Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) < 120) ok = false;
    }
    const orb = this.orbs.create(x, y, 'orb');
    orb.setCircle(8, 6, 6);
    orb.setDepth(6);
    this.tweens.add({ targets: orb, scale: { from: 0.85, to: 1.15 }, duration: 600, yoyo: true, repeat: -1 });
  }

  collectOrb(player, orb) {
    orb.destroy();
    this.score += GAME.ORB_POINTS;
    this.boostUntil = this.time.now + GAME.BOOST_DURATION;
    SFX.pickup();
    SFX.boost();
    this.cameras.main.flash(120, 120, 200, 255);
    this.spawnOrb();
  }

  buildHUD() {
    const W = this.scale.width;
    this.scoreText = this.add.text(16, 14, 'Score: 0', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
    }).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 4);

    this.hiText = this.add.text(16, 42, 'Best: ' + Storage.getHighscore(), {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ffd54a',
    }).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 4);

    this.muteBtn = this.add.text(W - 16, 14, SFX.muted ? '🔇' : '🔊', {
      fontSize: '26px',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(2000).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', (p, x, y, event) => {
      if (event) event.stopPropagation();
      this.toggleMute();
    });

    // danger vignette (screen edge glow when the spook is close)
    this.danger = this.add.rectangle(0, 0, W, this.scale.height, 0xff2b2b)
      .setOrigin(0).setScrollFactor(0).setDepth(1500).setAlpha(0);
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
      GAME.ENEMY_MAX_SPEED,
      GAME.ENEMY_START_SPEED + GAME.ENEMY_ACCEL_PER_SEC * this.elapsed
    );

    this.handlePlayer(time);
    this.handleEnemy(time);
    this.handleSwordAndDanger(time);
  }

  handlePlayer(time) {
    const boosting = time < this.boostUntil;
    const speed = boosting ? GAME.PLAYER_BOOST_SPEED : GAME.PLAYER_SPEED;

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
    if (v.lengthSq() > 0) v.normalize().scale(speed);
    this.player.setVelocity(v.x, v.y);

    // face movement direction (flip only)
    if (v.x < -1) this.player.setFlipX(true);
    else if (v.x > 1) this.player.setFlipX(false);

    // boost visuals
    if (boosting) {
      this.player.setTint(0x9fe0ff);
      if (v.lengthSq() > 0 && Math.random() < 0.6) {
        this.trail.emitParticleAt(this.player.x, this.player.y + 10);
      }
    } else {
      this.player.clearTint();
    }
  }

  handleEnemy(time) {
    // steer toward the player
    const ang = Phaser.Math.Angle.Between(this.enemy.x, this.enemy.y, this.player.x, this.player.y);
    this.enemy.setVelocity(Math.cos(ang) * this.enemySpeed, Math.sin(ang) * this.enemySpeed);
    if (this.player.x < this.enemy.x) this.enemy.setFlipX(true);
    else this.enemy.setFlipX(false);

    const dist = Phaser.Math.Distance.Between(this.enemy.x, this.enemy.y, this.player.x, this.player.y);
    if (dist < GAME.CATCH_DISTANCE) this.caught();
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

    // red danger vignette + warning beeps
    this.danger.setAlpha(near * 0.22);
    if (near > 0.35 && time - this.lastWarnBeep > (260 - near * 180)) {
      SFX.warn();
      this.lastWarnBeep = time;
    }
  }

  caught() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.enemy.setVelocity(0, 0);
    this.physics.pause();
    SFX.caught();

    const finalScore = Math.floor(this.score);
    const px = this.player.x, py = this.player.y;

    // position the spook right over the victim, sword raised
    this.enemy.setPosition(px, py - 30);
    this.sword.setPosition(px, py - 74).setAngle(0).setScale(1.4).setTint(0xffffff);
    this.cameras.main.stopFollow();

    // 1) sword slashes down through the ghost
    this.tweens.add({
      targets: this.sword,
      y: py + 20,
      angle: 6,
      duration: 140,
      ease: 'Quad.in',
      onComplete: () => {
        this.cameras.main.shake(200, 0.02);
        this.cameras.main.flash(150, 255, 80, 80);
        this.splitGhost(px, py);
      },
    });
  }

  splitGhost(px, py) {
    this.player.setVisible(false);

    // two halves of the ghost fly apart (left and right)
    const leftHalf = this.add.image(px, py, 'ghost').setDepth(12).setCrop(0, 0, 24, 56);
    const rightHalf = this.add.image(px, py, 'ghost').setDepth(12).setCrop(24, 0, 24, 56);

    this.tweens.add({
      targets: leftHalf, x: px - 70, y: py + 40, angle: -90, alpha: 0,
      duration: 900, ease: 'Quad.out',
    });
    this.tweens.add({
      targets: rightHalf, x: px + 70, y: py + 40, angle: 90, alpha: 0,
      duration: 900, ease: 'Quad.out',
    });

    // little wisp particles
    this.trail.setDepth(13);
    for (let i = 0; i < 16; i++) {
      this.trail.emitParticleAt(px + Phaser.Math.Between(-10, 10), py + Phaser.Math.Between(-10, 10));
    }

    this.time.delayedCall(1000, () => {
      const best = Storage.getHighscore();
      const isNew = Math.floor(this.score) > best;
      if (isNew) Storage.setHighscore(Math.floor(this.score));
      this.scene.start('GameOver', { score: Math.floor(this.score), isNew });
    });
  }
}
