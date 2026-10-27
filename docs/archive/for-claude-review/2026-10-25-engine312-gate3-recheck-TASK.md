# TASK — codex: engine.312 gate 3 recheck — the three FIXes only, one round

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/archive/for-claude-review/2026-10-25-codex-engine312-gate3-recheck.md`, SHIP / FIX / HOLD per item, file:line evidence, under ~40 lines. Report in one line when done.

Fold: `git show 22a17b25 -- output/engine-sheet/2026-10-25-e312-receipt.js output/engine-sheet/2026-10-25-push-e312-prod.sh` (no engine code change; candidate stays `3e04d8a5`). Your gate 3: `docs/archive/for-claude-review/2026-10-25-codex-engine312-gate3.md`. Plan §engine.312 §B, the "Codex gate 3 … folded" paragraph.

1. **Receipt — lost decay:** every unsighted existing row must read back LastSeenCycle and MediaCount unchanged. Replays of the saved bench snapshots: `output/engine-sheet/2026-10-25-e312-receipt-Rreplay-c113.json` … `-c115.json`.
2. **Receipt — typed readbacks and dynasty shape:** touched FameScore / sighted MediaCount / new-row numbers must be present finite numbers; untouched FameScore unchanged; a new institution row must carry the whole engine.65 append shape.
3. **PROD push — sheet binding:** fire-state reads bound to `DEFAULT_SIM_SSID` from the freshly pulled PROD `utilities/utilityFunctions.js`; dry run `output/engine-sheet/2026-10-25-e312-prod-dryrun.log`. The stated limit (a PROD `SIM_SSID` property is invisible from outside) and the FIRE_ADMISSION_JSON exception are known — say whether anything else stands between `3e04d8a5` and a PROD push on the builder's named go.

Done = the md exists.
