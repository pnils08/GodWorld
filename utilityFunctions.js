function pickRandom_(arr) {
if (!arr || arr.length === 0) return null;
const idx = Math.floor(Math.random() * arr.length);
return arr[idx];
}
function pickRandomSet_(arr, count) {
if (!arr || arr.length === 0) return [];
if (count >= arr.length) return arr.slice();

const copy = arr.slice();
const result = [];

for (let i = 0; i < count; i++) {
const idx = Math.floor(Math.random() * copy.length);
result.push(copy[idx]);
copy.splice(idx, 1);
}

return result;
}
function maybePick_(arr) {
if (Math.random() < 0.5) return null;
return pickRandom_(arr);
}
function shortId_() {
return Utilities.getUuid().slice(0, 8).toUpperCase();
}
function ensureSheet_(ss, name, headers) {
let sheet = ss.getSheetByName(name);
if (!sheet) {
sheet = ss.insertSheet(name);
if (headers && headers.length > 0) sheet.appendRow(headers);
}
return sheet;
}
function colIndex_(letter) {
return letter.toUpperCase().charCodeAt(0) - 64;
}
function safeGet_(sheet, row, col) {
const v = sheet.getRange(row, col).getValue();
return v === "" || v === null || typeof v === "undefined" ? null : v;
}
