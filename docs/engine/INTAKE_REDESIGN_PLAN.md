# Intake Pipeline Redesign Plan

**Created:** Session 98 (2026-03-16)
**Status:** IMPLEMENTED — editionIntake.js v2.0 deployed, processIntake.js deleted, engine wired
**Author:** Mags Corliss (Plan mode)

---

## What Exists Today

### The Pipeline (3 scripts, 8 sheets, 2 promotion steps)

```
Published Edition (.md file)
    |
    v
editionIntake.js v1.4 -----> 4 staging sheets:
    |                           Media_Intake (articles)
    |                           Storyline_Intake (storylines)
    |                           Citizen_Usage_Intake (citizen mentions)
    |                           Business_Intake (businesses)
    v
processIntake.js v1.2 -----> 3 final ledgers + 2 routing sheets:
    |                           Press_Drafts (articles)
    |                           Storyline_Tracker (storylines)
    |                           Citizen_Media_Usage (usage log)
    |                           Intake (new citizens for engine)
    |                           Advancement_Intake1 (existing citizen updates)
    v
processBusinessIntake.js ---> Business_Ledger (with BIZ-ID)
    v
enrichCitizenProfiles.js ---> Simulation_Ledger LifeHistory column
```

### What's Broken

1. **editionIntake.js writes garbage.** 852 junk rows from one edition. Full demographic strings ("Bruce Wright, 48, Downtown, Line cook") jammed into CitizenName column. The parser doesn't match the actual edition format.

2. **The staging-to-promotion pipeline is fragile.** Two scripts, two steps, calendar injection, column-shift bugs, explicit range notation to work around Sheets API quirks. Every step can fail silently.

3. **Nobody reads the output.** Press_Drafts (137 rows) — nothing reads it. Citizen_Media_Usage (1,117 rows) — nothing reads it meaningfully. These are write-only graveyards.

4. **New citizens don't reliably reach the ledger.** processIntake.js tries to parse demographics from the CitizenName field, but the format varies wildly. Intake sheet has 0 rows — no new citizen has ever been promoted this way.

5. **Storyline tracking is half-wired.** storylineHealthEngine.js and storylineWeavingEngine.js exist but are NOT called in the engine orchestrator. The engine writes to Storyline_Tracker but doesn't read it back meaningfully.

### What Works

- **Business path:** editionIntake detects businesses, processBusinessIntake promotes with BIZ-ID, duplicate detection works. This is the cleanest path.
- **enrichCitizenProfiles.js:** Reads editions, writes LifeHistory entries tagged with edition numbers. Clean, idempotent, useful.
- **Edition structured sections:** Every edition produces a Names Index per article, a Citizen Usage Log (categorized), Storylines Updated, Continuity Notes with canon figures and quotes. The structured data is good — the parser is bad.
- **Story hooks:** The engine generates "this is newsworthy" signals. v3.9 expanded coverage to ~90%. This is the right engine→newsroom signal mechanism.

---

## Design Answers

### Q1: How do new citizens in editions make it to the ledger?

**Current path:** Edition → editionIntake → Citizen_Usage_Intake → processIntake → Intake sheet → engine reads on next cycle → Simulation_Ledger.

**Problem:** This path has never successfully promoted a single citizen. The Intake sheet has 0 rows.

**Proposed path:**

Editions already declare new canon in two places:
1. **Continuity Notes > "New canon figures confirmed this edition"** — explicit list with name, age, neighborhood, role
2. **Names Index** — every person in every article with structured parenthetical data

The redesigned intake should:
- Parse the Continuity Notes "New canon figures" section as the PRIMARY source for new citizens (these are editorially confirmed)
- Cross-reference against Simulation_Ledger by First+Last name
- Stage new citizens to the Intake sheet with properly separated columns (First, Last, Neighborhood, RoleType, BirthYear calculated from age, Tier 4, ClockMode ENGINE)
- The engine's existing processAdvancementIntake already reads the Intake sheet during a cycle run

**No new sheets needed.** The Intake sheet (16 cols) already exists and the engine already reads it. The problem is purely that nothing writes to it cleanly.

### Q2: How do new businesses make it to the ledger?

**Current path works.** editionIntake.js → Business_Intake → processBusinessIntake.js → Business_Ledger with BIZ-ID.

**Fix needed:** The business detection in editionIntake relies on regex patterns ("grand opening of X", quoted names in Business Ticker). It misses businesses introduced in non-Business articles. The Continuity Notes sometimes list new venues/businesses too.

**Proposed improvement:**
- Keep the current Business_Intake → Business_Ledger path
- Add Continuity Notes parsing for new venues/businesses (they often appear as "New canon figures" or are mentioned alongside citizens)
- The business intake path is the one part of the pipeline that actually works — don't over-engineer it

### Q3: How should storylines be tracked? Does the engine need a storyline ledger?

