#!/usr/bin/env node
/**
 * preMortemScan.js — canonical /pre-mortem engine health scan.
 * [engine/sheet] S246 ES-7 / G-PM7 (absorbs engine.28 spirit).
 *
 * Predicts silent failures before a cycle runs. Replaces the per-run inline
 * grep-rewrites (G-PM7): one command, deterministic classification driven by a
 * data file (.claude/skills/pre-mortem/known_gaps.json — function-name-keyed,
 * G-PM5/6), stdout report matching the pre-mortem SKILL §Output + non-zero exit
 * on CRITICAL findings.
 *
 * Scans implemented here (the deterministic, local, recurrent-friction ones):
 *   0  Engine code changes since last cycle (git log, enumerated paths — G-PM2
 *      fix: git pathspec does NOT expand '**' globstar).
 *   1  Math.random determinism — any mention (invocation + reference-pass),
 *      classified CRITICAL / WARNING(acknowledged) / CLEAN(defensive-throw) via
 *      known_gaps.json keyed by enclosing function name.
 *   2  Direct sheet writes outside Phase 10 — WRITE-ONLY patterns
 *      (.setValue(/.setValues(/.appendRow() — G-PM4 fix: getRange().getValues()
 *      reads dropped), diffed against the SHEETS_MANIFEST.md §9 carve-out set.
 *   5  Neighborhood literals — known-stray detection vs canon-12 + Map-17 +
 *      child-mapping, with acknowledged legacy literals from known_gaps.json.
 *
 * Scans 3/4/6 are emitted as MANUAL notes (not auto-scanned): §3 ctx-field
 * dependency is judgment-based (G-PM5 — defer to /ctx-map); §4 header alignment
 * and §6 write-intent targets need sheet/schema reads + write-intent parsing.
 * Run those from the SKILL until scripted.
 *
 * Usage:
 *   node scripts/preMortemScan.js                 # since = SESSION_CONTEXT Last Updated
 *   node scripts/preMortemScan.js --since=2026-05-09
 *
 * Exit codes:
 *   0  SAFE TO RUN (no CRITICAL; warnings allowed)
 *   1  FIX BEFORE RUNNING (≥1 CRITICAL)
 *   2  scan error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PHASE_DIRS = [
  'phase01-config', 'phase02-world-state', 'phase03-population', 'phase04-events',
  'phase05-citizens', 'phase06-analysis', 'phase07-evening-media', 'phase08-v3-chicago',
  'phase09-digest', 'phase10-persistence', 'phase11-media-intake',
];
const SCAN_DIRS = [...PHASE_DIRS, 'utilities']; // Math.random + neighborhood scan scope
const KNOWN_GAPS_PATH = path.join(__dirname, '..', '.claude', 'skills', 'pre-mortem', 'known_gaps.json');
// Scan 2's carve-out source. This pointed at the engine rules boot doc, which
// USED to inline the direct-write exception table; that doc was later trimmed to
// rules-only and now just points at the manifest. The scraper kept reading it and
// kept finding zero filenames, so the exception set was EMPTY and every direct
// writer in phases 1-9 came back as a warning — 41 files of undifferentiated
// noise that trained the reader to scroll past scan 2 entirely. Exactly the
// G-PM1 failure the skill warns about, occurring in the gate itself. 2026-08-31.
const CARVE_OUT_PATH = path.join(__dirname, '..', 'docs', 'engine', 'SHEETS_MANIFEST.md');

// §5 canonical neighborhoods — single source of truth in lib/canonNeighborhoods (S247;
// was inline here + a divergent stale copy in auditSimulationLedger; centralized to kill
// the drift). CANONICAL_HOODS re-exported below for preMortemScan.test.js.
const { CANONICAL_HOODS } = require('../lib/canonNeighborhoods');
// Known stray (non-canon) tokens that have leaked into engine literals (SKILL §5
// WARNINGS list). Deterministic known-stray scan; novel strays still need the
// SKILL's manual literal sweep. NOTE: bare "Coliseum" is deliberately excluded —
// it's the Oakland Coliseum transit station / sports venue (legitimate
// infrastructure token), not a neighborhood-canon violation; only the SKILL's
// "Coliseum District" form is a stray.
// 'East Oakland' left this list S347 — S328 made it canonical (Mike-direct), so the
// canonical-guard below already skipped it; the entry was dead weight.
const KNOWN_STRAY_HOODS = ['Coliseum District', 'Elmhurst', 'Jingletown'];

function loadKnownGaps() {
  try { return JSON.parse(fs.readFileSync(KNOWN_GAPS_PATH, 'utf8')); }
  catch (e) { console.error('[WARN] could not read known_gaps.json: ' + e.message + ' — treating all acknowledged lists as empty'); return {}; }
}

// JS control-flow / keyword names that the bare `name(...) {` pattern would
// otherwise mis-read as a function definition (the if()/for()/while() trap).
const JS_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'else', 'do',
  'return', 'with', 'function', 'try', 'finally', 'case', 'typeof', 'await', 'new']);

// Enclosing-function name for a line index (1-based) in a file's line array.
// Scans backward to the nearest real function definition, skipping control-flow
// keywords that match the bare `name(args) {` shape.
function enclosingFunction(linesArr, lineNo) {
  for (let i = lineNo - 1; i >= 0; i--) {
    const l = linesArr[i] || '';
    let m = l.match(/^\s*(?:async\s+)?function\s+([A-Za-z0-9_]+)/)
      || l.match(/^\s*([A-Za-z0-9_]+)\s*[:=]\s*(?:async\s+)?function/)
      || l.match(/^\s*([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/);
    if (m && !JS_KEYWORDS.has(m[1])) return m[1];
  }
  return null;
}

function listJsFiles(dirs) {
  const out = [];
  for (const d of dirs) {
    const abs = path.join(ROOT, d);
    let entries = [];
    try { entries = fs.readdirSync(abs); } catch (e) { continue; }
    for (const f of entries) if (f.endsWith('.js')) out.push(path.join(d, f));
  }
  return out;
}

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
}

// ── Scan 0 ──
function scanEngineChanges(sinceDate) {
  const pathspec = [...PHASE_DIRS.map(d => `${d}/*.js`), 'scripts/*.js', 'lib/*.js', 'utilities/*.js'];
  let out = '';
  try {
    out = execSync(
      `git log --since="${sinceDate}" --pretty=format:"%h %ad %s" --date=short -- ${pathspec.map(p => `'${p}'`).join(' ')}`,
      { cwd: ROOT, encoding: 'utf8' }
    ).trim();
  } catch (e) { return { commits: [], error: e.message }; }
  const commits = out ? out.split('\n') : [];
  return { commits };
}

// ── Scan 1 ──
function scanMathRandom(gaps) {
  const ack = new Set((gaps.acknowledgedMathRandom || []).map(a => a.file + '#' + a.function));
  const throwFiles = new Set(gaps.defensiveThrowFiles || []);
  const excludeFiles = new Set(gaps.scanExcludeFiles || []);
  const findings = { critical: [], warning: [], clean: [] };
  for (const rel of listJsFiles(SCAN_DIRS)) {
    if (excludeFiles.has(rel)) continue; // meta/detector files (e.g. deprecation linter)
    let lines;
    try { lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n'); } catch (e) { continue; }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/Math\.random/.test(line)) continue;
      if (isCommentLine(line)) continue;
      const lineNo = i + 1;
      if (/\bthrow\b/.test(line) || throwFiles.has(rel)) {
        findings.clean.push(`${rel}:${lineNo} — defensive throw / guard`);
        continue;
      }
      const fn = enclosingFunction(lines, lineNo);
      if (fn && ack.has(rel + '#' + fn)) {
        findings.warning.push(`${rel}:${lineNo} — Math.random in ${fn}() (acknowledged off-path per known_gaps.json)`);
      } else {
        findings.critical.push(`${rel}:${lineNo} — Math.random in ${fn ? fn + '()' : '(top-level)'} — NOT acknowledged; verify cycle-path reach before running`);
      }
    }
  }
  return findings;
}

// ── Scan 2 ──
function engineMdExceptionFiles() {
  const set = new Set();
  let text = '';
  try { text = fs.readFileSync(CARVE_OUT_PATH, 'utf8'); } catch (e) { return set; }
  // Only §9 is the carve-out table; the tab inventory above it names plenty of
  // scripts that are NOT authorized direct writers.
  const start = text.indexOf('## 9. Direct-write carve-outs');
  if (start === -1) return set;   // empty set -> everything flags loudly, never a false all-clear
  text = text.slice(start);
  // Allow / and - so repo-relative paths extract whole; compared by basename
  // because scanSheetWrites keys on basename.
  const re = /[`']([A-Za-z0-9_./-]+\.js)[`']/g;
  let m;
  while ((m = re.exec(text)) !== null) set.add(path.basename(m[1]));
  return set;
}

function scanSheetWrites(exceptionFiles) {
  // write-only patterns (G-PM4): .setValue( / .setValues( / .appendRow(
  const writeRe = /\.setValue\(|\.setValues\(|\.appendRow\(/;
  const offList = new Map(); // file -> [lineNos]
  const phaseNo10 = PHASE_DIRS.filter(d => d !== 'phase10-persistence');
  for (const rel of listJsFiles(phaseNo10)) {
    let lines;
    try { lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n'); } catch (e) { continue; }
    const base = path.basename(rel);
    for (let i = 0; i < lines.length; i++) {
      if (isCommentLine(lines[i])) continue;
      if (writeRe.test(lines[i])) {
        if (!exceptionFiles.has(base)) {
          if (!offList.has(rel)) offList.set(rel, []);
          offList.get(rel).push(i + 1);
        }
      }
    }
  }
  return offList;
}

// ── Scan 5 ──
function scanNeighborhoods(gaps) {
  const ack = new Set((gaps.acknowledgedNeighborhoodLiterals || []).map(a => a.file + '|' + a.literal.toLowerCase()));
  const acknowledged = [];
  const newStray = [];
  // Scope to engine PHASE files (SKILL §5 "engine files"); utilities/ensure*/
  // seed helpers carry legit region labels (transit/crime/faith setup) — out of
  // the cycle-path neighborhood-canon scope, so excluded to avoid noise.
  for (const rel of listJsFiles(PHASE_DIRS)) {
    let lines;
    try { lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n'); } catch (e) { continue; }
    for (let i = 0; i < lines.length; i++) {
      if (isCommentLine(lines[i])) continue;
      for (const stray of KNOWN_STRAY_HOODS) {
        if (CANONICAL_HOODS.has(stray.toLowerCase())) continue; // safety: never flag a canonical
        const re = new RegExp("['\"]" + stray.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"]");
        if (re.test(lines[i])) {
          const entry = `${rel}:${i + 1} — '${stray}' (non-canon-12 / Map-17 / child)`;
          if (ack.has(rel + '|' + stray.toLowerCase())) acknowledged.push(entry);
          else newStray.push(entry);
        }
      }
    }
  }
  return { acknowledged, newStray };
}

