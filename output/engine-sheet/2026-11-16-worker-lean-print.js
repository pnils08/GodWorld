// pipeline.110 — what a lean worker (workerWake JOBS) wakes with, read live, no model call. Prints the system turn, the
// user turn, the tools offered and each whole record's size behind record_read.
// node output/engine-sheet/2026-11-16-worker-lean-print.js CHIEF-FIRE [EMERG-DIR ...]
require('/root/GodWorld/lib/env');
const fs = require('fs');
const ww = require('/root/GodWorld/scripts/workerWake.js');
const om = require('/root/GodWorld/scripts/civic-office-map.json');
(async () => {
  for (const id of process.argv.slice(2)) {
    const w = await ww.buildWake({ officeId: id, cycle: 116, officeMap: om });
    const tools = ww.toolsFor(id, { records: w.records }).map((t) => t.function.name);
    const body = '## SYSTEM (' + w.system.length + ' chars)\n\n' + w.system + '\n\n## USER (' + w.user.length + ' chars)\n\n' + w.user +
      '\n\n## TOOLS\n\n' + tools.join(', ') + '\n\n## WHOLE RECORDS BEHIND record_read\n\n' + Object.entries(w.records).map(([k, v]) => '- ' + k + ': ' + v.length + ' chars').join('\n') + '\n';
    fs.writeFileSync('/root/GodWorld/output/engine-sheet/2026-11-16-worker-lean-print.' + id + '.md', body);
    console.log('\n================ ' + id + '\n' + body);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
