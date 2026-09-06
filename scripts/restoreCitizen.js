#!/usr/bin/env node
/**
 * scripts/restoreCitizen.js — engine.90 Commit 9: Status=Active brings a traded
 * POPID back to Oakland under the SAME POPID.
 *
 *   node scripts/restoreCitizen.js --popid=POP-01052 --cycle=109 --sheet=<id> [--apply] [--live]
 *
 * Runs utilities/archiveCitizenExits.js restoreCitizenPlan_ (the deployable
 * planner) against a named spreadsheet, prints the plan, and with --apply:
 *   flip    — Traded row still on Simulation_Ledger → Status=Active, ReturnedCycle, LastUpdated
 *   restore — archive-only → append the latest snapshot to Simulation_Ledger with
 *             Status=Active, ReturnedCycle, LastUpdated, HealthCause/StatusStartCycle
 *             cleared, MigrationDestination cleared when the hood is canon, a
 *             [Return] LifeHistory line; plus one LifeHistory_Log row. Every prior
 *             Citizen_Archive row is kept — archive is history.
 * Read-back verifies the POPID is Active on Simulation_Ledger exactly once.
 * Fail-loud: deceased, missing everywhere, duplicate SL row, schema drift.
 * --live is required (with --apply) when --sheet is the live id.
 */
require('../lib/env');
const { google } = require('googleapis');
const { restoreCitizenPlan_ } = require('../utilities/archiveCitizenExits');

const args = process.argv.slice(2);
const opt = (k) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : null; };
const POPID = String(opt('popid') || '').trim().toUpperCase();
const CYCLE = Number(opt('cycle'));
const SHEET = opt('sheet');
const APPLY = args.includes('--apply');
const LIVE_OK = args.includes('--live');

async function main() {
  if (!/^POP-\d+$/.test(POPID)) throw new Error('--popid=POP-nnnnn is required');
  if (!Number.isFinite(CYCLE) || CYCLE < 1) throw new Error('--cycle=<current cycle> is required (ReturnedCycle stamp)');
  if (!SHEET) throw new Error('--sheet=<spreadsheetId> is required — this script never guesses a target');
  const isLive = SHEET === process.env.GODWORLD_SHEET_ID;
  if (isLive && APPLY && !LIVE_OK) throw new Error('refusing to --apply against the LIVE sheet without --live');
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const get = async (range) => ((await api.spreadsheets.values.get({ spreadsheetId: SHEET, range })).data.values || []);
  const meta = await api.spreadsheets.get({ spreadsheetId: SHEET, fields: 'sheets.properties.title' });
  const titles = meta.data.sheets.map((s) => s.properties.title);
  const sl = await get('Simulation_Ledger');
  const ar = titles.includes('Citizen_Archive') ? await get('Citizen_Archive') : [];
  const nm = titles.includes('Neighborhood_Map') ? await get('Neighborhood_Map') : [];
  const iHoodNM = nm.length ? nm[0].indexOf('Neighborhood') : -1;
  const canonHoods = iHoodNM >= 0 ? nm.slice(1).map((r) => String(r[iHoodNM] || '').trim()).filter(Boolean) : [];
  const plan = restoreCitizenPlan_(POPID, { slHeaders: sl[0] || [], slRows: sl.slice(1), arHeaders: ar[0] || [], arRows: ar.slice(1) }, CYCLE, { canonHoods });
  console.log(`[restoreCitizen] ${isLive ? 'LIVE' : 'sheet'} ${SHEET} — ${POPID} → ${plan.action} (${plan.reason}) — ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  if (plan.action === 'flip') console.log('  fields:', JSON.stringify(plan.fields), 'on Simulation_Ledger row', plan.slIndex + 2);
  if (plan.action === 'restore') { const h = sl[0]; console.log('  row:', JSON.stringify({ POPID: plan.row[h.indexOf('POPID')], Name: plan.row[h.indexOf('First')] + ' ' + plan.row[h.indexOf('Last')], Status: plan.row[h.indexOf('Status')], Neighborhood: plan.row[h.indexOf('Neighborhood')], ReturnedCycle: plan.row[h.indexOf('ReturnedCycle')], MigrationDestination: plan.row[h.indexOf('MigrationDestination')] })); }
  if (!APPLY || plan.action === 'noop') { console.log('[restoreCitizen] ' + (plan.action === 'noop' ? 'nothing to do' : 'dry run — nothing written')); return; }

  const h = sl[0];
  const colLetter = (i) => { let n = i + 1, s = ''; while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  if (plan.action === 'flip') {
    const rowNum = plan.slIndex + 2;
    const data = Object.keys(plan.fields).map((k) => ({ range: `Simulation_Ledger!${colLetter(h.indexOf(k))}${rowNum}`, values: [[plan.fields[k]]] }));
    await api.spreadsheets.values.batchUpdate({ spreadsheetId: SHEET, requestBody: { valueInputOption: 'RAW', data } });
  } else {
    await api.spreadsheets.values.append({ spreadsheetId: SHEET, range: 'Simulation_Ledger!A:A', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [plan.row] } });
  }
  // LifeHistory_Log row (Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle)
  const name = plan.action === 'restore' ? `${plan.row[h.indexOf('First')]} ${plan.row[h.indexOf('Last')]}`.trim() : `${sl[plan.slIndex + 1][h.indexOf('First')]} ${sl[plan.slIndex + 1][h.indexOf('Last')]}`.trim();
  const hood = plan.action === 'restore' ? plan.row[h.indexOf('Neighborhood')] : sl[plan.slIndex + 1][h.indexOf('Neighborhood')];
  if (titles.includes('LifeHistory_Log')) {
    await api.spreadsheets.values.append({ spreadsheetId: SHEET, range: 'LifeHistory_Log!A:G', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [[new Date().toISOString(), POPID, name, 'Return', 'returned to Oakland (engine.90 restore, same POPID)', hood || '', CYCLE]] } });
  }
  // read back: exactly one Active row for the POPID
  const sl2 = await get('Simulation_Ledger');
  const iPop = h.indexOf('POPID'), iSt = h.indexOf('Status'), iRet = h.indexOf('ReturnedCycle');
  const hits = sl2.slice(1).filter((r) => String(r[iPop] || '').trim().toUpperCase() === POPID);
  if (hits.length !== 1 || String(hits[0][iSt]) !== 'Active' || String(hits[0][iRet]) !== String(CYCLE)) throw new Error('read-back FAILED: ' + JSON.stringify(hits.map((r) => [r[iSt], r[iRet]])));
  const arRows = ar.slice(1).filter((r) => String(r[0] || '').trim().toUpperCase() === POPID).length;
  console.log(`[restoreCitizen] read-back OK — ${POPID} ${name} Active on Simulation_Ledger, ReturnedCycle ${CYCLE}; ${arRows} archive row(s) retained`);
}
main().catch((e) => { console.error('[restoreCitizen] FATAL', e.message); process.exit(1); });
