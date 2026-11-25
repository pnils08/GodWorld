# agy brief — engine.356 bond-called moments, adversarial diff read (engine-sheet, 2026-11-24)

**Read-only. Write only `output/antigravity/2026-11-24-review-e356-bond-moments.md`.**

Commit `bf324305b` (`git show bf324305b -- phase05-citizens phase01-config`). It sits on the A3 commits you read (`847e86971`, fold `f98837a7e`). Plan: `docs/plans/2026-11-21-a-moment-has-a-place.md` → "Bond-called moments — built" and "Bond-called moments — wiring read". Not benched (test lock). Bench: `output/engine-sheet/2026-11-24-e356p/`.

What changed:
- `generateCitizensEvents.js` — `bondCallsFor_` (each active bond rolls once a Cycle at Intensity / 10 × `bondMomentChanceScale`; cap `bondMomentMaxPerWeek` a person, both sides counted; a pair rolls once); the emit loop runs `eventCount + bondCalls.length` times and a bond iteration draws its line with `bondLineFor_` and forces the person; `withTags_` sizes the dial tag (`:M`) and adds `bond:called`; `mirrorShared_` writes a `shared:both` line on the other person's row; `S.sharedMoments` is pushed for every line that named its person.
- `bondEngine.js` — `bondMomentKey_`; `updateExistingBonds_` reads `S.sharedMoments`: one step per bond with a moment, by kind (`bondMomentStep*`), and no fade that week.
- `engine94SheetContract.js` — seven seeds on `ENGINE356_CONFIG_SEEDS`.

Attack:
1. The emit loop: the old `break` on an empty pool is now `{ ev = eventCount - 1; continue; }` — an infinite loop, a skipped ordinary line, a bond iteration that runs the grief / template / ev===0 branches (pulse, FAME_WATCH), or a `continue` inside the body that now skips something it did not before. Every use of `ev` and `eventCount` after the change.
2. `bondCallsFor_`: the cap (a person over 3, counting both sides and both orders of writing); a pair rolled twice (two bonds of different types between one pair; key case); a call spent on a person who is not written this Cycle; non-participating citizens — whose bonds never roll, and is that a skew; rng draws added and whether any is `Math.random`.
3. `bondLineFor_` draws from `pool` after the gates and pool replacements above it (GAME mode, the undocked show pool, the life-state gate): a line reaching a citizen its Conditions forbid; a `$CONTACT` line with other entity slots (`$VENUE`, `$PROGRAM`, `$CONGREGATION`, `$PILOT`) composed without what it needs; per-row draw cap (40) and `eclTelemetry` still right.
4. `mirrorShared_`: the other person's row — dead / traded checked where; the text swap when one name contains the other, or the first person's name is absent; tags that should not travel and do (dial tags are meant to; `grain:`, `tier:`, `source:occupation` on a person with no job); the mirror writing `row[iLife]` of a row the main loop later rewrites or has already written (`rows[r] = row`); `activeSetObj`, `S.citizenEvents`, `count`, `S.eventsGenerated` consistency; a mirror onto a GAME-clock player or a child.
5. `bondEngine.js`: `hadMoment` when `momentStep` is null; the step applied before the type branches — does it change a threshold check that same pass (tension → rivalry at 6, deepen at 6, romantic → marriage at 8 the same Cycle, dormant → active); `priorIntensity` and `intensityDelta` after my reorder; the no-fade rule letting a dormant bond never fade; a moment keyed to a bond type that changed earlier this Cycle.
6. Config: `inspectEngine94Config_` on the seven rows (ranges, the integer flags, a duplicate key); the off-when-missing path in the writer and the log-and-skip path in bondEngine — is either a silent fallback that could hide a real fire with no keys; the first fire after deploy (are the rows seeded before `ctx.config` is read).
7. Readers of the new tags and field: `bond:called`, `shared:both`, a `-M` lead tag where `-S` was assumed, `S.sharedMoments` (the ctx-field hook, `buildCycleChecksum_`, any serializer of `ctx.summary`).
8. `read.js` and `apply-bench.js`: a check that cannot fail; the twin check on a mirrored row; the bond change measured against `bonds-before.json` when BondIds are not unique.
9. Any silent fallback or weakened check.

Each finding: file:line, the input, what breaks. Verdict: SHIP / SHIP-WITH-FIXES / HOLD.
