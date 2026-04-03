/**
 * ============================================================================
 * exportCitizensSnapshot.js
 * ============================================================================
 * Exports all citizens from Simulation_Ledger to a JSON file in Google Drive.
 * Run this manually after cycle runs to update the local snapshot.
 *
 * Usage: Run exportCitizensSnapshot_() from Apps Script
 * Then download exports/citizens-snapshot.json from Google Drive
 *
 * @version 1.0
 * ============================================================================
 */

var CITIZENS_EXPORT_VERSION = "1.0";

/**
 * Export all citizens from Simulation_Ledger to citizens-snapshot.json
 */
function exportCitizensSnapshot_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Simulation_Ledger");

  if (!sheet) {
    Logger.log("ERROR: Simulation_Ledger sheet not found");
    return null;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log("ERROR: No data in Simulation_Ledger");
    return null;
  }

  // Get headers from first row
  var headers = data[0];
  var citizens = [];

  // Map header names to indices
  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    var header = String(headers[h]).toLowerCase().trim();
    colMap[header] = h;
  }

  // Common column name variations
  var popIdCol = findCol_(colMap, ["popid", "pop_id", "pop id", "id"]);
  var nameCol = findCol_(colMap, ["name", "citizen name", "full name"]);
  var ageCol = findCol_(colMap, ["age"]);
  var tierCol = findCol_(colMap, ["tier", "citizen tier"]);
  var factionCol = findCol_(colMap, ["faction", "political faction"]);
  var roleCol = findCol_(colMap, ["role", "civic role", "office"]);
  var occupationCol = findCol_(colMap, ["occupation", "job", "profession"]);
  var neighborhoodCol = findCol_(colMap, ["neighborhood", "hood", "district"]);
  var personalityCol = findCol_(colMap, ["personality", "traits", "personality traits"]);

  // Process each row
  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Skip empty rows
    var popId = popIdCol !== null ? String(row[popIdCol] || "").trim() : "";
    var name = nameCol !== null ? String(row[nameCol] || "").trim() : "";

    if (!popId && !name) continue;

    var citizen = {
      popId: popId || ("POP-" + String(i).padStart(5, "0")),
      name: name || "Unknown",
      age: ageCol !== null ? (parseInt(row[ageCol]) || null) : null,
      tier: tierCol !== null ? (parseInt(row[tierCol]) || 4) : 4,
      faction: factionCol !== null ? (String(row[factionCol] || "").trim() || null) : null,
      role: roleCol !== null ? (String(row[roleCol] || "").trim() || null) : null,
      occupation: occupationCol !== null ? String(row[occupationCol] || "").trim() : "",
      neighborhood: neighborhoodCol !== null ? String(row[neighborhoodCol] || "").trim() : "",
      personality: personalityCol !== null ? String(row[personalityCol] || "").trim() : ""
    };

    citizens.push(citizen);
  }

  // Build export object
  var snapshot = {
    version: CITIZENS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    source: "Simulation_Ledger",
    citizenCount: citizens.length,
    citizens: citizens
  };

  // Write to exports folder
  var folder = ensureExportsFolder_();
  var filename = "citizens-snapshot.json";
  var json = JSON.stringify(snapshot, null, 2);

  writeOrUpdateFile_(folder, filename, json, true);

  Logger.log("Exported " + citizens.length + " citizens to " + filename);

  return {
    citizenCount: citizens.length,
    filename: filename
  };
}

/**
 * Also export Civic_Office_Ledger for officials
 */
function exportCivicOfficials_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Civic_Office_Ledger");

  if (!sheet) {
    Logger.log("Civic_Office_Ledger not found, skipping");
    return null;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  var headers = data[0];
  var officials = [];

  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    colMap[String(headers[h]).toLowerCase().trim()] = h;
  }

  var popIdCol = findCol_(colMap, ["popid", "pop_id", "pop id"]);
  var nameCol = findCol_(colMap, ["name", "official name"]);
  var officeCol = findCol_(colMap, ["office", "position", "role"]);
  var districtCol = findCol_(colMap, ["district", "ward"]);
  var factionCol = findCol_(colMap, ["faction", "party"]);
  var statusCol = findCol_(colMap, ["status", "active"]);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var popId = popIdCol !== null ? String(row[popIdCol] || "").trim() : "";
    var name = nameCol !== null ? String(row[nameCol] || "").trim() : "";

    if (!popId && !name) continue;

    officials.push({
      popId: popId,
      name: name,
      office: officeCol !== null ? String(row[officeCol] || "").trim() : "",
      district: districtCol !== null ? String(row[districtCol] || "").trim() : "",
      faction: factionCol !== null ? String(row[factionCol] || "").trim() : "",
      status: statusCol !== null ? String(row[statusCol] || "Active").trim() : "Active"
    });
  }

  var snapshot = {
    version: CITIZENS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    source: "Civic_Office_Ledger",
    officialCount: officials.length,
    officials: officials
  };

  var folder = ensureExportsFolder_();
  var json = JSON.stringify(snapshot, null, 2);
  writeOrUpdateFile_(folder, "civic-officials.json", json, true);

  Logger.log("Exported " + officials.length + " officials");
  return { officialCount: officials.length };
}

/**
 * Run both exports
 */
function exportAllCitizenData_() {
  var citizenResult = exportCitizensSnapshot_();
  var officialResult = exportCivicOfficials_();

  return {
    citizens: citizenResult,
    officials: officialResult
  };
}

// Helper to find column by multiple possible names
function findCol_(colMap, names) {
  for (var i = 0; i < names.length; i++) {
    if (colMap[names[i]] !== undefined) return colMap[names[i]];
  }
  return null;
}

// Ensure exports folder exists
function ensureExportsFolder_() {
  var folders = DriveApp.getFoldersByName("exports");
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder("exports");
}
