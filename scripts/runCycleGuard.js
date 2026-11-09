#!/usr/bin/env node
// runCycleGuard.js — PreToolUse hook (Claude Code Bash; codex, every tool):
// a /run-cycle step's script runs only through scripts/runCycle.js, which
// refuses a step until the one before it has passed (governance.59, builder
// 2026-11-09).
//
// Reads the hook payload on stdin and looks for a step script being executed
// (`node … scripts/<name>.js` or a require of it) anywhere in the tool input —
// codex passes its shell command inside code-mode JS, so the whole input is
// scanned, not one field. Blocks (exit 2, reason on stderr — the protocol both
// Claude Code and codex read) when:
//   - the command names a cycle ≥ FIRST_ENFORCED whose chain is not closed, or
//   - it names no cycle and some chain is open (started, not closed).
// Everything else passes: reading the scripts, their tests, a cycle whose
// chain is closed (post-publish re-runs, a dumpLedger after a mint), and
// mid-week runs while no chain is open. The runner's own child processes never
// reach a hook.

const fs = require('fs');
const path = require('path');
const { STEPS, FIRST_ENFORCED, STATE_DIR, loadState, isClosed, nextStep } = require('./runCycle');

const NAMES = [...new Set(STEPS.flatMap(s => s.scripts).concat(['engineAuditor']))];

// Each executed step script in `text` → { name, cycle|null }.
function findStepRuns(text) {
  const hits = [];
  const names = NAMES.join('|');
  const exec = new RegExp(`\\bnode\\b((?:\\s+-[^\\s]+)*)\\s+(?:\\S*/)?scripts/(${names})\\.js\\b([^;&|\\n"'\`\\\\]*)`, 'g');
  const req = new RegExp(`require\\(\\s*\\\\?['"](?:\\S*/)?scripts/(${names})(?:\\.js)?\\\\?['"]\\s*\\)`, 'g');
  let m;
  while ((m = exec.exec(text))) {
    if (/(^|\s)(--check|-c)(\s|$)/.test(m[1])) continue;  // syntax check, not a run
    const cyc = (m[3].match(/(?:^|[\s=])(\d{3})(?=\s|$)/) || [])[1];
    hits.push({ name: m[2], cycle: cyc ? Number(cyc) : null });
  }
  while ((m = req.exec(text))) hits.push({ name: m[1], cycle: null });
  return hits;
}

function openChains() {
  let files = [];
  try { files = fs.readdirSync(STATE_DIR).filter(f => /^c\d+\.json$/.test(f)); } catch (_) { return []; }
  return files.map(f => Number(f.slice(1, -5))).filter(c => !isClosed(loadState(c)));
}

// null = allow; string = the block reason.
function decide(text) {
  const runs = findStepRuns(text);
  if (!runs.length) return null;
  const open = openChains();
  for (const r of runs) {
    let cycle = null;
    if (r.cycle !== null && r.cycle >= FIRST_ENFORCED && !isClosed(loadState(r.cycle))) cycle = r.cycle;
    else if (r.cycle === null && open.length) cycle = Math.min(...open);
    if (cycle === null) continue;
    const st = loadState(cycle);
    const n = nextStep(st);
    return `BLOCKED: scripts/${r.name}.js is a /run-cycle step and the C${cycle} chain is not closed. ` +
      `Steps run only through the step runner, in order — the next step is ${n}:\n` +
      `  node scripts/runCycle.js step ${n} ${cycle}\n  node scripts/runCycle.js status ${cycle}   (where the chain stands)`;
  }
  return null;
}

module.exports = { findStepRuns, decide };

if (require.main === module) {
  let raw = '';
  process.stdin.on('data', d => { raw += d; });
  process.stdin.on('end', () => {
    let payload = {};
    try { payload = JSON.parse(raw); } catch (_) { process.exit(0); }
    const input = payload.tool_input !== undefined ? payload.tool_input : payload;
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    if (!text || !text.includes('scripts/')) process.exit(0);
    // JSON escapes quotes and newlines; scan the unescaped form too.
    const reason = decide(text) || decide(text.replace(/\\n/g, '\n').replace(/\\"/g, '"'));
    if (reason) { process.stderr.write(reason + '\n'); process.exit(2); }
    process.exit(0);
  });
}
