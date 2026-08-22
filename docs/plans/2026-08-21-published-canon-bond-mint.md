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

**Status:** design, blocked on the `engine.128` 53-row BondId restore.
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

**These are design calls, not mechanism.** Whether the schema grows a party-type
column, whether institutional sentiment lives in a different tab, and whether
`BondType` gains a nature/modality field are the builder's to rule on.

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

## 4. Open canon question for the builder

**Claire Ashford ↔ Warren Ashford.** The canon cut flags a *plausible* family
relation on surname alone and never confirms it. If real, her hands-on
synagogue labour is a deliberate counterweight to his adversarial fiscal
votes — a genuine family-across-the-aisle storyline. If coincidence, minting it
writes a false family edge into the ledger. **Do not infer.** Same class as the
open AJ Dybantsa gender question.

## 5. Sequence

1. **Blocked on:** `engine.128` 53-row BondId restore. Canon bonds must not land
   in a table whose primary key still collides.
2. Builder rules on Gaps A/B/C — schema shape before any mint.
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
