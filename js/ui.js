// Shared UI helpers used by the menu and settings screens so they match the
// in-game forest look: a drifting-fog backdrop, styled buttons, a slider.
const UI = {
  // Full-screen forest backdrop (brown earth + blue fog + a few trees).
  backdrop(scene) {
    const W = scene.scale.width, H = scene.scale.height;
    scene.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0).setScrollFactor(0).setDepth(-20);

    for (let i = 0; i < 9; i++) {
      const puff = scene.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 'fog')
        .setScrollFactor(0).setDepth(-15)
        .setScale(Phaser.Math.FloatBetween(1.8, 3.2))
        .setAlpha(Phaser.Math.FloatBetween(0.26, 0.46))
        .setBlendMode(Phaser.BlendModes.SCREEN);
      scene.tweens.add({
        targets: puff,
        x: puff.x + Phaser.Math.Between(-120, 120),
        y: puff.y + Phaser.Math.Between(-70, 70),
        duration: Phaser.Math.Between(8000, 15000),
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }

    // decorative trees framing the edges
    [[50, H - 30], [W - 55, H - 55], [95, H * 0.26], [W - 95, H * 0.3]].forEach(([tx, ty]) => {
      scene.add.image(tx, ty, 'tree').setScrollFactor(0).setScale(0.95).setAlpha(0.85).setDepth(-14);
    });

    // subtle darkening so text stays legible over the fog
    scene.add.rectangle(0, 0, W, H, 0x120a04, 0.3).setOrigin(0).setScrollFactor(0).setDepth(-12);
  },

  // A rounded, glowing button. Returns the container.
  button(scene, x, y, label, onClick, opts = {}) {
    const w = opts.width || 240, h = opts.height || 58;
    const fs = opts.fontSize || 24;
    const accent = opts.accent || 0x6fb8ff;
    const bg = opts.bg || 0x241a10;
    const c = scene.add.container(x, y).setDepth(opts.depth || 100).setScrollFactor(0);
    let active = false;
    const g = scene.add.graphics();
    const draw = (hot) => {
      g.clear();
      g.fillStyle(hot ? 0x3a2a18 : bg, 0.92);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      g.lineStyle(hot ? 3 : 2, accent, hot ? 0.95 : 0.55);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    };
    draw(false);
    const txt = scene.add.text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif', fontSize: fs + 'px', fontStyle: 'bold', color: '#eaf6ff',
    }).setOrigin(0.5);
    const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    c.add([g, txt, zone]);
    zone.on('pointerover', () => { draw(true); scene.tweens.add({ targets: c, scale: 1.04, duration: 120 }); });
    zone.on('pointerout', () => { draw(active); scene.tweens.add({ targets: c, scale: 1, duration: 120 }); });
    zone.on('pointerdown', (p, lx, ly, event) => {
      if (event) event.stopPropagation();
      SFX.unlock();
      SFX.click();
      if (onClick) onClick();
    });
    c.setLabel = (t) => txt.setText(t);
    c.setActiveState = (a) => { active = a; draw(a); }; // persistent selected look
    return c;
  },

  // A horizontal slider (0..1). Returns { setValue, container }.
  slider(scene, cx, cy, width, value, onChange) {
    const left = cx - width / 2;
    const track = scene.add.rectangle(cx, cy, width, 8, 0x2a1c10)
      .setStrokeStyle(1, 0x6fb8ff, 0.5).setScrollFactor(0).setDepth(100);
    const fill = scene.add.rectangle(left, cy, width * value, 8, 0x6fb8ff)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    const thumb = scene.add.circle(left + width * value, cy, 14, 0xbfe6ff)
      .setStrokeStyle(2, 0xffffff, 0.6).setScrollFactor(0).setDepth(102);

    const setV = (v, fire = true) => {
      v = Phaser.Math.Clamp(v, 0, 1);
      thumb.x = left + width * v;
      fill.width = width * v;
      if (fire && onChange) onChange(v);
    };

    thumb.setInteractive({ useHandCursor: true });
    scene.input.setDraggable(thumb);
    thumb.on('drag', (p, dragX) => setV((dragX - left) / width));
    track.setInteractive({ useHandCursor: true });
    track.on('pointerdown', (p) => setV((p.x - left) / width));

    return { setValue: (v) => setV(v, false), track, fill, thumb };
  },
};
