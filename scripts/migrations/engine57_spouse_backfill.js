/**
 * engine.57 P3 — spouse/family backfill migration (COMMITTED, reproducible).
 *
 * Runs identically on any sheet: SANDBOX rehearsal then LIVE. Parameterized:
 *   node engine57_spouse_backfill.js --sheet-id <ID>            # dry run
 *   node engine57_spouse_backfill.js --sheet-id <ID> --apply    # execute
 *
 * Three buckets (S318, Mike-approved; canon rulings are character facts,
 * data-state-independent):
 *   A. LINK real on-ledger canon couples (hand-specified pairs)
 *   B. CANON SINGLE rulings (Mara Vance, Sarah Corliss, AJ Dybantsa)
 *   C. GENERIC BACKFILL from Generic_Citizens (opposite sex, age +/-8, nbhd pref)
 *
 * Mike Paulson (POP-00527) is EXCLUDED from all buckets by standing rule.
 * Requires: Simulation_Ledger col SpouseId present; Generic_Citizens Sex col.
 * Every write resolved by HEADER NAME; dry-run prints all planned writes.
 */
const sheets = require('../../lib/sheets.js');

const sheetIdArg = process.argv.find(a => a.startsWith('--sheet-id='));
const SHEET_ID = sheetIdArg ? sheetIdArg.split('=')[1]
  : (process.argv.includes('--sheet-id') ? process.argv[process.argv.indexOf('--sheet-id') + 1] : null);
if (!SHEET_ID) { console.error('--sheet-id required'); process.exit(1); }
process.env.GODWORLD_SHEET_ID = SHEET_ID;
const APPLY = process.argv.includes('--apply');
const CYCLE = 101;

// Bucket A — canon couples, hand-specified. Each entry drives a bespoke repair.
const COUPLES = [
  { a: 'POP-00001', b: 'POP-00002', targetHH: 'HH-KEANE', dissolveHH: 'HH-0084-005', createHH: true },   // Vinnie + Amara
  { a: 'POP-00005', b: 'POP-00594', targetHH: 'HH-0084-001', reactivate: true },                          // Mags + Robert
  { a: 'POP-00514', b: 'POP-00943', targetHH: 'HH-0084-358', joinB: true },                               // Vincent + Pilar
  { a: 'POP-00018', b: 'POP-00742', targetHH: 'HH-0084-004', joinA: true, hasChild: true },               // Benji + Maya (+son)
];

// Bucket B — canon single rulings.
const SINGLES = ['POP-00507', 'POP-00595', 'POP-01024'];

// Bucket C — genuinely no on-ledger partner -> generic pool spouse.
const BACKFILL = ['POP-00004', 'POP-00023', 'POP-00024', 'POP-00031', 'POP-00035',
  'POP-00037', 'POP-00038', 'POP-00040', 'POP-00231', 'POP-00509', 'POP-00528',
  'POP-00536', 'POP-00591'];

const GENERIC_SPOUSE_INCOME = 48000;

function L(i) { return sheets.columnIndexToLetter(i); }

