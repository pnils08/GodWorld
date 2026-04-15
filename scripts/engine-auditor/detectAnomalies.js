/**
 * detectAnomalies (Phase 38.7) — sudden unexplained changes in a single cycle.
 * Separate from ailments (persistent states) — anomalies need triage, not
 * editorial framing. Source: Nieman Reports stock-split fixture (§11).
 *
 * Checks:
 *   - citizen income Δ > 50% (from prior audit's citizenIncomes map)
 *   - crime metric > 3σ from rolling mean (needs ≥3 prior audit snapshots)
 *   - council approval Δ > 20pts
 *   - neighborhood migration shift > 30pts (proxy for population shift —
 *     Neighborhood_Map has no Population column)
 *
 * Emits type: 'anomaly' patterns with historicalContext, triagePath, confidence.
 */

const VERSION = '1.0.0';

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function detect(ctx) {
  const { cycle, snapshot, prior } = ctx;
  const out = [];

  // --- Income spike/drop ---
  const ledger = snapshot.Simulation_Ledger || [];
  const currentIncomes = {};
  for (const r of ledger) {
    const id = r.POPID;
    const inc = num(r.Income);
    if (id && inc != null && inc > 0) currentIncomes[id] = inc;
  }

  const priorAudit = prior.find(p => p.cycle === cycle - 1);
  const priorIncomes = priorAudit && priorAudit.citizenIncomes;
  if (priorIncomes) {
    for (const [id, curr] of Object.entries(currentIncomes)) {
      const prev = priorIncomes[id];
      if (prev == null || prev === 0) continue;
      const ratio = curr / prev;
      if (ratio <= 0.5 || ratio >= 2.0) {
        const history = prior
          .slice(0, 6)
          .map(p => (p.citizenIncomes || {})[id])
          .filter(v => v != null);

        // Confidence: if other citizens in same neighborhood also moved
        // proportionally, real; otherwise data error.
        const nbhdRow = ledger.find(r => r.POPID === id);
        const nbhd = nbhdRow && nbhdRow.Neighborhood;
        const peers = ledger.filter(r => r.Neighborhood === nbhd && r.POPID !== id);
        const peerMoved = peers.filter(p => {
          const pPrev = priorIncomes[p.POPID];
          const pCurr = num(p.Income);
          if (!pPrev || !pCurr) return false;
          const pRatio = pCurr / pPrev;
          return pRatio <= 0.6 || pRatio >= 1.8;
        }).length;
        const peerShare = peers.length ? peerMoved / peers.length : 0;

        let triagePath = 'suppress-until-verified';
        let confidence = 'medium';
        if (peerShare >= 0.3) {
          triagePath = 'cover-as-story';
          confidence = 'high';
        } else if (peerShare < 0.05) {
          triagePath = 'route-to-engine-debug';
          confidence = 'high';
        }

        out.push({
          type: 'anomaly',
          severity: ratio <= 0.3 || ratio >= 3.0 ? 'high' : 'medium',
          cyclesInState: 1,
          affectedEntities: {
            citizens: [id],
            neighborhoods: nbhd ? [nbhd] : [],
            initiatives: [],
            councilSeats: [],
          },
          evidence: {
            sheet: 'Simulation_Ledger',
            rows: [],
            fields: {
              POPID: id,
              previousIncome: prev,
              currentIncome: curr,
              ratio: ratio.toFixed(3),
              peerShare: peerShare.toFixed(2),
              subCheck: 'citizen-income',
            },
          },
          description: `POPID ${id} income Δ ${((ratio - 1) * 100).toFixed(0)}% (${prev} → ${curr}); peer move share ${(peerShare * 100).toFixed(0)}%`,
          historicalContext: { priorCycles: history, currentCycle: curr },
          triagePath,
          confidence,
          detectorVersion: VERSION,
        });
      }
    }
  }

  // --- Approval flip > 20pts ---
  if (priorAudit && priorAudit.snapshots && priorAudit.snapshots.Civic_Office_Ledger) {
    const priorCouncil = new Map(
      priorAudit.snapshots.Civic_Office_Ledger.map(r => [r.OfficeId || r.PopId, r])
    );
    const council = snapshot.Civic_Office_Ledger || [];
    for (let i = 0; i < council.length; i++) {
      const c = council[i];
      const key = c.OfficeId || c.PopId;
      if (!key) continue;
      const prev = priorCouncil.get(key);
      if (!prev) continue;
      const a1 = num(c.Approval), a0 = num(prev.Approval);
      if (a1 == null || a0 == null) continue;
      // Approval is on 0-1 or 0-100 scale depending on store; 20pts = 0.20 or 20
      const scale = Math.abs(a1) > 1.5 || Math.abs(a0) > 1.5 ? 20 : 0.20;
      if (Math.abs(a1 - a0) >= scale) {
        const history = prior
          .slice(0, 6)
          .map(p => (p.snapshots && p.snapshots.Civic_Office_Ledger || [])
            .find(r => (r.OfficeId || r.PopId) === key))
          .filter(Boolean)
          .map(r => num(r.Approval));

        out.push({
          type: 'anomaly',
          severity: 'medium',
          cyclesInState: 1,
          affectedEntities: {
            citizens: [],
            neighborhoods: c.District ? [c.District] : [],
            initiatives: [],
            councilSeats: [key],
          },
          evidence: {
            sheet: 'Civic_Office_Ledger',
            rows: [i + 2],
            fields: {
              OfficeId: c.OfficeId,
              Holder: c.Holder,
              previousApproval: a0,
              currentApproval: a1,
              delta: (a1 - a0).toFixed(3),
              subCheck: 'approval-flip',
            },
          },
          description: `${c.Holder || key} approval flipped ${a0} → ${a1} (Δ ${(a1 - a0).toFixed(2)})`,
          historicalContext: { priorCycles: history, currentCycle: a1 },
          triagePath: 'cover-as-story',
          confidence: 'medium',
          detectorVersion: VERSION,
        });
      }
    }
  }

  // --- Crime metric outlier (3σ from rolling 6-cycle mean) ---
  const crime = snapshot.Crime_Metrics || [];
  for (let i = 0; i < crime.length; i++) {
    const c = crime[i];
    const name = c.Neighborhood;
    if (!name) continue;
    const curr = num(c.ViolentCrimeIndex);
    if (curr == null) continue;
    const history = prior
      .slice(0, 6)
      .map(p => (p.snapshots && p.snapshots.Crime_Metrics || [])
        .find(r => r.Neighborhood === name))
      .filter(Boolean)
      .map(r => num(r.ViolentCrimeIndex))
      .filter(v => v != null);
    if (history.length < 3) continue;
    const m = mean(history);
    const sd = stddev(history);
    if (sd === 0) continue;
    const z = (curr - m) / sd;
    if (Math.abs(z) < 3) continue;

    out.push({
      type: 'anomaly',
      severity: Math.abs(z) >= 4 ? 'high' : 'medium',
      cyclesInState: 1,
      affectedEntities: { citizens: [], neighborhoods: [name], initiatives: [], councilSeats: [] },
      evidence: {
        sheet: 'Crime_Metrics',
        rows: [i + 2],
        fields: {
          Neighborhood: name,
          ViolentCrimeIndex: curr,
          historicalMean: m.toFixed(2),
          stddev: sd.toFixed(2),
          zScore: z.toFixed(2),
          subCheck: 'crime-outlier',
        },
      },
      description: `${name} violent crime ${curr} at ${z.toFixed(1)}σ from ${history.length}-cycle mean ${m.toFixed(2)}`,
      historicalContext: { priorCycles: history, currentCycle: curr },
      triagePath: 'cover-as-story',
      confidence: 'high',
      detectorVersion: VERSION,
    });
  }

  // --- Migration shift > 30pts (population-shift proxy) ---
  if (priorAudit && priorAudit.snapshots && priorAudit.snapshots.Neighborhood_Map) {
    const priorNbhd = new Map(priorAudit.snapshots.Neighborhood_Map.map(r => [r.Neighborhood, r]));
    const nbhd = snapshot.Neighborhood_Map || [];
    for (const n of nbhd) {
      const prev = priorNbhd.get(n.Neighborhood);
      if (!prev) continue;
      const m1 = num(n.MigrationFlow), m0 = num(prev.MigrationFlow);
      if (m1 == null || m0 == null) continue;
      if (Math.abs(m1 - m0) >= 0.3) {
        out.push({
          type: 'anomaly',
          severity: 'medium',
          cyclesInState: 1,
          affectedEntities: { citizens: [], neighborhoods: [n.Neighborhood], initiatives: [], councilSeats: [] },
          evidence: {
            sheet: 'Neighborhood_Map',
            rows: [],
            fields: {
              Neighborhood: n.Neighborhood,
              previousMigrationFlow: m0,
              currentMigrationFlow: m1,
              delta: (m1 - m0).toFixed(2),
              subCheck: 'migration-shift',
            },
          },
          description: `${n.Neighborhood} migration flow shifted ${m0} → ${m1}`,
          historicalContext: { priorCycles: [m0], currentCycle: m1 },
          triagePath: 'suppress-until-verified',
          confidence: 'medium',
          detectorVersion: VERSION,
        });
      }
    }
  }

  return out;
}

module.exports = { detect, version: VERSION };
