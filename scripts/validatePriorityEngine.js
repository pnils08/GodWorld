#!/usr/bin/env node
/**
 * validatePriorityEngine.js — Engine A shadow validation harness (T2.8).
 *
 * Plan: docs/plans/2026-05-07-engine-routing-foundation.md §T2.8
 *
 * Goal: surface alignment (or drift) between Engine A's `priorityScore` per
 * seed and Mags' editorial pick order from `output/sift_proposals_c{XX}.json`.
 *
 * v1 SCOPE (S206):
 *   - Side-by-side report: Mags' proposals vs Engine A's top-scored seeds.
 *   - Per-proposal `sourceSignal` text passed through verbatim — no fuzzy
 *     title-match yet. Manual eyeball alignment for C94 + C95 produces the
 *     pattern needed to build defensible v2 correlation.
 *
 * v1 NON-GOALS (deferred):
 *   - Spearman correlation against pick order (T2.8 acceptance ≥ 0.7).
 *     Plan assumed proposals[].id maps to Story_Seed_Deck.SeedID — they don't
 *     (sift uses internal "S1/S2" IDs; proposals aggregate multiple seeds via
 *     sourceSignal text). Shipping correlation against fuzzy match would
 *     produce a number with false confidence.
 *   - Multi-cycle roll-up. Once 3 cycles of live data exist, v2 layers it on.
 *
 * Empty-state behavior: if Story_Seed_Deck has no `PriorityScore` column
 * (engine-sheet T2.7 not yet shipped) OR no rows for the requested cycle have
 * scores populated, report says "awaiting live data" and exits 0.
 *
 * Idempotent — overwrites `output/priority_engine_validation_c{XX}.md` on
 * each run. Pure-read against sheets, never writes back.
 */

require('/root/GodWorld/lib/env');

const fs = require('fs');
const path = require('path');
const { getRawSheetData } = require('../lib/sheets');

const SHEET = 'Story_Seed_Deck';
const PROPOSALS_DIR = path.join(__dirname, '..', 'output');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { cycle: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--cycle' || a === '-c') out.cycle = parseInt(args[++i], 10);
  }
  return out;
}

