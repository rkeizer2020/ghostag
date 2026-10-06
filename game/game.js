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
const ACCEL = 3200, DECEL = 3800; // px/s^2: full speed in about 0.08 s


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

const assetUrl = n => `assets/${n}.${n === 'level-complete' ? 'jpg' : 'png'}`;
const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });

// --- Bullets and sound ---------------------------------------------------
// Key 1 fires the left gun, key 2 the right gun: one bullet per press (holding does nothing).
// Each shot is a random one of the 3 paint colours drawn for that direction.
const BULLET_W = 34, BULLET_SPEED = 450;
const SHOT_COOLDOWN = 0.2;                      // seconds before the same gun can fire again
const lastShot = { left: -Infinity, right: -Infinity };   // each gun has its own cool down
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

// --- Coins, upgrades and the shop ------------------------------------------------------
// You get a coin for every enemy you defeat. The shop sells 9 upgrades, but shows only 3
// at a time: every 5 minutes it picks 3 new ones at random. You can buy each one once.
const UPGRADES = [
  { id: 1, name: 'Second Wind', cost: 100, desc: 'Win back a heart every 60 s, and when you paint a platform green (every other time).' },
  { id: 2, name: 'Quick Feet', cost: 30, desc: 'You walk 10% faster.' },
  { id: 3, name: 'Spring Legs', cost: 15, desc: 'You jump 10% faster.' },
  { id: 4, name: 'Heavy Boots', cost: 15, desc: 'You fall 10% faster.' },
  { id: 5, name: 'Hard Hitter', cost: 35, desc: 'Every bullet that hits does 1.25 damage.' },
  { id: 6, name: 'Extra Heart', cost: 75, desc: 'You get 1 extra heart.' },
  { id: 7, name: 'Double Coins', cost: 50, desc: 'You get 2 coins for every enemy you defeat.' },
  { id: 8, name: 'Sticky Paint', cost: 50, desc: 'Your bullets slow enemies by 20% for 0.05 s: yellow guards walk slower, red guards shoot slower.' },
  { id: 9, name: 'Speedy Bullets', cost: 30, desc: 'Your bullets travel 20% faster.' },
];
const OFFER_COUNT = 3, OFFER_TIME = 5 * 60 * 1000;
const MAX_EQUIPPED = 3;
const SAVE_KEY = 'drawshot-save';           // the guest save; a logged in player gets 'drawshot-save:<name>'
// Supabase project for the accounts (the publishable key is meant to be public; saves are protected by row level security)
const SUPA_URL = 'https://pxesgizsahewtzssgqyf.supabase.co';
const SUPA_KEY = 'sb_publishable_mqgWcQrbYFRuP1shEuOIPg_9xpjm86I';
const SESSION_KEY = 'drawshot-session';
const save = { coins: 0, owned: [], equipped: [], offerWindow: -1, offers: [], level: 1, character: '0005' };
let user = null;                             // the logged in username, or null for a guest
let session = null;                          // {name, uid, access, refresh, exp} while logged in
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* no saving: it just lasts until the page closes */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
const saveKey = () => (user ? SAVE_KEY + ':' + user : SAVE_KEY);
let pushTimer = 0;
function writeSave() {
  store.set(saveKey(), JSON.stringify(save));
  if (session) { clearTimeout(pushTimer); pushTimer = setTimeout(() => Auth.push().catch(() => {}), 1500); }   // also to the server
}
let brushImg, shieldImg, bodyImg0005, manIdleImg, manWalk1Img, manWalk2Img, manCardImg, manUpImg, manApexImg, manFallImg;   // the drawings of the two characters
// replace the progress in `save` with another saved game (login / logout)
function loadSave(raw) {
  let data = {};
  try { data = JSON.parse(raw || '{}') || {}; } catch (e) { /* start fresh */ }
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, { coins: 0, owned: [], equipped: null, offerWindow: -1, offers: [], level: 1, character: '0005' }, data);
  if (!(save.level >= 1)) save.level = 1;
  if (!Array.isArray(save.equipped)) save.equipped = save.owned.slice(0, MAX_EQUIPPED);   // saves from before the cards screen
  save.equipped = save.equipped.filter(id => save.owned.includes(id)).slice(0, MAX_EQUIPPED);
  applyPerks();
  applyCharacter();
}
// accounts that always have everything unlocked: every upgrade now, and every character once they exist
const OWNER_ACCOUNTS = ['merlinos24maker'];
const isOwner = () => !!user && OWNER_ACCOUNTS.includes(user.toLowerCase());
// the playable characters: 0005 is always there; the others are unlocked for the owner account for now
const CHARACTERS = [{ id: '0005', name: 'SUBJECT 0005', unlockLevel: 1 }, { id: '0300', name: 'SUBJECT 0300', unlockLevel: 2 }];
const characterUnlocked = id => isOwner() || levelNo() >= ((CHARACTERS.find(c => c.id === id) || {}).unlockLevel || 1);   // reaching level 2 unlocks 0300
const unlockedCharacters = () => CHARACTERS.filter(c => characterUnlocked(c.id));
function charId() { return characterUnlocked(save.character) ? save.character : '0005'; }
const charImg = () => (charId() === '0300' ? manIdleImg : bodyImg0005);
function applyCharacter() {   // the body is as wide as his drawing
  const img = charImg();
  if (img) player.w = Math.round(img.width * PLAYER_H / img.height);
}
function applyPerks() {
  if (!isOwner()) return;
  for (const u of UPGRADES) if (!save.owned.includes(u.id)) save.owned.push(u.id);
}
try { session = JSON.parse(store.get(SESSION_KEY) || 'null'); } catch (e) { session = null; }
user = session ? session.name : null;
loadSave(store.get(saveKey()));
// the level you are on: completing a level moves you up, dying keeps you where you are (there is no way back)
function levelNo() { return save.level || 1; }   // (a function so it can be used while the save is being loaded)
const owns = id => save.owned.includes(id);
const has = id => charId() === '0005' && save.equipped.includes(id);   // only equipped cards do anything (not for SUBJECT 0300 yet)

// what the upgrades change
const moveSpeed = () => MOVE_SPEED * (has(2) ? 1.1 : 1);
const jumpSpeed = () => JUMP_SPEED * (has(3) ? 1.1 : 1);
const gravityUp = () => GRAVITY_UP * (has(3) ? 1.21 : 1);      // jumping faster, to the same height
const gravityDown = () => GRAVITY_DOWN * (has(4) ? 1.21 : 1);  // falling 10% faster
const bulletSpeed = () => BULLET_SPEED * (has(9) ? 1.2 : 1);
const damage = () => (has(5) ? 1.25 : 1);
const maxHearts = () => 5 + (has(6) ? 1 : 0);
const coinsPerKill = () => (has(7) ? 2 : 1);

function giveCoins() { save.coins += coinsPerKill(); writeSave(); }

// Second Wind: +1 heart every 60 s, and when a surface turns green (1st, 3rd, 5th ... time)
let regenTimer = 0, greenCount = 0;
function healHeart() { if (hearts > 0) hearts = Math.min(maxHearts(), hearts + 1); }
function onSurfaceGreen() {
  greenCount++;
  if (has(1) && greenCount % 2 === 1) healHeart();
}

// the 3 upgrades on offer: new ones every 5 minutes (not counting what you already own)
function ensureOffers() {
  const win = Math.floor(Date.now() / OFFER_TIME);
  if (save.offerWindow === win) return;
  const pool = UPGRADES.filter(u => !owns(u.id)).map(u => u.id);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  save.offers = pool.slice(0, OFFER_COUNT);
  save.offerWindow = win;
  writeSave();
}
function toggleEquip(id) {
  if (!owns(id)) return;
  const i = save.equipped.indexOf(id);
  if (i >= 0) save.equipped.splice(i, 1);
  else if (save.equipped.length >= MAX_EQUIPPED) { Object.assign(shopMsg, { text: 'Only ' + MAX_EQUIPPED + ' cards at a time: remove one first', t: 2.2, good: false }); return; }
  else save.equipped.push(id);
  writeSave();
}
const offerSecondsLeft = () => Math.max(0, Math.ceil(((Math.floor(Date.now() / OFFER_TIME) + 1) * OFFER_TIME - Date.now()) / 1000));

// --- Painting the map -----------------------------------------------------------------
// The goal: paint every surface. Defeating an enemy leaves a paint stain where he stood
// (yellow for the yellow guard on the ground and big platforms, red for the red guard
// on the small platforms), but only on a part of the surface that isn't painted yet.
// A surface is split in equal parts (a stain covers exactly one part), and it turns green
// when every part has a stain:
// the main ground needs 4, each big platform 3 and each small platform 1.
const PAINT_SURFACES = {};   // id -> { n parts, minX, maxX, y (the line you stand on), stainH }
const paintDone = {};        // id -> array of booleans, one per part
const stains = [];           // { x, y, color }
const stainSprites = { yellow: null, red: null };
let paintImgs = null;        // green drawings

function setupPaint() {
  const span = p => ({ minX: Math.max(p.x, WALL_W), maxX: Math.min(p.x + p.w, WORLD_W - WALL_W), y: p.top, stainH: p.h * 0.8 });
  PAINT_SURFACES.ground = { n: 4, minX: WALL_W, maxX: WORLD_W - WALL_W, y: GROUND_Y, stainH: 70 };
  platforms.forEach((p, i) => { PAINT_SURFACES[i] = Object.assign({ n: MINI_PLATFORMS.includes(i) ? 1 : 3 }, span(p)); });
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
  if (isPainted(id)) onSurfaceGreen();
  // one stain is exactly one part of the surface (1/6 of the ground, 1/4 of a big platform)
  const partW = (s.maxX - s.minX) / s.n;
  stains.push({ x: s.minX + (part + 0.5) * partW, y: s.y, w: partW, h: s.stainH, color, surface: id });
}

