// Character select (forest-styled): a responsive grid of cards. Characters
// unlock as your best score climbs; locked cards show what to reach.
class CharactersScene extends Phaser.Scene {
  constructor() {
    super('Characters');
  }

  create() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2;

    UI.backdrop(this);

    this.add.text(cx, H * 0.075, 'Characters', {
      fontFamily: 'system-ui, sans-serif', fontSize: Math.min(40, Math.round(W * 0.085)) + 'px',
      fontStyle: 'bold', color: '#bfe6ff',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 0, '#6fb8ff', 18, true, true);

    // best-score banner (drives unlocks)
    this.add.text(cx, H * 0.13, '⭐ Best: ' + Storage.bestOverall(), {
      fontFamily: 'system-ui, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#ffd54a',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 2, '#000', 4);

    const keys = Settings.CHAR_ORDER;
    const n = keys.length;
    const cols = W >= H ? 3 : 2;
    const rows = Math.ceil(n / cols);
    const gapX = 14, gapY = 14;

    const topArea = H * 0.18, bottomArea = H * 0.88;
    const availH = bottomArea - topArea;
    const cardH = Math.min(300, (availH - gapY * (rows - 1)) / rows);
    const cardW = Math.min(240, (W - 32 - gapX * (cols - 1)) / cols);

    const gridW = cols * cardW + (cols - 1) * gapX;
    const startX = cx - gridW / 2 + cardW / 2;
    const startY = topArea + cardH / 2;

    this.cards = {};
    keys.forEach((key, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      this.makeCard(key, startX + c * (cardW + gapX), startY + r * (cardH + gapY), cardW, cardH);
    });

    this.refreshCards();

    UI.button(this, cx, H * 0.945, '←  Back', () => this.scene.start('Menu'), { width: 200, height: 46, fontSize: 20 });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
    UI.restartOnResize(this);
  }

  makeCard(key, x, y, w, h) {
    const info = Settings.CHARACTERS[key];
    const unlocked = Settings.isUnlocked(key);
    const accent = { blue: 0x6fb8ff, red: 0xff6b7a, green: 0x6fe0a0, purple: 0xb98fe0, yellow: 0xffd24a, brown: 0xc79a6a, pink: 0xff8fd0, black: 0x9a9ab4, magma: 0xff6a3a }[key] || 0x6fb8ff;
    const accentHex = '#' + accent.toString(16).padStart(6, '0');
    const top = -h / 2;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const container = this.add.container(x, y).setDepth(3);
    const panel = this.add.graphics();
    const drawPanel = (selected) => {
      panel.clear();
      panel.fillStyle(unlocked ? 0x1a120a : 0x0f0c08, unlocked ? 0.9 : 0.92);
      panel.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
      panel.lineStyle(selected ? 4 : 2, unlocked ? accent : 0x5a5348, selected ? 1 : 0.5);
      panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    };
    drawPanel(false);
    container.add(panel);

    const ghost = this.add.image(0, top + h * 0.24, info.tex).setScale(clamp(h * 0.006, 0.9, 1.5));
    if (!unlocked) ghost.setTint(0x2a2a2a); // silhouette when locked
    container.add(ghost);
    if (unlocked) {
      this.tweens.add({ targets: ghost, y: ghost.y - 6, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    container.add(this.add.text(0, top + h * 0.45, info.label, {
      fontFamily: 'system-ui, sans-serif', fontSize: clamp(h * 0.075, 13, 17) + 'px', fontStyle: 'bold',
      color: unlocked ? '#eaf6ff' : '#8a8378',
    }).setOrigin(0.5));

    if (unlocked) {
      container.add(this.add.text(0, top + h * 0.56, info.icon + ' ' + info.abilityName, {
        fontFamily: 'system-ui, sans-serif', fontSize: clamp(h * 0.062, 12, 15) + 'px', fontStyle: 'bold', color: accentHex,
      }).setOrigin(0.5));
      container.add(this.add.text(0, top + h * 0.64, info.desc, {
        fontFamily: 'system-ui, sans-serif', fontSize: clamp(h * 0.05, 10, 12) + 'px', color: '#b8c4cc',
        align: 'center', wordWrap: { width: w - 24 }, lineSpacing: 2,
      }).setOrigin(0.5, 0));
    } else {
      // big lock over the silhouette
      container.add(this.add.text(0, top + h * 0.24, '🔒', {
        fontSize: clamp(h * 0.13, 26, 40) + 'px',
      }).setOrigin(0.5));
      container.add(this.add.text(0, top + h * 0.56, 'Locked', {
        fontFamily: 'system-ui, sans-serif', fontSize: clamp(h * 0.062, 12, 15) + 'px', fontStyle: 'bold', color: '#9a9080',
      }).setOrigin(0.5));
      container.add(this.add.text(0, top + h * 0.66, 'Reach ' + info.unlock + ' points', {
        fontFamily: 'system-ui, sans-serif', fontSize: clamp(h * 0.052, 11, 13) + 'px', fontStyle: 'bold', color: '#ffd54a',
        align: 'center', wordWrap: { width: w - 24 },
      }).setOrigin(0.5, 0));
    }

    const btnH = clamp(h * 0.15, 34, 46);
    const btnY = y + h / 2 - btnH * 0.55;
    let btn = null;
    if (unlocked) {
      btn = UI.button(this, x, btnY, 'Equip', () => this.equip(key), {
        width: w - 24, height: btnH, fontSize: clamp(h * 0.075, 15, 18), accent,
      });
    } else {
      // non-interactive "locked" chip
      const lockG = this.add.graphics().setDepth(3);
      lockG.fillStyle(0x241d12, 0.9);
      lockG.fillRoundedRect(x - (w - 24) / 2, btnY - btnH / 2, w - 24, btnH, 12);
      lockG.lineStyle(2, 0x5a5348, 0.7);
      lockG.strokeRoundedRect(x - (w - 24) / 2, btnY - btnH / 2, w - 24, btnH, 12);
      this.add.text(x, btnY, '🔒 ' + info.unlock, {
        fontFamily: 'system-ui, sans-serif', fontSize: clamp(h * 0.07, 14, 17) + 'px', fontStyle: 'bold', color: '#c9a26a',
      }).setOrigin(0.5).setDepth(4);
    }

    this.cards[key] = { drawPanel, btn, unlocked };
  }

  equip(key) {
    if (!Settings.isUnlocked(key)) return;
    Settings.setCharacter(key);
    Auth.queuePush(); // sync equipped character
    this.refreshCards();
  }

  refreshCards() {
    const current = Settings.getCharacter();
    Settings.CHAR_ORDER.forEach((key) => {
      const card = this.cards[key];
      if (!card.unlocked) return;
      const selected = key === current;
      card.drawPanel(selected);
      if (card.btn) {
        card.btn.setActiveState(selected);
        card.btn.setLabel(selected ? '✓ Equipped' : 'Equip');
      }
    });
  }
}
