// engine.364 bench read for Cycle <C> on SANDBOX 1004.
//   node read.js <C> <carryIn: "start" | "ring">
// Per hood: the census illness intakes = max(floor(sick × rate + carryIn), tracked), the ring's
// carry = the remainder. Every census row of the Cycle complete. Stays closed this Cycle read
// discharged / deceased.
require('/root/GodWorld/lib/env');
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const sheets = require('/root/GodWorld/lib/sheets');
const C = Number(process.argv[2]); const MODE = process.argv[3] || 'start';
const P = 1e6, r6 = x => Math.round(x * P) / P;
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const wc = await sheets.getSheetAsObjects('World_Config');
  const rate = Number((wc.find(r => r.Key === 'careJusticeAdmitPerSick') || {}).Value);
  const nd = await sheets.getSheetAsObjects('Neighborhood_Demographics');
  const ring = await sheets.getSheetData('Carry_Forward_Store');
  await wait(15000);
  const cj = await sheets.getSheetAsObjects('Care_Justice_Census');
  const hl = await sheets.getSheetAsObjects('Hospital_Ledger');
  const blob = c => { const row = ring.slice(1).filter(x => x[0] === 'PREV_HOSP_ADMIT_CARRY_JSON' && Number(x[1]) === c)[0]; return row ? JSON.parse(row[3]) : null; };
  const out = blob(C), prev = MODE === 'ring' ? blob(C - 1) : null;
  const rows = cj.filter(r => Number(r.Cycle) === C);
  const problems = [];
  if (!rows.length) problems.push('no census rows for C' + C);
  const incomplete = rows.filter(r => r.Completeness !== 'complete');
  if (incomplete.length) problems.push(incomplete.length + ' census rows not complete');
  if (!out) problems.push('no PREV_HOSP_ADMIT_CARRY_JSON ring row for C' + C);
  if (MODE === 'ring' && !prev) problems.push('no ring row for C' + (C - 1) + ' to carry from');
  const hood = {}; let citySum = 0, cityExpected = 0;
  for (const d of nd) {
    if (!d.Neighborhood) continue;
    const h = d.Neighborhood, sick = Number(d.Sick);
    const cen = rows.find(r => r.System === 'hospital' && r.GeographicScope === 'neighborhood' && r.Neighborhood === h && r.IntakeType === 'illness');
    if (!cen) { problems.push(h + ': no census illness row'); continue; }
    const cin = MODE === 'ring' ? (prev && prev.hoods[h]) : 0.5;
    const exp = r6(sick * rate + cin), whole = Math.floor(exp), carry = r6(exp - whole);
    const tracked = Number(cen.TrackedIntakes), total = Number(cen.TotalIntakes);
    const want = Math.max(whole, tracked);
    if (total !== want) problems.push(h + ': census ' + total + ' vs floor(' + sick + '×' + rate + '+' + cin + ')=' + whole + ' tracked ' + tracked);
    if (out && Math.abs((out.hoods[h] ?? -1) - carry) > 1e-6) problems.push(h + ': ring carry ' + (out.hoods[h]) + ' vs ' + carry);
    if (MODE === 'start' && whole !== Math.round(sick * rate)) problems.push(h + ': start ' + whole + ' != round ' + Math.round(sick * rate));
    hood[h] = { sick, carryIn: cin, admits: total, carryOut: out ? out.hoods[h] : null };
    citySum += total; cityExpected += sick * rate;
  }
  const closed = hl.filter(r => Number(r.DischargeCycle) === C);
  const badStamp = closed.filter(r => !/^(discharged|deceased)$/.test(String(r.StatusNow)));
  if (badStamp.length) problems.push(badStamp.length + ' stays closed C' + C + ' not stamped discharged/deceased: ' + badStamp.map(r => r.POPID + ' ' + r.StatusNow).join(', '));
  const small = ['Lake Merritt', 'Uptown', 'KONO', 'Baylight District'].map(h => h + ' ' + JSON.stringify(hood[h]));
  const res = { cycle: C, mode: MODE, rate, censusRows: rows.length, cityAdmits: citySum, cityExpected: r6(cityExpected),
    small, closedThisCycle: closed.map(r => r.POPID + ' ' + r.StatusNow + ' ' + r.Outcome), problems, verdict: problems.length ? 'FAIL' : 'PASS' };
  console.log(JSON.stringify(res, null, 1)); process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error('read ERR', e.message); process.exit(2); });
