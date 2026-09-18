// A quick slot-machine "roll" shown after pressing Play: it cycles through the
// three maps and decelerates onto the one the game randomly picked, so you can
// see where you're about to play. Tap / Space skips straight to the reveal.
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

    // ---- preview card (updated on every tick of the roll) ----
    const cardW = Math.min(360, W - 48);
    const cardH = Math.min(240, H * 0.46);
    const thumbW = cardW - 24, thumbH = cardH - 74;
    const thumbY = cy - cardH / 2 + 12 + thumbH / 2;

    this.panel = this.add.graphics().setDepth(5);

    // rectangular map thumbnail (ground + a couple of obstacles + a ghost)
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
    this.thumbGhost = this.add.image(cx - thumbW * 0.05, thumbY + 14, 'ghost').setDepth(8).setScale(0.7).setMask(mask);

    // name + icon under the thumbnail
    this.nameText = this.add.text(cx, cy + cardH / 2 - 24, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(7).setShadow(0, 2, '#000', 5);

    this._drawCard = (biome, highlight) => {
      const accent = { forest: 0x6fce6a, graveyard: 0x9fb0a0, snow: 0xbfe0ff }[biome.key] || 0x6fb8ff;
      this.panel.clear();
      this.panel.fillStyle(0x0d0a06, 0.92);
      this.panel.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 18);
      this.panel.lineStyle(highlight ? 5 : 3, accent, highlight ? 1 : 0.6);
      this.panel.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 18);
      this.thumb.setTexture(biome.ground);
      this.thumbTrees.forEach((t) => t.setTexture(biome.tree));
      this.nameText.setText((biome.icon || '') + '  ' + (biome.label || ''));
      const hex = '#' + accent.toString(16).padStart(6, '0');
      this.nameText.setColor(highlight ? hex : '#ffffff');
    };

    // skip: jump straight to the reveal
    this.input.once('pointerdown', () => this.finishNow());
    this.input.keyboard.once('keydown-SPACE', () => this.finishNow());
    this.input.keyboard.once('keydown-ENTER', () => this.finishNow());

    this.startRoll();
    UI.restartOnResize(this);
  }

  // Build a sequence that steps through the maps in order and lands on `chosen`,
  // slowing down as it goes (ease-out), then reveals and launches the game.
  startRoll() {
    const order = Biomes.ORDER;
    const n = order.length;
    const chosenIdx = order.indexOf(this.chosen.key);
    const steps = 15; // total flips before the final reveal
    // offset so the last flip lands exactly on the chosen map
    const startOff = ((chosenIdx - (steps - 1)) % n + n * 10) % n;

    this.seq = [];
    for (let i = 0; i < steps; i++) this.seq.push(order[(startOff + i) % n]);

    this.step = 0;
    this.tick();
  }

  tick() {
    if (this.done) return;
    const key = this.seq[this.step];
    const biome = Biomes.LIST[key];
    const last = this.step === this.seq.length - 1;
    this._drawCard(biome, last);
    if (SFX && SFX.click) SFX.click();

    if (last) { this.reveal(); return; }

    // ease-out: each flip waits a little longer than the previous one
    const t = this.step / (this.seq.length - 1);
    const delay = 55 + Math.pow(t, 2.2) * 300; // ~55ms -> ~355ms
    this.step++;
    this.time.delayedCall(delay, () => this.tick());
  }

  // Immediate skip: land on the chosen map and reveal right away.
  finishNow() {
    if (this.done) return;
    this.done = true;
    this._drawCard(this.chosen, true);
    this.reveal();
  }

  reveal() {
    this.done = true;
    if (SFX && SFX.boost) SFX.boost();
    // little pop on the card
    this.tweens.add({ targets: [this.nameText], scale: { from: 1.25, to: 1 }, duration: 260, ease: 'Back.out' });
    this.cameras.main.flash(180, 255, 255, 255);
    this.add.text(this.scale.width / 2, this.scale.height * 0.84, 'GO!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#ffd54a',
    }).setOrigin(0.5).setDepth(8).setShadow(0, 2, '#000', 5);
    this.time.delayedCall(650, () => this.scene.start('Game'));
  }
}
