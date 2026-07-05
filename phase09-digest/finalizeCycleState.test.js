/**
 * finalizeCycleState.test.js — Node round-trip test for engine.45 T2
 * (ripple serialization across cycle boundaries).
 *
 * Drives the REAL engine code end-to-end across a simulated cycle boundary:
 *   finalizeCycleState_ (serialize, cycle N)
 *     → JSON round trip (stands in for PropertiesService)
 *     → restoreCarriedRipples_ (cycle N+1, Phase 1)
 *     → processActiveRipples_ / applyActiveInitiativeRipples_ (decay code,
 *       unreachable before T2 because the arrays died with ctx every cycle).
 *
 * Run: node phase09-digest/finalizeCycleState.test.js
 * Harness style: rippleLedger.test.js. claspignored (**\/*.test.js).
 */

global.Logger = { log: function () {} };

// Capture carryover ledger rows emitted by applyActiveInitiativeRipples_.
var ledgerRows = [];
global.recordRipple_ = function (ctx, e) { ledgerRows.push(e); return true; };

var fcs = require('./finalizeCycleState.js');
var lpe = require('../phase01-config/loadPreviousEvening.js');
var ere = require('../phase06-analysis/economicRippleEngine.js');
var cie = require('../phase05-citizens/civicInitiativeEngine.js');

var failures = 0;
function assert(name, cond) {
  if (cond) { console.log('  PASS ' + name); }
  else { console.error('  FAIL ' + name); failures++; }
}
function approx(a, b) { return Math.abs(a - b) < 0.02; }

// ── Fixtures: cycle 105 state (mirrors the sandbox C105 seed) ──────────────

function econRipple(overrides) {
  var r = {
    id: 'PLAYOFF_SPENDING_105',
    type: 'PLAYOFF_SPENDING',
    impact: 8,
    sectors: ['entertainment', 'food', 'retail'],
    neighborhoods: ['Jack London', 'Downtown'],
    primaryNeighborhood: 'Jack London',
    startCycle: 105,
    endCycle: 108,
    currentStrength: 8,
    source: 'Playoff berth clinched',
    holiday: 'none',
    _ledgered: true
  };
  for (var k in overrides) r[k] = overrides[k];
  return r;
}

function initRipple(overrides) {
  var r = {
    initiativeName: 'Lakeshore Safety Corridor',
    rippleType: 'safety',
    direction: 'positive',
    strength: 1.2,
    effects: { sentiment_modifier: 0.06, community_modifier: 0.4 },
    affectedNeighborhoods: ['Lake Merritt', 'Grand Lake'],
    startCycle: 105,
    duration: 8,
    endCycle: 113,
    status: 'active'
  };
  for (var k in overrides) r[k] = overrides[k];
  return r;
}

// ── 1. compactEconomicRipples_: filter, cap, strip ──────────────────────────
(function () {
  console.log('1. compactEconomicRipples_');
  var ripples = [
    econRipple(),
    econRipple({ id: 'EXPIRED_100', startCycle: 100, endCycle: 104, currentStrength: 2 }),
    null,
    econRipple({ id: 'NO_END' , endCycle: undefined })
  ];
  var out = fcs.compactEconomicRipples_(ripples, 105);
  assert('keeps only active', out.length === 1 && out[0].id === 'PLAYOFF_SPENDING_105');
  assert('strips _ledgered flag', !('_ledgered' in out[0]));
  assert('strips calendar cruft', !('holiday' in out[0]));
  assert('keeps consumer fields',
    out[0].impact === 8 && out[0].currentStrength === 8 &&
    out[0].primaryNeighborhood === 'Jack London' &&
    out[0].neighborhoods.length === 2 && out[0].startCycle === 105 &&
    out[0].endCycle === 108 && out[0].sectors.length === 3);

  var many = [];
  for (var i = 0; i < 20; i++) {
    many.push(econRipple({ id: 'R' + i, currentStrength: i, endCycle: 120 }));
  }
  var capped = fcs.compactEconomicRipples_(many, 105);
  assert('caps at ' + fcs.SNAPSHOT_ECON_RIPPLE_CAP, capped.length === fcs.SNAPSHOT_ECON_RIPPLE_CAP);
  assert('keeps strongest when capping', capped[0].id === 'R19' && capped[capped.length - 1].id === 'R8');
})();

