#!/usr/bin/env node
'use strict';

/**
 * Pre-Saturday coverage sweep — scripts/preSaturdayCoverageSweep.js
 *
 * S417 (Mike-direct): the write stage can leave a reporter stuck — a crashed
 * subprocess, an interrupted run, whatever — with a finished report/angle
 * artifact on disk but no `.staged.*` pair, and nothing ever retries them.
 * cron-desk-run.js already has a documented one-off recovery command
 * (`--stage=write --desk <D> --persona <P>`, see notifyFanoutFailures' Discord
 * ping), but running it depends on a human reading a ping and typing it in.
 * This script finds anyone in that state for the LIVE cycle and runs that
 * exact recovery automatically, once, before Saturday's compile locks the
 * cycle in.
 *
 * Deliberately NOT trying to diagnose or fix why each one got stuck --
 * failure modes vary (a crashed write subprocess, a write that produced a
 * draft but never reached Rhea, a report that's still mid-pipeline for
 * today). One retry of the standard write stage is cheap, safe (fails
 * closed exactly like the first attempt if the piece is genuinely bad), and
 * doesn't require knowing the root cause. A persona still uncovered after
 * the retry is recorded in the status file -- there is no editorial review
 * step downstream of that (checked, S417: `/sift` never reads flagged/;
 * flagged pieces only ever get *mentioned*, in the Discord delivery ping and
 * the daily NotebookLM brief). Whether that gets read is on a person, same
 * as before this script existed -- this only stops the automatable half
 * (the retry) from being missed too.
 *
 * Also runs reconcileRheaDisposition.js for the live cycle first (S417
 * follow-up) -- that script already existed to file a standalone Rhea
 * verdict into staged/flagged, but was on no schedule, so a verdict from a
 * manual re-review or a write that crashed after writing its .rhea.json but
 * before filing just sat there, invisible to everything downstream.
 *
 * Idempotent across re-runs within the same cycle: an attempted-list file
 * remembers who's already been retried this cycle, so running this twice
 * before Saturday (or by hand) never double-fires the same persona. The
 * reconcile pass is separately idempotent (a no-op once nothing's changed).
 *
 * Usage:
 *   node scripts/preSaturdayCoverageSweep.js [--dry-run] [--min-age-hours N]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const getCurrentCycle = require('../lib/getCurrentCycle');

const ROOT = path.join(__dirname, '..');
const COMPARE = path.join(ROOT, 'output', 'cron-compare');
const STAGED = path.join(COMPARE, 'staged');
// Report -> write is normally same-day, roughly a 5-hour gap (report ~13:15-20,
// write ~18:15-20, observed across weeks of real runs) -- 8h clears that with
// margin so this never preempts a persona's own scheduled write wake still to
// come today, while staying well under the ~24h a Monday-through-Friday week
// puts between the earliest report and Saturday noon.
const DEFAULT_MIN_AGE_HOURS = 8;

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

// Every report-stage-complete artifact for this cycle: <desk>_c<cycle>_<persona>_packet-v2_story.md.
// Report-complete is the signal a write attempt was expected -- report is the
// stage immediately before write, so its presence means the pipeline reached
// this persona and had something to hand write, whatever happened after.
function loadReportComplete(cycle) {
  if (!fs.existsSync(COMPARE)) return [];
  const re = new RegExp('^([a-z]+)_c' + cycle + '_([a-z0-9-]+)_packet-v2_story\\.md$');
  const out = [];
  for (const f of fs.readdirSync(COMPARE)) {
    const m = f.match(re);
    if (!m) continue;
    const full = path.join(COMPARE, f);
    out.push({
      stem: f.replace(/_story\.md$/, ''),
      desk: m[1],
      persona: m[2],
      reportPath: full,
      reportAgeHours: (Date.now() - fs.statSync(full).mtimeMs) / 3600000,
    });
  }
  return out;
}

// Staged stems carry a model-tag suffix the report stem doesn't
// (`..._packet-v2_deepseek-deepseek-chat.staged.json`), so match by prefix.
function loadStagedStems() {
  if (!fs.existsSync(STAGED)) return [];
  return fs.readdirSync(STAGED)
    .filter(f => f.endsWith('.staged.json'))
    .map(f => f.replace(/\.staged\.json$/, ''));
}

function isCovered(stem, stagedStems) {
  return stagedStems.some(s => s.startsWith(stem));
}

function attemptedPath(cycle) {
  return path.join(COMPARE, '.pre-saturday-sweep-attempted-c' + cycle + '.json');
}

function loadAttempted(cycle) {
  try {
    return new Set(JSON.parse(fs.readFileSync(attemptedPath(cycle), 'utf8')));
  } catch (_) {
    return new Set();
  }
}

function saveAttempted(cycle, set) {
  fs.writeFileSync(attemptedPath(cycle), JSON.stringify([...set], null, 2) + '\n');
}

// S417 (Mike-direct): reconcileRheaDisposition.js existed but was on no
// schedule -- a standalone verdict (a manual re-review, a write that crashed
// after writing its .rhea.json but before filing) just sat there forever,
// neither staged nor flagged, invisible to everything downstream. Running it
// for the whole live cycle before the stuck-detection pass below is safe to
// repeat: reconcileVerdict() is a no-op on a verdict whose draft hash already
// matches what's filed, and only re-files when something actually changed.
function runReconcile(cycle, dryRun) {
  console.log('\n[reconcile] sweeping unfiled Rhea verdicts for cycle ' + cycle + '...');
  const args = [path.join(ROOT, 'scripts', 'reconcileRheaDisposition.js'), '--cycle', String(cycle)];
  if (!dryRun) args.push('--apply');
  // reconcileRheaDisposition.js sets a nonzero exit whenever ANY verdict in
  // the cycle fails (e.g. a stale verdict whose draft has since been
  // overwritten by something else -- a correct refusal, not a crash), even
  // though every other verdict that turn still gets processed. Capture
  // stdout/stderr separately instead of letting execFileSync's thrown error
  // (which only carries a truncated message) hide what actually happened.
  const result = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8' });
  const out = (result.stdout || '').trim();
  const err = (result.stderr || '').trim();
  if (out) console.log(out.split('\n').map(l => '  ' + l).join('\n'));
  if (result.status === 0) {
    console.log('  (all verdicts for this cycle reconciled clean)');
  } else {
    console.log('  (' + (err.split('\n').filter(l => l.startsWith('BLOCKED')).length || 'some') +
      ' verdict(s) blocked -- see BLOCKED lines above; usually a stale verdict ' +
      'whose draft changed since, which is a correct refusal, not a failure)');
    if (err) console.log(err.split('\n').map(l => '  ' + l).join('\n'));
  }
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const minAgeHours = parseFloat(arg('--min-age-hours', String(DEFAULT_MIN_AGE_HOURS)));
  const cycle = getCurrentCycle({ soft: true });
  if (cycle === null) {
    console.error('[sweep] no resolvable live cycle -- exiting clean (nothing to sweep).');
    return;
  }

  runReconcile(cycle, dryRun);

  const reportComplete = loadReportComplete(cycle);
  const stagedStems = loadStagedStems();
  const attempted = loadAttempted(cycle);

  const candidates = reportComplete.filter(r => !isCovered(r.stem, stagedStems));
  const dueForRetry = candidates.filter(r => r.reportAgeHours >= minAgeHours && !attempted.has(r.stem));
  const tooFresh = candidates.filter(r => r.reportAgeHours < minAgeHours);
  const alreadyRetried = candidates.filter(r => r.reportAgeHours >= minAgeHours && attempted.has(r.stem));

  console.log('Pre-Saturday coverage sweep -- cycle ' + cycle);
  console.log('===================================');
  console.log(reportComplete.length + ' report-complete this cycle, ' +
    (reportComplete.length - candidates.length) + ' already staged, ' +
    candidates.length + ' uncovered.');
  if (tooFresh.length) {
    console.log('Skipping (report younger than ' + minAgeHours + 'h, likely still mid-pipeline today): ' +
      tooFresh.map(r => r.stem).join(', '));
  }
  if (alreadyRetried.length) {
    console.log('Already retried this cycle, not repeating: ' + alreadyRetried.map(r => r.stem).join(', '));
  }
  if (!dueForRetry.length) {
    console.log('Nothing due for retry.');
    return;
  }

  const results = [];
  for (const r of dueForRetry) {
    console.log('\n[retry] ' + r.stem + ' -- desk=' + r.desk + ' persona=' + r.persona +
      ' (report ' + r.reportAgeHours.toFixed(1) + 'h old)');
    if (dryRun) {
      console.log('  [DRY] would run: node scripts/cron-desk-run.js --desk ' + r.desk +
        ' --persona ' + r.persona + ' --stage=write');
      continue;
    }
    attempted.add(r.stem);
    let ok = true;
    let errorMessage = null;
    try {
      execFileSync('node', [
        path.join(ROOT, 'scripts', 'cron-desk-run.js'),
        '--desk', r.desk, '--persona', r.persona, '--stage=write',
      ], { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
    } catch (error) {
      ok = false;
      errorMessage = error.message;
    }
    const nowStaged = isCovered(r.stem, loadStagedStems());
    console.log('  ' + (nowStaged ? '[covered]' : '[still uncovered]') +
      ' after retry (subprocess ' + (ok ? 'exited clean' : 'errored') + ')');
    results.push({ stem: r.stem, desk: r.desk, persona: r.persona, ok, errorMessage, staged: nowStaged });
  }

  if (!dryRun) saveAttempted(cycle, attempted);

  const statusPath = path.join(ROOT, 'output', 'pre-saturday-sweep-status.json');
  fs.writeFileSync(statusPath, JSON.stringify({
    ranAt: new Date().toISOString(),
    cycle,
    reportComplete: reportComplete.length,
    candidates: candidates.map(r => r.stem),
    retried: results,
    stillUncovered: results.filter(r => !r.staged).map(r => r.stem),
  }, null, 2) + '\n');
  console.log('\nStatus written to ' + path.relative(ROOT, statusPath));

  const stillUncovered = results.filter(r => !r.staged);
  if (stillUncovered.length) {
    console.log('\n=== ' + stillUncovered.length + ' still uncovered after retry -- needs a human at /sift: ' +
      stillUncovered.map(r => r.stem).join(', ') + ' ===');
  }
}

if (require.main === module) {
  main();
}

module.exports = { loadReportComplete, loadStagedStems, isCovered };
