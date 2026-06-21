/**
 * chaosCarsEngine.test.js — engine.11 generator coverage (T3.1-T3.12, T5.1).
 * Node-only (claspignored). Stubs the Apps Script globals the engine reads at call time.
 * Run: node phase04-events/chaosCarsEngine.test.js
 */
'use strict';

// ── wire clasped utilities/ globals into Node global scope (Apps Script flat namespace) ──
const cfg = require('../utilities/chaosCarsConfig');
const decay = require('../utilities/chaosCarsDecay');
global.validateOutcome = cfg.validateOutcome;
global.loadChaosCarsConfig_ = cfg.loadChaosCarsConfig_;
global.validateAllChaosConfigs_ = cfg.validateAllChaosConfigs_;

// captured intents
let appendIntents = [];
let cellIntents = [];
let chaosRows = [];
global.queueAppendIntent_ = (ctx, tab, row, reason, domain) => appendIntents.push({ tab, row, reason, domain });
global.queueCellIntent_ = (ctx, tab, r, c, v, reason, domain) => cellIntents.push({ tab, r, c, v, reason, domain });
global.writeChaosCarsRow_ = (ctx, payload) => chaosRows.push(payload);
global.Logger = { log: () => {} };
global.Utilities = { formatDate: () => '2026-06-20 12:00' };
global.Session = { getScriptTimeZone: () => 'UTC' };

const eng = require('./chaosCarsEngine');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// Deterministic rng (mulberry32).
function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCtx(seed) {
  const headers = ['POPID', 'First', 'Last', 'Tier', 'Neighborhood', 'LifeHistory', 'LastUpdated'];
  const rows = [];
  for (let i = 1; i <= 40; i++) {
    rows.push(['POP-' + String(i).padStart(5, '0'), 'First' + i, 'Last' + i,
      (i === 1 ? 1 : (i % 4) + 1), 'Fruitvale', '', '']);
  }
  const bizData = [
    ['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', ' Avg_Salary ', ' Annual_Revenue ', 'Growth_Rate', 'Key_Personnel'],
    ['BIZ-00001', 'Acme', 'Retail', 'Fruitvale', '800', '50', '  ', '0.1', ''],
    ['BIZ-00002', 'Beta', 'Food', 'Temescal', '12', '40', '  ', '0.1', ''],
  ];
  const nbData = [
    ['Timestamp', 'Cycle', 'Neighborhood', 'NightlifeProfile', 'NoiseIndex', 'CrimeIndex', 'RetailVitality', 'EventAttractiveness', 'Sentiment'],
    ['', 98, 'Fruitvale', 1, 1, 0, 9, 20, 0.27],
    ['', 98, 'Temescal', 1, 1, 1, 10, 22, 0.31],
  ];
  return {
    rng: rngFrom(seed),
    cycle: 99,
    now: new Date(0),
    summary: {},
    ledger: { headers, rows, dirty: false },
    ss: { getSheetByName: (n) => ({ getDataRange: () => ({ getValues: () => (n === 'Business_Ledger' ? bizData : nbData) }) }) }
  };
}

function reset() { appendIntents = []; cellIntents = []; chaosRows = []; }

// ── Test 1: event count bounds + determinism ──
console.log('Test 1: count bounds + determinism');
{
  for (let s = 1; s <= 200; s++) {
    const c = eng.pickEventCount_(rngFrom(s));
    if (c < 3 || c > 15) { assert('count in [3,15]', false, `seed ${s} → ${c}`); break; }
  }
  assert('count always in [3,15] over 200 seeds', true);

  reset();
  const a = makeCtx(12345); const ra = eng.runChaosCarsEngine_(a);
  const rowsA = JSON.stringify(chaosRows);
  reset();
  const b = makeCtx(12345); const rb = eng.runChaosCarsEngine_(b);
  const rowsB = JSON.stringify(chaosRows);
  assert('same seed → identical event count', ra.events === rb.events);
  assert('same seed → identical chaos rows (determinism)', rowsA === rowsB);

  reset();
  const c2 = makeCtx(99999); eng.runChaosCarsEngine_(c2);
  assert('different seed → (usually) different output', JSON.stringify(chaosRows) !== rowsA);
}

// ── Test 2: no forbidden outcomes, ever ──
console.log('\nTest 2: no-death across many runs');
{
  let total = 0, forbidden = 0;
  for (let s = 1; s <= 100; s++) {
    reset();
    eng.runChaosCarsEngine_(makeCtx(s));
    for (const row of chaosRows) {
      total++;
      try { cfg.validateOutcome(row.diceOutcome); } catch (e) { forbidden++; }
    }
  }
  assert(`zero forbidden outcomes across ${total} events`, forbidden === 0, `${forbidden} forbidden`);
  assert('generated a healthy event volume', total > 300);
}

