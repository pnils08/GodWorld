# TASK — codex: adversarial review of the pipeline.73 step 1 wiring card (2026-10-14)

**From:** engine-sheet. **Mode:** read-only. No code edits, sheet writes or commits.
**Output:** `docs/for-claude-review/2026-10-14-codex-pipeline73-lived-wake-card.md`. One verdict per hunt, with file:line evidence.

**Under review:** `docs/plans/2026-10-11-media-extension.md`, the "Step 1 wiring card (engine-sheet, 2026-10-14)" section under Build order. The change is a `lived` wake slot in `scripts/citizen-wake.js` `selectCitizen`, plus an opt-in `buildPool({ livedCycle })` in `lib/wakePerception.js`, plus two journalist rows queued on `Advancement_Intake1`.

## Hunts

1. **Tag set vs the writers.** Grep every writer of Birth, Retirement, Promotion, LifeEvent-Promotion-Up-M/L, Hospitalized, Critical, Recovery and Recovering into LifeHistory (`phase*/`, `utilities/`). For each tag, is it news-grade, ambient texture, or mixed? Is the card's `Recovering` text filter the right test, or does another writer stamp hospital-grade `Recovering` in different words? Is any news-grade tag missing (Death, a Hospital_Ledger stay with no tag)?
2. **Opt-in pool is byte-for-byte for other callers.** `buildPool` callers: `citizen-wake.js:35`, `citizenVoice.js:49`, `citizen-exchange.js:40`, `employerSuccess.test.js:530`. Confirm that passing nothing leaves today's pool unchanged, and that `livedOnly` rows can't reach posture, rotation, or the other scripts.
3. **Once per event.** The card uses `state.lived[popId] === cycle` instead of the 100-deep `recent` list. Can a citizen double-wake (two lived tags in one Cycle, a Birth plus a Promotion)? Can a lived wake be missed across the 3-a-day crons if the Cycle advances mid-week? Where does `cycle` come from in `citizen-wake.js`?
4. **Dry run.** `state.lived` must persist on live runs only, the same as tensions and ripples (`citizen-wake.js:86–87`). Check every `saveState` path.
5. **Household dedupe and age floor.** HouseholdId + tag per Cycle: is HouseholdId populated for the cases that matter (a birth with two parents stamped)? Rows with a blank HouseholdId exist (POP-00510, POP-00801). Is age < 16 computed the way `buildPool` computes age (`citizenDerivation.currentSimYear() − BirthYear`)?
6. **Mint door.** `Advancement_Intake1` → `processAdvancementRows_` (`phase05-citizens/processAdvancementIntake.js:587`). Does a queued row with ClockMode MEDIA, MED set, EmployerBizId and no MatchPopId mint a fresh ledger row with that clock, or does a name-match, tier or employer branch reroute it? Which fields are required for it to mint without a review status?
7. **Slot order and budget.** Lived goes after voiced and before posture. With 21 wakes a week (3 crons a day), can lived plus posture starve rotation for a whole week? Is there a case where the lived list is never empty, so rotation never runs?
