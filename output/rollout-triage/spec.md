# Task: relevance triage of stale ROLLOUT rows (read-only research, one findings file)

You may write ONLY /root/GodWorld/output/rollout-triage/agy-findings.md. Edit nothing else. Do not commit, do not push, no network. Do not touch docs/engine/ROLLOUT_PLAN.md.

Context: docs/engine/ROLLOUT_PLAN.md is the open-work tracker (rows: `| id | summary | state | owner | pointer |`). These rows have had no substantive edit to their pointer doc in 60+ days. The builder wants open rows to be relevant to the CURRENT systems (today is 2026-09-29, canonical cycle C109). Rules for states: docs/engine/rollout-rules.md §3.

Rows to triage (23): governance.18, governance.26, governance.33, governance.34, governance.35, civic.13, pipeline.2, pipeline.8, pipeline.35, engine.7, engine.45, engine.51, engine.53, engine.5, engine.67, research.2, research.4, research.13, research.17, research.19, research.20, research.21, infrastructure.3.

For EACH row, do this and write one block:
1. Read the row and its pointer doc(s) (pointers are [[...]] links relative to docs/engine or docs/; resolve them).
2. List the concrete things the row/pointer says remain OPEN (scripts, tabs, functions, skills, crons it names).
3. Check each named thing against the live repo: does the file/function/skill/tab exist (grep scripts/, utilities/, phase*/, .claude/skills, .claude/agents, docs/engine/SHEETS_MANIFEST.md)? Was it changed since the pointer doc's last edit (`git log --oneline --since=<date> -- <file>`, max 3 lines)? Was the row's work delivered by a later commit or another row (search ROLLOUT_ARCHIVE.md and git log for the id and key terms)?
4. Verdict, exactly one: CLOSE-DELIVERED (the work shipped; cite commit or file), CLOSE-OBSOLETE (premise no longer true: cite what replaced it or what was retired), KEEP-CURRENT (still relevant, cite the live system it touches), RESCOPE (row is relevant but its title/state/owner/pointer is wrong: say the fix), UNSURE (say what you could not determine).
5. Evidence: 1-3 lines, each a repo path (with line number where possible) or commit hash. No claim without one. Do NOT guess from the row title; if you did not open the file, say UNSURE.

Format per row:
### <id> — <VERDICT>
- open items named: ...
- evidence: ...
- proposed edit: (new state/owner/pointer, or "none")

End with a table: id | verdict | one-line reason. Report in one line in the pane when done: how many of each verdict and anything you could not finish.
