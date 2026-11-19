// engine.349 Task 9 — the two speed keys on the LIVE World_Config, the builder's ruled middle row (2026-11-16):
// lines doubled (dialLineScale 2), a quarter of each week sticks (dialDirectShare 0.25). Benched 2026-11-18 on
// SANDBOX 1004 @212 (leg d, ten fires). Dry-run by default; --apply writes the two rows and reads them back.
// The keys are absent on live until the first fire that carries engine.349 seeds them at 1 and 0; the seeding adds
// only what is missing (phase01-config/engine94SheetContract.js ensureEngine349Config_), so rows written here stay.
//   node output/research-build/2026-11-18-e349-live-speed.js            # show what is there
//   node output/research-build/2026-11-18-e349-live-speed.js --apply    # write, read back
//   node output/research-build/2026-11-18-e349-live-speed.js --apply --back   # back to today's speed (1 and 0)
require('/root/GodWorld/lib/env');
const s = require('/root/GodWorld/lib/sheets');
const APPLY = process.argv.includes('--apply'), BACK = process.argv.includes('--back');
const WANT = BACK ? [['dialLineScale', 1], ['dialDirectShare', 0]] : [['dialLineScale', 2], ['dialDirectShare', 0.25]];
const NOTE = { dialLineScale: 'engine.349 — a Cycle\'s net line push is multiplied by this before it folds (1 = as written)',
  dialDirectShare: 'engine.349 — the share of a Cycle\'s line push that goes straight to the permanent dial (0 = none; the rest swings and fades)' };
(async () => {
  const wc = await s.getRawSheetData('World_Config');
  const at = (k) => wc.findIndex((r) => r[0] === k);
  WANT.forEach(([k, v]) => console.log(`${k}: live ${at(k) >= 0 ? wc[at(k)][1] : 'absent'} -> ${v}`));
  if (!APPLY) { console.log('dry-run — nothing written'); return; }
  for (const [k, v] of WANT) {
    const i = at(k);
    if (i >= 0) await s.updateRange('World_Config!B' + (i + 1), [[v]]);
    else await s.appendRows('World_Config', [[k, v, NOTE[k]]]);
  }
  const back = await s.getRawSheetData('World_Config');
  const bad = WANT.filter(([k, v]) => { const r = back.filter((x) => x[0] === k); return r.length !== 1 || Number(r[0][1]) !== v; });
  if (bad.length) throw new Error('read-back: ' + JSON.stringify(bad));
  console.log('WROTE + verified: ' + WANT.map(([k, v]) => k + ' = ' + v).join(', '));
})().catch((e) => { console.error('FAILED', e && e.message); process.exit(1); });
