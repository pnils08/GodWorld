---
title: A Former Player's Next Chapter Plan
created: 2026-11-07
updated: 2026-11-07
type: plan
tags: [engine, sports, citizens, active]
sources:
  - docs/plans/2026-11-05-feed-triggers-to-life-history.md §Builder's ruling (engine.338), §Next chapter by mode and tier
  - output/production_log_run_cycle_c114_gaps.md G-RB7, G-RB8
  - docs/plans/2026-09-19-civic-wake-game-loop.md §Task 2 (the move ledger — the channel precedent)
  - docs/plans/2026-09-24-initiatives-in-the-world.md (S491 — choices without a menu)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.338 (folds engine.337)"
  - "[[2026-11-05-feed-triggers-to-life-history]] — engine.333, the retirement flip this row follows"
---

# A Former Player's Next Chapter Plan

**Builder's words (2026-11-07, opening the row):** "what happens to a retired citizen with a flag on 'UNI' and clock on engine and how the sports_override maintains this or how it would shift to post career type jobs. And to make this more autonomous how do we present the cron with choices on careers paths?"

**Builder's words (2026-11-05, the ruling this row rests on):** "these sports retirements are not senior citizens and they are likely to move into new career types, business owners, media, coach a team, etc, their stories don't end at retirement from sports, Vinnie Keane will continue to be a prominent citizen." "sports players in retirement are different than senior citizen retirement, the engine mode or flags should determine what a 'next chapter' looks like." And 2026-11-06: "his job won't end up as ride share driver".

**Builder's words (2026-11-07, opening the session):** "If we have what we need for engine.338 we can proceed, any judgement calls on sim behavior prompt me".

**Goal:** a former player who left the sports layer (engine.333) reaches a post-career role through an engine path — the row's cells change (role, employer, clock where the role needs one, pay), the citizen's own word picks the direction, and the engine routes it — with no hand edit to any citizen's row.

**Rows:** engine.338 (folds engine.337) · **Owner:** research-build

## Read-before (Task 1, 2026-11-07 — rb)

### The row after the C115 fire (Vinnie Keane, POP-00001; the live row today is GAME / SPORTS_OVERRIDE)

ENGINE · Active · Tier 1 · UNI yes · EconomicProfileKey blank · RoleType `Former Designated Hitter, Oakland A's Legend` · EmployerBizId BIZ-00005 (the A's) · Income 1,500,000 · CareerStage re-derived `mid-career` · SkillTags `athlete` (bench C115, engine.333 Task 3).

### What the engine does with that row, every Cycle

| Path | Reads | Result on the row | Where |
|---|---|---|---|
| Universe phase (UNI rows) | Status + ClockMode | three branches: Active+GAME (no events), Retired+GAME (flip + "post-career life"), Retired+ENGINE (2% PostCareer-* texture). **Active+ENGINE falls through all three** — nothing | `runAsUniversePipeline.js:417-575` |
| Six regular-life engines: career, household, education, relationship, neighborhood, generic micro-event | UNI/MED/CIV flag | **skipped** — the flag is the guardrail (builder 2026-10-08: canon figures stay off random life events; never clear UNI on a retired player) | `runCareerEngine.js:1274`, `runHouseholdEngine.js:472`, `runEducationEngine.js:340`, `runRelationshipEngine.js:328`, `runNeighborhoodEngine.js:498`, `generateGenericCitizenMicroEvent.js:514` |
| Career pools (hire, promotion, custody dismissal) | Tier, ClockMode, key, Status | **skipped on Tier alone** (Tier 1–2 never pooled), before UNI is consulted | `runCareerEngine.js:347, 445, 1273` |
| Wealth derivation | `isSportsLayerRow_` (GAME or SPORTS_OVERRIDE), then Status, then Tier | off the sports skip now the key is blank; **skipped on Tier 1–2** | `generationalWealthEngine.js:786-790, 1019-1023` |
| Daily texture | Occupation (RoleType), employer | runs: `[Work]` lines read him as club staff because the employer is still the A's (G-RB7) | `generateCitizensEvents.js:2922-2947` |
| Health machine, death / milestone dice | ClockMode ENGINE | run as for any ENGINE citizen | `generationalEventsEngine.js` |
| Named feed lines | NamesUsed on a feed row | run — a `community-outreach` or `award` row still writes his line | `applyGameNightMoments.js` (engine.333 routes) |
| Wakes | lottery + owed reserve | the retirement is owed tier 1 inside the two-Cycle window (engine.333 C7); afterwards lottery only | `wakePerception.js:925-938` |

So the row lives on texture, health, dice, feed lines and wakes. **No path changes his job, employer, clock or pay.** That is the fact behind the builder's first question: the key does nothing once engine.333 blanks it; UNI is what keeps the random life off him, and that is ruled right for a canon figure.

### The door that exists is half a door

The only engine writer that changes an existing citizen's role is the Advancement_Intake path (`processAdvancementIntake.js:880-935`). On an existing row it writes **Tier (up only), RoleType, SkillTags (the new role's field leads), Income (re-priced from the job catalog band, else the salary pools; no match → untouched), LastUpdated** — and nothing else (every `ledgerRows[existingRow][*] =` in the branch, read 2026-11-07). It never writes **EmployerBizId, ClockMode or EconomicProfileKey** on an existing row; those three are the mint's (`:1007`, `:1102-1151`). Consequences for a former player:

