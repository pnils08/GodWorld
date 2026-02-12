/**
 * saveCivicNarratives.js
 *
 * Pull civic officials from Civic_Office_Ledger and Simulation_Ledger
 * Create narrative memory saves for supermemory
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const { execSync } = require('child_process');

const SHEET_ID = process.env.GODWORLD_SHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

async function main() {
  console.log('=== Civic Officials Narrative Memory Builder ===\n');

  // Load service account credentials
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Pull Civic_Office_Ledger
  console.log('Pulling Civic_Office_Ledger...');
  const civicResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Civic_Office_Ledger!A:Z',
  });
  const civicRaw = civicResponse.data.values;
  const civicHeaders = civicRaw[0];
  const civicData = civicRaw.slice(1);

  // Pull Simulation_Ledger for POPID lookup
  console.log('Pulling Simulation_Ledger...');
  const simResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Simulation_Ledger!A:T',
  });
  const simRaw = simResponse.data.values;
  const simHeaders = simRaw[0];
  const simData = simRaw.slice(1);

  // Create POPID lookup map
  const popidMap = {};
  simData.forEach(row => {
    if (!row || row.length === 0) return;
    const popid = row[0]; // Column A: POPID
    const first = row[1]; // Column B: First
    const last = row[3]; // Column D: Last
    if (popid && first) {
      const fullName = (first + ' ' + (last || '')).trim();
      popidMap[fullName] = {
        popid: popid,
        tier: row[9], // Column J: Tier
        roleType: row[10], // Column K: RoleType
        status: row[11], // Column L: Status
        neighborhood: row[19] // Column T: Neighborhood
      };
    }
  });

  console.log('POPID map built:', Object.keys(popidMap).length, 'citizens\n');

  // Process civic officials
  const civicOfficials = [];
  const iHolder = civicHeaders.indexOf('Holder');
  const iPopId = civicHeaders.indexOf('PopId');
  const iTitle = civicHeaders.indexOf('Title');
  const iType = civicHeaders.indexOf('Type');
  const iStatus = civicHeaders.indexOf('Status');
  const iDistrict = civicHeaders.indexOf('District');
  const iTerm = civicHeaders.indexOf('TermStart');

  civicData.forEach(row => {
    if (!row || row.length === 0) return;
    const holder = row[iHolder];
    const popid = row[iPopId];
    const title = row[iTitle];
    const type = row[iType];
    const status = row[iStatus];

    if (!holder || !title) return;
    if (status && status.toLowerCase() === 'inactive') return;

    const popidData = popidMap[holder];

    civicOfficials.push({
      name: holder,
      popid: popid || (popidData ? popidData.popid : 'TBD'),
      office: title,
      type: type || '',
      status: status || 'active',
      district: row[iDistrict] || '',
      termStart: row[iTerm] || '',
      tier: popidData ? popidData.tier : '',
      roleType: popidData ? popidData.roleType : '',
      neighborhood: popidData ? popidData.neighborhood : ''
    });
  });

  console.log('Found', civicOfficials.length, 'active civic officials\n');

  // Display officials
  console.log('Civic Officials to Save:\n');
  civicOfficials.forEach((official, i) => {
    console.log(`${i + 1}. ${official.name} (POPID: ${official.popid})`);
    console.log(`   Office: ${official.office}`);
    console.log(`   Type: ${official.type || 'N/A'}`);
    console.log(`   District: ${official.district || 'N/A'}`);
    console.log(`   Tier: ${official.tier || 'N/A'}`);
    console.log('');
  });

  // Save to file for review
  fs.writeFileSync(
    '/tmp/civic_officials.json',
    JSON.stringify(civicOfficials, null, 2)
  );
  console.log('Saved to /tmp/civic_officials.json for review\n');

  return civicOfficials;
}

main().catch(console.error);
