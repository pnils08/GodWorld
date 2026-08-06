---
title: Age-Banded Life Content Plan
created: 2026-08-02
updated: 2026-08-02
type: plan
tags: [engine, citizens, content-ledger, active]
sources:
  - Live Simulation_Ledger + Event_Content_Ledger reads, S350 — counts in §Findings
  - phase05-citizens/citizenContextBuilder.js `deriveLifeState_` — band boundaries
  - engine.67 step 5 (S325) — the `band` vocabulary this extends
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.97)"
  - "[[plans/2026-07-01-persistence-seams-content-ledger]] — the conditions micro-DSL"
  - "[[index]] — registered same commit"
---

# Age-Banded Life Content Plan

**Goal:** Parenting content is aimed by the parent's age instead of firing at every citizen who has ever had a child, and the adult bands stop drawing from a generic pool.

**Architecture:** No new mechanism. The Event_Content_Ledger already gates content on citizen columns via its conditions DSL, and `deriveLifeState_` already computes every citizen's age from BirthYear. The DSL is missing one thing — a numeric `age` field — and once it has that, parenting bands are authored as ordinary ledger rows. Band boundaries then live in the sheet, retunable without a deploy.

**Terminal:** engine-sheet for the schema line; content authoring stays with Mags.

**Acceptance criteria:**
1. `age` is a numeric condition field; `children>=1; age>=41; age<=50` loads and evaluates.
2. The 5 young-child lines are re-gated to the 31-40 band; the 3 age-neutral ones keep `children>=1` with no age term.
3. Each of the four empty parenting bands has content.
4. A citizen aged 57 with `NumChildren=2` draws empty-nest content, not bedtime (POP-00594 is the live test case).

---

## Design note — why there is no resolver

The first draft of this plan proposed a `childstage` resolver: a seven-step ladder that tried to name a citizen's actual children (ChildrenIds, then a reverse-ParentIds index, then household minors) and fell back to a parent-age proxy only when it couldn't.

That was wrong, and the measurements say why. Reverse-ParentIds resolves the same 53 citizens the direct `ChildrenIds` read already got — 593 of 643 populated `ParentIds` cells are literally `[]`. The household-minor check adds exactly 1. So two thirds of the ladder was machinery for one citizen.

The deeper correction (Mike, S350): most citizens' children are **Tier-5 and were never minted as rows.** That is the representative-sample model working as designed, not a data gap to repair. There is no child age to find because there is no child row — so the parent's own age isn't a fallback, it's the primary signal for ~90% of the population. And a parent's age answers the question well enough almost everywhere: the exceptions are a 45-year-old with a newborn or a 60-year-old raising a grandchild, neither worth building for until they appear.

That collapses the design to a single missing piece — numeric `age` in a DSL that already has `wealth`, `tier`, and `children`. Numeric rather than a named `parentband` enum so the boundaries stay in the sheet and can be retuned by editing a cell.

---

## Findings

Read live 2026-08-02.

