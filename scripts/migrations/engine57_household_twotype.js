// engine.57 Phase 2 migration — SANDBOX ONLY. Two-type Household_Ledger.
// Dry-run by default; --apply executes. Every write resolved by HEADER NAME
// at runtime, printed before executing (S318 dry-echo guard).
process.env.GODWORLD_SHEET_ID = '1wmZTGqIbYL7eVYCplq3iCb2oOGDZ0Inq-pWCtnD1lzc'; // SANDBOX
const sheets = require('/root/GodWorld/lib/sheets.js');

const APPLY = process.argv.includes('--apply');
const CYCLE = 101;
const GENERIC_SPOUSE_SALARY = 48000;

(async () => {
  const sl = await sheets.getSheetData('Simulation_Ledger');
  const sh = sl[0];
  const si = (n) => sh.indexOf(n);
  const iPop = si('POPID'), iMarital = si('MaritalStatus'), iHHId = si('HouseholdId'), iIncome = si('Income');
  if (iPop < 0 || iMarital < 0 || iHHId < 0 || iIncome < 0) throw new Error('SL columns missing');

  const marital = {}, income = {}, slRowByPop = {};
  sl.slice(1).forEach((r, k) => {
    marital[r[iPop]] = String(r[iMarital] || '').toLowerCase().trim();
    income[r[iPop]] = Number(r[iIncome]) || 0;
    slRowByPop[r[iPop]] = k + 2; // 1-indexed sheet row
  });

  const hh = await sheets.getSheetData('Household_Ledger');
  const hhh = hh[0];
  const hi = (n) => hhh.indexOf(n);
  const cId = hi('HouseholdId'), cHead = hi('HeadOfHousehold'), cType = hi('HouseholdType'),
        cMembers = hi('Members'), cIncome = hi('HouseholdIncome'), cDissolved = hi('DissolvedCycle'),
        cStatus = hi('Status'), cCreated = hi('CreatedAt'), cUpdated = hi('LastUpdated');
  if ([cId, cHead, cType, cMembers, cIncome, cDissolved, cStatus].some(x => x < 0)) throw new Error('HH columns missing');

  // Classification
  const convert = [], dissolve = [], trueUp = [];
  for (let r = 1; r < hh.length; r++) {
    const row = hh[r];
    if (String(row[cStatus]).toLowerCase() !== 'active') continue;
    let members = [];
    try { members = JSON.parse(row[cMembers] || '[]'); } catch (e) {}
    if (!Array.isArray(members)) members = [];
    const head = row[cHead];
    const sheetRow = r + 1;

    if (members.length <= 1) {
      const m = marital[head] || '';
      if (m === 'married') {
        const inc = (income[members[0] || head] || 0) + GENERIC_SPOUSE_SALARY;
        convert.push({ sheetRow, id: row[cId], head, newIncome: inc });
      } else {
        dissolve.push({ sheetRow, id: row[cId], head, maritalOfHead: m, popRow: slRowByPop[head] });
      }
    } else {
      const inc = members.reduce((s, p) => s + (income[p] || 0), 0);
      trueUp.push({ sheetRow, id: row[cId], newIncome: inc, memberCount: members.length });
    }
  }

  console.log(`Classification of active households:`);
  console.log(`  CONVERT to couple (+$${GENERIC_SPOUSE_SALARY} spouse): ${convert.length}`);
  console.log(`  DISSOLVE (head not married): ${dissolve.length}`);
  console.log(`  TRUE-UP multi-member income: ${trueUp.length}`);
  console.log(`Samples — convert: ${convert.slice(0, 3).map(x => `${x.id}(${x.head}→$${x.newIncome})`).join(', ')}`);
  console.log(`Samples — dissolve: ${dissolve.slice(0, 3).map(x => `${x.id}(${x.head}:${x.maritalOfHead})`).join(', ')}`);
  console.log(`Samples — trueUp: ${trueUp.slice(0, 3).map(x => `${x.id}($${x.newIncome},${x.memberCount}m)`).join(', ')}`);
  console.log(`Clock columns to delete (0-idx): CreatedAt=${cCreated}, LastUpdated=${cUpdated}`);

  if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); return; }

  // ── APPLY ──
  const L = sheets.columnIndexToLetter;
  const updates = [];
  for (const c of convert) {
    updates.push({ range: `Household_Ledger!${L(cType)}${c.sheetRow}`, values: [['couple']] });
    updates.push({ range: `Household_Ledger!${L(cIncome)}${c.sheetRow}`, values: [[c.newIncome]] });
  }
  for (const d of dissolve) {
    updates.push({ range: `Household_Ledger!${L(cStatus)}${d.sheetRow}`, values: [['dissolved']] });
    updates.push({ range: `Household_Ledger!${L(cDissolved)}${d.sheetRow}`, values: [[CYCLE]] });
    if (d.popRow) updates.push({ range: `Simulation_Ledger!${L(iHHId)}${d.popRow}`, values: [['']] });
  }
  for (const t of trueUp) {
    updates.push({ range: `Household_Ledger!${L(cIncome)}${t.sheetRow}`, values: [[t.newIncome]] });
  }
  console.log(`\nAPPLY: ${updates.length} cell writes (first 3: ${updates.slice(0, 3).map(u => u.range).join(', ')})`);
  // batch in chunks of 500
  for (let i = 0; i < updates.length; i += 500) {
    await sheets.batchUpdate(updates.slice(i, i + 500));
    console.log(`  batch ${1 + i / 500} done`);
  }

  // Clock columns: delete higher index first so the lower doesn't shift
  if (cCreated >= 0 && cUpdated >= 0) {
    const hi1 = Math.max(cCreated, cUpdated), lo = Math.min(cCreated, cUpdated);
    console.log(`Deleting Household_Ledger columns idx ${hi1} then ${lo}`);
    await sheets.deleteColumn('Household_Ledger', hi1);
    await sheets.deleteColumn('Household_Ledger', lo);
  }

  // ── VERIFY ──
  const hh2 = await sheets.getSheetData('Household_Ledger');
  const h2 = hh2[0];
  const v = (n) => h2.indexOf(n);
  const vStatus = v('Status'), vType = v('HouseholdType'), vMembers = v('Members');
  let active = 0, singleActive = 0, coupleOne = 0;
  hh2.slice(1).forEach(r => {
    if (String(r[vStatus]).toLowerCase() !== 'active') return;
    active++;
    let m = []; try { m = JSON.parse(r[vMembers] || '[]'); } catch (e) {}
    if (String(r[vType]) === 'single') singleActive++;
    if (String(r[vType]) === 'couple' && m.length === 1) coupleOne++;
  });
  const sl2 = await sheets.getSheetData('Simulation_Ledger');
  const cleared = sl2.slice(1).filter(r => !String(r[iHHId] ) || !String(r[iHHId]).trim()).length;
  console.log(`\nVERIFY: headers now [${h2.join(',')}]`);
  console.log(`VERIFY: active=${active}, active 'single' type=${singleActive} (expect 0), couple-with-1-member=${coupleOne}`);
  console.log(`VERIFY: SL citizens with empty HouseholdId=${cleared}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
