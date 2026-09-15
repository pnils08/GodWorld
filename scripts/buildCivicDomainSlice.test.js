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

  // --- beat-dump wiring (media-lane civic tabs) — SYNTHETIC fixture, not canon ---
  const beatsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-civic-beats-'));
  try {
    const beatsOut = path.join(beatsRoot, 'output');
    fs.mkdirSync(beatsOut, { recursive: true });
    fs.writeFileSync(path.join(beatsOut, 'desk_signal_c103.json'), JSON.stringify({
      lanes: {
        civic: [
          { kind: 'initiative', ref: 'INIT-SYNTH', label: 'SYNTH Test Initiative | Status active', hood: 'Fruitvale' },
          { kind: 'anomaly', ref: 'AUDIT-SYNTH', label: 'SYNTH stuck-initiative test row', hood: 'Fruitvale' }
        ]
      }
    }, null, 2));
    const beatsDir = path.join(beatsOut, 'beats');
    const prevDir = path.join(beatsDir, 'prev');
    fs.mkdirSync(prevDir, { recursive: true });
    fs.writeFileSync(path.join(beatsDir, 'meta.json'), JSON.stringify({ cycle: 103 }));
    fs.writeFileSync(path.join(prevDir, 'meta.json'), JSON.stringify({ cycle: 102 }));
    // Initiative_Tracker: one moved, one stuck (identical status+phase), one new.
    fs.writeFileSync(path.join(prevDir, 'Initiative_Tracker.jsonl'), [
      { InitiativeID: 'INIT-MOVED', Name: 'SYNTH Moved Initiative', Type: 'visioning', Status: 'visioning-complete', ImplementationPhase: 'visioning', VoteCycle: '', Outcome: '', Budget: '$10M' },
      { InitiativeID: 'INIT-STUCK', Name: 'SYNTH Stuck Initiative', Type: 'visioning', Status: 'active', ImplementationPhase: 'planning', VoteCycle: '100', Outcome: '', Budget: '$4M' }
    ].map(row => JSON.stringify(row)).join('\n') + '\n');
    fs.writeFileSync(path.join(beatsDir, 'Initiative_Tracker.jsonl'), [
      { InitiativeID: 'INIT-MOVED', Name: 'SYNTH Moved Initiative', Type: 'visioning', Status: 'active', ImplementationPhase: 'construction-active', VoteCycle: '103', Outcome: '', Budget: '$10M' },
      { InitiativeID: 'INIT-STUCK', Name: 'SYNTH Stuck Initiative', Type: 'visioning', Status: 'active', ImplementationPhase: 'planning', VoteCycle: '100', Outcome: '', Budget: '$4M' },
      { InitiativeID: 'INIT-NEW', Name: 'SYNTH New Initiative', Type: 'grant', Status: 'proposed', ImplementationPhase: '', VoteCycle: '', Outcome: '', Budget: '$2M' }
    ].map(row => JSON.stringify(row)).join('\n') + '\n');
    fs.writeFileSync(path.join(beatsDir, 'Civic_Office_Ledger.jsonl'), [
      { OfficeId: 'MAYOR-01', Title: 'Mayor', Type: 'MAYOR', Holder: 'SYNTH Mayor Name', Status: 'active', Approval: 62, Faction: 'OPP', VotingPower: 'yes' },
      { OfficeId: 'COUNCIL-D1', Title: 'Council D1', Type: 'COUNCIL', Holder: 'SYNTH Councilor', Status: 'scandal', Approval: 41, Faction: 'CRC', VotingPower: 'yes' },
      { OfficeId: 'CLERK-01', Title: 'City Clerk', Type: 'STAFF', Holder: 'SYNTH Clerk', Status: 'active', Approval: '', Faction: 'STAFF', VotingPower: 'no' },
      { OfficeId: '', Title: '', Type: '', Holder: '', Status: '', Approval: '', Faction: '', VotingPower: '' }
    ].map(row => JSON.stringify(row)).join('\n') + '\n');
    fs.writeFileSync(path.join(beatsDir, 'Election_Log.jsonl'), [
      { Cycle: 103, OfficeId: 'COUNCIL-D1', Winner: 'SYNTH Councilor', Margin: '7%' }
    ].map(row => JSON.stringify(row)).join('\n') + '\n');
    // Civic_Ledger rows stay on disk to prove the office ledger wins when both
    // carry factions (fallback-only coverage lives in the mini-root below).
    fs.writeFileSync(path.join(beatsDir, 'Civic_Ledger.jsonl'), [
      { OfficeId: 'MAYOR-01', Title: 'Mayor', Holder: 'SYNTH Mayor Name', Faction: 'OPP', VotingPower: 'yes', Approval: 62 },
      { OfficeId: 'COUNCIL-D1', Title: 'Council D1', Holder: 'SYNTH Councilor', Faction: 'CRC', VotingPower: 'yes', Approval: 41 },
      { OfficeId: 'CLERK-01', Title: 'City Clerk', Holder: 'SYNTH Clerk', Faction: 'STAFF', VotingPower: 'no', Approval: '' }
    ].map(row => JSON.stringify(row)).join('\n') + '\n');
    fs.writeFileSync(path.join(beatsDir, 'Story_Hook_Deck.jsonl'), [
      { Cycle: 103, Domain: 'CIVIC', HookText: 'SYNTH civic hook for Carmen Delaine', SuggestedAngle: 'watch', Neighborhood: 'Fruitvale', SuggestedJournalist: 'Carmen Delaine' },
      { Cycle: 103, Domain: 'CIVIC', HookText: 'SYNTH civic hook for Luis Navarro', SuggestedAngle: 'probe', Neighborhood: 'Downtown', SuggestedJournalist: 'Luis Navarro' },
      { Cycle: 103, Domain: 'CIVIC', HookText: 'SYNTH civic hook for someone else', SuggestedAngle: 'x', Neighborhood: 'Downtown', SuggestedJournalist: 'Mags Corliss' },
      { Cycle: 103, Domain: 'SPORTS', HookText: 'SYNTH sports hook for Carmen Delaine', SuggestedAngle: 'x', Neighborhood: 'Rockridge', SuggestedJournalist: 'Carmen Delaine' },
      { Cycle: 102, Domain: 'CIVIC', HookText: 'SYNTH prior-cycle civic hook', SuggestedAngle: 'x', Neighborhood: 'Downtown', SuggestedJournalist: 'Carmen Delaine' }
    ].map(row => JSON.stringify(row)).join('\n') + '\n');

    const withDump = civic.buildCivicDomainSlice(103, { root: beatsRoot });
    // (a) Carmen: trackerFacts carry the changed-initiative row + office rows,
    //     her named CIVIC hook lands on packet.hooks, and the record facts
    //     ALSO ride in prewrite.anchorFacts.
    const carmen = withDump.packets['carmen-delaine'];
    assert.strictEqual(carmen.empty, false);
    assert(carmen.trackerFacts.some(f => /SYNTH Moved Initiative/.test(f) && /\[Initiative_Tracker\]/.test(f)),
      'changed-initiative fact present with source file');
    assert(carmen.trackerFacts.some(f => /Mayor — SYNTH Mayor Name/.test(f) && /\[Civic_Office_Ledger\]/.test(f)),
      'office-holder fact present with source file');
    assert(carmen.trackerFacts.length >= 4 && carmen.trackerFacts.length <= 8,
      'trackerFacts stay in the 4–8 band');
    assert(carmen.hooks.some(h => h.text === 'SYNTH civic hook for Carmen Delaine'),
      'named CIVIC hook attached');
    assert.deepStrictEqual(carmen.prewrite.anchorFacts.slice(0, 2),
      ['SYNTH Test Initiative | Status active', 'INIT-SYNTH'],
      'desk-signal spine facts keep their order ahead of the dump facts');
    assert.deepStrictEqual(carmen.prewrite.anchorFacts.slice(2), carmen.trackerFacts,
      'trackerFacts appended to anchorFacts (record facts, unlike hooks)');
    assert(!carmen.prewrite.anchorFacts.some(f => /civic hook for/.test(f)),
      'hooks must never leak into anchorFacts');
    // (b) Luis: his named hook + the stuck initiative (identical status+phase
    //     in prev/ and current) + faction standings.
    const luis = withDump.packets['luis-navarro'];
    assert.strictEqual(luis.empty, false);
    assert(luis.hooks.some(h => h.text === 'SYNTH civic hook for Luis Navarro'));
    assert(luis.stalling.some(s => /SYNTH Stuck Initiative/.test(s) && /unchanged since C102/.test(s) && /\[Initiative_Tracker\]/.test(s)),
      'stuck initiative surfaces as a stalling row');
    assert(luis.factions.some(f => /OPP: 1 office \(1 voting\)/.test(f) && /\[Civic_Office_Ledger\]/.test(f)),
      'faction standings read from Civic_Office_Ledger (the tab that carries Faction/VotingPower)');
    assert(!luis.factions.some(f => /\[Civic_Ledger\]/.test(f)),
      'office-ledger factions win over Civic_Ledger.jsonl when both exist');
    // Pre-sized blank rows (no OfficeId/Title/Holder/Faction) produce neither
    // office facts nor an empty-named faction group.
    assert.strictEqual(
      carmen.trackerFacts.filter(f => /\[Civic_Office_Ledger\]/.test(f)).length, 3,
      'blank pre-sized office row produces no office fact');
    assert.strictEqual(luis.factions.length, 3, 'one faction group per real office row');
    assert(luis.factions.every(f => !/^:\s/.test(f)),
      'a blank Faction value never emits an empty group');
    assert(!luis.prewrite.anchorFacts.join(' ').includes('unchanged since'),
      'stalling colour must not leak into Luis anchorFacts');
    // (c) unchanged-vs-prev initiatives are not "moved" for Carmen.
    assert(!carmen.trackerFacts.some(f => /SYNTH Stuck Initiative/.test(f)),
      'an unchanged initiative must not appear as a moved row');
    assert(!luis.stalling.some(s => /SYNTH Moved Initiative|SYNTH New Initiative/.test(s)),
      'moved/new initiatives must not appear as stalling');
    // hook filtering: other journalist, other domain, other cycle.
    for (const packet of [carmen, luis]) {
      const name = packet.seat.slug === 'carmen-delaine' ? 'Carmen Delaine' : 'Luis Navarro';
      assert(!packet.hooks.some(h => /someone else/.test(h.text)), 'other-journalist hook excluded (' + name + ')');
      assert(!packet.hooks.some(h => /sports hook/.test(h.text)), 'non-CIVIC hook excluded (' + name + ')');
      assert(!packet.hooks.some(h => /prior-cycle/.test(h.text)), 'prior-cycle hook excluded (' + name + ')');
    }
    const md = civic.formatCivicDomainSliceMarkdown(withDump);
    assert(md.includes('TrackerFacts (beat dump, record facts)'), 'md renders trackerFacts section');
    assert(md.includes('Stalling initiatives'), 'md renders stalling section');
    assert(md.includes('Faction standings'), 'md renders factions section');
    assert(md.includes('SYNTH civic hook for Carmen Delaine'), 'md renders hooks');

    // Fallback: Civic_Office_Ledger rows carry no Faction → Civic_Ledger.jsonl
    // rows are used and tagged [Civic_Ledger].
    const fallbackRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-civic-fallback-'));
    try {
      const fbOut = path.join(fallbackRoot, 'output');
      fs.mkdirSync(fbOut, { recursive: true });
      fs.writeFileSync(path.join(fbOut, 'desk_signal_c103.json'), JSON.stringify({
        lanes: { civic: [{ kind: 'anomaly', ref: 'AUDIT-SYNTH', label: 'SYNTH stuck-initiative test row', hood: 'Fruitvale' }] }
      }, null, 2));
      const fbBeats = path.join(fbOut, 'beats');
      fs.mkdirSync(fbBeats, { recursive: true });
      fs.writeFileSync(path.join(fbBeats, 'meta.json'), JSON.stringify({ cycle: 103 }));
      fs.writeFileSync(path.join(fbBeats, 'Civic_Office_Ledger.jsonl'), [
        { OfficeId: 'MAYOR-01', Title: 'Mayor', Holder: 'SYNTH Mayor Name', Status: 'active', Approval: 62 }
      ].map(row => JSON.stringify(row)).join('\n') + '\n');
      fs.writeFileSync(path.join(fbBeats, 'Civic_Ledger.jsonl'), [
        { OfficeId: 'MAYOR-01', Title: 'Mayor', Holder: 'SYNTH Mayor Name', Faction: 'OPP', VotingPower: 'yes' }
      ].map(row => JSON.stringify(row)).join('\n') + '\n');
      const fbLuis = civic.buildCivicDomainSlice(103, { root: fallbackRoot }).packets['luis-navarro'];
      assert(fbLuis.factions.some(f => /OPP: 1 office \(1 voting\)/.test(f) && /\[Civic_Ledger\]/.test(f)),
        'Civic_Ledger.jsonl factions used when office rows carry no Faction');
    } finally {
      fs.rmSync(fallbackRoot, { recursive: true, force: true });
    }

    // (e) no dump at all → exactly-as-before shape, empty attachments.
    const noDumpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-civic-nodump-'));
    try {
      fs.mkdirSync(path.join(noDumpRoot, 'output'), { recursive: true });
      fs.writeFileSync(path.join(noDumpRoot, 'output', 'desk_signal_c103.json'), JSON.stringify({
        lanes: {
          civic: [
            { kind: 'initiative', ref: 'INIT-SYNTH', label: 'SYNTH Test Initiative | Status active', hood: 'Fruitvale' },
            { kind: 'anomaly', ref: 'AUDIT-SYNTH', label: 'SYNTH stuck-initiative test row', hood: 'Fruitvale' }
          ]
        }
      }, null, 2));
      const withoutDump = civic.buildCivicDomainSlice(103, { root: noDumpRoot });
      const carmenBare = withoutDump.packets['carmen-delaine'];
      const luisBare = withoutDump.packets['luis-navarro'];
      assert.deepStrictEqual(carmenBare.trackerFacts, [], 'no dump → empty trackerFacts');
      assert.deepStrictEqual(carmenBare.hooks, [], 'no dump → empty hooks');
      assert.deepStrictEqual(carmenBare.prewrite.anchorFacts,
        ['SYNTH Test Initiative | Status active', 'INIT-SYNTH'],
        'no dump → Carmen anchorFacts exactly as before');
      assert.deepStrictEqual(luisBare.hooks, [], 'no dump → empty hooks (Luis)');
      assert.deepStrictEqual(luisBare.stalling, [], 'no dump → empty stalling');
      assert.deepStrictEqual(luisBare.factions, [], 'no dump → empty factions');
      assert(!civic.formatCivicDomainSliceMarkdown(withoutDump).includes('TrackerFacts'),
        'no dump → md omits the dump sections');
    } finally {
      fs.rmSync(noDumpRoot, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(beatsRoot, { recursive: true, force: true });
  }

  console.log('buildCivicDomainSlice.test.js PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
