#!/usr/bin/env node
/**
 * archiveBriefingBundle.js — pipeline.11 (briefing versioning, Task 4 of the
 * 2026-04-17 briefing-bundle-trim plan).
 *
 * Copies each desk's live briefing bundle (output/desks/{desk}/current/*) to a
 * cycle-keyed archive (output/desks/{desk}/archive/c{cycle}_bundle/) so retro
 * audits can compare briefing-to-outcome across cycles ("did the briefing cause
 * the grade?"). Pure additive copy — no mutation of live data.
 *
 * Runs at the end of /post-publish, after the edition is saved + ingested.
 *
 * Idempotent: re-running for the same cycle replaces that cycle's bundle dir.
 *
 * Usage:
 *   node scripts/archiveBriefingBundle.js [cycle]   # cycle optional
 *   node scripts/archiveBriefingBundle.js --dry-run # preview, write nothing
 *
 * Cycle resolution: numeric argv override, else output/desk-packets/base_context.json
 * (lib/getCurrentCycle — the single source of truth; fail-loud if neither present).
 *
 * Note: the per-cycle bundle subdir (c{cycle}_bundle/) is deliberately distinct
 * from the flat archive_context.md / {desk}_c{XX}.md files that already live in
 * archive/ (a separate Supermemory-fetch mechanism) — no collision.
 */
const fs = require('fs');
const path = require('path');
const getCurrentCycle = require('../lib/getCurrentCycle');

const ROOT = path.resolve(__dirname, '..');
// The six briefing-bundle desks (the {desk}/current/ form, not the {desk}-desk/
// agent-output dirs). Matches the desk list in the trim plan Task 4.
const DESKS = ['business', 'chicago', 'civic', 'culture', 'letters', 'sports'];
// Files NOT worth archiving. base_context.json is byte-identical across all 6
// desks AND across cycles (it's the canon block + calendar), copied from the
// single live source output/desk-packets/base_context.json — re-archiving 75KB×6
// every cycle forever is pure duplication. The retro-audit value is in the
// per-desk/per-cycle briefing.md + packet.json + summary.json, not the shared
// canon snapshot. (This is the real disk win; the trim-plan's Task-1 live-bundle
// dedup was illusory — each desk agent reads exactly one copy regardless.)
const ARCHIVE_EXCLUDE = new Set(['base_context.json']);
const DRY_RUN = process.argv.includes('--dry-run');

function dirStats(dir) {
  let bytes = 0;
  let files = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ARCHIVE_EXCLUDE.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = dirStats(p);
      bytes += sub.bytes;
      files += sub.files;
    } else {
      bytes += fs.statSync(p).size;
      files++;
    }
  }
  return { bytes, files };
}

function main() {
  const cycle = getCurrentCycle();
  console.log(`archiveBriefingBundle: cycle ${cycle}${DRY_RUN ? ' (DRY RUN — nothing written)' : ''}`);

  let totalBytes = 0;
  let archived = 0;
  let skipped = 0;

  for (const desk of DESKS) {
    const src = path.join(ROOT, `output/desks/${desk}/current`);
    if (!fs.existsSync(src)) {
      console.log(`  [skip] ${desk}: no current/ bundle`);
      skipped++;
      continue;
    }
    const dest = path.join(ROOT, `output/desks/${desk}/archive/c${cycle}_bundle`);
    const { bytes, files } = dirStats(src);
    const kb = (bytes / 1024).toFixed(0);
    if (DRY_RUN) {
      console.log(`  [dry] ${desk}: would copy ${files} files / ${kb} KB → ${path.relative(ROOT, dest)}`);
    } else {
      fs.rmSync(dest, { recursive: true, force: true }); // idempotent re-run
      fs.cpSync(src, dest, {
        recursive: true,
        filter: (s) => !ARCHIVE_EXCLUDE.has(path.basename(s)),
      });
      console.log(`  [ok]  ${desk}: ${files} files / ${kb} KB → ${path.relative(ROOT, dest)}`);
    }
    totalBytes += bytes;
    archived++;
  }

  const mb = (totalBytes / 1024 / 1024).toFixed(2);
  console.log(`Done: ${archived} desk(s) archived, ${skipped} skipped, ${mb} MB total${DRY_RUN ? ' (dry run)' : ''}.`);
}

main();