// --- Enemies: the yellow guard ----------------------------------------------
// Patrols left and right on the main ground or a big platform. He can't jump and
// never walks off: he turns around at the edge. (6 hits take him out.)
const GUARD_H = 80, GUARD_SPEED = MOVE_SPEED, GUARD_HP = 6; // as fast as the player
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
// every 1.25 s (every 3.5 s while he stands on a green platform) he shoots a bullet at the spot where you are at that moment. His gun
// hangs a little way from his body and always points at you, like an outstretched arm.
const RED_HP = 3, RED_SHOOT_EVERY = 1.25, RED_SHOOT_EVERY_IN_STAIN = 2, RED_SHOOT_EVERY_ON_GREEN = 3.5, RED_BULLET_SPEED = 320, RED_BULLET_W = 28;
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
  const i = pickSurface(free, id => id);
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
    g.shootTimer -= dt * (g.hitSlow > 0 ? 0.8 : 1);
    g.hitSlow = Math.max(0, (g.hitSlow || 0) - dt);
    if (g.shootTimer <= 0 && hearts > 0) {
      // slowest on a green (fully painted) platform, a bit slow in a stain, normal otherwise
      g.shootTimer += isPainted(g.platform) ? RED_SHOOT_EVERY_ON_GREEN
        : stainAt(g.platform, g.x + g.w / 2) ? RED_SHOOT_EVERY_IN_STAIN : RED_SHOOT_EVERY;
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
    // (the red guard's bullets make no sound)
    if (hitsPlayer) {
      if (charId() === '0300' && shield.t > 0 && shieldFaces(b.x - b.vx)) {
        // blocked. In the first 0.2 s after raising the shield it is a PERFECT block: the bullet is thrown back
        shield.flash = 0.3;
        if (shield.age <= PERFECT_WINDOW) reflected.push({ x: b.x, y: b.y, vx: -b.vx * 1.3, vy: -b.vy * 1.3, angle: b.angle + Math.PI, w: b.w, h: b.h, dmg: 1 });
      } else hurtPlayer();
      enemyBullets.splice(i, 1);
    } else if (hitsWorld) {
      enemyBullets.splice(i, 1);
    }
  }
}

// --- Spawning: every enemy type keeps spawning new enemies, for ever, at a
// random spot on the main ground, the lowest big platform or the highest platform.
const SPAWN_EVERY = 4; // default for new enemies
const SPAWN_GAP = 220; // an enemy never spawns closer than this (px) to the player
const enemyTypes = [
  { name: 'guard', every: 7.5, timer: 0, spawn: spawnGuard },
  { name: 'redGuard', every: 20, timer: 0, trySpawn: trySpawnRedGuard },   // small platforms only
  // new enemies are added here and spawn the same way
];

