/**
 * measureRemedies (Phase 38.5) — measurement loop enricher.
 *
 * Reads the prior cycle's audit JSON (already loaded into ctx.prior by the
 * orchestrator), matches each current pattern to its prior counterpart, and
 * checks whether the prior remedy's measurementSpec actually fired this cycle.
 * Mutates patterns[] in place with a `measurement` field. Stashes a top-level
 * `measurementHistory[]` rollup on ctx for the orchestrator to write into the
 * audit JSON.
 *
 * Schema added per pattern:
 *   measurement: {
 *     available: boolean,
 *     reason?: 'no-prior-audit' | 'no-prior-match' | 'prior-had-no-expectation',
 *     priorCycle?: number,
 *     expectedField?: string,        // e.g. "Neighborhood_Map.RetailVitality"
 *     expected?: number,             // signed magnitudeThreshold (per cycle)
 *     observed?: number,             // currentValue - priorValue
 *     delta?: number,                // observed - expected
 *     verdict?: 'remedy-firing-as-expected' | 'remedy-firing-insufficient'
 *              | 'remedy-not-firing' | 'remedy-overshot',
 *     priorRemedyType?: string,      // e.g. "advance-initiative"
 *   }
 *
 * Top-level rollup added to audit JSON via ctx.measurementHistory:
 *   measurementHistory: [
 *     { cycle, patternType, priorRemedyType, verdict, affectedEntities }
 *   ]
 */

const VERSION = '1.0.0';

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function findPriorAudit(ctx) {
  if (!Array.isArray(ctx.prior) || ctx.prior.length === 0) return null;
  const priorCycle = ctx.cycle - 1;
  const exact = ctx.prior.find(p => p && p.cycle === priorCycle);
  if (exact) return exact;
  // fall back to most-recent if cycle-1 missing (still a valid comparison point)
  return ctx.prior[0];
}

function entityOverlap(a, b) {
  if (!a || !b) return false;
  const aInits = new Set(a.initiatives || []);
  const bInits = new Set(b.initiatives || []);
  for (const id of aInits) if (bInits.has(id)) return true;
  if (aInits.size === 0 && bInits.size === 0) {
    const aN = new Set(a.neighborhoods || []);
    const bN = new Set(b.neighborhoods || []);
    for (const n of aN) if (bN.has(n)) return true;
  }
  return false;
}

function matchPriorPattern(currentPattern, priorPatterns) {
  const candidates = priorPatterns.filter(p =>
    p && p.type === currentPattern.type &&
    entityOverlap(p.affectedEntities, currentPattern.affectedEntities)
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  // tie-break: highest severity (high > medium > low), then earliest cyclesInState
  const sevRank = { high: 3, medium: 2, low: 1 };
  candidates.sort((x, y) => {
    const sd = (sevRank[y.severity] || 0) - (sevRank[x.severity] || 0);
    if (sd !== 0) return sd;
    return (y.cyclesInState || 0) - (x.cyclesInState || 0);
  });
  return candidates[0];
}

function readSnapshotValue(snapshotsBag, fieldPath, neighborhoods) {
  // fieldPath is "SheetName.FieldName"
  const dot = fieldPath.indexOf('.');
  if (dot < 0) return null;
  const sheetName = fieldPath.slice(0, dot);
  const field = fieldPath.slice(dot + 1);
  const rows = snapshotsBag[sheetName];
  if (!Array.isArray(rows) || rows.length === 0) return null;

  if (Array.isArray(neighborhoods) && neighborhoods.length > 0) {
    let best = null;
    for (const n of neighborhoods) {
      const row = rows.find(r => r && r.Neighborhood === n);
      if (!row) continue;
      const v = num(row[field]);
      if (v == null) continue;
      if (best == null || v > best) best = v; // pick max for parity with checkMitigators logic
    }
    return best;
  }
  return null;
}

function classifyVerdict(observed, expected) {
  const absExp = Math.abs(expected);
  if (absExp === 0) {
    return observed === 0 ? 'remedy-firing-as-expected' : 'remedy-overshot';
  }
  const sameSign = Math.sign(observed) === Math.sign(expected);
  const absObs = Math.abs(observed);
  if (!sameSign && absObs > 0) return 'remedy-not-firing';
  if (absObs === 0) return 'remedy-not-firing';
  if (absObs > 1.5 * absExp) return 'remedy-overshot';
  if (Math.abs(absObs - absExp) <= 0.2 * absExp) return 'remedy-firing-as-expected';
  if (absObs < absExp) return 'remedy-firing-insufficient';
  return 'remedy-firing-as-expected';
}

function enrich(patterns, ctx) {
  ctx.measurementHistory = ctx.measurementHistory || [];

  const priorAudit = findPriorAudit(ctx);
  if (!priorAudit) {
    for (const p of patterns) {
      p.measurement = { available: false, reason: 'no-prior-audit' };
    }
    return patterns;
  }

  const priorPatterns = Array.isArray(priorAudit.patterns) ? priorAudit.patterns : [];
  const priorSnapshots = priorAudit.snapshots || {};

  for (const pattern of patterns) {
    const prior = matchPriorPattern(pattern, priorPatterns);
    if (!prior) {
      pattern.measurement = { available: false, reason: 'no-prior-match' };
      continue;
    }

    const priorWorld = prior.remedyPath && prior.remedyPath.worldSide && prior.remedyPath.worldSide[0];
    const spec = priorWorld && priorWorld.measurementSpec;
    if (!spec || !spec.field || spec.magnitudeThreshold == null) {
      pattern.measurement = { available: false, reason: 'prior-had-no-expectation' };
      continue;
    }

    const neighborhoods = (spec.neighborhoodsChecked && spec.neighborhoodsChecked.length > 0)
      ? spec.neighborhoodsChecked
      : (pattern.affectedEntities && pattern.affectedEntities.neighborhoods) || [];

    const currentValue = readSnapshotValue(ctx.snapshot, spec.field, neighborhoods);
    const priorValue = readSnapshotValue(priorSnapshots, spec.field, neighborhoods);

    if (currentValue == null || priorValue == null) {
      pattern.measurement = {
        available: false,
        reason: 'no-prior-match',
        priorCycle: priorAudit.cycle,
        expectedField: spec.field,
      };
      continue;
    }

    const expected = (spec.sign === 'negative' ? -1 : 1) * Math.abs(spec.magnitudeThreshold);
    const observed = Number((currentValue - priorValue).toFixed(4));
    const delta = Number((observed - expected).toFixed(4));
    const verdict = classifyVerdict(observed, expected);

    pattern.measurement = {
      available: true,
      priorCycle: priorAudit.cycle,
      expectedField: spec.field,
      expected: Number(expected.toFixed(4)),
      observed,
      delta,
      verdict,
      priorRemedyType: priorWorld.type,
    };

    ctx.measurementHistory.push({
      cycle: ctx.cycle,
      patternType: pattern.type,
      priorRemedyType: priorWorld.type,
      verdict,
      affectedEntities: pattern.affectedEntities,
    });
  }

  return patterns;
}

module.exports = { enrich, version: VERSION };
