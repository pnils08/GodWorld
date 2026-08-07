#!/usr/bin/env node
/**
 * Stink scanner tests — offline, no Sheets, no model (grok 2026-08-06).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  scanSignal,
  scoreEntry,
  parseIllnessRate,
  illnessCandidate,
  recentForceCount,
  FORCE_THRESHOLD,
  scanCycle
} = require('./stink-scanner');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
}
function eq(label, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label + '\n    got:  ' + g + '\n    want: ' + w);
}

console.log('scoreEntry / scanSignal:');
const highDecay = {
  kind: 'anomaly',
  ref: 'audit patterns[9]',
  label: 'math-imbalance (high) | Jack London: decay [Sentiment -0.190, RetailVitality -1.90] with no matching active initiative',
  hood: 'Jack London',
  popids: ['POP-00001'],
  handle: { angle: 'Jack London bleeding', hookLine: 'No initiative', citizens: ['A'] }
};
const scored = scoreEntry(highDecay, 'civic');
ok('high math-imbalance scores', scored && scored.score >= FORCE_THRESHOLD);
eq('class is metric-contradiction', scored.className, 'metric-contradiction');
ok('story carries stinkClass', scored.story.stinkClass === 'metric-contradiction');

const feed = { kind: 'feed', ref: 'sports', label: "A's win", handle: null };
eq('sports feed skipped', scoreEntry(feed, 'sports'), null);

const stuck = {
  kind: 'anomaly',
  ref: 'audit patterns[0]',
  label: 'stuck-initiative (medium) | Fruitvale Transit Hub Phase II in construction-planning for 5 cycles',
  hood: 'Fruitvale',
  handle: { angle: 'stuck hub' }
};
const stuckS = scoreEntry(stuck, 'civic');
ok('stuck medium is force-eligible', stuckS && stuckS.score >= FORCE_THRESHOLD);

const lowOnly = {
  kind: 'anomaly',
  ref: 'x',
  label: 'something (low) | minor blip'
};
const lowS = scoreEntry(lowOnly, 'civic');
// low (10) + anomaly (5) = 15 — below threshold but still a candidate
ok('low anomaly still scored as candidate', lowS && lowS.score >= 10 && lowS.score < FORCE_THRESHOLD);

const lanes = {
  civic: [highDecay, stuck],
  business: [{ ...highDecay, desk: 'business' }] // same ref — dedup
};
const scanned = scanSignal(lanes);
eq('dedup same ref across desks', scanned.candidates.length, 2);
ok('top is highest score', scanned.top.ref === highDecay.ref);
ok('maxScore matches top', scanned.maxScore === scanned.top.score);

console.log('illness:');
eq('parse Illness 9.9%', parseIllnessRate('Snapshot: Cycle 102 | Illness 9.9% | Employment 90%'), 9.9);
eq('parse Illness rate form', parseIllnessRate('- **Population:** 386,587 | Illness rate 9.9% | Employment 90.0%'), 9.9);
eq('missing illness null', parseIllnessRate('no rate here'), null);
const ill = illnessCandidate(102, 9.9);
ok('9.9% illness is force-eligible', ill && ill.score >= FORCE_THRESHOLD);
eq('sub-8% no candidate', illnessCandidate(102, 7.5), null);

console.log('recentForceCount:');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stink-fanout-'));
fs.writeFileSync(path.join(dir, 'fanout-2026-08-01.json'), JSON.stringify({
  assignments: [{ name: 'Jax Caldera', stinkForce: true }]
}));
fs.writeFileSync(path.join(dir, 'fanout-2026-08-05.json'), JSON.stringify({
  assignments: [{ name: 'Carmen Delaine' }]
}));
const rc = recentForceCount(dir, 7, '2026-08-06');
eq('one force in window', rc.count, 1);
eq('force date recorded', rc.dates, ['2026-08-01']);
const rc0 = recentForceCount(dir, 7, '2026-08-20');
eq('outside window zero', rc0.count, 0);

console.log('scanCycle offline root:');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stink-root-'));
fs.mkdirSync(path.join(root, 'output'), { recursive: true });
fs.writeFileSync(path.join(root, 'output', 'desk_signal_c102.json'), JSON.stringify({
  lanes: { civic: [highDecay] }
}));
fs.writeFileSync(path.join(root, 'output', 'world_summary_c102.md'),
  'Snapshot: Cycle 102 | Illness 9.9% | Employment 90.0%\n');
const full = scanCycle(102, { root });
ok('shouldForce true on c102-like fixture', full.shouldForce === true);
ok('illnessRate parsed', full.illnessRate === 9.9);
ok('candidates include signal and/or illness', full.candidateCount >= 1);

fs.rmSync(dir, { recursive: true, force: true });
fs.rmSync(root, { recursive: true, force: true });

if (failures) {
  console.error('\nstink-scanner tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nstink-scanner tests: PASS');
