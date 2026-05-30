#!/usr/bin/env node
/**
 * preflightInputCheck.js — canonical /pre-flight engine-input check.
 * [engine/sheet] S246 ES-7 / G-PF1 (absorbs engine.28 script half).
 *
 * Verifies the MANUAL inputs are ready before a cycle runs. The engine won't
 * fail without these — it produces a cycle with silent gaps. Replaces the
 * per-run /tmp/preflight_c<N>.js rebuild (G-PF1): one command, deterministic
 * classification, stdout report matching .claude/skills/pre-flight/SKILL.md
 * §Output + non-zero exit on NOT READY.
 *
 * Gap fixes baked in vs the pre-S246 skill text:
 *   G-PF2 — env via require('../lib/env') (sources ~/.config/godworld/.env),
 *           NOT a project-root .env (which doesn't exist).
 *   G-PF3 — Initiative output carries the §Placeholder Convention class
 *           breakdown (real / placeholder / partial-real / bloat), not a flat
 *           "all valid".
 *   G-PF4 — target cycle auto-derived from SESSION_CONTEXT.md header (Cycle: N,
 *           +1 when that cycle has shipped); --cycle=<N> overrides.
 *   G-PF5 — Processed enum: a coverage row is unprocessed unless its Processed
 *           cell lowercases to 'true' (matches applyEditionCoverageEffects).
 *   G-PF6 — Initiative_Tracker keyed off the canonical InitiativeID column.
 *
 * Usage:
 *   node scripts/preflightInputCheck.js                 # auto-derive target cycle
 *   node scripts/preflightInputCheck.js --cycle=96      # explicit target
 *
 * Exit codes:
 *   0  READY (or warnings only)
 *   1  NOT READY (missing required sports cols OR partial-real initiative rows)
 *   2  argument / data error
 */

