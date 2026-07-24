/**
 * repairContentLedgerCivicTags.js
 *
 * Reversible, bounded repair for Event_Content_Ledger rows whose first tag is
 * the unsupported source:civic. The existing loader recognizes
 * source:civicNews and routes it to Civic Perception; no content text or
 * conditions are changed.
 *
 * Usage:
 *   node scripts/repairContentLedgerCivicTags.js --sheet-id <id>
 *   node scripts/repairContentLedgerCivicTags.js --sheet-id <id> --apply \
 *     --confirm-sheet-id <same-id>
 *
 * Dry-run is the default. Apply never accepts an environment-default target.
 */

const { google } = require('googleapis');
require('/root/GodWorld/lib/env');
const { HDR, loaderAccepts } = require('./draftContentRows.js');

function parseArgs(argv) {
  const args = { apply: false, sheetId: null, confirmSheetId: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') args.apply = true;
    else if (argv[i] === '--sheet-id') args.sheetId = argv[++i];
    else if (argv[i] === '--confirm-sheet-id') args.confirmSheetId = argv[++i];
  }
  if (!args.sheetId) throw new Error('--sheet-id is required; environment defaults are forbidden');
  if (args.apply && args.confirmSheetId !== args.sheetId) {
    throw new Error('--apply requires --confirm-sheet-id matching --sheet-id');
  }
  return args;
}

async function sheetsApi() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || '/root/.config/godworld/credentials/service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

function repairFirstTag(tags) {
  const list = String(tags || '').split(',').map(tag => tag.trim()).filter(Boolean);
  if (list[0] !== 'source:civic') return null;
  list[0] = 'source:civicNews';
  return list.join(',');
}

function planRepairs(values) {
  const header = values[0] || [];
  if (HDR.some((name, i) => header[i] !== name)) {
    throw new Error('Event_Content_Ledger A:I header does not match the loader contract');
  }

  const repairs = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    const after = repairFirstTag(row[6]);
    if (!after) continue;
    const candidate = {
      kind: String(row[0] || ''),
      poolKey: String(row[1] || ''),
      slot: String(row[2] || ''),
      text: String(row[3] || ''),
      weight: row[4] === '' || row[4] === undefined ? 1 : Number(row[4]),
      conditions: String(row[5] || ''),
      tags: after,
      grain: String(row[7] || '')
    };
    if (!loaderAccepts(candidate, String(row[8] || 'yes'))) {
      throw new Error(`row ${i + 1} would still fail the live loader after tag repair`);
    }
    repairs.push({
      rowNumber: i + 1,
      before: String(row[6] || ''),
      after,
      poolKey: candidate.poolKey,
      text: candidate.text
    });
  }
  return repairs;
}

function findRejectedRows(values, withCivicRepair) {
  const rejected = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    if (!row.some(value => value !== '' && value !== undefined && value !== null)) continue;
    if (String(row[8] || '').toLowerCase() === 'no') continue;
    const repairedTags = withCivicRepair ? repairFirstTag(row[6]) : null;
    const candidate = {
      kind: String(row[0] || ''),
      poolKey: String(row[1] || ''),
      slot: String(row[2] || ''),
      text: String(row[3] || ''),
      weight: row[4] === '' || row[4] === undefined ? 1 : Number(row[4]),
      conditions: String(row[5] || ''),
      tags: repairedTags || String(row[6] || ''),
      grain: String(row[7] || '')
    };
    if (!loaderAccepts(candidate, 'yes')) {
      rejected.push({
        rowNumber: i + 1,
        kind: candidate.kind,
        poolKey: candidate.poolKey,
        tags: candidate.tags,
        conditions: candidate.conditions,
        text: candidate.text
      });
    }
  }
  return rejected;
}

async function readLedger(api, sheetId) {
  const response = await api.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Event_Content_Ledger!A1:I'
  });
  return response.data.values || [];
}

async function main() {
  const args = parseArgs(process.argv);
  const api = await sheetsApi();
  const metadata = await api.spreadsheets.get({
    spreadsheetId: args.sheetId,
    fields: 'properties.title'
  });
  const title = metadata.data.properties && metadata.data.properties.title;
  console.log(`target: ${title || '(untitled)'} | ${args.sheetId}`);

  const before = await readLedger(api, args.sheetId);
  const repairs = planRepairs(before);
  const rejectedBefore = findRejectedRows(before, false);
  const rejectedAfter = findRejectedRows(before, true);
  console.log(`loader audit: ${rejectedBefore.length} rejected now; ${rejectedAfter.length} would remain after repair`);
  for (const row of rejectedAfter) {
    console.log(`  STILL REJECTED row ${row.rowNumber} ${row.kind || '(no kind)'}/${row.poolKey || '(no pool)'} | ${row.tags || '(no tags)'} | ${row.conditions || '(no conditions)'}`);
  }
  console.log(`${args.apply ? 'APPLY' : 'dry-run'}: ${repairs.length} source:civic row(s) -> source:civicNews`);
  for (const repair of repairs) {
    console.log(`  G${repair.rowNumber} ${repair.poolKey} | ${repair.before} -> ${repair.after}`);
  }

  if (!args.apply) {
    console.log('dry-run — nothing written.');
    return;
  }
  if (!repairs.length) {
    console.log('nothing to repair.');
    return;
  }

  await api.spreadsheets.values.batchUpdate({
    spreadsheetId: args.sheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: repairs.map(repair => ({
        range: `Event_Content_Ledger!G${repair.rowNumber}`,
        values: [[repair.after]]
      }))
    }
  });

  const after = await readLedger(api, args.sheetId);
  const mismatches = repairs.filter(repair =>
    String((after[repair.rowNumber - 1] || [])[6] || '') !== repair.after
  );
  if (mismatches.length) {
    throw new Error(`read-back verification failed for ${mismatches.length} row(s)`);
  }
  console.log(`wrote + verified ${repairs.length} tag repair(s).`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('ERR', err.message);
    process.exit(1);
  });
}

module.exports = { parseArgs, repairFirstTag, planRepairs, findRejectedRows };
