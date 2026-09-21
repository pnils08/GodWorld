---
title: Civic.38 game loop — Codex review of the owning build plan
created: 2026-09-20
updated: 2026-09-20
type: reference
tags: [research, civic, engine, draft]
sources:
  - Builder request 2026-09-20 — deep creative review, then file the full review for group discussion
  - docs/plans/2026-09-19-civic-wake-game-loop.md — original commit 0a4d8e9f; reviewed working version at HEAD 48e4176e
  - docs/research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives.md — especially builder rulings in section 10
  - scripts/cron-civic-run.js and scripts/buildCivicOfficeSlice.js — actual weekday pack and wake path
  - scripts/assembleDecisions.js and scripts/applyTrackerUpdates.js — Sunday assembly and tracker writer
  - phase05-citizens/civicInitiativeEngine.js and phase05-citizens/updateCivicApprovalRatings.js — vote trigger and political consequences
  - output/beats/meta.json — C108 local dump generated 2026-09-20T21:49:34.662Z
pointers:
  - "[[plans/2026-09-19-civic-wake-game-loop]] — sole owning build plan; proposed changes must be reconciled there"
  - "[[research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives]] — existing design record and builder rulings"
  - "[[engine/ROLLOUT_PLAN]] — existing civic.38 row; no additional work item created"
  - "[[research/index]] — review registration"
  - "[[for-claude-review/README]] — completed-review inbox contract"
---

# Civic.38 game loop — Codex review

**Source:** The civic.38 build plan, its design record, current implementation, and local C108 artifacts. Requested and authored as a Codex review for the group, not as a replacement plan or a second implementation track.

**What this addresses:** How civic citizens can use their office to choose initiatives, improve neighborhood conditions, pursue approval, and encounter the consequences at later wakes. The review distinguishes observed implementation gaps from proposed game rules.

**What the plan does:** Seats choose structured moves during weekday wakes; their work reaches Initiative_Tracker through Sunday gating. Three stages, a losing clock, condition-based petitions, citizen complaint pressure, and confrontation are intended to turn those choices into consequences.

**Verdict: adopt the causal-loop direction; reconcile the findings and proposals into the existing plan before implementing the affected tasks.** This is the reviewer's recommendation, not approval of new mechanics, thresholds, deployments, or task assignments. The builder authorized filing this review for group discussion. Existing rulings remain the baseline; recommendations below have not been adopted merely by being filed.

**Ignited plans:** None. The sole owning plan remains [[plans/2026-09-19-civic-wake-game-loop]], tracked by civic.38. Its tasks, lane ownership, and rollout state are not rewritten by this review.

## 1. Assessment: the missing game is consequence

Task 1 is necessary, but a closed JSON vocabulary alone does not create agency. A civic wake needs five things:

1. **Position:** office, approval, district conditions, and existing commitments.
2. **Opportunity:** a few actions the seat can actually take.
3. **Competition:** more worthwhile problems than available turns.
4. **Resolution:** the engine determines what the choice achieves.
5. **Memory:** the next wake sees the result and what was neglected.

The persona supplies ambition, priorities, loyalty, defensiveness, and political judgment. The mechanics make those differences matter. The desirable result is a persistent choice with an opportunity cost, not a model announcing that it succeeded.

An observed example is Warren Ashford's C107 request for a targeted service audit in KONO: `output/cron-civic/datawake/civic-office-council-d7_2026-09-16.json`. It is stored as an `action` string. The datawake path records it locally and to the position wall; there is no corresponding resolved audit operation in this path. Renaming the same claim `work` would preserve that gap. This example is evidence of recorded speech, not evidence that the requested audit happened.

## 2. Verified findings against the current implementation

### F1 — Task 3 points at an unused pack function

The plan targets `domainSlice()` in `scripts/cron-civic-run.js:1861`. The actual datawake calls imported `buildPack()` at `:2100` and `:2118`; `domainSlice()` has no caller in that file. The implementation is in `scripts/buildCivicOfficeSlice.js:730`.

