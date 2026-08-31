/**
 * lintCivicPackets.test.js — ES-2 step 2 (G-PREP5), S257
 *
 * Calibrated against real C97 phrasings: telemetry leaks must FAIL; legit civic
 * prose (money, vote counts, district codes, project "Phase II", "economic
 * engine" metaphor) must stay clean.
 */

'use strict';

var assert = require('assert');
var { lintText } = require('./lintCivicPackets.js');

function rules(text) { return lintText(text).map(function (i) { return i.rule; }); }

function passing(name, fn) {
  try { fn(); console.log('  PASS  ' + name); return 1; }
  catch (e) { console.error('  FAIL  ' + name + '\n        ' + (e.message || e)); return 0; }
}

var total = 0, passed = 0;
console.log('\n[ES-2 step 2] lintCivicPackets — civic packet telemetry gate\n');

// --- must FAIL (real engine_review_c97 leak phrasings) ---
var LEAKS = [
  ['sigma', 'Crime in West Oakland fell 3.3σ below the baseline.'],
  ['signed-delta', 'Sentiment moved +0.11 this cycle, then +0.25.'],
  ['phase-code', 'Flagged by phase05 of the run.'],
  ['engine-tag', 'Per the latest reading (engine review) the district held.'],
  ['engine-tag', 'Engine: stable across the board.'],
  ['code-span', 'The `cityDynamics` signal recovered.'],
  ['metric-phrase', 'The civic load on the district eased.'],
  ['metric-decimal', 'Momentum reads 0.62 across the corridor.'],
];
LEAKS.forEach(function (pair) {
  total++; passed += passing('FAIL leak [' + pair[0] + ']: "' + pair[1].slice(0, 38) + '..."', function () {
    var r = rules(pair[1]);
    assert.ok(r.includes(pair[0]), 'expected rule ' + pair[0] + ' to fire, got ' + JSON.stringify(r));
  });
});

// --- must stay CLEAN (legit civic prose) ---
var CLEAN = [
  // civic.26 (Mike-direct): a city tracks and publishes these. An official
  // quoting one is not an engine leak, and the gate must not fail canon on it.
  // "0.42 sentiment" blocked the entire C104 apply before this ruling.
  'Sentiment in the district sits at 0.42 by our own survey.',
  'Approval sits at 0.62 in the district.',
  'The severity of the outage rated 2.5 on the county scale.',
  'Community tension measured 1.8 in the last listening session.',
  'The Baylight District represents a $2.1B investment over ten years.',
  'The apprenticeship bill passed 5-4 after the D5 council member switched.',
  'The Fruitvale Transit Hub enters Phase II this cycle.',
  'Oakland remains the economic engine of the region; the growth engine is small business.',
  'OARI will reach all districts; the $12.5M program hires 45 crisis responders.',
  'The fund disbursed $5.6 million to 31 households across District 9.',
  'Council President Vega (D4) and Tran (D2) hold the independent center.',
  'Phase 1 closed with HCAI seismic approval — HCAI stamped Sheet S-7.3 at 4:37 PM yesterday.',
  'Sheet S-7.3 approval is pending the seismic reviewer signature.',
];
CLEAN.forEach(function (txt) {
  total++; passed += passing('CLEAN: "' + txt.slice(0, 44) + '..."', function () {
    var r = rules(txt);
    assert.strictEqual(r.length, 0, 'expected no leaks, got ' + JSON.stringify(r));
  });
});

console.log('\n[ES-2 step 2] ' + passed + '/' + total + ' assertions passed');
process.exit(passed === total ? 0 : 1);
