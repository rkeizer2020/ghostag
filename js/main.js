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
  scene: [BootScene, MenuScene, SettingsScene, CharactersScene, SkinsScene, LeaderboardScene, MapRollScene, GameScene, GameOverScene],
};

// Secret owner unlock: visiting with ?owner=ghostagking grants (and equips)
// the exclusive Rich skin on this device.
try {
  const params = new URLSearchParams(window.location.search);
  if (params.get('owner') === 'ghostagking') {
    localStorage.setItem('tagz.owner', '1');
    localStorage.setItem('tagz.founder', '1'); // owner link also grants founder cosmetics
    localStorage.setItem('tagz.skin', 'owner');
  }
} catch (e) { /* ignore */ }

// one-time reset of all high scores when RESET_ID changes
Storage.applyResetIfNeeded();

window.game = new Phaser.Game(config);

// Account/cloud sync: when auth state or synced data changes, refresh the
// menu (if it's showing) so badges and the account button update.
Auth.init(() => {
  const g = window.game;
  if (!g) return;
  const menu = g.scene.getScene('Menu');
  if (menu && menu.scene.isActive()) menu.scene.restart();
});
