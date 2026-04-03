/**
 * ───────────────────────────────────────────────
 *  RILEY_INTEGRITY_DASHBOARD_v1.0
 *  Creates and maintains a Google Sheet dashboard
 *  for VersionLogger and ChangeManifest outputs.
 *  Safe: Read-only. No ripple advancement.
 * ───────────────────────────────────────────────
 */

var DASHBOARD_NAME = "Riley Integrity Dashboard";
var INTEGRITY_PATH = "/GW4_MasterVault/Core/Steward/Integrity/";

/* ───── MAIN ───── */
function rileyIntegrityDashboard_v1() {
  var ss = getOrCreateSheet_();
  ss.getSheetByName("Overview").clear();
  ss.getSheetByName("Version Logs").clear();
  ss.getSheetByName("Manifests").clear();

  buildOverview_(ss.getSheetByName("Overview"));
  buildVersionLogs_(ss.getSheetByName("Version Logs"));
  buildManifests_(ss.getSheetByName("Manifests"));
}

/* ───── OVERVIEW TAB ───── */
function buildOverview_(sheet) {
  sheet.appendRow(["System", "Status", "Last Version Log", "Last Manifest", "Next Trigger"]);
  var now = new Date();
  var versionFolder = findOrCreateFolderByPath_(INTEGRITY_PATH + "Version_Log/");
  var manifestFolder = findOrCreateFolderByPath_(INTEGRITY_PATH + "Manifests/");

  var lastVersion = getLastFileDate_(versionFolder);
  var lastManifest = getLastFileDate_(manifestFolder);

  var status = (now - lastVersion < 21600000) ? "🟢 ACTIVE" : "🟡 STALE";
  var nextRun = new Date(lastVersion.getTime() + 21600000);
  sheet.appendRow(["Integrity Engine", status, lastVersion.toISOString(), lastManifest.toISOString(), nextRun.toISOString()]);
}

/* ───── VERSION LOGS TAB ───── */
function buildVersionLogs_(sheet) {
  sheet.appendRow(["File", "Type", "Name", "When"]);
  var folder = findOrCreateFolderByPath_(INTEGRITY_PATH + "Version_Log/");
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (!f.getName().match(/^VersionLog_/)) continue;
    var lines = f.getBlob().getDataAsString().split("\n");
    for (var i=0; i<lines.length; i++) {
      if (lines[i].trim().length < 3 || lines[i].startsWith("[noop")) continue;
      var obj = JSON.parse(lines[i]);
      sheet.appendRow([f.getName(), obj.type, obj.name, obj.when]);
    }
  }
}

/* ───── MANIFESTS TAB ───── */
function buildManifests_(sheet) {
  sheet.appendRow(["Manifest", "Entry"]);
  var folder = findOrCreateFolderByPath_(INTEGRITY_PATH + "Manifests/");
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (!f.getName().match(/^Change_Manifest_/)) continue;
    var content = f.getBlob().getDataAsString();
    sheet.appendRow([f.getName(), content.substring(0, 5000)]);
  }
}

/* ───── HELPERS ───── */
function getOrCreateSheet_() {
  var files = DriveApp.getFilesByName(DASHBOARD_NAME);
  if (files.hasNext()) return SpreadsheetApp.open(files.next());
  var file = SpreadsheetApp.create(DASHBOARD_NAME);
  file.insertSheet("Overview");
  file.insertSheet("Version Logs");
  file.insertSheet("Manifests");
  return file;
}

function getLastFileDate_(folder) {
  var files = folder.getFiles();
  var latest = new Date(0);
  while (files.hasNext()) {
    var f = files.next();
    if (f.getLastUpdated() > latest) latest = f.getLastUpdated();
  }
  return latest;
}

function findOrCreateFolderByPath_(pathStr) {
  var parts = pathStr.split('/').filter(Boolean);
  var ctx = DriveApp.getRootFolder();
  for (var i = 0; i < parts.length; i++) {
    var it = ctx.getFoldersByName(parts[i]);
    ctx = it.hasNext() ? it.next() : ctx.createFolder(parts[i]);
  }
  return ctx;
}