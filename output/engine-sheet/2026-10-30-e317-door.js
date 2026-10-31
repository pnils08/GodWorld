// engine.317: read a web app's fire record through the read-only door and validate it.
//   node output/engine-sheet/2026-10-30-e317-door.js bench            — the bench, with the fire key
//   node output/engine-sheet/2026-10-30-e317-door.js prod             — PROD, with ADMISSION_READ_TOKEN
// Prints one JSON line {target, http, ok, error, record, valid}; never prints a key. Exit 0 only for a valid record.
require('/root/GodWorld/lib/env');
const https = require('https');
const DEP = { bench: 'AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC',
              prod: 'AKfycbwUvd4TylktdE7AA8axRv-Hru55h78v1PlsOsIejWyAoQrUeYnKGq2ue-FJxPawCW-bgQ' };
const target = process.argv[2];
if (!DEP[target]) { console.error('usage: bench|prod'); process.exit(2); }
const key = target === 'bench' ? process.env.CYCLE_TRIGGER_TOKEN : process.env.ADMISSION_READ_TOKEN;
const url = 'https://script.google.com/macros/s/' + DEP[target] + '/exec?' + new URLSearchParams({ token: key || '', action: 'admission' });
function get(u, hops = 0) { return new Promise((res, rej) => { const q = https.get(u, r => {
  if ([301, 302, 303, 307].includes(r.statusCode) && r.headers.location && hops < 5) { r.resume(); return res(get(r.headers.location, hops + 1)); }
  let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b })); }); q.setTimeout(60000, () => q.destroy(new Error('timeout'))); q.on('error', rej); }); }
const STATES = ['running', 'done', 'failed', 'unpersisted', 'unverified', 'aborted', 'checkpointed'];
const whole = v => typeof v === 'number' && isFinite(v) && v > 0 && Math.floor(v) === v;
get(url).then(r => {
  let j = null; try { j = JSON.parse(r.body); } catch (_) {}
  let record = null, valid = false;
  if (j && j.ok && typeof j.admission === 'string') {
    try { record = JSON.parse(j.admission); } catch (_) {}
    valid = !!record && Number.isInteger(record.cycle) && record.cycle >= 1 && whole(record.startedMs) && STATES.includes(record.state) &&
      ((record.state === 'running' || record.state === 'checkpointed') ? record.finishedMs === undefined : (whole(record.finishedMs) && record.finishedMs >= record.startedMs));
  }
  console.log(JSON.stringify({ target, http: r.status, ok: j ? j.ok : null, error: j ? j.error : 'non-JSON', record, raw: j && j.admission, valid }));
  process.exit(valid ? 0 : 1);
}).catch(e => { console.log(JSON.stringify({ target, error: e.message, valid: false })); process.exit(1); });