function loadProposals(cycle) {
  const candidate = path.join(PROPOSALS_DIR, `sift_proposals_c${cycle}.json`);
  if (!fs.existsSync(candidate)) return null;
  try {
    return JSON.parse(fs.readFileSync(candidate, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse ${candidate}: ${err.message}`);
  }
}

function findLatestCycleWithProposals() {
  const files = fs.readdirSync(PROPOSALS_DIR)
    .map((f) => f.match(/^sift_proposals_c(\d+)\.json$/))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10))
    .sort((a, b) => b - a);
  return files[0] || null;
}

function buildSeedIndex(deckRows) {
  const headers = deckRows[0];
  const idx = (name) => headers.indexOf(name);
  const cycleCol     = idx('Cycle');
  const seedIdCol    = idx('SeedID');
  const seedTypeCol  = idx('SeedType');
  const domainCol    = idx('Domain');
  const neighborhoodCol = idx('Neighborhood');
  const seedTextCol  = idx('SeedText');
  const journoCol    = idx('SuggestedJournalist');
  const priorityScoreCol     = idx('PriorityScore');
  const consequenceFloorCol  = idx('ConsequenceFloor');
  const priorityComponentsCol = idx('PriorityComponents');

  return {
    headers: headers,
    rows: deckRows.slice(1),
    cols: {
      cycle: cycleCol,
      seedId: seedIdCol,
      seedType: seedTypeCol,
      domain: domainCol,
      neighborhood: neighborhoodCol,
      seedText: seedTextCol,
      journalist: journoCol,
      priorityScore: priorityScoreCol,
      consequenceFloor: consequenceFloorCol,
      priorityComponents: priorityComponentsCol
    },
    hasPriorityCols: priorityScoreCol >= 0
  };
}

function topScoredSeeds(index, cycle, limit) {
  if (!index.hasPriorityCols) return [];
  const scored = [];
  for (const r of index.rows) {
    const seedCycle = parseInt(r[index.cols.cycle], 10);
    if (seedCycle !== cycle) continue;
    const score = parseFloat(r[index.cols.priorityScore]);
    if (!isFinite(score)) continue;
    scored.push({
      seedId: r[index.cols.seedId] || '',
      seedType: r[index.cols.seedType] || '',
      domain: r[index.cols.domain] || '',
      neighborhood: r[index.cols.neighborhood] || '',
      text: String(r[index.cols.seedText] || '').slice(0, 80),
      journalist: r[index.cols.journalist] || '',
      score: score,
      floor: String(r[index.cols.consequenceFloor] || '').toUpperCase() === 'TRUE'
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function renderProposalsTable(proposals) {
  const lines = [];
  lines.push('| # | Sift ID | Priority | Score | Reporter | Title (excerpt) | sourceSignal |');
  lines.push('|---|---------|----------|-------|----------|-----------------|--------------|');
  proposals.forEach((p, i) => {
    const title = String(p.title || '').slice(0, 50).replace(/\|/g, '\\|');
    const sig = String(p.sourceSignal || '').slice(0, 40).replace(/\|/g, '\\|');
    lines.push(`| ${i + 1} | ${p.id} | ${p.priority || ''} | ${p.scoreFrontPage != null ? p.scoreFrontPage : '—'} | ${p.reporter || ''} | ${title} | ${sig} |`);
  });
  return lines.join('\n');
}

function renderTopSeedsTable(top) {
  if (top.length === 0) {
    return '_No live priority data yet — awaiting first cycle with Engine A wired._';
  }
  const lines = [];
  lines.push('| Rank | SeedID | Score | Floor | Domain | Type | Neighborhood | Journalist | Text excerpt |');
  lines.push('|------|--------|-------|-------|--------|------|--------------|------------|--------------|');
  top.forEach((s, i) => {
    const floor = s.floor ? '🔒' : '';
    const text = s.text.replace(/\|/g, '\\|');
    lines.push(`| ${i + 1} | ${s.seedId} | ${s.score.toFixed(2)} | ${floor} | ${s.domain} | ${s.seedType} | ${s.neighborhood} | ${s.journalist} | ${text} |`);
  });
  return lines.join('\n');
}

async function main() {
  const args = parseArgs();
  // G-RC10 (engine.19, S226): degraded-mode emit. /run-cycle ends before
  // /sift fires, so engine-sheet's natural smoke-test point lacked the
  // sift_proposals_c{XX}.json the validator hard-required. Pre-fix: throw
  // and fail the smoke-test. Post-fix: when cycle is explicit (--cycle) and
  // proposals are missing, emit an Engine-A-only top-N report stating
  // "awaiting /sift" so the validator runs cleanly post-/run-cycle and
  // re-runs cleanly post-/sift with the full side-by-side.
  let cycle = args.cycle;
  if (cycle == null) cycle = findLatestCycleWithProposals();
  if (!cycle) {
    throw new Error(
      'No sift_proposals_c{XX}.json files found and no --cycle provided. ' +
      'Pass --cycle <N> for degraded-mode Engine-A-only emit.'
    );
  }

  const proposals = loadProposals(cycle);
  const degradedMode = !proposals;

  const deckRows = await getRawSheetData(SHEET);
  const index = buildSeedIndex(deckRows);
  const top = topScoredSeeds(index, cycle, degradedMode ? 25 : 15);

  const outPath = path.join(__dirname, '..', 'output', `priority_engine_validation_c${cycle}.md`);

  const lines = [];
  lines.push(`# Priority Engine Validation — C${cycle}${degradedMode ? ' (Engine-A-only — awaiting /sift)' : ''}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  if (degradedMode) {
    lines.push(`**Sift proposals:** awaiting (\`output/sift_proposals_c${cycle}.json\` not yet produced)`);
  } else {
    lines.push(`**Sift proposals:** ${proposals.proposals ? proposals.proposals.length : 0}`);
  }
  lines.push(`**Story_Seed_Deck rows for C${cycle}:** ${index.rows.filter((r) => parseInt(r[index.cols.cycle], 10) === cycle).length}`);
  lines.push(`**Engine A live data:** ${index.hasPriorityCols && top.length > 0 ? 'present' : 'awaiting'}`);
  lines.push(`**Mode:** ${degradedMode ? 'degraded — Engine-A top-25 emit only, side-by-side comparison awaits /sift output' : 'full side-by-side'}`);
  lines.push('');
  if (degradedMode) {
    lines.push('Plan T2.8 §v1 — degraded path (G-RC10, engine.19 S226). /run-cycle\'s natural smoke-test point ends before /sift; validator now emits Engine-A-only top-25 in that window. Re-run after /sift to land the full side-by-side comparison.');
  } else {
    lines.push('Plan T2.8 §v1 — side-by-side surfacing only. Spearman correlation against pick order deferred to v2 once 3+ cycles of live data accumulate. Manual eyeball: do Mags\' top proposals appear in Engine A\'s top-scored seeds?');
  }
  lines.push('');

  if (!degradedMode) {
    lines.push(`## Mags' editorial pick order (from \`sift_proposals_c${cycle}.json\`)`);
    lines.push('');
    lines.push(renderProposalsTable(proposals.proposals || []));
    lines.push('');
  }

  const topN = degradedMode ? 25 : 15;
  lines.push(`## Engine A top-${topN} seeds for C${cycle} (priorityScore desc)`);
  lines.push('');
  lines.push(renderTopSeedsTable(top));
  lines.push('');

  if (!index.hasPriorityCols) {
    lines.push('## Status');
    lines.push('');
    lines.push('Story_Seed_Deck has no `PriorityScore` column — engine-sheet T2.7 schema add not yet visible to live reads, or sheet not refreshed since clasp push. Re-run after next cycle fires.');
    lines.push('');
  } else if (top.length === 0) {
    lines.push('## Status');
    lines.push('');
    lines.push(`No seeds in C${cycle} have a populated PriorityScore. Engine A wiring (T2.6 in applyStorySeeds.js) fires at next cycle emit; first live signal lands in C${cycle + 1} or later. Re-run with \`--cycle ${cycle + 1}\` once that cycle produces seeds.`);
    lines.push('');
  } else {
    lines.push('## Eyeball checks for v2 design');
    lines.push('');
    lines.push('Working questions for shadow-cycle review (answers feed v2 correlation strategy):');
    lines.push('');
    lines.push('1. **Top-overlap.** How many of Mags\' top-N proposals have a corresponding seed in Engine A\'s top-N? Define N (5? 10?) and the matching rule (sourceSignal token? domain+neighborhood? title-keyword?).');
    lines.push('2. **Floor coverage.** Are all `🔒` floored seeds reflected in Mags\' picks? If not, the floor flag is firing on seeds Mags doesn\'t see as front-page-worthy — tune `isConsequenceFloor_` or `CONSEQUENCE_FLOOR_DOMAINS`.');
    lines.push('3. **Score-band pattern.** Do Mags\' HIGH-priority proposals cluster around the same priorityScore band? If they spread across 3-9, the score isn\'t separating priority well.');
    lines.push('4. **Domain concentration.** Engine A vs Mags — does either over-represent a domain relative to the other?');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`**Provenance:** \`scripts/validatePriorityEngine.js\` v1.1 (S226 G-RC10 degraded-mode) reading \`Story_Seed_Deck\`${degradedMode ? ' (sift proposals not yet produced; re-run post-/sift for full side-by-side)' : ` + \`sift_proposals_c${cycle}.json\``}. v1 is read-only side-by-side; v2 (post 3-cycle data) adds correlation metric.`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Wrote ${outPath}`);
  console.log(`Cycle: C${cycle}`);
  console.log(`Mode: ${degradedMode ? 'degraded (Engine-A-only)' : 'full side-by-side'}`);
  console.log(`Mags proposals: ${degradedMode ? 'awaiting' : (proposals.proposals ? proposals.proposals.length : 0)}`);
  console.log(`Engine A top seeds for C${cycle}: ${top.length}`);
  console.log(`Engine A live data: ${index.hasPriorityCols && top.length > 0 ? 'present' : 'awaiting'}`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
