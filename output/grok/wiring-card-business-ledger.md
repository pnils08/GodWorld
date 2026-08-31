Perfect. Now I have all the information. Let me compile the wiring card.

From my investigation:
- Map generated: 2026-08-30, 183 files, 1187 functions
- Writers: flushBusinessFold_ (Phase4-ChaosCars, line 315), applyChaosDecay_ (Phase5-ChaosDecay, line 394), updateHeritage_ (via processGenerationalWealth_, Phase5-GenerationalWealth, line 374), runCareerEngine_ (Phase5-Career, line 349)
- Readers: buildCommuteFlows_ (Phase2-CommuteFlows, line 288), loadBusinessRows_ (in chaosCarsEngine.js), buildSettleBizPool_ (in educationCareerEngine.js), applyTrackedEmployerFloor_, loadHoodBusinessPay_, buildMintBizPool_, applyEmployerSuccess_ (in runCareerEngine.js), runEconomicRippleEngine_ (Phase6-EconomicRipple, line 401), contractSeedBackdropIndex_, buildEveningFamous_ (Phase7-Famous, line 455)
- Phase10-ExecuteIntents at lines 563 (production) and 2204 (cycle-phases)
- All writers are BEFORE Phase10-ExecuteIntents

Write intents:
- flushBusinessFold_: queueCellIntent_ line 421
- applyChaosDecay_: queueCellIntent_ line 95
- updateHeritage_: queueAppendIntent_ line 1863
- runCareerEngine_: queueCellIntent_ line 1185

Now let me create the final card:

