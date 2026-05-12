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

const VERSION = '1.0.0';

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

function enrich(patterns, ctx) {
  const ledger = (ctx.snapshot && ctx.snapshot.Simulation_Ledger) || [];
  if (ledger.length === 0) return;

  const byNeighborhood = buildNeighborhoodIndex(ledger);

  for (let p = 0; p < patterns.length; p++) {
    const pattern = patterns[p];
    if (!pattern || !pattern.affectedEntities) continue;
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

    const resolved = [...existing];
    for (let n = 0; n < neighborhoods.length && resolved.length < 3; n++) {
      const nhood = (neighborhoods[n] || '').trim().toLowerCase();
      if (!nhood) continue;
      const candidates = byNeighborhood[nhood] || [];
      for (let c = 0; c < candidates.length && resolved.length < 3; c++) {
        const cand = candidates[c];
        if (cand.popId && seenPopIds.has(cand.popId)) continue;
        resolved.push(cand.label);
        if (cand.popId) seenPopIds.add(cand.popId);
      }
    }

    pattern.affectedEntities.citizens = resolved;
  }
}

module.exports = { enrich, version: VERSION };
