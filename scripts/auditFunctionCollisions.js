#!/usr/bin/env node
/**
 * auditFunctionCollisions.js — Apps Script flat-namespace duplicate detector
 *
 * Usage: node scripts/auditFunctionCollisions.js [--write]
 *
 * Apps Script loads all top-level `function name(args) { ... }` declarations
 * into a single global namespace. Multiple defs of the same name silently
 * resolve to the alphabetically-last file's version — earlier defs become
 * dead code OR the wrong implementation gets called depending on caller
 * file order. ENGINE_REPAIR Row 19 tracks the pattern; S191 closed two
 * collisions (loadActiveStorylines_, getCurrentCycle_) discovered via
 * cycle-log error chain.
 *
 * This audit is the systematic version of that discovery — scans every
 * clasp-pushed .js/.gs file for top-level function declarations, groups
 * by name, reports any name with >1 definition.
 *
 * Default is dry-run (prints to stdout). --write persists to:
 *   output/audit_function_collisions.md
 *
 * Pre-commit hook gate: future addition could enforce zero new collisions
 * by running this audit and failing on hit-count regression.
 *
 * Plan: ENGINE_REPAIR Row 19 (open audit work)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Mirror .claspignore exclusions — only audit what gets pushed to Apps Script
const CLASP_DIRS = [
  'phase01-config', 'phase02-world-state', 'phase03-population',
  'phase04-events', 'phase05-citizens', 'phase06-analysis',
  'phase07-evening-media', 'phase08-v3-chicago', 'phase09-rollups',
  'phase10-persistence', 'phase11-misc', 'utilities',
];

const FN_RE = /^function\s+([A-Za-z_\$][A-Za-z0-9_\$]*)\s*\(/;

function walkScripts(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkScripts(p, fn);
    else if (e.isFile() && (p.endsWith('.js') || p.endsWith('.gs'))) {
      fn(p, fs.readFileSync(p, 'utf8'));
    }
  }
}

function main() {
  const writeMode = process.argv.includes('--write');
  const byName = new Map();
  let fileCount = 0;

  for (const dir of CLASP_DIRS) {
    walkScripts(path.join(ROOT, dir), (file, content) => {
      fileCount++;
      content.split('\n').forEach((line, i) => {
        const m = line.match(FN_RE);
        if (!m) return;
        // Skip lines starting with `*` (JSDoc continuation — same false-positive
        // class as engineCycleAudit.js Math.random sweep S199 c596718)
        if (/^\s*\*/.test(line)) return;
        const name = m[1];
        const rel = path.relative(ROOT, file);
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push({ file: rel, line: i + 1 });
      });
    });
  }

  const dupes = [...byName.entries()].filter(([, locs]) => locs.length > 1);
  dupes.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  let md = '';
  md += `# Function-Name Collision Audit\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Script:** \`scripts/auditFunctionCollisions.js\`\n`;
  md += `**Scope:** clasp-pushed dirs (${CLASP_DIRS.length}); ${fileCount} files; ${byName.size} unique top-level function names\n\n`;
  md += `**Plan:** ENGINE_REPAIR Row 19 (open audit work)\n\n`;
  md += `**Why this matters:** Apps Script flat namespace silently resolves duplicate function names to the alphabetically-last file's version. Earlier defs become dead code OR the wrong implementation gets called depending on caller file order. S191 closed two collisions via cycle-log error chain (loadActiveStorylines_, getCurrentCycle_); this audit is the systematic version of that discovery.\n\n`;
  md += `---\n\n`;

  if (dupes.length === 0) {
    md += `## 0 collisions detected\n\nAll ${byName.size} top-level function names are unique across the clasp-pushed scope.\n`;
  } else {
    md += `## ${dupes.length} collision${dupes.length === 1 ? '' : 's'} detected\n\n`;
    md += `Sorted by definition count (most → fewest), then alphabetically.\n\n`;
    for (const [name, locs] of dupes) {
      md += `### \`${name}\` — ${locs.length} definitions\n\n`;
      for (const l of locs) md += `- \`${l.file}:${l.line}\`\n`;
      md += `\n`;
    }
  }

  if (writeMode) {
    const target = path.join(ROOT, 'output', 'audit_function_collisions.md');
    fs.writeFileSync(target, md);
    console.log(`Wrote ${path.relative(ROOT, target)} — ${dupes.length} collision${dupes.length === 1 ? '' : 's'}`);
  } else {
    process.stdout.write(md);
    process.stderr.write(`\n[dry-run] ${dupes.length} collision${dupes.length === 1 ? '' : 's'}; pass --write to persist.\n`);
  }
}

main();
