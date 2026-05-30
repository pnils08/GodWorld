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
 *      reads dropped), diffed against the engine.md exception filename set.
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
const ENGINE_RULES_PATH = path.join(__dirname, '..', '.claude', 'rules', 'engine.md');

// §5 canonical neighborhoods (pre-mortem SKILL §5).
const CANON_12 = ['Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt', 'West Oakland', 'Laurel',
  'Rockridge', 'Jack London', 'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave'];
const MAP_17 = ['Adams Point', 'Brooklyn', 'Chinatown', 'Dimond', 'Downtown', 'Eastlake', 'Fruitvale',
  'Glenview', 'Grand Lake', 'Ivy Hill', 'Jack London', 'Laurel', 'Piedmont Ave', 'Rockridge',
  'San Antonio', 'Temescal', 'West Oakland'];
const CHILDREN = ['Adams Point', 'Grand Lake', 'Lakeshore', 'Eastlake', 'Ivy Hill', 'San Antonio',
  'Dimond', 'Glenview', 'Maxwell Park', 'Old Oakland', 'City Center', 'Jack London Square',
  'Koreatown-Northgate', 'Koreatown', 'Northgate', 'Montclair', 'Claremont', 'Longfellow',
  'Shafter', 'Brooklyn'];
const CANONICAL_HOODS = new Set([...CANON_12, ...MAP_17, ...CHILDREN].map(s => s.toLowerCase()));
// Known stray (non-canon) tokens that have leaked into engine literals (SKILL §5
// WARNINGS list). Deterministic known-stray scan; novel strays still need the
// SKILL's manual literal sweep. NOTE: bare "Coliseum" is deliberately excluded —
// it's the Oakland Coliseum transit station / sports venue (legitimate
// infrastructure token), not a neighborhood-canon violation; only the SKILL's
// "Coliseum District" form is a stray.
const KNOWN_STRAY_HOODS = ['East Oakland', 'Coliseum District', 'Elmhurst', 'Jingletown'];

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
  try { text = fs.readFileSync(ENGINE_RULES_PATH, 'utf8'); } catch (e) { return set; }
  // allow dots in the name so version'd filenames (updateStorylineStatusv1.2.js)
  // extract whole, not as the trailing "2.js" fragment.
  const re = /[`']([A-Za-z0-9_.]+\.js)[`']/g;
  let m;
  while ((m = re.exec(text)) !== null) set.add(m[1]);
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

function main() {
  const gaps = loadKnownGaps();
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

  const critical = [...mr.critical];

  out.push('CRITICAL (will cause silent failures in the cycle):');
  if (critical.length === 0) out.push('  none');
  else critical.forEach((c, i) => out.push(`  ${i + 1}. ${c}`));
  out.push('');

  out.push('WARNINGS (acknowledged off-path or doc drift):');
  const warnings = [];
  mr.warning.forEach(w => warnings.push(w));
  for (const [file, lns] of sw.entries()) warnings.push(`${file}:${lns.join(',')} — write pattern off the engine.md exception list (verify: new undocumented writer OR engine.md doc drift)`);
  nh.acknowledged.forEach(w => warnings.push(w + ' (acknowledged)'));
  nh.newStray.forEach(w => warnings.push(w + ' (NEW stray — not in known_gaps.json; investigate)'));
  if (warnings.length === 0) out.push('  none');
  else warnings.forEach((w, i) => out.push(`  ${i + 1}. ${w}`));
  out.push('');

  out.push('CLEAN:');
  out.push(`  - Math.random cycle-path: ${mr.critical.length} unacknowledged hit(s); ${mr.warning.length} acknowledged off-path; ${mr.clean.length} defensive-throw`);
  out.push(`  - Sheet writes outside Phase 10: ${sw.size} file(s) off the engine.md exception list`);
  out.push(`  - Neighborhoods: ${nh.newStray.length} new stray, ${nh.acknowledged.length} acknowledged legacy`);
  out.push('');

  out.push('NOT AUTO-SCANNED (run from SKILL — see notes):');
  out.push('  - §3 ctx field dependency: judgment-based (G-PM5) — run /ctx-map, diff vs last cycle.');
  out.push('  - §4 sheet header alignment: needs sheet+SCHEMA_HEADERS read — run manually if columns changed.');
  out.push('  - §6 write-intent target validation: needs Phase 10 target-sheet existence check — run manually.');
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
  try { main(); } catch (e) { console.error('[FATAL]', e.message); process.exit(2); }
}

module.exports = { enclosingFunction, scanMathRandom, scanNeighborhoods, engineMdExceptionFiles, CANONICAL_HOODS };
