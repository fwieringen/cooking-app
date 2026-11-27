// Shared helpers for the Cooking.com standard test scenarios
const { expect } = require('@playwright/test');

const isoInDays = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const weekday = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay();   // 0 = Sunday … 6 = Saturday
// First date at least `n` days ahead that falls on one of the given weekdays (e.g. when a restaurant is open)
const isoInDaysOn = (n, weekdays) => {
  for (let i = n; i < n + 7; i++) if (weekdays.includes(weekday(isoInDays(i)))) return isoInDays(i);
  throw new Error('no matching weekday');
};
const TUE_SAT = [2, 3, 4, 5, 6];

let counter = 0;
const uniqueUser = () => {
  const n = `${Date.now().toString(36)}${(counter++).toString(36)}`;
  return {
    email: `student.${n}@example.org`, username: `student_${n}`.slice(0, 20), password: 'Welkom2026demo',
    firstName: 'Sam', lastName: 'de Vries', street: 'Plantage Muidergracht 12', postcode: '1018 TV', city: 'Amsterdam', phone: '+31612345678',
  };
};

async function fresh(page) {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/#/');
}

async function register(page, u = uniqueUser(), { card, referral } = {}) {
  await page.goto('/#/register');
  await page.getByTestId('reg-email').fill(u.email);
  await page.getByTestId('reg-email-submit').click();
  await page.getByTestId('reg-verify-link').click();
  await page.getByTestId('reg-first').fill(u.firstName);
  await page.getByTestId('reg-last').fill(u.lastName);
  await page.getByTestId('reg-street').fill(u.street);
  await page.getByTestId('reg-postcode').fill(u.postcode);
  await page.getByTestId('reg-city').fill(u.city);
  await page.getByTestId('reg-phone').fill(u.phone);
  await page.getByTestId('reg-username').fill(u.username);
  await page.getByTestId('reg-password').fill(u.password);
  if (referral) await page.getByTestId('reg-referral').fill(referral);
  await page.getByTestId('reg-terms').check();
  await page.getByTestId('reg-privacy').check();
  await page.getByTestId('reg-details-submit').click();
  await page.getByTestId('reg-taste-submit').click();
  if (card) {
    await page.getByTestId('reg-card-name').fill('S de Vries');
    await page.getByTestId('reg-card-number').fill(card);
    await page.getByTestId('reg-card-expiry').fill('12/30');
    await page.getByTestId('reg-card-cvc').fill('123');
    await page.getByTestId('reg-finish-card').click();
  } else {
    await page.getByTestId('reg-skip-payment').click();
  }
  await expect(page.getByTestId('reg-done')).toBeVisible();
  return u;
}

async function book(page, restaurantId, { date = isoInDays(3), guests = 2, time = '1900' } = {}) {
  await page.goto(`/#/restaurant/${restaurantId}?date=${date}&guests=${guests}`);
  await page.getByTestId(`slot-${time}`).click();
  await page.getByTestId('book-submit').click();
}

module.exports = { isoInDays, isoInDaysOn, weekday, TUE_SAT, uniqueUser, fresh, register, book };
