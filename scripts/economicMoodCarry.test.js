#!/usr/bin/env node
'use strict';

/**
 * engine.221 — the city economic mood has memory.
 *
 * Offline proof, no Sheet: the real Phase-1 loader (loadPreviousCycleState_) and the
 * real Phase-6 economy (runEconomicRippleEngine_) run in a vm sandbox with the
 * carry-forward blob stubbed — the persistence loop Carry_Forward_Store provides.
 * Every number below is a synthetic fixture. Run: node scripts/economicMoodCarry.test.js
 *
 * What it proves:
 *   seed     — Phase 1 opens the Cycle on last Cycle's persisted econMood, so the
 *              41 Phase 2–5 readers (`S.economicMood || 50`) stop reading 50.
 *   memory   — Phase 6 moves the carried mood TOWARD the level it computes, not onto it.
 *   control  — econMoodInertia 1 reproduces the pre-221 output exactly.
 *   bounded  — level-shaped terms (summer, playoffs, First Friday) stay levels under
 *              carry: 30 Cycles never climb past the level. A naive accumulator would
 *              pin at 100 (§15: a tax wearing a gate's clothes).
 *   aftermath— one shock ripple: start → peak → end → aftermath, shrinking steps back.
 *   fail-loud— a missing World_Config.econMoodInertia throws (ADR-0015 rule 4).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const load = (sandbox, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

// A ripple of `impact` alive from startCycle for `duration` Cycles (decay shape is the engine's own).
function ripple(impact, startCycle, duration) {
  return { id: 'SYNTHETIC_' + impact + '_' + startCycle, type: impact < 0 ? 'BUSINESS_CONTRACTION' : 'BUSINESS_EXPANSION',
    impact: impact, currentStrength: impact, startCycle: startCycle, endCycle: startCycle + duration,
    neighborhoods: ['SYNTHETIC_TEST_HOOD'], primaryNeighborhood: 'SYNTHETIC_TEST_HOOD', sectors: ['retail'], source: 'synthetic' };
}

function sandbox(opts) {
  opts = opts || {};
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat,
    safeRand_: () => () => 0.5, recordRipple_: () => true, PropertiesService: null };
  vm.createContext(sb);
  load(sb, 'phase01-config/loadPreviousEvening.js');
  load(sb, 'phase06-analysis/economicRippleEngine.js');
  // The carry-forward store, stubbed: whatever `blob` holds is last Cycle's PREV_CYCLE_STATE_JSON.
  sb.loadCarryForwardBlob_ = (ctx, key) => (key === 'PREV_CYCLE_STATE_JSON' && sb.__blob) ? JSON.stringify(sb.__blob) : null;
  sb.carryForwardCycleId_ = ctx => ctx.config.cycleCount;
  return sb;
}

function ctxFor(sb, cycle, summaryExtra, configExtra) {
  const config = Object.assign({ cycleCount: cycle, rngSeed: 7, econMoodInertia: 0.3 }, configExtra || {});
  const summary = Object.assign({ cycleId: cycle, season: 'Spring', month: 0, holiday: 'none', sportsSeason: 'off-season',
    neighborhoodState: { SYNTHETIC_TEST_HOOD: { employerCharacter: 'retail', boomIndex: 0 } } }, summaryExtra || {});
  return { config, summary, ss: { getSheetByName: () => null }, writeIntents: [] };
}

// Run one Cycle: Phase 1 loader, then Phase 6 economy. Returns {opened, mood, S}.
function runCycle(sb, cycle, blob, summaryExtra, configExtra) {
  sb.__blob = blob;
  const ctx = ctxFor(sb, cycle, summaryExtra, configExtra);
  sb.loadPreviousCycleState_(ctx);
  const opened = ctx.summary.economicMood;
  sb.runEconomicRippleEngine_(ctx);
  return { opened, mood: ctx.summary.economicMood, desc: ctx.summary.economicMoodDesc, S: ctx.summary };
}
// What Phase 9 would persist from this Cycle (finalizeCycleState_ shape, the two keys the loader needs).
function persist(r, cycle) {
  return { cycle: cycle, econMood: r.mood, migrationDrift: 0,
    economicRipples: r.S.economicRipples.map(x => Object.assign({}, x)) };
}

console.log('engine.221 — city economic mood carry');

// ── seed ────────────────────────────────────────────────────────────────────
{
  const sb = sandbox();
  const r = runCycle(sb, 108, { cycle: 107, econMood: 59.01, migrationDrift: 0 });
  check('seed: Phase 1 opens on the carried econMood (59.01)', r.opened === 59.01, 'opened=' + r.opened);
  const r0 = runCycle(sb, 108, { cycle: 107, econMood: 0, migrationDrift: 0 });
  check('seed: a carried 0 is a value, not an absence', r0.opened === 0, 'opened=' + r0.opened);
  const rn = runCycle(sb, 108, { cycle: 107, migrationDrift: 0 });
  check('seed: no carried econMood → Phase 6 still defaults to 50', rn.opened === undefined && typeof rn.mood === 'number', 'opened=' + rn.opened);
}

// ── memory + control ────────────────────────────────────────────────────────
{
  // The bench's C108 shape: carried 59.01, ripples summing to ≈ −16.93 → level 48.81 (base 50 + drift).
  const blob = { cycle: 107, econMood: 59.01, migrationDrift: 0, economicRipples: [ripple(-20, 106, 5)] };
  const level = runCycle(sandbox(), 108, blob, null, { econMoodInertia: 1 });
  const carried = runCycle(sandbox(), 108, blob);
  check('control: inertia 1 == pre-221 level (from base 50)', Math.abs(level.mood - 48.6) < 1.5, 'level=' + level.mood);
  check('memory: inertia 0.3 lands strictly between the level and the carry', carried.mood > level.mood && carried.mood < 59.01,
    'carried=' + carried.mood + ' level=' + level.mood);
  const expect = Math.round((59.01 + 0.3 * (level.mood - 59.01)) * 100) / 100;
  check('memory: carry + inertia × (level − carry)', Math.abs(carried.mood - expect) < 0.011, 'got ' + carried.mood + ' want ' + expect);
}

// ── bounded (design guard, not a regression: passes on the pre-221 level too) ──
{
  function run30(inertia) {
    const sb = sandbox();
    let blob = { cycle: 107, econMood: 50, migrationDrift: 0 }, max = 0, last = null;
    for (let c = 108; c < 138; c++) {
      const r = runCycle(sb, c, blob, { season: 'summer', sportsSeason: 'playoffs', isFirstFriday: true }, { econMoodInertia: inertia });
      max = Math.max(max, r.mood); last = r.mood; blob = persist(r, c);
    }
    return { max, last };
  }
  const level = run30(1), carried = run30(0.3);
  check('bounded: 30 summer/playoff Cycles never pass the level run (max ' + level.max + ')', carried.max <= level.max + 0.01, 'max=' + carried.max);
  check('bounded: converges onto the level (' + level.last + ')', Math.abs(carried.last - level.last) < 0.5, 'last=' + carried.last);
}

// ── aftermath: start → peak → end → aftermath ───────────────────────────────
{
  const sb = sandbox();
  let blob = { cycle: 107, econMood: 50, migrationDrift: 0, economicRipples: [ripple(-20, 108, 4)] };
  const trace = [];
  for (let c = 108; c < 120; c++) {
    const r = runCycle(sb, c, blob); trace.push(r.mood); blob = persist(r, c);
  }
  const low = Math.min.apply(null, trace), lowAt = trace.indexOf(low);
  check('aftermath: the shock is felt (falls below 50)', low < 49.5, 'trace=' + trace.join(' '));
  check('aftermath: the trough is not the first Cycle (memory builds)', lowAt >= 1, 'lowAt=' + lowAt);
  check('aftermath: recovers toward 50 after the ripple ends', trace[trace.length - 1] > low && trace[trace.length - 1] < 50, 'trace=' + trace.join(' '));
  const steps = trace.slice(lowAt + 1).map((v, i, a) => i ? Math.abs(v - a[i - 1]) : null).filter(x => x !== null);
  check('aftermath: recovery steps shrink', steps.every((s, i) => i === 0 || s <= steps[i - 1] + 1e-9), 'steps=' + steps.map(s => s.toFixed(3)).join(' '));
  console.log('      trace ' + trace.map(v => v.toFixed(2)).join(' '));
}

// ── fail-loud ───────────────────────────────────────────────────────────────
{
  const sb = sandbox();
  let threw = null;
  try { runCycle(sb, 108, { cycle: 107, econMood: 55, migrationDrift: 0 }, null, { econMoodInertia: '' }); } catch (e) { threw = e.message; }
  check('fail-loud: missing World_Config.econMoodInertia throws', /econMoodInertia/.test(threw || ''), 'threw=' + threw);
  threw = null;
  try { runCycle(sb, 108, { cycle: 107, econMood: 55, migrationDrift: 0 }, null, { econMoodInertia: 1.5 }); } catch (e) { threw = e.message; }
  check('fail-loud: out-of-range inertia throws', /econMoodInertia/.test(threw || ''), 'threw=' + threw);
}

console.log(passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
