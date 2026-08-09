/* bondTargetMatch — engine.101 bond write-back (research 2026-08-03 §Addendum 2).
 *
 * Pure name-match: which of a citizen's bonded counterparts are named in a piece
 * of text (reflection, exchange lines)? Word-boundary, case-insensitive; full
 * name wins, first name (>=3 chars) as fallback — the exact semantics of the
 * engine.48 T4 ripple match, extracted so the Reflection_Intake BondTarget
 * column (col I) and the ripple register share ONE implementation that cannot
 * drift apart.
 *
 * bondPairs: [{ name, pop }] as returned by lib/wakePerception.loadBonds().
 * Returns: matching bond entries in bondPairs order ([] when none). Caller
 * decides first-hit vs all-hits (intake BondTarget = first; ripple = all).
 */
function escapeRe_(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function matchBondTargets_(text, bondPairs) {
  const out = [];
  const t = String(text || '');
  if (!t || !Array.isArray(bondPairs)) return out;
  for (const bp of bondPairs) {
    if (!bp || !bp.name || !bp.pop) continue;
    const first = String(bp.name).split(/\s+/)[0];
    const hitFull = new RegExp(`\\b${escapeRe_(bp.name)}\\b`, 'i').test(t);
    const hitFirst = first.length >= 3 && new RegExp(`\\b${escapeRe_(first)}\\b`, 'i').test(t);
    if (hitFull || hitFirst) out.push(bp);
  }
  return out;
}

module.exports = { matchBondTargets_ };
