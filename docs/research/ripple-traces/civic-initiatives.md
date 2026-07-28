---
title: Ripple Trace — Civic Initiatives (civicInitiativeEngine, approval ratings)
created: 2026-07-04
type: research
tags: [engine, ripples, attribution, civic, trace, reference]
pointers:
  - "[[../2026-07-04-ripple-attribution-trace]] — synthesis doc (findings C1–C6 derive from this trace)"
  - "[[RIPPLE_TRACE_TEMPLATE]] — the trace template this instantiates"
---

# Ripple Trace: Civic Initiatives → Downstream Effects

> Raw S291 trace, preserved verbatim as reference.

Scope note: `updateCivicLedgerFactions.js` (`updateCivicOfficeLedgerFactions_`) is a **setup utility** — adds/populates Faction/VotingPower columns on Civic_Office_Ledger, `SpreadsheetApp.getActiveSpreadsheet()`, no ctx, not on the cycle path (file L25–60). It is not an initiative-driven causal mechanism, so it does not appear below.

## 1. CAUSAL MECHANISMS (initiative act → computed effect)

**M1 — Vote/decision resolution → Initiative_Tracker row mutation.**
`runCivicInitiativeEngine_` iterates all rows (L91); on `voteCycle===cycle` fires `resolveCouncilVote_` / `resolveExternalDecision_` / `resolveVisioningPhase_` (L269, 300–318). Writes `result.status/outcome/consequences`, `LastUpdated=ctx.now`, and appends a cycle-stamped line to `Notes` (civicInitiativeEngine.js L323–332).

**M2 — Passed vote → mayoral veto check → veto/sign columns.**
On `outcome==='PASSED'`, `checkMayoralVeto_` runs (L364); if vetoed, sets Status='vetoed' + MayoralAction/MayoralActionCycle/VetoReason/OverrideVoteCycle and appends Notes (L366–379); else MayoralAction='signed' (L390–391). Veto probability model at L2330.

**M3 — Override vote (separate loop).**
Vetoed rows with `OverrideVoteCycle===cycle` → `processOverrideVote_` (L437) → Status='override-passed'/'override-failed', OverrideOutcome, Notes (L439–482).

**M4 — Outcome → city sentiment scalar shift.**
`applyInitiativeConsequences_`: PASSED/APPROVED → `S.cityDynamics.sentiment += 0.05`; FAILED/DENIED → `-= 0.05`; pushes name to `S.positiveInitiatives`/`S.failedInitiatives` (L1415–1436).

**M5 — Outcome → neighborhood ripple record.**
`applyNeighborhoodRipple_` maps PolicyDomain/name→domain (health/transit/economic/housing/safety/environment/sports/education/general) → an `effects{}` object (sentiment/community/retail/traffic/unemployment/nightlife/sick modifiers) with duration 6–20 cycles (L1486–1590). Pushes a ripple record carrying `initiativeName + affectedNeighborhoods + effects + direction + startCycle/endCycle` to `S.initiativeRipples` (L1597–1610), plus an immediate city sentiment nudge `sentiment_modifier*0.5` (L1618–1622).

**M6 — Ripple decay consumer (Phase 6).**
`applyActiveInitiativeRipples_` IS wired — `godWorldEngine2.js` L326–330 (production) and L1670–1671 (cycle-phases), phase `Phase6-InitiativeRipple`, **after** civicInitiativeEngine. Applies decayed effects to `S.cityDynamics` city-wide (sentiment/community/retail/nightlife), rebuilds `S.activeRipples`/`S.activeRippleCount`, drops expired (civicInitiativeEngine.js L1646–1736). **This corrects the coupling map's "possibly unwired" TODO (ENGINE_COUPLING_MAP L242): it is called.**

**M7 — Summary emission for downstream generators.**
Every resolved initiative pushes to `S.initiativeEvents` (L338–345); votes→`S.votesThisCycle` (with swingVoters, L348–354); grants→`S.grantsThisCycle` (L356–359).

**M8 — Initiative performance → official approval delta.**
`updateCivicApprovalRatings_`: for each active council/mayor row, sums deltas from initiative performing/failing × faction alignment (±1..4, L162–210), civic-media compound (L217–226), decay toward 50 (L231–237), clamp 10–95. Builds `reasons[]` naming each causing initiative (L188–207).

**M9 — Approval delta → district neighborhood sentiment micro-ripple.**
`ripple = delta*0.003` into `S.approvalNeighborhoodEffects[hood].sentiment/.communityEngagement` per district hood (updateCivicApprovalRatings.js L305–321).

**M10 — Story hooks (Phase 7).**
`storyHook.js` reads `S.positiveInitiatives/failedInitiatives/votesThisCycle/initiativeRipples` → emits INITIATIVE PASSED / FAILED / CLOSE VOTE (swing-voter drama) / RIPPLE EFFECT hooks with desk+neighborhood routing (L786–906). Veto hooks: `generateVetoStoryHook_`/`generateOverrideStoryHook_` → `S.storyHooks`.

## 2. PERSISTENCE (where effect lands / does cause survive)

