#!/usr/bin/env node
// sessionSummaryToSupermemory.js — bridge claude-mem's per-session summary into
// Supermemory, per terminal. S283 (Mike-directed).
//
// claude-mem already writes structured session summaries (request / completed /
// learned / next_steps) into ~/.claude-mem/claude-mem.db as the session runs —
// zero new LLM calls here; this script only mirrors the latest session's rows
// into Supermemory so each terminal's slice of work holds its own session
// context in the cloud brain.
//
// Container design (follows the citizen-pages umbrella+specific precedent):
//   containerTags: ["session-logs", "sl-<terminal>"]
//   → search ALL session logs via "session-logs", one terminal's via "sl-<t>".
// customId "session-log-<memory_session_id>" makes re-runs idempotent
// (Supermemory upserts on customId — no duplicate docs if close runs twice).
//
// Why this is safe where the S221 auto-save wasn't: one distilled third-person
// work log per session into a WORK container (not the mags personal container
// whose extraction collapsed speakers into Mags' voice), from data claude-mem
// already produced deterministically.
//
// Wired as a best-effort sub-step of sessionEndMechanical.js — NEVER fatal.
// A Supermemory outage or a missing summary must not block a session close,
// so every failure path exits 0 with a ⚠ line. Direct use:
//   node scripts/sessionSummaryToSupermemory.js --terminal=research-build [--dry-run]

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = '/root/GodWorld';
const DB = path.join(os.homedir(), '.claude-mem', 'claude-mem.db');
const API_URL = process.env.SUPERMEMORY_BASE_URL || 'https://api.supermemory.ai';
const MAX_FIELD = 1200; // per-field char cap — this is a log entry, not an archive

function parseArgs() {
  const args = { terminal: 'unknown', dryRun: false };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--terminal=')) args.terminal = a.split('=')[1];
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

function warnExit(msg) {
  console.log(`  ⚠ session-summary bridge skipped: ${msg}`);
  process.exit(0); // best-effort by contract — never fail the close
}

function apiKey() {
  if (process.env.SUPERMEMORY_CC_API_KEY) return process.env.SUPERMEMORY_CC_API_KEY;
  if (process.env.SUPERMEMORY_API_KEY) return process.env.SUPERMEMORY_API_KEY;
  // fallback: the plugin's per-project key store
  try {
    const cfg = JSON.parse(fs.readFileSync(
      path.join(os.homedir(), '.supermemory', 'projects', '-root-GodWorld', 'config.json'), 'utf8'));
    if (cfg.apiKey) return cfg.apiKey;
  } catch { /* fall through */ }
  return null;
}

function sql(query) {
  // -json output; sqlite3 CLI is already a project dependency-of-practice.
  // Collapse whitespace: JSON.stringify would ship literal \n into the shell arg.
  const q = query.replace(/\s+/g, ' ').trim();
  const out = execSync(`sqlite3 -json ${JSON.stringify(DB)} ${JSON.stringify(q)}`,
    { encoding: 'utf8', timeout: 15000 });
  return out.trim() ? JSON.parse(out) : [];
}

function pinSession() {
  try {
    const m = fs.readFileSync(path.join(ROOT, 'SESSION_CONTEXT.md'), 'utf8')
      .match(/\*\*PIN:\*\*\s*S?(\d+)/);
    return m ? `S${m[1]}` : 'S?';
  } catch { return 'S?'; }
}

function clip(s) {
  if (!s) return '';
  s = String(s).trim();
  return s.length > MAX_FIELD ? s.slice(0, MAX_FIELD) + ' […]' : s;
}

async function main() {
  const args = parseArgs();
  if (!fs.existsSync(DB)) warnExit(`claude-mem DB not found at ${DB}`);

  let rows;
  try {
    // newest session that has summaries, then ALL its rows chronologically
    // (claude-mem writes incremental summary rows as the session progresses)
    rows = sql(`
      SELECT request, investigated, learned, completed, next_steps, files_edited, created_at
      FROM session_summaries
      WHERE memory_session_id = (
        SELECT memory_session_id FROM session_summaries
        WHERE project = 'GodWorld'
        ORDER BY created_at_epoch DESC LIMIT 1)
      ORDER BY created_at_epoch ASC`);
  } catch (err) {
    warnExit(`DB read failed: ${err.message}`);
  }
  if (!rows.length) warnExit('no session summary rows found (claude-mem may not have captured this session)');

  const latest = rows[rows.length - 1];
  const ageHours = (Date.now() - new Date(latest.created_at).getTime()) / 3600000;
  if (ageHours > 24) warnExit(`latest summary is ${ageHours.toFixed(0)}h old — not this session; nothing fresh to mirror`);

  const sess = pinSession();
  const date = latest.created_at.slice(0, 10);
  const joinField = (f) => clip([...new Set(rows.map(r => (r[f] || '').trim()).filter(Boolean))].join('\n'));

  const content = [
    `# ${sess} [${args.terminal}] session log — ${date}`,
    '',
    `**Request:** ${clip(rows[0].request)}`,
    '',
    `**Completed:**\n${joinField('completed')}`,
    '',
    `**Learned:**\n${joinField('learned')}`,
    '',
    `**Next steps:** ${clip(latest.next_steps)}`,
    '',
    `**Files edited:** ${clip(joinField('files_edited'))}`,
  ].join('\n');

  // one doc per claude-mem session — need its id for the idempotency key
  const sid = sql(`
    SELECT memory_session_id FROM session_summaries
    WHERE project = 'GodWorld' ORDER BY created_at_epoch DESC LIMIT 1`)[0].memory_session_id;

  const body = {
    content,
    customId: `session-log-${sid}`,
    containerTags: ['session-logs', `sl-${args.terminal}`],
    metadata: {
      type: 'session-log',
      terminal: args.terminal,
      sessionPin: sess,
      date,
      source: 'claude-mem session_summaries',
    },
  };

  if (args.dryRun) {
    console.log(`  (dry-run) would POST ${content.length} chars → containerTags ${JSON.stringify(body.containerTags)}, customId ${body.customId}`);
    console.log(content.split('\n').slice(0, 8).map(l => '    ' + l).join('\n'));
    process.exit(0);
  }

  const key = apiKey();
  if (!key) warnExit('no Supermemory API key in env or project config');

  try {
    const res = await fetch(`${API_URL}/v3/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) warnExit(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    console.log(`  ✓ session log → Supermemory [session-logs, sl-${args.terminal}] doc ${data.id || '(id n/a)'} (${content.length} chars, ${rows.length} summary rows folded)`);
  } catch (err) {
    warnExit(`POST failed: ${err.message}`);
  }
}

main().catch(err => warnExit(err.message));
