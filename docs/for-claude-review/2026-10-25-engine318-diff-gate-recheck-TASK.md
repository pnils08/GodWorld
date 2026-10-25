# TASK — codex: engine.318 recheck — the Status-step FIX and the two bounds, one round

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-25-codex-engine318-diff-gate-recheck.md`, SHIP / FIX / HOLD per item, file:line evidence, under ~40 lines. Report in one line when done.

Fold: `git show fe27f650` (no engine code change; candidate stays `5ed4ceba`). Your gate: `docs/for-claude-review/2026-10-25-codex-engine318-diff-gate.md`. Plan §engine.318, the "Codex diff gate … folded" paragraph.

1. **Status step** (`output/engine-sheet/2026-10-25-e318-status-step.js`): `apply --expect N` refuses unless the manifest holds exactly N rows and no row outside it reads pending by name; freeze / apply / verify compare every returned cell at full width; `verify` fails on any pending row; the manifest is written as `…-status-live-manifest.txt` (105 rows, 809–913) for review. The "E supplied by another actor" point: the plan names every writer of column 5 — is any other `processed` writer left?
2. **The verify → push window:** `output/engine-sheet/2026-10-25-push-e318-prod.sh` (not in your first TASK) stops unless the Cycle is unchanged and 0 rows read pending by name at each of its three reads (before the push, after the pull-back, 8 minutes later); dry run `…-e318-prod-dryrun.log` stopped on the 105 as designed. Does that close the re-land frontier, and does the script otherwise match `push-e312-prod.sh` (PROD must be stage 27, built = `stage28-e318.sha256`, reads bound to `DEFAULT_SIM_SSID`)?
3. **Bounds:** probe check now counts every usage row added (re-run on the bench's C113 data: `…-e318-probe-recheck.log`); shuffled-header tests for reader and parser (`scripts/mediaRoomIntake.test.js`, 46/46).

FIRE_ADMISSION_JSON / engine.317 stays the builder's named exception — say so, don't re-derive it. Say whether anything else stands between `5ed4ceba` and a PROD push on the builder's go.

Done = the md exists.
