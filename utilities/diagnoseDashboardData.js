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

}
