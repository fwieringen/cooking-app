# Cooking.com – demo web application

Teaching demo for **Business Process & Systems Design** (University of Amsterdam).
Cooking.com is a **fictitious** company; see the case description for background.

| Environment | URL |
|---|---|
| Production | https://cooking-prod.vanwieringen.org |
| Test | https://cooking-test.vanwieringen.org |

## What the app does
A static single-page app (HTML, CSS, vanilla JavaScript, no build step) that covers the processes from the case:

- **Search** restaurants by city, date, time and number of guests, with cuisine and price filters
- **Consumer registration**: e-mail verification → details → taste profile → optional payment details
- **Reservations** with time slots, opening hours and a capacity check (no overbooking), plus cancelling
- **Package deals** with (simulated) payment: card, iDEAL | Wero, PayPal, Apple Pay
- **Restaurant sign-up**: e-mail verification → details → automated validation (KvK, VAT, IBAN) → contract with e-signature → live
- **My account**: reservations, details, taste profile, saved (masked) cards

All data is stored in the visitor’s own browser (`localStorage`); there is no back end. Use *Reset demo data* in the footer to start over.
Test card: `4111 1111 1111 1111`, any future expiry date, any 3-digit CVC.

## Structure
```
index.html                 page shell (header, footer)
assets/css/styles.css      Cooking.com house style
assets/js/config.js        version number and environment detection
assets/js/data.js          restaurants, deals, reviews (fictitious)
assets/js/validation.js    validation rules = the application controls
assets/js/store.js         browser storage, audit trail
assets/js/app.js           pages and routing
tests/e2e/                 standard test scenarios (Playwright)
scripts/serve.js           tiny local web server
```

## Run locally
```bash
npm install
npx playwright install chromium   # first time only
npm start                         # http://localhost:4173
npm test                          # runs all standard test scenarios (desktop + mobile)
```
Run the tests against a deployed environment:
```bash
BASE_URL=https://cooking-test.vanwieringen.org npm test
```

## Standard test scenarios
1. **Smoke** – site loads without errors, main pages reachable, test environment is marked
2. **Search** – city search, cuisine filter, no-results message, restaurant details
3. **Registration** – happy path, invalid e-mail, duplicate e-mail, postcode/password/terms validation, sign in
4. **Reservations** – sign-in required, book/view/cancel, time slot required, capacity control
5. **Package deals** – listing, sign-in required, card validation, card number never stored, iDEAL | Wero
6. **Restaurant sign-up** – happy path with e-signature, invalid IBAN → manual review, tables ≤ seats, no skipping steps

## Releasing
Bump `APP_VERSION` in `assets/js/config.js` with every release; it is shown in the footer and in the test-environment banner.

## Pipeline (GitHub Actions)
`.github/workflows/ci-cd.yml`:

1. **Pull request** → all test scenarios run; the PR can only be merged when they pass.
2. **Merge to `main`** → tests → upload to **TEST** via FTP → version check and all scenarios against cooking-test.
3. **Approval** → the run waits at the `production` environment until the product owner approves.
4. **Production** → upload to **PRODUCTION** via FTP → version check and smoke test against cooking-prod.

Configuration in GitHub (*Settings*):

| Where | Name | Value |
|---|---|---|
| Secrets → Actions (repository) | `FTP_SERVER` | `vanwieringen.org` |
| Secrets → Actions (repository) | `FTP_USERNAME` | `cookingcom` |
| Secrets → Actions (repository) | `FTP_PASSWORD` | *(the FTP password)* |
| Environment `test` → variables | `FTP_DIR` | FTP folder of cooking-test, ending in `/` |
| Environment `production` → variables | `FTP_DIR` | FTP folder of cooking-prod, ending in `/` |
| Environment `production` → protection | Required reviewers | the product owner |
| Variables (optional) | `FTP_PROTOCOL` | `ftps` (default) or `ftp` |

`CLAUDE.md` and `.claude/settings.json` tell Claude Code how to work in this repository and block it from deploying itself.
