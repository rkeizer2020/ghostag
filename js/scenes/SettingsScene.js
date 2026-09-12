// Settings screen (forest-styled): pick difficulty and set the volume.
class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2;

    UI.backdrop(this);

    this.add.text(cx, H * 0.13, 'Settings', {
      fontFamily: 'system-ui, sans-serif', fontSize: '48px', fontStyle: 'bold', color: '#bfe6ff',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 0, '#6fb8ff', 18, true, true);

    // --- Difficulty ---
    this.add.text(cx, H * 0.30, 'Difficulty', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#eaf6ff',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 2, '#000', 4);

    const current = Settings.getDifficulty();
    this.diffButtons = {};
    const bw = 150, gap = 16;
    const totalW = Settings.ORDER.length * bw + (Settings.ORDER.length - 1) * gap;
    let bx = cx - totalW / 2 + bw / 2;
    Settings.ORDER.forEach((key) => {
      const label = Settings.DIFFICULTIES[key].label;
      const btn = UI.button(this, bx, H * 0.30 + 56, label, () => this.selectDifficulty(key), {
        width: bw, height: 52, fontSize: 20,
      });
      this.diffButtons[key] = btn;
      bx += bw + gap;
    });
    this.selectDifficulty(current, false);

    this.diffHint = this.add.text(cx, H * 0.30 + 100, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#9fc4d8',
    }).setOrigin(0.5).setDepth(3);
    this.updateDiffHint(current);

    // --- Volume ---
    this.add.text(cx, H * 0.58, 'Volume', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#eaf6ff',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 2, '#000', 4);

    this.volLabel = this.add.text(cx, H * 0.58 + 30, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#ffd54a',
    }).setOrigin(0.5).setDepth(3);

    const sliderW = Math.min(360, W - 120);
    UI.slider(this, cx, H * 0.58 + 66, sliderW, SFX.volume, (v) => {
      SFX.setVolume(v);
      this.updateVolLabel(v);
      // gentle audible feedback while dragging
      if (!this._lastTick || this.time.now - this._lastTick > 90) {
        SFX.pickup();
        this._lastTick = this.time.now;
      }
    });
    this.updateVolLabel(SFX.volume);

    // --- Back ---
    UI.button(this, cx, H * 0.86, '←  Back', () => this.scene.start('Menu'), { width: 220, height: 56, fontSize: 22 });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
    UI.restartOnResize(this);
  }

  selectDifficulty(key, save = true) {
    if (save) Settings.setDifficulty(key);
    Settings.ORDER.forEach((k) => this.diffButtons[k].setActiveState(k === key));
    this.updateDiffHint(key);
  }

  updateDiffHint(key) {
    if (!this.diffHint) return;
    const hints = {
      easy: 'The Spook is slower and speeds up gently.',
      normal: 'A balanced chase.',
      hard: 'The Spook is fast and accelerates quickly.',
    };
    this.diffHint.setText(hints[key] || '');
  }

  updateVolLabel(v) {
    this.volLabel.setText(Math.round(v * 100) + '%');
  }
}
