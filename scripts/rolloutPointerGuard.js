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

  let fat = 0, reason = '', context = '';
  if (fp.endsWith('docs/engine/ROLLOUT_PLAN.md')) {
    // Same budget as docLoopStatus --lint: the ITEM cell (between the id and the
    // state token) is ≤ ITEM_BUDGET; the pointer cell is not counted (2026-10-07 —
    // a whole-line cap denied rows the lint passed).
    const ITEM_BUDGET = 280;
    const STATES = new Set(['ready', 'in-progress', 'live-observing', 'done-pending-archive', 'blocked', 'needs-info', 'wontfix', 'parked']);
    fat = lines.filter(l => {
      if (!/^\s*\|\s*[a-z][a-z-]*\.\d+[a-z]?\s*\|/.test(l)) return false;
      const cells = l.split('|').map(c => c.trim());
      const s = cells.findIndex(c => STATES.has(c));
      return (s > 2 ? cells.slice(2, s).join(' | ').length : l.length) > ITEM_BUDGET;
    }).length;
    const generated = /<!-- generated: plans in motion/.test(input.tool_input && input.tool_input.old_string || '');
    if (generated && !fat) {
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: 'The plans-in-motion block is generated from the rows — edit the rows, then run node scripts/docLoopStatus.js --plans --write.' } }));
      process.exit(0);
    }
    reason = `ROLLOUT is a pointer index — ${fat} row(s) have an item cell over ${ITEM_BUDGET} chars. ` +
      'Move the detail into the owning plan/research/triage doc and keep the rollout row to one pointer line (id | item | state | owner | plan link).';
    context = 'Doctrine for this file: docs/engine/rollout-rules.md — row contract (§3: 5 cells, bare state token, item ≤280 chars), sections by what a row waits on, a waiting row names its Cycle or date (or starts `Organic:`), ids never reused. The plans-in-motion block is generated — never hand-edit it. Verify: node scripts/docLoopStatus.js --lint';
  } else if (/\/docs\/plans\/[^/]+\.md$/.test(fp)) {
    fat = lines.filter(l => /^\s*-\s*20\d\d-\d\d-\d\d/.test(l) && l.length > MAX).length;
    reason = `Plan changelog entries are one line — ${fat} dated entry(ies) exceed ${MAX} chars. ` +
      'A changelog line is date + what-changed (SCHEMA §12); running detail belongs in the plan body/task sections, not the changelog.';
    context = 'Doctrine for plan files: docs/engine/rollout-rules.md — plan changes log in the plan itself (one-line dated changelog entries), detail in the plan body/Status log, rollout row stays a pointer. New plans register in docs/index.md same commit.';
  }

  if (!fat) {
    if (context) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: context
        }
      }));
    }
    process.exit(0);
  }
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  }));
  process.exit(0);
});
