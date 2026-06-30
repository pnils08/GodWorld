#!/usr/bin/env node
/**
 * verifyEngineMap.js — self-verification harness for docs/engine/ENGINE_TRUTH_MAP.md
 *
 * The TRUTH MAP is the behavioral map of the engine (what each file is FOR, what it
 * ACTUALLY does, who it reaches, its live status, where it breaks) — NOT the structural
 * stub_map/ctx-map/graphify. This script makes "is the map complete?" a command, not a
 * claim. It cannot be fudged: it compares the map against the live on-disk file inventory.
 *
 * A file entry is COMPLETE iff its `### <relpath>` section contains every required field
 * (Purpose / Actual / Reach / Status / Gap) AND does not contain the ⟪PENDING⟫ marker.
 *
 * Usage:
 *   node scripts/verifyEngineMap.js          # report coverage (COMPLETE / PENDING / MISSING / STALE)
 *   node scripts/verifyEngineMap.js --list    # also list every file by bucket
 *   node scripts/verifyEngineMap.js --seed     # append a ⟪PENDING⟫ stub for each on-disk file not yet in the map
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAP = path.join(ROOT, 'docs/engine/ENGINE_TRUTH_MAP.md');
const DIRS = [
  'phase01-config', 'phase02-world-state', 'phase03-population', 'phase04-events',
  'phase05-citizens', 'phase06-analysis', 'phase07-evening-media', 'phase08-v3-chicago',
  'phase09-digest', 'phase10-persistence', 'phase11-media-intake', 'lib', 'utilities',
];
const REQUIRED = ['Purpose', 'Actual', 'Reach', 'Status', 'Gap'];
const PENDING_MARK = '⟪PENDING⟫';

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.js') && !e.name.endsWith('.test.js')) out.push(path.relative(ROOT, p));
  }
  return out;
}

const onDisk = DIRS.flatMap(d => walk(path.join(ROOT, d))).sort();
const onDiskSet = new Set(onDisk);

const md = fs.existsSync(MAP) ? fs.readFileSync(MAP, 'utf8') : '';
// Parse `### <path>` sections.
const entries = {};
const parts = md.split(/^### /m).slice(1);
for (const chunk of parts) {
  const relpath = chunk.split(/\r?\n/)[0].trim().replace(/`/g, '');
  const body = chunk.slice(chunk.indexOf('\n') + 1);
  const hasAll = REQUIRED.every(f => new RegExp('\\*\\*' + f + ':\\*\\*').test(body));
  const pending = body.includes(PENDING_MARK);
  entries[relpath] = { complete: hasAll && !pending, pending, hasAll };
}

const complete = onDisk.filter(f => entries[f] && entries[f].complete);
const pending = onDisk.filter(f => entries[f] && !entries[f].complete);
const missing = onDisk.filter(f => !entries[f]);
const stale = Object.keys(entries).filter(f => !onDiskSet.has(f));

if (process.argv.includes('--seed')) {
  let add = '';
  let lastDir = '';
  for (const f of missing) {
    const dir = f.split('/')[0];
    if (dir !== lastDir) { add += `\n## ${dir}\n`; lastDir = dir; }
    add += `\n### ${f}\n`
      + `**Purpose:** ${PENDING_MARK}\n`
      + `**Actual:** ${PENDING_MARK}\n`
      + `**Reach:** ${PENDING_MARK}\n`
      + `**Status:** ${PENDING_MARK}\n`
      + `**Gap:** ${PENDING_MARK}\n`
      + `**Touches:** ${PENDING_MARK}\n`;
  }
  fs.appendFileSync(MAP, add);
  console.log(`Seeded ${missing.length} PENDING stubs into ${path.relative(ROOT, MAP)}.`);
  process.exit(0);
}

const pct = onDisk.length ? (100 * complete.length / onDisk.length).toFixed(1) : '0.0';
console.log('=== ENGINE TRUTH MAP — coverage ===');
console.log(`On-disk engine files (excl tests): ${onDisk.length}`);
console.log(`  COMPLETE : ${complete.length}  (${pct}%)`);
console.log(`  PENDING  : ${pending.length}   (entry exists, not yet filled)`);
console.log(`  MISSING  : ${missing.length}   (file on disk, no entry — run --seed)`);
console.log(`  STALE    : ${stale.length}   (entry in map, file gone from disk)`);

if (process.argv.includes('--list')) {
  const show = (label, arr) => { if (arr.length) console.log(`\n[${label}]\n  ` + arr.join('\n  ')); };
  show('PENDING', pending);
  show('MISSING', missing);
  show('STALE', stale);
}

// Exit non-zero until 100% — so a CI/commit gate can enforce completeness.
process.exit(complete.length === onDisk.length && stale.length === 0 ? 0 : 1);
