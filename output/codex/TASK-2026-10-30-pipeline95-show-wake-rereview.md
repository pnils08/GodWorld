# TASK 2026-10-30 — codex: re-review of the pipeline.95 fold (last round)

Your review: `docs/for-claude-review/2026-10-30-codex-pipeline95-show-wake-review.md` (HOLD, F1–F7). The fold is one commit, `b551a063` (`git show b551a063`). Dispositions: plan `docs/plans/2026-10-16-undocked-crossover-the-city-knows-its-pilots.md` §6.6.

**The fold claims:**
- F1: `showMarkSpent` (`lib/wakePerception.js`). A wake spends only the newest unspent flown-Cycle mark.
- F3: `pageNights` (`scripts/cron-undocked-run.js`) uses two-phase receipts. Pending is saved before the send and landed after; a pending night is never resent; the file is replaced via temp + rename; an unreadable file stops the stage. A returned error clears pending.
- F4: `lib/personaProvider.js` `augment` drops type `show`.
- F5: a night with no archive and an empty feed list is unknown.
- F6: a whole captain's log entry drops if it carries a POPID, an episode, a date, a model name or a handoff.
- F7: a held journal empties the ready list but not the spend.
- **F2, decided without code:** the guarantee starts with the Cycle it is switched on in. The C112 leftovers lapse; their pages are backfilled and their block reaches them on any drawn wake. If the steady state (3 pilots, 3 reserved wakes, newest first) itself loses a pilot's wake, name the input.

**Hunt (the fold only):**
- Does each fix close its finding, without opening a new path to a doubled night, a lost spend or a wrong text?
- Is any switch-off output changed? (`personaProvider` is live, not behind the switch.)
- Is any new assertion one that can't fail?

This is the last round (one review plus one re-review). **Write to:** `docs/for-claude-review/2026-10-30-codex-pipeline95-show-wake-rereview.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, with file:line and input → wrong output for each finding. Register it in `docs/index.md` in the same commit. No code edits, no network calls, no live runs.
