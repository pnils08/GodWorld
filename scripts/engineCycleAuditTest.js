#!/usr/bin/env node
/**
 * engineCycleAuditTest.js — Synthetic-fixture test for header-drift detector.
 *
 * Validates Phase 1 grill Q3 acceptance criterion: detector would have caught
 * the S201 Story_Seed_Deck/Story_Hook_Deck drift had it existed pre-S201.
 *
 * Two cases:
 *   1. Pre-S201 schema (19 calendar-style cols) + post-S201 writer (references
 *      SuggestedJournalist/SuggestedAngle/etc.) → expect Type-2 entries.
 *   2. Post-S201 schema (12 cols, has SuggestedJournalist) + same writer → 0 entries.
 *
 * Usage: node scripts/engineCycleAuditTest.js
 */

const { runHeaderDriftCheck, parseSchemaHeaders, scanWriterFile } = require('./engineCycleAudit.js');

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) {
    pass++;
    process.stdout.write(`  PASS  ${label}\n`);
  } else {
    fail++;
    process.stdout.write(`  FAIL  ${label}\n`);
  }
}

// ---------------------------------------------------------------------------
// Fixture A — pre-S201 Story_Seed_Deck schema (19 calendar-shaped cols)
// ---------------------------------------------------------------------------
const PRE_S201_SCHEMA_MD = `
## Story_Seed_Deck

- **Rows:** 100
- **Columns:** 19

| Col | Header |
|-----|--------|
| A | CycleAdded |
| B | StorylineId |
| C | CalendarMonth |
| D | CalendarWeek |
| E | DayOfWeek |
| F | TimeWindow |
| G | SeasonalTag |
| H | Status |
| I | Description |
| J | Neighborhood |
| K | Priority |
| L | NotesField |
| M | Reserved1 |
| N | Reserved2 |
| O | Reserved3 |
| P | Reserved4 |
| Q | Reserved5 |
| R | Reserved6 |
| S | Reserved7 |
`;

// ---------------------------------------------------------------------------
// Fixture B — post-S201 Story_Seed_Deck schema (12 cols, has new routing fields)
// ---------------------------------------------------------------------------
const POST_S201_SCHEMA_MD = `
## Story_Seed_Deck

- **Rows:** 1109
- **Columns:** 12

| Col | Header |
|-----|--------|
| A | CycleAdded |
| B | StorylineId |
| C | Status |
| D | Description |
| E | Neighborhood |
| F | Priority |
| G | RelatedCitizens |
| H | StorylineType |
| I | SuggestedJournalist |
| J | SuggestedAngle |
| K | SuggestedVoice |
| L | Confidence |
`;

// ---------------------------------------------------------------------------
// Fixture C — synthetic post-S201 writer (calls field-name lookups)
// ---------------------------------------------------------------------------
const SYNTHETIC_WRITER_CONTENT = `
function saveSeedRow_(ctx, seed) {
  var sheet = ctx.ss.getSheetByName('Story_Seed_Deck');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = function(name) { return headers.indexOf(name); };
  var row = [];
  row[col('CycleAdded')] = ctx.cycle;
  row[col('StorylineId')] = seed.id;
  row[col('Status')] = 'active';
  row[col('Description')] = seed.description;
  row[col('SuggestedJournalist')] = seed.journalist;
  row[col('SuggestedAngle')] = seed.angle;
  row[col('SuggestedVoice')] = seed.voice;
  row[col('Confidence')] = seed.confidence;
  sheet.appendRow(row);
}
`;

// ---------------------------------------------------------------------------
// Run cases
// ---------------------------------------------------------------------------
process.stdout.write('engineCycleAuditTest: header-drift detector\n\n');

const syntheticWriter = scanWriterFile('synthetic/saveSeedRow.js', SYNTHETIC_WRITER_CONTENT);

