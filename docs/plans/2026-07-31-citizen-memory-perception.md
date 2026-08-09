---
title: Citizen Memory & Perception Plan (Typed Emotion + Folk Memory)
created: 2026-07-31
updated: 2026-08-09
type: plan
tags: [engine, citizens, media, memory, active]
sources:
  - External codebase audit (commit af50e1f) gaps #3 + #4, verified against live repo 2026-07-31 (Kimi CLI verification)
  - docs/plans/BACKLOG.md:256 (27.9 folk memory, MEDIUM) and :257 (27.10 negative feedback loops, HIGH)
  - docs/research/2026-06-20-layered-memory-architecture.md §S306 regrounding (research.17)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.94)"
  - "[[../research/2026-08-01-simulation-realism-audit]] — build-order step 4 (Track A) / step 7 (Track B gate unchanged); grief_period zero-consumer finding re-verified there"
  - "[[2026-06-23-citizen-perception-immersion-layer]] — research.19; its T3 'read the Pulse' rides this plan's Track B gate"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Citizen Memory & Perception Plan

**Goal:** Citizens and neighborhoods carry typed memory of what happened — grief, grudge, ambition as mechanics and folk memory as collective recall — so the sim tracks what people *think* happened, not only what happened.

**Architecture:** Two tracks, split by gate. **Track A (ungated, buildable now):** (1) Give the existing grief stub consumers — `triggerDeathCascade_` in `phase04-events/generationalEventsEngine.js` emits `type: "grief", effect: "grief_period"` cascade entries on death-of-ally/mentor. `grief_period` has **zero mechanical consumers** today: `phase10-persistence/buildCyclePacket.js` renders only the aggregate `Pending Cascades` count, never reads the raw grief payload or changes citizen state; wire the payload into the dial engine (`utilities/compressLifeHistory.js` v2.0, `REFLECTION_MULT 0.45`) and event-pool biasing the same way the `Quoted` tag already works (`utilities/citizenDialMap.js:46` → sociability +3). (2) Ship BACKLOG **27.10** negative feedback loops: soft ceilings on runaway positive spirals — scandal probability rising with sustained high approval, building on the existing scandal mechanic (`phase05-citizens/runCivicElectionsv1.js:334-335`, "Scandal status: -25%"); rapid development → housing-pressure coupling. **Track B (gated on research.17 — REGROUNDED S306, "design WITH Mike", needs-info):** typed grudge/ambition state on top of the working rivalry mechanics (`phase05-citizens/bondEngine.js:1706-1724` `resolveRivalry_`; escalation at intensity ≥ 6, :856-859) and BACKLOG **27.9** folk memory (2–3 `Folk_Memory` records per major event keyed event×neighborhood — "Fruitvale remembers the transit vote as a betrayal; Rockridge remembers it as fiscal responsibility" — feeding reporter/Letters briefings). research.19's T3 "read the Pulse" news-awareness pilot rides the same gate.

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
- **Steps:** Trace `triggerDeathCascade_`. Record who receives `grief_period` entries (which citizens, what payload). Distinguish aggregate reporting from a mechanical payload consumer.
- **Verify:** grief-surface notes in Build notes
- **Status:** [x] done 2026-08-09 (Codex, read-only) — emitter, recipient, payload, lifetime, and current readers mapped below

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

### Task 1 — grief stub surface (Codex, 2026-08-09)

- **Emit paths:** both death routes call the same `triggerDeathCascade_`: a health-lifecycle transition whose new status is `deceased`, and the regular milestone death check.
- **Recipient rule:** every bond incident to the deceased is severed. Only an `alliance` or `mentorship` also emits grief, targeting the surviving endpoint (`citizenA` or `citizenB`). Rivalry and other bond types receive no grief entry. The loop emits once per qualifying bond; it has no survivor-level deduplication.
- **Payload:** `{ type: "grief", citizenId: survivorId, effect: "grief_period", duration, note: "Mourning <deceased name>", cycleCreated, holiday, season }`. Duration is 3 Cycles normally and 5 when the current holiday is `Thanksgiving`, `Holiday`, or `NewYearsEve`. The payload carries neither the deceased POPID nor a neighborhood.
- **Lifetime and readers:** the raw entry exists only in `ctx.summary.pendingCascades`. `generateGenerationalSummary_` folds the array to a numeric count, and `buildCyclePacket.js` may render that count as `Pending Cascades: N`. A repo-wide current-code search found no reader of `grief_period`, no field-level reader of the raw grief entry, no duration decrement, and no Sheet/LifeHistory/DialState persistence. Therefore the prior "no cycle-packet reader" wording was too broad, while the underlying finding remains: grief has no mechanical consumer and disappears with the in-memory Ctx at Cycle end.
- **Task 2 constraint:** duration cannot become meaningful until the design names a persisted carrier or explicitly converts the cascade into an existing persisted tag/state. Adding only a dial-map entry would not consume this payload because it never reaches the dial path.

---

## Open questions

- [x] BACKLOG 27.10's own build trigger is "build when feedback loop data from C91+ confirms the golden-era pattern" — **CONFIRMED 2026-08-01** (Kimi pull, builder-approved). World summaries C92–C99 (`output/world_summary_c{92..99}.md`): Mayor Santana 78→88→93→95→95 — monotonic rise across 8 cycles, now pinned at 95; D1 Carter 72→94 (+8 in C99 alone); OPP cohort (D3/D5/D9) +5 in C99. Caveat shaping Task 4's design: the pattern is **factional**, not universal — CRC/IND seats drift −1/cycle to 58–59 over the same window, so the engine already produces slow decline for the opposition but zero event-level counter-pressure for the governing faction. Also note the C92 summary's own caveat: engine review pattern #16 flagged 26 approval values unchanged despite coverage (writeback-drift-vs-precision open question) — ceiling thresholds should use multi-cycle windows, not single-cycle deltas. Edition_Coverage_Ratings history not separately pulled (MCP `get_domain_ratings` returned no numeric table); the approval tables were decisive on their own.
- [ ] Does grief consumption belong in the dial engine (tag-driven, statistical) or should it be Track B typed state (research.17)? Default: Track A tag-driven now, migrate if research.17 produces a richer substrate. — informs Task 2

---

## Changelog

- 2026-07-31 — Initial draft (Kimi CLI, builder-directed external-audit remediation batch). Audit gaps #3+#4 combined with BACKLOG 27.9/27.10 (the project's own prior framing of the same gaps). Track A scoped to ungated work so the plan is pickable while research.17 is needs-info.
- 2026-08-01 — Kimi: corrected stale pointer — `grief_period` has no reader at `buildCyclePacket.js:350-351` (grep: no `grief` in that file at all); verified zero consumers engine-wide. Task 1 step updated accordingly.
- 2026-08-01 — Kimi: audit pointer added — build-order step 4 (Track A) / step 7 (Track B gate unchanged) of [[../research/2026-08-01-simulation-realism-audit]].
- 2026-08-01 — Kimi: Open question 1 RESOLVED (builder-approved pull): C92–C99 approval tables confirm the golden-era pattern for the governing faction (Mayor 78→95 monotonic, OPP cohort rising) with factional nuance (CRC/IND slow −1/cycle decline). Task 4's build trigger is met; thresholds should use multi-cycle windows per the C92 pattern-#16 caveat.
- 2026-08-09 — Codex: Task 1 complete (read-only). Mapped both death emit paths, survivor eligibility, exact payload, and 3/5-Cycle duration intent; corrected the stale "no cycle-packet reader" claim to count-only reporting. Confirmed no raw-payload consumer or persistence, so Task 2 must first choose a carrier before dial/event-pool design.
