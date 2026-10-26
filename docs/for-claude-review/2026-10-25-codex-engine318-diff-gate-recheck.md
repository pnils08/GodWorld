# engine.318 diff gate recheck — codex, 2026-10-25

Source and saved-receipt review only. No Sheet, clasp, bench, network, or test run. `fe27f650` changes tooling, manifests, tests, and the plan; no engine file changed. Candidate remains `5ed4ceba` (`git show fe27f650 --name-status`; `docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:197`).

## 1. Status step — SHIP (tooling; live apply still pending)

- `output/engine-sheet/2026-10-25-e318-status-step.js:25,47-75` freezes every returned cell, refuses `apply` unless `--expect N` equals the manifest length, frozen other-pending count is zero, row count is unchanged, and every current full-width row equals the freeze. `:81-95` compares every cell with type on verify and exits nonzero for any row pending by name.
- Saved live freeze is **912 rows, width 6, 105 manifest rows 809–913, 807 already Status processed, 0 other pending, 0 cells past F, not applied** (`output/engine-sheet/2026-10-25-e318-status-live.json:1`). The 105 rows in `…-status-live-manifest.txt:2-106` match the JSON manifest cell for cell; the text manifest is for review, while apply reads the JSON (`status-step.js:55-57,63`).
- No other repository writer of E=`processed` was found: the retired Node writer supplied blank Reporter (`13e6502f^:scripts/editionIntakeV3.js:405-419`); the old paste parser supplied blank Reporter and Status (`3e04d8a5:phase07-evening-media/parseMediaRoomMarkdown.js:466-494`); the stage-27 reader wrote `processed` to column 5 after usage output (`3e04d8a5:phase07-evening-media/mediaRoomIntake.js:353-357`). This supports the 105-row predicate, subject to the reviewed live preimage.

## 2. Verify → push window — FIX

- The script requires a fresh PROD pull equal to stage 27 and a built tree equal to `stage28-e318.sha256` (`output/engine-sheet/2026-10-25-push-e318-prod.sh:20-35`). Its three fire-state reads use the pulled `DEFAULT_SIM_SSID`, require the same Cycle, and require zero rows pending by name (`:25-29,36-60,72-78`). This follows `2026-10-25-push-e312-prod.sh:20-39,40-62,74-80` with the added intake check. The saved dry run stopped at 105 pending rows before push (`…-e318-prod-dryrun.log:1-5`).
- Three point reads do **not** close the re-land frontier. `processMediaIntakeV2` can run manually without advancing the Cycle (`phase07-evening-media/mediaRoomIntake.js:108-117,141-149`). A row can be added after the first read, processed by an in-flight stage-27 call that marks E (`3e04d8a5:phase07-evening-media/mediaRoomIntake.js:353-357`), then processed by stage 28 that marks F (`phase07-evening-media/mediaRoomIntake.js:293-306,357-361`) before the second read. Cycle remains unchanged and pending returns to zero, while `Citizen_Media_Usage` has two rows. Quiesce intake writers and executions across the handoff, including old in-flight calls, or add an equivalent enforceable gate; the current script alone cannot prove it.

## 3. Bounds — SHIP (bounded)

- Probe check now requires **one total** new usage row as well as one media-room row (`output/engine-sheet/2026-10-25-e318-probe.js:55-65`); saved C113 recheck reports 1/1 and PASS (`…-e318-probe-recheck.log:1-2`). Shuffled-header reader and parser assertions are present (`scripts/mediaRoomIntake.test.js:149-155`); the plan reports 46/46 (`docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md:197`). This review did not rerun tests or the bench.

**Final gate: HOLD PROD.** The remaining new gate is the unclosed intake handoff window, followed by the authorized live `apply --expect 105` / typed `verify` on the reviewed preimage. `FIRE_ADMISSION_JSON` / engine.317 remains the builder's named exception; this review does not re-derive it. No further engine-code defect in `5ed4ceba` was found in this recheck.
