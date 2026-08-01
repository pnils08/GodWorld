---
title: Citizen Memory & Perception Plan (Typed Emotion + Folk Memory)
created: 2026-07-31
updated: 2026-07-31
type: plan
tags: [engine, citizens, media, memory, active]
sources:
  - External codebase audit (commit af50e1f) gaps #3 + #4, verified against live repo 2026-07-31 (Kimi CLI verification)
  - docs/plans/BACKLOG.md:256 (27.9 folk memory, MEDIUM) and :257 (27.10 negative feedback loops, HIGH)
  - docs/research/2026-06-20-layered-memory-architecture.md §S306 regrounding (research.17)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.94)"
  - "[[2026-06-23-citizen-perception-immersion-layer]] — research.19; its T3 'read the Pulse' rides this plan's Track B gate"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Citizen Memory & Perception Plan

**Goal:** Citizens and neighborhoods carry typed memory of what happened — grief, grudge, ambition as mechanics and folk memory as collective recall — so the sim tracks what people *think* happened, not only what happened.

**Architecture:** Two tracks, split by gate. **Track A (ungated, buildable now):** (1) Give the existing grief stub consumers — `phase04-events/generationalEventsEngine.js:1423-1432` emits `type: "grief", effect: "grief_period"` cascade entries on death-of-ally/mentor, and `grief_period` has **zero consumers** today (surfaces only as a count in `phase10-persistence/buildCyclePacket.js:350-351`); wire it into the dial engine (`utilities/compressLifeHistory.js` v2.0, `REFLECTION_MULT 0.45`) and event-pool biasing the same way the `Quoted` tag already works (`utilities/citizenDialMap.js:46` → sociability +3). (2) Ship BACKLOG **27.10** negative feedback loops: soft ceilings on runaway positive spirals — scandal probability rising with sustained high approval, building on the existing scandal mechanic (`phase05-citizens/runCivicElectionsv1.js:334-335`, "Scandal status: -25%"); rapid development → housing-pressure coupling. **Track B (gated on research.17 — REGROUNDED S306, "design WITH Mike", needs-info):** typed grudge/ambition state on top of the working rivalry mechanics (`phase05-citizens/bondEngine.js:1706-1724` `resolveRivalry_`; escalation at intensity ≥ 6, :856-859) and BACKLOG **27.9** folk memory (2–3 `Folk_Memory` records per major event keyed event×neighborhood — "Fruitvale remembers the transit vote as a betrayal; Rockridge remembers it as fiscal responsibility" — feeding reporter/Letters briefings). research.19's T3 "read the Pulse" news-awareness pilot rides the same gate.

**Terminal:** research-build (Track B design WITH Mike) / engine-sheet (Track A build)

**Pointers:**
- Prior work: `docs/research/2026-06-20-layered-memory-architecture.md` (research.17 regrounding — prior P1/P2 plans + ADR-0011 are DEAD; do not resurrect them)
- Related plan: [[2026-06-23-citizen-perception-immersion-layer]] (research.19 — T1/T2 live S272/S273; T3 gated)
- Verification basis: audit's "zero hits for grief/grudge/ambition" was **partially wrong** — rivalry is fully mechanical (bond types, escalation, truce/continuation resolution, a first-class event-arc type at `phase04-events/eventArcEngine.js:217-221`), and LifeHistory feeds behavior through TWO stacked channels (7-dial stateful engine + 1.3–1.4× archetype weights at `phase05-citizens/generateCitizensEvents.js:460-490`, stacking at :2617-2622). Genuine gaps: grief is an unconsumed stub, grudge/ambition are prose-only, and edition→engine feedback is numeric per-domain ratings only (`phase02-world-state/applyEditionCoverageEffects.js` — no article content, named individual, or event identity enters the engine; the `Quoted` LifeHistory tag at `phase07-evening-media/mediaRoomIntake.js:1391-1394` is the one content-to-individual path and is positive-only).

