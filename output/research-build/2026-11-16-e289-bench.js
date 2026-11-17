// engine.289 bench helper (SANDBOX 1004 only). modes:
//   pre              — save the Engine_Errors row count before the fires
//   read <cycle>     — after a fire: the carried story seeds stamped <cycle> hold the evening's hooded CULTURE / NIGHTLIFE seeds,
//                      one per Riley_Digest night spot and restaurant of that Cycle; EA sum; no new Engine_Errors rows
// Copied in shape from output/engine-sheet/2026-11-15-e346-bench.js.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === B) throw new Error('env already points at the bench?');
const LIVE = process.env.GODWORLD_SHEET_ID;
process.env.GODWORLD_SHEET_ID = B;
const sheets = require('/root/GodWorld/lib/sheets');
const OUT = '/root/GodWorld/output/research-build/2026-11-16-e289-reads.jsonl';
const PRE = '/root/GodWorld/output/research-build/2026-11-16-e289-prefire.json';
const mode = process.argv[2];
(async () => {
  if (process.env.GODWORLD_SHEET_ID !== B || B === LIVE) throw new Error('not aimed at the bench');
  if (mode === 'pre') {
    const ee0 = await sheets.getSheetData('Engine_Errors');
    fs.writeFileSync(PRE, JSON.stringify({ at: new Date().toISOString(), errRows: ee0.length - 1 }, null, 1));
    console.log('pre: Engine_Errors rows ' + (ee0.length - 1));
    return;
  }
  const cyc = String(process.argv[3]);
  const res = []; const ok = (label, cond, detail) => { res.push({ label, ok: !!cond, detail: detail || '' }); console.log((cond ? 'ok ' : 'FAIL ') + label + (detail ? ' — ' + detail : '')); };
  const ring = await sheets.getSheetData('Carry_Forward_Store'); const rh = ring[0];
  const blob = (key) => { const r = ring.find((x) => x[rh.indexOf('Key')] === key && String(x[rh.indexOf('Cycle')]) === cyc); return r ? JSON.parse(r[rh.indexOf('JSON')]) : null; };
  const st = blob('PREV_STORY_SEEDS_JSON');
  ok('story-seed carry stamped C' + cyc, !!st, st ? st.seeds.length + ' seeds' : 'missing');
  const seeds = st ? st.seeds : [];
  const rd = await sheets.getSheetData('Riley_Digest'); const dh = rd[0];
  const row = rd.find((x) => String(x[dh.indexOf('Cycle')]) === cyc);
  ok('Riley_Digest row C' + cyc, !!row);
  const pj = (c) => { try { return JSON.parse(row[dh.indexOf(c)]); } catch (e) { return {}; } };
  const spots = ((pj('NightLife').spotDetails) || []).filter((s) => s && s.name && s.neighborhood);
  const rest = ((pj('EveningFood').restaurantDetails) || []).filter((s) => s && s.name && s.neighborhood);
  const ns = seeds.filter((s) => s.t === 'nightlife-spot'), ds = seeds.filter((s) => s.t === 'dining-spot');
  ok('one NIGHTLIFE seed per hooded night spot, at its hood', ns.length === spots.length && ns.every((s) => s.d === 'NIGHTLIFE' && s.n && s.p === 2),
    spots.map((s) => s.name + '@' + s.neighborhood).join(', ') + ' | carried ' + ns.map((s) => s.n).join(', '));
  ok('one NIGHTLIFE seed per hooded restaurant, at its hood', ds.length === rest.length && ds.every((s) => s.d === 'NIGHTLIFE' && s.n && s.p === 2),
    rest.map((s) => s.name + '@' + s.neighborhood).join(', ') + ' | carried ' + ds.map((s) => s.n).join(', '));
  const ce = seeds.filter((s) => s.t === 'city-event'), fsd = seeds.filter((s) => s.t === 'famous-sighting');
  ok('city-event seeds carry a hood', ce.length === 0 || ce.every((s) => s.n), ce.map((s) => s.n || '(none)').join(', ') || 'no city events this Cycle');
  ok('famous sightings carried (hooded or the citywide line)', true, fsd.map((s) => s.n || '(citywide)').join(', ') || 'none');
  // the raw carried sum per hood (priority; the gate adds type and calendar lift) — what next Cycle's bars read
  const sum = {}; seeds.forEach((s) => { if (!s.n || s.n === 'Citywide' || !/^(CULTURE|NIGHTLIFE)$/.test(s.d)) return; const k = s.n + ' ' + s.d; sum[k] = (sum[k] || 0) + s.p; });
  const at3 = Object.entries(sum).filter(([, v]) => v >= 3).map(([k, v]) => k + ' ' + v);
  ok('hoods carried to C' + (Number(cyc) + 1) + ' at or past 3 (raw priority)', true, at3.join(', ') || 'none');
  const nm = await sheets.getSheetData('Neighborhood_Map'); const nh = nm[0];
  const ea = nm.slice(1).filter((r) => String(r[nh.indexOf('Cycle')]) === cyc).map((r) => Number(r[nh.indexOf('EventAttractiveness')]));
  ok('Neighborhood_Map C' + cyc + ' rows and EA sum', ea.length === 22, 'rows ' + ea.length + ', EA sum ' + ea.reduce((a, b) => a + b, 0).toFixed(2));
  const pre = JSON.parse(fs.readFileSync(PRE, 'utf8'));
  const ee = await sheets.getSheetData('Engine_Errors'); const errs = ee.slice(1 + pre.errRows);
  ok('0 new Engine_Errors rows since pre', errs.length === 0, errs.map((r) => String(r[3]).slice(0, 80)).join(' / '));
  fs.appendFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), cycle: Number(cyc), res, at3, seeds: seeds.filter((s) => s.n && /^(CULTURE|NIGHTLIFE)$/.test(s.d)) }) + '\n');
  process.exit(res.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
