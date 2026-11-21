require('/root/GodWorld/lib/env');
const fs = require('fs'), vm = require('vm');
const { getSheetData } = require('/root/GodWorld/lib/sheets');
const E = require('/root/GodWorld/data/economic_parameters.json');
const ctx = { economicParameters_: () => E, Logger: { log() {} }, console };
vm.createContext(ctx); vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/educationCareerEngine.js', 'utf8'), ctx);
(async () => {
  const d = await getSheetData('Simulation_Ledger'), h = d[0], ix = n => h.indexOf(n);
  const out = []; let living = 0;
  for (let r = 1; r < d.length; r++) { const row = d[r], g = n => String(row[ix(n)] || '').trim();
    if (!g('POPID') || g('Status').toLowerCase() === 'deceased') continue;
    if (g('ClockMode').toUpperCase() === 'GAME' || g('EconomicProfileKey') === 'SPORTS_OVERRIDE') continue;
    living++;
    const job = g('RoleType'), key = g('EconomicProfileKey'), entry = ctx.catalogRoleKey_(job) || '';
    let grp;
    if (!job) grp = 'no job';
    else if (!key) grp = 'no label';
    else if (key === job) grp = 'label = job';
    else if (entry && key === entry) grp = 'label = list entry for the job';
    else if (key.toLowerCase() === job.toLowerCase()) grp = 'label = job, different capitals';
    else grp = 'label names something else';
    out.push({ row: r + 1, popid: g('POPID'), name: (g('First') + ' ' + g('Last')).trim(), clock: g('ClockMode').toUpperCase(), job, key, entry, grp });
  }
  fs.writeFileSync(__dirname + '/left.json', JSON.stringify(out, null, 1));
  const t = {}; out.forEach(e => { const k = e.clock + ' | ' + e.grp; t[k] = (t[k] || 0) + 1; });
  console.log('living non-sports rows', living); Object.keys(t).sort().forEach(k => console.log('  ' + k + ': ' + t[k]));
  for (const c of ['CIVIC', 'MEDIA', 'ENGINE']) { const x = out.filter(e => e.clock === c && e.grp === 'label names something else');
    console.log('--', c, x.length, '(first 12)'); x.slice(0, 12).forEach(e => console.log('   ' + e.name + ' | job: ' + e.job.slice(0, 40) + ' | label: ' + e.key + (e.entry ? ' | list entry for job: ' + e.entry : ' | job not on the list'))); }
  const x = out.filter(e => e.grp === 'label names something else'); console.log('of those, job has a list entry:', x.filter(e => e.entry).length, '· job not on the list:', x.filter(e => !e.entry).length);
})().catch(e => { console.error(e.message); process.exit(1); });
