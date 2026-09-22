---
title: civic.38 losing clock — Codex adversarial review
created: 2026-09-21
updated: 2026-09-21
type: reference
tags: [research, civic, engine, active]
sources:
  - commit 7ba27e95 — civic.38 Task 4 step 3
  - lib/initiativePhaseContract.js
  - phase05-citizens/civicInitiativeEngine.js
  - phase05-citizens/updateCivicApprovalRatings.js
  - phase02-world-state/applyInitiativeImplementationEffects.js
  - docs/reference/DEPLOY_HISTORY.md — PROD @115 and SANDBOX 0908 @85
pointers:
  - "[[index]] — research registration"
  - "[[../plans/2026-09-19-civic-wake-game-loop]] — existing civic.38 task and rulings 20–24"
  - "[[2026-09-21-codex-civic38-delivering-review]] — earlier comparator review and run-boundary limits"
  - "[[../mara-vance/INITIATIVE_TRACKER_CONTRACT]] — stage and recovery columns"
---

# civic.38 losing clock — Codex adversarial review

**Source and scope:** builder-authorized read-only review of `7ba27e95`. Inspection began at HEAD `25bab2f2`; engine-sheet subsequently recorded the bench/deployment trail in `40e3b522`. The four scoped implementation files remain byte-identical to `7ba27e95`; source line references below use that code. No engine edit, Sheet write, deployment, or fire was performed. Only this requested research file and its index entry are changed.

**What this addresses:** whether losing clocks, recovery and approval remain consistent through stalls, fresh/stale work, multiple handler calls, shared hold writes and the T7 persistence boundary.

**What it does:** Funded runs a stage-age clock; Standing/Delivering run an untended clock. Phase 5 applies revival → move → baseline → delivery → stall. A stall leaves Stage alone, stores its previous phase and entry Cycle, and exposes the existing failure drain. Recovery restores the phase after a qualifying work stamp. Staged rows bypass legacy rescheduling/clock-hold machinery, and T7 yields to their phase owner.

**Verdict: adopt** the bounded corrections below within existing civic.38. The clean loop, strict clock boundaries and same-fire hold ordering pass. The main new defect is that revival omits the vote/status eligibility check: a row the other stage operations refuse can nevertheless regain service. Recovery-state validation has a separate conditional deadlock. The blocked-gate exemption follows the recorded ruling but needs a simulation decision under the newer untended-clock model.

## Findings ranked by consequence

### F1 — HIGH: revival restores service to rows that are no longer eligible to act

**Pointers:** `phase05-citizens/civicInitiativeEngine.js:3742`–`:3752` checks Stage, phase, stall stamp and work but never Status or MayoralAction. The pure `reviveDecision` at `lib/initiativePhaseContract.js:671` has no vote/status inputs. In contrast, stage movement checks passage/signature at `civicInitiativeEngine.js:3368`, delivery at `:3655` and stall entry at `:3706`. The orchestrator is invoked at `:227`, **before** the resolved/failed/inactive/override-failed skip at `:234`.

**Reproduced through the actual main loop, with fake Sheets:** a synthetic Standing health row has phase `stalled`, `PriorPhase=operational`, `StageHold.st=118`, and `LastWorkCycle=118`. At C119, separately assign Status `inactive`, `failed`, `vetoed`, `override-failed` or `resolved`, with MayoralAction `vetoed`. Every case restores `operational`, clears `PriorPhase` and `st`, and persists those changes while retaining the disallowed status. On C120 the real implementation-effects function publishes health relief at intensity **0.9** for each row. Its phase-based health reader at `phase02-world-state/applyInitiativeImplementationEffects.js:469` does not repair this eligibility bypass.

The failure requires a stalled staged row carrying a subsequently invalid status, or an imported inconsistent row; this review does not claim the ordinary stall operation changes Status. It is nevertheless the explicit guard promised by plan ruling 6 (`docs/plans/2026-09-19-civic-wake-game-loop.md:349`): only passed/override-passed rows receive generic stage handling. Revival currently acts before that protection in the other operations.

