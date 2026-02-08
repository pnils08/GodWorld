# Branch Handoff: claude/read-documentation-JRbqb

**Created:** 2026-02-07 | **Session:** 9 | **Status:** Ready to merge

---

## What This Branch Does

Fixes bugs in `updateTransitMetrics.js` (v1.0 → v1.1) and `faithEventsEngine.js` (v1.0 → v1.1), and wires both engines' story signals into the Phase 6 orchestrator.

---

## Files Changed

| File | Change |
|------|--------|
| `phase02-world-state/updateTransitMetrics.js` | v1.0 → v1.1 — event timing, double-counting, dayType, null safety |
| `phase04-events/faithEventsEngine.js` | v1.0 → v1.1 — simMonth fix, namespace collision, version bump |
| `phase01-config/godWorldEngine2.js` | Added `Phase6-TransitSignals` + `Phase6-FaithSignals` to both V2 and V3 pipelines; V3 faith placement documented |

---

## Transit Fixes (updateTransitMetrics.js v1.1)

### 1. Phase 2 Event Timing (bug)
**Problem:** `updateTransitMetrics_Phase2_()` read `S.worldEvents`, but world events are generated in Phase 4 — so the array was always empty at Phase 2. Event-based modifiers (ridership boost, traffic increase, game day detection) never fired.

**Fix:** New function `loadPreviousCycleEvents_()` reads `WorldEvents_Ledger` for cycle N-1. Transit now reacts to the previous cycle's event patterns. Uses `getCachedSheet_` when available, falls back to direct sheet access.

### 2. Transit Story Signals Not Wired (dead code)
**Problem:** `getTransitStorySignals_()` existed but was never called. Transit data never generated story hooks for the media pipeline.

**Fix:** Added `Phase6-TransitSignals` call in `godWorldEngine2.js` after `Phase6-Textures` in both V2 and V3 orchestrator pipelines. Results stored at `ctx.summary.transitStorySignals`. Guarded with `typeof` check for backward safety.

### 3. dayType Magic Number
**Problem:** Weekend probability was hardcoded as `0.286` with no explanation.

**Fix:** Added `TRANSIT_FACTORS.WEEKEND_PROBABILITY = 2 / 7` as a named constant. Holiday detection now checks `S.holiday` from Phase 1 directly (handles both empty string and `'none'`).

### 4. Double-Counting in countMajorEvents_
**Problem:** A SPORTS event with severity "high" was counted twice (once for domain, once for severity).

**Fix:** Changed to else-if — domain match (SPORTS/CELEBRATION/FESTIVAL) takes priority, severity only counted for non-domain-matched events.

### 5. Demographics Null Safety
**Problem:** `demo.students + demo.adults + demo.seniors || 1000` was fragile — individual undefined fields could produce NaN.

**Fix:** Each field individually coerced with `Number() || 0`, total calculated, ratio uses ternary guard on `totalPop > 0`.

---

## Faith Fixes (faithEventsEngine.js v1.1)

### 6. Holy Day Month Uses Real Date (bug)
**Problem:** `var month = now.getMonth() + 1;` used `ctx.now` (real wall clock) for holy day lookups. But the simulation has its own calendar — `S.simMonth` is set by Phase 1 (`advanceSimulationCalendar_`). Holy days were based on the real-world month instead of the simulation month.

**Fix:** Replaced with `var month = S.simMonth || 1;` — reads from Phase 1 calendar output.

### 7. `shuffleArray_` Namespace Collision Risk
**Problem:** `shuffleArray_` is a generic name in GAS flat namespace. Any other file defining the same function would silently override it — same class of bug as the `extractCitizenNames_` collision fixed in Session 7.

**Fix:** Renamed to `shuffleFaithOrgs_()` (both definition and call site).

### 8. Faith Story Signals Not Wired (dead code)
**Problem:** `getFaithStorySignals_()` existed but was never called from the orchestrator. Faith events generated `S.faithEvents.byType` counts but never converted them into story signals for downstream consumers.

**Fix:** Added `Phase6-FaithSignals` call in `godWorldEngine2.js` after `Phase6-TransitSignals` in both V2 and V3 pipelines. Results stored at `ctx.summary.faithStorySignals`. Guarded with `typeof` check.

### 9. V3 Pipeline: Faith Runs Before World Events
**Known limitation documented:** In V3 pipeline, faith events run in Phase 3 (`Phase3-Faith`) before any world events engine. `detectCrisisConditions_()` reads an empty `S.worldEvents` array, so crisis detection works only via sentiment threshold (< -0.5). V2 pipeline has correct ordering (faith in Phase 4 after `worldEventsEngine_`). Added comment to V3 pipeline documenting this.

