function Test_Open_Riley_Log() {
const REGISTRY_ID = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI";
const file = SpreadsheetApp.openById(REGISTRY_ID);
const sheet = file.getSheetByName("Vault Registry");
Logger.log(sheet.getName());
}

