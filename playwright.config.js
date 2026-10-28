// Standard test scenarios for the Cooking.com demo.
// Locally: `npm test` starts a local server automatically.
// Against a deployed environment: BASE_URL=https://cooking-test.vanwieringen.org npm test
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: BASE_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.BASE_URL ? undefined : { command: 'node scripts/serve.js 4173', url: BASE_URL, reuseExistingServer: true },
});
