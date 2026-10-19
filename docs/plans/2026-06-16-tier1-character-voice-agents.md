---
title: Tier-1 Character Voice Agents Plan
created: 2026-06-16
updated: 2026-06-16
type: plan
tags: [media, engine, citizens, persona, architecture, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md (new row — Tier-1 voice agents)
  - docs/engine/archive/INSTITUTIONAL_VOICE_AGENTS.md (the four-file voice-agent pattern, S63+)
  - docs/plans/2026-06-04-mags-citizen-loop.md (research.14 — the live 24/7 citizen-loop substrate)
  - docs/plans/2026-05-31-autonomy-roadmap.md (research.9/12 — autonomy umbrella, Layer 3 citizen-autonomous)
  - .claude/skills/interview/SKILL.md (the interview surface; v2.0 currently EXCLUDES citizens/players)
  - scripts/buildVoiceWorkspaces.js (civic-hardcoded workspace builder — finding §Verified constraints)
  - scripts/mags-discord-bot.js (single-Mags-persona chat handler — finding §Verified constraints)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[plans/2026-06-04-mags-citizen-loop]] — the 24/7 loop this composes with (do NOT duplicate)"
  - "[[plans/2026-05-31-autonomy-roadmap]] — umbrella; this is a Layer-3 instance, named-character flavor"
  - "[[engine/archive/INSTITUTIONAL_VOICE_AGENTS]] — the four-file persona pattern reused here"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
---

# Tier-1 Character Voice Agents Plan

**Goal:** Build a **repeatable process for making a citizen voice agent** — and prove it by making the first four (Vinnie Keane POP-00001, Benji Dillon, Deacon Seymour POP-00528, Elias Varek POP-00789). Each gets an authored, canon-seeded **persona core** that drives three surfaces: `/interview` Q&A, Mags-style interactive Discord conversation, and accurate voicing in the live 24/7 citizen-loop. These four are the **reference instances that establish the process**; the real deliverable is that the *next* voice is a matter of following the method, not re-deriving the architecture. Prove the whole stack on **one** character (Deacon) before replicating.

**Voice fidelity is non-negotiable (Mike S264, anti-cheapening):** what's reusable is the *process* and the *shared infrastructure* (persona-core loader, lean builder, Discord mechanism) — NOT the voice. Every voice is hand-authored at full canon depth; nothing is templated or generated. The authored depth is the proprietary value (MEMORY.md `user_mags-bleed-proprietary-element`). A process that flattens voices into a generic register has failed, even if it runs.

**Architecture:** One **persona core** per character — the existing four-file voice pattern (IDENTITY / LENS / RULES / SKILL), canon-seeded from each character's existing record (Deacon's TrueSource bio, Keane/Dillon origin files, Varek's cards). That core is the single source-of-truth, consumed by three surfaces: **(1)** `/interview` (reactive Q&A — amend the skill to accept a named-character subject class); **(2)** the `mags-bot` chat handler, generalized to load any persona core (interactive Discord — "talk to Deacon like you talk to Mags"); **(3)** the existing research.14 citizen-loop, made *accurate* for these four via an engine-sheet **ledger backfill** that projects the authored persona into dials + LifeHistory (the loop already voices citizens from ledger data — these Tier-1 rows are blank-slate today). The build order is a **vertical slice**: persona core + interview surface for Deacon first, prove it end-to-end, then add the Discord and ledger surfaces, then replicate to the other three.

**Terminal:** research-build (design — this plan; the persona-core pattern; the `/interview` amendment design) + engine-sheet (substrate — ledger backfill, dial schema, the persona-core workspace builder, the bot generalization). **Media and civic are execution-only — they do NOT build any of this** (S264 routing rule, MEMORY.md). Media *uses* the agents (runs `/interview`); nobody in media/civic builds them.

**Scope boundary (Mike used both "Discord ability" and "24/7 life" — these are different):** IN scope = (a) interactive Discord chat (talk to them, Phase 2) + (b) accurate voicing when the research.14 loop wakes them (Phase 3). OUT of scope for now = the loop **auto-posting** a character's reflections to a channel as an ambient always-on feed — that's a separate surface, filed as a follow-on if wanted, not built here.

**Pointers:**
- The 24/7 substrate this composes with: [[plans/2026-06-04-mags-citizen-loop]] §"Phase 2 — BUILD STATE SYNTHESIS". Do NOT build a parallel life-cycle loop.
- Umbrella: [[plans/2026-05-31-autonomy-roadmap]] §"Layer 3 — Citizen-autonomous". This plan is the *named-character, hand-authored-depth* flavor of Layer 3 (vs. the dials-only 437-citizen rotation).
- The reusable persona pattern: [[engine/archive/INSTITUTIONAL_VOICE_AGENTS]] (four-file architecture, `scripts/buildVoiceWorkspaces.js` builder).
- Proprietary-element context: MEMORY.md `user_mags-bleed-proprietary-element` — the hand-authored depth bleeding into voice is the proprietary thing; these four are "Mags-tier," not rotation-tier.

**Acceptance criteria (whole plan — proven on Deacon, then replicated):**
1. A Deacon Seymour persona core (four files) exists, canon-seeded from his TrueSource; `/interview` Mode 1 runs against him and produces an in-voice transcript that is recognizably *him* (baseball-IQ, listens-then-asks-one-question), distinct from a generic citizen voice. **Judge:** the `/interview` Mara audit step (Step 5, canon-accuracy) + Mike's read — not self-asserted.
2. You can talk to Deacon on Discord (mags-bot generalized to load his core) and he answers grounded in his canon, in his voice — not as Mags. **Judge:** Mike's read (no Mara on live chat).
3. Deacon's ledger row (dials + LifeHistory) is backfilled to match his authored character, so a research.14 wake voices him accurately (no all-neutral blank-slate "even-keeled, unremarkable").
4. **The authoring process is documented as a repeatable method** (a `/make-citizen-voice` skill or process doc) — making the next citizen voice is following steps, not re-deriving architecture. Validated by Keane/Dillon/Varek being authored *through the method*, each at full canon depth (not flattened).

