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
  - "[[../adr/0015-world-config-tunable-values]] — approved home and failure contract for grief calibration values"
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
- **Files:** `phase04-events/generationalEventsEngine.js`, `phase05-citizens/generateCitizensEvents.js`, `utilities/compressLifeHistory.js`, `utilities/citizenDialMap.js` — read; this plan — modify
- **Steps:** Design the grief consumer against the actual Phase ordering and persistence seams. Grief should bias toward withdrawal/memorial/reconnection draws for a bounded window, not become permanent identity. Mike sign-off on the proposed event weights and existing-tag dial routing before build.
- **Verify:** design notes + approved weights/dial routing in Build notes
- **Status:** [x] done 2026-08-09 (Codex design; Mike-approved) — `World_Config` owns all six calibration values; code owns the structural invariants and existing-tag dial routing

### Task 3: Implement grief consumer (engine-sheet)
- **Files:** `phase04-events/generationalEventsEngine.js`, `utilities/compressLifeHistory.js`, `phase05-citizens/generateCitizensEvents.js`, `scripts/griefPeriod.test.js` — modify/add; `utilities/citizenDialMap.js` — read/use existing tags only; `World_Config` + `docs/SPREADSHEET.md` — add/document the six approved key rows in the separately approved Sheet-write step
- **Steps:** Implement the approved Task 2 envelope, required-config validation, Phase-9 drain, exact Cycle window, and Phase-5 pool consumption. Keep machine identity in fields/tags rather than parsing prose; preserve `MemoryRegisters.biases` and `.unlived` byte-for-byte when grief is unchanged. Read all calibration through `ctx.config`; no inline numeric defaults.
- **Verify:** targeted grief harness proves cascade → Phase-9 persistence → next-Cycle draw bias → expiry, plus missing/malformed config fails loud; grep finds no duplicate calibration literals in consumer code; `node scripts/compressLifeHistory.dial.test.js`, `node scripts/biasFold.test.js`, and `node scripts/unlivedEcho.test.js` remain green
- **Status:** [x] done 2026-08-09 (Codex, Mike-authorized takeover) — core `8285601d`, config 6/6 verified, exact main `068fc2d6` deployed to SANDBOX 0720 @39, and C112→C113 smoke passed with zero C113 engine errors. No natural death occurred in C113, so the attended fire proves deployment/config/no-regression while the 38/38 targeted harness supplies the grief-path proof.

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

### Task 2 — grief consumption design (Codex, 2026-08-09; Mike-approved)

#### Verified constraints

- **Phase order fixes the start boundary:** death cascades emit in Phase 4, citizen-event draws run in Phase 5, the existing `MemoryRegisters` writer runs in Phase 9, and the consolidated ledger commit runs in Phase 10 in both Cycle entry points. The single-writer design therefore begins grief consumption on the **next** Cycle; it does not add a second Phase-4 writer or depend on same-Cycle cache invalidation.
- **The literal `Quoted` precedent does not satisfy acceptance:** `Quoted` is already a persisted LifeHistory tag. Objective dial tags affect `base` only when repeated events age out of the raw-20 window and reach the three-event hardening threshold; compressor `mood` is zeroed and never serialized. The raw grief cascade is neither a LifeHistory tag nor persisted. Adding `DIAL_MAP.Grief` alone would therefore produce no next-Cycle effect.
- **Carrier:** extend the existing additive `MemoryRegisters` JSON with an optional singleton `grief` envelope. This column already carries non-identity citizen memory, is read by the citizen-event generator, and has one Phase-9 read-modify-write owner. Do not put grief into `DialState.base`, `streak`, or `chaosExposure`.

#### Proposed state and lifetime

```text
grief: { startCycle, throughCycle, sourceIds }
```

- Phase 4 adds `sourceCitizenId: deceasedId` to the cascade payload; Phase 9 must never identify the deceased by parsing `note`.
- For a cascade created in Cycle C with duration D, the envelope is active **C+1 through C+D inclusive**: 3 normal Cycles or 5 holiday-stress Cycles.
- Deduplicate `sourceIds`; duplicate qualifying bonds to the same deceased do not stack. A distinct loss during an active window may extend `throughCycle` to the later boundary but does not multiply weights. Cap `sourceIds` at 3 because identity is provenance, not an unbounded memorial ledger.
- Phase 5 treats malformed or out-of-window state as inactive. Phase 9 removes the expired `grief` field on its next scan while preserving every other top-level register field.

#### Approved consumer and dial routing

