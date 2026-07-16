const APPLY = process.argv.includes('--apply');
const TARGET = process.argv.includes('--sandbox') ? '1reNGLnvimH5vmMs2opPylA1QRpNDKwiVRiN8aYXeAVU' : '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_9P8b'.slice(0,0) + '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';
process.env.GODWORLD_SHEET_ID = TARGET;
const sheets = require('/root/GodWorld/lib/sheets.js');
const SENIOR = /editor|chief|director|columnist|producer|publisher|anchor|mayor|council|attorney|judge|commissioner|superintendent|deputy|prosecutor|physician|doctor/i;
(async () => {
  const sl = await sheets.getRawSheetData('Simulation_Ledger');
  const h = sl[0], si = n => h.indexOf(n);
  const iEdu = si('EducationLevel'); const L = sheets.columnIndexToLetter;
  const plan = [];
  sl.slice(1).forEach((r, k) => {
    if (String(r[si('Status')]||'').toLowerCase() === 'deceased') return;
    const m = String(r[si('ClockMode')]||'').trim();
    if (m !== 'MEDIA' && m !== 'CIVIC') return;
    const by = Number(r[si('BirthYear')])||0;
    if (by > 0 && 2041-by < 18) return; // minors keep school stages
    const cur = String(r[iEdu]||'').trim().toLowerCase();
    if (['masters','doctorate','bachelors'].includes(cur) && !(r[si('POPID')]==='POP-00005'||r[si('POPID')]==='POP-00011')) return; // upgrades only for the two direct calls
    const role = String(r[si('RoleType')]||'');
    let target = SENIOR.test(role) ? 'masters' : 'bachelors';
    if (r[si('POPID')] === 'POP-00005' || r[si('POPID')] === 'POP-00011') target = 'masters'; // Mike-direct: Mags EIC + Carmen
    if (/medical examiner/i.test(role)) target = 'doctorate'; // MD
    if (cur === target.toLowerCase()) return;
    plan.push({ pop: r[si('POPID')], name: r[si('First')]+' '+r[si('Last')], mode: m, role: role.slice(0,40), cur: cur||'BLANK', target, row: k+2 });
  });
  console.log('changes:', plan.length);
  plan.forEach(x => console.log(` ${x.pop} ${x.name} [${x.mode}] ${x.role} : ${x.cur} -> ${x.target}`));
  if (!APPLY) { console.log('DRY RUN'); return; }
  await sheets.batchUpdate(plan.map(x => ({ range: `Simulation_Ledger!${L(iEdu)}${x.row}`, values: [[x.target]] })));
  const sl2 = await sheets.getRawSheetData('Simulation_Ledger');
  const bad = plan.filter(x => String(sl2[x.row-1][iEdu]).trim() !== x.target);
  console.log('read-back mismatches:', bad.length, bad.length===0?'(CLEAN)':'');
})().catch(e=>{console.error(e.message);process.exit(1)});
