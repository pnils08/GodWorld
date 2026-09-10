---
title: Business lane — engine routing fixes (closure domain, closure ripples)
created: 2026-09-10
updated: 2026-09-10
type: reference
tags: [research, business, newsroom, pipeline68, active]
sources:
  - S441 kimi session — business-lane audit and scripts-side fix (builder-directed, lane-by-lane media data program)
  - docs/plans/2026-09-07-beat-slices-from-sheets-plan.md — pipeline.68 (Task 2 built the economic slice)
  - docs/plans/2026-08-01-business-lifecycle-generator.md — engine.96
  - output/agent_engine-wiring_2026-09-10T05-46-52.md — wiring card for Business_Archive (attached below)
pointers:
  - "[[../plans/2026-09-07-beat-slices-from-sheets-plan]] — the plan this extends"
  - "[[../SIM_DOCTRINE]] §13 — gate the facts, not the color"
---

# Business lane — engine routing fixes

**Verdict: adopt.** The business lane's *routing* works (BUSINESS → Business
Desk, ECONOMIC seeds → business desk); the gap was input-side and is now closed
scripts-side. What remains is engine-side: a business closure — the biggest
story the beat can produce — is routed away from the business desk by
construction.

## What landed scripts-side this session (kimi)

- `scripts/dumpBeatTabs.js` — `Business_Archive` added as an OPTIONAL tab
  (lazy-created at first closure per engine.119; absent on the sheet dumps as
  an empty file, never an abort).
- `scripts/buildEconomicSlice.js` v ECONOMIC-SLICE-3:
  - movement facts vs `output/beats/prev/` (headcount/revenue deltas on every
    business line; typed `NO_PRIOR_CYCLE` until the rotation starts at C107);
  - closures: this cycle's `Business_Archive` rows plus prev-diff
    disappearances with no archive row ("gone, no archive row" — worth a
    question, not silence);
  - contraction watch (business variant): shedding roster workers with growth
    ≤ 0, stated as fact;
  - casino section (builder ruling S433: business covers casino): this cycle's
    wagers by ledger-tracked patrons only, house float;
  - BUSINESS-domain / Jordan Velez hooks consumed (the builder previously had
    no `hooksFor` call at all);
  - `Key_Personnel` POPID tags stripped from fact lines — names print, IDs
    never do (was leaking `POP-00789 Elias Varek` into the C106 slice).
- Live-verified on the C106 dump: both variants build; Business_Archive is
  empty at C106 (no closures yet — expected); casino section carried 5 named
  wager rows + $250k house float.

## Proposed engine cuts (gated — phase*/utilities land through engine-sheet)

**Cut 1 — closure world-events are stamped for the wrong desk.**
`phase05-citizens/applyBusinessDynamics.js:420-426` pushes closure
world-events with `domain: 'COMMUNITY'`. Via `storyHook.js:99-120`
(`deskMap['COMMUNITY'] = 'Community Desk'`) a closure hook goes to the
community desk — and because the hook loop (`storyHook.js:910-925`) only fires
on severity `'medium'`, a ≥10-job closure (severity `'high'`) gets **no hook at
all**. Proposed: stamp closures `domain: 'BUSINESS'`, and either let
`'high'` severities hook or drop closure severity to medium. The business desk
is one seat (Jordan Velez, `utilities/rosterLookup.js:350`), so a correct
domain is sufficient targeting.

**Cut 2 — closures emit no ripples.** `applyBusinessDynamics.js` makes zero
`recordRipple_` calls, so closures never become ECONOMIC seeds
(`buildContractSeeds.js` maps `'economic-event' → ECONOMIC → business`). One
`recordRipple_` per closure with `causeType: 'economic-event'`,
`targetScope: 'business'` (mirroring `economicRippleEngine.js:238-257`) would
put a closure on the seed deck the same cycle it happens.

**Considered and not proposed:** persisting `S.businessDynamicsState`
(distress streaks) for the slice — the slice infers contraction from dump
diffs, which is the same evidence with no new state surface.

## Needs a builder ruling (not engine work)

- **"Community Services" sector is not excluded** from the business slice —
  the C106 business slice leads with West Oakland Community Center (a
  mutual-aid org, 95 staff). Sector exclusion list
  (`buildEconomicSlice.js` NON_BUSINESS_SECTOR_RE) covers `community
  development` and `housing & social` but not this string. Same civic-gravity
  question the S434 exclusions settled; one-word ruling fixes it.
- **The Monday seat slug is `business-desk`, not `jordan-velez`**
  (`newsroom-fanout.js:48`) — his byline lands only if the wake package
  carries his name. Roster/wake-package matter, not a slice bug.

## Wiring card — Business_Archive

Full report: `output/agent_engine-wiring_2026-09-10T05-46-52.md` (haiku, 14
turns). Load-bearing lines:

- SCHEMA: `BIZ_ARCHIVE_HEADERS` @ `phase05-citizens/applyBusinessDynamics.js:176`
  — the 9 ledger cols + `ArchiveReason, ExitCycle, SourceEventId, ClosedCycle`.
- WRITERS: `archiveClosedBusinesses_` @ `applyBusinessDynamics.js:471`
  (Phase11-BusinessArchive, post-commit, after Phase10-ExecuteIntents) —
  copy-verify-remove by BIZ_ID; the ensure intent at :428 is priority 25,
  before Phase 11.
- READERS: engine read-back only (:478, :518) — no newsroom reader existed
  before this session's dump.
- OPEN WORK: engine.96 @ `docs/plans/2026-08-01-business-lifecycle-generator.md`.

## Review — 2026-09-10 (research-build, S442)

**Accepted. Verdict adopt stands.** Verified: `applyBusinessDynamics.js:420-426`
stamps closures `domain: 'COMMUNITY'` with `severity: 'high'` at ≥10 jobs; the
hook loop (`storyHook.js:910-925`) hooks `'medium'` only, so a large closure
gets no hook; the file makes zero `recordRipple_` calls. Scripts half is in git
(`6c761f21`). **Closed by ruling, not carried forward:** the Community Services
exclusion landed in `80acd9f5` (builder ruling 2026-09-10).

**Filed as engine.190** (ready, engine-sheet) — cuts 1–2 as written. Mechanism
recommendation on cut 1's fork: **let `'high'` hook**, don't demote closure
severity. A gate the beat's biggest event cannot pass is the SIM_DOCTRINE §15
pattern verbatim, and demoting severity would also shrink `impactScore` for the
v3 writers. This change is shared with engine.189 (faith hooks) — one pass on
the loop.

**Not open — kimi's byline concern is a non-issue.** The Monday slot slug
`business-desk` IS Jordan Velez: `.claude/agents/business-desk/IDENTITY.md:3`
("You are Jordan Velez"), `RULES.md:19` (single reporter), and
`utilities/rosterLookup.js:56,329-331` (POP-00153; economics/labor/business →
Velez). The byline lands.
