---
title: SpaceMolt Citizen Agency and Oakland Cultural Phenomenon — research
created: 2026-07-27
updated: 2026-07-27
type: reference
tags: [research, citizens, media, active]
sources:
  - Mike-direct 2026-07-27 — Discord citizens are themselves; conversations affect them; SpaceMolt should become an Oakland obsession closer to a game show or reality television than a conventional sport
  - scripts/spacemolt-miner.js + logs/spacemolt/.miner-state.json — failed fixed-sequence Mags miner and current operational state
  - ecosystem.config.js §spacemolt-miner + live PM2 audit — former three-times-daily schedule; live entry disabled 2026-07-27
  - lib/personaProvider.js §citizenVoiceProvider — Discord read/write behavior
  - lib/wakePerception.js + scripts/citizen-wake.js — wake-parity citizen perception
  - docs/research/2026-07-04-voice-dial-sync-contract.md — existing live-self contract
  - docs/research/2026-07-06-citizen-loop-deepening.md — existing 24/7 loop and Discord findings
  - docs/plans/2026-05-31-autonomy-roadmap.md — citizen-autonomous Layer 3
pointers:
  - "[[../engine/archive/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
  - "[[2026-07-04-voice-dial-sync-contract]] — live self-state contract; do not duplicate it here"
  - "[[2026-07-06-citizen-loop-deepening]] — wake/exchange substrate this extends"
  - "[[../plans/2026-07-04-voice-dial-sync-contract-build]] — existing Discord write-back implementation"
  - "[[../plans/2026-05-31-autonomy-roadmap]] — Layer-3 autonomy umbrella"
---

# SpaceMolt Citizen Agency and Oakland Cultural Phenomenon — research

**Source:** Internal code/runtime audit and Mike-direct product clarification, 2026-07-27. SpaceMolt is not intended to behave like a conventional league sport. The closer analogy is a reality program or game show that Oakland becomes obsessed with: citizens follow the ship, imagine piloting it, discuss its personalities and outcomes, and may eventually place fictional in-world wagers through a separately designed casino system.

**What this addresses:** How a persistent Discord citizen such as Vinnie Keane can act in SpaceMolt as part of a continuing life, and how those external actions can become a shared Oakland cultural object without making the citizen a general-purpose sim search engine or treating raw third-party game activity as automatic canon.

**What it does (current verified state):** Vinnie is available in his Discord channel and his own replies are session-batched into the existing gated `Reflection_Intake` path, so conversation can affect his later disposition. His Discord read context remains thinner than his wake context: persona core + compact city orientation + recent private reflections, rather than the wake's live dials/trajectory, LifeHistory, relationships, sports, neighborhood texture, tensions, citizen card, and relevant Tribune perception. The disposition-cache file is named in his persona instructions but its contents are not injected by the Discord provider. Separately, SpaceMolt is a fixed Mags-only mining script, not a citizen capability or reasoning agent.

**Extraction — what's usable:**

- **Citizen, not chatbot → preserve the actual product model.** A voiced Discord citizen should know themself, perceive what reaches them, respond from their live state, and carry consequences forward. They do not need broad omniscient search; explicit Article promotion should become a grounded perception event for that conversation.
- **Wake-parity context → Discord read-side repair.** `lib/wakePerception.js` already defines the live self/world ingredients used by wakes, voicing, and citizen exchanges. Discord should assemble the relevant subset from that same mechanism rather than relying on a static persona core plus a file-path instruction the model cannot execute.
- **Conversation write-back already proves the consequence seam.** Citizen-only replies are buffered, triple-classified at the idle boundary, and enter `Reflection_Intake` as one gated session event. SpaceMolt reactions and promoted-Article reactions should reuse that subjective-to-gated path rather than write dials or LifeHistory directly.
- **Capability belongs to the citizen → do not couple game agency to Discord plumbing.** Mike's product rule may grant SpaceMolt access to citizens who have Discord presences, but the implementation should express a citizen capability keyed by POPID. Discord is one way to talk to the citizen; SpaceMolt is one thing the citizen can choose to do.
- **Reasoning instance + tools + attention → replace the dead state machine.** The legacy miner repeats `travel → mine → dock → sell` and cannot recover from a full-cargo/no-fuel state. A pilot needs bounded goals, live game-state perception, an allowlisted SpaceMolt toolset, recovery choices, action/cost limits, and a durable action log.
- **External fact → reviewed cultural event → world perception.** SpaceMolt API/MCP results are factual external activity, not automatically Oakland canon. A deterministic adapter should summarize exact actions/results into a staged event; a review gate decides what becomes a sim-facing cultural event.
- **Game-show/reality-program framing → media is the amplification mechanism.** The Bay Tribune can cover the pilot, setbacks, milestones, selection pressure, rivalries, public reaction, and the question of who might pilot next. Published coverage then reaches citizen wake perception and NotebookLM, allowing the obsession to persist without injecting raw game logs into every prompt.
- **Aspiration creates participation beyond the pilot.** Citizens can care because the ship represents status, adventure, civic pride, escape, technical skill, or the possibility of future selection. Eligibility, auditions, public voting, sponsorship, and pilot succession are candidate mechanics—not assumed canon—and should emerge from explicit rules and real ledger citizens.
- **Obsession needs measurable city surfaces.** Candidate consequences include citizen perception, conversation topics, newsroom assignments, cultural events, watch-party business activity, household reactions, and neighborhood texture. Each consequence must name its actual carrier rather than rely on a generic "popularity" score.
- **Fictional wagering is a separate economic lane.** If a casino/wagering ledger is approved, it can offer multiple bounded in-world wager types against validated SpaceMolt outcomes. The design must define event IDs, published odds, eligible citizens, stake caps, funding source, settlement, operator/business ownership, household/economic effects, auditability, and loss safeguards before any balances move.
- **One cultural source, multiple citizen relationships.** Most citizens need only follow, discuss, hope, criticize, or wager. A very small approved pool may aspire to pilot. Keeping spectators and operators distinct prevents every citizen from becoming an implausible autonomous game account.

