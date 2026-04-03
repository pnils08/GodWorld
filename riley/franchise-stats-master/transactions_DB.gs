/**
* Automatically timestamps new transactions and generates unique IDs.
* Version: 1.1
* Author: P Slayer (for Franchise_Stats_Master)
*/

function onEdit(e) {
const sheet = e.source.getActiveSheet();
if (sheet.getName() === 'Transactions_DB') {
const row = e.range.getRow();
const col = e.range.getColumn();

// only act if editing from PlayerID or later columns (D+)
if (col >= 4) {
const dateCell = sheet.getRange(row, 2);
const seasonCell = sheet.getRange(row, 3);
const idCell = sheet.getRange(row, 1);

// set current date if blank
if (!dateCell.getValue()) {
dateCell.setValue(new Date());
}

// if ID empty, build a new one like "OAK2039T001"
if (!idCell.getValue()) {
const season = seasonCell.getValue() || "XXXX";
const nextRow = row - 1;
const newID = `OAK${new Date().getFullYear()}T${String(nextRow).padStart(3,'0')}`;
idCell.setValue(newID);
}
}
}
}