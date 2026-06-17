---
title: Tier-1 Character Voice Agents Plan
created: 2026-06-16
updated: 2026-06-16
type: plan
tags: [media, engine, citizens, persona, architecture, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md (new row — Tier-1 voice agents)
  - docs/engine/INSTITUTIONAL_VOICE_AGENTS.md (the four-file voice-agent pattern, S63+)
  - docs/plans/2026-06-04-mags-citizen-loop.md (research.14 — the live 24/7 citizen-loop substrate)
  - docs/plans/2026-05-31-autonomy-roadmap.md (research.9/12 — autonomy umbrella, Layer 3 citizen-autonomous)
  - .claude/skills/interview/SKILL.md (the interview surface; v2.0 currently EXCLUDES citizens/players)
  - scripts/buildVoiceWorkspaces.js (civic-hardcoded workspace builder — finding §Verified constraints)
  - scripts/mags-discord-bot.js (single-Mags-persona chat handler — finding §Verified constraints)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[plans/2026-06-04-mags-citizen-loop]] — the 24/7 loop this composes with (do NOT duplicate)"
  - "[[plans/2026-05-31-autonomy-roadmap]] — umbrella; this is a Layer-3 instance, named-character flavor"
  - "[[engine/INSTITUTIONAL_VOICE_AGENTS]] — the four-file persona pattern reused here"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
---

# Tier-1 Character Voice Agents Plan

**Goal:** Give four Tier-1 characters — Vinnie Keane (POP-00001), Benji Dillon, Deacon Seymour (POP-00528), Elias Varek (POP-00789) — an authored, canon-seeded **persona core** that drives three surfaces: `/interview` Q&A, Mags-style interactive Discord conversation, and accurate voicing in the live 24/7 citizen-loop. Prove the whole stack on **one** character (Deacon) before replicating.

**Architecture:** One **persona core** per character — the existing four-file voice pattern (IDENTITY / LENS / RULES / SKILL), canon-seeded from each character's existing record (Deacon's TrueSource bio, Keane/Dillon origin files, Varek's cards). That core is the single source-of-truth, consumed by three surfaces: **(1)** `/interview` (reactive Q&A — amend the skill to accept a named-character subject class); **(2)** the `mags-bot` chat handler, generalized to load any persona core (interactive Discord — "talk to Deacon like you talk to Mags"); **(3)** the existing research.14 citizen-loop, made *accurate* for these four via an engine-sheet **ledger backfill** that projects the authored persona into dials + LifeHistory (the loop already voices citizens from ledger data — these Tier-1 rows are blank-slate today). The build order is a **vertical slice**: persona core + interview surface for Deacon first, prove it end-to-end, then add the Discord and ledger surfaces, then replicate to the other three.

**Terminal:** research-build (design — this plan; the persona-core pattern; the `/interview` amendment design) + engine-sheet (substrate — ledger backfill, dial schema, the persona-core workspace builder, the bot generalization). **Media and civic are execution-only — they do NOT build any of this** (S264 routing rule, MEMORY.md). Media *uses* the agents (runs `/interview`); nobody in media/civic builds them.

**Scope boundary (Mike used both "Discord ability" and "24/7 life" — these are different):** IN scope = (a) interactive Discord chat (talk to them, Phase 2) + (b) accurate voicing when the research.14 loop wakes them (Phase 3). OUT of scope for now = the loop **auto-posting** a character's reflections to a channel as an ambient always-on feed — that's a separate surface, filed as a follow-on if wanted, not built here.

**Pointers:**
- The 24/7 substrate this composes with: [[plans/2026-06-04-mags-citizen-loop]] §"Phase 2 — BUILD STATE SYNTHESIS". Do NOT build a parallel life-cycle loop.
- Umbrella: [[plans/2026-05-31-autonomy-roadmap]] §"Layer 3 — Citizen-autonomous". This plan is the *named-character, hand-authored-depth* flavor of Layer 3 (vs. the dials-only 437-citizen rotation).
- The reusable persona pattern: [[engine/INSTITUTIONAL_VOICE_AGENTS]] (four-file architecture, `scripts/buildVoiceWorkspaces.js` builder).
- Proprietary-element context: MEMORY.md `user_mags-bleed-proprietary-element` — the hand-authored depth bleeding into voice is the proprietary thing; these four are "Mags-tier," not rotation-tier.