- a club job (coach, front office, broadcaster for the club) cannot put him back on the GAME clock with the club — the intake row would change his title and leave him ENGINE;
- a media job cannot move him to the MEDIA clock (engine.319 routes new citizens by clock at the mint only);
- an academy, business or nonprofit job cannot move his employer off BIZ-00005 — the `[Work]` texture keeps reading him as club staff (G-RB7) through any intake row.

The live proof of the finished state is **Mason Miller, POP-00127**: former Hall-of-Fame A's closer, RoleType `Sports Analyst A's / Retired HOF A's Closer`, Tier 1, ENGINE, Active, UNI yes, EconomicProfileKey `Journalist / Reporter`, Income 130,000 — hand-minted, and living (texture, `[Work]` lines, dial events every Cycle). The row this plan builds the path to is that shape, reached by the engine.

**EconomicProfileKey** is written by exactly two engine paths: `settleAdulthood_` at coming-of-age (`educationCareerEngine.js:1244`, the catalog key for the settled role) and engine.333's blank at the retirement flip. Readers: `isSportsLayerRow_` (only the word `SPORTS_OVERRIDE` matters), the wealth engine (a non-blank key = a seeded profile, `:649`; blank = legacy fallback on Income), `educationCareerEngine.js:1156` (a non-blank key marks a settled row). 263 live rows carry a blank; 39 carry `Journalist / Reporter`; the catalog keys are role names.

### engine.337 folded — the three ex-MUBA rows (G-RB8)

POP-00508 / 00509 / 00510: ENGINE clock, `SPORTS_OVERRIDE`, Status Retired, CareerStage retired, Tier 2, UNI no. Every reader that consults the key also skips a Retired row: both wealth paths `continue` on `isSportsLayerRow_` and again on `status === 'retired'` (`generationalWealthEngine.js:786-788, 1019-1021`); the career pools skip Status / CareerStage retired (`runCareerEngine.js:1298, 1278`); the school-stage pass is minors only (`educationCareerEngine.js:345-349`); the staff week line needs the GAME clock. **The key is inert on a Retired row.** Convention recorded: an off-clock retired athlete's key is blank (engine.333 writes it so; the live convention on 263 rows); a role that lands later carries the role's catalog key (the Mason Miller shape). The three rows are not touched (rule 4). Nothing to build; engine.337 closes into this plan.

### The channel precedent: how a cron already makes a choice the engine routes

