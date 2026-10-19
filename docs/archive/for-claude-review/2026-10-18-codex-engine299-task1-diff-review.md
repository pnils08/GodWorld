---
title: Codex review — engine.299 Task 1, 6db7b48f
created: 2026-10-18
updated: 2026-10-18
type: reference
tags: [engine, citizens, research]
sources:
  - commit 6db7b48f46f29d178a39bce3ea50c909e8cb4bba
  - docs/for-claude-review/2026-10-18-engine299-task1-diff-review-TASK.md
pointers:
  - "[[plans/2026-10-18-event-engines-move-dials]]"
---

# Verdict: FIX; HOLD Task 1's bench/ship gate

The graded resolver works and preserves historical texture. Task 1 is incomplete: other writers still emit bare kinds, the changed writer assigns unsupported positive signs, and graded lines disappear from the newsroom street-source pool. Passing resolver tests cannot establish the new-line invariant.

Reviewed `git show 6db7b48f`; cited code and changed tests matched that commit in the working checkout (HEAD observed `d948c892`). Existing dirty/untracked work was left alone. Only this review is delivered; no commit, push, model, cron, bench, Sheet or canon run. Inbox registration is left to its receiving Claude seat per the inbox contract.

## Hunt 1 — SHIP: historical-map and graded-fold mechanics

- Applied the builder's correction: the 20 bare kinds remain `{}` intentionally. Do not remove or re-value them to satisfy the TASK/plan's superseded “no key maps to {}” wording.
- `utilities/citizenDialMap.js:303-327` accepts `<Kind>-<Dial>-<Up|Down>-<S|M|L>` and produces one signed dial, S/M/L = 1/2/4. `:330-367` strips the grade for kind lookup but resolves the original graded tag before the bare map. A local parent/current comparison confirmed all 20 bare kinds retain their effects; a probe confirmed a graded form for each resolves.
- The changed writer retains the grade in BOTH carriers: `phase05-citizens/generateCitizensEvents.js:3597-3624` puts it in the LifeHistory bracket and first log tag. Phase 9 parses that bracket (`utilities/compressLifeHistory.js:821-838`), then both watermark and legacy folds call the same resolver (`:1636`, `:1653`). This closes the cell-versus-log seam for this writer.
- Node consumers `lib/wakePerception.js:40`, `scripts/backdateCitizenDials.js:67`, and `scripts/seedTier1EssenceLive.js:67` use that resolver too. Direct-map consumers are narrower: `utilities/chaosCarsConfig.js:478-483` validates configured chaos tags, while `scripts/civicPetitions.js:119-133` classifies reflection Affect against a closed map. Neither reads these newly graded LifeHistory lines; no demonstrated regression there.
- This is SHIP for resolution/carriage only. The global prohibition on NEW bare lines fails Hunt 2.

## Hunt 2 — FIX: missing writers and false direction (high)

**Changed writer:** `phase05-citizens/generateCitizensEvents.js:1075-1089,1100-1113` falls back to a source-wide direction; most sources default up. That is explicitly forbidden by this hunt. No random sign draw was added, but deterministic default-up is still unsupported.

- Confirmed wrong sign: the negative city-sentiment pool (`:2033-2036`) includes “felt unsettled by a low hum of tension.” `primaryFromTags` falls through to Daily (`:1040`); `sentiment:negative` is absent from the fact map; `source:sentiment` selects composure up (`:1087`). Evaluating the actual helper in an isolated VM returned `Daily-Composure-Up-S`, `{composure:1}`.
- Confirmed unsupported direction: gridlock's “adjusted today's plans” (`:1593-1596`) becomes `PrevEvening-Outabout-Up-S`; ordinary `source:neighborhood` alone becomes `Neighborhood-Outabout-Up-S`. Both reproduced from the actual helper. A source name establishes neither a positive outcome nor a change in the citizen's activity.
- Smaller valid paths exist: trajectory-up/down tags map oppositely (`:1053`), and unresolvable entries skip before the row/log append (`:3586-3597`). Keep those paths; replace source defaults with supported entry facts or skip. Missing `nudgesForEvent_` currently fails open (`:1092`), so the writer guard is not independently fail-closed.

**Other named emitters were not changed:**

| Writer | New bare lines still possible; evidence |
|---|---|
| `phase04-events/generateGenericCitizenMicroEvent.js` | Background, Neighborhood, FirstFriday, CreationDay, Holiday, Sports, PrevEvening selected at `:489-499`, appended to the cell at `:502-505`; log still labels them Micro-Event at `:513`. |
| `phase05-citizens/runNeighborhoodEngine.js` | Neighborhood default at `:486`; calendar kinds at `:560-565`; cell/log append at `:571-584`. Pressure path does not eliminate the ordinary path. |
| `phase05-citizens/generateMediaModeEvents.js` | Personal pool at `:273-276`; ungraded `picked.primary` reaches the cell at `:428-433`. |
| `phase05-citizens/generateCivicModeEvents.js` | Civic and Personal pools, e.g. `:293-313`; ungraded primary reaches the cell at `:468-473`. |
| `phase04-events/generateGameModeMicroEvents.js` | Personal/Team (`:142-149`), Life (`:249`), Season (`:263-275`) still reach the ungraded append at `:520-525`. |
| `utilities/tier1EssenceEvents.js` | Daily/Background/Personal at `:46-48`, Lifestyle at `:141`, PrevEvening/FirstFriday at `:855-856`. This is authored backfill data, not an ordinary Cycle writer: its live executor can append the bare tags to LifeHistory_Archive (`scripts/seedTier1EssenceLive.js:127,169`). Do not retag existing history; gate any future append separately. |