**Acceptance criteria (whole plan — proven on Deacon, then replicated):**
1. A Deacon Seymour persona core (four files) exists, canon-seeded from his TrueSource; `/interview` Mode 1 runs against him and produces an in-voice transcript that is recognizably *him* (baseball-IQ, listens-then-asks-one-question), distinct from a generic citizen voice. **Judge:** the `/interview` Mara audit step (Step 5, canon-accuracy) + Mike's read — not self-asserted.
2. You can talk to Deacon on Discord (mags-bot generalized to load his core) and he answers grounded in his canon, in his voice — not as Mags. **Judge:** Mike's read (no Mara on live chat).
3. Deacon's ledger row (dials + LifeHistory) is backfilled to match his authored character, so a research.14 wake voices him accurately (no all-neutral blank-slate) — AND a multi-day loop run does not drift his *base* away from the authored core (see §Core decision: authored base is locked).
4. The pattern is documented so Keane / Dillon / Varek replicate without re-deriving architecture.

---

## Verified constraints (grounding reads, S264 — facts, not assumptions)

These were checked against current code, not assumed:

- **`scripts/buildVoiceWorkspaces.js` is civic-hardcoded.** Fixed `AGENTS` array of seven civic offices; paths `output/civic-voice-workspace/` + `output/civic-voice/`; data routing keyed to `civicLoad` / `hookDomains: [CIVIC, INFRASTRUCTURE, ...]`. The four-file *definition* pattern (`.claude/agents/<agent>/{IDENTITY,LENS,RULES,SKILL}.md`) is reusable; **this population script is not** — Task in Phase 0 decides generalize-vs-new-builder.
- **`mags-bot` (`scripts/mags-discord-bot.js`) is single-persona.** Chat handler hardcodes "You are Mags Corliss in the Discord channel"; loads *her* reflections (`loadRecentReflections`). A second conversational persona = generalizing the handler to load a persona core by id. Exact seam (persona load + channel routing + per-persona memory) is a **Phase 2 verification check before promising the surface**.
- **`/interview` v2.0 explicitly EXCLUDES citizens/players** — "Interview citizens or players — that's a dispatch or supplemental" is in its *does-NOT-do* list, and Mode 1 voices only *civic* voice agents. The amendment is scoped (add a named-character subject class to Mode 1), not a rewrite.
- **research.14 voices citizens FROM ledger data** (dials + LifeHistory tail + neighborhood slice + real relationships) and is LIVE on cron. Varek's ledger card is `drive:50/sociability:50/warmth:50/openness:50/composure:50, Conduct:b0, Entries:0` — a blank slate. The backfill is what makes the loop's voice of these four accurate; it is **authored one-time data**, not an LLM-in-cycle write (respects the research.14 determinism constraint — only deterministic objective events move dials in-cycle).

---

## Core decision: authored base is locked (the immutable-core seam)

**The architectural risk that makes-or-breaks this over time (advisor S264).** Two surfaces read "who Deacon is" from two different representations: the interview/Discord surfaces read the **authored core** (fixed); the 24/7 loop reads the **ledger dials**, which research.14 *mutates* — its base/mood/streak model says a *sustained* reflection pattern **shifts the base**. For a generic rotation citizen, base-drift is the feature (emergent personality). For an **authored Tier-1 character, base-drift is the loop slowly overwriting canon** — run Deacon 3×/day for weeks and loop-Deacon and interview-Deacon become two different people.

**Decision: Tier-1 authored characters lock their dial *base*. The engine may swing *mood* (liveness — he can have a bad day) but never rewrites the *base* away from the authored vector.** This is the same instinct as the research.14 determinism constraint — protect the authored layer from non-authored writes. Same "engine emerges, narrative/canon is authored" arrow.

**Mechanism (engine-sheet substrate, Phase 3):** a per-row **base-lock flag** on Tier-1 character rows that pins `base` to the authored vector while `mood`/`streak` still operate. Verify against the research.14 base/mood/streak code (`citizenMemory.js`) that pinning base is clean (mood swing still works, only the base-write is suppressed). If the model can't cleanly separate them, the fallback is periodic re-assertion of the authored base. **This decision must be resolved in code before Phase 3 ships — it is load-bearing for whether the architecture holds together.**

---

## Phase 0 — Persona-core pattern + Deacon prototype (research-build design + engine-sheet build)

