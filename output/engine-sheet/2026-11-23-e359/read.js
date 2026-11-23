// engine.359 bench read: milestone rows for Cycle <C> on SANDBOX 1004. usage: node read.js <C>  exit 0 = PASS
require('/root/GodWorld/lib/env');
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const sheets = require('/root/GodWorld/lib/sheets');
const C = Number(process.argv[2]);
const MILESTONE = new Set(['Birth', 'Death', 'Retirement', 'Health', 'Recovery', 'Recovering', 'Graduation']);
(async () => {
  const log = await sheets.getSheetData('LifeHistory_Log'); const h = log[0];
  const ix = n => h.indexOf(n);
  const mine = log.slice(1).filter(r => String(r[ix('Cycle')]) === String(C) && MILESTONE.has(String(r[ix('EventTag')])));
  const blank = mine.filter(r => !String(r[ix('Name')]).trim() || !String(r[ix('Neighborhood')]).trim());
  const births = mine.filter(r => r[ix('EventTag')] === 'Birth');
  await new Promise(r => setTimeout(r, 20000));
  const led = await sheets.getSheetAsObjects('Simulation_Ledger');
  const bare = []; for (const r of led) for (const l of String(r.LifeHistory || '').split('\n')) if (new RegExp('^C' + C + ' — ').test(l)) bare.push(r.POPID + ': ' + l.slice(0, 80));
  const out = { cycle: C, milestoneRows: mine.length, byTag: mine.reduce((a, r) => (a[r[ix('EventTag')]] = (a[r[ix('EventTag')]] || 0) + 1, a), {}),
    blankNameOrHood: blank.length, births: births.map(r => [r[ix('POPID')], r[ix('Name')], r[ix('EventText')], r[ix('Neighborhood')]]), bareStampCells: bare.slice(0, 5), bareStampCount: bare.length };
  await new Promise(r => setTimeout(r, 15000));
  const wc = await sheets.getSheetData('World_Config'); const ods = wc.find(r => r[0] === 'ownerDrawShare');
  out.ownerDrawShare = ods ? ods[1] : 'missing';
  const pass = blank.length === 0 && bare.length === 0 && ods && Number(ods[1]) === 0.5;
  console.log(JSON.stringify(Object.assign(out, { verdict: pass ? 'PASS' : 'FAIL', note: mine.length ? '' : 'no milestone fired this Cycle — read is no-regression only' }), null, 1));
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('read ERR', e.message); process.exit(2); });
