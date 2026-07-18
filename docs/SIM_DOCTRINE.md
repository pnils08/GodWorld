---
title: Sim Doctrine — what makes GodWorld a sim, not a data system
created: 2026-07-14
updated: 2026-07-18
type: doctrine
tags: [doctrine, engine, canon, always-consult]
pointers:
  - "[[plans/2026-07-13-family-household-loop-build]] — the build where these rules were forged"
  - "[[index]] — registered"
---

# Sim Doctrine (Mike-direct, S318 — 2026-07-14)

Forged in one night's argument. Every rule below is Mike's, stated when a build
violated it. **Consult before designing ANY engine mechanic.** A build that
breaks one of these is wrong even if it works.

## 1. No hands on the output. Ever.
The engine sets **physics** (how fast bonds grow, what a burden ratio does),
never **outcomes** (how many weddings per cycle). No caps, no quotas, no
curation of what the world produces. If three couples mature the same season,
three weddings happen. "How can you control weddings if it's a deterministic
bond system? You should have no control over that." A tuned output is an
edited world; an edited world is not a sim.

## 2. Causes, then dice — and let the dice speak.
Events come from collisions the ledger records (income vs rent, proximity,
promotion vs stagnation) and from genuine rolls (ctx.rng). Do not wrap every
roll in so many conditions the dice can't surprise anyone. Mike designs from
the dice up (the slot machine); the corporate instinct designs from control
down. The project is the first one.

## 3. The world is allowed to hurt people.
Hate, floods, deaths, feuds, bad weather, ruinous weeks — these are not bugs
to gate, they are the missing half of life. A protective default IS a defect:
"no sim ever built has weather 67 every day." When tuning, ask: can this
system produce a bad day nobody softens? If no, it's decoration.

## 4. Everything is read through 1:443.
The ledger samples one citizen in ~443. Two ledger weddings = ~800 weddings
citywide. Rates that look tiny are city-loud. Family events are world texture,
not gameplay churn — a citizen set is a citizen mostly still.

## 5. Adding citizens is adding engines.
Editions have yet to bring one citizen fully to life; growth makes that goal
harder. Completion of the existing 800 beats new arrivals, always.
Generic_Citizens is the ONLY door into the ledger (drip promotion; the
generator restarts when the pool runs low — regenerate balanced). Births and
bond-marriages are rare by PHYSICS (slow growth, strict conditions), not by
quota (see rule 1).

## 6. No ghost people.
Anything person-shaped either lands on Simulation_Ledger or stays fully
off-camera (a generic salary and an unnamed "my wife" is off-camera; a named
person with no row is a ghost — forbidden). "Simulation_ledger is where all
this needs to land or no one ever sees it."

## 7. Bonds cause; events record.
"Marriage comes from bonds not events." State changes originate in the
relationship/economic substrate; the event layer narrates them. A dice roll
that flips a life state with no cause behind it is the old broken pattern.

## 8. What the engine outputs is canon — including the ugly.
A wrong-looking number that fired and surfaced is an event citizens lived
(existing doctrine, extended): a feud, a flood, a collapse produced by honest
physics is never rolled back for being unpleasant.

## 9. GC citizens are protagonists in waiting. (S324)
Tier 5 lives off-camera, living a life, dreaming of making the
Simulation_Ledger. They arrive AS THEMSELVES or not at all. Grabbing one as
a body to backfill a row kills a citizen — backfilling for no reason
destroys the whole sim. GC is a waiting room of dreamers, never inventory.

## 10. The lottery grabs two — they match or they don't. (S324)
"How is it a lottery if it's looking at every citizen? A lottery grabs 2 and
do they match or not." One random citizen, one random opening in the world —
the rare chance of moments aligning: right neighborhood, right age, right
sex. No scanning for a fit, no probability dials, no priorities, no timers.
Zero is the normal cycle. At most 2 land per cycle, period, all doors
combined. Becoming a heritage ledger is the game; this is how the game is
entertainment — chance, not force.

## 11. Marriage is years of a maintained bond. Nothing else. (S324)
A bond establishes, is maintained, matures — then it marries, uncapped.
Getting married and a family is HARD. Any roll that hands a citizen a spouse
is a forced marriage (20 weddings in 13 weeks — deleted the door). Nothing
about marriage ever has to happen; it is an outcome of chance, multiple
things lining up.

## 12. GC citizens live, and living is the road. (S324, corrected same night)
A Tier-5 named in an on-camera citizen's week is LIVING their off-camera
life — those crossings tick EmergenceCount, and three namings land the dream
(engine.58, Mike-ruled S320). Real media counts the same. Cutting the
crossings off froze every GC dream and killed the pool — that correction is
the proof: their liveliness is the system, never noise.

## The test
Before shipping any mechanic, one question, Mike's phrasing: **does this make
a row drive a fate the builder didn't choose — or does it just tidy data?**
