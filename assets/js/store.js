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
    audit: [],              // simple audit trail of important events
  });

  let mem = null;
  const load = () => {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY)) || empty(); } catch (e) { mem = empty(); }
    for (const [k, v] of Object.entries(empty())) if (!(k in mem)) mem[k] = v;
    return mem;
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* storage unavailable: keep in memory */ } };

  const id = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const now = () => new Date().toISOString();

  const log = (event, detail = {}) => {
    const db = load();
    db.audit.push({ at: now(), event, user: db.session ? db.session.userId : null, ...detail });
    if (db.audit.length > 500) db.audit.shift();
    save();
  };

  async function hash(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback for insecure contexts (plain http): NOT secure, demo only
      let h = 0; for (const c of text) h = (h * 31 + c.charCodeAt(0)) | 0; return 'weak-' + h;
    }
  }

  return {
    get db() { return load(); },
    save, id, now, log, hash,
    reset() { mem = empty(); save(); },

    // ---- users & session
    currentUser() { const db = load(); return db.session ? db.users.find(u => u.id === db.session.userId) || null : null; },
    findUserByEmail(email) { return load().users.find(u => u.email.toLowerCase() === String(email).toLowerCase()); },
    findUserByUsername(name) { return load().users.find(u => u.username.toLowerCase() === String(name).toLowerCase()); },
    addUser(user) { const db = load(); db.users.push(user); save(); log('consumer_registered', { userId: user.id }); return user; },
    updateUser(id, patch) { const db = load(); const u = db.users.find(x => x.id === id); Object.assign(u, patch); save(); return u; },
    login(userId) { load().session = { userId, since: now() }; save(); log('login'); },
    logout() { log('logout'); load().session = null; save(); },

    // ---- email verification (simulated)
    startVerification(email, type) {
      const token = id('V');
      load().pending[email.toLowerCase()] = { token, type, at: now() }; save();
      log('verification_mail_sent', { type });
      return token;
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
    cancelReservation(resId) {
      const r = load().reservations.find(x => x.id === resId);
      if (r) { r.status = 'cancelled'; r.cancelledAt = now(); save(); log('reservation_cancelled', { reservationId: resId }); }
      return r;
    },
    reservationsFor(userId) { return load().reservations.filter(r => r.userId === userId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)); },

    // ---- payments
    addPayment(p) { const db = load(); db.payments.push(p); save(); log('payment_' + p.status, { paymentId: p.id }); return p; },

    // ---- restaurant applications
    addApplication(a) { const db = load(); db.applications.push(a); save(); log('restaurant_application', { applicationId: a.id }); return a; },
    updateApplication(id, patch) { const a = load().applications.find(x => x.id === id); Object.assign(a, patch); save(); log('restaurant_application_' + (patch.status || 'updated'), { applicationId: id }); return a; },
  };
})();