| Channel | What the cron produces | Where it lands | What the engine does with it |
|---|---|---|---|
| Citizen wake (`scripts/citizen-wake.js`) | a 260-token reflection on DeepSeek flash, classified to **one closed tag** (44 words; `Career-Transition` among them) | Reflection_Intake | a dial nudge at the gated read (`Career-Transition` = drive +3, openness +3, `citizenDialMap.js:44`) — **never a cell change** |
| Civic seats (`scripts/cron-civic-run.js`) | a **closed move set** in JSON — `propose` in the seat's own words under a category, `work`, `answer`, `canvass`, `call-vote`, `renew` (`:2797`) | an append-only move ledger `output/cron-civic/moves/moves_c<N>.jsonl`, folded Sunday (`foldMovesIntoDecisions`, `:3206`) into candidates → `createInitiative.js` → validation → the tracker row | the engine votes and runs what the fold filed (civic.38 Task 2; S491: "no menu — seats propose in own words under a category, the engine routes") |
| Media room (Phase 7, engine) | — | **queues Advancement_Intake rows itself** (`mediaRoomIntake.js:459-469`) | `processAdvancementIntake_` applies them next Cycle |

So "present the cron with choices" has one working shape in this codebase: a closed move set, the citizen's own words under a category, an append-only ledger, a Sunday fold into the tab the engine already reads. The Reflection_Intake tag is the wrong channel (one word, dials only). The intake tab is the right landing (the engine already consumes it, with the half-door gap above).

### Who speaks for him at the wake

`citizen-wake.js` builds the system prompt from the ledger row, dials, life tail and co-residents (`:207`), adds the authored voice agent's `## Your Voice` section only (`loadVoiceTexture`, `wakePerception.js:397-402`), and generates on `deepseek/deepseek-v4-flash-0731`, 260 tokens (`:225`). Vinnie's full character files (`.claude/agents/citizen-voice-vinnie-keane/` — the academy he founded, the firehouse on Mandela Parkway, "the kid who was found") reach interviews, Discord and the desk crons through `lib/personaProvider.js`, **not the wake**. "In his own words" at the wake today is a small model with his cadence and his row, not his canon.

## Builder's words 2026-11-07 (on the first pass of C1–C4 — the calls below are being rebuilt on these)

1. "Should sports-override have a player vs staff distinction?"
2. "Correct that this isn't build fully and post sports career jobs I've been hand-minting. The jobs they would take would be a small pool of the jobs pools we offer, reduced to like, sports analyst, college coach, etc type things and tier would matter, but also considering heritage lines own businesses as is. So there is a system that can work here but some real design is needed"
3. "The build for crons should start to present some wakes with choices the engine puts in front of them. So if I wanted to run a row in Oakland sports feed and maybe we add a trigger 'question' and it asks Vinnie is he wants to be a coach or not. I can pose the question but he would make the decision"
4. "MUBA is a basketball league I ran in my head as a kid, these are the legendary players from that. I haven't written their backgrounds or added their prose yet but these are players from an old basketball league that now reside in Oakland. It's a neat way for me to bring them to life finally, but there use case is the test in a lot of ways, these MUBA players and retired A's players living their lives out in Oakland and how a former athlete lives. Tier matters and fame as to what type of jobs could be presented to them, and there isn't a priority to work at all, it would be their life declining that may force them to want to work"

Code read against these (2026-11-07): the job catalog (`data/economic_parameters.json`) carries **no** sports analyst, coach, scout or broadcaster role — Mason Miller's `Sports Analyst` is off-catalog (his key is `Journalist / Reporter`); the post-sports pool needs catalog entries before any router can price or key it. The wealth engine skips Tier 1–2 on both paths (`generationalWealthEngine.js:790, 1023`), so a former star's NetWorth never moves — "life declining" has no engine source today for the rows this is about. The three MUBA rows are Status `Retired` — the senior state (off UNDOCKED, off the names floor, Universe branch 3 texture) — not the Active / `Former …` shape engine.333 gives a retiring A's player.

## Calls that are the builder's

Each call shows what the code does today beside it. Ruled items are not re-asked: UNI stays yes (builder 2026-10-08), Status stays Active and the key blank at the flip (engine.333 C4).

