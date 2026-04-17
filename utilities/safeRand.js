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
