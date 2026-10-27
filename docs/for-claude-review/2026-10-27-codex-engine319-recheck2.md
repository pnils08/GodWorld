# engine.319 final look — codex, 2026-10-27

Source and saved-receipt review of the named fold only (`4198e46a`, push script at HEAD); no test, bench, clasp, Sheet, cron, model, or canon run.

## 1. §1 fold — FIX

- Queue-order `pvMints` correctly exempts an invalid-clock repeat after an earlier mint; the new `Nova Repeat` test checks one mint and both rows cleared (`phase05-citizens/processAdvancementIntake.js:797-807,1167-1168`; `scripts/householdIntake.test.js:415-425`). The restored guard also stops the later invalid row after a same-name family refusal before `nextPopIdLocked_` (`processAdvancementIntake.js:921,955-963`); the `Fay Drip` test checks that one case (`householdIntake.test.js:426-437`).
- **The partial-queue failure remains:** put a valid, distinct mint before `Fay Drip` in that test. Pre-pass marks the first family row's name, skips the later `Gaem` repeat, then the loop pushes the distinct mint, refuses the family row, and throws on the repeat. The clear happens only after the whole loop and log flush, so the earlier mint remains in shared ledger rows with its queue row uncleared (`processAdvancementIntake.js:803-807,921,955-960,1167-1168,1203-1227`). The new test has no preceding mint and does not pin queue atomicity (`householdIntake.test.js:427-437`).
- A single invalid-clock family row whose spot is closed is also a **non-minting false refusal**: the pre-pass throws before the family check, and the restored guard sits before the `!famStill` skip (`processAdvancementIntake.js:803-807,921,949-960`). No invalid clock reaches a POPID, but “only would-mint rows are refused” is still false.

## 2. §4 fold — FIX

- The added header and `led.length > 1000` checks reject empty queue/ledger values reads before recording a baseline (`output/engine-sheet/2026-10-26-push-e319-prod.sh:52-62`; `lib/sheets.js:53-59`). This fixes the prior empty-read gate.
- “Any old-version run ... so the queue hash moves” is too broad. Queue cells clear only after the entire body and `log.flush`; a throw can leave them intact (`processAdvancementIntake.js:1203-1227`). A manual intake run can also update usage/ledger cells while processing zero queue rows, leaving both the queue hash and ledger row count unchanged (`processAdvancementIntake.js:147-187,203-235,613-647,710-714`; `push-e319-prod.sh:57-63`). A same-pass append then clear need not change the values returned by `getSheetData` (`processAdvancementIntake.js:170,187,1991,1226`; `lib/sheets.js:53-59`). Narrow the claim to pre-existing queue rows successfully cleared; the gate does not certify that no old-version invocation occurred.

Saved bench round 4 records B0c neutral equality, B3's corrected expectation PASS, and C2's one named error with no intake mint (`output/engine-sheet/2026-10-27-e319-bench4.log:30-32,60-65,81-98`); these are sandbox receipts, not PROD proof. **Final gate: HOLD PROD** on §1 and the overclaimed §4 gate. `FIRE_ADMISSION_JSON` / engine.317 remains the named exception for any PROD push; this review does not re-derive it.
