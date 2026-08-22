#!/usr/bin/env node
/**
 * mintCanonBonds.js — canon → Relationship_Bonds intake
 * [engine/sheet] — docs/plans/2026-08-21-published-canon-bond-mint.md
 *
 * The return edge in the engine/cron loop (docs/ENGINE_CRON_LOOP.md): the engine
 * seeds cheap proximity bonds, the crons and canon magnify them into story, and
 * this is how the story comes back as engine-actionable state. 104 cycles of
 * published canon had produced zero bonds among the city's most central figures
 * — Varek, Claire Ashford, Montez, Tran and Chen-Ramirez all sat at zero rows.
 *
 * WHAT THIS IS NOT: a prose parser. Extraction from canon is judgment work and
 * belongs in the cron/agent layer (detector-framer split). This script is the
 * deterministic half — it validates a structured claim file and mints rows, or
 * it fails closed. No model call, no inference, no guessing.
 *
 * THE POPID GATE (plan §7.4 — the reason this script exists in code and not as
 * a hand-pass). Two independent canon-synthesis agents each attached a POPID
 * lifted from a spatially-adjacent row of their own output — Yuki Ji's id for
 * Benji Dillon, Jessie Berry's for Mark Aitken's academy — and both reported
 * their ids as verified. A wrong POPID does not fail loudly: it writes a real
 * edge between two real strangers and the next cron speaks from it as canon.
 * So: names are resolved against the LIVE Simulation_Ledger in code, ambiguous
 * or unknown names are rejected, and a supplied `expectedPopA/B` is never used
 * for anything except raising a loud mismatch. See auto-memory
 * `feedback_never-trust-agent-supplied-popids`.
 *
 * NO SCHEMA GROWTH (plan §2, ruled): Relationship_Bonds stays 17 columns and
 * two POPID parties. Citizen↔institution bonds, 3+ party bonds and the *nature*
 * of a bond live in canon and the crons, per ENGINE_CRON_LOOP §4.5. The nature
 * sentence rides in Notes; it is not a column.
 *
 * TYPE CHOICE MATTERS — the engine acts on these rows. bondEngine's maintenance
 * loop escalates `tension` to `rivalry` at intensity >= 6 and settles it to
 * `professional` at <= 2 with age > 3. A canon bond typed `tension` can drift
 * into a statement canon never made. `rivalry`, `professional`, `family`,
 * `alliance`, `friendship` and `mentorship` have no auto-retype path.
 *
 * Usage:
 *   node scripts/mintCanonBonds.js --claims intake/bond-claims/canon-cut-c104.json
 *   node scripts/mintCanonBonds.js --claims <path> --apply
 *
 * Flags:
 *   --claims <path>   required; the structured claim file
 *   --cycle N         override the claim file's cycle
 *   --apply           write to the live sheet (default is dry-run)
 *   --json            print the full report object instead of the table
 *
 * After --apply, refresh the bond snapshot the slice builders read:
 *   node scripts/buildCitizenBondGraph.js --live
 */

'use strict';

const CANON_ORIGIN = 'canon';

// bondEngine.js BOND_TYPES — mirrored here as a validation whitelist. Adding a
// type means adding it there first; a sheet literal with no enum key is the
// engine.59 bug class (friendship/family existed as rows for 100+ cycles but
// never as enum keys, so the romance flip could never fire).
const BOND_TYPES = [
  'rivalry', 'alliance', 'tension', 'mentorship', 'romantic',
  'professional', 'neighbor', 'festival', 'sports_rival',
  'friendship', 'family',
];

// bondEngine.js maintenance auto-retypes these. A canon claim using one is
// warned, not rejected — the drift may be the intended next beat, but it has to
// be a decision rather than a surprise.
const AUTO_RETYPE_TYPES = { tension: 'escalates to rivalry at intensity >= 6; settles to professional at <= 2 after 3 cycles' };

// phase08-v3-chicago/v3DomainWriter.js DOMAIN_TRACKER_DOMAINS.
const DOMAIN_TAGS = [
  'CIVIC', 'CRIME', 'TRANSIT', 'ECONOMIC', 'EDUCATION', 'HEALTH', 'WEATHER',
  'COMMUNITY', 'NIGHTLIFE', 'HOUSING', 'CULTURE', 'SPORTS', 'BUSINESS',
  'SAFETY', 'INFRASTRUCTURE', 'GENERAL', 'FESTIVAL', 'HOLIDAY', 'ARTS',
  'ENVIRONMENT', 'TECHNOLOGY',
];

