/**
 * ============================================================================
 * GodWorld Dashboard v2.1
 * ============================================================================
 *
 * v2.1 Fixes:
 * - Fixed A:Z range limit — calendar columns past col 26 now found
 *   (uses 2:2 / 1:1 for full-row INDEX/MATCH)
 * - Employment formatted as percentage (90.1%)
 * - Dynamics values rounded to 1 decimal
 * - Oakland and Chicago cards now show parallel data
 *   (Weather, Sentiment, Mood, Team, Streak)
 * - Uniform font sizes: labels=10, values=12, big numbers=20
 * - Consistent card title size (12pt bold)
 *
 * v2.0 Features:
 * - CALENDAR card: season, holiday, First Friday, Creation Day, sports season
 * - WORLD PULSE card: expanded signals + city dynamics
 * - CIVIC card: active initiatives, pending votes, pass/fail totals
 * - BONDS card: active bonds, rivalries, alliances, hottest intensity
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
  var C = {
    base: '#0b0f1a',
    card: '#111827',
    cardOak: '#0d2818',
    cardChi: '#0d1a2e',
    cardCivic: '#0d1f0d',
    cardBonds: '#1f0d1a',
    border: '#1f2937',
    label: '#9ca3af',
    value: '#ffffff',
    oak: '#22c55e',
    chi: '#3b82f6',
    pulse: '#a78bfa',
    amber: '#fbbf24',
    civic: '#4ade80',
    bonds: '#fb7185',
    red: '#ef4444'
  };

  // --- Formula helpers (v2.1: use 2:2 / 1:1 for full row coverage) ---

  // Raw value from World_Population
  var wp = function(col) {
    return '=IFERROR(INDEX(World_Population!2:2,MATCH("' + col + '",World_Population!1:1,0)),"--")';
  };

  // Rounded value
  var wpR = function(col, d) {
    return '=IFERROR(ROUND(INDEX(World_Population!2:2,MATCH("' + col + '",World_Population!1:1,0)),' + (d || 1) + '),"--")';
  };

  // Percentage formatted
  var wpPct = function(col) {
    return '=IFERROR(TEXT(INDEX(World_Population!2:2,MATCH("' + col + '",World_Population!1:1,0)),"0.0%"),"--")';
  };

  // --- Style helpers ---
  var LABEL = 10;
  var VALUE = 12;
  var BIG = 20;
  var TITLE = 12;

  var styleLabel = function(r) { r.setFontSize(LABEL).setFontColor(C.label); };
  var styleValue = function(r, color) { r.setFontSize(VALUE).setFontColor(color || C.value).setFontWeight('bold'); };
  var styleData = function(r, color) { r.setFontSize(VALUE).setFontColor(color || C.value); };
  var styleBig = function(r, color) { r.setFontSize(BIG).setFontColor(color || C.value).setFontWeight('bold'); };
  var styleTitle = function(r, color) { r.setFontSize(TITLE).setFontWeight('bold').setFontColor(color).setVerticalAlignment('middle'); };
  var addBorder = function(range) { range.setBorder(true, true, true, true, false, false, C.border, SpreadsheetApp.BorderStyle.SOLID); };

  // Delete existing dashboard if present
  var existing = ss.getSheetByName('Dashboard');
  if (existing) ss.deleteSheet(existing);

  var dash = ss.insertSheet('Dashboard');

  // Column widths
  dash.setColumnWidth(1, 40);   // Left margin
  dash.setColumnWidth(2, 140);  // Labels
  dash.setColumnWidth(3, 160);  // Values
  dash.setColumnWidth(4, 60);   // Spacer
  dash.setColumnWidth(5, 140);  // Labels
  dash.setColumnWidth(6, 160);  // Values
  dash.setColumnWidth(7, 40);   // Right margin

  // Row heights
  for (var i = 1; i <= 55; i++) dash.setRowHeight(i, 24);

  // Base styling
  dash.getRange('A1:G55').setBackground(C.base).setFontFamily('Arial').setFontSize(LABEL).setFontColor(C.value);

  // ═══════════════════════════════════════════════════════════
  // HEADER (Rows 2-3)
  // ═══════════════════════════════════════════════════════════
  dash.setRowHeight(2, 40);
  dash.getRange('B2:F2').merge();
  dash.getRange('B2').setValue('GODWORLD').setFontSize(28).setFontWeight('bold').setFontColor(C.value).setHorizontalAlignment('center');

  dash.getRange('B3:F3').merge();
  dash.getRange('B3').setValue('Mission Control').setFontSize(11).setFontColor(C.label).setHorizontalAlignment('center');

  // ═══════════════════════════════════════════════════════════
  // CYCLE CARD (Rows 5-9)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B5:F9').setBackground(C.card);
  addBorder(dash.getRange('B5:F9'));

  dash.setRowHeight(6, 60);
  dash.setRowHeight(7, 36);
  dash.getRange('B6:C7').merge();
  dash.getRange('B6').setFormula(wp('cycle'));
  dash.getRange('B6').setFontSize(56).setFontWeight('bold').setFontColor(C.amber).setHorizontalAlignment('center').setVerticalAlignment('middle');

  dash.getRange('B8').setValue('CYCLE').setFontSize(LABEL).setFontColor(C.label).setHorizontalAlignment('center');

  // Right side
  styleLabel(dash.getRange('E6').setValue('Economy'));
  styleValue(dash.getRange('F6').setFormula(wp('economy')), C.oak);

  styleLabel(dash.getRange('E7').setValue('Population'));
  styleValue(dash.getRange('F7').setFormula('=IFERROR(TEXT(INDEX(World_Population!2:2,MATCH("totalPopulation",World_Population!1:1,0)),"#,##0"),"--")'), C.value);

  styleLabel(dash.getRange('E8').setValue('Events'));
  styleData(dash.getRange('F8').setFormula(wp('worldEventsCount')));

  styleLabel(dash.getRange('E9').setValue('Shock'));
  styleData(dash.getRange('F9').setFormula('=IFERROR(IF(INDEX(World_Population!2:2,MATCH("shockFlag",World_Population!1:1,0))="none","—",INDEX(World_Population!2:2,MATCH("shockFlag",World_Population!1:1,0))),"—")'), C.amber);

  // ═══════════════════════════════════════════════════════════
  // OAKLAND CARD (Rows 11-18)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B11:C18').setBackground(C.cardOak);
  addBorder(dash.getRange('B11:C18'));
  dash.setRowHeight(11, 32);

  dash.getRange('B11:C11').merge();
  styleTitle(dash.getRange('B11').setValue('  OAKLAND'), C.oak);

  styleLabel(dash.getRange('B13').setValue('Weather'));
  styleValue(dash.getRange('C13').setFormula(wp('weatherType')));

  styleLabel(dash.getRange('B14').setValue('Sentiment'));
  styleData(dash.getRange('C14').setFormula(wpR('sentiment', 2)));

  styleLabel(dash.getRange('B15').setValue('Mood'));
  var moodFormula = '=IFERROR(IF(INDEX(World_Population!2:2,MATCH("sentiment",World_Population!1:1,0))>=0.3,"Thriving",IF(INDEX(World_Population!2:2,MATCH("sentiment",World_Population!1:1,0))>=0.15,"Optimistic",IF(INDEX(World_Population!2:2,MATCH("sentiment",World_Population!1:1,0))>=0,"Content",IF(INDEX(World_Population!2:2,MATCH("sentiment",World_Population!1:1,0))>=-0.15,"Uneasy","Troubled")))),"--")';
  styleData(dash.getRange('C15').setFormula(moodFormula), C.label);

  dash.setRowHeight(16, 8);

  styleLabel(dash.getRange('B17').setValue("A's"));
  styleValue(dash.getRange('C17').setFormula('=IFERROR(INDEX(Sports_Feed!C:C,MATCH("As",Sports_Feed!A:A,0)) & " | " & INDEX(Sports_Feed!F:F,MATCH("As",Sports_Feed!A:A,0)),"--")'), C.oak);

  styleLabel(dash.getRange('B18').setValue('Streak'));
  styleData(dash.getRange('C18').setFormula('=IFERROR(IF(INDEX(Sports_Feed!I:I,MATCH("As",Sports_Feed!A:A,0))="","—",INDEX(Sports_Feed!I:I,MATCH("As",Sports_Feed!A:A,0))),"—")'), C.oak);

  // ═══════════════════════════════════════════════════════════
  // CHICAGO CARD (Rows 11-18) — now parallel with Oakland
  // ═══════════════════════════════════════════════════════════
  dash.getRange('E11:F18').setBackground(C.cardChi);
  addBorder(dash.getRange('E11:F18'));

  dash.getRange('E11:F11').merge();
  styleTitle(dash.getRange('E11').setValue('  CHICAGO'), C.chi);

  styleLabel(dash.getRange('E13').setValue('Weather'));
  styleValue(dash.getRange('F13').setFormula('=IFERROR(INDEX(Chicago_Feed!F:F,2),"--")'));

  styleLabel(dash.getRange('E14').setValue('Sentiment'));
  styleData(dash.getRange('F14').setFormula('=IFERROR(ROUND(INDEX(Chicago_Feed!H:H,2),2),"--")'));

  styleLabel(dash.getRange('E15').setValue('Mood'));
  var chiMoodFormula = '=IFERROR(IF(INDEX(Chicago_Feed!H:H,2)>=0.3,"Thriving",IF(INDEX(Chicago_Feed!H:H,2)>=0.15,"Optimistic",IF(INDEX(Chicago_Feed!H:H,2)>=0,"Content",IF(INDEX(Chicago_Feed!H:H,2)>=-0.15,"Uneasy","Troubled")))),"--")';
  styleData(dash.getRange('F15').setFormula(chiMoodFormula), C.label);

  styleLabel(dash.getRange('E17').setValue('Bulls'));
  styleValue(dash.getRange('F17').setFormula('=IFERROR(INDEX(Sports_Feed!D:D,MATCH("Bulls",Sports_Feed!A:A,0)) & "-" & INDEX(Sports_Feed!E:E,MATCH("Bulls",Sports_Feed!A:A,0)) & " | " & INDEX(Sports_Feed!F:F,MATCH("Bulls",Sports_Feed!A:A,0)),"--")'), C.red);

  styleLabel(dash.getRange('E18').setValue('Streak'));
  styleData(dash.getRange('F18').setFormula('=IFERROR(IF(INDEX(Sports_Feed!I:I,MATCH("Bulls",Sports_Feed!A:A,0))="","—",INDEX(Sports_Feed!I:I,MATCH("Bulls",Sports_Feed!A:A,0))),"—")'), C.red);

  // ═══════════════════════════════════════════════════════════
  // CALENDAR CARD (Rows 20-24)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B20:F24').setBackground(C.card);
  addBorder(dash.getRange('B20:F24'));
  dash.setRowHeight(20, 28);

  dash.getRange('B20:F20').merge();
  styleTitle(dash.getRange('B20').setValue('  CALENDAR'), C.amber);

  styleLabel(dash.getRange('B22').setValue('Season'));
  styleValue(dash.getRange('C22').setFormula(wp('season')), C.amber);

  styleLabel(dash.getRange('B23').setValue('Holiday'));
  styleData(dash.getRange('C23').setFormula('=IFERROR(IF(INDEX(World_Population!2:2,MATCH("holiday",World_Population!1:1,0))="none","—",INDEX(World_Population!2:2,MATCH("holiday",World_Population!1:1,0))),"—")'), C.amber);

  styleLabel(dash.getRange('E22').setValue('Sports'));
  styleValue(dash.getRange('F22').setFormula(wp('sportsSeason')), C.amber);

  styleLabel(dash.getRange('E23').setValue('Special'));
  styleData(dash.getRange('F23').setFormula('=IFERROR(IF(AND(INDEX(World_Population!2:2,MATCH("isFirstFriday",World_Population!1:1,0))<>TRUE,INDEX(World_Population!2:2,MATCH("isCreationDay",World_Population!1:1,0))<>TRUE),"—",IF(AND(INDEX(World_Population!2:2,MATCH("isFirstFriday",World_Population!1:1,0))=TRUE,INDEX(World_Population!2:2,MATCH("isCreationDay",World_Population!1:1,0))=TRUE),"1st Fri + Creation",IF(INDEX(World_Population!2:2,MATCH("isFirstFriday",World_Population!1:1,0))=TRUE,"First Friday","Creation Day"))),"—")'), C.amber);

  // ═══════════════════════════════════════════════════════════
  // WORLD PULSE CARD (Rows 26-33)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B26:F33').setBackground(C.card);
  addBorder(dash.getRange('B26:F33'));
  dash.setRowHeight(26, 28);

  dash.getRange('B26:F26').merge();
  styleTitle(dash.getRange('B26').setValue('  WORLD PULSE'), C.pulse);

  // Left: signals
  styleLabel(dash.getRange('B28').setValue('Civic Load'));
  styleData(dash.getRange('C28').setFormula(wp('civicLoad')), C.pulse);

  styleLabel(dash.getRange('B29').setValue('Migration'));
  styleData(dash.getRange('C29').setFormula('=IFERROR(ROUND(INDEX(World_Population!2:2,MATCH("migrationDrift",World_Population!1:1,0)),0),"--")'), C.pulse);

  styleLabel(dash.getRange('B30').setValue('Pattern'));
  styleData(dash.getRange('C30').setFormula(wp('patternFlag')), C.pulse);

  styleLabel(dash.getRange('B31').setValue('Cycle Weight'));
  styleData(dash.getRange('C31').setFormula(wp('cycleWeight')), C.pulse);

  // Right: city dynamics (rounded to 1 decimal)
  styleLabel(dash.getRange('E28').setValue('Nightlife'));
  styleData(dash.getRange('F28').setFormula(wpR('nightlifeLoad')), C.pulse);

  styleLabel(dash.getRange('E29').setValue('Traffic'));
  styleData(dash.getRange('F29').setFormula(wpR('trafficLoad')), C.pulse);

  styleLabel(dash.getRange('E30').setValue('Retail'));
  styleData(dash.getRange('F30').setFormula(wpR('retailLoad')), C.pulse);

  styleLabel(dash.getRange('E31').setValue('Employment'));
  styleData(dash.getRange('F31').setFormula(wpPct('employmentRate')), C.pulse);

  // ═══════════════════════════════════════════════════════════
  // CIVIC CARD (Rows 35-41)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B35:F41').setBackground(C.cardCivic);
  addBorder(dash.getRange('B35:F41'));
  dash.setRowHeight(35, 28);

  dash.getRange('B35:F35').merge();
  styleTitle(dash.getRange('B35').setValue('  CIVIC'), C.civic);

  styleLabel(dash.getRange('B37').setValue('Active'));
  styleBig(dash.getRange('C37').setFormula('=IFERROR(COUNTIF(Initiative_Tracker!D:D,"active"),"--")'), C.civic);

  dash.getRange('B38').setValue('initiatives').setFontSize(9).setFontColor(C.label);

  styleLabel(dash.getRange('B40').setValue('Pending Vote'));
  styleData(dash.getRange('C40').setFormula('=IFERROR(COUNTIF(Initiative_Tracker!D:D,"pending-vote"),"--")'), C.civic);

  styleLabel(dash.getRange('E37').setValue('Passed'));
  styleBig(dash.getRange('F37').setFormula('=IFERROR(COUNTIF(Initiative_Tracker!N:N,"PASSED")+COUNTIF(Initiative_Tracker!N:N,"APPROVED"),"--")'), C.civic);

  dash.getRange('E38').setValue('total').setFontSize(9).setFontColor(C.label);

  styleLabel(dash.getRange('E40').setValue('Failed'));
  styleData(dash.getRange('F40').setFormula('=IFERROR(COUNTIF(Initiative_Tracker!N:N,"FAILED")+COUNTIF(Initiative_Tracker!N:N,"DENIED"),"--")'), C.red);

  // ═══════════════════════════════════════════════════════════
  // BONDS CARD (Rows 43-49)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B43:F49').setBackground(C.cardBonds);
  addBorder(dash.getRange('B43:F49'));
  dash.setRowHeight(43, 28);

  dash.getRange('B43:F43').merge();
  styleTitle(dash.getRange('B43').setValue('  BONDS'), C.bonds);

  styleLabel(dash.getRange('B45').setValue('Active'));
  styleBig(dash.getRange('C45').setFormula('=IFERROR(COUNTIF(Relationship_Bonds!F:F,"active"),"--")'), C.bonds);

  dash.getRange('B46').setValue('bonds').setFontSize(9).setFontColor(C.label);

  styleLabel(dash.getRange('B48').setValue('Rivalries'));
  styleData(dash.getRange('C48').setFormula('=IFERROR(COUNTIFS(Relationship_Bonds!D:D,"rivalry",Relationship_Bonds!F:F,"active")+COUNTIFS(Relationship_Bonds!D:D,"sports_rival",Relationship_Bonds!F:F,"active"),"--")'), C.bonds);

  styleLabel(dash.getRange('E45').setValue('Alliances'));
  styleBig(dash.getRange('F45').setFormula('=IFERROR(COUNTIFS(Relationship_Bonds!D:D,"alliance",Relationship_Bonds!F:F,"active")+COUNTIFS(Relationship_Bonds!D:D,"mentorship",Relationship_Bonds!F:F,"active"),"--")'), C.bonds);

  dash.getRange('E46').setValue('+ mentorships').setFontSize(9).setFontColor(C.label);

  styleLabel(dash.getRange('E48').setValue('Peak Intensity'));
  styleData(dash.getRange('F48').setFormula('=IFERROR(MAX(IF(Relationship_Bonds!F:F="active",Relationship_Bonds!E:E)),"--")'), C.bonds);

  // ═══════════════════════════════════════════════════════════
  // FOOTER (Row 51)
  // ═══════════════════════════════════════════════════════════
  dash.getRange('B51:F51').merge();
  dash.getRange('B51').setValue('Updated: ' + new Date().toLocaleString()).setFontSize(9).setFontColor(C.label).setHorizontalAlignment('center');

  // Move dashboard to first position
  ss.setActiveSheet(dash);
  ss.moveActiveSheet(1);

  Logger.log('createGodWorldDashboard v2.1: Dashboard created');
  try {
    SpreadsheetApp.getUi().alert('Dashboard v2.1 created!');
  } catch (e) {}
}


/**
 * Refresh the dashboard (updates timestamp)
 */
function refreshDashboard() {
  var ss = openSimSpreadsheet_();
  var dash = ss.getSheetByName('Dashboard');
  if (!dash) {
    Logger.log('Dashboard not found. Run createGodWorldDashboard() first.');
    try { SpreadsheetApp.getUi().alert('Dashboard not found.'); } catch (e) {}
    return;
  }
  dash.getRange('B51').setValue('Updated: ' + new Date().toLocaleString());
  SpreadsheetApp.flush();
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
