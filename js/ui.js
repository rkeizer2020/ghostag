// Shared UI helpers used by the menu and settings screens so they match the
// in-game forest look: a drifting-fog backdrop, styled buttons, a slider.
const UI = {
  // ---- Account panel: an HTML overlay for username/password login ----
  _accountPanel: null,
  accountPanel(afterChange) {
    if (this._accountPanel) { this._showAccount(afterChange); return; }
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(6,8,10,0.72);font-family:system-ui,-apple-system,sans-serif;';
    const inp = 'width:100%;padding:11px;margin:6px 0;border-radius:10px;border:1px solid #3a4652;background:#0f0c14;color:#fff;font-size:15px;box-sizing:border-box;';
    const btn = 'padding:11px;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;color:#fff;';
    wrap.innerHTML =
      '<div style="width:min(360px,90vw);background:#171019;border:2px solid #6fb8ff;border-radius:16px;padding:20px;color:#eaf6ff;box-shadow:0 12px 44px rgba(0,0,0,.55)">' +
      '<div style="font-size:22px;font-weight:800;text-align:center;color:#bfe6ff">Account</div>' +
      '<div id="ag-sub" style="text-align:center;color:#9fb0c0;font-size:13px;margin:4px 0 14px">Log in to sync your score & skins to any device</div>' +
      '<div id="ag-form">' +
      '<input id="ag-user" placeholder="Username" autocomplete="username" style="' + inp + '">' +
      '<input id="ag-pass" type="password" placeholder="Password" autocomplete="current-password" style="' + inp + '">' +
      '<div id="ag-msg" style="min-height:18px;color:#ff9a9a;font-size:13px;text-align:center;margin:6px 0"></div>' +
      '<div style="display:flex;gap:10px">' +
      '<button id="ag-login" style="' + btn + 'flex:1;background:#2a6cff">Log in</button>' +
      '<button id="ag-signup" style="' + btn + 'flex:1;background:#3a2a5e">Sign up</button>' +
      '</div></div>' +
      '<div id="ag-in" style="display:none;text-align:center">' +
      '<div id="ag-who" style="font-size:17px;margin:10px 0;color:#8fe6a0"></div>' +
      '<button id="ag-logout" style="' + btn + 'width:100%;background:#7a2530">Log out</button>' +
      '</div>' +
      '<button id="ag-close" style="' + btn + 'width:100%;margin-top:12px;background:#2a2f36">Close</button>' +
      '</div>';
    document.body.appendChild(wrap);
    this._accountPanel = wrap;
    const $ = (id) => wrap.querySelector('#' + id);
    const msg = (t, ok) => { const el = $('ag-msg'); el.textContent = t || ''; el.style.color = ok ? '#8fe6a0' : '#ff9a9a'; };

    const doAuth = async (fn) => {
      const u = $('ag-user').value, p = $('ag-pass').value;
      if (!u || !p) { msg('Fill in username and password.'); return; }
      msg('Please wait…', true);
      const r = await fn(u, p);
      if (r.ok) { this._afterChange && this._afterChange(); this._showAccount(); }
      else msg(r.msg || 'Something went wrong.');
    };
    $('ag-login').onclick = () => doAuth((u, p) => Auth.signIn(u, p));
    $('ag-signup').onclick = () => doAuth((u, p) => Auth.signUp(u, p));
    $('ag-logout').onclick = async () => { await Auth.signOut(); this._afterChange && this._afterChange(); this._showAccount(); };
    $('ag-close').onclick = () => { wrap.style.display = 'none'; };
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) wrap.style.display = 'none'; });

    this._showAccount(afterChange);
  },

  _showAccount(afterChange) {
    if (afterChange) this._afterChange = afterChange;
    const wrap = this._accountPanel;
    if (!wrap) return;
    const $ = (id) => wrap.querySelector('#' + id);
    const inGame = Auth.loggedIn();
    $('ag-form').style.display = inGame ? 'none' : 'block';
    $('ag-in').style.display = inGame ? 'block' : 'none';
    $('ag-sub').textContent = Auth.available()
      ? (inGame ? 'Your progress is synced.' : 'Log in to sync your score & skins to any device')
      : 'Cloud login is only available on the website.';
    if (inGame) $('ag-who').textContent = 'Logged in as ' + (Auth.username() || 'player');
    const msgEl = $('ag-msg'); if (msgEl) msgEl.textContent = '';
    wrap.style.display = 'flex';
  },

  // ---- Admin panel: an HTML overlay only shown to founder/admin accounts ----
  _adminPanel: null,
  adminPanel(afterChange) {
    if (afterChange) this._afterChange = afterChange;
    if (this._adminPanel) { this._adminPanel.style.display = 'flex'; this._refreshAdmin(); return; }
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(6,8,10,0.72);font-family:system-ui,-apple-system,sans-serif;padding:16px;box-sizing:border-box;';
    const inp = 'padding:9px;border-radius:9px;border:1px solid #3a4652;background:#0f0c14;color:#fff;font-size:14px;box-sizing:border-box;';
    const btn = 'padding:9px 12px;border:none;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer;color:#fff;';
    const sel = inp + 'width:100%;';
    const charOpts = Settings.CHAR_ORDER.map((k) => '<option value="' + k + '">' + Settings.CHARACTERS[k].label + '</option>').join('');
    const skinOpts = Settings.SKIN_ORDER.map((k) => '<option value="' + k + '">' + Settings.SKINS[k].name + '</option>').join('');
    wrap.innerHTML =
      '<div style="width:min(430px,94vw);max-height:92vh;overflow:auto;background:#171019;border:2px solid #ffd54a;border-radius:16px;padding:18px;color:#eaf6ff;box-shadow:0 12px 44px rgba(0,0,0,.55)">' +
      '<div style="font-size:22px;font-weight:800;text-align:center;color:#ffd54a">🛠 Admin Tools</div>' +
      '<div id="adm-who" style="text-align:center;color:#9fb0c0;font-size:12px;margin:2px 0 10px"></div>' +
      '<div id="adm-msg" style="min-height:16px;text-align:center;color:#8fe6a0;font-size:13px;margin-bottom:8px"></div>' +
      '<div style="font-weight:700;color:#bfe6ff;margin:6px 0 4px">Unlocks</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="adm-chars" style="' + btn + 'background:#2a6cff">Unlock all characters</button>' +
      '<button id="adm-skins" style="' + btn + 'background:#2a6cff">Unlock all skins</button>' +
      '</div>' +
      '<div style="font-weight:700;color:#bfe6ff;margin:12px 0 4px">Coins (<span id="adm-coins">0</span>)</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<button id="adm-c1k" style="' + btn + 'background:#3a2a5e">+1,000</button>' +
      '<button id="adm-c10k" style="' + btn + 'background:#3a2a5e">+10,000</button>' +
      '<input id="adm-cset" type="number" placeholder="set" style="' + inp + 'width:88px">' +
      '<button id="adm-csetbtn" style="' + btn + 'background:#3a2a5e">Set</button>' +
      '</div>' +
      '<div style="font-weight:700;color:#bfe6ff;margin:12px 0 4px">High score (best: <span id="adm-best">0</span>)</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<input id="adm-sset" type="number" placeholder="set best" style="' + inp + 'width:104px">' +
      '<button id="adm-ssetbtn" style="' + btn + 'background:#3a2a5e">Set (all diff.)</button>' +
      '<button id="adm-sreset" style="' + btn + 'background:#7a2530">Reset to 0</button>' +
      '</div>' +
      '<div style="font-weight:700;color:#bfe6ff;margin:12px 0 4px">Equip</div>' +
      '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-bottom:6px">' +
      '<select id="adm-char" style="' + sel + '">' + charOpts + '</select><button id="adm-charbtn" style="' + btn + 'background:#2a6cff">Equip</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center">' +
      '<select id="adm-skin" style="' + sel + '">' + skinOpts + '</select><button id="adm-skinbtn" style="' + btn + 'background:#2a6cff">Equip</button>' +
      '</div>' +
      '<div style="font-weight:700;color:#bfe6ff;margin:14px 0 4px">Players (all accounts)</div>' +
      '<button id="adm-load" style="' + btn + 'width:100%;background:#2a6cff">🌐 Load all players</button>' +
      '<div id="adm-phint" style="color:#9fb0c0;font-size:11px;margin:5px 0">Needs the website, an admin login, and the Supabase admin rules applied.</div>' +
      '<div id="adm-players" style="margin-top:6px;display:flex;flex-direction:column;gap:6px"></div>' +
      '<div style="font-weight:700;color:#ff9a9a;margin:14px 0 4px">Danger</div>' +
      '<button id="adm-wipe" style="' + btn + 'width:100%;background:#7a2530">Reset ALL my data</button>' +
      '<button id="adm-close" style="' + btn + 'width:100%;margin-top:12px;background:#2a2f36">Close</button>' +
      '</div>';
    document.body.appendChild(wrap);
    this._adminPanel = wrap;
    const $ = (id) => wrap.querySelector('#' + id);
    const msg = (t) => { $('adm-msg').textContent = t || ''; };
    const sync = (t) => { try { Auth.queuePush(); } catch (e) { /* ignore */ } this._refreshAdmin(); if (this._afterChange) this._afterChange(); if (t) msg(t); };

    $('adm-chars').onclick = () => { Storage.setAllCharsUnlocked(); sync('All characters unlocked.'); };
    $('adm-skins').onclick = () => {
      try {
        localStorage.setItem('tagz.owner', '1');
        localStorage.setItem('tagz.founder', '1');
        const regular = Settings.SKIN_ORDER.filter((id) => {
          const s = Settings.SKINS[id];
          return id !== 'classic' && s.kind !== 'owner' && s.kind !== 'founder';
        });
        localStorage.setItem('tagz.skins', regular.join(','));
      } catch (e) { /* ignore */ }
      sync('All skins unlocked.');
    };
    $('adm-c1k').onclick = () => { Storage.addCoins(1000); sync('+1,000 coins.'); };
    $('adm-c10k').onclick = () => { Storage.addCoins(10000); sync('+10,000 coins.'); };
    $('adm-csetbtn').onclick = () => {
      const v = parseInt($('adm-cset').value, 10);
      if (Number.isFinite(v)) { try { localStorage.setItem('tagz.coins', String(Math.max(0, v))); } catch (e) { /* ignore */ } sync('Coins set to ' + Math.max(0, v) + '.'); }
    };
    $('adm-ssetbtn').onclick = () => {
      const v = parseInt($('adm-sset').value, 10);
      if (Number.isFinite(v)) { Storage.setAllHighscores({ easy: v, normal: v, hard: v }); sync('Best set to ' + v + '.'); }
    };
    $('adm-sreset').onclick = () => { Storage.setAllHighscores({ easy: 0, normal: 0, hard: 0 }); sync('Scores reset to 0.'); };
    $('adm-charbtn').onclick = () => {
      const k = $('adm-char').value;
      Storage.setAllCharsUnlocked(); // ensure it's selectable
      Settings.setCharacter(k);
      sync('Equipped ' + (Settings.CHARACTERS[k] ? Settings.CHARACTERS[k].label : k) + '.');
    };
    $('adm-skinbtn').onclick = () => {
      const id = $('adm-skin').value;
      const s = Settings.SKINS[id];
      if (!Storage.isSkinOwned(id)) {
        if (id === 'owner') { try { localStorage.setItem('tagz.owner', '1'); } catch (e) { /* ignore */ } }
        else if (s && s.kind === 'founder') { try { localStorage.setItem('tagz.founder', '1'); } catch (e) { /* ignore */ } }
        else Storage.addSkin(id);
      }
      Settings.setSkin(id);
      sync('Equipped skin ' + (s ? s.name : id) + '.');
    };
    // ---- cross-player admin list ----
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const allRegularSkins = () => Settings.SKIN_ORDER
      .filter((id) => { const s = Settings.SKINS[id]; return id !== 'classic' && s.kind !== 'owner' && s.kind !== 'founder'; })
      .join(',');
    const rowBtn = 'padding:5px 8px;border:none;border-radius:7px;font-weight:700;font-size:11px;cursor:pointer;color:#fff;';
    const renderPlayers = async () => {
      const list = $('adm-players');
      list.innerHTML = '<div style="color:#9fb0c0;font-size:12px;text-align:center">Loading…</div>';
      const r = await Auth.adminListPlayers();
      if (!r.ok) { list.innerHTML = '<div style="color:#ff9a9a;font-size:12px;text-align:center">' + esc(r.msg || 'Could not load players.') + '</div>'; return; }
      if (!r.rows.length) { list.innerHTML = '<div style="color:#9fb0c0;font-size:12px;text-align:center">No players returned (admin rules may not be enabled in Supabase yet).</div>'; return; }
      list.innerHTML = '';
      r.rows.forEach((p) => {
        const row = document.createElement('div');
        row.style.cssText = 'background:#0f0c14;border:1px solid #2a3340;border-radius:9px;padding:8px';
        row.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;margin-bottom:6px">'
          + '<b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.username || '(no name)') + '</b>'
          + '<span style="color:#ffd54a;white-space:nowrap">⭐' + (p.highscore || 0) + ' · 🪙' + (p.coins || 0) + '</span></div>';
        const bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
        const act = async (fn) => { const rr = await fn(); if (!rr.ok) msg(rr.msg || 'Failed'); await renderPlayers(); };
        const mk = (label, bg, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = rowBtn + 'background:' + bg; b.onclick = () => { b.disabled = true; act(fn); }; bar.appendChild(b); };
        mk('Score 0', '#7a2530', () => Auth.adminUpdatePlayer(p.id, { highscore: 0 }));
        mk('+10k 🪙', '#3a2a5e', () => Auth.adminUpdatePlayer(p.id, { coins: (p.coins || 0) + 10000 }));
        mk('All skins', '#2a6cff', () => Auth.adminUpdatePlayer(p.id, { skins: allRegularSkins() }));
        mk('Max unlock', '#2a6cff', () => Auth.adminUpdatePlayer(p.id, { highscore: 100000 }));
        // delete with a two-tap confirm
        const del = document.createElement('button');
        del.textContent = 'Delete'; del.style.cssText = rowBtn + 'background:#5a1620';
        let armed = false;
        del.onclick = () => { if (!armed) { armed = true; del.textContent = 'Sure?'; return; } del.disabled = true; act(() => Auth.adminDeletePlayer(p.id)); };
        bar.appendChild(del);
        row.appendChild(bar);
        list.appendChild(row);
      });
    };
    $('adm-load').onclick = () => renderPlayers();

    $('adm-wipe').onclick = () => {
      if (!wrap._confirm) { wrap._confirm = true; msg('Tap "Reset ALL my data" again to confirm.'); return; }
      try { Object.keys(localStorage).filter((k) => k.indexOf('tagz.') === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
      location.reload();
    };
    $('adm-close').onclick = () => { wrap.style.display = 'none'; wrap._confirm = false; };
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) { wrap.style.display = 'none'; wrap._confirm = false; } });

    this._refreshAdmin();
    wrap.style.display = 'flex';
  },

  _refreshAdmin() {
    const wrap = this._adminPanel;
    if (!wrap) return;
    const $ = (id) => wrap.querySelector('#' + id);
    $('adm-who').textContent = (typeof Auth !== 'undefined' && Auth.loggedIn())
      ? ('Logged in as ' + (Auth.username() || 'player'))
      : 'Local device (not logged in)';
    $('adm-coins').textContent = Storage.getCoins();
    $('adm-best').textContent = Storage.bestOverall();
    const cSel = $('adm-char'), sSel = $('adm-skin');
    if (cSel) cSel.value = Settings.getCharacter();
    if (sSel) sSel.value = Settings.getSkin();
  },

  // Re-run a static scene's layout when the window size changes, so it keeps
  // filling the screen. Cheap for menu-style scenes; the listener is removed
  // when the scene shuts down.
  restartOnResize(scene) {
    const onResize = () => { if (scene.scene.isActive()) scene.scene.restart(); };
    scene.scale.on('resize', onResize);
    scene.events.once('shutdown', () => scene.scale.off('resize', onResize));
  },

  // Full-screen forest backdrop (brown earth + blue fog + a few trees).
  backdrop(scene) {
    const W = scene.scale.width, H = scene.scale.height;
    scene.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0).setScrollFactor(0).setDepth(-20);

    for (let i = 0; i < 9; i++) {
      const puff = scene.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 'fog')
        .setScrollFactor(0).setDepth(-15)
        .setScale(Phaser.Math.FloatBetween(1.8, 3.2))
        .setAlpha(Phaser.Math.FloatBetween(0.26, 0.46))
        .setBlendMode(Phaser.BlendModes.SCREEN);
      scene.tweens.add({
        targets: puff,
        x: puff.x + Phaser.Math.Between(-120, 120),
        y: puff.y + Phaser.Math.Between(-70, 70),
        duration: Phaser.Math.Between(8000, 15000),
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }

    // decorative trees framing the edges
    [[50, H - 30], [W - 55, H - 55], [95, H * 0.26], [W - 95, H * 0.3]].forEach(([tx, ty]) => {
      scene.add.image(tx, ty, 'tree').setScrollFactor(0).setScale(0.95).setAlpha(0.85).setDepth(-14);
    });

    // subtle darkening so text stays legible over the fog
    scene.add.rectangle(0, 0, W, H, 0x120a04, 0.3).setOrigin(0).setScrollFactor(0).setDepth(-12);
  },

  // A rounded, glowing button. Returns the container.
  button(scene, x, y, label, onClick, opts = {}) {
    const w = opts.width || 240, h = opts.height || 58;
    const fs = opts.fontSize || 24;
    const accent = opts.accent || 0x6fb8ff;
    const bg = opts.bg || 0x241a10;
    const c = scene.add.container(x, y).setDepth(opts.depth || 100).setScrollFactor(0);
    let active = false;
    const g = scene.add.graphics();
    const draw = (hot) => {
      g.clear();
      g.fillStyle(hot ? 0x3a2a18 : bg, 0.92);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      g.lineStyle(hot ? 3 : 2, accent, hot ? 0.95 : 0.55);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    };
    draw(false);
    const txt = scene.add.text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif', fontSize: fs + 'px', fontStyle: 'bold', color: '#eaf6ff',
    }).setOrigin(0.5);
    const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    c.add([g, txt, zone]);
    zone.on('pointerover', () => { draw(true); scene.tweens.add({ targets: c, scale: 1.04, duration: 120 }); });
    zone.on('pointerout', () => { draw(active); scene.tweens.add({ targets: c, scale: 1, duration: 120 }); });
    zone.on('pointerdown', (p, lx, ly, event) => {
      if (event) event.stopPropagation();
      SFX.unlock();
      SFX.click();
      if (onClick) onClick();
    });
    c.setLabel = (t) => txt.setText(t);
    c.setActiveState = (a) => { active = a; draw(a); }; // persistent selected look
    return c;
  },

  // A rounded stat pill anchored by its top-left, like a game's currency bar.
  statBadge(scene, x, y, icon, text, opts = {}) {
    const h = opts.height || 40;
    const padX = 14;
    const accent = opts.accent || 0xffd54a;
    const c = scene.add.container(x, y).setScrollFactor(0).setDepth(2000);
    const label = scene.add.text(padX, 0, icon + '  ' + text, {
      fontFamily: 'system-ui, sans-serif', fontSize: (opts.fontSize || 18) + 'px', fontStyle: 'bold', color: '#ffe9a8',
    }).setOrigin(0, 0.5);
    const w = label.width + padX * 2;
    const g = scene.add.graphics();
    g.fillStyle(0x1a120a, 0.85);
    g.fillRoundedRect(0, -h / 2, w, h, h / 2);
    g.lineStyle(2, accent, 0.6);
    g.strokeRoundedRect(0, -h / 2, w, h, h / 2);
    c.add([g, label]);
    return c;
  },

  // A horizontal slider (0..1). Returns { setValue, container }.
  slider(scene, cx, cy, width, value, onChange) {
    const left = cx - width / 2;
    const track = scene.add.rectangle(cx, cy, width, 8, 0x2a1c10)
      .setStrokeStyle(1, 0x6fb8ff, 0.5).setScrollFactor(0).setDepth(100);
    const fill = scene.add.rectangle(left, cy, width * value, 8, 0x6fb8ff)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    const thumb = scene.add.circle(left + width * value, cy, 14, 0xbfe6ff)
      .setStrokeStyle(2, 0xffffff, 0.6).setScrollFactor(0).setDepth(102);

    const setV = (v, fire = true) => {
      v = Phaser.Math.Clamp(v, 0, 1);
      thumb.x = left + width * v;
      fill.width = width * v;
      if (fire && onChange) onChange(v);
    };

    thumb.setInteractive({ useHandCursor: true });
    scene.input.setDraggable(thumb);
    thumb.on('drag', (p, dragX) => setV((dragX - left) / width));
    track.setInteractive({ useHandCursor: true });
    track.on('pointerdown', (p) => setV((p.x - left) / width));

    return { setValue: (v) => setV(v, false), track, fill, thumb };
  },
};
