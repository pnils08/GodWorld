# agy brief — engine.364 adversarial diff read (engine-sheet, 2026-11-24)

**Read-only. Write only `output/antigravity/2026-11-24-review-engine364.md`.**

Commits `ec37df331`, `36a6c3b94`, `219c118e7` (`git show` each). Plan: `docs/plans/2026-11-23-hospital-record-reads-right.md`.

What changed:
- `phase04-events/careJusticeService.js` — hood hospital admissions = whole part of `sick × careJusticeAdmitPerSick + carry`, remainder carried (`careJusticeAdmitCarryIn_`, `careJusticeAdmitSplit_`); a hood with nothing carried starts at 0.5.
- `phase09-digest/finalizeCycleState.js` `compactHospitalAdmitCarry_` + save on key `PREV_HOSP_ADMIT_CARRY_JSON`; `phase01-config/loadPreviousEvening.js` `seedCarriedHospitalAdmitCarry_`.
- `phase10-persistence/buildCyclePacket.js` — a closed stay's StatusNow is `discharged` / `deceased` (`hospitalClosedStatus_`) on discharge and ghost-release.
- Readers: `scripts/cron-work-wake.js` (hospital-admissions fallback), `scripts/cron-saturday-run.js` (open test), `scripts/buildLivesSlice.js` (open stays), `scripts/buildHealthSlice.js` (only stays still in care ride).

Attack:
1. The carry. Can it ever hand a reader a non-integer, a negative, or a carry ≥ 1? A hood added to or dropped from the table mid-run; a re-fire of the same Cycle (the self-ghost guard in `loadCarryForwardBlob_`); a fire where Phase4-CareJusticeDemand throws (no demand → no save → next Cycle reads an older ring row — is that wrong by more than one Cycle's fraction?); dry-run and replay.
2. Every consumer of `demand.hoods[h].hospitalIntakes` — the census (`utilities/careJusticeAccounting.js` planCareJusticeCensus_, `careJusticeOtherResident_`), the ambulance named pass (`phase04-events/chaosCarsEngine.js` ~896–925, `utilities/chaosCarsConfig.js`), the hospital strain talk-back (`phase03-population/applyDemographicDrift.js` readHospitalCensusTail_). Does a week-to-week wobble (city 32–37 around 34) trip the strain band or any census completeness/identity check?
3. The `discharged` stamp. Every reader of Hospital_Ledger StatusNow anywhere (`grep -rn StatusNow` across phase*, utilities, lib, scripts, dashboard): does any of them treat a closed row's StatusNow as the citizen's life status (`active`, `Retired`), or count `deceased`/`discharged` wrong? The care-exit restore (`hospitalPriorStatusForDischarge_`, PriorStatus) — does it ever read StatusNow off a closed row?
4. The readers. Any path where a stay open at the Cycle is now dropped, or a closed one still shown as open, in the four scripts above or in `lib/wakePerception.js`, `scripts/beatSliceKit.js`, `scripts/workerWake.js`, `lib/discordLookups.js`.
5. Anything in the change that is a silent fallback, a weakened check, or a value read without a guard.

Bench evidence: `output/engine-sheet/2026-11-23-e364/bench.log` (two fires PASS: fire 1 = rounding hood for hood, fire 2 the four small hoods admit 1 off the carry). A third fire proving the stamp is in `bench3.log` when it lands.

Each finding: file:line, the input, what breaks. Verdict: SHIP / SHIP-WITH-FIXES / HOLD.
