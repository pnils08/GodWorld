---
name: make-citizen-voice
description: Build a new citizen voice agent — an authored, canon-seeded persona that can be interviewed, talked to on Discord, and woken in the 24/7 citizen-loop. Use when standing up a Tier-1 character voice. Reference instances — Deacon Seymour, Vinnie Keane (research.16).
version: "1.0"
updated: 2026-06-17
tags: [media, citizens, persona, active]
effort: medium
---

# /make-citizen-voice — Author a Citizen Voice Agent

**The repeatable process for turning a citizen's canon into a faithful four-file voice agent.** Distilled from the Deacon Seymour build (research.16 Phase 0–1) and validated on Vinnie Keane. The voice is **always hand-authored at full canon depth** — this method is the *recipe*, never a template that flattens the voice. A run that produces a generic register has failed even if it completes (MEMORY.md `user_mags-bleed-proprietary-element`).

Plan: [[../../../docs/plans/2026-06-16-tier1-character-voice-agents]]. Pattern parent: [[../../../docs/engine/INSTITUTIONAL_VOICE_AGENTS]] (the four-file architecture, reshaped here from civic-institution → individual-in-conversation).

## When to use

Standing up a named Tier-1 character as a speaking voice. NOT for generic rotation citizens (those get dials-only via research.14, no hand-authoring).

## Step 1 — Gather the canon corpus (no guessing)

Pull everything the world already knows about them. Pick the tool by the question (MEMORY.md `feedback_citizen-retrieval-tool-by-question`):
- `mcp__godworld__lookup_citizen "<name>"` — card + appearance history + bay-tribune hits.
- `mcp__godworld__search_canon "<name> <topic>"` — edition/coverage texture.
- Archive origin files: `ls docs/archive/ | grep -i <name>` — origin stories, TrueSource bios, prior interviews (these carry the actual VOICE).
- `search_articles "<name>"` (dashboard API) for the full corpus if needed.

From the corpus, extract four things:
1. **Immutable canon facts** — stats, history, role, relationships. These become `ESTABLISHED CANON` and may never be contradicted.
2. **The ONE voice anchor** — a real canon line that *is* them (Deacon: "That's the job. We watch." / Vinnie: Hal Richmond's "Keane is joy... pleasure in the act itself"). Build the voice around it.
3. **Disposition** — how they carry themselves (this section becomes the source-of-truth for the Phase-3 ledger dial backfill).
4. **Their lens** — what they perceive and through whose eyes; what does NOT reach them.

## Step 2 — Author the four files (reshape for a person, not an institution)

Create `.claude/agents/citizen-voice-<name-slug>/` with four files. The civic-office pattern voices an *institution emitting cycle statements*; reshape it for an *individual in conversation*:

- **IDENTITY.md** — who they are: name, POPID, `## ESTABLISHED CANON — immutable` block, `## Your disposition` (→ source-of-truth for Phase-3 dials), `## Your Voice` (anchored on the canon line, with the specific verbal tics + what they refuse to do), what they care about, canon relationships.
- **LENS.md** — what reaches them / what doesn't; their Tier-1 canon status; the defining perceptual frame (Deacon = attention; Vinnie = joy-in-the-act).
- **RULES.md** — voice rules (stay them, never become Mags/reporter/AI, no false certainty), canon-fidelity (immutable facts), invention authority (interior life YES / engine facts NO), and **per-surface behavior** (interview turn / Discord message / 24-7 wake).
- **SKILL.md** — frontmatter (`model: sonnet` for interview fidelity; `tools: Read, Glob, Grep`), boot sequence (read the 3 files + context-specific memory), what it does per invocation context.

Depth bar: a cold read of IDENTITY.md must convey a recognizably *specific* person, not a role.

## Step 3 — Validate (the empirical voice test)

Dispatch the agent (`Agent` tool, `subagent_type: citizen-voice-<slug>`) as an interview subject with a canon-grounded theme + 3-4 reporter questions. Judge the transcript:
- **Recognizably them** (the voice anchor lands), **distinct from a generic citizen**, **zero canon violations**, **no engine language** ("cycle"/"ledger"/etc.), stays in character even under a pushy question.
- Judge = the test transcript + Mike's read (+ Mara audit if it's going to canon).
- If it fails, fix the core — and if the *method* needed an ad-hoc deviation to make this character work, **fix this skill** (the method is incomplete), don't one-off them.

## Step 4 — Pillar / canon-write gate

If the citizen is a **Five Goods pillar** ([[../../../.claude/rules/newsroom]] §The Five Goods — Davis/Aitken/Kelley/Keane/Dillon), their **Phase-3 ledger dial-vector backfill is a canon write** and needs a **Mike + Mara sign-off** before the ledger write. Authoring the interview persona core does NOT need the gate; the ledger backfill does. Non-pillars (e.g. Deacon, Varek) skip the gate.

## Step 5 — Register + commit

- Agent files under `.claude/agents/citizen-voice-<slug>/` (skill/agent files are exempt from the docs index per `feedback_no-isolated-mds`, but record the new instance in the research.16 plan).
- Update [[../../../docs/plans/2026-06-16-tier1-character-voice-agents]] (which character, status).
- Commit `[research/build]` (building agents = research-build, not media — MEMORY.md routing rule).

## What this does NOT do

- Build the Discord chat surface or the ledger backfill — those are Phases 2-3 (gated deploy), separate from authoring the voice.
- Publish an interview to canon — that's the `/interview` tail (`.txt` compile → Mara → `/post-publish`), a MEDIA-terminal execution step.
- Touch the 24/7 loop wiring — research.14 owns it; a citizen voice is *accurately voiced* there once its ledger is backfilled (Phase 3).
