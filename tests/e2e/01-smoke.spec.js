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
