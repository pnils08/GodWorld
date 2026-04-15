/**
 * detectWritebackDrift — Edition_Coverage_Ratings exist for last cycle but
 * neighborhood/council sentiment didn't shift. The feedback loop is wired but
 * not firing.
 */

const VERSION = '1.0.0';

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function detect(ctx) {
  const { cycle, snapshot, prior } = ctx;
  const coverage = snapshot.Edition_Coverage_Ratings || [];
  const nbhd = snapshot.Neighborhood_Map || [];
  const council = snapshot.Civic_Office_Ledger || [];

  const lastCovered = coverage.filter(c => parseInt(c.Cycle, 10) === cycle - 1);
  if (lastCovered.length === 0) return [];

  const priorAudit = prior.find(p => p.cycle === cycle - 1);
  const priorNbhdSnap = priorAudit && priorAudit.snapshots && priorAudit.snapshots.Neighborhood_Map;
  const priorCouncil = priorAudit && priorAudit.snapshots && priorAudit.snapshots.Civic_Office_Ledger;

  const out = [];

  if (priorNbhdSnap && priorNbhdSnap.length > 0) {
    const priorByName = new Map(priorNbhdSnap.map(r => [r.Neighborhood, r]));
    const flat = [];
    for (const n of nbhd) {
      const prev = priorByName.get(n.Neighborhood);
      if (!prev) continue;
      const s1 = num(n.Sentiment), s0 = num(prev.Sentiment);
      if (s1 != null && s0 != null && Math.abs(s1 - s0) < 0.01) flat.push(n.Neighborhood);
    }
    if (flat.length >= Math.max(8, nbhd.length * 0.7)) {
      out.push({
        type: 'writeback-drift',
        severity: 'high',
        cyclesInState: 1,
        affectedEntities: { citizens: [], neighborhoods: flat, initiatives: [], councilSeats: [] },
        evidence: {
          sheet: 'Neighborhood_Map',
          rows: [],
          fields: {
            coveredDomainsLastCycle: lastCovered.map(c => c.Domain),
            flatNeighborhoods: flat.length,
            totalNeighborhoods: nbhd.length,
          },
        },
        description: `${lastCovered.length} coverage ratings applied last cycle but ${flat.length}/${nbhd.length} neighborhoods show no sentiment delta`,
        detectorVersion: VERSION,
      });
    }
  }

  if (priorCouncil && priorCouncil.length > 0) {
    const priorById = new Map(priorCouncil.map(r => [r.OfficeId || r.PopId, r]));
    const flat = [];
    for (const c of council) {
      const key = c.OfficeId || c.PopId;
      if (!key) continue;
      const prev = priorById.get(key);
      if (!prev) continue;
      const a1 = num(c.Approval), a0 = num(prev.Approval);
      if (a1 != null && a0 != null && a1 === a0) flat.push(key);
    }
    if (flat.length >= 7) {
      out.push({
        type: 'writeback-drift',
        severity: 'medium',
        cyclesInState: 1,
        affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: flat },
        evidence: {
          sheet: 'Civic_Office_Ledger',
          rows: [],
          fields: { flatApprovalCount: flat.length },
        },
        description: `${flat.length} council approvals unchanged from last cycle despite edition coverage`,
        detectorVersion: VERSION,
      });
    }
  }

  return out;
}

module.exports = { detect, version: VERSION };
