/**
 * chaosCarsCitizenDial.test.js — engine.42 chaos-trauma WIRING (S275).
 *
 * The pure accumulator is proven in chaosTrauma.test.js. This proves the chaos-cars
 * SEAM: writeCitizenEvent_ accrues into the citizen's DialState on the shared ctx.ledger
 * row, escalates to a labeled break across cycles (persistence), and stamps the break tag
 * into the LifeHistory_Log provenance. Drives writeCitizenEvent_ directly (deterministic),
 * bypassing the rng scope-picker.
 *
 * Run: node scripts/chaosCarsCitizenDial.test.js
 */

// --- inject the Apps Script global surface writeCitizenEvent_ now calls ---
const cm = require('../utilities/citizenMemory.js');
const comp = require('../utilities/compressLifeHistory.js');
const dialMap = require('../utilities/citizenDialMap.js');
const { makeDemandFixture_ } = require('./careJusticeService.test.js');
global.Logger = { log() {} };
global.inWorldStamp_ = () => 'C100';
['deserialize_', 'serialize_', 'accrueChaos_', 'applyChaosReaction_', 'newCitizen_']
  .forEach(k => { global[k] = cm[k]; });
global.parseDialState_ = comp.parseDialState_;
global.serializeDialState_ = comp.serializeDialState_;
global.nudgesForEvent_ = dialMap.nudgesForEvent_;
const appendIntents = [];
global.queueAppendIntent_ = (ctx, tab, row) => appendIntents.push({ tab, row });

const eng = require('../phase04-events/chaosCarsEngine.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail != null ? ': ' + detail : ''}`); failed++; }
}

// minimal shared ctx.ledger with a DialState column (col index 5)
function makeCtx() {
  return {
    summary: { cycleRef: 'C100', careJusticeDemand: makeDemandFixture_('Fruitvale') },
    ledger: {
      headers: ['POPID', 'First', 'Last', 'Neighborhood', 'LifeHistory', 'DialState', 'LastUpdated'],
      rows: [['POP-09001', 'Test', 'Citizen', 'Fruitvale', '', '', '']],
      dirty: false
    }
  };
}
const target = { rowIndex: 0, popId: 'POP-09001', neighborhood: 'Fruitvale', tier: 4 };
const vehicle = { name: 'tow_truck' };
const outcomeLow = { outcome: 'ticket', severity: 'low', lifeHistoryTag: 'Setback' };
const outcomeHigh = { outcome: 'arrested', severity: 'high', lifeHistoryTag: 'Transgression-Serious' };

function lastEventTag() { return appendIntents[appendIntents.length - 1].row[3]; }
function dialOf(ctx) { return JSON.parse(ctx.ledger.rows[0][5]); }

// ── hit 1: accrues, writes DialState, no break yet ───────────────────────────
const ctx = makeCtx();
eng.writeCitizenEvent_(ctx, target, vehicle, outcomeLow, 100, 'got a ticket');
assert('hit1 -> DialState written', ctx.ledger.rows[0][5].length > 0);
assert('hit1 -> chaosExposure count 1', dialOf(ctx).chaosExposure.count === 1, ctx.ledger.rows[0][5]);
assert('hit1 -> eventTag has no break tag', lastEventTag() === 'Setback|chaos_cars|tow_truck', lastEventTag());
assert('hit1 -> col-O carries the dial tag', /\[Setback\]/.test(ctx.ledger.rows[0][4]));

// ── hit 2 (next cycle, SAME ctx row = persistence): escalates to wary ─────────
eng.writeCitizenEvent_(ctx, target, { name: 'pothole_truck' }, outcomeLow, 101, 'another ticket');
assert('hit2 -> count 2 (persisted across cycle)', dialOf(ctx).chaosExposure.count === 2, ctx.ledger.rows[0][5]);
assert('hit2 -> break stamped in provenance', /chaos:wary/.test(lastEventTag()), lastEventTag());
assert('hit2 -> composure dropped to 46', dialOf(ctx).base.composure === 46, dialOf(ctx).base.composure);
assert('hit2 -> reactedLevel 1', dialOf(ctx).chaosExposure.reactedLevel === 1);

