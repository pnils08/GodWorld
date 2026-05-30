#!/usr/bin/env node
/**
 * backfillNeighborhoodEducation.js — one-time backfill of the 5 education columns
 * in Neighborhood_Demographics (SchoolQualityIndex / GraduationRate /
 * CollegeReadinessRate / TeacherQuality / Funding) with PROSPERITY-CALIBRATED
 * values derived from each neighborhood's MedianIncome in Neighborhood_Map.
 *
 * WHY (S247, engine-sheet, C95 gap-log triage education follow-up):
 *   The columns were blank across all 17 rows. Two root causes, both fixed:
 *     1. batchUpdateNeighborhoodDemographics_ (utilities/ensureNeighborhoodDemographics.js)
 *        wrote a full-width row of '' + the 6 demographic cols every Phase 3 cycle,
 *        BLANKING the education cols each cycle (S247 clobber fix preserves them now).
 *     2. No value was ever seeded that survived (1) — addEducationCareerColumns'
 *        defaults were wiped next cycle.
 *   The columns FEED POSITIVE DISPLAY: buildNeighborhoodCards (MCP wd-* projection),
 *   buildInitiativePackets, buildCivicVoicePackets all read SchoolQualityIndex/
 *   GraduationRate. Blank → readers get NaN/0, which reads as a crisis the engine
 *   never asserted (the S245 data-fidelity failure class) on an ascended-timeline,
 *   prosperous Oakland (median >$90K).
 *
 * CANON FRAME: GodWorld Oakland is the elite timeline. Schools read adequate-to-good
 *   with gentle variation by neighborhood affluence — NEVER crisis. All values here
 *   sit well above checkSchoolQuality_'s crisis gates (SchoolQualityIndex >= 7 >> the
 *   <3 SCHOOL_QUALITY_CRISIS threshold; GraduationRate >= 85 >> the <65 DROPOUT_WAVE
 *   threshold), so those deprivation-coded hooks stay correctly dormant by the data,
 *   not by deleting code.
 *
 * USAGE:
 *   node scripts/backfillNeighborhoodEducation.js            # DRY RUN (default) — prints proposed values
 *   node scripts/backfillNeighborhoodEducation.js --apply    # writes (operator-gated; many-row shared-sheet write)
 *
 * The write is targeted via updateRowFields (5 named fields only) — it does NOT
 * touch the demographic columns. Read-back verification runs after --apply.
 */

require('/root/GodWorld/lib/env');
const { getRawSheetData, updateRowFields } = require('/root/GodWorld/lib/sheets.js');

const APPLY = process.argv.includes('--apply');

// Income → prosperity-calibrated education band. Floored well above crisis gates.
// Variation tracks the real Neighborhood_Map MedianIncome tiers; unknown income →
// documented prosperity baseline (not invented precision).
function deriveEducation(incomeRaw) {
  const i = Number(incomeRaw);
  const has = Number.isFinite(i) && i > 0;
  if (!has)        return { tier: 'baseline(no-income)', SchoolQualityIndex: 7, GraduationRate: 86, CollegeReadinessRate: 55, TeacherQuality: 7, Funding: 11500 };
  if (i >= 110000) return { tier: 'elite',     SchoolQualityIndex: 8, GraduationRate: 91, CollegeReadinessRate: 66, TeacherQuality: 8, Funding: 14500 };
  if (i >= 95000)  return { tier: 'upper',     SchoolQualityIndex: 8, GraduationRate: 89, CollegeReadinessRate: 61, TeacherQuality: 8, Funding: 13000 };
  if (i >= 80000)  return { tier: 'upper-mid', SchoolQualityIndex: 7, GraduationRate: 87, CollegeReadinessRate: 56, TeacherQuality: 7, Funding: 12000 };
  return            { tier: 'mid',       SchoolQualityIndex: 7, GraduationRate: 85, CollegeReadinessRate: 52, TeacherQuality: 7, Funding: 11000 };
}

const EDU_FIELDS = ['SchoolQualityIndex', 'GraduationRate', 'CollegeReadinessRate', 'TeacherQuality', 'Funding'];

