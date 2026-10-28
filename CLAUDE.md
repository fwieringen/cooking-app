# CLAUDE.md – Cooking.com demo

This repository is a teaching demo for the UvA course *Business Process & Systems Design*.
Cooking.com is a fictitious company. The app is a static single-page app: HTML, CSS and vanilla JavaScript, no framework, no build step, no back end.

## How the code is organised
- `index.html` – page shell (header, footer, script tags)
- `assets/css/styles.css` – house style. Brand colours: navy `#0D3678`, sky blue `#21A8DF`, hat purple `#6B1F5C`
- `assets/js/config.js` – `APP_VERSION`, release date, environment detection
- `assets/js/data.js` – restaurants, deals, reviews (all fictitious)
- `assets/js/validation.js` – all validation rules (these are the application controls; keep them here)
- `assets/js/store.js` – browser storage (`localStorage`) and the audit trail
- `assets/js/app.js` – views and hash routing (`#/search`, `#/restaurant/:id`, …)
- `tests/e2e/` – Playwright test scenarios, one file per business process

## Commands
- `npm start` – local server on http://localhost:4173
- `npm test` – run all test scenarios (desktop and mobile)

## Rules for every change
1. Work on a new branch (`feature/<short-name>`), never directly on `main`.
2. Keep the existing style: vanilla JS, no new dependencies or frameworks, no external CDNs, UI text in English.
3. Put new validation rules in `validation.js`, and add `data-testid` attributes to new interactive elements.
4. Add or update a test scenario in `tests/e2e/` for every functional change.
5. Run `npm test` and make sure **all** tests pass before committing. Never weaken, skip or delete an existing test to make a change pass – if a test seems wrong, stop and explain why.
6. Bump `APP_VERSION` in `assets/js/config.js` (patch for fixes, minor for new features) and set `RELEASE_DATE`.
7. Commit with a clear message and open a pull request that describes the change and the tests.

## What you must never do
- Never deploy, and never use FTP or any other way to upload files to a server. Deployment only happens through the GitHub Actions pipeline, and production requires approval by the product owner.
- Never change `.github/workflows/` unless explicitly asked to.
- Never add real personal data, real payment data, secrets or passwords to the repository.
- Never store full card numbers; only a token and the last four digits.
