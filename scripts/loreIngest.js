#!/usr/bin/env node
/**
 * loreIngest.js — promote a graded lore piece out of quarantine (pipeline.59)
 *
 * Task 4 (pipeline.59): grading is never delegated to agy — Rhea/Claude only.
 * This script does NOT grade. It consumes a verdict already produced by the Rhea gate and executes
 * the mechanical branch, so no model outside the Rhea/Claude lane can ever
 * decide what enters canon (MODEL_HIERARCHY.md §4, goal-substitution risk).
 *
 *   PASS -> BOTH canon stores, exactly as a published edition gets both:
 *             notebooklmPush.js --kind lore --no-audio   (NotebookLM, canon authority)
 *             ingestEdition.js  --type lore --cycle <N>  (bay-tribune, searchable)
 *           then records the returned source id + its decision into
 *           scripts/notebooklmCanonSources.json's allowedLoreSourceIds bucket.
 *   FAIL -> output/lore-quarantine/_rejected.log only. Neither ingest path is
 *           called. NotebookLM has no post-ingestion review step, so the whole
 *           safety burden sits on this gate.
 *
 * Usage:
 *   node scripts/loreIngest.js --file <path> --verdict pass --tag Y2C103 [--dry-run]
 *   node scripts/loreIngest.js --file <path> --verdict fail --reason "<why Rhea failed it>"
 *
 * --tag is authoritative and comes from the grading step. A lore piece
 * legitimately names several cycles in its body (POP-00132 carries Y2C49 and
 * Y2C51 but is placed at C103), so scanning the text for a cycle is a warned
 * fallback inside notebooklmPush.js, never the source of record here.
 *
 * Plan: docs/plans/2026-08-17-lore-canon-ingest-pipeline.md
 */

require('/root/GodWorld/lib/env');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = '/root/GodWorld';
const POLICY_PATH = path.join(ROOT, 'scripts/notebooklmCanonSources.json');
const REJECTED_LOG = path.join(ROOT, 'output/lore-quarantine/_rejected.log');

function fail(msg) {
  console.error('[ERROR] ' + msg);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--file') args.file = argv[++i];
    else if (argv[i] === '--verdict') args.verdict = argv[++i];
    else if (argv[i] === '--tag') args.tag = argv[++i];
    else if (argv[i] === '--reason') args.reason = argv[++i];
    else if (argv[i] === '--grader') args.grader = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else fail('unknown argument: ' + argv[i]);
  }
  if (!args.file) fail('--file <path> is required');
  if (!fs.existsSync(args.file)) fail('file not found: ' + args.file);
  if (args.verdict !== 'pass' && args.verdict !== 'fail') {
    fail('--verdict must be pass or fail (produced by the Rhea gate, never by this script)');
  }
  if (args.verdict === 'pass' && !args.tag) fail('--tag Y<n>C<m> is required on a pass');
  if (args.tag && !/^Y\d+C\d+$/.test(args.tag)) fail('--tag must be Y<n>C<m> form, got: ' + args.tag);
  if (args.verdict === 'fail' && !args.reason) fail('--reason is required on a fail');
  args.grader = args.grader || 'rhea';
  return args;
}

function run(script, scriptArgs) {
  const res = spawnSync('node', [path.join(ROOT, 'scripts', script)].concat(scriptArgs), {
    encoding: 'utf-8',
    cwd: ROOT,
    timeout: 600 * 1000,
  });
  const out = ((res.stdout || '') + (res.stderr || '')).trim();
  console.log(out);
  return { ok: res.status === 0, out: out };
}

// ---------------------------------------------------------------------------
// FAIL branch — local audit trail, never an ingest path
// ---------------------------------------------------------------------------
function recordRejection(args) {
  const entry = {
    file: path.relative(ROOT, path.resolve(args.file)),
    tag: args.tag || null,
    grader: args.grader,
    reason: args.reason,
    // Sim content carries Y<n>C<m>; this log is operator infrastructure, so a
    // wall-clock stamp belongs here and nowhere in the piece itself.
    rejectedAt: new Date().toISOString(),
  };
  if (args.dryRun) {
    console.log('[DRY] Would append to ' + REJECTED_LOG + ': ' + JSON.stringify(entry));
    return;
  }
  fs.mkdirSync(path.dirname(REJECTED_LOG), { recursive: true });
  fs.appendFileSync(REJECTED_LOG, JSON.stringify(entry) + '\n');
  console.log('[REJECTED] logged to ' + path.relative(ROOT, REJECTED_LOG) + ' — neither canon store was touched');
}

