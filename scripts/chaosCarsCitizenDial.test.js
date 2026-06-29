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
    summary: { cycleRef: 'C100' },
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
assert('hit3 -> composure 46->38', dialOf(ctx).base.composure === 38, dialOf(ctx).base.composure);

// ── hit 4 (still traumatized, no fresh escalation): no new break tag ─────────
eng.writeCitizenEvent_(ctx, target, { name: 'tow_truck' }, outcomeHigh, 103, 'arrested again');
assert('hit4 -> no re-break tag', !/chaos:(wary|trauma)/.test(lastEventTag()), lastEventTag());
assert('hit4 -> composure unchanged (no runaway)', dialOf(ctx).base.composure === 38, dialOf(ctx).base.composure);

// ── base + streak survive every write (no clobber of the dial spine) ─────────
assert('base preserved through all writes', typeof dialOf(ctx).base.drive === 'number');
assert('streak preserved through all writes', dialOf(ctx).streak !== undefined);

console.log(`\nchaosCarsCitizenDial: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
