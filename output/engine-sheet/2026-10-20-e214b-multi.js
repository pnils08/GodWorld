// engine.214 8a Cut B replicate readback (codex final gate 2026-10-20: one Cycle is too thin): after one leg's C<from>..C<to>
// sitting on SANDBOX 1004, every trajectory line by hood, Cycle, text group and written sign, plus the hood's generator lines
// (rows whose EventTag carries "|source:") as the denominator. Direction is read from the text itself: each reaction text
// belongs to one trajectory side, and A's four old texts are known. Hood = the citizen's ledger hood on the bench now (a mover's
// lines count under the hood they live in at read time; the totals and sides are by text).
// usage: node 2026-10-20-e214b-multi.js <label> <from> <to>  → output/engine-sheet/2026-10-20-e214b-multi-<label>.json
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === BENCH) throw new Error('env already points at the bench');
process.env.GODWORLD_SHEET_ID = BENCH;
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs');
const [label, from, to] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
// [needle, group, trajectory side, with|against]; '<hood>' texts match as prefix + the citizen's hood
const LINES = [
  ['caught themselves bragging a little about the neighborhood lately', 'brag', 'growth', 'with'],
  ['felt quietly lucky to call <hood> home', 'humble', 'growth', 'with'],
  ['grumbled about the neighborhood over coffee', 'complain', 'growth', 'against'],
  ['griped about <hood> over dinner', 'complain', 'growth', 'against'],
  ["complained about the neighborhood to anyone who'd listen", 'complain', 'decay', 'with'],
  ['vented about <hood> on the walk home', 'complain', 'decay', 'with'],
  ['shrugged off the grumbling about <hood> and got on with the week', 'humble', 'decay', 'against'],
  ['stuck up for the neighborhood to a friend across town', 'defend', 'decay', 'against'],
  ['noticed another new spot opening up in <hood>', 'A:new-spot', 'growth', 'with'],
  ['walked past a storefront that never reopened in <hood>', 'A:storefront', 'decay', 'with'],
  ["heard a neighbor wondering out loud where the block's energy went", 'A:block-energy', 'decay', 'with']
];
(async () => {
  if (!label || !from || !to) throw new Error('usage');
  const sl = await sheets.getSheetData('Simulation_Ledger'); const slh = sl[0];
  const hoodOf = {}; sl.slice(1).forEach(r => { hoodOf[r[slh.indexOf('POPID')]] = r[slh.indexOf('Neighborhood')]; });
  const lh = await sheets.getSheetData('LifeHistory_Log'); const lhh = lh[0];
  const iC = lhh.indexOf('Cycle'), iT = lhh.indexOf('EventTag'), iX = lhh.indexOf('EventText'), iP = lhh.indexOf('POPID');
  const hoods = {}, byCycle = {};
  const H = (h) => (hoods[h] = hoods[h] || { generatorLines: 0, lines: 0, with: 0, against: 0, byGroup: {}, graded: { Up: 0, Down: 0, other: 0 }, side: {} });
  for (const r of lh.slice(1)) {
    const c = Number(String(r[iC]).replace(/^C/, '')); if (!(c >= from && c <= to)) continue;
    const pop = r[iP], hood = hoodOf[pop] || '(none)', tag = String(r[iT] || ''), text = String(r[iX] || '');
    if (tag.indexOf('|source:') >= 0) H(hood).generatorLines++;
    // by text alone: a citizen can draw a hood-named line, then move (codex final gate 2: four such lines were missed)
    const hit = LINES.find(([n]) => n.indexOf('<hood>') < 0 ? text.indexOf(n) === 0 : new RegExp('^' + n.split('<hood>').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+?')).test(text));
    if (!hit) continue;
    const o = H(hood);
    o.lines++; o[hit[3]]++; o.byGroup[hit[1]] = (o.byGroup[hit[1]] || 0) + 1; o.side[hit[2]] = (o.side[hit[2]] || 0) + 1;
    const g = /^Neighborhood-[A-Z][a-z]+-(Up|Down)-[SML]/.exec(tag); o.graded[g ? g[1] : 'other']++;
    byCycle[c] = (byCycle[c] || 0) + 1;
  }
  const tot = Object.values(hoods).reduce((a, o) => { a.lines += o.lines; a.with += o.with; a.against += o.against; return a; }, { lines: 0, with: 0, against: 0 });
  fs.writeFileSync('/root/GodWorld/output/engine-sheet/2026-10-20-e214b-multi-' + label + '.json', JSON.stringify({ label, from, to, total: tot, byCycle, hoods }, null, 1));
  console.log(label + ' C' + from + '-C' + to + ': trajectory lines ' + tot.lines + ' (with ' + tot.with + ' / against ' + tot.against + '), by Cycle ' + JSON.stringify(byCycle));
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
