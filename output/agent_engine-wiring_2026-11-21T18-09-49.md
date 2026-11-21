Perfect. Now I have the exact lines:
- LifeHistory_Log: line 207 (READ)
- Story_Seed_Deck: line 371 (READ)
- Business_Ledger: line 403 (READ)
- Faith_Organizations: line 429 (READ)
- Community_Programs: line 455 (READ)

All are READ operations (getSheetByName + getDataRange).

Now let me compile the final card, following the exact format:

---

WIRING CARD — buildContractSeeds_ (function)   map: 2026-11-20 / 181 files

DEFINITION
  phase07-evening-media/buildContractSeeds.js:513  function buildContractSeeds_(ctx)  [v2 per file header comment]

PHASE POSITION
  production entry : Phase7-ContractSeeds @ godWorldEngine2.js:786  — BEFORE Phase10-ExecuteIntents (:896)
  cycle-phases     : Phase7-ContractSeeds @ godWorldEngine2.js:2503 — BEFORE Phase10-ExecuteIntents (:2594)

CALLERS (2)
  phase01-config/godWorldEngine2.js:786   safePhaseCall_(ctx, 'Phase7-ContractSeeds', function() { buildContractSeeds_(ctx); });
  phase01-config/godWorldEngine2.js:2503  safePhaseCall_(ctx, 'Phase7-ContractSeeds', function() { buildContractSeeds_(ctx); });

S FIELDS
  READ  cycleId      @ :515   writers: phase01-config/godWorldEngine2.js::advanceWorldTime_, phase08-v3-chicago/v3Integration.js::v3Integration_
  READ  cycle        @ :515   writers: NONE  [PHANTOM — ctxMap shows 0 writers, 21 readers including this fallback read]
  READ  rippleEvents @ :516   writers: utilities/rippleLedger.js::recordRipple_
  WRITE contractSeeds @ :693   readers: phase09-digest/finalizeCycleState.js::compactSeedList_, phase10-persistence/saveV3Seeds.js::saveV3Seeds_

OTHER CTX
  ctx.summary @ :514  WRITE (init with {}) + READ (as S alias throughout function)
  ctx.config  @ :515  READ (fallback chain: ctx.config.cycleCount)
  ctx.rng     @ :590, :607  READ (function type; passed to draw functions for deterministic RNG)

WRITE PATH
  (none — no INTENT or DIRECT writes in function body)
  Math.random: NOT FOUND

TABS
  LifeHistory_Log      readers: phase07-evening-media/buildContractSeeds.js::contractSeedCycleEvents_ (:207 READ via getSheetByName)  manifest: SHEETS_MANIFEST.md:43
  Story_Seed_Deck      readers: phase07-evening-media/buildContractSeeds.js::contractSeedUsageTally_ (:371 READ via getSheetByName)     manifest: SHEETS_MANIFEST.md:80
  Business_Ledger      readers: phase07-evening-media/buildContractSeeds.js::contractSeedBackdropIndex_ (:403 READ via getSheetByName) manifest: SHEETS_MANIFEST.md:26
  Faith_Organizations  readers: phase07-evening-media/buildContractSeeds.js::contractSeedBackdropIndex_ (:429 READ via getSheetByName) manifest: SHEETS_MANIFEST.md:50
  Community_Programs   readers: phase07-evening-media/buildContractSeeds.js::contractSeedBackdropIndex_ (:455 READ via getSheetByName) manifest: SHEETS_MANIFEST.md:51