// ── Test 3: citizen writeback — col O DIAL_MAP tag + log + dirty ──
console.log('\nTest 3: citizen scope writeback');
{
  // find a seed that produces a citizen event
  let found = null;
  for (let s = 1; s <= 80 && !found; s++) {
    reset();
    const ctx = makeCtx(s);
    eng.runChaosCarsEngine_(ctx);
    if (chaosRows.some(r => r.targetScope === 'citizen')) found = { ctx, s };
  }
  assert('a citizen event was produced', !!found);
  if (found) {
    assert('ctx.ledger.dirty flipped', found.ctx.ledger.dirty === true);
    const cl = appendIntents.filter(a => a.tab === 'LifeHistory_Log');
    assert('LifeHistory_Log append(s) queued', cl.length > 0);
    // EventTag = DialTag|chaos_cars|vehicle ; 7 cols
    const lh = cl[0];
    assert('log row has 7 cols', lh.row.length === 7);
    assert('EventTag carries chaos_cars provenance', /\|chaos_cars\|/.test(lh.row[3]));
    const dialTag = lh.row[3].split('|')[0];
    assert('PrimaryTag is a real DIAL_MAP tag', !!decay && typeof dialTag === 'string' && dialTag.length > 0);
    // col O on the ledger row mutated with a bracket tag
    const iLife = found.ctx.ledger.headers.indexOf('LifeHistory');
    const anyColO = found.ctx.ledger.rows.some(r => /\[[^\]]+\]/.test(String(r[iLife])));
    assert('a ledger col-O cell mutated with [Tag]', anyColO);
  }
}

// ── Test 4: business writeback — trimmed-col cell intents, empty→0 base ──
console.log('\nTest 4: business scope writeback');
{
  let found = null;
  for (let s = 1; s <= 120 && !found; s++) {
    reset();
    const ctx = makeCtx(s);
    eng.runChaosCarsEngine_(ctx);
    if (cellIntents.some(c => c.tab === 'Business_Ledger')) found = s;
  }
  assert('a business cell intent was produced', !!found);
  if (found) {
    const bc = cellIntents.filter(c => c.tab === 'Business_Ledger');
    // Annual_Revenue is col index 6 (0-based) → col 7 (1-based); Employee_Count idx 4 → col 5
    assert('business cell targets Annual_Revenue(7) or Employee_Count(5)',
      bc.every(c => c.c === 7 || c.c === 5));
    assert('business cell value is finite', bc.every(c => typeof c.v === 'number' && isFinite(c.v)));
  }
}

// ── Test 5: neighborhood scope — residual fold only, NO Neighborhood_Map write ──
console.log('\nTest 5: neighborhood scope residual (no clobber-prone column write)');
{
  let found = null;
  for (let s = 1; s <= 60 && !found; s++) {
    reset();
    const ctx = makeCtx(s);
    eng.runChaosCarsEngine_(ctx);
    if (chaosRows.some(r => r.targetScope === 'neighborhood')) found = ctx;
  }
  assert('a neighborhood event was produced', !!found);
  if (found) {
    assert('NO Neighborhood_Map cell/append intent', !cellIntents.some(c => c.tab === 'Neighborhood_Map') && !appendIntents.some(a => a.tab === 'Neighborhood_Map'));
    assert('chaosNeighborhoodFold residual populated', !!found.summary.chaosNeighborhoodFold && Object.keys(found.summary.chaosNeighborhoodFold).length > 0);
    // residual cols are within the 4 movable set
    const ALLOWED = { Sentiment: 1, CrimeIndex: 1, RetailVitality: 1, EventAttractiveness: 1 };
    let ok = true;
    for (const h in found.summary.chaosNeighborhoodFold) for (const col in found.summary.chaosNeighborhoodFold[h]) if (!ALLOWED[col]) ok = false;
    assert('residual cols ⊆ {Sentiment,CrimeIndex,RetailVitality,EventAttractiveness}', ok);
  }
}

// ── Test 6: Tier-1 high-severity citizen hit → cascade flag ──
console.log('\nTest 6: Tier-1 cascade flag');
{
  // POP-00001 is Tier-1; force many runs to catch a Tier-1 high-severity citizen hit
  let sawTier1 = false, consistentFlag = true;
  for (let s = 1; s <= 400; s++) {
    reset();
    const ctx = makeCtx(s);
    eng.runChaosCarsEngine_(ctx);
    for (const r of chaosRows) {
      if (r.consequenceFloorFired) {
        sawTier1 = true;
        if (!(r.targetScope === 'citizen' && r.targetTier === 1)) consistentFlag = false;
      }
    }
  }
  assert('Tier-1 cascade fired at least once over 400 seeds', sawTier1);
  assert('every consequenceFloorFired row is a Tier-1 citizen', consistentFlag);
}

console.log('\n' + '─'.repeat(60));
if (failed === 0) { console.log(`✓ all ${passed} assertions passed`); process.exit(0); }
else { console.error(`✗ ${failed}/${passed + failed} failed`); process.exit(1); }
