#!/usr/bin/env node
/**
 * tabReferenceIntegrity.test.js — infrastructure.6 Track B regression guard
 * Plan: docs/plans/2026-07-31-engine-observability-integrity.md (Task 6)
 *
 * Asserts every tab name literal referenced via getSheetByName()/insertSheet()
 * in engine code (phase*\/, utilities/, lib/) either:
 *   1. exists as a `## <Tab>` header in schemas/SCHEMA_HEADERS.md, or
 *   2. is on the explicit ALLOWLIST below, with a cited reason.
 *
 * Fails loud with the offender list (file:line) so a new ghost reference
 * cannot sneak in unnoticed. Includes a negative self-test: a synthetic
 * source carrying getSheetByName('Ghost_X') must be flagged.
 *
 * ALLOWLIST DEBT as of 2026-08-16 (each entry is a known gap, not a blessing):
 * - Most entries are LIVE tabs missing a schemas/SCHEMA_HEADERS.md header —
 *   a schema-doc gap owned by engine-sheet. Remove entries as headers land.
 * - Health_Cause_Intake: ghost whose CREATE was Mike-ruled 2026-08-16
 *   (infrastructure.6 Track B); live tab creation is engine-sheet's execute
 *   domain. Entry comes off when the tab exists AND has a schema header.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_HEADERS = path.join(REPO_ROOT, 'schemas', 'SCHEMA_HEADERS.md');

// Tab names that are real/auto-created/pending but carry no
// schemas/SCHEMA_HEADERS.md `## <Tab>` header. EVERY entry needs a citation.
const ALLOWLIST = {
  'Business_Archive':    'lazy tab, engine.96 Task 7 closure ledger — created by a Phase-10 ensure intent at the first closure, read/removed-from by Phase11-BusinessArchive (docs/SPREADSHEET.md:152); schema header lands when the tab exists live',
  // --- Live tabs, schema-doc gap (verified in docs/SPREADSHEET.md tab inventory) ---
  'Chicago_Citizens':    'live tab (docs/SPREADSHEET.md:143); schema header missing',
  'Chicago_Feed':        'live tab, engine-written every cycle (utilities/v3ChicagoWriter.js ensureSheet_; docs/SPREADSHEET.md:130); schema header missing',
  'Chicago_Sports_Feed': 'live tab (docs/SPREADSHEET.md:131); schema header missing',
  'Citizen_Media_Usage': 'live tab (docs/SPREADSHEET.md:115); schema header missing',
  'Citizen_Usage_Intake':'live tab (docs/SPREADSHEET.md:114); schema header missing',
  'Health_Cause_Queue':  'live tab (docs/SPREADSHEET.md:119); schema header missing',
  'Hospital_Ledger':     'lazy-created engine tab (engine.52; phase09-digest/finalizeCycleState.js:150); schema header missing',
  'Intake':              'live tab, created on prod S305 for engine.51 processIntake_ front door (docs/SPREADSHEET.md:196); schema header missing',
  'Media_Intake':        'live tab (docs/SPREADSHEET.md:112); schema header missing',
  'Storyline_Intake':    'live tab (docs/SPREADSHEET.md:113); schema header missing',
  'Storyline_Tracker':   'live tab, DISCONTINUED 2026-08-05 but legacy writers still touch it (docs/SPREADSHEET.md:116); schema header missing',
  // --- Auto-created manual-entry tabs (Election_Log precedent: created on write) ---
  'MediaRoom_Paste':     'auto-created manual-entry tab — phase07-evening-media/parseMediaRoomMarkdown.js insertSheet on operator run; menu-wired (utilities/godWorldMenu.js "Parse Media Room Markdown")',
  // --- Pending disposition ---
  'Health_Cause_Intake': 'PENDING CREATE (Mike-ruled 2026-08-16, infrastructure.6 Track B; engine-sheet executes live tab creation) — only input path of operator-fired runProcessHealthCauseIntake (phase11-media-intake/healthCauseIntake.js)',
};

const REF_RE = /(?:getSheetByName|insertSheet)\(\s*['"`]([^'"`]+)['"`]/g;

function collectEngineFiles(root) {
  const dirs = fs.readdirSync(root)
    .filter(d => /^phase/.test(d) && fs.statSync(path.join(root, d)).isDirectory())
    .concat(['utilities', 'lib']);
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.js$/.test(entry)) files.push(p);
    }
  }
  dirs.forEach(d => walk(path.join(root, d)));
  return files;
}

// Extract [{ name, line }] refs from one source string.
function extractRefs(src) {
  const refs = [];
  const lines = src.split('\n');
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    let m;
    REF_RE.lastIndex = 0;
    while ((m = REF_RE.exec(lines[i])) !== null) {
      refs.push({ name: m[1], line: i + 1 });
    }
    offset += lines[i].length + 1;
  }
  return refs;
}

function loadSchemaTabs() {
  const src = fs.readFileSync(SCHEMA_HEADERS, 'utf8');
  const tabs = new Set();
  const re = /^##\s+(.+?)\s*$/gm;
  let m;
  while ((m = re.exec(src)) !== null) tabs.add(m[1]);
  return tabs;
}

// refsByFile: { filePath: [{ name, line }] } → flat offender list
function findUnknownRefs(refsByFile, schemaTabs) {
  const unknown = [];
  for (const [file, refs] of Object.entries(refsByFile)) {
    for (const r of refs) {
      if (!schemaTabs.has(r.name) && !(r.name in ALLOWLIST)) {
        unknown.push(`${file}:${r.line}  getSheetByName/insertSheet('${r.name}')`);
      }
    }
  }
  return unknown;
}

// ── Negative self-test: an injected fake ref must be caught ──
(function selfTest() {
  const synthetic = {
    '<synthetic-engine-file.js>': extractRefs(
      "var s = ss.getSheetByName('Ghost_X');\nss.insertSheet('Ghost_Y');"
    ),
  };
  const unknown = findUnknownRefs(synthetic, new Set(['Simulation_Ledger']));
  assert(
    unknown.some(u => u.includes("'Ghost_X'")) && unknown.some(u => u.includes("'Ghost_Y'")),
    'SELF-TEST FAILED: injected ghost refs were not flagged:\n' + unknown.join('\n')
  );
  console.log('self-test: injected Ghost_X/Ghost_Y refs correctly flagged');
})();

// ── Main check ──
const schemaTabs = loadSchemaTabs();
const files = collectEngineFiles(REPO_ROOT);
const refsByFile = {};
let refCount = 0;
for (const f of files) {
  const refs = extractRefs(fs.readFileSync(f, 'utf8'));
  if (refs.length) refsByFile[path.relative(REPO_ROOT, f)] = refs;
  refCount += refs.length;
}

const offenders = findUnknownRefs(refsByFile, schemaTabs);
if (offenders.length) {
  console.error(
    'FAIL: ' + offenders.length + ' tab reference(s) not in schemas/SCHEMA_HEADERS.md ' +
    'and not allowlisted (scripts/tabReferenceIntegrity.test.js):\n  ' +
    offenders.join('\n  ') +
    '\n\nFix: repoint to a real tab, delete the dead reference, or add a cited ALLOWLIST entry.'
  );
  process.exit(1);
}

console.log(
  'PASS: ' + refCount + ' tab references across ' + Object.keys(refsByFile).length +
  ' engine files — all schema-documented or allowlisted (' +
  Object.keys(ALLOWLIST).length + ' allowlisted, see header comments).'
);