// Enemies are more likely to appear on a surface that isn't green yet (3 to 1), so they
// show up where there is still paint to be made.
const UNPAINTED_WEIGHT = 3;
function pickSurface(items, idOf) {
  const weights = items.map(it => (isPainted(idOf(it)) ? 1 : UNPAINTED_WEIGHT));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

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
      const surface = pickSurface(surfaces, sf => sf.id);
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
    const speed = GUARD_SPEED * (g.slow > 0 ? STAIN_SLOW : 1) * (g.hitSlow > 0 ? 0.8 : 1);
    g.slow = Math.max(0, g.slow - dt);
    g.hitSlow = Math.max(0, (g.hitSlow || 0) - dt);
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
const INVULN_TIME = 1.5;
// Subject 394 (level 2 only): follows you, 35% slower than you.
// Every hit takes 2 hearts. 8 bullet hits destroy him.
const GHOST_LEVEL = 2, GHOST_SPEED = 0.65, GHOST_DELAY = 8, GHOST_DAMAGE = 2, GHOST_FADE = 1.5, GHOST_HP = 8, GHOST_DYING = 0.5;
const ghost = { trail: [], idx: 0, time: 0, play: 0, active: false, age: 0, x: 0, y: 0, moving: 0, hp: GHOST_HP, dead: false, dying: 0, flash: 0, vx: 0, vy: 0, onGround: true, dir: 1, airDir: 0, kb: 0, kbVx: 0, plan: null, planT: 0, land: 0 };
let ghostImg;
function resetGhost() { Object.assign(ghost, { trail: [], idx: 0, time: 0, play: 0, active: false, age: 0, x: 0, y: 0, moving: 0, hp: GHOST_HP, dead: false, dying: 0, flash: 0, vx: 0, vy: 0, onGround: true, dir: 1, airDir: 0, kb: 0, kbVx: 0, plan: null, planT: 0, land: 0 }); }
function updateGhost(dt) {
  if (levelNo() !== GHOST_LEVEL) return;
  ghost.flash = Math.max(0, ghost.flash - dt);
  if (ghost.dead) { ghost.dying = Math.max(0, ghost.dying - dt); return; }   // destroyed
  if (hearts <= 0) return;
  ghost.time += dt;
  if (!ghost.active) {
    if (ghost.time < GHOST_DELAY) return;
    // he shows up on the ground at the far end of the map, away from you
    ghost.active = true;
    ghost.x = player.x < WORLD_W / 2 ? WORLD_W - WALL_W - 140 : WALL_W + 90;
    ghost.y = GROUND_Y - player.h; ghost.vx = 0; ghost.vy = 0; ghost.onGround = true;
  }
  ghost.age += dt;
  if (ghost.age < GHOST_FADE) return;     // he stands still while he fades in
  ghostChase(dt);
}

// Subject 394 just follows you. He knows which platform leads to which (found by trying the jumps out in
// his head), walks to the right spot, jumps up, or walks off an edge to come down, and then walks to you.
// He is 35% slower than you.
function simulateMove(x0, feet0, dir, speed, vy0, skip) {   // where does this jump / fall land? (platform index, -1 = the ground)
  let x = x0 - player.w / 2, y = feet0 - player.h, vy = vy0;
  for (let i = 0; i < 110; i++) {
    const prevBottom = y + player.h, prevHead = y, dt = 0.016;
    vy += (vy < 0 ? GRAVITY_UP : GRAVITY_DOWN) * dt;
    x = Math.max(WALL_W, Math.min(WORLD_W - WALL_W - player.w, x + dir * speed * dt));
    y += vy * dt;
    if (y < CEILING_H - 6) { y = CEILING_H - 6; if (vy < 0) vy = 0; }
    if (vy < 0) for (const p of platforms) if (x + player.w > p.x && x < p.x + p.w && prevHead >= p.ceil && y < p.ceil) { y = p.ceil; vy = 0; }
    if (vy >= 0) for (let k = 0; k < platforms.length; k++) {
      const p = platforms[k];
      if (k !== skip && x + player.w > p.x && x < p.x + p.w && prevBottom <= p.top && y + player.h >= p.top) return k;
    }
    if (y + player.h >= GROUND_Y) return -1;
  }
  return null;
}
let ghostGraph = null, ghostGraphSpeed = 0;
function buildGhostGraph(speed) {   // node -1 = the ground, 0.. = the platforms; an edge = a jump or a walk off an edge
  const minX = WALL_W + 20, maxX = WORLD_W - WALL_W - 20, g = new Map();
  for (let A = -1; A < platforms.length; A++) {
    const edges = [], pa = A >= 0 ? platforms[A] : null;
    const feet = pa ? pa.top : GROUND_Y;
    const L = pa ? Math.max(minX, pa.x + 10) : minX, R = pa ? Math.min(maxX, pa.x + pa.w - 10) : maxX;
    const seen = new Set();
    for (let sx = L; sx <= R; sx += 6) for (const dir of [-1, 1]) {
      const B = simulateMove(sx, feet, dir, speed, -JUMP_SPEED, A);
      if (B === null || B === A || (B >= 0 ? platforms[B].top : GROUND_Y) > feet - 15) continue;   // jumps only go up
      // robust: a few pixels earlier or later has to land on the same platform
      if (simulateMove(sx - 6, feet, dir, speed, -JUMP_SPEED, A) !== B || simulateMove(sx + 6, feet, dir, speed, -JUMP_SPEED, A) !== B) continue;
      const key = B + ':' + dir;
      if (!seen.has(key)) { seen.add(key); edges.push({ to: B, standX: sx, dir, kind: 'jump' }); }
    }
    if (pa) for (const side of [-1, 1]) {   // walking off an edge
      const edge = side < 0 ? pa.x : pa.x + pa.w;
      if (side < 0 ? pa.x <= minX : pa.x + pa.w >= maxX) continue;
      const standX = edge + side * 40, B = simulateMove(standX, feet, side, speed, 0, A);
      if (B !== null && B !== A) edges.push({ to: B, standX, dir: side, kind: 'walk' });
    }
    g.set(A, edges);
  }
  return g;
}
// the first step of the shortest way from node `from` to node `to`
function ghostNextStep(from, to, speed) {
  if (!ghostGraph || ghostGraphSpeed !== speed) { ghostGraph = buildGhostGraph(speed); ghostGraphSpeed = speed; }
  const prev = new Map([[from, null]]), queue = [from];
  while (queue.length) {
    const n = queue.shift();
    if (n === to) break;
    for (const e of ghostGraph.get(n) || []) if (!prev.has(e.to)) { prev.set(e.to, { from: n, edge: e }); queue.push(e.to); }
  }
  if (!prev.has(to) || to === from) return null;
  let cur = to, step = null;
  while (prev.get(cur)) { step = prev.get(cur).edge; cur = prev.get(cur).from; }
  return step;
}
// the platform (or ground) a spot is above
function nodeAt(cx, feet) {
  let best = -1, bestTop = GROUND_Y;
  platforms.forEach((p, i) => { if (cx > p.x - 6 && cx < p.x + p.w + 6 && p.top >= feet - 10 && p.top < bestTop) { best = i; bestTop = p.top; } });
  return best;
}
function ghostChase(dt) {
  const gcx = ghost.x + player.w / 2, pcx = player.x + player.w / 2;
  const gfeet = ghost.y + player.h, pfeet = player.y + player.h;
  const speed = moveSpeed() * GHOST_SPEED;
  let target = pcx, jump = 0;
  if (ghost.onGround) {
    const idx = platforms.findIndex(p => Math.abs(gfeet - p.top) < 3 && ghost.x + player.w > p.x && ghost.x < p.x + p.w);   // -1: the ground
    const step = ghostNextStep(idx, nodeAt(pcx, pfeet), speed);
    if (step) {
      target = step.standX;
      if (step.kind === 'jump' && Math.abs(gcx - step.standX) <= 4) jump = step.dir;
    }
  }
  let dir = Math.abs(target - gcx) > 4 ? Math.sign(target - gcx) : 0;
  if (jump && ghost.onGround) { ghost.vy = -JUMP_SPEED; ghost.onGround = false; ghost.airDir = jump; }
  if (!ghost.onGround) dir = ghost.airDir || ghost.dir || 1;                // in the air he keeps going the way he was going
  if (ghost.kb > 0) { ghost.kb -= dt; ghost.vx = ghost.kbVx; } else ghost.vx = dir * speed;   // (pushed back by a perfect block)
  if (dir) ghost.dir = dir;
  // the same physics as yours
  const prevBottom = ghost.y + player.h, prevHead = ghost.y, startX = ghost.x, wasOn = ghost.onGround, fallV = ghost.vy;
  ghost.vy += (ghost.vy < 0 ? GRAVITY_UP : GRAVITY_DOWN) * dt;
  ghost.x += ghost.vx * dt;
  ghost.y += ghost.vy * dt;
  ghost.onGround = false;
  ghost.x = Math.max(WALL_W, Math.min(WORLD_W - WALL_W - player.w, ghost.x));
  if (ghost.y < CEILING_H - 6) { ghost.y = CEILING_H - 6; if (ghost.vy < 0) ghost.vy = 0; }
  if (ghost.vy < 0) for (const p of platforms) {
    if (ghost.x + player.w > p.x && ghost.x < p.x + p.w && prevHead >= p.ceil && ghost.y < p.ceil) { ghost.y = p.ceil; ghost.vy = 0; }
  }
  if (ghost.vy >= 0) for (const p of platforms) {
    const bottom = ghost.y + player.h;
    if (ghost.x + player.w > p.x && ghost.x < p.x + p.w && prevBottom <= p.top && bottom >= p.top) { ghost.y = p.top - player.h; ghost.vy = 0; ghost.onGround = true; }
  }
  if (ghost.y + player.h >= GROUND_Y) { ghost.y = GROUND_Y - player.h; ghost.vy = 0; ghost.onGround = true; }
  if (ghost.onGround) ghost.airDir = 0;
  if (!wasOn && ghost.onGround) ghost.land = Math.min(1, fallV / 700);          // landing squash
  ghost.land *= Math.exp(-dt * 11);
  ghost.moving = ghost.onGround && Math.abs(ghost.x - startX) > 0.01 ? 1 : 0;
  if (ghost.moving) ghost.play += dt;
}
function ghostBox() {
  const h = player.h * 1.2, w = h * ghostImg.width / ghostImg.height, cx = ghost.x + player.w / 2, feet = ghost.y + player.h;
  return { x: cx - w * 0.35, y: feet - h * 0.95, w: w * 0.7, h: h * 0.9, cx, feet, dw: w, dh: h };
}
function drawGhost() {
  if (!ghost.active || (ghost.dead && ghost.dying <= 0)) return;
  const g = ghostBox();
  const bob = ghost.moving ? -Math.abs(Math.sin(ghost.play * 11)) * 3 : 0;
  ctx.save();
  ctx.globalAlpha = Math.min(1, ghost.age / GHOST_FADE) * (ghost.dead ? ghost.dying / GHOST_DYING : 1) * (ghost.flash > 0 ? 0.55 : 1);
  ctx.translate(g.cx, g.feet + bob);
  if (ghost.dead) ctx.scale(1 + (1 - ghost.dying / GHOST_DYING) * 0.3, ghost.dying / GHOST_DYING * 0.6 + 0.4);
  ctx.rotate(ghost.moving ? Math.sin(ghost.play * 11) * 0.05 : 0);
  if (!ghost.onGround && !ghost.dead) {   // the jump: leans into it, stretched while rising / falling fast, squashed and wide at the top
    const sy = 1 + Math.min(1, Math.abs(ghost.vy) / (JUMP_SPEED * 1.1)) * 0.16 - 0.05 * (1 - Math.min(1, Math.abs(ghost.vy) / 220));
    ctx.rotate((ghost.airDir || ghost.dir || 1) * 0.1);
    ctx.scale(Math.pow(sy, -0.8), sy);
  } else if (ghost.land > 0.02 && !ghost.dead) {   // landing squash
    const sy = 1 - 0.16 * ghost.land;
    ctx.scale(Math.pow(sy, -0.8), sy);
  }
  ctx.drawImage(ghostImg, -g.dw / 2, -g.dh, g.dw, g.dh);
  ctx.restore();
}

// SUBJECT 0300: key 1 swings the giant brush, key 2 raises the shield, and walking leaves an ink trail
const SWING_COOLDOWN = 0.75, SWING_DAMAGE = 3, SWING_REACH = 130, SWING_TIME = 0.24;
const SHIELD_TIME = 0.6, SHIELD_COOLDOWN = 0.3, PERFECT_WINDOW = 0.2;
const INK_DAMAGE = 1, INK_LIFE = 1, INK_STEP = 8, INK_HIT_EVERY = 0.5;
const swing = { t: 0, cd: 0, dir: 1, done: false };
const shield = { t: 0, age: 0, cd: 0, flash: 0 };
const ink = [];            // the pieces of the ink trail
const reflected = [];      // bullets thrown back by a perfect block
let lastInk = null, inkZig = 1;
const overlap = (a, b) => a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;
// a platform's body is in the way (the brush can't reach through platforms)
function sightBlocked(x1, y1, x2, y2) {
  for (let i = 1; i <= 14; i++) {
    const x = x1 + (x2 - x1) * i / 14, y = y1 + (y2 - y1) * i / 14;
    if (platforms.some(p => x > p.x && x < p.x + p.w && y > p.top + 2 && y < p.ceil - 2)) return true;
  }
  return false;
}
function startSwing() {
  if (swing.cd > 0 || hearts <= 0) return;
  Object.assign(swing, { t: SWING_TIME, cd: SWING_COOLDOWN, dir: player.facing || 1, done: false });
}
function swingHit() {
  const cx = player.x + player.w / 2, cy = player.y + player.h * 0.5;
  const zone = { x: swing.dir > 0 ? cx - 6 : cx - SWING_REACH, y: player.y - 18, w: SWING_REACH + 6, h: player.h + 18 };
  const reaches = hb => overlap(zone, hb) && !sightBlocked(cx, cy, hb.x + hb.w / 2, hb.y + hb.h / 2);
  for (const list of [guards, redGuards]) for (let j = list.length - 1; j >= 0; j--) if (reaches(guardHitbox(list[j]))) hurtGuard(list, j, SWING_DAMAGE);
  if (ghostHittable() && reaches(ghostBox())) hurtGhost(SWING_DAMAGE);
}
function raiseShield() {
  if (shield.t > 0 || shield.cd > 0 || hearts <= 0) return;
  Object.assign(shield, { t: SHIELD_TIME, age: 0 });
}
// the shield only stops what comes from the side you look at
const shieldFaces = fromX => (player.facing >= 0 ? fromX > player.x + player.w / 2 : fromX < player.x + player.w / 2);
function updateBrushMoves(dt) {
  swing.cd = Math.max(0, swing.cd - dt);
  if (swing.t > 0) {
    swing.t -= dt;
    if (!swing.done && swing.t <= SWING_TIME * 0.6) { swing.done = true; swingHit(); }   // the hit lands mid-swing
  }
  if (shield.t > 0) { shield.age += dt; if ((shield.t -= dt) <= 0) shield.cd = SHIELD_COOLDOWN; }
  else shield.cd = Math.max(0, shield.cd - dt);
  shield.flash = Math.max(0, shield.flash - dt);
  for (let i = reflected.length - 1; i >= 0; i--) {   // thrown-back bullets hurt whoever they hit
    const r = reflected[i];
    r.x += r.vx * dt; r.y += r.vy * dt;
    const rb = { x: r.x - r.w / 2, y: r.y - r.h / 2, w: r.w, h: r.h };
    let used = false;
    for (const list of [redGuards, guards]) for (let j = list.length - 1; j >= 0 && !used; j--) if (overlap(rb, guardHitbox(list[j]))) { hurtGuard(list, j, r.dmg); used = true; }
    if (!used && ghostHittable() && overlap(rb, ghostBox())) { hurtGhost(r.dmg); used = true; }
    if (used || r.x < WALL_W || r.x > WORLD_W - WALL_W || r.y < CEILING_H - 6 || r.y > GROUND_Y || platforms.some(p => r.x > p.x && r.x < p.x + p.w && r.y > p.top && r.y < p.ceil)) reflected.splice(i, 1);
  }
  // ink trail: a zigzag behind him while he walks; every piece is gone after 1 second
  for (let i = ink.length - 1; i >= 0; i--) if ((ink[i].life -= dt) <= 0) ink.splice(i, 1);
  if (player.onGround && Math.abs(player.vx) > 40) {
    if (!lastInk || Math.abs(player.x - lastInk.px) >= INK_STEP) {
      inkZig = -inkZig;
      const seg = { x: player.x + player.w / 2, y: player.y + player.h - 4 + inkZig * 4, px: player.x, life: INK_LIFE, prev: lastInk && lastInk.life > 0 ? lastInk : null };
      ink.push(seg); lastInk = seg;
    }
  } else lastInk = null;
  for (const list of [guards, redGuards]) for (const g of list) g.inkCd = Math.max(0, (g.inkCd || 0) - dt);
  ghost.inkCd = Math.max(0, (ghost.inkCd || 0) - dt);
  if (ink.length) {
    for (const list of [guards, redGuards]) for (let j = list.length - 1; j >= 0; j--) {
      const g = list[j];
      if (g.inkCd > 0) continue;
      const hb = guardHitbox(g);
      if (ink.some(k => overlap({ x: k.x - 10, y: k.y - 12, w: 20, h: 20 }, hb))) { g.inkCd = INK_HIT_EVERY; hurtGuard(list, j, INK_DAMAGE); }
    }
    if (ghostHittable() && !(ghost.inkCd > 0)) {
      const gb = ghostBox();
      if (ink.some(k => overlap({ x: k.x - 10, y: k.y - 12, w: 20, h: 20 }, gb))) { ghost.inkCd = INK_HIT_EVERY; hurtGhost(INK_DAMAGE); }
    }
  }
}

let hearts = 5;
let invuln = 0;
let dying = 0;          // short pause after the last heart before the game over screen
let gameOver = false;
let levelComplete = false;   // the whole map is painted
let completeTimer = 0;       // a short pause so you can see the last stain before the screen comes
let inMenu = true;      // the game starts on the DRAWSHOT menu
let inShop = false;     // the shop screen (opened from the menu or the level completed screen)
let inChars = false;    // the character screen (EQUIP): pick who you play and read what he does
let viewChar = '0005';  // the character whose info is shown
let inCards = false;    // the cards screen: pick the (max 3) cards you play with
let inLogin = false;    // the login box is open
const shopMsg = { text: '', t: 0, good: false };
let hoverBtn = null;    // which button the pointer is over: 'play' or 'menu'
// Button rectangles (set once the drawings have loaded): PLAY on the menu screen
// and PLAY AGAIN + MENU on the game over screen.
const menuBtn = { x: 0, y: 0, w: 0, h: 0 };
const playBtn = { x: 0, y: 0, w: 0, h: 0 };      // on the menu screen
const lcMenuBtn = { x: 0, y: 0, w: 0, h: 0 };    // MENU on the level completed screen
const againBtn = { x: 0, y: 0, w: 0, h: 0 };     // PLAY AGAIN on the game over screen
const shopBtn = { x: 0, y: 0, w: 0, h: 0 };      // SHOP on the menu screen
const lcShopBtn = { x: 0, y: 0, w: 0, h: 0 };    // SHOP on the level completed screen
const cardsBtn = { x: 0, y: 0, w: 0, h: 0 };     // CARDS on the menu screen
const lcNextBtn = { x: 0, y: 0, w: 0, h: 0 };    // NEXT on the level completed screen
const lcCardsBtn = { x: 0, y: 0, w: 0, h: 0 };   // CARDS on the level completed screen
const loginBtn = { x: 0, y: 0, w: 0, h: 0 };
const equipBtn = { x: 0, y: 0, w: 0, h: 0 };    // EQUIP (character) on the menu screen, under LOGIN     // LOGIN on the menu screen
const shopMenuBtn = { x: 0, y: 0, w: 0, h: 0 };  // MENU on the shop screen
const CARD_W = 300, CARD_H = 440, CARD_GAP = 40, CARD_Y = 128;
let equipBtnImg, nextBtnImg, cardsBtnImg, loginBtnImg, shopBtnImg, cardFrameImg, coinImg, menuBgImg, menuBackImg;
const upgradeImgs = {};
const TITLE_FONT = 'Rye, Georgia, serif', BODY_FONT = '"Trebuchet MS", system-ui, sans-serif';

function toMenu() {
  restart();
  inMenu = true;
  inShop = false;
  inCards = false;
  inChars = false;
}

function openChars() {
  inChars = true;
  viewChar = charId();
  shopMsg.t = 0;
}

function openCards() {
  inCards = true;
  shopMsg.t = 0;
}

function openShop() {
  ensureOffers();
  inShop = true;
  shopMsg.t = 0;
}

function restart() {
  cam.x = null;
  hearts = maxHearts();
  regenTimer = 0;
  greenCount = 0;
  invuln = 0;
  dying = 0;
  gameOver = false;
  levelComplete = false;
  completeTimer = 0;
  guards.length = 0;
  redGuards.length = 0;
  bullets.length = 0;
  lastShot.left = lastShot.right = -Infinity;
  enemyBullets.length = 0;
  resetPaint();
  resetGhost();
  Object.assign(swing, { t: 0, cd: 0 }); Object.assign(shield, { t: 0, age: 0, cd: 0, flash: 0 });
  ink.length = 0; reflected.length = 0; lastInk = null;
  for (const type of enemyTypes) type.timer = 0;
  Object.assign(player, { x: 100, y: GROUND_Y - player.h, vx: 0, vy: 0, onGround: false, walkTime: 0, idleTime: 0 });
  for (const k in keys) keys[k] = false;
}

// Take one heart (unless you're blinking or already out). Returns true if it hurt.
function hurtPlayer(amount = 1) {
  if (invuln > 0 || hearts <= 0) return false;
  hearts = Math.max(0, hearts - amount);
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
  for (let i = 0; i < guards.length; i++) {
    const hb = guardHitbox(guards[i]);
    if (p.x + p.w > hb.x && p.x < hb.x + hb.w && p.y + p.h > hb.y && p.y < hb.y + hb.h) {
      if (charId() === '0300' && shield.t > 0 && shield.age <= PERFECT_WINDOW && shieldFaces(hb.x + hb.w / 2)) {
        // a perfect block: no damage to you, the guard takes the 1 damage he would have done
        shield.flash = 0.3;
        invuln = 0.6;
        hurtGuard(guards, i, 1);
      } else hurtPlayer();
      break;
    }
  }
  // subject 394 takes 2 hearts (harmless while he is still fading in)
  if (ghost.active && !ghost.dead && ghost.age >= GHOST_FADE) {
    const hb = ghostBox();
    if (p.x + p.w > hb.x && p.x < hb.x + hb.w && p.y + p.h > hb.y && p.y < hb.y + hb.h) {
      if (charId() === '0300' && shield.t > 0 && shield.age <= PERFECT_WINDOW && shieldFaces(hb.x + hb.w / 2)) {
        // a perfect block: no damage to you, he takes the 2 damage himself and is pushed back
        shield.flash = 0.3;
        invuln = 0.6;
        hurtGhost(GHOST_DAMAGE);
        ghost.kb = 0.25; ghost.kbVx = (hb.x + hb.w / 2 > p.x + p.w / 2 ? 1 : -1) * 320;   // pushed back
      } else hurtPlayer(GHOST_DAMAGE);
    }
  }
}

const keys = {};
addEventListener('keydown', e => {
  if (e.key.startsWith('Arrow')) e.preventDefault();
  if (inShop || inCards || inChars || inLogin) return;
  if (inMenu) {
    if (e.key === 'Enter' || e.key === ' ') { restart(); inMenu = false; }
    return;
  }
  if (gameOver || levelComplete) return;   // on these screens the only way on is the MENU button
  if (!e.repeat) {
    if (charId() === '0300') {   // the brush: 1 swings, 2 raises the shield
      if (e.key === '1') startSwing();
      if (e.key === '2') raiseShield();
    } else {
      if (e.key === '1') fire('left');
      if (e.key === '2') fire('right');
    }
  }
  keys[e.key] = true;
});
addEventListener('keyup', e => { keys[e.key] = false; });

const player = { x: 100, y: 0, w: 0, h: 0, vx: 0, vy: 0, onGround: false, facing: 1, walkTime: 0, idleTime: 0 };
// Subject 0005 (the player) stands still with one drawing and walks with two that swap
// every 0.15 s. A walk always starts on walk frame 1.
const WALK_FRAME_TIME = 0.3;
// Standing: base -> head low -> base -> head high -> base ... (always starts on base).
const IDLE_FRAME_TIME = 0.2;
// Drawings fade into each other instead of snapping, which makes the animation smoother.
const FADE_WALK = 0.12, FADE_IDLE = 0.12, FADE_JUMP = 0.05;
const cam = { x: null, y: null };
// Smooth, procedural movement of the drawing: lean into the run, a hop on every step,
// stretch when jumping, squash when landing, and a gentle breathing while standing still.
const vis = { tilt: 0, jump: 0, land: 0, shield: 1 };
const pose = { cur: null, prev: null, fade: 1, fadeTime: FADE_IDLE };
function setPose(img, fadeTime) {
  if (img === pose.cur) return;
  pose.prev = pose.cur;
  pose.cur = img;
  pose.fade = pose.prev ? 0 : 1;
  pose.fadeTime = fadeTime;
}

function gunTop() {
  return player.y + player.h * 0.55 - GUN_H / 2;
}

function fire(side) {
  const sprites = bulletSprites[side];
  if (!sprites.length) return;
  const now = performance.now() / 1000;
  if (now - lastShot[side] < SHOT_COOLDOWN) return;   // this gun is still cooling down
  lastShot[side] = now;
  const img = sprites[Math.floor(Math.random() * sprites.length)];
  const left = side === 'left';
  bullets.push({
    img,
    w: BULLET_W,
    h: BULLET_W * img.height / img.width,
    // start at the gun's muzzle
    x: charId() === '0300' ? (left ? player.x - 6 : player.x + player.w + 6) : (left ? player.x + GUN_GRIP - gun.lw : player.x + player.w - GUN_GRIP + gun.rw),
    y: charId() === '0300' ? player.y + player.h * 0.3 : gunTop() + GUN_H * 0.4,
    vx: left ? -bulletSpeed() : bulletSpeed(),
  });
}

// one enemy takes damage (a bullet, a brush swing, the ink trail or a reflected bullet); a dead guard leaves a stain
function hurtGuard(list, j, amount) {
  const g = list[j];
  g.flash = 0.15;
  g.hp -= amount;
  if (g.hp <= 0) {
    list.splice(j, 1);
    giveCoins();
    // he leaves a paint stain where he stood (yellow guard: yellow, red guard: red)
    if (list === guards) paintStain(g.surface, g.x + g.w / 2, 'yellow');
    else paintStain(g.platform, g.x + g.w / 2, 'red');
  }
}
function hurtGhost(amount) {
  if (ghost.dead) return;
  ghost.flash = 0.15;
  ghost.hp -= amount;
  if (ghost.hp <= 0) { ghost.dead = true; ghost.dying = GHOST_DYING; giveCoins(); }
}
const ghostHittable = () => ghost.active && !ghost.dead && ghost.age >= GHOST_FADE;

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    let hit = false;
    if (ghost.active && !ghost.dead && ghost.age >= GHOST_FADE) {   // bullets destroy subject 394 after 8 hits
      const gb = ghostBox();
      if (b.x + b.w / 2 > gb.x && b.x - b.w / 2 < gb.x + gb.w && b.y + b.h / 2 > gb.y && b.y - b.h / 2 < gb.y + gb.h) {
        hit = true;
        hurtGhost(damage());
      }
    }
    for (const list of [guards, redGuards]) {
      for (let j = list.length - 1; j >= 0 && !hit; j--) {
        const g = list[j], hb = guardHitbox(g);
        if (b.x + b.w / 2 > hb.x && b.x - b.w / 2 < hb.x + hb.w && b.y + b.h / 2 > hb.y && b.y - b.h / 2 < hb.y + hb.h) {
          hit = true;
          if (has(8)) g.hitSlow = 0.05;           // Sticky Paint
          hurtGuard(list, j, damage());
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
  const wasOnGround = player.onGround, fallSpeed = player.vy;
  updateBullets(dt);
  updateSpawner(dt);
  updateGuards(dt);
  updateRedGuards(dt);
  updateGhost(dt);
  if (charId() === '0300') updateBrushMoves(dt);
  updateHealth(dt);
  if (has(1) && hearts > 0 && (regenTimer += dt) >= 60) { regenTimer = 0; healHeart(); }

  const dir = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  // speed eases up and down instead of jumping straight to full speed
  const wantVx = dir * moveSpeed();
  const accel = (dir ? ACCEL : DECEL) * dt;
  player.vx += Math.max(-accel, Math.min(accel, wantVx - player.vx));
  if (dir) player.facing = dir;

  if (keys.ArrowUp && player.onGround) {
    player.vy = -jumpSpeed();
    player.onGround = false;
    vis.jump = 1;
  }

  const prevBottom = player.y + player.h;
  const prevHead = player.y;
  player.vy += (player.vy < 0 ? gravityUp() : gravityDown()) * dt;
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

  if (!wasOnGround && player.onGround) vis.land = Math.min(1, fallSpeed / 700);   // landing squash, bigger for a harder landing

  // walking = actually moving along a surface (not standing, not in the air, not pushing on a wall)
  const walking = player.onGround && Math.abs(player.x - startX) > 0.01;
  player.walkTime = walking ? player.walkTime + dt : 0;
  player.idleTime = !walking && player.onGround ? player.idleTime + dt : 0;   // restarts on the base drawing after a walk or a jump
}

// A button drawing; it grows a little while the pointer is over it.
function drawButton(img, r, hovered) {
  const grow = hovered ? 1.06 : 1;
  const w = r.w * grow, h = r.h * grow;
  ctx.drawImage(img, r.x - (w - r.w) / 2, r.y - (h - r.h) / 2, w, h);
}


// where the cards on offer are on screen
function offerRects() {
  const n = save.offers.length, startX = (W - (n * CARD_W + (n - 1) * CARD_GAP)) / 2;
  return save.offers.map((id, i) => ({ id, x: startX + i * (CARD_W + CARD_GAP), y: CARD_Y, w: CARD_W, h: CARD_H }));
}

function buyOffer(i) {
  const up = UPGRADES.find(u => u.id === save.offers[i]);
  if (!up || owns(up.id)) return;
  if (save.coins < up.cost) { Object.assign(shopMsg, { text: 'Not enough coins', t: 1.8, good: false }); return; }
  save.coins -= up.cost;
  save.owned.push(up.id);
  const auto = save.equipped.length < MAX_EQUIPPED;   // a free slot: the new card is equipped straight away
  if (auto) save.equipped.push(up.id);
  writeSave();
  Object.assign(shopMsg, { text: 'You bought ' + up.name + '!' + (auto ? ' (equipped)' : ' Equip it in CARDS'), t: 2.2, good: true });
}

function drawText(str, x, y, size, color, font, align, shadow) {
  ctx.font = font.startsWith('bold ') ? `bold ${size}px ${font.slice(5)}` : `${size}px ${font}`;
  ctx.textAlign = align || 'center';
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(str, x + 3, y + 3); }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function wrapLines(str, maxW) {
  const lines = []; let line = '';
  for (const word of str.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// a black and blue card with a picture in the white square at the top, like a trading card
function drawCard(up, x, y, hovered, scale = 1, overlay = null) {
  const owned = !!overlay, canPay = save.coins >= up.cost;
  ctx.save();
  ctx.translate(x + CARD_W * scale / 2, y + CARD_H * scale / 2);
  const grow = hovered && !owned ? 1.05 : 1;
  ctx.scale(scale * grow, scale * grow);
  ctx.translate(-CARD_W / 2, -CARD_H / 2);
  ctx.drawImage(cardFrameImg, 0, 0, CARD_W, CARD_H);
  ctx.drawImage(upgradeImgs[up.id], 60, 46, 180, 180);
  drawText(up.name, 150, 270, 23, '#ffd21f', TITLE_FONT, 'center', '#000');
  ctx.font = `bold 14px ${BODY_FONT}`;
  wrapLines(up.desc, 226).slice(0, 5).forEach((ln, i) => drawText(ln, 150, 296 + i * 18, 14, '#fff', 'bold ' + BODY_FONT, 'center'));
  ctx.drawImage(coinImg, 98, 378, 32, 32);
  drawText(String(up.cost), 140, 405, 26, canPay || owned ? '#ffd21f' : '#ff7a6a', 'bold ' + BODY_FONT, 'left');
  if (owned) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.translate(CARD_W / 2, CARD_H / 2);
    ctx.rotate(-0.2);
    drawText(overlay, 0, 12, overlay.length > 6 ? 40 : 52, '#fff', TITLE_FONT, 'center', '#000');
  }
  ctx.restore();
}

function drawShop(dt) {
  ensureOffers();
  ctx.drawImage(menuBgImg, 0, 300, W, 400, 0, 0, W, H);   // just the stripes, not the DRAWSHOT title
  ctx.fillStyle = 'rgba(6,3,14,0.78)';
  ctx.fillRect(0, 0, W, H);
  drawText('SHOP', W / 2, 78, 64, '#e2820a', TITLE_FONT, 'center', '#000');
  const left = offerSecondsLeft();
  drawText(`New upgrades in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, W / 2, 108, 18, '#cdbfae', 'bold ' + BODY_FONT, 'center');
  ctx.drawImage(coinImg, W - 168, 34, 38, 38);
  drawText(String(save.coins), W - 122, 64, 32, '#ffd21f', 'bold ' + BODY_FONT, 'left', '#000');
  const rs = offerRects();
  if (!rs.length) drawText('Everything is sold out!', W / 2, 340, 34, '#fff', TITLE_FONT, 'center', '#000');
  rs.forEach((r, i) => drawCard(UPGRADES.find(u => u.id === r.id), r.x, r.y, hoverBtn === 'card' + i, 1, owns(r.id) ? 'OWNED' : null));
  shopMsg.t = Math.max(0, shopMsg.t - dt);
  if (shopMsg.t > 0) {
    ctx.globalAlpha = Math.min(1, shopMsg.t * 2);
    drawText(shopMsg.text, W / 2, 618, 28, shopMsg.good ? '#8dff7a' : '#ff7a6a', 'bold ' + BODY_FONT, 'center', '#000');
    ctx.globalAlpha = 1;
  }
  drawButton(menuBackImg, shopMenuBtn, hoverBtn === 'menu');
}

// --- Accounts: username + password, kept on Supabase ----------------------------
// Supabase logs in with an e-mail address, so the username is turned into a made-up one
// (name@drawshot.game). The player never sees it and never has to give a real e-mail address.
async function supa(path, { method = 'GET', body, token, headers = {} } = {}) {
  const h = { apikey: SUPA_KEY, 'Content-Type': 'application/json', ...headers };
  if (token) h.Authorization = 'Bearer ' + token;
  const res = await fetch(SUPA_URL + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty answer */ }
  return { ok: res.ok, status: res.status, data };
}

const Auth = {
  email: name => name.toLowerCase() + '@drawshot.game',
  check(name, pw) {
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return 'Username: 3-16 letters, numbers or _';
    if (pw.length < 6) return 'Password: at least 6 characters';
    return null;
  },
  setSession(d, name) {
    const shown = (d.user && d.user.user_metadata && d.user.user_metadata.username) || name;
    session = { name: shown, uid: d.user.id, access: d.access_token, refresh: d.refresh_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
    user = session.name;
    store.set(SESSION_KEY, JSON.stringify(session));
  },
  async token() {   // a valid access token, refreshed when it is about to run out
    if (!session) return null;
    if (Date.now() > session.exp - 60000) {
      const r = await supa('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh } });
      if (!r.ok) return null;
      this.setSession({ ...r.data, user: r.data.user || { id: session.uid } }, session.name);
    }
    return session.access;
  },
  async push() {   // my progress to the server
    const token = await this.token(); if (!token) return;
    await supa('/rest/v1/saves?on_conflict=user_id', { method: 'POST', token, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: { user_id: session.uid, data: save, updated_at: new Date().toISOString() } });
  },
  async pull() {   // the progress from the server (if there is any) replaces what is on this device
    const token = await this.token(); if (!token) return;
    const r = await supa('/rest/v1/saves?select=data&user_id=eq.' + session.uid, { token });
    if (!r.ok) return;
    if (Array.isArray(r.data) && r.data.length) { loadSave(JSON.stringify(r.data[0].data)); store.set(saveKey(), JSON.stringify(save)); }
    else await this.push();
  },
  async register(name, pw) {
    const bad = this.check(name, pw); if (bad) return bad;
    let r;
    try { r = await supa('/auth/v1/signup', { method: 'POST', body: { email: this.email(name), password: pw, data: { username: name } } }); }
    catch (e) { return 'Cannot reach the server'; }
    if (!r.ok) {
      const text = JSON.stringify(r.data || '').toLowerCase();
      return text.includes('already') ? 'That username is taken' : ((r.data && (r.data.msg || r.data.message)) || 'Could not create the account');
    }
    if (!r.data || !r.data.access_token) return 'Supabase still wants e-mail confirmation: switch "Confirm email" off';
    this.setSession(r.data, name);
    applyPerks();
    store.set(saveKey(), JSON.stringify(save));   // the new account starts with what you earned as a guest
    await this.push();
    return null;
  },
  async login(name, pw) {
    const bad = this.check(name, pw); if (bad) return 'Wrong username or password';
    let r;
    try { r = await supa('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: this.email(name), password: pw } }); }
    catch (e) { return 'Cannot reach the server'; }
    if (!r.ok) return r.status >= 500 ? 'The server has a problem, try again' : 'Wrong username or password';
    this.setSession(r.data, name);
    loadSave(store.get(saveKey()));
    try { await this.pull(); } catch (e) { /* offline: the copy on this device is used */ }
    return null;
  },
  logout() {
    const token = session && session.access;
    if (token) supa('/auth/v1/logout', { method: 'POST', token }).catch(() => {});
    session = null; user = null; store.del(SESSION_KEY);
    loadSave(store.get(SAVE_KEY));
  },
};
if (session) Auth.pull().catch(() => {});   // already logged in from last time: fetch the latest progress

const loginBox = (() => {
  const css = (el, o) => Object.assign(el.style, o);
  const box = document.createElement('div');
  css(box, { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(340px, 88vw)', padding: '22px 22px 18px', background: '#14102a', border: '5px solid #000', borderRadius: '14px', boxShadow: '0 0 0 4px #2b6cff', color: '#fff', font: 'bold 16px "Trebuchet MS", system-ui, sans-serif', display: 'none', zIndex: 20, textAlign: 'center' });
  const title = document.createElement('div');
  css(title, { font: '34px Rye, Georgia, serif', color: '#e2820a', textShadow: '3px 3px 0 #000', marginBottom: '12px' });
  const mk = (type, ph) => { const i = document.createElement('input'); i.type = type; i.placeholder = ph; css(i, { display: 'block', width: '100%', boxSizing: 'border-box', margin: '8px 0', padding: '10px', font: 'inherit', background: '#fff', color: '#000', border: '3px solid #000', borderRadius: '8px' }); return i; };
  const nameIn = mk('text', 'Username'), passIn = mk('password', 'Password');
  nameIn.autocomplete = 'username'; passIn.autocomplete = 'current-password'; nameIn.maxLength = 16;
  const msg = document.createElement('div');
  css(msg, { minHeight: '22px', margin: '6px 0', color: '#ff7a6a' });
  const btn = (label, bg) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; css(b, { font: 'inherit', padding: '10px 14px', margin: '4px', background: bg, color: '#000', border: '3px solid #000', borderRadius: '8px', cursor: 'pointer' }); return b; };
  const loginB = btn('LOG IN', '#f7cd00'), regB = btn('CREATE ACCOUNT', '#9ad0ff'), outB = btn('LOG OUT', '#f7cd00'), closeB = btn('BACK', '#fff');
  const who = document.createElement('div'); css(who, { margin: '10px 0 14px', fontSize: '20px' });
  box.append(title, who, nameIn, passIn, msg, loginB, regB, outB, closeB);
  document.body.appendChild(box);
  const show = () => {
    const on = !!user;
    title.textContent = 'LOGIN';
    who.textContent = on ? 'Logged in as ' + user : 'Playing as guest';
    for (const el of [nameIn, passIn, loginB, regB]) el.style.display = on ? 'none' : (el.tagName === 'INPUT' ? 'block' : 'inline-block');
    outB.style.display = on ? 'inline-block' : 'none';
    msg.textContent = '';
  };
  async function run(fn) {
    msg.style.color = '#cdbfae'; msg.textContent = 'One moment...';
    for (const el of [loginB, regB]) el.disabled = true;
    const err = await fn(nameIn.value.trim(), passIn.value).catch(() => 'Something went wrong, try again');
    for (const el of [loginB, regB]) el.disabled = false;
    if (err) { msg.style.color = '#ff7a6a'; msg.textContent = err; return; }
    passIn.value = ''; show();
    msg.style.color = '#8dff7a'; msg.textContent = 'Welcome, ' + user + '!';
    who.textContent = 'Logged in as ' + user;
  }
  loginB.onclick = () => run((n, p) => Auth.login(n, p));
  regB.onclick = () => run((n, p) => Auth.register(n, p));
  outB.onclick = () => { Auth.logout(); show(); };
  closeB.onclick = () => { box.style.display = 'none'; inLogin = false; };
  box.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !user) loginB.click(); if (e.key === 'Escape') closeB.click(); });
  return { open() { show(); box.style.display = 'block'; nameIn.focus(); }, el: box };
})();
function openLogin() { inLogin = true; loginBox.open(); }

// the cards screen: 3 big slots on top, everything you own below
const SLOT_SCALE = 0.62, OWN_SCALE = 0.4, SLOT_GAP = 30;
function cardsLayout() {
  const sw = CARD_W * SLOT_SCALE, sh = CARD_H * SLOT_SCALE, sx = (W - (MAX_EQUIPPED * sw + (MAX_EQUIPPED - 1) * SLOT_GAP)) / 2;
  const slots = save.equipped.length >= 0 ? Array.from({ length: MAX_EQUIPPED }, (_, i) => ({ id: save.equipped[i] || null, x: sx + i * (sw + SLOT_GAP), y: 112, w: sw, h: sh })) : [];
  const ow = CARD_W * OWN_SCALE, oh = CARD_H * OWN_SCALE, n = save.owned.length, ox = (W - (n * ow + (n - 1) * 10)) / 2;
  const own = save.owned.map((id, i) => ({ id, x: ox + i * (ow + 10), y: 428, w: ow, h: oh }));
  return { slots, own };
}

function drawCards(dt) {
  ctx.drawImage(menuBgImg, 0, 300, W, 400, 0, 0, W, H);
  ctx.fillStyle = 'rgba(6,3,14,0.78)';
  ctx.fillRect(0, 0, W, H);
  drawText('CARDS', W / 2, 78, 64, '#e2820a', TITLE_FONT, 'center', '#000');
  if (charId() === '0300') drawText('These cards do not work for SUBJECT 0300 yet', W / 2, 106, 18, '#ff9a4a', 'bold ' + BODY_FONT, 'center', '#000');
  const lay = cardsLayout();
  lay.slots.forEach((r, i) => {
    if (r.id) { drawCard(UPGRADES.find(u => u.id === r.id), r.x, r.y, hoverBtn === 'slot' + i, SLOT_SCALE); return; }
    ctx.save();
    ctx.strokeStyle = '#6d6a86'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    drawText('EMPTY', r.x + r.w / 2, r.y + r.h / 2 + 10, 28, '#6d6a86', TITLE_FONT, 'center');
  });
  drawText(`Equipped ${save.equipped.length} / ${MAX_EQUIPPED}`, 40, 416, 20, '#cdbfae', 'bold ' + BODY_FONT, 'left');
  shopMsg.t = Math.max(0, shopMsg.t - dt);
  if (shopMsg.t > 0) {
    ctx.globalAlpha = Math.min(1, shopMsg.t * 2);
    drawText(shopMsg.text, W / 2, 416, 22, shopMsg.good ? '#8dff7a' : '#ff7a6a', 'bold ' + BODY_FONT, 'center', '#000');
    ctx.globalAlpha = 1;
  }
  if (!lay.own.length) drawText('No cards yet: buy some in the SHOP!', W / 2, 520, 28, '#fff', TITLE_FONT, 'center', '#000');
  let info = null;
  lay.own.forEach((r, i) => {
    const up = UPGRADES.find(u => u.id === r.id), eq = has(r.id), hov = hoverBtn === 'own' + i;
    if (hov) info = up;
    drawCard(up, r.x, r.y, hov, OWN_SCALE, eq ? 'EQUIPPED' : null);
  });
  if (!info) { const h = hoverBtn && hoverBtn.startsWith('slot') ? lay.slots[Number(hoverBtn.slice(4))].id : null; if (h) info = UPGRADES.find(u => u.id === h); }
  if (info) {
    drawText(info.name, 40, 652, 24, '#ffd21f', TITLE_FONT, 'left', '#000');
    ctx.font = `bold 16px ${BODY_FONT}`;
    wrapLines(info.desc, 880).forEach((ln, i) => drawText(ln, 40, 678 + i * 20, 16, '#fff', 'bold ' + BODY_FONT, 'left'));
  } else if (lay.own.length) drawText('Tap a card to equip it or take it off', 40, 662, 18, '#9d9ab8', 'bold ' + BODY_FONT, 'left');
  drawButton(menuBackImg, shopMenuBtn, hoverBtn === 'menu');
}

// --- the character screen: pick who you play, tap a character to read what he does ---
const CHAR_INFO = {
  '0005': {
    about: 'Two paint guns, one on each side.',
    controls: ['<- ->  walk', 'UP  jump', '1  fire the left gun', '2  fire the right gun'],
    attacks: ['Paint bullets: 1 damage each, one shot per press (0.2 s between shots per gun).', 'Your equipped upgrade cards work for him.'],
  },
  '0300': {
    about: 'A little black man with a giant brush and a round shield.',
    controls: ['<- ->  walk (leaves an ink trail)', 'UP  jump', '1  swing the giant brush', '2  raise the shield'],
    attacks: [
      'Brush swing: 3 damage to every enemy in front of you, in the direction you look. It cannot reach through platforms. 0.75 s before you can swing again.',
      'Ink trail: walking leaves a zigzag ink trail. Enemies on it take 1 damage (once every 0.5 s each). Every piece of the trail is gone after 1 second.',
      'Shield: blocks red guard bullets that come from the side you look at. Block in the first 0.2 s after raising it and it is a PERFECT block: the bullet flies back and does its damage to the enemy. Yellow guards and subject 394 walk through a normal block, but a PERFECT block works on them too: you take no damage and they take the damage they would have done (1 for a yellow guard, 2 for subject 394).',
      'Upgrade cards do not work for him yet.',
    ],
  },
};
const CHAR_CARD = { w: 220, h: 320, gap: 24, x: 56, y: 118 };
function charsLayout() {
  const cards = CHARACTERS.map((c, i) => ({ id: c.id, x: CHAR_CARD.x + i * (CHAR_CARD.w + CHAR_CARD.gap), y: CHAR_CARD.y, w: CHAR_CARD.w, h: CHAR_CARD.h }));
  return { cards, info: { x: 56 + CHARACTERS.length * (CHAR_CARD.w + CHAR_CARD.gap) + 8, y: 118, w: 0, h: 480 }, equip: { x: 0, y: 0, w: 230, h: 60 } };
}
function drawChars() {
  ctx.drawImage(menuBgImg, 0, 300, W, 400, 0, 0, W, H);
  ctx.fillStyle = 'rgba(6,3,14,0.78)';
  ctx.fillRect(0, 0, W, H);
  drawText('CHARACTERS', W / 2, 78, 60, '#e2820a', TITLE_FONT, 'center', '#000');
  const lay = charsLayout();
  lay.info.w = W - 56 - lay.info.x;
  lay.equip.x = CHAR_CARD.x; lay.equip.y = CHAR_CARD.y + CHAR_CARD.h + 22; lay.equip.w = CHARACTERS.length * CHAR_CARD.w + (CHARACTERS.length - 1) * CHAR_CARD.gap;   // under the characters
  chars.equipRect = lay.equip;
  lay.cards.forEach((r, i) => {
    const unlocked = characterUnlocked(r.id), sel = viewChar === r.id, equipped = charId() === r.id, hov = hoverBtn === 'cc' + i;
    ctx.save();
    ctx.fillStyle = sel ? 'rgba(20,40,110,0.85)' : 'rgba(12,8,22,0.8)';
    ctx.strokeStyle = sel ? '#4a8bff' : '#000'; ctx.lineWidth = sel ? 6 : 5;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();
    const img = r.id === '0300' ? manCardImg : bodyImg0005, ih = 190, iw = ih * img.width / img.height;
    ctx.globalAlpha = unlocked ? 1 : 0.35;
    ctx.drawImage(img, r.x + (r.w - iw) / 2, r.y + 22 + (hov ? -4 : 0), iw, ih);
    ctx.globalAlpha = 1;
    drawText('SUBJECT', r.x + r.w / 2, r.y + 252, 18, '#fff', TITLE_FONT, 'center', '#000');
    drawText(r.id, r.x + r.w / 2, r.y + 284, 30, '#ffd21f', TITLE_FONT, 'center', '#000');
    if (!unlocked) {
      const c = CHARACTERS.find(c => c.id === r.id);
      drawText('UNLOCK BY', r.x + r.w / 2, r.y + 112, 24, '#ff7a6a', TITLE_FONT, 'center', '#000');
      drawText('LEVEL ' + c.unlockLevel, r.x + r.w / 2, r.y + 144, 28, '#ff7a6a', TITLE_FONT, 'center', '#000');
    }
    if (equipped) drawText('EQUIPPED', r.x + r.w / 2, r.y + 312, 15, '#8dff7a', 'bold ' + BODY_FONT, 'center', '#000');
    ctx.restore();
  });
  const info = CHAR_INFO[viewChar], c = CHARACTERS.find(c => c.id === viewChar);
  ctx.fillStyle = 'rgba(12,8,22,0.8)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(lay.info.x, lay.info.y, lay.info.w, lay.info.h, 16); ctx.fill(); ctx.stroke();
  const x = lay.info.x + 24; let y = lay.info.y + 44;
  drawText(c.name, x, y, 30, '#ffd21f', TITLE_FONT, 'left', '#000'); y += 28;
  ctx.font = `bold 16px ${BODY_FONT}`;
  drawText(info.about, x, y, 16, '#cdbfae', 'bold ' + BODY_FONT, 'left'); y += 32;
  drawText('BUTTONS', x, y, 15, '#4a8bff', 'bold ' + BODY_FONT, 'left'); y += 22;
  info.controls.forEach(t => { drawText(t, x + 8, y, 16, '#fff', 'bold ' + BODY_FONT, 'left'); y += 21; });
  y += 10;
  drawText('ATTACKS', x, y, 15, '#4a8bff', 'bold ' + BODY_FONT, 'left'); y += 22;
  ctx.font = `bold 15px ${BODY_FONT}`;
  info.attacks.forEach(t => { wrapLines(t, lay.info.w - 56).forEach((ln, i) => { drawText((i === 0 ? '- ' : '   ') + ln, x + 8, y, 15, '#fff', 'bold ' + BODY_FONT, 'left'); y += 19; }); y += 5; });
  const eq = charId() === viewChar, un = characterUnlocked(viewChar), er = lay.equip;
  ctx.save();
  ctx.fillStyle = eq ? '#3a8a3a' : un ? (hoverBtn === 'equipchar' ? '#ffe25a' : '#f7cd00') : '#555';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(er.x, er.y, er.w, er.h, 14); ctx.fill(); ctx.stroke();
  ctx.restore();
  drawText(eq ? 'EQUIPPED' : un ? 'EQUIP' : 'UNLOCK BY LEVEL ' + c.unlockLevel, er.x + er.w / 2, er.y + 40, un ? 26 : 22, eq ? '#fff' : '#2e1008', TITLE_FONT, 'center');
  drawButton(menuBackImg, shopMenuBtn, hoverBtn === 'menu');
}
const chars = { equipRect: null };

// pointer position in game (canvas) pixels
function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
const inRect = (m, r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;

// which button (if any) is under the pointer on the current screen
function buttonAt(e) {
  const m = pointerPos(e);
  if (inLogin) return null;
  if (inChars) {
    if (inRect(m, shopMenuBtn)) return 'menu';
    if (chars.equipRect && inRect(m, chars.equipRect)) return 'equipchar';
    const lay = charsLayout();
    for (let i = 0; i < lay.cards.length; i++) if (inRect(m, lay.cards[i])) return 'cc' + i;
    return null;
  }
  if (inCards) {
    if (inRect(m, shopMenuBtn)) return 'menu';
    const lay = cardsLayout();
    for (let i = 0; i < lay.slots.length; i++) if (lay.slots[i].id && inRect(m, lay.slots[i])) return 'slot' + i;
    for (let i = 0; i < lay.own.length; i++) if (inRect(m, lay.own[i])) return 'own' + i;
    return null;
  }
  if (inShop) {
    if (inRect(m, shopMenuBtn)) return 'menu';
    const rs = offerRects();
    for (let i = 0; i < rs.length; i++) if (inRect(m, rs[i])) return 'card' + i;
    return null;
  }
  if (inMenu) return inRect(m, playBtn) ? 'play' : inRect(m, shopBtn) ? 'shop' : inRect(m, cardsBtn) ? 'cards' : inRect(m, loginBtn) ? 'login' : inRect(m, equipBtn) ? 'equip' : null;
  if (levelComplete) return inRect(m, lcMenuBtn) ? 'menu' : inRect(m, lcShopBtn) ? 'shop' : inRect(m, lcCardsBtn) ? 'cards' : inRect(m, lcNextBtn) ? 'next' : null;
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
  if (id === 'shop') { openShop(); hoverBtn = null; }
  if (id === 'cards') { openCards(); hoverBtn = null; }
  if (id === 'next') { restart(); inMenu = false; hoverBtn = null; }
  if (id === 'login') { openLogin(); hoverBtn = null; }
  if (id === 'equip') { openChars(); hoverBtn = null; }
  if (id && id.startsWith('cc')) viewChar = CHARACTERS[Number(id.slice(2))].id;
  if (id === 'equipchar' && characterUnlocked(viewChar)) { save.character = viewChar; writeSave(); applyCharacter(); }
  if (id && id.startsWith('slot')) toggleEquip(cardsLayout().slots[Number(id.slice(4))].id);
  if (id && id.startsWith('own')) toggleEquip(cardsLayout().own[Number(id.slice(3))].id);
  if (id && id.startsWith('card')) buyOffer(Number(id.slice(4)));
});

(async function main() {
  initAudio();   // starts silent until the first click or key press
  const [bg, sprite, platSprite, groundSprite, wallL, wallR, ceilSprite, gunL, gunR, guardL, guardR, heartImg, gameOverImg, menuImg, menuBtnImg, playBtnImg, playAgainImg, redGuardImg, redGunImg, redBulletImg, stainYellowImg, stainRedImg, platGreenImg, groundGreenImg, walk1Img, walk2Img, idleBaseImg, idleLowImg, idleHighImg, levelCompleteImg] = await Promise.all(
    ['background', 'player', 'platform', 'ground', 'wall-left', 'wall-right', 'ceiling', 'gun-left', 'gun-right', 'guard-left', 'guard-right', 'heart', 'game-over', 'menu', 'menu-button', 'play-button', 'play-again-button', 'red-guard', 'red-gun', 'red-bullet', 'stain-yellow', 'stain-red', 'platform-green', 'ground-green', 'player-walk-1', 'player-walk-2', 'player-idle-base', 'player-idle-low', 'player-idle-high', 'level-complete'].map(n => load(assetUrl(n))));
  const bulletNames = { left: ['bullet-l-1', 'bullet-l-2', 'bullet-l-3'], right: ['bullet-r-1', 'bullet-r-2', 'bullet-r-3'] };
  for (const side of ['left', 'right']) bulletSprites[side] = await Promise.all(bulletNames[side].map(n => load(assetUrl(n))));
  player.h = PLAYER_H;
  bodyImg0005 = sprite;
  applyCharacter();
  const gunLW = gun.lw = Math.round(gunL.width * GUN_H / gunL.height);
  const gunRW = gun.rw = Math.round(gunR.width * GUN_H / gunR.height);
  player.y = GROUND_Y - player.h;

  menuBgImg = menuImg; menuBackImg = menuBtnImg;
  [shopBtnImg, cardFrameImg, coinImg, cardsBtnImg, loginBtnImg, nextBtnImg, ghostImg, brushImg, shieldImg, equipBtnImg, manIdleImg, manWalk1Img, manWalk2Img, manCardImg, manUpImg, manApexImg, manFallImg] = await Promise.all(['shop-button', 'card-frame', 'coin', 'cards-button', 'login-button', 'next-button', 'subject-394', 'brush-0300', 'shield-0300', 'equip-button', 'man-0300-idle', 'man-0300-walk-1', 'man-0300-walk-2', 'man-0300-card', 'man-0300-jump-up', 'man-0300-jump-apex', 'man-0300-jump-fall'].map(n => load(assetUrl(n))));
  for (const u of UPGRADES) upgradeImgs[u.id] = await load(assetUrl('upgrade-' + u.id));
  if (document.fonts) document.fonts.load('24px Rye').catch(() => {});
  // game over: PLAY AGAIN exactly in the middle of the screen, MENU just above it
  const againW = 300, againH = Math.round(againW * playAgainImg.height / playAgainImg.width);
  Object.assign(againBtn, { x: (W - againW) / 2, y: (H - againH) / 2, w: againW, h: againH });
  menuBtn.w = 240;
  menuBtn.h = Math.round(menuBtn.w * menuBtnImg.height / menuBtnImg.width);
  menuBtn.x = (W - menuBtn.w) / 2;
  menuBtn.y = againBtn.y - menuBtn.h - 10;
  const lcW = 230;                          // level completed: MENU to the right of the face
  Object.assign(lcMenuBtn, { x: W - lcW - 70, y: 500, w: lcW, h: Math.round(lcW * menuBtnImg.height / menuBtnImg.width) });
  const playW = 260;                        // menu: PLAY, smaller and higher up
  Object.assign(playBtn, { x: (W - playW) / 2, y: 270, w: playW, h: Math.round(playW * playBtnImg.height / playBtnImg.width) });
  {
    const sw = 220, sh = Math.round(sw * shopBtnImg.height / shopBtnImg.width);
    Object.assign(shopBtn, { x: (W - sw) / 2, y: playBtn.y + playBtn.h + 14, w: sw, h: sh });
    Object.assign(lcShopBtn, { x: lcMenuBtn.x, y: lcMenuBtn.y - sh - 12, w: lcMenuBtn.w, h: Math.round(lcMenuBtn.w * shopBtnImg.height / shopBtnImg.width) });
    lcShopBtn.y = lcMenuBtn.y - lcShopBtn.h - 12;
    const cw = 200, ch = Math.round(cw * cardsBtnImg.height / cardsBtnImg.width);
    Object.assign(cardsBtn, { x: (W - cw) / 2, y: shopBtn.y + shopBtn.h + 10, w: cw, h: ch });
    Object.assign(lcCardsBtn, { x: lcShopBtn.x, y: lcShopBtn.y - ch - 12, w: lcShopBtn.w, h: Math.round(lcShopBtn.w * cardsBtnImg.height / cardsBtnImg.width) });
    lcCardsBtn.y = lcShopBtn.y - lcCardsBtn.h - 12;
    Object.assign(lcNextBtn, { x: lcCardsBtn.x, y: 0, w: lcCardsBtn.w, h: Math.round(lcCardsBtn.w * nextBtnImg.height / nextBtnImg.width) });
    lcNextBtn.y = lcCardsBtn.y - lcNextBtn.h - 12;
    const ew = 150;
    const lw = 150;
    Object.assign(loginBtn, { x: W - lw - 24, y: 18, w: lw, h: Math.round(lw * loginBtnImg.height / loginBtnImg.width) });
    Object.assign(equipBtn, { x: W - ew - 24, y: loginBtn.y + loginBtn.h + 36, w: ew, h: Math.round(ew * equipBtnImg.height / equipBtnImg.width) });
    Object.assign(shopMenuBtn, { x: W - 250 - 30, y: H - Math.round(250 * menuBtnImg.height / menuBtnImg.width) - 16, w: 250, h: Math.round(250 * menuBtnImg.height / menuBtnImg.width) });
  }


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
    if (inChars) {
      drawChars();
      requestAnimationFrame(frame);
      return;
    }
    if (inCards) {
      drawCards(dt);
      requestAnimationFrame(frame);
      return;
    }
    if (inShop) {
      drawShop(dt);
      requestAnimationFrame(frame);
      return;
    }
    if (inMenu) {
      ctx.drawImage(menuImg, 0, 0, W, H);
      drawText('LEVEL ' + levelNo(), W / 2, 250, 28, '#fff', TITLE_FONT, 'center', '#000');
      drawButton(playBtnImg, playBtn, hoverBtn === 'play');
      drawButton(shopBtnImg, shopBtn, hoverBtn === 'shop');
      drawButton(cardsBtnImg, cardsBtn, hoverBtn === 'cards');
      drawButton(loginBtnImg, loginBtn, hoverBtn === 'login');
      drawButton(equipBtnImg, equipBtn, hoverBtn === 'equip');
      if (user) drawText(user, loginBtn.x + loginBtn.w / 2, loginBtn.y + loginBtn.h + 24, 20, '#fff', 'bold ' + BODY_FONT, 'center', '#000');
      requestAnimationFrame(frame);
      return;
    }
    if (!gameOver && !levelComplete) {
      update(dt);
      // every surface painted: level completed (after a moment, and not if you just died)
      if (hearts > 0 && Object.keys(PAINT_SURFACES).every(isPainted)) {
        completeTimer += dt;
        if (completeTimer > 1.2) { levelComplete = true; save.level = levelNo() + 1; writeSave(); }   // on to the next level
      }
    }

    // The camera glides after the player instead of being glued to him (it snaps on a fresh start).
    const wantX = Math.max(0, Math.min(WORLD_W - VIEW_W, player.x + player.w / 2 - VIEW_W / 2));
    const wantY = Math.max(0, Math.min(WORLD_H - VIEW_H, player.y + player.h / 2 - VIEW_H / 2));
    if (cam.x === null) { cam.x = wantX; cam.y = wantY; }
    const follow = 1 - Math.exp(-dt * 9);
    cam.x += (wantX - cam.x) * follow;
    cam.y += (wantY - cam.y) * follow;
    const camX = cam.x, camY = cam.y;

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
    // --- smooth movement of the drawing (see `vis`) ---
    vis.tilt += ((player.vx / MOVE_SPEED) * 0.08 * (player.onGround ? 1 : 0.6) - vis.tilt) * (1 - Math.exp(-dt * 14));
    vis.land *= Math.exp(-dt * 11);
    vis.jump *= Math.exp(-dt * 9);
    // in the air: stretched while he rises or falls fast, a little squashed and wide at the top of the jump
    const airStretch = player.onGround ? 0 : Math.min(1, Math.abs(player.vy) / (JUMP_SPEED * 1.1)) * 0.16 - 0.05 * (1 - Math.min(1, Math.abs(player.vy) / 220));
    const breathe = player.walkTime === 0 && player.onGround ? 0.012 * Math.sin(performance.now() / 1000 * 2 * Math.PI / 2.4) : 0;
    const bodyScaleY = 1 + 0.1 * vis.jump + airStretch - 0.16 * vis.land + breathe;
    const bodyScaleX = Math.pow(bodyScaleY, -0.8);                        // squash and stretch keep the volume
    drawGhost();
    const isBrush = charId() === '0300';
    if (ink.length) {   // the ink trail (each piece fades out and is gone after 1 s)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const k of ink) {
        if (!k.prev) continue;
        ctx.globalAlpha = Math.min(1, k.life / 0.35) * 0.95;
        ctx.strokeStyle = '#141e6e'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(k.prev.x, k.prev.y); ctx.lineTo(k.x, k.y); ctx.stroke();
        ctx.strokeStyle = '#4a63ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(k.prev.x, k.prev.y - 1); ctx.lineTo(k.x, k.y - 1); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const sway = isBrush && player.walkTime === 0 && player.onGround ? Math.sin(performance.now() / 1000 * 1.7) * 0.02 : 0;   // he sways when he stands still
    const hop = player.walkTime > 0 ? -Math.abs(Math.sin(Math.PI * player.walkTime / WALK_FRAME_TIME)) * (isBrush ? 5 : 2.2) : 0;   // a small hop on every step
    const pivotX = player.x + player.w / 2, pivotY = player.y + player.h;   // everything pivots around his feet
    ctx.save();
    ctx.translate(pivotX, pivotY + hop);
    ctx.rotate(vis.tilt * (isBrush ? 2.2 : 1) + sway);
    ctx.scale(bodyScaleX, bodyScaleY);
    ctx.translate(-pivotX, -pivotY);
    // which drawing: walking swaps walk 1 / walk 2; standing cycles base, low, base, high
    const idleCycle = [idleBaseImg, idleLowImg, idleBaseImg, idleHighImg];
    if (!player.onGround) {
      // the jump: rising, hanging at the top, falling (SUBJECT 0005 uses his stretched / base / legs-apart drawings)
      const ph = player.vy < -170 ? 0 : player.vy > 170 ? 2 : 1;
      setPose(isBrush ? [manUpImg, manApexImg, manFallImg][ph] : [idleHighImg, idleBaseImg, walk2Img][ph], FADE_JUMP);
    } else if (player.walkTime > 0) setPose(Math.floor(player.walkTime / WALK_FRAME_TIME) % 2 === 0 ? (isBrush ? manWalk1Img : walk1Img) : (isBrush ? manWalk2Img : walk2Img), FADE_WALK);
    else setPose(isBrush ? manIdleImg : idleCycle[Math.floor(player.idleTime / IDLE_FRAME_TIME) % 4], FADE_IDLE);
    pose.fade = Math.min(1, pose.fade + dt / pose.fadeTime);
    const blink = invuln > 0 && Math.floor(invuln * 10) % 2 === 0;
    if (isBrush && !blink && swing.t <= 0) {
      // the little black man holds his brush behind him, leaning away from the side he faces (like in the logo)
      const f = player.facing || 1, bh = 126, bw = bh * brushImg.width / brushImg.height;
      ctx.save();
      ctx.translate(player.x + player.w / 2 - f * player.w * 0.42, player.y + player.h * 0.8);
      ctx.rotate(-f * 0.32 + Math.sin(performance.now() / 1000 * 2.3) * 0.03);
      ctx.drawImage(brushImg, -bw / 2, -bh, bw, bh);
      ctx.restore();
    }
    if (!blink) {
      if (pose.fade < 1 && pose.prev) {
        ctx.drawImage(pose.prev, player.x, player.y, player.w, player.h);
        ctx.globalAlpha = pose.fade * pose.fade * (3 - 2 * pose.fade);   // eased
        ctx.drawImage(pose.cur, player.x, player.y, player.w, player.h);
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(pose.cur, player.x, player.y, player.w, player.h);
      }
    }
    // Left gun on the left side, right gun on the right side of the character.
    const gunY = gunTop();
    if (!blink && !isBrush) {
      ctx.drawImage(gunL, player.x + GUN_GRIP - gunLW, gunY, gunLW, GUN_H);
      ctx.drawImage(gunR, player.x + player.w - GUN_GRIP, gunY, gunRW, GUN_H);
    }
    if (isBrush && !blink) {
      // SUBJECT 0300: the round shield on the side he faces
      vis.shield += ((player.facing || 1) - vis.shield) * (1 - Math.exp(-dt * 12));
      const up = shield.t > 0;   // raised: bigger and held out in front
      const sw = up ? 50 : 36, sh = sw * shieldImg.height / shieldImg.width;
      ctx.save();
      ctx.translate(player.x + player.w / 2 + vis.shield * (player.w / 2 + (up ? 20 : 7)), player.y + player.h * (up ? 0.5 : 0.62));
      if (shield.flash > 0) {   // a ring when something is blocked
        ctx.strokeStyle = shield.age <= PERFECT_WINDOW + 0.1 ? '#ffffff' : '#ffd21f'; ctx.lineWidth = 4; ctx.globalAlpha = shield.flash / 0.3;
        ctx.beginPath(); ctx.arc(0, 0, sw * 0.5 + (0.3 - shield.flash) * 90, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.rotate(vis.shield * 0.12 + Math.sin(performance.now() / 1000 * 2.1) * 0.03);
      ctx.scale(Math.max(0.3, Math.abs(vis.shield)), 1);
      ctx.drawImage(shieldImg, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();
    }
    ctx.restore();
    if (isBrush && swing.t > 0) {   // the giant brush swings over his head and down in front of him
      const p = 1 - swing.t / SWING_TIME, e = p * p * (3 - 2 * p), ang = swing.dir * (-1.1 + 2.9 * e);
      const bh = 162, bw = bh * brushImg.width / brushImg.height;
      ctx.save();
      ctx.translate(player.x + player.w / 2, player.y + player.h * 0.62);
      ctx.strokeStyle = '#4a63ff'; ctx.globalAlpha = 0.55 * (1 - p); ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath();
      if (swing.dir > 0) ctx.arc(0, 0, 115, -Math.PI / 2 - 1.1, -Math.PI / 2 + ang, false);
      else ctx.arc(0, 0, 115, -Math.PI / 2 + ang, -Math.PI / 2 + 1.1, false);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.rotate(ang);
      ctx.drawImage(brushImg, -bw / 2, -bh, bw, bh);
      ctx.restore();
    }
    for (const r of reflected) {   // bullets thrown back by a perfect block
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.angle);
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14;
      ctx.drawImage(redBulletImg, -r.w / 2, -r.h / 2, r.w, r.h);
      ctx.restore();
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
    for (let i = 0; i < maxHearts(); i++) {
      ctx.globalAlpha = i < hearts ? 1 : 0.18;
      ctx.drawImage(heartImg, 20 + i * (hw + 8), 18, hw, hh);
    }
    ctx.globalAlpha = 1;
    drawText('LEVEL ' + (levelComplete ? levelNo() - 1 : levelNo()), W / 2, 44, 26, '#fff', TITLE_FONT, 'center', '#000');
    ctx.drawImage(coinImg, 20, 64, 30, 30);
    drawText(String(save.coins), 58, 88, 26, '#ffd21f', 'bold ' + BODY_FONT, 'left', '#000');

    if (levelComplete) {
      ctx.drawImage(levelCompleteImg, 0, 0, W, H);
      const fresh = CHARACTERS.find(c => c.unlockLevel === levelNo());   // reaching this level just unlocked a character
      if (fresh && fresh.unlockLevel > 1) drawText('NEW CHARACTER UNLOCKED: ' + fresh.name, W / 2, 222, 26, '#ffd21f', TITLE_FONT, 'center', '#000');
      drawButton(menuBtnImg, lcMenuBtn, hoverBtn === 'menu');
      drawButton(shopBtnImg, lcShopBtn, hoverBtn === 'shop');
      drawButton(cardsBtnImg, lcCardsBtn, hoverBtn === 'cards');
      drawButton(nextBtnImg, lcNextBtn, hoverBtn === 'next');
    }
    if (gameOver) {
      ctx.drawImage(gameOverImg, 0, 0, W, H);
      drawButton(playAgainImg, againBtn, hoverBtn === 'again');
      drawButton(menuBtnImg, menuBtn, hoverBtn === 'menu');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
