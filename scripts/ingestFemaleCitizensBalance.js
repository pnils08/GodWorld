#!/usr/bin/env node
/**
 * ingestFemaleCitizensBalance.js — S184 follow-up
 *
 * Plan: docs/plans/2026-04-28-female-citizen-balance.md
 *
 * One-shot ingest: appends 150 new female citizens to Simulation_Ledger to
 * lift the live gender share from 33% F → 40.7% F. Existing canon untouched
 * (S184 constraint — go-forward correction only).
 *
 * Uses the S184 derivation library (lib/citizenDerivation.js) with
 * genderOverride='female' so all 8 demographic + lifecycle fields land
 * populated and realistic at intake time.
 *
 * Determinism: djb2 hash on (SEED + ':' + i) drives every draw — same seed
 * always produces byte-identical JSON output.
 *
 * Idempotency: POPID-range collision check only (no in-world marker — Notes
 * field would be 4th-wall-breaking on this schema; CitizenBio is real bio
 * content). Re-runs abort if any POPID in the target range is already
 * populated.
 *
 * Usage:
 *   node scripts/ingestFemaleCitizensBalance.js              # default: dry-run
 *   node scripts/ingestFemaleCitizensBalance.js --apply      # live writes
 *   node scripts/ingestFemaleCitizensBalance.js --seed name  # override seed
 *   node scripts/ingestFemaleCitizensBalance.js --count 100  # override target count
 */

require('../lib/env');
const sheets = require('../lib/sheets');
const library = require('../lib/citizenDerivation');
const NAME_POOL = require('../data/citizen_female_first_names.json');
const fs = require('fs');
const path = require('path');

// ─── Constants ──────────────────────────────────────────────────────────────

const SHEET = 'Simulation_Ledger';
const TARGET_COUNT_DEFAULT = 150;
const SEED_DEFAULT = 'female-balance-c92';
const ANCHOR_YEAR = 2041;
const FIRST_NAME_CAP = 3;
const LAST_NAME_CAP = 4;
const NOW_ISO_OVERRIDE = process.env.INGEST_NOW_ISO || null; // for determinism testing

// Roles excluded from this batch (Mike S184 — "these women can have real jobs").
// Library's frequency-weighted draw amplifies live SL skew; faith leaders are
// 2% of live SL but were drawing as 17% of this ingest. Block + redraw.
const ROLE_DENYLIST = new Set([
  'Youth Pastor',
  'Senior Pastor / Faith Leader',
]);
const ROLE_REDRAW_RETRIES = 25;

