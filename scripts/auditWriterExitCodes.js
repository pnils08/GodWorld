#!/usr/bin/env node
/**
 * auditWriterExitCodes.js — standing lint for the writer-fixed/artifact-persists
 * class (governance.49; spec: docs/plans/2026-08-16-writer-fixed-artifact-persists-audit.md
 * §Findings, Task 3).
 *
 * The class, mechanically: a script makes delete-or-replace calls against an
 * external store AND keeps an aggregate failure counter whose failure side
 * never reaches the process exit code. Every caller then sees "success" while
 * stale or duplicate artifacts survive (engine.110: 14 failed deletes, exit 0,
 * months of stacked card versions).
 *
 * This lint flags any scripts/*.js file where ALL of these hold:
 *   1. a delete/replace-against-external-store signal exists
 *      (wipe/dedup/delete/upsert/PATCH/POST-to-supermemory shapes);
 *   2. a failure counter is incremented in a loop (`failed++`, `errors++`, ...);
 *   3. no exit statement in the file is conditioned on that counter
 *      (`if (errors > 0) ... process.exit(1)` shape);
 * plus a secondary warning when a delete failure branch discards the HTTP
 * status (a failure nobody can diagnose — 404 is benign, 429/5xx is not).
 *
 * Ratchet: KNOWN_OPEN below carries the confirmed instances from the S376 audit
 * with their owning rollout rows. The gate fails only on offenders NOT in the
 * ratchet (new instances) or on ratchet entries that no longer match (a fix
 * landed — remove the entry). As engine.111/112 fixes ship, delete entries.
 *
 * Usage:
 *   node scripts/auditWriterExitCodes.js           report (exit 0)
 *   node scripts/auditWriterExitCodes.js --gate    exit 1 on new offenders / stale ratchet
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

// Confirmed instances from the S376 audit (plan §Findings), keyed to rollout rows.
// Half A = write errors ungated; Half B = delete failures ungated.
// Remove an entry when its fix lands (the lint will tell you: "ratchet entry stale").
// 2026-08-16: the four card builders (business/faith/neighborhood/initiative)
// were verified gated same night (engine.111) and dropped from the ratchet.
const KNOWN_OPEN = {
  // engine.112 CLOSED 2026-08-16 (28f88cf5) — buildCitizenCards.js and
  // ingestPlayerTrueSource.js both classify DELETE status and abort before the
  // write pass now, so they leave the ratchet. dedupWdCitizens.js was dropped in
  // 95c18c12 against an uncommitted fix; that fix is in the same commit.
  // Discovered by this lint's first run (kimi, 2026-08-16) — canon-ingestion
  // writers with ungated error counters (Half-A-shaped). Pending rb row filing.
  'ingestCivicWiki.js': 'pending rb row filing (discovered 2026-08-16, first lint run)',
  'ingestEdition.js': 'pending rb row filing (discovered 2026-08-16 — the Saturday canon door)',
  'ingestEditionWiki.js': 'pending rb row filing (discovered 2026-08-16)',
  'supermemory-ingest.js': 'pending rb row filing (discovered 2026-08-16)',
};

const SELF = 'auditWriterExitCodes.js';

const DELETE_OR_REPLACE = [
  /\bwipeOld\w*\s*\(/, /\bdelete\w*\s*\(/i, /\bdedup\w*\s*\(/i,
  /\bupsert\w*\s*\(/i, /\bmethod:\s*['"](?:DELETE|PATCH|POST)['"]/,
  /\(\s*['"](?:DELETE|PATCH)['"]/, // smRequest('DELETE', ...) call-shape
  /supermemory.*\b(?:delete|wipe)\b/i, /replaceArtifact|deleteOld/,
];
const COUNTER_INC = /\b([a-zA-Z_]*(?:failed|errors|failures|errorCount|failCount)[a-zA-Z_]*)\s*(?:\+\+|\+=\s*1)/i;
// A throw counts as an exit path: every writer in scripts/ terminates with
// `main().catch(e => { console.error(e); process.exit(1) })`, so a guarded throw
// reaches a non-zero exit exactly like an explicit one. Without this the lint
// reported buildCitizenCards.js and ingestPlayerTrueSource.js as unguarded when
// both abort the write pass by throwing (engine.112, 28f88cf5).
// Assumption worth knowing: a throw swallowed by an enclosing try/catch would be
// counted as a gate here. No writer in scripts/ currently wraps its wipe pass
// that way; if one starts to, this heuristic goes soft on it.
const EXIT_STMT = /process\.exit\s*\(\s*[1-9]|process\.exitCode\s*=\s*[1-9]|throw\s+new\s+Error/;

function analyzeFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');

  const hasDeleteOrReplace = DELETE_OR_REPLACE.some(rx => rx.test(src));
  if (!hasDeleteOrReplace) return { verdict: 'not-in-class' };

  // Collect failure-counter variable names
  const counters = new Set();
  for (const line of lines) {
    const m = line.match(COUNTER_INC);
    if (m) counters.add(m[1]);
  }
  if (!counters.size) return { verdict: 'not-in-class' };

  // A gate exists if some counter is referenced in a condition within
  // GATE_LOOKBACK lines before an exit statement.
  //
  // Was 6, which was too tight for a real gate: buildCitizenCards.js opens with
  // `if (errors > 0)` at L1148 and exits at L1161 — 13 lines, because the block
  // between them dumps the failure list to a file first. That is the shape a
  // good gate has (report, then exit), so the narrow window penalised exactly
  // the code it should pass. 25 lines covers the dump-then-exit pattern without
  // reaching into an unrelated block.
  const GATE_LOOKBACK = 25;
  let gated = false;
  lines.forEach((line, i) => {
    if (!EXIT_STMT.test(line)) return;
    const window = lines.slice(Math.max(0, i - GATE_LOOKBACK), i + 1).join('\n');
    for (const c of counters) {
      // The condition must mean FAILURES EXIST. The original `[>!=]` accepted any
      // comparison, which let a success-path condition pass as a gate — and with
      // the wider window that mattered: ingestEdition.js (the Saturday canon
      // door) has `if (errors === 0 && !DRY_RUN)` printing a success line 8 lines
      // above an unrelated exit, and was briefly reported FIXED on that basis. It
      // is not: a partial ingest prints "Success: 15, Errors: 3" and exits 0.
      // Accept  errors > 0 / != 0 / !== 0 / >= 1 / bare truthy / .length > 0
      // Reject  errors === 0 / == 0 / < 1  — those are success conditions.
      // (?<![.\w]) — the gate must test the bare counter, not some other object's
      // property that happens to share the name. ingestEdition.js has
      // `else if (fileIntake.parsed.errors.length)` (a parse-error array) eight
      // lines above an unrelated exit; without this the canon door reads as
      // gated when its own `errors` counter never reaches an exit at all.
      const nonzero = new RegExp(
        'if\\s*\\([^)]*(?<![.\\w])' + c + '\\b(?:\\.length)?\\s*(?:' +
        '(?:!==?|>=?)\\s*(?:0|1)' +      // != 0, !== 0, > 0, >= 1
        '|\\s*[)&|]' +                    // bare truthy: if (errors) / if (errors && …)
        ')'
      );
      if (nonzero.test(window)) gated = true;
    }
  });

  // Status-classification check: failure branches that never mention a status
  // leave failures undiagnosable (plan: "classify before it gates").
  let statusDiscarded = false;
  for (const c of counters) {
    const incIdx = lines.findIndex(l => l.includes(c + '++') || l.includes(c + ' += 1'));
    if (incIdx === -1) continue;
    const branch = lines.slice(Math.max(0, incIdx - 8), incIdx + 6).join('\n');
    if (!/status|statusCode|res\.ok|resp\.ok/i.test(branch)) statusDiscarded = true;
  }

  if (!gated) return { verdict: 'UNGUARDED', counters: [...counters], statusDiscarded };
  if (statusDiscarded) return { verdict: 'gated-unclassified', counters: [...counters] };
  return { verdict: 'ok' };
}

function main() {
  const gate = process.argv.includes('--gate');
  const files = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js') && !f.endsWith('.test.js') && f !== SELF);

  const newOffenders = [], knownOpen = [], staleRatchet = [], warnings = [];
  const seen = new Set();

  for (const f of files) {
    const r = analyzeFile(path.join(SCRIPTS_DIR, f));
    seen.add(f);
    if (r.verdict === 'UNGUARDED') {
      if (KNOWN_OPEN[f]) knownOpen.push(`${f} — known open (${KNOWN_OPEN[f]})`);
      else newOffenders.push(`${f} — counters [${r.counters.join(', ')}] never gate the exit code`);
      if (r.statusDiscarded) warnings.push(`${f} — failure status discarded (undiagnosable failures)`);
    } else if (r.verdict === 'gated-unclassified') {
      warnings.push(`${f} — exit-gated but failure status unclassified (404 vs 5xx indistinguishable)`);
    }
  }
  for (const f of Object.keys(KNOWN_OPEN)) {
    if (!seen.has(f)) staleRatchet.push(`${f} — file gone; remove ratchet entry`);
    else if (!knownOpen.some(k => k.startsWith(f))) {
      staleRatchet.push(`${f} — no longer matches the pattern (fix landed? verified: ${KNOWN_OPEN[f]}); remove ratchet entry`);
    }
  }

  console.log('=== writer-exit-code lint (governance.49) ===');
  console.log(`scanned ${files.length} scripts`);
  if (knownOpen.length) {
    console.log(`\nKNOWN OPEN (${knownOpen.length}, ratcheted to rollout rows):`);
    knownOpen.forEach(k => console.log('  ' + k));
  }
  if (newOffenders.length) {
    console.log(`\nNEW OFFENDERS (${newOffenders.length}):`);
    newOffenders.forEach(k => console.log('  ' + k));
  }
  if (staleRatchet.length) {
    console.log(`\nSTALE RATCHET (${staleRatchet.length}):`);
    staleRatchet.forEach(k => console.log('  ' + k));
  }
  if (warnings.length) {
    console.log(`\nWARNINGS (${warnings.length}):`);
    warnings.forEach(k => console.log('  ' + k));
  }
  if (!newOffenders.length && !staleRatchet.length) {
    console.log('\nclean — no new unguarded writers, ratchet matches reality');
  }

  if (gate && (newOffenders.length || staleRatchet.length)) process.exit(1);
}

// Exit codes: 1 = findings (new offenders / stale ratchet) — a gate should
// block on this. 0 = clean OR internal error. The pre-commit hook blocks only
// on 1: a crashed lint (missing node, unreadable dir) warns and lets the
// commit through rather than halting every lane on the box.
try {
  main();
} catch (e) {
  console.error('[writer-exit-lint] INTERNAL ERROR (fail-open): ' + (e && e.message || e));
  process.exit(0);
}
