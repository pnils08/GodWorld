// engine.330 bench helpers on SANDBOX 1004 (no token echoed).
//   node 2026-11-05-e330-bench.js guard0              World_Config fireGuardMinutes → 0, cycleCount read as a number
//   node 2026-11-05-e330-bench.js clearcp             clearcheckpoint force=1
//   node 2026-11-05-e330-bench.js read <label> <N>    the fire-N readback, one JSON line, appended to e330-reads.jsonl
require('/root/GodWorld/lib/env');
const fs = require('fs');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const URL = 'https://script.google.com/macros/s/AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC/exec';
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-05-e330-reads.jsonl';
const sh = require('/root/GodWorld/lib/sheets');
const num = v => { const n = Number(String(v).replace(/^C/, '').trim()); return isFinite(n) ? n : null; };
const obj = d => { const h = (d[0] || []).map(x => String(x).trim()); return { h, rows: d.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))) }; };

async function liveBylineNames() {
  const u = obj(await sh.getSheetData('Citizen_Media_Usage')).rows;
  const t = r => String(r.UsageType).trim().toLowerCase();
  const src = Math.max(...u.filter(r => t(r) === 'byline-published').map(r => num(r.Cycle)).filter(c => c !== null));
  return [...new Set(u.filter(r => num(r.Cycle) === src && /^byline-(landed|published)$/.test(t(r))).map(r => String(r.CitizenName).trim()))];
}
async function liveOaksNames() {
  const f = obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => /oaks/i.test(r.TeamsUsed));
  const last = f[f.length - 1] || {};
  return String(last.NamesUsed || '').replace(/\([^)]*\)/g, ',').split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
}

async function post(params) {
  const body = new URLSearchParams(Object.assign({ token: process.env.CYCLE_TRIGGER_TOKEN }, params)).toString();
  const r = await fetch(URL, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'follow' });
  const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { http: r.status, nonJson: t.slice(0, 120) }; }
}