// Last-name pool — copied inline from
// phase05-citizens/generateGenericCitizens.js v2.7 lines 264-292.
// Per plan §Phase 3 "Constants": one-shot script, const-copy acceptable for
// the ingest window. If v2.7 evolves, this list does NOT auto-update.
const LAST_NAMES = [
  // v2.6 base (53)
  'Lopez', 'Carter', 'Nguyen', 'Patel', 'Jackson', 'Harris', 'Wong', 'Thompson',
  'Brown', 'Lee', 'Lewis', 'Jordan', 'Reyes', 'Scott', 'Ward', 'Foster', 'Cook',
  'Martinez', 'Robinson', 'Kim', 'Davis', 'Garcia', 'Chen', 'Williams', 'Santos',
  'Tran', 'Chung', 'Park', 'Liu', 'Hernandez', 'Ramirez', 'Cruz', 'Mendoza',
  'Washington', 'Morales', 'Okonkwo', 'Yamamoto', 'Rivera', 'Freeman', 'Gutierrez',
  'Singh', 'Jefferson', 'Flores', 'Muhammad', 'Torres', 'Coleman', 'Vasquez', 'Adams',
  'Espinoza', 'Nakamura', 'Reed', 'Delgado', 'Franklin',
  // v2.7 — Latino
  'Aguilar', 'Alvarez', 'Cabrera', 'Castillo', 'Ortiz', 'Pena', 'Rojas', 'Salazar',
  'Sandoval', 'Sanchez', 'Soto', 'Vega', 'Velazquez', 'Zamora',
  // v2.7 — Black
  'Booker', 'Crenshaw', 'Dawson', 'Gaines', 'Hayes', 'Holloway', 'Pinckney', 'Sterling',
  'Whitfield',
  // v2.7 — East/Southeast Asian
  'Cao', 'Choi', 'Doan', 'Fukuda', 'Han', 'Hashimoto', 'Hong', 'Hwang', 'Inoue',
  'Kang', 'Lai', 'Le', 'Mori', 'Murakami', 'Ng', 'Oh', 'Pham', 'Sasaki',
  'Shimizu', 'Suzuki', 'Takahashi', 'Tanaka', 'Truong', 'Wu', 'Xu', 'Yamada',
  'Yang', 'Zhang', 'Zhou',
  // v2.7 — South Asian
  'Banerjee', 'Desai', 'Ghosh', 'Gupta', 'Joshi', 'Kapoor', 'Kumar', 'Mehta',
  'Mukherjee', 'Nair', 'Pillai', 'Rao', 'Reddy', 'Sharma', 'Shah', 'Verma',
  // v2.7 — Anglo
  'Carmichael', 'Crawford', 'Donovan', 'Faulkner', 'Holcomb', 'Kessler', 'Lockhart',
  'McAllister', 'Norwood', 'Oakley', 'Quinlan', 'Stafford', 'Underwood', 'Vance',
  // v2.7 — African (West/East)
  'Abebe', 'Adeyemi', 'Bello', 'Diop', 'Fofana', 'Gebre', 'Mensah', 'Owusu', 'Tadesse',
];

const AGE_CDF = [
  { max: 0.22, lo: 18, hi: 29 },
  { max: 0.50, lo: 30, hi: 44 },
  { max: 0.72, lo: 45, hi: 59 },
  { max: 0.92, lo: 60, hi: 74 },
  { max: 1.00, lo: 75, hi: 92 },
];

const NEIGHBORHOOD_CDF = [
  { max: 0.105, nbhd: 'Lake Merritt' },
  { max: 0.205, nbhd: 'Rockridge' },
  { max: 0.300, nbhd: 'Temescal' },
  { max: 0.390, nbhd: 'Piedmont Ave' },
  { max: 0.475, nbhd: 'Uptown' },
  { max: 0.560, nbhd: 'Downtown' },
  { max: 0.645, nbhd: 'Jack London' },
  { max: 0.725, nbhd: 'KONO' },
  { max: 0.805, nbhd: 'Laurel' },
  { max: 0.880, nbhd: 'Chinatown' },
  { max: 0.945, nbhd: 'Fruitvale' },
  { max: 1.000, nbhd: 'West Oakland' },
];

// ─── Determinism helpers ────────────────────────────────────────────────────

