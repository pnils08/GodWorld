# TASK — codex: engine.318 recheck 4 — propagation watch, usage prefix, freeze shape, one round

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-25-codex-engine318-diff-gate-recheck4.md`, SHIP / FIX / HOLD per item, file:line evidence, under ~25 lines. Report in one line when done.

Fold: the commit after `b1fda6be` that names "codex recheck 3 folded" (`git log --oneline -3`). Your HOLD: `docs/for-claude-review/2026-10-25-codex-engine318-diff-gate-recheck3.md` §2–§4. Plan §engine.318, the "Codex recheck 3 … folded" paragraph.

1. **§4 propagation** (`output/engine-sheet/2026-10-25-push-e318-prod.sh`, the watch): a fourth read 16 minutes after the pull-back (2 × DEPLOY.md's ~5 min observed window + the 6-min wall). Your sequence: stage-27 Cycle admitted at cut+4:50, row parsed after the last read, double land. With the last read at ≥ cut+16, does any old-version call admitted inside the window still reach Phase 11 after it with every read clean? If the window bound itself is your objection, say what bound would satisfy you.
2. **§2 usage prefix:** the first read's rows must stay identical cell for cell (hash of the same prefix), total never lower, media-room count unchanged. Closes the cleaner rewrite at a zero baseline?
3. **§3 freeze shape** (`output/engine-sheet/2026-10-25-e318-status-step.js`, before the mode branch): tab length = rows, every row at the width, every manifest row inside the tab and equal to its frozen row — before apply or verify.
4. **Proof:** gate test 19/19 (`…-e318-gate-test.log`), live dry run (`…-e318-prod-dryrun2.log`).

FIRE_ADMISSION_JSON / engine.317 stays the builder's named exception — say so, don't re-derive it. Say whether anything else stands between `5ed4ceba` and a PROD push on the builder's go (`live apply --expect 105` → `live verify` PASS → the push).

Done = the md exists.
