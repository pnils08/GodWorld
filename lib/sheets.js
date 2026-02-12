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

/**
 * Get raw sheet data (alias for getSheetData for backwards compatibility)
 * @param {string} sheetName - The name of the tab
 * @returns {Promise<Array<Array<string>>>} - 2D array of cell values
 */
async function getRawSheetData(sheetName) {
  return getSheetData(sheetName);
}

/**
 * Create a new sheet/tab with headers
 * @param {string} sheetName - Name of the new sheet
 * @param {Array<string>} headers - Column headers
 * @returns {Promise<void>}
 */
async function createSheet(sheetName, headers) {
  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  // Add the sheet
  await client.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        addSheet: {
          properties: {
            title: sheetName
          }
        }
      }]
    }
  });

  // Add headers if provided
  if (headers && headers.length > 0) {
    await client.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers]
      }
    });
  }
}

/**
 * Delete a sheet/tab
 * @param {string} sheetName - Name of the sheet to delete
 * @returns {Promise<void>}
 */
async function deleteSheet(sheetName) {
  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  // Get sheet ID
  const metadata = await client.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties'
  });

  const sheet = metadata.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  const sheetId = sheet.properties.sheetId;

  // Delete the sheet
  await client.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteSheet: {
          sheetId: sheetId
        }
      }]
    }
  });
}

/**
 * Add columns to a sheet
 * @param {string} sheetName - Name of the sheet
 * @param {number} startRow - Row to write headers (1-indexed)
 * @param {number} startCol - Column index to start (0-indexed)
 * @param {Array<string>} headers - Column headers to add
 * @returns {Promise<void>}
 */
async function appendColumns(sheetName, startRow, startCol, headers) {
  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  // Convert column index to A1 notation (handles AA, AB, etc.)
  const colLetter = columnIndexToLetter(startCol);
  const range = `${sheetName}!${colLetter}${startRow}`;

  await client.spreadsheets.values.update({
    spreadsheetId,
    range: range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [headers]
    }
  });
}

/**
 * Expand sheet grid dimensions
 * @param {string} sheetName - Name of the sheet
 * @param {number} newColumnCount - New column count (optional)
 * @param {number} newRowCount - New row count (optional)
 * @returns {Promise<void>}
 */
async function resizeSheet(sheetName, newColumnCount, newRowCount) {
  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  // Get sheet ID
  const metadata = await client.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties'
  });

  const sheet = metadata.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  const sheetId = sheet.properties.sheetId;
  const currentCols = sheet.properties.gridProperties.columnCount;
  const currentRows = sheet.properties.gridProperties.rowCount;

  const updateRequest = {
    updateSheetProperties: {
      properties: {
        sheetId: sheetId,
        gridProperties: {
          columnCount: newColumnCount || currentCols,
          rowCount: newRowCount || currentRows
        }
      },
      fields: 'gridProperties(columnCount,rowCount)'
    }
  };

  await client.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [updateRequest]
    }
  });
}

/**
 * Delete a column from a sheet
 * @param {string} sheetName - Name of the sheet
 * @param {number} columnIndex - Column index to delete (0-indexed)
 * @returns {Promise<void>}
 */
async function deleteColumn(sheetName, columnIndex) {
  const client = await getClient();
  const spreadsheetId = getSpreadsheetId();

  // Get sheet ID
  const metadata = await client.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties'
  });

  const sheet = metadata.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  const sheetId = sheet.properties.sheetId;

  // Delete the column
  await client.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'COLUMNS',
            startIndex: columnIndex,
            endIndex: columnIndex + 1
          }
        }
      }]
    }
  });
}

/**
 * Convert column index to A1 notation (0=A, 25=Z, 26=AA, etc.)
 * @param {number} colIndex - 0-indexed column number
 * @returns {string} - Column letter(s)
 */
function columnIndexToLetter(colIndex) {
  let letter = '';
  let index = colIndex;

  while (index >= 0) {
    letter = String.fromCharCode(65 + (index % 26)) + letter;
    index = Math.floor(index / 26) - 1;
  }

  return letter;
}

/**
 * Update a range with row/col notation
 * @param {string} sheetName - Name of the sheet
 * @param {number} startRow - Starting row (1-indexed)
 * @param {number} startCol - Starting column (0-indexed)
 * @param {Array<Array>} values - 2D array of values
 * @returns {Promise<void>}
 */
async function updateRangeByPosition(sheetName, startRow, startCol, values) {
  const colLetter = columnIndexToLetter(startCol);
  const range = `${sheetName}!${colLetter}${startRow}`;
  await updateRange(range, values);
}

module.exports = {
  getClient,
  getSheetData,
  getRawSheetData,
  getSheetAsObjects,
  appendRows,
  updateRange,
  updateRangeByPosition,
  batchUpdate,
  listSheets,
  testConnection,
  createSheet,
  deleteSheet,
  appendColumns,
  deleteColumn,
  resizeSheet
};
