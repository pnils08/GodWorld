/**
 * chaosTrauma.test.js — engine.42 chaos-trauma accumulator (S275).
 *
 * Proves the second-tier, faster-threshold chaos accumulator that runs parallel to
 * fold+harden: repeated chaos-cars hits on one citizen escalate to a labeled break
 * (wary -> traumatized) that hardens base ONCE per escalation, persists across cycles
 * on DialState, and heals over chaos-free time. ("Random repetition changes the citizen
 * faster; positive events + quiet weeks pull them back." — Mike, S275.)
 *
 * Pure-logic functions live in utilities/citizenMemory.js; no I/O, no sheet.
 * Run: node scripts/chaosTrauma.test.js
 */

const E = require('../utilities/citizenMemory.js');
const { newCitizen_, accrueChaos_, applyChaosReaction_, checkChaosReaction_,
        decayChaosExposure_, serialize_, deserialize_ } = E;

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail != null ? ': ' + detail : ''}`); failed++; }
}

// ── 1. One hit accrues but does not break ────────────────────────────────────
(function oneHitNoBreak() {
  const c = newCitizen_();
  accrueChaos_(c, 'low', 'pothole_truck', 1);
  assert('1 hit -> count 1', c.chaosExposure.count === 1, c.chaosExposure.count);
  assert('1 hit -> no reaction', checkChaosReaction_(c) === null);
  assert('1 hit -> composure untouched', c.base.composure === 50, c.base.composure);
})();

// ── 2. Second hit -> wary, applied ONCE ──────────────────────────────────────
(function secondHitWary() {
  const c = newCitizen_();
  accrueChaos_(c, 'low', 'pothole_truck', 1);
  accrueChaos_(c, 'low', 'tow_truck', 2);
  const r = applyChaosReaction_(c);
  assert('2 hits -> wary', r && r.reaction === 'wary', r && r.reaction);
  assert('wary -> composure 50->46', c.base.composure === 46, c.base.composure);
  assert('wary -> openness 50->48', c.base.openness === 48, c.base.openness);
  assert('wary -> reactedLevel 1', c.chaosExposure.reactedLevel === 1);
  // re-applying with no new accrual must NOT re-break (runaway guard)
  const again = applyChaosReaction_(c);
  assert('wary -> no re-break', again === null);
  assert('wary -> composure stays 46', c.base.composure === 46, c.base.composure);
})();

// ── 3. Escalate to traumatized (high-severity 3rd hit) -> applied ONCE on top ─
(function escalateTraumatized() {
  const c = newCitizen_();
  accrueChaos_(c, 'low', 'pothole_truck', 1);
  accrueChaos_(c, 'low', 'tow_truck', 2);
  applyChaosReaction_(c);                       // wary: -4/-2
  accrueChaos_(c, 'high', 'street_sweeper', 3); // count 3, severity 2
  const r = applyChaosReaction_(c);
  assert('3rd high hit -> traumatized', r && r.reaction === 'traumatized', r && r.reaction);
  assert('traumatized -> composure 46->38', c.base.composure === 38, c.base.composure);
  assert('traumatized -> openness 48->44', c.base.openness === 44, c.base.openness);
  assert('traumatized -> reactedLevel 2', c.chaosExposure.reactedLevel === 2);
  assert('traumatized -> tags carry real types', r.tags.indexOf('chaos-type:pothole_truck') >= 0, r.tags.join(','));
  const again = applyChaosReaction_(c);
  assert('traumatized -> no re-break', again === null);
})();

// ── 4. Cross-cycle persistence: serialize -> deserialize round-trip ───────────
(function persistRoundTrip() {
  const c = newCitizen_();
  accrueChaos_(c, 'high', 'street_sweeper', 5);
  accrueChaos_(c, 'high', 'tow_truck', 6);
  applyChaosReaction_(c);
  const json = JSON.stringify(serialize_(c));
  const c2 = deserialize_(JSON.parse(json));
  assert('round-trip preserves count', c2.chaosExposure.count === 2, c2.chaosExposure && c2.chaosExposure.count);
  assert('round-trip preserves severity', c2.chaosExposure.severity === 2);
  assert('round-trip preserves reactedLevel', c2.chaosExposure.reactedLevel === 1);
  assert('round-trip preserves base break', c2.base.composure === 46, c2.base.composure);
  // a citizen with NO exposure serializes without the field (backward compatible)
  const clean = newCitizen_();
  assert('no-exposure serialize omits field', serialize_(clean).chaosExposure === undefined);
})();

// ── 5. Recovery: chaos-free time fades the accumulator + lifts the break ──────
(function recovery() {
  const c = newCitizen_();
  accrueChaos_(c, 'high', 'street_sweeper', 10);
  accrueChaos_(c, 'high', 'tow_truck', 10);
  accrueChaos_(c, 'high', 'pothole_truck', 10);  // count 3, severity 2 -> traumatized
  applyChaosReaction_(c);
  assert('pre-decay reactedLevel 2', c.chaosExposure.reactedLevel === 2);

  // one fade-gap of quiet -> count 3->2, break drops to wary-level
  decayChaosExposure_(c, 10 + 6);
  assert('1 gap -> count 2', c.chaosExposure.count === 2, c.chaosExposure.count);
  assert('1 gap -> reactedLevel drops to 1', c.chaosExposure.reactedLevel === 1, c.chaosExposure.reactedLevel);

  // long quiet stretch -> exposure clears entirely (fully healed)
  decayChaosExposure_(c, 10 + 6 + 6 + 6);
  assert('long quiet -> exposure cleared', c.chaosExposure === undefined);

  // healed citizen can escalate fresh again (break can re-fire)
  accrueChaos_(c, 'low', 'tow_truck', 40);
  accrueChaos_(c, 'low', 'pothole_truck', 41);
  const r = applyChaosReaction_(c);
  assert('post-heal -> can go wary again', r && r.reaction === 'wary', r && r.reaction);
})();

// ── 6. Decay no-op inside the gap window ─────────────────────────────────────
(function decayNoOpInWindow() {
  const c = newCitizen_();
  accrueChaos_(c, 'low', 'tow_truck', 20);
  const changed = decayChaosExposure_(c, 22);   // gap 2 < FADE_GAP 6
  assert('decay within window -> no change', changed === false && c.chaosExposure.count === 1);
})();

console.log(`\nchaosTrauma: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
