#!/usr/bin/env node
/**
 * scanDeadCode.js — Unreferenced-function detection across the engine.
 *
 * Walks all engine .js files, extracts function declarations, then for each
 * function name counts references across the engine + scripts + skills + lib.
 * If only the definition line matches, function is flagged as unreferenced.
 *
 * Allowlist applied:
 *   - Apps Script trigger names (onOpen, onEdit, doGet, doPost, etc.)
 *   - Functions with bare names (no underscore suffix) — likely menu callbacks
 *     referenced by string in godWorldMenu.js or external trigger config
 *   - Functions explicitly referenced by string in godWorldMenu.js or any
 *     file (caught via second grep pass for "'NAME'" or "\"NAME\"")
 *
 * Output: docs/engine/tech_debt_audits/2026-04-29-dead-code-scan.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const ENGINE_DIRS = [
  'phase01-config', 'phase02-world-state', 'phase03-population',
  'phase04-events', 'phase05-citizens', 'phase06-analysis',
  'phase06-tracking', 'phase07-evening-media', 'phase08-digest',
  'phase09-digest', 'phase10-persistence', 'phase11-media-intake',
  'utilities'
];
const SEARCH_DIRS = [...ENGINE_DIRS, 'scripts', '.claude/skills', 'lib'];

const APPS_SCRIPT_TRIGGERS = new Set([
  'onOpen', 'onEdit', 'onSelectionChange', 'onInstall', 'onFormSubmit',
  'doGet', 'doPost'
]);

function listEngineFiles() {
  const files = [];
  for (const dir of ENGINE_DIRS) {
    const full = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, files);
  }
  return files;
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(p);
  }
}

function extractFunctions(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const fns = [];
  const re = /^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
  lines.forEach((line, idx) => {
    const m = line.match(re);
    if (m) fns.push({ name: m[1], file: filePath, line: idx + 1 });
  });
  return fns;
}

function countReferences(name) {
  // Use grep -r with word boundary; count lines, not occurrences
  try {
    const cmd = `grep -rwE "${name}" ` + SEARCH_DIRS.map(d => `"${path.join(REPO_ROOT, d)}"`).join(' ') + ` --include="*.js" --include="*.md" --include="*.json" 2>/dev/null | wc -l`;
    const out = execSync(cmd, { encoding: 'utf8' });
    return parseInt(out.trim(), 10);
  } catch (e) {
    return 0;
  }
}

function isAllowlisted(fn, callerFiles) {
  if (APPS_SCRIPT_TRIGGERS.has(fn.name)) return { allow: true, reason: 'Apps Script trigger' };
  // Functions referenced as string literal (menu addItem, etc.)
  try {
    const cmd = `grep -rE "['\\"]${fn.name}['\\"]" ` + SEARCH_DIRS.map(d => `"${path.join(REPO_ROOT, d)}"`).join(' ') + ` --include="*.js" --include="*.md" --include="*.json" 2>/dev/null | wc -l`;
    const out = parseInt(execSync(cmd, { encoding: 'utf8' }).trim(), 10);
    if (out > 0) return { allow: true, reason: 'string-literal reference (menu / dispatch / config)' };
  } catch (e) { /* ignore */ }
  // Heuristic: bare-named functions (no trailing underscore) likely public Apps Script entry points
  if (!fn.name.endsWith('_')) return { allow: true, reason: 'bare-named (likely public Apps Script entry)' };
  return { allow: false, reason: '' };
}

function main() {
  console.log('Scanning engine files...');
  const files = listEngineFiles();
  console.log(`  ${files.length} files`);

  const allFunctions = [];
  for (const f of files) allFunctions.push(...extractFunctions(f));
  console.log(`  ${allFunctions.length} function declarations`);

  // Group by name; count references
  const nameMap = new Map();
  for (const fn of allFunctions) {
    if (!nameMap.has(fn.name)) nameMap.set(fn.name, []);
    nameMap.get(fn.name).push(fn);
  }
  console.log(`  ${nameMap.size} unique function names`);

  console.log('Counting references (this is the slow step)...');
  const unreferenced = [];
  const allowlisted = [];
  let processed = 0;
  for (const [name, defs] of nameMap.entries()) {
    processed++;
    if (processed % 50 === 0) console.log(`  ...${processed}/${nameMap.size}`);
    const refs = countReferences(name);
    // Subtract definition lines (one per def site)
    const callerRefs = refs - defs.length;
    if (callerRefs > 0) continue;
    const fn = defs[0];
    const allowed = isAllowlisted(fn, []);
    if (allowed.allow) {
      allowlisted.push({ ...fn, allowReason: allowed.reason, defs: defs.length });
    } else {
      unreferenced.push({ ...fn, defs: defs.length });
    }
  }

  console.log('---');
  console.log(`Unreferenced (truly dead): ${unreferenced.length}`);
  console.log(`Allowlisted: ${allowlisted.length}`);

  const out = {
    scannedAt: new Date().toISOString(),
    filesScanned: files.length,
    totalFunctionDecls: allFunctions.length,
    uniqueFunctionNames: nameMap.size,
    unreferenced,
    allowlisted
  };
  const outPath = path.join(REPO_ROOT, 'output', 'dead-code-scan-2026-04-29.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote: ${outPath}`);
}

main();