- **Direct grief-to-identity delta: none.** The envelope changes event opportunity, not permanent personality; storage and expiry must leave `DialState.base` and `streak` byte-identical.
- While active, multiply the citizen's overall atmospheric participation chance by the required `World_Config.griefParticipationMultiplier` (**0.80** at approval).
- In the ordinary pool, multiply public/out-and-about sources (`source:fame`, `source:prevEvening`, First Friday, sports, holiday/city-event attendance) by required `World_Config.griefPublicActivityMultiplier` (**0.75**); multiply living-support sources (family life, faith, community, alliance, mentorship) by required `World_Config.griefSupportMultiplier` (**1.25**). Apply each family once per entry so multi-tag rows do not compound accidentally.
- Permit at most one grief-specific response per citizen per Cycle through a reserved roll against required `World_Config.griefResponseChance` (**0.35**). The small response pool contains withdrawal, memorial, and reconnection entries; it does not name or invent the deceased. Route selected responses through existing primary tags and existing deltas: `grief:withdrawal` → `Strain` `{composure:-1}`; `grief:memorial` → `Personal` `{openness:+2}`; `grief:reconnection` → `Community` `{sociability:+4,warmth:+2}`. The temporary state expires; only a response the citizen actually lives enters normal LifeHistory hardening.

#### Approved `World_Config` keys

| Key | Approved value | Consumer |
|---|---:|---|
| `griefDurationCycles` | 3 | ordinary grief envelope duration |
| `griefHolidayDurationCycles` | 5 | stress-holiday grief envelope duration |
| `griefParticipationMultiplier` | 0.80 | active citizen participation chance |
| `griefPublicActivityMultiplier` | 0.75 | public/out-and-about pool entries |
| `griefSupportMultiplier` | 1.25 | living-support pool entries |
| `griefResponseChance` | 0.35 | maximum-one reserved response roll |

Per [[../adr/0015-world-config-tunable-values]], these are required key→value rows loaded once per Cycle through the existing `loadConfig_` path. The consumers validate presence, numeric type, and range and fail loud on absence or malformed values; they must not carry behavior-preserving code defaults. The following remain structural code invariants rather than tunables: C+1 start/inclusive expiry semantics, source deduplication, source cap 3, no multiplier stacking, maximum one response per Cycle, machine-tag routing, and zero direct identity mutation.

#### Implementation acceptance fence

1. Alliance/mentorship death emits machine provenance and the existing 3/5 duration; rivalry emits no grief.
2. Phase 9 persists grief for a compress-ineligible survivor without changing dial identity, biases, or unlived memory.
3. A seeded next-Cycle harness shows lower public/out-and-about selection and higher support/grief-response selection than the identical no-grief citizen.
4. The created Cycle is unaffected by the Phase-9 carrier; Cycles C+1..C+D are active; C+D+1 is inactive and the later Phase-9 scan removes the field.
5. Duplicate bonds/source IDs and overlapping losses never compound the numeric multipliers; no citizen emits more than one grief-specific response per Cycle.
6. Missing, nonnumeric, or out-of-range grief config keys fail loud; the targeted harness supplies all six keys explicitly and proves changed config values alter the seeded result without a code edit.

### Task 3 — local implementation handoff (Codex, 2026-08-09)

- **Landed core (`8285601d`, authored Codex, landed by Kimi):** `generationalEventsEngine.js` validates grief config at entry, uses configured ordinary/holiday duration, and emits `sourceCitizenId`. `compressLifeHistory.js` validates the six required values once per Ctx, preflights every survivor before mutation, folds/deduplicates bounded envelopes through the existing Phase-9 `MemoryRegisters` RMW, prunes expiry, and leaves grief-only `DialState` cells byte-identical. `generateCitizensEvents.js` consumes active envelopes for participation, once-per-family ordinary-pool weighting, and a maximum-one reserved response routed through `Strain`, `Personal`, or `Community`.
- **Calibration boundary:** consumer code contains no approved default values. Durations, three multipliers, and response probability come only from `ctx.config`; inclusive lifetime, source cap 3, deduplication, non-stacking, one-response cap, and tag routing remain structural invariants.
- **Harness:** new `scripts/griefPeriod.test.js` passes 38/38 assertions, including exact C+1..C+D activity, expiry, duplicate bonds, overlapping losses, source cap, malformed config/state, missing-survivor preflight, pool weights, seeded participation, response cap/routing, and zero direct dial mutation. Existing targeted harnesses pass 164/164: compressor dial 49, bias fold 25, unlived echo 8, content-ledger composition 13, fame 12, unlived fold 23, engine.32 multi-Cycle 19, and citizen-dial multi-Cycle 15. The complete offline runner also passes 134/134 test files.
- **Test-fixture compatibility:** `citizensEventsFame.t3.test.js`, `contentLedgerCompose.test.js`, and `unlivedEcho.test.js` now provide the explicit required config fixture and shared grief helpers; no behavior defaults were added.
- **Config migration:** `scripts/applyGriefWorldConfig.js` is dry-run by default, forbids environment-default targets, requires a matching explicit target confirmation for apply, refuses conflicting or duplicate keys, and performs read-back verification. `docs/SPREADSHEET.md` records the six-row contract and the required sandbox→production replay boundary.
- **Gate:** Mike authorized Codex to take over the former Claude landing and sandbox proving lane on 2026-08-09. Production remains untouched; sandbox config, temp-dir deployment, attended fire, Sheet read-back, and `Engine_Errors` proof are the active steps.
- **Sandbox proof:** SANDBOX 0720 was at Cycle 112 with zero grief registers. The six required rows were appended and read-back verified 6/6. A fresh temp directory was built from exact pushed main `068fc2d6`; its sandbox clasp target was verified while the production target remained untouched, 171 files were pushed, and the existing web deployment was advanced to @39. Pull-back verified all 171 remote files byte-identical to the frozen payload with zero test files. The attended fire advanced C112→C113 with all six config rows retained, zero C113 engine errors, and `LifeHistory_Log` compressed from 24,783 to 24,353 rows. C113 had no natural death and therefore no grief envelope; grief-path behavior is established by the 38/38 targeted harness, not claimed from this smoke.

