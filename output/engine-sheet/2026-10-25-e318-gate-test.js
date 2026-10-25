// engine.318 gate test (codex recheck §2 + recheck 2 §1 folds): runs push-e318-prod.sh's own fire-state program and freeze
// loader, text taken from the script, read-only. The fire-state reads go to SANDBOX 1004 (bench data at C113) by swapping the
// one line that aims them (process.env.GODWORLD_SHEET_ID = P) — every guard above it runs as written with P = the live pin.
// No sheet writes: a moved state is put to the gate by the first-read record it is handed (intake rows one short of the tab =
// a row added since the freeze; first-read usage record altered = usage moved since the first read), one case reads another
// tab as the usage tab (malformed header), and the intake receipt is the Status step's own `bench verify` — the bench probe
// row was added and processed after the bench freeze, nothing pending.
//   node output/engine-sheet/2026-10-25-e318-gate-test.js
require('/root/GodWorld/lib/env');
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const SH = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-10-25-push-e318-prod.sh', 'utf8');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const LIVE = (fs.readFileSync('/root/GodWorld/utilities/utilityFunctions.js', 'utf8').match(/DEFAULT_SIM_SSID = '([^']+)'/) || [])[1];
const fireSrc = (SH.match(/fire_state\(\) \{[\s\S]*?node -e '([\s\S]*?)' 2>&1/) || [])[1];
const loadSrc = (SH.match(/LOADED=\$\(DRY="\$DRY" node -e '([\s\S]*?)' "\$FRZ"\)/) || [])[1];
if (!fireSrc || !loadSrc) throw new Error('could not extract the gate programs from the script');
const once = (src, a, b) => { if (src.split(a).length !== 2) throw new Error('not found exactly once: ' + a); return src.replace(a, b); };
const AIM = 'process.env.GODWORLD_SHEET_ID = P;', USAGE = 'getSheetData("Citizen_Media_Usage")';
const fireBench = once(fireSrc, AIM, 'process.env.GODWORLD_SHEET_ID = "' + BENCH + '";');
const fireBadUsage = once(fireBench, USAGE, 'getSheetData("Citizen_Usage_Intake")');
const W = fs.mkdtempSync(path.join(os.tmpdir(), 'e318gate-')), MF = path.join(W, 'mr');
// Each fire-state run is 7 Sheets reads; 8 s apart keeps the test under the 60-reads-a-minute quota (a quota error exits 2).
const pause = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 8000);
const run = (src, env, args = []) => {   // node -e <src> <args>, as the script runs them (argv[1] = the first arg)
  pause();
  const r = spawnSync('node', ['-e', src, ...args], { env: Object.assign({}, process.env, env), encoding: 'utf8' });
  return { code: r.status, out: (r.stdout + r.stderr).split('\n').filter(l => l && !/injected env/.test(l)).join(' | ') };
};
(async () => {
  process.env.GODWORLD_SHEET_ID = BENCH;
  const sh = require('/root/GodWorld/lib/sheets');
  const benchRows = (await sh.getSheetData('Citizen_Usage_Intake')).length - 1;
  const base = { CYC: '113', LIVE_ID: LIVE, MR_FILE: MF, GODWORLD_SHEET_ID: LIVE, INTAKE_ROWS: String(benchRows) };   // the env the push runs with
  const results = [];
  const check = (name, want, r) => { const pass = r.code === want; results.push(pass); console.log((pass ? 'PASS ' : 'FAIL ') + name + ' — exit ' + r.code + ' (want ' + want + '): ' + r.out); };
  const withFirst = (edit) => { const u = JSON.parse(fs.readFileSync(MF, 'utf8')); edit(u); fs.writeFileSync(MF, JSON.stringify(u)); };
  check('A first read, state as found', 0, run(fireBench, Object.assign({ WHEN: 'A' }, base)));
  const u0 = JSON.parse(fs.readFileSync(MF, 'utf8'));
  console.log('     first read recorded usage rows ' + u0.total + ', media-room rows ' + u0.mr + ' (bench intake rows ' + benchRows + ')');
  check('B second read, nothing moved', 0, run(fireBench, Object.assign({ WHEN: 'B' }, base)));
  check('C intake row added since the freeze', 1, run(fireBench, Object.assign({}, base, { WHEN: 'C', INTAKE_ROWS: String(benchRows - 1) })));
  withFirst(u => { u.mr = u0.mr - 1; });
  check('D media-room usage row landed since the first read', 1, run(fireBench, Object.assign({ WHEN: 'D' }, base)));
  withFirst(u => { u.mr = u0.mr; u.sig = '0'.repeat(64); });
  check('D2 media-room rows rewritten, same count', 1, run(fireBench, Object.assign({ WHEN: 'D2' }, base)));
  withFirst(u => { u.sig = u0.sig; u.total = u0.total + 1; });
  check('D3 usage rows fewer than the first read (dedupe / delete)', 1, run(fireBench, Object.assign({ WHEN: 'D3' }, base)));
  withFirst(u => { u.total = u0.total - 1; });
  check('D4 usage rows more than the first read (a cron append) still passes', 0, run(fireBench, Object.assign({ WHEN: 'D4' }, base)));
  fs.writeFileSync(MF, JSON.stringify(u0));
  check('E wrong Cycle still stops', 1, run(fireBench, Object.assign({}, base, { WHEN: 'E', CYC: '112' })));
  fs.unlinkSync(MF);
  check('I malformed usage read (another tab\'s header) stops, records no first read', 1, run(fireBadUsage, Object.assign({ WHEN: 'I' }, base)));
  results.push(!fs.existsSync(MF)); console.log((fs.existsSync(MF) ? 'FAIL' : 'PASS') + ' I2 no first-read record written from a malformed read');
  const FRZ = '/root/GodWorld/output/engine-sheet/2026-10-25-e318-status-live.json';
  const applied = !!JSON.parse(fs.readFileSync(FRZ, 'utf8')).applied;
  check('F live freeze, dry run: loader gives its row count and apply flag', 0, run(loadSrc, { DRY: '--dry-run' }, [FRZ]));
  check('G live freeze, real run: ' + (applied ? 'applied → loads' : 'no apply recorded → stops'), applied ? 0 : 1, run(loadSrc, { DRY: '' }, [FRZ]));
  // Intake receipt = the Status step's own verify. The bench freeze predates the full-width fold (no width) — H0 proves the step
  // now refuses it; H runs verify against that freeze with width 6 added (the bench tab's width, A–F), then the file is put back
  // byte for byte: the probe row was added and processed after it, 0 pending, so the one failure must be the row count.
  const BF = '/root/GodWorld/output/engine-sheet/2026-10-25-e318-status-bench.json', bf = fs.readFileSync(BF);
  const verify = () => { pause(); const v = spawnSync('node', ['/root/GodWorld/output/engine-sheet/2026-10-25-e318-status-step.js', 'bench', 'verify'], { encoding: 'utf8' });
    return { code: v.status, out: (v.stdout + v.stderr).split('\n').filter(l => l && !/injected env/.test(l)).slice(0, 5).join(' | ') }; };
  let h0, h;
  try {
    h0 = verify();
    fs.writeFileSync(BF, JSON.stringify(Object.assign(JSON.parse(bf), { width: 6 })));
    h = verify();
  } finally { fs.writeFileSync(BF, bf); }
  results.push(fs.readFileSync(BF).equals(bf)); console.log((fs.readFileSync(BF).equals(bf) ? 'PASS' : 'FAIL') + ' bench freeze file restored byte for byte');
  check('H0 intake receipt refuses a freeze with no width', 2, h0);
  results.push(/carries no width/.test(h0.out)); console.log((/carries no width/.test(h0.out) ? 'PASS' : 'FAIL') + ' H0 says why');
  check('H intake receipt: a row added and processed since the freeze, 0 pending (bench probe)', 1, h);
  const why = /pending: 0\b/.test(h.out) && /FAIL 1:/.test(h.out) && /row count 912 → 913/.test(h.out);
  results.push(why); console.log((why ? 'PASS' : 'FAIL') + ' H fails on the row count alone (0 pending, 1 failure)');
  console.log((results.every(Boolean) ? 'ALL PASS' : 'FAILED') + ' ' + results.filter(Boolean).length + '/' + results.length);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(2); });
