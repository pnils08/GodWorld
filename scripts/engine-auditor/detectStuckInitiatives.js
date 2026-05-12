/**
 * detectStuckInitiatives — Initiative_Tracker rows whose ImplementationPhase
 * hasn't changed for 3+ cycles. Computes cyclesInState by walking prior audit
 * snapshots; uses VoteCycle as a ceiling estimate when snapshot history is
 * shallow.
 *
 * Version history:
 *   1.0.0  initial — carry-forward from prev pattern (cached count + 1)
 *   1.1.0  S216 civic.7 — break snapshot walk on phase mismatch (fix
 *          phase-just-advanced false positive INIT-005 → 13 cycles stuck)
 *   1.2.0  S216 engine.12 — drop carry-forward entirely; always walk snapshots
 *          fresh + vote-cycle ceiling for unverifiable stable-phase cases (fix
 *          carry-forward poisoning INIT-001/002/006 → 89 cycles stuck where
 *          older bad seed values from since-deleted audits kept incrementing
 *          monotonically each cycle)
 *
 * cyclesInState semantics: best available evidence that an initiative has been
 * stuck in its current ImplementationPhase. The number reflects retained audit
 * history depth — when only N priors exist on disk, the snapshot walk caps at N.
 * For initiatives whose retained priors all show the current phase (no
 * transition observable), VoteCycle gives a defensible upper bound (the
 * initiative cannot have been in any phase longer than time since vote).
 *
 * False-positive bias chosen deliberately: an audit signal surfacing potential
 * issues for review should err toward over-flagging stable-phase initiatives
 * vs missing them. Vote-cycle ceiling over-reports when the initiative passed
 * through other phases first; snapshot walk under-reports when audit history
 * is shallow. max() of the two preserves the stuck classification.
 */

const VERSION = '1.2.0';
const STUCK_THRESHOLD = 3;

function parseCycleHint(val) {
  if (val == null || val === '') return null;
  const s = String(val);
  const m = s.match(/C?(\d+)/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function computeCyclesInState(row, ctx) {
  const { cycle, prior } = ctx;
  const id = row.InitiativeID || row.Name;
  const phase = row.ImplementationPhase || '';

  let snapshotCount = 0;
  let everSeenInPriors = false;
  let hitPhaseTransition = false;

  for (const p of prior) {
    const priorRow = (p.snapshots && p.snapshots.Initiative_Tracker || [])
      .find(r => (r.InitiativeID || r.Name) === id);
    if (!priorRow) continue;
    everSeenInPriors = true;
    if (priorRow.ImplementationPhase === phase) {
      snapshotCount++;
    } else {
      // Phase transition observed in the retained audit window — initiative
      // was in a different phase before this cycle. Snapshot count is
      // authoritative; do not extend with vote-cycle ceiling.
      hitPhaseTransition = true;
      break;
    }
  }

  if (hitPhaseTransition) {
    return snapshotCount;
  }

  const voteCycle = parseCycleHint(row.VoteCycle);
  const sinceVote = (voteCycle != null && voteCycle <= cycle)
    ? cycle - voteCycle
    : 0;

  if (everSeenInPriors) {
    // All retained priors show current phase but no transition was observed
    // (audit history shallower than the actual phase tenure). Use vote-cycle
    // as ceiling — initiative cannot have been in current phase longer than
    // time since vote. Floor at snapshot count to honor what we directly
    // observed.
    return Math.max(snapshotCount, sinceVote);
  }

  // True cold-start: initiative absent from every retained prior audit. No
  // direct evidence. VoteCycle is the only proxy. LastUpdated is a date-string
  // timestamp ("4/21/2026"), NOT a cycle — do not parseCycleHint it. Likewise
  // NextActionCycle is forward-looking and rejected by the <= cycle guard.
  return sinceVote;
}

function detect(ctx) {
  const { snapshot } = ctx;
  const rows = snapshot.Initiative_Tracker || [];
  const out = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = row.InitiativeID || row.Name;
    if (!id) continue;
    const phase = row.ImplementationPhase || '';
    const status = row.Status || '';

    const activeLike = /active|in.?progress|pending|stalled/i.test(status);
    if (!activeLike && !phase) continue;

    const cyclesInState = computeCyclesInState(row, ctx);
    if (cyclesInState < STUCK_THRESHOLD) continue;

    const neighborhoods = (row.AffectedNeighborhoods || '')
      .split(/[,;]/).map(s => s.trim()).filter(Boolean);

    let severity = 'low';
    if (cyclesInState >= 6) severity = 'high';
    else if (cyclesInState >= 4) severity = 'medium';

    out.push({
      type: 'stuck-initiative',
      severity,
      cyclesInState,
      affectedEntities: {
        citizens: [],
        neighborhoods,
        initiatives: [id],
        councilSeats: [],
      },
      evidence: {
        sheet: 'Initiative_Tracker',
        rows: [i + 2],
        fields: {
          InitiativeID: id,
          Name: row.Name,
          Status: status,
          ImplementationPhase: phase,
          LastUpdated: row.LastUpdated,
          PolicyDomain: row.PolicyDomain,
        },
      },
      description: `Initiative "${row.Name || id}" in phase "${phase || 'none'}" for ${cyclesInState} cycles`,
      detectorVersion: VERSION,
    });
  }

  return out;
}

module.exports = { detect, version: VERSION, computeCyclesInState };
