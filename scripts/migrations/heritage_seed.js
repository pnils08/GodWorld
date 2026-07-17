// heritage_seed.js — S322 heritage T1: found family lines from existing ledger state.
//
// Design (Mike-direct S322, in-thread): names display, NUMBERS track. A lineage
// is a connected component of the parent-child + marriage graph — NOT a surname
// group (canon: same-surname pairs are coincidence unless documented). Surnames
// collide and households dissolve (Household_Ledger rows carry DissolvedCycle);
// the LIN-##### id survives both. HH-KEANE stays a canon household; the Keane
// LINE is the model lineage and is forced to LIN-00001.
//
// What it does:
//   1. Ensures Simulation_Ledger has a LineageId column (appended at end).
//   2. Builds union-find components over ParentIds + SpouseId edges.
//   3. Components with >=2 members found a line (singletons found lazily later,
//      at marriage/birth — engine-side, T2+).
//   4. Creates/uses Heritage_Ledger tab; one row per line, aggregates computed
//      from live state (score starts 0 — scoring is T2 physics, never seeded).
//   5. Writes LineageId back to every member row. Read-back verifies both tabs.
//
// Usage: node heritage_seed.js --sheet-id=<id> [--apply]   (dry-run default)

const sheets = require('/root/GodWorld/lib/sheets.js');

const sheetIdArg = process.argv.find(a => a.startsWith('--sheet-id='));
const SHEET_ID = sheetIdArg ? sheetIdArg.split('=')[1] : null;
if (!SHEET_ID) { console.error('--sheet-id required'); process.exit(1); }
process.env.GODWORLD_SHEET_ID = SHEET_ID;
const APPLY = process.argv.includes('--apply');

const HL_TAB = 'Heritage_Ledger';
const HL_HEADERS = ['LineageId', 'FamilyName', 'FounderPopId', 'FoundedCycle', 'Generations',
  'LivingMembers', 'MembersList', 'HeritageScore', 'HeritageTier', 'TotalNetWorth',
  'HomesOwned', 'BusinessesOwned', 'CivicMembers', 'FameMembers', 'LastUpdated'];

function num(v) { const n = Number(String(v ?? '').replace(/[$,\s]/g, '')); return isNaN(n) ? null : n; }
const L = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

