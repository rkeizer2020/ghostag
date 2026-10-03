const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// World
const GROUND_H = 70;
const GROUND_Y = H - GROUND_H;
const GRAVITY = 1800;
// Jump apex ~100px: just enough to reach the next platform.
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * 100);
const MOVE_SPEED = 260; // mid speed, px/s

const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });

const keys = {};
addEventListener('keydown', e => {
  if (e.key.startsWith('Arrow')) e.preventDefault();
  keys[e.key] = true;
});
addEventListener('keyup', e => { keys[e.key] = false; });

const player = { x: 100, y: 0, w: 0, h: 0, vx: 0, vy: 0, onGround: false, facing: 1 };

function update(dt) {
  const dir = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  player.vx = dir * MOVE_SPEED;
  if (dir) player.facing = dir;

  if (keys.ArrowUp && player.onGround) {
    player.vy = -JUMP_SPEED;
    player.onGround = false;
  }

  player.vy += GRAVITY * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = Math.max(0, Math.min(W - player.w, player.x));

  if (player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.onGround = true;
  }
}

function drawGround() {
  ctx.fillStyle = '#0d0603';
  ctx.fillRect(0, GROUND_Y, W, GROUND_H);
}

(async function main() {
  const [bg, sprite] = await Promise.all([load('assets/background.png'), load('assets/player.png')]);
  player.w = sprite.width;
  player.h = sprite.height;
  player.y = GROUND_Y - player.h;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);

    ctx.drawImage(bg, 0, 0, W, H);
    drawGround();
    ctx.save();
    if (player.facing < 0) {
      ctx.translate(player.x + player.w, player.y);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0);
    } else {
      ctx.drawImage(sprite, player.x, player.y);
    }
    ctx.restore();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
