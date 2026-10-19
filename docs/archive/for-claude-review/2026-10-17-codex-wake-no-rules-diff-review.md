---
title: Wakes have no rules — worktree diff review
created: 2026-10-17
updated: 2026-10-17
type: reference
tags: [engine, citizens, reference]
sources:
  - docs/for-claude-review/2026-10-17-wake-no-rules-diff-review-TASK.md
  - docs/plans/2026-09-10-inactivity-is-regression.md
pointers:
  - "[[plans/2026-09-10-inactivity-is-regression]]"
---

# Verdict: FIX; HOLD merge/deploy

Reviewed all six commits `7d84c084..e2874b53` on `engine197-wakes-no-rules`, clean worktree `/root/GodWorld-wake`; main was `c83b9c68` with unrelated dirty output. **All code citations below are relative to `/root/GodWorld-wake`**, not main. **P** = main's `docs/plans/2026-09-10-inactivity-is-regression.md`. Only this review written; no commit, merge, cron execution, model, Sheet, bench or canon run.

## 1. Plan fidelity — FIX

**SHIP:** W1/W2 zero floors and D1 counts (`scripts/citizen-wake.js:229-231`; `lib/wakePerception.js:385-426`); W3 surname removal in the shared pool; W4 event-only weight, no R1/S1–S3 priority, F forced selection and date seed (`wakePerception.js:797-812`; `citizen-wake.js:235-241`). L is post-draw, per recipient, with the old bare receipts honored (`wakePerception.js:763-787`). M1 reaches both page APIs before caller truncation; M2 fixes the source instant, skips non-evening composition, never updates Sheet rows and retries pending before quiet-day exit (`discord-reflection.js:412-429,499-515`). The eight-file diff stays within the planned implementation/test surfaces.

**Not delivered as promised:** Rev 4's exclusive/no-lost-night guarantees (P:538-540) fail on the I/O paths below. Stale-lock removal also lacks the promised log. P:541's non-Mags byte-identity claim is broader than the actual predicate. P:543's caller-level page-failure/spend and pending-append-failure/retry tests are absent: `wakePerception.test.js:153-159` calls only the state helper, and `:244-260` tests lock callbacks writing a local marker, not two complete intake writers or one Sheet row. The midnight test at `:228` compares two clock conversions, not a delayed enqueue/flush. P:543's live DialState delta remains a future gate, not established by these suites.

## 2. M2 I/O — FIX (high)

**Lost pending night through concurrent enqueue/flush.** `flushIntakePending` loads its snapshot **before** locking (`scripts/discord-reflection.js:391-395`); `queueNightlyIntake` reads/modifies/writes pending **without** that lock (`:426-428`). Concrete interleaving: A holds the lock flushing old night X; B queues new night Y and cannot acquire the lock; A clears X and saves its old empty snapshot, unlinking the file at `:388,403-406`. Y was never appended and is now gone. Move all pending read/modify/write operations under the same exclusive ownership, loading the current file after acquisition; do not overwrite a newer pending row with a stale snapshot.

**Crash-corruptible queue is treated as empty.** `saveIntakePending` truncates/replaces the sole file in place (`:387`); an interrupted write leaves partial JSON. `loadIntakePending` converts parse/read failure into `{}` (`:383-384`), so a later enqueue can erase every older unsent night. Use an atomic durable file replacement and distinguish absent from malformed/unreadable pending state; preserve and report corruption. Validate each pending row against its source-date key before submitting it. P:540's “crash no longer loses the night” is not met.

**Lock takeover can duplicate rows.** `lib/wakePerception.js:853-859` treats age as proof of death and unlinks by pathname. A still-running A can hold a slow append past 30 minutes; B removes its lock and enters while A still runs. Both can scan absent and append. When A finishes, its `finally` can delete B's lock, admitting C. Two stale contenders can also race stat/unlink against a replacement lock. Use ownership-safe exclusion and recovery that does not admit a second live writer; test stale/live-owner and replacement-lock interleavings. The existing fresh-lock contention test does not cover this.

**Fail-closed/readback is incomplete.** `planNightlyIntake` checks only nonempty outer array, matching B/D and parseable A (`wakePerception.js:829-840`). `[[]]` or a wrong header is treated as append; a truncated `[ts, POPID, cycle, 'nightly']` matching the date is treated as present even without event/affect/applied columns. `flushIntakePending:403` then deletes the valid pending row although the drain cannot consume the truncated row (`/root/GodWorld/utilities/compressLifeHistory.js:299-302`). Validate the A–K header/row contract and distinguish a proven valid existing row from an identity-only match; malformed results must keep pending, as P:540 requires.