**Correction boundary:** require the same signed-pass/override-passed eligibility for revival before restoring phase or consuming the recovery stamp. Also restrict recovery to the supported recovery stages: the pure helper currently accepts Proposed or any other nonblank stage and gives it the operational fallback. Keep legitimate override-passed recovery and the closing-Cycle work rule intact. Do not rely on the main loop's later skip to prevent writes already made to the row.

### F2 — MEDIUM, damaged/stale-state trigger: recovery can erase its own handle without restoring service

**Pointers:** stall entry preserves any nonblank `PriorPhase` at `civicInitiativeEngine.js:3724`; `reviveDecision` accepts every nonblank prior phase verbatim at `initiativePhaseContract.js:685`–`:687`; the applier unconditionally clears `PriorPhase` and `st` at `civicInitiativeEngine.js:3754`–`:3757`. Already-down phases cannot get a new stall entry (`initiativePhaseContract.js:634`), and a missing stall Cycle cannot revive (`:678`).

**Reproduction:** begin with a synthetic operational Standing row whose stale `PriorPhase` is already `stalled`. At C118 the real handler stalls it and leaves that nonblank prior value intact. Stamp work C118; at C119 recovery “restores” `stalled`, clears PriorPhase and sets `st=0`. Work C120 still cannot recover it at C121: revival lacks a stall Cycle, while stall entry refuses a phase already down. The failure drain can persist indefinitely despite new work. A prior value of `blocked`, `suspended` or `defunded` likewise cannot be treated as an ordinary successful restoration.

There is a second recovery-integrity boundary: `civicStageHoldRead_` at `civicInitiativeEngine.js:3765` converts malformed, wrong-version or blank cells into a zeroed hold. A row whose phase is already stalled and whose hold is malformed therefore never qualifies for revival; it remains stalled even with new work. The caller neither reports the parse failure nor reconstructs a trustworthy entry Cycle. The existing “tolerant” parser test only establishes that no exception occurs.

**Correction boundary:** validate the restore destination before consuming `st`/PriorPhase; preserve recovery evidence and expose an explicit error when it is unusable. Decide how a stalled row with missing entry history is repaired, rather than silently equating corruption with “never stalled.” Do not invent a stall Cycle from the work stamp.

**Fallback judgment:** blank PriorPhase intentionally falls back to `vote-ready` at Funded and `operational` at Standing/Delivering. That matches ruling 22; it is not proof that the old phase has been recovered. The plan explicitly allows Standing legacy phases such as `construction-active` and `disbursement-active` (`docs/plans/2026-09-19-civic-wake-game-loop.md:148`–`:149`). In particular, recovering a formerly construction-active health row as operational starts care it previously did not deliver. Preserve real PriorPhase whenever it exists; treat the blank fallback as the ruled repair policy, not a universally equivalent restoration. A healthy stall/revive loop generated solely by this cut does not create the stale prior value used in this reproduction.

### F3 — LOW, invalid-input trigger: future work can revive early and postpone the neglect clock arbitrarily

**Pointers:** `initiativePhaseContract.js:679`–`:684` requires only positive finite work at or after `st`, without a current-Cycle upper bound; `stallClock` uses that work as the reference at `:649` and clamps negative elapsed to zero at `:657`. `applyCivicRevival_` receives `cycle` but does not pass it into the decision at `civicInitiativeEngine.js:3748`.

**Reproduction:** `st=118`, `LastWorkCycle=999`, stalled Standing row: the pure helper returns revive=true. At C119 the resulting untended reference lies in the future, so the clock reads zero until that future date. The normal fold does not generate this: `scripts/cron-civic-run.js:2337` stamps its closing Cycle. However, the tracker write boundary at `scripts/applyTrackerUpdates.js:225` checks only a parsed positive number, so it is not an independent upper-bound defense for malformed/imported updates.

