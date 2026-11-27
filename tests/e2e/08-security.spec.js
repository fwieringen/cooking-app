// Scenario 8 – Security controls (findings from the security review of v1.3.0)
const { test, expect } = require('@playwright/test');
const crypto = require('crypto');
const { fresh, register, book, isoInDays } = require('./helpers');

const KEY = 'cookingcom_demo_v1';
const readDb = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
// Change the stored data directly (as a test fixture), then reload so the app reads it again
async function patchDb(page, fn, arg) {
  await page.evaluate(([k, src, a]) => {
    const db = JSON.parse(localStorage.getItem(k));
    new Function('db', 'arg', src)(db, a);
    localStorage.setItem(k, JSON.stringify(db));
  }, [KEY, fn, arg]);
  await page.reload();
}

async function signIn(page, id, password) {
  await page.goto('/#/login');
  await page.getByTestId('login-id').fill(id);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

test.describe('Security: crafted links (XSS, finding #1)', () => {
  test.beforeEach(async ({ page }) => fresh(page));

  test('HTML in the search URL is not executed or inserted into the page', async ({ page }) => {
    const payload = encodeURIComponent('"><img src=x data-xss=1>');
    await page.goto(`/#/search?city=Amsterdam&time=${payload}&date=${payload}&guests=${payload}`);
    await expect(page.getByTestId('results-title')).toContainText('Amsterdam: 3 restaurants found');
    await expect(page.locator('[data-xss]')).toHaveCount(0);
    // Invalid values fall back to the defaults
    await expect(page.getByTestId('availability').first()).toContainText('19:00');
    const href = await page.getByTestId('result').first().getAttribute('href');
    expect(href).toMatch(/\?date=\d{4}-\d{2}-\d{2}&time=19%3A00&guests=2$/);
  });

  test('an invalid date or time in a restaurant link is ignored', async ({ page }) => {
    await page.goto('/#/restaurant/r102?date=2026-02-31&time=25:00&guests=99');
    await expect(page.getByTestId('restaurant-name')).toHaveText('Trattoria Nonna Lia');
    await expect(page.getByTestId('book-date')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByTestId('book-guests')).toHaveValue('2');
    await expect(page.locator('#slots .slot.sel')).toHaveCount(0);
  });
});

test.describe('Security: HTTP headers and policy (finding #10)', () => {
  test('the site sends the security headers', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['content-security-policy']).toContain("script-src 'self'");
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['permissions-policy']).toContain('camera=()');
    expect(h['strict-transport-security']).toContain('max-age=');
  });

  test('hidden files are not served', async ({ request }) => {
    for (const p of ['/.htaccess', '/.env', '/.git/config']) {
      expect([403, 404], p).toContain((await request.get(p)).status());
    }
  });

  test('the app works without breaking the Content-Security-Policy', async ({ page }) => {
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    await fresh(page);
    await page.goto('/#/deal/d3');
    await page.getByTestId('deal-login').click();            // was an inline onclick handler
    await expect(page).toHaveURL(/#\/login/);
    await register(page);
    await page.goto('/#/deal/d3');
    await page.goto('/#/account');
    await page.getByTestId('referral-link').focus();         // was an inline onfocus handler
    await page.goto('/#/search?city=Amsterdam');
    expect(await page.evaluate(() => window.__csp)).toEqual([]);
  });

  test('after signing in from a package deal, the visitor returns to that deal', async ({ page }) => {
    await fresh(page);
    const u = await register(page);
    await page.getByTestId('nav-logout').click();
    await page.goto('/#/deal/d3');
    await page.getByTestId('deal-login').click();
    await page.getByTestId('login-id').fill(u.email);
    await page.getByTestId('login-password').fill(u.password);
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('checkout-form')).toBeVisible();
  });
});

