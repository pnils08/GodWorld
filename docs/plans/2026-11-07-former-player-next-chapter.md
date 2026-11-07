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

Code read against these (2026-11-07): the job catalog (`data/economic_parameters.json`, 309 entries, `role / category / incomeRange / medianIncome`) carries **no** sports analyst, coach, scout or broadcaster role — Mason Miller's `Sports Analyst` is off-catalog (his key is `Journalist / Reporter`); the post-sports pool needs catalog entries before any router can price or key it. The three MUBA rows are Status `Retired` — the senior state (off UNDOCKED, off the names floor, Universe branch 3 texture, **and skipped by the money loop**, `generationalWealthEngine.js:415`) — not the Active / `Former …` shape engine.333 gives a retiring A's player; they carry UNI `no` (Vinnie: `yes`).

**Correction (same day, second read).** The first read said the wealth engine skips Tier 1–2 so a former star's NetWorth never moves. Wrong. The Tier 1–2 skips are on the **pay-floor** path (`:786-791`), the **untracked-job reference** (`:1019-1024`) and the **off-heritage owner draw** (`:1186-1188`). The money loop itself (`applyMoneyLoop`, `:413-538`) gates on Status Active and age ≥ 18 only — no Tier, no clock, no key, no UNI: every Active adult accrues `Income/52 × SavingsRate` (× education / SuperCouple / bank-rate factors) less the debt drag, each Cycle. Vinnie accrues today on the GAME clock: 1,500,000/52 × 0.02 ≈ **$577 a week** on a NetWorth of 449,634,608. His heritage line LIN-00003 Keane is `Established / active / 2 firms` (engine-sheet bench logs 2026-10-25): Keane Mercantile (BIZ-00185, revenue 380,844, 4 × 42,000 payroll → profit ≈ 212,844) lands `× 0.5 ÷ 52 ≈ **$2,046 a week**` on his NetWorth as a heritage gain (`applyOwnerDraw_`, `:1166-1181`); the Firehouse 29 academy (BIZ-00103) has blank revenue → no signal.

**How money depreciates in this project: it does not, for anyone.** NetWorth goes down only by: the cost of a debt level paid down (`DEBT_PAYOFF_COST 800 × level × factors`), an unplanned-expense shock of $1,500–8,000 at p = 0.004 a Cycle (≈ once per five years), property tax once a year on an **owned** home (engine.271, `:1838-1920`), a home down payment, and the custody debit (engine.254). There is no living cost, no lifestyle spend, no draw-down anywhere in the five phases — a citizen with no income and no debt holds a flat NetWorth forever. So "life declining forces work" has no physics in the city at all, not only for athletes; the builder's own "wealth path could be a sim-wide solution" is the right size for it (its own row).

**Retirement leaves Income untouched.** `sportsRetire_` (`applyGameNightMoments.js:273-290`) writes ClockMode, the key, RoleType, the `[Retirement]` line and the `Now:` bio sentence — not Income. After Sunday Vinnie banks savings off a 1.5M player salary for a job he no longer has. The income lookup already carries a pension shape — `calculateIncome(..., { isRetired: true })` prices a band at 0.55–0.65× (`lib/economicLookup.js:58, 87`) — with **zero** engine callers (tests only). One cell at the flip, from a per-tier table, is the fix.

## Builder's words 2026-11-07 (second pass — on the rebuilt C1–C4)

"MUBA, and other retired athletes, should be on Vinnies setting, 1. yes we can use this a test case and there is no automated system for the engine to give crons a fork to chooose yet, 2. i think you can probably generate this list, 3 - this really is a sim question as to how do we derermine how money depreciates in this project, as far as the post career athletes getting jobs im not too sure how this would work yet and what triggers it. the "wealth path" could be a sim wide solution to some of this. my other thought is to hardcode retirement income based on tier, so rather than just working they generate by tier for what would be considered the money paid out for events and appearances that dont show as a job? just is complex since some of these will be on hertiage so maybe at that point they dont work as the start generating income from owned businesses?"

## Builder's words 2026-11-07 (third pass — on C3/C4/C5)

