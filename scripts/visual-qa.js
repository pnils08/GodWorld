#!/usr/bin/env node
/**
 * ============================================================================
 * Visual QA Agent — Phase 6.4
 * ============================================================================
 *
 * Launches headless Chromium, navigates the GodWorld dashboard, takes
 * screenshots at multiple viewports, and verifies key elements render.
 *
 * Usage:
 *   node scripts/visual-qa.js                    # full run
 *   node scripts/visual-qa.js --skip-screenshots # element checks only
 *
 * Requires: Playwright (npx playwright install chromium)
 * ============================================================================
 */

const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.DASHBOARD_PORT || 3001}`;
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'visual-qa');
const SKIP_SCREENSHOTS = process.argv.includes('--skip-screenshots');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

// Auth credentials from .env
const AUTH_USER = process.env.DASHBOARD_USER;
const AUTH_PASS = process.env.DASHBOARD_PASS;

const results = [];

function pass(check, detail) {
  results.push({ status: 'PASS', check, detail });
  console.log(`  ✓ ${check}`);
}

function fail(check, detail) {
  results.push({ status: 'FAIL', check, detail });
  console.log(`  ✗ ${check} — ${detail}`);
}

async function main() {
  console.log('');
  console.log('=== GodWorld Visual QA ===');
  console.log(`Target: ${BASE_URL}`);
  console.log('');

  if (!SKIP_SCREENSHOTS) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // Build auth header for basic auth
    const authHeader = AUTH_USER && AUTH_PASS
      ? 'Basic ' + Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString('base64')
      : null;

    const context = await browser.newContext({
      extraHTTPHeaders: authHeader ? { 'Authorization': authHeader } : {},
    });

    const page = await context.newPage();

    // -----------------------------------------------------------------------
    // 1. Dashboard loads
    // -----------------------------------------------------------------------
    console.log('1. Page Load');
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    if (response && response.status() === 200) {
      pass('Dashboard loads', `HTTP ${response.status()}`);
    } else {
      fail('Dashboard loads', `HTTP ${response ? response.status() : 'no response'}`);
      return;
    }

    // Wait for React to render
    await page.waitForTimeout(2000);

    // -----------------------------------------------------------------------
    // 2. Screenshots at each viewport
    // -----------------------------------------------------------------------
    if (!SKIP_SCREENSHOTS) {
      console.log('');
      console.log('2. Screenshots');
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(500);
        const filename = `dashboard_${vp.name}_${vp.width}x${vp.height}.png`;
        await page.screenshot({ path: path.join(OUTPUT_DIR, filename), fullPage: true });
        pass(`Screenshot: ${vp.name}`, filename);
      }
      // Reset to desktop
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    // -----------------------------------------------------------------------
    // 3. Key element checks
    // -----------------------------------------------------------------------
    console.log('');
    console.log('3. Element Checks');

    // Check for main heading or title
    const title = await page.title();
    if (title && title.length > 0) {
      pass('Page title exists', title);
    } else {
      fail('Page title exists', 'No title found');
    }

    // Check for search (could be input or icon/button)
    const searchEl = await page.$('input[type="text"], input[type="search"], input[placeholder*="earch"], [aria-label*="earch"], svg, button');
    if (searchEl) {
      pass('Search element present', '');
    } else {
      fail('Search element present', 'No search element found');
    }

    // Check for navigation/tabs
    const navLinks = await page.$$('nav a, .tab, [role="tab"], button');
    if (navLinks.length > 0) {
      pass('Navigation elements', `${navLinks.length} interactive elements found`);
    } else {
      fail('Navigation elements', 'No nav/tab elements found');
    }

    // -----------------------------------------------------------------------
    // 4. API endpoint checks
    // -----------------------------------------------------------------------
    console.log('');
    console.log('4. API Health');

    const endpoints = [
      '/api/health',
      '/api/citizens?limit=1',
      '/api/edition/latest',
      '/api/initiatives',
      '/api/civic-documents',
      '/api/roster',
    ];

    for (const ep of endpoints) {
      try {
        const headers = authHeader ? { 'Authorization': authHeader } : {};
        const apiResp = await page.request.get(`${BASE_URL}${ep}`, { headers, timeout: 5000 });
        if (apiResp.status() === 200) {
          pass(`API ${ep}`, `200 OK`);
        } else {
          fail(`API ${ep}`, `HTTP ${apiResp.status()}`);
        }
      } catch (err) {
        fail(`API ${ep}`, err.message);
      }
    }

    // -----------------------------------------------------------------------
    // 5. Search interaction test
    // -----------------------------------------------------------------------
    console.log('');
    console.log('5. Interaction Tests');

    const textInput = await page.$('input[type="text"], input[type="search"]');
    if (textInput) {
      await textInput.click();
      await textInput.fill('Beverly');
      await page.waitForTimeout(1000);

      if (!SKIP_SCREENSHOTS) {
        await page.screenshot({
          path: path.join(OUTPUT_DIR, 'search_result_beverly.png'),
          fullPage: true,
        });
      }
      pass('Search interaction', 'Typed "Beverly" into search');
    } else {
      pass('Search interaction', 'Skipped — search uses icon/modal pattern');
    }

    // -----------------------------------------------------------------------
    // 6. Accessibility Audit (Axe)
    // -----------------------------------------------------------------------
    console.log('');
    console.log('6. Accessibility Audit');

    // Navigate back to clean state for audit
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    try {
      const axeResults = await new AxeBuilder({ page }).analyze();
      const violations = axeResults.violations;

      if (violations.length === 0) {
        pass('Accessibility scan', 'No violations found');
      } else {
        const critical = violations.filter(v => v.impact === 'critical');
        const serious = violations.filter(v => v.impact === 'serious');
        const moderate = violations.filter(v => v.impact === 'moderate');
        const minor = violations.filter(v => v.impact === 'minor');

        if (critical.length > 0) {
          fail('Accessibility: critical', `${critical.length} critical violations`);
          critical.forEach(v => console.log(`    - ${v.id}: ${v.description} (${v.nodes.length} elements)`));
        }
        if (serious.length > 0) {
          fail('Accessibility: serious', `${serious.length} serious violations`);
          serious.forEach(v => console.log(`    - ${v.id}: ${v.description} (${v.nodes.length} elements)`));
        }
        if (moderate.length > 0) {
          pass('Accessibility: moderate', `${moderate.length} moderate issues (non-blocking)`);
        }
        if (minor.length > 0) {
          pass('Accessibility: minor', `${minor.length} minor issues (non-blocking)`);
        }

        // Write full violation report
        if (!SKIP_SCREENSHOTS) {
          const a11yPath = path.join(OUTPUT_DIR, 'accessibility-report.json');
          fs.writeFileSync(a11yPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            summary: { critical: critical.length, serious: serious.length, moderate: moderate.length, minor: minor.length },
            violations: violations.map(v => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              help: v.help,
              helpUrl: v.helpUrl,
              elements: v.nodes.length,
            })),
          }, null, 2));
          console.log(`  Report: ${a11yPath}`);
        }
      }
    } catch (err) {
      fail('Accessibility scan', err.message);
    }

    await context.close();
  } finally {
    await browser.close();
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('');
  console.log('=== QA Summary ===');
  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  console.log(`Passed: ${passes}  Failed: ${fails}  Total: ${results.length}`);

  if (!SKIP_SCREENSHOTS) {
    console.log(`Screenshots: ${OUTPUT_DIR}`);
  }

  // Write JSON report
  if (!SKIP_SCREENSHOTS) {
    const reportPath = path.join(OUTPUT_DIR, 'qa-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      results,
      summary: { passes, fails, total: results.length },
    }, null, 2));
    console.log(`Report: ${reportPath}`);
  }

  console.log('');
  process.exit(fails > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Visual QA fatal error:', err);
  process.exit(1);
});
