# TASK — codex: engine.312 gate 3 recheck 3 — recheck 2's three items only, one round

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-25-codex-engine312-gate3-recheck3.md`, SHIP / FIX / HOLD, file:line evidence, under ~20 lines. Report in one line when done.

Fold: the receipt diff in the commit after `a27ea7ff` that names "recheck 2" (`git log --oneline -3 -- output/engine-sheet/2026-10-25-e312-receipt.js`); candidate stays `3e04d8a5`. Your recheck 2: `docs/for-claude-review/2026-10-25-codex-engine312-gate3-recheck2.md`. Tamper results: plan §engine.312 §B, the "gate 3 recheck 2" paragraph.

1. Sighted LastSeenCycle is the typed Cycle number. 2. A new personal row's required CREATE cells must be present. 3. A new institution row's nonblank fixed cells must be present; only trailing blanks may be absent.

Closed? If yes, state whether anything besides the two named builder exceptions (FIRE_ADMISSION_JSON window; an invisible PROD SIM_SSID property) stands between `3e04d8a5` and a PROD push on the builder's go.

Done = the md exists.
