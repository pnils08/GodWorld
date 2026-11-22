// pipeline.111 test only: Sharon's C116 records as the evening rows the engine wrote, in the lifestyle slice's
// shape, so the real test runner hands her these instead of the fame list (swapped in memory by bootswap.js).
const fs = require('fs'), path = require('path');
const ROOT = '/root/GodWorld', C = 116, OUT = path.join(__dirname, 'sharon-evening-slice-c116.json');
const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'output/cron-compare/lifestyle_slice_c116.json'), 'utf8'));
const ws = fs.readFileSync(path.join(ROOT, 'output/world_summary_c116.md'), 'utf8').split('\n');
const rows = [];
const evI = ws.findIndex(l => l.startsWith('## Evening Texture'));
for (let j = evI + 1; j < ws.length && !ws[j].startsWith('#'); j++) if (ws[j].trim()) rows.push({ text: ws[j].replace(/^- /, '').replace(/\*\*/g, ''), src: 'world_summary_c116.md ## Evening Texture' });
const sec = h => { const i = ws.findIndex(l => l.startsWith(h)); const o = []; for (let j = i + 1; j < ws.length && !ws[j].startsWith('#'); j++) if (ws[j].trim()) o.push(ws[j].replace(/^- /, '')); return o; };
for (const l of sec('### city-event')) rows.push({ text: l, src: 'Ripple_Ledger C116 city-event' });
for (const l of sec('### lifestyle-sighting')) rows.push({ text: l, src: 'Ripple_Ledger C116 lifestyle-sighting' });
const gn = ws.find(l => /^- game-night-texture/.test(l)); if (gn) rows.push({ text: gn.replace(/^- /, ''), src: 'Ripple_Ledger C116 game-night-texture' });
const snap = new Map(); for (const l of fs.readFileSync(path.join(ROOT, 'output/simulation_ledger_snapshot.jsonl'), 'utf8').split('\n')) { if (!l) continue; const r = JSON.parse(l); snap.set(r.POPID, r); snap.set((r.First + ' ' + r.Last).trim(), r); }
const person = (r, why) => r && { popid: r.POPID, name: (r.First + ' ' + r.Last).trim(), role: r.RoleType || '', neighborhood: r.Neighborhood || '', business: null, profile: (r.First + ' ' + r.Last).trim() + ' — ' + (r.RoleType || '') + ' — ' + (r.Neighborhood || ''), why };
const citizens = [];
for (const n of ['Theo Banks', 'Ernesto Quintero', 'Desmond Morton']) { const p = person(snap.get(n), 'spotted C116 (lifestyle-sighting)'); if (p) citizens.push(p); }
for (const id of (gn.match(/POP-\d+/g) || [])) { const p = person(snap.get(id), 'game night shaped their day C116 (game-night-texture)'); if (p) citizens.push(p); }
const slice = Object.assign({}, base, {
  hood: null, pulse: null,
  story: { kind: 'beat-lifestyle', angle: 'the evening record of C116', label: 'the evening record of C116', hookLine: '', hood: null, citizens: citizens.map(c => c.name), popids: citizens.map(c => c.popid), ref: 'the evening record of C116', cycle: C },
  approach: '', citizens, facts: rows,
  prewrite: Object.assign({}, base.prewrite, { angle: 'the evening record of C116', hookLine: '', anchorFacts: rows.map(r => r.text), presentFacts: [], evidence: rows, hooks: [], pageVoices: [], forbidden: [], roomIsYours: '', note: '', peopleCap: 24 }),
  known: [], fading: [], appeared: []
});
fs.writeFileSync(OUT, JSON.stringify(slice, null, 2));
console.log('rows ' + rows.length + ', people ' + citizens.length + ' → ' + OUT);
