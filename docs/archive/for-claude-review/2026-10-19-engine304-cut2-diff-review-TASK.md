# TASK — codex: diff review of engine.304 cut 2 (the lottery, the link, the arrival)

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine304-cut2-diff-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~110 lines. Report in one line when done.

`git show 83ceccd7` against the plan `docs/plans/2026-10-08-engine-286-game-of-life-events.md` §engine.304 design pass D1–D6 + the folded review block, and your plan review `docs/research/2026-10-19-codex-engine304-plan-review.md`.

1. **The draw** (`checkFamilyMatchPromotions_`): spots net of links (`familySpotsOpen_`, forDraw vs keep); p and Σp; rng order and replay; the shuffle; type pick; the fit (BirthYear-first age, adult rule, sex, band, `bondProximity_` near, the EmergenceCount ≥ 3 and `civicGcTaken` exclusions — is `civicGcTaken` keyed by the same row index this read uses?), the name-taken set (ledger, GC First+Last and First+MaidenName, the queue), the writes and their in-memory mirror.
2. **Release**: per role, in-loop link bookkeeping, a released row's name and columns; a release and a draw in the same pass; anything that closes a spot the test misses.
3. **Emergence door**: Family rows admitted, validated, released or queued with the link; the header self-arm order; the cap; the new `ctx` argument (every caller?); a Family row whose anchor is a GAME or CIVIC citizen.
4. **Mint**: the D6b re-check (placement before `nextPopIdLocked_`, `famSelf` identification, `continue` + `rowsToClear` semantics), the exact flip in `markAsEmergedInGeneric_`, `wireFamilyMatch_` unchanged — anything it writes wrong for a link made Cycles earlier?
5. **Throw scope**: `gcFamilyLinks_` throws without M–O. It runs in the family door, the emergence door (when `ctx` is passed) and the mint re-check — confirm every path inside Phase5-Advancement; anything outside (manual run, dry run) that now throws where it did not.
6. **Readers**: `processMediaUsage_` index and surfacing admit Family — any other reader that should, or should not (the intake name tick, `mediaRoomIntake` routing, the wave, courtship, floors)?
7. **Tests**: `scripts/engine304FamilyLottery.test.js` C1–C5 — do they catch a regression in each of the above? The two test-fixture edits (`householdIntake`, `ownerDoor`) — legitimate?
8. **Scope**: anything past R16/R17, anything on the do-not-touch list touched.

Done = the md exists.
