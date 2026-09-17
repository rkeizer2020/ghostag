// Title screen, styled to match the forest map: drifting blue fog over brown
// earth, the glowing blue TAGZ logo, and Play / Settings buttons.
class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2;

    UI.backdrop(this);

    // decorative chase: your equipped ghost (with skin) fleeing the Spook
    const skin = Settings.skin();
    const decorTex = (skin.kind === 'default') ? Settings.character().tex : skin.tex;
    const ghost = this.add.image(cx - 70, H * 0.34, decorTex).setScale(1.5).setDepth(1);
    const spook = this.add.image(cx + 70, H * 0.34, 'spook').setScale(1.35).setDepth(1);
    const sword = this.add.image(cx + 70, H * 0.34 - 46, 'sword').setScale(1.15).setDepth(2);
    if (skin.kind === 'owner') {
      const face = this.add.image(cx - 70, H * 0.34 - ghost.displayHeight * 0.125, 'ownerFace')
        .setScale(1.2).setDepth(2).setTint(Settings.charColor(Settings.getCharacter()));
      this.tweens.add({ targets: face, y: '-=12', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    if (skin.hat) {
      const hat = this.add.image(cx - 70, H * 0.34 - ghost.displayHeight * 0.34, skin.hat).setOrigin(0.5, 1).setScale(1.4).setDepth(2);
      this.tweens.add({ targets: hat, y: '-=12', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.tweens.add({ targets: ghost, y: '-=12', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: [spook, sword], y: '-=10', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: sword, angle: { from: -8, to: 8 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // glowing blue GHOSTAG logo (layered shadows create the glow)
    const logoSize = Math.min(80, Math.round(W * 0.15));
    const title = this.add.text(cx, H * 0.14, 'GHOSTAG', {
      fontFamily: 'system-ui, sans-serif', fontSize: logoSize + 'px', fontStyle: 'bold', color: '#bfe6ff',
    }).setOrigin(0.5).setDepth(3);
    title.setShadow(0, 0, '#6fb8ff', 24, true, true);
    this.tweens.add({ targets: title, alpha: { from: 1, to: 0.82 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Brawl-Stars-style badges in the top-left corner
    UI.statBadge(this, 14, 30, '⭐', String(Storage.bestOverall()), { height: 40, fontSize: 18 });
    UI.statBadge(this, 14, 76, '🪙', String(Storage.getCoins()), { height: 40, fontSize: 18 });

    // buttons
    UI.button(this, cx, H * 0.50, '▶  Play', () => this.startGame(), { width: 260, height: 56, fontSize: 27 });
    UI.button(this, cx, H * 0.50 + 62, '👻  Characters', () => this.scene.start('Characters'), { width: 260, height: 50, fontSize: 21 });
    UI.button(this, cx, H * 0.50 + 120, '🪙  Skins', () => this.scene.start('Skins'), { width: 260, height: 50, fontSize: 21 });
    UI.button(this, cx, H * 0.50 + 178, '⚙  Settings', () => this.scene.start('Settings'), { width: 260, height: 50, fontSize: 21 });

    // account: log in to sync across devices
    const accLabel = Auth.loggedIn() ? ('👤  ' + (Auth.username() || 'Account')) : '👤  Log in';
    UI.button(this, cx, H * 0.50 + 236, accLabel, () => UI.accountPanel(() => {
      if (this.scene.isActive()) this.scene.restart();
    }), { width: 260, height: 46, fontSize: 20, accent: 0x8fe6a0 });

    const isTouch = this.sys.game.device.input.touch;
    this.add.text(cx, H * 0.97, isTouch
      ? 'Drag to move  •  tap LOG to drop a log'
      : 'WASD / arrows to move  •  Space to drop a log', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#8a9aa4',
      align: 'center', wordWrap: { width: W - 60 },
    }).setOrigin(0.5).setDepth(3);

    // leaderboard: open the global top-players screen (everyone)
    const lb = this.add.text(14, 118, '🏆 Leaderboard', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#171019',
      backgroundColor: '#ffd54a', padding: { x: 10, y: 6 },
    }).setScrollFactor(0).setDepth(2000).setInteractive({ useHandCursor: true });
    lb.on('pointerdown', (p, x, y, event) => {
      if (event) event.stopPropagation();
      SFX.click();
      this.scene.start('Leaderboard');
    });

    // admin tools: only the founder/admin accounts see this button
    if (Storage.isFounderUnlocked()) {
      const ab = this.add.text(W - 16, 60, '🛠 Admin', {
        fontFamily: 'system-ui, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#171019',
        backgroundColor: '#ffd54a', padding: { x: 10, y: 6 },
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(2000).setInteractive({ useHandCursor: true });
      ab.on('pointerdown', (p, x, y, event) => {
        if (event) event.stopPropagation();
        UI.adminPanel(() => { if (this.scene.isActive()) this.scene.restart(); });
      });
    }

    this.makeMuteButton();
    UI.restartOnResize(this);

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
