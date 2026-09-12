// Boots Phaser. Scale.RESIZE makes the canvas fill the whole window (no
// letterbox / black bars); every scene lays out from this.scale.width/height.
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: GAME.COLORS.bg,
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, MenuScene, SettingsScene, CharactersScene, GameScene, GameOverScene],
};

window.game = new Phaser.Game(config);