// ── 2. compactInitiativeRipples_: filter + field set ────────────────────────
(function () {
  console.log('2. compactInitiativeRipples_');
  var out = fcs.compactInitiativeRipples_([
    initRipple(),
    initRipple({ initiativeName: 'Done', status: 'expired' }),
    initRipple({ initiativeName: 'Over', endCycle: 105 }),
    null
  ], 105);
  assert('keeps only active', out.length === 1 && out[0].initiativeName === 'Lakeshore Safety Corridor');
  assert('keeps decay fields', out[0].startCycle === 105 && out[0].duration === 8 &&
    out[0].endCycle === 113 && out[0].effects.sentiment_modifier === 0.06);
  assert('keeps carryover magnitude fields', out[0].strength === 1.2 && out[0].direction === 'positive');
})();

// ── 3+4. Full round trip: serialize C105 → restore → decay at C106 ─────────
(function () {
  console.log('3. finalizeCycleState_ snapshot fields (cycle 105)');
  var ctx = {
    now: 'test-now',
    summary: {
      cycleId: 105,
      economicRipples: [econRipple()],
      initiativeRipples: [initRipple()],
      migrationDrift: 22,
      migrationDriftFactors: ['strong economy attracting residents', 'x', 'y', 'z', 'w', 'dropped-sixth'],
      cityDynamics: { sentiment: 0.3 },
      economicMood: 61.5
    }
  };
  fcs.finalizeCycleState_(ctx);
  var snap = ctx.summary.previousCycleState;
  assert('snapshot has economicRipples', Array.isArray(snap.economicRipples) && snap.economicRipples.length === 1);
  assert('snapshot has initiativeRipples', Array.isArray(snap.initiativeRipples) && snap.initiativeRipples.length === 1);
  assert('snapshot has migrationDrift', snap.migrationDrift === 22);
  assert('migrationDriftFactors capped at 5', snap.migrationDriftFactors.length === 5);

  var json = JSON.stringify(snap);
  assert('payload well under 9KB PropertiesService limit', json.length < 9000);

  console.log('4. restore + real decay code at cycle 106');
  // Fresh next-cycle summary (cold start) — the PropertiesService stand-in.
  var S2 = { cycleId: 106, previousCycleState: JSON.parse(json) };
  lpe.restoreCarriedRipples_(S2);
  assert('economicRipples seeded', Array.isArray(S2.economicRipples) && S2.economicRipples.length === 1);
  assert('initiativeRipples seeded', Array.isArray(S2.initiativeRipples) && S2.initiativeRipples.length === 1);

  // Real economic decay: elapsed 1 of 3 → strength 8 * (1 - 1/3) = 5.33
  ere.processActiveRipples_({ summary: S2 }, 106);
  assert('PLAYOFF_SPENDING alive at C106', S2.economicRipples.length === 1);
  assert('decayed-but-alive strength ≈ 5.33', approx(S2.economicRipples[0].currentStrength, 5.33));

  // Real initiative decay + carryover ledger row:
  // decayFactor = 1 - (1/8)*0.8 = 0.9 → remaining = 1.2 * 0.9 = 1.08
  ledgerRows.length = 0;
  cie.applyActiveInitiativeRipples_({ summary: S2 });
  assert('initiative ripple still active', S2.initiativeRipples.length === 1 && S2.activeRippleCount === 1);
  assert('sentiment nudged by carried ripple', (S2.cityDynamics.sentiment || 0) > 0);
  assert('carryover ledger row emitted', ledgerRows.length === 1 && ledgerRows[0].effectType === 'carryover');
  assert('carryover row remainingStrength ≈ 1.08', approx(ledgerRows[0].remainingStrength, 1.08));
  assert('carryover row joins to birth row by CauseId', ledgerRows[0].causeId === 'Lakeshore Safety Corridor');

  // Same-execution rerun must not double-ledger (cycle-valued guard).
  cie.applyActiveInitiativeRipples_({ summary: S2 });
  assert('rerun does not duplicate carryover row', ledgerRows.length === 1);

  // ── Serialize again at 106 and decay at 107: multi-hop carry ──
  var ctx2 = { now: 'test-now', summary: S2 };
  fcs.finalizeCycleState_(ctx2);
  var S3 = { cycleId: 107, previousCycleState: JSON.parse(JSON.stringify(S2.previousCycleState)) };
  lpe.restoreCarriedRipples_(S3);
  assert('carryover guard stripped on reserialize', !('_carryLedgered' in S3.initiativeRipples[0]));
  ere.processActiveRipples_({ summary: S3 }, 107);
  assert('C107: strength ≈ 2.67 (2 of 3 elapsed)', approx(S3.economicRipples[0].currentStrength, 2.67));

  // ── Expiry: at 108 (endCycle) the economic ripple must die ──
  var S4 = { cycleId: 108, economicRipples: JSON.parse(JSON.stringify(S3.economicRipples)) };
  ere.processActiveRipples_({ summary: S4 }, 108);
  assert('C108: PLAYOFF_SPENDING expired at endCycle', S4.economicRipples.length === 0);
})();

