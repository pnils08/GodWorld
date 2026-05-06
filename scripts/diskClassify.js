#!/usr/bin/env node
/**
 * diskClassify.js — Phase 2 Tasks 2.2 + 2.3 (mechanical pass) of /disk-audit.
 *
 * Reads latest disk_refscan_<DATE>.json, applies a 6-bucket classification,
 * writes output/disk_classified_<DATE>.json + prints summary.
 *
 * BUCKETS (S203 refinement of plan's 4-bucket spec):
 *   load-bearing   — refCount > 0 AND mtime ≤ 30 days
 *   reference-only — refCount > 0 AND mtime > 30 days
 *   regenerable    — path matches REGEN_PATTERNS (auto-rebuilt by owning skill)
 *   canon          — path matches CANON_PATTERNS (editions, archive, papers,
 *                    journal/log files — frozen, never touch)
 *   orphan         — refCount == 0, not regen/canon, not git-tracked
 *   review         — refCount == 0, git-tracked, not regen/canon
 *                    (the LLM-batch tier; Phase 2.3 batch submission lands later)
 *
 * Read-only — never mutates source files.
 *
 * Plan: docs/plans/2026-05-05-disk-inventory-and-dead-file-detection.md
 *
 * Usage:
 *   node scripts/diskClassify.js                  # use latest refscan
 *   node scripts/diskClassify.js --refscan PATH
 *   node scripts/diskClassify.js --dry-run        # print summary, don't write
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

const RECENT_DAYS = 30;
const RECENT_MS = RECENT_DAYS * 24 * 3600 * 1000;

// Top-N entries shown per bucket in the report tail (the JSON keeps everything).
const REPORT_TOP_N = 20;

// ---------------------------------------------------------------------------
// REGEN_PATTERNS — auto-rebuilt every cycle by their owning skill.
// refCount==0 here is expected (paths are constructed via string templates,
// not literal references). NOT orphan — these auto-clean if their owning
// skill rotates.
// ---------------------------------------------------------------------------

const REGEN_PATTERNS = [
  /^output\/desk-packets\//,             // per-desk briefing bundles
  /^output\/photos\//,                   // generated photos
  /^output\/world_summary_/,             // per-cycle world summary
  /^output\/production_log/,             // current cycle production log
  /^output\/engine_(audit|review)_/,     // per-cycle engine audit + review
  /^output\/disk_/,                      // this skill's own outputs
  /^output\/civic-voice\//,              // civic voice JSONs
  /^output\/reporters\//,                // per-reporter cycle artifacts
  /^output\/citizen-cards\//,            // citizen card snapshots
  /^output\/mara-audit\//,               // per-cycle Mara artifacts
  /^output\/agent-cache\//,              // agent caches
  /^output\/session-evaluations\//,      // session-eval traces
  /^output\/sift_/,                      // sift output per cycle
  /^output\/intake_/,                    // intake outputs
  /^output\/grades_/,                    // grading outputs
  /^output\/photo-validation_/,          // photo QA artifacts
  /^output\/edition_pdfs\//,             // PDFs land here per-cycle
  /^output\/.+_c\d+\.(json|md|txt)$/,    // generic per-cycle output
  /^GodWorld\/output\//,                 // catchall — anything in output/ is per-cycle
  /^output\//,                           // belt-and-braces (root-relative output/)
];

// ---------------------------------------------------------------------------
// CANON_PATTERNS — frozen, intentional, never delete. Includes published
// editions (locked canon), archive folders, raw layer (papers/PDFs), and
// log-type docs that are append-only by design.
// ---------------------------------------------------------------------------

const CANON_PATTERNS = [
  /^editions\//,                          // published editions — locked canon
  /^GodWorld\/editions\//,                // (root-relative duplicate)
  /^docs\/canon\//,                       // canon rules + institutions
  /^docs\/archive\//,                     // frozen archived docs
  /^docs\/drive-files\//,                 // raw layer — binaries
  /^docs\/research\/papers\//,            // raw layer — research papers
  /^GodWorld\/docs\/canon\//,
  /^GodWorld\/docs\/archive\//,
  /^GodWorld\/docs\/drive-files\//,
  /^GodWorld\/docs\/research\/papers\//,
  /^GodWorld\/docs\/mags-corliss\/JOURNAL/,           // append-only log
  /^GodWorld\/docs\/mags-corliss\/SESSION_HISTORY/,   // append-only log
  /^GodWorld\/docs\/mags-corliss\/DAILY_REFLECTIONS/, // append-only log
  /^GodWorld\/docs\/mags-corliss\/TECH_READING_ARCHIVE/, // append-only log
  /^GodWorld\/docs\/mags-corliss\/NEWSROOM_MEMORY/,   // institutional memory
  /^GodWorld\/docs\/mags-corliss\/NOTES_TO_SELF/,     // editorial notes
  /^GodWorld\/schemas\/SCHEMA_HEADERS/,    // auto-generated canonical reference
  /^schemas\/SCHEMA_HEADERS/,
  // Top-level archive (separate tree from docs/archive/) — contains historical
  // editions, mirror text dumps, ledger snapshots. Frozen reference.
  /^GodWorld\/archive\//,
  // Legacy engine snapshots (v1..v5) — kept for cross-version reference
  // during Phase 42 + cohort-C migration debugging. Intentional retention.
  /^GodWorld\/legacy\//,
  // Top-level ledgers/cycle-XX dirs — historical ledger PDFs (cycle-75 etc).
  // Pre-S94 recovery artifacts; intentional reference set.
  /^GodWorld\/ledgers\//,
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { refscan: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--refscan') args.refscan = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/diskClassify.js [--refscan PATH] [--dry-run]');
      process.exit(0);
    }
  }
  return args;
}

function findLatestRefscan(outDir) {
  const files = fs.readdirSync(outDir).filter(f => f.startsWith('disk_refscan_') && f.endsWith('.json'));
  if (!files.length) throw new Error(`No disk_refscan_*.json found in ${outDir}`);
  files.sort();
  return path.join(outDir, files[files.length - 1]);
}

function matchesAny(p, patterns) {
  for (const re of patterns) if (re.test(p)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function classifyEntry(entry, now) {
  const isRegen = matchesAny(entry.path, REGEN_PATTERNS);
  const isCanon = matchesAny(entry.path, CANON_PATTERNS);

  // Canon takes precedence over everything except active reference (you can
  // still cite a canon doc; that's load-bearing reference, not "canon means
  // unreferenced"). But for OUR purpose — should-not-delete signal — canon
  // wins regardless of refCount.
  if (isCanon) {
    return { bucket: 'canon', reason: 'matches CANON_PATTERNS (frozen / log)' };
  }

  if (entry.refCount > 0) {
    if (now - entry.mtime <= RECENT_MS) {
      return { bucket: 'load-bearing', reason: `refCount=${entry.refCount}, recent (≤${RECENT_DAYS}d)` };
    }
    return { bucket: 'reference-only', reason: `refCount=${entry.refCount}, older (>${RECENT_DAYS}d)` };
  }

  // refCount == 0 from here
  if (isRegen) {
    return { bucket: 'regenerable', reason: 'matches REGEN_PATTERNS (auto-rebuilt)' };
  }

  if (entry.gitTracked) {
    return { bucket: 'review', reason: 'refCount=0 but git-tracked (possible dynamic dispatch)' };
  }

  return { bucket: 'orphan', reason: 'refCount=0, not git-tracked, not regen/canon' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);

  const repoRoot = path.resolve(__dirname, '..');
  const outDir = path.join(repoRoot, 'output');
  const refscanPath = args.refscan || findLatestRefscan(outDir);

  console.log(`[diskClassify] reading refscan: ${refscanPath}`);
  const refscan = JSON.parse(fs.readFileSync(refscanPath, 'utf8'));

  const now = Date.now();
  const start = now;

  const classified = refscan.entries.map(entry => {
    const c = classifyEntry(entry, now);
    return { ...entry, bucket: c.bucket, bucketReason: c.reason };
  });

  // Bucket summary
  const buckets = {};
  for (const e of classified) {
    if (!buckets[e.bucket]) buckets[e.bucket] = { count: 0, bytes: 0 };
    buckets[e.bucket].count++;
    buckets[e.bucket].bytes += e.size;
  }

  const elapsedMs = Date.now() - start;

  const output = {
    generatedAt: new Date().toISOString(),
    refscanSource: path.relative(repoRoot, refscanPath),
    recentnessThresholdDays: RECENT_DAYS,
    patterns: {
      regen: REGEN_PATTERNS.map(r => r.toString()),
      canon: CANON_PATTERNS.map(r => r.toString()),
    },
    summary: {
      total: classified.length,
      buckets,
    },
    elapsedMs,
    entries: classified,
  };

  // Console summary
  console.log(`Classified ${classified.length} entries in ${elapsedMs}ms`);
  const order = ['load-bearing', 'reference-only', 'canon', 'regenerable', 'review', 'orphan'];
  for (const b of order) {
    if (!buckets[b]) continue;
    const mb = (buckets[b].bytes / 1024 / 1024).toFixed(1);
    console.log(`  ${b.padEnd(15)} ${String(buckets[b].count).padStart(5)}  ${mb.padStart(8)} MB`);
  }

  // Top review candidates by size — these are the most interesting batch-tier targets
  const reviewByBytes = classified
    .filter(e => e.bucket === 'review')
    .sort((a, b) => b.size - a.size)
    .slice(0, REPORT_TOP_N);
  if (reviewByBytes.length) {
    console.log(`\nTop ${reviewByBytes.length} review candidates (refCount=0 git-tracked, biggest first):`);
    for (const e of reviewByBytes) {
      const kb = (e.size / 1024).toFixed(1);
      console.log(`  ${kb.padStart(8)} KB  ${e.path}`);
    }
  }

  // Top orphans by size — these are the headline disk-recovery candidates
  const orphansByBytes = classified
    .filter(e => e.bucket === 'orphan')
    .sort((a, b) => b.size - a.size)
    .slice(0, REPORT_TOP_N);
  if (orphansByBytes.length) {
    console.log(`\nTop ${orphansByBytes.length} orphans by size:`);
    for (const e of orphansByBytes) {
      const mb = (e.size / 1024 / 1024).toFixed(1);
      console.log(`  ${mb.padStart(8)} MB  ${e.path}`);
    }
  }

  if (args.dryRun) {
    console.log('\n[dry-run] not writing classified manifest');
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const outPath = path.join(outDir, `disk_classified_${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten: ${outPath}`);
}

if (require.main === module) main();

module.exports = { REGEN_PATTERNS, CANON_PATTERNS, classifyEntry, RECENT_DAYS };
