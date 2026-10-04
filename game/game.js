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
// Hand-drawn ground slab along the bottom, walls on both sides and a ceiling.
const GROUND_H = 64;                     // height of the ground drawing
const GROUND_TOP = WORLD_H - GROUND_H;
const GROUND_Y = GROUND_TOP + GROUND_H * 0.45; // feet stand in the ground slab, like on the platforms
const CEILING_H = 62;                    // height of the ceiling drawing
const WALL_W = 72;
const GUN_H = 26;        // guns are drawn at this height, one on each side of the character
const GUN_GRIP = 10;     // how far each gun overlaps the body                       // width of each wall drawing
const GRAVITY_UP = 1900;
const GRAVITY_DOWN = 1000; // floatier fall
// Jump apex ~155px.
const JUMP_SPEED = Math.sqrt(2 * GRAVITY_UP * 155);
const MOVE_SPEED = 250; // fast, px/s


// Platform layout from the schema (schema is 1281x718, the map is 1270x709).
// x, y, w, h = the platform's outline box. Side platforms run past the map edge.
const SX = WORLD_W / 1281, SY = WORLD_H / 718;
const CEIL = 0.75;    // underside of the top face: you bump your head here and can't jump up through
const SURFACE = 0.58; // feet stand in the platform's top face, near its front edge (as in the drawing)
const platforms = [
  [295, 185, 753, 100],   // top, centre
  [195, 390, 923, 123],   // middle, centre
  [-60, 287, 178, 71],    // left, upper
  [-60, 528, 218, 58],    // left, lower
  [1170, 283, 171, 77],   // right, upper
  [1100, 515, 241, 72],   // right, lower
].map(([x, y, w, h]) => ({ x: x * SX, y: y * SY, w: w * SX, h: h * SY, top: (y + h * SURFACE) * SY, ceil: (y + h * CEIL) * SY }));

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
  const prevHead = player.y;
  player.vy += (player.vy < 0 ? GRAVITY_UP : GRAVITY_DOWN) * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.onGround = false;

  player.x = Math.max(WALL_W, Math.min(WORLD_W - WALL_W - player.w, player.x));

  // The ceiling stops your head.
  if (player.y < CEILING_H - 6) {
    player.y = CEILING_H - 6;
    if (player.vy < 0) player.vy = 0;
  }

  // Platforms are solid from below: bump your head, can't jump up through them.
  if (player.vy < 0) {
    for (const p of platforms) {
      if (player.x + player.w > p.x && player.x < p.x + p.w && prevHead >= p.ceil && player.y < p.ceil) {
        player.y = p.ceil;
        player.vy = 0;
      }
    }
  }

  // Land on top of a platform when falling onto it.
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

(async function main() {
  const [bg, sprite, platSprite, groundSprite, wallL, wallR, ceilSprite, gunL, gunR] = await Promise.all(
    ['background', 'player', 'platform', 'ground', 'wall-left', 'wall-right', 'ceiling', 'gun-left', 'gun-right'].map(n => load(`assets/${n}.png`)));
  player.h = PLAYER_H;
  player.w = Math.round(sprite.width * PLAYER_H / sprite.height);
  const gunLW = Math.round(gunL.width * GUN_H / gunL.height);
  const gunRW = Math.round(gunR.width * GUN_H / gunR.height);
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
    for (const p of platforms) ctx.drawImage(platSprite, p.x, p.y, p.w, p.h);
    // Walls and ground: a white fill plus drawings that run past the map edges,
    // so the edges are completely covered with no background showing through.
    const OVER = 40;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, GROUND_TOP + 6, WORLD_W, WORLD_H - GROUND_TOP);
    ctx.fillRect(0, 0, WORLD_W, CEILING_H - 6);
    ctx.drawImage(groundSprite, -OVER, GROUND_TOP, WORLD_W + 2 * OVER, GROUND_H + OVER);
    ctx.drawImage(ceilSprite, -OVER, -OVER, WORLD_W + 2 * OVER, CEILING_H + OVER);
    ctx.drawImage(sprite, player.x, player.y, player.w, player.h);
    // Left gun on the left side, right gun on the right side of the character.
    const gunY = player.y + player.h * 0.55 - GUN_H / 2;
    ctx.drawImage(gunL, player.x + GUN_GRIP - gunLW, gunY, gunLW, GUN_H);
    ctx.drawImage(gunR, player.x + player.w - GUN_GRIP, gunY, gunRW, GUN_H);

    // Walls go on top, so a gun at the edge tucks behind the wall.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, WALL_W - 4, WORLD_H);
    ctx.fillRect(WORLD_W - WALL_W + 4, 0, WALL_W - 4, WORLD_H);
    ctx.drawImage(wallL, -OVER, -OVER, WALL_W + OVER, WORLD_H + 2 * OVER);
    ctx.drawImage(wallR, WORLD_W - WALL_W, -OVER, WALL_W + OVER, WORLD_H + 2 * OVER);
    ctx.restore();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
