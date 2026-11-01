// civic.47 B2 F7 bench read, bench sheet only. The expected values are recomputed here from the bench's own Transit_Metrics
// tab and the station map — not from the engine.
//   after1 <C0> : fire 1 stamped INIT-003 a conversion baseline typed station-serving-hood from the C0 station rows.
//   after2 <C0> : fire 2 read the C0+1 station rows (Fruitvale planted at 4x), the edge was available and the hold counted 1 up.
// Exit 0 = pass. 3 = baseline missing/wrong. 4 = hold wrong. 5 = bench shape wrong.
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === LIVE) process.exit(9);
const fs = require('fs');
const sheets = require('/root/GodWorld/lib/sheets');
const [mode, c0s] = process.argv.slice(2); const c0 = Number(c0s);
if (!['after1', 'after2'].includes(mode) || !Number.isInteger(c0)) { console.error('after1|after2 <C0>'); process.exit(2); }
const STATIONS = new Function(fs.readFileSync('/root/GodWorld/utilities/ensureTransitMetrics.js', 'utf8') + '\nreturn OAKLAND_BART_STATIONS;')();
const median = a => { const s = a.slice().sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
(async () => {
  const tm = await sheets.getSheetAsObjects('Transit_Metrics');
  const hoodValues = cy => {
    const v = {};
    STATIONS.forEach(s => { v[s.neighborhood] = v[s.neighborhood] || 0; });
    const seen = {};
    tm.filter(r => Number(r.Cycle) === cy && String(r.Station).trim()).forEach(r => { seen[r.Station] = (seen[r.Station] || 0) + 1; });
    STATIONS.forEach(s => { if (seen[s.station] !== 1) { console.error('bench C' + cy + ' station ' + s.station + ' rows: ' + (seen[s.station] || 0)); process.exit(5); } });
    STATIONS.forEach(s => { v[s.neighborhood] += Number(tm.find(r => Number(r.Cycle) === cy && String(r.Station).trim() === s.station).RidershipVolume); });
    return v;
  };
  const t = await sheets.getSheetAsObjects('Initiative_Tracker');
  const me = t.find(r => r.InitiativeID === 'INIT-003') || {};
  const fail = (code, msg) => { console.log('FAIL: ' + msg); process.exit(code); };
  let b; try { b = JSON.parse(me.StageBaseline); } catch (e) { fail(3, 'INIT-003 StageBaseline is empty or not JSON: ' + JSON.stringify(me.StageBaseline)); }
  const want = hoodValues(c0);
  const hoods = Object.keys(want).sort();
  console.log('bench Fruitvale C' + c0 + ' =', want.Fruitvale, '| station hoods', hoods.length, '| median', median(Object.values(want)));
  if (!(b.v === 1 && b.origin === 'conversion' && b.scope === 'station-serving-hood' && b.tab === 'Transit_Metrics' && Number(b.cycle) === c0 && b.direction === 'up')) fail(3, 'baseline header wrong ' + JSON.stringify({ v: b.v, origin: b.origin, scope: b.scope, tab: b.tab, cycle: b.cycle, direction: b.direction }));
  if (JSON.stringify(Object.keys(b.keys)) !== '["Fruitvale"]' || Number(b.keys.Fruitvale.RidershipVolume) !== want.Fruitvale) fail(3, 'baseline target reading ' + JSON.stringify(b.keys) + ' != ' + want.Fruitvale);
  if (b.cityN !== hoods.length || JSON.stringify(b.city) !== JSON.stringify(hoods)) fail(3, 'baseline city membership ' + JSON.stringify(b.city) + ' != ' + JSON.stringify(hoods));
  if (Number(b.cityMiddle.RidershipVolume) !== median(Object.values(want))) fail(3, 'baseline city middle ' + b.cityMiddle.RidershipVolume + ' != ' + median(Object.values(want)));
  console.log('baseline: station-serving-hood, conversion, C' + b.cycle + ', Fruitvale ' + b.keys.Fruitvale.RidershipVolume + ', ' + b.cityN + ' station hoods, middle ' + b.cityMiddle.RidershipVolume + ' — matches the bench tab');
  if (me.Stage !== 'Standing' || me.ImplementationPhase === 'stalled') fail(3, 'row left Standing/operational: ' + me.Stage + ' / ' + me.ImplementationPhase);
  if (mode === 'after2') {
    let h; try { h = JSON.parse(me.StageHold); } catch (e) { fail(4, 'StageHold empty or not JSON: ' + JSON.stringify(me.StageHold)); }
    const c1 = c0 + 1, now = hoodValues(c1);
    const edge = now.Fruitvale / median(Object.values(now)) - want.Fruitvale / median(Object.values(want));
    console.log('bench Fruitvale C' + c1 + ' =', now.Fruitvale, '| recomputed edge', edge.toFixed(4), '| hold', me.StageHold);
    if (!(edge >= 0.2)) fail(4, 'planted lift did not make an edge over the margin (' + edge + ')');
    if (!(Number(h.obs) === c1 && Number(h.up) === 1 && Number(h.down) === 0)) fail(4, 'hold should be obs ' + c1 + ' up 1 down 0 — an unavailable edge would leave up 0');
    if (me.StageBaseline !== JSON.stringify(b)) console.log('note: baseline cell text differs from re-serialised parse (formatting only)');
    console.log('hold: observation C' + c1 + ' counted, up 1 — the freeze read the station rows and the edge was available');
  }
  console.log('civic.47 B2 F7 bench ' + mode + ' PASS');
})().catch(e => { console.error(e.message); process.exit(1); });
