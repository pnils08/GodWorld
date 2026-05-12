/**
 * lib/staleness.js — derivative-artifact staleness detection
 *
 * Shipped S215 (pipeline.14a / G-S1 + G-S5 + G-P3 + G-PR3 + G-7). Multiple
 * skills consume derivative artifacts (world_summary, engine_audit) that get
 * built BEFORE /city-hall runs; when the cycle's civic decisions land, the
 * artifacts are silently stale and downstream skills (sift, post-publish,
 * edition-print) consume the pre-civic snapshot. C93 lost an entire cycle's
 * civic state from desk-agent inputs because of this.
 *
 * This module is the single source of truth for "is derivative X older than
 * authoritative baseline Y." Callers (CLI wrappers, skill-side pre-flight
 * gates) compose it for their specific artifact pair.
 *
 * Pure: only reads mtimes from fs.statSync. No network, no sheets, no LLM.
 */

const fs = require('fs');

/**
 * Compare mtime of a derivative artifact against an authoritative baseline.
 * @param {string} artifactPath - Absolute path to the derivative file.
 * @param {string} baselinePath - Absolute path to the authoritative file.
 * @returns {{stale: boolean, artifactExists: boolean, baselineExists: boolean,
 *           artifactMtime: Date|null, baselineMtime: Date|null, reason: string}}
 *
 * Semantics:
 *   - If artifact missing: stale=false (caller decides whether absence is a problem)
 *   - If baseline missing: stale=false (nothing to compare against; not authoritative yet)
 *   - If artifact.mtime < baseline.mtime: stale=true, reason names the gap
 *   - Otherwise: stale=false
 */
function checkArtifactStaleness(artifactPath, baselinePath) {
  const result = {
    stale: false,
    artifactExists: false,
    baselineExists: false,
    artifactMtime: null,
    baselineMtime: null,
    reason: '',
  };

  try {
    const artifactStat = fs.statSync(artifactPath);
    result.artifactExists = true;
    result.artifactMtime = artifactStat.mtime;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    result.reason = 'artifact missing';
    return result;
  }

  try {
    const baselineStat = fs.statSync(baselinePath);
    result.baselineExists = true;
    result.baselineMtime = baselineStat.mtime;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    result.reason = 'baseline missing (nothing to compare against)';
    return result;
  }

  if (result.artifactMtime.getTime() < result.baselineMtime.getTime()) {
    result.stale = true;
    const lag = Math.round((result.baselineMtime.getTime() - result.artifactMtime.getTime()) / 1000);
    result.reason = 'artifact built ' + lag + 's BEFORE baseline';
  }

  return result;
}

module.exports = { checkArtifactStaleness };
