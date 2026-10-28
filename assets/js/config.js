/* Cooking.com demo – application configuration */
window.CK_CONFIG = (() => {
  const APP_VERSION = '1.0.0';
  const RELEASE_DATE = '2026-10-28';

  const host = window.location.hostname;
  let environment = 'production';
  if (host.startsWith('cooking-test.')) environment = 'test';
  else if (host === 'localhost' || host === '127.0.0.1' || host === '' || host.endsWith('.local')) environment = 'development';

  return {
    APP_VERSION,
    RELEASE_DATE,
    environment,
    hosts: {
      production: 'cooking-prod.vanwieringen.org',
      test: 'cooking-test.vanwieringen.org',
    },
    maxGuests: 12,
    bookingHorizonDays: 90,
  };
})();
