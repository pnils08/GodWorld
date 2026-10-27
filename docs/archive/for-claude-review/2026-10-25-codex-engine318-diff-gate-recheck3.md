# engine.318 diff gate recheck 3 — codex, 2026-10-25

Source and saved-receipt review only; no live run. `fe819c94` changes the gate, Status step, tests/receipts and plan, not engine code; candidate remains `5ed4ceba` (`git show fe819c94 --stat`; `docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:201`).

## 1. Intake receipt — SHIP, for the saved coherent freeze

Real push requires `applied`; all three `fire_state` calls require `live verify` exit 0 (`output/engine-sheet/2026-10-25-push-e318-prod.sh:34-40,93-101,117-119`). Verify checks row count, every returned cell's value and type, manifest Status and zero pending (`output/engine-sheet/2026-10-25-e318-status-step.js:83-97`). Saved live freeze has 912 tab rows = `rows`, width 6, 105 manifest rows (`output/engine-sheet/2026-10-25-e318-status-live.json:1`). A delete+append or `clearAllProcessedIntake` that merely restores the count cannot pass if the resulting intake cells differ; this is a point-in-time receipt, not a history of transient writes.

## 2. Usage read — FIX, partial closure

A malformed A–F header or empty read fails before a first-read record is saved; lower total or changed whole `media-room` rows fails subsequent reads (`output/engine-sheet/2026-10-25-push-e318-prod.sh:77-90`). This closes the prior malformed-as-zero case and a cleaner dedupe that lowers total. It does **not** exclude every cleaner rewrite: `cleanCitizenMediaUsage.js --apply` can reset processing flags and rewrite rows without removing one (`scripts/cleanCitizenMediaUsage.js:171-183,249-268`); with the saved live baseline of zero `media-room` rows, the unchanged total and empty-row hash pass (`output/engine-sheet/2026-10-25-e318-prod-dryrun2.log:3`; push script:83-90). This limit alone does not show double intake.

## 3. Status-step guard — FIX, latent malformed-freeze path

The integer `width >= 6` guard closes the NaN/no-compare bug; the current live freeze has width 6 and matching `rows`/`tab` length (`output/engine-sheet/2026-10-25-e318-status-step.js:63-67`; `output/engine-sheet/2026-10-25-e318-status-live.json:1`). But `apply` checks `now.length === F.rows` and compares only `frozen.map`, without asserting `F.tab.length === F.rows` (`status-step.js:68-77`). If a malformed freeze retains `rows=912` and the 105-row manifest but loses its last tab row, `apply --expect 105` can write F913 without comparing that row; later `verify` fails at its manifest assignment (`status-step.js:85-88`). The generated saved freeze is coherent; reject malformed freeze shape before any write.

## 4. Exclusion after last read — HOLD PROD

The deployment listing check and pull-back establish the version cut and bytes, but `/exec` can still serve the previous version for about five minutes after that cut (`output/engine-sheet/2026-10-25-push-e318-prod.sh:103-119`; `docs/reference/DEPLOY.md:18-33`). The 480-second watch begins after pull-back, so it need not outlast a 360-second call **admitted late in propagation** (`docs/plans/2026-07-31-platform-ceiling-resilience.md:20`).

Concrete reachable order: an operator calls the web Cycle at roughly cut+4:50 and `/exec` admits stage 27; at the final read roughly cut+8:00 it is still before Phase 10, so all three Sheet checks can pass. The operator then uses **Parse Media Room Markdown** to append a row; the old call reaches Phase 11, appends usage and marks column E `processed`; a later stage-28 **Process Media Intake** reads F blank, appends it again and marks F (`utilities/godWorldMenu.js:25-35`; `phase07-evening-media/parseMediaRoomMarkdown.js:480-499`; `phase01-config/godWorldEngine2.js:868-879`; `3e04d8a5:phase07-evening-media/mediaRoomIntake.js:289-300,353-357`; `phase07-evening-media/mediaRoomIntake.js:293-306,357-361`). Thus the last read does not prove both future entry points run stage 28. Require an enforced no-fire/no-intake handoff spanning propagation and the old-call wall, or a version-specific admission/readback gate.

## 5. Proof — SHIP, bounded

The saved log says 17/17; cases run the extracted Node gate against bench reads with altered expected baselines, and H invokes Status verify separately, not the real shell wrapper's combined live receipt (`output/engine-sheet/2026-10-25-e318-gate-test.js:11-20,37-76`; `output/engine-sheet/2026-10-25-e318-gate-test.log:1-19`). Live dry run confirms stage 27 pull, stage 28 build, valid usage header/1,064 rows/zero `media-room`, then stops on 105 pending; its typed verify is skipped because no apply is recorded (`output/engine-sheet/2026-10-25-e318-prod-dryrun2.log:1-5`). The 106 pre-apply live-verify failures are plan-recorded, not independently rerun here (`docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:201`).

**Final gate: HOLD PROD.** The propagation/admission sequence remains outside the last-read proof, and the malformed-freeze/cleaner limits above remain. `FIRE_ADMISSION_JSON` / engine.317 remains the builder's named exception; it is not re-derived here (`docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:203`). After closing the separate HOLDs and on the builder's go: `live apply --expect 105` → `live verify` PASS → push. No new engine-code defect in `5ed4ceba` found.
