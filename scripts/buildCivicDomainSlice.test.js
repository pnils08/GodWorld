#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const civic = require('./buildCivicDomainSlice');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-civic-domain-'));

try {
  const output = path.join(root, 'output');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'desk_signal_c103.json'), JSON.stringify({
    lanes: {
      civic: [
        { kind: 'initiative', ref: 'INIT-TRANSIT', label: 'Fruitvale Transit Hub | Status visioning-complete', hood: 'Fruitvale' },
        { kind: 'anomaly', ref: 'AUDIT-STUCK', label: 'stuck-initiative | Fruitvale Transit Hub stalled for 9 cycles', hood: 'Fruitvale',
          popids: ['POP-90001', 'POP-90002'], handle: { citizens: ['Test Civic Resident (POP-90001)', 'Test Pro Athlete (POP-90002)'] } },
        { kind: 'anomaly', ref: 'AUDIT-INCOHERE', label: 'incoherence | OARI listed operational while CrimeIndex contradicts', hood: 'West Oakland',
          popids: ['POP-90001', 'POP-90002'], handle: { citizens: ['Test Civic Resident (POP-90001)', 'Test Pro Athlete (POP-90002)'] } },
        { kind: 'initiative', ref: 'INIT-HEALTH', label: 'Temescal Community Health Center | construction-active', hood: 'Temescal' },
        { kind: 'initiative', ref: 'INIT-YOUTH', label: 'Oakland Youth Apprenticeship Pipeline | pilot-active', hood: 'East Oakland' },
        { kind: 'ripple', ref: 'ENV-1', label: 'environmental air quality review | public comment window', hood: 'West Oakland' },
        { kind: 'culture', ref: 'CULTURE-1', label: 'Named venue event outside the civic package' }
      ]
    }
  }, null, 2));
  fs.writeFileSync(path.join(output, 'simulation_ledger_snapshot.jsonl'), [
    { Name: 'Test Civic Resident', POPID: 'POP-90001', RoleType: 'Mechanic', Neighborhood: 'Fruitvale', EconomicProfileKey: 'Skilled Trade', SMPageId: 'cp-POP-90001' },
    { Name: 'Test Pro Athlete', POPID: 'POP-90002', RoleType: 'Right Fielder, Test Team', EconomicProfileKey: 'SPORTS_OVERRIDE' },
    { Name: 'Test Clinic Patient', POPID: 'POP-90003', RoleType: 'Line Cook', Neighborhood: 'Temescal' },
    { Name: 'Test Seasonal Resident', POPID: 'POP-90004', RoleType: 'Bus Operator', Neighborhood: 'Laurel' }
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  fs.writeFileSync(path.join(output, 'world_summary_c103.md'), [
    '# World Summary — Cycle 103',
    '',
    '**Season:** Winter | **Weather:** 49°F overcast, NW 11 mph, overcast (frontState OVERCAST), humidity 67, visibility 10',
    '',
    '## City State',
    '',
    '- **Population:** 100,000 | Illness rate 6.4% | Employment 93.0% | Economy stable | Hospital: 3 in care (8% load)',
    '',
    '## World Events (cycle 103 — 2 total)',
    '',
    '**Medium-severity:**',
    '- **HEALTH — crisis-spike — West Oakland:** HEALTH event (impactScore 41)',
    '- **CIVIC — texture — (no neighborhood):** email leak',
    '',
    '## Who Lived It (cycle 103)',
    '',
    '### Health (2)',
    '- POP-90003 Test Clinic Patient — took time to recover from the flu (Temescal)',
    '- POP-90004  — dealt with a seasonal health concern',
    '',
    '### Relationship (1)',
    '- POP-90001 Test Civic Resident — relied on familiar social circles during cold period (Fruitvale)',
    '',
    '### Education (1)',
    '- POP-90005 Test Homework Student — dealt with holiday homework stress before school (East Oakland)',
    '',
    '### Transit (1)',
    '- POP-90006 Test Storm Commuter — faced restricted movement on the road during the storm (Fruitvale)',
    '',
    '## Chaos Events (Chaos_Cars, cycle 103 — 2 total)',
    '',
    '| Vehicle | Outcome | Target | Metric | Magnitude | Floor fired |',
    '|---|---|---|---|---|---|',
    '| ambulance | workplace_accident | citizen POP-90002 (T2) | Hospitalized | 0 | FALSE |',
    '| ambulance | traffic_collision | citizen POP-90004 (T4) | Hospitalized | 0 | FALSE |',
    '| cop_car | ticket | citizen POP-90001 (T4) | Setback | 0 | FALSE |',
    ''
  ].join('\n'));

  const slice = civic.buildCivicDomainSlice(103, { root });
  assert.strictEqual(slice.empty, false);
  assert.strictEqual(slice.packets['angela-reyes'].story.ref, 'INIT-YOUTH');
  assert.strictEqual(slice.packets['trevor-shimizu'].story.ref, 'INIT-TRANSIT');
  assert.strictEqual(slice.packets['trevor-shimizu'].prewrite.schema, 'SYSTEMS-BRIEF-1');
  assert.strictEqual(slice.packets['trevor-shimizu'].prewrite.method, 'INCIDENT_LINK_WARNING');
  assert.deepStrictEqual(slice.packets['trevor-shimizu'].prewrite.anchorFacts,
    ['Fruitvale Transit Hub is listed as visioning complete.']);
  assert(!/construction-planning|stuck-initiative/i.test(JSON.stringify({
    story: slice.packets['trevor-shimizu'].story,
    prewrite: slice.packets['trevor-shimizu'].prewrite
  })));
  assert.deepStrictEqual(slice.packets['trevor-shimizu'].prewrite.cascade,
    { state: 'UNESTABLISHED', facts: [], link: null, src: null });
  assert(slice.packets['trevor-shimizu'].prewrite.missing.some(row => row.includes('timestamp')));
  assert(!slice.packets['trevor-shimizu'].prewrite.anchorFacts.includes('INIT-TRANSIT'),
    'source pointer must not be duplicated as a factual sentence');
  assert.strictEqual(slice.packets['luis-navarro'].story.ref, 'AUDIT-STUCK');
  assert(slice.packets['luis-navarro'].candidates.some(row => /stuck-initiative/i.test(row.label + ' ' + row.ref)),
    'desk-signal stuck-initiative stays in the civic assignment pool');
  assert.strictEqual(slice.packets['luis-navarro'].prewrite.schema, 'INVESTIGATION-BRIEF-1');
  assert.strictEqual(slice.packets['luis-navarro'].prewrite.method, 'KNOWN_UNKNOWN');
  assert.deepStrictEqual(slice.packets['luis-navarro'].prewrite.anchorFacts,
    ['stuck-initiative | Fruitvale Transit Hub stalled for 9 cycles']);
  assert.deepStrictEqual(slice.packets['luis-navarro'].prewrite.silenceClock,
    { state: 'UNESTABLISHED', value: null, src: null });
  assert.deepStrictEqual(slice.packets['luis-navarro'].prewrite.reportingEvidence.recordChecks,
    { state: 'NOT_SUPPLIED', events: [] });
  assert(slice.packets['luis-navarro'].prewrite.missing.some(row => row.includes('elapsed silence')));
  assert(!slice.packets['luis-navarro'].prewrite.anchorFacts.includes('AUDIT-STUCK'),
    'source pointer must not be duplicated as a factual sentence');
  assert.deepStrictEqual(slice.packets['luis-navarro'].story.popids, ['POP-90001']);
  assert.deepStrictEqual(slice.packets['luis-navarro'].story.citizens,
    ['Test Civic Resident (POP-90001)']);
  assert.strictEqual(slice.packets['luis-navarro'].citizens[0].profile,
    'Test Civic Resident — Mechanic — Fruitvale resident');
  assert.deepStrictEqual(slice.packets['luis-navarro'].prewrite.excludedCandidates,
    [{ popid: 'POP-90002', reason: 'PRO_ATHLETE_CIVIC_INELIGIBLE' }]);
  // civic.30 — the health beat leads with the health record, never with a
  // construction tracker that merely has "Health Center" in its name.
  const lila = slice.packets['lila-mezran'];
  assert.notStrictEqual(lila.story.ref, 'INIT-HEALTH',
    'a civic initiative tracker must not win the health slot over a health record');
  assert.strictEqual(lila.story.kind, 'health-lived');
  assert.deepStrictEqual(lila.story.popids, ['POP-90003']);
  assert.strictEqual(lila.story.label,
    'Test Clinic Patient took time to recover from the flu (Temescal).');
  assert.strictEqual(lila.prewrite.schema, 'HEALTH-SERVICE-BRIEF-1');
  assert.strictEqual(lila.prewrite.method, 'ILLNESS_RECORD_HUMAN_COST');
  assert.strictEqual(lila.prewrite.humanConsequence.state, 'SUPPLIED');
  assert.deepStrictEqual(lila.prewrite.humanConsequence.subjects, ['POP-90003']);
  assert(lila.prewrite.missing.some(row => row.includes('diagnosis')));
  assert(!lila.prewrite.missing.some(row => row.includes('a named affected resident')),
    'a supplied citizen must not still be listed as withheld');
  assert(!/construction-active|Status passed|phase/i.test(JSON.stringify({
    story: lila.story,
    prewrite: lila.prewrite.anchorFacts
  })));
  // The beat Mike specified: illness rate, hoods affected, hospital tracking.
  const lilaKinds = lila.candidates.map(row => row.kind);
  assert(lilaKinds.includes('health-city'), 'citywide illness rate reaches the health beat');
  assert(lilaKinds.includes('health-crisis'), 'the hood carrying the cluster reaches the health beat');
  assert(lilaKinds.includes('health-lived-seasonal'), 'seasonal health rows stay available, tiered below');
  assert(lila.candidates.some(row => row.ref === 'INIT-HEALTH' && row.score === 12),
    'the civic health initiative survives only as a last-resort fallback');
  assert(!lilaKinds.includes('season-feel'),
    'a season-feel row is Noah Tan\u2019s, whatever keywords it happens to carry');
  assert.strictEqual(civic.scoreEntryForSeat(
    { kind: 'season-feel', label: 'Someone dealt with a seasonal health concern', ref: 'X' },
    'lila-mezran'), 0);
  assert(!/POP-90002/.test(JSON.stringify(lila.candidates)),
    'a pro athlete stays out of the civic health beat, as with Luis');
  assert(lilaKinds.includes('health-hospitalization'),
    'a civic-eligible hospitalization reaches the health beat');
  assert(lila.candidates.some(row => row.kind === 'health-hospitalization' &&
    row.label === 'Test Seasonal Resident was hospitalized after a traffic collision.' &&
    row.hood === 'Laurel'),
    'the hospitalization names the citizen and resolves the hood from the ledger');
  assert.notDeepStrictEqual(lila.story.popids, slice.packets['noah-tan'].story.popids,
    'the health seat and the season seat must not land on the same citizen');
  assert.strictEqual(civic.scoreEntryForSeat(
    { kind: 'initiative', label: 'Temescal Community Health Center | Status passed', ref: 'X' },
    'lila-mezran'), 12);
  assert.strictEqual(civic.scoreEntryForSeat(
    { kind: 'initiative', label: 'Fruitvale Transit Hub | Status visioning', ref: 'X' },
    'lila-mezran'), 0);
  // The citywide rate and hospital census ride outside the candidate slots.
  assert.strictEqual(lila.prewrite.cityHealth.fact,
    'The city illness rate stands at 6.4%, with 3 in hospital care at 8% of capacity.');
  assert.strictEqual(lila.prewrite.cityHealth.src,
    'output/world_summary_c103.md "## City State"');
  assert.deepStrictEqual(lila.prewrite.anchorFacts, [
    'Test Clinic Patient took time to recover from the flu (Temescal).',
    'The city illness rate stands at 6.4%, with 3 in hospital care at 8% of capacity.'
  ], 'the citywide figure travels in the brief cron-desk-run.js renders');
  assert.strictEqual(slice.packets['angela-reyes'].seat.popid, 'POP-00156');
  assert.strictEqual(slice.packets['angela-reyes'].story.label,
    'Oakland Youth Apprenticeship Pipeline has an active pilot.');
  assert.strictEqual(slice.packets['angela-reyes'].prewrite.schema,
    'EDUCATION-STABILITY-BRIEF-1');
  assert.strictEqual(slice.packets['angela-reyes'].prewrite.method,
    'PROGRAM_CONTINUITY_ACCESS');
  assert.deepStrictEqual(slice.packets['angela-reyes'].prewrite.stabilityEvidence,
    { state: 'UNESTABLISHED', participants: [], facts: [], src: null });
  assert(slice.packets['angela-reyes'].prewrite.missing.some(row => row.includes('eligibility')));
  assert(!/pilot-active|Status announced|phase/i.test(JSON.stringify({
    story: slice.packets['angela-reyes'].story,
    prewrite: slice.packets['angela-reyes'].prewrite.anchorFacts
  })));
  // civic.30 follow-up (flagged by engine-sheet, not observed at C105): the
  // same season-feel leak that hit Lila reaches any seat whose keywords
  // happen to co-occur with a SEASON_RE trigger in the same "Who Lived It"
  // line — SEASON_RE carries "homework" (Angela's `school`/`student`) and
  // "restricted movement" (Trevor's `traffic`/`mobility`/`road`).
  const angelaKinds = slice.packets['angela-reyes'].candidates.map(row => row.kind);
  const trevorKinds = slice.packets['trevor-shimizu'].candidates.map(row => row.kind);
  assert(!angelaKinds.includes('season-feel'),
    'a season-feel row is Noah Tan’s, even one that mentions homework and school');
  assert(!trevorKinds.includes('season-feel'),
    'a season-feel row is Noah Tan’s, even one that mentions restricted movement and a road');
  assert.strictEqual(civic.scoreEntryForSeat({
    kind: 'season-feel',
    label: 'Test Homework Student dealt with holiday homework stress before school (East Oakland)',
    ref: 'X'
  }, 'angela-reyes'), 0);
  assert.strictEqual(civic.scoreEntryForSeat({
    kind: 'season-feel',
    label: 'Test Storm Commuter faced restricted movement on the road during the storm (Fruitvale)',
    ref: 'X'
  }, 'trevor-shimizu'), 0);
  // The apprenticeship pipeline stays Angela's top pick either way (it's her
  // only signal, per civic.22/civic.30 — she must never end up empty), and
  // the transit hub stays Trevor's — the gate must not touch initiative kind.
  assert.strictEqual(slice.packets['angela-reyes'].story.ref, 'INIT-YOUTH');
  assert.strictEqual(slice.packets['trevor-shimizu'].story.ref, 'INIT-TRANSIT');
  assert.strictEqual(slice.packets['noah-tan'].seat.popid, 'POP-00157');
  assert.strictEqual(slice.packets['noah-tan'].story.ref, 'output/world_summary_c103.md ## Who Lived It');
  assert.match(slice.packets['noah-tan'].story.label, /Test Seasonal Resident/);
  assert.strictEqual(slice.packets['noah-tan'].prewrite.schema, 'SEASON-FEEL-1');
  assert.strictEqual(slice.packets['noah-tan'].prewrite.method, 'WHAT_MOVED_ON_DAYS_LIKE_THIS');
  assert(!/frontState|49°F|opened in winter/i.test(slice.packets['noah-tan'].story.label));
  assert.strictEqual(slice.packets['noah-tan'].prewrite.impactEvidence.state, 'SUPPLIED');
  assert.deepStrictEqual(slice.packets['noah-tan'].prewrite.impactEvidence.subjects, ['POP-90004']);
  assert.strictEqual(slice.packets['carmen-delaine'].story.ref, 'INIT-TRANSIT');
  assert.deepStrictEqual(slice.packets['carmen-delaine'].prewrite.anchorFacts,
    ['Fruitvale Transit Hub | Status visioning-complete', 'INIT-TRANSIT'],
    'completed civic package payload remains unchanged');
  assert.strictEqual(civic.CIVIC_SEATS['rachel-torres'], undefined, 'Rachel remains on her completed safety slice');
  assert(!slice.packets['angela-reyes'].candidates.some(row => row.ref === 'CULTURE-1'));
  assert(slice.packets['angela-reyes'].pointers.includes('INIT-YOUTH'), 'source ref retained');

  const paths = civic.writeCivicDomainSlice(103, slice, root);
  assert(fs.existsSync(paths.json));
  assert(fs.existsSync(paths.md));
  assert.strictEqual(civic.loadCivicDomainSlice(103, root).packets['angela-reyes'].story.ref, 'INIT-YOUTH');

  const stale = JSON.parse(JSON.stringify(slice));
  stale.version = 'CIVIC-DOMAIN-SLICE-2';
  stale.packets['luis-navarro'].prewrite = { anchorFacts: ['STALE TEST-ONLY FACT'] };
  fs.writeFileSync(paths.json, JSON.stringify(stale, null, 2));
  const rebuilt = civic.loadCivicDomainSlice(103, root);
  assert.strictEqual(rebuilt.version, 'CIVIC-DOMAIN-SLICE-5');
  assert.strictEqual(rebuilt.packets['luis-navarro'].prewrite.schema, 'INVESTIGATION-BRIEF-1');
  assert.notDeepStrictEqual(rebuilt.packets['luis-navarro'].prewrite.anchorFacts, ['STALE TEST-ONLY FACT']);

  const enriched = civic.enrichAssignment({
    desk: 'civic', name: 'Angela Reyes', popid: 'POP-TEST', beatDomain: 'EDUCATION', persona: 'angela-reyes'
  }, 103, root);
  assert.strictEqual(enriched.civicDomainSlice, true);
  assert.strictEqual(enriched.story.ref, 'INIT-YOUTH');
  const untouchedRachel = { desk: 'civic', persona: 'rachel-torres' };
  assert.strictEqual(civic.enrichAssignment(untouchedRachel, 103, root), untouchedRachel);

  const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-civic-domain-empty-'));
  try {
    assert.strictEqual(civic.buildCivicDomainSlice(103, { root: emptyRoot }).empty, true);
  } finally {
    fs.rmSync(emptyRoot, { recursive: true, force: true });
  }

  console.log('buildCivicDomainSlice.test.js PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
