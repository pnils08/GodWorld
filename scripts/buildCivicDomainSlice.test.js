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
    { Name: 'Test Pro Athlete', POPID: 'POP-90002', RoleType: 'Right Fielder, Test Team', EconomicProfileKey: 'SPORTS_OVERRIDE' }
  ].map(row => JSON.stringify(row)).join('\n') + '\n');
  fs.writeFileSync(path.join(output, 'world_summary_c103.md'),
    '# World Summary — Cycle 103\n\n**Season:** Winter | **Weather:** 49°F overcast, NW 11 mph, overcast (frontState OVERCAST), humidity 67, visibility 10\n\n## Who Lived It (cycle 103)\n\n### Relationship (1)\n- POP-90001 Test Civic Resident — relied on familiar social circles during cold period (Fruitvale)\n');

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
  assert.strictEqual(slice.packets['luis-navarro'].story.ref, 'AUDIT-INCOHERE');
  assert(!slice.packets['luis-navarro'].candidates.some(row => /stuck-initiative/i.test(row.label + ' ' + row.ref)),
    'stuck-initiative is a civic decision demand, not a newsroom assignment');
  assert.strictEqual(slice.packets['luis-navarro'].prewrite.schema, 'INVESTIGATION-BRIEF-1');
  assert.strictEqual(slice.packets['luis-navarro'].prewrite.method, 'KNOWN_UNKNOWN');
  assert.deepStrictEqual(slice.packets['luis-navarro'].prewrite.anchorFacts,
    ['incoherence | OARI listed operational while CrimeIndex contradicts']);
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
  assert.strictEqual(slice.packets['lila-mezran'].story.ref, 'INIT-HEALTH');
  assert.strictEqual(slice.packets['lila-mezran'].story.label,
    'Construction is active for Temescal Community Health Center.');
  assert.strictEqual(slice.packets['lila-mezran'].prewrite.schema, 'HEALTH-SERVICE-BRIEF-1');
  assert.strictEqual(slice.packets['lila-mezran'].prewrite.method, 'ACCESS_TIMELINE_HUMAN_COST');
  assert.deepStrictEqual(slice.packets['lila-mezran'].prewrite.humanConsequence,
    { state: 'UNESTABLISHED', subjects: [], facts: [], src: null });
  assert(slice.packets['lila-mezran'].prewrite.missing.some(row => row.includes('diagnosis')));
  assert(!/construction-active|Status passed|phase/i.test(JSON.stringify({
    story: slice.packets['lila-mezran'].story,
    prewrite: slice.packets['lila-mezran'].prewrite.anchorFacts
  })));
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
  assert.strictEqual(slice.packets['noah-tan'].seat.popid, 'POP-00157');
  assert.strictEqual(slice.packets['noah-tan'].story.ref, 'output/world_summary_c103.md ## Who Lived It');
  assert.match(slice.packets['noah-tan'].story.label, /Test Civic Resident/);
  assert.strictEqual(slice.packets['noah-tan'].prewrite.schema, 'SEASON-FEEL-1');
  assert.strictEqual(slice.packets['noah-tan'].prewrite.method, 'WHAT_MOVED_ON_DAYS_LIKE_THIS');
  assert(!/frontState|49°F|opened in winter/i.test(slice.packets['noah-tan'].story.label));
  assert.strictEqual(slice.packets['noah-tan'].prewrite.impactEvidence.state, 'SUPPLIED');
  assert.deepStrictEqual(slice.packets['noah-tan'].prewrite.impactEvidence.subjects, ['POP-90001']);
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
  assert.strictEqual(rebuilt.version, 'CIVIC-DOMAIN-SLICE-4');
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