// Sanity: writer scan extracted the right field-names + sheet target.
assert(syntheticWriter.sheets.length === 1 && syntheticWriter.sheets[0] === 'Story_Seed_Deck',
  'scanWriterFile detects sheet target');
assert(syntheticWriter.fieldNames.includes('SuggestedJournalist'),
  'scanWriterFile extracts SuggestedJournalist via local-helper resolution');
assert(syntheticWriter.fieldNames.includes('Confidence'),
  'scanWriterFile extracts Confidence');

// Case 1 — pre-S201 schema would have caught the S201-class drift.
const preSchema = parseSchemaHeaders(PRE_S201_SCHEMA_MD);
const preDrifts = runHeaderDriftCheck(preSchema, [syntheticWriter]);
const preMissing = ['SuggestedJournalist', 'SuggestedAngle', 'SuggestedVoice', 'Confidence', 'RelatedCitizens', 'StorylineType']
  .filter(fn => preDrifts.some(d => d.title.includes(`'${fn}'`)));
assert(preDrifts.length >= 4,
  `pre-S201 schema flags 4+ drift entries (got ${preDrifts.length})`);
assert(preDrifts.every(d => d.severity === 'MED'),
  'pre-S201 entries are all MED (Type-2 mismatch)');
assert(preMissing.includes('SuggestedJournalist') && preMissing.includes('SuggestedAngle'),
  'pre-S201 flags the canonical S201 routing fields (SuggestedJournalist + SuggestedAngle)');

// Case 2 — post-S201 schema produces 0 drift entries.
const postSchema = parseSchemaHeaders(POST_S201_SCHEMA_MD);
const postDrifts = runHeaderDriftCheck(postSchema, [syntheticWriter]);
assert(postDrifts.length === 0,
  `post-S201 schema produces 0 drift entries (got ${postDrifts.length})`);

// Case 3 — case-mismatch promotion (lowercase writer vs PascalCase header).
const caseMismatchWriter = scanWriterFile('synthetic/caseMismatch.js', `
function readCalendar_() {
  var sheet = ss.getSheetByName('Simulation_Calendar');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('season') >= 0) {}
  if (headers.indexOf('holiday') >= 0) {}
}
`);
const caseSchema = parseSchemaHeaders(`
## Simulation_Calendar

- **Rows:** 1
- **Columns:** 5

| Col | Header |
|-----|--------|
| A | CycleNumber |
| B | Month |
| C | Season |
| D | Holiday |
| E | DayOfWeek |
`);
const caseDrifts = runHeaderDriftCheck(caseSchema, [caseMismatchWriter]);
assert(caseDrifts.length === 2,
  `case-mismatch produces 2 entries (got ${caseDrifts.length})`);
assert(caseDrifts.every(d => d.title.includes('case-mismatch') && d.title.includes('silent-fail')),
  'case-mismatch entries carry the silent-fail diagnosis');

// Case 4 — trim tolerance (defensive trailing-space header).
const trimWriter = scanWriterFile('synthetic/trim.js', `
var middleCol = headers.indexOf('Middle ');
`);
const trimSchema = parseSchemaHeaders(`
## Test_Sheet

- **Rows:** 1
- **Columns:** 1

| Col | Header |
|-----|--------|
| A | Middle |
`);
const trimDrifts = runHeaderDriftCheck(trimSchema, [trimWriter]);
assert(trimDrifts.length === 0,
  `trim tolerance kills false positive on 'Middle ' vs live 'Middle' (got ${trimDrifts.length} entries, want 0)`);

