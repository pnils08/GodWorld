#!/usr/bin/env node
// engine.338 — Wilson Shepard's next-chapter row (queued 2026-11-17 by the citizen wake) landed on
// Advancement_Intake1 nine columns right: A–I blank, his First in J. The engine skips a row with no
// name in A/C and never clears it, so the move would never apply. This moves that one row back to
// column A. Dry run by default; --apply writes, then reads the row back.
//   node output/research-build/2026-11-21-e338-shepard-row-repair.js [--apply]
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');

const APPLY = process.argv.includes('--apply');
const SHIFT = 9; // column J

(async () => {
  const d = await sheets.getSheetData('Advancement_Intake1');
  const width = d[0].length;
  const hits = [];
  d.forEach((r, i) => {
    if (i === 0) return;
    const blankLead = r.slice(0, SHIFT).every(v => String(v || '').trim() === '');
    if (blankLead && String(r[SHIFT] || '').trim() === 'Wilson' && String(r[SHIFT + 2] || '').trim() === 'Shepard') hits.push(i + 1);
  });
  if (hits.length !== 1) { console.log(`expected one shifted Shepard row, found ${hits.length} (${hits.join(', ')}) — nothing written`); process.exit(1); }
  const at = hits[0];
  const live = d[at - 1];
  const fixed = live.slice(SHIFT, SHIFT + width);
  while (fixed.length < width) fixed.push('');
  const extra = live.slice(SHIFT + width).filter(v => String(v || '').trim() !== '');
  if (extra.length) { console.log(`row ${at} has ${extra.length} cell(s) past the header width once moved — nothing written`); process.exit(1); }
  const out = fixed.concat(new Array(Math.max(0, live.length - width)).fill('')); // clears the old cells right of the header
  console.log(`row ${at}: ${d[0].map((h, c) => fixed[c] ? `${h || '(col ' + (c + 1) + ')'}=${String(fixed[c]).slice(0, 60)}` : null).filter(Boolean).join(' | ')}`);
  if (!APPLY) { console.log('dry run — pass --apply to write'); return; }
  await sheets.updateRangeByPosition('Advancement_Intake1', at, 0, [out]);
  const back = (await sheets.getSheetData('Advancement_Intake1'))[at - 1] || [];
  const same = out.every((v, c) => String(v) === String(back[c] === undefined ? '' : back[c]));
  console.log(same ? `row ${at} read back: ok — ${back[0]} ${back[2]}, ${back[3]}, ${back[5]}, ${back[16]}` : `row ${at} read back: MISMATCH ${JSON.stringify(back)}`);
  if (!same) process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
