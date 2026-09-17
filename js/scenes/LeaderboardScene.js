// Global leaderboard: top players per difficulty, read from the cloud
// `leaderboard` view. Works on the website when the leaderboard SQL is set up;
// offline / in the artifact preview it shows a friendly message.
class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  create() {
    const W = this.scale.width, H = this.scale.height, cx = W / 2;
    UI.backdrop(this);

    this.add.text(cx, H * 0.1, '🏆 Leaderboard', {
      fontFamily: 'system-ui, sans-serif', fontSize: Math.min(40, Math.round(W * 0.085)) + 'px',
      fontStyle: 'bold', color: '#ffd54a',
    }).setOrigin(0.5).setDepth(3).setShadow(0, 0, '#a9791a', 16, true, true);

    // difficulty tabs
    this.diff = Settings.getDifficulty();
    this.tabs = {};
    const bw = Math.min(150, (W - 60) / 3), gap = 12;
    const totalW = Settings.ORDER.length * bw + (Settings.ORDER.length - 1) * gap;
    let bx = cx - totalW / 2 + bw / 2;
    Settings.ORDER.forEach((d) => {
      const b = UI.button(this, bx, H * 0.2, Settings.DIFFICULTIES[d].label, () => this.setTab(d), {
        width: bw, height: 46, fontSize: 18,
      });
      this.tabs[d] = b;
      bx += bw + gap;
    });

    this.listText = this.add.text(cx, H * 0.30, 'Loading…', {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#eaf6ff',
      align: 'left', lineSpacing: 8,
    }).setOrigin(0.5, 0).setDepth(3).setShadow(0, 2, '#000', 4);

    this.setTab(this.diff, false);
    this.loadBoards();

    UI.button(this, cx, H * 0.92, '←  Back', () => this.scene.start('Menu'), { width: 200, height: 50, fontSize: 20 });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
    UI.restartOnResize(this);
  }

  setTab(d, render = true) {
    this.diff = d;
    Settings.ORDER.forEach((k) => this.tabs[k].setActiveState(k === d));
    if (render) this.render();
  }

  async loadBoards() {
    const r = await Auth.fetchLeaderboard(15);
    if (!this.scene.isActive()) return;
    this.boards = r.ok ? r.boards : null;
    this.error = r.ok ? null : (r.msg || 'Could not load the leaderboard.');
    this.render();
  }

  render() {
    if (!this.listText) return;
    if (this.error) {
      this.listText.setColor('#ff9a9a').setAlign('center').setText(this.error);
      return;
    }
    if (!this.boards) { this.listText.setColor('#9fb0c0').setAlign('center').setText('Loading…'); return; }
    const rows = this.boards[this.diff] || [];
    if (!rows.length) {
      this.listText.setColor('#9fb0c0').setAlign('center').setText('No scores on ' + Settings.DIFFICULTIES[this.diff].label + ' yet.\nBe the first!');
      return;
    }
    const medal = ['🥇', '🥈', '🥉'];
    const lines = rows.map((r, i) => {
      const rank = medal[i] || ((i + 1) + '.');
      const name = String(r.username || 'player').slice(0, 16);
      return rank + '  ' + name + '  —  ' + r.score;
    });
    this.listText.setColor('#eaf6ff').setAlign('left').setText(lines.join('\n'));
  }
}
