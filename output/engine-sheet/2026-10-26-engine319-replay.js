require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.resolve('/root/GodWorld', p), 'utf8');
const src = ['utilities/citizenDerivation.js', 'phase05-citizens/runCareerEngine.js', 'phase05-citizens/generationalWealthEngine.js',
  'phase05-citizens/educationCareerEngine.js', 'phase05-citizens/processAdvancementIntake.js'].map(R).join('\n');
const E = new Function('ECONOMIC_PARAMETERS', 'Logger', src + '\nreturn { pickMintEmployer_, buildMintBizPool_ };')(
  JSON.parse(R('data/economic_parameters.json')), { log() {} });
(async () => {
  const bizData = await sheets.getSheetData('Business_Ledger');
  const ss = { getSheetByName: () => ({ getDataRange: () => ({ getValues: () => bizData }) }) };
  const pool = E.buildMintBizPool_(ss);
  const L = await sheets.getSheetAsObjects('Simulation_Ledger');
  const act = L.filter(r => String(r.Status).trim() === 'Active');
  const tracked = {}; act.forEach(r => { const e = String(r.EmployerBizId || '').trim(); if (e.startsWith('BIZ-')) tracked[e] = (tracked[e] || 0) + 1; });
  const room = (b) => { const st = pool.statedById[b]; return st !== null && st !== undefined && st > (tracked[b] || 0); };
  for (const b of ['BIZ-00005', 'BIZ-00074', 'BIZ-00018', 'BIZ-00099', 'BIZ-00017', 'BIZ-00022', 'BIZ-00024'])
    console.log(b, 'cap', pool.statedById[b], 'tracked', tracked[b] || 0, 'inPool(field)', pool.fieldById[b] || null);
  for (const cm of ['GAME', 'MEDIA', 'CIVIC']) {
    let same = 0, diff = [];
    act.filter(r => String(r.ClockMode).trim().toUpperCase() === cm).forEach(r => {
      const p = E.pickMintEmployer_(r.RoleType, r.Neighborhood, r.ClockMode, r.First + '|' + r.Last + '|' + r.POPID, pool, room);
      const got = p.bizId || p.sentinel || (p.seeking ? '(seeking)' : '(none)');
      const live = String(r.EmployerBizId || '').trim() || '(blank)';
      if (got === live) same++; else diff.push(`${r.POPID} "${r.RoleType}" live=${live} mint=${got}`);
    });
    console.log(`\n${cm}: mint matches live ${same}, differs ${diff.length}`);
    diff.slice(0, 14).forEach(d => console.log('  ' + d));
  }
})().catch(e => { console.error(e.stack); process.exit(1); });