test.describe('Security: passwords and sign-in (findings #4 and #6)', () => {
  test.beforeEach(async ({ page }) => fresh(page));

  test('passwords are stored with a unique salt, never in plain text', async ({ page }) => {
    const a = await register(page);
    await page.getByTestId('nav-logout').click();
    await register(page);                                    // same password as user a
    const db = await readDb(page);
    const [h1, h2] = db.users.map(u => u.pwHash);
    expect(h1).toMatch(/^pbkdf2-sha256\$600000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(h2).toMatch(/^pbkdf2-sha256\$600000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(h1).not.toBe(h2);
    expect(JSON.stringify(db)).not.toContain(a.password);
  });

  test('an account with an old unsalted hash can still sign in and is upgraded', async ({ page }) => {
    const u = await register(page);
    const legacy = crypto.createHash('sha256').update(u.password).digest('hex');
    await patchDb(page, 'db.users[0].pwHash = arg; db.session = null;', legacy);
    await signIn(page, u.username, u.password);
    await expect(page.getByTestId('nav-account')).toBeVisible();
    const db = await readDb(page);
    expect(db.users[0].pwHash).toMatch(/^pbkdf2-sha256\$/);
  });

  test('sign-in is locked after 5 failed attempts, also when switching to the username', async ({ page }) => {
    const u = await register(page);
    await page.getByTestId('nav-logout').click();
    for (let i = 0; i < 5; i++) {
      await signIn(page, i % 2 ? u.username : u.email, 'wrong-password-' + i);
      await expect(page.getByTestId('error-password')).toBeVisible();
    }
    await signIn(page, u.username, u.password);              // correct password, but locked
    await expect(page.getByTestId('error-password')).toContainText('Too many failed attempts');
    await expect(page.getByTestId('nav-login')).toBeVisible();

    // After the lock period the account can be used again
    await patchDb(page, 'for (const a of Object.values(db.loginAttempts)) a.lockedUntil = new Date(Date.now() - 1000).toISOString();');
    await signIn(page, u.email, u.password);
    await expect(page.getByTestId('nav-account')).toBeVisible();
  });

  test('an unknown account gives the same error and is locked the same way', async ({ page }) => {
    for (let i = 0; i < 6; i++) await signIn(page, 'nobody@example.org', 'wrong-password-' + i);
    await expect(page.getByTestId('error-password')).toContainText('Too many failed attempts');
  });

  test('a session ends after 30 minutes without activity', async ({ page }) => {
    await register(page);
    await patchDb(page, 'db.session.lastSeen = new Date(Date.now() - 31 * 60000).toISOString();');
    await expect(page.getByTestId('nav-login')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('session has expired');
  });

  test('a session ends after 12 hours even when active', async ({ page }) => {
    await register(page);
    await patchDb(page, 'db.session.since = new Date(Date.now() - 13 * 3600000).toISOString(); db.session.lastSeen = new Date().toISOString();');
    await expect(page.getByTestId('nav-login')).toBeVisible();
  });

  test('an active session stays signed in', async ({ page }) => {
    await register(page);
    await patchDb(page, 'db.session.lastSeen = new Date(Date.now() - 10 * 60000).toISOString();');
    await expect(page.getByTestId('nav-account')).toBeVisible();
  });
});

test.describe('Security: unguessable tokens and ownership (findings #5 and #13)', () => {
  test.beforeEach(async ({ page }) => fresh(page));

  test('verification and payment tokens are long random values', async ({ page }) => {
    await page.goto('/#/register');
    await page.getByTestId('reg-email').fill('token.check@example.org');
    await page.getByTestId('reg-email-submit').click();
    const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ck_reg')));
    expect(draft.token).toMatch(/^vrf_[a-z0-9]{32}$/);

    await fresh(page);
    await register(page, undefined, { card: '4111 1111 1111 1111' });
    const db = await readDb(page);
    expect(db.users[0].paymentMethods[0].token).toMatch(/^tok_[a-z0-9]{32}$/);
  });

  test('a reservation can only be cancelled by its owner and not after its date', async ({ page }) => {
    await register(page);
    await book(page, 'r102');
    const id = await page.getByTestId('reservation-id').innerText();
    const today = isoInDays(0);

    const byOther = await page.evaluate(([i, t]) => window.CK_STORE.cancelReservation(i, 'U-OTHER1', t), [id, today]);
    expect(byOther).toBeNull();
    const inPast = await page.evaluate(([i]) => window.CK_STORE.cancelReservation(i, window.CK_STORE.currentUser().id, '2999-01-01'), [id]);
    expect(inPast).toBeNull();
    let db = await readDb(page);
    expect(db.reservations[0].status).toBe('confirmed');

    await page.goto('/#/account');
    await page.getByTestId('cancel').click();
    await expect(page.getByTestId('status')).toHaveText('cancelled');
    db = await readDb(page);
    expect(db.audit.map(a => a.event)).toContain('reservation_cancel_refused');
  });
});
