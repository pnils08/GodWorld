// engine.356 cut B — the bonds as they stand on the sandbox before the fire (read.js measures against this).
require('/root/GodWorld/lib/env');
const fs = require('fs');
const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
if (!idm) { console.error('no bench sheet id'); process.exit(2); }
process.env.GODWORLD_SHEET_ID = idm[1];
const sheets = require('/root/GodWorld/lib/sheets');
(async () => { const b = await sheets.getSheetAsObjects('Relationship_Bonds'); fs.writeFileSync(__dirname + '/bonds-before.json', JSON.stringify(b)); console.log(JSON.stringify({ bondsBefore: b.length })); })().catch(e => { console.error(e.message || e); process.exit(2); });
