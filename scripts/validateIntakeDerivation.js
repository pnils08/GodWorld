#!/usr/bin/env node
/**
 * validateIntakeDerivation.js — Phase 5 validation for the intake-side
 * citizen derivation library.
 *
 * Plan: docs/plans/2026-04-28-intake-side-citizen-derivation.md §Phase 5
 *
 * Confirms the Node-side `lib/citizenDerivation` produces:
 *   - all 8 fields populated for every synthetic candidate
 *   - zero 'Citizen' literal RoleTypes
 *   - per-(first,last,popId) determinism (same seed → same values across runs)
 *   - non-uniform distributions on a 100-citizen synthetic batch
 *
 * Apps Script parity isn't testable here (different runtime); the Apps Script
 * library `utilities/citizenDerivation.js` is a line-by-line port so behavior
 * matches by construction. Apps Script-side validation happens at the next
 * cycle run that exercises processAdvancementIntake new-citizen branch.
 *
 * Usage:
 *   node scripts/validateIntakeDerivation.js          # report
 *   node scripts/validateIntakeDerivation.js --json   # full JSON output
 */

require('../lib/env');
const sheets = require('../lib/sheets');
const cd = require('../lib/citizenDerivation');

async function main() {
  const wantJson = process.argv.includes('--json');

  // Build live ledger snapshot for neighborhood-aware draws.
  const raw = await sheets.getRawSheetData('Simulation_Ledger');
  const headers = raw[0];
  const ledgerFreq = cd.buildLedgerFreqSnapshot(headers, raw, { includesHeader: true });

  console.log('═══ Phase 5 — Intake derivation validation ═══\n');
  console.log('Snapshot: ' + Object.keys(ledgerFreq.byNeighborhood).length + ' neighborhoods, ' +
    Object.keys(ledgerFreq.citywide.roleTypes).length + ' citywide roles\n');

  // ── Plan validation fixture ───────────────────────────────────────────────
  const fixture = [
    { name: 'Maria Vega',  popId: 'POP-99001', nbhd: 'Fruitvale',   age: 34 },
    { name: 'Tobias Wing', popId: 'POP-99002', nbhd: 'Rockridge',   age: 67 },
    { name: 'Kevin Park',  popId: 'POP-99003', nbhd: 'Jack London', age: 22 },
  ];

  console.log('── Fixture (Plan §Validation fixture) ──');
  for (const f of fixture) {
    const seed = f.name.split(' ').join('|') + '|' + f.popId;
    const p = cd.deriveCitizenProfile(seed, f.age, f.nbhd, ledgerFreq);
    console.log('\n[' + f.name + ' | ' + f.nbhd + ' | age ' + f.age + ']');
    console.log('  RoleType:       ' + p.RoleType);
    console.log('  EducationLevel: ' + p.EducationLevel);
    console.log('  Gender:         ' + p.Gender);
    console.log('  YearsInCareer:  ' + p.YearsInCareer);
    console.log('  DebtLevel:      ' + p.DebtLevel);
    console.log('  NetWorth:       $' + p.NetWorth.toLocaleString());
    console.log('  MaritalStatus:  ' + p.MaritalStatus);
    console.log('  NumChildren:    ' + p.NumChildren);
  }

  // ── Acceptance gates ──────────────────────────────────────────────────────
  const failures = [];

  // Gate 1: Every fixture entry has all 8 fields populated.
  for (const f of fixture) {
    const seed = f.name.split(' ').join('|') + '|' + f.popId;
    const p = cd.deriveCitizenProfile(seed, f.age, f.nbhd, ledgerFreq);
    const required = ['RoleType', 'EducationLevel', 'Gender', 'YearsInCareer',
                      'DebtLevel', 'NetWorth', 'MaritalStatus', 'NumChildren'];
    for (const k of required) {
      if (p[k] == null || p[k] === '') failures.push('[Gate 1] ' + f.name + ' missing ' + k);
    }
  }

  // Gate 2: Zero 'Citizen' literal RoleType across 200-citizen sweep.
  const sweep = [];
  for (let i = 0; i < 200; i++) {
    const seed = 'Sweep|Citizen|POP-' + String(80000 + i).padStart(5, '0');
    const age = 18 + (i * 7) % 60;
    const nbhds = ['Temescal', 'Fruitvale', 'West Oakland', 'Rockridge', 'Jack London',
                   'Lake Merritt', 'Adams Point', 'Chinatown', 'Downtown', 'Uptown'];
    const nbhd = nbhds[i % nbhds.length];
    sweep.push({ seed, age, nbhd, profile: cd.deriveCitizenProfile(seed, age, nbhd, ledgerFreq) });
  }
  const citizenLiterals = sweep.filter(s => s.profile.RoleType === 'Citizen').length;
  if (citizenLiterals > 0) failures.push('[Gate 2] ' + citizenLiterals + ' synthetic citizens have RoleType="Citizen" literal');

  // Gate 3: Determinism — same seed → same values across runs.
  const detSeed = 'Maria|Vega|POP-99001';
  const a = cd.deriveCitizenProfile(detSeed, 34, 'Fruitvale', ledgerFreq);
  const b = cd.deriveCitizenProfile(detSeed, 34, 'Fruitvale', ledgerFreq);
  if (JSON.stringify(a) !== JSON.stringify(b)) failures.push('[Gate 3] determinism violated');

  // Gate 4: Distribution non-uniformity across the 200-citizen sweep.
  const ms = {}; sweep.forEach(s => ms[s.profile.MaritalStatus] = (ms[s.profile.MaritalStatus] || 0) + 1);
  const nc = {}; sweep.forEach(s => nc[s.profile.NumChildren] = (nc[s.profile.NumChildren] || 0) + 1);
  const gn = {}; sweep.forEach(s => gn[s.profile.Gender] = (gn[s.profile.Gender] || 0) + 1);
  const distinctRoles = new Set(sweep.map(s => s.profile.RoleType)).size;
  if (Object.keys(ms).length < 4) failures.push('[Gate 4] MaritalStatus only ' + Object.keys(ms).length + ' distinct values (expect ≥4 across 200 draws)');
  if (Object.keys(nc).length < 4) failures.push('[Gate 4] NumChildren only ' + Object.keys(nc).length + ' distinct values (expect ≥4)');
  if (distinctRoles < 15) failures.push('[Gate 4] only ' + distinctRoles + ' distinct RoleTypes across 200 draws (expect ≥15)');

  console.log('\n── Distribution sweep (200 synthetic citizens) ──');
  console.log('  MaritalStatus: ' + JSON.stringify(ms));
  console.log('  NumChildren:   ' + JSON.stringify(nc));
  console.log('  Gender:        ' + JSON.stringify(gn));
  console.log('  Distinct RoleTypes: ' + distinctRoles + ' / 200');

  // Gate 5: ECONOMIC_PARAMETERS embedding parity (Apps Script side).
  const fs = require('fs');
  const path = require('path');
  const appsScript = fs.readFileSync(path.resolve(__dirname, '..', 'utilities', 'citizenDerivation.js'), 'utf-8');
  const startMarker = 'ECONOMIC_PARAMETERS_START';
  const endMarker = 'ECONOMIC_PARAMETERS_END';
  const startIdx = appsScript.indexOf(startMarker);
  const endIdx = appsScript.indexOf(endMarker);
  if (startIdx < 0 || endIdx < 0) {
    failures.push('[Gate 5] Apps Script ECONOMIC_PARAMETERS block markers missing');
  } else {
    const block = appsScript.slice(startIdx, endIdx);
    const entryCount = (block.match(/"role":/g) || []).length;
    const expected = cd.ECONOMIC_PARAMETERS.length;
    if (entryCount !== expected) {
      failures.push('[Gate 5] Apps Script embedded ' + entryCount + ' entries; expected ' + expected + ' — run `node scripts/syncEconomicParameters.js`');
    }
  }

  // ── Verdict ──────────────────────────────────────────────────────────────
  console.log('\n── Verdict ──');
  if (failures.length === 0) {
    console.log('  PASS — all 5 gates green.');
  } else {
    console.log('  FAIL — ' + failures.length + ' gate(s):');
    failures.forEach(f => console.log('    ' + f));
  }

  if (wantJson) {
    const outPath = path.resolve(__dirname, '..', 'output', 'validate_intake_derivation.json');
    fs.writeFileSync(outPath, JSON.stringify({
      fixture: fixture.map(f => ({
        ...f,
        profile: cd.deriveCitizenProfile(f.name.split(' ').join('|') + '|' + f.popId, f.age, f.nbhd, ledgerFreq),
      })),
      sweep,
      distributions: { ms, nc, gn, distinctRoles },
      gates: { failures, passed: failures.length === 0 },
    }, null, 2));
    console.log('\n  JSON written to ' + outPath);
  }

  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
