# TASK — codex: engine.312 gate 3 recheck 2 — item 2 only, one round

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-25-codex-engine312-gate3-recheck2.md`, SHIP / FIX / HOLD, file:line evidence, under ~25 lines. Report in one line when done.

Fold: `git show a27ea7ff -- output/engine-sheet/2026-10-25-e312-receipt.js` (receipt only; candidate stays `3e04d8a5`). Your recheck: `docs/for-claude-review/2026-10-25-codex-engine312-gate3-recheck.md` item 2. Replays: `output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c113.json` … `-c115.json` (PASS); tamper results are in the plan §engine.312 §B "gate 3 recheck" paragraph.

1. `typed()` rejects whitespace-only text; touched / sighted / new-row numbers use it.
2. New personal rows carry the registrar's CREATE cells (FirstSeenCycle, LastSeenCycle when sighted, MediaSpread, Status, TrendTrajectory, CityTier).
3. New institution rows match every fixed cell of the engine.65 append (`phase05-citizens/generationalWealthEngine.js:3418-3422`).

Closed? If yes, say whether anything besides the two named builder exceptions (FIRE_ADMISSION_JSON window; an invisible PROD SIM_SSID property) stands between `3e04d8a5` and a PROD push on the builder's go.

Done = the md exists.
