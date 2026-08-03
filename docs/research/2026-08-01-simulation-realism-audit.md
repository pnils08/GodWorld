---
title: Simulation Realism Audit — research
created: 2026-08-01
updated: 2026-08-01
type: reference
tags: [research, engine, citizens, civic, active]
sources:
  - Builder verdict 2026-08-01 ("sim produces unrealistic data — 90% employment, permanent golden era; should have started over")
  - phase03-population/updateNeighborhoodDemographics.js, deriveDemographicDrift.js, updateCrimeMetrics.js
  - phase02-world-state/applyCityDynamics.js, applyInitiativeImplementationEffects.js
  - phase01-config/godWorldEngine2.js; phase05-citizens/updateCivicApprovalRatings.js
  - data/economic_parameters.json; utilities/chaosCarsConfig.js
  - editions/cycle_pulse_edition_{95,98,101}.txt (symptom sample)
  - docs/plans/BACKLOG.md §27.7–27.10; docs/research/2026-07-27-employment-as-a-living-system.md; docs/research/2026-06-29-citizen-event-depth-audit.md
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (engine.83/84/85, engine.93, engine.94, engine.95, Phase 43)"
  - "[[../plans/2026-07-31-per-hood-political-consequence]] — engine.93"
  - "[[../plans/2026-07-31-citizen-memory-perception]] — engine.94"
  - "[[index]] — registered here, same commit"
---

# Simulation Realism Audit — research

**Source:** Internal audit — three disk-only sweeps (engine model surface, design shelf, data symptoms) run 2026-08-01 by Kimi CLI, builder-directed after the "unrealistic sim / start over?" verdict. No Sheets reads (network-gated); ledger-live figures are unverified by design.

**What this addresses:** The builder's complaint that the sim produces unrealistic data — "~90% employment," a permanent frictionless golden era — and his question of whether the codebase should be abandoned. The audit's job: separate *what is broken*, *what was never modeled*, and *what is designed-but-unbuilt*, then price the gap.

**What it does:** Maps each complaint to code-level evidence, then to the design shelf (BACKLOG, prior research, existing plans), so the residual gap is what's left after existing designed work is credited.

## Extraction — the gap map

**1. The "90% employment" is a hardcoded fallback, not a measurement.** `updateNeighborhoodDemographics.js:68` reads `demographicDrift.employmentRate || 0.91` — and `deriveDemographicDrift.js` contains **no employment writer at all** (grep: zero hits), so the rate is *always* 0.91. Unemployment then drifts ±3/cycle around ~9% (`:153-165`). Unemployment exists only as static demographic state (`Neighborhood_Demographics.Unemployed`, schema col E) feeding crime via `UNEMPLOYMENT_THRESHOLD` (`updateCrimeMetrics.js:328-332`). Nothing economic ever *causes* a job loss.
→ Sim-area: macro-economy. Root of the builder's headline complaint.

**2. No macro-economic cycle exists.** No business birth/death/bankruptcy mechanic anywhere — the only closure event in the codebase is chaos-cars' `forced_temporary_closure` (`utilities/chaosCarsConfig.js:229-234`, a municipal-vehicle incident type, weight 0.20). `data/economic_parameters.json` is a static ~2,180-line salary table (role → income range/tax/housing burden) with **zero dynamics** — no downturn probability, no growth model — and prosperity baked into flavor text ("dynasty-era", "historic highs").
→ Sim-area: macro-economy / business lifecycle. The single genuinely *undesigned* gap (see Verdict).

**3. The hire/fire loop is half-built.** Per [[2026-07-27-employment-as-a-living-system]]: `runCareerEngine` already emits `careerSignals.businessDeltas` + layoffs and `economicRippleEngine` narrates them — but nothing writes back to `Employee_Count`. Citizens are "fired" in narrative but never in state. Business_Ledger is 23% economically empty.
→ Sim-area: employment. Designed: engine.83 (resolver repair, ready), engine.84 (headcount conflation, ready), engine.85 (living system, in-progress, research half done S335).

