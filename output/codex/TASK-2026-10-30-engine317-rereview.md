# TASK — re-review engine.317 (engine-sheet, 2026-10-30) — LAST ROUND

Round 2 of 2. Your round 1: `docs/for-claude-review/2026-10-30-codex-engine317-review.md` (HOLD, F1–F4). Fold: `1e8d125f`.

| F | Where | Claim to check |
|---|---|---|
| F1 | `utilities/webTrigger.js` `readFireAdmission_`, `doGet` top | `action=admission` is answered before the fire path's try, by its own try; a failed read returns only `{ok:false, error}` |
| F2 | same; `output/engine-sheet/2026-10-30-e317-door.js prod-nofire`; push script | a read key equal to the fire key is refused; the push confirms PROD has no fire key before the push and at every later read (live probe 2026-10-30: `noFireKey:true`) |
| F3 | door reader | HTTP 200 required; `startedMs <= now + 5 min` |
| F4 | `output/engine-sheet/2026-10-30-push-e317-prod.sh` | door reads after the pull-back, +8, +16 on the pinned deployment (`DOOR_EXPECT_DEP`), valid + Cycle done + byte-identical; the before-push door read is impossible for this push only (stage 32 has no door) — every later push template reads it at all four points |

Tests: `scripts/cycleCheckpointWiring.test.js` 108/0. Bench on `1e8d125f`: `output/engine-sheet/2026-10-30-e317-bench.log` (round-1 candidate's log kept as `…-bench-3b746f0c.log`), manifest `stage33-e317.sha256`.

Hunt: does each fold close the failure, or move it; any new path. Scope: read-only plus your review file; no web-app call, Sheet or deploy. Write `docs/for-claude-review/2026-10-30-codex-engine317-rereview.md` (file:line + input → wrong output; SHIP / SHIP-WITH-FIXES / HOLD), commit it alone.