// ── Scan 7 (engine.119 Task 5): tab parity ───────────────────────────────────
// The cycle path never creates a tab (utilities/utilityFunctions.js requireTab_):
// a missing one throws, the phase is skipped. So every tab literal the engine
// requires MUST exist on the sheet it will fire against. Static half: every
// `requireTab_(<ss>, '<Tab>')` literal in the engine tree, diffed against the LIVE
// tab list (lib/sheets.listSheets, the .env sheet). Optional bench half: pass
// --bench=<sheetId> to diff the same literals against the bench, and to list
// live↔bench tab divergence — the Hospital_Ledger trap class (bench-only tab,
// unconnected pre-fire on live, C104 2026-08-18).
function requiredTabLiterals() {
  const found = new Map(); // tab → [file:line]
  const rx = /requireTab_\(\s*[A-Za-z_.]+\s*,\s*'([^']+)'\s*\)/g;
  for (const f of listJsFiles(SCAN_DIRS)) {
    if (f.endsWith('.test.js')) continue;
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      let m; rx.lastIndex = 0;
      while ((m = rx.exec(line)) !== null) {
        const rel = path.relative(ROOT, f) + ':' + (i + 1);
        if (!found.has(m[1])) found.set(m[1], []);
        found.get(m[1]).push(rel);
      }
    });
  }
  return found;
}

