#!/usr/bin/env node
/**
 * auditHoodDrift.js — neighborhood truth-source drift detector
 * (engine.99 Cohort 1 Task 3 — ADR-0016 first application)
 *
 * Usage:
 *   node scripts/auditHoodDrift.js             # full run: sheet reconcile + migrated-file scan
 *   node scripts/auditHoodDrift.js --offline   # skip live-sheet reconcile (lib cache only, loud notice)
 *   node scripts/auditHoodDrift.js --check <file> [...]  # scan extra files (cohort work-in-progress)
 *
 * Exit 0 = clean; 1 = drift.
 *
 * Two jobs (ADR-0016 §5 — without a detector the migration reverts within
 * a few sessions and the cost is paid twice):
 *
 * 1. RECONCILE — lib/canonNeighborhoods.js MAP_NEIGHBORHOODS must exactly
 *    match the live Neighborhood_Map hood set. The sheet is the truth
 *    source; the lib list is a cache of it, not an independent authority.
 *    Any diff in either direction fails.
 *
 * 2. SCAN — every file in MIGRATED_FILES (explicit scope, so unmigrated
 *    cohorts don't drown the signal) must contain no drifted hood literal.
 *    A string literal fails when its entire trimmed value is:
 *      a) a case/whitespace variant of a canonical hood that is not the
 *         exact canonical spelling ('downtown', ' Piedmont Ave '), or
 *      b) a DRIFT_LEXICON token — a known non-canonical hood-like name
 *         ('Piedmont Avenue', 'Jingletown', 'Brooklyn Basin', ...).
 *    Prose containing a hood name inside a longer string passes — "strolled
 *    along Piedmont Avenue" is correct English about a real street, not a
 *    hood key. CHILDREN (lib/canonNeighborhoods.js) are exempt: documented
 *    sub-area names that legitimately appear in data.
 *
 * DRIFT_LEXICON is an embedded list and that is fine — it is a DEFECT
 * lexicon (known-bad tokens from the S349 survey), not embedded truth.
 * Truth comes from the sheet; the lexicon only widens what "hood-like"
 * means so misspellings are catchable at all.
 *
 * Plan: docs/plans/2026-08-02-neighborhood-truth-source-migration.md Task 3
 * ADR:  docs/adr/0016-data-ledgers-are-the-truth-source.md
 */

'use strict';

require('../lib/env');
const fs = require('fs');
const path = require('path');
const { CANON_12, MAP_NEIGHBORHOODS, CHILDREN } = require('../lib/canonNeighborhoods');

const ROOT = path.resolve(__dirname, '..');

// Migrated-file scope — explicit, per plan Task 3. Grows cohort by cohort.
const MIGRATED_FILES = [
  // Cohort 1
  'phase01-config/canonNeighborhoodLoader.js',
  'lib/canonNeighborhoods.js',
  'lib/districtMap.js',
  'lib/citizenDerivation.js',
  'lib/photoGenerator.js',
  // Cohort 2 — the shared core-12 literal group, now on getCoreSimNeighborhoods_
  'phase01-config/godWorldEngine2.js',
  'phase03-population/generateCrisisSpikes.js',
  'phase05-citizens/checkForPromotions.js',
  'phase05-citizens/generateGenericCitizens.js',
  'phase05-citizens/runNeighborhoodEngine.js',
  'phase05-citizens/bondEngine.js',
  'phase07-evening-media/buildEveningFamous.js',
  'phase07-evening-media/buildEveningFood.js',
  'phase07-evening-media/cityEveningSystems.js',
  'phase07-evening-media/culturalLedger.js',
  'phase07-evening-media/textureTriggers.js',
  'phase10-persistence/recordWorldEventsv3.js',
  'utilities/citizenDerivation.js',
  'phase02-world-state/commuteFlowEngine.js',
];

// Known non-canonical hood-like tokens (S349 survey + Oakland geography the
// training data keeps producing). NOT in canonical set, NOT in CHILDREN.
// (Coliseum/Elmhurst moved to CHILDREN in Cohort 1 — real East Oakland
// sub-areas the sim legitimately speaks; 'Coliseum District' stays here.)
const DRIFT_LEXICON = [
  'Piedmont Avenue', 'Jingletown', 'Coliseum District',
  'Cleveland Heights', 'Bushrod', 'Mosswood', 'Sobrante Park',
  'Millsmont', 'Havenscourt', 'Seminary', 'Fairfax', 'Allendale',
  'Trestle Glen', 'Crocker Highlands', 'Oakmore', 'Redwood Heights',
];

const STRING_LITERAL_RE = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;

async function fetchSheetHoods() {
  const { getRawSheetData } = require('../lib/sheets');
  const rows = await getRawSheetData('Neighborhood_Map');
  const header = rows[0];
  const iHood = header.indexOf('Neighborhood');
  if (iHood < 0) throw new Error('Neighborhood_Map has no "Neighborhood" header');
  const iRank = header.indexOf('CoreSimRank');
  const seen = new Set();
  const list = [];
  const ranked = [];
  for (const row of rows.slice(1)) {
    const hood = String(row[iHood] || '').trim();
    if (!hood || seen.has(hood.toLowerCase())) continue;
    seen.add(hood.toLowerCase());
    list.push(hood);
    if (iRank >= 0) {
      const rank = Number(row[iRank]);
      if (!isNaN(rank) && rank > 0) ranked.push({ hood, rank });
    }
  }
  if (!list.length) throw new Error('Neighborhood_Map yielded zero hood names');
  const core = ranked.sort((a, b) => a.rank - b.rank).map(r => r.hood);
  return { list, core };
}