The current OFFICE/1 pack already includes approval, selected constituents, neighborhood facts, civic peers, and relevant initiative facts. See `buildCivicOfficeSlice.js:777` for its returned structure and `:443` for initiative selection. The missing pieces are a complete actionable board, complaints, pending moves, and resolved consequences. Task 3 should extend that actual path; its file list currently omits the live pack builder.

### F2 — A week of moves does not fit the current decisions envelope

`scripts/applyTrackerUpdates.js:237` (`findDecisionFiles`) accepts one initiative identity and one flat `trackerUpdates` object per file. A candidate-only file with no populated `trackerUpdates` is ignored. It is not presently a multiple-move accumulator.

Sunday `runClose` invokes `assembleDecisions.js --apply` before tracker validation (`cron-civic-run.js:1720`). The assembler constructs fresh payloads and writes each initiative's decisions file (`assembleDecisions.js:318`, `:381`). Writes placed at those same paths would be replaced unless explicitly merged; separate seat files would still need multiple-target resolution and collision handling. The existing writer also falls back to the previous Cycle when it finds no current decisions (`applyTrackerUpdates.js:437`), which needs particular care for one-time actions.

MilestoneNotes is not durable machine-state storage: Sunday strips secondary notes (`cron-civic-run.js:1734`) and normalization trims notes to roughly 200 characters (`applyTrackerUpdates.js:173`). A stage token cannot depend on surviving prose normalization.

**Implication for Task 2:** Specify stable move identities, preserved input records, multiple-target accumulation, deterministic conflict resolution, and applied/failed/pending results. Retries must not duplicate candidates or work. Keep the existing Sheet writer, but extend the whole path rather than assuming its current envelope already carries the week.

### F3 — Candidate rows need to reach the actual gates

The clerk's input is currently voice statements and their trackerUpdates (`cron-civic-run.js:1694`). The final gate's write-set digest reads and normalizes trackerUpdates (`scripts/cron-civic-gate.js:299`). Neither currently reviews a new `candidateRows` collection.

Adding a candidate append branch only to `applyTrackerUpdates.js` would not establish the claimed equivalent review path. Candidate-only input, new-row validation, seat authority, and retry identity must be represented in assembly, validator, final gate, and apply behavior. Relevant validator: `scripts/validateTrackerUpdates.js:138`.

### F4 — Scheduling a proposal is not enough to trigger its vote

`scripts/createInitiative.js:134` creates `Status = proposed`. `civicInitiativeEngine.js:307` votes only when `VoteCycle === cycle` and status is `active` or `pending-vote`. The writer allowlist (`applyTrackerUpdates.js:109`) includes VoteCycle and ImplementationPhase but not Status.

Task 2/6 therefore needs a complete petition-to-vote state transition. Stamping a next-Cycle vote and `vote-scheduled` phase alone leaves the new row outside the ordinary vote trigger. The existing contract distinguishes legislative Status from implementation phase; retain that distinction when resolving the gap.

### F5 — Approval ownership is faction-based, not proposing-seat-based

`updateCivicApprovalRatings.js:591` derives `supportedByFaction`, then `owns = isMayor || supportedByFaction`. Its initiative reader (`:435`) does not read ProposingOffice or Proposer into the scoring record.

That cannot by itself deliver an individual sponsor's responsibility. District and faction consequences can remain, but the group's intended sponsor credit and sponsor stall cost need a distinct attribution rule. Task 5's word "owner" currently hides this difference.

### F6 — The proposed rent-burden formula mixes monthly and annual units

Task 6 uses MonthlyRent / HouseholdIncome. HouseholdIncome is annual; the existing engine uses MonthlyRent times 12 / HouseholdIncome (`phase05-citizens/householdFormationEngine.js:1091`, `phase05-citizens/migrationTrackingEngine.js:257`).

Read-only diagnostic against the C108 local Household_Ledger dump:

| Measurement | Count |
|---|---:|
| Active rented households with positive rent and income | 392 |
| Above proposed 0.30 band using plan formula | 0 |
| Above proposed 0.30 band using engine's annualized formula | 106 |

