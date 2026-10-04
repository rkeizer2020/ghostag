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

// --- Bullets and sound ---------------------------------------------------
// Key 1 fires the left gun, key 2 the right gun: one bullet per press (holding does nothing).
// Each shot is a random one of the 3 paint colours drawn for that direction.
const BULLET_W = 34, BULLET_SPEED = 450;
const bullets = [];
const bulletSprites = { left: [], right: [] };
const gun = { lw: 0, rw: 0 };

const SPLAT_URL = 'assets/splat.mp3'; // the splash sound played when a bullet hits something
let audioCtx = null;
let splatBuffer = null;
let splatLoading = false;
async function loadSplat() {
  if (!audioCtx || splatBuffer || splatLoading) return;
  splatLoading = true;
  try {
    let data;
    if (SPLAT_URL.startsWith('data:')) {
      const bin = atob(SPLAT_URL.split(',')[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      data = bytes.buffer;
    } else {
      data = await (await fetch(SPLAT_URL)).arrayBuffer();
    }
    splatBuffer = await audioCtx.decodeAudioData(data);
  } catch (e) { /* fall back to the built-in splash below */ }
  splatLoading = false;
}
function initAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    loadSplat();
  } catch (e) { /* no sound */ }
}
addEventListener('keydown', initAudio);
addEventListener('pointerdown', initAudio);

