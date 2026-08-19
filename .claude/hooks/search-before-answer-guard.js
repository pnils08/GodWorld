#!/usr/bin/env node
// Search-Before-Answer Guard — Stop hook, Mike-direct 2026-08-19.
// Same mechanism as first-person-guard.js: reads the transcript at Stop,
// walks back to the start of the CURRENT turn (the last real user message),
// and blocks if no search/read tool ran during that turn. Forces "search,
// then report facts" instead of answering from memory or a guess.

const fs = require('fs');
const path = require('path');

const SEARCH_TOOLS = /^(Read|Grep|Glob|Bash|WebSearch|WebFetch|mcp__godworld__|mcp__plugin_claude-mem_mcp-search__|mcp__claude_ai_Mara__)/;

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let hookData;
  try { hookData = JSON.parse(input); } catch { process.exit(0); }

  const transcriptPath = hookData.transcript_path || hookData.session_id;
  if (!transcriptPath) process.exit(0);

  let txPath = transcriptPath;
  if (!txPath.endsWith('.jsonl')) {
    const dir = path.join(process.env.HOME, '.claude/projects/-root-GodWorld');
    txPath = path.join(dir, transcriptPath + '.jsonl');
  }
  if (!fs.existsSync(txPath)) process.exit(0);

  const lines = fs.readFileSync(txPath, 'utf8').split('\n').filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try { entries.push(JSON.parse(line)); } catch { /* skip */ }
  }

  // Find the last real user message (a human prompt, not a tool_result payload).
  let turnStart = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    const obj = entries[i];
    if (obj.type !== 'user' || !obj.message || !Array.isArray(obj.message.content)) continue;
    const hasToolResult = obj.message.content.some((b) => b.type === 'tool_result');
    if (hasToolResult) continue;
    const hasRealText = obj.message.content.some((b) => b.type === 'text' && b.text && b.text.trim());
    if (hasRealText) { turnStart = i; break; }
  }
  if (turnStart === -1) process.exit(0);

  // Does the final assistant turn actually carry text (i.e., is it answering)?
  let lastAssistantHasText = false;
  for (let i = entries.length - 1; i > turnStart; i--) {
    const obj = entries[i];
    if (obj.type === 'assistant' && obj.message && Array.isArray(obj.message.content)) {
      const text = obj.message.content.filter((b) => b.type === 'text').map((b) => b.text || '').join('');
      if (text.trim()) { lastAssistantHasText = true; }
      break;
    }
  }
  if (!lastAssistantHasText) process.exit(0);

  // Scan everything after turnStart for a search/read-class tool_use.
  let ranSearch = false;
  for (let i = turnStart + 1; i < entries.length; i++) {
    const obj = entries[i];
    if (obj.type !== 'assistant' || !obj.message || !Array.isArray(obj.message.content)) continue;
    for (const block of obj.message.content) {
      if (block.type === 'tool_use' && block.name && SEARCH_TOOLS.test(block.name)) {
        ranSearch = true;
        break;
      }
    }
    if (ranSearch) break;
  }

  if (!ranSearch) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'No search/read tool ran this turn — Mike-direct 2026-08-19: search (Read/Grep/Glob/Bash/godworld MCP) before answering, then report only what the search found.',
    }));
    process.exit(0);
  }

  process.exit(0);
}

main();
