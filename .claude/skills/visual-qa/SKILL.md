---
name: visual-qa
description: Run visual QA against the GodWorld dashboard — screenshots, element checks, API health.
user_invocable: true
---

# Visual QA — Dashboard Smoke Test

Run the Playwright-based visual QA script against the live dashboard.

## Steps

1. Run `node scripts/visual-qa.js` — full run with screenshots
2. Review the summary (pass/fail counts)
3. If failures exist, read `output/visual-qa/qa-report.json` for details
4. Screenshots are in `output/visual-qa/` — read the desktop PNG to visually verify

## Quick mode

Run `node scripts/visual-qa.js --skip-screenshots` for element + API checks only (faster).

## When to run

- After any dashboard code change
- After PM2 restart
- Before session end as a smoke test
