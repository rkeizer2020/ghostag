// Online multiplayer over Supabase Realtime (no dedicated server needed).
//
// A lobby is simply a Realtime *channel* named "lobby:<CODE>". Players announce
// themselves with Presence (so everyone sees the live player list), and the
// host's presence carries the lobby settings (locked / started / mode). The
// actual match is HOST-AUTHORITATIVE: the lobby creator's browser runs the
// game, detects tags and owns the timer, and broadcasts the authoritative
// state; everyone else sends their input/position and renders what the host
// sends. If the host leaves, the match ends for everyone.
//
// Everything degrades gracefully: with no Supabase client (e.g. inside the
// Claude artifact preview, where network calls are blocked) Net.available()
// is false and the UI explains that Online needs the website.
const Net = {
  MAX_PLAYERS: 8,

  channel: null,
  code: null,
  isHost: false,
  self: null,            // { id, name, char, isHost, locked, started, mode }
  players: {},           // id -> presence meta
  lobby: { locked: false, started: false, mode: 'tag' },
  _onUpdate: null,
  _handlers: {},

  available() {
    return !!(typeof Auth !== 'undefined' && Auth.client);
  },

  inLobby() { return !!this.channel; },

  // ---- identity ----
  myId() {
    if (typeof Auth !== 'undefined' && Auth.loggedIn && Auth.loggedIn() && Auth.user) return Auth.user.id;
    try {
      let id = localStorage.getItem('tagz.netid');
      if (!id) { id = 'g' + Math.random().toString(36).slice(2, 10); localStorage.setItem('tagz.netid', id); }
      return id;
    } catch (e) { return 'g' + Math.random().toString(36).slice(2, 10); }
  },
  myName() {
    const u = (typeof Auth !== 'undefined' && Auth.username && Auth.username());
    if (u) return u;
    try {
      let n = localStorage.getItem('tagz.netname');
      if (!n) { n = 'Player' + Math.floor(Math.random() * 900 + 100); localStorage.setItem('tagz.netname', n); }
      return n;
    } catch (e) { return 'Player' + Math.floor(Math.random() * 900 + 100); }
  },
  setName(n) {
    n = String(n || '').trim().slice(0, 14);
    if (!n) return;
    try { localStorage.setItem('tagz.netname', n); } catch (e) { /* ignore */ }
    if (this.self) { this.self.name = n; this._retrack(); }
  },

  _genCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
    let s = '';
    for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  },

  // ---- lobby lifecycle ----
  createLobby(opts) {
    opts = opts || {};
    if (!this.available()) { opts.onError && opts.onError('Online needs the website and a connection.'); return Promise.resolve({ ok: false }); }
    return this._join(this._genCode(), true, opts);
  },

  joinLobby(code, opts) {
    opts = opts || {};
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    if (!this.available()) { opts.onError && opts.onError('Online needs the website and a connection.'); return Promise.resolve({ ok: false }); }
    if (code.length < 4) { opts.onError && opts.onError('Enter the lobby code.'); return Promise.resolve({ ok: false }); }
    return this._join(code, false, opts);
  },

  _join(code, asHost, opts) {
    const client = Auth.client;
    this.leave();
    this.code = code;
    this.isHost = asHost;
    this._onUpdate = opts.onUpdate || function () {};
    this.lobby = { locked: false, started: false, mode: opts.mode || 'tag' };
    this.self = {
      id: this.myId(), name: this.myName(),
      char: (typeof Settings !== 'undefined' && Settings.getCharacter) ? Settings.getCharacter() : 'blue',
      isHost: asHost, locked: false, started: false, mode: this.lobby.mode,
    };
    this.players = {};

    const ch = client.channel('lobby:' + code, {
      // ack:false → fire-and-forget broadcasts (lower latency for position sync)
      config: { presence: { key: this.self.id }, broadcast: { self: false, ack: false } },
    });
    this.channel = ch;

    ch.on('presence', { event: 'sync' }, () => this._syncPresence());
    ch.on('broadcast', { event: 'start' }, ({ payload }) => this._emit('start', payload));
    ch.on('broadcast', { event: 'g' }, ({ payload }) => this._emit('g', payload));

    return new Promise((resolve) => {
      let settled = false;
      const done = (r) => { if (!settled) { settled = true; resolve(r); } };
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try { await ch.track(this.self); } catch (e) { /* ignore */ }
          if (asHost) {
            done({ ok: true, code });
            this._onUpdate();
          } else {
            // let presence arrive, then verify there's an open host
            setTimeout(() => {
              const host = Object.values(this.players).find((p) => p.isHost);
              if (!host) { this.leave(); opts.onError && opts.onError('Lobby not found.'); done({ ok: false }); return; }
              if (host.started) { this.leave(); opts.onError && opts.onError('That match already started.'); done({ ok: false }); return; }
              if (host.locked) { this.leave(); opts.onError && opts.onError('That lobby is locked.'); done({ ok: false }); return; }
              if (Object.keys(this.players).length > this.MAX_PLAYERS) { this.leave(); opts.onError && opts.onError('That lobby is full.'); done({ ok: false }); return; }
              done({ ok: true, code });
              this._onUpdate();
            }, 800);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.leave();
          opts.onError && opts.onError('Could not connect. Check your connection and try again.');
          done({ ok: false });
        }
      });
    });
  },

  _syncPresence() {
    if (!this.channel) return;
    const state = this.channel.presenceState();
    const players = {};
    Object.keys(state).forEach((key) => {
      const metas = state[key];
      if (metas && metas.length) players[key] = metas[metas.length - 1];
    });
    this.players = players;
    const host = Object.values(players).find((p) => p.isHost);
    if (host) this.lobby = { locked: !!host.locked, started: !!host.started, mode: host.mode || 'tag' };
    // host left mid-lobby -> notify
    if (!host && !this.isHost) this._emit('hostleft', {});
    this._onUpdate();
  },

  playerList() {
    // host first, then by name, stable
    return Object.values(this.players).sort((a, b) => {
      if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });
  },
  count() { return Object.keys(this.players).length; },

  _retrack() {
    if (this.channel && this.self) { try { this.channel.track(this.self); } catch (e) { /* ignore */ } }
  },

  // ---- host controls ----
  setLocked(v) {
    if (!this.isHost || !this.self) return;
    this.self.locked = !!v; this.lobby.locked = !!v;
    this._retrack(); this._onUpdate();
  },
  setMode(mode) {
    if (!this.isHost || !this.self) return;
    this.self.mode = mode; this.lobby.mode = mode;
    this._retrack(); this._onUpdate();
  },

  // Host kicks off the match: mark started (so new joiners are blocked) and
  // tell everyone to launch with the same player roster + shared seed.
  startMatch() {
    if (!this.isHost || !this.self || !this.channel) return;
    this.self.started = true; this.lobby.started = true; this._retrack();
    const payload = {
      mode: this.lobby.mode,
      seed: Math.floor(Math.random() * 1e9),
      // the host picks the map so every client rolls to and plays the same one
      biome: (typeof Biomes !== 'undefined' && Biomes.pick) ? Biomes.pick().key : 'forest',
      hostId: this.self.id,
      players: this.playerList().map((p) => ({ id: p.id, name: p.name, char: p.char })),
      startAt: Date.now() + 600, // small countdown so clients line up
    };
    this.broadcast('start', payload);
    // deliver to the host locally too (broadcast self:false won't echo)
    this._emit('start', payload);
  },

  // ---- messaging (used in-match) ----
  broadcast(event, payload) {
    if (!this.channel) return;
    try { this.channel.send({ type: 'broadcast', event, payload }); } catch (e) { /* ignore */ }
  },
  // Shorthand for per-frame game traffic.
  sendGame(payload) { this.broadcast('g', payload); },

  on(event, cb) {
    (this._handlers[event] = this._handlers[event] || []).push(cb);
    return () => this.off(event, cb);
  },
  off(event, cb) {
    const arr = this._handlers[event];
    if (!arr) return;
    const i = arr.indexOf(cb);
    if (i >= 0) arr.splice(i, 1);
  },
  _emit(event, data) {
    (this._handlers[event] || []).slice().forEach((cb) => { try { cb(data); } catch (e) { /* ignore */ } });
  },

  leave() {
    if (this.channel) {
      try { this.channel.unsubscribe(); } catch (e) { /* ignore */ }
      try { if (Auth.client && Auth.client.removeChannel) Auth.client.removeChannel(this.channel); } catch (e) { /* ignore */ }
    }
    this.channel = null;
    this.code = null;
    this.isHost = false;
    this.players = {};
    this.self = null;
    this.lobby = { locked: false, started: false, mode: 'tag' };
    // NOTE: do NOT clear _handlers here. _join() calls leave() to clean up any
    // prior channel, and the UI registers its 'start' / 'hostleft' listeners
    // once when the panel opens — wiping them here meant "Start match" fired
    // into nothing. Listeners are lightweight and the UI binds them only once
    // (guarded by _onlineBound); the game scene removes its own on shutdown.
  },
};
