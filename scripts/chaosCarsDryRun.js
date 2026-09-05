#!/usr/bin/env node
/**
 * scripts/chaosCarsDryRun.js — engine.11 T6.1 dry-run + synthetic Tier-1 fixture.
 *
 * [research-build] chaos-cars plan docs/plans/2026-05-07-chaos-cars-engine.md §Cross-terminal
 * build split — the first research-build pickup behind engine-sheet's deployed T1.3/T5.1.
 * Two jobs:
 *   1. Run 5 synthetic cycles through the REAL runChaosCarsEngine_ against a fixture ctx
 *      whose citizen-tier proportions mirror the live ledger (21/58/145/744 of 968,
 *      output/simulation_ledger_snapshot.jsonl, 2026-09-05), scaled to 300 citizens for
 *      speed. Report per-cycle + aggregate stats to output/chaos_cars_dryrun_report.md.
 *   2. Live Chaos_Cars has zero ConsequenceFloorFired=TRUE rows yet (66 rows, checked
 *      2026-09-05 — expected at this volume, ~0.15 hits). Seed-sweep the SAME fixture
 *      (mirrors chaosCarsEngine.test.js Test 6) until a real Tier-1 hit fires, then
 *      persist it as output/chaos_cars_tier1_fixture.json for T5.2/T5.3 to author+verify
 *      against (plan: "not blind").
 *
 * Row-shape note: chaosCarsEngine.test.js stubs writeChaosCarsRow_ to capture the raw
 * camelCase orchestrator payload — fine for engine unit tests, WRONG shape for T5.2/T5.3
 * consumers (buildWorldSummary.emitChaosCars, dumpChaosCascade.js) which read PascalCase
 * sheet-object rows via getSheetAsObjects. This script wires the REAL
 * phase10-persistence/saveChaosCars.js writer instead, captures its queued 12-col row
 * array, and zips it against CHAOS_CARS_HEADERS — the fixture is byte-for-byte the shape
 * getSheetAsObjects('Chaos_Cars') actually returns (verified against a live row).
 *
 * Run: node scripts/chaosCarsDryRun.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// ── Apps Script global stubs (mirrors phase04-events/chaosCarsEngine.test.js) ──
const cfg = require('../utilities/chaosCarsConfig');
const decay = require('../utilities/chaosCarsDecay');
global.validateOutcome = cfg.validateOutcome;
global.loadChaosCarsConfig_ = cfg.loadChaosCarsConfig_;
global.validateAllChaosConfigs_ = cfg.validateAllChaosConfigs_;
global.chaosDecayResidualOneCycle_ = decay.chaosDecayResidualOneCycle_;

let _props = {};
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (k) => (k in _props ? _props[k] : null),
    setProperty: (k, v) => { _props[k] = v; }
  })
};

let appendIntents = [];
let cellIntents = [];
let ensureIntents = [];
global.queueAppendIntent_ = (ctx, tab, row, reason, domain) => appendIntents.push({ tab, row, reason, domain });
global.queueCellIntent_ = (ctx, tab, r, c, v, reason, domain) => cellIntents.push({ tab, r, c, v, reason, domain });
global.queueEnsureTabIntent_ = (ctx, tab, headers, reason, domain) => ensureIntents.push({ tab, headers, reason, domain });
global.Logger = { log: () => {} };
global.Utilities = { formatDate: () => '2026-06-20 12:00' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.inWorldStamp_ = (ctx) => (ctx && ctx.summary && ctx.summary.cycleRef) || 'C?';

// REAL writer (not a stub) — guarantees the fixture matches the live sheet-object shape.
const saveChaosCars = require('../phase10-persistence/saveChaosCars');
global.writeChaosCarsRow_ = saveChaosCars.writeChaosCarsRow_;

const eng = require('../phase04-events/chaosCarsEngine');

function resetIntents() { appendIntents = []; cellIntents = []; ensureIntents = []; }

// Deterministic rng (mulberry32) — identical to chaosCarsEngine.test.js so seeds are
// reproducible across this script and the unit tests.
function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── realistic-composition fixture ──────────────────────────────────────────
// Tier proportions from live output/simulation_ledger_snapshot.jsonl (968 tracked
// citizens, checked 2026-09-05): Tier1=21 (2.17%), Tier2=58 (6.0%), Tier3=145 (15.0%),
// Tier4=744 (76.9%). Scaled to 300 for dry-run speed: 7/18/45/230.
const NEIGHBORHOODS = ['Jack London', 'Fruitvale', 'Lake Merritt', 'Chinatown',
  'West Oakland', 'Downtown', 'Laurel', 'Rockridge', 'Temescal', 'Uptown', 'Piedmont Ave', 'KONO'];
const TIER_PLAN = [[1, 7], [2, 18], [3, 45], [4, 230]];

function buildCitizenLedger() {
  const headers = ['POPID', 'First', 'Last', 'Tier', 'Neighborhood', 'LifeHistory', 'LastUpdated'];
  const rows = [];
  let idx = 1;
  for (const [tier, count] of TIER_PLAN) {
    for (let i = 0; i < count; i++) {
      rows.push(['POP-' + String(idx).padStart(5, '0'), 'First' + idx, 'Last' + idx,
        tier, NEIGHBORHOODS[idx % NEIGHBORHOODS.length], '', '']);
      idx++;
    }
  }
  return { headers, rows };
}

function buildBusinessSheetValues() {
  const rows = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', ' Avg_Salary ', ' Annual_Revenue ', 'Growth_Rate', 'Key_Personnel']];
  for (let i = 1; i <= 40; i++) {
    rows.push(['BIZ-' + String(i).padStart(5, '0'), 'Biz' + i, 'Retail',
      NEIGHBORHOODS[i % NEIGHBORHOODS.length], String(5 + i), '45', '  ', '0.1', '']);
  }
  return rows;
}

function buildNeighborhoodSheetValues() {
  const rows = [['Timestamp', 'Cycle', 'Neighborhood', 'NightlifeProfile', 'NoiseIndex', 'CrimeIndex', 'RetailVitality', 'EventAttractiveness', 'Sentiment']];
  for (const h of NEIGHBORHOODS) rows.push(['', 100, h, 1, 1, 3, 10, 20, 0.3]);
  return rows;
}

const CIT = buildCitizenLedger();
const BIZ_VALUES = buildBusinessSheetValues();
const NB_VALUES = buildNeighborhoodSheetValues();

function makeCtx(seed, cycleId) {
  return {
    rng: rngFrom(seed),
    cycle: cycleId,
    now: new Date(0),
    summary: { cycleId: cycleId, cycleRef: 'Y3C' + cycleId },
    ledger: { headers: CIT.headers.slice(), rows: CIT.rows.map((r) => r.slice()), dirty: false },
    ss: {
      getSheetByName: (n) => ({
        getDataRange: () => ({ getValues: () => (n === 'Business_Ledger' ? BIZ_VALUES : NB_VALUES) })
      })
    }
  };
}

// Zip captured Chaos_Cars append rows into the PascalCase sheet-object shape
// getSheetAsObjects('Chaos_Cars') actually returns (verified against a live row,
// 2026-09-05: values come back as strings, TargetTier blank for non-citizen scope).
function zipChaosRows() {
  const headers = saveChaosCars.CHAOS_CARS_HEADERS;
  return appendIntents
    .filter((a) => a.tab === saveChaosCars.CHAOS_CARS_TAB)
    .map((a) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = String(a.row[i]); });
      return obj;
    });
}

// ── Part 1: 5-cycle report ──────────────────────────────────────────────────
const REPORT_SEEDS = [40101, 40102, 40103, 40104, 40105]; // fixed for reproducibility
const perCycle = [];
const vehicleTotals = {};
const scopeTotals = {};
const outcomeTotals = {};
let totalTier1 = 0;
let minEvents = Infinity, maxEvents = -Infinity;

REPORT_SEEDS.forEach((seed, i) => {
  const cycleId = 101 + i;
  resetIntents();
  const ctx = makeCtx(seed, cycleId);
  const result = eng.runChaosCarsEngine_(ctx);
  const rows = zipChaosRows();

  minEvents = Math.min(minEvents, result.events);
  maxEvents = Math.max(maxEvents, result.events);
  totalTier1 += result.tier1;

  const cycleVehicle = {}, cycleScope = {};
  for (const r of rows) {
    vehicleTotals[r.VehicleType] = (vehicleTotals[r.VehicleType] || 0) + 1;
    cycleVehicle[r.VehicleType] = (cycleVehicle[r.VehicleType] || 0) + 1;
    scopeTotals[r.TargetScope] = (scopeTotals[r.TargetScope] || 0) + 1;
    cycleScope[r.TargetScope] = (cycleScope[r.TargetScope] || 0) + 1;
    outcomeTotals[r.DiceOutcome] = (outcomeTotals[r.DiceOutcome] || 0) + 1;
  }
  perCycle.push({ cycleId, seed, events: result.events, tier1: result.tier1, businessWrites: result.businessWrites, friction: result.friction, vehicle: cycleVehicle, scope: cycleScope });
});

// ── Part 2: synthetic Tier-1 fixture — seed-sweep (mirrors Test 6, single-cycle attempts) ──
let tier1Fixture = null;
let sweepAttempts = 0;
const SWEEP_MAX = 500;
for (let s = 1; s <= SWEEP_MAX && !tier1Fixture; s++) {
  sweepAttempts = s;
  _props = {};
  resetIntents();
  const ctx = makeCtx(90000 + s, 999);
  eng.runChaosCarsEngine_(ctx);
  const rows = zipChaosRows();
  const hit = rows.find((r) => String(r.ConsequenceFloorFired).toUpperCase() === 'TRUE');
  if (hit) {
    tier1Fixture = { seed: 90000 + s, cycleId: 999, tier1Event: hit, allEventsThisCycle: rows };
  }
}

if (tier1Fixture) {
  const fixturePath = path.join(ROOT, 'output', 'chaos_cars_tier1_fixture.json');
  fs.writeFileSync(fixturePath, JSON.stringify(tier1Fixture, null, 2) + '\n');
}

// ── Report ───────────────────────────────────────────────────────────────
const lines = [];
lines.push('# Chaos Cars Dry-Run Report (T6.1)');
lines.push('');
lines.push('engine.11 — `docs/plans/2026-05-07-chaos-cars-engine.md`. Generated by `scripts/chaosCarsDryRun.js` against a synthetic fixture (300 citizens, tier proportions scaled from the live 968-row snapshot: 7/18/45/230 for Tier 1-4).');
lines.push('');
lines.push('## Per-cycle results');
lines.push('');
lines.push('| Cycle | Seed | Events | Tier-1 hits | Business writes | Friction |');
lines.push('|---|---|---|---|---|---|');
for (const c of perCycle) {
  lines.push(`| ${c.cycleId} | ${c.seed} | ${c.events} | ${c.tier1} | ${c.businessWrites} | ${c.friction} |`);
}
lines.push('');
lines.push(`**Frequency bound:** min ${minEvents}, max ${maxEvents} — within [3,15]: ${minEvents >= 3 && maxEvents <= 15 ? 'YES' : 'NO'}.`);
lines.push(`**Tier-1 hits across 5 synthetic cycles:** ${totalTier1} (expected — Tier-1 is 2.17% of citizens; rarity is the design feature, Hard Constraints §No tier protection).`);
lines.push('');
lines.push('## Vehicle-type distribution (5 cycles combined)');
lines.push('');
const totalEvents = Object.values(vehicleTotals).reduce((a, b) => a + b, 0);
lines.push('| Vehicle | Count | % of total |');
lines.push('|---|---|---|');
for (const [v, count] of Object.entries(vehicleTotals).sort((a, b) => b[1] - a[1])) {
  lines.push(`| ${v} | ${count} | ${((count / totalEvents) * 100).toFixed(1)}% |`);
}
lines.push('');
lines.push('## Scope distribution (5 cycles combined)');
lines.push('');
lines.push('| Scope | Count |');
lines.push('|---|---|');
for (const [s, count] of Object.entries(scopeTotals)) lines.push(`| ${s} | ${count} |`);
lines.push('');
lines.push('## Outcome distribution (5 cycles combined)');
lines.push('');
lines.push('| Outcome | Count |');
lines.push('|---|---|');
for (const [o, count] of Object.entries(outcomeTotals).sort((a, b) => b[1] - a[1])) lines.push(`| ${o} | ${count} |`);
lines.push('');
lines.push('## No-death constraint');
lines.push('');
lines.push('Enforced at generation time (`validateAllChaosConfigs_` at config-load, `validateOutcome` at dice-roll — `lib/chaosCarsConfig.js` T1.4). Zero forbidden outcomes possible by construction; not re-checked here.');
lines.push('');
lines.push('## Synthetic Tier-1 fixture');
lines.push('');
lines.push('Live `Chaos_Cars` has zero `ConsequenceFloorFired=TRUE` rows as of 2026-09-05 (66 rows total, ~6 cycles — expected at this volume, ~0.15 hits statistically). T5.2/T5.3 need a real Tier-1 event to author+verify against (plan §Cross-terminal build split: "not blind").');
lines.push('');
if (tier1Fixture) {
  lines.push(`Found after ${sweepAttempts} seed-sweep attempts (seed ${tier1Fixture.seed}, synthetic cycle 999) against the same 300-citizen fixture. Full event + its cycle's sibling events written to \`output/chaos_cars_tier1_fixture.json\`:`);
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(tier1Fixture.tier1Event, null, 2));
  lines.push('```');
} else {
  lines.push(`**No Tier-1 hit found after ${sweepAttempts} seed-sweep attempts.** T5.2/T5.3 are blocked — investigate the citizen-scope high-severity outcome rate before proceeding.`);
}
lines.push('');

const reportPath = path.join(ROOT, 'output', 'chaos_cars_dryrun_report.md');
fs.writeFileSync(reportPath, lines.join('\n'));

console.log('Wrote', reportPath);
if (tier1Fixture) console.log('Wrote', path.join(ROOT, 'output', 'chaos_cars_tier1_fixture.json'), '(seed', tier1Fixture.seed + ')');
else console.error('WARNING: no Tier-1 fixture found — T5.2/T5.3 blocked');
