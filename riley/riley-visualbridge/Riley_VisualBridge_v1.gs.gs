/*******************************************************
 * RILEY_VISUALBRIDGE_v1.0 – LOOKER STUDIO CONNECTOR
 * Purpose: feed summarized GW4 system data into a 
 * visual dashboard (Google Looker Studio)
 *
 * Safe for continuous read-only operation.
 *******************************************************/

function getSchema() {
  return {
    schema: [
      { name: 'timestamp', label: 'Timestamp', dataType: 'STRING', semantics: { conceptType: 'DIMENSION', semanticType: 'YEAR_MONTH_DAY_SECOND' } },
      { name: 'systemHealth', label: 'System Health', dataType: 'STRING', semantics: { conceptType: 'DIMENSION' } },
      { name: 'filesSynced', label: 'Files Synced', dataType: 'NUMBER', semantics: { conceptType: 'METRIC' } },
      { name: 'errorsDetected', label: 'Errors Detected', dataType: 'NUMBER', semantics: { conceptType: 'METRIC' } },
      { name: 'coreFolders', label: 'Core Folders', dataType: 'NUMBER', semantics: { conceptType: 'METRIC' } },
      { name: 'runDuration', label: 'Run Duration (sec)', dataType: 'NUMBER', semantics: { conceptType: 'METRIC' } },
    ]
  };
}

function getData(request) {
  const sheetName = 'IntegrityDashboard';
  const sheet = SpreadsheetApp.openById('19RCVQsDAVIAu0X41DUMyoi2YIAsm4XKqT-PqDTvkmas').getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();

  const rows = [];
  for (let i = 1; i < data.length; i++) {
    rows.push({
      values: [
        data[i][0], // timestamp
        data[i][1], // systemHealth
        data[i][2], // filesSynced
        data[i][3], // errorsDetected
        data[i][4], // coreFolders
        data[i][5], // runDuration
      ]
    });
  }

  return {
    schema: getSchema().schema,
    rows: rows
  };
}

function isAdminUser() {
  return true;
}

function getConfig() {
  const config = {
    configParams: [
      {
        name: 'sheetId',
        displayName: 'Google Sheet ID',
        helpText: 'Enter the Sheet ID from your Riley_IntegrityDashboard sheet.',
        dataType: 'STRING',
        required: true
      }
    ]
  };
  return config;
}

/*******************************************************
 * NOTES:
 * - Paste this into a new Apps Script file called 
 *   “Riley_VisualBridge_v1.gs”.
 * - Deploy → New Deployment → “Add-on / Web App”
 *   → select “Looker Studio Connector”.
 * - Authorize once and publish.
 * - Safe: read-only / no Drive write permissions.
 *******************************************************/
function doGet(e) {
  return ContentService.createTextOutput(
    "Riley VisualBridge Connector endpoint is live and reachable."
  );
}/**
 * Returns the authentication method used by the connector.
 */
function getAuthType() {
  return {
    type: 'NONE'
  };
}

/**
 * Describes the data schema available from this connector.
 */
function getSchema() {
  return {
    schema: [
      { name: 'metric_name', label: 'Metric Name', dataType: 'STRING', semantics: { conceptType: 'DIMENSION' } },
      { name: 'metric_value', label: 'Metric Value', dataType: 'NUMBER', semantics: { conceptType: 'METRIC' } }
    ]
  };
}

/**
 * Returns sample data for Looker Studio to display.
 */
function getData(request) {
  return {
    schema: getSchema().schema,
    rows: [
      { values: ['Integrity Score', 95] },
      { values: ['Response Time', 0.87] }
    ]
  };
}