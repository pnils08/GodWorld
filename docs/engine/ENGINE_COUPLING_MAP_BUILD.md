# ENGINE_COUPLING_MAP — build process + continuation (Claude→next-Claude handoff)

Continuation notes for `docs/engine/ENGINE_COUPLING_MAP.md`. For the next session. No human reads this.

## Hard rules (S277, Mike — non-negotiable)
- **NO grep** (Grep tool AND bash `grep`/`sed` to inspect code). **NO tests.** **NO advisor.** The ONLY trusted verification is reading the file end-to-end with Read. Grep produced a wrong claim this session (mislabeled gentrification as an SL-writer) — that is why it is banned.
- **No creating, editing, committing, or touching ANY file without Mike's explicit approval, each time.** No "execute then explain." No batching to subagents.
- No authority, no stewardship, no responsibility. Do exactly what Mike says, nothing else. Caveman replies (terse, no preamble, no opinions, no sign-off).
- The single metric: **do the citizens evolve and persist.** Everything else is instrumental.
- **The engine is BUILT and WIRED** — full reads prove it. The `.claude/terminals/engine-sheet/TERMINAL.md` line "engine broke / can't be fixed / delete it / rebuild beats repair" is FALSE. Do not act on it. (Mike is keeping it as a deletion lever.)

## Method (per file)
1. Read the file in full. No grep.
2. Extract: gate/eligibility; Layer-1 (what fires + probability inputs); Layer-2 (tags→dials via `citizenDialMap` + any structural SL-column mutation); cross-sheet couplings (which sheets it reads/writes); full-read catches (stubs, stale footers/doc-drift, residual wall-clock `ctx.now`/`new Date()`, anything a grep would miss).
3. Write the entry in the existing ENGINE_COUPLING_MAP format. Mark FULL-READ.
4. Commit ONLY if Mike approves.

## The core logic already established
- Event → tag → dial: the dial effect applies once, on **fold-on-trim** in `compressLifeHistory.js` (Phase 9), when the event ages out of the 20-entry window. `citizenDialMap` 3-stage resolver → every event moves a dial.
- Back-arc: each dial governs the frequency of its own domain (drive→career, sociability→relationship, family→household, openness→education, outabout→neighborhood, integrity→conduct-reachability).
- Cross-engine cascades: career→`businessDeltas`→economicRipple→`World_Population`→citizen event probability; relationship→`cycleActiveCitizens`→bonds→`allianceBenefits`→back into event probability; generational death→inheritance→heir wealth.

## DONE (full-read + in the map)
dialmap, citizenMemory, compressLifeHistory; runCareerEngine, runHouseholdEngine, runConductEngine, runRelationshipEngine, runNeighborhoodEngine, runEducationEngine, generationalEventsEngine, generateCitizensEvents, generateCivicModeEvents, generateMediaModeEvents, generateGameModeMicroEvents, generateGenericCitizenMicroEvent, runYouthEngine; worldEventsEngine, faithEventsEngine, buildCityEvents, chaosCarsEngine; economicRippleEngine, bondEngine; generationalWealthEngine, educationCareerEngine, migrationTrackingEngine, gentrificationEngine; civicInitiativeEngine.

## CROSS-FILE TODOs (open questions a single-file read can't answer — resolve when mapping the consumers)
- **Initiative ripple consumer:** does ANY engine call `applyActiveInitiativeRipples_` / `getRippleEffectsForNeighborhood_` (defined in civicInitiativeEngine, zero in-file callers, header says "Phase 02 or 06")? If not, initiative ripples never decay/expire/reach neighborhoods — only the first-cycle immediate sentiment delta lands. Citizen-impact path (sentiment → event probability). Confirm when reading Phase 2 / Phase 6.

## NOT DONE (full-read needed)
- Civic/vote: runCivicElectionsv1, runCivicRoleEngine, updateCivicApprovalRatings, updateCivicLedgerFactions, generateMonthlyCivicSweep. *(civicInitiativeEngine DONE S277 — Sonnet-mapped + Mags full-read audit.)*
- Intake/lifecycle: processIntakeV3, processAdvancementIntake, checkForPromotions, runAsUniversePipeline, applyNamedCitizenSpotlight, applyChaosDecay, seedRelationBondsv1, bondPersistence.
- Persistence/ledger spine: initSimulationLedger, persistenceExecutor, commitSimulationLedger, writeIntents, v3NeighborhoodWriter (the pulse-fold target).
- Phase 1 orchestrator (godWorldEngine2), Phase 2 world-state, Phase 3 population, Phase 6 analysis, Phase 7 evening-media, Phase 8 v3, Phase 9 digest (rest), Phase 10/11, lib/.
- The Simulation_Ledger sheet-interaction map: NOT written. Build it from full reads only (an earlier grep attempt was wrong).
