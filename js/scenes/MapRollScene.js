// A quick slot-machine "roll" shown after pressing Play: it cycles through the
// three maps and decelerates onto the one the game randomly picked, so you can
// see where you're about to play. Tap / Space skips straight to the reveal.
//
// The whole animation is driven from update(time) — not from timer callbacks —
// so it advances with the render loop on every device and can never freeze part
// way. The game always launches within a hard time cap no matter what.
class MapRollScene extends Phaser.Scene {
  constructor() {
    super('MapRoll');
  }

  create() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2, cy = H / 2;

    // dim forest backdrop behind the panel
    UI.backdrop(this);

    // decide the map up front so the roulette can land on it
    this.chosen = Biomes.pick();
    Biomes.setNext(this.chosen);

    this.add.text(cx, H * 0.16, 'Rolling map…', {
      fontFamily: 'system-ui, sans-serif', fontSize: Math.min(34, Math.round(W * 0.075)) + 'px',
      fontStyle: 'bold', color: '#eaf6ff',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 0, '#6fb8ff', 16, true, true);

    // ---- preview card (redrawn on every flip) ----
    const cardW = Math.min(360, W - 48);
    const cardH = Math.min(240, H * 0.46);
    const thumbW = cardW - 24, thumbH = cardH - 74;
    const thumbY = cy - cardH / 2 + 12 + thumbH / 2;
    this._cardW = cardW; this._cardH = cardH; this._cx = cx; this._cy = cy;

    this.panel = this.add.graphics().setDepth(5);

    this.thumb = this.add.tileSprite(cx, thumbY, thumbW, thumbH, this.chosen.ground).setDepth(6);
    const maskG = this.make.graphics();
    maskG.fillStyle(0xffffff);
    maskG.fillRect(cx - thumbW / 2, thumbY - thumbH / 2, thumbW, thumbH);
    const mask = maskG.createGeometryMask();
    this.thumb.setMask(mask);

    this.thumbTrees = [
      this.add.image(cx - thumbW * 0.30, thumbY - 6, this.chosen.tree).setDepth(7).setScale(0.5).setMask(mask),
      this.add.image(cx + thumbW * 0.28, thumbY + 8, this.chosen.tree).setDepth(7).setScale(0.55).setMask(mask),
      this.add.image(cx + thumbW * 0.02, thumbY - 22, this.chosen.tree).setDepth(7).setScale(0.42).setMask(mask),
    ];
    this.add.image(cx - thumbW * 0.05, thumbY + 14, 'ghost').setDepth(8).setScale(0.7).setMask(mask);

    this.nameText = this.add.text(cx, cy + cardH / 2 - 24, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(7).setShadow(0, 2, '#000', 5);

    // ---- roll schedule: which map to show and when (ease-out deceleration) ----
    const order = Biomes.ORDER, n = order.length;
    const chosenIdx = Math.max(0, order.indexOf(this.chosen.key));
    const steps = 15;
    const startOff = ((chosenIdx - (steps - 1)) % n + n * 10) % n;
    this.seq = [];
    this.stepAt = [];              // ms into the roll when each flip should show
    let acc = 0;
    for (let i = 0; i < steps; i++) {
      this.seq.push(order[(startOff + i) % n]);
      this.stepAt.push(acc);
      const t = i / (steps - 1);
      acc += 55 + Math.pow(t, 2.2) * 300; // ~55ms -> ~355ms between flips
    }
    this.rollEndMs = acc;          // when the last flip is done -> reveal
    this.REVEAL_HOLD = 650;        // ms to admire the winner before the game
    this.HARD_CAP = 6000;          // ms absolute fail-safe from first update

    this.phase = 'roll';
    this.shown = -1;
    this.startMs = null;
    this.revealMs = 0;
    this.launched = false;
    this.skip = false;

    // draw the first card straight away so the screen is never blank
    this._drawCard(Biomes.LIST[this.seq[0]], false);

    // tap / space / enter skips to the reveal
    this.input.on('pointerdown', () => { this.skip = true; });
    this.input.keyboard.on('keydown-SPACE', () => { this.skip = true; });
    this.input.keyboard.on('keydown-ENTER', () => { this.skip = true; });

    UI.restartOnResize(this);
  }

  _sfx(name) {
    try { if (SFX && SFX[name]) SFX[name](); } catch (e) { /* audio is non-critical */ }
  }

  _drawCard(biome, highlight) {
    if (!biome) biome = this.chosen;
    const cx = this._cx, cy = this._cy, cardW = this._cardW, cardH = this._cardH;
    const accent = { forest: 0x6fce6a, graveyard: 0x9fb0a0, snow: 0xbfe0ff }[biome.key] || 0x6fb8ff;
    this.panel.clear();
    this.panel.fillStyle(0x0d0a06, 0.92);
    this.panel.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 18);
    this.panel.lineStyle(highlight ? 5 : 3, accent, highlight ? 1 : 0.6);
    this.panel.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 18);
    this.thumb.setTexture(biome.ground);
    this.thumbTrees.forEach((t) => t.setTexture(biome.tree));
    this.nameText.setText((biome.icon || '') + '  ' + (biome.label || ''));
    this.nameText.setColor(highlight ? ('#' + accent.toString(16).padStart(6, '0')) : '#ffffff');
  }

  // Everything is driven here so it advances with the render loop, not timers.
  update(time) {
    if (this.launched) return;
    if (this.startMs === null) this.startMs = time;
    const elapsed = time - this.startMs;

    if (this.phase === 'roll') {
      // absolute fail-safe + skip + natural end all lead to the reveal
      if (this.skip || elapsed >= this.rollEndMs || elapsed >= this.HARD_CAP) {
        this.enterReveal(time);
        return;
      }
      // show the latest flip whose scheduled time has passed
      let idx = 0;
      while (idx < this.stepAt.length - 1 && elapsed >= this.stepAt[idx + 1]) idx++;
      if (idx !== this.shown) {
        this.shown = idx;
        try { this._drawCard(Biomes.LIST[this.seq[idx]], false); } catch (e) { /* ignore */ }
        this._sfx('click');
      }
    } else if (this.phase === 'reveal') {
      if (time >= this.revealMs || elapsed >= this.HARD_CAP + this.REVEAL_HOLD) {
        this.launch();
      }
    }
  }

  enterReveal(time) {
    if (this.phase !== 'roll') return;
    this.phase = 'reveal';
    this.revealMs = time + this.REVEAL_HOLD;
    try {
      this._drawCard(this.chosen, true);
      this._sfx('boost');
      this.tweens.add({ targets: [this.nameText], scale: { from: 1.25, to: 1 }, duration: 260, ease: 'Back.out' });
      this.cameras.main.flash(180, 255, 255, 255);
      this.add.text(this.scale.width / 2, this.scale.height * 0.84, 'GO!', {
        fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#ffd54a',
      }).setOrigin(0.5).setDepth(8).setShadow(0, 2, '#000', 5);
    } catch (e) { /* visuals are non-critical */ }
  }

  // Single, idempotent path into the game.
  launch() {
    if (this.launched) return;
    this.launched = true;
    this.scene.start('Game');
  }
}
