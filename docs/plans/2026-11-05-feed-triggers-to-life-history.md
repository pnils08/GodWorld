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
  - docs/for-claude-review/2026-11-05-codex-engine333-read-before.md (codex independent read, reconciled §Codex)
  - phase05-citizens/runAsUniversePipeline.js:427-575 (the legacy Status=Retired post-career loop)
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

### Ripples of Status = Retired on a GAME-clock Tier-1 row — SUPERSEDED by the ruling below; kept as the record of why Status = Retired is the wrong cell (Vinnie: Tier 1, ClockMode GAME, SPORTS_OVERRIDE, employer BIZ-00005, Income 1.5M)

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

### What this changes in the design (points 4–5 and the C1–C3 table were rebuilt below after the ruling)

1. **Milestones read the row, not the team.** The NAMED loop already iterates exact-Cycle entries; reading `entry.eventTrigger` never sees a G-ES1 carried value. engine.331's re-fire fix is **not** a prerequisite for this row. The team-carried `S.sportsEventTriggers` stays the hooks' input and is untouched here.
2. **The one contract with engine.331 is the vocabulary pin.** `retirement` must enter `EVENT_TRIGGER_VALUES` (hook entry or test pin moved) or it cannot be entered through the dashboard. engine-sheet owns the list; this row names the word and its reader. Recorded in both plans' coordination sections.
3. **The log tag for a milestone is bare.** `[Retirement]` on the ledger line, `Retirement` alone in LifeHistory_Log `EventTag` (the milestone writers' convention), or acceptance 3 is unreachable. The texture lines keep the piped tag.
4. **Status conventions to copy exactly:** `Retired` capitalised; health states lowercase; `StatusStartCycle = cycle` on every Status change (the Phase-4 gate `statusStartCycle === cycle` is what gives a Phase-5 injury its first roll next Cycle); an injury emits a `S.hospitalEvents` entry (`kind: 'intake'`, `intakeType: 'injury'`, `priorStatus`, `sourceSystem: 'sports-feed'`) so Hospital_Ledger gets a real bed, not the self-heal.
5. **Idempotence is per row, not per re-fire:** a player already Retired ignores `retirement`; a player already in a health state ignores `injury`; `injury-return` on a player whose Status is `injured` discharges to PriorStatus (the health engine's own path) — a return on an Active player writes the line only.

### Builder's ruling 2026-11-05 (after the read-before) — a sports retirement is not a senior retirement

Builder's words: "a sports citizen can retire for baseball but still be of a working age to take on new opportunities. So where someone 70 years old should retire, Vinnie is 38 so putting him off Undocked and in a retirement event loop doesn't make sense." "injuries happen in my game that I add to the sports intake that should ripple into the sim, they can also get sick and have issue like Deacon Seymour did and was hospitalized." "these sports retirements are not senior citizens and they are likely to move into new career types, business owners, media, coach a team, etc, their stories don't end at retirement from sports, Vinnie Keane will continue to be a prominent citizen." "sports players in retirement are different than senior citizen retirement, the engine mode or flags should determine what a 'next chapter' looks like."

What that rules out, from the code: `Status = Retired` is the senior-retirement state — it drops a row from the UNDOCKED draw and the names floor, ends the career path, and (codex F1) the Universe phase turns a `Retired` GAME row into a post-career loop (`runAsUniversePipeline.js:433-456`: clock → ENGINE, "Moved into post-career life", then `:461-575` a 2% soft PostCareer-* texture each Cycle, "ENGINE may add soft post-career notes only"). That loop and the six hand-minted ex-A's rows (Status Retired, CareerStage retired, profile key "Retired") are the old convention. The engine does not perpetuate it; the six rows are not touched (rule 4). C1–C3 as first written are withdrawn — they were built on `Status = Retired`.

### The sports layer is two cells, and a sports retirement is leaving it

`isSportsLayerRow_` (`educationCareerEngine.js:404-408`) = ClockMode `GAME` or EconomicProfileKey `SPORTS_OVERRIDE`. Every sports-layer skip keys on those two, never on Status: career hiring and promotion pools (`runCareerEngine.js:344-348, 444-449` — also skip Tier 1–2 and non-ENGINE), wealth derivation (`generationalWealthEngine.js:613, 786, 1019, 1186`), career-stage derivation (`educationCareerEngine.js:345, 538, 1155`), the GAME micro-event draw (`generateGameModeMicroEvents.js:476-482`, GAME only), the staff week line (`applyGameNightMoments.js:247`, GAME + club employer), the Universe branch 1 (`runAsUniversePipeline.js:427-431`, UNI + Active + GAME = no random events).

So the retirement milestone is: **the row leaves the sports layer, Status stays `Active`.** ClockMode `GAME` → `ENGINE`, EconomicProfileKey `SPORTS_OVERRIDE` → blank (blank is the live convention on 251 ENGINE rows; the wealth fallback fills only a zero income, `:646-660`, so Tier-1 pay stands), `[Retirement]` line + bare `Retirement` log tag (one writer — the Universe branch 2 never fires because Status is not retired), UNI stays yes (guardrail), Tier and Famous stay, employer stays the club until a next-chapter row says otherwise. The staff week line stops by itself (clock). The hospital, judicial, UNDOCKED, names-floor and dashboard paths all see an Active citizen.

Only this milestone can flip the layer: the Advancement_Intake role change on an existing row (`processAdvancementIntake.js:884-935`) writes Tier (up only), RoleType, SkillTags and Income — never ClockMode or EconomicProfileKey (`:1007` is the mint). A next-chapter row filed on Vinnie today would leave him in the sports layer forever. That is the job's reason to exist.

**RoleType at the flip must change**, because `generateCitizensEvents.js:2922-2947` draws work texture for an ENGINE Active row from its Occupation cell; "busy day at work as a Designated Hitter" would contradict canon the Cycle after. The interim role is the engine's: `Former <position>, Oakland A's` (position taken from the current RoleType; the word "Legend" kept when present so `buildEveningFamous.js:188` keeps him in SPORTS_LEGENDS). `MINT_NO_EMPLOYMENT_ROLE` (`/retired|hall of famer/`) and `economicLookup.isRetiredRole` do not match "Former". CareerStage re-derives the same Cycle (Career runs after GameNight): age 38, 19.5 years → `mid-career` (`educationCareerEngine.js:445-460`).

### Next chapter by mode and tier — what the code already routes

| Row after the flip | Who writes the next chapter | Mechanism (exists) |
|---|---|---|
| ENGINE, Active, Tier 3–4, SkillTags `athlete` | The engine: the ordinary hiring pool next Cycle (`runCareerEngine.js:444-449`); `sportsHireBars_` (`:110-115`) bars him only from sports-sector seats, so "hired at Oakland Oaks" is never a signing | engine.135 / engine.307, live |
| ENGINE, Active, Tier 1–2 | Authored — the pools skip Tier 1–2 by design and top seats are authored, not pool-drawn (builder 2026-09-08). An Advancement_Intake row (new RoleType, income from the catalog band, SkillTags field — T5) or an owner-door row (engine.295 / 309 / 311, needs-info) | engine.329 intake, live; owner doors open rows |
| Club job (coach, front office, broadcaster for the club) | Authored — a `roster-move` feed row or intake row naming the club role; the row goes back on `GAME` with the club employer and the club RoleType; stat capture stays closed because the roster tab no longer lists him | dashboard `call-up` sets roster + RoleType; a "club staff" variant is a 331/dashboard question, not this row |
| Media (columnist, broadcaster) | Authored — intake row with ClockMode MEDIA; the media layer's own engines take over | engine.319 clock routing, live |

Vinnie's next chapter is the builder's authored input; this row's `retirement` opens the door at the fire and the engine's own doors (pool for the tail, authored for the top) carry him from there. Roster tabs: no engine phase reads `As_Roster` / `Oaks_Roster` (grep 2026-11-05); the dashboard resolves participants against them (`sportsFeedWriter.js:133-176`), so the exit must also remove him from the roster tab or the dashboard keeps offering stat capture and injuries on a player who left — the dashboard `trade-away` action already mutates `roster.team` (`sportsFeedContract.js:148-157`); the retirement row needs the same roster mutation (dashboard side, with 331) or the engine's own roster write (engine side, a new Phase-10 intent on a tab the engine never wrote — the larger change). Builder's call C5.

### Injury and sickness — mostly covered, one gap

Sickness: the health machine already runs for GAME rows (Deacon Seymour, ambulance C105 → recovering → recovered C107, `generationalEventsEngine.js:420-450`). Nothing to build.

Injury from the sports intake (the builder's input): the dashboard roster `injury` action already writes Status `injured`, StatusStartCycle, HealthCause, a `[SportsRoster]` line, a log row and a ripple; the health machine rolls him from the next Cycle; `return` discharges. What is missing: the bed. The dashboard writes no `hospitalEvents` entry, so Phase 10 self-heals a Hospital_Ledger row with blank IntakeType / SourceSystem / PriorStatus (`buildCyclePacket.js:1044-1071`; Deacon's row shows the same blanks from the older ambulance path). The fix is a gap fill, not a second writer: at the fire, a named feed row whose EventType is `injury` (or trigger `injury`) on a player whose Status is already a health state **this Cycle** emits the intake entry (`kind: 'intake'`, `intakeType: 'injury'`, `sourceSystem: 'sports-feed'`, `priorStatus` = the Status before, `sourceEventId` from the feed row) and writes the Sports-Injured line; on a player still Active it stamps Status `injured` + StatusStartCycle + HealthCause itself and emits the same entry. One writer per fact per Cycle: the dashboard when it got there first, the engine otherwise. C1 is closed by this; the dashboard contract (`sportsFeedContract.js:117-135` mandatory fields) is untouched.

### Calls that are the builder's (rebuilt)

| # | Call | Recommendation | Alternative |
|---|---|---|---|
| C4 | **Default landing after a feed `retirement`** | ENGINE clock, SPORTS_OVERRIDE cleared, Status Active, RoleType `Former <position>, Oakland A's` (Legend kept), employer kept, UNI kept — the door opens, the next chapter is authored (Tier 1–2) or pooled (Tier 3–4) | A club-job default that stays GAME (coach) — but then the engine invents the role; the builder's input should name it |
| C5 | **Roster tab on retirement** | Dashboard side: a `retirement` roster action beside `trade-away` that removes him from the roster tab and files the feed row (one input, with 331 / the dashboard owner) | Engine side: a new roster-tab write at Phase 10 — a tab the engine has never written |
| C6 | **The Retirement tag's dial** | Keep `[Retirement]` (family +4, drive −4; the wake loop perceives it as "you retired") — stepping away from the game is that event even at 38 | A `Sports-Retired` tag with its own dial (drive 0) and the wake loop's regex widened — more surface, same wake |
| C7 | **Wake proof** | Acceptance 3 reads "if drawn in the two-Cycle window" (codex F5: lived events do not reserve a wake slot) | A lived milestone forces the next wake — a cron change, its own row |

### Codex independent read (2026-11-05) — reconciled

| Finding | Verdict | Fold |
|---|---|---|
| F1 Universe phase rewrites a Retired GAME row | verified, decisive | The ruling removes `Status = Retired`; the milestone owns the clock flip and the single `Retirement` log row; Universe branch 2 stays as the legacy path for hand-minted rows (dead on live: the six are ENGINE already) |
| F2 a Status guard does not make a re-fired row idempotent | verified | Acceptance 1 scoped: the milestone is idempotent (a row already off the layer is skipped); the EventType texture line is per fire by engine.208's design; a same-Cycle replay is `cycleRollback.js`'s job, not this row's |
| F3 the trigger label does not reach seed / summary on a non-game row | verified | Claim withdrawn; the GameNight ripple's CauseDetail names the milestone ("retirement: <name>") so the seed and summary carry it without a hook |
| F4 a `retirement` hook would re-fire on the team carry | verified | The 331 contract is a pin that separates milestone words from hook words — no `retirement` hook |
| F5 wake not guaranteed in the window | verified | C7 |
| F6 writers inventory: chaosCars, health discharge and judicial restore can write `Retired` | verified | Inventory corrected: no engine path **initiates** retirement; restores carry it. StatusStartCycle is cleared on discharge/release — the milestone stamps it, the restores clear it |
| `signed` / `traded-away` wording | verified | The dashboard `trade-away` sets EventType `roster-move`, which the type route maps to Sports-Moved; the literal words are not vocabulary |
| wiring-card Status card mislabels | noted | The plan's inventory is from direct reads, not the card |

## Design (rebuilt 2026-11-05 on the ruling; Task 2 builds this)

1. **Trigger routing beside type routing.** In the NAMED line of `applyGameNightMoments_`, after the EventType route, read `entry.eventTrigger` (the row's own cell). A recognised trigger writes a second signed line (or replaces the Sports-Sociability-Up-S fallback when the type gave nothing specific), tag `source:sports|feedNamed|event:<type>|trigger:<trigger>|team:<team>`. Routing table, first cut: `hot-streak` → Sports-Streak-Hot; `cold-streak` → Sports-Streak-Cold; `awards` → Reputation-Award; `championship` → Sports-Champion; `legacy` / `community outreach` → Reputation; the rest → the type route stands, trigger kept in the tag. A trigger not in the table writes nothing extra and is counted in the engine log, so the vocabulary engine.331 settles on is what this reads.
2. **`retirement` leaves the sports layer** (C4): ClockMode → ENGINE, EconomicProfileKey → blank, RoleType → `Former <position>, Oakland A's` (Legend kept), `[Retirement]` line ("retired from the <team>, announced C<N>"), log EventTag bare `Retirement`, StatusStartCycle → cycle, Status untouched (Active). Skipped when the row is already off the layer. The GameNight ripple CauseDetail names it.
3. **`injury` fills the bed** (§Injury): intake entry + line when the dashboard stamped this Cycle; Status + StatusStartCycle + HealthCause + intake entry + line when it did not. `injury-return` on Status `injured` → the health engine's discharge path (PriorStatus). Already in a health state from an earlier Cycle → line only.
4. **Readers.** `buildVoiceBrief_` and `lookup_citizen` already show the feed lines and the row; after the flip the row reads Former <position>, ENGINE, Active. The citizen-voice character files stay as written — the brief says the records win.
5. **Not in this row:** the trigger vocabulary and re-fire (engine.331); the roster-tab exit if C5 lands dashboard-side; the next-chapter inputs (intake rows, owner doors — their own rows); any hand edit to Vinnie's row.

## Open with the builder

- C4 – C7 above.
- Sequence: this row waits on `retirement` entering the trigger list as a **milestone word** (engine.331 owns the list; codex F4 — not a hook), and on C5's side being chosen.
- The `retirement` feed row for Vinnie: his press conference. The builder files it when he judges the world is there; the engine opens the door at the next fire; his next chapter is the builder's next row.

## Coordination with engine.331 (engine-sheet)

| This row needs from 331 | 331 gets from this row |
|---|---|
| `retirement` in `EVENT_TRIGGER_VALUES` as a milestone word — the test pin split so a life-history word needs no `TRIGGER_HOOKS` entry (codex F4: a retirement hook would re-fire on the team carry) | A per-player reader for every trigger 331 adds: unknown triggers write nothing and are counted in the engine log |
| The off-season / variety vocabulary, so the routing table maps words that exist | The milestone pattern (`retirement`, `injury`) — a trigger that changes a row, not only a hook |
| Nothing on the re-fire fix — the named path reads the row's own cell | The finding that `S.sportsFeedEntries[*].eventTrigger` had no reader until now; the roster-tab exit question (C5) if it lands dashboard-side |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: `applyGameNightMoments_` NAMED path end to end; the 43 Retired rows' RoleType/Status convention; wakePerception `[Retirement]` read; engine.331 plan when written. Wiring card on `applyGameNightMoments_` and `S.sportsEventTriggers` | rb | done 2026-11-05 (§Read-before; three cards; codex independent read reconciled) |
| 1b | Builder rules C4 – C7 | Mike | open (C1–C3 withdrawn by the ruling) |
| 2 | Cut: trigger routing table + `retirement` leaves the sports layer + `injury` fills the bed; idempotent per row | rb | not started |
| 3 | Sandbox: plant one `retirement` row (NamesUsed = a bench-only name, never a live citizen), fire twice, read back clock / profile key / RoleType / Status / LifeHistory / log tag; plant a `hot-streak` named row, read the line; plant an `injury` named row with and without a prior dashboard stamp, read the bed | rb | not started |
| 4 | Codex review of the exact candidate; PROD push; DEPLOY_HISTORY | rb / codex | not started |

## Acceptance

1. A feed row `EventTrigger=retirement, NamesUsed=<player>` fired on the sandbox leaves the player ClockMode ENGINE, EconomicProfileKey blank, RoleType `Former <position>, …`, Status `Active`, one `[Retirement]` LifeHistory line and one LifeHistory_Log row whose EventTag is bare `Retirement`; a second fire with the same row changes none of those cells and adds no second `Retirement` log row; no staff week line on him from that fire — proven by sandbox readback across two fires.
2. A `hot-streak` named row writes one Sports-Streak-Hot line tagged with team and trigger on each named player — proven by sandbox readback.
2b. An `injury` named row on an Active player leaves Status `injured`, StatusStartCycle = that Cycle, HealthCause set, one Hospital_Ledger row with IntakeType `injury`, SourceSystem `sports-feed` and PriorStatus `Active`; the same row on a player the dashboard stamped that Cycle adds the bed and the line and changes no Status cell; the next fire rolls him through the health engine — proven by sandbox readback across two fires.
3. After the live fire that carries Vinnie's press-conference row, `lookup_citizen("Vinnie Keane")` shows Former Designated Hitter, Active, beside the feed line; if his page is drawn in the two-Cycle window the wake entry speaks from "you retired" (C7) — proven by his row and, when drawn, his page.

## Changelog

- 2026-11-05 (ruling) — builder: a sports retirement is not a senior retirement; Status stays Active, the row leaves the sports layer (clock, profile key, RoleType), next chapter by mode and tier; C1–C3 withdrawn, C4–C7 open; codex read reconciled (F1 Universe writer decisive).
- 2026-11-05 (later) — Task 1 read-before written (§Read-before): milestones read the row's own cell so 331's re-fire fix is not upstream; the vocabulary pin is the one 331 contract; bare log tag for the wake loop; `injury` added as a milestone; C1–C3 put to the builder.
- 2026-11-05 — drafted from the research.32 finding (no engine retirement path; EventTrigger read only per team) and the builder's words; row engine.333 filed ready, owner research-build next session; sibling engine.331 named.
