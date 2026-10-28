// Scenario 5 – Booking and paying for a package deal
const { test, expect } = require('@playwright/test');
const { fresh, register } = require('./helpers');

const VALID_CARD = '4111 1111 1111 1111';   // standard test card (passes the Luhn check)
const INVALID_CARD = '4111 1111 1111 1112'; // fails the Luhn check

test.describe('Package deals and payment', () => {
  test.beforeEach(async ({ page }) => fresh(page));

  test('package deals are listed', async ({ page }) => {
    await page.goto('/#/deals');
    await expect(page.getByTestId('deal-card')).toHaveCount(5);
  });

  test('an anonymous visitor is asked to sign in at checkout', async ({ page }) => {
    await page.goto('/#/deal/d3');
    await expect(page.getByTestId('deal-login')).toBeVisible();
  });

  test('invalid card details are rejected', async ({ page }) => {
    await register(page);
    await page.goto('/#/deal/d3');
    await page.getByTestId('card-name').fill('S de Vries');
    await page.getByTestId('card-number').fill(INVALID_CARD);
    await page.getByTestId('card-expiry').fill('01/20');
    await page.getByTestId('card-cvc').fill('12');
    await page.getByTestId('pay-submit').click();
    await expect(page.getByTestId('error-cardNumber')).toBeVisible();
    await expect(page.getByTestId('error-cardExpiry')).toBeVisible();
    await expect(page.getByTestId('error-cardCvc')).toBeVisible();
  });

  test('a valid card payment books the deal and never stores the full card number', async ({ page }) => {
    await register(page);
    await page.goto('/#/deal/d3');
    await page.getByTestId('card-name').fill('S de Vries');
    await page.getByTestId('card-number').fill(VALID_CARD);
    await page.getByTestId('card-expiry').fill('12/30');
    await page.getByTestId('card-cvc').fill('123');
    await page.getByLabel(/Save this card/).check();
    await page.getByTestId('pay-submit').click();
    await expect(page.getByTestId('confirmation')).toContainText('Visa •••• 1111');

    const stored = await page.evaluate(() => localStorage.getItem('cookingcom_demo_v1'));
    expect(stored).not.toContain('4111111111111111');
    expect(stored).not.toContain('4111 1111 1111 1111');

    await page.goto('/#/account');
    await expect(page.getByTestId('saved-cards')).toContainText('Visa •••• 1111');
  });

  test('paying with iDEAL | Wero does not require card details', async ({ page }) => {
    await register(page);
    await page.goto('/#/deal/d1');
    await page.getByTestId('pay-method').selectOption('ideal');
    await expect(page.getByTestId('card-number')).toBeHidden();
    await page.getByTestId('pay-submit').click();
    await expect(page.getByTestId('confirmation')).toContainText('iDEAL | Wero');
  });
});