async function listTabsFor(sheetId) {
  require(path.join(ROOT, 'lib', 'env'));
  const { google } = require('googleapis');
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const api = google.sheets({ version: 'v4', auth });
  const meta = await api.spreadsheets.get({ spreadsheetId: sheetId, fields: 'sheets.properties.title' });
  return new Set(meta.data.sheets.map(s => s.properties.title));
}

async function scanTabParity(benchId) {
  const out = { critical: [], warning: [], literals: 0, liveTabs: 0, benchTabs: 0, checked: false, error: null };
  const required = requiredTabLiterals();
  out.literals = required.size;
  let live;
  try {
    require(path.join(ROOT, 'lib', 'env'));
    live = await listTabsFor(process.env.GODWORLD_SHEET_ID);
  } catch (e) { out.error = 'live tab list unavailable: ' + e.message; return out; }
  out.checked = true; out.liveTabs = live.size;
  for (const [tab, sites] of required.entries()) {
    if (!live.has(tab)) out.critical.push(`tab "${tab}" required by ${sites.join(', ')} is MISSING on LIVE — the phase will throw at the next fire; pre-create it (engine.119)`);
  }
  if (benchId) {
    try {
      const bench = await listTabsFor(benchId);
      out.benchTabs = bench.size;
      for (const [tab, sites] of required.entries()) {
        if (!bench.has(tab)) out.warning.push(`tab "${tab}" required by ${sites[0]} is missing on the BENCH (${benchId.slice(0, 8)}…) — a bench fire will throw there`);
      }
      const benchOnly = [...bench].filter(t => !live.has(t));
      const liveOnly = [...live].filter(t => !bench.has(t));
      if (benchOnly.length) out.warning.push('bench-only tabs (unconnected on live — Hospital_Ledger trap class): ' + benchOnly.join(', '));
      if (liveOnly.length) out.warning.push('live-only tabs (bench is behind the sync): ' + liveOnly.join(', '));
    } catch (e) { out.warning.push('bench tab list unavailable: ' + e.message); }
  }
  return out;
}

