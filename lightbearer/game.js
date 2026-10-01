import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

/* =========================================================================
   LIGHTBEARER - demo
   Top-down 3/4 camera (Death's Door style), dark cave, training dummies.
   ========================================================================= */

// ---------- tunables ----------------------------------------------------
const PARRY_WINDOW = 0.2;      // seconds after pressing block that count as a perfect parry
const PARRY_DAMAGE = 2;
const PARRY_STUN = 1.0;
const SLASH_DAMAGE = 1;
const MAX_LIVES = 3;
const CAM_YAW = THREE.MathUtils.degToRad(38);
const CAM_PITCH = THREE.MathUtils.degToRad(54);
const CAM_DIST = 31;
const TAU = Math.PI * 2;

const $ = (id) => document.getElementById(id);
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
let seed = 1337;
const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const srange = (a, b) => a + srand() * (b - a);

// ---------- renderer ----------------------------------------------------
const wrap = $('wrap');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
wrap.appendChild(renderer.domElement);
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03070a);
scene.fog = new THREE.FogExp2(0x061218, 0.014);

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 120);

const composer = new EffectComposer(
  renderer,
  new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 })
);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.65, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- procedural textures ----------------------------------------
function canvasTex(size, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function speckle(ctx, s, n, colors, maxR = 1.6) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.beginPath();
    ctx.arc(Math.random() * s, Math.random() * s, Math.random() * maxR + 0.3, 0, TAU);
    ctx.fill();
  }
}

const floorTex = canvasTex(1024, (ctx, s) => {
  ctx.fillStyle = '#4d5a5a'; ctx.fillRect(0, 0, s, s);
  let y = 0;
  while (y < s) {
    const rh = 100 + Math.random() * 60;
    let x = -Math.random() * 100;
    while (x < s) {
      const w = 110 + Math.random() * 100;
      const sh = 70 + Math.random() * 38;
      ctx.fillStyle = `rgb(${sh - 6},${sh + 8},${sh + 4})`;
      ctx.fillRect(x + 4, y + 4, w - 8, rh - 8);
      // soft bevel
      const g = ctx.createLinearGradient(x, y, x + w, y + rh);
      g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(0,0,0,.14)');
      ctx.fillStyle = g; ctx.fillRect(x + 4, y + 4, w - 8, rh - 8);
      x += w;
    }
    y += rh;
  }
  speckle(ctx, s, 2600, ['rgba(0,0,0,.12)', 'rgba(255,255,255,.06)', 'rgba(20,50,30,.2)']);
  for (let i = 0; i < 26; i++) {      // moss
    const x = Math.random() * s, yy = Math.random() * s, r = 40 + Math.random() * 90;
    const g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
    g.addColorStop(0, 'rgba(92,140,70,.5)'); g.addColorStop(1, 'rgba(92,140,70,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, yy - r, r * 2, r * 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2;   // cracks
  for (let i = 0; i < 22; i++) {
    let x = Math.random() * s, yy = Math.random() * s;
    ctx.beginPath(); ctx.moveTo(x, yy);
    for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 60; yy += (Math.random() - 0.5) * 60; ctx.lineTo(x, yy); }
    ctx.stroke();
  }
}, { repeat: true });
floorTex.repeat.set(0.085, 0.085);

const woodTex = canvasTex(256, (ctx, s) => {
  ctx.fillStyle = '#8a5f38'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(${40 + Math.random() * 40},${20 + Math.random() * 20},10,${0.15 + Math.random() * 0.25})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    const x = Math.random() * s;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 8, s * 0.3, x - 8, s * 0.6, x + 3, s); ctx.stroke();
  }
}, { repeat: true });

const strawTex = canvasTex(256, (ctx, s) => {
  ctx.fillStyle = '#c9a85a'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    ctx.strokeStyle = `rgba(${120 + Math.random() * 100},${90 + Math.random() * 70},40,.55)`;
    ctx.lineWidth = 1 + Math.random() * 1.5;
    const x = Math.random() * s, y = Math.random() * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 30, y + 10 + Math.random() * 30); ctx.stroke();
  }
});

// hand-scribbled grey fill, like the drawing
const scribbleTex = canvasTex(256, (ctx, s) => {
  ctx.fillStyle = '#c8ccd0'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(80,88,98,.55)'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = 6 + Math.random() * 14;
    ctx.beginPath();
    for (let a = 0; a < TAU * 1.6; a += 0.4) {
      const rr = r * (0.8 + Math.random() * 0.4);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}, { repeat: true });

const greenTex = canvasTex(128, (ctx, s) => {
  ctx.fillStyle = '#3cc197'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = 10 + Math.random() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${Math.random() < 0.5 ? '30,150,120' : '90,215,160'},.35)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
});

const targetTex = canvasTex(128, (ctx, s) => {
  const cols = ['#d8d0b8', '#b4352a', '#d8d0b8', '#b4352a', '#d8d0b8'];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - i * 11, 0, TAU); ctx.fill();
  }
});

const glowTex = canvasTex(128, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
});

const flameTex = canvasTex(128, (ctx, s) => {
  ctx.translate(s / 2, s);
  const g = ctx.createRadialGradient(0, -s * 0.28, 2, 0, -s * 0.3, s * 0.4);
  g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.35, 'rgba(255,190,70,.95)'); g.addColorStop(0.7, 'rgba(235,90,25,.55)'); g.addColorStop(1, 'rgba(200,40,10,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.2);
  ctx.bezierCurveTo(-s * 0.4, -s * 0.5, -s * 0.12, -s * 0.62, 0, -s * 0.98);
  ctx.bezierCurveTo(s * 0.12, -s * 0.62, s * 0.4, -s * 0.5, s * 0.3, -s * 0.2);
  ctx.bezierCurveTo(s * 0.25, -s * 0.02, -s * 0.25, -s * 0.02, -s * 0.3, -s * 0.2);
  ctx.fill();
});

const runeTex = canvasTex(1024, (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineCap = 'round';
  const ring = (r, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); };
  ring(480, 6); ring(455, 2); ring(330, 4); ring(300, 2); ring(150, 5);
  for (let i = 0; i < 24; i++) {         // glyph ticks between rings 330..455
    ctx.save(); ctx.rotate((i / 24) * TAU);
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, -350);
    const k = (i * 7) % 4;
    if (k === 0) { ctx.lineTo(0, -430); } else if (k === 1) { ctx.lineTo(18, -390); ctx.lineTo(0, -430); ctx.moveTo(-18, -385); ctx.lineTo(0, -410); }
    else if (k === 2) { ctx.moveTo(-20, -350); ctx.lineTo(20, -350); ctx.moveTo(0, -350); ctx.lineTo(0, -430); ctx.moveTo(-14, -430); ctx.lineTo(14, -430); }
    else { ctx.lineTo(24, -390); ctx.lineTo(-24, -415); ctx.lineTo(0, -430); }
    ctx.stroke(); ctx.restore();
  }
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {          // inner star
    ctx.save(); ctx.rotate((i / 6) * TAU);
    ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(60, -230); ctx.lineTo(0, -295); ctx.lineTo(-60, -230); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, 36, 0, TAU); ctx.fill();
});

// ---------- cave shape --------------------------------------------------
let _minR = 99;
const baseR = (a) => 15.5 + 3.2 * Math.sin(2 * a + 0.6) + 2.0 * Math.sin(3 * a + 2.0) + 1.2 * Math.sin(5 * a + 1.0);
for (let i = 0; i < 360; i++) _minR = Math.min(_minR, baseR((i / 360) * TAU));
const R_SCALE = Math.max(1, 13.5 / _minR);
const caveR = (a) => baseR(a) * R_SCALE;

// ---------- lights ------------------------------------------------------
const hemi = new THREE.HemisphereLight(0x9bbbdc, 0x2a2420, 1.0);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0xa4c4ea, 1.5);
moon.position.set(-12, 22, 8);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 70 });
moon.shadow.bias = -0.0004;
moon.shadow.normalBias = 0.04;
scene.add(moon, moon.target);

const playerLight = new THREE.PointLight(0xffd9a0, 6, 13, 1.8);
scene.add(playerLight);

// ---------- floor -------------------------------------------------------
const world = new THREE.Group();
scene.add(world);

{
  const pts = [];
  const N = 160;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU, r = caveR(a) + 2.2;
    pts.push(new THREE.Vector2(Math.cos(a) * r, -Math.sin(a) * r));  // world z = -shape y after rotateX(-90deg)
  }
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts), 1);
  geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
  const mat = new THREE.MeshStandardMaterial({ map: floorTex, bumpMap: floorTex, bumpScale: 1.6, roughness: 0.92, metalness: 0, color: 0xd2dcd8 });
  const floor = new THREE.Mesh(geo, mat);
  floor.receiveShadow = true;
  world.add(floor);
}

const runeMat = new THREE.MeshBasicMaterial({
  map: runeTex, color: 0x4ff0d0, transparent: true, opacity: 0.18,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
});
const runes = new THREE.Mesh(new THREE.CircleGeometry(7.2, 64).rotateX(-Math.PI / 2), runeMat);
runes.position.set(0, 0.03, 1);
world.add(runes);

// ---------- colliders ---------------------------------------------------
const colliders = [];   // {x,z,r,tag}
const addCollider = (x, z, r, tag) => { const c = { x, z, r, tag }; colliders.push(c); return c; };

function pushOut(p, radius) {
  for (const c of colliders) {
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = radius + c.r;
    if (d < min && d > 1e-4) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
  }
  const a = Math.atan2(-p.z, p.x), lim = caveR(a) - 0.6 - radius;
  const d = Math.hypot(p.x, p.z);
  if (d > lim) { p.x *= lim / d; p.z *= lim / d; }
}

// ---------- rocks -------------------------------------------------------
const rockMatBase = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
const _n = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

function makeRock(w, h, d, mossy = 0.5) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const p = geo.attributes.position;
  const k = srand() * 100;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.28 * Math.sin(x * 3.1 + k) * Math.cos(z * 2.7 + k * 1.3) + 0.18 * Math.sin(y * 4.3 + k * 0.7);
    p.setXYZ(i, x * n, y * n, z * n);
  }
  geo.scale(w, h, d);
  geo.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  const base = new THREE.Color().setHSL(srange(0.5, 0.62), srange(0.1, 0.22), srange(0.2, 0.3));
  const moss = new THREE.Color().setHSL(srange(0.24, 0.32), 0.38, srange(0.22, 0.3));
  for (let i = 0; i < p.count; i += 3) {
    _a.fromBufferAttribute(p, i); _b.fromBufferAttribute(p, i + 1); _c.fromBufferAttribute(p, i + 2);
    _n.copy(_b).sub(_a).cross(_c.sub(_a)).normalize();
    const yAvg = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 / h;
    const m = clamp((_n.y - 0.35) * 2.2, 0, 1) * mossy;
    const shade = 0.55 + 0.45 * clamp(yAvg * 0.5 + 0.7, 0, 1);
    const cc = base.clone().lerp(moss, m).multiplyScalar(shade * srange(0.9, 1.1));
    for (let j = 0; j < 3; j++) { col[(i + j) * 3] = cc.r; col[(i + j) * 3 + 1] = cc.g; col[(i + j) * 3 + 2] = cc.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, rockMatBase);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// camera-facing side gets lower walls so the view isn't blocked
const camAzimuth = Math.atan2(-Math.cos(CAM_YAW), Math.sin(CAM_YAW)); // direction (x,-z) of camera from centre as polar angle
for (let layer = 0; layer < 3; layer++) {
  const count = layer === 0 ? 120 : 90;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + srange(-0.02, 0.02);
    const facing = Math.max(0, Math.cos(a - camAzimuth));       // 1 = toward camera
    const hMul = 1 - facing * (0.5 + layer * 0.18);
    const r = caveR(a) + 0.7 + layer * 2.6 + srange(0, 1.2);
    const s = srange(1.4, 2.5) + layer * 0.5;
    const h = (srange(1.6, 3.0) + layer * 1.6 * (1 - facing * 0.8)) * hMul;
    const rock = makeRock(s, h, s * srange(0.8, 1.3), 0.55);
    rock.position.set(Math.cos(a) * r, h * 0.35, -Math.sin(a) * r);
    rock.rotation.y = srand() * TAU;
    world.add(rock);
    if (layer === 0) addCollider(rock.position.x, rock.position.z, s * 0.8, 'rock');
  }
}

