// marriage_realization.js — S322: make the record's marriages real.
//
// Audit (S322, marriage_audit_report.json): ~90% of married citizens carry
// MaritalStatus=married with NO SpouseId — the label was minted by the intake
// CDF with no partner ever created. The links that DO exist are perfectly
// clean (0 malformed / 0 dangling / 100% symmetric), so this is coverage debt,
// not an integrity bug. Mike-direct S322: "get all married citizens identified
// and into a household."
//
// Per sheet (bench and live run independently — their row sets have diverged):
//   1. PAIR unlinked married adults with each other: same neighborhood first,
//      then citywide; opposite gender (engine convention), age gap <= 12,
//      greedy closest-age, deterministic (sorted inputs, POPID tiebreak).
//   2. HOUSEHOLD each pair: join the elder partner's active household if one
//      exists (type -> couple, income summed, members appended); else mint
//      HH-M<cycle>-<seq>. Cross-neighborhood pair: the partner without an
//      active household relocates (Neighborhood updated + noted in the line).
//   3. SpouseId written BOTH ways ("POP-xxxxx First Last" convention);
//      LifeHistory stamped on both ("The record catches up: married to ...").
//   4. REMAINDER (no compatible partner in the married pool): promote a spouse
//      from Generic_Citizens (bondEngine GC-lottery conventions: takes the
//      citizen's surname, MaidenName keeps the GC family name, full derived
//      economic profile via lib/citizenDerivation, income 48000 = the
//      engine's off-camera spouse rate, Tier 4, ENGINE clock).
//   5. Missing-gender citizens get deriveGender first, then enter the pool.
//
// Heritage: no direct writes — updateHeritage_ founds/joins lines from these
// pairs on the next fire (shared-surname OR shared-household founding rule).
//
// Usage: node marriage_realization.js --sheet-id=<id> [--apply]

const sheets = require('/root/GodWorld/lib/sheets.js');
const cd = require('/root/GodWorld/lib/citizenDerivation.js');

const sheetIdArg = process.argv.find(a => a.startsWith('--sheet-id='));
const SHEET_ID = sheetIdArg ? sheetIdArg.split('=')[1] : null;
if (!SHEET_ID) { console.error('--sheet-id required'); process.exit(1); }
process.env.GODWORLD_SHEET_ID = SHEET_ID;
const APPLY = process.argv.includes('--apply');
const SPOUSE_INCOME = 48000;
const MAX_AGE_GAP = 12;

function num(v) { const n = Number(String(v ?? '').replace(/[$,\s]/g, '')); return isNaN(n) ? null : n; }
function blank(v) { return v === null || v === undefined || String(v).trim() === ''; }
const L = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

