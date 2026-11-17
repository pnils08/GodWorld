// Build-note fix bench read (SANDBOX 1004 only). pre: save LifeHistory_Log + Engine_Errors row counts. read <cycle>: no new
// LifeHistory_Log row and no ledger LifeHistory / CitizenBio cell carries a build reference; 0 new Engine_Errors.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const LIVE = process.env.GODWORLD_SHEET_ID; if (LIVE === B) throw new Error('env already points at the bench?');
process.env.GODWORLD_SHEET_ID = B;
const s = require('/root/GodWorld/lib/sheets');
const PRE = '/root/GodWorld/output/research-build/2026-11-16-buildnotes-prefire.json';
const BUILD = /\bengine\.\d+|\bTask \d+|pool draw|\bS\d{3}\b|\bbench\b|\bROLLOUT\b|\bcodex\b|builder/i;
(async () => {
  const mode = process.argv[2];
  const log = await s.getSheetData('LifeHistory_Log'); const ee = await s.getSheetData('Engine_Errors');
  if (mode === 'pre') { fs.writeFileSync(PRE, JSON.stringify({ log: log.length, ee: ee.length })); console.log('pre: log rows', log.length - 1, 'errors', ee.length - 1); return; }
  const pre = JSON.parse(fs.readFileSync(PRE, 'utf8')); let bad = 0;
  // by the Cycle column, not row position: Phase 11 archives old log rows during the same fire
  const h = log[0], iE = h.indexOf('EventText'), iC = h.indexOf('Cycle'); const fresh = log.slice(1).filter((r) => String(r[iC]) === String(process.argv[3]));
  const hits = fresh.filter((r) => BUILD.test(String(r[iE])));
  console.log((hits.length ? 'FAIL ' : 'ok ') + 'new LifeHistory_Log rows ' + fresh.length + ', with a build reference ' + hits.length); hits.slice(0, 5).forEach((r) => console.log('   ', String(r[iE]).slice(0, 160))); bad += hits.length;
  const led = await s.getSheetAsObjects('Simulation_Ledger');
  const lh = led.filter((r) => BUILD.test(String(r.LifeHistory || '').split('\n').filter((l) => /Y3C13/.test(l)).join(' ')));
  console.log((lh.length ? 'FAIL ' : 'ok ') + 'ledger life lines stamped this Cycle (Y3C13) with a build reference: ' + lh.length); lh.slice(0, 5).forEach((r) => console.log('   ', r.POPID, String(r.LifeHistory).split('\n').filter((l) => /Y3C13/.test(l) && BUILD.test(l))[0])); bad += lh.length;
  const ne = ee.length - pre.ee; console.log((ne ? 'FAIL ' : 'ok ') + 'new Engine_Errors rows ' + ne); bad += ne;
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
