#!/usr/bin/env node
/**
 * laneMessage.js — governance.47 Task 1. Deterministic (no model) transport for
 * the non-Claude lanes (kimi, codex, antigravity, grok). Claude-session lanes
 * (research-build, engine-sheet) are NOT delivered here — SendMessage reaches
 * them directly, and only from inside a Claude Code tool-use context that a
 * standalone node process doesn't have; this script redirects instead of
 * silently no-op'ing on those.
 *
 * Design (research: docs/research/2026-09-17-munder-difflin-multi-agent-harness.md):
 * every send durably queues first (logs/mailbox/<lane>/inbox/<id>.json, atomic
 * write-then-rename) so a message is never lost to a bad injection or a dead
 * pane. Delivery over tmux only happens after the target pane classifies as
 * IDLE — not just "a process is running" (dead-pane injection) but the
 * EXPECTED CLI at its EXPECTED NORMAL prompt, with a check against known
 * blocked-state text (billing/quota/rate-limit menus) that would otherwise eat
 * a keystroke. Every attempt — delivered, queued, blocked, not-booted — is
 * appended to logs/cross-lane.jsonl, so a lane talking without the operator
 * still leaves a readable record.
 *
 * Usage:
 *   node scripts/laneMessage.js --to codex --message "..." [--from research-build] [--hop-count 0]
 *   node scripts/laneMessage.js --status [--to <lane>]
 *   node scripts/laneMessage.js --retry-queued [--to <lane>]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LANE_MAP_PATH = path.join(__dirname, 'lane-map.json');
const MAILBOX_DIR = path.join(ROOT, 'logs', 'mailbox');
const TRANSCRIPT_PATH = path.join(ROOT, 'logs', 'cross-lane.jsonl');
const HOP_LIMIT = 3;
const REPLY_TIMEOUT_MS = 30000;
const REPLY_POLL_MS = 1500;
const IDLE_SETTLE_MS = 2000;

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
function flag(name) {
  return process.argv.includes(name);
}

function loadLaneMap() {
  return JSON.parse(fs.readFileSync(LANE_MAP_PATH, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeAtomic(filePath, content) {
  ensureDir(path.dirname(filePath));
  const temp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(temp, content);
  fs.renameSync(temp, filePath);
}

function appendTranscript(entry) {
  ensureDir(path.dirname(TRANSCRIPT_PATH));
  fs.appendFileSync(TRANSCRIPT_PATH, JSON.stringify(entry) + '\n');
}

function resolvePaneId(windowName) {
  let out;
  try {
    out = execFileSync('tmux', ['list-panes', '-a', '-F', '#{window_name} #{pane_id} #{pane_current_command}']).toString();
  } catch (e) {
    return null;
  }
  const line = out.split('\n').find(l => l.split(' ')[0] === windowName);
  if (!line) return null;
  const [, paneId, cmd] = line.split(' ');
  return { paneId, cmd };
}

function capturePane(paneId, lines) {
  try {
    return execFileSync('tmux', ['capture-pane', '-p', '-t', paneId, '-S', '-' + (lines || 30)]).toString();
  } catch (e) {
    return '';
  }
}

/** Returns { state: 'not-booted'|'blocked'|'busy'|'idle', why, pane, cmd, snippet } */
function classifyLane(laneName, laneCfg, laneMap) {
  const resolved = resolvePaneId(laneCfg.window);
  if (!resolved) return { state: 'not-booted', why: laneName + ': no tmux window named "' + laneCfg.window + '"' };
  const { paneId, cmd } = resolved;
  if (laneCfg.expectedCmd && cmd !== laneCfg.expectedCmd) {
    return { state: 'not-booted', why: 'pane at `' + cmd + '`, expected `' + laneCfg.expectedCmd + '`', pane: paneId, cmd };
  }
  const text = capturePane(paneId, 30);
  const blockedMarkers = (laneMap._meta && laneMap._meta.blockedMarkers) || [];
  const hitBlocked = blockedMarkers.find(m => text.includes(m));
  if (hitBlocked) {
    return { state: 'blocked', why: 'blocked-state marker matched: "' + hitBlocked + '"', pane: paneId, cmd, snippet: tail(text) };
  }
  const busyMarkers = laneCfg.busyMarkers || [];
  const hitBusy = busyMarkers.find(m => text.includes(m));
  if (hitBusy) {
    return { state: 'busy', why: 'busy marker matched: "' + hitBusy + '"', pane: paneId, cmd, snippet: tail(text) };
  }
  const idleMarkers = laneCfg.idleMarkers || [];
  const hitIdle = idleMarkers.length === 0 || idleMarkers.some(m => text.includes(m));
  if (hitIdle) {
    return { state: 'idle', why: idleMarkers.length ? 'idle marker matched' : 'no idle marker configured — assumed idle', pane: paneId, cmd, snippet: tail(text) };
  }
  // Running the expected CLI, no busy marker, no configured idle marker hit —
  // conservative default: treat as busy rather than risk injecting mid-turn.
  return { state: 'busy', why: 'no idle marker matched — conservative default', pane: paneId, cmd, snippet: tail(text) };
}

