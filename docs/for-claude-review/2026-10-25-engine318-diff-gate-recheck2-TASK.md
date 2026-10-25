# TASK — codex: engine.318 recheck 2 — the intake handoff window fold, one round

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-25-codex-engine318-diff-gate-recheck2.md`, SHIP / FIX / HOLD per item, file:line evidence, under ~30 lines. Report in one line when done.

Fold: `git show 749b604f` (push script, gate test + receipts, plan; no engine code change; candidate stays `5ed4ceba`). Your HOLD: `docs/for-claude-review/2026-10-25-codex-engine318-diff-gate-recheck.md` §2. Plan §engine.318, the "Codex recheck … folded" paragraph.

1. **The window** (`output/engine-sheet/2026-10-25-push-e318-prod.sh`): every one of the three reads now also requires Citizen_Usage_Intake rows = the live freeze's row count (912, `…-e318-status-live.json`; the loader refuses a real run unless the freeze records its apply) and Citizen_Media_Usage rows with Source `media-room` = the first read's count. Does that close your §2 scenario (row added after a read, processed by an in-flight stage-27 call and again by stage 28 before the next) and every other path that lands a usage row twice across the handoff? Name any path left open.
2. **The count's premises:** (a) only the intake path writes Source `media-room` — the newsroom crons (`cron-desk-run.js:331`, `cron-saturday-run.js:595`, `ingestPublishedEntities.js`) append with no Source; (b) live has no Source column yet, so the gate reads 0 there and the intake reader's first write arms the header (`phase07-evening-media/mediaRoomIntake.js` engine.312 block) and makes it 1+; (c) the 480 s wait outlasts an in-flight Apps Script call. Hold or break each.
3. **Proof:** `…-e318-gate-test.js` runs the script's own gate text, extracted from the .sh, against bench 1004 with the one aim line swapped (`process.env.GODWORLD_SHEET_ID = P`); 7/7 in `…-e318-gate-test.log`. Live dry run `…-e318-prod-dryrun2.log` stopped on the 105 as designed. Is the extraction faithful, and does any case test the wrong thing?

FIRE_ADMISSION_JSON / engine.317 stays the builder's named exception — say so, don't re-derive it. Say whether anything else stands between `5ed4ceba` and a PROD push on the builder's go (`e318-status-step.js live apply --expect 105` → `live verify` PASS → the push).

Done = the md exists.
