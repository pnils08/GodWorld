// research.31 bench readout for one leg, after the C113 + C114 fires: who the $LEADER lines name, how the night-113 and
// night-114 slips settled, Engine_Errors. Writes output/engine-sheet/2026-10-30-r31-check-<leg>.json.
//   node output/engine-sheet/2026-10-30-r31-check.js <leg>
//   node output/engine-sheet/2026-10-30-r31-check.js --compare A B
require('/root/GodWorld/lib/env');
const fs = require('fs');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const OUT = leg => '/root/GodWorld/output/engine-sheet/2026-10-30-r31-check-' + leg + '.json';
const LEADER_RE = [/checked the board on the walk to work and (.+) was still the name at the top/,
  /argued at the bar that (.+) only leads because nobody has flown a real contract yet/,
  /did the math on how many nights it would take to catch (.+) and kept the number to themselves/];
if (process.argv[2] === '--compare') {
  const a = JSON.parse(fs.readFileSync(OUT(process.argv[3]), 'utf8')), b = JSON.parse(fs.readFileSync(OUT(process.argv[4]), 'utf8'));
  console.log(JSON.stringify({ leader: [a.leaderNames, b.leaderNames], night: [a.night, b.night], ee: [a.ee, b.ee], cycle: [a.cycle, b.cycle] }, null, 1));
  process.exit(0);
}
const leg = process.argv[2];
if (!leg) { console.error('usage: <leg> | --compare A B'); process.exit(2); }
(async () => {
  const api = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] }) });
  const t = (await api.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (t !== BENCH_TITLE || BENCH === process.env.GODWORLD_SHEET_ID) throw new Error('target check failed');
  const get = async range => (await api.spreadsheets.values.get({ spreadsheetId: BENCH, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || [];
  const wc = await get('World_Config!A1:B400');
  const cycle = Number((wc.find(r => r[0] === 'cycleCount') || [])[1]);
  const lh = await get('LifeHistory_Log');
  const h = lh[0], iC = h.indexOf('Cycle'), iT = h.indexOf('EventText'), iP = h.indexOf('POPID');
  const leaderNames = {}, leaderLines = [];
  lh.slice(1).filter(r => Number(r[iC]) >= 113).forEach(r => {
    const text = String(r[iT] || '');
    LEADER_RE.forEach(re => { const m = re.exec(text); if (m) {
      const k = 'C' + r[iC] + ' ' + m[1]; leaderNames[k] = (leaderNames[k] || 0) + 1; leaderLines.push({ cycle: r[iC], pop: r[iP], text: text });
    } });
  });
  const cl = await get('Casino_Ledger');
  const ch = cl[0], col = n => ch.indexOf(n);
  const night = {};
  // A settled night slip's EventId is rewritten to the winning episode, so select by CyclePlaced, not 'night-<c>'.
  cl.slice(1).filter(r => r[col('MarketId')] === 'night_winner' && Number(r[col('CyclePlaced')]) >= 112).forEach(r => {
    const k = 'placed C' + r[col('CyclePlaced')] + ' ' + r[col('EventId')] + ' side ' + r[col('Side')] + ' -> ' + r[col('Status')];
    night[k] = (night[k] || 0) + 1;
  });
  const ee = (await get('Engine_Errors')).length - 1;
  const rec = { leg, at: new Date().toISOString(), cycle, leaderNames, night, ee, leaderLines: leaderLines.slice(0, 12) };
  fs.writeFileSync(OUT(leg), JSON.stringify(rec, null, 1) + '\n');
  console.log(JSON.stringify({ leg, cycle, leaderNames, night, ee }, null, 1));
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