```
WIRING CARD — Business_Ledger (tab)   map: 2026-08-30 / 183 files   [MAP CURRENT]

DEFINITION
  docs/engine/ENGINE_STUB_REVERSE.json  Business_Ledger sheet mapping

PHASE POSITION
  production entry : phase01-config/godWorldEngine2.js (writers BEFORE 563)
  cycle-phases     : phase01-config/godWorldEngine2.js (writers BEFORE 2204)

WRITERS (4)
  phase04-events/chaosCarsEngine.js::flushBusinessFold_
    Phase4-ChaosCars @ godWorldEngine2.js:315  — BEFORE Phase10-ExecuteIntents (563)
    queueCellIntent_ @ chaosCarsEngine.js:421 → Business_Ledger
  
  phase05-citizens/applyChaosDecay.js::applyChaosDecay_
    Phase5-ChaosDecay @ godWorldEngine2.js:394  — BEFORE Phase10-ExecuteIntents (563)
    queueCellIntent_ @ applyChaosDecay.js:95 → Business_Ledger
  
  phase05-citizens/generationalWealthEngine.js::updateHeritage_ (called from processGenerationalWealth_)
    Phase5-GenerationalWealth @ godWorldEngine2.js:374  — BEFORE Phase10-ExecuteIntents (563)
    queueAppendIntent_ @ generationalWealthEngine.js:1863 → Business_Ledger
  
  phase05-citizens/runCareerEngine.js::runCareerEngine_
    Phase5-Career @ godWorldEngine2.js:349  — BEFORE Phase10-ExecuteIntents (563)
    queueCellIntent_ @ runCareerEngine.js:1185 → Business_Ledger

READERS (10)
  phase02-world-state/commuteFlowEngine.js::buildCommuteFlows_
    Phase2-CommuteFlows @ godWorldEngine2.js:288  — BEFORE Phase10-ExecuteIntents
    ctx.ss.getSheetByName('Business_Ledger') @ commuteFlowEngine.js:93
  
  phase04-events/chaosCarsEngine.js::loadBusinessRows_
    (called from runChaosCarsEngine_; Phase4-ChaosCars @ godWorldEngine2.js:315)
    ctx.cache.getData('Business_Ledger') @ chaosCarsEngine.js:202
    ctx.ss.getSheetByName('Business_Ledger') @ chaosCarsEngine.js:206
  
  phase05-citizens/educationCareerEngine.js::buildSettleBizPool_
    (called from processEducationCareer_; Phase5-EducationCareer @ godWorldEngine2.js:375)
    ctx.ss.getSheetByName('Business_Ledger') @ educationCareerEngine.js:699
  
  phase05-citizens/generationalWealthEngine.js::applyTrackedEmployerFloor_
    (called from processGenerationalWealth_; Phase5-GenerationalWealth @ godWorldEngine2.js:374)
    ctx.ss.getSheetByName('Business_Ledger') @ generationalWealthEngine.js:565
  
  phase05-citizens/generationalWealthEngine.js::loadHoodBusinessPay_
    (called from processGenerationalWealth_; Phase5-GenerationalWealth @ godWorldEngine2.js:374)
    ctx.ss.getSheetByName('Business_Ledger') @ generationalWealthEngine.js:668
  
  phase05-citizens/processAdvancementIntake.js::buildMintBizPool_
    (called from processAdvancementIntake_; Phase5-Advancement @ godWorldEngine2.js:372)
    ctx.ss.getSheetByName('Business_Ledger') @ processAdvancementIntake.js:1021
  
  phase05-citizens/runCareerEngine.js::applyEmployerSuccess_
    (called from runCareerEngine_; Phase5-Career @ godWorldEngine2.js:349)
    (reads Business_Ledger internal to career engine logic)
  
  phase06-analysis/economicRippleEngine.js::runEconomicRippleEngine_
    Phase6-EconomicRipple @ godWorldEngine2.js:401  — BEFORE Phase10-ExecuteIntents
    ctx.ss.getSheetByName('Business_Ledger') @ economicRippleEngine.js:155
  
  phase07-evening-media/buildContractSeeds.js::contractSeedBackdropIndex_
    (called from buildContractSeeds_; Phase7-ContractSeeds @ godWorldEngine2.js:471)
    ctx.ss.getSheetByName('Business_Ledger') @ buildContractSeeds.js:303
  
  phase07-evening-media/buildEveningFamous.js::buildEveningFamous_
    Phase7-Famous @ godWorldEngine2.js:455  — BEFORE Phase10-ExecuteIntents
    ctx.ss.getSheetByName('Business_Ledger') @ buildEveningFamous.js:450

WRITE TYPES
  INTENT  queueCellIntent_  @ phase04-events/chaosCarsEngine.js:421  → Business_Ledger (chaos_cars business event)
  INTENT  queueCellIntent_  @ phase05-citizens/applyChaosDecay.js:95  → Business_Ledger (chaos_cars revenue decay)
  INTENT  queueAppendIntent_ @ phase05-citizens/generationalWealthEngine.js:1863 → Business_Ledger (engine.65 heritage business roll)
  INTENT  queueCellIntent_  @ phase05-citizens/runCareerEngine.js:1185 → Business_Ledger (career-engine headcount write-back)
  All INTENT operations execute at Phase10-ExecuteIntents (godWorldEngine2.js:563 / 2204)

MANIFEST
  docs/engine/SHEETS_MANIFEST.md:22  Tracking businesses, employee counts, and revenue.

OPEN WORK (plans referencing Business_Ledger)
  2026-05-07-chaos-cars-engine.md  S265 corrected: business events via queueCellIntent_ on Business_Ledger (trimmed header lookup)
  2026-07-05-game-night-connection-design.md  S56: hospitality/food-sector rows in nightlife-profiled neighborhoods need game-night coupling
  2026-07-12-entity-protagonism.md  S112: buildEveningFamous_ one fail-soft hood-keyed Business_Ledger read for venue sighting
  2026-07-16-engine61-banking.md  No bank entity in Business_Ledger; not needed for rate layer
  2026-07-26-employment-reconciliation.md  S334 DONE: 5 civic initiative rows appended (BIZ-00094–00098)
  2026-07-27-employment-living-system.md  S335 DONE: all 23 empty economic columns filled; S336 DONE: consumer in runCareerEngine_ (Phase5-Career)
  2026-08-01-business-lifecycle-generator.md  engine.134 design (lifecycle engine pattern from applyChaosDecay.js)
  2026-08-29-employment-system-cascade.md  S399 DONE: D2/D4 citizen pay hood-references; Business_Ledger 72-row hood fill live

HISTORY
  d93a5532  S399 engine.135 D2/D4: a citizen's pay references their own hood's businesses
  c05a14dd  engine.135 A+B2: city employment dial pulled to attractor; hood Unemployed envelope
  01a1549e  engine.133 Tasks 2-7: city health system built
  7a938f4d  S388 close — engine.128 closed end to end
  6dc9902c  engine.122: guard moved before AdvanceTime
  d1ce6936  engine.122+121: carry-forward triple redundancy

FILES SCANNED
  phase01-config/godWorldEngine2.js
  phase02-world-state/commuteFlowEngine.js
  phase04-events/chaosCarsEngine.js
  phase04-events/chaosCarsEngine.test.js
  phase05-citizens/applyChaosDecay.js
  phase05-citizens/applyChaosDecay.test.js
  phase05-citizens/educationCareerEngine.js
  phase05-citizens/generationalWealthEngine.js
  phase05-citizens/processAdvancementIntake.js
  phase05-citizens/runCareerEngine.js
  phase06-analysis/economicRippleEngine.js
  phase07-evening-media/buildContractSeeds.js
  phase07-evening-media/buildEveningFamous.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/*.md
```

