---
title: S361 sim-integrity traces — research
created: 2026-08-09
updated: 2026-08-09
type: reference
tags: [research, engine, newsroom, money, citizens, ledger, active]
sources:
  - Live traces against the production Simulation_Ledger, `output/cron-compare/`, `output/desk_signal_c102.json`, `logs/saturday-run.log` — S361 engine-sheet session, 2026-08-09, the session Mike halted C103 in
  - `git show 6bbed839` (2026-07-16, S321 engine.61 T1–T5) — the commit that introduced the money-line defect
  - Mike-direct rulings delivered across the same session (quoted inline, attributed)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home; NO row filed, C103 halted"
  - "[[index]] — registered here, same commit"
  - "[[../engine/ENGINE_REPAIR]] — Row 35 filed this session, flagged NEEDS CORRECTION at #35 below"
  - "[[2026-08-04-mags-as-narrator]] — the design these publication findings bear on"
  - "[[../SIM_DOCTRINE]] — §1 no caps / §2 causes-then-dice decided the money fix"
---

# S361 sim-integrity traces — research

**Source:** the running system, not a paper. Live reads of the production Simulation_Ledger, two days of
cron output, the Saturday run log, and git history. Same shape as [[2026-08-04-mags-as-narrator]], where
the source was Mike's own reasoning.

**What this addresses:** Mike halted C103 indefinitely — *"103 won't run for months, until we figure out a
way to publish canon safe articles"* — and asked, as he has for ten months, what can narrate the sim without
fabricating. Five hours of tracing produced 50 findings. This is the record of all of them.

**What it does:** traces five paths end to end — publication, desk inputs, life-content supply, the money
system, citizen identity — plus a ledger-completeness pass.

**Every row is labelled.** `VERIFIED` = command run, output in the session transcript. `INFERRED` = not
traced, do not act on. This session produced ten confident wrong assertions before it produced a correct
one, and Mike — who does not read the code and had not opened the ledgers in two months — said the result
was *"I can't keep up with what's true and what's not."* The labels are the deliverable, not decoration.

---

## Extraction — what's usable

### A. Publication path

1. **pipeline.45's first live run died on billing, not design.** Sat 2026-08-08 16:00 UTC: step 1 EIC
   accuracy audit 100% (at bar), step 2 curation 2/2 selected with **0 canon-violations excluded**, step 3
   narration `400 — credit balance too low`. `VERIFIED` (`logs/saturday-run.log`)
2. **Edition 102 does not exist.** The narration step is the one that writes it. `VERIFIED`
3. **The gate enforced a rule Mike retired 2026-08-07, in five places** — worst a context-blind regex
   `/\b[-+]?\d+\.\d{2,}\b/` that fired on any figure regardless of attribution, so no article citing city
   data could ever pass. **FIXED — `b1aa26d7`.** (`cron-rhea-gate.js:110,201,279`, `cron-desk-run.js:533`,
   `.claude/rules/newsroom.md:114`)
4. **The two curated articles predate the new approach** (dated 08-01 and 07-29). Two days of new-pipeline
   output contributed nothing to the edition. `VERIFIED`
5. **Only 8 of the 28 flagged drafts are from the new approach** (Thu 08-06, Fri 08-07). Any verdict on the
   cron experiment uses 8 as the denominator, not 28. `VERIFIED`
6. **Two of those 8 were held only by a missing `## INTAKE` block** — format, not canon. `VERIFIED`
7. **Rhea false-positives on accented characters.** Vanessa Tran-Muñoz (POP-01021, OARI Program Director)
   flagged as *"an invented name… does not exist in the citizen ledger."* Will keep rejecting real citizens
   with real names. `VERIFIED`, OPEN
8. **Accuracy and canon-safety are different tests and only accuracy exists.** The gate measures
   contradiction of the record; nothing measures whether an article is a *retelling* of it. An article can
   score 100% and still be the thing Mike has fought 102 cycles. OPEN

