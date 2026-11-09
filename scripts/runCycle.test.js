#!/usr/bin/env node
// runCycle.test.js — governance.59: the step runner refuses out of order, the
// PreToolUse guard blocks a step script run by hand while a chain is open, and
// Step 5.58 reads the skill's outcome table. No sheet, no network: state lives
// in a temp dir and no step's script is executed.
//   node scripts/runCycle.test.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'runcycle-test-'));
process.env.RUN_CYCLE_STATE_DIR = TMP;
const rc = require('./runCycle');
const guard = require('./runCycleGuard');

let pass = 0, fail = 0;
function t(name, cond) { if (cond) pass++; else { fail++; console.log('FAIL', name); } }
const C = 990;
const write = (cycle, ids) => fs.writeFileSync(path.join(TMP, `c${cycle}.json`), JSON.stringify({ cycle, steps: Object.fromEntries(ids.map(id => [id, { ok: true, outcome: 'pass', at: 'x' }])) }));
const hook = (payload) => spawnSync('node', [path.join(__dirname, 'runCycleGuard.js')], { input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, RUN_CYCLE_STATE_DIR: TMP } });

// 1. chain order matches the skill: 5.56 right behind 5, close last
t('order', rc.ORDER.join(' ') === '1 2 2.5 3 3.5 4 4.1 5 5.56 5.5 5.55 5.58 5.6 5.7 5.8 5.85 6 6.1');

// 2. blocker = first step before id that has not passed
write(C, ['1', '2', '2.5']);
t('blocker none for 3', rc.blocker(rc.loadState(C), '3') === null);
t('blocker 3 for 3.5', rc.blocker(rc.loadState(C), '3.5') === '3');
t('blocker 3 for 5.6', rc.blocker(rc.loadState(C), '5.6') === '3');
t('next is 3', rc.nextStep(rc.loadState(C)) === '3');
// a failed re-run of an earlier step blocks everything after it
write(C, rc.ORDER.slice(0, 12));
const st = rc.loadState(C); st.steps['4'] = { ok: false, outcome: 'fail', at: 'x' };
fs.writeFileSync(path.join(TMP, `c${C}.json`), JSON.stringify(st));
t('failed earlier step blocks later', rc.blocker(rc.loadState(C), '5.6') === '4');

// 3. the runner refuses out of order, records nothing, runs nothing
fs.rmSync(path.join(TMP, `c${C}.json`));
const r = spawnSync('node', [path.join(__dirname, 'runCycle.js'), 'step', '5.6', String(C)], { encoding: 'utf8', env: { ...process.env, RUN_CYCLE_STATE_DIR: TMP } });
t('runner refuses 5.6 on an empty chain (exit 2)', r.status === 2 && /REFUSED: Step 5\.6/.test(r.stderr) && /step 1 990/.test(r.stderr));
t('refusal writes no record', !fs.existsSync(path.join(TMP, `c${C}.json`)));

// 4. guard: what counts as running a step script
const runs = (s) => guard.findStepRuns(s).map(h => `${h.name}:${h.cycle}`).join(',');
t('plain', runs('node scripts/buildWorldSummary.js 990') === 'buildWorldSummary:990');
t('piped + timeout', runs('cd /root/GodWorld && timeout 500 node scripts/draftContentRows.js --cycle 990 --apply 2>&1 | tail') === 'draftContentRows:990');
t('--cycle=', runs('node scripts/preflightInputCheck.js --cycle=990') === 'preflightInputCheck:990');
t('absolute path', runs('/usr/bin/node /root/GodWorld/scripts/dumpBeatTabs.js 990 --quiet') === 'dumpBeatTabs:990');
t('require', runs(`node -e "require('./scripts/dumpLedger')"`) === 'dumpLedger:null');
t('no cycle', runs('node scripts/engineAuditor.js --hand-write-check') === 'engineAuditor:null');
t('syntax check is not a run', runs('node --check scripts/buildWorldState.js') === '');
t('reading is not a run', runs('sed -n 1,9p scripts/draftContentRows.js; grep -n x scripts/civisJournal.js') === '');
t('test file is not the script', runs('node scripts/discordReflectionHeader.test.js') === '');
t('the runner is not a step script', runs('node scripts/runCycle.js step 5.6 990') === '');