**Correction boundary:** reject impossible future/non-integer identity values at their authoritative writer and at recovery if it must tolerate imported rows. This is input hardening, not evidence that ordinary authorized work can choose an arbitrary Cycle. Lower-priority than F1 and F2.

## Required attacks that pass, and their exact limits

### Old work and the revived Funded row

Work C117 against stall C118 cannot revive, even when the Funded stage-change stamp is C100 and that work would otherwise satisfy the Funded work gate. The row stays phase stalled, which blocks movement before the work gate (`civicInitiativeEngine.js:3068`, `:3379`). Work C118 can revive at C119: the fold stamps the closing Cycle, so `>= st` is correct for work landed after fire C118. The revived row then stands in the same call and stamps `LastStageChangeCycle=119`.

This uses **fresh work relative to the stall**, not merely old work relative to funding. Repeated C119 orchestration changes nothing. The test executed this sequence through the actual appliers. Timestamp equality alone cannot distinguish same-Cycle ordering after manual backdating or a partial retry; it relies on the fold/fire convention, as does the existing Funded gate. It should not be changed to strict `>` merely to reject corrupt histories.

### Stall/revive loops do not farm ordinary advances

Two synthetic Standing service loops, stalling at C118/C132 and reviving at C119/C133 after work C118/C132, produced no engine phase-move carry, no new first-delivery award, and no business `advanced` signal. Approval classifies entry as failed, restoration as sitting and held restoration as sitting (`updateCivicApprovalRatings.js:1084`, `:1093`, `:1097`, `:1106`). The business revival guard is at `applyInitiativeImplementationEffects.js:358`–`:360`. Reusing work C132 after a later C145 stall does not revive again.

A **Funded→Standing** transition during revival is different: `applyCivicStageMove_` records `vote-ready` as the phase left at `civicInitiativeEngine.js:3427`, and the next Cycle emits one business advancement. The following clean Cycle emits zero. Same-fire approval sees previous phase stalled and returns sitting, as the reported bench observed. Thus “revival carries no lift” is true of restoring service; it is not a claim that the separate first stand-up forfeits its lift. No row can repeat that Funded transition without an external stage reset.

Existing failure awards to an opposing faction are intentional condition payments; this cut does not remove them. The previous review's non-atomic payout/carry retry windows remain acknowledged at `docs/plans/2026-09-19-civic-wake-game-loop.md:394`. Clean-Cycle loop tests do not prove exactly-once behavior after partial persistence.

### Strict boundaries match ruling 20; the entry Cycle still has earlier Phase-2 effects

`stallClock` uses `elapsed > limit` at `initiativePhaseContract.js:658`, as explicitly specified in plan ruling 20 (`docs/plans/2026-09-19-civic-wake-game-loop.md:386`). The World_Config descriptions say how many Cycles a row “may” sit/run before being stalled (`phase01-config/engine94SheetContract.js:134`, `:140`). The exact behavior is:

| Reference | Clock | At the limit | First stall decision |
|---|---|---|---|
| C100 | Funded, limit 5 | C105: elapsed 5, no stall | C106: elapsed 6 |
| C100 | Standing/Delivering, limit 12 | C112: elapsed 12, no stall | C113: elapsed 13 |

No off-by-one code defect was found against that explicit rule. An informal “stalls at 12” description would be inaccurate. Phase 2 precedes the Phase-5 decision: the entry fire still applies that fire's pre-stall service strength; the following fire first reads stalled effects. Likewise, a C119 Phase-5 revival restores Phase-2 service at C120, not retroactively at C119. The bench trail records that correctly.

### StageHold writers are ordered; a short stall need not erase consecutive evidence

