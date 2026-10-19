---
title: Engine.286 — Codex independent read and proposed plan
created: 2026-10-08
updated: 2026-10-08
type: plan
tags: [engine, citizens, draft]
sources:
  - docs/for-claude-review/2026-10-08-engine286-codex-independent-run-TASK.md
  - docs/SIM_DOCTRINE.md
  - output/simulation_ledger_snapshot.jsonl
  - output/simulation_ledger_snapshot.meta.json
  - LifeHistory_Log read-only aggregate reads for C106–C110
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.286 and engine.284"
  - "[[../plans/2026-07-31-citizen-memory-perception]] — engine.284 opening paragraph only; independence exception disclosed below"
---

# Engine.286 — read-before and proposed plan

**Builder's words (2026-10-08, supplied task):** “Fix the existing engines; do not propose a new engine file.” “Dials follow events: fix the event engines, never retag texture.” “Rate and severity of success and failure are the dials, not gates.”

**Goal:** Existing citizen generators produce lives whose factual premises come from the citizen and simulated world, with chance deciding experiences and outcomes; preserve the flag guardrails and clock/death rulings.

**Rows:** engine.286, with engine.284 folded into the proposed work · **Owner:** research-build for builder calls, engine-sheet for implementation · **Author:** codex.

**Verdict: HOLD implementation for the numbered builder calls; read-before complete.** Recommend repairing the existing causal selection paths, not replacing them with another engine or merely waking the CIV gate. Daily generation is already substantially conditioned. Its missing links, overlapping writers, output quotas, and inconsistent eligibility are more consequential than the existence of randomness.

## Evidence boundary

- Read-only source/data analysis; this report is the sole repository write. No engine edits, Sheet writes, bench fires, deployment, commits, or index/rollout changes. The explicitly requested inbox file is delivered for Claude review and subsequent registration under the inbox README.
- Source inspected at HEAD `42d26d2c52c134927ef8d4678bb7d70941a894ab`. Initial branch was `main`, 16 commits ahead of `origin/main`, with extensive pre-existing generated-output dirt. Local source is not proof of the deployed C110 implementation. Counts below describe retained C106–C110 history; source statements describe the checkout.
- Snapshot: 1,025 records; metadata identifies C110, generated `2026-10-09T03:39:13.747Z` (engineering timestamp, October 8 local). SHA-256 `204aec7d4c09c6be694fac89f141582e1c99199086a10e999ce0ac607044fcaa`. JSONL line references below refer to this snapshot.
- Live read: `lib/sheets.js:getSheetData('LifeHistory_Log!A:G')`, completed `2026-10-09T04:04:10.670Z`. Headers: Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle. 23,003 retained rows, including one nonnumeric Cycle row excluded from counts. Eight rows in the selected window did not join to the current snapshot; historical exits/current-row absence are not silently treated as zero. No raw live log was saved.
- An initial live-read attempt failed; automatic approval review then rejected raw local capture as unauthorized. A narrower aggregate-only read was approved after citing the task's explicit live-read authorization and succeeded. No live-read approval remains outstanding.
- **Independence exception:** I did not open `docs/research/*engine286*`. However, my initial `rg` for engine.284/286 across the permitted plan returned its line 200, beyond the allowed first paragraph, and a later changelog match. That paragraph summarized the flag/death rulings and the event-engine assignment. I stopped searching that plan and subsequently read only lines 187–190. This is therefore not a perfectly blind run. Findings below were derived/checked against implementation and data, not the prohibited audit bullets. No other lane's engine.286 analysis was consulted.
- `SIM_DOCTRINE.md` was read before proposing mechanics. Its causes-then-dice, no output quotas, persistent consequences, and hood-canon rules govern the recommendations. The tracked sample is not a citywide population denominator; none of the counts below estimates citywide event frequency.

## Read-before

### Recent output, with attribution limits

Counts are **log rows/event lines**, not unique citizens. A household moment produces multiple member-lines. C106–C110 correspond to Y3C2–Y3C6 in current LifeHistory stamps; the conversion is the repository parser's, not a wall-clock conversion (`utilities/compressLifeHistory.js:818`).

| Existing engine | C106 | C107 | C108 | C109 | C110 | Attribution method |
|---|---:|---:|---:|---:|---:|---|
| `generateCitizensEvents_` | 1,930 | 1,710 | 1,527 | 1,893 | 2,169 | EventTag contains `\|tier:` or `\|family:household`; signatures emitted at `generateCitizensEvents.js:2182` and `:3314–3362` |
| Of those, shared household member-lines | 6 | 0 | 4 | 2 | 2 | `\|family:household` |
| `generateGenericCitizenMicroEvents_` | 25 | 25 | 25 | 25 | 25 | Exact log category `Micro-Event`; source `generateGenericCitizenMicroEvent.js:509` |
| `runNeighborhoodEngine_` | 6 | 6 | 6 | 6 | 6 | Reconstructed: source-literal ordinary matches 6/2/1/3/2 plus hood-pressure text 0/4/5/3/4; see caveat below |
| `runCivicRoleEngine_` | 0 | 0 | 0 | 0 | 0 | No exact `CivicRole` log category; no `[Civic Role]` in snapshot window |
| `runAsUniversePipeline_` post-career | 0 | 0 | 1 | 1 | 1 | Plain `PostCareer*` log tags without `\|`, all exact text matches in that file; exclude daily generator's tagged retirement lines |
| `generateGameModeMicroEvents_` | 1 | 5 | 2 | 1 | 3 | Exact `GAME-Micro` |
| `generateCivicModeEvents_` | 5 | 9 | 14 | 10 | 13 | Exact `CIVIC-Event` |
| `generateMediaModeEvents_` | 10 | 15 | 11 | 11 | 12 | Exact `MEDIA-Event` |

