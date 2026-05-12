#!/usr/bin/env node
/**
 * run-tests.js — walk scripts/ and lib/ for *.test.js, run each in a fresh
 * node process, aggregate exit codes.
 *
 * Phase 1 of [[../docs/plans/2026-05-12-test-coverage-rollout]] — test runner
 * foundation. Existing test files use the exit-code pattern (console.log +
 * process.exit(0|1)) rather than Node's built-in test runner API. This walker
 * preserves that pattern while giving us a single entry point (`npm test`).
 *
 * Usage:
 *   node scripts/run-tests.js              # run all
 *   node scripts/run-tests.js --filter X   # only files containing X in path
 *
 * Exit 0 if all test files pass; exit 1 if any fail (CI-compatible).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SEARCH_DIRS = ['scripts', 'lib'];
const SKIP_DIRS = new Set(['node_modules', 'graphify-out', '.git']);

function findTests(relDir, out = []) {
  const full = path.join(ROOT, relDir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(full, entry.name);
    if (entry.isDirectory()) {
      findTests(path.relative(ROOT, p), out);
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      out.push(p);
    }
  }
  return out;
}

function colorize(s, code) {
  return process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s;
}
const green = s => colorize(s, '32');
const red = s => colorize(s, '31');
const dim = s => colorize(s, '2');
const bold = s => colorize(s, '1');

const filterArg = process.argv.find(a => a.startsWith('--filter='));
const filter = filterArg ? filterArg.split('=')[1] : null;

let tests = SEARCH_DIRS.flatMap(d => findTests(d));
if (filter) tests = tests.filter(t => t.includes(filter));
tests.sort();

if (tests.length === 0) {
  console.log('No *.test.js files found' + (filter ? ` matching "${filter}"` : '') + '.');
  process.exit(0);
}

console.log(bold(`Running ${tests.length} test file${tests.length === 1 ? '' : 's'}\n`));

const startTime = Date.now();
const failed = [];

for (const t of tests) {
  const rel = path.relative(ROOT, t);
  console.log(bold(`▶ ${rel}`));
  const t0 = Date.now();
  const result = spawnSync('node', [t], { stdio: 'inherit', cwd: ROOT });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  if (result.status !== 0) {
    console.log(red(`✗ FAILED: ${rel}`) + dim(` (${elapsed}s)\n`));
    failed.push(rel);
  } else {
    console.log(green(`✓ ${rel}`) + dim(` (${elapsed}s)\n`));
  }
}

const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(bold('─'.repeat(60)));
if (failed.length === 0) {
  console.log(green(bold(`✓ ${tests.length}/${tests.length} test files passed`)) + dim(` (${totalElapsed}s)`));
  process.exit(0);
} else {
  console.log(red(bold(`✗ ${failed.length}/${tests.length} test files failed`)) + dim(` (${totalElapsed}s)`));
  failed.forEach(f => console.log(red(`  - ${f}`)));
  process.exit(1);
}