**Not applicable / hazard:**

- **SpaceMolt is not a conventional sports-season extension.** Do not force it into baseball-style schedules, standings, team records, or the existing A's/Warriors digest buckets. Its primary form is serialized culture and participant drama; any shared sports-feed appearance would be a downstream media/event decision, not its source model.
- **The old miner is disabled live but still declared in configuration.** It was stranded with full cargo, zero fuel, 61 completed runs, zero ore mined, and a `no_fuel` error. Its PM2 entry was removed and the reboot registry saved on 2026-07-27, stopping the three daily runs; source and logs remain. `ecosystem.config.js` still contains a dormant declaration, so a future full ecosystem reload could restore it until that configuration cleanup is separately applied.
- **Do not promise mechanics before a current SpaceMolt tool inventory.** The repository proves login/status/travel/mine/dock/sell calls only. Competition, public leaderboards, ship transfer, refueling, pilot selection, spectator events, and other show mechanics require current MCP/API verification.
- **Raw third-party output must not become canon automatically.** API errors, repeated failed runs, mutable remote state, or model-written interpretation must be staged and provenance-marked. Published Articles and approved ledgers remain the narrative/canon authorities.
- **Do not let frequent Discord use swamp the citizen.** Existing session batching is the right unit. SpaceMolt actions also need bounded cadence and consequence caps so one highly interactive citizen does not consume the whole city's attention or dial movement.
- **A casino ledger is not authorized by mentioning it.** No Sheet/tab name, schema, business operator, legality, currency transfer, or citizen balance mutation exists yet. This research preserves the idea and its design questions; creation requires a dedicated plan and builder approval.
- **No real-money or user gambling.** The wagering concept is fictional activity among simulated citizens using in-world economic state only.

## Open questions

- Which current SpaceMolt MCP tools and game mechanics are available, and which actions can be performed safely by a bounded reasoning agent?
- Is the first account/pilot Vinnie, Mags, or a new citizen-owned account—and can the existing remote account identity be changed without losing legitimate history?
- What is the in-world presentation: live serialized broadcast, edited episodes, public mission coverage, competition for the pilot seat, or a hybrid?
- What makes an external action significant enough to stage as an Oakland event instead of remaining private game telemetry?
- How does Mike explicitly "promote" an Article or SpaceMolt event into a citizen's perception: Discord reply/command, dashboard action, or a shared perception queue?
- Which existing carrier should distribute approved SpaceMolt events to citizens and desks without hard-coding them as baseball/basketball?
- What are the eligibility and selection rules for citizens who aspire to pilot, and how are real POPIDs chosen without inventing entrants?
- Does wagering begin as narrative-only texture, or does the first version settle fictional stakes against household/citizen economic state?
- If economic wagering is adopted, what loss caps, affordability rules, operator oversight, fraud/error handling, and audit trail keep it causal without destabilizing the economy?
- What metrics prove "Oakland is obsessed" without replacing lived effects with one synthetic popularity number?

**Verdict:** `adopt` — preserve Vinnie as the reference persistent citizen, repair Discord to use wake-parity self context, and research a bounded SpaceMolt citizen-agency pilot whose validated actions can become a serialized Oakland cultural phenomenon. Treat the casino/wagering ledger as a promising but separately gated design lane inside that larger cultural system.

**Ignited plans:** none yet — existing voice/wake plans own their already-built contracts, but SpaceMolt cultural integration and any casino/wagering ledger need a new dedicated plan after the current tool inventory and builder decisions.

---

## Applications (living)

- 2026-07-27 — Corrected the product framing from conventional sport to serialized game-show/reality-program obsession; separated it from the sports-feed entry dashboard.

---

## Changelog

- 2026-07-27 — Initial extraction from the live Discord/wake/SpaceMolt audit and Mike's cultural-phenomenon clarification.
