/**
 * chaosCarsEngine.test.js — engine.11 generator coverage (T3.1-T3.12, T5.1).
 * Node-only (claspignored). Stubs the Apps Script globals the engine reads at call time.
 * Run: node phase04-events/chaosCarsEngine.test.js
 */
'use strict';

// ── wire clasped utilities/ globals into Node global scope (Apps Script flat namespace) ──
const cfg = require('../utilities/chaosCarsConfig');
const decay = require('../utilities/chaosCarsDecay');
const { makeDemandFixture_ } = require('../scripts/careJusticeService.test.js');
global.validateOutcome = cfg.validateOutcome;
global.loadChaosCarsConfig_ = cfg.loadChaosCarsConfig_;
global.validateAllChaosConfigs_ = cfg.validateAllChaosConfigs_;
global.chaosOutcomePool_ = cfg.chaosOutcomePool_;
global.admitJudicialReceipt_ = require('../phase05-citizens/judicialLifecycle.js').admitJudicialReceipt_;
global.CHAOS_SHIP_PORT_SECTORS = cfg.CHAOS_SHIP_PORT_SECTORS;
global.chaosDecayResidualOneCycle_ = decay.chaosDecayResidualOneCycle_;
global.careJusticeResidentIndex_ = require('./careJusticeService.js').careJusticeResidentIndex_;

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
  const headers = ['POPID', 'First', 'Last', 'Tier', 'Neighborhood', 'LifeHistory', 'LastUpdated', 'Status'];
  const rows = [];
  for (let i = 1; i <= 40; i++) {
    rows.push(['POP-' + String(i).padStart(5, '0'), 'First' + i, 'Last' + i,
      (i === 1 ? 1 : (i % 4) + 1), 'Fruitvale', '', '', 'active']);
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
    summary: { careJusticeDemand: makeDemandFixture_('Fruitvale', { headers, rows }) },
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

// ── Task 7b: demand-named cop contacts ───────────────────────────────────────
console.log('\nTask 7b: named calls and loop reweight');
{
  const car = cfg.loadChaosCarsConfig_().find(v => v.name === 'cop_car');
  const ambulance = cfg.loadChaosCarsConfig_().find(v => v.name === 'ambulance');
  const oari = cfg.loadChaosCarsConfig_().find(v => v.name === 'oari_van');
  function passCtx(seed) {
    const c = makeCtx(seed);
    c.summary.chaosCarsEvents = [];
    c.summary.tier1ChaosEvents = [];
    return c;
  }
  function throwsNaming(fn, part) {
    try { fn(); } catch (e) { return e.message.includes(part); }
    return false;
  }
  assert('7b only cop car is mapped; its loop weight is 0.6 and citizen scope is removed',
    car.namedCallsField === 'charges' && !ambulance.namedCallsField && !oari.namedCallsField &&
    Math.abs(eng.chaosLoopWeight_(car) - 0.6) < 1e-12 &&
    JSON.stringify(eng.chaosLoopScopes_(car)) === JSON.stringify(['neighborhood']) &&
    eng.chaosLoopScopes_(ambulance).includes('citizen'));
  let copCitizenLoop = 0, otherDemandCitizenLoop = 0;
  for (let seed = 1; seed <= 100; seed++) {
    reset();
    const c = makeCtx(seed);
    c.summary.careJusticeDemand.exposureDial = 0;
    eng.runChaosCarsEngine_(c);
    copCitizenLoop += chaosRows.filter(r => r.vehicleType === 'cop_car' && r.targetScope === 'citizen').length;
    otherDemandCitizenLoop += chaosRows.filter(r =>
      (r.vehicleType === 'ambulance' || r.vehicleType === 'oari_van') && r.targetScope === 'citizen').length;
  }
  assert('7b mapped cop never uses citizen loop; ambulance and OARI still do',
    copCitizenLoop === 0 && otherDemandCitizenLoop > 0,
    JSON.stringify({ copCitizenLoop, otherDemandCitizenLoop }));

  // 5,000 independent seeded pass runs; contacts are tested separately from outcomes.
  let contacts = 0, arrests = 0, receipts = 0;
  const trials = 5000;
  const expected = 8 * 40 / 1000;
  for (let seed = 1; seed <= trials; seed++) {
    reset();
    const c = passCtx(seed);
    eng.runChaosNamedPass_(c, c.rng, 100, [car], []);
    contacts += c.summary.chaosCarsEvents.length;
    arrests += c.summary.chaosCarsEvents.filter(e => e.diceOutcome === 'arrested').length;
    receipts += (c.summary.judicialEvents || []).filter(e => e.kind === 'intake').length;
  }
  const se = Math.sqrt(expected * (1 - 40 / 1000) / trials);
  assert('7b 5,000 seeded passes: mean contacts within 3 standard errors of independent expectation',
    Math.abs(contacts / trials - expected) <= 3 * se,
    JSON.stringify({ contacts, arrests, receipts, expected, se }));
  assert('7b arrest outcomes and judicial intakes counted separately from contacts',
    contacts > arrests && arrests >= receipts,
    JSON.stringify({ contacts, arrests, receipts }));

  reset();
  const zero = passCtx(4);
  zero.summary.careJusticeDemand.hoods.Fruitvale.charges = 0;
  zero.summary.careJusticeDemand.hoods.Temescal.charges = 80;
  let draws = 0;
  zero.rng = () => { draws++; return 0; };
  const passLogs = [];
  global.Logger = { log: line => passLogs.push(line) };
  eng.runChaosNamedPass_(zero, zero.rng, 100, [car], []);
  assert('7b zero tracked share names nobody; one hood draw each and log remains',
    zero.summary.chaosCarsEvents.length === 0 && draws === Object.keys(zero.summary.careJusticeDemand.hoods).length &&
    passLogs.length === 1 && passLogs[0].includes('named=0'));
  const dialZero = passCtx(4);
  dialZero.summary.careJusticeDemand.exposureDial = 0;
  draws = 0;
  dialZero.rng = () => { draws++; return 0; };
  eng.runChaosNamedPass_(dialZero, dialZero.rng, 100, [car], []);
  assert('7b dial zero still draws once per hood and names zero',
    draws === Object.keys(dialZero.summary.careJusticeDemand.hoods).length &&
    dialZero.summary.chaosCarsEvents.length === 0 && passLogs.length === 2);

  const tooHigh = passCtx(2);
  tooHigh.summary.careJusticeDemand.exposureDial = 26;
  assert('7b p above one throws naming hood',
    throwsNaming(() => eng.runChaosNamedPass_(tooHigh, tooHigh.rng, 100, [car], []), 'Fruitvale'));
  for (const bad of [undefined, -1, 1.5, Infinity]) {
    const c = passCtx(2); c.summary.careJusticeDemand.hoods.Fruitvale.charges = bad;
    assert('7b invalid charges names vehicle, hood and field: ' + String(bad),
      throwsNaming(() => eng.runChaosNamedPass_(c, c.rng, 100, [car], []), 'cop_car Fruitvale charges'));
  }
  const pOne = passCtx(2);
  pOne.summary.careJusticeDemand.exposureDial = 25;
  pOne.summary.careJusticeDemand.hoods.Fruitvale.charges = 1;
  const arrestOnly = { ...car, textureOutcomes: [car.textureOutcomes.find(o => o.outcome === 'arrested')] };
  reset();
  eng.runChaosNamedPass_(pOne, pOne.rng, 100, [arrestOnly], []);
  const row = pOne.summary.chaosCarsEvents[0];
  assert('7b pass hit lives in charged hood and keeps source row, hook and judicial receipt',
    row && row.targetScope === 'citizen' && row.vehicleType === 'cop_car' &&
    pOne.ledger.rows.some(r => r[0] === row.targetId && r[4] === 'Fruitvale') &&
    pOne.summary.storyHooks.some(h => h.hookType === 'CITIZEN_ARRESTED') &&
    pOne.summary.judicialEvents[0].sourceEventId === 'patrol:' + row.eventId + ':' + row.targetId);
  const hospitalized = passCtx(2);
  hospitalized.summary.careJusticeDemand.exposureDial = 25;
  hospitalized.summary.careJusticeDemand.hoods.Fruitvale.charges = 1;
  hospitalized.ledger.rows.forEach(r => { r[7] = 'hospitalized'; });
  eng.runChaosNamedPass_(hospitalized, hospitalized.rng, 100, [arrestOnly], []);
  assert('7b hospitalized fixture has a contact and arrest outcome but no judicial intake',
    hospitalized.summary.chaosCarsEvents.length === 1 &&
    hospitalized.summary.chaosCarsEvents[0].diceOutcome === 'arrested' &&
    !(hospitalized.summary.judicialEvents || []).length);
  const oldLifeState = global.deriveLifeState_;
  global.simYearOf_ = () => 2090;
  global.deriveLifeState_ = () => ({ isMinor: true, age: 15, working: '' });
  const minors = passCtx(2);
  minors.summary.careJusticeDemand.exposureDial = 25;
  minors.summary.careJusticeDemand.hoods.Fruitvale.charges = 1;
  eng.runChaosNamedPass_(minors, minors.rng, 100, [car], []);
  assert('7b minor-heavy fixture has one named draw and no arrest',
    !(minors.summary.judicialEvents || []).length &&
    minors.summary.chaosCarsEvents.every(e => e.diceOutcome !== 'arrested'));
  if (oldLifeState === undefined) delete global.deriveLifeState_;
  else global.deriveLifeState_ = oldLifeState;

  function exactBinomial(n, p, u) {
    let mass = Math.pow(1 - p, n), cdf = 0;
    for (let k = 0; k <= n; k++) {
      cdf += mass;
      if (u < cdf) return k;
      mass *= (n - k) / (k + 1) * p / (1 - p);
    }
    return n;
  }
  assert('7b inverse CDF matches exact small-n pmf',
    [0.01, 0.2, 0.5, 0.8, 0.99].every(u =>
      eng.chaosBinomial_(() => u, 5, 0.35, 'cop_car', 'Fruitvale') === exactBinomial(5, 0.35, u)));
  assert('7b p one yields all calls; n350 p0.9 lands near its mean',
    eng.chaosBinomial_(() => 0.3, 7, 1, 'cop_car', 'Fruitvale') === 7 &&
    Math.abs(eng.chaosBinomial_(() => 0.5, 350, 0.9, 'cop_car', 'Fruitvale') - 315) < 5);
  const twice = passCtx(3);
  twice.summary.careJusticeDemand.hoods.Fruitvale.charges = 0;
  draws = 0;
  twice.rng = () => { draws++; return 0.5; };
  eng.runChaosNamedPass_(twice, twice.rng, 100, [car, { ...car, name: 'synthetic_mapped' }], []);
  assert('7b draw count is hoods times mapped vehicles when calls are zero',
    draws === 2 * Object.keys(twice.summary.careJusticeDemand.hoods).length);

  const oldConfigLoader = global.loadChaosCarsConfig_;
  const unmapped = { name: 'synthetic_unmapped', displayName: 'Synthetic unmapped',
    scopes: ['citizen'], baseFrequencyWeight: 1, episodic: false,
    textureOutcomes: [{ outcome: 'ticket', weight: 1, severity: 'low', lifeHistoryTag: 'Setback' }],
    metricImpacts: [] };
  global.loadChaosCarsConfig_ = () => [unmapped];
  function forcedLoop(first) {
    reset();
    const c = makeCtx(1);
    let count = 0;
    c.rng = () => { count++; return count === 1 ? first : 0.5; };
    eng.runChaosCarsEngine_(c);
    return { c, count, rows: chaosRows.slice(), intents: appendIntents.slice() };
  }
  const low = forcedLoop(0);
  const high = forcedLoop(0.999999);
  global.loadChaosCarsConfig_ = oldConfigLoader;
  const validator = require('../scripts/chaosCarsFrequencyCheck.js');
  const capRows = high.rows.map(r => ({ CycleId: r.cycleId, VehicleType: r.vehicleType,
    TargetScope: r.targetScope }));
  capRows.push({ CycleId: 99, VehicleType: 'cop_car', TargetScope: 'citizen' });
  capRows.push({ CycleId: 99, VehicleType: 'container_ship', TargetScope: 'port' });
  capRows.push({ CycleId: 100, VehicleType: 'cop_car', TargetScope: 'citizen' });
  const counted = validator.loopCounts(capRows, cfg.loadChaosCarsConfig_());
  assert('7b forced 3 and 15 attempts produce 3 and 15 non-port loop rows',
    low.rows.length === 3 && high.rows.length === 15);
  assert('7b validator excludes mapped citizen and port rows from 15-attempt Cycle',
    counted[99] === 15 && counted[100] === 0 &&
    validator.MIN_EVENTS === 3 && validator.MAX_EVENTS === 15);
  assert('7b pass and loop payload shapes match; fixture tracked counts match ledger',
    JSON.stringify(Object.keys(row).sort()) === JSON.stringify(Object.keys(low.rows[0]).sort()) &&
    Object.keys(pOne.summary.careJusticeDemand.hoods).every(hood =>
      pOne.summary.careJusticeDemand.hoods[hood].trackedResidents ===
      (global.careJusticeResidentIndex_(pOne)[hood] || []).length));
  assert('7b unmapped loop preserves one scope draw per attempt',
    low.count > 3 && high.count > low.count);

  // Call the extracted body with the same selected target and RNG stream as a
  // forced unmapped loop. Capture payloads, intents, friction and draw count.
  reset();
  const direct = makeCtx(1);
  direct.summary.chaosCarsEvents = [];
  direct.summary.tier1ChaosEvents = [];
  let directCount = 0;
  direct.rng = () => { directCount++; return directCount === 1 ? 0 : 0.5; };
  const attempts = eng.pickEventCount_(direct.rng);
  const directFriction = [];
  const priorRipple = global.recordRipple_;
  let ripples = [];
  global.recordRipple_ = (_ctx, ripple) => ripples.push(ripple);
  for (let i = 0; i < attempts; i++) {
    const vehicle = eng.pickVehicle_(direct.rng, [unmapped]);
    const scope = eng.pickFromArrayChaos_(direct.rng, vehicle.scopes);
    const target = eng.pickTargetByScope_(direct.rng, direct, scope, vehicle);
    eng.runChaosEvent_(direct, direct.rng, 99, vehicle, scope, target, directFriction, i);
  }
  const directRows = JSON.stringify(chaosRows);
  const directIntents = JSON.stringify(appendIntents);
  const directHooks = JSON.stringify(direct.summary.storyHooks || []);
  const directRipples = JSON.stringify(ripples);
  direct.rng(); direct.rng(); // ship slot consumes two draws even without a port vehicle
  reset();
  ripples = [];
  global.loadChaosCarsConfig_ = () => [unmapped];
  const loop = makeCtx(1);
  let loopCount = 0;
  loop.rng = () => { loopCount++; return loopCount === 1 ? 0 : 0.5; };
  eng.runChaosCarsEngine_(loop);
  global.loadChaosCarsConfig_ = oldConfigLoader;
  if (priorRipple === undefined) delete global.recordRipple_;
  else global.recordRipple_ = priorRipple;
  assert('7b extracted event body matches unmapped loop payloads, intents, hooks, ripples and draw count',
    JSON.stringify(chaosRows) === directRows && JSON.stringify(appendIntents) === directIntents &&
    JSON.stringify(loop.summary.storyHooks || []) === directHooks &&
    JSON.stringify(ripples) === directRipples && loopCount === directCount &&
    directFriction.length === loop.summary.chaosFriction.entries.length);

  reset();
  const fail = passCtx(2);
  fail.summary.careJusticeDemand.exposureDial = 25;
  fail.summary.careJusticeDemand.hoods.Fruitvale.charges = 1;
  const writer = global.writeChaosCarsRow_;
  global.writeChaosCarsRow_ = () => { throw new Error('synthetic source row failure'); };
  assert('7b source-row failure propagates before judicial receipt',
    throwsNaming(() => eng.runChaosNamedPass_(fail, fail.rng, 100, [arrestOnly], []),
      'synthetic source row failure') && !(fail.summary.judicialEvents || []).length);
  global.writeChaosCarsRow_ = writer;
}

console.log('\n' + '─'.repeat(60));
if (failed === 0) { console.log(`✓ all ${passed} assertions passed`); process.exit(0); }
else { console.error(`✗ ${failed}/${passed + failed} failed`); process.exit(1); }
