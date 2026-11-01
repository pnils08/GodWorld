// engine.329 bench probe: two BENCH-ONLY Citizen_Media_Usage rows for one Active, non-famous, uniquely named bench citizen,
// Processed blank, the hard row FIRST in sheet order (the order that reproduced the bug): a negative sports piece, then a
// neutral civic piece. Reads the tab's header and builds by column name. Bench sheet only — never replay.
//   usage: node 2026-10-31-e329-plant.js <POPID> <First> <Last>
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === LIVE) process.exit(9);
const sheets = require('/root/GodWorld/lib/sheets');
const [pop, first, last] = process.argv.slice(2);
if (!pop || !first || !last) { console.error('POPID First Last required'); process.exit(2); }
(async () => {
  const L = await sheets.getSheetAsObjects('Simulation_Ledger');
  const same = L.filter(r => String(r.First).trim().toLowerCase() === first.toLowerCase() && String(r.Last).trim().toLowerCase() === last.toLowerCase());
  const me = same.find(r => r.POPID === pop);
  if (!me || same.length !== 1 || me.Status !== 'Active' || String(me.Famous || '').trim()) { console.error('citizen is not a unique Active non-famous bench ledger row', JSON.stringify(same.map(r => [r.POPID, r.Status, r.Famous]))); process.exit(3); }
  const wc = await sheets.getSheetData('World_Config'); const cyc = Number((wc.find(r => r[0] === 'cycleCount') || [])[1]);
  const u = await sheets.getSheetData('Citizen_Media_Usage'); const H = u[0];
  for (const c of ['Timestamp', 'Cycle', 'CitizenName', 'UsageType', 'Context', 'Reporter', 'Processed', 'Sentiment']) if (H.indexOf(c) < 0) { console.error('no column ' + c); process.exit(4); }
  const mk = o => H.map(h => (o[h] !== undefined ? o[h] : ''));
  const name = first + ' ' + last, now = new Date().toISOString(), rep = 'BENCH-ONLY engine.329 probe - never replay';
  const rows = [
    mk({ Timestamp: now, Cycle: cyc, CitizenName: name, UsageType: 'mentioned', Context: 'sports_c' + cyc + '_p-slayer', Reporter: rep, Sentiment: 'negative' }),
    mk({ Timestamp: now, Cycle: cyc, CitizenName: name, UsageType: 'mentioned', Context: 'civic_c' + cyc + '_carmen-delaine', Reporter: rep, Sentiment: 'neutral' }),
  ];
  await sheets.appendRows('Citizen_Media_Usage', rows);
  const back = await sheets.getSheetData('Citizen_Media_Usage');
  const mine = back.slice(1).filter(r => String(r[H.indexOf('Reporter')]) === rep && String(r[H.indexOf('CitizenName')]) === name);
  console.log('planted', mine.length, 'rows for', pop, name, 'at bench cycle', cyc, 'usage', me.UsageCount, 'tier', me.Tier, JSON.stringify(mine.map(r => [r[H.indexOf('Context')], r[H.indexOf('Sentiment')], r[H.indexOf('Processed')]])));
  process.exit(mine.length === 2 ? 0 : 5);
})().catch(e => { console.error(e.message); process.exit(1); });