// boulders on the plaza
[[-4.2, 5.2, 1.5], [9.3, 4.6, 1.3], [-10.8, -6.4, 1.6], [4.6, -10.3, 1.4], [11.2, -5.8, 1.2]].forEach(([x, z, s]) => {
  const rk = makeRock(s, s * 0.8, s, 0.7);
  rk.position.set(x, s * 0.3, z); rk.rotation.y = srand() * TAU;
  world.add(rk); addCollider(x, z, s * 0.85, 'rock');
});

// ---------- ruins: pillars ----------------------------------------------
const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7f8b8e, roughness: 0.95, flatShading: true });
const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x4d585c, roughness: 1, flatShading: true });
function addPillar(x, z, h, broken) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.5), darkStoneMat); base.position.y = 0.17;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, h, 8), stoneMat); shaft.position.y = 0.35 + h / 2;
  g.add(base, shaft);
  if (!broken) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 1.4), darkStoneMat); cap.position.y = 0.35 + h + 0.17; g.add(cap);
  } else {
    for (let i = 0; i < 3; i++) {
      const ch = new THREE.Mesh(new THREE.DodecahedronGeometry(srange(0.25, 0.45), 0), stoneMat);
      ch.position.set(srange(-1.3, 1.3), 0.25, srange(0.7, 1.6)); ch.rotation.set(srand() * 3, srand() * 3, 0); g.add(ch);
    }
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, 0, z); world.add(g);
  addCollider(x, z, 0.72, 'pillar');
}
addPillar(-6.5, -6.2, 4.2, false);
addPillar(7.8, -9.2, 3.0, true);
addPillar(8.8, 8.0, 4.4, false);
addPillar(-9.0, 5.0, 2.2, true);

// ---------- decoration: ferns, mushrooms, crystals, urns ----------------
const fernGeo = new THREE.ConeGeometry(0.22, 1.5, 4).translate(0, 0.75, 0).scale(1, 1, 0.18);
const fernMat = new THREE.MeshStandardMaterial({ color: 0xe0605a, roughness: 0.7, emissive: 0x5a1010, emissiveIntensity: 0.6, flatShading: true });
function addFern(x, z, s = 1) {
  const g = new THREE.Group();
  const n = 8;
  for (let i = 0; i < n; i++) {
    const blade = new THREE.Mesh(fernGeo, fernMat);
    blade.rotation.order = 'YXZ';
    blade.rotation.y = (i / n) * TAU + srange(-0.2, 0.2);
    blade.rotation.x = srange(0.65, 1.1);
    blade.scale.setScalar(srange(0.7, 1.2));
    g.add(blade);
  }
  g.position.set(x, 0, z); g.scale.setScalar(s); world.add(g);
}
const capMat = new THREE.MeshStandardMaterial({ color: 0xd94438, roughness: 0.6, emissive: 0x4a0a05, emissiveIntensity: 0.9 });
const stemMat = new THREE.MeshStandardMaterial({ color: 0xe6dcc0, roughness: 0.8 });
const spotMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
function addMushrooms(x, z) {
  for (let i = 0; i < 3; i++) {
    const s = srange(0.5, 1.1), g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 8), stemMat); stem.position.y = 0.22;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, TAU, 0, Math.PI / 2).scale(1, 0.75, 1), capMat); cap.position.y = 0.42;
    g.add(stem, cap);
    for (let k = 0; k < 5; k++) {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), spotMat);
      const a = srand() * TAU, e = srange(0.3, 1.2);
      sp.position.set(Math.cos(a) * Math.sin(e) * 0.34, 0.42 + Math.cos(e) * 0.25, Math.sin(a) * Math.sin(e) * 0.34); g.add(sp);
    }
    g.position.set(x + srange(-0.6, 0.6), 0, z + srange(-0.6, 0.6)); g.scale.setScalar(s); world.add(g);
  }
}
const crystalMat = new THREE.MeshStandardMaterial({ color: 0x7ff0ff, emissive: 0x28c8e8, emissiveIntensity: 1.6, roughness: 0.2, flatShading: true, transparent: true, opacity: 0.92 });
const crystalMat2 = new THREE.MeshStandardMaterial({ color: 0xff9be6, emissive: 0xd23aa8, emissiveIntensity: 1.4, roughness: 0.2, flatShading: true, transparent: true, opacity: 0.92 });
function addCrystals(x, z, pink) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const h = srange(0.7, 2.0);
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0).scale(1, h * 2.2, 1), pink ? crystalMat2 : crystalMat);
    c.position.set(srange(-0.6, 0.6), h * 0.35, srange(-0.6, 0.6));
    c.rotation.set(srange(-0.35, 0.35), srand() * 3, srange(-0.35, 0.35));
    g.add(c);
  }
  g.position.set(x, 0, z); world.add(g);
}
const urnMat = new THREE.MeshStandardMaterial({ color: 0x3d8a86, roughness: 0.55 });
function addUrn(x, z, s = 1) {
  const prof = [[0, 0], [0.3, 0], [0.42, 0.25], [0.5, 0.55], [0.38, 0.85], [0.26, 0.98], [0.32, 1.08], [0.3, 1.1]].map(([r, y]) => new THREE.Vector2(r, y));
  const u = new THREE.Mesh(new THREE.LatheGeometry(prof, 12), urnMat);
  u.position.set(x, 0, z); u.scale.setScalar(s); u.castShadow = true; world.add(u);
  addCollider(x, z, 0.45 * s, 'urn');
}
function edgePos(a, inset) { const r = caveR(a) - inset; return [Math.cos(a) * r, -Math.sin(a) * r]; }
for (let i = 0; i < 26; i++) { const [x, z] = edgePos(srand() * TAU, srange(1.2, 3.6)); addFern(x, z, srange(0.8, 1.5)); }
for (let i = 0; i < 7; i++) { const [x, z] = edgePos(srand() * TAU, srange(1.4, 3)); addMushrooms(x, z); }
for (let i = 0; i < 9; i++) { const [x, z] = edgePos((i / 9) * TAU + srange(0, 0.3), srange(1.0, 2.2)); addCrystals(x, z, i % 3 === 0); }
for (let i = 0; i < 6; i++) { const [x, z] = edgePos(srand() * TAU, srange(1.6, 3.2)); addUrn(x, z, srange(0.8, 1.3)); }
addFern(-2.2, 5.9, 1.1); addFern(-9.4, -1.2, 1.2); addMushrooms(2.5, -11.5); addFern(6.5, 6.6, 1);


// ---------- Quaternius "Modular Ruins" models (CC0) ----------------------
const fbx = new FBXLoader();
const modelCache = {};
function loadModel(name, height) {
  if (!modelCache[name]) {
    modelCache[name] = new Promise((res) => fbx.load(`models/${name}.fbx`, (obj) => {
      obj.traverse((o) => {
        if (!o.isMesh) return;
        const conv = (m) => {
          const c = m.color.clone();
          const isBush = name.startsWith('Bush');
          if (isBush && c.r > 0.9 && c.g > 0.9) c.set(0x4fae48).convertSRGBToLinear();
          else if (/Tree/.test(name) && /leaf|leaves/i.test(m.name || '')) c.set(0x4a9a44).convertSRGBToLinear();
          else if (/Tree/.test(name) && /leaf|leaves/i.test(m.name || '')) c.set(0x4a9a44).convertSRGBToLinear();
          else if (/Tree/.test(name) && c.r > 0.9 && c.g > 0.9) c.set(0x6a4a34).convertSRGBToLinear();
          else if (!o.geometry.attributes.color) c.convertLinearToSRGB(); else c.setRGB(1.1, 1.1, 1.1);
          const lum = (c.r + c.g + c.b) / 3;
          if (!o.geometry.attributes.color && lum < 0.12) c.multiplyScalar(0.12 / Math.max(lum, 0.01));
          return new THREE.MeshStandardMaterial({ color: c, vertexColors: !!o.geometry.attributes.color, roughness: 0.85, metalness: 0.02 });
        };
        o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
        o.castShadow = true; o.receiveShadow = true;
      });
      res(obj);
    }, undefined, (e) => { console.warn('model failed', name, e); res(null); }));
  }
  return modelCache[name].then((src) => {
    if (!src) return null;
    const obj = src.clone(true);
    const wrapG = new THREE.Group(); wrapG.add(obj);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const flat = /^(Bush|Bridge|Bricks|BearTrap|Cart|Curve|Grass|Trapdoor|Rail|Stairs)/.test(name);
    const k = height / (flat ? Math.max(size.x, size.z) : size.y);
    obj.scale.multiplyScalar(k);
    box.setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.set(-c.x, -box.min.y, -c.z);
    return wrapG;
  });
}
async function place(name, height, x, z, rotY = 0, collideR = 0, scaleMul = 1) {
  const m = await loadModel(name, height * scaleMul);
  if (!m) return;
  m.position.set(x, 0, z); m.rotation.y = rotY;
  world.add(m);
  if (collideR) addCollider(x, z, collideR, 'prop');
}
const faceCentre = (x, z) => Math.atan2(-x, -z);
(function placeRuins() {
  // gateways at the edge of the plaza
  place('Arch_Gothic', 6.2, -2.5, -12.6, faceCentre(-2.5, -12.6), 0);
  place('Arch_Round_RoundColumn', 6.0, 12.2, 1.2, faceCentre(12.2, 1.2));
  place('Arch_Gothic_RoundColumn', 5.6, -12.8, 8.0, faceCentre(-12.8, 8.0));
  // library nook
  place('Bookcase_Full', 2.6, -12.3, -3.0, faceCentre(-12.3, -3.0), 1.0);
  place('Bookcase_Empty', 2.6, -12.0, -5.2, faceCentre(-12.0, -5.2), 1.0);
  // barrels
  [[10.8, 8.6], [11.9, 7.2], [10.2, 7.3], [-6.5, 10.8], [-5.2, 11.6], [3.5, -12.0], [9.5, -11.0]].forEach(([x, z], i) => place('Barrel', 1.5 + (i % 3) * 0.15, x, z, i * 1.3, 0.6));
  // bear traps scattered on the floor
  [[-1.2, 6.5, 'BearTrap_Open'], [3.5, -4.5, 'BearTrap_Closed'], [-5.5, -3.8, 'BearTrap_Open'], [7.5, 5.0, 'BearTrap_Closed']].forEach(([x, z, n], i) => place(n, 1.1, x, z, i * 1.7));
  // bushes growing along the cave edge
  [['Bush_2x2', 3.0, -10.5, 11.5], ['Bush_2x1', 3.0, 9.0, 11.5], ['Bush_1x1', 1.6, 12.0, -3.5], ['Bush_2x2', 3.0, 10.8, -7.8], ['Bush_1x1', 1.6, -11.8, 2.2], ['Bush_2x1', 3.0, 0.8, -12.4], ['Bush_1x1', 1.6, -2.8, 12.6]].forEach(([n, h, x, z], i) => place(n, h, x, z, i * 2.1, 0.7));
  // brick piles and a broken bridge section
  place('Bricks', 1.6, 6.0, -8.3, 0.6, 0.6); place('Bricks', 1.5, -7.8, -8.4, 2.2, 0.6);
  place('BridgeSection', 4.5, 3.0, 11.0, faceCentre(3.0, 11.0) + Math.PI / 2, 0);
  // more props from the pack
  place('Column_Round', 4.0, 5.5, 8.5, 0, 0.7); place('Column_Round_Short', 2.2, -3.2, 9.6, 0, 0.7); place('Column_Square', 3.6, -8.0, -9.8, 0, 0.7);
  place('Crate', 1.2, 9.6, 9.6, 0.4, 0.7); place('Crate', 1.2, 10.9, 9.9, 1.2, 0.7); place('Crate', 1.1, 10.2, 11.0, 0.1, 0.7);
  place('Chest', 1.0, -10.2, 9.6, faceCentre(-10.2, 9.6), 0.7); place('Chest_Gold', 1.0, 11.0, -8.6, faceCentre(11.0, -8.6), 0.7);
  place('Cart', 3.2, 4.8, -11.2, 0.5, 1.0);
  place('Candles_1', 0.7, -9.0, -2.4, 0); place('Candles_2', 0.7, 10.2, -3.0, 0); place('Candles_1', 0.6, 0.5, 11.3, 0);
  place('DeadTree_1', 5.0, -13.0, -8.0, 0.4, 0.5); place('DeadTree_2', 4.5, 12.5, -4.5, 1.1, 0.5); place('DeadTree_3', 4.5, 13.2, 6.5, 2.2, 0.5);
  place('Bush_Large', 2.4, -9.3, -11.0, 0.8, 0.8); place('Bush_Round', 1.8, 8.0, 12.2, 0, 0.7);
  // statues, torches, pots, trees, ruined walls
  place('Statue_Fox', 3.2, -11.0, -9.0, faceCentre(-11.0, -9.0), 0.9); place('Statue_Stag', 3.6, 12.0, 9.0, faceCentre(12.0, 9.0), 0.9);
  [[-10.0, -0.8], [11.6, 0.6], [-3.8, 12.2], [7.4, -11.8], [-7.2, -11.2], [12.2, -1.8]].forEach(([x, z], i) => place('Torch', 2.0, x, z, i));
  [['Pot1', -7.8, 9.2], ['Pot2', -6.9, 9.9], ['Pot3', 6.6, 11.0], ['Pot1_Broken', 8.0, 10.4], ['Pot2_Broken', -2.4, -3.0], ['Pot3_Broken', 2.0, 5.0], ['Pot1', 11.0, 4.4], ['Pot3', -11.5, 3.6]].forEach(([n, x, z], i) => place(n, 1.1, x, z, i * 1.9, 0.4));
  place('Skull', 0.4, 1.8, 2.8, 0.5); place('Skull', 0.4, -4.0, -5.6, 2.1);
  place('Tree_1', 4.6, -13.0, 5.6, 0.2, 0.5); place('Tree_2', 4.6, 4.2, -12.8, 1.0, 0.5); place('Tree_3', 4.8, -6.2, 13.0, 2.0, 0.5);
  [[-5.5, 0.4], [3.4, 2.4], [-1.0, -7.4], [8.6, 2.6], [0.4, 8.0]].forEach(([x, z], i) => place('Grass', 1.0, x, z, i * 1.3));
  place('Wall_ArchRound_Broken', 3.4, 9.5, -6.4, faceCentre(9.5, -6.4) + Math.PI / 2, 0); place('Wall_ArchGothic', 3.4, -10.4, -4.6, faceCentre(-10.4, -4.6) + Math.PI / 2, 0);
  place('Trapdoor', 1.8, -0.5, -3.0, 0.3); place('Stairs', 2.0, 12.8, -0.8, faceCentre(12.8, -0.8), 0);
  place('Rail_Straight', 1.2, -4.4, 12.6, 0.2); place('Rail_Corner', 1.2, -5.8, 12.4, 0.2);
  // loose bricks near the pillars
  for (let i = 0; i < 26; i++) {
    const p = [[-6.5, -6.2], [7.8, -9.2], [8.8, 8.0], [-9.0, 5.0]][i % 4];
    place('Brick', 0.5, p[0] + srange(-2.2, 2.2), p[1] + srange(-2.2, 2.2), srand() * TAU);
  }
})();

