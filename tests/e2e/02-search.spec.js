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

test.describe('Food hall in Hilversum', () => {
  test.beforeEach(async ({ page }) => fresh(page));

  test('searching Hilversum finds the MOUT food hall', async ({ page }) => {
    await page.getByTestId('search-city').selectOption('Hilversum');
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('results-title')).toContainText('Hilversum: 1 restaurant found');
    await expect(page.getByTestId('result').first()).toContainText('MOUT');
    await expect(page.getByTestId('result').first()).toContainText('Food hall');
  });

  test('the food hall cuisine filter shows MOUT', async ({ page }) => {
    await page.goto('/#/search');
    await page.getByTestId('filter-cuisine').selectOption('foodhall');
    await expect(page.getByTestId('result')).toHaveCount(1);
    await expect(page.getByTestId('result').first()).toContainText('MOUT');
  });

  test('the MOUT detail page can be opened and booked', async ({ page }) => {
    await page.goto('/#/restaurant/r451');
    await expect(page.getByTestId('restaurant-name')).toHaveText('MOUT');
    await expect(page.getByText('Hilversum').first()).toBeVisible();
    await expect(page.getByTestId('booking-box')).toBeVisible();
  });

  test('the Hilversum city button opens the search for Hilversum', async ({ page }) => {
    await page.getByTestId('city-card').filter({ hasText: 'Hilversum' }).click();
    await expect(page.getByTestId('results-title')).toContainText('Hilversum: 1 restaurant found');
  });
});

test.describe('Explore by city', () => {
  test('each city button on the home page shows the flag of its country', async ({ page }) => {
    await fresh(page);
    const cards = page.getByTestId('city-card');
    await expect(cards).toHaveCount(8);
    for (const [city, country] of [['The Hague', 'Netherlands'], ['Amsterdam', 'Netherlands'], ['Rotterdam', 'Netherlands'], ['Utrecht', 'Netherlands'], ['Hilversum', 'Netherlands'],
      ['Barcelona', 'Spain'], ['Sydney', 'Australia'], ['San Francisco', 'United States']]) {
      const card = cards.filter({ hasText: city });
      await expect(card.getByRole('img', { name: country })).toBeVisible();
    }
  });

  test('clicking a city button still opens the search for that city', async ({ page }) => {
    await fresh(page);
    await page.getByTestId('city-card').filter({ hasText: 'Barcelona' }).click();
    await expect(page.getByTestId('results-title')).toContainText('Barcelona: 1 restaurant found');
  });
});
