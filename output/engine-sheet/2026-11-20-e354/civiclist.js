// engine.354 Task 5, civic clock — READ-ONLY proposal: every CIVIC-clock row, its job, pay, key now and the key proposed.
// Proposed key = the job title as the row has it, when the key names another job. Stays: no key; key already the title or its short
// form; a list entry for the same job; Vega (council president is true and is not in his title).
require('/root/GodWorld/lib/env');
const fs = require('fs'), { getSheetData } = require('/root/GodWorld/lib/sheets');
const KEEP = { 'POP-00042': 'he is the council president', 'POP-00020': 'Urban Planner is her job', 'POP-00131': 'already his job', 'POP-00146': 'already his job (corrected today)' };
const col = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
(async () => {
  const d = await getSheetData('Simulation_Ledger'), h = d[0], ix = n => h.indexOf(n), iK = ix('EconomicProfileKey');
  const rows = [];
  for (let r = 1; r < d.length; r++) { const g = n => String(d[r][ix(n)] || '').trim();
    if (g('ClockMode') !== 'CIVIC' || g('Status').toLowerCase() === 'deceased') continue;
    const role = g('RoleType'), key = g('EconomicProfileKey'), pop = g('POPID');
    let to = null, why = '';
    if (!key) why = 'no key, left as is';
    else if (KEEP[pop]) why = KEEP[pop];
    else if (key.toLowerCase() === role.toLowerCase() || role.toLowerCase().indexOf(key.toLowerCase()) === 0) why = 'key is the job';
    else to = role;
    rows.push({ cell: col(iK) + (r + 1), row: r + 1, popid: pop, name: (g('First') + ' ' + g('Last')).trim(), role, income: g('Income'), from: key, to, why });
  }
  const ch = rows.filter(e => e.to), st = rows.filter(e => !e.to);
  fs.writeFileSync(__dirname + '/civic-keylist.json', JSON.stringify(ch, null, 1));
  const md = ['# Civic-clock job keys — ' + rows.length + ' people, ' + ch.length + ' keys to change', '', 'Only the key cell changes. Job and pay stay as they are.', '', '## To change (' + ch.length + ')', '', '| # | Name | Job | Pay | Key now | Key after |', '|---|---|---|---|---|---|']
    .concat(ch.map((e, i) => `| ${i + 1} | ${e.name} | ${e.role} | ${Number(e.income).toLocaleString('en-US')} | ${e.from} | ${e.to} |`))
    .concat(['', '## Staying as they are (' + st.length + ')', '', '| Name | Job | Key | Why it stays |', '|---|---|---|---|'])
    .concat(st.map(e => `| ${e.name} | ${e.role} | ${e.from || '(none)'} | ${e.why} |`));
  fs.writeFileSync(__dirname + '/civic-job-keys.md', md.join('\n') + '\n');
  console.log('civic rows', rows.length, 'change', ch.length, 'stay', st.length); st.forEach(e => console.log('  stays', e.name, '|', e.role, '|', e.from || '(none)', '|', e.why));
})().catch(e => { console.error(e.message); process.exit(1); });