Neighborhood attribution is reconstructed, not a stored writer identity. Plain Neighborhood/FirstFriday/CreationDay/Holiday candidates total 6/3/1/12/28 and must **not** all be credited to this engine. Match the candidate's text against string literals in `runNeighborhoodEngine.js`; add the three `PRESSURE_TEXT.hood` strings (`utilities/citizenDialMap.js:492`). The scoped source search found the `pressureText_('hood', …)` emission only at `runNeighborhoodEngine.js:547`. The resulting six per Cycle agrees with its cap, but a retained historical writer sharing that exact text could still confound attribution. No unique producer receipt exists to settle that retrospectively. Universe retirement-transition lines are unstamped and distinct from its post-career output; no transition count is claimed here.

At C110, all 2,169 attributed daily lines, 25 generic lines, 3 GAME lines, 13 CIVIC lines, and 12 MEDIA lines have matching text in the joined snapshot citizen's LifeHistory. The four specialized categories also match the current clock/flag route for every joined recipient. This confirms retained text and current routing consistency, not each citizen's input state at the historical instant of the draw. Across the five Cycles generic/GAME/CIVIC/MEDIA reached 99/12/31/36 distinct POPIDs respectively.

The snapshot has ENGINE 869, GAME 58, CIVIC 53, MEDIA 45; Status Active 980, Retired 44, recovering 1. Affirmative flags after case normalization: UNI 66, MED 45, CIV 53; there is **no exact `y` CIV cell**. All 81 rows blank in UNI/MED/CIV are ENGINE/Active. Eight ENGINE rows retain UNI, including six currently marked Retired. The task/allowed plan's “58 CIV citizens” is not the current snapshot count. Existing flags must not be rebuilt from clock: these eight rows demonstrate why.

### 1. Daily/personal — `phase05-citizens/generateCitizensEvents.js`

**Selection.** Main loop accepts named tiers 1/2 and background tiers 3/4 on **every ClockMode**, requires POPID, excludes deceased/traded/pending, and skips minors via life state (`:2223–2294`). It does not exclude inactive/detained or check UNI/MED/CIV as admission guards. Flag fields at `:615–632` populate a lookup, not a gate. The household pass runs first, requires two present linked members, excludes deceased/traded/pending/inactive, but has no flag, clock, tier, or adult gate (`:2158–2203`). Therefore neither pass can be described as honoring all of the current requested regular-life guardrails.

**Draw.** Base participation 0.72, capped at 0.97; world modifiers, dial activity, guaranteed upstream participation/anti-inert machinery, then 1–4 weighted draws (`:535–553`, `:2305–2374`, `:3117–3124`). Reads RoleType fallback, marital/children/wealth/displacement, actual bonds, grief, neighborhood crime/state/weather, prior evening, events, civic news, fame, sports, traits, and Event_Content_Ledger conditions. Uses weighted categories, life-state filtering, recent-text suppression, content composition and PoolKey balancing (`:1990`, `:2657–2734`, `:2839–2985`, `:3036–3161`). This is **not an unconditioned pool**. Personal is an emitted tag within these paths, not a separate personal-engine file in the named scope.

**Writes.** Shared `LifeHistory`/`LastUpdated`, dirty ledger; immediate LifeHistory_Log batches at `:2215` and `:3416`. Also `S.citizenEvents`, active citizens, faith exposures, bias intents, story hooks/ripples, first-event neighborhood pulse, Generic_Citizens emergence count/context, content telemetry (`:3256–3466`). Changing this engine alters bond opportunities and other downstream systems, not just prose.

**Observed correlation/gap.** Across C106–C110 its source tags identify occupation 31/15/19/24/28, household/family 158/140/122/145/180, neighborhood-state 62/52/77/79/108, economy 50/51/44/47/52. These are observed conditioned categories, not proof every phrase is valid. At C110, **20 daily lines went to the eight flagged ENGINE rows**. Snapshot line 16, POP-00017, a MEDIA Oakland A's beat reporter, retains a C106 and C109 `[Work]` line about badging into the Baylight office. That text asserts a workplace unsupported by this citizen's job row. The hardcoded occupation branch is ENGINE-only (`:2572`), but the ECL condition scope has no clock, flags, or employer identity (`:2852–2919`); its life-state work classifier treats any nonempty occupation as working. This is a concrete route around the apparent occupation safeguard. Authored content needs the same fact eligibility as hardcoded entries.

### 2. Generic micro-events — `phase04-events/generateGenericCitizenMicroEvent.js`

Actual function name is plural, `generateGenericCitizenMicroEvents_` (`:23`). ENGINE only; trimmed prefix-y UNI/MED/CIV exclusions; POPID; excludes deceased/inactive/traded/pending. No age/health eligibility; no tier exclusion, just probability tiers (`:371–403`). Chances 0.50/0.25/0.10, thin-history boosts and world/outabout modifiers are all finally capped at 0.12 (`:405–445`), so comments describing lower named-citizen rates are misleading.

Pool = ordinary routine plus weather/season/economic mood, previous evening, culture, holiday/sports and neighborhood conditions (`:324–331`, `:447–483`). No job, actual household, means, or health premises. Global per-Cycle text uniqueness and a **25-event early break** allocate opportunities by ledger order (`:82`, `:339–365`, `:372`). At C110 none of its 25 recipients appears after JSONL row 500. Hitting 25 in every measured Cycle is consistent with this imposed quota, not naturally stable city activity.

Writes LifeHistory with a selected primary tag, LastUpdated, dirty ledger, neighborhood pulse, `S.microEvents`; queues LifeHistory_Log under the coarse category `Micro-Event` (`:488–541`). All C110 recipients match ENGINE plus unflagged in the snapshot. That is routing correlation; the code does not establish personal causality for the chosen routine.

### 3. Neighborhood — `phase05-citizens/runNeighborhoodEngine.js`

Tier 3/4, exact ENGINE, untrimmed prefix-y flag exclusions; gone-status exclusions; **six-event early break** (`:259`, `:377–398`). Can assign a missing neighborhood before the event roll through `pickDemographicNeighborhood_` (`:403–412`): this file also mutates world state, not only LifeHistory. No minor/health filter.

