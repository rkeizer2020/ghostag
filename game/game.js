const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// World: 3 background tiles wide. The camera shows only a small window of it,
// so the player always stays close-up (zoomed in).
const TILE_W = 1270, TILE_H = 709;
const WORLD_W = TILE_W * 3, WORLD_H = TILE_H;
const VIEW_W = 700;
const VIEW_H = VIEW_W * H / W;
const ZOOM = W / VIEW_W;
const PLAYER_H = 72; // character is smaller than before (was 120)
const GROUND_H = 42;
const GROUND_Y = WORLD_H - GROUND_H;
const GRAVITY = 1900;
// Jump apex ~90px: just enough to reach the next platform (84px higher).
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * 90);
const MOVE_SPEED = 250; // fast, px/s

// Platforms: 84px apart, so the 72px character fits underneath with room for its head.
// They are one-way: jump up through them from below, land on top.
const STEP = 84, PLAT_H = 8, PLAT_W = 300;
const platforms = [];
// A staircase of 3 levels, built up to the right (dir 1) or left (dir -1).
function staircase(x, dir) {
  for (let level = 1; level <= 3; level++) {
    const px = x + dir * (level - 1) * 180 - (dir < 0 ? PLAT_W : 0);
    platforms.push({ x: px, y: GROUND_Y - level * STEP, w: PLAT_W, h: PLAT_H });
  }
}
staircase(300, 1);
staircase(2000, -1);
staircase(3000, 1);

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

  const prevBottom = player.y + player.h;
  player.vy += GRAVITY * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.onGround = false;

  player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));

  if (player.vy >= 0) {
    for (const p of platforms) {
      const bottom = player.y + player.h;
      if (player.x + player.w > p.x && player.x < p.x + p.w && prevBottom <= p.y && bottom >= p.y) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }
  }

  if (player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.onGround = true;
  }
}

function drawGround() {
  ctx.fillStyle = '#0d0603';
  ctx.fillRect(0, GROUND_Y, WORLD_W, GROUND_H);
  ctx.fillStyle = '#e2820a';
  ctx.fillRect(0, GROUND_Y, WORLD_W, 3);
  for (const p of platforms) {
    ctx.fillStyle = '#0d0603';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#e2820a';
    ctx.fillRect(p.x, p.y, p.w, 3);
  }
}

(async function main() {
  const [bg, sprite] = await Promise.all([load('assets/background.png'), load('assets/player.png')]);
  player.h = PLAYER_H;
  player.w = Math.round(sprite.width * PLAYER_H / sprite.height);
  player.y = GROUND_Y - player.h;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);

    const camX = Math.max(0, Math.min(WORLD_W - VIEW_W, player.x + player.w / 2 - VIEW_W / 2));
    const camY = Math.max(0, Math.min(WORLD_H - VIEW_H, player.y + player.h / 2 - VIEW_H / 2));

    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-camX, -camY);
    for (let t = 0; t < WORLD_W / TILE_W; t++) ctx.drawImage(bg, t * TILE_W, 0, TILE_W, TILE_H);
    drawGround();
    if (player.facing < 0) {
      ctx.save();
      ctx.translate(player.x + player.w, player.y);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0, player.w, player.h);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, player.x, player.y, player.w, player.h);
    }
    ctx.restore();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
