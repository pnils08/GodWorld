// engine.305 paired receipt for one bench fire (codex recheck 2026-10-19): the Cycle's full LifeHistory_Log line set
// (sorted POPID / EventTag / EventText, sha256), the saved Neighborhood_Map Sentiment, and an ESTIMATE of the generator's
// first-draw Neighborhood pulse per hood under both rules (old: the ungraded kind; new: pulseKindForLine_). The estimate
// takes each citizen's first generator row (EventTag carries "|source:") as the pulse line; a citizen whose first draw
// was dropped by the admission pulses nothing in the engine but is counted here, so it is labelled an estimate.
// usage: node 2026-10-19-e305-receipt.js <cycle> <label>  → output/engine-sheet/2026-10-19-e305-receipt-<label>-c<cycle>.{json,lines.tsv}
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const LIVE = process.env.GODWORLD_SHEET_ID;
if (LIVE === BENCH) throw new Error('env already points at the bench');
process.env.GODWORLD_SHEET_ID = BENCH;
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs'), crypto = require('crypto');
const P = require('/root/GodWorld/utilities/neighborhoodPulseMap.js');
global.baseTag_ = require('/root/GodWorld/utilities/citizenDialMap.js').baseTag_;
const cyc = Number(process.argv[2]), label = process.argv[3] || 'receipt';
(async () => {
  const nm = await sheets.getSheetData('Neighborhood_Map'); const h = nm[0];
  const sent = {}; nm.slice(1).forEach(r => { sent[r[h.indexOf('Neighborhood')]] = Number(r[h.indexOf('Sentiment')]); });
  const sl = await sheets.getSheetData('Simulation_Ledger'); const slh = sl[0];
  const hoodOf = {}; sl.slice(1).forEach(r => { hoodOf[r[slh.indexOf('POPID')]] = r[slh.indexOf('Neighborhood')]; });
  const lh = await sheets.getSheetData('LifeHistory_Log'); const lhh = lh[0];
  const iC = lhh.indexOf('Cycle'), iT = lhh.indexOf('EventTag'), iX = lhh.indexOf('EventText'), iP = lhh.indexOf('POPID');
  const rows = lh.slice(1).filter(r => Number(String(r[iC]).replace(/^C/, '')) === cyc);
  const lines = rows.map(r => [r[iP], r[iT], r[iX]].join('\t')).sort();
  const sha = crypto.createHash('sha256').update(lines.join('\n')).digest('hex');
  const est = {}, seen = {};
  for (const r of rows) {
    const tag = String(r[iT] || ''); if (tag.indexOf('|source:') < 0) continue;
    const pop = r[iP]; if (seen[pop]) continue; seen[pop] = true;
    const parts = tag.split('|'), written = parts[0], ctxTags = parts.slice(1);
    const g = /^([A-Za-z]+)-[A-Z][a-z]+-(Up|Down)-[SML]$/.exec(written);
    const kind = g ? g[1] : written;
    const hood = hoodOf[pop] || '(none)';
    est[hood] = est[hood] || { oldSent: 0, newSent: 0, events: 0, neighborhoodDown: 0 };
    const fxOld = P.pulseForEvent_(kind, ctxTags, r[iX]);
    const fxNew = P.pulseForEvent_(P.pulseKindForLine_(kind, written), ctxTags, r[iX]);
    if (Object.keys(fxOld).length) est[hood].events++;
    est[hood].oldSent += fxOld.sentiment || 0; est[hood].newSent += fxNew.sentiment || 0;
    if (kind === 'Neighborhood' && g && g[2] === 'Down') est[hood].neighborhoodDown++;
  }
  const base = '/root/GodWorld/output/engine-sheet/2026-10-19-e305-receipt-' + label + '-c' + cyc;
  fs.writeFileSync(base + '.lines.tsv', lines.join('\n') + '\n');
  fs.writeFileSync(base + '.json', JSON.stringify({ cycle: cyc, label, lifeHistoryRows: rows.length, linesSha256: sha, sentiment: sent, firstDrawPulseEstimate: est }, null, 1));
  console.log(label + ' C' + cyc + ': ' + rows.length + ' LifeHistory rows, sha ' + sha.slice(0, 16) + ', ' + Object.keys(seen).length + ' first-draw lines');
})().catch(e => { console.error(e.message); process.exit(1); });