Delivery reconstructs the hold while preserving `st` (`initiativePhaseContract.js:561`, `:580`); stall entry then reads the **updated** cell and adds its entry stamp (`civicInitiativeEngine.js:3725`). Revival reads and clears only `st` before delivery reads the cell again (`:3747`–`:3757`). The orchestrator order at `:3451`–`:3455` prevents an in-call stale-object overwrite. Repeated same-fire calls do not double-count or erase the stall stamp. This proves sequential orchestration, not concurrent independent engine-run isolation.

**Delivering reproduction:** first=95, obs=116, down=1. At fire C118, low observation C117 gives down=2; the neglected row then stalls with st=118 and first=95 intact. Work stamped C118 revives it at C119. Low observation C118 supplies the third consecutive reading and it regresses to Standing in that same call; st clears, first remains 95, and regressed=119. C118's metric was produced in Phase 3 **before** the Phase-5 stall, so retaining that contiguous history is defensible. Three later high observations can re-deliver it while first remains 95; no new completion identity is minted.

If it instead stays stalled through fire C119 and revives at C120, its last evaluated observation is still C117. Observation C119 creates a gap: `initiativePhaseContract.js:581` resets down/up before counting it, so down becomes 1, not 3. The history survives physically during a stall; only genuinely consecutive evaluated observations survive as a streak. **Recommendation:** retain `first`/`regressed` and the current gap reset. Do not zero historical payment identity on stall. An explicit requirement that recovery start a wholly new streak would be a simulation change; it is not necessary to prevent double counting in the tested sequence.

### Legacy clock gates and same-run T7 precedence

The two `!isStagedRow` guards at `civicInitiativeEngine.js:250` and `:330` suppress both legacy ENGINE-CLOCK call sites. The v1.9 reschedule guard at `:293` keeps NextActionCycle from scheduling a staged row's vote. Main-loop probes exercised both guards and showed a blank-Stage visioning-complete row still reschedules, while a Proposed staged counterpart does not. These gates do not delete pre-existing Notes markers; they stop creating/updating them on staged rows.

The T7 check at `applyInitiativeImplementationEffects.js:382`–`:383` yields on **any** nonblank Stage, before queuing the operational intent. An actual-effect-function probe with synthetic T7 predicates produced no intent for a row that subsequently stalled later in the same fire, and none for a row already stalled. An unstaged control still queued operational. This closes the earlier same-run overwrite finding without depending on Phase 2 foreseeing Phase 5's decision. The guard also stops T7's in-memory phase/geography correction for staged rows; that is consistent with one-owner semantics and with leaving INIT-006 unstaged under ruling 24.

## Ruling 3 under the untended clock: faithful implementation, incomplete rationale

`stallClock` skips any supplied blocked requirement at `initiativePhaseContract.js:635`; `stageRequirementWith` reports a missing gate/reader for Standing at `:352`–`:365`. Plan ruling 20 explicitly records the new consequence: even a neglected Standing service is protected when its Delivering gate is unavailable. This is **not an unreported implementation deviation**.

It is coherent as a deliberate exemption, but “the seat cannot open an unbuilt delivery gate” no longer explains an **untended** clock. A service can still have a meaningful work/tend action while its delivery metric is unavailable. In the synthetic economic Standing case at C118, no clock stalls the row, but the real effects reader still reduces it to the 30% upkeep floor. Staged approval is sitting. The policy therefore permits a permanently neglected floor-strength service with no stall drain until its gate becomes available. Transit likewise has a real effect path but lacks the reader in this cut.

**Recommended builder decision:** distinguish delivery eligibility from neglect eligibility. A service with a working tend channel can be accountable for neglect even when it cannot yet earn Delivering. Keep exemptions where the work/tend action itself is unavailable. This changes simulation policy and must not be introduced as a mechanical fix to this review.

