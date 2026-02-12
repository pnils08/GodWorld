/**
 * lookupPOPIDs.js
 * Pull specific POPIDs from Simulation_Ledger
 */

require('dotenv').config();
const { google } = require('googleapis');

const SHEET_ID = process.env.GODWORLD_SHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

const TARGET_POPIDS = [
  'POP-00001', 'POP-00002', 'POP-00003', 'POP-00004', 'POP-00018',
  'POP-00019', 'POP-00020', 'POP-00021', 'POP-00022', 'POP-00033',
  'POP-00039', 'POP-00050', 'POP-00095', 'POP-00527', 'POP-00528',
  'POP-00529', 'POP-00531', 'POP-00532'
];

async function main() {
  console.log('=== POPID Lookup ===\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Pull Simulation_Ledger
  console.log('Pulling Simulation_Ledger...\n');
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Simulation_Ledger!A:T',
  });

  const raw = response.data.values;
  const headers = raw[0];
  const data = raw.slice(1);

  // Column indices
  const iPOPID = 0;
  const iFirst = 1;
  const iMiddle = 2;
  const iLast = 3;
  const iOriginGame = 4;
  const iUNI = 5;
  const iMED = 6;
  const iCIV = 7;
  const iClockMode = 8;
  const iTier = 9;
  const iRoleType = 10;
  const iStatus = 11;
  const iBirthYear = 12;
  const iOriginCity = 13;
  const iLifeHistory = 14;
  const iCreatedAt = 15;
  const iLastUpdated = 16;
  const iOriginVault = 17;
  const iUsageCount = 18;
  const iNeighborhood = 19;

  const citizens = [];

  TARGET_POPIDS.forEach(targetPOPID => {
    const row = data.find(r => r && r[iPOPID] === targetPOPID);

    if (!row) {
      console.log(`❌ ${targetPOPID} - NOT FOUND`);
      return;
    }

    const citizen = {
      popid: row[iPOPID],
      firstName: row[iFirst],
      middleName: row[iMiddle] || '',
      lastName: row[iLast] || '',
      fullName: (row[iFirst] + ' ' + (row[iLast] || '')).trim(),
      originGame: row[iOriginGame] || '',
      uni: row[iUNI] || '',
      med: row[iMED] || '',
      civ: row[iCIV] || '',
      clockMode: row[iClockMode] || '',
      tier: row[iTier] || '',
      roleType: row[iRoleType] || '',
      status: row[iStatus] || '',
      birthYear: row[iBirthYear] || '',
      originCity: row[iOriginCity] || '',
      lifeHistory: row[iLifeHistory] || '',
      createdAt: row[iCreatedAt] || '',
      lastUpdated: row[iLastUpdated] || '',
      originVault: row[iOriginVault] || '',
      usageCount: row[iUsageCount] || '0',
      neighborhood: row[iNeighborhood] || ''
    };

    citizens.push(citizen);

    console.log(`✓ ${citizen.popid} - ${citizen.fullName}`);
    console.log(`  Role: ${citizen.roleType}`);
    console.log(`  Tier: ${citizen.tier} | Status: ${citizen.status}`);
    console.log(`  Neighborhood: ${citizen.neighborhood || 'N/A'}`);
    console.log(`  Universe: UNI=${citizen.uni} | MED=${citizen.med} | CIV=${citizen.civ}`);
    console.log(`  Usage: ${citizen.usageCount} times`);
    if (citizen.lifeHistory) {
      console.log(`  LifeHistory: ${citizen.lifeHistory.substring(0, 80)}...`);
    }
    console.log('');
  });

  console.log(`\n=== Found ${citizens.length}/${TARGET_POPIDS.length} citizens ===`);

  // Save to file
  const fs = require('fs');
  fs.writeFileSync(
    '/tmp/popid_lookup.json',
    JSON.stringify(citizens, null, 2)
  );
  console.log('Saved to /tmp/popid_lookup.json');

  return citizens;
}

main().catch(console.error);
