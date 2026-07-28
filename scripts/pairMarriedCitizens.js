#!/usr/bin/env node
/**
 * ⚠️ SHELVED S243 — SUPERSEDED, DO NOT RUN. Kept for the measure-twice record.
 * Premise (pre-wire couples among existing tracked citizens to satisfy the married
 * flag) was corrected by Mike S243: the ~858 tracked citizens are a representative
 * SAMPLE of ~375,985 Oaklanders — spouses are off-sample, pairing them is make-believe.
 * See docs/engine/LEDGER_REPAIR_HOUSEHOLDS.md §"The premise correction (S243)".
 * This file's value was proving the gender imbalance (232M/180F) that exposed the wrong
 * premise. Will be removed once engine.5 Phase 1–2 land.
 *
 * pairMarriedCitizens.js — Stage 1 of engine.5 households build.
 *
 * Assigns shared HouseholdId to married/partnered couples + reconciles surnames.
 * Plan: docs/engine/LEDGER_REPAIR_HOUSEHOLDS.md (Stage 1). Sibling pattern:
 * scripts/ingestFemaleCitizensBalance.js (dry-run → apply → verify gates).
 *
 * DECISIONS (S243, Mike + advisor-reviewed — see plan + commit body):
 *   - Opposite-gender matching only (v1). Mike-decided S243. Same-sex deferred
 *     (Stage 3 youth model is biological [mother,father], adoption out of scope).
 *   - Match within age ±5 (hard constraint); same-neighborhood preferred;
 *     closest age tie-break, then lower POPID. Greedy by male POPID order.
 *   - Surname survivor = higher UsageCount (canon-reference signal — protects
 *     citizens already named in published editions), tie-break lower POPID.
 *   - HHid format HH-0095-NNN (matches existing HH-0084-XXX convention).
 *   - Bypass: Tier-1 (manual review) + any citizen whose LifeHistory/CitizenBio
 *     names a specific spouse (e.g. Naomi Keane → HH-KEANE) — canon protection.
 *   - Exclude-already-paired keyed on HH membership (size-2+), not marital status.
 *
 * Determinism: no RNG. Pairing is a pure function of (POPID order, age, gender,
 * neighborhood, UsageCount). Re-run after apply → already-paired excluded → zero new pairs.
 *
 * Usage:
 *   node scripts/pairMarriedCitizens.js            # dry-run (no writes) → output JSON
 *   node scripts/pairMarriedCitizens.js --apply    # live writes + verify readback
 */

