// engine.354 Task 4 — the list of wrong job keys on the live ledger. READ-ONLY: writes two local files, nothing on the sheet.
// Rule: living, non-GAME row with a key (not SPORTS_OVERRIDE); L = catalogRoleKey_(RoleType) non-empty; L differs from the key
// by more than letter case; the seeding map (data/role_mapping.json) does not name the key for that job. Key after = L.
require('/root/GodWorld/lib/env');
const fs = require('fs'), vm = require('vm');
const { getSheetData } = require('/root/GodWorld/lib/sheets');
const E = require('/root/GodWorld/data/economic_parameters.json'), RM = require('/root/GodWorld/data/role_mapping.json');
const ctx = { economicParameters_: () => E, Logger: { log() {} }, console };
vm.createContext(ctx); vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/educationCareerEngine.js', 'utf8'), ctx);
const col = n => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
(async () => {
  const d = await getSheetData('Simulation_Ledger'), h = d[0], ix = n => h.indexOf(n);
  const iK = ix('EconomicProfileKey'), iR = ix('RoleType'), iC = ix('ClockMode'), iS = ix('Status'), iP = ix('POPID'), iF = ix('First'), iL = ix('Last'), iI = ix('Income');
  const out = [];
  for (let r = 1; r < d.length; r++) {
    const row = d[r], key = String(row[iK] || '').trim(), role = String(row[iR] || '').trim(), clock = String(row[iC] || '').trim();
    if (String(row[iS] || '').toLowerCase() === 'deceased' || clock.toUpperCase() === 'GAME' || !key || key === 'SPORTS_OVERRIDE' || !role) continue;
    const L = ctx.catalogRoleKey_(role); if (!L || L.toLowerCase() === key.toLowerCase()) continue;
    if (RM[role] === key) continue;
    out.push({ cell: col(iK) + (r + 1), row: r + 1, popid: row[iP], name: (row[iF] + ' ' + row[iL]).trim(), clock, role, income: row[iI], from: key, to: L });
  }
  fs.writeFileSync(__dirname + '/keylist.json', JSON.stringify(out, null, 1));
  const md = ['# Job keys to correct — ' + out.length + ' rows', '', 'Only the key cell changes. Job and pay stay as they are.', '', '| # | Name | Job | Key now | Key after |', '|---|---|---|---|---|']
    .concat(out.map((e, i) => `| ${i + 1} | ${e.name} (${e.popid}) | ${e.role} | ${e.from} | ${e.to} |`));
  fs.writeFileSync(__dirname + '/job-keys-to-correct.md', md.join('\n') + '\n');
  const by = {}; out.forEach(e => by[e.clock] = (by[e.clock] || 0) + 1);
  console.log('rows', out.length, JSON.stringify(by), 'column', col(iK));
  const tgt = {}; out.forEach(e => tgt[e.to] = (tgt[e.to] || 0) + 1); console.log(Object.entries(tgt).sort((a, b) => b[1] - a[1]).map(x => x.join(' ')).join(' | '));
})().catch(e => { console.error(e.message); process.exit(1); });