const BOND_HEADERS = [
  'BondId', 'CitizenA', 'CitizenB', 'BondType', 'Intensity', 'Status', 'Origin',
  'DomainTag', 'Neighborhood', 'CycleCreated', 'LastUpdate', 'Notes', 'Holiday',
  'HolidayPriority', 'FirstFriday', 'CreationDay', 'SportsSeason',
];

// A citizen who cannot form a bond. Mirrors bondEngine.js:468.
const NON_BONDING_STATUS = new Set(['deceased', 'retired', 'inactive', 'traded', 'pending']);

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Name → POPID index off raw Simulation_Ledger rows (header row included).
 * Indexes the Name column and a First+Last composite; a name that resolves to
 * more than one live citizen is kept as a collision so resolveName can reject.
 */
function buildNameIndex(ledgerRows) {
  const h = (ledgerRows[0] || []).map(String);
  const col = (n) => h.findIndex((x) => x.toLowerCase() === n.toLowerCase());
  const iPop = col('POPID'), iName = col('Name'), iFirst = col('First'), iLast = col('Last');
  const iStatus = col('Status');
  if (iPop < 0) throw new Error('Simulation_Ledger has no POPID column');

  const byName = new Map();
  const byPop = new Map();
  for (let r = 1; r < ledgerRows.length; r++) {
    const row = ledgerRows[r];
    const pop = String(row[iPop] || '').trim().toUpperCase();
    if (!pop) continue;
    const full = (iName >= 0 && row[iName])
      ? String(row[iName])
      : [row[iFirst], row[iLast]].filter(Boolean).join(' ');
    const status = iStatus >= 0 ? String(row[iStatus] || '').trim() : '';
    const entry = { pop, name: full, status, sheetRow: r + 1 };
    byPop.set(pop, entry);
    for (const key of new Set([normName(full), normName([row[iFirst], row[iLast]].filter(Boolean).join(' '))])) {
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, []);
      if (!byName.get(key).some((e) => e.pop === pop)) byName.get(key).push(entry);
    }
  }
  return { byName, byPop };
}

/** Exact normalized-name resolution. Never fuzzy: a near-match is a rejection. */
function resolveName(name, index) {
  const key = normName(name);
  if (!key) return { error: 'empty name' };
  const hits = index.byName.get(key) || [];
  if (hits.length === 0) return { error: `no citizen named "${name}" in Simulation_Ledger` };
  if (hits.length > 1) {
    return { error: `"${name}" is ambiguous — resolves to ${hits.map((h) => h.pop).join(', ')}` };
  }
  return { entry: hits[0] };
}

/** Unordered pair key so A↔B and B↔A collide. */
function pairKey(a, b) {
  return [String(a || '').toUpperCase(), String(b || '').toUpperCase()].sort().join('|');
}

/** Existing bond rows → { pairs: Map<pairKey, row[]>, ids: Set<normalized id> } */
function buildBondIndex(bondRows) {
  const h = (bondRows[0] || []).map(String);
  const iId = h.indexOf('BondId'), iA = h.indexOf('CitizenA'), iB = h.indexOf('CitizenB');
  if (iA < 0 || iB < 0) throw new Error('Relationship_Bonds is missing CitizenA/CitizenB');
  const pairs = new Map();
  const ids = new Set();
  for (let r = 1; r < bondRows.length; r++) {
    const row = bondRows[r];
    const k = pairKey(row[iA], row[iB]);
    if (!pairs.has(k)) pairs.set(k, []);
    pairs.get(k).push({ sheetRow: r + 1, cells: row });
    if (iId >= 0) ids.add(normBondId(row[iId]));
  }
  return { pairs, ids, headers: h };
}

/** Engine ids are bare 8-char [a-z0-9]; the engine.128 restore wrote BOND-XXXXXXXX. Compare on the same axis. */
function normBondId(v) {
  return String(v || '').replace(/^BOND-/i, '').toLowerCase();
}

