#!/usr/bin/env node
/**
 * scripts/ensureCitizenArchive.js — engine.90 Commits 2 + 3, the operator half.
 *
 * Idempotent, read-back-verified, one spreadsheet per run:
 *   1. World_Config `popIdHighWater` = max(--seed, that sheet's Simulation_Ledger max)
 *      (appended only when absent; an existing mark is never lowered)
 *   2. World_Config `citizenArchiveEnabled` = 0 when absent (the mover flag; flip by hand)
 *   3. Citizen_Archive tab: Simulation_Ledger header + CITIZEN_ARCHIVE_META_HEADERS,
 *      zero body rows, frozen header (created only when absent; never touched after)
 *   4. World_Config `citizenArchiveTabLive` = 1 once the tab is verified present
 *
 * Usage:
 *   node scripts/ensureCitizenArchive.js --sheet=<spreadsheetId> [--seed=1083] [--apply] [--live]
 * Dry-run by default. --live is required (in addition to --apply) when --sheet is
 * the GODWORLD_SHEET_ID in the env: the live seed and the live tab are the
 * builder's call (plan §Rollout). Bench runs need --sheet + --apply only.
 */
require('../lib/env');
const path = require('path');
const { google } = require('googleapis');
const { CITIZEN_ARCHIVE_META_HEADERS, citizenArchiveHeaders_ } = require('../utilities/archiveCitizenExits');
const { popIdNext_ } = require('../utilities/popIdAllocator');

const args = process.argv.slice(2);
const opt = (k) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : null; };
const SHEET = opt('sheet');
const SEED = Number(opt('seed') || 0);
const APPLY = args.includes('--apply');
const LIVE_OK = args.includes('--live');
const TAB = 'Citizen_Archive';

async function main() {
  if (!SHEET) throw new Error('--sheet=<spreadsheetId> is required (no default — this script never guesses a target)');
  const isLive = SHEET === process.env.GODWORLD_SHEET_ID;
  if (isLive && APPLY && !LIVE_OK) throw new Error('refusing to --apply against the LIVE sheet without --live (builder-approved write)');
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const get = async (range) => ((await api.spreadsheets.values.get({ spreadsheetId: SHEET, range })).data.values || []);
  const meta = await api.spreadsheets.get({ spreadsheetId: SHEET, fields: 'sheets.properties.title' });
  const titles = meta.data.sheets.map((s) => s.properties.title);
  console.log(`[ensureCitizenArchive] target ${isLive ? 'LIVE' : 'sheet'} ${SHEET} — ${titles.length} tabs — ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  const slHeader = (await get('Simulation_Ledger!1:1'))[0] || [];
  if (slHeader.indexOf('POPID') !== 0) throw new Error('Simulation_Ledger header does not start with POPID — refusing');
  const popCol = await get('Simulation_Ledger!A:A');
  let activeMax = 0;
  for (const r of popCol.slice(1)) { const m = /^POP-(\d+)$/.exec(String(r[0] || '').trim()); if (m && +m[1] > activeMax) activeMax = +m[1]; }
  const mark = Math.max(SEED, activeMax);
  const wc = await get('World_Config!A:B');
  const rowOf = (k) => wc.findIndex((r) => String(r[0] || '').trim() === k);
  const plan = [];
  if (rowOf('popIdHighWater') < 0) plan.push({ append: ['popIdHighWater', mark], why: `max(seed ${SEED}, active max ${activeMax})` });
  else console.log(`  popIdHighWater present = ${wc[rowOf('popIdHighWater')][1]} (active max ${activeMax}; next mint POP-${String(popIdNext_(wc[rowOf('popIdHighWater')][1], activeMax)).padStart(5, '0')})`);
  if (rowOf('citizenArchiveEnabled') < 0) plan.push({ append: ['citizenArchiveEnabled', 0], why: 'mover flag, off' });
  else console.log(`  citizenArchiveEnabled present = ${wc[rowOf('citizenArchiveEnabled')][1]}`);
  const tabPresent = titles.includes(TAB);
  const headers = citizenArchiveHeaders_(slHeader);
  if (!tabPresent) plan.push({ tab: headers, why: `${slHeader.length} SL columns + ${CITIZEN_ARCHIVE_META_HEADERS.length} metadata = ${headers.length}` });
  else {
    const have = (await get(TAB + '!1:1'))[0] || [];
    const same = JSON.stringify(have) === JSON.stringify(headers);
    console.log(`  ${TAB} present, ${have.length} cols, header ${same ? 'matches' : 'DIFFERS from'} SL+meta contract`);
    if (!same) throw new Error(TAB + ' header drifted from the contract — fix by hand, this script never rewrites an existing archive header');
  }
  if (rowOf('citizenArchiveTabLive') < 0) plan.push({ append: ['citizenArchiveTabLive', 0], why: 'set to 1 after the tab is verified' });
  plan.push({ flag: 1, why: 'citizenArchiveTabLive=1 once the tab reads back' });
  for (const p of plan) console.log('  plan:', JSON.stringify(p.append || (p.tab ? { addSheet: TAB, cols: p.tab.length } : { citizenArchiveTabLive: p.flag })), '—', p.why);
  if (!APPLY) { console.log('[ensureCitizenArchive] dry run — nothing written'); return; }

  const appends = plan.filter((p) => p.append).map((p) => p.append);
  if (appends.length) await api.spreadsheets.values.append({ spreadsheetId: SHEET, range: 'World_Config!A:B', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: appends } });
  const tabPlan = plan.find((p) => p.tab);
  if (tabPlan) {
    await api.spreadsheets.batchUpdate({ spreadsheetId: SHEET, requestBody: { requests: [{ addSheet: { properties: { title: TAB, gridProperties: { rowCount: 200, columnCount: headers.length, frozenRowCount: 1 } } } }] } });
    await api.spreadsheets.values.update({ spreadsheetId: SHEET, range: TAB + '!1:1', valueInputOption: 'RAW', requestBody: { values: [headers] } });
  }
  // read back, then flag
  const back = (await get(TAB + '!1:1'))[0] || [];
  if (JSON.stringify(back) !== JSON.stringify(headers)) throw new Error('read-back: ' + TAB + ' header mismatch — citizenArchiveTabLive NOT set');
  const wc2 = await get('World_Config!A:B');
  const fi = wc2.findIndex((r) => String(r[0] || '').trim() === 'citizenArchiveTabLive');
  if (fi < 0) throw new Error('read-back: citizenArchiveTabLive row missing after append');
  if (String(wc2[fi][1]) !== '1') await api.spreadsheets.values.update({ spreadsheetId: SHEET, range: 'World_Config!B' + (fi + 1), valueInputOption: 'RAW', requestBody: { values: [[1]] } });
  const wc3 = await get('World_Config!A:B');
  console.log('[ensureCitizenArchive] read-back:', JSON.stringify(wc3.filter((r) => /^(popIdHighWater|citizenArchiveEnabled|citizenArchiveTabLive)$/.test(String(r[0] || '').trim()))), '| ' + TAB + ' cols', back.length);
}

main().catch((e) => { console.error('[ensureCitizenArchive] FATAL', e.message); process.exit(1); });
