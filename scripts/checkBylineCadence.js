#!/usr/bin/env node
/**
 * checkBylineCadence.js — Cadence-cap distribution check (T3.9).
 *
 * Plan: docs/plans/2026-05-07-engine-routing-foundation.md §T3.9
 *
 * Reads `Story_Seed_Deck` for a target cycle, computes per-byline emitted/
 * total ratio, and fails with exit 1 if any byline owns more than the cadence
 * cap (default 25%, matching `bylineEngine.CADENCE_CAP_RATIO`).
 *
 * Reads `BylineCandidate` column primarily (post-T3.7 schema). Falls back to
 * `SuggestedJournalist` for transition cycles where the legacy column is
 * still the source of truth. If both populated, BylineCandidate wins.
 *
 * Usage:
 *   node scripts/checkBylineCadence.js                # latest cycle in deck
 *   node scripts/checkBylineCadence.js --cycle 94     # specific cycle
 *   node scripts/checkBylineCadence.js --cap 0.30     # override cap
 *   node scripts/checkBylineCadence.js --legacy       # use SuggestedJournalist only
 *
 * Exit codes:
 *   0 — distribution OK (no byline > cap)
 *   1 — distribution violates cap (any byline > cap)
 *   2 — runtime error (sheet read fail, missing cycle, etc.)
 */

require('/root/GodWorld/lib/env');

const { getRawSheetData } = require('../lib/sheets');

const SHEET = 'Story_Seed_Deck';
const DEFAULT_CAP_RATIO = 0.25;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { cycle: null, cap: DEFAULT_CAP_RATIO, legacy: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--cycle' || a === '-c') out.cycle = parseInt(args[++i], 10);
    else if (a === '--cap') out.cap = parseFloat(args[++i]);
    else if (a === '--legacy') out.legacy = true;
  }
  if (!isFinite(out.cap) || out.cap <= 0 || out.cap > 1) {
    throw new Error(`--cap must be a ratio in (0, 1]; got ${out.cap}`);
  }
  return out;
}

function summarizeDeck(deckRows, targetCycle, useLegacy) {
  if (!deckRows || deckRows.length < 2) {
    return { total: 0, counts: {}, sourceColumn: null, missing: 0 };
  }
  const headers = deckRows[0];
  const cycleIdx = headers.indexOf('Cycle');
  const bylineIdx = useLegacy ? -1 : headers.indexOf('BylineCandidate');
  const legacyIdx = headers.indexOf('SuggestedJournalist');
  if (cycleIdx < 0) throw new Error('Story_Seed_Deck has no Cycle column');

  const counts = {};
  let total = 0;
  let missing = 0;
  let usedBylineCandidate = false;
  let usedLegacy = false;

  for (let i = 1; i < deckRows.length; i++) {
    const row = deckRows[i];
    const rowCycle = parseInt(row[cycleIdx], 10);
    if (rowCycle !== targetCycle) continue;
    let name = '';
    if (bylineIdx >= 0) {
      name = String(row[bylineIdx] || '').trim();
      if (name) usedBylineCandidate = true;
    }
    if (!name && legacyIdx >= 0) {
      name = String(row[legacyIdx] || '').trim();
      if (name) usedLegacy = true;
    }
    if (!name) {
      missing++;
      continue;
    }
    counts[name] = (counts[name] || 0) + 1;
    total++;
  }

  let sourceColumn;
  if (usedBylineCandidate && usedLegacy) sourceColumn = 'mixed';
  else if (usedBylineCandidate) sourceColumn = 'BylineCandidate';
  else if (usedLegacy) sourceColumn = 'SuggestedJournalist (legacy)';
  else sourceColumn = 'none';

  return { total: total, counts: counts, sourceColumn: sourceColumn, missing: missing };
}

function findLatestCycle(deckRows) {
  if (!deckRows || deckRows.length < 2) return null;
  const headers = deckRows[0];
  const cycleIdx = headers.indexOf('Cycle');
  if (cycleIdx < 0) return null;
  let max = 0;
  for (let i = 1; i < deckRows.length; i++) {
    const c = parseInt(deckRows[i][cycleIdx], 10);
    if (isFinite(c) && c > max) max = c;
  }
  return max || null;
}

function renderDistribution(summary, cap) {
  const lines = [];
  const entries = Object.entries(summary.counts).sort(([, a], [, b]) => b - a);
  lines.push('| # | Byline | Count | % of cycle |');
  lines.push('|---|--------|-------|------------|');
  entries.forEach(([name, count], i) => {
    const ratio = summary.total > 0 ? count / summary.total : 0;
    const flag = ratio > cap ? ' ⚠️ OVER CAP' : '';
    lines.push(`| ${i + 1} | ${name} | ${count} | ${(ratio * 100).toFixed(1)}%${flag} |`);
  });
  return lines.join('\n');
}

async function main() {
  const args = parseArgs();
  const deckRows = await getRawSheetData(SHEET);

  const cycle = args.cycle != null ? args.cycle : findLatestCycle(deckRows);
  if (!cycle) {
    console.error('No cycle data found in Story_Seed_Deck and no --cycle provided');
    process.exit(2);
  }

  const summary = summarizeDeck(deckRows, cycle, args.legacy);

  console.log(`# Byline Cadence Check — C${cycle}`);
  console.log('');
  console.log(`**Source column:** ${summary.sourceColumn}`);
  console.log(`**Cap ratio:** ${(args.cap * 100).toFixed(0)}% (${args.cap.toFixed(2)})`);
  console.log(`**Seeds for cycle:** ${summary.total} (${summary.missing} missing byline)`);
  console.log(`**Distinct bylines:** ${Object.keys(summary.counts).length}`);
  console.log('');

  if (summary.total === 0) {
    console.error(`No seeds found for C${cycle}.`);
    process.exit(2);
  }

  console.log(renderDistribution(summary, args.cap));
  console.log('');

  const violations = Object.entries(summary.counts).filter(([, count]) => count / summary.total > args.cap);
  if (violations.length > 0) {
    console.log('## Cadence cap violations');
    console.log('');
    violations.forEach(([name, count]) => {
      const ratio = count / summary.total;
      console.log(`- **${name}** — ${count}/${summary.total} (${(ratio * 100).toFixed(1)}%) exceeds cap of ${(args.cap * 100).toFixed(0)}%`);
    });
    console.log('');
    console.log('Engine B cadence cap (T3.3) should have spread routing once any byline crossed the cap. Check: (1) cadenceMultiplier_ wired correctly, (2) loadCycleCadence_ reading prior cycle, (3) cadence cap math knee/cap thresholds match plan, (4) format-axis fit table doesn\'t over-concentrate one byline.');
    process.exit(1);
  }

  console.log('## OK');
  console.log('');
  console.log('No byline exceeds the cap. Distribution within tolerance.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(2);
});
