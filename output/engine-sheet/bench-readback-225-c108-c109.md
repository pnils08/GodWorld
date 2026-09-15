# Bench readback — engine.225 hood-economy consumers relative to the hood median (engine-sheet S462, 2026-09-15) — PRE-DECLARED before any fire

Bench: SANDBOX 0908 `1FFpUs98…`, web app **@39** = repo `a2f3661f` (PROD @90 `706b36da` + engine.225; no diag overlay). Typed resync from live C107 this session (82 tabs, read-back OK); pre-fire typed read `bench-225-prefire.json` (cycleCount 107, ring at C107, no `PREV_HOOD_ECON_JSON`). Sole suspect: engine.225. Baselines for comparison: @38's C108/C109 ring state read back before the resync (`scratchpad bench38-c10{8,9}-readback.json`): C108 econ 56 / sentiment −0.16, C109 econ 54 / sentiment −0.14; @38 hood blob C108 integers 54–57 (median 55), C109 integers 51–55 (median 53); @38 C109 `neighborhoodDynamics` Jack London sentiment −0.2511, Fruitvale −0.1335, Rockridge (a median hood) −0.2657.

## C108 predictions (first fire on 225: Phase 2 opens with NO hood economies — the live-C107 resync carries no hood blob)

1. Fire ok, 108, 0 Engine_Errors, phaseCount 132, `carryForward` = one `PREV_HOOD_ECON_JSON missing`. The `hoodMoodMedian === null` path runs in Phase 2 with no throw and no relative term: city sentiment **−0.16** and economy **56** exactly as @38 (nothing 225 touches runs before Phase 6 on this fire).
2. Ring `PREV_HOOD_ECON_JSON@108`: 22 hoods within ±3 of the city; **at least one non-integer value** (migration keeps one decimal — @38's blob was all integers); Jack London the top hood (playoff + business ripples), Fruitvale / Downtown / West Oakland the bottom (crime spike + doldrums), as on the 219 bench.
3. Neighborhood_Map `MigrationFlow`: not asserted numerically (seeded rng) — Jack London's flow ≥ a median hood's is the expected shape (mood band +1.5 reachable now).
4. Riley_Digest C108 row present; cycleWeight reason unchanged in kind.

## C109 predictions (Phase 2 opens on C108's hood set — the relative term fires for the first time)

1. Fire ok, 109, 0 errors, 132/132, `carryForward` absent (hood blob present).
2. `PREV_CYCLE_STATE_JSON@109.neighborhoodDynamics`: Jack London's sentiment ABOVE @38's −0.2511 (its cluster sits above the hood median); Fruitvale's BELOW @38's −0.1335 (below the median); a hood at the median in a cluster with no rippled hood (Rockridge / Temescal, NORTH_HILLS) equal to @38's value to within the rng of that Cycle. Economy **54** (Phase-6 producer untouched); city sentiment within ±0.02 of −0.14 (the hood terms are near-symmetric round the median).
3. Ring `PREV_HOOD_ECON_JSON@109`: decimals present; band ±3 of the city.

## Results — C108 on @39, fired 2026-09-15 ~02:41 Chicago (`bench-225-c108-fire-response.txt` is Google's "Page Not Found" interstitial — node fetch followed the post-run redirect late; the run itself completed: cycleCount 108 written, ring rows @108; `bench-225-c108-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire / first-fire path | ok, 108, 0 errors; `hoodMoodMedian === null` runs, no relative term | cycleCount **108**, Engine_Errors **0**; `PREV_CYCLE_STATE_JSON@108.neighborhoodDynamics` **12/12 byte-identical** to @38's C108 (sentiment and retail per hood); city sentiment **−0.16**, economy **56** — exactly @38 | PASS |
| Ring `PREV_HOOD_ECON_JSON@108` | 22 hoods ±3 of the city; ≥1 non-integer; Jack London top, Fruitvale / Downtown / West Oakland bottom | 380 chars, 22 hoods, **53.7–57.4** (median 55.65, city 55.83); **21 of 22 non-integer** (@38's blob was all integers); top Jack London 57.4 = Grand Lake 57.4, San Antonio 56.7; bottom **Fruitvale 53.7, West Oakland 54.1, Downtown 54.4** | PASS |
| Neighborhood_Map MigrationFlow | shape only (seeded rng) | Jack London **1**, Fruitvale −1, Laurel −1, Rockridge 2 | — (on record) |
| Riley_Digest C108 | row present | `high-signal` — "High event volume (9); Notable weather impact; Shock event detected; Recovery moderate; Strain trend detected." CitySentiment −0.16 (= @38) | PASS |
| phaseCount 132 / `carryForward` | one `PREV_HOOD_ECON_JSON missing` | not on file — the fire JSON was lost to the interstitial; the ring proves the run and the missing-blob path is the same code as @36–@38 | not claimed |

## Results — C109 on unchanged @39, fired ~02:45 (curl; response again Google's interstitial — the run completed: cycleCount 109, ring @109; `bench-225-c109-readback.json`)

| Check | Predicted | Result | Verdict |
|---|---|---|---|
| Fire | ok, 109, 0 errors | cycleCount **109**, Engine_Errors **0**; economy **54** (= @38, the Phase-6 producer is untouched); city sentiment **−0.15** (@38 −0.14, within the declared ±0.02) | PASS |
| Phase 2 opens on C108's hood set — the relative term | Jack London above @38's −0.2511; Fruitvale below @38's −0.1335; every hood's move follows its C108 delta from the median | Jack London **−0.2452 (+0.0059)**, Fruitvale **−0.1484 (−0.0150)**, Downtown −0.2576 (−0.0086), West Oakland −0.0811 (−0.0056), Temescal −0.1917 (+0.0055), Rockridge −0.2606 (+0.0051). Sign of every hood's Δsentiment vs @38 = sign of (cluster delta × 0.01 + hood delta × 0.005) from the C108 blob (median 55.65): **12/12** (`scratchpad/c109-signs.txt`). Retail moves the same way (Jack London 1.1646 → 1.1719, Fruitvale 1.1897 → 1.1729) | PASS — the causal proof: a hood's own economy now prices its own street |
| Ring `PREV_HOOD_ECON_JSON@109` | decimals; ±3 of the city | 22 hoods **51.3–55.0**, median 53.15 (city 53.63), **19 of 22 non-integer**; top Temescal 55.0 / Laurel 54.9 / Rockridge 54.8, bottom San Antonio 51.3 / Baylight 51.6 / East Oakland 51.7 | PASS |
| Riley_Digest C109 | row present | `high-signal` — "…; 45 high-priority story hooks; Wide domain spread (6 active)." CitySentiment −0.15 | PASS |

Suite after the cut 244/244 (245/245 with engine.226's test). **Bench state after C109:** SANDBOX 0908 @39 = `a2f3661f`; sheet at C109, bench-only since this session's typed C107 resync.
