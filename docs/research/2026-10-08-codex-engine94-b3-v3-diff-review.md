---
title: Codex diff review — engine.94 B.3 v3
created: 2026-10-08
updated: 2026-10-08
type: reference
tags: [engine, civic, citizens]
sources:
  - 8046a09b5db2b43d65daaf675e01a719b71fad7f
  - 8d0f458dce29ca71b06d8c544e066bc09dfb8b98
  - docs/plans/2026-07-31-citizen-memory-perception.md section B.3
pointers:
  - "[[plans/2026-07-31-citizen-memory-perception]] — owning plan and amended F1-F8 contract"
---

# Codex diff review — engine.94 B.3 v3

**Target:** `git show` of 8046a09b and 8d0f458d against B.3, including the 2026-10-08 correction, ruling, and Built reading. Source citations below refer to the tree at **8d0f458d**, unless another revision is stated.

**Result:** HOLD

**Verdict:** HOLD — the normal threshold, turnover, and HookText paths work, but the new guarantees do not cover invalid successors, the later GC promotion writer, or every header shape the bond loader certifies.

This was a local, read-only source review with in-memory probes. Only this requested review file was written; no implementation, tests, indexes, plans, handoffs, commits, deployments, or external state were changed. The inbox registration/landing belongs to the receiving Claude lane. Extensive pre-existing output dirt was left alone.

During review, another lane committed `b55c8e05`, changing the CIV literals and fixtures from `y/n` to `yes/no`. The final adversarial probes and 136-assertion run used the requested revision's approval source and test file supplied by `git show` through anonymous file descriptors. Supporting source files used by those probes were unchanged from 8d0f458d. This review does not silently include that follow-up in the requested pair.

## Findings

1. **P1 — F5 certifies a header shape that its reader cannot interpret, then permits destructive replacement.**

   `phase05-citizens/bondPersistence.js:59` trims header names when certifying the six required columns; `:172` builds the actual column map from untrimmed names. The load still sets `relationshipBondsLoaded = true` at `:207`. A header named ` CitizenA ` therefore passes certification, but `:185` loads every CitizenA as an empty string. The saver accepts the flag at `:261`, serializes that empty identity at `:302`, and queues a master replacement at `:323`. `utilities/ensureRelationshipBonds.js:267` also accepts the padded header, so the shared required-header list does not resolve the mismatch.

   **Reproduced:** start with the F5 FULL header, replace `CitizenA` with ` CitizenA `, retain one nonempty bond row, run the real loader and saver. Result: `{flag:true, citizenA:"", replaceIntents:1}`. This is a failed identity read presented as a certified load. The individual column lookup defect predates this cut; the new certification incorrectly blesses it.

   **Fix:** use one normalized header map for validation and decoding, or reject noncanonical headers before certification. Reject ambiguous duplicate normalized required columns. Assert the complete saved row, including both citizen IDs, for accepted header shapes; rejected shapes must log and queue no replacement.

2. **P1 — F2 consumes a GC row for other civic offices, but the later promotion phase can mint it again in the same Cycle.**

   `phase05-citizens/updateCivicApprovalRatings.js:1635` consults `ctx.civicGcTaken`; `:1675` reserves the row and `:1678` queues its `Emerged` cell for Phase 10. The normal schedule runs approval at `phase01-config/godWorldEngine2.js:595`, then promotions at `:615`, and executes intents only at `:815` (the second schedule has the same order at `:2272`, `:2292`, and `:2478`). `phase05-citizens/checkForPromotions.js:56` rereads the still-Active GC sheet; `:315` checks only its persisted status, and `:333` / `:472` allocate and append another citizen. Neither the lottery nor floor-wave selection at `:638` consults the civic reservation.

   **Reproduced:** reuse the existing B3v3 GC fixture with EmergenceCount 3, let approval name it at 35, then call the real `checkForPromotions_` before executing intents. With floor-wave quota 0 and the lottery draw forced to 0, the ledger contains the same fixture name twice: `POP-00504` at Tier 3 and `POP-00505` at Tier 4, while `civicGcTaken[1]` is already true. Economic derivation helpers and Sheet methods were isolated stubs; both selection/minting functions were real. This is a pre-existing cross-writer duplication route left open by the F2 repair.

   **Fix:** make the reservation visible to every GC promotion consumer that runs before persistence, including the floor-wave pool, while retaining the Phase-10 cell intent. Add an approval → promotions test asserting exactly one new ledger identity. B3v3.7 at `scripts/civicApprovalCeiling.test.js:721` covers two civic offices only; it cannot establish consumption across the fire.

