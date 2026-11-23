# agy brief — engine.357 diff read (engine-sheet, 2026-11-23)

**Read-only. Write only `output/antigravity/2026-11-23-review-engine357.md`.**

Commit `92424fe53` (`git show`). Plan: `docs/plans/2026-11-22-checker-reads-its-own-record.md`.

The engine auditor had three faults: Riley_Digest's empty value "none" filed as a recurring issue; any ImplementationPhase change filed as `improvement` (incl. implementation-active → stalled); one remedy measurement filed once per prior pattern that shared it. The fix adds a `setback` pattern type for moves into a failing phase (contract intensity < 0).

Attack:
1. Every reader of audit `patterns[].type` (scripts/, lib/, dashboard/, engine-auditor enrichers, tierClassifier, capability-reviewer, civic chain, desk slices, stink-scanner, civisJournal, Varek, world summary) — does any break, mis-route, or drop a `setback`? Any reader that only reaches initiatives through `type === 'improvement'`?
2. `detectImprovements.js` measurement dedup: is the key (field, expected, observed, verdict) ever equal for two genuinely different measurements? Does the join of affectedEntities change routing (city-hall seats via neighborhoods → districts)?
3. `detectRepeatingEvents.js` empty-token filter: can a real issue token be dropped?
4. Anything the A/B in the plan §Acceptance 2 would not have caught.

Each finding: file:line, the input, what breaks. Verdict: SHIP / SHIP-WITH-FIXES / HOLD.
