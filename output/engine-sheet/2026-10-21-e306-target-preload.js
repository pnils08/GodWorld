// engine.306: `node -r` preload that aims scripts/processBusinessIntake.js at E306_TARGET_ID. lib/env loads the .env with
// override: true, so a GODWORLD_SHEET_ID set on the command line would be overwritten when the script requires it; loading it
// here first and setting the id after leaves the script's own require('/root/GodWorld/lib/env') a cache hit.
require('/root/GodWorld/lib/env');
const id = process.env.E306_TARGET_ID;
if (!id) throw new Error('E306_TARGET_ID not set');
process.env.GODWORLD_SHEET_ID = id;
