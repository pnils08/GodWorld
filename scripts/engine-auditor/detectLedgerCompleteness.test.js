/**
 * detectLedgerCompleteness.test.js — Phase 38.9 / G-ER9 (S246 ES-3).
 *
 * Covers: shape-aware completeness — row-presence for all configured sheets,
 * required-column whitelist for cycle-row sheets (World_Population), append-log
 * semantic-blank tolerance (no per-column flagging), not-loaded handling, the
 * ctx.ledgerCompleteness summary, and the checkMitigators not-applicable routing.
 *
 * Run: node scripts/engine-auditor/detectLedgerCompleteness.test.js
 * Exits 0 on pass, 1 on failure.
 */

const detector = require('./detectLedgerCompleteness');
const checkMitigators = require('./checkMitigators');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// A fully-populated World_Population C95 row (all required cols present).
function wpRow(cycle, overrides = {}) {
  return Object.assign({
    cycle, totalPopulation: 376000, sentiment: '0.61',
    trafficLoad: '0.4', retailLoad: '0.5', tourismLoad: '0.3',
    nightlifeLoad: '0.45', publicSpacesLoad: '0.5',
  }, overrides);
}
// An append-log event row with legitimate semantic blanks (no Holiday, etc.).
function eventRow(cycle, overrides = {}) {
  return Object.assign({
    Cycle: cycle, EventDescription: 'a thing happened', Domain: 'civic',
    Holiday: '', IsFirstFriday: '', SportsSeason: '',  // semantic blanks by design
  }, overrides);
}

console.log('Test 1: all sheets present + populated → no patterns, summary all ok');
{
  const ctx = {
    cycle: 95,
    snapshot: {
      World_Population: [wpRow(95)],
      WorldEvents_V3_Ledger: [eventRow(95)],
      WorldEvents_Ledger: [{ Cycle: 95, Description: 'x' }],
      Event_Arc_Ledger: [{ Cycle: 95, ArcId: 'A1', CycleResolved: '' }],  // unresolved = semantic blank
      Texture_Trigger_Log: [{ Cycle: 95, TextureKey: 'k', Holiday: '' }],
      Transit_Metrics: [{ Cycle: 95, Station: 'Fruitvale' }],
    },
  };
  const found = detector.detect(ctx);
  assert('no completeness patterns when all populated', found.length === 0, `got ${found.length}`);
  assert('summary sheetsChecked = 6', ctx.ledgerCompleteness.sheetsChecked === 6, `got ${ctx.ledgerCompleteness.sheetsChecked}`);
  assert('summary ok lists all 6', ctx.ledgerCompleteness.ok.length === 6);
  assert('no zeroRow', ctx.ledgerCompleteness.zeroRow.length === 0);
  assert('no partialColumns', ctx.ledgerCompleteness.partialColumns.length === 0);
}

console.log('\nTest 2: append-log semantic blanks are NOT flagged (row-presence only)');
{
  // Event rows with blank Holiday/FirstFriday/SportsSeason — legitimate. The
  // detector must not flag these (append-log requiredColumns is empty).
  const ctx = {
    cycle: 95,
    snapshot: {
      WorldEvents_V3_Ledger: [eventRow(95, { Holiday: '', IsFirstFriday: '', SportsSeason: '', CanonStatus: '' })],
    },
  };
  const found = detector.detect(ctx);
  assert('append-log with semantic blanks → no pattern', found.length === 0, `got ${found.length}`);
  assert('WorldEvents_V3_Ledger in ok', ctx.ledgerCompleteness.ok.indexOf('WorldEvents_V3_Ledger') >= 0);
}

console.log('\nTest 3: World_Population required columns blank → flagged (the live C95 gap)');
{
  const ctx = {
    cycle: 95,
    snapshot: {
      World_Population: [wpRow(95, {
        trafficLoad: '', retailLoad: '', tourismLoad: '',
        nightlifeLoad: '', publicSpacesLoad: '', sentiment: '',
      })],
    },
  };
  const found = detector.detect(ctx);
  assert('emits 1 blank-required-columns pattern', found.length === 1, `got ${found.length}`);
  assert('type ledger-completeness', found[0].type === 'ledger-completeness');
  assert('gap = blank-required-columns', found[0].evidence.gap === 'blank-required-columns');
  assert('severity medium', found[0].severity === 'medium', found[0].severity);
  assert('all 6 columns flagged', found[0].evidence.blankColumns.length === 6, JSON.stringify(found[0].evidence.blankColumns));
  assert('summary partialColumns populated', ctx.ledgerCompleteness.partialColumns.length === 1);
}

