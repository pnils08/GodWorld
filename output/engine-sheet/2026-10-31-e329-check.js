// engine.329 bench read: the hard-light line written for <POPID> after <fromCycle> names the sports piece (the hard row),
// never the civic one (the later neutral row). Reads the bench sheet only.
//   usage: node 2026-10-31-e329-check.js <fromCycle> <POPID>
// Exit 0 = one hard-light log row + ledger line, both naming sports and not civic. 3 = no line written. 4 = wrong piece.
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === LIVE) process.exit(9);
const sheets = require('/root/GodWorld/lib/sheets');
const from = Number(process.argv[2]), pop = process.argv[3];
if (!Number.isInteger(from) || !pop) { console.error('fromCycle POPID required'); process.exit(2); }
(async () => {
  const log = await sheets.getSheetAsObjects('LifeHistory_Log');
  const rows = log.filter(r => String(r.POPID) === pop && Number(String(r.Cycle).replace(/^C/, '')) > from && /hard light/i.test(String(r.EventText || '')));
  const L = await sheets.getSheetAsObjects('Simulation_Ledger');
  const me = L.find(r => r.POPID === pop) || {};
  const lifeLines = String(me.LifeHistory || '').split('\n').filter(l => /hard light/i.test(l));
  console.log('bench cycle', Math.max(...log.map(r => Number(String(r.Cycle).replace(/^C/, '')) || 0)), '| log hard-light rows after C' + from + ':', rows.length, '| ledger hard-light lines:', lifeLines.length, '| UsageCount', me.UsageCount);
  rows.forEach(r => console.log('  log   C' + r.Cycle, JSON.stringify(r.EventText)));
  lifeLines.forEach(l => console.log('  ledger', JSON.stringify(l)));
  if (!rows.length || !lifeLines.length) process.exit(3);
  const ok = t => /sports desk piece/.test(t) && !/civic/i.test(t) && !/sports_c\d+_/.test(t);
  const good = rows.every(r => ok(String(r.EventText))) && lifeLines.every(ok);
  console.log(good ? 'engine.329 line names the hard row\'s piece in words' : 'WRONG PIECE or raw key');
  process.exit(good ? 0 : 4);
})().catch(e => { console.error(e.message); process.exit(1); });
