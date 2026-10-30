#!/usr/bin/env node
/**
 * undockedEpisode.js — UNDOCKED bounded episode runner (plan 1.1:
 * docs/plans/2026-08-07-spacemolt-game-show.md; design:
 * output/kimi/spacemolt-phase0/phase1-runner-adapter-design.md)
 *
 * Wrapper around SpaceMolt/commander. One mission per episode, wall-clock
 * capped, recovery-aware brief, durable per-episode log + JSON sidecar.
 * Crontab-scheduled one-shot — NEVER pm2 cron_restart (plan principle 5).
 *
 * Hard rules (verify-001/002 lessons):
 *   - The cast account must be PRE-MINTED and its credentials pre-seeded in
 *     commander's sessions/<name>/credentials.json. This wrapper refuses to
 *     run without it, and every mission brief must forbid register/login —
 *     a self-registering agent burns the episode hallucinating codes.
 *   - Stop = the pilot stops calling the console (IDLE_TURNS idle turns ->
 *     graceful SIGINT) or wall-clock timeout -> SIGINT -> commander's
 *     AbortSignal seam (clean exit, handoff written), SIGKILL only after a
 *     grace period. research.31 (2026-10-30): the captain's log is no longer
 *     a stop token; the sidecar's stopReason says how the night ended.
 *
 * Usage:
 *   node scripts/undockedEpisode.js --session undocked-pop00962 \
 *       --mission-file missions/pop00962.txt [--minutes 10] \
 *       [--model openrouter/deepseek/deepseek-chat]
 *   node scripts/undockedEpisode.js --session X --preflight-only
 *
 * Env: OPENROUTER_API_KEY (loaded from the canonical godworld env file).
 * Writes: output/spacemolt-show/episodes/<session>-<ts>.log (+ .json sidecar)
 *         (plan names logs/spacemolt-show/ as the eventual home — engine-sheet
 *         territory; output/ holds them until that wiring lands)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const COMMANDER = path.join(ROOT, 'output', 'kimi', 'spacemolt-phase0', 'commander');
const EP_DIR = path.join(ROOT, 'output', 'spacemolt-show', 'episodes');
const LOCK = path.join(EP_DIR, '.runner.lock');
const GRACE_MS = 15000;

function parseArgs(argv) {
  const a = { session: null, mission: null, missionFile: null, minutes: 10,
              model: 'openrouter/deepseek/deepseek-chat', preflightOnly: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--session') { a.session = v; i++; }
    else if (k === '--mission') { a.mission = v; i++; }
    else if (k === '--mission-file') { a.missionFile = v; i++; }
    else if (k === '--minutes') { a.minutes = parseFloat(v); i++; }
    else if (k === '--model') { a.model = v; i++; }
    else if (k === '--preflight-only') { a.preflightOnly = true; }
    else { console.error('unknown arg: ' + k); process.exit(2); }
  }
  return a;
}

function loadKey() {
  for (const envPath of ['/root/.config/godworld/.env', path.join(ROOT, '.env')]) {
    try {
      for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        if (line.startsWith('OPENROUTER_API_KEY=')) {
          return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

function preflight(a) {
  const problems = [];
  const credPath = path.join(COMMANDER, 'sessions', a.session, 'credentials.json');
  if (!fs.existsSync(COMMANDER)) problems.push('commander clone missing at ' + COMMANDER);
  if (!fs.existsSync(credPath)) {
    problems.push('no pre-seeded credentials at ' + path.relative(ROOT, credPath) +
      ' — mint the account via the Clerk registration code first; the agent must never self-register');
  }
  if (!loadKey()) problems.push('OPENROUTER_API_KEY not found in env files');
  const brief = a.mission || (a.missionFile && fs.existsSync(a.missionFile)
    ? fs.readFileSync(a.missionFile, 'utf8') : '');
  if (!brief.trim()) problems.push('no mission given (--mission or --mission-file), or mission file is empty');
  if (brief && !/never.*(register|login)/i.test(brief)) {
    problems.push('mission brief lacks the register/login prohibition (verify-001 failure mode)');
  }
  if (brief && !/refuel/i.test(brief)) {
    problems.push('mission brief lacks refuel authority (dead-miner failure mode)');
  }
  return problems;
}

function parseLog(logText) {
  let tokensIn = 0, tokensOut = 0, toolErrors = 0, turns = 0;
  for (const line of logText.split('\n')) {
    if (line.includes('"event":"tool_error"')) toolErrors++;
    if (line.includes('"event":"turn_end"')) {
      try {
        const e = JSON.parse(line.slice(line.indexOf('{')));
        turns = Math.max(turns, e.tick || 0);
        tokensIn = Math.max(tokensIn, e.totalTokensIn || 0);
        tokensOut = Math.max(tokensOut, e.totalTokensOut || 0);
      } catch (_) { /* partial line */ }
    }
  }
  return { turns, tokensIn, tokensOut, toolErrors };
}

