# engine.318 diff gate recheck 4 — codex, 2026-10-25

Source and saved-receipt review only; no live run. `f19a19fe` changes the push gate/watch, Status step, tests/receipts and plan; engine candidate remains `5ed4ceba` (`git show f19a19fe --stat`; `docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:203`).

## 1. Propagation watch — HOLD on the unproved bound

For the documented **~5-minute** old `/exec` window, a stage-27 call admitted at cut+4:50 must end by cut+10:50 under the 6-minute Apps Script wall; the fourth read is at least cut+16:00. That closes my earlier concrete sequence under this premise (`docs/reference/DEPLOY.md:33`; `docs/plans/2026-07-31-platform-ceiling-resilience.md:20`; `output/engine-sheet/2026-10-25-push-e318-prod.sh:115-130`).
But `DEPLOY.md:33` reports an approximate wait and two stale-version observations, not a maximum time when `/exec` stops admitting stage 27. The listing/pull-back check does not establish that maximum (`output/engine-sheet/2026-10-25-push-e318-prod.sh:118-124`). A stage-27 web Cycle admitted at cut+10:30 could still be before Phase 10 at the cut+16 read, then process a row parsed just after it in Phase 11; stage-28 manual intake could read its blank F afterward (`phase01-config/godWorldEngine2.js:868-879`; `3e04d8a5:phase07-evening-media/mediaRoomIntake.js:289-300,353-357`; `phase07-evening-media/mediaRoomIntake.js:293-306,357-361`). This is conditional on longer propagation, which the cited guide does not rule out. A hard bound of **at most 600 seconds from the version cut to the last possible old-version admission**, plus the 360-second execution wall, would satisfy this 960-second post-pull-back watch; alternatively enforce no old-version admissions and drain them before the last read.

## 2. Usage prefix — SHIP, for persistent row changes

The first valid read records a hash of all usage rows; later reads require total ≥ first total, byte-equivalent JSON of that first-row prefix, and unchanged `media-room` count (`output/engine-sheet/2026-10-25-push-e318-prod.sh:87-99`). A cleaner pass that rewrites processing flags at the same count now fails even when baseline `media-room` is zero; a dedupe that lowers total fails too (`scripts/cleanCitizenMediaUsage.js:163-183,249-268`; `output/engine-sheet/2026-10-25-e318-prod-dryrun2.log:3`). This is a point-read comparison, not a history of writes later restored byte-for-byte.

## 3. Freeze shape — SHIP

Before either `apply` or `verify`, the guard requires integer width ≥6, `tab.length === rows`, each row at that width, and each in-range manifest row equal to its frozen tab row; `apply` cannot reach its batch write with my truncated-tab example (`output/engine-sheet/2026-10-25-e318-status-step.js:63-82`). The saved live freeze has 912 rows/tab rows, width 6 and 105 matching manifest rows (`output/engine-sheet/2026-10-25-e318-status-live.json:1`).

## 4. Proof — SHIP, bounded

Saved gate log reports 19/19, including a changed prefix, append-only prefix, and truncated freeze; H1 exercises `verify`, while the same shape guard precedes `apply` (`output/engine-sheet/2026-10-25-e318-gate-test.js:41-52,62-85`; `output/engine-sheet/2026-10-25-e318-gate-test.log:1-21`). The live dry run shows stage-27 pull/stage-28 build and a valid 1,064-row usage read, then stops on 105 pending; it skips typed verify before apply and does not exercise the 16-minute watch (`output/engine-sheet/2026-10-25-e318-prod-dryrun2.log:1-5`; `output/engine-sheet/2026-10-25-push-e318-prod.sh:103-130`). The plan's 106 pre-apply verify failures remain plan-reported, not rerun here (`docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:203`).

**Final gate: HOLD PROD** on the missing hard propagation bound; items 2–4 close the named prior defects within their stated limits. `FIRE_ADMISSION_JSON` / engine.317 remains the builder's named exception, not re-derived here (`docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:205`). Once the bound is established and the builder gives the go: `live apply --expect 105` → `live verify` PASS → push. No new engine-code defect in `5ed4ceba` found.
