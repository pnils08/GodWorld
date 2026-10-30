const fs = require('fs');
const wp = require('/root/GodWorld/lib/wakePerception.js');
const src = fs.readFileSync('/root/GodWorld/lib/wakePerception.js', 'utf8');
const SALIENT_TAG = eval(src.match(/const SALIENT_TAG = (\/.*\/i);/)[1]);
function oldTail(allLines) {
  const tagOf = (l) => ((l.match(/\[([^\]]+)\]/) || [])[1] || '').trim();
  const salient = allLines.filter((l) => SALIENT_TAG.test(tagOf(l))).slice(-3);
  const texture = allLines.filter((l) => !SALIENT_TAG.test(tagOf(l))).slice(-(5 - salient.length));
  const keep = new Set([...salient, ...texture]);
  return allLines.filter((l) => keep.has(l)).slice(-5).join('\n');
}
let n = 0, diff = 0, nopin = 0;
for (const line of fs.readFileSync('/root/GodWorld/output/simulation_ledger_snapshot.jsonl', 'utf8').split('\n')) {
  if (!line) continue;
  const r = JSON.parse(line);
  const all = String(r.LifeHistory || '').trim().split('\n').filter(Boolean);
  n++;
  if (wp.lifeTailOf(all) !== oldTail(all)) diff++;
  if (wp.lifeTailOf(all, [{ stamp: 'Y9C99', re: /x/ }]) !== oldTail(all)) nopin++;
}
console.log(`rows ${n}, differ with no pins ${diff}, differ with a non-matching pin ${nopin}`);
