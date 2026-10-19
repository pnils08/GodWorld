# TASK — codex: re-check the rebuilt intake lock

Read-only; write `docs/for-claude-review/2026-10-17-codex-wake-no-rules-lock-recheck.md`, SHIP / FIX, file:line, under ~30 lines. Commit: `git -C /root/GodWorld-wake show 6bab1571` — `withFileLock` in `lib/wakePerception.js` + lockCases / spoolCases in `lib/wakePerception.test.js`. It answers your §3 + "Additional takeover race" in `docs/for-claude-review/2026-10-17-codex-wake-no-rules-fix-recheck.md`.

Is there still any interleaving (create-before-token, dead-lock break, replacement, third contender, release) where two runs are inside `fn` at once, or a live owner's lock is removed? Are the new tests real evidence (8-process stress with an append-only receipt; one append call across two full writers; commit-then-throw recovery)?

Done = the md exists.