function sleepSync(ms) {
  execFileSync('sleep', [(ms / 1000).toString()]);
}

function tail(text, n) {
  const lines = text.split('\n').filter(Boolean);
  return lines.slice(-(n || 4)).join('\n');
}

function queueMessage(laneName, message, opts) {
  const id = crypto.randomBytes(6).toString('hex');
  const record = {
    id,
    from: opts.from || 'research-build',
    to: laneName,
    message,
    hopCount: opts.hopCount || 0,
    queuedAt: new Date().toISOString(),
    status: 'queued',
  };
  const inboxPath = path.join(MAILBOX_DIR, laneName, 'inbox', id + '.json');
  writeAtomic(inboxPath, JSON.stringify(record, null, 2));
  return { id, inboxPath, record };
}

function markDelivered(inboxPath, record, reply) {
  const laneName = record.to;
  record.status = 'delivered';
  record.deliveredAt = new Date().toISOString();
  record.reply = reply;
  const outboxPath = path.join(MAILBOX_DIR, laneName, 'outbox', path.basename(inboxPath));
  writeAtomic(outboxPath, JSON.stringify(record, null, 2));
  fs.unlinkSync(inboxPath);
  return outboxPath;
}

function waitForReply(paneId, beforeText) {
  const deadline = Date.now() + REPLY_TIMEOUT_MS;
  let last = beforeText;
  while (Date.now() < deadline) {
    const now = capturePane(paneId, 40);
    if (now !== beforeText && now.trim() !== beforeText.trim()) {
      last = now;
      // one settle read so a still-typing reply doesn't get captured mid-stream
      sleepSync(IDLE_SETTLE_MS);
      const settled = capturePane(paneId, 40);
      if (settled === now) return settled;
      last = settled;
    }
    sleepSync(REPLY_POLL_MS);
  }
  return last;
}

function deliverViaTmux(laneName, laneCfg, message) {
  const classification = classifyLane(laneName, laneCfg, loadLaneMap());
  if (classification.state !== 'idle') return { delivered: false, classification };
  const paneId = classification.pane;
  const before = capturePane(paneId, 40);
  execFileSync('tmux', ['send-keys', '-t', paneId, '-l', message]);
  sleepSync(1000); // matches the proven two-step protocol — the first Enter is swallowed by paste mode
  execFileSync('tmux', ['send-keys', '-t', paneId, 'Enter']);
  const reply = waitForReply(paneId, before);
  return { delivered: true, classification, reply };
}

