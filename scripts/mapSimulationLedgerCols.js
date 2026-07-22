#!/usr/bin/env node
/**
 * mapSimulationLedgerCols.js — Mechanical Simulation_Ledger column interaction map.
 *
 * Reads live column headers from schemas/SCHEMA_HEADERS.md (## Simulation_Ledger),
 * scans engine phase + utilities JS for header-name indexOf / string references,
 * classifies write vs read per function, emits:
 *   docs/engine/SIMULATION_LEDGER_COL_MAP.md
 *   docs/engine/SIMULATION_LEDGER_COL_MAP.json
 *
 * Mechanical. No LLM. Complements ENGINE_STUB_REVERSE (which covers S.* / sheets,
 * not per-column ledger cells).
 *
 * Usage: node scripts/mapSimulationLedgerCols.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA = path.join(REPO_ROOT, 'schemas/SCHEMA_HEADERS.md');
const OUT_MD = path.join(REPO_ROOT, 'docs/engine/SIMULATION_LEDGER_COL_MAP.md');
const OUT_JSON = path.join(REPO_ROOT, 'docs/engine/SIMULATION_LEDGER_COL_MAP.json');

const SCAN_DIRS = [
  'phase01-config',
  'phase02-world-state',
  'phase03-population',
  'phase04-events',
  'phase05-citizens',
  'phase06-analysis',
  'phase07-evening-media',
  'phase08-v3-chicago',
  'phase09-digest',
  'phase10-persistence',
  'phase11-media-intake',
  'utilities',
];

// Aliases: sheet header → common code search keys
const ALIASES = {
  'UNI (y/n)': ['UNI (y/n)', 'UNI'],
  'MED (y/n)': ['MED (y/n)', 'MED'],
  'CIV (y/n)': ['CIV (y/n)', 'CIV'],
  MaidenName: ['MaidenName', 'Middle'], // historical Middle→MaidenName rename
};

function parseSimulationLedgerHeaders(schemaText) {
  const start = schemaText.indexOf('## Simulation_Ledger');
  if (start < 0) throw new Error('## Simulation_Ledger not found in SCHEMA_HEADERS.md');
  const rest = schemaText.slice(start);
  const next = rest.indexOf('\n## ', 3);
  const section = next < 0 ? rest : rest.slice(0, next);
  const cols = [];
  const rowRe = /^\|\s*([A-Z]+)\s*\|\s*([^|]+?)\s*\|/gm;
  let m;
  while ((m = rowRe.exec(section)) !== null) {
    const letter = m[1].trim();
    const header = m[2].trim();
    if (letter === 'Col' || header === 'Header') continue;
    cols.push({ letter, header });
  }
  if (!cols.length) throw new Error('No Simulation_Ledger columns parsed');
  return cols;
}

function extractFunctions(source) {
  const lines = source.split('\n');
  const funcLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^function\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(lines[i])) funcLines.push(i);
  }
  const funcs = [];
  for (let k = 0; k < funcLines.length; k++) {
    const startIdx = funcLines[k];
    const endIdx = k + 1 < funcLines.length ? funcLines[k + 1] : lines.length;
    const header = lines[startIdx];
    const m = header.match(/^function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/);
    if (!m) continue;
    funcs.push({
      name: m[1],
      line: startIdx + 1,
      body: lines.slice(startIdx, endIdx).join('\n'),
    });
  }
  return funcs;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect whether a function body references a column header string, and whether
 * it looks like a write to that column on ledger rows.
 */
