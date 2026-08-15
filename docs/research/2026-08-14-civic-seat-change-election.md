---
title: Civic seat change — live race on Election_Log — research
created: 2026-08-14
updated: 2026-08-14
type: reference
tags: [research, civic, elections, architecture, active]
sources:
  - Mike-direct 2026-08-14 — process spoken this session: seat at 40 enters Election_Log; next cycle names a challenger (Simulation_Ledger → Generic_Citizens → out-of-town); challenger wins only below 20; media interviews both; losing those interviews accelerates hits; retirement later uses the same tab with two candidates
  - phase05-citizens/runCivicElectionsv1.js v1.3 — November-window seater; writes Election_Log + Civic_Office_Ledger
  - phase05-citizens/updateCivicApprovalRatings.js — every-cycle Approval writer (main = v1.2 ceiling; working tree holds unsaved v1.3–v1.6 fire/seat/mint)
  - docs/engine/SHEETS_MANIFEST.md — Election_Log is a historical tracker, not a live race
  - docs/engine/ENGINE_COUPLING_MAP.md — runCivicElections_ + updateCivicApprovalRatings_ verified couplings
  - docs/engine/ENGINE_STUB_REVERSE.md — Election_Log writer/readers
  - docs/research/2026-07-07-simulation-narrative-open-items.md §13 — candidates exist, campaign arc does not
  - docs/plans/2026-07-31-citizen-memory-perception.md Task 4–5 — ceiling belongs on the every-cycle approval writer; elections keep incumbent consequence
  - docs/plans/2026-07-28-civic-cron-city-hall.md — elections / replacement pressure parked as civic.15 fine-tune
  - docs/mara-vance/CIVIC_ELECTION_ENGINE.md — November window + Group A/B stagger
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (row not filed until this verdict ignites a plan)"
  - "[[index]] — registered same change"
  - "[[2026-07-07-simulation-narrative-open-items]] — §13 is the prior election gap"
  - "[[2026-07-28-civic-cron-city-hall]] — civic.15 parked elections / replacement"
  - "[[../plans/2026-07-31-citizen-memory-perception]] — engine.94 ceiling already live; this is not that"
  - "[[../engine/ENGINE_COUPLING_MAP]] — required read before any plan task"
  - "[[../engine/ENGINE_STUB_MAP]] — required update in the same commit as any writer change"
---

# Civic seat change — live race on Election_Log — research

**Source:** Internal-design research. Mike 2026-08-14 named the process. Process home is the existing tab `Election_Log` (correction same day: not a new tab). The two machines it must sit next to are `updateCivicApprovalRatings_` (every-cycle score) and `runCivicElections_` (November seater, same tab).

**What this addresses:** Approval on main is a number. It does not change who sits. November elections can change who sits, but they sleep most of the year. Mike wants a **live race on `Election_Log`**: when a seat is in trouble the city can see it, a challenger exists, media covers both sides, and the incumbent can still save themselves. Retirement later uses the same tab. This file records the process and what is already true. It is not a plan.

**What exists today:**

- **Score machine (live).** `updateCivicApprovalRatings_` runs every cycle after initiatives. Writes `Civic_Office_Ledger.Approval` plus ceiling state. Triggers (`vulnerable` / `recall-pressure` / `popular`) live in `ctx.summary` only — no reader seats anyone.
- **November machine (live, rare).** `runCivicElectionsv1.js` fires cycle-of-year 45, even God-world years, Group A/B stagger. Picks challengers from `Simulation_Ledger`, rolls a weighted outcome, rewrites the office row, appends `Election_Log`. Media briefing and cycle packet read that log as **results**.
- **`Election_Log` (process home).** Existing tab. Today's columns are result-shaped: Timestamp, Cycle, GodWorldYear, OfficeId, Title, District, Incumbent, Challenger, Winner, Margin, MarginType, IncumbentAdvantage, EconFactor, Narrative. Manifest still calls it a historical tracker. This process **extends that same tab** so an open race can live there before there is a winner. No second election tab.
- **Prior research.** [[2026-07-07-simulation-narrative-open-items]] §13: challengers exist, campaign arc does not. This file is that arc, with Mike's win rule.
- **Unsaved leftover (do not treat as shipped).** Working-tree v1.4–v1.6 on `updateCivicApprovalRatings.js` fires below 20 and stores the campaign on office `Notes`. Mint onto `ctx.ledger.rows` never sets `ctx.ledger.dirty`, so Phase 10 can drop the invented citizen. Coupling map still describes v1.1 (Approval number only). This research **replaces Notes-as-campaign** as the process home.

