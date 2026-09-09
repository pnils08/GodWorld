#!/usr/bin/env node
/**
 * newsroom-fanout-beat-stale.test.js — the stale-cycle guard (2026-09-09).
 * Beat slices are version-cached per cycle; when the engine cycle has not
 * advanced, prior same-cycle fanouts already carry the seat's story.ref and
 * the seat must drop loudly instead of re-filing the identical story.
 * Offline: exercises staleBeatRef directly (buildFanout needs Sheets).
 */
'use strict';

const { staleBeatRef } = require('./newsroom-fanout');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++; console.error('  FAIL — ' + label);
}

const REF = 'output/beats/Neighborhood_Demographics.jsonl Sick @C106 + Hospital_Ledger.jsonl + Health_Cause_Queue.jsonl';

console.log('staleBeatRef:');
const beatAssign = { persona: 'lila-mezran', beatSlice: true, story: { kind: 'beat-health', ref: REF } };

ok('ref filed in a prior same-cycle fanout → stale', staleBeatRef(beatAssign, new Set([REF])) === REF);
ok('ref not yet filed → clear', staleBeatRef(beatAssign, new Set(['output/beats/Other.jsonl @C106'])) === null);
ok('empty taken set → clear', staleBeatRef(beatAssign, new Set()) === null);
ok('non-beat assignment never stale', staleBeatRef({ persona: 'carmen-delaine', story: { ref: REF } }, new Set([REF])) === null);
ok('beat assignment without a ref never stale', staleBeatRef({ persona: 'lila-mezran', beatSlice: true, story: {} }, new Set([REF])) === null);
ok('missing story never stale', staleBeatRef({ persona: 'lila-mezran', beatSlice: true }, new Set([REF])) === null);
ok('null assignment never stale', staleBeatRef(null, new Set([REF])) === null);

if (failures) {
  console.error('\nnewsroom-fanout-beat-stale tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nnewsroom-fanout-beat-stale tests: PASS');
