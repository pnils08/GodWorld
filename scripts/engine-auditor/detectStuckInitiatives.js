/**
 * detectStuckInitiatives — Initiative_Tracker rows whose ImplementationPhase
 * hasn't changed for 3+ cycles. Derives cyclesInState from prior audit JSONs;
 * falls back to LastUpdated delta vs current cycle when no prior audits exist.
 */

const VERSION = '1.0.0';
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
    for (const p of prior) {
      const prev = (p.patterns || []).find(x =>
        x.type === 'stuck-initiative' &&
        x.affectedEntities && x.affectedEntities.initiatives &&
        x.affectedEntities.initiatives.includes(id)
      );
      if (prev) { cyclesInState = (prev.cyclesInState || 0) + 1; break; }
      const priorRow = (p.snapshots && p.snapshots.Initiative_Tracker || [])
        .find(r => (r.InitiativeID || r.Name) === id);
      if (priorRow && priorRow.ImplementationPhase === phase) {
        cyclesInState = (cyclesInState || 0) + 1;
      }
    }

    if (cyclesInState == null) {
      const lastCycle = parseCycleHint(row.LastUpdated) || parseCycleHint(row.NextActionCycle);
      if (lastCycle != null && lastCycle <= cycle) {
        cyclesInState = cycle - lastCycle;
      } else {
        cyclesInState = 0;
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
