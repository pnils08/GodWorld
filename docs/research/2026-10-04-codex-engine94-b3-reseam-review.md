---
title: engine.94 B.3 grudge seed reseam review
created: 2026-10-04
updated: 2026-10-04
type: reference
tags: [engine, civic, draft]
sources:
  - docs/plans/2026-07-31-citizen-memory-perception.md — B.3 proposed cut
  - docs/plans/2026-10-04-school-board.md — active civic.43 election contract
  - phase05-citizens/updateCivicApprovalRatings.js — active demotion path
  - phase01-config/godWorldEngine2.js — both Cycle paths
  - phase05-citizens/bondEngine.js — bond creation and deduplication
pointers:
  - "[[../plans/2026-07-31-citizen-memory-perception]] — owning engine.94 plan"
  - "[[../plans/2026-10-04-school-board]] — conflicting civic.43 election plan"
---

# engine.94 B.3 grudge seed reseam review

**Verdict: HOLD.** The proposed seating block is the right producer for a grudge caused by an approval-drop demotion. The proposed removal of both calendar-election calls conflicts with the active, builder-approved school-board plan, and the one-fire bench fixture does not force a demotion. Resolve the election contract and tighten the bond and proof gates before cutting or benching this change. This is repository and local-test evidence; the live/bench office counts in the B.3 plan were not re-read from Sheets.

## Numbered findings

1. **Correct seam for an approval-drop loss; not the only current seat-changing seam.** The v1.5 header says a campaign begins below 40 and the challenger seats below 20 without a window (`phase05-citizens/updateCivicApprovalRatings.js:41-43`). In the live loop, the campaign is parsed or picked before `shouldLeaveOffice_`, and `seating = leaving && campaign` (`:748-769`); that branch writes Holder, PopId, VotingPower, approval reset, departure and `CIVIC_DEMOTION` (`:811-878`). Both Cycle paths load bonds before ApprovalRatings and run Bonds afterward (`phase01-config/godWorldEngine2.js:587-625,2265-2303`); `bondExists_` can scan the loaded array before the key set exists, and `createBond_` appends to it (`phase05-citizens/bondEngine.js:1699-1717,2709-2737`). This is the right hook for that loss. Yet both Cycle paths still call `runCivicElections_` before approval (`godWorldEngine2.js:594,2272`), and it independently rewrites Holder/PopId and Election_Log (`phase05-citizens/runCivicElectionsv1.js:427-463`). Until that contract is resolved, the approval branch is not the only active seating seam.

2. **Blocking cross-plan conflict on retiring the calendar election.** B.3 proposes removing both `Phase5-Elections` calls (`docs/plans/2026-07-31-citizen-memory-perception.md:251-255`). The active civic.43 plan explicitly approved seven *elected* board seats split across groups A/B, names the calendar engine as their election path, and requires the first board-group election to seat or re-seat a member (`docs/plans/2026-10-04-school-board.md:18-29,39-49`). Removing the calls would eliminate that scheduled turnover and the only runtime writer of `Election_Log` (`phase05-citizens/runCivicElectionsv1.js:63-75,140-155,448-463`; `phase01-config/godWorldEngine2.js:594,2272`). `S.electionResults` has no production JS reader in the searched active phase/utilities/scripts tree, but the tab is still read for recent cycle-packet results (`phase10-persistence/buildCyclePacket.js:1472-1502`), dumped for civic beats (`scripts/dumpBeatTabs.js:73`; `scripts/buildCivicDomainSlice.js:257-277`), and included in rollback (`utilities/cycleRollback.js:55,276`). Those readers tolerate a static tab, but the civic.43 acceptance would become impossible. The owner needs a ruling that reconciles engine.94 and civic.43 before either call is removed.

3. **Deletion is the cleaner end state if the election really is retired; a header alone leaves a trap.** With the calls removed, a retained runnable `runCivicElections_` still advertises an active Phase-5 election in its header (`phase05-citizens/runCivicElectionsv1.js:22-43`), while the existing unit harness directly executes it and would keep proving the dead B.3 path (`scripts/civicApprovalCeiling.test.js:644-694`). Deleting it requires more than moving B3.1-B3.9: D1/D2 read election-only source and assert its penalty/reset (`scripts/civicApprovalCeiling.test.js:57-58,183-190`), and `scripts/auditRemainingHeaders.js:50-56`, `docs/engine/ENGINE_MAP.md:126`, `docs/SPREADSHEET.md:242`, plus the civic.43 plan still attribute live behavior to that file. If the owner rules calendar elections retired, delete the source with the test, schema-audit mapping, and active-doc updates in one reviewed cut; retain the historical Election_Log tab and its readers. If the owner retains calendar elections, keep the file and make the B.3 bond behavior cover both valid loss paths under an explicit collision rule.

