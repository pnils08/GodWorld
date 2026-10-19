// Bench reconciliation after a reset: clearfire for the named Cycle (guard must be 0 on the bench).
// usage: node benchclear.js <recordCycle>   — prints the response (no token echoed)
require('/root/GodWorld/lib/env');
const URL = 'https://script.google.com/macros/s/AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC/exec';
(async () => {
  const cyc = String(process.argv[2] || '');
  if (!/^\d+$/.test(cyc)) throw new Error('usage: benchclear.js <recordCycle>');
  const body = new URLSearchParams({ token: process.env.CYCLE_TRIGGER_TOKEN, action: 'clearfire', cycle: cyc }).toString();
  const r = await fetch(URL, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'follow' });
  const t = await r.text(); let o; try { o = JSON.parse(t); } catch (e) { o = { http: r.status, nonJson: t.slice(0, 120) }; }
  if (o.cleared) { try { const c = JSON.parse(o.cleared); o.cleared = { cycle: c.cycle, state: c.state }; } catch (e) { o.cleared = String(o.cleared).slice(0, 120); } }
  console.log(JSON.stringify(o));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