// ---------- braziers ----------------------------------------------------
const braziers = [];
const flameGlowMat = (tex, color) => new THREE.SpriteMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const brazierSpots = [[-9.5, -3.5], [-1.5, -11.5], [8.2, -3.2], [11.5, 3.5], [-8.5, 9.8], [2.5, 10.2]];
brazierSpots.forEach(([x, z], i) => {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.0, 8), stoneMat); ped.position.y = 0.5;
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.3, 0], [0.55, 0.3], [0.62, 0.38], [0.5, 0.36], [0.0, 0.2]].map(([r, y]) => new THREE.Vector2(r, y)), 14), new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.6, metalness: 0.5, side: THREE.DoubleSide }));
  bowl.position.y = 1.0;
  const coals = new THREE.Mesh(new THREE.CircleGeometry(0.46, 12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x220a04, emissive: 0xff4a10, emissiveIntensity: 0.2 }));
  coals.position.y = 1.2;
  g.add(ped, bowl, coals);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, 0, z);
  world.add(g);
  addCollider(x, z, 0.65, 'brazier');

  const flame = new THREE.Sprite(flameGlowMat(flameTex, 0xffc070)); flame.center.set(0.5, 0.05); flame.position.set(x, 1.25, z); flame.visible = false;
  const flame2 = new THREE.Sprite(flameGlowMat(flameTex, 0xff7a30)); flame2.center.set(0.5, 0.05); flame2.position.set(x + 0.05, 1.25, z); flame2.visible = false;
  const halo = new THREE.Sprite(flameGlowMat(glowTex, 0xff9a4a)); halo.position.set(x, 1.8, z); halo.scale.setScalar(0.01);
  const light = new THREE.PointLight(0xff9440, 0, 20, 1.6); light.position.set(x, 2.0, z);
  scene.add(flame, flame2, halo, light);
  braziers.push({ i, x, z, lit: false, t: 0, flame, flame2, halo, light, coals, phase: Math.random() * 10 });
});

// ---------- particles ---------------------------------------------------
const MAXP = 600;
const P = {
  pos: new Float32Array(MAXP * 3), col: new Float32Array(MAXP * 3), base: new Float32Array(MAXP * 3),
  vel: new Float32Array(MAXP * 3), life: new Float32Array(MAXP), max: new Float32Array(MAXP), grav: new Float32Array(MAXP), next: 0,
};
for (let i = 0; i < MAXP; i++) P.pos[i * 3 + 1] = -100;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(P.pos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(P.col, 3));
const pPoints = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.26, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
pPoints.frustumCulled = false;
scene.add(pPoints);
const _pc = new THREE.Color();
function emit(x, y, z, n, color, speed = 4, life = 0.5, grav = 8, up = 0.5) {
  _pc.set(color);
  for (let k = 0; k < n; k++) {
    const i = P.next; P.next = (P.next + 1) % MAXP;
    const a = Math.random() * TAU, s = speed * (0.35 + Math.random() * 0.65);
    P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
    P.vel[i * 3] = Math.cos(a) * s; P.vel[i * 3 + 1] = (Math.random() * 1.2 - 0.2 + up) * s * 0.7; P.vel[i * 3 + 2] = Math.sin(a) * s;
    P.base[i * 3] = _pc.r; P.base[i * 3 + 1] = _pc.g; P.base[i * 3 + 2] = _pc.b;
    P.life[i] = P.max[i] = life * (0.6 + Math.random() * 0.6); P.grav[i] = grav;
  }
}
function updateParticles(dt) {
  for (let i = 0; i < MAXP; i++) {
    if (P.life[i] <= 0) { P.col[i * 3] = P.col[i * 3 + 1] = P.col[i * 3 + 2] = 0; continue; }
    P.life[i] -= dt;
    P.vel[i * 3 + 1] -= P.grav[i] * dt;
    P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
    if (P.pos[i * 3 + 1] < 0.03) { P.pos[i * 3 + 1] = 0.03; P.vel[i * 3 + 1] *= -0.3; }
    const f = Math.max(0, P.life[i] / P.max[i]);
    P.col[i * 3] = P.base[i * 3] * f; P.col[i * 3 + 1] = P.base[i * 3 + 1] * f; P.col[i * 3 + 2] = P.base[i * 3 + 2] * f;
    if (P.life[i] <= 0) P.pos[i * 3 + 1] = -100;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}

// ambient floating motes
const MOTES = 160;
const moteGeo = new THREE.BufferGeometry();
const motePos = new Float32Array(MOTES * 3), moteSeed = new Float32Array(MOTES);
for (let i = 0; i < MOTES; i++) { const a = Math.random() * TAU, r = Math.random() * 17; motePos[i * 3] = Math.cos(a) * r; motePos[i * 3 + 1] = Math.random() * 5; motePos[i * 3 + 2] = Math.sin(a) * r; moteSeed[i] = Math.random() * 100; }
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ size: 0.11, map: glowTex, color: 0x9fe0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
motes.frustumCulled = false;
scene.add(motes);

// ---------- audio -------------------------------------------------------
const Sfx = (() => {
  let ctx = null, master, wet, muted = false, noiseBuf;
  const init = () => {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      const dly = ctx.createDelay(1); dly.delayTime.value = 0.27;
      const fb = ctx.createGain(); fb.gain.value = 0.38;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      wet = ctx.createGain(); wet.gain.value = 0.28;
      wet.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // ambient drone
      [[55, 0.05], [82.4, 0.03], [110.7, 0.018]].forEach(([f, g]) => {
        const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; og.gain.value = g;
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.05 + Math.random() * 0.1; lg.gain.value = g * 0.5;
        lfo.connect(lg); lg.connect(og.gain); o.connect(og); og.connect(master); o.start(); lfo.start();
      });
      setInterval(() => { if (Math.random() < 0.5) tone(1200 + Math.random() * 900, 0.18, 'sine', 0.05, -400, true); }, 2600);  // cave drips
    } catch (e) { ctx = null; }
  };
  function tone(f, dur, type = 'sine', gain = 0.2, slide = 0, send = false) {
    if (!ctx || muted) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); if (send) g.connect(wet);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, f0, f1, gain = 0.2, q = 1, type = 'bandpass', send = false) {
    if (!ctx || muted) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(master); if (send) g.connect(wet);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  return {
    init, toggle() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.55; return muted; },
    slash() { noise(0.18, 700, 2800, 0.28, 0.9); },
    hit() { tone(150, 0.14, 'triangle', 0.35, -90); noise(0.1, 1800, 400, 0.18, 1, 'lowpass'); },
    block() { tone(240, 0.12, 'square', 0.14, -100); noise(0.12, 2500, 700, 0.18, 1.5); },
    parry() { [1250, 1880, 2790].forEach((f, i) => tone(f, 0.55, 'sine', 0.16 / (i + 1), -f * 0.05, true)); noise(0.12, 5000, 1500, 0.28, 1); tone(90, 0.3, 'sine', 0.4, -40); },
    shoot() { tone(520, 0.14, 'triangle', 0.13, -280); noise(0.1, 3500, 1500, 0.1, 1); },
    bow() { tone(420, 0.1, 'triangle', 0.12, -200); noise(0.09, 4000, 1800, 0.12); },
    hurt() { tone(170, 0.32, 'sawtooth', 0.28, -110); noise(0.22, 900, 200, 0.28, 1, 'lowpass'); },
    roll() { noise(0.22, 400, 1200, 0.1, 0.6); },
    step() { noise(0.05, 500, 220, 0.045, 0.8, 'lowpass'); },
    windup() { tone(180, 0.35, 'sawtooth', 0.035, 140); },
    light() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.9, 'sine', 0.1, 0, true), i * 85)); noise(0.5, 2500, 5000, 0.06, 0.5, 'highpass'); },
    shatter() { noise(0.4, 3000, 300, 0.3, 0.7); tone(100, 0.25, 'triangle', 0.3, -50); },
    victory() { [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 1.6, 'sine', 0.1, 0, true), i * 220)); },
  };
})();

