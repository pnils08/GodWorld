---
title: engine.312 gate 3 — fold, re-bench, and PROD push review
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, draft]
sources:
  - docs/archive/for-claude-review/2026-10-25-engine312-gate3-TASK.md
  - docs/archive/for-claude-review/2026-10-25-codex-engine312-diff-gate2.md
  - docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md
---

# engine.312 gate 3 — `3e04d8a5`

**Final gate: HOLD for PROD.** The roster fix and saved re-bench clear their bounded checks. Receipt v2 can still pass a broken sighting marker or an untyped zero; the PROD fire-state read is not positively bound to the PROD Sheet. `FIRE_ADMISSION_JSON` remains the builder's named exception until engine.317, as already ruled at the engine.301 gate (`docs/archive/for-claude-review/2026-10-25-codex-engine301-gate3-recheck.md:14-19`).

## 1. Gate-2 fold — roster SHIP; receipt FIX

- **SHIP — personal roster/floor:** The `roster` POPID-first path and exact-name fallback now reject foreign links, `dynasty`, and `Institution`; the resolved-row floor uses the same predicate (`phase07-evening-media/culturalLedger.js:481-503,684-693`). The synthetic fixture covers same-name institutions linked to the citizen and unlinked, requiring two personal appends at 25 and no institution write (`scripts/sportsWeekCity.test.js:801-818`). This is focused fixture evidence, not a Sheet read.
- **SHIP — receipt improvements:** Its own coverage rule, name parser, and personal target are compared with candidate functions on observed inputs (`output/engine-sheet/2026-10-25-e312-receipt.js:27-53,86-113`). It takes sightings from the Cycle's `Riley_Digest.FamousPeople`, which `writeDigest_` copies from `S.famousPeople` before registration (`receipt.js:114-128`; `phase07-evening-media/buildEveningFamous.js:536-555`; `phase01-config/godWorldEngine2.js:2004-2005`), and checks MediaCount and sighted LastSeenCycle (`receipt.js:139-150,165-175`). It checks post-Famous Active personal rows, equal Cultural_Ledger headers, unique CUL-IDs, and pre + new row count (`receipt.js:74-85,129-132`). The saved stage-25 verification read matches the prior manifest (`output/engine-sheet/2026-10-25-e312-restore-verify.log:1`).
- **FIX — receipt can pass lost decay:** For an *existing* row with no digest sighting, it compares MediaCount but never requires LastSeenCycle to stay unchanged (`output/engine-sheet/2026-10-25-e312-receipt.js:139-150`). A broken roster/update that stamps C113 there, while writing the expected C113 FameScore, passes; C114 then reads that false recent sighting as its preimage and expects no decay. The writer's decay explicitly keys on LastSeenCycle (`phase07-evening-media/culturalLedger.js:298-316`). Check unchanged LastSeenCycle on every unsighted existing row, then re-run the receipt.
- **FIX — untyped zero can pass:** `Number(value) || 0` accepts a blank or malformed post FameScore as measured zero, including touched rows expected at zero (`output/engine-sheet/2026-10-25-e312-receipt.js:145-150,171-175`; actual zero expectations in `output/engine-sheet/2026-10-25-e312-receipt-R-c113.json:249-255,315-320`). MediaCount has the same coercion (`receipt.js:142,168-169`). Require finite, present numeric readbacks before comparison. A new institution is called an engine.65 append solely from its `FirstRefSource` text (`receipt.js:158-163`); the actual append also fixes RoleType, FameCategory, CUL-ID construction, and row shape (`phase05-citizens/generationalWealthEngine.js:3408-3422`). Its origin is not proven by that string alone.

## 2. Re-bench — SHIP as saved SANDBOX evidence

- The leg R log names candidate `3e04d8a5`, stage 27, and a byte-identical push pull-back against `stage27-e312.sha256` (`output/engine-sheet/2026-10-25-e312-bench2.log:1-7`). C113/C114/C115 fire return codes are zero and v2 receipts PASS: 71/1/0 pending, 3 digest sightings each, 5 Famous citizens each; C113 has 10 credits and one new row (`bench2.log:17-23`; `output/engine-sheet/2026-10-25-e312-receipt-R-c113.json:1-26`; `-c114.json:1-26`; `-c115.json:1-26`). The same run ends with the six-file stage-25 restore and matching pull-back (`bench2.log:24-30`; `output/engine-sheet/2026-10-25-restore-bench-stage25.sh:21-38`). These are saved bench receipts; this review did not fire or read a Sheet.

## 3. PROD script — staged tree SHIP; fire gate FIX/HOLD

- **SHIP — static build/target:** The script pulls the fixed PROD project, accepts only a stage-26 or stage-25 whole-tree hash, adds engine.301's two files from `1e6beff5` in the latter case, overlays the four `3e04d8a5` files, and requires the built tree to match the committed stage-27 manifest before push (`output/engine-sheet/2026-10-25-push-e312-prod.sh:13-33`). Push/deploy use that PROD stage and the pinned deployment, then compare a fresh PROD pull-back to the manifest (`:56-69`). No ordinary path shown here pushes a different built tree or targets bench 1004. The saved dry run reports stage 25 → stage 27 and C112 sheet-side state, then stops before push (`output/engine-sheet/2026-10-25-e312-prod-dryrun.log:1-4`). It is a prior snapshot, not a current fire-window read.
- **FIX — live Sheet identity:** `fire_state` rejects two sandbox IDs but accepts *any other* `GODWORLD_SHEET_ID`; the PROD Apps Script ID is fixed separately (`output/engine-sheet/2026-10-25-push-e312-prod.sh:15,23,35-39`). The env loader permits an alternate env file (`lib/env.js:14-23`). Thus a matching C112 mirror could satisfy all three checks while the script deploys PROD. Bind the fire-state reads to the verified PROD Sheet ID before claiming they guard this project.
- **HOLD — admitted/straddled Cycle:** The parameterized `CYC` and three reads check World_Config, Neighborhood_Map, Riley_Digest, checkpoint, and Engine_Errors before push, after pull-back, and eight minutes later (`output/engine-sheet/2026-10-25-push-e312-prod.sh:19,34-55,70-73`). They do not read `FIRE_ADMISSION_JSON`, so an admitted C113/C114 can straddle a push before those sheet-side indicators move; retain the builder's explicitly named engine.301 exception until engine.317. A C112 dry run does not prove a later C113 window (`docs/archive/for-claude-review/2026-10-25-codex-engine301-gate3-recheck.md:16-19`).

Source and saved logs reviewed only. No test, bench, clasp, model, Sheet, PROD, commit, or push action performed.

Correction (2026-10-25): `buildEveningFamous_` fills `S.famousPeople` before registration (`phase07-evening-media/buildEveningFamous.js:536-555`); Phase 10's `writeDigest_` then queues its copy (`phase01-config/godWorldEngine2.js:818,2004-2005`).
