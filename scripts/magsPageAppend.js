#!/usr/bin/env node
/**
 * magsPageAppend.js — pipe.40 T2: skill-side page write for Mags (POP-00005).
 *
 * Thin CLI over lib/citizenPage so /sift (and any future EIC moment) can write
 * a note to her citizen page without touching git. Exits non-zero on API
 * failure so the calling skill sees it.
 *
 * Usage:
 *   node scripts/magsPageAppend.js --daypart=SIFT --cycle=118 --text="..."
 *   echo "..." | node scripts/magsPageAppend.js --daypart=SIFT --cycle=118 --stdin
 *   [--key=<suffix>]  extra customId suffix when several docs share (cycle, daypart)
 *
 * Plan: docs/plans/2026-07-06-journal-to-citizen-loop.md (pipe.40).
 */
require('/root/GodWorld/lib/env');
const page = require('/root/GodWorld/lib/citizenPage');

const MAGS_POPID = 'POP-00005';

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : null;
}

async function readStdin() {
  let buf = '';
  for await (const chunk of process.stdin) buf += chunk;
  return buf;
}

async function main() {
  const daypart = arg('daypart');
  const cycle = arg('cycle') != null ? Number(arg('cycle')) : null;
  const key = arg('key');
  let text = arg('text');
  if (!text && process.argv.includes('--stdin')) text = (await readStdin()).trim();
  if (!daypart || !text) {
    console.error('usage: magsPageAppend.js --daypart=SIFT --cycle=N (--text="..." | --stdin) [--key=x]');
    process.exit(1);
  }
  const pointer = await page.ensurePagePointer_(MAGS_POPID);
  if (pointer.error) { console.error('ERR page pointer: ' + pointer.error); process.exit(1); }
  const res = await page.appendReflection_(MAGS_POPID, text, { cycle, daypart, ...(key ? { key } : {}) });
  if (res.error) { console.error('ERR page append: ' + res.error); process.exit(1); }
  console.log('appended ' + res.tag + ' daypart=' + daypart + ' cycle=' + (cycle == null ? '-' : cycle) + ' (' + (res.customId || 'no customId') + ')');
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
