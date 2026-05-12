/**
 * detectStuckInitiatives — Initiative_Tracker rows whose ImplementationPhase
 * hasn't changed for 3+ cycles. Derives cyclesInState from prior audit JSONs;
 * falls back to LastUpdated delta vs current cycle when no prior audits exist.
 */

const VERSION = '1.1.0';
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

function detect(ctx) {
  const { cycle, snapshot, prior } = ctx;
  const rows = snapshot.Initiative_Tracker || [];
  const out = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = row.InitiativeID || row.Name;
    if (!id) continue;
    const phase = row.ImplementationPhase || '';
    const status = row.Status || '';

    let cyclesInState = null;
    let everSeenInPriors = false;
    for (const p of prior) {
      const prev = (p.patterns || []).find(x =>
        x.type === 'stuck-initiative' &&
        x.affectedEntities && x.affectedEntities.initiatives &&
        x.affectedEntities.initiatives.includes(id)
      );
      // S199 fix: only carry-forward the prev count if phase still matches.
      // Without this guard, a phase transition (e.g., INIT-003 vote-scheduled
      // C92 → vote-ready C93) inherits the stale stuck count from the prior
      // phase, reporting "89 cycles in vote-ready" when it just entered.
      const prevPhase = prev && prev.evidence && prev.evidence.fields
        && prev.evidence.fields.ImplementationPhase;
      if (prev && prevPhase === phase) {
        cyclesInState = (prev.cyclesInState || 0) + 1;
        break;
      }
      const priorRow = (p.snapshots && p.snapshots.Initiative_Tracker || [])
        .find(r => (r.InitiativeID || r.Name) === id);
      if (priorRow) {
        everSeenInPriors = true;
        if (priorRow.ImplementationPhase === phase) {
          cyclesInState = (cyclesInState || 0) + 1;
        } else {
          // S216 fix (civic.7): phase changed this cycle. Initiative existed
          // in priors but in a different phase — that proves it just advanced.
          // Stop walking; cyclesInState floors at whatever consecutive matches
          // we found before this point (0 if none).
          cyclesInState = cyclesInState != null ? cyclesInState : 0;
          break;
        }
      }
    }

    if (cyclesInState == null) {
      // S216 fix (civic.7): cold-start fallback only fires when initiative was
      // not found in ANY prior audit snapshot. Previously, walking priors
      // without finding a phase match left cyclesInState=null and triggered
      // the vote-cycle fallback, producing phantom counts (INIT-005 phase just
      // advanced design-phase → design-development-active C93, fallback
      // reported 13 cycles stuck). Now: if we saw it in priors but never in
      // current phase, cyclesInState=0 (just entered current phase).
      if (everSeenInPriors) {
        cyclesInState = 0;
      } else {
        // True cold-start: no prior audit history. LastUpdated is a date-string
        // timestamp ("4/21/2026"), NOT a cycle — do not parseCycleHint it
        // (regex matches the month digit and yields wildly wrong cycle counts).
        // NextActionCycle is forward-looking (deadline), so the <= cycle guard
        // rejects it. VoteCycle records the cycle the initiative was voted on
        // — closest "how long since active" proxy without phase-change history.
        const voteCycle = parseCycleHint(row.VoteCycle);
        if (voteCycle != null && voteCycle <= cycle) {
          cyclesInState = cycle - voteCycle;
        } else {
          cyclesInState = 0;
        }
      }
    }

    const activeLike = /active|in.?progress|pending|stalled/i.test(status);
    if (!activeLike && !phase) continue;
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

module.exports = { detect, version: VERSION };