// Stop detection (research.31, builder 2026-10-30, codex agency proposal §2):
// the pilot decides when the night is over. The old end condition — "captain's
// log written while docked" — made the log a stop token: Daphne Stafford
// (10-29) wrote it after a dry belt and the night ended at ~5 minutes; Simone
// Adesanya (10-10) declined a live MAYDAY citing the hard stop. Now a night
// ends only when the pilot stops calling the console (IDLE_TURNS turn_end
// events with no tool_call — the research.29 Move 3 idle stop, which also ends
// a model that narrates instead of flying), or at the window (wall-clock cap),
// or when the client exits on its own. The sidecar records which: stopReason.
// Only SUCCESSFUL tool_call events reset the idle count.
const ANSI_RE = /\x1b\[[0-9;]*m/g;
// research.29 Move 3: Simone Adesanya 2026-10-10 made 2 real tool_calls, then
// 153 turn_end events of command-shaped prose until the cap (2.71M tokens in).
// Eric Taveras's 29-call mission night (2026-10-16) never passed 2 idle turns.
const IDLE_TURNS = 8;

function createCompletionTracker(idleTurns) {
  const limit = idleTurns || IDLE_TURNS;
  let done = false, idle = 0, calls = 0;
  return {
    push(line) {
      let e;
      try { e = JSON.parse(line); } catch (_) { return done; }
      if (e.event === 'turn_end') {
        idle++;
        if (!done && idle >= limit) done = true;
        return done;
      }
      if (e.event !== 'tool_call' || !e.args || typeof e.args.command !== 'string') return done;
      idle = 0;
      calls++;
      return done;
    },
    get complete() { return done; },
    get idleTurns() { return idle; },
    get toolCalls() { return calls; },
  };
}

async function main() {
  const a = parseArgs(process.argv);
  if (!a.session) { console.error('--session required'); process.exit(2); }

  fs.mkdirSync(EP_DIR, { recursive: true });
  const problems = preflight(a);
  if (problems.length) {
    console.error('[episode] PREFLIGHT FAILED:');
    problems.forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  console.log('[episode] preflight OK — session ' + a.session + ', cap ' + a.minutes + ' min, model ' + a.model);
  if (a.preflightOnly) return;

  if (fs.existsSync(LOCK)) {
    console.error('[episode] another runner holds ' + LOCK + ' — refusing to overlap (plan principle 5)');
    process.exit(1);
  }
  fs.writeFileSync(LOCK, String(process.pid));
  process.on('exit', () => { try { fs.unlinkSync(LOCK); } catch (_) {} });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logPath = path.join(EP_DIR, `${a.session}-${ts}.log`);
  const sidePath = logPath.replace(/\.log$/, '.json');
  const mission = a.mission || fs.readFileSync(a.missionFile, 'utf8');

  const startedAt = new Date();
  const child = spawn('/root/.bun/bin/bun', ['run', 'src/commander.ts',
    '--model', a.model, '--session', a.session, '--benchmark', mission],
    { cwd: COMMANDER, env: { ...process.env, OPENROUTER_API_KEY: loadKey() } });

  const out = fs.createWriteStream(logPath);
  child.stdout.pipe(out);
  child.stderr.pipe(out);

  // Stream-scan stdout for the mission end condition. JSON events arrive one
  // per line amid ANSI-colored chatter; buffer to line boundaries and strip
  // color codes before matching.
  const tracker = createCompletionTracker();
  let completed = false;
  let timedOut = false;
  let lineBuf = '';
  child.stdout.on('data', chunk => {
    lineBuf += chunk.toString('utf8').replace(ANSI_RE, '');
    let idx;
    while ((idx = lineBuf.indexOf('\n')) >= 0) {
      const line = lineBuf.slice(0, idx).trim();
      lineBuf = lineBuf.slice(idx + 1);
      if (!line.startsWith('{"event"')) continue;
      if (!completed && tracker.push(line)) {
        completed = true;
        console.log('[episode] pilot stopped — ' + tracker.idleTurns + ' turns with no console call after ' +
          tracker.toolCalls + ' call(s); graceful stop now');
        try { child.kill('SIGINT'); } catch (_) {}
      }
    }
  });

  const killer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGINT');
    setTimeout(() => { try { child.kill('SIGKILL'); } catch (_) {} }, GRACE_MS).unref();
  }, a.minutes * 60 * 1000);

  const code = await new Promise(res => child.on('close', res));
  clearTimeout(killer);
  out.end();

  const stats = parseLog(fs.readFileSync(logPath, 'utf8'));
  const sidecar = {
    show: 'UNDOCKED',
    session: a.session,
    model: a.model,
    startedAt: startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    capMinutes: a.minutes,
    exitCode: code,
    capped: timedOut,              // wall-clock cap fired (was: any non-clean exit)
    // research.31: how the night ended — 'pilot-stopped' (IDLE_TURNS with no
    // console call), 'window' (the cap), or 'exit' (the client ended on its own).
    stopReason: completed ? 'pilot-stopped' : (timedOut ? 'window' : 'exit'),
    toolCalls: tracker.toolCalls,
    ...stats,
    // deepseek-chat list prices; cache reads push real cost lower
    estCostUsd: +((stats.tokensIn * 0.14 + stats.tokensOut * 0.28) / 1e6).toFixed(4),
    log: path.relative(ROOT, logPath),
    runner: 'scripts/undockedEpisode.js',
  };
  fs.writeFileSync(sidePath, JSON.stringify(sidecar, null, 2) + '\n');
  console.log(`[episode] done — exit ${code}, ${stats.turns} turns, ` +
    `${stats.tokensIn} in / ${stats.tokensOut} out, ~$${sidecar.estCostUsd}, ` +
    `${stats.toolErrors} tool errors`);
  console.log('[episode] log: ' + path.relative(ROOT, logPath));
  console.log('[episode] sidecar: ' + path.relative(ROOT, sidePath));
}

module.exports = { createCompletionTracker, parseLog, IDLE_TURNS };

if (require.main === module) {
  main().catch(e => { console.error('[episode] FATAL: ' + (e && e.message || e)); process.exit(1); });
}
