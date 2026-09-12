// Procedural texture generation. Everything is drawn with the Phaser
// Graphics API and baked into textures at boot, so the game ships with
// zero image assets.
const Textures = {
  makeAll(scene) {
    this.ghost(scene);
    this.spook(scene);
    this.sword(scene);
    this.orb(scene);
    this.gravestone(scene);
    this.ground(scene);
    this.particle(scene);
  },

  ghost(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 56;
    // soft glow
    g.fillStyle(0x6fb8ff, 0.18);
    g.fillCircle(w / 2, h / 2, 26);
    g.fillStyle(0x9fd2ff, 0.28);
    g.fillCircle(w / 2, h / 2, 20);
    // body
    g.fillStyle(0xbfe6ff, 1);
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
    g.fillStyle(0x1a2b40, 1);
    g.fillCircle(w / 2 - 6, 22, 3);
    g.fillCircle(w / 2 + 6, 22, 3);
    g.generateTexture('ghost', w, h);
    g.destroy();
  },

  spook(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 60, h = 68;
    // menacing aura
    g.fillStyle(0x7a1fbf, 0.15);
    g.fillCircle(w / 2, h / 2, 30);
    // body (purple-black)
    g.fillStyle(0x2a1440, 1);
    g.fillCircle(w / 2, 26, 20);
    g.fillRect(w / 2 - 20, 26, 40, 26);
    // ragged bottom
    for (let i = 0; i < 5; i++) {
      const x = w / 2 - 20 + i * 8;
      g.fillTriangle(x, 52, x + 8, 52, x + 4, 64);
    }
    // darker shading
    g.fillStyle(0x1a0c2e, 1);
    g.fillRect(w / 2 - 20, 40, 40, 12);
    // glowing red eyes
    g.fillStyle(0xff2b2b, 1);
    g.fillCircle(w / 2 - 8, 24, 4.5);
    g.fillCircle(w / 2 + 8, 24, 4.5);
    g.fillStyle(0xffb0b0, 0.9);
    g.fillCircle(w / 2 - 8, 23, 1.6);
    g.fillCircle(w / 2 + 8, 23, 1.6);
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

  gravestone(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 56, h = 72;
    // shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(w / 2, h - 8, 48, 14);
    // stone base
    g.fillStyle(0x6b6f7a, 1);
    g.fillRoundedRect(w / 2 - 20, 16, 40, 48, { tl: 20, tr: 20, bl: 2, br: 2 });
    // darker edge
    g.fillStyle(0x53565f, 1);
    g.fillRoundedRect(w / 2 - 20, 16, 8, 48, { tl: 20, tr: 0, bl: 2, br: 0 });
    // cross engraving
    g.fillStyle(0x44464d, 1);
    g.fillRect(w / 2 - 2, 26, 4, 20);
    g.fillRect(w / 2 - 8, 32, 16, 4);
    // R I P
    g.fillStyle(0x3a3c42, 1);
    g.fillRect(w / 2 - 10, 50, 3, 8);
    g.fillRect(w / 2 - 1, 50, 3, 8);
    g.fillRect(w / 2 + 8, 50, 3, 8);
    g.generateTexture('grave', w, h);
    g.destroy();
  },

  ground(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const s = 128;
    g.fillStyle(0x141024, 1);
    g.fillRect(0, 0, s, s);
    // subtle graveyard turf specks
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, s);
      const y = Phaser.Math.Between(0, s);
      const a = Phaser.Math.FloatBetween(0.03, 0.09);
      g.fillStyle(0x2a2340, a);
      g.fillRect(x, y, 2, 2);
    }
    // faint fog blotches
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0x1c1730, 0.35);
      g.fillCircle(Phaser.Math.Between(0, s), Phaser.Math.Between(0, s), Phaser.Math.Between(8, 20));
    }
    g.generateTexture('ground', s, s);
    g.destroy();
  },

  particle(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('spark', 8, 8);
    g.destroy();
  },
};