// 5. guard decisions against chain state
fs.rmSync(path.join(TMP, `c${C}.json`), { force: true });
t('cycle with no chain record is blocked', /BLOCKED.*C990/.test(guard.decide('node scripts/buildWorldSummary.js 990') || ''));
t('pre-gate cycle allowed', guard.decide('node scripts/dumpLedger.js 115 --quiet') === null);
t('no cycle, no open chain: allowed', guard.decide('node scripts/engineAuditor.js') === null);
write(C, ['1', '2']);
t('no cycle, open chain: blocked', /next step is 2\.5/.test(guard.decide('node scripts/engineAuditor.js') || ''));
write(C, rc.ORDER);
t('closed chain: re-run allowed', guard.decide('node scripts/buildDeskPackets.js 990') === null);
t('closed chain: cycle-less allowed', guard.decide('node scripts/engineAuditor.js') === null);

// 6. hook protocol end to end: exit 2 + reason on stderr (Claude Code + codex)
fs.rmSync(path.join(TMP, `c${C}.json`));
write(C, ['1']);
let h = hook({ tool_name: 'Bash', tool_input: { command: 'node scripts/buildWorldSummary.js 990' } });
t('hook blocks Bash (exit 2)', h.status === 2 && /BLOCKED/.test(h.stderr) && /step 2 990/.test(h.stderr));
h = hook({ tool_name: 'exec', tool_input: { code: 'const r=await tools.exec_command({cmd:"node scripts/civisJournal.js --cycle 990",workdir:"/root/GodWorld"});' } });
t('hook blocks codex code-mode exec (exit 2)', h.status === 2 && /civisJournal/.test(h.stderr));
h = hook({ tool_name: 'Bash', tool_input: { command: 'node scripts/runCycle.js step 2 990' } });
t('hook passes the runner', h.status === 0);
h = hook({ tool_name: 'Bash', tool_input: { command: 'git status --short' } });
t('hook passes unrelated', h.status === 0);
h = spawnSync('node', [path.join(__dirname, 'runCycleGuard.js')], { input: 'not json', encoding: 'utf8' });
t('hook passes garbage input', h.status === 0);

// 7. Step 5.58 outcome table
const civ = (stdout, stderr, prior) => rc.civisOutcome({ cycle: C }, { status: 0, stdout, stderr }, prior);
let o = civ('{"skipped":"model-failure"}', '');
t('model-failure once → retry, not passed', !o.ok && o.outcome === 'retry');
o = civ('{"skipped":"model-failure"}', '', { ok: false, outcome: 'retry' });
t('model-failure twice → no journal, passed', o.ok && o.outcome === 'no-journal');
o = civ('{"skipped":"assertion-failure"}', 'Civis Sonnet failed or returned invalid output');
t('assertion-failure, Sonnet never ran → retry', !o.ok && o.outcome === 'retry');
o = civ('{"skipped":"assertion-failure"}', 'prose gate: x');
t('assertion-failure → no journal', o.ok && o.outcome === 'no-journal');
o = rc.civisOutcome({ cycle: C }, { status: 1, stdout: '', stderr: 'civisJournal failed: audit has no patterns' });
t('quiet audit → no journal', o.ok && o.outcome === 'no-journal');
o = rc.civisOutcome({ cycle: C }, { status: 1, stdout: '', stderr: 'civisJournal failed: audit/beats cycle mismatch: C990' });
t('cycle mismatch → fail', !o.ok);
o = civ('{"path":"/x.md","record":"/x.json"}', '');
t('journal claimed but no files → fail', !o.ok);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`runCycle.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
