/**
 * lib/neighborhoodSlice.js — shared neighborhood-scoped positioning slice.
 *
 * One accurate source for BOTH the baseline-brief path
 * (scripts/engine-auditor/generateBaselineBriefs.js) and the voice-workspace
 * path (scripts/buildVoiceWorkspaces.js), so the two can't drift apart again.
 *
 * Bounded by design: the K most-notable residents (lower tier number first) +
 * the neighborhood's current metrics + cycle-over-cycle deltas. Never a dump —
 * this positions a voice on the TRUE state of its corner of the city (accuracy)
 * without burning tokens on the whole ledger (economy).
 *
 * Surfaces displacement pressure and median income explicitly so a voice cannot
 * invent struggle the engine never reported (the C95 West Oakland failure mode).
 */

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * @param {object} opts
 * @param {Array}  opts.ledger               Simulation_Ledger rows (objects)
 * @param {Array}  opts.neighborhoodMap      Neighborhood_Map rows, current cycle
 * @param {Array}  opts.priorNeighborhoodMap Neighborhood_Map rows, prior cycle (for deltas)
 * @param {number} opts.residentCap          max residents per slice (default 4)
 */
function createSlicer({ ledger = [], neighborhoodMap = [], priorNeighborhoodMap = [], residentCap = 4 } = {}) {
  const residentsByHood = {};
  for (const r of ledger) {
    const hood = r.Neighborhood;
    const name = `${r.First || ''} ${r.Last || ''}`.replace(/\s+/g, ' ').trim();
    if (!hood || !name) continue;
    (residentsByHood[hood] = residentsByHood[hood] || []).push({
      name, popId: r.POPID || '', tier: r.Tier || '', occupation: r.RoleType || '',
    });
  }

  const metricsByHood = {};
  for (const m of neighborhoodMap) if (m.Neighborhood) metricsByHood[m.Neighborhood] = m;
  const priorByHood = {};
  for (const m of priorNeighborhoodMap) if (m.Neighborhood) priorByHood[m.Neighborhood] = m;

  const cell = (cur, prev) => {
    const c = num(cur);
    if (c == null) return undefined;
    const p = num(prev);
    return p == null ? { value: c } : { value: c, delta: +(c - p).toFixed(2) };
  };

  function slice(nbhd) {
    if (!nbhd) return null;
    const residents = (residentsByHood[nbhd] || []).slice()
      .sort((a, b) => (parseInt(a.tier, 10) || 9) - (parseInt(b.tier, 10) || 9))
      .slice(0, residentCap);
    const m = metricsByHood[nbhd];
    const pm = priorByHood[nbhd];
    const state = m ? {
      crimeIndex: cell(m.CrimeIndex, pm && pm.CrimeIndex),
      retailVitality: cell(m.RetailVitality, pm && pm.RetailVitality),
      eventAttractiveness: cell(m.EventAttractiveness, pm && pm.EventAttractiveness),
      sentiment: cell(m.Sentiment, pm && pm.Sentiment),
      medianIncome: num(m.MedianIncome),
      medianRent: num(m.MedianRent),
      displacementPressure: String(m.DisplacementPressure || '').trim() || 'none',
      gentrificationPhase: String(m.GentrificationPhase || '').trim() || 'none',
    } : null;
    return { neighborhood: nbhd, residents, state };
  }

  // One-line accuracy handle a voice reads — moved metrics + displacement/income
  // facts explicit so nothing gets invented against them.
  function describe(nbhd, s) {
    s = s || slice(nbhd);
    if (!s || !s.state) return nbhd ? `set in ${nbhd}` : 'no neighborhood attached';
    const st = s.state;
    const parts = [];
    const mv = (label, c) => {
      if (!c) return;
      parts.push(c.delta != null && Math.abs(c.delta) >= 0.01
        ? `${label} ${c.value} (${c.delta > 0 ? '+' : ''}${c.delta})`
        : `${label} ${c.value}`);
    };
    mv('crime', st.crimeIndex);
    mv('retail', st.retailVitality);
    mv('sentiment', st.sentiment);
    if (st.medianIncome != null) parts.push(`median income $${st.medianIncome.toLocaleString()}`);
    parts.push(`displacement pressure: ${st.displacementPressure}`);
    const who = s.residents.length
      ? ` | residents: ${s.residents.map(r => `${r.name} (${r.occupation || 'resident'})`).join(', ')}`
      : '';
    return `${nbhd}: ${parts.join(', ')}${who}`;
  }

  function allNeighborhoods() {
    return Object.keys(metricsByHood);
  }

  return { slice, describe, allNeighborhoods };
}

module.exports = { createSlicer };
