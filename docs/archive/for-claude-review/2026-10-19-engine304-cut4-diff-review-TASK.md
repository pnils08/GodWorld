# TASK — codex: diff review of engine.304 cut 4 (D11, the dead keep their family)

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine304-cut4-diff-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~70 lines. Report in one line when done.

`git show 6cfd1555` against the plan's D11 + the D11 review fold (`docs/plans/2026-10-08-engine-286-game-of-life-events.md`) and your D11 plan review (`docs/research/2026-10-19-codex-engine304-d11-plan-review.md`).

1. `familyAnchorOf_` and its three call sites — same answer everywhere; `citizenArchiveLatestByPop_` header mapping and cache across Phase 5; a POPID present both on the ledger (Status deceased) and in the archive.
2. `wireFamilyToDeceased_` — only the arriving row written (the dead row untouched); widow / child / parent fields; the household join (another Active holder) and the no-household case; the minor-spouse guard; the call-site branch (`famDeadAnchor` per row — can it leak from one queue row to the next?).
3. Households — `deadParentSet_`, `livingOffcamParentSlots_`; the orphan test now "no living tracked parent" (FORMS_STATUS active/retired/recovering) — any existing minor whose behaviour changes (a minor already housed is skipped by `liveHH`?); the income pass max-slots rule; cost of the archive read inside the household pass.
4. Wake — the archive name fallback in `loadFamily` (read only when a family POPID is off the ledger); 'You're widowed — your late spouse was …'.
5. Tests C9/C10 — enough? The `engine302Marital` source-pattern edit — legitimate?

Done = the md exists.