### Task 0.1: Decide the persona-core class + namespace
- **Files:** this plan (record decision); `.claude/agents/` (new namespace dir)
- **Steps:**
  1. Adopt the four-file pattern (IDENTITY / LENS / RULES / SKILL) from [[engine/INSTITUTIONAL_VOICE_AGENTS]], **reshaped for an individual person** (not an institution reacting to civic events). IDENTITY = who they are (canon biography + disposition); LENS = canon-tier framework ([[canon/CANON_RULES]] three-tier); RULES = voice/behavior guardrails; SKILL = what the agent does when invoked (answer in-voice, grounded, no fabrication).
  2. Pick the namespace. Proposed: `.claude/agents/citizen-voice-<name>/` (broader than "sports" — Varek is business/ownership; future Tier-1 citizens can join). **Open question for Mike — namespace name.**
- **Verify:** decision recorded in plan; namespace dir chosen.
- **Status:** [ ] not started

### Task 0.2: Resolve the workspace-builder question
- **Files:** `scripts/buildVoiceWorkspaces.js` (read); decision in plan
- **Steps:**
  1. Decide: (a) generalize `buildVoiceWorkspaces.js` to a non-civic subject config, or (b) a new lean `buildCharacterVoiceWorkspace.js` that assembles a character's perception packet (their ledger row + LifeHistory tail + relationships + recent canon appearances). Lean toward (b) — the civic builder's domain-routing (civicLoad/hookDomains) is dead weight for a person.
  2. The character workspace needs: persona core files + canon dossier (TrueSource / origin files / MCP card) + recent appearances (`search_articles`/`search_canon`). NOT civic engine data.
- **Verify:** builder approach chosen; input list enumerated.
- **Status:** [ ] not started

