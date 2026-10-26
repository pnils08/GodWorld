// Render the engine.302 soak series beside the engine.300 one (counts only), one row per Cycle.
const fs = require('fs');
const load = f => { const by = {}; fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).forEach(r => by[r.cycle] = r); return by; };
const A = load('/root/GodWorld/output/engine-sheet/2026-10-19-engine300-soak-c113-c132.jsonl');
const B = load('/root/GodWorld/output/engine-sheet/2026-10-19-engine302-soak.jsonl');
const OUT = '/root/GodWorld/output/engine-sheet/2026-10-19-engine302-soak.md';
const cyc = Object.keys(B).map(Number).sort((a, b) => a - b);
const h = ['Cycle', 'Weddings (300 → 302)', 'Kids', 'Promoted', 'New bonds', 'same / adj / far / GC', 'Type flips', 'Romance flips', 'Romantic bonds', 'Courtships', 'Friendships ≥ 5.5', 'Romantic ≥ 8', 'Divorced', 'Widowed', 'Youth', 'Status moves'];
const line = a => '| ' + a.join(' | ') + ' |';
const out = [line(h), line(h.map(() => '---'))];
const tot = { w0: 0, w1: 0, k0: 0, k1: 0, nb0: 0, nb1: 0, rf1: 0 };
for (const c of cyc) {
  const a = A[c] || {}, b = B[c], ab = a.bonds || {}, bb = b.bonds || {}, p = bb.newByProximity || {}, mx = (b.marital || {}).mix || {}, tr = (b.marital || {}).transitions || {};
  const rfA = ((ab.crossings || {}).typeFlips || []).filter(x => / friendship->romantic /.test(x)).length;
  out.push(line([b.stamp, `${(a.weddings || []).length} → ${b.weddings.length}`, `${(a.births || []).length} → ${b.births.length}`, `${(a.promotions || []).length} → ${(b.promotions || []).length}`,
    `${(ab.crossings || {}).newBonds ?? '-'} → ${(bb.crossings || {}).newBonds}`, `${p.same}/${p.adjacent}/${p.far}/${p.gc}`, `${((ab.crossings || {}).typeFlips || []).length} → ${(bb.crossings.typeFlips || []).length}`,
    `${rfA} → ${bb.romanceFlips}`, `${ab.romantic ?? '-'} → ${bb.romantic}`, `${ab.courtship ?? '-'} → ${bb.courtship}`, `${ab.friendshipAtOrAboveFlip ?? '-'} → ${bb.friendshipAtOrAboveFlip}`,
    `${ab.romanticAtOrAboveWedding ?? '-'} → ${bb.romanticAtOrAboveWedding}`, mx.divorced, mx.widowed, mx.youth, Object.entries(tr).map(([k, n]) => k + ' ' + n).join(', ') || '—']));
  tot.w0 += (a.weddings || []).length; tot.w1 += b.weddings.length; tot.k0 += (a.births || []).length; tot.k1 += b.births.length;
  tot.nb0 += (ab.crossings || {}).newBonds || 0; tot.nb1 += (bb.crossings || {}).newBonds || 0; tot.rf1 += bb.romanceFlips || 0;
}
const md = ['# engine.302 soak — beside the engine.300 soak, C113–C' + cyc[cyc.length - 1], '',
  'Left of each arrow: SANDBOX 1004 @57 (engine.300 soak, stage 5). Right: @58 = stage 6 (stage 5 + engine.302 cuts 1+2), same `BASELINE-1004-C112b` start, the bench MaritalStatus migration applied first. Counts only; rate and severity are the builder\'s read.', '',
  ...out, '', `Totals over ${cyc.length} Cycles: weddings ${tot.w0} → ${tot.w1}; kids ${tot.k0} → ${tot.k1}; new bonds ${tot.nb0} → ${tot.nb1}; friendship → romance flips (302) ${tot.rf1}.`, ''];
fs.writeFileSync(OUT, md.join('\n'));
console.log(md.join('\n'));
