#!/usr/bin/env node
/**
 * Submission-budget contract tests — scripts/submissionBudget.test.js
 * (headless plan "What's left" #2, S339)
 *
 * Offline, no Sheets, no model calls. Proves:
 *   1. stagedTally counts only the requested cycle's staged.json files and
 *      tallies per-byline (malformed files skipped, missing dir = zero).
 *   2. bylinePreference is a SOFT no-repeat: fresh bylines outrank staged ones
 *      regardless of LRU; when every candidate has filed (heavy civic cycle),
 *      it degrades to least-staged → LRU → name instead of dropping anyone.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { stagedTally, bylinePreference } = require('./newsroom-fanout');

let failures = 0;
function assertEq(label, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label + '\n    got:  ' + g + '\n    want: ' + w);
}

// --- 1. stagedTally ---------------------------------------------------------
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'staged-test-'));
const put = (name, obj) => fs.writeFileSync(path.join(dir, name), JSON.stringify(obj));
put('a.staged.json', { cycle: 103, byline: 'Carmen Delaine' });
put('b.staged.json', { cycle: 103, byline: 'Carmen Delaine' });
put('c.staged.json', { cycle: 103, byline: 'Luis Navarro' });
put('d.staged.json', { cycle: 102, byline: 'Jax Caldera' });      // other cycle — excluded
put('e.staged.json', { cycle: 103 });                             // no byline — counts total only
fs.writeFileSync(path.join(dir, 'f.staged.json'), '{not json');   // malformed — skipped
fs.writeFileSync(path.join(dir, 'g.rhea.json'), '{}');            // wrong suffix — ignored

console.log('stagedTally:');
const t = stagedTally(103, dir);
assertEq('total counts cycle-103 staged files only', t.total, 4);
assertEq('per-byline tally', t.byByline, { 'Carmen Delaine': 2, 'Luis Navarro': 1 });
assertEq('string/number cycle match', stagedTally('103', dir).total, 4);
assertEq('missing dir is zero, not a crash', stagedTally(103, path.join(dir, 'nope')), { total: 0, byByline: {} });

// --- 2. bylinePreference ----------------------------------------------------
console.log('bylinePreference:');
const A = { name: 'Angela Reyes' };    // staged 0, worked recently
const B = { name: 'Noah Tan' };        // staged 1, never worked
const C = { name: 'Carmen Delaine' };  // staged 2, never worked
const hist = { 'Angela Reyes': { count: 5, last: '2026-07-26' } };

const cmp1 = bylinePreference({ 'Noah Tan': 1, 'Carmen Delaine': 2 }, hist);
assertEq('fresh byline beats staged byline despite LRU', [C, B, A].sort(cmp1).map(j => j.name),
  ['Angela Reyes', 'Noah Tan', 'Carmen Delaine']);

const cmp2 = bylinePreference({ 'Angela Reyes': 1, 'Noah Tan': 1, 'Carmen Delaine': 2 }, hist);
assertEq('all staged → least-staged first, then LRU (soft fallback, nobody dropped)',
  [A, C, B].sort(cmp2).map(j => j.name), ['Noah Tan', 'Angela Reyes', 'Carmen Delaine']);

const cmp3 = bylinePreference({}, {});
assertEq('no history at all → stable name order', [B, A].sort(cmp3).map(j => j.name),
  ['Angela Reyes', 'Noah Tan']);

fs.rmSync(dir, { recursive: true, force: true });
if (failures) { console.error('\nsubmission-budget tests: ' + failures + ' FAILURE(S)'); process.exit(1); }
console.log('\nsubmission-budget tests: PASS');