Chance begins 0.02 and responds to world conditions/outabout, capped 0.12. Draws from canonical hood EmployerCharacter and bespoke color plus current context (`:418–537`; `canonNeighborhoodLoader.js:265–278` resolves child areas). However, subsequent numeric reads use the raw neighborhood key. Then persisted housing/crime pressure can **discard the drawn entry and emit different pressure text/tag**, claiming the housing pressure slot and potentially changing `DialState.pressure` (`:539–555`; `citizenDialMap.js:440–482`). This conflicts with the task's instruction to fix events rather than retag texture. It is not a reason to erase the pressure citizens already lived.

Writes Neighborhood when absent, LifeHistory/LastUpdated, dirty ledger, queued log, `S.neighborhoodDriftEvents`/assignments; pressure helper also updates its persistent pressure envelope. Reconstructed output is six each Cycle, with increasing pressure share. At C110 snapshot line 135, POP-00183, ENGINE mutual-aid organizer in Fruitvale, has “noticed community gathering patterns shift”; line 140, POP-00188, ENGINE community organizer in West Oakland, has “sensed the area's evolving character.” These fit place/role broadly, but neither records the neighborhood change that supposedly caused it. Same-Cycle numeric threshold truth was not reconstructed from historical hood snapshots.

### 4. Civic role — `phase05-citizens/runCivicRoleEngine.js`

Exact lowercased CIV `y`, no trim, no clock/tier gate (`:239–240`). Retired/resigned/scandal each get an unconditional repeated status note; active rows roll 0.015 plus world modifiers, capped 0.08. Whole engine stops after six (`:228–236`, `:253–327`). Role substring and hood pools do not consult actual civic duties, votes, projects, office occupancy, or action receipts. Repeated “retired” is state restatement, not a new retirement event.

Writes `[Civic Role]` LifeHistory, LastUpdated, dirty ledger, `CivicRole` queued log, eventsGenerated/civicRoleEvents (`:376–413`). Zero observed output is corroborated by the gate. A local, isolated VM with forced RNG emitted zero for `yes`, one for `y`/`Y`, zero for ` yes `. This proves spelling behavior, not historical “never ran” across all retained/deleted history.

**Recommendation:** re-align this existing function to real official actions and status transitions, with attribution and duplicate protection. Do not wake the old pool as written. Keep `generateCivicModeEvents_` responsible for ordinary civic-clock life; one action must not be invented or scored once by each engine. Builder call 1 settles whether this distinction is useful enough to retain.

### 5. Universe — `phase05-citizens/runAsUniversePipeline.js`

Prefix-y UNI, no tier gate. Active GAME only gets LastUpdated; retired GAME transitions to ENGINE without clearing UNI, appends an **unstamped** retirement sentence and logs Retirement; retired ENGINE rolls post-career texture (`:416–462`). This is the deliberate retired-player guardrail combination, not a flag-cleanup target.

Post-career chance 0.02 plus world context, capped 0.10; uniform pool mixes athlete lifestyle, season-derived sports atmosphere, hood/cultural notes (`:464–552`). No individualized employment/household/finance/health participation premise. Writes ClockMode on transition, LifeHistory/LastUpdated, immediate log batch, `S.postCareerEvents`/canonSportsPhase (`:554–593`). Plain post-career log counts are 0/0/1/1/1, much smaller than a broad PostCareer tag search because daily generation also emits retirement texture. C110 snapshot line 82, POP-00128, UNI/ENGINE/Retired in West Oakland, has `[PostCareer] appreciating the neighborhood's character`, matching the source pool. Eligibility fits; no actual new post-career action is identified.

### 6. GAME — `phase04-events/generateGameModeMicroEvents.js`

GAME clock, excludes inactive/deceased/retired/traded/pending, requires first name/POPID; all tiers, chance 0.04 plus tier/world/outabout modifiers, capped 0.15, **15-event global cap** (`:435–513`). Flags/origin/RoleType classify the pool rather than admit the row. UNI or MLB origin unconditionally picks an MLB type, with only exact SP/RP/CL/CP identifying pitchers (`:341–374`). This does not establish that every UNI job is a baseball-playing role.

General/public/personal plus role, trait, and sports atmosphere pools (`:377–429`); no individual game-result receipt. Writes primary-tagged LifeHistory, LastUpdated, queued `GAME-Micro` log, summary count/details (`:520–572`). C110 snapshot line 24, POP-00025, starting pitcher, has `[Life] navigated being recognized in public`; line 59, POP-00079, right fielder, has `[Personal] spent time with friends outside the game`. Plausible role-compatible experiences, not proven consequences of an actual game. Feed-driven `applyGameNightMoments_` already runs separately immediately after this generator (`godWorldEngine2.js:619–622`); do not duplicate it or generate match results here.

### 7. CIVIC — `phase05-citizens/generateCivicModeEvents.js`

CIVIC clock, first/POPID, all tiers; excludes inactive/deceased/traded/pending/detained. Hospitalized/critical/serious-condition scale chance by 0.3, recovering/injured by 0.6 (`:386–406`). CIV column is indexed but not an admission requirement. Base chance 0.15 plus tier, load, votes/grants, sentiment/weather, capped 0.40; no global event quota (`:412–438`).

Office lookup then role fallback, pools condition on initiative outcomes/votes/grants/crime/hood arcs as well as generic duties and personal life (`:89–115`, `:122–303`). Office lookup reads PopId/Title/Faction but not active office status (`:528–567`). A director can draw every initiative outcome, without an ownership join (`:267–269`). “Approved patrol deployment adjustments” is in the unconditional chief pool (`:232–240`): generating that line creates a lived decision without changing deployment. These are consequential fact mismatches, not just dull wording.

Writes LifeHistory primary, LastUpdated, dirty ledger, queued `CIVIC-Event`, count/details (`:468–519`). C110 snapshot line 19, POP-00020, Waterfront Urban Planner, has `[Civic] reviewed scheduling conflicts for senior leadership`: consistent with its staff fallback, not evidence of an actual appointment. The 13 C110 log recipients all match CIVIC and their text remains in the cell. No per-event source receipt was found in this writer.

### 8. MEDIA — `phase05-citizens/generateMediaModeEvents.js`

