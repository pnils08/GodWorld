#!/usr/bin/env node
/**
 * stubEngine.js — Regenerate engine stub maps (forward + reverse).
 *
 * Scans every engine JS file (phase01-config through phase11-media-intake +
 * utilities/) and emits:
 *   - docs/engine/ENGINE_STUB_MAP.md        — per-function forward map
 *   - docs/engine/ENGINE_STUB_REVERSE.md    — reverse indexes (S.* / sheets)
 *   - docs/engine/ENGINE_STUB_REVERSE.json  — machine-readable reverse indexes
 *
 * Mechanical, deterministic. No LLM, no memory. Run after any engine change:
 *   node scripts/stubEngine.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_FORWARD = path.join(REPO_ROOT, 'docs/engine/ENGINE_STUB_MAP.md');
const OUT_REVERSE_MD = path.join(REPO_ROOT, 'docs/engine/ENGINE_STUB_REVERSE.md');
const OUT_REVERSE_JSON = path.join(REPO_ROOT, 'docs/engine/ENGINE_STUB_REVERSE.json');

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

// Extract top-level function declarations. Top-level functions always start at
// column 0 (indent=0) in this codebase — use that as the delimiter instead of
// brace tracking, which breaks on regex/string literals containing unmatched
// braces (e.g. `/=>\s*[{(]/g` in v2DeprecationGuide.js:83).
function extractFunctions(source) {
  const lines = source.split('\n');
  const funcs = [];
  const funcLines = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^function\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(lines[i])) {
      funcLines.push(i);
    }
  }

  for (let k = 0; k < funcLines.length; k++) {
    const startIdx = funcLines[k];
    const endIdx = k + 1 < funcLines.length ? funcLines[k + 1] : lines.length;
    const header = lines[startIdx];
    const m = header.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/);
    if (!m) continue;
    funcs.push({
      name: m[1],
      params: m[2].trim(),
      line: startIdx + 1,
      body: lines.slice(startIdx, endIdx),
    });
  }

  return funcs;
}

function analyzeFunction(fn) {
  const body = fn.body.join('\n');
  const readsS = new Set();
  const writesS = new Set();
  const readsConfig = new Set();
  const sheetsRead = new Set();
  const sheetsWrite = new Set();
  let usesRng = false;

  // S.X / ctx.summary.X — writes (assignment target on LHS, or ++/+= / .push)
  const writePatterns = [
    /(?:^|[^.\w])(?:S|ctx\.summary)\.([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|\+=|-=|\*=|\/=|\+\+|--|\.push|\.unshift)/g,
  ];
  for (const re of writePatterns) {
    let mm;
    while ((mm = re.exec(body)) !== null) writesS.add(mm[1]);
  }

  // S.X / ctx.summary.X — any reference (read) minus pure writes
  const refRe = /(?:^|[^.\w])(?:S|ctx\.summary)\.([A-Za-z_][A-Za-z0-9_]*)/g;
  let m;
  while ((m = refRe.exec(body)) !== null) {
    if (!writesS.has(m[1])) readsS.add(m[1]);
  }
  // A field that is both written and read still appears as a write; also keep
  // it as a reader of its own prior value when referenced non-assigningly.
  // Re-scan: any reference that isn't solely an assignment target → also read.
  // (Keep simple: if written, still list as reader only when body also has a
  // non-assignment reference. For reverse index usefulness, writers ∩ readers
  // is fine — reverse index lists both.)

  // ctx.config.X
  const cfgRe = /(?:^|[^.\w])ctx\.config\.([A-Za-z_][A-Za-z0-9_]*)/g;
  while ((m = cfgRe.exec(body)) !== null) readsConfig.add(m[1]);

  if (/ctx\.rng|safeRand_\s*\(/.test(body)) usesRng = true;

  // Sheet targets — getSheetByName + intent writers
  const shGetRe = /getSheetByName\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\)/g;
  while ((m = shGetRe.exec(body)) !== null) sheetsRead.add(m[1]);

  const intentRe =
    /queue(?:Cell|Append|Range)Intent_\s*\(\s*ctx\s*,\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g;
  while ((m = intentRe.exec(body)) !== null) {
    sheetsWrite.add(m[1]);
    sheetsRead.add(m[1]); // intents imply knowledge of the sheet
  }

  // Direct sheet string literals in common write APIs
  const directWriteRe =
    /(?:getSheetByName\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\)[\s\S]{0,120}?\.(?:setValues|setValue|appendRow|clear|deleteRows|insertRows|getRange\([^)]*\)\.set))/g;
  // Too brittle for multi-line; instead: if body has setValues/appendRow near a sheet name, mark write.
  // Practical heuristic: sheet name string + write API in same function body.
  const sheetNameRe = /['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g;
  const knownSheetHints = new Set([
    'Simulation_Ledger', 'LifeHistory_Log', 'Ripple_Ledger', 'World_Population',
    'Neighborhood_Map', 'Household_Ledger', 'Business_Ledger', 'Initiative_Tracker',
    'Civic_Office_Ledger', 'Election_Log', 'Relationship_Bond_Ledger',
    'Relationship_Bonds', 'Engine_Errors', 'Riley_Digest', 'Simulation_Calendar',
    'WorldEvents_V3_Ledger', 'WorldEvents_Ledger', 'Story_Seed_Deck',
    'Story_Hook_Deck', 'Event_Content_Ledger', 'Generic_Citizens', 'Intake',
    'Hospital_Ledger', 'Family_Relationships', 'Cultural_Ledger',
    'Neighborhood_Demographics', 'Citizen_Directory', 'Arc_Ledger',
    'Reflection_Intake', 'Press_Drafts', 'Faith_Organizations',
  ]);
  const hasWriteApi =
    /\.(?:setValues|setValue|appendRow)\s*\(/.test(body) ||
    /queue(?:Cell|Append|Range)Intent_/.test(body) ||
    /ctx\.ledger\.dirty\s*=\s*true/.test(body);
  let sm;
  while ((sm = sheetNameRe.exec(body)) !== null) {
    const name = sm[1];
    if (!knownSheetHints.has(name)) continue;
    sheetsRead.add(name);
    if (hasWriteApi && (
      /queue(?:Cell|Append|Range)Intent_/.test(body) ||
      new RegExp(
        `getSheetByName\\(\\s*['"]${name}['"]\\s*\\)[\\s\\S]{0,400}?\\.(?:setValues|setValue|appendRow)`,
      ).test(body) ||
      (name === 'Simulation_Ledger' && /ctx\.ledger\.dirty\s*=\s*true/.test(body))
    )) {
      sheetsWrite.add(name);
    }
  }

  return {
    readsS: [...readsS].sort(),
    writesS: [...writesS].sort(),
    readsConfig: [...readsConfig].sort(),
    sheets: [...new Set([...sheetsRead, ...sheetsWrite])].sort(),
    sheetsRead: [...sheetsRead].sort(),
    sheetsWrite: [...sheetsWrite].sort(),
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

function refKey(phaseDir, file, fnName) {
  return `${phaseDir}/${file}::${fnName}`;
}

function buildReverse(records) {
  const sFields = {}; // field -> { writers: [], readers: [] }
  const sheets = {};  // sheet -> { writers: [], readers: [] }

  function ensureS(field) {
    if (!sFields[field]) sFields[field] = { writers: [], readers: [] };
    return sFields[field];
  }
  function ensureSheet(name) {
    if (!sheets[name]) sheets[name] = { writers: [], readers: [] };
    return sheets[name];
  }

  for (const rec of records) {
    const key = refKey(rec.phaseDir, rec.file, rec.fn.name);
    for (const f of rec.analysis.writesS) {
      ensureS(f).writers.push(key);
    }
    for (const f of rec.analysis.readsS) {
      ensureS(f).readers.push(key);
    }
    // Writers that also reference their field as non-write still only appear
    // in writers above; also add writers to readers of fields they write when
    // the field is read-modify-write (already handled by analyzeFunction split).

    for (const s of rec.analysis.sheetsWrite) {
      ensureSheet(s).writers.push(key);
    }
    for (const s of rec.analysis.sheetsRead) {
      // if pure write already listed, still list as reader only if not write-only
      if (!rec.analysis.sheetsWrite.includes(s) || rec.analysis.sheetsRead.includes(s)) {
        ensureSheet(s).readers.push(key);
      }
    }
  }

  // Dedup + sort
  for (const f of Object.keys(sFields)) {
    sFields[f].writers = [...new Set(sFields[f].writers)].sort();
    sFields[f].readers = [...new Set(sFields[f].readers)].sort();
  }
  for (const s of Object.keys(sheets)) {
    sheets[s].writers = [...new Set(sheets[s].writers)].sort();
    sheets[s].readers = [...new Set(sheets[s].readers)].sort();
  }

  return { sFields, sheets };
}

function formatRefList(refs, maxShow) {
  if (!refs.length) return '_(none)_';
  const show = typeof maxShow === 'number' ? refs.slice(0, maxShow) : refs;
  const body = show.map(r => `\`${r}\``).join(', ');
  if (typeof maxShow === 'number' && refs.length > maxShow) {
    return `${body}, …(+${refs.length - maxShow} more)`;
  }
  return body;
}

function writeReverseMd(reverse, meta) {
  const out = [];
  out.push('# Engine Stub Reverse Index');
  out.push('');
  out.push(`**Generated:** ${meta.date} by \`scripts/stubEngine.js\` (mechanical — no LLM).`);
  out.push('');
  out.push('**Purpose:** Cheap lookup — given an `S.*` field or sheet name, find every function that reads or writes it. Companion to `ENGINE_STUB_MAP.md` (forward: function → fields).');
  out.push('');
  out.push('**Regenerate:** `node scripts/stubEngine.js`');
  out.push('');
  out.push('**Machine form:** `docs/engine/ENGINE_STUB_REVERSE.json`');
  out.push('');
  out.push('**Ref format:** `phaseDir/file.js::functionName`');
  out.push('');
  out.push('**Entrypoint:** [[COUPLING_INDEX]]');
  out.push('');
  out.push('---');
  out.push('');
  out.push(`**Files scanned:** ${meta.totalFiles} · **Functions mapped:** ${meta.totalFuncs} · **S.* fields:** ${Object.keys(reverse.sFields).length} · **Sheets:** ${Object.keys(reverse.sheets).length}`);
  out.push('');

  // ── S.* reverse ──
  out.push('## S.* / ctx.summary reverse index');
  out.push('');
  out.push('| Field | Writers | Readers | #W | #R |');
  out.push('|---|---|---|---:|---:|');

  const fields = Object.keys(reverse.sFields).sort((a, b) => a.localeCompare(b));
  for (const f of fields) {
    const e = reverse.sFields[f];
    out.push(
      `| \`S.${f}\` | ${formatRefList(e.writers, 6)} | ${formatRefList(e.readers, 6)} | ${e.writers.length} | ${e.readers.length} |`
    );
  }

  out.push('');
  out.push('### Orphan / write-only / read-only S.* (quick triage)');
  out.push('');

  const writeOnly = fields.filter(f => reverse.sFields[f].writers.length && !reverse.sFields[f].readers.length);
  const readOnly = fields.filter(f => !reverse.sFields[f].writers.length && reverse.sFields[f].readers.length);
  const multiWriter = fields.filter(f => reverse.sFields[f].writers.length > 1);

  out.push(`- **Write-only (no reader in scan):** ${writeOnly.length ? writeOnly.map(f => `\`S.${f}\``).join(', ') : '_(none)_'}`);
  out.push(`- **Read-only (no writer in scan — may be set outside scanned tree or via bracket access):** ${readOnly.length} fields — see JSON for full list`);
  out.push(`- **Multi-writer fields:** ${multiWriter.length ? multiWriter.map(f => `\`S.${f}\`(${reverse.sFields[f].writers.length})`).join(', ') : '_(none)_'}`);
  out.push('');

  // ── Sheet reverse ──
  out.push('---');
  out.push('');
  out.push('## Sheet reverse index');
  out.push('');
  out.push('Sheet detection: `getSheetByName`, `queue*Intent_`, known sheet-name string + write API / `ctx.ledger.dirty`. Mechanical — may miss dynamic names.');
  out.push('');
  out.push('| Sheet | Writers | Readers | #W | #R |');
  out.push('|---|---|---|---:|---:|');

  const sheetNames = Object.keys(reverse.sheets).sort((a, b) => a.localeCompare(b));
  for (const s of sheetNames) {
    const e = reverse.sheets[s];
    out.push(
      `| \`${s}\` | ${formatRefList(e.writers, 5)} | ${formatRefList(e.readers, 5)} | ${e.writers.length} | ${e.readers.length} |`
    );
  }

  out.push('');
  out.push('---');
  out.push('');
  out.push('## How to use (token-cheap)');
  out.push('');
  out.push('1. Job asks "who writes weatherEvents?" → open this file / JSON, find `S.weatherEvents`.');
  out.push('2. Job asks "who touches Initiative_Tracker?" → sheet table above.');
  out.push('3. Need behavioral meaning of the edge → [[ENGINE_COUPLING_MAP]].');
  out.push('4. Need SL column (not S.*) → [[SIMULATION_LEDGER_COL_MAP]].');
  out.push('5. Need generator gates → `Event_Wiring_Ledger` sheet + [[plans/2026-07-18-event-pools-design]].');
  out.push('');

  fs.writeFileSync(OUT_REVERSE_MD, out.join('\n') + '\n');
}

function main() {
  const date = new Date().toISOString().slice(0, 10);
  const forward = [];
  forward.push('# Engine Stub Map');
  forward.push('');
  forward.push(`**Generated:** ${date} by \`scripts/stubEngine.js\` (mechanical scan — no LLM, no memory).`);
  forward.push('');
  forward.push('**Purpose:** Per-function ctx footprint + sheet targets + RNG usage across every engine JS file. Regenerate with `node scripts/stubEngine.js` after any engine change.');
  forward.push('');
  forward.push('**Reverse index (field/sheet → functions):** [[ENGINE_STUB_REVERSE]] + `ENGINE_STUB_REVERSE.json`');
  forward.push('');
  forward.push('**Entrypoint:** [[COUPLING_INDEX]]');
  forward.push('');
  forward.push('**Convention:** `S.X` is an alias for `ctx.summary.X` used throughout the engine.');
  forward.push('');
  forward.push('---');
  forward.push('');

  let totalFiles = 0;
  let totalFuncs = 0;
  const records = [];

  for (const phase of PHASES) {
    const dir = path.join(REPO_ROOT, phase.dir);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
    if (files.length === 0) continue;
    forward.push(`## ${phase.label} (\`${phase.dir}/\`)`);
    forward.push('');

    for (const file of files) {
      totalFiles++;
      const entries = scanFile(path.join(dir, file));
      totalFuncs += entries.length;
      forward.push(`### ${file}`);
      if (entries.length === 0) {
        forward.push('_No top-level function declarations found (helper/constants file)._');
        forward.push('');
        continue;
      }
      for (const { fn, analysis } of entries) {
        forward.push(formatFunction(fn, analysis));
        forward.push('');
        records.push({
          phaseDir: phase.dir,
          phaseLabel: phase.label,
          file,
          fn,
          analysis,
        });
      }
    }
  }

  forward.push('---');
  forward.push('');
  forward.push(`**Files scanned:** ${totalFiles}`);
  forward.push(`**Functions mapped:** ${totalFuncs}`);

  fs.writeFileSync(OUT_FORWARD, forward.join('\n') + '\n');

  const reverse = buildReverse(records);
  const meta = { date, totalFiles, totalFuncs };
  writeReverseMd(reverse, meta);

  const json = {
    generated: date,
    generator: 'scripts/stubEngine.js',
    filesScanned: totalFiles,
    functionsMapped: totalFuncs,
    sFields: reverse.sFields,
    sheets: reverse.sheets,
  };
  fs.writeFileSync(OUT_REVERSE_JSON, JSON.stringify(json, null, 2) + '\n');

  console.log(`Wrote ${OUT_FORWARD}`);
  console.log(`Wrote ${OUT_REVERSE_MD}`);
  console.log(`Wrote ${OUT_REVERSE_JSON}`);
  console.log(`Files: ${totalFiles} | Functions: ${totalFuncs}`);
  console.log(`S.* fields: ${Object.keys(reverse.sFields).length} | Sheets: ${Object.keys(reverse.sheets).length}`);
}

main();
