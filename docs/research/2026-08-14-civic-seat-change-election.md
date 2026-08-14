---
title: Civic seat change — live race on an election ledger — research
created: 2026-08-14
updated: 2026-08-14
type: reference
tags: [research, civic, elections, architecture, active]
sources:
  - Mike-direct 2026-08-14 — process spoken this session: seat at 40 enters the election ledger; next cycle names a challenger (Simulation_Ledger → Generic_Citizens → out-of-town); challenger wins only below 20; media interviews both; losing those interviews accelerates hits; retirement later uses the same ledger with two candidates
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

# Civic seat change — live race on an election ledger — research

**Source:** Internal-design research. Mike 2026-08-14 named the process. The two existing machines it must sit next to are `updateCivicApprovalRatings_` (every-cycle score) and `runCivicElections_` (November seater → `Election_Log`).

**What this addresses:** Approval on main is a number. It does not change who sits. November elections can change who sits, but they sleep most of the year. Mike wants a **live race**: when a seat is in trouble the city can see it, a challenger exists, media covers both sides, and the incumbent can still save themselves. Retirement later uses the same book. This file records the process and what is already true. It is not a plan.

**What exists today:**

- **Score machine (live).** `updateCivicApprovalRatings_` runs every cycle after initiatives. Writes `Civic_Office_Ledger.Approval` plus ceiling state. Triggers (`vulnerable` / `recall-pressure` / `popular`) live in `ctx.summary` only — no reader seats anyone.
- **November machine (live, rare).** `runCivicElectionsv1.js` fires cycle-of-year 45, even God-world years, Group A/B stagger. Picks challengers from `Simulation_Ledger`, rolls a weighted outcome, rewrites the office row, appends `Election_Log`. Media briefing and cycle packet read that log as **results**.
- **`Election_Log` (live tab).** Columns: Timestamp, Cycle, GodWorldYear, OfficeId, Title, District, Incumbent, Challenger, Winner, Margin, MarginType, IncumbentAdvantage, EconFactor, Narrative. It is an **outcome log**. Manifest: "Historical tracker for election outcomes and margins."
- **No `Election_Ledger` tab.** That name is Mike's process home. It does not exist on the sheet. The plan must create it, or deliberately extend `Election_Log` from result-log into a live race register.
- **Prior research.** [[2026-07-07-simulation-narrative-open-items]] §13: challengers exist, campaign arc does not. This file is that arc, with Mike's win rule.
- **Unsaved leftover (do not treat as shipped).** Working-tree v1.4–v1.6 on `updateCivicApprovalRatings.js` fires below 20 and stores the campaign on office `Notes`. Mint onto `ctx.ledger.rows` never sets `ctx.ledger.dirty`, so Phase 10 can drop the invented citizen. Coupling map still describes v1.1 (Approval number only). This research **replaces Notes-as-campaign** as the process home.

**Extraction — what's usable:**

- **Live race, not a calendar** → a seat enters the election book when Approval crosses below 40. The November window is a different machine. Do not wait for cycle 45.
- **One process home** → Mike's name is `Election_Ledger`. Every open race, challenger, and later retirement contest lives there. Civic_Office_Ledger stays the office card (who sits, Approval). The leftover `Notes` campaign marker is not the home.
- **Challenger fill order, next cycle** → (1) `Simulation_Ledger` (2) `Generic_Citizens` (3) out-of-town populate. Empty first two still populate. No empty-race default.
- **Win rule is the floor, not the listing** → being on the ledger is not a win. Challenger takes the chair **only** if that office's Approval falls below 20. Above 20 the incumbent can still save the seat. Mike: this election is a save-your-ass event if they are not replaced.
- **Media heat is the accelerator** → once under 40, desks interview incumbent **and** challenger. If the standing office is losing those interviews, Approval hits come faster. The race is visible in story seeds from the cycle the seat is listed.
- **Retirement later, same book** → a retirement row spawns **two** candidates. How that vote resolves is not designed. Do not invent a ballot in this file.
- **Plan must show the ripple** → any later plan lists every reader of Approval, office Status/Holder/PopId, `Election_Log`, story hooks, and the new ledger **before** a task writes. Stub map + coupling map update in the same commit as the writer.

**Not applicable / hazard:**