async function latestIncomeByNeighborhood() {
  const d = await getRawSheetData('Neighborhood_Map');
  const h = d[0];
  const ni = h.indexOf('Neighborhood'), ci = h.indexOf('Cycle'), mi = h.indexOf('MedianIncome');
  const latest = {};
  for (let r = 1; r < d.length; r++) {
    const name = d[r][ni]; if (!name) continue;
    const cyc = Number(d[r][ci]) || 0;
    const inc = d[r][mi];
    // keep the highest-cycle row that actually carries an income value
    if (!latest[name] || cyc >= latest[name].cyc) {
      const hasInc = inc !== '' && inc !== undefined && inc !== null;
      if (hasInc || !latest[name]) latest[name] = { cyc, inc: hasInc ? inc : (latest[name] ? latest[name].inc : inc) };
    }
  }
  return latest;
}

async function main() {
  console.log(`\n=== backfillNeighborhoodEducation — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'} ===\n`);

  const income = await latestIncomeByNeighborhood();
  const demo = await getRawSheetData('Neighborhood_Demographics');
  const h = demo[0];
  const iNeighborhood = h.indexOf('Neighborhood');
  const iEdu = EDU_FIELDS.map(f => h.indexOf(f));
  if (iEdu.some(x => x < 0)) {
    console.error('FATAL: missing education column(s) in Neighborhood_Demographics:', EDU_FIELDS.filter((_, k) => iEdu[k] < 0));
    process.exit(2);
  }

  const plan = [];
  for (let r = 1; r < demo.length; r++) {
    const name = String(demo[r][iNeighborhood]).trim();
    if (!name) continue;
    const inc = income[name] ? income[name].inc : undefined;
    const edu = deriveEducation(inc);
    const before = iEdu.map(c => demo[r][c]);
    const allBlank = before.every(v => v === '' || v === undefined || v === null);
    plan.push({ row: r + 1, name, inc, edu, before, allBlank });
  }

  // Report
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('Neighborhood', 16), pad('Income', 9), pad('Tier', 18), 'Qual Grad Coll Tchr Funding   (was)');
  for (const p of plan) {
    const incStr = p.inc !== undefined && p.inc !== '' ? String(p.inc) : '—';
    const was = p.allBlank ? 'blank' : JSON.stringify(p.before);
    console.log(
      pad(p.name, 16), pad(incStr, 9), pad(p.edu.tier, 18),
      pad(p.edu.SchoolQualityIndex, 4), pad(p.edu.GraduationRate, 4), pad(p.edu.CollegeReadinessRate, 4),
      pad(p.edu.TeacherQuality, 4), pad(p.edu.Funding, 8), was
    );
  }

  const incomeDerived = plan.filter(p => p.inc !== undefined && p.inc !== '').length;
  console.log(`\n${plan.length} neighborhoods | ${incomeDerived} income-derived | ${plan.length - incomeDerived} prosperity-baseline`);
  console.log('All SchoolQualityIndex >= 7 (crisis gate <3) and GraduationRate >= 85 (dropout gate <65) → crisis hooks stay dormant (canon-correct).');

  if (!APPLY) {
    console.log('\nDRY RUN — no writes. Re-run with --apply to write (operator-gated many-row sheet write).\n');
    return;
  }

  // APPLY: targeted per-row field writes (5 education fields; demographic cols untouched)
  console.log('\n--- WRITING (updateRowFields, education fields only) ---');
  for (const p of plan) {
    const fields = {
      SchoolQualityIndex: p.edu.SchoolQualityIndex,
      GraduationRate: p.edu.GraduationRate,
      CollegeReadinessRate: p.edu.CollegeReadinessRate,
      TeacherQuality: p.edu.TeacherQuality,
      Funding: p.edu.Funding
    };
    await updateRowFields('Neighborhood_Demographics', p.row, fields);
    console.log(`  wrote ${p.name} (row ${p.row}) — ${p.edu.tier}`);
  }

  // Read-back verification
  console.log('\n--- READ-BACK VERIFICATION ---');
  const after = await getRawSheetData('Neighborhood_Demographics');
  let ok = 0, bad = 0;
  for (const p of plan) {
    const row = after[p.row - 1];
    const got = iEdu.map(c => Number(row[c]));
    const want = [p.edu.SchoolQualityIndex, p.edu.GraduationRate, p.edu.CollegeReadinessRate, p.edu.TeacherQuality, p.edu.Funding];
    const match = got.every((v, k) => v === want[k]);
    if (match) { ok++; } else { bad++; console.log(`  MISMATCH ${p.name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
  }
  console.log(`\nVerified ${ok}/${plan.length} rows landed correctly${bad ? ` — ${bad} MISMATCH` : ''}.`);
  process.exit(bad ? 1 : 0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(2); });
