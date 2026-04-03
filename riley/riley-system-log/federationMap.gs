/**
* Federation Map Registry
* Defines directional data flows between systems in The Wild universe.
* Each source points to its downstream targets.
*/

function registerFederationMap() {
const map = {
"Population_Ledger": ["Civic_Ledger"],
"Civic_Ledger": ["Franchise_Stats_Master"],
"Franchise_Stats_Master": ["Bay_Tribune", "Wild_Media_Newswire"],
"Wild_Media_Newswire": ["Riley_System_Log"],
"Bay_Tribune": ["Riley_System_Log"],
"Riley_System_Log": ["The_Wild"],
"The_Wild": ["Slayer_Syndicate"]
};

const ss = SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI');
const sheet = ss.getSheetByName('Federation_Map') || ss.insertSheet('Federation_Map');
sheet.clearContents();
sheet.appendRow(['Source_System','Target_System']);

Object.keys(map).forEach(source => {
map[source].forEach(target => {
sheet.appendRow([source, target]);
});
});

return 'Federation Map registered successfully';
}
