/**
 * detectCascadeFailures — an initiative is Active with AffectedNeighborhoods
 * listed, but those neighborhoods show no corresponding metric signal this
 * cycle (Sentiment/RetailVitality flat or negative, no matching events).
 */

const VERSION = '1.0.0';

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function detect(ctx) {
  const { cycle, snapshot } = ctx;
  const inits = snapshot.Initiative_Tracker || [];
  const nbhd = snapshot.Neighborhood_Map || [];
  const events = snapshot.WorldEvents_V3_Ledger || [];
  const out = [];

  const nbhdByName = new Map();
  for (const n of nbhd) if (n.Neighborhood) nbhdByName.set(n.Neighborhood, n);

  const thisCycleEventsByNbhd = new Map();
  for (const e of events) {
    if (parseInt(e.Cycle, 10) !== cycle) continue;
    const key = e.Neighborhood || '';
    if (!key) continue;
    thisCycleEventsByNbhd.set(key, (thisCycleEventsByNbhd.get(key) || 0) + 1);
  }

  for (let i = 0; i < inits.length; i++) {
    const init = inits[i];
    const status = (init.Status || '').toLowerCase();
    const phase = (init.ImplementationPhase || '').toLowerCase();
    const active = /active|implement|launched|rollout/.test(status) || /implement|launched|rollout/.test(phase);
    if (!active) continue;

    const affected = (init.AffectedNeighborhoods || '')
      .split(/[,;]/).map(s => s.trim()).filter(Boolean);
    if (affected.length === 0) continue;

    const silent = [];
    for (const name of affected) {
      const n = nbhdByName.get(name);
      if (!n) { silent.push(name); continue; }
      const sentiment = num(n.Sentiment);
      const eventCount = thisCycleEventsByNbhd.get(name) || 0;
      if (eventCount === 0 && (sentiment == null || sentiment < 0.55)) {
        silent.push(name);
      }
    }

    if (silent.length === 0 || silent.length < affected.length / 2) continue;

    out.push({
      type: 'cascade-failure',
      severity: silent.length === affected.length ? 'high' : 'medium',
      cyclesInState: 0,
      affectedEntities: {
        citizens: [],
        neighborhoods: silent,
        initiatives: [init.InitiativeID || init.Name].filter(Boolean),
        councilSeats: [],
      },
      evidence: {
        sheet: 'Initiative_Tracker',
        rows: [i + 2],
        fields: {
          InitiativeID: init.InitiativeID,
          Name: init.Name,
          Status: init.Status,
          ImplementationPhase: init.ImplementationPhase,
          AffectedNeighborhoods: affected,
          silentNeighborhoods: silent,
        },
      },
      description: `Initiative "${init.Name || init.InitiativeID}" active but ${silent.length}/${affected.length} affected neighborhoods show no signal`,
      detectorVersion: VERSION,
    });
  }

  return out;
}

module.exports = { detect, version: VERSION };