"1, this looks good, 2 - not sure the entire build needs the spend columns but ill leave that code judgement call to you, 3 - the things about these is their age compared to the others, are they truely retired? that would detetmine some of this for them, if they are of age that is able bodied then they likely need to be on Vinnie stats, i need to have claude duet mint backgrounds for them as thet have no idea who they are in a wake, 4 - good, 5 - youre judgemenmt on the coding"

Code read on pt 3: sim year at C114 = 2042 (`simYearFromCycle_`, `advanceSimulationCalendar.js:331-335`); Vinnie (2003) is 39; the MUBA rows are **73 (Silecki, 1969), 76 (Necklar, 1966), 69 (Storip, 1973)**. The engine's own line is 65: age ≥ 65 → career stage `retired` (`lib/citizenDerivation.js:97`); no engine path writes Status `Retired` by age — the value is authored. By the sim's own rule the three are truly retired; Vinnie's setting is the able-bodied former athlete under 65. Their wakes wait on the backgrounds the builder mints (Claude duet) — a wake speaks only from the row's own texture.

## Calls that are the builder's

Ruled (not re-asked): **C3** tier figures Tier 1 250,000 · Tier 2 120,000 · Tier 3–4 the landed role's band (third pass pt 1); **spend path** — Claude's code call: not in this row (pt 2); **C4** v1 = a posed `question` only (pt 4); **player-vs-staff key** — Claude's code call: held, RoleType carries it (pt 5); **C5** — see the row below (pt 3, the ages decide). UNI stays yes (2026-10-08); Status Active and key blank at the flip (engine.333 C4); **C1** — the builder poses through a sports-feed `question` trigger, the citizen decides, no engine-posed fork yet (second pass, pt 1); **C2** — the builder's words are the pool's words, rb drafts the list (pt 2); **MUBA and every former athlete sit in Vinnie's setting** (pt opening). Player-vs-staff key value: held — RoleType carries the distinction (hiring bars read role words; the dashboard reads the roster tab; a manager leaves the layer the same way a player does).

| # | Call | What the code does today | Recommendation | Still the builder's |
|---|---|---|---|---|
| C3 | **Money after the career** | Income stays the playing salary at the flip; the money loop banks Income/52 × rate for every Active adult; heritage owners collect business gains on NetWorth; nothing anywhere spends | **at the flip, Income := the tier's post-career appearance figure** (events, appearances, the name — the builder's pt 3 "hardcode retirement income by tier"), one cell in `sportsRetire_` from a per-tier table in World_Config; heritage gains keep landing as they do (a heritage former player "doesn't work, the line pays" is today's physics once the paycheck stops); a job taken through the question channel re-prices to that role's band. **Decline → work is not this row:** no spend path exists for anyone; a sim-wide living-cost / draw-down row is the builder's "wealth path" candidate | the per-tier numbers. Anchors on the ledger: Mason Miller Tier 1 post-career 130,000 (analyst, A's); the three MUBA Tier 2 rows authored at 70,000 / 145,000 / 70,000; Vinnie 1,500,000 playing. Draft for his edit: **Tier 1 250,000 · Tier 2 120,000 · Tier 3–4 the band of whatever role lands, else 0** |
| C4 | **What triggers a job** | nothing — no path | **v1: only a posed `question`** (feed row names the player + the question; the next owed wake carries it; the answer routes). No unasked offer, no decline trigger until the sim-wide spend row exists; a former athlete who is never asked lives on the tier figure + heritage gains | confirm v1 = question only |
| C5 | **The MUBA rows' shape** | BirthYears 1973 / 1969 / 1966 read 53 / 57 / 60 against real 2026 and 69 / 73 / 76 against the sim's 2042 — a clock error, not canon (builder: "the MUBA history isn't in canon and their backstory isn't as well … this a data error", 2026-11-07). The engine never re-derives a `retired` CareerStage stamp (`educationCareerEngine.js:540-545`); the work texture gates on Status, not the title (`generateCitizensEvents.js:2944`) | **+16 on each BirthYear** (1989 / 1985 / 1982 → 53 / 57 / 60 in 2042, his intended ages exactly) and Vinnie's setting: Status `Active`, RoleType `Former MUBA player, Hall of Famer` (his words), EconomicProfileKey blank, UNI `yes`. CareerStage `retired` left as is (nothing re-derives it; no pay floor, no pools at Tier 2). The `question` trigger (Design 0b) gates on a living named row only. Authoring on his rows, not an engine edit | **ruled: the builder makes the change** (his hand; or his go for one verified three-row write). Backgrounds via Claude duet before their first wake |

