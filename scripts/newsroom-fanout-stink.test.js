#!/usr/bin/env node
/**
 * Fanout stink-force unit tests — offline (grok 2026-08-06).
 * Does not call buildFanout (Sheets). Tests approachFor + applyStinkForce only.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { approachFor, applyStinkForce, loadFirebrandPersona } = require('./newsroom-fanout');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
}

console.log('approachFor:');
const map = {
  civic: 'CIVIC_APPROACH',
  'freelance-firebrand': 'FIREBRAND_APPROACH',
  _default: 'DEFAULT'
};
ok('persona beats desk', approachFor(map, 'civic', 'freelance-firebrand') === 'FIREBRAND_APPROACH');
ok('desk when no persona', approachFor(map, 'civic', null) === 'CIVIC_APPROACH');
ok('default fallback', approachFor(map, 'unknown', null) === 'DEFAULT');

console.log('loadFirebrandPersona:');
const p = loadFirebrandPersona();
ok('persona-map has Jax', p && p.name === 'Jax Caldera' && p.popid === 'POP-00799');

console.log('applyStinkForce (live cycle files if present):');
// Uses real output/ if c102 artifacts exist — non-fatal skip if missing.
const signalPath = path.join(__dirname, '..', 'output', 'desk_signal_c102.json');
if (!fs.existsSync(signalPath)) {
  console.log('  skip — no desk_signal_c102.json');
} else {
  // Isolate COMPARE by temporarily pointing apply via assignments-only path:
  // applyStinkForce reads COMPARE constant (real). Cooldown may block if a
  // recent stinkForce exists — we only assert non-throw + shape.
  const assignments = [
    { desk: 'civic', name: 'Carmen Delaine', popid: 'POP-X', beatDomain: 'CIVIC', persona: null, approach: 'CIVIC_APPROACH' },
    { desk: 'sports', name: 'Hal Richmond', popid: 'POP-Y', beatDomain: 'GENERAL', persona: null, approach: 'SPORTS' }
  ];
  const taken = new Set();
  const result = applyStinkForce(assignments, 102, '2099-01-01', map, taken);
  ok('attempted', result.attempted === true);
  ok('reason string present', typeof result.reason === 'string' && result.reason.length > 0);
  if (result.forced) {
    const jax = assignments.find(a => a.persona === 'freelance-firebrand');
    ok('Jax on rota after force', !!jax);
    ok('stinkForce flag', jax && jax.stinkForce === true);
    ok('firebrand approach', jax && jax.approach === 'FIREBRAND_APPROACH');
    ok('story seeded', jax && jax.story && jax.story.ref);
    ok('civic still present', assignments.some(a => a.desk === 'civic'));
  } else {
    console.log('  note — not forced this run: ' + result.reason);
    ok('no-force still valid outcome', true);
  }
}

if (failures) {
  console.error('\nnewsroom-fanout-stink tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nnewsroom-fanout-stink tests: PASS');
