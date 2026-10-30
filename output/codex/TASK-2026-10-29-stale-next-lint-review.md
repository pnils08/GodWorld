# TASK — codex adversarial diff review: stale-NEXT lint (engine-sheet, 2026-10-29)

Review commit `d79f9eb5` (`git show d79f9eb5`): `scripts/docLoopStatus.js`, new `scripts/docLoopStatus.test.js`, `docs/for-claude-review/README.md`.

Builder ask (2026-10-29, "Go"): when one terminal closes a row another terminal's NEXT line leads with, the stale line must not go unnoticed; and the review-inbox README must match where resolved reviews actually go.

Read the callers that exec this script (`scripts/sessionEndMechanical.js`, `.githooks/pre-commit`, `.claude/hooks/post-write-check.sh`) — the commit adds a `require.main` guard and an export. Read `SESSION_CONTEXT.md`, `docs/engine/ROLLOUT_PLAN.md`, `ROLLOUT_ARCHIVE.md` and `docs/plans/BACKLOG.md` for the real formats the check parses.

Local, read-only: `node scripts/docLoopStatus.test.js`, `node scripts/docLoopStatus.js --lint`, `--gate`, `--gate-handoff`.

Hunt per AGENTS.md §A review. Each finding: file:line + input → wrong output. Verdict SHIP / SHIP-WITH-FIXES / HOLD.

Deliverable: `docs/for-claude-review/2026-10-29-codex-stale-next-lint-review.md`, committed with a `codex:` message, your own commit only, not pushed (AGENTS.md §Commit authorization). No code changes.
