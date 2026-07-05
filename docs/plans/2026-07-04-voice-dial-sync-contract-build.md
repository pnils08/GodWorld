---
title: Voice-Dial Sync Contract Build Plan
created: 2026-07-04
updated: 2026-07-04
type: plan
tags: [citizens, dials, citizen-loop, voice-agents, engine, draft]
sources:
  - docs/adr/0014-citizen-self-authorship-live-drift.md — the decision this plan executes
  - docs/research/2026-07-04-voice-dial-sync-contract.md — the audit + evidence base
  - docs/engine/ROLLOUT_PLAN.md — engine.43 row
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.43"
  - "[[../adr/0014-citizen-self-authorship-live-drift]] — Research/decision basis"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
---

# Voice-Dial Sync Contract Build Plan

**Goal:** Every surface where a voiced citizen appears (24/7 wake, `/interview`, Discord) reads the same live current dial state, and what that citizen does on any surface becomes real lived history for them — closing both directions of the sync contract named in `engine.43`.

**Architecture:** Two independent tracks, both reusing existing live machinery rather than building new subsystems. **Track A (read direction):** interview/Discord boot currently loads a static `IDENTITY.md` disposition block; swap it for a periodically-refreshed cache derived from live `DialState` via the same `lib/citizenDials.js:disposition()` call the wake loop already uses. **Track B (write direction):** interview answers and Discord replies get classified with the existing dual-tag classifier and appended to `Reflection_Intake` in the exact row shape the wake loop already writes, so the already-live S277 drain picks them up — no new drain code, only new writers into an existing pipeline.

**Terminal:** research-build (this plan) → engine-sheet (build/deploy)

