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
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.infoObjs) this.closeInfo(); else this.scene.start('Menu');
    });
    UI.restartOnResize(this);
  }

  makeCard(key, x, y, w, h) {
    const info = Settings.CHARACTERS[key];
    const unlocked = Settings.isUnlocked(key);
    const accent = this.accentFor(key);
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
      container.add(this.add.text(0, top + h * 0.58, info.icon + ' ' + info.abilityName, {
        fontFamily: 'system-ui, sans-serif', fontSize: clamp(h * 0.062, 12, 15) + 'px', fontStyle: 'bold', color: accentHex,
        align: 'center', wordWrap: { width: w - 20 },
      }).setOrigin(0.5));
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
    const rowW = w - 24;
    const infoW = clamp(btnH, 34, 46);      // square-ish info button
    const gap = 8;
    const mainW = rowW - infoW - gap;        // Equip / locked chip takes the rest
    const mainX = x - rowW / 2 + mainW / 2;
    const infoX = x + rowW / 2 - infoW / 2;
    let btn = null;
    if (unlocked) {
      btn = UI.button(this, mainX, btnY, 'Equip', () => this.equip(key), {
        width: mainW, height: btnH, fontSize: clamp(h * 0.075, 15, 18), accent,
      });
    } else {
      // non-interactive "locked" chip
      const lockG = this.add.graphics().setDepth(3);
      lockG.fillStyle(0x241d12, 0.9);
      lockG.fillRoundedRect(mainX - mainW / 2, btnY - btnH / 2, mainW, btnH, 12);
      lockG.lineStyle(2, 0x5a5348, 0.7);
      lockG.strokeRoundedRect(mainX - mainW / 2, btnY - btnH / 2, mainW, btnH, 12);
      this.add.text(mainX, btnY, '🔒 ' + info.unlock, {
        fontFamily: 'system-ui, sans-serif', fontSize: clamp(h * 0.065, 13, 16) + 'px', fontStyle: 'bold', color: '#c9a26a',
      }).setOrigin(0.5).setDepth(4);
    }
    // info button: opens a popup explaining what the character does
    UI.button(this, infoX, btnY, 'ℹ', () => this.showInfo(key), {
      width: infoW, height: btnH, fontSize: clamp(h * 0.085, 16, 20), accent: 0x6fb8ff,
    });

    this.cards[key] = { drawPanel, btn, unlocked };
  }

  accentFor(key) {
    return { blue: 0x6fb8ff, red: 0xff6b7a, green: 0x6fe0a0, purple: 0xb98fe0, yellow: 0xffd24a, brown: 0xc79a6a, pink: 0xff8fd0, black: 0x9a9ab4, magma: 0xff6a3a, forest: 0x6fce6a, volt: 0x6fd0ff, alien: 0x6bffb0, lucky: 0x9be87a, ninja: 0xd42a3a, chrono: 0x2fd6c0, void: 0x8f5fd0, spider: 0x6fe0a0 }[key] || 0x6fb8ff;
  }

  // Popup describing a character's abilities (opened by the ℹ button).
  showInfo(key) {
    this.closeInfo();
    const info = Settings.CHARACTERS[key];
    if (!info) return;
    const W = this.scale.width, H = this.scale.height, cx = W / 2, cy = H / 2;
    const accent = this.accentFor(key);
    const accentHex = '#' + accent.toString(16).padStart(6, '0');
    const unlocked = Settings.isUnlocked(key);
    const D = 300; // above the cards' buttons (UI.button renders at depth 100)
    const objs = [];

    const shade = this.add.rectangle(cx, cy, W, H, 0x000000, 0.62).setDepth(D).setScrollFactor(0).setInteractive();
    shade.on('pointerdown', () => this.closeInfo());
    objs.push(shade);

    const pw = Math.min(380, W - 40), ph = Math.min(340, H - 70);
    const top = cy - ph / 2;
    const g = this.add.graphics().setDepth(D + 1);
    g.fillStyle(0x140f0a, 0.98); g.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 18);
    g.lineStyle(3, accent, 0.95); g.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 18);
    objs.push(g);

    const ghost = this.add.image(cx, top + 58, info.tex).setScale(1.6).setDepth(D + 2);
    if (!unlocked) ghost.setTint(0x2a2a2a);
    objs.push(ghost);

    objs.push(this.add.text(cx, top + 108, info.label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '23px', fontStyle: 'bold', color: '#eaf6ff',
    }).setOrigin(0.5).setDepth(D + 2).setShadow(0, 2, '#000', 4));

    objs.push(this.add.text(cx, top + 138, info.icon + '  ' + info.abilityName, {
      fontFamily: 'system-ui, sans-serif', fontSize: '17px', fontStyle: 'bold', color: accentHex,
    }).setOrigin(0.5).setDepth(D + 2));

    objs.push(this.add.text(cx, top + 166, info.desc, {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#cdd8e0',
      align: 'center', wordWrap: { width: pw - 44 }, lineSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(D + 2));

    const um = unlocked ? '✓ Unlocked' : ('🔒 Reach ' + info.unlock + ' points to unlock');
    objs.push(this.add.text(cx, cy + ph / 2 - 50, um, {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: unlocked ? '#9fe6a0' : '#ffd54a',
    }).setOrigin(0.5).setDepth(D + 2));

    objs.push(this.add.text(cx, cy + ph / 2 - 24, 'tap anywhere to close', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#8a8378',
    }).setOrigin(0.5).setDepth(D + 2));

    SFX.click();
    this.infoObjs = objs;
  }

  closeInfo() {
    if (!this.infoObjs) return;
    this.infoObjs.forEach((o) => o.destroy());
    this.infoObjs = null;
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
