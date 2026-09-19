# Hood-canon repair — kimi review (requested by engine-sheet, 2026-09-19)

Read-only. No engine edits, no commits. Reviewing 289e897d, 536684df (engine.239), 2cd142a9 (engine.239b), a1f973a3 (engine.239c) against SIM_DOCTRINE §17.

## 0. The commits — read

- **289e897d (auditor v2.0.0)** — correct shape. Direction-vs-city-median + prior-snapshot streak is exactly how a hood should be judged: against the city's own centre, over its own history. `METRIC_WORSE` per-metric steps replace un-fireable absolutes. No issues.
- **engine.239** — the big one, and the right one. `hoodProfileFromCanon_` keys off EmployerCharacter **label** (17 rows, never hood name) × income vs city median × BoomIndex × employer depth, centered on the city mean — a hood reads as itself. Blank label throws (fail-loud, engine.148 P3). Life-line gates re-based to city-relative bars. The `crimeMod`/`sentimentMod` deletions are the important part: those were the real-Oakland ranking in a costume.
- **engine.239b** — cluster adoption via `Neighborhood_Map.Adjacent` is the canon-true fix for the ten untracked hoods: kinship from the sheet's own geography, deterministic tie-break, unplaced logged not silent. Good.
- **engine.239c** — child folds to parent via the existing `resolveHoodOrChild_` (no new helper, correct), and the phase-order swap gives first-tracked hoods a sentiment floor from persisted state instead of a literal. Both clean.

Nothing here to send back. §17's rule — "a hood-name-keyed numeric table on the cycle path is a canon violation, however its character strings read" — is the right test and these four commits pass it.

## 1. Does civic.38 or the civic packs assume the old hood numbers?

**No.** Verified by sweep of my live lane (`cron-civic-run.js`, `buildCivicDomainSlice.js`, `buildJaxSlice.js`, `cron-work-wake.js`, `beatSliceKit.js`, both registry JSONs): zero hood-name-keyed numeric tables, zero ranking literals. The only hood names present are district composition and initiative `AffectedNeighborhoods` in `civic-office-map.json` — sheet truth, not numbers. Every comparison my packs and plan make is one the repair already blesses:

- Seat packs read **beats deltas vs `prev/`** (self-relative) and citywide context lines.
- civic.38 petition safety gate: ViolentLevel **above the city median** — city-relative.
- civic.38 stage-3 clearance: metric moved the right way **from the vote-time baseline** — self-relative.
- civic.38 confrontation: "hood data moving the **wrong way** in a seat's district" — direction, same model as 289e897d.
- The ten cluster-adopted hoods change nothing for my packs — I read beats/Neighborhood_Demographics, not `S.neighborhoodDynamics`.

**Two compatibility notes the repair creates for me (mine to fix, not yours):**

1. **Child-area fold in the petition counter.** civic.38 Task 6 counts condition-matched households by hood from `Household_Ledger.Neighborhood`. If any ledger row carries a child-area name (Coliseum, Old Oakland, Brooklyn Basin, Telegraph corridor…), a district count keyed on parent names silently drops those households. The counter must fold through the same mapping — scripts-side that's `lib/canonNeighborhoods.js` + the live ChildAreas column (parent links live on the sheet, per canonNeighborhoodLoader.js:146; no repo file enumerates all 20 pairs, so the counter should read the sheet-sourced map, not a hard-coded copy).
2. **Stage-3 economic metric source.** My plan's draft language said "Neighborhood_Demographics income" — that tab carries counts (Unemployed/Sick/Students), not income. Economic stage-3 should read Neighborhood_Map `MedianIncome` + per-hood Unemployed. I'll correct the plan text.

## 2. Crime_Metrics re-seed (engine.241): flat median, or cause-implied?

**Cause-implied, and don't hand-compute it — grow it on the bench.** engine.212 already built the canon-true generator: every cause is signed against the city's own median (unemployment excess, youth share, econ-stress lag, hotspot spill, SAFETY events, sentiment gap), capped ±3/cycle, with the 0.04 pull to the city median. That model is the answer to "what should this hood's level be" — the seed should be the model's own equilibrium given live inputs, not a fresh constant.

Recommended shape:

1. On the sandbox bench (live-synced state), seed all 22 hoods flat at the city median, enforcement held at current levels, then run N quiet cycles and let the signed causes differentiate the hoods. Harvest the emergent levels as the re-seed. The engine.212 tests say this converges and holds a spread (~11 pts) off the hoods' own joblessness — so the re-seed is *measured from canon*, not authored.
2. Flat-then-grow, not flat-as-final: a flat live seed would erase differentiation the in-world causes already encode, and at ±3/cycle the texture takes ~10+ cycles to come back — 10 cycles of "all hoods identical" is its own canon break (§17: a hood's numbers are read from its own canon).
3. QolLevel needs the same treatment — its current seed is `50 × qualityOfLifeMod` where no entry sets the mod, so it's a constant 45 for everyone today. It is *already* flat fiction; the cause-grow fixes it too (QoL causes exist: unemployment ×0.6, youth >0.3, econ-stress, sentiment gap).
4. After the re-seed, `NEIGHBORHOOD_CRIME_PROFILES` has no live reader left on the cycle path (only the no-row fallback at updateCrimeMetrics.js:451-453). Retire it to the same place the writer's table went; a no-row hood should seed from the city median, full stop.

The one judgment call I'd flag for Mike: growing on the bench imports ~N cycles of synthetic quiet history into a canon number. The alternative — compute the equilibrium analytically from current causes — is identical math without the bench story. I prefer the bench because the groundhog loop already exists and the result is reproducible evidence, but either beats a hand-set table.

## 3. The seven remaining pins, ranked by blast radius

Ranking = what citizens live × what the newsroom reports × how often it fires.

1. **`economicRippleEngine.js:52` — FACTORY_CLOSURE → West Oakland only.** Highest. −20 for 12 cycles moves the hood's economy descriptor, citywide economicMood, derived employment rate, and births an 11-row Ripple_Ledger trail that feeds Story_Seed_Deck — and it's self-reinforcing: every closure lands in the same hood, which keeps that hood "needing" the bad-news pins. Key off: the closing business's actual hood — the v2.5 BUSINESS_CONTRACTION path already does exactly this (`S._bizLookup` → Business_Ledger neighborhood, `mapToCanonicalNeighborhood_`, L347-385). Bonus: trigger off career-engine `businessDeltas` instead of keyword-matching event text (the C108 misfire came from the keyword path).
2. **`mediaFeedbackEngine.js:66-69` — the 8-hood MEDIA_NEIGHBORHOODS list.** The only pin that *excludes*: Uptown, KONO, Chinatown, Piedmont Ave are structurally blind to all media-perception effects, every cycle. It mutates arc tension (real world state) and cityDynamics.sentiment continuously, and the Jack London +2/+0.25 sports pin fires every playoff cycle. Key off: all 22 canon hoods via `hoodsWithScene_` (already used at :306); sports spotlight follows `S.sportsZones`/`primarySportsZone_` — the pattern cityEvenings and economicRipple already use.
3. **`recordWorldEventsv3.js:93-107` — domain pools (SAFETY/HEALTH/INFRASTRUCTURE → West Oakland/Downtown/Fruitvale/Chinatown).** Every cycle as the fallback for events with no hood; writes WorldEvents_V3_Ledger col G, which updateTransitMetrics reads back for per-station ridership — a real number moved by a pin. Key off: drop the pools; the CoreSimRank fallback (:90) already exists, or weight by the domain's own live data (SAFETY → `S.crimeMetrics.hotspots`, which the engine computes and engine.235 will persist).
4. **`applyStorySeeds.js:1236-1252` — migration inflow → Fruitvale, outflow → West Oakland.** Rare (|drift|>30) but not texture: the seed's hood inflates that cluster's culturalActivity (up to +8%), communityEngagement (+4%), sentiment (+0.04) via `buildSeedSignals_`/`applySeedLocalBoost_`. Key off: `applyMigrationDrift.js` already computes per-hood deltas — name the hood with the largest actual delta.
5. **`buildCityEvents.js` — named CHAOS/LOW_SENTIMENT/ECON_BUST events (West Oakland/Fruitvale).** Conditional pools; ripple 0.02 → story seeds; +2 crowd per event hood. Key off: the triggering condition's own data — LOW_SENTIMENT → hoods below the sentiment median, ECON_BUST → `S.neighborhoodEconomies` 'struggling' descriptors, CHAOS → the actual chaos events' hoods.
6. **`cityEveningSystems.js` — econMood crowd pins + baseline/weather/chaos pins.** Boom/bust branches are rare, but the baseline and dispersal pins fire every cycle and steer where citizen micro-events cluster (generateCitizensEvents.js:1212). Real geography-of-daily-life drift, no dials. Key off: `S.neighborhoodEconomies` descriptors (computed same-cycle in Phase 6), `hoodsWithScene_` for weather, actual event hoods for chaos dispersal, `S.sportsZones` for the sports cluster.
7. **`buildNightLife.js:130-134` — BUDGET bars.** Bust-only, pure evening texture (crowd +1, packet prose). Lowest. Key off: 'struggling' descriptors + `hoodsWithScene_(ctx,'nightlife')`.

**Cross-cutting:** the replacement infrastructure already exists everywhere — `resolveHoodOrChild_`, `hoodsWithScene_`, `S.neighborhoodEconomies[].descriptor`, `S.sportsZones`, CoreSimRank, city-median helpers. Every fix is "read the live per-hood state the engine already computes," not new machinery. And per §17 the fix is mandatory regardless of ranking position: a hood-name-keyed list on the cycle path is a canon violation even when it's only texture.

**Interaction with civic.38 worth naming:** pins 1–3 distort exactly the data my seat packs and petition counter will read (economy descriptors, media effects, world-event hoods). FACTORY_CLOSURE pinned to West Oakland would hand the same district the same crisis forever; the media blind spots mean citizens in four hoods never feel coverage. Repairing 1–3 before the game loop goes live keeps the seats' board honest.

— kimi, 2026-09-19 (read-only review; no commits, no engine edits)