// ---------- model helpers ----------------------------------------------
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0b0d10, side: THREE.BackSide });
function addOutline(mesh, thick = 1.07) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat);
  o.scale.setScalar(thick); o.renderOrder = -1; o.castShadow = false; o.receiveShadow = false;
  mesh.add(o);
}
function mk(geo, mat, x = 0, y = 0, z = 0, { outline = true, cast = true, thick = 1.07 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = false;
  if (outline) addOutline(m, thick);
  return m;
}
const stdMat = (o) => new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0, ...o });
const scribbleMat = stdMat({ map: scribbleTex });
const greenMat = stdMat({ map: greenTex });
const tanMat = stdMat({ color: 0xd6a37a });
const hairMat = stdMat({ color: 0xd9b58a, flatShading: true });
const yellowMat = stdMat({ color: 0xf2d85a, emissive: 0x5a4a00, emissiveIntensity: 0.4 });
const gemMat = new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: 0xffc83a, emissiveIntensity: 2.2, roughness: 0.2 });
const bladeMat = stdMat({ color: 0x8b939c, metalness: 0.7, roughness: 0.32 });
const darkMat = stdMat({ color: 0x23262b });
const shieldMat = stdMat({ color: 0xc89a6e, roughness: 0.6 });

// ---------- player ------------------------------------------------------
// merge indexed geometries (position/normal/color) into one
function mergeGeos(list) {
  let vc = 0, ic = 0;
  list.forEach((g) => { vc += g.attributes.position.count; ic += g.index.count; });
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), col = new Float32Array(vc * 3), idx = new Uint32Array(ic);
  let vo = 0, io = 0;
  list.forEach((g) => {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); col.set(g.attributes.color.array, vo * 3);
    for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo;
    vo += g.attributes.position.count; io += g.index.count;
  });
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  return m;
}

// one tapered, curved, coloured strand of hair
function hairStrand(start, dir, len, curl, width, tint) {
  const pts = [];
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    pts.push(start.clone().addScaledVector(dir, len * t).addScaledVector(side, Math.sin(t * 2.2) * curl * len * 0.3).add(new THREE.Vector3(0, -t * t * len * 0.28, 0)));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const SEG = 8, RAD = 5;
  const g = new THREE.TubeGeometry(curve, SEG, width, RAD, false);
  const p = g.attributes.position, n = p.count;
  const cols = new Float32Array(n * 3);
  const root = new THREE.Color(0x8a6238), tip = new THREE.Color(0xf0d3a0), c = new THREE.Color();
  const cp = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const ring = Math.floor(i / (RAD + 1)), t = ring / SEG;
    curve.getPointAt(t, cp);
    v.fromBufferAttribute(p, i).sub(cp).multiplyScalar(Math.max(0.05, 1 - Math.pow(t, 1.3) * 0.95)).add(cp);
    p.setXYZ(i, v.x, v.y, v.z);
    c.copy(root).lerp(tip, Math.pow(t, 0.8)).multiplyScalar(tint);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
}

function buildHair() {
  const strands = [];
  const v = new THREE.Vector3();
  // dense layer over the whole scalp, longer wild locks on top, swept back and outward
  for (let i = 0; i < 120; i++) {
    const top = i < 70;
    const x = srange(-0.45, 0.45), z = srange(-0.42, 0.42);
    const start = new THREE.Vector3(x, 0.52 + (top ? 0 : -srange(0, 0.15)), z);
    const out = new THREE.Vector3(x * 1.2, 0, z * 1.2 - 0.12);
    if (out.lengthSq() < 0.01) out.set(srange(-1, 1), 0, srange(-1, 1));
    out.normalize();
    v.copy(out).multiplyScalar(top ? srange(0.5, 1.0) : srange(0.6, 1.1));
    v.y = top ? srange(0.35, 0.8) : srange(-0.2, 0.2);
    v.x += srange(-0.25, 0.25); v.z += srange(-0.25, 0.25) - 0.1;
    v.normalize();
    strands.push(hairStrand(start, v.clone(), top ? srange(0.3, 0.55) : srange(0.25, 0.42), srange(-1, 1), top ? srange(0.05, 0.075) : 0.06, srange(0.8, 1.1)));
  }
  // fringe falling over the forehead (kept above the eye)
  for (let i = 0; i < 16; i++) {
    const x = -0.5 + (i / 15) * 1.0;
    const start = new THREE.Vector3(x, 0.5, 0.42 + srange(0, 0.08));
    const dir = new THREE.Vector3(x * 0.4 + srange(-0.15, 0.15), -0.25, 0.75).normalize();
    strands.push(hairStrand(start, dir, srange(0.2, 0.32), srange(-0.6, 0.6), 0.05, srange(0.85, 1.05)));
  }
  const mesh = new THREE.Mesh(mergeGeos(strands), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.05 }));
  mesh.castShadow = true;
  return mesh;
}

function buildPlayer() {
  const root = new THREE.Group();
  const model = new THREE.Group(); root.add(model);
  const pivot = new THREE.Group(); pivot.position.y = 1.5; model.add(pivot);
  const rig = new THREE.Group(); rig.position.y = -1.5; pivot.add(rig);
  const S = {};
  const sph = (r, sx = 1, sy = 1, sz = 1) => new THREE.SphereGeometry(r, 20, 14).scale(sx, sy, sz);

  // legs: rounded limbs with green knee bands and a glowing gem
  const mkLeg = (x) => {
    const pv = new THREE.Group(); pv.position.set(x, 1.2, 0);
    pv.add(mk(new THREE.CapsuleGeometry(0.27, 0.62, 6, 14), scribbleMat, 0, -0.55, 0, { thick: 1.08 }));
    pv.add(mk(new THREE.CylinderGeometry(0.295, 0.295, 0.24, 16), greenMat, 0, -0.58, 0, { thick: 1.06 }));
    pv.add(mk(new THREE.OctahedronGeometry(0.13, 0).scale(0.8, 1.3, 0.5), gemMat, 0, -0.58, 0.3, { outline: false, cast: false }));
    pv.add(mk(sph(0.34, 1, 0.62, 1.35), darkMat, 0, -1.08, 0.1, { thick: 1.07 }));
    rig.add(pv); return pv;
  };
  S.legL = mkLeg(0.34); S.legR = mkLeg(-0.34);

  // body: rounded hips + torso
  rig.add(mk(sph(0.72, 1, 0.62, 0.78), scribbleMat, 0, 1.3, 0, { thick: 1.07 }));
  rig.add(mk(new THREE.CapsuleGeometry(0.62, 0.75, 8, 18).scale(1, 1, 0.78), scribbleMat, 0, 1.95, 0, { thick: 1.07 }));
  rig.add(mk(new THREE.CylinderGeometry(0.645, 0.645, 0.3, 20).scale(1, 1, 0.8), greenMat, 0, 2.3, 0, { thick: 1.04 }));
  rig.add(mk(sph(0.5, 1, 0.85, 0.16), tanMat, 0, 1.78, 0.46, { thick: 1.08 }));
  S.bellyGem = mk(new THREE.OctahedronGeometry(0.2, 0).scale(0.75, 1.5, 0.45), gemMat, 0, 1.8, 0.56, { outline: false, cast: false });
  rig.add(S.bellyGem);
  rig.add(mk(new THREE.CylinderGeometry(0.28, 0.34, 0.3, 12), greenMat, 0, 2.72, 0, { thick: 1.06 }));   // neck
  rig.add(mk(sph(0.3), scribbleMat, -0.8, 2.45, 0, { thick: 1.08 }), mk(sph(0.3), scribbleMat, 0.8, 2.45, 0, { thick: 1.08 }));   // shoulders

  // head: the one blocky part
  const head = new THREE.Group(); head.position.set(0, 3.2, 0); rig.add(head); S.head = head;
  head.add(mk(new THREE.BoxGeometry(1.1, 1.1, 1.0), greenMat, 0, 0, 0));
  const eye = new THREE.Group(); eye.position.set(0, 0.0, 0.52); head.add(eye); S.eye = eye;
  eye.add(new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), yellowMat));
  const white = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20).scale(1.15, 0.8, 1), new THREE.MeshBasicMaterial({ color: 0xf4f4ee })); white.position.z = 0.01; eye.add(white);
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.13, 14), new THREE.MeshBasicMaterial({ color: 0x15171a })); pupil.position.z = 0.02; eye.add(pupil); S.pupil = pupil;
  const scalp = new THREE.Mesh(sph(0.62, 1, 0.45, 0.58), new THREE.MeshStandardMaterial({ color: 0x9a7242, roughness: 0.6 }));
  scalp.position.y = 0.5; head.add(scalp);
  head.add(buildHair());

  // sword arm (+z along arm / blade)
  const sw = new THREE.Group(); sw.position.set(-0.95, 2.45, 0); sw.rotation.order = 'YXZ'; rig.add(sw); S.sword = sw;
  sw.add(mk(new THREE.CapsuleGeometry(0.2, 0.62, 6, 12).rotateX(Math.PI / 2), scribbleMat, 0, 0, 0.45, { thick: 1.1 }));
  sw.add(mk(sph(0.27), greenMat, 0, 0, 0.98, { thick: 1.08 }));
  sw.add(mk(new THREE.TorusGeometry(0.34, 0.06, 8, 16, Math.PI).rotateY(Math.PI / 2).rotateX(0), yellowMat, 0, 0, 1.25, { thick: 1.08 }));
  sw.add(mk(new THREE.BoxGeometry(0.26, 0.07, 2.0), bladeMat, 0, 0, 2.3, { thick: 1.08 }));
  sw.add(mk(new THREE.ConeGeometry(0.13, 0.4, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, 0.3, 1), bladeMat, 0, 0, 3.5, { outline: false }));

  // shield arm
  const sa = new THREE.Group(); sa.position.set(0.95, 2.45, 0); sa.rotation.order = 'YXZ'; rig.add(sa); S.shieldArm = sa;
  sa.add(mk(new THREE.CapsuleGeometry(0.2, 0.62, 6, 12), scribbleMat, 0, -0.5, 0, { thick: 1.1 }));
  sa.add(mk(sph(0.27), greenMat, 0, -1.0, 0, { thick: 1.08 }));
  const sh = new THREE.Group(); rig.add(sh); S.shield = sh;
  sh.add(mk(new THREE.CylinderGeometry(0.92, 0.92, 0.16, 24).rotateZ(Math.PI / 2), shieldMat, 0, 0, 0, { thick: 1.05 }));
  sh.add(mk(new THREE.TorusGeometry(0.92, 0.07, 8, 28).rotateY(Math.PI / 2), stdMat({ color: 0x6a4a30 }), 0, 0, 0, { outline: false }));
  S.shieldGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd77a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const sglow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24).rotateY(Math.PI / 2), S.shieldGlowMat); sglow.position.x = 0.12; sh.add(sglow);
  sh.add(mk(sph(0.3, 0.45, 1, 1), greenMat, 0.14, 0, 0, { thick: 1.06 }));
  for (let i = 0; i < 4; i++) sh.add(mk(sph(0.07), stdMat({ color: 0xe8f0d8 }), 0.2, -0.27, -0.2 + i * 0.13, { outline: false }));
  root.scale.setScalar(0.8);
  root.traverse((o) => { if (o.isMesh && !o.castShadow) o.receiveShadow = false; });
  return { root, model, pivot, rig, S };
}