MEDIA clock, first/POPID, all tiers, same gone/custody and health-rate treatment as CIVIC; no MED gate. Base 0.20, tier/load/votes/culture/world modifiers, capped 0.45, no global quota (`:336–389`). RoleType substring selects editor/columnist/reporter/photo/etc. Pools mix real current votes, local arcs, crime/weather with generic professional acts (`:93–108`, `:172–203`). Every role also gets press-box/dugout lines whenever sportsSeason is not off-season (`:287–292`), without an assignment or attendance premise. Health changes likelihood but not the feasibility of walking home or doing fieldwork.

Writes primary-tagged LifeHistory/LastUpdated, dirty ledger, queued `MEDIA-Event`, count/details (`:428–478`). C110 snapshot line 5, POP-00005, editor-in-chief, has a late-newsroom Personal line; line 14, POP-00015, photographer, walked home. All 12 live category rows join to MEDIA and retained text. No published-article or assignment receipt is read, so “filed a story” does not establish actual publication. Any future newsroom input must carry the publication status; drafts cannot become published facts through an event pool.

## Wiring card and dial composition

The pre-approved Haiku wiring agent was run. The initial ten-target request exhausted 14 turns without a usable card; a narrowed `runCivicRoleEngine_` request completed in seven. The card below incorporates that result and direct source verification across the other targets. Two agent claims were corrected: it named the compressor as a LifeHistory_Log reader and conflated queued ledger commit with execution. Neither is used as evidence here.

| Link | Verified source pointer and implication |
|---|---|
| Upstream neighborhood/ECL | `phase01-config/godWorldEngine2.js:581–583`, `:2298–2300`; `phase02-world-state/loadNeighborhoodState.js:54–86`. Persisted hood context loads before citizen generators; lag is deliberate. ECL loads before daily selection. |
| Generic and GAME | `godWorldEngine2.js:618–622`, `:2335–2339`: before neighborhood, civic actions, career, health lifecycle. Fresh later-phase effects are not yet available to them. |
| Neighborhood/Universe/CivicRole | `godWorldEngine2.js:633–639`, `:2350–2356`: civic role currently precedes initiative resolution. An action-driven rewrite cannot consume the later same-Cycle outcomes at this position. |
| Civic outcomes | `phase05-citizens/civicInitiativeEngine.js:151–153`, `:454–474`; mode-event calls follow its call at `godWorldEngine2.js:636–639`. Actual initiative outcomes are available, but holder/project/POPID attribution still needs validation. |
| Daily/bonds/mints | `godWorldEngine2.js:641–669`, `:2358–2386`; `generateCitizensEvents.js:3386–3393`. Daily sees earlier career/household/health changes and publishes citizenEvents; bonds run after daily; advancement mints run after both. Do not assert that a newly promoted citizen got same-Cycle daily draws. |
| Birth mint | `phase04-events/generationalEventsEngine.js:1135–1185`: `createChildRow_` allocates/pushes a row, fills ENGINE/student/Active, leaves flags blank, marks ledger dirty. |
| Intake mint | `phase05-citizens/processAdvancementIntake.js:648–669`, `:827–847`, `:976`: new array starts blank; assigns ClockMode but no three flag columns. Existing-row branch at `:748` must preserve deliberate flags. |
| Civic-role outputs | `runCivicRoleEngine.js:378–408`: LifeHistory/LastUpdated and dirty flag, queued LifeHistory_Log; `:402–413` writes eventsGenerated/civicRoleEvents. Its input fields at `:144–157` are world context, not official receipts. |
| Fold | `godWorldEngine2.js:806`, `:2515`; `utilities/compressLifeHistory.js:537–545`, `:818–830`, `:1617–1635`: parse bracket primary tags from ledger LifeHistory, fold new stamped Cycles beyond DialState.folded, sum effects per Cycle. Logging a category alone does not feed this fold. |
| Persist | `compressLifeHistory.js:710–724`; `godWorldEngine2.js:855–865`, `:2558–2560`: queue consolidated ledger write, then executor. Daily/Universe have already written log rows directly; other scoped engines queue them. No all-tabs atomicity is established. |
| Return edge | `utilities/compressLifeHistory.js:1235` → `getCitizenDialBands_`; selectors at `generateCitizensEvents.js:2370–2374`, `:3063–3084`, generic `:441`, neighborhood `:474`, GAME `:509`. Dial changes affect subsequent opportunities. |

The objective reader is `utilities/citizenDialMap.js:nudgesForEvent_` (`:296–320`). Exact mapped tags win, including empty maps; only unmapped tags reach prose fallback. Calendar suffixes FirstFriday/CreationDay/Holiday/Sports are stripped (`:267–279`). Consequently machine tags in a log row are not independently scored, and ominous prose under `[Daily]` still produces no objective nudge.

| Emitted primary tag | Current raw event effects before dial dynamics |
|---|---|
| Daily, Background, Micro-Event, Personal, Neighborhood, Lifestyle, Civic, Civic Perception, Life, Team, Season, PrevEvening, Holiday, FirstFriday, CreationDay, Sports, Weather | `{}` |
| Work | drive +4 |
| CivicRole / Civic Role | sociability +5, drive +2 |
| Media / Public | sociability +4 |
| Community | sociability +4, warmth +2 |
| Cultural | openness +4, outabout +3 |
| Alliance / Rivalry / Mentorship | sociability +4 / sociability +2 and composure −3 / warmth +6 and drive +2 |
| Faith | warmth +3, composure +2 |
| PostCareer | family +4, openness +2 |
| Friction / Strain / Stumble | composure −2 / composure −1 / composure −2 and drive −1, with pressure-cause effects where applicable |
| Sports-Win/Loss/LosingWeek/Run/Title | signed feed-week fandom effects; definitions at `citizenDialMap.js:168–177`, not generic Sports atmosphere |

Map evidence: `citizenDialMap.js:32–89`, `:144–181`. A local call to the real exported mapper confirmed empty Daily/Personal/Neighborhood/Civic, Work +4 drive, Civic Role +5/+2, Media +4 sociability, Faith +3/+2, and Friction −2 composure. It also confirmed PostCareer-Sports normalizes to PostCareer while PostCareer-Wellness with neutral prose falls to `{}`. Unknown compound tags can instead trigger prose fallback; do not assume all suffix variants are equivalent.

