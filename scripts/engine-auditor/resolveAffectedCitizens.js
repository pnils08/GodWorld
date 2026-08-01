/**
 * resolveAffectedCitizens.js — Phase 38.4 enricher (closes pipeline.15 / G-S2 + G-S3 + G-W7)
 *
 * Pre-fix (S214 and earlier): engine auditor identified neighborhoods +
 * initiatives + councilSeats per pattern but never resolved the human-stake
 * layer. Patterns shipped with `affectedEntities.citizens = []`, which then
 * propagated as empty `tribuneFraming.storyHandles[desk].citizens` arrays.
 * Sift saw the empty arrays, fell back to discover-citizens mode (newsroom
 * memory + lookup_citizen + neighborhood queries) every cycle — and worse,
 * reporter agents working from briefs that called for "a [demographic] from
 * [neighborhood]" had nothing to ground against and fabricated names (G-W7
 * Hal Cordell Mays case).
 *
 * Fix path: read Simulation_Ledger snapshot directly (already loaded by the
 * auditor — zero new I/O), build a neighborhood-keyed citizen index, and
 * populate `affectedEntities.citizens` with 2-3 high-prior-coverage names
 * for each pattern's affected neighborhoods.
 *
 * Ranking: Tier-1 first (named/protected canon), then Tier-2 (named civic +
 * media + business), then Tier-3 (generic with prior coverage). Within tier:
 * prefer Status === 'Active' + highest UsageCount (prior-coverage signal).
 *
 * Must run BEFORE generateTribuneFraming — that enricher reads the populated
 * citizens slot and propagates to storyHandles.
 */

const VERSION = '1.1.0';

function citizenLabel(row) {
  const first = (row.First || '').trim();
  const last = (row.Last || '').trim();
  const popId = (row.POPID || '').trim();
  const fullName = [first, last].filter(Boolean).join(' ').trim();
  if (!fullName) return popId || null;
  return popId ? `${fullName} (${popId})` : fullName;
}

function buildNeighborhoodIndex(ledgerRows) {
  // Map neighborhood (case-insensitive) → ranked candidate list.
  // Skip rows with no neighborhood, no active status, or no parseable tier.
  const byNeighborhood = {};
  for (let i = 0; i < ledgerRows.length; i++) {
    const row = ledgerRows[i];
    const neighborhood = (row.Neighborhood || '').trim();
    if (!neighborhood) continue;
    const status = (row.Status || '').toLowerCase();
    if (status && status !== 'active' && status !== '') continue;
    const tier = parseInt(row.Tier, 10);
    if (!Number.isFinite(tier) || tier < 1 || tier > 4) continue;
    const usage = parseInt(row.UsageCount, 10) || 0;
    const key = neighborhood.toLowerCase();
    if (!byNeighborhood[key]) byNeighborhood[key] = [];
    byNeighborhood[key].push({
      label: citizenLabel(row),
      popId: row.POPID,
      tier,
      usage,
    });
  }
  // Rank: tier asc, then usage desc.
  for (const key in byNeighborhood) {
    byNeighborhood[key].sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return b.usage - a.usage;
    });
  }
  return byNeighborhood;
}

// G-ER3 (S244 ES-3) — neighborhood-name set from Neighborhood_Map (+ any
// neighborhood that actually has citizens in the ledger, so a token resolves
// even if the map lags). Lowercase key → canonical casing.
function buildNeighborhoodNameSet(ctx, byNeighborhood) {
  const names = new Map();
  const nmap = (ctx.snapshot && ctx.snapshot.Neighborhood_Map) || [];
  for (const row of nmap) {
    const n = (row.Neighborhood || '').trim();
    if (n) names.set(n.toLowerCase(), n);
  }
  for (const key of Object.keys(byNeighborhood || {})) {
    if (!names.has(key)) names.set(key, key);
  }
  return names;
}