require('../lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const SPORTS_SHEET = 'Oakland_Sports_Feed';
const INITIATIVE_SHEET = 'Initiative_Tracker';
const COVERAGE_SHEET = 'Edition_Coverage_Ratings';

// Step 1 — sports feed columns.
const SPORTS_REQUIRED = ['Cycle', 'SeasonType', 'EventType', 'TeamsUsed'];
const SPORTS_RECOMMENDED = ['NamesUsed', 'Team Record', 'FanSentiment', 'PlayerMood'];

// Step 5 — §Placeholder Convention engine-critical fields (a real row needs
// Name + all four populated; missing any → partial-real / NOT READY).
const INITIATIVE_ID_COL = 'InitiativeID';
const INITIATIVE_ENGINE_CRITICAL = ['Status', 'ImplementationPhase', 'PolicyDomain', 'AffectedNeighborhoods'];

function blank(v) {
  return v == null || String(v).trim() === '';
}

function parseArgCycle() {
  const arg = process.argv.find(a => a.startsWith('--cycle='));
  if (!arg) return null;
  const n = parseInt(arg.split('=')[1], 10);
  if (!Number.isFinite(n) || n < 0) {
    console.error('[ERROR] --cycle expects a non-negative integer');
    process.exit(2);
  }
  return n;
}

// G-PF4 — derive the next-to-run cycle from SESSION_CONTEXT.md header.
// `Cycle: N` is the current cycle; if its edition has shipped (header carries a
// CANONIZED / post-publish-COMPLETE / PUBLISHED marker for cycle N) the next
// cycle to run is N+1, else N.
function deriveTargetCycle() {
  const scPath = path.join(__dirname, '..', 'SESSION_CONTEXT.md');
  let header = '';
  try {
    const text = fs.readFileSync(scPath, 'utf8');
    header = (text.split('\n').find(l => /Cycle:\s*\d+/.test(l)) || '');
  } catch (e) {
    console.error('[ERROR] could not read SESSION_CONTEXT.md for cycle derivation: ' + e.message);
    console.error('        pass --cycle=<N> explicitly.');
    process.exit(2);
  }
  const m = header.match(/Cycle:\s*(\d+)/);
  if (!m) {
    console.error('[ERROR] no "Cycle: N" found in SESSION_CONTEXT header — pass --cycle=<N>.');
    process.exit(2);
  }
  const current = parseInt(m[1], 10);
  const shipped = new RegExp(
    `(CYCLE\\s*${current}\\s*CANONIZED|C${current}\\s*/?post-publish\\s*COMPLETE|C${current}\\s+PUBLISHED)`, 'i'
  ).test(header);
  return { target: shipped ? current + 1 : current, current, shipped };
}

function classifyInitiativeRow(row) {
  const id = row[INITIATIVE_ID_COL];
  const name = row.Name;
  const critical = INITIATIVE_ENGINE_CRITICAL;
  const missing = critical.filter(f => blank(row[f]));

  // Decision tree (first match wins) — §Placeholder Convention.
  // 1. fully empty (incl. InitiativeID) → bloat
  if (blank(id) && blank(name) && missing.length === critical.length) return { cls: 'bloat' };
  // 2. only InitiativeID populated → placeholder
  if (!blank(id) && blank(name) && missing.length === critical.length) return { cls: 'placeholder', id };
  // 3. InitiativeID + Name, missing ≥1 engine-critical → partial-real (block)
  if (!blank(id) && !blank(name) && missing.length > 0) return { cls: 'partial-real', id, missing };
  // 4. InitiativeID + Name + all engine-critical → real
  if (!blank(id) && !blank(name) && missing.length === 0) return { cls: 'real', id };
  // anything else (e.g. Name without InitiativeID) → treat as partial/bloat-ish
  if (blank(id)) return { cls: 'bloat' };
  return { cls: 'partial-real', id, missing };
}

async function loadSheet(name) {
  try {
    return await sheets.getSheetAsObjects(name);
  } catch (e) {
    return { __error: e.message };
  }
}

async function main() {
  const overrideCycle = parseArgCycle();
  let target, derivationNote;
  if (overrideCycle != null) {
    target = overrideCycle;
    derivationNote = `--cycle=${target} (explicit)`;
  } else {
    const d = deriveTargetCycle();
    target = d.target;
    derivationNote = `auto: SESSION_CONTEXT Cycle ${d.current}${d.shipped ? ' shipped → +1' : ' not shipped → same'}`;
  }
  const prevCycle = target - 1;

  const lines = [];
  const warnings = [];
  let notReady = false;

  lines.push(`PRE-FLIGHT: Cycle ${target}`);
  lines.push('='.repeat(40));
  lines.push(`Target derivation: ${derivationNote}`);
  lines.push('');

  // ── Step 1: Sports Feed ──
  const sports = await loadSheet(SPORTS_SHEET);
  if (sports.__error) {
    lines.push(`[!] Sports Feed: READ FAILED — ${sports.__error}`);
    warnings.push(`${SPORTS_SHEET} read failed`);
  } else {
    const rows = sports.filter(r => String(r.Cycle).match(/\d+/) && parseInt(String(r.Cycle).match(/\d+/)[0], 10) === target);
    if (rows.length === 0) {
      lines.push(`[ ] Sports Feed: NO entries for C${target} — required inputs missing`);
      notReady = true;
    } else {
      const reqMissing = [];
      const recMissing = [];
      for (let i = 0; i < rows.length; i++) {
        for (const c of SPORTS_REQUIRED) if (blank(rows[i][c])) reqMissing.push(`row ${i + 1}:${c}`);
        for (const c of SPORTS_RECOMMENDED) if (blank(rows[i][c])) recMissing.push(`row ${i + 1}:${c}`);
      }
      if (reqMissing.length > 0) {
        lines.push(`[ ] Sports Feed: ${rows.length} entries, MISSING required: ${reqMissing.join(', ')}`);
        notReady = true;
      } else if (recMissing.length > 0) {
        lines.push(`[!] Sports Feed: ${rows.length} entries, all required populated; thin on recommended (${recMissing.length} cells)`);
        warnings.push(`sports recommended cols thin (${recMissing.length} cells)`);
      } else {
        lines.push(`[x] Sports Feed: ${rows.length} entries, all required + recommended columns populated`);
      }
    }
  }

  // ── Steps 2-4: intakes (NOT WIRED) ──
  lines.push('[ ] Citizen Intake: NOT WIRED');
  lines.push('[ ] Business Intake: NOT WIRED');
  lines.push('[ ] Storyline Intake: NOT WIRED');

  // ── Step 5: Initiative Tracker ──
  const inits = await loadSheet(INITIATIVE_SHEET);
  if (inits.__error) {
    lines.push(`[!] Initiative Tracker: READ FAILED — ${inits.__error}`);
    warnings.push(`${INITIATIVE_SHEET} read failed`);
  } else {
    const counts = { real: 0, placeholder: 0, 'partial-real': 0, bloat: 0 };
    const placeholders = [];
    const partials = [];
    for (const row of inits) {
      const c = classifyInitiativeRow(row);
      counts[c.cls]++;
      if (c.cls === 'placeholder') placeholders.push(c.id);
      if (c.cls === 'partial-real') partials.push(c);
    }
    if (partials.length > 0) {
      lines.push(`[ ] Initiative Tracker: ${counts.real} real / ${counts.placeholder} placeholder / ${counts.bloat} bloat — ${partials.length} PARTIAL-REAL (NOT READY)`);
      for (const p of partials) lines.push(`      ${p.id}: missing ${p.missing.join(', ')}`);
      notReady = true;
    } else {
      lines.push(`[x] Initiative Tracker: ${counts.real} real / ${counts.placeholder} placeholder / ${counts.bloat} bloat`);
    }
    for (const id of placeholders) lines.push(`      INFO placeholder ${id} — reserved slot, no validation required`);
  }

  // ── Step 6: Edition Coverage Ratings (previous cycle) ──
  const coverage = await loadSheet(COVERAGE_SHEET);
  if (coverage.__error) {
    lines.push(`[!] Coverage Ratings: READ FAILED — ${coverage.__error}`);
    warnings.push(`${COVERAGE_SHEET} read failed`);
  } else {
    const prevRows = coverage.filter(r => String(r.Cycle).match(/\d+/) && parseInt(String(r.Cycle).match(/\d+/)[0], 10) === prevCycle);
    if (prevRows.length === 0) {
      lines.push(`[!] Coverage Ratings: MISSING for C${prevCycle} (engine runs without media feedback)`);
      warnings.push(`coverage missing for C${prevCycle}`);
    } else {
      // G-PF5 — unprocessed unless Processed lowercases to 'true'.
      const unprocessed = prevRows.filter(r => String(r.Processed || '').trim().toLowerCase() !== 'true');
      const incomplete = prevRows.filter(r => blank(r.Cycle) || blank(r.Domain) || blank(r.Rating));
      if (incomplete.length > 0) {
        lines.push(`[!] Coverage Ratings: C${prevCycle} has ${incomplete.length} row(s) missing Cycle/Domain/Rating`);
        warnings.push(`coverage C${prevCycle} ${incomplete.length} incomplete rows`);
      } else {
        lines.push(`[x] Coverage Ratings: C${prevCycle} — ${prevRows.length} rows (${unprocessed.length} unprocessed, ready for engine intake)`);
      }
    }
  }

  lines.push('='.repeat(40));
  const verdict = notReady ? 'NOT READY' : (warnings.length > 0 ? 'READY (with warnings)' : 'READY');
  lines.push(verdict);
  if (warnings.length > 0) {
    lines.push('');
    lines.push('Warnings (non-blocking):');
    for (const w of warnings) lines.push(`  - ${w}`);
  }

  console.log(lines.join('\n'));
  process.exit(notReady ? 1 : 0);
}

if (require.main === module) {
  main().catch(err => { console.error('[FATAL]', err.message); process.exit(2); });
}

module.exports = { classifyInitiativeRow, deriveTargetCycle, blank };
