# Adversarial Review — `pipeline.115` (`8230195fe`, `3f016a164`)

Scope: commits `8230195fe` and `3f016a164`, plan [`2026-11-22-engine-out-of-the-sims-mouth.md`](file:///root/GodWorld/docs/plans/2026-11-22-engine-out-of-the-sims-mouth.md), per [`2026-11-22-es-brief-agy-pipeline115.md`](file:///root/GodWorld/docs/for-claude-review/2026-11-22-es-brief-agy-pipeline115.md). Read-only review; tested against live C116/C117 artifacts on disk without modifying code.

---

## Findings

### 1. `loadJaxSlice` returns unconverted `engine_audit` refs and paths when building on demand
**Where:** `scripts/buildJaxSlice.js:739-765` (callers: `scripts/newsroom-fanout.js:372`, `scripts/cron-desk-run.js:752`, `scripts/cron-desk-run.js:1722`)  
**What breaks:** `buildJaxSlice` still constructs raw `engine_audit` strings on `slice.stink.ref`, `slice.story.ref`, `slice.contradiction.aSrc`/`bSrc`, `slice.prewrite.evidence`, and `slice.pointers` (`scripts/buildJaxSlice.js:594`). `writeJaxSlice(cycle, slice, root)` only reassigns its local parameter (`slice = toRecordRefs(slice)` at `:740`) before writing disk files. `loadJaxSlice(cycle, root)` (`:757-765`), when `jax_slice_c{N}.json` does not yet exist on disk, calls `buildJaxSlice`, calls `writeJaxSlice`, and returns the **original, unconverted `slice`** at `:764`.  
**Concrete input → wrong output:** Currently `output/jax_slice_c117.json` does not exist on disk. Calling `loadJaxSlice(117)` returns `slice.stink.ref = "output/engine_audit_c117.json patterns[5]; evidence: Neighborhood_Map row(s) 10"` and `slice.pointers` including `"output/engine_audit_c117.json"` (while writing `"Neighborhood_Map row(s) 10; finding C117-5"` to disk). On that first run:
- `cron-desk-run.js:1722-1725` receives the unconverted `story.ref` when `story` was not pre-set.
- `newsroom-fanout.js:372-379` (`applyStinkForce`) puts the unconverted `output/engine_audit_c117.json ...` ref into `fanout.assignments` and `takenRefs`, so `laneSeeds` (`:209`) reading a rebuilt `desk_signal` (`"Neighborhood_Map row(s) 10; finding C117-5"`) fails to dedup against it.

---

### 2. `buildJaxSlice` `incoherence` contradiction loses sheet/row/storyline under `toRecordRefs` and falsely claims "audit says no prior audit is available"
**Where:** `scripts/buildJaxSlice.js:337-357`, `:480`, `:723-737` (readers: `scripts/cron-desk-run.js:1269-1275`, `:2569-2585`)  
**What breaks:** When `auditPattern.type === 'incoherence'`, `buildContradiction`:
1. Rebuilds `patternBase = 'output/engine_audit_c' + cycle + '.json patterns[' + patternMatch[1] + ']'` (`:340`) and sets `aSrc: patternBase + '.evidence.fields'`, `bSrc: patternBase + '.measurement'` (`:353-354`), then `:480` overrides `story.ref = contradiction.aSrc`. Running `toRecordRefs` (`:727`) calls `beatSliceKit.recordRef`, which reduces `"output/engine_audit_c117.json patterns[3].evidence.fields"` to `"finding C117-3"` — stripping `Initiative_Tracker row(s) N` and `; storyline INIT-XXX:...` that `top.ref` carried.
2. Unconditionally sets `b: 'The same Cycle ' + cycle + ' audit says no prior audit is available for comparison.'` (`:351`) — using the `"audit"` framing and stating no prior audit is available even when `auditPattern.measurement.available === true` (`:356` tracks `measurementAvailable` separately).

**Concrete input → wrong output:** With an `incoherence` top stink on `top.ref = "Initiative_Tracker row(s) 2; finding C117-3; storyline INIT-001:disbursement-active"`:
- Written `story.ref` becomes `"finding C117-3"` (sheet, row, and storyline dropped).
- `cron-desk-run.js:1269-1275` (`storylineTagFor` → `buildWorldSummary.resolveStoryline`) receives no `storyline ...` tag or `INIT-XXX` in `story.ref` and returns `null`.
- In `cron-desk-run.js:2577` (`validateCanonFacts`), `refFile(storyRef)` is `"finding"`, so a valid researcher fact citing `top.ref` (`"Initiative_Tracker row(s) 2; ..."`) fails `String(f.ref).startsWith(refFile(storyRef))` (`false`) and is rejected (`ref does not resolve`).
- Jax's prompt (`cron-desk-run.js:758`, `:2153`) still receives `CONTRADICTION B: The same Cycle <N> audit says no prior audit is available for comparison.`

---

### 3. Stripping `handle.angle` / `handle.hookLine` changes `trevor-shimizu`'s C117 pick
**Where:** `scripts/buildWorldSummary.js:1317`, `scripts/buildCivicDomainSlice.js:65`, `:485-494`, `:857-905`  
**What breaks:** Commit `3f016a164` states *"C117 old code + old signal vs new code + new signal, scratch roots: stink ranking, Jax pick, six civic-domain picks and the economic pick identical; Trevor's label now the record line."* That is false for `trevor-shimizu` on C117 because `buildCivicDomainSlice.js:491-492` (`entryText`) feeds `entry.handle.angle` and `entry.handle.hookLine` into `scoreEntryForSeat`, and pre-`pipeline.115` `output/desk_signal_c117.json` carried a checker-written `hookLine` mentioning transit on a non-transit `math-imbalance` pattern.  
**Concrete input → wrong output:** On C117 (`packetForEntries(entries, 'trevor-shimizu')` in `buildCivicDomainSlice.js`):
- With `output/desk_signal_c117.json` (`handle.angle` / `handle.hookLine` intact): `finding C117-4` (`Neighborhood_Map row(s) 6; finding C117-4`, `math-imbalance` on Fruitvale Sentiment/HousingPressure) carried `handle.hookLine = "The transit initiative carrying Fruitvale has not advanced in several cycles."`, matching Trevor's `/transit/` regex (`:65`) and winning `trevor-shimizu` (`story.ref = "Neighborhood_Map row(s) 6; finding C117-4"`).
- With `handle.angle` / `handle.hookLine` stripped per `buildWorldSummary.js:1317` (`citizensOnly`): `finding C117-4` scores `0` for `trevor-shimizu`, and Trevor's pick changes to `story.ref = "Initiative_Tracker row(s) 4; finding C117-9; storyline INIT-003:design-phase"` (`improvement (low) | Initiative "Fruitvale Transit Hub Phase II — Visioning" advanced: complete → design-phase`).

(The new pick is actually cleaner — the old hook hallucinated transit onto a Sentiment/HousingPressure pattern — but `trevor-shimizu`'s pick does change on C117. The other 5 civic-domain seats, `stink-scanner`, `newsroom-fanout` lane order, and `buildEconomicSlice` keep identical picks.)

---

### 4. `ailmentPerception` `improvement` metric sentence states a 1-cycle-stale delta as `"since the last reading"`
**Where:** `scripts/cron-civic-run.js:395-398`, `scripts/engine-auditor/detectImprovements.js:107-138`  
**What breaks:** `detectImprovements.js:108-134` creates `type: 'improvement'` patterns from `priorAudit.patterns[i].measurement` (`engine_audit_c{cycle-1}.json`), copying `priorP.measurement.observed` — which `measureRemedies.js:162` computed for `cycle - 2 → cycle - 1`. `cron-civic-run.js:395-398` formats `fields.expectedField` + `fields.observed` as:
`where + ': RetailVitality rose ' + Math.abs(n) + ' since the last reading.'`  
In Cycle `N`, that labels a `C(N-2) → C(N-1)` delta as `"since the last reading"`.  
**Concrete input → wrong output:** On live `output/engine_audit_c117.json`:
- Pattern `#14` (`INIT-007`, `affectedEntities.neighborhoods = ["West Oakland", "East Oakland", "Fruitvale"]`) carries `observed: 0.71` copied from `engine_audit_c116.json` (`priorCycle: 115`, i.e., **C115 → C116**).
- `ailmentPerception(a117.patterns[14])` returns:
  `"West Oakland, East Oakland, Fruitvale: RetailVitality rose 0.71 since the last reading."`
  `runPrep` (`cron-civic-run.js:642`) attaches this (prefixed `'Civis Systems\' readings flag this: '` on `HEAD` `b4510ce1f`) to the `INIT-007` decision topic for Mayor, Baylight, and `D1`/`D2`/`D3`/`D9`.
- Actual `Neighborhood_Map.RetailVitality` from C116 → C117 (`engine_audit_c116.json` → `engine_audit_c117.json`) moved `14.36 → 14.35` (`-0.01`) in West Oakland, `9.93 → 8.78` (`-1.15`) in East Oakland, and `13.94 → 15.16` (`+1.22`) in Fruitvale. The `+0.71` figure is false for C116 → C117. (Pattern `#15` across 18 neighborhoods has the same stale `0.71` from C115 → C116.)

---

### 5. Remaining leaks to Jax and City Hall (`freelance-firebrand`, `runDirective`, `world_summary`)
- **`.claude/agents/freelance-firebrand/RULES.md:72, 91, 94, 109` & `SKILL.md:32`:** Contrary to commit `3f016a164` (*"No agent file carried the strings"*), Jax's agent instructions still direct him to tag claims as `FACT(engine)` (`RULES.md:72, 91, 94`) and output `### Engine Returns` (`RULES.md:109`, `SKILL.md:32` `"engine returns"`), while `RULES.md:104` simultaneously forbids `"engine"` as a printed word. (All `.claude/agents/civic-office-*` files checked only use ordinary municipal `"audit"` terminology.)
- **`scripts/cron-civic-run.js:1461` (`runDirective`):** Mara Vance (`civic-office-director` / City Planning Director) receives the user prompt header `'=== ENGINE REVIEW HIGH READINGS (' + highs.length + ') — a reading, not a demand ==='`. (`civicMustDecide.js` itself has no callers in `scripts/` or `lib/`.)
- **`scripts/buildWorldSummary.js:588, 658, 1271-1272, 1352`:** `emitEngineReviewFindings` writes ``## Engine Review Findings (from `output/engine_audit_c${cycle}.json`)`` and `:658` cites ``output/engine_review_c${cycle}.md`` into `output/world_summary_c{N}.md`. (`cron-desk-run.js:1613` `cityWeekLines` strips audit/approval/initiative blocks via `notebooklmDailyNews.stripDailyNoise`, so test-shell reporters using `cityWeekLines` do not see it, though `world_summary_c{N}.md` itself still prints `engine_audit` / `engine_review` paths.)

---

## Checked Clean

- **Identity & Dedup (`Attack 1`):** `beatSliceKit.recordRef` matches `buildWorldSummary.emitDeskSignal` on `54 / 54` audit, initiative, and vote entries in `output/desk_signal_c117.json` (`0` diffs). Because both produce `<sheet> row(s) N; finding C<cycle>-<i>[; storyline …]`, dedup keys across `buildCivicDomainSlice.js:609`, `stink-scanner.js:136`, `newsroom-fanout.js` (`takenRefs` / `priorBeatKey`), and `reconcileRheaDisposition.js` align once `desk_signal` is rebuilt. `cron-desk-run.js:2569-2585` (`validateCanonFacts`) accepts `Neighborhood_Map row(s) 10; finding C117-5` and `Initiative_Tracker (InitiativeID INIT-008); storyline INIT-008:vote-scheduled` via `startsWith(refFile(storyRef))`. `livedExperiencePacketV2.js:537` drops `finding C\d+-\d+` strings from brief facts cleanly.
- **Picks (`Attack 3`, except Trevor above):** `stink-scanner` top-5 ranking (`61`, `51`, `51`, ...), `newsroom-fanout` `laneSeeds` order across `civic`/`business`/`culture`/`sports`, `buildEconomicSlice`, `buildSafetySlice`, `buildHealthSlice`, and the other 5 `buildCivicDomainSlice` seats keep identical C117 selections.
- **`ailmentPerception` `default:` (`Attack 5`):** Tested across all 16 C117 patterns and C116 patterns (`production-imbalance`, `anomaly`, `incoherence`, `writeback-drift`); none produce empty strings or `"engine"` speaker leaks (note `production-imbalance` in C117 `#8` prefixes the 19 neighborhood names before `"19 neighborhoods..."`, and `detectAnomalies.js` emits IDs like `POPID` which remain allowed under the 2026-10-18 ruling).

---

Verdict: SHIP-WITH-FIXES
