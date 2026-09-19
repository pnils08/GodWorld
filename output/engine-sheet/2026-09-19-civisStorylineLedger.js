// Civis recalibration thread on the CURRENT storyline surface (builder: "the current is
// Storyline_Ledger"). Read by buildDeskPackets (open threads → desk packets) and
// buildWorldSummary (continuation candidates). An opened thread with no articles yet; the
// Saturday cron accumulates coverage if a reporter's slug matches (anti-pigeonhole: never required).
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const APPLY = process.argv.includes('--apply');
const ROW = ['city-civis-systems-recalibration', '108', '108', 'open', '0', '1', '0', '0', '0', 'POP-00789', '', 'civic,business'];
(async () => {
  const sl = await sheets.getSheetData('Storyline_Ledger');
  if (sl[0].join('|') !== 'StorylineId|FirstCycle|LastCycle|Status|Advanced|Opened|Closed|Referenced|Articles|Citizens|Hoods|Desks') throw new Error('header changed: ' + sl[0].join('|'));
  if (sl.some(r => r[0] === ROW[0])) { console.log('already present'); return; }
  console.log(JSON.stringify(ROW), APPLY ? 'APPLYING' : 'dry-run');
  if (!APPLY) return;
  await sheets.appendRows('Storyline_Ledger', [ROW]);
  const back = (await sheets.getSheetData('Storyline_Ledger')).filter(r => r[0] === ROW[0]);
  console.log('read-back rows:', back.length, JSON.stringify(back[0]));
})().catch(e => console.log('ERR', e.message));