function classifyColInBody(body, searchKeys) {
  let mentioned = false;
  let isWrite = false;

  for (const key of searchKeys) {
    // indexOf('Key') / indexOf("Key") — primary ledger pattern
    const idxRe = new RegExp(
      `indexOf\\(\\s*['"]${escapeRe(key)}['"]\\s*\\)`,
      'g'
    );
    if (idxRe.test(body)) {
      mentioned = true;
      // Capture variable names assigned from indexOf('Key')
      const varRe = new RegExp(
        `(?:var|let|const)\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*[^;\\n]*indexOf\\(\\s*['"]${escapeRe(key)}['"]\\s*\\)`,
        'g'
      );
      let vm;
      const vars = new Set();
      while ((vm = varRe.exec(body)) !== null) vars.add(vm[1]);

      // Also bare: iIncome = header.indexOf('Income')
      const assignRe = new RegExp(
        `([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*[^;\\n]*indexOf\\(\\s*['"]${escapeRe(key)}['"]\\s*\\)`,
        'g'
      );
      while ((vm = assignRe.exec(body)) !== null) vars.add(vm[1]);

      for (const v of vars) {
        // row[iX] =  or rows[r][iX] =  or cells[iX] =
        const writeRe = new RegExp(
          `(?:\\w+)\\s*\\[\\s*${escapeRe(v)}\\s*\\]\\s*=`,
          'g'
        );
        const writeRe2 = new RegExp(
          `\\]\\s*\\[\\s*${escapeRe(v)}\\s*\\]\\s*=`,
          'g'
        );
        if (writeRe.test(body) || writeRe2.test(body)) isWrite = true;
      }

      // Generic: after indexOf of this key, any row[i...] = within function
      // if dirty flag + indexOf present, treat as write candidate when
      // assignment uses bracket with variable that was set from this indexOf.
      if (/ctx\.ledger\.dirty\s*=\s*true/.test(body) && vars.size) {
        for (const v of vars) {
          if (new RegExp(`\\[\\s*${escapeRe(v)}\\s*\\]\\s*=`).test(body)) {
            isWrite = true;
          }
        }
      }
    }

    // String literal references (weaker — still counts as mention)
    const litRe = new RegExp(`['"]${escapeRe(key)}['"]`);
    if (litRe.test(body)) mentioned = true;

    // queueCellIntent_ to Simulation_Ledger with column number is rare;
    // header-name in comments not counted.
  }

  // LifeHistory special: often mutated via string append without indexOf in same fn
  // (handled when key is LifeHistory and dirty + LifeHistory present)

  return { mentioned, isWrite };
}

function searchKeysFor(header) {
  if (ALIASES[header]) return ALIASES[header];
  // Also try without trailing spaces
  return [header, header.trim()];
}

function scanTree(cols) {
  // colKey -> { writers: Set, readers: Set }
  const map = {};
  for (const c of cols) {
    map[c.header] = {
      letter: c.letter,
      header: c.header,
      writers: new Set(),
      readers: new Set(),
      files: new Set(),
    };
  }

  for (const dir of SCAN_DIRS) {
    const abs = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    const files = fs.readdirSync(abs).filter(f => f.endsWith('.js')).sort();
    for (const file of files) {
      const source = fs.readFileSync(path.join(abs, file), 'utf8');
      const funcs = extractFunctions(source);
      // Also whole-file fallback for module-level (rare)
      const units = funcs.length
        ? funcs.map(fn => ({ ref: `${dir}/${file}::${fn.name}`, body: fn.body }))
        : [{ ref: `${dir}/${file}::(module)`, body: source }];

      for (const unit of units) {
        for (const c of cols) {
          const keys = searchKeysFor(c.header);
          const { mentioned, isWrite } = classifyColInBody(unit.body, keys);
          if (!mentioned) continue;
          map[c.header].files.add(`${dir}/${file}`);
          if (isWrite) {
            map[c.header].writers.add(unit.ref);
          } else {
            map[c.header].readers.add(unit.ref);
          }
        }
      }
    }
  }

  // Serialize sets
  const result = {};
  for (const c of cols) {
    const e = map[c.header];
    result[c.header] = {
      letter: e.letter,
      header: e.header,
      writers: [...e.writers].sort(),
      readers: [...e.readers].sort(),
      files: [...e.files].sort(),
    };
  }
  return result;
}

function formatList(arr, max) {
  if (!arr.length) return '_(none)_';
  const show = arr.slice(0, max);
  const body = show.map(x => `\`${x}\``).join(', ');
  if (arr.length > max) return `${body}, …(+${arr.length - max})`;
  return body;
}