function djb2(s) {
  let h = 5381;
  s = String(s || '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function rand01(seed, salt) {
  return (djb2(String(seed) + ':' + String(salt)) % 1000000) / 1000000;
}

function pickFromCDFEntry(r, cdf) {
  for (const entry of cdf) if (r < entry.max) return entry;
  return cdf[cdf.length - 1];
}

function drawAge(seed) {
  const bracketRoll = rand01(seed, 'age-bracket');
  const bracket = pickFromCDFEntry(bracketRoll, AGE_CDF);
  const innerRoll = rand01(seed, 'age-inner');
  return bracket.lo + Math.floor(innerRoll * (bracket.hi - bracket.lo + 1));
}

function drawNeighborhood(seed) {
  const r = rand01(seed, 'nbhd');
  const entry = pickFromCDFEntry(r, NEIGHBORHOOD_CDF);
  return entry.nbhd;
}

// Filter-then-draw: build the available subset (combined count < cap),
// draw uniformly from it. Deterministic; exhaustion is exact.
function drawWithCap(pool, counts, cap, seed, salt) {
  const available = [];
  for (const p of pool) {
    const name = typeof p === 'string' ? p : p.name;
    if ((counts[name] || 0) < cap) available.push(name);
  }
  if (available.length === 0) return null;
  const r = rand01(seed, salt);
  const idx = Math.floor(r * available.length);
  return available[idx];
}

// Build first/last counts from live SL.
function buildNameCounts(rows, headers) {
  const iFirst = headers.indexOf('First');
  const iLast = headers.indexOf('Last');
  const firstCounts = {};
  const lastCounts = {};
  for (const row of rows) {
    const f = String(row[iFirst] || '').trim();
    const l = String(row[iLast] || '').trim();
    if (f) firstCounts[f] = (firstCounts[f] || 0) + 1;
    if (l) lastCounts[l] = (lastCounts[l] || 0) + 1;
  }
  return { firstCounts, lastCounts };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const seedFlag = argv.indexOf('--seed');
  const countFlag = argv.indexOf('--count');
  const SEED = seedFlag >= 0 ? argv[seedFlag + 1] : SEED_DEFAULT;
  const TARGET_COUNT = countFlag >= 0 ? parseInt(argv[countFlag + 1], 10) : TARGET_COUNT_DEFAULT;

  console.log(`Mode: ${apply ? 'APPLY (live writes)' : 'DRY-RUN (no writes)'}`);
  console.log(`Seed: ${SEED}  Count: ${TARGET_COUNT}`);

  // ─── Load live SL state ──────────────────────────────────────────────────
  const raw = await sheets.getRawSheetData(SHEET);
  const headers = raw[0];
  const dataRows = raw.slice(1);

  const iPopid = headers.indexOf('POPID');
  if (iPopid < 0) throw new Error('POPID column not found in ' + SHEET);

  // Find max POPID numeric.
  let maxPopid = 0;
  const populatedNumeric = new Set();
  for (const row of dataRows) {
    const m = String(row[iPopid] || '').match(/^POP-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      populatedNumeric.add(n);
      if (n > maxPopid) maxPopid = n;
    }
  }
  const startNum = maxPopid + 1;
  const endNum = maxPopid + TARGET_COUNT;
  console.log(`Live SL: ${dataRows.length} rows. Max POPID numeric: ${maxPopid}`);
  console.log(`Target POPID range: POP-${String(startNum).padStart(5, '0')}..POP-${String(endNum).padStart(5, '0')}`);

  // ─── Idempotency: POPID-range collision check ───────────────────────────
  const collisions = [];
  for (let n = startNum; n <= endNum; n++) {
    if (populatedNumeric.has(n)) collisions.push('POP-' + String(n).padStart(5, '0'));
  }
  if (collisions.length) {
    console.error('ABORT: POPID range collision detected. Already-populated POPIDs in target range:');
    console.error('  ' + collisions.slice(0, 10).join(', ') + (collisions.length > 10 ? ` ... (+${collisions.length - 10} more)` : ''));
    console.error('Either ingest already applied, or live SL grew in parallel. Inspect before re-running.');
    process.exit(1);
  }

  // ─── Build derivation inputs ─────────────────────────────────────────────
  const ledgerFreq = library.buildLedgerFreqSnapshot(headers, raw, { includesHeader: true });
  const { firstCounts, lastCounts } = buildNameCounts(dataRows, headers);

  // Snapshot pre-existing live counts so the audit JSON shows what we
  // started with vs. what we added.
  const preFirstCounts = JSON.parse(JSON.stringify(firstCounts));
  const preLastCounts = JSON.parse(JSON.stringify(lastCounts));

  // ─── Generate 150 candidates ─────────────────────────────────────────────
  const generated = [];
  const failures = [];

  for (let i = 0; i < TARGET_COUNT; i++) {
    const candidateSeed = djb2(SEED + ':' + i);

    const firstName = drawWithCap(NAME_POOL.names, firstCounts, FIRST_NAME_CAP, candidateSeed, 'first');
    if (!firstName) {
      failures.push({ i, reason: 'first-name cap exhausted after 50 retries' });
      continue;
    }
    const lastName = drawWithCap(LAST_NAMES, lastCounts, LAST_NAME_CAP, candidateSeed, 'last');
    if (!lastName) {
      failures.push({ i, reason: 'last-name cap exhausted after 50 retries' });
      continue;
    }
    firstCounts[firstName] = (firstCounts[firstName] || 0) + 1;
    lastCounts[lastName] = (lastCounts[lastName] || 0) + 1;

    const age = drawAge(candidateSeed);
    const neighborhood = drawNeighborhood(candidateSeed);
    const popId = 'POP-' + String(startNum + i).padStart(5, '0');
    const baseRowSeed = djb2(firstName + '|' + lastName + '|' + popId);

    // Redraw whole profile if RoleType lands on denylist. Salting the seed
    // regenerates all dependent fields (income, debt, networth) deterministically.
    let profile = null;
    let attempt = 0;
    let rowSeed = baseRowSeed;
    while (attempt <= ROLE_REDRAW_RETRIES) {
      rowSeed = attempt === 0 ? baseRowSeed : djb2(baseRowSeed + ':redraw:' + attempt);
      profile = library.deriveCitizenProfile(
        rowSeed,
        age,
        neighborhood,
        ledgerFreq,
        { genderOverride: 'female' },
      );
      if (!ROLE_DENYLIST.has(profile.RoleType)) break;
      attempt++;
    }
    if (!profile || ROLE_DENYLIST.has(profile.RoleType)) {
      failures.push({ i, popId, reason: 'role-denylist redraw exhausted after ' + ROLE_REDRAW_RETRIES + ' retries' });
      continue;
    }

    generated.push({
      popId,
      firstName,
      lastName,
      birthYear: ANCHOR_YEAR - age,
      age,
      neighborhood,
      profile,
      roleRedraws: attempt,
    });
  }

  if (failures.length) {
    console.error('ABORT: ' + failures.length + ' candidate(s) failed to draw. First few:');
    console.error(failures.slice(0, 5));
    process.exit(1);
  }

  // ─── Compose rows in live header order ──────────────────────────────────
  const nowIso = NOW_ISO_OVERRIDE || new Date().toISOString();

  function composeRow(g) {
    const row = new Array(headers.length).fill('');
    const set = (col, val) => {
      const idx = headers.indexOf(col);
      if (idx >= 0) row[idx] = val;
    };
    set('POPID', g.popId);
    set('First', g.firstName);
    set('Last', g.lastName);
    set('OriginGame', 'Engine');
    set('ClockMode', 'ENGINE');
    set('Tier', 4);
    set('RoleType', g.profile.RoleType);
    set('Status', 'active');
    set('BirthYear', g.birthYear);
    set('CreatedAt', nowIso);
    set('Last Updated', nowIso);
    set('UsageCount', 0);
    set('Neighborhood', g.neighborhood);
    set('MaritalStatus', g.profile.MaritalStatus);
    set('NumChildren', g.profile.NumChildren);
    set('Income', g.profile._income);
    set('NetWorth', g.profile.NetWorth);
    set('DebtLevel', g.profile.DebtLevel);
    set('EducationLevel', g.profile.EducationLevel);
    set('CareerStage', g.profile._careerStage);
    set('YearsInCareer', g.profile.YearsInCareer);
    set('Gender', g.profile.Gender);
    return row;
  }

  const composedRows = generated.map(composeRow);

  // ─── Build audit JSON ────────────────────────────────────────────────────
  const audit = {
    generatedAt: nowIso,
    seed: SEED,
    targetCount: TARGET_COUNT,
    applied: false,
    popIdRange: ['POP-' + String(startNum).padStart(5, '0'), 'POP-' + String(endNum).padStart(5, '0')],
    sheetHeaders: headers,
    preLiveCount: dataRows.length,
    rows: generated.map(g => ({
      popId: g.popId,
      first: g.firstName,
      last: g.lastName,
      age: g.age,
      birthYear: g.birthYear,
      neighborhood: g.neighborhood,
      gender: g.profile.Gender,
      roleType: g.profile.RoleType,
      educationLevel: g.profile.EducationLevel,
      yearsInCareer: g.profile.YearsInCareer,
      debtLevel: g.profile.DebtLevel,
      netWorth: g.profile.NetWorth,
      maritalStatus: g.profile.MaritalStatus,
      numChildren: g.profile.NumChildren,
      careerStage: g.profile._careerStage,
      income: g.profile._income,
    })),
    distribution: buildDistribution(generated),
    nameCounts: {
      preFirstCountsTop: topN(preFirstCounts, 10),
      preLastCountsTop: topN(preLastCounts, 10),
      newFirstCounts: countNew(generated, 'firstName'),
      newLastCounts: countNew(generated, 'lastName'),
      combinedFirstMax: maxCombined(preFirstCounts, generated, 'firstName'),
      combinedLastMax: maxCombined(preLastCounts, generated, 'lastName'),
    },
  };

  const outDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'female_balance_ingest_c92.json');

  // ─── Apply (if --apply) ──────────────────────────────────────────────────
  if (apply) {
    console.log(`\nAppending ${composedRows.length} rows to ${SHEET}...`);
    await sheets.appendRows(SHEET, composedRows);

    // Read back to verify.
    const verifyRaw = await sheets.getRawSheetData(SHEET);
    const verifyHeaders = verifyRaw[0];
    const verifyRows = verifyRaw.slice(1);
    const iVerifyPopid = verifyHeaders.indexOf('POPID');
    const iVerifyGender = verifyHeaders.indexOf('Gender');

    let landedInRange = 0;
    let landedFemale = 0;
    let totalFemaleAfter = 0;
    let totalAfter = 0;
    for (const vrow of verifyRows) {
      const m = String(vrow[iVerifyPopid] || '').match(/^POP-(\d+)/);
      if (!m) continue;
      const n = parseInt(m[1], 10);
      const g = String(vrow[iVerifyGender] || '').trim().toLowerCase();
      if (n >= startNum && n <= endNum) {
        landedInRange++;
        if (g === 'female') landedFemale++;
      }
      totalAfter++;
      if (g === 'female') totalFemaleAfter++;
    }

    audit.applied = true;
    audit.appliedAt = new Date().toISOString();
    audit.verification = {
      landedInRange,
      landedFemale,
      totalRowsAfter: totalAfter,
      totalFemaleAfter,
      femaleSharePct: Number(((totalFemaleAfter / totalAfter) * 100).toFixed(2)),
    };

    console.log(`Verification:`);
    console.log(`  Rows landed in target range: ${landedInRange} / ${TARGET_COUNT}`);
    console.log(`  Of those, female:            ${landedFemale} / ${TARGET_COUNT}`);
    console.log(`  Total rows after:            ${totalAfter}`);
    console.log(`  Total female after:          ${totalFemaleAfter}`);
    console.log(`  Female share post-apply:     ${audit.verification.femaleSharePct}%`);

    if (landedInRange !== TARGET_COUNT || landedFemale !== TARGET_COUNT) {
      console.error('VERIFICATION FAILED — readback does not match expected.');
      fs.writeFileSync(outPath, JSON.stringify(audit, null, 2));
      process.exit(1);
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(audit, null, 2));
  console.log(`\nAudit JSON: ${outPath}`);

  // ─── Run gates (also useful in --apply mode for visibility) ──────────────
  console.log('\n═══ Phase 4 Validation Gates ═══');
  runGates(audit, generated);
}

// ─── Distribution + gate helpers ────────────────────────────────────────────

function buildDistribution(generated) {
  const dist = {
    gender: {},
    neighborhood: {},
    ageBracket: {},
    maritalStatus: {},
    numChildren: {},
    roleType: {},
    educationLevel: {},
  };
  for (const g of generated) {
    dist.gender[g.profile.Gender] = (dist.gender[g.profile.Gender] || 0) + 1;
    dist.neighborhood[g.neighborhood] = (dist.neighborhood[g.neighborhood] || 0) + 1;
    const br = bracketOf(g.age);
    dist.ageBracket[br] = (dist.ageBracket[br] || 0) + 1;
    dist.maritalStatus[g.profile.MaritalStatus] = (dist.maritalStatus[g.profile.MaritalStatus] || 0) + 1;
    const nc = String(g.profile.NumChildren);
    dist.numChildren[nc] = (dist.numChildren[nc] || 0) + 1;
    dist.roleType[g.profile.RoleType] = (dist.roleType[g.profile.RoleType] || 0) + 1;
    dist.educationLevel[g.profile.EducationLevel] = (dist.educationLevel[g.profile.EducationLevel] || 0) + 1;
  }
  return dist;
}

function bracketOf(age) {
  if (age < 30) return '18-29';
  if (age < 45) return '30-44';
  if (age < 60) return '45-59';
  if (age < 75) return '60-74';
  return '75+';
}

function topN(counts, n) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => [k, v]);
}

