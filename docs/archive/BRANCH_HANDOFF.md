> **ARCHIVED** — Branch merged Session 9. Moved 2026-02-16.

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

## Business Strategy: GodWorld Monetization & Immersion

### Revenue Paths (ranked by viability)

#### 1. SaaS Platform — "Build Your Own City Sim"
**You become the platform, not just the product.**
- Other creators pay monthly to spin up their own city simulation (their own town, fictional world, etc.)
- You provide the engine, they provide the content
- Pricing model: $10-30/month per world
- **Why it's #1:** Recurring revenue, scales without more work per customer
- **Comparable to:** Notion, Airtable — tools that let people build their own thing
- **Effort:** Massive rebuild (1-2 years). Highest ceiling, longest runway.

#### 2. Serialized Content / Subscription
**People pay to follow the story.**
- GodWorld becomes a living narrative — a city soap opera generated by engines + editorial voice
- Platform: Substack, Patreon, or paywall on the Wix site — $5-10/month
- Weekly "editions" (Riley Digest already does this), citizen spotlights, arc updates
- **Why it works:** The simulation already generates the content every cycle. Monetize the output, not the engine.
- **Comparable to:** Serial fiction on Substack, AI Dungeon premium
- **Effort:** Low — content already exists. 1-3 months to launch.

#### 3. YouTube / Podcast — "The GodWorld Report"
**Free content, ad revenue + sponsorships.**
- Narrate each cycle's events like a news broadcast or documentary
- Example: "This week in Oakland: transit crisis hits Fruitvale, Mayor faces recall,
  Vinnie Keane spotted at new Jack London restaurant"
- Revenue from ads at scale, sponsorship deals, Patreon bonus content
- **Why it works:** The simulation generates infinite content. Just narrate and edit.
- **Comparable to:** City planning YouTube (City Beautiful, Not Just Bikes) meets fiction
- **Effort:** Medium — recording + editing. 1-2 months to launch.

#### 4. Interactive Web Game
**Free-to-play with premium features.**
- Visitors pick a citizen to "follow," make choices that influence events
- Free tier: read-only (the Wix site). Premium tier: interact with the world
- Microtransactions or subscription model
- **Why it works:** Games print money. But hardest to build.
- **Effort:** Huge. 1+ year.

