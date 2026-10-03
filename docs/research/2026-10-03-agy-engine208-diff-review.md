---
title: engine.208 diff read-only review
created: 2026-10-03
author: antigravity
---

# engine.208 diff read-only review

Verdict: **SHIP-WITH-FIXES**

## Hunts

1. **Trick code (gates/thresholds)**
   - No trick code found. The Oaks' running expectation threshold `(wk.n >= SPORTS_EXPECT_MIN_WEEKS_)` will not fire a `LOSS` at C110 because `wk.n` is 2, but this is the exact correct behavior specified by ruling v (an Oaks loss is only `LOSING_WEEK` until they accrue 4 weeks of their own record). The test `typeof sportsStaffTeams_ === 'function'` safely accommodates Node.js test environments without breaking the global Apps Script scope.

2. **Test assertions changed**
   - **`citizenDials.test.js A1`**: Asserts 9 dials initialize to midpoint 50 instead of 8. Still protects initialization integrity.
   - **`undockedEclPool.test.js`**: Changed to assert `Undocked-Audience` routes to `{ fandom: 1 }` exclusively instead of a plain day. Still protects `engine.272`'s integrity/sociability cut by ensuring no other dials move.
   - **`integrityWear.test.js 3.5`**: Changed from `ctx.ledger.rows[10][iDS] === ''` to `!k.wear && k.base.integrity === 50 && k.base.fandom === 50`. Still protects the row from receiving wear, correctly accommodating the new C8 fold which seeds a blank `DialState` with household fandom.
   - **`hospitalIncomePersistence.test.js`**: Strips the `DialState` column before doing a deep-equal comparison of the row against its prior state. Still protects the core assertion that synthetic events remain compression-ineligible, while allowing the C8 fold to write the initial fandom seed.

3. **Silent fallbacks, Math.random, ES5-incompatible syntax**
   - No `Math.random` found in engine files (uses `safeRand_(ctx)()`).
   - No `const`, `let`, `=>`, or `...` syntax found in `phase*/` or `utilities/` (all ES6 usage is correctly confined to `scripts/*.test.js`).
   - No dangerous silent fallbacks introduced. 

4. **Direct sheet writes**
   - `phase05-citizens/applyGameNightMoments.js` writes to `LifeHistory_Log` directly via `setValues(logRows)`. This write **is listed** in `docs/engine/SHEETS_MANIFEST.md` section 9 (`own-tab | batch append`).

5. **DialState writers dropping base.fandom or fan**
   - **FIX NEEDED**: `phase05-citizens/updateCivicApprovalRatings.js` was omitted from the diff. Its `challengerDialStateJson_()` function writes a hardcoded 8-dial `DialState` when minting a civic challenger, which will omit the 9th dial (`fandom`).

6. **Contradictions of the cut**
   - **FIX NEEDED**: As noted in Hunt 5, the missing update to `updateCivicApprovalRatings.js:1367` explicitly contradicts the cut's Revision 1 requirement: "The civic challenger mint (`updateCivicApprovalRatings.js:1367`) writes a ninth dial by the same household rule."
   - **ACCEPTABLE DEVIATION**: The M1 parser regex in `phase05-citizens/applyGameNightMoments.js` uses `raw.replace(/\([^(),|;.]*\)/g, ',')` instead of Codex's proposed `''`. This contradicts the verbatim "codex hunt 1 expression", but it is a necessary and smart builder correction: Codex's regex would have failed to split properly on space-separated names like `(SP/RP)`.
