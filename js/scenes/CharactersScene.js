// Character select (forest-styled): two cards, each showing the ghost, its
// special ability, and an Equip button. The chosen character is saved.
class CharactersScene extends Phaser.Scene {
  constructor() {
    super('Characters');
  }

  create() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2;

    UI.backdrop(this);

    this.add.text(cx, H * 0.12, 'Characters', {
      fontFamily: 'system-ui, sans-serif', fontSize: '46px', fontStyle: 'bold', color: '#bfe6ff',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 0, '#6fb8ff', 18, true, true);

    this.cards = {};
    const cardW = Math.min(300, (W - 60) / 2);
    const gap = 28;
    const x0 = cx - (cardW + gap) / 2;
    const positions = { blue: x0, red: x0 + cardW + gap };

    Settings.CHAR_ORDER.forEach((key) => {
      this.cards[key] = this.makeCard(key, positions[key], H * 0.5, cardW);
    });

    this.refreshCards();

    UI.button(this, cx, H * 0.88, '←  Back', () => this.scene.start('Menu'), { width: 220, height: 54, fontSize: 22 });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  makeCard(key, x, y, w) {
    const info = Settings.CHARACTERS[key];
    const h = 320;
    const accent = key === 'red' ? 0xff6b7a : 0x6fb8ff;

    const container = this.add.container(x, y).setDepth(3);
    const panel = this.add.graphics();
    const drawPanel = (selected) => {
      panel.clear();
      panel.fillStyle(0x1a120a, 0.9);
      panel.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      panel.lineStyle(selected ? 4 : 2, accent, selected ? 1 : 0.5);
      panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    };
    drawPanel(false);
    container.add(panel);
    container._drawPanel = drawPanel;

    // ghost portrait (bobbing)
    const ghost = this.add.image(0, -h / 2 + 74, info.tex).setScale(1.9);
    container.add(ghost);
    this.tweens.add({ targets: ghost, y: ghost.y - 8, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // name
    container.add(this.add.text(0, -h / 2 + 132, info.label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#eaf6ff',
    }).setOrigin(0.5));

    // ability badge + description
    container.add(this.add.text(0, -h / 2 + 162, info.icon + ' ' + info.abilityName, {
      fontFamily: 'system-ui, sans-serif', fontSize: '17px', fontStyle: 'bold',
      color: key === 'red' ? '#ff9aa5' : '#8fd0ff',
    }).setOrigin(0.5));
    container.add(this.add.text(0, -h / 2 + 208, info.desc, {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#b8c4cc',
      align: 'center', wordWrap: { width: w - 36 },
    }).setOrigin(0.5, 0));

    // equip button
    const btn = UI.button(this, x, y + h / 2 - 34, 'Equip', () => this.equip(key), {
      width: w - 48, height: 46, fontSize: 20, accent,
    });
    this.cards[key] = { container, drawPanel, btn };
    return this.cards[key];
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
      card.btn.setLabel(selected ? '✓  Equipped' : 'Equip');
    });
  }
}
