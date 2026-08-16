---
title: New-life intake — complete lives through the door, and the promotion path that has been dead since S205
created: 2026-08-16
updated: 2026-08-16
type: plan
tags: [engine, citizens, intake, tiers, promotion, active]
sources:
  - phase01-config/godWorldEngine2.js §processIntake_ (L1072+) — lean intake v3, engine.51 S302
  - phase01-config/godWorldEngine2.js L1122 — engine.58 S320 GC-as-entry ruling
  - scripts/buildDeskPackets.js:2045 — "S205 Path B: Generic_Citizens read dropped"
  - phase05-citizens/processAdvancementIntake.js — promotion populator, EmergenceCount >= 3
  - Simulation_Ledger (live) — 840 active of ~350k; 54 columns
  - Generic_Citizens (live) — 300 rows, 264 Active; 85 residents across the ten low-track hoods
pointers:
  - "[[engine/ROLLOUT_PLAN]] — engine.108, engine.109"
  - "[[2026-08-15-civic-edge-truth-migration]] — civic.20/21; the hood work that surfaced this"
  - "[[../canon/INSTITUTIONS]] §Neighborhoods — the character layer that drives coverage, hence promotion"
  - "[[index]] — registered same commit"
---

# New-life intake

## 1. The tier model (builder doctrine, recorded 2026-08-16)

The sim tracks a **sample**, not a population. Oakland is ~350,000 people; the
ledger holds ~840 active. That is the 1:~417 ratio the engine's own comments call
"1:438 sample".

- **Tiers 1–4** are *tracked* — full `Simulation_Ledger` rows.
- **Tier 5** is everyone else. `Generic_Citizens` is **Tier 5 in waiting** — the
  named antechamber, not the whole untracked mass.
- **A ledger row is earned.** The rule is *"there should be a reason we are tracking
  you"* (engine.58, S320). Two ways to earn it: **marriage** or **media coverage**.
- **`Advancement_Intake` is the promotion populator.** It exists precisely because a
  Tier-5 row does not carry all the ledger's columns — something must fill the rest
  on ascent. That is its whole job, and it should be reduced to solely that.

**This reframes "empty neighborhoods" completely.** Glenview is not unpopulated. The
sim simply never promoted anyone there into tracking. The city is full; the sample
is thin and unevenly placed.

### 1.1 Correction — the ledger is NOT relationally hollow

An earlier measurement in this thread reported 91% of married citizens with no
`SpouseId`, 89% of parents with no `ChildrenIds`, 46% with no household, and
concluded the sim produces "atomized individuals wearing life-shaped labels."
**That conclusion was wrong and is withdrawn.**

Under the sample model the same numbers read correctly: **an edge can only
materialise when BOTH endpoints are inside the sample.** A tracked citizen who
marries almost certainly marries an untracked one — there is no POPID to point at,
and `MaritalStatus` remains a true fact about the person.

The evidence supports the sample reading over the defect reading:

- Of 346 married-without-spouse, only **24** mention a marriage in `LifeHistory` —
  so the status is mostly authored/seeded biography, not an engine event that failed
  to write a pointer.
- Tier split of married-without-spouse skews Tier-4 (**266** of 346).
- The 36 that *do* carry a `SpouseId` are far above a random 1:417 draw (~1
  expected), which is `bondEngine` preferentially pairing inside the tracked pool.

The lesson is methodological: **the measurement was right and the model was wrong.**
Fill-rate statistics on a sampled ledger cannot be read as completeness statistics.

## 2. THE DEAD PATH — media promotion has been structurally impossible since S205

Two rulings collided and nobody noticed, because each is correct alone.

| | Ruling | Effect |
|---|---|---|
| **S205** | SL is the single source of truth; Generic_Citizens is no-grow legacy | **All GC reads stripped** from the packet/seed path. `buildDeskPackets.js:2045` still carries the comment: *"S205 Path B: Generic_Citizens read dropped."* |
| **S320** | GC-as-entry — GC is the Tier-5 waiting room and the intake landing point; promotion at `EmergenceCount >= 3` | Restored GC as the **entry**. Did **not** restore it as a **readable**. |

Consequence, verified: **no seed or desk packet can see a Tier-5 citizen.** They
cannot be surfaced, so they cannot be covered, so coverage can never tick
`EmergenceCount`. **Of the two documented promotion routes, media coverage cannot
fire at all.** Marriage is the only live one.

