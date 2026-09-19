// Grow a canon-true Crime_Metrics level seed: every hood starts at the city median level,
// then the REAL updateCrimeMetrics code runs N cycles on live C107 demographics + canon
// adjacency/boom, no events, until levels settle. Read-only on live.
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = '/root/GodWorld';
const load = (sb, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
function makeRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const N = Number(process.argv[2] || 150);
(async () => {
  const nm = (await sheets.getSheetAsObjects('Neighborhood_Map')).filter(r => r.Neighborhood);
  const NM = nm.map(r => r.Neighborhood);
  const adj = {}; nm.forEach(r => { adj[r.Neighborhood] = String(r.Adjacent || '').split(',').map(s => s.trim()).filter(Boolean); });
  Object.keys(adj).forEach(h => adj[h].forEach(o => { if (adj[o] && adj[o].indexOf(h) < 0) adj[o].push(h); }));
  const nstate = {}; nm.forEach(r => { nstate[r.Neighborhood] = { boomIndex: Number(r.BoomIndex), incomeTier: Number(r.IncomeTier), crimeIndex: Number(r.CrimeIndex) }; });
  const demoRows = await sheets.getSheetAsObjects('Neighborhood_Demographics');
  const demo = {}; demoRows.forEach(r => { if (r.Neighborhood) demo[r.Neighborhood] = { students: Number(r.Students) || 0, adults: Number(r.Adults) || 0, seniors: Number(r.Seniors) || 0, unemployed: Number(r.Unemployed) || 0 }; });
  const cm = await sheets.getSheetAsObjects('Crime_Metrics');
  const cur = {}; cm.forEach(r => { if (r.Neighborhood) cur[r.Neighborhood] = r; });
  const med = k => { const v = NM.map(h => Number(cur[h] && cur[h][k])).filter(x => isFinite(x)).sort((a, b) => a - b); const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
  const mP = med('PropertyLevel'), mV = med('ViolentLevel'), mQ = med('QolLevel');
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, isFinite, isNaN, safeRand_: (ctx) => ctx.rng };
  vm.createContext(sb); load(sb, 'utilities/ensureCrimeMetrics.js'); load(sb, 'phase03-population/updateCrimeMetrics.js');
  sb.ensureCrimeMetricsSchema_ = () => ({});
  let rows = {};
  NM.forEach(h => { const r = cur[h] || {}; rows[h] = { neighborhood: h, propertyCrimeIndex: mP, violentCrimeIndex: mV, responseTimeAvg: Number(r.ResponseTimeAvg) || 10, clearanceRate: Number(r.ClearanceRate) || 0.3, incidentCount: Number(r.IncidentCount) || 5, lastUpdated: 107, propertyLevel: mP, violentLevel: mV, qolLevel: mQ }; });
  const rng = makeRng(108);
  for (let c = 108; c < 108 + N; c++) {
    let written = null;
    sb.getCrimeMetrics_ = () => rows;
    sb.getNeighborhoodDemographics_ = () => demo;
    sb.batchUpdateCrimeMetrics_ = (ctx, map) => { written = map; };
    const ctx = { ss: {}, rng, config: {}, summary: { absoluteCycle: c, canonHoods: { list: NM }, neighborhoodAdjacency: adj, neighborhoodState: nstate, neighborhoodDynamics: {}, worldEvents: [], weather: { type: 'clear', impact: 1 }, season: 'spring' } };
    sb.updateCrimeMetrics_Phase3_(ctx);
    const next = {};
    Object.keys(written).forEach(h => { const m = written[h]; next[h] = { neighborhood: h, propertyCrimeIndex: m.propertyCrimeIndex, violentCrimeIndex: m.violentCrimeIndex, responseTimeAvg: m.responseTimeAvg, clearanceRate: m.clearanceRate, incidentCount: m.incidentCount, lastUpdated: c, propertyLevel: m.propertyLevel, violentLevel: m.violentLevel, qolLevel: m.qolLevel }; });
    rows = next;
  }
  const out = [];
  NM.forEach(h => { const r = cur[h] || {}, d = demo[h] || {}; const un = d.adults ? (100 * d.unemployed / d.adults) : NaN;
    out.push({ hood: h, unemp: +un.toFixed(1), tier: nstate[h].incomeTier, curP: +r.PropertyLevel, newP: +rows[h].propertyLevel.toFixed(1), curV: +r.ViolentLevel, newV: +rows[h].violentLevel.toFixed(1), curQ: +r.QolLevel, newQ: +rows[h].qolLevel.toFixed(1) }); });
  out.sort((a, b) => (b.newP + b.newV) - (a.newP + a.newV));
  console.log('N=' + N + ' cycles | medians P/V/Q', mP, mV, mQ);
  console.log('hood | jobless% | tier | property now→seed | violent now→seed | qol now→seed');
  out.forEach(o => console.log([o.hood, o.unemp, o.tier, o.curP + '→' + o.newP, o.curV + '→' + o.newV, o.curQ + '→' + o.newQ].join(' | ')));
  fs.writeFileSync('/tmp/claude-0/-root-GodWorld/8579bed3-a6c3-451d-9293-86a4b2316fb5/scratchpad/crimeSeed_N' + N + '.json', JSON.stringify(out));
})().catch(e => console.log('ERR', e.stack));
