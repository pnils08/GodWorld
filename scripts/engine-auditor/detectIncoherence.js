/**
 * detectIncoherence — logical contradictions. Examples: an initiative active
 * in a health/crime domain while the affected neighborhood's corresponding
 * metric worsens; a council seat with high Approval while their district
 * neighborhood shows low sentiment.
 *
 * 2.0.0 (engine-sheet 2026-09-19) — the initiative check reads DIRECTION, not
 * level. 1.0.0 fired on an absolute cut (CrimeIndex > 0.65, Sentiment /
 * RetailVitality < 0.35) with no prior: the C107 city median CrimeIndex is
 * 0.65, so half the city tripped it every cycle whatever the program did, and
 * the RetailVitality cut (3-11 scale) could never fire (SIM_DOCTRINE §15). It
 * flagged OARI "incoherent" at C106 and C107 while West Oakland / East Oakland
 * / Fruitvale CrimeIndex FELL 1.10/1.11/1.00 -> 0.97/0.97/0.89, and the daily
 * news read that as "the city data makes no sense" every morning.
 * Now: an affected hood contradicts when it sits on the wrong side of the
 * city's own median AND moved the wrong way since the prior audit, with the
 * initiative active in both snapshots. No prior snapshot -> no finding (the
 * direction cannot be established). HousingPressure is lower-is-better (1.0.0
 * expected it to rise under a housing initiative). cyclesInState counts the
 * consecutive prior audits that carried the same finding.
 */

const VERSION = '2.0.0';

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
  housing: 'HousingPressure',
  economic: 'RetailVitality',
  retail: 'RetailVitality',
};

// Which way is worse, and the smallest move that counts as movement (each
// column's own step size: sentiment/crime hundredths, retail the math-imbalance
// RETAIL_DECAY, housing pressure its 0.5 step).
const METRIC_WORSE = {
  Sentiment: { worse: 'down', step: 0.05 },
  RetailVitality: { worse: 'down', step: 0.5 },
  CrimeIndex: { worse: 'up', step: 0.05 },
  HousingPressure: { worse: 'up', step: 0.5 },
};

const ACTIVE_PHASE = /implement|complet|operational|active/;

function median(values) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function initiativeKey(init) {
  return init.InitiativeID || init.Name || '';
}

function isActive(init) {
  return !!init && ACTIVE_PHASE.test((init.ImplementationPhase || '').toLowerCase());
}

// Consecutive prior audits (most recent first, as engineAuditor loads them)
// that already carried an incoherence finding for this initiative.
function priorStreak(prior, key) {
  let n = 0;
  for (const audit of prior) {
    const hit = (audit.patterns || []).some(p => p.type === 'incoherence'
      && ((p.affectedEntities && p.affectedEntities.initiatives) || []).includes(key));
    if (!hit) break;
    n++;
  }
  return n;
}

function detect(ctx) {
  const { snapshot, cycle } = ctx;
  const prior = ctx.prior || [];
  const inits = snapshot.Initiative_Tracker || [];
  const nbhd = snapshot.Neighborhood_Map || [];
  const council = snapshot.Civic_Office_Ledger || [];
  const out = [];

  const nbhdByName = new Map();
  for (const n of nbhd) if (n.Neighborhood) nbhdByName.set(n.Neighborhood, n);

  // Direction needs the prior snapshot (same lookup as detectMathImbalances).
  const priorAudit = prior.find(p => p.cycle === cycle - 1) || (prior.length > 0 ? prior[0] : null);
  const priorSnap = (priorAudit && priorAudit.snapshots) || {};
  const priorNbhd = new Map((priorSnap.Neighborhood_Map || []).map(r => [r.Neighborhood, r]));
  const priorInits = new Map((priorSnap.Initiative_Tracker || []).map(r => [initiativeKey(r), r]));

  const medians = {};
  for (const metric of Object.keys(METRIC_WORSE)) {
    const m = median(nbhd.map(n => num(n[metric])).filter(v => v !== null));
    medians[metric] = m === null ? null : Math.round(m * 100) / 100;
  }

  // Active initiative vs an affected hood worse than the city AND worsening
  for (let i = 0; i < inits.length; i++) {
    const init = inits[i];
    if (!isActive(init)) continue;
    const key = initiativeKey(init);
    if (!isActive(priorInits.get(key))) continue;   // one cycle active before judging it

    const domain = (init.PolicyDomain || '').toLowerCase();
    const metricKey = Object.keys(DOMAIN_METRIC).find(k => domain.includes(k));
    if (!metricKey) continue;
    const metric = DOMAIN_METRIC[metricKey];
    const rule = METRIC_WORSE[metric];
    const cityMedian = medians[metric];
    if (cityMedian === null) continue;

    const affected = (init.AffectedNeighborhoods || '')
      .split(/[,;]/).map(s => s.trim()).filter(Boolean);

    const contradicting = [];
    for (const name of affected) {
      const n = nbhdByName.get(name);
      const p = priorNbhd.get(name);
      if (!n || !p) continue;
      const v = num(n[metric]);
      const pv = num(p[metric]);
      if (v == null || pv == null) continue;
      const delta = v - pv;
      const worseThanCity = rule.worse === 'up' ? v > cityMedian : v < cityMedian;
      const worsening = rule.worse === 'up' ? delta >= rule.step : delta <= -rule.step;
      if (worseThanCity && worsening) {
        contradicting.push({ name, metric, value: v, prior: pv, delta: Math.round(delta * 100) / 100, cityMedian });
      }
    }

    if (contradicting.length === 0) continue;

    out.push({
      type: 'incoherence',
      severity: contradicting.length >= 2 ? 'high' : 'medium',
      cyclesInState: priorStreak(prior, key),
      affectedEntities: {
        citizens: [],
        neighborhoods: contradicting.map(c => c.name),
        initiatives: [key].filter(Boolean),
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
          expected: `${metric} ${rule.worse === 'up' ? 'down' : 'up'}`,
          priorCycle: priorAudit.cycle,
        },
      },
      description: `Initiative "${init.Name || key}" (${(init.ImplementationPhase || '').toLowerCase()}, ${domain}) but ${contradicting.length} affected neighborhoods got worse on ${metric} since C${priorAudit.cycle} while already worse than the city median (${cityMedian})`,
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
