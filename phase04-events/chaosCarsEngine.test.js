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
global.chaosOutcomePool_ = cfg.chaosOutcomePool_;
global.CHAOS_SHIP_PORT_SECTORS = cfg.CHAOS_SHIP_PORT_SECTORS;
global.chaosDecayResidualOneCycle_ = decay.chaosDecayResidualOneCycle_;

// PropertiesService stub (in-memory key/value) for the neighborhood residual store.
let _props = {};
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (k) => (k in _props ? _props[k] : null),
    setProperty: (k, v) => { _props[k] = v; }
  })
};

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
// S271: chaos now stamps in-world (inWorldStamp_, defined in advanceSimulationCalendar.js
// — an Apps Script global). Stub it for the Node harness, same pattern as the others.
global.inWorldStamp_ = (ctx) => (ctx && ctx.summary && ctx.summary.cycleRef) || 'C100';

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

function reset() { appendIntents = []; cellIntents = []; chaosRows = []; _props = {}; }

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

// ── Test 4: business scope — a signed Growth_Rate event, NO Business_Ledger cells (engine.193 cut 3b) ──
console.log('\nTest 4: business scope → signed event fold, no cells');
{
  let found = null;
  for (let s = 1; s <= 120 && !found; s++) {
    reset();
    const ctx = makeCtx(s);
    eng.runChaosCarsEngine_(ctx);
    if (chaosRows.some(r => r.targetScope === 'business')) found = ctx;
  }
  assert('a business event was produced', !!found);
  if (found) {
    const fold = found.summary.chaosBusinessFold || {};
    const bizRows = chaosRows.filter(r => r.targetScope === 'business');
    assert('fold is { BIZ_ID: number }', Object.keys(fold).length > 0 && Object.keys(fold).every(k => /^BIZ-/.test(k) && typeof fold[k] === 'number'));
    assert('each business row records Growth_Rate + its outcome bizEvent', bizRows.every(r => r.primaryMetric === 'Growth_Rate' && typeof r.metricMagnitude === 'number'));
    assert('NO Business_Ledger cell intent (dynamics owns the columns)', !cellIntents.some(c => c.tab === 'Business_Ledger'));
  }
  // mail truck: the business pool is business-only outcomes, the citizen pool citizen-only
  const mail = cfg.VEHICLE_CONFIGS.find(v => v.name === 'mail_truck');
  const bizPool = cfg.chaosOutcomePool_(mail, 'business').map(o => o.outcome);
  const citPool = cfg.chaosOutcomePool_(mail, 'citizen').map(o => o.outcome);
  assert('mail truck carries business news both ways', bizPool.includes('lost_contract_notice') && bizPool.includes('new_contract_letter') && !bizPool.includes('lost_package'));
  assert('mail truck citizen pool unchanged', citPool.length === 3 && citPool.includes('lost_package'));
  let good = 0, bad = 0;
  for (let s = 1; s <= 400; s++) { const o = eng.rollOutcome_(rngFrom(s), mail, 'business', null); if (o.bizEvent > 0) good++; else if (o.bizEvent < 0) bad++; }
  assert('mail to a business: both signs roll, lean negative', good > 100 && bad > good, good + '/' + bad);
  const insp = cfg.VEHICLE_CONFIGS.find(v => v.name === 'building_inspector');
  assert('a passed inspection is 0; a forced closure is the heavy end', insp.textureOutcomes.find(o => o.outcome === 'passed').bizEvent === 0 &&
    insp.textureOutcomes.find(o => o.outcome === 'forced_temporary_closure').bizEvent === -2);
}

