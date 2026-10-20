// engine.214 Cut C bench diagnostic: the first citizen (baseline ledger order) whose generator lines differ between two receipt line sets, and the first holder of a spot with news this Cycle. Edit the two .lines.tsv names to compare other legs (A vs B, A vs Bnolift).
require('/root/GodWorld/lib/env');
const fs = require('fs');
process.env.GODWORLD_SHEET_ID = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
const sheets = require('/root/GodWorld/lib/sheets');
const D = '/root/GodWorld/output/engine-sheet/';
const load = (p) => { const m = {}; fs.readFileSync(D + p, 'utf8').split('\n').filter(Boolean).forEach(l => { const [pop, tag, text] = l.split('\t'); if (tag.indexOf('|source:') < 0) return; (m[pop] = m[pop] || []).push(tag + '\t' + text); }); return m; };
const A = load('2026-10-20-e214c-receipt-A-c113.lines.tsv'), B = load('2026-10-20-e214c-receipt-B-c113.lines.tsv');
const rec = JSON.parse(fs.readFileSync(D + '2026-10-20-e214c-receipt-B-c113.json', 'utf8'));
const eventSpots = new Set(); Object.values(rec.hoods).forEach(h => h.spots.forEach(s => { if (s.events.length) eventSpots.add(s.name); }));
const genSrc = fs.readFileSync('/root/GodWorld/phase05-citizens/generateCitizensEvents.js', 'utf8');
const spotRank_ = new Function(genSrc.match(/function spotRank_[\s\S]*?\n}\n/)[0] + '\nreturn spotRank_;')();
(async () => {
  const sl = await sheets.getSheetData('Simulation_Ledger'), h = sl[0];
  const iP = h.indexOf('POPID'), iH = h.indexOf('Neighborhood');
  const spotsByHood = {}; Object.entries(rec.hoods).forEach(([hd, o]) => { spotsByHood[hd] = o.spots; });
  let firstHolder = null, firstDiff = null, idx = 0;
  for (const r of sl.slice(1)) {
    idx++; const pop = r[iP]; const sp = spotsByHood[r[iH]] || [];
    let best = null, br = -1; for (const s of sp) { const k = spotRank_(pop, s.id); if (k > br) { best = s; br = k; } }
    if (!firstHolder && best && best.events.length) firstHolder = { idx, pop, hood: r[iH], spot: best.name };
    const a = (A[pop] || []).join('\n'), b = (B[pop] || []).join('\n');
    if (!firstDiff && a !== b) firstDiff = { idx, pop, hood: r[iH], spot: best && best.name, events: best && best.events, a: (A[pop] || []).length, b: (B[pop] || []).length };
    if (firstHolder && firstDiff) break;
  }
  console.log('first holder of a spot with news:', JSON.stringify(firstHolder));
  console.log('first citizen whose generator lines differ:', JSON.stringify(firstDiff));
})();
