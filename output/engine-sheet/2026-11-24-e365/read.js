// engine.365 bench read for Cycle <C> on SANDBOX 1004.
//   node read.js <C> <carryIn: "start" | "ring">
// Per hood: census judicial arrests = floor((charges − diverted) × clearance + carryIn), the ring's
// PREV_ARREST_CARRY_JSON = the remainder; charges = Crime_Metrics IncidentCount; diverted from the
// OARI hoods (Initiative_Tracker INIT-002) at round(round(charges × share) × 0.5). Prints incidents
// per 1,000 residents by hood and the city total. Every census row complete.
require('/root/GodWorld/lib/env');
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const sheets = require('/root/GodWorld/lib/sheets');
const C = Number(process.argv[2]); const MODE = process.argv[3] || 'start';
const P = 1e6, r6 = x => Math.round(x * P) / P;
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const wc = await sheets.getSheetAsObjects('World_Config');
  const share = Number((wc.find(r => r.Key === 'careJusticeOariEligibleShare') || {}).Value);
  const cm = await sheets.getSheetAsObjects('Crime_Metrics');
  const nd = await sheets.getSheetAsObjects('Neighborhood_Demographics');
  const it = await sheets.getSheetAsObjects('Initiative_Tracker');
  await wait(15000);
  const ring = await sheets.getSheetData('Carry_Forward_Store');
  const cj = await sheets.getSheetAsObjects('Care_Justice_Census');
  const blob = c => { const row = ring.slice(1).filter(x => x[0] === 'PREV_ARREST_CARRY_JSON' && Number(x[1]) === c)[0]; return row ? JSON.parse(row[3]) : null; };
  const out = blob(C), prev = MODE === 'ring' ? blob(C - 1) : null;
  const oari = new Set(String((it.find(r => r.InitiativeID === 'INIT-002') || {}).AffectedNeighborhoods || '').split(',').map(s => s.trim()).filter(Boolean));
  const rows = cj.filter(r => Number(r.Cycle) === C);
  const problems = [];
  if (!(share > 0)) problems.push('no careJusticeOariEligibleShare');
  if (!rows.length) problems.push('no census rows for C' + C);
  const incomplete = rows.filter(r => r.Completeness !== 'complete'); if (incomplete.length) problems.push(incomplete.length + ' census rows not complete');
  if (!out) problems.push('no PREV_ARREST_CARRY_JSON ring row for C' + C);
  if (MODE === 'ring' && !prev) problems.push('no ring row for C' + (C - 1));
  const residents = Object.fromEntries(nd.filter(r => r.Neighborhood).map(r => [r.Neighborhood, (+r.Students) + (+r.Adults) + (+r.Seniors)]));
  let cityInc = 0, cityArr = 0; const rate = [];
  for (const m of cm) {
    const h = m.Neighborhood; if (!h || !residents[h]) continue;
    if (Number(m.LastUpdated) !== C) { problems.push(h + ': Crime_Metrics not updated for C' + C); continue; }
    const charges = Number(m.IncidentCount), clr = Number(m.ClearanceRate);
    const diverted = oari.has(h) ? Math.round(Math.round(charges * share) * 0.5) : 0;
    const cin = MODE === 'ring' ? (prev && prev.hoods[h]) : 0.5;
    const exp = r6((charges - diverted) * clr + cin), whole = Math.floor(exp), carry = r6(exp - whole);
    const cen = rows.find(r => r.System === 'judicial' && r.GeographicScope === 'neighborhood' && r.Neighborhood === h && r.IntakeType === 'arrest');
    if (!cen) { problems.push(h + ': no census arrest row'); continue; }
    const want = Math.max(whole, Number(cen.TrackedIntakes));
    if (Number(cen.TotalIntakes) !== want) problems.push(h + ': census ' + cen.TotalIntakes + ' vs floor((' + charges + '−' + diverted + ')×' + clr + '+' + cin + ')=' + whole);
    if (out && Math.abs((out.hoods[h] ?? -1) - carry) > 1e-6) problems.push(h + ': ring carry ' + out.hoods[h] + ' vs ' + carry);
    cityInc += charges; cityArr += Number(cen.TotalIntakes);
    rate.push([h, residents[h], charges, (charges / residents[h] * 1000).toFixed(2), diverted, Number(cen.TotalIntakes)]);
  }
  rate.sort((a, b) => b[3] - a[3]);
  const res = { cycle: C, mode: MODE, cityIncidents: cityInc, cityArrests: cityArr, oariHoods: [...oari],
    byRate: rate.map(r => r.join(' ')), problems, verdict: problems.length ? 'FAIL' : 'PASS' };
  console.log(JSON.stringify(res, null, 1)); process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error('read ERR', e.message); process.exit(2); });
