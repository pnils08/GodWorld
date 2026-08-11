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
        { kind: 'anomaly', ref: 'AUDIT-STUCK', label: 'stuck-initiative | Fruitvale Transit Hub stalled for 9 cycles', hood: 'Fruitvale' },
        { kind: 'initiative', ref: 'INIT-HEALTH', label: 'Temescal Community Health Center | construction-active', hood: 'Temescal' },
        { kind: 'initiative', ref: 'INIT-YOUTH', label: 'Oakland Youth Apprenticeship Pipeline | pilot-active', hood: 'East Oakland' },
        { kind: 'ripple', ref: 'ENV-1', label: 'environmental air quality review | public comment window', hood: 'West Oakland' },
        { kind: 'culture', ref: 'CULTURE-1', label: 'Named venue event outside the civic package' }
      ]
    }
  }, null, 2));

  const slice = civic.buildCivicDomainSlice(103, { root });
  assert.strictEqual(slice.empty, false);
  assert.strictEqual(slice.packets['angela-reyes'].story.ref, 'INIT-YOUTH');
  assert.strictEqual(slice.packets['trevor-shimizu'].story.ref, 'INIT-TRANSIT');
  assert.strictEqual(slice.packets['luis-navarro'].story.ref, 'AUDIT-STUCK');
  assert.strictEqual(slice.packets['lila-mezran'].story.ref, 'INIT-HEALTH');
  assert.strictEqual(slice.packets['noah-tan'].story.ref, 'ENV-1');
  assert.strictEqual(slice.packets['carmen-delaine'].story.ref, 'INIT-TRANSIT');
  assert.strictEqual(civic.CIVIC_SEATS['rachel-torres'], undefined, 'Rachel remains on her completed safety slice');
  assert(!slice.packets['angela-reyes'].candidates.some(row => row.ref === 'CULTURE-1'));
  assert(slice.packets['angela-reyes'].pointers.includes('INIT-YOUTH'), 'source ref retained');

  const paths = civic.writeCivicDomainSlice(103, slice, root);
  assert(fs.existsSync(paths.json));
  assert(fs.existsSync(paths.md));
  assert.strictEqual(civic.loadCivicDomainSlice(103, root).packets['angela-reyes'].story.ref, 'INIT-YOUTH');

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