const pl = buildPlayer();
scene.add(pl.root);
const player = {
  x: 0, z: 3, vx: 0, vz: 0, fa: Math.PI, lives: MAX_LIVES, stamina: 100, magic: 4, magicT: 0,
  slashT: -1, slashDone: false, slashCd: 0, queuedSlash: 0,
  blocking: false, blockTime: 0, blockCd: 0, guardRaise: 0,
  rollT: -1, rollDirX: 0, rollDirZ: 1, rollCd: 0,
  invuln: 0, knock: { x: 0, z: 0 }, exhausted: false, staminaDelay: 0, walkPhase: 0, moveAmt: 0, stepAcc: 0,
  dead: 0, parries: 0, bowCd: 0, bowAnim: 0,
};
const SLASH_TIME = 0.34, ROLL_TIME = 0.36;

// slash arc vfx
const slashFx = new THREE.Mesh(
  new THREE.RingGeometry(0.9, 2.9, 28, 1, -Math.PI * 0.42, Math.PI * 0.84).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
);
slashFx.position.y = 1.0; scene.add(slashFx);
let slashFxT = 0, slashFxFlip = 1;

// ---------- enemies -----------------------------------------------------
const dummies = [];
const arrows = [];
const dummyMats = [];
const woodMat = stdMat({ map: woodTex, color: 0xffe0c0 });
const strawMat = stdMat({ map: strawTex });
const sackMat = stdMat({ color: 0xb59a6e });
const targetMat = stdMat({ map: targetTex });

function trackMats(group) {
  const list = [];
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissive && o.material !== gemMat) {
      const m = o.material.clone(); o.material = m; list.push(m);
    }
  });
  return list;
}

function buildDummy(kind) {
  const root = new THREE.Group();
  const yaw = new THREE.Group(); root.add(yaw);
  const body = new THREE.Group(); yaw.add(body);
  const base = mk(new THREE.CylinderGeometry(0.85, 0.95, 0.22, 14), stdMat({ color: 0x575f62, flatShading: true }), 0, 0.11, 0, { outline: false }); yaw.add(base);
  body.add(mk(new THREE.CylinderGeometry(0.2, 0.26, 2.0, 8), woodMat, 0, 1.0, 0));
  body.add(mk(new THREE.BoxGeometry(1.0, 1.15, 0.55), kind === 'idle' ? strawMat : woodMat, 0, 1.75, 0));
  const tgt = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), targetMat); tgt.position.set(0, 1.78, 0.285); body.add(tgt);
  const head = mk(new THREE.SphereGeometry(0.42, 14, 10), kind === 'idle' ? sackMat : woodMat, 0, 2.62, 0); body.add(head);
  const D = { root, yaw, body, head, parts: {} };
  if (kind !== 'idle') {                         // glowing "eyes" on the fighters
    const em = new THREE.MeshBasicMaterial({ color: 0xff5a2a });
    const e1 = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), em), e2 = e1.clone();
    e1.position.set(-0.16, 2.66, 0.4); e2.position.set(0.16, 2.66, 0.4); body.add(e1, e2); D.eyeMat = em;
  } else {
    body.add(mk(new THREE.BoxGeometry(2.0, 0.22, 0.22), woodMat, 0, 2.05, -0.05));      // crossbar
    const rope = mk(new THREE.TorusGeometry(0.46, 0.04, 6, 14).rotateX(Math.PI / 2), stdMat({ color: 0x6a4a2a }), 0, 2.28, 0, { outline: false }); body.add(rope);
  }
  if (kind === 'sword') {
    body.add(mk(new THREE.BoxGeometry(0.34, 0.34, 0.34), woodMat, 0.62, 1.95, 0));
    const arm = new THREE.Group(); arm.position.set(-0.7, 2.0, 0); arm.rotation.order = 'YXZ'; body.add(arm);
    arm.add(mk(new THREE.BoxGeometry(0.28, 0.28, 0.9), woodMat, 0, 0, 0.4));
    arm.add(mk(new THREE.BoxGeometry(0.7, 0.1, 0.12), stdMat({ color: 0x5a3a20 }), 0, 0, 0.9));
    const blade = mk(new THREE.BoxGeometry(0.2, 0.06, 1.8), woodMat, 0, 0, 1.9); arm.add(blade);
    D.swordGlow = new THREE.MeshBasicMaterial({ color: 0xff4a1a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    arm.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 1.95), D.swordGlow).translateZ(1.9));
    D.parts.arm = arm;
  }
  if (kind === 'archer') {
    body.add(mk(new THREE.BoxGeometry(0.3, 0.3, 0.3), woodMat, -0.62, 1.95, 0));
    const arm = new THREE.Group(); arm.position.set(0.7, 2.0, 0); arm.rotation.order = 'YXZ'; body.add(arm);
    arm.add(mk(new THREE.BoxGeometry(0.26, 0.26, 0.9), woodMat, 0, 0, 0.45));
    const bow = new THREE.Group(); bow.position.set(0, 0, 0.95); arm.add(bow);
    bow.add(mk(new THREE.TorusGeometry(0.85, 0.06, 6, 20, Math.PI).rotateZ(-Math.PI / 2), stdMat({ color: 0x5a3a20 }), 0, 0, 0, { outline: false }));
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.7, 0.02), new THREE.MeshBasicMaterial({ color: 0xe8e0c8 })); str.position.x = -0.0; bow.add(str); D.string = str;
    D.nock = new THREE.Group(); D.nock.visible = false; bow.add(D.nock);
    const ar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5).rotateX(Math.PI / 2), woodMat); ar.position.z = 0.3;
    const ah = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 5).rotateX(Math.PI / 2), bladeMat); ah.position.z = 0.9;
    D.nock.add(ar, ah);
    D.bowGlow = new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    bow.add(new THREE.Mesh(new THREE.CircleGeometry(1.0, 18), D.bowGlow).rotateY(Math.PI / 2));
    D.parts.arm = arm; D.parts.bow = bow;
    // aim line
    D.aim = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    D.aim.position.y = 0.08; scene.add(D.aim);
  }
  root.traverse((o) => { if (o.isMesh && o.castShadow === false && !o.material.transparent) o.receiveShadow = false; });
  return D;
}

const barRoot = document.body;
function makeBar() {
  const el = document.createElement('div'); el.className = 'bar'; el.innerHTML = '<i></i><em></em>';
  barRoot.appendChild(el); return el;
}

function addDummy(kind, x, z, maxHp, name, faceAngle = 0) {
  const D = buildDummy(kind);
  D.root.position.set(x, 0, z);
  D.yaw.rotation.y = faceAngle;
  scene.add(D.root);
  const d = Object.assign(D, {
    kind, name, x, z, r: 0.75, hp: maxHp, maxHp, stun: 0, flash: 0, face: faceAngle,
    state: 'idle', st: 0, cd: rand(0.5, 1.5), tiltX: 0, tiltZ: 0, tvx: 0, tvz: 0, bar: makeBar(), shown: 0, reset: 0,
    aimDirX: 0, aimDirZ: 1, stars: null,
  });
  d.mats = trackMats(d.root);
  // stun stars
  d.stars = new THREE.Group(); d.stars.visible = false; d.stars.position.y = 3.5;
  for (let i = 0; i < 3; i++) d.stars.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), new THREE.MeshBasicMaterial({ color: 0xffe36a })));
  d.root.add(d.stars);
  addCollider(x, z, 0.7, 'dummy');
  dummies.push(d);
  return d;
}

const archer = addDummy('archer', -3.5, -9.2, 10, 'Archer Dummy', Math.PI);
const swordsman = addDummy('sword', 5.2, -1.0, 12, 'Sword Dummy', Math.PI * 0.6);
const sandbag = addDummy('idle', -7.3, 1.2, 20, 'Training Dummy', 0.8);

// ---------- floating text ----------------------------------------------
const pops = [];
const _v = new THREE.Vector3();
function worldToScreen(x, y, z) {
  _v.set(x, y, z).project(camera);
  return [(_v.x * 0.5 + 0.5) * innerWidth, (-_v.y * 0.5 + 0.5) * innerHeight, _v.z < 1];
}
function pop(x, y, z, text, color = '#fff', size = 20) {
  const el = document.createElement('div'); el.className = 'pop'; el.textContent = text; el.style.color = color; el.style.fontSize = size + 'px';
  document.body.appendChild(el); pops.push({ el, x, y, z, t: 0 });
}
function updatePops(dt) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.t += dt;
    const [sx, sy] = worldToScreen(p.x, p.y + p.t * 1.6, p.z);
    p.el.style.left = sx + 'px'; p.el.style.top = sy + 'px'; p.el.style.opacity = String(clamp(1.6 - p.t * 1.1, 0, 1));
    if (p.t > 1.4) { p.el.remove(); pops.splice(i, 1); }
  }
}

// ---------- game state --------------------------------------------------
let hitstop = 0, shake = 0, timeNow = 0, started = false, won = false, hintText = '';
const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: [false, false, false] };
const keys = {};
const aimPoint = new THREE.Vector3(0, 0, 0);
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);

addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
addEventListener('mousedown', (e) => {
  if (!started || e.target.closest('#title')) return;
  mouse.down[e.button] = true;
  if (e.button === 0) player.queuedSlash = 0.18;
  if (e.button === 2) pressBlock();
});
addEventListener('mouseup', (e) => { mouse.down[e.button] = false; if (e.button === 2) releaseBlock(); });
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (!started) return;
  if (e.code === 'Space') { e.preventDefault(); tryRoll(); }
  if (e.code === 'KeyE') tryLight();
  if (e.code === 'KeyF') tryBow();
  if (e.code === 'KeyM') Sfx.toggle();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down.fill(false); releaseBlock(); });

function updateAim() {
  raycaster.setFromCamera({ x: (mouse.x / innerWidth) * 2 - 1, y: -(mouse.y / innerHeight) * 2 + 1 }, camera);
  raycaster.ray.intersectPlane(plane, aimPoint);
}
const aimAngle = () => Math.atan2(aimPoint.x - player.x, aimPoint.z - player.z);

function pressBlock() {
  if (player.dead > 0 || player.blocking || player.blockCd > 0 || player.rollT >= 0 || player.slashT >= 0) { player.wantBlock = true; return; }
  player.blocking = true; player.blockTime = 0;
}
function releaseBlock() {
  player.wantBlock = false;
  if (player.blocking) { player.blocking = false; player.blockCd = 0.25; }
}

function tryRoll() {
  if (player.dead > 0 || player.rollT >= 0 || player.rollCd > 0 || player.stamina < 20) return;
  let dx = 0, dz = 0; const m = moveInput();
  dx = m.x; dz = m.z;
  if (!dx && !dz) { dx = Math.sin(player.fa); dz = Math.cos(player.fa); }
  const l = Math.hypot(dx, dz); player.rollDirX = dx / l; player.rollDirZ = dz / l;
  player.rollT = 0; player.stamina -= 20; player.staminaDelay = 0.7; player.invuln = Math.max(player.invuln, 0.3);
  player.slashT = -1; player.blocking = false; player.fa = Math.atan2(dx, dz);
  Sfx.roll();
}

function tryBow() {
  if (player.dead > 0 || player.bowCd > 0 || player.magic < 1 || player.rollT >= 0) return;
  player.magic -= 1; player.bowCd = 0.35; player.bowAnim = 0.2;
  const dx = Math.sin(player.fa), dz = Math.cos(player.fa);
  spawnArrow(player.x + dx * 1.0, 1.1, player.z + dz * 1.0, dx * 19, dz * 19, 'player');
  Sfx.shoot();
}

