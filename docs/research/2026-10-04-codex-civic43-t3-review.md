---
title: civic.43 Task 3 adversarial diff review
created: 2026-10-04
updated: 2026-10-04
type: reference
tags: [civic, engine, review, accepted]
sources:
  - docs/plans/2026-10-04-school-board.md §2 Task 3
  - git commit 9ee6e057
pointers:
  - "[[plans/2026-10-04-school-board]] — owning plan and acceptance contract"
---

# civic.43 Task 3 — adversarial diff review

**Verdict: HOLD.** The ordinary education vote routes to BOARD-OUSD, uses the existing unnamed-IND probability (`0.5 + sentiment * 0.15 + affected-neighborhood demographic influence`) and 0.15–0.85 clamp, requires four yes votes, skips the new-vote mayoral veto, and records seven named votes under the tested OPP/CRC fixture. The defects below break that contract for other valid rows and prevent a board-approved staged program from progressing. This is source and local-test evidence, not sandbox Sheet proof.

## Findings

1. **BLOCKER — `IND` in either faction column counts board members twice.** `phase05-citizens/civicInitiativeEngine.js:914-919` populates both `factions.IND` and `indMembers` for all seven board members. `:1135-1169` then treats a row's `LeadFaction` or `OppositionFaction` of `IND` as seven deterministic faction votes, while `:1253-1279` draws seven more unnamed IND votes. Read-only VM repro with seven synthetic members, `LeadFaction=IND`, seven RNG draws of 0.9: `voteCount=7-7`, 14 named vote clauses, and a pass even though all seven actual draws were no. The board must have no faction vote bucket, or the resolver must skip faction accounting for board votes. Add both IND-column cases to the tests. `scripts/civicApprovalState.test.js:303,346-347` fixes OPP/CRC and checks only those buckets, so T3.11 misses this.

2. **BLOCKER — a board pass cannot fund or advance a staged initiative.** `phase05-citizens/civicInitiativeEngine.js:467-506` correctly skips mayoral action for a board pass, leaving `MayoralAction` blank, but the stage entry at `:280` already ran before the vote and the later stage functions require `status=passed` **and** `MayoralAction=signed` (`:3926-3937`, `:4043-4050`, `:4293-4300`, `:4345-4351`, `:4397-4402`). Direct pure-function repro: `civicStageStep_({stage:'Proposed',status:'passed',mayoralAction:'',cycle:110})` returns null. The row remains Proposed, so the board's approval cannot reach Funded, Standing, or Delivering through this path. Make the approved-stage gate recognize a board-passed education row without inventing mayoral signing; exercise a Proposed education row through a later Cycle. T3.4 only checks that the mayoral cell is blank; T3.1 has a blank Stage (`scripts/civicApprovalState.test.js:301-305,323-330`).

3. **HIGH — board-approved education programs cannot renew through the normal lifecycle.** `phase05-citizens/civicInitiativeEngine.js:618-629` calls `renewalEligibility_`, which accepts `passed` only with `mayoral=signed` (`:3386-3392`). A newly passed board row has no signature by design, so a staged renewal becomes `RENEWAL VOID ... not a voted program` before board routing at `:634-646`. Direct pure-function repro with `status=passed`, blank mayoral action, `Stage=Standing`, `phase=operational`, and a positive amount returns `{ok:false,reason:'not a voted program'}`. Apply the same board-aware approval rule to renewal eligibility and its other callers. T3.10 injects `mayoral:'signed'` into the education fixture (`scripts/civicApprovalState.test.js:343-344`), masking the failure.

4. **HIGH — an unavailable board permanently fails a due renewal instead of delaying it.** `resolveCouncilVote_` returns `status=delayed` below four available board members (`phase05-citizens/civicInitiativeEngine.js:1111-1128`). The renewal caller equates every non-`passed` result with failure (`:647-675`), writes a nonblank `RenewalOutcome`, emits failed-renewal events and fallout, and applies the negative consequence. The retry guard at `:613-615` then skips it forever. With zero board rows, this produces `RENEWAL FAILED 0 available, 4 needed` instead of waiting for the board. Preserve a pending renewal on `delayed` and retry when the board has quorum. T3.8–T3.9 cover only first votes; T3.10 always supplies seven active board rows (`scripts/civicApprovalState.test.js:337-344`).

5. **HIGH — renewal Notes omit the seven named votes.** The resolver creates every individual's vote in `rResult.notes` (`phase05-citizens/civicInitiativeEngine.js:1315-1319`), but the renewal branch writes only the count and body sentence (`:649-652,679-682`). T3.10 checks the sentence and absence of council names, not seven board names or vote clauses (`scripts/civicApprovalState.test.js:343-344`). Append the board's individual vote receipt to renewal Notes and assert each of the seven names exactly once.