// Splash sound: the splat recording, or (until it has loaded) a synthesised wet splash.
let lastSplash = 0;
function splashSound() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const t = audioCtx.currentTime;
  if (t - lastSplash < 0.04) return;
  lastSplash = t;
  if (splatBuffer) {
    const src = audioCtx.createBufferSource();
    src.buffer = splatBuffer;
    const vol = audioCtx.createGain();
    vol.gain.value = 0.8;
    src.connect(vol).connect(audioCtx.destination);
    src.start(t);
    return;
  }
  const len = Math.floor(audioCtx.sampleRate * 0.22);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(2200, t);
  filter.frequency.exponentialRampToValueAtTime(500, t + 0.2);
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(0.5, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  noise.connect(filter).connect(ng).connect(audioCtx.destination);
  noise.start(t);

  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);
  const og = audioCtx.createGain();
  og.gain.setValueAtTime(0.35, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.connect(og).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

// --- Enemies: the yellow guard ----------------------------------------------
// Patrols left and right on the main ground or a big platform. He can't jump and
// never walks off: he turns around at the edge. (8 hits take him out.)
const GUARD_H = 80, GUARD_SPEED = MOVE_SPEED, GUARD_HP = 8; // as fast as the player
const guards = [];
const guardSprites = { left: null, right: null };

function spawnGuard(x, surfaceY, minX, maxX, dir) {
  const img = guardSprites.right;
  const h = GUARD_H, w = Math.round(img.width * h / img.height);
  guards.push({ x, y: surfaceY - h, w, h, dir, minX, maxX, hp: GUARD_HP, flash: 0 });
}

// --- Spawning: every enemy type keeps spawning new enemies, for ever, at a
// random spot on the main ground, the lowest big platform or the highest platform.
const SPAWN_EVERY = 4; // default for new enemies
const enemyTypes = [
  { name: 'guard', every: 7.5, timer: 0, spawn: spawnGuard },
  // new enemies are added here and spawn the same way
];

function spawnSurfaces() {
  const mid = platforms[1], top = platforms[0];
  return [
    { y: GROUND_Y, minX: WALL_W, maxX: WORLD_W - WALL_W },       // main ground
    { y: mid.top, minX: mid.x, maxX: mid.x + mid.w },            // lowest big platform
    { y: top.top, minX: top.x, maxX: top.x + top.w },            // highest platform
  ];
}

function updateSpawner(dt) {
  for (const type of enemyTypes) {
    type.timer -= dt;
    if (type.timer > 0) continue;
    type.timer += type.every || SPAWN_EVERY;
    const surface = spawnSurfaces()[Math.floor(Math.random() * 3)];
    const x = surface.minX + Math.random() * (surface.maxX - surface.minX - 80);
    type.spawn(x, surface.y, surface.minX, surface.maxX, Math.random() < 0.5 ? -1 : 1);
  }
}

function updateGuards(dt) {
  for (const g of guards) {
    g.x += g.dir * GUARD_SPEED * dt;
    if (g.x < g.minX) { g.x = g.minX; g.dir = 1; }
    if (g.x + g.w > g.maxX) { g.x = g.maxX - g.w; g.dir = -1; }
    g.flash = Math.max(0, g.flash - dt);
  }
}

// The part of a guard that bullets can hit (a bit smaller than his drawing).
function guardHitbox(g) {
  return { x: g.x + g.w * 0.12, y: g.y + g.h * 0.05, w: g.w * 0.76, h: g.h * 0.9 };
}

// --- Hearts ---------------------------------------------------------------------
// You start with 5. A guard touching you costs one; then you blink for a moment
// and can't be hurt again straight away.
const MAX_HEARTS = 5, INVULN_TIME = 1.5;
let hearts = MAX_HEARTS;
let invuln = 0;
let dying = 0;          // short pause after the last heart before the game over screen
let gameOver = false;

function restart() {
  hearts = MAX_HEARTS;
  invuln = 0;
  dying = 0;
  gameOver = false;
  guards.length = 0;
  bullets.length = 0;
  for (const type of enemyTypes) type.timer = 0;
  Object.assign(player, { x: 100, y: GROUND_Y - player.h, vx: 0, vy: 0, onGround: false });
  for (const k in keys) keys[k] = false;
}

function updateHealth(dt) {
  invuln = Math.max(0, invuln - dt);
  if (dying > 0 && (dying -= dt) <= 0) gameOver = true;
  if (invuln > 0 || hearts <= 0) return;
  const px = player.x + player.w * 0.15, py = player.y + player.h * 0.05;
  const pw = player.w * 0.7, ph = player.h * 0.9;
  for (const g of guards) {
    const hb = guardHitbox(g);
    if (px + pw > hb.x && px < hb.x + hb.w && py + ph > hb.y && py < hb.y + hb.h) {
      hearts--;
      invuln = INVULN_TIME;
      if (hearts === 0) dying = 0.8;
      break;
    }
  }
}

const keys = {};
addEventListener('keydown', e => {
  if (e.key.startsWith('Arrow')) e.preventDefault();
  if (gameOver) {
    if (e.key === 'Enter' || e.key === ' ') restart();
    return;
  }
  if (!e.repeat) {
    if (e.key === '1') fire('left');
    if (e.key === '2') fire('right');
  }
  keys[e.key] = true;
});
addEventListener('keyup', e => { keys[e.key] = false; });

const player = { x: 100, y: 0, w: 0, h: 0, vx: 0, vy: 0, onGround: false, facing: 1 };

function gunTop() {
  return player.y + player.h * 0.55 - GUN_H / 2;
}

function fire(side) {
  const sprites = bulletSprites[side];
  if (!sprites.length) return;
  const img = sprites[Math.floor(Math.random() * sprites.length)];
  const left = side === 'left';
  bullets.push({
    img,
    w: BULLET_W,
    h: BULLET_W * img.height / img.width,
    // start at the gun's muzzle
    x: left ? player.x + GUN_GRIP - gun.lw : player.x + player.w - GUN_GRIP + gun.rw,
    y: gunTop() + GUN_H * 0.4,
    vx: left ? -BULLET_SPEED : BULLET_SPEED,
  });
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    let hit = false;
    for (let j = guards.length - 1; j >= 0; j--) {
      const g = guards[j], hb = guardHitbox(g);
      if (b.x + b.w / 2 > hb.x && b.x - b.w / 2 < hb.x + hb.w && b.y + b.h / 2 > hb.y && b.y - b.h / 2 < hb.y + hb.h) {
        hit = true;
        g.flash = 0.15;
        if (--g.hp <= 0) guards.splice(j, 1);
        break;
      }
    }
    hit = hit ||
      b.x - b.w / 2 < WALL_W || b.x + b.w / 2 > WORLD_W - WALL_W ||
      b.y - b.h / 2 < CEILING_H - 6 || b.y + b.h / 2 > GROUND_Y ||
      // a platform's body: from the surface you stand on down to its underside
      platforms.some(p => b.x + b.w / 2 > p.x && b.x - b.w / 2 < p.x + p.w && b.y + b.h / 2 > p.top && b.y - b.h / 2 < p.ceil);
    if (hit) {
      bullets.splice(i, 1);
      splashSound();
    }
  }
}