function tryLight() {
  const b = nearestUnlit(2.8);
  if (b) lightBrazier(b);
}
const nearestUnlit = (range) => {
  let best = null, bd = range;
  for (const b of braziers) if (!b.lit) { const d = Math.hypot(b.x - player.x, b.z - player.z); if (d < bd) { bd = d; best = b; } }
  return best;
};
function lightBrazier(b) {
  if (b.lit) return;
  b.lit = true;
  Sfx.light();
  emit(b.x, 1.4, b.z, 40, 0xffb060, 5, 0.9, 2, 1.2);
  pop(b.x, 2.6, b.z, 'LIT', '#ffd77a', 22);
  shake = Math.max(shake, 0.12);
  const n = braziers.filter((q) => q.lit).length;
  updateLightHud();
  if (n === braziers.length && !won) { won = true; setTimeout(winSequence, 700); }
}

function winSequence() {
  Sfx.victory();
  const bn = $('banner');
  bn.innerHTML = 'THE CAVE AWAKENS<small>All lights are lit &mdash; demo complete. Keep practising on the dummies!</small>';
  bn.style.opacity = 1;
  setTimeout(() => (bn.style.opacity = 0), 6500);
}

function moveInput() {
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (!ix && !iz) return { x: 0, z: 0 };
  // camera-relative: W goes "up the screen"
  const fx = -Math.sin(CAM_YAW), fz = -Math.cos(CAM_YAW), rx = -fz, rz = fx;
  const x = rx * ix + fx * -iz, z = rz * ix + fz * -iz;
  const l = Math.hypot(x, z);
  return { x: x / l, z: z / l };
}

// ---------- damage ------------------------------------------------------
function hurtPlayer(dmg, fromX, fromZ) {
  if (player.invuln > 0 || player.dead > 0) return;
  player.lives -= dmg;
  player.invuln = 1.1;
  const dx = player.x - fromX, dz = player.z - fromZ, l = Math.hypot(dx, dz) || 1;
  player.knock.x = (dx / l) * 9; player.knock.z = (dz / l) * 9;
  player.slashT = -1; player.blocking = false;
  hitstop = 0.09; shake = Math.max(shake, 0.5);
  $('flash').style.opacity = 0.3; setTimeout(() => ($('flash').style.opacity = 0), 90);
  emit(player.x, 1.3, player.z, 22, 0xff3a2a, 5, 0.5);
  pop(player.x, 2.4, player.z, '-1', '#ff6a5a', 24);
  Sfx.hurt();
  updateHud();
  if (player.lives <= 0) {
    player.dead = 2.2;
    const bn = $('banner'); bn.innerHTML = 'YOU FELL<small>The flame flickers&hellip; but it is not out</small>'; bn.style.opacity = 1;
  }
}

function damageDummy(d, dmg, dirX, dirZ, opts = {}) {
  if (d.reset > 0) return;
  d.hp -= dmg;
  d.flash = 1;
  d.shown = 6;
  d.tvx += dirX * (opts.big ? 6 : 3.5); d.tvz += dirZ * (opts.big ? 6 : 3.5);
  emit(d.x, 1.7, d.z, opts.big ? 26 : 12, opts.big ? 0xffe9a0 : 0xd9a066, opts.big ? 7 : 5, 0.5);
  pop(d.x + rand(-0.3, 0.3), 3.3, d.z, '-' + dmg, opts.big ? '#ffd77a' : '#fff', opts.big ? 28 : 21);
  Sfx.hit();
  if (d.hp <= 0) {
    d.hp = 0; d.reset = 1.6; d.stun = 0; d.state = 'idle'; d.st = 0;
    emit(d.x, 1.5, d.z, 60, 0xc9954f, 8, 1, 9);
    Sfx.shatter();
    pop(d.x, 3.8, d.z, 'Dummies never die!', '#9fe0ff', 17);
  }
}

function stunDummy(d, t) {
  d.stun = t; d.state = 'idle'; d.st = 0; d.cd = Math.max(d.cd, 0.8);
  if (d.aim) d.aim.material.opacity = 0;
  if (d.nock) d.nock.visible = false;
}

function parryFx(x, z) {
  player.parries++;
  hitstop = 0.14; shake = Math.max(shake, 0.7);
  emit(x, 1.4, z, 55, 0xfff2b8, 9, 0.55, 4);
  emit(x, 1.4, z, 25, 0x8fe8ff, 6, 0.5, 2);
  pop(x, 3.0, z, 'PERFECT PARRY!', '#ffd77a', 26);
  Sfx.parry();
  parryFlash = 1;
  updateLightHud();
}
let parryFlash = 0;

// player is attacked from (ex,ez); returns 'parry' | 'block' | 'hit'
function resolveAttackOnPlayer(ex, ez) {
  if (player.invuln > 0 || player.dead > 0) return 'miss';
  if (player.blocking) {
    const toE = Math.atan2(ex - player.x, ez - player.z);
    if (Math.abs(angDiff(toE, player.fa)) < 1.25) return player.blockTime <= PARRY_WINDOW ? 'parry' : 'block';
  }
  return 'hit';
}
function blockedFx(ex, ez) {
  player.stamina = Math.max(0, player.stamina - 12); player.staminaDelay = 0.8;
  const dx = player.x - ex, dz = player.z - ez, l = Math.hypot(dx, dz) || 1;
  player.knock.x += (dx / l) * 4; player.knock.z += (dz / l) * 4;
  emit(player.x + Math.sin(player.fa), 1.3, player.z + Math.cos(player.fa), 14, 0xbfd8ff, 5, 0.3);
  pop(player.x, 2.4, player.z, 'Blocked', '#bfe6ff', 17);
  Sfx.block(); shake = Math.max(shake, 0.2); hitstop = 0.04;
}

// ---------- arrows ------------------------------------------------------
function spawnArrow(x, y, z, vx, vz, owner, ownerRef) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 5).rotateX(Math.PI / 2), woodMat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 5).rotateX(Math.PI / 2), bladeMat); head.position.z = 0.7;
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.28), stdMat({ color: owner === 'player' ? 0x9fe8ff : 0xc9433a })); fl.position.z = -0.55;
  g.add(shaft, head, fl);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: owner === 'player' ? 0x7fe0ff : 0xff6a3a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(0.9); glow.position.z = 0.7; g.add(glow);
  g.position.set(x, y, z); g.rotation.y = Math.atan2(vx, vz);
  scene.add(g);
  arrows.push({ g, x, y, z, vx, vz, owner, ownerRef, life: 2.4, reflected: false });
}
function killArrow(a) { scene.remove(a.g); a.dead = true; }

function updateArrows(dt) {
  for (const a of arrows) {
    if (a.dead) continue;
    a.life -= dt;
    if (a.life <= 0) { killArrow(a); continue; }
    a.x += a.vx * dt; a.z += a.vz * dt;
    a.g.position.set(a.x, a.y, a.z);
    a.g.rotation.y = Math.atan2(a.vx, a.vz);
    if (Math.random() < 0.5) emit(a.x, a.y, a.z, 1, a.owner === 'player' || a.reflected ? 0x7fe0ff : 0xff6a3a, 0.5, 0.25, 0);
    // walls & rocks
    let hitWall = false;
    for (const c of colliders) {
      if (c.tag === 'dummy' || c.tag === 'urn') continue;
      if (Math.hypot(a.x - c.x, a.z - c.z) < c.r) { hitWall = true; break; }
    }
    const ang = Math.atan2(-a.z, a.x);
    if (Math.hypot(a.x, a.z) > caveR(ang)) hitWall = true;
    if (hitWall) { emit(a.x, a.y, a.z, 8, 0xccccbb, 3, 0.3); killArrow(a); continue; }

    if (a.owner === 'enemy' && !a.reflected) {
      const dx = a.x - player.x, dz = a.z - player.z;
      if (dx * dx + dz * dz < 0.75 * 0.75 && player.invuln <= 0 && player.dead <= 0) {
        // resolve: arrow comes from behind it, direction toward shooter
        const sx = a.x - a.vx * 0.1, sz = a.z - a.vz * 0.1;
        const r = resolveAttackOnPlayer(sx, sz);
        if (r === 'parry') {
          const ar = a.ownerRef;
          const ddx = ar.x - a.x, ddz = ar.z - a.z, l = Math.hypot(ddx, ddz);
          a.vx = (ddx / l) * 22; a.vz = (ddz / l) * 22; a.reflected = true; a.life = 2;
          a.g.children[3].material.color.set(0x9fe8ff);
          parryFx(player.x + Math.sin(player.fa) * 0.9, player.z + Math.cos(player.fa) * 0.9);
        } else if (r === 'block') { blockedFx(sx, sz); killArrow(a); }
        else if (r === 'hit') { hurtPlayer(1, sx, sz); killArrow(a); }
      }
    } else {
      for (const d of dummies) {
        if (d.reset > 0) continue;
        if (a.owner === 'enemy' && d !== a.ownerRef) continue;   // reflected arrows seek their owner
        if (a.owner === 'player' && false) continue;
        const dx = a.x - d.x, dz = a.z - d.z;
        if (dx * dx + dz * dz < 0.85 * 0.85) {
          const l = Math.hypot(a.vx, a.vz);
          if (a.reflected) {
            damageDummy(d, PARRY_DAMAGE, a.vx / l, a.vz / l, { big: true });
            stunDummy(d, PARRY_STUN);
            hitstop = 0.1; shake = Math.max(shake, 0.5);
            pop(d.x, 3.9, d.z, 'STUNNED', '#9fe0ff', 17);
          } else damageDummy(d, 1, a.vx / l, a.vz / l);
          killArrow(a); break;
        }
      }
    }
  }
  for (let i = arrows.length - 1; i >= 0; i--) if (arrows[i].dead) arrows.splice(i, 1);
}

