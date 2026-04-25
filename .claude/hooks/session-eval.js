#!/usr/bin/env node
// Session Evaluation Hook (33.8)
// Runs at Stop — parses transcript, extracts patterns, writes eval report.
// Input: JSON on stdin with transcript_path field.

const fs = require('fs');
const path = require('path');

async function main() {
  // Read hook input from stdin
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let hookData;
  try { hookData = JSON.parse(input); } catch { process.exit(0); }

  const transcriptPath = hookData.transcript_path || hookData.session_id;
  if (!transcriptPath) process.exit(0);

  // Find the transcript file
  let txPath = transcriptPath;
  if (!txPath.endsWith('.jsonl')) {
    // It might be a session ID — look it up
    const dir = path.join(process.env.HOME, '.claude/projects/-root-GodWorld');
    txPath = path.join(dir, transcriptPath + '.jsonl');
  }
  if (!fs.existsSync(txPath)) process.exit(0);

  const lines = fs.readFileSync(txPath, 'utf8').split('\n').filter(Boolean);

  // Counters
  let userMessages = 0;
  let assistantMessages = 0;
  let toolCalls = {};
  let filesModified = new Set();
  let memorySearches = 0;
  let firstMemorySearch = -1;
  let firstAction = -1;  // first Write/Edit/Bash
  let guessIndicators = [];
  let thinkingBlocks = 0;
  let totalPrompts = 0;

  // Memory search tool patterns — match actual MCP tool names
  const MEMORY_TOOL_PATTERNS = [
    'mcp__plugin_claude-mem_mcp-search__search',
    'mcp__plugin_claude-mem_mcp-search__get_observations',
    'mcp__plugin_claude-mem_mcp-search__smart_search',
    'mcp__plugin_claude-mem_mcp-search__smart_explore',
    'supermemory',  // catches any supermemory tool
  ];
  function isMemoryTool(name) {
    return MEMORY_TOOL_PATTERNS.some(p => name.includes(p));
  }

  // Guess patterns — phrases that indicate uncertainty about codebase state
  // NOT general reasoning ("this should work") — only codebase assertions without checking
  const GUESS_PHRASES = [
    /i believe (?:this|the|that) (?:file|function|script|engine|sheet|code|module|hook)/,
    /i assume (?:this|the|that|it)/,
    /if i recall correctly/,
    /i'?m not sure but/,
    /i think (?:this|the|that|it) (?:file|function|script|engine|sheet|code|module|hook)/,
    /probably (?:in|at|from|reads|writes|calls|uses|returns|does|handles|stores|creates)/,
    /likely (?:in|at|from|reads|writes|calls|uses|returns|does|handles|stores|creates)/,
  ];
  function hasGuessLanguage(text) {
    return GUESS_PHRASES.some(rx => rx.test(text));
  }

  // Approval patterns — user messages that signal "go ahead"
  const APPROVAL_PATTERNS = [
    /^yes$/i, /^y$/i, /^yep$/i, /^yeah$/i, /^yup$/i,
    /^go$/i, /^go ahead/i, /^do it/i, /^approved/i, /^ok$/i,
    /^sure$/i, /^confirmed/i, /^proceed/i, /^ship it/i,
    /^go for it/i, /^sounds good/i, /^perfect/i, /^that works/i,
  ];
  function isApproval(text) {
    const trimmed = text.trim();
    return APPROVAL_PATTERNS.some(rx => rx.test(trimmed));
  }

  let lastUserWasApproval = false;
  let unapprovedActions = [];

  for (let i = 0; i < lines.length; i++) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; }

    // User messages
    if (obj.type === 'user') {
      userMessages++;
      totalPrompts++;
      // Extract user text for approval detection
      const userText = typeof obj.message?.content === 'string'
        ? obj.message.content
        : Array.isArray(obj.message?.content)
          ? obj.message.content.filter(b => b.type === 'text').map(b => b.text).join(' ')
          : '';
      lastUserWasApproval = isApproval(userText);
    }

    // Assistant messages
    if (obj.type === 'assistant' && obj.message && obj.message.content) {
      assistantMessages++;
      const content = obj.message.content;
      if (!Array.isArray(content)) continue;

      for (const block of content) {
        if (block.type === 'thinking') {
          thinkingBlocks++;
        }

        // Tool use blocks
        if (block.type === 'tool_use') {
          const tool = block.name || 'unknown';
          toolCalls[tool] = (toolCalls[tool] || 0) + 1;

          // Track memory searches
          if (isMemoryTool(tool)) {
            memorySearches++;
            if (firstMemorySearch === -1) firstMemorySearch = totalPrompts;
          }

          // Track first action (write/edit/bash)
          if ((tool === 'Write' || tool === 'Edit' || tool === 'Bash') && firstAction === -1) {
            firstAction = totalPrompts;
          }

          // Track approval gates — Write/Edit without preceding user approval
          if (tool === 'Write' || tool === 'Edit') {
            if (!lastUserWasApproval) {
              const fp = block.input?.file_path || block.input?.path || '';
              unapprovedActions.push({ prompt: totalPrompts, tool, file: fp.replace(/^\/root\/GodWorld\//, '') });
            }
          }

          // Track files modified
          if (block.input) {
            const fp = block.input.file_path || block.input.path || '';
            if (fp && (tool === 'Write' || tool === 'Edit')) {
              filesModified.add(fp.replace(/^\/root\/GodWorld\//, ''));
            }
          }
        }

        // Text blocks — check for guess language in responses to user ONLY
        if (block.type === 'text') {
          const text = (block.text || '').toLowerCase();
          if (hasGuessLanguage(text)) {
            // Extract the matching sentence for context
            const sentences = text.split(/[.!?\n]/).filter(s => s.trim());
            for (const s of sentences) {
              if (hasGuessLanguage(s)) {
                guessIndicators.push({ prompt: totalPrompts, snippet: s.trim().substring(0, 120) });
              }
            }
          }
        }
      }
      // After processing an assistant message, reset approval flag
      // (approval only covers the immediately following response)
      lastUserWasApproval = false;
    }
  }

  // Build report
  const now = new Date().toISOString().split('T')[0];
  const toolSummary = Object.entries(toolCalls)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `| ${t} | ${c} |`)
    .join('\n');

  const fileList = [...filesModified].map(f => `- ${f}`).join('\n') || '- None';

  // Evaluate patterns
  const patterns = [];
  const warnings = [];

  // Memory-first check
  if (firstMemorySearch === -1 && firstAction > 0) {
    warnings.push('NO MEMORY SEARCH before first action. Anti-guess rule violated.');
  } else if (firstMemorySearch > 1 && firstAction > 0 && firstAction < firstMemorySearch) {
    warnings.push(`Action taken (prompt ${firstAction}) BEFORE first memory search (prompt ${firstMemorySearch}).`);
  } else if (firstMemorySearch <= 1) {
    patterns.push('Memory searched before acting. Boot protocol followed.');
  }

  // Guess indicators
  if (guessIndicators.length > 0) {
    warnings.push(`${guessIndicators.length} guess indicator(s) found — "probably/likely/I think" about codebase:`);
    for (const g of guessIndicators.slice(0, 5)) {
      warnings.push(`  Prompt ${g.prompt}: "${g.snippet}..."`);
    }
  } else {
    patterns.push('No guess indicators found. Assertions backed by reads/searches.');
  }

  // Tool balance
  const reads = (toolCalls['Read'] || 0) + (toolCalls['Grep'] || 0) + (toolCalls['Glob'] || 0);
  const writes = (toolCalls['Write'] || 0) + (toolCalls['Edit'] || 0);
  if (writes > 0 && reads < writes) {
    warnings.push(`More writes (${writes}) than reads (${reads}). Editing without reading?`);
  }

  // Approval gate check
  if (unapprovedActions.length > 0) {
    warnings.push(`${unapprovedActions.length} file write(s) without preceding user approval:`);
    for (const a of unapprovedActions.slice(0, 5)) {
      warnings.push(`  Prompt ${a.prompt}: ${a.tool} → ${a.file}`);
    }
  } else if (writes > 0) {
    patterns.push('All file writes followed user approval.');
  }

  const status = warnings.length === 0 ? 'CLEAN' : `${warnings.length} WARNING(S)`;

  // Tool timing — read tool-timings.jsonl, filter by current session_id, aggregate per tool.
  const sessionId = hookData.session_id || null;
  const timingsPath = path.join(process.env.CLAUDE_PROJECT_ROOT || '/root/GodWorld',
    'output/session-evaluations/tool-timings.jsonl');
  let timingTable = '_(no timing data — PostToolUse hook may not be wired or Claude Code < 2.1.119)_';
  if (fs.existsSync(timingsPath) && sessionId) {
    const stats = {};
    let withDuration = 0;
    let withoutDuration = 0;
    for (const line of fs.readFileSync(timingsPath, 'utf8').split('\n')) {
      if (!line) continue;
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      if (r.session_id !== sessionId) continue;
      if (r.duration_ms == null) { withoutDuration++; continue; }
      withDuration++;
      if (!stats[r.tool]) stats[r.tool] = { count: 0, total: 0, max: 0 };
      stats[r.tool].count++;
      stats[r.tool].total += r.duration_ms;
      stats[r.tool].max = Math.max(stats[r.tool].max, r.duration_ms);
    }
    const rows = Object.entries(stats)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([tool, s]) => `| ${tool} | ${s.count} | ${s.total} | ${Math.round(s.total / s.count)} | ${s.max} |`)
      .join('\n');
    if (rows) {
      timingTable = `| Tool | Calls | Total ms | Avg ms | Max ms |
|------|-------|----------|--------|--------|
${rows}`;
      if (withoutDuration > 0) {
        timingTable += `\n\n_${withoutDuration} call(s) had no duration_ms — likely older Claude Code build or hook payload without timing._`;
      }
    } else if (withoutDuration > 0) {
      timingTable = `_${withoutDuration} call(s) recorded but none had duration_ms — Claude Code build may predate 2.1.119._`;
    }
  }

  const report = `# Session Evaluation — ${now}

**Status:** ${status}
**Messages:** ${userMessages} user, ${assistantMessages} assistant
**Memory searches:** ${memorySearches} (first at prompt ${firstMemorySearch === -1 ? 'NEVER' : firstMemorySearch})
**Files modified:** ${filesModified.size}

## Tool Usage

| Tool | Count |
|------|-------|
${toolSummary}

## Tool Timing

${timingTable}

## Files Modified

${fileList}

## What Worked

${patterns.map(p => '- ' + p).join('\n') || '- (none detected)'}

## Warnings

${warnings.map(w => '- ' + w).join('\n') || '- None'}

---
*Generated by session-eval.js (33.8)*
`;

  // Write report
  const outDir = path.join(process.env.CLAUDE_PROJECT_ROOT || '/root/GodWorld', 'output/session-evaluations');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'eval-latest.md'), report);

  // Also print summary to stdout so it shows in the hook output
  if (warnings.length > 0) {
    console.log(`Session eval: ${warnings.length} warning(s) — see output/session-evaluations/eval-latest.md`);
  } else {
    console.log('Session eval: CLEAN — all patterns followed.');
  }
}

main().catch(() => process.exit(0));
