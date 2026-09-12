// Title screen, styled to match the forest map: drifting blue fog over brown
// earth, the glowing blue TAGZ logo, and Play / Settings buttons.
class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2;

    UI.backdrop(this);

    // decorative chase: bright ghost fleeing the stealthy blue Spook
    const ghost = this.add.image(cx - 70, H * 0.34, 'ghost').setScale(1.5).setDepth(1);
    const spook = this.add.image(cx + 70, H * 0.34, 'spook').setScale(1.35).setDepth(1);
    const sword = this.add.image(cx + 70, H * 0.34 - 46, 'sword').setScale(1.15).setDepth(2);
    this.tweens.add({ targets: ghost, y: '-=12', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: [spook, sword], y: '-=10', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: sword, angle: { from: -8, to: 8 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // glowing blue TAGZ logo (layered shadows create the glow)
    const title = this.add.text(cx, H * 0.14, 'TAGZ', {
      fontFamily: 'system-ui, sans-serif', fontSize: '80px', fontStyle: 'bold', color: '#bfe6ff',
    }).setOrigin(0.5).setDepth(3);
    title.setShadow(0, 0, '#6fb8ff', 24, true, true);
    this.tweens.add({ targets: title, alpha: { from: 1, to: 0.82 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.text(cx, H * 0.14 + 58, 'The Little Ghost and the Spook', {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#9fc4d8',
    }).setOrigin(0.5).setDepth(3);

    this.add.text(cx, H * 0.52, 'Best: ' + Storage.getHighscore(), {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#ffd54a',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 2, '#000', 4);

    // buttons
    UI.button(this, cx, H * 0.65, '▶  Play', () => this.startGame(), { width: 260, height: 64, fontSize: 28 });
    UI.button(this, cx, H * 0.65 + 84, '⚙  Settings', () => this.scene.start('Settings'), { width: 260, height: 56, fontSize: 22 });

    const isTouch = this.sys.game.device.input.touch;
    this.add.text(cx, H * 0.93, isTouch
      ? 'Drag to move  •  tap LOG to drop a log'
      : 'WASD / arrows to move  •  Space to drop a log', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#8a9aa4',
      align: 'center', wordWrap: { width: W - 60 },
    }).setOrigin(0.5).setDepth(3);

    this.makeMuteButton();

    // keyboard shortcut: Enter / Space to play
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
  }

  startGame() {
    SFX.unlock();
    SFX.click();
    this.scene.start('Game');
  }

  makeMuteButton() {
    const W = this.scale.width;
    const btn = this.add.text(W - 20, 20, SFX.muted ? '🔇' : '🔊', {
      fontSize: '28px',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(2000);
    btn.on('pointerdown', (pointer, x, y, event) => {
      if (event) event.stopPropagation();
      SFX.unlock();
      const muted = SFX.toggleMute();
      btn.setText(muted ? '🔇' : '🔊');
    });
  }
}