// ---------- dummy AI ----------------------------------------------------
function updateDummy(d, dt) {
  // wobble spring
  d.tvx += (-d.tiltX * 60 - d.tvx * 6) * dt; d.tvz += (-d.tiltZ * 60 - d.tvz * 6) * dt;
  d.tiltX += d.tvx * dt; d.tiltZ += d.tvz * dt;
  d.body.rotation.z = clamp(d.tiltX * 0.08, -0.5, 0.5); d.body.rotation.x = clamp(-d.tiltZ * 0.08, -0.5, 0.5);

  // flash
  d.flash = Math.max(0, d.flash - dt * 5);
  for (const m of d.mats) m.emissive.setRGB(d.flash * 0.9, d.flash * 0.25, d.flash * 0.1);

  d.shown = Math.max(0, d.shown - dt);

  // reset after shatter
  if (d.reset > 0) {
    d.reset -= dt;
    d.root.visible = d.reset < 1.0 ? Math.floor(d.reset * 12) % 2 === 0 : false;
    if (d.reset <= 0) { d.hp = d.maxHp; d.root.visible = true; emit(d.x, 1.2, d.z, 24, 0x9fe8ff, 5, 0.8, 0, 1); pop(d.x, 3.3, d.z, 'Restored', '#9fe0ff', 17); }
    return;
  }

  // stun stars
  if (d.stun > 0) {
    d.stun -= dt; d.stars.visible = true;
    d.stars.children.forEach((s, i) => { const a = timeNow * 7 + (i / 3) * TAU; s.position.set(Math.cos(a) * 0.6, Math.sin(a * 1.3) * 0.08, Math.sin(a) * 0.6); });
    d.body.rotation.z += Math.sin(timeNow * 18) * 0.06;
    d.head.rotation.z = Math.sin(timeNow * 6) * 0.35;
    if (d.stun <= 0) { d.stars.visible = false; d.head.rotation.z = 0; }
    if (d.parts.arm) d.parts.arm.rotation.x = damp(d.parts.arm.rotation.x, 0.9, 8, dt);
    if (d.swordGlow) d.swordGlow.opacity = 0;
    if (d.bowGlow) d.bowGlow.opacity = 0;
    return;
  }

  const dx = player.x - d.x, dz = player.z - d.z, dist = Math.hypot(dx, dz);
  const toPlayer = Math.atan2(dx, dz);

  if (d.kind === 'sword') {
    const arm = d.parts.arm;
    if (d.state === 'idle') {
      if (dist < 11 && player.dead <= 0) d.face += clamp(angDiff(toPlayer, d.face), -3 * dt, 3 * dt);
      arm.rotation.x = damp(arm.rotation.x, -1.25, 8, dt); arm.rotation.y = damp(arm.rotation.y, 0, 8, dt);
      d.swordGlow.opacity = damp(d.swordGlow.opacity, 0, 10, dt);
      d.cd -= dt;
      if (d.cd <= 0 && dist < 3.9 && player.dead <= 0) { d.state = 'windup'; d.st = 0; Sfx.windup(); }
    } else if (d.state === 'windup') {
      d.st += dt;
      d.face += clamp(angDiff(toPlayer, d.face), -1.2 * dt, 1.2 * dt);
      const k = clamp(d.st / 0.75, 0, 1);
      arm.rotation.x = lerp(-1.25, -2.5, k * k); arm.rotation.y = 0;
      d.swordGlow.opacity = 0.2 + 0.7 * k * (0.7 + 0.3 * Math.sin(timeNow * 40));
      d.eyeMat.color.setRGB(1, 0.35 + 0.65 * k, 0.1);
      if (d.st >= 0.75) { d.state = 'strike'; d.st = 0; strikeSword(d); }
    } else if (d.state === 'strike') {
      d.st += dt;
      arm.rotation.x = lerp(-2.5, 0.35, clamp(d.st / 0.14, 0, 1));
      d.swordGlow.opacity = 0.9 * (1 - d.st / 0.3);
      if (d.st >= 0.32) { d.state = 'recover'; d.st = 0; }
    } else if (d.state === 'recover') {
      d.st += dt;
      arm.rotation.x = damp(arm.rotation.x, -1.25, 5, dt);
      d.eyeMat.color.setRGB(1, 0.35, 0.16);
      if (d.st >= 0.6) { d.state = 'idle'; d.cd = rand(0.7, 1.4); }
    }
    d.yaw.rotation.y = d.face;
  } else if (d.kind === 'archer') {
    const arm = d.parts.arm;
    if (d.state === 'idle') {
      if (dist < 20 && player.dead <= 0) d.face += clamp(angDiff(toPlayer, d.face), -2.2 * dt, 2.2 * dt);
      arm.rotation.x = damp(arm.rotation.x, 0, 8, dt);
      arm.rotation.y = damp(arm.rotation.y, 0, 8, dt);
      d.aim.material.opacity = 0; d.nock.visible = false; d.bowGlow.opacity = damp(d.bowGlow.opacity, 0, 10, dt);
      d.cd -= dt;
      if (d.cd <= 0 && dist < 19 && dist > 3 && player.dead <= 0) { d.state = 'windup'; d.st = 0; Sfx.bow(); }
    } else if (d.state === 'windup') {
      d.st += dt;
      d.face += clamp(angDiff(toPlayer, d.face), -2.4 * dt, 2.4 * dt);
      const k = clamp(d.st / 1.0, 0, 1);
      d.nock.visible = true; d.nock.position.z = lerp(0.5, -0.1, k);
      d.bowGlow.opacity = 0.15 + 0.5 * k;
      d.eyeMat.color.setRGB(1, 0.35 + 0.65 * k, 0.1);
      // aim line (locks direction in last 0.25 s)
      if (d.st < 0.75) { d.aimDirX = Math.sin(d.face); d.aimDirZ = Math.cos(d.face); }
      const L = Math.min(dist + 1, 20);
      d.aim.position.set(d.x + d.aimDirX * 1.2, 0.08, d.z + d.aimDirZ * 1.2);
      d.aim.rotation.y = Math.atan2(d.aimDirX, d.aimDirZ);
      d.aim.scale.set(1, 1, L);
      d.aim.material.opacity = 0.15 + 0.5 * k * (0.6 + 0.4 * Math.sin(timeNow * 35));
      if (d.st >= 1.0) {
        d.state = 'recover'; d.st = 0;
        d.nock.visible = false; d.aim.material.opacity = 0;
        const ax = d.aimDirX, az = d.aimDirZ;
        spawnArrow(d.x + ax * 1.5, 1.7, d.z + az * 1.5, ax * 13, az * 13, 'enemy', d);
        Sfx.shoot();
        emit(d.x + ax * 1.5, 1.7, d.z + az * 1.5, 8, 0xff9a5a, 4, 0.3, 0);
      }
    } else if (d.state === 'recover') {
      d.st += dt; d.bowGlow.opacity = damp(d.bowGlow.opacity, 0, 12, dt);
      d.eyeMat.color.setRGB(1, 0.35, 0.16);
      if (d.st >= 0.5) { d.state = 'idle'; d.cd = rand(1.0, 1.8); }
    }
    d.yaw.rotation.y = d.face;
  } else {
    d.yaw.rotation.y = d.face + Math.sin(timeNow * 0.8 + d.x) * 0.03;
  }
}

function strikeSword(d) {
  // arc in front of the dummy, range 3.4, +-65 degrees
  const dx = player.x - d.x, dz = player.z - d.z, dist = Math.hypot(dx, dz);
  const a = Math.atan2(dx, dz);
  emit(d.x + Math.sin(d.face) * 2.2, 0.6, d.z + Math.cos(d.face) * 2.2, 10, 0xffb070, 4, 0.3);
  shake = Math.max(shake, 0.12);
  if (dist > 3.5 || Math.abs(angDiff(a, d.face)) > 1.15) return;     // whiffed
  const r = resolveAttackOnPlayer(d.x, d.z);
  if (r === 'parry') {
    parryFx(player.x + Math.sin(player.fa) * 0.9, player.z + Math.cos(player.fa) * 0.9);
    const l = dist || 1;
    damageDummy(d, PARRY_DAMAGE, dx / -l, dz / -l, { big: true });
    if (d.reset <= 0) { stunDummy(d, PARRY_STUN); pop(d.x, 3.9, d.z, 'STUNNED', '#9fe0ff', 17); }
  } else if (r === 'block') blockedFx(d.x, d.z);
  else if (r === 'hit') hurtPlayer(1, d.x, d.z);
}

// ---------- player update -----------------------------------------------
function updatePlayer(dt) {
  const P = player;
  const move = moveInput();

  if (P.dead > 0) {
    P.dead -= dt;
    if (P.dead <= 0) {
      P.lives = MAX_LIVES; P.stamina = 100; P.x = 0; P.z = 3; P.invuln = 1.5; P.knock.x = P.knock.z = 0;
      $('banner').style.opacity = 0; updateHud();
      emit(P.x, 1.2, P.z, 40, 0xffd77a, 6, 0.8, 0, 1);
    }
    return;
  }

  P.invuln = Math.max(0, P.invuln - dt);
  P.slashCd = Math.max(0, P.slashCd - dt);
  P.rollCd = Math.max(0, P.rollCd - dt);
  P.blockCd = Math.max(0, P.blockCd - dt);
  P.bowCd = Math.max(0, P.bowCd - dt);
  P.bowAnim = Math.max(0, P.bowAnim - dt);
  P.queuedSlash = Math.max(0, P.queuedSlash - dt);

  // buffered block press
  if (mouse.down[2] && !P.blocking && P.blockCd <= 0 && P.slashT < 0 && P.rollT < 0) { P.blocking = true; P.blockTime = 0; }
  if (P.blocking) P.blockTime += dt;
  if (!mouse.down[2] && P.blocking) { P.blocking = false; P.blockCd = 0.25; }

  // slash start
  if (P.queuedSlash > 0 && P.slashT < 0 && P.slashCd <= 0 && !P.blocking && P.rollT < 0) {
    P.slashT = 0; P.slashDone = false; P.slashCd = SLASH_TIME + 0.05; P.queuedSlash = 0;
    slashFxFlip *= -1;
    Sfx.slash();
  }

  // facing
  // attacks, blocks and arrows all go the way the character is looking (his movement direction)
  if (P.slashT < 0 && P.rollT < 0 && (move.x || move.z)) P.fa += angDiff(Math.atan2(move.x, move.z), P.fa) * Math.min(1, dt * 20);

  // speed
  const wantRun = (keys.ShiftLeft || keys.ShiftRight) && (move.x || move.z) && !P.exhausted && P.stamina > 0 && !P.blocking && P.slashT < 0;
  let speed = wantRun ? 8.2 : 5.0;
  if (P.blocking) speed *= 0.55;
  if (P.slashT >= 0) speed *= 0.45;

  if (wantRun) { P.stamina -= 26 * dt; P.staminaDelay = 0.6; if (P.stamina <= 0) { P.stamina = 0; P.exhausted = true; } }
  else { P.staminaDelay -= dt; if (P.staminaDelay <= 0) P.stamina = Math.min(100, P.stamina + 24 * dt); if (P.exhausted && P.stamina > 30) P.exhausted = false; }

  // velocity
  let tvx = move.x * speed, tvz = move.z * speed;
  if (P.rollT >= 0) {
    P.rollT += dt;
    const k = P.rollT / ROLL_TIME;
    const sp = 12.5 * (1 - k * 0.5);
    tvx = P.rollDirX * sp; tvz = P.rollDirZ * sp;
    P.vx = tvx; P.vz = tvz;
    if (P.rollT >= ROLL_TIME) { P.rollT = -1; P.rollCd = 0.15; }
  } else {
    P.vx = damp(P.vx, tvx, 18, dt); P.vz = damp(P.vz, tvz, 18, dt);
  }
  P.knock.x = damp(P.knock.x, 0, 9, dt); P.knock.z = damp(P.knock.z, 0, 9, dt);
  P.x += (P.vx + P.knock.x) * dt; P.z += (P.vz + P.knock.z) * dt;
  pushOut(P, 0.5);

  // slash progression
  if (P.slashT >= 0) {
    P.slashT += dt;
    if (!P.slashDone && P.slashT >= 0.09) { P.slashDone = true; doSlashHit(); }
    if (P.slashT >= SLASH_TIME) P.slashT = -1;
  }

  // magic regen
  if (P.magic < 4) { P.magicT += dt; if (P.magicT >= 5) { P.magicT = 0; P.magic++; updateHud(); } }

  // footsteps
  const spd = Math.hypot(P.vx, P.vz);
  P.moveAmt = damp(P.moveAmt, clamp(spd / 5, 0, 1.4), 12, dt);
  P.walkPhase += dt * (spd > 0.3 ? 4 + spd * 1.0 : 0);
  P.stepAcc += spd * dt;
  if (P.stepAcc > 2.0 && P.rollT < 0) { P.stepAcc = 0; Sfx.step(); }

  // interaction hint
  const b = nearestUnlit(2.8);
  hintText = b ? 'Press E to light the flame' : '';

  updateHud();
}