---

**WIRING CARD — Business_Ledger (tab)   map: 2026-08-30 / 183 files   [MAP CURRENT]**

**DEFINITION**
  docs/engine/ENGINE_STUB_REVERSE.json  Business_Ledger sheet (writers: 4; readers: 10)

**PHASE POSITION**
  production entry : Writers BEFORE Phase10-ExecuteIntents @ godWorldEngine2.js:563
  cycle-phases     : Writers BEFORE Phase10-ExecuteIntents @ godWorldEngine2.js:2204

**WRITERS (4)**

  phase04-events/chaosCarsEngine.js:412  `function flushBusinessFold_(ctx)`
    → Phase4-ChaosCars @ godWorldEngine2.js:315
    INTENT  queueCellIntent_(ctx, 'Business_Ledger', f.sheetRow, f.col1, val, ...) @ :421

  phase05-citizens/applyChaosDecay.js:33  `function applyChaosDecay_(ctx)`
    → Phase5-ChaosDecay @ godWorldEngine2.js:394
    INTENT  queueCellIntent_(ctx, 'Business_Ledger', dataIdx+1, iRev+1, next, ...) @ :95

  phase05-citizens/generationalWealthEngine.js:1549  `function updateHeritage_(ss, ctx, cycle)`
    → Called from processGenerationalWealth_ @ Phase5-GenerationalWealth (godWorldEngine2.js:374)
    INTENT  queueAppendIntent_(ctx, 'Business_Ledger', [...bizId, bizName, ...], ...) @ :1863

  phase05-citizens/runCareerEngine.js:218  `function runCareerEngine_(ctx)`
    → Phase5-Career @ godWorldEngine2.js:349
    INTENT  queueCellIntent_(ctx, 'Business_Ledger', bRec.sheetRow, bCount+1, bRec.stated, ...) @ :1185