(async () => {
  const [cmd, label, nArg] = process.argv.slice(2);
  // live reads first (names for the readback), then aim at the bench once
  const reporters = cmd === 'read' ? await liveBylineNames() : [];
  const players = cmd === 'read' ? await liveOaksNames() : [];
  process.env.GODWORLD_SHEET_ID = BENCH;
  if (BENCH === LIVE) throw new Error('bench = live');
  const client = await sh.getClient();
  const title = (await client.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE) throw new Error('title check failed: ' + title);

  if (cmd === 'guard0') {
    const r = await client.spreadsheets.values.get({ spreadsheetId: BENCH, range: 'World_Config!A1:B400', valueRenderOption: 'UNFORMATTED_VALUE' });
    const rows = r.data.values || [];
    const gi = rows.findIndex(x => x[0] === 'fireGuardMinutes'), ci = rows.findIndex(x => x[0] === 'cycleCount');
    if (gi < 0 || ci < 0) throw new Error('fireGuardMinutes or cycleCount row missing');
    await sh.updateRange('World_Config!B' + (gi + 1), [[0]]);
    const cc = (await client.spreadsheets.values.get({ spreadsheetId: BENCH, range: 'World_Config!B' + (ci + 1) })).data.values[0][0];
    const g = (await client.spreadsheets.values.get({ spreadsheetId: BENCH, range: 'World_Config!B' + (gi + 1) })).data.values[0][0];
    console.log(JSON.stringify({ fireGuardMinutes: g, cycleCountFormatted: cc, cycleCountIsNumber: /^\d+$/.test(String(cc)) }));
    process.exit(/^\d+$/.test(String(cc)) && String(g) === '0' ? 0 : 1);
  }
  if (cmd === 'clearcp') { console.log(JSON.stringify(await post({ action: 'clearcheckpoint', force: '1' }))); return; }
  if (cmd !== 'read') throw new Error('usage: guard0 | clearcp | read <label> <N>');

  const N = Number(nArg);
  const wc = obj([['Key', 'Value'], ...(await sh.getSheetData('World_Config')).slice(1)]).rows;
  const ee = obj(await sh.getSheetData('Engine_Errors'));
  const eeN = ee.rows.filter(r => num(r.Cycle) === N);
  const ecr = obj(await sh.getSheetData('Edition_Coverage_Ratings')).rows.filter(r => /sandbox-generic/i.test(r.Reporter));
  const cfs = obj(await sh.getSheetData('Carry_Forward_Store')).rows.filter(r => r.Key === 'PREV_ACTIVITY_OBS_JSON' && num(r.Cycle) === N);
  let coverage = null; try { const h = JSON.parse(cfs[0].JSON); const a = Array.isArray(h) ? h : (h.history || []); coverage = a.length ? a[a.length - 1].coverage : null; } catch (e) { coverage = 'unread'; }
  const cmu = obj(await sh.getSheetData('Citizen_Media_Usage')).rows.filter(r => /sandbox-generic/i.test(r.Reporter) || /sandbox-generic/i.test(r.Context));
  const led = obj(await sh.getSheetData('Simulation_Ledger')).rows;
  const full = r => (String(r.First).trim() + ' ' + String(r.Last).trim()).toLowerCase();
  const rset = new Set(reporters.map(s => s.toLowerCase()));
  const usageSum = led.filter(r => rset.has(full(r))).reduce((s, r) => s + (Number(r.UsageCount) || 0), 0);
  const pset = new Set(players.map(s => s.toLowerCase()));
  const playerPop = new Set(led.filter(r => pset.has(full(r))).map(r => r.POPID));
  const lh = obj(await sh.getSheetData('LifeHistory_Log'));
  const lhN = lh.rows.filter(r => num(r.Cycle) === N);
  const lhPlayers = lhN.filter(r => playerPop.has(r.POPID)).length;
  const lhGame = lhN.filter(r => /game|night|oaks|court|arena/i.test(Object.values(r).join(' ')) && playerPop.has(r.POPID)).length;
  const ai = obj(await sh.getSheetData('Advancement_Intake1')).rows.filter(r => r.First || r.Last);
  const seeds = obj(await sh.getSheetData('Story_Seed_Deck')).rows.filter(r => /Citywide reaction/i.test(Object.values(r).join(' ')));
  const sportsRows = obj(await sh.getSheetData('Oakland_Sports_Feed')).rows.filter(r => num(r.Cycle) === N);
  const we = obj(await sh.getSheetData('WorldEvents_Ledger')).rows.filter(r => num(r.Cycle) === N);
  const seasons = [...new Set(we.map(r => String(r.SportsSeason)))];
  const rec = {
    label, N, at: new Date().toISOString(),
    cycleCount: num((wc.find(r => r.Key === 'cycleCount') || {}).Value),
    engineErrorsAtN: eeN.length, weekRecordErrors: eeN.filter(r => /WeekRecord/i.test(Object.values(r).join(' '))).length,
    fireGuardErrors: eeN.filter(r => /FireGuard/i.test(Object.values(r).join(' '))).length,
    ratingsMarked: ecr.length, ratingsProcessed: ecr.filter(r => String(r.Processed).toUpperCase() === 'TRUE').length,
    coverageBoost: coverage,
    usageMarked: cmu.length, usageProcessedY: cmu.filter(r => String(r.Processed).toUpperCase() === 'Y').length,
    usageRoutedY: cmu.filter(r => String(r.Routed).toUpperCase() === 'Y').length,
    reporters: reporters.length, reportersUsageCountSum: usageSum,
    sportsRowsAtN: sportsRows.length, worldEventsSportsSeason: seasons, oaksPlayersOnLedger: playerPop.size,
    lifeHistoryAtN: lhN.length, lifeHistoryOaksPlayers: lhPlayers, lifeHistoryOaksPlayersGameWords: lhGame,
    intakeRows: ai.length, intakeRoutedFromSandboxUsage: ai.filter(r => /sandbox-generic/i.test(Object.values(r).join(' '))).length,
    citywideReactionSeeds: seeds.length
  };
  fs.appendFileSync(OUT, JSON.stringify(rec) + '\n');
  console.log(JSON.stringify(rec));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
