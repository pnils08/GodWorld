# agy brief — engine.356 bond numbers on World_Config, child lines, rival fade: adversarial diff read (engine-sheet, 2026-11-24)

**Read-only. Write only `output/antigravity/2026-11-24-review-e356-bond-dials-children.md`.**

Two commits on PROD stage 84 (`82da34162`): `e788cafe7` (the config move, alone) and the one after it (child gate, rival fade, rival step seed). `git diff 82da34162 HEAD -- phase05-citizens phase01-config`. Plan: `docs/plans/2026-11-21-a-moment-has-a-place.md`, last changelog entries (the builder's three sentences verbatim). Not benched, suites not run (test lock). Bench: `output/engine-sheet/2026-11-24-e356q/`.

What changed:
- `bondEngine.js` — nine named constants and eight inline literals of the weekly bond update are gone; `loadBondDials_(ctx)` at the top of `runBondEngine_` reads 17 World_Config keys (`BOND_DIAL_KEYS_`) and throws on a missing / blank / non-numeric one; every use is `bondDial_('<key>')`. Intended: no behaviour change (seeds = the old values). Second commit: a rival / tension / sports-rival bond with a moment still fades in a week the two did not both live (`momentHolds`).
- `engine94SheetContract.js` — 17 seeds on `ENGINE356_CONFIG_SEEDS`; `bondMomentStepRival` seed 0.25 → 0.1.
- `generateCitizensEvents.js` — `childLine_(tags)`; `loadWithIdx_().minor`; `withCandidates_` drops a minor unless the line is a child line; `bondLineFor_` skips non-child lines when the called person is a minor; `mirrorShared_` lets the twin onto a minor's record for a child line only.

Attack:
1. The move is a no-op? Each replaced site against the old value (git diff): a wrong key at a site, a literal I missed in `updateExistingBonds_` / `processRomanceAndMarriage_` / the GC paths that was one of the nine constants under another spelling, a use inside a comment-stripped line my rewrite mangled, `ROMANCE_THRESHOLD - 1` precedence.
2. A path that reaches `bondDial_` without `runBondEngine_` having run this execution (another phase calling a bondEngine function; the checkpoint-resume entry at `godWorldEngine2.js:2486`; `v3Integration.js`), and a path where `BOND_DIALS_` is stale from an earlier execution.
3. The seeds: `inspectEngine94Config_` on the 17 rows (range, a 0 seed, duplicate key with an older list), the first fire after deploy (seeded before `loadConfig_`?), `loadConfig_` parseFloat on a cell like "1,5" or "5.5 " — what `loadBondDials_` then sees.
4. The child gate: a path that still names a minor on a non-child line (the template branch at the `pickWith_` call, a forced `bondCall`, the offer guard saying yes with one tags array and the pick using another), a child line that can name nobody and writes an empty name, `prog:youth` prefix catching a type it should not, a minor with a blank BirthYear.
5. `mirrorShared_` for a minor on a child line: the life-state gate (`isEventEligible_`) after it — does it then block every such twin (dead path) or pass lines it should not; tags that travel to a child's record.
6. Rival fade: `momentHolds` when `hadMoment` is true and the pair is both active; the step still applied before the fade; a rival bond now both stepped and faded — the net and the dormant / tension-settles thresholds the same pass.
7. `output/engine-sheet/2026-11-24-e356q/read.js` and `compare.js`: a check that cannot fail; the identical-week comparison when BondIds repeat or rows reorder.
8. Any silent fallback or weakened check.

Each finding: file:line, the input, what breaks. Verdict: SHIP / SHIP-WITH-FIXES / HOLD.