function scanFile(absPath, canonExact, canonLower, childLower, driftLower) {
  const failures = [];
  const src = fs.readFileSync(absPath, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    // skip comment-only lines — doc headers legitimately name drift tokens
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    // skip keyword-match lines — `lower.includes('lake merritt')` matches
    // against lowercased prose; the lowercase literal is correct code there,
    // not a drifted hood key.
    if (/\.includes\(|\.indexOf\(/.test(line)) return;
    let m;
    STRING_LITERAL_RE.lastIndex = 0;
    while ((m = STRING_LITERAL_RE.exec(line)) !== null) {
      const raw = m[1] !== undefined ? m[1] : m[2];
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (childLower.has(lower)) continue; // documented sub-area lexicon
      if (canonExact.has(raw)) continue;   // exact canonical spelling, untrimmed
      if (canonLower.has(lower)) {
        failures.push({ line: i + 1, literal: raw, why: 'case/whitespace variant of canonical hood' });
      } else if (driftLower.has(lower)) {
        failures.push({ line: i + 1, literal: raw, why: 'non-canonical hood token (DRIFT_LEXICON)' });
      }
    }
  });
  return failures;
}

async function main() {
  const args = process.argv.slice(2);
  const offline = args.includes('--offline');
  const extraFiles = [];
  const ci = args.indexOf('--check');
  if (ci !== -1) extraFiles.push(...args.slice(ci + 1).filter(a => !a.startsWith('--')));

  let drift = 0;

  // ── 1. Reconcile lib cache against the truth source ──
  if (offline) {
    console.log('⚠ OFFLINE MODE — live-sheet reconcile SKIPPED. lib/canonNeighborhoods.js');
    console.log('  is being trusted as a cache without proof. Run without --offline before deploy.');
  } else {
    const { list: sheetHoods, core: sheetCore } = await fetchSheetHoods();
    const sheetSet = new Set(sheetHoods);
    const libSet = new Set(MAP_NEIGHBORHOODS);
    const inLibNotSheet = MAP_NEIGHBORHOODS.filter(h => !sheetSet.has(h));
    const inSheetNotLib = sheetHoods.filter(h => !libSet.has(h));
    if (inLibNotSheet.length || inSheetNotLib.length) {
      drift++;
      console.log('FAIL  reconcile: lib/canonNeighborhoods.js MAP_NEIGHBORHOODS != Neighborhood_Map');
      if (inLibNotSheet.length) console.log('      in lib, not sheet: ' + inLibNotSheet.join(', '));
      if (inSheetNotLib.length) console.log('      in sheet, not lib: ' + inSheetNotLib.join(', '));
    } else {
      console.log('PASS  reconcile: lib cache == Neighborhood_Map (' + sheetHoods.length + ' hoods)');
    }
    // Core reconcile — ORDER matters: CoreSimRank order is seeded-draw order,
    // and lib CANON_12 is the Node-side cache of it (engine.99 Cohort 2).
    if (JSON.stringify(sheetCore) !== JSON.stringify(CANON_12)) {
      drift++;
      console.log('FAIL  core reconcile: lib CANON_12 != Neighborhood_Map CoreSimRank order');
      console.log('      sheet core: ' + sheetCore.join(', '));
      console.log('      lib CANON_12: ' + CANON_12.join(', '));
    } else {
      console.log('PASS  core reconcile: CANON_12 == CoreSimRank order (' + sheetCore.length + ' hoods)');
    }
  }

  // ── 2. Scan migrated files ──
  const canonExact = new Set(MAP_NEIGHBORHOODS);
  const canonLower = new Set(MAP_NEIGHBORHOODS.map(h => h.toLowerCase()));
  const childLower = new Set(CHILDREN.map(h => h.toLowerCase()));
  const driftLower = new Set(DRIFT_LEXICON.map(h => h.toLowerCase()));

  const targets = [...MIGRATED_FILES.map(f => path.join(ROOT, f)), ...extraFiles.map(f => path.resolve(f))];
  for (const abs of targets) {
    const rel = path.relative(ROOT, abs);
    if (!fs.existsSync(abs)) {
      drift++;
      console.log('FAIL  ' + rel + ' — file in MIGRATED_FILES does not exist');
      continue;
    }
    const failures = scanFile(abs, canonExact, canonLower, childLower, driftLower);
    if (failures.length) {
      drift += failures.length;
      for (const f of failures) {
        console.log('FAIL  ' + rel + ':' + f.line + '  ' + JSON.stringify(f.literal) + ' — ' + f.why);
      }
    } else {
      console.log('PASS  ' + rel);
    }
  }

  console.log(drift === 0 ? '\n## 0 drift findings' : '\n## ' + drift + ' drift finding(s)');
  process.exit(drift === 0 ? 0 : 1);
}

main().catch(e => { console.error('ERR', e.message); process.exit(1); });
