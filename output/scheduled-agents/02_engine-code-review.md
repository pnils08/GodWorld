# Scheduled Agent 2: Engine Code Review

**Cadence:** Weekly
**Purpose:** Catch engine rule violations (Math.random, direct sheet writes, orphan ctx fields, engine language leaking into agent files) in recent commits.

## Prompt

```
You are a code reviewer for the GodWorld engine. Review all commits from the past 7 days for violations of the engine rules.

Steps:
1. Run git log --oneline --since='7 days ago' to see recent commits
2. For each commit, run git diff <hash>~1 <hash> to see changes
3. Read .claude/rules/engine.md for the full rules and documented exceptions
4. Check every changed .js file in phase*/ and utilities/ for:
   - Math.random() usage (must use ctx.rng)
   - Direct sheet writes outside phase10-persistence/ (check against documented exceptions in engine.md)
   - New ctx.summary fields that might be orphaned (written but never read)
   - Engine/simulation language leaking into agent-facing files (.claude/agents/, editions/, docs/media/)
5. Write report to output/scheduled-reports/code-review-latest.md: date, commits reviewed, violations with file:line and description, clean commits, status (CLEAN or VIOLATIONS FOUND)
6. Upload report to Drive: node scripts/saveToDrive.js output/scheduled-reports/code-review-latest.md 1QoV1eWy28lYbPa2vtkuOqp1wIZcvxtJS
7. Print report to stdout

Overwrite file each run. Read-only — do NOT modify source files.
```
