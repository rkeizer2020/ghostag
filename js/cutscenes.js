// Super Cat ultimate cutscenes. A self-contained full-screen canvas overlay
// that plays one of three hand-drawn anime finishers over the live game.
// GameScene pauses physics, calls Cutscenes.play(name, onDone), and applies the
// ability's effect when the cutscene ends (or the player taps/keys to skip).
//
// The animation code is ported from the approved design preview and draws in a
// fixed 720x405 coordinate space that is letterboxed to fit any screen.
const Cutscenes = (function () {
  "use strict";
  let reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---------- palette ----------
  const C = {
    body: '#15121c', bodyLo: '#0e0b14', ear: '#1c1826',
    eye: '#ffcf33', eyeHot: '#fff2b0', glow: '#b98fe0',
    gold: '#ffd24a', gold2: '#ffb020', spark: '#fff6d0',
    spook: '#20415e', spookHi: '#31597a', spookEye: '#bfe0ff', sword: '#ffe066',
    ui: '#8f5fd0', white: '#ffffff'
  };
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function eOut(t) { return 1 - Math.pow(1 - t, 3); }
  function eIn(t) { return t * t * t; }
  const TAU = Math.PI * 2;
  const W = 720, H = 405, GY = H * 0.62;

  // ---------- ground / backdrop ----------
  function backdrop(ctx, W, H, tint) {
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, tint || '#140f22'); g.addColorStop(.62, '#0c0a16'); g.addColorStop(1, '#070510');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(30,24,48,.6)';
    for (let i = 0; i < 9; i++) { let bw = W / 9, x = i * bw, bh = 40 + ((i * 53) % 60); ctx.fillRect(x + 4, H * 0.62 - bh, bw - 8, bh); }
    ctx.fillStyle = 'rgba(255,210,120,.25)';
    for (let j = 0; j < 40; j++) { ctx.fillRect((j * 97) % W, H * 0.62 - 8 - ((j * 37) % 50), 3, 3); }
    let gg = ctx.createLinearGradient(0, H * 0.62, 0, H);
    gg.addColorStop(0, '#241a30'); gg.addColorStop(1, '#120d1c');
    ctx.fillStyle = gg; ctx.fillRect(0, H * 0.62, W, H * 0.38);
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H * 0.62); ctx.lineTo(W, H * 0.62); ctx.stroke();
  }

  // ---------- the cat ----------
  function drawCat(ctx, x, y, s, opts) {
    opts = opts || {}; let sup = opts.sup;
    ctx.save(); ctx.translate(x, y); ctx.scale((opts.flip ? -1 : 1) * s, s);
    let sx = opts.squashX || 1, sy = opts.squashY || 1; ctx.scale(sx, sy);

    if (sup && opts.auraT != null) {
      let a = opts.auraT;
      let pulse = 0.5 + 0.5 * Math.sin(a * 10);
      let rg = ctx.createRadialGradient(0, -4, 6, 0, -4, 52);
      rg.addColorStop(0, 'rgba(255,240,180,' + (0.20 + 0.15 * pulse) + ')');
      rg.addColorStop(0.5, 'rgba(255,176,32,' + (0.18 + 0.12 * pulse) + ')');
      rg.addColorStop(1, 'rgba(255,176,32,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, -4, 52, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,70,' + (0.5 + 0.3 * pulse) + ')';
      for (let f = 0; f < 7; f++) {
        let fa = -Math.PI / 2 + (f - 3) * 0.5; let fl = 30 + 8 * Math.sin(a * 14 + f);
        ctx.beginPath(); ctx.moveTo(Math.cos(fa) * 20, Math.sin(fa) * 20 - 4);
        ctx.lineTo(Math.cos(fa - 0.12) * (20 + fl), Math.sin(fa - 0.12) * (20 + fl) - 4);
        ctx.lineTo(Math.cos(fa + 0.12) * (20 + fl * 0.7), Math.sin(fa + 0.12) * (20 + fl * 0.7) - 4);
        ctx.closePath(); ctx.fill();
      }
    } else if (!sup) {
      let rg2 = ctx.createRadialGradient(0, -2, 4, 0, -2, 34);
      rg2.addColorStop(0, 'rgba(185,143,224,.16)'); rg2.addColorStop(1, 'rgba(185,143,224,0)');
      ctx.fillStyle = rg2; ctx.beginPath(); ctx.arc(0, -2, 34, 0, TAU); ctx.fill();
    }

    ctx.strokeStyle = C.body; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(14, 16);
    ctx.quadraticCurveTo(30, 14, 30, -2); ctx.quadraticCurveTo(30, -16, 20, -18); ctx.stroke();
    if (sup) { ctx.strokeStyle = 'rgba(255,210,74,.5)'; ctx.lineWidth = 2; ctx.stroke(); }

    ctx.fillStyle = C.body;
    ctx.beginPath(); ctx.moveTo(-15, -16); ctx.lineTo(-9, -34); ctx.lineTo(-2, -18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15, -16); ctx.lineTo(9, -34); ctx.lineTo(2, -18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sup ? '#3a2a10' : '#2a2140';
    ctx.beginPath(); ctx.moveTo(-12, -19); ctx.lineTo(-9, -29); ctx.lineTo(-5, -19); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, -19); ctx.lineTo(9, -29); ctx.lineTo(5, -19); ctx.closePath(); ctx.fill();

    let bg = ctx.createLinearGradient(0, -18, 0, 26);
    bg.addColorStop(0, C.body); bg.addColorStop(1, C.bodyLo);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, -4, 17, Math.PI, 0);
    ctx.lineTo(17, 18);
    ctx.lineTo(11, 24); ctx.lineTo(5, 18); ctx.lineTo(0, 24); ctx.lineTo(-5, 18); ctx.lineTo(-11, 24); ctx.lineTo(-17, 18);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = sup ? 'rgba(255,220,120,.6)' : 'rgba(150,120,190,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -4, 17, Math.PI, 0); ctx.stroke();

    if (sup) {
      let spikes = [[-14, -14, -20, -40], [-8, -18, -10, -46], [0, -19, 0, -50], [8, -18, 10, -46], [14, -14, 20, -40], [-4, -18, -4, -48], [4, -18, 4, -48]];
      let hg = ctx.createLinearGradient(0, -50, 0, -14);
      hg.addColorStop(0, '#fff2b0'); hg.addColorStop(0.5, C.gold); hg.addColorStop(1, C.gold2);
      ctx.fillStyle = hg;
      for (let h = 0; h < spikes.length; h++) {
        let sp = spikes[h];
        ctx.beginPath(); ctx.moveTo(sp[0] - 6, sp[1]); ctx.lineTo(sp[2], sp[3]); ctx.lineTo(sp[0] + 6, sp[1]); ctx.closePath(); ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(-16, -8); ctx.lineTo(-26, -24); ctx.lineTo(-13, -14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, -8); ctx.lineTo(26, -24); ctx.lineTo(13, -14); ctx.closePath(); ctx.fill();
    }

    let eg = opts.eyeGlow != null ? opts.eyeGlow : (sup ? 1 : 0.6);
    let er = sup ? 4.2 : 3.6;
    ctx.fillStyle = 'rgba(255,207,51,' + (0.5 * eg) + ')';
    ctx.beginPath(); ctx.arc(-6, -4, er + 3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -4, er + 3, 0, TAU); ctx.fill();
    ctx.fillStyle = sup ? C.eyeHot : C.eye;
    ctx.beginPath(); ctx.ellipse(-6, -4, er, er + 1.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -4, er, er + 1.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1206';
    ctx.beginPath(); ctx.ellipse(-6, -4, 1.1, er, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -4, 1.1, er, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = sup ? '#ffb0c0' : '#c98fb0'; ctx.beginPath();
    ctx.moveTo(0, 2); ctx.lineTo(-2, 0.4); ctx.lineTo(2, 0.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(230,225,245,.7)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(-16, 1); ctx.moveTo(-3, 4); ctx.lineTo(-15, 6);
    ctx.moveTo(3, 3); ctx.lineTo(16, 1); ctx.moveTo(3, 4); ctx.lineTo(15, 6); ctx.stroke();

    if (opts.punchArm) {
      let pa = opts.punchArm;
      ctx.fillStyle = C.body;
      ctx.save(); ctx.translate(14, 4);
      ctx.beginPath(); ctx.ellipse(pa * 16, 0, 7 + pa * 3, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,210,74,' + (0.4 + 0.4 * pa) + ')';
      ctx.beginPath(); ctx.arc(pa * 16, 0, 9 + pa * 4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- the spook ----------
  function drawSpook(ctx, x, y, s, opts) {
    opts = opts || {}; ctx.save(); ctx.translate(x, y);
    if (opts.spin) { ctx.rotate(opts.spin); }
    ctx.scale((opts.flip ? -1 : 1) * s, s);
    if (!opts.noSword) {
      ctx.save(); ctx.translate(0, -30); ctx.rotate(opts.swordAng || 0);
      ctx.fillStyle = C.sword; ctx.fillRect(-2, -20, 4, 20);
      ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(4, -20); ctx.lineTo(0, -30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a5a1a'; ctx.fillRect(-5, 0, 10, 3);
      ctx.restore();
    }
    let bg = ctx.createLinearGradient(0, -20, 0, 24);
    bg.addColorStop(0, C.spookHi); bg.addColorStop(1, C.spook);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, -2, 18, Math.PI, 0); ctx.lineTo(18, 20);
    ctx.lineTo(12, 26); ctx.lineTo(6, 20); ctx.lineTo(0, 26); ctx.lineTo(-6, 20); ctx.lineTo(-12, 26); ctx.lineTo(-18, 20);
    ctx.closePath(); ctx.fill();
    let ec = opts.stunned ? '#ffe066' : C.spookEye;
    ctx.fillStyle = ec;
    if (opts.stunned) {
      ctx.strokeStyle = ec; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-3, 0); ctx.moveTo(-3, -6); ctx.lineTo(-9, 0);
      ctx.moveTo(3, -6); ctx.lineTo(9, 0); ctx.moveTo(9, -6); ctx.lineTo(3, 0); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(-6, -3, 2.4, 3.4, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, -3, 2.4, 3.4, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- effects ----------
  function horizSpeed(ctx, W, H, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 2;
    for (let i = 0; i < 22; i++) {
      let y = (i * i * 13 + Math.random() * 8) % H; let len = 60 + Math.random() * 220;
      let x = Math.random() * W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len, y); ctx.stroke();
    }
    ctx.restore();
  }
  function impactStar(ctx, x, y, r, color) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.beginPath();
    let pts = 14;
    for (let i = 0; i < pts * 2; i++) {
      let rr = (i % 2 ? r * 0.42 : r) * (0.85 + Math.random() * 0.3);
      let a = i / (pts * 2) * TAU; let px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function shock(ctx, x, y, r, color, alpha) {
    if (r <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function burstText() { return; } // text removed from all cutscenes
  function scoreText() { return; } // text removed from all cutscenes
  function vignette(ctx, W, H) {
    let g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ============ CUTSCENE 1 — COMET PAW ============
  function fistPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-96, -24);
    ctx.bezierCurveTo(-106, 24, -96, 50, -72, 58);
    ctx.bezierCurveTo(-62, 70, -42, 70, -33, 58);
    ctx.bezierCurveTo(-24, 70, -4, 70, 5, 58);
    ctx.bezierCurveTo(14, 70, 34, 70, 43, 58);
    ctx.bezierCurveTo(52, 70, 72, 68, 82, 56);
    ctx.bezierCurveTo(104, 46, 108, 16, 98, -14);
    ctx.bezierCurveTo(92, -46, 58, -56, 0, -56);
    ctx.bezierCurveTo(-58, -56, -92, -50, -96, -24);
    ctx.closePath();
  }
  function goldFist(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    let g = ctx.createRadialGradient(0, -10, 20, 0, -10, 200);
    g.addColorStop(0, 'rgba(255,232,150,.55)'); g.addColorStop(.6, 'rgba(255,180,40,.22)'); g.addColorStop(1, 'rgba(255,180,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -10, 200, 0, TAU); ctx.fill();
    let wg = ctx.createLinearGradient(-40, -60, 30, 60);
    wg.addColorStop(0, '#fff3c6'); wg.addColorStop(.45, '#ffcf4a'); wg.addColorStop(1, '#a86a12');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(-98, 6, 22, 30, 0.28, 0, TAU); ctx.fill();
    ctx.save(); ctx.shadowColor = 'rgba(150,90,0,.55)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    ctx.fillStyle = wg; fistPath(ctx); ctx.fill(); ctx.restore();
    ctx.save(); fistPath(ctx); ctx.clip();
    let rg = ctx.createRadialGradient(-34, -40, 6, -6, -20, 150);
    rg.addColorStop(0, 'rgba(255,255,238,.7)'); rg.addColorStop(1, 'rgba(255,255,238,0)');
    ctx.fillStyle = rg; ctx.fillRect(-120, -80, 240, 160);
    let sg = ctx.createLinearGradient(0, 20, 0, 64);
    sg.addColorStop(0, 'rgba(110,60,0,0)'); sg.addColorStop(1, 'rgba(90,45,0,.5)');
    ctx.fillStyle = sg; ctx.fillRect(-120, 12, 240, 80);
    ctx.strokeStyle = 'rgba(150,90,10,.28)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-70, 38); ctx.quadraticCurveTo(0, 24, 82, 38); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,90,10,.35)'; ctx.lineWidth = 5;
    [-33, 5, 43].forEach(function (fx) { ctx.beginPath(); ctx.moveTo(fx, 26); ctx.quadraticCurveTo(fx - 2, 46, fx, 60); ctx.stroke(); });
    ctx.restore();
    ctx.restore();
  }
  function bigEye(ctx, x, y, dir, angry) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(dir * angry * 0.3);
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 21, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  function catCloseFace(ctx, cx, cy, sc, glow, angry) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    let hg = ctx.createLinearGradient(0, -78, 0, -6); hg.addColorStop(0, '#fff2b0'); hg.addColorStop(.5, C.gold); hg.addColorStop(1, C.gold2);
    ctx.fillStyle = hg;
    let sp = [-62, -42, -22, -2, 18, 38, 58];
    for (let i = 0; i < sp.length; i++) {
      let x = sp[i], up = 52 + ((i * 17) % 22), tip = x + (i - 3) * 5;
      ctx.beginPath(); ctx.moveTo(x - 18, -2);
      ctx.quadraticCurveTo(x - 6, -4 - up * 0.7, tip, -4 - up);
      ctx.quadraticCurveTo(x + 8, -4 - up * 0.7, x + 18, -2);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = C.body;
    ctx.beginPath(); ctx.moveTo(-54, -4); ctx.lineTo(-46, -42); ctx.lineTo(-30, -6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(54, -4); ctx.lineTo(46, -42); ctx.lineTo(30, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,207,51,' + (0.6 * glow) + ')';
    ctx.beginPath(); ctx.arc(-28, 12, 24, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(28, 12, 24, 0, TAU); ctx.fill();
    ctx.fillStyle = C.eyeHot; bigEye(ctx, -28, 12, 1, angry); bigEye(ctx, 28, 12, -1, angry);
    ctx.fillStyle = '#1a1206';
    ctx.beginPath(); ctx.ellipse(-28, 12, 3, 15, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(28, 12, 3, 15, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.gold2; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-48, -4 - angry * 2); ctx.lineTo(-12, 6); ctx.moveTo(48, -4 - angry * 2); ctx.lineTo(12, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,225,245,.6)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-14, 30); ctx.lineTo(-58, 26); ctx.moveTo(-14, 34); ctx.lineTo(-56, 40);
    ctx.moveTo(14, 30); ctx.lineTo(58, 26); ctx.moveTo(14, 34); ctx.lineTo(56, 40); ctx.stroke();
    ctx.restore();
  }
  function rocks(ctx, x, y, k) {
    for (let r = 0; r < 3; r++) { shock(ctx, x, y, k * 160 - r * 38, 'rgba(255,255,255,' + clamp(1 - k, 0, 1) + ')', clamp(1 - k, 0, 1) * 0.7); }
    let n = 16;
    for (let i = 0; i < n; i++) {
      let a = i / n * TAU + i; let d = k * 185 * (0.6 + ((i * 13) % 40) / 40);
      let rx = x + Math.cos(a) * d, ry = y + Math.sin(a) * d * 0.7 - Math.sin(k * Math.PI) * 44;
      ctx.save(); ctx.translate(rx, ry); ctx.rotate(a + k * 8); ctx.fillStyle = i % 3 ? '#b9b2a6' : '#8a8478';
      let sz = 5 + ((i * 7) % 8); ctx.fillRect(-sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
  }
  function flare(ctx, x, y, r, color) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(x - r * 1.7, y); ctx.lineTo(x + r * 1.7, y); ctx.moveTo(x, y - r * 1.7); ctx.lineTo(x, y + r * 1.7); ctx.stroke();
    ctx.restore();
  }
  function embers(ctx, cx, cy, t, color, spread) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = color;
    for (let i = 0; i < 26; i++) {
      let a = i * 2.399; let life = (t * 120 + i * 33) % 300;
      let x = cx + Math.cos(a) * (spread || 70) * (0.3 + life / 300) + Math.sin(life * 0.05 + i) * 8;
      let y = cy - life * 1.0; let al = clamp(1 - life / 300, 0, 1);
      ctx.globalAlpha = al * 0.9; let s = 1 + (i % 3); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function sparksBurst(ctx, cx, cy, p, color) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      let a = i * (TAU / 22) + i * 0.7; let r0 = p * 50, r1 = p * (150 + ((i * 37) % 80));
      ctx.globalAlpha = clamp(1 - p, 0, 1); ctx.lineWidth = 4 - (i % 3);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
  }
  function speedBurst(ctx, cx, cy, t, color, alpha) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    let N = 46, maxR = 680;
    for (let i = 0; i < N; i++) {
      let a = (i / N) * TAU + (i % 2 ? 0.02 : -0.02);
      let seed = (i * 0.137) % 1;
      let phase = ((t * 1.9) + seed) % 1;
      let outer = phase * maxR;
      let len = 60 + phase * 320;
      let inner = Math.max(0, outer - len);
      let ca = Math.cos(a), sa = Math.sin(a);
      let w = 1 + phase * 8;
      ctx.globalAlpha = (alpha || 0.9) * clamp(phase * 1.3, 0, 1);
      ctx.strokeStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(cx + ca * inner, cy + sa * inner); ctx.lineTo(cx + ca * outer, cy + sa * outer); ctx.stroke();
      ctx.globalAlpha = (alpha || 0.9) * clamp(phase, 0, 1); ctx.strokeStyle = 'rgba(255,252,230,1)'; ctx.lineWidth = Math.max(1, w * 0.4);
      ctx.beginPath(); ctx.moveTo(cx + ca * (outer - len * 0.35), cy + sa * (outer - len * 0.35)); ctx.lineTo(cx + ca * outer, cy + sa * outer); ctx.stroke();
    }
    ctx.restore();
  }
  function twinkle(ctx, x, y, r, color) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
    ctx.moveTo(x - r * 0.6, y - r * 0.6); ctx.lineTo(x + r * 0.6, y + r * 0.6); ctx.moveTo(x - r * 0.6, y + r * 0.6); ctx.lineTo(x + r * 0.6, y - r * 0.6);
    ctx.stroke(); ctx.restore();
  }
  function scene1Intro(ctx, t, INTRO) {
    let k = t / INTRO;
    ctx.fillStyle = '#08060e'; ctx.fillRect(0, 0, W, H);
    let sp = ctx.createRadialGradient(W / 2, H * 0.52, 20, W / 2, H * 0.52, W * 0.55);
    sp.addColorStop(0, 'rgba(70,50,20,' + (0.25 + 0.3 * k) + ')'); sp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sp; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#130e1c'; ctx.fillRect(0, GY, W, H - GY);
    ctx.strokeStyle = 'rgba(255,200,80,.14)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.stroke();

    let cx = W / 2, cyG = GY - 30;
    ctx.save();
    let zoom = lerp(0.9, 1.55, eIn(k)); ctx.translate(cx, cyG); ctx.scale(zoom, zoom); ctx.translate(-cx, -cyG);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,200,80,.8)';
    for (let i = 0; i < 28; i++) {
      let a = i / 28 * TAU; let ph = ((t * 1.7) + (i * 0.11)) % 1; let r1 = 30 + (1 - ph) * 250; let r0 = r1 + 70;
      ctx.globalAlpha = (0.35 + 0.4 * k) * Math.sin(ph * Math.PI); ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cyG + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cyG + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
    let flut = Math.sin(t * 6) * 9;
    ctx.save(); ctx.translate(cx, cyG - 6);
    let cg = ctx.createLinearGradient(0, -30, 0, 54); cg.addColorStop(0, '#2a1a3a'); cg.addColorStop(1, '#100a1a');
    ctx.fillStyle = cg; ctx.beginPath();
    ctx.moveTo(-8, -24); ctx.quadraticCurveTo(-52 - flut, -2, -44 + flut, 52);
    ctx.quadraticCurveTo(-18, 40, 0, 54); ctx.quadraticCurveTo(18, 40, 44 - flut, 52);
    ctx.quadraticCurveTo(52 + flut, -2, 8, -24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(150,90,220,.28)'; ctx.beginPath();
    ctx.moveTo(-6, -20); ctx.quadraticCurveTo(-22, 14, -16 + flut, 46); ctx.quadraticCurveTo(0, 34, 0, 44);
    ctx.quadraticCurveTo(0, 34, 16 - flut, 46); ctx.quadraticCurveTo(22, 14, 6, -20); ctx.closePath(); ctx.fill();
    ctx.restore();
    drawCat(ctx, cx, cyG, 2.6, { sup: true, auraT: t * 1.6, eyeGlow: 1 });
    embers(ctx, cx, cyG + 22, t, 'rgba(255,205,90,.95)', 46);
    for (let cr = 0; cr < 3; cr++) { let cp = ((t * 1.15 + cr * 0.33) % 1); shock(ctx, cx, cyG - 4, cp * 130 * (0.5 + k), 'rgba(255,220,120,' + (1 - cp) * 0.55 * k + ')', (1 - cp) * 0.55 * k); }
    ctx.restore();

    if (t > INTRO - 0.45) { ctx.fillStyle = 'rgba(255,250,230,' + clamp((t - (INTRO - 0.45)) / 0.45, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
    vignette(ctx, W, H);
  }
  function scene1(ctx, t) {
    let INTRO = 2.6;
    if (t < INTRO) { scene1Intro(ctx, t, INTRO); return; }
    t -= INTRO;
    let shake = 0;
    if (t >= 3.0 && t < 3.4) shake = (t - 3.0) / 0.4 * 10;
    if (t >= 3.4 && t < 4.3) shake = (1 - (t - 3.4) / 0.9) * 22;
    if (t >= 4.2 && t < 4.5) shake = Math.max(shake, (1 - (t - 4.2) / 0.3) * 10);
    ctx.save(); ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);

    if (t < 4.2) {
      ctx.fillStyle = '#07060c'; ctx.fillRect(-40, -40, W + 80, H + 80);
      let cx = W / 2, cy = H * 0.4;
      let pulse = 0.5 + 0.5 * Math.sin(t * 9);
      let bgG = ctx.createRadialGradient(cx, cy, 20, cx, cy, W * 0.6);
      bgG.addColorStop(0, 'rgba(255,180,40,' + (0.10 + 0.10 * pulse) + ')'); bgG.addColorStop(1, 'rgba(255,180,40,0)');
      ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);
      let focalY = (t > 1.2) ? lerp(H * 0.5, H * 0.6, eOut(clamp((t - 1.2) / 2.0, 0, 1))) : cy;
      speedBurst(ctx, cx, focalY, t, 'rgba(255,205,70,0.95)', 0.9);
      embers(ctx, cx, H * 0.85, t, 'rgba(255,200,80,.9)', 180);
      for (let cr = 0; cr < 3; cr++) { let cp = ((t * 1.2 + cr * 0.33) % 1); shock(ctx, cx, cy, cp * 220, 'rgba(255,220,120,' + (1 - cp) * 0.5 + ')', (1 - cp) * 0.5); }
      let fg = clamp(t / 0.8, 0, 1), angry = clamp((t - 0.6) / 1.4, 0, 1);
      ctx.globalAlpha = fg; catCloseFace(ctx, W / 2, H * 0.33, 1.35, fg, angry); ctx.globalAlpha = 1;
      flare(ctx, W / 2 - 38, H * 0.33 + 16, 10 + 4 * pulse, 'rgba(255,240,180,.9)');
      flare(ctx, W / 2 + 38, H * 0.33 + 16, 10 + 4 * pulse, 'rgba(255,240,180,.9)');
      if (t > 1.2) {
        let k = clamp((t - 1.2) / 2.0, 0, 1);
        let fy = lerp(H * 0.5, H * 0.62, eOut(k)), fs = lerp(0.5, 2.9, eIn(k));
        for (let m = 3; m >= 1; m--) { ctx.globalAlpha = 0.14 * m * k; goldFist(ctx, W / 2, fy + m * 10 * (1 - k) + m * 4, fs * (1 - 0.05 * m)); }
        ctx.globalAlpha = 1;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        let ag = ctx.createRadialGradient(W / 2, fy, 10, W / 2, fy, 140 * fs * 0.6);
        ag.addColorStop(0, 'rgba(255,210,90,' + (0.35 * k) + ')'); ag.addColorStop(1, 'rgba(255,150,20,0)');
        ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(W / 2, fy, 140 * fs * 0.6, 0, TAU); ctx.fill(); ctx.restore();
        goldFist(ctx, W / 2, fy, fs);
      }
      if (t >= 3.4) {
        let fa = 1 - (t - 3.4) / 0.7;
        ctx.fillStyle = 'rgba(255,255,255,' + clamp(fa, 0, 1) + ')'; ctx.fillRect(-40, -40, W + 80, H + 80);
        ctx.fillStyle = 'rgba(255,220,120,' + clamp(fa * 0.6, 0, 1) + ')'; ctx.fillRect(-40, -40, W + 80, H + 80);
        let ip = (t - 3.4);
        speedBurst(ctx, W / 2, H * 0.56, t * 1.8, 'rgba(255,235,160,1)', 1);
        impactStar(ctx, W / 2, H * 0.56, 120 + ip * 360, '#ffffff');
        impactStar(ctx, W / 2, H * 0.56, 80 + ip * 240, '#ffd24a');
        sparksBurst(ctx, W / 2, H * 0.56, clamp(ip / 0.7, 0, 1), 'rgba(255,230,150,.95)');
        for (let sr = 0; sr < 3; sr++) { shock(ctx, W / 2, H * 0.56, ip * 320 - sr * 40, 'rgba(255,255,255,' + clamp(1 - ip / 0.8, 0, 1) + ')', clamp(1 - ip / 0.8, 0, 1) * 0.8); }
      }
      if (t < 0.35) { ctx.fillStyle = 'rgba(255,250,230,' + clamp(1 - t / 0.35, 0, 1) + ')'; ctx.fillRect(-40, -40, W + 80, H + 80); }
    } else if (t < 6.6) {
      backdrop(ctx, W, H, '#1a1226');
      let k2 = eOut((t - 4.2) / 2.4);
      let spX = lerp(W * 0.5, W * 0.08, k2), spY = lerp(GY - 26, GY - 70, Math.sin(k2 * Math.PI)) - Math.sin(k2 * Math.PI) * 60;
      if (t < 4.5) { ctx.fillStyle = 'rgba(255,240,190,' + clamp(1 - (t - 4.2) / 0.3, 0, 1) * 0.7 + ')'; ctx.fillRect(0, 0, W, H); }
      horizSpeed(ctx, W, H, 'rgba(255,210,74,.35)', 0.4 * (1 - k2));
      for (let pr = 0; pr < 3; pr++) { let pp = clamp((t - 4.2) / 1.2 - pr * 0.18, 0, 1); shock(ctx, W * 0.5, GY - 30, pp * 260, 'rgba(255,220,120,' + (1 - pp) * 0.6 + ')', (1 - pp) * 0.6); }
      drawSpook(ctx, spX, spY, 2.0, { spin: k2 * 12, noSword: true, stunned: true });
      rocks(ctx, lerp(W * 0.5, W * 0.08, clamp(k2 * 1.4, 0, 1)), GY - 30, clamp(k2 * 1.35, 0, 1));
      embers(ctx, W * 0.6, GY - 20, t, 'rgba(255,200,80,.8)', 60);
      twinkle(ctx, W * 0.6 - 30 + Math.sin(t * 6) * 6, GY - 64, 5 + 2 * Math.sin(t * 10), 'rgba(255,245,200,.9)');
      twinkle(ctx, W * 0.6 + 34, GY - 30, 4 + 2 * Math.cos(t * 8), 'rgba(255,245,200,.8)');
      drawCat(ctx, W * 0.6, GY - 24, 2.0, { sup: true, auraT: t, eyeGlow: 1 });
    } else {
      backdrop(ctx, W, H, '#1a1226');
      drawSpook(ctx, W * 0.08, GY - 22, 2.0, { noSword: true, stunned: true });
      drawCat(ctx, W * 0.6, GY - 24, 2.0, { sup: true, auraT: t, eyeGlow: 1 });
    }
    ctx.restore();
    vignette(ctx, W, H);
  }

  // ============ CUTSCENE 2 — THUNDER RUSH ============
  function arenaBg(ctx, gy) {
    let sky = ctx.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#8fb0c8'); sky.addColorStop(1, '#d2dade');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, gy);
    let gr = ctx.createLinearGradient(0, gy, 0, H); gr.addColorStop(0, '#cfd3d5'); gr.addColorStop(1, '#9aa0a4');
    ctx.fillStyle = gr; ctx.fillRect(0, gy, W, H - gy);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,94,100,.45)'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { let x = (i + 0.5) / 8 * W; ctx.beginPath(); ctx.moveTo(x, gy + 4); ctx.lineTo(x + (i % 2 ? 20 : -20), H); ctx.stroke(); }
    ctx.fillStyle = 'rgba(70,74,80,.6)';
    for (let d = 0; d < 10; d++) { let bx = (d * 127) % W, by = gy + 8 + ((d * 53) % (H - gy - 10)); ctx.fillRect(bx, by, 7, 7); }
  }
  function redVoid(ctx, t, scroll) {
    let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#320712'); g.addColorStop(0.6, '#160309'); g.addColorStop(1, '#080204');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      let bx = (i * 149) % W, by = (((i * 103) + scroll) % (H + 260)) - 130;
      let s = 0.42 + ((i * 17) % 30) / 58, rot = (((i * 53) % 120) / 120 - 0.5) * 0.7;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(rot); ctx.scale(s, s);
      ctx.fillStyle = 'rgba(210,160,40,0.55)'; fistPath(ctx); ctx.fill();
      fistPath(ctx); ctx.clip();
      ctx.fillStyle = 'rgba(150,100,15,0.45)'; ctx.fillRect(-100, 18, 200, 80);
      ctx.strokeStyle = 'rgba(255,210,90,0.6)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      [-33, 5, 43].forEach(function (fx) { ctx.beginPath(); ctx.moveTo(fx, 26); ctx.lineTo(fx, 60); ctx.stroke(); });
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,200,200,.6)';
    for (let st = 0; st < 28; st++) { let sx = (st * 211) % W, sy = (((st * 151) + scroll * 0.4) % H); ctx.fillRect(sx, sy, 2, 2); }
  }
  function barrage(ctx, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 15; i++) {
      let cyc = Math.floor(t * 8 + i * 1.7), ph = (t * 8 + i * 1.7) % 1;
      let r = Math.sin(cyc * 12.9898 + i * 78.233) * 43758.5; r -= Math.floor(r);
      let r2 = Math.sin(cyc * 39.3 + i * 11.1) * 24634.6; r2 -= Math.floor(r2);
      let al = Math.max(0, 1 - ph * 2); if (al <= 0) continue;
      let ang = (r - 0.5) * Math.PI, px = r2 * W, py = r * H, dx = Math.cos(ang) * 1500, dy = Math.sin(ang) * 1500;
      ctx.globalAlpha = al * 0.5; ctx.strokeStyle = 'rgba(255,245,190,1)'; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx, py + dy); ctx.stroke();
      ctx.globalAlpha = al; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx, py + dy); ctx.stroke();
    }
    ctx.restore();
  }
  function scene2(ctx, t) {
    let shake = 0;
    if (t > 0.9 && t < 3.6) shake = 6;
    if (t >= 8.0 && t < 8.7) shake = (1 - (t - 8.0) / 0.7) * 24;
    ctx.save(); ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);

    if (t < 3.6) {
      arenaBg(ctx, GY);
      let j = (t > 0.9) ? (Math.random() - .5) * 6 : 0;
      drawSpook(ctx, W * 0.5 + j, GY - 26 + j, 2.2, { stunned: t > 1.1, noSword: t > 0.9 });
      if (t > 0.9) barrage(ctx, t);
      if (t > 0.9) {
        let ca = [[0.3, 0.5], [0.72, 0.42], [0.5, 0.72], [0.34, 0.34], [0.66, 0.64]]; let p = ca[Math.floor(t * 9) % ca.length];
        ctx.globalAlpha = 0.85; drawCat(ctx, W * p[0], H * p[1], 1.5, { sup: true, auraT: t, flip: p[0] > 0.5, eyeGlow: 1 }); ctx.globalAlpha = 1;
      }
    } else if (t < 4.3) {
      arenaBg(ctx, GY);
      let k = (t - 3.6) / 0.7, sy = lerp(GY - 26, -70, eIn(k));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(W * 0.5, GY - 26); ctx.lineTo(W * 0.5, sy); ctx.stroke(); ctx.restore();
      drawSpook(ctx, W * 0.5, sy, 2.2, { noSword: true, stunned: true, spin: k * 7 });
      if (t < 3.85) { ctx.fillStyle = 'rgba(255,255,255,' + clamp(1 - (t - 3.6) / 0.25, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
    } else if (t < 6.6) {
      redVoid(ctx, t, t * 130);
      let k = (t - 4.3) / 2.3, sy = lerp(H * 0.95, H * 0.24, eOut(k));
      let per = 0.5, idx = Math.floor((t - 4.3) / per), hp = ((t - 4.3) % per) / per;
      let ang = idx * 2.1 + 0.6, din = lerp(340, 0, eIn(clamp(hp / 0.7, 0, 1)));
      let fx = W * 0.5 + Math.cos(ang) * din, fy = sy + Math.sin(ang) * din;
      let connect = (hp > 0.68 && hp < 0.98);
      let jit = connect ? (Math.random() - .5) * 16 : 0;
      ctx.strokeStyle = 'rgba(120,255,120,.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W * 0.5, sy + 18); ctx.lineTo(W * 0.5 - 50, H); ctx.stroke();
      drawSpook(ctx, W * 0.5 + jit + Math.sin(t * 2.4) * 10, sy + (connect ? (Math.random() - .5) * 8 : 0), lerp(1.5, 0.85, k), { noSword: true, stunned: true, spin: t * 3.2 });
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang + Math.PI / 2); ctx.scale(0.8, 0.8); goldFist(ctx, 0, 0, 1); ctx.restore();
      if (connect) {
        let cp = (hp - 0.68) / 0.3;
        impactStar(ctx, W * 0.5, sy, 50 + cp * 260, '#fff2b0');
        impactStar(ctx, W * 0.5, sy, 30 + cp * 160, '#ffd24a');
        for (let sp = 0; sp < 3; sp++) { shock(ctx, W * 0.5, sy, cp * 180 - sp * 22, 'rgba(255,235,150,' + (1 - cp) + ')', (1 - cp) * 0.7); }
      }
    } else if (t < 6.9) {
      redVoid(ctx, t, t * 130);
      let ap = (t - 6.6) / 0.3;
      drawSpook(ctx, W * 0.5, H * 0.24, 0.85, { noSword: true, stunned: true });
      ctx.save(); ctx.translate(W * 0.5, lerp(-80, H * 0.24, eIn(ap))); ctx.scale(1.3, 1.3); goldFist(ctx, 0, 0, 1); ctx.restore();
      if (ap > 0.8) { impactStar(ctx, W * 0.5, H * 0.24, 120, '#fff2b0'); }
    } else if (t < 8.0) {
      let k = (t - 6.9) / 1.1;
      if (k < 0.45) redVoid(ctx, t, t * 130 - k * 500); else arenaBg(ctx, GY);
      let sy = lerp(H * 0.2, GY - 26, eIn(k)), sc = lerp(0.85, 2.2, eIn(k));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
      for (let i = 0; i < 22; i++) { let x = (i * 53) % W, yb = (sy - 260 + ((i * 90) % 520)); ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yb - 140); ctx.stroke(); } ctx.restore();
      drawSpook(ctx, W * 0.5, sy, sc, { noSword: true, stunned: true, spin: t * 4 });
    } else if (t < 8.7) {
      arenaBg(ctx, GY);
      let ip = (t - 8.0);
      drawSpook(ctx, W * 0.5, GY - 16, 2.2, { noSword: true, stunned: true });
      impactStar(ctx, W * 0.5, GY - 4, 110 + ip * 440, '#ffffff');
      impactStar(ctx, W * 0.5, GY - 4, 70 + ip * 280, '#8fd0ff');
      for (let sr = 0; sr < 3; sr++) { shock(ctx, W * 0.5, GY - 4, ip * 380 - sr * 46, 'rgba(255,255,255,' + clamp(1 - ip / 0.7, 0, 1) + ')', clamp(1 - ip / 0.7, 0, 1) * 0.8); }
      rocks(ctx, W * 0.5, GY - 4, clamp(ip / 0.6, 0, 1));
      if (ip < 0.18) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - ip / 0.18) + ')'; ctx.fillRect(0, 0, W, H); }
    } else {
      arenaBg(ctx, GY);
      drawSpook(ctx, W * 0.5, GY - 16, 2.2, { noSword: true, stunned: true });
      rocks(ctx, W * 0.5, GY - 4, 1);
      drawCat(ctx, W * 0.74, GY - 24, 2.0, { sup: true, auraT: t, eyeGlow: 1, flip: true });
    }
    ctx.restore();
    vignette(ctx, W, H);
  }

  // ============ CUTSCENE 3 — ULTRA INSTINCT ============
  function drawBlade(ctx, hx, hy, tx, ty) {
    ctx.save(); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    let a = Math.atan2(ty - hy, tx - hx); ctx.translate(tx, ty); ctx.rotate(a);
    ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(13, 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.fillStyle = '#8a5a1a'; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, TAU); ctx.fill();
  }
  function scene3(ctx, t) {
    let shake = 0;
    if (t >= 0.68 && t < 1.0) shake = 8;
    if (t >= 3.0 && t < 3.3) shake = 9;
    if (t >= 3.7 && t < 4.0) shake = 7;
    if (t >= 5.1 && t < 5.5) shake = 11;
    ctx.save(); ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    backdrop(ctx, W, H, '#12141f');
    let gy = GY - 24, spX = W * 0.6;
    function silver(x, y, r, a) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; let g = ctx.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, 'rgba(220,235,255,' + a + ')'); g.addColorStop(1, 'rgba(180,210,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
    }
    function swipe(x, y, r, q) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, y, r, -0.6 - q * 1.6, 0.9 - q * 1.6); ctx.stroke(); ctx.restore();
    }

    if (t < 1.3) {
      let p = clamp(t / 0.7, 0, 1), cx = lerp(W * 0.14, W * 0.46, eOut(p));
      let recoil = t > 0.75 ? lerp(spX, spX + 26, clamp((t - 0.75) / 0.55, 0, 1)) : spX;
      if (p < 1) { for (let m = 4; m >= 1; m--) { ctx.globalAlpha = 0.12 * m; drawCat(ctx, cx - (m * 14), gy, 2.0, { sup: true, auraT: t, eyeGlow: 1 }); } ctx.globalAlpha = 1; }
      silver(cx, gy - 4, 44, 0.4);
      drawSpook(ctx, recoil, gy - 2, 2.0, { flip: true, stunned: t > 0.75 });
      drawCat(ctx, cx, gy, 2.0, { sup: true, auraT: t, eyeGlow: 1, punchArm: (t > 0.6 && t < 0.95) ? 1 : 0 });
      if (t > 0.68 && t < 1.0) { swipe(recoil - 8, gy - 20, 26, (t - 0.68) / 0.32); impactStar(ctx, recoil - 8, gy - 16, 26, '#fff'); }
    } else if (t < 2.2) {
      silver(W * 0.4, gy - 4, 42, 0.3);
      drawCat(ctx, W * 0.4, gy, 2.0, { sup: true, auraT: t, eyeGlow: 1 });
      drawSpook(ctx, spX, gy - 2, 2.0, { flip: true, swordAng: lerp(0.2, -0.6, clamp((t - 1.3) / 0.9, 0, 1)) });
    } else if (t < 3.0) {
      silver(W * 0.4, gy - 4, 42, 0.4);
      drawCat(ctx, W * 0.4, gy, 2.0, { sup: true, auraT: t, eyeGlow: 1 });
      drawSpook(ctx, spX, gy - 2, 2.0, { flip: true, noSword: true });
      let q = eIn((t - 2.2) / 0.8), bx = lerp(spX - 14, W * 0.45, q), by = lerp(gy - 46, gy - 14, q);
      drawBlade(ctx, spX - 12, gy - 12, bx, by);
      swipe((spX + W * 0.45) / 2, gy - 26, 48, 1 - q * 0.7);
    } else if (t < 3.7) {
      silver(W * 0.46, gy - 10, 60, 0.6);
      drawCat(ctx, W * 0.4, gy, 2.0, { sup: true, auraT: t, eyeGlow: 1 });
      drawSpook(ctx, spX, gy - 2, 2.0, { flip: true, noSword: true });
      let px = W * 0.47, py = gy - 14; drawBlade(ctx, spX - 12, gy - 12, px, py);
      ctx.fillStyle = C.body; ctx.beginPath(); ctx.ellipse(px, py, 11, 8, -0.3, 0, TAU); ctx.fill();
      if (t < 3.35) { impactStar(ctx, px, py, 26 + (t - 3.0) * 90, '#fff'); sparksBurst(ctx, px, py, clamp((t - 3.0) / 0.32, 0, 1), 'rgba(255,255,255,.95)'); }
    } else if (t < 4.5) {
      silver(W * 0.46, gy - 10, 50, 0.4);
      drawCat(ctx, W * 0.4, gy, 2.0, { sup: true, auraT: t, eyeGlow: 1 });
      drawSpook(ctx, spX, gy - 2, 2.0, { flip: true, noSword: true, stunned: true });
      let sh = (t - 3.7) / 0.8, px2 = W * 0.47, py2 = gy - 14;
      if (t < 3.98) { impactStar(ctx, px2, py2, 40 + sh * 90, '#fff'); }
      for (let i = 0; i < 12; i++) {
        let a2 = i / 12 * TAU, d = sh * 150, x = px2 + Math.cos(a2) * d, y = py2 + Math.sin(a2) * d;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a2 + sh * 9); ctx.fillStyle = '#ffe066'; ctx.globalAlpha = clamp(1 - sh, 0, 1);
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(3, 5); ctx.lineTo(-3, 5); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    } else if (t < 5.1) {
      drawSpook(ctx, spX, gy - 2, 2.0, { flip: true, noSword: true, stunned: true });
      let tp = (t - 4.5) / 0.6;
      ctx.globalAlpha = clamp(1 - tp * 1.6, 0, 1); drawCat(ctx, W * 0.4, gy, 2.0, { sup: true, auraT: t, eyeGlow: 1 }); ctx.globalAlpha = 1;
      for (let m2 = 4; m2 >= 1; m2--) { ctx.globalAlpha = 0.12 * m2 * tp; drawCat(ctx, lerp(W * 0.4, spX + 46, tp) - (m2 * 10), gy, 2.0, { sup: true, auraT: t, flip: true }); } ctx.globalAlpha = 1;
      horizSpeed(ctx, W, H, 'rgba(220,235,255,.4)', 0.4);
      if (tp < 0.5) flare(ctx, W * 0.4, gy - 6, 30 * (1 - tp), 'rgba(220,235,255,.9)');
    } else if (t < 5.9) {
      let sp = (t - 5.1) / 0.8;
      drawSpook(ctx, spX, gy - 2, 2.0, { flip: true, noSword: true, stunned: sp > 0.4 });
      drawCat(ctx, spX + 46, gy, 2.0, { sup: true, auraT: t, eyeGlow: 1, flip: true, punchArm: sp < 0.55 ? 1 : 0 });
      if (sp < 0.5) swipe(spX + 10, gy - 22, 24, sp / 0.5);
      if (sp >= 0.4 && sp < 0.78) { impactStar(ctx, spX + 8, gy - 22, 28 + (sp - 0.4) * 150, '#fff'); sparksBurst(ctx, spX + 8, gy - 22, clamp((sp - 0.4) / 0.35, 0, 1), 'rgba(255,255,255,.9)'); }
    } else {
      silver(spX + 46, gy - 4, 44, 0.28 + 0.1 * Math.sin(t * 4));
      drawSpook(ctx, spX, gy - 2, 2.0, { flip: true, noSword: true, stunned: true });
      drawCat(ctx, spX + 46, gy, 2.0, { sup: true, auraT: t, eyeGlow: 1, flip: true });
      twinkle(ctx, spX - 8 + Math.sin(t * 5) * 6, gy - 30, 4, 'rgba(220,235,255,.8)');
      twinkle(ctx, spX + 6 + Math.cos(t * 6) * 5, gy - 34, 3, 'rgba(220,235,255,.7)');
    }
    ctx.restore(); vignette(ctx, W, H);
  }

  const DEFS = {
    comet: { fn: scene1, dur: 9.2 },
    thunder: { fn: scene2, dur: 10 },
    ultra: { fn: scene3, dur: 6.8 },
  };

  let busy = false;

  // Play one cutscene as a full-screen overlay, then clean up and call onDone.
  // The player can tap or press any key to skip to the end.
  function play(name, onDone) {
    const def = DEFS[name];
    const finishCb = typeof onDone === 'function' ? onDone : function () {};
    if (!def || busy) { finishCb(); return; }
    busy = true;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#05040a;opacity:1;';
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    overlay.appendChild(cv);
    const hint = document.createElement('div');
    hint.textContent = 'tap / press a key to skip';
    hint.style.cssText = 'position:absolute;right:14px;bottom:12px;color:rgba(255,255,255,.5);'
      + 'font:600 13px system-ui,-apple-system,sans-serif;letter-spacing:.04em;pointer-events:none;';
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    const ctx = cv.getContext('2d');
    let dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = window.innerWidth, vh = window.innerHeight;
      cv.width = Math.max(1, Math.floor(vw * dpr));
      cv.height = Math.max(1, Math.floor(vh * dpr));
    }
    resize();
    window.addEventListener('resize', resize);

    const start = performance.now();
    let raf = null, done = false;

    function finish() {
      if (done) return; done = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      overlay.removeEventListener('pointerdown', finish);
      window.removeEventListener('keydown', onKey, true);
      overlay.style.transition = 'opacity .3s ease';
      overlay.style.opacity = '0';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        busy = false;
        finishCb();
      }, 320);
    }
    function onKey(e) {
      // swallow the skip key so it doesn't also reach the game underneath
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      finish();
    }
    overlay.addEventListener('pointerdown', finish);
    window.addEventListener('keydown', onKey, true);

    function drawFrame(t) {
      // clear whole device buffer to black (also fills the letterbox bars)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, cv.width, cv.height);
      // letterbox the 720x405 stage into the viewport (contain)
      const vw = window.innerWidth, vh = window.innerHeight;
      const scale = Math.min(vw / W, vh / H);
      const ox = (vw - W * scale) / 2, oy = (vh - H * scale) / 2;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
      ctx.imageSmoothingEnabled = true;
      // clip to the stage so nothing bleeds into the bars
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      def.fn(ctx, Math.min(t, def.dur));
      ctx.restore();
    }

    if (reduce) {
      drawFrame(def.dur);
      setTimeout(finish, 500);
      return;
    }

    function frame(now) {
      const t = (now - start) / 1000;
      drawFrame(t);
      if (t >= def.dur) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  return { play: play, isBusy: function () { return busy; } };
})();
