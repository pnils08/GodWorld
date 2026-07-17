// engine.57 P8 migration — SANDBOX ONLY. Kids backfill (plan §Queued, Mike-approved S319).
// Age line: <18 = minor (S320 kid-age ruling, Mike-confirmed; was <16 at S319 run).
// S320 additions (Mike-ruled): LINK pass — minor with empty ParentIds whose own
//   household holds a same-surname adult gets that adult as parent (ParentIds/
//   ChildrenIds/NumChildren both directions); parent's blank MaritalStatus →
//   married. SPOUSE DRIP — linked married/partnered parents with no SpouseId
//   get a GC spouse promoted (counts against --drip N budget): opposite sex,
//   age ±8, nbhd pref, kid's surname, second parent on the kids' rows, register
//   row. Income-neutral: real 48k replaces the P8 off-camera 48k. Singles stay
//   single (bond-engine subjects, Mike-ruled S320).
// Minors with no household-with-adult:
//   1. ParentIds → parent's household: join it.
//   2. Surname + neighborhood adult match (unambiguous): join that household.
//   3. Else: orphan family household — both parents off-camera, two generic
//      salaries (updateHouseholdIncomes_ P8 rule keeps it true every cycle).
// --drip N: promote BOTH parents for up to N orphan families from
//   Generic_Citizens (same promotion shape as engine57_spouse_backfill bucket C):
//   real SL rows, kid's surname, married to each other, register row, GC → Promoted.
// Dry-run by default; --apply executes. All writes resolved by header name.
// S319 go-live: explicit --sheet-id required — no default target, ever.
const sheetIdArg = process.argv.find(a => a.startsWith('--sheet-id='));
const SHEET_ID = sheetIdArg ? sheetIdArg.split('=')[1]
  : (process.argv.includes('--sheet-id') ? process.argv[process.argv.indexOf('--sheet-id') + 1] : null);
if (!SHEET_ID) { console.error('--sheet-id required'); process.exit(1); }
process.env.GODWORLD_SHEET_ID = SHEET_ID;
const sheets = require('/root/GodWorld/lib/sheets.js');

const APPLY = process.argv.includes('--apply');
const dripArg = process.argv.indexOf('--drip');
const DRIP_N = dripArg >= 0 ? (Number(process.argv[dripArg + 1]) || 1) : 0;
const cycleArg = process.argv.indexOf('--cycle');
const CYCLE = cycleArg >= 0 ? (Number(process.argv[cycleArg + 1]) || 101) : 101;
const AGE_ANCHOR = 2041;
const GENERIC_PARENT_SALARY = 48000; // same rate as engine's GENERIC_SPOUSE_SALARY
const inWorldStamp = 'Y' + (Math.floor(CYCLE / 52) + 1) + 'C' + (CYCLE % 52);

const RENT = { 'West Oakland': 1400, 'Fruitvale': 1500, 'Downtown': 2100, 'Uptown': 1850,
  'Temescal': 1900, 'Rockridge': 2400, 'Lake Merritt': 2000, 'Chinatown': 1600,
  'Jack London': 1950, 'KONO': 1700, 'Laurel': 1550, 'Piedmont Ave': 2200 };