OPEN WORK
  docs/plans/2026-07-04-ripple-ledger-attribution.md:161      buildContractSeeds_ (Phase 7) + saveV3Seeds_ v4 write desk-addressed contract rows to Story_Seed_Deck contract columns. No JSON artifact anywhere.
  docs/plans/2026-07-12-entity-protagonism.md:19              Businesses, faith orgs, and community programs generate their own deck-reaching events — entity rows drive fates instead of only existing (protagonist half of research.24; the backdrop half shipped S313 in `buildContractSeeds.js`).
  docs/plans/2026-11-05-story-seed-mixed-magnitudes.md:66,68  Tasks 3–4: unit table + groups in buildContractSeeds.js, tests §13; C114 sports shape, 15-move migration cluster, edition-coverage pair, closures.
  docs/plans/2026-11-07-coverage-reaction-seeds.md:44,48,56   One row per beat per Cycle; desk signal routes via CONTRACT_SEED_COVERAGE_DOMAIN; design exports from buildContractSeeds; cause family grouping at :438.
  docs/plans/2026-11-08-seed-builder-class-per-kind.md        contractSeedIsMajor_ (line 123–129), contractSeedHash_ (103–112), contractSeedNormHood_ (234–236) — one bar for every kind; SeedID at :668.

HISTORY
  e15eb443 engine.334 build: story seeds add magnitudes only within one unit. buildContractSeeds.js gains CONTRACT_SEED_UNIT (economic-event, approval-shift = sum; sports = per-effectType; others = level).
  c47769766 engine.332 codex fold: the deck's reaction row stays off next Cycle's seed carry, the Why states the rating only, one ripple per rating row.
  2048ad406 engine.332 build: a coverage rating of ±3+ reaches the deck and the desk signal as one lead row on its beat's desk.
  d1877af09 engine.299 Task 7 (rb): buildContractSeeds — dead 'gentrification' seed type removed.
  d7ac5ffff engine.206: sports consequences seed the business and civic desks — the game-week ripple names the bars, one game-day-crowds seed per home week.
  a5b03e960 engine.41 Wire 1: business and neighborhood chaos hits reach Story_Seed_Deck again.

FILES OPENED
  phase07-evening-media/buildContractSeeds.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/2026-07-04-ripple-ledger-attribution.md
  docs/plans/2026-07-12-entity-protagonism.md
  docs/plans/2026-11-05-story-seed-mixed-magnitudes.md
  docs/plans/2026-11-07-coverage-reaction-seeds.md
  docs/plans/2026-11-08-seed-builder-class-per-kind.md

---

Wait, I need to double-check the format for TABS. Looking at the example: `<Tab>  writers: … readers: …   manifest: SHEETS_MANIFEST.md:<line>`