(async () => {
  const sl = await sheets.getSheetData('Simulation_Ledger');
  const sh = sl[0]; const si = n => sh.indexOf(n);
  const iPop = si('POPID'), iF = si('First'), iL = si('Last'), iTier = si('Tier'),
        iRole = si('RoleType'), iStatus = si('Status'), iBirth = si('BirthYear'),
        iCity = si('OrginCity'), iClock = si('ClockMode'), iNbhd = si('Neighborhood'),
        iHH = si('HouseholdId'), iMar = si('MaritalStatus'), iInc = si('Income'),
        iSp = si('SpouseId'), iGen = si('Gender'), iLife = si('LifeHistory');
  if (iSp < 0) { console.error('ABORT: SpouseId column missing on target sheet'); process.exit(1); }

  const rowOf = {}, P = {};
  sl.forEach((r, k) => { if (k > 0) { rowOf[r[iPop]] = k + 1; P[r[iPop]] = r; } });
  const nm = id => P[id] ? `${P[id][iF]} ${P[id][iL]}`.trim() : id;
  const age = id => { const by = P[id] ? Number(P[id][iBirth]) || 0 : 0; return by > 0 ? (2042 - by) : 0; };

  const hh = await sheets.getSheetData('Household_Ledger');
  const hhh = hh[0]; const hi = n => hhh.indexOf(n);
  const cId = hi('HouseholdId'), cHead = hi('HeadOfHousehold'), cType = hi('HouseholdType'),
        cMem = hi('Members'), cNbhd = hi('Neighborhood'), cHType = hi('HousingType'),
        cRent = hi('MonthlyRent'), cCost = hi('HousingCost'), cInc = hi('HouseholdIncome'),
        cFormed = hi('FormedCycle'), cDiss = hi('DissolvedCycle'), cStat = hi('Status');
  const hhRowOf = {};
  hh.forEach((r, k) => { if (k > 0) hhRowOf[r[cId]] = k + 1; });

  const RENT = { 'Rockridge': 2400, 'Piedmont Ave': 2200, 'Lake Merritt': 2000, 'Temescal': 1900,
    'Uptown': 1850, 'Downtown': 1800, 'Jack London': 1750, 'KONO': 1700, 'Laurel': 1650,
    'Fruitvale': 1500, 'West Oakland': 1450, 'Chinatown': 1600 };

  const updates = [];           // {range, values}
  const newHHRows = [];         // full Household_Ledger rows to append
  const regRows = [];           // Family_Relationships rows
  const genUpdates = [];        // Generic_Citizens status marks
  const newSLRows = [];         // promoted spouse citizen rows
  const log = [];

  const hhVals = obj => { const hHead = hhh; return hHead.map(h => obj.hasOwnProperty(h) ? obj[h] : ''); };

  // ---------- Bucket A: link canon couples ----------
  for (const c of COUPLES) {
    const aName = nm(c.a), bName = nm(c.b);
    const aGen = (P[c.a][iGen] || '').toLowerCase(), incA = Number(P[c.a][iInc]) || 0, incB = Number(P[c.b][iInc]) || 0;
    const nbhd = P[c.a][iNbhd] || P[c.b][iNbhd];
    // SL: both married + SpouseId both ways; both point at targetHH
    updates.push({ range: `Simulation_Ledger!${L(iMar)}${rowOf[c.a]}`, values: [['married']] });
    updates.push({ range: `Simulation_Ledger!${L(iMar)}${rowOf[c.b]}`, values: [['married']] });
    updates.push({ range: `Simulation_Ledger!${L(iSp)}${rowOf[c.a]}`, values: [[c.b + ' ' + bName]] });
    updates.push({ range: `Simulation_Ledger!${L(iSp)}${rowOf[c.b]}`, values: [[c.a + ' ' + aName]] });
    updates.push({ range: `Simulation_Ledger!${L(iHH)}${rowOf[c.a]}`, values: [[c.targetHH]] });
    updates.push({ range: `Simulation_Ledger!${L(iHH)}${rowOf[c.b]}`, values: [[c.targetHH]] });

    const combined = incA + incB;
    if (c.createHH) {
      newHHRows.push(hhVals({ HouseholdId: c.targetHH, HeadOfHousehold: c.a, HouseholdType: 'couple',
        Members: JSON.stringify([c.a, c.b]), Neighborhood: nbhd, HousingType: 'owned',
        MonthlyRent: RENT[nbhd] || 1700, HousingCost: 0, HouseholdIncome: combined,
        FormedCycle: CYCLE, DissolvedCycle: '', Status: 'active' }));
      if (c.dissolveHH && hhRowOf[c.dissolveHH]) {
        updates.push({ range: `Household_Ledger!${L(cStat)}${hhRowOf[c.dissolveHH]}`, values: [['dissolved']] });
        updates.push({ range: `Household_Ledger!${L(cDiss)}${hhRowOf[c.dissolveHH]}`, values: [[CYCLE]] });
      }
    } else if (hhRowOf[c.targetHH]) {
      const hr = hhRowOf[c.targetHH];
      let mem = []; try { mem = JSON.parse(hh[hr - 1][cMem] || '[]'); } catch (e) {}
      if (!mem.includes(c.a)) mem.push(c.a);
      if (!mem.includes(c.b)) mem.push(c.b);
      updates.push({ range: `Household_Ledger!${L(cMem)}${hr}`, values: [[JSON.stringify(mem)]] });
      updates.push({ range: `Household_Ledger!${L(cInc)}${hr}`, values: [[combined]] });
      updates.push({ range: `Household_Ledger!${L(cType)}${hr}`, values: [[c.hasChild ? 'family' : 'couple']] });
      if (c.reactivate) {
        updates.push({ range: `Household_Ledger!${L(cStat)}${hr}`, values: [['active']] });
        updates.push({ range: `Household_Ledger!${L(cDiss)}${hr}`, values: [['']] });
      }
    }
    const husband = aGen === 'male' ? (c.a + ' ' + aName) : (c.b + ' ' + bName);
    const wife = aGen === 'male' ? (c.b + ' ' + bName) : (c.a + ' ' + aName);
    const reg = [c.targetHH, husband, wife, 'married', CYCLE, 'active', '', '', '', '', ''];
    if (c.hasChild) reg[6] = 'POP-00743 Rick Dillon';
    regRows.push(reg);
    log.push(`LINK  ${c.a} ${aName} <-> ${c.b} ${bName}  hh=${c.targetHH} inc=${combined}${c.createHH ? ' (HH created' + (c.dissolveHH ? ', ' + c.dissolveHH + ' dissolved)' : ')') : c.reactivate ? ' (reactivated)' : ''}`);
  }

  // ---------- Bucket B: canon singles ----------
  for (const id of SINGLES) {
    updates.push({ range: `Simulation_Ledger!${L(iMar)}${rowOf[id]}`, values: [['single']] });
    updates.push({ range: `Simulation_Ledger!${L(iSp)}${rowOf[id]}`, values: [['']] });
    const hid = String(P[id][iHH] || '').trim();
    if (hid && hhRowOf[hid]) {
      updates.push({ range: `Household_Ledger!${L(cStat)}${hhRowOf[hid]}`, values: [['dissolved']] });
      updates.push({ range: `Household_Ledger!${L(cDiss)}${hhRowOf[hid]}`, values: [[CYCLE]] });
      updates.push({ range: `Simulation_Ledger!${L(iHH)}${rowOf[id]}`, values: [['']] });
    }
    log.push(`SINGLE ${id} ${nm(id)}${hid ? ' (dissolve ' + hid + ')' : ''}`);
  }

  // ---------- Bucket C: generic backfill ----------
  const gc = await sheets.getSheetData('Generic_Citizens');
  const gh = gc[0]; const ggi = n => gh.indexOf(n);
  const gF = ggi('First'), gL = ggi('Last'), gAge = ggi('Age'), gBirth = ggi('BirthYear'),
        gNbhd = ggi('Neighborhood'), gOcc = ggi('Occupation'), gStat = ggi('Status'), gSex = ggi('Sex');
  const pool = [];
  gc.forEach((r, k) => {
    if (k === 0) return;
    if (String(r[gStat]).toLowerCase() !== 'active') return;
    const sx = (r[gSex] || '').toLowerCase(); if (sx !== 'male' && sx !== 'female') return;
    const a = Number(r[gAge]) || (Number(r[gBirth]) ? 2042 - Number(r[gBirth]) : 0);
    pool.push({ k, first: r[gF], last: r[gL], sex: sx, age: a, nbhd: r[gNbhd], occ: r[gOcc], used: false });
  });

  let maxN = 0;
  sl.forEach(r => { const m = /^POP-(\d+)$/.exec(r[iPop] || ''); if (m && +m[1] > maxN) maxN = +m[1]; });

  for (const id of BACKFILL) {
    const cSex = (P[id][iGen] || '').toLowerCase();
    const want = cSex === 'male' ? 'female' : 'male';
    const cAge = age(id), cNbhd = P[id][iNbhd];
    const cand = pool.filter(p => !p.used && p.sex === want && Math.abs(p.age - cAge) <= 8);
    cand.sort((x, y) => {
      const xs = (x.nbhd === cNbhd ? 0 : 1), ys = (y.nbhd === cNbhd ? 0 : 1);
      if (xs !== ys) return xs - ys;
      return Math.abs(x.age - cAge) - Math.abs(y.age - cAge);
    });
    const pick = cand[0];
    if (!pick) { log.push(`BACKFILL ${id} ${nm(id)} — NO CANDIDATE (${want}, age~${cAge})`); continue; }
    pick.used = true;
    maxN++;
    const spId = 'POP-' + String(maxN).padStart(5, '0');
    const spName = `${pick.first} ${pick.last}`.trim();
    const hid = String(P[id][iHH] || '').trim();

    // promoted spouse SL row
    const row = new Array(sh.length).fill('');
    const set = (i, v) => { if (i >= 0) row[i] = v; };
    set(iPop, spId); set(iF, pick.first); set(iL, pick.last); set(iTier, 3);
    set(iRole, pick.occ); set(iClock, 'ENGINE'); set(iStatus, 'Active');
    set(iBirth, 2042 - pick.age); set(iCity, 'Oakland'); set(iNbhd, cNbhd);
    set(iMar, 'married'); set(iInc, GENERIC_SPOUSE_INCOME); set(iGen, pick.sex);
    set(iSp, id + ' ' + nm(id));
    set(iLife, `Y3C29 — [Family] The record catches up: married to ${nm(id)}, at home in ${cNbhd}.`);

    let targetHH = hid;
    if (targetHH) { set(iHH, targetHH); } // spouse joins existing household
    newSLRows.push(row);

    updates.push({ range: `Simulation_Ledger!${L(iSp)}${rowOf[id]}`, values: [[spId + ' ' + spName]] });

    if (targetHH && hhRowOf[targetHH]) {
      const hr = hhRowOf[targetHH];
      let mem = []; try { mem = JSON.parse(hh[hr - 1][cMem] || '[]'); } catch (e) {}
      if (!mem.includes(spId)) mem.push(spId);
      updates.push({ range: `Household_Ledger!${L(cMem)}${hr}`, values: [[JSON.stringify(mem)]] });
      updates.push({ range: `Household_Ledger!${L(cInc)}${hr}`, values: [[(Number(P[id][iInc]) || 0) + GENERIC_SPOUSE_INCOME]] });
    } else {
      // no household — marriage forms it
      targetHH = 'HH-' + String(CYCLE).padStart(4, '0') + '-B' + String(maxN).slice(-3);
      newHHRows.push(hhVals({ HouseholdId: targetHH, HeadOfHousehold: id, HouseholdType: 'couple',
        Members: JSON.stringify([id, spId]), Neighborhood: cNbhd, HousingType: 'rented',
        MonthlyRent: RENT[cNbhd] || 1700, HousingCost: 0,
        HouseholdIncome: (Number(P[id][iInc]) || 0) + GENERIC_SPOUSE_INCOME,
        FormedCycle: CYCLE, DissolvedCycle: '', Status: 'active' }));
      updates.push({ range: `Simulation_Ledger!${L(iHH)}${rowOf[id]}`, values: [[targetHH]] });
      row[iHH] = targetHH;
    }

    const cSexM = cSex === 'male';
    const husband = cSexM ? (id + ' ' + nm(id)) : (spId + ' ' + spName);
    const wife = cSexM ? (spId + ' ' + spName) : (id + ' ' + nm(id));
    regRows.push([targetHH, husband, wife, 'married', CYCLE, 'active', '', '', '', '', '']);
    genUpdates.push({ range: `Generic_Citizens!${L(gStat)}${pick.k + 1}`, values: [['Promoted']] });
    log.push(`BACKFILL ${id} ${nm(id)} (${cSex},${cAge}) + ${spId} ${spName} (${pick.sex},${pick.age},${pick.occ}) hh=${targetHH}`);
  }

  // ---------- report ----------
  console.log('=== engine.57 P3 spouse backfill — ' + (APPLY ? 'APPLY' : 'DRY RUN') + ' on ' + SHEET_ID.slice(0, 10) + '... ===\n');
  log.forEach(l => console.log(l));
  console.log(`\nTotals: ${newSLRows.length} new spouse rows, ${newHHRows.length} new households, ${updates.length} cell updates, ${regRows.length} register rows, ${genUpdates.length} pool marks`);
  if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); return; }

  if (newSLRows.length) await sheets.appendRows('Simulation_Ledger', newSLRows);
  if (newHHRows.length) await sheets.appendRows('Household_Ledger', newHHRows);
  const allCell = updates.concat(genUpdates);
  for (let i = 0; i < allCell.length; i += 400) await sheets.batchUpdate(allCell.slice(i, i + 400));

  // Family_Relationships: REBUILD to the designed schema (Mike's format) —
  // the copied tab carried the bare RelationshipId/Citizen1/Citizen2 schema.
  // Clear all rows, set designed header, write generated register rows.
  const REG_HEADER = ['HouseholdId', 'Husband', 'Wife', 'RelationshipType', 'SinceCycle',
    'Status', 'Child1', 'Child2', 'Child3', 'Child4', 'Child5'];
  const fOld = await sheets.getSheetData('Family_Relationships');
  const wipeRows = Math.max(fOld.length, regRows.length + 1);
  const blank = [];
  for (let i = 0; i < wipeRows; i++) blank.push(new Array(REG_HEADER.length).fill(''));
  await sheets.updateRangeByPosition('Family_Relationships', 1, 0, blank); // clear old grid
  const regGrid = [REG_HEADER].concat(regRows);
  await sheets.updateRangeByPosition('Family_Relationships', 1, 0, regGrid);
  console.log('\nAPPLIED. Verifying...');

  const sl2 = await sheets.getSheetData('Simulation_Ledger');
  const sp2 = sl2[0].indexOf('SpouseId');
  const linked = sl2.slice(1).filter(r => String(r[sp2] || '').trim()).length;
  console.log(`VERIFY: SL rows with SpouseId set = ${linked}; total rows = ${sl2.length - 1}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
