---
title: Family/Household Loop — phased build plan (v4)
created: 2026-07-13
updated: 2026-07-13
type: plan
tags: [plan, engine, citizens, household, family, bonds, active]
sources:
  - docs/research/2026-07-13-family-household-loop.md — audit + decisions this plan builds
  - Mike's household model, dictated across v1-v4 corrections (2026-07-13, this session)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — row added on approval"
  - "[[../research/2026-07-13-family-household-loop]] — the research this ignites from"
---

# Family/Household Loop — phased build plan (v5)

**Status: DRAFT v5 — Phases 1 and 3 approved by Mike; v5 folds his corrections to 2/4/5/6. Awaiting full "approved." No phase starts before it.**

## The household model (Mike's, final form — this is the spec)

- **Household_Ledger holds exactly two kinds of rows: married households, and households with kids** (single parents included). Nothing else, ever. A single citizen has no household row — their own ledger income + neighborhood rent drives their housing physics (verified: the relocation engine already runs solo citizens as their own units this way; the 451 existing single-person rows are wrong and get dissolved).
- **Tier 1-2 married citizens get real spouses** — full Simulation_Ledger rows, real names. They wake, get interviewed, carry stories; their families must be fully on camera.
- **Tier 3-4 married without a tracked spouse: the household carries a generic spouse salary**, gated by married/single. Household income = tracked members' income + (married with untracked spouse → generic salary). Family money becomes true; no name is invented anywhere.
- **The unnamed-spouse principle:** a woken citizen speaks in first person — "talked it over with my wife" needs no name. The ledger asserting she exists (married + household + her salary) is what honesty requires. The moment a story or interview demands her name is a promotion moment: the camera turns, she gets her row, Tier 1-2 rules take over.
- **Households are causal inputs:** having a household raises a citizen's chances of marriage and of kids. Events can push a citizen into a household (a single mother forms one; her kids' school quality then plays off the household's neighborhood — SchoolQuality column + neighborhood education data already exist).
- Spouse-row sourcing leans on **Generic_Citizens** (289 people-shaped rows) so the tracked population doesn't marry only itself into one family tree.
- **Marriage has exactly one road: the bond system.** Only married citizens and single parents are ever on the Household_Ledger, so every new marriage must come through built courtship — bonds that make friends, conflicts, enemies, and romance.
- **Where relationships live (Mike-direct, v5):** the bonds tab stays the machine-readable graph; every relationship *event* (became friends / falling out / made an enemy / started courting) writes a LifeHistory line — the citizen's engine life bio, the memory wakes and interviews actually read — so a woken citizen *remembers* the friendship, not just has it. CitizenBio carries the standing human-readable digest on the row. No column Q (verified live: LastUpdated is written on all 914 rows — repurposing collides), no new columns.
- **Single mothers form true households — rare, a real slice of the population** (Mike-direct, v5).

**Explicitly not built (Mike-direct):** divorce, death-of-spouse, move-out machinery for families — "maybe in time, we don't have 1 true citizen yet." No additive Simulation_Ledger columns — SpouseId reuses dead column P.

**Rules of execution:** engine-sheet builds phases in order. One report per finished phase, silence between. Any surprise forcing a design change stops the phase and goes to Mike before code. Pacing numbers proposed at each phase start for Mike's approval. Local commits only until Phase 7's single sandbox deploy.

---

## Phase 1 — Foundations

- `SpouseId` into **column P** (CreatedAt — 9/914 filled, near-dead). Step 1: verify zero live writers; any found → stop and report. The 9 stray values logged in the commit.
- Commit the already-approved age-gate edits (income 0 under 16; seeder skips minors; career years from 22; the 34 kid salaries zero on next run)
- Story-hook merge fix — the engine generates move/wedding hooks and throws them away; after this the newsroom sees them

## Phase 2 — Household_Ledger becomes the two-type ledger

- Dissolve the 451 single-person rows (measure-twice: confirm each affected citizen's physics runs off their own row through the solo-unit path — verified in code, re-verified against live data before the cut)
- True-up the surviving married/with-kids rows: membership, combined income
- **Generic spouse salary wired in:** married citizen + no tracked spouse → household income includes the generic salary (rate table proposed at phase start for approval)
- Clock columns trimmed to **FormedCycle + DissolvedCycle only** — the two Gregorian columns (CreatedAt/LastUpdated) are dropped, not converted; no household needs four clocks (Mike-direct, v5)

## Phase 3 — Tier 1-2 families become real

- Every married Tier 1-2 citizen gets a real spouse row — drawn from Generic_Citizens where one fits, created where none does (list of affected citizens + proposed spouses presented for approval before any row is written)
- Spouses land with SpouseId both directions, household row per the model, Family_Relationships register row (name beside every ID)

## Phase 4 — Households drive fates (causal wiring)

- Household presence raises marriage odds and kid odds in the existing event engines
- Events can push citizens into households (single-parent formation included); kids' school quality reads the household's neighborhood
- Register (Family_Relationships, Mike's format: Husband | Wife | RelationshipType | SinceCycle | Status | Child1..Child5) maintained by the engine at every family event

## Phase 5 — Bond persistence and new marriages (the heart, and the hardest build)

- Bonds persist across cycles (today the tab is wiped and re-seeded; intensity is static and causally dead) — load → update → save; re-seed only tops up missing coverage
- Intensity grows with shared context, decays with absence (ctx.rng, deterministic); bonds differentiate into friends / conflicts / enemies / romance; a grown bond between eligible singles becomes romantic — the only source of new marriages in the model
- Every relationship event writes its LifeHistory line (the citizen remembers it; wakes speak it) + CitizenBio digest updated
- New weddings: grown romantic bond, or a Generic_Citizens spouse — both write MaritalStatus + SpouseId on both rows, form the household, write the register row
- Fix the bond-engine double-run (Phase 5 + inside v3Integration with empty sources)
- Expect iteration here — mechanics proposed in detail at phase start before any code (Mike: "not sure how this will work")

## Phase 6 — Births, only into households

- `checkBirth_` fires only for citizens in an established household; no household, no birth
- A birth creates a real ledger row: age 0, student, income 0, household's neighborhood; ParentIds/ChildrenIds both directions; household Members + register Child slot updated
- Pace proposed at phase start

## Phase 7 — One sandbox test, full loop

- Single clasp deploy (DEPLOY.md guard), Mike fires the cycle
- Verification against the sheet: no single-person households; married T3-4 household income includes the generic salary; a T1-2 spouse exists as a full row; a wedding shows on both rows and formed a household; a birth is a linked citizen inside a household; the register reads with names; zero under-16 income; life-event hooks visible in Story_Hook_Deck

## Queued (Mike-direct, 2026-07-14) — kids backfill, after P6

Minors on the ledger who share no surname with, and have no ParentIds pointing at, anyone in a household: they get a household with **two generic salaries** (both parents off-camera), with the same drip backfill from the Generic_Citizens pool as spouses got. Generic_Citizens is the preferred way to add citizens — the generator can be turned back on to refill the pool when it runs low (current pool skews 227M/40F; regenerate balanced).

Register format ruling: **Child1..Child5 stays** (positional, birth-order, name-in-cell carries sex).

## Open dials — Mike locks at phase start

- Generic spouse salary rate (flat? banded by neighborhood?) — Phase 2
- T1-2 spouse list + sources — Phase 3
- Marriage/kid odds boost sizes — Phase 4
- Romance threshold + pacing — Phase 5
- Birth pace — Phase 6
