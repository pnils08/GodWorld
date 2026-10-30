---
title: pipeline.97 every page final rereview of 534779a0
created: 2026-10-30
updated: 2026-10-30
type: reference
tags: [media, citizens, pages, active]
sources:
  - commit 534779a0
pointers:
  - "[[2026-10-30-codex-pipeline97-every-page-review]]"
  - "[[../plans/2026-10-03-citizen-pages-drive-canon]] — section 6"
---

# pipeline.97 every page final rereview

**Verdict: SHIP-WITH-FIXES.** The fold closes the new reporter-filing exposure and fixes the approach assertion. The remaining fix is an operating gate for the proposed day-boundary switch: finish or explicitly restart any in-flight Tamsin wake before the boundary. The code still has `EVERY_PAGE=false` (`scripts/buildLivesSlice.js:83`). This was source inspection only; I ran no tests, scripts, network calls, or live cycles.

## Finding

1. **R1 — a day-boundary flip with an in-flight Tamsin angle can consume a batch without writing it.** `scripts/buildLivesSlice.js:487-492` accepts a slice only for the current local day; on the next day it rebuilds. A build takes the next uncovered events (`:258-261`) and marks its selected facts covered before the writer runs (`:460-463`). Each wake stage calls `seatSitsOut`, which calls `loadSlice` (`scripts/cron-desk-run.js:1551-1559,1575,2937`), while W3 reads the already saved W1 angle (`:2935,2951`). Input: W1 selects batch A before midnight, W2 completes, the switch flips at the day boundary, and W3 resumes after midnight with more pending events. Wrong output: W3's preliminary `loadSlice` builds and covers batch B while the saved angle and packet still describe batch A; batch B is no longer pending for its own angle. If A exhausted the event queue, the new build can instead return empty and W3 exits before writing A. This stage-boundary problem predates `534779a0`, but it is a concrete failure of the proposed day-boundary flip as a sufficient F3 gate. Flip only after all earlier-day Tamsin stages have completed, or explicitly restart an unfinished wake with a fresh angle; do not let it resume across the boundary.

## Prior findings and fold checks

- **F1 settled for the new exposure.** `readsEvery` returns false for a MEDIA profile (`scripts/buildLivesSlice.js:76,91-93`). The only page-voice path passes the ledger profiles into `ownPageLines` (`:450-454`), which computes that rule per indexed doc before slot admission and text cleaning (`:154-169`). Input: a MEDIA reporter selected by a primary `Lived_Events` event with a `PRESS` page containing `filed: Sample headline`. Output under either switch: the PRESS doc fails the old Lives slot set, so that filing is absent from `pageVoices`. The pre-existing primary-event MEDIA selection itself remains; this rereview does not treat that editorial behavior as a fold regression. The new exact reporter-page assertion can fail if the PRESS doc is admitted (`scripts/buildLivesSlice.test.js:110-111,124-128`).
- **F2 settled for the new exposure; switch-off output preserved.** Ines's roster excludes MEDIA profiles (`scripts/buildVoicesSlice.js:96-101`). At W3, `pagesForPicks` loads profiles, computes `readsEvery` for each doc, applies the corresponding slot rule, and only then makes FACT lines (`:161-184`; `scripts/cron-desk-run.js:3046-3055`). Input: a stored pick names the same MEDIA reporter and the indexed pages include a wake page plus `PRESS` filing. Output under the true switch: the wake page can resolve, but the PRESS filing cannot. Under the false switch, `readsEvery(false, p)` is false for every profile, so the admitted slots and raw trimmed text match the previous resolver; the changed filter order does not change returned pages. The exact `['p4']` assertion would fail if `p13` were exposed (`scripts/buildVoicesSlice.test.js:42,133-135`). The pre-existing rule that a pick is hers remains.
- **F4 settled.** `build` makes a seat copy with `approachFor(everyPage)` and passes it through both nonempty and empty slice constructors (`scripts/buildVoicesSlice.js:29-31,89-90,116-117,142,146`; `scripts/beatSliceKit.js:215,237-240`). The true-rule fixture now asserts the true wording from its `everyPage:true` input, while the false-rule fixture asserts “self-initiated” (`scripts/buildVoicesSlice.test.js:59,77,118,126`). These assertions can fail on the wrong approach.
- **F3 is a boundary decision, not a code fix.** Same-day caches still have no rule marker (`scripts/buildLivesSlice.js:487-492`; `scripts/buildVoicesSlice.js:203-208`). A next-day load rebuilds both seats, but R1 shows the flip must also be clear of in-flight Tamsin stages. No runtime, cache, deployment, or live behavior was verified here.

**Gate:** the fold is source-ready for the planned switch once the operator ensures no earlier-day Tamsin angle or report remains in flight at the flip. The two seat suites and the live C113 counts cited in the fold commit were not rerun by this review.