---

## Open questions

- [x] BACKLOG 27.10's own build trigger is "build when feedback loop data from C91+ confirms the golden-era pattern" — **CONFIRMED 2026-08-01** (Kimi pull, builder-approved). World summaries C92–C99 (`output/world_summary_c{92..99}.md`): Mayor Santana 78→88→93→95→95 — monotonic rise across 8 cycles, now pinned at 95; D1 Carter 72→94 (+8 in C99 alone); OPP cohort (D3/D5/D9) +5 in C99. Caveat shaping Task 4's design: the pattern is **factional**, not universal — CRC/IND seats drift −1/cycle to 58–59 over the same window, so the engine already produces slow decline for the opposition but zero event-level counter-pressure for the governing faction. Also note the C92 summary's own caveat: engine review pattern #16 flagged 26 approval values unchanged despite coverage (writeback-drift-vs-precision open question) — ceiling thresholds should use multi-cycle windows, not single-cycle deltas. Edition_Coverage_Ratings history not separately pulled (MCP `get_domain_ratings` returned no numeric table); the approval tables were decisive on their own.
- [x] **Task 2 decision (Mike, 2026-08-09):** adopt the Track-A `MemoryRegisters.grief` envelope and approved weights/routing above, with every calibration value in `World_Config` per ADR-0015. This is bounded situational state on an existing carrier, not Track-B grudge/ambition identity and not a new ledger. The prior dial-engine-vs-typed-state question is resolved in favor of event-pool state plus existing-tag dial effects.

---

## Changelog

- 2026-07-31 — Initial draft (Kimi CLI, builder-directed external-audit remediation batch). Audit gaps #3+#4 combined with BACKLOG 27.9/27.10 (the project's own prior framing of the same gaps). Track A scoped to ungated work so the plan is pickable while research.17 is needs-info.
- 2026-08-01 — Kimi: corrected stale pointer — `grief_period` has no reader at `buildCyclePacket.js:350-351` (grep: no `grief` in that file at all); verified zero consumers engine-wide. Task 1 step updated accordingly.
- 2026-08-01 — Kimi: audit pointer added — build-order step 4 (Track A) / step 7 (Track B gate unchanged) of [[../research/2026-08-01-simulation-realism-audit]].
- 2026-08-01 — Kimi: Open question 1 RESOLVED (builder-approved pull): C92–C99 approval tables confirm the golden-era pattern for the governing faction (Mayor 78→95 monotonic, OPP cohort rising) with factional nuance (CRC/IND slow −1/cycle decline). Task 4's build trigger is met; thresholds should use multi-cycle windows per the C92 pattern-#16 caveat.
- 2026-08-09 — Codex: Task 1 complete (read-only). Mapped both death emit paths, survivor eligibility, exact payload, and 3/5-Cycle duration intent; corrected the stale "no cycle-packet reader" claim to count-only reporting. Confirmed no raw-payload consumer or persistence, so Task 2 must first choose a carrier before dial/event-pool design.
- 2026-08-09 — Codex: Task 2 design drafted after tracing both Cycle entry points, the Phase-9 `MemoryRegisters` single-writer seam, dial serialization, and Phase-5 weighting. Rejected direct `base` mutation and a stand-alone `Grief` map entry; proposed a next-Cycle bounded register envelope plus withdrawal/memorial/reconnection pool bias. Awaiting Mike's numeric/routing sign-off; no engine code changed.
- 2026-08-09 — Codex: Task 2 approved and closed after Mike's config-vs-code correction. All six calibration values moved to required `World_Config` keys under ADR-0015; Cycle boundaries, deduplication/caps, tag routing, and zero direct identity mutation remain structural code invariants. Task 3 is build-ready; no Sheet rows or engine code changed in this design close.
- 2026-08-09 — Codex: Task 3 built locally and validated (targeted 202 assertions; full offline suite 134/134 files). Recorded the engine-sheet landing gate plus the still-separate `World_Config`, spreadsheet-contract, sandbox, and deployment steps; no live state changed.
- 2026-08-09 — Codex: Mike authorized Codex takeover after Claude left the project. Kimi concurrently landed the Codex-authored core as `8285601d`; Codex added a guarded, replayable grief-config migration and spreadsheet contract and continued SANDBOX 0720 staging with production explicitly out of scope.
- 2026-08-09 — Codex: Task 3 sandbox stage complete. Exact main `068fc2d6` pull-back matched 171/171 files with no tests; SANDBOX 0720 advanced C112→C113 with config 6/6 retained, zero C113 engine errors, and expected LifeHistory compression. No natural death occurred, so grief-path proof remains the targeted 38/38 harness. Production untouched.
