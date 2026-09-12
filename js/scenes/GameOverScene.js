// End screen (forest-styled): final score, highscore, and buttons to play
// again or return to the main menu.
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

    UI.backdrop(this);
    this.add.rectangle(0, 0, W, H, 0x0a0806, 0.55).setOrigin(0).setScrollFactor(0).setDepth(-11);

    this.add.text(cx, H * 0.2, 'CAUGHT!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '56px', fontStyle: 'bold', color: '#ff5b5b',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 4, '#5a0000', 12, false, true);

    // a forlorn split ghost
    const l = this.add.image(cx - 24, H * 0.37, 'ghost').setCrop(0, 0, 24, 56).setAngle(-30).setAlpha(0.75).setDepth(3);
    const r = this.add.image(cx + 24, H * 0.37, 'ghost').setCrop(24, 0, 24, 56).setAngle(30).setAlpha(0.75).setDepth(3);
    this.tweens.add({ targets: [l, r], y: '+=6', duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.text(cx, H * 0.52, 'Score: ' + this.finalScore, {
      fontFamily: 'system-ui, sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 2, '#000', 4);

    if (this.isNew) {
      const nr = this.add.text(cx, H * 0.585, '✨ NEW RECORD! ✨', {
        fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffd54a',
      }).setOrigin(0.5).setDepth(3);
      this.tweens.add({ targets: nr, scale: { from: 1, to: 1.15 }, duration: 500, yoyo: true, repeat: -1 });
    } else {
      this.add.text(cx, H * 0.585, 'Best: ' + Storage.getHighscore(), {
        fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ffd54a',
      }).setOrigin(0.5).setDepth(3);
    }

    // buttons appear after a short delay so the death tap doesn't hit them
    this.time.delayedCall(500, () => {
      UI.button(this, cx, H * 0.72, '↻  Play Again', () => this.scene.start('Game'), { width: 260, height: 60, fontSize: 24 });
      UI.button(this, cx, H * 0.72 + 78, '🏠  Main Menu', () => this.scene.start('Menu'), { width: 260, height: 54, fontSize: 22 });
    });
  }
}
