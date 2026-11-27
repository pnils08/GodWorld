// engine.356 cut C — with no pick stored the change moves nothing: the week fired on stage 89 (base) and on the cut C
// commit (full), from the same live sync, gives every bond and every log row (POPID, EventTag, EventText, PlaceId) identical, in order.
//   node compare.js base full
const fs = require('fs');
const [a, b] = process.argv.slice(2).map(l => JSON.parse(fs.readFileSync(__dirname + '/after-' + l + '.json', 'utf8')));
const diff = [], k = r => r.join('|');
if (a.bonds.length !== b.bonds.length) diff.push('bond rows ' + a.bonds.length + ' vs ' + b.bonds.length);
const bs = new Set(b.bonds.map(k)); let bd = 0; for (const r of a.bonds) if (!bs.has(k(r))) bd++; if (bd) diff.push(bd + ' bonds differ');
if (a.log.length !== b.log.length) diff.push('log rows ' + a.log.length + ' vs ' + b.log.length);
let ld = 0, first = ''; for (let i = 0; i < Math.min(a.log.length, b.log.length); i++) if (k(a.log[i]) !== k(b.log[i])) { ld++; if (!first) first = i + ': ' + k(a.log[i]).slice(0, 180) + '  ||  ' + k(b.log[i]).slice(0, 180); }
if (ld) diff.push(ld + ' log rows differ; first ' + first);
if (!a.log.length) diff.push('no rows — identical proves nothing');
console.log(JSON.stringify({ bonds: a.bonds.length, logRows: a.log.length, differences: diff.length, first: diff.slice(0, 8), verdict: diff.length ? 'FAIL' : 'IDENTICAL' }, null, 1));
process.exit(diff.length ? 1 : 0);
