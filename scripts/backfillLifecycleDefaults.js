#!/usr/bin/env node
/**
 * backfillLifecycleDefaults.js — ENGINE_REPAIR Row 4 (S184)
 *
 * Migration scripts (addEducationCareerColumns, addHouseholdFamilyColumns,
 * addGenerationalWealthColumns) seeded uniform constants across every existing
 * Simulation_Ledger row when the columns were added. Lifecycle engines update
 * these fields on triggers (marriage, inheritance, +0.1 YearsInCareer/cycle)
 * but most citizens never had a trigger — so 95-99% of rows still hold the
 * migration default value, indistinguishable from each other.
 *
 * This script gives every row a demographically-plausible starting value
 * derived from existing context (Age via BirthYear, Income, RoleType). The
 * engines continue per-event updates from there.
 *
 * Fields backfilled (only when value matches the known migration constant):
 *   - YearsInCareer  (constant 12.5 → age-bracket bell, retiree-aware)
 *   - DebtLevel      (constant 2    → income-inverse + age curve, 0-10 scale)
 *   - NetWorth       (constant 0    → age-conditioned + income-multiplied)
 *   - MaritalStatus  (constant single → age-bracket CDF)
 *   - NumChildren    (constant 0    → age + marriage-conditioned fertility CDF)
 *
 * Determinism: djb2 hash on POPID drives draws — same POPID always gets same
 * values. Safety: only overwrites rows currently at the migration constant;
 * preserves any non-default values (real edits or engine-applied updates).
 *
 * Usage:
 *   node scripts/backfillLifecycleDefaults.js              # default: dry-run, summary
 *   node scripts/backfillLifecycleDefaults.js --apply      # write to live sheet
 *   node scripts/backfillLifecycleDefaults.js --json       # full per-row diff JSON
 */

require('../lib/env');
const sheets = require('../lib/sheets');

const SHEET = 'Simulation_Ledger';
const ANCHOR_YEAR = 2041;

const FIELD_CONSTANTS = {
  YearsInCareer: 12.5,
  DebtLevel: 2,
  NetWorth: 0,
  MaritalStatus: 'single',
  NumChildren: 0,
};

// djb2 string hash — same pattern as processAdvancementIntake.js Row 17 fix.
function hashSeed(s) {
  let h = 5381;
  s = String(s || '');
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Deterministic draw in [0, 1) — different stream per field by salting POPID.
function rand01(popId, salt) {
  return (hashSeed(popId + '|' + salt) % 1000000) / 1000000;
}

// Pick from a CDF array of [value, cumulativeProbability] using a [0,1) draw.
function pickFromCDF(r, cdf) {
  for (const [value, threshold] of cdf) {
    if (r < threshold) return value;
  }
  return cdf[cdf.length - 1][0];
}

function ageBracket(age) {
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 50) return '35-49';
  if (age < 65) return '50-64';
  return '65+';
}

// ─── YearsInCareer ──────────────────────────────────────────────────────────
// Age-bracket draw; retirees use peak career length.
function deriveYearsInCareer(popId, age, careerStage) {
  const r = rand01(popId, 'YearsInCareer');
  const stage = String(careerStage || '').toLowerCase();

  if (stage === 'retired') {
    // Worked roughly 35-45 years before retirement.
    return Math.round((35 + r * 10) * 10) / 10;
  }
  // Default: career length tracks age. Career typically starts ~22 for
  // bachelor track, ~18 for trade/no-college. Add bracket variance.
  const minStart = age >= 30 ? 18 : 18;  // career started by 18 at earliest
  const maxYears = Math.max(0, age - minStart);
  if (maxYears <= 0) return 0;

  // Bell-shaped: most rows get a value in mid-range of (0, maxYears).
  const center = maxYears * 0.55;
  const span = maxYears * 0.35;
  const draw = center + span * (r - 0.5) * 2;
  return Math.round(Math.max(0.5, Math.min(maxYears, draw)) * 10) / 10;
}

// ─── DebtLevel (0-10) ───────────────────────────────────────────────────────
// Income-inverse + age curve. 0=debt-free, 10=severe debt.
function deriveDebtLevel(popId, age, income) {
  const r = rand01(popId, 'DebtLevel');
  const inc = Number(income) || 0;

  let base;
  if (inc < 40000) base = 5;       // higher debt burden at low income
  else if (inc < 100000) base = 3; // typical middle
  else if (inc < 250000) base = 2; // lower
  else base = 1;                   // wealthy carry less consumer debt

  // Age curve: 18-30 carries student loan debt; 65+ has paid off mortgages.
  if (age >= 18 && age < 30) base += 1.5;
  else if (age >= 65) base -= 1.5;

  // Determinism wobble: ±2 around base.
  const wobble = (r - 0.5) * 4;
  const final = Math.round(Math.max(0, Math.min(10, base + wobble)));
  return final;
}