#### 5. IP Licensing
**The long game — sell the world, not the tech.**
- GodWorld's characters, neighborhoods, and storylines become a comic, animated series, or novel
- License the IP to a studio or publisher
- **Why it works:** If the world is rich enough (it's getting there), the IP has standalone value
- **Effort:** Low to pitch, hard to land. Timeline unknown.

---

### Revenue Path Comparison

| Path | Profit Ceiling | Effort | Time to First Dollar |
|---|---|---|---|
| SaaS platform | Highest | Massive rebuild | 1-2 years |
| Subscription serial | Medium-high | Low | 1-3 months |
| YouTube/Podcast | Medium | Medium | 1-2 months |
| Interactive game | High | Huge | 1+ year |
| IP licensing | Wildcard | Low to pitch | Unknown |

**Fastest path to revenue:** Subscription serial. Riley Digest already exists. Put it behind
a paywall. Add citizen spotlights and arc recaps. Could be charging within a month.

**Biggest long-term play:** SaaS platform. Let other people build their own GodWorlds.

---

### Immersion Strategy: "The Living City"

The most immersive concept combines the Wix front-end with serialized content.

**Visitor experience layers:**

| Layer | What They See | Time Spent |
|---|---|---|
| **Surface** | Wix landing page — Oakland dashboard, weather, population, headline event | 10 seconds |
| **Browse** | Citizen directory, neighborhood explorer, click around | 5 minutes |
| **Read** | Riley Digest — full newspaper edition, event arcs, civic drama | 15 minutes |
| **Follow** | Pick a citizen — get their life history, relationships, career, neighborhood events | 30 minutes |
| **Subscribe** | Weekly edition drops in their inbox. They follow storylines across cycles. | Ongoing |
| **Participate** | Submit "tips" or "letters to the editor" that influence future media room content | Invested |

**What makes it immersive:**
- **It's not a game — it's a world.** No score, no win condition. A city that keeps living.
- **Every citizen has a history.** Click any name and see 30+ cycles of life events,
  relationships, neighborhood changes.
- **The newspaper is the hook.** The Riley Digest is the gateway — people read newspapers.
- **Time passes whether you're watching.** Come back next week, things changed. That creates
  urgency to stay subscribed.
- **The world reacts to itself.** Rainy week → indoor events → transit ridership drops →
  story about transit crisis → civic initiative → election impact. The chain is already
  in the engines.

**The "God" angle:**
The name GodWorld implies the creator is God. That's the brand. You see everything. You
control the media room. You decide what stories get told. Subscribers are watching God
run a city. That's a narrative frame nobody else has.

---

### Recommended Launch Sequence

1. **Now:** Keep building the simulation. More engines = richer world = better content.
2. **Phase A:** Launch the Wix site (read-only display layer). Free. Proves the concept visually.
3. **Phase B:** Start a Substack or Patreon. Publish the Riley Digest weekly. $5/month tier.
4. **Phase C:** Add YouTube narration of major arcs and events. Free content → audience growth.
5. **Phase D:** Once audience exists, evaluate: interactive game layer vs. SaaS platform vs. IP deals.

**Key principle:** Don't build the business infrastructure before the world is ready.
The simulation's depth IS the product. Every engine you add makes the content richer,
which makes every revenue path more viable.

### Status
**Strategy document only.** No business actions taken. Requires user direction on which
path to pursue.

---

## Subscription Serial Deep Dive: "GodWorld Weekly"

### What You Already Have (Free Content)

Every simulation cycle already generates publishable content:

| Content | Source Sheet | Effort to Publish |
|---|---|---|
| Riley Digest (newspaper) | `Riley_Digest` | Zero — already written by engine |
| World events (5-15 per cycle) | `WorldEvents_V3_Ledger` | Copy/paste + light editing |
| Citizen life events | `LifeHistory_Log` | Needs narrative framing |
| Neighborhood shifts | `Neighborhood_Map` | Dashboard visual |
| Active crisis arcs | `Event_Arc_Ledger` | Needs storytelling wrapper |
| Civic moves (elections, initiatives) | `Civic_Office_Ledger`, `Initiative_Tracker` | Recap format |
| Sports impact on city | `Sports_Feed` | Already game-connected |

The engines generate ~80% of the content. The gap is **packaging and voice.**

---

### The Product Tiers

**Free tier** (hooks them in):
- Riley Digest — the headline newspaper edition each week
- World Dashboard snapshot (Wix site link)

**Paid tier — $7/month or $60/year:**
- **"Behind the Curtain"** — God's editorial commentary on why events happened, what's
  coming, engine decisions you made. The creator's perspective.
- **Citizen Spotlight** — deep profile on 1-2 citizens per week. Life timeline, bonds,
  neighborhood, what's next for them.
- **Arc Watch** — active crisis arcs broken down: tension level, who's involved, possible
  outcomes, how it escalated.
- **Neighborhood Report** — one neighborhood per week deep dive: crime, nightlife, retail,
  who moved in/out, sentiment shift.
- **"The God's Hand"** — what YOU did in the media room this week. What you typed in, what
  you overrode, what you let the engines decide. Behind-the-scenes content nobody else
  can generate.

**Premium tier — $12-15/month:**
- Everything above
- **Early access** to next cycle before free readers see it
- **Vote on storylines** — "Should the Mayor face a recall? Should Vinnie Keane get traded?"
  Poll results go into the media room.
- **Name a citizen** — subscriber names get added to the Generic_Citizens pool

---

### Platform Comparison

| Platform | Cut They Take | Best For |
|---|---|---|
| **Substack** | 10% of paid subs | Newsletter-first, built-in discovery, readers find you through Substack's recommendation network |
| **Patreon** | 5-12% | Community-first, tiers, polls, exclusive posts |
| **Ghost** | $0 (self-hosted) or $9/month | Full control, own your audience, custom branding |
| **Beehiiv** | Free up to 2,500 subs | Newsletter-focused, good analytics, monetization built in |
| **Wix (built-in blog + paywall)** | Part of existing Wix plan | Everything in one place, but weaker newsletter/discovery tools |

**Recommendation:** Start with **Substack**. Zero upfront cost. Built-in audience discovery
(Substack recommends you to similar readers). Easy to migrate later. The Riley Digest format
is a natural fit for Substack's newsletter model.

---

### Weekly Workflow: Time Investment

| Task | Time | Day |
|---|---|---|
| Run simulation cycle | 5 min (already doing this) | Monday |
| Review engine output, pick highlights | 15 min | Monday |
| Write "Behind the Curtain" commentary (2-3 paragraphs) | 20 min | Tuesday |
| Write Citizen Spotlight (pick 1 citizen, narrate their story) | 20 min | Tuesday |
| Write Arc Watch recap (active crises, what changed) | 15 min | Wednesday |
| Format and schedule the Substack post | 10 min | Wednesday |
| Post free Riley Digest teaser to socials | 5 min | Thursday (publish day) |
| **Total weekly time** | **~1.5 hours** | |

1.5 hours per week. The engines do the heavy lifting.

---

### Revenue Projections

| Total Subscribers | Free : Paid Ratio | Paying Subs | Monthly Revenue ($7/mo) | Annual (after 10% Substack cut) |
|---|---|---|---|---|
| 100 | 90:10 | 10 | $70 | $756 |
| 500 | 85:15 | 75 | $525 | $5,670 |
| 1,000 | 80:20 | 200 | $1,400 | $15,120 |
| 5,000 | 80:20 | 1,000 | $7,000 | $75,600 |
| 10,000 | 80:20 | 2,000 | $14,000 | $151,200 |

**Reality check:**
- 100-500 total subs: achievable in first 3-6 months with consistent publishing
- 1,000+: requires real audience building, cross-platform promotion
- 5,000+: full-time income territory, requires dedicated following
- 10,000+: top-tier Substack creator territory

---

### Audience Building Playbook

**Month 1-2: Seed audience**
- Publish Riley Digest free on Substack weekly — build a backlog of editions
- Cross-post clips to Reddit: r/worldbuilding, r/SimCity, r/proceduralgeneration, r/writingprompts
- Twitter/X threads: "I built an AI-powered city simulation. Here's what happened this
  week in Oakland." with screenshots of the dashboard
- TikTok/Reels: 60-second narration of the wildest event each cycle
- Share on r/indiegaming, r/gamedev, r/artificialintelligence

**Month 2-4: Convert to paid**
- First 4-6 editions are fully free — hook people on the world
- Gate the deep content (Citizen Spotlight, Arc Watch, God's Hand) behind the paywall
- Free readers still get Riley Digest — enough to stay interested, not enough to feel complete
- Add a "Subscribe" CTA at the bottom of every free post with a teaser of what paid got

**Month 4+: Compound growth**
- Substack recommendation engine kicks in — shows your newsletter to similar readers
- Loyal subscribers share specific citizen stories ("You gotta read what happened to
  Vinnie Keane this week")
- YouTube/podcast layer drives new subscribers back to Substack
- Cross-promote: Wix site links to Substack, Substack links to Wix
- Guest appearances on worldbuilding/game design podcasts

---

### Content Calendar Template (1 Month)

| Week | Free Post (Riley Digest) | Paid Post 1 | Paid Post 2 |
|---|---|---|---|
| **Week 1** | Edition 80: Headline events | Behind the Curtain: Why God let the transit crisis escalate | Citizen Spotlight: Vinnie Keane |
| **Week 2** | Edition 81: Headline events | Arc Watch: Fruitvale housing initiative | Neighborhood Report: Jack London |
| **Week 3** | Edition 82: Headline events | The God's Hand: Media room decisions this week | Citizen Spotlight: Mayor recall drama |
| **Week 4** | Edition 83: Headline events | Behind the Curtain: How elections actually work in GodWorld | Arc Watch: Monthly roundup of all active arcs |

That's 12 posts/month. 3 free, 8 paid, 1 bonus.

---

### What Makes This Defensible

Most Substack creators compete on writing quality alone. GodWorld has structural advantages:

1. **The engine generates content.** Writer's block doesn't exist when 25 engines write for you.
2. **Continuity is automatic.** Characters have 30+ cycles of real history. Arcs build over
   weeks. Readers get invested in outcomes they can't predict — because even you can't
   predict what the engines will do.
3. **The "God" narrative frame.** You're not just an author — you're God commenting on a world
   that runs itself. No other Substack has that.
4. **Interactivity.** Subscribers vote, suggest, name citizens. They become part of the world.
   That creates lock-in — they won't unsubscribe if their named citizen is in an active arc.
5. **The Wix site is a moat.** Free Substack readers can browse the world. That visual layer
   (citizen profiles, dashboards, neighborhood maps) makes GodWorld tangible in a way text
   alone can't.

---

### Quick-Start Checklist

1. [ ] Sign up at substack.com (free, takes 5 minutes)
2. [ ] Name it: "GodWorld" or "The GodWorld Report" or "God's Desk"
3. [ ] Write a welcome post explaining the concept (what is GodWorld, how the simulation works)
4. [ ] Publish 4 free editions of the Riley Digest (one per week, build backlog)
5. [ ] On edition 5, introduce paid tier with first Citizen Spotlight + Behind the Curtain
6. [ ] Set price: $7/month or $60/year (annual discount drives commitment)
7. [ ] Share each edition to 2-3 Reddit communities + Twitter/X
8. [ ] Track: open rate, free-to-paid conversion, which content type gets most engagement
9. [ ] Month 2: evaluate what's working, double down on highest-engagement content

### Status
**Playbook ready.** No accounts created. Requires user to sign up on chosen platform
and begin publishing when ready.

---

## Product Concept: "Wreck-It Ralph" Sandbox — User-Generated Living Characters

### The Idea
A user-generated sandbox where anyone can drop ANY character — a sim, a sports player, a
monster, a cartoon villain, a talking dog — into a living city, and the GodWorld engines
normalize that character into a daily life OUTSIDE their "purpose."

**The Wreck-It Ralph concept:** Every character has a job (their game, their show, their story).
But when they clock out, they have a LIFE. They go to restaurants. They have neighbors. They
get stuck in traffic. They have opinions about the Mayor. The engines generate that life
automatically.

### The Pitch (One Sentence)
> "Drop any character into a living city. Watch them get a job, make friends, complain about
> the weather, and vote in elections. The world doesn't care who they are — it just gives
> them a life."

---

### Why It Works — Engines Already Do This

The existing engine stack doesn't care WHAT a character is. It only cares WHERE they live
and what TIER they are. Every engine already normalizes any input into daily city life:

| Engine | What It Does For ANY Character |
|---|---|
| `runNeighborhoodEngine_` | Places them in a neighborhood, gives them local context |
| `runRelationshipEngine_` | Generates bonds — friends, rivals, neighbors |
| `runCareerEngine_` | Career outside their "purpose" (a monster works at a bakery) |
| `runHouseholdEngine_` | Household dynamics — roommates, family |
| `generateGameModeMicroEvents` | Daily life events — groceries, walks, restaurants |
| `faithEventsEngine_` | Do they attend services? Community programs? |
| `runBondEngine_` | Deepening or breaking relationships over time |
| `economicRippleEngine_` | How the city economy affects their wallet |
| `worldEventsEngine_` | City-wide events that touch their life |
| `runEducationEngine_` | Are they taking classes? Learning something new? |
| `runCivicRoleEngine_` | Could they run for office? Serve on a committee? |
| `runYouthEngine_` | Age-appropriate events for younger characters |
| `textureTriggerEngine_` | Story texture — ironic moments, coincidences, drama |
| `storyHookEngine_` | Media-worthy moments in their life |

**Example:** A user drops in "Bowser." The engines ask: What neighborhood does he live in?
Who are his neighbors? Does he take the bus? What does he do on a rainy Tuesday? Does he
have opinions about the transit crisis in Fruitvale? Does he attend community programs at
the local church? Did he get promoted at work?

The engines don't see "Bowser the video game villain." They see "Citizen, Tier 2, Downtown,
Occupation: Restaurant Owner, Status: Active." And they generate a life.

---

### Three Product Levels

#### Level 1: Personal Sandbox (Free / $5 per month)
- Users create a world for themselves
- Drop in their own characters — sims, OCs, fan fiction characters, sports rosters, anything
- Watch the engines generate a life for them
- This is the **Wreck-It Ralph toy**: "What would Bowser's Tuesday look like?"
- Solo experience. One user, one world, their characters.

#### Level 2: Shared Worlds ($10-15 per month)
- Multiple users contribute characters to the SAME world
- Someone adds a monster. Someone adds a pop star. Someone adds a retired detective.
- The engines weave them together — bonds form, arcs develop, collisions happen naturally
- A user's monster ends up as neighbors with another user's pop star. They develop a rivalry.
  Neither user planned it. The engines did.
- This is **collaborative worldbuilding as a service.**

#### Level 3: Spectator Content (Subscription — $7/month)
- The wildest, most interesting shared worlds get featured
- Subscribers watch the chaos unfold weekly
- "This week: Godzilla got elected to city council and a sentient toaster opened a restaurant
  in Jack London Square"
- Curated by you (God) with editorial commentary
- This is the **content product** — entertainment generated by engine + user creativity

---

### How It Maps to Every Revenue Path

| Revenue Path | How This Concept Supercharges It |
|---|---|
| **SaaS Platform** | Users pay to run their own world with their own characters. This IS the SaaS product. Each world is a separate Google Sheet + engine instance. |
| **Subscription Serial** | The flagship GodWorld (Oakland) remains the showcase. User-submitted characters appear in the main world as a premium perk. |
| **YouTube/Podcast** | "This week on GodWorld: a viewer added Darth Vader to Oakland. Here's what happened." Infinite viral content from user submissions. |
| **Interactive Game** | The act of adding characters and watching them live IS the game. No additional game mechanics needed — the simulation is the gameplay. |
| **IP** | The platform concept itself is licensable. "GodWorld — Where Every Character Has a Life." |

---

### What Makes This Different From Everything Else

| Existing Product | What It Does | What GodWorld Does Different |
|---|---|---|
| **The Sims** | Control one household manually | The CITY is the simulation. Your character is one of thousands. You don't control them — you watch them. |
| **SimCity** | Build infrastructure, manage budgets | Citizens have names, histories, relationships. It's personal, not statistical. |
| **AI Dungeon** | Text adventure, one character, one session | Persistent world with real continuity. 25 engines, not one LLM prompt. History carries across cycles. |
| **WorldAnvil** | Static wiki for worldbuilders | The world is ALIVE. It changes every cycle without anyone touching it. |
| **Character.AI** | Chat with a character | Characters don't just talk — they LIVE. They have jobs, neighbors, crises, elections. |
| **Wreck-It Ralph** | Movie concept | You can actually DO it. Drop a character in and watch them live. |

**Nobody has built this.** Worldbuilding tools are static wikis. City sims are infrastructure-focused.
Character sims are household-focused. AI chat is conversation-focused. GodWorld is the only thing
that says: "Give me any character. I'll give them a life in a living city."

---

### What You'd Need to Build (from current state to platform)

| Component | Current Status | Effort to Platform-Ready |
|---|---|---|
| Core simulation engines (25 engines) | **Built** | Done — this is the hard part and it's done |
| Character intake (add any character) | Partially built (citizen intake exists) | Medium — generalize the intake form |
| World normalization (engines treat all characters equally) | **Already works this way** | Low — engines are character-agnostic |
| Tier auto-assignment (classify any character) | Partially built | Medium — need rules for user-submitted characters |
| Multi-world support (each user gets their own city) | Not built | Large — separate Sheet instances per world |
| User accounts + world management | Not built | Large — web app layer needed |
| Character submission UI | Not built | Medium — form on Wix or custom |
| Web front-end (Wix or custom) | Planned (Wix initiative above) | Medium |
| Billing (Stripe or platform-native) | Not built | Medium |

**The core insight: the hardest part is already done.** The 25 engines that generate a living
city — that's 80% of the product. Everything else is packaging and distribution.

---

### Phased Build Plan

**Phase 1: Prove It Works (Now — No new code)**
- Manually add 3-5 absurd characters to your existing Oakland world (Bowser, a talking cat,
  a retired superhero). Run cycles. Document what the engines generate for them.
- This proves the concept works without building anything new.
- Content from this becomes your first viral marketing material.

**Phase 2: Accept User Submissions (Month 1-2)**
- Google Form or Wix form: "Submit a character to GodWorld"
- Fields: Name, brief description, suggested neighborhood, suggested occupation
- You manually add them to the Simulation_Ledger. Engines do the rest.
- Feature the results in the Substack ("A subscriber submitted X. Here's what happened.")

**Phase 3: Self-Service Worlds (Month 6-12)**
- Users create accounts, get their own world instance
- Character submission is automated — goes straight into their world's Simulation_Ledger
- Shared worlds allow multiple users to submit to the same instance
- This is the full SaaS product.

---

### The "Wreck-It Ralph" Hook for Marketing

The movie reference is powerful because everyone already understands the concept:

- **Tagline:** "What do video game characters do after the arcade closes? In GodWorld, they
  live in Oakland."
- **Social media hook:** "I dropped Mario into a city simulation. He got a job at a bakery,
  complained about the bus being late, and voted against the mayor. Here's his week."
- **Reddit/TikTok viral potential:** Character-collision stories are inherently shareable.
  "Bowser and Pikachu became neighbors. They hate each other. Here's the bond engine output."

---

### Status
**Product concept only.** No new code written. The existing engine stack already supports
this concept — it just needs packaging. Requires user direction on which phase to pursue.

---

## Concept: "The Autonomous Newsroom" — Engines as News Agents

### Source Inspiration
Based on concepts from *"Agentic AI in Journalism: The New News Agents"* white paper
(Mo Shehu, PhD — Column Content, 2025). Applied to GodWorld's existing engine architecture.

### Core Reframe
GodWorld is not just a city simulation that produces a newspaper. **It's an autonomous newsroom
staffed by 25 AI agents, covering a living city 24/7.** Every week they file stories, track crises,
monitor neighborhoods, and publish a newspaper — all without a single human reporter. The only
human in the building is God.

---

### Engine-to-Newsroom Agent Mapping

Each GodWorld engine maps to a journalism agent role described in the white paper:

| Agent Role | GodWorld Engine | Beat Coverage |
|---|---|---|
| **City Desk Monitor** | `worldEventsEngine_` | Breaking events, chaos detection, severity assessment |
| **Faith Beat Reporter** | `faithEventsEngine_` | Religious community, interfaith programs, crisis response |
| **Transit Correspondent** | `updateTransitMetrics_` | Ridership, delays, traffic, game day impact |
| **Crime Desk** | `updateCrimeMetrics_` | Crime index, clearance rates, response times, QoL |
| **Weather Desk** | `applyWeatherModel_` | Weather conditions, city impact, seasonal patterns |
| **Civic Affairs Reporter** | `runCivicRoleEngine_`, `runCivicInitiativeEngine_` | Elections, initiatives, government, policy |
| **Social/Relationships** | `runRelationshipEngine_`, `runBondEngine_` | Bonds forming/breaking, community ties |
| **Neighborhood Beat** | `runNeighborhoodEngine_` | Local dynamics, sentiment, demographic shifts |
| **Business/Economics** | `economicRippleEngine_` | Sector impact, neighborhood economies, ripple effects |
| **Culture Desk** | Cultural_Ledger processing | Fame, trends, cultural figures, media spread |
| **Story Editor** | `textureTriggerEngine_`, `storyHookEngine_` | Narrative angles, irony, drama, story seeds |
| **Managing Editor** | `godWorldEngine2.js` (orchestrator) | Phase sequencing, engine coordination, output assembly |
| **Editor-in-Chief** | **The User (Media Room)** | Final editorial judgment, overrides, direction |

---

### Borrowed Concepts from Journalism AI Research

#### 1. Five Levels of Autonomy (Feng, McDonald, Zhang 2025)
Applied to GodWorld's user engagement tiers:

| Autonomy Level | Who | Role in GodWorld |
|---|---|---|
| **Observer** | Free Substack/Wix readers | Read-only. Watch the world unfold. |
| **Consultant** | Paid subscribers | Vote on storylines, suggest directions via polls |
| **Collaborator** | Premium subscribers | Name citizens, submit characters, letters to editor |
| **Approver** | The User (God) | Media room decisions, editorial overrides, engine config |
| **Operator** | The 25 engines | Autonomous execution within defined rules and parameters |

#### 2. Multi-Step Autonomous Workflows
The paper describes agents that "scan filings, extract names, match against earlier cases,
and produce structured briefs." GodWorld's Phase 1→11 pipeline already does this:

```
Phase 1: Load config, advance time
Phase 2: Scan world state (weather, transit, demographics)
Phase 3: Detect crisis conditions, generate population data
Phase 4: Generate world events, faith events, load bonds
Phase 5: Run all citizen engines (14+ engines in sequence)
Phase 6: Filter, prioritize, detect patterns, generate signals
Phase 7: Produce media output (Riley Digest, story seeds)
Phase 8: Chicago integration
Phase 9: Compress, archive, finalize
Phase 10: Write all outputs via write-intents
Phase 11: Process media intake
```

This is the same orchestrator → agent → output chain the paper describes as
"the future of newsroom AI." GodWorld already runs it every cycle.

#### 3. Transparency as Product ("Show the Chain")
The paper emphasizes that audiences need to see how AI contributed. For GodWorld:
- **"Behind the Curtain"** Substack content already does this — show which engine
  generated which event, what data influenced the output
- Frame it explicitly: "Our news agents show their work"
- Example: "This transit crisis was flagged by the Transit Correspondent (updateTransitMetrics_)
  after ridership dropped 25% following a storm generated by the Weather Desk. The Story Editor
  (textureTriggerEngine_) then identified the irony: the city had just approved a transit
  initiative 2 cycles ago. The Managing Editor prioritized it for the Riley Digest."
- **Nobody else can do this.** Traditional AI tools are black boxes. GodWorld's agents have
  named roles, traceable logic, and documented decision chains.

#### 4. Safety/Compliance Agent (Future Engine Concept)
The paper describes agents that check content before publication. GodWorld could add:
- **Tone Checker** — flags events that contradict world state (e.g., "took a walk" during a storm)
- **Continuity Checker** — catches contradictions (citizen can't attend concert if hospitalized)
- **Distribution Auditor** — ensures events are balanced across neighborhoods and tiers
- **Sensitivity Filter** — flags generated content that could be tone-deaf given active crises

These would run as a Phase 6.5 validation pass before media output.

---

### New Market Opportunities from the Journalism Angle

The white paper reveals audiences that the "city sim" framing doesn't reach:

| Audience | Why They Care | Revenue Potential |
|---|---|---|
| **Worldbuilders / Sim fans** | Cool simulation, interactive world | Substack ($7/mo), Wix traffic |
| **Journalism/AI researchers** | Working example of an autonomous newsroom | Speaking fees, consulting, academic citations |
| **Media companies** | Want to see agentic journalism agents in action | Licensing engine architecture, partnerships |
| **AI tool builders** | Need real-world use cases for marketing | Sponsorship, case study fees |
| **Educators** | Teaching journalism, AI ethics, urban studies | Course licensing, guest lectures |
| **Game designers** | Procedural narrative generation at scale | Engine licensing, co-development |

#### The Dual Identity
GodWorld can be pitched differently to different audiences:
- **To consumers:** "A living city you can explore, follow, and influence."
- **To the AI/journalism industry:** "A working autonomous newsroom with 25 specialized agents
  covering a persistent world. The architecture the white papers describe? We built it."

---

### Key Insight from the White Paper

> "The craft of journalism is being distilled to its most intellectual work precisely because
> agents handle the repetitive load around it." — Dietmar Schantin

This is exactly what GodWorld does. The engines handle the data gathering, pattern detection,
event generation, and signal monitoring. The human (God) handles the editorial voice, narrative
framing, and creative decisions. The division of labor is already built.

### What Companies Share (and Don't Share)

**Public technical details exist from:**
- **Associated Press + Automated Insights**: Used "Wordsmith" platform to auto-generate
  thousands of quarterly earnings reports. Published case studies on template-based NLG
  (natural language generation). Architecture: structured data → template selection → text output.
- **Washington Post — Heliograf**: Built in-house bot that covered 2016 Rio Olympics and
  election results. Published details: template-driven, triggered by structured data feeds,
  human editors set the templates and rules. Generated 850+ articles in first year.
- **Bloomberg**: Terminal AI generates financial news summaries from earnings data. Some
  architecture discussed in conference talks: data extraction → anomaly detection → template
  rendering → human review queue.
- **BBC — Juicer**: News monitoring and aggregation system. Open-sourced some components.
  Architecture: ingest RSS/API feeds → NLP entity extraction → clustering → journalist alerts.
- **Reuters — Lynx Insight**: AI assistant for journalists. Surfaces data patterns and suggests
  story angles. Some details in Reuters Institute reports: data analysis → pattern detection →
  story suggestion → reporter decides.

**What they DON'T share:**
- Exact prompt engineering / template libraries
- Internal quality scoring and ranking algorithms
- How editorial overrides are structured
- Revenue attribution (how much AI content drives subscriptions)
- Failure rates and correction workflows

**Open-source agent frameworks (the "how"):**
- **LangChain / LangGraph** — agent orchestration, tool chaining, memory
- **CrewAI** — multi-agent role assignment and collaboration
- **AutoGen (Microsoft)** — multi-agent conversation patterns
- **Haystack (deepset)** — document processing and retrieval pipelines

**The pattern is public. The specific implementations are proprietary.** But GodWorld's
architecture already follows the same patterns — orchestrator coordinates specialized agents,
each agent has a domain, outputs feed into the next phase, human oversight at key points.
The difference is GodWorld built it as a simulation engine, not a journalism tool. The reframe
costs nothing.

### Status
**Concept document only.** No code changes. No new engines. This is a strategic reframe of
existing architecture for market positioning and future product direction.

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
