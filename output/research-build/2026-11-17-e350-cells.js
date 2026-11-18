// engine.350 read — read-only scan of the local ledger copy's LifeHistory cells.
const fs = require('fs');
const M = require('/root/GodWorld/utilities/citizenDialMap.js');
const snap = fs.readFileSync('/root/GodWorld/output/simulation_ledger_snapshot.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const pilotTexts = ['sat the chair and felt the night', 'sold the haul and then watched', 'held when selling would have been easier', 'did not take the cheap shot and knew', 'the belt paid and the chair still', 'came back down and the week was still', 'tried not to think about the paper', 'was already running the next night'];
let pl = 0; const pops = {}, tags = {}; let most = 0, last = 0, win = 0, loss = 0, closed = 0; const mon = {};
const fixedText = { Work: {}, Career: {}, Education: {}, Media: {}, Lifestyle: {} };
for (const r of snap) {
  for (const line of String(r.LifeHistory || '').split('\n')) {
    if (pilotTexts.some((t) => line.includes(t))) { pl++; pops[r.POPID] = 1; const m = /\[([^\]]+)\]/.exec(line); tags[m ? m[1] : '?'] = (tags[m ? m[1] : '?'] || 0) + 1; }
    if (line.includes('most of what there was')) most++;
    if (line.includes('took the last of it')) last++;
    if (line.includes('the window paid')) win++; else if (line.includes('slip came back empty')) loss++;
    if (line.includes('window closed before')) closed++;
    const mm = /\[Money\]\s*(.*)/.exec(line);
    if (mm) { const k = mm[1].replace(/\$[\d,.]+/g, '$#').replace(/\d+/g, '#').slice(0, 70); const fx = M.nudgesForEvent_('Money', 1, mm[1]); mon[k] = mon[k] || { n: 0, fx: JSON.stringify(fx) }; mon[k].n++; }
    const tm = /\[([^\]]+)\]\s*(.*)/.exec(line);
    if (tm) { const kind = M.baseTag_(tm[1]); if (fixedText[kind]) { const t = tm[2].replace(/ near .*$| by .*$| at .*$| on .*$| in .*$/, '').slice(0, 80); fixedText[kind][t] = (fixedText[kind][t] || 0) + 1; } }
  }
}
console.log('pilot-POV lines in all cells:', pl, 'on', Object.keys(pops).length, 'citizens', JSON.stringify(tags));
console.log('casino lines in all cells: win', win, '| loss', loss, '| closed', closed, '| big-loss "most of what there was"', most, '| "took the last of it"', last);
console.log('\n[Money] line shapes in all cells (count | what it moves today):');
Object.entries(mon).sort((a, b) => b[1].n - a[1].n).slice(0, 22).forEach((e) => console.log('  ', String(e[1].n).padStart(4), e[1].fx.padEnd(28), e[0]));
for (const k of Object.keys(fixedText)) {
  const ent = Object.entries(fixedText[k]).sort((a, b) => b[1] - a[1]);
  const tot = ent.reduce((x, e) => x + e[1], 0);
  console.log(`\n[${k}] distinct texts ${ent.length}, lines ${tot}. Sample of 14:`);
  ent.slice(0, 14).forEach((e) => console.log('  ', String(e[1]).padStart(4), e[0]));
}
