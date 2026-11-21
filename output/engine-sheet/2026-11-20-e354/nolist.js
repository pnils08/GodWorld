// engine.354 Task 5 — READ-ONLY: living non-GAME rows whose job the engine lookup has no list entry for. Writes nolist.json locally.
require('/root/GodWorld/lib/env');
const fs = require('fs'), vm = require('vm');
const { getSheetData } = require('/root/GodWorld/lib/sheets');
const E = require('/root/GodWorld/data/economic_parameters.json'), RM = require('/root/GodWorld/data/role_mapping.json');
const cat = new Set(E.map(x => x.role));
const ctx = { economicParameters_: () => E, Logger: { log() {} }, console };
vm.createContext(ctx); vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/educationCareerEngine.js', 'utf8'), ctx);
(async () => {
  const d = await getSheetData('Simulation_Ledger'), h = d[0], ix = n => h.indexOf(n);
  const out = [];
  for (let r = 1; r < d.length; r++) { const row = d[r], g = n => String(row[ix(n)] || '').trim();
    if (g('Status').toLowerCase() === 'deceased' || g('ClockMode').toUpperCase() === 'GAME' || g('EconomicProfileKey') === 'SPORTS_OVERRIDE' || !g('RoleType')) continue;
    if (ctx.catalogRoleKey_(g('RoleType'))) continue;
    const key = g('EconomicProfileKey'), m = RM[g('RoleType')] || '';
    out.push({ row: r + 1, popid: g('POPID'), name: (g('First') + ' ' + g('Last')).trim(), clock: g('ClockMode'), tier: g('Tier'), role: g('RoleType'), key, income: g('Income'), employer: g('EmployerBizId'), status: g('Status'),
      group: !key ? 'no key' : (m && m === key) ? 'seed map names this key' : m ? 'seed map names another' : (cat.has(key) ? 'borrowed list entry' : 'key not on the list') });
  }
  fs.writeFileSync(__dirname + '/nolist.json', JSON.stringify(out, null, 1));
  const t = {}; out.forEach(e => { const k = e.clock + ' | ' + e.group; t[k] = (t[k] || 0) + 1; }); console.log('rows', out.length); Object.keys(t).sort().forEach(k => console.log('  ' + k + ': ' + t[k]));
  const show = (clock, group) => out.filter(e => e.clock === clock && e.group === group).forEach(e => console.log('   ' + e.name + ' | ' + e.role.slice(0, 44) + ' | key: ' + (e.key || '(none)') + ' | ' + e.income));
  console.log('MEDIA borrowed'); show('MEDIA', 'borrowed list entry'); console.log('MEDIA no key'); show('MEDIA', 'no key'); console.log('MEDIA seed'); show('MEDIA','seed map names this key');
  console.log('ENGINE borrowed'); show('ENGINE', 'borrowed list entry'); console.log('ENGINE key not on list'); show('ENGINE', 'key not on the list'); console.log('CIVIC key not on list'); show('CIVIC', 'key not on the list'); console.log('MEDIA key not on list'); show('MEDIA', 'key not on the list');
})().catch(e => { console.error(e.message); process.exit(1); });
