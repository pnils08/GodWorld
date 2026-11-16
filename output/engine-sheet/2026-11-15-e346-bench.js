// engine.346 bench helper (SANDBOX 1004 only). modes:
//   plant            — set EventTrigger `news` on the C116 Dillon rumor row; save the three citizens' cells before the fire
//   read <cycle>     — after the fire: the three unchanged, no trigger / milestone line, the news hook raised, no new errors
require('/root/GodWorld/lib/env');
const fs = require('fs');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === B) throw new Error('env already points at the bench?');
const LIVE = process.env.GODWORLD_SHEET_ID;
process.env.GODWORLD_SHEET_ID = B;
const sheets = require('/root/GodWorld/lib/sheets');
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-15-e346-reads.jsonl';
const PRE = '/root/GodWorld/output/engine-sheet/2026-11-15-e346-prefire.json';
const IDS = ['POP-00018', 'POP-00527', 'POP-00528'];
const COLS = ['ClockMode', 'RoleType', 'Income', 'EconomicProfileKey', 'CitizenBio', 'Status', 'Tier', 'CareerStage', 'MemoryRegisters'];
const colL = (i) => { let s = '', n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const mode = process.argv[2];
(async () => {
  if (process.env.GODWORLD_SHEET_ID !== B || B === LIVE) throw new Error('not aimed at the bench');
  const led = await sheets.getSheetAsObjects('Simulation_Ledger');
  const cells = {}; for (const id of IDS) { const r = led.find((x) => x.POPID === id); cells[id] = {}; COLS.forEach((c) => { cells[id][c] = String(r[c]); }); }
  if (mode === 'plant') {
    const f = await sheets.getSheetData('Oakland_Sports_Feed'); const h = f[0];
    const iC = h.indexOf('Cycle'), iT = h.indexOf('EventTrigger'), iN = h.indexOf('NamesUsed'), iE = h.indexOf('EventType');
    const rows = f.map((r, i) => ({ r, row: i + 1 })).filter((x) => String(x.r[iC]) === '116' && x.r[iE] === 'rumor' && /Benji Dillon.*Mike Paulson.*Deacon Seymour/.test(String(x.r[iN])));
    if (rows.length !== 1) throw new Error('expected exactly one C116 Dillon/Paulson/Seymour rumor row, found ' + rows.length);
    const was = rows[0].r[iT];
    await sheets.updateRange(`Oakland_Sports_Feed!${colL(iT)}${rows[0].row}`, [['news']]);
    const back = (await sheets.getSheetData('Oakland_Sports_Feed'))[rows[0].row - 1][iT];
    if (back !== 'news') throw new Error('plant did not read back');
    const ee0 = await sheets.getSheetData("Engine_Errors");
    fs.writeFileSync(PRE, JSON.stringify({ at: new Date().toISOString(), feedRow: rows[0].row, triggerWas: was, errRows: ee0.length - 1, cells }, null, 1));
    console.log(`planted: bench feed row ${rows[0].row} EventTrigger "${was}" -> "news"; pre-fire cells saved`);
    return;
  }
  const cyc = String(process.argv[3]);
  const pre = JSON.parse(fs.readFileSync(PRE, 'utf8'));
  const res = { label: 'e346-read', cycle: cyc, at: new Date().toISOString(), checks: [] };
  const ok = (name, pass, detail) => { res.checks.push({ name, pass: !!pass, detail }); console.log((pass ? '  ok   ' : '  FAIL ') + name + (detail ? ' — ' + detail : '')); };
  const wc = await sheets.getSheetData('World_Config');
  ok('cycleCount', String((wc.find((r) => r[0] === 'cycleCount') || [])[1]) === cyc, 'bench reads ' + (wc.find((r) => r[0] === 'cycleCount') || [])[1]);
  for (const id of IDS) for (const c of COLS) {
    if (c === 'MemoryRegisters' || c === 'CareerStage') continue;
    ok(`${id} ${c} unchanged`, cells[id][c] === pre.cells[id][c], cells[id][c] === pre.cells[id][c] ? '' : `${pre.cells[id][c].slice(0, 40)} -> ${cells[id][c].slice(0, 40)}`);
  }
  for (const id of IDS) ok(`${id} no Retirement in memory`, !/"tag":"Retirement","txt":"[^"]*","cy":116/.test(cells[id].MemoryRegisters));
  const lg = await sheets.getSheetData('LifeHistory_Log'); const gh = lg[0];
  const gP = gh.indexOf('POPID'), gT = gh.indexOf('EventTag'), gC = gh.indexOf('Cycle'), gX = gh.indexOf('EventText');
  for (const id of IDS) {
    const mine = lg.filter((r) => String(r[gC]) === cyc && r[gP] === id);
    const tags = mine.map((r) => String(r[gT]).split('|')[0]);
    ok(`${id} named on the rumor row (EventType line)`, mine.some((r) => /event:rumor/.test(String(r[gT]))), tags.join(', '));
    ok(`${id} no trigger:news line`, !mine.some((r) => /trigger:news/.test(String(r[gT]))));
    ok(`${id} no Retirement / Maneuver / Former`, !mine.some((r) => /^(Retirement|Maneuver)/.test(String(r[gT])) || /occupation:Former /.test(String(r[gT]))));
  }
  const hd = await sheets.getSheetData('Story_Hook_Deck'); const hh = hd[0];
  const hooks = hd.filter((r) => String(r[hh.indexOf('Cycle')]) === cyc && r[hh.indexOf('HookType')] === 'sports').map((r) => String(r[hh.indexOf('HookText')]));
  ok('news hook raised', hooks.some((t) => /^A's news\. What is being said/.test(t)), hooks.map((t) => t.slice(0, 34)).join(' | '));
  ok('no "player retires" hook', !hooks.some((t) => /player retires/.test(t)));
  const rp = await sheets.getSheetData('Ripple_Ledger'); const rh = rp[0];
  const rr = rp.filter((r) => String(r[rh.indexOf('Cycle')]) === cyc).map((r) => String(r[rh.indexOf('CauseDetail')]));
  ok('no retirement in ripples', !rr.some((t) => /retirement/.test(t)));
  ok('A\'s [news] in the sports ripple', rr.some((t) => /A's \[news\]/.test(t)));
  const ee = await sheets.getSheetData('Engine_Errors');
  const errs = ee.slice(1 + pre.errRows);
  ok('0 new Engine_Errors rows since the plant', errs.length === 0, errs.map((r) => String(r[3]).slice(0, 80)).join(' / '));
  res.pass = res.checks.every((c) => c.pass);
  fs.appendFileSync(OUT, JSON.stringify(res) + '\n');
  console.log(res.pass ? `READ PASS ${res.checks.length}/${res.checks.length}` : `READ FAIL ${res.checks.filter((c) => !c.pass).length} of ${res.checks.length}`);
  process.exit(res.pass ? 0 : 1);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