**Current state:**
- Storyline_Tracker exists (25 columns, ~145 rows)
- The engine writes to it (via mediaRoomIntake from Media Room) and reads from it (storyHookEngine checks for dormant storylines)
- updateStorylineStatus marks storylines dormant/abandoned based on coverage gaps
- storylineHealthEngine (wrap-up/fizzle detection) EXISTS but is NOT CALLED
- storylineWeavingEngine (citizen roles, cross-storyline links) EXISTS but is NOT CALLED

**The answer: Storylines are editorial, not engine.** The engine tracks arcs (Event_Arc_Ledger) — multi-cycle phenomena like housing crises, playoff fever, economic shocks. Those are simulation state. Storylines are the newsroom's way of saying "we're following this." That's editorial judgment.

**Proposed design:**

Keep Storyline_Tracker but simplify what feeds it. Currently it gets data from two sources:
1. The engine's Media Room (mediaRoomIntake) — creates storylines from engine events
2. Edition intake (editionIntake → Storyline_Intake → processIntake) — creates storylines from published articles

Source #1 is engine-generated and useful. Source #2 is the feedback loop — what the newsroom actually covered becomes a tracked storyline. Both should continue.

**What to activate:**
- Wire storylineHealthEngine into Phase 6 (1 line in godWorldEngine2.js). This generates STALE_STORYLINE and STORYLINE_FIZZLED hooks so the engine can tell the newsroom "you haven't covered this in a while" or "this story died."
- Wire storylineWeavingEngine into Phase 7 (1 line in godWorldEngine2.js). This populates CitizenRoles and CrossStorylineLinks so desk agents can see which citizens appear in multiple storylines.

**What NOT to do:**
- Don't create a new storyline sheet. Storyline_Tracker works.
- Don't try to make storylines engine-deterministic. They're editorial.

### Q4: What should the engine point the newsroom toward?

**The engine already does this via Story Hooks.** Story_Hook_Deck has 16 columns and ~46 rows. storyHookEngine (v4.0) generates hooks from arcs, domains, weather, sentiment, world events, pattern flags, holidays, sports, and storylines.