// ── hit 3 high-severity: escalates to traumatized, once ──────────────────────
eng.writeCitizenEvent_(ctx, target, { name: 'street_sweeper' }, outcomeHigh, 102, 'arrested');
assert('hit3 -> traumatized provenance', /chaos:trauma/.test(lastEventTag()), lastEventTag());
// engine.201 W1e: the -8 break shrinks with room below the midpoint (cur 46 -> x0.92 = -7.36)
assert('hit3 -> composure 46->38.64 (room-scaled break)', Math.abs(dialOf(ctx).base.composure - 38.64) < 1e-9, dialOf(ctx).base.composure);

// ── hit 4 (still traumatized, no fresh escalation): no new break tag ─────────
eng.writeCitizenEvent_(ctx, target, { name: 'tow_truck' }, outcomeHigh, 103, 'arrested again');
assert('hit4 -> no re-break tag', !/chaos:(wary|trauma)/.test(lastEventTag()), lastEventTag());
assert('hit4 -> composure unchanged (no runaway)', Math.abs(dialOf(ctx).base.composure - 38.64) < 1e-9, dialOf(ctx).base.composure);

// ── base + streak survive every write (no clobber of the dial spine) ─────────
assert('base preserved through all writes', typeof dialOf(ctx).base.drive === 'number');
assert('streak preserved through all writes', dialOf(ctx).streak !== undefined);

// engine.201 W1e/W1h — synthetic local citizen; real chaos writer and config.
{
  const ctx = makeCtx();
  ctx.ledger.rows[0][0] = 'SYNTHETIC-W1-CHAOS';
  const target = { rowIndex: 0, popId: 'SYNTHETIC-W1-CHAOS', neighborhood: 'Fruitvale', tier: 4 };
  const initial = cm.newCitizen_({ composure: 1, openness: 1 });
  ctx.ledger.rows[0][5] = comp.serializeDialState_(initial);
  const values = [];
  for (let cycle = 101; cycle <= 220; cycle++) {
    ctx.summary.absoluteCycle = cycle;
    eng.writeCitizenEvent_(ctx, target, vehicle, outcomeHigh, cycle, 'Synthetic W1 chaos consequence');
    const state = cm.deserialize_(dialOf(ctx));
    values.push([cm.current_(state, 'composure'), cm.current_(state, 'openness')]);
  }
  assert('W1e chaos reaction stays off current-value zero for 120 Cycles',
    values.every(v => v.every(n => n > 0 && n < 100)) && values.some(v => v[0] < 1),
    JSON.stringify({ first: values[0], second: values[1], last: values[119] }));
  const configs = require('../utilities/chaosCarsConfig.js').VEHICLE_CONFIGS;
  const outcomes = configs.flatMap(v => v.textureOutcomes.map(o => ({ vehicle: v.name, ...o })));
  for (const name of ['pulled_over_warning', 'traffic_jam', 'vital_document_delivered']) {
    const found = outcomes.filter(o => o.outcome === name);
    assert(`W1h ${name} carries a consequential citizen tag`,
      found.length > 0 && found.every(o => name === 'vital_document_delivered' ? o.lifeHistoryTag && o.lifeHistoryTag !== 'Background' : o.lifeHistoryTag === 'Friction'),
      JSON.stringify(found.map(o => ({ vehicle: o.vehicle, tag: o.lifeHistoryTag }))));
  }
  const background = outcomes.filter(o => o.lifeHistoryTag === 'Background');
  assert('W1h no chaos citizen outcome is Background', background.length === 0,
    background.map(o => `${o.vehicle}/${o.outcome}`).join(', '));
}

// Task 4: isolated synthetic ambulance receipts; no intent is sent to a Sheet.
function medicalCtx(status, cause) {
  const ctx = makeCtx();
  ctx.ledger.headers.push('Status', 'StatusStartCycle', 'HealthCause');
  ctx.ledger.rows[0].push(status, '', cause || '');
  ctx.ledger.rows[0][0] = 'SYNTHETIC-CHAOS-CARE';
  return ctx;
}
const medicalTarget = { ...target, popId: 'SYNTHETIC-CHAOS-CARE' };
const ambulance = { name: 'ambulance', displayName: 'Synthetic ambulance' };
const emergency = { outcome: 'medical_emergency', severity: 'high', lifeHistoryTag: 'Setback', weight: 1 };
const accident = { outcome: 'workplace_accident', severity: 'high', lifeHistoryTag: 'Setback', weight: 1 };

