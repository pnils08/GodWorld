#!/usr/bin/env node
// Stop hook — builder 2026-11-19: "put a hook on every turn, if assumption is in
// the response to immediately close the session as you're contaminating the project".
// Builder terminals only (tmux window research-build / engine-sheet); crons and
// unregistered windows pass. Reads the reply just finished, drops code and quoted
// lines, and on an assumption word stops the turn and ends the claude process.
// It sees words only: a confident wrong claim carries no word to catch.

const fs = require('fs');
const { execSync } = require('child_process');

const TERMINALS = ['research-build', 'engine-sheet'];
const WORDS = [
  'probably', 'likely', 'presumably', 'i think', 'i believe', 'i assume',
  'assuming', 'i guess', "i'd guess", 'my guess', 'i suspect', 'should be',
  'might be', 'seems', 'appears to',
];
const PATTERN = new RegExp('\\b(' + WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i');

function windowName() {
  if (!process.env.TMUX_PANE) return '';
  try {
    return execSync(`tmux display-message -t "${process.env.TMUX_PANE}" -p '#W'`, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function lastReply(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  const texts = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry;
    try { entry = JSON.parse(lines[i]); } catch (e) { continue; }
    const content = entry.message && entry.message.content;
    if (entry.type === 'user') {
      const isToolResult = Array.isArray(content) && content.some(b => b.type === 'tool_result');
      if (!isToolResult) break;
      continue;
    }
    if (entry.type === 'assistant' && Array.isArray(content)) {
      for (const b of content) if (b.type === 'text') texts.unshift(b.text);
    }
  }
  return texts.join('\n');
}

function clean(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .split('\n').filter(l => !/^\s*>/.test(l)).join('\n');
}

function claudePid() {
  let pid = process.ppid;
  for (let n = 0; n < 6 && pid > 1; n++) {
    const out = execSync(`ps -o ppid= -o comm= -p ${pid}`, { encoding: 'utf8' }).trim();
    const m = out.match(/^(\d+)\s+(.*)$/);
    if (!m) return 0;
    if (/claude/i.test(m[2])) return pid;
    pid = Number(m[1]);
  }
  return 0;
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  if (!TERMINALS.includes(windowName())) return;
  if (!input.transcript_path || !fs.existsSync(input.transcript_path)) return;
  const hit = clean(lastReply(input.transcript_path)).match(PATTERN);
  if (!hit) return;
  const reason = `assumption-guard: "${hit[1]}" in the reply — session closed (builder 2026-11-19).`;
  process.stdout.write(JSON.stringify({ continue: false, stopReason: reason }) + '\n');
  if (process.env.ASSUMPTION_GUARD_NO_KILL === '1') return;
  const pid = claudePid();
  if (pid) setTimeout(() => { try { process.kill(pid, 'SIGTERM'); } catch (e) {} }, 300);
}

main();
