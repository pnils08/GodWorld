/**
 * contentLedgerCompose.test.js — engine.38 Design A composer + pool injection
 * (seams Task 11, S289). Full pipeline: real loader (mock sheet rows) → real
 * generateCitizensEvents_ (mock ctx), proving:
 *   - empty ledger -> zero ledger lines drawn, no throw (additive no-op)
 *   - seeded ledger + fixed seed -> byte-identical output across two runs
 *   - $SLOT fills from fragments; NO raw $TOKEN ever reaches LifeHistory
 *   - conditions gate per citizen (wealth<=3 line never lands on a rich citizen)
 *   - fragment conditions gate (hood-gated fragment never renders for wrong hood)
 *   - unfillable line (slot with zero eligible fragments) never enters pool
 *   - routing: source:qol first tag -> [QoL] primary in LifeHistory
 *   - entity slot $VENUE resolves code-side, no double "near" append
 *
 * Run: node scripts/contentLedgerCompose.test.js
 */

const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
const M = require('../utilities/citizenDialMap.js');
global.getCitizenDialBands_ = () => null;
global.Utilities = { formatDate: () => 'STAMP' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.inWorldStamp_ = (ctx) => 'C' + ((ctx && ctx.config && ctx.config.cycleCount) || 0);

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const genSrc = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/generateCitizensEvents.js'), 'utf8');
const generateCitizensEvents_ = new Function(genSrc + '\nreturn generateCitizensEvents_;')();
const loaderSrc = fs.readFileSync(path.resolve(__dirname, '../phase02-world-state/loadEventContentLedger.js'), 'utf8');
const loadEventContentLedger_ = new Function(loaderSrc + '\nreturn loadEventContentLedger_;')();

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'LifeHistory', 'LastUpdated',
  'Neighborhood', 'BirthYear', 'Occupation', 'TierRole', 'Type', 'TraitProfile', 'UsageCount',
  'MemoryRegisters', 'Status', 'MaritalStatus', 'NumChildren', 'WealthLevel', 'DisplacementRisk'];

function makeRow(popId, opts) {
  const o = opts || {};
  return [popId, 'Test', popId, 3, 'ENGINE', o.life || '', '',
    o.hood || 'Temescal', 1990, 'teacher', '', '', '', 0,
    '', o.status || '', o.marital || '', o.children || 0,
    o.wealth != null ? o.wealth : '', o.displ || 0];
}

const LEDGER_HDR = ['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'];

function makeCtx(rows, rng, ledgerRows) {
  const ctx = {
    now: new Date(0),
    rng,
    config: {},
    ss: {
      getSheetByName: (name) => {
        if (name === 'Event_Content_Ledger' && ledgerRows) {
          return { getDataRange: () => ({ getValues: () => ledgerRows }) };
        }
        return null;
      }
    },
    summary: { cycleId: 100, season: 'Summer', economicMood: 50 },
    ledger: { headers: HEADERS.slice(), rows, dirty: false }
  };
  loadEventContentLedger_(ctx); // real Phase-2 loader feeds the generator
  return ctx;
}

function emittedLines(ctx) {
  const out = [];
  for (const r of ctx.ledger.rows) out.push(String(r[5] || ''));
  return out;
}

// Ledger fixture: high weights so seeded lines actually get drawn in trials.
const FIXTURE = [
  LEDGER_HDR,
  ['line', 'test.tight', '', 'counted the register twice, $MOOD', '50', 'wealth<=3', 'source:economy', '', ''],
  ['line', 'test.venue', '', 'lingered at $VENUE past closing, $MOOD', '50', '', 'source:neighborhood', '', ''],
  ['line', 'test.unfillable', '', 'stared into $VOID for an hour', '50', '', 'source:qol', '', ''],
  ['fragment', '', 'MOOD', 'satisfied with the small win', '', '', '', '', ''],
  ['fragment', '', 'MOOD', 'uneasy about the week ahead', '', '', '', '', ''],
  ['fragment', '', 'MOOD', 'temescal-only calm settling in', '', 'hood=Temescal', '', '', '']
  // note: no fragments registered for VOID — test.unfillable must never enter a pool
];

console.log('═══ Empty ledger = additive no-op');
{
  let threw = false;
  const rows = [makeRow('POP-T0'), makeRow('POP-T1')];
  const ctx = makeCtx(rows, mulberry32(42), null); // missing tab
  try { generateCitizensEvents_(ctx); } catch (e) { threw = true; }
  assert('missing tab: generator runs clean', !threw);
  const ctx2 = makeCtx([makeRow('POP-T0')], mulberry32(42), [LEDGER_HDR]); // header-only tab
  try { generateCitizensEvents_(ctx2); } catch (e) { threw = true; }
  assert('header-only tab: generator runs clean', !threw);
}