**Pointers:**
- Prior work: [[../research/2026-07-04-voice-dial-sync-contract]]
- Decision: [[../adr/0014-citizen-self-authorship-live-drift]]
- Superseded plan section: [[2026-06-16-tier1-character-voice-agents]]:180 (base-lock, Phase 3 — no longer designed toward; see Task 6)
- Related live infra: [[2026-06-04-mags-citizen-loop]] (research.14, the drain this plan's Track B feeds)

**Acceptance criteria:**
1. Running `scripts/refreshVoiceDispositionCache.js` for a POPID with a non-neutral live `DialState` produces a disposition phrase that matches calling `lib/citizenDials.js:disposition()` directly on the same `DialState` JSON.
2. A citizen-voice agent's boot sequence, run after a cache refresh, reads the fresh disposition phrase — not the founding `IDENTITY.md` prose — while the `IDENTITY.md` "ESTABLISHED CANON" section is provably untouched (diff shows zero change to that section across any number of refreshes).
3. One full Discord conversation session (opened → idle-timeout elapsed) produces exactly one `Reflection_Intake` row for that citizen, `daypart='DISCORD'`, `applied='no'` — not one row per message.
4. One `/interview` transcript produces exactly one `Reflection_Intake` row per citizen interviewed, `daypart='INTERVIEW'`, `applied='no'`.
5. The next `compressLifeHistory_` cycle drains both new-daypart rows into `DialState.base` exactly as it already drains `WAKE` rows — no drain-code change required, verified by the existing `compressLifeHistory.dial.test.js` suite still passing untouched.
6. No conversational prose (Discord message text or interview Q&A prose) is written to a citizen's Supermemory narrative page as a result of this plan — `lib/personaProvider.js`'s page-write path stays exactly as scoped today.

---

## Tasks

### Task 1: Build the disposition-cache generator

- **Files:**
  - `scripts/refreshVoiceDispositionCache.js` — create
- **Steps:**
  1. Enumerate voiced-agent POPIDs by reading `POP ID:` out of each `.claude/agents/citizen-voice-*/IDENTITY.md` (glob the four directories today; agent-count-agnostic per ADR-0014, so a fifth agent added later needs no code change here).
  2. For each POPID, read `DialState` from `Simulation_Ledger` via `lib/sheets.js` (same read pattern `citizen-wake.js` uses).
  3. Compute the disposition phrase via `lib/citizenDials.js:disposition(currentDials(json))`.
  4. Write one cache file per citizen: `output/voice-disposition-cache/<POPID>.md` — plain text, the phrase plus a `Refreshed: c<cycle>` stamp.
- **Verify:** `node scripts/refreshVoiceDispositionCache.js --dry-run` → prints the phrase for all 4 POPIDs; spot-check POP-00001 against `node -e "console.log(require('./lib/citizenDials').disposition(...))"` on the same live JSON — strings match exactly.
- **Status:** [ ] not started

### Task 2: Wire cache refresh to the cycle

- **Files:**
  - `scripts/refreshVoiceDispositionCache.js` — modify (add live-write mode)
  - cron/PM2 config (wherever `citizen-wake.js`'s existing cron entry lives) — modify
- **Steps:**
  1. Add a `--live` flag that actually writes the cache files (Task 1 built dry-run only).
  2. Hook the live refresh to run once per engine cycle close (alongside or immediately after the existing Phase-10 commit), so the cache is never more than one cycle stale.
- **Verify:** trigger one cycle close in sandbox; confirm all 4 cache files' `Refreshed:` stamp advances to the new cycle number.
- **Status:** [ ] not started

### Task 3: Point citizen-voice agent boot at the live cache

- **Files:**
  - `.claude/agents/citizen-voice-vinnie-keane/SKILL.md` — modify
  - `.claude/agents/citizen-voice-benji-dillon/SKILL.md` — modify
  - `.claude/agents/citizen-voice-deacon-seymour/SKILL.md` — modify
  - `.claude/agents/citizen-voice-elias-varek/SKILL.md` — modify
- **Steps:**
  1. Add a boot step (after IDENTITY.md read): "Read `output/voice-disposition-cache/<your POPID>.md` — this is your CURRENT disposition, more current than the disposition list in IDENTITY.md. If it's missing, fall back to IDENTITY.md's authored disposition (fail-open, same pattern as `augment()` in `lib/personaProvider.js`)."
  2. Add one sentence clarifying scope: the cache only ever supersedes the "Your disposition" section; `ESTABLISHED CANON` in IDENTITY.md is never superseded by anything.
- **Verify:** manual read-through of all 4 updated `SKILL.md` files; confirm the added step names the fail-open fallback and the canon-section carve-out explicitly.
- **Status:** [ ] not started

### Task 4: Session-boundary batching for Discord ingest

- **Files:**
  - `lib/personaProvider.js` — modify (`persistResponse` function, currently a no-op at line 173)
  - `scripts/mags-discord-bot.js` — modify (per-channel session-idle tracking, near the existing `persistResponse` call at line 822)
- **Steps:**
  1. Accumulate a citizen-voice channel's exchanges in the existing per-channel history structure (already tracked for chat continuity) rather than dispatching per message.
  2. On a channel-idle flush trigger (recommend: 30 minutes of no new message on that channel — mirrors the wake loop's own coarse, infrequent cadence rather than inventing a new constant class), classify the accumulated exchange as one unit via `lib/reflectionClassifier.js:classifyDualReflection_`.
  3. Append one row to `Reflection_Intake`: `[ts, popId, cycle, 'DISCORD', cls.event, snippet, 'no', cls.affect]` — same shape as `citizen-wake.js:498`, `daypart='DISCORD'` in place of `WAKE`.
  4. Confirm no change to `persistResponse`'s page-write behavior — it still never writes conversational prose to the Supermemory citizen page (ADR-0014 explicitly keeps this boundary).
- **Verify:** simulate one conversation (several messages, then a synthetic idle gap) in sandbox; confirm exactly one `Reflection_Intake` row appended, `applied='no'`, and zero writes to the citizen's Supermemory page.
- **Status:** [ ] not started

### Task 5: Interview-transcript ingest

- **Files:**
  - `.claude/skills/interview/SKILL.md` — modify (add a post-transcript step, same slot pattern as the existing citizen-card-refresh substep)
- **Steps:**
  1. After transcript finalization, for each citizen-voice agent interviewed, classify that citizen's own answers (not the reporter's questions) via `classifyDualReflection_`.
  2. Append one `Reflection_Intake` row per citizen interviewed: `daypart='INTERVIEW'`, same schema as Task 4.
  3. Gate this substep in the `/post-publish` verification matrix the same way the existing interview substeps are gated (per `.claude/skills/post-publish/SKILL.md`'s matrix pattern).
- **Verify:** run one interview offline; confirm one `Reflection_Intake` row per citizen-voice subject, `applied='no'`, no duplicate rows on a second dry-run of the same transcript (idempotency check, same class as the existing `applied` guard).
- **Status:** [ ] not started

### Task 6: Retire the superseded base-lock language

- **Files:**
  - `docs/plans/2026-06-16-tier1-character-voice-agents.md` — modify (Phase 3 description + the `research.16` ROLLOUT-row mirror inside the file)
  - `docs/engine/ROLLOUT_PLAN.md` — modify (engine.43 row: point to this plan + ADR-0014)
- **Steps:**
  1. In the tier1-character-voice-agents plan, mark the base-lock line (§180-ish, "authored base is LOCKED... needs engine-sheet base-lock mechanism") as **superseded by ADR-0014** — do not delete the historical record, annotate it.
  2. Update the `engine.43` ROLLOUT_PLAN.md row to point at this plan doc + ADR-0014 instead of the bare Mike-direct-S286 pointer.
- **Verify:** `grep -n "base-lock\|LOCKED" docs/plans/2026-06-16-tier1-character-voice-agents.md` → the only hits are annotated as superseded, none read as a live instruction.
- **Status:** [ ] not started

---

## Open questions

- [ ] Exact idle-timeout constant for Task 4's session-boundary flush (proposed: 30 min) — engine-sheet can tune at smoke-test time against real Discord usage patterns; not a blocker to starting the build.

---

## Changelog

- 2026-07-04 — Initial draft (S291, research-build). Executes ADR-0014. Both tracks scoped against already-live infra (`citizenDials.disposition()`, `classifyDualReflection_`, `Reflection_Intake`, the S277 drain) — no new subsystem, only new callers into existing ones.
