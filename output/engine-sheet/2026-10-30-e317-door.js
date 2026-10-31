// engine.317: read a web app's fire record through the read-only door and validate it.
//   node output/engine-sheet/2026-10-30-e317-door.js bench            — the bench, with the fire key
//   node output/engine-sheet/2026-10-30-e317-door.js prod             — PROD, with ADMISSION_READ_TOKEN
//   node output/engine-sheet/2026-10-30-e317-door.js prod-nofire      — PROD has no fire key (a junk-key checkpoint read
//                                                                        answers "CYCLE_TRIGGER_TOKEN script property not set")
// DOOR_EXPECT_CYCLE=<n> (re-review F2): also require the TOP-LEVEL record.cycle === n and record.state === 'done' as typed
// fields (never a text search of the line) -> expectOk.
// Prints one JSON line {target, http, ok, error, record, valid}; never prints a key. Exit 0 only for a valid record
// (HTTP 200, the writer's shape, startedMs no later than now + 5 min — godWorldEngine2.js FIRE_CLOCK_SLACK_MS).
require('/root/GodWorld/lib/env');
const https = require('https');
const DEP = { bench: 'AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC',
              'bench-read': 'AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC',
              prod: 'AKfycbwUvd4TylktdE7AA8axRv-Hru55h78v1PlsOsIejWyAoQrUeYnKGq2ue-FJxPawCW-bgQ' };
const target = process.argv[2];
const nofire = target === 'prod-nofire';
const dep = DEP[nofire ? 'prod' : target];
if (!dep) { console.error('usage: bench|bench-read|prod|prod-nofire'); process.exit(2); }
if (process.env.DOOR_EXPECT_DEP && process.env.DOOR_EXPECT_DEP !== dep) { console.log(JSON.stringify({ target, error: 'deployment differs from the pinned one', valid: false })); process.exit(1); }
const key = target === 'bench' ? process.env.CYCLE_TRIGGER_TOKEN : process.env.ADMISSION_READ_TOKEN;
const url = 'https://script.google.com/macros/s/' + dep + '/exec?' + new URLSearchParams(nofire
  ? { token: 'engine317-no-fire-key-probe', action: 'checkpoint' } : { token: key || '', action: 'admission' });
function get(u, hops = 0) { return new Promise((res, rej) => { const q = https.get(u, r => {
  if ([301, 302, 303, 307].includes(r.statusCode) && r.headers.location && hops < 5) { r.resume(); return res(get(r.headers.location, hops + 1)); }
  let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b })); }); q.setTimeout(60000, () => q.destroy(new Error('timeout'))); q.on('error', rej); }); }
const STATES = ['running', 'done', 'failed', 'unpersisted', 'unverified', 'aborted', 'checkpointed'];
const whole = v => typeof v === 'number' && isFinite(v) && v > 0 && Math.floor(v) === v;
get(url).then(r => {
  let j = null; try { j = JSON.parse(r.body); } catch (_) {}
  if (nofire) {
    const absent = r.status === 200 && !!j && j.ok === false && j.error === 'CYCLE_TRIGGER_TOKEN script property not set';
    console.log(JSON.stringify({ target, http: r.status, error: j ? j.error : 'non-JSON', noFireKey: absent }));
    process.exit(absent ? 0 : 1);
  }
  let record = null, valid = false;
  if (r.status === 200 && j && j.ok === true && typeof j.admission === 'string') {
    try { record = JSON.parse(j.admission); } catch (_) {}
    valid = !!record && Number.isInteger(record.cycle) && record.cycle >= 1 && whole(record.startedMs) &&
      record.startedMs <= Date.now() + 5 * 60000 && STATES.includes(record.state) &&
      ((record.state === 'running' || record.state === 'checkpointed') ? record.finishedMs === undefined : (whole(record.finishedMs) && record.finishedMs >= record.startedMs));
  }
  const want = process.env.DOOR_EXPECT_CYCLE;
  const expectOk = want === undefined ? null : (valid && record.cycle === Number(want) && record.state === 'done');
  console.log(JSON.stringify({ target, http: r.status, ok: j ? j.ok : null, error: j ? j.error : 'non-JSON', record, raw: j && j.admission, valid, expectOk }));
  process.exit(valid && expectOk !== false ? 0 : 1);
}).catch(e => { console.log(JSON.stringify({ target, error: e.message, valid: false })); process.exit(1); });
