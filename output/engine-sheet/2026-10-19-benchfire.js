// Fire SANDBOX 1004 once and hold it to the completion contract
// (engine.214 plan §PROD wave procedure step 5; codex 2026-10-19 §5/§6 + recheck 3).
// usage: node benchfire.js <expect> <label>   — expect = the bench cycleCount now
// Never re-fires. Exit 0 = PASS, 2 = HALT (read the sheet before anything else).
require('/root/GodWorld/lib/env');
const https = require('https');
const fs = require('fs');
const { google } = require('/root/GodWorld/node_modules/googleapis');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const LIVE = process.env.GODWORLD_SHEET_ID;
const URL = 'https://script.google.com/macros/s/AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC/exec';
const expect = Number(process.argv[2]), label = process.argv[3] || 'fire';
const OUT = '/root/GodWorld/output/engine-sheet/2026-10-19-benchfires.jsonl';
function getFollow(url, hops = 0) {
  return new Promise((res, rej) => {
    const req = https.get(url, r => {
      if ([301, 302, 303, 307].includes(r.statusCode) && r.headers.location && hops < 5) { r.resume(); return res(getFollow(r.headers.location, hops + 1)); }
      let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b }));
    });
    req.setTimeout(600000, () => { req.destroy(new Error('client timeout 600s')); });
    req.on('error', rej);
  });
}
(async () => {
  if (!Number.isInteger(expect) || expect < 112) throw new Error('bad expect');
  const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const api = google.sheets({ version: 'v4', auth });
  const title = (await api.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE || BENCH === LIVE) throw new Error('target check failed');
  const val = async (id, range) => (await api.spreadsheets.values.get({ spreadsheetId: id, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values || [];
  const counter = async id => { const wc = await val(id, 'World_Config!A1:B400'); const r = wc.find(x => x[0] === 'cycleCount'); return r ? Number(r[1]) : NaN; };
  const snap = async () => {
    const [bc, lc, ee, ri] = await Promise.all([counter(BENCH), counter(LIVE), val(BENCH, 'Engine_Errors'), val(BENCH, 'Riley_Digest!A:B')]);
    return { bench: bc, live: lc, ee: ee.slice(1).map(r => JSON.stringify([r[1], r[2], String(r[3] || '').slice(0, 160)])), rileyLast: (ri[ri.length - 1] || [])[1] };
  };
  const cpRead = async () => { const r = await getFollow(URL + '?' + new URLSearchParams({ token: process.env.CYCLE_TRIGGER_TOKEN, action: 'checkpoint' })); try { return JSON.parse(r.body).checkpoint; } catch (e) { return 'nonJSON ' + r.status; } };
  const pre = await snap(); const cpPre = await cpRead();
  const rec = { label, expect, at: new Date().toISOString(), pre: { bench: pre.bench, live: pre.live, ee: pre.ee.length, rileyLast: pre.rileyLast, checkpoint: cpPre } };
  const halt = why => { rec.verdict = 'HALT'; rec.why = why; fs.appendFileSync(OUT, JSON.stringify(rec) + '\n'); console.log(JSON.stringify(rec, null, 1)); process.exit(2); };
  if (pre.bench !== expect) halt(`bench counter ${pre.bench} != expect ${expect}`);
  if (cpPre !== null && !(cpPre && cpPre.state === 'committed')) halt('checkpoint manifest not null/committed: ' + JSON.stringify(cpPre));
  const t0 = Date.now();
  let resp, parsed = null;
  try { resp = await getFollow(URL + '?' + new URLSearchParams({ token: process.env.CYCLE_TRIGGER_TOKEN, expect: String(expect) })); }
  catch (e) { resp = { status: 0, body: 'ERR ' + e.message }; }
  rec.wallS = Math.round((Date.now() - t0) / 1000); rec.http = resp.status;
  try { parsed = JSON.parse(resp.body); } catch (e) { parsed = null; rec.nonJson = String(resp.body).slice(0, 120); }
  if (parsed) rec.resp = { ok: parsed.ok, error: parsed.error, state: parsed.state, ranMs: parsed.ranMs, lifecycle: parsed.lifecycle, checkpoint: parsed.checkpoint, persistErrors: parsed.persist && parsed.persist.errors, carryForward: parsed.carryForward };
  if (parsed) { fs.mkdirSync('/root/GodWorld/output/engine-sheet/benchfire-raw', { recursive: true }); fs.writeFileSync(`/root/GodWorld/output/engine-sheet/benchfire-raw/${label}-c${expect + 1}.json`, JSON.stringify(parsed, null, 1)); }
  // sheet truth — wait for the counter if the response was not JSON
  let post = await snap(); const until = Date.now() + 300000;
  while (!parsed && post.bench === expect && Date.now() < until) { await new Promise(r => setTimeout(r, 20000)); post = await snap(); }
  const cpPost = await cpRead();
  rec.post = { bench: post.bench, live: post.live, ee: post.ee.length, rileyLast: post.rileyLast, checkpoint: cpPost };
  rec.newEE = post.ee.filter(x => !pre.ee.includes(x));
  if (/quota|Service invoked too many times|exceeded/i.test(resp.body || '')) halt('quota text in response');
  if (post.bench !== expect + 1) halt(`bench advanced ${post.bench - expect} (want exactly 1)`);
  if (post.live !== pre.live) halt(`LIVE counter moved ${pre.live} -> ${post.live}`);
  if (Number(post.rileyLast) !== expect + 1) halt(`Riley last row ${post.rileyLast} != ${expect + 1}`);
  if (!parsed) halt('non-JSON response; sheet advanced once — read the run before the next fire');
  if (parsed.ok !== true || parsed.state !== 'done') halt(`response ok=${parsed.ok} state=${parsed.state} error=${parsed.error}`);
  if (rec.resp.persistErrors && rec.resp.persistErrors.length) halt('persist errors');
  if (cpPost !== null && !(cpPost && cpPost.state === 'committed')) halt('checkpoint after: ' + JSON.stringify(cpPost));
  rec.verdict = rec.newEE.length ? 'PASS-WITH-NEW-EE (read them)' : 'PASS';
  fs.appendFileSync(OUT, JSON.stringify(rec) + '\n');
  console.log(JSON.stringify(rec, null, 1));
  process.exit(rec.newEE.length ? 2 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
