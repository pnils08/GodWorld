---
title: Published-canon bond mint — canon says "bond" means two different things and the schema holds neither
created: 2026-08-21
updated: 2026-08-21
type: plan
tags: [plan, engine, bonds, canon, crons, active]
pointers:
  - "[[../ENGINE_CRON_LOOP]] — the doctrine this executes: the missing canon→engine return edge"
  - "[[2026-08-21-ctx-rng-attractor-collapse]] — engine.128, gates this plan on the BondId restore"
  - "[[../index]] — registered"
---

# Published-canon bond mint

**Status:** UNBLOCKED — the `engine.128` 53-row BondId restore landed 2026-08-21 (586 rows, 586 distinct ids, 0 collisions). Next gate is the intake build itself.
**Sources:** NotebookLM canon cut (builder-supplied 2026-08-21, source-grounded with
citation indices) + Supermemory cross-cut (`bay-tribune`, `wd-citizens`,
`cp-POP-#####`, `mags`) + codex/kimi preliminary passes.

---

## 1. The finding that reshapes the job

Canon's own definition, from the NotebookLM cut's opening line: in Oakland a
**"bond" is both a binding legal contract securing civic infrastructure and a
relational commitment that aligns or divides the city's figures.**

The engine models only the second, and only a narrow slice of it. The word is
load-bearing in two directions and we built for one.

Canon organises bonds in four tiers:

| tier | example | fits `Relationship_Bonds`? |
|---|---|---|
| I — contractual/financial | Baylight Environmental Remediation Bond (BD-83-REB); $2.1B TIF bond; $28M Stabilization Fund | **no** — instruments, not people |
| II — locker room / front office | Dillon↔Keane farewell pact; Paulson↔Abraham | yes |
| III — political/legal/corporate | Varek↔Paulson; Varek↔Ramos recusal; Rivers↔Crane | partly |
| IV — relational/grassroots | Keane↔West Oakland families; Davis↔Montez; Kelley↔Foothill Baptist | **partly** |

## 2. Three structural gaps in the schema

`Relationship_Bonds` is `CitizenA` / `CitizenB` — two parties, POPID on both
sides. Verified: **all 586 live rows have a POPID in both columns, zero
exceptions.** Canon does not fit it.

**Gap A — citizen ↔ institution.** Much of canon's relational record binds a
person to an organisation, not to another person:

- Mark Aitken ↔ **Athletics Front Office** ($225M anchor contract through 2043)
- Isley Kelley ↔ **Foothill Baptist Tabernacle** (vested guest deacon)
- Claire Ashford ↔ **B'nai Tikvah Congregation** (grief circles, food pantry)
- Vinnie Keane ↔ **West Oakland youth/families** (Firehouse 29 academy)
- Supermemory C103: Vanessa Ramas / Treary / Yuki Ji ↔ **A's management**;
  Guadalupe Lupe / Ollie Campbell / Trenton Nawan ↔ **Oaks**

**Gap B — more than two parties.** Canon routinely binds three or more:
BD-83-REB names Keisha Ramos, Dr. Leanne Wu, *and* the Baylight Private
Development Consortium (a Delaware LLC). The Stabilization Fund binds Marcus
Webb, Brenda Okoro, and West Oakland residents.

**Gap C — bond nature is not bond type.** The current `BondType` vocabulary
(friendship / professional / family / rivalry / alliance / romantic) cannot
express what canon actually records. Varek↔Ramos is not a "rivalry" — it is a
**forced legal separation**, a four-part recusal protocol that exists precisely
because the two must *not* interact. Rivers↔Crane is a **forced bipartisan
marriage** under a Cycle-102 deadline. Collapsing either into `rivalry` throws
away the thing that makes it a story.

**RULED 2026-08-21 (builder): the world runs OFF the engine, not IN it.**
Gaps A, B and C are **not** schema growth. Citizen↔institution bonds, 3+ party
bonds and bond *nature* are the world; they do not need engine columns to be
real. The engine carries only what it must to drive the next cycle — the
cheap causal layer. Everything richer stays with canon and the crons, where it
already lives and already works.

So the mint does **not** widen `Relationship_Bonds`. It writes only the rows
the engine needs to *act* on, and leaves institutional and multi-party bonds
in the canon/cron layer that already holds them. See
[[../ENGINE_CRON_LOOP]] §4.5 for the test: *does the engine need this to
compute the next cycle?* If it only needs to be known, it is not a column.

## 3. What canon confirms, corrects, and adds

Against codex's four-pair proposal:

**Confirmed, and stronger than proposed:**
- **Benji Dillon ↔ Vinnie Keane.** Not merely teammates. Dillon signed a
  deliberate **one-year contract** to ride out his final season alongside Keane
  — "One Last Run." A covenant, not a co-location. High positive intensity.
