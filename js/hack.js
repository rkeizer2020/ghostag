// Hacker Ghost's "hack" ability: a full-screen terminal overlay where the
// ghost dives into a computer and you must beat ONE of five hard mini-games.
// Win -> the caller stuns the Spook 5s and awards big points; lose -> nothing.
//
// Hack.play(onDone) builds the overlay, plays a short "accessing…" intro, runs a
// random mini-game, shows ACCESS GRANTED / DENIED, cleans up and calls
// onDone(win:boolean). Self-contained DOM + canvas; works on touch and desktop.
const Hack = (function () {
  "use strict";
  let busy = false;
  const GAMES = ['sequence', 'grid', 'reaction', 'packets', 'codebreak'];
  const GREEN = '#3bf38b', DIM = '#1b7a46', RED = '#ff5b6e', BG = '#05100a';

  function el(tag, css, html) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function play(onDone) {
    const done = typeof onDone === 'function' ? onDone : function () {};
    if (busy) { done(false); return; }
    busy = true;

    const wrap = el('div', 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;'
      + 'background:rgba(2,8,5,0.92);font-family:"Courier New",monospace;');
    const card = el('div', 'width:min(440px,94vw);background:' + BG + ';border:2px solid ' + GREEN + ';border-radius:12px;'
      + 'box-shadow:0 0 40px rgba(59,243,139,.25),inset 0 0 60px rgba(59,243,139,.06);overflow:hidden;');
    const head = el('div', 'padding:8px 12px;border-bottom:1px solid ' + DIM + ';color:' + GREEN + ';font-weight:bold;'
      + 'font-size:13px;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center;',
      '<span>▓ GHOST//INTRUSION</span><span id="hk-sts" style="color:' + DIM + '">connecting…</span>');
    const body = el('div', 'position:relative;min-height:300px;padding:14px;color:' + GREEN + ';');
    card.appendChild(head); card.appendChild(body); wrap.appendChild(card);
    document.body.appendChild(wrap);

    const ctx = { wrap, card, body, status: head.querySelector('#hk-sts'), done, over: false };

    const name = GAMES[Math.floor(Math.random() * GAMES.length)];
    intro(ctx, name, () => {
      runGame(name, ctx, (win) => outro(ctx, win));
    });
  }

  function setStatus(ctx, t, color) { ctx.status.textContent = t; ctx.status.style.color = color || DIM; }

  function finishOnce(ctx, win) {
    if (ctx.over) return;
    ctx.over = true;
    outro(ctx, win);
  }

  // ---------- intro: scrolling code + "accessing" ----------
  function intro(ctx, name, next) {
    const pre = el('pre', 'margin:0;height:230px;overflow:hidden;color:' + DIM + ';font-size:12px;line-height:1.25;white-space:pre-wrap;');
    const banner = el('div', 'position:absolute;left:0;right:0;top:120px;text-align:center;color:' + GREEN
      + ';font-size:20px;font-weight:bold;letter-spacing:2px;text-shadow:0 0 12px ' + GREEN + ';', '◉ ACCESSING MAINFRAME');
    ctx.body.innerHTML = ''; ctx.body.appendChild(pre); ctx.body.appendChild(banner);
    setStatus(ctx, 'breaching…', GREEN);
    const names = { sequence: 'SIGNAL TRACE', grid: 'MEMORY DUMP', reaction: 'PORT KNOCK', packets: 'PACKET SNIFF', codebreak: 'CIPHER LOCK' };
    let lines = [], t0 = performance.now();
    const iv = setInterval(() => {
      let s = '';
      for (let i = 0; i < 24; i++) s += (Math.random() < 0.5 ? '0' : '1') + (Math.random() < 0.3 ? ' ' : '');
      lines.push('> ' + s.slice(0, 40));
      if (lines.length > 15) lines.shift();
      pre.textContent = lines.join('\n');
    }, 70);
    setTimeout(() => {
      banner.innerHTML = '⚠ LAUNCHING<br><span style="font-size:15px;color:#fff">' + names[name] + '</span>';
    }, 1100);
    setTimeout(() => { clearInterval(iv); next(); }, 1900);
  }

  // ---------- outro ----------
  function outro(ctx, win) {
    ctx.over = true;
    if (ctx._iv) clearInterval(ctx._iv);
    if (ctx._raf) { try { ctx._raf(); } catch (e) { /* ignore */ } }
    if (ctx._to) ctx._to.forEach((t) => clearTimeout(t));
    ctx.body.innerHTML = '';
    const box = el('div', 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;'
      + 'color:' + (win ? GREEN : RED) + ';text-align:center;');
    box.innerHTML = '<div style="font-size:46px">' + (win ? '✔' : '✖') + '</div>'
      + '<div style="font-size:22px;font-weight:bold;letter-spacing:2px;margin-top:8px;text-shadow:0 0 12px currentColor">'
      + (win ? 'ACCESS GRANTED' : 'ACCESS DENIED') + '</div>'
      + '<div style="color:#9fb0a4;font-size:13px;margin-top:10px">' + (win ? 'Spook stunned · +1500' : 'intrusion blocked') + '</div>';
    ctx.body.appendChild(box);
    setStatus(ctx, win ? 'owned.' : 'traced.', win ? GREEN : RED);
    setTimeout(() => {
      if (ctx.wrap.parentNode) ctx.wrap.parentNode.removeChild(ctx.wrap);
      busy = false;
      ctx.done(win);
    }, 1300);
  }

  function track(ctx, id) { (ctx._to = ctx._to || []).push(id); return id; }

  function runGame(name, ctx, finish) {
    const fin = (win) => { if (!ctx.over) { ctx.over = true; finish(win); } };
    // hard safety: never hang
    track(ctx, setTimeout(() => fin(false), 30000));
    ({ sequence: gSequence, grid: gGrid, reaction: gReaction, packets: gPackets, codebreak: gCode }[name] || gPackets)(ctx, fin);
  }

  // ===== 1. SIGNAL TRACE — repeat a 6-step colour sequence (Simon) =====
  function gSequence(ctx, fin) {
    setStatus(ctx, 'watch the signal', GREEN);
    const cols = ['#ff5b6e', '#ffd54a', '#3bf38b', '#6fb8ff'];
    const seq = []; for (let i = 0; i < 6; i++) seq.push(Math.floor(Math.random() * 4));
    const grid = el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:300px;margin:18px auto;');
    const pads = cols.map((c, i) => {
      const p = el('button', 'height:90px;border:2px solid #0a0;border-radius:12px;background:' + c + ';opacity:.35;cursor:pointer;');
      grid.appendChild(p); return p;
    });
    const info = el('div', 'text-align:center;color:#9fb0a4;font-size:13px;margin-top:8px', 'memorise…');
    ctx.body.innerHTML = ''; ctx.body.appendChild(grid); ctx.body.appendChild(info);
    let input = false, idx = 0;
    const flash = (i, ms) => { pads[i].style.opacity = '1'; track(ctx, setTimeout(() => { pads[i].style.opacity = '.35'; }, ms)); };
    seq.forEach((s, k) => track(ctx, setTimeout(() => flash(s, 300), 500 + k * 520)));
    track(ctx, setTimeout(() => { input = true; info.textContent = 'now repeat it'; setStatus(ctx, 'your turn', GREEN); }, 500 + seq.length * 520 + 300));
    pads.forEach((p, i) => p.addEventListener('pointerdown', (e) => {
      e.preventDefault(); if (!input || ctx.over) return;
      flash(i, 150);
      if (i === seq[idx]) { idx++; if (idx >= seq.length) fin(true); }
      else fin(false);
    }));
  }

  // ===== 2. MEMORY DUMP — remember 7 lit cells in a 5x5 grid =====
  function gGrid(ctx, fin) {
    setStatus(ctx, 'memorise the nodes', GREEN);
    const N = 25, LIT = 7;
    const lit = new Set(); while (lit.size < LIT) lit.add(Math.floor(Math.random() * N));
    const grid = el('div', 'display:grid;grid-template-columns:repeat(5,1fr);gap:8px;max-width:300px;margin:14px auto;');
    const cells = [];
    for (let i = 0; i < N; i++) {
      const c = el('button', 'aspect-ratio:1;border:1px solid ' + DIM + ';border-radius:8px;background:#071a10;cursor:pointer;');
      if (lit.has(i)) c.style.background = GREEN;
      grid.appendChild(c); cells.push(c);
    }
    const info = el('div', 'text-align:center;color:#9fb0a4;font-size:13px;margin-top:8px', 'lock it in…');
    ctx.body.innerHTML = ''; ctx.body.appendChild(grid); ctx.body.appendChild(info);
    let active = false, found = 0;
    track(ctx, setTimeout(() => {
      cells.forEach((c, i) => { if (lit.has(i)) c.style.background = '#071a10'; });
      active = true; info.textContent = 'tap the ' + LIT + ' nodes'; setStatus(ctx, 'recall', GREEN);
    }, 1400));
    cells.forEach((c, i) => c.addEventListener('pointerdown', (e) => {
      e.preventDefault(); if (!active || ctx.over || c._done) return;
      c._done = true;
      if (lit.has(i)) { c.style.background = GREEN; found++; if (found >= LIT) fin(true); }
      else { c.style.background = RED; fin(false); }
    }));
  }

  // ===== 3. PORT KNOCK — stop the sweep in the shrinking zone, 4x =====
  function gReaction(ctx, fin) {
    setStatus(ctx, 'hit the green', GREEN);
    const W = 300, H = 26;
    const bar = el('div', 'position:relative;width:' + W + 'px;height:' + H + 'px;margin:40px auto;background:#071a10;border:1px solid ' + DIM + ';border-radius:6px;overflow:hidden;');
    const zone = el('div', 'position:absolute;top:0;height:100%;background:rgba(59,243,139,.3);border-left:2px solid ' + GREEN + ';border-right:2px solid ' + GREEN + ';');
    const marker = el('div', 'position:absolute;top:0;width:4px;height:100%;background:#fff;box-shadow:0 0 8px #fff;');
    bar.appendChild(zone); bar.appendChild(marker);
    const info = el('div', 'text-align:center;color:#9fb0a4;font-size:14px', 'tap to lock · 0/4');
    const btn = el('button', 'display:block;margin:16px auto;padding:12px 28px;background:' + GREEN + ';color:#042;border:none;border-radius:10px;font-weight:bold;font-size:16px;cursor:pointer;', 'LOCK');
    ctx.body.innerHTML = ''; ctx.body.appendChild(bar); ctx.body.appendChild(info); ctx.body.appendChild(btn);
    let hits = 0, pos = 0, dir = 1, speed = 3.4, zw = 70, raf;
    function place() { const zx = 20 + Math.random() * (W - 40 - zw); zone.style.left = zx + 'px'; zone.style.width = zw + 'px'; zone._x = zx; }
    place();
    function loop() {
      pos += dir * speed; if (pos <= 0) { pos = 0; dir = 1; } if (pos >= W - 4) { pos = W - 4; dir = -1; }
      marker.style.left = pos + 'px';
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    ctx._iv = { }; // placeholder; we cancel raf in outro via _raf
    ctx._raf = () => cancelAnimationFrame(raf);
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); if (ctx.over) return;
      if (pos + 2 >= zone._x && pos + 2 <= zone._x + zw) {
        hits++;
        if (hits >= 4) { cancelAnimationFrame(raf); fin(true); return; }
        speed += 1.1; zw -= 12; place();
        info.textContent = 'tap to lock · ' + hits + '/4';
      } else { cancelAnimationFrame(raf); fin(false); }
    });
  }

  // ===== 4. PACKET SNIFF — tap 15 packets in 10s, 4 escapes = fail =====
  function gPackets(ctx, fin) {
    setStatus(ctx, 'grab the packets', GREEN);
    const area = el('div', 'position:relative;height:250px;background:#040f09;border:1px solid ' + DIM + ';border-radius:8px;overflow:hidden;');
    const hud = el('div', 'text-align:center;color:#9fb0a4;font-size:13px;margin-top:8px', 'caught 0/15 · missed 0/4');
    ctx.body.innerHTML = ''; ctx.body.appendChild(area); ctx.body.appendChild(hud);
    let caught = 0, missed = 0, end = performance.now() + 10000;
    const spawn = () => {
      if (ctx.over) return;
      const s = 34 + Math.random() * 10;
      const p = el('button', 'position:absolute;width:' + s + 'px;height:' + s + 'px;border-radius:6px;border:none;cursor:pointer;'
        + 'background:' + GREEN + ';color:#042;font-weight:bold;font-size:11px;box-shadow:0 0 10px rgba(59,243,139,.6)', '◰');
      p.style.left = (Math.random() * (area.clientWidth - s)) + 'px';
      p.style.top = (Math.random() * (area.clientHeight - s)) + 'px';
      let gone = false;
      const kill = (hit) => {
        if (gone) return; gone = true; clearTimeout(to);
        if (p.parentNode) p.parentNode.removeChild(p);
        if (hit) { caught++; if (caught >= 15) { fin(true); return; } }
        else { missed++; if (missed >= 4) { fin(false); return; } }
        hud.textContent = 'caught ' + caught + '/15 · missed ' + missed + '/4';
      };
      p.addEventListener('pointerdown', (e) => { e.preventDefault(); kill(true); });
      const to = setTimeout(() => kill(false), 850);
      area.appendChild(p);
    };
    ctx._iv = setInterval(() => {
      if (ctx.over) return;
      if (performance.now() >= end) { clearInterval(ctx._iv); fin(caught >= 15); return; }
      spawn();
    }, 420);
    track(ctx, setTimeout(() => { if (!ctx.over) spawn(); }, 150));
  }

  // ===== 5. CIPHER LOCK — stop 5 tumblers on their target digit =====
  function gCode(ctx, fin) {
    setStatus(ctx, 'lock the cipher', GREEN);
    const n = 5;
    const targets = []; for (let i = 0; i < n; i++) targets.push(Math.floor(Math.random() * 10));
    const row = el('div', 'display:flex;gap:10px;justify-content:center;margin:24px 0 10px;');
    const info = el('div', 'text-align:center;color:#9fb0a4;font-size:13px', 'tap a reel when it shows its target · mistakes 0/3');
    const tgt = el('div', 'text-align:center;color:' + GREEN + ';font-size:15px;margin-bottom:6px;letter-spacing:4px', 'TARGET ' + targets.join(' '));
    ctx.body.innerHTML = ''; ctx.body.appendChild(tgt); ctx.body.appendChild(row); ctx.body.appendChild(info);
    const reels = []; let locked = 0, miss = 0;
    for (let i = 0; i < n; i++) {
      const r = el('button', 'width:46px;height:60px;font-size:28px;font-weight:bold;border:2px solid ' + DIM + ';border-radius:8px;'
        + 'background:#071a10;color:#fff;cursor:pointer;');
      r._v = Math.floor(Math.random() * 10); r._locked = false; r.textContent = r._v;
      r.addEventListener('pointerdown', (e) => {
        e.preventDefault(); if (ctx.over || r._locked) return;
        if (r._v === targets[i]) { r._locked = true; r.style.borderColor = GREEN; r.style.color = GREEN; locked++; if (locked >= n) { clearInterval(ctx._iv); fin(true); } }
        else { miss++; r.style.borderColor = RED; track(ctx, setTimeout(() => { if (!r._locked) r.style.borderColor = DIM; }, 250)); info.textContent = 'tap a reel when it shows its target · mistakes ' + miss + '/3'; if (miss >= 3) { clearInterval(ctx._iv); fin(false); } }
      });
      reels.push(r); row.appendChild(r);
    }
    ctx._iv = setInterval(() => {
      if (ctx.over) return;
      reels.forEach((r) => { if (!r._locked) { r._v = (r._v + 1) % 10; r.textContent = r._v; } });
    }, 140);
  }

  return { play: play };
})();
