// Civis recalibration notice on the C108 record (builder go 2026-09-19). The first carrier
// (Storyline_Intake row 363) feeds Storyline_Tracker, retired 2026-08-05 — no desk reads it.
// Ripple_Ledger is read by buildWorldSummary "What Moved" (every media reader) + desk-signal
// lanes; the engine only APPENDS to it (utilities/rippleLedger.js), so rows written before
// the C108 fire sit ahead of the engine's own C108 rows. Factual, no verdict.
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const APPLY = process.argv.includes('--apply');
const base = { cycle: '108', type: 'recalibration', id: 'Civis Systems', scope: 'citywide', targets: 'BIZ-00052', src: 'engine.241 Civis recalibration (written pre-C108)', stamp: 'Y3C4' };
const rows = [
  ['crime', "Civis Systems recalibrated the city's neighborhood safety instruments: West Oakland, Downtown, Jack London, Lake Merritt and Baylight District read far safer than the old readings (West Oakland and Downtown violent-crime readings roughly halved); Piedmont Ave, Rockridge, Glenview, Laurel, Grand Lake and Ivy Hill read higher than before"],
  ['retail', "Civis Systems recalibrated the city's neighborhood commercial-activity readings: West Oakland now reads about double its old figure and Temescal about half; Jack London, Rockridge and Downtown lead the city"],
  ['sentiment', "Civis Systems now reads neighborhood mood block by block in East Oakland, Baylight District, San Antonio, Ivy Hill, Glenview, Dimond, Adams Point, Grand Lake, Eastlake and Brooklyn — ten neighborhoods its instruments had been reporting at the citywide figure"]
].map(([effect, detail]) => [base.cycle, base.type, base.id, detail, effect, base.scope, base.targets, '', '', '1', '', base.src, base.stamp]);
(async () => {
  const H = (await sheets.getSheetData('Ripple_Ledger'))[0];
  if (H.join('|') !== 'Cycle|CauseType|CauseId|CauseDetail|EffectType|TargetScope|TargetIds|Neighborhood|Magnitude|Duration|RemainingStrength|SourceEngine|CycleStamp') throw new Error('Ripple_Ledger header changed — refusing: ' + H.join('|'));
  rows.forEach(r => console.log(r[4], '|', r[3].slice(0, 90) + '…'));
  if (!APPLY) { console.log('dry-run'); return; }
  await sheets.appendRows('Ripple_Ledger', rows);
  const back = (await sheets.getSheetData('Ripple_Ledger')).filter(r => r[0] === '108' && r[1] === 'recalibration');
  console.log('read-back C108 recalibration rows:', back.length);
})().catch(e => console.log('ERR', e.message));
