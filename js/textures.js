// Procedural texture generation. Everything is drawn with the Phaser
// Graphics API and baked into textures at boot, so the game ships with
// zero image assets.
const Textures = {
  makeAll(scene) {
    this._ghost(scene, 'ghost', { glow: 0x6fb8ff, glow2: 0x9fd2ff, body: 0xbfe6ff, eye: 0x1a2b40 });
    this._ghost(scene, 'ghostRed', { glow: 0xff5b6e, glow2: 0xff8f9c, body: 0xff8a8a, eye: 0x5a1420 });
    this._ghost(scene, 'ghostGreen', { glow: 0x3fbf6a, glow2: 0x7fe0a0, body: 0x8fe6a0, eye: 0x144a24 });
    this._ghost(scene, 'ghostPurple', { glow: 0x7a3fbf, glow2: 0xb98fe0, body: 0xc79cff, eye: 0x2a1444 });
    this.spook(scene);
    this.sword(scene);
    this.slash(scene);
    this.shield(scene);
    this.orb(scene);
    this.tree(scene);
    this.log(scene);
    this.ground(scene);
    this.fog(scene);
    this.particle(scene);
  },

  _ghost(scene, key, c) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 56;
    // soft glow
    g.fillStyle(c.glow, 0.18);
    g.fillCircle(w / 2, h / 2, 26);
    g.fillStyle(c.glow2, 0.28);
    g.fillCircle(w / 2, h / 2, 20);
    // body
    g.fillStyle(c.body, 1);
    g.fillCircle(w / 2, 22, 16);
    g.fillRect(w / 2 - 16, 22, 32, 20);
    // wavy bottom
    g.fillTriangle(w / 2 - 16, 42, w / 2 - 8, 42, w / 2 - 12, 52);
    g.fillTriangle(w / 2 - 8, 42, w / 2, 42, w / 2 - 4, 52);
    g.fillTriangle(w / 2, 42, w / 2 + 8, 42, w / 2 + 4, 52);
    g.fillTriangle(w / 2 + 8, 42, w / 2 + 16, 42, w / 2 + 12, 52);
    // highlight
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(w / 2 - 5, 18, 5);
    // eyes
    g.fillStyle(c.eye, 1);
    g.fillCircle(w / 2 - 6, 22, 3);
    g.fillCircle(w / 2 + 6, 22, 3);
    g.generateTexture(key, w, h);
    g.destroy();
  },

  slash(scene) {
    // A bright forward-facing crescent for the Red ghost's smash. Drawn
    // bulging toward +x so it can be rotated to the facing direction in game.
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const s = 160, cx = s / 2, cy = s / 2, r = 52;
    g.lineStyle(18, 0xffffff, 0.95);
    g.beginPath(); g.arc(cx, cy, r, -Math.PI / 3, Math.PI / 3, false); g.strokePath();
    g.lineStyle(8, 0xbfe6ff, 1);
    g.beginPath(); g.arc(cx, cy, r, -Math.PI / 3, Math.PI / 3, false); g.strokePath();
    g.generateTexture('slash', s, s);
    g.destroy();
  },

  shield(scene) {
    // translucent protective bubble drawn around the Green ghost
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const s = 84, c = s / 2;
    g.fillStyle(0x8fffce, 0.16);
    g.fillCircle(c, c, 38);
    g.lineStyle(4, 0x9fffd0, 0.9);
    g.strokeCircle(c, c, 38);
    g.lineStyle(2, 0xffffff, 0.55);
    g.strokeCircle(c, c, 32);
    // little sparkle highlight
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(c + 16, c - 22, 3);
    g.generateTexture('shield', s, s);
    g.destroy();
  },

  spook(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 60, h = 68;
    // faint cold aura (helps it melt into the blue fog)
    g.fillStyle(0x2f5a7a, 0.12);
    g.fillCircle(w / 2, h / 2, 30);
    // body (dark blue - hard to see in the fog)
    g.fillStyle(0x1e3a52, 1);
    g.fillCircle(w / 2, 26, 20);
    g.fillRect(w / 2 - 20, 26, 40, 26);
    // ragged bottom
    for (let i = 0; i < 5; i++) {
      const x = w / 2 - 20 + i * 8;
      g.fillTriangle(x, 52, x + 8, 52, x + 4, 64);
    }
    // darker shading
    g.fillStyle(0x152a3d, 1);
    g.fillRect(w / 2 - 20, 40, 40, 12);
    // dim, pale eyes (no more red - stealthier)
    g.fillStyle(0x8fb8d8, 0.85);
    g.fillCircle(w / 2 - 8, 24, 3.5);
    g.fillCircle(w / 2 + 8, 24, 3.5);
    g.fillStyle(0x22384a, 1);
    g.fillCircle(w / 2 - 8, 25, 1.6);
    g.fillCircle(w / 2 + 8, 25, 1.6);
    g.generateTexture('spook', w, h);
    g.destroy();
  },

  sword(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 20, h = 60;
    // blade
    g.fillStyle(0xffe066, 1);
    g.fillRect(w / 2 - 3, 4, 6, 38);
    g.fillTriangle(w / 2 - 3, 4, w / 2 + 3, 4, w / 2, -2 + 4);
    // shine
    g.fillStyle(0xfff6c0, 1);
    g.fillRect(w / 2 - 1, 6, 2, 34);
    // guard
    g.fillStyle(0xc99a2e, 1);
    g.fillRect(w / 2 - 8, 42, 16, 4);
    // hilt
    g.fillStyle(0x8a5a1a, 1);
    g.fillRect(w / 2 - 2, 46, 4, 12);
    // pommel
    g.fillStyle(0xffe066, 1);
    g.fillCircle(w / 2, 58, 3);
    g.generateTexture('sword', w, h);
    g.destroy();
  },

  orb(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const s = 28;
    g.fillStyle(0xffd54a, 0.25);
    g.fillCircle(s / 2, s / 2, 13);
    g.fillStyle(0xffd54a, 1);
    g.fillCircle(s / 2, s / 2, 8);
    g.fillStyle(0xfff3b0, 1);
    g.fillCircle(s / 2 - 2, s / 2 - 2, 3);
    g.generateTexture('orb', s, s);
    g.destroy();
  },

  tree(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 76, h = 96;
    const cx = w / 2;
    // shadow
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(cx, h - 8, 52, 16);
    // trunk
    g.fillStyle(0x4a3320, 1);
    g.fillRect(cx - 6, 58, 12, 30);
    g.fillStyle(0x3a2718, 1);
    g.fillRect(cx - 6, 58, 4, 30);
    // pine foliage (three stacked triangles)
    const green = 0x2f6b3a, dark = 0x255730, light = 0x3c8248;
    g.fillStyle(dark, 1);
    g.fillTriangle(cx, 4, cx - 30, 44, cx + 30, 44);
    g.fillStyle(green, 1);
    g.fillTriangle(cx, 2, cx - 28, 42, cx + 28, 42);
    g.fillStyle(green, 1);
    g.fillTriangle(cx, 24, cx - 32, 66, cx + 32, 66);
    // highlights
    g.fillStyle(light, 0.7);
    g.fillTriangle(cx, 6, cx - 10, 40, cx + 2, 40);
    g.fillTriangle(cx, 28, cx - 12, 62, cx + 2, 62);
    // snowy/misty flecks
    g.fillStyle(0xbfe6ff, 0.15);
    for (let i = 0; i < 8; i++) {
      g.fillCircle(cx + Phaser.Math.Between(-24, 24), Phaser.Math.Between(20, 62), 1.5);
    }
    g.generateTexture('tree', w, h);
    g.destroy();
  },

  log(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 84, h = 40;
    // shadow
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(w / 2, h - 6, 74, 14);
    // log body
    g.fillStyle(0x6b4a2a, 1);
    g.fillRoundedRect(6, 6, w - 12, 24, 12);
    g.fillStyle(0x7d5834, 1);
    g.fillRoundedRect(6, 6, w - 12, 12, 12);
    // bark rings on the ends
    g.fillStyle(0x8a6a44, 1);
    g.fillCircle(15, 18, 9);
    g.fillCircle(w - 15, 18, 9);
    g.fillStyle(0x5a3f24, 1);
    g.fillCircle(15, 18, 4.5);
    g.fillCircle(w - 15, 18, 4.5);
    // a couple of bark lines
    g.lineStyle(2, 0x5a3f24, 0.7);
    g.beginPath(); g.moveTo(30, 12); g.lineTo(30, 26); g.strokePath();
    g.beginPath(); g.moveTo(48, 12); g.lineTo(48, 26); g.strokePath();
    g.generateTexture('log', w, h);
    g.destroy();
  },

  ground(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const s = 128;
    // brown earth
    g.fillStyle(0x3d2b1a, 1);
    g.fillRect(0, 0, s, s);
    // dirt patches (lighter and darker soil)
    for (let i = 0; i < 10; i++) {
      g.fillStyle(Phaser.Math.RND.pick([0x4a3420, 0x342414, 0x453018]), 0.5);
      g.fillCircle(Phaser.Math.Between(0, s), Phaser.Math.Between(0, s), Phaser.Math.Between(10, 26));
    }
    // pebbles / soil specks
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, s);
      const y = Phaser.Math.Between(0, s);
      const a = Phaser.Math.FloatBetween(0.06, 0.16);
      g.fillStyle(Phaser.Math.RND.pick([0x5a4028, 0x2a1c10, 0x6b4d2e]), a);
      g.fillRect(x, y, 2, 2);
    }
    g.generateTexture('ground', s, s);
    g.destroy();
  },

  fog(scene) {
    // soft radial blue puff used for the drifting fog layer
    const s = 256, r = s / 2;
    const canvas = scene.textures.createCanvas('fog', s, s);
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(90,160,255,0.75)');
    grad.addColorStop(0.5, 'rgba(70,140,255,0.32)');
    grad.addColorStop(1, 'rgba(70,140,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    canvas.refresh();
  },

  particle(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('spark', 8, 8);
    g.destroy();
  },
};