(async () => {
  const sl = await sheets.getRawSheetData('Simulation_Ledger');
  const sh = sl[0]; const si = n => sh.indexOf(n);
  const iPop = si('POPID'), iF = si('First'), iL = si('Last'), iTier = si('Tier'),
        iRole = si('RoleType'), iClock = si('ClockMode'), iStatus = si('Status'),
        iBirth = si('BirthYear'), iCity = si('OrginCity'), iNbhd = si('Neighborhood'),
        iMar = si('MaritalStatus'), iInc = si('Income'), iGen = si('Gender'),
        iSp = si('SpouseId'), iLife = si('LifeHistory'), iHH = si('HouseholdId'),
        iPar = si('ParentIds'), iCh = si('ChildrenIds'), iNum = si('NumChildren'),
        iMaiden = si('MaidenName'); // S321 — birth surname survives the promotion
  [iPop, iL, iBirth, iHH, iPar, iSp].forEach(x => { if (x < 0) throw new Error('SL column missing'); });

  const hh = await sheets.getRawSheetData('Household_Ledger');
  const hhh = hh[0]; const hi = n => hhh.indexOf(n);
  const cId = hi('HouseholdId'), cHead = hi('HeadOfHousehold'), cType = hi('HouseholdType'),
        cMem = hi('Members'), cNbhd = hi('Neighborhood'), cHType = hi('HousingType'),
        cRent = hi('MonthlyRent'), cHCost = hi('HousingCost'), cInc = hi('HouseholdIncome'),
        cFormed = hi('FormedCycle'), cStat = hi('Status');
  const L = sheets.columnIndexToLetter;

  const rows = sl.slice(1);
  const alive = r => String(r[iStatus] || '').toLowerCase() !== 'deceased';
  const ageOf = r => { const b = Number(r[iBirth]) || 0; return b > 0 ? AGE_ANCHOR - b : 30; };
  const rowByPop = {}; rows.forEach((r, k) => { rowByPop[r[iPop]] = { r, sheetRow: k + 2 }; });

  const hhRowOf = {}; const activeHH = {};
  hh.slice(1).forEach((r, k) => {
    hhRowOf[r[cId]] = k + 2;
    if (String(r[cStat] || '').toLowerCase() === 'active') activeHH[r[cId]] = r;
  });

  // adults-per-household from SL truth
  const adultsByHH = {}, membersByHH = {};
  rows.forEach(r => {
    if (!alive(r)) return;
    const hid = (r[iHH] || '').trim(); if (!hid) return;
    (membersByHH[hid] = membersByHH[hid] || []).push(r[iPop]);
    if (ageOf(r) >= 18) (adultsByHH[hid] = adultsByHH[hid] || []).push(r[iPop]); // 18+ = adult (S320 kid-age ruling)
  });

  const minors = rows.filter(r => alive(r) && (Number(r[iBirth]) || 0) > 0 && ageOf(r) < 18);
  const joins = [], creates = [], dripTargets = [], linkTargets = [];
  for (const m of minors) {
    const hid = (m[iHH] || '').trim();
    if (hid && (adultsByHH[hid] || []).length > 0) {
      // covered — but S320 link pass: empty ParentIds + same-surname adult
      // in own household = that adult is the parent (Mike-ruled).
      let kp = []; try { kp = JSON.parse(m[iPar] || '[]'); } catch (e) {}
      if (!Array.isArray(kp) || kp.length === 0) {
        const adult = rows.find(r => alive(r) && ageOf(r) >= 18 &&
          (r[iHH] || '').trim() === hid &&
          String(r[iL] || '').trim() === String(m[iL] || '').trim());
        if (adult) linkTargets.push({ kid: m, adult });
        else console.log(`  NO-LINK ${m[iPop]} ${m[iF]} ${m[iL]} — covered hh, no same-surname adult`);
      }
      continue;
    }
    if (hid && activeHH[hid]) { dripTargets.push({ kid: m, hid }); continue; } // orphan household exists

    // 1. ParentIds → a parent with a household
    let parents = []; try { parents = JSON.parse(m[iPar] || '[]'); } catch (e) {}
    let target = null, via = '';
    for (const p of (Array.isArray(parents) ? parents : [])) {
      const pr = rowByPop[String(p).split(' ')[0]];
      const phh = pr ? (pr.r[iHH] || '').trim() : '';
      if (phh && activeHH[phh]) { target = phh; via = 'ParentIds→' + p; break; }
    }
    // 2. surname + neighborhood adult match, unambiguous
    if (!target) {
      const cands = new Set();
      rows.forEach(r => {
        if (!alive(r) || ageOf(r) < 18) return;
        if (String(r[iL] || '').trim() !== String(m[iL] || '').trim()) return;
        if (String(r[iNbhd] || '').trim() !== String(m[iNbhd] || '').trim()) return;
        const rh = (r[iHH] || '').trim();
        if (rh && activeHH[rh]) cands.add(rh);
      });
      if (cands.size === 1) {
        target = [...cands][0]; via = 'surname+nbhd';
        // link parentage to the matched adult (ledger is truth — D5)
        const adult = rows.find(r => alive(r) && ageOf(r) >= 18 &&
          (r[iHH] || '').trim() === target &&
          String(r[iL] || '').trim() === String(m[iL] || '').trim());
        if (adult) via += ':' + adult[iPop];
      }
    }
    if (target) joins.push({ kid: m, target, via });
    else creates.push({ kid: m });
  }

  console.log(`minors<18: ${minors.length} | join existing: ${joins.length} | create orphan household: ${creates.length} | existing orphan households (drip targets): ${dripTargets.length} | link targets: ${linkTargets.length}`);
  joins.forEach(j => console.log(`  JOIN   ${j.kid[iPop]} ${j.kid[iF]} ${j.kid[iL]} -> ${j.target} (${j.via})`));
  creates.forEach(c => console.log(`  CREATE ${c.kid[iPop]} ${c.kid[iF]} ${c.kid[iL]} (${c.kid[iNbhd] || 'no-nbhd'}) -> new family HH, income ${2 * GENERIC_PARENT_SALARY}`));
  dripTargets.forEach(d => console.log(`  DRIP-TARGET ${d.kid[iPop]} ${d.kid[iF]} ${d.kid[iL]} in ${d.hid}`));

  // ── build writes ──
  const updates = [], newHHRows = [];
  let kSeq = 0;
  for (const j of joins) {
    const kr = rowByPop[j.kid[iPop]];
    updates.push({ range: `Simulation_Ledger!${L(iHH)}${kr.sheetRow}`, values: [[j.target]] });
    const hr = hhRowOf[j.target];
    let mem = []; try { mem = JSON.parse(activeHH[j.target][cMem] || '[]'); } catch (e) {}
    if (!mem.includes(j.kid[iPop])) mem.push(j.kid[iPop]);
    updates.push({ range: `Household_Ledger!${L(cMem)}${hr}`, values: [[JSON.stringify(mem)]] });
    // surname joins carry the matched adult after ':' — link both directions
    const matched = j.via.includes(':') ? j.via.split(':')[1] : '';
    if (matched && rowByPop[matched]) {
      const ar = rowByPop[matched];
      updates.push({ range: `Simulation_Ledger!${L(iPar)}${kr.sheetRow}`, values: [[JSON.stringify([matched])]] });
      let ach = []; try { ach = JSON.parse(ar.r[iCh] || '[]'); } catch (e) {}
      if (!Array.isArray(ach)) ach = [];
      if (!ach.includes(j.kid[iPop])) ach.push(j.kid[iPop]);
      if (iCh >= 0) updates.push({ range: `Simulation_Ledger!${L(iCh)}${ar.sheetRow}`, values: [[JSON.stringify(ach)]] });
      if (iNum >= 0) updates.push({ range: `Simulation_Ledger!${L(iNum)}${ar.sheetRow}`, values: [[ach.length]] });
    }
  }
  for (const c of creates) {
    kSeq++;
    const hid = `HH-${String(CYCLE).padStart(4, '0')}-K${String(kSeq).padStart(3, '0')}`;
    const nbhd = c.kid[iNbhd] || 'West Oakland';
    const row = new Array(hhh.length).fill('');
    row[cId] = hid; row[cHead] = c.kid[iPop]; row[cType] = 'family';
    row[cMem] = JSON.stringify([c.kid[iPop]]); row[cNbhd] = nbhd;
    if (cHType >= 0) row[cHType] = 'rented';
    if (cRent >= 0) row[cRent] = RENT[nbhd] || 1700;
    if (cHCost >= 0) row[cHCost] = 0;
    if (cInc >= 0) row[cInc] = 2 * GENERIC_PARENT_SALARY;
    if (cFormed >= 0) row[cFormed] = CYCLE;
    row[cStat] = 'active';
    newHHRows.push(row);
    const kr = rowByPop[c.kid[iPop]];
    updates.push({ range: `Simulation_Ledger!${L(iHH)}${kr.sheetRow}`, values: [[hid]] });
    dripTargets.push({ kid: c.kid, hid, pending: true }); // eligible for drip once created
  }

  // ── S320 link pass: same-surname in-household parent, both directions ──
  const byAdult = {};
  linkTargets.forEach(t => {
    (byAdult[t.adult[iPop]] = byAdult[t.adult[iPop]] || { adult: t.adult, kids: [] }).kids.push(t.kid);
  });
  const spouseDripPool = [];
  for (const id of Object.keys(byAdult)) {
    const { adult, kids } = byAdult[id];
    const ar = rowByPop[id];
    let ach = []; try { ach = JSON.parse(adult[iCh] || '[]'); } catch (e) {}
    if (!Array.isArray(ach)) ach = [];
    kids.forEach(k => { if (!ach.includes(k[iPop])) ach.push(k[iPop]); });
    kids.forEach(k => updates.push({ range: `Simulation_Ledger!${L(iPar)}${rowByPop[k[iPop]].sheetRow}`, values: [[JSON.stringify([id])]] }));
    if (iCh >= 0) updates.push({ range: `Simulation_Ledger!${L(iCh)}${ar.sheetRow}`, values: [[JSON.stringify(ach)]] });
    if (iNum >= 0) updates.push({ range: `Simulation_Ledger!${L(iNum)}${ar.sheetRow}`, values: [[ach.length]] });
    let mar = String(adult[iMar] || '').trim().toLowerCase();
    const marry = !mar; // blank MaritalStatus → married (S320 Mike ruling)
    if (marry) { mar = 'married'; updates.push({ range: `Simulation_Ledger!${L(iMar)}${ar.sheetRow}`, values: [['married']] }); }
    if ((mar === 'married' || mar === 'partnered') && !(adult[iSp] || '').trim()) {
      spouseDripPool.push({ adult, kids, mar });
    }
    console.log(`  LINK ${kids.map(k => k[iPop]).join('+')} -> parent ${id} ${adult[iF]} ${adult[iL]} (${mar}${marry ? ' MARRY:was-blank' : ''})`);
  }
  console.log(`  link pass: ${Object.keys(byAdult).length} parents | spouse-drip eligible: ${spouseDripPool.length}`);

  // S321: re-derive the pool from ALREADY-linked parents. S320 ran the link
  // pass and counted 35 eligible — but the pool was only built from same-run
  // links, so every later run reported 0 while the families sat in the data.
  // Ledger is truth: married/partnered + ChildrenIds non-empty + no SpouseId.
  const inPool = new Set(spouseDripPool.map(t => String(t.adult[iPop])));
  for (const r of rows) {
    if (!alive(r) || ageOf(r) < 18) continue;
    if (inPool.has(String(r[iPop]))) continue;
    const mar2 = String(r[iMar] || '').trim().toLowerCase();
    if (mar2 !== 'married' && mar2 !== 'partnered') continue;
    if (String(r[iSp] || '').trim()) continue;
    let ch = []; try { ch = JSON.parse(r[iCh] || '[]'); } catch (e) { ch = []; }
    if (!Array.isArray(ch) || !ch.length) continue;
    const kids = ch.map(p => rowByPop[String(p).split(' ')[0]]).filter(Boolean).map(x => x.r);
    if (!kids.length) continue;
    spouseDripPool.push({ adult: r, kids, mar: mar2 });
  }
  console.log(`  re-derived (already-linked parents): ${spouseDripPool.length} total eligible`);

  // ── drip: promote both parents for up to N orphan families ──
  const newSLRows = [], regRows = [], genUpdates = [];
  let dripped = 0;
  if (DRIP_N > 0) {
    const gc = await sheets.getRawSheetData('Generic_Citizens');
    const gh = gc[0]; const gi = n => gh.indexOf(n);
    const gF = gi('First'), gL = gi('Last'), gAge = gi('Age'), gBirth = gi('BirthYear'),
          gNbhd = gi('Neighborhood'), gOcc = gi('Occupation'), gStat = gi('Status'), gSex = gi('Sex');
    const pool = [];
    gc.forEach((r, k) => {
      if (k === 0) return;
      if (String(r[gStat]).toLowerCase() !== 'active') return;
      const sx = (r[gSex] || '').toLowerCase(); if (sx !== 'male' && sx !== 'female') return;
      const a = Number(r[gAge]) || (Number(r[gBirth]) ? AGE_ANCHOR - Number(r[gBirth]) : 0);
      pool.push({ k, first: r[gF], last: r[gL], sex: sx, age: a, nbhd: r[gNbhd], occ: r[gOcc], used: false });
    });
    let maxN = 0;
    rows.forEach(r => { const x = /^POP-(\d+)$/.exec(r[iPop] || ''); if (x && +x[1] > maxN) maxN = +x[1]; });

    for (const t of dripTargets) {
      if (dripped >= DRIP_N) break;
      const kid = t.kid, kidAge = ageOf(kid), kidNbhd = kid[iNbhd] || 'West Oakland';
      const kids = (membersByHH[t.hid] || [kid[iPop]]).filter(p => rowByPop[p] && ageOf(rowByPop[p].r) < 16);
      if (!kids.length) kids.push(kid[iPop]);
      const pickParent = (sex) => {
        const cand = pool.filter(p => !p.used && p.sex === sex && p.age - kidAge >= 20 && p.age - kidAge <= 42);
        cand.sort((x, y) => {
          const xs = (x.nbhd === kidNbhd ? 0 : 1), ys = (y.nbhd === kidNbhd ? 0 : 1);
          if (xs !== ys) return xs - ys;
          return Math.abs(x.age - (kidAge + 30)) - Math.abs(y.age - (kidAge + 30));
        });
        return cand[0] || null;
      };
      const dad = pickParent('male'), mom = pickParent('female');
      if (!dad || !mom) { console.log(`  DRIP ${t.hid}: NO CANDIDATES (dad=${!!dad}, mom=${!!mom})`); continue; }
      dad.used = true; mom.used = true;
      const dadId = 'POP-' + String(++maxN).padStart(5, '0');
      const momId = 'POP-' + String(++maxN).padStart(5, '0');
      const last = String(kid[iL] || '').trim();
      const dadName = `${dad.first} ${last}`, momName = `${mom.first} ${last}`;
      const kidNames = kids.map(p => `${p} ${rowByPop[p].r[iF]} ${rowByPop[p].r[iL]}`);

      const mk = (id, pick, name, spId, spName) => {
        const row = new Array(sh.length).fill('');
        const set = (i, v) => { if (i >= 0) row[i] = v; };
        set(iPop, id); set(iF, pick.first); set(iL, last); set(iTier, 3);
        set(iRole, pick.occ || 'Service worker'); set(iClock, 'ENGINE'); set(iStatus, 'Active');
        set(iBirth, AGE_ANCHOR - pick.age); set(iCity, 'Oakland'); set(iNbhd, kidNbhd);
        set(iMar, 'married'); set(iInc, GENERIC_PARENT_SALARY); set(iGen, pick.sex);
        set(iSp, spId + ' ' + spName); set(iHH, t.hid);
        if (iCh >= 0) set(iCh, JSON.stringify(kids));
        if (iNum >= 0) set(iNum, kids.length);
        set(iLife, `${inWorldStamp} — [Family] The record catches up: at home in ${kidNbhd} raising ${kids.length === 1 ? 'a child' : kids.length + ' children'} with ${spName}.`);
        return row;
      };
      newSLRows.push(mk(dadId, dad, dadName, momId, momName));
      newSLRows.push(mk(momId, mom, momName, dadId, dadName));
      genUpdates.push({ range: `Generic_Citizens!${L(gStat)}${dad.k + 1}`, values: [['Promoted']] });
      genUpdates.push({ range: `Generic_Citizens!${L(gStat)}${mom.k + 1}`, values: [['Promoted']] });

      // kid rows: ParentIds + household stays; household row: members + head + income
      for (const p of kids) {
        updates.push({ range: `Simulation_Ledger!${L(iPar)}${rowByPop[p].sheetRow}`, values: [[JSON.stringify([dadId, momId])]] });
      }
      if (!t.pending && hhRowOf[t.hid]) {
        const hr = hhRowOf[t.hid];
        let mem = []; try { mem = JSON.parse(activeHH[t.hid][cMem] || '[]'); } catch (e) {}
        [dadId, momId].forEach(x => { if (!mem.includes(x)) mem.push(x); });
        updates.push({ range: `Household_Ledger!${L(cMem)}${hr}`, values: [[JSON.stringify(mem)]] });
        updates.push({ range: `Household_Ledger!${L(cHead)}${hr}`, values: [[dadId]] });
        updates.push({ range: `Household_Ledger!${L(cInc)}${hr}`, values: [[2 * GENERIC_PARENT_SALARY]] });
      } else {
        const nr = newHHRows.find(r => r[cId] === t.hid);
        if (nr) { nr[cMem] = JSON.stringify([...kids, dadId, momId]); nr[cHead] = dadId; }
      }
      const reg = new Array(11).fill('');
      reg[0] = t.hid; reg[1] = dadId + ' ' + dadName; reg[2] = momId + ' ' + momName;
      reg[3] = 'married'; reg[4] = CYCLE; reg[5] = 'active';
      kidNames.slice(0, 5).forEach((kn, x) => { reg[6 + x] = kn; });
      regRows.push(reg);
      console.log(`  DRIP ${t.hid}: ${dadId} ${dadName} + ${momId} ${momName} <- parents of ${kidNames.join('; ')}`);
      dripped++;
    }

    // ── S320 spouse drip: one GC spouse per linked married/partnered parent ──
    for (const t of spouseDripPool) {
      if (dripped >= DRIP_N) break;
      const { adult, kids, mar } = t;
      const pGen = String(adult[iGen] || '').trim().toLowerCase();
      const want = pGen === 'male' ? 'female' : pGen === 'female' ? 'male' : null;
      if (!want) { console.log(`  SPOUSE-DRIP ${adult[iPop]}: SKIP — no Gender on parent row`); continue; }
      const pAge = ageOf(adult);
      const oldestKid = Math.max(...kids.map(k => ageOf(k)));
      const nbhd = adult[iNbhd] || 'West Oakland';
      const cand = pool.filter(p => !p.used && p.sex === want &&
        Math.abs(p.age - pAge) <= 8 && p.age - oldestKid >= 18);
      cand.sort((x, y) => {
        const xs = (x.nbhd === nbhd ? 0 : 1), ys = (y.nbhd === nbhd ? 0 : 1);
        if (xs !== ys) return xs - ys;
        return Math.abs(x.age - pAge) - Math.abs(y.age - pAge);
      });
      const pick = cand[0];
      if (!pick) { console.log(`  SPOUSE-DRIP ${adult[iPop]}: NO CANDIDATES (${want}, age ${pAge}±8)`); continue; }
      pick.used = true;
      const spId = 'POP-' + String(++maxN).padStart(5, '0');
      const last = String(adult[iL] || '').trim();
      const spName = `${pick.first} ${last}`;
      const parentName = `${adult[iF]} ${last}`;
      const kidIds = kids.map(k => k[iPop]);
      const kidNames = kids.map(k => `${k[iPop]} ${k[iF]} ${k[iL]}`);
      const hid2 = (adult[iHH] || '').trim();
      const row = new Array(sh.length).fill('');
      const set = (i, v) => { if (i >= 0) row[i] = v; };
      set(iPop, spId); set(iF, pick.first); set(iL, last); set(iTier, 3);
      set(iRole, pick.occ || 'Service worker'); set(iClock, 'ENGINE'); set(iStatus, 'Active');
      set(iBirth, AGE_ANCHOR - pick.age); set(iCity, 'Oakland'); set(iNbhd, nbhd);
      set(iMar, mar); set(iInc, GENERIC_PARENT_SALARY); set(iGen, pick.sex);
      set(iMaiden, String(pick.last || '').trim()); // S321 heritage: GC family name kept
      set(iSp, adult[iPop] + ' ' + parentName); set(iHH, hid2);
      if (iCh >= 0) set(iCh, JSON.stringify(kidIds));
      if (iNum >= 0) set(iNum, kidIds.length);
      set(iLife, `${inWorldStamp} — [Family] The record catches up: at home in ${nbhd} with ${parentName}, raising ${kidIds.length === 1 ? 'a child' : kidIds.length + ' children'}.`);
      newSLRows.push(row);
      genUpdates.push({ range: `Generic_Citizens!${L(gStat)}${pick.k + 1}`, values: [['Promoted']] });
      const ar = rowByPop[adult[iPop]];
      updates.push({ range: `Simulation_Ledger!${L(iSp)}${ar.sheetRow}`, values: [[spId + ' ' + spName]] });
      // kids gain the second parent (overwrites the link-pass single-parent
      // write later in the same ordered batch — final value wins)
      kids.forEach(k => updates.push({ range: `Simulation_Ledger!${L(iPar)}${rowByPop[k[iPop]].sheetRow}`, values: [[JSON.stringify([adult[iPop], spId])]] }));
      if (hhRowOf[hid2] && activeHH[hid2]) {
        const hr = hhRowOf[hid2];
        let mem = []; try { mem = JSON.parse(activeHH[hid2][cMem] || '[]'); } catch (e) {}
        if (!mem.includes(spId)) mem.push(spId);
        updates.push({ range: `Household_Ledger!${L(cMem)}${hr}`, values: [[JSON.stringify(mem)]] });
      }
      const reg = new Array(11).fill('');
      reg[0] = hid2; reg[1] = adult[iPop] + ' ' + parentName; reg[2] = spId + ' ' + spName;
      reg[3] = mar; reg[4] = CYCLE; reg[5] = 'active';
      kidNames.slice(0, 5).forEach((kn, x) => { reg[6 + x] = kn; });
      regRows.push(reg);
      console.log(`  SPOUSE-DRIP ${hid2}: ${spId} ${spName} <- spouse of ${adult[iPop]} ${parentName}, second parent of ${kidNames.join('; ')}`);
      dripped++;
    }
  }

  console.log(`\nWrites: ${updates.length} cells, ${newHHRows.length} new households, ${newSLRows.length} promoted parents, ${regRows.length} register rows, ${genUpdates.length} GC marks`);
  if (!APPLY) { console.log('DRY RUN — nothing written. Re-run with --apply.'); return; }

  if (updates.length) await sheets.batchUpdate(updates);
  if (newHHRows.length) await sheets.appendRows('Household_Ledger', newHHRows);
  if (newSLRows.length) await sheets.appendRows('Simulation_Ledger', newSLRows);
  if (regRows.length) await sheets.appendRows('Family_Relationships', regRows);
  if (genUpdates.length) await sheets.batchUpdate(genUpdates);

  // read-back verify
  const sl2 = await sheets.getRawSheetData('Simulation_Ledger');
  const bad = sl2.slice(1).filter(r => alive(r) && (Number(r[iBirth]) || 0) > 0 && (AGE_ANCHOR - Number(r[iBirth])) < 18 && !(r[iHH] || '').trim());
  console.log('read-back: minors with no household =', bad.length, bad.length === 0 ? '(CLEAN)' : bad.map(r => r[iPop]).join(','));
  const bad2 = sl2.slice(1).filter(r => {
    if (!alive(r) || (Number(r[iBirth]) || 0) <= 0 || (AGE_ANCHOR - Number(r[iBirth])) >= 18) return false;
    let p = []; try { p = JSON.parse(r[iPar] || '[]'); } catch (e) {}
    return !Array.isArray(p) || p.length === 0;
  });
  console.log('read-back: minors with no ParentIds =', bad2.length, bad2.length === 0 ? '(CLEAN)' : bad2.map(r => r[iPop]).join(','));
})().catch(e => { console.error(e.stack); process.exit(1); });