/** 8-char [a-z0-9], matching generateBondId_. Collision-guarded against `taken` (engine.128). */
function makeBondId(taken, rand) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let attempt = 0; attempt < 200; attempt++) {
    let id = '';
    for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(rand() * chars.length));
    if (!taken.has(normBondId(id))) { taken.add(normBondId(id)); return id; }
  }
  throw new Error('makeBondId: could not find a free id in 200 attempts');
}

/** Notes are sim-facing. Cycle-stamped, never a Gregorian date. */
function buildNotes(nature, cycle) {
  const n = String(nature || '').trim().replace(/\s+/g, ' ');
  return `${n}${n && !/[.!?]$/.test(n) ? '.' : ''} [canon mint C${cycle}]`.trim();
}

/**
 * Validate one claim into a sheet row, or into a rejection.
 * Fails closed: any error means the claim is not minted.
 */
function validateClaim(claim, opts) {
  const { nameIndex, bondIndex, cycle, takenIds, rand } = opts;
  const errors = [];
  const warnings = [];

  const ra = resolveName(claim.a, nameIndex);
  const rb = resolveName(claim.b, nameIndex);
  if (ra.error) errors.push(`A: ${ra.error}`);
  if (rb.error) errors.push(`B: ${rb.error}`);

  // Supplied ids are advisory. Never adopted — only checked, loudly.
  for (const [side, resolved, supplied] of [['A', ra, claim.expectedPopA], ['B', rb, claim.expectedPopB]]) {
    if (!supplied || !resolved.entry) continue;
    const want = String(supplied).trim().toUpperCase();
    if (want !== resolved.entry.pop) {
      errors.push(
        `${side}: supplied ${want} does not match name resolution ${resolved.entry.pop} for "${resolved.entry.name}" ` +
        `— supplied id IGNORED; claim rejected pending a canon ruling (plan §7.4)`
      );
    }
  }

  if (ra.entry && rb.entry) {
    if (ra.entry.pop === rb.entry.pop) errors.push('A and B resolve to the same citizen');
    for (const [side, e] of [['A', ra.entry], ['B', rb.entry]]) {
      if (NON_BONDING_STATUS.has(String(e.status || '').toLowerCase())) {
        errors.push(`${side}: ${e.pop} status="${e.status}" forms no bonds (bondEngine.js:468)`);
      }
    }
    const k = pairKey(ra.entry.pop, rb.entry.pop);
    const existing = bondIndex.pairs.get(k);
    if (existing) {
      errors.push(
        `pair already has ${existing.length} bond row(s) at sheet row ${existing.map((x) => x.sheetRow).join(', ')} ` +
        `— refusing to silently update; resolve by hand or amend the claim`
      );
    }
  }

  const type = String(claim.bondType || '').trim();
  if (!BOND_TYPES.includes(type)) {
    errors.push(`bondType "${type}" is not in bondEngine BOND_TYPES (${BOND_TYPES.join(', ')})`);
  } else if (AUTO_RETYPE_TYPES[type]) {
    warnings.push(`bondType "${type}" auto-retypes in maintenance: ${AUTO_RETYPE_TYPES[type]}`);
  }

  const intensity = Number(claim.intensity);
  if (!Number.isFinite(intensity) || intensity < 1 || intensity > 10) {
    errors.push(`intensity ${claim.intensity} must be a number 1–10`);
  } else if (intensity <= 1) {
    warnings.push(`intensity ${intensity} is at the dormancy floor — maintenance will mark it dormant next cycle`);
  }

  const domainTag = String(claim.domainTag || '').trim().toUpperCase();
  if (domainTag && !DOMAIN_TAGS.includes(domainTag)) {
    errors.push(`domainTag "${domainTag}" is not a canonical domain (${DOMAIN_TAGS.join(', ')})`);
  }

  const neighborhood = String(claim.neighborhood || '').trim();
  if (neighborhood && opts.canonicalHoods && !opts.canonicalHoods.includes(neighborhood)) {
    errors.push(`neighborhood "${neighborhood}" is not canonical`);
  }

  if (!String(claim.nature || '').trim()) errors.push('nature is required — it is the only record of what the bond IS');
  if (!String(claim.evidence || '').trim()) errors.push('evidence is required — an unsourced bond is not canon');

  if (errors.length) {
    return { ok: false, claim, errors, warnings, popA: ra.entry && ra.entry.pop, popB: rb.entry && rb.entry.pop };
  }

  const bondId = makeBondId(takenIds, rand);
  const row = [
    bondId,
    ra.entry.pop,
    rb.entry.pop,
    type,
    String(intensity),
    'active',
    CANON_ORIGIN,
    domainTag,
    neighborhood,
    String(cycle),
    String(cycle),
    buildNotes(claim.nature, cycle),
    'none',
    'none',
    'FALSE',
    'FALSE',
    'off-season',
  ];
  return {
    ok: true, claim, errors: [], warnings, row, bondId,
    popA: ra.entry.pop, popB: rb.entry.pop,
    nameA: ra.entry.name, nameB: rb.entry.name,
  };
}

