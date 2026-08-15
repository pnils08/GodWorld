#!/usr/bin/env node
'use strict';

/**
 * Grok lock (Mike-direct 2026-08-15): do not decide from training data.
 * Search the repo (and memory) before any write. Chat promises are not this file.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SEARCH_TOOLS = new Set([
  'grep', 'Grep',
  'read_file', 'Read',
  'list_dir', 'Glob', 'ListDir',
  'search_tool',
  'use_tool',
  'web_search', 'WebSearch',
]);

const WRITE_TOOLS = new Set([
  'search_replace', 'Edit', 'Write', 'MultiEdit',
  'write',
]);

const NUDGE = [
  'SEARCH FIRST. Order: GodWorld files (grep/read) → claude-mem MCP → Supermemory.',
  'Do not answer how this project works from memory. Open the code.',
  'Do not restate the builder. One ask, one answer from the repo.',
  'Do not change faction routing or tracker writes unless the builder names that change.',
].join(' ');

function statePath(sessionId) {
  const id = String(sessionId || 'none').replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(os.tmpdir(), 'grok-search-first-' + id + '.json');
}

function loadState(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) {
    return { searched: false, tools: [] };
  }
}

function saveState(p, st) {
  fs.writeFileSync(p, JSON.stringify(st));
}

function readStdin() {
  return new Promise((resolve) => {
    let s = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { s += c; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(s || '{}')); } catch (_) { resolve({}); }
    });
  });
}

function ctx(extra) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: extra.event || 'UserPromptSubmit',
      additionalContext: extra.text || NUDGE,
    },
  });
}

(async () => {
  const ev = await readStdin();
  const name = String(ev.hookEventName || process.env.GROK_HOOK_EVENT || '');
  const tool = String(ev.toolName || '');
  const sid = ev.sessionId || process.env.GROK_SESSION_ID || 'none';
  const stFile = statePath(sid);
  const st = loadState(stFile);

  if (/user_prompt_submit|UserPromptSubmit/i.test(name)) {
    process.stdout.write(ctx({ event: 'UserPromptSubmit', text: NUDGE }));
    process.exit(0);
  }

  if (/session_start|SessionStart/i.test(name)) {
    process.stdout.write(ctx({ event: 'SessionStart', text: NUDGE }));
    process.exit(0);
  }

  if (/pre_tool_use|PreToolUse/i.test(name) || process.env.GROK_HOOK_EVENT === 'pre_tool_use') {
    if (SEARCH_TOOLS.has(tool)) {
      st.searched = true;
      st.tools.push(tool);
      saveState(stFile, st);
      process.stdout.write('{"decision":"allow"}');
      process.exit(0);
    }
    if (WRITE_TOOLS.has(tool) && !st.searched) {
      process.stdout.write(JSON.stringify({
        decision: 'deny',
        reason: 'Search the GodWorld repo (grep/read) before editing. Training data is not this project.',
      }));
      process.exit(0);
    }
    process.stdout.write('{"decision":"allow"}');
    process.exit(0);
  }

  if (/post_tool_use|PostToolUse/i.test(name) && SEARCH_TOOLS.has(tool)) {
    st.searched = true;
    st.tools.push(tool);
    saveState(stFile, st);
  }

  process.exit(0);
})();
