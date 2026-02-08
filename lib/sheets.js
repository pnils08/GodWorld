/**
 * Google Sheets API client for GodWorld
 *
 * Usage:
 *   const sheets = require('./lib/sheets');
 *   const data = await sheets.getSheetData('Citizens');
 */

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

let sheetsClient = null;

/**
 * Initialize and return the Sheets API client
 */
async function getClient() {
  if (sheetsClient) return sheetsClient;

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || './credentials/service-account.json';

  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(credentialsPath),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Get the spreadsheet ID from environment
 */
function getSpreadsheetId() {
  const id = process.env.GODWORLD_SHEET_ID;
  if (!id) {
    throw new Error('GODWORLD_SHEET_ID not set in environment');
  }
  return id;
}

/**
 * Fetch all data from a named sheet/tab
 * @param {string} sheetName - The name of the tab (e.g., 'Citizens', 'Policies')
 * @returns {Promise<Array<Array<string>>>} - 2D array of cell values
 */
async function getSheetData(sheetName) {
  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName
  });

  return response.data.values || [];
}

/**
 * Fetch data and convert to array of objects using first row as headers
 * @param {string} sheetName - The name of the tab
 * @returns {Promise<Array<Object>>} - Array of row objects
 */
async function getSheetAsObjects(sheetName) {
  const data = await getSheetData(sheetName);
  if (data.length < 2) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  });
}

/**
 * Get metadata about all sheets/tabs in the spreadsheet
 * @returns {Promise<Array<{title: string, index: number}>>}
 */
async function listSheets() {
  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await client.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties'
  });

  return response.data.sheets.map(s => ({
    title: s.properties.title,
    index: s.properties.index
  }));
}

/**
 * Test the connection by fetching spreadsheet metadata
 * @returns {Promise<{title: string, sheets: Array}>}
 */
async function testConnection() {
  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await client.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title,sheets.properties.title'
  });

  return {
    title: response.data.properties.title,
    sheets: response.data.sheets.map(s => s.properties.title)
  };
}

/**
 * Append rows to a sheet
 * @param {string} sheetName - The name of the tab
 * @param {Array<Array>} rows - 2D array of values to append
 * @returns {Promise<number>} - Number of rows appended
 */
async function appendRows(sheetName, rows) {
  if (!rows || rows.length === 0) return 0;

  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await client.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows
    }
  });

  return response.data.updates.updatedRows || rows.length;
}

/**
 * Update a specific range with values
 * @param {string} range - A1 notation range (e.g., 'Sheet1!G2:G16')
 * @param {Array<Array>} values - 2D array of values
 */
async function updateRange(range, values) {
  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  await client.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values }
  });
}

/**
 * Batch update multiple ranges
 * @param {Array<{range: string, values: Array<Array>}>} updates
 */
async function batchUpdate(updates) {
  if (!updates || updates.length === 0) return;

  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  await client.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates
    }
  });
}

module.exports = {
  getClient,
  getSheetData,
  getSheetAsObjects,
  appendRows,
  updateRange,
  batchUpdate,
  listSheets,
  testConnection
};