Per-Cycle netting prevents line count from multiplying the reinforcement streak, but more scored lines can still increase the net effect (`compressLifeHistory.js:1624–1632`; `citizenMemory.js:145–152`). Mood decay and later hardening mean raw effects are not guaranteed final base changes. Ordinary experiences can also return through subjective reflections (`compressLifeHistory.js:650–657`). Preserve that route; do not add objective affect tags to simulate a citizen's reaction.

## Tasks

All implementation tasks below are proposals. File names are existing engine files; a test file may be added under `scripts/`. No new engine, Sheet tab, or historical retagging is proposed.

| # | Task | Owner | Status |
|---|---|---|---|
| 1 | Resolve numbered builder calls; fold this report into the owning engine.286 plan and reconcile engine.284's independent gate-only action. | research-build | not started |
| 2 | Extend existing `phase05-citizens/citizenContextBuilder.js` life-state helpers into a pure per-row eligibility/context contract; apply it at every entry path in the eight scoped generators, including daily household and ECL. Preserve clock routing and flag exclusions. | engine-sheet | not started |
| 3 | Rework `generateCitizensEvents_` candidate construction and conditions, retaining existing weighted draw/composer: job/employer, actual family/household, financial burden, health/location, local conditions and identified world events determine possible experiences. Personal is handled here, not through a ninth engine. | engine-sheet | not started |
| 4 | Repair `generateGenericCitizenMicroEvents_` and `runNeighborhoodEngine_`: remove population quotas/global text allocation, use individually eligible encounters and canonical hood state; stop replacing a selected ordinary event with pressure text. Keep relocation/assignment a separately explicit behavior, not an accidental pre-roll side effect. | engine-sheet | not started |
| 5 | Re-align `runCivicRoleEngine_` per call 1; if retained, consume attributable real action/transition receipts, reconcile overlapping `generateCivicModeEvents_` narration, and move its call after its producers in both `godWorldEngine2.js` entry paths. | engine-sheet | not started |
| 6 | Tighten factual premises in `generateGameModeMicroEvents_`, `runAsUniversePipeline_`, `generateCivicModeEvents_`, `generateMediaModeEvents_`; preserve each clock's life and retired UNI guardrails. Do not simulate games, enact policy, or publish articles through text selection. | engine-sheet | not started |
| 7 | Register explicit flags at `generationalEventsEngine.js:createChildRow_` and `processAdvancementIntake.js:processAdvancementRowsBody_`; validate all three header positions before mint mutation; preserve existing-row values and classify new protected entrants from authoritative intake facts. | engine-sheet | not started |
| 8 | Add/extend targeted tests, then run an isolated sandbox proving sequence with before/after receipts, persistence readback and resource measurement. Builder reads actual success/failure texture before any production release. | engine-sheet | not started |

### Implementation shape and risks

**Eligibility is factual; weights remain probabilistic.** Use the existing pure helper file, not a new engine. Clock and three flags are independent inputs; normalize accepted yes/no spellings without rewriting existing rows. Require a valid routing/header contract, and report missing factual inputs instead of inventing an employer, spouse, illness, financial zero, or calm neighborhood. A child cannot draw adult employment, a detained citizen cannot commute, and a hospitalized citizen cannot attend a field assignment. A compatible adult can still have a surprising bad day. Do not use a personality band or prosperity threshold to make bad outcomes impossible.

**Cause before outcome before text.** Within each existing generator, candidates should carry factual premise, affected POPID/household/hood, source Cycle and identity when there is a discrete source event, proposed outcome class, and calibrated chance/severity. A job/employer permits a shift event; employer trouble, job demands, and means change the risk of a bad shift. A household permits a shared domestic event; member ages and actual relationships constrain its content. A local disruption affects people actually exposed to its location. A real action receipt determines who acted; observation is distinct from participation. Mundane spontaneous encounters remain possible under builder-approved rates. An outcome claiming a money, health, job or policy change must be backed by its owning domain writer, not merely a LifeHistory sentence.

Keep current content composition as rendering. Apply the same premise validation to ECL and hardcoded lines, before either is selected; ECL scope extensions must be coordinated with the existing loader/compiler and its condition vocabulary (`phase02-world-state/loadEventContentLedger.js`). This is not permission to edit live content rows. Character-rich ordinary color remains useful; fixes target unsupported factual assertions. No historical line is deleted or “corrected” because it was produced by a bug.

**Each engine has a distinct responsibility.** Daily handles the person's ongoing week; generic handles incidental encounters; neighborhood handles exposure to local activity/changes; clock-specific generators handle the relevant profession/life. Shared real events may be experienced by several citizens, so citywide text uniqueness is not identity. Avoid giving the same citizen the same source action twice across civic/daily or GAME/feed paths. Preserve active-citizen/bond, faith-exposure, GC emergence, pulse and telemetry contracts while changing selection. Preserve persistent clock/death behavior; no generational death-roll rewrite belongs in this plan.

**Timing and persistence.** Early generic/neighborhood engines cannot see later current-Cycle career/health writes. Prefer explicit previously persisted inputs where intended; any necessary move needs both scheduler paths and a measured dependency check. Civic-role realignment specifically needs later action producers. Event identity/duplicate checking must distinguish multiple genuine events within a Cycle, repeated rendering, and re-entry after persistence failure; a Cycle watermark alone is not an event receipt. Keep the primary tag in the citizen cell consistent with log metadata and source identity without making a new tag automatically score. Test direct-log versus queued-ledger partial failure; do not assert atomicity or change the checkpoint system opportunistically.

**Flags at mint.** Births are new ENGINE lives: recommend explicit `no/no/no`, not inherited parental UNI/MED/CIV. Ordinary GC/household/owner promotions likewise get explicit `no/no/no`. Protected GAME/MEDIA/CIVIC entrants require canonical registration from approved intake identity/role, with the corresponding affirmative flag and explicit negatives for the rest; ambiguous routing must not silently produce a vulnerable unflagged row. Existing citizens keep deliberate flags when ClockMode or retirement changes. Backfilling the 81 blanks requires a separately reviewed identity classification and authorized Sheet write; neither this report nor the mint patch authorizes it.

