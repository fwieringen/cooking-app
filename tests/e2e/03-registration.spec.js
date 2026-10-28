// Scenario 3 – Consumer registration (process from Case Assignment 2)
const { test, expect } = require('@playwright/test');
const { fresh, register, uniqueUser } = require('./helpers');

test.describe('Consumer registration', () => {
  test.beforeEach(async ({ page }) => fresh(page));

  test('a new consumer can register and is signed in', async ({ page }) => {
    const u = await register(page);
    await expect(page.getByTestId('nav-account')).toContainText(u.firstName);
  });

  test('an invalid e-mail address is rejected', async ({ page }) => {
    await page.goto('/#/register');
    await page.getByTestId('reg-email').fill('not-an-email');
    await page.getByTestId('reg-email-submit').click();
    await expect(page.getByTestId('error-email')).toBeVisible();
  });

  test('the same e-mail address cannot be registered twice', async ({ page }) => {
    const u = await register(page);
    await page.getByTestId('nav-logout').click();
    await page.goto('/#/register');
    await page.getByTestId('reg-email').fill(u.email);
    await page.getByTestId('reg-email-submit').click();
    await expect(page.getByTestId('error-email')).toContainText('already exists');
  });

  test('details are validated: postcode, password and acceptance of terms', async ({ page }) => {
    const u = uniqueUser();
    await page.goto('/#/register');
    await page.getByTestId('reg-email').fill(u.email);
    await page.getByTestId('reg-email-submit').click();
    await page.getByTestId('reg-verify-link').click();
    await page.getByTestId('reg-first').fill(u.firstName);
    await page.getByTestId('reg-last').fill(u.lastName);
    await page.getByTestId('reg-street').fill(u.street);
    await page.getByTestId('reg-postcode').fill('12345');      // not a Dutch postcode
    await page.getByTestId('reg-city').fill(u.city);
    await page.getByTestId('reg-phone').fill(u.phone);
    await page.getByTestId('reg-username').fill(u.username);
    await page.getByTestId('reg-password').fill('short1');     // too weak
    await page.getByTestId('reg-details-submit').click();
    await expect(page.getByTestId('error-postcode')).toBeVisible();
    await expect(page.getByTestId('error-password')).toBeVisible();
    await expect(page.getByTestId('error-terms')).toBeVisible();
    await expect(page.getByTestId('error-privacy')).toBeVisible();
  });

  test('details cannot be entered without a verified e-mail address', async ({ page }) => {
    await page.goto('/#/register?step=details');
    await expect(page.getByTestId('reg-email')).toBeVisible();
  });

  test('a registered user can sign in again', async ({ page }) => {
    const u = await register(page);
    await page.getByTestId('nav-logout').click();
    await page.goto('/#/login');
    await page.getByTestId('login-id').fill(u.email);
    await page.getByTestId('login-password').fill('wrong-password-1');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('error-password')).toBeVisible();
    await page.getByTestId('login-password').fill(u.password);
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('nav-account')).toBeVisible();
  });
});