// ─── NetWorth ───────────────────────────────────────────────────────────────
// Age-conditioned + income-multiplied. Calibrated for prosperity-era Oakland.
function deriveNetWorth(popId, age, income, careerStage) {
  const r = rand01(popId, 'NetWorth');
  const inc = Number(income) || 0;
  const stage = String(careerStage || '').toLowerCase();

  // Age baseline (median 2041 prosperity-era American by age):
  let ageBase;
  if (age < 25) ageBase = 8000;
  else if (age < 35) ageBase = 60000;
  else if (age < 50) ageBase = 200000;
  else if (age < 65) ageBase = 450000;
  else ageBase = 600000; // retired but still holding home equity etc.

  // Income multiplier: high earners scale up dramatically.
  let incMult = 1.0;
  if (inc > 100000) incMult = 1.5;
  if (inc > 250000) incMult = 3.0;
  if (inc > 500000) incMult = 7.0;
  if (inc > 1000000) incMult = 15.0;

  // Retiree bonus: peak career multipler (lifetime accumulation).
  if (stage === 'retired') incMult *= 1.4;

  // Wobble: 0.4x to 2.5x baseline (broad spread within bracket).
  const wobble = 0.4 + r * 2.1;

  const raw = ageBase * incMult * wobble;
  // Round to nearest $1k.
  return Math.round(raw / 1000) * 1000;
}

// ─── MaritalStatus ──────────────────────────────────────────────────────────
// Age-bracket CDF. Calibrated to 2020s US baseline + slight prosperity-era
// Oakland tweak (marginally higher partnered/married rates).
function deriveMaritalStatus(popId, age) {
  const r = rand01(popId, 'MaritalStatus');
  const bracket = ageBracket(age);

  const CDF = {
    '18-24': [['single', 0.88], ['partnered', 0.97], ['married', 1.00]],
    '25-34': [['single', 0.45], ['partnered', 0.62], ['married', 0.93], ['divorced', 1.00]],
    '35-49': [['single', 0.22], ['partnered', 0.32], ['married', 0.85], ['divorced', 0.97], ['widowed', 1.00]],
    '50-64': [['single', 0.15], ['partnered', 0.20], ['married', 0.78], ['divorced', 0.93], ['widowed', 1.00]],
    '65+':   [['single', 0.10], ['partnered', 0.13], ['married', 0.65], ['divorced', 0.78], ['widowed', 1.00]],
  };
  return pickFromCDF(r, CDF[bracket]);
}