3. **P1 — a campaign note authorizes seating without a valid, serving successor; the new F4 turnover can demote the only real holder.**

   `phase05-citizens/updateCivicApprovalRatings.js:1371` accepts `POP-` followed by any number of digits. `:893` decides seating solely from the threshold and a parsed note; `:943` passes its identity straight to `seatSuccessor`. The closure queues office cells at `:553-557` before `turnoverLedger_` looks up the successor. `:1328-1341` silently allows a missing successor, still clears the departed holder, and dirties the ledger. The exact-ID/both-row checks at `:1358-1363` protect only the bond. They do not protect the seat.

   **Reproduced:** change the existing named challenger's ledger Status to `deceased`, keep the note, and score approval 25. The writer seats that citizen, assigns CIV `y` and the office RoleType to the deceased row, clears the former holder, and creates a grudge. Existing B3v3.11 and .11b explicitly require the malformed `POP-800` and missing-row versions to seat (`scripts/civicApprovalCeiling.test.js:741-747`), so those passing assertions entrench the inconsistency. The note-trust behavior is inherited; this cut adds the inconsistent ledger demotion and promises synchronized turnover around it.

   **Fix:** resolve the named successor by canonical POPID before any bond, office, or ledger mutation; require a present row that can serve and is not the incumbent or a holder of another seat. Treat an invalid successor as unavailable and surface the reason. Preserve the no-stand-down rule for a valid challenger when approval recovers. Replace the malformed/missing-row seating assertions with assertions that no invalid holder or partial turnover is written.

4. **P2 — the new can't-serve fill path excludes its own already named challenger and can erase the nomination without seating anyone.**

   The corrected F1 deliberately preserves campaign occupancy (`docs/plans/2026-07-31-citizen-memory-perception.md:275`). `seedOccupiedPopIds_` reserves every campaign POPID at `phase05-citizens/updateCivicApprovalRatings.js:1388-1389`. The new retirement/death path calls the ordinary picker with that complete set at `:605`, without first checking the current office's note. The scorer rejects the named challenger as occupied at `:1496`. If nobody else qualifies, `:640-648` makes the seat vacant and strips the note.

   **Reproduced:** existing B3v3 incumbent and challenger, office Status `retired`, existing NOTE, empty GC pool. Result: Holder `TBD`, Status `vacant`, one new arrival queued, the qualified named challenger remains non-CIV, and the campaign note disappears. A second available candidate would instead replace the nomination. This is the untested intersection of retained F1 and new F3, not a failure to place F3 before the status gate.

   **Fix:** resolve the current office's valid named challenger first on the fill path; exclude only other offices' reservations when considering that candidate. Then use the normal fallback picker. Add retirement/death plus existing-note cases, including a sole available named challenger.

5. **P2 — F5's master-save guard works on a false flag, but “every bond write held” is an overclaim.**

   `phase05-citizens/bondPersistence.js:261-264` correctly holds `saveRelationshipBonds_`. However both schedules immediately call the independent history writer (`phase01-config/godWorldEngine2.js:785-786`, `:2453-2454`). `phase05-citizens/bondEngine.js:2745-2751` checks only whether bonds exist; `:2788` selects current-Cycle updates and `:2826` writes them directly to `Relationship_Bond_Ledger`. It never reads the flag. The intervening bond engine can still create bonds at `:301-309` after a failed load.

   **Reproduced:** with `relationshipBondsLoaded:false` and one isolated synthetic current-Cycle bond, the real history writer called fake-Sheet `setValues` once. Thus a rejected master load can leave history for bonds whose master save is held. This is an existing independent writer omitted from the new “all writes” claim, not a bypass of the actual master-replace guard.

   **Fix:** if F5 promises all bond persistence is held, apply the certificate to the history path too and test both scheduled writers together. If the intended guarantee is only master preservation, explicitly narrow the plan/comment/test claim and document the remaining history behavior. F5.5 at `scripts/civicApprovalCeiling.test.js:815-816` observes only the replacement spy.

