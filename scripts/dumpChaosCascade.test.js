/**
 * dumpChaosCascade.test.js — engine.11 T5.3 coverage. Node-only.
 * Stubs lib/sheets.getSheetAsObjects and canon-name-check.profilesForPopids so this
 * runs without live credentials.
 * Run: node scripts/dumpChaosCascade.test.js
 */
'use strict';

require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const canonNameCheck = require('./canon-name-check');
const dcc = require('./dumpChaosCascade');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const REAL_getSheetAsObjects = sheets.getSheetAsObjects;
const REAL_profilesForPopids = canonNameCheck.profilesForPopids;
function stubChaosRows(rows) { sheets.getSheetAsObjects = async () => rows; }
function stubProfiles(fn) { canonNameCheck.profilesForPopids = fn; }
function restore() {
  sheets.getSheetAsObjects = REAL_getSheetAsObjects;
  canonNameCheck.profilesForPopids = REAL_profilesForPopids;
}

(async () => {
  // Test 1: no rows at all for the cycle
  console.log('Test 1: no Chaos_Cars rows for cycle');
  {
    stubChaosRows([{ CycleId: '50', ConsequenceFloorFired: 'FALSE' }]);
    const hits = await dcc.readTier1Hits('100');
    assert('empty result when cycle has zero rows', hits.length === 0);
    restore();
  }

  // Test 2: rows exist for the cycle but none floor-fired
  console.log('\nTest 2: cycle has rows, none Tier-1');
  {
    stubChaosRows([
      { CycleId: '100', ConsequenceFloorFired: 'FALSE', TargetScope: 'business' },
      { CycleId: '100', ConsequenceFloorFired: 'FALSE', TargetScope: 'neighborhood' }
    ]);
    const hits = await dcc.readTier1Hits('100');
    assert('non-floor-fired rows excluded', hits.length === 0);
    restore();
  }

  // Test 3: a Tier-1 hit resolves a name via canon-name-check
  console.log('\nTest 3: Tier-1 hit + name resolution');
  {
    stubChaosRows([
      { CycleId: '999', EventId: 'x1', VehicleType: 'ambulance', TargetScope: 'citizen',
        TargetId: 'POP-00001', TargetTier: '1', DiceOutcome: 'medical_emergency',
        ConsequenceFloorFired: 'TRUE', ChaosNarrativeSeed: 'test seed' },
      { CycleId: '999', VehicleType: 'garbage_truck', TargetScope: 'business',
        TargetId: 'BIZ-00001', ConsequenceFloorFired: 'FALSE' }
    ]);
    stubProfiles((popids) => popids.map((p) => `Vinnie Keane — role: DH; popid: ${p}`));
    const hits = await dcc.readTier1Hits('999');
    assert('exactly one Tier-1 hit', hits.length === 1);
    assert('resolved name', hits[0] && hits[0].targetName === 'Vinnie Keane', JSON.stringify(hits[0]));
    assert('cross-cycle / non-floor-fired rows excluded', hits.every((h) => h.eventId === 'x1'));
    restore();
  }

  // Test 4: unresolved POPID falls back to the raw ID, never throws
  console.log('\nTest 4: unresolved citizen falls back to POPID');
  {
    stubChaosRows([
      { CycleId: '999', EventId: 'x2', VehicleType: 'cop_car', TargetScope: 'citizen',
        TargetId: 'POP-09999', TargetTier: '1', DiceOutcome: 'arrested',
        ConsequenceFloorFired: 'TRUE' }
    ]);
    stubProfiles(() => []); // no match in the ledger snapshot
    const hits = await dcc.readTier1Hits('999');
    assert('fallback name is the POPID', hits[0] && hits[0].targetName === 'POP-09999', JSON.stringify(hits[0]));
    restore();
  }

  // Test 5: reactionBlockFor format — a/an, underscore-to-space, decision prompt
  console.log('\nTest 5: reactionBlockFor formatting');
  {
    const b1 = dcc.reactionBlockFor({ targetName: 'Vinnie Keane', vehicle: 'ambulance', outcome: 'medical_emergency' }, 'Mayor Santana');
    assert('leads with [CHAOS CASCADE]', b1.startsWith('**[CHAOS CASCADE]**'));
    assert('uses "an" before ambulance', b1.includes('hit by an ambulance'));
    assert('outcome underscores rendered as spaces', b1.includes('medical emergency'));
    assert('names the voice in the decision prompt', b1.includes('how does Mayor Santana respond?'));

    const b2 = dcc.reactionBlockFor({ targetName: 'X', vehicle: 'cop_car', outcome: 'arrested' }, 'Chief Montez');
    assert('uses "a" before cop car (consonant)', b2.includes('hit by a cop car'));

    const b3 = dcc.reactionBlockFor({ targetName: 'X', vehicle: 'ambulance', outcome: 'medical_emergency' }, 'Chief Montez');
    assert('no raw telemetry leak (no ConsequenceFloorFired/tier/metric text)', !/tier|magnitude|consequencefloor/i.test(b3));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
