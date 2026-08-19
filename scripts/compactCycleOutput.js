#!/usr/bin/env node
/**
 * compactCycleOutput.js — fold cycle-tagged output/ files into one archive
 * per cycle once that cycle is old enough that nothing reads it raw anymore.
 *
 * Design: docs/plans/2026-08-18-cycle-output-compaction.md (governance.50)
 *
 * Only the explicit SOURCE_GLOBS below are ever touched — this allow-list IS
 * the safety boundary, not a convenience default. output/recovered/ (the
 * Aug-11-wipe disaster-recovery set) is never eligible, even if a future
 * edit to SOURCE_GLOBS would otherwise match it.
 *
 * Usage:
 *   node scripts/compactCycleOutput.js                  # dry run (default)
 *   node scripts/compactCycleOutput.js --apply           # actually compact
 *   node scripts/compactCycleOutput.js --threshold 8      # override default 5
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const getCurrentCycle = require('../lib/getCurrentCycle');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output');
const ARCHIVE_DIR = path.join(OUTPUT_DIR, 'archive', 'cycle-output');
const DEFAULT_THRESHOLD = 5;
const DENYLIST = [path.join(OUTPUT_DIR, 'recovered')];

// Discovery pass, docs/plans/2026-08-18-cycle-output-compaction.md — verified
// 2026-08-18 against the live tree. Directories only; walked recursively.
const SOURCE_GLOBS = [
  'cron-compare',
  'cron-civic',
  'cron-civic/packets',
  'cron-civic/packs',
  'civic-voice',
  'civic-voice-packets',
  'city-civic-database/initiatives/baylight',
  'city-civic-database/initiatives/health-center',
  'city-civic-database/initiatives/oari',
  'city-civic-database/initiatives/stabilization-fund',
  'city-civic-database/initiatives/transit-hub',
  'city-civic-database/initiatives/youth-apprenticeship',
  'exchanges',
  'mara-directives',
  'notebooklm/daily',
  'slices',
].map((rel) => path.join(OUTPUT_DIR, rel));

function parseArgs(argv) {
  const args = { apply: false, threshold: DEFAULT_THRESHOLD };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') args.apply = true;
    else if (argv[i] === '--threshold') args.threshold = parseInt(argv[++i], 10);
  }
  return args;
}

function isDenied(absPath) {
  return DENYLIST.some((d) => absPath === d || absPath.startsWith(d + path.sep));
}

// Matches both filename shapes (_cNNN_, _cNNN.) and a literal cNNN/ path segment.
function cycleFromPath(relPath) {
  const nameMatch = relPath.match(/_c(\d+)[_.]/);
  if (nameMatch) return parseInt(nameMatch[1], 10);
  const dirMatch = relPath.match(/(?:^|\/)c(\d+)(?:\/|$)/);
  if (dirMatch) return parseInt(dirMatch[1], 10);
  return null;
}

function walk(dir, results) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return; // source glob doesn't exist yet — fine, nothing to compact there
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (isDenied(abs)) continue;
    if (entry.isDirectory()) {
      walk(abs, results);
    } else if (entry.isFile()) {
      results.push(abs);
    }
  }
}

// files: absolute paths -> { cycleNum: [absPath, ...] }
function groupByCycle(files) {
  const groups = {};
  for (const abs of files) {
    const rel = path.relative(OUTPUT_DIR, abs);
    const cycle = cycleFromPath(rel);
    if (cycle === null) continue; // not cycle-tagged — leave alone, not our scope
    if (!groups[cycle]) groups[cycle] = [];
    groups[cycle].push(abs);
  }
  return groups;
}

function archivePath(cycle) {
  return path.join(ARCHIVE_DIR, 'c' + cycle + '.tar.gz');
}

function isTracked(absPath) {
  const res = spawnSync('git', ['-C', ROOT, 'ls-files', '--error-unmatch', absPath], {
    encoding: 'utf-8',
  });
  return res.status === 0;
}

function compactCycle(cycle, files) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const dest = archivePath(cycle);
  const relFiles = files.map((f) => path.relative(ROOT, f));
  const listPath = path.join(ARCHIVE_DIR, '.c' + cycle + '.filelist');
  fs.writeFileSync(listPath, relFiles.join('\n') + '\n');

  const tarRes = spawnSync('tar', ['czf', dest, '-C', ROOT, '-T', listPath], {
    encoding: 'utf-8',
  });
  if (tarRes.status !== 0) {
    fs.unlinkSync(listPath);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    throw new Error('tar create failed for cycle ' + cycle + ': ' + (tarRes.stderr || '').slice(0, 400));
  }
  fs.unlinkSync(listPath);

  // Verify: archive must list exactly the files we swept before anything is deleted.
  const verifyRes = spawnSync('tar', ['tzf', dest], { encoding: 'utf-8' });
  if (verifyRes.status !== 0) {
    fs.unlinkSync(dest);
    throw new Error('tar verify failed for cycle ' + cycle + ': ' + (verifyRes.stderr || '').slice(0, 400));
  }
  const listedCount = verifyRes.stdout.trim().split('\n').filter(Boolean).length;
  if (listedCount !== relFiles.length) {
    fs.unlinkSync(dest);
    throw new Error(
      'tar verify count mismatch for cycle ' + cycle + ': swept ' + relFiles.length +
      ' but archive lists ' + listedCount + ' — aborting, raw files left in place'
    );
  }

  let bytesReclaimed = 0;
  let gitRemoved = 0;
  for (const abs of files) {
    bytesReclaimed += fs.statSync(abs).size;
    const tracked = isTracked(abs);
    fs.unlinkSync(abs);
    if (tracked) {
      const rmRes = spawnSync('git', ['-C', ROOT, 'rm', '--cached', '--quiet', abs], { encoding: 'utf-8' });
      if (rmRes.status === 0) gitRemoved++;
    }
  }

  return { archive: path.relative(ROOT, dest), files: files.length, bytesReclaimed, gitRemoved };
}

function main() {
  const args = parseArgs(process.argv);
  const cycle = getCurrentCycle({ soft: true, noArgv: true });
  if (cycle === null) {
    console.error('COMPACTION ABORTED: live cycle could not be resolved — never guessing.');
    process.exit(1);
  }

  const files = [];
  for (const dir of SOURCE_GLOBS) walk(dir, files);
  const groups = groupByCycle(files);

  const cycleNums = Object.keys(groups).map(Number).sort((a, b) => a - b);
  if (!cycleNums.length) {
    console.log('No cycle-tagged files found under the allow-listed source dirs.');
    return;
  }

  console.log('Live cycle: ' + cycle + ' | threshold: ' + args.threshold + ' | mode: ' + (args.apply ? 'APPLY' : 'DRY RUN'));
  console.log('');
  console.log('cycle\tfiles\teligible\talready-archived');

  let compactedAny = false;
  for (const n of cycleNums) {
    const eligible = (cycle - n) >= args.threshold;
    const already = fs.existsSync(archivePath(n));
    console.log(n + '\t' + groups[n].length + '\t' + eligible + '\t' + already);

    if (!args.apply || !eligible || already) continue;
    compactedAny = true;
    try {
      const result = compactCycle(n, groups[n]);
      console.log(
        '  -> compacted c' + n + ': ' + result.files + ' files, ' +
        (result.bytesReclaimed / 1024 / 1024).toFixed(1) + 'MB reclaimed, ' +
        result.gitRemoved + ' untracked from git index -> ' + result.archive
      );
    } catch (e) {
      console.error('  -> FAILED c' + n + ': ' + e.message);
    }
  }

  if (args.apply && !compactedAny) {
    console.log('');
    console.log('Nothing eligible this run.');
  }
}

main();
