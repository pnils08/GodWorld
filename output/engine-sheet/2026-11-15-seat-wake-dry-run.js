// pipeline.110 Task 9 — the council template run once on its spec (Terrence Mobley, District 9), under scripts/guard/nowrite.js.
// The wake is scripts/seatWake.js buildWake (who he is, his memory gathered, his district whole, his decisions); the tools are
// seatWake.toolsFor, run through seatWake.toolExecutor. Nothing is put to him: no question, and Mara's is answered. A move is
// only staged and shown; a resident call is read-only (citizenVoice.js without --record). Nothing is written but the .md beside this file.
//   NOWRITE_ALLOW=/root/GodWorld/output/engine-sheet NOWRITE_LOG=/root/GodWorld/output/engine-sheet/2026-11-15-seat-wake-dry-run.guard.log \
//   NODE_OPTIONS="--require /root/GodWorld/scripts/guard/nowrite.js" node 2026-11-15-seat-wake-dry-run.js COUNCIL-D9 <cycle> [runs]
require('/root/GodWorld/lib/env');
const fs = require('fs'), path = require('path');
const ROOT = '/root/GodWorld';
const sw = require(ROOT + '/scripts/seatWake');
const { buildPack } = require(ROOT + '/scripts/buildCivicOfficeSlice');
const dw = require(ROOT + '/scripts/cron-desk-writer');
const civic = require(ROOT + '/scripts/cron-civic-run.js');
const [officeId, cycleArg, runsArg] = process.argv.slice(2);
const cycle = Number(cycleArg), RUNS = Number(runsArg || 1);

(async () => {
  const office = (require(ROOT + '/scripts/civic-office-map.json').offices || []).find((o) => o.officeId === officeId);
  if (!office) throw new Error('no office ' + officeId);
  const pack = buildPack({ cycle, agentDir: office.agentDir, root: ROOT });
  const hoods = ((pack.signal || {}).hoods) || [];
  const w = await sw.buildWake({ office, cycle, pack });
  const toolset = sw.toolsFor(office, pack);
  const out = ['# Council template dry run — ' + officeId + ', Cycle ' + cycle, ''];
  let cost = 0, calls = 0;
  for (let i = 0; i < RUNS; i++) {
    const stage = { moves: [], calls: [] };
    // The real move gate, with the runner's own context but the geography: the board, the open question, the tracker rows off the beats dump
    // and the petition data (cron-civic-run.js runDatawake). childToParent is empty here, so a child neighborhood is judged as named.
    const validate = (moves) => civic.validateDatawakeMoves(moves, { office, boardIds: new Set((pack.game && pack.game.boardIds) || []), childToParent: {}, cycle,
      confrontations: ((pack.game || {}).confrontations || {}).open || [], answeredConfrontationIds: new Set((((pack.game || {}).confrontations || {}).answeredIds) || []),
      answerEvidenceAvailable: ((pack.game || {}).confrontations || {}).available === true, civic47Pilot: false, trackerRows: civic.trackerBeatRows(ROOT) || [], moveLedger: civic.loadMoveLedgerFolded(ROOT, cycle),
      loadPetitionData: () => require(ROOT + '/scripts/civicPetitions').loadLocalData({ root: ROOT, cycle }) });
    const ctx = { office, cycle, date: 'dry-run-' + cycle, stage, validate, inDistrict: (h) => hoods.some((x) => String(x).toLowerCase() === String(h || '').toLowerCase()),
      confrontationId: sw.maraQuestion(pack) ? sw.maraQuestion(pack).id : undefined, dw };
    const exec = sw.toolExecutor(ctx);
    const model = office.model;
    const r = await dw.openRouterToolLoop({ model, system: w.system, user: w.user, toolset, exec, maxToolCalls: sw.MAX_TOOL_CALLS, maxTokens: 1800, timeoutMs: 180000, keepResults: true,
      body: /^deepseek\/deepseek-v4/.test(model) ? { reasoning: { enabled: false } } : {} });
    cost += r.billedUsd || 0; calls += r.trace.length;
    const hay = w.system + '\n' + w.user + '\n' + r.trace.map((t) => t.result).join('\n');
    let loose; try { loose = [...civic.ungroundedNumbers(hay, [r.text], { cycle })]; } catch (e) { loose = ['check failed: ' + e.message]; }
    if (i === 0) out.push(w.office.holder + ', ' + model + '. System ' + w.system.length + ' characters, user ' + w.user.length + '. Nothing put to him.', '');
    out.push('### Run ' + (i + 1), '',
      'Tools called: ' + (r.trace.length ? r.trace.map((t) => t.tool + '(' + JSON.stringify(t.input) + ') → ' + t.resultChars + ' characters').join('; ') : 'none') + '.',
      'Moves staged: ' + (stage.moves.length ? JSON.stringify(stage.moves) : 'none') + '.',
      'Residents called: ' + (stage.calls.length ? stage.calls.map((c) => c.name + ' (' + c.neighborhood + ') asked "' + c.question + '" — said: ' + c.said).join(' || ') : 'none') + '.',
      'Figures not in what he was handed or read: ' + (loose.length ? loose.join(', ') : 'none') + '.' + (r.finishReason && r.finishReason !== 'stop' ? ' Finish: ' + r.finishReason + '.' : ''), '',
      r.text || '(empty reply)', '');
  }
  out.splice(2, 0, RUNS + ' run(s). Tool calls in all: ' + calls + '. Cost $' + cost.toFixed(4) + '. Write guard on.', '');
  const f = path.join(__dirname, '2026-11-15-seat-wake-dry-run.' + officeId + '.md');
  fs.writeFileSync(f, out.join('\n'));
  console.log(f + '\ntool calls ' + calls + '; cost $' + cost.toFixed(4));
})().catch((e) => { console.log('FAILED ' + e.stack); process.exit(1); });