### B. Desk inputs — why drafts fabricate

9. **Fabrication tracks the absence of people in a lane, not model tier.** Same cycle: civic 53 entries /
   42 citizens, business 23 / 9, culture 23 / 7, **sports 11 / 0**. Both sports drafts invented players, a
   manager, injuries and a postseason sweep. The only lane with nobody in it produced the only wholesale
   invention. `VERIFIED` (`output/desk_signal_c102.json`) — **the highest-value finding in the session.**
10. **A lane row with no citizens produces invented citizens.** The firebrand draft got `Brooklyn cooling
    off` with zero people attached and invented Brooklyn residents, relocating real Fruitvale/Downtown
    citizens there. `VERIFIED`
11. **The business desk's assignment was ~20 hood-delta rows with the same sentence copy-pasted per hood**
    ("retail busy, events drawing crowds, people moving in"), plus raw deltas and a literal formula. No
    person, no address, no hour. `VERIFIED`
12. **The only journalistic section of that draft came from the quotes** — the sole input containing a human
    being. `VERIFIED`
13. **110 aggregate signal entries reach the newsroom; 6,495 citizen life lines do not.** Nothing routes
    the latter to the former. `VERIFIED`
14. **"Citizens present in a lane" is NOT a quality metric.** Civic scores highest on it and is the lane
    Mike rejects outright: *"civic stories = I'd rather drink bleach than hear about it."* Process is not
    the product. Mike-direct
15. **Retrieval, not model tier, made the good pieces good.** C102 fork run's own measurement: retrieval
    51–70% of spend, writer 19–35%; three source-search seats and five orchestrator rulings upstream of one
    writer call. `VERIFIED` (prior measurement, re-read this session)

### C. Life-content supply

16. **6,495 life lines across 939 citizens** this cycle — Daily 1,618, Personal 1,196, Neighborhood 1,086,
    PrevEvening 771. `VERIFIED`
17. **Only 1,931 are distinct — 29.7%.** Seventy percent of lived life is duplicate text across people.
    `VERIFIED` — **hazard: wiring the raw feed to a desk without addressing variety hits the seams instantly.**
18. **The duplication is across people, not within a person.** 35 citizens repeat their own line, 36
    instances total — rare, and not the problem. `VERIFIED`
19. **Worst shared lines:** 63 citizens "checked in with a relative"; 46 "wrote half a letter to family,
    then decided to call instead"; 41 "realized the week had passed without a single thing worth retelling"
    — verbatim. `VERIFIED`

### D. Money system

20. **The engine spoke in the first person inside citizen memories:** `[Money] moved up in the world — the
    ledger says so`, on **37 citizens**, as their own memory. Introduced `6bbed839` (2026-07-16, S321).
    **Text FIXED, uncommitted; the 37 live rows untouched.** `VERIFIED`
21. **All 41 money lines in the sim's history carry ONE cycle stamp: Y2C50.** A dormant function woke and
    narrated 41 events that did not happen, in a single cycle. `VERIFIED`
22. **No cause gate existed** — mobility was inferred by diffing WealthLevel before/after the same cycle's
    recompute. **FIXED this session:** the event now requires Income, InheritanceReceived or EmployerBizId
    to have actually moved. Per [[../SIM_DOCTRINE]] §1 this is *not* a cap (no hands on the output) — per §2
    an uncaused arithmetic change simply is not an event. Under this gate Y2C50 fires zero.
23. **Tier-1 hit rate 52%** — T1 13/25, T2 9/68, T3 12/217, T4 3/630. Includes POP-00005 Mags Corliss,
    Avery Santana, Benji Dillon, Darrin Davis, Danny Horn. `VERIFIED`