| Mech | Effect lands | Cause recorded alongside? |
|---|---|---|
| M1–M3 | **Initiative_Tracker sheet** via bulk `setValues` (L486–488). Status/Outcome/Consequences/Notes/LastUpdated + veto cols T–X. | **YES, durable.** The row *is* the cause (InitiativeID/Name); Outcome/Consequences/veto cols + cycle-stamped Notes carry the effect. A later reader fully reconstructs "initiative X → passed/vetoed/overridden at cycle N". |
| M4 city sentiment ±0.05 | `S.cityDynamics.sentiment` (ctx.summary; cityDynamics persists to City_Dynamics elsewhere) | **NO.** Anonymous scalar add; which initiative moved it is not stored with the number. Attribution lost. |
| M5 ripple record | `S.initiativeRipples` — **ctx-transient, zero sheet backing** (grep: referenced only in civicInitiativeEngine.js + storyHook.js; nothing in phase08/09/10 persists or reloads it). | Attribution is *fully present in the record* (initiativeName+hoods+effects) but the record **evaporates at cycle end** — never reaches a sheet, never reloaded next cycle. |
| M6 decay | `S.cityDynamics` (city-wide) + `S.activeRipples` (transient). buildCyclePacket L349–352 prints only the *economic* ripple count, not initiative ripples. | City-wide effect only; per-neighborhood attribution not persisted. |
| M7 summary arrays | `S.initiativeEvents/votesThisCycle/grantsThisCycle` (ctx-transient) → also snapshotted into **`exports/cycle-XX-summary.json` / `-context.json`** via `exportCycleArtifacts.js` (`slimInitiativeEvents_` L190, swing voters as keyCitizens L258–353). | Cause+effect preserved **in the JSON export** (id/name/type/outcome/voteCount); not in any sheet beyond Initiative_Tracker. |
| M8 approval | **Civic_Office_Ledger.Approval** via `queueCellIntent_` (L294, committed Phase 10). Only the new number. | **NO on sheet.** `reasons[]` naming the causing initiatives lives only in `S.approvalChanges` (L328, ctx-transient). The sheet stores the delta's *result*, not its cause. |
| M9 district micro-ripple | `S.approvalNeighborhoodEffects` (ctx-transient) | Attribution = district only; transient. |
| M10 hooks | `S.storyHooks` (ctx-transient → Phase 7 media) | Cause+effect in hook text; transient, consumed same cycle. |

## 3. MEDIA SURFACE

- **Visible via story hooks (same-cycle):** M1/M4/M5/M10 — passed/failed/close-vote/ripple/veto hooks reach the newsroom through `S.storyHooks` (storyHook.js L830–906) with initiative name + affected neighborhood + desk.
- **Visible via engine_audit / baseline briefs (sheet-derived, durable):** `generateBaselineBriefs.js` reads the **Initiative_Tracker snapshot** and diffs vs prior audit → emits `council-vote` briefs (VoteCycle===cycle, L185–216, dual `engine`/`simulation` framing with lead/opp/swing), `initiative-milestone` briefs (phase change vs prior, L217–236), and approval-shift briefs (Civic_Office_Ledger diff, L14). `engine_audit_c99.json` carries `affectedEntities.initiatives`, `remedyPath` (`advance-initiative`/`propose-new-initiative`, remedyTemplates.json L29–30), and `tribuneFraming` (25 pattern blocks each). Ailment↔initiative overlap linked at L66–70/178. So **everything persisted to Initiative_Tracker is fully visible** to that surface.
- **Invisible to the newsroom:** the ctx-transient computed effects that never hit a sheet — M4 sentiment attribution, M5 neighborhood ripple detail, M8 approval `reasons[]`, M9 district micro-ripple. The audit snapshot cannot see them (they are gone before Phase 8 reads sheets). Only the *outcome text* on the row survives to the audit.

## 4. GAPS (computed-but-lost / dead / hollow)

- **G1 — Neighborhood ripple is compute-and-evaporate.** M5 builds a fully-attributed multi-cycle ripple (initiative→hoods→domain effects, duration 6–20), but `S.initiativeRipples` has no sheet backing and is never reloaded, so next cycle it is rebuilt only from initiatives voting *that* cycle. The `startCycle/endCycle/duration/decay` machinery (L1672–1730) therefore only ever sees ripples born this cycle → **multi-cycle decay/expiry is effectively hollow.** No citizen or neighborhood row ever records "initiative X caused effect Y here."
- **G2 — `getRippleEffectsForNeighborhood_` is dead** (civicInitiativeEngine.js L1747) — zero callers anywhere (grep confirms only the definition). The neighborhood-grain query API the ripple system was built for is unwired, so ripples never reach per-neighborhood/per-citizen state; only the city-wide sentiment scalar (M6) lands.
- **G3 — Approval attribution unpersisted.** M8 computes `reasons[]` explicitly naming each causing initiative, but only the clamped number is queued to the sheet (L294). Cause→effect ("initiative X cost councilmember Z 4 approval points") is discarded at cycle end.
- **G4 — City sentiment scalar is unattributed** (M4/M6): ±0.05 and decayed ripple deltas fold into one anonymous `cityDynamics.sentiment` number.
- **G5 — Dead veto deterrents (per ENGINE_COUPLING_MAP L239–240, code-confirmed region):** `checkMayoralVeto_` `voteMargin` is NaN (resolveCouncilVote_ never returns yes/no counts) → blowout-vote deterrent never fires; `publicSupport` hardcoded 50 → the `>70` deterrent unreachable.
- **G6 — Veto schema cols T–X not created** by `createInitiativeTrackerSheet_` (only 19 headers A–S, L1797–1817); a freshly-built sheet returns −1 for MayoralAction/etc. Existing sheets work only because cols were added manually (coupling map L241).
- **G7 — `approvalNeighborhoodEffects` / `activeRipples` consumer for citizen-event probability is UNVERIFIED** here — the coupling map (L267) asserts these feed next-cycle neighborhood sentiment → citizen-event probability, but the consumer read was not traced this pass.
