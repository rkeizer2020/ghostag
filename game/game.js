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
const POP_URL = 'assets/pop.mp3';     // played when the pointer goes over a button and when you click one
let audioCtx = null;
let splatBuffer = null;
let popBuffer = null;
let soundsLoading = false;

async function decodeSound(url) {
  let data;
  if (url.startsWith('data:')) {
    const bin = atob(url.split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    data = bytes.buffer;
  } else {
    data = await (await fetch(url)).arrayBuffer();
  }
  return audioCtx.decodeAudioData(data);
}

async function loadSounds() {
  if (!audioCtx || soundsLoading) return;
  soundsLoading = true;
  try { splatBuffer = splatBuffer || await decodeSound(SPLAT_URL); } catch (e) { /* falls back to the built-in splash */ }
  try { popBuffer = popBuffer || await decodeSound(POP_URL); } catch (e) { /* no pop */ }
  soundsLoading = false;
}

function playPop() {
  if (!audioCtx || !popBuffer) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const src = audioCtx.createBufferSource();
  src.buffer = popBuffer;
  const vol = audioCtx.createGain();
  vol.gain.value = 0.6;
  src.connect(vol).connect(audioCtx.destination);
  src.start();
}
function initAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    loadSounds();
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

// --- Painting the map -----------------------------------------------------------------
// The goal: paint every surface. Defeating an enemy leaves a paint stain where he stood
// (yellow for the yellow guard on the ground and big platforms, red for the red guard
// on the small platforms), but only on a part of the surface that isn't painted yet.
// A surface is split in equal parts (a stain covers exactly one part), and it turns green
// when every part has a stain:
// the main ground needs 6, each big platform 4 and each small platform 1.
const PAINT_SURFACES = {};   // id -> { n parts, minX, maxX, y (the line you stand on), stainH }
const paintDone = {};        // id -> array of booleans, one per part
const stains = [];           // { x, y, color }
const stainSprites = { yellow: null, red: null };
let paintImgs = null;        // green drawings

function setupPaint() {
  const span = p => ({ minX: Math.max(p.x, WALL_W), maxX: Math.min(p.x + p.w, WORLD_W - WALL_W), y: p.top, stainH: p.h * 0.8 });
  PAINT_SURFACES.ground = { n: 6, minX: WALL_W, maxX: WORLD_W - WALL_W, y: GROUND_Y, stainH: 70 };
  platforms.forEach((p, i) => { PAINT_SURFACES[i] = Object.assign({ n: MINI_PLATFORMS.includes(i) ? 1 : 4 }, span(p)); });
  resetPaint();
}

function resetPaint() {
  stains.length = 0;
  for (const id in PAINT_SURFACES) paintDone[id] = new Array(PAINT_SURFACES[id].n).fill(false);
}

const isPainted = id => paintDone[id].every(Boolean);

// the paint stain (if any) that covers position x on surface `id`
function stainAt(id, x) {
  return stains.find(st => st.surface === id && x >= st.x - st.w / 2 && x <= st.x + st.w / 2) || null;
}

// An enemy was defeated while standing at x on surface `id`.
function paintStain(id, x, color) {
  const s = PAINT_SURFACES[id];
  if (!s) return;
  const part = Math.max(0, Math.min(s.n - 1, Math.floor((x - s.minX) / ((s.maxX - s.minX) / s.n))));
  if (paintDone[id][part]) return;           // this part already has paint: nothing happens
  paintDone[id][part] = true;
  // one stain is exactly one part of the surface (1/6 of the ground, 1/4 of a big platform)
  const partW = (s.maxX - s.minX) / s.n;
  stains.push({ x: s.minX + (part + 0.5) * partW, y: s.y, w: partW, h: s.stainH, color, surface: id });
}

// --- Enemies: the yellow guard ----------------------------------------------
// Patrols left and right on the main ground or a big platform. He can't jump and
// never walks off: he turns around at the edge. (8 hits take him out.)
const GUARD_H = 80, GUARD_SPEED = MOVE_SPEED, GUARD_HP = 8; // as fast as the player
// Walking onto a paint stain slows a guard down by 30% for 1 second. Every stain he walks
// onto adds another second, so crossing 3 stains gives 3 seconds of slowness.
const STAIN_SLOW = 0.7, STAIN_SLOW_TIME = 1;
const guards = [];
const guardSprites = { left: null, right: null };

function spawnGuard(x, surfaceY, minX, maxX, dir, surface) {
  const img = guardSprites.right;
  const h = GUARD_H, w = Math.round(img.width * h / img.height);
  guards.push({ x, y: surfaceY - h, w, h, dir, minX, maxX, hp: GUARD_HP, flash: 0, surface, slow: 0, inStain: stainAt(surface, x + w / 2) });
}

// --- Enemies: the red guard ------------------------------------------------------
// Stands on the small platforms and ONLY there, at most one per small platform
// (so 4 at most). He can't be hurt by touching him and doesn't hurt you by touching:
// every 1.25 s (every 2 s while he stands in a paint stain) he shoots a bullet at the spot where you are at that moment. His gun
// hangs a little way from his body and always points at you, like an outstretched arm.
const RED_HP = 3, RED_SHOOT_EVERY = 1.25, RED_SHOOT_EVERY_IN_STAIN = 2, RED_BULLET_SPEED = 320, RED_BULLET_W = 28;
const RED_GUN_LEN = 46, RED_GUN_DIST = 50;   // gun length, and its distance from his body centre
const MINI_PLATFORMS = [2, 3, 4, 5];          // indices into `platforms`: the four small ones
const redGuards = [];
const enemyBullets = [];
const redSprites = { guard: null, gun: null, bullet: null };

function redPivot(g) {
  return { x: g.x + g.w / 2, y: g.y + g.h * 0.5 };
}

function trySpawnRedGuard() {
  const free = MINI_PLATFORMS.filter(i => {
    if (redGuards.some(g => g.platform === i)) return false;            // one per small platform
    const p = platforms[i];
    return Math.abs(redSpot(p) - (player.x + player.w / 2)) >= SPAWN_GAP;  // gap from the player
  });
  if (!free.length) return false;
  const i = free[Math.floor(Math.random() * free.length)];
  const img = redSprites.guard;
  const h = GUARD_H, w = Math.round(img.width * h / img.height);
  const spot = redSpot(platforms[i]);
  redGuards.push({ platform: i, x: spot - w / 2, y: platforms[i].top - h, w, h, hp: RED_HP, flash: 0, shootTimer: RED_SHOOT_EVERY, angle: 0 });
  return true;
}

// where on a small platform he stands: in the middle of the part that is on screen
function redSpot(p) {
  const left = Math.max(p.x, WALL_W), right = Math.min(p.x + p.w, WORLD_W - WALL_W);
  return (left + right) / 2;
}

function updateRedGuards(dt) {
  const target = { x: player.x + player.w / 2, y: player.y + player.h * 0.5 };
  for (const g of redGuards) {
    g.flash = Math.max(0, g.flash - dt);
    const pv = redPivot(g);
    g.angle = Math.atan2(target.y - pv.y, target.x - pv.x);       // the gun follows you
    g.shootTimer -= dt;
    if (g.shootTimer <= 0 && hearts > 0) {
      g.shootTimer += stainAt(g.platform, g.x + g.w / 2) ? RED_SHOOT_EVERY_IN_STAIN : RED_SHOOT_EVERY;
      const reach = RED_GUN_DIST + RED_GUN_LEN / 2;               // from his body to the muzzle
      const bh = RED_BULLET_W * redSprites.bullet.height / redSprites.bullet.width;
      enemyBullets.push({
        x: pv.x + Math.cos(g.angle) * reach, y: pv.y + Math.sin(g.angle) * reach,
        vx: Math.cos(g.angle) * RED_BULLET_SPEED, vy: Math.sin(g.angle) * RED_BULLET_SPEED,
        angle: g.angle, w: RED_BULLET_W, h: bh, platform: g.platform,
      });
    }
  }
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const r = Math.min(b.w, b.h) / 2;
    const pb = playerHitbox();
    const hitsPlayer = b.x + r > pb.x && b.x - r < pb.x + pb.w && b.y + r > pb.y && b.y - r < pb.y + pb.h;
    const hitsWorld =
      b.x - r < WALL_W || b.x + r > WORLD_W - WALL_W || b.y - r < CEILING_H - 6 || b.y + r > GROUND_Y ||
      platforms.some((p, j) => j !== b.platform &&               // he can shoot out of his own platform
        b.x + r > p.x && b.x - r < p.x + p.w && b.y + r > p.top && b.y - r < p.ceil);
    if (hitsPlayer) {
      hurtPlayer();
      enemyBullets.splice(i, 1);
      splashSound();
    } else if (hitsWorld) {
      enemyBullets.splice(i, 1);
      splashSound();
    }
  }
}

