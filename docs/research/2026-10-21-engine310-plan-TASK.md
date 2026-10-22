# TASK — codex: engine.310 plan review (event draw counts the city's staged events, whole words for the rest)

Read-only: code + docs + `output/` files; no cron, model, Sheet, bench, clasp, commit or push. Write to `docs/for-claude-review/2026-10-21-codex-engine310-plan.md`, one SHIP / FIX per plan step and per hunt with file:line evidence, under ~25 lines. Report in one line when done.

**Ruling (builder, 2026-10-21):** asked what should count toward event draw, the builder picked option 2: "Every event the city stages counts once, plus whole-word matches for everything else." The rejected option 1 was whole words only.

## Today (code)

`phase08-v3-chicago/v3NeighborhoodWriter.js:368-400` sets one city base:
- world events: +1 for domain culture/community/holiday/festival, +1 for a text substring hit (festival/concert/art/celebration/parade/market) via `eventText` (:353-361);
- story seeds: +1 for a substring hit (community/culture/festival/art) on `s.seed||s.text`;
- story hooks: the same terms on `h.hook||h.text`.

Per hood, :514 computes `max(0, round(base × profile.eventMod × hMod.eventMod))`, then the pulse fold (:529) and the chaos fold (:541). EA makes no rng draws; the `variance()` draws (:470, :490-509) are independent of EA. The writer runs at `Phase10-NeighborhoodMap` (`godWorldEngine2.js:824` / `:2532`), after `Phase7-CityEvents` (:737 / :2452) and `Phase7-StorySeeds` (:753 / :2467).

## Evidence

- **104 city-event names** (the `name:` literals in `phase04-events/buildCityEvents.js`): 27 count today. Five of those count only through the `art` substring: Uptown Summer Block Party, Uptown New Year's Eve Party, Lake Merritt Sweetheart Stroll, Jack London Pre-Game Block Party, Downtown Championship Watch Party. The other 77 never count (Garden Market, Concert Series, Lantern Parade, Gallery Opening, Jazz Fest…), because the seed terms leave out market/concert/parade.
- **How city events reach EA:** only as seeds — `applyStorySeeds.js:1415-1419`, capped at 6, with `seedType: 'city-event'` (seed object :407-413); that line is the sole producer. They are never pushed to `S.worldEvents`; its producers are `generateCrisisSpikes.js:398`, `worldEventsEngine.js:350`, `generateCrisisBuckets.js:171/497` and `applyBusinessDynamics.js:682`.
- **Producer string survey** (string literals in non-test files, phases 03–07):
  - `art` false catches: party (23), start/starting/started (30+), participated, article, partner, department, apartment, BART, MacArthur, heart, sweetheart, smart, Carter, Arturo, Martinez;
  - `art` real words: art/arts, artist (9), artistic (8), artists (7), artwork (1);
  - `market`: marketing (2); `community`: communitylife (4);
  - 22 of the 1046 rows in `output/citizen-names.tsv` contain `art`.
- **C113 pair-3 tap contributors** (`output/engine-sheet/2026-10-21-e306-eadiag-{A2t,B2t}-c113.json`, Contrib column):
  - A: 6 hits — 2 `community` seeds, plus 4 via `art` (Paulson and Kelley Block Party seeds, the famous seed "Arturo Ramos", a hook on Arturo);
  - B: 4 hits — 2 `community` seeds, the Dillon Block Party seed, a hook on "Denise Carter".
- **B2 Riley_Digest col Q (CityEvents)** = Jack London Neighborhood Stabilization Panel, Jack London Cozy Nights Film Series, The Dillon Family Block Party (`2026-10-21-e306-step0-B2-c113.json`). A2's col Q was not saved, so **B2 is the fixture leg**.

## Plan

1. **One file, `v3NeighborhoodWriter.js`.** Lift the base into a top-level pure `eventAttractBase_(S)`, following the `pulseFoldDelta_` pattern at :278. It returns `{base, hits:{city, evDomain, evText, seed, hook}}`, and the call replaces :368-400 (`eventText` moves with it — its only caller is :373).
   - `city` = the count of non-empty `S.cityEvents` entries, read directly: no 6-cap, and no dependency on Phase7-StorySeeds succeeding.
   - The seed loop skips `seedType === 'city-event'`, so nothing counts twice.
   - Whole words: one helper tests `\b(?:terms)s?\b` on lowercased text, used in all three loops. The term lists and the domain test stay unchanged.
     - Admitted: art, arts, market(s), festival(s), concert(s), parade(s), celebration(s), culture(s), community.
     - Dropped: every false catch above, plus artist / artistic / artwork. That follows the literal ruling ("whole words"); if you think they should count, flag it — that would be a sim call for the builder.
     - `\b` is ASCII-only, so accented letters act as word boundaries; accepted.
