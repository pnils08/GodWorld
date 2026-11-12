# Brief to codex-rb — engine.339 diff review: delete the marital-status / child-count dice

Date: 2026-11-08. From: research-build. Review the exact deploy candidate, commits `cdf7ed12a` and `6ead67356` (also `c60e6aa91`, a script deletion). Read-only: no code edits, no sheet writes, no commits.

## What changed

- `phase05-citizens/processAdvancementIntake.js` (~1173): a non-household arrival no longer takes `profile.MaritalStatus` / `profile.NumChildren`; it writes `age < 18 ? 'youth' : 'single'` and `0` (the household-arrival rule from engine.109/engine.302, now for every arrival).
- `utilities/citizenDerivation.js` and `lib/citizenDerivation.js`: `deriveMaritalStatus_/deriveNumChildren_` (and the Node twins) are deleted, and the profile no longer carries `MaritalStatus` / `NumChildren`.
- `scripts/ingestFemaleCitizensBalance.js`, `scripts/validateIntakeDerivation.js`, `lib/citizenDerivation.test.js`, `scripts/engine302Marital.test.js` updated for the removal.
- `scripts/backfillLifecycleDefaults.js` (the April one-time backfill, `--apply` wrote to the live sheet) deleted (`c60e6aa91`).
- `docs/SIMULATION_LEDGER.md` writer cells for MaritalStatus / NumChildren trued up.

Why: the builder ruled (2026-11-08) that no arrival takes the dice for marriage or children; family comes from the lottery (engine.304) and the citizen's own words. Plan: `docs/plans/2026-11-08-how-kids-are-minted.md`.

## Ask

Verdict SHIP / SHIP-WITH-FIXES / HOLD, `file:line`-grounded. Check specifically:

1. Any remaining reader of `profile.MaritalStatus` / `profile.NumChildren` or of the deleted functions, in `phase*/`, `utilities/`, `lib/`, `scripts/`, Apps Script load order (`scripts/seedBusinessOwners.js` concatenates `utilities/citizenDerivation.js`) and any other loader that names the removed functions.
2. Whether arrivals that used to arrive married with children (non-household doors: `processAdvancementIntake_`, GC promotion `checkForPromotions`, the generational/wave mints) now leave the family-lottery open-spot counts (`familySpotsOpen_`, ~2208–2229) consistent: a single arrival with 0 children opens no child or spouse spot.
3. Whether any code assumes `NumChildren` or `MaritalStatus` is non-blank on a fresh arrival.
4. Whether `docs/engine/ENGINE_STUB_MAP.md` / `SIMULATION_LEDGER_COL_MAP.json` still name the deleted functions (regeneration is owed; say what is stale).
5. Anything that weakens a test assertion instead of removing a dead one.

Reply file: `docs/for-claude-review/2026-11-08-codex-engine339-diff-review.md`. Mark read versus inferred.