function sendCommand() {
  const to = arg('--to', null);
  const message = arg('--message', null);
  const from = arg('--from', 'research-build');
  const hopCount = parseInt(arg('--hop-count', '0'), 10);
  const force = flag('--force');
  if (!to || !message) {
    console.error('Fatal: --to <lane> and --message "<text>" are required');
    process.exit(1);
  }
  if (message.includes('\n')) {
    console.error('Fatal: message must be single-line — a newline mid-string submits early and fragments delivery');
    process.exit(1);
  }
  const laneMap = loadLaneMap();
  const laneCfg = laneMap.lanes[to];
  if (!laneCfg) {
    console.error('Fatal: unknown lane "' + to + '" — known: ' + Object.keys(laneMap.lanes).join(', '));
    process.exit(1);
  }
  if (laneCfg.kind === 'claude-session') {
    console.error('"' + to + '" is a Claude session — use the SendMessage tool directly, not this script. ' +
      'This script only transports to non-Claude CLI lanes.');
    process.exit(1);
  }
  if (hopCount >= HOP_LIMIT && !force) {
    console.error('Fatal: hop count ' + hopCount + ' >= limit ' + HOP_LIMIT + ' — refusing an unattended relay chain. Pass --force to override (surfaces to the operator, per plan §4).');
    process.exit(1);
  }

  const { id, inboxPath, record } = queueMessage(to, message, { from, hopCount });
  const result = deliverViaTmux(to, laneCfg, message);

  let outcome;
  if (result.delivered) {
    const outboxPath = markDelivered(inboxPath, record, result.reply);
    outcome = { id, status: 'delivered', outboxPath, classification: result.classification };
    appendTranscript({ ts: new Date().toISOString(), id, from, to, message, hopCount, status: 'delivered', classification: result.classification.state });
    console.log('DELIVERED  ' + to + '  id=' + id);
    console.log('--- reply ---');
    console.log(result.reply);
  } else {
    outcome = { id, status: 'queued', inboxPath, classification: result.classification };
    appendTranscript({ ts: new Date().toISOString(), id, from, to, message, hopCount, status: 'queued', reason: result.classification.state, why: result.classification.why });
    console.log('QUEUED (not delivered)  ' + to + '  id=' + id);
    console.log('reason: ' + result.classification.state + ' — ' + result.classification.why);
    if (result.classification.snippet) console.log('pane tail:\n' + result.classification.snippet);
    console.log('Message is durably queued at ' + inboxPath + ' — rerun with --retry-queued once the lane is idle.');
  }
  return outcome;
}

function statusCommand() {
  const laneMap = loadLaneMap();
  const only = arg('--to', null);
  const names = only ? [only] : Object.keys(laneMap.lanes);
  for (const name of names) {
    const cfg = laneMap.lanes[name];
    if (!cfg) { console.log(name + ': unknown lane'); continue; }
    if (cfg.kind === 'claude-session') { console.log(name + ': claude-session (use SendMessage)'); continue; }
    const c = classifyLane(name, cfg, laneMap);
    console.log(name + ': ' + c.state.toUpperCase() + (c.why ? '  (' + c.why + ')' : ''));
  }
}

function retryQueuedCommand() {
  const laneMap = loadLaneMap();
  const only = arg('--to', null);
  const lanes = only ? [only] : Object.keys(laneMap.lanes).filter(n => laneMap.lanes[n].kind === 'cli');
  let attempted = 0;
  for (const laneName of lanes) {
    const cfg = laneMap.lanes[laneName];
    const inboxDir = path.join(MAILBOX_DIR, laneName, 'inbox');
    if (!fs.existsSync(inboxDir)) continue;
    const files = fs.readdirSync(inboxDir).filter(f => f.endsWith('.json')).sort();
    for (const f of files) {
      const inboxPath = path.join(inboxDir, f);
      const record = JSON.parse(fs.readFileSync(inboxPath, 'utf8'));
      attempted++;
      const result = deliverViaTmux(laneName, cfg, record.message);
      if (result.delivered) {
        const outboxPath = markDelivered(inboxPath, record, result.reply);
        appendTranscript({ ts: new Date().toISOString(), id: record.id, from: record.from, to: laneName, message: record.message, hopCount: record.hopCount, status: 'delivered-on-retry', classification: result.classification.state });
        console.log('DELIVERED (retry)  ' + laneName + '  id=' + record.id + '  -> ' + outboxPath);
      } else {
        console.log('still queued  ' + laneName + '  id=' + record.id + '  (' + result.classification.state + ')');
      }
    }
  }
  if (!attempted) console.log('no queued messages found' + (only ? ' for ' + only : ''));
}

function main() {
  if (flag('--status')) return statusCommand();
  if (flag('--retry-queued')) return retryQueuedCommand();
  return sendCommand();
}

if (require.main === module) main();
module.exports = { classifyLane, loadLaneMap, queueMessage, deliverViaTmux, resolvePaneId, capturePane };