2. **Effect on the numbers.** The base can rise or fall from one Cycle to the next. On B2 C113 it goes from 4 to **5**: 3 staged events + 2 `community` seeds; the Carter hook drops, and Dillon now counts as a staged event.
   - Engine consumers of EA are relative: `applyMigrationDrift.js:407,445-446` (HI/LO against the median) and `neighborhoodTrajectoryEngine.js:179-180` (±20% of the mean). `applyBusinessDynamics.js:499` reads the chaos fold, not EA.
   - Absolute readers only display the number: `buildNeighborhoodCards.js:552`, `buildWorldSummary.js:375`, `buildCivicVoicePackets.js:380`, `dashboard/server.js:992`.
   - A base change scales every hood by the same factor before the folds. Relative readers then move only through rounding and through the folds' weight: the folds are absolute, so a bigger base shrinks their relative pull.
3. **Fixtures, with no new engine or test file:** the evidence script `output/engine-sheet/2026-10-21-e310-fixtures.js` loads the writer through `new Function` (the pattern in `scripts/pulseFoldNormalize.test.js:10-11`). It checks:
   - (a) all 104 names as `S.cityEvents` entries → each counted once;
   - (b) the 10 tapped contributor lines, old vs new, with the expected result per line;
   - (c) the false words above → 0, and the admitted forms → hit;
   - (d) the B2 fixture S → base 5;
   - (e) a city-event seed plus the same name in `S.cityEvents` → counted once.
4. **Bench** on SANDBOX 1004, in the `2026-10-21-e306-pair3.sh` shape, with FILES = `v3NeighborhoodWriter.js` only, starting from the B start (baseline + the 103 rows via intake apply):
   - **Leg B3** = stage 18 + the fix (the PROD-candidate sha). It passes when:
     - readers and spots deep-equal B2 except Neighborhood_Map EventAttractiveness;
     - the fire record is clean (verdict / ok / state / persistErrors 0 / newEE / carryForward / post);
     - each hood's EA = `max(0, round(5 × mod))`, then + pulseDelta (round2, max 0), then + chaosEA (round2, max 0), using the B2t tap's `mod` / `pulseDelta` / `chaosEA`, with residual 0.
   - **Leg B3t** = B3 + the eatap patch rebased onto the fix, with a `city` contributor kind added, so the contributor list is engine-produced: base 5 = city 3 + seed 2 + hook 0 + ev 0. EA_Diag is pre-created before the fire (the pair-3 run-1 lesson).
   - Afterwards the bench code is restored to the stage-18 manifest.
5. **Gates.** A codex diff gate on the commit, then PROD **after the C113 read (Sun 2026-10-25)**. The first live fire of stages 13–18 stays one read, and this change lands on the fire after it. The stage-18 live-watch EA rule runs before this change lands, so it is unaffected.

## Hunts

- **H1** Can `S.cityEvents` be stale at Phase 10 — carried over from the last Cycle when Phase7-CityEvents throws, or set by the fallback at `buildCityEvents.js:560`?
- **H2** Does any other path put staged events into world events, seeds or hooks under another type (a double count)?
- **H3** The word contract: is anything real lost, or anything false still caught? Check the producers, not only the survey.
- **H4** The relative-consumer claim: is there an engine consumer that reads the EA *level* that I missed?
- **H5** Is "readers deep-equal except EA" earned — does anything later in the same Cycle read the saved EA?
- **H6** Do the B start and the expected-base derivation (B2 col Q + the tapped contributor list; whole-word hits are a subset of substring hits) hold?

Done = the md exists.

## Codex plan review — folded (`docs/research/2026-10-21-codex-engine310-plan.md`, gate FIX on steps 1 / 3 / 4)

- **Step 1 / H1 — defined, no change to the producer.** `buildCityEvents.js:630-633` publishes the names before the ripple loop (:655-675). If a ripple throws, the names stay in `S.cityEvents` and the phase is recorded as failed. They count: the selection finished, and every other reader already treats that list as the Cycle's staged events (Riley_Digest col Q `godWorldEngine2.js:2008`, `cityEveningSystems.js:161,216,347`, `buildMediaPacket.js:310`, the seed path `applyStorySeeds.js:1415`). An atomic publish would drop events the other readers carry. The comment in `eventAttractBase_` says so.
- **Step 3 — fixtures as asked** (`output/engine-sheet/2026-10-21-e310-fixtures.js` → `.json`, PASS):
  - each of the 104 names alone → base 1; the old rule, cut by marker from `50d433b7`, counts 27;
  - the 10 tapped lines, old vs new, per line;
  - 27 false words → 0 in the story and event loops; admitted forms → 1;
  - empty entries skipped; a city-event seed alone → 0; a seed plus its name → 1;
  - B2 is labelled an analytical fixture (col Q + the tap's hits, by the subset argument): old 4 (matches the tap) → new 5.
- **Step 4 — acceptance widened.**
  - Compare B3t's `mod` / `pulseDelta` / `chaosEA` per hood with B2t's; don't assume them. The chaos-fold loader takes a prior-Cycle PropertiesService value before the ring (`loadPreviousEvening.js:159-174`).
  - Require B3's saved EA = B3t's saved EA per hood.
  - The tap is rebased onto `eventAttractBase_` (`hits.city` plus whole-word contributor records).
