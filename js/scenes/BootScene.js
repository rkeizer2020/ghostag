// Generates all textures then hands off to the menu. No external assets to
// preload, so this is quick.
class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    SFX.init();
    Textures.makeAll(this);
    this.scene.start('Menu');
  }
}