These are condition-matched household counts, not signatures, population estimates, or authorization to set a live threshold. Reproduction: parse `output/beats/Household_Ledger.jsonl`; retain Status `active`, HousingType `rented`, numeric MonthlyRent > 0 and HouseholdIncome > 0; compare each ratio against 0.30. Zero-income and missing-income cases were excluded from this diagnostic and need an explicit counter policy.

Two separate decisions are needed: the hardship band defining eligibility, and the support band that puts a proposal to a vote. The proposed 0.30 burden ratio specifies only the first. Household counts, individual signatures, and hood population have different units; scaling requires an explicit, inspectable rule. Do not label an aggregate crime condition as observed individual signatures, or double-count hospital patients and an aggregate Sick count without a defined join.

### F7 — The plan's unused neighborhood-effects claim is stale

`phase02-world-state/applyCityDynamics.js:1271` reads `S.initiativeNeighborhoodEffects`; `:1460` applies the per-hood fold, and `:1536` clears the consumed bus. The comment at `applyInitiativeImplementationEffects.js:515` claiming no consumer is stale, and the plan repeats it.

This does not prove every proposed domain has its promised effect. A targeted sentiment or retail change is not evidence that a safety proposal changes Crime_Metrics or a housing proposal lowers rent burden. Health relief is explicitly published at `applyInitiativeImplementationEffects.js:448`; transit has a separate slice at `:483`. Verify each intended metric's actual writer, consumer, and persistence before declaring a domain playable. Do not treat the current DOMAIN_EFFECTS vocabulary as a catalog of fully implemented interventions.

### F8 — Civic is broader than an unanswered complaint

`lib/reflectionClassifier.js:37` defines Civic as civic duty, local government, and community organizing. `utilities/citizenDialMap.js:48` currently maps Civic to an empty nudge.

Task 7's blanket negative nudge would also cover constructive participation. The builder's ruling concerns complaints making citizens more upset; the implementation needs a way to distinguish those complaints from other Civic reflections. The eventual relief response also needs to be visible to citizens, rather than leaving successful government and continuing complaint penalties disconnected.

## 3. Proposed move economy — recommendations, not adopted rules

Start with **one consequential move per wake**, alongside free public speech. The current plan defines a moves array but does not enforce a cost or maximum. This recommendation supplies an initial scarce resource without inventing a political-capital ledger.

| Move | Seat's decision | Persistent consequence needed | Opportunity cost |
|---|---|---|---|
| propose | Adopt a supported problem and choose an available intervention | Sponsor, hoods, petition state, intervention, fixed success criterion | Existing obligations wait while the portfolio expands |
| work | Resolve one named blocker on an existing initiative | Authorized action, target, resolution and evidence | Delivery takes the turn that could launch a new priority |
| answer | Make an accountable commitment in response to a confrontation | Demand, promise, deadline, fulfillment or breach | Public accountability uses attention without immediately delivering relief |
| canvass | Investigate one neighborhood's needs | Grounded constituent concerns available at a later wake | Better information later instead of immediate implementation |

Each option needs a distinct effect. Canvassing cannot generate signatures by declaration. An answer cannot count as delivered benefit. Ordinary speech remains available even when the seat spends its consequential move elsewhere. Declining action should remain possible; do not manufacture a universal quiet-day penalty.

Task 1 would need move-specific required fields, a move budget, authority checks, duplicate handling, and accepted/rejected results. Invalid moves should not discard valid speech. Every council-targeted hood should be within its authorized district after canonical resolution: the plan's "must intersect" test would allow a proposal containing one local hood and several unauthorized hoods. The mayor's citywide scope remains the existing ruling. Police-chief turns require an explicit legal action subset rather than inheriting elected proposal powers from the shared rota.

Use an intervention and metric vocabulary grounded in implemented mechanics. The model may choose a problem, political framing, target geography within its authority, and available intervention. It must not invent an executable policy effect or choose arbitrary Sheet fields to mutate.

## 4. Proposed stage semantics and the losing clock

