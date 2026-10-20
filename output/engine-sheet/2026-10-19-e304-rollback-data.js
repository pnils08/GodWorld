// engine.304 rollback — the DATA half (the code half is a clasp push of the 8 files from stage 9 + version cut).
// Run BEFORE the code revert, so stage 9 never meets a Family row or an unprocessed family-own-words row:
//   1. every Generic_Citizens row with Status Family → Status Active, Last ← MaidenName (when set), FamilyOf / FamilyRole /
//      MaidenName cleared; EmergenceCount, hood and EmergenceContext kept (the context gains "engine.304 rolled back").
//   2. every Citizen_Media_Usage row typed family-own-words and not yet Processed → Processed Y (stage 9 would read the
//      type as media coverage).
//   3. every Advancement_Intake1 row a partial Cycle left queued as a family arrival (Notes "(engine.304)", or MatchPopId +
//      MatchType with no HouseholdKey) → cleared, so stage 9 never wires it two-sided (codex final recheck §2).
// Rows that already arrived on the ledger (Status Emerged, wired) stay — they are citizens now. The M–O header stays
// (stage 9 never reads it). Preimage of every touched cell to output/engine-sheet/, then one write per tab, then read back.
//   node 2026-10-19-e304-rollback-data.js --target bench|live [--apply] [--go]   (live --apply needs --go: the builder's word)
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const fs = require('fs');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const LIVE = process.env.GODWORLD_SHEET_ID;
const target = process.argv[process.argv.indexOf('--target') + 1], APPLY = process.argv.includes('--apply');
const colL = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
(async () => {
  if (target !== 'bench' && target !== 'live') throw new Error('--target bench|live');
  if (target === 'live' && APPLY && !process.argv.includes('--go')) throw new Error('REFUSED: a live rollback needs the builder\'s word (--go)');
  if (!LIVE || LIVE === BENCH) throw new Error('REFUSED: env live id missing or equals the bench');
  const id = target === 'bench' ? BENCH : LIVE;
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const title = (await api.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title' })).data.properties.title;
  if ((target === 'bench') !== (title === BENCH_TITLE)) throw new Error('REFUSED: target/title mismatch (' + title + ')');
  const get = async (tab) => (await api.spreadsheets.values.get({ spreadsheetId: id, range: tab, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || [];
  const gc = await get('Generic_Citizens'); const gh = gc[0]; const g = n => gh.indexOf(n);
  if (g('FamilyOf') < 0) { console.log(target, 'Generic_Citizens has no M–O header — nothing linked, nothing to roll back'); }
  const famRows = g('FamilyOf') < 0 ? [] : gc.map((r, i) => ({ r, i })).slice(1).filter(x => String(x.r[g('Status')] || '') === 'Family');
  const us = await get('Citizen_Media_Usage'); const uh = us[0] || []; const u = n => uh.indexOf(n);
  const famUse = (u('UsageType') < 0 || u('Processed') < 0) ? [] : us.map((r, i) => ({ r, i })).slice(1).filter(x => String(x.r[u('UsageType')] || '').toLowerCase() === 'family-own-words' && String(x.r[u('Processed')] || '') !== 'Y');
  const adv = await get('Advancement_Intake1'); const ah = adv[0] || []; const a = n => ah.indexOf(n);
  const famQ = adv.map((r, i) => ({ r, i })).slice(1).filter(x => /\(engine\.304\)/.test(String(x.r[a('Notes')] || '')) ||
    (a('MatchPopId') >= 0 && String(x.r[a('MatchPopId')] || '').trim() && String(x.r[a('MatchType')] || '').trim() && !(a('HouseholdKey') >= 0 && String(x.r[a('HouseholdKey')] || '').trim())));
  console.log(`${target} "${title}": Family rows ${famRows.length} | unprocessed family-own-words rows ${famUse.length} | queued family arrivals ${famQ.length}`);
  if (!APPLY) { famRows.slice(0, 5).forEach(x => console.log('  would release', x.r[g('First')], x.r[g('Last')], '→', x.r[g('MaidenName')] || '(keeps Last)')); console.log('dry run'); return; }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const pre = `/root/GodWorld/output/engine-sheet/2026-10-19-e304-rollback-preimage-${target}-${stamp}.json`;
  fs.writeFileSync(pre, JSON.stringify({ gcHeader: gh, gcRows: famRows.map(x => ({ sheetRow: x.i + 1, row: x.r })), usageHeader: uh, usageRows: famUse.map(x => ({ sheetRow: x.i + 1, row: x.r })), queueHeader: ah, queueRows: famQ.map(x => ({ sheetRow: x.i + 1, row: x.r })) }));
  const data = [];
  for (const x of famRows) {
    const row = gh.map((_, c) => (x.r[c] === undefined ? '' : x.r[c]));
    row[g('Status')] = 'Active';
    if (String(row[g('MaidenName')] || '').trim()) row[g('Last')] = row[g('MaidenName')];
    row[g('MaidenName')] = ''; row[g('FamilyOf')] = ''; row[g('FamilyRole')] = '';
    if (g('EmergenceContext') >= 0) row[g('EmergenceContext')] = (String(row[g('EmergenceContext')] || '').trim() ? row[g('EmergenceContext')] + ' | ' : '') + 'engine.304 rolled back';
    data.push({ range: `Generic_Citizens!A${x.i + 1}:${colL(gh.length - 1)}${x.i + 1}`, values: [row] });
  }
  for (const x of famUse) data.push({ range: `Citizen_Media_Usage!${colL(u('Processed'))}${x.i + 1}`, values: [['Y']] });
  for (const x of famQ) data.push({ range: `Advancement_Intake1!A${x.i + 1}:${colL(Math.max(ah.length, x.r.length) - 1)}${x.i + 1}`, values: [new Array(Math.max(ah.length, x.r.length)).fill('')] });
  for (let k = 0; k < data.length; k += 400) await api.spreadsheets.values.batchUpdate({ spreadsheetId: id, requestBody: { valueInputOption: 'RAW', data: data.slice(k, k + 400) } });
  const gc2 = await get('Generic_Citizens'); const us2 = await get('Citizen_Media_Usage');
  const leftFam = gc2.slice(1).filter(r => String(r[g('Status')] || '') === 'Family').length;
  const badName = famRows.filter(x => String(x.r[g('MaidenName')] || '').trim() && String(gc2[x.i][g('Last')]) !== String(x.r[g('MaidenName')])).length;
  const leftUse = famUse.filter(x => String(us2[x.i][u('Processed')]) !== 'Y').length;
  const adv2 = await get('Advancement_Intake1'); const leftQ = famQ.filter(x => (adv2[x.i] || []).some(v => String(v).trim() !== '')).length;
  console.log(`read back: Family rows left ${leftFam} | names not restored ${badName} | family usage rows unprocessed ${leftUse} | queued family arrivals left ${leftQ} | preimage ${pre}`);
  if (leftFam || badName || leftUse || leftQ) process.exit(2);
})().catch(e => { console.error(e.message); process.exit(1); });
