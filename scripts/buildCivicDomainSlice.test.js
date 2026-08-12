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
        { kind: 'initiative', ref: 'INIT-HEALTH', label: 'Temescal Community Health Center | construction-active', hood: 'Temescal' },
        { kind: 'initiative', ref: 'INIT-YOUTH', label: 'Oakland Youth Apprenticeship Pipeline | pilot-active', hood: 'East Oakland' },
        { kind: 'ripple', ref: 'ENV-1', label: 'environmental air quality review | public comment window', hood: 'West Oakland' },
        { kind: 'culture', ref: 'CULTURE-1', label: 'Named venue event outside the civic package' }
      ]
    }
  }, null, 2));
  fs.writeFileSync(path.join(output, 'simulation_ledger_snapshot.jsonl'), [
    { Name: 'Test Civic Resident', POPID: 'POP-90001', RoleType: 'Mechanic', EconomicProfileKey: 'Skilled Trade' },
    { Name: 'Test Pro Athlete', POPID: 'POP-90002', RoleType: 'Right Fielder, Test Team', EconomicProfileKey: 'SPORTS_OVERRIDE' }
  ].map(row => JSON.stringify(row)).join('\n') + '\n');

  const slice = civic.buildCivicDomainSlice(103, { root });
  assert.strictEqual(slice.empty, false);
  assert.strictEqual(slice.packets['angela-reyes'].story.ref, 'INIT-YOUTH');
  assert.strictEqual(slice.packets['trevor-shimizu'].story.ref, 'INIT-TRANSIT');
  assert.strictEqual(slice.packets['trevor-shimizu'].prewrite.schema, 'SYSTEMS-BRIEF-1');
  assert.strictEqual(slice.packets['trevor-shimizu'].prewrite.method, 'INCIDENT_LINK_WARNING');
  assert.deepStrictEqual(slice.packets['trevor-shimizu'].prewrite.anchorFacts,
    ['Fruitvale Transit Hub | Status visioning-complete']);
  assert.deepStrictEqual(slice.packets['trevor-shimizu'].prewrite.cascade,
    { state: 'UNESTABLISHED', facts: [], link: null, src: null });
  assert(slice.packets['trevor-shimizu'].prewrite.missing.some(row => row.includes('timestamp')));
  assert(!slice.packets['trevor-shimizu'].prewrite.anchorFacts.includes('INIT-TRANSIT'),
    'source pointer must not be duplicated as a factual sentence');
  assert.strictEqual(slice.packets['luis-navarro'].story.ref, 'AUDIT-STUCK');
  assert.strictEqual(slice.packets['luis-navarro'].prewrite.schema, 'INVESTIGATION-BRIEF-1');
  assert.strictEqual(slice.packets['luis-navarro'].prewrite.method, 'KNOWN_UNKNOWN');
  assert.deepStrictEqual(slice.packets['luis-navarro'].prewrite.anchorFacts,
    ['stuck-initiative | Fruitvale Transit Hub stalled for 9 cycles']);
  assert.deepStrictEqual(slice.packets['luis-navarro'].prewrite.silenceClock,
    { state: 'UNESTABLISHED', value: null, src: null });
  assert(slice.packets['luis-navarro'].prewrite.missing.some(row => row.includes('elapsed silence')));
  assert(!slice.packets['luis-navarro'].prewrite.anchorFacts.includes('AUDIT-STUCK'),
    'source pointer must not be duplicated as a factual sentence');
  assert.deepStrictEqual(slice.packets['luis-navarro'].story.popids, ['POP-90001']);
  assert.deepStrictEqual(slice.packets['luis-navarro'].story.citizens,
    ['Test Civic Resident (POP-90001)']);
  assert.deepStrictEqual(slice.packets['luis-navarro'].prewrite.excludedCandidates,
    [{ popid: 'POP-90002', reason: 'PRO_ATHLETE_CIVIC_INELIGIBLE' }]);
  assert.strictEqual(slice.packets['lila-mezran'].story.ref, 'INIT-HEALTH');
  assert.strictEqual(slice.packets['noah-tan'].story.ref, 'ENV-1');
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
  assert.strictEqual(rebuilt.version, 'CIVIC-DOMAIN-SLICE-3');
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
