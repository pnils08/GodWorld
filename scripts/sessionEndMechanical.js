#!/usr/bin/env node
// sessionEndMechanical.js — S229 governance.7
//
// Orchestrator that collapses the mechanical sub-steps of /session-end into a
// single invocation. Upstream model steps (update SESSION_CONTEXT PIN +
// NEXT[terminal] line, update ROLLOUT_PLAN) MUST run BEFORE this script.
//
// Sub-step routing is uniform across all four terminals (S300 pipe.40 T4 —
// journal freeze: the git journal moved to Mags' citizen page POP-00005, so no
// terminal rotates or quality-checks a journal MD anymore):
//       session summary → Supermemory (best-effort) → auditPlanTagDrift
//       (informational) → ROLLOUT conformance lint (informational)
//       → cross-terminal stack check → [opt-in] SESSION_HISTORY rotation
//       → pm2 restart
//
// writeShippedBlock RETIRED (ADR-0009 §loop-tightening): the boot loop carries
// {PIN, NEXT[terminal]} only; the git-log "## Shipped Last Session" block was a
// stale duplicate of `git log`. The closing terminal updates the PIN + its NEXT
// line by hand (model Step 2.2); nothing mechanical regenerates a shipped block.
//
// rotateJournalRecent + JOURNAL content-quality RETIRED (S300 pipe.40 T4): the
// journal is frozen archive; recent reflections read back from the page via
// scripts/magsPageRecall.js. Plan: docs/plans/2026-07-06-journal-to-citizen-loop.md.
//
// Sub-step failures classified:
//   - Fatal: SESSION_HISTORY rotation
//   - Informational (continues on non-zero exit): auditPlanTagDrift, ROLLOUT lint
//   - Tolerant (warning, continues): pm2 restart, cross-terminal stack check
//
// Usage:
//   node scripts/sessionEndMechanical.js --terminal=<name>
//   node scripts/sessionEndMechanical.js --terminal=research-build --rotate-history --dry-run
//
// Plan: docs/archive/plans/2026-05-23-session-end-collapse.md

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SESSION_CONTEXT_PATH = path.join(ROOT, 'SESSION_CONTEXT.md');
const SESSION_HISTORY_PATH = path.join(ROOT, 'docs/mags-corliss/SESSION_HISTORY.md');

const TERMINALS = ['research-build', 'media', 'civic', 'engine-sheet'];
// Journal froze S300 (pipe.40 T4) — it lives on Mags' citizen page (POP-00005)
// now, so no terminal rotates or quality-checks a journal MD. Routing is uniform.

