/**
 * ============================================================================
 * GodWorld Dashboard v1.4
 * ============================================================================
 * 
 * FIXES based on actual data diagnostic:
 * 
 * Chicago_Feed (data positions, not headers):
 *   Column F (6) = WeatherType
 *   Column E (5) = Temperature  
 *   Column H (8) = Sentiment
 * 
 * Sports_Feed Bulls:
 *   Record column is corrupted (has a date)
 *   Build record from Wins (D) & Losses (E) instead
 * 
 * ============================================================================
 */

var SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';

function createGodWorldDashboard() {
  var ss = SpreadsheetApp.openById(SIM_SSID);
  
  // Delete existing dashboard if present
  var existing = ss.getSheetByName('Dashboard');
  if (existing) {
    ss.deleteSheet(existing);
  }
  
  // Create fresh dashboard
  var dash = ss.insertSheet('Dashboard');
  
  // Wider layout with breathing room
  dash.setColumnWidth(1, 40);   // Left margin
  dash.setColumnWidth(2, 140);  // Labels
  dash.setColumnWidth(3, 160);  // Values
  dash.setColumnWidth(4, 60);   // Spacer
  dash.setColumnWidth(5, 140);  // Labels
  dash.setColumnWidth(6, 160);  // Values
  dash.setColumnWidth(7, 40);   // Right margin
  
  // Consistent row heights
  for (var i = 1; i <= 35; i++) {
    dash.setRowHeight(i, 24);
  }
  
  // Dark background - full area
  dash.getRange('A1:G35').setBackground('#0f0f1a');
  
  // ═══════════════════════════════════════════════════════════
  // HEADER (Rows 2-4)
  // ═══════════════════════════════════════════════════════════
  dash.setRowHeight(2, 40);
  dash.getRange('B2:F2').merge();
  dash.getRange('B2').setValue('GODWORLD');
  dash.getRange('B2').setFontSize(28).setFontWeight('bold').setFontColor('#ffffff').setHorizontalAlignment('center');
  
  dash.getRange('B3:F3').merge();
  dash.getRange('B3').setValue('Mission Control');
  dash.getRange('B3').setFontSize(11).setFontColor('#6b7280').setHorizontalAlignment('center');
  
  // ═══════════════════════════════════════════════════════════
  // CYCLE CARD (Rows 5-9)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B5:F9').setBackground('#1a1a2e');
  
  // Cycle number - big and centered
  dash.setRowHeight(6, 60);
  dash.setRowHeight(7, 36);
  dash.getRange('B6:C7').merge();
  dash.getRange('B6').setFormula('=IFERROR(INDEX(World_Population!A:Z,2,MATCH("cycle",World_Population!1:1,0)),"--")');
  dash.getRange('B6').setFontSize(56).setFontWeight('bold').setFontColor('#fbbf24').setHorizontalAlignment('center').setVerticalAlignment('middle');
  
  dash.getRange('B8').setValue('CYCLE');
  dash.getRange('B8').setFontSize(10).setFontColor('#6b7280').setHorizontalAlignment('center');
  
  // Status indicators - right side
  dash.getRange('E6').setValue('Economy');
  dash.getRange('F6').setFormula('=IFERROR(INDEX(World_Population!A:Z,2,MATCH("economy",World_Population!1:1,0)),"--")');
  dash.getRange('E6').setFontSize(9).setFontColor('#6b7280');
  dash.getRange('F6').setFontSize(12).setFontColor('#10b981').setFontWeight('bold');
  
  dash.getRange('E7').setValue('Population');
  dash.getRange('F7').setFormula('=IFERROR(TEXT(INDEX(World_Population!A:Z,2,MATCH("totalPopulation",World_Population!1:1,0)),"#,##0"),"--")');
  dash.getRange('E7').setFontSize(9).setFontColor('#6b7280');
  dash.getRange('F7').setFontSize(12).setFontColor('#ffffff');
  
  // Shock - clean display
  dash.getRange('E8').setValue('Shock');
  dash.getRange('F8').setFormula('=IFERROR(IF(INDEX(World_Population!A:Z,2,MATCH("shockFlag",World_Population!1:1,0))="shock-flag","⚡ YES",IF(INDEX(World_Population!A:Z,2,MATCH("shockFlag",World_Population!1:1,0))="none","—","⚡ " & INDEX(World_Population!A:Z,2,MATCH("shockFlag",World_Population!1:1,0)))),"—")');
  dash.getRange('E8').setFontSize(9).setFontColor('#6b7280');
  dash.getRange('F8').setFontSize(12).setFontColor('#f59e0b');
  
  // ═══════════════════════════════════════════════════════════
  // OAKLAND CARD (Rows 11-18)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B11:C18').setBackground('#0d2818');
  
  dash.setRowHeight(11, 32);
  dash.getRange('B11:C11').merge();
  dash.getRange('B11').setValue('  🌳  OAKLAND');
  dash.getRange('B11').setFontSize(13).setFontWeight('bold').setFontColor('#22c55e').setVerticalAlignment('middle');
  
  // Weather
  dash.getRange('B13').setValue('Weather');
  dash.getRange('C13').setFormula('=IFERROR(INDEX(World_Population!A:Z,2,MATCH("weatherType",World_Population!1:1,0)),"--")');
  dash.getRange('B13').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('C13').setFontSize(14).setFontColor('#ffffff').setFontWeight('bold');
  
  // Sentiment
  dash.getRange('B14').setValue('Sentiment');
  dash.getRange('C14').setFormula('=IFERROR(ROUND(INDEX(World_Population!A:Z,2,MATCH("sentiment",World_Population!1:1,0)),2),"--")');
  dash.getRange('B14').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('C14').setFontSize(14).setFontColor('#ffffff').setFontWeight('bold');
  
  // Mood
  dash.getRange('B15').setValue('Mood');
  dash.getRange('C15').setFormula('=IFERROR(IF(INDEX(World_Population!A:Z,2,MATCH("sentiment",World_Population!1:1,0))>=0.3,"😄 Thriving",IF(INDEX(World_Population!A:Z,2,MATCH("sentiment",World_Population!1:1,0))>=0.15,"🙂 Optimistic",IF(INDEX(World_Population!A:Z,2,MATCH("sentiment",World_Population!1:1,0))>=0,"😊 Content",IF(INDEX(World_Population!A:Z,2,MATCH("sentiment",World_Population!1:1,0))>=-0.15,"😐 Uneasy","😟 Troubled")))),"--")');
  dash.getRange('B15').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('C15').setFontSize(12).setFontColor('#9ca3af');
  
  // Spacer
  dash.setRowHeight(16, 8);
  
  // A's - use Record column (C) since it's correct for As
  dash.getRange('B17').setValue("A's");
  dash.getRange('C17').setFormula('=IFERROR(INDEX(Sports_Feed!C:C,MATCH("As",Sports_Feed!A:A,0)) & " • " & INDEX(Sports_Feed!F:F,MATCH("As",Sports_Feed!A:A,0)),"--")');
  dash.getRange('B17').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('C17').setFontSize(12).setFontColor('#22c55e').setFontWeight('bold');
  
  dash.getRange('B18').setValue('Streak');
  dash.getRange('C18').setFormula('=IFERROR(IF(INDEX(Sports_Feed!I:I,MATCH("As",Sports_Feed!A:A,0))="","—",INDEX(Sports_Feed!I:I,MATCH("As",Sports_Feed!A:A,0))),"—")');
  dash.getRange('B18').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('C18').setFontSize(11).setFontColor('#22c55e');
  
  // ═══════════════════════════════════════════════════════════
  // CHICAGO CARD (Rows 11-18)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('E11:F18').setBackground('#0d1a2e');
  
  dash.getRange('E11:F11').merge();
  dash.getRange('E11').setValue('  🏙️  CHICAGO');
  dash.getRange('E11').setFontSize(13).setFontWeight('bold').setFontColor('#3b82f6').setVerticalAlignment('middle');
  
  // Weather - ACTUAL position is column F (6) based on diagnostic
  dash.getRange('E13').setValue('Weather');
  dash.getRange('F13').setFormula('=IFERROR(INDEX(Chicago_Feed!F:F,2),"--")');
  dash.getRange('E13').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('F13').setFontSize(14).setFontColor('#ffffff').setFontWeight('bold');
  
  // Temperature - ACTUAL position is column E (5) based on diagnostic
  dash.getRange('E14').setValue('Temp');
  dash.getRange('F14').setFormula('=IFERROR(INDEX(Chicago_Feed!E:E,2) & "°F","--")');
  dash.getRange('E14').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('F14').setFontSize(14).setFontColor('#ffffff').setFontWeight('bold');
  
  // Sentiment - ACTUAL position is column H (8) based on diagnostic
  dash.getRange('E15').setValue('Sentiment');
  dash.getRange('F15').setFormula('=IFERROR(ROUND(INDEX(Chicago_Feed!H:H,2),2),"--")');
  dash.getRange('E15').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('F15').setFontSize(12).setFontColor('#9ca3af');
  
  // Bulls - BUILD record from Wins/Losses since Record column is corrupted
  dash.getRange('E17').setValue('Bulls');
  dash.getRange('F17').setFormula('=IFERROR(INDEX(Sports_Feed!D:D,MATCH("Bulls",Sports_Feed!A:A,0)) & "-" & INDEX(Sports_Feed!E:E,MATCH("Bulls",Sports_Feed!A:A,0)) & " • " & INDEX(Sports_Feed!F:F,MATCH("Bulls",Sports_Feed!A:A,0)),"--")');
  dash.getRange('E17').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('F17').setFontSize(12).setFontColor('#ef4444').setFontWeight('bold');
  
  dash.getRange('E18').setValue('Streak');
  dash.getRange('F18').setFormula('=IFERROR(IF(INDEX(Sports_Feed!I:I,MATCH("Bulls",Sports_Feed!A:A,0))="","—",INDEX(Sports_Feed!I:I,MATCH("Bulls",Sports_Feed!A:A,0))),"—")');
  dash.getRange('E18').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('F18').setFontSize(11).setFontColor('#ef4444');
  
  // ═══════════════════════════════════════════════════════════
  // SIGNALS CARD (Rows 20-24)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B20:F24').setBackground('#1a1a2e');
  
  dash.setRowHeight(20, 28);
  dash.getRange('B20:F20').merge();
  dash.getRange('B20').setValue('  ⚡  SIGNALS');
  dash.getRange('B20').setFontSize(11).setFontWeight('bold').setFontColor('#a78bfa').setVerticalAlignment('middle');
  
  dash.getRange('B22').setValue('Civic Load');
  dash.getRange('C22').setFormula('=IFERROR(INDEX(World_Population!A:Z,2,MATCH("civicLoad",World_Population!1:1,0)),"--")');
  dash.getRange('B22').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('C22').setFontSize(11).setFontColor('#ffffff');
  
  dash.getRange('B23').setValue('Pattern');
  dash.getRange('C23').setFormula('=IFERROR(INDEX(World_Population!A:Z,2,MATCH("patternFlag",World_Population!1:1,0)),"--")');
  dash.getRange('B23').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('C23').setFontSize(11).setFontColor('#ffffff');
  
  dash.getRange('E22').setValue('Migration');
  dash.getRange('F22').setFormula('=IFERROR(ROUND(INDEX(World_Population!A:Z,2,MATCH("migrationDrift",World_Population!1:1,0)),0),"--")');
  dash.getRange('E22').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('F22').setFontSize(11).setFontColor('#ffffff');
  
  dash.getRange('E23').setValue('Cycle Weight');
  dash.getRange('F23').setFormula('=IFERROR(INDEX(World_Population!A:Z,2,MATCH("cycleWeight",World_Population!1:1,0)),"--")');
  dash.getRange('E23').setFontSize(10).setFontColor('#6b7280');
  dash.getRange('F23').setFontSize(11).setFontColor('#ffffff');
  
  // ═══════════════════════════════════════════════════════════
  // FOOTER (Row 26)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B26:F26').merge();
  dash.getRange('B26').setValue('Updated: ' + new Date().toLocaleString());
  dash.getRange('B26').setFontSize(9).setFontColor('#4b5563').setHorizontalAlignment('center');
  
  // Move dashboard to first position
  ss.setActiveSheet(dash);
  ss.moveActiveSheet(1);
  
  Logger.log('createGodWorldDashboard v1.4: Dashboard created with fixed data positions');
  SpreadsheetApp.getUi().alert('✅ Dashboard v1.4 created!');
}


/**
 * Refresh the dashboard (updates timestamp)
 */
function refreshDashboard() {
  var ss = SpreadsheetApp.openById(SIM_SSID);
  var dash = ss.getSheetByName('Dashboard');
  
  if (!dash) {
    SpreadsheetApp.getUi().alert('Dashboard not found. Run createGodWorldDashboard() first.');
    return;
  }
  
  dash.getRange('B26').setValue('Updated: ' + new Date().toLocaleString());
  SpreadsheetApp.flush();
  Logger.log('refreshDashboard: Updated');
}


/**
 * Menu
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🌍 GodWorld')
    .addItem('📊 Create Dashboard', 'createGodWorldDashboard')
    .addItem('🔄 Refresh Dashboard', 'refreshDashboard')
    .addToUi();
}