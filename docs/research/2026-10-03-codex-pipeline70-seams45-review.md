---
title: Pipeline.70 seams 4 and 5 adversarial review
created: 2026-10-03
updated: 2026-10-03
type: reference
tags: [research, pipeline, review]
sources:
  - commit 2f2c7bac
  - docs/plans/2026-10-03-citizen-pages-drive-canon.md §1 rows 4-5, §2, 03:00 changelog
pointers:
  - "docs/plans/2026-10-03-citizen-pages-drive-canon.md — owning specification"
---

# Pipeline.70 seams 4 and 5 — adversarial review

**Verdict: HOLD.** Seam 4's mechanical gate can report zero page-stance failures while a POPID in the candidate pool has no reflection of its own; the desk rules also retain an explicit non-pool-writer escape sentence. Seam 5 is non-blocking as implemented, but its detector has reproducible false positive and false negative paths. Review is of commit `2f2c7bac` and local synthetic, read-only probes; no live run or Sheet verification.

## Findings

1. **HIGH — a second candidate POPID on a line is never page-screened.** `scripts/checkLetterEligibility.js:122-123,142-155,163-165,208-240` — `extractCandidatePopIds` collects every POPID, but `screenPageStance` checks only the first POPID per line. **One-line repro:** `## Candidate pool\n- POP-90001 — verified [cp-POP-90001-c109-PRESS]; POP-90002 — writer without page` with an index containing only POP-90001 yields `candidateIds=[POP-90001,POP-90002]`, `ok=[POP-90001]`, `failed=[]`; if both are on the ledger, the gate exits 0. Require exactly one candidate POPID and its matching citation per parsed candidate row, or screen every extracted candidate POPID and fail on ambiguous rows. The same bypass works when a verified POPID is cited as context before a second writer POPID.

2. **MEDIUM — page polarity leaks from one entity to another, producing a false flag.** `scripts/scanCitizenPages.js:134-138,181-188` — polarity is computed for the whole segment and then applied to every theme in it; the displayed excerpt can even be neutral about the flagged entity. **One-line repro:** quote `I support transit. The council met.` against page `I hate the council. Transit was discussed.` returns a `transit` contradiction, although the page states no opposition to transit. Bind polarity and entity within the same clause or sentence before flagging.

3. **MEDIUM — two clear reversals cancel before entity matching.** `scripts/scanCitizenPages.js:134-138,164-168` — a quote with one positive and one negative lexicon hit has polarity zero, even when each is attached to a different entity and both reverse the page. **One-line repro:** quote `I love transit. I hate the council.` against page `I hate transit. I love the council.` returns `null`. Detect per-entity, per-sentence polarity; this uses words already in the lexicon, so expanding the lexicon alone cannot fix it.

4. **MEDIUM — `sameUtterance` can suppress an older contradictory record by text overlap alone.** `scripts/scanCitizenPages.js:170-176` — it skips an entire doc if the quote's first 60 characters occur anywhere in that doc, without provenance or Cycle identity. **One-line repro:** quote `I am proud of transit improving now.` against a prior reflection `I am proud of transit improving now. But I hate transit this week.` returns `null`; the later negative stance is never examined. Exclude the actual quote's own PRESS record by a bound record ID, or remove only the matching utterance segment before evaluating the rest of the doc.

5. **MEDIUM — a literal ` --- ` inside one answer is mistaken for an answer boundary.** `scripts/scanCitizenPages.js:178-184` — the delimiter is split regardless of whether it is packet structure or citizen prose. **One-line repro:** quote `I love transit.` against page `I hate --- transit.` returns `null`, while `I hate transit.` returns a conflict; both polarity and entity are present but separated by the split. Split only structured multi-answer records, or preserve a fallback pass over the original answer when split fragments lack a stance.

6. **MEDIUM — the page-line skip is packet-wide, not tied to a quote.** `scripts/cron-rhea-gate.js:538-544` — every quote receives every page-line candidate customId in `skipCustomIds`; a citizen's page can be excluded even for a separate quote that did not answer that page. **One-line repro:** put `cp-POP-90001-c109-PRESS` in `packet.sourcingPool.candidates` as a page-line, then give POP-90001 a different positive transit quote and a negative transit page at that ID; the check passes that ID as skipped and misses the reversal. Bind the skipped customId to the quote's own sourcing record, rather than the packet's full candidate set.

7. **MEDIUM — desk rules still describe an invented writer as allowed with editor verification.** `.claude/agents/letters-desk/RULES.md:50` conflicts with the no-invented-writer rule at `:47-49` and the plan's 02:05 ruling. **One-line repro:** a desk following “The invention was fine” and “Any non-pool writer needs an editor-side verify” can draft a new writer and route it to Mags despite the immediately preceding ban. Remove or explicitly historicalize that sentence; the permitted invention remains people and businesses *inside* a letter (`:49,81`). `.claude/skills/sift/SKILL.md:830,840-846` and `.claude/skills/write-edition/SKILL.md:60,71,115` prohibit invented writers; sift's stale no-citation example at `:868` is rejected by the file gate but should be removed to avoid misleading pool authors.

8. **SPEC DRIFT — the 03:00 changelog claims an affect fallback the code deliberately omits.** `docs/plans/2026-10-03-citizen-pages-drive-canon.md:95` says page polarity uses the wake's affect tag when words are silent; `scripts/scanCitizenPages.js:139-145` returns zero in that case, and `stanceConflict` uses the same text lexicon on both sides (`:182-184`). **One-line repro:** a reflection with `affect:'Angry'` and text `Transit was discussed.` gives `polarityOfDoc(doc) === 0`, not negative. Reconcile the plan with the smoke-tested choice before treating the 03:00 description as proof.

## Requested control-flow checks

- `scripts/cron-rhea-gate.js:688-703,742-743`: a detected page contradiction is appended as `medium` after `highSevCount` and `detBlockers` are computed; `gatePass` and the exit code do not depend on it. Thus `PAGE_CONTRADICTION` cannot itself block or hold a draft in the executable gate; “held” only means visible, as the plan's 03:00 entry clarifies.
- `scripts/cron-rhea-gate.js:512-550,573-578,688-694`: page loading, grouping, and `stanceConflict` run within the nested try/catch. The later reporting loop consumes the locally constructed `pageContradictions` array and adds strings/numbers, so I found no valid-packet path by which this new check throws past its catch and kills the gate. An exception inside the check instead logs a warning and omits the flag.
- `scripts/checkLetterEligibility.js:72,122,142-155`: `POPID_RE` has `/g`, but its uses here are `String.match`, which resets regex state; the line filter deliberately constructs a non-global regex before `.test`. No additional stateful `/g` use was found. The flaw is first-match-only row screening (finding 1), not regex state.

## Local validation

- `node scripts/scanCitizenPages.test.js` — PASS (exit 0).
- `node scripts/checkLetterEligibility.test.js` — PASS (exit 0; 9/9 existing assertions plus the page-stance backstop assertion block).
- Synthetic `node` probes above used module exports and in-memory docs/pools only; no live data, external calls, or writes.

## Correction — 2026-10-03

Finding 4's original repro also has mixed polarity in one segment, so it does not isolate `sameUtterance`. The isolating repro is quote `I am proud of transit improving now.` against prior reflection `I am proud of transit improving now. --- I hate transit this week.`: it returns `null`; changing only the quote to `I love transit improving now.` produces a negative-transit conflict from the second segment. The first 60-character overlap is what suppresses the entire prior doc.
