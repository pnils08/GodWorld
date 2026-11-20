// engine.339 bench readout (SANDBOX 1004, read-only). node readout.js pre | <firedCycle>
//   pre: save the Generic_Citizens family rows, the ledger high POPID and the Engine_Errors count to pre.json
//   <N>: after the fire of Cycle N — renamed child/parent rows left, rows released, new child/parent mints and their age
//        gaps, births and the parents' ages, new ledger arrivals' marriage and child cells, Engine_Errors delta.
require('/root/GodWorld/lib/env');
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const s = require('/root/GodWorld/lib/sheets'), fs = require('fs'), path = require('path');
const PRE = path.join(__dirname, 'pre.json');
const SIMYEAR = c => 2040 + Math.ceil(c / 52) - 1; // simYearFromCycle_ (advanceSimulationCalendar.js)
(async () => {
  const arg = process.argv[2];
  const gc = await s.getSheetData('Generic_Citizens'), sl = await s.getSheetData('Simulation_Ledger'), ee = await s.getSheetData('Engine_Errors');
  const gh = gc[0], g = n => gh.indexOf(n), lh = sl[0], l = n => lh.indexOf(n);
  const popNum = p => Number(String(p || '').replace(/\D/g, '')) || 0;
  const maxPop = Math.max(...sl.slice(1).map(r => popNum(r[l('POPID')])));
  const fam = gc.slice(1).map((r, i) => ({ i, first: r[g('First')], last: r[g('Last')], maiden: String(r[g('MaidenName')] || '').trim(), status: r[g('Status')],
    of: r[g('FamilyOf')], role: String(r[g('FamilyRole')] || ''), by: Number(r[g('BirthYear')]) || 0, made: r[g('EmergedCycle')], ctx: String(r[g('EmergenceContext')] || '') }));
  if (arg === 'pre') {
    fs.writeFileSync(PRE, JSON.stringify({ maxPop, errors: ee.length - 1, gcRows: gc.length - 1,
      renamed: fam.filter(f => f.status === 'Family' && f.role !== 'spouse' && f.maiden).map(f => f.first + ' ' + f.maiden),
      spouses: fam.filter(f => f.status === 'Family' && f.role === 'spouse').length }, null, 1));
    console.log('pre saved: ' + fs.readFileSync(PRE, 'utf8').replace(/\s+/g, ' '));
    return;
  }
  const N = Number(arg), Y = SIMYEAR(N), pre = JSON.parse(fs.readFileSync(PRE, 'utf8'));
  const byPop = {}; sl.slice(1).forEach(r => { byPop[r[l('POPID')]] = r; });
  const bad = [];
  const renamedLeft = fam.filter(f => f.status === 'Family' && f.role !== 'spouse' && f.maiden);
  const released = fam.filter(f => f.ctx.indexOf('Family link released, C' + N) >= 0);
  const mints = fam.filter(f => f.made === 'Cycle ' + N && f.status === 'Family' && f.role !== 'spouse');
  console.log('C' + N + ' | GC rows ' + pre.gcRows + ' -> ' + (gc.length - 1) + ' | renamed child/parent rows left ' + renamedLeft.length + ' (pre ' + pre.renamed.length + ')' +
    ' | released this fire ' + released.length + ' | spouses linked ' + fam.filter(f => f.status === 'Family' && f.role === 'spouse').length + ' (pre ' + pre.spouses + ')');
  if (renamedLeft.length) bad.push('renamed rows left: ' + renamedLeft.map(f => f.first + ' ' + f.last).join(', '));
  released.forEach(f => console.log('  released ' + f.first + ' ' + f.last + ' | status ' + f.status + ' | maiden "' + f.maiden + '"'));
  mints.forEach(f => {
    const a = byPop[f.of], aBY = a ? Number(a[l('BirthYear')]) || 0 : 0, aLast = a ? a[l('Last')] : '?';
    const sp = a ? (String(a[l('SpouseId')] || '').match(/POP-\d+/) || [''])[0] : '', spBY = sp && byPop[sp] ? Number(byPop[sp][l('BirthYear')]) || 0 : 0;
    const gap = f.role === 'child' ? f.by - aBY : aBY - f.by, spGap = (f.role === 'child' && spBY) ? f.by - spBY : null;
    console.log('  minted ' + f.role + ' ' + f.first + ' ' + f.last + ' (BY ' + f.by + ', age ' + (Y - f.by) + ') of ' + f.of + ' ' + aLast + ' gap ' + gap + (spGap !== null ? ' spouse gap ' + spGap : '') + ' maiden "' + f.maiden + '"');
    if (f.last !== aLast) bad.push(f.first + ' surname ' + f.last + ' != family ' + aLast);
    if (f.maiden) bad.push(f.first + ' carries a MaidenName');
    if (gap < 21 || gap > 40 || (spGap !== null && (spGap < 21 || spGap > 40)) || f.by > Y) bad.push(f.first + ' gap out of 21–40');
  });
  console.log('  mints this fire: ' + mints.length);
  const births = sl.slice(1).filter(r => (Number(r[l('BirthYear')]) || 0) === Y && /\[Birth\] born to/.test(String(r[l('LifeHistory')] || '')) && popNum(r[l('POPID')]) > pre.maxPop);
  births.forEach(r => {
    const ps = String(r[l('ParentIds')] || '').match(/POP-\d+/g) || [];
    const ages = ps.map(p => byPop[p] ? Y - (Number(byPop[p][l('BirthYear')]) || 0) : '?');
    console.log('  birth ' + r[l('POPID')] + ' ' + r[l('First')] + ' ' + r[l('Last')] + ' parents ' + ps.join('+') + ' ages ' + ages.join('/'));
    ages.forEach(a => { if (typeof a === 'number' && (a < 21 || a > 40)) bad.push('birth parent age ' + a); });
  });
  console.log('  births this fire: ' + births.length);
  const arrivals = sl.slice(1).filter(r => popNum(r[l('POPID')]) > pre.maxPop && !/\[Birth\] born to/.test(String(r[l('LifeHistory')] || '')));
  arrivals.forEach(r => {
    const m = String(r[l('MaritalStatus')] || ''), k = String(r[l('NumChildren')]), sp = String(r[l('SpouseId')] || '');
    console.log('  arrival ' + r[l('POPID')] + ' ' + r[l('First')] + ' ' + r[l('Last')] + ' age ' + (Y - (Number(r[l('BirthYear')]) || 0)) + ' | ' + m + ' | kids ' + k + (sp ? ' | spouse ' + sp : ''));
    if (!sp && m === 'married') bad.push(r[l('POPID')] + ' arrived married with no spouse');
    if (Number(k) > 0 && !String(r[l('ChildrenIds')] || '').match(/POP-/)) bad.push(r[l('POPID')] + ' arrived with ' + k + ' kids and none linked');
  });
  console.log('  ledger arrivals this fire: ' + arrivals.length);
  const errNew = (ee.length - 1) - pre.errors;
  console.log('  Engine_Errors +' + errNew);
  if (errNew) ee.slice(-errNew).forEach(r => console.log('    ' + r.slice(0, 5).join(' | ').slice(0, 220)));
  console.log(bad.length ? 'CHECK FAIL: ' + bad.join(' ; ') : 'CHECK PASS');
  process.exit(bad.length || errNew ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(2); });