**Extraction — what's usable:**

- **Live race, not a calendar** → a seat enters the election book when Approval crosses below 40. The November window is a different machine. Do not wait for cycle 45.
- **One process home** → `Election_Log`. Every open race, challenger, and later retirement contest is a row on that tab. Civic_Office_Ledger stays the office card (who sits, Approval). The leftover `Notes` campaign marker is not the home.
- **Challenger fill order, next cycle** → (1) `Simulation_Ledger` (2) `Generic_Citizens` (3) out-of-town populate. Empty first two still populate. No empty-race default.
- **Win rule is the floor, not the listing** → being on the ledger is not a win. Challenger takes the chair **only** if that office's Approval falls below 20. Above 20 the incumbent can still save the seat. Mike: this election is a save-your-ass event if they are not replaced.
- **Media heat is the accelerator** → once under 40, desks interview incumbent **and** challenger. If the standing office is losing those interviews, Approval hits come faster. The race is visible in story seeds from the cycle the seat is listed.
- **Retirement later, same book** → a retirement row spawns **two** candidates. How that vote resolves is not designed. Do not invent a ballot in this file.
- **Plan must show the ripple** → any later plan lists every reader of Approval, office Status/Holder/PopId, `Election_Log`, and story hooks **before** a task writes. Stub map + coupling map update in the same commit as the writer.

**Not applicable / hazard:**

- **Open row vs finished result.** Today's `Election_Log` readers (`getCivicContext_` in `mediaRoomBriefingGenerator.js` and `buildCyclePacket.js`, plus `cycleRollback.js`) treat a row as a finished race. Live rows need a status the plan names, and those readers must ignore or label open races in the same change. That is a reader fix, not a new tab.
- **Two seaters.** November `runCivicElections_` can still rewrite Holder/PopId on the same office and append `Election_Log`. Plan must say how a November finish and an open fitness race on the same tab do not collide.
- **Do not finish the leftover as-is.** Notes-as-campaign + mint-without-dirty is a second home and a disappearing-person bug. Plan absorbs the fill order and the <20 seat rule; it does not land the unsaved file unchanged.
- **`ctx.ledger.dirty`.** Any mint onto `Simulation_Ledger` must flip dirty or Phase 10 `commitSimulationLedger_` no-ops. Existing mint siblings (`processAdvancementIntake_`, `runCivicElections_`) already do this.
- **POPID.** Local max+1 collides with intake/advancement in the same cycle. engine.90 is the permanent allocator; until it ships, the plan names one allocator and one writer.
- **CIV flag / ClockMode.** A seated challenger who stays `CIV=n` is invisible to civic sweep and civic-mode life. Seating must update the citizen row or name why not.
- **"Losing interviews → faster hits" has no writer today.** Edition civic rating already subtracts 2 from every official at ≤ −3 (`updateCivicApprovalRatings_`). A race-specific accelerator is new math. Plan names the signal (edition coverage? a race column? a desk packet flag?) before coding a second decay.
- **Recovery above 40** and **parking forever between 20 and 40** were not spoken. Plan asks before inventing a close rule.
- **Appointed offices.** Score machine on main only scores `^COUNCIL` / `^MAYOR`. Retirement-on-the-same-ledger for staff is a later expansion, not implied.
- **civic.15 `--apply` and clasp.** Listing a race is engine state. Seating writes Civic_Office_Ledger. That is engine-sheet / live-sheet, not a docs-only close.
- **Do not invent citizens** in tests or docs. Synthetic fixtures only, visibly non-canon.

**Verdict:** `adopt`

Mike named the process. The score machine and the November machine are not this. A plan can be written from this file. The plan is the build spec (tasks, readers, stub/coupling updates, tests). This file stays the measure-twice source. No plan ignited this change.

