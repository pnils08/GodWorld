function auditCounters() {
const results = [
initializeCounter('POP'),
initializeCounter('UNI'),
initializeCounter('CIV'),
initializeCounter('MED'),
initializeCounter('WRK')
];
const log = SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI').getActiveSheet();
const timestamp = new Date().toISOString();
log.appendRow([timestamp, 'Counter Audit', results.join(', ')]);
}
