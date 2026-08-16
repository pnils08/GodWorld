#!/usr/bin/env node
'use strict';

/**
 * civic.22 — append Proposer / ProposingOffice / ProposedCycle to Initiative_Tracker.
 *
 * Default: fixture dry-run. Does not open a sheet.
 * Live read:  --live-dry          (engine-sheet)
 * Live write: --apply --i-am-engine-sheet
 *
 * Existing LeadFaction cells are never rewritten.
 * Existing authorship cells stay blank unless --backfill-mayor (optional, off).
 *
 *   node scripts/addInitiativeAuthorshipColumns.js
 *   node scripts/addInitiativeAuthorshipColumns.js --create-example
 */

// Loads GODWORLD_SHEET_ID + GOOGLE_APPLICATION_CREDENTIALS via dotenvx. Without
// it --live-dry and --apply both die on "GODWORLD_SHEET_ID not set"; every other
// live-touching script in scripts/ opens with this same line.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const {
  AUTHORSHIP_HEADERS,
  TRACKER_HEADERS_31,
  createInitiative,
  loadOfficeSeats,
} = require('./createInitiative');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(__dirname, '__fixtures__', 'initiative-tracker-c103.json');
const APPLY = process.argv.includes('--apply');
const ES_GATE = process.argv.includes('--i-am-engine-sheet');
const LIVE_DRY = process.argv.includes('--live-dry');
const BACKFILL_MAYOR = process.argv.includes('--backfill-mayor');
const CREATE_EXAMPLE = process.argv.includes('--create-example');
const SHEET_NAME = 'Initiative_Tracker';

function loadFixture() {
  return JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
}

function planColumnAdd(headers, rows, opts) {
  const o = opts || {};
  const have = headers || [];
  const already = AUTHORSHIP_HEADERS.filter(function (h) { return have.indexOf(h) >= 0; });
  const missing = AUTHORSHIP_HEADERS.filter(function (h) { return have.indexOf(h) < 0; });
  if (already.length && missing.length) {
    throw new Error('partial authorship headers present: ' + already.join(', '));
  }
  const nextHeaders = missing.length ? have.concat(AUTHORSHIP_HEADERS) : have.slice();
  const nextRows = (rows || []).map(function (r) {
    const copy = Object.assign({}, r);
    AUTHORSHIP_HEADERS.forEach(function (h) {
      if (copy[h] == null || copy[h] === '') {
        copy[h] = o.backfillMayor ? mayorBackfill(h) : '';
      }
    });
    return copy;
  });
  return {
    sheet: SHEET_NAME,
    added: missing,
    alreadyPresent: already,
    headerCountBefore: have.length,
    headerCountAfter: nextHeaders.length,
    headersAfter: nextHeaders,
    rows: nextRows,
    leadFactionTouched: false,
    backfill: o.backfillMayor ? 'mayor' : 'blank',
  };
}

function mayorBackfill(header) {
  if (header === 'Proposer') return 'Avery Santana';
  if (header === 'ProposingOffice') return 'MAYOR-01';
  return '';
}

function assertExpectedAfter(headers) {
  AUTHORSHIP_HEADERS.forEach(function (h) {
    if (headers.indexOf(h) < 0) throw new Error('expected ' + h + ' after add');
  });
  if (headers.length !== TRACKER_HEADERS_31.length && headers.slice(-3).join() !== AUTHORSHIP_HEADERS.join()) {
    throw new Error('authorship columns must append after current last header');
  }
}

async function readLiveHeaders() {
  const sheets = require('../lib/sheets');
  const data = await sheets.getRawSheetData(SHEET_NAME);
  return { headers: data[0] || [], rowCount: Math.max(0, data.length - 1) };
}

async function applyLive(plan) {
  const { google } = require('googleapis');
  const sheetsLib = require('../lib/sheets');
  const spreadsheetId = process.env.GODWORLD_SHEET_ID;
  if (!spreadsheetId) throw new Error('GODWORLD_SHEET_ID missing');

  // Same credential resolution as lib/sheets.js. The previous hardcoded
  // <repo>/credentials/service-account.json does not exist in this deployment —
  // the key lives at GOOGLE_APPLICATION_CREDENTIALS (/root/.config/godworld/...).
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || '/root/.config/godworld/credentials/service-account.json';
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(credentialsPath),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: spreadsheetId,
    fields: 'sheets(properties(sheetId,title,gridProperties))',
  });
  const tab = (meta.data.sheets || []).find(function (s) {
    return s.properties.title === SHEET_NAME;
  });
  if (!tab) throw new Error(SHEET_NAME + ' tab not found');
  if (!plan.added.length) return { wrote: false, reason: 'already present' };

  const start = plan.headerCountBefore;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: {
      requests: [{
        insertDimension: {
          range: {
            sheetId: tab.properties.sheetId,
            dimension: 'COLUMNS',
            startIndex: start,
            endIndex: start + plan.added.length,
          },
        },
      }],
    },
  });
  const startLetter = sheetsLib.columnIndexToLetter
    ? sheetsLib.columnIndexToLetter(start)
    : colLetter(start);
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: SHEET_NAME + '!' + startLetter + '1',
    valueInputOption: 'RAW',
    requestBody: { values: [plan.added] },
  });
  return { wrote: true, added: plan.added };
}

