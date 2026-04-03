/***** ONE-PASTE VAULT REGISTRY + SYNC + TRIGGERS *****/

// === 0) CONFIG: your vaults (real IDs from your Drive) ===
const VAULTS = [
{ name: "Creative_Vault", id: "1lAyKfluJVTVpA4Y-H612EWAjqh-IQ9JM", type: "Vault" },
{ name: "Codex", id: "18p6gFgpyigxkZjgvQbaSitV-caU4OZUE", type: "Vault" },
{ name: "ANI", id: "1gny3Dqxs21mdT8IUpTcaMqxCpVjFIIld", type: "Vault" },
{ name: "Civic Ledger", id: "1VfsPU4S_pmLNxJvdAfk9uSmpATXm1Agj", type: "Ledger" },
{ name: "God_Mode", id: "1Z86nWmB-MRZH9ckhQFxkP5iSwofolHat", type: "Vault" },
{ name: "Population Ledger", id: "1aHzsI11BkLyv-KpQf6NGwmWucfYcwVNZ", type: "Ledger" },
{ name: "Universe Ledger", id: "1XD1UT_0238Xd0A7gtstKFYXzFwV1QiWP", type: "Ledger" }
];

// === 1) One-shot setup: creates/refreshes the sheet and wires triggers ===
function setupOnce() {
const sh = ensureVaultRegistry_();
writeHeaders_(sh);
upsertAllRows_(sh, VAULTS);
installTriggers_();
SpreadsheetApp.flush();
log_("Setup complete: registry populated and triggers installed.");
}

// === 2) Daily jobs (auto-wired): refresh status and timestamps ===
function updateManifest() {
const sh = ensureVaultRegistry_();
const map = readRowsToMap_(sh);
let changed = false;
VAULTS.forEach(v => {
const ok = folderExists_(v.id);
const row = map.get(v.name) || insertEmptyRow_(sh, v.name);
sh.getRange(row, 3).setValue(v.type);
sh.getRange(row, 4).setValue(ok ? "Active" : "Missing");
sh.getRange(row, 5).setValue(new Date()); // Last Sync
sh.getRange(row, 2).setValue(v.id); // Folder ID (ensure correct)
sh.getRange(row, 6).setValue("Riley"); // Steward
changed = true;
});
if (changed) SpreadsheetApp.flush();
log_("Manifest updated.");
}

function syncVaults() {
// Light “heartbeat” that just touches each folder to keep tokens fresh
VAULTS.forEach(v => { if (folderExists_(v.id)) void DriveApp.getFolderById(v.id).getName(); });
const sh = ensureVaultRegistry_();
sh.getRange(1, 8).setValue("Last Heartbeat: " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"));
log_("Vault heartbeat ok.");
}

// === 3) Helpers ===
function ensureVaultRegistry_() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
let sh = ss.getSheetByName("Vault Registry");
if (!sh) sh = ss.insertSheet("Vault Registry");
return sh;
}

function writeHeaders_(sh) {
const headers = ["Vault Name","Folder ID","Type","Status","Last Sync","Steward","Notes","System Flag"];
sh.getRange(1,1,1,headers.length).setValues([headers]);
sh.getRange("A1:H1").setFontWeight("bold");
sh.setFrozenRows(1);
}

function readRowsToMap_(sh) {
const last = sh.getLastRow();
const map = new Map();
if (last < 2) return map;
const vals = sh.getRange(2,1,last-1,8).getValues();
for (let i=0;i<vals.length;i++){
const name = vals[i][0];
if (name) map.set(name, i+2);
}
return map;
}

function upsertAllRows_(sh, items) {
const map = readRowsToMap_(sh);
items.forEach(v => {
const row = map.get(v.name) || insertEmptyRow_(sh, v.name);
sh.getRange(row, 1).setValue(v.name); // Vault Name
sh.getRange(row, 2).setValue(v.id); // Folder ID
sh.getRange(row, 3).setValue(v.type); // Type
sh.getRange(row, 4).setValue(folderExists_(v.id) ? "Active" : "Missing"); // Status
sh.getRange(row, 5).setValue(new Date()); // Last Sync
sh.getRange(row, 6).setValue("Riley"); // Steward
});
}

function insertEmptyRow_(sh, name){
const row = (sh.getLastRow() || 1) + 1;
sh.getRange(row,1).setValue(name || "");
return row;
}

function folderExists_(id){
try { DriveApp.getFolderById(id).getId(); return true; } catch(e){ return false; }
}

function installTriggers_() {
const self = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
const need = fn => self.indexOf(fn) === -1;
if (need("updateManifest")) {
ScriptApp.newTrigger("updateManifest").timeBased().everyDays(1).atHour(7).create();
}
if (need("syncVaults")) {
ScriptApp.newTrigger("syncVaults").timeBased().everyDays(1).atHour(7).create();
}
}

function log_(msg){ console.log("[VaultRegistry] " + msg); }
