// engine.206 cut 2 bench read, one leg after its C113 fire — BENCH ONLY (title-guarded), read-only.
//   node 2026-10-27-e206-check.js <leg> --bar <n> [--expect-headline]
//   --bar n            World_Config sportsStreakHeadline must read n (the self-arm's 5, or the leg's written 2)
//   (default)          no SPORTS_WEEK ripple on Ripple_Ledger at C113; no Story_Seed_Deck C113 row naming a streak
//   --expect-headline  exactly one SPORTS_WEEK economic-event row at C113: Oaks, business-scoped (bar ids), CauseDetail
//                      "Oaks game-week spending — <n> straight wins — …", Magnitude the week's own round(15 × signed) (0..2 on a
//                      win week under .15), TargetIds count = the "<k> bar(s)" in the text; and exactly one C113 ECONOMIC seed
//                      carrying "straight wins". (Engine_Errors +0 is the bench fire's own PASS: benchfire.js fails a new row.)
// Writes nothing to any sheet; saves output/engine-sheet/2026-10-27-e206-check-<leg>.json. Exit 0 = PASS, 2 = HOLD.
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const fs = require('fs');
const ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const leg = process.argv[2], bi = process.argv.indexOf('--bar'), bar = bi > 0 ? Number(process.argv[bi + 1]) : NaN;
const expectHeadline = process.argv.includes('--expect-headline');
if (!/^[A-Z][0-9]?[a-z]?$/.test(String(leg || '')) || !Number.isInteger(bar)) throw new Error('usage: <leg> --bar <n> [--expect-headline]');
(async () => {
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const api = google.sheets({ version: 'v4', auth });
  const title = (await api.spreadsheets.get({ spreadsheetId: ID, fields: 'properties.title' })).data.properties.title;
  if (title !== TITLE || ID === process.env.GODWORLD_SHEET_ID) throw new Error('target check failed');
  const val = async range => (await api.spreadsheets.values.get({ spreadsheetId: ID, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || [];
  const [wc, rl, sd, ee] = await Promise.all([val('World_Config!A1:C400'), val('Ripple_Ledger'), val('Story_Seed_Deck'), val('Engine_Errors')]);
  const col = (rows, k) => (rows[0] || []).indexOf(k);
  const out = { leg, at: new Date().toISOString(), hold: [] };
  out.cycleCount = (wc.find(r => r[0] === 'cycleCount') || [])[1];
  out.barRow = wc.filter(r => r[0] === 'sportsStreakHeadline').map(r => r[1]);
  if (out.cycleCount !== 113) out.hold.push('cycleCount ' + out.cycleCount + ' != 113');
  if (out.barRow.length !== 1 || Number(out.barRow[0]) !== bar) out.hold.push('World_Config sportsStreakHeadline ' + JSON.stringify(out.barRow) + ' != [' + bar + ']');
  const rc = col(rl, 'Cycle'), rid = col(rl, 'CauseId');
  const at113 = rl.slice(1).filter(r => Number(r[rc]) === 113);
  out.rippleRowsC113 = at113.length;
  out.sportsWeek = at113.filter(r => /SPORTS_WEEK/.test(String(r[rid]))).map(r => Object.fromEntries(rl[0].map((k, i) => [k, r[i]])));
  const sc = col(sd, 'Cycle');
  out.streakSeeds = sd.slice(1).filter(r => Number(r[sc]) === 113 && /straight (wins|losses)/.test(r.join('|')))
    .map(r => Object.fromEntries(sd[0].map((k, i) => [k, r[i]])));
  out.engineErrors = ee.length - 1;
  if (expectHeadline) {
    const r = out.sportsWeek;
    if (r.length !== 1) out.hold.push('SPORTS_WEEK rows at C113: ' + r.length + ' (want 1)');
    else {
      if (r[0].CauseType !== 'economic-event') out.hold.push('CauseType ' + r[0].CauseType);
      if (!/OAKS/.test(String(r[0].CauseId))) out.hold.push('CauseId ' + r[0].CauseId);
      if (!new RegExp('^Oaks game-week spending — ' + bar + ' straight wins( — |$)').test(String(r[0].CauseDetail))) out.hold.push('CauseDetail ' + r[0].CauseDetail);
      const mag = Number(r[0].Magnitude);
      if (!(Number.isInteger(mag) && mag >= 0 && mag <= 2)) out.hold.push('Magnitude ' + r[0].Magnitude + ' (want the week\'s own 0..2)');
      const k = /— (\d+) bar\(s\)/.exec(String(r[0].CauseDetail));
      const ids = String(r[0].TargetIds || '').split('|').filter(x => /^BIZ-/.test(x));   // rippleLedger.js:55-56, cap 20 + '+N more'
      if (k && (r[0].TargetScope !== 'business' || ids.length !== Math.min(20, Number(k[1])))) out.hold.push('bars named ' + k[1] + ' but TargetScope ' + r[0].TargetScope + ' ids ' + ids.length);
      out.barsNamed = k ? Number(k[1]) : 0;
    }
    if (out.streakSeeds.length !== 1 || out.streakSeeds[0].Domain !== 'ECONOMIC') out.hold.push('C113 streak seeds ' + out.streakSeeds.length + ' ' + JSON.stringify(out.streakSeeds.map(x => x.Domain + '/' + x.Desk)) + ' (want one ECONOMIC)');
  } else {
    if (out.sportsWeek.length) out.hold.push('SPORTS_WEEK rows at C113: ' + out.sportsWeek.length + ' (want 0)');
    if (out.streakSeeds.length) out.hold.push('C113 seeds naming a streak: ' + out.streakSeeds.length + ' (want 0)');
  }
  out.verdict = out.hold.length ? 'HOLD' : 'PASS';
  fs.writeFileSync('/root/GodWorld/output/engine-sheet/2026-10-27-e206-check-' + leg + '.json', JSON.stringify(out, null, 1));
  console.log('e206 ' + leg + ' ' + out.verdict + ' | bar ' + JSON.stringify(out.barRow) + ' | C113 ripple rows ' + out.rippleRowsC113 +
    ', SPORTS_WEEK ' + out.sportsWeek.length + (out.sportsWeek[0] ? ' [' + out.sportsWeek[0].TargetScope + ' mag ' + out.sportsWeek[0].Magnitude + '] "' + out.sportsWeek[0].CauseDetail + '"' : '') +
    ' | streak seeds ' + out.streakSeeds.length + (out.streakSeeds[0] ? ' [' + out.streakSeeds[0].Desk + '/' + out.streakSeeds[0].Domain + '/' + out.streakSeeds[0].Class + ']' : '') +
    ' | Engine_Errors ' + out.engineErrors + (out.hold.length ? '\n  ' + out.hold.join('\n  ') : ''));
  process.exit(out.hold.length ? 2 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
