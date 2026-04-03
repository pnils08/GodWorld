/**
* trendChart v1.0
* Creates or updates a performance trend chart on Weekly_Summary.
*/
function updatePerformanceChart() {
const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
const sheet = ss.getSheetByName("Weekly_Summary");
if (!sheet) return;

const range = sheet.getDataRange();
const lastRow = range.getLastRow();

// Remove any existing charts first
const charts = sheet.getCharts();
charts.forEach(chart => sheet.removeChart(chart));

// Build chart
const chart = sheet.newChart()
.setChartType(Charts.ChartType.LINE)
.addRange(sheet.getRange("A2:A" + lastRow)) // Week start
.addRange(sheet.getRange("D2:D" + lastRow)) // Total Errors
.addRange(sheet.getRange("E2:E" + lastRow)) // Total Checks
.setOption('title', 'Riley Steward: Weekly Performance Trends')
.setOption('hAxis.title', 'Week Start')
.setOption('vAxis.title', 'Count')
.setOption('colors', ['#e53935', '#1e88e5']) // red for errors, blue for checks
.setOption('legend.position', 'bottom')
.setPosition(2, 10, 0, 0)
.build();

sheet.insertChart(chart);
}