| # | Call | What the code does today | Recommendation | Alternative |
|---|---|---|---|---|
| C1 | **Who picks a Tier-1 former player's next chapter** | nothing — no path; the builder's intake row by hand is the only door, and it is half a door | the citizen proposes in his own words under a category at his owed retirement wake; the fold queues the intake row; **the builder confirms before the Sunday fire** (the civic dry-run shape: the row sits visible in Advancement_Intake1 until the Cycle applies it, and he can clear it). Reconciles "make this more autonomous" with "top seats are authored, not pool-drawn" (2026-09-08) | (a) fully autonomous — the fold queues, the Cycle applies, no look; (b) the builder authors every row by hand and this job only fixes the half door |
| C2 | **The category set, and what each does to the row** | the engine knows three shapes: GAME clock + club employer (player, manager — Deacon Seymour), MEDIA clock (Mags Corliss), ENGINE clock + a tracked employer (Elias Varek, Mason Miller) | four categories from the builder's own list: **club** (coach / front office / club broadcaster → back on GAME, employer the club, RoleType the club role), **media** (columnist / analyst / broadcaster → MEDIA clock, employer a media business, key `Journalist / Reporter`), **business** (owner or director — his academy, a venture → ENGINE, employer the business row, OwnerOfBizId when he owns it), **civic** (a board, a commission → the CIVIC clock is the civic engine's; needs its own read before it is offered). Each category = one routing recipe; the words inside it are his | fewer categories (club / media / business only); or no categories — free text the fold matches to the catalog |
| C3 | **Pay after the chapter** | a role change re-prices Income from the catalog band or the salary pools (`:905-920`); Mason Miller sits at 130,000 on that path; a role with no catalog match leaves Income untouched | **the band** — the ledger's Income is this year's pay, not his fortune; the dynasty money is the wealth engine's (NetWorth / assets), which Tier 1–2 skips and this row does not touch. A former star on a coach's or analyst's salary is the sim reading true | hold 1.5M (the ledger would say a coach earns a star's pay); or a floor for Tier 1 |
| C4 | **When he chooses** | the retirement is owed tier 1 for two Cycles after the fire; after that he is in the lottery like anyone | **at the owed retirement wake** (C115 → owed through C117) — the one wake the cron guarantees him, speaking from "you retired"; a citizen who does not answer stays Former until a later wake or the builder's row | a gap Cycle first (retire, then decide); or a standing offer at every wake until taken |

## Design (sketch — rebuilt after the builder rules C1–C4; Task 2 builds the engine half, Task 3 the cron half)