**The v3.9 fix made this much better.** buildCyclePacket.js now serializes 22 sections (~90% of engine output). buildDeskPackets.js parses all 22 into evening context for desk agents. The desk agents now receive:
- Neighborhood Dynamics (12 hoods x 6 metrics)
- Story Hooks (engine's "this is newsworthy")
- Shock Context, Migration, Spotlight Detail, Neighborhood Economies
- Cycle Summary, Demographic Shifts, City Events

**What's still missing:** The story hooks reach desk agents in the briefing, but there's no mechanism for the newsroom to say "we covered this hook" or "this hook led to an article." The feedback loop is one-way.

**Proposed addition:** When an edition lists its STORYLINES UPDATED section, match those storylines against the Story_Hook_Deck hooks that generated them. Mark hooks as "covered" so the engine doesn't keep generating the same signal. This is a lightweight column update on Story_Hook_Deck, not a new system.

### Q5: Do you need a ledger to track a story?

**No.** The Storyline_Tracker is sufficient. It has: type, description, neighborhood, related citizens, priority, status, coverage gap tracking, linked arc IDs, and citizen roles (once weaving is activated).

A "story ledger" would imply tracking individual articles across editions — that's what Press_Drafts was supposed to be, and nothing reads it. The useful tracking is at the storyline level: "We're following the OARI implementation" is more valuable than "Carmen wrote 3 articles about OARI."

**What would be more useful than a story ledger:** A coverage heat map. Which neighborhoods got covered this cycle? Which citizens appeared? Which storylines advanced? This is a query, not a sheet — run it from the data that already exists in Citizen_Media_Usage and Storyline_Tracker.

---

## Implementation Plan

### Phase 1: Fix editionIntake.js (the parser)

**Goal:** Make editionIntake.js correctly parse edition structured sections and write clean data to staging sheets.

**What to fix:**
1. **Citizen Usage Log parser** — The edition format is categorized (CIVIC OFFICIALS, CITIZENS QUOTED, JOURNALISTS, CULTURAL, etc.). Each category has a specific format:
   - Civic: `— Name (Title, Faction)`
   - Citizens: `— Name, Age, Neighborhood, Occupation (context)`
   - Journalists: `— Name (N articles)`
   - Cultural: `— Name (Role, Location)`

   The parser must handle each category separately instead of dumping everything into one format.

2. **New canon figures parser** — Parse the Continuity Notes "New canon figures confirmed this edition" section. Extract: Name, Age/Role, Neighborhood. These are the citizens that need Intake sheet staging.

3. **Storyline parser** — Already handles pipe-separated format. Verify it works with real edition output.

4. **Business parser** — Already detects businesses. Add Continuity Notes scanning.

**Files to modify:** `scripts/editionIntake.js`
**Verification:** Run against Edition 87 with --dry-run. Zero garbage rows. Every citizen has a clean name in CitizenName, POPID resolved where possible, UsageType matches the category.

### Phase 2: Simplify processIntake.js (the promoter)

**Goal:** Remove the broken demographic parsing. Citizens should arrive at processIntake with clean, separated fields — not "Bruce Wright, 48, Downtown, Line cook" in a single column.

**What to fix:**
1. **Citizen_Usage_Intake format change** — editionIntake should write separated columns: CitizenName (just the name), POPID, UsageType, Context, Reporter, Neighborhood, Role, Age. processIntake should NOT try to parse demographics from the name field.

2. **Citizen routing** — Keep the Intake (new) vs Advancement_Intake1 (existing) split. Fix the column writes to match sheet headers exactly.

3. **Remove calendar injection from citizen rows** — Calendar context belongs on articles and storylines, not on every citizen mention. It adds 6 columns of noise.

4. **Drop Press_Drafts promotion** — Nothing reads Press_Drafts. The edition file IS the article record. Stop writing articles to a sheet nobody reads.

**Files to modify:** `scripts/processIntake.js`
**Verification:** Run against clean editionIntake output. Intake sheet gets properly formatted new citizens. Advancement_Intake1 gets existing citizen notes. No column-shift bugs.

### Phase 3: Wire dormant engine components

**Goal:** Activate storylineHealthEngine and storylineWeavingEngine.

**What to do:**
1. Add `safePhaseCall_(ctx, 'Phase6-StorylineHealth', function() { monitorStorylineHealth_(ctx); });` after the existing updateStorylineStatus call in godWorldEngine2.js
2. Add `safePhaseCall_(ctx, 'Phase7-StorylineWeaving', function() { weaveStorylines_(ctx); });` in Phase 7 of godWorldEngine2.js
3. Verify both functions work with current sheet data (they may need header adjustments)

**Files to modify:** `phase01-config/godWorldEngine2.js`
**Verification:** Run a cycle. Check Storyline_Tracker for IsStale, WrapUpGenerated, CitizenRoles, CrossStorylineLinks columns populated. Check Story_Hook_Deck for STALE_STORYLINE and CROSS_STORYLINE hooks.

### Phase 4: Clean up dead sheets

**Goal:** Stop writing to sheets nothing reads.

**What to drop:**
1. **Press_Drafts writes** — Remove from processIntake.js. The edition file is the article record.
2. **Media_Intake** — If Press_Drafts is dropped, Media_Intake has no consumer. Remove from editionIntake.js.
3. **Citizen_Media_Usage calendar columns** — 6 columns of calendar data that nothing queries. Keep Timestamp, Cycle, CitizenName, UsageType, Context, Reporter. Drop Season through SportsSeason.

**What to keep:**
- Citizen_Usage_Intake (staging)
- Citizen_Media_Usage (final log, simplified)
- Storyline_Intake (staging)
- Storyline_Tracker (final)
- Business_Intake (staging)
- Business_Ledger (final)
- Intake (new citizens for engine)
- Advancement_Intake1 (existing citizen updates)

**Files to modify:** `scripts/editionIntake.js`, `scripts/processIntake.js`
**Verification:** Run full pipeline. Same useful output, fewer dead writes.

### Phase 5: Hook coverage feedback

**Goal:** Let the engine know which story hooks led to articles.

**What to do:**
1. When processIntake promotes storylines, match storyline descriptions against Story_Hook_Deck HookText
2. Mark matched hooks with a "Covered" status and the cycle they were covered
3. storyHookEngine can then deprioritize hooks that have already been covered

**Files to modify:** `scripts/processIntake.js` (matching logic), `phase07-evening-media/storyHook.js` (read Covered status)
**Verification:** After intake, Story_Hook_Deck shows hooks marked as covered. Next cycle generates fewer duplicate hooks.

---

## Sheet Changes Summary

| Sheet | Current | Proposed |
|-------|---------|----------|
| Media_Intake | 7 cols, staging for articles | DROP — nothing reads the output |
| Press_Drafts | 14 cols, promoted articles | DROP WRITES — edition files are the record |
| Citizen_Usage_Intake | 6 cols | MODIFY — add Neighborhood, Role, Age as separate cols |
| Citizen_Media_Usage | 12 cols | SIMPLIFY — drop 6 calendar cols, keep 6 core |
| Storyline_Intake | 6 cols | KEEP as-is |
| Storyline_Tracker | 25 cols | KEEP — activate health + weaving engines |
| Business_Intake | 6 cols | KEEP as-is |
| Business_Ledger | 9 cols | KEEP as-is |
| Intake | 16 cols | KEEP — fix what writes to it |
| Advancement_Intake1 | 10 cols | KEEP — fix what writes to it |
| Story_Hook_Deck | 16 cols | ADD "Covered" + "CoveredCycle" cols |

---

## What This Does NOT Do

- Does not create new sheets
- Does not change the engine's simulation logic
- Does not change how desk agents write editions
- Does not change the edition template format
- Does not touch the Simulation_Ledger directly
- Does not add features beyond what's asked

## Priority Order

Phase 1 (parser fix) is the blocker. Everything else depends on clean data from editionIntake.js. Phase 3 (engine wiring) is independent and could be done in parallel. Phases 2, 4, 5 build on Phase 1.
