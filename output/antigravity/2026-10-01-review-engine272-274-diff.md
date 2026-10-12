### engine.272 & engine.274 Diff Review

**Finding 1**
- **Severity:** Medium
- **File:Line:** `scripts/undockedEclPool.test.js:897-903`
- **Evidence:** The test uses `fs.readFileSync` to read `generateCitizensEvents.js` and employs a regular expression (`/if \(has\("source:undocked"\)\) return ([^;]+);/`) to extract the routing logic. It then evaluates the extracted code string using `new Function()`. This is a brittle, source-text-only assertion that doesn't test the actual runtime behavior of the module and will break upon minor formatting or refactoring changes.
- **Proposed Fix:** Export the routing logic from `generateCitizensEvents.js` (e.g., `routeEvent_`) or stub the `has` check in a proper VM context to test the actual function's behavior directly.

**Specific Checks Requested:**
- **Double-steps, never steps, or runs at rate 0 for integrity wear:** Clean. `applyIntegrityWear_` safely returns `false` if `w.l === cycle` (preventing double steps) or if `base <= floor` / `d <= 0` (preventing stuck states). `wearMode` properly evaluates to `null` if the rate is 0, completely bypassing the RMW.
- **DialState writers dropping `wear`:** Clean. `serialize_`, `serializeDialState_`, and `deserialize_` have all been successfully updated to safely pass through the `c.wear` field. No drops found.
- **`conductCohortRow_` parity:** Clean. The extracted predicate perfectly matches the old inline logic with the same short-circuit order and fallback defaults.
- **Career loop restructure changes:** Clean. `existing` is properly re-read after `emitPressureTag_`, fixing the overwrite defect. `r` remains the physical index for accurate string seeding. The `LIMIT` condition safely bounds only texture events by using `continue`, ensuring the hospital hit and overwork paths execute for all rows.
- **UNDOCKED routing:** Clean. A pilot row (`ecl:kind:pilot`) correctly evaluates and returns `"Reputation"`. Non-pilot audience lines correctly fall back to `"Personal"`.
- **Silent fallbacks:** Clean. `wearRawRate === undefined` falls back to `0` quietly as specified ("Absent keys... = off, quietly"), while a negative rate loudly throws an error stopping the run.

HOLD
