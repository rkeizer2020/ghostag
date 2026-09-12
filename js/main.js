// Boots Phaser. Scale.FIT keeps the 900x600 design ratio and letterboxes on
// any screen; the game auto-centres and resizes with the window.
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  backgroundColor: GAME.COLORS.bg,
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
};

window.game = new Phaser.Game(config);
