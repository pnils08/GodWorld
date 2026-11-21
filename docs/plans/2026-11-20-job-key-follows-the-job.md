---
title: Job Key Follows The Job Plan
created: 2026-11-20
updated: 2026-11-20
type: plan
tags: [engine, active]
sources:
  - phase05-citizens/runCareerEngine.js (matchUnemployedToOpenings_, the two field-change hire paths)
  - phase05-citizens/educationCareerEngine.js (catalogRoleKey_, the settlement's key write)
  - output/engine-sheet/2026-11-20-tier1-check/recheck.md (item 7)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.354"
  - "[[../SIMULATION_LEDGER]] — column AR EconomicProfileKey"
---

# Job Key Follows The Job Plan

**Builder's words (2026-11-20):** on Perez, Cloak and the council keys: "My ruling is they are broken". On pay: "They make what is says them make". On the sheet: "Nothing touches my sheet until you tell me what you're editing". On the order: "Ok let's address those items and then move to the 119 without a job key".

**Goal:** a citizen's EconomicProfileKey names the job the citizen holds, and stays so when the engine changes the job.

**Rows:** engine.354 · **Owner:** engine-sheet

## What the code and the sheet show

- The key's text is read by nothing in the engine. Its presence is a switch: non-blank → `calculateCitizenIncomes_` leaves Income alone and a long hospital stay can cut it; blank → the unseeded fallback fills a zero Income; `SPORTS_OVERRIDE` → sports layer. Income is never re-priced from the key, so no pay moves in this plan.
- Engine writers of RoleType: the intake door (re-keys, engine.338), the 18th-birthday settlement (keys, `catalogRoleKey_(role) || role`), `sportsRetire_` (clears the sports key), and the career engine's two field-change hire paths — which changed the job and left the key. Live proof: POP-00168 (C109, Biotech Lab Assistant, key Midwife), POP-00184 (C112, Community Programs Coordinator, key Food Bank Coordinator); POP-01070 (C114) had no key.
- Live sheet 2026-11-20, living non-GAME rows with a key: 114 ENGINE-clock rows where the seeding map (`data/role_mapping.json`) names a different list entry than the key (Server keyed Solar Installer); 16 more of the same kind whose job spelling the seeding map lacks ("Security guard" keyed Barbershop Owner) and one CIVIC row (PUBLIC DEFENDER keyed Civil Rights Attorney); the two field changes above. All 114 were already so in the earliest saved ledger copy (2026-08-12, `fb377ffed`); the seeding ran 2026-03-01 from RoleType, so the job text was rewritten between those dates by a writer no surviving record names.
- Left as they are: 268 rows whose key is the seeding map's entry for their job (Editor-in-Chief keyed Journalist / Reporter); rows with no key.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Both field-change hire paths in `matchUnemployedToOpenings_`: a row that carries a key takes `catalogRoleKey_(newRole)`, else the new title (the settlement's fallback); a row with no key keeps none. No test written or run (test guard, builder 2026-11-20); the bench is the proof | es | done (this commit) |
| 2 | Bench SANDBOX 1004, PROD stage 61 + the file, live-synced C116, bench-only unemployed plants (keyed and unkeyed) tagged for a hiring employer in another field; fire C117; read back job, key, pay | es | done: @219, C117 PASS twice, rule check 5 of 5 on run 2 (DEPLOY_HISTORY §PROD stage 62) |
| 3 | PROD push, built tree = the benched manifest | es | done: PROD stage 62 @197, pull-back identical |
| 4 | Sheet: each wrong key → `catalogRoleKey_` of the job held. The list (name, job, key now, key after) goes to the builder first; written on his go through `lib/sheets`, read back. Key cell only | es | done (builder 2026-11-20: "Yes"): 132 AR cells written in one batch, read back 132/132, 0 other cells changed on those rows, 0 keys changed on other rows. List `output/engine-sheet/2026-11-20-e354/job-keys-to-correct.md`, before-copy `keys-before.json`, log `keywrite.log` |
| 5 | Jobs the list has no entry for (police chief, fire chief, council member, the media titles): his next item, scoped with him when reached | es | open |

## Acceptance

1. Bench C117: a keyed plant hired across fields ends with key = `catalogRoleKey_(new job) || new job`; an unkeyed plant hired across fields ends with no key; 0 new Engine_Errors.
2. Live sheet after Task 4: every row on the approved list reads back the new key; no other cell on those rows differs from the before-copy.

## Changelog

- 2026-11-20 (es) — Task 4 written on the builder's "Yes": 132 keys, read back 132/132, nothing else on the rows moved.
- 2026-11-20 (es) — bench C117 PASS (run 1's employer predictions wrong, run 2 checks the rule: 5 of 5); PROD stage 62 @197. Task 4 list is 132 rows, not the 116 first said: 16 more under job spellings the seeding map lacks.
- 2026-11-20 (es) — opened on the builder's word; Task 1 built.
