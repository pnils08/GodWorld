/**
 * detectMathImbalances — three sub-checks:
 *   (a) decay-without-offset: a neighborhood metric WORSENING cycle-over-cycle
 *       (Sentiment dropping, RetailVitality dropping, CrimeIndex rising,
 *       HousingPressure rising) with no matching initiative active in
 *       that neighborhood. Severity scales with whether any policy mitigator
 *       is active per-neighborhood.
 *   (b) production-without-consumption: WorldEvents_V3_Ledger events in a
 *       domain with zero Edition_Coverage_Ratings rows for that domain. Emits
 *       type='coverage-gap' (NOT math-imbalance — this is an editorial
 *       coverage signal, not an engine calculation imbalance).
 *   (c) growth-without-pressure: all tracked neighborhood metrics positive
 *       (Sentiment>0.5, RetailVitality>0.5, CrimeIndex<0.5).
 *
 * Version history:
 *   1.0.0  initial — absolute-threshold decay check (Sentiment<0.4, CrimeIndex>0.6).
 *          Bug: those thresholds treat sheet values as normalized 0-1, but
 *          actual sheet stores Sentiment as ±0.X delta-scale and CrimeIndex
 *          as integer crime counts. Every neighborhood matched both gates
 *          trivially. The "with N domains advancing" rider listed global
 *          advancing initiatives, NOT per-neighborhood matches.
 *   1.1.0  S216 engine.14 — decay subcheck switched to delta-from-prior-snapshot
 *          detection (requires prior audit). Per-neighborhood initiative
 *          matching for the offset rider. production-without-consumption
 *          subcheck retyped from 'math-imbalance' to 'coverage-gap'.
 *   1.2.0  S226 engine.19 G-EC22/G-EC23 — decay patterns gain a structured
 *          `mitigatorState` field with values 'no-mitigator-needs-new-initiative'
 *          | 'mitigator-firing' | 'no-mitigator-minor'. Replaces downstream
 *          having to parse the description string to differentiate. C94
 *          Chinatown + Glenview decay traced cleanly to this missing semantic:
 *          both flagged "no matching initiative" but city-hall-prep routed
 *          them to Mayor + Okoro Economic Development portfolio, which needs
 *          structured data, not free-form text. Field is purely additive —
 *          does not change severity classification or pattern type.
 *   1.3.0  S391 — the standing value now travels with the change. The decay
 *          subcheck emitted deltas only, so downstream read a fall as a level:
 *          the C104 business lead was "Grand Lake retail decay" off
 *          `RetailVitality -5.03`, while Grand Lake actually sat at 8.21 —
 *          4th of 19 neighborhoods — with sentiment +0.48. A drop from a high
 *          perch was published as collapse, and the empty packet let the
 *          writer fill the gap with outside-world decline imagery.
 *          Adds `standing` (current value + citywide rank + city median per
 *          decayed metric) to evidence.fields, and states the level in the
 *          description so it reaches the writer. `decaySignals` keeps its
 *          existing delta-only string format — parsers downstream are
 *          unchanged. Severity and pattern type are untouched.
 */

const VERSION = '1.3.0';

// Decay-direction thresholds. Calibrated from observed C92→C93 deltas:
// typical Sentiment movement ±0.01-0.02, CrimeIndex ±0/+1, RetailVitality
// ±0.5. Thresholds set to flag movement that exceeds typical noise.
const SENTIMENT_DECAY = -0.02;       // Sentiment dropped by more than 0.02
const RETAIL_DECAY = -0.5;           // RetailVitality dropped by more than 0.5
const CRIME_RISE = 2;                // CrimeIndex rose by 2 or more (integer count)
const HOUSING_PRESSURE_RISE = 0.05;      // HousingPressure rose by 0.05 or more

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

// Metrics the decay subcheck can flag, and which direction is healthy.
// Rank 1 always means healthiest in the city, so a rank reads the same way
// for every metric regardless of sign.
const METRIC_DIRECTION = {
  Sentiment: 'higher-is-better',
  RetailVitality: 'higher-is-better',
  CrimeIndex: 'lower-is-better',
  HousingPressure: 'lower-is-better',
};

