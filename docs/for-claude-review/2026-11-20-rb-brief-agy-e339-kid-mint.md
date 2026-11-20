# Brief for agy — adversarial diff review: engine.339, a lottery child is a fresh mint; births top at 40

**From:** research-build · **Date:** 2026-11-20 · **Your output:** `output/antigravity/2026-11-20-review-e339-kid-mint.md` · read-only on code.

## What changed (read the code, not this summary)

- Commit `1d74b2e49` — `phase05-citizens/processAdvancementIntake.js` (`mintFamilyGcRow_` new; `checkFamilyMatchPromotions_` D5 release + D3 branch; `wireFamilyMatch_`, `wireFamilyToDeceased_` age floor; `DRIP_PARENT_AGE_MIN/MAX` 18/45 → 21/40), `phase04-events/generationalEventsEngine.js` (`AGE_RANGES.BIRTH` max 42 → 40; spouse-on-ledger window check before `checkBirth_`), `phase05-citizens/generateGenericCitizens.js` (occupations hoisted to file-scope `GC_OCCUPATIONS`), tests `scripts/engine304FamilyLottery.test.js`, `scripts/engine339Births.test.js`.
- Shipping with it (never reached PROD before): `cdf7ed12a`'s intake hunk (arrivals no longer take the profile's marriage / child dice) and `6ead67356`'s `utilities/citizenDerivation.js` (the dice deleted). The candidate tree = PROD stage 61 + these four files: `output/research-build/2026-11-20-e339/push.sh`, manifest `e339.sha256`.

## The builder's rules it implements (verbatim, 2026-11-20; plan `docs/plans/2026-11-08-how-kids-are-minted.md` §Builder's words 2026-11-20)

"no person on GC would change other than a spouse" · "A child is a fresh mint , gc is tier 5 in waiting" · "its minted as their kid to lottery in inverted , once the lottery hits , their child mints to GC" · "no one over 40 would have a newborn , no one under 21 can have a kid , no kid can be with 21 years of age if their parent".

## Attack these

1. `mintFamilyGcRow_` + the D3 branch: a mint that writes a row the rest of the pass or a later pass misreads (links.byAnchor index of the appended row, `gData` growth vs the sheet's last row, the emergence door reading a Family row with a blank MaidenName, `markAsEmergedInGeneric_`'s two-key lookup). Name collisions. rng consumption order and replay.
2. The D5 release by MaidenName: any legitimate child/parent row that carries a MaidenName and would be wrongly released; idempotence; the spot reopening the same fire.
3. The age floor at `wireFamilyMatch_` / `wireFamilyToDeceased_`: a refused link that leaves a half-written row, the household door (`formIntakeHouseholds_`) counting a refused member, the co-parent marriage branch.
4. The birth spouse check: a spouse cell in "POPID Name" form, a spouse not Active, the single-mother path, the cap.
5. Shipping the 11-08 intake-die deletion: any PROD caller of `profile.MaritalStatus` / `profile.NumChildren` / `deriveNumChildren_` left behind.
6. Tests: an assert weakened or rewritten to pass rather than to check (the C2 draw-rate log regex was widened; the C4/C9 kids lost their MaidenName — judge whether that keeps the intent).

Each finding: file:line, the failure scenario, severity. Verify every claim against the code before you write it.