// ── 6. compactCrimeSpikes_ (engine.45 T3b): filter + cap ────────────────────
(function () {
  console.log('6. compactCrimeSpikes_ (T3b crime carry)');
  var shifts = [
    { neighborhood: 'West Oakland', metric: 'propertyCrime', direction: 'increase', magnitude: 7, newValue: 62 },
    { neighborhood: 'West Oakland', metric: 'violentCrime', direction: 'increase', magnitude: 5, newValue: 55 },
    { neighborhood: 'Rockridge', metric: 'propertyCrime', direction: 'decrease', magnitude: 9, newValue: 30 },
    { neighborhood: 'Downtown', metric: 'responseTime', direction: 'slower', magnitude: 2, newValue: 11 },
    null
  ];
  var out = fcs.compactCrimeSpikes_({ shifts: shifts });
  assert('keeps only crime increases', out.length === 2);
  assert('sorted by magnitude', out[0].magnitude === 7 && out[1].magnitude === 5);
  assert('excludes decreases + responseTime',
    !out.some(function (s) { return s.neighborhood === 'Rockridge' || s.metric === 'responseTime'; }));
  assert('empty on missing crimeMetrics', fcs.compactCrimeSpikes_(null).length === 0);

  var many = { shifts: [] };
  for (var i = 0; i < 20; i++) {
    many.shifts.push({ neighborhood: 'H' + i, metric: 'propertyCrime', direction: 'increase', magnitude: i, newValue: 50 + i });
  }
  var capped = fcs.compactCrimeSpikes_(many);
  assert('caps at 12 keeping strongest', capped.length === 12 && capped[0].magnitude === 19);

  // Snapshot carries the compacted spikes (same channel as migrationDrift).
  var ctx = { now: 'test-now', summary: { cycleId: 106, crimeMetrics: { shifts: shifts } } };
  fcs.finalizeCycleState_(ctx);
  var snap = JSON.parse(JSON.stringify(ctx.summary.previousCycleState));
  assert('snapshot.crimeSpikes round-trips', Array.isArray(snap.crimeSpikes) && snap.crimeSpikes.length === 2 &&
    snap.crimeSpikes[0].neighborhood === 'West Oakland');
})();

// ── 5. Restore must not clobber live in-memory state (back-to-back runs) ───
(function () {
  console.log('5. restore no-clobber guard');
  var S = {
    cycleId: 106,
    economicRipples: [econRipple({ id: 'LIVE_RIPPLE' })],
    previousCycleState: { cycle: 105, economicRipples: [econRipple({ id: 'STALE_RIPPLE' })], initiativeRipples: [] }
  };
  lpe.restoreCarriedRipples_(S);
  assert('live array wins over snapshot', S.economicRipples.length === 1 && S.economicRipples[0].id === 'LIVE_RIPPLE');
})();

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
