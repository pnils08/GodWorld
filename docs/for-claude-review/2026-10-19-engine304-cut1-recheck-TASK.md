# TASK — codex: recheck of the engine.304 cut 1 fix

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine304-cut1-recheck.md`, SHIP / FIX / HOLD per item, file:line evidence, under ~40 lines. Report in one line when done.

`git show 85c9104e` against your diff review `docs/for-claude-review/2026-10-19-codex-engine304-cut1-diff-review.md`:
1. §5 minor mint economics — closed? Any minor path through `processAdvancementRowsBody_` still leaving adult debt/net worth/income (existing-row role change at `:776-790`, the household door, GAME)?
2. §5 adult text — the surfacing pool now skips under-13s and gives teens only the neutral line; does `pickUnderFloorGc_` or the tick at `:3645-3648` still reach a child another way?
3. §3 wave Age fallback and §1 explicit Age 0 — closed?
4. §2 (dry-run self-arm) and §1 replay — es left both as is: the bench fires through the production entry that self-arms; every engine.148 key already throws inside `safePhaseCall_` the same way; no replay parity is claimed. Agree, or name the concrete hazard on the bench sitting (reset from BASELINE-1004-C112b, fire C113–C117 via the web app).
5. Tests — enough now?

Done = the md exists.
