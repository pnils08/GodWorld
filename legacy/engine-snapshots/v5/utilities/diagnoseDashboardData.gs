function diagnoseDashboardData() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  
  // Sports_Feed - show first 3 rows
  var sf = ss.getSheetByName('Sports_Feed');
  if (sf) {
    var data = sf.getRange(1, 1, 3, 13).getValues();
    Logger.log('Sports_Feed row 1: ' + JSON.stringify(data[0]));
    Logger.log('Sports_Feed row 2: ' + JSON.stringify(data[1]));
    Logger.log('Sports_Feed row 3: ' + JSON.stringify(data[2]));
  }
  
  // Chicago_Feed - show first 2 rows
  var chi = ss.getSheetByName('Chicago_Feed');
  if (chi) {
    var data = chi.getRange(1, 1, 2, 10).getValues();
    Logger.log('Chicago_Feed row 1: ' + JSON.stringify(data[0]));
    Logger.log('Chicago_Feed row 2: ' + JSON.stringify(data[1]));
  }
}