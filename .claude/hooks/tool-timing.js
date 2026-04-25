#!/usr/bin/env node
// PostToolUse — captures Claude Code 2.1.119+ duration_ms per tool call.
// Reads JSON on stdin, appends one JSONL line per call. Never blocks.

const fs = require('fs');
const path = require('path');

(async () => {
  try {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    if (!input) process.exit(0);

    let data;
    try { data = JSON.parse(input); } catch { process.exit(0); }

    const outDir = path.join(process.env.CLAUDE_PROJECT_ROOT || '/root/GodWorld', 'output/session-evaluations');
    fs.mkdirSync(outDir, { recursive: true });

    // First-run payload sample for shape verification (overwrites once, then leaves alone).
    const samplePath = path.join(outDir, 'tool-timing-payload-sample.json');
    if (!fs.existsSync(samplePath)) {
      try { fs.writeFileSync(samplePath, JSON.stringify(data, null, 2)); } catch {}
    }

    const duration = data.duration_ms
      ?? data.tool_response?.duration_ms
      ?? data.metadata?.duration_ms
      ?? null;

    const record = {
      ts: new Date().toISOString(),
      session_id: data.session_id ?? null,
      tool: data.tool_name ?? data.tool ?? 'unknown',
      duration_ms: duration,
      ok: data.tool_response?.is_error === true ? false : true,
    };

    fs.appendFileSync(path.join(outDir, 'tool-timings.jsonl'), JSON.stringify(record) + '\n');
  } catch {
    // Never block tool execution.
  }
  process.exit(0);
})();
