// pipeline.112 acceptance 2, from the BEFORE files: is each rewritten entry shown to its reader the way the old entry read?
// office entries through wallLine, a reporter's filing / grade through recordLine; old content whitespace-collapsed as the wall does.
const fs = require('fs');
const pl = require('/root/GodWorld/lib/pageLabels');
const d = '/root/GodWorld/output/repairs/';
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const tally = {}; const bad = [];
for (const f of fs.readdirSync(d).filter((x) => x.startsWith('2026-11-19-page-labels-off-BEFORE-'))) {
  for (const e of JSON.parse(fs.readFileSync(d + f, 'utf8')).entries) {
    const meta = Object.assign({}, e.metadataBefore, e.add);
    const multi = e.old.includes(pl.APPEND_SEP);
    let kind, shown;
    if (meta.type === 'office-position') { kind = 'office'; shown = pl.wallLine(e.next, meta); }
    else if (meta.kind === 'filed' || meta.kind === 'graded') { kind = meta.kind; shown = flat(pl.recordLine(e.next, meta)); }
    else { kind = meta.type || 'other'; shown = null; }
    const key = kind + (multi ? ' (several writes in one entry)' : '');
    tally[key] = tally[key] || { same: 0, differ: 0, notShownWithLabel: 0 };
    if (shown == null) tally[key].notShownWithLabel++;
    else if (shown === flat(e.old)) tally[key].same++;
    else { tally[key].differ++; if (bad.length < 6) bad.push(key + '\n   was: ' + flat(e.old).slice(0, 150) + '\n   now: ' + shown.slice(0, 150)); }
  }
}
console.log(JSON.stringify(tally, null, 1)); bad.forEach((b) => console.log(b));