function update(dt) {
  updateBullets(dt);
  updateSpawner(dt);
  updateGuards(dt);
  updateHealth(dt);

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

canvas.addEventListener('pointerdown', () => { if (gameOver) restart(); });

(async function main() {
  const [bg, sprite, platSprite, groundSprite, wallL, wallR, ceilSprite, gunL, gunR, guardL, guardR, heartImg, gameOverImg] = await Promise.all(
    ['background', 'player', 'platform', 'ground', 'wall-left', 'wall-right', 'ceiling', 'gun-left', 'gun-right', 'guard-left', 'guard-right', 'heart', 'game-over'].map(n => load(`assets/${n}.png`)));
  const bulletNames = { left: ['bullet-l-1', 'bullet-l-2', 'bullet-l-3'], right: ['bullet-r-1', 'bullet-r-2', 'bullet-r-3'] };
  for (const side of ['left', 'right']) bulletSprites[side] = await Promise.all(bulletNames[side].map(n => load(`assets/${n}.png`)));
  player.h = PLAYER_H;
  player.w = Math.round(sprite.width * PLAYER_H / sprite.height);
  const gunLW = gun.lw = Math.round(gunL.width * GUN_H / gunL.height);
  const gunRW = gun.rw = Math.round(gunR.width * GUN_H / gunR.height);
  player.y = GROUND_Y - player.h;

  guardSprites.left = guardL;
  guardSprites.right = guardR;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (!gameOver) update(dt);

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
    for (const g of guards) {
      // a hit makes him blink
      if (g.flash > 0 && Math.floor(g.flash * 40) % 2 === 0) continue;
      ctx.drawImage(g.dir > 0 ? guardR : guardL, g.x, g.y, g.w, g.h);
    }
    const blink = invuln > 0 && Math.floor(invuln * 10) % 2 === 0;
    if (!blink) ctx.drawImage(sprite, player.x, player.y, player.w, player.h);
    // Left gun on the left side, right gun on the right side of the character.
    const gunY = gunTop();
    if (!blink) {
      ctx.drawImage(gunL, player.x + GUN_GRIP - gunLW, gunY, gunLW, GUN_H);
      ctx.drawImage(gunR, player.x + player.w - GUN_GRIP, gunY, gunRW, GUN_H);
    }
    for (const b of bullets) ctx.drawImage(b.img, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);

    // Walls go on top, so a gun at the edge tucks behind the wall.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, WALL_W - 4, WORLD_H);
    ctx.fillRect(WORLD_W - WALL_W + 4, 0, WALL_W - 4, WORLD_H);
    ctx.drawImage(wallL, -OVER, -OVER, WALL_W + OVER, WORLD_H + 2 * OVER);
    ctx.drawImage(wallR, WORLD_W - WALL_W, -OVER, WALL_W + OVER, WORLD_H + 2 * OVER);
    ctx.restore();

    // Hearts: small, top-left corner (screen space). Lost hearts stay as faint ghosts.
    const hh = 38, hw = Math.round(heartImg.width * hh / heartImg.height);
    for (let i = 0; i < MAX_HEARTS; i++) {
      ctx.globalAlpha = i < hearts ? 1 : 0.18;
      ctx.drawImage(heartImg, 20 + i * (hw + 8), 18, hw, hh);
    }
    ctx.globalAlpha = 1;

    if (gameOver) {
      ctx.drawImage(gameOverImg, 0, 0, W, H);
      ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#fff';
      ctx.strokeText('Press Enter or click to play again', W / 2, H - 22);
      ctx.fillText('Press Enter or click to play again', W / 2, H - 22);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
