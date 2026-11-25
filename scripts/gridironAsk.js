#!/usr/bin/env node
'use strict';
/**
 * scripts/gridironAsk.js — put one question to Gridiron Analytics from the command line (pipeline.111 test path).
 *   node scripts/gridironAsk.js --cycle 117 --print "Who should lead off for the A's?"   # the wake as built, no model call
 *   node scripts/gridironAsk.js --cycle 117 "Who should lead off for the A's?"           # the answer
 *   --office GIA-PITCHING   skip the router;   --as "Anthony Raines|A's beat"   who asks
 */
require('/root/GodWorld/lib/env');
const G = require('./gridiron');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : null; };
const cycle = Number(flag('--cycle') || 117);
const office = flag('--office');
const as = (flag('--as') || 'Anthony Raines|A\'s beat').split('|');
const print = argv.includes('--print'); if (print) argv.splice(argv.indexOf('--print'), 1);
const question = argv.join(' ');
(async () => {
  const r = await G.ask({ question, cycle, officeId: office, dryRun: print, asker: { name: as[0], beat: as[1] } });
  console.log('ROUTE: ' + (r.officeId || 'none') + ' — ' + ((r.route || {}).why || ''));
  if (print) { console.log('\n=== SYSTEM ===\n' + r.system + '\n\n=== USER ===\n' + r.user + '\n\n=== RECORDS a read away ===\n' + Object.keys(r.records || {}).join('\n')); return; }
  console.log((r.name ? r.name + ', ' + r.title + ' (' + r.finish + '):\n' : '') + r.text);
  if (r.toolReads && r.toolReads.length) console.log('\nreads: ' + r.toolReads.map((t) => t.name + ' ' + JSON.stringify(t.input)).join(' | '));
})().catch((e) => { console.error(e); process.exit(1); });
