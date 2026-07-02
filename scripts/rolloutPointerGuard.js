#!/usr/bin/env node
// PreToolUse guard: ROLLOUT_PLAN.md is a pointer index (S286, Mike-direct).
// Denies any Edit/Write that adds a table row longer than MAX_ROW chars —
// detail belongs in the plan/research/triage doc the row points to.
const MAX_ROW = 300;

let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const fp = (input.tool_input && input.tool_input.file_path) || '';
  if (!fp.endsWith('docs/engine/ROLLOUT_PLAN.md')) process.exit(0);

  const text = (input.tool_input && (input.tool_input.new_string ?? input.tool_input.content)) || '';
  const fat = text.split('\n').filter(l => l.trimStart().startsWith('|') && l.length > MAX_ROW);
  if (!fat.length) process.exit(0);

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `ROLLOUT is a pointer index — ${fat.length} row(s) exceed ${MAX_ROW} chars. ` +
        'Move the detail into the owning plan/research/triage doc and keep the rollout row to one pointer line (id | title | state | owner | plan link).'
    }
  }));
  process.exit(0);
});
