---
title: Family/Household Loop — audit + final-concept research
created: 2026-07-13
updated: 2026-07-13
type: reference
tags: [research, engine, citizens, household, family, bonds, active]
sources:
  - SANDBOX C133 execution log (Drive 1c1I8HoYJAuIFtZLhAlKY48SP4Pz2oK9R) + live sandbox sheet pulls (2026-07-13, engine-sheet terminal)
  - 3-agent audit this session — household coverage (sandbox data), family/bonds code seam trace, age/career/income audit
  - Mike-direct design direction, same session
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — registered same commit"
  - "[[../SIMULATION_LEDGER]] — citizen column reference this redesign lands on"
  - "[[../plans/2026-07-12-engine55-intra-city-relocation]] — relocation engine this must stay compatible with"
---

# Family/Household Loop — audit + final-concept research

**Source:** SANDBOX C133 test cycle (clean run, 0 engine errors) + full audit of the five family-relationship data surfaces, engine-sheet terminal, 2026-07-13. This is internal audit research, not source-mining — captured so the final household/family/bonds concept doesn't live only in a chat transcript.

**What this addresses:** Mike named this one of the final loops to close: household, family, bonds, and the ledger are "various systems fighting to be the same thing and not one of them accomplishing anything." This doc records the verified current state, the design decisions already made, and the open rule still to set.

---

## 1. Verified state (sandbox, C133)

| Surface | Verified reality |
|---|---|
| **Simulation_Ledger** family cols | 856 active citizens. MaritalStatus written only by `checkWedding_` (generationalEventsEngine.js:350); NumChildren only by `checkBirth_` (:368, parent-side counter only). ParentIds/ChildrenIds: **no cycle-path writer, empty `[]` for essentially all citizens.** No SpouseId column exists. |
| **Household_Ledger** | 504 active households covering 558/856 active citizens → **298 unhoused (35%)**. 451/504 (86%) are single-member rows duplicating SL data; 52 couple; 1 family. CreatedAt/LastUpdated are real-world Gregorian clocks (mixed ISO + M/D/YYYY); FormedCycle/DissolvedCycle are cycle-stamped. `HouseholdIncome` written independently by TWO engines (householdFormationEngine `updateHouseholdIncomes_` + generationalWealthEngine `updateHouseholdWealth_:645-654`). `HouseholdWealth` + `SavingsBalance` are write-only columns — zero readers. |
| **Family_Relationships** | **Zero readers. Only writer** (`recordInheritanceInFamily_`, generationalWealthEngine.js:553-590) can only annotate `parent-child` rows that nothing ever creates → structurally inert since landing. Mike manually re-formatted the tab this week: `HouseholdID | Husband | Wife | RelationshipType | SinceCycle | Status | Child1..Child5` (2 rows, one with malformed 4-digit POPID). |
| **Relationship_Bonds** | Per-cycle working set — full replace each cycle by design (`saveRelationshipBonds_` queueReplaceIntent). Seeder (`seedRelationshipBonds_`, every cycle) tops up to a 500-bond cap. C133 census: 176 friendship / 75 professional / 55 family / 4 alliance / 5 rivalry / 4 neighbor / **0 romantic**. |
| **Relationship_Bond_Ledger** | Append-only history log, 16,378 rows and growing every cycle (`saveV3BondsToLedger_`, bondEngine.js:1450, appends this-cycle-touched bonds). **Zero readers anywhere.** |

### The broken causal chain (why the loop doesn't close)

1. **Weddings marry citizens to nobody.** `checkWedding_` names a spouse only from a `romantic` bond — and nothing ever creates romantic bonds (0 exist). Every wedding is a solo MaritalStatus flip: spouse's row untouched, no household merge, no family row. Result: 383 married citizens, only 16 pairs sharing a household, 238 married-but-sole-member, 107 married with no household at all.
2. **Births create no child.** NumChildren++ on one parent (explicit S248 decision, now reversed — see §2). No child row, no ParentIds/ChildrenIds, no household member.
3. **Divorce has zero implementation** anywhere. `processMarriages_` / `processDivorces_` / `generateBirths_` in householdFormationEngine.js:656-685 are TODO stubs returning `[]` every cycle since landing.
4. **Bond intensity is causally inert** except rivalry confrontations (bondEngine.js:1064-1110). Romantic bond existence adds +0.01 to wedding odds; intensity value ignored entirely.
5. **Phase-5 story hooks never reach the newsroom.** storyHook.js:1505 overwrites `ctx.summary.storyHooks` (built fresh from `[]` at :81) — relocation/wealth/education/trajectory hooks silently discarded before the deck writes. C133: 2 relocations landed in the sheets, 0 in Story_Hook_Deck.
6. **Income is age-blind.** 34 minors (<16) earn $33-39k. Poster case POP-00744 Tomas Renteria: age 10, $39k, "Podcast Host / Line Cook," YearsInCareer=36. CareerStage IS age-gated (educationCareerEngine.js:279-300: <22 student, ≥65 retired) but both income paths never read BirthYear (applyEconomicProfiles.js:156; generationalWealthEngine.js:223 — zero BirthYear refs in the whole wealth engine).
7. **Every engine counts citizens differently.** Bond seeder 856 / bond engine 662 active-657 pool / wealth engine 887 / ledger total 914 rows. No shared "who counts" definition.
8. **C133 orphan case:** HH-0084-525 dissolved correctly (empty Members) but its head POP-00744 is Active with no household — dissolution never re-homes survivors.

