---
title: Codex governance.58 tooling review
created: 2026-11-07
updated: 2026-11-07
type: reference
tags: [governance, infrastructure, review, active]
sources:
  - output/engine-sheet/2026-11-07-codex-gov58-review-brief.md
  - commits 0f2bf5538 and 783ad8aa6
pointers:
  - "[[README]] — Claude review inbox contract"
  - "[[../engine/ROLLOUT_PLAN]] — live waiting rows"
---

# governance.58 — tooling review

**Verdict: HOLD.** The new boot command can consume the entire SessionStart timeout before the hook emits its handoff. The live C115 due list itself contains five plausible reads; the warning path mislabels one live organic row and misses a live shorthand copy. Review scope: `0f2bf5538` and `783ad8aa6` only.

## Findings

1. **P1 — a slow `--due` can discard the whole boot handoff.** `.claude/hooks/session-startup-hook.sh:140` gives the child command 10 seconds, while `.claude/settings.json:210-216` gives the *whole* SessionStart hook 10 seconds. The hook does not emit its JSON payload until `.claude/hooks/session-startup-hook.sh:333-343`. If the child stalls, its timeout fires at the same boundary as the parent hook's; the parent cannot finish building and emitting the PIN, NEXT lines, and boot instructions. The command's stderr is dropped, so the due list also disappears without a local diagnostic. Give the child a materially shorter timeout and let the hook continue with an explicit unavailable line. This is a source-derived failure path, not an observed slow boot.
2. **P2 — `--due` can treat a completed read as due again.** `scripts/docLoopStatus.js:311-314` matches *any* Cycle or date token in the item, including historical receipts. A pure probe with `| engine.999 | C115 read completed; next read C116 | live-observing | engine-sheet | [[x]] |` and fire C115 returns `engine.999`. The live table already mixes history and waits in one item (`docs/engine/ROLLOUT_PLAN.md:33`), so re-dating a row while retaining the C115 receipt can cause a false C115 read. The current five output rows (`docs/engine/ROLLOUT_PLAN.md:25-28,33`) do each name a plausible C115 obligation; I found no current false match among them. Parse an explicit next-read marker or require the row item to contain only the outstanding fire.
3. **P2 — `NEXT COPIES` neither means nor detects “fire read copied.”** `scripts/docLoopStatus.js:319-329` warns on *any* waiting-row ID anywhere in NEXT, without checking `Organic:` or the next fire. On the current index, `--stale-next --staged` warns that `research.32` is “a read owed to a fire,” although its live item starts `Organic:` (`docs/engine/ROLLOUT_PLAN.md:29`) and the NEXT line merely names the row (`SESSION_CONTEXT.md:7`). Conversely, that same NEXT line copies “C115 ... read first: 333 Task 5” without the full `engine.333` token, so the warning misses a literal duplicate of the due read. Scope the warning to dated rows due at the PIN fire and treat shorthand as an unverified case, or make it a general waiting-row notice without claiming it detects copies. `.githooks/pre-commit:75-81` correctly keeps the notice nonblocking; `--gate-handoff` only checks shape and length (`scripts/docLoopStatus.js:481-503`), so it does not catch the copied read.
4. **P2 — the second staged read is outside the existing error boundary.** `scripts/docLoopStatus.js:219-227` catches index errors for `NEXT STALE`, but the new `read()` calls at `:232` repeat both `git show` reads outside that `try` (`:246-250`). If the index read succeeds for stale detection and fails on the second pass, `--stale-next --staged` throws a raw Node error where it previously returned the “not checked” notice. The pre-commit hook absorbs the exit code and prints stderr (`.githooks/pre-commit:75-81`), so commits remain unblocked but the warning is lost. Reuse the first staged texts inside the guarded block. I did not force a concurrent index failure.

## Evidence limits

`node scripts/docLoopStatus.js --due --terminal engine-sheet` listed five C115 rows and an overdue count; `--stale-next --staged` produced the organic-row warning above. Both `node --check` commands and `bash -n` passed. `node scripts/docLoopStatus.test.js` passed its 29 pure assertions, then this sandbox denied its nested `spawnSync node` with `EPERM`; the CLI portion and the brief's 39/39 claim were not independently reproduced. I did not execute the boot hook because it has unrelated PM2 and plugin side effects. No live Cycle, Sheet, deployment, or network read was run.