**READERS (10)**

  phase02-world-state/commuteFlowEngine.js:73  `function buildCommuteFlows_(ctx)`
    → Phase2-CommuteFlows @ godWorldEngine2.js:288
    READ ctx.ss.getSheetByName('Business_Ledger') @ :93

  phase04-events/chaosCarsEngine.js:195  `function loadBusinessRows_(ctx)`
    → Called from runChaosCarsEngine (Phase4-ChaosCars)
    READ ctx.cache.getData('Business_Ledger') @ :202
    READ ctx.ss.getSheetByName('Business_Ledger') @ :206

  phase05-citizens/educationCareerEngine.js:697  `function buildSettleBizPool_(ctx)`
    → Called from processEducationCareer (Phase5-EducationCareer @ godWorldEngine2.js:375)
    READ ctx.ss.getSheetByName('Business_Ledger') @ :699

  phase05-citizens/generationalWealthEngine.js:556  `function applyTrackedEmployerFloor_(ctx)`
    → Called from processGenerationalWealth (Phase5-GenerationalWealth @ godWorldEngine2.js:374)
    READ ctx.ss.getSheetByName('Business_Ledger') @ :565

  phase05-citizens/generationalWealthEngine.js:663  `function loadHoodBusinessPay_(ctx)`
    → Called from processGenerationalWealth (Phase5-GenerationalWealth @ godWorldEngine2.js:374)
    READ ctx.ss.getSheetByName('Business_Ledger') @ :668

  phase05-citizens/processAdvancementIntake.js:1019  `function buildMintBizPool_(ss)`
    → Called from processAdvancementIntake (Phase5-Advancement @ godWorldEngine2.js:372)
    READ ss.getSheetByName('Business_Ledger') @ :1021

  phase05-citizens/runCareerEngine.js:113  `function applyEmployerSuccess_(ctx, cycle, roll, logRows, S, gapFactor)`
    → Called from runCareerEngine (Phase5-Career @ godWorldEngine2.js:349)
    (internal Business_Ledger reference via career engine state)

  phase06-analysis/economicRippleEngine.js:140  `function runEconomicRippleEngine_(ctx)`
    → Phase6-EconomicRipple @ godWorldEngine2.js:401
    READ ctx.ss.getSheetByName('Business_Ledger') @ :155

  phase07-evening-media/buildContractSeeds.js:299  `function contractSeedBackdropIndex_(ctx)`
    → Called from buildContractSeeds (Phase7-ContractSeeds @ godWorldEngine2.js:471)
    READ ctx.ss.getSheetByName('Business_Ledger') @ :303

  phase07-evening-media/buildEveningFamous.js:41  `function buildEveningFamous_(ctx)`
    → Phase7-Famous @ godWorldEngine2.js:455
    READ ctx.ss.getSheetByName('Business_Ledger') @ :450

**WRITE OPERATIONS**

  INTENT  queueCellIntent_ @ phase04-events/chaosCarsEngine.js:421
    → 'Business_Ledger' (chaos_cars business event) [BEFORE executor]
  
  INTENT  queueCellIntent_ @ phase05-citizens/applyChaosDecay.js:95
    → 'Business_Ledger' (chaos_cars revenue decay) [BEFORE executor]
  
  INTENT  queueAppendIntent_ @ phase05-citizens/generationalWealthEngine.js:1863
    → 'Business_Ledger' (engine.65 heritage business roll) [BEFORE executor]
  
  INTENT  queueCellIntent_ @ phase05-citizens/runCareerEngine.js:1185
    → 'Business_Ledger' (career-engine headcount write-back) [BEFORE executor]
  
  Phase10-ExecuteIntents @ godWorldEngine2.js:563 (production), 2204 (cycle-phases)

**MANIFEST**
  docs/engine/SHEETS_MANIFEST.md:22  Tracking businesses, employee counts, and revenue.

**OPEN WORK**
  2026-05-07-chaos-cars-engine.md  S265 corrected: trimmed header lookup (columns may carry whitespace)
  2026-07-05-game-night-connection-design.md  Hospitality/food rows need nightlife-neighborhood coupling
  2026-07-12-entity-protagonism.md  buildEveningFamous_ venue sighting integration (hood → Business_Ledger read)
  2026-07-26-employment-reconciliation.md  S334 DONE: civic initiative rows BIZ-00094–00098 appended
  2026-07-27-employment-living-system.md  S335 DONE: 23 empty economic columns filled; S336 DONE: consumer in runCareerEngine_
  2026-08-01-business-lifecycle-generator.md  engine.134 lifecycle engine (pattern from applyChaosDecay_)
  2026-08-29-employment-system-cascade.md  S399 DONE: 72-row hood fill deployed; D2/D4 citizen pay hood-references live

**HISTORY**
  d93a5532  S399 engine.135 D2/D4: citizen pay hood-references their own businesses
  c05a14dd  engine.135 A+B2: city employment dial + hood envelope (income × boom × depth)
  01a1549e  engine.133 Tasks 2-7: city health system (attractor + weather strain)
  7a938f4d  S388 close — engine.128 end-to-end closure
  6dc9902c  engine.122: guard moved before AdvanceTime
  d1ce6936  engine.122+121: carry-forward triple redundancy + real-schema inheritance

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **136**
- opened by this run: **136** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=21 toolCalls=25 in=373148 out=7675_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._