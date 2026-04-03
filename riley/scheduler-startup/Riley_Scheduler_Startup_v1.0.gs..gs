/*********************************************************************
 *  RILEY_SCHEDULER_STARTUP_v1.0 — INSTALLATION NOTES
 *
 *  PURPOSE:
 *    Non-temporal housekeeping automation for GW4.
 *    Keeps directory structure and template integrity verified.
 *    Does NOT advance epochs or world days. Safe for continuous use.
 *
 *  INSTALLATION STEPS:
 *   1.  Open https://script.google.com  → New Project.
 *   2.  Paste this entire script into a file named
 *         Riley_Scheduler_Startup_v1.0.gs
 *   3.  In the editor menu: Triggers → “Add Trigger”.
 *         - Choose function:  rileyHeartbeat_v1
 *         - Event source:     Time-driven
 *         - Type:             Every 12 hours  (or as desired)
 *   4.  On first run, authorize Drive access.
 *         (The script creates and writes plain text logs only.)
 *   5.  Verify output logs appear in:
 *         /GW4_MasterVault/Core/Steward/Ledgers/
 *   6.  Optional manual test:
 *         Run prepareCycleDryRun_v1()  → produces a DryRun_Report_
 *         file without altering ripple or epoch data.
 *
 *  FILE ACCESS RIGHTS:
 *     - Maker (P): view and override only
 *     - Riley (Top Steward): execute and schedule triggers
 *
 *  SAFETY:
 *     - No Dropbox calls.
 *     - No ripple or epoch advancement.
 *     - Safe to leave running indefinitely.
 *********************************************************************/

const GW4 = {
  ROOT: 'GW4_MasterVault',
  CORE: 'GW4_MasterVault/Core/Steward',
  LEDGERS: 'GW4_MasterVault/Core/Steward/Ledgers',
  DIRECTIVES: 'GW4_MasterVault/Core/Steward/Directives',
  TEMPLATES: 'GW4_MasterVault/Core/Steward/Templates',
  BACKUPS: 'GW4_Backups/Core/Steward'
};

function rileyHeartbeat_v1() {
  const stamp = new Date().toISOString();
  const logLine = [
    '[RileyHeartbeat]', stamp,
    'DirCheck:', checkStructure_(),
    'Templates:', checkTemplates_(),
    'ChecksumReady:', 'DEFERRED_TO_RILEY'
  ].join(' | ');
  appendTextFile_(GW4.LEDGERS, `Heartbeat_Log_${stamp}.txt`, logLine + '\n');
}

function prepareCycleDryRun_v1() {
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const report = [];
  report.push('GW4 — Prepare Cycle (Dry Run) v1.0');
  report.push('Timestamp: ' + stamp);
  report.push('Epoch Change: DISABLED (Maker override required)');
  report.push('Directory Check: ' + checkStructure_());
  report.push('Template Check: ' + checkTemplates_());
  report.push('Manifest Template Present: ' + findFile_('ZIP_Manifest_Template_v1.0.txt'));
  report.push('Verification Card Present: ' + findFile_('Backup_Cycle_Verification_Card.pdf'));
  const body = report.join('\n');
  appendTextFile_(GW4.LEDGERS, `DryRun_Report_${stamp}.txt`, body + '\n');
  return 'Dry run completed; see Ledgers for report.';
}

function checkStructure_() {
  const paths = [
    GW4.CORE+'/Directives',
    GW4.CORE+'/Ledgers',
    GW4.CORE+'/Templates'
  ];
  const results = paths.map(p => DriveApp.getFoldersByName(p).hasNext() ? `[OK] ${p}` : `[MISSING] ${p}`);
  return results.join(', ');
}

function checkTemplates_() {
  const required = [
    'Combined_Reporting_Packet_v1.0.pdf',
    'Riley_48Hour_Brief_Template.pdf',
    'Riley_48Hour_Cycle_Summary_Header.pdf',
    'Steward_Synchronization_Log_v1.0.pdf',
    'Steward_Network_Audit_Tracker_v1.0.pdf',
    'ZIP_Manifest_Template_v1.0.txt',
    'Backup_Cycle_Verification_Card.pdf'
  ];
  const res = required.map(name => findFile_(name) ? `[OK] ${name}` : `[MISS] ${name}`);
  return res.join(', ');
}

function findFile_(name) {
  const it = DriveApp.getFilesByName(name);
  return it.hasNext();
}

function appendTextFile_(folderPath, fileName, text) {
  const folder = findOrCreateFolderByPath_(folderPath);
  const iter = folder.getFilesByName(fileName);
  if (iter.hasNext()) {
    const file = iter.next();
    const blob = Utilities.newBlob(file.getBlob().getDataAsString() + text);
    file.setContent(blob.getDataAsString());
  } else {
    folder.createFile(fileName, text, MimeType.PLAIN_TEXT);
  }
}

function findOrCreateFolderByPath_(pathStr) {
  const parts = pathStr.split('/').filter(Boolean);
  let ctx = DriveApp.getRootFolder();
  for (let i = 0; i < parts.length; i++) {
    const name = parts[i];
    let found = null;
    const it = ctx.getFoldersByName(name);
    while (it.hasNext()) { found = it.next(); break; }
    if (!found) { found = ctx.createFolder(name); }
    ctx = found;
  }
  return ctx;
}