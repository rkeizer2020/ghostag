const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// World: exactly one background image, with solid edges. The camera shows only a small window of it,
// so the player always stays close-up (zoomed in).
const TILE_W = 1270, TILE_H = 709;
const WORLD_W = TILE_W, WORLD_H = TILE_H; // exactly the size of the background image
const VIEW_W = 700;
const VIEW_H = VIEW_W * H / W;
const ZOOM = W / VIEW_W;
const PLAYER_H = 72; // character is smaller than before (was 120)
const GROUND_H = 42;
const GROUND_Y = WORLD_H - GROUND_H;
const GRAVITY_UP = 1900;
const GRAVITY_DOWN = 1000; // floatier fall
// Jump apex ~200px: the biggest step in the layout is ~165px.
const JUMP_SPEED = Math.sqrt(2 * GRAVITY_UP * 200);
const MOVE_SPEED = 250; // fast, px/s


// Platform layout from the schema (schema is 1281x718, the map is 1270x709).
// x, y, w, h = the platform's outline box. Side platforms run past the map edge.
const SX = WORLD_W / 1281, SY = WORLD_H / 718;
const SURFACE = 0.06; // the walkable top edge sits just inside the outline
const platforms = [
  [295, 185, 753, 100],   // top, centre
  [195, 365, 923, 123],   // middle, centre
  [238, 582, 790, 100],   // bottom, centre
  [-60, 287, 178, 71],    // left, upper
  [-60, 528, 218, 58],    // left, lower
  [1170, 283, 171, 77],   // right, upper
  [1100, 515, 241, 72],   // right, lower
].map(([x, y, w, h]) => ({ x: x * SX, y: y * SY, w: w * SX, h: h * SY, top: (y + h * SURFACE) * SY }));

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
  player.vy += (player.vy < 0 ? GRAVITY_UP : GRAVITY_DOWN) * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.onGround = false;

  player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));

  // One-way platforms: jump up through them from below, land on top.
  if (player.vy >= 0) {
    for (const p of platforms) {
      const bottom = player.y + player.h;
      if (player.x + player.w > p.x && player.x < p.x + p.w && prevBottom <= p.top && bottom >= p.top) {
        player.y = p.top - player.h;
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
}

(async function main() {
  const [bg, sprite, platSprite] = await Promise.all([load('assets/background.png'), load('assets/player.png'), load('assets/platform.png')]);
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
    ctx.drawImage(bg, 0, 0, TILE_W, TILE_H);
    drawGround();
    for (const p of platforms) ctx.drawImage(platSprite, p.x, p.y, p.w, p.h);
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
