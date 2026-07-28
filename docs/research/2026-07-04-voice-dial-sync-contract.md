---
title: Voice-agent ↔ dial sync contract — research
created: 2026-07-04
updated: 2026-07-04
type: reference
tags: [research, citizens, dials, citizen-loop, voice-agents, active]
sources:
  - docs/plans/2026-06-21-tier1-dial-essence-backfill.md (the one-time canon→dial backfill; own Status checklist is STALE — last item reads unchecked though ROLLOUT_ARCHIVE confirms it shipped)
  - docs/engine/ROLLOUT_ARCHIVE.md:1150 (research.18 close-note — both authoring + live write DONE S266/S267, archived S274)
  - docs/plans/2026-06-04-mags-citizen-loop.md (research.14 — write-back drain design + status; "LOOP CLOSED S277" entry, changelog 2026-06-23 + 2026-06-30)
  - lib/citizenDials.js (pure `disposition(cur)` — live DialState JSON → prose phrase; the mechanism citizen-wake.js already calls)
  - scripts/citizen-wake.js:6,72-73,268 (perception assembly reads dials→disposition per wake; drain accretes into `base`; prose appended to a Supermemory page, never LifeHistory)
  - .claude/agents/citizen-voice-vinnie-keane/SKILL.md:13,17,40 (boot reads static IDENTITY.md; canon-write sign-off note; 24/7 wake uses separate cheap-model wiring)
  - .claude/agents/citizen-voice-vinnie-keane/IDENTITY.md:13,21 (immutable canon section; "disposition — source-of-truth for your ledger dials")
  - .claude/skills/interview/SKILL.md:301 (post-publish interview handling)
  - .claude/skills/post-publish/SKILL.md:135,146 (`buildCitizenCards.js` — Sim_Ledger-only appearance-count refresh, not a history/dial write)
  - docs/engine/ROLLOUT_PLAN.md:68,116,124 (engine.43 / research.14 / research.22 rows — research.14 row still reads "in-progress," doc-drift vs. the plan's own "LOOP CLOSED S277")
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (engine.43)"
  - "[[index]] — register here, same commit"
---

# Voice-agent ↔ dial sync contract — research

**Source:** Internal state audit — the live citizen-loop write-back path (research.14), the Tier-1 dial-essence backfill (research.18), the four `citizen-voice-*` agent definitions, and the interview/post-publish ingest pipeline. Triggered by Mike (2026-07-04, this session): voiced citizens exist both as authored MD files and as `Simulation_Ledger` rows — is there a backfill gap, and going forward, does a citizen's agent-file change when their dials drift, and does what the agent *does* (interviews, Discord) feed back into their own citizen record? Filed as `engine.43` (ROLLOUT `ready`, Mike-direct S286 close).

**What it does:** Three surfaces read a voiced citizen's temperament today, by two different mechanisms. (1) The 24/7 wake (`scripts/citizen-wake.js`) reads **live** `DialState` each wake and converts it to a disposition phrase via `lib/citizenDials.js:disposition()` — dynamic, self-refreshing. (2) Interview and Discord conversation (`.claude/agents/citizen-voice-*/IDENTITY.md`, boot step 1) read a **static** prose "Your disposition" section, authored once at build time (research.16 Phase 3) and never revisited. Separately, dials themselves move going forward: the wake→reflect→classify→drain loop (research.14) writes lived-reflection deltas directly into each citizen's `DialState.base`, and per S277 this loop is **closed and self-sustaining** — no code gap remains, and the drain applies uniformly (no Tier-1/voiced-citizen exclusion found in `citizen-wake.js`, `utilities/citizenMemory.js`, or `utilities/compressLifeHistory.js`).

**Extraction — what's usable:**
- **The one-time backfill Mike asked about is already closed, not open.** research.18 authored + live-wrote all 43 voiced/civic/media citizens' canon into `LifeHistory_Archive` and re-derived `DialState`; S266/S267 done, archived S274 (`docs/engine/ROLLOUT_ARCHIVE.md:1150`). The backfill plan's own on-page checklist still shows the live-write step unchecked — that's stale prose, not open work; the archive entry is the newer, authoritative record. → engine.43 inherits this as a finished precondition, not a task.
- **Dials for voiced citizens ARE drifting live today, silently.** research.14's write-back (Seam C) shipped and self-sustains as of S277 — it already drained a 50-row backlog into 41 citizens' base dials, uniformly, with no special-case for the four voiced faces or the wider backfilled 43. → the premise behind "if dials drift, should the agent change" is not hypothetical; it's happening every cycle.
- **Half the sync mechanism Mike is asking for already exists — reuse it, don't invent it.** `lib/citizenDials.js:disposition()` is a pure function, live `DialState` → prose disposition string, and `citizen-wake.js` already calls it every wake. → the cheapest fix for "keep the agent's disposition current" is pointing the interview/Discord boot step at the same function instead of static `IDENTITY.md` prose — not a new subsystem.
- **The concrete open gap is narrow: interview + Discord surfaces are frozen at authoring time.** Nothing re-derives `IDENTITY.md`'s disposition section from current `DialState`, and nothing flags when the two diverge. Since dials now drift live (previous bullet), this divergence is an active, growing gap, not a one-time staleness.
- **"Does what the agent does feed the citizen back" — confirmed no, for both interview and Discord.** `/post-publish --type interview` (`.claude/skills/interview/SKILL.md:301`) does canon-ingest to the bay-tribune wiki plus a "citizen card refresh" — but that refresh (`buildCitizenCards.js`, `.claude/skills/post-publish/SKILL.md:135,146`) is Sim_Ledger-only appearance-count bumping, not a `LifeHistory`/dial write. Discord conversation has no capture path into canon at all. Only the built-in 24/7 wake reflection is wired into the dial pipeline — interview answers and Discord chat currently vanish from the citizen's own record once published.

**Not applicable / hazard:**
- **Canon-write gate precedent applies.** research.18 established that a Five-Goods-pillar citizen's dial-vector is a canon write needing Mike + Mara sign-off (`.claude/agents/citizen-voice-vinnie-keane/SKILL.md:13`). Any new path that lets interview/Discord content nudge dials needs an explicit answer on whether/how that gate extends to routine conversational content — this is not a technical default to pick alone.
- **Volume mismatch.** The wake loop rotates system-wide at a fixed cadence (~3×/day total, not per-citizen); interviews and Discord conversations happen on-demand and could hit one citizen far more often. Naive per-turn ledger writes risk diluting or swamping a canon-anchored disposition with conversational noise — any ingest design needs a filter or cap, not raw capture.
- **The immutable-canon section must stay untouched.** `IDENTITY.md`'s "ESTABLISHED CANON — immutable, never contradict" block (e.g. `citizen-voice-vinnie-keane/IDENTITY.md:13`) is a different section from "Your disposition" (`:21`). Any auto-sync mechanism must only ever touch the disposition section — never the immutable biography.
- **research.14 ROLLOUT row is stale.** `docs/engine/ROLLOUT_PLAN.md:116` still reads `in-progress` though the plan's own status entry declares the loop closed S277. Flagging here as a small drift, not fixing it in this file (that's a rollout-hygiene edit, separate from this research).

