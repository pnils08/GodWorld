// engine.339 bench helpers on SANDBOX 1004 (no token echoed): fresh arrivals through the non-household intake door, bench-only,
// marker E339-BENCH NON-CANON.
//   node 2026-11-08-e339-bench.js plant <N> <fire>   six Advancement_Intake1 rows, no MatchPopId, no HouseholdKey, ages 12/25/33/40/60/75
//   node 2026-11-08-e339-bench.js read <label> <N>   readback: every arrival is single (youth under 18) with 0 children; one JSON line
//                                                    appended to 2026-11-08-e339-reads.jsonl
require('/root/GodWorld/lib/env');
const fs = require('fs');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-08-e339-reads.jsonl';
const MARK = 'E339-BENCH NON-CANON';
const sh = require('/root/GodWorld/lib/sheets');
const num = v => { const n = Number(String(v).replace(/^C/, '').trim()); return isFinite(n) ? n : null; };
const obj = d => { const h = (d[0] || []).map(x => String(x).trim()); return { h, rows: d.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))) }; };
const YEARS = [2030, 2017, 2009, 2002, 1982, 1967]; // sim year 2042: ages 12 / 25 / 33 / 40 / 60 / 75
const isArrival = r => String(r.First) === 'Bench' && /^Arrive/.test(String(r.Last));
(async () => {
  const [cmd, a1, a2] = process.argv.slice(2);
  process.env.GODWORLD_SHEET_ID = BENCH;
  if (BENCH === LIVE) throw new Error('bench = live');
  const client = await sh.getClient();
  const title = (await client.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE) throw new Error('title check failed: ' + title);
  if (cmd === 'plant') {
    const N = Number(a1), fire = a2;
    const adv = await sh.getSheetData('Advancement_Intake1');
    const AH = adv[0].map(x => String(x).trim());
    for (const k of ['First', 'Last', 'Tier', 'ClockMode', 'Notes', 'BirthYear', 'Neighborhood']) if (!AH.includes(k)) throw new Error('Advancement_Intake1 lacks ' + k);
    if (adv.slice(1).some(r => String(r[AH.indexOf('First')]) === 'Bench')) throw new Error('Advancement_Intake1 still carries Bench rows — stop');
    const rows = YEARS.map((by, i) => {
      const r = AH.map(() => '');
      r[AH.indexOf('First')] = 'Bench'; r[AH.indexOf('Last')] = 'Arrive' + fire + String.fromCharCode(65 + i);
      r[AH.indexOf('Tier')] = 4; r[AH.indexOf('ClockMode')] = 'ENGINE'; r[AH.indexOf('BirthYear')] = by; r[AH.indexOf('Neighborhood')] = 'Temescal';
      r[AH.indexOf('Notes')] = MARK + ' fire ' + fire;
      return r;
    });
    // appendRows lands these rows nine columns right on this tab (the table detector); write at A<next row> explicitly
    await client.spreadsheets.values.update({ spreadsheetId: BENCH, range: 'Advancement_Intake1!A' + (adv.length + 1), valueInputOption: 'RAW', requestBody: { values: rows } });
    const back = (await sh.getSheetData('Advancement_Intake1')).slice(1).filter(r => String(r[AH.indexOf('First')]) === 'Bench');
    console.log(JSON.stringify({ fire, N, planted: rows.length, readBack: back.length }));
    process.exit(back.length === rows.length ? 0 : 1);
  }
  if (cmd !== 'read') throw new Error('usage: plant <N> <fire> | read <label> <N>');
  const label = a1, N = Number(a2);
  const led = obj(await sh.getSheetData('Simulation_Ledger')).rows.filter(isArrival);
  const ee = obj(await sh.getSheetData('Engine_Errors')).rows.filter(r => num(r.Cycle) === N).map(r => Object.values(r).join(' | ').slice(0, 220));
  const adv = (await sh.getSheetData('Advancement_Intake1')).slice(1).filter(r => String(r[0]) === 'Bench').length;
  const checks = [];
  const ck = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail === undefined ? '' : detail });
  const fireNo = label.replace(/.*-f/, '');
  const mine = led.filter(r => String(r.Last).indexOf('Arrive' + fireNo) === 0);
  const ageOf = r => 2042 - Number(r.BirthYear);
  ck('six arrivals minted this fire', mine.length === 6, mine.map(r => r.Last));
  ck('every arrival is single (youth under 18)', mine.every(r => String(r.MaritalStatus) === (ageOf(r) < 18 ? 'youth' : 'single')), mine.map(r => r.Last + ':' + r.BirthYear + ':' + r.MaritalStatus));
  ck('every arrival has 0 children', mine.every(r => Number(r.NumChildren) === 0), mine.map(r => r.Last + ':' + r.NumChildren));
  ck('no arrival carries a spouse or child link', mine.every(r => !String(r.SpouseId).trim() && !/POP-/.test(String(r.ChildrenIds))), mine.map(r => r.SpouseId + '|' + r.ChildrenIds));
  ck('intake rows cleared after the door', adv === 0, adv);
  ck('0 Engine_Errors at the fire Cycle', ee.length === 0, ee);
  const rec = { label, N, ok: checks.every(c => c.ok), checks, arrivals: mine.map(r => ({ pop: r.POPID, last: r.Last, by: r.BirthYear, ms: r.MaritalStatus, nc: r.NumChildren, role: r.RoleType, nbhd: r.Neighborhood })) };
  fs.appendFileSync(OUT, JSON.stringify(rec) + '\n');
  console.log(JSON.stringify(rec));
  process.exit(rec.ok ? 0 : 1);
})().catch(e => { console.error(String(e && e.message || e)); process.exit(3); });
