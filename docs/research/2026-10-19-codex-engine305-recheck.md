---
title: Engine.305 Cut A PROD recheck
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [engine, citizens, draft]
sources:
  - phase05-citizens/generateCitizensEvents.js
  - utilities/neighborhoodPulseMap.js
  - scripts/testNeighborhoodLoop.js
  - output/engine-sheet/2026-10-19-e305-A-c113.json
  - output/engine-sheet/2026-10-19-e305-B-c113.json
pointers:
  - "[[plans/2026-10-10-engine-214-mood-per-hood]] — Step 8a Cut A"
---

# Engine.305 Cut A — PROD recheck

**Verdict: SHIP-WITH-FIXES, not yet an unconditional PROD SHIP.** The two production files at `ea777cae` still have the signed-pulse behavior approved in the first review; `94550a7c` and `13a2abd8` close its harness defects. The proposed stage 14 manifest differs from stage 13 in exactly `phase05-citizens/generateCitizensEvents.js` and `utilities/neighborhoodPulseMap.js` (`output/engine-sheet/stage13-e304.sha256:49,149`; `stage14-e305.sha256:49,149`). The C113 pair passed and saved Sentiment moved in the expected direction. The recorded A/B line readbacks, however, are on different counting definitions, and the required per-hood raw pulse sentiment and event counts were not captured. Complete that paired receipt before the PROD push. No code edit is indicated by this recheck.

## Recheck of prior findings

1. **Written tag / single pulse — closed, SHIP.** The generator grades or drops a Neighborhood line at `phase05-citizens/generateCitizensEvents.js:3563-3576`; `primaryTag` then goes into both the LifeHistory line and the log tag (`:3648-3652`, `:3664-3676`) before the one first-draw call to `pulseKindForLine_(lineKind, primaryTag)` (`:3681-3690`). `Neighborhood-Down` maps to sentiment −1 and the helper changes only a Neighborhood kind with a written Down grade (`utilities/neighborhoodPulseMap.js:28-33`, `:147-150`). `recordPulse_` still increments `events` once (`:122-136`). Production files have no committed changes after `ea777cae` (checked `git diff ea777cae..HEAD` on both).

2. **Harness corrections — closed for the reachable harness routes, SHIP.** C7 spies the tag passed at the generator's pulse call and compares its grade with the kind (`scripts/testNeighborhoodLoop.js:536-552`). C7h now requires a real hood-state Up call and C7i requires both community-life grades (`:568-571`). My local run passed 35/35: hood-state 269 Down / 78 Up, community-life 42 Down / 272 Up, zero mismatches. C6's flat-control comment and assertion now agree on West Oakland (`:503-515`). The `source:neighborhood` C7 count remains zero **by harness design**: C7j asserts the unsigned hardcoded texture is dropped (`:572-579`). Its live ECL library variant is described in the corrected comment (`:574-576`), but is not exercised by C7; the common helper's sign rule is exercised by the other two routes. The three-route wording in C7g must therefore be read as checking every *observed* call, not positive coverage of all three.

3. **Bench execution / stage identity — closed as a bench result, SHIP.** The pair reset both legs from C112 and compared 84 tabs with zero differences (`output/engine-sheet/2026-10-19-e305-pair.log:1-18`). A on stage 13 and B on stage 13 plus the two `ea777cae` files each returned PASS; the B push reported a byte-identical 167-JS pullback against the stage 14 manifest (`:19-27`). The recorded fire receipts show C113, persistence errors `[]`, 531 executed intents in each, and a 131-phase run (`output/engine-sheet/benchfire-raw/e305A-c113.json:1-8`, `:76-80`; `e305B-c113.json:1-8`, `:76-80`). `output/engine-sheet/2026-10-19-benchfires.jsonl:89-90` records no new Engine_Errors, live still C112, and checkpoint null. This is sandbox evidence, not a current PROD pullback or first live C113 result.

4. **Saved Sentiment effect — observed, SHIP.** Comparing the 22 saved hood values gives 15 decreases of 0.01–0.07 and seven unchanged, mean change −0.026 (`output/engine-sheet/2026-10-19-e305-A-c113.json:4-26`; `2026-10-19-e305-B-c113.json:4-26`). The three B hoods with zero Down lines—Brooklyn, Dimond, East Oakland—are unchanged (`2026-10-19-e305-B-c113.json:81-87`, `:97-99`; both sentiment tables). Four hoods have Down lines but no displayed change, consistent with rounding or fold saturation; the saved map alone cannot attribute each hood's raw pulse. The Phase-8 writer normalizes by `events`, caps signed raw deltas, and rounds the saved Sentiment (`phase08-v3-chicago/v3NeighborhoodWriter.js:278-286`, `:520-530`).

## Open evidence gap before PROD SHIP

**A/B Neighborhood-line comparison is not like for like.** The committed A JSON contains only 46 Neighborhood-kind lines (`output/engine-sheet/2026-10-19-e305-A-c113.json:28-63`), while the corrected B JSON contains 651, including 550 Up and 101 Down (`2026-10-19-e305-B-c113.json:28-119`). The pair log was made with the earlier bare-tag read and still says **46 for B** (`2026-10-19-e305-pair.log:10`, `:25-26`). The final reader accepts the graded tag followed by context (`2026-10-19-e305-read.js:20-30`), but the corrected A leg was not reread in the committed artifacts. The raw fire receipts also contain no `neighborhoodPulse` sums. Thus these artifacts do not establish the asserted 651-to-651 line identity, per-hood pulse sentiment, or unchanged `events` that the Cut A bench contract explicitly requests (`docs/plans/2026-10-10-engine-214-mood-per-hood.md:207-208`).

**Fix:** capture both legs with the same final graded-tag reader and a per-hood first-draw `neighborhoodPulse` sentiment/`events` receipt, then compare the written line sets, pulse event counts, and saved Sentiment against stage 13. The source's one-call/no-new-randomness shape predicts equal counts, but the requested paired receipt must show it. Before deployment, the PROD procedure must also freshly verify stage 13 on PROD, construct the stage 14 manifest byte for byte, and pull back after push (`output/engine-sheet/2026-10-19-push-e305-prod.sh:16-26`, `:31-37`); none of those PROD actions was performed in this review.

**Scope:** read-only source and committed bench-artifact review, plus `node scripts/testNeighborhoodLoop.js` (35/35). No Sheet access, bench fire, PROD deployment, or code edit by Codex.