---

## 2. Decisions locked (Mike-direct, 2026-07-13)

- **D1 — Spouses come from the ledger, bond-driven.** New marriages form between two existing on-ledger citizens: bond engine creates romantic bonds between compatible singles (age-appropriate), intensity grows/decays per cycle, threshold crossing makes the pair wedding-eligible. No spouse-spawning at wedding time for on-ledger pairs.
- **D2 — Births create real citizen rows.** Reverses S248. A birth = new SL row (age 0, student, income 0) + ParentIds/ChildrenIds written both directions + household member added + family register row updated.
- **D3 — Household_Ledger is universal and single-owner.** Every active citizen belongs to exactly one household. Housing economics (rent, savings, burden, displacement) live ONLY in Household_Ledger; identity lives ONLY in Simulation_Ledger — duplicated fields get one owner. Gregorian clock columns (CreatedAt/LastUpdated) become cycle stamps. Write-only columns (HouseholdWealth, SavingsBalance) die.
- **D4 — Family_Relationships becomes THE human-readable family register**, Mike's format: one row per family unit — `Husband | Wife | RelationshipType | SinceCycle | Status | Child1..Child5` — engine-maintained at wedding/birth/divorce/death, with **names alongside IDs in every cell** (`POP-00594 Roger Corliss`) so the sheet reads without a lookup.
- **D5 — Everything lands in Simulation_Ledger.** The citizen's row must show their family state (spouse, children, household) — if it isn't visible there, nobody ever sees it. Requires a SpouseId/Spouse column (does not exist today).

## 3. The open rule — legacy married-without-spouse (~367 citizens)

Mike's constraints (2026-07-13):
- "World catches up" intermarriage rejected — pairing 367 marrieds with each other ≈ 700 citizens married inside the sample, implausible.
- Blank spouses rejected — households can't function (no spouse income → wrong burden → can't move correctly).
- Existing canon: some spouses are off-ledger/untracked → an untracked spouse needs a **generic salary** for household physics.
- Lifecycle-wake gap: a married citizen with no spouse in the data has nothing to talk about — the spouse needs at least an **identity** (name), not just a number.

**REJECTED (Mike, 2026-07-13): "Off-Ledger Spouse" — name + generic salary without a citizen row.** Rejected same session it was proposed. The rule for the legacy marrieds is still OPEN — Mike defines it; do not re-propose ghost-spouse variants.

## 4. Mechanical fix queue (not forks — execute once design is set)

| # | Fix | Anchor |
|---|---|---|
| F1 | Age-gate both income paths (+ YearsInCareer sanity) | applyEconomicProfiles.js:156, generationalWealthEngine.js:223 |
| F2 | storyHook.js merge instead of overwrite (Phase-5 hooks reach the deck) | storyHook.js:81, :1505 |
| F3 | Single writer for HouseholdIncome; delete write-only columns | generationalWealthEngine.js:597-663 |
| F4 | Bond engine double-run (Phase 5 + v3Integration, second with sources=[]) | godWorldEngine2.js:306 + v3Integration.js:140 |
| F5 | Dissolution re-homes surviving members (POP-00744 case) | householdFormationEngine.js:845 area |
| F6 | Shared active-citizen filter across engines (one definition of "who counts") | bondEngine/seedRelationBonds/generationalWealth |
| F7 | Repair existing 34 minor-income citizens + malformed Family_Relationships POPIDs | data repair, after F1 lands |
| F8 | Household_Ledger clock columns → cycle stamps | Household_Ledger schema |

**Not applicable / hazard:** Do not delete Relationship_Bond_Ledger despite zero readers — it is the only bond history that survives the per-cycle replace of Relationship_Bonds; the redesign should give it a reader (or fold history elsewhere) before any trim. Divorce mechanics are greenfield — nothing to preserve. Any child-row creation (D2) grows population every cycle; growth rate needs a dial at build time.

**Verdict:** adopt — decisions D1-D5 locked; OLS rule pending Mike's confirmation; then a build plan (`docs/plans/`) sequences D1-D5 + F1-F8.