4. **The approval-20 bench fixture does not guarantee a loss in one fire.** The seat starts at 20, while `shouldLeaveOffice_` requires *new* approval below 20 and then either prior approval at least 20 or owned silence (`phase05-citizens/updateCivicApprovalRatings.js:1180-1185`). The writer computes `newApproval` from initiative deltas plus a target-level pull (`:575-649,671-702`); the seeded inertia is 0.2 toward base 50 before city terms (`phase01-config/engine94SheetContract.js:125-129`). A zero or positive net delta leaves the seat in office; a rebound can raise it. Even if it drops, a same-fire campaign needs `pickCampaignChallenger_` to return someone (`updateCivicApprovalRatings.js:751-758`), and the out-of-town fallback explicitly returns null until a later Cycle (`:1490-1503,1547-1580`), producing a vacant departure instead of a bond. A prior campaign note does persist through recovery (`:783-785,1187-1229`), so the plan is right that there is no implemented incumbent-win resolution, but its blanket “campaign ends only in a seating” is too strong for blocked statuses (`:285-325,564-573`). Bench proof needs a controlled eligible tracked challenger or valid existing campaign, a measured drop below 20, an initially unbonded pair, and read-back of the office row, bond master/log, hook, and Engine_Errors. One fire is sufficient only after those preconditions are proven.

5. **The proposed POPID guard is too weak for a canonical bond.** B.3 uses `/^POP-/` for each id and does not require distinct ids (`docs/plans/2026-07-31-citizen-memory-perception.md:255`). A campaign parsed from Notes accepts `POP-` plus any digit count and is not re-resolved against `ctx.ledger` (`phase05-citizens/updateCivicApprovalRatings.js:1193,1216-1219`); an office PopId may also be stale. `bondExists_` checks only the pair, and `createBond_` does not validate citizenship (`phase05-citizens/bondEngine.js:1699-1717,2709-2737`). `normalizeBondCitizenId_` passes unknown values through (`phase05-citizens/bondPersistence.js:194-219`). Require exact canonical POPID shape, two distinct ids, and both rows present in the shared ledger; resolve the incumbent hood from that row and skip with an explicit reason if unavailable. Test malformed, stale, self-pair, and pre-existing-bond cases on the approval path.

6. **A failed bond load can turn a new seed into a partial master replacement.** `loadRelationshipBonds_` clears `S.relationshipBonds` before reading the sheet (`phase05-citizens/bondPersistence.js:111-123`); `safePhaseCall_` logs a failure and continues (`phase01-config/godWorldEngine2.js:159-169`). If that load fails and the approval hook adds a bond, `createBond_` makes the in-memory array nonempty (`phase05-citizens/bondEngine.js:2728-2737`), so the zero-bond wipe guard no longer applies and Phase 10 can queue a replacement master containing only the partial set (`phase05-citizens/bondPersistence.js:244-289`; `phase01-config/godWorldEngine2.js:786-787,2455-2456`). This hazard also applies to the current calendar hook, but moving it into the every-Cycle approval writer makes it part of B.3's proof. Require a successful bond load before creating a grudge or fail the dependent write path; test the load-failure case.

## Validation and disposition

- `node scripts/civicApprovalCeiling.test.js`: 112/112 passed. Its B3.1-B3.9 cases execute the old calendar election directly (`scripts/civicApprovalCeiling.test.js:644-694`); they do not prove the proposed approval reseam or bench fixture.
- No engine code, plan, tests, Sheets, or `SESSION_CONTEXT.md` were changed. The report is the only requested artifact. No commit or deployment was made.

## Changelog

- 2026-10-04 (codex) — Adversarial B.3 reseam review filed for engine-sheet.

## Addendum — 2026-10-04 (codex)

7. **`departure.grudgeBond` is not a civic-desk handoff by itself.** The proposed field would enter `approvalTriggers` and `S.officeDepartures` (`phase05-citizens/updateCivicApprovalRatings.js:849-861,1002-1004`), but the searched active phase/utilities/scripts code has no reader of either array outside this writer. The persisted `CIVIC_DEMOTION` story hook is a separate object and currently contains no bond id (`:862-878`). The old `results[].grudgeBond` is likewise only tested through the direct calendar harness (`phase05-citizens/runCivicElectionsv1.js:497-508`; `scripts/civicApprovalCeiling.test.js:681`). Keep the bond id on the departure for local diagnostics if desired, but name and prove a persisted reader before claiming the civic desk can follow that field.