async function main() {
  const cal = await sheets.getRawSheetData('Simulation_Calendar');
  const calLast = cal.filter(r => r && num(r[0]) !== null).pop();
  const absMatch = String(calLast[5] || '').match(/Abs:\s*(\d+)/);
  const cycle = absMatch ? Number(absMatch[1]) : 0;
  const simYear = 2040 + num(calLast[0]);

  const d = await sheets.getRawSheetData('Simulation_Ledger');
  const H = d[0];
  const i = n => H.indexOf(n);
  const c = { pop: i('POPID'), first: i('First'), last: i('Last'), status: i('Status'),
    birth: i('BirthYear'), parents: i('ParentIds'), children: i('ChildrenIds'),
    spouse: i('SpouseId'), nw: i('NetWorth'), civ: i('CIV (y/n)'), usage: i('UsageCount') };

  // ── union-find over family edges ──
  const parent = {};
  const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };

  const rowByPop = {};
  for (let r = 1; r < d.length; r++) {
    const row = d[r];
    if (!row) continue;
    const pop = String(row[c.pop] || '').trim();
    if (!/^POP-\d+$/.test(pop)) continue;
    rowByPop[pop] = { row, sheetRow: r + 1 };
    parent[pop] = pop;
  }
  const popIdOf = v => { const m = String(v || '').match(/POP-\d+/); return m ? m[0] : null; };

  // Kin edge 3: co-residents of couple/family-type households (+ HH-KEANE canon
  // bypass). Covers the ~380 pre-S318 marrieds whose SpouseId was never recorded
  // but who share a household row. 'single'-type and unknown households add no
  // edges — no invented kinship.
  const hh = await sheets.getRawSheetData('Household_Ledger');
  const hi = n => hh[0].indexOf(n);
  const kinType = {};
  for (const r of hh.slice(1)) {
    if (!r || !r[hi('HouseholdId')]) continue;
    const t = String(r[hi('HouseholdType')] || '');
    kinType[String(r[hi('HouseholdId')]).trim()] = (t === 'couple' || t === 'family');
  }
  const iHH2 = i('HouseholdId');
  const byHousehold = {};
  for (const [pop, { row }] of Object.entries(rowByPop)) {
    const h = String(row[iHH2] || '').trim();
    if (h && (kinType[h] || h === 'HH-KEANE')) (byHousehold[h] = byHousehold[h] || []).push(pop);
  }
  for (const members of Object.values(byHousehold)) {
    for (let k = 1; k < members.length; k++) union(members[0], members[k]);
  }

  for (const [pop, { row }] of Object.entries(rowByPop)) {
    let pids = [];
    try { pids = JSON.parse(String(row[c.parents] || '[]')); } catch (e) { pids = []; }
    let kids = [];
    try { kids = JSON.parse(String(row[c.children] || '[]')); } catch (e) { kids = []; }
    for (const p of [...pids, ...kids].map(popIdOf)) if (p && rowByPop[p]) union(pop, p);
    const sp = popIdOf(row[c.spouse]);
    if (sp && rowByPop[sp]) union(pop, sp);
  }

  // ── components ──
  const comps = {};
  for (const pop of Object.keys(rowByPop)) (comps[find(pop)] = comps[find(pop)] || []).push(pop);
  const lines = Object.values(comps).filter(m => m.length >= 2);

  // Generations = 1 + longest parent->child chain within the component.
  const depthOf = (members) => {
    const set = new Set(members);
    const memo = {};
    const depth = (pop, seen) => {
      if (memo[pop] !== undefined) return memo[pop];
      if (seen.has(pop)) return 1; // cycle guard — bad data, bounded
      seen.add(pop);
      let kids = [];
      try { kids = JSON.parse(String(rowByPop[pop].row[c.children] || '[]')); } catch (e) { kids = []; }
      let best = 0;
      for (const kRaw of kids.map(popIdOf)) if (kRaw && set.has(kRaw)) best = Math.max(best, depth(kRaw, seen));
      seen.delete(pop);
      memo[pop] = 1 + best;
      return memo[pop];
    };
    return Math.max(...members.map(m => depth(m, new Set())));
  };

  // Founder = earliest BirthYear, ties -> lowest POPID. FamilyName = modal surname.
  const describe = (members) => {
    let founder = null, fBirth = Infinity;
    const surnames = {};
    let living = 0, totalNW = 0, civ = 0, fame = 0;
    for (const m of members) {
      const row = rowByPop[m].row;
      const by = num(row[c.birth]) ?? 9999;
      if (by < fBirth || (by === fBirth && (!founder || m < founder))) { fBirth = by; founder = m; }
      const ln = String(row[c.last] || '').trim();
      if (ln) surnames[ln] = (surnames[ln] || 0) + 1;
      const st = String(row[c.status] || 'active').toLowerCase();
      if (st !== 'deceased') {
        living++;
        totalNW += num(row[c.nw]) || 0;
        if (String(row[c.civ] || '').toLowerCase() === 'yes') civ++;
        if ((num(row[c.usage]) || 0) >= 5) fame++;
      }
    }
    const familyName = Object.entries(surnames).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
    return { founder, familyName, living, totalNW, civ, fame };
  };

  // Keane line first (POP-00001), then deterministic founder-POPID order.
  const keaneRoot = rowByPop['POP-00001'] ? find('POP-00001') : null;
  lines.sort((a, b) => {
    const ka = a.includes('POP-00001') ? 0 : 1, kb = b.includes('POP-00001') ? 0 : 1;
    if (ka !== kb) return ka - kb;
    const fa = describe(a).founder, fb = describe(b).founder;
    return fa < fb ? -1 : 1;
  });

  const hlRows = [], slUpdates = [];
  let linN = 0;
  for (const members of lines) {
    const linId = 'LIN-' + String(++linN).padStart(5, '0');
    const info = describe(members);
    members.sort();
    hlRows.push([linId, info.familyName, info.founder, cycle, depthOf(members),
      info.living, JSON.stringify(members), 0, 'Founding', info.totalNW,
      0, '[]', info.civ, info.fame, cycle]);
    for (const m of members) slUpdates.push({ pop: m, sheetRow: rowByPop[m].sheetRow, linId });
  }

  console.log(`cycle=${cycle} simYear=${simYear} | citizens=${Object.keys(rowByPop).length} | components>=2: ${lines.length} | members covered: ${slUpdates.length}`);
  console.log('LIN-00001:', JSON.stringify(hlRows[0]?.slice(0, 7)));
  hlRows.slice(1, 6).forEach(r => console.log(' ', r[0], r[1], 'founder', r[2], 'gen', r[4], 'living', r[5]));
  const gens = {};
  hlRows.forEach(r => gens[r[4]] = (gens[r[4]] || 0) + 1);
  console.log('generation distribution:', JSON.stringify(gens));
  if (keaneRoot === null) console.log('WARN: POP-00001 not found');

  if (!APPLY) { console.log('(dry-run — pass --apply to write)'); return; }

  // 1. LineageId column on SL
  let iLin = i('LineageId');
  if (iLin < 0) {
    await sheets.resizeSheet('Simulation_Ledger', H.length + 1, null); // grid is exactly-52-col; grow before append
    await sheets.appendColumns('Simulation_Ledger', 1, H.length, ['LineageId']);
    iLin = H.length;
    console.log(`LineageId column appended at ${L(iLin)}`);
  }
  // 2. Heritage_Ledger tab
  const tabs = await sheets.listSheets();
  if (!tabs.includes(HL_TAB)) {
    await sheets.createSheet(HL_TAB, HL_HEADERS);
    console.log(`${HL_TAB} created`);
  }
  await sheets.appendRows(HL_TAB, hlRows);
  // 3. member LineageId writes
  const ups = slUpdates.map(u => ({ range: `Simulation_Ledger!${L(iLin)}${u.sheetRow}`, values: [[u.linId]] }));
  for (let k = 0; k < ups.length; k += 100) await sheets.batchUpdate(ups.slice(k, k + 100));

  // read-back
  const hlAfter = await sheets.getRawSheetData(HL_TAB);
  const slAfter = await sheets.getRawSheetData('Simulation_Ledger');
  let bad = 0;
  for (const u of slUpdates) if (String(slAfter[u.sheetRow - 1][iLin]) !== u.linId) bad++;
  console.log(`read-back: ${HL_TAB} rows=${hlAfter.length - 1} (want ${hlRows.length}); SL LineageId mismatches=${bad}`);
  if (bad || hlAfter.length - 1 < hlRows.length) process.exit(1);
  console.log('T1 SEED CLEAN');
}

main().catch(e => { console.error(e.stack || e); process.exit(1); });
