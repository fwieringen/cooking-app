// Scenario 7 – Referral programme: bring in a new client, get a discount voucher
const { test, expect } = require('@playwright/test');
const { fresh, register, uniqueUser } = require('./helpers');

const VALID_CARD = '4111 1111 1111 1111';

// Register a referrer, read their code, sign out, and register a friend with that code
async function referAFriend(page) {
  const referrer = await register(page);
  await page.goto('/#/account');
  const code = (await page.getByTestId('referral-code').textContent()).trim();
  await page.getByTestId('nav-logout').click();
  const friend = await register(page, uniqueUser(), { referral: code });
  await page.getByTestId('nav-logout').click();
  return { referrer, friend, code };
}

async function signIn(page, u) {
  await page.goto('/#/login');
  await page.getByTestId('login-id').fill(u.email);
  await page.getByTestId('login-password').fill(u.password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('nav-account')).toBeVisible();
}

async function payWithCard(page) {
  await page.getByTestId('card-name').fill('S de Vries');
  await page.getByTestId('card-number').fill(VALID_CARD);
  await page.getByTestId('card-expiry').fill('12/30');
  await page.getByTestId('card-cvc').fill('123');
  await page.getByTestId('pay-submit').click();
}

test.describe('Referral programme and discount vouchers', () => {
  test.beforeEach(async ({ page }) => fresh(page));

  test('the home page advertises the referral discount', async ({ page }) => {
    const promo = page.getByTestId('referral-promo');
    await expect(promo).toBeVisible();
    await expect(promo).toContainText('10% off');
    await page.getByTestId('referral-cta').click();
    await expect(page.getByTestId('reg-email')).toBeVisible();
  });

  test('a signed-in customer is sent to their referral code from the home page', async ({ page }) => {
    await register(page);
    await page.goto('/#/');
    await page.getByTestId('referral-cta').click();
    await expect(page.getByTestId('referral-code')).toHaveText(/^REF-[A-Z0-9]{6}$/);
    await expect(page.getByTestId('referral-link')).toHaveValue(/#\/register\?ref=REF-/);
    await expect(page.getByTestId('no-vouchers')).toBeVisible();
  });

  test('an invalid referral code is rejected at registration', async ({ page }) => {
    const u = uniqueUser();
    await page.goto('/#/register');
    await page.getByTestId('reg-email').fill(u.email);
    await page.getByTestId('reg-email-submit').click();
    await page.getByTestId('reg-verify-link').click();
    await page.getByTestId('reg-referral').fill('REF-NOPE00');
    await page.getByTestId('reg-details-submit').click();
    await expect(page.getByTestId('error-referral')).toContainText('not valid');
  });

  test('the invite link fills in the referral code', async ({ page }) => {
    await register(page);
    await page.goto('/#/account');
    const code = (await page.getByTestId('referral-code').textContent()).trim();
    await page.getByTestId('nav-logout').click();
    await page.goto(`/#/register?ref=${code}`);
    await page.getByTestId('reg-email').fill(uniqueUser().email);
    await page.getByTestId('reg-email-submit').click();
    await page.getByTestId('reg-verify-link').click();
    await expect(page.getByTestId('reg-referral')).toHaveValue(code);
  });

  test('bringing in a new client earns the referrer a voucher', async ({ page }) => {
    const { referrer, friend } = await referAFriend(page);
    await signIn(page, referrer);
    await page.goto('/#/account');
    await expect(page.getByTestId('referral-count')).toContainText('1');
    await expect(page.getByTestId('voucher')).toHaveCount(1);
    await expect(page.getByTestId('voucher-status')).toHaveText('available');

    // The new client does not get a voucher themselves
    await page.getByTestId('nav-logout').click();
    await signIn(page, friend);
    await page.goto('/#/account');
    await expect(page.getByTestId('no-vouchers')).toBeVisible();
  });

  test('the voucher gives 10% off a package deal and can be used only once', async ({ page }) => {
    const { referrer } = await referAFriend(page);
    await signIn(page, referrer);
    await page.goto('/#/deal/d3');                       // Rijsttafel Feast, €79
    await page.getByTestId('pay-voucher').selectOption({ index: 1 });
    await expect(page.getByTestId('pay-submit')).toContainText('€71.10');
    await payWithCard(page);
    await expect(page.getByTestId('confirmation')).toContainText('€71.10');
    await expect(page.getByTestId('confirmation-voucher')).toContainText('€7.90');

    await page.goto('/#/account');
    await expect(page.getByTestId('voucher-status')).toHaveText('used');

    // A used voucher is no longer offered at checkout
    await page.goto('/#/deal/d1');
    await expect(page.getByTestId('pay-voucher')).toHaveCount(0);
    await expect(page.getByTestId('pay-submit')).toContainText('€149.00');
  });

  test('customers without a voucher see the normal checkout', async ({ page }) => {
    await register(page);
    await page.goto('/#/deal/d3');
    await expect(page.getByTestId('pay-voucher')).toHaveCount(0);
    await expect(page.getByTestId('pay-submit')).toContainText('€79.00');
  });
});
