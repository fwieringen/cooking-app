// Scenario 6 – Restaurant sign-up (process from Case Assignment 2)
const { test, expect } = require('@playwright/test');
const { fresh } = require('./helpers');

async function startSignup(page, overrides = {}) {
  const v = { name: 'Eetcafé De Demo', address: 'Spui 21', city: 'Amsterdam', phone: '+31201234567', hours: 'Daily 12:00–22:00',
    owner: 'Jan Jansen', contact: 'Fatima el Amrani', kvk: '12345678', vat: 'NL123456789B01', iban: 'NL91 ABNA 0417 1643 00',
    seats: '40', tables: '12', signature: 'Bitterballen deluxe', ...overrides };
  await page.goto('/#/partner');
  await page.getByTestId('partner-email').fill(`owner.${Date.now()}@example.org`);
  await page.getByTestId('partner-email-submit').click();
  await page.getByTestId('partner-verify-link').click();
  await page.getByTestId('p-name').fill(v.name);
  await page.getByTestId('p-address').fill(v.address);
  await page.getByTestId('p-city').selectOption(v.city);
  await page.getByTestId('p-phone').fill(v.phone);
  await page.getByTestId('p-hours').fill(v.hours);
  await page.getByTestId('p-owner').fill(v.owner);
  await page.getByTestId('p-contact').fill(v.contact);
  await page.getByTestId('p-kvk').fill(v.kvk);
  await page.getByTestId('p-vat').fill(v.vat);
  await page.getByTestId('p-iban').fill(v.iban);
  await page.getByTestId('p-seats').fill(v.seats);
  await page.getByTestId('p-tables').fill(v.tables);
  await page.getByTestId('p-signature').fill(v.signature);
  await page.getByTestId('p-submit').click();
  return v;
}

test.describe('Restaurant sign-up', () => {
  test.beforeEach(async ({ page }) => fresh(page));

  test('a restaurant with valid details can sign the contract and go live', async ({ page }) => {
    const v = await startSignup(page);
    await page.getByTestId('p-to-contract').click();
    await page.getByTestId('p-esign').fill('Someone Else');
    await page.getByTestId('p-agree').check();
    await page.getByTestId('p-sign').click();
    await expect(page.getByTestId('error-signature')).toBeVisible();   // signature must match the owner
    await page.getByTestId('p-esign').fill(v.owner);
    await page.getByTestId('p-sign').click();
    await expect(page.getByTestId('p-done')).toBeVisible();
  });

  test('an application with an invalid IBAN goes to manual review', async ({ page }) => {
    await startSignup(page, { iban: 'NL00 ABNA 0000 0000 00' });
    await expect(page.getByTestId('p-manual')).toBeVisible();
  });

  test('more tables than seats is not accepted', async ({ page }) => {
    await startSignup(page, { seats: '10', tables: '20' });
    await expect(page.getByTestId('error-tables')).toBeVisible();
  });

  test('the contract step cannot be reached without validation', async ({ page }) => {
    await page.goto('/#/partner?step=contract');
    await expect(page.getByTestId('partner-email')).toBeVisible();
  });
});
