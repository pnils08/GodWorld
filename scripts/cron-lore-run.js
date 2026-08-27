#!/usr/bin/env node
'use strict';

/**
 * Weekly lore-writer cron (pipeline.56). Generation only, by design
 * (docs/plans/2026-08-15-lore-writer.md: "nothing moves out of quarantine
 * without Rhea passing and a human read" -- and .claude/skills/lore-ingest/
 * SKILL.md: grading is never delegated to agy or any scripted process,
 * Rhea/Claude only). This script picks the week's target, runs loreWriter.js
 * against it, and writes a status file for the next research-build session
 * to pick up at /lore-ingest -- it never grades or ingests anything itself.
 *
 * Usage: node scripts/cron-lore-run.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const QUARANTINE_DIR = path.join(ROOT, 'output', 'lore-quarantine');
const STATUS_PATH = path.join(ROOT, 'output', 'lore-cron-status.json');
const { loadLedgerCandidates, loadAlreadyLoredPopids, pickNext, loadCursor, saveCursor } = require('./loreTargetSelect');

function buildPrompt(target) {
  return (
    'Write a ledger-grounded deep-dive on ' + target.name + ' (' + target.popid + '). ' +
    'Call query_ledger for every named person before writing them, including ' + target.name +
    ' themselves -- confirm role, age, neighborhood, household, and family from the ledger ' +
    'before a word of prose. Use read_canon for any place, org, or venue you name. Invent texture ' +
    'freely -- interiority, dialogue, sensory detail -- but never a fact a ledger query could contradict. ' +
    'Cycle tags are Y<n>C<m> only, never a bare cycle number and never a calendar year.'
  );
}

function listQuarantineFiles() {
  if (!fs.existsSync(QUARANTINE_DIR)) return new Set();
  return new Set(fs.readdirSync(QUARANTINE_DIR).filter((f) => f.endsWith('.md')));
}

function writeStatus(status) {
  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2) + '\n');
}

function main() {
  const dryRun = process.argv.includes('--dry-run');

  const candidates = loadLedgerCandidates();
  const lored = loadAlreadyLoredPopids();
  const cursor = loadCursor();
  const target = pickNext(candidates, lored, cursor);

  console.log('Lore cron target: ' + target.name + ' (' + target.popid + ', Tier ' + target.tier + ')');

  if (dryRun) {
    console.log('--dry-run: not calling loreWriter.js, not advancing the cursor.');
    return;
  }

  const prompt = buildPrompt(target);
  const before = listQuarantineFiles();

  let output = '';
  let ok = true;
  let errorMessage = null;
  try {
    output = execFileSync('node', [path.join(ROOT, 'scripts', 'loreWriter.js'), prompt], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    ok = false;
    errorMessage = error.message;
    output = (error.stdout || '') + (error.stderr || '');
  }

  const after = listQuarantineFiles();
  const newFiles = [...after].filter((f) => !before.has(f));

  if (ok) {
    saveCursor({ lastPopid: target.popid, updatedAt: new Date().toISOString() });
  }

  const status = {
    ranAt: new Date().toISOString(),
    target,
    ok,
    errorMessage,
    newQuarantineFiles: newFiles,
    nextStep: ok && newFiles.length
      ? 'Run /lore-ingest on ' + newFiles.join(', ') + ' at next research-build session.'
      : ok
        ? 'loreWriter.js exited clean but produced no new quarantine file -- read the log before assuming nothing happened.'
        : 'loreWriter.js run failed -- see errorMessage and logs/lore-cron.log.',
  };
  writeStatus(status);

  console.log(output);
  console.log('Status written to ' + path.relative(ROOT, STATUS_PATH));
  if (!ok) process.exitCode = 1;
}

main();
