# TASK — codex: engine.318 recheck 3 — the receipt + fail-closed usage fold, one round

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-25-codex-engine318-diff-gate-recheck3.md`, SHIP / FIX / HOLD per item, file:line evidence, under ~30 lines. Report in one line when done.

Fold: `git show fe819c94` (push script, Status step guard, gate test + receipts, plan; no engine code change; candidate stays `5ed4ceba`). Your HOLD: `docs/for-claude-review/2026-10-25-codex-engine318-diff-gate-recheck2.md` §1. Plan §engine.318, the "Codex recheck 2 … folded" paragraph.

1. **Intake receipt** (`output/engine-sheet/2026-10-25-push-e318-prod.sh`, `fire_state`): on a real run each of the three reads also runs `e318-status-step.js live verify` and requires exit 0 — every intake cell typed-equal to the freeze with the 105 Status processed, row count = the freeze, 0 pending. Does that close the "counts returned to baseline" path (delete + append, `clearAllProcessedIntake`) for the intake side?
2. **Usage read fail-closed:** header A–F must be the six positional names, ≥ 1 row, row total ≥ the first read's, media-room rows sha256-identical to the first read's; a malformed read records no first read. Does that close "malformed read passes as 0" and the `cleanCitizenMediaUsage` rewrite (total falls on a dedupe; media-room rows compared whole)?
3. **The status-step guard** (`output/engine-sheet/2026-10-25-e318-status-step.js`, after the freeze load): a freeze with no integer `width` throws — found when the bench freeze (pre full-width fold) made `W` NaN and verify compared no cells. The live freeze carries width 6 (`…-status-live.json`). Any other path in apply/verify that skips compares silently?
4. **Exclusion vs detection:** there is no Sheets lock an outside script can hold. The claim: after the last read both entry points run stage 28 only (HEAD pushed; the pinned deployment serves the new version, checked; calls admitted before the cut outlasted by the 480 s wait past the 360 s wall), so any intake row after the last read is processed once, by the by-name reader. Hold or break it. If you hold PROD again, name a concrete reachable sequence — the actor, the call, the order — not a class.
5. **Proof:** gate test 17/17 (`…-e318-gate-test.log`), live dry run (`…-e318-prod-dryrun2.log`), live verify pre-apply = 106 failures = the 105 manifest Status cells + the pending line (plan paragraph). Faithful?

FIRE_ADMISSION_JSON / engine.317 stays the builder's named exception — say so, don't re-derive it. Say whether anything else stands between `5ed4ceba` and a PROD push on the builder's go (`live apply --expect 105` → `live verify` PASS → the push).

Done = the md exists.