The emergence data agrees. 88 of 300 GC rows carry a count above zero, and those
ticks come from `processIntake_` bumping a known name when an operator/story
mentions it. Every promotion to date is operator-driven; none is autonomous.

## 3. Two fixes, doing different jobs

### 3.1 Fallback read — restart the escalator (engine.108)

Seeds pull tracked citizens first; **generics surface only when the neighborhood has
no tracked citizen to offer.** A fallback, not a restore — it honours S205's
"SL is primary" while reopening the path S320 assumed existed.

It self-targets where it is needed: the ten low-track hoods already hold **85 Tier-5
residents** (Ivy Hill 14, San Antonio 15, Grand Lake 14, Eastlake 12, Adams Point
10, Dimond 8, Brooklyn 7, Glenview 5, East Oakland 0, Baylight 0), and they are
exactly the places where no tracked citizen will ever apply.

**PRESENCE BEFORE VOICE — the quoting gap is the mechanism, not a defect.** A Tier-5
may be seen, named, counted and described in a neighborhood. They may **not be
quoted**; they have no wake and no voice. Being observed repeatedly is what earns
the voice. This keeps "nothing is free" intact and gives coverage something to do:
the desk notices someone before it can interview them.

### 3.2 Household intake — put tracked life in the seats now (engine.109)

The organic escalator is slow by design. This event is not organic, and is framed as
a deliberate exception rather than a new standing rule.

**The reconciliation with S320:** the "earn your row" rule governs **atomized
individuals** and should keep governing them. A **complete household** — spouses,
children, a shared address, employers, relationships — arrives having already
answered the question the waiting room asks. *The family is the reason.*

- A lone name → Generic_Citizens, earns its row at `EmergenceCount 3`. **S320 stands.**
- A complete household → mints to the ledger directly.

**Bound the exception in the code, not just here** — a future reader must not find
this and conclude intake mints freely.

**Design target:** the general *create-a-life* path — the game-sense version where a
user creates whoever they want, spouse and children included — used now for a
seeding event. **Intake them as related, and let the cycles form the rest.** We
author the family, not the outcomes.

**Groundwork already verified:**

- The `Intake` tab **already has a `Family` column and it is decorative** —
  `processIntake_` concatenates it into `EmergenceContext` as text, truncated at 250
  chars. No `HouseholdId`, no relationship rows. The intent was there, never built.
- The tab has **zero rows**. Clean slate.
- `householdFormationEngine` already treats **`SL HouseholdId` as membership truth**
  and reconciles every cycle (engine.56), so intake writing a shared `HouseholdId`
  across a family is **adopted, not fought**.

**Route the mint THROUGH the promotion populator, not around it.** A Tier-5 ascending
does not carry every ledger column, which is why `processAdvancementIntake` exists.
Direct-placed households need that same fill path — otherwise we create a third
class of citizen with a different set of holes, and the sim gains a new drift class
on the day it fixes an old one.

## 4. Tasks

| # | Task | Owner | Gate |
|---|---|---|---|
| 1 | Fallback GC read in the seed/packet path — tracked-first, generics when a hood has none | engine-sheet | bench |
| 2 | Presence-before-voice enforced: surfaced generics are nameable/describable, never quotable | engine-sheet | bench |
| 3 | Household mint path — shared `HouseholdId`, `SpouseId` both ways, `ParentIds`/`ChildrenIds` wired | engine-sheet | bench |
| 4 | Mint routes through the promotion populator so column fill is identical to an ascent | engine-sheet | bench |
| 5 | Exception boundary documented in-code at the mint site | engine-sheet | — |
| 6 | Reduce `Advancement_Intake` to solely the promotion/usage system | engine-sheet | after 4 |
| 7 | Seed the event: husbands, wives, children into the hoods canon now calls for | builder + engine-sheet | after 3 |

## 5. Why the canon work is load-bearing here

Promotion runs on coverage, and coverage runs on story. Before 2026-08-16, eighteen
of twenty-two neighborhoods had no authored character, so no desk had a reason to
cover Glenview and no Tier-5 there could ever ascend. The `INSTITUTIONS`
§Neighborhoods pass is therefore not decoration ahead of this build — **it is the
fuel supply for the promotion path** Task 1 reopens.

## Changelog

- 2026-08-16 (engine-sheet) — Plan created. Tier model recorded; the
  relationally-hollow reading withdrawn as a sample-vs-completeness error; the
  S205/S320 collision identified as a structurally dead media-promotion path;
  fallback-read and household-mint specced as separate fixes with
  presence-before-voice as the governing doctrine.
