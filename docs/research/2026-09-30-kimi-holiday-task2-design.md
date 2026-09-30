---
title: Adversarial review — engine.273 Task 2 design (sim holiday calendar)
created: 2026-09-30
updated: 2026-09-30
type: reference
tags: [research, engine, calendar, review]
sources:
  - docs/plans/2026-09-29-sim-holiday-calendar.md §Task 2 design (commits f67f6314, 8d92d085)
  - docs/research/2026-09-29-codex-holiday-calendar-inventory.md
  - phase02-world-state/getSimHoliday.js, phase01-config/advanceSimulationCalendar.js (verified 2026-09-30)
pointers:
  - "[[plans/2026-09-29-sim-holiday-calendar]] — owning plan, engine.273"
  - "[[research/2026-09-29-codex-holiday-calendar-inventory]] — Task 1 source map"
---

# Adversarial review — Task 2 design (kimi, 2026-09-30)

**Scope:** the Task 2 design section only, attacked at (a) wave-2 flag-gated vs
always-reachable classification, (b) the enumerable month-string rule, (c)
Creation Day dual-check readers, (d) First Friday cadence, (e) unruled sim
decisions. Every finding verified against the local tree 2026-09-30. Read-only;
no code touched.

**Verdict: do not build as written.** The table, the Creation Day one-form, and
the wave structure are sound, but the wave-2 classification — the design's core
proof mechanism — is inverted on every one of its five named examples, and the
First Friday "one source" claim misses a third copy that would leave desk
packets on the old cadence.

## (a) Flag-gated vs always-reachable — the classification is inverted

