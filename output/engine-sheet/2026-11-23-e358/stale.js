// edge case (b): call the SANDBOX web trigger with a stale expect — the engine (engine.275) must refuse.
// The token is read from env and never printed. usage: node stale.js <staleExpect>
require('/root/GodWorld/lib/env');
const https = require('https');
const URL = 'https://script.google.com/macros/s/AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC/exec';
function get(u, h = 0) { return new Promise((res, rej) => { const q = https.get(u, r => { if ([301, 302, 303, 307].includes(r.statusCode) && r.headers.location && h < 5) { r.resume(); return res(get(r.headers.location, h + 1)); } let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b })); }); q.setTimeout(300000, () => q.destroy(new Error('timeout'))); q.on('error', rej); }); }
(async () => {
  const r = await get(URL + '?' + new URLSearchParams({ token: process.env.CYCLE_TRIGGER_TOKEN, expect: String(Number(process.argv[2])) }));
  let p = null; try { p = JSON.parse(r.body); } catch (_) {}
  console.log(JSON.stringify({ http: r.status, ok: p && p.ok, error: p && String(p.error || '').slice(0, 200) }));
})().catch(e => { console.error('stale ERR', e.message); process.exit(2); });
