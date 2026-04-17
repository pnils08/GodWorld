#!/usr/bin/env node
/**
 * stubEngine.js — Regenerate docs/engine/ENGINE_STUB_MAP.md
 *
 * Scans every engine JS file (phase01-config through phase11-media-intake +
 * utilities/) and emits a per-function map of:
 *   - function signature
 *   - ctx.summary.* / S.* reads and writes
 *   - ctx.config.* reads
 *   - ctx.rng usage
 *   - getSheetByName targets
 *
 * Deterministic, mechanical. No LLM, no memory. Runs over the live tree.
 *
 * Usage: node scripts/stubEngine.js
 * Output: docs/engine/ENGINE_STUB_MAP.md
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(REPO_ROOT, 'docs/engine/ENGINE_STUB_MAP.md');

const PHASES = [
  { dir: 'phase01-config', label: 'Phase 1: Config + Time' },
  { dir: 'phase02-world-state', label: 'Phase 2: World State' },
  { dir: 'phase03-population', label: 'Phase 3: Population' },
  { dir: 'phase04-events', label: 'Phase 4: Events' },
  { dir: 'phase05-citizens', label: 'Phase 5: Citizens' },
  { dir: 'phase06-analysis', label: 'Phase 6: Analysis' },
  { dir: 'phase07-evening-media', label: 'Phase 7: Evening Media' },
  { dir: 'phase08-v3-chicago', label: 'Phase 8: V3 Chicago' },
  { dir: 'phase09-digest', label: 'Phase 9: Digest' },
  { dir: 'phase10-persistence', label: 'Phase 10: Persistence' },
  { dir: 'phase11-media-intake', label: 'Phase 11: Media Intake' },
  { dir: 'utilities', label: 'Utilities' },
];

// Extract top-level function declarations with a brace-depth walk so we can
// attribute reads/writes per function.
function extractFunctions(source) {
  const lines = source.split('\n');
  const funcs = [];
  let current = null;
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect top-level function declaration (we only care about depth=0)
    const m = depth === 0 && line.match(/^\s*function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/);
    if (m) {
      current = {
        name: m[1],
        params: m[2].trim(),
        line: i + 1,
        body: [],
      };
      funcs.push(current);
    }

    if (current) current.body.push(line);

    // Update brace depth by counting (ignoring braces in strings/comments is imperfect but good enough)
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0 && current) current = null;
      }
    }
  }

  return funcs;
}

function analyzeFunction(fn) {
  const body = fn.body.join('\n');
  const readsS = new Set();
  const writesS = new Set();
  const readsConfig = new Set();
  const writesConfig = new Set();
  const sheets = new Set();
  let usesRng = false;

  // S.X / ctx.summary.X — writes (assignment target on LHS, or ++/+=)
  const writePatterns = [
    /(?:^|[^.\w])(?:S|ctx\.summary)\.([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|\+=|-=|\*=|\/=|\+\+|--|\.push|\.unshift)/g,
  ];
  for (const re of writePatterns) {
    let mm;
    while ((mm = re.exec(body)) !== null) writesS.add(mm[1]);
  }

  // S.X / ctx.summary.X — any reference (read) minus those already in writes
  const refRe = /(?:^|[^.\w])(?:S|ctx\.summary)\.([A-Za-z_][A-Za-z0-9_]*)/g;
  let m;
  while ((m = refRe.exec(body)) !== null) {
    if (!writesS.has(m[1])) readsS.add(m[1]);
  }

  // ctx.config.X
  const cfgRe = /(?:^|[^.\w])ctx\.config\.([A-Za-z_][A-Za-z0-9_]*)/g;
  while ((m = cfgRe.exec(body)) !== null) readsConfig.add(m[1]);

  // ctx.rng
  if (/ctx\.rng|safeRand_\s*\(/.test(body)) usesRng = true;

  // getSheetByName('X') or getSheetByName("X")
  const shRe = /getSheetByName\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\)/g;
  while ((m = shRe.exec(body)) !== null) sheets.add(m[1]);

  return {
    readsS: [...readsS].sort(),
    writesS: [...writesS].sort(),
    readsConfig: [...readsConfig].sort(),
    sheets: [...sheets].sort(),
    usesRng,
  };
}

function formatFunction(fn, analysis) {
  const lines = [];
  const sig = fn.params ? `${fn.name}(${fn.params})` : `${fn.name}()`;
  lines.push(`- **${sig}**`);
  if (analysis.readsS.length) {
    lines.push(`  Reads: ${analysis.readsS.map(f => 'S.' + f).join(', ')}`);
  }
  if (analysis.writesS.length) {
    lines.push(`  Writes: ${analysis.writesS.map(f => 'S.' + f).join(', ')}`);
  }
  if (analysis.readsConfig.length) {
    lines.push(`  Config: ${analysis.readsConfig.map(f => 'ctx.config.' + f).join(', ')}`);
  }
  if (analysis.sheets.length) {
    lines.push(`  Sheets: ${analysis.sheets.join(', ')}`);
  }
  if (analysis.usesRng) {
    lines.push(`  RNG: ctx.rng / safeRand_(ctx)`);
  }
  return lines.join('\n');
}

function scanFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const funcs = extractFunctions(source);
  return funcs.map(fn => ({ fn, analysis: analyzeFunction(fn) }));
}

function main() {
  const out = [];
  out.push('# Engine Stub Map');
  out.push('');
  out.push(`**Generated:** ${new Date().toISOString().slice(0, 10)} by \`scripts/stubEngine.js\` (mechanical scan — no LLM, no memory).`);
  out.push('');
  out.push('**Purpose:** Per-function ctx footprint + sheet targets + RNG usage across every engine JS file. Regenerate with `node scripts/stubEngine.js` after any engine change.');
  out.push('');
  out.push('**Convention:** `S.X` is an alias for `ctx.summary.X` used throughout the engine.');
  out.push('');
  out.push('---');
  out.push('');

  let totalFiles = 0;
  let totalFuncs = 0;

  for (const phase of PHASES) {
    const dir = path.join(REPO_ROOT, phase.dir);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
    if (files.length === 0) continue;
    out.push(`## ${phase.label} (\`${phase.dir}/\`)`);
    out.push('');

    for (const file of files) {
      totalFiles++;
      const entries = scanFile(path.join(dir, file));
      totalFuncs += entries.length;
      out.push(`### ${file}`);
      if (entries.length === 0) {
        out.push('_No top-level function declarations found (helper/constants file)._');
        out.push('');
        continue;
      }
      for (const { fn, analysis } of entries) {
        out.push(formatFunction(fn, analysis));
        out.push('');
      }
    }
  }

  out.push('---');
  out.push('');
  out.push(`**Files scanned:** ${totalFiles}`);
  out.push(`**Functions mapped:** ${totalFuncs}`);

  fs.writeFileSync(OUTPUT, out.join('\n') + '\n');
  console.log(`Wrote ${OUTPUT}`);
  console.log(`Files: ${totalFiles} | Functions: ${totalFuncs}`);
}

main();