- **Mike Paulson ↔ Elliot Abraham.** Master-apprentice. Paulson recruited his
  former Chicago Bulls lieutenant (MIT-trained quant), publicly calls him his
  **"young Jedi"** and operational proxy. Positive, structural.

**Corrected:**
- **Keisha Ramos ↔ Elias Varek** is not a rivalry. It is a legally-mandated
  firewall: Varek's "triple overlap" (Oaks owner, Civis founder, waterfront
  equity, stadium naming rights) forced Ramos to execute a four-part recusal
  protocol barring his firms from the $2.1B Phase II build. See Gap C.

**Not in the canon cut:**
- **Paulson ↔ Deacon Seymour.** The NotebookLM pass covers Paulson heavily and
  never raises Seymour. That bond's evidence is Edition 79 plus the live cron
  layer — Seymour carrying strain over never having had a sustained in-person
  stretch with the GM who hired him. It stands, but it is *cron-sourced, not
  canon-cut-sourced*, which is itself the [[../ENGINE_CRON_LOOP]] thesis in
  miniature: the crons hold relational truth the canon index does not.

**New, missed by both agents:**

| pair | nature |
|---|---|
| **Elias Varek ↔ Mike Paulson** | **negative, calculated.** Varek uses Paulson's loud sports persona as a "heat shield" to absorb public fury while he quietly takes municipal zoning and data contracts. Jax Caldera exposed it. |
| Janae Rivers ↔ Elliott Crane | forced bipartisan working group, non-negotiable C102 deadline to define citywide "strain" |
| Leonard Tran ↔ Janae Rivers | tactical alliance — combined single-vote OARI renewal-plus-expansion |
| Warren Ashford ↔ Brenda Okoro | hostile oversight; adversarial audit over the 83 backlogged households |
| Warren Ashford ↔ Bobby Chen-Ramirez | structural audit of the Temescal double-shift excavation |
| Darrin Davis ↔ Rafael Montez | positive; ride-alongs, youth clinics, quiet advocacy for alternative mental-health response |

The Varek↔Paulson negative bond is the strongest argument for doing this
properly: it is a central antagonistic relationship in the city's power
structure, fully documented in canon, and neither hand-pass found it.

## 4. Ashford family tie — RULED, degree still open

**RULED 2026-08-21 (builder): Claire Ashford and Warren Ashford ARE related.**
NotebookLM floated it on surname; the builder confirmed it as canon. Warren is
becoming the civic villain, and a family member doing hands-on community work he
votes against is the counterweight.

**Ledger constraints, read before proposing a degree:**

| | POPID | age | gender | hood | marital | children |
|---|---|---|---|---|---|---|
| Warren Ashford | POP-00504 | 70 (BY 1971) | male | Rockridge | married, no SpouseId | **0** |
| Claire Ashford | POP-01071 | 28 (BY 2013) | *(empty)* | Piedmont Ave | single | 0 |

42-year gap. Claire's Piedmont Ave residence matches canon exactly — B'nai
Tikvah's **Piedmont Avenue** campus.

**Father/daughter is ruled out by the ledger, not by taste.** Warren's
`NumChildren = 0`, and that field is meaningfully populated rather than
defaulted: only **7 of 80** married citizens aged 60+ carry 0 (8%). Warren is
genuinely in the childless minority. Minting a daughter would contradict
established citizen data and force a `NumChildren` write — and `NumChildren` is
engine-facing, so under [[../ENGINE_CRON_LOOP]] §4.5 that is exactly the kind of
column change that needs a real reason, not a story convenience.

**RULED (builder, 2026-08-21): uncle / niece.** It fits the 42-year gap, contradicts nothing,
requires no engine write, and is the sharper story — a childless councilman
whose niece runs the grief circles and food pantry his votes defund. Cousin or
great-niece also work; father/daughter does not.

**CLOSED (builder, 2026-08-21):** Claire is **female** and holds a **masters**.
Both written to `Simulation_Ledger` row 957 (POP-01071) and read-back verified;
`dumpLedger.js` refreshed so `canon-name-check` sees them. Values taken from the
controlled vocabulary already in use (`female` ×410, `masters` ×78) rather than
introducing new tokens.

A masters sharpens the contrast the tie exists for: Warren's public line on
these programmes is fiscal discipline; his niece is a credentialed professional
choosing unpaid grief-circle and food-pantry work. Not a hobbyist — someone who
could be doing anything else.

## 5. Sequence

1. ~~`engine.128` 53-row BondId restore~~ — **DONE 2026-08-21.** BondId is unique
   across all 586 rows for the first time.