async function main() {
  const cal = await sheets.getRawSheetData('Simulation_Calendar');
  const calLast = cal.filter(r => r && num(r[0]) !== null).pop();
  const cycle = Number((String(calLast[5] || '').match(/Abs:\s*(\d+)/) || [])[1] || 0);
  const simYear = 2040 + num(calLast[0]);
  const stamp = 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1);

  const sl = await sheets.getRawSheetData('Simulation_Ledger');
  const H = sl[0];
  const i = n => H.indexOf(n);
  const c = { pop: i('POPID'), first: i('First'), last: i('Last'), maiden: i('MaidenName'),
    tier: i('Tier'), role: i('RoleType'), clock: i('ClockMode'), status: i('Status'),
    birth: i('BirthYear'), city: i('OrginCity'), nbhd: i('Neighborhood'), hh: i('HouseholdId'),
    mar: i('MaritalStatus'), inc: i('Income'), gen: i('Gender'), sp: i('SpouseId'),
    life: i('LifeHistory'), years: i('YearsInCareer'), stage: i('CareerStage'),
    edu: i('EducationLevel'), debt: i('DebtLevel'), nw: i('NetWorth'), usage: i('UsageCount') };

  const hh = await sheets.getRawSheetData('Household_Ledger');
  const hhH = hh[0];
  const has = {};
  hhH.forEach((n, k) => has[n] = k);
  const hhById = {};
  for (let r = 1; r < hh.length; r++) {
    const id = String(hh[r][has.HouseholdId] || '').trim();
    if (id) hhById[id] = { row: hh[r], sheetRow: r + 1 };
  }

  // ── eligible pool ──
  const pool = [];
  let maxPop = 0;
  for (let r = 1; r < sl.length; r++) {
    const row = sl[r];
    if (!row || blank(row[c.pop])) continue;
    const pm = /^POP-(\d+)$/.exec(String(row[c.pop]).trim());
    if (pm && +pm[1] > maxPop) maxPop = +pm[1];
    if (String(row[c.status] || 'active').toLowerCase() === 'deceased') continue;
    if (String(row[c.mar] || '').toLowerCase() !== 'married') continue;
    if (!blank(row[c.sp])) continue;
    const by = num(row[c.birth]);
    const age = by ? simYear - by : null;
    if (age === null || age < 18) continue;
    let gender = String(row[c.gen] || '').toLowerCase();
    if (gender !== 'male' && gender !== 'female') {
      gender = cd.deriveGender(`${row[c.first]}|${row[c.last]}|${row[c.pop]}`, String(row[c.nbhd] || '').trim());
    }
    pool.push({ pop: String(row[c.pop]).trim(), sheetRow: r + 1, row, age, gender,
      nbhd: String(row[c.nbhd] || '').trim(), hhId: String(row[c.hh] || '').trim(),
      name: `${String(row[c.first] || '').trim()} ${String(row[c.last] || '').trim()}` });
  }
  pool.sort((a, b) => a.pop < b.pop ? -1 : 1);

  // ── greedy pairing: same neighborhood, then citywide ──
  const paired = [];
  const matchIn = (cands) => {
    const males = cands.filter(x => x.gender === 'male' && !x.matched).sort((a, b) => b.age - a.age || (a.pop < b.pop ? -1 : 1));
    const females = cands.filter(x => x.gender === 'female' && !x.matched).sort((a, b) => b.age - a.age || (a.pop < b.pop ? -1 : 1));
    for (const m of males) {
      let best = null, bestGap = MAX_AGE_GAP + 1;
      for (const f of females) {
        if (f.matched) continue;
        const gap = Math.abs(f.age - m.age);
        if (gap < bestGap || (gap === bestGap && best && f.pop < best.pop)) { best = f; bestGap = gap; }
      }
      if (best && bestGap <= MAX_AGE_GAP) { m.matched = best; best.matched = m; paired.push([m, best]); }
    }
  };
  const byNbhd = {};
  pool.forEach(x => (byNbhd[x.nbhd || '?'] = byNbhd[x.nbhd || '?'] || []).push(x));
  Object.keys(byNbhd).sort().forEach(n => matchIn(byNbhd[n]));
  matchIn(pool); // citywide pass over leftovers
  const remainder = pool.filter(x => !x.matched);

  // ── writes assembly ──
  const updates = [], newHHRows = [], newSLRows = [], gcMarks = [];
  let mintedHH = 0, relocated = 0;
  const spVal = p => `${p.pop} ${p.name}`;
  const lifeAdd = (p, line) => {
    const cur = String(p.row[c.life] || '');
    updates.push({ range: `Simulation_Ledger!${L(c.life)}${p.sheetRow}`, values: [[(cur ? cur + '\n' : '') + stamp + ' — ' + line]] });
  };
  const activeHH = p => p.hhId && hhById[p.hhId] &&
    String(hhById[p.hhId].row[has.Status] || '').toLowerCase() === 'active' ? p.hhId : null;

  const settleHousehold = (a, b) => {
    // elder-preference: keep an existing active household; else mint.
    const [elder, junior] = a.age >= b.age ? [a, b] : [b, a];
    const keep = activeHH(elder) || activeHH(junior);
    const incomeOf = p => num(p.row[c.inc]) || 0;
    if (keep) {
      const holder = activeHH(elder) ? elder : junior;
      const mover = holder === elder ? junior : elder;
      const hRec = hhById[keep];
      updates.push({ range: `Simulation_Ledger!${L(c.hh)}${mover.sheetRow}`, values: [[keep]] });
      if (mover.nbhd !== holder.nbhd) {
        updates.push({ range: `Simulation_Ledger!${L(c.nbhd)}${mover.sheetRow}`, values: [[holder.nbhd]] });
        relocated++;
      }
      if (has.HouseholdType !== undefined && String(hRec.row[has.HouseholdType]) === 'single')
        updates.push({ range: `Household_Ledger!${L(has.HouseholdType)}${hRec.sheetRow}`, values: [['couple']] });
      if (has.Members !== undefined) {
        let mem = [];
        try { mem = JSON.parse(String(hRec.row[has.Members] || '[]')); } catch (e) { mem = []; }
        [holder.pop, mover.pop].forEach(x => { if (!mem.includes(x)) mem.push(x); });
        updates.push({ range: `Household_Ledger!${L(has.Members)}${hRec.sheetRow}`, values: [[JSON.stringify(mem)]] });
      }
      if (has.HouseholdIncome !== undefined) {
        const cur = num(hRec.row[has.HouseholdIncome]) || 0;
        updates.push({ range: `Household_Ledger!${L(has.HouseholdIncome)}${hRec.sheetRow}`, values: [[cur + incomeOf(mover)]] });
      }
      return { hhId: keep, nbhd: holder.nbhd };
    }
    const newId = `HH-M${cycle}-${String(++mintedHH).padStart(3, '0')}`;
    const nrow = new Array(hhH.length).fill('');
    const set = (n, v) => { if (has[n] !== undefined) nrow[has[n]] = v; };
    set('HouseholdId', newId); set('HeadOfHousehold', elder.pop); set('HouseholdType', 'couple');
    set('Members', JSON.stringify([elder.pop, junior.pop])); set('Neighborhood', elder.nbhd);
    set('HousingType', 'apartment'); set('MonthlyRent', 2200);
    set('HouseholdIncome', incomeOf(elder) + incomeOf(junior));
    set('FormedCycle', cycle); set('Status', 'active');
    newHHRows.push(nrow);
    [elder, junior].forEach(p => updates.push({ range: `Simulation_Ledger!${L(c.hh)}${p.sheetRow}`, values: [[newId]] }));
    if (junior.nbhd !== elder.nbhd) {
      updates.push({ range: `Simulation_Ledger!${L(c.nbhd)}${junior.sheetRow}`, values: [[elder.nbhd]] });
      relocated++;
    }
    return { hhId: newId, nbhd: elder.nbhd };
  };

  for (const [a, b] of paired) {
    updates.push({ range: `Simulation_Ledger!${L(c.sp)}${a.sheetRow}`, values: [[spVal(b)]] });
    updates.push({ range: `Simulation_Ledger!${L(c.sp)}${b.sheetRow}`, values: [[spVal(a)]] });
    const home = settleHousehold(a, b);
    lifeAdd(a, `[Family] The record catches up: married to ${b.name}, at home in ${home.nbhd}.`);
    lifeAdd(b, `[Family] The record catches up: married to ${a.name}, at home in ${home.nbhd}.`);
  }

  // ── remainder: promote a spouse from Generic_Citizens ──
  const gc = await sheets.getRawSheetData('Generic_Citizens');
  const gh = gc[0]; const gi = n => gh.indexOf(n);
  const gF = gi('First'), gL = gi('Last'), gAge = gi('Age'), gBirth = gi('BirthYear'),
    gNbhd = gi('Neighborhood'), gOcc = gi('Occupation'), gStat = gi('Status'), gSex = gi('Sex');
  const gcPool = [];
  gc.forEach((r, k) => {
    if (k === 0 || !r) return;
    if (String(r[gStat] || '').toLowerCase() !== 'active') return;
    const sx = String(r[gSex] || '').toLowerCase();
    if (sx !== 'male' && sx !== 'female') return;
    const a = num(r[gAge]) ?? (num(r[gBirth]) ? simYear - num(r[gBirth]) : null);
    if (a === null || a < 18) return;
    gcPool.push({ k, first: String(r[gF] || '').trim(), last: String(r[gL] || '').trim(),
      sex: sx, age: a, nbhd: String(r[gNbhd] || '').trim(), occ: String(r[gOcc] || '').trim(), used: false });
  });

  let gcMinted = 0, unmatched = [];
  for (const p of remainder) {
    const want = p.gender === 'male' ? 'female' : 'male';
    const cands = gcPool.filter(x => !x.used && x.sex === want && Math.abs(x.age - p.age) <= MAX_AGE_GAP);
    cands.sort((x, y) => {
      const xs = x.nbhd === p.nbhd ? 0 : 1, ys = y.nbhd === p.nbhd ? 0 : 1;
      if (xs !== ys) return xs - ys;
      return Math.abs(x.age - p.age) - Math.abs(y.age - p.age) || (x.k - y.k);
    });
    const pick = cands[0];
    if (!pick) { unmatched.push(p); continue; }
    pick.used = true;
    const spId = 'POP-' + String(++maxPop).padStart(5, '0');
    const last = String(p.row[c.last] || '').trim();
    const spName = `${pick.first} ${last}`;
    const seed = `${pick.first}|${last}|${spId}`;
    const retired = pick.age >= 65;
    let dYears = cd.deriveYearsInCareer(seed, pick.age, retired ? 'retired' : '');
    if (dYears > Math.max(0, pick.age - 18)) dYears = Math.max(0, pick.age - 18);

    const nrow = new Array(H.length).fill('');
    const set = (ci, v) => { if (ci >= 0) nrow[ci] = v; };
    set(c.pop, spId); set(c.first, pick.first); set(c.last, last);
    if (pick.last && pick.last !== last) set(c.maiden, pick.last);
    set(c.tier, 4); set(c.role, pick.occ || 'Service worker'); set(c.clock, 'ENGINE');
    set(c.status, 'Active'); set(c.birth, simYear - pick.age); set(c.city, 'Oakland');
    set(c.nbhd, p.nbhd || pick.nbhd); set(c.mar, 'married'); set(c.inc, SPOUSE_INCOME);
    set(c.gen, pick.sex); set(c.sp, spVal(p)); set(c.usage, 0);
    set(c.years, dYears);
    set(c.stage, retired ? 'retired' : (dYears >= 5 ? 'mid-career' : 'entry-level'));
    set(c.edu, cd.deriveEducationLevel(seed, p.nbhd, pick.age, null));
    set(c.debt, cd.deriveDebtLevel(seed, pick.age, SPOUSE_INCOME));
    set(c.nw, cd.deriveNetWorth(seed, pick.age, SPOUSE_INCOME, retired ? 'retired' : ''));
    set(c.life, `${stamp} — [Family] The record catches up: met ${p.name} in ${p.nbhd || pick.nbhd}, and stayed.`);
    newSLRows.push(nrow);
    gcMarks.push({ range: `Generic_Citizens!${L(gStat)}${pick.k + 1}`, values: [['Promoted']] });
    gcMinted++;

    updates.push({ range: `Simulation_Ledger!${L(c.sp)}${p.sheetRow}`, values: [[`${spId} ${spName}`]] });
    // household: join p's active household or mint one for the couple
    const keep = activeHH(p);
    if (keep) {
      const hRec = hhById[keep];
      if (has.HouseholdType !== undefined && String(hRec.row[has.HouseholdType]) === 'single')
        updates.push({ range: `Household_Ledger!${L(has.HouseholdType)}${hRec.sheetRow}`, values: [['couple']] });
      if (has.Members !== undefined) {
        let mem = [];
        try { mem = JSON.parse(String(hRec.row[has.Members] || '[]')); } catch (e) { mem = []; }
        [p.pop, spId].forEach(x => { if (!mem.includes(x)) mem.push(x); });
        updates.push({ range: `Household_Ledger!${L(has.Members)}${hRec.sheetRow}`, values: [[JSON.stringify(mem)]] });
      }
      if (has.HouseholdIncome !== undefined) {
        const cur = num(hRec.row[has.HouseholdIncome]) || 0;
        updates.push({ range: `Household_Ledger!${L(has.HouseholdIncome)}${hRec.sheetRow}`, values: [[cur + SPOUSE_INCOME]] });
      }
      set(c.hh, keep);
    } else {
      const newId = `HH-M${cycle}-${String(++mintedHH).padStart(3, '0')}`;
      const hrow = new Array(hhH.length).fill('');
      const hset = (n, v) => { if (has[n] !== undefined) hrow[has[n]] = v; };
      hset('HouseholdId', newId); hset('HeadOfHousehold', p.pop); hset('HouseholdType', 'couple');
      hset('Members', JSON.stringify([p.pop, spId])); hset('Neighborhood', p.nbhd || pick.nbhd);
      hset('HousingType', 'apartment'); hset('MonthlyRent', 2200);
      hset('HouseholdIncome', (num(p.row[c.inc]) || 0) + SPOUSE_INCOME);
      hset('FormedCycle', cycle); hset('Status', 'active');
      newHHRows.push(hrow);
      updates.push({ range: `Simulation_Ledger!${L(c.hh)}${p.sheetRow}`, values: [[newId]] });
      set(c.hh, newId);
    }
    lifeAdd(p, `[Family] The record catches up: married to ${spName}, at home in ${p.nbhd || pick.nbhd}.`);
  }

  // ── unmatchable: the marriage label itself was the intake-CDF fiction —
  // no partner exists or can be honestly promoted (GC female pool is all
  // 18-24; large-gap forced matches are worse canon than a corrected record).
  // Age-honest truing, deterministic, NO LifeHistory line (this corrects a
  // record, it is not an event the citizen lived): 60+ widowed (the spouse
  // predates the record), 40-59 divorced, <40 single.
  let widowed = 0, divorced = 0, singled = 0;
  for (const p of unmatched) {
    const st = p.age >= 60 ? 'widowed' : p.age >= 40 ? 'divorced' : 'single';
    if (st === 'widowed') widowed++; else if (st === 'divorced') divorced++; else singled++;
    updates.push({ range: `Simulation_Ledger!${L(c.mar)}${p.sheetRow}`, values: [[st]] });
  }

  console.log(`cycle=${cycle} simYear=${simYear} | eligible=${pool.length} | paired=${paired.length} pairs | GC-minted spouses=${gcMinted} | status-corrected=${unmatched.length} (widowed ${widowed} / divorced ${divorced} / single ${singled}) | new households=${newHHRows.length} | relocated=${relocated} | SL cell writes=${updates.length}`);
  paired.slice(0, 4).forEach(([a, b]) => console.log(`  PAIR ${a.pop} ${a.name} (${a.age}${a.gender[0]}, ${a.nbhd}) × ${b.pop} ${b.name} (${b.age}${b.gender[0]}, ${b.nbhd})`));
  newSLRows.slice(0, 3).forEach(r => console.log(`  MINT ${r[c.pop]} ${r[c.first]} ${r[c.last]} (maiden ${r[c.maiden] || '-'}) -> spouse of ${r[c.sp]}`));
  unmatched.forEach(p => console.log(`  UNMATCHED ${p.pop} ${p.name} (${p.age}${p.gender[0]}, ${p.nbhd})`));

  if (!APPLY) { console.log('(dry-run — pass --apply to write)'); return; }

  if (newHHRows.length) await sheets.appendRows('Household_Ledger', newHHRows);
  if (newSLRows.length) await sheets.appendRows('Simulation_Ledger', newSLRows);
  for (let k = 0; k < updates.length; k += 100) await sheets.batchUpdate(updates.slice(k, k + 100));
  for (let k = 0; k < gcMarks.length; k += 100) await sheets.batchUpdate(gcMarks.slice(k, k + 100));

  // read-back: no married-without-spouse adults should remain (except unmatched)
  const after = await sheets.getRawSheetData('Simulation_Ledger');
  let still = 0;
  for (const row of after.slice(1)) {
    if (!row || blank(row[c.pop])) continue;
    if (String(row[c.status] || 'active').toLowerCase() === 'deceased') continue;
    if (String(row[c.mar] || '').toLowerCase() !== 'married') continue;
    const by = num(row[c.birth]);
    if (by && simYear - by >= 18 && blank(row[c.sp])) still++;
  }
  console.log(`read-back: married adults still spouse-less = ${still} (expected 0 — unmatched were status-corrected)`);
  if (still !== 0) process.exit(1);
  console.log('MARRIAGE REALIZATION CLEAN');
}

main().catch(e => { console.error(e.stack || e); process.exit(1); });
