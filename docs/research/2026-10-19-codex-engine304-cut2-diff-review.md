---
title: Codex engine.304 cut 2 diff review
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [engine, citizens, review]
sources:
  - docs/for-claude-review/2026-10-19-engine304-cut2-diff-review-TASK.md
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md
  - docs/research/2026-10-19-codex-engine304-plan-review.md
  - commit 83ceccd7
pointers:
  - "[[plans/2026-10-08-engine-286-game-of-life-events]]"
---

# engine.304 cut 2 — diff review

Source review of `83ceccd7` against D1–D6 and the folded plan review; changed implementation files are unchanged at HEAD. Local tests only: `engine304FamilyLottery` 35/35, `householdIntake` 59/59, `ownerDoor` 35/35. No Cycle, model, Sheet, bench, canon or live run. **Final gate: HOLD cut 2 before bench/header deployment until the fit validation, partial link writes and pre-mint exact-row gate below are fixed and tested.**

## 1. Draw — FIX

- **SHIP:** `familySpotsOpen_` nets spouse 1, child NumChildren minus ledger and linked kids, and parent 2 minus ledger and linked parents; `forDraw` admits a new parent only while the anchor is minor, while `selfRow` preserves an existing link (`phase05-citizens/processAdvancementIntake.js:1871-1894`). Eligible active rows are walked in ledger order; `D=.01×E`, `p=min(1,Dw/Σw)` with tier 10/5/2/1 and heritage multiplier, one seeded draw each, then Fisher–Yates order (`:1947-1982`; `utilities/safeRand.js:28-40`). Thus `Σp≤D`, equal without saturation. Type and fit draws use the same rng; same seed/state replay is tested (`scripts/engine304FamilyLottery.test.js:292-323`), historical output parity is not claimed.
- **SHIP:** Active, named GC rows alone enter the fit pool; threshold ≥3 and `ctx.civicGcTaken[g]` are excluded (`processAdvancementIntake.js:1999-2006`). Civic marks the same zero-based data-row index (`phase05-citizens/updateCivicApprovalRatings.js:1669-1673,1713-1717`). Fit uses BirthYear before Age, 18+ for spouse/parent, opposite recorded sex, age bands, and same/near hood (`processAdvancementIntake.js:1985-1997,2025-2053`). The taken set includes ledger names, every GC First+Last and First+MaidenName, pending Advancement names and each new surname (`:2007-2022,2075`). One chosen GC row gets six direct fields mirrored in `gData` and the per-anchor link list (`:2062-2092`); no mint is queued.
- **FIX:** `gcAge` accepts nonnumeric, nonblank Age as `{by:NaN,age:NaN}`; all band and `<18` comparisons then fail to reject it (`processAdvancementIntake.js:1985-1992,2044-2047`). A malformed-age GC row can pass as a spouse or parent, then queue with no BirthYear and mint at the intake fallback age (`:1785-1786,807-811`). Require finite, credible age/BirthYear before fitting. Also, an anchor with blank/unknown Gender sets `wantSex=''`, which bypasses the spouse opposite-sex check (`:2030-2039,2048`); fail closed when an opposite sex cannot be determined. Neither case is in `scripts/engine304FamilyLottery.test.js:326-376`.

## 2. Release — FIX for write integrity

- **SHIP:** Release rechecks active anchor and remaining role count, removes excess links one at a time, restores the own surname and clears Family fields without resetting EmergenceCount or hood (`processAdvancementIntake.js:1899-1906,1940-1946`). The oversubscribed-kids test verifies one of two links survives a one-child opening (`scripts/engine304FamilyLottery.test.js:375-387`). A released row is in the later Active pool if below the usage threshold; threshold-3 rows wait for next Cycle (`processAdvancementIntake.js:1999-2005`).
- **FIX:** Link writes `Status='Family'` *first*, then Last, MaidenName, FamilyOf, FamilyRole and Neighborhood through separate `setValue` calls (`processAdvancementIntake.js:2065-2074`); release likewise writes Status first (`:1900-1906`). If a later cell write throws, the Phase5-Advancement wrapper catches it (`phase01-config/godWorldEngine2.js:159-169,668`), but preceding direct Sheet cells remain. A Family row with no FamilyOf/Role is ignored by `gcFamilyLinks_` and cannot be released below EmergenceCount 3 (`processAdvancementIntake.js:1858-1868,1759-1778`). Make link/release failure recoverable with a row receipt or a safe write order plus rollback/reconciliation; test an injected intermediate write failure. The manifest explicitly records these as per-cell direct writes (`docs/engine/SHEETS_MANIFEST.md:178`).
- **FIX to D4 fidelity:** The link never writes the required `EmergenceContext = Family: <role> of <name> (<POPID>), C<N>` (`docs/plans/2026-10-08-engine-286-game-of-life-events.md:493`; `processAdvancementIntake.js:1919-1930,2062-2092`). The structural Family fields land, but the requested causal context does not.

## 3. Emergence door — SHIP with manual-path limit

