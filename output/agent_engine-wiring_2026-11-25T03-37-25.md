Perfect. Now I have enough to build the card. Let me compile it.

---

```
WIRING CARD — updateExistingBonds_ (function)   map: 2026-11-24 / 179 files   

DEFINITION
  phase05-citizens/bondEngine.js:600  function updateExistingBonds_(ctx)   v2.7

PHASE POSITION
  production entry : Phase5-Bonds @ godWorldEngine2.js:765  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase5-Bonds @ godWorldEngine2.js:2486  — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (11)
  phase05-citizens/bondEngine.js:298  updateExistingBonds_(ctx);
  scripts/dialWave2Seams.test.js:60  w.updateExistingBonds_(ctx);
  scripts/dialWave2Seams.test.js:66  w.updateExistingBonds_(ctx);
  scripts/dialWave2Seams.test.js:78  w.updateExistingBonds_(ctx);
  scripts/dialWave2Seams.test.js:79  w.updateExistingBonds_(ctx); // no second status flip
  scripts/dialWave2Seams.test.js:83  const next = context(rows, bonds, 201); w.updateExistingBonds_(next);
  scripts/dialWave2Seams.test.js:86  const later = context(rows, bonds, 202); w.updateExistingBonds_(later);
  scripts/engine302Marital.test.js:227  B.updateExistingBonds_(ctx);
  scripts/engine302Marital.test.js:234  B.updateExistingBonds_(ctx);
  scripts/engine302Marital.test.js:237  B.updateExistingBonds_(fctx);
  scripts/engine302Marital.test.js:240  B.updateExistingBonds_(f2);
  scripts/engine302Marital.test.js:243  B.updateExistingBonds_(lctx);

S FIELDS
  READ  cycleId                @ :604   writers: advanceWorldTime_, v3Integration_
  READ  sportsCity            @ :610   writers: applySportsSeason_
  READ  cycleActiveCitizens   @ :617   writers: ensureBondEngineData_, generateCitizensEvents_, runRelationshipEngine_
  READ  sharedMoments         @ :656   writers: generateCitizensEvents_
  READ  cityDynamics          @ :794   writers: applyCityDynamics_, applyActiveInitiativeRipples_, applyInitiativeConsequences_, applyNeighborhoodRipple_
  READ  previousCycleState    @ :778   writers: loadPreviousCycleState_, applyShockMonitor_, finalizeCycleState_
  READ  relationshipBonds     @ :603   writers: createBond_, processGCCourtship_, processGCMarriageLottery_, runBondEngine_, loadRelationshipBonds_, purgeInactiveBonds_, seedEmergenceBonds_, seedRelationshipBonds_

OTHER CTX
  ctx.summary (READ) @ :602
  ctx.summary.relationshipBonds (READ) @ :603
  ctx.config (READ) @ :604, :659
  ctx.bondCalendarContext (READ) @ :607
  ctx._bondActivePool (READ) @ :617
  ctx.neighborhoodList (READ) @ :647
  ctx._bondLedgerIdx74 (READ/WRITE) @ :757

WRITE PATH
  (In-memory state mutations only — no INTENT or DIRECT sheet writes)
  bond.intensity mutation @ :887
  bond.status mutation @ :890, :893
  bond.bondType mutation @ :899, :902
  bond.notes mutation @ :900, :903
  bond.lastUpdate mutation @ :919
  (All mutations are to objects from ctx.summary.relationshipBonds; persistence via saveRelationshipBonds_ Phase10-Bonds)
  Math.random: NOT FOUND

OPEN WORK
  engine.356  bond-called moments built, not benched (builder 2026-11-24: "these should fire when…")
  engine.179  THE TRIANGLE contested romance (line 739–751)
  engine.74   household ledger courtship boost (line 752–767)
  engine.302  neighbor/professional/festival deepening to friendship (line 905–912)

HISTORY
  bf324305b engine.356 bond-called moments built, not benched (builder 2026-11-24)
  170e05444 engine.356: agy review of tonight's cuts folded
  11bfb6100 engine.356: two defects in tonight's own pushes
  fbf6a0707 engine.356: every bond line lands on LifeHistory_Log too
  a83cbbbd4 Revert "engine.339 code out of the tree"
  becdc24f3 engine.339 code out of the tree

FILES OPENED
  phase05-citizens/bondEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  scripts/dialWave2Seams.test.js
  scripts/engine302Marital.test.js
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=19 toolCalls=30 in=530763 out=5206_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._