function median(values) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Citywide standing per metric: every neighborhood's current value, its rank
 * among neighborhoods carrying that metric (1 = healthiest), and the city
 * median. This is the context a delta alone cannot supply — a -5.03 fall from
 * 13.24 to 8.21 still leaves a neighborhood 4th of 19, which is a different
 * story from a collapse.
 */
function buildStandings(nbhd) {
  const standings = {};

  for (const [metric, direction] of Object.entries(METRIC_DIRECTION)) {
    const rows = nbhd
      .map(n => ({ name: n.Neighborhood, value: num(n[metric]) }))
      .filter(r => r.name && r.value !== null);
    if (rows.length === 0) continue;

    rows.sort((a, b) => (direction === 'higher-is-better' ? b.value - a.value : a.value - b.value));

    const byName = new Map();
    rows.forEach((r, idx) => byName.set(r.name, { value: r.value, rank: idx + 1 }));

    standings[metric] = {
      byName,
      total: rows.length,
      median: median(rows.map(r => r.value)),
    };
  }

  return standings;
}

function detect(ctx) {
  const { cycle, snapshot, prior } = ctx;
  const out = [];

  const nbhd = snapshot.Neighborhood_Map || [];
  const inits = snapshot.Initiative_Tracker || [];

  // ───────────────────────────────────────────────────────────────────────────
  // (a) decay-without-offset — delta-from-prior detection
  // ───────────────────────────────────────────────────────────────────────────
  // Find the most recent prior audit; if none, the detector cannot establish
  // a delta and skips this subcheck entirely (rather than fall back to the
  // 1.0.0 absolute-threshold misread).
  const priorAudit = prior.find(p => p.cycle === cycle - 1)
    || (prior.length > 0 ? prior[0] : null);
  const priorNbhdSnap = priorAudit && priorAudit.snapshots
    && priorAudit.snapshots.Neighborhood_Map;

  if (priorNbhdSnap && priorNbhdSnap.length > 0) {
    const priorByName = new Map(priorNbhdSnap.map(r => [r.Neighborhood, r]));

    // Per-neighborhood active-initiative index. Initiative is "matching" if
    // its Status OR ImplementationPhase suggests it's actively running AND its
    // AffectedNeighborhoods list includes this neighborhood. Test both fields
    // independently — real initiatives carry Status='passed' (political
    // lifecycle done) and ImplementationPhase='disbursement-active' (operationally
    // active). v1.0.0 used (Status || ImplementationPhase), which missed any
    // initiative whose Status was set but didn't match the active pattern.
    const ACTIVE_PATTERN = /active|in.?progress|implement/i;
    const activeInits = inits.filter(i =>
      ACTIVE_PATTERN.test(i.ImplementationPhase || '') || ACTIVE_PATTERN.test(i.Status || '')
    );

    const standings = buildStandings(nbhd);

    for (let i = 0; i < nbhd.length; i++) {
      const n = nbhd[i];
      const prev = priorByName.get(n.Neighborhood);
      if (!prev) continue;

      const dSent = (num(n.Sentiment) ?? 0) - (num(prev.Sentiment) ?? 0);
      const dRetail = (num(n.RetailVitality) ?? 0) - (num(prev.RetailVitality) ?? 0);
      const dCrime = (num(n.CrimeIndex) ?? 0) - (num(prev.CrimeIndex) ?? 0);
      const dDisp = (num(n.HousingPressure) ?? 0) - (num(prev.HousingPressure) ?? 0);

      const decaySignals = [];
      const decayedMetrics = [];
      if (dSent <= SENTIMENT_DECAY) {
        decaySignals.push(`Sentiment ${dSent.toFixed(3)}`);
        decayedMetrics.push('Sentiment');
      }
      if (dRetail <= RETAIL_DECAY) {
        decaySignals.push(`RetailVitality ${dRetail.toFixed(2)}`);
        decayedMetrics.push('RetailVitality');
      }
      if (dCrime >= CRIME_RISE) {
        decaySignals.push(`CrimeIndex +${dCrime}`);
        decayedMetrics.push('CrimeIndex');
      }
      if (dDisp >= HOUSING_PRESSURE_RISE) {
        decaySignals.push(`HousingPressure +${dDisp.toFixed(3)}`);
        decayedMetrics.push('HousingPressure');
      }

      if (decaySignals.length < 2) continue;

      // v1.3.0: the level the fall landed on, per decayed metric, plus the
      // neighborhood's overall sentiment standing. Without this the delta is
      // the only number downstream sees and a dip reads as a floor.
      const standing = {};
      for (const metric of decayedMetrics) {
        const s = standings[metric];
        const entry = s && s.byName.get(n.Neighborhood);
        if (!entry) continue;
        standing[metric] = {
          current: entry.value,
          rank: entry.rank,
          of: s.total,
          cityMedian: s.median,
        };
      }
      const sentimentStanding = standings.Sentiment
        && standings.Sentiment.byName.get(n.Neighborhood);
      if (sentimentStanding && !standing.Sentiment) {
        standing.Sentiment = {
          current: sentimentStanding.value,
          rank: sentimentStanding.rank,
          of: standings.Sentiment.total,
          cityMedian: standings.Sentiment.median,
        };
      }

      const standingPhrases = Object.entries(standing).map(
        ([metric, v]) => `${metric} now ${v.current} (${v.rank} of ${v.of}, city median ${v.cityMedian})`
      );
      // A neighborhood absent from Neighborhood_Map for every decayed metric
      // yields no phrases; the description must not grow empty separators.
      const standingText = standingPhrases.length ? ` — ${standingPhrases.join('; ')} — ` : ' ';

      // Per-neighborhood initiative match (what the 1.0.0 rider claimed but
      // never actually computed). Initiative offsets if AffectedNeighborhoods
      // includes this neighborhood name.
      const matchingInits = activeInits
        .filter(init => {
          const list = (init.AffectedNeighborhoods || '')
            .split(/[,;]/).map(s => s.trim());
          return list.includes(n.Neighborhood);
        })
        .map(init => init.InitiativeID || init.Name);

      // Severity scales with whether any active initiative affects this
      // neighborhood. Decay-without-offset (no matching initiative) is the
      // load-bearing signal; decay-with-mitigator-but-still-decaying is
      // worth surfacing but lower severity.
      let severity;
      let mitigatorState;
      if (matchingInits.length === 0) {
        severity = decaySignals.length >= 3 ? 'high' : 'medium';
        // v1.2.0 (G-EC22/G-EC23): differentiate decay-bands. Multi-signal
        // unmitigated decay → 'needs-new-initiative' (city-hall routes to
        // Mayor/Econ-Dev portfolio); 2-signal unmitigated decay → 'minor'
        // (advisory only, may still be noise from background drift).
        mitigatorState = decaySignals.length >= 3
          ? 'no-mitigator-needs-new-initiative'
          : 'no-mitigator-minor';
      } else {
        severity = 'low';
        mitigatorState = 'mitigator-firing';
      }

      out.push({
        type: 'math-imbalance',
        severity,
        cyclesInState: 0,
        affectedEntities: {
          citizens: [],
          neighborhoods: [n.Neighborhood].filter(Boolean),
          initiatives: matchingInits,
          councilSeats: [],
        },
        evidence: {
          sheet: 'Neighborhood_Map',
          rows: [i + 2],
          fields: {
            Neighborhood: n.Neighborhood,
            decaySignals,
            standing,
            matchingActiveInitiatives: matchingInits,
            mitigatorState,
            priorCycle: priorAudit.cycle,
          },
        },
        description: matchingInits.length === 0
          ? `${n.Neighborhood}: decay [${decaySignals.join(', ')}]${standingText}with no matching active initiative`
          : `${n.Neighborhood}: decay [${decaySignals.join(', ')}]${standingText}despite ${matchingInits.length} active mitigator(s) [${matchingInits.join(', ')}]`,
        detectorVersion: VERSION,
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // (b) production-without-consumption — coverage gap, NOT math imbalance
  // ───────────────────────────────────────────────────────────────────────────
  // S216 engine.14: this subcheck flags an editorial coverage gap (events in
  // a domain happened but the newsroom didn't rate that domain in coverage).
  // It's a signal for the desk packets / editorial dashboard, not an engine
  // calculation bug. Retyped from 'math-imbalance' to 'coverage-gap' so
  // engineCycleAudit.js classifies it correctly downstream.
  const events = snapshot.WorldEvents_V3_Ledger || [];
  const coverage = snapshot.Edition_Coverage_Ratings || [];
  const thisCycleEvents = events.filter(e => parseInt(e.Cycle, 10) === cycle);
  const lastCycleCoverage = coverage.filter(c => parseInt(c.Cycle, 10) === cycle - 1);

  const eventsByDomain = {};
  for (const e of thisCycleEvents) {
    const d = (e.Domain || '').toLowerCase();
    if (!d) continue;
    eventsByDomain[d] = (eventsByDomain[d] || 0) + 1;
  }
  const coveredDomains = new Set(lastCycleCoverage.map(c => (c.Domain || '').toLowerCase()));

  // G-EC1 (engine.19, S226): routingHint differentiates domains by editorial
  // weight class. High-weight domains (civic, health, sports) warrant a
  // dedicated piece when production-without-consumption fires; low-weight
  // domains (faith, community, weather) typically thread into roundup
  // coverage rather than getting their own piece — flagging them at MED
  // severity every cycle without a structured downstream hint produced
  // recurring noise. C94 G-EC1 traced cleanly to this: faith 5 events × 0
  // coverage repeated every cycle. Hint is purely additive; severity
  // unchanged.
  const HIGH_WEIGHT_DOMAINS = new Set(['civic', 'health', 'sports', 'safety', 'infrastructure']);
  for (const [domain, count] of Object.entries(eventsByDomain)) {
    if (count >= 5 && !coveredDomains.has(domain)) {
      const routingHint = HIGH_WEIGHT_DOMAINS.has(domain)
        ? 'dedicated-piece-warranted'
        : 'roundup-thread-acceptable';
      out.push({
        type: 'coverage-gap',
        severity: count >= 10 ? 'high' : 'medium',
        cyclesInState: 0,
        affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
        evidence: {
          sheet: 'WorldEvents_V3_Ledger',
          rows: [],
          fields: {
            domain,
            eventCount: count,
            priorCycleCoverage: 0,
            subCheck: 'production-without-consumption',
            routingHint,
          },
        },
        description: `Domain "${domain}" produced ${count} events this cycle with zero Tribune coverage last cycle`,
        detectorVersion: VERSION,
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // (c) growth-without-pressure — all neighborhoods reporting positive signals
  // ───────────────────────────────────────────────────────────────────────────
  if (nbhd.length > 0) {
    const allPositive = nbhd.every(n => {
      const s = num(n.Sentiment), r = num(n.RetailVitality), c = num(n.CrimeIndex);
      return (s == null || s >= 0.5) && (r == null || r >= 0.5) && (c == null || c <= 0.5);
    });
    if (allPositive) {
      out.push({
        type: 'math-imbalance',
        severity: 'low',
        cyclesInState: 0,
        affectedEntities: { citizens: [], neighborhoods: nbhd.map(n => n.Neighborhood).filter(Boolean), initiatives: [], councilSeats: [] },
        evidence: {
          sheet: 'Neighborhood_Map',
          rows: [],
          fields: { subCheck: 'growth-without-pressure', neighborhoodCount: nbhd.length },
        },
        description: `All ${nbhd.length} neighborhoods report positive metrics — no corrective pressure in system`,
        detectorVersion: VERSION,
      });
    }
  }

  return out;
}

module.exports = { detect, version: VERSION };