**Rates and quotas.** Removing 25/6/15 hard output ceilings increases reachable citizens and can change both runtime and RNG consumption. Do not compensate with a new cap or tune to reproduce those counts. Builder selects per-citizen encounter/outcome rates; bench checks distributions, both signs of outcomes, and resource usage. Rate inputs should use the existing World_Config contract, with missing required calibration failing visibly. Audit the daily 1–4 emit choice and ECL forty-draw limit (`generateCitizensEvents.js:2926–2932`) as additional authoring/volume constraints before claiming the whole path is free of curation.

### Tests and validation boundary

These are proposed tests, not results from this read-only run:

1. **Routing matrix:** every clock × flag combination, tiers 1–4, accepted spellings, retired UNI, inactive/traded/pending/deceased, minor/adult, detained/hospitalized/recovering. Force each path, including household pass and ECL injection. Assert forbidden factual events cannot appear; assert eligible adverse events can. Keep ENGINE/CIVIC death eligibility and GAME/MEDIA death exclusion unchanged.
2. **Paired causal tests:** hold RNG constant and vary only employer/role, household relationship, means/burden, health capability, resolved parent hood, or event exposure. Candidate sets should change for the relevant reason; unrelated state must not select another job/household. Test absent, zero, malformed and unknown state distinctly. Test all 22 canonical hoods and child-area resolution, not a twelve-name fixture.
3. **Opportunity tests:** force eligible encounters in citizens late in ledger order; verify no 25/6/15 early-break starvation, no global text exhaustion, and no arbitrary citywide outcome targets. Multiple citizens may live the same shared event. Test RNG determinism on the new version; do not claim byte-identical old draw offsets after changing rolls/order.
4. **Civic identity tests:** current versus former holder, duplicated/stale office rows, a director's own versus unrelated initiative, a vote after an earlier civic-role slot, transition versus repeated retired status, two real actions in one Cycle, replay of one receipt, and overlap with civic-mode narration. CIV `yes` spelling alone must never wake the old unconditional behavior.
5. **Mint tests:** birth and each new-row promotion path write typed explicit flags; protected entrants cannot mint with blank guardrails; existing retired UNI survives updates; reordered/missing/duplicate headers cannot create partial rows; existing POPID allocator and family linkage remain intact. Extend `scripts/householdIntake.test.js`, `scripts/mintEmployerPick.test.js`, `scripts/ownerDoor.test.js` as applicable.
6. **Event-to-dial tests:** run actual generated LifeHistory through the real parser, `nudgesForEvent_`, compressor and persistence-shaped readback. Assert plain events remain plain, positive/negative real outcomes use their approved tags, raw logged metadata does not score independently, same-Cycle lines net once, and repeat compression does not refold them. Extend `scripts/compressLifeHistory.dial.test.js`/`scripts/citizenDialMultiCycle.test.js`; protect content behavior with `scripts/contentLedgerCompose.test.js`/`scripts/contentLedgerBalance.test.js`, grief with `scripts/griefPeriod.test.js`, and geography with `scripts/hoodBlindTexture.test.js`.
7. **Failure and persistence tests:** direct log append succeeds then queued ledger fails, queued append fails, missing required source, and a resumed tail. Verify attributable error/reporting behavior and no unearned receipt completion. This is necessary before calling a source-driven event durable.

**Bench-provable:** forced routing and outcome branches, actual output shapes, same-Cycle order, source joins, independent event identities, ledger/log/DialState readback, next-Cycle fold and rates over repeated isolated trials, Apps Script runtime/quota headroom. Capture input, source event, generated line, primary tag, log row, and typed resulting state for sampled trajectories. Include a multi-Cycle good/bad/recovery path. Sandbox outcomes remain explicitly non-canon. No bench was run here.

**Needs production deployment plus authorized live observation:** actual payload shapes and frequencies across all source writers, authentic civic/household/workplace incidents, organic exposure distribution, downstream citizens/bonds/newsroom interpretation, and sustained persistence under the production cadence. C111 (2026-10-11) is the next fire named by the task, not an implicit deployment deadline or acceptance promise. If deployment happens later, name the actual first post-deployment Cycle. One quiet Cycle cannot prove a rare branch; do not manufacture live incidents to satisfy a count. Confirm production version before attributing any new behavior.

## Open questions — builder calls

1. **What should civic role become?** Recommend re-aligned actual-duty/transition recording in the existing function, with generic civic-clock life left in `generateCivicModeEvents_`; reject a gate-only wake. If that distinction has no desired lived behavior, retire its emitting path and let civic mode consume the same receipts. Blocks Task 5. No arbitrary new initiative, policy or office is proposed.
2. **How much spontaneous ordinary life should remain beside source-driven events?** Recommend retain plausible incidental and personal experiences, but require row/world premises for work, family, money, health and official acts. Recommend incidental micro-events, personal daily life and neighborhood exposure have distinguishable purposes rather than multiple interchangeable daily pools. Builder chooses their rates and mix. Blocks Tasks 3–4/6 calibration.
3. **What success/failure range should each experience produce?** Recommend ordinary successes, ordinary failures, consequential successes and consequential failures where the domain supports them, with severity/rate set by the builder and modulated by actual circumstances. Do not pick numeric defaults here or calibrate against a target number of victims/winners. Blocks outcome tables and World_Config values.
4. **What personal life belongs to protected clocks and mixed households?** The ruling already bars flagged ENGINE citizens from regular-life engines; implement that without weakening it. Recommend GAME/MEDIA/CIVIC personal experiences be generated within their clock-specific functions, with UNI retirement handled by Universe. For a household containing both eligible and protected members, recommend a shared fact requiring all members not be emitted as “the whole household” unless every participant's authorized route admits it; narrower member experiences remain possible. Builder decides the intended shared-family behavior. Blocks the household-path rewrite.
5. **What registration facts authorize new protected entrants?** Recommend births and ordinary promotions `no/no/no`; explicit authoritative role/intake registration for protected entrants, no flag inheritance and no clock-only reconstruction of existing citizens. Confirm whether any new ENGINE entrant should start protected and which intake field certifies that exception. Blocks Task 7's exceptional mint contract. Existing blank-row repair remains a separate proposed action.
6. **Which experiences deserve objective dial effects?** Current Work/Media/Faith/PostCareer/Civic Role tags can reward routine prose while bad financial prose under Daily does nothing. Recommend define the actual event outcomes first, then approve their scoring by existing semantic tag; preserve plain-day `{}` and subjective reflection. No generic retagging to force lower or higher dials. Blocks new outcome/tag acceptance, not the factual eligibility fixes.