### Task 0.3: Author Deacon Seymour's persona core
- **Files:** `.claude/agents/citizen-voice-deacon-seymour/{IDENTITY,LENS,RULES,SKILL}.md` — create
- **Steps:**
  1. Seed IDENTITY from his TrueSource (Supermemory doc `FRwnXsmRUb2Dpt7Qvhdrea` — Mississippi State, 11th-round Royals, 11 utility seasons, .261/97 HR/never-an-All-Star, the "asks one question" listener, hired by Paulson as A's manager through a 3-hour interview). Disposition: low-ego systems-thinker, watches film for *why*, develops young players.
  2. LENS per [[canon/CANON_RULES]] — Deacon is Tier-1 (use real name).
  3. RULES: never break canon (his stats/history are fixed); never speak as a different character; no real-world MLB names; speaks in cycles not dates.
  4. SKILL: when invoked (interview turn or Discord message), answer in-voice, grounded in his canon + the current world slice, may go off-script, never fabricates engine facts.
- **Verify:** four files exist; a cold read of IDENTITY.md conveys a recognizably specific person.
- **Status:** [ ] not started

---

## Phase 1 — Interview surface (the vertical slice; research-build design, media executes)

### Task 1.1: Amend `/interview` Mode 1 to accept a named-character subject class
- **Files:** `.claude/skills/interview/SKILL.md` — modify (scoped)
- **Steps:**
  1. Mode 1 currently interviews *civic voice agents* only and the skill's does-NOT-do list bars "citizens or players." Add a third subject class: **named-character voice agent** (`citizen-voice-*`). Keep the civic path intact.
  2. The mechanics are identical to the civic-voice path (reporter agent ↔ voice agent, Mags mediates turns, voice gets questions not preset answers) — only the subject-agent source dir changes.
  3. Update the does-NOT-do line: still no *generic* citizen/player interviews (those are dispatches), but **named Tier-1 character voice agents are now valid Mode 1 subjects.**
- **Verify:** SKILL.md diff is additive; civic path unchanged; new class documented with the agent-dir convention.
- **Status:** [ ] not started

### Task 1.2: Run the Deacon interview end-to-end
- **Files:** `output/interviews/c{XX}_deacon_seymour_*` (transcript artifacts)
- **Steps:**
  1. Theme grounded in current canon (e.g. managing the dynasty→rookie transition Varek/Paulson era).
  2. Reporter (Anthony Raines — his canonical analyst per MCP) interviews the Deacon voice agent, Mags mediating per the skill.
  3. Capture the transcript.
- **Verify:** transcript reads as Deacon (the listener who asks one precise question), not as a generic citizen or as Mags; canon-accurate.
- **Status:** [ ] not started

---

## Phase 2 — Discord-chat ability (engine-sheet/research-build build) — OUTLINE

**Scope (detail after Phase 1 proves the core):** generalize the `mags-bot` chat handler to load a persona core by id so you can converse with Deacon in Discord.

- **First, the verification check (advisor-flagged):** map how Mags-coupled the chat handler is — persona prompt, reflection load, journal, per-persona memory. Decide a lightweight persona-load path vs. a deep refactor *before* promising the surface.
- Open: same channel as Mags or per-character channels? Per-persona memory store (their Supermemory page from research.14 is the natural backing)?
- Reuses, does not duplicate, research.14's per-POPID Supermemory page as the character's memory.

## Phase 3 — Ledger backfill for 24/7 accuracy (engine-sheet substrate) — OUTLINE

**Scope:** project Deacon's authored persona into his ledger row so a research.14 wake voices him accurately.

- Author the 6-dial vector (drive/openness/composure/sociability/warmth/integrity) + a LifeHistory seed from his canon. **Authored values, one-time write — NOT an LLM-in-cycle computation** (respects the research.14 determinism constraint: only deterministic objective events move dials in-cycle).
- The persona core (Phase 0) is the source-of-truth for these values — author once, project to ledger.
- **Implement the base-lock** (§Core decision) so the loop can't drift his base off-canon. This is the gating piece of Phase 3.
- Open: do these four become **fixed anchors** in the loop (always wake, like Mags) or accurately-voiced rotation members? Mike's "24/7" implies fixed-anchor — confirm.

## Phase 4 — Replicate to Keane, Dillon, Varek — OUTLINE

Once the Deacon slice proves all three surfaces: replicate the persona core + backfill for Vinnie Keane (origin files), Benji Dillon (origin files), Elias Varek (cards + needs the most backfill — blank-slate dials). Keane/Dillon are dynasty pillars (Five Goods: Heart/Calm) — their cores must honor their pillar-good mapping ([[../../.claude/rules/newsroom]] §The Five Goods).

**Canon-write gate (advisor S264):** hand-authoring the dial vectors + LifeHistory for **Keane and Dillon is editing canon-central characters** (pillars = "the world's architecture wearing faces"), not filling a blank row. Their authored vectors get a **Mike + Mara sign-off** before the ledger write, same as any canon-establishing write. **Varek** (genuine blank-slate) and Deacon do not need this gate — only the pillars do.

---

## Open questions

- [ ] **Namespace name** for the persona-core class — `citizen-voice-*` proposed (Task 0.1). Mike's call.
- [ ] **Workspace builder** — generalize `buildVoiceWorkspaces.js` vs. new lean character builder (Task 0.2). Lean (b).
- [ ] **Discord channel model** — one shared channel vs. per-character (Phase 2).
- [ ] **24/7 loop role** — fixed anchors vs. accurately-voiced rotation members (Phase 3). "24/7" implies fixed.
- [ ] **mags-bot coupling depth** — Phase 2 verification check gates the Discord promise.

---

## Pre-mortem (weakest assumptions — audit before building)

1. **"The civic four-file pattern transfers cleanly to a person."** Risk: civic agents voice an *office reacting to civic events*; a person in conversation has no "statement on initiatives." Mitigation: Phase 0 *reshapes* the four files for an individual, doesn't copy civic verbatim.
2. **"Discord-chat is just a handler generalization."** Risk: `mags-bot` may be deeply Mags-coupled (reflections, journal, memory). Mitigation: Phase 2 verification check FIRST; lightweight persona-load path, not a forced deep refactor.
3. **"Ledger backfill projects cleanly from the core."** Risk: mapping authored character → a 6-dial vector is subjective. Mitigation: hand-author the vector per character (4 of them — tractable), don't build a projection algorithm.

---

## Changelog

- 2026-06-16 — Initial draft (S264, research-build). Scope settled across a live conversation with Mike: started as "voice agents for interviews," expanded to interviews + civic + 24/7 Discord, then de-crossed by Mike to three concepts sharing one persona core. Grounding reads done (buildVoiceWorkspaces civic-hardcoded; mags-bot single-persona; /interview excludes citizens; research.14 is reusable per-citizen substrate; Varek ledger blank-slate confirmed). Vertical-slice-on-Deacon-first structure per advisor (avoid the 4×3 matrix).
- 2026-06-16 — Advisor review (Mike-requested) folded in: (1) **§Core decision: authored base is locked** — the immutable-core vs. mutable-dials seam the pre-mortem missed; Tier-1 base-lock so the 24/7 loop can't overwrite canon (load-bearing, gates Phase 3). (2) Phase 4 **canon-write gate** — Keane/Dillon pillar dial-vectors get Mike+Mara sign-off; Varek/Deacon don't. (3) Named the judge on subjective acceptance criteria (Mara audit + Mike). (4) Added the ambient-presence **scope boundary** (loop auto-posting to a channel is OUT, filed as follow-on). Registered in index.md + ROLLOUT row same commit.