// G-ER3 — repeating-event patterns surface their signal in evidence tokens
// (recurringIssue / recurringTokens), not in affectedEntities.neighborhoods.
// "kono" is the canonical KONO neighborhood but shipped with neighborhoods:[],
// so the resolver found no residents and the brief read like filler. If any token
// names a known neighborhood, scope the pattern to it; the citizen resolver below
// then fills residents. Error-fragment clusters (the "strain" pattern's "cannot
// read properties undefined" tokens) match nothing and correctly stay city-level.
function resolveNeighborhoodTokens(pattern, neighborhoodNames) {
  const ae = pattern.affectedEntities;
  if (Array.isArray(ae.neighborhoods) && ae.neighborhoods.length > 0) return;
  const f = (pattern.evidence && pattern.evidence.fields) || {};
  const tokens = [];
  if (f.recurringIssue) tokens.push(f.recurringIssue);
  if (Array.isArray(f.recurringTokens)) tokens.push(...f.recurringTokens);
  const matched = [];
  for (const t of tokens) {
    const canonical = neighborhoodNames.get(String(t || '').trim().toLowerCase());
    if (canonical && !matched.includes(canonical)) matched.push(canonical);
  }
  if (matched.length > 0) ae.neighborhoods = matched;
}

function enrich(patterns, ctx) {
  const ledger = (ctx.snapshot && ctx.snapshot.Simulation_Ledger) || [];
  if (ledger.length === 0) return;

  const byNeighborhood = buildNeighborhoodIndex(ledger);
  const neighborhoodNames = buildNeighborhoodNameSet(ctx, byNeighborhood);
  // Task 2.5.6 (Mike-direct S344, confirmed live 2026-08-01): the ranked index
  // is STABLE — tier asc + usage desc handed every Fruitvale pattern the same
  // top-3 in the same order, cycle after cycle, and usage-desc is a
  // rich-get-richer loop (coverage raises UsageCount raises rank). Two levers,
  // both deterministic (audit runs must replay identically — no Math.random):
  //   1. per-pattern rotation offset seeded on (cycle, pattern index) over a
  //      WIDENED slate, so orderings vary across patterns and cycles;
  //   2. cross-pattern spread within one audit — a citizen already resolved
  //      onto an earlier pattern this run is skipped while fresh candidates
  //      remain (soft: pool exhaustion falls back to reuse, never empties).
  const SLATE_WIDTH = 12;   // per neighborhood — the pool downstream top-3 picks rotate over
  const cycleNum = parseInt(ctx.cycle, 10) || 0;
  const usedThisAudit = new Set();

  for (let p = 0; p < patterns.length; p++) {
    const pattern = patterns[p];
    if (!pattern || !pattern.affectedEntities) continue;
    // G-ER3 — promote neighborhood-named tokens into affectedEntities.neighborhoods
    // before resolving citizens (no-op when neighborhoods already populated).
    resolveNeighborhoodTokens(pattern, neighborhoodNames);
    // Preserve any citizens a detector already populated (rare today, but
    // detectors may evolve to attach citizens directly to their patterns).
    const existing = Array.isArray(pattern.affectedEntities.citizens)
      ? pattern.affectedEntities.citizens.filter(Boolean)
      : [];
    if (existing.length >= 3) continue;

    const seenPopIds = new Set();
    existing.forEach((c) => {
      const m = typeof c === 'string' && c.match(/POP-\d+/);
      if (m) seenPopIds.add(m[0]);
    });

    const neighborhoods = Array.isArray(pattern.affectedEntities.neighborhoods)
      ? pattern.affectedEntities.neighborhoods
      : [];

    // Widened slate across the pattern's neighborhoods, deduped by popId,
    // ranked order preserved (tier still gates who is IN the slate).
    const slate = [];
    const inSlate = new Set();
    for (const n of neighborhoods) {
      const nhood = (n || '').trim().toLowerCase();
      if (!nhood) continue;
      for (const cand of (byNeighborhood[nhood] || []).slice(0, SLATE_WIDTH)) {
        if (cand.popId && inSlate.has(cand.popId)) continue;
        if (cand.popId) inSlate.add(cand.popId);
        slate.push(cand);
      }
    }

    const resolved = [...existing];
    if (slate.length) {
      const offset = (cycleNum * 7 + p * 3) % slate.length;
      // pass 1: fresh-this-audit candidates from the rotated start;
      // pass 2: pool exhausted — allow cross-pattern reuse (soft floor).
      for (const requireFresh of [true, false]) {
        for (let i = 0; i < slate.length && resolved.length < 3; i++) {
          const cand = slate[(offset + i) % slate.length];
          if (!cand.popId || seenPopIds.has(cand.popId)) continue;
          if (requireFresh && usedThisAudit.has(cand.popId)) continue;
          resolved.push(cand.label);
          seenPopIds.add(cand.popId);
          usedThisAudit.add(cand.popId);
        }
        if (resolved.length >= 3) break;
      }
    }

    pattern.affectedEntities.citizens = resolved;
  }
}

module.exports = { enrich, version: VERSION };
