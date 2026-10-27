---
title: engine.301 F1 bench to PROD gate 3
created: 2026-10-25
updated: 2026-10-25
type: reference
tags: [engine, draft]
sources:
  - docs/archive/for-claude-review/2026-10-25-engine301-diff-gate3-TASK.md
  - docs/archive/for-claude-review/2026-10-25-codex-engine301-diff-gate2.md
---

# engine.301 F1 — Codex gate 3

**Final gate: HOLD for PROD.** The bench receipts and exact staged tree pass; the PROD script can declare a clean fire window after a C113 admission that failed without advancing the checked Sheet counters.

## Bench receipts — SHIP

- The receipt reads exactly one C and C−1 carry row, validates object/spike/wave shapes and both-Cycle wave membership, then checks measured rises against the capped carried spikes and holds on Engine_Errors (`output/engine-sheet/2026-10-25-e301-receipt.js:42-76,96-117,150-158`). The log reports PASS at every P and S fire (`output/engine-sheet/2026-10-25-e301-bench.log:19-22,32-81`). Scope: the JSON `cycle` stamp is Number-coerced, so its numeric type is not enforced (`2026-10-25-e301-receipt.js:48`).
- P: the read-back post-probe Baylight index 22 becomes 28 at C113, a measured +6 carried with numeric magnitude/newValue and Baylight's wave name (`output/engine-sheet/2026-10-25-e301-crime-P-c112.json:1`; `2026-10-25-e301-crime-P-c113.json:1`; `2026-10-25-e301-receipt-P-c113.json:18-39,46-51`). Fruitvale reads level 3, 18 Phase-5 citizen lines and its level-3 Ripple receipt at C113 (`2026-10-25-e301-receipt-P-c113.json:42-56,77-87`); Baylight reads level 3, 2 lines and its receipt at C114 (`2026-10-25-e301-receipt-P-c114.json:92-95,112-134`). P's two-Cycle window has no missing/held receipts or Engine_Errors (`2026-10-25-e301-receipt-P-c114.json:136-150`). P is an intervention, not a rate sample (`2026-10-25-e301-probe.js:47-55`).
- S: all 25 C113–C137 JSON receipts exist with matching Cycle/label, empty `hold` and `engineErrors`; the final window reports 25/25, 52 measured rises, 2 cap drops, 120 lines, 0 wave hood-Cycles, 0 Engine_Errors (`output/engine-sheet/2026-10-25-e301-receipt-S-c137.json:37-50`; `2026-10-25-e301-bench.log:32-82`). C127's 14 rises and 12 carried spikes show the cap in the organic leg (`2026-10-25-e301-receipt-S-c127.json:12-107`). The restore pushed/pulled the stage-25 code and compared its manifest byte for byte (`2026-10-25-e301-bench.log:83-89`; `2026-10-25-e301-bench.sh:54-56`). Zero organic waves is the measured rate for the builder.

## PROD tree — SHIP; fire window — HOLD

- The two candidate file hashes from `1e6beff5` match `stage26-e301.sha256`; compared with `stage24-e315-G3.sha256`, the 167-file manifest changes only `applyCityDynamics.js` and `finalizeCycleState.js` (`output/engine-sheet/stage26-e301.sha256:8,110`; `stage24-e315-G3.sha256:8,110`). The bench pull-back matched that manifest (`2026-10-25-e301-bench.log:2-6`). The PROD script pins the manifest, checks fresh PROD against stage 25, compares both preimages, checks the built tree and pull-back, and pins the served deployment (`output/engine-sheet/2026-10-25-push-e301-prod.sh:14-30,51-64`). Its stage-25 predecessor uses the same push/deploy and fire-state sequence (`2026-10-25-push-e315-prod.sh:18-67`). No alternate source tree can pass those hash gates.
- **HOLD — missed admission.** `fire_state` reads only World_Config, Neighborhood_Map, Riley_Digest and checkpoint A1 before push, after pull-back and 480 seconds later; it never reads the engine's `FIRE_ADMISSION_JSON` (`2026-10-25-push-e301-prod.sh:31-49,65-68`). Admission records C113 as `running` before the world body; a failed or unpersisted fire can leave `cycleCount` at 112 and a `failed`/`unpersisted` record (`phase01-config/godWorldEngine2.js:343-345,376-438`). If such a fire starts across the deploy and ends before the last snapshot, all three Sheet checks can pass and the script writes DONE despite the admission. The eight-minute delay cannot detect a completed failed admission. Add a typed same-project admission-record read to the pre/post/window gate and refuse any C113 admission across it; then re-run the guarded check at actual push time. The 04:4x dry run is a past snapshot, not that proof.

This review did not deploy, fire a Cycle, or read live Sheets. Bench proof does not establish a served PROD version or live C113 behavior.