6. **P2 — the tests invoke real producers, but do not establish several acceptance claims made for B3v3/F5.**

   B3v3's `fire` stubs cell/append intents and hook ripples (`scripts/civicApprovalCeiling.test.js:665-667`); `cell()` returns the last queued value rather than persisted Sheet state (`:682-687`). B3v3.4 checks `demo.description` and an in-memory property only (`:700-703`): it never calls `storyHookEngine_` or `saveV3Hooks_`, contrary to F6's saved-row test requirement at plan `:286`. F4's council-and-BOARD turnover requirement at plan `:284` has no BOARD turnover fixture in this section. The separate board approval assertion in `scripts/civicApprovalState.test.js:225` does not test seat or ledger turnover.

   B3v3.19's “next Cycle” call (`:776-777`) still uses the hardcoded Cycle 113 (`:675-677`) and rebuilds the original ledger; it carries only a note. F3's no-successor → persist → next-Cycle fill is represented by separate fresh fixtures at `:759-768`, not a persisted transition. The scoring fixtures omit neighborhood state, so the target/inertia branch at `phase05-citizens/updateCivicApprovalRatings.js:797-819` is inert. They do not prove F7's post-score bench condition.

   F5.3/.4 spy on `logEngineError_` (`scripts/civicApprovalCeiling.test.js:792`, `:808-814`), not an Engine_Errors row. F5.6 records only replacement tab and row count (`:794`, `:817-818`); it misses Finding 1's corrupted payload. These are useful unit assertions, but their labels exceed the evidence in places.

   **Independent positive check:** an in-memory probe of the real approval-produced demotion hook through real `storyHookEngine_`, roster matching, and `saveV3Hooks_` produced a CIVIC saved row whose HookText ended `(bond ssssssss)` and named a civic journalist. A separate BOARD demotion probe set successor CIV/RoleType, former CIV/RoleType, and a bond correctly. These establish the normal local paths; they do not add regression coverage to the repository or prove Sheets persistence.

   **Fix:** add saved-row assertions for the full F6 chain and F5 replacement payload; cover BOARD turnover, invalid successors, and the actual next-Cycle state transition. Keep bench/read-back claims separate from local spies. Add the specific regression cases in Findings 1–4 rather than merely increasing assertion counts.

7. **P3 — F8 removes the running election and its packet window, but documentation reconciliation is incomplete.**

   The named runtime deletions are present: both `Phase5-Elections` calls and `runCivicElectionsv1.js` are gone; `phase10-persistence/buildCyclePacket.js:134-142` no longer renders the window/countdown, and `:1370-1451` retains officials, vacancies, statuses, and historical Election_Log results. D2 asserts the schedule/source deletion at `scripts/civicApprovalCeiling.test.js:187-189`; the old election source load, D3, and election B3 block are removed. `scripts/auditRemainingHeaders.contract.test.js:93` now checks removal of the writer mapping. README, school-board acceptance, spreadsheet history wording, and generated stub maps were updated in 8d0f458d.

   Remaining drift: the edited `docs/engine/ENGINE_MAP.md:127` still states vulnerable `<30` / recall-pressure `<20`, while the writer uses 40/30 at `phase05-citizens/updateCivicApprovalRatings.js:998-1007`. B.3's own inventory promised retirement of the holiday plan reference (`docs/plans/2026-07-31-citizen-memory-perception.md:261`), but `docs/plans/2026-09-29-sim-holiday-calendar.md:155` and `:165` still instruct work on the deleted file. `docs/engine/ENGINE_COUPLING_MAP.md:273-279` also continues to describe its scheduled election as a verified engine path.

   **Fix:** reconcile these active instructions/maps or explicitly mark the historical descriptions superseded. Keep actual history intact. This is documentation incompleteness; no surviving scheduled election call was found in production code.

## Verified contract checks

