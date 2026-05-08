#!/usr/bin/env node
/**
 * Routing matcher diagnostic — Phase 1 T1.1 of engine-routing-foundation plan.
 *
 * Pulls live Story_Seed_Deck, surfaces SuggestedJournalist concentration per
 * cycle, per domain, per seedType. Evidence for the matcher-conflation
 * diagnosis (Simon-Leary-magnet pathology).
 *
 * docs/plans/2026-05-07-engine-routing-foundation.md §T1.1
 *
 * IDEMPOTENT — overwrites `output/routing_diagnosis_c{XX}.md` on every run.
 * The mechanical distribution dump is regenerable; the human root-cause
 * analysis lives separately in `output/routing_root_cause_c{XX}.md` (T1.2,
 * write-once). Re-run this script for any cycle without losing analysis.
 */

require('/root/GodWorld/lib/env');

const fs = require('fs');
const path = require('path');
const { getRawSheetData } = require('../lib/sheets');

const SHEET = 'Story_Seed_Deck';
const MIN_CYCLE = 89;
const DOMINANCE_THRESHOLD = 0.5;
const OUTPUT_PATH = path.join(__dirname, '..', 'output', 'routing_diagnosis_c93.md');

function tally(rows, keyFn) {
  const out = {};
  for (const r of rows) {
    const key = keyFn(r);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function groupBy(rows, outerFn, innerFn) {
  const out = {};
  for (const r of rows) {
    const o = outerFn(r);
    const i = innerFn(r);
    if (!out[o]) out[o] = {};
    out[o][i] = (out[o][i] || 0) + 1;
  }
  return out;
}

function totalsOf(dist) {
  return Object.values(dist).reduce((a, b) => a + b, 0);
}

async function main() {
  const rows = await getRawSheetData(SHEET);
  if (!rows || rows.length < 2) {
    throw new Error(`${SHEET} returned no data`);
  }

  const headers = rows[0];
  const idx = (name) => {
    const i = headers.indexOf(name);
    if (i < 0) throw new Error(`Missing header: ${name}`);
    return i;
  };
  const cycleCol = idx('Cycle');
  const seedTypeCol = idx('SeedType');
  const domainCol = idx('Domain');
  const journalistCol = idx('SuggestedJournalist');

  const norm = (v) => {
    const s = (v == null ? '' : String(v)).trim();
    return s || '(none)';
  };

  const active = rows.slice(1).filter((r) => {
    const cy = parseInt(r[cycleCol], 10);
    return Number.isFinite(cy) && cy >= MIN_CYCLE;
  });

  const cycleTotals = tally(active, (r) => parseInt(r[cycleCol], 10));
  const byCycleJournalist = groupBy(
    active,
    (r) => parseInt(r[cycleCol], 10),
    (r) => norm(r[journalistCol])
  );
  const byDomainJournalist = groupBy(
    active,
    (r) => norm(r[domainCol]),
    (r) => norm(r[journalistCol])
  );
  const bySeedTypeJournalist = groupBy(
    active,
    (r) => norm(r[seedTypeCol]),
    (r) => norm(r[journalistCol])
  );

  const lines = [];
  lines.push('# Routing Matcher Diagnosis — C93');
  lines.push('');
  lines.push(`**Source:** ${SHEET} (live, via service account)`);
  lines.push(`**Filter:** Cycle >= ${MIN_CYCLE}`);
  lines.push(`**Active rows:** ${active.length} of ${rows.length - 1}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Phase 1 T1.1 of `docs/plans/2026-05-07-engine-routing-foundation.md`. Confirms or falsifies the Simon-Leary-magnet matcher-conflation hypothesis.');
  lines.push('');

  lines.push('## Per-cycle SuggestedJournalist concentration');
  lines.push('');
  lines.push('| Cycle | Total seeds | Top byline | Count | % | 2nd | 3rd |');
  lines.push('|-------|-------------|------------|-------|---|-----|-----|');
  const cycles = Object.keys(byCycleJournalist).map(Number).sort((a, b) => a - b);
  for (const cy of cycles) {
    const dist = byCycleJournalist[cy];
    const total = cycleTotals[cy];
    const sorted = Object.entries(dist).sort(([, a], [, b]) => b - a);
    const [top1Name, top1Count] = sorted[0] || ['(none)', 0];
    const top2 = sorted[1] ? `${sorted[1][0]} (${sorted[1][1]})` : '—';
    const top3 = sorted[2] ? `${sorted[2][0]} (${sorted[2][1]})` : '—';
    const pct = total ? (top1Count / total * 100).toFixed(1) : '0.0';
    lines.push(`| ${cy} | ${total} | ${top1Name} | ${top1Count} | ${pct}% | ${top2} | ${top3} |`);
  }
  lines.push('');

  lines.push(`## Domain dominance — pairs over ${(DOMINANCE_THRESHOLD * 100).toFixed(0)}% of domain seeds`);
  lines.push('');
  lines.push('| Domain | Journalist | Count | Domain total | % |');
  lines.push('|--------|------------|-------|--------------|---|');
  const domainRows = [];
  for (const [dom, dist] of Object.entries(byDomainJournalist)) {
    const total = totalsOf(dist);
    for (const [j, c] of Object.entries(dist)) {
      const share = c / total;
      if (share > DOMINANCE_THRESHOLD) {
        domainRows.push({ dom, j, c, total, share });
      }
    }
  }
  domainRows.sort((a, b) => b.share - a.share);
  if (domainRows.length === 0) {
    lines.push('| _no pair clears threshold_ |  |  |  |  |');
  } else {
    for (const r of domainRows) {
      lines.push(`| ${r.dom} | ${r.j} | ${r.c} | ${r.total} | ${(r.share * 100).toFixed(1)}% |`);
    }
  }
  lines.push('');

  lines.push(`## SeedType dominance — pairs over ${(DOMINANCE_THRESHOLD * 100).toFixed(0)}% of seedType seeds`);
  lines.push('');
  lines.push('| SeedType | Journalist | Count | SeedType total | % |');
  lines.push('|----------|------------|-------|----------------|---|');
  const seedTypeRows = [];
  for (const [st, dist] of Object.entries(bySeedTypeJournalist)) {
    const total = totalsOf(dist);
    for (const [j, c] of Object.entries(dist)) {
      const share = c / total;
      if (share > DOMINANCE_THRESHOLD) {
        seedTypeRows.push({ st, j, c, total, share });
      }
    }
  }
  seedTypeRows.sort((a, b) => b.share - a.share);
  if (seedTypeRows.length === 0) {
    lines.push('| _no pair clears threshold_ |  |  |  |  |');
  } else {
    for (const r of seedTypeRows) {
      lines.push(`| ${r.st} | ${r.j} | ${r.c} | ${r.total} | ${(r.share * 100).toFixed(1)}% |`);
    }
  }
  lines.push('');

  lines.push('## Summary line');
  lines.push('');
  const overall = tally(active, (r) => norm(r[journalistCol]));
  const overallSorted = Object.entries(overall).sort(([, a], [, b]) => b - a);
  const [topByline, topCount] = overallSorted[0] || ['(none)', 0];
  const topPct = active.length ? (topCount / active.length * 100).toFixed(1) : '0.0';
  lines.push(`Across ${cycles.length} cycle(s) (${cycles[0]}–${cycles[cycles.length - 1]}), top byline **${topByline}** drew ${topCount} of ${active.length} seeds (${topPct}%). ${domainRows.length} (domain, journalist) pair(s) clear the ${(DOMINANCE_THRESHOLD * 100).toFixed(0)}% dominance threshold; ${seedTypeRows.length} (seedType, journalist) pair(s) clear it.`);
  lines.push('');

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'));
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Active rows: ${active.length}`);
  console.log(`Top byline: ${topByline} (${topCount}, ${topPct}%)`);
  console.log(`Domain dominance pairs: ${domainRows.length}`);
  console.log(`SeedType dominance pairs: ${seedTypeRows.length}`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
