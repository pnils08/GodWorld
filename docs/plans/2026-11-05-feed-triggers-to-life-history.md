---
title: Feed Triggers to Life History Plan
created: 2026-11-05
updated: 2026-11-05
type: plan
tags: [engine, sports, read-before]
sources:
  - phase05-citizens/applyGameNightMoments.js (engine.208 — the feed-named line, routed by EventType)
  - phase02-world-state/applySportsSeason.js:195-250, 794-864 (EventTrigger read into S.sportsEventTriggers — team-scoped, hooks only)
  - lib/wakePerception.js:722-828 (the wake loop perceives a [Retirement] LifeHistory tag as "you retired")
  - output/beats/Oakland_Sports_Feed.jsonl (265 rows; EventTrigger filled on 163 — hot-streak 59, breaking-news 16, cold-streak 14, home-opener 9, playoffs 9, playoff-push 8, awards 7, pre-season 5, championship 5, draft 4, community outreach 4, legacy 2, contract-year 2, rivalry 2)
  - output/simulation_ledger_snapshot.jsonl (1,015 Active / 43 Retired; no engine phase writes Status Retired — grep 2026-11-05)
  - docs/plans/2026-11-05-discord-voices-lookups.md §Build log (how the gap surfaced: Vinnie's Discord voice reads "the club says I'm stepping away; my row says Active")
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.333; engine.331 (sports triggers: vocabulary, re-fire) is the sibling"
  - "[[2026-11-05-discord-voices-lookups]] — research.32, where the gap surfaced"
  - "[[2026-09-11-sports-as-a-lived-system]] — the sports-as-engine frame this sits in"
---

# Feed Triggers to Life History Plan

**Builder's words (2026-11-05):**
- "the retirement sounds like an intake item? Maybe I need to also run an Oakland sports feed entry as retirement, maybe we start to lean on the event triggers on Oakland sports feed to write lines to players life History, 'name used' with the 'event trigger' can start to add that to the players (game engine / Uni flag) life history, retired, hot streak, etc. That way if a player is named and covered in media, their life history also record the team, name used, event trigger."
- "some of this feeds into the job es just handed off for its next session that there are too few 'event triggers' in that they don't support enough event types. Not sure if they are the same work but we can start to make this a plan.md template and start to prep your one handoff to take this next session."
- "Vinnie Keane discord works and what he said is true and it's his own output given what's occurred and you're absolutely right regardless if this was announced as the 'farewell season' Vinnie would still need to have his press conference."

**Goal:** a player named on a sports-feed row carries that row's Event Trigger on their own life history, team and trigger in the tag; a few triggers are milestones that change the row itself — `retirement` writes `[Retirement]` and flips Status to Retired — so the wake loop, the brief and the Discord voice all read the same event the next Cycle. Vinnie's press conference is a feed row.

**Rows:** engine.333 · **Owner:** research-build (next session) · **Sibling:** engine.331 (engine-sheet) — the trigger vocabulary and the blank-cell re-fire

## What exists (read 2026-11-05)

| Piece | State |
|---|---|
| Feed row → named player's LifeHistory line | LIVE (engine.208, `applyGameNightMoments.js`): every row whose NamesUsed resolves by name writes one line, routed by **EventType** (game → Sports-Played / -PlayedWin; injury → Sports-Injured; roster-move / trade / re-signing / draft → Sports-Moved; feature / awards → Reputation; else a plain [Sports] line). Tag carries `source:sports\|feedNamed\|event:<type>\|team:<team>`. Vinnie Y3C10: "got recognized twice at the grocery store after the story ran" from the C114 player-feature. |
| Team week line for every GAME-clock player and staffer of a club that played | LIVE (engine.208 line 2) |
| EventTrigger | Read into `S.sportsEventTriggers` **per team** for story hooks (`applySportsSeason.js`, `storyHook.js:565`). Not read per named player. No trigger changes a row. A blank cell re-fires the team's last value (G-ES1 → engine.331). |
| Retirement | No engine path writes Status Retired or a `[Retirement]` life line. The 43 Retired rows were minted so. The wake loop would perceive `[Retirement]` ("you retired") if it were written. |
| Advancement_Intake | Exists (engine.329); a retirement could be filed there, but the club announces a retirement — that is a feed row (NamesUsed = the player, EventTrigger = retirement), which is the builder's game as the input. Intake stays for what happens off the field. |

## Read-before (Task 1, 2026-11-05 — rb; three wiring cards: `applyGameNightMoments_`, `S.sportsEventTriggers`, `Simulation_Ledger.Status`)

### What the engine does today

| Path | Where | What it does with a feed row |
|---|---|---|
| Row read | `applySportsSeason.js:168-250, 401-404` | Only rows whose Cycle = `S.cycleId` become `S.sportsFeedEntries`; each entry carries the row's **own** trimmed `eventTrigger` and `playerMood`. `entry.eventTrigger` has **no reader** anywhere in the engine. |
| Team carry | `applySportsSeason.js:929-1105` → `S.sportsEventTriggers` | Per-team state, last non-blank value carried across Cycles (G-ES1). Readers: `storyHook.js:565` (TRIGGER_HOOKS, 18 keys) and the Ripple `CauseDetail` → Story_Seed_Deck `Why` → world summary "What Moved" (codex engine.331 trace). |
| Named line | `applyGameNightMoments.js:217-234` | Every exact-Cycle row, every name in NamesUsed that resolves by name on a living row (`living()` excludes only deceased/dead — a Retired legend still resolves): one LifeHistory line routed by **EventType** (`sportsNamedRoute_` :137-149: game → Sports-Played/-PlayedWin by the week class; injury → Sports-Injured; roster-move/trade-recap/re-signing/draft → Sports-Moved; player-feature/awards → Reputation; else Sports-Sociability-Up-S since engine.299). Log tag is piped: `<tag>\|source:sports\|feedNamed\|event:<type>\|team:<team>`. |
| Staff week line | `:236-270` | Every GAME-clock row employed by BIZ-00005 / BIZ-00074 (or a RoleType naming the club) gets the week line. **Status is not read** — a Retired GAME row keeps receiving staff lines. |
| Status writers | card | Only four engine sites set a Simulation_Ledger Status: health admissions/transitions (`generationalEventsEngine.js:334,444,647,695`), two mints (`Active`), judicial release. Health states are lowercase (`injured`, `hospitalized`, `recovering`, `critical`, `serious-condition`, `deceased`); `Active` and `Retired` capitalised (`SIMULATION_LEDGER.md:204`). **No engine path writes Retired.** Live: 1,015 Active / 43 Retired, nothing else. |
| Dashboard roster events | `sportsFeedContract.js:110-160` ACTION_MATRIX, `projectRosterEventMutation` :594-640, `sportsFeedWriter.js:1015-1160` | `injury` / `return` / `call-up` / `trade-away` write Status, StatusStartCycle, HealthCause, a `[SportsRoster]` LifeHistory line, a LifeHistory_Log row and a Ripple row **at intake time, from the dashboard, outside the engine** (engine.77). No `hospitalEvents` entry — `buildCyclePacket.js:1044-1056` self-heals a Hospital_Ledger bed from the Status column every Cycle. No retirement action exists. |
| Health state machine | `generationalEventsEngine.js:420-450, 786-911` | Any row in a health state rolls each Cycle (injured → active / hospitalized …), first roll the Cycle after `StatusStartCycle`. Discharge restores `PriorStatus` from Hospital_Ledger (engine.283) — a Retired player who is hospitalised comes back Retired. |
| Wake loop | `lib/wakePerception.js:36-47` | Reads **LifeHistory_Log `EventTag`**, anchored `/^Retirement$/i` → "you retired"; hospital stays come from Hospital_Ledger. Milestone writers (`applyMilestone_` :1762-1776) put a **bare** tag in that column; the game-night `write()` puts the piped tag. A `Retirement\|source:sports…` log tag would **not** be perceived. |
| Trigger vocabulary | `utilities/setupSportsFeedValidation.js:135-153` | `EVENT_TRIGGER_VALUES` = exactly the TRIGGER_HOOKS keys, pinned by `sportsFeedContract.test.js`; the dashboard rejects any other value (`SAFE_ENUMS`), the sheet dropdown is advisory. `injury` and `injury-return` are in the list; `retirement` is not. |

### Ripples of Status = Retired on a GAME-clock Tier-1 row (Vinnie: Tier 1, ClockMode GAME, SPORTS_OVERRIDE, employer BIZ-00005, Income 1.5M)

- `applyGameNightMoments_` staff line — keeps writing "staff week" lines on him unless the cut gates on Status (he may still be a fan through DialState; that is the gate's fallback). **Needs a gate.**
- `buildEveningFamous.js` engine.296 — Status Retired + OriginGame MLB joins SPORTS_LEGENDS. Wanted.
- `undockedDraw.js:92`, `cron-desk-run.js:2858` — Active only: a retired player leaves the UNDOCKED draw and earns no names-floor credit.
- `generationalWealthEngine.js:615` — Retired Tier 3+ income → 0; Tier 1–2 exempt, so his 1.5M stands (a retired star's money is Paulson's call, builder 2026-08-30).
- `runCareerEngine.js:304,1298`, `educationCareerEngine.js:541` — exact `Active` / sports-layer gates: career path ends, stage untouched. Nothing re-derives.
- `generateCitizensEvents.js:2922` — retired draws no work texture (ENGINE rows only; GAME rows never did).
- Dashboard — `App.jsx:953` red Status badge; `SportsIntakeWorkspace.jsx:205-215` roster actions gate on status, so a Retired player cannot be injured or called up from the dashboard.
- Readers that already show Status: `lib/discordLookups.js:135`, `lib/personaProvider.js:280`, `lib/mags.js:934`, `scripts/daily-reflection.js:70`. The club-says / books-say split closes by itself.
- Ripple attribution: the trigger label reaches Story_Seed_Deck `Why` and the world summary — the press conference becomes a seed with no extra wiring.
- Phase order inside Phase 5: GameNight (:623) runs before Career (:644), Advancement (:668), Wealth (:670) — a Status set here is seen the same Cycle.
- `MINT_NO_EMPLOYMENT_ROLE` (`processAdvancementIntake.js:1774`) and `economicLookup.isRetiredRole` read **RoleType** for `/retired/`; the 43 minted rows carry no single convention ("Retired former As", "Ex-As Star - RF", "Former Manager, Oakland A's", bare job titles).

### What this changes in the design

1. **Milestones read the row, not the team.** The NAMED loop already iterates exact-Cycle entries; reading `entry.eventTrigger` never sees a G-ES1 carried value. engine.331's re-fire fix is **not** a prerequisite for this row. The team-carried `S.sportsEventTriggers` stays the hooks' input and is untouched here.
2. **The one contract with engine.331 is the vocabulary pin.** `retirement` must enter `EVENT_TRIGGER_VALUES` (hook entry or test pin moved) or it cannot be entered through the dashboard. engine-sheet owns the list; this row names the word and its reader. Recorded in both plans' coordination sections.
3. **The log tag for a milestone is bare.** `[Retirement]` on the ledger line, `Retirement` alone in LifeHistory_Log `EventTag` (the milestone writers' convention), or acceptance 3 is unreachable. The texture lines keep the piped tag.
4. **Status conventions to copy exactly:** `Retired` capitalised; health states lowercase; `StatusStartCycle = cycle` on every Status change (the Phase-4 gate `statusStartCycle === cycle` is what gives a Phase-5 injury its first roll next Cycle); an injury emits a `S.hospitalEvents` entry (`kind: 'intake'`, `intakeType: 'injury'`, `priorStatus`, `sourceSystem: 'sports-feed'`) so Hospital_Ledger gets a real bed, not the self-heal.
5. **Idempotence is per row, not per re-fire:** a player already Retired ignores `retirement`; a player already in a health state ignores `injury`; `injury-return` on a player whose Status is `injured` discharges to PriorStatus (the health engine's own path) — a return on an Active player writes the line only.

### Calls that are the builder's (mechanism shown, judgment his)

| # | Call | Option A | Option B |
|---|---|---|---|
| C1 | **Who owns a sports injury's Status** — the dashboard roster event already stamps it at intake; a feed `injury` trigger would stamp it again at the fire | Engine owns it: the feed trigger writes Status + hospital bed; the dashboard `injury` / `return` actions stop writing Status (their line and ripple stay) — one writer, the Cycle is when it happens | Both, engine defers: the trigger writes the line only when `StatusStartCycle === cycle` already (the dashboard got there first); otherwise the engine stamps |
| C2 | **Staff week line after retirement** | Status Retired drops a GAME row from the staff line; the fan branch still applies if his DialState fandom ≥ 60 | Retired staff keep the staff line (he is still "of the club") |
| C3 | **RoleType on retirement** | Minimal: Status, StatusStartCycle, `[Retirement]` line; RoleType untouched (his role is his history; `isRetiredRole` then reads false — Tier-1 income is exempt anyway) | Prefix "Retired" the way four of the 43 read ("Retired former As …") — `isRetiredRole` becomes true |

Recommendation: C1 A, C2 A, C3 A. Builder's words on each go in the Changelog.

## Design (audited 2026-11-05 against the read-before; Task 2 builds this)

1. **Trigger routing beside type routing.** In the NAMED line of `applyGameNightMoments_`, after the EventType route, read `entry.eventTrigger` (the row's own cell). A recognised trigger writes a second signed line (or replaces the Sports-Sociability-Up-S fallback when the type gave nothing specific), tag `source:sports|feedNamed|event:<type>|trigger:<trigger>|team:<team>`. Routing table, first cut: `hot-streak` → Sports-Streak-Hot; `cold-streak` → Sports-Streak-Cold; `awards` → Reputation-Award; `championship` → Sports-Champion; `legacy` / `community outreach` → Reputation; `breaking-news`, `contract-year`, `rivalry`, `home-opener`, `playoffs`, `playoff-push`, `pre-season`, `draft` → the type route stands, trigger kept in the tag. A trigger not in the table writes nothing extra and is counted in the engine log, so the vocabulary engine.331 settles on is what this reads.
2. **Milestone triggers change the row.** `retirement` → LifeHistory `[Retirement]` line ("retired from the <team>, announced <event type> C<N>"), log EventTag bare `Retirement`, Status → `Retired`, StatusStartCycle → cycle; RoleType per C3. UNI flag stays (ruling: retired players keep UNI). The wake loop perceives it next Cycle. `injury` → Status `injured`, StatusStartCycle, HealthCause from the row's Notes (fallback "sports injury"), a `S.hospitalEvents` intake entry, the existing Sports-Injured line — ownership per C1. `injury-return` → discharge through the health engine's PriorStatus path when Status is `injured`. `signed` / `traded-away` are already Sports-Moved by type — no change. No other trigger touches Status.
3. **Idempotence.** Per row: a player already Retired ignores `retirement`; a player already in a health state ignores `injury`. The carry re-fire (G-ES1) cannot reach this path because it reads the row's own cell, not the team state.
4. **Readers.** `buildVoiceBrief_` and `lookup_citizen` (research.32) already show feed lines newest first and the ledger status; once Status flips, the "club says / books say" split closes itself. The citizen-voice character files (`IDENTITY.md` "farewell season, bench role") stay as written — the brief says the records win.
5. **Not in this row:** the trigger vocabulary and re-fire (engine.331); whether a Discord talk's hedge should write a TENSION to the voice's page (research.32 observation, builder's call); any hand edit to Vinnie's row (never — his retirement is the feed row the builder files, run by the engine).

## Open with the builder

- C1 / C2 / C3 above.
- Sequence (read-before finding): this row no longer waits on engine.331's re-fire fix. It waits only on the word `retirement` entering the trigger list, which engine.331 owns — or engine.331 adopts this row's reader for every trigger it adds.
- The `retirement` feed row for Vinnie: his press conference. The builder files it when he judges the world is there; the engine does the rest at the next fire.

## Coordination with engine.331 (engine-sheet)

| This row needs from 331 | 331 gets from this row |
|---|---|
| `retirement` in `EVENT_TRIGGER_VALUES` (hook entry or the test pin moved) so the dashboard accepts it | A per-player reader for every trigger 331 adds: unknown triggers write nothing and are counted in the engine log, so the table here is the list of words that reach a life |
| The off-season / variety vocabulary, so the routing table maps words that exist | The milestone pattern (`retirement`, `injury`) — a trigger that changes a row, not only a hook |
| Nothing on the re-fire fix — the named path reads the row's own cell | The finding that `S.sportsFeedEntries[*].eventTrigger` had no reader until now |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: `applyGameNightMoments_` NAMED path end to end; the 43 Retired rows' RoleType/Status convention; wakePerception `[Retirement]` read; engine.331 plan when written. Wiring card on `applyGameNightMoments_` and `S.sportsEventTriggers` | rb | done 2026-11-05 (§Read-before; three cards; codex independent read requested) |
| 1b | Builder rules C1 / C2 / C3 | Mike | open |
| 2 | Cut: trigger routing table + milestones `retirement` and `injury` (Status, StatusStartCycle, bare log tag, hospital intake entry), idempotent per row; staff-line gate per C2 | rb | not started |
| 3 | Sandbox: plant one `retirement` row (NamesUsed = a bench-only name, never a live citizen), fire, read back Status + LifeHistory + the wake line; plant a `hot-streak` named row, read the line | rb | not started |
| 4 | Codex review of the exact candidate; PROD push; DEPLOY_HISTORY | rb / codex | not started |

## Acceptance

1. A feed row `EventTrigger=retirement, NamesUsed=<player>` fired on the sandbox leaves the player Status `Retired`, StatusStartCycle = that Cycle, RoleType per C3, one `[Retirement]` LifeHistory line with team and Cycle and a LifeHistory_Log row whose EventTag is bare `Retirement`; a second fire with the same row changes nothing; the player receives no staff week line on that fire (C2 A) — proven by sandbox readback.
2. A `hot-streak` named row writes one Sports-Streak-Hot line tagged with team and trigger on each named player — proven by sandbox readback.
2b. An `injury` named row leaves the player Status `injured`, StatusStartCycle = that Cycle, HealthCause set, one Hospital_Ledger row with PriorStatus = the prior Status (not the self-healed bed), and the next fire rolls him through the health engine — proven by sandbox readback across two fires.
3. After the live fire that carries Vinnie's press-conference row, the wake loop's next entry on his page speaks from "you retired", and `lookup_citizen("Vinnie Keane")` shows Status Retired beside the feed line — proven by his page and one bot log line.

## Changelog

- 2026-11-05 (later) — Task 1 read-before written (§Read-before): milestones read the row's own cell so 331's re-fire fix is not upstream; the vocabulary pin is the one 331 contract; bare log tag for the wake loop; `injury` added as a milestone; C1–C3 put to the builder.
- 2026-11-05 — drafted from the research.32 finding (no engine retirement path; EventTrigger read only per team) and the builder's words; row engine.333 filed ready, owner research-build next session; sibling engine.331 named.
