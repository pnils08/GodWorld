/**
 * measureRemedies.test.js — standalone test for Phase 38.5 enricher.
 *
 * Run: node scripts/engine-auditor/measureRemedies.test.js
 * Exits 0 on pass, 1 on failure.
 */

const fs = require('fs');
const path = require('path');
const measureRemedies = require('./measureRemedies');

const fixturePath = path.join(__dirname, 'fixtures', 'engine_audit_c90_temescal.json');
const priorAudit = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: no-prior-audit — empty ctx.prior');
{
  const patterns = [{ type: 'stuck-initiative', affectedEntities: { initiatives: ['INIT-005'], neighborhoods: ['Temescal'] } }];
  const ctx = { cycle: 91, prior: [], snapshot: {} };
  measureRemedies.enrich(patterns, ctx);
  assert('measurement.available === false', patterns[0].measurement.available === false);
  assert("measurement.reason === 'no-prior-audit'", patterns[0].measurement.reason === 'no-prior-audit');
  assert('measurementHistory empty', (ctx.measurementHistory || []).length === 0);
}

console.log('\nTest 2: remedy-not-firing — Temescal sentiment unchanged');
{
  const patterns = [{
    type: 'stuck-initiative',
    severity: 'high',
    affectedEntities: { initiatives: ['INIT-005'], neighborhoods: ['Temescal'] },
  }];
  const ctx = {
    cycle: 91,
    prior: [priorAudit],
    snapshot: {
      Neighborhood_Map: [{ Neighborhood: 'Temescal', Sentiment: 0.42, RetailVitality: 0.50 }],
    },
  };
  measureRemedies.enrich(patterns, ctx);
  const m = patterns[0].measurement;
  assert('measurement.available === true', m.available === true, JSON.stringify(m));
  assert('priorCycle === 90', m.priorCycle === 90);
  assert("expectedField === 'Neighborhood_Map.Sentiment'", m.expectedField === 'Neighborhood_Map.Sentiment');
  assert('expected === 0.05', m.expected === 0.05);
  assert('observed === 0', m.observed === 0);
  assert('delta === -0.05', m.delta === -0.05);
  assert("verdict === 'remedy-not-firing'", m.verdict === 'remedy-not-firing', m.verdict);
  assert("priorRemedyType === 'advance-initiative'", m.priorRemedyType === 'advance-initiative');
  assert('measurementHistory has 1 entry', (ctx.measurementHistory || []).length === 1);
}

console.log('\nTest 3: remedy-firing-as-expected — Temescal sentiment +0.05');
{
  const patterns = [{
    type: 'stuck-initiative',
    severity: 'high',
    affectedEntities: { initiatives: ['INIT-005'], neighborhoods: ['Temescal'] },
  }];
  const ctx = {
    cycle: 91,
    prior: [priorAudit],
    snapshot: {
      Neighborhood_Map: [{ Neighborhood: 'Temescal', Sentiment: 0.47, RetailVitality: 0.50 }],
    },
  };
  measureRemedies.enrich(patterns, ctx);
  const m = patterns[0].measurement;
  assert("verdict === 'remedy-firing-as-expected'", m.verdict === 'remedy-firing-as-expected', m.verdict);
  assert('observed === 0.05', m.observed === 0.05);
  assert('delta === 0', m.delta === 0);
}

console.log('\nTest 4: remedy-overshot — Temescal sentiment +0.20');
{
  const patterns = [{
    type: 'stuck-initiative',
    severity: 'high',
    affectedEntities: { initiatives: ['INIT-005'], neighborhoods: ['Temescal'] },
  }];
  const ctx = {
    cycle: 91,
    prior: [priorAudit],
    snapshot: {
      Neighborhood_Map: [{ Neighborhood: 'Temescal', Sentiment: 0.62, RetailVitality: 0.50 }],
    },
  };
  measureRemedies.enrich(patterns, ctx);
  const m = patterns[0].measurement;
  assert("verdict === 'remedy-overshot'", m.verdict === 'remedy-overshot', m.verdict);
}

console.log('\nTest 5: remedy-firing-insufficient — Temescal sentiment +0.02');
{
  const patterns = [{
    type: 'stuck-initiative',
    severity: 'high',
    affectedEntities: { initiatives: ['INIT-005'], neighborhoods: ['Temescal'] },
  }];
  const ctx = {
    cycle: 91,
    prior: [priorAudit],
    snapshot: {
      Neighborhood_Map: [{ Neighborhood: 'Temescal', Sentiment: 0.44, RetailVitality: 0.50 }],
    },
  };
  measureRemedies.enrich(patterns, ctx);
  const m = patterns[0].measurement;
  assert("verdict === 'remedy-firing-insufficient'", m.verdict === 'remedy-firing-insufficient', m.verdict);
}

console.log('\nTest 6: no-prior-match — pattern has no counterpart in prior');
{
  const patterns = [{
    type: 'stuck-initiative',
    affectedEntities: { initiatives: ['INIT-999'], neighborhoods: ['Lake Merritt'] },
  }];
  const ctx = { cycle: 91, prior: [priorAudit], snapshot: {} };
  measureRemedies.enrich(patterns, ctx);
  assert('measurement.available === false', patterns[0].measurement.available === false);
  assert("reason === 'no-prior-match'", patterns[0].measurement.reason === 'no-prior-match');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
