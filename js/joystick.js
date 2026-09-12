// A lightweight virtual joystick built from Phaser shapes. It appears
// wherever the player first touches the left/bottom area and reports a
// normalised direction vector. Only enabled on touch devices.
class VirtualJoystick {
  constructor(scene) {
    this.scene = scene;
    this.pointerId = null;
    this.baseX = 0;
    this.baseY = 0;
    this.vec = new Phaser.Math.Vector2(0, 0);
    this.radius = 60;

    this.base = scene.add.circle(0, 0, this.radius, 0xffffff, 0.10)
      .setStrokeStyle(3, 0xffffff, 0.25)
      .setScrollFactor(0).setDepth(1000).setVisible(false);
    this.thumb = scene.add.circle(0, 0, 26, 0xbfe6ff, 0.55)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setScrollFactor(0).setDepth(1001).setVisible(false);

    scene.input.on('pointerdown', this._down, this);
    scene.input.on('pointermove', this._move, this);
    scene.input.on('pointerup', this._up, this);
    scene.input.on('pointerupoutside', this._up, this);
  }

  _isGameArea(pointer) {
    // Ignore taps on the top-right HUD (mute button) region.
    return !(pointer.x > this.scene.scale.width - 90 && pointer.y < 90);
  }

  _down(pointer) {
    if (this.pointerId !== null) return;
    if (!this._isGameArea(pointer)) return;
    this.pointerId = pointer.id;
    this.baseX = pointer.x;
    this.baseY = pointer.y;
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  _move(pointer) {
    if (pointer.id !== this.pointerId) return;
    let dx = pointer.x - this.baseX;
    let dy = pointer.y - this.baseY;
    const len = Math.hypot(dx, dy);
    if (len > this.radius) {
      dx = (dx / len) * this.radius;
      dy = (dy / len) * this.radius;
    }
    this.thumb.setPosition(this.baseX + dx, this.baseY + dy);
    this.vec.set(dx / this.radius, dy / this.radius);
  }

  _up(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.vec.set(0, 0);
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }

  get direction() {
    return this.vec;
  }

  destroy() {
    this.scene.input.off('pointerdown', this._down, this);
    this.scene.input.off('pointermove', this._move, this);
    this.scene.input.off('pointerup', this._up, this);
    this.scene.input.off('pointerupoutside', this._up, this);
    this.base.destroy();
    this.thumb.destroy();
  }
}
