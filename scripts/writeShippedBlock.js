#!/usr/bin/env node
/**
 * writeShippedBlock.js — Auto-generate "## Shipped Last Session" block in SESSION_CONTEXT.
 *
 * S207. The boot-handoff gap: SESSION_CONTEXT was bloating because it tried to narrate
 * what shipped each session. ROLLOUT is now canonical for closed work. This script gives
 * a fresh boot a compact, authoritative "what just shipped" surface — git log between
 * the last session boundary and HEAD, written verbatim into SESSION_CONTEXT.
 *
 * Flow at session-end (single invocation, no --finalize):
 *   1. Read .claude/state/shipped-block-boundary (= last work commit of previous session)
 *   2. git log boundary..HEAD --oneline --no-merges → filter Session-close subjects
 *   3. Splice block into SESSION_CONTEXT (replace existing or insert after first ---)
 *   4. Update boundary file to current HEAD
 *   5. Both SESSION_CONTEXT.md and the boundary state file get committed in
 *      the session-close commit
 *
 * Off-by-one handling: the boundary update writes HEAD (the last work commit BEFORE
 * the session-close commit). Next session, log will include the prior session-close
 * commit; the Session-close subject filter strips it.
 *
 * Block position (S238 governance.18(b)): the marker-find logic in spliceBlock follows
 * the `## Shipped Last Session` header wherever it lives in SESSION_CONTEXT.md. The
 * intentional position is BELOW `## Recent Sessions` and ABOVE `## Current Work` — out
 * of the boot 80-line read window so it stops competing with Priority for primacy at
 * boot. Don't relocate it back to the top; the marker-find replace works in-place.
 * Fallback (no marker found) still inserts after the first `---` separator (top of file).
 * That's a degraded-recovery path for the case where someone manually deletes the
 * section header — operator can re-move after recovery.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BOUNDARY_FILE = path.join(ROOT, '.claude/state/shipped-block-boundary');
const SESSION_CONTEXT = path.join(ROOT, 'SESSION_CONTEXT.md');

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT }).toString().trim();
}

function getCurrentHead() {
  return git('rev-parse HEAD');
}

function readBoundary() {
  if (!fs.existsSync(BOUNDARY_FILE)) {
    try {
      return git('rev-parse HEAD~25');
    } catch {
      return git('rev-list --max-parents=0 HEAD');
    }
  }
  return fs.readFileSync(BOUNDARY_FILE, 'utf8').trim();
}

function writeBoundary(sha) {
  fs.mkdirSync(path.dirname(BOUNDARY_FILE), { recursive: true });
  fs.writeFileSync(BOUNDARY_FILE, sha + '\n');
}

function getCommitsSince(boundary) {
  let out;
  try {
    out = git(`log --oneline --no-merges ${boundary}..HEAD`);
  } catch (e) {
    return [];
  }
  if (!out) return [];
  return out
    .split('\n')
    .map(line => {
      const sp = line.indexOf(' ');
      return { sha: line.slice(0, sp), subject: line.slice(sp + 1) };
    })
    .filter(c => !/Session-close/i.test(c.subject));
}

function detectSessionTag() {
  const subj = git('log -1 --format=%s');
  const m = subj.match(/S(\d+)/);
  return m ? `S${m[1]}` : 'unknown';
}

// G-W60 — run-state detection. The C95 failure: a soft-close commit said
// "sift locked, chaining to write-edition" while the prior instance had actually
// run write-edition + post-publish + Final Arbiter. The evidence sat in output/
// JSONs — but output/ is gitignored, so `git status` never sees it and the close
// commit's message lied about where the pipeline stood. Next boot started from a
// wrong baseline; it took ~40 min of timestamp archaeology to recover.
//
// Fix: detect pipeline-stage signal files whose mtime is newer than the last
// commit and surface them in the shipped block. Mtime-based (not git-status)
// precisely because these artifacts are gitignored. This records the true run
// state regardless of what the close message claims. Mechanical, not judgment —
// it does not block the close (soft-close intentionally chains work forward); it
// just refuses to let the close be silent about what ran.
const STAGE_SIGNALS = [
  { re: /^dispatch_c(\d+)\.json$/, stage: 'sift/dispatch' },
  { re: /^production_log_c(\d+)\.md$/, stage: 'write-edition' },
  { re: /^cycle_review_c(\d+)\.json$/, stage: 'review:reasoning' },
  { re: /^rhea_report_c(\d+)\.json$/, stage: 'review:sourcing' },
  { re: /^mara_report_c(\d+)\.json$/, stage: 'review:result-validity' },
  { re: /^capability_review_c(\d+)\.json$/, stage: 'review:capability' },
  { re: /^final_arbiter_c(\d+)\.json$/, stage: 'final-arbiter' },
];

function lastCommitEpochMs() {
  try {
    return parseInt(git('log -1 --format=%ct'), 10) * 1000;
  } catch {
    return 0;
  }
}

function detectRunStateSinceCommit() {
  const outDir = path.join(ROOT, 'output');
  if (!fs.existsSync(outDir)) return [];
  const sinceMs = lastCommitEpochMs();
  const found = [];
  for (const f of fs.readdirSync(outDir)) {
    for (const sig of STAGE_SIGNALS) {
      const m = f.match(sig.re);
      if (!m) continue;
      let mtimeMs;
      try {
        mtimeMs = fs.statSync(path.join(outDir, f)).mtimeMs;
      } catch {
        continue;
      }
      if (mtimeMs > sinceMs) {
        found.push({ file: `output/${f}`, stage: sig.stage, cycle: m[1], mtime: new Date(mtimeMs).toISOString() });
      }
      break;
    }
  }
  found.sort((a, b) => a.mtime.localeCompare(b.mtime));
  return found;
}

function buildRunStateSection(runState) {
  // G-W60 — appended below the commit list when gitignored pipeline artifacts
  // were produced since the last commit. Tells the next boot the true run state.
  if (!runState || runState.length === 0) return '';
  const lines = runState
    .map(r => `- \`${r.file}\` — ${r.stage} (c${r.cycle}) — ${r.mtime}`)
    .join('\n');
  return (
    `\n**⚠ Run state since last commit** — these pipeline-stage artifacts were ` +
    `produced after the last commit but are gitignored (\`output/\`), so git does ` +
    `not track them. This is the ACTUAL run state, regardless of the close ` +
    `message. Next session: do not assume an earlier stage; verify against these.\n\n` +
    `${lines}\n`
  );
}

function buildBlock(commits, sessionTag, runState) {
  const header = `## Shipped Last Session (${sessionTag})`;
  const note = `*Mechanical artifact — git-log output auto-generated by \`scripts/writeShippedBlock.js\` at session-end. Not editorial. **\`ROLLOUT_PLAN.md\` is canonical for what these commits accomplished.***`;
  const runStateSection = buildRunStateSection(runState);
  if (commits.length === 0) {
    return `${header}\n\n${note}\n\n*(No qualifying commits since previous boundary.)*\n${runStateSection}`;
  }
  const lines = commits.map(c => `- \`${c.sha}\` ${c.subject}`).join('\n');
  return `${header}\n\n${note}\n\n${lines}\n${runStateSection}`;
}

function spliceBlock(content, block) {
  const marker = '## Shipped Last Session';
  const start = content.indexOf(marker);
  if (start !== -1) {
    const next = content.indexOf('\n---\n', start);
    if (next !== -1) {
      return content.slice(0, start) + block + '\n' + content.slice(next + 1);
    }
    return content.slice(0, start) + block;
  }
  const firstSep = content.indexOf('\n---\n');
  if (firstSep === -1) {
    return content + '\n\n---\n\n' + block + '\n---\n';
  }
  const insertAt = firstSep + '\n---\n'.length;
  return content.slice(0, insertAt) + '\n' + block + '\n---\n' + content.slice(insertAt);
}

function main() {
  if (!fs.existsSync(SESSION_CONTEXT)) {
    console.error(`SESSION_CONTEXT.md not found at ${SESSION_CONTEXT}`);
    process.exit(1);
  }

  const boundary = readBoundary();
  const head = getCurrentHead();
  const commits = getCommitsSince(boundary);
  const sessionTag = detectSessionTag();
  const runState = detectRunStateSinceCommit();
  const block = buildBlock(commits, sessionTag, runState);

  const content = fs.readFileSync(SESSION_CONTEXT, 'utf8');
  const updated = spliceBlock(content, block);
  fs.writeFileSync(SESSION_CONTEXT, updated);

  writeBoundary(head);

  console.log(`Wrote Shipped block: ${commits.length} commits (${sessionTag})`);
  console.log(`  boundary was: ${boundary.slice(0, 7)}`);
  console.log(`  boundary now: ${head.slice(0, 7)}`);

  // G-W60 — loud stderr surface so the closing instance sees uncommitted run
  // state at close time, not just the next boot.
  if (runState.length > 0) {
    console.error(`\n  ⚠ Run state since last commit (${runState.length} gitignored pipeline artifact(s) — recorded in the block):`);
    for (const r of runState) console.error(`    - ${r.file} (${r.stage}, c${r.cycle})`);
    console.error(`  These prove pipeline stages ran. Confirm the close message + commits reflect this before closing.`);
  }
}

main();
