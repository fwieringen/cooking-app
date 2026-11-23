/* Cooking.com demo – application (single-page app with hash routing) */
(() => {
  const D = window.CK_DATA, V = window.CK_VALIDATE, S = window.CK_STORE, C = window.CK_CONFIG;
  const app = document.getElementById('app');

  // ------------------------------------------------------------------ helpers
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const addDaysISO = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const money = (amount, cur = 'EUR') => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur }).format(amount);
  const priceSigns = (n) => '€€€€'.slice(0, n) + '<span class="muted">' + '€€€€'.slice(n) + '</span>';
  const restaurant = (id) => D.restaurants.find(r => r.id === id);
  const cuisine = (key) => D.cuisines[key];
  const go = (hash) => { location.hash = hash; };
  const parseHash = () => {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    return { parts: path.split('/').filter(Boolean), params: Object.fromEntries(new URLSearchParams(query)) };
  };
  const toast = (msg, type = 'ok') => {
    const t = document.createElement('div');
    t.className = 'toast toast-' + type; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
  };
  const fieldError = (form, name, msg) => {
    const input = form.elements[name]; if (!input) return;
    const wrap = input.closest('.field') || input.parentElement;
    wrap.classList.add('has-error');
    let e = qs('.error', wrap); if (!e) { e = document.createElement('div'); e.className = 'error'; wrap.appendChild(e); }
    e.textContent = msg; e.setAttribute('data-testid', 'error-' + name);
  };
  const clearErrors = (form) => qsa('.has-error', form).forEach(w => { w.classList.remove('has-error'); const e = qs('.error', w); if (e) e.remove(); });
  const thumb = (r, size = '') => {
    const c = cuisine(r.cuisine);
    return `<div class="thumb ${size}" style="--from:${c.from};--to:${c.to}" aria-hidden="true"><span>${c.emoji}</span></div>`;
  };
  // A time slot today can only be booked at least 30 minutes in advance
  const slotInPast = (isoDate, time) => {
    if (isoDate !== todayISO()) return false;
    const [h, m] = time.split(':').map(Number); const slot = new Date(); slot.setHours(h, m, 0, 0);
    return slot.getTime() - Date.now() < 30 * 60000;
  };
  // Time slots offered by a restaurant: not before its opening time (first time in its opening hours)
  const slotsFor = (r) => {
    const m = r.hours.match(/(\d{2}):(\d{2})/); const open = m ? m[0] : '00:00';
    return D.timeSlots.filter(t => t >= open);
  };
  const scoreBadge = (r) => `<span class="score" title="Guest rating">${r.rating.toFixed(1)}</span>`;
  const scoreWord = (s) => s >= 9 ? 'Exceptional' : s >= 8.5 ? 'Superb' : s >= 8 ? 'Very good' : 'Good';

  // ------------------------------------------------------------------ layout
  function renderChrome() {
    const user = S.currentUser();
    qs('#nav-user').innerHTML = user
      ? `<a href="#/account" class="btn btn-ghost" data-testid="nav-account">👤 ${esc(user.firstName)}</a>
         <button class="btn btn-ghost" id="logout-btn" data-testid="nav-logout">Sign out</button>`
      : `<a href="#/register" class="btn btn-outline" data-testid="nav-register">Register</a>
         <a href="#/login" class="btn btn-primary" data-testid="nav-login">Sign in</a>`;
    const lo = qs('#logout-btn'); if (lo) lo.onclick = () => { S.logout(); toast('You have been signed out.'); go('#/'); renderChrome(); };

    const banner = qs('#env-banner');
    if (C.environment !== 'production') {
      banner.hidden = false;
      banner.textContent = (C.environment === 'test' ? 'TEST ENVIRONMENT' : 'DEVELOPMENT') + ` · version ${C.APP_VERSION} · not for real bookings`;
    }
    qs('#app-version').textContent = `v${C.APP_VERSION} · ${C.environment}`;
  }

  // ------------------------------------------------------------------ search form (shared)
  function searchForm(p = {}) {
    const cityOpts = D.cities.map(c => `<option ${p.city === c.name ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    const timeOpts = D.timeSlots.map(t => `<option ${(p.time || '19:00') === t ? 'selected' : ''}>${t}</option>`).join('');
    const guestOpts = Array.from({ length: C.maxGuests }, (_, i) => i + 1).map(n => `<option value="${n}" ${Number(p.guests || 2) === n ? 'selected' : ''}>${n} ${n === 1 ? 'guest' : 'guests'}</option>`).join('');
    return `
      <form class="searchbar" id="search-form" data-testid="search-form" role="search">
        <label class="sb-field sb-city"><span>📍</span>
          <select name="city" aria-label="City" data-testid="search-city"><option value="">Where are you going?</option>${cityOpts}</select></label>
        <label class="sb-field"><span>📅</span><input type="date" name="date" aria-label="Date" value="${esc(p.date || todayISO())}" min="${todayISO()}" data-testid="search-date"></label>
        <label class="sb-field"><span>🕖</span><select name="time" aria-label="Time" data-testid="search-time">${timeOpts}</select></label>
        <label class="sb-field"><span>👥</span><select name="guests" aria-label="Guests" data-testid="search-guests">${guestOpts}</select></label>
        <button class="btn btn-primary btn-lg" type="submit" data-testid="search-submit">Search</button>
      </form>`;
  }
  function bindSearch() {
    const f = qs('#search-form'); if (!f) return;
    f.onsubmit = (e) => {
      e.preventDefault();
      const p = new URLSearchParams({ city: f.city.value, date: f.date.value, time: f.time.value, guests: f.guests.value });
      go('#/search?' + p.toString());
    };
  }

  // ------------------------------------------------------------------ views
  function viewHome() {
    const user = S.currentUser();
    let recommended = '';
    if (user && user.taste) {
      const recs = recommend(user).slice(0, 3);
      recommended = `
        <section class="container section" data-testid="recommended">
          <h2>Recommended for you, ${esc(user.firstName)}</h2>
          <p class="muted">Based on your taste profile.</p>
          <div class="grid cards-3">${recs.map(cardRestaurant).join('')}</div>
        </section>`;
    }
    const cityCards = D.cities.map(c => {
      const n = D.restaurants.filter(r => r.city === c.name).length;
      return `<a class="city-card" href="#/search?city=${encodeURIComponent(c.name)}"><strong>${esc(c.name)}</strong><span>${n} restaurant${n === 1 ? '' : 's'}</span></a>`;
    }).join('');
    app.innerHTML = `
      <section class="hero">
        <div class="container">
          <h1>Find your table. Taste the world.</h1>
          <p class="lead">Book restaurants in 47 markets — from a quick bite tonight to a culinary package deal.</p>
          ${searchForm()}
        </div>
      </section>
      ${recommended}
      <section class="container section">
        <h2>Explore by city</h2>
        <div class="city-grid">${cityCards}</div>
      </section>
      <section class="container section">
        <div class="section-head"><h2>Package deals</h2><a href="#/deals">See all deals →</a></div>
        <p class="muted">A fixed price for a complete culinary experience — dinner, drinks and sometimes a hotel or taxi.</p>
        <div class="grid cards-3">${D.deals.slice(0, 3).map(cardDeal).join('')}</div>
      </section>
      <section class="container section usp">
        <div><span>✅</span><h3>Free reservations</h3><p>Booking a table never costs you anything.</p></div>
        <div><span>⭐</span><h3>Genuine reviews</h3><p>Only guests who actually dined can leave a review.</p></div>
        <div><span>🔒</span><h3>Secure payments</h3><p>Package deals are paid via our payment service provider; we never store your full card number.</p></div>
      </section>
      <section class="container section partner-cta">
        <div><h2>Own a restaurant?</h2><p>Reach millions of hungry guests. Sign up in minutes.</p></div>
        <a href="#/partner" class="btn btn-primary btn-lg" data-testid="cta-partner">List your restaurant</a>
      </section>`;
    bindSearch();
  }

  function recommend(user) {
    const t = user.taste || {};
    return D.restaurants
      .map(r => {
        let s = r.rating;
        if (t.diet === 'Vegetarian' || t.diet === 'Vegan') s += r.cuisine === 'vegetarian' ? 5 : 0;
        if (t.diet === 'Pescatarian') s += r.cuisine === 'seafood' ? 4 : 0;
        if (t.style === 'Fine dining') s += r.price >= 4 ? 3 : 0;
        if (t.style === 'Casual & quick') s += r.price <= 1 ? 3 : 0;
        if (t.style === 'Lively & social') s += r.tags.some(x => /Lively|Group|Late/.test(x)) ? 2 : 0;
        if (t.spice === 'The hotter the better') s += ['indonesian', 'mexican'].includes(r.cuisine) ? 2 : 0;
        if (user.city && r.city === user.city) s += 1;
        return { r, s };
      })
      .sort((a, b) => b.s - a.s).map(x => x.r);
  }

  const cardRestaurant = (r, extra = '') => `
    <a class="card" href="#/restaurant/${r.id}" data-testid="restaurant-card" data-id="${r.id}">
      ${thumb(r)}
      <div class="card-body">
        <div class="card-top"><h3>${esc(r.name)}</h3>${scoreBadge(r)}</div>
        <div class="muted">${esc(cuisine(r.cuisine).label)} · ${esc(r.city)} · ${priceSigns(r.price)}</div>
        ${extra}
      </div>
    </a>`;

  const cardDeal = (d) => {
    const r = restaurant(d.restaurantId); const cur = d.currency || D.currencyFor(r.city);
    return `
    <a class="card deal" href="#/deal/${d.id}" data-testid="deal-card" data-id="${d.id}">
      ${thumb(r)}
      <div class="card-body">
        <span class="pill">Package deal</span>
        <h3>${esc(d.title)}</h3>
        <div class="muted">${esc(r.name)} · ${esc(r.city)}</div>
        <div class="price">${money(d.price, cur)} <small>for ${d.persons}</small></div>
      </div>
    </a>`;
  };

  function viewSearch(p) {
    const date = p.date || todayISO(), time = p.time || '19:00', guests = Number(p.guests || 2);
    let list = D.restaurants.filter(r => (!p.city || r.city === p.city) && (!p.cuisine || r.cuisine === p.cuisine) && (!p.price || r.price <= Number(p.price)));
    const sort = p.sort || 'rating';
    list.sort((a, b) => sort === 'price' ? a.price - b.price : sort === 'name' ? a.name.localeCompare(b.name) : b.rating - a.rating);

    const cuisineOpts = Object.entries(D.cuisines).map(([k, c]) => `<option value="${k}" ${p.cuisine === k ? 'selected' : ''}>${c.label}</option>`).join('');
    const results = list.map(r => {
      const left = r.seats - S.bookedGuests(r.id, date, time);
      const open = slotsFor(r).includes(time);
      const avail = !open ? `<div class="avail no" data-testid="availability">Not open at ${time}</div>`
        : left >= guests && !slotInPast(date, time)
        ? `<div class="avail ok" data-testid="availability">✓ Available at ${time} for ${guests}</div>`
        : `<div class="avail no" data-testid="availability">${slotInPast(date, time) ? 'No longer available at ' : 'Fully booked at '}${time}</div>`;
      return `
      <a class="result" href="#/restaurant/${r.id}?date=${date}&time=${time}&guests=${guests}" data-testid="result" data-id="${r.id}">
        ${thumb(r, 'thumb-lg')}
        <div class="result-body">
          <h3>${esc(r.name)}</h3>
          <div class="muted">${esc(cuisine(r.cuisine).label)} · ${esc(r.city)} · ${priceSigns(r.price)}</div>
          <p>${esc(r.description)}</p>
          <div class="tags">${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          ${avail}
        </div>
        <div class="result-side">
          <div class="score-block"><div><strong>${scoreWord(r.rating)}</strong><small>${r.reviews.toLocaleString('en-GB')} reviews</small></div>${scoreBadge(r)}</div>
          <span class="btn btn-primary">See availability</span>
        </div>
      </a>`;
    }).join('');

    app.innerHTML = `
      <section class="hero hero-slim"><div class="container">${searchForm(p)}</div></section>
      <div class="container layout-search">
        <aside class="filters" data-testid="filters">
          <h3>Filter by</h3>
          <label class="field"><span>Cuisine</span><select id="f-cuisine" data-testid="filter-cuisine"><option value="">All cuisines</option>${cuisineOpts}</select></label>
          <label class="field"><span>Maximum price</span><select id="f-price" data-testid="filter-price">
            <option value="">Any</option>${[1, 2, 3, 4].map(n => `<option value="${n}" ${Number(p.price) === n ? 'selected' : ''}>${'€'.repeat(n)}</option>`).join('')}</select></label>
          <label class="field"><span>Sort by</span><select id="f-sort" data-testid="filter-sort">
            <option value="rating" ${sort === 'rating' ? 'selected' : ''}>Top rated</option>
            <option value="price" ${sort === 'price' ? 'selected' : ''}>Price (low to high)</option>
            <option value="name" ${sort === 'name' ? 'selected' : ''}>Name</option></select></label>
        </aside>
        <section>
          <h1 class="h2" data-testid="results-title">${esc(p.city || 'All destinations')}: ${list.length} restaurant${list.length === 1 ? '' : 's'} found</h1>
          <p class="muted">${fmtDate(date)} · ${time} · ${guests} guest${guests === 1 ? '' : 's'}</p>
          <div class="results">${results || '<div class="empty" data-testid="no-results">No restaurants match your filters. Try another city or cuisine.</div>'}</div>
        </section>
      </div>`;
    bindSearch();
    const refilter = () => {
      const np = new URLSearchParams({ ...p, cuisine: qs('#f-cuisine').value, price: qs('#f-price').value, sort: qs('#f-sort').value });
      for (const [k, v] of [...np.entries()]) if (!v) np.delete(k);
      go('#/search?' + np.toString());
    };
    ['#f-cuisine', '#f-price', '#f-sort'].forEach(s => qs(s).onchange = refilter);
  }

  function viewRestaurant(id, p) {
    const r = restaurant(id);
    if (!r) return viewNotFound();
    const date = p.date || todayISO(), guests = Number(p.guests || 2);
    const reviews = D.reviews[r.id] || [];
    const deal = D.deals.find(d => d.restaurantId === r.id);
    const user = S.currentUser();

    app.innerHTML = `
      <div class="container section">
        <nav class="crumbs"><a href="#/">Home</a> › <a href="#/search?city=${encodeURIComponent(r.city)}">${esc(r.city)}</a> › ${esc(r.name)}</nav>
        <div class="detail">
          <div>
            ${thumb(r, 'thumb-hero')}
            <div class="detail-head">
              <div><h1 data-testid="restaurant-name">${esc(r.name)}</h1>
                <div class="muted">📍 ${esc(r.address)} · ${esc(cuisine(r.cuisine).label)} · ${priceSigns(r.price)}</div></div>
              <div class="score-block"><div><strong>${scoreWord(r.rating)}</strong><small>${r.reviews.toLocaleString('en-GB')} reviews</small></div>${scoreBadge(r)}</div>
            </div>
            <p class="lead-sm">${esc(r.description)}</p>
            <div class="info-grid">
              <div><h4>Signature dish</h4><p>${esc(r.signature)}</p></div>
              <div><h4>Menus</h4><p>${r.menus.map(esc).join(' · ')}</p></div>
              <div><h4>Opening hours</h4><p>${esc(r.hours)}</p></div>
              <div><h4>Good to know</h4><p>${r.tags.map(esc).join(' · ')}</p></div>
            </div>
            ${deal ? `<a class="deal-banner" href="#/deal/${deal.id}"><span class="pill">Package deal</span> <strong>${esc(deal.title)}</strong> — ${money(deal.price, deal.currency || D.currencyFor(r.city))} for ${deal.persons} →</a>` : ''}
            <h2>Guest reviews</h2>
            <div class="reviews" data-testid="reviews">
              ${reviews.length ? reviews.map(v => `<div class="review"><span class="score sm">${v.score}</span><div><strong>${esc(v.user)}</strong><p>${esc(v.text)}</p></div></div>`).join('') : '<p class="muted">No reviews yet.</p>'}
            </div>
          </div>
          <aside class="booking-box" data-testid="booking-box">
            <h2>Reserve a table</h2>
            <p class="muted small">Free of charge · instant confirmation</p>
            <form id="book-form" novalidate>
              <label class="field"><span>Date</span><input type="date" name="date" value="${esc(date)}" min="${todayISO()}" max="${addDaysISO(C.bookingHorizonDays)}" data-testid="book-date"></label>
              <label class="field"><span>Guests</span><select name="guests" data-testid="book-guests">
                ${Array.from({ length: C.maxGuests }, (_, i) => i + 1).map(n => `<option value="${n}" ${n === guests ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
              <div class="field"><span>Time</span><div class="slots" id="slots" data-testid="slots"></div></div>
              <label class="field"><span>Special requests (optional)</span><textarea name="note" rows="2" maxlength="300" placeholder="Allergies, occasion, high chair…" data-testid="book-note"></textarea></label>
              <button class="btn btn-primary btn-block" type="submit" data-testid="book-submit">${user ? 'Confirm reservation' : 'Sign in to reserve'}</button>
            </form>
          </aside>
        </div>
      </div>`;

    const f = qs('#book-form');
    let chosen = p.time || null;
    const drawSlots = () => {
      const g = Number(f.guests.value);
      qs('#slots').innerHTML = slotsFor(r).map(t => {
        const left = r.seats - S.bookedGuests(r.id, f.date.value, t);
        const ok = left >= g && !slotInPast(f.date.value, t);
        if (!ok && chosen === t) chosen = null;
        return `<button type="button" class="slot ${chosen === t ? 'sel' : ''}" data-time="${t}" ${ok ? '' : 'disabled'} data-testid="slot-${t.replace(':', '')}" title="${ok ? left + ' seats left' : 'Fully booked'}">${t}</button>`;
      }).join('');
      qsa('.slot', qs('#slots')).forEach(b => b.onclick = () => { chosen = b.dataset.time; drawSlots(); });
    };
    f.date.onchange = drawSlots; f.guests.onchange = drawSlots; drawSlots();

    f.onsubmit = (e) => {
      e.preventDefault(); clearErrors(f);
      const g = Number(f.guests.value);
      if (!S.currentUser()) {
        sessionStorageSet('ck_return', `#/restaurant/${r.id}?date=${f.date.value}&time=${chosen || ''}&guests=${g}`);
        toast('Please sign in or register to make a reservation.', 'info');
        return go('#/login');
      }
      let ok = true;
      if (!V.reservationDate(f.date.value, C.bookingHorizonDays)) { fieldError(f, 'date', `Choose a date between today and ${C.bookingHorizonDays} days ahead.`); ok = false; }
      if (!V.guests(g, C.maxGuests)) { fieldError(f, 'guests', `Between 1 and ${C.maxGuests} guests.`); ok = false; }
      if (!chosen) { const s = qs('#slots').closest('.field'); s.classList.add('has-error'); s.insertAdjacentHTML('beforeend', '<div class="error" data-testid="error-time">Please choose a time.</div>'); ok = false; }
      if (!ok) return;
      // Capacity control: re-check availability at the moment of booking
      if (slotInPast(f.date.value, chosen)) { toast('This time has already passed. Please choose a later time.', 'error'); chosen = null; return drawSlots(); }
      if (r.seats - S.bookedGuests(r.id, f.date.value, chosen) < g) { toast('Sorry, this time slot has just been fully booked.', 'error'); return drawSlots(); }
      const u = S.currentUser();
      const res = S.addReservation({
        id: S.id('CK'), userId: u.id, restaurantId: r.id, date: f.date.value, time: chosen, guests: g,
        note: f.note.value.trim(), status: 'confirmed', channel: 'web', createdAt: S.now(),
      });
      go('#/reservation/' + res.id);
    };
  }

  function viewConfirmation(res, payment) {
    const r = restaurant(res.restaurantId);
    app.innerHTML = `
      <div class="container narrow section">
        <div class="confirm" data-testid="confirmation">
          <div class="confirm-icon">✓</div>
          <h1>Your table is booked!</h1>
          <p>Reservation number <strong data-testid="reservation-id">${esc(res.id)}</strong></p>
          <div class="summary">
            <div><span>Restaurant</span><strong>${esc(r.name)}</strong></div>
            <div><span>Date</span><strong>${fmtDate(res.date)}</strong></div>
            <div><span>Time</span><strong>${esc(res.time)}</strong></div>
            <div><span>Guests</span><strong>${res.guests}</strong></div>
            ${payment ? `<div><span>Paid</span><strong>${money(payment.amount, payment.currency)} · ${esc(payment.methodLabel)}</strong></div>` : ''}
          </div>
          <p class="muted small">A confirmation e-mail has been sent. For privacy reasons (GDPR) it contains no personal details.</p>
          <div class="actions"><a class="btn btn-primary" href="#/account">My reservations</a><a class="btn btn-outline" href="#/">Back to home</a></div>
        </div>
      </div>`;
  }

  function viewDeals() {
    app.innerHTML = `
      <section class="hero hero-slim"><div class="container"><h1>Package deals</h1><p class="lead">Pay once, enjoy everything: dinner, drinks and selected hotel or taxi services from our partners.</p></div></section>
      <div class="container section"><div class="grid cards-3" data-testid="deals-list">${D.deals.map(cardDeal).join('')}</div></div>`;
  }

  function viewDeal(id) {
    const d = D.deals.find(x => x.id === id); if (!d) return viewNotFound();
    const r = restaurant(d.restaurantId); const cur = d.currency || D.currencyFor(r.city);
    const user = S.currentUser();
    app.innerHTML = `
      <div class="container section">
        <nav class="crumbs"><a href="#/">Home</a> › <a href="#/deals">Package deals</a> › ${esc(d.title)}</nav>
        <div class="detail">
          <div>
            ${thumb(r, 'thumb-hero')}
            <span class="pill">Package deal</span>
            <h1 data-testid="deal-title">${esc(d.title)}</h1>
            <p class="muted">at <a href="#/restaurant/${r.id}">${esc(r.name)}</a>, ${esc(r.city)}</p>
            <h2>What’s included</h2>
            <ul class="checklist">${d.includes.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
            <p class="muted small">Partner services (hotel, taxi) are provided by third parties and linked to your reservation.</p>
          </div>
          <aside class="booking-box">
            <div class="price big">${money(d.price, cur)} <small>for ${d.persons} persons</small></div>
            ${user ? checkoutForm(d) : `<p>Please sign in to book this package deal.</p><a class="btn btn-primary btn-block" href="#/login" data-testid="deal-login" onclick="sessionStorage.setItem('ck_return','#/deal/${d.id}')">Sign in to continue</a>`}
          </aside>
        </div>
      </div>`;
    if (user) bindCheckout(d, r, cur);
  }

  function checkoutForm(d) {
    const u = S.currentUser();
    const saved = (u.paymentMethods || []).map(pm => `<option value="saved:${pm.token}">${esc(pm.brand)} •••• ${esc(pm.last4)} (saved)</option>`).join('');
    return `
      <form id="checkout" novalidate data-testid="checkout-form">
        <label class="field"><span>Date</span><input type="date" name="date" min="${todayISO()}" max="${addDaysISO(C.bookingHorizonDays)}" value="${addDaysISO(7)}" data-testid="deal-date"></label>
        <label class="field"><span>Time</span><select name="time" data-testid="deal-time">${slotsFor(restaurant(d.restaurantId)).filter(t => t >= '17:30').map(t => `<option ${t === '19:00' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>Payment method</span><select name="method" data-testid="pay-method">
          ${saved}
          <option value="card">Credit card</option>
          <option value="ideal">iDEAL | Wero</option>
          <option value="paypal">PayPal</option>
          <option value="applepay">Apple Pay</option></select></label>
        <div id="card-fields">
          <label class="field"><span>Name on card</span><input name="cardName" autocomplete="cc-name" data-testid="card-name"></label>
          <label class="field"><span>Card number</span><input name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" data-testid="card-number"></label>
          <div class="row2">
            <label class="field"><span>Expiry (MM/YY)</span><input name="cardExpiry" autocomplete="cc-exp" placeholder="MM/YY" data-testid="card-expiry"></label>
            <label class="field"><span>CVC</span><input name="cardCvc" inputmode="numeric" autocomplete="cc-csc" data-testid="card-cvc"></label>
          </div>
          <label class="check"><input type="checkbox" name="saveCard"> Save this card for next time (stored as a token by our payment provider)</label>
        </div>
        <p class="muted small">🔒 Payments are processed by our payment service provider. Cooking.com never stores your full card number.</p>
        <button class="btn btn-primary btn-block" type="submit" data-testid="pay-submit">Pay ${money(d.price, d.currency || D.currencyFor(restaurant(d.restaurantId).city))}</button>
      </form>`;
  }

  function bindCheckout(d, r, cur) {
    const f = qs('#checkout');
    const toggle = () => { qs('#card-fields').hidden = f.method.value !== 'card'; };
    f.method.onchange = toggle; toggle();
    f.onsubmit = (e) => {
      e.preventDefault(); clearErrors(f);
      let ok = true;
      if (!V.reservationDate(f.date.value, C.bookingHorizonDays)) { fieldError(f, 'date', 'Choose a valid date.'); ok = false; }
      const guests = d.persons;
      if (slotInPast(f.date.value, f.time.value)) { fieldError(f, 'time', 'This time has already passed. Choose a later time.'); ok = false; }
      else if (r.seats - S.bookedGuests(r.id, f.date.value, f.time.value) < guests) { fieldError(f, 'time', 'This time is fully booked. Choose another time.'); ok = false; }
      const m = f.method.value;
      if (m === 'card') {
        if (!V.required(f.cardName.value)) { fieldError(f, 'cardName', 'Enter the name on the card.'); ok = false; }
        if (!V.cardNumber(f.cardNumber.value)) { fieldError(f, 'cardNumber', 'This card number is not valid.'); ok = false; }
        if (!V.cardExpiry(f.cardExpiry.value)) { fieldError(f, 'cardExpiry', 'Enter a valid expiry date that is not in the past.'); ok = false; }
        if (!V.cvc(f.cardCvc.value)) { fieldError(f, 'cardCvc', 'Enter the 3 or 4 digit security code.'); ok = false; }
      }
      if (!ok) return;

      const u = S.currentUser();
      let methodLabel, last4 = null, brand = null, token = 'tok_' + Math.random().toString(36).slice(2, 12);
      if (m === 'card') {
        const num = f.cardNumber.value.replace(/\D/g, '');
        last4 = num.slice(-4); brand = num.startsWith('4') ? 'Visa' : /^5[1-5]/.test(num) ? 'Mastercard' : num.startsWith('3') ? 'Amex' : 'Card';
        methodLabel = `${brand} •••• ${last4}`;
        if (f.saveCard.checked) S.updateUser(u.id, { paymentMethods: [...(u.paymentMethods || []), { token, brand, last4 }] });
      } else if (m.startsWith('saved:')) {
        const pm = (u.paymentMethods || []).find(x => 'saved:' + x.token === m); token = pm.token; methodLabel = `${pm.brand} •••• ${pm.last4}`;
      } else methodLabel = { ideal: 'iDEAL | Wero', paypal: 'PayPal', applepay: 'Apple Pay' }[m];

      const res = S.addReservation({
        id: S.id('CK'), userId: u.id, restaurantId: r.id, date: f.date.value, time: f.time.value, guests,
        dealId: d.id, status: 'confirmed', channel: 'web', createdAt: S.now(),
      });
      const pay = S.addPayment({ id: S.id('PAY'), reservationId: res.id, userId: u.id, amount: d.price, currency: cur, method: m.startsWith('saved:') ? 'card' : m, methodLabel, token, last4, status: 'authorised', at: S.now() });
      res.paymentId = pay.id; S.save();
      go('#/reservation/' + res.id);
    };
  }

  // ---- registration (consumer): e-mail → details → taste profile → payment (optional) → done
  function viewRegister(p) {
    const step = p.step || 'email';
    const draft = sessionGet('ck_reg') || {};
    const steps = ['email', 'details', 'taste', 'payment'];
    const stepper = `<ol class="stepper">${['E-mail', 'Your details', 'Taste profile', 'Payment'].map((s, i) => `<li class="${steps.indexOf(step) >= i ? 'on' : ''}">${s}</li>`).join('')}</ol>`;
    let body = '';

    if (step === 'email') {
      body = `
        <h1>Create your account</h1>
        <p class="muted">You need an account to make reservations and write reviews. Registration is only possible on our website.</p>
        <form id="f" novalidate>
          <label class="field"><span>E-mail address</span><input type="email" name="email" autocomplete="email" value="${esc(draft.email || '')}" data-testid="reg-email"></label>
          <button class="btn btn-primary btn-block" data-testid="reg-email-submit">Continue with e-mail</button>
        </form>
        <p class="muted small">Already have an account? <a href="#/login">Sign in</a></p>`;
    } else if (step === 'verify') {
      body = `
        <h1>Check your inbox</h1>
        <p>We have sent a verification link to <strong>${esc(draft.email)}</strong>. Click the link to continue.</p>
        <div class="mailbox" data-testid="demo-mailbox">
          <div class="mail-head">📨 Demo mailbox — Cooking.com &lt;no-reply@cooking.com&gt;</div>
          <p>Please confirm your e-mail address to finish creating your account.</p>
          <button class="btn btn-primary" id="verify-link" data-testid="reg-verify-link">Verify my e-mail address</button>
        </div>`;
    } else if (step === 'details') {
      const countries = [['NL', 'Netherlands'], ['BE', 'Belgium'], ['DE', 'Germany'], ['ES', 'Spain'], ['FR', 'France'], ['GB', 'United Kingdom'], ['US', 'United States'], ['AU', 'Australia']];
      body = `
        <h1>Your details</h1>
        <form id="f" novalidate>
          <div class="row2">
            <label class="field"><span>First name</span><input name="firstName" autocomplete="given-name" data-testid="reg-first"></label>
            <label class="field"><span>Last name</span><input name="lastName" autocomplete="family-name" data-testid="reg-last"></label>
          </div>
          <label class="field"><span>Street and number</span><input name="street" autocomplete="street-address" data-testid="reg-street"></label>
          <div class="row2">
            <label class="field"><span>Postcode</span><input name="postcode" autocomplete="postal-code" data-testid="reg-postcode"></label>
            <label class="field"><span>Town / city</span><input name="city" autocomplete="address-level2" data-testid="reg-city"></label>
          </div>
          <label class="field"><span>Country</span><select name="country" data-testid="reg-country">${countries.map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select></label>
          <label class="field"><span>Mobile phone (for SMS/WhatsApp updates)</span><input name="phone" autocomplete="tel" placeholder="+31 6 12345678" data-testid="reg-phone"></label>
          <label class="field"><span>Username</span><input name="username" autocomplete="username" data-testid="reg-username"></label>
          <label class="field"><span>Password <small class="muted">(at least 10 characters, with a letter and a digit)</small></span><input type="password" name="password" autocomplete="new-password" data-testid="reg-password"></label>
          <label class="check field"><input type="checkbox" name="terms" data-testid="reg-terms"> I accept the <a href="#/about">terms of use</a></label>
          <label class="check field"><input type="checkbox" name="privacy" data-testid="reg-privacy"> I accept the <a href="#/about">privacy statement</a></label>
          <button class="btn btn-primary btn-block" data-testid="reg-details-submit">Continue</button>
        </form>`;
    } else if (step === 'taste') {
      body = `
        <h1>Your taste profile</h1>
        <p class="muted">Help us suggest restaurants you will love. You can change this later.</p>
        <form id="f">
          ${D.tasteQuestions.map(q => `<fieldset class="field"><legend>${esc(q.q)}</legend><div class="chips">
            ${q.options.map((o, i) => `<label class="chip"><input type="radio" name="${q.id}" value="${esc(o)}" ${i === 0 ? 'checked' : ''} data-testid="taste-${q.id}-${i}"><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`).join('')}
          <button class="btn btn-primary btn-block" data-testid="reg-taste-submit">Continue</button>
        </form>`;
    } else if (step === 'payment') {
      body = `
        <h1>Payment details <small class="muted">(optional)</small></h1>
        <p class="muted">Not needed for regular reservations — only for package deals. You can also add a card later at checkout.</p>
        <form id="f" novalidate>
          <label class="field"><span>Name on card</span><input name="cardName" data-testid="reg-card-name"></label>
          <label class="field"><span>Card number</span><input name="cardNumber" inputmode="numeric" data-testid="reg-card-number"></label>
          <div class="row2">
            <label class="field"><span>Expiry (MM/YY)</span><input name="cardExpiry" placeholder="MM/YY" data-testid="reg-card-expiry"></label>
            <label class="field"><span>CVC</span><input name="cardCvc" inputmode="numeric" data-testid="reg-card-cvc"></label>
          </div>
          <button class="btn btn-primary btn-block" data-testid="reg-finish-card">Save card and finish</button>
          <button type="button" class="btn btn-ghost btn-block" id="skip" data-testid="reg-skip-payment">Skip for now and finish</button>
        </form>`;
    }

    app.innerHTML = `<div class="container narrow section"><div class="panel">${stepper}${body}</div></div>`;
    const f = qs('#f');

    if (step === 'email') f.onsubmit = (e) => {
      e.preventDefault(); clearErrors(f);
      const email = f.email.value.trim();
      if (!V.email(email)) return fieldError(f, 'email', 'Enter a valid e-mail address.');
      if (S.findUserByEmail(email)) return fieldError(f, 'email', 'An account with this e-mail address already exists. Please sign in.');
      const token = S.startVerification(email, 'consumer');
      sessionSet('ck_reg', { email, token });
      go('#/register?step=verify');
    };
    if (step === 'verify') qs('#verify-link').onclick = () => {
      if (!draft.email || !S.verify(draft.email, draft.token)) { toast('This verification link is no longer valid. Please start again.', 'error'); return go('#/register'); }
      sessionSet('ck_reg', { ...draft, verified: true });
      go('#/register?step=details');
    };
    if (step === 'details') {
      if (!draft.verified) return go('#/register');
      f.onsubmit = async (e) => {
        e.preventDefault(); clearErrors(f);
        const v = Object.fromEntries(new FormData(f)); let ok = true;
        for (const k of ['firstName', 'lastName', 'street', 'city']) if (!V.required(v[k])) { fieldError(f, k, 'This field is required.'); ok = false; }
        if (!V.postcode(v.postcode, v.country)) { fieldError(f, 'postcode', 'This postcode is not valid for the selected country.'); ok = false; }
        if (!V.phone(v.phone)) { fieldError(f, 'phone', 'Enter a valid mobile number, e.g. +31612345678.'); ok = false; }
        if (!V.username(v.username)) { fieldError(f, 'username', '3–20 characters: letters, digits, dot, dash or underscore.'); ok = false; }
        else if (S.findUserByUsername(v.username)) { fieldError(f, 'username', 'This username is already taken.'); ok = false; }
        if (!V.password(v.password)) { fieldError(f, 'password', 'At least 10 characters, including a letter and a digit.'); ok = false; }
        if (!f.terms.checked) { fieldError(f, 'terms', 'You must accept the terms of use.'); ok = false; }
        if (!f.privacy.checked) { fieldError(f, 'privacy', 'You must accept the privacy statement.'); ok = false; }
        if (!ok) return;
        const pwHash = await S.hash(v.password);
        delete v.password; delete v.terms; delete v.privacy;
        sessionSet('ck_reg', { ...draft, ...v, pwHash, acceptedTermsAt: S.now() });
        go('#/register?step=taste');
      };
    }
    if (step === 'taste') {
      if (!draft.pwHash) return go('#/register');
      f.onsubmit = (e) => { e.preventDefault(); sessionSet('ck_reg', { ...draft, taste: Object.fromEntries(new FormData(f)) }); go('#/register?step=payment'); };
    }
    if (step === 'payment') {
      if (!draft.taste) return go('#/register');
      const finish = (paymentMethods = []) => {
        const u = S.addUser({
          id: S.id('U'), email: draft.email, emailVerified: true, firstName: draft.firstName, lastName: draft.lastName,
          street: draft.street, postcode: draft.postcode, city: draft.city, country: draft.country, phone: draft.phone,
          username: draft.username, pwHash: draft.pwHash, acceptedTermsAt: draft.acceptedTermsAt, taste: draft.taste,
          paymentMethods, createdAt: S.now(),
        });
        sessionStorageRemove('ck_reg'); S.login(u.id); renderChrome();
        app.innerHTML = `<div class="container narrow section"><div class="confirm" data-testid="reg-done"><div class="confirm-icon">✓</div>
          <h1>Welcome to Cooking.com, ${esc(u.firstName)}!</h1>
          <p>Your account has been created. We have sent you a confirmation e-mail (without personal details, in line with the GDPR).</p>
          <div class="actions"><a class="btn btn-primary" href="#/">Find a restaurant</a><a class="btn btn-outline" href="#/account">My account</a></div></div></div>`;
      };
      qs('#skip').onclick = () => finish();
      f.onsubmit = (e) => {
        e.preventDefault(); clearErrors(f); let ok = true;
        if (!V.required(f.cardName.value)) { fieldError(f, 'cardName', 'Enter the name on the card.'); ok = false; }
        if (!V.cardNumber(f.cardNumber.value)) { fieldError(f, 'cardNumber', 'This card number is not valid.'); ok = false; }
        if (!V.cardExpiry(f.cardExpiry.value)) { fieldError(f, 'cardExpiry', 'Enter a valid expiry date that is not in the past.'); ok = false; }
        if (!V.cvc(f.cardCvc.value)) { fieldError(f, 'cardCvc', 'Enter the 3 or 4 digit security code.'); ok = false; }
        if (!ok) return;
        const num = f.cardNumber.value.replace(/\D/g, '');
        finish([{ token: 'tok_' + Math.random().toString(36).slice(2, 12), brand: num.startsWith('4') ? 'Visa' : 'Card', last4: num.slice(-4) }]);
      };
    }
  }

  function viewLogin() {
    app.innerHTML = `
      <div class="container narrow section"><div class="panel">
        <h1>Sign in</h1>
        <form id="f" novalidate>
          <label class="field"><span>E-mail or username</span><input name="id" autocomplete="username" data-testid="login-id"></label>
          <label class="field"><span>Password</span><input type="password" name="password" autocomplete="current-password" data-testid="login-password"></label>
          <button class="btn btn-primary btn-block" data-testid="login-submit">Sign in</button>
        </form>
        <p class="muted small">New to Cooking.com? <a href="#/register" data-testid="login-to-register">Create an account</a></p>
      </div></div>`;
    const f = qs('#f');
    f.onsubmit = async (e) => {
      e.preventDefault(); clearErrors(f);
      const u = S.findUserByEmail(f.id.value.trim()) || S.findUserByUsername(f.id.value.trim());
      if (!u || u.pwHash !== await S.hash(f.password.value)) { S.log('login_failed'); return fieldError(f, 'password', 'The combination of e-mail/username and password is incorrect.'); }
      S.login(u.id); renderChrome(); toast(`Welcome back, ${u.firstName}!`);
      const back = sessionStorageGet('ck_return'); sessionStorageRemove('ck_return');
      go(back || '#/');
    };
  }

  function viewAccount() {
    const u = S.currentUser();
    if (!u) { sessionStorageSet('ck_return', '#/account'); return go('#/login'); }
    const res = S.reservationsFor(u.id);
    const rows = res.map(r => {
      const rest = restaurant(r.restaurantId); const past = r.date < todayISO();
      return `<tr data-testid="my-reservation" data-id="${r.id}">
        <td><strong>${esc(rest.name)}</strong><br><small class="muted">${esc(r.id)}${r.dealId ? ' · package deal' : ''}</small></td>
        <td>${fmtDate(r.date)}<br><small class="muted">${esc(r.time)} · ${r.guests} guests</small></td>
        <td><span class="status status-${r.status}" data-testid="status">${esc(r.status)}</span></td>
        <td>${r.status === 'confirmed' && !past ? `<button class="btn btn-ghost btn-sm" data-cancel="${r.id}" data-testid="cancel">Cancel</button>` : ''}</td>
      </tr>`;
    }).join('');
    app.innerHTML = `
      <div class="container section">
        <h1>Hi ${esc(u.firstName)}</h1>
        <div class="account-grid">
          <section class="panel">
            <h2>My reservations</h2>
            ${res.length ? `<table class="table"><thead><tr><th>Restaurant</th><th>When</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="muted" data-testid="no-reservations">You have no reservations yet. <a href="#/">Find a restaurant</a></p>'}
          </section>
          <aside>
            <section class="panel">
              <h2>My details</h2>
              <p>${esc(u.firstName)} ${esc(u.lastName)}<br>${esc(u.street)}<br>${esc(u.postcode)} ${esc(u.city)}, ${esc(u.country)}<br>${esc(u.email)}<br>${esc(u.phone)}</p>
            </section>
            <section class="panel">
              <h2>Taste profile</h2>
              <p>${Object.entries(u.taste || {}).map(([k, v]) => `<span class="tag">${esc(v)}</span>`).join(' ') || '<span class="muted">Not set</span>'}</p>
            </section>
            <section class="panel">
              <h2>Saved payment methods</h2>
              <p data-testid="saved-cards">${(u.paymentMethods || []).map(pm => `${esc(pm.brand)} •••• ${esc(pm.last4)}`).join('<br>') || '<span class="muted">None</span>'}</p>
            </section>
          </aside>
        </div>
      </div>`;
    qsa('[data-cancel]').forEach(b => b.onclick = () => { S.cancelReservation(b.dataset.cancel); toast('Your reservation has been cancelled.'); viewAccount(); });
  }

  // ---- restaurant sign-up (partner): e-mail → details & classification → automated validation → contract → active
  function viewPartner(p) {
    const step = p.step || 'email';
    const draft = sessionGet('ck_partner') || {};
    const steps = ['email', 'details', 'contract', 'done'];
    const stepper = `<ol class="stepper">${['E-mail', 'Restaurant details', 'Contract', 'Live'].map((s, i) => `<li class="${steps.indexOf(step === 'verify' ? 'email' : step === 'review' ? 'details' : step) >= i ? 'on' : ''}">${s}</li>`).join('')}</ol>`;
    let body = '';
    if (step === 'email') body = `
      <h1>List your restaurant on Cooking.com</h1>
      <p class="muted">Reach guests in 47 markets. After sign-up we validate your details before your restaurant goes live.</p>
      <form id="f" novalidate>
        <label class="field"><span>Business e-mail address</span><input type="email" name="email" data-testid="partner-email"></label>
        <button class="btn btn-primary btn-block" data-testid="partner-email-submit">Start sign-up</button>
      </form>`;
    else if (step === 'verify') body = `
      <h1>Check your inbox</h1>
      <p>We have sent a verification link to <strong>${esc(draft.email)}</strong>.</p>
      <div class="mailbox"><div class="mail-head">📨 Demo mailbox — Cooking.com Partners</div>
      <button class="btn btn-primary" id="verify-link" data-testid="partner-verify-link">Verify my e-mail address</button></div>`;
    else if (step === 'details') body = `
      <h1>Restaurant details</h1>
      <form id="f" novalidate>
        <h3>Restaurant</h3>
        <label class="field"><span>Restaurant name</span><input name="name" data-testid="p-name"></label>
        <div class="row2">
          <label class="field"><span>Address</span><input name="address" data-testid="p-address"></label>
          <label class="field"><span>City</span><select name="city" data-testid="p-city">${D.cities.map(c => `<option>${esc(c.name)}</option>`).join('')}</select></label>
        </div>
        <div class="row2">
          <label class="field"><span>Phone</span><input name="phone" data-testid="p-phone"></label>
          <label class="field"><span>Website (optional)</span><input name="website"></label>
        </div>
        <label class="field"><span>Opening hours</span><input name="hours" placeholder="e.g. Tue–Sat 17:30–23:00" data-testid="p-hours"></label>
        <h3>Owner and company</h3>
        <div class="row2">
          <label class="field"><span>Owner’s full name</span><input name="owner" data-testid="p-owner"></label>
          <label class="field"><span>Contact person</span><input name="contact" data-testid="p-contact"></label>
        </div>
        <div class="row2">
          <label class="field"><span>Chamber of Commerce (KvK) number</span><input name="kvk" inputmode="numeric" data-testid="p-kvk"></label>
          <label class="field"><span>VAT number</span><input name="vat" placeholder="NL123456789B01" data-testid="p-vat"></label>
        </div>
        <label class="field"><span>IBAN (for payouts)</span><input name="iban" placeholder="NL91 ABNA 0417 1643 00" data-testid="p-iban"></label>
        <h3>Classification</h3>
        <div class="row2">
          <label class="field"><span>Cuisine</span><select name="cuisine" data-testid="p-cuisine">${Object.entries(D.cuisines).map(([k, c]) => `<option value="${k}">${c.label}</option>`).join('')}</select></label>
          <label class="field"><span>Price range</span><select name="price" data-testid="p-price">${[1, 2, 3, 4].map(n => `<option value="${n}">${'€'.repeat(n)}</option>`).join('')}</select></label>
        </div>
        <div class="row2">
          <label class="field"><span>Number of seats</span><input type="number" name="seats" min="4" max="500" data-testid="p-seats"></label>
          <label class="field"><span>Number of tables</span><input type="number" name="tables" min="1" max="200" data-testid="p-tables"></label>
        </div>
        <label class="field"><span>Signature dish</span><input name="signature" data-testid="p-signature"></label>
        <label class="field"><span>About your restaurant</span><textarea name="about" rows="3"></textarea></label>
        <button class="btn btn-primary btn-block" data-testid="p-submit">Submit for validation</button>
      </form>`;
    else if (step === 'review') {
      const a = S.db.applications.find(x => x.id === draft.applicationId);
      body = a.status === 'manual_review'
        ? `<div class="confirm" data-testid="p-manual"><div class="confirm-icon warn">!</div><h1>Your application is being reviewed</h1>
           <p>Our automated checks could not confirm all details. A Cooking.com employee will review your application and contact you within two working days.</p>
           <ul class="checklist">${a.checks.map(c => `<li class="${c.ok ? '' : 'fail'}">${esc(c.label)}</li>`).join('')}</ul></div>`
        : `<h1>Your details have been validated</h1>
           <ul class="checklist">${a.checks.map(c => `<li>${esc(c.label)}</li>`).join('')}</ul>
           <a class="btn btn-primary btn-block" href="#/partner?step=contract" data-testid="p-to-contract">Choose your subscription</a>`;
    } else if (step === 'contract') body = `
      <h1>Choose your subscription</h1>
      <form id="f" novalidate>
        <div class="plans">
          ${[['basic', 'Basic', '€49 / month', '+ €1.50 per seated guest'], ['plus', 'Plus', '€99 / month', '+ €1.00 per seated guest · featured in search'], ['premium', 'Premium', '€199 / month', 'No per-guest fee · package deals · priority support']]
            .map(([v, n, pr, d], i) => `<label class="plan"><input type="radio" name="plan" value="${v}" ${i === 1 ? 'checked' : ''} data-testid="plan-${v}"><div><strong>${n}</strong><span class="price">${pr}</span><small>${d}</small></div></label>`).join('')}
        </div>
        <label class="field"><span>Electronic signature — type your full name</span><input name="signature" data-testid="p-esign"></label>
        <label class="check field"><input type="checkbox" name="agree" data-testid="p-agree"> I have read and accept the partner terms and conditions</label>
        <button class="btn btn-primary btn-block" data-testid="p-sign">Sign contract</button>
      </form>`;
    else if (step === 'done') body = `
      <div class="confirm" data-testid="p-done"><div class="confirm-icon">✓</div><h1>Welcome aboard!</h1>
      <p>Your restaurant is now live in search and reservations. Your first invoice will be sent shortly.</p>
      <p class="muted">Our Restaurant Deals team will contact you separately about joining our package deals.</p></div>`;

    app.innerHTML = `<div class="container narrow section"><div class="panel">${stepper}${body}</div></div>`;
    const f = qs('#f');
    if (step === 'email') f.onsubmit = (e) => {
      e.preventDefault(); clearErrors(f);
      if (!V.email(f.email.value)) return fieldError(f, 'email', 'Enter a valid e-mail address.');
      sessionSet('ck_partner', { email: f.email.value.trim(), token: S.startVerification(f.email.value.trim(), 'restaurant') });
      go('#/partner?step=verify');
    };
    if (step === 'verify') qs('#verify-link').onclick = () => {
      if (!S.verify(draft.email, draft.token)) { toast('This link is no longer valid.', 'error'); return go('#/partner'); }
      sessionSet('ck_partner', { ...draft, verified: true }); go('#/partner?step=details');
    };
    if (step === 'details') {
      if (!draft.verified) return go('#/partner');
      f.onsubmit = (e) => {
        e.preventDefault(); clearErrors(f);
        const v = Object.fromEntries(new FormData(f)); let ok = true;
        for (const k of ['name', 'address', 'phone', 'hours', 'owner', 'contact', 'signature']) if (!V.required(v[k])) { fieldError(f, k, 'This field is required.'); ok = false; }
        const seats = Number(v.seats), tables = Number(v.tables);
        if (!(seats >= 4 && seats <= 500)) { fieldError(f, 'seats', 'Between 4 and 500 seats.'); ok = false; }
        if (!(tables >= 1 && tables <= 200)) { fieldError(f, 'tables', 'Between 1 and 200 tables.'); ok = false; }
        else if (tables > seats) { fieldError(f, 'tables', 'You cannot have more tables than seats.'); ok = false; }
        if (!V.required(v.kvk)) { fieldError(f, 'kvk', 'This field is required.'); ok = false; }
        if (!V.required(v.vat)) { fieldError(f, 'vat', 'This field is required.'); ok = false; }
        if (!V.required(v.iban)) { fieldError(f, 'iban', 'This field is required.'); ok = false; }
        if (!ok) return;
        // Automated validation (simulated): format checks stand in for KvK, credit and Street View checks
        const nl = (D.cities.find(c => c.name === v.city) || {}).country === 'NL';
        const checks = [
          { label: 'E-mail address verified', ok: true },
          { label: nl ? 'Chamber of Commerce registration found' : 'Company registration found', ok: nl ? V.kvk(v.kvk) : v.kvk.trim().length >= 5 },
          { label: 'VAT number valid', ok: nl ? V.vatNL(v.vat) : v.vat.trim().length >= 8 },
          { label: 'Bank account (IBAN) valid', ok: V.iban(v.iban) },
          { label: 'Credit check passed', ok: true },
          { label: 'Address confirmed (Street View)', ok: true },
        ];
        const allOk = checks.every(c => c.ok);
        const a = S.addApplication({ id: S.id('APP'), email: draft.email, ...v, seats, tables, checks, status: allOk ? 'validated' : 'manual_review', createdAt: S.now() });
        sessionSet('ck_partner', { ...draft, applicationId: a.id });
        go('#/partner?step=review');
      };
    }
    if (step === 'contract') {
      const a = draft.applicationId && S.db.applications.find(x => x.id === draft.applicationId);
      if (!a || a.status !== 'validated') return go('#/partner');
      f.onsubmit = (e) => {
        e.preventDefault(); clearErrors(f); let ok = true;
        if (f.signature.value.trim().toLowerCase() !== String(a.owner).trim().toLowerCase()) { fieldError(f, 'signature', 'The signature must match the owner’s full name.'); ok = false; }
        if (!f.agree.checked) { fieldError(f, 'agree', 'You must accept the partner terms.'); ok = false; }
        if (!ok) return;
        S.updateApplication(a.id, { status: 'active', plan: f.plan.value, signedBy: f.signature.value.trim(), signedAt: S.now() });
        sessionStorageRemove('ck_partner'); go('#/partner?step=done');
      };
    }
  }

  function viewAbout() {
    app.innerHTML = `
      <div class="container narrow section"><div class="panel prose">
        <h1>About this demo</h1>
        <p><strong>Cooking.com is a fictitious company.</strong> This web application is a teaching demo for the course Business Process &amp; Systems Design at the University of Amsterdam. All restaurants, deals, reviews and prices are invented.</p>
        <p>No real reservations are made and no real payments are processed. Everything you enter is stored only in your own browser and can be wiped with the “Reset demo data” link at the bottom of every page. Please do not enter real personal or payment details — use test card number <code>4111 1111 1111 1111</code>.</p>
        <h2>Terms of use &amp; privacy statement</h2>
        <p>For the purposes of this demo, the terms of use and privacy statement consist of the paragraph above.</p>
        <p class="muted small">Version ${esc(C.APP_VERSION)} (${esc(C.RELEASE_DATE)}) · environment: ${esc(C.environment)}</p>
      </div></div>`;
  }

  function viewNotFound() {
    app.innerHTML = `<div class="container narrow section"><div class="panel"><h1>Page not found</h1><p>Sorry, we could not find that page.</p><a class="btn btn-primary" href="#/">Back to home</a></div></div>`;
  }

  // ------------------------------------------------------------------ session-scoped draft storage (wizard state)
  const memSession = {};
  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return memSession[k] ?? null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { memSession[k] = v; } }
  function sessionStorageRemove(k) { try { sessionStorage.removeItem(k); } catch (e) { delete memSession[k]; } }
  function sessionGet(k) { try { return JSON.parse(sessionStorageGet(k)); } catch (e) { return null; } }
  function sessionSet(k, v) { sessionStorageSet(k, JSON.stringify(v)); }

  // ------------------------------------------------------------------ router
  function route() {
    const { parts, params } = parseHash();
    const [page, id] = parts;
    window.scrollTo(0, 0);
    switch (page) {
      case undefined: viewHome(); break;
      case 'search': viewSearch(params); break;
      case 'restaurant': viewRestaurant(id, params); break;
      case 'deals': viewDeals(); break;
      case 'deal': viewDeal(id); break;
      case 'register': viewRegister(params); break;
      case 'login': viewLogin(); break;
      case 'reservation': {
        const u = S.currentUser(); const res = u && S.db.reservations.find(x => x.id === id && x.userId === u.id);
        if (!res) { viewNotFound(); break; }
        viewConfirmation(res, res.paymentId && S.db.payments.find(x => x.id === res.paymentId));
        break;
      }
      case 'account': viewAccount(); break;
      case 'partner': viewPartner(params); break;
      case 'about': viewAbout(); break;
      default: viewNotFound();
    }
    qsa('.mainnav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#/' + (page || '')));
    renderChrome();
  }

  qs('#reset-demo').onclick = (e) => {
    e.preventDefault();
    S.reset(); ['ck_reg', 'ck_partner', 'ck_return'].forEach(sessionStorageRemove);
    toast('Demo data has been reset.'); go('#/'); route();
  };
  window.addEventListener('hashchange', route);
  route();
})();
