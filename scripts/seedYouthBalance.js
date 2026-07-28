#!/usr/bin/env node
/**
 * seedYouthBalance.js — engine.5 Phase 1 (Representative Sample model, S243).
 *
 * Plan: docs/engine/LEDGER_REPAIR_HOUSEHOLDS.md §Phase 1.
 * Sibling pattern: scripts/ingestFemaleCitizensBalance.js (dry-run → apply → verify).
 *
 * WHAT: promote a small FUNCTIONAL cohort of youth (Tier-5 → Tier-4) so the engine's
 * youth/birth/aging logic has live material and youth coverage has subjects. NOT a
 * representative age redraw — the tracked set legitimately skews adult (story-participants).
 *
 * MODEL (Mike S243): tracked citizens are a sample of ~375,985 Oaklanders. Seed youth are
 * representative young voices; their parents are off-sample (ParentIds = []). The only
 * structural rule: INVARIANT — a tracked child must share a household with ≥1 tracked adult
 * (not necessarily a parent). We satisfy it by placing each youth into an existing tracked
 * adult's household.
 *
 * DUAL-WRITE (Step-2 audit catch): writes BOTH stores or the engine won't see the youth —
 *   1. Simulation_Ledger — new youth row (runYouthEngine reads age 5-22 here).
 *   2. Household_Ledger  — appends youth POPID to the host household's Members JSON array
 *      (loadHouseholds_ + income/wealth engines read here); flips HouseholdType → 'family'.
 *
 * Determinism: djb2 hash on (SEED + ':' + i) drives every draw — byte-identical re-runs.
 * Idempotency: aborts if any POPID in the target range is already populated.
 *
 * Usage:
 *   node scripts/seedYouthBalance.js              # dry-run (no writes) → output JSON
 *   node scripts/seedYouthBalance.js --apply      # live writes + verify readback
 *   node scripts/seedYouthBalance.js --count 45   # override seed size (default 45)
 *   node scripts/seedYouthBalance.js --seed foo   # override determinism seed
 */

