// engine.316 bench read: the drafted lines written on SANDBOX 1004 since <fromCycle>, each hood's trajectory, and
// whether a line landed in the hood it belongs to. Reads the bench sheet only.
//   usage: node 2026-10-30-e316-check.js <fromCycle>
require('/root/GodWorld/lib/env');
const fs = require('fs');
const LIVE = process.env.GODWORLD_SHEET_ID;
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === LIVE) process.exit(9);
const sheets = require('/root/GodWorld/lib/sheets');
const src = fs.readFileSync('/root/GodWorld/phase05-citizens/runNeighborhoodEngine.js', 'utf8');
const body = src.slice(src.indexOf("// engine.316 (rb, data"), src.indexOf('// engine.201/201b activity-band'));
const lines = {}; let hood = null;
for (const l of body.split('\n')) {
  const h = l.match(/^\s*'([A-Z][A-Za-z ]+)': \[/); if (h) hood = h[1];
  const t = l.match(/\["(.+)", "(up|down)"\]/); if (t) lines[t[1]] = { hood, dir: t[2] };
}
const from = Number(process.argv[2]);
(async () => {
  const map = await sheets.getSheetAsObjects('Neighborhood_Map');
  const latest = {}; map.forEach(r => { latest[r.Neighborhood] = r; });
  const five = [...new Set(Object.values(lines).map(l => l.hood))];
  console.log('drafted lines', Object.keys(lines).length, '| bench cycle', Math.max(...map.map(r => Number(r.Cycle) || 0)));
  five.forEach(h => console.log(' ', h.padEnd(18), 'trajectory', latest[h].NeighborhoodTrajectory, 'character', latest[h].EmployerCharacter));
  const led = await sheets.getSheetAsObjects('Simulation_Ledger');
  const home = {}; led.forEach(r => { home[String(r.POPID).toUpperCase()] = r.Neighborhood; });
  const log = await sheets.getSheetAsObjects('LifeHistory_Log');
  const keys = Object.keys(log[0]); const textK = keys.find(k => /EventText|Text/i.test(k)); const popK = keys.find(k => /POPID/i.test(k)); const tsK = keys.find(k => /Timestamp|Cycle/i.test(k));
  let hits = 0, wrong = 0; const byHood = {};
  for (const r of log) {
    const txt = String(r[textK] || ''); const m = Object.keys(lines).find(t => txt.includes(t)); if (!m) continue;
    hits++; const h = lines[m].hood; byHood[h] = (byHood[h] || 0) + 1;
    const lives = home[String(r[popK]).toUpperCase()]; if (lives !== h) wrong++;
    if (hits <= 14) console.log('  ', r[tsK], r[popK], lives, '|', lines[m].dir, '|', txt.slice(0, 90));
  }
  console.log('RESULT lines written', hits, '| outside their own hood', wrong, '| by hood', JSON.stringify(byHood), '| from', from);
})().catch(e => { console.error(e.message); process.exit(1); });