Retain the ruled three-stage model, but resolve its meanings before the engine cut:

- **Funded:** legislative authorization succeeded. If the name additionally promises that funds were reserved, specify the observable reservation mechanism rather than assuming a vote debits a budget.
- **Standing:** the authorized intervention is operating. A permitted work action resolves defined deployment prerequisites; recording a generic work claim is not sufficient evidence.
- **Delivering:** the operating intervention meets the fixed outcome criterion in its affected hoods.

Work should select a known action or blocker from the board. The persona chooses what to attempt; the resolver determines whether prerequisites are satisfied and what changes. It cannot declare staffing, money, construction completion, or service availability into existence.

Before resolution, fix metric, geography, direction, meaningful change, baseline, and observation period. Merely moving in the right direction can reward unrelated recovery. Separate intervention operation, observed public outcomes, and political credit so the seat cannot choose a favorable metric after seeing the result.

Adding Stage columns does not make the current effects system use them. Existing effects and approval read ImplementationPhase. The cut needs an explicit mapping between the new stage and those consumers, including when relief starts and whether a stalled service stops operating. Leaving benefits untouched while changing stage semantics is not a demonstrated integration.

Two clock exploits require explicit treatment:

1. Repeated work cannot reset the clock unless it resolves something new; otherwise it replaces the old NextActionCycle renewal with another self-renewing administrative action.
2. A stalled-to-active revival cannot repeatedly earn the same advancement credit. `updateCivicApprovalRatings.js:1037` currently treats a changed nonterminal, nonfailing phase as advanced. Test stall, held stall, revival, and repeated revival separately.

The 4–5-Cycle ruling also needs a clear interpretation: per-stage stall deadline versus total initiative lifetime. Five Cycles are not necessarily five weekly turns, because engine fires and cron schedules use different clocks. Measure eligible opportunities, including provider failures and rota exclusions, before balancing the clock. Do not freeze world time merely to guarantee a seat wins.

## 5. Citizen feedback and political relationships

Preserve the ruled separation: condition data supplies the deterministic support mechanism; reflections make concerns visible. Show the seat which evidence establishes need and which evidence represents speech. An interview-heavy reflection stream must not become an accidental multiplier of voting power.

The next wake should show what happened to the seat's previous move: accepted but awaiting Sunday, rejected with a reason, applied, blocked on a prerequisite, or resolved with consequences. It should also show the neglected problem when it persists. Use durable action results for mechanical continuity; recalled prose is context, not proof of application.

Political relationships are a later extension, not an already-working feature. `civicInitiativeEngine.js:900` assigns faction votes, while swing voters use the resolver's configured conditions and probabilities. The current four moves have no defined persuasion or coalition-commitment path. Hearing dialogue alone must not be described as mechanically changing votes.

After individual authorship and delivery work, consider explicit support, opposition, and reciprocal commitments between seats. A later wake could encounter a kept or broken agreement, giving relationships and political standing a practical use. This is a recommendation for group discussion, not a new task or permission to implement a bargaining system.

## 6. Recommended integration order within civic.38

This is sequencing advice to reconcile into the owning plan, not a second build schedule:

1. **Task 1 plus essential Task 3 pack work:** seat sees its board, complaints, legal choices, and previous results; it makes a limited validated choice. Update the actual pack builder.
2. **Task 2 plus its real gates:** preserve weekday actions through Sunday, expose new candidates to validation, and make retries incapable of duplicating proposals or work. Complete legislative Status transitions.
3. **One complete health-domain sandbox proof across the relevant tasks:** proposal, support gate, actual vote, deployment, neighborhood consequence, sponsor approval, and recognition in the next pack. Health has an existing relief channel worth verifying first; this does not declare the other domains complete.
4. **All-six conversion as already ruled:** explicit mapping, supported effects, and measurable criteria for every existing row. A narrow proof is a build sequence, not an exception to the all-six ruling. Unsupported effects remain named work rather than simulated delivery claims.

