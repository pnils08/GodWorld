/**
 * detectIncoherence — logical contradictions. Examples: an initiative marked
 * "Implemented/Completed" in a health/crime domain while the affected
 * neighborhood's corresponding metric worsens; a council seat with high
 * Approval while their district neighborhood shows low sentiment.
 */

const VERSION = '1.0.0';

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

const DOMAIN_METRIC = {
  health: 'Sentiment',
  crime: 'CrimeIndex',
  safety: 'CrimeIndex',
  transit: 'Sentiment',
  housing: 'DisplacementPressure',
  economic: 'RetailVitality',
  retail: 'RetailVitality',
};

function expectedDirection(domain) {
  const d = domain.toLowerCase();
  if (/crime|safety|displacement/.test(d)) return 'down';
  return 'up';
}

function detect(ctx) {
  const { snapshot } = ctx;
  const inits = snapshot.Initiative_Tracker || [];
  const nbhd = snapshot.Neighborhood_Map || [];
  const council = snapshot.Civic_Office_Ledger || [];
  const out = [];

  const nbhdByName = new Map();
  for (const n of nbhd) if (n.Neighborhood) nbhdByName.set(n.Neighborhood, n);

  // Implemented initiative vs contradicting metric
  for (let i = 0; i < inits.length; i++) {
    const init = inits[i];
    const phase = (init.ImplementationPhase || '').toLowerCase();
    if (!/implement|complet|operational|active/.test(phase)) continue;

    const domain = (init.PolicyDomain || '').toLowerCase();
    const metricKey = Object.keys(DOMAIN_METRIC).find(k => domain.includes(k));
    if (!metricKey) continue;
    const metric = DOMAIN_METRIC[metricKey];
    const dir = expectedDirection(metricKey);

    const affected = (init.AffectedNeighborhoods || '')
      .split(/[,;]/).map(s => s.trim()).filter(Boolean);

    const contradicting = [];
    for (const name of affected) {
      const n = nbhdByName.get(name);
      if (!n) continue;
      const v = num(n[metric]);
      if (v == null) continue;
      if (dir === 'up' && v < 0.35) contradicting.push({ name, metric, value: v });
      if (dir === 'down' && v > 0.65) contradicting.push({ name, metric, value: v });
    }

    if (contradicting.length === 0) continue;

    out.push({
      type: 'incoherence',
      severity: contradicting.length >= 2 ? 'high' : 'medium',
      cyclesInState: 0,
      affectedEntities: {
        citizens: [],
        neighborhoods: contradicting.map(c => c.name),
        initiatives: [init.InitiativeID || init.Name].filter(Boolean),
        councilSeats: [],
      },
      evidence: {
        sheet: 'Initiative_Tracker',
        rows: [i + 2],
        fields: {
          InitiativeID: init.InitiativeID,
          Name: init.Name,
          ImplementationPhase: init.ImplementationPhase,
          PolicyDomain: init.PolicyDomain,
          contradicting,
          expected: `${metric} ${dir}`,
        },
      },
      description: `Initiative "${init.Name || init.InitiativeID}" (${phase}, ${domain}) but ${contradicting.length} affected neighborhoods show contradicting ${metric}`,
      detectorVersion: VERSION,
    });
  }

  // High approval despite low district sentiment
  for (let i = 0; i < council.length; i++) {
    const c = council[i];
    const approval = num(c.Approval);
    const district = c.District;
    if (approval == null || !district) continue;
    const n = nbhdByName.get(district);
    if (!n) continue;
    const s = num(n.Sentiment);
    if (s == null) continue;
    if (approval >= 0.7 && s <= 0.35) {
      out.push({
        type: 'incoherence',
        severity: 'low',
        cyclesInState: 0,
        affectedEntities: {
          citizens: [],
          neighborhoods: [district],
          initiatives: [],
          councilSeats: [c.OfficeId || c.PopId].filter(Boolean),
        },
        evidence: {
          sheet: 'Civic_Office_Ledger',
          rows: [i + 2],
          fields: {
            OfficeId: c.OfficeId,
            Holder: c.Holder,
            District: district,
            Approval: approval,
            DistrictSentiment: s,
          },
        },
        description: `${c.Holder || c.OfficeId} approval ${approval} while ${district} sentiment ${s}`,
        detectorVersion: VERSION,
      });
    }
  }

  return out;
}

module.exports = { detect, version: VERSION };