1. **The engine half — the whole door.** `processAdvancementIntake_`'s existing-row branch learns three cells it never wrote: **EmployerBizId** (a `BIZ-` id on the tracked ledger, or `SELF_EMPLOYED`; the business must exist — the mint's own check), **ClockMode** (one of the four, the mint's `MINT_CLOCK_MODES_`; a change between clocks is logged on the Advancement line), **EconomicProfileKey** (the catalog key for the new RoleType where one exists, else blank — the `settleAdulthood_` lookup, one shared helper). Only a row that names them changes them; blank keeps the cell (the existing contract for RoleType). The sports layer's own skip stays: a row moving a citizen **to** GAME with a sports employer sets no key (`SPORTS_OVERRIDE` is the roster's word, not the intake's). SIMULATION_LEDGER column map rows for the three cells; the Advancement log line names every cell that moved. Idempotent: a re-run of the same row changes nothing.
2. **The cron half — the choice.** `citizen-wake.js`, on an owed `milestone:Retirement` wake for a row whose RoleType begins `Former`: one more line in the user prompt asks what he does next, and the reply carries a closed move beside the reflection — `{type:'next-chapter', category, role (his words), where (his words)}` — parsed like the civic datawake's moves (`validateDatawakeMoves` shape), refused loudly off-vocabulary. Written to an append-only ledger `output/citizen-moves/moves_c<N>.jsonl` (same line contract as the civic ledger: id, status lines, last wins). Nothing else in the wake changes; a wake with no move is the wake as it is today.
3. **The fold.** A Node step on the Sunday pre-fire path (where the civic fold runs) takes pending `next-chapter` moves, routes each by category to an intake row — RoleType from his words normalised to a catalog title where one matches (else his words, Title Case), EmployerBizId by category (the club; a media business by hood; the business he names if it is on the ledger, else `SELF_EMPLOYED`), ClockMode by category, Notes = his words verbatim, Tier blank, flags blank — and appends it to Advancement_Intake1 under the one-row-per-citizen dedup. Dry-run default; `--apply` appends. C1 decides whether the row then waits for the builder's look (the default) or the Cycle takes it. Status lines `queued` / `applied` / `refused` go back on the move ledger.
4. **Seam with engine.336.** An intake row that changes RoleType or EmployerBizId is a "job change" — engine.336 writes the `Now:` bio line for it. **338 writes the cells; 336 writes the line.** This row adds nothing to CitizenBio.
5. **Not in this row:** the move set for any other milestone; the civic category's engine read (C2, offered only after it); the owner doors (engine.295 / 309 / 311); any hand edit to Vinnie's, Mason Miller's or the MUBA rows.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: the row after C115 across every engine path; the intake existing-row branch's writes; the key's writers and readers; the three channels a cron has; who speaks at the wake; G-RB8 collapse | rb | done 2026-11-07 (§Read-before) |
| 1b | Builder rules C1–C4 | Mike | not started |
| 2 | Engine cut: the existing-row intake branch writes EmployerBizId / ClockMode / EconomicProfileKey; shared catalog-key helper; log line; column-map rows; unit tests (blank keeps, each cell moves, GAME + sports employer sets no key, re-run idempotent, bad clock / unknown business refused) | rb | not started — after 1b |
| 3 | Cron cut: the `next-chapter` move at the owed retirement wake; the move ledger; the Sunday fold to Advancement_Intake1 (dry-run default); tests (move parse, off-vocab refusal, fold routes each category, dedup, dry-run writes nothing) | rb | not started — after 1b |
| 4 | Sandbox: plant a bench-only former player (engine.333's marker), file one intake row per category, fire twice, read back the cells and the Advancement log; the fold's dry run against the bench's own owed wake | rb | not started |
| 5 | Codex review of the exact candidate; PROD push; DEPLOY_HISTORY | rb / codex | not started |
| 6 | Live read: Vinnie's owed wake inside the window, his move, the fold's row, the fire that applies it | rb | waits on C4 and the live fire after |

## Acceptance

1. An Advancement_Intake1 row for an existing ENGINE / Active / Tier-1 citizen naming RoleType, EmployerBizId and ClockMode leaves the ledger row with those three cells changed, SkillTags led by the new field, Income re-priced per C3, the key per the catalog, one Advancement log line naming every cell that moved; a second fire of the same row changes nothing — proven by sandbox readback across two fires.
2. A `next-chapter` move written at an owed retirement wake folds into exactly one intake row routed by its category; an off-vocabulary move is refused and logged, never filed; a dry-run fold appends nothing — proven by unit tests and the fold's dry run on the bench.
3. After the live path runs end to end, `lookup_citizen("Vinnie Keane")` shows the new role, employer and clock beside the retirement line, and the `[Work]` texture the Cycle after reads the new workplace, not the club — proven by his row and his life lines.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| — | | | |

## Open questions

- C1–C4 above — block Tasks 2 and 3; for the builder.
- engine.336's row pointer also points into the engine.333 plan, which archives after the C115 read; it needs its own plan file when picked up (not this job's).

## Changelog

- 2026-11-07 (research-build) — builder answered the first pass: a feed trigger `question` poses, the citizen decides; a small tier-gated post-sports job pool from the catalog (none exist yet); heritage lines own businesses; no priority to work, decline forces it; MUBA rows are the test case. C1–C4 rebuilt and re-asked.
- 2026-11-07 (research-build) — Created from the engine.333 plan's §Builder's ruling (engine.338); read-before done; engine.337 folded (key inert on a Retired row, convention recorded); C1–C4 drafted for the builder.
