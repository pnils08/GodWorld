# TASK — agy adversarial review: Lives slice thread (Tamsin Pruitt)

**From:** research-build. **Mode:** review only — edit nothing, no run against Sheets, no cron, no commit except your own review file.
**Deliver:** `output/antigravity/2026-10-25-review-lives-thread-slice.md` — per hunt: REAL / FALSE-POSITIVE / NEEDS-INFO, file:line, a concrete input that breaks it.

Candidate: commit `c0ffd241` — `git show c0ffd241 -- scripts/buildLivesSlice.js scripts/buildLivesSlice.test.js`. Test: `node scripts/buildLivesSlice.test.js` (local, fixture-only).

**What it does.** Tamsin's daily Lives slice gave one event line per person; her pieces came out thin (309 words vs a 450 floor). The change adds, directly under each person's event fact, that person's thread as separate facts (kind `thread`, own `src`): the full Hospital_Ledger stay, up to 4 of their other LifeHistory_Log lines in the dump window (signal tags first, texture after), what Lives already wrote them (`lives_covered.json`), and up to 3 gate-passed Tribune pieces that name them (`archive/ARTICLE_INDEX.jsonl`, `canon === true || published === true`, not `stage === 'canon-violation'`). Doctrine: the record read in order, not the one event; ledger values are NOT restated as the story; bookkeeping lines ("Emerged into Tier…") and the event's own tag lines never ride.

**Hunts.**
1. **Covered list.** The covered-marking loop now skips facts with no `id`. Can a thread fact ever reach `covered[...]` or break the two-Cycle forget, the day-3 "everything covered" path, or `Object.keys(covered).length` assumptions elsewhere (`rg lives_covered`)?
2. **Wrong person.** The thread is keyed by POPID. For a death the person is the survivor (`recipients[0]`), not `subject`. Does any path attach the deceased's or another person's lines? Name fallback in `nameOf(...)`.
3. **Gate leak.** Tribune pieces: is `canon === true || published === true` the right "gate-passed" test given the stages in the index (`passed-gate-not-printed`, `canon-violation`, `flagged`)? Any stage that is canon-true yet should not be quoted back as fact? Empty/odd titles.
4. **Size.** A day carries up to 4 events + 3 moments + 2 stays, each with up to ~8 thread facts: ~40 facts in the slice (was ~9). Does anything downstream cap or hash `facts` / `anchorFacts` / `evidence` (`beatSliceKit.makeSlice`, `cron-desk-run.js`, Rhea's per-seat check, prompt assembly) so the longer slice truncates, errors, or crowds out the approach text?
5. **Rhea.** Thread facts carry cycle numbers, hospital cycle counts and article titles with digits ("142"). Do they enter the allowed-number / allowed-name sets, or will the writer trip UNAPPROVED_NUMBER by using them?
6. **Sort / filter.** `cameNext` line is passed as a skip so it is not said twice; log lines are filtered by `EventText` equality only — can two different people's identical texture line collide, or can a Daily line equal the event text and vanish wrongly? `logByPop` is built from the dump window only (C111–C112) — does the thread honestly describe a window, or imply a full history it lacks?
7. **Tests.** Do the added assertions prove the intended thing, or can a wrong thread pass them (e.g. the "directly under its event" index check)?

**Out of scope, known:** the hospital row for a person with several stays prints each stay; the page-repeat issue on citizen pages (ruled minor 2026-10-25); the Tamsin piece's own `canon-violation` stage at C112 (separate, Rhea gate work).
