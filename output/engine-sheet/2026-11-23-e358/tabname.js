// rename Engine_Run_Log on SANDBOX 1004 only (edge case c). usage: node tabname.js <from> <to>
require('/root/GodWorld/lib/env');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
(async () => {
  if (B === process.env.GODWORLD_SHEET_ID) throw new Error('target is live — stop');
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const meta = await api.spreadsheets.get({ spreadsheetId: B, fields: 'properties.title,sheets.properties' });
  if (meta.data.properties.title !== 'Sandox_104_c109-live_Simulation_Narrative') throw new Error('not the bench — stop');
  const sh = meta.data.sheets.find(s => s.properties.title === process.argv[2]);
  if (!sh) { console.log('no tab ' + process.argv[2]); process.exit(1); }
  await api.spreadsheets.batchUpdate({ spreadsheetId: B, requestBody: { requests: [{ updateSheetProperties: { properties: { sheetId: sh.properties.sheetId, title: process.argv[3] }, fields: 'title' } }] } });
  console.log('bench tab ' + process.argv[2] + ' -> ' + process.argv[3]);
})().catch(e => { console.error('tabname ERR', e.message); process.exit(2); });
