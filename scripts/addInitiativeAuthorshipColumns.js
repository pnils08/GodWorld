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

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(ROOT, 'credentials', 'service-account.json'),
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
