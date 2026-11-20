// engine.353 bench readout: youth-engine lines written at the fired cycle, split by the citizen's ClockMode. Read-only, bench only.
require('/root/GodWorld/lib/env');
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const s = require('/root/GodWorld/lib/sheets');
(async () => {
  const cyc = String(process.argv[2] || '');
  const L = await s.getSheetData('LifeHistory_Log'), d = await s.getSheetData('Simulation_Ledger');
  const h = d[0], clock = {}; d.slice(1).forEach(r => { clock[r[0]] = String(r[h.indexOf('ClockMode')] || '').toUpperCase(); });
  const y = L.slice(1).filter(r => String(r[6]) === cyc && /youth-/.test(String(r[3])));
  const game = y.filter(r => clock[r[1]] === 'GAME');
  console.log('C' + cyc + ' youth lines ' + y.length + ' | on GAME-clock rows ' + game.length + ' | on ENGINE ' + y.filter(r => clock[r[1]] === 'ENGINE').length);
  game.forEach(r => console.log('  GAME ' + r[1] + ' ' + r[2] + ' ' + r[3] + ' | ' + r[4]));
  process.exit(game.length === 0 && y.length > 0 ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(2); });