---

## Verified constraints (grounding reads, S264 — facts, not assumptions)

These were checked against current code, not assumed:

- **`scripts/buildVoiceWorkspaces.js` is civic-hardcoded.** Fixed `AGENTS` array of seven civic offices; paths `output/civic-voice-workspace/` + `output/civic-voice/`; data routing keyed to `civicLoad` / `hookDomains: [CIVIC, INFRASTRUCTURE, ...]`. The four-file *definition* pattern (`.claude/agents/<agent>/{IDENTITY,LENS,RULES,SKILL}.md`) is reusable; **this population script is not** — Task in Phase 0 decides generalize-vs-new-builder.
- **`mags-bot` (`scripts/mags-discord-bot.js`) is single-persona.** Chat handler hardcodes "You are Mags Corliss in the Discord channel"; loads *her* reflections (`loadRecentReflections`). A second conversational persona = generalizing the handler to load a persona core by id. Exact seam (persona load + channel routing + per-persona memory) is a **Phase 2 verification check before promising the surface**.
- **`/interview` v2.0 explicitly EXCLUDES citizens/players** — "Interview citizens or players — that's a dispatch or supplemental" is in its *does-NOT-do* list, and Mode 1 voices only *civic* voice agents. The amendment is scoped (add a named-character subject class to Mode 1), not a rewrite.
- **research.14 voices citizens FROM ledger data** (dials + LifeHistory tail + neighborhood slice + real relationships) and is LIVE on cron. Varek's ledger card is `drive:50/sociability:50/warmth:50/openness:50/composure:50, Conduct:b0, Entries:0` — a blank slate. The backfill is what makes the loop's voice of these four accurate; it is **authored one-time data**, not an LLM-in-cycle write (respects the research.14 determinism constraint — only deterministic objective events move dials in-cycle).

---

## Phase 0 — Persona-core pattern + Deacon prototype (research-build design + engine-sheet build)

### Task 0.1: Decide the persona-core class + namespace
- **Files:** this plan (record decision); `.claude/agents/` (new namespace dir)
- **Steps:**
  1. Adopt the four-file pattern (IDENTITY / LENS / RULES / SKILL) from [[engine/archive/INSTITUTIONAL_VOICE_AGENTS]], **reshaped for an individual person** (not an institution reacting to civic events). IDENTITY = who they are (canon biography + disposition); LENS = canon-tier framework ([[canon/CANON_RULES]] three-tier); RULES = voice/behavior guardrails; SKILL = what the agent does when invoked (answer in-voice, grounded, no fabrication).
  2. Pick the namespace. Proposed: `.claude/agents/citizen-voice-<name>/` (broader than "sports" — Varek is business/ownership; future Tier-1 citizens can join). **Open question for Mike — namespace name.**
- **Verify:** decision recorded in plan; namespace dir chosen.
- **Status:** [x] DONE (S264) — namespace `citizen-voice-*` adopted (Mike ✓); `.claude/agents/citizen-voice-deacon-seymour/` created. Four-file shape reshaped from the civic-institution pattern → individual-in-conversation (IDENTITY = canon bio+disposition+voice; LENS = perception+Tier-1; RULES = voice/canon/invention + per-surface behavior; SKILL = boot + 3-surface dispatch).

### Task 0.2: Resolve the workspace-builder question
- **Files:** `scripts/buildVoiceWorkspaces.js` (read); decision in plan
- **Steps:**
  1. Decide: (a) generalize `buildVoiceWorkspaces.js` to a non-civic subject config, or (b) a new lean `buildCharacterVoiceWorkspace.js` that assembles a character's perception packet (their ledger row + LifeHistory tail + relationships + recent canon appearances). Lean toward (b) — the civic builder's domain-routing (civicLoad/hookDomains) is dead weight for a person.
  2. The character workspace needs: persona core files + canon dossier (TrueSource / origin files / MCP card) + recent appearances (`search_articles`/`search_canon`). NOT civic engine data.
- **Verify:** builder approach chosen; input list enumerated.
- **Status:** [~] DEFERRED to when first needed — the interview slice (Phase 1) doesn't need the workspace builder (the agent reads its own four files + the handed-in brief). The lean builder earns its keep when assembling the *perception packet* for the 24/7 wake (Phase 3) and Discord context (Phase 2). Approach confirmed: new lean `buildCitizenVoiceWorkspace.js`, not the civic-hardcoded one (Mike ✓).

