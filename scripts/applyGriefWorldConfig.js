/**
 * applyGriefWorldConfig.js — engine.94 grief calibration migration.
 *
 * Adds the six approved grief calibration rows to World_Config. Existing rows
 * must either match exactly or the script fails; it never silently retunes a
 * world. Dry-run is the default and apply requires an explicit matching target.
 *
 * Usage:
 *   node scripts/applyGriefWorldConfig.js --sheet-id <id>
 *   node scripts/applyGriefWorldConfig.js --sheet-id <id> --apply \
 *     --confirm-sheet-id <same-id>
 */

const { google } = require('googleapis');
require('/root/GodWorld/lib/env');

const CONFIG_ROWS = [
  ['griefDurationCycles', 3, 'engine.94 ordinary grief duration in Cycles'],
  ['griefHolidayDurationCycles', 5, 'engine.94 stress-holiday grief duration in Cycles'],
  ['griefParticipationMultiplier', 0.80, 'engine.94 active-grief atmospheric participation multiplier'],
  ['griefPublicActivityMultiplier', 0.75, 'engine.94 public and out-and-about pool multiplier'],
  ['griefSupportMultiplier', 1.25, 'engine.94 living-support pool multiplier'],
  ['griefResponseChance', 0.35, 'engine.94 maximum-one reserved response probability']
];

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

async function sheetsApi() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || '/root/.config/godworld/credentials/service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

async function readConfig(api, sheetId) {
  const response = await api.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'World_Config!A:C'
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
  const before = await readConfig(api, args.sheetId);
  const plan = inspectConfig(before);

  console.log(`target: ${title || '(untitled)'}`);
  console.log(`${args.apply ? 'APPLY' : 'dry-run'}: ${plan.additions.length} row(s) to add; ${plan.existing.length} already exact`);
  for (const row of plan.additions) console.log(`  ADD ${row[0]} = ${row[1]}`);
  for (const row of plan.existing) console.log(`  KEEP ${row.key} = ${row.value} (row ${row.rowNumber})`);

  if (!args.apply) {
    console.log('dry-run — nothing written.');
    return;
  }
  if (plan.additions.length) {
    await api.spreadsheets.values.append({
      spreadsheetId: args.sheetId,
      range: 'World_Config!A:C',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: plan.additions }
    });
  }

  const afterPlan = inspectConfig(await readConfig(api, args.sheetId));
  if (afterPlan.additions.length) {
    throw new Error(`read-back verification failed: ${afterPlan.additions.length} key(s) still absent`);
  }
  console.log(`verified ${afterPlan.existing.length}/${CONFIG_ROWS.length} grief config rows.`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('ERR', err.message);
    process.exit(1);
  });
}

module.exports = { CONFIG_ROWS, parseArgs, inspectConfig };