24. **The tier skew is mechanical, not targeted** — T4 incomes never move; `WealthLevel ≥ 2` excludes almost
    nobody (554/630 T4s qualify). A test to discriminate carelessness from intent (compare the tier
    distribution of the correctly-written down-line) **failed to resolve**: the down-line fired exactly once
    in the whole population, which is not a distribution. No evidence either way. `VERIFIED` / inconclusive
25. **All 37 sit inside the last-5 window** the wake and interview read back — live in every prompt, not
    buried history. `VERIFIED`
26. **Money is a one-way ratchet: 37 up, 1 down**, across 940 citizens and 102 cycles. Nobody loses ground.
    `VERIFIED`, OPEN
27. **T4 economic lives are static** — 3 money events across 630 citizens. Two-thirds of the population has
    never had anything happen to its money. `VERIFIED`, OPEN
28. **The wealth scale is calibrated from the real world**, which doctrine forbids: `deriveWealthLevel_`
    returns 10 (Elite) at ≥ $300,000, so a league-minimum pitcher (780k, hand-typed by Mike — a real salary,
    not a placeholder) and Austin Reaves (30M) are indistinguishable; 12 sports citizens sit at 10 across a
    40× salary range. Mike's ruling: *"This is GodWorld. Oakland means nothing"* — **the ceiling existing at
    all is the bug**; the scale must derive from the ledger's own population. `VERIFIED`, OPEN
29. **The scale cannot return 1, 3, or 8.** Three of eleven wealth levels are unreachable by any citizen.
    `VERIFIED`, OPEN
30. **Wealth is recomputed from scratch every cycle and stores no cause.** No promotion, inheritance or
    job-loss event exists anywhere. Mike: *"that's an earned life event that persists and doesn't clear out
    each cycle into the dials — you're conflating."* Partially addressed by #22; the durable earned-event
    record is still missing. OPEN
31. **`WEALTH_MOBILITY` has zero consumers** — the hookType appears only where it is created. A citizen's
    wealth moving two rungs reaches no desk. `VERIFIED`, OPEN
32. **The up-line silently dropped the magnitude the down-line carried.** Fixed alongside #20.
33. **NetWorth accrual is what moves sports citizens' levels** (Income is static). `INFERRED` — the NetWorth
    writer was never opened. **Do not act on this.**

### E. Citizen identity

