/**
 * applyApprovalCeilingConfig.js — engine.94 Task 5 Sheet migration.
 *
 * Adds the eight approved World_Config values and the three owned-state
 * columns on Civic_Office_Ledger. Existing values/columns must match exactly;
 * conflicts fail before any write. Dry-run is default. Apply requires an
 * explicit matching target confirmation.
 *
 * Usage:
 *   node scripts/applyApprovalCeilingConfig.js --sheet-id <id>
 *   node scripts/applyApprovalCeilingConfig.js --sheet-id <id> --apply \
 *     --confirm-sheet-id <same-id>
 */

const { google } = require('googleapis');
require('/root/GodWorld/lib/env');

const CONFIG_ROWS = [
  ['approvalCeilingThreshold', 80, 'engine.94 approval at or above this value advances the high-approval streak'],
  ['approvalCeilingMinStreakCycles', 3, 'engine.94 minimum consecutive high-approval Cycles before scandal rolls'],
  ['approvalCeilingBaseChance', 0.05, 'engine.94 scandal probability at the minimum streak'],
  ['approvalCeilingChanceStep', 0.05, 'engine.94 added scandal probability per high-approval Cycle beyond the minimum'],
  ['approvalCeilingMaxChance', 0.30, 'engine.94 maximum per-Cycle high-approval scandal probability'],
  ['approvalCeilingScandalDurationCycles', 3, 'engine.94 auto-scandal duration in Cycles'],
  ['approvalCeilingApprovalDrop', 12, 'engine.94 immediate approval-point drop when an auto-scandal fires'],
  ['approvalCeilingElectionPenalty', 25, 'engine.94 incumbent-score penalty while Status is scandal']
];

const CIVIC_COLUMNS = ['HighApprovalStreak', 'AutoScandalUntilCycle', 'AutoScandalSource'];

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

function inspectConfig(values) {
  const header = values[0] || [];
  if (header[0] !== 'Key' || header[1] !== 'Value' || header[2] !== 'Description') {
    throw new Error('World_Config A:C header must be Key, Value, Description');
  }
  const byKey = {};
  for (let i = 1; i < values.length; i++) {
    const key = String((values[i] || [])[0] || '').trim();
    if (!key) continue;
    if (byKey[key]) throw new Error(`World_Config duplicate key: ${key}`);
    byKey[key] = { rowNumber: i + 1, values: values[i] };
  }

  const additions = [];
  const existing = [];
  for (const expected of CONFIG_ROWS) {
    const current = byKey[expected[0]];
    if (!current) {
      additions.push(expected.slice());
      continue;
    }
    const currentValue = current.values[1];
    if (currentValue === '' || currentValue === null || currentValue === undefined ||
        Number(currentValue) !== expected[1]) {
      throw new Error(`World_Config.${expected[0]} conflicts: expected ${expected[1]}, found ${String(currentValue)}`);
    }
    existing.push({ key: expected[0], rowNumber: current.rowNumber, value: Number(currentValue) });
  }
  return { additions, existing };
}

function inspectCivicHeader(header) {
  const required = ['OfficeId', 'Status', 'Approval'];
  for (const name of required) {
    if (header.indexOf(name) < 0) throw new Error(`Civic_Office_Ledger missing base header: ${name}`);
  }
  for (const name of CIVIC_COLUMNS) {
    if (header.filter(value => value === name).length > 1) {
      throw new Error(`Civic_Office_Ledger duplicate header: ${name}`);
    }
  }

  let lastNonBlank = -1;
  for (let i = 0; i < header.length; i++) {
    if (String(header[i] || '').trim()) lastNonBlank = i;
  }
  const present = CIVIC_COLUMNS.map(name => header.indexOf(name));
  const presentCount = present.filter(index => index >= 0).length;
  if (presentCount === CIVIC_COLUMNS.length) {
    if (!(present[1] === present[0] + 1 && present[2] === present[1] + 1)) {
      throw new Error('Civic_Office_Ledger approval-ceiling headers are not contiguous/in order');
    }
    return { additions: [], existing: CIVIC_COLUMNS.slice(), startIndex: present[0] };
  }

  if (presentCount > 0) {
    for (let i = 0; i < presentCount; i++) {
      if (present[i] < 0) throw new Error('Civic_Office_Ledger approval-ceiling header prefix is incomplete');
    }
    if (present[presentCount - 1] !== lastNonBlank) {
      throw new Error('Civic_Office_Ledger partial approval-ceiling headers are not at the append edge');
    }
    return {
      additions: CIVIC_COLUMNS.slice(presentCount),
      existing: CIVIC_COLUMNS.slice(0, presentCount),
      startIndex: present[0]
    };
  }

  return { additions: CIVIC_COLUMNS.slice(), existing: [], startIndex: lastNonBlank + 1 };
}

function columnLabel(indexZeroBased) {
  let n = indexZeroBased + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

async function sheetsApi() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || '/root/.config/godworld/credentials/service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

async function readState(api, sheetId) {
  const response = await api.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: ['World_Config!A:C', 'Civic_Office_Ledger!1:1']
  });
  const ranges = response.data.valueRanges || [];
  return {
    config: (ranges[0] && ranges[0].values) || [],
    civicHeader: ((ranges[1] && ranges[1].values) || [])[0] || []
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const api = await sheetsApi();
  const metadata = await api.spreadsheets.get({
    spreadsheetId: args.sheetId,
    fields: 'properties.title'
  });
  const title = metadata.data.properties && metadata.data.properties.title;
  const before = await readState(api, args.sheetId);
  const configPlan = inspectConfig(before.config);
  const headerPlan = inspectCivicHeader(before.civicHeader);

  console.log(`target: ${title || '(untitled)'}`);
  console.log(`${args.apply ? 'APPLY' : 'dry-run'}: ${configPlan.additions.length} config row(s), ` +
    `${headerPlan.additions.length} civic column(s) to add`);
  for (const row of configPlan.additions) console.log(`  ADD World_Config.${row[0]} = ${row[1]}`);
  for (const name of headerPlan.additions) console.log(`  ADD Civic_Office_Ledger.${name}`);

  if (!args.apply) {
    console.log('dry-run — nothing written.');
    return;
  }

  if (headerPlan.additions.length) {
    const start = headerPlan.startIndex + headerPlan.existing.length;
    const end = start + headerPlan.additions.length - 1;
    await api.spreadsheets.values.update({
      spreadsheetId: args.sheetId,
      range: `Civic_Office_Ledger!${columnLabel(start)}1:${columnLabel(end)}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headerPlan.additions] }
    });
  }
  if (configPlan.additions.length) {
    await api.spreadsheets.values.append({
      spreadsheetId: args.sheetId,
      range: 'World_Config!A:C',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: configPlan.additions }
    });
  }

  const after = await readState(api, args.sheetId);
  const afterConfig = inspectConfig(after.config);
  const afterHeader = inspectCivicHeader(after.civicHeader);
  if (afterConfig.additions.length || afterHeader.additions.length) {
    throw new Error('read-back verification failed');
  }
  console.log(`verified ${afterConfig.existing.length}/${CONFIG_ROWS.length} config rows and ` +
    `${afterHeader.existing.length}/${CIVIC_COLUMNS.length} civic columns.`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('ERR', error.message);
    process.exit(1);
  });
}

module.exports = {
  CONFIG_ROWS,
  CIVIC_COLUMNS,
  parseArgs,
  inspectConfig,
  inspectCivicHeader,
  columnLabel
};
