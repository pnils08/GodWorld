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
    'emitHeader', 'emitSnapshotLine', 'emitCityState', 'emitCivicDecisions',
    'emitSports', 'emitEveningTexture', 'emitWorldEvents', 'emitChaosCars',
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
// Test 2b: emitSnapshotLine (S313 — wd-snapshot one-liner)
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 2b: emitSnapshotLine');
{
  const rileyCurr = {
    CitySentiment: 0.8, CycleWeight: 'high-signal', PatternFlag: 'stability-streak',
    ShockFlag: 'shock-flag', CivicLoad: 'minor-variance'
  };
  const worldPop = { totalPopulation: 385162, illnessRate: '0.096', employmentRate: '0.898' };

  const line = helper.emitSnapshotLine(100, rileyCurr, worldPop, { inCare: 3, loadPct: 8 });
  assert('snapshot is single line', typeof line === 'string' && !line.includes('\n'));
  assert('snapshot has stable prefix', line.startsWith('Snapshot: Cycle 100 | '));
  assertIncludes('snapshot pop', line, 'Pop 385,162');
  assertIncludes('snapshot illness', line, 'Illness 9.6%');
  assertIncludes('snapshot employment', line, 'Employment 89.8%');
  assertIncludes('snapshot sentiment', line, 'Sentiment +0.8');
  assertIncludes('snapshot weight', line, 'Weight high-signal');
  assertIncludes('snapshot pattern', line, 'Pattern stability-streak');
  assertIncludes('snapshot shock', line, 'Shock shock-flag');
  assertIncludes('snapshot load', line, 'Load minor-variance');
  assertIncludes('snapshot hospital', line, 'Hospital 3 in care (8% load)');

  const noHosp = helper.emitSnapshotLine(101, rileyCurr, worldPop, null);
  assertExcludes('no hospital segment when census null', noHosp, 'Hospital');

  const sparse = helper.emitSnapshotLine(102, {}, {}, null);
  assertIncludes('sparse riley fields em-dash', sparse, 'Weight —');
  assert('sparse still single line', !sparse.includes('\n'));
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
// Test 9b: emitChaosCars — engine.11 T5.2, verified against the T6.1 dry-run's
// synthetic Tier-1 fixture (output/chaos_cars_tier1_fixture.json, seed 90084)
// so this test exercises a real chaos row, not a hand-built stub.
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 9b: emitChaosCars');
{
  assertIncludes('empty cycle placeholder', helper.emitChaosCars([], 999).join('\n'),
    '(no chaos-car events recorded for this cycle)');

  const fixturePath = path.join(__dirname, '..', 'output', 'chaos_cars_tier1_fixture.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const out = helper.emitChaosCars(fixture.allEventsThisCycle, fixture.cycleId).join('\n');

  const t1 = fixture.tier1Event;
  assertIncludes('header carries cycle + count', out, `cycle ${fixture.cycleId} — ${fixture.allEventsThisCycle.length} total`);
  assertIncludes('Tier-1 row: vehicle', out, t1.VehicleType);
  assertIncludes('Tier-1 row: dice outcome', out, t1.DiceOutcome);
  assertIncludes('Tier-1 row: named target (POPID)', out, t1.TargetId);
  assertIncludes('Tier-1 row: tier suffix', out, `(T${t1.TargetTier})`);
  assertIncludes('Tier-1 row: floor-fired TRUE', out, '| TRUE |');
  assertIncludes('narrative seeds section present', out, '**Narrative seeds:**');
  assertIncludes('Tier-1 narrative seed rendered', out, t1.ChaosNarrativeSeed);
  const otherSeeded = fixture.allEventsThisCycle.find((r) => r.EventId !== t1.EventId && (r.ChaosNarrativeSeed || '').trim());
  const unseeded = fixture.allEventsThisCycle.find((r) => !(r.ChaosNarrativeSeed || '').trim());
  assert('sibling seeded row rendered', !otherSeeded || out.includes(otherSeeded.ChaosNarrativeSeed));
  assert('rows without a narrative seed are excluded from the seeds list',
    !unseeded || !out.includes(`${unseeded.VehicleType} → ${unseeded.TargetId}:`));
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
// Test 11b: signalLabel + extractPopids (W5 desk-signal pure helpers)
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 11b: signalLabel + extractPopids');
{
  for (const fn of ['signalLabel', 'extractPopids', 'rippleEntry', 'emitDeskSignal']) {
    assert(`export ${fn} is function`, typeof helper[fn] === 'function');
  }
  assert('export RIPPLE_LANE_MAP is object', typeof helper.RIPPLE_LANE_MAP === 'object');
  assert('export DESK_SIGNAL_VERSION is string', typeof helper.DESK_SIGNAL_VERSION === 'string');

  assertEqual('joins with pipe', helper.signalLabel('a', 'b'), 'a | b');
  assertEqual('collapses whitespace', helper.signalLabel('foo   bar\n baz'), 'foo bar baz');
  assertEqual('drops null/undefined/empty/blank', helper.signalLabel(null, 'x', undefined, '', '  '), 'x');
  assertEqual('all-empty → empty string', helper.signalLabel(null, '', undefined), '');
  assertEqual('trims each bit', helper.signalLabel('  a  ', ' b '), 'a | b');

  assertEqual('popids sorted from string', helper.extractPopids('POP-00123 hi POP-00045'), ['POP-00045', 'POP-00123']);
  assertEqual('popids deduped', helper.extractPopids('POP-00001 and POP-00001'), ['POP-00001']);
  assertEqual('popids from array source', helper.extractPopids(['POP-00002', 'x POP-00001']), ['POP-00001', 'POP-00002']);
  assertEqual('popids across multiple sources', helper.extractPopids('POP-00010', ['POP-00002']), ['POP-00002', 'POP-00010']);
  assertEqual('no match → empty', helper.extractPopids('nothing here', null, undefined), []);
  assertEqual('short id not matched (needs 5 digits)', helper.extractPopids('POP-123'), []);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 11b2: engine.125 — sports labels from resolved names only
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 11b2: resolveFeedNames (engine.125)');
{
  assert('export resolveFeedNames is function', typeof helper.resolveFeedNames === 'function');
  const empty = helper.resolveFeedNames('', [], 'test');
  assertEqual('empty NamesUsed → empty popids', empty.popids, []);
  assertEqual('empty NamesUsed → empty names', empty.names, []);

  const notes = [];
  const mixed = helper.resolveFeedNames('Vinnie Keane, Zzzzz Qqqqq', notes, 'A\'s C104');
  assert('resolved Vinnie has POP-00001', mixed.popids.indexOf('POP-00001') !== -1);
  assert('resolved names include Vinnie Keane', mixed.names.indexOf('Vinnie Keane') !== -1);
  assert('unresolved Zzzzz Qqqqq is not in names', mixed.names.indexOf('Zzzzz Qqqqq') === -1);
  assert('unresolved name is noted, not labeled', notes.some(n => /Zzzzz Qqqqq/.test(n) && /does NOT resolve/.test(n)));
  const label = helper.signalLabel('A\'s', 'game', mixed.names.length ? mixed.names.join(', ') : null);
  assert('label carries resolved name', /Vinnie Keane/.test(label));
  assert('label omits unresolved name', !/Zzzzz Qqqqq/.test(label));
}

// ────────────────────────────────────────────────────────────────────────────
// Test 11c: rippleEntry + RIPPLE_LANE_MAP routing table
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 11c: rippleEntry + RIPPLE_LANE_MAP');
{
  const row = {
    Cycle: '102',
    CauseType: 'sports',
    EffectType: 'MoodShift',
    CauseDetail: 'Game win lifts POP-00001',
    Neighborhood: ' Temescal ',
    TargetIds: 'POP-00010;POP-00002'
  };
  const e = helper.rippleEntry(row, 102);
  assertEqual('kind is ripple', e.kind, 'ripple');
  assertEqual('causeType preserved', e.causeType, 'sports');
  assertIncludes('ref points at Ripple_Ledger cycle', e.ref, 'Ripple_Ledger cycle 102');
  assertIncludes('ref points at rendered What Moved section', e.ref, '"### sports"');
  assertEqual('label = EffectType | CauseDetail verbatim', e.label, 'MoodShift | Game win lifts POP-00001');
  assertEqual('hood trimmed', e.hood, 'Temescal');
  assertEqual('popids from TargetIds + CauseDetail, sorted unique', e.popids, ['POP-00001', 'POP-00002', 'POP-00010']);
  assertEqual('missing CauseType → untyped', helper.rippleEntry({}, 5).causeType, 'untyped');
  assertEqual('no popids field when none found', helper.rippleEntry({ CauseType: 'migration' }, 5).popids, undefined);

  const expected = {
    'initiative-implementation': 'civic',
    'approval-shift': 'civic',
    'sports': 'sports',
    'faith-event': 'culture',
    'fame-event': 'culture',
    'lifestyle-sighting': 'culture',
    'trajectory': 'business',
    'migration': 'business',
    'edition-coverage': 'business'
  };
  assertEqual('RIPPLE_LANE_MAP has exactly the 9 live cause types', Object.keys(helper.RIPPLE_LANE_MAP).sort(), Object.keys(expected).sort());
  for (const [k, lane] of Object.entries(expected)) {
    assertEqual(`route ${k} → ${lane}`, helper.RIPPLE_LANE_MAP[k], lane);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Test 11d: emitDeskSignal — synthetic full-signal build
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 11d: emitDeskSignal (synthetic data)');
{
  const data = {
    auditJson: {
      patterns: [{
        type: 'stuck-initiative',
        severity: 'high',
        description: 'Initiative stuck in disbursement phase',
        affectedEntities: { citizens: ['POP-00042'], neighborhoods: ['West Oakland'] },
        evidence: { sheet: 'Initiative_Tracker', rows: [2] }
      }],
      snapshots: {
        Initiative_Tracker: [
          {
            InitiativeID: 'INIT-001', Name: 'Test Fund', Status: 'passed',
            ImplementationPhase: 'rollout', AffectedNeighborhoods: 'West Oakland',
            NextScheduledAction: 'milestone review',
            NextActionCycle: '105', VoteCycle: '', OverrideVoteCycle: ''
          },
          {
            InitiativeID: 'INIT-002', Name: 'Old Measure', Status: 'implemented',
            NextActionCycle: '90', VoteCycle: '85', OverrideVoteCycle: ''
          }
        ]
      }
    },
    rippleAll: [
      { Cycle: '100', CauseType: 'initiative-implementation', EffectType: 'CivicShift', CauseDetail: 'fund disbursed' },
      { Cycle: '100', CauseType: 'sports', EffectType: 'MoodShift', CauseDetail: 'big win' },
      { Cycle: '100', CauseType: 'faith-event', EffectType: 'Gathering', CauseDetail: 'vigil held' },
      { Cycle: '100', CauseType: 'weather-drift', EffectType: 'FootTraffic', CauseDetail: 'UNMAPPED-MARKER row' },
      { Cycle: '99', CauseType: 'sports', EffectType: 'PriorCycle', CauseDetail: 'PRIOR-CYCLE-MARKER excluded' }
    ],
    sportsAll: [
      {
        Cycle: '100', TeamsUsed: "A's", EventType: 'game-result', SeasonType: 'mid-season',
        NamesUsed: 'Vinnie Keane',
        StoryAngle: 'SECRET-ANGLE-TEXT that must never leak into the signal',
        Stats: 'SECRET-STATS 3h/1hr'
      },
      { Cycle: '99', TeamsUsed: 'Bulls', EventType: 'PRIOR-SPORTS-MARKER' }
    ],
    neighborhoodsC: [],
    rileyCurr: { WorldEvents: JSON.stringify([{ domain: 'CIVIC', neighborhood: 'KONO', severity: 'high' }]) }
  };

  const sig = helper.emitDeskSignal(100, data);
  const flat = JSON.stringify(sig);

  // Lane counts: civic = anomaly + 2 initiatives + 1 vote + civic-log + 1 ripple = 6;
  // sports = 1 feed + 1 ripple = 2; culture = 1 hood + 4 fixed pointers + 1 ripple = 6;
  // business = 1 unmapped ripple.
  assertEqual('civic lane count', sig.lanes.civic.length, 6);
  assertEqual('sports lane count', sig.lanes.sports.length, 2);
  assertEqual('culture lane count', sig.lanes.culture.length, 6);
  assertEqual('business lane count', sig.lanes.business.length, 1);
  for (const lane of Object.keys(sig.lanes)) {
    assertEqual(`meta.counts.${lane} matches lane length`, sig.meta.counts[lane], sig.lanes[lane].length);
  }

  const anomaly = sig.lanes.civic.find(e => e.kind === 'anomaly');
  assert('anomaly entry present', Boolean(anomaly));
  assertIncludes('anomaly ref → patterns[0] + evidence', anomaly.ref, 'engine_audit_c100.json patterns[0]; evidence: Initiative_Tracker row(s) 2');
  assertEqual('anomaly popids', anomaly.popids, ['POP-00042']);
  assertEqual('anomaly hood', anomaly.hood, 'West Oakland');

  const votes = sig.lanes.civic.filter(e => e.kind === 'vote');
  assertEqual('exactly one vote entry (INIT-002 all past-cycle)', votes.length, 1);
  assertIncludes('vote label carries pending action pointer', votes[0].label, 'milestone review C105');
  assertIncludes('vote label names the initiative', votes[0].label, 'Test Fund');

  assert('civic-log entry present', sig.lanes.civic.some(e => e.kind === 'civic-log'));
  assertIncludes('civic-log points at production log', flat, 'production_log_c100.md');

  assertEqual('unmapped ripple lands in business', sig.lanes.business[0].causeType, 'weather-drift');
  assertIncludes('unmapped ripple label verbatim', sig.lanes.business[0].label, 'UNMAPPED-MARKER');

  assertExcludes('StoryAngle NEVER leaks (WHAT stays desk-side)', flat, 'SECRET-ANGLE-TEXT');
  assertExcludes('Stats NEVER leak', flat, 'SECRET-STATS');
  assertIncludes('sports feed label carries WHO', flat, 'Vinnie Keane');
  assertExcludes('prior-cycle ripple excluded', flat, 'PRIOR-CYCLE-MARKER');
  assertExcludes('prior-cycle sports row excluded', flat, 'PRIOR-SPORTS-MARKER');

  const hood = sig.lanes.culture.find(e => e.kind === 'hood');
  assertEqual('world-event hood entry', hood && hood.hood, 'KONO');
  assertIncludes('meta.contract states pointers-only', sig.meta.contract, 'POINTERS ONLY');
  assertEqual('meta.cycle', sig.meta.cycle, 100);

  // Determinism: two builds identical modulo meta.builtAt
  const sig2 = helper.emitDeskSignal(100, data);
  sig.meta.builtAt = sig2.meta.builtAt = 'X';
  assertEqual('deterministic modulo builtAt', JSON.stringify(sig), JSON.stringify(sig2));
}

// ────────────────────────────────────────────────────────────────────────────
// Test 11e: emitDeskSignal — degraded inputs must never throw
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 11e: emitDeskSignal (degraded inputs)');
{
  function trySignal(label, cycle, data) {
    try { const r = helper.emitDeskSignal(cycle, data); assert(label, true); return r; }
    catch (err) { assert(label, false, err.message); return null; }
  }

  // Spec-listed degraded shape: patterns missing, snapshots missing,
  // WorldEvents null, rippleAll []
  const d1 = trySignal('minimal degraded data does not throw', 101,
    { auditJson: {}, rippleAll: [], sportsAll: [], neighborhoodsC: [], rileyCurr: { WorldEvents: null } });
  if (d1) {
    assert('note: missing Initiative_Tracker snapshot', d1.meta.notes.some(n => n.includes('no Initiative_Tracker snapshot')));
    assert('note: no Ripple_Ledger rows', d1.meta.notes.some(n => n.includes('no Ripple_Ledger rows')));
    assertEqual('civic lane = civic-log pointer only', d1.lanes.civic.map(e => e.kind), ['civic-log']);
    assertEqual('sports lane empty', d1.meta.counts.sports, 0);
  }

  // patterns non-array + malformed WorldEvents JSON + rippleAll undefined
  const d2 = trySignal('non-array patterns + malformed WorldEvents + undefined rippleAll', 101,
    { auditJson: { patterns: 'nope' }, rippleAll: undefined, sportsAll: [], neighborhoodsC: [], rileyCurr: { WorldEvents: '{{not json' } });
  if (d2) assertEqual('malformed inputs → civic-log only', d2.lanes.civic.length, 1);

  // Initiative_Tracker snapshot present but not an array
  trySignal('non-array Initiative_Tracker snapshot', 101,
    { auditJson: { snapshots: { Initiative_Tracker: { bogus: true } } }, rippleAll: [], sportsAll: [], neighborhoodsC: [], rileyCurr: {} });

  // WorldEvents valid JSON but not an array
  trySignal('WorldEvents valid-JSON non-array', 101,
    { auditJson: {}, rippleAll: [], sportsAll: [], neighborhoodsC: [], rileyCurr: { WorldEvents: '{"neighborhood":"KONO"}' } });

  // WorldEvents array containing a null entry
  const d5 = trySignal('WorldEvents array with null entry', 101,
    { auditJson: {}, rippleAll: [], sportsAll: [], neighborhoodsC: [], rileyCurr: { WorldEvents: '[null,{"neighborhood":"KONO"}]' } });
  if (d5) assert('null entry skipped, KONO hood still emitted', d5.lanes.culture.some(e => e.kind === 'hood' && e.hood === 'KONO'));

  // CauseType colliding with Object.prototype keys must route to default lane,
  // not resolve an inherited function as the lane name
  const d6 = trySignal('prototype-key CauseType (toString)', 103,
    { auditJson: {}, rippleAll: [{ Cycle: '103', CauseType: 'toString', EffectType: 'X', CauseDetail: 'proto probe' }], sportsAll: [], neighborhoodsC: [], rileyCurr: {} });
  if (d6) assertEqual('proto-key CauseType lands in business', d6.lanes.business.length, 1);

  // Fully empty data object
  trySignal('empty data object does not throw', 104, {});
}

// ────────────────────────────────────────────────────────────────────────────
// Test 11f: W5h2 byline WHO-assist — selectBylineCandidates + loadBylineUsage
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 11f: byline candidates (W5h2)');
{
  const POOLS = {
    pools: {
      civic: [{ name: 'Carmen Delaine', popid: 'POP-00011', beat: 'Civic Affairs Reporter' },
              { name: 'Luis Navarro', popid: 'POP-00636', beat: 'Investigations' }],
      sports: [{ name: 'Anthony Raines', popid: 'POP-00002', beat: "Lead Beat Reporter - Oakland A's" },
               { name: 'Tanya Cruz', popid: 'POP-00163', beat: 'Sideline Reporter' }],
      culture: [{ name: 'Maria Keen', popid: 'POP-00013', beat: 'Cultural Liason' },
                { name: 'Sharon Okafor', popid: 'POP-00159', beat: 'Lifestyle' }],
      business: [{ name: 'Jordan Velez', popid: 'POP-00153', beat: 'Economics & Labor' }]
    },
    generals: [{ name: 'Dana Reeve', popid: 'POP-00010', beat: 'Lead Journalist' },
               { name: 'Elliot Marbury', popid: 'POP-00166', beat: 'Journalist, Data Desk' }]
  };

  // 1. Zero usage: every lane emits its beat pick, deterministic name-asc tie-break
  const c0 = helper.selectBylineCandidates(POOLS, {});
  assertEqual('zero-usage picks all four lanes', Object.keys(c0).sort(), ['business', 'civic', 'culture', 'sports']);
  assertEqual('civic tie-break name-asc', c0.civic.name, 'Carmen Delaine');
  assert('popid resolved on every candidate', Object.values(c0).every(c => /^POP-\d{5}$/.test(c.popid)));
  assert('no angle/story/subject fields emitted', Object.values(c0).every(c =>
    Object.keys(c).every(k => ['name', 'popid', 'basis', 'recentUse'].includes(k))));

  // 2. Rotation: heavy use in cycle N penalises in N+1 — beat sibling takes over
  const c1 = helper.selectBylineCandidates(POOLS, { 'Carmen Delaine': 2 });
  assertEqual('used civic writer rotates out', c1.civic.name, 'Luis Navarro');

  // 3. Penalty floor: whole beat pool heavily used → general can outscore it
  const c2 = helper.selectBylineCandidates(POOLS, { 'Carmen Delaine': 3, 'Luis Navarro': 2 });
  assertEqual('exhausted beat pool falls to never-used general', c2.civic.name, 'Dana Reeve');

  // 4. Penalty cap (C105 blackout regression): saturating usage NEVER blanks a
  // lane — argmax always emits while a pool has anyone
  const heavy = {};
  for (const l of Object.keys(POOLS.pools)) POOLS.pools[l].forEach(j => { heavy[j.name] = 40; });
  POOLS.generals.forEach(j => { heavy[j.name] = 40; });
  const c3 = helper.selectBylineCandidates(POOLS, heavy);
  assertEqual('saturated usage still fills all lanes (no blackout)', Object.keys(c3).length, 4);

  // 5. Cross-lane spread: one name never takes two lanes in a cycle
  const names = Object.values(c0).map(c => c.name);
  assertEqual('four distinct names across lanes', new Set(names).size, 4);

  // 6. Single-writer lane whose writer is taken → general fills, not blank
  const soloTaken = helper.selectBylineCandidates(
    { pools: { civic: [], sports: [], culture: [], business: [{ name: 'Jordan Velez', popid: 'POP-00153' }] }, generals: POOLS.generals },
    { 'Jordan Velez': 6 });
  assert('business still emits under heavy solo usage', Boolean(soloTaken.business));

  // 7. Empty pools → null-ish behavior, no throw
  assertEqual('null lanePools returns null', helper.selectBylineCandidates(null, {}), null);
  assertEqual('empty pools object → no lanes picked',
    Object.keys(helper.selectBylineCandidates({ pools: { civic: [], sports: [], culture: [], business: [] }, generals: [] }, {})).length, 0);

  // 8. loadBylineUsage: synthetic dir, window of 3, cycles >= N excluded
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'byline-usage-'));
  const mkLog = (c, names2) => fs.writeFileSync(path.join(tmp, `byline_shadow_log_c${c}.json`),
    JSON.stringify({ cycle: c, entries: names2.map(n => ({ finalAssignment: n })) }));
  mkLog(100, ['A', 'A', 'B']);
  mkLog(101, ['B']);
  mkLog(102, ['C']);
  mkLog(103, ['D']);      // current cycle — must be excluded
  mkLog(99, ['E']);       // outside the 3-log window
  fs.writeFileSync(path.join(tmp, 'byline_shadow_log_c98.json'), '{{corrupt');
  const usage = helper.loadBylineUsage(103, tmp);
  assertEqual('window tallies A twice', usage.A, 2);
  assertEqual('window tallies B across two logs', usage.B, 2);
  assertEqual('current cycle excluded', usage.D, undefined);
  assertEqual('outside-window log excluded', usage.E, undefined);
  const usageMissing = helper.loadBylineUsage(103, path.join(tmp, 'no-such-dir'));
  assertEqual('missing dir → empty tally', Object.keys(usageMissing).length, 0);
  fs.rmSync(tmp, { recursive: true, force: true });

  // 9. emitDeskSignal integration: pools present → bylineCandidates block +
  // contract line; pools absent → omitted + noted
  const withPools = helper.emitDeskSignal(101, {
    auditJson: {}, rippleAll: [], sportsAll: [], neighborhoodsC: [], rileyCurr: {},
    bylinePools: POOLS, bylineUsage: {}
  });
  assert('artifact carries bylineCandidates', Boolean(withPools.bylineCandidates && withPools.bylineCandidates.civic));
  assert('meta carries bylineContract', String(withPools.meta.bylineContract).includes('WHO-assist'));
  const noPools = helper.emitDeskSignal(101, { auditJson: {}, rippleAll: [], sportsAll: [], neighborhoodsC: [], rileyCurr: {} });
  assert('no pools → bylineCandidates omitted', !('bylineCandidates' in noPools));
  assert('no pools → omission noted', noPools.meta.notes.some(n => n.includes('byline candidates omitted')));
}

// ────────────────────────────────────────────────────────────────────────────
// Test 11g: engine.270 storyline registry — engine events with an ID and an ending
// Fixtures are the live CRISIS-105-WESTOAKL rows and live initiative stages (2026-09-28).
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 11g: storyline registry (engine.270)');
{
  const arcRows = [
    { Cycle: '101', ArcId: 'CRISIS-78-LRR155', Phase: 'peak', Neighborhood: 'Downtown', DomainTag: 'SAFETY', Summary: 'old arc', CycleCreated: '78', CycleResolved: '' },
    { Cycle: '105', ArcId: 'CRISIS-105-WESTOAKL', Phase: 'early', Neighborhood: 'West Oakland', DomainTag: 'SAFETY',
      Summary: 'West Oakland under strain: retail vitality 3.5 (city 6.4); crime index 1.18', CycleCreated: '105', CycleResolved: '' },
    { Cycle: '109', ArcId: 'CRISIS-105-WESTOAKL', Phase: 'resolved', Neighborhood: 'West Oakland', DomainTag: 'SAFETY',
      Summary: 'The West Oakland Crime Spike — West Oakland crisis eased after 3 cycles back within city range', CycleCreated: '105', CycleResolved: '109' }
  ];
  const initiatives = [
    { InitiativeID: 'INIT-005', Name: 'Temescal Community Health Center', Status: 'passed', ImplementationPhase: 'construction-active', AffectedNeighborhoods: 'Temescal' },
    { InitiativeID: 'INIT-002', Name: 'Oakland Alternative Response Initiative', Status: 'passed', ImplementationPhase: 'dispatch-live', AffectedNeighborhoods: 'West Oakland, Fruitvale, East Oakland' }
  ];
  const reg = (cycle, extra) => helper.buildStorylineRegistry(Object.assign({ arcRows, initiatives: [], cycle }, extra || {}));
  const crisis = (cycle, extra) => reg(cycle, extra).find(e => e.id === 'CRISIS-105-WESTOAKL');

  for (const c of [105, 106, 107, 108]) {
    const e = crisis(c, c === 107 ? { liveArcs: [{ arcId: 'CRISIS-105-WESTOAKL', phase: 'rising', name: 'The West Oakland Crime Spike' }] } : {});
    assert('C' + c + ': crisis is open', e && e.status === 'open' && e.endCycle === null);
    assert('C' + c + ': age counts from the start cycle', e.age === c - 105 + 1 && e.startCycle === 105);
  }
  assert('stage comes from the carried live arc between milestones',
    crisis(107, { liveArcs: [{ arcId: 'CRISIS-105-WESTOAKL', phase: 'rising', name: 'The West Oakland Crime Spike' }] }).stage === 'rising');
  assert('name comes from the live arc when the onset row has none',
    crisis(107, { liveArcs: [{ arcId: 'CRISIS-105-WESTOAKL', phase: 'rising', name: 'The West Oakland Crime Spike' }] }).name === 'The West Oakland Crime Spike');
  assert('no name anywhere → hood fallback, never a slug', crisis(106).name === 'West Oakland crisis');
  assert('a past cycle never sees its own future', crisis(108).status === 'open');
  const closed = crisis(109);
  assert('C109: crisis is closed by the engine', closed.status === 'closed' && closed.endCycle === 109 && closed.stage === 'resolved');
  assert('C109: name recovered from the resolution row', closed.name === 'The West Oakland Crime Spike');
  assert('closed arc lingers one cycle', Boolean(crisis(110)));
  assert('closed arc drops after the linger', !crisis(111));
  assert('pre-ledger-era arcs excluded', !reg(109).some(e => e.id === 'CRISIS-78-LRR155'));
  assert('crisis routes to civic', crisis(106).desks.includes('civic'));
  assert('crisis carries its hood', crisis(106).hoods[0] === 'West Oakland');

  const stages = helper.buildStorylineRegistry({ initiatives, cycle: 109, ledgerRows: [
    { StorylineId: 'INIT-002:dispatch-live', FirstCycle: '104', Status: 'open' },
    { StorylineId: 'INIT-005:construction-planning', FirstCycle: '106', Status: 'open' }
  ] });
  const byId = id => stages.find(e => e.id === id);
  assert('stage id is <InitiativeID>:<stage>', Boolean(byId('INIT-002:dispatch-live')));
  assert('known stage keeps its first-observed cycle', byId('INIT-002:dispatch-live').startCycle === 104
    && byId('INIT-002:dispatch-live').age === 6 && !byId('INIT-002:dispatch-live').firstSeen);
  assert('new stage is first-seen at this cycle', byId('INIT-005:construction-active').firstSeen === true
    && byId('INIT-005:construction-active').startCycle === 109 && !byId('INIT-005:construction-active').hasLedgerRow);
  const ended = byId('INIT-005:construction-planning');
  assert('a stage the tracker moved past is closed', ended && ended.status === 'closed' && ended.endCycle === 109);
  assert('closed stage names where it moved', ended.movedTo === 'construction-active');
  assert('an already-closed stage row is not listed again', !helper.buildStorylineRegistry({ initiatives, cycle: 110, ledgerRows: [
    { StorylineId: 'INIT-005:construction-planning', FirstCycle: '106', Status: 'closed' }] })
    .some(e => e.id === 'INIT-005:construction-planning'));
  assert('stage hoods split on commas', byId('INIT-002:dispatch-live').hoods.length === 3);

  // The resolver works on the ref string alone — the one field every path carries.
  const R = helper.buildStorylineRegistry({ arcRows, initiatives, cycle: 106 });
  const sig = helper.emitDeskSignal(106, {
    auditJson: { snapshots: { Initiative_Tracker: initiatives } },
    rippleAll: [
      { Cycle: '106', CauseType: 'crisis-event', CauseId: 'CRISIS-105-WESTOAKL', CauseDetail: 'crisis', EffectType: 'sentiment', Neighborhood: 'West Oakland' },
      { Cycle: '106', CauseType: 'initiative-implementation', CauseId: 'Temescal Community Health Center', CauseDetail: 'x', EffectType: 'health' },
      { Cycle: '106', CauseType: 'faith-event', CauseId: 'St. Esperanza Parish', CauseDetail: 'x', EffectType: 'community' }
    ],
    sportsAll: [], neighborhoodsC: [], rileyCurr: {}, storylineLedger: [], arcRows, liveArcs: []
  });
  const allEntries = Object.values(sig.lanes).flat();
  const crisisRipple = allEntries.find(e => e.kind === 'ripple' && e.causeType === 'crisis-event');
  const initRipple = allEntries.find(e => e.kind === 'ripple' && e.causeType === 'initiative-implementation');
  const faithRipple = allEntries.find(e => e.kind === 'ripple' && e.causeType === 'faith-event');
  const initEntry = allEntries.find(e => e.kind === 'initiative' && e.ref.includes('INIT-005'));
  assert('crisis ripple resolves to the arc', helper.resolveStoryline(crisisRipple, R).id === 'CRISIS-105-WESTOAKL');
  assert('initiative ripple (named by Name) resolves to its stage',
    helper.resolveStoryline(initRipple, R).id === 'INIT-005:construction-active');
  assert('initiative lane entry resolves to its stage', helper.resolveStoryline(initEntry, R).id === 'INIT-005:construction-active');
  assert('unrelated ripple resolves to nothing', helper.resolveStoryline(faithRipple, R) === null);
  assert('a story with only ref/label/kind still resolves (fanout storyFromSeed shape)',
    helper.resolveStoryline({ ref: crisisRipple.ref, label: crisisRipple.label, kind: 'ripple' }, R).id === 'CRISIS-105-WESTOAKL');
  assert('hood alone never attaches', helper.resolveStoryline({ ref: 'output/neighborhood_texture_c106.md "### West Oakland"', hood: 'West Oakland' }, R) === null);
  assert('ref file head is unchanged by the tag', crisisRipple.ref.split(/[\s;]/)[0] === 'Ripple_Ledger');

  assert('storylines ride their own key, a sibling of lanes', sig.storylines.civic.some(e => e.id === 'CRISIS-105-WESTOAKL'));
  assert('NO storyline leaks into any lane', !allEntries.some(e => e.type === 'crisis' || e.type === 'initiative-stage'));
  assert('openThreads is gone', sig.openThreads === undefined);
  assert('lane counts unchanged by storylines', sig.meta.counts.civic === sig.lanes.civic.length);
  assert('meta carries the storyline contract', String(sig.meta.storylineContract).includes('ENGINE EVENTS'));
  assert('empty engine state is noted, not thrown', helper.emitDeskSignal(106, {
    auditJson: {}, rippleAll: [], sportsAll: [], neighborhoodsC: [], rileyCurr: {} })
    .meta.notes.some(n => n.includes('storyline registry empty')));
}

// ────────────────────────────────────────────────────────────────────────────
// Test 12: integration — full build against live sheets (CANON_PRESENT skip)
// ────────────────────────────────────────────────────────────────────────────
const auditPath = path.join(__dirname, '..', 'output', 'engine_audit_c94.json');
const LIVE_SHEETS = process.env.GODWORLD_TEST_LIVE === '1';
const CANON_PRESENT = LIVE_SHEETS && fs.existsSync(auditPath)
  && (process.env.GOOGLE_APPLICATION_CREDENTIALS
      || fs.existsSync('/root/.config/godworld/.env'));

console.log('\nTest 12: integration build (CANON_PRESENT=' + Boolean(CANON_PRESENT) + ')');
if (!CANON_PRESENT) {
  console.log('  SKIP — ' + (LIVE_SHEETS
    ? 'engine_audit_c94.json or service-account creds missing'
    : 'live Sheets integration disabled (run npm test -- --live)'));
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
