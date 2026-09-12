// Title screen: shows the premise, the highscore, and how to control the
// game. Any key or tap starts play (and unlocks audio).
class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;

    this.add.rectangle(0, 0, W, H, GAME.COLORS.bg).setOrigin(0).setScrollFactor(0);

    // decorative floating ghost + chasing spook
    const ghost = this.add.image(cx - 70, H * 0.34, 'ghost').setScale(1.6);
    const spook = this.add.image(cx + 70, H * 0.34, 'spook').setScale(1.4);
    const sword = this.add.image(cx + 70, H * 0.34 - 46, 'sword').setScale(1.2);
    this.tweens.add({ targets: ghost, y: '-=12', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: [spook, sword], y: '-=10', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: sword, angle: { from: -8, to: 8 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.text(cx, H * 0.12, 'TAGZ', {
      fontFamily: 'system-ui, sans-serif', fontSize: '72px', fontStyle: 'bold',
      color: '#bfe6ff',
    }).setOrigin(0.5).setShadow(0, 4, '#6fb8ff', 12, false, true);

    this.add.text(cx, H * 0.12 + 56, 'Het Spookje en het Spook', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#9a8fc0',
    }).setOrigin(0.5);

    const hs = Storage.getHighscore();
    this.add.text(cx, H * 0.56, 'Highscore: ' + hs, {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#ffd54a',
    }).setOrigin(0.5);

    const isTouch = this.sys.game.device.input.touch;
    const controls = isTouch
      ? 'Sleep met je duim om te bewegen'
      : 'Beweeg met WASD of de pijltjestoetsen';
    this.add.text(cx, H * 0.66, controls, {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#8a80a8',
    }).setOrigin(0.5);

    this.add.text(cx, H * 0.72, 'Pak de gouden bolletjes  •  ontwijk de grafstenen  •  overleef!', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#6f688c',
      align: 'center', wordWrap: { width: W - 60 },
    }).setOrigin(0.5);

    const start = this.add.text(cx, H * 0.85, isTouch ? 'TIK OM TE STARTEN' : 'DRUK OP EEN TOETS', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#3a2a5e', padding: { x: 20, y: 12 },
    }).setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: { from: 1, to: 0.5 }, duration: 700, yoyo: true, repeat: -1 });

    this.makeMuteButton();

    const begin = () => {
      SFX.unlock();
      SFX.click();
      this.scene.start('Game');
    };
    this.input.keyboard.once('keydown', begin);
    this.input.once('pointerdown', (p) => {
      // don't start if they tapped the mute button
      if (p.x > W - 70 && p.y < 70) return;
      begin();
    });
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
