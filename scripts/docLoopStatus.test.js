#!/usr/bin/env node
/**
 * docLoopStatus.test.js — staleNextLeads (a NEXT line that leads with a row no
 * longer open). Pure: synthetic SESSION_CONTEXT / ROLLOUT / archive / backlog text.
 * Run: node scripts/docLoopStatus.test.js
 */

'use strict';

const { staleNextLeads } = require('./docLoopStatus');

let passed = 0;
let failed = 0;
function assertEqual(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}: expected ${e}, got ${a}`); failed++; }
}

const rows = [
  { id: 'engine.901', state: 'ready' },
  { id: 'engine.902', state: 'in-progress' },
  { id: 'engine.903', state: 'live-observing' },
  { id: 'engine.904', state: 'done-pending-archive' },
  { id: 'pipeline.905', state: 'wontfix' },
  { id: 'research.906', state: 'blocked' }
];
const archive = '- **pipeline.907** [engine-sheet] — closed thing\n- **engine.908d** [engine-sheet] — sibling with a suffix\n';
const backlog = '- **research.909** — parked idea\n';
const next = (lane, body) => `# SESSION_CONTEXT — x\n\n**PIN:** S1 | Day 1\n\n**NEXT[${lane}]:** ${body}\n`;
const run = body => staleNextLeads(next('engine-sheet', body), rows, archive, backlog);

console.log('\nstaleNextLeads');
assertEqual('open lead (ready) → clean', run('engine.901 → build it.'), []);
assertEqual('open lead (in-progress) → clean', run('engine.902 → bench it.'), []);
assertEqual('open lead (live-observing) → clean', run('engine.903 → read the fire.'), []);
assertEqual('open lead (blocked) → clean', run('research.906 → wait.'), []);
assertEqual('done-pending-archive lead → flagged', run('engine.904 → ship it.'),
  ['  NEXT[engine-sheet] leads with engine.904 — done-pending-archive']);
assertEqual('wontfix lead → flagged', run('pipeline.905 → price it.'),
  ['  NEXT[engine-sheet] leads with pipeline.905 — wontfix']);
assertEqual('swept to the archive → flagged', run('pipeline.907 → price it. Then engine.901.'),
  ['  NEXT[engine-sheet] leads with pipeline.907 — archived']);
assertEqual('parked in BACKLOG → flagged', run('research.909 → look again.'),
  ['  NEXT[engine-sheet] leads with research.909 — parked in BACKLOG']);
assertEqual('id in no file → flagged', run('engine.999 → build it.'),
  ['  NEXT[engine-sheet] leads with engine.999 — no such row']);
assertEqual('a closed row after the arrow is context, not the lead', run('engine.901 → build it, then engine.904 reads.'), []);
assertEqual('two lead ids: only the closed one flagged', run('engine.901/engine.904 → both.'),
  ['  NEXT[engine-sheet] leads with engine.904 — done-pending-archive']);
assertEqual('no arrow: the whole line is the lead', run('engine.904 still to ship'),
  ['  NEXT[engine-sheet] leads with engine.904 — done-pending-archive']);
assertEqual('archive match is exact: engine.908 is not engine.908d', run('engine.908 → x.'),
  ['  NEXT[engine-sheet] leads with engine.908 — no such row']);
assertEqual('non-row tokens ignored (cycle, version, file, date)', run('C114 Sun 2026-11-01, v1.3, buildWorldSummary.js → x.'), []);
assertEqual('the lead is the repeated id once', run('engine.904 engine.904 → x.'),
  ['  NEXT[engine-sheet] leads with engine.904 — done-pending-archive']);
assertEqual('every NEXT line is read', staleNextLeads(
  next('engine-sheet', 'engine.901 → x.') + '**NEXT[research-build]:** pipeline.905 → y.\n', rows, archive, backlog),
  ['  NEXT[research-build] leads with pipeline.905 — wontfix']);
assertEqual('PIN and other lines ignored', staleNextLeads('**PIN:** S1 | engine.904 | x\n', rows, archive, backlog), []);
assertEqual('empty files → nothing', staleNextLeads('', [], '', ''), []);
// The real archive also holds swept rows as table rows (codex review F2).
const tableArchive = '| # | Item | State |\n|---|---|---|\n| pipeline.910 | a swept table row | done-pending-archive | engine-sheet | [[x]] |\n';
assertEqual('archive table row → archived', staleNextLeads(next('engine-sheet', 'pipeline.910 → x.'), rows, tableArchive, ''),
  ['  NEXT[engine-sheet] leads with pipeline.910 — archived']);
assertEqual('a table cell that is not the row id does not count', staleNextLeads(next('engine-sheet', 'engine.911 → x.'), rows,
  '| pipeline.912 | follows engine.911 | done-pending-archive |\n', ''), ['  NEXT[engine-sheet] leads with engine.911 — no such row']);

