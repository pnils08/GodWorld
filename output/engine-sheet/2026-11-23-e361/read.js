// engine.361 bench read: every LifeHistory_Log row of Cycle <C> on SANDBOX 1004 — stamp, Name, Neighborhood.
require('/root/GodWorld/lib/env');
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const sheets = require('/root/GodWorld/lib/sheets');
const C = Number(process.argv[2]);
(async () => {
  const log = await sheets.getSheetData('LifeHistory_Log'); const h = log[0]; const ix = n => h.indexOf(n);
  const mine = log.slice(1).filter(r => String(r[ix('Cycle')]) === String(C));
  const notIW = mine.filter(r => !/^Y\d+C\d+$/.test(String(r[ix('Timestamp')])));
  const noName = mine.filter(r => !String(r[ix('Name')]).trim()), noHood = mine.filter(r => !String(r[ix('Neighborhood')]).trim());
  await new Promise(r => setTimeout(r, 15000));
  const led = await sheets.getSheetAsObjects('Simulation_Ledger'); const ids = new Set(led.map(r => r.POPID));
  const noNameKnown = noName.filter(r => ids.has(String(r[ix('POPID')])));
  const out = { cycle: C, rows: mine.length, notInWorldStamp: notIW.length, sampleNotIW: notIW.slice(0, 3).map(r => r[ix('Timestamp')] + ' ' + r[ix('EventTag')]),
    blankName: noName.length, blankNameForLedgerCitizen: noNameKnown.length, blankHood: noHood.length, sampleBlankName: noNameKnown.slice(0, 3).map(r => r[ix('POPID')] + ' ' + r[ix('EventTag')]) };
  const pass = mine.length > 0 && notIW.length === 0 && noNameKnown.length === 0;
  console.log(JSON.stringify(Object.assign(out, { verdict: pass ? 'PASS' : 'FAIL' }), null, 1)); process.exit(pass ? 0 : 1);
})().catch(e => { console.error('read ERR', e.message); process.exit(2); });
