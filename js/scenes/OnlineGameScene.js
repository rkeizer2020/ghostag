// Online "Spook Tag" — host-authoritative multiplayer over Supabase Realtime.
//
// One player is the Spook and must tag someone before the shared 60s timer
// runs out; tagging passes the Spook role. Whoever is the Spook when the timer
// hits 0 is eliminated (and becomes a spectator); the timer resets and a new
// Spook is chosen, until one player remains — the winner. Everyone can fire a
// stun pulse to freeze the Spook for 1s (every stun is capped to 1s here).
//
// The HOST's browser is authoritative: it owns the timer, decides tags and
// eliminations, and broadcasts the game state. Every client simulates only its
// own player's movement and broadcasts its position; remote players are
// interpolated. If the host leaves, the match ends for everyone.
class OnlineGameScene extends Phaser.Scene {
  constructor() { super('OnlineGame'); }

  init(data) { this.match = data || {}; }

  create() {
    if (typeof Net === 'undefined' || !Net.inLobby()) { this.scene.start('Menu'); return; }
    const WW = GAME.WORLD_WIDTH, WH = GAME.WORLD_HEIGHT;

    this.amHost = Net.isHost;
    this.myId = Net.myId();
    this.seed = this.match.seed || 1;
    this.rng = this._mulberry32(this.seed);
    this.over = false;
    this.winnerId = null;
    this.spookId = null;
    this.timeLeft = GAME.TAG_ROUND_MS;
    this.spookStunUntil = 0;
    this.passGraceUntil = 0;
    this.myStunReadyAt = 0;

    // world
    this.physics.world.setBounds(0, 0, WW, WH);
    this.cameras.main.setBounds(0, 0, WW, WH);
    this.biome = (this.match.biome && Biomes.LIST[this.match.biome]) || Biomes.LIST.forest;
    this.RENDER_DELAY = 120; // ms we render remote players behind, for smooth interpolation
    this.cameras.main.setBackgroundColor(this.biome.bg);
    this.add.tileSprite(0, 0, WW, WH, this.biome.ground).setOrigin(0).setDepth(-10);

    this.trees = this.physics.add.staticGroup();
    this._placeTreesSeeded();

    // roster of players
    this.roster = {};
    const list = (this.match.players && this.match.players.length) ? this.match.players : [{ id: this.myId, name: Net.myName(), char: 'blue' }];
    list.forEach((p, i) => this._addPlayer(p, i, list.length));
    if (!this.roster[this.myId]) this._addPlayer({ id: this.myId, name: Net.myName(), char: Settings.getCharacter() }, list.length, list.length + 1);
    this.me = this.roster[this.myId];

    // my player collides with trees; remote players are interpolated images
    this.physics.add.collider(this.me.sprite, this.trees);
    this.cameras.main.startFollow(this.me.sprite, true, 0.12, 0.12);

    // starting alive set + first Spook (host decides, seeded)
    this.alive = new Set(Object.keys(this.roster));
    if (this.amHost) {
      const ids = Array.from(this.alive);
      this.spookId = ids[Math.floor(this.rng() * ids.length)] || ids[0];
      this.roundEndsAt = this.time.now + GAME.TAG_ROUND_MS;
      this.lastTagAt = 0;
    }

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.useStun());
    this.input.keyboard.on('keydown-ESC', () => this.leaveToMenu());
    this.faceDir = new Phaser.Math.Vector2(0, -1);
    this.joystick = this.sys.game.device.input.touch ? new VirtualJoystick(this) : null;

    this._buildHud();
    this._bindNet();

    this.lastPosSent = 0;
    this.lastStateSent = 0;
    this.localTimerBase = this.time.now;