/** Validate a whole claim set. Pure — takes raw sheet rows, returns a plan. */
function planMint(claimSet, opts) {
  const { ledgerRows, bondRows, rand } = opts;
  const cycle = opts.cycle || claimSet.cycle;
  if (!cycle) throw new Error('no cycle: pass --cycle or set it in the claim file');

  const nameIndex = buildNameIndex(ledgerRows);
  const bondIndex = buildBondIndex(bondRows);
  const takenIds = new Set(bondIndex.ids);

  // Intra-file duplicates are as dangerous as sheet duplicates.
  const seenPairs = new Map();
  const results = [];
  for (const claim of (claimSet.claims || [])) {
    const res = validateClaim(claim, { nameIndex, bondIndex, cycle, takenIds, rand, canonicalHoods: opts.canonicalHoods });
    if (res.ok) {
      const k = pairKey(res.popA, res.popB);
      if (seenPairs.has(k)) {
        results.push({
          ok: false, claim, warnings: res.warnings,
          errors: [`duplicate pair within this claim file (already claimed as "${seenPairs.get(k)}")`],
          popA: res.popA, popB: res.popB,
        });
        takenIds.delete(normBondId(res.bondId));
        continue;
      }
      seenPairs.set(k, `${claim.a} ↔ ${claim.b}`);
    }
    results.push(res);
  }

  return {
    cycle,
    headers: BOND_HEADERS,
    accepted: results.filter((r) => r.ok),
    rejected: results.filter((r) => !r.ok),
    results,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function flag(name) {
  const i = process.argv.indexOf('--' + name);
  return (i === -1 || i === process.argv.length - 1) ? null : process.argv[i + 1];
}

async function main() {
  require('/root/GodWorld/lib/env');
  const fs = require('fs');
  const crypto = require('crypto');
  const sheets = require('/root/GodWorld/lib/sheets.js');
  let canonicalHoods = null;
  try { canonicalHoods = require('/root/GodWorld/lib/canonNeighborhoods').CANONICAL_HOODS; } catch (e) { /* optional */ }

  const claimsPath = flag('claims');
  const apply = process.argv.includes('--apply');
  const asJson = process.argv.includes('--json');
  if (!claimsPath) {
    console.error('usage: node scripts/mintCanonBonds.js --claims <path.json> [--cycle N] [--apply]');
    process.exit(1);
  }

  const claimSet = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
  const cycleOverride = flag('cycle') ? parseInt(flag('cycle'), 10) : null;

  const [ledgerRows, bondRows] = await Promise.all([
    sheets.getRawSheetData('Simulation_Ledger'),
    sheets.getRawSheetData('Relationship_Bonds'),
  ]);

  // Header contract: refuse to append against a shape we do not recognise.
  const liveHeaders = (bondRows[0] || []).map(String);
  if (liveHeaders.join('|') !== BOND_HEADERS.join('|')) {
    console.error('[FATAL] Relationship_Bonds header drift — refusing to append.');
    console.error('  expected: ' + BOND_HEADERS.join(', '));
    console.error('  live:     ' + liveHeaders.join(', '));
    process.exit(1);
  }

  const rand = () => crypto.randomInt(0, 1e9) / 1e9;
  const plan = planMint(claimSet, { ledgerRows, bondRows, cycle: cycleOverride, rand, canonicalHoods });

  console.log(`\n=== canon bond mint — ${claimSet.claimSet || claimsPath} — C${plan.cycle} — ${apply ? 'APPLY' : 'DRY RUN'} ===`);
  console.log(`live: ${bondRows.length - 1} bond rows, ${ledgerRows.length - 1} citizens\n`);

  for (const r of plan.results) {
    const label = `${r.claim.a} ↔ ${r.claim.b}`;
    if (r.ok) {
      console.log(`  MINT  ${label}`);
      console.log(`        ${r.popA} ↔ ${r.popB}  ${r.claim.bondType} @ ${r.claim.intensity}  ${r.claim.domainTag || '(no domain)'}  id=${r.bondId}`);
      console.log(`        ${r.row[11]}`);
    } else {
      console.log(`  SKIP  ${label}`);
      for (const e of r.errors) console.log(`        ! ${e}`);
    }
    for (const w of r.warnings || []) console.log(`        ~ ${w}`);
    console.log('');
  }

  console.log(`accepted ${plan.accepted.length} / rejected ${plan.rejected.length}`);

  const report = {
    claimSet: claimSet.claimSet || null,
    claimsPath,
    cycle: plan.cycle,
    generatedAt: new Date().toISOString(),
    applied: false,
    sources: claimSet.sources || [],
    accepted: plan.accepted.map((r) => ({
      a: r.claim.a, b: r.claim.b, popA: r.popA, popB: r.popB, bondId: r.bondId,
      bondType: r.claim.bondType, intensity: r.claim.intensity, domainTag: r.claim.domainTag,
      evidence: r.claim.evidence, warnings: r.warnings, row: r.row,
    })),
    rejected: plan.rejected.map((r) => ({ a: r.claim.a, b: r.claim.b, errors: r.errors })),
  };

  if (apply && plan.accepted.length) {
    const rows = plan.accepted.map((r) => r.row);
    await sheets.appendRowsDetailed('Relationship_Bonds', rows);

    // Verify after every write (.claude/rules/engine.md) — read the sheet back.
    const after = await sheets.getRawSheetData('Relationship_Bonds');
    const afterIdx = buildBondIndex(after);
    const missing = [];
    for (const r of plan.accepted) {
      const got = afterIdx.pairs.get(pairKey(r.popA, r.popB));
      if (!got || !got.some((g) => normBondId(g.cells[0]) === normBondId(r.bondId))) {
        missing.push(`${r.popA}↔${r.popB} (${r.bondId})`);
      }
    }
    const dupIds = afterIdx.ids.size !== after.length - 1;
    console.log(`\nread-back: ${after.length - 1} rows (was ${bondRows.length - 1}, +${after.length - bondRows.length})`);
    console.log(`read-back: ${afterIdx.ids.size} distinct BondIds — ${dupIds ? 'COLLISION' : 'no collisions'}`);
    if (missing.length) {
      console.error('[FATAL] read-back could not find: ' + missing.join(', '));
      report.applied = true;
      report.readBackMissing = missing;
      writeReport(fs, report, plan.cycle);
      process.exit(1);
    }
    console.log('read-back: all minted rows present and correct');
    console.log('\nNEXT: node scripts/buildCitizenBondGraph.js --live   # refresh output/bond-ledger-live.tsv');
    report.applied = true;
    report.rowsAfter = after.length - 1;
  } else if (apply) {
    console.log('\nnothing accepted — no write performed');
  } else {
    console.log('\ndry run — no write performed. Re-run with --apply to mint.');
  }

  const out = writeReport(fs, report, plan.cycle);
  console.log(`report: ${out}`);
  if (asJson) console.log(JSON.stringify(report, null, 2));
  if (plan.rejected.length && !plan.accepted.length) process.exit(2);
}

// The applied report is the only record of WHICH rows this mint wrote — it is
// how a mint gets reverted. A later dry run must never clobber it, so dry runs
// get their own filename. (Found the hard way: an idempotence re-check
// overwrote the c104 apply record seconds after it was written.)
function writeReport(fs, report, cycle) {
  const suffix = report.applied ? '' : '.dryrun';
  const out = `/root/GodWorld/output/canon_bond_mint_c${cycle}${suffix}.json`;
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  return out;
}

module.exports = {
  BOND_TYPES, DOMAIN_TAGS, BOND_HEADERS, CANON_ORIGIN,
  normName, buildNameIndex, resolveName, pairKey, buildBondIndex,
  normBondId, makeBondId, buildNotes, validateClaim, planMint,
};

if (require.main === module) {
  main().catch((err) => { console.error('[FATAL]', err); process.exit(1); });
}
