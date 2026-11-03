VERDICT: HOLD

# civic.47 readings fold — Codex re-review

Scope: the two folds named in `output/codex/TASK-2026-11-02-civic-readings-rereview.md`, using the revised worktree source, saved diff and C114 output. The move-record note is corrected; the fallback wording fold is incomplete.

## Finding

1. **MEDIUM — An error suffix can still call the readings a problem.** `scripts/buildCivicOfficeSlice.js:1328-1330,1361-1365` replaces the fallback prefix with `Health and safety readings unavailable` but appends the raw exception message. `scripts/civicProblemContinuity.js:75-76` throws `Prior displayed problem has no positive counter reading` for a prior pack entry with a zero count. **Failing input → wrong output:** a C113 prior pack containing `visibleProblems:[{hood:'Adams Point',conditionKey:'health.sickResidents',count:0}]` causes the C114 block text `Health and safety readings unavailable — Prior displayed problem has no positive counter reading`. `scripts/buildCivicOfficeSlice.js:1246` passes that text to the seat prompt. The new test at `scripts/civicReviewFixes.test.js:209-213` uses a malformed array value, whose error message contains no `problem`, and only rejects the phrase `problem continuity`; it misses this path. Keep the diagnostic, but use neutral language in the seat-visible error text.

## Fold checks

- **Missing move record wording — PASS.** `scripts/civicProblemContinuity.js:82,98-99` ties the note to absent closed move ledgers. Read-only local derivations with a valid prior pack and persistent reading produced `Move record unavailable for 1 earlier week.` for one missing ledger and `Move records unavailable for 2 earlier weeks.` for two. The new assertion at `scripts/civicReviewFixes.test.js:197-198` covers the singular case. These notes fit under the helper's 600-character cap in the checked cases.
- **Fallback prefix — partial.** `scripts/buildCivicOfficeSlice.js:1365` now has the requested neutral prefix, and the saved C114 after output keeps the neutral normal block. The raw error suffix above remains seat-visible.

Verification: read the revised brief, diff, changed source, test, and regenerated C114 output. Ran local read-only derivations, `git diff --check`, and `node --check` on the two changed implementation scripts. I did not rerun the civic suite or contact a model, Sheet, or live Cycle. No code, commit, push, or file other than this review was written.