## The post-sports pool (C2 draft — rb 2026-11-07, for the builder's edit)

None of these exist in the catalog today; each becomes a catalog entry (role, category, incomeRange, medianIncome) so the router can price and key it. Tier gate = the lowest Tier the role is offered to; fame is the Tier (the ledger has no separate fame cell on a citizen row — Heritage_Ledger standing is the line's, not his). The builder's words in the feed row pick the role; the gate only decides what the question may offer.

| Role (catalog title) | Category | Band (draft) | Tier gate | Row recipe when taken |
|---|---|---|---|---|
| Sports Broadcaster / Color Analyst | Creative & Arts | 120,000–350,000 | 1 | MEDIA clock, employer a media business, key = the new role |
| Sports Analyst (Front Office) | Sports | 110,000–220,000 | 1–2 | ENGINE clock, employer the club (BIZ-00005 / Oaks), key = the new role (Mason Miller's shape, made catalog) |
| Club Coach / Instructor | Sports | 95,000–185,000 | 1–2 | GAME clock, employer the club, key blank (roster's word) — staff week line, no random life |
| Scout | Sports | 70,000–120,000 | 2 | ENGINE clock, employer the club, key = the new role |
| College Coach | Education | 88,000–165,000 | 2 | ENGINE, employer a college row if tracked else `UNTRACKED`, key = the new role |
| Youth Academy Director | Education | 78,000–140,000 | 1–3 (own academy at any tier) | ENGINE, employer the academy row (Vinnie: BIZ-00103), OwnerOfBizId when his |
| Business owner (heritage line) | — | the books (owner draw / heritage gain, as today) | any | the owner doors (engine.295/309/311) — not this row's write |
| Ordinary hiring pool | — | catalog | 3–4 | as today (pools skip Tier 1–2; a Tier 3–4 former athlete is already in them) |

## Design (v1 — rebuilt on the second pass; Task 2 builds the engine half, Task 3 the cron half)

0. **At the flip (engine.333's `sportsRetire_`), Income := the tier figure** from a World_Config table (`postCareerIncomeTier1/2`, ADR-0015 self-arm); Tier 3–4 untouched (the pools re-price them). One line on the Advancement/LifeHistory record naming the change. Heritage gains untouched. A posed job later re-prices to its band through the intake door below.
0b. **A `question` trigger word on the Oakland_Sports_Feed** (validation list `utilities/setupSportsFeedValidation.js:171`): the row names the player and carries the question text; the engine writes it as an owed-wake source (LifeHistory_Log `[Question]` line, `OWED_MILESTONES` fifth-source shape from engine.333) so the next wake is guaranteed and speaks from it. Gate: a living row named on the feed — no clock, status or key test (unlike `retirement`), so a Retired MUBA legend or an Active former A's player are asked the same way. The engine poses nothing on its own in v1.
1. **The engine half — the whole door.** `processAdvancementIntake_`'s existing-row branch learns three cells it never wrote: **EmployerBizId** (a `BIZ-` id on the tracked ledger, or `SELF_EMPLOYED`; the business must exist — the mint's own check), **ClockMode** (one of the four, the mint's `MINT_CLOCK_MODES_`; a change between clocks is logged on the Advancement line), **EconomicProfileKey** (the catalog key for the new RoleType where one exists, else blank — the `settleAdulthood_` lookup, one shared helper). Only a row that names them changes them; blank keeps the cell (the existing contract for RoleType). The sports layer's own skip stays: a row moving a citizen **to** GAME with a sports employer sets no key (`SPORTS_OVERRIDE` is the roster's word, not the intake's). SIMULATION_LEDGER column map rows for the three cells; the Advancement log line names every cell that moved. Idempotent: a re-run of the same row changes nothing.
2. **The cron half — the choice.** `citizen-wake.js`, on an owed wake that carries a `[Question]` line: the question text goes in the user prompt as the builder wrote it, and the reply carries a closed move beside the reflection — `{type:'next-chapter', category, role (his words), where (his words)}` — parsed like the civic datawake's moves (`validateDatawakeMoves` shape), refused loudly off-vocabulary. Written to an append-only ledger `output/citizen-moves/moves_c<N>.jsonl` (same line contract as the civic ledger: id, status lines, last wins). Nothing else in the wake changes; a wake with no move is the wake as it is today.
3. **The fold.** A Node step on the Sunday pre-fire path (where the civic fold runs) takes pending `next-chapter` moves, routes each by category to an intake row — RoleType from his words normalised to a catalog title where one matches (else his words, Title Case), EmployerBizId by category (the club; a media business by hood; the business he names if it is on the ledger, else `SELF_EMPLOYED`), ClockMode by category, Notes = his words verbatim, Tier blank, flags blank — and appends it to Advancement_Intake1 under the one-row-per-citizen dedup. Dry-run default; `--apply` appends. C1 decides whether the row then waits for the builder's look (the default) or the Cycle takes it. Status lines `queued` / `applied` / `refused` go back on the move ledger.
4. **Seam with engine.336.** An intake row that changes RoleType or EmployerBizId is a "job change" — engine.336 writes the `Now:` bio line for it. **338 writes the cells; 336 writes the line.** This row adds nothing to CitizenBio.
5. **Not in this row:** the sim-wide spend / draw-down path (the builder's "wealth path" — its own row; the decline trigger waits on it); engine-posed questions; the move set for any other milestone; the civic category's engine read; the owner doors (engine.295 / 309 / 311); any engine edit to Vinnie's, Mason Miller's or the MUBA rows (C5 is authoring).

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Read-before: the row after C115 across every engine path; the intake existing-row branch's writes; the key's writers and readers; the three channels a cron has; who speaks at the wake; G-RB8 collapse | rb | done 2026-11-07 (§Read-before) |
| 1b | Builder rules the calls | Mike | C1–C4 ruled 2026-11-07 (three passes); C5 posed with the ages (Retired stays — confirm); pool table open for his edit, build proceeds on the draft |
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

- C5 ruled: the MUBA BirthYears were set against 2026 (16 years over in the sim); the builder corrects them and moves the three to Vinnie's setting himself. The pool table's edit — does not block Tasks 2 and 3 (the draft is the build's table until he edits it).
- MUBA backgrounds (CitizenBio) — the builder's, via Claude duet; their wakes carry nothing until then.
- A sim-wide living-cost / draw-down path (no NetWorth ever falls by living) — the builder's "wealth path"; a new ROLLOUT row when he names it, not this one.
- engine.336's row pointer also points into the engine.333 plan, which archives after the C115 read; it needs its own plan file when picked up (not this job's).

## Changelog

- 2026-11-07 (research-build) — C5 ruled: MUBA BirthYears were read against 2026, not the sim's 2042 (69–76 → meant 53–60); +16 each and Vinnie's setting, the builder's own hand (data error, not canon). Plan to agy for review.
- 2026-11-07 (research-build) — third pass: C3 figures and C4 (question only) ruled; spend path and key value are Claude's calls (not in row; held). MUBA ages 69–76 vs the engine's 65: Retired stays, posed as C5. Tasks 2–3 unblocked.
- 2026-11-07 (research-build) — second pass recorded; correction: money loop skips no Tier, nothing spends, retirement keeps the playing salary. C1/C2/MUBA ruled; C3/C4/C5 + pool draft posed; design v1.
- 2026-11-07 (research-build) — builder answered the first pass: a feed trigger `question` poses, the citizen decides; a small tier-gated post-sports job pool from the catalog (none exist yet); heritage lines own businesses; no priority to work, decline forces it; MUBA rows are the test case. C1–C4 rebuilt and re-asked.
- 2026-11-07 (research-build) — Created from the engine.333 plan's §Builder's ruling (engine.338); read-before done; engine.337 folded (key inert on a Retired row, convention recorded); C1–C4 drafted for the builder.