function main() {
  const date = new Date().toISOString().slice(0, 10);
  const schema = fs.readFileSync(SCHEMA, 'utf8');
  const cols = parseSimulationLedgerHeaders(schema);
  const map = scanTree(cols);

  const out = [];
  out.push('# Simulation_Ledger Column Interaction Map');
  out.push('');
  out.push(`**Generated:** ${date} by \`scripts/mapSimulationLedgerCols.js\` (mechanical — no LLM).`);
  out.push('');
  out.push('**Source headers:** `schemas/SCHEMA_HEADERS.md` → `## Simulation_Ledger`');
  out.push('');
  out.push('**Purpose:** Per-column writers/readers on Simulation_Ledger so jobs do not re-search the tree for "who mutates Income / DialState / Status".');
  out.push('');
  out.push('**Regenerate:** `node scripts/mapSimulationLedgerCols.js` (after schema or engine changes)');
  out.push('');
  out.push('**Machine form:** `docs/engine/SIMULATION_LEDGER_COL_MAP.json`');
  out.push('');
  out.push('**Entrypoint:** [[COUPLING_INDEX]] · behavioral meaning: [[ENGINE_COUPLING_MAP]] · S.* reverse: [[ENGINE_STUB_REVERSE]]');
  out.push('');
  out.push('**Method limits:** detects `header.indexOf(\'Col\')` + `row[iCol]=` write pattern and string-literal mentions. Misses pure positional column numbers with no header name. False readers possible when a string appears only in a comment or unrelated context.');
  out.push('');
  out.push('---');
  out.push('');
  out.push(`**Columns:** ${cols.length}`);
  out.push('');

  out.push('| Col | Header | Writers | Readers | #W | #R |');
  out.push('|---|---|---|---|---:|---:|');

  let noWriter = [];
  let noTouch = [];

  for (const c of cols) {
    const e = map[c.header];
    out.push(
      `| ${e.letter} | \`${e.header}\` | ${formatList(e.writers, 4)} | ${formatList(e.readers, 4)} | ${e.writers.length} | ${e.readers.length} |`
    );
    if (!e.writers.length && !e.readers.length) noTouch.push(e.header);
    else if (!e.writers.length) noWriter.push(e.header);
  }

  out.push('');
  out.push('## Triage');
  out.push('');
  out.push(`- **No engine touch detected:** ${noTouch.length ? noTouch.map(h => `\`${h}\``).join(', ') : '_(none)_'}`);
  out.push(`- **Read-only in scan (no write pattern):** ${noWriter.length ? noWriter.map(h => `\`${h}\``).join(', ') : '_(none)_'}`);
  out.push('');
  out.push('## How to use');
  out.push('');
  out.push('1. "Who sets Status?" → row `Status` writers column.');
  out.push('2. "Is UsageCount dead?" → no writers + no readers (or readers only in audits).');
  out.push('3. Need dial fold path → `DialState` / `MemoryRegisters` writers (expect compressLifeHistory).');
  out.push('4. Cross-sheet S.* cascades still live in [[ENGINE_STUB_REVERSE]] + [[ENGINE_COUPLING_MAP]].');
  out.push('');

  // Detail sections for multi-writer / structural columns
  out.push('## Detail — multi-writer columns');
  out.push('');
  for (const c of cols) {
    const e = map[c.header];
    if (e.writers.length < 2) continue;
    out.push(`### ${e.letter} — \`${e.header}\` (${e.writers.length} writers)`);
    out.push('');
    out.push('**Writers:**');
    for (const w of e.writers) out.push(`- \`${w}\``);
    out.push('');
    if (e.readers.length) {
      out.push(`**Readers (${e.readers.length}):** ${formatList(e.readers, 12)}`);
      out.push('');
    }
  }

  fs.writeFileSync(OUT_MD, out.join('\n') + '\n');
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generated: date,
        generator: 'scripts/mapSimulationLedgerCols.js',
        columnCount: cols.length,
        columns: map,
      },
      null,
      2
    ) + '\n'
  );

  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Columns: ${cols.length}`);
  console.log(`No-touch: ${noTouch.length} | Read-only: ${noWriter.length}`);
}

main();
