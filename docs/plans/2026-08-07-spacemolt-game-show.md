---
title: SpaceMolt Game Show — Oakland's Serialized Obsession
created: 2026-08-07
updated: 2026-09-08
type: plan
tags: [research, citizens, media, engine, active]
sources:
  - Mike-direct 2026-08-07 (S360) — sim-wide game show/reality show; wake-day participation; tracked so citizens follow and news covers; wager system translates in
  - docs/research/2026-07-27-spacemolt-citizen-agency-cultural-phenomenon.md — adopt verdict + hazards + wagering lane design questions
  - docs/research/2026-08-03-game-environment-review.md §2/§3 — played-events contract; "generalize to ONE second feed type"; wagering gated
  - github.com/SpaceMolt — upstream org audit 2026-08-07 (commander, spacemolt-lib, client-v2, MIT)
  - Live MCP session tool inventory 2026-08-07 (~200 tools; get_action_log/captains_log exist; no server-side wager/leaderboard)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (research.27)"
  - "[[../research/2026-07-27-spacemolt-citizen-agency-cultural-phenomenon]] — research basis; hazards bind this plan"
  - "[[../research/2026-08-03-game-environment-review]] — played-events generalization rule"
  - "[[index]] — registered same commit"
---

# SpaceMolt Game Show — Oakland's Serialized Obsession

**Goal:** SpaceMolt becomes a serialized in-world reality program: a small persistent pilot cast of real citizens flies the ship, episode telemetry becomes staged cultural events the sim tracks, the Tribune covers the arcs, and a wager lane translates outcomes into citizen fates. Universal-protagonism test: a wager row or a fandom line drives a fate — winners, losers, debts, grudges, aspirations.