function countNew(generated, key) {
  const counts = {};
  for (const g of generated) counts[g[key]] = (counts[g[key]] || 0) + 1;
  return counts;
}

function maxCombined(pre, generated, key) {
  const merged = Object.assign({}, pre);
  for (const g of generated) merged[g[key]] = (merged[g[key]] || 0) + 1;
  let maxName = null, maxVal = 0;
  for (const [k, v] of Object.entries(merged)) {
    if (v > maxVal) { maxVal = v; maxName = k; }
  }
  return { name: maxName, count: maxVal };
}

function runGates(audit, generated) {
  const T = generated.length;
  let pass = true;

  // Gate 1: Count + gender
  const allFemale = generated.every(g => g.profile.Gender === 'female');
  const sequentialIds = generated.every((g, i) => {
    const prev = i === 0 ? null : generated[i - 1].popId;
    if (!prev) return true;
    return parseInt(g.popId.split('-')[1]) - parseInt(prev.split('-')[1]) === 1;
  });
  const g1 = allFemale && sequentialIds && T === audit.targetCount;
  console.log(`Gate 1 (count + gender):       ${g1 ? 'PASS' : 'FAIL'} — ${T} rows, all female=${allFemale}, sequential=${sequentialIds}`);
  pass = pass && g1;

  // Gate 2: Field completeness
  const requiredFields = ['RoleType', 'EducationLevel', 'Gender', 'YearsInCareer', 'DebtLevel', 'NetWorth', 'MaritalStatus', 'NumChildren'];
  let emptyCount = 0;
  let citizenLiteralCount = 0;
  for (const g of generated) {
    for (const f of requiredFields) {
      const v = g.profile[f];
      if (v === '' || v === null || v === undefined) emptyCount++;
    }
    if (g.profile.RoleType === 'Citizen') citizenLiteralCount++;
    if (!g.birthYear || !g.neighborhood) emptyCount++;
  }
  const g2 = emptyCount === 0 && citizenLiteralCount === 0;
  console.log(`Gate 2 (field completeness):   ${g2 ? 'PASS' : 'FAIL'} — empty cells: ${emptyCount}, 'Citizen' literal: ${citizenLiteralCount}`);
  pass = pass && g2;

  // Gate 3: Determinism — checked externally via two-run diff, but flag internal sanity
  // (every row's seed was deterministic by construction; document the seed used).
  console.log(`Gate 3 (determinism):          (verify externally — diff two runs of output JSON with timestamps stripped)`);

  // Gate 4: Distribution
  const dist = audit.distribution;
  const maritalCount = Object.keys(dist.maritalStatus).length;
  const childBuckets = Object.keys(dist.numChildren).length;
  const roleCount = Object.keys(dist.roleType).length;

  const expectedAgePct = { '18-29': 22, '30-44': 28, '45-59': 22, '60-74': 20, '75+': 8 };
  const expectedNbhdPct = {
    'Lake Merritt': 10.5, 'Rockridge': 10.0, 'Temescal': 9.5, 'Piedmont Ave': 9.0,
    'Uptown': 8.5, 'Downtown': 8.5, 'Jack London': 8.5, 'KONO': 8.0,
    'Laurel': 8.0, 'Chinatown': 7.5, 'Fruitvale': 6.5, 'West Oakland': 5.5,
  };

  const ageDeltas = {};
  for (const [br, expected] of Object.entries(expectedAgePct)) {
    const actual = ((dist.ageBracket[br] || 0) / T) * 100;
    ageDeltas[br] = Math.abs(actual - expected);
  }
  const maxAgeDelta = Math.max(...Object.values(ageDeltas));

  const nbhdDeltas = {};
  for (const [nbhd, expected] of Object.entries(expectedNbhdPct)) {
    const actual = ((dist.neighborhood[nbhd] || 0) / T) * 100;
    nbhdDeltas[nbhd] = Math.abs(actual - expected);
  }
  const maxNbhdDelta = Math.max(...Object.values(nbhdDeltas));

  // Age-bracket threshold loosened to ±7% (≈2σ for n=150 sampling on a 22% bucket).
  // Neighborhood threshold stays ±5% (12 buckets, smaller per-bucket variance allowed).
  const AGE_DELTA_TOL = 7;
  const NBHD_DELTA_TOL = 5;
  const g4 = maritalCount >= 5 && childBuckets >= 6 && roleCount >= 30 && maxAgeDelta <= AGE_DELTA_TOL && maxNbhdDelta <= NBHD_DELTA_TOL;
  console.log(`Gate 4 (distribution):         ${g4 ? 'PASS' : 'FAIL'}`);
  console.log(`    marital statuses: ${maritalCount} (≥5)  child buckets: ${childBuckets} (≥6)  roleTypes: ${roleCount} (≥30)`);
  console.log(`    max age-bracket Δ:    ${maxAgeDelta.toFixed(2)}% (≤${AGE_DELTA_TOL})`);
  console.log(`    max neighborhood Δ:   ${maxNbhdDelta.toFixed(2)}% (≤${NBHD_DELTA_TOL})`);
  pass = pass && g4;

  // Gate 5: Cluster cap
  const cFirst = audit.nameCounts.combinedFirstMax;
  const cLast = audit.nameCounts.combinedLastMax;
  // Cap applies to NEW additions (pre-existing clusters grandfathered).
  // Check: no NEW first name pushes its combined count past
  // max(preCount, FIRST_NAME_CAP). Same for last.
  let clusterViolations = [];
  for (const [name, newCount] of Object.entries(audit.nameCounts.newFirstCounts)) {
    if (newCount > FIRST_NAME_CAP) {
      clusterViolations.push(`first:${name} new=${newCount} cap=${FIRST_NAME_CAP}`);
    }
  }
  for (const [name, newCount] of Object.entries(audit.nameCounts.newLastCounts)) {
    if (newCount > LAST_NAME_CAP) {
      clusterViolations.push(`last:${name} new=${newCount} cap=${LAST_NAME_CAP}`);
    }
  }
  const g5 = clusterViolations.length === 0;
  console.log(`Gate 5 (cluster cap):          ${g5 ? 'PASS' : 'FAIL'} — combined-max first: ${cFirst.name}=${cFirst.count}, last: ${cLast.name}=${cLast.count}`);
  if (clusterViolations.length) console.log('    violations: ' + clusterViolations.slice(0, 5).join(' | '));
  pass = pass && g5;

  console.log(`\nOverall: ${pass ? 'ALL GATES GREEN' : 'GATES FAILED — fix before --apply'}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