// Case 5 — target-sheet mismatch (writer targets sheet X, field exists on Y).
// Mirrors the C93 finalizeWorldPopulation finding: writer references season/holiday
// against World_Population (which has neither), but Season exists on Simulation_Calendar.
const targetMismatchWriter = scanWriterFile('synthetic/targetMismatch.js', `
function writeRow_(ctx) {
  var sheet = ctx.ss.getSheetByName('World_Population');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idx = function(name) { return headers.indexOf(name); };
  if (idx('season') >= 0) {}
  if (idx('Holiday') >= 0) {}
}
`);
const mismatchSchema = parseSchemaHeaders(`
## World_Population

- **Rows:** 2
- **Columns:** 3

| Col | Header |
|-----|--------|
| A | timestamp |
| B | totalPopulation |
| C | sentiment |

---

## Simulation_Calendar

- **Rows:** 2
- **Columns:** 2

| Col | Header |
|-----|--------|
| A | Season |
| B | Holiday |
`);
const mismatchDrifts = runHeaderDriftCheck(mismatchSchema, [targetMismatchWriter]);
assert(mismatchDrifts.length === 2,
  `target-mismatch produces 2 entries (got ${mismatchDrifts.length})`);
assert(mismatchDrifts.every(d => d.severity === 'MED'),
  'target-mismatch entries are MED (writer wrong-sheet, not same-sheet case-fail HIGH)');
assert(mismatchDrifts.some(d => d.diagnosis.includes('Simulation_Calendar')),
  'target-mismatch diagnosis points at the sheet that DOES have the field');
assert(mismatchDrifts.some(d => d.title.includes("not on 'World_Population'") || d.title.includes("not on target 'World_Population'") || d.title.includes("not on target")),
  'target-mismatch title names the writer\'s wrong target sheet');

// Case 5b — defensive-fallback recognition: when sibling literal exact-matches
// the target, case-variant siblings are dead-but-harmless fallbacks (LOW, not HIGH).
// Mirrors cycleExportAutomation.js:395-397 pattern.
const defensiveFallbackWriter = scanWriterFile('synthetic/defensive.js', `
function getCycle_(ss) {
  var sheet = ss.getSheetByName('World_Population');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var cycleIdx = headers.indexOf('cycle');
  if (cycleIdx < 0) cycleIdx = headers.indexOf('Cycle');
  if (cycleIdx < 0) cycleIdx = headers.indexOf('AbsoluteCycle');
  return cycleIdx;
}
`);
const defensiveSchema = parseSchemaHeaders(`
## World_Population

- **Rows:** 2
- **Columns:** 1

| Col | Header |
|-----|--------|
| A | cycle |
`);
const defensiveDrifts = runHeaderDriftCheck(defensiveSchema, [defensiveFallbackWriter]);
const cycleHigh = defensiveDrifts.find(d => d.title.includes("'Cycle'") && d.severity === 'HIGH');
const cycleLow = defensiveDrifts.find(d => d.title.includes("'Cycle'") && d.severity === 'LOW');
assert(!cycleHigh,
  'defensive-fallback: PascalCase Cycle does NOT produce HIGH (sibling lowercase cycle matches target)');
assert(cycleLow && cycleLow.title.includes('defensive-fallback'),
  'defensive-fallback: PascalCase Cycle is LOW with defensive-fallback diagnosis');
assert(defensiveDrifts.every(d => d.severity !== 'HIGH'),
  'defensive-fallback: 0 HIGH entries in chained fallback pattern');

// Case 6 — same-sheet case mismatch is HIGH (definitive silent-fail), not MED.
const sameSheetCaseWriter = scanWriterFile('synthetic/sameSheetCase.js', `
function read_(ss) {
  var sheet = ss.getSheetByName('Test_Sheet');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('myfield') >= 0) {}
}
`);
const sameSheetSchema = parseSchemaHeaders(`
## Test_Sheet

- **Rows:** 1
- **Columns:** 1

| Col | Header |
|-----|--------|
| A | MyField |
`);
const sameSheetDrifts = runHeaderDriftCheck(sameSheetSchema, [sameSheetCaseWriter]);
assert(sameSheetDrifts.length === 1 && sameSheetDrifts[0].severity === 'HIGH',
  'same-sheet case mismatch produces 1 HIGH entry (definitive silent-fail)');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
