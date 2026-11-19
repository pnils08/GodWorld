'use strict';
// pipeline.110 — print what ONE reporter would wake with on the worker shape. No model call, nothing written but the
// print beside this file. Who she is comes off the sheet (line, temperament, family, CitizenBio); her memory is her own
// page, gathered as a worker's is; her records are the Cycle's slice facts with the assignment, hook and file refs
// taken off; the day's interviews as they landed; the worker tools. Usage: node <this> <persona> <desk> <cycle>
require('/root/GodWorld/lib/env');
const fs = require('fs'), path = require('path');
const ROOT = '/root/GodWorld';
const WW = require(path.join(ROOT, 'scripts/workerWake.js'));
const RI = require(path.join(ROOT, 'scripts/reporterIdentity.js'));
const pk = require(path.join(ROOT, 'scripts/newsroom-wake-packages.json'));
const [persona, desk, cycle] = [process.argv[2] || 'tamsin-pruitt', process.argv[3] || 'culture', Number(process.argv[4] || 116)];
// The job, one sentence, as a worker's (workerWake.JOBS). Wording is the builder's; this is a draft from his beat line.
const JOBS = {
  'tamsin-pruitt': 'You write the Bay Tribune\'s Lives page. Your job is to put the people this Cycle happened to in the paper — births, weddings, deaths, retirements, promotions, graduations, hospital stays and recoveries, new households, a win or a loss — whoever it happens to.',
};
const KEYS = { 'tamsin-pruitt': 'births deaths weddings retirements promotions graduations hospital households' };
function ledgerRow(popid) {
  for (const l of fs.readFileSync(path.join(ROOT, 'output/simulation_ledger_snapshot.jsonl'), 'utf8').split('\n')) {
    if (!l.includes(popid)) continue; try { const r = JSON.parse(l); if (r.POPID === popid) return r; } catch (e) { /* next */ }
  }
  return {};
}
(async () => {
  const c = pk[persona]; const popid = c.assignment.popid;
  const sl = await RI.sheetLine(popid);
  const row = ledgerRow(popid);
  const tp = String(row.TraitProfile || '').split('|');
  const arche = (tp.find((x) => /^Archetype:/.test(x)) || '').replace('Archetype:', '');
  const memory = await WW.gatherMemory(popid, KEYS[persona] || '', undefined);
  const system = [sl.line || '(sheet line unread: ' + sl.error + ')', row.CitizenBio ? row.CitizenBio : '', '', JOBS[persona] || '(no job sentence written)']
    .concat(memory.entries.length ? ['', 'From your own memory:', ...memory.entries.map((m) => '- (' + m.when + ') ' + m.text)] : []).filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n');
  const slice = fs.readFileSync(path.join(ROOT, 'output/slices/c' + cycle, persona + '.md'), 'utf8');
  const facts = slice.split('\n').filter((l) => /^- /.test(l) && !/^- (Angle|Hook|Note):/.test(l)).map((l) => l.replace(/\s*_\[[^\]]*\]_\s*$/, ''));
  let quotes = [];
  try { quotes = (JSON.parse(fs.readFileSync(path.join(ROOT, 'output/cron-compare', desk + '_c' + cycle + '_' + persona + '_packet-v2_packet.json'), 'utf8')).quotes || []).filter((q) => q && q.quote); } catch (e) { /* none landed */ }
  const user = ['The people of Cycle ' + cycle + ':\n' + facts.join('\n'),
    quotes.length ? 'What they told you when you asked:\n' + quotes.map((q) => '- ' + q.name + ': "' + q.quote + '"').join('\n') : '',
    'Cycle ' + cycle + ': write today\'s Lives page. Your reply is printed as you give it.'].filter(Boolean).join('\n\n');
  const tools = WW.TOOLS.map((t) => '- ' + t.function.name + ': ' + t.function.description).join('\n');
  const out = ['# ' + c.assignment.name + ' — what she would wake with (print, no model call)', '', 'Cycle ' + cycle + ' · sheet archetype ' + (arche || '—') + ' · memory: ' + memory.entries.length + ' entries (' + (memory.failed.length ? 'failed: ' + memory.failed.join('; ') : 'read ok') + ')',
    '', '## Who she is, her job, her memory (' + system.length + ' characters)', '', system, '', '## In front of her (' + user.length + ' characters)', '', user, '', '## What she can look up', '', tools, ''].join('\n');
  const dest = path.join(__dirname, '2026-11-18-reporter-wake-print.' + persona + '.md');
  fs.writeFileSync(dest, out);
  console.log(dest + '\nsystem ' + system.length + ' chars, user ' + user.length + ' chars, facts ' + facts.length + ', quotes ' + quotes.length + ', memory ' + memory.entries.length);
})().catch((e) => { console.error(e); process.exit(1); });