**Cast model (lottery-based — Mike-direct 2026-08-15, supersedes the S360 curated-shortlist model):** NOT a daily rotating pilot, and NOT a curated cast. A persistent cast of 2–4 ledger citizens holds the seat, chosen by **deterministic lottery** among eligible citizens — the excitement IS the randomness: any citizen can be pulled in. Succession, firings, and audition arcs remain *events the news covers*; only the initial-pick mechanism changes. The daily waking citizens are the **audience** — they watch, argue, wager, and aspire. Spectators and operators stay distinct (research hazard: don't make every citizen an implausible game account). **RE-DECIDED (Mike-direct 2026-09-08, supersedes the persistent-cast sentence):** the draw **re-seeds every cycle run — 3 new citizens selected per cycle**. The persistent layer is `Undocked_Standings` (the leaderboard tracks which citizen performs best across casts), not the cast itself. Wiring gap: post-ship open item (a).

**The feedback loop (the point of the show):** episode performance → coverage → standing → more coverage. The deterministic adapter scores each episode (credits delta, combat outcomes, deaths, achievements, mishaps, `captains_log` color) and stamps a magnitude; approved episode events drive Tribune coverage and ECL audience lines; coverage is ingested Saturday into `Citizen_Media_Usage`/`Storyline_Ledger`; a cast member's rising media usage raises their standing and their future coverage likelihood across the sim. A random dishwasher becomes a city figure through measured play, not authored fiction.

**Lottery mechanics:**

- **Eligibility filter (v1, deliberately wide):** living adult ledger citizens currently residing in Oakland. Excludes minors and the traded/dead/moved-away (legacy-ledger categories). Sitting officeholders are NOT excluded (Mike-direct 2026-08-16, ruled after the draw pulled DA Clarissa Dane: "fair game"). Tribune staff stay eligible — the coverage-firewall gag is texture, not a blocker. Filter computes from ledger fields only; no judgment calls at draw time.
- **Draw mechanism:** deterministic seeded RNG. Seed = show identifier + draw sequence number + cycle; input = the frozen eligible-POPID snapshot; output = 2–4 cast members plus a ranked alternate list that feeds succession. Seed, snapshot, and result are all recorded so any draw is reproducible and auditable. Code draws; the newsroom narrates.
- **Mike approves the eligibility filter and draw parameters — never individual names; the draw decides.** Routing: the proposal goes to research-build, who takes it to Mike — rb does not decide policy solo. Build execution between decisions does not wait on step-by-step Mike direction (Mike-direct 2026-08-15, clarified same day: execution pace only, not build authority).

**Architecture principles:**
1. **Adopt upstream, bound it — don't rebuild.** `SpaceMolt/commander` (MIT) is the pilot agent: mission-driven tool loop, OpenRouter support, context compaction, per-session state. `SpaceMolt/spacemolt-lib` (MIT) is the telemetry substrate: typed WS SDK, multi-account via one Clerk key, live events, local state cache. The dead miner is replaced by adoption + a bounding wrapper, not a from-scratch agent.
2. **External fact → staged event → review gate → sim perception.** Raw game output is never canon. Deterministic adapter (no LLM in the writer loop — buildWorldSummary precedent) summarizes each episode; a gate decides what becomes a sim-facing cultural event.
3. **Second instance of the played-events pattern, not a framework.** Sports is instance 1. This is instance 2 — generalize `sportsFeedContract` to exactly one new feed type (kimi review rule). The third instance forces the abstraction, not this one.
4. **Wagering is wholly ours.** No server-side wager/leaderboard tools exist — settlement is against verified adapter outcomes. Narrative-first; the casino ledger stays gated behind a dedicated design + Mike sign-off *(historical — 4b shipped 2026-09-01, S410; see the Phase 4 status note)* (research hazard: "a casino ledger is not authorized by mentioning it").
5. **One-shot jobs run from crontab, never pm2 `cron_restart`** (S360 moltbook lesson: pm2 re-fires every 30s tick in the matching window, mid-run SIGINT duplicates actions).

**Terminals:** research-build builds the Node/apparatus side (runner, adapter, gate plumbing); engine-sheet wires the sim side (feed type, ECL pool, any ledger); media runs coverage. Mike holds eligibility-filter/draw-parameter approval, show identity, and gate flips — reached THROUGH research-build, who carries proposals to him; build execution does not wait on step-by-step Mike direction (Mike-direct 2026-08-15, clarified: pace only). The 4b casino-ledger sign-off stays Mike-only *(historical — 4b shipped 2026-09-01 via direct builder sign-off, S410; see the Phase 4 status note)*.

---

## Phase 0 — Decisions + verification (research-build + Mike)

- **0.1 Account identity — DECIDED S360 (Mike-approved): fresh show account(s)** via `spacemolt-lib` multi-account (one Clerk key owns the fleet). The existing "Mags Corliss" account (Nebula Collective, home system Haven, ~1,581 credits, creds at `~/.config/spacemolt/credentials.json` — confirmed S360 audit) stays Mags' own; its history is 61 failed mining runs, not show material. Execution note for next session: verify how spacemolt-lib's Clerk-key auth coexists with the game's per-account register/login flow before minting cast accounts.
- **0.1b Audit facts binding the build (S360 agent audit).** The old miner's response parsing NEVER matched the server schema — 61 "completed" runs, 0 ores recorded ever, last successful sell logged 17 items at 0 credits; then 71 days of `no_fuel` (no refuel step existed). Rate limit is real: 60 public API req/min per IP, shared across the whole fleet — bounds both the episode runner and the adapter's polling. Both facts reinforce principle 1 (adopt typed upstream clients; never hand-parse response text again).
- **0.2 Commander adopt-verify.** Clone `SpaceMolt/commander`; run ONE bounded session on OpenRouter cheap tier against the live server: verify a turn-capped/one-shot mode exists (or wrap), action log capturable, cost per episode measured. Acceptance: one episode, durable log, cost number in hand.
- **0.3 Lottery cast selection (Mike-direct 2026-08-15; supersedes the curated shortlist + Mike-picks design).** Build the eligibility filter and seeded draw per the Cast model section; run the opening draw; drawn citizens become the Phase 1 persona bindings. Mike approves filter + draw parameters (brought to him by research-build); no individual approvals — the draw decides. The kimi shortlist (`output/kimi/spacemolt-phase0/cast-shortlist.md`) is retained as an illustration of cast-role spread only — it is not a selection source.
- **0.4 Telemetry source pick — DECIDED (2026-08-16, research-build).** `mcp__spacemolt__get_action_log` is the source: server-side, category-filtered (mining/trading/combat/navigation/etc.), exactly the fact categories 2.1 needs. Verified live: local per-episode JSON (`output/spacemolt-show/episodes/*.json`) has no result/outcome data, only `tool_call`/`tool_error`/`turn_end` events (commander's own log, not the server's record) — parsing it for facts was the wrong plan. `.mcp.json` wires spacemolt server-wide, not kimi-specific; pilot credentials exist per-session at `output/kimi/spacemolt-phase0/commander/sessions/undocked-pop{ID}/credentials.json`. Query window bounds from `startedAt`/`endedAt` in the local per-episode JSON. `captains_log_list`/`captains_log_get` (same session_id) is the subjective-color source — quoted, provenance-marked, never treated as fact.

## Phase 1 — Pilot infrastructure (research-build)

- **1.1 Bounded episode runner.** Wrapper around commander: crontab-scheduled, one mission per episode, turn + cost caps, recovery-aware (the old miner stranded full-cargo/no-fuel; missions must include refuel/repair authority), durable per-episode JSON in `logs/spacemolt-show/`. Cadence RE-DECIDED (2026-08-18, Mike sign-off, supersedes the 2026-08-16 per-cycle decision): **one episode per DAY, rotating across the live cast** — each pilot flies ~2–3×/week. Flights accumulate through the week and air together at the next cycle fire (`TargetCycle = next unfired cycle`), so the airing clock stays cycle-rhythm while the flight clock is daily. ~$0.13/flight → ~$0.90/week. Requires the EpisodeId per-cycle sequence component (a pilot now flies the same cycle more than once — the bare `undocked-{pop}-Y{n}C{m}` id would collide).
- **1.2 Pilot voice binding.** Mission briefs written in-world (the cast citizen's goals, in their register); `captains_log` entries as the pilot's own narrative record (cheap model). This is the show's raw character material — the adapter carries it as *quoted subjective color*, provenance-marked, never as fact.

## Phase 2 — Adapter + staged events (research-build adapter; engine-sheet sim wiring)

- **2.1 Deterministic adapter.** Per-episode JSON → staged episode summary: credits delta, systems visited, combat results, cargo, mishaps, captain's-log excerpts. Facts only, provenance-marked, no LLM.
- **2.2 Review gate + feed.** Staged summaries land in a gated intake (same subjective-to-gated shape as `Reflection_Intake`); approved events ship as the second played-event feed type. Engine-sheet wires the feed into cycle intake.
- **2.3 Audience surfaces.** New ECL pool (e.g. `culture.spacemolt-show`): watch-party lines, argument lines, aspiration lines — rides the pool + conditions DSL machinery just proven in engine.79/97 (this can be proving-ground #3 for exclusive-pool policy later). Followers' wake perception picks up approved events via the existing carrier — no raw game logs in prompts.

## Phase 3 — Coverage lane (research-build designs; media runs)

- **3.1 Dedicated show beat — DESIGNED (2026-08-16, research-build, Mike-direct: assign a real reporter, not incidental mentions).** Not folded into an existing culture-desk generalist: the plan already forbids sports-desk framing here, which is itself a signal this needs its own identity, and episode-to-episode continuity (who's rising, who's struggling, the rivalry building) needs one consistent voice the way sports holds a beat — not whoever's on culture that cycle. Precedent: pipeline.47-50 minted P Slayer/Tanya/Simon/Anthony/Hal the same way — grok picks the persona (existing citizen or fresh mint) + writes the stance/bag, Claude lands `.claude/agents/**` control plane.
  - **Voice:** entertainment/reality-show recap energy — personality-forward, "who's up who's down," arc-tracking across episodes. Explicitly NOT hard news, NOT sports-analytics, NOT civic-process register. This is the one desk allowed to sound like it's having fun.
  - **Data contract:** reads ONLY `output/spacemolt-show/feed/c{N}.json` (2.2-approved events) — never raw staged/episode JSON, never captains_log directly. The adapter already did the fact/subjective split (ADR-0017); this reporter writes color and interpretation around typed facts + the citizen's own already-marked quotes, same as every other desk, never a new fact source.
  - **Cadence:** dispatched through existing M-F desk-wake machinery when a `feed/c{N}.json` carries an event not yet written up — not a fixed daily slot, since the show itself runs per-cycle rotating cast, not every wake.
  - **Canon door:** stays Sat-edition-only (PIN rule), same as every other desk — drafts queue through the week, publish Saturday.
  - **Fourth wall:** same ban as the feed/ECL contracts (no "video game," MCP, tool_error, etc.) — the writer composes free prose, so this needs to be an explicit RULES line, not just inherited from a pre-validated row.
  - **Status:** grok first pass drafted 2026-08-16 — persona **Nia Rook** (fresh mint, POPID pending). Voice + bag in `docs/media/`. Agent package in `output/grok/undocked-desk/` for Claude to land under `.claude/agents/nia-rook/`. Not in live `persona-map.json` until mint. Celeste Tran (POP-00164) considered and rejected: social-trends diagnosis, not episode-arc recap.

## Phase 4 — Wager lane (gated, sequential)

- **4a Narrative-only (first).** Wager texture in the ECL pool + letters — citizens talk stakes, no balances move. Runs ≥2 cycles before 4b is even designed.
- **4b Casino ledger (NOT authorized by this plan).** Requires its own design doc + Mike sign-off: event IDs from adapter outcomes, published odds, eligible citizens, stake caps, funding source, settlement at cycle fire, household economic effects, audit trail, loss safeguards. Feeds grudge/ambition typing downstream. In-world money only — no real-money anything, ever. Design questions consolidated in [[../research/2026-08-29-casino-ledger]] (watch; serves this gate, authorizes nothing).

  **Status 2026-09-08 (kimi true-up):** 4b SHIPPED live 2026-09-01 (S410, commit `d1220bfa`, direct builder sign-off "turn on the casino"; bench C106 run at arm time: 9 open sports slips, 0 errors). Design + build docs archived at [[../archive/plans/2026-08-31-grok-casino-ledger]] and [[../archive/plans/2026-08-31-grok-casino-ledger-build]] (filed 2026-09-04, S420). The "NOT authorized" language above is superseded as gate mechanics and stays as history. Post-ship findings and open items: the plan's "Post-ship open items" section below and [[../research/2026-08-29-casino-ledger]] (now a constraint record, not a gate).

---

## Acceptance criteria

1. One unattended scheduled episode completes under its cost cap with a durable action log (no-manual-demos rule: the acceptance run is the scheduled one).
2. Adapter emits a staged episode event with provenance; zero sim writes without gate approval.
3. First approved episode event surfaces in ≥1 citizen wake AND a Tribune piece within the same cycle window.
4. `culture.spacemolt-show` pool draws in Content_Telemetry.
5. Phase 4a lines draw; 4b remains unbuilt until its own sign-off. *(Superseded 2026-09-01 — 4b shipped S410, `d1220bfa`; see the Phase 4 status note.)*

## Open questions

- [ ] In-world broadcaster: who *airs* the show in Oakland — an existing business entity (Civis Systems? a media house?) or a new minted business? (Shapes coverage voice + a possible sponsor thread; decide with Mike at Phase 0.3.)
- [x] Episode cadence — **RE-DECIDED daily, rotating cast** (2026-08-18, Mike sign-off; supersedes the 2026-08-16 per-cycle decision; see 1.1).
- [ ] Themed special weeks (Mike-direction 2026-08-16): full special-event weeks around holidays and city moments once the base loop is locked in — a cadence variant, not a new mechanism. Revisit after the first cycles prove ingestion → coverage → feedback. The casino era spawning from the show remains Phase 4b: its own design doc + Mike sign-off, unchanged *(historical — 4b shipped 2026-09-01, S410; see the Phase 4 status note)*.
- [ ] Does the audience wake-day participation need any mechanic beyond perception + ECL (e.g., a "watched the episode" LifeHistory event), or is texture enough for v1?


## §2.4 — In-space weeks and the mobility engine (builder-direct, 2026-08-17)

**Ruling 1: a pilot is genuinely in space for that cycle.** Not "in Oakland with
show-flavoured color" — off the board. Their week's events ARE the flight. No
ordinary Oakland daily pool for a citizen in the cycle's feed. Builder's framing,
recorded because it is the reason and not just the rule: there is nothing to
pretend. Real-world Oakland is numbers to the model exactly as GodWorld Oakland
is; neither the crons nor the model have ever seen either. The only question is
whether the numbers are presented as cohesive logic. So a pilot is not
"simulated as if" in space — the citizen is in space that cycle, and would not
be home.

**Ruling 2: this is the sim's #1 source of entertainment, and it is meant to
flood the world.** The show is not a side attraction. A successful run plus
sitting atop the leaderboard for multiple weeks is a mobility engine: Tier 4 to
Tier 1 in 5–6 cycles, permanently altering every event that citizen draws — and
their children's, via the heritage layer. Roughly five cycles for a Tier 1 to
become famous. That is why everyone is eligible (the city is fair game,
officeholders included — the sitting DA was drawn and stays) and why everyone
watches. It is a different mechanism for altering the sim and then watching the
sim react to itself.

**Rate check (engine-sheet, before building):** the saturation worry does not
hold. Cadence is one episode per cycle across a persistent 2–4 cast (§1.1), so
the promotion path is narrow by construction — only seated cast climb, and
succession controls who joins. Living tiers today: 957 citizens, Tier 1 24
(2.5%), Tier 2 73, Tier 3 231, Tier 4 628 (65.6%). At ~1 promotion per 5–6
cycles that is ~17–20 new Tier 1s per 100 cycles — Tier 1 roughly doubles over
that span. Meaningful, not runaway. No cap needed; recheck if cadence or cast
size ever increases, because both multiply this directly.

**Build split.** In-space weeks (Ruling 1) are a bounded extension of the feed
already landed and are being built now. The mobility engine (Ruling 2) is a NEW
mechanism touching Tier — which governs protection, which generators run, and
lineage — and nothing today promotes on fame or standings. It gets designed in
daylight rather than started at the end of a long session.

**§2.4 addendum (builder-direct 2026-08-18, verified against code same session):**
Ruling 2's "nothing today promotes on fame or standings" was true of STANDINGS
but not of coverage — the mobility engine already exists and the show feeds it.
Verified chain: emergence-type `Citizen_Media_Usage` rows (quoted / profile /
interviewed / featured) bump ledger `UsageCount` at the Saturday canon door and
promote immediately at 3→Tier 3, 6→Tier 2, 9→Tier 1
(`processAdvancementIntake.js`; its own draw-intake comment reads "lottery
entry is Tier 4 — climbs via UsageCount like everyone"). The consequence side
is engine.69: 10 un-named cycles decay the count and earned rungs give way,
Tier 1 exempt, authored tiers held. Only 228 of ~960 living citizens have ever
been named in coverage — a cast seat is access to the sole fast currency out of
Tier 4, and Marcus Walker (Dishwasher, T4, wealth 1/10, UsageCount 0) is the
opening case. Precision: ECL audience/wake lines are fame texture and do NOT
feed UsageCount; only article citations do. The leaderboard's mobility power is
therefore indirect and editorial — being on top earns more bylined coverage.
Remaining design scope, replacing the old "mobility engine" item: (a) whether
standings mechanically pull extra coverage (a leader-feature slot beyond the
recap), (b) the casino (4b, unchanged gate — historical, shipped 2026-09-01 S410; see Phase 4 status note) — the first mechanism where the
AUDIENCE takes downside, not just the cast. (c) trending as a scored
mechanic — today the show's heat is emergent co-presence (the first content
class ever live in all four social surfaces the same week: wake ECL lines,
exchange perception + the fresh-edition interview trigger, daily recaps,
citizen pages), but nothing measures it or feeds it back; Storyline_Tracker's
trend-trajectory machinery + Undocked_Standings are the natural inputs if the
builder wants heat the engine reacts to. Verified same session: exchange
participants carry their LifeHistory tail (a pilot's in-space week rides into
1-on-1s), own exchange lines accrete on the citizen's cp-POP page and return
in later wakes, and the exchange interview format triggers on being named in
the freshest edition — coverage begets coverage mechanically.

## §2.5 — Daily-cadence build (Mike-direct session, 2026-08-18)

Four decisions, all Mike sign-off, taken after an engine-sheet wiring audit of the whole show:

1. **Cadence — daily rotating** (see 1.1). Flights daily, airing stays cycle-clocked: every flight pushes `TargetCycle = next unfired cycle`, the week's slate airs together at fire.
2. **Gate runs auto-approve-on-valid unattended.** Contract validation (fourth-wall, schema) is the wall: a passing episode auto-decides `DecidedBy=auto-gate` and pushes; a failing one parks `Applied=no` for human review. Editorial judgment moves from per-episode approval to the validator + spot review.
3. **Standings layer greenlit — design + build.** Deterministic aggregation over `Undocked_Feed` rows (per-pilot cumulative credits, streaks, cycles-on-top) into an `Undocked_Standings` tab. This is the casino-4b substrate and the future mobility-engine input — but NOT the mobility engine itself; §2.4's build split stands, nothing promotes on standings yet.
4. **Nia cycle-fire sit-down.** One pilot interview per cycle on fire day, rotating. `UsageType=interviewed` is the deliberate standing-ladder mechanism; recap citations stay `coverage` (non-laddering). Open design item before first run (media lane): the interview's source-of-speech — what the pilot "says" — without a fourth-wall leak.

**Wiring-audit findings driving this session's fixes:**
- F7 contradiction: `undockedDraw.js` still hard-excludes the 10 sitting council officials; the ruled filter says officeholders are eligible (Dane only slipped through because DA isn't on the council roster).
- Nia absent from `newsroom-wake-packages.json` — the newsroom cron never dispatches her, so recaps never queue → never reach Saturday edition → never ingest to `Citizen_Media_Usage`. The coverage→standing feedback loop was severed at its first joint. **pipeline.60 BUILT same session (engine-sheet, S379):** `buildNiaSlice.js` turns un-recapped feed events into lane entries; fanout carries a dedicated `undocked` desk quota whose seat is dropped story-less when nothing is un-recapped (the drop IS the conditional dispatch); `loadLane` serves her lane from the slice, independent of desk_signal; a recap ledger (`output/spacemolt-show/recaps.json`) marks filed episodes at write time. Wake package `NIAROOK-UNDOCKED-1` live (llama-3.3-70b, load-bearing reviewProfile, fourth-wall canonBlockers); Bay_Tribune_Oakland roster row + UNDOCKED beat rule added. **Decision 4's source-of-speech resolved by existing machinery:** the wake-2 citizen-quote pass interviews the PILOT (story.popids carries them) — pilot speech comes from citizenVoice like every quoted citizen; `UsageType=quoted` is the standing ladder. A dedicated sit-down feature piece stays optional editorial (media lane). Acceptance per no-manual-demos: the next M–F 06:15 wake chain.
- No crontab entries exist for any show stage — every episode/approve/push to date was hand-run.
- Dane + Jumper C103 flights sit undecided (`Applied=no`) in intake.
- EpisodeId `undocked-{pop}-Y{n}C{m}` is one-per-pilot-per-cycle — daily cadence requires a sequence component or same-cycle repeat flights silently collide.

## Post-ship open items (2026-09-08, kimi)

True-up after the 4b ship — every item verified against code and live dumps same day. All four need an engine-sheet decision or a scheduled watch; none is kimi-implementable under lane scope.

- **(a) Cast redraw cadence — DECIDED 2026-09-08 (Mike-direct): reseed every cycle run, 3 new citizens per cycle; `Undocked_Standings` is the cross-cast continuity layer, not the cast.** The cast still flies from draw-1 (output/spacemolt-show/draws/draw-1.json, drawn 2026-08-16, manifest cycle 103): Clarissa Dane POP-00143 / Marcus Walker POP-00962 / Merkin Jumper POP-00688; alternates LaTrice Desai POP-00946, Jango Lango POP-00253, Renata Voss POP-00556. Rotation is static by construction: the orchestrator loads only the latest draw manifest (scripts/cron-undocked-run.js:42-50) and picks fewest-flights-this-cycle, cast-order tiebreak (:59-78). Crontab carries only the daily 20:30 flight job; redraws are manual (scripts/undockedDraw.js --draw N --cycle M). Remaining wiring before the ruling can execute: (i) an orchestrator draw step (re-run undockedDraw when the flown cycle advances); (ii) mission-brief generation for freshly drawn citizens (template from ledger fields — name/age/role/neighborhood; the three current briefs are hand-written statics); (iii) SpaceMolt account minting for new pilots — the runner preflight refuses without pre-seeded credentials and the orchestrator already names this "succession wiring not done" (scripts/cron-undocked-run.js header). Until all three land, draw-1's cast keeps flying. **Engine-sheet review 2026-09-08 (S438):** the draw itself moves into the engine (engine.175 — fire N draws cycle N+1's cast with `ctx.rng`, writes a draw tab); the apparatus order becomes (iii) account minting → (ii) brief generation → (i) orchestrator reads the draw tab — **assigned to kimi (builder go, 2026-09-08 S438), contract in (a′)** for `TargetCycle = cycleCount+1` instead of the local manifest. Minting + briefs are a hard gate on engine.175's PROD deploy, and the reseed ruling itself awaits builder confirmation in a Claude seat (relayed here). Review: [[../research/2026-09-08-kimi-casino-undocked-trueup]] §Review.
- **(a′) `Undocked_Draw` tab contract — PUBLISHED 2026-09-08 (engine-sheet, S438; builder go). Build target for both halves.**
  - **Tab:** `Undocked_Draw`. Engine-sheet creates it by script on bench, then on live only when kimi's minting + briefs are ready — **the tab is the switch**: missing tab = engine draws nothing and the show market stays closed (same no-op pattern as `Casino_Ledger`); the engine never inserts it. No World_Config flag.
  - **Headers, in order:** `TargetCycle | DrawCycle | Seed | Slot | POPID | Name | BirthYear | Neighborhood | Role | Employer`
    - `TargetCycle` — the cycle the cast flies for (airs in). `DrawCycle` = the fire that drew it = `TargetCycle − 1`.
    - `Seed` — the engine's per-cycle draw seed string, recorded so the draw is reproducible on bench replay.
    - `Slot` — `cast-1` … `cast-3`, then `alt-1` … `alt-3`. Rank order = draw order.
    - `POPID`, `Name` (First Last), `BirthYear` (age = calendar year − BirthYear, never a stored age), `Neighborhood`, `Role` (Simulation_Ledger job title), `Employer` (EmployerBizId, may be blank) — the fields brief generation needs, so kimi's template reads this tab and nothing else.
  - **Engine writes:** 6 append-intent rows per fire at Phase 5 ahead of Step 2.45, eligibility = `undockedDraw.js` v2 (Active, ≥18 by BirthYear, resident, has Neighborhood; sitting officeholders eligible), drawn with `ctx.rng`, no citizen twice in one draw. Append-only: never edits, never deletes, never re-draws a cycle that already has rows.
  - **Orchestrator reads (kimi):** rows where `TargetCycle === World_Config.cycleCount + 1`, `Slot` starting `cast-`, in Slot order; rotation over them unchanged (fewest flights this cycle, Slot order breaks ties). If a cast pilot fails preflight (no credentials), fall to `alt-1` … in order and say so in the log. **No rows for that TargetCycle → fall back to the latest local draw manifest**, so kimi's change is safe to land before the engine cut and before the live tab exists.
  - **Casino (engine.175):** show slips key `EventId = c<TargetCycle>:<POPID>`; `credits_sign` resolves on the pilot's summed `CreditsDelta` over their aired rows for that cycle, `mishap` on any `MishapCount > 0` over them, `night_winner` unchanged. A pilot with no aired row by settlement = `carry` → VOID at 3 cycles, as today.
  - **Truth docs:** `SCHEMA.md` / `SCHEMA_HEADERS` + `SHEETS_MANIFEST.md` §9 update in the commit that lands the engine writer.
- **(b) Runner completion detection + mission-brief command cheatsheet — SHIPPED 2026-09-08 (kimi, `3c481586`).** scripts/undockedEpisode.js had no completion signal — the only stop was the wall-clock cap (SIGINT at --minutes, default 10; SIGKILL after a 15s grace). Episode 2026-09-08 (undocked-pop00143-2026-09-08T01-30-06): the pilot aborted its mining mission honestly (no ice harvester), ignored the brief's "dock and stop", jumped to Sol, and capped mid-mission (46 turns, 9 tool errors, exitCode null). Shipped fix: the runner stream-scans episode telemetry for the mission end condition (successful captains_log_add while docked, either order) and takes the graceful SIGINT path after a 20s settle; the wall-clock cap stays as backstop; the sidecar gains `completedCleanly` and `capped` now means the wall-clock cap actually fired (adapter pass-through only, scripts/undockedEpisodeAdapter.js:63). Replay against the 2026-09-08 log: completion fires at tick 23 (~01:34), six minutes before the cap. The three mission briefs (output/spacemolt-show/missions/*.txt) gained an exact-command cheatsheet (the 9 errors were wrong-shape guesses: `spacemolt/travel destination=` vs `target_poi=`, `spacemolt/captains_log_add` vs `spacemolt_social/captains_log_add`, `spacemolt/view_market` vs `spacemolt_market/view_market`) and a hard-stop line. Tests: scripts/undockedEpisode.test.js (12 checks).
- **(c) Undocked-market placement off-by-one.** The casino only places show wagers against Undocked_Feed rows with TargetCycle === fireCycle+1 (phase05-citizens/casinoLedgerEngine.js:341), but the orchestrator reads currentCycle and only then pushes TargetCycle = currentCycle+1 (scripts/cron-undocked-run.js:104-107, 149-152) — always after the fire that set currentCycle. At fire N all feed rows have TargetCycle ≤ N → the casino's upcoming list is always empty → zero undocked slips ever place (C106 dump: 12 slips, all sports). Engine-sheet decision: either place against the current-cycle feed as prediction markets, or have the orchestrator pre-announce TargetCycle+1 episodes before the fire. **Priority note (2026-09-08):** the show was the casino's original subject — the 2026-07-27 research frames fictional wagering as settling "against validated SpaceMolt outcomes", with sports added later as the proving case. The off-by-one currently leaves the casino running its side market while its reason for existing stays dark. **DECIDED 2026-09-08 (engine-sheet review, S438): neither option.** Pre-announce cannot settle — `EpisodeId` is minted at push time by sequence (`undockedShowContract.js:40-45`) and 85% of show picks resolve by exact id match, so an announced row's slips `carry` → VOID. Fix = engine.175: the engine draws next cycle's cast at fire N and show markets re-key to pilot-per-cycle (`c<N+1>:<POPID>`; credits/mishap aggregate the pilot's aired rows); `casinoUpcoming_` retired; no `Undocked_Feed` contract change. Gated per item (a).
- **(d) Settlement-proof watch (C107+).** Casino_Ledger has zero settled rows as of the C106 dump (output/beats/Casino_Ledger.jsonl: HOUSE float 250000 + 12 open sports slips, odds 1.83, stakes 134–667, per-slip Seed; output/beats/meta.json cycle 106, prevCycle null — the dump pipeline only started at C106, so pre-C106 placement history is not locally observable). Watch C107+ for the first real settlement. The VOID path is already exercised live: episode undocked-pop00143-2026-09-08T01-30-06 aired with CreditsDelta null (flag credits_delta_windowed) and resolves VOID_GATE by design (casinoLedgerEngine.js:187).
- **(e) Fame/mobility loop target (Mike-restated 2026-09-08).** The top-ranked Undocked contestant should reach A's-player fame — a reality star: Nia Rook's coverage pushes Citizen_Media_Usage on strong performers, and performance should make more events and crons aware of the contestants. `Undocked_Standings` (scripts/undockedStandings.js) is the accumulation layer and already recomputes nightly, but NOTHING promotes on those numbers yet (§2.4 build split: the mobility engine gets its own daylight design). This restatement is that design's stated target — engine-sheet territory, alongside the per-cycle reseed wiring in (a). **Engine-sheet review 2026-09-08 (S438): no design doc needed — the loop exists end to end** (climb ladder 3/6/9, decay, engine.118 fame permanence LIVE @27/@28 S412; Nia's recaps stage and the Saturday sweep ingests ALL staged into `Citizen_Media_Usage`). The one dead wire: `Undocked_Standings` has zero readers — `buildNiaSlice.js` reads the feed pack + recaps only, so coverage never knows who leads. Action (research-build, small): carry rank / CyclesLed / CurrentStreak into the Nia slice; the ladder does the rest. Fame target awaits builder confirmation in a Claude seat (relayed).

## Changelog

- 2026-08-07 — Initial draft (S360, research-build). Ignited by Mike-direct game-show direction; research basis + upstream org audit same day. Moltbook restart-storm fix shipped same session (crontab lesson baked into principle 5).
- 2026-08-07 — 0.1 DECIDED (S360, Mike-approved): fresh show accounts, Mags account stays hers. 0.1b audit facts added. Next session opens on Phase 0 execution: cast shortlist (Mags, from ledger), commander adopt-verify (cheap OpenRouter, produce cost-per-episode), show name + cast picks (Mike).
- 2026-08-15 (kimi) — Phase 0 packet delivered (`output/kimi/spacemolt-phase0/`): 0.2 ready, 0.4 picked, 0.1 resolved; verify episode held for Mike's go. Mike-direct: cultural figures get full ledger citizenship — binding engine-sheet mint work, generalizes to all 39 wd-cultural cards.
- 2026-08-15 (kimi) — Mike decisions: show name UNDOCKED, airs as SpaceMolt's own channel (not Civic/Tribune). Live verify episode (0.2) approved same day. Forward: SpaceMolt events enter via the evening-events engine, supersedes parts of Phase 2/2.3.
- 2026-08-15 (kimi) — 0.2 acceptance PASSED (Verify-002): pre-minted account, pre-seeded creds, 10-min cap, full mine-sell-refuel-relaunch loop, log at `output/kimi/spacemolt-phase0/verify-episode-002.log`. Cost ≈$0.20–0.40/episode uncached. Phase 0 closed except cast picks (0.3).
- 2026-08-15 (research-build) — Cast selection redesigned to RANDOM lottery (Mike-direct), not curated shortlist — supersedes 0.3 + Cast model section; routed to kimi to design the mechanic.
- 2026-08-15 (research-build) — CUL/POPID gap quantified: 21 of 46 `Cultural_Ledger` rows have no POPID link, real denominator is 46 not 39 — full list in commit body.
- 2026-08-16 (engine-sheet) — **CUL mint prepared; one canon blocker found, not minted.**
  Scope re-verified live against the sheet, not the cards: `Cultural_Ledger` 46 rows,
  **25 linked / 21 unlinked** — rb's corrected split in `c11e2dd9` holds exactly.
  Authorization traced to the ruling at line 93 of this plan (cultural figures get
  full ledger citizenship; binding engine-sheet work), so the mint is authorized and
  its parameters are specified. Also doctrine-consistent rather than an exception:
  these figures carry FameScore/MediaCount, so they earned rows by the
  media-coverage route (see [[2026-08-16-new-life-intake]] §1).
  **Groundwork done, so the next pass executes rather than re-derives:** all 21
  already carry Neighborhood, RoleType, FameCategory, CityTier and CulturalDomain in
  `Cultural_Ledger` — little needs inventing. Mint template is **POP-00540 Jade
  Orion**, the closest already-linked cultural analogue (Tier 2, ENGINE clock,
  GodWorld origin, full economics: Income/NetWorth/WealthLevel/SavingsRate/
  DebtLevel/EducationLevel/CareerStage/YearsInCareer/EconomicProfileKey/
  EmployerBizId/SkillTags/Gender/TraitProfile/DialState). Next free POPID:
  **POP-01056**. Their assigned hoods mostly already agree with the
  [[../canon/INSTITUTIONS]] §Neighborhoods pass (Theo Banks/rapper in Uptown's arts
  and nightlife district, Celeste Moon/singer in KONO's emerging arts corridor).
  **BLOCKER — `CUL-5F7A348B` "Councilwoman Rivera" holds no council seat.** The nine
  are Carter, Tran, Delgado, Vega, Rivers, Crane, Ashford, Chen, Mobley;
  `Civic_Office_Ledger` has no Rivera, and the three Riveras in `Simulation_Ledger`
  are a BART station manager, a quantum computing researcher and a paramedic.
  Minting her with RoleType `civic leader` would put a **tenth councilmember** into
  the citizen ledger where the civic packs and city-hall could surface her — a
  contradiction that propagates rather than sits still. Needs a canon ruling first:
  former officeholder / different civic role / candidate / mis-titled. Not
  engine-sheet's call. The other 20 are unblocked.
  Note also `CUL-C13B0483` "Claire Ashford" shares a surname with D7's Warren
  Ashford — plausibly family, flagged not blocked.
- 2026-08-15 (kimi) — Lottery mechanic (0.3 rewrite): seeded RNG over eligible-POPID snapshot, 2–4 cast + alternates, reproducible. Feedback loop: adapter → coverage → Sat ingest → standing. Mike approves filter/params, never names. CUL gap: cul-ledger-gap.md.
- 2026-08-15 (kimi) — Mike-direct: do not gate on Mike — lottery filter/draw-params/Phase-1-proceed delegated to research-build. 4b casino-ledger sign-off stays Mike-only. Plan body updated.
- 2026-08-15 (kimi) — CORRECTION (Mike-direct, via rb): no-gate covers EXECUTION PACE ONLY, not policy — eligibility filter/draw-params/Phase-1-proceed still need Mike's sign-off, routed kimi → rb → Mike. Supersedes entry above.
- 2026-08-16 (research-build) — Pilot flown (kimi, `13fd2633`): Marcus Walker, exit 0, 78 turns, ~$0.13. 1.2 pilot-voice pattern proven live. Dane + Jumper ready. Cadence RECOMMENDED per-cycle/rotating-cast, held pending Mike per the correction above.
- 2026-08-16 (kimi) — **Cadence DECIDED (Mike sign-off): one episode per cycle, rotating cast.** 1.1 and open-questions updated. Dane + Jumper proving flights authorized by rb as execution-pace (proven mechanism, no new policy) — flying same session.
- 2026-08-17 (grok) — ECL authored: 8 culture.spacemolt-pilot rows first (undockedpilot) + city culture.spacemolt-show. First tag source:undocked, comma tags, bare flags. Nia UsageType=coverage on recap citations. Apply via undockedEclPoolApply.js.
- 2026-08-17 (grok) — 2.2 decide() archives staged/*.json to staged/archive/ so enqueueStagedDir cannot re-stamp a decided episode onto a later cycle. Es owns the enqueue() refusal-guard on already-decided intake rows.
- 2026-08-16 (grok) — §3.1 first pass: Nia Rook (pending mint). Voice + UNDOCKED bag on disk; agent package at output/grok/undocked-desk/ (not .claude/agents). Feed-only data contract + explicit fourth-wall RULES. Claude lands after review; es mints POPID.
- 2026-08-16 (grok) — 2.3 pool expanded for rb review: one PoolKey, 24 lines (watch/argue/love/sting/lottery). Love/sting gated on proposed warmth 0–100 DialState; lottery on fame=0. Fire-rate notes in script header (1–4 events/citizen, PoolKey mass balance, 40-row cap). Still fail-closed until es lands undocked+warmth+drive.
- 2026-08-16 (grok) — Phase 2.3 drafted for engine-sheet land, not applied: 9 `culture.spacemolt-show` lines (watch/argue/aspire) in `scripts/undockedEclPool.js`. Conditions `undocked=1` fail-closed on today's loader. Drop-in `undockedEclPool.engine.js` (DSL flag + condScopes + approved-feed load). No Event_Content_Ledger write. 2.3 is sim-wiring per this plan's terminal split.
- 2026-08-16 (grok) — Phase 2.2 first pass: `undockedShowContract.js` + `undockedShowGate.js`. Disk intake (Applied=no → yes/rejected), one feed type `undocked-episode`, no sheet write. credits_delta_windowed + open_escrow flags on the row so a later-episode fill is a known scoping choice. Held for rb review.
- 2026-08-16 (grok) — Phase 2.1 first pass: `scripts/undockedEpisodeAdapter.js` (no LLM). Logs in with stored pilot creds, category-splits get_action_log, captains_log_list stays QUOTED_SUBJECTIVE_COLOR. Tested live on the three disk episodes. Staged at `output/spacemolt-show/staged/`. Held for rb review before 2.2/2.3.
- 2026-08-16 (research-build) — 0.4 telemetry source decided (get_action_log, verified live). Phase 2.1 adapter assigned to grok — real spec now buildable, was blocked on this.
- 2026-08-16 (research-build) — Phase 3.1 designed (Mike-direct: assign a real reporter). Dedicated beat, not folded into culture-desk; voice/data-contract/cadence spec'd. Assigned to grok to draft.
- 2026-08-16 (research-build) — F4 resolved: "evening-events engine" (L101) has zero hits anywhere in repo/docs beyond that phrase — no competing mechanism was ever built. Built 2.1-2.3 realizes that note, doesn't contradict it. ef3e3d71 stands.
- 2026-08-16 (Mike-direct) — F7 ruled: sitting officeholders are eligible for the lottery. DA Clarissa Dane (POP-00143, drawn) stays in the cast. Eligibility filter updated.
- 2026-08-17 (research-build) — Regression found reviewing 6259e3b3: d01e0486's --push added lib/sheets directly into undockedShowGate.js, breaking its own no-sheet-client test. Move the sheet write into a separate drop-in, same pattern as everywhere else.
- 2026-08-18 (engine-sheet) — §2.5 added: daily cadence, auto-approve gate, standings greenlight, Nia sit-downs (four Mike sign-offs) + wiring-audit findings (F7 draw contradiction, Nia uncronned, no show crontab, EpisodeId collision constraint).
- 2026-08-18 (engine-sheet) — pipeline.60 BUILT: Nia dispatch live (undocked desk quota, feed-built lane, recap ledger, wake package, roster row); wake-2 packet interview = pilot source-of-speech. Acceptance: next 06:15 wake chain.
- 2026-08-18 (engine-sheet) — tier system extracted to its own doc: [[../engine/TIER_MOBILITY]] (climb/decay/fame, code-verified). Fame-permanence door confirmed UNWIRED → engine.118 filed.
- 2026-08-29 (kimi) — 4b bullet now points at [[../research/2026-08-29-casino-ledger]], the consolidated design-question record serving this gate (watch; authorizes nothing). No gate change.
- 2026-09-06 (research-build) — pipeline.58 CLOSED. Verified live: Nia Rook POP-01076 minted, in persona-map.json + .claude/agents/nia-rook; tonight's C105 article landed 4 real quotes (quotesLanded:4). Both halves stale-resolved, no new work needed.
- 2026-09-08 (kimi) — True-up to shipped reality: 4b casino ledger shipped live 2026-09-01 (S410, `d1220bfa`, direct builder sign-off; design/build archived at [[../archive/plans/2026-08-31-grok-casino-ledger]] + [[../archive/plans/2026-08-31-grok-casino-ledger-build]]). Phase 4 gate language marked superseded-as-gate and kept as history (4b bullet, principle 4, Terminals, acceptance #5, open question, §2.4 addendum). Added "Post-ship open items" §: (a) cast redraw cadence, (b) runner completion detection + mission-brief command cheatsheet, (c) undocked-market placement off-by-one (engine-sheet decision), (d) settlement-proof watch C107+. Companion record: [[../research/2026-08-29-casino-ledger]] Shipped status.
- 2026-09-08 (kimi, second pass) — Builder rulings recorded: cast RE-DECIDED to reseed every cycle run (3 new citizens per cycle; supersedes the 2026-08-15 persistent-cast model; Undocked_Standings is the continuity layer) with the three-part succession wiring gap named in open item (a); open item (b) marked SHIPPED (`3c481586` — runner completion detection + cheatsheets + undockedEpisode.test.js); open item (c) carries the priority note that the show was the casino's original subject; open item (e) added — fame/mobility loop target (top contestant at A's-player fame; nothing promotes on standings yet).