34. **One bad ledger cell reached a staged article.** POP-00744 Tomas Renteria, born 2031 (age 10), RoleType
    `Podcast Host / Line Cook` → the prompt faithfully told him he has a career → he voiced as an adult →
    `--record` wrote it to his page → the page feeds it back every interview → the staged article calls him
    "a local podcast host and line cook" → **it passed the gate at 100%, because the ledger agrees.**
    `VERIFIED`. Mike ruled him dead (canon can't be retconned); **not executed.**
35. **He is the only such row** — 48 under-18s, 45 correctly students/grade schoolers. Not systemic.
    `VERIFIED`
36. **A citizen's page is authoritative on read-back with no consistency check** against their ledger
    record. One fabrication, once spoken, compounds every cycle and cannot self-correct. `VERIFIED`, OPEN
37. **ENGINE_REPAIR Row 35 is WRONG and needs correcting.** Its 705-citizen framing claims the interview
    path is gated by `SHAPED_MIN`. It is not — `citizenVoice.js:210` calls
    `buildPool({shapedMin:0, lifeMinChars:0})` and all 940 are voiceable. 705 is the nightly wake rotation
    working as designed. NEEDS CORRECTION
38. **Any citizen the engine can place in an event must load their own record when asked.** A selection
    threshold may decide who gets picked; never whether a picked citizen knows their own name. Mike-direct

### F. Ledger completeness

39. **The grounding snapshot is stale and nothing refreshes it.** `output/simulation_ledger_snapshot.jsonl`
    — 931 rows, written 2026-08-05; live ledger is 940. Written by `dumpLedger.js`, no cron. Every canon
    check resolves against it. `VERIFIED`, OPEN
40. **Two silent `catch (_)` swallows on the grounding path** — `canon-name-check.js:61` (snapshot read) and
    `cron-desk-run.js:1142` (`profilesFor`). When grounding drops out, the prompt ships ungrounded and
    nothing says so. `VERIFIED`, OPEN
41. **115 POPID gaps** in the range POP-00001 → POP-01055. `VERIFIED`
42. **MaidenName 0% populated** (0/940). `VERIFIED`
43. **SpouseId 4%** (38/940) — against MaritalStatus 90% populated. `VERIFIED`
44. **CitizenBio 5.2%** (49/940). `VERIFIED`
45. **UsageCount 39.1%** (368/940). `VERIFIED`
46. **`OrginCity` 46.5%** (437/940) — and the column name is misspelled in the live schema. `VERIFIED`
47. **HouseholdId 50.3%** (473/940). `VERIFIED`
48. **InheritanceReceived 63.5%**, ParentIds 68.4%, ChildrenIds 70.1%. `VERIFIED`
49. **23 rows sit at Status `pending`** (vs 856 Active, 49 Traded, 7 Retired, 5 deceased) — a lowercase
    enum value alongside capitalised ones. `VERIFIED`
50. **"Done" means code landed, not output verified** — the meta-pattern behind every "oh by the way."
    S361 instances: engine.102 Task 7 (three commits, plan says "not started"); pipeline.45 ("LIVE", its one
    run died); the Rhea gate ("wiring complete", couldn't pass an article citing a number); engine.61 T5
    (commit says *"first mobility event fired… line + hook clean"* — **one citizen checked, 41 written, the
    sentence never read**). Mike: *"every turn is oh by the way."*

---

## Not applicable / hazard

- **#17 gates #13.** The lives exist and reach no desk, but only 29.7% are distinct. Routing the raw feed
  without addressing variety trades one visible failure for another.
- **#24 is inconclusive by design.** The discriminating test was run and could not resolve intent. Do not
  let a future session cite this file as evidence either way.
- **#33 is untraced.** Marked INFERRED for that reason.
- **Doctrine §1 rules out the obvious money fix.** A population-scale suppression guard on mass mobility
  events is a hand on the output and is forbidden even though it would have stopped Y2C50. The cause gate
  (#22) achieves the same result legitimately.
- **No ledger-column inventory was commissioned.** §F surfaced incidentally while tracing other paths; a
  proper column-by-column pass against each writer has not been done.

## Verdict: `adopt`

**#9 is the finding that pays:** fabrication tracks the absence of people in a lane, and it explains ten
months of hallucination without invoking model capability. Sports gets zero citizens and produces the only
wholesale invention; the material that would fix it already exists at 6,495 lines a cycle and reaches no
desk. A routing problem with a measurable target, not a research question. Premium models fill gaps *more
convincingly*, so spending up makes it worse.

**Gated.** Mike halted C103 indefinitely on 2026-08-09 and stated he may not renew the droplet. **No plan
ignited, no ROLLOUT row filed.** If work resumes, the order is: route citizen life-lines into desk lanes
(addressing #17), then the population-derived wealth scale (#28), then the earned-event record (#30).

**Ignited plans:** none — halted.

---

## Applications (living)

- 2026-08-09 — Written from the S361 engine-sheet session. Two fixes shipped from it: `b1aa26d7` (the
  retired gate rule) and the money cause-gate + line text in `generationalWealthEngine.js` (uncommitted at
  time of writing). The 37 live rows and POP-00744's death ruling remain unexecuted pending Mike.

---

## Changelog

- 2026-08-09 — Initial extraction (S361). First drafted as an ad-hoc plan-shaped doc in `docs/engine/`;
  rewritten to RESEARCH_TEMPLATE and relocated here on Mike's correction, per rollout-rules §2. Expanded to
  the full 50-finding inventory on his instruction that the whole session be documented.
