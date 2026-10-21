// engine.306 bench read for one fire (es wiring card + codex plan review 2026-10-21, readers): read-only snapshot of SANDBOX 1004
// after a C113 fire — per hood saved RetailVitality / Sentiment / Nightlife / EventAttractiveness and Neighborhood_Demographics
// Unemployed; Business_Ledger rows, stated jobs and revenue; employer moves vs BASELINE-1004-C112b (who changed EmployerBizId, to
// which row, new rows marked); Career-Hired lines; business-scoped chaos targets; owner-door queue rows; TreasuryPost business tax;
// the Cycle's LifeHistory line-set sha (same method as the e214c receipt); per hood, this Cycle's chaos rows and LifeHistory lines;
// the ledger rows the baseline does not hold, by name (codex diff gate 2 item 3). Writes nothing to any sheet.
// usage: node 2026-10-21-e306-readers.js <cycle> <label>  → output/engine-sheet/2026-10-21-e306-readers-<label>-c<cycle>.json
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (process.env.GODWORLD_SHEET_ID === BENCH || process.env.GODWORLD_SHEET_ID === BASE) throw new Error('env already points at a bench sheet');
const fs = require('fs'), crypto = require('crypto');
const cyc = Number(process.argv[2]), label = process.argv[3] || 'readers';
const num = (v) => Number(String(v).replace(/^C/, ''));
async function tab(id, name) {
  process.env.GODWORLD_SHEET_ID = id; delete require.cache[require.resolve('/root/GodWorld/lib/sheets')];
  try { return await require('/root/GodWorld/lib/sheets').getSheetData(name); } catch (e) { return null; }
}
const col = (t, n) => t[0].indexOf(n);
(async () => {
  const out = { cycle: cyc, label, hoods: {} };
  const nm = await tab(BENCH, 'Neighborhood_Map');
  for (const r of nm.slice(1)) {
    out.hoods[r[col(nm, 'Neighborhood')]] = { retail: Number(r[col(nm, 'RetailVitality')]), sentiment: Number(r[col(nm, 'Sentiment')]),
      nightlife: Number(r[col(nm, 'NightlifeProfile')]), event: Number(r[col(nm, 'EventAttractiveness')]) };
  }
  const nd = await tab(BENCH, 'Neighborhood_Demographics');
  for (const r of nd.slice(1)) { const h = out.hoods[r[col(nd, 'Neighborhood')]]; if (h) h.unemployed = Number(r[col(nd, 'Unemployed')]); }
  const bl = await tab(BENCH, 'Business_Ledger'), base = await tab(BASE, 'Business_Ledger');
  const baseIds = new Set(base.slice(1).map(r => String(r[0]).trim()));
  out.business = { rows: bl.length - 1, newRows: bl.slice(1).filter(r => !baseIds.has(String(r[0]).trim())).length,
    statedJobs: bl.slice(1).reduce((n, r) => n + (Number(r[col(bl, 'Employee_Count')]) || 0), 0),
    revenue: bl.slice(1).reduce((n, r) => n + Math.max(0, Number(r[col(bl, 'Annual_Revenue')]) || 0), 0) };
  const bizName = {}; bl.slice(1).forEach(r => { bizName[String(r[0]).trim()] = r[1]; });
  const sl = await tab(BENCH, 'Simulation_Ledger'), sb = await tab(BASE, 'Simulation_Ledger');
  const was = {}; sb.slice(1).forEach(r => { was[r[col(sb, 'POPID')]] = String(r[col(sb, 'EmployerBizId')] || '').trim(); });
  const moves = [];
  sl.slice(1).forEach(r => {
    const pop = r[col(sl, 'POPID')], now = String(r[col(sl, 'EmployerBizId')] || '').trim();
    if (!(pop in was) || was[pop] !== now) moves.push({ pop, from: was[pop] === undefined ? '(new citizen)' : was[pop], to: now, toName: bizName[now] || '', toNewRow: !!now && /^BIZ-/.test(now) && !baseIds.has(now) });
  });
  out.employerMoves = { total: moves.length, toNewRows: moves.filter(m => m.toNewRow).length, list: moves };
  const lh = await tab(BENCH, 'LifeHistory_Log');
  const iC = col(lh, 'Cycle'), iT = col(lh, 'EventTag'), iX = col(lh, 'EventText'), iP = col(lh, 'POPID');
  const rows = lh.slice(1).filter(r => num(r[iC]) === cyc);
  const lines = rows.map(r => [r[iP], r[iT], r[iX]].join('\t')).sort();
  out.lifeHistory = { rows: rows.length, linesSha256: crypto.createHash('sha256').update(lines.join('\n')).digest('hex'),
    careerHired: rows.filter(r => /Career-Hired/.test(String(r[iT]) + String(r[iX]))).length };
  const cc = await tab(BENCH, 'Chaos_Cars');
  const hits = cc.slice(1).filter(r => num(r[col(cc, 'CycleId')]) === cyc && r[col(cc, 'TargetScope')] === 'business')
    .map(r => ({ id: r[col(cc, 'TargetId')], name: bizName[r[col(cc, 'TargetId')]] || '', outcome: r[col(cc, 'DiceOutcome')], newRow: !baseIds.has(String(r[col(cc, 'TargetId')]).trim()) }));
  out.chaosBusinessHits = { total: hits.length, onNewRows: hits.filter(h => h.newRow).length, list: hits };
  // codex diff gate 2 item 3 — row-specific: every chaos row this Cycle placed in its hood (business → the row's Neighborhood),
  // this Cycle's LifeHistory lines per hood (the pulse-fold input), and the ledger rows the baseline does not hold, by name.
  const bizHood = {}; bl.slice(1).forEach(r => { bizHood[String(r[0]).trim()] = r[col(bl, 'Neighborhood')]; });
  out.chaosByHood = {};
  cc.slice(1).filter(r => num(r[col(cc, 'CycleId')]) === cyc).forEach(r => {
    const scope = r[col(cc, 'TargetScope')], tid = String(r[col(cc, 'TargetId')]).trim();
    const hood = scope === 'business' ? (bizHood[tid] || '(unknown)') : scope === 'neighborhood' ? tid : '(' + scope + ')';
    (out.chaosByHood[hood] = out.chaosByHood[hood] || []).push({ scope, id: tid, name: bizName[tid] || '', vehicle: r[col(cc, 'VehicleType')],
      outcome: r[col(cc, 'DiceOutcome')], metric: r[col(cc, 'PrimaryMetric')], magnitude: r[col(cc, 'MetricMagnitude')] });
  });
  const iN = col(lh, 'Neighborhood');
  out.lifeHistoryByHood = {}; rows.forEach(r => { const h = r[iN] || '(none)'; out.lifeHistoryByHood[h] = (out.lifeHistoryByHood[h] || 0) + 1; });
  out.newLedgerRows = bl.slice(1).filter(r => !baseIds.has(String(r[0]).trim())).map(r => ({ id: r[0], name: r[1], sector: r[2], hood: r[3] }));
  const adv = await tab(BENCH, 'Advancement_Intake1');
  const iOwn = adv ? col(adv, 'OwnerOfBizId') : -1;
  out.ownerDoorQueue = iOwn < 0 ? [] : adv.slice(1).filter(r => String(r[iOwn] || '').trim()).map(r => ({ first: r[0], last: r[2], owns: r[iOwn], name: bizName[String(r[iOwn]).trim()] || '', newRow: !baseIds.has(String(r[iOwn]).trim()) }));
  const tp = await tab(BENCH, 'TreasuryPost');
  out.treasuryBusinessTax = tp ? tp.slice(1).filter(r => r.join('|').indexOf('BUSINESS-TAX') >= 0).map(r => r.join('|')).slice(-3) : 'no TreasuryPost tab';
  const file = '/root/GodWorld/output/engine-sheet/2026-10-21-e306-readers-' + label + '-c' + cyc + '.json';
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log(label + ' C' + cyc + ': LifeHistory ' + rows.length + ' sha ' + out.lifeHistory.linesSha256.slice(0, 16) + ', Career-Hired ' + out.lifeHistory.careerHired +
    ', ledger ' + out.business.rows + ' rows (' + out.business.newRows + ' new), employer moves ' + moves.length + ' (' + out.employerMoves.toNewRows + ' to new rows), chaos business hits ' +
    hits.length + ' (' + out.chaosBusinessHits.onNewRows + ' new), owner-door queue ' + out.ownerDoorQueue.length + ' → ' + file);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