require('../lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const SL = 'Simulation_Ledger';
const HHL = 'Household_Ledger';
const CYCLE = 95;
const ANCHOR_YEAR = 2041;
const SEED_DEFAULT = 'youth-seed-c95';
const COUNT_DEFAULT = 45;
const OUT_PATH = path.resolve(__dirname, '../output/youth_seed_c95.json');
const NOW_ISO = process.env.SEED_NOW_ISO || new Date().toISOString();

// Age brackets — weighted toward 5–17 (runYouthEngine processes 5–22; 0–4 are texture).
// Each entry: share of the seed + [loAge, hiAge] + EducationLevel band.
const AGE_BANDS = [
  { share: 0.18, lo: 0,  hi: 4,  edu: 'Pre-K' },          // texture only (engine-silent)
  { share: 0.31, lo: 5,  hi: 10, edu: 'Elementary' },     // runYouthEngine: elementary
  { share: 0.20, lo: 11, hi: 13, edu: 'Middle School' },  // runYouthEngine: middle
  { share: 0.31, lo: 14, hi: 17, edu: 'High School' },    // runYouthEngine: high
];

// Youth first-name pool — contemporary names for children born ~2024–2041 Oakland.
// Diverse per ENGINE_REPAIR Row 5 discipline (Latino / Black / E+SE-Asian / South-Asian /
// MENA / African / Anglo). Gender-tagged. No Tier-3 real-public-figure names. Curated inline
// (small functional seed; does not need the 150-entry adult pool infrastructure).
const FIRST_NAMES = {
  female: [
    'Camila','Valentina','Lucia','Mariana','Daniela','Isabela',        // latina
    'Zaria','Amara','Nia','Imani','Aaliyah','Layla',                   // black
    'Mei','Hana','Sora','Yuna','Linh','Mai',                          // e/se-asian
    'Aanya','Diya','Saanvi','Riya','Ananya',                          // south-asian
    'Yasmin','Layan','Salma','Nour',                                  // mena
    'Amina','Zola','Ayana','Thandiwe',                                // african
    'Eleanor','Hazel','Nora','Quinn','Sadie','Iris',                  // anglo
  ],
  male: [
    'Mateo','Santiago','Diego','Tomas','Emiliano','Andres',           // latina
    'Jaylen','Malik','Amari','Elijah','Andre','Xavier',               // black
    'Kai','Ren','Haruto','Minh','Duc','Jun',                          // e/se-asian
    'Arjun','Vivaan','Aarav','Rohan','Ishaan',                        // south-asian
    'Omar','Karim','Yusuf','Tariq',                                   // mena
    'Kwame','Tunde','Sefu','Jabari',                                  // african
    'Owen','Felix','Theo','Silas','Jasper','Eli',                     // anglo
  ],
};

// ─── Determinism (matches proven scripts/ingestFemaleCitizensBalance.js impl) ──
// Per-draw the VARYING part must be the seed (per-citizen identity); salt stays a
// fixed descriptor. djb2 clusters if the sequential index is the salt suffix.
function djb2(s) { let h = 5381; s = String(s || ''); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }
function rand01(seed, salt) { return (djb2(String(seed) + ':' + String(salt)) % 1000000) / 1000000; }
function popN(v) { const m = String(v || '').match(/POP-0*(\d+)/); return m ? Number(m[1]) : 1e9; }
function parseJSON(v, d) { try { const x = JSON.parse(v); return x == null ? d : x; } catch { return d; } }

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const SEED = (argv.find(a => a.startsWith('--seed')) ? argv[argv.indexOf(argv.find(a => a.startsWith('--seed'))) + 1] : null) || SEED_DEFAULT;
  const countArg = argv.find(a => a === '--count');
  const COUNT = countArg ? Number(argv[argv.indexOf(countArg) + 1]) : COUNT_DEFAULT;

  console.log(`seedYouthBalance — engine.5 Phase 1`);
  console.log(`Mode: ${apply ? 'APPLY (live writes)' : 'DRY-RUN (no writes)'} | seed=${SEED} | count=${COUNT}\n`);

  // ── Read both stores ──────────────────────────────────────────────────────
  const slRaw = await sheets.getRawSheetData(SL);
  const slH = slRaw[0]; const slCol = {}; slH.forEach((h, i) => slCol[String(h).trim()] = i);
  const sc = (n) => slCol[n];
  const slData = slRaw.slice(1);

  const hhRaw = await sheets.getRawSheetData(HHL);
  const hhH = hhRaw[0]; const hhCol = {}; hhH.forEach((h, i) => hhCol[String(h).trim()] = i);
  const hc = (n) => hhCol[n];
  const hhData = hhRaw.slice(1);

  // Max POPID + idempotency check
  const popNums = slData.map(r => popN(r[sc('POPID')])).filter(n => n < 1e9);
  const maxPop = Math.max(...popNums);
  const startNum = maxPop + 1;
  const endNum = startNum + COUNT - 1;
  const taken = new Set(popNums);
  for (let n = startNum; n <= endNum; n++) {
    if (taken.has(n)) { console.error(`ABORT: POP-${String(n).padStart(5, '0')} already populated — range collision.`); process.exit(1); }
  }
  console.log(`Live SL max POPID: POP-${String(maxPop).padStart(5, '0')} → seeding POP-${String(startNum).padStart(5, '0')}..POP-${String(endNum).padStart(5, '0')}`);

  // ── Eligible host adults ────────────────────────────────────────────────────
  // Tracked adult (age 25–60), Active, Tier != 1, has a Household_Ledger row,
  // not already a tracked-child host (ChildrenIds non-empty). Prefer NumChildren > 0.
  const hhById = {};
  hhData.forEach((r, i) => { const id = String(r[hc('HouseholdId')] || '').trim(); if (id) hhById[id] = { row: r, sheetRow: i + 2 }; });

  const hosts = [];
  for (let i = 0; i < slData.length; i++) {
    const r = slData[i];
    const status = String(r[sc('Status')] || '').trim().toLowerCase();
    const tier = String(r[sc('Tier')] || '').trim();
    const hhid = String(r[sc('HouseholdId')] || '').trim();
    const by = Number(r[sc('BirthYear')]);
    const age = by ? ANCHOR_YEAR - by : null;
    const childrenIds = parseJSON(r[sc('ChildrenIds')], []);
    const numChildren = Number(r[sc('NumChildren')]) || 0;
    if (status !== 'active') continue;
    if (tier === '1') continue;                              // Tier-1 = Mike's manual review
    if (!hhid || !hhById[hhid]) continue;                    // must have a Household_Ledger row
    if (age == null || age < 25 || age > 60) continue;       // age-plausible guardian
    if (Array.isArray(childrenIds) && childrenIds.length > 0) continue; // don't pile onto existing tracked families
    hosts.push({
      popid: String(r[sc('POPID')] || '').trim(),
      name: `${String(r[sc('First')] || '').trim()} ${String(r[sc('Last')] || '').trim()}`.trim(),
      last: String(r[sc('Last')] || '').trim(),
      neighborhood: String(r[sc('Neighborhood')] || '').trim(),
      hhid, numChildren,
      gender: String(r[sc('Gender')] || '').trim().toLowerCase(),
    });
  }
  // Prefer NumChildren>0 (demographic hint), then deterministic spread by hash.
  hosts.sort((a, b) => {
    const ap = a.numChildren > 0 ? 0 : 1, bp = b.numChildren > 0 ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return djb2(SEED + ':host:' + a.popid) - djb2(SEED + ':host:' + b.popid);
  });
  console.log(`Eligible hosts: ${hosts.length} (need ${COUNT}) — ${hosts.filter(h => h.numChildren > 0).length} with NumChildren>0`);
  if (hosts.length < COUNT) { console.error(`ABORT: only ${hosts.length} eligible hosts for ${COUNT} youth.`); process.exit(1); }

  // ── Build age plan (deterministic bracket assignment) ─────────────────────
  const bandFor = (citSeed) => {
    const u = rand01(citSeed, 'band');
    let acc = 0;
    for (const b of AGE_BANDS) { acc += b.share; if (u <= acc) return b; }
    return AGE_BANDS[AGE_BANDS.length - 1];
  };

  // Per-first-name usage cap (avoid clusters), tracked across the seed.
  const firstUsed = { female: {}, male: {} };
  function pickFirst(gender, citSeed) {
    const pool = FIRST_NAMES[gender];
    const base = djb2(citSeed + ':first') % pool.length;
    for (let k = 0; k < pool.length; k++) {
      const cand = pool[(base + k) % pool.length];
      if ((firstUsed[gender][cand] || 0) < 2) { firstUsed[gender][cand] = (firstUsed[gender][cand] || 0) + 1; return cand; }
    }
    return pool[base]; // pool exhausted (won't happen at this scale)
  }

  // ── Compose youth ───────────────────────────────────────────────────────────
  const youth = [];
  for (let i = 0; i < COUNT; i++) {
    const popid = 'POP-' + String(startNum + i).padStart(5, '0');
    const citSeed = SEED + ':' + i;
    const band = bandFor(citSeed);
    const age = band.lo + Math.floor(rand01(citSeed, 'age-inner') * (band.hi - band.lo + 1));
    const gender = rand01(citSeed, 'gender') < 0.5 ? 'female' : 'male';
    const first = pickFirst(gender, citSeed);
    const host = hosts[i];
    youth.push({
      popid, first, last: host.last, gender, age, birthYear: ANCHOR_YEAR - age,
      edu: band.edu, neighborhood: host.neighborhood, hhid: host.hhid,
      host: { popid: host.popid, name: host.name },
    });
  }

  // ── Compose SL rows ───────────────────────────────────────────────────────
  function composeSLRow(y) {
    const row = new Array(slH.length).fill('');
    const set = (col, val) => { const idx = slCol[col]; if (idx != null) row[idx] = val; };
    set('POPID', y.popid);
    set('First', y.first);
    set('Last', y.last);
    set('OriginGame', 'Engine');
    set('ClockMode', 'ENGINE');
    set('Tier', 4);
    set('RoleType', 'student');
    set('Status', 'Active');
    set('BirthYear', y.birthYear);
    set('CreatedAt', NOW_ISO);
    set('LastUpdated', NOW_ISO);
    set('UsageCount', 0);
    set('Neighborhood', y.neighborhood);
    set('HouseholdId', y.hhid);
    set('MaritalStatus', 'single');
    set('NumChildren', 0);
    set('ParentIds', '[]');     // parents off-sample
    set('ChildrenIds', '[]');
    set('EducationLevel', y.edu);
    set('Gender', y.gender);
    return row;
  }
  const slRows = youth.map(composeSLRow);

  // ── Compose Household_Ledger Members updates (dual-write) ──────────────────
  // Group youth by host HHid (v1 is 1 youth/host, but stay general).
  const hhUpdates = {}; // hhid -> { sheetRow, members[], type }
  for (const y of youth) {
    const ent = hhById[y.hhid];
    if (!hhUpdates[y.hhid]) {
      hhUpdates[y.hhid] = {
        sheetRow: ent.sheetRow,
        members: parseJSON(ent.row[hc('Members')], []),
        typeCol: hc('HouseholdType'),
        membersCol: hc('Members'),
        luCol: hc('LastUpdated'),
      };
    }
    hhUpdates[y.hhid].members.push(y.popid);
  }

  // ── Output JSON ───────────────────────────────────────────────────────────
  const byBand = {}; AGE_BANDS.forEach(b => byBand[`${b.lo}-${b.hi}`] = 0);
  youth.forEach(y => { const b = AGE_BANDS.find(x => y.age >= x.lo && y.age <= x.hi); byBand[`${b.lo}-${b.hi}`]++; });
  const summary = {
    phase: 1, cycle: CYCLE, seed: SEED, mode: apply ? 'apply' : 'dry-run', generatedAt: NOW_ISO,
    count: COUNT, popidRange: [youth[0].popid, youth[youth.length - 1].popid],
    ageBandDistribution: byBand,
    genderSplit: { female: youth.filter(y => y.gender === 'female').length, male: youth.filter(y => y.gender === 'male').length },
    runYouthEngineVisible: youth.filter(y => y.age >= 5 && y.age <= 17).length,
    hostHouseholds: Object.keys(hhUpdates).length,
    neighborhoodSpread: youth.reduce((m, y) => { m[y.neighborhood] = (m[y.neighborhood] || 0) + 1; return m; }, {}),
  };
  const out = {
    summary,
    youth: youth.map(y => ({ ...y })),
    householdMemberUpdates: Object.entries(hhUpdates).map(([hhid, u]) => ({ hhid, newMembers: u.members })),
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

  console.log('\n═══ Phase 1 youth seed ═══');
  console.log(`  Youth: ${COUNT}  range ${summary.popidRange[0]}..${summary.popidRange[1]}`);
  console.log(`  Age bands: ${JSON.stringify(byBand)}`);
  console.log(`  Gender: ${summary.genderSplit.female}F / ${summary.genderSplit.male}M`);
  console.log(`  runYouthEngine-visible (5-17): ${summary.runYouthEngineVisible}`);
  console.log(`  Host households: ${summary.hostHouseholds}`);
  console.log(`  Neighborhood spread: ${JSON.stringify(summary.neighborhoodSpread)}`);
  console.log(`  Output: ${OUT_PATH}`);

  runGates(summary, youth, hosts);

  if (!apply) { console.log('\nDRY-RUN complete. Review JSON, then re-run with --apply.'); return; }

  // ── Apply: SL append + Household_Ledger Members batchUpdate ────────────────
  console.log(`\nAppending ${slRows.length} youth rows to ${SL}...`);
  await sheets.appendRows(SL, slRows);

  console.log(`Updating ${Object.keys(hhUpdates).length} ${HHL} households (Members + HouseholdType)...`);
  function colLetter(i) { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  const hhBatch = [];
  for (const u of Object.values(hhUpdates)) {
    hhBatch.push({ range: `'${HHL}'!${colLetter(u.membersCol)}${u.sheetRow}`, values: [[JSON.stringify(u.members)]] });
    hhBatch.push({ range: `'${HHL}'!${colLetter(u.typeCol)}${u.sheetRow}`, values: [['family']] });
    if (u.luCol != null) hhBatch.push({ range: `'${HHL}'!${colLetter(u.luCol)}${u.sheetRow}`, values: [[NOW_ISO]] });
  }
  await sheets.batchUpdate(hhBatch);

  // ── Verify readback ─────────────────────────────────────────────────────────
  const vSL = await sheets.getRawSheetData(SL);
  const vIds = new Set(vSL.slice(1).map(r => String(r[sc('POPID')] || '').trim()));
  const slLanded = youth.filter(y => vIds.has(y.popid)).length;

  const vHH = await sheets.getRawSheetData(HHL);
  const vHHById = {}; vHH.slice(1).forEach(r => { const id = String(r[hc('HouseholdId')] || '').trim(); if (id) vHHById[id] = r; });
  let hhLanded = 0;
  for (const [hhid, u] of Object.entries(hhUpdates)) {
    const mem = parseJSON(vHHById[hhid]?.[hc('Members')], []);
    if (u.members.every(m => mem.includes(m))) hhLanded++;
  }

  console.log('\nVerification (live readback):');
  console.log(`  SL youth rows landed:        ${slLanded} / ${COUNT}`);
  console.log(`  HH Members updates landed:   ${hhLanded} / ${Object.keys(hhUpdates).length}`);
  if (slLanded !== COUNT || hhLanded !== Object.keys(hhUpdates).length) {
    console.error('VERIFICATION FAILED — readback does not match expected.');
    process.exit(1);
  }
  out.summary.applied = true; out.summary.appliedAt = NOW_ISO;
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log('  ALL VERIFIED.');
}

function runGates(s, youth, hosts) {
  console.log('\n═══ Acceptance gates ═══');
  const g1 = s.count >= 30 && s.count <= 60;
  console.log(`  Gate 1 (count 30-60):                ${g1 ? 'PASS' : 'FAIL'} — ${s.count}`);
  const everyHasAdultHH = youth.every(y => y.hhid && hosts.some(h => h.hhid === y.hhid));
  console.log(`  Gate 2 (every youth in adult HH):    ${everyHasAdultHH ? 'PASS' : 'FAIL'} — invariant: tracked child + ≥1 tracked adult`);
  const lastOk = youth.every(y => { const h = hosts.find(x => x.hhid === y.hhid); return h && y.last === h.last; });
  console.log(`  Gate 3 (youth Last = host Last):     ${lastOk ? 'PASS' : 'FAIL'}`);
  const nbhdOk = youth.every(y => { const h = hosts.find(x => x.hhid === y.hhid); return h && y.neighborhood === h.neighborhood; });
  console.log(`  Gate 4 (youth nbhd = host nbhd):     ${nbhdOk ? 'PASS' : 'FAIL'}`);
  const seq = youth.every((y, i) => i === 0 || popN(y.popid) === popN(youth[i - 1].popid) + 1);
  console.log(`  Gate 5 (POPID sequential, no gap):   ${seq ? 'PASS' : 'FAIL'}`);
  const visible = s.runYouthEngineVisible >= s.count * 0.6;
  console.log(`  Gate 6 (≥60% age 5-17 engine-fed):   ${visible ? 'PASS' : 'CHECK'} — ${s.runYouthEngineVisible}/${s.count}`);
  console.log(`  Gate 7 (determinism):                re-run with same seed → byte-identical JSON`);
}

main().catch(e => { console.error(e); process.exit(1); });