**Sound bounded behavior:** captured `runInstant` supplies both Central clock and column A (`discord-reflection.js:501-502,427`; `wakePerception.js:820-824,845-848`), so delayed append across midnight retains source-night identity. A successful append followed by process failure is recovered by a fresh, valid same-key scan. No new `updateRange` call exists: immutable rows avoid Rev 2's drain/body overwrite race. Scan/read/append exceptions leave the on-disk pending file for retry unless the queue races/corrupts as above. Multiple matches remain pending instead of appending again.

**Isolation is partial, not guaranteed delivery.** Flush errors are caught before page work (`discord-reflection.js:511`); queue exceptions are caught after page/saves (`:581-596`), so ordinary thrown M2 failures do not undo them. But a pending-file write failure is caught and the Moltbook cursor still advances (`:596-602`), leaving no receipt for a composed unsent row; classifier throw/empty deliberately creates none (`:418-419`). A never-settling classifier/Sheet call can also hold the run before cursor advancement; there is no M2 timeout here. State these limits rather than claim “never lost and never doubled” (`:380-381`).

## 3. M1 read scrub — FIX scope; carrier coverage SHIP

`lib/citizenPage.js:114` scrubs **any** `NIGHTLY` result, regardless of POPID. Thus a non-Mags NIGHTLY body is altered, contrary to the blanket non-Mags assertion at P:541 and the helper comment. The concrete predicate matches P:541's first clause, so this is also an internal plan contradiction: either require POP-00005 for both branches or explicitly narrow the guarantee. Add a non-Mags NIGHTLY fixture; current tests cover only metadata-less non-Mags (`citizenPage.test.js:80-81`). No additional current NIGHTLY writer was found, so this is a scope defect, not proof of an affected existing citizen.

Known non-NIGHTLY dayparts return the identical object; missing/empty daypart on Mags is intentionally scrubbed (`citizenPage.js:113-120`). `content`, `chunk` and `chunks[].content` are all transformed and wholly empty results dropped. Both read APIs invoke the helper (`:137-138,177-179`). Runtime `raw:true` appears only in her own `loadPageTail` (`scripts/discord-reflection.js:363`); the other occurrences are tests. Full-body processing precedes consumer caps. The hook patterns and five quoted journal examples have explicit tests (`memoryFence.test.js:88-128`); arbitrary future prose remains outside this bounded scrub guarantee.

## 4. Wake caller — SHIP at source level

`scripts/citizen-wake.js:235-241` draws forced/rotation first, then looks up that citizen's event and passes its matched relation to `renderLivedLine`. Page-pointer or append errors exit before spending (`:333-339`); only after the successful page write does `:402-405` record/save/check the returned composite key. `lib/wakePerception.js:763-787` checks bare plus recipient receipts, writes `eventId:POPID` with a Cycle value, and removes retired recent/count state. No remaining runtime reader of those retired wake fields or `pickLived` was found. `cron-work-wake.js:233,321` uses its own recent-state policy and is unchanged.

The acknowledged page-to-state crash window, stale concurrent wake state, encounter-order event IDs and conservative bare-key migration remain; no new exactly-once claim is justified. Required caller-level failure tests are still missing as noted in Hunt 1, although the ordering is directly visible in source.

## 5. Merge safety — HOLD deployment; removed-symbol compatibility SHIP

Repository code searches found no remaining worktree importer of `pickLived`, `LIVED_CAP_PER_CYCLE` or `LIVED_MIN_AGE`, and no executable consumer of the exact old pool-log phrase. `scripts/refreshVoiceDispositionCache.js:39,57` owns a separate `voicedPopIds`; removing the local wake helper does not break it. `dumpBeatTabs` keeps the still-exported event producer. Main's committed changes since the base are only the diff-review TASK; no committed implementation drift was found in the eight reviewed paths. Absolute `/root/GodWorld` imports still require the reported remapping for worktree execution and resolve normally after landing on main.

I ran `node --check` on all five changed implementation files and `git diff --check` on the six-commit diff: clean. The TASK reports 91/42/32 tests passing; I inspected their coverage but did not rerun suites that create scratch files under this one-file-write restriction. No live cron, concurrent intake, Sheet persistence or post-drain delta proof is claimed.

**Final gate:** fix the pending-file/lock/validation defects and reconcile M1 scope before landing. Keep merge/deploy HOLD per P:544's post-C112-readback gate; final W3 commit `e2874b53` separately awaits the builder answer. No merge, deployment, or approval was performed by this review.
