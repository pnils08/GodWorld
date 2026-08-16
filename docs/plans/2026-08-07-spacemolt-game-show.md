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

**Cast model (Mags recommendation, carried from S360 session):** NOT a daily rotating pilot. A persistent cast of 2–4 named ledger citizens holds the seat; selection, succession, firings, and audition arcs are *events the news covers*. The daily waking citizens are the **audience** — they watch, argue, wager, and aspire. Spectators and operators stay distinct (research hazard: don't make every citizen an implausible game account).

**Architecture principles:**
1. **Adopt upstream, bound it — don't rebuild.** `SpaceMolt/commander` (MIT) is the pilot agent: mission-driven tool loop, OpenRouter support, context compaction, per-session state. `SpaceMolt/spacemolt-lib` (MIT) is the telemetry substrate: typed WS SDK, multi-account via one Clerk key, live events, local state cache. The dead miner is replaced by adoption + a bounding wrapper, not a from-scratch agent.
2. **External fact → staged event → review gate → sim perception.** Raw game output is never canon. Deterministic adapter (no LLM in the writer loop — buildWorldSummary precedent) summarizes each episode; a gate decides what becomes a sim-facing cultural event.
3. **Second instance of the played-events pattern, not a framework.** Sports is instance 1. This is instance 2 — generalize `sportsFeedContract` to exactly one new feed type (kimi review rule). The third instance forces the abstraction, not this one.
4. **Wagering is wholly ours.** No server-side wager/leaderboard tools exist — settlement is against verified adapter outcomes. Narrative-first; the casino ledger stays gated behind a dedicated design + Mike sign-off (research hazard: "a casino ledger is not authorized by mentioning it").
5. **One-shot jobs run from crontab, never pm2 `cron_restart`** (S360 moltbook lesson: pm2 re-fires every 30s tick in the matching window, mid-run SIGINT duplicates actions).

**Terminals:** research-build builds the Node/apparatus side (runner, adapter, gate plumbing); engine-sheet wires the sim side (feed type, ECL pool, any ledger); media runs coverage. Mike holds cast picks, show identity, and every gate flip.

---

## Phase 0 — Decisions + verification (research-build + Mike)

- **0.1 Account identity — DECIDED S360 (Mike-approved): fresh show account(s)** via `spacemolt-lib` multi-account (one Clerk key owns the fleet). The existing "Mags Corliss" account (Nebula Collective, home system Haven, ~1,581 credits, creds at `~/.config/spacemolt/credentials.json` — confirmed S360 audit) stays Mags' own; its history is 61 failed mining runs, not show material. Execution note for next session: verify how spacemolt-lib's Clerk-key auth coexists with the game's per-account register/login flow before minting cast accounts.
- **0.1b Audit facts binding the build (S360 agent audit).** The old miner's response parsing NEVER matched the server schema — 61 "completed" runs, 0 ores recorded ever, last successful sell logged 17 items at 0 credits; then 71 days of `no_fuel` (no refuel step existed). Rate limit is real: 60 public API req/min per IP, shared across the whole fleet — bounds both the episode runner and the adapter's polling. Both facts reinforce principle 1 (adopt typed upstream clients; never hand-parse response text again).
- **0.2 Commander adopt-verify.** Clone `SpaceMolt/commander`; run ONE bounded session on OpenRouter cheap tier against the live server: verify a turn-capped/one-shot mode exists (or wrap), action log capturable, cost per episode measured. Acceptance: one episode, durable log, cost number in hand.
- **0.3 Cast shortlist.** Mags shortlists 3–5 plausible real citizens from the ledger (age, neighborhood, arc fit — no invented entrants); Mike picks 2–4 and names the show. Blocks Phase 1 persona binding and all coverage.
- **0.4 Telemetry source pick.** Compare MCP `get_action_log`/`captains_log` vs `spacemolt-lib` event stream as the adapter's source; pick one, note the other as fallback.

## Phase 1 — Pilot infrastructure (research-build)

- **1.1 Bounded episode runner.** Wrapper around commander: crontab-scheduled, one mission per episode, turn + cost caps, recovery-aware (the old miner stranded full-cargo/no-fuel; missions must include refuel/repair authority), durable per-episode JSON in `logs/spacemolt-show/`. Cadence decision: episodes per week (open question — tie to cycle rhythm, not wall-clock enthusiasm).
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
- [ ] Episode cadence: per cycle, per wake-day, or weekly? (Cost + narrative pacing trade; measure 0.2's cost number first.)
- [ ] Does the audience wake-day participation need any mechanic beyond perception + ECL (e.g., a "watched the episode" LifeHistory event), or is texture enough for v1?

## Changelog

- 2026-08-07 — Initial draft (S360, research-build). Ignited by Mike-direct game-show direction; research basis + upstream org audit same day. Moltbook restart-storm fix shipped same session (crontab lesson baked into principle 5).
- 2026-08-07 — 0.1 DECIDED (S360, Mike-approved): fresh show accounts, Mags account stays hers. 0.1b audit facts added. Next session opens on Phase 0 execution: cast shortlist (Mags, from ledger), commander adopt-verify (cheap OpenRouter, produce cost-per-episode), show name + cast picks (Mike).
- 2026-08-15 (kimi) — Phase 0 packet delivered (`output/kimi/spacemolt-phase0/`): 0.2 READY-WITH-WRAPPER, 0.4 WS event stream picked, 0.1 auth flow resolved; live verify episode held for Mike's go. Cast shortlist filed; surfaced the cultural-figure ledger gap. **Mike-direct 2026-08-15: cultural figures get full ledger citizenship** — every CUL-* figure resides in Oakland with a compatible neighborhood, pay, BIZ-ID employer where available, and living status; they live, not just appear. Binding engine-sheet work: mint/complete ledger rows for GameGirl Gia (CUL-1CFF5139) and Pixel Pete (CUL-BEF5B8CE) at minimum; generalizes to all 39 wd-cultural cards.
- 2026-08-15 (kimi) — **Mike decisions: show name is UNDOCKED; SpaceMolt exists in-world as a business and Undocked is its flagship program** (broadcaster open question resolved — the show airs as SpaceMolt's own channel, not a Civic or Tribune asset). Mike approved the live verify episode (0.2 acceptance run) same day. Forward direction (Mike-direct): a new engine fires SpaceMolt episode events to participants and the city, entered through the evening-events engine — supersedes parts of Phase 2/2.3 wiring when engine-sheet specs it.
- 2026-08-15 (kimi) — **0.2 acceptance PASSED.** Verify-002: pre-minted account (Clerk registration-code path, Mags account untouched), pre-seeded credentials, 10-min SIGINT cap, deepseek-chat. Full mission loop: mine → sell 206cr → refuel-from-critical → relaunch; durable log (`output/kimi/spacemolt-phase0/verify-episode-002.log`); measured cost ≈ $0.20–0.40 per 10-min episode uncached. Verify-001 established the registration-gate failure mode (agent self-registering = episode burned; runner must pre-seed). Kimi's harness now carries the SpaceMolt MCP (213 tools) via shared `.mcp.json`; stored April credentials re-verified live. Phase 0 fully closed except Mike's cast picks (0.3) — shortlist at `output/kimi/spacemolt-phase0/cast-shortlist.md`.
- 2026-08-15 (research-build) — Cast selection redesigned to RANDOM lottery (Mike-direct), not curated shortlist — supersedes 0.3 + Cast model section; routed to kimi to design the mechanic.
- 2026-08-15 (research-build) — CUL/POPID gap quantified: 21 of 46 `Cultural_Ledger` rows have no POPID link, real denominator is 46 not 39 — full list in commit body.
