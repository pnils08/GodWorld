# EconomicProfileKey — every writer and user, read from the code 2026-11-21 (engine-sheet)

Read-only. Nothing here comes from the rejected plan; each line is a file:line opened this session. No repair proposed.

## Writers — two rules in the code

**A. The seeding scripts (hand-run Node, no cron line names them):** label = `data/role_mapping.json[RoleType]`, a pay profile on the job list chosen as the nearest fit — `scripts/applyEconomicProfiles.js:177` (`Editor-in-Chief` → `Journalist / Reporter`, `Hair Stylist` → `Barbershop Owner`, `Mayor of Oakland` → `City Council Aide`). The mapping file is loaded only by `applyEconomicProfiles.js`, `seedHouseholds.js`, `aggregateNeighborhoodEconomics.js`, `linkCitizensToEmployers.js`, `integrateAthletes.js` and `lib/economicLookup.js`. No file under `phase*/` or `utilities/` loads it. `scripts/applyCitizenBios.js:92-99` hand-set six city-hall labels to short titles on no list.

**B. The engine:** label = `catalogRoleKey_(job)` (`educationCareerEngine.js:928`) — a trainee title's profession, else the job's own entry when the job text is exactly on the job list, else nothing. Where nothing: the intake door writes blank (`processAdvancementIntake.js:990-1004`); the settlement at 18 writes the job text (`educationCareerEngine.js:1267`); the two field-change hires write the job text on a row that already had a label (`runCareerEngine.js:1984`, `:2052`). `sportsRetire_` clears `SPORTS_OVERRIDE` (`applyGameNightMoments.js:318`).

A and B give different labels for the same job (Hair Stylist: A `Barbershop Owner`; B blank or `Hair Stylist`).

**Engine paths that change RoleType and do not touch the label:** the named-citizen intake edit (`godWorldEngine2.js:1666`), the civic seat turnover (`updateCivicApprovalRatings.js:1372`, `turnoverLedger_`). New-citizen mints write a job and no label (`checkForPromotions.js:366`, `bondEngine.js:2603`, `:2811`).

## Users

- Blank or not: pay fill for a zero Income (`generationalWealthEngine.js:653`), the settlement skips a labelled 18-year-old (`educationCareerEngine.js:1179`), a long hospital stay cuts pay only on a labelled row (`runCareerEngine.js:1488`).
- `SPORTS_OVERRIDE`: `isSportsLayerRow_` (`educationCareerEngine.js:404`) and the Node scripts' skips.
- The words: one place — the reference pay for a self-employed or untracked row uses the label only when RoleType is blank (`generationalWealthEngine.js:1031`).
- Pay, field and hiring read RoleType (`jobReferencePay_`, `roleFieldOf_`, `lookupIncome_`), never the label. The Node scripts look profiles up by `roleMapping[RoleType]`, never by the label cell.

## Live sheet, 1015 living non-sports rows (script `left.js`, measured against rule A)

| | CIVIC | MEDIA | ENGINE |
|---|---|---|---|
| label = the mapping's entry for the job | 2 | 10 | 421 |
| mapping has the job, label differs | 15 | 0 | 2 |
| mapping lacks the job, label present | 29 | 34 | 222 |
| no label | 7 | 3 | 270 |
