/**
 * detectWritebackDrift.test.js — coverage for v1.1.0 council/mayor filter.
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

console.log('Test 1: council-only filter — DA/PD/STAFF rows ignored');
{
  // 999 rows total, but only ^COUNCIL/^MAYOR should be counted. If 9 council
  // rows are flat (typical) plus 990 non-council flat, we should see no
  // pattern (only 9 council flat, below threshold of 7).
  const council = [
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
    prior: [makeAudit(92, {
      Neighborhood_Map: [],
      Civic_Office_Ledger: council,
    })],
  };
  const found = detector.detect(ctx);
  // 9 council flat is above the threshold of 7, but importantly STAFF rows
  // are NOT counted. Verify the flatApprovalCount === 9, not 999.
  const councilDrift = found.find(p => p.evidence && p.evidence.sheet === 'Civic_Office_Ledger');
  if (councilDrift) {
    assert('flatApprovalCount = 9 (not 999)',
      councilDrift.evidence.fields.flatApprovalCount === 9,
      `got ${councilDrift.evidence.fields.flatApprovalCount}`);
  } else {
    assert('council pattern emitted (9 flat >= threshold 7)', false, 'no council pattern');
  }
}

console.log('\nTest 2: 5 council flat — below threshold 7, no pattern');
{
  const council = [
    ...Array.from({ length: 5 }, (_, i) => ({ OfficeId: `COUNCIL-D${i + 1}`, Approval: 65 })),
    ...Array.from({ length: 4 }, (_, i) => ({ OfficeId: `COUNCIL-D${i + 6}`, Approval: 65 + i })),
    ...Array.from({ length: 990 }, (_, i) => ({ OfficeId: `STAFF-${i}`, Approval: 65 })),
  ];
  const priorCouncil = [
    ...Array.from({ length: 5 }, (_, i) => ({ OfficeId: `COUNCIL-D${i + 1}`, Approval: 65 })),
    ...Array.from({ length: 4 }, (_, i) => ({ OfficeId: `COUNCIL-D${i + 6}`, Approval: 60 + i })),
    ...Array.from({ length: 990 }, (_, i) => ({ OfficeId: `STAFF-${i}`, Approval: 65 })),
  ];
  const ctx = {
    cycle: 93,
    snapshot: {
      Edition_Coverage_Ratings: [{ Cycle: '92', Domain: 'CIVIC' }],
      Neighborhood_Map: [],
      Civic_Office_Ledger: council,
    },
    prior: [makeAudit(92, { Neighborhood_Map: [], Civic_Office_Ledger: priorCouncil })],
  };
  const found = detector.detect(ctx);
  const councilDrift = found.find(p => p.evidence && p.evidence.sheet === 'Civic_Office_Ledger');
  assert('5 council flat below threshold; no pattern emitted', !councilDrift);
}

console.log('\nTest 3: MAYOR-* row also counted (not just COUNCIL-*)');
{
  const council = [
    { OfficeId: 'MAYOR-OAK', Approval: 65 },
    ...Array.from({ length: 7 }, (_, i) => ({ OfficeId: `COUNCIL-D${i + 1}`, Approval: 65 })),
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
  const councilDrift = found.find(p => p.evidence && p.evidence.sheet === 'Civic_Office_Ledger');
  assert('mayor + 7 council = 8 flat above threshold; pattern emitted',
    !!councilDrift && councilDrift.evidence.fields.flatApprovalCount === 8,
    `got ${councilDrift && councilDrift.evidence.fields.flatApprovalCount}`);
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
