/* Cooking.com demo – data store.
 * DEMO ONLY: all data lives in the visitor's own browser (localStorage).
 * There is no server; nothing is shared between visitors.
 */
window.CK_STORE = (() => {
  const KEY = 'cookingcom_demo_v1';
  const empty = () => ({
    users: [],              // consumers
    session: null,          // { userId }
    pending: {},            // email verifications in progress: { email: { token, type } }
    reservations: [],
    payments: [],           // only token + last 4 digits, never the full card number
    applications: [],       // restaurant sign-ups
    vouchers: [],           // referral discount vouchers
    loginAttempts: {},      // failed sign-ins per account: { key: { count, first, lockedUntil } }
    audit: [],              // simple audit trail of important events
  });
  const C = window.CK_CONFIG, V = window.CK_VALIDATE;

  // Several tabs share the same localStorage. Every read checks whether another tab has saved newer data,
  // so a tab never works with (and then saves) an old copy. Without this, a second open tab could use a
  // voucher twice, undo a sign-out or a sign-in lock, and overwrite bookings made in the first tab.
  let mem = null;
  let lastRaw;                                   // the stored text that `mem` was read from or saved as
  const readRaw = () => { try { return localStorage.getItem(KEY); } catch (e) { return undefined; } };   // undefined = storage unavailable
  const load = () => {
    const raw = readRaw();
    if (mem && (raw === undefined || raw === lastRaw)) return mem;
    try { mem = (raw && JSON.parse(raw)) || empty(); } catch (e) { mem = empty(); }
    lastRaw = raw;
    for (const [k, v] of Object.entries(empty())) if (!(k in mem)) mem[k] = v;
    return mem;
  };
  const save = () => {
    const raw = JSON.stringify(mem);
    try { localStorage.setItem(KEY, raw); lastRaw = raw; } catch (e) { /* storage unavailable: keep in memory */ }
  };

  // Tell the page when another tab changed the data, e.g. signed out
  const listeners = [];
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY && e.key !== null) return;          // key null = storage was cleared
    const before = mem && mem.session ? mem.session.userId : null;
    const s = load().session;
    const after = s ? s.userId : null;
    listeners.forEach(fn => fn({ sessionChanged: before !== after }));
  });

  // Random characters from the browser's cryptographic random generator (not Math.random, which is predictable)
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomChars = (n) => {
    let out = '';
    while (out.length < n) {
      for (const b of crypto.getRandomValues(new Uint8Array(n))) {
        if (b < 252 && out.length < n) out += ALPHABET[b % 36];   // 252 = 7 × 36: avoids bias
      }
    }
    return out;
  };
  // Human-readable reference shown to customers (reservation number, voucher, referral code)
  const id = (prefix) => prefix + '-' + randomChars(6);
  // Secret value nobody should be able to guess (verification and payment tokens): 32 chars ≈ 165 bits
  const token = (prefix) => prefix + '_' + randomChars(32).toLowerCase();
  const now = () => new Date().toISOString();
  const hex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

  const log = (event, detail = {}) => {
    const db = load();
    db.audit.push({ at: now(), event, user: db.session ? db.session.userId : null, ...detail });
    if (db.audit.length > 500) db.audit.shift();
    save();
  };

  // ---- passwords: salted PBKDF2-SHA256, stored as "pbkdf2-sha256$<iterations>$<salt>$<hash>".
  // Needs a secure context (HTTPS or localhost); there is deliberately no weak fallback any more.
  const secureCrypto = () => !!(window.isSecureContext && crypto.subtle);
  async function pbkdf2(password, saltHex, iterations) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
  }
  async function hashPassword(password) {
    if (!secureCrypto()) throw new Error('insecure-context');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const iterations = C.passwordHashIterations;
    return `pbkdf2-sha256$${iterations}$${salt}$${await pbkdf2(password, salt, iterations)}`;
  }
  // Returns { ok, legacy }. Legacy = old unsalted hash from before v1.3.1, to be replaced after a successful sign-in.
  async function verifyPassword(password, stored) {
    if (!secureCrypto()) throw new Error('insecure-context');
    const s = String(stored || '');
    if (s.startsWith('pbkdf2-sha256$')) {
      const [, iter, salt, expected] = s.split('$');
      return { ok: (await pbkdf2(password, salt, Number(iter))) === expected, legacy: false };
    }
    if (/^[0-9a-f]{64}$/.test(s)) return { ok: hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))) === s, legacy: true };
    if (s.startsWith('weak-')) { let h = 0; for (const c of password) h = (h * 31 + c.charCodeAt(0)) | 0; return { ok: 'weak-' + h === s, legacy: true }; }
    return { ok: false, legacy: false };
  }

  // ---- session expiry: idle timeout and maximum session length
  let sessionExpired = false;
  const sessionValid = (s, t = Date.now()) => {
    const since = Date.parse(s.since), last = Date.parse(s.lastSeen || s.since);
    return !isNaN(since) && !isNaN(last)
      && t - last <= C.sessionIdleMinutes * 60000
      && t - since <= C.sessionMaxHours * 3600000;
  };

  const attemptKey = (identifier) => String(identifier || '').trim().toLowerCase();

  return {
    get db() { return load(); },
    save, id, token, now, log, hashPassword, verifyPassword, secureCrypto,
    reset() { mem = empty(); save(); },
    onExternalChange(fn) { listeners.push(fn); },

    // ---- users & session
    currentUser() {
      const db = load();
      if (!db.session) return null;
      if (!sessionValid(db.session)) { log('session_expired'); db.session = null; save(); sessionExpired = true; return null; }
      return db.users.find(u => u.id === db.session.userId) || null;
    },
    touchSession() { const db = load(); if (db.session && sessionValid(db.session)) { db.session.lastSeen = now(); save(); } },
    takeSessionExpired() { const e = sessionExpired; sessionExpired = false; return e; },
    findUserByEmail(email) { return load().users.find(u => u.email.toLowerCase() === String(email).toLowerCase()); },
    findUserByUsername(name) { return load().users.find(u => u.username.toLowerCase() === String(name).toLowerCase()); },
    addUser(user) { const db = load(); db.users.push(user); save(); log('consumer_registered', { userId: user.id }); return user; },
    updateUser(id, patch) { const db = load(); const u = db.users.find(x => x.id === id); Object.assign(u, patch); save(); return u; },
    login(userId) { const t = now(); load().session = { userId, since: t, lastSeen: t }; save(); log('login'); },
    logout() { log('logout'); load().session = null; save(); },

    // ---- protection against password guessing: temporary lock after too many failed sign-ins.
    // Counted per entered e-mail/username, also for accounts that do not exist (so the lock reveals nothing).
    loginLockedUntil(identifier) {
      const a = load().loginAttempts[attemptKey(identifier)];
      return a && a.lockedUntil && Date.parse(a.lockedUntil) > Date.now() ? a.lockedUntil : null;
    },
    recordFailedLogin(identifier) {
      const db = load(), k = attemptKey(identifier), t = Date.now();
      let a = db.loginAttempts[k];
      if (!a || t - Date.parse(a.first) > C.loginLockMinutes * 60000) a = db.loginAttempts[k] = { count: 0, first: now() };
      a.count++;
      if (a.count >= C.maxFailedLogins) { a.lockedUntil = new Date(t + C.loginLockMinutes * 60000).toISOString(); a.count = 0; a.first = now(); log('login_locked'); }
      save(); log('login_failed');
    },
    clearFailedLogins(identifier) { delete load().loginAttempts[attemptKey(identifier)]; save(); },

    // ---- email verification (simulated)
    startVerification(email, type) {
      const t = token('vrf');
      load().pending[email.toLowerCase()] = { token: t, type, at: now() }; save();
      log('verification_mail_sent', { type });
      return t;
    },
    verify(email, token) {
      const p = load().pending[email.toLowerCase()];
      const ok = !!p && p.token === token;
      if (ok) { delete load().pending[email.toLowerCase()]; save(); log('email_verified', { type: p.type }); }
      return ok;
    },

    // ---- reservations
    bookedGuests(restaurantId, date, time) {
      return load().reservations
        .filter(r => r.restaurantId === restaurantId && r.date === date && r.time === time && r.status !== 'cancelled')
        .reduce((s, r) => s + r.guests, 0);
    },
    addReservation(res) { const db = load(); db.reservations.push(res); save(); log('reservation_created', { reservationId: res.id }); return res; },
    // Only the owner can cancel, only a confirmed reservation, and not after the date has passed
    cancelReservation(resId, userId, todayIso) {
      const r = load().reservations.find(x => x.id === resId);
      if (!V.canCancel(r, userId, todayIso)) { log('reservation_cancel_refused', { reservationId: resId }); return null; }
      r.status = 'cancelled'; r.cancelledAt = now(); save(); log('reservation_cancelled', { reservationId: resId });
      return r;
    },
    reservationsFor(userId) { return load().reservations.filter(r => r.userId === userId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)); },

    // ---- payments
    addPayment(p) { const db = load(); db.payments.push(p); save(); log('payment_' + p.status, { paymentId: p.id }); return p; },

    // ---- referrals & vouchers
    findUserByReferralCode(code) { return load().users.find(u => u.referralCode && u.referralCode === String(code).trim().toUpperCase()); },
    ensureReferralCode(userId) {
      const u = load().users.find(x => x.id === userId);
      if (u && !u.referralCode) { u.referralCode = id('REF'); save(); }
      return u && u.referralCode;
    },
    referralsBy(userId) { return load().users.filter(u => u.referredBy === userId); },
    issueVoucher(v) { const db = load(); db.vouchers.push(v); save(); log('voucher_issued', { voucherId: v.id, to: v.userId, referredUserId: v.referredUserId }); return v; },
    vouchersFor(userId) { return load().vouchers.filter(v => v.userId === userId); },
    redeemVoucher(voucherId, paymentId) {
      const v = load().vouchers.find(x => x.id === voucherId);
      if (v) { v.status = 'redeemed'; v.redeemedAt = now(); v.paymentId = paymentId; save(); log('voucher_redeemed', { voucherId, paymentId }); }
      return v;
    },

    // ---- restaurant applications
    addApplication(a) { const db = load(); db.applications.push(a); save(); log('restaurant_application', { applicationId: a.id }); return a; },
    updateApplication(id, patch) { const a = load().applications.find(x => x.id === id); Object.assign(a, patch); save(); log('restaurant_application_' + (patch.status || 'updated'), { applicationId: id }); return a; },
  };
})();