const KEEP_RECENT_SESSIONS = 5;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { terminal: null, rotateHistory: false, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--terminal=')) args.terminal = a.slice('--terminal='.length);
    else if (a === '--terminal' && i + 1 < argv.length) args.terminal = argv[++i];
    else if (a === '--rotate-history') args.rotateHistory = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function usage() {
  console.error(`Usage: node scripts/sessionEndMechanical.js --terminal=<name> [--rotate-history] [--dry-run]

  --terminal=<name>   Required. One of: ${TERMINALS.join(', ')}
  --rotate-history    Opt-in. Move sessions older than the most-recent
                      ${KEEP_RECENT_SESSIONS} from SESSION_CONTEXT to SESSION_HISTORY.
  --dry-run           Report what each writing sub-step would do without writing.

Upstream model step must run FIRST:
  1. SESSION_CONTEXT.md PIN + NEXT[terminal] line updated + ROLLOUT_PLAN.md updated

Plan: docs/archive/plans/2026-05-23-session-end-collapse.md
`);
}

function bar() {
  return '='.repeat(72);
}

function printBanner(args, steps) {
  console.log(bar());
  console.log(`sessionEndMechanical: terminal=${args.terminal}, rotate-history=${args.rotateHistory}, dry-run=${args.dryRun}`);
  console.log(bar());
  console.log('Expected upstream model step (BEFORE this script):');
  console.log('  1. SESSION_CONTEXT.md PIN + NEXT[terminal] line + ROLLOUT_PLAN.md updated');
  console.log('');
  console.log(`Mechanical sub-steps (${steps.length}):`);
  steps.forEach((s, i) => console.log(`  [${i + 1}/${steps.length}] ${s.name}`));
  console.log(bar());
  console.log('');
}

// ---------------------------------------------------------------------------
// Sub-step: ROLLOUT conformance lint (exit 0 informational, never fatal)
// Surfaces non-conforming ROLLOUT rows — mangled state cell (breaks the archive
// sweep) OR item cell over the pointer budget (a notes blob, not a pointer) — so
// bloat is caught at close, not at the next reconciliation. The teeth behind
// rollout-rules §1 "pointer-only": doctrine alone bloated anyway (governance.30
// / S274). Drain offenders with scripts/rolloutDrain.js.
// ---------------------------------------------------------------------------

function subRolloutLint(args) {
  try {
    const out = execSync('node scripts/docLoopStatus.js --lint', { cwd: ROOT, stdio: 'pipe' });
    out.toString().trim().split('\n').forEach(line => console.log('  ' + line));
    return { ok: true };
  } catch (err) {
    console.log(`  ⚠ rollout lint error: ${err.message} — continuing`);
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// Sub-step: auditPlanTagDrift (exit 1 informational, never fatal)
// ---------------------------------------------------------------------------

function subAuditPlanTagDrift(args) {
  if (args.dryRun) {
    console.log('  (dry-run) skipped: node scripts/auditPlanTagDrift.js');
    return { ok: true };
  }
  try {
    const out = execSync('node scripts/auditPlanTagDrift.js', { cwd: ROOT, stdio: 'pipe' });
    out.toString().trim().split('\n').forEach(line => console.log('  ' + line));
    console.log('  ✓ no drift detected');
    return { ok: true };
  } catch (err) {
    if (err.status === 1) {
      if (err.stdout) {
        err.stdout.toString().trim().split('\n').forEach(line => console.log('  ' + line));
      }
      console.log('  ⚠ drift detected (informational — does not fail close).');
      console.log('    Surface as next-session priority signal in SESSION_CONTEXT.');
      return { ok: true, informational: true };
    }
    console.log(`  ✗ auditPlanTagDrift errored: ${err.message}`);
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Sub-step: cross-terminal git stack check (read-only report)
// ---------------------------------------------------------------------------

function subStackCheck() {
  try {
    const out = execSync('git log --oneline origin/main..HEAD', { cwd: ROOT, stdio: 'pipe' })
      .toString().trim();
    if (out.length === 0) {
      console.log('  ✓ stack clean (origin/main..HEAD empty)');
    } else {
      const commits = out.split('\n');
      console.log(`  ⚠ ${commits.length} unpushed commit(s) ahead of origin/main:`);
      commits.forEach(line => console.log('    ' + line));
      console.log('  Model decision: push if all yours, hold if other terminals stacked.');
    }
    return { ok: true };
  } catch (err) {
    console.log(`  ⚠ stack check failed: ${err.message} — continuing`);
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// Sub-step: SESSION_HISTORY rotation (opt-in)
// ---------------------------------------------------------------------------

function parseStatuses(content) {
  // Parse SESSION_CONTEXT.md STATUS paragraphs.
  // Each paragraph starts at a line matching `**STATUS (S<N>` and ends at the
  // next blank line (Markdown paragraph break).
  const lines = content.split('\n');
  const statuses = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Use [—)] (em-dash or close-paren) as terminator for terminal hint capture.
    const m = line.match(/^\*\*STATUS\s*\(S(\d+)\s*([^—)]*)/);
    if (m) {
      const start = i;
      let end = i;
      while (end + 1 < lines.length && lines[end + 1].trim() !== '') {
        end++;
      }
      statuses.push({
        session: parseInt(m[1], 10),
        terminalHint: m[2].trim() || 'unknown',
        startLine: start,
        endLine: end,
        text: lines.slice(start, end + 1).join('\n'),
      });
      i = end + 1;
    } else {
      i++;
    }
  }
  return statuses;
}

function buildRotationBlock(toRotate, rotatingSession) {
  // Header convention matches existing SESSION_HISTORY entries: the `(S<N>)` tag
  // is the session PERFORMING the rotation (read from SESSION_CONTEXT.md counter),
  // not the newest rotated session.
  const date = new Date().toISOString().slice(0, 10);
  let block = `\n### Rotated from SESSION_CONTEXT.md on ${date} (S${rotatingSession})\n\n`;
  for (const st of toRotate) {
    block += `#### Session ${st.session} — ${st.terminalHint} [rotated mechanically]\n\n`;
    block += st.text.trim() + '\n\n';
  }
  return block;
}

function readCurrentSession(content) {
  const m = content.match(/Session:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function removeStatusesFromContext(content, toRemove) {
  const lines = content.split('\n');
  const removeFlags = new Array(lines.length).fill(false);
  for (const st of toRemove) {
    for (let i = st.startLine; i <= st.endLine; i++) removeFlags[i] = true;
    if (st.endLine + 1 < lines.length && lines[st.endLine + 1].trim() === '') {
      removeFlags[st.endLine + 1] = true;
    }
  }
  return lines.filter((_, i) => !removeFlags[i]).join('\n');
}

function subRotateHistory(args) {
  try {
    const content = fs.readFileSync(SESSION_CONTEXT_PATH, 'utf8');
    const statuses = parseStatuses(content);
    if (statuses.length === 0) {
      console.log('  ⚠ no STATUS paragraphs found — skipping');
      return { ok: true };
    }

    // Group by first-appearance order — top of file is newest by convention.
    const sessionOrder = [];
    const seen = new Set();
    for (const st of statuses) {
      if (!seen.has(st.session)) {
        sessionOrder.push(st.session);
        seen.add(st.session);
      }
    }

    if (sessionOrder.length <= KEEP_RECENT_SESSIONS) {
      console.log(`  ✓ ${sessionOrder.length} distinct sessions (≤${KEEP_RECENT_SESSIONS}) — no rotation needed`);
      return { ok: true };
    }

    const keep = new Set(sessionOrder.slice(0, KEEP_RECENT_SESSIONS));
    const rotateSessions = sessionOrder.slice(KEEP_RECENT_SESSIONS);
    const rotate = statuses.filter(st => !keep.has(st.session));

    const rotatingSession = readCurrentSession(content);
    if (rotatingSession == null) {
      console.log('  ⚠ could not parse Session counter from SESSION_CONTEXT.md — skipping');
      return { ok: true };
    }

    console.log(`  Distinct sessions: ${sessionOrder.length}`);
    console.log(`  Keep: ${[...keep].map(n => 'S' + n).join(', ')}`);
    console.log(`  Rotate: ${rotateSessions.map(n => 'S' + n).join(', ')} (${rotate.length} STATUS paragraphs)`);
    console.log(`  Rotating session (header tag): S${rotatingSession}`);

    if (args.dryRun) {
      console.log('  --- planned SESSION_HISTORY append (dry-run) ---');
      const block = buildRotationBlock(rotate, rotatingSession);
      block.split('\n').slice(0, 12).forEach(line => console.log('  | ' + line));
      console.log(`  | ... (${block.split('\n').length} lines total)`);
      console.log(`  --- planned SESSION_CONTEXT removal: ${rotate.length} paragraphs ---`);
      return { ok: true };
    }

    const block = buildRotationBlock(rotate, rotatingSession);
    fs.appendFileSync(SESSION_HISTORY_PATH, block);
    const newContent = removeStatusesFromContext(content, rotate);
    fs.writeFileSync(SESSION_CONTEXT_PATH, newContent);
    console.log(`  ✓ rotated ${rotate.length} STATUS paragraphs to SESSION_HISTORY.md`);
    return { ok: true };
  } catch (err) {
    console.log(`  ✗ SESSION_HISTORY rotation failed: ${err.message}`);
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Sub-step: pm2 restart
// ---------------------------------------------------------------------------

function subPm2Restart(args) {
  if (args.dryRun) {
    console.log('  (dry-run) skipped: pm2 restart godworld-dashboard');
    return { ok: true };
  }
  try {
    // mags-bot deliberately NOT restarted here (S252) — it's a standing service
    // decoupled from the session lifecycle. Restart it by hand only on bot-code
    // deploys; auto-restart (pm2) + pm2 save cover crashes + reboots.
    execSync('pm2 restart godworld-dashboard', { cwd: ROOT, stdio: 'pipe' });
    console.log('  ✓ godworld-dashboard restarted');
    return { ok: true };
  } catch (err) {
    console.log(`  ⚠ pm2 restart failed: ${err.message} — services may need manual restart`);
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// (SESSION_CONTEXT minimal-handoff guard REMOVED — Mike-direct S298. The
// FATAL length/shape caps on PIN/NEXT lines are retired; SESSION_CONTEXT
// content is model judgment again.)
// ---------------------------------------------------------------------------
// Sub-step: session summary → Supermemory (best-effort, never fatal)
// Mirrors claude-mem's already-generated session summary into the session-logs
// umbrella container + per-terminal sl-<terminal> tag (S283, Mike-directed).
// Zero LLM calls; idempotent via customId. The script exits 0 on every failure
// path by contract, so this sub-step can never block a close.
// ---------------------------------------------------------------------------

function subSessionSummaryBridge(args) {
  if (args.dryRun) {
    console.log(`  (dry-run) skipped: node scripts/sessionSummaryToSupermemory.js --terminal=${args.terminal}`);
    return { ok: true };
  }
  try {
    const out = execSync(`node scripts/sessionSummaryToSupermemory.js --terminal=${args.terminal}`,
      { cwd: ROOT, stdio: 'pipe', timeout: 45000 });
    out.toString().trim().split('\n').forEach(line => console.log(line));
    return { ok: true };
  } catch (err) {
    console.log(`  ⚠ session-summary bridge error: ${err.message} — continuing (best-effort)`);
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// Step list builder
// ---------------------------------------------------------------------------

function buildSteps(args) {
  const steps = [];
  steps.push({ name: 'session summary → Supermemory (best-effort)', fn: subSessionSummaryBridge });
  steps.push({ name: 'auditPlanTagDrift (informational)', fn: subAuditPlanTagDrift });
  steps.push({ name: 'ROLLOUT conformance lint (informational)', fn: subRolloutLint });
  steps.push({ name: 'cross-terminal git stack check (read-only)', fn: subStackCheck });
  if (args.rotateHistory) {
    steps.push({ name: 'SESSION_HISTORY rotation (opt-in)', fn: subRotateHistory });
  }
  steps.push({ name: 'pm2 restart', fn: subPm2Restart });
  return steps;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }
  if (!args.terminal) {
    usage();
    process.exit(1);
  }
  if (!TERMINALS.includes(args.terminal)) {
    console.error(`ERROR: --terminal=${args.terminal} not in allowlist: ${TERMINALS.join(', ')}`);
    process.exit(1);
  }

  const steps = buildSteps(args);
  printBanner(args, steps);

  let aborted = false;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`--- [${i + 1}/${steps.length}] ${step.name} ---`);
    const result = step.fn(args);
    console.log('');
    if (!result.ok) {
      aborted = true;
      console.log(bar());
      console.log(`ABORT at sub-step [${i + 1}/${steps.length}] ${step.name}`);
      console.log(bar());
      break;
    }
  }

  if (aborted) {
    process.exit(1);
  }

  console.log(bar());
  console.log(`sessionEndMechanical: complete (terminal=${args.terminal})`);
  console.log(bar());
}

main();
