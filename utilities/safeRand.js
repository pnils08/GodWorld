/**
 * safeRand_(ctx) — deterministic RNG resolver for the engine
 *
 * Phase 40.3 Path 1 cleanup (S156). Replaces the ~57 ad-hoc inline
 * ctx.rng-or-Math.random fallbacks across the phase files with one
 * centralized helper that enforces ctx.rng (or a seeded mulberry32
 * fallback) and THROWS if neither is available — instead of silently
 * dropping to Math.random, which breaks deterministic replay.
 *
 * Usage:
 *   var rng = safeRand_(ctx);
 *   var x = rng();  // [0, 1)
 *
 * Resolution order:
 *   1. ctx.rng (the normal cycle-wired RNG)
 *   2. mulberry32_(config.rngSeed ^ cycleId) if config has a seed
 *   3. throw — never silently falls back to Math.random
 *
 * Paths where ctx.rng is legitimately absent (manual admin scripts, etc.)
 * should either use `Math.random` directly with an explicit comment
 * (see civicInitiativeEngine.js:2010) or wrap with their own try/catch.
 *
 * Apps Script global: this file is loaded with every other phase file,
 * so callers don't require() anything — the helper is just globally
 * available.
 */

function safeRand_(ctx) {
  if (ctx && typeof ctx.rng === 'function') return ctx.rng;
  if (ctx && ctx.config && typeof ctx.config.rngSeed === 'number') {
    var S = ctx.summary || {};
    var cycle = S.cycleId || ctx.config.cycleCount || 0;
    return mulberry32_(((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0)) >>> 0);
  }
  throw new Error('safeRand_: ctx.rng or ctx.config.rngSeed required (Phase 40.3 Path 1 — Math.random fallback removed)');
}


/**
 * uniqueGeneratedId_(ctx, bucket, genFn) — collision-guarded ID minting.
 *
 * engine.128. Two ID generators (seedRelationBondsv1.generateSeedBondId_ and
 * bondEngine.generateBondId_) each drew N characters from the RNG and returned
 * the result with NO uniqueness check. When ctx.rng was degenerate — every seed
 * collapsing into one shared 10,466-value ring — that produced 53 duplicate
 * BondIds across c102/c103, on a column that bondEngine.js:1670 reads as a
 * LOOKUP KEY. A duplicate key silently resolves to the wrong bond.
 *
 * The RNG is fixed, which makes collisions astronomically unlikely. It does not
 * make them impossible, and "unlikely" is not a guarantee to hang a primary key
 * on — the whole reason the original defect ran for 100+ cycles is that nothing
 * ever checked. So: check.
 *
 * Deterministic and replay-safe — the retry consumes the same ctx.rng stream,
 * so a given seed still reproduces a given sequence of IDs.
 *
 * @param {Object} ctx       engine context (carries the per-cycle seen-set)
 * @param {string} bucket    namespace, e.g. 'bond' — separate id spaces
 * @param {Function} genFn   zero-arg generator returning a candidate id string
 * @return {string} an id not previously returned for this bucket this cycle
 */
function uniqueGeneratedId_(ctx, bucket, genFn) {
  if (typeof genFn !== 'function') {
    throw new Error('uniqueGeneratedId_: genFn required');
  }
  var key = '_generatedIds_' + bucket;
  var scope = ctx || {};
  if (!scope[key]) scope[key] = {};
  var seen = scope[key];

  var MAX_TRIES = 12;
  for (var i = 0; i < MAX_TRIES; i++) {
    var candidate = genFn();
    if (candidate && !seen[candidate]) {
      seen[candidate] = true;
      return candidate;
    }
  }

  // 12 straight collisions is not bad luck — it means the RNG has degenerated
  // again. Fail loud rather than mint a known-duplicate key: a silent duplicate
  // is exactly the failure mode that cost 53 rows and went unnoticed for over a
  // hundred cycles.
  throw new Error('uniqueGeneratedId_: ' + MAX_TRIES + ' consecutive collisions minting a "' +
    bucket + '" id — ctx.rng has degenerated (see engine.128, ' +
    'docs/plans/2026-08-21-ctx-rng-attractor-collapse.md). Refusing to mint a duplicate key.');
}


/**
 * seedGeneratedIds_(ctx, bucket, ids) — prime the seen-set with IDs already on
 * the sheet, so a newly minted id cannot collide with a PERSISTED one. Without
 * this the guard only protects against collisions within a single cycle, and
 * the observed 53 duplicates were cross-cycle (c102 vs c103).
 */
function seedGeneratedIds_(ctx, bucket, ids) {
  var key = '_generatedIds_' + bucket;
  var scope = ctx || {};
  if (!scope[key]) scope[key] = {};
  if (!ids || !ids.length) return scope[key];
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if (id) scope[key][id] = true;
  }
  return scope[key];
}
