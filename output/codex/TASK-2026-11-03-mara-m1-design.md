# Review the Mara design (civic.47 Task M1) before any build

Read-only: edit no code, commit nothing, push nothing. Write one file:
`docs/for-claude-review/2026-11-03-codex-mara-m1-design-review.md` — first line `VERDICT: PASS` or `VERDICT: HOLD`, then findings (severity, file:line, input → wrong output).

The design: `docs/plans/2026-10-31-civic-autonomy.md` lines 238–273 (§M1), committed at `b78ced264`. It builds on your review `docs/for-claude-review/2026-11-02-codex-mara-directive-review.md`. Builder direction and answers, verbatim: the plan's Changelog, entries dated 2026-11-02 and 2026-11-03 about Mara. No code has changed.

Check the design against the code, not just its prose:
1. Does each numbered item work on the current code paths it names (`runDirective` and helpers in `scripts/cron-civic-run.js`, `loadConfrontations`/`boardRowsFor` in `scripts/buildCivicOfficeSlice.js`, `openRouterToolLoop`/`execOpenRouterTool` in `scripts/cron-desk-writer.js`, `lib/supermemory.js` search/add, `lib/citizenPage.js`, `scripts/buildInitiativePackets.js`, `scripts/civicProblemContinuity.js`, `scripts/cron-civic-gate.js`)? Name what it misses or breaks.
2. The `## Not directing` section against every reader that splits the directive on `## ` — is the parse-out-first rule enough?
3. The promise record: is the substring-against-source check sound given the actual shape of Sunday voice files and weekday datawake files (`output/civic-voice/`, `output/cron-civic/datawake/`)? Speaker identification?
4. Project directors as addressees: does their output (projects stage) give a readable answer next week? Anything in their packets or RULES that would turn a Mara block into a forced-move frame again?
5. Model and cost: `openai/gpt-6.1-sol` with tools through OpenRouter; the friction rule and gate family logic; the per-run cost of a tool loop that resends full inputs each turn at 8 calls. Give a cost range from real input sizes (C114 files).
6. The confrontation change (§10): what each seat sees between deploy and the C115 directive; anything that breaks answer routing or the readings' hood inference.
7. Any place the design would put out-of-world material (the builder, the `mara` container's Owner entries) in front of a cron.
8. Anything in the design that still forces a crisis or must-act frame.

Do not pick between alternatives the builder has not asked about; report defects and gaps.
