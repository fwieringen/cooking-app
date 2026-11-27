// Scenario 1 – Smoke test: the site loads and shows the essentials
const { test, expect } = require('@playwright/test');
const { fresh } = require('./helpers');

test.describe('Smoke test', () => {
  test('home page loads without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await fresh(page);
    await expect(page).toHaveTitle(/Cooking\.com/);
    await expect(page.getByRole('img', { name: 'Cooking.com' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Find your table');
    await expect(page.getByTestId('search-form')).toBeVisible();
    await expect(page.getByTestId('app-version')).toContainText(/v\d+\.\d+\.\d+/);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('main pages are reachable', async ({ page }) => {
    for (const [hash, text] of [['#/deals', 'Package deals'], ['#/partner', 'List your restaurant'], ['#/about', 'About this demo'], ['#/login', 'Sign in']]) {
      await page.goto('/' + hash);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(text);
    }
  });

  test('unknown page shows a friendly not-found message', async ({ page }) => {
    await page.goto('/#/does-not-exist');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  });

  test('a non-production environment is clearly marked', async ({ page, baseURL }) => {
    test.skip(baseURL.includes('cooking-prod.'), 'Production has no banner');
    await page.goto('/');
    await expect(page.getByTestId('env-banner')).toBeVisible();
    await expect(page.getByTestId('env-banner')).toContainText(/TEST ENVIRONMENT|DEVELOPMENT/);
  });
});

test.describe('Header sign-in button', () => {
  test('the sign-in button in the header is red', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByTestId('nav-login');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveCSS('background-color', 'rgb(198, 40, 40)');
    await expect(btn).toHaveCSS('color', 'rgb(255, 255, 255)');
  });
});

test.describe('Fresh files after a release', () => {
  test('page, scripts and styles are always checked for a newer version', async ({ request }) => {
    for (const p of ['/', '/assets/js/config.js', '/assets/js/app.js', '/assets/css/styles.css']) {
      const res = await request.get(p);
      expect(res.status(), p).toBe(200);
      expect(res.headers()['cache-control'], p).toContain('no-cache');
    }
  });

  test('every asset link carries the current version number', async ({ request, page }) => {
    const config = await (await request.get('/assets/js/config.js')).text();
    const version = config.match(/APP_VERSION = '([^']+)'/)[1];
    const html = await (await request.get('/')).text();
    const links = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map(m => m[1]);
    expect(links.length).toBeGreaterThan(5);
    for (const l of links) expect(l, l).toMatch(new RegExp(`\\?v=${version.replace(/\./g, '\\.')}$`));
    // and the versioned files really load
    await page.goto('/');
    await expect(page.getByTestId('app-version')).toContainText(`v${version}`);
  });
});
