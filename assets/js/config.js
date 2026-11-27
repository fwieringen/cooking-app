/* Cooking.com demo – application configuration */
window.CK_CONFIG = (() => {
  const APP_VERSION = '1.4.0';
  const RELEASE_DATE = '2026-11-27';

  const host = window.location.hostname;
  let environment = 'production';
  if (host.startsWith('cooking-test.')) environment = 'test';
  else if (host === 'localhost' || host === '127.0.0.1' || host === '' || host.endsWith('.local')) environment = 'development';

  return {
    APP_VERSION,
    RELEASE_DATE,
    environment,
    maxGuests: 12,
    bookingHorizonDays: 90,
    referralDiscountPercent: 10,  // voucher for the referrer when a new client registers with their code
    voucherValidityDays: 365,
    // Security settings
    sessionIdleMinutes: 30,       // sign out after 30 minutes without activity
    sessionMaxHours: 12,          // and always after 12 hours
    maxFailedLogins: 5,           // failed sign-ins per account before a temporary lock
    loginLockMinutes: 15,
    passwordHashIterations: 600000, // PBKDF2-SHA256 (OWASP recommendation)
  };
})();
