'use strict';
// Synthetic local fixtures only; no cron entrypoint, model call or external writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const run = require('./cron-civic-run');
const slice = require('./buildCivicOfficeSlice');
const { INTERVENTION_CATALOG: catalog } = require('../lib/initiativePhaseContract');
const office = { officeId: 'COUNCIL-D5', agentDir: 'SYNTHETIC-seat', district: 'D5' };
function workspace(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'civic-review-synthetic-'));
  const write = (file, value) => { const dest = path.join(root, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, value); };
  try { fn(root, write); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
test('F1 inherited and malformed interventions cannot consume the valid move', () => {
  const proposal = intervention => ({ type: 'propose', intervention, title: 'SYNTHETIC', problem: 'SYNTHETIC', hoods: ['East Oakland'] });
  const malformed = { ...catalog, broken: { policyDomain: 'health' }, shape: { playable: true, policyDomain: 'health' } };
  for (const key of ['constructor', 'toString', '__proto__', ['health-service'], 'broken', 'shape', 'housing-program']) {
    const result = run.validateDatawakeMoves([proposal(key), proposal('health-service')], { office, catalog: malformed });
    assert.equal(result.rejected.length, 1);
    assert.equal(result.accepted[0].payload.intervention, 'health-service');
  }
});
