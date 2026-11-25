// engine.356 — the config move changes nothing: the week fired on stage 84 (base) and on the move commit, from the
// same live sync with the same bench lines, must give every bond and every log line identical.
//   node compare.js base move
const fs = require('fs');
const [a, b] = process.argv.slice(2).map(l => JSON.parse(fs.readFileSync(__dirname + '/after-' + l + '.json', 'utf8')));
const key = r => r[0] + '|' + r[1] + '|' + r[2] + '|' + r[3];
const diff = [];
if (a.bonds.length !== b.bonds.length) diff.push('bond rows ' + a.bonds.length + ' vs ' + b.bonds.length);
const bm = new Map(b.bonds.map(r => [key(r), r]));
for (const r of a.bonds) { const o = bm.get(key(r)); if (!o) diff.push('no match for bond ' + key(r)); else if (String(o[4]) !== String(r[4]) || o[5] !== r[5]) diff.push(key(r) + ': ' + r[4] + ' ' + r[5] + ' vs ' + o[4] + ' ' + o[5]); }
const la = a.log.map(r => r.join(' ~ ')).sort(), lb = b.log.map(r => r.join(' ~ ')).sort();
if (la.length !== lb.length) diff.push('log rows ' + la.length + ' vs ' + lb.length);
let ld = 0; for (let i = 0; i < Math.min(la.length, lb.length); i++) if (la[i] !== lb[i]) ld++;
if (ld) diff.push(ld + ' log rows differ');
console.log(JSON.stringify({ bonds: a.bonds.length, logRows: la.length, differences: diff.length, first: diff.slice(0, 8), verdict: diff.length ? 'FAIL' : 'IDENTICAL' }, null, 1));
process.exit(diff.length ? 1 : 0);