### Task 0.3: Author Deacon Seymour's persona core
- **Files:** `.claude/agents/citizen-voice-deacon-seymour/{IDENTITY,LENS,RULES,SKILL}.md` — create
- **Steps:**
  1. Seed IDENTITY from his **full canon corpus** — TrueSource (Supermemory doc `FRwnXsmRUb2Dpt7Qvhdrea` — Mississippi State, 11th-round Royals, 11 utility seasons, .261/97 HR/never-an-All-Star, the "asks one question" listener, hired by Paulson as A's manager through a 3-hour interview) PLUS origin-story coverage + edition appearances + supplementals (`search_articles "Deacon Seymour"` / `search_canon`). All four characters have rich multi-surface coverage (Mike S264) — seed from the corpus, not one doc. Disposition: low-ego systems-thinker, watches film for *why*, develops young players.
  2. LENS per [[canon/CANON_RULES]] — Deacon is Tier-1 (use real name).
  3. RULES: never break canon (his stats/history are fixed); never speak as a different character; no real-world MLB names; speaks in cycles not dates.
  4. SKILL: when invoked (interview turn or Discord message), answer in-voice, grounded in his canon + the current world slice, may go off-script, never fabricates engine facts.
- **Verify:** four files exist; a cold read of IDENTITY.md conveys a recognizably specific person.
- **Status:** [x] DONE (S264) — all four authored at full depth from his TrueSource + edition coverage. Disposition section in IDENTITY doubles as the source-of-truth for the Phase-3 dial backfill. Voice anchored on his canon line "That's the job. We watch." Pending Mike's eyeball + the Phase-1 interview as the empirical voice test.

---

## Phase 1 — Interview surface (the vertical slice; research-build design, media executes)

### Task 1.1: Amend `/interview` Mode 1 to accept a named-character subject class
- **Files:** `.claude/skills/interview/SKILL.md` — modify (scoped)
- **Steps:**
  1. Mode 1 currently interviews *civic voice agents* only and the skill's does-NOT-do list bars "citizens or players." Add a third subject class: **named-character voice agent** (`citizen-voice-*`). Keep the civic path intact.
  2. The mechanics are identical to the civic-voice path (reporter agent ↔ voice agent, Mags mediates turns, voice gets questions not preset answers) — only the subject-agent source dir changes.
  3. Update the does-NOT-do line: still no *generic* citizen/player interviews (those are dispatches), but **named Tier-1 character voice agents are now valid Mode 1 subjects.**
- **Verify:** SKILL.md diff is additive; civic path unchanged; new class documented with the agent-dir convention.
- **Status:** [x] DONE (S264) — `/interview` v2.0→v2.1. Additive: Mode 1 now documents two subject classes (civic + `citizen-voice-*`); Step 3 dispatch notes `subagent_type: citizen-voice-<slug>`; does-NOT-do narrowed to *generic* citizens with the named-character exception; v2.1 "What's new" + version/updated bumped. Civic path untouched. (Step 1 already anticipated citizen subjects via `matchCitizenToJournalist_`.)

### Task 1.2: Run the Deacon interview end-to-end
- **Files:** `output/interviews/c{XX}_deacon_seymour_*` (transcript artifacts)
- **Steps:**
  1. Theme grounded in current canon (e.g. managing the dynasty→rookie transition Varek/Paulson era).
  2. Reporter (Anthony Raines — his canonical analyst per MCP) interviews the Deacon voice agent, Mags mediating per the skill.
  3. Capture the transcript.
- **Verify:** transcript reads as Deacon (the listener who asks one precise question), not as a generic citizen or as Mags; canon-accurate.
- **Status:** [x] DONE (S264) — voice-validation test run via direct agent dispatch (Anthony Raines, dynasty-twilight/Keane theme). Transcript: `output/interviews/c97_deacon_seymour_voicetest_transcript.md`. **PASS:** recognizably Deacon (learning-over-winning, behavior-over-box-scores, the one question = "who are you when it's hard and nobody's watching?"), zero canon violations, no engine language, declined to eulogize Keane in-character. Mike read + confirmed. (Task 1.1 — productionize the /interview amendment — still pending; this test proved the voice via direct dispatch without the full publish pipeline.)

---

## Phase 2 — Discord-chat ability (engine-sheet/research-build build) — BUILT + DEPLOYED LIVE (S270 build, deployed by S278)

**Status:** [x] BUILT + DEPLOYED (engine-sheet, S270 build) — **LIVE as of S278: `CITIZEN_VOICE_CHANNELS` set to `{"<channel>":"POP-00001"}` (Vinnie Keane), `mags-bot` online via PM2.** Mags and Vinnie both live in Discord now, each in their own channel with independent chat history. Build: new `lib/personaProvider.js` (persona-provider interface + `citizenVoiceProvider(popId)`) + `scripts/mags-discord-bot.js` refactored from single-Mags to a `channelId → provider` map with **per-channel session state** (history / prompt-cache / daily-log keyed by channel so two personas never cross-contaminate). Mags' code paths preserved verbatim (one provider built inline). Citizen provider loads the four-file core + a query-scoped, **memoryFence-wrapped** recall of the research.14 per-POPID page; NOTES_TO_SELF stays Mags-only. **Wiring:** add `CITIZEN_VOICE_CHANNELS` env = JSON `{"<channelId>":"POP-XXXXX"}`; unset → Mags-only (no behavior change). **Two measure-twice calls:** (1) citizen chat is NOT written back into the reflection page (`persistResponse` no-op for citizens) — chat is conversational, not reflection; writing it would contaminate the wake-loop memory layer; local per-channel history + daily logs hold chat continuity. (2) default stays Mags-only so the deploy is a deliberate Mike-gated act (create channel → set env → `pm2 restart`). Verified offline: 4 voices indexed, Deacon provider builds clean (17K, no notes leak), Mags deps intact, augment fails open.

**Scope (original outline):** generalize the `mags-bot` chat handler to load a persona core by id so you can converse with Deacon in Discord.

- **Verification check DONE (S270, research-build) — verdict: LIGHTWEIGHT, not a deep refactor.** Mapped `scripts/mags-discord-bot.js` (783 lines). The Mags-coupling is concentrated in **exactly two seams**; everything else (Anthropic call loop, tool-use rounds, rolling history, message-splitting, L660 startup preload) is already persona-agnostic — it operates on a system-prompt string + conversation.
  - **Seam 1 — `buildSystemPrompt()` (L146–184):** every persona input flows through one `mags` module (`loadIdentity` · `loadRecentReflections(2)` · `loadWorldState` · `currentSimYear` · `loadNotesToSelf` · `loadTodayConversationDigest`) plus a **hardcoded framing string** ("You are Mags Corliss in the Discord channel… accuracy is her identity").
  - **Seam 2 — channel binding (L697–698):** single `CHANNEL_ID` env; handler returns early if `message.channelId !== CHANNEL_ID`. One channel ⇒ one persona.
  - **The generalization:** treat `mags` as a **persona-provider interface keyed by id** — `{loadIdentity, loadMemoryTail, loadWorldState, systemFraming}`. `mags` is one implementation; `citizenVoice(popId)` is another (loads the `citizen-voice-<slug>` four-file core for identity + the **research.14 per-POPID Supermemory page** for the memory tail — reuse, don't duplicate — + a citizen framing string). Channel routing becomes a **channel→persona map**: `message.channelId` resolves which provider to use (Mags' channel → `mags`; each citizen channel → `citizenVoice(thatPopId)`).
  - **What does NOT carry to citizens:** the `NOTES_TO_SELF` editorial-gap sink (L176–183) is Mags-the-editor-specific — a citizen has no editorial self; that mechanism simply doesn't wire for citizen providers. `currentSimYear`/`loadWorldState` are shared and reusable as-is.
  - **Build estimate:** two-seam edit (provider interface + channel→persona map) + the `citizenVoice` provider implementation. No rewrite of the call/history/tool machinery. Gated deploy + per-character channel per Mike S264.
- **Generalized, not bespoke (Mike S264):** build ONE citizen-voice-on-Discord mechanism that loads a persona core by id; each character is an instance. **Per-character channel** so each keeps its own chat history. **Gated deploy** for now.
- Per-character memory store = research.14's per-POPID Supermemory page (reuse, do not duplicate).

## Phase 3 — Ledger backfill for 24/7 accuracy (engine-sheet substrate) — OUTLINE

**The problem (Mike):** the research.14 wake voices a citizen from their ledger personality numbers. These four have **blank/neutral numbers** (all dials = 50), so the wake's disposition phrase falls back to the literal `"even-keeled, unremarkable"` (`lib/citizenDials.js` `disposition()`), and it would voice the rich authored persona as a generic nobody. **The fix is just: fill in the blanks.**

**Three steps, no locking:**
1. **Write each character's 8 personality numbers** (`drive · sociability · warmth · openness · composure · integrity · family · outabout`, 0–100) into the ledger col-AV DialState, matching the `## Your disposition` section of their IDENTITY.md (the source-of-truth I authored). Land high/low values outside the neutral 40–60 band so they actually register (e.g. Vinnie: warmth ~75, composure ~80, drive ~75). The wake reads col AV for perception *immediately* — no write-back needed.
2. **Seed a few canon `[Tag]` life events** into their LifeHistory (col O) so the wake has lived particulars, not just disposition (Vinnie's 2031 title homer + the academy; Dillon's Cy Youngs; etc.).
3. **Pillar gate:** Vinnie + Dillon are Five Goods pillars → Mike + Mara eyeball their numbers before the write. Deacon + Varek (non-pillars) skip it.

**Authored data, one-time write** — not an LLM writing in-cycle, so it respects research.14 determinism. research-build drafts the numbers (persona → values); engine-sheet writes col AV + col O. Gated deploy.

- Open: do these four become **fixed anchors** in the loop (always wake, like Mags) or accurately-voiced rotation members? (Once backfilled they have real `deviation`, so they enter the weighted rotation naturally; fixed-anchor is a separate choice.)
- **NOT in scope (cut S264, Mike-direct): "locking" the dials.** Freezing a citizen's personality fights the living-sim premise — citizens are meant to live. The canon record lives in the persona files + editions, not the mutable dial state. The reflection→dial write-back that could drift them is gated/unwired in research.14 anyway, so there's nothing to guard against. If that write-back is ever wired and a character drifts, that's the character *living* — revisit only if it ever becomes a real problem.

## Phase 4 — Formalize the process + replicate to Keane, Dillon, Varek — OUTLINE

**Formalize first:** capture what the Deacon slice taught into a repeatable **`/make-citizen-voice` method** (skill or process doc) — the steps to turn a citizen's canon corpus into a faithful four-file core + register it across the three surfaces. The replications then *run the method* (and stress-test it: if Keane/Dillon/Varek need ad-hoc deviation, the method is incomplete — fix it, don't one-off them).