Also settle activation: the implementation stores no “gate became available” Cycle. Remove `blocked` at C118 from a row last tended C100 and it immediately qualifies to stall. Ruling 3 says the clock arms when the domain becomes playable (`docs/plans/2026-09-19-civic-wake-game-loop.md:325`), but the implementation counts pre-activation neglect. If “arms” means fresh grace, that needs explicit state or a migration rule; if retroactive neglect is intended, say so before enabling the domain. This does not affect the health bench, whose gate was already available.

## Bench evidence and limits

During this review engine-sheet committed `40e3b522`. Its trail at `docs/reference/DEPLOY_HISTORY.md:132`–`:140` records SANDBOX 0908 @85, C118–C120, and PROD @115/version 102. This is repository-recorded evidence corroborating the dispatch, not a deployment or live readback performed by Codex.

The reported INIT-903 and INIT-904 sequences agree with the inspected code and local synthetic reproductions: both stall C118, work stamped 118 revives C119, Funded also stands at C119, approval reads failed then sitting, and C120 has full operational effects. The trail explicitly states that C119 Phase-2 effects still saw stalled, and that INIT-904's C120 business lift was **not Sheet-verified**. This review preserves that distinction: the first-stand carry/lift was verified locally, not promoted to independent bench proof.

The bench does not cover disallowed status changes, malformed recovery metadata, future work, Delivering recovery with a partial regression streak, or blocked-gate activation. Its healthy one-stall/one-work path cannot establish the universal “one work always revives” guarantee challenged by F1/F2. I found no contradiction in the reported healthy outcomes.

**Documentation drift left for the owner:** `docs/reference/CIVIC_GAME_LOOP.md:62` calls the clock both built and “not built”; `:91` still describes one length of 5. `docs/mara-vance/INITIATIVE_TRACKER_CONTRACT.md:67` still calls LastStageChangeCycle the only clock reference. These conflict with the implemented two-clock model and ruling 20. The review reports the conflict; it does not rewrite those references or infer a new rule from the stale clauses.

## Validation and handoff

- Unchanged repository suites: `node lib/initiativePhaseContract.test.js` **224/224**; `node scripts/civicApprovalCeiling.test.js` **102/102**; `node scripts/civicStageBoard.test.js` **12/12**.
- Temporary `/tmp/codex-stall-clock-review-probes.js`: **12/12 synthetic groups** exercising the actual main loop, stage appliers, effect function, motion classifier and pure helpers. All Sheets and writes are in-memory mocks. T7 predicates are stubbed to activate the reconciliation branch without inventing canon. The initial probe used the wrong economic sentiment coefficient; it was corrected against `applyInitiativeImplementationEffects.js:298` before the complete run. No repository code was changed to pass a probe.
- Reproduction assertions include defects; passing them means the documented behavior was observed, not repaired. The cases and inputs above are the durable handoff; the scratch harness is not required to understand the findings. No complete engine entrypoint or external service was invoked.
- Documentation checks: whitespace checks clean. `node scripts/docLoopStatus.js --lint` reports only the existing invalid `draft` state on civic.39 (`docs/engine/ROLLOUT_PLAN.md:173`). No rollout row is changed in this review.

**Not applicable / hazard:** prior delivery-review F3/F4/F5 are already corrected in `a342400d`, and are not reopened here. Its F1/F2 persistence limits remain separately acknowledged. This review does not change the ruled strict boundaries, legacy conversion phases, exemption policy or production deployment.

**Ignited plans:** none new. Findings feed [[../plans/2026-09-19-civic-wake-game-loop]], existing civic.38 Task 4. No parallel rollout row or inbox copy; the builder requested this canonical research path.

## Applications

- 2026-09-21 — Codex second opinion on 7ba27e95 for engine-sheet; ranked defects and explicit simulation-policy boundary returned without engine changes.

## Changelog

- 2026-09-21 (codex) — Reviewed losing-clock cut; reproduced ineligible revival and recovery-state deadlock, verified clean loops/order/T7, and registered findings with bench-evidence limits.
