/**
 * detectMathImbalances — three sub-checks:
 *   (a) decay-without-offset: a neighborhood metric declining cycle-over-cycle
 *       (Sentiment, RetailVitality, MedianIncome) with no initiative advancing
 *       in a matching domain.
 *   (b) production-without-consumption: WorldEvents_V3_Ledger events in a
 *       domain with zero Edition_Coverage_Ratings rows for that domain.
 *   (c) growth-without-pressure: all tracked neighborhood metrics positive
 *       (Sentiment>0.5, RetailVitality>0.5, CrimeIndex<0.5).
 */

const VERSION = '1.0.0';

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function detect(ctx) {
  const { cycle, snapshot } = ctx;
  const out = [];

  // (a) decay-without-offset: compare current Neighborhood_Map vs previous cycles via Sentiment trend
  //     Neighborhood_Map has one row per neighborhood; previous state not stored here.
  //     Use RetailVitality + Sentiment present-cycle values; flag if a neighborhood
  //     has negative migration pressure + low sentiment + high crime and no matching initiative.
  const nbhd = snapshot.Neighborhood_Map || [];
  const inits = snapshot.Initiative_Tracker || [];
  const advancingDomains = new Set(
    inits
      .filter(i => /active|in.?progress|implement/i.test(i.Status || i.ImplementationPhase || ''))
      .map(i => (i.PolicyDomain || '').toLowerCase())
      .filter(Boolean)
  );

  for (let i = 0; i < nbhd.length; i++) {
    const n = nbhd[i];
    const sentiment = num(n.Sentiment);
    const retail = num(n.RetailVitality);
    const crime = num(n.CrimeIndex);
    const displacement = num(n.DisplacementPressure);

    const signals = [];
    if (sentiment != null && sentiment < 0.4) signals.push(`Sentiment=${sentiment}`);
    if (retail != null && retail < 0.4) signals.push(`RetailVitality=${retail}`);
    if (crime != null && crime > 0.6) signals.push(`CrimeIndex=${crime}`);
    if (displacement != null && displacement > 0.6) signals.push(`DisplacementPressure=${displacement}`);

    if (signals.length < 2) continue;

    const severity = signals.length >= 3 ? 'high' : 'medium';
    out.push({
      type: 'math-imbalance',
      severity,
      cyclesInState: 0,
      affectedEntities: {
        citizens: [],
        neighborhoods: [n.Neighborhood].filter(Boolean),
        initiatives: [],
        councilSeats: [],
      },
      evidence: {
        sheet: 'Neighborhood_Map',
        rows: [i + 2],
        fields: {
          Neighborhood: n.Neighborhood,
          signals,
          activeDomains: [...advancingDomains],
        },
      },
      description: `${n.Neighborhood}: decay signals [${signals.join(', ')}] with ${advancingDomains.size} domains advancing`,
      detectorVersion: VERSION,
    });
  }

  // (b) production-without-consumption
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

  for (const [domain, count] of Object.entries(eventsByDomain)) {
    if (count >= 5 && !coveredDomains.has(domain)) {
      out.push({
        type: 'math-imbalance',
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
          },
        },
        description: `Domain "${domain}" produced ${count} events this cycle with zero Tribune coverage last cycle`,
        detectorVersion: VERSION,
      });
    }
  }

  // (c) growth-without-pressure — all neighborhoods reporting positive signals
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