2. ~~Builder rules on Gaps A/B/C~~ — **DONE.** No schema growth; the world runs
   off the engine, not in it ([[../ENGINE_CRON_LOOP]] §4.5).
3. Build the intake against the **live** cron feed first (ongoing, closes the
   loop), backfill the 104-cycle canon corpus second.
4. Codex's four pairs are the **acceptance test**, not the deliverable. If the
   intake is right they mint themselves.

## 6. Provenance note

The Supermemory cross-cut arrived truncated mid-row at "Darius Clark
(POP-00961) | Neighborhood" — sections on civic offices and A's/Oaks never
landed. Both Drive read paths return the identical truncation. Re-export needed
before the backfill pass.

Verified POPIDs from the Supermemory cut: POP-00265 Matty Lipo, POP-00871
Latasha Owusu, POP-00961 Darius Clark, POP-00005 Mags Corliss — all present in
the ledger.

---

## 7. Full Supermemory pass — what the complete report adds

The truncated section landed. Three things in it change the build.

### 7.1 Canon states a bond-health test, and it is implementable

> "Citizen **bonds** are healthiest where people can **name each other** and a
> **ritual or obligation**; they're worst where **institutions move bodies**
> (bullpen, stalls, disbursement) **without a face or reason**."

That is not colour — it is a scoring rule, and the report supplies the markers:

| healthy | brittle |
|---|---|
| named reciprocity | unexplained roster moves |
| rituals (dock bench, market bumps) | stat–win dissonance |
| letters of civic hope | quiet blocks, after-hours lockout |
| marriage with intact self | initiative stall without a face |
| | fund "activity" with no recipient story |

Detector-framer split applies: the markers are deterministic enough to score in
code; the framing stays in the desk skills.

Note what this implies for Gap A (§2). The *worst* bonds in canon are precisely
the citizen↔institution ones — a bullpen move, a stalled hub, a disbursement
with no recipient. Those are exactly the rows the current two-POPID schema
cannot hold. **The schema is blind to the bond class canon says matters most.**

### 7.2 The intake source is named

> "`cp-POP-*` spaces: per-person PRESS / CONVO / NIGHT / tension sheets — **the
> raw 'bonds' instrument**."

That is the live feed for the intake, stated by the corpus itself. Hundreds of
per-citizen containers, already structured as party / tension / affect / ask.

### 7.3 New named tensions with verified POPIDs

| citizen | bond under stress |
|---|---|
| Adash Stanley (POP-01023) | self ↔ team usage — content personally, wants playmaking used |
| Darius Clark (POP-00961) | Nightline Station "too quiet" — safety/service shift |
| Omar Cleo (POP-00290) | late-shift worker ↔ city amenities, thin after 5pm |
| Melton Neilon (POP-00170) | baker ↔ Grand Lake commerce, empty storefronts, landlords vs retention grants |
| Vladimir Gonzalez (POP-00598) | player-as-citizen ↔ city; defines the "civic gap", Fruitvale first |

C103 heat rank: sports-governance opacity > Adash box-score-vs-results >
Nightline quiet > late-shift access.

### 7.4 POPID integrity — a hard gate, not a review step

The report labels Benji Dillon **POP-00783**. That is **Yuki Ji** — a name
listed one row above in the report's own §2B table. Benji Dillon is
**POP-00018**.

kimi made the identical error with POP-00705 (Jessie Berry, lifted from the
adjacent Aitken row). Two independent canon-synthesis agents, same mechanism:
**the POPID is grabbed from spatially-adjacent context instead of resolved from
the name**, and both reports claimed their IDs were verified.

A wrong POPID in a bond mint does not fail loudly — it writes a real edge
between two real citizens who have no relationship, and the next cron speaks
from it as canon. **The intake must resolve name→POPID in code and fail closed
on mismatch.** Never accept a supplied ID. See
[[../../../.claude/rules/identity]] accuracy discipline and auto-memory
`feedback_never-trust-agent-supplied-popids`.

Verified from this pass: POP-01023 Adash Stanley, POP-00290 Omar Cleo,
POP-00170 Melton Neilon, POP-00598 Vladimir Gonzalez, POP-00961 Darius Clark,
POP-00265 Matty Lipo, POP-00527 Mike Paulson, POP-00789 Elias Varek,
POP-00018 Benji Dillon. Rejected: POP-00783 as Benji Dillon.

### 7.5 Stale figure, noted

The report cites "~675 citizens" in the ledger. Live is **964**. The report
flags its own staleness risk ("live sheet/engine may have moved"). Treat its
counts as indicative, its *names* as the payload.