- **Name collision.** Reusing `Election_Log` as the live race book will make current readers treat unfinished races as results. Readers today: `runCivicElections_`, `mediaRoomBriefingGenerator.js` `getCivicContext_`, `buildCyclePacket.js` `getCivicContextForPacket_`, `utilities/cycleRollback.js`. Prefer a new `Election_Ledger` tab unless the plan rewrites those readers in the same change.
- **Two seaters.** November `runCivicElections_` can still rewrite Holder/PopId on the same office. Plan must say: this path only; November only for ordinary terms; or one function reads the live ledger.
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

1. **Entry.** Elected civic seat Approval drops to 40 → that office is added to the election ledger (one open race per seat).
2. **Challenger, next cycle that runs.** Fill order: `Simulation_Ledger` first, `Generic_Citizens` second, out-of-town populate third. If the first two are empty, still populate.
3. **Visible immediately.** Story seeds start showing the election once the seat is listed.
4. **Media.** Risk heightens under 40. Media interviews the standing office and the challenger. If the incumbent is losing those interviews, Approval hits come faster.
5. **Win.** Challenger wins only if that office falls below 20. Otherwise the incumbent can still save the seat.
6. **Retirement (same ledger, later).** A retirement opens a race with two candidates. How the city votes that is not designed.

---

## What already reads the nearby state

The later plan must walk this list before it writes. A new ledger with no reader is civic theater; a write that an old reader misunderstands is contamination.

| Surface | Writer today | Readers today | Hazard if this process lands |
|---|---|---|---|
| `Civic_Office_Ledger.Approval` | `updateCivicApprovalRatings_` | `civicInitiativeEngine` `getCouncilState_`, civic packets, media/handoff/packet civic context | Entry at 40 and win at 20 both read this number. v1.3 leftover changes how it moves (only `complete` raises). |
| `Civic_Office_Ledger` Status / Holder / PopId / VotingPower | elections (rare); leftover unseat/seat (unsaved) | `getCouncilState_`, `generateCivicModeEvents`, `buildCyclePacket`, `compileHandoff`, `cron-civic-run`, civic packets | Seating below 20 must be one writer. Vacant vs seated challenger changes vote math (9-seat roster). |
| `Election_Log` | `runCivicElections_` (November only) | media briefing, cycle packet, rollback | Must not be treated as the live race book without rewriting these readers. |
| `S.storyHooks` | many, including approval ceiling | newsroom / sift / ripple | Race-list and seat-change hooks belong here or they never become coverage. |
| `S.approvalTriggers` / leftover `S.officeDepartures` / `S.civicCampaigns` | approval writer | **none** | Memory-only. The ledger is the durable race. Do not add a third ctx-only home. |
| `Simulation_Ledger` | Phase 5 engines via `ctx.ledger.dirty` | everything | Challenger pick + mint + CIV/ClockMode on seat. |
| `Generic_Citizens` | `generateGenericCitizens`, advancement | leftover mint (read) | Feeder only. Plan says whether a used GC row is consumed. |
| Civic cron Sunday | `cron-civic-run.js` | Mayor always called (vacant-Mayor skip removed `5fb3936c`) | A mid-race or just-seated Mayor still speaks. |

---

## What the later plan must carry (not designed here)

- Create `Election_Ledger` **or** extend `Election_Log` and update every reader in the same change.
- Columns for: office, incumbent, challenger POPID/name/origin, entered-cycle, trigger (`approval-40` / `retirement`), race status (`open` / `incumbent-saved` / `challenger-seated` / `retirement-pending-vote`), media-heat signal.
- Who writes the row at 40: the approval function (it already sees the number) vs a new small writer after it.
- Who names the challenger next cycle: same function, or a dedicated fill that runs after ApprovalRatings.
- Who seats below 20: one function. Update office card + citizen row + ledger status together.
- November `runCivicElections_` stay / shrink / read this ledger.
- Media: how "interview both" and "losing interviews → faster hits" become engine numbers without inventing quotes.
- Retirement two-candidate vote: its own design beat, after the approval-race works.
- Tests: entry, fill order, no-double-list, win only below 20, mint dirty, no POPID leak into prose, stub/coupling updated.
- Clasp / live sheet: engine-sheet. This research does not authorize that.

---

## Applications (living)

- 2026-08-14 — filed from Mike's process; no plan, no code.

---

## Changelog

- 2026-08-14 (grok) — Initial extraction. Mike process + existing November/`Election_Log`/approval facts. Verdict `adopt`, no plan ignited.