console.log('\nTest 4: World_Population partial blank (some cols present) → only blank ones flagged');
{
  const ctx = {
    cycle: 95,
    snapshot: {
      World_Population: [wpRow(95, { trafficLoad: '', sentiment: '' })],  // 2 blank, 4 present
    },
  };
  const found = detector.detect(ctx);
  assert('emits 1 pattern', found.length === 1);
  assert('only the 2 blank cols flagged', found[0].evidence.blankColumns.length === 2, JSON.stringify(found[0].evidence.blankColumns));
  assert('trafficLoad flagged', found[0].evidence.blankColumns.indexOf('trafficLoad') >= 0);
  assert('sentiment flagged', found[0].evidence.blankColumns.indexOf('sentiment') >= 0);
}

console.log('\nTest 5: zero current-cycle rows → flagged at per-sheet severity');
{
  const ctx = {
    cycle: 95,
    snapshot: {
      World_Population: [wpRow(94)],          // only a C94 row → zero C95 → HIGH
      Transit_Metrics: [{ Cycle: 94, Station: 'x' }],  // zero C95 → MEDIUM
    },
  };
  const found = detector.detect(ctx);
  assert('2 zero-row patterns', found.length === 2, `got ${found.length}`);
  const wp = found.find(p => p.evidence.sheet === 'World_Population');
  const tm = found.find(p => p.evidence.sheet === 'Transit_Metrics');
  assert('World_Population zero-row HIGH', wp && wp.severity === 'high', wp && wp.severity);
  assert('Transit_Metrics zero-row MEDIUM', tm && tm.severity === 'medium', tm && tm.severity);
  assert('gap = no-current-cycle-rows', wp.evidence.gap === 'no-current-cycle-rows');
  assert('summary zeroRow lists both', ctx.ledgerCompleteness.zeroRow.length === 2);
}

console.log('\nTest 6: zero-row short-circuits the column check (no double-flag)');
{
  const ctx = {
    cycle: 95,
    snapshot: { World_Population: [] },  // present but empty → zero C95 rows
  };
  const found = detector.detect(ctx);
  const wpPatterns = found.filter(p => p.evidence.sheet === 'World_Population');
  assert('exactly 1 World_Population pattern (zero-row, not also column)', wpPatterns.length === 1, `got ${wpPatterns.length}`);
  assert('it is the zero-row gap', wpPatterns[0].evidence.gap === 'no-current-cycle-rows');
}

console.log('\nTest 7: sheet absent from snapshot → notLoaded, not flagged');
{
  const ctx = {
    cycle: 95,
    snapshot: { World_Population: [wpRow(95)] },  // only WP present; others absent
  };
  const found = detector.detect(ctx);
  assert('no patterns for absent sheets', found.length === 0, `got ${found.length}`);
  assert('absent sheets recorded in notLoaded', ctx.ledgerCompleteness.notLoaded.length === 5, `got ${ctx.ledgerCompleteness.notLoaded.length}`);
  assert('only WP counted as checked', ctx.ledgerCompleteness.sheetsChecked === 1);
}

console.log('\nTest 8: cycle hint parsing — "C95" string format resolves');
{
  const ctx = {
    cycle: 95,
    snapshot: { Transit_Metrics: [{ Cycle: 'C95', Station: 'Fruitvale' }] },
  };
  const found = detector.detect(ctx);
  assert('C95 string parsed as current cycle (no zero-row flag)', found.length === 0, `got ${found.length}`);
}

console.log('\nTest 9: ledger-completeness routes not-applicable through checkMitigators');
{
  const patterns = [{
    type: 'ledger-completeness',
    severity: 'high',
    affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
    evidence: { sheet: 'World_Population', gap: 'no-current-cycle-rows' },
    description: 'x',
  }];
  checkMitigators.enrich(patterns, { snapshot: {}, prior: [], cycle: 95 });
  assert('mitigatorState.gap = not-applicable', patterns[0].mitigatorState.gap === 'not-applicable', patterns[0].mitigatorState.gap);
  assert('recommendedAction = none', patterns[0].mitigatorState.recommendedAction === 'none');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
