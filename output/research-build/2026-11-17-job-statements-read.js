#!/usr/bin/env node
/* engine.347 Task 5 — read. What office holders, council seats, city workers, Mara and Varek saved to
 * their own pages from Mon 2026-11-09 on (CIVIC / directive / journal entries), per speaker.
 * Read-only: page reads only; writes 2026-11-17-job-statements-rows.json beside this file.
 * Run: node output/research-build/2026-11-17-job-statements-read.js
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const page = require('/root/GodWorld/lib/citizenPage');
const SINCE = '2026-11-09';
const map = JSON.parse(fs.readFileSync('/root/GodWorld/scripts/civic-office-map.json', 'utf8'));
const who = new Map();
for (const o of [...(map.offices || []), ...(map.projects || [])]) if (o.popid) who.set(String(o.popid).toUpperCase(), { name: o.holder, seat: o.agentDir || o.officeId || o.projectId });
const dwDir = '/root/GodWorld/output/cron-civic/datawake';
for (const f of fs.readdirSync(dwDir)) {
  if (!/_2026-11-\d\d\.json$/.test(f)) continue;
  try { const j = JSON.parse(fs.readFileSync(path.join(dwDir, f), 'utf8')); if (j.popid && !who.has(String(j.popid).toUpperCase())) who.set(String(j.popid).toUpperCase(), { name: j.holder, seat: j.agentDir }); } catch (e) {}
}
who.set('POP-00507', { name: 'Mara Vance', seat: 'planning-director' });
who.set('POP-00789', { name: 'Elias Varek', seat: 'civis-journal' });

(async () => {
  const rows = [];
  for (const [pop, w] of who) {
    const r = await page.recentPage_(pop, 60);
    if (r.error) { console.log('ERR', pop, r.error); continue; }
    for (const d of r.results || []) {
      const md = d.metadata || {};
      const dp = String(md.daypart || '');
      const day = String(d.createdAt || '').slice(0, 10);
      if (day < SINCE) continue;
      rows.push({ pop, name: w.name, seat: w.seat, day, daypart: dp, kind: md.kind || md.type || '', cycle: md.cycle, customId: d.customId || '', chars: String(d.content || '').length, text: String(d.content || '').replace(/\s+/g, ' ').trim() });
    }
  }
  fs.writeFileSync(path.join(__dirname, '2026-11-17-job-statements-rows.json'), JSON.stringify(rows, null, 1));
  const m = {};
  rows.forEach((x) => { const k = x.daypart + ' / ' + x.kind; m[k] = (m[k] || 0) + 1; });
  console.log('speakers read', who.size, ' entries since', SINCE, rows.length);
  console.log(m);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