Migration must preserve legislative history. C108 local rows include INIT-003 as a visioning row with Outcome COMPLETED and VoteCycle 94, which is not proof of a council passage; INIT-007 is an operational program whose Status remains announced and VoteCycle is blank. Do not infer "Funded" uniformly from an operational phase or a populated VoteCycle. Source: `output/beats/Initiative_Tracker.jsonl`.

Engine changes still require verified wiring cards and engine-sheet landing. This research review supplies source pointers, not an implementation patch or a substitute for those cards. No new engine agent/model call was run for this review.

## 7. Behavioral proof the first build should produce

The decisive experiment is a paired sandbox run: **same initial state and engine randomness, different civic choice**. Working a valid blocker must produce a different persisted outcome from canvassing or doing nothing. The next pack must show that difference and the opportunity passed up.

Proposed acceptance additions for the owning plan:

- A valid move survives weekday persistence, Sunday assembly, normalization, and retry exactly once.
- A candidate-only proposal is seen by the gates and transitions into an engine-eligible vote state only after its support gate.
- Unauthorized hoods, off-board initiatives, unsupported interventions, and malformed moves are rejected individually; expressive speech survives.
- Repeating work with no new resolution does not advance a stage or renew its clock.
- Deployment changes an actual supported neighborhood/citizen metric; a phase label alone is not proof.
- Sponsor credit and district/faction spillover have independently tested attribution.
- Stall entry, held stall, revival, and repeated revival cannot farm approval or duplicate penalties.
- Annual rent-burden units, zero/missing income, household/person counts, and child-area folding are explicit counter cases.
- Constructive Civic participation is distinguished from complaint pressure, and later relief is available to citizen wakes.
- The seat's next pack carries its actual prior result and unresolved obligations.

These checks are proposed behavioral requirements. They were not run as a new implementation test suite during this read-only review. Findings above were established by source tracing and the local rent diagnostic; no live Sheet reads, external writes, model-backed validation, cron runs, or sandbox fires were performed.

## 8. Group reconciliation points

The group should incorporate accepted findings into the original tasks and settle the remaining choices there: move budget; concrete work actions; sponsor attribution; complaint distinction; support scaling; stage/effect mapping; clock meaning; and missing domain effects. Existing Baylight metric, Fruitvale treatment, Civic/stall deltas, and rota questions remain in the owning plan.

The scope of this filing is the review itself. It does not change task ownership, schedules, production authorization, or the plan's rollout state. The filed document is complete for review; under the inbox contract only the reviewing Claude seat moves it to its permanent home and reconciles acceptance.

## Applications

- 2026-09-20 (codex) — Filed at the builder's request as the discussion review attached to civic.38 and its existing plan; no implementation task marked complete.

## Changelog

- 2026-09-20 (codex) — Filed the full creative and implementation review, separating source-verified findings, diagnostic results, and proposed game rules for reconciliation into civic.38.

## Review — engine-sheet, 2026-09-20

Accepted, builder-direct. F1–F8 each re-read against the file and confirmed. Reconciled into [[../plans/2026-09-19-civic-wake-game-loop]] §Reconciliation and the tasks themselves. Three places where measurement moved past the review:

- **F8 / Task 7:** the reflection path already lets the AFFECT tag alone set composure (`utilities/citizenDialMap.js:316-326`). 51 of 70 live Civic rows carry a negative affect and already pay −3/−4. The Civic dial cut is withdrawn; a complaint is Tag `Civic` + negative Affect.
- **§4 stall cost / Task 5:** `stalled` is already a failing phase (`updateCivicApprovalRatings.js:994-1001`) paying owners −2 per cycle. No new motion; the cut is the sponsor read plus a revival guard.
- **F7:** the fold consumer exists, and it empties the bus before the phase-3 school and phase-5 business readers run — a live defect, filed engine.250.

Adopted as proposed: one consequential move per wake; the move ledger with stable ids; candidates through the real gates; the single `proposed → pending-vote` transition; the closed intervention catalog with a fixed metric; work never resets a running clock; the paired sandbox proof as the acceptance test. Deferred: coalition mechanics (§5).
