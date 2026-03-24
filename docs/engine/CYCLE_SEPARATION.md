# Cycle Separation — Architecture Notes

**Status:** Discovery | **Session:** S113 | **Date:** 2026-03-23

These are working notes from the session where we identified the growth ceiling. Not a plan yet — a problem statement and the direction we're thinking.

---

## The Problem

GodWorld has hit a point where growth is difficult. Three systems run on the same weekly cycle through the same pipeline (`runWorldCycle()`), and they shouldn't:

1. **The World** — weather, events, civic votes, sports, economic shifts. Weekly makes sense. This is the news cycle.
2. **The Citizens** — career, education, household, relationships, life events. Weekly is too slow. Most citizens see 0 events per cycle. After 88 cycles, TraitProfile is 50% populated, CitizenBio is 2%, and most citizens have thin life histories.
3. **The Media** — editions, supplementals, intake. What the newsroom covers and what flows back to the simulation. Currently broken — journalism creates canon that doesn't return to sheets.

All three are one function call. That's the bottleneck.

---

## What's Breaking

### Citizens don't accumulate enough life

- 512 ENGINE citizens. One pass through lifecycle engines per cycle.
- Probability gates are low (~20% base). Most citizens get 0 events per cycle.
- After 88 cycles: TraitProfile 50% populated, CitizenBio 2%, UsageCount 25%.
- Without traits and bios, reporters can't use existing citizens — they invent new ones instead.
- Invented citizens have no engine history, no math behind them. Their quotes are meaningless.

### Journalism doesn't talk to sheets

- No working intake system. Editions publish canon that never flows back.
- 10 new citizens per supplemental that don't enter Simulation_Ledger.
- Businesses, faith orgs, cultural entities canonized in coverage but not in ledgers.
- Initiative status reported in articles but not updated on Initiative_Tracker.
- The engine runs the next cycle with no knowledge of what the newsroom established.

### The ledger is incomplete

- 46 columns. All read by something. Many half-populated or garbage.
- The columns that would make citizens usable by reporters (TraitProfile, CitizenBio) are the emptiest.
- TraitProfile should come from LifeHistory compaction — but LifeHistory is thin because citizens don't get enough events.
- CitizenBio should summarize who someone became — but most citizens haven't become anything yet.

---

## The Direction

### Separate the cycles

| Cycle | Frequency | What it does |
|-------|-----------|-------------|
| **World Cycle** | Weekly (current) | Weather, world events, civic votes, sports feeds, economic shifts. Produces the news. |
| **Citizen Cycle** | More frequent (TBD — daily? 4x per world cycle?) | Career, education, household, relationships, neighborhood, life events. Citizens live between the news. |
| **Media Cycle** | Per edition/supplemental | Newsroom covers the world. Intake flows data back to sheets. Citizens the media cares about get usage tracking. |

### What this solves

- **Citizens accumulate real histories.** More passes = more events = LifeHistory has material to compact into TraitProfile. Bios write themselves from actual lived experience.
- **Reporters use real citizens.** With traits and bios populated, desk packets can serve citizens with coded personas. No need to invent.
- **Intake becomes simple.** Reporter uses existing citizen → intake updates UsageCount and any new context. Rare new citizens get full rows. The loop closes.

### What this requires

- Engine architecture change — `runWorldCycle()` splits into world phase and citizen phase.
- Citizen phase needs its own trigger — either called multiple times within a world cycle, or on a separate schedule.
- Phase 5 (the largest phase — citizens + relationships) becomes its own runnable unit.
- Phases 1-4 (world state) and Phases 6-10 (analysis, media, persistence) stay on the world cycle.
- Google Apps Script execution time limits may constrain how many citizen passes fit in one run.

---

## Open Questions

