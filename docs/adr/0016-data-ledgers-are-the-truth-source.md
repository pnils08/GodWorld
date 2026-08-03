---
title: "ADR-0016: Data ledgers are the truth source — code reads truth, never embeds it; systemic blockers escalate"
created: 2026-08-02
updated: 2026-08-02
type: reference
tags: [architecture, engine, governance, decision, active]
sources:
  - "Mike rulings 2026-08-02 (S349): 'there should be 1 ledger that is the neighborhoods, any code using a neighborhood should be pulling that from the truth ledger to avoid this drift type' / 'this isn't a one session job, this is a change in how we work, and how I learn' / 'code needs a truth source, the code itself can't be it' / 'if we spend multiple sessions on work like this and none of it will work cause 85 codes need an edit, then we have to escalate that'"
  - "engine.93 Task 9 (S349) — the commute matrix that surfaced it: Business_Ledger writes 'Piedmont Avenue', Simulation_Ledger writes 'Piedmont Ave', so a hand-written alias map was required to join a citizen to their workplace"
  - "Empirical survey S349: 85 engine/script files hardcode a neighborhood literal; applyCityDynamics.js 12 distinct hoods, updateCrimeMetrics.js 12, updateCivicApprovalRatings.js 19, economicRippleEngine.js 18 (plus its own private collapse-to-11 alias mapper), lib/districtMap.js 19, lib/canonNeighborhoods.js 21"
  - ".claspignore:19,22-24 — lib/** and scripts/** never deploy to Apps Script; the structural reason engine code cannot import shared truth"
  - "phase02-world-state/loadNeighborhoodState.js:25,74 — already reads Neighborhood_Map into S.neighborhoodState every cycle; the seam exists and is unused as a hood list"
pointers:
  - "[[0015-world-config-tunable-values]] — sibling doctrine: tunable VALUES live in World_Config; this ADR covers canonical ENTITY SETS"
  - "[[../plans/2026-07-31-per-hood-political-consequence]] — engine.93, whose Task 9 alias map is the local patch this ADR retires"
  - "[[../SPREADSHEET]] — tab contract; Neighborhood_Map is the neighborhood ledger"
  - "[[../engine/rollout-rules]] — where escalation lands when a systemic blocker is found"
  - "[[../index]] — registered same commit"
---

# ADR-0016: Data ledgers are the truth source — code reads truth, never embeds it; systemic blockers escalate

**Status:** Accepted (decision); application is cohort-based and multi-session
**Date:** 2026-08-02
**Deciders:** Mike (direct rulings, S349), engine-sheet (surveyed + drafted)

## Context

**The bite.** engine.93 Task 9 built a commute matrix joining each citizen to their
workplace's neighborhood. It could not be written cleanly, because
`Business_Ledger` records a workplace in `'Piedmont Avenue'` while
`Simulation_Ledger` records a home in `'Piedmont Ave'`. The join needed a
hand-written alias map inside the new engine — a local patch, in a new file, for
a problem that is not local.

**The survey.** 85 engine and script files hardcode at least one neighborhood
literal. Four of the biggest carry materially different sets:

| File | Distinct hood literals |
|---|---|
| `phase02-world-state/applyCityDynamics.js` | 12 |
| `phase03-population/updateCrimeMetrics.js` | 12 |
| `phase05-citizens/updateCivicApprovalRatings.js` | 19 |
| `phase06-analysis/economicRippleEngine.js` | 18 (+ a private mapper collapsing to 11) |
| `lib/districtMap.js` | 19 |
| `lib/canonNeighborhoods.js` | 21 |

Each was correct when written. They drifted apart because nothing held them
together.

**Why it happened — the part that matters.** This is not carelessness, and
treating it as carelessness would produce the wrong fix. The truth already
exists **twice**: `Neighborhood_Map` is the ledger, and `lib/canonNeighborhoods.js`
holds the canonical 21. **Neither is reachable from engine code.** Apps Script
has no module system, and `.claspignore` excludes `lib/**` and `scripts/**` from
deploy, so nothing under them exists at engine runtime. Every phase author hit
the same wall and did the only thing available: retype the list. Worse,
`loadNeighborhoodState_` already reads `Neighborhood_Map` into
`S.neighborhoodState` every cycle — the seam is *there*, and no consumer uses its
keys as the hood list.

**The generalization.** Neighborhoods are the instance that bit us; the wall is
generic. Any canonical entity set — neighborhoods, businesses, districts, faith
organizations, council seats — hits it identically. This ADR is therefore about
entity sets, not about neighborhoods.

**Mike's rulings (S349):**

- **"There should be 1 ledger that is the neighborhoods. Any code using a neighborhood should be pulling that from the truth ledger to avoid this drift type."**
- **"Code needs a truth source. The code itself can't be it."**
- **"This isn't a one-session job — this is a change in how we work, and how I learn."**
- **"If we spend multiple sessions on work like this and none of it will work cause 85 codes need an edit, then we have to escalate that."**