/**
 * Live backfill of the authorship cells.
 *
 * Repair (engine-sheet, S376): --backfill-mayor was advertised for live use but
 * could never fire there — the live branch calls planColumnAdd(headers, [], ...)
 * with NO rows, so plan.rows was always empty and applyLive only ever wrote the
 * header cells. The flag silently did nothing outside the fixture path.
 *
 * Writes Proposer + ProposingOffice only. ProposedCycle stays blank on purpose:
 * the canon ruling is that the Mayor authored these six, which settles WHO, not
 * WHEN. VoteCycle is when a thing was voted, not proposed — copying it across
 * would invent a date. Blank is honest; a wrong number would not be.
 *
 * Only fills cells that are currently empty — never overwrites an existing
 * attribution.
 */
async function backfillLive(headers) {
  const { google } = require('googleapis');
  const spreadsheetId = process.env.GODWORLD_SHEET_ID;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || '/root/.config/godworld/credentials/service-account.json';
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(credentialsPath),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const iProposer = headers.indexOf('Proposer');
  const iOffice = headers.indexOf('ProposingOffice');
  if (iProposer < 0 || iOffice < 0) throw new Error('authorship columns absent — add them first');

  const read = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: SHEET_NAME + '!A1:' + colLetter(headers.length - 1) + '1000',
  });
  const rows = (read.data.values || []).slice(1);
  const updates = [];
  rows.forEach(function (r, i) {
    const rowNum = i + 2;
    if (!r || !String(r[0] || '').trim()) return;       // no InitiativeID → skip
    if (String(r[iProposer] || '').trim()) return;      // already attributed
    updates.push({
      range: SHEET_NAME + '!' + colLetter(iProposer) + rowNum + ':' + colLetter(iOffice) + rowNum,
      values: [[mayorBackfill('Proposer'), mayorBackfill('ProposingOffice')]],
    });
  });

  if (!updates.length) return { filled: 0, reason: 'all rows already attributed' };
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data: updates },
  });
  return { filled: updates.length };
}

function colLetter(col) {
  let letter = '';
  let num = col;
  while (num >= 0) {
    letter = String.fromCharCode(65 + (num % 26)) + letter;
    num = Math.floor(num / 26) - 1;
  }
  return letter;
}

function printPlan(plan, extra) {
  console.log('Initiative_Tracker authorship columns (civic.22)');
  console.log('  before: ' + plan.headerCountBefore + '  after: ' + plan.headerCountAfter);
  console.log('  add: ' + (plan.added.join(', ') || '(none — already present)'));
  console.log('  backfill: ' + plan.backfill);
  console.log('  LeadFaction rewritten: ' + plan.leadFactionTouched);
  if (extra) console.log(extra);
}

async function main() {
  if (APPLY && !ES_GATE) {
    console.error('refusing --apply without --i-am-engine-sheet');
    process.exit(2);
  }

  if (APPLY || LIVE_DRY) {
    const live = await readLiveHeaders();
    const plan = planColumnAdd(live.headers, [], { backfillMayor: BACKFILL_MAYOR });
    printPlan(plan, '  live rows: ' + live.rowCount);
    if (LIVE_DRY && !APPLY) {
      console.log('DRY RUN — live sheet not written');
      return;
    }
    const result = await applyLive(plan);
    const after = await readLiveHeaders();
    console.log('WRITTEN', JSON.stringify(result));
    console.log('read-back headers: ' + after.headers.length + '  last3=' + after.headers.slice(-3).join(','));
    if (BACKFILL_MAYOR) {
      const filled = await backfillLive(after.headers);
      console.log('BACKFILL', JSON.stringify(filled));
    }
    return;
  }

  const fix = loadFixture();
  const plan = planColumnAdd(fix.headers, fix.rows, { backfillMayor: BACKFILL_MAYOR });
  assertExpectedAfter(plan.headersAfter);
  printPlan(plan, '  fixture rows: ' + plan.rows.length);
  const factions = plan.rows.map(function (r) { return r.LeadFaction; });
  console.log('  LeadFaction unchanged: ' + factions.join(','));

  if (CREATE_EXAMPLE) {
    const minted = createInitiative({
      headers: plan.headersAfter,
      rows: plan.rows,
      seats: loadOfficeSeats(),
      spec: {
        name: 'KONO corridor audit (fixture only)',
        type: 'vote',
        policyDomain: 'economic',
        affectedNeighborhoods: 'KONO',
        proposingOffice: 'COUNCIL-D7',
        proposedCycle: 104,
        budget: '',
      },
    });
    console.log('  example mint: ' + minted.row.InitiativeID
      + ' LeadFaction=' + minted.row.LeadFaction
      + ' ProposingOffice=' + minted.row.ProposingOffice);
  }

  console.log('DRY RUN — fixture only, live sheet not opened');
}

module.exports = { planColumnAdd, mayorBackfill, assertExpectedAfter };

if (require.main === module) {
  main().catch(function (err) {
    console.error(err.message || err);
    process.exit(1);
  });
}
