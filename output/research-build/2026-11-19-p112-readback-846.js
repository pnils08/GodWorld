// pipeline.112 Task 4: read back the 846 entries the cut run wrote (BEFORE file 19-57-13): content = next, metadata carries add.
require('/root/GodWorld/lib/env');
const j = require('/root/GodWorld/output/repairs/2026-11-19-page-labels-off-BEFORE-2026-11-19T19-57-13.json');
const auth = { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY };
(async () => {
  let same = 0, differ = 0, unread = 0; const bad = [];
  for (const e of j.entries) {
    let g = null;
    for (let i = 0; i < 4 && !g; i++) { try { const r = await fetch('https://api.supermemory.ai/v3/documents/' + e.id, { headers: auth, signal: AbortSignal.timeout(30000) }); if (r.status === 200) g = await r.json(); else await new Promise((x) => setTimeout(x, 3000)); } catch (err) { await new Promise((x) => setTimeout(x, 3000)); } }
    if (!g) { unread++; continue; }
    const metaOk = Object.keys(e.add).every((k) => g.metadata && String(g.metadata[k]) === String(e.add[k]));
    if (g.content === e.next && metaOk) same++; else { differ++; if (bad.length < 10) bad.push(e.customId + ' | ' + String(g.content).replace(/\s+/g, ' ').slice(0, 90)); }
  }
  console.log('entries', j.entries.length, '| content and metadata as written', same, '| differ', differ, '| could not be read', unread);
  bad.forEach((b) => console.log('  ', b));
})();
