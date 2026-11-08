# Codex re-review brief — engine.338 Task 2a fold, deploy candidate `1869536c4` (research-build, 2026-11-07)

One re-review of the fold (round cap: this is the last). Read-only. Write to
`docs/for-claude-review/2026-11-07-codex-engine338a-diff-rereview.md`, under 60 lines, SHIP / HOLD at the end.

Your HOLD on `673e8be44`: `docs/for-claude-review/2026-11-07-codex-engine338a-diff-review.md`. The fold:
`git show 1869536c4 -- phase05-citizens/applyGameNightMoments.js scripts/gameNightMoments.test.js docs/SPREADSHEET.md`

- F1 (blocks) — `sportsRetire_` now runs the column check and `postCareerIncome_` (the World_Config read, which throws on a
  missing key) BEFORE the first cell moves; a refusal leaves the row on the GAME clock with the player's key, role and Income.
  Test: the missing-key fixture asserts the row untouched (clock, key, role, Income, 0 Retirement lines).
- F2 (should-fix) — dry-run / replay bypass the open's self-arm: with F1 fixed, a missing key there throws cleanly inside
  `safePhaseCall_` and moves nothing; no in-memory seeding added (the production entry self-arms; the bench proved it:
  World_Config 249 → 251 rows at the C115 open on a live sync that carried neither key). Recorded, not changed — say if that
  is wrong.
- F3 (should-fix) — a ledger missing `Tier` or `Income` refuses the retirement before the row moves (throws); test added.
- F4 (should-fix) — both keys documented in `docs/SPREADSHEET.md` §`World_Config` post-career income (engine.338).
- F5 (note) — tests: re-fire Income stays 250000; refusal leaves the row untouched; missing column refused. Typed config
  readback is the bench's readback (`output/engine-sheet/2026-11-07-e338a-reads.jsonl`: both keys read back `250000` /
  `120000` after the open seeded them).

Bench 1 on `673e8be44` (SANDBOX 1004 @192 = stage 42, log `output/engine-sheet/2026-11-07-e338a-bench.log`): C115 + C116
PASS, 0 Engine_Errors; Vinnie (live row) + a Tier 1 clone → 250,000, Tier 2 → 120,000, Tier 3 untouched; re-fire changed
nothing. Bench 2 on `1869536c4` is running now (`…-e338a-bench-2.log`).

Check: (1) the reorder — is anything that previously ran before the throw still able to move the row (the NAMED loop's
first `write` at `:474` lands the type line before `sportsTriggerWord_` — that line is the feed row's own receipt and
stands on a refused retirement; is that right, or should the retirement branch run first?); (2) the thrown error's text
reaches Engine_Errors with the citizen's name? (`safePhaseCall_` logs the message only — the row is identifiable from the
feed row's NamesUsed); (3) anything else the fold broke.
