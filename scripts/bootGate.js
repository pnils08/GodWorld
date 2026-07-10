#!/usr/bin/env node
// PreToolUse boot gate (S308, Mike-direct).
//
// THE PROBLEM IT FIXES: the SessionStart hook only PRINTS the per-terminal boot
// sequence ("read these files") as advisory text. Nothing enforced it, so a boot
// could skip the required reads and start working ungrounded (S308 failure).
//
// WHAT IT DOES: blocks work tools (Bash/Edit/Write/Task/NotebookEdit) until this
// session has actually Read every boot doc for its terminal. Read/Grep/Glob stay
// free so the boot reads and navigation can happen. Deterministic, harness-side —
// does not depend on the assistant choosing to comply.
//
// WHAT IT DOES NOT DO: it cannot make the assistant obey the CONTENT of the docs.
// It only makes skipping the read impossible — which is the specific failure it
// targets.
//
// SAFETY: FAILS OPEN on every ambiguity (unparseable input, no session id, no
// tmux, unregistered/Mags-only terminal, any fs error). A gate that bricks
// sessions on its own bugs is worse than the gap it closes. It only ever emits a
// DENY on the one positive condition: known terminal + a required boot doc not yet
// read this session.
//
// Mirrors the block mechanism of scripts/rolloutPointerGuard.js (PreToolUse deny
// via hookSpecificOutput).

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = '/root/GodWorld';
const STATE_DIR = path.join(ROOT, '.claude/state/boot-gate');

// Per-terminal required boot READS — mirrors the Read steps of each terminal's
// boot sequence in .claude/hooks/session-startup-hook.sh. Node-script boot steps
// (magsPageRecall.js, queryFamily.js) are NOT reads — they're allow-listed below
// so they can run mid-boot before all reads are done. Keep in sync if boot changes.
const REQUIRED = {
  'media': [
    '.claude/rules/newsroom.md',
    'docs/mags-corliss/CHARACTER.md',
    '.claude/terminals/media/TERMINAL.md',
  ],
  'civic': [
    '.claude/rules/civic.md',
    '.claude/terminals/civic/TERMINAL.md',
  ],
  'research-build': [
    '.claude/rules/research-build.md',
    'docs/SCHEMA.md',
    'docs/index.md',
    '.claude/terminals/research-build/TERMINAL.md',
  ],
  'engine-sheet': [
    '.claude/rules/engine.md',
    '.claude/terminals/engine-sheet/TERMINAL.md',
  ],
};

// Bash commands that are part of a boot sequence itself — allowed through even
// before all reads are recorded (media/engine boots run these mid-sequence).
const BOOT_SCRIPT_ALLOWLIST = ['magsPageRecall.js', 'queryFamily.js'];

// Work tools that get gated. Read/Grep/Glob/LS/TodoWrite are intentionally NOT here.
const GATED_TOOLS = new Set(['Bash', 'Edit', 'Write', 'Task', 'NotebookEdit']);

function allow() { process.exit(0); }

function deny(reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

// Repo-relative, normalized, no leading ./
function toRepoRel(fp) {
  if (!fp) return '';
  let p = String(fp);
  if (path.isAbsolute(p)) {
    p = path.relative(ROOT, p);
  }
  p = p.replace(/^\.\//, '');
  return p;
}

function detectTerminal() {
  // Re-detect the same way session-startup-hook.sh does: tmux window name.
  const pane = process.env.TMUX_PANE;
  if (!pane) return null;
  try {
    const name = execSync(`tmux display-message -t "${pane}" -p '#W'`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000,
    }).trim();
    return name || null;
  } catch {
    return null;
  }
}

function sanitize(s) { return String(s).replace(/[^A-Za-z0-9_.-]/g, '_'); }

function markerDir(sessionId) {
  return path.join(STATE_DIR, sanitize(sessionId));
}

function recordRead(sessionId, repoRel) {
  try {
    const dir = markerDir(sessionId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, sanitize(repoRel)), '');
  } catch { /* fail-open: recording is best-effort */ }
}

function readMarkers(sessionId) {
  try {
    return new Set(fs.readdirSync(markerDir(sessionId)));
  } catch {
    return new Set();
  }
}

// Best-effort cleanup of stale session marker dirs (>24h). Never fatal.
function cleanupStale() {
  try {
    const now = Date.now();
    for (const d of fs.readdirSync(STATE_DIR)) {
      const full = path.join(STATE_DIR, d);
      try {
        const st = fs.statSync(full);
        if (now - st.mtimeMs > 24 * 3600 * 1000) {
          fs.rmSync(full, { recursive: true, force: true });
        }
      } catch { /* skip */ }
    }
  } catch { /* dir may not exist yet */ }
}

let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { return allow(); }

  try {
    const toolName = input.tool_name || '';
    const sessionId = input.session_id || '';
    const ti = input.tool_input || {};

    if (!sessionId) return allow();            // can't scope markers → fail open

    const terminal = detectTerminal();
    const required = terminal && REQUIRED[terminal];
    if (!required) return allow();             // Mags-only / unregistered / no tmux → no scaffolding to enforce

    cleanupStale();

    // Record boot-doc reads as they happen. Read is never gated.
    if (toolName === 'Read') {
      const rel = toRepoRel(ti.file_path);
      if (rel && required.includes(rel)) recordRead(sessionId, rel);
      return allow();
    }

    if (!GATED_TOOLS.has(toolName)) return allow();

    // Let boot-sequence node scripts through even before all reads recorded.
    if (toolName === 'Bash') {
      const cmd = String(ti.command || '');
      if (BOOT_SCRIPT_ALLOWLIST.some(s => cmd.includes(s))) return allow();
    }

    const have = readMarkers(sessionId);
    const missing = required.filter(f => !have.has(sanitize(f)));
    if (missing.length === 0) return allow();

    return deny(
      `BOOT GATE (${terminal}): read the boot docs before any work. ` +
      `Still unread this session:\n` + missing.map(m => `  - ${m}`).join('\n') +
      `\nRead each with the Read tool, then retry. (S308 boot-gate; ` +
      `.claude/hooks/session-startup-hook.sh lists the full boot sequence.)`
    );
  } catch {
    return allow();                            // any unexpected error → fail open
  }
});