## Weakest assumptions

1. **Writer attribution from retained text.** Logs lack a uniform producer/source-event identity and tags are shared. I attacked this with exact category reads, current-source signatures, separate plain versus enriched PostCareer tags, neighborhood literal/pressure matching, and C110 cell readback. The neighborhood six-per-Cycle conclusion is reconstructed; full historical execution provenance is unavailable. Current row compatibility is not a recovered historical input state.
2. **What “align with the sim” permits the dice to invent.** A requirement for a prior incident behind every ordinary encounter would erase spontaneous life; letting any pool claim official actions or workplace facts would preserve the current defect. I separated factual eligibility from probabilistic experience and surfaced the mixture/rate/agency decisions as builder calls. The real reporter/Baylight mismatch and unconditional chief approval text are concrete tests of that boundary. I did not use outside Oakland facts.
3. **A repaired text path closes the causal loop.** Some lines already score strong positive tags, while some adverse lines score nothing; direct logs and queued ledger writes can diverge. I followed scheduler → in-memory row → log/persistence → parser → map → per-Cycle fold → next selection, ran the actual tag mapper and civic gate locally, and corrected the agent card's log-reader claim. I did not prove a new causal mechanic or production deployment; both remain future work with the acceptance gates above.

## Changelog

- 2026-10-08 (codex) — Completed read-only engine.286 report, live C106–C110 aggregates, verified wiring, proposed tasks and numbered builder calls; disclosed independence exception. No implementation or commits.

## Builder clarification — 2026-10-08; controlling amendment

**Builder's words (received while completing this report):**

> just in case it wasnt shared , the goal is to curtail the "generic" events and events more aligned with the sims reality, more aligned with the dials and how they effect them, events that trigger the crons to act in their wakes, events that give them and edge, set them back, if the crons are trying to tier up , gets media coverage, make a family, own a home, have kids, get a promotion and try to make it to the heritage ledger, get on undocked, wake as a cron, follow the sports teams. creating the "dice roll" elements that complicate or help the crons play that game when they wake. All the other elements youre using would apply, your tier, hood, net worth, dials, flag, clock mode make them events unique, we lean on the Event Content Ledger to assist on the variety to take some weight off the event engine code depth

**This direction supersedes the emphasis in the original proposed plan.** Curtailing generic filler and making events help or obstruct the citizen's pursuits is the objective. Factual eligibility repairs are necessary supporting work; a larger collection of plausible ordinary routines is not the deliverable. The engine must be allowed to originate a consequential event from a supported situation and a roll; it need not wait for some other system to have already generated every incident. Its consequences must then persist through the owning mechanisms. Event_Content_Ledger supplies variety around that event, rather than expanding hundreds of hardcoded prose branches.

Original question 2 is **resolved in direction**: curtail generic output in favor of individualized opportunities and complications. Original question 6 is **resolved in direction**: events must connect to meaningful dial effects and the wake/game loop, not merely produce prose. Exact event families, rates, severity and effect assignments remain builder calls. Do not ask the builder again whether this should be a consequential game. Original questions 1, 3, 4 and 5 remain the narrower unresolved implementation/sim choices.

### Additional source trace: what reaches a wake, and what comes back

Read `docs/ENGINE_CRON_LOOP.md` and the direction section of `docs/plans/2026-09-02-bloodline-ascent.md` for this amendment. The latter already owns the larger ascent/decline chain; engine.286 should feed that chain, not propose a parallel progression system. Its historical build-status claims were not used as proof of current implementation. The engine/cron doctrine's historical “return edge missing” statement likewise cannot substitute for the code below.

| Existing connection | Source evidence | Design consequence |
|---|---|---|
| Events affect wake attention | `lib/wakePerception.js:34–45` scores the largest age-damped mapped effect in the selected LifeHistory tail; `scripts/citizen-wake.js:198–200` weights rotation by event magnitude and dial deviation. | A new sentence under an empty tag does not create a consequential wake signal through this path. A meaningful event can change selection weight, but does not schedule a new cron execution. |
| Not everyone can enter this general wake pool | `lib/wakePerception.js:398–409` requires parseable dials, sufficient deviation, life text, name and neighborhood. | An event-to-wake proof must include admission as well as weighting. Do not claim every affected citizen will wake or silently change schedule/pool rules. |
| Wake attention already notices posture changes | `scripts/citizen-wake.js:186–195` selects eligible citizens with a current-Cycle posture change before ordinary rotation. | Reuse this connection where the event changes posture; don't introduce another wake scheduler for engine.286. |
| Raw context has a limited tail | `lib/wakePerception.js:374`, `:410–418` preserve up to three milestone-class lines and fill a five-line tail with other lines. Friction/Strain/Stumble are not in that milestone regex. | Test a real complication followed by several routine lines. It can disappear from perceived life even while its dial effect persists; reducing filler helps, but tail/salience compatibility must be demonstrated. |
| Standing and aims reach the voice | `lib/wakePerception.js:480–520` renders heritage, owned assets, maneuver goal/posture and what events threw at the citizen. `scripts/citizen-wake.js:245` includes those with life, family, bonds, sports and disposition. | The event should have an intelligible stake in a citizen's pursuits. Current general `buildPool` does not explicitly carry Citizen Tier or NetWorth (`wakePerception.js:383–394`, `:419–432`); do not mistake heritage standing for complete personal game-state perception. |
| The general wake is currently reflective | `scripts/citizen-wake.js:255` requests a private 4–5 sentence reflection; `:374` persists its page entry and `:417–421` appends classified event/affect, bond target, tension and resolves to Reflection_Intake. | A narrative wish is not an executed home purchase, promotion, marriage or show admission. Name the existing consumer for any proposed action; where it is missing, report a missing return connection rather than count the prose as action. |
| A bounded return connection exists | `utilities/compressLifeHistory.js:663–672` converts a qualifying resolved intention into `DialState.maneuver.push`; `phase05-citizens/maneuverEngine.js:258–274` reads it into the next posture decision. | Demonstrate both event → wake and wake → next-Cycle response. Preserve its actual bounds; do not claim arbitrary citizen commands are supported. |
| Posture can alter existing life opportunities | `phase05-citizens/generationalWealthEngine.js:2053–2054` applies `maneuverFactor_` to `homeBuyChance_`; existing home and heritage writers are `trackHomeOwnership_` at `:1984` and `updateHeritage_` at `:2503`. | Use the existing home/wealth/heritage chain to prove consequences instead of awarding home ownership or heritage through a generic event sentence. Other pursuit paths need the same writer-to-reader proof. |

