---
title: SpaceMolt Game Show — Oakland's Serialized Obsession
created: 2026-08-07
updated: 2026-08-07
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

**Cast model (lottery-based — Mike-direct 2026-08-15, supersedes the S360 curated-shortlist model):** NOT a daily rotating pilot, and NOT a curated cast. A persistent cast of 2–4 ledger citizens holds the seat, chosen by **deterministic lottery** among eligible citizens — the excitement IS the randomness: any citizen can be pulled in. Succession, firings, and audition arcs remain *events the news covers*; only the initial-pick mechanism changes. The daily waking citizens are the **audience** — they watch, argue, wager, and aspire. Spectators and operators stay distinct (research hazard: don't make every citizen an implausible game account).

**The feedback loop (the point of the show):** episode performance → coverage → standing → more coverage. The deterministic adapter scores each episode (credits delta, combat outcomes, deaths, achievements, mishaps, `captains_log` color) and stamps a magnitude; approved episode events drive Tribune coverage and ECL audience lines; coverage is ingested Saturday into `Citizen_Media_Usage`/`Storyline_Ledger`; a cast member's rising media usage raises their standing and their future coverage likelihood across the sim. A random dishwasher becomes a city figure through measured play, not authored fiction.

**Lottery mechanics:**

- **Eligibility filter (v1, deliberately wide):** living adult ledger citizens currently residing in Oakland. Excludes minors, the traded/dead/moved-away (legacy-ledger categories), and sitting elected officials. Tribune staff stay eligible — the coverage-firewall gag is texture, not a blocker. Filter computes from ledger fields only; no judgment calls at draw time.
- **Draw mechanism:** deterministic seeded RNG. Seed = show identifier + draw sequence number + cycle; input = the frozen eligible-POPID snapshot; output = 2–4 cast members plus a ranked alternate list that feeds succession. Seed, snapshot, and result are all recorded so any draw is reproducible and auditable. Code draws; the newsroom narrates.
- **Mike approves the eligibility filter and draw parameters — never individual names; the draw decides.** Routing: the proposal goes to research-build, who takes it to Mike — rb does not decide policy solo. Build execution between decisions does not wait on step-by-step Mike direction (Mike-direct 2026-08-15, clarified same day: execution pace only, not build authority).

**Architecture principles:**
1. **Adopt upstream, bound it — don't rebuild.** `SpaceMolt/commander` (MIT) is the pilot agent: mission-driven tool loop, OpenRouter support, context compaction, per-session state. `SpaceMolt/spacemolt-lib` (MIT) is the telemetry substrate: typed WS SDK, multi-account via one Clerk key, live events, local state cache. The dead miner is replaced by adoption + a bounding wrapper, not a from-scratch agent.
2. **External fact → staged event → review gate → sim perception.** Raw game output is never canon. Deterministic adapter (no LLM in the writer loop — buildWorldSummary precedent) summarizes each episode; a gate decides what becomes a sim-facing cultural event.
3. **Second instance of the played-events pattern, not a framework.** Sports is instance 1. This is instance 2 — generalize `sportsFeedContract` to exactly one new feed type (kimi review rule). The third instance forces the abstraction, not this one.
4. **Wagering is wholly ours.** No server-side wager/leaderboard tools exist — settlement is against verified adapter outcomes. Narrative-first; the casino ledger stays gated behind a dedicated design + Mike sign-off (research hazard: "a casino ledger is not authorized by mentioning it").
5. **One-shot jobs run from crontab, never pm2 `cron_restart`** (S360 moltbook lesson: pm2 re-fires every 30s tick in the matching window, mid-run SIGINT duplicates actions).

**Terminals:** research-build builds the Node/apparatus side (runner, adapter, gate plumbing); engine-sheet wires the sim side (feed type, ECL pool, any ledger); media runs coverage. Mike holds eligibility-filter/draw-parameter approval, show identity, and gate flips — reached THROUGH research-build, who carries proposals to him; build execution does not wait on step-by-step Mike direction (Mike-direct 2026-08-15, clarified: pace only). The 4b casino-ledger sign-off stays Mike-only.

---

## Phase 0 — Decisions + verification (research-build + Mike)

- **0.1 Account identity — DECIDED S360 (Mike-approved): fresh show account(s)** via `spacemolt-lib` multi-account (one Clerk key owns the fleet). The existing "Mags Corliss" account (Nebula Collective, home system Haven, ~1,581 credits, creds at `~/.config/spacemolt/credentials.json` — confirmed S360 audit) stays Mags' own; its history is 61 failed mining runs, not show material. Execution note for next session: verify how spacemolt-lib's Clerk-key auth coexists with the game's per-account register/login flow before minting cast accounts.
- **0.1b Audit facts binding the build (S360 agent audit).** The old miner's response parsing NEVER matched the server schema — 61 "completed" runs, 0 ores recorded ever, last successful sell logged 17 items at 0 credits; then 71 days of `no_fuel` (no refuel step existed). Rate limit is real: 60 public API req/min per IP, shared across the whole fleet — bounds both the episode runner and the adapter's polling. Both facts reinforce principle 1 (adopt typed upstream clients; never hand-parse response text again).
- **0.2 Commander adopt-verify.** Clone `SpaceMolt/commander`; run ONE bounded session on OpenRouter cheap tier against the live server: verify a turn-capped/one-shot mode exists (or wrap), action log capturable, cost per episode measured. Acceptance: one episode, durable log, cost number in hand.
- **0.3 Lottery cast selection (Mike-direct 2026-08-15; supersedes the curated shortlist + Mike-picks design).** Build the eligibility filter and seeded draw per the Cast model section; run the opening draw; drawn citizens become the Phase 1 persona bindings. Mike approves filter + draw parameters (brought to him by research-build); no individual approvals — the draw decides. The kimi shortlist (`output/kimi/spacemolt-phase0/cast-shortlist.md`) is retained as an illustration of cast-role spread only — it is not a selection source.
- **0.4 Telemetry source pick — DECIDED (2026-08-16, research-build).** `mcp__spacemolt__get_action_log` is the source: server-side, category-filtered (mining/trading/combat/navigation/etc.), exactly the fact categories 2.1 needs. Verified live: local per-episode JSON (`output/spacemolt-show/episodes/*.json`) has no result/outcome data, only `tool_call`/`tool_error`/`turn_end` events (commander's own log, not the server's record) — parsing it for facts was the wrong plan. `.mcp.json` wires spacemolt server-wide, not kimi-specific; pilot credentials exist per-session at `output/kimi/spacemolt-phase0/commander/sessions/undocked-pop{ID}/credentials.json`. Query window bounds from `startedAt`/`endedAt` in the local per-episode JSON. `captains_log_list`/`captains_log_get` (same session_id) is the subjective-color source — quoted, provenance-marked, never treated as fact.

## Phase 1 — Pilot infrastructure (research-build)

- **1.1 Bounded episode runner.** Wrapper around commander: crontab-scheduled, one mission per episode, turn + cost caps, recovery-aware (the old miner stranded full-cargo/no-fuel; missions must include refuel/repair authority), durable per-episode JSON in `logs/spacemolt-show/`. Cadence DECIDED (2026-08-16, Mike sign-off): one episode per cycle, rotating across the live cast. Real pilot cost (~$0.13, 78 turns, exit 0, under the 10-min cap) makes cost a non-issue — the constraint is narrative pacing per "tie to cycle rhythm," and per-cycle lines up with the existing Saturday coverage-ingest window rather than adding a second clock.
- **1.2 Pilot voice binding.** Mission briefs written in-world (the cast citizen's goals, in their register); `captains_log` entries as the pilot's own narrative record (cheap model). This is the show's raw character material — the adapter carries it as *quoted subjective color*, provenance-marked, never as fact.

## Phase 2 — Adapter + staged events (research-build adapter; engine-sheet sim wiring)

- **2.1 Deterministic adapter.** Per-episode JSON → staged episode summary: credits delta, systems visited, combat results, cargo, mishaps, captain's-log excerpts. Facts only, provenance-marked, no LLM.
- **2.2 Review gate + feed.** Staged summaries land in a gated intake (same subjective-to-gated shape as `Reflection_Intake`); approved events ship as the second played-event feed type. Engine-sheet wires the feed into cycle intake.
- **2.3 Audience surfaces.** New ECL pool (e.g. `culture.spacemolt-show`): watch-party lines, argument lines, aspiration lines — rides the pool + conditions DSL machinery just proven in engine.79/97 (this can be proving-ground #3 for exclusive-pool policy later). Followers' wake perception picks up approved events via the existing carrier — no raw game logs in prompts.

## Phase 3 — Coverage lane (research-build designs; media runs)

- **3.1 Tribune show beat.** Episode recaps, pilot arcs, succession pressure, audience reaction — assigned through existing dispatch machinery. Canon door stays Sat-edition-only (PIN rule). Sports-desk framing explicitly forbidden (research hazard): this is culture/serialized drama, not a league.

## Phase 4 — Wager lane (gated, sequential)

- **4a Narrative-only (first).** Wager texture in the ECL pool + letters — citizens talk stakes, no balances move. Runs ≥2 cycles before 4b is even designed.
- **4b Casino ledger (NOT authorized by this plan).** Requires its own design doc + Mike sign-off: event IDs from adapter outcomes, published odds, eligible citizens, stake caps, funding source, settlement at cycle fire, household economic effects, audit trail, loss safeguards. Feeds grudge/ambition typing downstream. In-world money only — no real-money anything, ever.

---

## Acceptance criteria

1. One unattended scheduled episode completes under its cost cap with a durable action log (no-manual-demos rule: the acceptance run is the scheduled one).
2. Adapter emits a staged episode event with provenance; zero sim writes without gate approval.
3. First approved episode event surfaces in ≥1 citizen wake AND a Tribune piece within the same cycle window.
4. `culture.spacemolt-show` pool draws in Content_Telemetry.
5. Phase 4a lines draw; 4b remains unbuilt until its own sign-off.

## Open questions

- [ ] In-world broadcaster: who *airs* the show in Oakland — an existing business entity (Civis Systems? a media house?) or a new minted business? (Shapes coverage voice + a possible sponsor thread; decide with Mike at Phase 0.3.)
- [x] Episode cadence — **DECIDED per cycle, rotating cast** (2026-08-16, Mike sign-off on rb's recommendation; see 1.1).
- [ ] Themed special weeks (Mike-direction 2026-08-16): full special-event weeks around holidays and city moments once the base loop is locked in — a cadence variant, not a new mechanism. Revisit after the first cycles prove ingestion → coverage → feedback. The casino era spawning from the show remains Phase 4b: its own design doc + Mike sign-off, unchanged.
- [ ] Does the audience wake-day participation need any mechanic beyond perception + ECL (e.g., a "watched the episode" LifeHistory event), or is texture enough for v1?

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
- 2026-08-16 (research-build) — 0.4 telemetry source decided (get_action_log, verified live). Phase 2.1 adapter assigned to grok — real spec now buildable, was blocked on this.
