# Review of engine.208 fandom dial read-before

1. **Every code claim in §1.1.** 
All cited code claims are confirmed as true. 
- `utilities/citizenMemory.js:33`: confirmed as the only hardcoded `DIALS` list.
- Missing dial reads 50: confirmed in `newCitizen_` and `deserialize_` (`citizenMemory.js:64,257`) and `lib/citizenDials.js:34`.
- `describe_` throw: confirmed (`citizenMemory.js:230-237`).
- `baseTag_` trailing `-Sports`: confirmed (`citizenDialMap.js:252-263`).
- `EDITION_RE`/`EDITION_FX`: confirmed it is a `sociability +2` citation (`citizenDialMap.js:207-208`).
- `loadEventContentLedger.js`: confirmed DSL fields carry no fandom, team, or phase.
Verdict: NOTE.

2. **Re-litigation.** 
Does any sentence in §2 or §4 re-open a ruling?
- §2.2 drops **Undocked engagement** from the `DIAL_MAP` table entirely. Plan §4 ruled: "What moves it UP: ... Undocked engagement." This re-opens the ruling by omitting it.
- §2.2 says: "A losing Oaks preseason costs a fan -2 a week against an expansion expectation that mostly reads 'as expected' -> near zero (Q3/Q7 fall out without a rule)." Research Q3 ruled: "measure against each team's own expectation". The draft re-opens this by proposing it "falls out without a rule" and relies on the feed to neutralize it.
- The plan's sixth block setting the lens is correctly noted as superseding research Q6. 
Verdict: FIX. Add Undocked engagement back to the tags table and address Q3 expectation measurement as an explicit rule.

3. **Texture as seed.** 
Confirmed. §2.3's seed formula uses sports wagers, stadium zones, and household inheritance. It uses none of the 1,210 `[Sports]` lines directly or by proxy.
Verdict: NOTE.

4. **Negative pole on day one.** 
If Q3 neutralises every Oaks loss to "near zero" because it reads "as expected", then the `Sports-Loss` tag is never emitted. Since the Oaks are the only ones losing, no citizen actually moves down and the negative pole is dead at ship. Minimal rule to make it fire: an explicit threshold where a loss *fails* the expansion expectation (e.g. an L-streak longer than expected) emits `Sports-Loss`, OR the `Sports-Soured` cron tone proposed in §2.5 must fire for Oaks coverage.
Verdict: BLOCK. The negative pole will be dead at ship if Oaks losses are neutralized without explicitly failing expectation.

5. **Sim calls vs mechanism.**
- §4 item (iv) Magnitudes ("confirm, or move a number") is a **mechanism** question the engineer should decide, not a sim judgement.
- Conversely, §2.2's claim that Q3/Q7 "fall out without a rule" is a hidden **sim judgement** presented as a mechanism consequence; it effectively decides the Oaks' expansion status immunizes them from fan backlash. 
Verdict: FIX. Move magnitudes to mechanism and move the Oaks expectation penalty to a sim call.

6. **Feed claim.** 
Confirmed. `output/beats/Oakland_Sports_Feed.jsonl` Cycles 107-109 shows every A's game-result row carries `SeasonType` `playoffs`. The round only appears in `Notes` (e.g., "Game 1 of the ALDS"). `applySportsSeason.js:367` maps `world-series` to `championship`.
Verdict: NOTE.

7. **Acceptance dates.** 
Yes, there is a bench-time check that would catch a one-blob outcome earlier. A synthetic 10-cycle bench test simulating realistic event rates (wins, losses, and cron tone) combined with the proposed `MOOD_DECAY` (0.8) would prove whether the +2/-2 magnitudes actually produce a spread, or if the decay pulls everyone back into the middle blob before the histogram separates.
Verdict: FIX. Add a synthetic 10-cycle bench test to §2.8.

SHIP-WITH-FIXES (Add Undocked to table, define explicit Oaks loss rule, move magnitudes to mechanism, add synthetic 10-cycle bench test)
