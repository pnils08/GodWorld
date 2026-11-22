// engine.356 gaps bench read — SANDBOX 1004 only, after one fire of the stage-73 candidate on live-synced data.
// 1 the two crime bands armed on World_Config. 2 each hood's trajectory on the bench map vs live (pre-fire):
// Baylight District, the lowest-crime decay hood, should leave decay. 3 MigrationFlow moved by hood. Exit 1 on a broken check.
require('/root/GodWorld/lib/env');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', LIVE = process.env.GODWORLD_SHEET_ID;
const sheets = require('/root/GodWorld/lib/sheets');
const at = async (id, tab) => { process.env.GODWORLD_SHEET_ID = id; return sheets.getRawSheetData(tab); };
(async () => {
  if (LIVE === B) throw new Error('env is the bench');
  let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); };
  const wc = await at(B, 'World_Config'); const cfg = {}; wc.forEach(r => { cfg[String(r[0]).trim()] = r[1]; });
  console.log('1 bands: trajectoryCrimeBand ' + cfg.trajectoryCrimeBand + ', migrationCrimeBand ' + cfg.migrationCrimeBand);
  if (Number(cfg.trajectoryCrimeBand) !== 0.05 || Number(cfg.migrationCrimeBand) !== 0.05) fail('bands not armed at 0.05');
  const rd = rows => { const h = rows[0].map(x => String(x).trim()); const o = {}; rows.slice(1).forEach(r => { const n = String(r[h.indexOf('Neighborhood')]).trim(); if (n) o[n] = { t: r[h.indexOf('NeighborhoodTrajectory')], m: r[h.indexOf('TrajectoryMomentum')], f: r[h.indexOf('MigrationFlow')], c: r[h.indexOf('CrimeIndex')] }; }); return o; };
  const b = rd(await at(B, 'Neighborhood_Map')), l = rd(await at(LIVE, 'Neighborhood_Map'));
  const changed = Object.keys(b).filter(h => l[h] && String(b[h].t) !== String(l[h].t)).map(h => h + ' ' + l[h].t + '->' + b[h].t + ' (crime ' + l[h].c + ', mom ' + l[h].m + '->' + b[h].m + ')');
  console.log('2 trajectory labels changed by the fire: ' + (changed.join('; ') || 'none'));
  console.log('  Baylight District: ' + l['Baylight District'].t + ' -> ' + b['Baylight District'].t + ', momentum ' + l['Baylight District'].m + ' -> ' + b['Baylight District'].m);
  if (String(b['Baylight District'].t) === 'decay') fail('Baylight still decay');
  const flows = Object.keys(b).filter(h => l[h] && String(b[h].f) !== String(l[h].f)).length;
  console.log('3 MigrationFlow moved in ' + flows + ' of ' + Object.keys(b).length + ' hoods');
  console.log(bad ? 'RESULT ' + bad + ' failed' : 'RESULT all checks pass'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error('STOP ' + e.message); process.exit(2); });
