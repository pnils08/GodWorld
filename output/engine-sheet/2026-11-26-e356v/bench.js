// shared: the bench sheet id (never live) and small readers
require('/root/GodWorld/lib/env');
const fs = require('fs');
const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
if (!idm) { console.error('no bench sheet id'); process.exit(2); }
process.env.GODWORLD_SHEET_ID = idm[1];
module.exports = { sheets: require('/root/GodWorld/lib/sheets'), fs, U: s => String(s || '').trim().toUpperCase() };
