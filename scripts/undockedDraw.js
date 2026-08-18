#!/usr/bin/env node
/**
 * undockedDraw.js — UNDOCKED cast lottery (plan: docs/plans/2026-08-07-spacemolt-game-show.md)
 *
 * Deterministic seeded lottery over eligible Simulation_Ledger citizens.
 * The excitement is the randomness: any eligible citizen can be drawn.
 * Code draws; the newsroom narrates. Nobody approves individual names.
 *
 * Eligibility (v2 parameters — F7 ruling 2026-08-16: sitting officeholders are
 * ELIGIBLE, the city is fair game; the v1 council exclusion is removed):
 *   - Status === 'Active'            (excludes Traded / Retired / deceased / injured)
 *   - adult: BirthYear <= currentYear - minAge   (default minAge 18)
 *   - resides in Oakland: MigrationDestination empty, or ReturnedCycle >= MigratedCycle
 *   - has a POPID and a Neighborhood
 *
 * Draw: seed string -> sha256 -> mulberry32; sample cast + ranked alternates
 * without replacement from the sorted eligible-POPID snapshot. Seed, params,
 * snapshot hash, and result are written to a manifest so any draw is
 * reproducible: re-run with the same seed + same snapshot -> same cast.
 *
 * Usage:
 *   node scripts/undockedDraw.js --draw 1 --cycle 104 [--cast 3] [--alternates 3]
 *       [--seed UNDOCKED] [--current-year 2042] [--min-age 18] [--refresh]
 *   node scripts/undockedDraw.js --verify <manifestPath>   (reproduce a prior draw)
 *
 * Reads:  output/simulation_ledger_snapshot.jsonl (refresh with --refresh via dumpLedger.js)
 * Writes: output/spacemolt-show/draws/draw-<N>.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SNAPSHOT = path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl');
const OUT_DIR = path.join(ROOT, 'output', 'spacemolt-show', 'draws');

function parseArgs(argv) {
  const a = { draw: null, cycle: null, cast: 3, alternates: 3, seed: 'UNDOCKED',
              currentYear: 2042, minAge: 18, refresh: false, verify: null };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--draw') { a.draw = v; i++; }
    else if (k === '--cycle') { a.cycle = v; i++; }
    else if (k === '--cast') { a.cast = parseInt(v, 10); i++; }
    else if (k === '--alternates') { a.alternates = parseInt(v, 10); i++; }
    else if (k === '--seed') { a.seed = v; i++; }
    else if (k === '--current-year') { a.currentYear = parseInt(v, 10); i++; }
    else if (k === '--min-age') { a.minAge = parseInt(v, 10); i++; }
    else if (k === '--refresh') { a.refresh = true; }
    else if (k === '--verify') { a.verify = v; i++; }
    else { console.error('unknown arg: ' + k); process.exit(2); }
  }
  return a;
}

// Deterministic PRNG: sha256(seed) -> mulberry32 state
function prngFromSeed(seedStr) {
  const h = crypto.createHash('sha256').update(seedStr).digest();
  let s = h.readUInt32LE(0);
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadRows(refresh) {
  if (refresh || !fs.existsSync(SNAPSHOT)) {
    console.error('[draw] refreshing ledger snapshot via dumpLedger.js');
    execFileSync('node', [path.join(ROOT, 'scripts', 'dumpLedger.js'), '--quiet'],
      { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
  }
  return fs.readFileSync(SNAPSHOT, 'utf8').split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch (_) { return null; } })
    .filter(Boolean);
}

// F7 ruling (2026-08-16, recorded in the plan changelog): sitting officeholders
// are ELIGIBLE — the DA was drawn and stays. The v1 sittingOfficials() exclusion
// (Civic_Office_Ledger council roster) is removed; old draw manifests carry
// their own eligibility text, so --verify against them reports the filter drift
// as a snapshot mismatch rather than silently reproducing under new rules.
function eligible(rows, params) {
  const out = [];
  for (const r of rows) {
    const pop = String(r.POPID || '').trim().toUpperCase();
    if (!pop) continue;
    if (!String(r.Neighborhood || '').trim()) continue;
    if (String(r.Status || '').trim() !== 'Active') continue;
    const by = parseInt(r.BirthYear, 10);
    if (!Number.isFinite(by)) continue;
    if (by > params.currentYear - params.minAge) continue;
    const dest = String(r.MigrationDestination || '').trim();
    if (dest) {
      const mig = parseInt(r.MigratedCycle, 10);
      const ret = parseInt(r.ReturnedCycle, 10);
      if (!(Number.isFinite(ret) && Number.isFinite(mig) && ret >= mig)) continue;
    }
    out.push({
      popid: pop,
      name: String(r.Name || (r.First + ' ' + r.Last)).replace(/\s+/g, ' ').trim(),
      age: params.currentYear - by,
      neighborhood: String(r.Neighborhood).trim(),
      role: String(r.RoleType || '').trim(),
      tier: String(r.Tier || '').trim(),
    });
  }
  out.sort((a, b) => a.popid < b.popid ? -1 : 1);
  return out;
}

function draw(list, seedStr, cast, alternates) {
  const rand = prngFromSeed(seedStr);
  const idx = list.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const picked = idx.slice(0, cast + alternates).map(i => list[i]);
  return { cast: picked.slice(0, cast), alternates: picked.slice(cast) };
}

function main() {
  const params = parseArgs(process.argv);

  if (params.verify) {
    const m = JSON.parse(fs.readFileSync(params.verify, 'utf8'));
    const rows = loadRows(false);
    const list = eligible(rows, m.params);
    const hash = crypto.createHash('sha256')
      .update(list.map(c => c.popid).join(',')).digest('hex');
    if (hash !== m.eligibleSnapshotHash) {
      console.error('[verify] eligible snapshot differs — draw not reproducible against current ledger');
      process.exit(1);
    }
    const res = draw(list, m.seedString, m.params.cast, m.params.alternates);
    const same = JSON.stringify(res.cast.map(c => c.popid))
      === JSON.stringify(m.cast.map(c => c.popid));
    console.log('[verify] ' + (same ? 'REPRODUCED — cast matches' : 'MISMATCH'));
    process.exit(same ? 0 : 1);
  }

  if (!params.draw || !params.cycle) {
    console.error('usage: --draw <N> --cycle <C> required (see header)');
    process.exit(2);
  }

  const rows = loadRows(params.refresh);
  const list = eligible(rows, params);
  const seedString = `${params.seed}:draw${params.draw}:cycle${params.cycle}`;
  const hash = crypto.createHash('sha256')
    .update(list.map(c => c.popid).join(',')).digest('hex');
  const res = draw(list, seedString, params.cast, params.alternates);

  const manifest = {
    show: 'UNDOCKED',
    draw: Number(params.draw),
    cycle: params.cycle,
    seedString,
    params: { cast: params.cast, alternates: params.alternates,
              currentYear: params.currentYear, minAge: params.minAge },
    eligibility: [
      "Status === 'Active'",
      `adult: BirthYear <= ${params.currentYear - params.minAge}`,
      'resides in Oakland (MigrationDestination empty or ReturnedCycle >= MigratedCycle)',
      'sitting officeholders ELIGIBLE (F7 ruling 2026-08-16)',
      'POPID and Neighborhood present',
    ],
    eligibleCount: list.length,
    eligibleSnapshotHash: hash,
    ledgerRows: rows.length,
    cast: res.cast,
    alternates: res.alternates,
    drawnAt: new Date().toISOString(),
    drawnBy: 'scripts/undockedDraw.js',
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `draw-${params.draw}.json`);
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`[draw] UNDOCKED draw #${params.draw} (cycle ${params.cycle})`);
  console.log(`[draw] eligible: ${list.length} of ${rows.length} ledger citizens ` +
    '(officeholders eligible per F7)');
  console.log(`[draw] seed: ${seedString}`);
  console.log('[draw] CAST:');
  res.cast.forEach((c, i) =>
    console.log(`  ${i + 1}. ${c.name} (${c.popid}) — ${c.age}, ${c.role}, ${c.neighborhood}`));
  console.log('[draw] ALTERNATES (succession order):');
  res.alternates.forEach((c, i) =>
    console.log(`  ${i + 1}. ${c.name} (${c.popid}) — ${c.age}, ${c.role}, ${c.neighborhood}`));
  console.log(`[draw] manifest: ${path.relative(ROOT, file)}`);
  console.log('[draw] reproduce: node scripts/undockedDraw.js --verify ' + path.relative(ROOT, file));
}

main();
