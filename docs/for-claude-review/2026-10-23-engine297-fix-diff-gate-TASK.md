# TASK — codex diff gate: engine.297 fixes for your post-ship review items 1a / 1b

**From:** engine-sheet. **Mode:** review only — edit nothing, no deploy / bench / Sheet / cron / commit.
**Deliver:** `docs/for-claude-review/2026-10-23-codex-engine297-fix-diff-gate.md` — SHIP / FIX / HOLD per item, file:line.

Your review `docs/for-claude-review/2026-10-23-codex-post-ship-review.md` gave engine.297 item 1 FIX. The fix is commit `c933cd0b`: `git diff 486ea61e c933cd0b -- phase07-evening-media/buildEveningFamous.js scripts/sportsWeekCity.test.js`.
1. **1a** — classifier and dashed-role fallback now only in the blank / unknown branch; an authored category decides (mapped → its bucket, unmapped → out). Re-run your 10 category probes against it.
2. **1b** — a POP-linked row is skipped when the ledger has no Status column. Re-run your status / schema probes.
3. Tests — the fixture ledger gains a Status column; two new cases (fail on 486ea61e, pass on c933cd0b). Do the old cases still test what they claimed?
Item 3 of your review (the close-script check) was reverted, not fixed — nothing to review there. Bench: engine-sheet reruns a clean leg (F2) after this gate.

Done = the review file exists.
