/**
 * detectImprovements — mirror of stuck/repeating with positive sign. An
 * initiative advanced phase since the last audit, or a neighborhood shows
 * positive sentiment shift with a plausible attributable cause (active
 * initiative in matching domain + events covered).
 *
 * Version history:
 *   1.0.0  initial — phase-advance + sentiment-rise detection.
 *   1.1.0  S226 engine.19 G-RC9 — ingests prior cycle's remedy verdicts
 *          from measureRemedies enrichment. Positive verdicts
 *          ('remedy-firing-as-expected', 'remedy-overshot') emit an
 *          improvement pattern even when phase hasn't advanced — the
 *          remedy is doing its job and that's worth surfacing for sift
 *          and editorial framing. Complementary to engine.20 auditor
 *          reweighting (which downgrades the stuck-by-phase classification
 *          when remedy fires positive); this surfaces the positive signal
 *          independently so reporters can lead with "the intervention is
 *          working" rather than "the intervention is stuck."
 */

const VERSION = '1.2.0';
// 1.2.0 engine.357 (C117 gap log G-EC39b/c): a move into a failing phase
// (lib/initiativePhaseContract intensity < 0: stalled / blocked / suspended /
// defunded) is a 'setback', not an improvement; a remedy measurement two prior
// patterns share (same field, expected, observed) is one improvement, its
// places and initiatives joined.
const { PHASE_INTENSITY } = require('../../lib/initiativePhaseContract');
function failingPhase(phase) {
  const v = PHASE_INTENSITY[String(phase || '').trim()];
  return typeof v === 'number' && v < 0;
}

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
        const setback = failingPhase(curr.ImplementationPhase) && !failingPhase(prev.ImplementationPhase);
        out.push({
          type: setback ? 'setback' : 'improvement',
          severity: setback ? 'medium' : 'low',
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
          description: `Initiative "${curr.Name || curr.InitiativeID}" ${setback ? 'fell back' : 'advanced'}: ${prev.ImplementationPhase} → ${curr.ImplementationPhase}`,
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

  // G-RC9 (engine.19, S226): surface positive remedy-firing signals from
  // the prior cycle's measurement enrichment. measureRemedies tags last
  // cycle's patterns with measurement.verdict ∈
  //   {'remedy-firing-as-expected', 'remedy-firing-insufficient',
  //    'remedy-not-firing', 'remedy-overshot'}.
  // The two positive verdicts ('remedy-firing-as-expected', 'remedy-overshot')
  // are improvement signals — the intervention is doing what it was supposed
  // to do, regardless of whether the parent classifier ('stuck-initiative',
  // 'math-imbalance', etc.) still flags the same entity this cycle.
  if (priorAudit && Array.isArray(priorAudit.patterns)) {
    const byMeasure = new Map();   // engine.357: one measurement -> one pattern
    for (const priorP of priorAudit.patterns) {
      if (!priorP || !priorP.measurement) continue;
      const v = priorP.measurement.verdict;
      if (v !== 'remedy-firing-as-expected' && v !== 'remedy-overshot') continue;
      const observed = priorP.measurement.observed;
      const expected = priorP.measurement.expected;
      const field = priorP.measurement.expectedField;
      if (observed == null || expected == null) continue;
      const sheetName = field && field.indexOf('.') > 0 ? field.split('.')[0] : 'measureRemedies';
      const mKey = [field, expected, observed, v].join('|');
      const seen = byMeasure.get(mKey);
      if (seen) {
        const ae = priorP.affectedEntities || {};
        for (const k of ['citizens', 'neighborhoods', 'initiatives', 'councilSeats']) {
          seen.affectedEntities[k] = Array.from(new Set((seen.affectedEntities[k] || []).concat(ae[k] || [])));
        }
        const had = seen.evidence.fields.priorPatternTypes || [seen.evidence.fields.priorPatternType].filter(Boolean);
        seen.evidence.fields.priorPatternTypes = Array.from(new Set(had.concat(priorP.type ? [priorP.type] : [])));
        continue;
      }
      out.push({
        type: 'improvement',
        severity: 'low',
        cyclesInState: 0,
        // a copy: the join above must not edit the prior audit's own pattern
        affectedEntities: JSON.parse(JSON.stringify(priorP.affectedEntities || {
          citizens: [], neighborhoods: [], initiatives: [], councilSeats: [],
        })),
        evidence: {
          sheet: sheetName,
          rows: [],
          fields: {
            priorVerdict: v,
            priorPatternType: priorP.type || null,
            priorRemedyType: priorP.measurement.priorRemedyType || null,
            expectedField: field || null,
            expected,
            observed,
          },
        },
        description: `Remedy ${v === 'remedy-overshot' ? 'overshot expectation' : 'fired as expected'} on ${field || 'measurement'}: observed ${observed} (expected ${expected})${priorP.type ? ` — from prior "${priorP.type}"` : ''}`,
        detectorVersion: VERSION,
      });
      byMeasure.set(mKey, out[out.length - 1]);
    }
  }

  return out;
}

module.exports = { detect, version: VERSION };