1. **How frequent should citizens cycle?** Daily (7x per world cycle)? Monthly (1x per ~4 world cycles)? What frequency produces enough life events without overwhelming the sheet?
2. **Does the citizen cycle run inside `runWorldCycle()` as a loop, or as a separate function?** GAS has 6-minute execution limits. A separate `runCitizenCycle()` could run on its own trigger.
3. **What about intake?** Does the media cycle need its own formal process, or is intake just "Mags runs a script after publishing"? The conversation identified that intake is two things: (a) updating existing citizens who appeared, (b) rarely creating new citizens when an arc demands it.
4. **What drives the citizen cycle?** The world cycle is driven by Mike triggering it. Should the citizen cycle be automatic (time-based cron) or manual?
5. **How does the citizen cycle interact with the world cycle?** Citizens need world state (weather, events, economic conditions) as context for their life events. Do they read a snapshot of the last world cycle, or do they need real-time state?
6. **What about the 46 columns?** Are all 46 actually needed? Which ones are carrying weight and which are dead? A ledger audit before the separation would prevent carrying garbage into the new architecture.

---

## What We Know Works

- The engine's 11-phase structure is sound. 100+ functions, deterministic, tested.
- The newsroom pipeline produces real journalism — 88 editions, 8 supplementals.
- The voice-agent-world-action-pipeline (built this session) closes the civic decision loop.
- Desk packets, voice workspaces, briefings — the agent infrastructure works.
- Supermemory provides searchable canon archive.

The problem isn't that anything is broken. The problem is the architecture assumes one clock speed for everything, and citizens need a faster clock to become real.

---

## Supermemory Citizen Container

A `citizens` container in Supermemory. Each citizen is a document built from their full simulation state — Simulation_Ledger row + LifeHistory compaction + TraitProfile + CitizenBio + UsageCount + edition appearances. Updated after each citizen cycle.

**What agents get:** Search by name or neighborhood and get back a natural language summary of a real person. Not 46 columns of raw data. A person with history, traits, and a voice — all derived from engine math, not AI guessing.

**Why this matters:** The current problem is agents filling gaps with training data about real Oakland. If every citizen has a rich Supermemory profile built from actual simulation data, agents have enough to write from without guessing. The container IS the world's knowledge of its own people.

**Depends on:** Citizen cycle producing enough life events to fill LifeHistory, which compacts to TraitProfile, which generates CitizenBio. The container is the delivery mechanism. The citizen cycle is what fills it.

**Update triggers:** After each citizen cycle (new events), after intake (new media appearances), after LifeHistory compaction (new traits/bio).

**Container rules:** Same isolation as bay-tribune. No engine internals, no session data, no architecture. Just citizens as people — the way a reporter's source file would read.

---

## World Identity Notes (from /grill-me S113)

**GodWorld is not real Oakland.** It's a city anchored on Oakland's geography (streets, BART, landmarks) but everything that happens on that canvas comes from the simulation. The dynasty, the economy, the civic initiatives, the neighborhoods — all driven by engine data, not by what AI knows about the real city.

**Agents contaminate with training data** when sheets are incomplete. Every empty column or missing citizen detail is an invitation for the AI to guess from real-world Oakland. The fix is data completeness, not prompt engineering.

**Time is cycles, not calendar.** Opening Day is C88, not a Tuesday. Seasons and holidays map to real-world concepts but dates are meaningless. Y2C34, not September 2041. Media currently uses Earth dates — this is wrong and should be corrected.

**Prosperity framing.** This is dynasty-era Oakland. Six A's championships. Economic growth. People buying homes, opening businesses. Not real Oakland's displacement narrative. The simulation's economic data determines neighborhood health, not the AI's training data about Oakland in 2026.

**Sports history is real but played.** The A's dynasty, Keane's 436 HRs, Dillon's 5 Cy Youngs — all canon because Mike played those games. The sports calendar doesn't align with real MLB/NBA schedules. It aligns with when the games were played.

---

## Related Docs

- `docs/ARCHITECTURE_VISION.md` — North star (Jarvis + persistent sessions)
- `docs/engine/ENGINE_MAP.md` — Every function in execution order
- `docs/SIMULATION_LEDGER.md` — Column reference, population structure
- `docs/engine/INTAKE_REDESIGN.md` — Draft intake spec (30% connected, needs this separation first)
- `docs/engine/ROLLOUT_PLAN.md` — Current project work