**Ignited plans:** none

---

## Process facts (Mike 2026-08-14)

These are the locked beats. Open gaps sit under each beat, not as a second process.

1. **Entry.** Elected civic seat Approval drops to 40 → that office is added to `Election_Log` (one open race per seat).
2. **Challenger, next cycle that runs.** Fill order: `Simulation_Ledger` first, `Generic_Citizens` second, out-of-town populate third. If the first two are empty, still populate.
3. **Visible immediately.** Story seeds start showing the election once the seat is listed.
4. **Media.** Risk heightens under 40. Media interviews the standing office and the challenger. If the incumbent is losing those interviews, Approval hits come faster.
5. **Win.** Challenger wins only if that office falls below 20. Otherwise the incumbent can still save the seat.
6. **Retirement (same tab, later).** A retirement opens a race with two candidates. How the city votes that is not designed.
7. **Voice is not automatic.** Chair change → media event that introduces the person from the citizen list. Mike writes the office voice file only if that seat change actually happens.
8. **Purpose (Mike 2026-08-14).** Civic people are workers, not a show. They get a question (stadium green or blue, build this or reject this, citizens are complaining about X) and their answer becomes canon so the world moves without Mike. The Initiative_Tracker is that switchboard, not daytime drama. Chair change / election is a **rare valve**: the agent or cron stopped doing that job (dials + decisions made them unfit). Retirement is the likelier exit. Nobody needs a civic soap about who they are.

---

## What already reads the nearby state

The later plan must walk this list before it writes. An `Election_Log` row with no reader update is civic theater; a write that an old reader treats as a finished election is contamination.

| Surface | Writer today | Readers today | Hazard if this process lands |
|---|---|---|---|
| `Civic_Office_Ledger.Approval` | `updateCivicApprovalRatings_` | `civicInitiativeEngine` `getCouncilState_`, civic packets, media/handoff/packet civic context | Entry at 40 and win at 20 both read this number. v1.3 leftover changes how it moves (only `complete` raises). |
| `Civic_Office_Ledger` Status / Holder / PopId / VotingPower | elections (rare); leftover unseat/seat (unsaved) | `getCouncilState_`, `generateCivicModeEvents`, `buildCyclePacket`, `compileHandoff`, `cron-civic-run`, civic packets | Seating below 20 must be one writer. Vacant vs seated challenger changes vote math (9-seat roster). |
| `Election_Log` | `runCivicElections_` (November only) | media briefing, cycle packet, rollback | Same tab now also holds open races. Readers must not treat an open row as a winner. |
| `S.storyHooks` | many, including approval ceiling | newsroom / sift / ripple | Race-list and seat-change hooks belong here or they never become coverage. |
| `S.approvalTriggers` / leftover `S.officeDepartures` / `S.civicCampaigns` | approval writer | **none** | Memory-only. `Election_Log` is the durable race. Do not add a ctx-only home. |
| `Simulation_Ledger` | Phase 5 engines via `ctx.ledger.dirty` | everything | Challenger pick + mint + CIV/ClockMode on seat. |
| `Generic_Citizens` | `generateGenericCitizens`, advancement | leftover mint (read) | Feeder only. Plan says whether a used GC row is consumed. |
| Civic cron Sunday | `cron-civic-run.js` | Mayor always called (vacant-Mayor skip removed `5fb3936c`) | A mid-race or just-seated Mayor still speaks. |

---

## What the later plan must carry (not designed here)

Tab choice is **still open** (repurpose `Election_Log` vs a new live-race tab). Do not treat the 2026-08-14 correction commit as a lock.

A later plan is a **phased month**, not one session. Suggested phase cut is in §Scale below. Until then: no engine, no schema write, no voice authoring.

---

## Codebase facts (verified 2026-08-14)

What the idea thinks exists, vs what the files do.

### 1. `Election_Log` is a result receipt, not a race

Writer: `runCivicElectionsv1.js` only, and only on November trigger (cycle-of-year 45, even years, Group A or B). One append per contested seat. Columns are all names and flavor: Timestamp, Cycle, GodWorldYear, OfficeId, Title, District, Incumbent, Challenger, Winner, Margin, MarginType, IncumbentAdvantage, EconFactor, Narrative.