No wake script, model generation, reflection write, cron schedule, or progression writer was executed for this amendment. These are source-verified connections, not a live closed-loop demonstration. The wider set of civic, media, work and show wakes has not been audited here; findings about the general citizen wake must not be generalized to all cron types.

### Revised implementation priority and division of work

1. **Define a small set of game-relevant event families inside the existing engines.** Start with opportunities and setbacks affecting work/promotion, means/home prospects, family/bonds, public visibility, and participation in existing sports/show pathways. For each, specify its real premise, the citizen attributes that change odds/severity, the roll, the persisted consequence, the dial treatment, the wake-readable stake, and the existing next-step consumer. Tier, hood, NetWorth, dials, flags and ClockMode must matter through those named links. A generic “good day” with a newly powerful tag fails this contract.
2. **Let those engines roll outcomes; let Event_Content_Ledger provide the variation.** Keep reusable physics and ownership of writes in code. Use existing PoolKey/Conditions/Weight/Tags/line/fragment composition to express many ways a realized opportunity or setback was experienced. Add only the condition fields and semantic outcome bindings actually required by the first event families. No per-citizen or per-phrase implementation branch, no arbitrary Sheet-authored executable effects, and no new engine file. Rendering variations must not independently roll or duplicate the underlying consequence.
3. **Extend the existing ECL contract deliberately.** `loadEventContentLedger.js:64–121` already supports tier, hood, WealthLevel, life state, heritage, fame, drive/warmth/fandom and Undocked exposure. It does not expose NetWorth, all dials, flags, ClockMode, or a realized event outcome. `generateCitizensEvents.js:2852–2919` is the matching scope producer. Extend loader validation, scope construction, class selection, and tests together. Reuse the current eight generators' roles; make source loaders/composition reusable within existing files where useful. Adding several wording variants must not multiply the chance of receiving a promotion-related advantage: roll event-family/outcome probability separately from within-outcome wording weights.
4. **Prove one consequential path before expanding the content library.** In an isolated bench fixture, an eligible citizen experiences a rolled opportunity/setback; the owning writer persists what changed; the actual primary tag folds; the wake perceives the event and its stake; its valid reflection/resolve reaches the existing intake consumer; and a later Cycle applies the response. Then expand to another domain and contrasting citizens. A person can miss the opportunity, decline it, or suffer another setback; acceptance is a working causal path, not a guaranteed ascent.
5. **Curtail overlapping filler after confirming the replacement paths.** Original Tasks 2–7 still apply, but eliminating unsupported incidents and delivering consequential event families take priority over enriching incidental routine pools. Preserve enough ordinary life for contrast without filling the wake's context window at the expense of its current problem or opportunity. Builder sets rates and severity; no population-level outcome quota replaces the old caps.

For pursuit-specific acceptance, use the existing earned transitions: a visibility event must reach a real coverage/usage path before Tier or fame credit; a housing opportunity must reach the actual ownership writer; a family event must respect bonds/households and the birth process; heritage must follow the actual standing calculation; Undocked interest or an audience line must not grant pilot status; following a team must use its actual feed and fandom mechanics. Events may help or hinder those paths without immediately completing them. This report has **not** verified every such path end to end; the implementation must select and trace its first bounded event families before declaring them working.

### Acceptance additions to Task 8

- Pair citizens with different Tier, hood, NetWorth and dials under identical controlled rolls. Explain which opportunity, consequence or severity differs and why; repeat with protected flag/clock combinations. Mere wording differences do not pass.
- For each family, force both advantage and setback, plus no-event and follow-on recovery/loss where applicable. Read the actual persisted state; an event that claims a benefit but changes no relevant chance/state/perception is still filler.
- Pass actual generated lines through ECL composition → LifeHistory → dial fold → general wake pool/tail/standing → Reflection_Intake-shaped return → next-Cycle consumer. Include a setback followed by five routine lines and a citizen outside the shaped wake pool; disclose what survives and who can actually wake.
- Check variety independently from event frequency: expanding a family from a few ECL lines to many must increase expression variety without multiplying its mechanical rewards or penalties. Preserve source identity and outcome across renderings, and keep positive and negative variants reachable.
- Keep wake schedules and paid model calls outside this read-only assignment. If implementation requires a wake-package/script change, propose it explicitly, including its live-automation approval gate; do not silently broaden an engine-only patch.

**Remaining builder decision bundle:** select the first consequential event families and their rates/severities; choose the civic-role disposition and mixed-household behavior; confirm exceptional protected mint registration. The direction toward less generic filler, ECL-driven variety, meaningful dial consequences and playable wake situations is now settled.

- 2026-10-08 (codex) — Appended builder clarification as controlling direction; added ECL-first consequential-event design and source-verified wake/return acceptance. Earlier generic-mixture question resolved; no code or external writes.
