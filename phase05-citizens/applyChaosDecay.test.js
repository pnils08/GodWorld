/**
 * applyChaosDecay.test.js — engine.11 T4.2 business-scope decay coverage. Node-only.
 * Run: node phase05-citizens/applyChaosDecay.test.js
 */
'use strict';

const decay = require('../utilities/chaosCarsDecay');
global.chaosResidualAfter_ = decay.chaosResidualAfter_;
global.Logger = { log: () => {} };
let cells = [];
global.queueCellIntent_ = (ctx, tab, r, c, v, reason, domain) => cells.push({ tab, r, c, v, reason, domain });

const mod = require('./applyChaosDecay');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// Chaos_Cars fixture: 12-col schema. Current cycle = 100.
const CC_HEADERS = ['CycleId', 'EventId', 'VehicleType', 'TargetScope', 'TargetId', 'TargetTier',
  'DiceOutcome', 'PrimaryMetric', 'MetricMagnitude', 'ConsequenceFloorFired', 'ChaosNarrativeSeed', 'TimestampUtc'];
const ccRows = [
  CC_HEADERS,
  [98, 'e1', 'pge_truck', 'business', 'BIZ-00001', '', 'transformer_blowout', 'Annual_Revenue', -10, 'FALSE', '', ''], // 2 cycles ago → reverts
  [99, 'e2', 'fire_engine', 'business', 'BIZ-00002', '', 'major_blaze_contained', 'Annual_Revenue', -20, 'FALSE', '', ''], // 1 cycle ago → reverts
  [100, 'e3', 'mail_truck', 'business', 'BIZ-00001', '', 'lost_package', 'Annual_Revenue', 2, 'FALSE', '', ''], // THIS cycle → skip (cyclesSince 0)
  [99, 'e4', 'garbage_truck', 'neighborhood', 'Fruitvale', '', 'sanitation_strike_delay', 'Sentiment', -0.1, 'FALSE', '', ''], // nbhd → skip
  [99, 'e5', 'cop_car', 'citizen', 'POP-00001', 1, 'arrested', 'Transgression-Serious', 0, 'TRUE', '', ''], // citizen → skip
  [99, 'e6', 'building_inspector', 'business', 'BIZ-00002', '', 'forced_temporary_closure', 'Employee_Count', -2, 'FALSE', '', ''], // Employee_Count → skip (permanent)
];
const blRows = [
  ['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', ' Avg_Salary ', ' Annual_Revenue ', 'Growth_Rate', 'Key_Personnel'],
  ['BIZ-00001', 'Acme', 'Retail', 'Fruitvale', '800', '50', '-10', '0.1', ''],  // holds prior residual
  ['BIZ-00002', 'Beta', 'Food', 'Temescal', '12', '40', '-20', '0.1', ''],
];

function ctxWith(cycle, cc, bl) {
  return {
    cycle: cycle,
    ss: { getSheetByName: (n) => {
      const data = n === 'Chaos_Cars' ? cc : n === 'Business_Ledger' ? bl : null;
      return data ? { getDataRange: () => ({ getValues: () => data }) } : null;
    } }
  };
}

console.log('Test 1: business Annual_Revenue decays; other scopes/cols ignored');
{
  cells = [];
  const res = mod.applyChaosDecay_(ctxWith(100, ccRows, blRows));
  // BIZ-00001 (e1 Annual_Revenue, cyclesSince 2) + BIZ-00002 (e2 Annual_Revenue, cyclesSince 1).
  // e3 (this cycle), e4 (nbhd), e5 (citizen), e6 (Employee_Count) all skipped.
  assert('exactly 2 businesses reverted', res.reverted === 2, `got ${res.reverted}`);
  const ids = cells.map(c => c.r); // sheet rows: BIZ-00001 → row 2, BIZ-00002 → row 3
  assert('targets sheet rows 2 and 3', ids.indexOf(2) >= 0 && ids.indexOf(3) >= 0);
  assert('all writes to Annual_Revenue col 7', cells.every(c => c.c === 7));
  assert('all writes to Business_Ledger', cells.every(c => c.tab === 'Business_Ledger'));
}

console.log('\nTest 2: revert moves toward baseline (negative residual → value increases)');
{
  // BIZ-00002: M=-20, cyclesSince 1. step = after(-20,1) - after(-20,0) = (-20*0.9) - (-20) = +2.
  // cur=-20 → next = -18 (toward 0). Annual_Revenue down rate=0.10.
  const b2 = cells.find(c => c.r === 3);
  assert('BIZ-00002 -20 → -18 (reverted +2 toward baseline)', Math.abs(b2.v - (-18)) < 1e-9, `got ${b2.v}`);
  // BIZ-00001: M=-10, cyclesSince 2. step = after(-10,2)-after(-10,1) = (-10*0.81)-(-10*0.9)= -8.1+9 = +0.9.
  // cur=-10 → -9.1
  const b1 = cells.find(c => c.r === 2);
  assert('BIZ-00001 -10 → -9.1 (reverted +0.9)', Math.abs(b1.v - (-9.1)) < 1e-9, `got ${b1.v}`);
}

console.log('\nTest 3: no Chaos_Cars sheet → no-op');
{
  cells = [];
  const res = mod.applyChaosDecay_({ cycle: 100, ss: { getSheetByName: () => null } });
  assert('returns reverted 0', res.reverted === 0);
  assert('no cell intents', cells.length === 0);
}

console.log('\n' + '─'.repeat(60));
if (failed === 0) { console.log(`✓ all ${passed} assertions passed`); process.exit(0); }
else { console.error(`✗ ${failed}/${passed + failed} failed`); process.exit(1); }