// --- Spawning: every enemy type keeps spawning new enemies, for ever, at a
// random spot on the main ground, the lowest big platform or the highest platform.
const SPAWN_EVERY = 4; // default for new enemies
const SPAWN_GAP = 220; // an enemy never spawns closer than this (px) to the player
const enemyTypes = [
  { name: 'guard', every: 7.5, timer: 0, spawn: spawnGuard },
  { name: 'redGuard', every: 7.5, timer: 0, trySpawn: trySpawnRedGuard },   // small platforms only
  // new enemies are added here and spawn the same way
];

function spawnSurfaces() {
  const mid = platforms[1], top = platforms[0];
  return [
    { id: 'ground', y: GROUND_Y, minX: WALL_W, maxX: WORLD_W - WALL_W },       // main ground
    { id: 1, y: mid.top, minX: mid.x, maxX: mid.x + mid.w },            // lowest big platform
    { id: 0, y: top.top, minX: top.x, maxX: top.x + top.w },            // highest platform
  ];
}

function updateSpawner(dt) {
  for (const type of enemyTypes) {
    type.timer -= dt;
    if (type.timer > 0) continue;
    if (type.trySpawn) {                       // enemies with their own spawn rules
      type.timer += type.trySpawn() ? type.every : 1;   // nothing free right now: try again in a second
      continue;
    }
    type.timer += type.every || SPAWN_EVERY;
    // Pick a random spot, but keep a gap between the new enemy and the player.
    const surfaces = spawnSurfaces();
    let best = null;
    for (let tries = 0; tries < 30; tries++) {
      const surface = surfaces[Math.floor(Math.random() * 3)];
      const x = surface.minX + Math.random() * (surface.maxX - surface.minX - 80);
      const gap = Math.max(x - (player.x + player.w), player.x - (x + 80)); // empty space between them
      if (!best || gap > best.gap) best = { surface, x, gap };
      if (gap >= SPAWN_GAP) break;
    }
    type.spawn(best.x, best.surface.y, best.surface.minX, best.surface.maxX, Math.random() < 0.5 ? -1 : 1, best.surface.id);
  }
}

