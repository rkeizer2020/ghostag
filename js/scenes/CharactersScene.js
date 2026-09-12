// Character select (forest-styled): a row of cards, each showing the ghost,
// its special ability, and an Equip button. The chosen character is saved.
class CharactersScene extends Phaser.Scene {
  constructor() {
    super('Characters');
  }

  create() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2;

    UI.backdrop(this);

    this.add.text(cx, H * 0.09, 'Characters', {
      fontFamily: 'system-ui, sans-serif', fontSize: '42px', fontStyle: 'bold', color: '#bfe6ff',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 0, '#6fb8ff', 18, true, true);

    const keys = Settings.CHAR_ORDER;
    const n = keys.length;
    const gap = 14;
    const cardW = Math.min(210, (W - 60 - gap * (n - 1)) / n);
    const totalW = n * cardW + (n - 1) * gap;
    let x = cx - totalW / 2 + cardW / 2;

    this.cards = {};
    keys.forEach((key) => {
      this.makeCard(key, x, H * 0.52, cardW, 344);
      x += cardW + gap;
    });

    this.refreshCards();

    UI.button(this, cx, H * 0.93, '←  Back', () => this.scene.start('Menu'), { width: 220, height: 50, fontSize: 20 });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  makeCard(key, x, y, w, h) {
    const info = Settings.CHARACTERS[key];
    const accent = { blue: 0x6fb8ff, red: 0xff6b7a, green: 0x6fe0a0, purple: 0xb98fe0 }[key] || 0x6fb8ff;
    const accentHex = '#' + accent.toString(16).padStart(6, '0');
    const top = -h / 2;

    const container = this.add.container(x, y).setDepth(3);
    const panel = this.add.graphics();
    const drawPanel = (selected) => {
      panel.clear();
      panel.fillStyle(0x1a120a, 0.9);
      panel.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
      panel.lineStyle(selected ? 4 : 2, accent, selected ? 1 : 0.5);
      panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    };
    drawPanel(false);
    container.add(panel);

    const ghost = this.add.image(0, top + 62, info.tex).setScale(1.35);
    container.add(ghost);
    this.tweens.add({ targets: ghost, y: ghost.y - 7, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    container.add(this.add.text(0, top + 118, info.label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#eaf6ff',
    }).setOrigin(0.5));

    container.add(this.add.text(0, top + 144, info.icon + ' ' + info.abilityName, {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: accentHex,
    }).setOrigin(0.5));

    container.add(this.add.text(0, top + 166, info.desc, {
      fontFamily: 'system-ui, sans-serif', fontSize: '11.5px', color: '#b8c4cc',
      align: 'center', wordWrap: { width: w - 26 }, lineSpacing: 2,
    }).setOrigin(0.5, 0));

    const btn = UI.button(this, x, y + h / 2 - 28, 'Equip', () => this.equip(key), {
      width: w - 26, height: 40, fontSize: 18, accent,
    });

    this.cards[key] = { drawPanel, btn };
  }

  equip(key) {
    Settings.setCharacter(key);
    this.refreshCards();
  }

  refreshCards() {
    const current = Settings.getCharacter();
    Settings.CHAR_ORDER.forEach((key) => {
      const card = this.cards[key];
      const selected = key === current;
      card.drawPanel(selected);
      card.btn.setActiveState(selected);
      card.btn.setLabel(selected ? '✓ Equipped' : 'Equip');
    });
  }
}