`docs/engine/TAG_REGISTRY.md:49` openly defers other emitters to Tasks 3–4, while plan Task 1 and this TASK require every emitter. That is an unmet acceptance boundary, not a reason to claim Task 1 complete.

## Hunt 3 — FIX: street-source regression (high)

- **Confirmed active reader losing lines:** `scripts/newsroomSourcing.js:10-11,205-209,309` retains the full bracket tag and checks exact membership in STREET_TAGS. Newly graded Sports, PrevEvening, Lifestyle, Holiday, Neighborhood and Weather lines fail membership before text/entity matching. Citizens who previously qualified as firsthand street sources disappear from that pool. Normalize the kind at this classification boundary while retaining the original graded evidence.
- **Not a live regression:** `utilities/compressLifeHistory.js:960` also uses exact TAG_TRAIT_MAP lookup, so graded tags miss that legacy mapping, but the machinery is explicitly dead (`:20-22`) and has no active computeProfile call. Current TopTags/Dominant summaries retain full grades (`:1191-1211,1707-1713`), splitting counts by grade rather than dropping lines.
- `UNLIVED_BRANCH_TAGS` (`utilities/compressLifeHistory.js:1603,1659`) contains careershift/relocation/divorce/retirement/businessclose/displacementmove, not these renamed ambient kinds; no affected branch capture demonstrated.
- Safe readers: pulse normalizes via `baseTag_` (`utilities/neighborhoodPulseMap.js:96`); this writer also passes `lineKind` directly to pulse/dedupe (`generateCitizensEvents.js:3639,3644`). Contract-seed hints are substring regexes, not exact old-kind comparisons (`phase07-evening-media/buildContractSeeds.js:139-147,176`).
- World-summary milestone selection (`scripts/buildWorldSummary.js:295-305`) already excluded these composite ambient log rows. Ripple routing uses CauseType, not their LifeHistory bracket kinds (`utilities/rippleLedger.js:18`; `scripts/buildWorldSummary.js:1346`). Searches of desk packet builders, audits and scorecards found no additional confirmed active exact-kind loss. Do not generalize the baseTag helper change into a claim that every reader calls it.

## Hunt 4 — FIX: truth-doc omission; inherited write-path exception

- No new file, RNG draw or `Math.random()` call was added. Existing RNG uses ctx.rng or its seeded fallback and otherwise throws (`generateCitizensEvents.js:527-531`); the stale Math.random comment is not execution.
- TAG_REGISTRY and EVENT_SYSTEM_MAP §2 changed, but `docs/engine/ENGINE_STUB_MAP.md:1898-1903` omits new `S.engine299` state and `:3964-3975` omits the graded helpers. STUB_MAP was absent from the six-file commit; true it with the cut.
- Literal “ctx.writeIntents only” is not met on the existing execution path: `generateCitizensEvents.js:3680-3682` directly writes the log; `:2418` also directly writes household logs. These are inherited, not introduced by this diff, and `:3686` identifies the generator as a documented direct writer. Resolve that stated rule/exception rather than attributing a new persistence redesign to this patch.

## Hunt 5 — SHIP: no new owner-engine event in color

The diff changes tag resolution and emission guards, not pool prose or divorce/promotion/layoff/marriage/birth/death/hospital/move triggers. The added `family:divorced` mapping describes the existing logistics-call line (`generateCitizensEvents.js:2875-2876`), not a new divorce. Hunt 2's direction defect remains separate.

## Hunt 6 — FIX: acceptance coverage absent; full-suite result not green

- `node scripts/citizenDials.test.js`: **75 passed**. `node scripts/griefPeriod.test.js`: **38 passed**. All four changed JavaScript files passed `node --check`.
- Section X (`scripts/citizenDials.test.js:219-235`) tests the resolver's 54 dial/direction/band combinations; it does not exercise every writer or reject newly emitted bare kinds. An in-memory mutation adding `DIAL_MAP['SYNTHETIC-NONCANON-EMPTY'] = {}` before requiring the test still passed all 75 assertions. No fixture or source file was changed. Retained historical `{}` entries themselves must remain allowed under the builder's correction.
- The grief assertions explicitly accept BOTH bare and graded Personal (`scripts/griefPeriod.test.js:257,271`), so reverting that writer's new grade would not be caught there. Add behavioral writer assertions: historical bare kinds remain inert, new bare output is rejected/skipped, and negative facts cannot become Up.
- `GODWORLD_LEDGER_FAILS=0 npm test` ran all **289 files: 285 passed, 4 failed**, 157.27 seconds, offline default. Failures: `cron-civic-tick.test.js` (orBatch import probe: `spawnSync node EPERM`); `fireGuard.test.js` (phase-order subprocess yielded no slot count); `ingestEdition.test.js` (ingest-loop/rerun-message assertions); `rateEditionCoverage.test.js` (12 output assertions). The latter three also use subprocess probes (`:325`, `:94`, `:48`, respectively). These are not established regressions from this commit; this environment also returned EPERM for a separate Node-spawned git probe. Full log: `/tmp/engine299-review-tests.log`. No baseline comparison or unsandboxed rerun was performed.

## Hunt 7 — SHIP: bounded implementation scope

The two existing engine files gain a grade parser/formatter and an inline writer guard; the other changes are two tests and two reference docs. No replacement engine, ledger, scheduler, shared reader or new file was introduced. Source-default grading is an incorrect semantic shortcut (Hunt 2), not evidence of a system rebuild.

**Final gate:** FIX the fact-sign fallback, remaining new bare writers, street-source normalization, truth docs and writer-level tests before Task 1 SHIP. Bench/deploy/live persistence and population effects remain unverified. Preserve historical bare kinds unchanged.