// ---------------------------------------------------------------------------
// PASS branch — record the NotebookLM source in the fail_closed policy.
// The bucket alone is not enough: validatePolicy() requires a matching
// decisions entry with title/reason/evidence, and the id must also appear in a
// regenerated inventory before the validator can run clean.
// ---------------------------------------------------------------------------
function recordSource(sourceId, title, args) {
  const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf-8'));
  if (!Array.isArray(policy.allowedLoreSourceIds)) {
    fail('policy has no allowedLoreSourceIds bucket — run pipeline.59 Task 1 first');
  }
  if (policy.allowedLoreSourceIds.indexOf(sourceId) !== -1) {
    console.log('[POLICY] ' + sourceId + ' already recorded — no change');
    return;
  }
  policy.allowedLoreSourceIds.push(sourceId);
  policy.decisions[sourceId] = {
    title: title,
    classification: 'lore',
    reason: 'Graded lore piece promoted out of quarantine by the ' + args.grader +
      ' gate (pipeline.59); ledger-grounded deep background, not a published edition.',
    evidence: [
      'Source file: ' + path.relative(ROOT, path.resolve(args.file)),
      'Cycle placement: ' + args.tag,
      'Verdict: pass (' + args.grader + ')',
    ],
  };
  fs.writeFileSync(POLICY_PATH, JSON.stringify(policy, null, 2) + '\n');
  console.log('[POLICY] recorded ' + sourceId + ' in allowedLoreSourceIds + decisions');
}

function main() {
  const args = parseArgs(process.argv);

  if (args.verdict === 'fail') {
    recordRejection(args);
    return;
  }

  const cycle = String(args.tag.match(/C(\d+)$/)[1]);
  const baseName = path.basename(args.file, path.extname(args.file));
  const expectedTitle = 'Lore: ' + baseName + ' (' + args.tag + ')';

  console.log('=== NotebookLM (canon authority) ===');
  const pushArgs = ['--file', args.file, '--kind', 'lore', '--tag', args.tag, '--no-audio'];
  if (args.dryRun) pushArgs.push('--dry-run');
  const push = run('notebooklmPush.js', pushArgs);

  console.log('=== bay-tribune (Supermemory) ===');
  const ingestArgs = [args.file, '--type', 'lore', '--cycle', cycle];
  if (args.dryRun) ingestArgs.push('--dry-run');
  const ingest = run('ingestEdition.js', ingestArgs);

  // notebooklmPush is non-blocking by contract — it exits 0 even when the push
  // failed. Read the degrade line, not the exit code, before recording a source.
  const degraded = /NOTEBOOKLM PUSH FAILED \(non-blocking\)/.test(push.out);
  // Greedy, anchored to end-of-line: the push line is
  //   Source added: Lore: <slug> (Y<n>C<m>) (<source id>)
  // so a lazy match would capture the cycle tag as the source id and write it
  // into the fail-closed policy. Caught by the disposable-notebook smoke.
  const idMatch = push.out.match(/Source added: .*\(([^)]+)\)\s*$/m);

  if (args.dryRun) {
    console.log('\n[DRY] Would record source id for "' + expectedTitle + '" in allowedLoreSourceIds');
  } else if (degraded || !idMatch) {
    console.log('\n[WARN] No NotebookLM source id captured — nothing recorded in the policy.');
    console.log('       Re-run the NotebookLM leg once the bridge is healthy, then record the id.');
  } else {
    recordSource(idMatch[1], expectedTitle, args);
  }

  console.log('\n[DONE] notebooklm=' + (args.dryRun ? 'dry' : (degraded ? 'degraded' : 'ok')) +
    ' bay-tribune=' + (ingest.ok ? 'ok' : 'FAILED'));
  if (!ingest.ok) process.exit(1);
}

if (require.main === module) main();

module.exports = { parseArgs, recordSource, recordRejection };
