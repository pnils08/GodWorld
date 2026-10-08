'use strict';

const assert = require('assert');
const { scanEngineVerbiage, scanPopidLeak } = require('./cron-rhea-gate');

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
// cls added by the gate re-scope (2cc23cee) — §4.7 token-class separation
assert.deepStrictEqual(scanEngineVerbiage(proseLeak), [
  { cls: 'system-vocab', token: 'Initiative_Tracker', count: 1 },
]);

// Prose POPIDs block; INTAKE-register POPIDs do not (builder 2026-10-08: names in
// the news, IDs are not contamination — the register is a machine sidecar).
const proseWithPop = [
  '# Headline',
  '',
  'POP-00022 took the mound on Friday.',
  '',
  '## INTAKE',
  'CLAIM: A claim | cite POP-00031',
].join('\n');
assert.deepStrictEqual(scanPopidLeak(proseWithPop), ['POP-00022']);

const intakeOnlyPop = [
  '# Headline',
  '',
  'Danny Horn took the mound on Friday.',
  '',
  '## INTAKE',
  'CLAIM: Danny Horn — nine seasons | output/player_truesource_mirror.json POP-00022 @C110',
].join('\n');
assert.deepStrictEqual(scanPopidLeak(intakeOnlyPop), []);

// A whole-doc fence must never blank the scan: prose POPID inside it still blocks,
// INTAKE inside it still exempt.
assert.deepStrictEqual(scanPopidLeak('```markdown\n' + proseWithPop + '\n```'), ['POP-00022']);
assert.deepStrictEqual(scanPopidLeak('```markdown\n' + intakeOnlyPop + '\n```'), []);
// A code sample inside prose is skipped, as before.
assert.deepStrictEqual(scanPopidLeak('Plain.\n\n```\nPOP-00022\n```\n\n## INTAKE\nHOOD: Uptown'), []);

console.log('cron-rhea-gate tests passed');
