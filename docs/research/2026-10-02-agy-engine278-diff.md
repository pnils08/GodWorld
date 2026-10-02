# Read-only Review: Commit 227cd0bd (engine.278)

**(1) pickMintEmployer_ can never return a business whose field differs from the role field, and never a business hasRoom rejects:**
PASS. `open` is created by filtering `pool.byField[field]` exactly by `hasRoom(b.id)`, and the final selection is drawn solely from this filtered array or its `near` subset.
*Evidence: phase05-citizens/processAdvancementIntake.js:1560-1569*

**(2) the order is exactly: GAME clock or no-job role -> blank; self-employed -> SELF_EMPLOYED; no field -> UNTRACKED; unreadable pool -> seeking; hood-first then whole field; no room -> UNTRACKED:**
PASS. The sequential `if` returns exactly match this order.
*Evidence: phase05-citizens/processAdvancementIntake.js:1553-1564*

**(3) a carried BIZ- employer with room still wins and a carried-but-full one falls to the pick; a carried SELF_EMPLOYED/UNTRACKED is kept:**
PASS. The caller checks `mintRoom(carried)`. If full, it correctly falls through the `else if` to the `else` block which calls `pickMintEmployer_`. A carried `SELF_EMPLOYED` or `UNTRACKED` bypasses the pick via the `else if`.
*Evidence: phase05-citizens/processAdvancementIntake.js:934-944*

**(4) a sentinel (SELF_EMPLOYED/UNTRACKED) never increments mintTrackedByBiz or careerSignals.businessDeltas:**
PASS. The `mintSentinel` assignment enters its own `else if` block, completely bypassing the `if (mintedBiz)` block where both `mintTrackedByBiz` and `businessDeltas` are incremented.
*Evidence: phase05-citizens/processAdvancementIntake.js:945-954*

**(5) the Seeking work line is written only when the pick returned seeking:true:**
PASS. Handled correctly in `else if (mintSeeking && lLifeHistory >= 0)` and `mintSeeking` is populated directly from `mPick.seeking`.
*Evidence: phase05-citizens/processAdvancementIntake.js:955-957*

**(6) minors (age < 18) still get no employer:**
PASS. The entire assignment logic remains gated by the existing condition `age >= 18`.
*Evidence: phase05-citizens/processAdvancementIntake.js:914*

**(7) no remaining reference anywhere in phase*/ or utilities/ to classifyMintSector_, mintBizPool.pools, or mintTagMap:**
PASS. Searched using `grep -rnE "classifyMintSector_|mintBizPool\.pools|mintTagMap" phase* utilities/` and found 0 results.

**(8) every other caller or reader of buildMintBizPool_ return shape still works:**
PASS. `buildMintBizPool_` is file-scoped to `processAdvancementIntake.js`. Its only caller outside of tests is `processAdvancementRows_` (line 916), which safely reads the new `.statedById` via `mintRoom` and `.byField` via `pickMintEmployer_`. The tests in `scripts/mintEmployerPick.test.js` were updated to the new shape.

**(9) MINT_SELF_EMPLOYED_PATTERNS, MINT_SELF_EMPLOYED_KEYWORDS and MINT_NO_EMPLOYMENT_ROLE match data/employer_mapping.json and scripts/linkCitizensToEmployers.js exactly, including match semantics:**
PASS. The lists match `employer_mapping.json` rules exactly. The match semantics (unflagged RegExp for patterns via `new RegExp()`, case-sensitive substrings via `indexOf()` for keywords, and the `/.../i` regex for `MINT_NO_EMPLOYMENT_ROLE`) perfectly mirror `scripts/linkCitizensToEmployers.js`.
*Evidence: phase05-citizens/processAdvancementIntake.js:1495-1506*

**(10) pickMintEmployer_ uses no Math.random and no ctx.rng and is deterministic for a given seed:**
PASS. It builds a bitwise hash over the citizen's seed string and uses modulo to pick from the array, without any rng.
*Evidence: phase05-citizens/processAdvancementIntake.js:1565-1569*

**(11) name any assert in scripts/mintEmployerPick.test.js or section 9 of scripts/householdIntake.test.js that would still pass if the behaviour it names were broken:**
In `scripts/mintEmployerPick.test.js`:
- `check('4.3 the business already at its stated count takes nobody', ...)` only asserts that `bizId !== 'BIZ-M'`. If the picker were fatally broken and threw everyone into `UNTRACKED` (failing to fall back to the next valid business), this check would still pass.
- `check('2.6 across 1,000 seeds no trade or kitchen role lands outside its field', ...)` uses an `&&` condition (`got.bizId && fieldOfBiz(got.bizId) !== want`). If the picker were broken and returned an empty `bizId` (`UNTRACKED`) for every trade/kitchen role, the condition would short-circuit, `strays` would remain empty, and the check would pass.

**(12) anything else wrong, including a role the new pick places worse than the old one did:**
FAIL. The `MINT_NO_EMPLOYMENT_ROLE` regex ported from the roster script is `/^student$|retired|hall of famer|resident$/i`. The `$` anchor on `resident$` means it matches *any* string ending in "resident". Common roles like "Vice President" or "Bank President" match this regex. Under the old system, a "President" fell through to the `service` bucket and received a tracked job. Under the new pick, they are parsed as having no employment, resulting in a blank employer and no ledger line, which is significantly worse.

HOLD
