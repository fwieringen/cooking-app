// Scenario 4 – Making, viewing and cancelling a reservation
const { test, expect } = require('@playwright/test');
const { fresh, register, book, isoInDays } = require('./helpers');

test.describe('Reservations', () => {
  test.beforeEach(async ({ page }) => fresh(page));

  test('an anonymous visitor must sign in before reserving', async ({ page }) => {
    await page.goto(`/#/restaurant/r102?date=${isoInDays(2)}`);
    await page.getByTestId('slot-1900').click();
    await page.getByTestId('book-submit').click();
    await expect(page).toHaveURL(/#\/login/);
  });

  test('a signed-in consumer can book, see and cancel a reservation', async ({ page }) => {
    await register(page);
    await book(page, 'r102', { guests: 4 });
    await expect(page.getByTestId('confirmation')).toBeVisible();
    const id = await page.getByTestId('reservation-id').innerText();
    expect(id).toMatch(/^CK-[A-Z0-9]{6}$/);

    await page.goto('/#/account');
    const row = page.locator(`[data-testid="my-reservation"][data-id="${id}"]`);
    await expect(row.getByTestId('status')).toHaveText('confirmed');
    await row.getByTestId('cancel').click();
    await expect(row.getByTestId('status')).toHaveText('cancelled');
  });

  test('a time slot must be chosen', async ({ page }) => {
    await register(page);
    await page.goto(`/#/restaurant/r102?date=${isoInDays(2)}`);
    await page.getByTestId('book-submit').click();
    await expect(page.getByTestId('error-time')).toBeVisible();
  });

  test('a restaurant cannot be overbooked (capacity control)', async ({ page }) => {
    await register(page);
    const date = isoInDays(5);
    // Sumi Kitchen has 18 seats per time slot
    await book(page, 'r201', { date, guests: 12, time: '1930' });
    await expect(page.getByTestId('confirmation')).toBeVisible();
    await page.goto(`/#/restaurant/r201?date=${date}&guests=12`);
    await expect(page.getByTestId('slot-1930')).toBeDisabled();
    await page.getByTestId('book-guests').selectOption('6');
    await expect(page.getByTestId('slot-1930')).toBeEnabled();
  });
});
