---
title: Citizen Memory & Perception Plan (Typed Emotion + Folk Memory)
created: 2026-07-31
updated: 2026-10-04
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
- **Files:** `phase04-events/generationalEventsEngine.js`, `utilities/compressLifeHistory.js`, `phase05-citizens/generateCitizensEvents.js`, `scripts/griefPeriod.test.js` — modify/add; `utilities/citizenDialMap.js` — read/use existing tags only; `phase01-config/engine94SheetContract.js` + `World_Config` + `docs/SPREADSHEET.md` — code-carry, create, and document the six approved key rows
- **Steps:** Implement the approved Task 2 envelope, required-config validation, Phase-9 drain, exact Cycle window, and Phase-5 pool consumption. Keep machine identity in fields/tags rather than parsing prose; preserve `MemoryRegisters.biases` and `.unlived` byte-for-byte when grief is unchanged. Read all calibration through `ctx.config`; no inline numeric defaults.
- **Verify:** targeted grief harness proves cascade → Phase-9 persistence → next-Cycle draw bias → expiry, plus missing/malformed config fails loud; grep finds no duplicate calibration literals in consumer code; `node scripts/compressLifeHistory.dial.test.js`, `node scripts/biasFold.test.js`, and `node scripts/unlivedEcho.test.js` remain green
- **Status:** [x] done 2026-08-09 (Codex, Mike-authorized takeover) — core `8285601d`, config 6/6 verified, exact main `068fc2d6` deployed to SANDBOX 0720 @39, and C112→C113 smoke passed with zero C113 engine errors. C113 had no natural death; after the shared C114–C115 fires, the C116 read-back found one naturally active grief register with one machine source and zero C116 engine errors. The 38/38 targeted harness supplies deterministic cascade, bias, response, and expiry proof.

