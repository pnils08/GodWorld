// @cycle-status: off-cycle — ad hoc Logger diagnostic, run from the Apps Script editor
function diagnoseDashboardData() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  
  // Oakland_Sports_Feed - show first 3 rows
  var sf = ss.getSheetByName('Oakland_Sports_Feed');
  if (sf) {
    var data = sf.getRange(1, 1, 3, 13).getValues();
    Logger.log('Oakland_Sports_Feed row 1: ' + JSON.stringify(data[0]));
    Logger.log('Oakland_Sports_Feed row 2: ' + JSON.stringify(data[1]));
    Logger.log('Oakland_Sports_Feed row 3: ' + JSON.stringify(data[2]));
  }

  // Chicago_Feed - show first 2 rows.
  // NOT repointed: Chicago_Feed is a live tab the engine writes each cycle
  // (v3ChicagoWriter.js), not a ghost, and was never on the infrastructure.6
  // list. Only Sports_Feed above was a ghost.
  var chi = ss.getSheetByName('Chicago_Feed');
  if (chi) {
    var data = chi.getRange(1, 1, 2, 10).getValues();
    Logger.log('Chicago_Feed row 1: ' + JSON.stringify(data[0]));
    Logger.log('Chicago_Feed row 2: ' + JSON.stringify(data[1]));
  }
}