/**
 * ───────────────────────────────────────────────
 *  RILEY_INTEGRITY_COMBINED_v1.0
 *  (includes VersionLogger_v1.0 + ChangeManifest_v1.0)
 *  Forensic provenance for GW4 MasterVault
 *  Requires: Advanced Google Service → Drive API (v2)
 *  Triggers:
 *    • rileyVersionLogger_v1 → every 6 hours
 *    • rileyChangeManifest_v1 → weekly (Sun 00:00–01:00)
 *  Safe: Non-temporal. Writes text logs only.
 * ───────────────────────────────────────────────
 */

var INTEGRITY_ROOT = "/GW4_MasterVault/Core/Steward/Integrity/";
var LEDGERS_ROOT   = "/GW4_MasterVault/Core/Steward/Ledgers/";
var DIRECTIVES_ROOT= "/GW4_MasterVault/Core/Steward/Directives/";

/* ───── VERSION LOGGER ───── */
function rileyVersionLogger_v1() {
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'_'HHmm");
  var logFolder = findOrCreateFolderByPath_(INTEGRITY_ROOT + "Version_Log/");
  var indexFolder = findOrCreateFolderByPath_(INTEGRITY_ROOT + "Index/");
  var logName = "VersionLog_" + stamp + ".txt";

  var prevIndex = readJsonFile_(indexFolder, "state.json") || {};
  var nextIndex = {};
  var targets = [LEDGERS_ROOT, DIRECTIVES_ROOT];
  var deltas = [];

  for (var t = 0; t < targets.length; t++) {
    var root = findOrCreateFolderByPath_(targets[t]);
    crawl_(root, nextIndex, deltas, prevIndex);
  }

  for (var fid in prevIndex) {
    if (!nextIndex[fid]) {
      deltas.push(JSON.stringify({
        type: "DELETED",
        fileId: fid,
        name: prevIndex[fid].name,
        when: new Date().toISOString()
      }));
    }
  }

  var body = deltas.length ? deltas.join("\n") + "\n" : "[noop] " + new Date().toISOString() + "\n";
  logFolder.createFile(logName, body, MimeType.PLAIN_TEXT);
  writeJsonFile_(indexFolder, "state.json", nextIndex);
}

/* recurse folders */
function crawl_(folder, nextIndex, deltas, prevIndex) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var fid = f.getId();
    var entry = {
      name: f.getName(),
      size: f.getSize(),
      mimeType: f.getMimeType(),
      md5: f.getMd5Checksum && f.getMd5Checksum(),
      revId: latestRevisionId_(fid),
      modified: f.getLastUpdated() ? f.getLastUpdated().toISOString() : null
    };
    nextIndex[fid] = entry;
    var prev = prevIndex[fid];
    if (!prev) {
      deltas.push(JSON.stringify({type:"NEW", fileId: fid, name: entry.name, when: new Date().toISOString()}));
    } else if (
      (entry.md5 && entry.md5 !== prev.md5) ||
      (entry.revId && entry.revId !== prev.revId) ||
      (entry.size !== prev.size) ||
      (entry.modified !== prev.modified)
    ) {
      deltas.push(JSON.stringify({type:"MODIFIED", fileId: fid, name: entry.name, when: new Date().toISOString()}));
    }
  }
  var subs = folder.getFolders();
  while (subs.hasNext()) crawl_(subs.next(), nextIndex, deltas, prevIndex);
}

/* latest revision id via Drive API v2 */
function latestRevisionId_(fileId) {
  try {
    var revs = Drive.Revisions.list(fileId);
    if (revs && revs.items && revs.items.length) {
      return revs.items[revs.items.length - 1].id;
    }
  } catch (e) { Logger.log("Revisions error: " + e); }
  return null;
}

/* ───── CHANGE MANIFEST ───── */
function rileyChangeManifest_v1() {
  var logFolder = findOrCreateFolderByPath_(INTEGRITY_ROOT + "Version_Log/");
  var outFolder = findOrCreateFolderByPath_(INTEGRITY_ROOT + "Manifests/");
  var now = new Date();
  var weekNum = Utilities.formatDate(now, Session.getScriptTimeZone(), "YYYY-'W'ww");
  var outName = "Change_Manifest_" + weekNum + ".txt";

  var manifest = [];
  manifest.push("CHANGE MANIFEST v1.0 — " + weekNum);
  manifest.push("Generated: " + now.toISOString());
  manifest.push("====================================");

  var files = logFolder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (f.getName().match(/^VersionLog_/)) {
      manifest.push("");
      manifest.push("---- " + f.getName() + " ----");
      manifest.push(f.getBlob().getDataAsString());
    }
  }
  outFolder.createFile(outName, manifest.join("\n"), MimeType.PLAIN_TEXT);
}

/* ───── Shared helpers ───── */
function findOrCreateFolderByPath_(pathStr) {
  var parts = pathStr.split('/').filter(function(p){return p;});
  var ctx = DriveApp.getRootFolder();
  for (var i=0;i<parts.length;i++) {
    var it = ctx.getFoldersByName(parts[i]);
    ctx = it.hasNext() ? it.next() : ctx.createFolder(parts[i]);
  }
  return ctx;
}

function readJsonFile_(folder, name) {
  var it = folder.getFilesByName(name);
  if (!it.hasNext()) return null;
  try { return JSON.parse(it.next().getBlob().getDataAsString()); }
  catch(e){ Logger.log("JSON parse error: "+e); return null; }
}

function writeJsonFile_(folder, name, obj) {
  var json = JSON.stringify(obj);
  var it = folder.getFilesByName(name);
  if (it.hasNext()) it.next().setContent(json);
  else folder.createFile(name, json, MimeType.PLAIN_TEXT);
}
