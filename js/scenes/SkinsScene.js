// Skins shop (forest-styled): buy cosmetic looks with coins and equip one.
// Skins are purely visual and separate from the character (ability) choice.
class SkinsScene extends Phaser.Scene {
  constructor() {
    super('Skins');
  }

  create() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2;

    UI.backdrop(this);

    this.add.text(cx, H * 0.075, 'Skins', {
      fontFamily: 'system-ui, sans-serif', fontSize: Math.min(40, Math.round(W * 0.085)) + 'px',
      fontStyle: 'bold', color: '#bfe6ff',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 0, '#6fb8ff', 18, true, true);

    this.coinsText = this.add.text(cx, H * 0.135, '🪙 ' + Storage.getCoins(), {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffd54a',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 2, '#000', 4);

    // the owner skin only appears once unlocked with the secret link
    const keys = Settings.SKIN_ORDER.filter((id) => id !== 'owner' || Storage.isOwnerUnlocked());
    const n = keys.length;
    const cols = W >= H ? 3 : 2;
    const rows = Math.ceil(n / cols);
    const gapX = 12, gapY = 12;

    const topArea = H * 0.19, bottomArea = H * 0.88;
    const availH = bottomArea - topArea;
    const cardH = Math.min(210, (availH - gapY * (rows - 1)) / rows);
    const cardW = Math.min(220, (W - 28 - gapX * (cols - 1)) / cols);

    const gridW = cols * cardW + (cols - 1) * gapX;
    const startX = cx - gridW / 2 + cardW / 2;
    const startY = topArea + cardH / 2;

    this.cards = {};
    keys.forEach((id, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      this.makeCard(id, startX + c * (cardW + gapX), startY + r * (cardH + gapY), cardW, cardH);
    });
    this.refreshCards();

    UI.button(this, cx, H * 0.945, '←  Back', () => this.scene.start('Menu'), { width: 200, height: 46, fontSize: 20 });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
    UI.restartOnResize(this);
  }

  makeCard(id, x, y, w, h) {
    const skin = Settings.SKINS[id];
    const top = -h / 2;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const accent = 0x6fb8ff;

    const container = this.add.container(x, y).setDepth(3);
    const panel = this.add.graphics();
    const draw = (selected) => {
      panel.clear();
      panel.fillStyle(0x1a120a, 0.9);
      panel.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      panel.lineStyle(selected ? 4 : 2, accent, selected ? 1 : 0.5);
      panel.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    };
    draw(false);
    container.add(panel);

    // preview: the skin's ghost look (classic uses your character's colour)
    const previewTex = (skin.kind === 'default') ? Settings.character().tex : skin.tex;
    const gscale = clamp(h * 0.0055, 0.8, 1.2);
    const gy = top + h * 0.32;
    const ghost = this.add.image(0, gy, previewTex).setScale(gscale);
    container.add(ghost);
    if (skin.kind === 'owner') {
      const face = this.add.image(0, gy - ghost.displayHeight * 0.125, 'ownerFace')
        .setScale(gscale * 0.8).setTint(Settings.charColor(Settings.getCharacter()));
      container.add(face);
    }
    if (skin.hat) {
      const hat = this.add.image(0, gy - ghost.displayHeight * 0.40, skin.hat).setScale(gscale);
      container.add(hat);
    }
    if (skin.rainbow) {
      // hint at the effect with a coloured tint
      ghost.setTint(0xff9a9a);
    }

    container.add(this.add.text(0, top + h * 0.58, skin.name, {
      fontFamily: 'system-ui, sans-serif', fontSize: clamp(h * 0.085, 13, 17) + 'px', fontStyle: 'bold', color: '#eaf6ff',
    }).setOrigin(0.5));

    const btnH = clamp(h * 0.18, 34, 44);
    const btnY = y + h / 2 - btnH * 0.62;
    const btn = UI.button(this, x, btnY, 'Equip', () => this.onCardTap(id), {
      width: w - 22, height: btnH, fontSize: clamp(h * 0.085, 14, 17), accent,
    });

    this.cards[id] = { draw, btn };
  }

  onCardTap(id) {
    if (Storage.isSkinOwned(id)) {
      Settings.setSkin(id);
      SFX.click();
    } else if (Settings.buySkin(id)) {
      Settings.setSkin(id); // auto-equip on purchase
      SFX.pickup();
      this.coinsText.setText('🪙 ' + Storage.getCoins());
    } else {
      SFX.warn(); // not enough coins
    }
    Auth.queuePush(); // sync coins / owned skins / equipped skin
    this.refreshCards();
  }

  refreshCards() {
    const current = Settings.getSkin();
    Settings.SKIN_ORDER.forEach((id) => {
      const skin = Settings.SKINS[id];
      const owned = Storage.isSkinOwned(id);
      const selected = id === current;
      const card = this.cards[id];
      card.draw(selected);
      card.btn.setActiveState(selected);
      if (owned) {
        card.btn.setLabel(selected ? '✓ Equipped' : 'Equip');
      } else {
        const afford = Storage.getCoins() >= skin.cost;
        card.btn.setLabel((afford ? '🪙 ' : '🔒 ') + skin.cost);
      }
    });
  }
}
