/**
 * ============================================================================
 * GodWorld Dashboard v2.0
 * ============================================================================
 *
 * v2.0 Enhancements:
 * - CALENDAR card: season, holiday, First Friday, Creation Day, sports season
 * - WORLD PULSE card: expanded signals + city dynamics (nightlife, traffic,
 *   retail, employment)
 * - CIVIC card: active initiatives, pending votes, pass/fail totals
 * - BONDS card: active bonds, rivalries, alliances, hottest intensity
 * - Events count added to Cycle card
 *
 * Data sources (all formula-driven, no engine changes):
 * - World_Population (single-row state sheet)
 * - Sports_Feed (team records)
 * - Chicago_Feed (Chicago weather/sentiment)
 * - Initiative_Tracker (civic initiative lifecycle)
 * - Relationship_Bonds (social bond state)
 *
 * ============================================================================
 */

function createGodWorldDashboard() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var COLORS = {
    base: '#0b0f1a',
    card: '#111827',
    cardOak: '#0d2818',
    cardChi: '#0d1a2e',
    cardCivic: '#0d1f0d',
    cardBonds: '#1f0d1a',
    label: '#9ca3af',
    value: '#ffffff',
    accentOak: '#22c55e',
    accentChi: '#3b82f6',
    accentSignal: '#a78bfa',
    accentCycle: '#fbbf24',
    accentCivic: '#4ade80',
    accentBonds: '#fb7185'
  };

  // Helper: INDEX/MATCH into World_Population row 2
  var wp = function(col) {
    return '=IFERROR(INDEX(World_Population!A:Z,2,MATCH("' + col + '",World_Population!1:1,0)),"--")';
  };

  // Helper: Rounded version
  var wpRound = function(col, digits) {
    return '=IFERROR(ROUND(INDEX(World_Population!A:Z,2,MATCH("' + col + '",World_Population!1:1,0)),' + (digits || 2) + '),"--")';
  };

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
  for (var i = 1; i <= 55; i++) {
    dash.setRowHeight(i, 24);
  }

  // Base styling
  dash.getRange('A1:G55').setBackground(COLORS.base).setFontFamily('Arial').setFontColor(COLORS.value);

  // ═══════════════════════════════════════════════════════════
  // HEADER (Rows 2-3)
  // ═══════════════════════════════════════════════════════════
  dash.setRowHeight(2, 40);
  dash.getRange('B2:F2').merge();
  dash.getRange('B2').setValue('GODWORLD');
  dash.getRange('B2').setFontSize(28).setFontWeight('bold').setFontColor(COLORS.value).setHorizontalAlignment('center');

  dash.getRange('B3:F3').merge();
  dash.getRange('B3').setValue('Mission Control');
  dash.getRange('B3').setFontSize(11).setFontColor(COLORS.label).setHorizontalAlignment('center');

  // ═══════════════════════════════════════════════════════════
  // CYCLE CARD (Rows 5-9) — enhanced with events count
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B5:F9').setBackground(COLORS.card);
  dash.getRange('B5:F9').setBorder(true, true, true, true, false, false, '#1f2937', SpreadsheetApp.BorderStyle.SOLID);

  // Cycle number - big and centered
  dash.setRowHeight(6, 60);
  dash.setRowHeight(7, 36);
  dash.getRange('B6:C7').merge();
  dash.getRange('B6').setFormula(wp('cycle'));
  dash.getRange('B6').setFontSize(56).setFontWeight('bold').setFontColor(COLORS.accentCycle).setHorizontalAlignment('center').setVerticalAlignment('middle');

  dash.getRange('B8').setValue('CYCLE');
  dash.getRange('B8').setFontSize(10).setFontColor(COLORS.label).setHorizontalAlignment('center');

  // Status indicators - right side
  dash.getRange('E6').setValue('Economy');
  dash.getRange('F6').setFormula(wp('economy'));
  dash.getRange('E6').setFontSize(9).setFontColor(COLORS.label);
  dash.getRange('F6').setFontSize(12).setFontColor(COLORS.accentOak).setFontWeight('bold');

  dash.getRange('E7').setValue('Population');
  dash.getRange('F7').setFormula('=IFERROR(TEXT(INDEX(World_Population!A:Z,2,MATCH("totalPopulation",World_Population!1:1,0)),"#,##0"),"--")');
  dash.getRange('E7').setFontSize(9).setFontColor(COLORS.label);
  dash.getRange('F7').setFontSize(12).setFontColor(COLORS.value);

  dash.getRange('E8').setValue('Events');
  dash.getRange('F8').setFormula(wp('worldEventsCount'));
  dash.getRange('E8').setFontSize(9).setFontColor(COLORS.label);
  dash.getRange('F8').setFontSize(12).setFontColor(COLORS.value);

  // Shock - clean display
  dash.getRange('E9').setValue('Shock');
  dash.getRange('F9').setFormula('=IFERROR(IF(INDEX(World_Population!A:Z,2,MATCH("shockFlag",World_Population!1:1,0))="shock-flag","YES",IF(INDEX(World_Population!A:Z,2,MATCH("shockFlag",World_Population!1:1,0))="none","—","" & INDEX(World_Population!A:Z,2,MATCH("shockFlag",World_Population!1:1,0)))),"—")');
  dash.getRange('E9').setFontSize(9).setFontColor(COLORS.label);
  dash.getRange('F9').setFontSize(12).setFontColor(COLORS.accentCycle);

  // ═══════════════════════════════════════════════════════════
  // OAKLAND CARD (Rows 11-18)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B11:C18').setBackground(COLORS.cardOak);
  dash.getRange('B11:C18').setBorder(true, true, true, true, false, false, '#1f2937', SpreadsheetApp.BorderStyle.SOLID);

  dash.setRowHeight(11, 32);
  dash.getRange('B11:C11').merge();
  dash.getRange('B11').setValue('  OAKLAND');
  dash.getRange('B11').setFontSize(13).setFontWeight('bold').setFontColor(COLORS.accentOak).setVerticalAlignment('middle');

  // Weather
  dash.getRange('B13').setValue('Weather');
  dash.getRange('C13').setFormula(wp('weatherType'));
  dash.getRange('B13').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C13').setFontSize(14).setFontColor(COLORS.value).setFontWeight('bold');

  // Sentiment
  dash.getRange('B14').setValue('Sentiment');
  dash.getRange('C14').setFormula(wpRound('sentiment'));
  dash.getRange('B14').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C14').setFontSize(14).setFontColor(COLORS.value).setFontWeight('bold');

  // Mood
  dash.getRange('B15').setValue('Mood');
  dash.getRange('C15').setFormula('=IFERROR(IF(INDEX(World_Population!A:Z,2,MATCH("sentiment",World_Population!1:1,0))>=0.3,"Thriving",IF(INDEX(World_Population!A:Z,2,MATCH("sentiment",World_Population!1:1,0))>=0.15,"Optimistic",IF(INDEX(World_Population!A:Z,2,MATCH("sentiment",World_Population!1:1,0))>=0,"Content",IF(INDEX(World_Population!A:Z,2,MATCH("sentiment",World_Population!1:1,0))>=-0.15,"Uneasy","Troubled")))),"--")');
  dash.getRange('B15').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C15').setFontSize(12).setFontColor(COLORS.label);

  // Spacer
  dash.setRowHeight(16, 8);

  // A's
  dash.getRange('B17').setValue("A's");
  dash.getRange('C17').setFormula('=IFERROR(INDEX(Sports_Feed!C:C,MATCH("As",Sports_Feed!A:A,0)) & " | " & INDEX(Sports_Feed!F:F,MATCH("As",Sports_Feed!A:A,0)),"--")');
  dash.getRange('B17').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C17').setFontSize(12).setFontColor(COLORS.accentOak).setFontWeight('bold');

  dash.getRange('B18').setValue('Streak');
  dash.getRange('C18').setFormula('=IFERROR(IF(INDEX(Sports_Feed!I:I,MATCH("As",Sports_Feed!A:A,0))="","—",INDEX(Sports_Feed!I:I,MATCH("As",Sports_Feed!A:A,0))),"—")');
  dash.getRange('B18').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C18').setFontSize(11).setFontColor(COLORS.accentOak);

  // ═══════════════════════════════════════════════════════════
  // CHICAGO CARD (Rows 11-18)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('E11:F18').setBackground(COLORS.cardChi);
  dash.getRange('E11:F18').setBorder(true, true, true, true, false, false, '#1f2937', SpreadsheetApp.BorderStyle.SOLID);

  dash.getRange('E11:F11').merge();
  dash.getRange('E11').setValue('  CHICAGO');
  dash.getRange('E11').setFontSize(13).setFontWeight('bold').setFontColor(COLORS.accentChi).setVerticalAlignment('middle');

  // Weather
  dash.getRange('E13').setValue('Weather');
  dash.getRange('F13').setFormula('=IFERROR(INDEX(Chicago_Feed!F:F,2),"--")');
  dash.getRange('E13').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F13').setFontSize(14).setFontColor(COLORS.value).setFontWeight('bold');

  // Temperature
  dash.getRange('E14').setValue('Temp');
  dash.getRange('F14').setFormula('=IFERROR(INDEX(Chicago_Feed!E:E,2) & "F","--")');
  dash.getRange('E14').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F14').setFontSize(14).setFontColor(COLORS.value).setFontWeight('bold');

  // Sentiment
  dash.getRange('E15').setValue('Sentiment');
  dash.getRange('F15').setFormula('=IFERROR(ROUND(INDEX(Chicago_Feed!H:H,2),2),"--")');
  dash.getRange('E15').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F15').setFontSize(12).setFontColor(COLORS.label);

  // Bulls
  dash.getRange('E17').setValue('Bulls');
  dash.getRange('F17').setFormula('=IFERROR(INDEX(Sports_Feed!D:D,MATCH("Bulls",Sports_Feed!A:A,0)) & "-" & INDEX(Sports_Feed!E:E,MATCH("Bulls",Sports_Feed!A:A,0)) & " | " & INDEX(Sports_Feed!F:F,MATCH("Bulls",Sports_Feed!A:A,0)),"--")');
  dash.getRange('E17').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F17').setFontSize(12).setFontColor('#ef4444').setFontWeight('bold');

  dash.getRange('E18').setValue('Streak');
  dash.getRange('F18').setFormula('=IFERROR(IF(INDEX(Sports_Feed!I:I,MATCH("Bulls",Sports_Feed!A:A,0))="","—",INDEX(Sports_Feed!I:I,MATCH("Bulls",Sports_Feed!A:A,0))),"—")');
  dash.getRange('E18').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F18').setFontSize(11).setFontColor('#ef4444');

  // ═══════════════════════════════════════════════════════════
  // CALENDAR CARD (Rows 20-24) — NEW
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B20:F24').setBackground(COLORS.card);
  dash.getRange('B20:F24').setBorder(true, true, true, true, false, false, '#1f2937', SpreadsheetApp.BorderStyle.SOLID);

  dash.setRowHeight(20, 28);
  dash.getRange('B20:F20').merge();
  dash.getRange('B20').setValue('  CALENDAR');
  dash.getRange('B20').setFontSize(11).setFontWeight('bold').setFontColor(COLORS.accentCycle).setVerticalAlignment('middle');

  dash.getRange('B22').setValue('Season');
  dash.getRange('C22').setFormula(wp('season'));
  dash.getRange('B22').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C22').setFontSize(12).setFontColor(COLORS.accentCycle).setFontWeight('bold');

  dash.getRange('B23').setValue('Holiday');
  dash.getRange('C23').setFormula('=IFERROR(IF(INDEX(World_Population!A:Z,2,MATCH("holiday",World_Population!1:1,0))="none","—",INDEX(World_Population!A:Z,2,MATCH("holiday",World_Population!1:1,0))),"—")');
  dash.getRange('B23').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C23').setFontSize(12).setFontColor(COLORS.accentCycle);

  dash.getRange('E22').setValue('Sports');
  dash.getRange('F22').setFormula(wp('sportsSeason'));
  dash.getRange('E22').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F22').setFontSize(12).setFontColor(COLORS.accentCycle).setFontWeight('bold');

  dash.getRange('E23').setValue('Special');
  dash.getRange('F23').setFormula('=IFERROR(IF(AND(INDEX(World_Population!A:Z,2,MATCH("isFirstFriday",World_Population!1:1,0))<>TRUE,INDEX(World_Population!A:Z,2,MATCH("isCreationDay",World_Population!1:1,0))<>TRUE),"—",IF(AND(INDEX(World_Population!A:Z,2,MATCH("isFirstFriday",World_Population!1:1,0))=TRUE,INDEX(World_Population!A:Z,2,MATCH("isCreationDay",World_Population!1:1,0))=TRUE),"1st Fri + Creation",IF(INDEX(World_Population!A:Z,2,MATCH("isFirstFriday",World_Population!1:1,0))=TRUE,"First Friday","Creation Day"))),"—")');
  dash.getRange('E23').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F23').setFontSize(12).setFontColor(COLORS.accentCycle);

  // ═══════════════════════════════════════════════════════════
  // WORLD PULSE CARD (Rows 26-33) — expanded signals
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B26:F33').setBackground(COLORS.card);
  dash.getRange('B26:F33').setBorder(true, true, true, true, false, false, '#1f2937', SpreadsheetApp.BorderStyle.SOLID);

  dash.setRowHeight(26, 28);
  dash.getRange('B26:F26').merge();
  dash.getRange('B26').setValue('  WORLD PULSE');
  dash.getRange('B26').setFontSize(11).setFontWeight('bold').setFontColor(COLORS.accentSignal).setVerticalAlignment('middle');

  // Left column: original signals
  dash.getRange('B28').setValue('Civic Load');
  dash.getRange('C28').setFormula(wp('civicLoad'));
  dash.getRange('B28').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C28').setFontSize(11).setFontColor(COLORS.value);

  dash.getRange('B29').setValue('Migration');
  dash.getRange('C29').setFormula('=IFERROR(ROUND(INDEX(World_Population!A:Z,2,MATCH("migrationDrift",World_Population!1:1,0)),0),"--")');
  dash.getRange('B29').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C29').setFontSize(11).setFontColor(COLORS.value);

  dash.getRange('B30').setValue('Pattern');
  dash.getRange('C30').setFormula(wp('patternFlag'));
  dash.getRange('B30').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C30').setFontSize(11).setFontColor(COLORS.value);

  dash.getRange('B31').setValue('Cycle Weight');
  dash.getRange('C31').setFormula(wp('cycleWeight'));
  dash.getRange('B31').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C31').setFontSize(11).setFontColor(COLORS.value);

  // Right column: city dynamics
  dash.getRange('E28').setValue('Nightlife');
  dash.getRange('F28').setFormula(wp('nightlifeLoad'));
  dash.getRange('E28').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F28').setFontSize(11).setFontColor(COLORS.accentSignal);

  dash.getRange('E29').setValue('Traffic');
  dash.getRange('F29').setFormula(wp('trafficLoad'));
  dash.getRange('E29').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F29').setFontSize(11).setFontColor(COLORS.accentSignal);

  dash.getRange('E30').setValue('Retail');
  dash.getRange('F30').setFormula(wp('retailLoad'));
  dash.getRange('E30').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F30').setFontSize(11).setFontColor(COLORS.accentSignal);

  dash.getRange('E31').setValue('Employment');
  dash.getRange('F31').setFormula(wp('employmentRate'));
  dash.getRange('E31').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F31').setFontSize(11).setFontColor(COLORS.accentSignal);

  // ═══════════════════════════════════════════════════════════
  // CIVIC CARD (Rows 35-41) — NEW
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B35:F41').setBackground(COLORS.cardCivic);
  dash.getRange('B35:F41').setBorder(true, true, true, true, false, false, '#1f2937', SpreadsheetApp.BorderStyle.SOLID);

  dash.setRowHeight(35, 28);
  dash.getRange('B35:F35').merge();
  dash.getRange('B35').setValue('  CIVIC');
  dash.getRange('B35').setFontSize(11).setFontWeight('bold').setFontColor(COLORS.accentCivic).setVerticalAlignment('middle');

  // Left: active + pending
  dash.getRange('B37').setValue('Active');
  dash.getRange('C37').setFormula('=IFERROR(COUNTIF(Initiative_Tracker!D:D,"active"),"--")');
  dash.getRange('B37').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C37').setFontSize(18).setFontColor(COLORS.accentCivic).setFontWeight('bold');

  dash.getRange('B38').setValue('initiatives');
  dash.getRange('B38').setFontSize(9).setFontColor(COLORS.label);

  dash.getRange('B40').setValue('Pending Vote');
  dash.getRange('C40').setFormula('=IFERROR(COUNTIF(Initiative_Tracker!D:D,"pending-vote"),"--")');
  dash.getRange('B40').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C40').setFontSize(14).setFontColor(COLORS.accentCivic);

  // Right: pass/fail
  dash.getRange('E37').setValue('Passed');
  dash.getRange('F37').setFormula('=IFERROR(COUNTIF(Initiative_Tracker!N:N,"PASSED")+COUNTIF(Initiative_Tracker!N:N,"APPROVED"),"--")');
  dash.getRange('E37').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F37').setFontSize(18).setFontColor(COLORS.accentCivic).setFontWeight('bold');

  dash.getRange('E38').setValue('total');
  dash.getRange('E38').setFontSize(9).setFontColor(COLORS.label);

  dash.getRange('E40').setValue('Failed');
  dash.getRange('F40').setFormula('=IFERROR(COUNTIF(Initiative_Tracker!N:N,"FAILED")+COUNTIF(Initiative_Tracker!N:N,"DENIED"),"--")');
  dash.getRange('E40').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F40').setFontSize(14).setFontColor('#ef4444');

  // ═══════════════════════════════════════════════════════════
  // BONDS CARD (Rows 43-49) — NEW
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B43:F49').setBackground(COLORS.cardBonds);
  dash.getRange('B43:F49').setBorder(true, true, true, true, false, false, '#1f2937', SpreadsheetApp.BorderStyle.SOLID);

  dash.setRowHeight(43, 28);
  dash.getRange('B43:F43').merge();
  dash.getRange('B43').setValue('  BONDS');
  dash.getRange('B43').setFontSize(11).setFontWeight('bold').setFontColor(COLORS.accentBonds).setVerticalAlignment('middle');

  // Left: active bonds + rivalries
  dash.getRange('B45').setValue('Active');
  dash.getRange('C45').setFormula('=IFERROR(COUNTIF(Relationship_Bonds!F:F,"active"),"--")');
  dash.getRange('B45').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C45').setFontSize(18).setFontColor(COLORS.accentBonds).setFontWeight('bold');

  dash.getRange('B46').setValue('bonds');
  dash.getRange('B46').setFontSize(9).setFontColor(COLORS.label);

  dash.getRange('B48').setValue('Rivalries');
  dash.getRange('C48').setFormula('=IFERROR(COUNTIFS(Relationship_Bonds!D:D,"rivalry",Relationship_Bonds!F:F,"active")+COUNTIFS(Relationship_Bonds!D:D,"sports_rival",Relationship_Bonds!F:F,"active"),"--")');
  dash.getRange('B48').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('C48').setFontSize(14).setFontColor(COLORS.accentBonds);

  // Right: alliances + hottest intensity
  dash.getRange('E45').setValue('Alliances');
  dash.getRange('F45').setFormula('=IFERROR(COUNTIFS(Relationship_Bonds!D:D,"alliance",Relationship_Bonds!F:F,"active")+COUNTIFS(Relationship_Bonds!D:D,"mentorship",Relationship_Bonds!F:F,"active"),"--")');
  dash.getRange('E45').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F45').setFontSize(18).setFontColor(COLORS.accentBonds).setFontWeight('bold');

  dash.getRange('E46').setValue('+ mentorships');
  dash.getRange('E46').setFontSize(9).setFontColor(COLORS.label);

  dash.getRange('E48').setValue('Peak Intensity');
  dash.getRange('F48').setFormula('=IFERROR(MAX(IF(Relationship_Bonds!F:F="active",Relationship_Bonds!E:E)),"--")');
  dash.getRange('E48').setFontSize(10).setFontColor(COLORS.label);
  dash.getRange('F48').setFontSize(14).setFontColor(COLORS.accentBonds);

  // ═══════════════════════════════════════════════════════════
  // FOOTER (Row 51)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B51:F51').merge();
  dash.getRange('B51').setValue('Updated: ' + new Date().toLocaleString());
  dash.getRange('B51').setFontSize(9).setFontColor(COLORS.label).setHorizontalAlignment('center');

  // Move dashboard to first position
  ss.setActiveSheet(dash);
  ss.moveActiveSheet(1);

  Logger.log('createGodWorldDashboard v2.0: Dashboard created with 7 cards');
  try {
    SpreadsheetApp.getUi().alert('Dashboard v2.0 created!');
  } catch (e) {
    // UI not available when run from trigger/programmatically
  }
}


/**
 * Refresh the dashboard (updates timestamp)
 */
function refreshDashboard() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var dash = ss.getSheetByName('Dashboard');

  if (!dash) {
    Logger.log('Dashboard not found. Run createGodWorldDashboard() first.');
    try {
      SpreadsheetApp.getUi().alert('Dashboard not found. Run createGodWorldDashboard() first.');
    } catch (e) {}
    return;
  }

  dash.getRange('B51').setValue('Updated: ' + new Date().toLocaleString());
  SpreadsheetApp.flush();
  Logger.log('refreshDashboard: Updated');
}


/**
 * Menu
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('GodWorld')
    .addItem('Create Dashboard', 'createGodWorldDashboard')
    .addItem('Refresh Dashboard', 'refreshDashboard')
    .addToUi();
}