The design names five "always-reachable" sites (strings "in a pool or venue
list drawn regardless of flag") whose deletion it classes as **non-neutral**
(changing pool lengths and rng outcomes). **All five are flag-gated.** Each is
reachable only through a branch keyed on the dropped flag; after wave 1 stops
the source from emitting the flag, each is dead code and its deletion changes
no pool length and no rng outcome.

1. **CONTRADICTED** — `buildCityEvents.js:300-379`. MLK_DAY_EVENTS (:300),
   INDEPENDENCE_EVENTS (:375, "Jack London Fourth of July Fireworks" :376) and
   the sibling pools are drawn only by flag-gated `addEvents_` calls at
   :505-528 (`if (holiday === "MLKDay")`, `if (holiday === "Independence")`,
   …). Flag-gated; deletion neutral.
2. **CONTRADICTED** — `buildEveningMedia.js:124-131`. The Independence/MLKDay
   pools sit inside the `holidayMedia` map (:103-214), consulted only at :242
   (`if (holiday !== "none" && holidayMedia[holiday])`). Flag-gated.
3. **CONTRADICTED** — `storyHook.js:434-439`. The "Fourth of July" hook text
   (:439) sits inside `if (holiday === "Independence")` (:434). Flag-gated.
4. **CONTRADICTED** — `runCivicRoleEngine.js:219-220`. "July Fourth civic
   duties fulfilled." is `holidayCivicNotes['Independence']` (:219-223),
   consulted only at :372 (`holidayCivicNotes[holiday]`). Flag-gated.
5. **CONTRADICTED** — the "Fourth of July Tavern" at `buildNightLife.js:183`.
   Inside INDEPENDENCE_SPOTS (:180-184), concatenated only at :273-275 under
   `if (holiday === "Independence")`. Flag-gated.

Every other Fourth-of-July / dropped-holiday prose site I opened is also
flag-gated: `runRelationshipEngine.js:216-220`, `runHouseholdEngine.js:250-254`,
`runAsUniversePipeline.js:380-383`, `applyStorySeeds.js:642-647` (map lookup at
:740), `deriveDemographicDrift.js:140-143`, `textureTriggers.js:277-279`,
`worldEventsEngine.js:230-233`, `generateGenericCitizenMicroEvent.js` holiday
map (:215-240 area).

**Consequence:** as designed, the "non-neutral" commit has no verified member.
That is the safe direction of error (over-caution), but the proof story
("always-reachable deletions change pool lengths and so rng outcomes") is
false, and a sweep trusting it could mis-sort lines. The genuinely
always-reachable dropped-holiday content is **month-keyed**, not flag-keyed,
and the sweep as framed does not look for it:

6. **CONFIRMED MISS** — `runYouthEngine.js:63`: `ACADEMIC_CALENDAR[2]` emits
   `'black history month'` as a school-wide youth event every year, keyed on
   `S.simMonth` (the month index the design keeps). Black History Month is a
   dropped observance; this text fires regardless of the flag and feeds the
   youth ripple emitter (comment at :54-58). Neither the flag-keyed sweep nor
   the month-string grep catches it ("black history month" contains no bare
   month name). (Month-11 `'thanksgiving break'` :70 maps to a kept holiday —
   fine.)

## (b) The enumerable month-string rule

7. **CONTRADICTED (count)** — the design claims "43 hits in 22 files" for
   `grep -rnE "['\"\`][^'\"\`]*\b(January|…|December)\b" phase* utilities lib --include=*.js`
   minus tests and comments. Reproduced 2026-09-30: **47 hits in 22 files**
   (file count confirmed; hit count not). Excluding the five comment-line hits
   (`applyDemographicDrift.js:388`, `civicInitiativeEngine.js:35,1011`,
   `lib/editionParser.js:366,395`) yields 42. Neither 47 nor 42 is 43. The
   build notes must carry the actual enumerated list, not the count. Note 17 of
   the 47 are inside structures wave 1 deletes anyway (`getSimHoliday.js:298-309`
   `getMonthFromCycle_`, `advanceSimulationCalendar.js:195-196` monthNames,
   `buildCyclePacket.js:1142-1144` `getMonthName_Packet_`).
8. **CONFIRMED misclassification hole** — `textureTriggers.js:278`
   (`'March participants assembling'`): "March" is the verb (protest march),
   inside an `MLKDay`-gated branch (:277). The rule offers two dispositions
   (rewrite, or classify guard/parser); this is neither — it is a regex false
   positive whose correct fate is deletion with the dropped branch. Add
   "false positive" to the allowed classifications or this line gets mangled.
9. **CONFIRMED example omission** — `utilities/rosterLookup.js:116,164,187,221,242`:
   reporter style samples teaching month-dated openers ("'October 23rd.
   Morning. Coliseum visiting clubhouse.'"). In scope of the enumerable rule
   (utilities/), but absent from the design's six named examples — and they are
   the most *directive* month carriers outside the engine (they shape desk
   voice). They are not guards or parsers; the rule's escape hatch must not be
   applied to them.
10. **CONFIRMED rule/example inconsistency** — the design names election
    "November" at `runCivicElectionsv1.js:23,63` as a rewrite target, but both
    are comments (:23 header prose, :63 inline) and the rule excludes comments;
    the window itself is cycle-keyed (:62-64, `cycleOfYear >= 45 && <= 48`).
    Fix as comment hygiene or drop from the examples — as written the example
    violates the rule.
11. **CONFIRMED OK** — the engine.222 month-gate claim: `economicRippleEngine`
    and `mediaFeedbackEngine` emit zero English month strings (grep 0) — they
    stay timing curves, consistent with the design.

## (c) Creation Day dual checks

12. **CONTRADICTED (premise)** — the design, citing inventory handoff fact 3,
    says "many readers check both `S.holiday === 'CreationDay'` and
    `S.isCreationDay`" and builds a fold decision-procedure ("fold only
    duplicates … where they gate two different effects, both stay") on it.
    Census (both quote styles, phase*/utilities/lib): exactly **five** sites
    check both, and all five are OR-of-both guarding a single effect:
    `applySeasonWeights.js:333`, `calendarChaosWeights.js:122`,
    `calendarStorySeeds.js:112`, `storyHook.js:605`,
    `applyCityDynamics.js:399` (single-quoted; the double-quote-only census
    misses it). The design's named list is mostly wrong:
    `buildCityEvents.js:83,538`, `applyCycleWeight.js:358`,
    `applyStorySeeds.js:785`, `cityEveningSystems.js:199,263,346`, and the
    Phase-5 engines (`runNeighborhoodEngine.js:608`,
    `runRelationshipEngine.js:550` are output tags) check `isCreationDay`
    **only**. No site double-applies; the distinct-effects case the procedure
    braces for does not exist.
13. **CONFIRMED (the change itself is safe)** — today
    `S.isCreationDay = (cycleOfYear === 48)` (`advanceSimulationCalendar.js:164`)
    and position 48 emits `CreationDay` (`getSimHoliday.js:101`), so the two
    guards are co-extensive; `S.isCreationDay = (S.holiday === 'CreationDay')`
    preserves every reader while the table keeps 48. The fold paragraph is a
    phantom problem, but harmless.

## (d) First Friday cadence

14. **CONFIRMED MISS** — the design's "one source (`isFirstFridayCycle_`), no
    fallback list in the calendar writer" misses the **third copy**:
    `scripts/buildDeskPackets.js:533-538` re-derives First Friday from CYCLE
    with the old 12-position list (:536, comment "Same logic as
    advanceSimulationCalendar.js") and re-derives `isCreationDay` as
    `cycleOfYear === 48` (:538). After wave 1, desk base context would follow
    the OLD cadence while the engine follows the new — a live engine/newsroom
    contradiction on every divergent week (positions 1, 18, 22, 23, 26, 27,
    30, 31, 34, 36, 38, 40, 45, 46, 49, 50 differ). `buildWorldState.js:109`
    and `buildWorldSummary.js:190` read the engine-derived
    `nightlife.calendarContext.isFirstFriday` — those follow the engine and
    need nothing. Only buildDeskPackets re-derives. (Grep for the old position
    list finds exactly three copies: `getSimHoliday.js:209`,
    `advanceSimulationCalendar.js:156`, `buildDeskPackets.js:536`.)
15. **CONFIRMED arithmetic** — new cadence 2,6,…,50 = 13/year; zero overlap
    with keep-list positions {1,7,15,19,25,44,47,48,51,52} — "never shares a
    week with a kept holiday" holds. Bench math holds: C110 → position 6
    (FF under both cadences), C111 → 7 (`Valentine`, kept), C112 → 8
    (`PresidentsDay`, dropped, not FF). No reader found that assumes the old
    12-a-year cadence: `neighborhoodPulseMap.js:51`, `bylineEngine.js:140,632`,
    `ensureTransitMetrics.js:510-511` are tag/context-driven. Note position 1
    (New Year week) loses its First Friday under the new cadence — no
    FF∧NewYear coupling found in readers.
16. **CONFIRMED cadence authority** — "engine-sheet sets the cadence" was ruled
    2026-09-29 (§Builder calls — resolved). The every-4th-week-from-2 choice
    itself is within that grant.

## (e) Sim decisions the design makes without a builder ruling

17. **CONFIRMED — the month index stays.** Keeping the 12-slot `S.simMonth`/
    `S.month` as the rhythm key directly reverses research-build's Task-1
    mechanism guidance ("Rekey them to cycle-of-year or season ranges rather
    than deleting them"). The design states the departure openly ("Deliberate
    departure"), which is honest — but honesty is not a ruling. This is the
    largest unruled call in the design: the builder's direction was "seasons
    and cycles, not months," and under this design the sim still runs on a
    12-month skeleton with the English names hidden. Behavior-preserving, but
    it needs an explicit builder confirm, not just a stated departure.
18. **CONFIRMED — season markers and BackToSchool dropped by inference.**
    `SpringEquinox` (:37), `SummerSolstice` (:63), `FallEquinox` (:85),
    `BackToSchool` (:76) were never named in any builder ruling (not on the
    keep list, not in the named drops). Dropping them silences the storyHook
    seasonal hooks (:1273-1315) and the minor/'seasonal' weight branches. The
    design's basis is "not on the keep list" — a reasonable reading of the
    builder's keep-list framing, but an inference. Cheap to confirm with the
    faith list.
19. **CONTESTED — Hanukkah flag dropped while faith pends.** The citywide
    `Hanukkah` flag (position 50) is part of "the automatic real-world
    holy-day calendar" the builder explicitly reserved for decisions
    (2026-09-29). The design drops it in wave 1 while holding `HOLY_DAYS`
    (`ensureFaithLedger.js:304-380`) for the builder. The inventory's bin
    ("drop as automatic citywide calendar flag; see faith map") was adopted by
    research-build, so there is a ruling-chain basis — but it pre-empts the
    builder's reserved call for this one entry. Recommend holding position 50
    with the faith list or getting one-word confirmation.
20. **CONFIRMED consequence gap — the `cultural` tier goes extinct, unstated.**
    No kept holiday carries priority `cultural`; world-born slots take
    `oakland`. ~15 reader branches in 14 files key on
    `holidayPriority === "cultural"` (`advanceSimulationCalendar.js:294`,
    `godWorldEngine2.js:1054`, `applyWeatherModel.js:876`,
    `applySeasonWeights.js:116`, `applyCityDynamics.js:360`,
    `calendarChaosWeights.js:136`, `generateGenericCitizenMicroEvent.js:478`,
    `runAsUniversePipeline.js:514`, `runEducationEngine.js:407`,
    `generateCitizensEvents.js:2204`, `applyNamedCitizenSpotlight.js:316`,
    `runNeighborhoodEngine.js:496`, `runRelationshipEngine.js:410`,
    `runHouseholdEngine.js:536`, `runCivicRoleEngine.js:330`; plus
    `filterNoiseEvents.js:130-135` includes `cultural` in the
    holiday-neighborhood keep). All go permanently quiet. "Consequences,
    stated" does not name the tier extinction.
21. **CONFIRMED mechanism misstated — filterNoiseEvents.** The design claims
    "an opening-week game passes the filter by the normal rules — no feed
    route needed." Contradicted: `isCalendarProtected` keeps sports events
    only when `sportsSeason ∈ {championship, playoffs, post-season}`
    (`filterNoiseEvents.js:119-124`); opening week is spring-training /
    early-season (`SPORTS_PHASE_DEPTH_`, `applySportsSeason.js:378-388`), so
    with the `holiday === "OpeningDay"` keep (:126) dead, an opening-week
    sports event loses calendar protection and counts toward domain caps
    again. The conclusion (no feed route) may still stand — but as a stated
    consequence (opening-week sports events become compressible), not as
    "passes by the normal rules."
22. **CONFIRMED enumeration gap — applyCycleRecovery.** The design's only
    sentence on this file covers `bigCelebrations` (:70 — verified
    `['oaklandpride','artsoulfestival','newyearseve','independence']`, keeps
    `newyearseve` only). It omits the same file's `culturalFestivals` list
    (:82 — `['lunarnewyear','cincodemayo','diademuertos','juneteenth']`, all
    four dropped, whole branch dead), the `stpatricksday || halloween` line
    (:88 — prune the dropped half), and the `openingday` threshold branch
    (:131 area). The file's line ranges are in the checklist via Task 1
    outcome, so the sweep would likely catch them — the design prose is wrong
    by omission.

## Verified accurate (held up under attack)

- Table arithmetic: 34 flagged positions today (`getSimHoliday.js:21-109`),
  10 kept, 24 weeks lose a flag; all 10 kept rows' priority/neighborhood match
  the current metadata map exactly (:138-181). `priority: 'oakland'` today
  holds exactly the five dropped names (:162-166); Creation Day metadata is
  major/Oakland/godworld (:149).
- Dead helpers: `isCreationDay_` :224, `getCreationDayAnniversary_` :242,
  `getMonthFromCycle_` :297, `getSimMonthFromCycle_` :324,
  `getHolidayPriority_` :351 — zero callers (grep over phase*/utilities/lib/
  scripts/dashboard, definitions only).
- `isFirstFridayCycle_` has exactly one engine caller
  (`advanceSimulationCalendar.js:152-153`) plus the writer's own fallback
  (:156).
- `S.monthName` is written (`advanceSimulationCalendar.js:212`) and read by
  nothing in phase*/utilities/lib/scripts/dashboard.
- Orphan aliases `LunarNewYear` / `BlackFriday` / `ValentinesDay` /
  `WinterSolstice` are never emitted by the source — deletion of their
  branches is neutral.
- `filterNoiseEvents.js` First Friday (:102-111), Creation Day (:114-117),
  OpeningDay (:126) and priority/neighborhood (:130-135) keeps as described.
- Reach counts: `'Holiday'` literal = 42 single-quoted + 48 double-quoted hits
  (90 combined) vs claimed "91 hits in 63 files" — approximately holds,
  method-dependent; `OpeningDay` = 44 js files vs claimed 45 — same.
- Absolute-cycle formula `((c − 1) % 52) + 1`
  (`advanceSimulationCalendar.js:55`): C79 → 27, C110 → 6 ✓.
- Sports boundary is feed-only (`applySportsSeason.js:97` writes
  `S.sportsSeasonByTeam`; phase table :378-388).

## Recommended amendments before build

1. Rewrite the wave-2 classification: the default is flag-gated (neutral);
   always-reachable is the exception and must be proven per line. Drop the
   five wrong examples; add `runYouthEngine.js:63` as the one confirmed
   always-reachable dropped-observance string (month-keyed).
2. Add `buildDeskPackets.js:533-538` to wave 1 (or route it to read the
   sheet/engine state) — the third First Friday copy.
3. Fix the month-rule count from the reproduced list (47 raw / 22 files),
   add a "false positive" classification, and either include
   `runCivicElectionsv1.js:23,63` as comment hygiene or drop it.
4. Correct the Creation Day paragraph: five OR-form sites, no duplicate
   effects exist; the one-form change is behavior-preserving, full stop.
5. Take to the builder with the faith list: the month-index departure (17),
   season markers + BackToSchool (18), Hanukkah position 50 (19). State the
   `cultural`-tier extinction (20) and the opening-week filter consequence
   (21) in "Consequences, stated."