---

## How To Merge

```bash
cd ~/GodWorld
git fetch origin claude/read-documentation-JRbqb
git checkout main
git merge origin/claude/read-documentation-JRbqb
git push origin main
```

Then deploy:
```bash
clasp push
```

---

## Cascade Impact

- **Phase 6 consumers** can now read `ctx.summary.transitStorySignals` and `ctx.summary.faithStorySignals` (arrays of signal objects with type, priority, headline, desk, data)
- **No breaking changes** — all additions are guarded with `typeof` checks
- **New sheet read** — `loadPreviousCycleEvents_()` reads `WorldEvents_Ledger` once per cycle (uses sheetCache if available)
- **No new sheets created**, no schema changes
- **Holy day generation** now follows simulation calendar, not real date

---

## Game Mode Fixes (generateGameModeMicroEvents.js v1.3)

### 10. Direct Sheet Writes Bypass Write-Intents (architecture violation)
**Problem:** `Simulation_Ledger` was updated via `setValues()` and `LifeHistory_Log` via `setValues()` directly during Phase 5. This bypasses the write-intents model — if the cycle crashes after these writes, data is partially committed with no rollback.

**Fix:** Converted to `queueRangeIntent_()` for Simulation_Ledger and `queueBatchAppendIntent_()` for LifeHistory_Log. Both deferred to Phase 10 persistence. Fallback to direct write if write-intents not loaded.

### 11. `mulberry32_` Namespace Collision (10 copies)
**Problem:** `mulberry32_` is defined identically in 10 files. In GAS flat namespace, only one definition wins. Currently not breaking (all copies identical), but any change to one copy silently affects all engines.

**Fix:** Renamed to `mulberry32GameMode_()` in this file. The other 9 copies are a separate cleanup task — document in SESSION_CONTEXT.md for future session.

---

## Planned Upgrade: Tier-Aware Life Events for GAME Citizens