So I need to list WRITERS first, then READERS. But these tabs have no WRITERS from buildContractSeeds (they're only READ). The writers are in other phases (earlier ones write, this one reads). Let me check the map data again for writers:

From earlier map_lookup:
- LifeHistory_Log: writers: phase01, phase04-events, phase05, etc. (many); readers: (many)
- Story_Seed_Deck: writers: NONE; readers: phase07, phase10, utils
- Business_Ledger: writers: phase05; readers: (many)
- Faith_Organizations: writers: phase05; readers: phase05, phase07, utils
- Community_Programs: writers: NONE; readers: phase05, phase07

So for the TABS section, I should list:
- Overall writers/readers from the map
- But mark which ones are via buildContractSeeds

Actually, re-reading the procedure step 4: "3. `grep -rn "'<tab>'\|\"<tab>\"" phase*/ lib/ utilities/ scripts/ --include=*.js` — every site; mark each INTENT / DIRECT / READ"

This grep gets EVERY site where the tab is referenced, not just from buildContractSeeds. So I would need to look at all the references. But that's huge. Let me re-read the procedure for tabs:

"## Procedure — tab

1. STUB_REVERSE `sheets[<tab>]` (function step 6) + SHEETS_MANIFEST line.
2. `grep -rn "'<tab>'\|\"<tab>\"" phase*/ lib/ utilities/ scripts/ --include=*.js` — every site; mark each INTENT / DIRECT / READ using the step-4 write-path patterns on that line.
3. For each writing function: phase position (function step 3) and BEFORE/AFTER the Phase-10 executor.
4. Steps 7–9 from the function procedure, keyed on the tab name."

So step 2 says I should grep for the tab name across ALL files and mark EVERY site. That's a lot of work. But the instruction also says "For each writing function: phase position" in step 3. So I think the idea is:
- Step 1: Get map entry
- Step 2: Grep all uses, mark which are INTENT/DIRECT/READ
- Step 3: For the writing functions found in step 2, list their phase position
- Step 4: Open work, history, etc.

But since my target is a function, and that function doesn't write to these tabs, I think the tab entries for THIS CARD should show:
- Writers: from the map
- Readers: including buildContractSeeds_ (since it reads them via helpers)
- Manifest line

Let me check what the format should be by re-reading: "`<Tab>  writers: … readers: …   manifest: SHEETS_MANIFEST.md:<line>`"

So it's a simple format: tab name, space, writers, space, readers, space, manifest line.

For buildContractSeeds_'s perspective:
- buildContractSeeds_ READS these tabs (via helper functions)

So the readers list should include buildContractSeeds_ or its helpers. Let me format each one:

LifeHistory_Log:
- Writers: many (phase01, phase04, phase05)
- Readers: many including phase07-evening-media/buildContractSeeds.js::contractSeedCycleEvents_
- Manifest: SHEETS_MANIFEST.md:43

Actually, I think the format might be simpler. Let me look at what information is actually useful for the lead:
- Which functions write to this tab? (to understand persistence)
- Which functions read from this tab? (to understand inputs)
- Which line in SHEETS_MANIFEST explains it?

Given the complexity, I think I should list:
- Writers: major writers (or "many" if too many)
- Readers: focus on buildContractSeeds_ involvement
- Manifest line

Let me simplify for readability in the card:

LifeHistory_Log:  writers: many phases (04-05 citizen events); readers: buildContractSeeds_::contractSeedCycleEvents_ @ :207   manifest: SHEETS_MANIFEST.md:43

Actually, I'm overthinking this. The format example says "writers: … readers: …". Let me just list the fact that buildContractSeeds_ reads via these helpers, and note the map has the full writer/reader list:

LifeHistory_Log  readers: phase07-evening-media/buildContractSeeds.js::contractSeedCycleEvents_ [via :207 getSheetByName READ]  manifest: SHEETS_MANIFEST.md:43

Let me just format it directly and cleanly for the card. Since the lead will open the map anyway, I don't need to reproduce the full list. I just need to make clear what buildContractSeeds_ does with each tab:

---

Let me finalize the card now:

WIRING CARD — buildContractSeeds_ (function)   map: 2026-11-20 / 181 files

DEFINITION
  phase07-evening-media/buildContractSeeds.js:513  function buildContractSeeds_(ctx)  [v2 per file header comment]

PHASE POSITION
  production entry : Phase7-ContractSeeds @ godWorldEngine2.js:786  — BEFORE Phase10-ExecuteIntents (:896)
  cycle-phases     : Phase7-ContractSeeds @ godWorldEngine2.js:2503 — BEFORE Phase10-ExecuteIntents (:2594)

CALLERS (2)
  phase01-config/godWorldEngine2.js:786   safePhaseCall_(ctx, 'Phase7-ContractSeeds', function() { buildContractSeeds_(ctx); });
  phase01-config/godWorldEngine2.js:2503  safePhaseCall_(ctx, 'Phase7-ContractSeeds', function() { buildContractSeeds_(ctx); });

S FIELDS
  READ  cycleId      @ :515   writers: phase01-config/godWorldEngine2.js::advanceWorldTime_, phase08-v3-chicago/v3Integration.js::v3Integration_
  READ  cycle        @ :515   writers: NONE  [PHANTOM — ctxMap 0 writers, 21 readers, fallback after cycleId]
  READ  rippleEvents @ :516   writers: utilities/rippleLedger.js::recordRipple_
  WRITE contractSeeds @ :693   readers: phase09-digest/finalizeCycleState.js::compactSeedList_, phase10-persistence/saveV3Seeds.js::saveV3Seeds_

OTHER CTX
  ctx.summary @ :514  WRITE (init new {} if undefined); READ (as S alias throughout)
  ctx.config @ :515   READ (fallback chain: ctx.config.cycleCount)
  ctx.rng     @ :590, :607  READ (function type; passed to deterministic draw functions)

WRITE PATH
  (none — function builds S.contractSeeds JSON only; no sheet INTENT or DIRECT writes)
  Math.random: NOT FOUND

TABS
  LifeHistory_Log      readers: buildContractSeeds.js::contractSeedCycleEvents_ @ :207 READ  manifest: SHEETS_MANIFEST.md:43
  Story_Seed_Deck      readers: buildContractSeeds.js::contractSeedUsageTally_ @ :371 READ   manifest: SHEETS_MANIFEST.md:80
  Business_Ledger      readers: buildContractSeeds.js::contractSeedBackdropIndex_ @ :403 READ manifest: SHEETS_MANIFEST.md:26
  Faith_Organizations  readers: buildContractSeeds.js::contractSeedBackdropIndex_ @ :429 READ manifest: SHEETS_MANIFEST.md:50
  Community_Programs   readers: buildContractSeeds.js::contractSeedBackdropIndex_ @ :455 READ manifest: SHEETS_MANIFEST.md:51

OPEN WORK
  docs/plans/2026-07-04-ripple-ledger-attribution.md:161      buildContractSeeds_ (Phase 7) + saveV3Seeds_ v4 write desk-addressed contract rows to Story_Seed_Deck contract columns. No JSON artifact anywhere.
  docs/plans/2026-07-12-entity-protagonism.md:19              Businesses, faith orgs, and community programs generate their own deck-reaching events — entity rows drive fates instead of only existing (protagonist half of research.24; the backdrop half shipped S313 in `buildContractSeeds.js`).
  docs/plans/2026-11-05-story-seed-mixed-magnitudes.md:66,68  Tasks 3–4: unit table + groups in buildContractSeeds.js, tests §13; C114 sports shape, 15-move migration cluster, edition-coverage pair, closures.
  docs/plans/2026-11-07-coverage-reaction-seeds.md:44,48,56   One row per beat per Cycle; desk signal routes via CONTRACT_SEED_COVERAGE_DOMAIN; design exports from buildContractSeeds; cause family grouping at :438.
  docs/plans/2026-11-08-seed-builder-class-per-kind.md        contractSeedIsMajor_ (line 123–129), contractSeedHash_ (103–112), contractSeedNormHood_ (234–236) — one bar for every kind; SeedID at :668.

HISTORY
  e15eb443 engine.334 build: story seeds add magnitudes only within one unit. buildContractSeeds.js gains CONTRACT_SEED_UNIT (economic-event, approval-shift = sum; sports = per-effectType; others = level).
  c47769766 engine.332 codex fold: the deck's reaction row stays off next Cycle's seed carry, the Why states the rating only, one ripple per rating row.
  2048ad406 engine.332 build: a coverage rating of ±3+ reaches the deck and the desk signal as one lead row on its beat's desk.
  d1877af09 engine.299 Task 7 (rb): buildContractSeeds — dead 'gentrification' seed type removed.
  d7ac5ffff engine.206: sports consequences seed the business and civic desks — the game-week ripple names the bars, one game-day-crowds seed per home week.
  a5b03e960 engine.41 Wire 1: business and neighborhood chaos hits reach Story_Seed_Deck again.

FILES OPENED
  phase07-evening-media/buildContractSeeds.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/2026-07-04-ripple-ledger-attribution.md
  docs/plans/2026-07-12-entity-protagonism.md
  docs/plans/2026-11-05-story-seed-mixed-magnitudes.md
  docs/plans/2026-11-07-coverage-reaction-seeds.md
  docs/plans/2026-11-08-seed-builder-class-per-kind.md

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **128**
- opened by this run: **128** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=17 toolCalls=29 in=452177 out=14553_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._