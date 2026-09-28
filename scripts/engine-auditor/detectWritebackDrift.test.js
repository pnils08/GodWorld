/**
 * detectWritebackDrift.test.js — v1.2.0: the flat-approval check is retired (engine.266).
 *
 * Run: node scripts/engine-auditor/detectWritebackDrift.test.js
 * Exits 0 on pass, 1 on failure.
 */

const detector = require('./detectWritebackDrift');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function makeAudit(cycle, snap) {
  return { cycle, snapshots: snap };
}

console.log('Test 1: flat council/mayor approvals are the level model, not drift (engine.266)');
{
  const council = [
    { OfficeId: 'MAYOR-OAK', Approval: 65 },
    ...Array.from({ length: 9 }, (_, i) => ({ OfficeId: `COUNCIL-D${i + 1}`, Approval: 65 })),
    ...Array.from({ length: 990 }, (_, i) => ({ OfficeId: `STAFF-${i}`, Approval: 65 })),
  ];
  const ctx = {
    cycle: 93,
    snapshot: {
      Edition_Coverage_Ratings: [{ Cycle: '92', Domain: 'CIVIC' }],
      Neighborhood_Map: [],
      Civic_Office_Ledger: council,
    },
    prior: [makeAudit(92, { Neighborhood_Map: [], Civic_Office_Ledger: council })],
  };
  const found = detector.detect(ctx);
  assert('every elected seat flat week-on-week emits no Civic_Office_Ledger pattern',
    !found.find(p => p.evidence && p.evidence.sheet === 'Civic_Office_Ledger'));
}

console.log('\nTest 4: no last-cycle coverage = no pattern (gate condition)');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Edition_Coverage_Ratings: [{ Cycle: '90', Domain: 'CIVIC' }],
      Neighborhood_Map: [],
      Civic_Office_Ledger: Array.from({ length: 9 }, (_, i) => ({ OfficeId: `COUNCIL-D${i + 1}`, Approval: 65 })),
    },
    prior: [],
  };
  const found = detector.detect(ctx);
  assert('no last-cycle coverage = early return = no patterns', found.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
