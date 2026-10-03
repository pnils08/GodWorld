# Read-only Review: Commit e4f42227..48e974d2 (Task 10 Slices)

**(1) censusTrail reads only IntakeType all rows and never sums a typed row on top of them; city rows never fold into a hood line; a row whose Completeness is not complete contributes no numbers and prints numbers withheld:**
PASS. `censusTrail` strictly filters `IntakeType === 'all'`, avoiding summing typed rows. The `city` scope is handled in an exclusive `if (t.scope === 'city')` block, so it never reaches `out.hoods`. When `Completeness` is not `complete`, `num(r.TotalIntakes)` and other measures are nullified, and `trailLine` returns the "numbers withheld" string.
*Evidence: scripts/beatSliceKit.js:147, 155-157, 163-165, 177*

**(2) every hood trail line ends in tracked names off the ledger, or the literal none tracked, or tracked residents not named on this beat when TrackedOccupancy is positive with no name:**
PASS. `trailLine` builds the end string using a ternary check on `t.names.length`, falling back to the exact string "tracked residents not named on this beat" if `t.trackedOcc > 0`, and "none tracked" otherwise.
*Evidence: scripts/beatSliceKit.js:184*

**(3) no POPID or case ID (J-C...-POP-...) can reach a fact text from courtCases, receiptHookFacts, treasuryWeek, censusFacts or debtPattern; they live only in src:**
PASS. `courtCases` keeps `caseId` and `popid` only in the object properties and `src`, excluding them from the `bits.join(', ')` text. `receiptHookFacts` uses `.replace(/,?\s*case J-C\d+-POP-\d+/gi, '')` to explicitly strip case IDs. `treasuryWeek`, `censusFacts`, and `debtPattern` construct their output strings using human-readable names and aggregate numbers without interpolating IDs.
*Evidence: scripts/beatSliceKit.js:124-128, 237, 76-80*

**(4) sportsSubject keeps a GAME-clock or SPORTS_OVERRIDE or athlete-role citizen out of every people list and every name in a fact, in all five slices:**
PASS. `sportsSubject` effectively identifies these citizens. It is used to filter out subjects in `courtCases`, `custodyNamesByHood`, `careNamesByHood`, and `debtPattern`. `buildHealthSlice.js` points its `ineligible` check directly to `K.sportsSubject`. Thus they do not surface in lists or facts across the slices.
*Evidence: scripts/beatSliceKit.js:18-23, 115, 211, 222, 262, 267; scripts/buildHealthSlice.js:540*

**(5) courtCases joins the fine to the case by the COURT-NAMED note (case <id>, ...) and only for the current Cycle; a case not touched this Cycle and not in custody never rides:**
PASS. The fines map is built strictly from `treasuryRows` where `Cycle === cycle` and `Counterparty === 'COURT-NAMED'`, parsing `case <id>` from the `Note`. The case loop requires `touched` (transitioned this cycle) or `inCustody` to be true, skipping cases that meet neither condition.
*Evidence: scripts/beatSliceKit.js:101-104, 111-113*

**(6) treasuryWeek: opening = BalanceAfter of the last row before this Cycle (or first row minus its amount when none), closing = last row this Cycle, outflows are APPROPRIATION/RENEWAL or negative amounts, PREFUNDED never counted, totals reconcile:**
PASS. `out.opening` uses `before.BalanceAfter` or subtracts `week[0].Amount` from `week[0].BalanceAfter`. `out.closing` reads the final `BalanceAfter`. `PREFUNDED` uses `continue` to skip. Negative amounts and `APPROPRIATION`/`RENEWAL` are explicitly categorized as `outflows`. The facts correctly reflect the totals.
*Evidence: scripts/beatSliceKit.js:54-56, 61, 68-70*

**(7) debtPattern parses DialState soft (string or object, unparseable = no default), uses the engine line DebtLevel >= 5, and narrows every count to the hood when one is given:**
PASS. `parseDialState` attempts to return as an object or parse JSON softly with an empty catch block. The `DEBT_CRISIS_LINE` is explicitly set to `5`. Loops conditionally skip execution when `hoodKey(h) !== want`, successfully narrowing the counts.
*Evidence: scripts/beatSliceKit.js:241-246, 254, 260, 278*

**(8) the circular require between beatSliceKit and buildEconomicSlice is safe in both entry orders (node scripts/buildEconomicSlice.js as main, and any seat that requires the kit first) — say why:**
PASS. `buildEconomicSlice` completes its top-level module initialization and exports its functions *before* it conditionally lazily requires `beatSliceKit` inside the `build()` function. Therefore, when `beatSliceKit` requires `buildEconomicSlice` at the top level, it receives the fully populated exports object in both entry orders, preventing reading from an incomplete module.
*Evidence: scripts/buildEconomicSlice.js:469*

**(9) the three new tabs are hard-required by safety, health, neighborhood, economic (fail loud on a missing file like the other tabs) and soft in the civic domain slice, and output/beats on disk now carries all three files (ls -la output/beats/City_Treasury.jsonl Judicial_Ledger.jsonl Care_Justice_Census.jsonl):**
PASS. The relevant tabs are explicitly added to the `tabs` arrays in `buildSafetySlice.js` (all 3), `buildHealthSlice.js` (1), `buildNeighborhoodSlice.js` (2), and `buildEconomicSlice.js` (1), acting as hard-requires via the kit's loading logic. `buildCivicDomainSlice.js` safely adds them to its `CIVIC_DUMP_TABS` using the `try/catch` wrapped `readJsonl` function for soft requirements. The three files successfully exist on disk as 0-byte `.jsonl` files.
*Evidence: scripts/buildSafetySlice.js:21, scripts/buildHealthSlice.js:23, scripts/buildNeighborhoodSlice.js:63, scripts/buildEconomicSlice.js:436, scripts/buildCivicDomainSlice.js:322*

**(10) hooksForBusiness, the safety domainHooks regex and Maria unchanged hooks regex: no hook class that reached a desk before is lost:**
PASS. `hooksForBusiness` perfectly retains the old logic and strictly appends `MONEY_HOOK_RE` using the `||` operator. Safety invokes `K.domainHooks` (which internally concatenates results from `hooksFor` with regex matches) avoiding replacement of explicitly assigned journalists. Maria's color hook regex is verifiably unmodified from the previous iteration. 
*Evidence: scripts/buildEconomicSlice.js:183-186, scripts/buildSafetySlice.js:94, scripts/buildNeighborhoodSlice.js:644*

SHIP
