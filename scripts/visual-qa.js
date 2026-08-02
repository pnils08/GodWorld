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
 *   node scripts/visual-qa.js --sports-fixture --base-url=http://127.0.0.1:4174
 *
 * Requires: Playwright (npx playwright install chromium)
 * ============================================================================
 */

const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const path = require('path');
const fs = require('fs');
require('/root/GodWorld/lib/env');

const baseUrlArg = process.argv.find(arg => arg.startsWith('--base-url='));
const BASE_URL = baseUrlArg
  ? baseUrlArg.substring('--base-url='.length)
  : `http://localhost:${process.env.DASHBOARD_PORT || 3001}`;
const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'visual-qa');
const SKIP_SCREENSHOTS = process.argv.includes('--skip-screenshots');
const SPORTS_FIXTURE = process.argv.includes('--sports-fixture');

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

function sportsEnvelope(data, source) {
  return {
    contractVersion: 1,
    source: source || {
      kind: 'sheet',
      name: 'SYNTHETIC sports fixture',
      fetchedAt: '2042-01-01T00:00:00.000Z',
      cycle: 404,
      sheets: {},
    },
    data,
    warnings: [],
    error: null,
  };
}

async function installSportsFixture(page) {
  let lastMutationAction = null;
  const roster = {
    as: [{
      sourceRow: 2, popid: 'POP-90001', validPopid: true,
      name: 'Synthetic Batter', tier: '1', position: 'CF', team: "A's",
      stats: { AVG: '.300', HR: '5', RBI: '18' },
      statValues: {
        'batting.ab': '100',
        'batting.avg': '.300',
        'batting.h': '30',
        'batting.hr': '5',
        'batting.rbi': '18',
        'batting.sb': '4',
        'batting.so': '21',
        'pitching.ip': '',
        'pitching.era': '',
        'pitching.wl': '',
        'pitching.so': '',
        'pitching.bb': '',
      },
      citizen: {
        resolved: true,
        sourceRow: 22,
        tier: '1',
        status: 'Active',
        roleType: "A's Player",
        statusStartCycle: '',
        healthCause: '',
        neighborhood: 'Downtown',
      },
    }],
    oaks: [{
      sourceRow: 2, popid: 'POP-90002', validPopid: true,
      name: 'Synthetic Guard', tier: '1', position: 'G', team: 'Oaks',
      stats: { PPG: '20.0', ASST: '7.0', '3P%': '39.0' },
      statValues: {
        'basketball.ppg': '20.0',
        'basketball.asst': '7.0',
        'basketball.reb': '5.0',
        'basketball.stl': '2.0',
        'basketball.fgPct': '51.0%',
        'basketball.threePct': '39.0%',
      },
      citizen: {
        resolved: true,
        sourceRow: 23,
        tier: '2',
        status: 'Active',
        roleType: 'Oaks Player',
        statusStartCycle: '',
        healthCause: '',
        neighborhood: 'West Oakland',
      },
    }],
  };
  const team = (id, eventCount = 1) => ({
    id,
    label: id === 'as' ? "The A's" : 'The Oaks',
    sheetValue: id === 'as' ? "A's" : 'Oaks',
    rosterCount: roster[id].length,
    eventCount,
    state: {
      SeasonType: { value: 'regular-season', sourceCycle: 404, sourceRow: 4 },
      'Team Record': { value: id === 'as' ? '12-7' : '15-9', sourceCycle: 404, sourceRow: 4 },
      Streak: { value: id === 'as' ? 'W2' : 'L1', sourceCycle: 404, sourceRow: 4 },
      FanSentiment: { value: 'confident', sourceCycle: 403, sourceRow: 3 },
    },
  });
  const events = [
    {
      cycle: 404, sourceRow: 4, teamId: 'as', team: "A's",
      EventType: 'game-result', NamesUsed: 'Synthetic Batter',
      Notes: 'SYNTHETIC NON-CANON result for visual QA.',
      Stats: '2-for-4', 'Team Record': '12-7', StoryAngle: 'Synthetic angle',
    },
    {
      cycle: 404, sourceRow: 5, teamId: 'oaks', team: 'Oaks',
      EventType: 'season-state', NamesUsed: '',
      Notes: 'SYNTHETIC NON-CANON season state for visual QA.',
      'Team Record': '15-9', Streak: 'L1',
    },
  ];
  const options = {
    eventTypes: ['game-result', 'stat-capture', 'roster-move', 'player-feature', 'front-office', 'fan-civic', 'season-state', 'editorial-note'],
    seasonTypes: ['off-season', 'regular-season', 'playoffs'],
    playerMoods: ['', 'confident', 'frustrated'],
    eventTriggers: ['', 'hot-streak', 'cold-streak'],
    neighborhoods: ['', 'Downtown', 'Lake Merritt'],
    fanSentiments: ['', 'confident', 'frustrated'],
    franchiseStability: ['', 'stable', 'uncertain'],
    economicFootprints: ['', 'steady', 'growing'],
    communityInvestments: ['', 'active', 'moderate'],
    mediaProfiles: ['', 'local', 'regional'],
  };
  const statFields = {
    as: [
      { key: 'batting.ab', label: 'AB', column: 'I', validator: 'integer' },
      { key: 'batting.avg', label: 'AVG', column: 'J', validator: 'rate' },
      { key: 'batting.h', label: 'H', column: 'K', validator: 'integer' },
      { key: 'batting.hr', label: 'HR', column: 'L', validator: 'integer' },
      { key: 'batting.rbi', label: 'RBI', column: 'M', validator: 'integer' },
      { key: 'batting.sb', label: 'SB', column: 'N', validator: 'integer' },
      { key: 'batting.so', label: 'Batting SO', column: 'O', validator: 'integer' },
      { key: 'pitching.ip', label: 'IP', column: 'P', validator: 'innings' },
      { key: 'pitching.era', label: 'ERA', column: 'Q', validator: 'decimal' },
      { key: 'pitching.wl', label: 'W-L', column: 'R', validator: 'record' },
      { key: 'pitching.so', label: 'Pitching SO', column: 'S', validator: 'integer' },
      { key: 'pitching.bb', label: 'BB', column: 'T', validator: 'integer' },
    ],
    oaks: [
      { key: 'basketball.ppg', label: 'PPG', column: 'I', validator: 'decimal' },
      { key: 'basketball.asst', label: 'ASST', column: 'J', validator: 'decimal' },
      { key: 'basketball.reb', label: 'REB', column: 'K', validator: 'decimal' },
      { key: 'basketball.stl', label: 'STL', column: 'L', validator: 'decimal' },
      { key: 'basketball.fgPct', label: 'FG%', column: 'M', validator: 'percentage' },
      { key: 'basketball.threePct', label: '3P%', column: 'N', validator: 'percentage' },
    ],
  };

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body = {};
    if (url.pathname === '/api/health') body = { data: { latestCycleArchive: 'cycle-404' } };
    else if (url.pathname === '/api/edition/latest') body = { header: { cycle: 404 }, articles: [] };
    else if (url.pathname === '/api/council') body = { council: [] };
    else if (url.pathname === '/api/neighborhoods') body = { neighborhoods: [] };
    else if (url.pathname === '/api/citizens') body = { citizens: [], total: 0 };
    else if (url.pathname === '/api/initiatives') body = { initiatives: [] };
    else if (url.pathname === '/api/editions') body = { editions: [] };
    else if (url.pathname === '/api/sports/overview') {
      const requestedCycle = Number(url.searchParams.get('cycle')) || 404;
      if (requestedCycle === 406) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            contractVersion: 1,
            source: { kind: 'projection', name: 'SYNTHETIC failure fixture', fetchedAt: null, cycle: null },
            data: null,
            warnings: [],
            error: { code: 'sports_source_unavailable', message: 'Synthetic sports source failure.', retryable: true },
          }),
        });
        return;
      }
      const cycleEvents = requestedCycle === 404 ? events : [];
      body = sportsEnvelope({
        cycle: requestedCycle,
        availableCycles: [404, 403],
        events: cycleEvents,
        teams: {
          as: team('as', cycleEvents.filter(event => event.teamId === 'as').length),
          oaks: team('oaks', cycleEvents.filter(event => event.teamId === 'oaks').length),
        },
      }, {
        kind: 'sheet',
        name: 'SYNTHETIC sports fixture',
        fetchedAt: '2042-01-01T00:00:00.000Z',
        cycle: requestedCycle,
        sheets: {
          Oakland_Sports_Feed: {
            fetchedAt: '2042-01-01T00:00:00.000Z',
            cacheAgeMs: requestedCycle === 403 ? 120000 : 0,
            cacheHit: requestedCycle === 403,
            stale: requestedCycle === 403,
          },
        },
      });
    } else if (url.pathname === '/api/sports/workspace') {
      const id = url.searchParams.get('team') === 'oaks' ? 'oaks' : 'as';
      const requestedCycle = Number(url.searchParams.get('cycle')) || 404;
      const cycleEvents = requestedCycle === 404 ? events.filter(event => event.teamId === id) : [];
      body = sportsEnvelope({
        cycle: requestedCycle,
        availableCycles: [404, 403],
        team: { ...team(id, cycleEvents.length), events: cycleEvents, roster: roster[id] },
        validEventOptions: options,
        validMutationOptions: {
          verificationSources: ['manual-verified', 'screenshot-verified'],
          rosterActions: ['injury', 'return', 'call-up', 'trade-away'],
          statFields: statFields[id],
        },
        writePolicy: {
          featureEnabled: true,
          configured: true,
          mode: 'remote-browser',
          requiresHttps: true,
          reasonCode: null,
        },
      });
    } else if (url.pathname === '/api/sports/notebook') {
      body = sportsEnvelope({
        items: [{
          cycle: 404,
          generatedAt: '2042-01-01T00:00:00.000Z',
          answer: 'SYNTHETIC NON-CANON listening brief for visual QA.',
          citationCount: 3,
          canonStatus: 'NOT_CANON',
        }],
      }, {
        kind: 'local-artifact',
        name: 'SYNTHETIC Notebook fixture',
        fetchedAt: '2042-01-01T00:00:00.000Z',
        cycle: 404,
      });
    } else if (url.pathname === '/api/sports/preview') {
      const submission = request.postDataJSON();
      const mutation = submission && submission.mutation;
      lastMutationAction = mutation ? mutation.action : null;
      const rowByHeader = {
        Cycle: '404',
        EventType: mutation
          ? mutation.action === 'stat-capture' ? 'stat-capture' : 'roster-move'
          : 'game-result',
        TeamsUsed: "A's",
        Notes: 'SYNTHETIC NON-CANON preview.',
      };
      let mutationPreview = null;
      let ripplePreview = {
        currentConsumers: [{ id: 'phase02-team-state', label: 'City and team state', status: 'will-read' }],
        mutationEffects: [],
        unavailableSiblings: [{ id: 'season-close', label: 'TrueSource season close', status: 'deferred-until-truesource-update' }],
      };
      if (mutation && mutation.action === 'stat-capture') {
        mutationPreview = {
          participant: submission.participant,
          citizenTier: '1',
          rosterTier: '1',
          citizenStatus: 'Active',
          kind: 'stat-line',
          action: 'stat-capture',
          verification: mutation.verification,
          statDiff: {
            fields: mutation.changes.map((change) => ({
              ...change,
              label: change.field === 'batting.hr' ? 'HR' : change.field,
              column: change.field === 'batting.hr' ? 'L' : '?',
              status: change.before === change.after ? 'unchanged' : 'changed',
            })),
            changedCount: mutation.changes.filter((change) => change.before !== change.after).length,
            unchangedCount: mutation.changes.filter((change) => change.before === change.after).length,
            blankSourceCount: 0,
            invalidCount: 0,
          },
        };
        ripplePreview.mutationEffects = [{
          id: 'engine.40',
          label: 'Roster current-stat update',
          status: 'signed-confirmation-ready',
        }];
      } else if (mutation && mutation.action === 'injury') {
        const line = 'C404 — [SportsRoster] Synthetic Batter entered injured status with cause: Synthetic verified condition.';
        mutationPreview = {
          participant: {
            ...submission.participant,
            citizenSourceRow: 22,
            citizenTier: '1',
            rosterTier: '1',
          },
          kind: 'roster-event',
          action: 'injury',
          verification: mutation.verification,
          statDiff: null,
          stateDiff: {
            changedCount: 3,
            fields: [
              { field: 'citizen.status', surface: 'citizen', label: 'Citizen Status', before: 'Active', after: 'injured', changed: true },
              { field: 'citizen.statusStartCycle', surface: 'citizen', label: 'Status Start Cycle', before: '', after: '404', changed: true },
              { field: 'citizen.healthCause', surface: 'citizen', label: 'Health Cause', before: '', after: 'Synthetic verified condition', changed: true },
            ],
          },
          lifeHistory: {
            line,
            eventTag: 'SportsRoster|source:sports|submission:synthetic-visual|action:injury',
            eventText: 'entered injured status with cause: Synthetic verified condition.',
          },
          ripple: { effectType: 'roster-injury' },
          tradeWarning: null,
        };
        ripplePreview.mutationEffects = [
          { id: 'engine.77-state', label: 'Roster and citizen state', status: 'signed-confirmation-ready' },
          { id: 'engine.77-life', label: 'LifeHistory and LifeHistory_Log', status: 'signed-confirmation-ready' },
          { id: 'engine.77-ripple', label: 'Citizen Ripple attribution', status: 'signed-confirmation-ready' },
        ];
      }
      body = sportsEnvelope({
        writePerformed: false,
        row: new Array(20).fill(''),
        rowByHeader,
        resolvedNames: [],
        ripplePreview,
        mutationPreview,
        team: { id: 'as', label: "The A's" },
        confirmation: {
          available: true,
          featureEnabled: true,
          configured: true,
          mode: 'remote-browser',
          requiresHttps: true,
          reasonCode: null,
          confirmationPhrase: 'APPEND_TO_OAKLAND_SPORTS_FEED',
          expiresAt: '2042-01-01T00:15:00.000Z',
          previewToken: 'synthetic-preview-token',
          csrfToken: 'synthetic-csrf-token',
        },
      });
    } else if (url.pathname === '/api/sports/entries') {
      body = sportsEnvelope({
        writePerformed: true,
        replayed: false,
        updatedRange: 'Oakland_Sports_Feed!A55:T55',
        rowNumber: 55,
        cycle: 404,
        team: "A's",
        eventType: 'game-result',
        mutationAction: lastMutationAction,
        updatedRanges: lastMutationAction
          ? ['Oakland_Sports_Feed!A55:T55', 'Simulation_Ledger!L22:L22']
          : ['Oakland_Sports_Feed!A55:T55'],
        requestHash: 'synthetic-request-hash',
        idempotencyKey: 'synthetic-idempotency-key',
        writtenAt: '2042-01-01T00:00:00.000Z',
      });
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
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
    if (SPORTS_FIXTURE) await installSportsFixture(page);

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
    if (SPORTS_FIXTURE) {
      await page.locator('nav').getByRole('button', { name: 'Sports' }).click();
      await page.getByRole('heading', { name: 'Oakland Sports Desk' }).waitFor();
    }

    // -----------------------------------------------------------------------
    // 2. Screenshots at each viewport
    // -----------------------------------------------------------------------
    if (!SKIP_SCREENSHOTS) {
      console.log('');
      console.log('2. Screenshots');
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(500);
        const filename = `${SPORTS_FIXTURE ? 'sports' : 'dashboard'}_${vp.name}_${vp.width}x${vp.height}.png`;
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

    const endpoints = SPORTS_FIXTURE ? [
      '/api/sports/overview?cycle=404',
      '/api/sports/workspace?cycle=404&team=as',
      '/api/sports/notebook?limit=3',
    ] : [
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
        const status = SPORTS_FIXTURE
          ? await page.evaluate(async (endpoint) => (await fetch(endpoint)).status, ep)
          : (await page.request.get(`${BASE_URL}${ep}`, { headers, timeout: 5000 })).status();
        if (status === 200) pass(`API ${ep}`, '200 OK');
        else fail(`API ${ep}`, `HTTP ${status}`);
      } catch (err) {
        fail(`API ${ep}`, err.message);
      }
    }

    // -----------------------------------------------------------------------
    // 5. Search interaction test
    // -----------------------------------------------------------------------
    console.log('');
    console.log('5. Interaction Tests');

    const textInput = SPORTS_FIXTURE ? null : await page.$('input[type="text"], input[type="search"]');
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
      pass('Search interaction', SPORTS_FIXTURE ? 'Skipped in sports fixture mode' : 'Skipped — search uses icon/modal pattern');
    }

    if (SPORTS_FIXTURE) {
      console.log('');
      console.log('6. Sports Workspace Checks');
      const bodyText = await page.locator('body').innerText();
      if (bodyText.includes("The A's") && bodyText.includes('The Oaks')) pass('Both Oakland teams render', "The A's and The Oaks");
      else fail('Both Oakland teams render', 'One or both team labels are missing');
      if (!bodyText.includes('[object Object]')) pass('Structured stats render deliberately', 'No [object Object] output');
      else fail('Structured stats render deliberately', '[object Object] found');
      if (bodyText.includes('POP-90001')) pass('Roster identity is readable', 'Synthetic POPID visible');
      else fail('Roster identity is readable', 'Synthetic roster POPID missing');
      if (!/\bChicago\b|\bWarriors\b|\bNBA\b/.test(bodyText)) pass('Oakland surface excludes legacy/cross-city labels', '');
      else fail('Oakland surface excludes legacy/cross-city labels', 'Chicago, Warriors, or NBA label found');

      await page.getByRole('button', { name: 'The Oaks', exact: true }).click();
      await page.getByText('POP-90002', { exact: true }).first().waitFor();
      await page.getByRole('button', { name: "The A's", exact: true }).click();
      await page.getByText('POP-90001', { exact: true }).first().waitFor();
      pass('Both live roster views switch cleanly', 'A’s and Oaks POPIDs render');

      await page.getByLabel('Season').selectOption('regular-season');
      await page.getByLabel('Team record').fill('12-7');
      await page.getByRole('button', { name: 'Preview event and ripple' }).click();
      await page.getByRole('heading', { name: 'Ripple Preview' }).waitFor();
      if (await page.getByText('NO WRITE', { exact: true }).isVisible()) {
        pass('Preview interaction stays read-only', 'Ripple preview rendered with NO WRITE');
      } else {
        fail('Preview interaction stays read-only', 'Ripple preview boundary label missing');
      }
      await page.getByRole('heading', { name: 'Append this event?' }).waitFor();
      pass('Secure confirmation is a separate step', 'Preview and write controls remain distinct');
      if (!SKIP_SCREENSHOTS) {
        await page.screenshot({
          path: path.join(OUTPUT_DIR, 'sports_wave_c_confirmation.png'),
          fullPage: true,
        });
        await page.setViewportSize({ width: 375, height: 812 });
        await page.screenshot({
          path: path.join(OUTPUT_DIR, 'sports_wave_c_confirmation_mobile.png'),
          fullPage: true,
        });
        await page.setViewportSize({ width: 1440, height: 900 });
      }
      await page.getByLabel('Sports write key').fill('synthetic-write-key');
      await page.getByLabel(/I reviewed the exact row/).check();
      await page.getByRole('button', { name: 'Append one verified row' }).click();
      await page.getByRole('heading', { name: 'Event added to the Oakland feed' }).waitFor();
      pass('Verified append receipt renders', 'Exact range and row receipt returned');
      if (!SKIP_SCREENSHOTS) {
        await page.screenshot({
          path: path.join(OUTPUT_DIR, 'sports_wave_c_receipt.png'),
          fullPage: true,
        });
      }

      await page.getByRole('button', { name: 'Enter another event' }).click();
      await page.getByRole('button', { name: /^Current stats/ }).click();
      await page.locator(
        '#sports-intake select:has(option[value="POP-90001"])'
      ).selectOption('POP-90001');
      await page.locator('[id="sports-stat-batting.hr"]').fill('6');
      await page.getByLabel('I checked this exact before/after value.').check();
      await page.getByLabel('Reviewed stat summary').fill(
        'Synthetic reviewed current-season stat line'
      );
      await page.getByRole('button', { name: 'Preview stat changes' }).click();
      await page.getByRole('heading', { name: 'Exact roster stat diff' }).waitFor();
      await page.getByRole(
        'heading',
        { name: 'Append the event and update this stat line?' }
      ).waitFor();
      pass('Stat mutation review renders', 'Exact field diff and separate confirmation visible');

      await page.getByRole('button', { name: /^Injury/ }).click();
      await page.locator(
        '#sports-intake select:has(option[value="POP-90001"])'
      ).selectOption('POP-90001');
      await page.getByLabel('Verified health cause').fill(
        'Synthetic verified condition'
      );
      await page.getByLabel(
        /I checked the exact source state and every proposed transition/
      ).check();
      await page.getByRole(
        'button',
        { name: 'Preview state, life, and Ripple' }
      ).click();
      await page.getByRole(
        'heading',
        { name: 'Exact roster and citizen diff' }
      ).waitFor();
      await page.getByText(
        'C404 — [SportsRoster] Synthetic Batter entered injured status with cause: Synthetic verified condition.',
        { exact: true }
      ).first().waitFor();
      await page.getByRole(
        'heading',
        { name: 'Apply this roster, state, life, and Ripple event?' }
      ).waitFor();
      pass(
        'Engine.77 mutation review renders',
        'State diff, deterministic LifeHistory, Ripple, and confirmation visible'
      );
      if (!SKIP_SCREENSHOTS) {
        await page.screenshot({
          path: path.join(OUTPUT_DIR, 'sports_engine77_confirmation.png'),
          fullPage: true,
        });
        await page.setViewportSize({ width: 375, height: 812 });
        await page.screenshot({
          path: path.join(OUTPUT_DIR, 'sports_engine77_confirmation_mobile.png'),
          fullPage: true,
        });
        await page.setViewportSize({ width: 1440, height: 900 });
      }

      const cycleControl = page.getByLabel('Sports Cycle');
      await cycleControl.fill('405');
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByText('No Oakland sports events in this Cycle.').waitFor();
      pass('Exact-Cycle empty state', 'C405 does not substitute C404 events');

      await cycleControl.fill('403');
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByText('stale cache').waitFor();
      pass('Stale source state', 'Stale cache is visible');

      await cycleControl.fill('406');
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Synthetic sports source failure.' }).waitFor();
      pass('Retryable error state', 'Failure is visible without replacing prior data');

      await cycleControl.fill('404');
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('heading', { name: 'Events in C404' }).waitFor();

      await page.setViewportSize({ width: 375, height: 812 });
      await page.locator('#sports-intake').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const navBox = await page.locator('nav').boundingBox();
      const intakeBox = await page.locator('#sports-intake').boundingBox();
      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      if (horizontalOverflow <= 1) {
        pass('Mobile horizontal fit', 'No page-level horizontal overflow');
      } else {
        fail(
          'Mobile horizontal fit',
          `${horizontalOverflow}px page-level horizontal overflow`
        );
      }
      if (navBox && intakeBox && intakeBox.y + intakeBox.height <= navBox.y) {
        pass('Mobile bottom-nav clearance', `${Math.round(navBox.y - (intakeBox.y + intakeBox.height))}px clearance`);
      } else {
        fail('Mobile bottom-nav clearance', 'Entry workspace is obscured by the fixed nav');
      }
    }

    // -----------------------------------------------------------------------
    // 6. Accessibility Audit (Axe)
    // -----------------------------------------------------------------------
    console.log('');
    console.log(`${SPORTS_FIXTURE ? '7' : '6'}. Accessibility Audit`);

    // Navigate back to clean state for audit
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    if (SPORTS_FIXTURE) {
      await page.locator('nav').getByRole('button', { name: 'Sports' }).click();
      await page.getByRole('heading', { name: 'Oakland Sports Desk' }).waitFor();
    }

    try {
      const axe = new AxeBuilder({ page });
      if (SPORTS_FIXTURE) axe.include('main');
      const axeResults = await axe.analyze();
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
          serious.forEach(v => {
            console.log(`    - ${v.id}: ${v.description} (${v.nodes.length} elements)`);
            v.nodes.slice(0, 8).forEach(node => console.log(`      ${node.target.join(' ')}`));
          });
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
              nodes: v.nodes.map(node => ({
                target: node.target,
                html: node.html,
                failureSummary: node.failureSummary,
              })),
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