**The parenting defect.** `NumChildren` is a lifetime count that never decrements. 556 citizens carry `NumChildren>=1`; 48 citizens under 18 exist in the entire 931-row ledger. Every citizen has a BirthYear (924 of 931 — the 7 blanks are Oaks roster mints, POP-01022–01028, Paulson's to fill).

**The content is written at one age.** The entire parenting surface is 7 ledger rows plus 3 hardcoded lines, and every one assumes roughly grade school — bedtime, homework, packing lunches, a Little League at-bat. There is no toddler, teenager, or adult-child content anywhere. Gating alone would trade wrong content for no content.

**Coverage by band is inverted.** Rows positively aimed at a band:

| band | boundaries | ECL rows |
|---|---|---|
| child | ≤12 | 17 |
| teen | 13–17 | 16 |
| youth | 18–22 | 0 |
| youngAdult | 23–35 | 0 |
| adult | 36–64 | 0 |
| senior | 65+ | 0 |

Plus 2 hardcoded lines per band via `agePoolFor_`. 188 of 252 active rows carry no band term at all — the general pool. Children and teens are the only bands anyone has authored for; the `adult` band is 29 years wide with nothing aimed at it, which is exactly where the parenting bands land.

**Tracked minors are already handled.** `deriveLifeState_` bands every citizen off their own BirthYear and `isEventEligible_` hard-gates by class — no work for kids, no money or rent math for minors, no romance for minors, no nightlife for children. A tracked child whose parents are not in the ledger already lives their own life correctly. That arm needs nothing built.

---

## Tasks

### Task 1: Add `age` to the conditions DSL

- **Files:** `phase02-world-state/loadEventContentLedger.js` — modify
- **Steps:**
  1. Add `age: { kind: 'num' }` to `CONTENT_LEDGER_DSL_FIELDS`, alongside the existing `wealth` / `tier` / `children` numerics.
  2. Wire `age` in the condition evaluator to read `lifeState.age` (already returned by `deriveLifeState_`).
  3. A null age (unusable BirthYear) fails any `age` term — fail-closed, consistent with the loader's existing behavior.
- **Verify:** a row conditioned `children>=1; age>=41; age<=50` loads; `age=old` is rejected and counted in `skipped`.

### Task 2: Re-gate the 5 young-child lines

- **Files:** `Event_Content_Ledger` — modify 5 rows, Conditions column
- **Steps:** add `age>=31; age<=40` to the bleachers line, the six-year-old line, the math-homework line, the kids'-lunches line (preserving its `wealth<=5`), and the `sports.as` "taught the kid to boo" line.
- **Leave alone:** "woke up at 5 AM before the house woke up" and "checked the front door lock three times" — true of a parent at any age.
- **Verify:** loader reports 252 rows, 0 skipped.

### Task 3: Author the four empty bands

- **Files:** `Event_Content_Ledger` — append rows, `source:familyLife`
- **Bands and what they are:**
  - `children>=1; age>=18; age<=30` — first child, no sleep, learning it in public
  - `children>=1; age>=41; age<=50` — teenagers: waiting up, the car, the argument that isn't about the thing
  - `children>=1; age>=51` — the room that stays clean, the phone that rings less
  - `children>=1; age>=60` — grandchildren
- **Note:** one grandchild line already exists and is correctly written — `retirement.depth`, "taught a grandchild a card game with rules that changed by round." It is gated only on `lifestate=retired`; it belongs in the 60+ band.
- **Verify:** each band returns ≥1 eligible line for a matching test citizen.

#### Task 3 — authored rows (S356, research-build). Ready for engine-sheet append after Task 1 lands.

All rows: `Kind=line`, `PoolKey=family.parenting`, `Slot=` (blank), `Weight=1`, `Grain=` (blank), `Active=yes`, `Tags=source:familyLife,auth:library-s356`.

**Band 18–30** — `children>=1; age>=18; age<=30` (first child, no sleep, learning it in public):

| Text |
|---|
| drove the long loop past Lake Merritt at 2 AM because the car was the only place the baby would sleep |
| showed up to work with a burp cloth still on one shoulder and didn't notice until lunch |
| called their own mother from the pharmacy aisle to ask which infant fever medicine was the right one |
| learned to eat an entire dinner one-handed without looking down |

**Band 41–50** — `children>=1; age>=41; age<=50` (teenagers: waiting up, the car, the argument that isn't about the thing):

| Text |
|---|
| sat up pretending to read until the headlights swung into the driveway at 11:40 |
| handed over the car keys and delivered the entire speech in one long breath |
| had the argument about the dishes that was not actually about the dishes |
| watched their teenager walk into school without looking back and remembered when they used to wave |

**Band 51+** — `children>=1; age>=51` (the room that stays clean, the phone that rings less):

| Text |
|---|
| walked past the bedroom that stays clean now and closed the door without going in |
| cooked the full Sunday dinner out of habit and packed half of it straight into the freezer |
| texted the kid a news article as a way of saying good morning |
| let the phone ring twice before answering so it wouldn't seem like they'd been waiting |

**Band 60+** — `children>=1; age>=60` (grandchildren):

| Text |
|---|
| kept a drawer of crayons at exactly grandkid height and restocked it before every visit |
| learned the video-call button by heart because that's where the grandkid lives most days |
| walked a grandchild the slow way around the block, naming every dog they passed |
| slipped the grandkid a five and said don't tell your mother, exactly like their own grandfather did |

(The existing `retirement.depth` card-game line covers the grandchild-visit register already — these four avoid duplicating it. Its re-gate to the 60+ band is engine-sheet's, per the Task 3 note above.)

### Task 4: Fold the 3 hardcoded family lines into the ledger

- **Files:** `phase05-citizens/generateCitizensEvents.js` L2351–2355 — modify
- **Steps:** move the bedtime, school-drawing, and dinner-question lines into the ledger as rows (bedtime and school-drawing at 31-40, dinner-question age-neutral), then delete the hardcoded block so all parenting content lives in one editable place.
- **Verify:** bench run over POP-00594 across 5 cycles → zero minor-child draws; the age-neutral lines still eligible.

### Task 5: Retire Youth_Events

- **Files:** `utilities/youthActivities.js` — delete; `docs/engine/ROLLOUT_PLAN.md` engine.4 — close
- **Rationale:** it defines a parallel Youth_Events sheet for ages 5-22 that duplicates `band=child` / `band=teen`, which already work and already carry 33 lines. It has zero callers and has been the open blocker on engine.4. Wiring it would be the fix-don't-add failure; retiring it unblocks the row.
- **Verify:** `grep -rn "youthActivities" --include=*.js .` returns only `cycleRollback.js`'s tab list; engine.4 flips to `done-pending-archive`.

---

## Changelog

- 2026-08-02 — Initial draft (S350). Defect found at boot: POP-00594 drew a Little League at-bat with children aged 25 and 22.
- 2026-08-02 — Rewritten (S350, Mike-direct): resolver, ladder, and `childstage` enum dropped for one numeric `age` field in the existing DSL. Rationale in §Design note.
- 2026-08-05 — Task 3 content AUTHORED (S356, research-build): 16 rows, four bands, §Task 3 authored rows. Append rides engine-sheet's Task 1 (age terms don't parse until the DSL line lands).
- 2026-08-05 — ALL TASKS SHIPPED (S357, engine-sheet): commit 27776f0a (code) + sheet batch (6 re-gates incl. card-game 60+, 19 appends, ECL 282, read-back verified). youthActivities deleted, engine.4 closed. Clasp pushed; smoke = C103 fire. Detail in commit body.