| Contract | Evidence and disposition |
|---|---|
| Flat 30 line | **Matches the requested amended reading.** Plan `:277` expressly retires trajectory/silence clauses. `shouldLeaveOffice_` at `phase05-citizens/updateCivicApprovalRatings.js:1290-1292` is strictly `<30`; 30 itself stays. G1–G4 at `scripts/civicApprovalCeiling.test.js:312-321` test that boundary. No finding asks to restore the old 20 line or silence exception. |
| Retained F1 | Naming is `<40` at `updateCivicApprovalRatings.js:1295-1298`; notes, occupancy, and the campaign hook remain at `:871-936` and `:1381-1390`. B3v3.8b checks recovery above 40 without stand-down. Finding 4 covers the fill-path interaction. |
| F2 | Same-civic-pass reservation and the correctly addressed Status `Emerged` intent are present at `:1631-1637`, `:1675-1679`; the convention matches `processAdvancementIntake.js:2621`. Tier 3 checks persisted EmergenceContext plus `ctx.civicGcQueued` at `updateCivicApprovalRatings.js:1714-1723`, sets it after queuing at `:1746-1747`, and B3v3.6c verifies the repeated call. Finding 2 limits the broader per-fire claim. |
| F3 | Office/ledger retired or deceased and vacant handling at `updateCivicApprovalRatings.js:594-676` genuinely precedes `resolveApprovalCeilingLifecycle_` at `:679`; it continues before approval scoring. Fill starts at 50, no grudge; inability to serve without a successor makes a vacancy. Approval without a successor retains its holder at `:892-895`. |
| F4 | `turnoverLedger_` at `updateCivicApprovalRatings.js:1326-1342` updates present rows and dirties the ledger; minting now dirties it at `:1603`. `phase10-persistence/commitSimulationLedger.js:25-36` consumes that flag and queues the consolidated range. Missing-row safety remains Finding 3. The requested pair literally writes the plan's `y/n`; concurrent b55c8e05 changes this to `yes/no`, separately from this review. |
| F5 | False at loader entry (`bondPersistence.js:134`), true on valid header-only/full paths (`:164`, `:207`), shared six-header constant (`:55`; `ensureRelationshipBonds.js:262`), and false/absent flag holds the master saver (`bondPersistence.js:261`). Missing-header, ledger-schema, empty-tab, and never-loaded cases pass locally. Findings 1 and 5 qualify certification/all-writes claims. |
| F6 | Description suffix at `updateCivicApprovalRatings.js:968-969` → `phase07-evening-media/storyHook.js:1405` → saved HookText at `phase08-v3-chicago/v3StoryHookWriter.js:80` → civic reader at `scripts/buildCivicDomainSlice.js:289-294`. The independent real-function probe confirms the saved row shape. The transient `grudgeBond` property alone is not treated as persistence. |
| F7 | **Not verified by this review.** Plan `:275` amends the old F7 text to post-score `<30` with a named challenger already present. No bench, live Sheet read, deployment, or paid model call was run. Commit messages' live pre-build counts and full-suite/bench claims were not independently verified. |
| F8 | Runtime schedule, source, packet window, and designated tests retired; Election_Log history reader remains. Documentation gaps are Finding 7. Retaining the dead World_Config key and compileHandoff history column does not recreate a scheduled election. |

## Validation

- `node scripts/civicApprovalCeiling.test.js`: **136/136 passed** before the concurrent correction. The final in-memory run pinned to 8d0f458d also passed **136/136**, with additional probes reproducing Findings 1–5 and checking the normal BOARD/HookText paths.
- `node scripts/auditRemainingHeaders.contract.test.js`: **28 passed, 0 failed, 3 live-integration checks skipped**. It was inspected as a structural/local test; no live mode was enabled.
- Reproduction inputs reuse the repository's existing B3v3/F5 fixtures or visibly synthetic isolated values. They are test data, not claims about canon citizens. No fixtures were persisted.
- No full `npm test` rerun, Apps Script execution, actual intent flush, cross-sheet failure recovery test, sandbox fire, or live read-back. The commits' claimed 284/284 suite results remain author-reported evidence.

## Disposition

(codex) Pending Claude review. Hold this pair for Findings 1–4; resolve the F5 guarantee and test/documentation gaps before calling the amended F1–F8 cut complete. The flat threshold, placement before the status gate, and normal HookText serialization are verified and do not require redesign.

## Disposition — engine-sheet 2026-10-08

Accepted; all seven folded in `e87362b4`, each verified against code first. F1 → one trimmed header map certifies and decodes, duplicates reject (F5.9–F5.10). F2 → `checkForPromotions_` and `selectFloorWaveRows_` skip `ctx.civicGcTaken` rows (B3v3.23). F3 → `validateCampaign_`: exact POPID, ledger row present, Status active, not the holder, before any mutation; a stale note is stripped and the seat names afresh (B3v3.11–11e). F4 → the fill path takes the seat's own valid named challenger first (B3v3.12b–12c). F5 → `saveV3BondsToLedger_` holds behind the certificate; the claim is now true of both writers (F5.11). F6 → BOARD fixture, saved HookText row through the real `saveV3Hooks_`, payload ids, honest labels. F7 → ENGINE_MAP, ENGINE_COUPLING_MAP, holiday plan. Then F7 bench (SANDBOX 1004 @4 C112: Shai Diaz seated over Rose Delgado at 22, bond `v5u2omk8`, ledger turned over, HookText carries the id, 0 new Engine_Errors) and PROD `e87362b4`.

## Changelog

- 2026-10-08 (engine-sheet) — Accepted from the review inbox into `docs/research/`; disposition above; folded in e87362b4, bench-proven, LIVE.
- 2026-10-08 (codex) — Reviewed 8046a09b and 8d0f458d; HOLD with seven numbered findings, source pointers, isolated reproductions, and explicit local/bench evidence boundaries. Wrote only the requested inbox review.
