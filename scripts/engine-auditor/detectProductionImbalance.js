/**
 * detectProductionImbalance — domain-level event generation skew. One domain
 * at many events while another is at zero. Crime/metric moves without a
 * driving event. Migration without economic cause.
 */

const VERSION = '1.0.0';

function num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function detect(ctx) {
  const { cycle, snapshot } = ctx;
  const events = snapshot.WorldEvents_V3_Ledger || [];
  const thisCycle = events.filter(e => parseInt(e.Cycle, 10) === cycle);

  const byDomain = {};
  for (const e of thisCycle) {
    const d = (e.Domain || 'unknown').toLowerCase();
    byDomain[d] = (byDomain[d] || 0) + 1;
  }

  const entries = Object.entries(byDomain);
  const out = [];

  if (entries.length >= 2) {
    const counts = entries.map(([, n]) => n);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    if (max >= 10 && (min === 0 || max / Math.max(min, 1) >= 8)) {
      const topDomain = entries.find(([, n]) => n === max)[0];
      const lowDomains = entries.filter(([, n]) => n <= 1).map(([d]) => d);
      out.push({
        type: 'production-imbalance',
        severity: max >= 20 ? 'high' : 'medium',
        cyclesInState: 0,
        affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
        evidence: {
          sheet: 'WorldEvents_V3_Ledger',
          rows: [],
          fields: {
            topDomain,
            topDomainCount: max,
            lowDomains,
            ratio: (max / Math.max(min, 1)).toFixed(1),
          },
        },
        description: `Domain "${topDomain}" generated ${max} events while [${lowDomains.join(', ') || 'others'}] generated ≤1`,
        detectorVersion: VERSION,
      });
    }
  }

  // Migration without economic driver: Neighborhood_Map.MigrationFlow significant but
  // no events in economic domain this cycle
  const nbhd = snapshot.Neighborhood_Map || [];
  const economicEvents = thisCycle.filter(e => /econom/i.test(e.Domain || '') || String(e.EconomicFlag).toLowerCase() === 'true');
  if (economicEvents.length === 0) {
    const migrating = nbhd.filter(n => {
      const v = num(n.MigrationFlow);
      return v != null && Math.abs(v) >= 0.3;
    });
    if (migrating.length >= 3) {
      out.push({
        type: 'production-imbalance',
        severity: 'medium',
        cyclesInState: 0,
        affectedEntities: { citizens: [], neighborhoods: migrating.map(n => n.Neighborhood), initiatives: [], councilSeats: [] },
        evidence: {
          sheet: 'Neighborhood_Map',
          rows: [],
          fields: {
            migratingCount: migrating.length,
            economicEventsThisCycle: 0,
            subCheck: 'migration-without-economic-cause',
          },
        },
        description: `${migrating.length} neighborhoods report migration flow with zero economic events this cycle`,
        detectorVersion: VERSION,
      });
    }
  }

  return out;
}

module.exports = { detect, version: VERSION };