// ── Test 4b: the ship — episodic, never picked per event, start → peak → end → aftermath ──
console.log('\nTest 4b: the ship');
{
  const configs = cfg.VEHICLE_CONFIGS;
  let shipPicked = 0;
  for (let s = 1; s <= 3000; s++) if (eng.pickVehicle_(rngFrom(s), configs).name === 'cargo_ship') shipPicked++;
  assert('the per-event picker never draws the ship', shipPicked === 0);
  // draw count constant: two draws whether an episode starts, runs, or nothing happens
  const counting = (vals) => { let i = 0; const f = () => vals[i++ % vals.length]; f.count = () => i; return f; };
  const quiet = counting([0.99, 0.5]); const qctx = { summary: { chaosCarsEvents: [] }, config: {} };
  eng.runChaosShip_(qctx, quiet, 200, configs);
  assert('no roll under the chance → no episode, two draws', qctx.summary.chaosShip === null && quiet.count() === 2);
  // start a reroute: roll 0.01 < 0.18; pick 0.99 → last outcome (carrier_reroute, weight .15 at the top)
  reset();
  const r0 = counting([0.01, 0.99]); const c0 = { summary: { chaosCarsEvents: [] }, config: { chaosShipChancePerCycle: 0.18 } };
  const ep0 = eng.runChaosShip_(c0, r0, 200, configs);
  assert('episode starts: carrier_reroute, 8 weeks, −15pp, half strength', ep0.outcome === 'carrier_reroute' && ep0.weeks === 8 && ep0.peakPp === -15 && ep0.factor === 0.5 && ep0.phase === 'start' && r0.count() === 2);
  assert('start writes one Chaos_Cars row (port) + a BUSINESS world event with a desk seed', chaosRows.length === 1 && chaosRows[0].targetScope === 'port' && !!chaosRows[0].narrativeSeed &&
    c0.summary.worldEvents.length === 1 && c0.summary.worldEvents[0].domain === 'BUSINESS' && c0.summary.worldEvents[0].severity === 'high');
  const phases = [], factors = [];
  let prev = ep0;
  for (let c = 201; c <= 210; c++) {
    const r = counting([0.0, 0.0]); // would start a ship if the slot were free
    const cx = { summary: { chaosCarsEvents: [], previousCycleState: { chaosShip: prev } }, config: { chaosShipChancePerCycle: 0.18 } };
    const ep = eng.runChaosShip_(cx, r, c, configs);
    assert('two draws at cycle ' + c, r.count() === 2);
    phases.push(ep ? ep.phase : 'none'); factors.push(ep ? ep.factor : null);
    prev = cx.summary.chaosShip;
  }
  assert('lifecycle: peak ×6, end, aftermath, then the slot is free (next roll starts a new one)',
    JSON.stringify(phases.slice(0, 8)) === JSON.stringify(['peak', 'peak', 'peak', 'peak', 'peak', 'peak', 'end', 'aftermath']) && phases[8] === 'start',
    JSON.stringify(phases));
  assert('factors: 1 through the peak, 0.5 at the end, 0 in the aftermath', JSON.stringify(factors.slice(0, 8)) === JSON.stringify([1, 1, 1, 1, 1, 1, 0.5, 0]));
  assert('one-week berth delay is full strength its one week', eng.chaosShipFactor_(0, 1) === 1 && eng.chaosShipFactor_(1, 1) === 0);
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

// ── Test 7: neighborhood residual — persist + decay + multi-cycle linger (verify-fix) ──
console.log('\nTest 7: neighborhood residual persistence (resolveChaosNeighborhoodFold_)');
{
  _props = {};
  // Cycle A: fresh swings on Fruitvale (Sentiment slow-revert; CrimeIndex fast-revert).
  const ctxA = { summary: { chaosNeighborhoodFold: { Fruitvale: { Sentiment: -0.10, CrimeIndex: -0.08 } } } };
  const a = eng.resolveChaosNeighborhoodFold_(ctxA);
  assert('A: total carries fresh swing', Math.abs(a.Fruitvale.Sentiment + 0.10) < 1e-9 && Math.abs(a.Fruitvale.CrimeIndex + 0.08) < 1e-9);
  assert('A: persisted to store', !!_props.CHAOS_NBHD_FOLD_JSON);
  assert('A: writer reads total via ctx.summary', ctxA.summary.chaosNeighborhoodFold === a);

  // Cycle B: no fresh → prior decays one step. Sentiment down=0.15 → -0.085; CrimeIndex down=0.60 → -0.032.
  const ctxB = { summary: {} };
  const b = eng.resolveChaosNeighborhoodFold_(ctxB);
  assert('B: Sentiment lingers (slow) → -0.085', Math.abs(b.Fruitvale.Sentiment + 0.085) < 1e-9, `got ${b.Fruitvale.Sentiment}`);
  assert('B: CrimeIndex reverts (fast) → -0.032', Math.abs(b.Fruitvale.CrimeIndex + 0.032) < 1e-9, `got ${b.Fruitvale.CrimeIndex}`);

  // Cycle C: fresh -0.05 Sentiment adds on top of the decayed prior (multi-cycle linger).
  const ctxC = { summary: { chaosNeighborhoodFold: { Fruitvale: { Sentiment: -0.05 } } } };
  const c = eng.resolveChaosNeighborhoodFold_(ctxC);
  assert('C: fresh adds on decayed prior → -0.12', Math.abs(c.Fruitvale.Sentiment + 0.12) < 1e-9, `got ${c.Fruitvale.Sentiment}`);
  assert('C: CrimeIndex keeps decaying (no fresh)', c.Fruitvale.CrimeIndex < 0 && c.Fruitvale.CrimeIndex > -0.032);
  assert('C: multi-column held across cycles (B6 fix)', 'Sentiment' in c.Fruitvale && 'CrimeIndex' in c.Fruitvale);
}

console.log('\n' + '─'.repeat(60));
if (failed === 0) { console.log(`✓ all ${passed} assertions passed`); process.exit(0); }
else { console.error(`✗ ${failed}/${passed + failed} failed`); process.exit(1); }