require('../lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const SHEET = 'Simulation_Ledger';
const CYCLE = 95;
const HH_PREFIX = `HH-00${CYCLE}-`; // HH-0095-
const AGE_ANCHOR = 2041;
const AGE_WINDOW = 5;
const PAIRED_STATUSES = new Set(['married', 'partnered']);
const OUT_PATH = path.resolve(__dirname, '../output/pair_married_citizens.json');

// Spouse-language detector — bypass citizens whose canon names a partner.
const SPOUSE_RE = /\bmarried to\b|\bspouse\b|\bwife\b|\bhusband\b|\blives with\b|\bwidow/i;

function colLetter(i) {
  let s = '';
  i += 1;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

function normGender(v) {
  const g = String(v || '').trim().toLowerCase();
  if (g === 'm' || g === 'male') return 'male';
  if (g === 'f' || g === 'female') return 'female';
  return '';
}

function ageOf(row, c) {
  const by = Number(row[c('BirthYear')]);
  return by ? AGE_ANCHOR - by : null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`pairMarriedCitizens — Stage 1`);
  console.log(`Mode: ${apply ? 'APPLY (live writes)' : 'DRY-RUN (no writes)'}\n`);

  const raw = await sheets.getRawSheetData(SHEET);
  const headers = raw[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[String(h).trim()] = i; });
  const c = (n) => colMap[n];
  const data = raw.slice(1);

  // sheetRow for a data index = index + 2 (header row is 1)
  const recs = data.map((row, i) => ({ row, i, sheetRow: i + 2 }))
    .filter(({ row }) => String(row[c('POPID')] || '').trim() || String(row[c('First')] || '').trim());

  // Household membership counts (for exclude-already-paired).
  const hhCount = {};
  recs.forEach(({ row }) => {
    const hh = String(row[c('HouseholdId')] || '').trim();
    if (hh) hhCount[hh] = (hhCount[hh] || 0) + 1;
  });

  const bypassed = [];
  const pool = [];
  for (const rec of recs) {
    const { row } = rec;
    const tier = String(row[c('Tier')] || '').trim();
    const marital = String(row[c('MaritalStatus')] || '').trim().toLowerCase();
    const hh = String(row[c('HouseholdId')] || '').trim();
    const popid = String(row[c('POPID')] || '').trim();
    const name = `${String(row[c('First')] || '').trim()} ${String(row[c('Last')] || '').trim()}`.trim();

    if (!PAIRED_STATUSES.has(marital)) continue;             // not married/partnered
    if (hh && hhCount[hh] > 1) continue;                      // already in a real shared HH

    if (tier === '1') { bypassed.push({ popid, name, tier, reason: 'Tier-1 (canon manual review)' }); continue; }

    const bio = `${String(row[c('LifeHistory')] || '')} ${String(row[c('CitizenBio')] || '')}`;
    if (SPOUSE_RE.test(bio)) { bypassed.push({ popid, name, tier, reason: 'canon spouse named in bio — manual review' }); continue; }

    const gender = normGender(row[c('Gender')]);
    const age = ageOf(row, c);
    if (!gender) { bypassed.push({ popid, name, tier, reason: 'no Gender — cannot opposite-pair' }); continue; }
    if (age == null) { bypassed.push({ popid, name, tier, reason: 'no BirthYear — cannot age-match' }); continue; }

    pool.push({
      ...rec, popid, name, gender, age,
      nbhd: String(row[c('Neighborhood')] || '').trim(),
      last: String(row[c('Last')] || '').trim(),
      usage: Number(row[c('UsageCount')]) || 0
    });
  }

  const males = pool.filter(p => p.gender === 'male').sort((a, b) => popN(a.popid) - popN(b.popid));
  const females = pool.filter(p => p.gender === 'female').sort((a, b) => popN(a.popid) - popN(b.popid));
  console.log(`Pool: ${pool.length} (male ${males.length} / female ${females.length}) | bypassed ${bypassed.length}`);

  // ── Greedy opposite-gender matching ──────────────────────────────────────
  // For each male in POPID order: candidate = unmatched females within age±5.
  // Prefer same neighborhood; then closest age; then lower POPID.
  const usedF = new Set();
  const pairs = [];
  for (const m of males) {
    let best = null, bestScore = null;
    for (const f of females) {
      if (usedF.has(f.popid)) continue;
      const dAge = Math.abs(m.age - f.age);
      if (dAge > AGE_WINDOW) continue;
      const sameNbhd = m.nbhd && f.nbhd && m.nbhd === f.nbhd ? 0 : 1; // 0 better
      const score = [sameNbhd, dAge, popN(f.popid)];
      if (best === null || cmpScore(score, bestScore) < 0) { best = f; bestScore = score; }
    }
    if (best) { usedF.add(best.popid); pairs.push(makePair(m, best)); }
  }

  // Assign HHids in deterministic order (by lower partner POPID).
  pairs.sort((a, b) => Math.min(popN(a.a.popid), popN(a.b.popid)) - Math.min(popN(b.a.popid), popN(b.b.popid)));
  pairs.forEach((p, idx) => { p.hhid = HH_PREFIX + String(idx + 1).padStart(3, '0'); });

  // Unpaired residual.
  const pairedIds = new Set();
  pairs.forEach(p => { pairedIds.add(p.a.popid); pairedIds.add(p.b.popid); });
  const unpaired = pool.filter(p => !pairedIds.has(p.popid)).map(p => ({
    popid: p.popid, name: p.name, gender: p.gender, age: p.age, nbhd: p.nbhd,
    reason: p.gender === 'male' ? 'no opposite-gender partner within age±5 (gender surplus)' : 'no opposite-gender partner within age±5'
  }));

  // ── Stats ────────────────────────────────────────────────────────────────
  const crossNbhd = pairs.filter(p => p.crossNeighborhood).length;
  const crossDecade = pairs.filter(p => Math.floor(p.a.age / 10) !== Math.floor(p.b.age / 10)).length;
  const surnameChanges = pairs.filter(p => p.changed).map(p => ({
    popid: p.changed.popid, name: p.changed.name, oldLast: p.changed.oldLast, newLast: p.survivorLast
  }));

  const summary = {
    stage: 1, cycle: CYCLE, mode: apply ? 'apply' : 'dry-run',
    generatedAt: new Date().toISOString(),
    poolSize: pool.length, malesInPool: males.length, femalesInPool: females.length,
    bypassedCount: bypassed.length,
    pairsFormed: pairs.length, citizensPaired: pairs.length * 2,
    unpairedCount: unpaired.length,
    crossNeighborhoodPairs: crossNbhd, crossNeighborhoodPct: pairs.length ? +(100 * crossNbhd / pairs.length).toFixed(1) : 0,
    crossDecadePairs: crossDecade, crossDecadePct: pairs.length ? +(100 * crossDecade / pairs.length).toFixed(1) : 0,
    surnameChanges: surnameChanges.length,
    coveragePctOfPool: pool.length ? +(100 * pairs.length * 2 / pool.length).toFixed(1) : 0
  };

  const out = { summary, pairs, unpaired, bypassed, surnameChanges };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

  console.log('\n═══ Stage 1 results ═══');
  console.log(`  Pairs formed:          ${summary.pairsFormed}  (${summary.citizensPaired} citizens)`);
  console.log(`  Coverage of pool:      ${summary.coveragePctOfPool}%`);
  console.log(`  Unpaired (residual):   ${summary.unpairedCount}`);
  console.log(`  Cross-neighborhood:    ${summary.crossNeighborhoodPairs} (${summary.crossNeighborhoodPct}%)`);
  console.log(`  Cross-decade:          ${summary.crossDecadePairs} (${summary.crossDecadePct}%)`);
  console.log(`  Surname changes:       ${summary.surnameChanges}`);
  console.log(`  Bypassed (manual):     ${summary.bypassedCount}`);
  console.log(`\n  Output: ${OUT_PATH}`);

  runGates(summary);

  if (!apply) { console.log('\nDRY-RUN complete. Review JSON, then re-run with --apply.'); return; }

  // ── Apply ──────────────────────────────────────────────────────────────
  const updates = [];
  const lhCol = colLetter(c('LifeHistory'));
  const lastCol = colLetter(c('Last'));
  const hhCol = colLetter(c('HouseholdId'));

  for (const p of pairs) {
    for (const partner of [p.a, p.b]) {
      const sr = partner.sheetRow;
      // HouseholdId
      updates.push({ range: `'${SHEET}'!${hhCol}${sr}`, values: [[p.hhid]] });
      // LifeHistory append
      const existingLH = String(data[partner.i][c('LifeHistory')] || '');
      const otherName = partner === p.a ? p.b.name : p.a.name;
      const otherId = partner === p.a ? p.b.popid : p.a.popid;
      let note = `[Engine C${CYCLE}] Formed household ${p.hhid} with ${otherName} (${otherId}).`;
      if (p.changed && p.changed.popid === partner.popid) note += ` Adopted partner surname (${p.changed.oldLast} → ${p.survivorLast}).`;
      const newLH = existingLH.trim() ? `${existingLH.trim()} ${note}` : note;
      updates.push({ range: `'${SHEET}'!${lhCol}${sr}`, values: [[newLH]] });
    }
    // Surname change for the partner who adopted
    if (p.changed) {
      updates.push({ range: `'${SHEET}'!${lastCol}${p.changed.sheetRow}`, values: [[p.survivorLast]] });
    }
  }

  console.log(`\nApplying ${updates.length} cell writes for ${pairs.length} households...`);
  await sheets.batchUpdate(updates);

  // Verify readback
  const verifyRaw = await sheets.getRawSheetData(SHEET);
  const vHeaders = verifyRaw[0]; const vcm = {}; vHeaders.forEach((h, i) => vcm[String(h).trim()] = i);
  const vData = verifyRaw.slice(1);
  const vById = {};
  vData.forEach(r => { const pid = String(r[vcm.POPID] || '').trim(); if (pid) vById[pid] = r; });

  let hhOk = 0, lastOk = 0;
  for (const p of pairs) {
    if (String(vById[p.a.popid]?.[vcm.HouseholdId] || '').trim() === p.hhid) hhOk++;
    if (String(vById[p.b.popid]?.[vcm.HouseholdId] || '').trim() === p.hhid) hhOk++;
    if (p.changed && String(vById[p.changed.popid]?.[vcm.Last] || '').trim() === p.survivorLast) lastOk++;
  }
  console.log('\nVerification (live readback):');
  console.log(`  HouseholdId landed:   ${hhOk} / ${pairs.length * 2}`);
  console.log(`  Surname changes landed: ${lastOk} / ${surnameChanges.length}`);
  if (hhOk !== pairs.length * 2 || lastOk !== surnameChanges.length) {
    console.error('VERIFICATION FAILED — readback does not match expected.');
    process.exit(1);
  }
  console.log('  ALL VERIFIED.');
}