### Task 4: Design 27.10 feedback ceilings (research-build)
- **Files:** `phase05-citizens/updateCivicApprovalRatings.js`, `phase05-citizens/runCivicElectionsv1.js`, `phase05-citizens/neighborhoodTrajectoryEngine.js`, `docs/plans/BACKLOG.md:257` — read; this plan — modify
- **Steps:** Design soft ceilings: (a) scandal probability scales with consecutive Cycles of high approval through the every-Cycle approval writer, with the election engine retaining the existing scandal consequence; (b) verify whether rapid development → housing-pressure coupling still needs a build or is already owned by engine.54/engine.55. First resolve Open question 1 (BACKLOG's own build-trigger condition).
- **Verify:** ceiling formulas in Build notes; Mike sign-off
- **Status:** [x] done 2026-08-09 (Codex design; Mike-approved) — approval ≥80 advances a streak; Cycle 3 starts at 5%, each further high Cycle adds 5%, capped at 30%; a trigger owns `Status=scandal` for 3 Cycles and drops approval 12 points. All calibration is required `World_Config`. Housing pressure was already closed by the trajectory engine and is not rebuilt.

### Task 5: Implement scandal-ceiling mechanic (engine-sheet)
- **Files:** `phase05-citizens/updateCivicApprovalRatings.js`, `phase05-citizens/runCivicElectionsv1.js`, `phase01-config/godWorldEngine2.js` — modify; `phase01-config/engine94SheetContract.js`, `scripts/engine94SheetContract.test.js`, `scripts/civicApprovalCeiling.test.js`, `scripts/applyApprovalCeilingConfig.js`, `scripts/applyApprovalCeilingConfig.test.js` — add; `docs/SPREADSHEET.md` — modify
- **Steps:** Track post-update high approval every Cycle; use seeded RNG for the approved risk curve; write a bounded, source-owned scandal lifecycle and immediate approval correction; emit a story/ripple hook without inventing allegations; preserve manual statuses; keep the configured election penalty; clear state on election turnover. Persist `HighApprovalStreak`, `AutoScandalUntilCycle`, and `AutoScandalSource` on the office ledger.
- **Verify:** deterministic unit harness proves validation, streak/chance curve, cap, approval drop, inclusive expiry, manual-status safety, event/ripple output, election penalty, turnover reset, and no `Math.random`; migration harness proves dry-run/confirmation/idempotence/conflict failure
- **Status:** [x] done 2026-08-09 (Codex) — safety correction `d3b70f3c` code-carries and self-arms all 14 config rows and 3 headers before world-state mutation; exact sandbox @41 passed C116 with 128 phases, zero errors, and retained config/schema

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
- **Config migration:** `scripts/applyGriefWorldConfig.js` is dry-run by default, forbids environment-default targets, requires a matching explicit target confirmation for apply, refuses conflicting or duplicate keys, and performs read-back verification. It remains an audit/rehearsal tool. `engine94SheetContract.js` is the production mechanism and code-carries the six-row contract; no sandbox Sheet replay is required.
- **Gate:** Mike authorized Codex to take over the former Claude landing and sandbox proving lane on 2026-08-09. Exact code-only safety commit `d3b70f3c` is sandbox-proven at @41/C116. Production remains untouched.
- **Sandbox proof:** SANDBOX 0720 was at Cycle 112 with zero grief registers. The six required rows were appended and read-back verified 6/6. A fresh temp directory was built from exact pushed main `068fc2d6`; its sandbox clasp target was verified while the production target remained untouched, 171 files were pushed, and the existing web deployment was advanced to @39. Pull-back verified all 171 remote files byte-identical to the frozen payload with zero test files. The attended fire advanced C112→C113 with all six config rows retained, zero C113 engine errors, and `LifeHistory_Log` compressed from 24,783 to 24,353 rows. C113 had no natural death and therefore no grief envelope. After shared C114–C115 fires produced the natural input, C116 read-back found one active grief envelope with one machine source and zero errors. The 38/38 targeted harness supplies deterministic grief-path behavior and expiry proof.

### Task 4 — feedback-ceiling design (Codex, 2026-08-09; Mike-approved)

- **Build trigger:** already met by the recorded C92–C99 approval trajectory; SANDBOX 0720 at C113 independently has 35 populated active offices, four approvals at or above 80, and a maximum of 95.
- **Correct producer:** `runCivicElectionsv1.js` runs meaningful election logic only once per 208-Cycle office group and merely consumes `Status=scandal`; repo-wide tracing found no engine writer or expiry path for that civic status. The ceiling therefore belongs in the every-Cycle `updateCivicApprovalRatings_` writer. Elections keep the configured incumbent consequence and clear state on turnover.
- **Approved curve:** post-update approval ≥80 advances `HighApprovalStreak`. Cycles 1–2 do not roll. Cycle 3 rolls at 0.05; each further consecutive high Cycle adds 0.05; probability caps at 0.30. A trigger immediately drops approval 12 points, resets the streak, owns `Status=scandal` for three inclusive Cycles, and emits a deterministic story/ripple hook. Manual scandals and external statuses are never auto-cleared.
- **State:** append `HighApprovalStreak`, `AutoScandalUntilCycle`, and `AutoScandalSource` to `Civic_Office_Ledger`. `AutoScandalSource=approval-ceiling` is the ownership marker; malformed owned expiry fails loud. Election turnover resets all three fields.
- **Configuration:** the threshold, streak minimum, base/step/cap probabilities, duration, approval drop, and existing 25-point election penalty are eight required `World_Config` keys under ADR-0015. There are no code defaults.
- **Housing-pressure verdict:** no Task 5 build. `neighborhoodTrajectoryEngine.js` already turns a city-relative growth score into trajectory momentum; growth raises `HousingPressure` by +0.5 or +1 each Cycle, pressure ≥8 adds the rent kicker and `HOUSING_PRESSURE_HIGH` hook, and engine.55 consumes the state for displacement/relocation. Engine.93 additionally feeds actual relocation deltas back through the same sole writer. A second 27.10 writer would duplicate and risk clobbering the working lane.

### Task 5 — local implementation (Codex, 2026-08-09)

- `updateCivicApprovalRatings.js` now validates the eight-key config, advances and persists the every-Cycle streak, performs one seeded roll only after the minimum, applies the approved correction, owns/clears bounded auto-scandal state, and emits `CIVIC_APPROVAL_SCANDAL` through `storyHooks` plus `Ripple_Ledger` attribution. Existing approval deltas and neighborhood ripples receive the combined net change.
- `runCivicElectionsv1.js` reads the configured 25-point scandal penalty and clears all owned state on election turnover so a challenger cannot inherit the incumbent's streak or scandal.
- `applyApprovalCeilingConfig.js` is a dry-run-default audit/rehearsal tool for the eight config rows plus three office columns, with explicit target/confirmation, pre-write conflict checks, interrupted-prefix recovery, and read-back verification. Production does not depend on running it.
- Local proof: `civicApprovalCeiling.test.js` 27/27; migration contract 17/17; full offline suite 140/140 files; all four changed/new scripts pass `node --check`; no `Math.random` calls in the changed engine files.
- Sandbox proof: SANDBOX 0720 at C113 accepted and read-back verified all eight config rows plus the three contiguous state columns at T:V. Exact pushed main `dda0b129` changed only the two intended Phase-5 files relative to @39; @40 pull-back matched 171/171 files byte-for-byte with zero test files. Shared proving fires advanced through C114–C115. Independent C115 read-back found all four offices at approval ≥80 on streak 2, all six below threshold on streak 0, no premature auto/manual scandal, config 8/8 retained, columns 3/3 retained, and zero `Engine_Errors` in both Cycles. The targeted deterministic harness supplies the Cycle-3 risk-curve/trigger/expiry proof.
- Deployment-safety correction: Mike caught that commits `8285601d`/`dda0b129` were not safe as standalone production code because required sandbox Sheet mutations do not transfer. `ensureEngine94SheetContract_` now runs directly after opening the spreadsheet and before cache creation, ledger initialization, time advance, or any Cycle write. It preflights both sheets, seeds all 14 missing engine.94 config rows, appends the three missing civic headers, preserves valid tuned values, verifies writes, and is write-free once armed. Invalid/duplicate config or conflicting headers abort before mutation. The new first-live-Cycle harness passes 24/24; grief remains 38/38, approval 27/27, targeted ESLint clean, and the full offline suite passes 141/141 files.
- Safety-correction sandbox proof: exact main `d3b70f3c` changed only `godWorldEngine2.js` plus the new self-arm file relative to @40. SANDBOX 0720 @41 pull-back matched 172/172 files byte-for-byte with zero tests. The shared token fired C116 successfully (`ok:true`, 128 phases). Read-back retained all 14 config keys and 3 headers, put all four ≥80 offices at streak 3 and all six lower offices at 0, emitted no scandal on the seeded 5% misses, and found zero C116 engine errors. The already-armed bench proves idempotent runtime behavior; the 24/24 fake-fresh-Sheet harness proves first-production-Cycle creation and pre-write conflict aborts. Production remained untouched.

---

## Open questions

- [x] BACKLOG 27.10's own build trigger is "build when feedback loop data from C91+ confirms the golden-era pattern" — **CONFIRMED 2026-08-01** (Kimi pull, builder-approved). World summaries C92–C99 (`output/world_summary_c{92..99}.md`): Mayor Santana 78→88→93→95→95 — monotonic rise across 8 cycles, now pinned at 95; D1 Carter 72→94 (+8 in C99 alone); OPP cohort (D3/D5/D9) +5 in C99. Caveat shaping Task 4's design: the pattern is **factional**, not universal — CRC/IND seats drift −1/cycle to 58–59 over the same window, so the engine already produces slow decline for the opposition but zero event-level counter-pressure for the governing faction. Also note the C92 summary's own caveat: engine review pattern #16 flagged 26 approval values unchanged despite coverage (writeback-drift-vs-precision open question) — ceiling thresholds should use multi-cycle windows, not single-cycle deltas. Edition_Coverage_Ratings history not separately pulled (MCP `get_domain_ratings` returned no numeric table); the approval tables were decisive on their own.
- [x] **Task 2 decision (Mike, 2026-08-09):** adopt the Track-A `MemoryRegisters.grief` envelope and approved weights/routing above, with every calibration value in `World_Config` per ADR-0015. This is bounded situational state on an existing carrier, not Track-B grudge/ambition identity and not a new ledger. The prior dial-engine-vs-typed-state question is resolved in favor of event-pool state plus existing-tag dial effects.
- [x] **Task 4 decision (Mike, 2026-08-09):** approve the 80 / 3-Cycle / 5%-plus-5%-to-30% scandal curve, three-Cycle owned status, 12-point approval correction, and existing 25-point election consequence as required `World_Config`. Persist three explicit office-state fields; never clear manual scandals. Treat rapid-development housing pressure as already implemented by the engine.54/55/93 trajectory lane.

---

## Status log

### engine.94 — status (drained from ROLLOUT, 2026-09-04 / S418)

Citizen memory and approval ceiling — Track A code-only self-arm plus grief and approval mechanics sandbox-proven through C116. Track B **ambition RULED S416 by engine.157** — the ambition axis is the existing `drive` dial (+ `openness`), typed ambition is the goal read off the chain rung, no ninth dial; grudge + folk-memory design still gated on research.17 and a Mike design session

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
- 2026-08-09 — Codex: Task 4 designed and Mike-approved after tracing the actual writers. Housing pressure already closes the development half; the every-Cycle approval writer owns the new scandal ceiling. Task 5 passed 27/27 behavior, 17/17 migration, and the 140/140-file offline suite; sandbox proof remains.
- 2026-08-09 — Codex: Task 5 staged on SANDBOX 0720. Migration read-back is 8/8 config and 3/3 columns; exact main `dda0b129` is deployed @40 with a 171/171 byte-identical pull-back and zero test files. C113 pre-fire state is clean; attended C114 fire remains.
- 2026-08-09 — Codex: Task 5 sandbox proof closed from the shared C114–C115 fires. All four ≥80 offices persisted streak 2, the other six remained 0, no premature scandal fired, config/schema remained exact, and both Cycles had zero engine errors. Track A is complete; Track B remains gated on research.17.
- 2026-08-09 — Codex: Mike identified a release-blocking deployment flaw: the engine.94 commits required Sheet state that a code-only production deploy would not carry. Added a pre-Cycle, code-carried, idempotent self-arm for all 14 config rows and 3 headers; 24/24 first-live-Cycle assertions and the 141/141-file suite pass. Sandbox redeploy proof remains before Track A can close again.
- 2026-10-04 03:35 — rb (overnight): B.1 DRAFTED by codex as a patch (`output/codex/engine94-b1.patch` + notes, against HEAD a05d9c3d), VERIFIED by rb (apply --check clean; 7 test files green in a scratch worktree; hunks read against the B.1 table), handed to engine-sheet to land with B.2a. Codex's one correction accepted: the grief stamp lives in `utilities/compressLifeHistory.js` (the actual `MemoryRegisters.grief` writer, Phase 9), not `generationalEventsEngine.js`; the generator sees it the Cycle after.
- 2026-10-04 — rb (overnight): B.2 rows authored (`scripts/memoryEclPool.js`, 24 rows, bars provisional); apply path `undockedEclPoolApply.js --pool memory`; B.2a routing tags specified for es.
- 2026-10-04 — es (overnight): B.3 BUILT (§B.3 body) — one TENSION bond after a contested race between two tracked rows, POPIDs only, loser's hood, `results[].grudgeBond`; tests B3.1–B3.9 on the real path; suite 284/284. Bench waits.
- 2026-10-04 14:10 — es: B.3 is on the retired calendar election, not the v1.5 approval-drop election; never bench at C201. Re-hook plan in §B.3 "Wrong seam".
- 2026-10-04 — es (overnight): B.1 + B.2a LANDED `54c10b76` (codex patch, hunks read; 3 `memory:` routes proven in contentLedgerCompose; suite 284/284; `--pool memory` dry run 24 NEW, no write). Bench copies need a `Judicial_Ledger` tab (Phase 5 throws without it). Bars wait on the post-C110 bench.
- 2026-10-04 12:5x — rb: B.2 bar histogram read from SANDBOX 1004 at C111 (window 8, read-only; 1,031 ledger rows, 22 hoods). Result: hooddeaths 0 in 22 hoods; hoodcharged 0 in 22 (Judicial_Ledger has 0 rows after C110+C111); hoodclosed 0 in 22; hoodhospital 0 in 20, 1 in one hood, 3 in one hood; bereaved carriers 0; defaulted carriers 2 (ages 0 and 1 Cycles); charged carriers 0. Every provisional bar is above what the input reaches, per B.5.3 that is correct behaviour and the bars stay; the histogram cannot set final bars until arrests and deaths accumulate. Rows stay unapplied (live loader rejects them until B.1 is on PROD anyway). Re-read the histogram after live C115, then apply.
- 2026-10-04 — rb (overnight): Track B designed as "memory that fires" — §Track B design below: history fields on the content DSL from the 12-Cycle LifeHistory_Log + DialState stamps + bonds, ~24 authored memory rows, one election TENSION seed. No new store. engine.94 ROLLOUT → in-progress.
- 2026-08-09 — Codex: Deployment-safety correction `d3b70f3c` sandbox-proven @41/C116. Exact 172/172 pull-back, 128 phases `ok:true`, config 14/14 and headers 3/3 retained, qualifying streaks advanced to 3, one naturally active grief register carried one machine source, and zero engine errors. The commit is now independently safe under the code-only production deployment model; Track A closes again.

## Builder ruling 2026-09-27 — grudge / folk memory
Verbatim: "may require all or some of these, event_content_ledger may be a place for folk memory to comeback as
events, but the folk memory would have to serve the sim rather than add another level of stored memory." **Read:**
no new memory store for its own sake. Folk memory returns as EVENTS (Event_Content_Ledger conditions that fire
because of what happened before); grudges may use bonds and/or dial tags as needed. Test: does it make something
happen in the sim, not does it remember more.

## Track B design — memory that fires (research-build, 2026-10-04 overnight; builder priority 2026-09-29)

**Tier A. Reads the 2026-09-27 ruling as written: no new store; folk memory returns as events; grudges via bonds as needed; the test is "does it make something happen."** Every carrier below already exists on the sheet or in `S`. The cut adds *condition fields* and one *bond seed*; the content that fires is operator-authored rows in `Event_Content_Ledger`, the same surface every other texture uses.

### B.0 Measured 2026-10-04 02:30 (live sheet + code)

- `Event_Content_Ledger`: 350 rows (328 lines, 22 fragments). Fields conditioned on today: `lifestate` 103, `occupation` 87, `band` 67, `age` 39, `wealth` 37, `hood` 34, `children` 28, `undocked` 22, `heritage` 8, `undockedpilot` 8, `warmth` 7, `fame` 6, `hoodtrend` 4, `momentum` 2, `drive` 2. **Not one field reads the past.** The DSL table (`phase02-world-state/loadEventContentLedger.js:64-112`) and the scopes (`phase05-citizens/generateCitizensEvents.js:2740-2800`) are the two places a field lives; `hoodtrend`/`momentum` (engine.79, `27776f0a`) are the precedent for adding a pair.
- `LifeHistory_Log`: 20,573 rows, all C98–C109 — `utilities/archiveLifeHistory.js:45` keeps the last **12 Cycles** (`CYCLE_RETAIN_CYCLES`), older rows go to `LifeHistory_Archive`. Columns `Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle`; `EventTag` = `Primary|tag|tag…`. The generator already opens the tab every Cycle (`generateCitizensEvents.js:296`, engine.38 A2 anti-inert floor).
- Primary tags with consequence in the window: `Death` 8, `Setback` 7, `Rivalry` 7, `Transgression-Serious` 3, `Hospitalized` 2, `Critical` 1, `Recovering` 15. Thin on purpose: the judicial (`Money` fines, arrests — `judicialLifecycle.js:444-447`), debt-default (`generationalWealthEngine.js:520`, plus `DialState.debtDefault {l, n}`), ticket and property-tax lines all start at C110. Memory has little to read today and a great deal from next week.
- Hood on the log row is filled for the tracked hoods (Lake Merritt 2,044 … Jack London 1,527 rows in the window).
- Grudge carrier: `bondEngine.js` TENSION → RIVALRY at intensity ≥ 6, TENSION → PROFESSIONAL at ≤ 2 after 3 Cycles (`:840-858`); `createBond_(ctx, a, b, type, origin, domainTag, neighborhood, notes)` (`:2709`). Elections (`runCivicElectionsv1.js:319-345`) name winner and challenger and create no bond between them.
- Hood direction memory already exists one level up: trajectory `momentum` 0–10 accumulates across Cycles (`neighborhoodTrajectoryEngine.js:193-197`).

### B.1 Fields — the past becomes addressable (engine-sheet builds; codex may draft against this spec)

One pass per Cycle inside the whole-tab `LifeHistory_Log` read the generator already does (`generateCitizensEvents.js:307-321`, `getDataRange().getValues()` — measured 2026-10-04: whole tab, not a tail; B.1 extends that loop, no new read), window = `folkMemoryWindow` Cycles (World_Config, default **8**, hard-capped at the log's 12), producing `S.folkMemory = { byHood: { hood: { tag: count } }, byCitizen: { POPID: { tag: lastCycle } } }` for a **locked tag set** (the DSL vocab rule, S289: a typo narrows, never widens). **Hood is resolved from the ledger row by POPID** (`ctx.ledger` is in hand), with the log's `Neighborhood` only as fallback: 1,198 of 20,573 log rows carry a blank hood, and the writers that matter are the blank ones — `Death` 8/8, `Health` 22/35, every `Career-*` line. Then the DSL table and the scopes gain:

| Field | Kind | Reads | Null (fails the term) when |
|---|---|---|---|
| `bereaved` | num | Cycles since `DialState.grief.l` — a stamp the Track A grief writer (`generationalEventsEngine.js`, the `MemoryRegisters.grief` envelope) adds in B.1, same shape as `debtDefault {l}`. The register itself clears after `griefDurationCycles` 3 / `griefHolidayDurationCycles` 5, so it cannot carry a year; the stamp can. Survivor's row, never the deceased's | never bereaved |
| `charged` | num | Cycles since the citizen's latest `Judicial_Ledger` row (`ArrestCycle`; the tab `judicialLifecycle.js` already reads) — not the log: the arrest life line's tag is not a bracket line in that writer, and the ledger row carries Neighborhood, StatusNow, Outcome | no case |
| `defaulted` | num | Cycles since `DialState.debtDefault.l` | never defaulted |
| `rival` | flag | an ACTIVE `rivalry` or `sports_rival` bond on this citizen | — |
| `hooddeaths` | num | `Death` rows in the citizen's hood, window | hood has no log rows → 0, not null (an empty hood is a quiet hood) |
| `hoodcharged` | num | `Judicial_Ledger` rows with `Neighborhood` = hood and `ArrestCycle` in window | same |
| `hoodhospital` | num | `Hospitalized` + `Critical` rows in the hood, window | same |
| `hoodclosed` | num | `[RoutineRetrenched]` lines (`applyBusinessDynamics.js:349`) in the `LifeHistory` column of ledger rows in the hood whose `Y<n>C<m>` stamp falls in the window — that writer appends to the column only, never to the log | same |

Rules: numeric, so a row author sets the bar (`hoodcharged>=4`, `charged<=3`); the count is of **tracked** lines, so bars are tracked-scale (a hood with 4 charges in 8 Cycles is loud — the ledger is the 0.25% subset, never a world denominator). No new tab, no new column, no new store: `S.folkMemory` is rebuilt every Cycle from the log and dies with the run.

### B.2 Content — what the memory makes happen (research-build authors; bench first, PROD rows ride the code deploy)

24 rows authored in `scripts/memoryEclPool.js` (written 2026-10-04; `node scripts/memoryEclPool.js` validates structure; `node scripts/undockedEclPoolApply.js --pool memory [--apply]` is the idempotent append, the same path the UNDOCKED pool used), pools `memory.hood.{loud,ward,loss,shutters}` and `memory.own.{court,default,grief,rival}`. **Measured 2026-10-04:** under ruling 1b most primaries are plain days (`utilities/citizenDialMap.js` — `Neighborhood`, `Personal`, `Daily` move nothing; `Continuity` has no entry), so a memory row routed through a source alone would only remember. **B.2a (engine-sheet, three lines in `primaryFromTags`, `generateCitizensEvents.js:804-`):** `memory:strain` → `Strain` (composure −1), `memory:community` → `Community` (sociability +4, warmth +2), `memory:rivalry` → `Rivalry` (sociability +2, composure −3); checked before the `source:` branches, like the `grief:`/`relationship:` tags are. First tag stays `source:continuity` so the loader's whitelist accepts the row. Rows are rejected by the live loader until B.1 lands (unknown field → skip, S289), which is the intended order. Shape, not final text: a hood four charges deep draws "still checks the lock twice since the spring the block got loud" (`hoodcharged>=4`, source routed to the wary side); a citizen three Cycles past a court date draws "kept the receipt from the court clerk in the kitchen drawer" (`charged<=3`); a defaulted citizen a year on draws the long version (`defaulted>=40`); a bereaved household at the one-year mark (`bereaved>=50; bereaved<=53`). **Bars come from the bench, not the plan:** named judicial lines will be fractional at first, so every seeded row's threshold is set from a post-C110 bench histogram of `S.folkMemory`, never authored cold. **The test is the ruling's:** each row moves a dial or seeds a bond when drawn; a row that only remembers is cut.

### B.3 Grudge seed — one named loss makes one named bond (engine-sheet)

**Wrong seam (2026-10-04 14:10).** `6cfe7ef5` hooks `runCivicElectionsv1.js`, the pre-ruling calendar election (week 45, even years, first C201). The v1.5 ruling (builder-direct 2026-08-13, `updateCivicApprovalRatings.js:41-43`) replaced it: crossing 40 starts a citizen campaign, crossing 20 seats the challenger, no election window. Neither the design nor the build read that header. Fix: move the TENSION bond to the seating block (`updateCivicApprovalRatings.js:848`, `incumbentPop` ↔ `campaign.pop`; Phase5-ApprovalRatings runs after LoadBonds, before Bonds — same seam); B3 tests move with it; retire `runCivicElections_` at both call sites (`godWorldEngine2.js:594`, `:2272`) so no calendar election fires at C201. Checks first: a holder-survives path (campaign cleared above 40)? a bench seat near 20? any `[CAMPAIGN` note ever on live? Codex reviews before the cut. The body below describes the superseded hook.

**Checks (2026-10-04 14:58, es).** (1) No holder-survives path: once `shouldStartCampaign_` fires, `:783` re-writes the campaign note every Cycle the holder stays (`!leaving`), with no clear on recovery — a campaign ends only in a seating. Second half of B.3 does not exist in this world; dropped. (2) Live Civic_Office_Ledger, 39 offices: approval 62–69, zero `[CAMPAIGN` notes, zero demotion/left-office notes — the <40 campaign gate has never fired on PROD (§15 shape; rate is a sim call, reported to builder, not touched here). (3) Bench SANDBOX 1004, 46 offices (7 BOARD-OUSD fixtures): approval 55–69, no campaigns — seating needs a fixture. Same-fire path exists: campaign starts at `:751` before `shouldLeaveOffice_` at `:767`, so a seat at approval 20 with no campaign that drops below 20 in one fire starts AND seats. (4) Wiring card: `S.electionResults` has zero readers (orphaned write); `Election_Log` readers are `getCivicContextForPacket_` (history read, survives as static tab) and the two C78 rollback scripts; no helper in `runCivicElectionsv1.js` is called from another file; test `civicApprovalCeiling.test.js:672` calls it directly (B3 block moves). Open plan refs to the file: dials plan `:169`/`:206`, holiday plan `:155` — retired with it.

**Proposed cut for review.** (a) `updateCivicApprovalRatings.js` seating block: `if (seating && /^POP-/.test(incumbentPop) && /^POP-/.test(campaign.pop) && !bondExists_(...))` → `createBond_(ctx, campaign.pop, incumbentPop, BOND_TYPES.TENSION, 'demotion', 'civic', <incumbent ledger hood>, 'demotion C<n> <officeId>: <challenger> took the seat from <holder>')`; `departure.grudgeBond` = bond id or null. (b) Remove `Phase5-Elections` at `godWorldEngine2.js:594` and `:2272`; leave `runCivicElectionsv1.js` in place with a retired header (no caller) or delete — reviewer's call on which leaves less trap. (c) Tests: B3 cases rewritten on the real `updateCivicApprovalRatings_` path. (d) Bench: one seat set to approval 20 on SANDBOX 1004 (non-canon, resync wipes), one fire, expect one TENSION bond + `CIVIC_DEMOTION` hook + 0 new Engine_Errors.

**Built 2026-10-04 (engine-sheet).** The hook sits in `runCivicElectionsv1.js` after the winner is decided and before the result is pushed: a contested race (`!seat.isVacant && challenger`) between two `POP-` ids creates `createBond_(ctx, winnerPop, loserPop, BOND_TYPES.TENSION, 'election', 'civic', loserHood, notes)` — the loser's hood from the ledger row (`ledgerHoodOf_` for an incumbent, who is CIV and never in the candidate pool; `challenger.neighborhood` otherwise; `Unknown` → blank), notes `election C<cycle> <officeId> (<district>): <winner> beat <loser>, <marginType>`. `bondExists_` runs its linear scan here (Phase5-LoadBonds precedes Elections; the key set is built later at Phase5-Bonds), so a pair already bonded gets nothing. An open seat, an unopposed incumbent, or a holder with no PopId makes no bond — logged, never guessed. The result entry carries `grudgeBond` (bond id or null) for the civic desk. Proven in `scripts/civicApprovalCeiling.test.js` §B3 on the real election function with the real bond engine (B3.1–B3.9; B3.1–B3.2 fail on the pre-cut file). Bench (one contested election) waits on the new script project.

When an election seats a challenger over a tracked incumbent, or an incumbent holds against a tracked challenger, create one `TENSION` bond between the two (`createBond_`, origin `election`, domain `civic`, hood = the seat's district or the loser's hood, notes naming the race and Cycle) if none exists. The existing ladder does the rest — it hardens to `rivalry` or settles to `professional` by what happens next. No other seed in this cut; sports rivalries already form on their own.

### B.4 Proof

- Bench (SANDBOX, post-C110 data so judicial/debt lines exist): one fire — `S.folkMemory` built in < 2 s over ≤ 20k rows; a `hoodcharged>=N` row drawn only in hoods at or above N; `charged`/`defaulted`/`bereaved` rows drawn only by citizens carrying the stamp; hoods with no log rows draw no memory row and raise no error; one TENSION bond after a contested election; zero new Engine_Errors; the fire's run time within the engine.279 range.
- Live acceptance after deploy: by C114 at least one memory-conditioned line in a citizen's LifeHistory and one in a street pool; the civic desk can follow an election grudge in Citizen_Bonds.

### B.5 Weakest assumptions, attacked

1. *The log read at `:296` is the whole tab.* **Resolved 2026-10-04:** `getDataRange().getValues()` at `:307` — whole tab, in memory; B.1 is one more branch in that loop.
2. *Tag names.* `Death`, `Hospitalized`, `Critical` measured on the log; closures are `[RoutineRetrenched]` in the column; charges come from `Judicial_Ledger`, not a tag at all.
3. *Thin today.* With 3 serious transgressions in 12 Cycles the hood fields barely fire before C110's systems warm up. That is correct behaviour (SIM_DOCTRINE §15 — a bar the input never crosses is inert only if the input can never cross it; here it crosses from next week), not a reason to lower bars.

### B.6 Sim calls for the builder

None required to build B.1 and B.3. **One for B.2's text:** the ~24 memory rows are canon texture — say whether you want to read them before they reach the live ledger, or trust the bench and the ruling.
