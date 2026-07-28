#!/usr/bin/env node
// PreToolUse guard (S286, Mike-direct):
//  - ROLLOUT_PLAN.md is a pointer index — deny table rows > MAX chars
//    (detail belongs in the plan/research/triage doc the row points to).
//  - docs/plans/** changelogs are one-line entries — deny dated changelog
//    bullets (- YYYY-MM-DD …) > MAX chars (SCHEMA §12: date + one-line what-changed).
const MAX = 300;

let raw = '';
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const fp = (input.tool_input && input.tool_input.file_path) || '';
  const text = (input.tool_input && (input.tool_input.new_string ?? input.tool_input.content)) || '';
  const lines = text.split('\n');

  let fat = 0, reason = '';
  if (fp.endsWith('docs/engine/ROLLOUT_PLAN.md')) {
    fat = lines.filter(l => l.trimStart().startsWith('|') && l.length > MAX).length;
    reason = `ROLLOUT is a pointer index — ${fat} row(s) exceed ${MAX} chars. ` +
      'Move the detail into the owning plan/research/triage doc and keep the rollout row to one pointer line (id | title | state | owner | plan link).';
  } else if (/\/docs\/plans\/[^/]+\.md$/.test(fp)) {
    fat = lines.filter(l => /^\s*-\s*20\d\d-\d\d-\d\d/.test(l) && l.length > MAX).length;
    reason = `Plan changelog entries are one line — ${fat} dated entry(ies) exceed ${MAX} chars. ` +
      'A changelog line is date + what-changed (SCHEMA §12); running detail belongs in the plan body/task sections, not the changelog.';
  }

  if (!fat) process.exit(0);
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  }));
  process.exit(0);
});
