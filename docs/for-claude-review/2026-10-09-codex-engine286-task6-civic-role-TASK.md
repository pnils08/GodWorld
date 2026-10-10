# codex TASK — engine.286 Task 6 design review (civic role → hood events with aura weight)

From: engine-sheet, 2026-10-09. Read-only on code. Findings against code with file:line; no alternative designs.
Output: `docs/for-claude-review/2026-10-09-codex-engine286-task6-civic-role.md`.

Read: `docs/plans/2026-10-08-engine-286-game-of-life-events.md` — the two builder quotes of 2026-10-09 on the civic role engine (§Builder's words) and Task 6 row (design record + build facts). Code: `phase05-citizens/runCivicRoleEngine.js`, `utilities/citizenDialMap.js`, `utilities/compressLifeHistory.js` (fold :1610–1650), `utilities/neighborhoodPulseMap.js`, `phase08-v3-chicago/v3NeighborhoodWriter.js` (:309, :525–529), `phase02-world-state/loadEventContentLedger.js`, `phase05-citizens/generateCivicModeEvents.js`, `phase01-config/godWorldEngine2.js` :630–660 and :2345–2380.

Questions:
1. Moving the call from :635/:2352 to after applyBusinessDynamics_ (:641/:2358): does anything between read the ledger rows / LifeHistory the civic role engine mutates, or S.eventsGenerated, such that order changes output? Is there a business-open/close and initiative-site-work signal in S at that point the engine can read per hood?
2. Aura on the hood pulse: graded pulse tags vs a weight argument on recordPulse_ — which fits the engine.33 dampened fold without touching v3NeighborhoodWriter?
3. Graded dial tags (CivicRole-Up/Down × S/M/L) in citizenDialMap: does anything else read the `CivicRole` tag (TAG_TRAIT_MAP compressLifeHistory.js:219, wake perception salience, scanners, tests) that a tag rename breaks?
4. Down-draw seam: confirm a civic role negative event cannot duplicate civic-mode events or Civic_Office_Ledger AutoScandal narration for the same citizen in the same cycle (plan N15/N24).
5. Non-canon-altering: list every write the redesigned engine would make; flag any that touches office, approval, status, money, job or household.
6. ECL: what the loader needs (whitelist, primaryFromTags branch, DSL fields for approval/fame/tier) for civic role lines to draw from `civic.*`/`hood.*` pools by condition.