- Family rows are admitted at count 3, checked against an active anchor, open spot and ledger name, released immediately when closed, or queued with FamilyOf/Role/MaidenName and the anchor's current hood (`processAdvancementIntake.js:1755-1812`). The Match* header self-arm precedes its header snapshot and the cap remains two, top-down (`:1739-1758`). The sole production caller passes `ctx` (`:157`); GAME/CIVIC anchors use the same shared ledger without ClockMode filtering (`:1727-1737,1769-1775`). The owner receives `2−emergence.queued` slots (`:168-174`).
- **HOLD operational gate:** `gcFamilyLinks_` throws for missing M–O when the GC sheet has data (`:1717-1728,1850-1858`), inside Phase5-Advancement for a Cycle (`phase01-config/godWorldEngine2.js:668`); the manual `runAdvancementIntakeManual` also calls it, outside `safePhaseCall_` (`processAdvancementIntake.js:200-230`). Dry run uses the wrapped phase but does not create M–O. The planned bench header-before-code/readback and later authorized live header-before-push are mandatory. No Sheet header/readback was performed here.

## 4. Mint and exact GC identity — FIX

- **SHIP:** D6b rechecks the current in-memory ledger before `nextPopIdLocked_`; a closed spot pushes the queue row to `rowsToClear` and `continue`s without minting, leaving GC Family for next-pass release (`processAdvancementIntake.js:801-828`). The parent/co-parent then spouse closure case is exercised (`scripts/engine304FamilyLottery.test.js:416-435`). `wireFamilyMatch_` is unchanged and reads the current target's children, household and hood at arrival (`processAdvancementIntake.js:2606-2690`).
- **FIX:** The pre-mint recheck does not require `famSelf` to identify **exactly one** Family row (`processAdvancementIntake.js:806-821`). If no row matches while the anchor still has a spot, it can mint; if several match, it chooses the last. The later exact flip logs zero/multiple hits and returns without changing GC (`:1043-1051,2786-2812`), but its caller ignores that result and still wires the new ledger row (`:1045-1051`). Move exact-row validation before POPID allocation/ledger push, and do not wire on failed identity; preserve the queue for repair or a defined retry. Current `end to end` test has a decoy with a *different* FamilyOf, not a zero/multiple-hit case (`scripts/engine304FamilyLottery.test.js:405-415`).
- **SHIP with limitation:** On a unique hit, the flip requires Status Family + FamilyOf + First + Last and changes only that row (`processAdvancementIntake.js:2795-2813`). A link held for Cycles keeps its parent spot after the child turns 18 and uses the current in-memory target (`:1881-1887,2606-2690`); no live delayed-arrival readback exists.

## 5. Throw scope — HOLD until header gate

- `gcFamilyLinks_` runs in the family draw (`processAdvancementIntake.js:1924-1929`), the emergence door when `ctx.ledger` exists (`:1727-1728`), and the D6b mint recheck (`:805-806`). All are under Phase5-Advancement in a Cycle, so missing headers skip that entire phase after its earlier media-usage work; the manual entry can throw to its caller (`:200-230`). A dry run/replay also enters the wrapped phase without self-arming M–O (`phase01-config/godWorldEngine2.js:2083-2119,2188-2229,2385`). This is an intentional header-first dependency, not evidence of a safe partial Cycle.

## 6. Readers — SHIP

- `processMediaUsage_` now indexes Active and Family for name usage (`processAdvancementIntake.js:405-414`); GC event surfacing admits Family but keeps the under-13 and teen text gates (`phase05-citizens/generateCitizensEvents.js:2324-2354,2999-3016`). Intake name tick and `mediaRoomIntake` already see all statuses by design (folded plan `docs/plans/2026-10-08-engine-286-game-of-life-events.md:513`). Wave, courtship, civic challenger and feeder remain Active-only (`phase05-citizens/checkForPromotions.js:315-321,656-659`; `bondEngine.js:2681-2688`; `updateCivicApprovalRatings.js:1671-1673`; `generateGenericCitizens.js:372-384`).

## 7. Tests — FIX

- C1–C5 exercise spot counts, seeded draw distribution, a replay pair, main fit exclusions, one release, queue/mint/wire, and same-batch closure (`scripts/engine304FamilyLottery.test.js:267-435`). `householdIntake` adds the required M–O fixture header; `ownerDoor` updates only the cap/order assertion, both legitimate (`scripts/householdIntake.test.js:74`; `scripts/ownerDoor.test.js:240`). All three focused suites passed locally.
- Missing: nonnumeric Age and unknown anchor sex, write failure after a partial Family link, zero/multiple exact GC hits before mint, release and redraw in the same pass, and a delayed arrival after a household/hood change. Reader admission is checked by source regex alone (`scripts/engine304FamilyLottery.test.js:436-439`). The suite cannot prove Sheet readback, concurrent writes, or the 20-Cycle link/arrival distribution.

## 8. Scope — SHIP with noted drift

- The commit touches the authorized cut-2 family door/arrival, GC surfacing, schema/manifest and focused fixtures; it does not edit divorce, widowhood, R15 courtship, the GC Age column, wake/page code, or production state (`git show --stat 83ceccd7`; plan D1–D6 at `docs/plans/2026-10-08-engine-286-game-of-life-events.md:489-495`). D10's preexisting `isFamilyUsage_` hooks were not changed by this commit (`phase05-citizens/processAdvancementIntake.js:47-52`). D4's required EmergenceContext is the substantive omitted scope item above.