## Decision

1. **A data ledger is the truth source for its entity set.** `Neighborhood_Map`
   is the neighborhood ledger; `Business_Ledger` the business ledger;
   `Simulation_Ledger` the citizen ledger. The set of valid entities, and the
   canonical spelling of each name, is whatever the ledger says. Code does not
   get a vote.

2. **Code reads truth; it never embeds it.** A hardcoded entity list in engine
   code is a defect class, not a style preference. The canonical set is loaded
   once per cycle from the ledger into a single `ctx` field, and every consumer
   reads that field. Sibling boundary: **ADR-0015 governs tunable VALUES
   (World_Config); this ADR governs canonical ENTITY SETS (data ledgers).**

3. **The loader must be deployable.** Because `lib/**` never reaches Apps
   Script, the canonical accessor lives in a **pushed** engine file, seeded from
   the sheet at Phase 1. Putting it in `lib/` would repeat the exact mistake
   that created the drift.

4. **Name normalization belongs at the ledger, not in each consumer.** Where two
   ledgers spell the same entity differently, the fix is to reconcile the
   ledgers, not to distribute alias maps. Every private alias map — starting
   with the one engine.93 Task 9 added — is retired by its cohort's migration,
   not preserved.

5. **A drift detector gates the fix.** An audit check fails any entity literal
   in a phase file that is not in the canonical set. Without it this reverts
   within a few sessions, and the migration cost is paid twice.

6. **Migration is cohort-based and multi-session, never a sweep.** Every one of
   the 85 files is live cycle path. Cohorts are ordered by drift damage
   (highest-divergence consumers first), each lands with its own caller-graph
   evidence and bench proof, and unrelated files are not touched to make a
   number go down. Contrast with ADR-0015's migrate-on-touch: that rule fits
   values, which are independent. Entity sets are *joins* — a half-migrated join
   is worse than an unmigrated one, so cohorts must be internally complete.

7. **Systemic blockers escalate — the working rule (Mike-direct).** When work
   uncovers that a systemic gap would invalidate the work being built on it,
   **stop and escalate to Mike rather than patching around it.** A local
   workaround that lets one session finish is how 85 files came to disagree; it
   converts a visible architectural cost into an invisible one, and it spends
   future sessions' budget without asking. The escalation is a one-line surface:
   what was found, how many places it reaches, and what it invalidates.

## Consequences

**Positive.**
- One answer to "what are the neighborhoods," owned by data Mike can see and
  edit, not by 85 files he cannot.
- Cross-ledger joins (citizen ↔ business ↔ neighborhood) stop requiring bespoke
  alias maps — the class of bug engine.93 Task 9 hit disappears rather than
  being patched per site.
- New engines inherit the canonical set for free, so the problem stops growing
  while the migration runs.
- The escalation rule converts "we spent three sessions and it doesn't work"
  into a decision Mike makes at hour one, with the count in front of him.

**Risks / costs.**
- **Multi-session, live cycle path.** Real regression surface across 85 files.
  Mitigated by cohorts, caller-graph evidence per landing, and bench proof
  before deploy — the measure-twice discipline, not speed.
- **A runtime read replaces a compile-time constant.** If `Neighborhood_Map` is
  unreadable, consumers must fail loud, never fall back to an embedded list —
  a silent fallback recreates the drift with extra steps (the ADR-0015 §4
  fail-loud rule applies identically here).
- **Two homes during migration.** Same transition cost ADR-0015 accepted;
  bounded here by the drift detector, which makes "is this file migrated?"
  mechanically answerable instead of a memory question.
- **Ledger typos become engine-wide.** The truth source's authority cuts both
  ways. Mitigated by the detector (an unknown literal fails) and by the fact
  that a sheet typo is visible and one-cell fixable, where a code typo needs a
  deploy.

**Rejected alternatives.**
- **Fix the alias map in each consumer.** The status quo that produced four
  divergent namespaces; makes drift cheaper to add than to remove.
- **Put the canonical list in `lib/`.** Physically cannot work — `lib/**` is
  claspignored and Apps Script has no imports. This is precisely the wall that
  created the problem.
- **A big-bang sweep of all 85 files.** Rejected on regression surface: all are
  live cycle path, and one bad landing corrupts a cycle for every citizen.
- **Generate a constants file at deploy time from the sheet.** Rejected — it
  reintroduces truth-in-code that goes stale between deploys, and hides the
  staleness behind a build step.

## Changelog

- 2026-08-02 (S349) — Initial draft (engine-sheet; Mike rulings this session).
  Surfaced by engine.93 Task 9's alias map; survey of 85 files + 6 divergent
  hood namespaces attached. First application will be the neighborhood cohort;
  the engine.93 Task 9 alias map is explicitly scheduled for retirement by it.
