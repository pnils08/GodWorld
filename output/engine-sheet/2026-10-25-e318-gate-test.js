// engine.318 gate test (codex recheck §2 fold): runs push-e318-prod.sh's own fire-state program and freeze loader, text taken
// from the script, read-only. The fire-state reads go to SANDBOX 1004 (bench data at C113) by swapping the one line that aims
// them (process.env.GODWORLD_SHEET_ID = P) — every guard above it runs as written with P = the live pin. No sheet writes:
// a moved count is put to the gate by the expectation it is handed (intake rows one short of the tab = a row added since the
// freeze; first-read media-room count one short = a media-room row landed since the first read).
//   node output/engine-sheet/2026-10-25-e318-gate-test.js
require('/root/GodWorld/lib/env');
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const SH = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-10-25-push-e318-prod.sh', 'utf8');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const LIVE = (fs.readFileSync('/root/GodWorld/utilities/utilityFunctions.js', 'utf8').match(/DEFAULT_SIM_SSID = '([^']+)'/) || [])[1];
const fireSrc = (SH.match(/fire_state\(\) \{[\s\S]*?node -e '([\s\S]*?)' 2>&1/) || [])[1];
const loadSrc = (SH.match(/INTAKE_ROWS=\$\(DRY="\$DRY" node -e '([\s\S]*?)' "\$FRZ"\)/) || [])[1];
if (!fireSrc || !loadSrc) throw new Error('could not extract the gate programs from the script');
const AIM = 'process.env.GODWORLD_SHEET_ID = P;';
if (fireSrc.split(AIM).length !== 2) throw new Error('aim line not found exactly once');
const W = fs.mkdtempSync(path.join(os.tmpdir(), 'e318gate-'));
const MF = path.join(W, 'mr');
const fireFile = fireSrc.replace(AIM, 'process.env.GODWORLD_SHEET_ID = "' + BENCH + '";'), loadFile = loadSrc;
const run = (src, env, args = []) => {   // node -e <src> <args>, as the script runs them (argv[1] = the first arg)
  const r = spawnSync('node', ['-e', src, ...args], { env: Object.assign({}, process.env, env), encoding: 'utf8' });
  return { code: r.status, out: (r.stdout + r.stderr).split('\n').filter(l => l && !/injected env/.test(l)).join(' | ') };
};
(async () => {
  process.env.GODWORLD_SHEET_ID = BENCH;
  const sh = require('/root/GodWorld/lib/sheets');
  const benchRows = (await sh.getSheetData('Citizen_Usage_Intake')).length - 1;
  const base = { CYC: '113', LIVE_ID: LIVE, MR_FILE: MF, GODWORLD_SHEET_ID: LIVE };   // the env the push runs with
  const results = [];
  const check = (name, want, r) => { const pass = r.code === want; results.push(pass); console.log((pass ? 'PASS ' : 'FAIL ') + name + ' — exit ' + r.code + ' (want ' + want + '): ' + r.out); };
  check('A first read, counts as found', 0, run(fireFile, Object.assign({ WHEN: 'A', INTAKE_ROWS: String(benchRows) }, base)));
  const mr0 = fs.existsSync(MF) ? Number(fs.readFileSync(MF, 'utf8')) : NaN;
  console.log('     first read recorded media-room rows ' + mr0 + ' (bench intake rows ' + benchRows + ')');
  check('B second read, nothing moved', 0, run(fireFile, Object.assign({ WHEN: 'B', INTAKE_ROWS: String(benchRows) }, base)));
  check('C intake row added since the freeze', 1, run(fireFile, Object.assign({ WHEN: 'C', INTAKE_ROWS: String(benchRows - 1) }, base)));
  fs.writeFileSync(MF, String(mr0 - 1));
  check('D media-room usage row landed since the first read', 1, run(fireFile, Object.assign({ WHEN: 'D', INTAKE_ROWS: String(benchRows) }, base)));
  fs.writeFileSync(MF, String(mr0));
  check('E wrong Cycle still stops', 1, run(fireFile, Object.assign({ WHEN: 'E', INTAKE_ROWS: String(benchRows) }, base, { CYC: '112' })));
  const FRZ = '/root/GodWorld/output/engine-sheet/2026-10-25-e318-status-live.json';
  const applied = !!JSON.parse(fs.readFileSync(FRZ, 'utf8')).applied;
  check('F live freeze, dry run: loader gives its row count', 0, run(loadFile, { DRY: '--dry-run' }, [FRZ]));
  check('G live freeze, real run: ' + (applied ? 'applied → loads' : 'no apply recorded → stops'), applied ? 0 : 1, run(loadFile, { DRY: '' }, [FRZ]));
  console.log((results.every(Boolean) ? 'ALL PASS' : 'FAILED') + ' ' + results.filter(Boolean).length + '/' + results.length);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(2); });
