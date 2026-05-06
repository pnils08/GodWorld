#!/usr/bin/env node
/**
 * diskInventory.js — Phase 1 of the /disk-audit pipeline.
 *
 * Walks `/root` (or a configurable root), skips an explicit ignorelist of
 * plugin/runtime caches and lock/wal artifacts, and emits a single JSON
 * manifest at `output/disk_inventory_<YYYY-MM-DD>.json`.
 *
 * Read-only end-to-end — never mutates a single byte on disk outside the
 * output JSON.
 *
 * Plan: docs/plans/2026-05-05-disk-inventory-and-dead-file-detection.md
 * Sibling tools (narrower scope, kept separate per Q4):
 *   - scripts/scanDeadCode.js (function-level)
 *   - scripts/mdStalenessDetector.js (docs/ only)
 *
 * Usage:
 *   node scripts/diskInventory.js                  # walk /root, write manifest
 *   node scripts/diskInventory.js --dry-run        # walk + summarize, no file write
 *   node scripts/diskInventory.js --root /path     # alt root (testing)
 *   node scripts/diskInventory.js --max-seconds 90 # tighter budget
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Ignorelist — Q1.1 (S203 fix: split into BASENAMES + PREFIXES)
//
// IGNORE_BASENAMES matches a directory by NAME wherever it appears in the
// tree. Catches nested vendor/cache dirs (e.g. dashboard/node_modules) that
// path-prefix matching missed in the first dry-run.
//
// IGNORE_PREFIXES matches a path RELATIVE to the walk root. Used for layouts
// that are only meaningful at a specific location (claude-code cache shape).
// Trailing slash signals directory-prefix match.
// ---------------------------------------------------------------------------

const IGNORE_BASENAMES = new Set([
  // Package + build caches — regenerable from manifests, never authored
  'node_modules',           // npm/yarn/pnpm install artifact (vendor code)
  '.git',                   // git internals; not project content we audit
  '.cache',                 // generic cache dir wherever it appears
  '.npm',                   // npm download/build cache
  '.bun',                   // bun runtime + install cache
  '.cargo',                 // Rust toolchain cache
  '.rustup',                // Rust installer state
  '.pyenv',                 // Python version manager
  '.nvm',                   // Node version manager
  'dist',                   // bundler output
  'build',                  // generic build output
  'coverage',               // test coverage reports
  '.next',                  // Next.js build cache
  '__pycache__',            // Python bytecode cache (anywhere in tree)
  '.pytest_cache',          // pytest run cache
  '.mypy_cache',            // mypy type-check cache
  '.ruff_cache',            // ruff linter cache
  // claude-code edit-history snapshots — per-edit backups, not authored
  'file-history',
  // Browser cache — runtime state, never authored. Caught .config/google-chrome
  // leaking ~80 MB of model.tflite + optimization_guide_model_store + Safe
  // Browsing stores into the orphan report.
  'google-chrome',
  'chromium',
  'BraveSoftware',
]);

const IGNORE_PREFIXES = [
  // Path-anchored locations that aren't basename-universal
  '.local/share/uv/',                // uv (Python package manager) cache
  '.local/share/pnpm/',              // pnpm content-addressed store
  '.pki/',                           // crypto trust store cache
  '.ssh/known_hosts.old',            // ssh ephemera
  // Vector DB + LLM runtime caches (not authored content)
  '.claude-mem/chroma/',             // claude-mem vector store binaries
  '.claude-mem/embeddings-cache/',   // embedding cache
  // Per-claude-code-session ephemera (path-anchored under .claude/)
  '.claude/projects/',               // per-session JSONL transcripts (auto-rotated)
  '.claude/statsig/',                // telemetry batch files
  '.claude/plugins/cache/',          // plugin install cache
  '.claude/plugins/marketplaces/',   // plugin marketplace metadata
  '.claude/todos/',                  // ephemeral task-tracker state
];

const IGNORE_EXTENSIONS = new Set([
  // Lock files — auto-regenerated, not authored
  '.lock',
  // SQLite WAL/SHM — runtime journal artifacts, regenerated on next write
  '.sqlite-shm',
  '.sqlite-wal',
  '.db-shm',
  '.db-wal',
  // Tempfiles
  '.tmp',
  // Compiled Python — regenerable from .py
  '.pyc',
  // Compiled Node native — regenerable from build
  '.node',
]);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { root: '/root', dryRun: false, maxSeconds: 120 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--root') args.root = argv[++i];
    else if (a === '--max-seconds') args.maxSeconds = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/diskInventory.js [--dry-run] [--root PATH] [--max-seconds N]');
      process.exit(0);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Git tracked-set — built ONCE per advisor steer (S203). Lookup is O(1)
// vs O(fork) for `git ls-files --error-unmatch <path>` per file.
// ---------------------------------------------------------------------------

function buildGitTrackedSet(repoRoot) {
  // GodWorld is the only git repo under /root we audit. Other paths return false.
  if (!fs.existsSync(path.join(repoRoot, '.git'))) return new Set();
  try {
    const out = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const set = new Set();
    for (const rel of out.split('\n')) {
      if (rel) set.add(path.join(repoRoot, rel));
    }
    return set;
  } catch (err) {
    console.error(`[diskInventory] git ls-files failed in ${repoRoot}: ${err.message}`);
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// Hash — sha1 truncated to 12 chars per Q1. Caps read size at 8 MiB to
// keep the budget honest on huge artifacts (PDFs, video).
// ---------------------------------------------------------------------------

const SHA_READ_CAP = 8 * 1024 * 1024;

function sha1Trunc12(absPath, sizeBytes) {
  try {
    const fd = fs.openSync(absPath, 'r');
    try {
      const len = Math.min(sizeBytes, SHA_READ_CAP);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, 0);
      const h = crypto.createHash('sha1').update(buf).digest('hex');
      return h.slice(0, 12);
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    return null; // permission / vanished mid-walk — record as null, not crash
  }
}

// ---------------------------------------------------------------------------
// Walker — recursive, dirent-driven, symlink-skipping.
// ---------------------------------------------------------------------------

function shouldIgnoreDir(relDir) {
  for (const pref of IGNORE_PREFIXES) {
    if (relDir === pref.slice(0, -1) || relDir.startsWith(pref)) return true;
  }
  return false;
}

function walk(rootAbs, gitTracked, deadline) {
  const entries = [];
  const ignoredDirs = new Set();
  const ignoredFiles = { byExtension: 0, bySymlink: 0 };

  function recurse(absDir) {
    if (Date.now() > deadline) {
      throw new Error('BUDGET_EXCEEDED');
    }
    const relDir = path.relative(rootAbs, absDir);
    if (relDir && shouldIgnoreDir(relDir + '/')) {
      ignoredDirs.add(relDir);
      return;
    }

    let dirents;
    try {
      dirents = fs.readdirSync(absDir, { withFileTypes: true });
    } catch (err) {
      // Permission denied / vanished — record + continue
      return;
    }

    for (const dirent of dirents) {
      const absPath = path.join(absDir, dirent.name);

      // Skip symlinks explicitly (advisor steer S203 — prevent escape from root)
      if (dirent.isSymbolicLink()) {
        ignoredFiles.bySymlink++;
        continue;
      }

      if (dirent.isDirectory()) {
        // Basename-universal skip (matches the dir name anywhere in the tree).
        // Catches GodWorld/node_modules, .claude/file-history, dashboard/node_modules, etc.
        if (IGNORE_BASENAMES.has(dirent.name)) {
          ignoredDirs.add(path.relative(rootAbs, absPath));
          continue;
        }
        recurse(absPath);
      } else if (dirent.isFile()) {
        const ext = path.extname(dirent.name);
        if (IGNORE_EXTENSIONS.has(ext)) {
          ignoredFiles.byExtension++;
          continue;
        }

        let stat;
        try {
          stat = fs.statSync(absPath);
        } catch {
          continue; // vanished mid-walk
        }

        const relPath = path.relative(rootAbs, absPath);
        entries.push({
          path: relPath,
          size: stat.size,
          ext: ext || '',
          mtime: Math.floor(stat.mtimeMs),
          sha1: sha1Trunc12(absPath, stat.size),
          gitTracked: gitTracked.has(absPath),
        });
      }
      // dirent.isBlockDevice / isCharacterDevice / isFIFO / isSocket — skip silently
    }
  }

  recurse(rootAbs);
  return { entries, ignoredDirs: [...ignoredDirs].sort(), ignoredFiles };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);
  const rootAbs = path.resolve(args.root);
  if (!fs.existsSync(rootAbs)) {
    console.error(`[diskInventory] root does not exist: ${rootAbs}`);
    process.exit(1);
  }

  const start = Date.now();
  const deadline = start + args.maxSeconds * 1000;

  // Build tracked-set for the GodWorld repo (the only git repo we audit).
  const godworldRoot = path.join(rootAbs, 'GodWorld');
  const gitTracked = buildGitTrackedSet(godworldRoot);

  let result;
  try {
    result = walk(rootAbs, gitTracked, deadline);
  } catch (err) {
    if (err.message === 'BUDGET_EXCEEDED') {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.error(`BUDGET EXCEEDED: walked aborted at ${elapsed}s (limit ${args.maxSeconds}s)`);
      process.exit(1);
    }
    throw err;
  }

  const elapsedMs = Date.now() - start;
  const totalBytes = result.entries.reduce((sum, e) => sum + e.size, 0);
  const totalGB = (totalBytes / (1024 ** 3)).toFixed(2);

  const date = new Date().toISOString().slice(0, 10);
  const manifest = {
    generatedAt: new Date().toISOString(),
    root: rootAbs,
    elapsedMs,
    fileCount: result.entries.length,
    totalBytes,
    ignored: {
      dirs: result.ignoredDirs,
      filesByExtension: result.ignoredFiles.byExtension,
      filesBySymlink: result.ignoredFiles.bySymlink,
    },
    gitTrackedCount: gitTracked.size,
    entries: result.entries,
  };

  if (args.dryRun) {
    console.log(`[dry-run] Inventory: ${manifest.fileCount} files, ${totalGB} GB, ${(elapsedMs / 1000).toFixed(1)}s`);
    console.log(`[dry-run] Git-tracked (GodWorld): ${manifest.gitTrackedCount}`);
    console.log(`[dry-run] Ignored dirs: ${result.ignoredDirs.length}`);
    console.log(`[dry-run] Ignored by ext: ${result.ignoredFiles.byExtension}`);
    console.log(`[dry-run] Ignored symlinks: ${result.ignoredFiles.bySymlink}`);
    return;
  }

  const outDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `disk_inventory_${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  console.log(`Inventory: ${manifest.fileCount} files, ${totalGB} GB, written to ${outPath}`);
  console.log(`Elapsed: ${(elapsedMs / 1000).toFixed(1)}s | Git-tracked: ${manifest.gitTrackedCount}`);
}

if (require.main === module) main();

module.exports = { IGNORE_PREFIXES, IGNORE_EXTENSIONS, buildGitTrackedSet, sha1Trunc12 };
