#!/usr/bin/env node
/**
 * mdStalenessDetector.js — Detect stale + orphan MD files across GodWorld's
 * documentation, Claude control-plane, and project-memory surfaces.
 *
 * Walks docs/, .claude/, and the project memory directory; computes last-edit
 * time + inbound-link count per .md file; classifies into 5 buckets; and writes
 * output/md_audit_<DATE>.md. Read-only — never moves or deletes anything.
 *
 * Usage:
 *   node scripts/mdStalenessDetector.js                   # default 90/30 day windows
 *   node scripts/mdStalenessDetector.js --stale-days 60   # tighter staleness threshold
 *   node scripts/mdStalenessDetector.js --active-days 14  # tighter active window
 *   node scripts/mdStalenessDetector.js --memory-root PATH
 *
 * Plan: docs/archive/plans/2026-04-21-md-audit-skill.md
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_ROOT = path.join(REPO_ROOT, 'docs');
const CLAUDE_ROOT = path.join(REPO_ROOT, '.claude');
const OUTPUT_DIR = path.join(REPO_ROOT, 'output');

const args = process.argv.slice(2);
function flag(name, defaultVal) {
  const idx = args.indexOf(name);
  if (idx === -1) return defaultVal;
  return args[idx + 1];
}
const STALE_DAYS = parseInt(flag('--stale-days', '90'), 10);
const ACTIVE_DAYS = parseInt(flag('--active-days', '30'), 10);
const DEFAULT_MEMORY_ROOT = path.resolve(
  REPO_ROOT,
  '..',
  '.claude',
  'projects',
  '-root-GodWorld',
  'memory',
);
const MEMORY_ROOT = path.resolve(flag('--memory-root', DEFAULT_MEMORY_ROOT));

function auditRoots(memoryRoot = MEMORY_ROOT) {
  return [
    {
      surface: 'docs',
      root: DOCS_ROOT,
      prefix: 'docs',
      excludePrefixes: [
        'docs/archive/',
        'docs/drive-files/',
        'docs/research/papers/',
      ],
    },
    {
      surface: 'control-plane',
      root: CLAUDE_ROOT,
      prefix: '.claude',
      excludePrefixes: [],
    },
    {
      surface: 'memory',
      root: memoryRoot,
      prefix: 'memory',
      excludePrefixes: [],
    },
  ];
}

function isExcluded(relPath, excludePrefixes) {
  return excludePrefixes.some(p => relPath.startsWith(p));
}

function walkAuditRoot(spec, dir = spec.root, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const withinRoot = path.relative(spec.root, full).replace(/\\/g, '/');
    const rel = withinRoot ? `${spec.prefix}/${withinRoot}` : spec.prefix;
    if (entry.isDirectory()) {
      const dirRel = rel + '/';
      if (isExcluded(dirRel, spec.excludePrefixes)) continue;
      walkAuditRoot(spec, full, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (isExcluded(rel, spec.excludePrefixes)) continue;
      results.push({
        path: rel,
        fullPath: full,
        gitPath: spec.surface === 'memory' ? null : rel,
        surface: spec.surface,
      });
    }
  }
  return results;
}

function collectAuditDocs(roots = auditRoots()) {
  return roots.flatMap(spec => walkAuditRoot(spec));
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

function runGit(args, purpose) {
  try {
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (err) {
    const detail = err && err.code ? ` (${err.code})` : '';
    console.warn(`[md-audit] WARN: ${purpose} unavailable${detail}; using filesystem mtimes`);
    return null;
  }
}

function parseGitHistoryMtimes(output) {
  const mtimes = new Map();
  let timestamp = null;
  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('@@MD_AUDIT_COMMIT@@')) {
      const parsed = parseInt(line.slice('@@MD_AUDIT_COMMIT@@'.length), 10);
      timestamp = Number.isFinite(parsed) ? parsed : null;
      continue;
    }
    if (timestamp !== null && !mtimes.has(line)) {
      mtimes.set(line, new Date(timestamp * 1000));
    }
  }
  return mtimes;
}

function gitMtimeMap() {
  const output = runGit(
    [
      'log',
      '--format=@@MD_AUDIT_COMMIT@@%ct',
      '--name-only',
      '--',
      'docs',
      '.claude',
    ],
    'Git last-edit history',
  );
  return parseGitHistoryMtimes(output || '');
}

function isRecent(date, days, now = new Date()) {
  return (now - date) <= days * 24 * 60 * 60 * 1000;
}

function workingTreeEditSet() {
  const commands = [
    [['diff', '--name-only'], 'Git unstaged-change scan'],
    [['diff', '--cached', '--name-only'], 'Git staged-change scan'],
    [['ls-files', '--others', '--exclude-standard'], 'Git untracked-file scan'],
  ];
  const paths = new Set();
  for (const [gitArgs, purpose] of commands) {
    const output = runGit(gitArgs, purpose);
    for (const line of (output || '').split('\n')) {
      const rel = line.trim();
      if (rel) paths.add(rel);
    }
  }
  return paths;
}

function activeEditSet(sourceEntries, workingEdits, now = new Date()) {
  const out = runGit(
    [
      'log',
      `--since=${ACTIVE_DAYS} days ago`,
      '--name-only',
      '--pretty=format:',
    ],
    'Git active-edit history',
  );
  const active = new Set(
    (out || '').split('\n').map(s => s.trim()).filter(Boolean),
  );
  for (const rel of workingEdits) active.add(rel);

  // Project-memory files are outside the repository. Filesystem mtime is their
  // only deterministic activity signal, and also serves as a fail-visible
  // fallback if Git history is unavailable.
  for (const entry of sourceEntries) {
    if (entry.gitPath && out !== null) continue;
    try {
      if (isRecent(fs.statSync(entry.fullPath).mtime, ACTIVE_DAYS, now)) {
        active.add(entry.path);
      }
    } catch {
      // A source removed between discovery and stat is ignored; the next run
      // will omit it entirely.
    }
  }
  return active;
}

function buildSourceIndex(auditDocs) {
  const sources = new Map(auditDocs.map(doc => [doc.path, doc]));
  for (const f of ['CLAUDE.md', 'MEMORY.md', 'CONTEXT.md', 'SESSION_CONTEXT.md', 'README.md']) {
    const fullPath = path.join(REPO_ROOT, f);
    if (fs.existsSync(fullPath)) {
      sources.set(f, {
        path: f,
        fullPath,
        gitPath: f,
        surface: 'root',
      });
    }
  }
  const contents = new Map();
  const dirRefs = new Map();
  for (const [sourcePath, source] of sources) {
    const content = fs.readFileSync(source.fullPath, 'utf8');
    contents.set(sourcePath, content);
    dirRefs.set(sourcePath, extractDirectoryRefs(content));
  }
  return {
    contents,
    dirRefs,
    entries: Array.from(sources.values()),
  };
}

function extractDirectoryRefs(content) {
  // Capture audited-surface path tokens that end with `/`. Catches:
  //   "the full roster is in docs/media/voices/"
  //   "agents live at .claude/agents/business-desk/"
  //   "docs/media/voices/{reporter}.md" (regex stops at last slash before placeholder)
  const dirs = new Set();
  const re = /(?:\bdocs\/|(?<![\w.])\.claude\/|\bmemory\/)[\w/.\-]+\//g;
  let m;
  while ((m = re.exec(content)) !== null) {
    dirs.add(m[0]);
  }
  return dirs;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Match canonical wikilinks, literal paths, relative Markdown links, and exact
// parent-directory references. The relative-link branch is load-bearing for
// the external project-memory index (`MEMORY.md` → `feedback_*.md`).
function inboundReferrers(target, contents, dirRefs) {
  const targetRel = target.path;
  const wikilinkForm = targetRel.startsWith('docs/')
    ? targetRel.replace(/^docs\//, '').replace(/\.md$/, '')
    : targetRel.replace(/\.md$/, '');
  const directForms = [targetRel, target.fullPath].filter(Boolean);
  const directRe = new RegExp(
    `\\[\\[${escapeRe(wikilinkForm)}(\\||\\]\\])|${directForms.map(escapeRe).join('|')}`,
    'g',
  );
  const parentDir = path.posix.dirname(targetRel) + '/';
  const checkDirRef = !['docs/', '.claude/', 'memory/'].includes(parentDir);
  const referrers = new Set();
  for (const [src, content] of contents) {
    if (src === targetRel) continue;
    directRe.lastIndex = 0;
    if (directRe.test(content)) {
      referrers.add(src);
      continue;
    }

    const relativeTarget = path.posix.relative(path.posix.dirname(src), targetRel);
    const relativeRe = new RegExp(
      `\\]\\((?:\\./)?${escapeRe(relativeTarget)}(?:#[^)]*)?\\)`,
    );
    if (relativeRe.test(content)) referrers.add(src);
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

function reviewAction(doc) {
  if (doc.surface === 'docs') {
    return 'Review for indexed fold/archive; no automatic move';
  }
  if (doc.surface === 'control-plane') {
    return 'Claude control-plane review only; Codex/Kimi must not move it';
  }
  if (doc.surface === 'memory') {
    return 'Review MEMORY.md indexing and retention; never auto-move';
  }
  return 'Human review';
}

function main() {
  const start = Date.now();
  process.stdout.write('[md-audit] walking docs/, .claude/, and project memory ... ');
  const roots = auditRoots();
  const missingRoots = roots.filter(spec => !fs.existsSync(spec.root));
  const auditDocs = collectAuditDocs(roots);
  const surfaceCounts = auditDocs.reduce((counts, doc) => {
    counts[doc.surface] = (counts[doc.surface] || 0) + 1;
    return counts;
  }, {});
  console.log(
    `${auditDocs.length} files `
      + `(docs=${surfaceCounts.docs || 0}, control-plane=${surfaceCounts['control-plane'] || 0}, memory=${surfaceCounts.memory || 0})`,
  );
  for (const spec of missingRoots) {
    console.warn(`[md-audit] WARN: ${spec.surface} root not found: ${spec.root}`);
  }

  process.stdout.write('[md-audit] building source-content index ... ');
  const {
    contents: sourceContents,
    dirRefs: sourceDirRefs,
    entries: sourceEntries,
  } = buildSourceIndex(auditDocs);
  console.log(`${sourceContents.size} source files`);

  process.stdout.write(`[md-audit] active-edit set (${ACTIVE_DAYS}d) ... `);
  const workingEdits = workingTreeEditSet();
  const activeSet = activeEditSet(sourceEntries, workingEdits);
  console.log(`${activeSet.size} files touched`);

  process.stdout.write('[md-audit] loading batched Git mtimes ... ');
  const historyMtimes = gitMtimeMap();
  console.log(`${historyMtimes.size} tracked Markdown paths`);

  process.stdout.write(`[md-audit] scanning ${auditDocs.length} Markdown files ... `);
  const now = new Date();
  const docs = [];
  for (const auditDoc of auditDocs) {
    const content = fs.readFileSync(auditDoc.fullPath, 'utf8');
    const fm = parseFrontmatter(content);
    const mtime = (auditDoc.gitPath && workingEdits.has(auditDoc.gitPath)
      ? fs.statSync(auditDoc.fullPath).mtime
      : null)
      || (auditDoc.gitPath && historyMtimes.get(auditDoc.gitPath))
      || fs.statSync(auditDoc.fullPath).mtime;
    const ageDays = Math.floor((now - mtime) / (1000 * 60 * 60 * 24));
    const isStale = ageDays > STALE_DAYS;
    const inbound = inboundReferrers(auditDoc, sourceContents, sourceDirRefs);
    const inboundActive = inbound.filter(s => activeSet.has(s));
    const sizeBytes = fs.statSync(auditDoc.fullPath).size;
    const doc = {
      path: auditDoc.path,
      surface: auditDoc.surface,
      frontmatter: fm,
      mtime,
      age_days: ageDays,
      is_stale: isStale,
      inbound,
      inbound_active: inboundActive,
      size_bytes: sizeBytes,
    };
    Object.assign(doc, classify(doc));
    doc.review_action = reviewAction(doc);
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
  lines.push(
    `**Audit surface:** ${docs.length} files `
      + `(docs=${surfaceCounts.docs || 0}, control-plane=${surfaceCounts['control-plane'] || 0}, memory=${surfaceCounts.memory || 0})`,
  );
  lines.push(`**Reference surface:** ${sourceContents.size} files (audited surfaces + top-level anchors)`);
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
  lines.push('**This script does not execute destructive actions.** Read the orphan-candidate and stale-but-linked tables, then route review by surface. `docs/` may be folded or archived through its indexed lifecycle; `.claude/` is Claude-owned control plane; project memory is retained or re-indexed through `memory/MEMORY.md`. Nothing here is an automatic move/delete instruction.');
  lines.push('');

  lines.push(`## Orphan candidates (${buckets['orphan-candidate'].length})`);
  lines.push('');
  lines.push('Stale and zero inbound references. Strongest candidates for archival or fold.');
  lines.push('');
  if (buckets['orphan-candidate'].length === 0) {
    lines.push('_None._');
  } else {
    lines.push('| Path | Surface | Age (d) | Size | Review action |');
    lines.push('|------|---------|--------:|-----:|---------------|');
    for (const d of buckets['orphan-candidate'].sort((a, b) => b.age_days - a.age_days)) {
      const sizeKb = (d.size_bytes / 1024).toFixed(1);
      lines.push(`| \`${d.path}\` | ${d.surface} | ${d.age_days} | ${sizeKb}K | ${d.review_action} |`);
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
    lines.push('| Path | Surface | Age (d) | Inbound | Top linkers |');
    lines.push('|------|---------|--------:|--------:|-------------|');
    for (const d of buckets['stale-but-linked'].sort((a, b) => b.age_days - a.age_days)) {
      const top = d.inbound.slice(0, 3).map(s => `\`${s}\``).join(', ');
      const more = d.inbound.length > 3 ? ` +${d.inbound.length - 3}` : '';
      lines.push(`| \`${d.path}\` | ${d.surface} | ${d.age_days} | ${d.inbound.length} | ${top}${more} |`);
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

if (require.main === module) {
  main();
}

module.exports = {
  auditRoots,
  walkAuditRoot,
  collectAuditDocs,
  parseFrontmatter,
  parseGitHistoryMtimes,
  extractDirectoryRefs,
  inboundReferrers,
  classify,
  reviewAction,
  isRecent,
};