**No POPID column.** Incumbent and Challenger are display names. Winner is a display name.

Readers treat a row as finished:

- `mediaRoomBriefingGenerator.js` `getCivicContext_` — last 5 cycles → "ELECTION RESULTS" lead. Winner vs incumbent decides who is the loser.
- `buildCyclePacket.js` — same civic context.
- `utilities/cycleRollback.js` — rolls the tab back by Cycle.

`S.electionResults` is written to memory on that one November cycle. Grep found **no other JS reader**. The durable path is the sheet.

### 2. Citizens do not really map onto that row

November already picks a challenger from `Simulation_Ledger` (Tier 2–4, not already CIV, active). District match is a substring of `seat.title` against neighborhood — weak.

If the challenger wins (upset), the same function:

- writes Holder + PopId on `Civic_Office_Ledger`
- finds the citizen on `Simulation_Ledger` **by full name string** and sets `CIV (y/n)=y` and `TierRole` to the office title
- flips `ctx.ledger.dirty` (this path is correct)

It does **not**:

- write POPID onto `Election_Log`
- set `ClockMode=CIVIC`
- clear the old holder's CIV / ClockMode / TierRole
- pull `Generic_Citizens` or mint out-of-town (empty pool → "Unopposed" or vacant open-seat "TBD")
- write a LifeHistory line for win, loss, or campaign

So "citizens mapping onto Election_Log" is new work. Today's map is name-on-a-receipt plus a name-matched CIV flag on upset only.

Mike's fill order (SL → Generic_Citizens → out-of-town) does not exist on this writer.

### 3. Story seeds do not read elections

`applyStorySeeds_` (`phase07-evening-media/applyStorySeeds.js`) builds civic seeds from civic load, QoL, pattern/shock, holidays. It does **not** read `Election_Log`, `S.electionResults`, or approval triggers.

`S.storyHooks` is a different bus (chaos-cars, grief, approval-ceiling leftover). Newsroom/sift can see hooks; they are not the Story_Seed_Deck.

For "story seeds start to show the election" the plan must add a writer. Two existing doors:

- emit a `S.storyHooks` item when a seat is listed / heated / seated, and teach a seed or desk path to read it
- write a Story_Seed_Deck / Storyline_Tracker row

Neither door is wired today. Media will not interview a challenger just because a name is on `Election_Log`.

### 4. LifeHistory for civic people is a different engine

`generateCivicModeEvents_` (Phase 5, after ApprovalRatings) writes `Simulation_Ledger.LifeHistory` plus `LifeHistory_Log` for rows with **`ClockMode === "CIVIC"`**. Role flavor (mayor / council / DA / chief) comes from `Civic_Office_Ledger` lookup by POPID, else RoleType text.

Chance is low (~15–40%). Pools are generic civic days ("reviewed approval numbers"), not "I am in a race" or "I lost the chair."

`runCivicRoleEngine_` also writes LifeHistory_Log (civic-role events). November elections write none.

If a new officeholder is not ClockMode CIVIC, they get **no** civic life events. November seating today leaves ClockMode alone, so an upset winner can stay ENGINE-mode and miss this writer.

Challengers who are still ordinary citizens get ordinary life engines, not campaign events.

### 5. A new office does not get a voice file

This is the largest non-engine gap.

Civic Sunday (`cron-civic-run.js`) loads `.claude/agents/<agentDir>/IDENTITY.md` + LENS + RULES. The map is **static JSON**: `scripts/civic-office-map.json` hard-codes holder name, POPID, and `agentDir`.

Examples:

- `MAYOR-01` → `civic-office-mayor` → Avery Santana, POP-00034
- Council seats share **faction** agents (`civic-office-opp-faction`, `crc`, `ind-swing`), not one file per person
- Some offices have `agentDir: null` (Public Defender) — they do not speak

`civic-office-mayor/IDENTITY.md` is Avery. Traits, POPID, term, voice. The engine cannot rewrite `.claude/agents/` (control plane). `/make-citizen-voice` is a **hand-authored** research-build skill for Tier-1 conversation voices, not a cycle writer.

