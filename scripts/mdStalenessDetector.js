#!/usr/bin/env node
/**
 * mdStalenessDetector.js — Detect stale + orphan MD files in docs/.
 *
 * Walks docs/, computes git-mtime + inbound-link count per .md file,
 * classifies into 5 buckets, writes report to output/md_audit_<DATE>.md.
 * Read-only — never moves or deletes anything.
 *
 * Usage:
 *   node scripts/mdStalenessDetector.js                   # default 90/30 day windows
 *   node scripts/mdStalenessDetector.js --stale-days 60   # tighter staleness threshold
 *   node scripts/mdStalenessDetector.js --active-days 14  # tighter active window
 *
 * Plan: docs/plans/2026-04-21-md-audit-skill.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_ROOT = path.join(REPO_ROOT, 'docs');
const OUTPUT_DIR = path.join(REPO_ROOT, 'output');
const EXCLUDE_PREFIXES = [
  'docs/archive/',
  'docs/drive-files/',
  'docs/research/papers/',
];

const args = process.argv.slice(2);
function flag(name, defaultVal) {
  const idx = args.indexOf(name);
  if (idx === -1) return defaultVal;
  return args[idx + 1];
}
const STALE_DAYS = parseInt(flag('--stale-days', '90'), 10);
const ACTIVE_DAYS = parseInt(flag('--active-days', '30'), 10);

function isExcluded(relPath) {
  return EXCLUDE_PREFIXES.some(p => relPath.startsWith(p));
}

function walkMd(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(REPO_ROOT, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      const dirRel = rel + '/';
      if (EXCLUDE_PREFIXES.some(p => dirRel.startsWith(p))) continue;
      walkMd(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (isExcluded(rel)) continue;
      results.push(rel);
    }
  }
  return results;
}

function walkAnyMd(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(REPO_ROOT, full).replace(/\\/g, '/');
    if (entry.isDirectory()) walkAnyMd(full, results);
    else if (entry.isFile() && entry.name.endsWith('.md')) results.push(rel);
  }
  return results;
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return {};
  const end = content.indexOf('\n---', 4);
  if (end === -1) return {};
  try {
    return yaml.load(content.slice(4, end)) || {};
  } catch {
    return {};
  }
}

function gitMtime(relPath) {
  try {
    const out = execSync(`git log -1 --format=%ct -- "${relPath}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
    if (!out) return null;
    return new Date(parseInt(out, 10) * 1000);
  } catch {
    return null;
  }
}

function activeEditSet() {
  try {
    const out = execSync(
      `git log --since="${ACTIVE_DAYS} days ago" --name-only --pretty=format:""`,
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    return new Set(out.split('\n').map(s => s.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function buildSourceIndex() {
  const sources = new Set();
  walkMd(DOCS_ROOT).forEach(s => sources.add(s));
  walkAnyMd(path.join(REPO_ROOT, '.claude')).forEach(s => sources.add(s));
  for (const f of ['CLAUDE.md', 'MEMORY.md', 'CONTEXT.md', 'SESSION_CONTEXT.md', 'README.md']) {
    if (fs.existsSync(path.join(REPO_ROOT, f))) sources.add(f);
  }
  const contents = new Map();
  const dirRefs = new Map();
  for (const s of sources) {
    const c = fs.readFileSync(path.join(REPO_ROOT, s), 'utf8');
    contents.set(s, c);
    dirRefs.set(s, extractDirectoryRefs(c));
  }
  return { contents, dirRefs };
}

function extractDirectoryRefs(content) {
  // Capture path tokens that end with `/` — e.g. `docs/media/voices/`. Catches:
  //   "the full roster is in docs/media/voices/"
  //   "voice files at docs/media/voices/"
  //   "docs/media/voices/{reporter}.md" (regex stops at last slash before placeholder)
  const dirs = new Set();
  const re = /\bdocs\/[\w/.\-]+\//g;
  let m;
  while ((m = re.exec(content)) !== null) {
    dirs.add(m[0]);
  }
  return dirs;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// For target docs/foo/bar.md: match
//   - [[foo/bar]] / [[foo/bar|...]]
//   - the literal path docs/foo/bar.md
//   - a mention of the parent directory docs/foo/ (directory-walk consumers)
function inboundReferrers(targetRel, contents, dirRefs) {
  const wikilinkForm = targetRel.replace(/^docs\//, '').replace(/\.md$/, '');
  const wlEsc = escapeRe(wikilinkForm);
  const fpEsc = escapeRe(targetRel);
  const re = new RegExp(`\\[\\[${wlEsc}(\\||\\]\\])|${fpEsc}`, 'g');
  const parentDir = path.dirname(targetRel).replace(/\\/g, '/') + '/';
  const checkDirRef = parentDir !== 'docs/';
  const referrers = new Set();
  for (const [src, content] of contents) {
    if (src === targetRel) continue;
    re.lastIndex = 0;
    if (re.test(content)) referrers.add(src);
  }
  if (checkDirRef) {
    for (const [src, dirs] of dirRefs) {
      if (src === targetRel) continue;
      if (dirs.has(parentDir)) referrers.add(src);
    }
  }
  return Array.from(referrers);
}

function classify(doc) {
  const fm = doc.frontmatter || {};
  if (fm.stable === true) {
    return { bucket: 'reference-stable', rationale: 'frontmatter `stable: true`' };
  }
  if (!doc.is_stale) {
    return { bucket: 'fresh', rationale: `${doc.age_days}d old (< ${STALE_DAYS}d)` };
  }
  if (doc.inbound.length === 0) {
    return { bucket: 'orphan-candidate', rationale: `${doc.age_days}d stale, zero inbound refs` };
  }
  if (doc.inbound_active.length > 0) {
    return {
      bucket: 'stable-by-reference',
      rationale: `${doc.age_days}d stale but ${doc.inbound_active.length} active referrer(s)`,
    };
  }
  return {
    bucket: 'stale-but-linked',
    rationale: `${doc.age_days}d stale, ${doc.inbound.length} inbound (none active)`,
  };
}

function main() {
  const start = Date.now();
  process.stdout.write(`[md-audit] walking docs/ ... `);
  const docPaths = walkMd(DOCS_ROOT);
  console.log(`${docPaths.length} files`);

  process.stdout.write(`[md-audit] active-edit set (${ACTIVE_DAYS}d) ... `);
  const activeSet = activeEditSet();
  console.log(`${activeSet.size} files touched`);

  process.stdout.write(`[md-audit] building source-content index ... `);
  const { contents: sourceContents, dirRefs: sourceDirRefs } = buildSourceIndex();
  console.log(`${sourceContents.size} source files`);

  process.stdout.write(`[md-audit] scanning ${docPaths.length} docs ... `);
  const now = new Date();
  const docs = [];
  for (const docRel of docPaths) {
    const fullPath = path.join(REPO_ROOT, docRel);
    const content = fs.readFileSync(fullPath, 'utf8');
    const fm = parseFrontmatter(content);
    const mtime = gitMtime(docRel) || fs.statSync(fullPath).mtime;
    const ageDays = Math.floor((now - mtime) / (1000 * 60 * 60 * 24));
    const isStale = ageDays > STALE_DAYS;
    const inbound = inboundReferrers(docRel, sourceContents, sourceDirRefs);
    const inboundActive = inbound.filter(s => activeSet.has(s));
    const sizeBytes = fs.statSync(fullPath).size;
    const doc = {
      path: docRel,
      frontmatter: fm,
      mtime,
      age_days: ageDays,
      is_stale: isStale,
      inbound,
      inbound_active: inboundActive,
      size_bytes: sizeBytes,
    };
    Object.assign(doc, classify(doc));
    docs.push(doc);
  }
  console.log('done');

  const buckets = {
    'orphan-candidate': [],
    'stale-but-linked': [],
    'stable-by-reference': [],
    'reference-stable': [],
    'fresh': [],
  };
  for (const d of docs) buckets[d.bucket].push(d);

  const dateStr = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(OUTPUT_DIR, `md_audit_${dateStr}.md`);
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const lines = [];
  lines.push(`# MD Audit Report — ${dateStr}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Stale threshold:** ${STALE_DAYS}d | **Active window:** ${ACTIVE_DAYS}d`);
  lines.push(`**Source surface:** ${sourceContents.size} files (docs/, .claude/, top-level *.md)`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Bucket | Count |');
  lines.push('|--------|------:|');
  for (const [name, list] of Object.entries(buckets)) {
    lines.push(`| ${name} | ${list.length} |`);
  }
  lines.push(`| **Total** | **${docs.length}** |`);
  lines.push('');
  lines.push('**This script does not execute destructive actions.** Read the orphan-candidate and stale-but-linked tables, decide per-file whether to archive, fold, or keep. Archival is a separate step (Phase 3 of the md-audit plan, not yet built).');
  lines.push('');

  lines.push(`## Orphan candidates (${buckets['orphan-candidate'].length})`);
  lines.push('');
  lines.push('Stale and zero inbound references. Strongest candidates for archival or fold.');
  lines.push('');
  if (buckets['orphan-candidate'].length === 0) {
    lines.push('_None._');
  } else {
    lines.push('| Path | Age (d) | Size | Suggested archive command |');
    lines.push('|------|--------:|-----:|---------------------------|');
    for (const d of buckets['orphan-candidate'].sort((a, b) => b.age_days - a.age_days)) {
      const sizeKb = (d.size_bytes / 1024).toFixed(1);
      const archivePath = `docs/archive/${path.basename(d.path)}`;
      lines.push(`| \`${d.path}\` | ${d.age_days} | ${sizeKb}K | \`git mv ${d.path} ${archivePath}\` |`);
    }
  }
  lines.push('');

  lines.push(`## Stale-but-linked (${buckets['stale-but-linked'].length})`);
  lines.push('');
  lines.push('Stale but referenced — no referrer is in the active set. Human judgment per row.');
  lines.push('');
  if (buckets['stale-but-linked'].length === 0) {
    lines.push('_None._');
  } else {
    lines.push('| Path | Age (d) | Inbound | Top linkers |');
    lines.push('|------|--------:|--------:|-------------|');
    for (const d of buckets['stale-but-linked'].sort((a, b) => b.age_days - a.age_days)) {
      const top = d.inbound.slice(0, 3).map(s => `\`${s}\``).join(', ');
      const more = d.inbound.length > 3 ? ` +${d.inbound.length - 3}` : '';
      lines.push(`| \`${d.path}\` | ${d.age_days} | ${d.inbound.length} | ${top}${more} |`);
    }
  }
  lines.push('');

  lines.push(`## Stable-by-reference (${buckets['stable-by-reference'].length})`);
  lines.push('');
  lines.push('Stale on its own clock, but actively-edited files reference it. Load-bearing dormant — leave alone.');
  lines.push('');
  if (buckets['stable-by-reference'].length === 0) {
    lines.push('_None._');
  } else {
    for (const d of buckets['stable-by-reference'].sort((a, b) => b.age_days - a.age_days)) {
      lines.push(`- \`${d.path}\` — ${d.age_days}d, ${d.inbound_active.length} active referrer(s)`);
    }
  }
  lines.push('');

  lines.push(`## Reference-stable (${buckets['reference-stable'].length})`);
  lines.push('');
  lines.push('`stable: true` in frontmatter — marked durable. Skipped from staleness scoring.');
  lines.push('');
  if (buckets['reference-stable'].length === 0) {
    lines.push('_None._');
  } else {
    for (const d of buckets['reference-stable'].sort((a, b) => a.path.localeCompare(b.path))) {
      lines.push(`- \`${d.path}\``);
    }
  }
  lines.push('');

  lines.push(`## Fresh (${buckets.fresh.length})`);
  lines.push('');
  lines.push(`Edited within ${STALE_DAYS}d. No table — too many.`);
  lines.push('');

  fs.writeFileSync(reportPath, lines.join('\n'));
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[md-audit] report → ${path.relative(REPO_ROOT, reportPath)} (${elapsed}s)`);
  console.log(`[md-audit] orphan-candidates: ${buckets['orphan-candidate'].length} | stale-but-linked: ${buckets['stale-but-linked'].length}`);
}

main();
