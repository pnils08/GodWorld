---
title: Health Slice Freshness + S.demographicDrift Clobber Plan
created: 2026-09-09
updated: 2026-09-09
type: plan
tags: [media, health, pipeline, active]
sources:
  - docs/plans/2026-09-07-beat-slices-from-sheets-plan.md (pipeline.68, parent)
  - docs/plans/2026-08-29-city-health-system.md (engine.133)
  - output/agent_engine-wiring_2026-09-09T06-28-17.md (wiring card, 133/133 coverage)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[2026-09-07-beat-slices-from-sheets-plan]] — pipeline.68, the beat-slice substrate this extends"
  - "[[SCHEMA]] — doc conventions"
---

# Health Slice Freshness + S.demographicDrift Clobber Plan

**Goal:** Dr. Lila Mezran's Monday health seat writes from live, current-cycle material — or drops loudly — instead of re-filing a cached slice padded with fossil queue rows; and the engine's `S.demographicDrift` field stops changing type mid-cycle.

**Architecture:** Three scripts-side fixes (SHIPPED, kimi lane): a stale-cycle guard in the fanout beat-slice path, a live-row filter on `Health_Cause_Queue`, and world-summary health material folded into the beat slice. One engine-side one-liner (LANDED at HEAD `e0f69e0d`, builder-direct, bench pending): `deriveDemographicDrift_` no longer overwrites `S.demographicDrift` (object) with a string label. Plus rulings requested on the retired cause-intake loop.

**Terminal:** kimi (builder-direct 2026-09-09 — engine gate waived for Task 4). Bench insertion + live fire: engine-sheet's next window.

**Wiring card (engine change):** `output/agent_engine-wiring_2026-09-09T06-28-17.md` — target `deriveDemographicDrift_`, map 2026-09-08, 133/133 engine phase files opened. Key card findings: the collision at `deriveDemographicDrift.js:325` vs `applyDemographicDrift.js:398`; `S.demographicDriftSummary` is an orphan write (zero readers); `S.demographicDriftFactors` has one reader (`updateNeighborhoodDemographics.js:76`) with a known Phase-3-reads-Phase-8 order gap already recorded in `2026-08-29-city-health-system.md:124`.

**Pointers:**
- Parent: [[2026-09-07-beat-slices-from-sheets-plan]] (pipeline.68 Task 4 built the health slice)
- Investigation basis: three-sweep codebase map 2026-09-09 (engine health loop, media health pipeline, docs/schema layer) — session findings summarized below
- Related: [[2026-08-29-city-health-system]] (engine.132/133, LIVE @7), `docs/SPREADSHEET.md` Health_Cause_Intake row

**Acceptance criteria:**
1. A Monday fanout built at an unchanged engine cycle drops the `lila-mezran` seat with a `SEAT DROPPED … stale slice` log line instead of re-filing the previous Monday's story. (Mechanism shipped; first live proof is the next Monday fanout at an unchanged cycle.)
2. `output/cron-compare/health_slice_c{N}.json` contains zero `Health_Cause_Queue` rows with `StatusStartCycle <= 0` or `Processed` set. (Proven on the C106 rebuild: the three fossil rows — Marcus Osei, Elliott Crane, Ariana Lee — no longer appear.)
3. A flat-numbers cycle's slice still names residents, sourced to `output/world_summary_c{N}.md`. (Proven on the C106 rebuild: Elle Lilo + Toby Lamont from Who Lived It, plus the Laurel HEALTH cluster and city line.)
4. (Engine, post-land) Phase-9 compressed digest reports real `migration`/`economy` values and `saveV3NeighborhoodMap_` emits non-'Stable' demographic labels when drift is non-zero — verifiable on the next sandbox bench cycle after the one-liner lands.

---

## What shipped (kimi, 2026-09-09)

### Task 1: Stale-cycle anti-recycle guard — DONE

- `scripts/newsroom-fanout.js` — new exported `staleBeatRef(assignment, takenRefs)`; the BEAT_BUILDERS enrichment loop drops a beat seat loudly when its slice `story.ref` already appears in a prior same-cycle fanout, and adds fresh beat refs to `takenRefs` going forward. Beat refs bypass `laneSeeds` dedup by design, which is why the recycle was invisible.
- Test: `scripts/newsroom-fanout-beat-stale.test.js` (new, 7 assertions, PASS).
- Safety note: the fanout file is built once per day (angle wake only when missing; report/write stages load it), so a same-day stage re-run cannot trip the guard — only a prior day's same-cycle filing can.