// ─── NumChildren ────────────────────────────────────────────────────────────
// Age + marriage-conditioned. Married/partnered → higher fertility.
function deriveNumChildren(popId, age, maritalStatus) {
  const r = rand01(popId, 'NumChildren');
  const ms = String(maritalStatus || '').toLowerCase();
  const bracket = ageBracket(age);
  const partnered = ms === 'married' || ms === 'partnered';

  // CDF varies by (bracket, partnered).
  const CDF = {
    '18-24-single':    [[0, 0.95], [1, 0.99], [2, 1.00]],
    '18-24-partnered': [[0, 0.80], [1, 0.95], [2, 1.00]],
    '25-34-single':    [[0, 0.78], [1, 0.92], [2, 0.99], [3, 1.00]],
    '25-34-partnered': [[0, 0.45], [1, 0.72], [2, 0.92], [3, 0.99], [4, 1.00]],
    '35-49-single':    [[0, 0.55], [1, 0.78], [2, 0.93], [3, 0.99], [4, 1.00]],
    '35-49-partnered': [[0, 0.18], [1, 0.43], [2, 0.78], [3, 0.93], [4, 0.99], [5, 1.00]],
    '50-64-single':    [[0, 0.40], [1, 0.65], [2, 0.85], [3, 0.95], [4, 1.00]],
    '50-64-partnered': [[0, 0.15], [1, 0.40], [2, 0.70], [3, 0.88], [4, 0.97], [5, 1.00]],
    '65+-single':      [[0, 0.30], [1, 0.55], [2, 0.78], [3, 0.92], [4, 1.00]],
    '65+-partnered':   [[0, 0.12], [1, 0.32], [2, 0.62], [3, 0.83], [4, 0.95], [5, 1.00]],
  };
  const key = bracket + '-' + (partnered ? 'partnered' : 'single');
  return pickFromCDF(r, CDF[key]);
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const wantJson = argv.includes('--json');

  const rows = await sheets.getSheetAsObjects(SHEET);
  const raw = await sheets.getRawSheetData(SHEET);
  const headers = raw[0];

  const popIdx = headers.indexOf('POPID');
  const fieldCols = {};
  for (const f of Object.keys(FIELD_CONSTANTS)) {
    fieldCols[f] = headers.indexOf(f);
    if (fieldCols[f] < 0) {
      console.error(`ERROR: Field ${f} not found in ${SHEET} headers`);
      process.exit(1);
    }
  }

  const stats = {
    totalRows: rows.length,
    perField: {},
    diffs: [],
  };
  for (const f of Object.keys(FIELD_CONSTANTS)) {
    stats.perField[f] = { candidates: 0, written: 0, distribution: {} };
  }

  // Plan all updates.
  const plan = [];  // { sheetRow, field, before, after }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const popId = row.POPID;
    if (!popId) continue;

    const birthYear = Number(row.BirthYear) || null;
    if (!birthYear) continue;
    const age = ANCHOR_YEAR - birthYear;
    if (age < 0 || age > 110) continue;

    const income = row.Income;
    const careerStage = row.CareerStage;
    const sheetRow = i + 2; // +1 header, +1 1-indexing

    // First derive marital status (NumChildren depends on it).
    const newMarital = deriveMaritalStatus(popId, age);

    const computed = {
      YearsInCareer: deriveYearsInCareer(popId, age, careerStage),
      DebtLevel: deriveDebtLevel(popId, age, income),
      NetWorth: deriveNetWorth(popId, age, income, careerStage),
      MaritalStatus: newMarital,
      NumChildren: deriveNumChildren(popId, age, newMarital),
    };

    const diff = { popId, age, computed: {}, current: {} };
    let touched = false;

    for (const f of Object.keys(FIELD_CONSTANTS)) {
      const current = row[f];
      const constant = FIELD_CONSTANTS[f];

      // Only overwrite if current value EQUALS the migration constant
      // (preserves engine-applied updates and real edits).
      const currentMatches =
        (typeof constant === 'number' && Number(current) === constant) ||
        (typeof constant === 'string' && String(current).trim().toLowerCase() === constant);

      if (!currentMatches) continue;

      stats.perField[f].candidates++;
      const newValue = computed[f];

      // Distribution tracking.
      const distKey = String(newValue);
      stats.perField[f].distribution[distKey] = (stats.perField[f].distribution[distKey] || 0) + 1;

      diff.current[f] = current;
      diff.computed[f] = newValue;
      touched = true;

      plan.push({ sheetRow, field: f, col: fieldCols[f], before: current, after: newValue });
    }

    if (touched) stats.diffs.push(diff);
  }

  // Apply or report.
  if (apply) {
    console.log(`Applying ${plan.length} cell writes via batchUpdate...`);
    // Build batchUpdate payload: one entry per cell, chunked to avoid request size limits.
    const updates = plan.map(p => ({
      range: `${SHEET}!${colToLetter(p.col)}${p.sheetRow}`,
      values: [[p.after]],
    }));
    const CHUNK = 500;
    let written = 0;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const slice = updates.slice(i, i + CHUNK);
      await sheets.batchUpdate(slice);
      written += slice.length;
      console.log(`  ${written} / ${updates.length}`);
    }
    // Update per-field written counts.
    for (const p of plan) {
      stats.perField[p.field].written++;
    }
    console.log(`Done. ${written} cells written across ${Math.ceil(updates.length / CHUNK)} batch calls.`);
  }

  // Print summary.
  console.log('\n═══ Backfill Summary ═══');
  console.log(`Mode: ${apply ? 'APPLY (writes landed)' : 'DRY-RUN (no writes)'}`);
  console.log(`Total rows scanned: ${stats.totalRows}`);
  console.log(`Rows with at least one field touched: ${stats.diffs.length}`);
  console.log(`Total cell updates ${apply ? 'written' : 'planned'}: ${plan.length}`);
  console.log('\nPer-field breakdown:');
  for (const f of Object.keys(FIELD_CONSTANTS)) {
    const pf = stats.perField[f];
    console.log(`  ${f}: ${pf.candidates} candidates`);
    const dist = Object.entries(pf.distribution).sort((a, b) => {
      const an = Number(a[0]); const bn = Number(b[0]);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      return a[0].localeCompare(b[0]);
    });
    // For numeric fields, show histogram buckets; for strings, show all.
    if (typeof FIELD_CONSTANTS[f] === 'string') {
      dist.forEach(([k, v]) => console.log(`    ${k.padEnd(12)} ${v}`));
    } else {
      const top = dist.slice(0, 12);
      const tail = dist.slice(12);
      top.forEach(([k, v]) => console.log(`    ${String(k).padEnd(12)} ${v}`));
      if (tail.length) {
        const tailSum = tail.reduce((s, [, v]) => s + v, 0);
        console.log(`    (${tail.length} more values, total ${tailSum})`);
      }
    }
  }

  if (wantJson) {
    const fs = require('fs');
    const path = require('path');
    const outPath = path.join(__dirname, '..', 'output', `backfill_lifecycle_defaults_${apply ? 'applied' : 'dryrun'}.json`);
    fs.writeFileSync(outPath, JSON.stringify(stats, null, 2));
    console.log(`\nFull JSON written to ${outPath}`);
  }
}

function colToLetter(col) {
  // 0-indexed col → A, B, ..., Z, AA, AB, etc.
  let s = '';
  let n = col;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
