// engine.356 cut A5 — the two cells move nothing: the week fired on stage 86 (base) and on the A5 commit
// (full), from the same live sync, must give every bond identical and every log row's POPID, EventTag and
// EventText identical, in the same order. The full run must have filled cells, or identical proves nothing.
//   node compare.js base full
const fs = require('fs');
const [a, b] = process.argv.slice(2).map(l => JSON.parse(fs.readFileSync(__dirname + '/after-' + l + '.json', 'utf8')));
const key = r => r[0] + '|' + r[1] + '|' + r[2] + '|' + r[3];
const diff = [];
if (a.bonds.length !== b.bonds.length) diff.push('bond rows ' + a.bonds.length + ' vs ' + b.bonds.length);
const bm = new Map(b.bonds.map(r => [key(r), r]));
for (const r of a.bonds) { const o = bm.get(key(r)); if (!o) diff.push('no match for bond ' + key(r)); else if (String(o[4]) !== String(r[4]) || o[5] !== r[5]) diff.push(key(r) + ': ' + r[4] + ' ' + r[5] + ' vs ' + o[4] + ' ' + o[5]); }
const la = a.log.map(r => r.slice(0, 3).join(' ~ ')), lb = b.log.map(r => r.slice(0, 3).join(' ~ '));
if (la.length !== lb.length) diff.push('log rows ' + la.length + ' vs ' + lb.length);
let ld = 0, first = ''; for (let i = 0; i < Math.min(la.length, lb.length); i++) if (la[i] !== lb[i]) { ld++; if (!first) first = i + ': ' + la[i].slice(0, 200) + '  ||  ' + lb[i].slice(0, 200); }
if (ld) diff.push(ld + ' log rows differ; first ' + first);
const filled = b.log.filter(r => r[3] || r[4]).length;
if (!filled) diff.push('the full run filled no PlaceId or WithPopId — identical proves nothing');
console.log(JSON.stringify({ bonds: a.bonds.length, logRows: la.length, rowsWithACellInFull: filled, differences: diff.length, first: diff.slice(0, 8), verdict: diff.length ? 'FAIL' : 'IDENTICAL' }, null, 1));
process.exit(diff.length ? 1 : 0);
