// engine.354 Task 5 — READ-ONLY. (A) rows whose job has its own list entry and whose key is a different entry. (B) ENGINE rows, job not on the list, key from the seeding map.
require('/root/GodWorld/lib/env');
const fs = require('fs'), vm = require('vm');
const { getSheetData } = require('/root/GodWorld/lib/sheets');
const E = require('/root/GodWorld/data/economic_parameters.json'), RM = require('/root/GodWorld/data/role_mapping.json');
const ctx = { economicParameters_: () => E, Logger: { log() {} }, console };
vm.createContext(ctx); vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/educationCareerEngine.js', 'utf8'), ctx);
const col = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
(async () => {
  const d = await getSheetData('Simulation_Ledger'), h = d[0], ix = n => h.indexOf(n), iK = ix('EconomicProfileKey');
  const A = [], B = {};
  for (let r = 1; r < d.length; r++) { const g = n => String(d[r][ix(n)] || '').trim();
    const key = g('EconomicProfileKey'), role = g('RoleType'), clock = g('ClockMode');
    if (g('Status').toLowerCase() === 'deceased' || clock.toUpperCase() === 'GAME' || !key || key === 'SPORTS_OVERRIDE' || !role) continue;
    const L = ctx.catalogRoleKey_(role);
    if (L) { if (L.toLowerCase() !== key.toLowerCase()) A.push({ cell: col(iK) + (r + 1), row: r + 1, popid: g('POPID'), name: (g('First') + ' ' + g('Last')).trim(), clock, role, income: g('Income'), from: key, to: L }); }
    else if (clock === 'ENGINE' && RM[role] === key) { const k = role + '  =>  ' + key; B[k] = (B[k] || 0) + 1; }
  }
  fs.writeFileSync(__dirname + '/exact-keylist.json', JSON.stringify(A, null, 1));
  console.log('A', A.length); const pa = {}; A.forEach(e => { const k = e.role + '  |  ' + e.from + '  ->  ' + e.to; pa[k] = (pa[k] || 0) + 1; }); Object.keys(pa).sort().forEach(k => console.log('  ' + pa[k] + '  ' + k));
  console.log('B pairs', Object.keys(B).length); Object.keys(B).sort().forEach(k => console.log('  ' + B[k] + '  ' + k));
})().catch(e => { console.error(e.message); process.exit(1); });
