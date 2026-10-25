#!/usr/bin/env node
/**
 * newsroom-fanout-beat-stale.test.js — the stale-cycle guard (2026-09-09).
 * Beat slices are version-cached per cycle; when the engine cycle has not
 * advanced, prior same-cycle fanouts already carry the seat's story.ref and
 * the seat must drop loudly instead of re-filing the identical story.
 * Keyed persona+ref (2026-09-19): three seats render different slices off one
 * tab ref (Cultural_Ledger @C107 — Celeste/Kai/Sharon), so one seat's ref must
 * never drop another seat (09-18 fanout: Kai + Sharon falsely dropped).
 * Offline: exercises staleBeatRef + the persona+ref key directly (buildFanout
 * needs Sheets; priorBeatRefs reads the fixed output/cron-compare dir).
 */
'use strict';

const { staleBeatRef, priorBeatKey, enrichBeatSeats } = require('./newsroom-fanout');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++; console.error('  FAIL — ' + label);
}

const REF = 'output/beats/Neighborhood_Demographics.jsonl Sick @C106 + Hospital_Ledger.jsonl + Health_Cause_Queue.jsonl';
const filed = new Set([priorBeatKey('lila-mezran', REF)]);

console.log('staleBeatRef:');
const beatAssign = { persona: 'lila-mezran', beatSlice: true, story: { kind: 'beat-health', ref: REF } };

ok('same seat filed this ref in a prior same-cycle fanout → stale', staleBeatRef(beatAssign, filed) === REF);
ok('ref not yet filed → clear', staleBeatRef(beatAssign, new Set([priorBeatKey('lila-mezran', 'output/beats/Other.jsonl @C106')])) === null);
ok('empty filed set → clear', staleBeatRef(beatAssign, new Set()) === null);
ok('non-beat assignment never stale', staleBeatRef({ persona: 'lila-mezran', story: { ref: REF } }, filed) === null);
ok('beat assignment without a ref never stale', staleBeatRef({ persona: 'lila-mezran', beatSlice: true, story: {} }, filed) === null);
ok('missing story never stale', staleBeatRef({ persona: 'lila-mezran', beatSlice: true }, filed) === null);
ok('null assignment never stale', staleBeatRef(null, filed) === null);

// 09-18 regression: Celeste's slice filed the shared tab ref; Kai and Sharon
// draw different slices off the same tab and must stay seated.
const CUL = 'output/beats/Cultural_Ledger.jsonl @C107';
const celesteFiled = new Set([priorBeatKey('celeste-tran', CUL)]);
ok('another seat on the same tab ref → clear (kai)', staleBeatRef({ persona: 'kai-marston', beatSlice: true, story: { ref: CUL } }, celesteFiled) === null);
ok('another seat on the same tab ref → clear (sharon)', staleBeatRef({ persona: 'sharon-okafor', beatSlice: true, story: { ref: CUL } }, celesteFiled) === null);
ok('the seat that filed it → stale (celeste)', staleBeatRef({ persona: 'celeste-tran', beatSlice: true, story: { ref: CUL } }, celesteFiled) === CUL);
ok('bare-ref set (old key shape) never matches', staleBeatRef({ persona: 'kai-marston', beatSlice: true, story: { ref: CUL } }, new Set([CUL])) === null);


// 2026-10-25: a daily record seat whose builder returns null (nothing new today) is dropped — never left
// in the rota as the bare generic assignment (C112 Friday: Tamsin wrote 45 words on the culture packet).
console.log('enrichBeatSeats:');
{
  const quiet = console.error; console.error = () => {};
  const a = [{ persona: 'carmen-delaine', desk: 'civic' }, { persona: 'tamsin-pruitt', desk: 'culture' }, { persona: 'lila-mezran', desk: 'civic' }, { persona: 'no-builder-seat', desk: 'sports' }];
  const loader = slug => ({ enrichAssignment: (assign) =>
    slug === 'tamsin-pruitt' ? null
      : slug === 'lila-mezran' ? Object.assign({}, assign, { beatSlice: true, pulse: { className: 'beat-health', hood: 'Chinatown' }, story: { kind: 'beat-health', ref: REF } })
      : assign });
  const res = enrichBeatSeats(a, 112, new Set(), loader);
  console.error = quiet;
  ok('null from the builder → seat dropped, reason recorded', !a.some(x => x.persona === 'tamsin-pruitt') && res.dropped.some(d => /tamsin-pruitt: empty slice/.test(d)));
  ok('a seat with a slice is enriched in place', a.find(x => x.persona === 'lila-mezran').beatSlice === true && res.enriched && /lila-mezran\/beat-health:Chinatown/.test(res.reason));
  ok('a builder seat with no slice stays as the bare assignment (not null, not enriched)', a.some(x => x.persona === 'carmen-delaine' && !x.beatSlice));
  ok('a persona outside BEAT_BUILDERS is untouched', a.some(x => x.persona === 'no-builder-seat'));
  const b = [{ persona: 'lila-mezran', desk: 'civic' }];
  console.error = () => {};
  const r2 = enrichBeatSeats(b, 112, new Set([priorBeatKey('lila-mezran', REF)]), loader);
  console.error = quiet;
  ok('a slice whose ref was already filed this Cycle is dropped as stale', b.length === 0 && /stale slice/.test(r2.dropped[0]));
}

if (failures) {
  console.error('\nnewsroom-fanout-beat-stale tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nnewsroom-fanout-beat-stale tests: PASS');