// The CLI path the pre-commit hook and session close call: a scratch copy of
// the script beside synthetic repo files (the script reads ../docs, ../SESSION_CONTEXT.md).
console.log('\nCLI (--stale-next, --lint) on a scratch repo');
{
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { execFileSync } = require('child_process');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docloop-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'));
    fs.mkdirSync(path.join(root, 'docs', 'engine'), { recursive: true });
    fs.mkdirSync(path.join(root, 'docs', 'plans'));
    fs.mkdirSync(path.join(root, 'docs', 'research'));
    fs.copyFileSync(path.join(__dirname, 'docLoopStatus.js'), path.join(root, 'scripts', 'docLoopStatus.js'));
    const plan = state => `# GodWorld — Rollout Plan\n\n## 4. Queue — ruled, not started (ready)\n\n| # | Item | State | Terminal | Pointer |\n|---|------|-------|----------|---------|\n| engine.920 | a synthetic job | ${state} | engine-sheet | [[x]] |\n`;
    fs.writeFileSync(path.join(root, 'docs', 'engine', 'ROLLOUT_ARCHIVE.md'), tableArchive);
    fs.writeFileSync(path.join(root, 'docs', 'plans', 'BACKLOG.md'), backlog);
    fs.writeFileSync(path.join(root, 'SESSION_CONTEXT.md'), next('engine-sheet', 'engine.920 → build it.'));
    const cli = flag => execFileSync('node', [path.join(root, 'scripts', 'docLoopStatus.js'), flag], { encoding: 'utf8' });
    fs.writeFileSync(path.join(root, 'docs', 'engine', 'ROLLOUT_PLAN.md'), plan('ready'));
    assertEqual('--stale-next: open lead → silent', cli('--stale-next'), '');
    fs.writeFileSync(path.join(root, 'docs', 'engine', 'ROLLOUT_PLAN.md'), plan('done-pending-archive'));
    assertEqual('--stale-next: row closed under the lead → the notice',
      cli('--stale-next').trim().split('\n'),
      ['NEXT STALE: 1 handoff line(s) lead with a row that is no longer open — the owner rewrites its line; a closer may correct the stale fact:',
        '  NEXT[engine-sheet] leads with engine.920 — done-pending-archive']);
    assertEqual('--lint carries the same notice', cli('--lint').includes('NEXT[engine-sheet] leads with engine.920 — done-pending-archive'), true);

    // --staged reads the index, the content that will commit (codex re-review F1):
    // a staged close with the working copy restored must still warn, and the inverse must not.
    const git = (...a) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: root, encoding: 'utf8' });
    const planPath = path.join(root, 'docs', 'engine', 'ROLLOUT_PLAN.md');
    // No index to read: a visible note, never the working tree (codex re-review 2).
    const noRepo = execFileSync('node', [path.join(root, 'scripts', 'docLoopStatus.js'), '--stale-next', '--staged'],
      { cwd: root, encoding: 'utf8', env: Object.assign({}, process.env, { GIT_CEILING_DIRECTORIES: path.dirname(root) }) });
    assertEqual('--staged outside a repo → says it could not read the index', noRepo.startsWith('NEXT STALE: not checked — could not read the index'), true);
    git('init', '-q');
    fs.writeFileSync(planPath, plan('ready'));
    git('add', '-A');
    git('commit', '-q', '-m', 'base');
    const staged = () => execFileSync('node', [path.join(root, 'scripts', 'docLoopStatus.js'), '--stale-next', '--staged'], { cwd: root, encoding: 'utf8' });
    fs.writeFileSync(planPath, plan('done-pending-archive'));
    git('add', 'docs/engine/ROLLOUT_PLAN.md');
    fs.writeFileSync(planPath, plan('ready'));
    assertEqual('--staged: close staged, working copy restored → the notice',
      staged().includes('NEXT[engine-sheet] leads with engine.920 — done-pending-archive'), true);
    assertEqual('--stale-next without --staged reads the working copy → silent here', cli('--stale-next'), '');
    git('reset', '-q', 'docs/engine/ROLLOUT_PLAN.md');
    fs.writeFileSync(planPath, plan('done-pending-archive'));
    assertEqual('--staged: close only in the working copy → silent (not in the commit)', staged(), '');
    // The plan staged for removal, its working copy still open: the commit holds no row.
    fs.writeFileSync(planPath, plan('ready'));
    git('rm', '-q', '--cached', 'docs/engine/ROLLOUT_PLAN.md');
    assertEqual('--staged: plan staged for removal → the lead reads as no such row',
      staged().includes('NEXT[engine-sheet] leads with engine.920 — no such row'), true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
