---
title: Codex engine.304 final recheck
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [engine, citizens, review]
sources:
  - docs/for-claude-review/2026-10-19-engine304-final-recheck-TASK.md
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md
pointers:
  - "[[plans/2026-10-08-engine-286-game-of-life-events]]"
---

# engine.304 final recheck — HOLD PROD

Read-only source/receipt review of the stage-13 candidate; no Sheet, Cycle, cron, model, or canon action. Local `engine304FamilyLottery` 59/59 and `citizenPage` 29/29 pass; these are bounded tests.

1. **Final gate §3 — SHIP corrected account.** The plan now identifies the C121 reader's `const` failure, its corrected re-read, and the limits of its checks (`docs/plans/2026-10-08-engine-286-game-of-life-events.md:531`). The cut-4 log independently records C121 fire PASS, released 0, `bad 0`, and `ofTheLate=1`; the C123 probe records a dead-linked arrival, `bad 0` (`output/engine-sheet/2026-10-19-e304c4-sitting.log:128-145`; `2026-10-19-e304c2-bench.jsonl:32-34`). These are sandbox receipts, not live proof; the earlier c2 rerun receipt is still the plan's account.
2. **Final gate §4 — FIX, still HOLD rollback.** The data script preimages, releases every `Status=Family` row without excluding dead anchors, marks pending `family-own-words` usage Processed, and reads back both tabs (`output/engine-sheet/2026-10-19-e304-rollback-data.js:26-53`). D11 therefore does not break its completed-Cycle Family-row handling; the plan reports 141 releases and one usage row proven on bench 1004 (`docs/plans/2026-10-08-engine-286-game-of-life-events.md:531`). But `checkEmergencePromotions_` appends a Family row to `Advancement_Intake1` before `processAdvancementRows_` runs (`phase05-citizens/processAdvancementIntake.js:167-184,1825-1869`). A partial Cycle can leave that queued row. The rollback never reads or preimages this tab, while stage 9 still accepts `MatchPopId`/`MatchType` and calls `wireFamilyMatch_` after mint (`25ee233c^:phase05-citizens/processAdvancementIntake.js:638-672,1012`). For a dead anchor this bypasses D11's dead-only arrival path. Gate: certify an empty Family arrival queue after quiescing writers, or handle queued rows with preimage and typed readback before the code revert; then recheck the rollback. No partial-Cycle rollback was proven.
3. **`ac5acf2a` cut-4 HOLD/FIX — SHIP source closure.** Orphan means no tracked parents or every tracked parent confirmed dead; traded-away is not dead (`phase05-citizens/householdFormationEngine.js:327-335,424-428`). A queued minor spouse is refused before `nextPopIdLocked_` (`phase05-citizens/processAdvancementIntake.js:858-873`). Wake archive fallback requires `ArchiveReason=deceased` and a present reason header (`lib/wakePerception.js:241-246`). C11 adds real orphan/arrival cases; the wake guard is checked only by a source-pattern test. The two changed Apps Script files match `output/engine-sheet/stage13-e304.sha256:55,60`.
4. **Agy review — SHIP, no additional PROD hold found.** §1's 0-index concern is answered by `heritageRank_(hTier)+1` (`phase05-citizens/processAdvancementIntake.js:2060-2062`); §5 names an uncalled archaeology helper (`phase05-citizens/runYouthEngine.js:420,586-644`). §2/§3 are builder-ruled rates; §4 Age 0 and §6 ledger ParentIds are fixed (`phase05-citizens/checkForPromotions.js:335-336`; `lib/wakePerception.js:297-301`); §8's duplicate-name guard is present (`phase05-citizens/processAdvancementIntake.js:1818-1824`). §7's asymmetric `wireFamilyMatch_` behavior predates this candidate and remains reported, not newly validated here.

**Final gate: HOLD PROD solely on the partial-Cycle rollback queue gap above.** Stage-13 bench and local tests do not prove live header, deployment, cron, or canon behavior.
