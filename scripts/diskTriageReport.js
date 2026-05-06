#!/usr/bin/env node
/**
 * diskTriageReport.js — Phase 3 Task 3.1 of the /disk-audit pipeline.
 *
 * Reads latest disk_classified_<DATE>.json and renders a human-readable
 * triage report at output/disk_audit_<DATE>.md.
 *
 * Read-only — no archival, no deletion. Output is a recommendation document
 * for Mike to scan; archival decisions are human-gated downstream.
 *
 * Plan: docs/plans/2026-05-05-disk-inventory-and-dead-file-detection.md
 *
 * Usage:
 *   node scripts/diskTriageReport.js                # latest classified
 *   node scripts/diskTriageReport.js --classified PATH
 *   node scripts/diskTriageReport.js --top 20       # top-N per section (default 10)
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_TOP_N = 10;

function parseArgs(argv) {
  const args = { classified: null, top: DEFAULT_TOP_N };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--classified') args.classified = argv[++i];
    else if (a === '--top') args.top = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/diskTriageReport.js [--classified PATH] [--top N]');
      process.exit(0);
    }
  }
  return args;
}

function findLatestClassified(outDir) {
  const files = fs.readdirSync(outDir).filter(f => f.startsWith('disk_classified_') && f.endsWith('.json'));
  if (!files.length) throw new Error(`No disk_classified_*.json found in ${outDir}`);
  files.sort();
  return path.join(outDir, files[files.length - 1]);
}

function fmtBytes(b) {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}

function fmtAge(mtime) {
  const days = Math.floor((Date.now() - mtime) / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} mo`;
  return `${(days / 365).toFixed(1)} yr`;
}

function escapeMd(s) {
  // Pipe characters break markdown tables — escape them.
  return s.replace(/\|/g, '\\|');
}

function renderTable(rows, columns) {
  const header = '| ' + columns.map(c => c.label).join(' | ') + ' |';
  const sep = '|' + columns.map(() => '---').join('|') + '|';
  const body = rows.map(r =>
    '| ' + columns.map(c => escapeMd(String(c.fmt(r)))).join(' | ') + ' |'
  ).join('\n');
  return [header, sep, body].join('\n');
}

function topByBytes(entries, bucket, n) {
  return entries.filter(e => e.bucket === bucket)
    .sort((a, b) => b.size - a.size)
    .slice(0, n);
}

function groupByTopDir(entries, depth) {
  const groups = new Map();
  for (const e of entries) {
    const parts = e.path.split('/');
    const key = parts.slice(0, depth).join('/');
    if (!groups.has(key)) groups.set(key, { dir: key, count: 0, bytes: 0 });
    const g = groups.get(key);
    g.count++;
    g.bytes += e.size;
  }
  return [...groups.values()];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);

  const repoRoot = path.resolve(__dirname, '..');
  const outDir = path.join(repoRoot, 'output');
  const classifiedPath = args.classified || findLatestClassified(outDir);

  console.log(`[diskTriageReport] reading classified: ${classifiedPath}`);
  const data = JSON.parse(fs.readFileSync(classifiedPath, 'utf8'));

  const entries = data.entries;
  const buckets = data.summary.buckets;
  const total = data.summary.total;
  const totalBytes = entries.reduce((a, e) => a + e.size, 0);

  // Bucket order (stable for the report)
  const order = ['load-bearing', 'reference-only', 'canon', 'regenerable', 'review', 'orphan'];

  // -------------------------------------------------------------------------
  // Build markdown
  // -------------------------------------------------------------------------

  const md = [];
  md.push('# Disk Audit Report');
  md.push('');
  md.push(`**Generated:** ${data.generatedAt}`);
  md.push(`**Sources:** ${data.refscanSource} → classified → this report`);
  md.push(`**Total:** ${total.toLocaleString()} files / ${fmtBytes(totalBytes)}`);
  md.push(`**Recentness threshold:** ≤ ${data.recentnessThresholdDays} days = "load-bearing", older = "reference-only"`);
  md.push('');

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  md.push('## Summary');
  md.push('');
  md.push('| Bucket | Count | Size | Meaning |');
  md.push('|---|---:|---:|---|');
  const meanings = {
    'load-bearing': 'refCount > 0 + recently touched (≤30d)',
    'reference-only': 'refCount > 0 but stale (>30d)',
    'canon': 'frozen reference (editions, archive, papers, journals)',
    'regenerable': 'auto-rebuilt by owning skill (per-cycle output/)',
    'review': 'refCount = 0 BUT git-tracked — possible dynamic dispatch (LLM batch tier)',
    'orphan': 'refCount = 0, not git-tracked, not regen/canon — recovery candidate',
  };
  for (const b of order) {
    if (!buckets[b]) continue;
    md.push(`| **${b}** | ${buckets[b].count.toLocaleString()} | ${fmtBytes(buckets[b].bytes)} | ${meanings[b]} |`);
  }
  md.push('');

  // -------------------------------------------------------------------------
  // Top orphans (the headline recovery candidates)
  // -------------------------------------------------------------------------

  const orphans = topByBytes(entries, 'orphan', args.top);
  if (orphans.length) {
    const orphanBucket = buckets['orphan'] || { count: 0, bytes: 0 };
    md.push(`## Top ${orphans.length} orphans by size`);
    md.push('');
    md.push(`Total orphan footprint: **${orphanBucket.count} files / ${fmtBytes(orphanBucket.bytes)}**. ` +
            `These have refCount=0, are not git-tracked, and don't match any regen/canon pattern. ` +
            `Recovery candidates pending Mike's review — never auto-deleted by this skill.`);
    md.push('');
    md.push(renderTable(orphans, [
      { label: 'Size', fmt: e => fmtBytes(e.size) },
      { label: 'Age', fmt: e => fmtAge(e.mtime) },
      { label: 'Path', fmt: e => '`' + e.path + '`' },
      { label: 'Reason', fmt: e => e.bucketReason || '' },
    ]));
    md.push('');
  }

  // -------------------------------------------------------------------------
  // Top review candidates (git-tracked but unreferenced — LLM batch tier)
  // -------------------------------------------------------------------------

  const review = topByBytes(entries, 'review', args.top);
  if (review.length) {
    const reviewBucket = buckets['review'] || { count: 0, bytes: 0 };
    md.push(`## Top ${review.length} review candidates`);
    md.push('');
    md.push(`Total review tier: **${reviewBucket.count} files / ${fmtBytes(reviewBucket.bytes)}**. ` +
            `Git-tracked files with refCount=0. May be load-bearing via dynamic dispatch ` +
            `(framework-loaded by directory walk, e.g. agent IDENTITY/RULES/SKILL files), ` +
            `or genuinely dead. Phase 2.3 batch-API submission will classify these via LLM ` +
            `read of file content; until then, treat as needs-human-review.`);
    md.push('');
    md.push(renderTable(review, [
      { label: 'Size', fmt: e => fmtBytes(e.size) },
      { label: 'Age', fmt: e => fmtAge(e.mtime) },
      { label: 'Path', fmt: e => '`' + e.path + '`' },
    ]));
    md.push('');
  }

  // -------------------------------------------------------------------------
  // Top reference-only by size (stale referenced)
  // -------------------------------------------------------------------------

  const refOnly = topByBytes(entries, 'reference-only', args.top);
  if (refOnly.length) {
    md.push(`## Top ${refOnly.length} reference-only by size`);
    md.push('');
    md.push(`Files referenced but not touched in >${data.recentnessThresholdDays}d. ` +
            `Often legitimate stable docs / archived references. Inspect ` +
            `the largest if disk pressure is critical.`);
    md.push('');
    md.push(renderTable(refOnly, [
      { label: 'Size', fmt: e => fmtBytes(e.size) },
      { label: 'Age', fmt: e => fmtAge(e.mtime) },
      { label: 'refCount', fmt: e => String(e.refCount) },
      { label: 'Path', fmt: e => '`' + e.path + '`' },
    ]));
    md.push('');
  }

  // -------------------------------------------------------------------------
  // Top directories by orphan size
  // -------------------------------------------------------------------------

  const orphanDirs = groupByTopDir(entries.filter(e => e.bucket === 'orphan'), 2)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, args.top);
  if (orphanDirs.length) {
    md.push(`## Top ${orphanDirs.length} directories by orphan size`);
    md.push('');
    md.push(`Where orphans cluster. Dir = first 2 path segments. Useful for batch review ` +
            `("can I delete all of \`${orphanDirs[0].dir}\`?") rather than file-by-file.`);
    md.push('');
    md.push(renderTable(orphanDirs, [
      { label: 'Size', fmt: g => fmtBytes(g.bytes) },
      { label: 'Files', fmt: g => String(g.count) },
      { label: 'Directory', fmt: g => '`' + g.dir + '`' },
    ]));
    md.push('');
  }

  // -------------------------------------------------------------------------
  // Regenerable footprint (informational)
  // -------------------------------------------------------------------------

  const regenBucket = buckets['regenerable'] || { count: 0, bytes: 0 };
  if (regenBucket.count) {
    md.push('## Regenerable footprint');
    md.push('');
    md.push(`**${regenBucket.count} files / ${fmtBytes(regenBucket.bytes)}** match REGEN_PATTERNS — ` +
            `auto-rebuilt every cycle by their owning skill. Not deletion candidates ` +
            `(they'll regenerate on next cycle), but the size signals how much disk ` +
            `the per-cycle pipeline carries between runs. If this number balloons, ` +
            `consider rotation policy on the noisiest dirs.`);
    md.push('');
  }

  // -------------------------------------------------------------------------
  // Footer
  // -------------------------------------------------------------------------

  md.push('---');
  md.push('');
  md.push('## Pipeline');
  md.push('');
  md.push('Generated by:');
  md.push('1. `scripts/diskInventory.js` — manifest walker (read-only)');
  md.push('2. `scripts/diskRefScan.js` — basename + stem ref scan');
  md.push('3. `scripts/diskClassify.js` — 6-bucket mechanical classification');
  md.push('4. `scripts/diskTriageReport.js` — this report');
  md.push('');
  md.push('Phase 2.3 batch-API classification (for the `review` tier) deferred — ' +
          'mechanical pass currently classifies >90% of files; batch tier is the ' +
          'ambiguous-tail.');
  md.push('');
  md.push('**Read-only end-to-end. No file ever moves or deletes from this pipeline.** ' +
          'Archival is a separate manual step at Mike\'s discretion.');

  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------

  const date = new Date().toISOString().slice(0, 10);
  const outPath = path.join(outDir, `disk_audit_${date}.md`);
  fs.writeFileSync(outPath, md.join('\n') + '\n');

  console.log(`Triage: ${total} files / ${fmtBytes(totalBytes)} → ${orphanDirs.length ? orphans.length : 0} orphan candidates / ${fmtBytes(buckets['orphan']?.bytes || 0)} recoverable`);
  console.log(`Written: ${outPath}`);
}

if (require.main === module) main();

module.exports = { fmtBytes, fmtAge, groupByTopDir };
