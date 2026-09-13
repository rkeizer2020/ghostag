// Account + cloud sync via Supabase. Username/password logins keep your best
// score, coins and skins on your account so they follow you to any device.
// The website has no CSP so the Supabase SDK loads and connects normally;
// inside the Claude artifact preview network calls are blocked, so cloud sync
// is simply unavailable there and the game runs fully local.
const Auth = {
  URL: 'https://oijjoraxpbktrvgdeban.supabase.co',
  KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pampvcmF4cGJrdHJ2Z2RlYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODI5ODAsImV4cCI6MjEwNDg1ODk4MH0.VYSBs7ZwxJ3f9Raw9PudxRf-aDqMtoZrkRVTkyDooN4',

  client: null,
  user: null,
  onChange: null,
  _pushTimer: null,

  init(onChange) {
    this.onChange = onChange || function () {};
    // Load the Supabase SDK in the background so a slow/blocked network never
    // stops the game from starting; cloud features light up once it arrives.
    this._loadSdk(() => this._start());
  },

  _loadSdk(cb) {
    if (window.supabase && window.supabase.createClient) { cb(); return; }
    try {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.async = true;
      s.onload = () => { try { cb(); } catch (e) { /* ignore */ } };
      s.onerror = () => { /* offline: stay fully local */ };
      document.head.appendChild(s);
    } catch (e) { /* ignore */ }
  },

  _start() {
    if (!window.supabase || !window.supabase.createClient) return;
    try {
      this.client = window.supabase.createClient(this.URL, this.KEY, {
        auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage },
      });
    } catch (e) { this.client = null; return; }

    this.client.auth.getSession().then(({ data }) => {
      if (data && data.session) {
        this.user = data.session.user;
        this._createOrMerge(this.username());
      }
      this.onChange();
    }).catch(() => { this.onChange(); });
    this.client.auth.onAuthStateChange((_e, session) => {
      this.user = session ? session.user : null;
      this.onChange();
    });
    this.onChange();
  },

  available() { return !!this.client; },
  loggedIn() { return !!this.user; },
  username() {
    if (!this.user) return null;
    const m = this.user.user_metadata || {};
    return m.username || (this.user.email || '').split('@')[0];
  },

  _email(u) {
    return u.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') + '@ghostag.play';
  },

  // Founder accounts get everything unlocked automatically on login.
  FOUNDERS: ['azarios88'],
  _isFounder(name) {
    return !!name && this.FOUNDERS.indexOf(name.trim().toLowerCase()) !== -1;
  },

  async signUp(u, p) {
    if (!this.client) return { ok: false, msg: 'Cloud not available here.' };
    if (u.trim().length < 3) return { ok: false, msg: 'Username needs 3+ letters.' };
    if (p.length < 6) return { ok: false, msg: 'Password needs 6+ characters.' };
    const email = this._email(u);
    const { data, error } = await this.client.auth.signUp({ email, password: p, options: { data: { username: u.trim() } } });
    if (error) return { ok: false, msg: error.message };
    if (!data.session) {
      const si = await this.client.auth.signInWithPassword({ email, password: p });
      if (si.error) return { ok: false, msg: 'Account made, but turn OFF "Confirm email" in Supabase to log in.' };
      this.user = si.data.user;
    } else {
      this.user = data.user;
    }
    await this._createOrMerge(u.trim());
    return { ok: true };
  },

  async signIn(u, p) {
    if (!this.client) return { ok: false, msg: 'Cloud not available here.' };
    const email = this._email(u);
    const { data, error } = await this.client.auth.signInWithPassword({ email, password: p });
    if (error) {
      const m = /confirm/i.test(error.message) ? 'Turn OFF "Confirm email" in Supabase.' : 'Wrong username or password.';
      return { ok: false, msg: m };
    }
    this.user = data.user;
    await this._createOrMerge(u.trim());
    return { ok: true };
  },

  async signOut() {
    if (this.client) await this.client.auth.signOut();
    this.user = null;
    this.onChange();
  },

  // ---- local <-> cloud ----
  _readLocal() {
    const skins = Storage.getOwnedSkins();
    if (Storage.isOwnerUnlocked() && !skins.includes('owner')) skins.push('owner');
    return {
      highscore: Storage.getHighscore(),
      coins: Storage.getCoins(),
      skins: skins.join(','),
      equipped_char: Settings.getCharacter(),
      equipped_skin: Settings.getSkin(),
    };
  },

  _writeLocal(m) {
    try {
      Storage.setHighscore(m.highscore || 0);
      localStorage.setItem('tagz.coins', String(m.coins || 0));
      const skins = String(m.skins || '').split(',').filter(Boolean);
      if (skins.includes('owner')) localStorage.setItem('tagz.owner', '1');
      localStorage.setItem('tagz.skins', skins.filter((s) => s !== 'owner').join(','));
      if (m.equipped_char) localStorage.setItem('tagz.character', m.equipped_char);
      if (m.equipped_skin) localStorage.setItem('tagz.skin', m.equipped_skin);
    } catch (e) { /* ignore */ }
  },

  _union(a, b) {
    const set = new Set(String(a || '').split(',').filter(Boolean));
    String(b || '').split(',').filter(Boolean).forEach((x) => set.add(x));
    return Array.from(set).join(',');
  },

  _row(m) {
    return {
      highscore: m.highscore, coins: m.coins, skins: m.skins,
      equipped_char: m.equipped_char, equipped_skin: m.equipped_skin, updated_at: new Date().toISOString(),
    };
  },

  async _createOrMerge(uname) {
    if (!this.client || !this.user) return;
    const id = this.user.id;
    let row = null;
    try {
      const res = await this.client.from('saves').select('*').eq('id', id).maybeSingle();
      row = res.data;
    } catch (e) { /* ignore */ }
    const local = this._readLocal();
    let merged;
    if (!row) {
      merged = local;
    } else {
      merged = {
        highscore: Math.max(local.highscore, row.highscore || 0),
        coins: Math.max(local.coins, row.coins || 0),
        skins: this._union(local.skins, row.skins),
        equipped_char: row.equipped_char || local.equipped_char,
        equipped_skin: row.equipped_skin || local.equipped_skin,
      };
    }

    // founder accounts: grant everything
    const effName = uname || this.username();
    if (this._isFounder(effName)) {
      merged.skins = Settings.SKIN_ORDER.join(','); // all skins incl. owner
      merged.highscore = Math.max(merged.highscore, 100000);
      merged.coins = Math.max(merged.coins, 100000);
    }

    try {
      if (!row) await this.client.from('saves').insert({ id, username: effName, ...this._row(merged) });
      else await this.client.from('saves').update(this._row(merged)).eq('id', id);
    } catch (e) { /* ignore */ }

    this._writeLocal(merged);
    this.onChange();
  },

  // Debounced push of the current local state to the cloud.
  queuePush() {
    if (!this.client || !this.user) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => {
      const l = this._readLocal();
      try { this.client.from('saves').update(this._row(l)).eq('id', this.user.id); } catch (e) { /* ignore */ }
    }, 700);
  },
};