6. **MEDIUM — an already-vetoed education row still reaches a council override.** The separate override loop keys only on `status=vetoed` and due `OverrideVoteCycle` (`phase05-citizens/civicInitiativeEngine.js:533-547`); it does not inspect `PolicyDomain`. A pre-cut education row in that state can therefore be approved or rejected by the council after the board takes jurisdiction, contrary to the no-council-override rule. Define and enforce how existing education veto/override rows are handed to the board. No T3 test seeds this state.

7. **MEDIUM — non-education vote output is not byte identical.** Council vote events now gain `body:'council'` in `S.votesThisCycle` (`phase05-citizens/civicInitiativeEngine.js:451-459`) and council renewal events gain it at `:658-660`. Their serialized summary changes although the vote algorithm and council-room wording are otherwise preserved. Keep the old object shape for council events and let readers default an absent body to council if byte identity is required. T3.3 checks one safety tracker row, while T3.5 explicitly expects the changed council summary shape (`scripts/civicApprovalState.test.js:328-331`).

8. **MEDIUM — the seven-seat boundary is not enforced.** `getBoardState_` accepts every `OfficeId` beginning `BOARD-OUSD-`, including a duplicate seat ID or `BOARD-OUSD-8`, and increments `availableVotes` for each (`phase05-citizens/civicInitiativeEngine.js:898-919`). The resolver still uses four as the threshold (`:1101-1104`), so it can record eight or more votes as a valid "4 of 7" decision. Restrict or validate the exact unique IDs 1–7; fail or delay on malformed board membership. T3.11 only covers one well-formed seven-row fixture (`scripts/civicApprovalState.test.js:345-347`).

## Test discrimination and verification

`node scripts/civicApprovalState.test.js` completed **60/60 PASS**. The current checked-out engine and test files are byte-equal to commit `9ee6e057`; no tracked files were edited. T3.1–T3.5 and T3.7–T3.9 discriminate their stated simple vote, body, absence, and no-board paths under the fixture. T3.6's three-yes case fails under both the intended four-vote bar and its row's `6-3` requirement (`scripts/civicApprovalState.test.js:332-333`); a four-yes `6-3` case and a three-yes `3-4` case would distinguish both sides of the fixed threshold. None of T3.1–T3.11 supplies nonzero affected-hood demographics or extreme sentiment, so none tests the hood modifier or either clamp boundary (`:304,309-344`); source reuse establishes the intended math only for the ordinary OPP/CRC fixture. T3.10 and T3.11 have the blind spots named above. No bench run or live Sheet read was performed.

## Folded (engine-sheet, 2026-10-04, same morning)

Every finding verified against the code and folded in `phase05-citizens/civicInitiativeEngine.js`; proven on the real run loop in `scripts/civicApprovalState.test.js` T3.5 / T3.10 / T3.12–T3.19 (68/68; T3.5, T3.10, T3.12 fail on `9ee6e057`), suite 284/284.

1. F1 — `getBoardState_` no longer fills a faction bucket; a row's `LeadFaction`/`OppositionFaction` of IND finds nobody (T3.12: still seven votes, 4-3).
2. F2 / F3 — one rule, `initiativeVoted_(status, mayoralAction, policyDomain)`: override-passed, or passed + signed, or passed + education (the board's pass needs no signature). Read at the run-loop early exit, `renewalEligibility_`, `civicStageStep_`, `civicBuildOpenStep_`, delivery, stall entry and revival; the two stage-object call sites now carry `policyDomain` (T3.13, T3.14; T3.10 fixture no longer injects a signature).
3. F4 — a `delayed` renewal is HELD: `RenewalOutcome` stays blank, no event, no fallout, the hold is noted; retried at the next fire (T3.15).
4. F5 — renewal Notes carry every member's vote (T3.10 asserts seven names).
5. F6 — the override loop skips an education row: stays vetoed, note says why, `OverrideVoteCycle` cleared (T3.16).
6. F7 — council vote events keep their old shape; `body` is set only on a board result (T3.5).
7. F8 — `getBoardState_` accepts `BOARD-OUSD-1..7` once each; an eighth or duplicate seat marks the ledger malformed and the vote is delayed with the cause (T3.17, T3.18).
8. Threshold note — a four-yes `6-3` row passes (T3.19).

`lib/initiativePhaseContract.test.js` anchor trued to the new early-exit line (ordering contract unchanged).
