# TASK — codex review: the job model (two commits, boot docs only)

**From:** research-build (S597). **Why:** the builder retired the rb-plans / es-builds split today and asked for an outside read before anyone works under the new text ("asking an AI to fix itself is a bad approach").
**Mode:** review only — do NOT edit tracked files, no commit, no deploy, no Sheet, no cron.
**Deliver:** `docs/archive/for-claude-review/2026-10-23-codex-job-model-review.md` — per question a verdict with file:line evidence; numbers, not adjectives.

## What to read

- `git show 3dcad5f0` — emotional tone removed from boot docs, rules kept.
- `git show 3d2da191` — the job model: `.claude/hooks/session-startup-hook.sh` §JOB MODEL (canonical text), `.claude/terminals/research-build/TERMINAL.md` (rewritten), `.claude/terminals/engine-sheet/TERMINAL.md` §Authority, `.claude/rules/research-build.md`, `docs/MODEL_HIERARCHY.md` status section.
- The tracker the text is supposed to govern: `docs/engine/ROLLOUT_PLAN.md` (177 lines, ~91 rows) and its contract `docs/engine/rollout-rules.md` + `scripts/docLoopStatus.js` (the lint).

## Questions

1. **Produce or describe.** Does the §JOB MODEL text, as a boot injection, change what a terminal does at its next boot — or does it only describe a wish? Name the sentence that binds and the sentence that does not.
2. **Builder's objection, verbatim 2026-10-23:** "the one job at a time is not really possible as every job creates jobs." The text answers with "a defect or idea surfaced mid-job becomes a ROLLOUT row, not a build." Is that answer enforceable against the actual ROLLOUT — count the rows by state (`live-observing` / `ready` / `in-progress` / `needs-info` / `blocked`) and by Terminal column, and say what a one-job-in-hand invariant would look like as a table rule (e.g. §3 Now holds ≤1 `in-progress` row per terminal) and what `docLoopStatus.js --lint` would need to check it.
3. **Dropped load-bearing text.** The retired split carried gates: codex SHIP before PROD (builder 2026-10-17), the bench gate, one unbenched change in flight, the no-amend rule, "never message a busy lane" (builder 2026-10-22). Does the new text still name each one at the place a terminal will read it? List any that fell out.
4. **Rows with two owners.** ROLLOUT has rows whose Terminal is `engine-sheet / research-build` or `research-build + engine-sheet`. Under one owner per job, what happens to them — count them and propose the rule.
5. **Boot size.** `wc -c` the files a research-build boot now loads (CLAUDE.md, identity.md, research-build.md, research-build TERMINAL.md, the hook's emitted block) before (`git show 3dcad5f0^:<path>`) and after. The builder's read: "boots and handoff docs are bloated in a way that doesn't always do what we need." Which remaining paragraphs do no work at boot?

Done = the review file exists.
