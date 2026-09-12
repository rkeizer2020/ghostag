// End screen with final score, highscore, and a "new record" flourish.
class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.isNew = !!data.isNew;
  }

  create() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2;

    this.add.rectangle(0, 0, W, H, 0x0a0812, 0.92).setOrigin(0).setScrollFactor(0);

    this.add.text(cx, H * 0.22, 'GEPAKT!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '56px', fontStyle: 'bold', color: '#ff5b5b',
    }).setOrigin(0.5).setShadow(0, 4, '#5a0000', 10, false, true);

    // a forlorn split ghost
    const l = this.add.image(cx - 24, H * 0.4, 'ghost').setCrop(0, 0, 24, 56).setAngle(-30).setAlpha(0.7);
    const r = this.add.image(cx + 24, H * 0.4, 'ghost').setCrop(24, 0, 24, 56).setAngle(30).setAlpha(0.7);
    this.tweens.add({ targets: [l, r], y: '+=6', duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.text(cx, H * 0.56, 'Score: ' + this.finalScore, {
      fontFamily: 'system-ui, sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    if (this.isNew) {
      const nr = this.add.text(cx, H * 0.63, '✨ NIEUW RECORD! ✨', {
        fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffd54a',
      }).setOrigin(0.5);
      this.tweens.add({ targets: nr, scale: { from: 1, to: 1.15 }, duration: 500, yoyo: true, repeat: -1 });
    } else {
      this.add.text(cx, H * 0.63, 'Best: ' + Storage.getHighscore(), {
        fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ffd54a',
      }).setOrigin(0.5);
    }

    const isTouch = this.sys.game.device.input.touch;
    const btn = this.add.text(cx, H * 0.8, isTouch ? 'TIK OM OPNIEUW TE SPELEN' : 'DRUK OP EEN TOETS', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#3a2a5e', padding: { x: 18, y: 10 },
    }).setOrigin(0.5);
    this.tweens.add({ targets: btn, alpha: { from: 1, to: 0.5 }, duration: 700, yoyo: true, repeat: -1 });

    const restart = () => {
      SFX.click();
      this.scene.start('Game');
    };
    // small delay so the death tap doesn't instantly restart
    this.time.delayedCall(600, () => {
      this.input.keyboard.once('keydown', restart);
      this.input.once('pointerdown', restart);
    });

    this.add.text(cx, H * 0.9, 'M = geluid aan/uit', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#6f688c',
    }).setOrigin(0.5);
  }
}