    SFX.startMusic && SFX.startMusic();
    this.events.once('shutdown', () => { this._unbindNet(); SFX.stopMusic && SFX.stopMusic(); });
  }

  // deterministic RNG so every client lays out trees / first Spook identically
  _mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  _placeTreesSeeded() {
    const WW = GAME.WORLD_WIDTH, WH = GAME.WORLD_HEIGHT;
    const spots = [];
    let attempts = 0;
    while (spots.length < GAME.TREE_COUNT && attempts < 1200) {
      attempts++;
      const x = 100 + this.rng() * (WW - 200);
      const y = 100 + this.rng() * (WH - 200);
      if (Phaser.Math.Distance.Between(x, y, WW / 2, WH / 2) < 220) continue; // keep spawn ring clear
      if (spots.some((s) => Phaser.Math.Distance.Between(s.x, s.y, x, y) < 120)) continue;
      spots.push({ x, y });
    }
    spots.sort((a, b) => a.y - b.y);
    spots.forEach((s) => {
      const t = this.trees.create(s.x, s.y, this.biome.tree);
      t.setDepth(5 + s.y / WH);
      t.body.setSize(20, 24, true);
      t.body.setOffset((t.width - 20) / 2, t.height - 30);
      t.refreshBody();
    });
  }

  _charTex(char) {
    const c = Settings.CHARACTERS[char];
    return (c && c.tex) || 'ghost';
  }

  _addPlayer(p, i, n) {
    const WW = GAME.WORLD_WIDTH, WH = GAME.WORLD_HEIGHT;
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    const x = WW / 2 + Math.cos(a) * 170, y = WH / 2 + Math.sin(a) * 170;
    const isMe = p.id === this.myId;
    const tex = this._charTex(p.char);
    let sprite;
    if (isMe) {
      sprite = this.physics.add.image(x, y, tex);
      sprite.setCircle(16, 8, 14);
      sprite.setCollideWorldBounds(true);
    } else {
      sprite = this.add.image(x, y, tex);
    }
    sprite.setDepth(10);
    const label = this.add.text(x, y - 34, p.name || 'Player', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(21).setShadow(0, 2, '#000', 3);
    const sword = this.add.image(x, y - 44, 'sword').setDepth(11).setVisible(false);
    this.roster[p.id] = {
      id: p.id, name: p.name || 'Player', char: p.char || 'blue',
      sprite, label, sword, baseTex: tex,
      x, y, tx: x, ty: y, flip: false, dead: false, isSpook: false,
      buf: [], // timestamped position samples for smooth interpolation
    };
  }

  // ---- networking ----
  _bindNet() {
    this._offG = Net.on('g', (m) => this._onMsg(m));
    this._offStart = Net.on('start', () => { /* already in match */ });
    this._offHostLeft = Net.on('hostleft', () => { if (!this.over) this.endMatch(null, 'The host left — match ended.'); });
  }
  _unbindNet() {
    this._offG && this._offG();
    this._offHostLeft && this._offHostLeft();
    this._offStart && this._offStart();
  }

  _onMsg(m) {
    if (!m || this.over) return;
    if (m.t === 'p') {
      const pl = this.roster[m.id];
      if (pl && m.id !== this.myId) {
        pl.tx = m.x; pl.ty = m.y; pl.flip = !!m.f;
        pl.buf.push({ t: this.time.now, x: m.x, y: m.y });
        if (pl.buf.length > 12) pl.buf.shift();
      }
    } else if (m.t === 's' && !this.amHost) {
      this._applyState(m);
    } else if (m.t === 'k') {
      // someone stunned the Spook
      this.spookStunUntil = this.time.now + Math.min(GAME.TAG_STUN_MS, m.dur || GAME.TAG_STUN_MS);
      this._flashStun();
    }
  }

  _applyState(s) {
    this.spookId = s.sp;
    this.timeLeft = s.tl;
    this.localTimerBase = this.time.now;
    this.winnerId = s.wn || null;
    this.alive = new Set(s.al || []);
    if (s.ov) { this.endMatch(this.winnerId); return; }
  }

  _sendPos() {
    Net.sendGame({ t: 'p', id: this.myId, x: Math.round(this.me.x), y: Math.round(this.me.y), f: this.me.flip });
  }

  _sendState() {
    Net.sendGame({
      t: 's', sp: this.spookId, tl: Math.max(0, Math.round(this.timeLeft)),
      al: Array.from(this.alive), wn: this.winnerId, ov: this.over,
    });
  }

  // ---- stun pulse (universal; every stun is capped to 1s here) ----
  useStun() {
    if (this.over || !this.me || this.me.dead) return;
    const now = this.time.now;
    if (now < this.myStunReadyAt) return;
    if (this.myId === this.spookId) return; // the Spook can't stun itself
    this.myStunReadyAt = now + GAME.TAG_STUN_COOLDOWN;

    // visual pulse
    const fx = this.add.image(this.me.x, this.me.y, 'zap').setDepth(12).setScale(0.6).setAlpha(0.95);
    this.tweens.add({ targets: fx, scale: 2.4, alpha: 0, duration: 260, onComplete: () => fx.destroy() });
    SFX.slash && SFX.slash();

    const sp = this.roster[this.spookId];
    if (sp) {
      const d = Phaser.Math.Distance.Between(this.me.x, this.me.y, sp.sprite.x, sp.sprite.y);
      if (d <= GAME.TAG_STUN_RANGE * GAME.TAG_NERF) {
        this.spookStunUntil = now + GAME.TAG_STUN_MS;
        this._flashStun();
        Net.sendGame({ t: 'k', dur: GAME.TAG_STUN_MS });
      }
    }
    this.updateHud();
  }

  _flashStun() {
    const sp = this.roster[this.spookId];
    if (sp && sp.sprite.active) {
      sp.sprite.setTint(0xffe066);
      this.time.delayedCall(GAME.TAG_STUN_MS, () => { if (sp.sprite.active && sp.id === this.spookId) sp.sprite.clearTint(); });
    }
  }

  update(time, delta) {
    if (this.over) return;
    const dt = delta / 1000;

    // ---- my movement (unless I'm the stunned Spook, or dead) ----
    const amSpook = this.myId === this.spookId;
    const stunned = amSpook && time < this.spookStunUntil;
    let vx = 0, vy = 0;
    if (!this.me.dead && !stunned) {
      if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
      if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;
      if (this.joystick) { const d = this.joystick.direction; if (d.lengthSq() > 0.02) { vx = d.x; vy = d.y; } }
    }
    const v = new Phaser.Math.Vector2(vx, vy);
    // the Spook is a touch faster so tag can happen; abilities nerfed overall
    const baseSpeed = amSpook ? GAME.PLAYER_SPEED * 1.08 : GAME.PLAYER_SPEED;
    if (v.lengthSq() > 0) { v.normalize(); this.faceDir.set(v.x, v.y); }
    if (this.me.sprite.body) this.me.sprite.setVelocity(v.x * baseSpeed, v.y * baseSpeed);
    if (v.x < -0.1) this.me.flip = true; else if (v.x > 0.1) this.me.flip = false;
    this.me.x = this.me.sprite.x; this.me.y = this.me.sprite.y;

    // ---- broadcast my position ----
    if (time - this.lastPosSent > 1000 / GAME.TAG_POS_HZ) { this.lastPosSent = time; this._sendPos(); }

    // ---- interpolate remote players (render ~120ms in the past so the
    // stream of updates plays back smoothly instead of snapping each packet) ----
    const rt = time - this.RENDER_DELAY;
    Object.values(this.roster).forEach((pl) => {
      if (pl.id === this.myId) return;
      const b = pl.buf;
      if (!b.length) { pl.sprite.setPosition(pl.x, pl.y); return; }
      let nx, ny;
      if (b.length === 1 || rt <= b[0].t) {
        nx = b[0].x; ny = b[0].y;
      } else if (rt >= b[b.length - 1].t) {
        // no newer sample yet: ease toward the latest so it keeps gliding
        nx = Phaser.Math.Linear(pl.x, b[b.length - 1].x, 0.3);
        ny = Phaser.Math.Linear(pl.y, b[b.length - 1].y, 0.3);
      } else {
        let i = 1;
        while (i < b.length - 1 && b[i].t < rt) i++;
        const a = b[i - 1], c = b[i];
        const u = Phaser.Math.Clamp((rt - a.t) / Math.max(1, c.t - a.t), 0, 1);
        nx = Phaser.Math.Linear(a.x, c.x, u);
        ny = Phaser.Math.Linear(a.y, c.y, u);
        while (b.length > 2 && b[1].t < rt) b.shift(); // prune consumed samples
      }
      pl.x = nx; pl.y = ny;
      pl.sprite.setPosition(nx, ny);
    });

    // ---- host authoritative logic ----
    if (this.amHost) this._hostStep(time, dt);
    else this.timeLeft = Math.max(0, this.timeLeft - delta); // smooth local countdown between host updates

    // ---- render roles / labels / spook sword ----
    Object.values(this.roster).forEach((pl) => {
      const isSpook = pl.id === this.spookId;
      const dead = !this.alive.has(pl.id);
      pl.dead = dead;
      const wantTex = isSpook ? 'spook' : pl.baseTex;
      if (pl.sprite.texture.key !== wantTex) pl.sprite.setTexture(wantTex);
      pl.sprite.setFlipX(pl.flip);
      pl.sprite.setAlpha(dead ? 0.25 : 1);
      pl.label.setPosition(pl.sprite.x, pl.sprite.y - 34);
      pl.label.setText((isSpook ? '👻 ' : '') + pl.name + (dead ? ' 💀' : ''));
      pl.label.setColor(isSpook ? '#ffe066' : (dead ? '#8a8a8a' : '#ffffff'));
      pl.sword.setVisible(isSpook && !dead);
      if (isSpook && !dead) { pl.sword.setPosition(pl.sprite.x, pl.sprite.y - 44); pl.sword.setFlipX(pl.flip); }
    });

    // if I just died, spectate a living player
    if (this.me.dead && !this._spectating) this._startSpectating();

    this.updateHud();
  }

  _hostStep(time, dt) {
    // countdown
    this.timeLeft = Math.max(0, this.roundEndsAt - time);

    // tag detection: Spook touches a living non-Spook
    const sp = this.roster[this.spookId];
    const spStunned = time < this.spookStunUntil;
    if (sp && !spStunned && time > this.passGraceUntil) {
      for (const id of this.alive) {
        if (id === this.spookId) continue;
        const pl = this.roster[id];
        if (!pl) continue;
        if (Phaser.Math.Distance.Between(sp.sprite.x, sp.sprite.y, pl.sprite.x, pl.sprite.y) < GAME.TAG_CATCH_DIST) {
          this.spookId = id;              // role passes
          this.passGraceUntil = time + GAME.TAG_PASS_GRACE;
          this.spookStunUntil = 0;
          SFX.caught && SFX.caught();
          this.cameras.main.shake(120, 0.006);
          this._sendState();
          break;
        }
      }
    }

    // timer expired -> current Spook is eliminated
    if (this.timeLeft <= 0) {
      this.alive.delete(this.spookId);
      const survivors = Array.from(this.alive);
      if (survivors.length <= 1) {
        this.winnerId = survivors[0] || null;
        this.over = true;
        this._sendState();
        this.endMatch(this.winnerId);
        return;
      }
      // new round: fresh timer + a new random Spook from the living
      this.spookId = survivors[Math.floor(this.rng() * survivors.length)];
      this.roundEndsAt = time + GAME.TAG_ROUND_MS;
      this.passGraceUntil = time + GAME.TAG_PASS_GRACE;
      this.spookStunUntil = 0;
      this._sendState();
    }

    // periodic state sync
    if (time - this.lastStateSent > 1000 / GAME.TAG_STATE_HZ) { this.lastStateSent = time; this._sendState(); }
  }

  _startSpectating() {
    this._spectating = true;
    const target = this.roster[this.spookId] || Object.values(this.roster).find((p) => this.alive.has(p.id));
    if (target) this.cameras.main.startFollow(target.sprite, true, 0.1, 0.1);
  }

  // ---- HUD ----
  _buildHud() {
    const W = this.scale.width;
    this.timerText = this.add.text(W / 2, 16, '60', {
      fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 5);
    this.roleText = this.add.text(W / 2, 54, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffe066',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 4);
    this.aliveText = this.add.text(14, 14, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#9fe6a0',
    }).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 4);
    this.stunText = this.add.text(14, this.scale.height - 30, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#8fd0ff',
    }).setScrollFactor(0).setDepth(2000).setShadow(0, 2, '#000', 4);
    const leave = this.add.text(W - 14, 14, '⏻ Leave', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#171019',
      backgroundColor: '#ff9a9a', padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(2000).setInteractive({ useHandCursor: true });
    leave.on('pointerdown', (p, x, y, e) => { if (e) e.stopPropagation(); this.leaveToMenu(); });
    this.scale.on('resize', () => this._layoutHud());
  }

  _layoutHud() {
    const W = this.scale.width;
    if (this.timerText) this.timerText.setPosition(W / 2, 16);
    if (this.roleText) this.roleText.setPosition(W / 2, 54);
    if (this.stunText) this.stunText.setPosition(14, this.scale.height - 30);
  }

  updateHud() {
    if (!this.timerText) return;
    const secs = Math.ceil(this.timeLeft / 1000);
    this.timerText.setText(String(secs));
    this.timerText.setColor(secs <= 10 ? '#ff6b6b' : '#ffffff');
    const amSpook = this.myId === this.spookId;
    if (this.me.dead) this.roleText.setText('💀 You died — spectating').setColor('#9a9a9a');
    else if (amSpook) this.roleText.setText('👻 YOU ARE THE SPOOK — tag someone!').setColor('#ffe066');
    else this.roleText.setText('🏃 RUN! Space = stun the Spook').setColor('#8fe6a0');
    this.aliveText.setText('Alive: ' + this.alive.size + '/' + Object.keys(this.roster).length);
    if (!this.me.dead && !amSpook) {
      const cd = Math.max(0, this.myStunReadyAt - this.time.now);
      this.stunText.setText(cd > 0 ? ('⚡ stun in ' + Math.ceil(cd / 1000) + 's') : '⚡ stun ready (Space)');
    } else this.stunText.setText('');
  }

  endMatch(winnerId, reason) {
    if (this._ended) return;
    this._ended = true;
    this.over = true;
    const name = winnerId && this.roster[winnerId] ? this.roster[winnerId].name : null;
    const iWon = winnerId && winnerId === this.myId;
    const msg = reason || (name ? (iWon ? '🏆 You win!' : '🏆 ' + name + ' wins!') : 'Match over');
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x05040a, 0.72).setOrigin(0).setScrollFactor(0).setDepth(3000);
    this.add.text(W / 2, H / 2 - 20, msg, {
      fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold', color: iWon ? '#ffd24a' : '#eaf6ff',
      align: 'center', wordWrap: { width: W - 60 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setShadow(0, 3, '#000', 6);
    const back = this.add.text(W / 2, H / 2 + 50, '→ Back to lobby', {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#171019',
      backgroundColor: '#ffd54a', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setInteractive({ useHandCursor: true });
    back.on('pointerdown', (p, x, y, e) => { if (e) e.stopPropagation(); this.leaveToMenu(); });
  }

  leaveToMenu() {
    try { Net.leave(); } catch (e) { /* ignore */ }
    this.scene.start('Menu');
  }
}
