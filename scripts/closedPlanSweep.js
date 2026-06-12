#!/usr/bin/env node
/*
 * closedPlanSweep.js — governance.31 closed-plan archive sweep helper.
 *
 * Moves a vetted list of closed plan files docs/plans/<n>.md → docs/archive/plans/<n>.md
 * and repoints inbound links across docs/. The keep/move CALL is made by hand
 * (see the candidate buckets in the session); this script only executes a
 * pre-vetted list and does the mechanical link surgery + a broken-ref check.
 *
 * Link forms repointed (the explicit, unambiguous ones):
 *   [[plans/<n>]]        → [[archive/plans/<n>]]            (+ |alias variant)
 *   [[../plans/<n>]]     → [[../archive/plans/<n>]]          (+ |alias variant)
 *   docs/plans/<n>.md    → docs/archive/plans/<n>.md         (frontmatter sources/pointers)
 *
 * Bare sibling links [[<n>]] are NOT auto-rewritten (their correctness depends
 * on whether the referencing file co-moves). They are REPORTED for manual review.
 *
 * Usage:
 *   node scripts/closedPlanSweep.js --list <file>            # dry-run: report moves + link surface
 *   node scripts/closedPlanSweep.js --list <file> --apply    # git mv + repoint
 *   (--list is a newline-delimited file of basenames, no .md)
 *
 * After --apply, run the verify grep the script prints to confirm zero broken refs.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const SRC_DIR = path.join(DOCS, 'plans');
const DST_DIR = path.join(DOCS, 'archive', 'plans');

function parseArgs(argv) {
  const a = { list: null, apply: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--list') a.list = argv[++i];
    else if (argv[i] === '--apply') a.apply = true;
  }
  return a;
}

// All .md files under docs/ (the link-repoint search surface).
function allDocs() {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) out.push(p);
    }
  })(DOCS);
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.list) { console.error('Usage: closedPlanSweep.js --list <file> [--apply]'); process.exit(2); }
  const names = fs.readFileSync(args.list, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  const moveSet = new Set(names);

  // Validate every name is a real plan file before doing anything.
  const missing = names.filter(n => !fs.existsSync(path.join(SRC_DIR, n + '.md')));
  if (missing.length) { console.error('NOT FOUND in docs/plans/:\n  ' + missing.join('\n  ')); process.exit(1); }

  const docs = allDocs();
  const bareReports = [];   // [[<n>]] sibling links — manual review
  let explicitEdits = 0, filesTouched = 0;

  for (const file of docs) {
    let txt = fs.readFileSync(file, 'utf8');
    const orig = txt;
    for (const n of names) {
      const e = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // [[plans/<n>]] and [[plans/<n>|alias]]
      txt = txt.replace(new RegExp('\\[\\[plans/' + e + '(\\|[^\\]]*)?\\]\\]', 'g'), (m, al) => '[[archive/plans/' + n + (al || '') + ']]');
      // [[../plans/<n>]] and alias
      txt = txt.replace(new RegExp('\\[\\[\\.\\./plans/' + e + '(\\|[^\\]]*)?\\]\\]', 'g'), (m, al) => '[[../archive/plans/' + n + (al || '') + ']]');
      // docs/plans/<n>.md  (frontmatter / prose path refs)
      txt = txt.replace(new RegExp('docs/plans/' + e + '\\.md', 'g'), 'docs/archive/plans/' + n + '.md');
      // bare [[<n>]] — report only
      const bare = new RegExp('\\[\\[' + e + '(\\|[^\\]]*)?\\]\\]', 'g');
      if (bare.test(orig)) bareReports.push({ file: path.relative(ROOT, file), name: n });
    }
    if (txt !== orig) {
      filesTouched++;
      explicitEdits += 1;
      if (args.apply) fs.writeFileSync(file, txt);
    }
  }

  console.log(`Move set: ${names.length} plan files.`);
  console.log(`Explicit link rewrites: ${filesTouched} file(s) ${args.apply ? 'WRITTEN' : '(dry-run)'}.`);
  if (bareReports.length) {
    console.log(`\nBare [[<n>]] sibling links — MANUAL REVIEW (rewrite to [[archive/plans/<n>]] unless the containing file also moved):`);
    for (const b of bareReports) console.log(`  ${b.file}  →  [[${b.name}]]`);
  } else {
    console.log('\nNo bare [[<n>]] sibling links to the move set.');
  }

  if (args.apply) {
    if (!fs.existsSync(DST_DIR)) fs.mkdirSync(DST_DIR, { recursive: true });
    for (const n of names) {
      execSync(`git mv "${path.join('docs/plans', n + '.md')}" "${path.join('docs/archive/plans', n + '.md')}"`, { cwd: ROOT });
    }
    console.log(`\ngit mv complete: ${names.length} files → docs/archive/plans/.`);
    console.log(`\nVERIFY (must return zero): grep -rn -E "(\\[\\[(\\.\\./)?plans/(${names.map(n=>n.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')).join('|')}))|docs/plans/(${names.join('|')})\\.md" docs/`);
  } else {
    console.log('\n(dry-run — re-run with --apply to git mv + write link edits)');
  }
}

main();
