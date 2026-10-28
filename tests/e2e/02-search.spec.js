// Scenario 2 – Searching for restaurants
const { test, expect } = require('@playwright/test');
const { fresh } = require('./helpers');

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => fresh(page));

  test('search by city shows only restaurants in that city', async ({ page }) => {
    await page.getByTestId('search-city').selectOption('Amsterdam');
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('results-title')).toContainText('Amsterdam: 3 restaurants found');
    const cities = await page.getByTestId('result').allInnerTexts();
    for (const c of cities) expect(c).toContain('Amsterdam');
  });

  test('cuisine filter narrows the results', async ({ page }) => {
    await page.goto('/#/search?city=Amsterdam');
    await page.getByTestId('filter-cuisine').selectOption('japanese');
    await expect(page.getByTestId('result')).toHaveCount(1);
    await expect(page.getByTestId('result').first()).toContainText('Sumi Kitchen');
  });

  test('a search without matches says so', async ({ page }) => {
    await page.goto('/#/search?city=Utrecht&cuisine=japanese');
    await expect(page.getByTestId('no-results')).toBeVisible();
  });

  test('a restaurant detail page shows key information', async ({ page }) => {
    await page.goto('/#/search?city=The%20Hague');
    await page.getByTestId('result').filter({ hasText: 'De Gouden Lepel' }).click();
    await expect(page.getByTestId('restaurant-name')).toHaveText('De Gouden Lepel');
    await expect(page.getByText('Signature dish')).toBeVisible();
    await expect(page.getByTestId('booking-box')).toBeVisible();
  });
});
