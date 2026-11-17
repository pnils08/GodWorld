// pipeline.110 — what a worker would wake with at a handed window of 1 and 2 Cycles, against today's (every Cycle). No model call.
// node output/engine-sheet/2026-11-16-worker-window-print.js EMERG-DIR [EMS-DIR ...]
require('/root/GodWorld/lib/env');
const fs = require('fs');
const ww = require('/root/GodWorld/scripts/workerWake.js');
const om = require('/root/GodWorld/scripts/civic-office-map.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (const id of process.argv.slice(2)) {
    for (const window of [undefined, 2, 1]) {
      const w = await ww.buildWake({ officeId: id, cycle: 116, officeMap: om, window });
      const tag = window ? 'w' + window : 'all';
      fs.writeFileSync('/root/GodWorld/output/engine-sheet/2026-11-16-worker-window-print.' + id + '.' + tag + '.md', '## SYSTEM\n\n' + w.system + '\n\n## USER\n\n' + w.user + '\n');
      const blocks = w.user.split(/\n\n(?=[^\n]+:\n)/).map((b) => [b.split('\n')[0].slice(0, 70), b.length]);
      console.log('\n' + id + ' window=' + tag + ' system ' + w.system.length + ' user ' + w.user.length);
      for (const [t, n] of blocks) console.log('   ' + String(n).padStart(6) + '  ' + t);
      await sleep(25000);
    }
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