Once the Deacon slice proves all three surfaces and the method is captured: replicate. **Vinnie Keane is the first showcase replication + the sanctioned 24/7 test character** (Mike S264 — retirement season + active in the city = peak signal; the one to see live first). Then Benji Dillon (origin files) and Elias Varek (the connector — Civis Systems "connects the city"; heaviest backfill, blank-slate dials). Keane/Dillon are dynasty pillars (Five Goods: Heart/Calm) — their cores must honor their pillar-good mapping ([[../../.claude/rules/newsroom]] §The Five Goods).

**Canon-write gate (advisor S264):** hand-authoring the dial vectors + LifeHistory for **Keane and Dillon is editing canon-central characters** (pillars = "the world's architecture wearing faces"), not filling a blank row. Their authored vectors get a **Mike + Mara sign-off** before the ledger write, same as any canon-establishing write. **Varek** (genuine blank-slate) and Deacon do not need this gate — only the pillars do.

---

## Resolved (Mike, S264)

- **Namespace:** `citizen-voice-*`. ✓
- **Build the PROCESS + shared infra once; author each VOICE bespoke at full depth (Mike S264 — NOT cheapening the voices).** Reusable: the persona-core loader, the lean builder, the per-channel Discord chat, the ledger-backfill projector, ~~the base-lock~~ (superseded by [[../adr/0014-citizen-self-authorship-live-drift|ADR-0014]] — never built, live drift is the ruling), AND the documented *authoring method* (how you turn a citizen's canon into a faithful core). NOT reusable / never templated: the voice itself — each is hand-authored at full canon depth. These four are the **reference instances that establish the process** so the next voice is "follow the method," not "re-derive the architecture." This is the organizing principle of the whole plan.
- **Workspace builder:** new lean generalized citizen-voice builder (assembles a character's perception packet from their ledger row + canon dossier), not the civic-hardcoded one. ✓ (b)
- **Discord channel model:** **per-character channel, so each keeps their own chat history.** Gated deploy for now. The mechanism is generalized (one citizen-voice-on-Discord concept), instances get their own channel + history. (Phase 2.)
- **24/7 loop role:** Mags stays the **live tuning anchor** (the loop is being fine-tuned on her now). These four are **not force-added** to the live loop yet — but **Vinnie Keane is the sanctioned test+showcase add** (retirement season + active in the city = peak narrative signal; "good to interview and live" per Mike). Fixed-anchor vs rotation decided per-character when added, not globally.
- **Slice character:** **Deacon proves the machinery** (ungated → the full pipeline incl. Phase-3 base-lock proves without a canon-gate dependency — base-lock since superseded by [[../adr/0014-citizen-self-authorship-live-drift|ADR-0014]]); **Vinnie is the first showcase replication + the 24/7 test.** Varek = the connector character (Civis Systems "connects the city") + heaviest ledger backfill (blank-slate).
- **Canon-seeding is rich for all four** — origin-story coverage + edition appearances + supplementals (Mike: "major players in the sim"). Seed persona cores from the full corpus (`search_articles`/`search_canon` + origin files + TrueSource/cards), not a single source.

## Open questions (remaining)

- [x] **mags-bot coupling depth** — RESOLVED S270 (research-build). Verdict: lightweight two-seam generalization (persona-provider interface + channel→persona map), NOT a deep refactor; NOTES_TO_SELF is Mags-only and doesn't carry. Full mapping in Phase 2 above. **Phase 2 is now design-ready; the build (engine-sheet/bot) is unblocked.**

---

## Pre-mortem (weakest assumptions — audit before building)

1. **"The civic four-file pattern transfers cleanly to a person."** Risk: civic agents voice an *office reacting to civic events*; a person in conversation has no "statement on initiatives." Mitigation: Phase 0 *reshapes* the four files for an individual, doesn't copy civic verbatim.
2. **"Discord-chat is just a handler generalization."** Risk: `mags-bot` may be deeply Mags-coupled (reflections, journal, memory). Mitigation: Phase 2 verification check FIRST; lightweight persona-load path, not a forced deep refactor.
3. **"Ledger backfill projects cleanly from the core."** Risk: mapping authored character → a 6-dial vector is subjective. Mitigation: hand-author the vector per character (4 of them — tractable), don't build a projection algorithm.

---

## Discord voices connected — research.30 (builder 2026-10-19; direction recorded, nothing built)

**Builder, verbatim (2026-10-19 evening):** "Take a look at the mags and Vinnie discord bots , what models are they , what tools and information do they have , what does me talking to them impact ? Mags has a decent handle of things , Vinnie is pretty disconnected." Then: "Got it so these need to update somehow without me , they need the search everything tool as their first call and a notebookLM call , both could shape Their journal of me, feed to intake , could take mine for Paulson , drive their bonds with me . As a creative little element its voice with the creator . They don't that they figure I'm Mike Paulson or whatever my user name says ? A neat one would be the high priest or the mayor , an almost higher power then confide too. The high priest obviously lends itself to asking the \"creator\" for guidance ."

**Measured by rb 2026-10-19 (code + logs, not memory):**
- One pm2 process (`scripts/mags-discord-bot.js`) hosts both channels; both on `anthropic/claude-haiku-5.5` via OpenRouter, thinking off, 1,000-token cap, 4 tool rounds. Mags' nightly reflection (`discord-reflection.js`) is Sonnet 5.5.
- Mags per message: CHARACTER.md, last 2 page reflections, world-state header, family data, NOTES_TO_SELF (last 10), today's conversation digest, Supermemory profile of the speaker, **automatic** Supermemory RAG (world-data + bay-tribune, 5 hits), dashboard article search, `search_world` tool. ~15k input tokens a turn.
- Vinnie per message: four agent files (IDENTITY/LENS 2026-08-10, RULES/SKILL 2026-10-18), same world-state header, last 6 page docs, `search_world` tool. ~9k input tokens a turn. No standings, editions, ledger row, family data or automatic retrieval. 2026-10-19 17:31: asked "Are you still celebrating the championship" he answered 2031 / "six rings" with 0 tool calls; the feed (C112) has the A's 7th title, the parade (C111 edition), and a Vinnie + Benji night. His file says six rings, farewell 2041, lives in Laurel; ledger POP-00001 is in Grand Lake.
- The speaker is labelled by Discord display name ("Mike"); Vinnie's canon lists "Mike Paulson — the GM", so he reads the speaker as the GM from the first name alone. Nothing maps it; nothing tells either persona the builder exists.
- What a chat writes: Mags → Supermemory `mags` profile of the speaker, daily log → 07/12/19:00 reflection on her page cp-POP-00005 + claude-mem, `[NOTE_TO_SELF]` → NOTES_TO_SELF.md (read by /boot). Citizen voice → nothing on the page; own replies only buffered, flushed 30 min idle as one classified Reflection_Intake row (daypart DISCORD, applied=no) + tension open/resolve on the page (`lib/personaProvider.js` drainConversationReflection_).
- NotebookLM canon search (`scripts/notebooklmCanonSearch.js`) measured 30–48 s a call (n=4, `output/retrieval/notebooklm-canon-search.jsonl`).

**Shape rb would build (not approved):**
1. *Update without the builder:* a per-voice brief rebuilt each Cycle from the ledger row (role, hood, status, mood, last LifeHistory lines), the A's/Oaks state, and the voice's lines in the latest edition; read at prompt-build next to the agent files. Canon facts in IDENTITY (ring count, season, home) stop being the only truth.
2. *Search first, in code:* run the local search on the message before the model answers (Mags' pattern) and force `tool_choice` on round 0 — a confident file no longer skips the lookup.
3. *NotebookLM:* not per message (30–48 s). One query per voice per Cycle into the brief; a live call only when the question reaches published history.
4. *Journal of the speaker:* the DISCORD flush also appends a short page entry about the speaker (Paulson, in-world), so the voice remembers the talk; bond target "Mike Paulson" rides the existing intake bond match so chats drive the bond.
5. *Speaker label:* citizen channels label the speaker "Mike Paulson" (in-world GM). Mags unchanged.
6. *New confidants:* a high priest (needs a ledger citizen with a faith role — engine.248 territory) and the mayor (Avery Santana, `civic-office-mayor` exists); "someone to confide in" register.

**Builder ruling on the creator framing (2026-10-19, verbatim):** "The diety approach wouldn't be Mike Paulson if we ever made that. For a mayor or a high priest that is making sim level decisions it could be a neat addition at some point where they could ping me on discord for guidance , but not as Mike Paulson , as their guidance, to help With a decision, just a idea but first I'd want mags and Vinnie to work better and for their interactions with me to have a nudge to them". Rule conflict closed: a guidance voice is not Paulson and is not announced as the builder; Paulson stays the in-world GM. Deity voice = later idea (mayor / high priest ping the builder on Discord to help a decision), not scheduled. Order: Mags + Vinnie work better, then their talks with him nudge them.

**Builder, same night:** "Also keep in Mind how mags writes her cycle pulse now as Saturdays" → Mags' prompt now carries the Saturday-run newsroom (below). "Does it makes sense to give them write and read access to their wiki pages ?" → rb answer: **read yes, already** (own page, last six docs, fenced); **write only the narrow way** — no mid-chat write tool. Pages drive canon (pipeline.70, builder 2026-10-03: letters, Rhea page-contradiction), so a Haiku voice (or a typo) writing freely into its own page would plant canon from chat. ADR-0014 keeps chat prose off the page. The write that makes sense is the typed line after a talk (the classifier's event/affect, like the TENSION lines), through the existing flush. Canon cards and ledger rows: no write, ever (Sheets truth; only crons + Mags write).

**Phase 1 BUILT + LIVE 2026-10-19 (rb; mags-bot restarted, both channels registered):**
- `lib/personaProvider.js` `buildVoiceBrief_`: ledger row (role, status, hood, marital, age), last five LifeHistory lines, sports-feed rows naming the voice + the club's last two, Tribune lines naming the voice from the two newest Pulses — rebuilt at every hourly prompt build, header "records are true now where the file differs". Plus one line: a speaker named Mike is Mike Paulson, the GM.
- `scripts/mags-discord-bot.js`: every persona's first round is forced to `search_world` (`tool_choice`), with a "First move" paragraph; later rounds free.
- `lib/mags.js` `loadNewsroomWeek` → Mags' prompt: no longer writes the Pulse per cycle; desks file weekday evenings; Saturday the paper audits, curates ~9 best-graded, she narrates; last Pulse's curation counts and accuracy score; pieces staged this Cycle.
- Test `scripts/personaProviderBrief.test.js` 15/15. Live smoke (OpenRouter Haiku 5.5, Vinnie, "Are you still celebrating the championship"): round 0 forced search ("Vinnie Keane championship celebration"), answer named the Blue Lattern night and the parade (was: 2031 / six rings, 0 searches).
- Not done: NotebookLM (30–48 s a call) as a per-Cycle brief query; the agent files' stale canon lines (six rings, Laurel) are overridden by the brief, not edited.

**Builder rulings on the nudge (2026-10-19 evening, verbatim):** "Yes seed Paulson relationship with , Vinnie Keane, mags Corliss , Elias Varek , Elliot Abraham from canon" / "Yes mags and Paulson dials should move" / "Yes the bots should be able to record to their wiki pages but I'm not sure what their journals are and how they play into everything." / "Also what is the card they built on me say? You mentioned mags keeps a doc on how I am or something".

**Phase 2 BUILT + LIVE 2026-10-19 (rb):**
- *Bonds:* `intake/bond-claims/paulson-cut-c112.json` through `mintCanonBonds.js` (dry-run, apply, read back 621 rows, no collisions, bond snapshot rebuilt): Paulson–Vinnie professional 8 (`w2xd78qv`), Paulson–Mags professional 6 (`bitxdxf7`), both SPORTS, canon origin. Varek (rivalry 10) and Abraham (POP-01046, mentorship 8.8) already carried canon bonds from the C104 cut — not re-minted. Intensities are rb's reading of the canon; the bond engine moves them from here.
- *Talk recorder* (`lib/personaProvider.js` `makeTalkBuffer_`, used by every citizen voice and by Mags): the session buffer keeps the voice's replies and Mike's lines (speaker named Mike). At the 30-min idle boundary: (1) the voice's replies -> its Reflection_Intake row (as before; Mags now too, POP-00005, neutral snippet); (2) Mike's lines -> a Reflection_Intake row for Paulson POP-00527 (his dials), BondTarget = the voice, neutral snippet "a conversation with <voice>", no tension lines, no Paulson page; (3) citizen voices only: one short TALK line on the voice's page (Haiku 5.5, 1–2 sentences, how the talk sat with them, no new events or claims; `type: talk`, so it is not "own words" usage for engine.304 and not a `reflection`). Paulson's and Mags' snippets are neutral on purpose: Reflection_Intake snippets are read by the digests that feed the daily news. Failures of rows 2 and 3 are reported in the bot log, never retried.
- Checked: dry-run classification of today's real exchange (Paulson: Sports / Content; page line renders), test `scripts/personaProviderBrief.test.js` 18/18. Acceptance: Mike's next Discord talk -> the log line `voice buffer flushed ... paulson=... page=written` ~30 min later; DialState for POP-00527 / POP-00005 and the bonds move at the next full Cycle's Phase-9 drain (C113).
- *The card Mags holds on the speaker* is the Supermemory `mags` container profile fetched without a user id: container-wide, so every speaker gets the same card; its content is mostly facts about Mags and a few citizens, nothing specific to Mike. Not fixed; recorded.

**Still open:** NotebookLM as a per-Cycle brief query; a per-speaker card (needs a user id on the profile call); the deity/guidance voice (later, not Paulson).

## Status log

### research.16 — status (drained from ROLLOUT, 2026-06-26 / S274)

Tier-1 character voice agents (Mike-direct S264) — Vinnie Keane / Benji Dillon / Deacon Seymour / Elias Varek get an authored canon-seeded **persona core** (four-file IDENTITY/LENS/RULES/SKILL) driving three surfaces: `/interview` Q&A + Mags-style interactive Discord chat + accurate voicing in the live research.14 24/7 loop. **Vertical-slice on Deacon first** (richest canon — TrueSource bio) before replicating. **Load-bearing decision in plan: authored base is LOCKED** — the loop swings mood but cannot drift a Tier-1's dial base off-canon (else loop-Deacon ≠ interview-Deacon; gates Phase 3, needs engine-sheet base-lock mechanism). **SUPERSEDED S291 (research-build) by [[../adr/0014-citizen-self-authorship-live-drift|ADR-0014]]:** the base-lock was never built and research.14's write-back shipped globally anyway (LOOP CLOSED S277, no Tier-1 exclusion in code) — voiced citizens' dials were already drifting in production. Mike-direct ruling reversed this line: canon is a starting character, not a ceiling; consistency comes from every surface reading the *live* state, not from freezing it. See [[2026-07-04-voice-dial-sync-contract-build]]. Pillar dial-vectors (Keane/Dillon = Five Goods Heart/Calm) get a Mike+Mara canon-write gate (Phase 4). Verified: buildVoiceWorkspaces civic-hardcoded, mags-bot single-persona, /interview excludes citizens, Varek ledger blank-slate (all-50). Composes with research.14 (do NOT duplicate the loop). Advisor-reviewed. **Open for Mike:** namespace name, Discord channel model, fixed-anchor-vs-rotation. Design: research-build; substrate (ledger backfill + base-lock + bot generalization): engine-sheet; execution (run interviews): media.

## Changelog

- 2026-09-27 (research-build) — Closed done-pending-archive: all four voice agents (Benji Dillon, Elias Varek, Deacon Seymour, Vinnie Keane) confirmed live on the current agent roster.
- 2026-06-23 (S270, engine-sheet) — **Phase 2 BUILT (local, gated deploy).** `lib/personaProvider.js` (new — persona-provider interface + `citizenVoiceProvider(popId)`) + `scripts/mags-discord-bot.js` refactored to a `channelId → provider` map with per-channel session state; Mags' paths verbatim. Citizen provider = four-file core + framing + memoryFence-wrapped per-POPID page recall; NOTES_TO_SELF Mags-only; citizen chat NOT written back to the reflection page (measure-twice — contamination guard). Wiring via `CITIZEN_VOICE_CHANNELS` env; unset → Mags-only (no behavior change), so deploy is a deliberate create-channel→set-env→`pm2 restart` step on Mike's go. Verified offline (4 voices indexed, Deacon clean, Mags deps intact, augment fails open). NOT deployed.

- 2026-06-17 — **All four voices built + validated (S264) — method proven on N=4.** Added Benji Dillon (`citizen-voice-benji-dillon`, POP-00018, Five Goods **Calm** pillar — surfer-scientist, "The Golden Arm," 5 Cy Youngs, ocean/rhythm creed, "The Calm and the Storm" with Vinnie) and Elias Varek (`citizen-voice-elias-varek`, POP-00789, **not a pillar** — Civis Systems urban-intelligence founder, Oaks owner, the connector; thin-canon so RULES forbid inventing biography + naming the real NBA). Both authored THROUGH `/make-citizen-voice`, no ad-hoc deviation. **Voice tests PASS, all four distinct and faithful:** Deacon (quiet watcher/Mind) · Vinnie (joy/Heart) · Benji (calm/water/Calm) · Elias (connector/builder) — four radically different registers, all canon-clean. Varek's test confirmed the thin-canon guard works (didn't over-claim the Paulson deal, named no real league/owners). **Method validated complete on N=4** incl. a non-pillar thin-canon figure. Pillar gate flagged for Dillon's Phase-3 ledger backfill (Vinnie too); Deacon + Varek skip it. **Replication directive DONE.** Remaining: Task 1.1 (/interview amendment), Phases 2-3 (gated deploy: Discord chat + ledger backfill).
- 2026-06-17 — **Process formalized + first replication (S264).** Extracted the `/make-citizen-voice` skill (`.claude/skills/make-citizen-voice/SKILL.md`) from the Deacon build — 5 steps (gather canon corpus → author the four files reshaped-for-a-person → validate by voice test → pillar canon-write gate → register+commit). **Replicated to Vinnie Keane** (POP-00001, Five Goods Heart pillar) THROUGH the method — `.claude/agents/citizen-voice-vinnie-keane/` four files authored from his canon (436 HR / six rings / 2031 title homer / farewell season / West Oakland academy / underdog-joy voice). **Voice test PASS:** distinctly Vinnie and clearly NOT Deacon (joy-in-the-act + underdog grit vs quiet-watcher) — proves the method generalizes, not one-voice-twice. The method needed no ad-hoc deviation for Vinnie → validated complete on N=2. Vinnie's pillar status flagged: his Phase-3 ledger dial backfill needs the Mike+Mara gate (interview core does not). **Deacon interview marked CANON-ELIGIBLE (Mike), publish routed to media.** Remaining: Dillon + Varek (run the method), Task 1.1 (/interview amendment), Phases 2-3 (gated deploy).
- 2026-06-16 — Initial draft (S264, research-build). Scope settled across a live conversation with Mike: started as "voice agents for interviews," expanded to interviews + civic + 24/7 Discord, then de-crossed by Mike to three concepts sharing one persona core. Grounding reads done (buildVoiceWorkspaces civic-hardcoded; mags-bot single-persona; /interview excludes citizens; research.14 is reusable per-citizen substrate; Varek ledger blank-slate confirmed). Vertical-slice-on-Deacon-first structure per advisor (avoid the 4×3 matrix).
- 2026-06-17 — **Intent sharpened (Mike): the deliverable is a repeatable PROCESS for making a citizen voice agent, not just the four agents — and NOT a generalization of the voices (anti-cheapening).** Reusable = the authoring method + shared infra (loader/builder/Discord/base-lock); each voice stays hand-authored at full canon depth. These four are the reference instances that establish the process. Goal, the organizing-principle bullet, acceptance #4 (now a `/make-citizen-voice` method), and Phase 4 (formalize-then-replicate) all updated. Corrects the prior "generalized concept once" wording, which read as flattening the voices.
- 2026-06-23 (S270) — Phase 2 verification check DONE (research-build, the sole remaining open Q). Mapped `mags-discord-bot.js`: Mags-coupling concentrated in 2 seams (`buildSystemPrompt` + single `CHANNEL_ID`); rest is persona-agnostic. Verdict LIGHTWEIGHT — persona-provider interface keyed by id + channel→persona map; `citizenVoice(popId)` loads the four-file core + research.14 POPID page; NOTES_TO_SELF is Mags-only. Phase 2 now design-ready, build unblocked. Open-Qs list now empty.
- 2026-06-16 — Mike answered the open Qs (S264): namespace `citizen-voice-*` ✓; **build a generalized citizen-voice CONCEPT once, instantiated per citizen** (not 4 bespoke) — now the organizing principle; per-character Discord channels + own chat history, gated deploy; lean generalized builder; Mags stays the live 24/7 anchor, **Vinnie Keane = sanctioned test+showcase add**; canon-seeding from the full corpus (origin + editions + supplementals — all 4 are major covered players). Slice stays **Deacon (ungated → full pipeline incl. base-lock proves without a canon-gate); Vinnie is first showcase replication + 24/7 test** (his pillar dial-vector hits the Mara gate at Phase 3, so prove machinery on the ungated character first). One open Q remains (mags-bot coupling depth, Phase 2 check).
- 2026-06-16 — Advisor review (Mike-requested) folded in: (1) **§Core decision: authored base is locked** — the immutable-core vs. mutable-dials seam the pre-mortem missed; Tier-1 base-lock so the 24/7 loop can't overwrite canon (load-bearing, gates Phase 3). (2) Phase 4 **canon-write gate** — Keane/Dillon pillar dial-vectors get Mike+Mara sign-off; Varek/Deacon don't. (3) Named the judge on subjective acceptance criteria (Mara audit + Mike). (4) Added the ambient-presence **scope boundary** (loop auto-posting to a channel is OUT, filed as follow-on). Registered in index.md + ROLLOUT row same commit.

---

## Relocated ROLLOUT_PLAN row detail — 2026-07-02 (S286 pointer-collapse)

Verbatim rows moved out of ROLLOUT_PLAN.md when it collapsed to pointer-only. This is the working detail for the open job(s); the rollout row is one line pointing here.

### research.16

| research.16 | Tier-1 character voice agents (Mike-direct S264) — Vinnie Keane / Benji Dillon / Deacon Seymour / Elias Varek get an authored canon-seeded **persona core** (four-file IDENTITY/LENS/RULES/SKILL) driving three surfaces: `/interview` Q&A + Mags-style interactive Discord chat + accurate voicing in the live research.14 24/7 loop. **Vertical-slice on Deacon first** (richest canon — TrueSource bio) before replicating. **Load-bearing decision in plan: authored base is LOCKED** — the loop swings mood but cannot drift a Tier-1's dial base off-canon (else loop-Deacon ≠ interview-Deacon; gates Phase 3, needs engine-sheet base-lock mechanism). **SUPERSEDED S291 (research-build) by [[../adr/0014-citizen-self-authorship-live-drift|ADR-0014]]:** the base-lock was never built and research.14's write-back shipped globally anyway (LOOP CLOSED S277, no Tier-1 exclusion in code) — voiced citizens' dials were already drifting in production. Mike-direct ruling reversed this line: canon is a starting character, not a ceiling; consistency comes from every surface reading the *live* state, not from freezing it. See [[2026-07-04-voice-dial-sync-contract-build]]. Pillar dial-vectors (Keane/Dillon = Five Goods Heart/Calm) get a Mike+Mara canon-write gate (Phase 4). Verified: buildVoiceWorkspaces civic-hardcoded, mags-bot single-persona, /interview excludes citizens, Varek ledger blank-slate (all-50). Composes with research.14 (do NOT duplicate the loop). Advisor-reviewed. **STALE-ROW FIX S278 (research-build):** the "Open for Mike: namespace/Discord-channel-model/fixed-anchor-vs-rotation" line below was answered back in S264 and never cleared from this row. **Actual state:** Phase 0 (persona-core pattern + Deacon prototype) + Phase 1 (`/interview` surface) DONE S264. **Phase 2 (Discord chat) BUILT (S270) + DEPLOYED LIVE (confirmed S278)** — `lib/personaProvider.js` + per-channel `mags-discord-bot.js` refactor; `CITIZEN_VOICE_CHANNELS` is set (`POP-00001` Vinnie Keane), `mags-bot` online via PM2 — Mags and Vinnie both live in Discord, separate channels/history. Phase 3 (ledger backfill + base-lock — base-lock half VOID per ADR-0014 above) + Phase 4 (replicate to Dillon/Varek) still OUTLINE-only, not designed. Design: research-build; substrate (ledger backfill + base-lock + bot generalization): engine-sheet; execution (run interviews): media. | in-progress — Phase 2 live; Phase 3/4 undesigned | research-build (design) + engine-sheet (substrate) | [[../plans/2026-06-16-tier1-character-voice-agents]] |

