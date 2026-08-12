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

const proseLeak = provenanceOnly.replace(
  'The supplied public record describes a delayed initiative.',
  'Initiative_Tracker describes a delayed initiative.'
);
assert.deepStrictEqual(scanEngineVerbiage(proseLeak), [
  { token: 'Initiative_Tracker', count: 1 },
]);

console.log('cron-rhea-gate tests passed');