{
  const ctx = medicalCtx('active');
  const receipt = eng.writeCitizenEvent_(ctx, medicalTarget, ambulance, emergency, 100, 'synthetic emergency');
  assert('T4-1 active ambulance returns an unpushed intake with row cause',
    receipt.kind === 'intake' && receipt.intakeType === 'illness' && receipt.sourceSystem === 'ambulance' &&
    receipt.sourceEventId === '' && receipt.cause === 'a sudden medical emergency' &&
    !ctx.summary.hospitalEvents);
  const injury = eng.writeCitizenEvent_(medicalCtx('active'), medicalTarget, ambulance, accident, 100, 'synthetic accident');
  assert('T4-1 workplace accident is injury with written prose',
    injury.kind === 'intake' && injury.intakeType === 'injury' && injury.cause === 'a workplace accident');
}
{
  const ctx = medicalCtx('recovering', 'synthetic prior cause');
  const receipt = eng.writeCitizenEvent_(ctx, medicalTarget, ambulance, emergency, 100, 'synthetic re-escalation');
  assert('T4-3 recovering returns transition with prior row cause and blank source fields',
    receipt.kind === 'transition' && receipt.cause === 'synthetic prior cause' &&
    receipt.intakeType === '' && receipt.sourceSystem === '' && receipt.sourceEventId === '' &&
    ctx.ledger.rows[0][7] === 'critical');
}
{
  const ctx = medicalCtx('retired');
  const receipt = eng.writeCitizenEvent_(ctx, medicalTarget, ambulance, emergency, 100, 'synthetic retiree hit');
  assert('T4-6 retiree retains Status and has no receipt', receipt === null && ctx.ledger.rows[0][7] === 'retired');
}
{
  const ctx = medicalCtx('active');
  const receipt = eng.writeCitizenEvent_(ctx, medicalTarget, { name: 'oari_van' },
    { outcome: 'deescalated', severity: 'low', lifeHistoryTag: 'Setback' }, 100, 'synthetic diversion');
  assert('T4-8 de-escalation emits no hospital receipt', receipt === null && !ctx.summary.hospitalEvents);
}

// The real caller draws eventId after the citizen write, queues the Chaos_Cars
// payload, then publishes the receipt. Fixed draws prove this ordering.
global.validateAllChaosConfigs_ = () => {};
global.validateOutcome = () => {};
global.chaosOutcomePool_ = vehicle => vehicle.textureOutcomes;
global.loadChaosCarsConfig_ = () => [{ ...ambulance, episodic: false, baseFrequencyWeight: 1,
  scopes: ['citizen'], textureOutcomes: [emergency], metricImpacts: [] }];
function fixedMedicalRun(failPayload) {
  const ctx = medicalCtx('active');
  ctx.summary.cycleId = 100;
  let draws = 0;
  ctx.rng = () => { draws++; return draws === 1 ? 0 : ((draws * 17) % 97) / 97; };
  const recorded = [];
  global.writeChaosCarsRow_ = (_ctx, payload) => {
    if (failPayload) throw new Error('synthetic payload failure');
    recorded.push(payload.eventId);
  };
  let error = null;
  try { eng.runChaosCarsEngine_(ctx); } catch (e) { error = e; }
  return { ctx, draws, recorded, error };
}
{
  const run = fixedMedicalRun(false);
  const receipts = run.ctx.summary.hospitalEvents || [];
  assert('T4-1 caller publishes intake after source row with matching eventId',
    !run.error && run.recorded.length === 3 && receipts.length === 1 &&
    receipts[0].sourceEventId === 'ambulance:' + run.recorded[0] + ':SYNTHETIC-CHAOS-CARE',
    run.error && run.error.message);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const expectedIds = [7, 20, 33].map(start => Array.from({ length: 8 }, (_, offset) =>
    chars.charAt(Math.floor(((((start + offset) * 17) % 97) / 97) * chars.length))).join(''));
  assert('T4-12 fixed RNG uses two target draws and stable payload IDs',
    run.draws === 42 && JSON.stringify(run.recorded) === JSON.stringify(expectedIds),
    JSON.stringify({ draws: run.draws, recorded: run.recorded, expectedIds }));
}
{
  const run = fixedMedicalRun(true);
  assert('T4-9 payload failure leaves Status flipped but no receipt',
    !!run.error && run.ctx.ledger.rows[0][7] === 'critical' && !run.ctx.summary.hospitalEvents,
    run.error && run.error.message);
}

console.log(`\nchaosCarsCitizenDial: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
