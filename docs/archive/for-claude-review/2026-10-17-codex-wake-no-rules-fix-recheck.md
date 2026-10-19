---
title: Wakes have no rules — fix commit recheck
created: 2026-10-17
updated: 2026-10-17
type: reference
tags: [engine, citizens, reference]
sources:
  - docs/for-claude-review/2026-10-17-wake-no-rules-fix-recheck-TASK.md
  - docs/for-claude-review/2026-10-17-codex-wake-no-rules-diff-review.md
pointers:
  - "[[plans/2026-09-10-inactivity-is-regression]]"
---

# Verdict: FIX — lock exclusivity remains broken

Reviewed `2de1744d` against its parent and main plan §As built (`docs/plans/2026-09-10-inactivity-is-regression.md:546-551`). Code citations below are relative to **/root/GodWorld-wake**. Worktree HEAD `b310439b` has identical reviewed files to `2de1744d` after the W3 revert/reapply. Only this artifact written; no cron/model/Sheet/bench/canon execution, commits or merge.

1. **Concurrent enqueue/flush loss — SHIP, original finding closed.** `lib/wakePerception.js:867-873,915-925` writes/deletes one date's file rather than saving an obsolete whole-queue snapshot. A new different-date file survives an in-progress flush; `lib/wakePerception.test.js:307-313` exercises that exact interleaving. A same-date replacement can be deleted after an earlier row for that date is verified, but that is consistent with one write-once row/night, not a lost night. A date queued after the initial directory listing waits for another flush.

2. **Crash-corrupted pending — SHIP for the original partial-file failure.** Temp-write then rename (`wakePerception.js:867-873`) leaves the previous final file intact on an interrupted replacement. Unreadable/malformed final files remain and are reported (`:918-919`); tests cover malformed JSON and wrong-night identity (`wakePerception.test.js:291-297`). This is process-crash protection after successful publication, not power-loss durability: there is no fsync, and a first enqueue killed before rename leaves only an ignored `.tmp` (`:870-872,911`). Failed spool writes now log the row (`scripts/discord-reflection.js:407-409`), as the plan's explicit limited-receipt contract allows; do not claim delivery before successful spooling.

3. **Stale-lock takeover duplicates — FIX, high.** Age-based stealing is removed and normal live-owner/token checks are present (`wakePerception.js:884-890,901`), but lock publication is not atomic: `:885` creates an empty pathname before writing the owner token. B can read that empty file, infer owner 0, rename/delete it and acquire its own lock (`:888-898`) while A still holds the original descriptor. A then writes to the unlinked inode and also enters `fn`. **Confirmed by deterministic in-memory execution of the actual function with two synthetic PIDs and a preemption after exclusive create: both B and A entered the critical section concurrently.** No filesystem writes or external calls were used. Both intake writers can consequently scan absent and append the same night.

4. **Header/row validation — SHIP for the reported defects.** Exact A–H header checks reject `[[]]`/wrong headers; a matching row needs Applied yes/no and event or affect (`wakePerception.js:833-847`). The prior identity-only truncated row now stays ambiguous/spooled (`wakePerception.test.js:238-239,300-304`). Spool input checks length, POPID, source date, daypart, unapplied state and a nonempty Cycle (`wakePerception.js:859-863`). This is the scoped drain-compatible validation specified in §As built, not full semantic validation of every tag or Cycle value; no live Sheet schema read was performed here.

5. **M1 non-Mags NIGHTLY scope — SHIP, closed.** The POP-00005 guard runs before the daypart test (`lib/citizenPage.js:114-116`), so non-Mags NIGHTLY results return the same object. Explicit regression fixture at `lib/citizenPage.test.js:82-83`. Other known dayparts on her page likewise remain unchanged.

**Additional takeover race — FIX, high:** even with a fully published token, `wakePerception.js:892-895` temporarily removes a potentially *live replacement* lock before comparing it. Two contenders can read old dead token D; B replaces D and starts work; A renames B's lock, notices the mismatch, but C can acquire the now-empty pathname before A links it back. Restoration then fails with EEXIST and A deletes the aside, leaving B and C both executing. Token-aware release does not restore exclusivity. Replace the takeover protocol with exclusion that cannot remove a live owner's lock; fail closed on incomplete/unknown ownership. Add deterministic create-before-token and dead-lock/replacement/third-contender tests.

**Test evidence limits:** inspected Test N, lockCases and spoolCases; suites were not rerun because they create scratch files. Existing tests cover normal contention, old-live/dead owners, throw-before-append retry, cross-night enqueue, and valid readback. The two-process Sheet surrogate at `wakePerception.test.js:322-326` reads the array *before* delaying and rewrites it afterward: two concurrent append callbacks can overwrite each other's identical two-row snapshot and still satisfy `rows.length === 2`. Count append invocations with an independent append-only receipt and assert maximum simultaneous critical sections; include append-commits-then-throws recovery. The deterministic lock reproduction above is bounded local evidence, not a live concurrency run.

**Final gate: FIX before merge.** Four original findings close at the stated scope; ownership acquisition/recovery still permits duplicate intake rows. Syntax checks passed for the three changed implementation files, and `git show --check 2de1744d` plus this artifact's whitespace check passed. Existing C112 readback/deploy and W3 approval gates remain unchanged.