### Problem
GAME-mode citizens (A's, Bulls, media, civic, public figures) only receive events from
`generateGameModeMicroEvents.js`. SIM citizens get events from ~14 engines. This means
GAME citizens like Vinnie Keane have barely any life history — their lore is 100% dependent
on user-written content from the media room.

### Design Intent
Every engine should impact citizens. Life events should correlate with the world state.

### Rules
1. **No video game content auto-populates.** Contract negotiations, game results, trades,
   anything tied to A's/Bulls gameplay — the user provides that. This engine covers their
   life OUTSIDE the video game.
2. **Neighborhood matters.** All citizen events should factor in the neighborhood they live in
   (already listed per citizen). Tier 1 citizens get events tied to their local area.
3. **World state correlation.** Events must align with current conditions — no "took a walk"
   during a rainy week. Weather, transit, faith events, and other engine outputs should
   influence what life events are generated.
4. **Tier-based event types:**
   - **Tier 1** (highly visible public figures): Local figure events — attended concerts,
     seen at hot restaurants, neighborhood happenings. The kind of events a public figure
     has in their personal life.
   - **Tier 3-4** (generic citizens): Mainly daily routine events.

### Dependencies
- Restaurant engine output (hot restaurants)
- Weather engine output (rainy week = indoor events)
- Neighborhood data per citizen
- Event/concert calendar or world events output
- Tier classification per citizen

### Status
Design concept only. NOT approved for implementation. Requires explicit user approval before
any code is written.

---

## Planned Initiative: GodWorld Wix Front-End

### Overview
Build a public-facing website on Wix that displays GodWorld simulation data. The simulation
continues to run on Google Apps Script / Google Sheets — Wix is a read-only display layer.
No simulation logic moves to Wix.

### Architecture

```
Google Sheets (data) → Apps Script doGet() API → Wix Velo fetch() → Wix Pages
```

- **Google Apps Script**: New `wixAPI.gs` file with `doGet(e)` function deployed as a web app.
  Returns JSON for each data category.
- **Wix Velo**: Backend `.jsw` files call the API. Frontend page code populates Wix elements
  (repeaters, text, dynamic pages).
- **Data is read-only on Wix.** No writes back to Google Sheets from the website.

---

### Phase 1: Core Pages (MVP)

| Page | Data Source Sheets | What It Shows |
|---|---|---|
| **World Dashboard** | `World_Population`, `Cycle_Weather`, `Transit_Metrics`, `Domain_Tracker` | Current cycle, population stats, weather, transit on-time %, crime index, sentiment, dominant domain. A snapshot of Oakland right now. |
| **Citizen Directory** | `Simulation_Ledger`, `Generic_Citizens`, `Chicago_Citizens` | Searchable/filterable list of all citizens. Name, tier, neighborhood, occupation, status. Click to open profile. |
| **Citizen Profile** (dynamic) | `Simulation_Ledger`, `LifeHistory_Log`, `Relationship_Bonds`, `Citizen_Media_Usage`, `Cultural_Ledger` | Full bio page per citizen: identity, neighborhood, tier, life event timeline, relationship bonds, media appearances, cultural fame score. |
| **Neighborhood Explorer** | `Neighborhood_Map`, `Neighborhood_Demographics` | Each of the ~15 Oakland neighborhoods: nightlife profile, crime index, retail vitality, sentiment, demographic markers. Who lives there. |

**API endpoints for Phase 1:**
```
?action=world-state       → latest World_Population row + weather + transit
?action=citizens          → merged citizen list (Sim_Ledger + Generic + Chicago)
?action=citizen&id=POPID  → single citizen + life history + bonds + media usage
?action=neighborhoods     → Neighborhood_Map + Demographics latest rows
```

---

### Phase 2: Content Pages

| Page | Data Source Sheets | What It Shows |
|---|---|---|
| **Riley Digest** | `Riley_Digest` | The published newspaper output each cycle — the primary narrative artifact of GodWorld. Displayed as a styled newspaper page. |
| **World Events Timeline** | `WorldEvents_V3_Ledger`, `WorldEvents_Ledger` | Scrollable timeline of all world events. Filter by domain (CIVIC, CRIME, HEALTH, etc.), severity, neighborhood. |
| **Event Arcs** | `Event_Arc_Ledger` | Active and resolved story arcs. Tension level, phase, neighborhood, citizen count, resolution type. |

**API endpoints for Phase 2:**
```
?action=digest&cycle=N    → Riley_Digest for cycle N (or latest)
?action=events&limit=50   → WorldEvents_V3_Ledger rows, newest first
?action=arcs              → Event_Arc_Ledger active + recently resolved
```

---

### Phase 3: Governance & Culture

| Page | Data Source Sheets | What It Shows |
|---|---|---|
| **City Hall** | `Civic_Office_Ledger`, `Election_Log`, `Initiative_Tracker` | Current office holders, upcoming elections, active initiatives with vote status and budget. |
| **Cultural Scene** | `Cultural_Ledger`, `Media_Ledger` | Famous figures, cultural domains, fame scores, trend trajectories. Media appearances and spread. |
| **Sports Hub** | `Sports_Feed`, `Oakland_Sports_Feed`, `Chicago_Feed`, `Sports_Calendar` | A's and Bulls game results, sports calendar, game day impact on the city. |

**API endpoints for Phase 3:**
```
?action=civic             → office holders + initiatives
?action=culture           → Cultural_Ledger top figures
?action=sports            → Sports_Feed + Calendar
```

---

### Phase 4: Advanced Features

| Feature | Description |
|---|---|
| **Live Cycle Updates** | Auto-refresh dashboard when a new cycle runs (poll API every few minutes) |
| **Relationship Web** | Visual graph of citizen bonds using a JS graph library (D3.js or vis.js) in a Wix HTML embed |
| **Historical Trends** | Charts showing population, sentiment, crime over time using `World_Population` historical rows |
| **Media Room** (read-only) | Display `Media_Briefing` content — what the press desk received each cycle |
| **Story Arc Tracker** | Visual lifecycle of arcs from creation through escalation to resolution |

---

### Google Apps Script: `wixAPI.gs` Blueprint

```javascript
// wixAPI.gs — Deploy as Web App (Execute as: Me, Access: Anyone)

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var handlers = {
    'world-state':   function() { return serveWorldState_(ss); },
    'citizens':      function() { return serveCitizens_(ss); },
    'citizen':       function() { return serveCitizen_(ss, e.parameter.id); },
    'neighborhoods': function() { return serveNeighborhoods_(ss); },
    'digest':        function() { return serveDigest_(ss, e.parameter.cycle); },
    'events':        function() { return serveEvents_(ss, e.parameter.limit); },
    'arcs':          function() { return serveArcs_(ss); },
    'civic':         function() { return serveCivic_(ss); },
    'culture':       function() { return serveCulture_(ss); },
    'sports':        function() { return serveSports_(ss); }
  };

  var handler = handlers[action];
  if (!handler) {
    return jsonResponse_({ error: 'Unknown action: ' + action });
  }
  return handler();
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Each `serve*_()` function reads the relevant sheet(s), converts rows to objects using
column headers, and returns via `jsonResponse_()`.

---

### Wix Site Structure

```
godworldoakland.com/
├── /                    → World Dashboard (landing page)
├── /citizens            → Citizen Directory (searchable list)
├── /citizens/{id}       → Citizen Profile (dynamic page)
├── /neighborhoods       → Neighborhood Explorer
├── /digest              → Riley Digest (latest edition)
├── /digest/{cycle}      → Riley Digest (specific cycle)
├── /events              → World Events Timeline
├── /arcs                → Event Arc Tracker
├── /city-hall           → Civic Government
├── /culture             → Cultural Scene
└── /sports              → Sports Hub
```

---

### Citizen Merge Logic (3 sheets → 1 unified list)

| Field | Simulation_Ledger | Generic_Citizens | Chicago_Citizens |
|---|---|---|---|
| ID | POPID | (generate from name) | CitizenId |
| Name | First + Last | First + Last | Name |
| Tier | Tier (1-4) | 4 (always) | Tier |
| Neighborhood | Neighborhood | Neighborhood | Neighborhood |
| Occupation | (from RoleType) | Occupation | Occupation |
| Status | Status | Status | Status |
| Age | (calc from BirthYear) | Age | Age |
| City | OrginCity | Oakland (default) | Chicago |

---

### Hosting & Cost

| Item | Annual Cost |
|---|---|
| Domain name (`.com` via Namecheap) | ~$12 |
| Wix Light plan (custom domain, no ads) | ~$204 ($17/mo) |
| Google Apps Script API | Free (20k calls/day quota) |
| **Total** | **~$216/year (~$18/month)** |

**Recommended approach:** Build entire site on Wix free plan first. Upgrade to Light plan
+ custom domain only when ready to go public.

**Domain options:** `godworldoakland.com`, `thegodworld.com`, `godworldsim.com`

---

### Dependencies & Risks

| Risk | Mitigation |
|---|---|
| Apps Script 6-min execution limit | API reads are fast (single sheet reads). Not an issue for `doGet()`. |
| Apps Script daily quota (20k calls) | Wix can cache responses. Most pages need only 1-2 API calls. |
| CORS issues | Wix Velo backend calls avoid CORS entirely. |
| Stale data | Data updates when simulation runs. Add "Last updated: Cycle N" to dashboard. |
| Sheet schema changes | API references column headers by name, not index. Schema changes need API updates. |

### Status
**Project initiative only.** NOT approved for implementation. Requires explicit user approval
before any code is written.

---

## Known Tech Debt (for future sessions)

- **`mulberry32_` defined in 10 files**: applyWeatherModel.js, buildCityEvents.js, generateCitizenEvents.js, generateGameModeMicroEvents.js (fixed), generateGenericCitizenMicroEvent.js, generationalEventsEngine.js, worldEventsEngine.js, generateCitizensEvents.js, textureTriggers.js, runAsUniversePipeline.js (already renamed to `mulberry32_uni_`). Recommend consolidating into `utilities/rng.js`.

---

## SESSION_CONTEXT.md Update Needed

Add to Session History and Current Work sections after merge:

```
### Session 9 entry:
- **updateTransitMetrics.js v1.1**: Fixed Phase 2 event timing (read previous cycle from WorldEvents_Ledger),
  double-counting in countMajorEvents_, dayType magic number, demographics null safety
- **faithEventsEngine.js v1.1**: Fixed holy day month (S.simMonth not wall clock), renamed shuffleArray_
  to shuffleFaithOrgs_ (namespace collision prevention)
- **generateGameModeMicroEvents.js v1.3**: Converted direct sheet writes to write-intents
  (queueRangeIntent_ for Simulation_Ledger, queueBatchAppendIntent_ for LifeHistory_Log),
  renamed mulberry32_ to mulberry32GameMode_
- **Story signals wired**: Phase6-TransitSignals + Phase6-FaithSignals added to V2 + V3 orchestrator pipelines
- **V3 faith limitation documented**: crisis detection is sentiment-only in V3 (no worldEvents at Phase 3)
- **Tech debt noted**: mulberry32_ defined in 10 files — consolidation needed
```