**Verdict:** `adopt` — two independently shippable halves, different risk tiers.
- **(a) low-risk, ready to plan now:** point the interview/Discord boot sequence at `lib/citizenDials.js:disposition()` against live `DialState` instead of static `IDENTITY.md` prose (or periodically regenerate just that section) — reuses proven, already-live code, adds no new canon-write surface.
- **(b) higher-risk, needs a Mike decision before planning specifics:** whether/how agent-generated interactions (interview answers, Discord chat) should ever write into `LifeHistory`/`DialState`, and under what gate given the pillar canon-write precedent. This is a scope call, not a mechanism call — surfacing it rather than defaulting.

**Ignited plans:** none yet. A `docs/plans/` doc for engine.43 follows once (b) is resolved with Mike; it will cite this file as `Research basis:` and point back here once filed.

---

## Applications (living)

- 2026-07-04 — Filed to answer Mike's direct engine.43 framing question this session (research-build).

---

## Changelog

- 2026-07-04 — Initial audit (S291, research-build). Corrected an in-conversation claim made before this file was written: research.14's write-back (Seam C) was reported as "gated/inert," which was true when the tier1-dial-essence-backfill plan's source list was last updated (2026-06-21) but is stale — the loop closed and went self-sustaining S277. This file reflects the verified current state.
