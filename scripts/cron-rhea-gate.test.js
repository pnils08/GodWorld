'use strict';

const assert = require('assert');
const { scanEngineVerbiage } = require('./cron-rhea-gate');

const provenanceOnly = [
  '# Test-only brief',
  '',
  'The supplied public record describes a delayed initiative.',
  '',
  '## INTAKE',
  'CLAIM: Test-only claim | Initiative_Tracker (InitiativeID=TEST-ONLY)',
].join('\n');

assert.deepStrictEqual(scanEngineVerbiage(provenanceOnly), []);

// Ledger terms are not contamination (builder 2026-09-20 S426, restated 2026-10-18): a table
// name, a field name or a POPID in prose is the city's own vocabulary — no hit.
const proseLedgerWords = provenanceOnly.replace(
  'The supplied public record describes a delayed initiative.',
  'Initiative_Tracker describes a delayed initiative; POP-00022 took the mound on Friday.'
);
assert.deepStrictEqual(scanEngineVerbiage(proseLedgerWords), []);

// The fourth wall is the only scan: the city framed as a simulation.
const fourthWall = provenanceOnly.replace(
  'The supplied public record describes a delayed initiative.',
  'The whole city is a simulation and the initiative is simulated.'
);
assert.deepStrictEqual(scanEngineVerbiage(fourthWall), [
  { token: 'simulation', count: 1, cls: 'fourth-wall' },
  { token: 'simulated', count: 1, cls: 'fourth-wall' },
]);

// A whole-doc fence must never blank the scan.
assert.deepStrictEqual(scanEngineVerbiage('```markdown\n' + fourthWall + '\n```').length, 2);
// A code sample inside prose is skipped, as before.
assert.deepStrictEqual(scanEngineVerbiage('Plain.\n\n```\nsimulation\n```\n\n## INTAKE\nHOOD: Uptown'), []);

console.log('cron-rhea-gate tests passed');