function makePair(m, f) {
  // Surname survivor: higher UsageCount, tie-break lower POPID.
  let survivor, other;
  if (m.usage !== f.usage) { survivor = m.usage > f.usage ? m : f; }
  else { survivor = popN(m.popid) < popN(f.popid) ? m : f; }
  other = survivor === m ? f : m;
  const survivorLast = survivor.last;
  const changed = other.last !== survivorLast
    ? { popid: other.popid, name: other.name, oldLast: other.last, sheetRow: other.sheetRow }
    : null;
  return {
    a: { popid: m.popid, name: m.name, gender: m.gender, age: m.age, nbhd: m.nbhd, last: m.last, usage: m.usage, sheetRow: m.sheetRow, i: m.i },
    b: { popid: f.popid, name: f.name, gender: f.gender, age: f.age, nbhd: f.nbhd, last: f.last, usage: f.usage, sheetRow: f.sheetRow, i: f.i },
    ageDelta: Math.abs(m.age - f.age),
    crossNeighborhood: !(m.nbhd && f.nbhd && m.nbhd === f.nbhd),
    survivorLast, changed
  };
}

function popN(v) { const m = String(v || '').match(/POP-0*(\d+)/); return m ? Number(m[1]) : 1e9; }
function cmpScore(a, b) { for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i] - b[i]; } return 0; }

