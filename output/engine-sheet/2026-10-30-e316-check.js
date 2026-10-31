// engine.316 bench read: the drafted lines written on SANDBOX 1004 after <fromCycle>, held to their own hood by the
// log row's own Neighborhood (the hood at write time). Reads the bench sheet only.
//   usage: node 2026-10-30-e316-check.js <fromCycle>
// Exit 0 = at least one line written since <fromCycle> and none outside its hood. Exit 3 = no line. Exit 4 = a wrong hood.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const LIVE = process.env.GODWORLD_SHEET_ID;
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === LIVE) process.exit(9);
const sheets = require('/root/GodWorld/lib/sheets');
const src = fs.readFileSync('/root/GodWorld/phase05-citizens/runNeighborhoodEngine.js', 'utf8');
const body = src.slice(src.indexOf('// engine.316 (rb, data'), src.indexOf('// engine.201/201b activity-band'));
const lines = {}; let hood = null;
for (const l of body.split('\n')) {
  const h = l.match(/^\s*'([A-Z][A-Za-z ]+)': \[/); if (h) hood = h[1];
  const t = l.match(/\["(.+)", "(up|down)"\]/); if (t) lines[t[1]] = { hood, dir: t[2] };
}
const from = Number(process.argv[2]);
if (!Number.isInteger(from) || from < 112) { console.error('fromCycle required'); process.exit(2); }
(async () => {
  const map = await sheets.getSheetAsObjects('Neighborhood_Map');
  const latest = {}; map.forEach(r => { latest[r.Neighborhood] = r; });
  const five = [...new Set(Object.values(lines).map(l => l.hood))];
  console.log('drafted lines', Object.keys(lines).length, '| bench cycle', Math.max(...map.map(r => Number(r.Cycle) || 0)));
  five.forEach(h => console.log(' ', h.padEnd(18), 'trajectory', latest[h].NeighborhoodTrajectory, 'character', latest[h].EmployerCharacter));
  const log = await sheets.getSheetAsObjects('LifeHistory_Log');
  let hits = 0, wrong = 0; const byHood = {};
  for (const r of log) {
    if (!(Number(r.Cycle) > from)) continue;
    const txt = String(r.EventText || ''); const m = Object.keys(lines).find(t => txt.includes(t)); if (!m) continue;
    hits++; const h = lines[m].hood; byHood[h] = (byHood[h] || 0) + 1;
    if (r.Neighborhood !== h) wrong++;
    if (hits <= 14) console.log('  ', 'C' + r.Cycle, r.POPID, r.Neighborhood, '|', lines[m].dir, '|', r.EventTag, '|', txt.slice(0, 90));
  }
  console.log('RESULT lines written', hits, '| outside their own hood', wrong, '| by hood', JSON.stringify(byHood), '| after C' + from);
  process.exit(wrong ? 4 : (hits ? 0 : 3));
})().catch(e => { console.error(e.message); process.exit(1); });
