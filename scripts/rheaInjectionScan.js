#!/usr/bin/env node
/**
 * rheaInjectionScan.js — Phase 40.6 Layer 6 (Rhea Sourcing Lane extension)
 *
 * Runs the Layer 4 contextScan regex set over every published article body
 * and citizen-quoted passage for a cycle, before the edition clears review.
 *
 * On match: exit code 2 (block publish). Rhea surfaces the matched pattern
 * and Mags must clear it explicitly.
 *
 * Scan targets for cycle {N}:
 *   output/desk-output/{desk}_c{N}.md       — per-desk article bodies
 *   editions/cycle_pulse_edition_{N}.txt    — compiled edition
 *   editions/supplemental_*_c{N}.txt        — any supplementals
 *
 * Usage:
 *   node scripts/rheaInjectionScan.js          # auto-detect cycle
 *   node scripts/rheaInjectionScan.js 91       # explicit cycle
 *   node scripts/rheaInjectionScan.js --files a.md b.txt   # explicit file list
 *
 * Exit codes:
 *   0 — all scanned files clean
 *   1 — usage / IO error
 *   2 — one or more files matched a threat pattern (publish blocked)
 *
 * Writes: output/rhea_injection_scan_c{N}.json
 *
 * Importable as module:
 *   const { scanCycle } = require('./scripts/rheaInjectionScan');
 *   const r = scanCycle(91);
 *   if (r.blocked) { ... }
 */

const fs = require('fs');
const path = require('path');

const contextScan = require('../lib/contextScan');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');

function resolveCycle() {
  const filesFlag = process.argv.indexOf('--files');
  if (filesFlag !== -1) return null;
  const argCycle = parseInt(process.argv[2], 10);
  if (!isNaN(argCycle)) return argCycle;
  try {
    const getCurrentCycle = require('../lib/getCurrentCycle');
    return getCurrentCycle();
  } catch (e) {
    throw new Error('Cycle required: pass as argv[2] or ensure lib/getCurrentCycle works.');
  }
}

function collectCycleFiles(cycle) {
  const files = [];

  const deskDir = path.join(OUTPUT_DIR, 'desk-output');
  if (fs.existsSync(deskDir)) {
    for (const name of fs.readdirSync(deskDir)) {
      if (name.endsWith(`_c${cycle}.md`) || name.endsWith(`_c${cycle}_deepseek.md`)) {
        files.push(path.join(deskDir, name));
      }
    }
  }

  const editionFile = path.join(PROJECT_ROOT, 'editions', `cycle_pulse_edition_${cycle}.txt`);
  if (fs.existsSync(editionFile)) files.push(editionFile);

  const editionsDir = path.join(PROJECT_ROOT, 'editions');
  if (fs.existsSync(editionsDir)) {
    const suffix = `_c${cycle}.txt`;
    for (const name of fs.readdirSync(editionsDir)) {
      if (name.startsWith('supplemental_') && name.endsWith(suffix)) {
        files.push(path.join(editionsDir, name));
      }
    }
  }

  return files;
}

function scanFiles(files) {
  const results = [];
  let blocked = false;

  for (const file of files) {
    const r = contextScan.scanFile(file);
    const entry = {
      path: path.relative(PROJECT_ROOT, file),
      safe: r.safe,
      matchCount: r.matches.length,
      matches: r.matches,
    };
    if (r.reason) entry.reason = r.reason;
    if (!r.safe) blocked = true;
    results.push(entry);
  }

  return { blocked, results };
}

function scanCycle(cycle) {
  const files = collectCycleFiles(cycle);
  const { blocked, results } = scanFiles(files);
  return {
    cycle,
    timestamp: new Date().toISOString(),
    scannedCount: files.length,
    blocked,
    files: results,
  };
}

function writeReport(report, reportPath) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

function printHuman(report) {
  console.log(`Rhea Injection Scan — cycle ${report.cycle || '(explicit)'}`);
  console.log(`Files scanned: ${report.scannedCount}`);
  console.log(`Status: ${report.blocked ? 'BLOCKED — injection pattern detected' : 'CLEAN'}`);
  for (const f of report.files) {
    const tag = f.safe ? '  ok  ' : '  HIT ';
    console.log(`${tag} ${f.path} (${f.matchCount} match${f.matchCount === 1 ? '' : 'es'})`);
    for (const m of f.matches) {
      console.log(`        patternId=${m.patternId} line=${m.lineNumber || '?'}`);
      console.log(`        excerpt: ${m.excerpt}`);
    }
  }
}

function main() {
  const filesFlag = process.argv.indexOf('--files');
  let report;
  let reportPath;

  if (filesFlag !== -1) {
    const explicitFiles = process.argv.slice(filesFlag + 1).filter(a => !a.startsWith('--'));
    if (explicitFiles.length === 0) {
      console.error('Usage: rheaInjectionScan.js --files <path...>');
      process.exit(1);
    }
    const { blocked, results } = scanFiles(explicitFiles.map(f => path.resolve(f)));
    report = {
      cycle: null,
      timestamp: new Date().toISOString(),
      scannedCount: explicitFiles.length,
      blocked,
      files: results,
    };
    reportPath = path.join(OUTPUT_DIR, 'rhea_injection_scan_adhoc.json');
  } else {
    const cycle = resolveCycle();
    report = scanCycle(cycle);
    reportPath = path.join(OUTPUT_DIR, `rhea_injection_scan_c${cycle}.json`);
  }

  writeReport(report, reportPath);
  printHuman(report);
  console.log(`\nReport: ${path.relative(PROJECT_ROOT, reportPath)}`);

  if (report.blocked) process.exit(2);
  process.exit(0);
}

module.exports = {
  scanCycle,
  scanFiles,
  collectCycleFiles,
};

if (require.main === module) {
  main();
}