function doSlashHit() {
  const P = player;
  const range = 2.8, arc = 1.3;
  emit(P.x + Math.sin(P.fa) * 1.6, 1.1, P.z + Math.cos(P.fa) * 1.6, 5, 0xfff1c8, 3, 0.25, 0);
  slashFxT = 0.2; slashFx.rotation.y = P.fa - Math.PI / 2;     // ring starts along +x
  slashFx.position.set(P.x, 1.0, P.z);
  P.knock.x += Math.sin(P.fa) * 2.5; P.knock.z += Math.cos(P.fa) * 2.5;
  let hit = false;
  for (const d of dummies) {
    if (d.reset > 0) continue;
    const dx = d.x - P.x, dz = d.z - P.z, dist = Math.hypot(dx, dz);
    if (dist > range + d.r) continue;
    if (Math.abs(angDiff(Math.atan2(dx, dz), P.fa)) > arc) continue;
    damageDummy(d, SLASH_DAMAGE, dx / dist, dz / dist);
    hit = true;
  }
  for (const b of braziers) {
    if (b.lit) continue;
    const dx = b.x - P.x, dz = b.z - P.z, dist = Math.hypot(dx, dz);
    if (dist < range + 0.6 && Math.abs(angDiff(Math.atan2(dx, dz), P.fa)) < arc) lightBrazier(b);
  }
  if (hit) { hitstop = 0.05; shake = Math.max(shake, 0.18); }
}

// ---------- animation ---------------------------------------------------
function animatePlayer(dt) {
  const P = player, S = pl.S;
  pl.root.position.set(P.x, 0, P.z);
  pl.model.rotation.y = P.fa;

  const walk = Math.sin(P.walkPhase * 1.0) * 0.8 * clamp(P.moveAmt, 0, 1);
  S.legL.rotation.x = walk; S.legR.rotation.x = -walk;
  const bob = Math.abs(Math.sin(P.walkPhase)) * 0.12 * clamp(P.moveAmt, 0, 1) + Math.sin(timeNow * 2) * 0.012;
  pl.rig.position.y = -1.5 + bob;

  // lean into movement
  const lean = clamp(P.moveAmt, 0, 1.3) * 0.12;
  pl.pivot.rotation.x = P.rollT >= 0 ? (P.rollT / ROLL_TIME) * TAU : lean;
  pl.pivot.position.y = P.rollT >= 0 ? 1.0 : 1.5;
  pl.rig.position.y += P.rollT >= 0 ? 0.5 : 0;

  // sword
  const sw = S.sword;
  let rx = -1.95, ry = -0.2, rz = 0;
  if (P.slashT >= 0) {
    const t = P.slashT;
    const side = slashFxFlip;
    if (t < 0.09) { const k = t / 0.09; rx = lerp(-1.95, -0.25, k); ry = lerp(-0.2, -1.4 * side, k); }
    else if (t < 0.21) { const k = (t - 0.09) / 0.12; rx = -0.25; ry = lerp(-1.4 * side, 1.4 * side, 1 - Math.pow(1 - k, 3)); }
    else { const k = (t - 0.21) / (SLASH_TIME - 0.21); rx = lerp(-0.25, -1.95, k); ry = lerp(1.4 * side, -0.2, k); }
  } else if (P.bowAnim > 0) { rx = -0.2; ry = -0.1; }
  else if (P.rollT >= 0) { rx = -1.2; ry = 0; }
  sw.rotation.set(rx, ry, rz);

  // shield
  const target = P.blocking ? 1 : 0;
  P.guardRaise = damp(P.guardRaise, target, 22, dt);
  const g = P.guardRaise;
  S.shield.position.set(lerp(1.15, 0.2, g), lerp(1.55, 2.15, g), lerp(0.2, 1.05, g));
  // disc axis is x -> turn it to face forward when guarding
  S.shield.rotation.y = lerp(0, -Math.PI / 2, g);
  S.shieldArm.rotation.set(-1.25 * g, -0.55 * g, 0);
  const inWindow = P.blocking && P.blockTime <= PARRY_WINDOW;
  S.shieldGlowMat.opacity = inWindow ? 0.85 : damp(S.shieldGlowMat.opacity, 0, 14, dt);

  // eye: blink + look
  const blink = (timeNow % 4.2) < 0.12 ? 0.1 : 1;
  S.eye.scale.y = damp(S.eye.scale.y, blink, 40, dt);
  S.pupil.position.x = damp(S.pupil.position.x, 0, 8, dt);

  // invulnerability blink
  const vis = !(P.invuln > 0 && P.rollT < 0 && Math.floor(timeNow * 18) % 2 === 0);
  pl.root.visible = vis;

  // gem pulse
  gemMat.emissiveIntensity = 1.4 + Math.sin(timeNow * 3) * 0.5 + (P.blocking ? 0.6 : 0);

  // light follows
  playerLight.position.set(P.x, 4.2, P.z);
  playerLight.intensity = 5.5 + Math.sin(timeNow * 5) * 0.6 + (parryFlash * 25);

  // slash arc fx
  if (slashFxT > 0) {
    slashFxT -= dt; slashFx.material.opacity = clamp(slashFxT / 0.2, 0, 1) * 0.75;
    slashFx.scale.set(1, 1, 1);
  } else slashFx.material.opacity = 0;
}

function animateWorld(dt) {
  let lit = 0;
  for (const b of braziers) {
    if (b.lit) { b.t = Math.min(1, b.t + dt * 1.6); lit++; }
    const f = 0.85 + Math.sin(timeNow * 11 + b.phase) * 0.08 + Math.sin(timeNow * 27 + b.phase * 2) * 0.06;
    b.light.intensity = b.t * 34 * f + (b.lit ? 0 : 0.8);
    b.light.color.setHSL(0.07 + Math.sin(timeNow * 3 + b.phase) * 0.005, 1, 0.58);
    b.flame.visible = b.flame2.visible = b.t > 0.01;
    const s = b.t * (1.35 + Math.sin(timeNow * 13 + b.phase) * 0.12);
    b.flame.scale.set(s * 1.2, s * 2.2, 1);
    b.flame2.scale.set(s * 0.8, s * 1.7 * (0.9 + Math.sin(timeNow * 19 + b.phase) * 0.1), 1);
    b.halo.scale.setScalar(b.t * 6 * f);
    b.coals.material.emissiveIntensity = 0.25 + b.t * 2.4;
    if (b.lit && Math.random() < dt * 14) emit(b.x + rand(-0.2, 0.2), 1.3, b.z + rand(-0.2, 0.2), 1, 0xffa050, 0.8, 1.1, -0.8, 1.5);
  }
  const frac = lit / braziers.length;
  runeMat.opacity = 0.14 + frac * 0.7 + Math.sin(timeNow * 1.5) * 0.04;
  hemi.intensity = 1.0 + frac * 0.3;
  bloom.strength = 0.62 + frac * 0.12;
  scene.fog.density = 0.014 - frac * 0.004;

  // drifting motes around the player
  const pa = motes.geometry.attributes.position;
  for (let i = 0; i < MOTES; i++) {
    const s = moteSeed[i];
    pa.array[i * 3] += Math.sin(timeNow * 0.3 + s) * dt * 0.25;
    pa.array[i * 3 + 1] += Math.cos(timeNow * 0.4 + s * 2) * dt * 0.2;
    pa.array[i * 3 + 2] += Math.cos(timeNow * 0.25 + s * 3) * dt * 0.25;
    if (pa.array[i * 3 + 1] > 5.5) pa.array[i * 3 + 1] = 0.2;
    if (pa.array[i * 3 + 1] < 0.1) pa.array[i * 3 + 1] = 5;
  }
  pa.needsUpdate = true;
}

// ---------- HUD ---------------------------------------------------------
const livesEl = $('lives'), magicEl = $('magic'), stamEl = $('stam'), hintEl = $('hint');
for (let i = 0; i < MAX_LIVES; i++) { const d = document.createElement('div'); d.className = 'life'; livesEl.appendChild(d); }
for (let i = 0; i < 4; i++) { const d = document.createElement('div'); d.className = 'gem'; magicEl.appendChild(d); }
let _hudSig = '';
function updateHud() {
  const sig = player.lives + '|' + player.magic;
  if (sig !== _hudSig) {
    _hudSig = sig;
    [...livesEl.children].forEach((el, i) => el.classList.toggle('off', i >= player.lives));
    [...magicEl.children].forEach((el, i) => el.classList.toggle('off', i >= player.magic));
  }
  stamEl.firstElementChild.style.width = player.stamina + '%';
  stamEl.classList.toggle('low', player.exhausted);
  if (hintEl.textContent !== hintText) { hintEl.textContent = hintText; hintEl.style.opacity = hintText ? 1 : 0; }
}
function updateLightHud() {
  const n = braziers.filter((b) => b.lit).length;
  $('lights').innerHTML = `LIGHTS &nbsp;<b>${n} / ${braziers.length}</b><br><span style="font-size:14px;color:#aab4be">PARRIES</span> <b style="font-size:16px">${player.parries}</b>`;
}
updateLightHud(); updateHud();

function updateBars() {
  for (const d of dummies) {
    const [sx, sy, vis] = worldToScreen(d.x, 3.55, d.z);
    const near = Math.hypot(d.x - player.x, d.z - player.z) < 17;
    if (!vis || !near) { d.bar.style.display = 'none'; continue; }
    d.bar.style.display = 'block'; d.bar.style.left = sx + 'px'; d.bar.style.top = sy + 'px';
    d.bar.firstChild.style.width = (d.hp / d.maxHp) * 100 + '%';
    d.bar.lastChild.textContent = d.name + '  ' + d.hp + '/' + d.maxHp;
    d.bar.lastChild.style.opacity = d.shown > 0 || Math.hypot(d.x - player.x, d.z - player.z) < 9 ? 1 : 0.55;
    d.bar.style.opacity = d.reset > 0 ? 0.3 : 1;
  }
}

// ---------- camera ------------------------------------------------------
const camTarget = new THREE.Vector3(0, 0, 3);
function updateCamera(dt, rawDt) {
  const look = new THREE.Vector3(player.x, 0.8, player.z);
  camTarget.x = damp(camTarget.x, look.x, 6, rawDt); camTarget.z = damp(camTarget.z, look.z, 6, rawDt);
  const horiz = Math.cos(CAM_PITCH) * CAM_DIST, vert = Math.sin(CAM_PITCH) * CAM_DIST;
  camera.position.set(camTarget.x + Math.sin(CAM_YAW) * horiz, vert, camTarget.z + Math.cos(CAM_YAW) * horiz);
  if (shake > 0) { camera.position.x += rand(-1, 1) * shake * 0.35; camera.position.y += rand(-1, 1) * shake * 0.35; camera.position.z += rand(-1, 1) * shake * 0.35; shake = Math.max(0, shake - rawDt * 2.5); }
  camera.lookAt(camTarget.x, 0.5, camTarget.z);
  moon.position.set(player.x - 12, 22, player.z + 8); moon.target.position.set(player.x, 0, player.z);
}

// ---------- main loop ---------------------------------------------------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  let dt = rawDt;
  if (hitstop > 0) { hitstop -= rawDt; dt = 0; }
  timeNow += dt;
  parryFlash = Math.max(0, parryFlash - rawDt * 5);

  updateAim();
  if (started) {
    updatePlayer(dt);
    for (const d of dummies) updateDummy(d, dt);
    updateArrows(dt);
  } else {
    for (const d of dummies) { d.yaw.rotation.y = d.face; }
  }
  animatePlayer(dt);
  animateWorld(dt);
  updateParticles(dt);
  updatePops(rawDt);
  updateCamera(dt, rawDt);
  updateBars();
  composer.render();
}

// ---------- start -------------------------------------------------------
$('start').addEventListener('click', () => {
  Sfx.init();
  started = true;
  $('title').style.opacity = 0;
  setTimeout(() => ($('title').style.display = 'none'), 650);
});
if (location.search.includes('skip')) { started = true; $('title').style.display = 'none'; }

camera.position.set(0, 20, 30);
frame();
$('loading').style.display = 'none';

window.__game = { player, dummies, braziers, arrows, camera, scene, renderer, keys, mouse, lightBrazier, tryBow, get started() { return started; } };
