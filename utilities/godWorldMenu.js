/**
 * ============================================================================
 * GOD WORLD — UNIFIED MENU
 * ============================================================================
 *
 * Single onOpen() for the entire project. Consolidates menus from
 * godWorldDashboard.js and cycleExportAutomation.js into one place.
 *
 * Submenus:
 *   Engine      — Run cycles, dry runs
 *   Media       — Process intake, parse markdown
 *   Exports     — Cycle exports, mirrors, handoff
 *   Dashboard   — Create/refresh dashboard
 *   Setup       — One-time setup functions
 *
 * ============================================================================
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('GodWorld')

    // ── Engine ──────────────────────────────────────────────
    .addSubMenu(ui.createMenu('Engine')
      .addItem('Run World Cycle', 'runWorldCycle')
      .addItem('Dry Run Cycle', 'runDryRunCycle'))

    .addSeparator()

    // ── Media Intake ────────────────────────────────────────
    .addSubMenu(ui.createMenu('Media Intake')
      .addItem('Process Media Intake', 'processMediaIntakeV2')
      .addItem('Parse Media Room Markdown', 'parseMediaRoomMarkdown'))

    .addSeparator()

    // ── Exports ─────────────────────────────────────────────
    .addSubMenu(ui.createMenu('Exports')
      .addItem('Export Current Cycle (All)', 'exportCurrentCycleAll')
      .addSeparator()
      .addItem('Export Riley_Digest', 'exportRileyDigest')
      .addItem('Export World_Population', 'exportWorldPopulation')
      .addItem('Export Simulation_Ledger', 'exportSimulationLedger')
      .addItem('Export Continuity_Log', 'exportContinuityLog')
      .addSeparator()
      .addItem('Update All Running Mirrors', 'updateAllMirrors')
      .addItem('Full Export + Mirror Update', 'fullExportAndMirror')
      .addSeparator()
      .addItem('Compile Handoff', 'compileHandoffFromMenu')
      .addItem('Open Export Folder', 'openExportFolder')
      .addItem('Show Config', 'showConfig'))

    .addSeparator()

    // ── Dashboard ───────────────────────────────────────────
    .addSubMenu(ui.createMenu('Dashboard')
      .addItem('Create Dashboard', 'createGodWorldDashboard')
      .addItem('Refresh Dashboard', 'refreshDashboard'))

    .addSeparator()

    // ── Setup (one-time) ────────────────────────────────────
    .addSubMenu(ui.createMenu('Setup')
      .addItem('Setup Sports Feed Validation', 'setupSportsFeedValidation')
      .addItem('Setup Civic Ledger Columns', 'setupCivicLedgerColumns'))

    .addToUi();
}