Position wall (`scripts/officeWall.js`) keys continuity by the map's POPID. A new holder on the office card still injects Avery's wall until the map moves.

So "they win and then they speak" is not one function. It is at least:

1. office card + citizen row (engine)
2. `civic-office-map.json` holder/POPID swap (repo file, civic cron)
3. IDENTITY rewrite or a generic office prompt that reads the live holder (control plane or a new injection)
4. empty or migrated position wall
5. Mike/Mara if the seat is canon-heavy (Mayor is)

Council is easier if they keep speaking through the faction agent. Mayor / DA / Chief are person-shaped files. A minted out-of-town with no canon cannot pass `/make-citizen-voice` without invention.

**Mike 2026-08-14 — media first, voice later.** He does not build sheets. If the chair changes, the sim creates a **media event** that introduces who this person is from ledger facts (name, neighborhood, work, dials — no invented bio; the desk already fails loud on `NO LEDGER PROFILE`). He writes the voice/IDENTITY leg **only if it actually happens**. That is the right human gate. It does not by itself stop Sunday city hall from still loading Avery's folder until that leg is written. Plan must say what the office says in the gap: skip the person-shaped agent, or speak as the office with live holder + ledger only.

### 6. Approval at 40 / 20 is a different machine

`updateCivicApprovalRatings_` scores `^COUNCIL` / `^MAYOR` every cycle. On main it does not write `Election_Log`. The unsaved leftover tries to campaign on Notes and seat below 20 without this tab.

Nothing today lists a seat at 40 or seats from this log at 20.

### Scale (why this is about a month)

| Layer | What has to move | Why it is not a small patch |
|---|---|---|
| A | Live race rows (new cols or new tab) + status open vs won | Every current `Election_Log` reader + November writer |
| B | Challenger fill SL → GC → mint, POPID on the row, `ledger.dirty` | New citizen-row writer; allocator; CIV/ClockMode |
| C | Approval 40 lists, 20 seats, one seater | Two Phase-5 functions must not both rewrite Holder |
| D | Story hook / seed so desks see the race | `applyStorySeeds_` and desk packets have no race input |
| E | LifeHistory lines for listed / heated / seated / saved | Civic event pools have no race text; ClockMode gate |
| F | Media "interview both" + faster hits if incumbent is losing | New signal; edition civic rating is citywide, not per-race |
| G | Voice + map + wall for a seated winner | Control plane + static map + hand-authored IDENTITY |
| H | Docs: stub, coupling, SCHEMA_HEADERS, tests, clasp | Required same-commit as A–C |

A–C is engine-sheet. D–F is engine + media. G is research-build / civic / Mike. H rides every land. That is why one session cannot hold it.

**Reframe after Mike 2026-08-14:** D–G (seeds, interview heat, full voice) are the civic soap. Do not build them as the product. The product is civic.15: decide → tracker write → world shifts. Seat-change is a small replacement valve when a worker will not decide, plus a retirement path. A media "who is this" beat only if a chair actually flips.

---

## Applications (living)

- 2026-08-14 — filed from Mike's process; no plan, no code.
- 2026-08-14 — codebase pass: Election_Log names-only; no seed reader; civic LifeHistory is ClockMode-gated; office voices are static person files.
- 2026-08-14 — Mike: chair change is a media event; he writes the voice leg only if it occurs.
- 2026-08-14 — Purpose reframe: civic = OpenClaw workers on Initiative_Tracker; seat change is a rare broken-worker valve; retirement likelier; no civic soap.

---

## Changelog

- 2026-08-14 (grok) — Purpose reframe: workers who decide, not a civic series. Seat-change shrinks to a rare valve. civic.15 stays the product.
- 2026-08-14 (grok) — Voice beat: media event first; Mike authors IDENTITY only if the chair actually changes. Civic cron still Avery until then.
- 2026-08-14 (grok) — Codebase pass. Citizens, seeds, LifeHistory, voice files, scale. Tab choice left open.
- 2026-08-14 (grok) — Correction: process home is `Election_Log`. Dropped the invented second tab.
- 2026-08-14 (grok) — Initial extraction. Mike process + existing November/`Election_Log`/approval facts. Verdict `adopt`, no plan ignited.
