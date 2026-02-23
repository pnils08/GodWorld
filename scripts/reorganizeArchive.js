#!/usr/bin/env node
/**
 * reorganizeArchive.js — Archive File Reorganizer
 *
 * Reads output/article-index.json and moves/renames files into a clean
 * archive structure:
 *   archive/articles/     — all articles, flat, renamed
 *   archive/editions/     — full editions (copied from editions/)
 *   archive/non-articles/ — everything else, organized by type
 *
 * Usage:
 *   node scripts/reorganizeArchive.js              # dry-run (default)
 *   node scripts/reorganizeArchive.js --execute     # actually move files
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, renameSync } from 'fs';
import { join, dirname, relative, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const executeMode = process.argv.includes('--execute');
const indexPath = join(ROOT, 'output/article-index.json');

if (!existsSync(indexPath)) {
  console.error('Error: output/article-index.json not found.');
  console.error('Run: node scripts/buildArticleIndex.js --write');
  process.exit(1);
}

const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
const entries = index.entries;

// Target directories
const ARCHIVE = join(ROOT, 'archive');
const ARTICLES_DIR = join(ARCHIVE, 'articles');
const EDITIONS_DIR = join(ARCHIVE, 'editions');
const NON_ARTICLES = join(ARCHIVE, 'non-articles');

// Non-article subdirectories by classification
const NON_ARTICLE_DIRS = {
  template: join(NON_ARTICLES, 'templates'),
  mirror: join(NON_ARTICLES, 'mirrors'),
  index: join(NON_ARTICLES, 'indexes'),
  profile: join(NON_ARTICLES, 'profiles'),
  data: join(NON_ARTICLES, 'data'),
  assignment: join(NON_ARTICLES, 'assignments'),
  unknown: join(NON_ARTICLES, 'unknown'),
};

// ---------------------------------------------------------------------------
// Build move plan
// ---------------------------------------------------------------------------

const moves = [];
const skipped = [];
const usedTargets = new Set();

for (const entry of entries) {
  const srcPath = join(ROOT, entry.originalPath);

  // Skip duplicates — they stay in place (or get cleaned up separately)
  if (entry.isDuplicate) {
    skipped.push({ id: entry.id, reason: 'duplicate', path: entry.originalPath });
    continue;
  }

  let targetPath;

  if (entry.classification === 'edition') {
    // Editions keep their original filename
    targetPath = join(EDITIONS_DIR, basename(srcPath));
  } else if (entry.classification === 'supplemental') {
    // Supplementals get renamed if they have a newFilename, otherwise keep original
    const fname = entry.newFilename || basename(srcPath);
    targetPath = join(EDITIONS_DIR, fname);
  } else if (entry.classification === 'article') {
    if (entry.newFilename) {
      targetPath = join(ARTICLES_DIR, entry.newFilename);
    } else {
      // No rename possible — use original filename
      targetPath = join(ARTICLES_DIR, basename(srcPath));
    }
  } else {
    // Non-article — route to typed subdirectory
    const subDir = NON_ARTICLE_DIRS[entry.classification] || NON_ARTICLE_DIRS.unknown;
    targetPath = join(subDir, basename(srcPath));
  }

  // Handle collisions
  let finalTarget = targetPath;
  let counter = 2;
  while (usedTargets.has(finalTarget)) {
    const ext = '.txt';
    const base = finalTarget.slice(0, -ext.length).replace(/-\d+$/, '');
    finalTarget = `${base}-${counter}${ext}`;
    counter++;
  }
  usedTargets.add(finalTarget);

  moves.push({
    id: entry.id,
    classification: entry.classification,
    from: entry.originalPath,
    to: relative(ROOT, finalTarget),
    srcFull: srcPath,
    dstFull: finalTarget,
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`Archive Reorganization Plan`);
console.log(`==========================\n`);

// Group moves by target directory
const byDir = {};
for (const m of moves) {
  const dir = dirname(m.to).split('/')[0] + '/' + (dirname(m.to).split('/')[1] || '');
  byDir[dir] = (byDir[dir] || 0) + 1;
}

console.log('Target directory breakdown:');
for (const [dir, count] of Object.entries(byDir).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${dir.padEnd(30)} ${count} files`);
}

console.log(`\nTotal moves:   ${moves.length}`);
console.log(`Skipped dupes: ${skipped.length}`);

// Show sample moves
console.log('\nSample moves (first 15):');
for (const m of moves.slice(0, 15)) {
  console.log(`  [${m.classification}] ${m.from}`);
  console.log(`    → ${m.to}`);
}

if (moves.length > 15) {
  console.log(`  ... and ${moves.length - 15} more`);
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

if (executeMode) {
  console.log('\nExecuting moves...\n');

  // Create all target directories
  const allDirs = new Set(moves.map(m => dirname(m.dstFull)));
  for (const d of allDirs) {
    mkdirSync(d, { recursive: true });
  }

  let success = 0;
  let errors = 0;
  const log = [];

  for (const m of moves) {
    try {
      if (!existsSync(m.srcFull)) {
        console.warn(`  SKIP (missing): ${m.from}`);
        log.push({ ...m, status: 'missing' });
        errors++;
        continue;
      }

      // Copy file (don't delete original — safety first)
      copyFileSync(m.srcFull, m.dstFull);
      log.push({ ...m, status: 'copied' });
      success++;
    } catch (e) {
      console.error(`  ERROR: ${m.from} → ${e.message}`);
      log.push({ ...m, status: 'error', error: e.message });
      errors++;
    }
  }

  // Write move log
  const logPath = join(ARCHIVE, 'reorganize-log.json');
  writeFileSync(logPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalMoves: moves.length,
    success,
    errors,
    skippedDuplicates: skipped.length,
    moves: log,
  }, null, 2));

  console.log(`\nDone: ${success} copied, ${errors} errors`);
  console.log(`Log: ${relative(ROOT, logPath)}`);
  console.log(`\nOriginal files are preserved. Review archive/ and delete originals when satisfied.`);
} else {
  console.log('\n[DRY RUN] No files moved. Use --execute to reorganize.');
}
