#!/usr/bin/env node
/**
 * archiveFoldedReviews.js — clear the house-guest review inbox of folded reviews.
 *
 * The contract (docs/for-claude-review/README.md §What Claude does with a file, step 3): a review whose
 * findings are verified and folded moves to docs/archive/for-claude-review/ and the owning plan links it
 * there. Until 2026-11-05 this was done by hand at each close (git mv + repoint). This script does the
 * mechanical half:
 *
 *   - a review is FOLDED when a plan under docs/plans/ (or docs/archive/plans/) links it from a
 *     "## Reviews reconciled" table — that table is the plan's own record that every finding landed
 *     (PLAN_TEMPLATE §Rules). A link anywhere else in a plan is a mention, not a fold.
 *   - a folded review is `git mv`'d to docs/archive/for-claude-review/<same name> and every wiki link to
 *     it under docs/ is repointed ([[../for-claude-review/x]] -> [[../archive/for-claude-review/x]]).
 *   - a review no plan reconciles is REPORTED, never moved: that is a judgment (a Claude seat, or a
 *     sub-agent it runs, reads the plan changelogs and decides), not a file operation.
 *
 * Usage:
 *   node scripts/archiveFoldedReviews.js            # dry run: what would move, what stays, why
 *   node scripts/archiveFoldedReviews.js --apply    # move + repoint (git mv; nothing committed)
 *   node scripts/archiveFoldedReviews.js --apply --only 2026-11-05-codex-research32-plan-review
 *
 * Never touches README.md, non-.md files, or a file no plan reconciles. Exit 0 always on a dry run;
 * on --apply, exit 1 if a git mv failed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const INBOX = path.join(ROOT, 'docs', 'for-claude-review');
const ARCHIVE = path.join(ROOT, 'docs', 'archive', 'for-claude-review');
const PLAN_DIRS = ['docs/plans', 'docs/archive/plans'].map(function (d) { return path.join(ROOT, d); });

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx !== -1 ? String(args[onlyIdx + 1] || '').replace(/\.md$/, '') : null;

function walkMd(dir) {
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walkMd(p));
    else if (e.isFile() && e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/** The "## Reviews reconciled" section of a plan, up to the next "## " heading ('' when absent). */
function reconciledSection(text) {
  const m = /^## Reviews reconciled[^\n]*\n([\s\S]*?)(?=^## |\Z)/m.exec(text + '\n## ');
  return m ? m[1] : '';
}

function inboxReviews() {
  return fs.readdirSync(INBOX).filter(function (f) {
    return f.endsWith('.md') && f !== 'README.md' && /^\d{4}-\d{2}-\d{2}-[a-z]+-/.test(f);
  }).sort();
}

function main() {
  const plans = PLAN_DIRS.flatMap(walkMd).map(function (p) { return { path: p, text: fs.readFileSync(p, 'utf8') }; });
  const docsMd = walkMd(path.join(ROOT, 'docs'));
  const reviews = inboxReviews().filter(function (f) { return !ONLY || f.replace(/\.md$/, '') === ONLY; });
  const folded = [], mentioned = [], orphan = [];

  for (const f of reviews) {
    const stem = f.replace(/\.md$/, '');
    const linkRe = new RegExp('\\[\\[[^\\]]*for-claude-review/' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\.md)?(?:[|#\\]][^\\]]*)?\\]\\]');
    const plainRe = new RegExp('for-claude-review/' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    const reconcilers = plans.filter(function (p) { return linkRe.test(reconciledSection(p.text)) || plainRe.test(reconciledSection(p.text)); });
    const mentioners = plans.filter(function (p) { return reconcilers.indexOf(p) === -1 && (linkRe.test(p.text) || plainRe.test(p.text)); });
    if (reconcilers.length) folded.push({ file: f, stem: stem, plans: reconcilers.map(function (p) { return path.relative(ROOT, p.path); }) });
    else if (mentioners.length) mentioned.push({ file: f, plans: mentioners.map(function (p) { return path.relative(ROOT, p.path); }) });
    else orphan.push({ file: f });
  }

  console.log((APPLY ? 'APPLY' : 'DRY RUN') + ' — review inbox: ' + reviews.length + ' review(s)');
  console.log('\nFOLDED (a plan reconciles it) — ' + folded.length + (APPLY ? ', moving:' : ', would move:'));
  folded.forEach(function (r) { console.log('  ' + r.file + '  <- ' + r.plans.join(', ')); });
  console.log('\nMENTIONED by a plan but not reconciled — ' + mentioned.length + ' (judgment: read the plan, reconcile or leave):');
  mentioned.forEach(function (r) { console.log('  ' + r.file + '  ~ ' + r.plans.join(', ')); });
  console.log('\nNO PLAN POINTER — ' + orphan.length + ' (judgment: whose row, folded or still open?):');
  orphan.forEach(function (r) { console.log('  ' + r.file); });

  if (!APPLY) return 0;
  if (!folded.length) { console.log('\nnothing to move'); return 0; }
  fs.mkdirSync(ARCHIVE, { recursive: true });
  let failed = 0;
  for (const r of folded) {
    const from = path.join('docs', 'for-claude-review', r.file);
    const to = path.join('docs', 'archive', 'for-claude-review', r.file);
    try {
      execFileSync('git', ['mv', from, to], { cwd: ROOT, stdio: 'pipe' });
    } catch (e) { console.error('  git mv failed for ' + r.file + ': ' + String(e.stderr || e.message).trim()); failed++; continue; }
    // repoint every wiki link under docs/ (plans, index, research index, archived plans)
    const re = new RegExp('(\\[\\[[^\\]]*?)(?:\\.\\./)*for-claude-review/' + r.stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let touched = 0;
    for (const md of docsMd) {
      if (md === path.join(INBOX, r.file)) continue;
      let text; try { text = fs.readFileSync(md, 'utf8'); } catch (e) { continue; }
      if (text.indexOf('for-claude-review/' + r.stem) === -1) continue;
      const rel = path.relative(path.dirname(md), ARCHIVE).split(path.sep).join('/');
      const next = text.replace(re, function (_m, pre) { return pre + rel + '/' + r.stem; });
      if (next !== text) { fs.writeFileSync(md, next); touched++; }
    }
    console.log('  moved ' + r.file + ' — ' + touched + ' doc(s) repointed');
  }
  return failed ? 1 : 0;
}

process.exit(main());
