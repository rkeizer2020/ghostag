// Procedural texture generation. Everything is drawn with the Phaser
// Graphics API and baked into textures at boot, so the game ships with
// zero image assets.
const Textures = {
  makeAll(scene) {
    this._ghost(scene, 'ghost', { glow: 0x6fb8ff, glow2: 0x9fd2ff, body: 0xbfe6ff, eye: 0x1a2b40 });
    this._ghost(scene, 'ghostRed', { glow: 0xff5b6e, glow2: 0xff8f9c, body: 0xff8a8a, eye: 0x5a1420 });
    this._ghost(scene, 'ghostGreen', { glow: 0x3fbf6a, glow2: 0x7fe0a0, body: 0x8fe6a0, eye: 0x144a24 });
    this._ghost(scene, 'ghostPurple', { glow: 0x7a3fbf, glow2: 0xb98fe0, body: 0xc79cff, eye: 0x2a1444 });
    this._ghost(scene, 'ghostYellow', { glow: 0xd9a400, glow2: 0xffe680, body: 0xffe066, eye: 0x5a4410 });
    this._ghost(scene, 'ghostBrown', { glow: 0x7a4f28, glow2: 0xc79a6a, body: 0xb98a5e, eye: 0x3a2614 });
    this._ghost(scene, 'ghostPink', { glow: 0xd94a9a, glow2: 0xffb0e0, body: 0xff8fd0, eye: 0x5a1440 });
    this._ghost(scene, 'ghostBlack', { glow: 0x5a5a72, glow2: 0x9a9ab4, body: 0x4a4a5a, eye: 0xdfe6f0 });
    // skin bodies
    this._ghost(scene, 'skinEmber', { glow: 0xff5a1a, glow2: 0xffb060, body: 0xff7a3a, eye: 0x4a1000 });
    this._ghost(scene, 'skinFrost', { glow: 0x6fd0ff, glow2: 0xd0f0ff, body: 0xe8f6ff, eye: 0x2a4a5a });
    this._ghost(scene, 'skinToxic', { glow: 0x3fbf2a, glow2: 0x9fff6a, body: 0x7fe04a, eye: 0x143a10 });
    this._ghost(scene, 'skinWhite', { glow: 0xffffff, glow2: 0xffffff, body: 0xffffff, eye: 0x333333 });
    this._ghost(scene, 'skinNeutral', { glow: 0x9fb0c0, glow2: 0xd8e0e8, body: 0xdfe6ee, eye: 0x2a3440 });
    this._ghost(scene, 'skinDevil', { glow: 0xff2010, glow2: 0xff7050, body: 0xd41818, eye: 0xffe066 });
    this._ghost(scene, 'skinSmurf', { glow: 0x2f7fd9, glow2: 0x8fd0ff, body: 0x3fa0ff, eye: 0x14314a });
    this.skinPumpkin(scene);
    this.skinSkull(scene);
    this.skinGold(scene);
    this.skinGalaxy(scene);
    this.skinNeon(scene);
    this.skinDiamond(scene);
    this.skinWizard(scene);
    this.skinWizardGnome(scene);
    this.ownerFace(scene);
    this.hatCrown(scene);
    this.hatWitch(scene);
    this.hatMoney(scene);
    this.hatHalo(scene);
    this.hatHorns(scene);
    this.hatGnome(scene);
    this.spook(scene);
    this.sword(scene);
    this.slash(scene);
    this.heartArrow(scene);
    this.pellet(scene);
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

  // Pink ghost's heart arrow. Drawn pointing toward +x so it can be rotated
  // to the firing direction in game.
  heartArrow(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 40, h = 24, cy = h / 2, hx = 30;
    // shaft
    g.lineStyle(3, 0xffe0f0, 0.95);
    g.beginPath(); g.moveTo(3, cy); g.lineTo(24, cy); g.strokePath();
    // fletching
    g.fillStyle(0xff8fd0, 1);
    g.fillTriangle(2, cy, 9, cy - 5, 9, cy + 5);
    // heart head
    g.fillStyle(0xff4a8a, 1);
    g.fillCircle(hx - 3, cy - 3, 5);
    g.fillCircle(hx + 4, cy - 3, 5);
    g.fillTriangle(hx - 8, cy - 1, hx + 9, cy - 1, hx + 0.5, cy + 10);
    // sparkle
    g.fillStyle(0xffd0e6, 0.9);
    g.fillCircle(hx - 3, cy - 4, 1.8);
    g.generateTexture('heartArrow', w, h);
    g.destroy();
  },

  // Black ghost's shotgun pellet: a small bright bolt.
  pellet(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const s = 16, c = s / 2;
    g.fillStyle(0xfff2b0, 0.4); g.fillCircle(c, c, 7);
    g.fillStyle(0xffe066, 1); g.fillCircle(c, c, 4.2);
    g.fillStyle(0xffffff, 1); g.fillCircle(c - 1, c - 1, 1.6);
    g.generateTexture('pellet', s, s);
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

  // Ghost body helper without eyes (for skins that draw their own face).
  _ghostBody(g, w, h, c) {
    g.fillStyle(c.glow, 0.18);
    g.fillCircle(w / 2, h / 2, 26);
    g.fillStyle(c.glow2, 0.28);
    g.fillCircle(w / 2, h / 2, 20);
    g.fillStyle(c.body, 1);
    g.fillCircle(w / 2, 22, 16);
    g.fillRect(w / 2 - 16, 22, 32, 20);
    g.fillTriangle(w / 2 - 16, 42, w / 2 - 8, 42, w / 2 - 12, 52);
    g.fillTriangle(w / 2 - 8, 42, w / 2, 42, w / 2 - 4, 52);
    g.fillTriangle(w / 2, 42, w / 2 + 8, 42, w / 2 + 4, 52);
    g.fillTriangle(w / 2 + 8, 42, w / 2 + 16, 42, w / 2 + 12, 52);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(w / 2 - 5, 16, 4);
  },

  skinPumpkin(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 56, cx = w / 2;
    this._ghostBody(g, w, h, { glow: 0xff7a1a, glow2: 0xffb060, body: 0xff8a2a });
    // carved jack-o'-lantern face
    g.fillStyle(0x3a1400, 1);
    g.fillTriangle(cx - 10, 18, cx - 3, 24, cx - 10, 24);   // left eye
    g.fillTriangle(cx + 10, 18, cx + 3, 24, cx + 10, 24);   // right eye
    g.fillTriangle(cx, 26, cx - 4, 31, cx + 4, 31);         // nose
    g.fillRect(cx - 11, 34, 22, 4);                          // mouth
    g.fillStyle(0xff8a2a, 1);
    [cx - 7, cx - 1, cx + 5].forEach((x) => g.fillRect(x, 34, 3, 4)); // teeth gaps
    g.generateTexture('skinPumpkin', w, h);
    g.destroy();
  },

  skinSkull(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 56, cx = w / 2;
    this._ghostBody(g, w, h, { glow: 0xbfc6d0, glow2: 0xe8ecf2, body: 0xf2f4f8 });
    // skull face
    g.fillStyle(0x1a1f28, 1);
    g.fillCircle(cx - 6, 22, 4.5);   // left socket
    g.fillCircle(cx + 6, 22, 4.5);   // right socket
    g.fillTriangle(cx, 27, cx - 2.5, 31, cx + 2.5, 31); // nose
    // teeth
    g.fillRect(cx - 8, 35, 16, 5);
    g.fillStyle(0xf2f4f8, 1);
    [cx - 5, cx - 1, cx + 3].forEach((x) => g.fillRect(x, 35, 1.6, 5));
    g.generateTexture('skinSkull', w, h);
    g.destroy();
  },

  // Faceless gold ghost body for the owner "Rich" skin.
  skinGold(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 56;
    this._ghostBody(g, w, h, { glow: 0xffd54a, glow2: 0xffe27a, body: 0xf0c24a });
    // warm rim light
    g.lineStyle(2, 0xfff2b0, 0.6);
    g.strokeCircle(w / 2, 22, 16);
    g.generateTexture('skinGold', w, h);
    g.destroy();
  },

  // Deep-space body with nebula tints and a scatter of stars.
  skinGalaxy(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 56, cx = w / 2;
    this._ghostBody(g, w, h, { glow: 0x6a3fbf, glow2: 0xb98fe0, body: 0x2a1a4a });
    g.fillStyle(0x7a3fbf, 0.5); g.fillCircle(cx - 6, 26, 7);
    g.fillStyle(0x3f6fbf, 0.4); g.fillCircle(cx + 7, 34, 6);
    g.fillStyle(0xffffff, 0.95);
    [[cx - 9, 16, 1.6], [cx + 9, 18, 1.3], [cx - 4, 32, 1.2], [cx + 4, 36, 1.5], [cx - 11, 36, 1], [cx + 11, 30, 1.2]]
      .forEach((s) => g.fillCircle(s[0], s[1], s[2]));
    g.fillStyle(0xdfe8ff, 1);
    g.fillCircle(cx - 6, 22, 3); g.fillCircle(cx + 6, 22, 3);
    g.generateTexture('skinGalaxy', w, h);
    g.destroy();
  },

  // Dark body with glowing neon outlines.
  skinNeon(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 56, cx = w / 2;
    this._ghostBody(g, w, h, { glow: 0xff2fd0, glow2: 0x2ffff0, body: 0x12122a });
    g.lineStyle(2.5, 0x2ffff0, 0.95); g.strokeCircle(cx, 22, 16);
    g.lineStyle(2, 0xff2fd0, 0.85);
    g.beginPath();
    g.moveTo(cx - 14, 44); g.lineTo(cx - 6, 50); g.lineTo(cx + 2, 44); g.lineTo(cx + 10, 50); g.lineTo(cx + 14, 44);
    g.strokePath();
    g.fillStyle(0x2ffff0, 1); g.fillCircle(cx - 6, 22, 3); g.fillCircle(cx + 6, 22, 3);
    g.fillStyle(0xffffff, 1); g.fillCircle(cx - 6, 21, 1); g.fillCircle(cx + 6, 21, 1);
    g.generateTexture('skinNeon', w, h);
    g.destroy();
  },

  // Icy crystal body with facet lines and sparkles.
  skinDiamond(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 56, cx = w / 2;
    this._ghostBody(g, w, h, { glow: 0x7fd0ff, glow2: 0xd8f4ff, body: 0xbfe8ff });
    g.lineStyle(1.4, 0xffffff, 0.7);
    g.beginPath(); g.moveTo(cx, 10); g.lineTo(cx - 12, 26); g.strokePath();
    g.beginPath(); g.moveTo(cx, 10); g.lineTo(cx + 12, 26); g.strokePath();
    g.beginPath(); g.moveTo(cx - 12, 26); g.lineTo(cx, 40); g.lineTo(cx + 12, 26); g.strokePath();
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(cx - 8, 16, 1.6); g.fillCircle(cx + 9, 30, 1.4); g.fillCircle(cx + 3, 14, 1.2);
    g.fillStyle(0x2a5a7a, 1);
    g.fillCircle(cx - 6, 22, 3); g.fillCircle(cx + 6, 22, 3);
    g.generateTexture('skinDiamond', w, h);
    g.destroy();
  },

  // Round glasses, a lightning scar and a striped scarf (the "boy wizard" look).
  _wizardFace(g, cx, o) {
    // eyes
    g.fillStyle(o.eye, 1);
    g.fillCircle(cx - 6, 22, 3); g.fillCircle(cx + 6, 22, 3);
    // round glasses
    g.lineStyle(1.6, 0x1a1a1a, 1);
    g.strokeCircle(cx - 6, 22, 5); g.strokeCircle(cx + 6, 22, 5);
    g.beginPath(); g.moveTo(cx - 1, 22); g.lineTo(cx + 1, 22); g.strokePath();
    // lightning scar on the forehead
    g.lineStyle(1.6, o.scar, 1);
    g.beginPath();
    g.moveTo(cx - 10, 12); g.lineTo(cx - 8, 15); g.lineTo(cx - 11, 16); g.lineTo(cx - 9, 19);
    g.strokePath();
    // striped scarf across the neck
    g.fillStyle(o.scarf1, 1); g.fillRect(cx - 16, 37, 32, 5);
    g.fillStyle(o.scarf2, 1);
    [cx - 13, cx - 3, cx + 7].forEach((x) => g.fillRect(x, 37, 4, 5));
    // dangling end
    g.fillStyle(o.scarf1, 1); g.fillRect(cx + 8, 41, 5, 9);
    g.fillStyle(o.scarf2, 1); g.fillRect(cx + 8, 45, 5, 3);
  },

  skinWizard(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 56, cx = w / 2;
    this._ghostBody(g, w, h, { glow: 0xc9a24a, glow2: 0xffe27a, body: 0xf0e2c4 });
    this._wizardFace(g, cx, { eye: 0x2a2a2a, scar: 0x8a1a1a, scarf1: 0x9a1a1a, scarf2: 0xffd54a });
    g.generateTexture('skinWizard', w, h);
    g.destroy();
  },

  // Blue-gnome body wearing the wizard's glasses, scar and scarf (worn with the white cap).
  skinWizardGnome(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 56, cx = w / 2;
    this._ghostBody(g, w, h, { glow: 0x2f7fd9, glow2: 0x8fd0ff, body: 0x3fa0ff });
    this._wizardFace(g, cx, { eye: 0x14314a, scar: 0x0e2a44, scarf1: 0x9a1a1a, scarf2: 0xffd54a });
    g.generateTexture('skinWizardGnome', w, h);
    g.destroy();
  },

  // Floppy white cap (worn by the Blue Gnome / Wizard Gnome skins).
  hatGnome(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 40, h = 36, cx = w / 2;
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(cx, 28, 30, 9);          // brim
    g.fillTriangle(cx - 11, 28, cx + 9, 28, cx + 6, 6); // floppy cone
    g.fillCircle(cx + 6, 6, 4);            // rounded tip
    g.fillStyle(0xd8e4f0, 0.55);
    g.fillTriangle(cx - 1, 28, cx + 9, 28, cx + 6, 6);  // soft shade
    g.generateTexture('hatGnome', w, h);
    g.destroy();
  },

  // Golden halo (Angel skin).
  hatHalo(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 46, h = 22, cx = w / 2, cy = h / 2;
    g.fillStyle(0xfff2a0, 0.22); g.fillEllipse(cx, cy, 40, 16);
    g.lineStyle(5, 0xffe066, 1); g.strokeEllipse(cx, cy, 34, 12);
    g.lineStyle(2, 0xfff6c0, 0.9); g.strokeEllipse(cx, cy, 34, 12);
    g.generateTexture('hatHalo', w, h);
    g.destroy();
  },

  // Two red horns (Devil skin).
  hatHorns(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 46, h = 30, cx = w / 2;
    g.fillStyle(0x8a1410, 1);
    g.fillTriangle(cx - 15, 28, cx - 5, 28, cx - 13, 4);
    g.fillTriangle(cx + 5, 28, cx + 15, 28, cx + 13, 4);
    g.fillStyle(0xff5a44, 0.7);
    g.fillTriangle(cx - 13, 26, cx - 8, 26, cx - 12, 8);
    g.fillTriangle(cx + 8, 26, cx + 13, 26, cx + 12, 8);
    g.generateTexture('hatHorns', w, h);
    g.destroy();
  },

  // White face patch with dark eyes; tinted in-game to the character's colour.
  ownerFace(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 34, h = 28, cx = w / 2, cy = h / 2;
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(cx, cy, 30, 24);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(cx - 7, cy, 3.4);
    g.fillCircle(cx + 7, cy, 3.4);
    g.generateTexture('ownerFace', w, h);
    g.destroy();
  },

  // Gold top hat with a green band and a green $ (owner skin accessory).
  hatMoney(scene) {
    const w = 46, h = 46;
    const canvas = scene.textures.createCanvas('hatMoney', w, h);
    const ctx = canvas.getContext();
    const cx = w / 2, by = h - 8;
    const cylW = w * 0.6, cylH = h * 0.62;
    ctx.fillStyle = '#c9962a';
    ctx.beginPath(); ctx.ellipse(cx, by, w * 0.46, 6, 0, 0, 7); ctx.fill();
    const grad = ctx.createLinearGradient(cx - cylW / 2, 0, cx + cylW / 2, 0);
    grad.addColorStop(0, '#b8860b'); grad.addColorStop(0.5, '#ffe27a'); grad.addColorStop(1, '#c9962a');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - cylW / 2, by - cylH, cylW, cylH);
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath(); ctx.ellipse(cx, by - cylH, cylW / 2, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#0e5a2a';
    ctx.fillRect(cx - cylW / 2, by - 11, cylW, 8);
    ctx.fillStyle = '#2fd06a';
    ctx.font = 'bold ' + Math.round(cylH * 0.5) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, by - cylH * 0.62);
    canvas.refresh();
  },

  hatCrown(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 40, h = 26;
    g.fillStyle(0xffd54a, 1);
    g.fillRect(6, 16, w - 12, 8);                 // band
    // points
    g.fillTriangle(6, 16, 13, 2, 20, 16);
    g.fillTriangle(14, 16, 20, 6, 26, 16);
    g.fillTriangle(20, 16, 27, 2, 34, 16);
    // jewels
    g.fillStyle(0xff5b6e, 1);
    g.fillCircle(13, 4, 2); g.fillCircle(27, 4, 2);
    g.fillStyle(0x6fb8ff, 1); g.fillCircle(20, 8, 2);
    g.fillStyle(0xc99a2e, 1); g.fillRect(6, 22, w - 12, 2);
    g.generateTexture('hatCrown', w, h);
    g.destroy();
  },

  hatWitch(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 44, h = 40;
    const cx = w / 2;
    // brim
    g.fillStyle(0x3a2050, 1);
    g.fillEllipse(cx, 34, 40, 10);
    // cone
    g.fillStyle(0x5a2f7a, 1);
    g.fillTriangle(cx, 2, cx - 13, 34, cx + 13, 34);
    // bent tip
    g.fillStyle(0x5a2f7a, 1);
    g.fillTriangle(cx - 2, 2, cx + 6, 8, cx + 1, 12);
    // band + buckle
    g.fillStyle(0x2a1440, 1);
    g.fillTriangle(cx - 9, 26, cx + 9, 26, cx, 26); // (thin band base)
    g.fillRect(cx - 9, 24, 18, 5);
    g.fillStyle(0xffd54a, 1);
    g.fillRect(cx - 3, 24, 6, 5);
    g.generateTexture('hatWitch', w, h);
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
