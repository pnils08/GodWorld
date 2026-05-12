/**
 * sheets.test.js — coverage for pure-logic helpers in lib/sheets.js.
 *
 * The sheet I/O surface (getSheetData / appendRows / updateRange / etc.) is
 * tested elsewhere via the diagnosticLedger DI mock. This file covers
 * `columnIndexToLetter` — the load-bearing helper that every column-name
 * resolution depends on. Past column-letter guessing has been a documented
 * gotcha (Income at col26 = 'AA', not 'Z+1'). One assertion per landmine
 * locks the behavior.
 *
 * Run: node lib/sheets.test.js
 * Exits 0 on pass, 1 on failure.
 */

const sheets = require('./sheets');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: columnIndexToLetter — single-letter range A-Z');
{
  assert('0 → A', sheets.columnIndexToLetter(0) === 'A');
  assert('1 → B', sheets.columnIndexToLetter(1) === 'B');
  assert('25 → Z', sheets.columnIndexToLetter(25) === 'Z');
}

console.log('\nTest 2: columnIndexToLetter — boundary AA-AZ');
{
  assert('26 → AA (Simulation_Ledger Income landmine)', sheets.columnIndexToLetter(26) === 'AA');
  assert('27 → AB', sheets.columnIndexToLetter(27) === 'AB');
  assert('51 → AZ', sheets.columnIndexToLetter(51) === 'AZ');
}

console.log('\nTest 3: columnIndexToLetter — boundary BA-BZ');
{
  assert('52 → BA', sheets.columnIndexToLetter(52) === 'BA');
  assert('77 → BZ', sheets.columnIndexToLetter(77) === 'BZ');
}

console.log('\nTest 4: columnIndexToLetter — Simulation_Ledger documented landmines');
{
  // Per CLAUDE.md "Past Z: Income=col26, EducationLevel=col31, CareerStage=col33, Gender=col47 (AU)"
  // These constants are stored 1-based in some places, 0-based in others.
  // The 0-based column index for "col26" in 1-based parlance = 25 (A=col1 in 1-based, A=index 0).
  // CLAUDE.md uses 1-based "col26" but maps to "Past Z" range, so col26 (1-based) = index 25 = Z.
  // Wait — CLAUDE.md says Income=col26 AND past Z. Past Z means index 26+ (0-based). So
  // CLAUDE.md uses 1-based numbering: col26 (1-based) = index 25 = Z. But docstring says
  // "past Z" which means past index 25. Inconsistency in CLAUDE.md, but the helper itself
  // is testable from first principles: index 26 (0-based) = AA, which matches Income's
  // documented A1-notation of 'AA' in past sheet writes.
  assert('Income index 26 → AA', sheets.columnIndexToLetter(26) === 'AA');
  // EducationLevel at 1-based col31 = 0-based index 30 = AE
  assert('EducationLevel index 30 → AE', sheets.columnIndexToLetter(30) === 'AE');
  // CareerStage at 1-based col33 = 0-based index 32 = AG
  assert('CareerStage index 32 → AG', sheets.columnIndexToLetter(32) === 'AG');
  // Gender at 1-based col47 = 0-based index 46 = AU (per CLAUDE.md "Gender=col47 (AU)")
  assert('Gender index 46 → AU', sheets.columnIndexToLetter(46) === 'AU');
}

console.log('\nTest 5: columnIndexToLetter — beyond AZ rollover (BA, ZZ, AAA)');
{
  assert('51 → AZ', sheets.columnIndexToLetter(51) === 'AZ');
  assert('52 → BA', sheets.columnIndexToLetter(52) === 'BA');
  // ZZ = index 701 (26 single + 26*26 double = 26 + 676 = 702 entries; ZZ = index 701)
  assert('701 → ZZ', sheets.columnIndexToLetter(701) === 'ZZ');
  // AAA starts at index 702
  assert('702 → AAA', sheets.columnIndexToLetter(702) === 'AAA');
}

console.log('\nTest 6: module exports surface');
{
  // Verify the public API surface includes the load-bearing functions.
  // Catches accidental removal during refactor.
  assert('exports getSheetData', typeof sheets.getSheetData === 'function');
  assert('exports getSheetAsObjects', typeof sheets.getSheetAsObjects === 'function');
  assert('exports appendRows', typeof sheets.appendRows === 'function');
  assert('exports updateRange', typeof sheets.updateRange === 'function');
  assert('exports updateCell', typeof sheets.updateCell === 'function');
  assert('exports updateRowFields', typeof sheets.updateRowFields === 'function');
  assert('exports columnIndexToLetter', typeof sheets.columnIndexToLetter === 'function');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