console.log('═══ Determinism: fixed seed × fixed ledger = identical output');
{
  const run = (seed) => {
    const rows = [makeRow('POP-T0', { wealth: 2 }), makeRow('POP-T1', { wealth: 9 }), makeRow('POP-T2')];
    const ctx = makeCtx(rows, mulberry32(seed), FIXTURE);
    generateCitizensEvents_(ctx);
    return emittedLines(ctx).join('||');
  };
  assert('two runs, same seed -> byte-identical', run(777) === run(777));
  assert('different seed -> different output (sanity)', run(777) !== run(778));
}

console.log('═══ Composition + fail-closed rules (300 citizen-cycles)');
{
  let rawToken = 0, tightOnRich = 0, temescalFragElsewhere = 0, voidLines = 0, composedSeen = 0, venueComposed = 0, doubleNear = 0;
  for (let s = 1; s <= 100; s++) {
    const rows = [
      makeRow('POP-P0', { wealth: 2, hood: 'Temescal' }),   // poor, Temescal
      makeRow('POP-R1', { wealth: 9, hood: 'Temescal' }),   // rich
      makeRow('POP-E2', { wealth: 2, hood: 'Fruitvale' })   // poor, elsewhere
    ];
    const ctx = makeCtx(rows, mulberry32(s * 7919), FIXTURE);
    generateCitizensEvents_(ctx);
    const lines = emittedLines(ctx);
    for (let i = 0; i < lines.length; i++) {
      const txt = lines[i];
      if (/\$[A-Z_]+/.test(txt)) rawToken++;
      if (txt.indexOf('stared into') >= 0) voidLines++;
      if (i === 1 && txt.indexOf('counted the register') >= 0) tightOnRich++;
      if (i === 2 && txt.indexOf('temescal-only calm') >= 0) temescalFragElsewhere++;
      if (txt.indexOf('counted the register') >= 0 || txt.indexOf('lingered at') >= 0) composedSeen++;
      if (txt.indexOf('lingered at') >= 0) {
        venueComposed++;
        // $VENUE filled AND generic append suppressed -> at most one venue mention
        const nearCount = (txt.match(/ near /g) || []).length;
        if (txt.indexOf('lingered at $VENUE') >= 0) rawToken++;
        const lineOfInterest = txt.split('\n').find(l => l.indexOf('lingered at') >= 0) || '';
        if (/ near .* near /.test(lineOfInterest)) doubleNear++;
      }
    }
  }
  assert('composed ledger lines were drawn in trials', composedSeen > 0, `composed=${composedSeen}`);
  assert('NO raw $TOKEN ever reaches LifeHistory', rawToken === 0, `raw=${rawToken}`);
  assert('wealth<=3 line never lands on wealth=9 citizen', tightOnRich === 0, `hits=${tightOnRich}`);
  assert('hood-gated fragment never renders outside Temescal', temescalFragElsewhere === 0, `hits=${temescalFragElsewhere}`);
  assert('line with zero eligible fragments never enters pool', voidLines === 0, `hits=${voidLines}`);
  assert('$VENUE line was composed (entity slot resolves code-side)', venueComposed > 0, `venue=${venueComposed}`);
  assert('no double-venue append on $VENUE lines', doubleNear === 0, `hits=${doubleNear}`);
}

console.log('═══ Routing: ledger line primary tag');
{
  // qol-sourced ledger line must carry [QoL] primary in the LifeHistory line.
  const QOL_FIXTURE = [
    LEDGER_HDR,
    ['line', 'test.qol', '', 'noticed the block feeling looked-after', '80', '', 'source:qol', '', '']
  ];
  let taggedLine = null;
  for (let s = 1; s <= 200 && !taggedLine; s++) {
    const ctx = makeCtx([makeRow('POP-T0')], mulberry32(s * 104729), QOL_FIXTURE);
    generateCitizensEvents_(ctx);
    const line = emittedLines(ctx)[0].split('\n').find(l => l.indexOf('looked-after') >= 0);
    if (line) taggedLine = line;
  }
  assert('source:qol ledger line routes [QoL] primary',
    taggedLine !== null && taggedLine.indexOf('[QoL]') >= 0, taggedLine || 'never drawn in 200 seeds');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
