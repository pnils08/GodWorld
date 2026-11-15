#!/usr/bin/env node
'use strict';
// pipeline.110 Task 9 — print what a council seat on the template wakes with (scripts/seatWake.js). No model call, nothing written
// but the print. As the chief's Task 9 print (2026-11-14-worker-wake-print.js). Usage: node output/engine-sheet/2026-11-15-seat-wake-print.js [COUNCIL-D9] [cycle]
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const ROOT = '/root/GodWorld';
const sw = require(ROOT + '/scripts/seatWake');
const { buildPack } = require(ROOT + '/scripts/buildCivicOfficeSlice');

(async () => {
  const officeId = process.argv[2] || 'COUNCIL-D9';
  const cycle = Number(process.argv[3] || fs.readFileSync(path.join(ROOT, 'output', 'beats', 'meta.json'), 'utf8').match(/"cycle":\s*(\d+)/)[1]);
  const office = (require(ROOT + '/scripts/civic-office-map.json').offices || []).find((o) => o.officeId === officeId);
  if (!office) throw new Error('no office ' + officeId);
  const pack = buildPack({ cycle, agentDir: office.agentDir, root: ROOT });
  const w = await sw.buildWake({ office, cycle, pack });
  const tools = sw.toolsFor(office, pack);
  const text = '=== ' + office.holder + ', ' + office.title + ' — the council template, what the seat wakes with, Cycle ' + cycle + ' (no model call) ===\n' +
    '--- system ---\n' + w.system + '\n--- user ---\n' + w.user + '\n--- tools ---\n' + tools.map((t) => t.function.name + ' — ' + t.function.description).join('\n') + '\n';
  const out = path.join(__dirname, '2026-11-15-seat-wake-print.' + office.agentDir.replace(/^civic-office-/, '') + '.txt');
  fs.writeFileSync(out, text);
  console.log(out + ' — system ' + w.system.length + ' / user ' + w.user.length + ' chars; memory ' + w.memory.entries.length + '; decisions ' + w.decisions.length + '; tools ' + tools.length);
})().catch((e) => { console.error(e.message); process.exit(1); });
