/**
 * buildWorldSummary.test.js — S231 pipeline.25 deterministic writer coverage.
 *
 * Pairs with scripts/buildWorldSummary.js. Pure-helper tests run always
 * (no sheet access required). Integration test that hits live sheets is
 * gated on CANON_PRESENT — same pattern as validateEdition.contract.test.js
 * (S227 CI-fix precedent, commit cb76615) so this file passes in CI without
 * service-account credentials.
 *
 * Run: node scripts/buildWorldSummary.test.js
 * Exits 0 on pass, 1 on failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const helper = require('./buildWorldSummary');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function assertEqual(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}: expected ${e}, got ${a}`); failed++; }
}

function assertIncludes(label, haystack, needle) {
  if (typeof haystack === 'string' && haystack.indexOf(needle) >= 0) {
    console.log(`  ok   ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}: needle "${needle}" not in haystack`);
    failed++;
  }
}

function assertExcludes(label, haystack, needle) {
  if (typeof haystack === 'string' && haystack.indexOf(needle) < 0) {
    console.log(`  ok   ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}: forbidden needle "${needle}" found`);
    failed++;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Test 1: module exports
// ────────────────────────────────────────────────────────────────────────────
console.log('Test 1: module exports + version');
{
  assert('buildWorldSummary is function', typeof helper.buildWorldSummary === 'function');
  assert('SCRIPT_VERSION is string', typeof helper.SCRIPT_VERSION === 'string');
  for (const fn of [
    'round2', 'fmtSentiment', 'fmtNum', 'parseJsonField',
    'formatWeatherLine', 'sortNeighborhoods', 'filterApprovalRows',
    'classifyDelta',
    'emitHeader', 'emitCityState', 'emitCivicDecisions',
    'emitSports', 'emitEveningTexture', 'emitWorldEvents',
    'emitThreeCycleTrends', 'emitEngineReviewFindings',
    'emitApprovalRatings', 'emitFooter'
  ]) {
    assert(`export ${fn} is function`, typeof helper[fn] === 'function');
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Test 2: round2 + fmtSentiment + fmtNum
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 2: numeric formatters');
{
  assertEqual('round2(11.156)', helper.round2(11.156), 11.16);
  assertEqual('round2(-0.024)', helper.round2(-0.024), -0.02);
  assertEqual('round2("0.06")', helper.round2('0.06'), 0.06);
  assertEqual('round2(NaN) → null', helper.round2(NaN), null);
  assertEqual('round2(undefined) → null', helper.round2(undefined), null);

  assertEqual('fmtSentiment(0.03) → "+0.03"', helper.fmtSentiment(0.03), '+0.03');
  assertEqual('fmtSentiment(-0.02) → "-0.02"', helper.fmtSentiment(-0.02), '-0.02');
  assertEqual('fmtSentiment(0) → "0"', helper.fmtSentiment(0), '0');
  assertEqual('fmtSentiment("") → "—"', helper.fmtSentiment(''), '—');

  assertEqual('fmtNum(1.0, 2) → "1.00"', helper.fmtNum(1.0, 2), '1.00');
  assertEqual('fmtNum(undefined) → "—"', helper.fmtNum(undefined), '—');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 3: parseJsonField
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 3: parseJsonField');
{
  assertEqual('parseJsonField valid', helper.parseJsonField('{"a":1}'), { a: 1 });
  assertEqual('parseJsonField empty → fallback', helper.parseJsonField('', []), []);
  assertEqual('parseJsonField null → fallback', helper.parseJsonField(null, {}), {});
  assertEqual('parseJsonField invalid → fallback', helper.parseJsonField('not json', { x: 1 }), { x: 1 });
}

// ────────────────────────────────────────────────────────────────────────────
// Test 4: formatWeatherLine
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 4: formatWeatherLine');
{
  const w = { temp: 64, type: 'cool', windDirection: 'NW', windSpeed: 9, frontState: 'OVERCAST', humidity: 64, visibility: 10 };
  const line = helper.formatWeatherLine(w);
  assertIncludes('weather line has temp+type', line, '64°F cool');
  assertIncludes('weather line has wind', line, 'NW 9 mph');
  assertIncludes('weather line has frontState', line, 'overcast (frontState OVERCAST)');
  assertEqual('null weather → fallback', helper.formatWeatherLine(null), '— (no weather data)');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 5: sortNeighborhoods
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 5: sortNeighborhoods (RetailVitality desc, name asc tiebreak)');
{
  const rows = [
    { Neighborhood: 'A', RetailVitality: 5 },
    { Neighborhood: 'B', RetailVitality: 10 },
    { Neighborhood: 'C', RetailVitality: 5 },
    { Neighborhood: 'D', RetailVitality: 'bogus' }
  ];
  const sorted = helper.sortNeighborhoods(rows);
  assertEqual('sorted order', sorted.map(r => r.Neighborhood), ['B', 'A', 'C', 'D']);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 6: filterApprovalRows
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 6: filterApprovalRows (active + Mayor/Council only, Mayor first)');
{
  const all = [
    { OfficeId: 'MAYOR-01', Status: 'active', Title: 'Mayor' },
    { OfficeId: 'COUNCIL-D5', Status: 'active', Title: 'Council D5' },
    { OfficeId: 'COUNCIL-D1', Status: 'active', Title: 'Council D1' },
    { OfficeId: 'COUNCIL-D6', Status: 'recovering', Title: 'Council D6' }, // G-BWS1: now included
    { OfficeId: 'STAFF-COS', Status: 'active', Title: 'Chief of Staff' },
    { OfficeId: 'COUNCIL-D2', Status: 'inactive', Title: 'Council D2' },
    { OfficeId: 'DA-01', Status: 'active', Title: 'DA' }
  ];
  const filtered = helper.filterApprovalRows(all);
  assertEqual('order: Mayor first then councils (incl. recovering D6)', filtered.map(r => r.OfficeId), ['MAYOR-01', 'COUNCIL-D1', 'COUNCIL-D5', 'COUNCIL-D6']);
  assertEqual('recovering D6 INCLUDED (G-BWS1)', filtered.find(r => r.OfficeId === 'COUNCIL-D6').Status, 'recovering');
  assertEqual('STAFF-COS filtered out', filtered.find(r => r.OfficeId === 'STAFF-COS'), undefined);
  assertEqual('DA-01 filtered out', filtered.find(r => r.OfficeId === 'DA-01'), undefined);
  assertEqual('inactive D2 still filtered out', filtered.find(r => r.OfficeId === 'COUNCIL-D2'), undefined);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 7: emitCivicDecisions — pointer not extraction
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 7: emitCivicDecisions (pointer behavior)');
{
  // Use a cycle whose file definitely doesn't exist
  const absentLines = helper.emitCivicDecisions(99999);
  const absent = absentLines.join('\n');
  assertIncludes('absent file → "No city-hall section"', absent, 'No city-hall section for this cycle yet');
  assertExcludes('absent file → no extracted decisions', absent, 'Mayor Santana');
  assertExcludes('absent file → no faction quotes', absent, 'Rivers');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 8: emitSports — verbatim StoryAngle, no LLM headers
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 8: emitSports (verbatim discipline)');
{
  const rows = [
    {
      Cycle: '94',
      TeamsUsed: "A's",
      SeasonType: 'early-season',
      EventType: 'game-result',
      NamesUsed: 'Eric Taveras',
      Notes: "A's lose to Baltimore",
      Stats: 'Taveras 5h/3hr',
      StoryAngle: 'As lose first season series to Baltimore, Vinnie Keane has 8 game hitting streak',
      'Team Record': '21-4',
      Streak: 'L1',
      PlayerMood: 'confident',
      FanSentiment: 'high',
      HomeNeighborhood: 'Temescal'
    }
  ];
  const out = helper.emitSports(rows, 94).join('\n');
  assertIncludes('section header drops verbatim claim, names source column', out, 'literal `Oakland_Sports_Feed.StoryAngle` column');
  assertExcludes('NO "Mike\'s entries verbatim" claim', out, "Mike's entries verbatim");
  assertIncludes('StoryAngle present verbatim — Baltimore', out, 'lose first season series to Baltimore');
  assertIncludes('StoryAngle present verbatim — Keane streak', out, '8 game hitting streak');
  assertIncludes('Record line present', out, 'Record 21-4');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 9: emitWorldEvents — severity grouping + impact rendering
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 9: emitWorldEvents');
{
  const riley = {
    Cycle: '94',
    WorldEvents: JSON.stringify([
      { domain: 'CIVIC', subdomain: 'Inflow Strain', neighborhood: 'KONO', severity: 'high', impactScore: 50, description: 'CIVIC — Inflow Strain' },
      { domain: 'FAITH', subtype: 'crisis_response', neighborhood: 'Adams Point', severity: 'medium', description: 'Adams Point UMC opens doors' },
      { domain: 'SAFETY', subdomain: 'texture', severity: 'low', description: 'noise complaint' }
    ])
  };
  const out = helper.emitWorldEvents(riley).join('\n');
  assertIncludes('high section header', out, '**High-severity:**');
  assertIncludes('medium section header', out, '**Medium-severity:**');
  assertIncludes('low section header', out, '**Low-severity:**');
  assertIncludes('high event with impact', out, 'KONO');
  assertIncludes('impactScore rendered', out, 'impactScore 50');
  assertIncludes('safety w/o neighborhood handled', out, '(no neighborhood)');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 10: emitEngineReviewFindings — no editorial gloss leak
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 10: emitEngineReviewFindings');
{
  const audit = {
    summary: { highSeverity: 1, mediumSeverity: 2, lowSeverity: 0, improvements: 0, incoherence: 1, byType: { 'stuck-initiative': 1, 'repeating-event': 2, 'incoherence': 1 } },
    patterns: [
      {
        type: 'stuck-initiative',
        severity: 'high',
        cyclesInState: 16,
        affectedEntities: { initiatives: ['INIT-001'], neighborhoods: ['West Oakland'] },
        evidence: { sheet: 'Initiative_Tracker', rows: [2] },
        description: 'Initiative "West Oakland Stabilization Fund" in phase "disbursement-active" for 16 cycles',
        mitigatorState: {
          mitigators: [{
            initiativeId: 'INIT-001',
            implementationPhase: 'disbursement-active',
            cyclesInPhase: 16,
            effectsFiring: false,
            effectEvidence: { expectedField: 'Neighborhood_Map.RetailVitality', observedDelta: 0, verdict: 'effects-not-firing' }
          }]
        }
      },
      { type: 'repeating-event', severity: 'medium' },
      { type: 'repeating-event', severity: 'medium' }
    ]
  };
  const out = helper.emitEngineReviewFindings(94, audit).join('\n');
  // G-BWS5 — "Total patterns" (renamed from "Ailment total") + By-type split into
  // the severity trichotomy so the counts reconcile.
  assertIncludes('total patterns line', out, '**Total patterns:** 3 (1 high, 2 medium, 0 low)');
  assertIncludes('ailments subtotal', out, '**Ailments (3):**');
  assertIncludes('incoherence subtotal', out, '**Incoherence (1):**');
  assertExcludes('no ambiguous "Ailment total" wording', out, 'Ailment total');
  assertIncludes('high-pattern description verbatim', out, 'disbursement-active');
  assertIncludes('mitigator line verbatim', out, 'observedDelta=0 verdict=effects-not-firing');
  assertIncludes('medium table summary', out, '| repeating-event | 2 |');
  // The script should NOT introduce editorial gloss like the prior model output did
  assertExcludes('NO "Editorial pivot" gloss', out, 'Editorial pivot');
  assertExcludes('NO "buried IMPROVEMENT story" gloss', out, 'buried IMPROVEMENT');
  assertExcludes('NO "Move pilot" recommendation', out, 'Move pilot');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 11: emitApprovalRatings
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 11: emitApprovalRatings');
{
  const rows = [
    { OfficeId: 'MAYOR-01', Title: 'Mayor', District: 'citywide', Holder: 'Avery Santana', Faction: 'OPP', Status: 'active', Approval: '88' },
    { OfficeId: 'COUNCIL-D1', Title: 'City Council District 1', District: 'D1', Holder: 'Denise Carter', Faction: 'OPP', Status: 'active', Approval: '76' },
    { OfficeId: 'COUNCIL-D6', Title: 'City Council District 6', District: 'D6', Holder: 'Elliott Crane', Faction: 'CRC', Status: 'recovering', Approval: '54' },
    { OfficeId: 'COUNCIL-D7', Title: 'City Council District 7', District: 'D7', Holder: 'Warren Ashford', Faction: 'CRC', Status: 'active', Approval: '61' }
  ];
  const out = helper.emitApprovalRatings(rows).join('\n');
  // G-BWS1 — Status column added; recovering seats visible-but-flagged.
  assertIncludes('Mayor row (with Status col)', out, '| Mayor | Avery Santana | OPP | active | 88 |');
  assertIncludes('D1 with district tag', out, 'District 1 (D1)');
  assertIncludes('D6 recovering seat rendered + flagged', out, '| Elliott Crane | CRC | **recovering** | 54 |');
  assertIncludes('faction split counts recovering (2 OPP / 2 CRC)', out, '2 OPP / 2 CRC');
  assertIncludes('recovering-seats footer names Crane', out, 'COUNCIL-D6 Elliott Crane (CRC)');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 12: integration — full build against live sheets (CANON_PRESENT skip)
// ────────────────────────────────────────────────────────────────────────────
const auditPath = path.join(__dirname, '..', 'output', 'engine_audit_c94.json');
const CANON_PRESENT = fs.existsSync(auditPath)
  && (process.env.GOOGLE_APPLICATION_CREDENTIALS
      || fs.existsSync('/root/.config/godworld/.env'));

console.log('\nTest 12: integration build (CANON_PRESENT=' + Boolean(CANON_PRESENT) + ')');
if (!CANON_PRESENT) {
  console.log('  SKIP — engine_audit_c94.json or service-account creds missing (CI path)');
} else {
  (async () => {
    try {
      require('/root/GodWorld/lib/env');
      const body = await helper.buildWorldSummary(94);

      // Anti-fabrication assertions — these are the gap-log items pipeline.25 closes
      assertIncludes('Baltimore present (not Padres)', body, 'Baltimore');
      assertExcludes('Padres absent (G-S7 fabrication eliminated)', body, 'Padres');
      assertIncludes('JR Rosada present', body, 'JR Rosada');
      assertExcludes('JR Rojas absent (G-S7 fabrication eliminated)', body, 'JR Rojas');
      assertIncludes('Vinnie Keane 8-game streak', body, '8 game hitting streak');
      assertIncludes('Isley Kelley catches fire', body, 'Isley Kelley catches fire');
      assertIncludes('Varek courting Paulson (correct framing)', body, 'making that phone call');
      assertExcludes('NO Paulson "second Oaks year" fabrication', body, 'second Oaks year');
      assertExcludes('NO "(Mike\'s entries verbatim)" claim', body, "Mike's entries verbatim");
      assertExcludes('NO career-stat injection (Kelley HR fabricated S221)', body, '468 HR');
      assertIncludes('script attribution footer', body, 'Generated by `scripts/buildWorldSummary.js`');
      assertIncludes('no-LLM claim in footer', body, 'No LLM in the writer loop');

      report();
    } catch (err) {
      console.error('  FAIL integration build:', err.message);
      failed++;
      report();
    }
  })();
  return;
}

function report() {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
report();
