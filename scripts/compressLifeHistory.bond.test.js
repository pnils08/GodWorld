/**
 * compressLifeHistory.bond.test.js — engine.101 bond write-back drain (kimi lane,
 * landed 2026-08-09; proposed/validated at output/engine101/ before landing).
 *
 * Proves: a Reflection_Intake row naming a bonded citizen (col I) nudges that
 * bond's Intensity IN MEMORY (Phase-10 replace persists it) — signed by affect
 * valence, capped per pair per cycle, missed pairs a stat not a throw, and the
 * pre-existing dial drain + applied='yes' audit are untouched. Pre-engine.101
 * 8-wide rows (no cols I-K) degrade to no-nudge.
 *
 * Run: node scripts/compressLifeHistory.bond.test.js
 */

const path = require('path');

// --- inject the Apps Script global surface the compressor calls bare (dial-test pattern) ---
global.Logger = { log() {} };
const E = require('/root/GodWorld/utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.nudgesForReflection_ = M.nudgesForReflection_;
global.baseTag_ = M.baseTag_;
global.queueCellIntent_ = function(ctx, tab, row, col, value, reason, domain, priority) {
  if (!ctx.persist) ctx.persist = { updates: [] };
  var intent = { tab: tab, kind: 'cell', row: row, col: col, value: value, reason: reason, domain: domain, priority: priority };
  ctx.persist.updates.push(intent);
  return intent;
};

// CLH_PATH lets this proposal run against the patched copy before landing.
const C = require(process.env.CLH_PATH ? path.resolve(__dirname, process.env.CLH_PATH) : '/root/GodWorld/utilities/compressLifeHistory.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const NUDGE = C.BOND_NUDGE, CAP = C.BOND_NUDGE_CYCLE_CAP;

// 11-wide fake Reflection_Intake: [ts,popId,cycle,wake,event,snippet,applied,affect,bondTarget,tension,resolves]
function fakeSS(intakeRows) {
  const values = [['ts', 'popId', 'cycle', 'wake', 'event', 'snippet', 'applied', 'affect', 'bondTarget', 'tension', 'resolves']].concat(intakeRows);
  const sheet = { getDataRange: () => ({ getValues: () => values }) };
  return { getSheetByName: (n) => (n === 'Reflection_Intake' ? sheet : null) };
}
function mkBond(a, b, intensity) {
  return { bondId: 'bond_' + a + '_' + b, citizenA: a, citizenB: b, bondType: 'friendship',
    intensity: intensity, status: 'active', origin: 'test', lastUpdate: '' };
}
function drainCtx(rowsSpec, intakeRows, bonds, cycle) {
  const headers = ['POPID', 'LifeHistory', 'TraitProfile', 'DialState'];
  const rows = rowsSpec.map(s => [s.POPID, s.LifeHistory || '', s.TraitProfile || '', s.DialState || '']);
  return {
    mode: {}, summary: { absoluteCycle: cycle || 100, relationshipBonds: bonds || [] },
    ledger: { headers, rows, dirty: false, sheet: 'Simulation_Ledger' },
    persist: { updates: [] },
    ss: fakeSS(intakeRows)
  };
}
const baseOf = (ctx, i) => JSON.parse(ctx.ledger.rows[i][3]).base;
const intk = (popId, event, affect, bondTarget, tension, resolves) =>
  ['t', popId, 100, 'evening', event || '', 'snip', 'no', affect || '', bondTarget || '', tension || '', resolves || ''];

console.log('═══ Section A — valence-signed nudge');
{
  // A1 positive affect naming the bond counterpart: 5 -> 5 + NUDGE, lastUpdate = cycle
  const bonds = [mkBond('POP-A', 'POP-B', 5)];
  const ctx = drainCtx([{ POPID: 'POP-A' }], [intk('POP-A', 'Relationship', 'Content', 'POP-B')], bonds, 100);
  C.compressLifeHistory_(ctx, { forceAll: true });
  assert('A1 Content nudges bond up by BOND_NUDGE', Math.abs(bonds[0].intensity - (5 + NUDGE)) < 1e-9, 'intensity=' + bonds[0].intensity);
  assert('A1 ...lastUpdate stamped with cycle', bonds[0].lastUpdate === 100, 'lastUpdate=' + bonds[0].lastUpdate);
  assert('A1 ...stats count the nudge', ctx.summary.lifeHistoryCompression.bondsNudged === 1);

  // A2 negative affect: 5 -> 5 - NUDGE
  const bonds2 = [mkBond('POP-C', 'POP-D', 5)];
  const ctx2 = drainCtx([{ POPID: 'POP-C' }], [intk('POP-C', 'Rivalry', 'Resentful', 'POP-D')], bonds2, 100);
  C.compressLifeHistory_(ctx2, { forceAll: true });
  assert('A2 Resentful nudges bond down by BOND_NUDGE', Math.abs(bonds2[0].intensity - (5 - NUDGE)) < 1e-9, 'intensity=' + bonds2[0].intensity);
}

console.log('═══ Section B — pair matching + per-cycle cap');
{
  // B1 reversed pair (bond stored B|A, reflection A names B... here C names F where bond is F|E)
  const bonds = [mkBond('POP-F', 'POP-E', 6)];
  const ctx = drainCtx([{ POPID: 'POP-E' }], [intk('POP-E', '', 'Excited', 'POP-F')], bonds, 100);
  C.compressLifeHistory_(ctx, { forceAll: true });
  assert('B1 unordered pair match (CitizenA/CitizenB flipped)', Math.abs(bonds[0].intensity - (6 + NUDGE)) < 1e-9, 'intensity=' + bonds[0].intensity);

  // B2 three positive rows, one side: capped at CAP
  const bonds2 = [mkBond('POP-G', 'POP-H', 5)];
  const ctx2 = drainCtx([{ POPID: 'POP-G' }],
    [0, 1, 2].map(() => intk('POP-G', '', 'Content', 'POP-H')), bonds2, 100);
  C.compressLifeHistory_(ctx2, { forceAll: true });
  assert('B2 3 same-side nudges capped at BOND_NUDGE_CYCLE_CAP', Math.abs(bonds2[0].intensity - (5 + CAP)) < 1e-9, 'intensity=' + bonds2[0].intensity);
  assert('B2 ...stats: 2 nudged (3rd capped)', ctx2.summary.lifeHistoryCompression.bondsNudged === 2,
    'bondsNudged=' + ctx2.summary.lifeHistoryCompression.bondsNudged);

  // B3 both directions share ONE cap (G names H +0.25, H names G +0.25, G again -> capped)
  const bonds3 = [mkBond('POP-G', 'POP-H', 5)];
  const ctx3 = drainCtx([{ POPID: 'POP-G' }, { POPID: 'POP-H' }],
    [intk('POP-G', '', 'Content', 'POP-H'), intk('POP-H', '', 'Calm', 'POP-G'), intk('POP-G', '', 'Content', 'POP-H')], bonds3, 100);
  C.compressLifeHistory_(ctx3, { forceAll: true });
  assert('B3 both directions share the per-pair cap', Math.abs(bonds3[0].intensity - (5 + CAP)) < 1e-9, 'intensity=' + bonds3[0].intensity);
}

console.log('═══ Section C — misses, neutrals, clamps');
{
  // C1 bondTarget with no matching bond: missed stat, no throw, no phantom bond
  const bonds = [mkBond('POP-X', 'POP-Y', 5)];
  const ctx = drainCtx([{ POPID: 'POP-M' }], [intk('POP-M', '', 'Angry', 'POP-ZZZZZ')], bonds, 100);
  C.compressLifeHistory_(ctx, { forceAll: true });
  assert('C1 unknown pair -> missed stat', ctx.summary.lifeHistoryCompression.bondTargetsMissed === 1,
    'missed=' + ctx.summary.lifeHistoryCompression.bondTargetsMissed);
  assert('C1 ...existing bonds untouched', bonds[0].intensity === 5);

  // C2 bondTarget but no affect (event-only row): valence 0 -> no nudge
  const bonds2 = [mkBond('POP-N', 'POP-O', 5)];
  const ctx2 = drainCtx([{ POPID: 'POP-N' }], [intk('POP-N', 'Career', '', 'POP-O')], bonds2, 100);
  C.compressLifeHistory_(ctx2, { forceAll: true });
  assert('C2 event-only row (no affect) does not nudge', bonds2[0].intensity === 5, 'intensity=' + bonds2[0].intensity);

  // C3 clamp at BOND_INTENSITY_MAX
  const bonds3 = [mkBond('POP-P', 'POP-Q', 9.9)];
  const ctx3 = drainCtx([{ POPID: 'POP-P' }],
    [0, 1].map(() => intk('POP-P', '', 'Energized', 'POP-Q')), bonds3, 100);
  C.compressLifeHistory_(ctx3, { forceAll: true });
  assert('C3 intensity clamps at 10', bonds3[0].intensity === 10, 'intensity=' + bonds3[0].intensity);

  // C4 tension/resolves columns present but NOT consumed (v1): same nudge as affect-only
  const bonds4 = [mkBond('POP-R', 'POP-S', 5)];
  const ctx4 = drainCtx([{ POPID: 'POP-R' }], [intk('POP-R', '', 'Content', 'POP-S', 'Will they forgive me?', 'old fight')], bonds4, 100);
  C.compressLifeHistory_(ctx4, { forceAll: true });
  assert('C4 cols J/K recorded-but-unconsumed (affect-only nudge)', Math.abs(bonds4[0].intensity - (5 + NUDGE)) < 1e-9, 'intensity=' + bonds4[0].intensity);
}

console.log('═══ Section D — back-compat + drain parity');
{
  // D1 pre-engine.101 8-wide row (no cols I-K): drains dials, no nudge, no crash
  const bonds = [mkBond('POP-T', 'POP-U', 5)];
  const row8 = ['t', 'POP-T', 100, 'evening', '', 'snip', 'no', 'Anxious'];
  const ctx = drainCtx([{ POPID: 'POP-T' }], [row8], bonds, 100);
  C.compressLifeHistory_(ctx, { forceAll: true });
  assert('D1 8-wide legacy row: no nudge', bonds[0].intensity === 5);
  assert('D1 ...dial drain still fires (composure moved)', baseOf(ctx, 0).composure < 50, 'composure=' + baseOf(ctx, 0).composure);

  // D2 applied='yes' audit unchanged on bond-carrying rows
  const ups = ctx.persist.updates;
  assert('D2 applied=yes intent still queued on col 7', ups.length === 1 && ups[0].tab === 'Reflection_Intake' && ups[0].col === 7 && ups[0].value === 'yes',
    JSON.stringify(ups.map(u => [u.row, u.col, u.value])));
}

if (failed) { console.error(failed + ' FAILURES (' + passed + ' passed)'); process.exit(1); }
console.log('engine101 bond write-back — all ' + passed + ' pass');