function updateGuards(dt) {
  for (const g of guards) {
    // stepping onto a stain (a different one than before) adds a second of slowness
    const st = stainAt(g.surface, g.x + g.w / 2);
    if (st && st !== g.inStain) g.slow += STAIN_SLOW_TIME;
    g.inStain = st;
    const speed = GUARD_SPEED * (g.slow > 0 ? STAIN_SLOW : 1);
    g.slow = Math.max(0, g.slow - dt);
    g.x += g.dir * speed * dt;
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
let inMenu = true;      // the game starts on the DRAWSHOT menu
let hoverBtn = null;    // which button the pointer is over: 'play' or 'menu'
// Button rectangles (set once the drawings have loaded): PLAY on the menu screen
// and PLAY AGAIN + MENU on the game over screen.
const menuBtn = { x: 0, y: 0, w: 0, h: 0 };
const playBtn = { x: 0, y: 0, w: 0, h: 0 };      // on the menu screen
const againBtn = { x: 0, y: 0, w: 0, h: 0 };     // PLAY AGAIN on the game over screen

function toMenu() {
  restart();
  inMenu = true;
}

function restart() {
  hearts = MAX_HEARTS;
  invuln = 0;
  dying = 0;
  gameOver = false;
  guards.length = 0;
  redGuards.length = 0;
  bullets.length = 0;
  enemyBullets.length = 0;
  resetPaint();
  for (const type of enemyTypes) type.timer = 0;
  Object.assign(player, { x: 100, y: GROUND_Y - player.h, vx: 0, vy: 0, onGround: false, walkTime: 0 });
  for (const k in keys) keys[k] = false;
}

// Take one heart (unless you're blinking or already out). Returns true if it hurt.
function hurtPlayer() {
  if (invuln > 0 || hearts <= 0) return false;
  hearts--;
  invuln = INVULN_TIME;
  if (hearts === 0) dying = 0.8;
  return true;
}

// the part of the player that things can hit
function playerHitbox() {
  return { x: player.x + player.w * 0.15, y: player.y + player.h * 0.05, w: player.w * 0.7, h: player.h * 0.9 };
}

function updateHealth(dt) {
  invuln = Math.max(0, invuln - dt);
  if (dying > 0 && (dying -= dt) <= 0) gameOver = true;
  if (invuln > 0 || hearts <= 0) return;
  const p = playerHitbox();
  // yellow guards hurt when you walk into them (red guards only hurt with their bullets)
  for (const g of guards) {
    const hb = guardHitbox(g);
    if (p.x + p.w > hb.x && p.x < hb.x + hb.w && p.y + p.h > hb.y && p.y < hb.y + hb.h) {
      hurtPlayer();
      break;
    }
  }
}

const keys = {};
addEventListener('keydown', e => {
  if (e.key.startsWith('Arrow')) e.preventDefault();
  if (inMenu) {
    if (e.key === 'Enter' || e.key === ' ') { restart(); inMenu = false; }
    return;
  }
  if (gameOver) return;   // on the game over screen the only way on is the MENU button
  if (!e.repeat) {
    if (e.key === '1') fire('left');
    if (e.key === '2') fire('right');
  }
  keys[e.key] = true;
});
addEventListener('keyup', e => { keys[e.key] = false; });

const player = { x: 100, y: 0, w: 0, h: 0, vx: 0, vy: 0, onGround: false, facing: 1, walkTime: 0 };
// Subject 0005 (the player) stands still with one drawing and walks with two that swap
// every 0.1 s. A walk always starts on walk frame 1.
const WALK_FRAME_TIME = 0.1;

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
    for (const list of [guards, redGuards]) {
      for (let j = list.length - 1; j >= 0 && !hit; j--) {
        const g = list[j], hb = guardHitbox(g);
        if (b.x + b.w / 2 > hb.x && b.x - b.w / 2 < hb.x + hb.w && b.y + b.h / 2 > hb.y && b.y - b.h / 2 < hb.y + hb.h) {
          hit = true;
          g.flash = 0.15;
          if (--g.hp <= 0) {
            list.splice(j, 1);
            // he leaves a paint stain where he stood (yellow guard: yellow, red guard: red)
            if (list === guards) paintStain(g.surface, g.x + g.w / 2, 'yellow');
            else paintStain(g.platform, g.x + g.w / 2, 'red');
          }
        }
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
  const startX = player.x;
  updateBullets(dt);
  updateSpawner(dt);
  updateGuards(dt);
  updateRedGuards(dt);
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

  // walking = actually moving along a surface (not standing, not in the air, not pushing on a wall)
  const walking = player.onGround && Math.abs(player.x - startX) > 0.01;
  player.walkTime = walking ? player.walkTime + dt : 0;
}

// A button drawing; it grows a little while the pointer is over it.
function drawButton(img, r, hovered) {
  const grow = hovered ? 1.06 : 1;
  const w = r.w * grow, h = r.h * grow;
  ctx.drawImage(img, r.x - (w - r.w) / 2, r.y - (h - r.h) / 2, w, h);
}

// pointer position in game (canvas) pixels
function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
const inRect = (m, r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;

// which button (if any) is under the pointer on the current screen
function buttonAt(e) {
  const m = pointerPos(e);
  if (inMenu) return inRect(m, playBtn) ? 'play' : null;
  if (gameOver) {
    if (inRect(m, againBtn)) return 'again';
    if (inRect(m, menuBtn)) return 'menu';
  }
  return null;
}

canvas.addEventListener('pointermove', e => {
  const was = hoverBtn;
  hoverBtn = buttonAt(e);
  if (hoverBtn && hoverBtn !== was) playPop();
  canvas.style.cursor = hoverBtn ? 'pointer' : 'default';
});
canvas.addEventListener('pointerdown', e => {
  const id = buttonAt(e);
  if (id) playPop();
  if (id === 'play' || id === 'again') { restart(); inMenu = false; hoverBtn = null; }
  if (id === 'menu') { toMenu(); hoverBtn = null; }
});

(async function main() {
  initAudio();   // starts silent until the first click or key press
  const [bg, sprite, platSprite, groundSprite, wallL, wallR, ceilSprite, gunL, gunR, guardL, guardR, heartImg, gameOverImg, menuImg, menuBtnImg, playBtnImg, playAgainImg, redGuardImg, redGunImg, redBulletImg, stainYellowImg, stainRedImg, platGreenImg, groundGreenImg, walk1Img, walk2Img] = await Promise.all(
    ['background', 'player', 'platform', 'ground', 'wall-left', 'wall-right', 'ceiling', 'gun-left', 'gun-right', 'guard-left', 'guard-right', 'heart', 'game-over', 'menu', 'menu-button', 'play-button', 'play-again-button', 'red-guard', 'red-gun', 'red-bullet', 'stain-yellow', 'stain-red', 'platform-green', 'ground-green', 'player-walk-1', 'player-walk-2'].map(n => load(`assets/${n}.png`)));
  const bulletNames = { left: ['bullet-l-1', 'bullet-l-2', 'bullet-l-3'], right: ['bullet-r-1', 'bullet-r-2', 'bullet-r-3'] };
  for (const side of ['left', 'right']) bulletSprites[side] = await Promise.all(bulletNames[side].map(n => load(`assets/${n}.png`)));
  player.h = PLAYER_H;
  player.w = Math.round(sprite.width * PLAYER_H / sprite.height);
  const gunLW = gun.lw = Math.round(gunL.width * GUN_H / gunL.height);
  const gunRW = gun.rw = Math.round(gunR.width * GUN_H / gunR.height);
  player.y = GROUND_Y - player.h;

  // game over: PLAY AGAIN exactly in the middle of the screen, MENU just above it
  const againW = 300, againH = Math.round(againW * playAgainImg.height / playAgainImg.width);
  Object.assign(againBtn, { x: (W - againW) / 2, y: (H - againH) / 2, w: againW, h: againH });
  menuBtn.w = 240;
  menuBtn.h = Math.round(menuBtn.w * menuBtnImg.height / menuBtnImg.width);
  menuBtn.x = (W - menuBtn.w) / 2;
  menuBtn.y = againBtn.y - menuBtn.h - 10;
  const playW = 260;                        // menu: PLAY, smaller and higher up
  Object.assign(playBtn, { x: (W - playW) / 2, y: 270, w: playW, h: Math.round(playW * playBtnImg.height / playBtnImg.width) });

  stainSprites.yellow = stainYellowImg;
  stainSprites.red = stainRedImg;
  setupPaint();

  redSprites.guard = redGuardImg;
  redSprites.gun = redGunImg;
  redSprites.bullet = redBulletImg;

  guardSprites.left = guardL;
  guardSprites.right = guardR;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (inMenu) {
      ctx.drawImage(menuImg, 0, 0, W, H);
      drawButton(playBtnImg, playBtn, hoverBtn === 'play');
      requestAnimationFrame(frame);
      return;
    }
    if (!gameOver) update(dt);

    const camX = Math.max(0, Math.min(WORLD_W - VIEW_W, player.x + player.w / 2 - VIEW_W / 2));
    const camY = Math.max(0, Math.min(WORLD_H - VIEW_H, player.y + player.h / 2 - VIEW_H / 2));

    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-camX, -camY);
    ctx.drawImage(bg, 0, 0, TILE_W, TILE_H);
    platforms.forEach((p, i) => ctx.drawImage(isPainted(i) ? platGreenImg : platSprite, p.x, p.y, p.w, p.h));
    // Walls and ground: a white fill plus drawings that run past the map edges,
    // so the edges are completely covered with no background showing through.
    const OVER = 40;
    const groundDone = isPainted('ground');
    ctx.fillStyle = groundDone ? '#4caf3c' : '#fff';
    ctx.fillRect(0, GROUND_TOP + 6, WORLD_W, WORLD_H - GROUND_TOP);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, WORLD_W, CEILING_H - 6);
    ctx.drawImage(groundDone ? groundGreenImg : groundSprite, -OVER, GROUND_TOP, WORLD_W + 2 * OVER, GROUND_H + OVER);
    ctx.drawImage(ceilSprite, -OVER, -OVER, WORLD_W + 2 * OVER, CEILING_H + OVER);
    // paint stains lie on the surface they were made on
    for (const st of stains) {
      ctx.drawImage(stainSprites[st.color], st.x - st.w / 2, st.y - st.h * 0.7, st.w, st.h);
    }
    for (const g of guards) {
      // a hit makes him blink
      if (g.flash > 0 && Math.floor(g.flash * 40) % 2 === 0) continue;
      ctx.drawImage(g.dir > 0 ? guardR : guardL, g.x, g.y, g.w, g.h);
    }
    for (const g of redGuards) {
      if (g.flash > 0 && Math.floor(g.flash * 40) % 2 === 0) continue;
      ctx.drawImage(redGuardImg, g.x, g.y, g.w, g.h);
      // the gun: held out from his body, pointing at you (flipped when aiming left so it stays upright)
      const pv = redPivot(g);
      const gh = RED_GUN_LEN * redGunImg.height / redGunImg.width;
      ctx.save();
      ctx.translate(pv.x + Math.cos(g.angle) * RED_GUN_DIST, pv.y + Math.sin(g.angle) * RED_GUN_DIST);
      ctx.rotate(g.angle);
      if (Math.cos(g.angle) < 0) ctx.scale(1, -1);
      ctx.drawImage(redGunImg, -RED_GUN_LEN / 2, -gh / 2, RED_GUN_LEN, gh);
      ctx.restore();
    }
    const blink = invuln > 0 && Math.floor(invuln * 10) % 2 === 0;
    // standing drawing, or the walk drawings (frame 1 first), all drawn at the same size
    const walkFrame = player.walkTime > 0 ? Math.floor(player.walkTime / WALK_FRAME_TIME) % 2 : -1;
    const bodyImg = walkFrame < 0 ? sprite : (walkFrame === 0 ? walk1Img : walk2Img);
    if (!blink) ctx.drawImage(bodyImg, player.x, player.y, player.w, player.h);
    // Left gun on the left side, right gun on the right side of the character.
    const gunY = gunTop();
    if (!blink) {
      ctx.drawImage(gunL, player.x + GUN_GRIP - gunLW, gunY, gunLW, GUN_H);
      ctx.drawImage(gunR, player.x + player.w - GUN_GRIP, gunY, gunRW, GUN_H);
    }
    for (const b of enemyBullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.drawImage(redBulletImg, -b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
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
      drawButton(playAgainImg, againBtn, hoverBtn === 'again');
      drawButton(menuBtnImg, menuBtn, hoverBtn === 'menu');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