### Task 2: Health_Cause_Queue fossil filter — DONE

- `scripts/buildHealthSlice.js` — queue rows now filtered: skipped when `Processed` is set or `StatusStartCycle <= 0`. The three fossil rows (exported once by the retired intake with a stub ctx at cycle 0) no longer ride every story. Slice version bumped `HEALTH-SLICE-1` → `HEALTH-SLICE-2` so the version cache invalidates.
- Tests: `scripts/beatSlices.test.js` — fixture gained a fossil row and a processed row; assertions prove both are excluded and the live row still names.

### Task 3: World-summary health material into the beat slice — DONE

- `scripts/buildHealthSlice.js` — reuses the exported `loadHealthEntries(cycle, root, profiles)` from `scripts/buildCivicDomainSlice.js` (the civic-domain fallback's parser): Who Lived It `### Health`/`### Recovering` residents, chaos-table hospitalizations, hood HEALTH clusters, and the city illness/hospital line now join the slice as facts (and named residents as people, deduped by POPID against the hospital/queue records).
- Live C106 rebuild (`output/cron-compare/health_slice_c106.json`, `output/slices/c106/lila-mezran.md`): 4 named residents (2 hospital with engine-written causes, 2 from Who Lived It), 7 facts incl. city line + Laurel cluster — vs the previous "3 hospital rows + 3 eternal fossils".
- Tests: `scripts/beatSlices.test.js` — world-summary fixture resident asserted in people + facts with `world_summary_c103.md` provenance.

### Validation (all local, no network)

- `node scripts/newsroom-fanout-beat-stale.test.js` PASS
- `node scripts/beatSlices.test.js` PASS
- Neighboring suites PASS: `newsroomWakePackages`, `cronDeskFanoutHandoff`, `cronDeskFilings`, `buildCivicDomainSlice`, `newsroom-fanout-stink`, `cron-desk-writer`
- `node --check` clean on both modified scripts

## Engine change (landed at HEAD, bench pending)

### Task 4: Stop the S.demographicDrift type clobber — DONE (code at HEAD `e0f69e0d`; bench pending)

Landed 2026-09-09 (kimi, builder-direct — engine gate waived by Mike this session). One line in `phase03-population/deriveDemographicDrift.js`:

```diff
-  S.demographicDrift = drift;
+  // S.demographicDrift stays Phase 3's object (applyDemographicDrift_ :398).
+  // Overwriting it here silently zeroed Phase 9/10 readers; the label travels
+  // via demographicDriftSummary.primary and, explicitly, demographicDriftLabel.
+  S.demographicDriftLabel = drift;
```

Plus the header contract line (`:381` — "demographicDrift: string" → "demographicDriftLabel: string").

**Why safe:** no live reader consumes the string label (verified by full `*.js` reader census + the wiring card). The label already travels via `S.demographicDriftSummary.primary`. Phase 3 recreates the object every cycle, so no reader edits are needed.

**Live damage it heals (both silently wrong every cycle today):**
- `phase09-digest/applyCompressionDigestSummary.js:155-157` (Phase 9, godWorldEngine2.js:534) reads `.migration`/`.economy` off the post-clobber string → digest always reports migration 0, economy 'stable'.
- `phase08-v3-chicago/v3NeighborhoodWriter.js:249-256` (`saveV3NeighborhoodMap_`, Phase 10, godWorldEngine2.js:553) expects number-or-object, gets a string → `driftNum = 0` → every hood's demographic label is always 'Stable'.

**Bench:** NOT clasp-pushed at land time — bench SANDBOX 0908 was mid dials-acceptance (2/12) and a push would contaminate that run. Insert into the next bench window per `docs/reference/DEPLOY.md` §Groundhog before any live fire. Acceptance for the bench pass: Phase-9 digest reports real migration/economy, `saveV3NeighborhoodMap_` emits non-'Stable' labels when drift is non-zero, and the illness/talk-back suites stay green.

## Rulings (builder-direct 2026-09-09)

1. **Retire the cause-intake loop — DONE.** Builder ruled retire 2026-09-09. `phase11-media-intake/healthCauseIntake.js` deleted whole (repo precedent: dead file, no live caller; engine has written `Hospital_Ledger.Cause` at admission since engine.102 W4). `Health_Cause_Intake` tab row in `docs/SPREADSHEET.md` closed no-create; allowlist entry removed from `scripts/tabReferenceIntegrity.test.js`; stub maps + SIMULATION_LEDGER_COL_MAP regenerated. Comments citing the file updated in `generationalEventsEngine.js` and `godWorldEngine2.js`.
2. **`Health_Cause_Queue` in the beat tabs.** With the fossil filter live, the queue contributes only genuinely-pending rows — but nothing live exports to it. Either keep it dumped (harmless, usually empty) or drop it from `SEAT.tabs` in `buildHealthSlice.js` and from `dumpBeatTabs.js`. Recommendation: keep for one cycle to confirm it stays empty, then drop.
3. **Hospital capacity constant mismatch.** Talk-back binds at `hospitalBaseCapacity` = 100 (World_Config); census load% divides by hardcoded `HOSPITAL_CAPACITY = 40` ("placeholder", `phase10-persistence/buildCyclePacket.js:810`). One of these is wrong for the ~900-citizen ledger; the 8%-load line the health beat now quotes inherits the mismatch.
4. **Stale twin city number.** `S.worldPopulation.illnessRate` (pre-attractor) is published by `buildCyclePacket.js:184` and `utilities/cycleModes.js:328`; the fresh value is `S.demographicDrift.illnessRate`. New consumers keep picking the wrong twin — consider renaming the stale one or publishing only the fresh one.
5. **Orphan write.** `S.demographicDriftSummary` has zero readers (wiring card). Keep as documentation-by-structure or delete; either way, note it.

## Operational follow-ups (no code)

- **Fire C107.** Everything downstream (dump, slice, deltas) is gated on an engine cycle. The second `dumpBeatTabs.js` run populates `output/beats/prev/`, bringing the "(+N vs C105)" delta lines alive (mechanism already shipped with pipeline.68 Task 1).

## Investigation findings not actioned (recorded, no gap log exists for these)

- Status vocabulary lives in ≥4 places: `HOSPITAL_OPEN_STATES` (buildCyclePacket.js:812), `HEALTH_STATES_102` (:931), the `HEALTH_STATES` regex (lib/wakePerception.js:529), the cascadeAudit regex (scripts/cascadeAudit.js:267), plus case normalization in healthCauseIntake.js:43-48. A new health state means four edits.
- Duplicated illness push logic: legacy block in `updateWorldPopulation_` (godWorldEngine2.js:892-934) now feeds only the mortality coupling; the same pushes live in `applyDemographicDrift_`.
- engine.182 (burnout→health multiplier) is cut locally but unbenched (ROLLOUT_PLAN.md:111).
- Doc drift fixed this session (kimi): `docs/index.md` beat-slices wikilink (missing `-plan` suffix), `docs/SIMULATION_LEDGER.md` 52-vs-55-column self-contradiction, `docs/SPREADSHEET.md` Health_Cause_Intake row annotated with the dead-caller finding.

## Changelog

- 2026-09-09 (kimi) — Tasks 1–3 shipped with tests (newsroom-fanout.js staleBeatRef guard; buildHealthSlice.js queue filter + HEALTH-SLICE-2 + world-summary material); C106 slice rebuilt live (4 named, 7 facts, fossils gone). Task 4 proposed with wiring card `output/agent_engine-wiring_2026-09-09T06-28-17.md`. Saved to for-claude-review for engine-sheet ruling + landing.
- 2026-09-09 (kimi) — Builder-direct: engine gate waived ("fuck claude, you dont need them"). Task 4 landed at HEAD as `e0f69e0d` (one line + header contract; VM smoke + 4 drift-reader suites green). NOT clasp-pushed — bench mid dials-acceptance (2/12); insert next bench window. Plan moved out of for-claude-review to `docs/plans/` and registered in `docs/index.md`; rulings 1–5 below now route to the builder directly, not a Claude seat.
- 2026-09-09 (kimi) — Ruling 1 executed (builder: "retire the dead health cause intake and tab"): `healthCauseIntake.js` deleted whole, `Health_Cause_Intake` closed no-create in SPREADSHEET.md, allowlist entry removed, `stubEngine.js` + `mapSimulationLedgerCols.js` regenerated (183 files / 1356 functions), tabReferenceIntegrity PASS (262 refs / 82 files). Rulings 2–5 put to the builder with context this session.