function deriveSinceDate() {
  const arg = process.argv.find(a => a.startsWith('--since='));
  if (arg) return arg.split('=')[1];
  try {
    const text = fs.readFileSync(path.join(ROOT, 'SESSION_CONTEXT.md'), 'utf8');
    const m = text.match(/Last Updated:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    if (m) return m[1];
  } catch (e) { /* fall through */ }
  return null;
}

async function main() {
  const gaps = loadKnownGaps();
  const benchArg = process.argv.find(a => a.startsWith('--bench='));
  const benchId = benchArg ? benchArg.slice('--bench='.length) : null;
  const sinceDate = deriveSinceDate();
  const out = [];
  const today = (() => { try { return execSync('date +%Y-%m-%d', { encoding: 'utf8' }).trim(); } catch (e) { return ''; } })();

  out.push(`PRE-MORTEM SCAN — ${today}`);
  out.push('='.repeat(56));
  out.push('');

  // Scan 0
  out.push('ENGINE CHANGES SINCE LAST CYCLE' + (sinceDate ? ` (since ${sinceDate})` : ' (date unresolved — pass --since=<YYYY-MM-DD>)') + ':');
  if (!sinceDate) {
    out.push('  [unresolved] could not derive since-date; re-run with --since=<date>');
  } else {
    const ch = scanEngineChanges(sinceDate);
    if (ch.error) out.push('  [git error] ' + ch.error);
    else if (ch.commits.length === 0) out.push('  none — no engine-path touches since last cycle');
    else { out.push(`  ${ch.commits.length} engine-path commit(s):`); for (const c of ch.commits) out.push('    ' + c); }
  }
  out.push('');

  // Scan 1
  const mr = scanMathRandom(gaps);
  // Scan 2
  const sw = scanSheetWrites(engineMdExceptionFiles());
  // Scan 5
  const nh = scanNeighborhoods(gaps);
  // Scan 7 (engine.119): required-tab parity
  const tp = await scanTabParity(benchId);

  const critical = [...mr.critical, ...tp.critical];

  out.push('CRITICAL (will cause silent failures in the cycle):');
  if (critical.length === 0) out.push('  none');
  else critical.forEach((c, i) => out.push(`  ${i + 1}. ${c}`));
  out.push('');

  out.push('WARNINGS (acknowledged off-path or doc drift):');
  const warnings = [];
  mr.warning.forEach(w => warnings.push(w));
  for (const [file, lns] of sw.entries()) warnings.push(`${file}:${lns.join(',')} — direct write NOT in SHEETS_MANIFEST.md §9 (verify: new undocumented writer OR manifest doc drift)`);
  nh.acknowledged.forEach(w => warnings.push(w + ' (acknowledged)'));
  nh.newStray.forEach(w => warnings.push(w + ' (NEW stray — not in known_gaps.json; investigate)'));
  tp.warning.forEach(w => warnings.push(w));
  if (tp.error) warnings.push('tab parity NOT checked — ' + tp.error);
  if (warnings.length === 0) out.push('  none');
  else warnings.forEach((w, i) => out.push(`  ${i + 1}. ${w}`));
  out.push('');

  out.push('CLEAN:');
  out.push(`  - Math.random cycle-path: ${mr.critical.length} unacknowledged hit(s); ${mr.warning.length} acknowledged off-path; ${mr.clean.length} defensive-throw`);
  out.push(`  - Sheet writes outside Phase 10: ${sw.size} file(s) with direct writes not carved out in SHEETS_MANIFEST.md §9`);
  out.push(`  - Neighborhoods: ${nh.newStray.length} new stray, ${nh.acknowledged.length} acknowledged legacy`);
  out.push(`  - Required tabs (engine.119): ${tp.literals} literal(s) vs live ${tp.liveTabs} tab(s)` + (tp.checked ? `, ${tp.critical.length} missing on live` : ' — NOT CHECKED') + (benchId ? `; bench ${tp.benchTabs} tab(s)` : '; pass --bench=<sheetId> to diff the bench too'));
  out.push('');

  out.push('NOT AUTO-SCANNED (run from SKILL — see notes):');
  out.push('  - §3 ctx field dependency: judgment-based (G-PM5) — run /ctx-map, diff vs last cycle.');
  out.push('  - §4 sheet header alignment: needs sheet+SCHEMA_HEADERS read — run manually if columns changed.');
  out.push('  - §6 write-intent target validation: scan 7 covers the requireTab_ literals; intent-queued tab names still need the manual check.');
  out.push('');

  out.push('='.repeat(56));
  out.push('RECOMMENDATION: ' + (critical.length > 0 ? 'FIX BEFORE RUNNING' : 'SAFE TO RUN' + (warnings.length ? ' (warnings inherited below)' : '')));
  if (critical.length === 0 && warnings.length > 0) {
    out.push('');
    out.push('Open warnings carried to next cycle:');
    warnings.forEach(w => out.push('  - ' + w));
  }

  console.log(out.join('\n'));
  process.exit(critical.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(e => { console.error('[FATAL]', e.message); process.exit(2); });
}

module.exports = { enclosingFunction, scanMathRandom, scanNeighborhoods, engineMdExceptionFiles, requiredTabLiterals, scanTabParity, CANONICAL_HOODS };