**Acceptance criteria:**
1. A death-of-ally cascade measurably changes the bereaved citizen's next-cycle event draw or dials (sandbox assertion showing `grief_period` consumed).
2. Sustained high approval measurably raises scandal probability (unit test on the election engine's scandal path).
3. Track B design-options doc delivered for the Mike design session; zero Track B code ships before research.17 lands.

---

## Tasks

### Task 1: Map the grief stub surface
- **Files:** `phase04-events/generationalEventsEngine.js` — read
- **Steps:** Read lines 1410–1440. Record who receives `grief_period` entries (which citizens, what payload), and where the cycle packet counts them (`phase10-persistence/buildCyclePacket.js:350-351`).
- **Verify:** grief-surface notes in Build notes
- **Status:** [ ] not started

### Task 2: Design grief → dial/event-pool consumption (research-build)
- **Files:** `utilities/compressLifeHistory.js`, `utilities/citizenDialMap.js` — read; this plan — modify
- **Steps:** Design the grief consumer mirroring the `Quoted` precedent: tag → dial deltas → event-draw bias. Grief should bias toward withdrawal/memorial/reconnection draws for a bounded window, not a permanent trait. Mike sign-off on the dial deltas before build.
- **Verify:** design notes + approved deltas in Build notes
- **Status:** [ ] not started

### Task 3: Implement grief consumer (engine-sheet)
- **Files:** `utilities/citizenDialMap.js` (and/or `utilities/compressLifeHistory.js` per Task 2) — modify
- **Steps:** Implement per Task 2. Keep it tag-driven (fail-loud format contract applies).
- **Verify:** `node scripts/compressLifeHistory.dial.test.js` (existing dial test) still passes; add a grief-tag assertion
- **Status:** [ ] not started

### Task 4: Design 27.10 feedback ceilings (research-build)
- **Files:** `phase05-citizens/runCivicElectionsv1.js`, `docs/plans/BACKLOG.md:257` — read; this plan — modify
- **Steps:** Design soft ceilings: (a) scandal probability scales with consecutive cycles of high approval (mechanism: extend the existing scandal status path); (b) rapid development → housing-pressure coupling (link to engine.54 trajectory state, per engine.55's pressure lane precedent). First resolve Open question 1 (BACKLOG's own build-trigger condition).
- **Verify:** ceiling formulas in Build notes; Mike sign-off
- **Status:** [ ] not started

### Task 5: Implement scandal-ceiling mechanic (engine-sheet)
- **Files:** `phase05-citizens/runCivicElectionsv1.js` — modify
- **Steps:** Implement (a) from Task 4: track sustained-approval streak per official, scale scandal probability, keep the -25% election effect.
- **Verify:** unit test: streak below threshold → base probability; above → elevated; deterministic under seeded RNG
- **Status:** [ ] not started

### Task 6: Track B design-options doc (research-build, WITH Mike)
- **Files:** `docs/research/2026-06-20-layered-memory-architecture.md` §S306 — read; this plan — modify
- **Steps:** Frame the options for the research.17 design session: (a) typed grudge/ambition as bondEngine state extensions vs dial-engine tags vs new ledger; (b) 27.9 `Folk_Memory` record shape (event × neighborhood, 2–3 records per major event, demographic-filtered recall) and its consumer (reporter/Letters briefings per BACKLOG); (c) how research.19 T3 "read the Pulse" hangs off the result. Record Mike's picks as decisions in this plan.
- **Verify:** decisions recorded in Build notes; Track B tasks written from them in a follow-up edit
- **Status:** [ ] not started

---

## Build notes

Filled as tasks complete.

---

## Open questions

- [ ] BACKLOG 27.10's own build trigger is "build when feedback loop data from C91+ confirms the golden-era pattern" — does the coverage-ratings data since C91 confirm it? Check `Edition_Coverage_Ratings` history + approval trend before Task 4. — blocks Task 4
- [ ] Does grief consumption belong in the dial engine (tag-driven, statistical) or should it be Track B typed state (research.17)? Default: Track A tag-driven now, migrate if research.17 produces a richer substrate. — informs Task 2

---

## Changelog

- 2026-07-31 — Initial draft (Kimi CLI, builder-directed external-audit remediation batch). Audit gaps #3+#4 combined with BACKLOG 27.9/27.10 (the project's own prior framing of the same gaps). Track A scoped to ungated work so the plan is pickable while research.17 is needs-info.
