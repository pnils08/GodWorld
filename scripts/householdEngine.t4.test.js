/**
 * householdEngine.t4.test.js — measured verification of the engine.32 T4
 * additions to phase05-citizens/runHouseholdEngine.js:
 *   - circumstance-gated family pools (MaritalStatus / NumChildren)
 *   - ambient Health texture (ailment -> 'Health', wellness -> 'Recovering')
 *
 * Same loader pattern as conductEngine.test.js (no module.exports in engine
 * files — new Function(src) with the global surface stubbed).
 *
 * Run: node scripts/householdEngine.t4.test.js
 */

const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
const M = require('../utilities/citizenDialMap.js');
// dial seam: bands not needed for T4 — return null (base rates), matching live pre-deploy
global.getCitizenDialBands_ = () => null;

global.Utilities = { formatDate: () => 'STAMP' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.queueAppendIntent_ = () => {};

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rngImpl = mulberry32(1);
global.safeRand_ = () => rngImpl;

const src = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/runHouseholdEngine.js'), 'utf8');
const runHouseholdEngine_ = new Function(src + '\nreturn runHouseholdEngine_;')();

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)',
  'LifeHistory', 'LastUpdated', 'Neighborhood', 'MaritalStatus', 'NumChildren'];

function makeRow(popId, opts) {
  opts = opts || {};
  return [popId, 'Test', popId, 3, 'ENGINE', 'n', 'n', 'n',
    '', '', 'Temescal', opts.marital || '', opts.kids || 0];
}

function makeCtx(rows) {
  return {
    now: new Date(0),
    config: {},
    summary: { absoluteCycle: 100, economicMood: 50, season: 'Summer' },
    ledger: { headers: HEADERS.slice(), rows, dirty: false }
  };
}

// run N independent single-citizen cycles, collect picked event texts + tags
function trials(n, rowOpts) {
  const events = [];
  for (let i = 0; i < n; i++) {
    rngImpl = mulberry32(i + 7);
    const ctx = makeCtx([makeRow('POP-H' + i, rowOpts)]);
    runHouseholdEngine_(ctx);
    for (const ev of (ctx.summary.householdEvents || [])) events.push(ev);
  }
  return events;
}

// the circumstance lines — exact texts mirrored from the engine pools
// (substring markers collide with ambient lines, e.g. Temescal's
// "heard neighborhood kids playing outside")
const PARTNERED_LINES = [
  "cooked dinner with their spouse and talked through the week",
  "settled into a quiet evening on the couch with their partner",
  "split the weekend errands with their spouse",
  "planned the month's budget together with their partner"
];
const PARENT_LINES = [
  "helped the kids with homework at the kitchen table",
  "wrangled the kids through the bedtime routine",
  "watched a movie with the kids piled on the couch",
  "packed school lunches for the morning rush"
];
const isPartneredLine = ev => PARTNERED_LINES.indexOf(ev.event) >= 0;
const isParentLine = ev => PARENT_LINES.indexOf(ev.event) >= 0;

console.log('═══ T4 Section 1 — circumstance gates');
{
  const single = trials(8000, { marital: 'single', kids: 0 });
  assert('1.1 single/childless citizen fires household events', single.length > 50, String(single.length));
  assert('1.2 single: ZERO partnered lines', single.filter(isPartneredLine).length === 0,
    JSON.stringify(single.filter(isPartneredLine).slice(0, 2)));
  assert('1.3 childless: ZERO parent lines', single.filter(isParentLine).length === 0,
    JSON.stringify(single.filter(isParentLine).slice(0, 2)));

  const family = trials(8000, { marital: 'married', kids: 2 });
  assert('1.4 married parent DOES draw partnered lines', family.filter(isPartneredLine).length > 0,
    'of ' + family.length);
  assert('1.5 married parent DOES draw parent lines', family.filter(isParentLine).length > 0,
    'of ' + family.length);
  assert('1.6 circumstance lines tag Household (Family category)',
    family.filter(ev => isPartneredLine(ev) || isParentLine(ev)).every(ev => ev.tag === 'Household'));
}

console.log('═══ T4 Section 2 — health texture (ambient Health output)');
{
  const evs = trials(12000, { marital: 'single', kids: 0 });
  const health = evs.filter(ev => ev.tag === 'Health');
  const recovering = evs.filter(ev => ev.tag === 'Recovering');
  assert('2.1 ailment lines land with tag Health', health.length > 0, String(health.length));
  assert('2.2 wellness lines land with tag Recovering', recovering.length > 0, String(recovering.length));
  const share = (health.length + recovering.length) / evs.length;
  assert('2.3 health texture is a minority share of household output (<0.5)',
    share < 0.5 && share > 0.05, share.toFixed(3));
  // both tags resolve to composure-moving nudges in DIAL_MAP (loop closes)
  const hFx = M.nudgesForEvent_('Health', 1, '');
  const rFx = M.nudgesForEvent_('Recovering', 1, '');
  assert('2.4 Health -> composure-negative nudge', hFx && hFx.composure < 0, JSON.stringify(hFx));
  assert('2.5 Recovering -> composure-positive nudge', rFx && rFx.composure > 0, JSON.stringify(rFx));
}

console.log('═══ T4 Section 3 — missing-column guard (live SL without these headers)');
{
  rngImpl = mulberry32(11);
  const headers = HEADERS.filter(h => h !== 'MaritalStatus' && h !== 'NumChildren');
  const rows = [];
  for (let i = 0; i < 200; i++) rows.push(makeRow('POP-G' + i).slice(0, headers.length));
  const ctx = makeCtx(rows);
  ctx.ledger.headers = headers;
  let threw = false;
  try { runHouseholdEngine_(ctx); } catch (e) { threw = true; }
  assert('3.1 engine runs clean when MaritalStatus/NumChildren columns absent', !threw);
  const evs = ctx.summary.householdEvents || [];
  assert('3.2 no circumstance lines without the columns',
    evs.filter(ev => isPartneredLine(ev) || isParentLine(ev)).length === 0, String(evs.length));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
