// Render the engine.300 soak series (jsonl) as the builder's table — counts only, one row per Cycle.
const fs = require('fs');
const SRC = '/root/GodWorld/output/engine-sheet/2026-10-19-engine300-soak-c113-c132.jsonl';
const OUT = '/root/GodWorld/output/engine-sheet/2026-10-19-engine300-soak-c113-c132.md';
const rows = fs.readFileSync(SRC, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const by = {}; for (const r of rows) by[r.cycle] = r;   // a re-read Cycle keeps its last row
const cyc = Object.keys(by).map(Number).sort((a, b) => a - b);
const h = ['Cycle', 'Weddings', 'Kids born', 'Promoted (employer / die L / mark)', 'Laid off', 'Hired', 'Bought home', 'Sold home', 'Forced sale', 'Heritage',
  'Romantic bonds', 'Courtships', 'Friendships ≥ 5.5', 'Romantic ≥ 8', 'Type flips', 'New bonds', 'Other new citizens'];
const line = a => '| ' + a.join(' | ') + ' |';
const out = [line(h), line(h.map(() => '---'))];
const tot = {};
for (const c of cyc) { const r = by[c], s = r.scoreboard || {}, pr = r.promotionRoutes || {}, b = r.bonds || {}, x = b.crossings || {};
  const v = [r.stamp || ('C' + c), r.weddings.length, r.births.length, `${(r.promotions || []).length} (${pr.employerBudget || 0} / ${pr.dieL || 0} / ${pr.markRaise || 0})`,
    s.laidOff, s.hired, s.boughtHome, s.soldHome, s.forcedSale, s.heritage, b.romantic, b.courtship, b.friendshipAtOrAboveFlip, b.romanticAtOrAboveWedding,
    (x.typeFlips || []).length, x.newBonds, (r.otherMints || []).length];
  out.push(line(v));
  for (const [k, n] of [['weddings', r.weddings.length], ['kids', r.births.length], ['promoted', (r.promotions || []).length], ['laidOff', s.laidOff], ['hired', s.hired], ['bought', s.boughtHome], ['sold', s.soldHome], ['forced', s.forcedSale], ['flips', (x.typeFlips || []).length]]) tot[k] = (tot[k] || 0) + (Number(n) || 0);
}
const md = ['# engine.300 soak — candidate C113–C' + cyc[cyc.length - 1], '',
  'SANDBOX 1004 @57 (the engine.214 PROD candidate: stack + engine.299 three + agy fold), from `BASELINE-1004-C112b`. ' + cyc.length + ' Cycles. Counts only; rate and severity are the builder\'s read.', '',
  ...out, '', 'Totals over ' + cyc.length + ' Cycles: ' + Object.entries(tot).map(([k, v]) => k + ' ' + v).join(', ') + '.', '',
  'Type flips by bond id are in the jsonl (`bonds.crossings.typeFlips`). Promotions are counted by `LastPromotionCycle` with an Income step; the route reads the `[Promotion]` line.', ''];
fs.writeFileSync(OUT, md.join('\n'));
console.log(md.join('\n'));