function runGates(s) {
  console.log('\n═══ Acceptance gates ═══');
  // Gate: every pairable opposite-gender couple formed (coverage = 2*min(M,F)/pool, given gender imbalance).
  const maxPossible = Math.min(s.malesInPool, s.femalesInPool);
  const g1 = s.pairsFormed === maxPossible || s.pairsFormed >= maxPossible - 2; // allow tiny age-window residual
  console.log(`  Gate 1 (pairable couples formed): ${g1 ? 'PASS' : 'CHECK'} — ${s.pairsFormed} formed, max possible ${maxPossible} (min of M/F)`);
  const g2 = s.crossNeighborhoodPct < 10;
  console.log(`  Gate 2 (cross-neighborhood <10%): ${g2 ? 'PASS' : 'CHECK'} — ${s.crossNeighborhoodPct}%`);
  const g3 = s.crossDecadePct < 5;
  console.log(`  Gate 3 (cross-decade <5%):        ${g3 ? 'PASS' : 'CHECK'} — ${s.crossDecadePct}%`);
  console.log(`  Gate 4 (Tier-1 untouched):        PASS by construction — Tier-1 in bypass list (${s.bypassedCount} total bypassed)`);
  console.log(`  Gate 5 (determinism):             re-run produces identical pairing (no RNG; pure fn of POPID/age/gender/usage)`);
  console.log(`\n  NOTE: ~95% coverage gate from S201 plan is unreachable under opposite-gender-only +`);
  console.log(`        gender imbalance (M ${s.malesInPool} / F ${s.femalesInPool}). Residual ${s.unpairedCount} = surplus, flagged.`);
}

main().catch(e => { console.error(e); process.exit(1); });