**4. No counter-pressure on prosperity.** BACKLOG **27.10** (HIGH, Grok review S139) describes the builder's complaint verbatim: "High approval + winning sports team + steady fund disbursement + rising economic indicators = a smooth ride with no friction… Without it, long runs flatten into comfortable stability." Only the scandal-ceiling slice has a plan (engine.94 Track A). Ticket-price squeeze, outside-investment disruption, housing-pressure coupling: undesigned except as one line in engine.94 Task 4(b).
→ Sim-area: feedback loops. NOTE the canon constraint (CLAUDE.md): Oakland is prosperity-era by doctrine — the fix is *consequences of success* (27.10's own framing), not imported recession cynicism.

**5. Per-neighborhood effects are written but never read.** Re-verified this audit: `S.initiativeNeighborhoodEffects` and `S.approvalNeighborhoodEffects` have writers only (`applyInitiativeImplementationEffects.js:323-345`, `updateCivicApprovalRatings.js:305-321`) plus one NOTE comment — zero readers. Interventions dissolve into city-wide scalars; the citizens they target feel nothing (the "civic theater" failure mode in `GodWorld_My_Oakland.md`).
→ Sim-area: civic consequence delivery. Designed: engine.93 Track A (ready).

**6. Citizens don't remember.** `grief_period` is emitted on death-of-ally (`generationalEventsEngine.js:1426`) with **zero consumers engine-wide** (grep-verified 2026-08-01; engine.94 plan's stale `buildCyclePacket` pointer corrected same day). Grudge/ambition are prose-only. Collective recall (BACKLOG **27.9** folk memory, MEDIUM) undesigned beyond engine.94 Track B (gated on research.17). Prior audit: ~25% of citizen classes structurally excluded from stakes-gates; events lack consequence/memory ([[2026-06-29-citizen-event-depth-audit]]).
→ Sim-area: citizen memory & perception. Designed: engine.94 (Tracks A/B).

**7. Editions mirror the engine.** Negative-economic-outcome term counts in sampled editions: E95 "closure"×3, E98 zero, E101 "recession"×1. The newsroom can only report what the engine produces; items 1–4 starve it of friction material. (Desk-latitude items 27.2/27.3 are adjacent but secondary.)
→ Sim-area: media surface. Downstream symptom, not a desk failure.

**8. "The documents that were gonna save the sim" exist — unbuilt.** Shelf inventory: BACKLOG 27.7 (delayed-fuse seeds, MEDIUM), 27.9 (folk memory), 27.10 (feedback ceilings, HIGH), employment reconciliation + living-system plans, entity protagonism ("XX laying off / XX expanding" business events), crisis-detection-rebuild, and the city-functions analysis PDF — which is **not lost**: it lives at `docs/research/godworld_city_functions_analysis_2026-04-20.pdf`; the engine.10 (Phase 43) rollout pointer was stale (fixed same commit as this file).
→ The rebuild instinct would discard exactly the designs that answer the complaint.

## Not applicable / hazard

- **Live ledger unverified.** No Sheets reads were made (network-gated). Approval trends, actual per-hood unemployment figures, and golden-era duration are inferred from code + editions, not measured from live state. A follow-up Sheets pull (dashboard API or approved script) would firm up items 4 and 7.
- **The 6-minute wall gates everything.** engine.95 baselined the cycle at 34–38% of the Apps Script wall; every realism addition spends cycle time. engine.95 Task 4 (checkpoint/resume) is a *prerequisite* for heavy engine additions, not parallel work.
- **Canon discipline.** Realism fixes must not import real-world recession narratives or sector priors (CLAUDE.md doctrine). 27.10's "consequences of success" framing is the compliant shape.
- **Subagent sweep failure.** Three explore subagents timed out (2h) at audit start; sweeps were run directly by the lead instead. Findings are lead-verified; the design-shelf sweep is narrower than originally fanned out (archived roadmaps skimmed via index summaries, not re-read in full).

## Verdict

**adopt** — but the adoption routes almost entirely to *existing* rows; the audit's value is ordering, not new design. The codebase keeps: the complaint is answered by designed-unbuilt work, and "start over" would discard it.

Recommended build order (existing rows unless noted):
1. **engine.95 Task 4** (checkpoint/resume) — platform prerequisite for all heavy engine additions.
2. **engine.83 + engine.84** (employment reconciliation, both `ready`) — kills the 0.91-fallback class of bug and makes headcount causal; static repair is the precondition for a living economy (per [[2026-07-27-employment-as-a-living-system]]).
3. **engine.93 Track A** (per-hood fold, `ready`) — interventions start landing on the neighborhoods they target; near-janitorial, no audit dependency.
4. **engine.94 Track A** (grief consumer + scandal ceiling) — first counter-pressure mechanic; requires resolving its Open question 1 (does C91+ ratings data confirm the golden-era pattern? — needs the Sheets pull).
5. **engine.85 remaining tasks** (employment living system) — hire/fire write-back, business mint.
6. **NEW ROW PROPOSED — business lifecycle / macro-consequence generator** (BACKLOG 27.10 items beyond scandal ceilings: business birth/death, outside-investment disruption, success-pressure coupling). The one genuinely undesigned gap. Seed design from 27.10 + entity protagonism + the found city-functions PDF (Phase 43 re-armed). Builder approval required before row + plan.
7. **engine.94 Track B** — stays gated on research.17 (design WITH Mike), unchanged.

