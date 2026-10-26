// engine.302 step (c)/(e): Simulation_Ledger.MaritalStatus to the five ruled values (engine.286 plan §Bench soak, rulings 1/4/7):
//   partnered -> married, blank adult -> single, age < 18 (simYearFromCycle_ of World_Config cycleCount) -> youth.
// Every other cell is untouched. Dry run by default (prints every POPID old -> new); --apply re-reads, checks each target
// cell still holds its old value, writes the MaritalStatus cells only, then reads back by POPID.
// usage: node output/engine-sheet/2026-10-19-engine302-marital-migrate.js --target bench|live [--apply]
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const APPLY = process.argv.includes('--apply');
const target = (process.argv[process.argv.indexOf('--target') + 1] || '');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const EXPECT = { 'partnered->married': 39, 'blank->single': 70, '->youth': 47 }; // live C112 recount 2026-10-19
const TOL = 3; // a count further off than this is a stop-and-log (plan step e)
(async () => {
  if (target !== 'bench' && target !== 'live') throw new Error('--target bench|live required');
  const id = target === 'bench' ? BENCH : process.env.GODWORLD_SHEET_ID;
  const wantTitle = target === 'bench' ? BENCH_TITLE : 'Simulation_Narrative';
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const title = (await api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title' })).data.properties.title;
  if (title !== wantTitle) throw new Error('REFUSED: ' + target + ' title is "' + title + '", want "' + wantTitle + '"');
  const get = async range => (await api.spreadsheets.values.get({ spreadsheetId: id, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || [];
  const wc = await get('World_Config');
  const cyc = Number((wc.find(r => String(r[0]).trim() === 'cycleCount') || [])[1]);
  if (!(cyc > 0)) throw new Error('no cycleCount');
  const simYear = 2040 + (Math.ceil(cyc / 52) - 1); // simYearFromCycle_ (advanceSimulationCalendar.js:331)
  const plan = async () => {
    const sl = await get('Simulation_Ledger');
    const h = sl[0], c = n => h.indexOf(n);
    const iP = c('POPID'), iM = c('MaritalStatus'), iB = c('BirthYear'), iS = c('Status');
    if ([iP, iM, iB, iS].some(i => i < 0)) throw new Error('header missing');
    const col = String.fromCharCode(65 + Math.floor(iM / 26) - 1).replace('@', '') + String.fromCharCode(65 + (iM % 26));
    const changes = [], dist = {};
    for (let r = 1; r < sl.length; r++) {
      const row = sl[r]; const pop = String(row[iP] || '').trim(); if (!pop) continue;
      const old = String(row[iM] === undefined ? '' : row[iM]); const lc = old.trim().toLowerCase();
      const by = Number(row[iB]) || 0;
      if (!by) throw new Error(pop + ' has no BirthYear — stop (never classified; codex diff review H2)');
      const age = simYear - by;
      let nu = null, kind = null;
      if (age < 18) { if (lc !== 'youth') { nu = 'youth'; kind = '->youth'; } }
      else if (lc === 'partnered') { nu = 'married'; kind = 'partnered->married'; }
      else if (lc === '') { nu = 'single'; kind = 'blank->single'; }
      else if (lc === 'youth') throw new Error(pop + ' is an adult reading youth — stop');
      else if (['married', 'single', 'divorced', 'widowed'].indexOf(lc) < 0) throw new Error(pop + ' off-enum "' + old + '" — stop');
      if (nu) changes.push({ pop, row: r + 1, old, nu, kind, age, status: row[iS] });
      const fin = nu || lc; dist[fin] = (dist[fin] || 0) + 1;
    }
    return { changes, dist, col, iP, iM };
  };
  const p = await plan();
  const count = {}; p.changes.forEach(x => count[x.kind] = (count[x.kind] || 0) + 1);
  console.log(target, title, '| cycleCount', cyc, 'simYear', simYear, '| column', p.col);
  p.changes.forEach(x => console.log(x.pop, 'row', x.row, JSON.stringify(x.old), '->', x.nu, '| age', x.age, '|', x.status));
  console.log('counts', JSON.stringify(count), '| after', JSON.stringify(p.dist));
  for (const k of Object.keys(EXPECT)) if (Math.abs((count[k] || 0) - EXPECT[k]) > TOL) throw new Error('STOP: ' + k + ' = ' + (count[k] || 0) + ', expected ' + EXPECT[k] + ' ±' + TOL);
  if (!APPLY) { console.log('dry run — nothing written'); return; }
  const again = await plan(); // re-read: the same rows must still hold the same old values
  const key = x => x.pop + '|' + x.row + '|' + x.old + '|' + x.nu;
  if (again.changes.map(key).join('\n') !== p.changes.map(key).join('\n')) throw new Error('STOP: ledger moved between dry read and apply');
  const backup = '/root/GodWorld/output/engine-sheet/2026-10-19-engine302-marital-backup-' + target + '.json'; // revert: write each old value back by POPID
  require('fs').writeFileSync(backup, JSON.stringify({ target, title, cycleCount: cyc, column: p.col, cells: p.changes.map(x => ({ pop: x.pop, row: x.row, old: x.old, nu: x.nu })) }, null, 1));
  console.log('backup', backup, p.changes.length, 'cells');
  await api.spreadsheets.values.batchUpdate({ spreadsheetId: id, requestBody: { valueInputOption: 'RAW',
    data: p.changes.map(x => ({ range: 'Simulation_Ledger!' + p.col + x.row, values: [[x.nu]] })) } });
  const sl = await get('Simulation_Ledger'); const byPop = {};
  for (let r = 1; r < sl.length; r++) byPop[String(sl[r][p.iP] || '').trim()] = String(sl[r][p.iM] || '');
  const bad = p.changes.filter(x => byPop[x.pop] !== x.nu);
  const post = await plan();
  console.log('applied', p.changes.length, '| read back mismatches', bad.length, '| remaining changes', post.changes.length, '| dist', JSON.stringify(post.dist));
  if (bad.length || post.changes.length) process.exit(2);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
