function verifyFranchiseNode() {
const node = "Franchise_Stats_Master";
const log = SpreadsheetApp.openById("1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI")
.getSheetByName("Federation_Status");
const status = "✅ Active";
log.appendRow([new Date(), node, status, Session.getActiveUser().getEmail()]);
}