**Ignited plans:** none new — routes to [[../plans/2026-07-31-per-hood-political-consequence]], [[../plans/2026-07-31-citizen-memory-perception]], [[../plans/2026-07-26-employment-reconciliation]], [[../plans/2026-07-27-employment-living-system]], [[../plans/2026-07-31-platform-ceiling-resilience]]. Proposed new row (item 6) awaits builder decision.

---

## Applications (living)

- 2026-08-01 — Builder realism verdict ("start over?") answered: keep; build order proposed.
- 2026-08-01 — engine.96 created from build-order item 6 ([[../plans/2026-08-01-business-lifecycle-generator]], builder-approved); audit pointers wired into the engine.83/84/85/93/94/95 plans.
- 2026-08-01 — Builder-approved live pull CONFIRMED the audit's headline findings against live data: Growth_Rate uniform 8% across 6/6 sampled businesses (finding 2's static economy, card layer built from the live ledger 2026-07-17); Mayor approval 78→95 monotonic C92–C99 with the OPP cohort rising (finding 4's frictionless golden era — factional: CRC/IND seats decline −1/cycle but face no event-level counter-pressure). Resolved engine.94 Open question 1 and engine.96 Task 4.
- 2026-08-01 — Builder doctrine recorded (Mike): **everything is earned — no one gets anything for free in the sim.** Static numbers are getting things for free; the 0.91 fallback and uniform 8% growth (findings 1–2) are the canonical violations. Tunables belong in `World_Config` (cell-editable, loaded to `ctx.config` by `loadConfig_`), and modifiers must derive from live sim state. This doctrine now governs engine.96's design and should govern every realism fix in the build order.
- 2026-08-02 — Builder doctrine recorded (Mike): **the sim is a game, not an ant farm — optimize for problems worth solving, not for a perfectly-running system.** The efficient-system instinct (forced backfills, silent repair jobs, making the pipeline tidy) is anti-sim: it removes the thing the player engages with. The engine is *designed* for random engines to combine effects into issues; Mike hears that randomness in the daily NotebookLM brief and answers by building what citizens need or introducing characters. The civic initiatives were born this way (Temescal health crisis → health center). The Temescal health center is the canonical loop-break: (a) still not built, (b) never changed the math, (c) the storyline vanished anyway — a crisis that stops for no reason is the world healing off-screen, which is not a sim. Corollary for every build: an intervention must land on citizen state, and a storyline must persist until the *math* moves it — never let a fix or an absence resolve a story silently.
- 2026-08-02 — Builder ROOT doctrine recorded (Mike): **the citizens' lives are in the sheets, and the work must honor them.** "If I have 900 citizens I absolutely have to honor their 'life' is in these sheets… if it's not real to me it won't be real to anyone. If this will ever truly function as a sim it'll be because I care to make it work." The world is treated as real for the sake of what was created — so a crisis the media lets vanish *dishonors the lives sworn to protect*. The failure is never that citizens suffer (suffering is life, and content); the failure is abandonment — a storyline, a neighborhood, a citizen dropping out of coverage and memory while their row still says they're living it. This is the root doctrine: everything-is-earned and game-not-ant-farm both derive from it, and it is the behavioral test under the newsroom's three-layer coverage — the desks are the world's memory of whether anyone cared.
- 2026-08-03 — Builder policy steer recorded (Mike, on named off-ledger people in citizen testimony): **first-name relationship color is essence, not citation.** "My friend Jane told me" ≠ "Jane Doe said 'xxx'"; citizens have real neighbors and friends, and their voices speaking that social world was never meant to be gated — blanket name-gating was a training-convenience byproduct, not the core concept. Two boundaries Mike drew explicitly: (1) the real-world-entity gate is a **business/institution** matter (the canon-substitute system) — do not import that rationale into citizen policy; (2) birthing a new citizen is the **last-case scenario, strict necessity only** — *if* a citizen-type were ever genuinely missing (his hypothetical: a needed bus driver with no model for one), that is the one legitimate LLM use case, and even then the entity is birthed into Generic_Citizens, never ingested straight into the ledger — nothing is free. Separately: new businesses/entities become tracked through stories honestly — story-origin is how anything becomes tracked (90 businesses vs 386k population). Application: supplied-line policy (P1 of the deep-dispatch guardrail proposals).

---

## Changelog

- 2026-08-01 — Initial audit (Kimi CLI, builder-directed). Three lead-run sweeps after subagent fan-out failed (3× 2h timeouts). Findings 1 (0.91 fallback), 3 (half-built hire/fire), and 5 (zero-reader buses) verified at file:line; city-functions PDF recovered and engine.10 (Phase 43) pointer fixed same commit.
