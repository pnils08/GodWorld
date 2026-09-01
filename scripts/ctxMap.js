#!/usr/bin/env node
/**
 * ctxMap.js — Live ctx.summary field dependency scanner
 *
 * Scans all phase*\/*.js files for ctx.summary field reads and writes.
 * Handles the S = ctx.summary alias pattern correctly.
 *
 * Usage:
 *   node scripts/ctxMap.js              # Full map
 *   node scripts/ctxMap.js careerSignals # Single field detail
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const fieldArg = process.argv[2] || null;

// Find all phase JS files
const phaseFiles = execSync(
  'find phase*/ utilities/ -name "*.js" -type f 2>/dev/null',
  { cwd: ROOT, encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

// Track writes and reads per field per file
const writes = {};   // field -> [{file, line, code}]
const reads = {};    // field -> [{file, line, code}]

// camelCase check — filters out CONSTANTS like ALLIANCE, BACHELOR
function isCamelCase(name) {
  return /^[a-z][a-zA-Z0-9_]*$/.test(name) && name.length >= 2;
}

for (const relFile of phaseFiles) {
  const absPath = path.join(ROOT, relFile);
  let lines;
  try { lines = fs.readFileSync(absPath, 'utf8').split('\n'); }
  catch { continue; }

  // Detect if this file aliases S = ctx.summary
  let hasAlias = false;
  for (const l of lines) {
    if (/var\s+S\s*=\s*ctx\.summary/.test(l)) { hasAlias = true; break; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    // Skip Logger lines
    if (trimmed.includes('Logger.log')) continue;
    // Skip JSDoc @param lines
    if (trimmed.startsWith('@')) continue;

    const lineNum = i + 1;

    // --- Direct ctx.summary access (always valid) ---
    // Writes: ctx.summary.field =
    const ctxWriteMatches = [...line.matchAll(/ctx\.summary\.([a-zA-Z_]\w*)\s*=/g)];
    for (const m of ctxWriteMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (!writes[field]) writes[field] = [];
      writes[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
    }

    // Reads: capture ALL ctx.summary.field, then subtract writes
    const ctxWriteFields = new Set(ctxWriteMatches.map(m => m[1]));
    const allCtxMatches = [...line.matchAll(/ctx\.summary\.([a-zA-Z_]\w*)/g)];
    for (const m of allCtxMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (ctxWriteFields.has(field)) continue;
      const afterMatch = line.substring(m.index + m[0].length);
      if (/^\s*=[^=]/.test(afterMatch) || /^\s*\+=/.test(afterMatch)) continue;
      if (!reads[field]) reads[field] = [];
      if (!reads[field].some(r => r.file === relFile && r.line === lineNum)) {
        reads[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
      }
    }

    // --- S alias access (only in files that have `var S = ctx.summary`) ---
    if (!hasAlias) continue;

    // Writes: S.field = (but NOT S.field.push, S.field.length, etc. followed by property access then =)
    // Match S.field = but not S.field.subprop =
    const sWriteMatches = [...line.matchAll(/(?<![a-zA-Z_.])S\.([a-zA-Z_]\w*)\s*=[^=]/g)];
    for (const m of sWriteMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (!writes[field]) writes[field] = [];
      // Dedupe same file+field
      if (!writes[field].some(w => w.file === relFile && w.line === lineNum)) {
        writes[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
      }
    }

    // Also catch S.field.push( and S.field +=
    const sPushMatches = [...line.matchAll(/(?<![a-zA-Z_.])S\.([a-zA-Z_]\w*)\.push\(/g)];
    for (const m of sPushMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (!writes[field]) writes[field] = [];
      if (!writes[field].some(w => w.file === relFile && w.line === lineNum)) {
        writes[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
      }
    }

    const sPlusMatches = [...line.matchAll(/(?<![a-zA-Z_.])S\.([a-zA-Z_]\w*)\s*\+=/g)];
    for (const m of sPlusMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (!writes[field]) writes[field] = [];
      if (!writes[field].some(w => w.file === relFile && w.line === lineNum)) {
        writes[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
      }
    }

    // Reads: capture ALL S.field occurrences, then subtract writes
    const writeFieldsOnLine = new Set([
      ...sWriteMatches.map(m => m[1]),
      ...sPushMatches.map(m => m[1]),
      ...sPlusMatches.map(m => m[1]),
    ]);
    const allSMatches = [...line.matchAll(/(?<![a-zA-Z_.])S\.([a-zA-Z_]\w*)/g)];
    for (const m of allSMatches) {
      const field = m[1];
      if (!isCamelCase(field)) continue;
      if (writeFieldsOnLine.has(field)) continue;
      // Check it's not the LHS of an assignment (S.field = ...)
      const afterMatch = line.substring(m.index + m[0].length);
      if (/^\s*=[^=]/.test(afterMatch) || /^\s*\+=/.test(afterMatch)) continue;
      if (!reads[field]) reads[field] = [];
      if (!reads[field].some(r => r.file === relFile && r.line === lineNum)) {
        reads[field].push({ file: relFile, line: lineNum, code: trimmed.substring(0, 100) });
      }
    }
  }
}

// Classify fields
const allFields = [...new Set([...Object.keys(writes), ...Object.keys(reads)])].sort();

const connected = [];
const orphaned = [];
const phantom = [];

for (const field of allFields) {
  const w = writes[field] || [];
  const r = reads[field] || [];

  const writerFiles = new Set(w.map(x => x.file));
  const readerFiles = new Set(r.map(x => x.file));
  // External readers = files that read but don't write
  const externalReaders = [...readerFiles].filter(f => !writerFiles.has(f));

  if (w.length > 0 && externalReaders.length > 0) {
    connected.push({ field, writers: w, readers: r, externalReaders });
  } else if (w.length > 0 && externalReaders.length === 0) {
    orphaned.push({ field, writers: w });
  } else if (w.length === 0 && r.length > 0) {
    phantom.push({ field, readers: r });
  }
}

// --- Output ---

function shortFile(f) {
  return f.split('/').pop().replace('.js', '');
}

function phase(f) {
  const m = f.match(/phase(\d+)/);
  return m ? `P${m[1]}` : 'U';
}

if (fieldArg) {
  // Single field detail
  const w = writes[fieldArg] || [];
  const r = reads[fieldArg] || [];
  console.log(`FIELD: ${fieldArg}`);
  console.log();
  if (w.length === 0) {
    console.log('  Written by: NONE (phantom read)');
  } else {
    console.log('  Written by:');
    for (const e of w) {
      console.log(`    ${e.file}:${e.line}`);
      console.log(`      ${e.code}`);
    }
  }
  console.log();
  const extReaders = r.filter(x => !w.some(ww => ww.file === x.file));
  if (extReaders.length === 0) {
    console.log('  Read by: NONE (orphaned write)');
  } else {
    console.log(`  Read by (${extReaders.length} external references):`);
    const seen = new Set();
    for (const e of extReaders) {
      const key = `${e.file}:${e.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`    ${e.file}:${e.line}`);
      console.log(`      ${e.code}`);
    }
  }
  console.log();
  const status = w.length > 0 && extReaders.length > 0 ? 'CONNECTED' :
                 w.length > 0 ? 'ORPHANED WRITE' : 'PHANTOM READ';
  console.log(`  Status: ${status}`);
  process.exit(0);
}

// Full map
console.log(`CTX.SUMMARY DEPENDENCY MAP — ${new Date().toISOString().split('T')[0]}`);
console.log('='.repeat(90));
console.log();

console.log(`CONNECTED (${connected.length} fields):`);
console.log(`${'FIELD'.padEnd(32)} ${'WRITER'.padEnd(35)} ${'READERS'.padEnd(15)} STATUS`);
console.log('-'.repeat(90));
for (const { field, writers: w, externalReaders } of connected) {
  const writerShort = `${shortFile(w[0].file)} (${phase(w[0].file)})`;
  const readerCount = externalReaders.length;
  const readerStr = readerCount <= 2
    ? externalReaders.map(shortFile).join(', ')
    : `[${readerCount} files]`;
  console.log(`${field.padEnd(32)} ${writerShort.padEnd(35)} ${readerStr.padEnd(15)} CONNECTED`);
}

console.log();
console.log(`ORPHANED WRITES (${orphaned.length} fields — written, no external reader):`);
console.log('-'.repeat(90));
for (const { field, writers: w } of orphaned) {
  console.log(`  ${field.padEnd(32)} ${shortFile(w[0].file)} (${phase(w[0].file)})`);
}

if (phantom.length > 0) {
  console.log();
  console.log(`PHANTOM READS (${phantom.length} fields — read but never written):`);
  console.log('-'.repeat(90));
  for (const { field, readers: r } of phantom) {
    console.log(`  ${field.padEnd(32)} ${shortFile(r[0].file)} (${phase(r[0].file)})`);
  }
}

// ── ORDERING (pre-mortem §3) ──────────────────────────────────────────────
// The map above answers "is this field connected at all". It does NOT answer
// the question the pre-mortem skill calls its most important check: is a field
// READ in a phase that runs BEFORE the phase that writes it. That was left as
// judgment-based (G-PM5) and so, in practice, was rarely done.
// EXECUTION ORDER comes from the ORCHESTRATOR, and resolves per FUNCTION.
//
// engine.137 (S405) — two defects fixed here, both of which produced false findings:
//
//   1. This pass used to key ordering off the phase<NN> DIRECTORY number. The
//      directory is where a file was filed, not when it runs. finalizeWorldPopulation.js
//      sits in phase03-population/ but runWorldCycle() calls it at the Phase9 slot;
//      eventArcEngine.js sits in phase04-events/ and is not called at all (retired
//      S313, engine.72 G-EC55). That heuristic invented G-PF16.
//
//   2. Resolving a slot to a FILE smears a file across every slot that reaches it.
//      applyCivicLoadIndicator.js defines BOTH applyCivicLoadIndicator_ (Phase6-CivicLoad)
//      and resetCycleAuditIssues_ (Phase1-ResetAudit), so file granularity gave it the
//      range Phase1..Phase6 and silently swallowed a real civicLoad finding. Ordinals
//      therefore attach to the enclosing top-level FUNCTION of each read/write line.
//
// runWorldCycle() is the PRODUCTION entry — reached from utilities/webTrigger.js:41
// and the sheet menu. runCyclePhases_ is dry-run/replay only and diverges from it
// (it omits Phase7-StorylineWeaving and Phase9-DigestSummary), so it is not the
// ordering source.
//
// Reported only when the read ALWAYS precedes the write — readMax < writeMin.
// Overlapping ranges go to AMBIGUOUS; unreachable readers go to DEAD. False negatives
// are safer than the wall of false positives that taught the operator to disbelieve
// this scan (G-PM1, and G-PF15 before it).
const ORCHESTRATOR = 'phase01-config/godWorldEngine2.js';
const orchLines = fs.readFileSync(path.join(ROOT, ORCHESTRATOR), 'utf8').split('\n');

// --- 1. the production phase sequence, in order -----------------------------
let inRun = false;
const slots = [];
for (let li = 0; li < orchLines.length; li++) {
  const line = orchLines[li];
  if (/^function runWorldCycle\s*\(/.test(line)) { inRun = true; continue; }
  if (inRun && /^function /.test(line)) break;
  if (!inRun) continue;
  if (line.trim().startsWith('//')) continue;          // commented-out slot = not wired
  const m = line.match(/safePhaseCall_\(\s*ctx\s*,\s*'([^']+)'\s*,\s*function\s*\(\)\s*\{\s*([A-Za-z0-9_]+_)\s*\(/);
  if (m) { slots.push({ label: m[1], fns: [m[2]] }); continue; }
  // Multi-line closure: `safePhaseCall_(ctx, 'Label', function() {` with the callee on a
  // later line, usually behind a `typeof fn_ === 'function'` guard (Phase6-InitiativeRipple,
  // Phase6-TransitSignals, Phase6-FaithSignals, Phase6.5-Validation). The one-line regex
  // dropped these four slots and everything reachable only through them read as DEAD —
  // prePublicationValidation.js was reported dead while live at both entry points (S408).
  const open = line.match(/safePhaseCall_\(\s*ctx\s*,\s*'([^']+)'\s*,\s*function\s*\(\)\s*\{\s*$/);
  if (!open) {
    // Direct call in the cycle body, outside any phase closure: the Phase-0 setup
    // (openSimSpreadsheet_, ensureEngine94SheetContract_, initSimulationLedger_ ...)
    // and the close (verifyCycleCountPersisted_, emitPhaseTimings_). These were never
    // seeded, so engine94SheetContract.js and initSimulationLedger.js read as DEAD
    // while running first thing every cycle (S408). Each becomes an ordered slot.
    let d; const directRe = /\b([A-Za-z0-9_]+_)\s*\(/g;
    while ((d = directRe.exec(line)) !== null) if (d[1] !== 'safePhaseCall_') slots.push({ label: 'Direct-' + d[1], fns: [d[1]] });
    continue;
  }
  const fns = [];
  for (let lj = li + 1; lj < orchLines.length; lj++) {
    const body = orchLines[lj];
    if (/^\s*\}\);\s*$/.test(body)) { li = lj; break; }
    if (body.trim().startsWith('//')) continue;
    let c; const callRe = /\b([A-Za-z0-9_]+_)\s*\(/g;
    while ((c = callRe.exec(body)) !== null) if (c[1] !== 'safePhaseCall_' && !fns.includes(c[1])) fns.push(c[1]);
  }
  if (fns.length) slots.push({ label: open[1], fns });
}
if (!slots.length) {
  console.error('ctxMap: could not parse the runWorldCycle phase sequence — ordering pass ABORTED (not an all-clear).');
  process.exit(3);
}

// --- 2. top-level function spans, per file ----------------------------------
// key = "file::fn". A column-0 `function` opens a span; the next one closes it.
const spans = {};            // key -> {file, fn, start, end}
const defsByName = Object.create(null);   // fnName -> [key] (null-proto: call names like `constructor` must not hit Object.prototype)
const spanCalls = {};        // key -> Set(fnName called)
for (const relFile of phaseFiles) {
  let src;
  try { src = fs.readFileSync(path.join(ROOT, relFile), 'utf8'); } catch { continue; }
  const ls = src.split('\n');
  const open = [];
  for (let i = 0; i < ls.length; i++) {
    const d = ls[i].match(/^function\s+([A-Za-z0-9_]+)\s*\(/);
    if (d) open.push({ fn: d[1], start: i + 1 });
  }
  for (let j = 0; j < open.length; j++) {
    const key = relFile + '::' + open[j].fn;
    spans[key] = {
      file: relFile, fn: open[j].fn,
      start: open[j].start,
      end: j + 1 < open.length ? open[j + 1].start - 1 : ls.length,
    };
    (defsByName[open[j].fn] = defsByName[open[j].fn] || []).push(key);
    spanCalls[key] = new Set();
  }
  // attribute each call to its enclosing span
  const keys = open.map(o => relFile + '::' + o.fn);
  for (let i = 0; i < ls.length; i++) {
    const t = ls[i].trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
    const key = keys.find(k => i + 1 >= spans[k].start && i + 1 <= spans[k].end);
    if (!key) continue;
    let m;
    // every identifier-call, not just the `foo_(` convention — plenty of helpers
    // (deriveDomain, pickOne, idx) carry no trailing underscore, and missing those
    // edges strands their callers as unreachable.
    const re = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    while ((m = re.exec(ls[i])) !== null) spanCalls[key].add(m[1]);
    // `typeof fn_ === 'function'` is how the engine guards a call it is about to make,
    // and how v3Integration_'s V3_FUNCTIONS registry names the modules it dispatches by
    // string (domainTracker_, storyHookEngine_, chicagoSatelliteEngine_). Without this
    // edge those three read as DEAD while running at Phase8-V3Integration (S408).
    const tre = /typeof\s+([A-Za-z_][A-Za-z0-9_]*)\s*===\s*['"]function['"]/g;
    while ((m = tre.exec(ls[i])) !== null) spanCalls[key].add(m[1]);
  }
}
// resolve a called name from a calling span: prefer a definition in the same file
function resolveCall(fromKey, name) {
  const cands = defsByName[name];
  if (!Array.isArray(cands) || !cands.length) return [];
  const sameFile = cands.filter(k => spans[k].file === spans[fromKey].file);
  return sameFile.length ? sameFile : cands;
}

// --- 3. BFS the function call graph from each slot --------------------------
const fnOrd = {};            // spanKey -> {min, max}
function noteOrd(key, ord) {
  const cur = fnOrd[key];
  if (!cur) fnOrd[key] = { min: ord, max: ord };
  else { if (ord < cur.min) cur.min = ord; if (ord > cur.max) cur.max = ord; }
}
slots.forEach((slot, ord) => {
  const seen = new Set();
  const queue = slot.fns.flatMap(fn => defsByName[fn] || []);
  while (queue.length) {
    const key = queue.shift();
    if (seen.has(key) || !spans[key]) continue;
    seen.add(key);
    if (spans[key].fn === 'runWorldCycle') continue;   // the caller, never a callee
    noteOrd(key, ord);
    for (const callee of (spanCalls[key] || [])) {
      for (const ck of resolveCall(key, callee)) if (!seen.has(ck)) queue.push(ck);
    }
  }
});
// runWorldCycle_ is setup: it populates ctx.summary before the first slot fires.
for (const k of Object.keys(spans)) if (spans[k].fn === 'runWorldCycle') noteOrd(k, -1);

// map a file:line site to its enclosing span's ordinal range
const spanKeysByFile = {};
for (const k of Object.keys(spans)) (spanKeysByFile[spans[k].file] = spanKeysByFile[spans[k].file] || []).push(k);
function siteOrd(site) {
  const keys = spanKeysByFile[site.file] || [];
  const k = keys.find(x => site.line >= spans[x].start && site.line <= spans[x].end);
  return k ? fnOrd[k] : undefined;
}

function slotLabel(ord) { return ord < 0 ? 'Phase0-Setup' : (slots[ord] ? slots[ord].label : '?'); }
// A read is DEFAULTED only if THIS field carries a fallback — `S.foo || x`,
// `S.foo ? a : b`, `typeof S.foo`. The old test looked for `||`/`?`/`&&` anywhere on
// the line, so `if (S.cycleWeight === 'high-signal' && bond.type === RIVALRY)` read as
// defaulted purely because of the `&&`. That hid the engine.137 headline.
function isDefaulted(field, code) {
  const c = code || '';
  const f = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const acc = '(?:ctx\\.summary|S)\\.' + f + '\\b';
  if (new RegExp(acc + '\\s*\\|\\|').test(c)) return true;       // S.foo || 'stable'
  if (new RegExp(acc + '\\s*\\?').test(c)) return true;            // S.foo ? a : b
  if (new RegExp('typeof\\s+' + acc).test(c)) return true;        // typeof S.foo
  if (new RegExp(acc + '\\s*&&').test(c)) return true;             // if (S.foo && ...)
  return false;
}

const isTest = f => /\.test\.js$/.test(f);
const ordering = [], ambiguous = [], deadReads = [];
for (const field of Object.keys(writes)) {
  const wOrds = writes[field]
    .filter(w => !isTest(w.file))
    .map(w => siteOrd(w)).filter(Boolean);
  if (!wOrds.length) continue;
  const writeMin = Math.min(...wOrds.map(o => o.min));
  const writerSites = new Set(writes[field].map(w => w.file + ':' + w.line));

  const early = [], amb = [], dead = [];
  for (const r of (reads[field] || [])) {
    if (isTest(r.file) || writerSites.has(r.file + ':' + r.line)) continue;
    const o = siteOrd(r);
    if (!o) { dead.push(r); continue; }
    // runWorldCycle's own body reads ctx.summary at cycle CLOSE, after every slot —
    // its setup ordinal (-1) describes its writes, not its reads.
    if (o.min === -1) continue;
    if (o.max < writeMin) early.push({ ...r, ord: o });
    else if (o.min < writeMin) amb.push({ ...r, ord: o });
  }
  const writerLabel = [...new Set(writes[field].filter(w => !isTest(w.file)).map(w => shortFile(w.file)))];
  if (early.length) ordering.push({ field, writeMin, writerLabel, early });
  if (amb.length) ambiguous.push({ field, writeMin, amb });
  if (dead.length) deadReads.push({ field, dead });
}

const undefaulted = ordering.filter(o => o.early.some(r => !isDefaulted(o.field, r.code)));

console.log();
console.log(`ORDERING — READ BEFORE WRITE (${ordering.length} field(s); ${undefaulted.length} with an UNDEFAULTED read):`);
console.log(`  execution order: ${slots.length} orchestrated slots from runWorldCycle() (production entry), resolved per function`);
console.log('  caveat: guards are detected per-line; a guard on the following line reads as');
console.log('          "no fallback" here. Confirm each site by eye before acting on it.');
console.log('-'.repeat(90));
if (!ordering.length) {
  console.log('  none — every field is written no later than the earliest slot that reads it.');
} else {
  for (const o of ordering.sort((a, b) => a.field.localeCompare(b.field))) {
    const bad = o.early.filter(r => !isDefaulted(o.field, r.code));
    console.log(`  ${o.field} — written at ${slotLabel(o.writeMin)} (${o.writerLabel.join(', ')})` +
      (bad.length ? '   ** ' + bad.length + ' UNDEFAULTED **' : '   [all defaulted]'));
    for (const r of o.early) {
      console.log(`      read ${slotLabel(r.ord.max)} ${r.file}:${r.line}${isDefaulted(o.field, r.code) ? '' : '   <-- no fallback'}`);
    }
  }
}

if (ambiguous.length) {
  console.log();
  console.log(`AMBIGUOUS — reader runs at several slots, straddling the writer (${ambiguous.length} field(s)):`);
  console.log('-'.repeat(90));
  for (const a of ambiguous.sort((x, y) => x.field.localeCompare(y.field))) {
    const bad = a.amb.filter(r => !isDefaulted(a.field, r.code));
    console.log(`  ${a.field} — written at ${slotLabel(a.writeMin)}` + (bad.length ? `   ** ${bad.length} undefaulted **` : ''));
    for (const r of a.amb.slice(0, 6)) {
      console.log(`      read ${slotLabel(r.ord.min)}..${slotLabel(r.ord.max)} ${r.file}:${r.line}${isDefaulted(a.field, r.code) ? '' : '   <-- no fallback'}`);
    }
    if (a.amb.length > 6) console.log(`      ... +${a.amb.length - 6} more`);
  }
}

// A file counts as DEAD only if EVERY top-level function in it is unreachable from
// runWorldCycle(). A partially-unreachable file is not reported: a static call graph
// cannot see non-literal dispatch, and one over-reporting bucket is what taught the
// operator to disbelieve this scan (G-PM1 / G-PF15).
const deadFiles = [];
for (const [file, keys] of Object.entries(spanKeysByFile)) {
  if (isTest(file) || file === ORCHESTRATOR) continue;
  if (keys.length && keys.every(k => !fnOrd[k])) deadFiles.push(file);
}
if (deadFiles.length) {
  const deadFieldCount = deadReads.filter(d => d.dead.some(r => deadFiles.includes(r.file))).length;
  console.log();
  console.log(`DEAD FILES — every top-level function unreachable from runWorldCycle() (${deadFiles.length} file(s), ${deadFieldCount} field(s) read there):`);
  console.log('-'.repeat(90));
  for (const f of deadFiles.sort()) {
    const n = deadReads.reduce((a, d) => a + d.dead.filter(r => r.file === f).length, 0);
    console.log(`  ${f}${n ? `   (${n} ctx.summary read(s) that therefore never execute)` : ''}`);
  }
  console.log('  note: partially-unreachable helpers inside LIVE files are not listed — a static');
  console.log('        call graph cannot see non-literal dispatch, so that bucket would over-report.');
}
console.log();
console.log('='.repeat(90));
console.log(`Connected: ${connected.length} | Orphaned: ${orphaned.length} | Phantom: ${phantom.length}`);
console.log(`Read-before-write: ${ordering.length} field(s), ${undefaulted.length} undefaulted`);
console.log(`Files scanned: ${phaseFiles.length}`);
