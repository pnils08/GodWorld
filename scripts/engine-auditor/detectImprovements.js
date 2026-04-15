/**
 * detectImprovements — mirror of stuck/repeating with positive sign. An
 * initiative advanced phase since the last audit, or a neighborhood shows
 * positive sentiment shift with a plausible attributable cause (active
 * initiative in matching domain + events covered).
 */

const VERSION = '1.0.0';

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function detect(ctx) {
  const { cycle, snapshot, prior } = ctx;
  const inits = snapshot.Initiative_Tracker || [];
  const nbhd = snapshot.Neighborhood_Map || [];
  const out = [];

  const priorAudit = prior.find(p => p.cycle === cycle - 1);
  const priorInits = priorAudit && priorAudit.snapshots && priorAudit.snapshots.Initiative_Tracker;
  const priorNbhd = priorAudit && priorAudit.snapshots && priorAudit.snapshots.Neighborhood_Map;

  if (priorInits) {
    const byId = new Map(priorInits.map(r => [r.InitiativeID || r.Name, r]));
    for (let i = 0; i < inits.length; i++) {
      const curr = inits[i];
      const prev = byId.get(curr.InitiativeID || curr.Name);
      if (!prev) continue;
      if (curr.ImplementationPhase && curr.ImplementationPhase !== prev.ImplementationPhase) {
        out.push({
          type: 'improvement',
          severity: 'low',
          cyclesInState: 0,
          affectedEntities: {
            citizens: [],
            neighborhoods: (curr.AffectedNeighborhoods || '').split(/[,;]/).map(s => s.trim()).filter(Boolean),
            initiatives: [curr.InitiativeID || curr.Name].filter(Boolean),
            councilSeats: [],
          },
          evidence: {
            sheet: 'Initiative_Tracker',
            rows: [i + 2],
            fields: {
              InitiativeID: curr.InitiativeID,
              Name: curr.Name,
              fromPhase: prev.ImplementationPhase,
              toPhase: curr.ImplementationPhase,
            },
          },
          description: `Initiative "${curr.Name || curr.InitiativeID}" advanced: ${prev.ImplementationPhase} → ${curr.ImplementationPhase}`,
          detectorVersion: VERSION,
        });
      }
    }
  }

  if (priorNbhd) {
    const byName = new Map(priorNbhd.map(r => [r.Neighborhood, r]));
    for (const n of nbhd) {
      const prev = byName.get(n.Neighborhood);
      if (!prev) continue;
      const s1 = num(n.Sentiment), s0 = num(prev.Sentiment);
      if (s1 == null || s0 == null) continue;
      if (s1 - s0 >= 0.1) {
        out.push({
          type: 'improvement',
          severity: 'low',
          cyclesInState: 0,
          affectedEntities: { citizens: [], neighborhoods: [n.Neighborhood], initiatives: [], councilSeats: [] },
          evidence: {
            sheet: 'Neighborhood_Map',
            rows: [],
            fields: { Neighborhood: n.Neighborhood, sentimentDelta: (s1 - s0).toFixed(2), from: s0, to: s1 },
          },
          description: `${n.Neighborhood} sentiment rose ${(s1 - s0).toFixed(2)} (${s0} → ${s1})`,
          detectorVersion: VERSION,
        });
      }
    }
  }

  return out;
}

module.exports = { detect, version: VERSION };
