Perfect! Now I have all the information I need. Let me compile the card:

```
WIRING CARD — appendBondLifeLine_ (function)   map: 2026-11-21 / 179 files   

DEFINITION
  phase05-citizens/bondEngine.js:2021  function appendBondLifeLine_(ctx, ledgerIdx, tag, text, cycle, withPop) { … }   v2.7

PHASE POSITION
  production entry : Phase5-Bonds @ godWorldEngine2.js:694  — BEFORE Phase10-ExecuteIntents (:896)
  cycle-phases     : Phase5-Bonds @ godWorldEngine2.js:2415  — BEFORE Phase10-ExecuteIntents (:2595)

CALLERS (16)
  phase05-citizens/bondEngine.js:1049    appendBondLifeLine_(ctx, joinIdx, 'Faith', 'joined the congregation at ' + fv[pickRow][fOrg], cycle);
  phase05-citizens/bondEngine.js:1090    appendBondLifeLine_(ctx, goneIdx, 'Faith-Drift', 'drifted from the congregation at ' + fv[fdr][fOrg] + ', quietly', cycle);
  phase05-citizens/bondEngine.js:2017    appendBondLifeLine_(ctx, me.idx, tag, BOND_SHIFT_TEXT[tag](other.name || 'them'), cycle, otherId);
  phase05-citizens/bondEngine.js:2250    if (pA) appendBondLifeLine_(ctx, pA.idx, 'Bond', line(nameOf(pB, bond.citizenB)), cycle);
  phase05-citizens/bondEngine.js:2251    if (pB) appendBondLifeLine_(ctx, pB.idx, 'Bond', line(nameOf(pA, bond.citizenA)), cycle);
  phase05-citizens/bondEngine.js:2339    appendBondLifeLine_(ctx, A.idx, 'Bond', 'something shifted with ' + B.name + ' — more than friends now', cycle);
  phase05-citizens/bondEngine.js:2340    appendBondLifeLine_(ctx, B.idx, 'Bond', 'something shifted with ' + A.name + ' — more than friends now', cycle);
  phase05-citizens/bondEngine.js:2502    appendBondLifeLine_(ctx, A.idx, 'Wedding', 'married ' + B.name + '; a household begins in ' + A.hood, cycle);
  phase05-citizens/bondEngine.js:2503    appendBondLifeLine_(ctx, B.idx, 'Wedding', 'married ' + A.name + '; a household begins in ' + A.hood, cycle);
  phase05-citizens/bondEngine.js:2735    appendBondLifeLine_(ctx, P2.idx, 'Bond', 'met ' + gcFull + ' ' + metWhere + ' — something starting', cycle);
  phase05-citizens/bondEngine.js:2954    if (si) appendBondLifeLine_(ctx, si.idx, 'TrustGuarded', 'there is someone else circling ' + ((people[popId] || {}).name || 'them') + ' — and it stings', cycle);
  phase05-citizens/bondEngine.js:2955    if (sj) appendBondLifeLine_(ctx, sj.idx, 'TrustGuarded', 'there is someone else circling ' + ((people[popId] || {}).name || 'them') + ' — and it stings', cycle);
  phase05-citizens/householdFormationEngine.js:1177    appendBondLifeLine_(ctx, ri, 'Divorce', 'the marriage to ' + nameOf(si) + ' (' + sp + ') ended', cycle);
  phase05-citizens/householdFormationEngine.js:1178    appendBondLifeLine_(ctx, si, 'Divorce', 'the marriage to ' + nameOf(ri) + ' (' + pop + ') ended', cycle);
  phase05-citizens/householdFormationEngine.js:1188    appendBondLifeLine_(ctx, ri, 'Divorce', 'the marriage ended', cycle);
  (one more at 1178 is a duplicate case)

OTHER CTX
  ctx.ledger.headers @ :2024 (READ)
  ctx.ledger.rows @ :2027 (READ), :2030 (WRITE)
  ctx.ledger.dirty @ :2031 (WRITE)
  ctx.now @ :2052 (READ)

WRITE PATH
  INTENT  queueAppendIntent_  @ :2052-2053  → LifeHistory_Log   (engine.356 bond line)
  DIRECT  row[iLife] mutation @ :2030  → ctx.ledger.rows[ledgerIdx][iLife] (LifeHistory cell)

TABS
  LifeHistory_Log   writers: phase04-events/chaosCarsEngine.js::writeCitizenEvent_, phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_, phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_, phase04-events/generationalEventsEngine.js::applyMilestone_, phase05-citizens/bondEngine.js::appendBondLifeLine_, phase05-citizens/educationCareerEngine.js::stampPromotion_, phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_, phase05-citizens/generateCivicModeEvents.js::generateCivicModeEvents_, phase05-citizens/generateMediaModeEvents.js::generateMediaModeEvents_, phase05-citizens/generationalWealthEngine.js::applyOwnerDraw_, phase05-citizens/householdFormationEngine.js::applyFundDisbursementBody_, phase05-citizens/judicialLifecycle.js::judicialSettleFine_, phase05-citizens/judicialLifecycle.js::judicialSettleLostPay_, phase05-citizens/maneuverEngine.js::runManeuverEngine_, phase05-citizens/migrationTrackingEngine.js::processRelocations_, phase05-citizens/processAdvancementIntake.js::applyTierLadderState_, phase05-citizens/processAdvancementIntake.js::decayMediaAttention_, phase05-citizens/processAdvancementIntake.js::processMediaUsage_, phase05-citizens/runCareerEngine.js::runCareerEngine_, phase05-citizens/runCivicRoleEngine.js::runCivicRoleEngine_, phase05-citizens/runConductEngine.js::runConductEngine_, phase05-citizens/runHouseholdEngine.js::runHouseholdEngine_, phase05-citizens/runNeighborhoodEngine.js::runNeighborhoodEngine_, phase05-citizens/runRelationshipEngine.js::runRelationshipEngine_, phase05-citizens/runYouthEngine.js::recordYouthLifeHistory_, phase01-config/godWorldEngine2.js::processIntake_, phase07-evening-media/mediaRoomIntake.js::processQuotedCitizens_, utilities/citizenDialMap.js::emitPressureTag_  readers: phase04-events/chaosCarsEngine.js::writeCitizenEvent_, phase04-events/generateGameModeMicroEvents.js::generateGameModeMicroEvents_, phase04-events/generateGenericCitizenMicroEvent.js::generateGenericCitizenMicroEvents_, phase04-events/generationalEventsEngine.js::applyMilestone_, phase05-citizens/applyGameNightMoments.js::applyGameNightMoments_, phase05-citizens/bondEngine.js::appendBondLifeLine_, phase05-citizens/checkForPromotions.js::checkForPromotions_, phase05-citizens/citizenContextBuilder.js::diagnoseLedgerStructure, phase05-citizens/citizenContextBuilder.js::getLifeHistory_, phase05-citizens/educationCareerEngine.js::stampPromotion_, phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_, phase05-citizens/generateCivicModeEvents.js::generateCivicModeEvents_, phase05-citizens/generateMediaModeEvents.js::generateMediaModeEvents_, phase05-citizens/generationalWealthEngine.js::applyOwnerDraw_, phase05-citizens/householdFormationEngine.js::applyFundDisbursementBody_, phase05-citizens/judicialLifecycle.js::judicialSettleFine_, phase05-citizens/judicialLifecycle.js::judicialSettleLostPay_, phase05-citizens/maneuverEngine.js::runManeuverEngine_, phase05-citizens/migrationTrackingEngine.js::processRelocations_, phase05-citizens/processAdvancementIntake.js::applyTierLadderState_, phase05-citizens/processAdvancementIntake.js::decayMediaAttention_, phase05-citizens/processAdvancementIntake.js::processAdvancementRows_, phase05-citizens/processAdvancementIntake.js::processMediaUsage_, phase05-citizens/runAsUniversePipeline.js::runAsUniversePipeline_, phase05-citizens/runCareerEngine.js::runCareerEngine_, phase05-citizens/runCivicRoleEngine.js::runCivicRoleEngine_, phase05-citizens/runConductEngine.js::runConductEngine_, phase05-citizens/runEducationEngine.js::runEducationEngine_, phase05-citizens/runHouseholdEngine.js::runHouseholdEngine_, phase05-citizens/runNeighborhoodEngine.js::runNeighborhoodEngine_, phase05-citizens/runRelationshipEngine.js::runRelationshipEngine_, phase05-citizens/runYouthEngine.js::recordYouthLifeHistory_, phase01-config/godWorldEngine2.js::processIntake_, phase07-evening-media/buildContractSeeds.js::contractSeedCycleEvents_, phase07-evening-media/mediaRoomIntake.js::processQuotedCitizens_, phase07-evening-media/parseMediaRoomMarkdown.js::parseContinuityNotes_, phase10-persistence/persistenceExecutor.js::executeSheetIntents_, utilities/archiveLifeHistory.js::maintainLifeHistoryLog_, utilities/archiveLifeHistory.js::runArchive_, utilities/citizenDialMap.js::emitPressureTag_   manifest: SHEETS_MANIFEST.md:43

OPEN WORK
  engine.356  A moment has it in a place (builder 11-21): evening places + shows on the lines (first C118) and bond lines on the log (C117), LIVE stage 68. Next: the page step | in-progress

HISTORY
  11bfb610  engine.356: two defects in tonight's own pushes, found on re-reading after the builder's "you don't read code and are pushing broken code". Repo only — NOT benched, NOT on PROD (stage 68 carries both defects).
  fbf6a070  engine.356: every bond line lands on LifeHistory_Log too (builder 2026-11-21: "this bond system still isn't wired into the sim" · "Proceed").
  a83cbbbd  Revert "engine.339 code out of the tree: the reverse of 1d74b2e49, df0052132 and b4db8c7a8 on the four engine files and the two test files (builder 2026-11-21: "the plan is rejected and not to be referenced"; its code rode onto PROD with stage 63). engine.351's hold stays. Full suite 346/346. Not benched, not live. [research/build]"
  becdc24f  engine.339 code out of the tree: the reverse of 1d74b2e49, df0052132 and b4db8c7a8 on the four engine files and the two test files (builder 2026-11-21: "the plan is rejected and not to be referenced"; its code rode onto PROD with stage 63). engine.351's hold stays. Full suite 346/346. Not benched, not live. [research/build]
  df005213  engine.339: only a woman becoming a man's spouse changes her name (builder 2026-11-20) — lottery spouse, GC courtship; a renamed husband gets his own name back, link kept. Existing tests pass (64, 108); no new tests yet, not benched, not on PROD. Plan as-built section. [research/build]
  e39a3805  engine.349 Task 14, the middle counts (builder 2026-11-18: "make the middle count"): every reader of a dial band reads the number. Not benched. [research/build]

FILES OPENED
  phase05-citizens/bondEngine.js
  phase05-citizens/householdFormationEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/ROLLOUT_PLAN.md
  docs/engine/SHEETS_MANIFEST.md
  docs/plans/2026-11-21-a-moment-has-a-place.md
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=23 toolCalls=38 in=738304 out=7613_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._