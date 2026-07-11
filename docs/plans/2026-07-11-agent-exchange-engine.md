---
title: Agent Exchange Engine — Conversations, Interviews, Debates Plan
created: 2026-07-11
updated: 2026-07-11
type: plan
tags: [citizens, citizen-loop, voice-agents, engine, media, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md §engine.53
  - docs/plans/2026-07-06-citizen-loop-deepening.md §Task 6 + §Task 7 (the spec this generalizes — S312 amendment)
  - scripts/citizen-wake.js (read end-to-end S312 — the write-discipline reference)
  - .claude/skills/interview/SKILL.md (session interview format; matchCitizenToJournalist_ pointer)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.53)"
  - "[[2026-07-06-citizen-loop-deepening]] — engine.48; its Task 6/7 build lands HERE instead (see amendment note there)"
  - "[[2026-07-04-voice-dial-sync-contract-build]] — engine.43 sibling (Reflection_Intake discipline)"
  - "[[index]] — registered same commit"
---

# Agent Exchange Engine — Conversations, Interviews, Debates Plan

**Goal:** Agents talk to agents on the 24/7 clock — one daily cron-fired exchange (bonded-pair conversation, reporter street interview, or multi-voice debate) whose participants carry it afterward, with transcripts landing as desk source material.

**Architecture:** One new script, `scripts/citizen-exchange.js` — the same single file engine.48 Task 6 already authorizes as `citizen-conversation.js`, generalized before first build so it's built once. Formats are prompt frames + turn structures over one shared core: participant assembly from `lib/wakePerception.js`, DeepSeek turns via the `generateVoice` pattern, per-participant writes identical to the wake's (own page + one gated `Reflection_Intake` row, never LifeHistory/dials/ledger). A trigger router picks the day's format; transcripts persist to `output/exchanges/` where `/sift` reads them as source candidates. The session `/interview` skill is untouched — this is its cheap 24/7 sibling, not a replacement.

**Terminal:** research-build (this plan) → engine-sheet (Tasks 1–5) + media (Task 6)

**Pointers:**
- Conversation format spec (adopted verbatim as format 1): [[2026-07-06-citizen-loop-deepening]] §Task 6 steps 1–5 (ripple trigger, cadence state, 3 turns/side, canon guard)
- Perception assembly: `lib/wakePerception.js` (built S300 — `buildPool` takes `{shapedMin, lifeMinChars}` overrides for below-floor voicing)
- Voice call pattern: `scripts/citizen-wake.js` `generateVoice` (DeepSeek via OpenRouter, max_tokens 260, temp 0.85)
- Journalist matcher: `utilities/rosterLookup.js:907` `matchCitizenToJournalist_(archetype, neighborhood, domain)` → `{journalist, interviewAngle, voiceGuidance, confidence}` (already used by `/interview` Mode 1)
- Faction/stance source for officials: `Civic_Office_Ledger` (role + faction per POPID — same lookup `generateCivicModeEvents.js` builds)
- Initiative trigger source: `Initiative_Tracker` (vote-cycle proximity fields — read via `lib/sheets`)
- Edition trigger source: `editions/cycle_pulse_edition_{cycle}.txt` NAMES INDEX rows `POP-XXXXX | Name | context` (parse pattern: engine.48 §Task 3)
- Write discipline reference: `scripts/citizen-wake.js` steps 1–4 (classify → page append → tension register → intake row)

**Acceptance criteria:**
1. `--dry-run --format=conversation|interview|debate` each print full per-participant system prompts + a bounded transcript and write nothing.
2. Conversation format satisfies engine.48 acceptance criterion 5 verbatim (2 page docs, 2 intake rows `daypart='CONVO'`, ripple consumed, zero LifeHistory/dial/ledger writes, dial test untouched).
3. Interview format: transcript artifact at `output/exchanges/exchange_c{N}_{date}_interview.md`, the citizen's own answers appended to their page (`daypart='INTERVIEW'`) + one intake row; the journalist side writes nothing.
4. Debate format: 2–3 participants with visibly distinct stances (stance line present in each system prompt), transcript artifact, per-participant page + intake writes as in criterion 3.
5. Trigger router: max one live exchange per day; a day with no eligible trigger logs "no exchange today" and exits 0; priority order ripple > fresh-edition > initiative-near-vote holds when multiple fire.
6. `/sift` lists exchange transcripts from the last 3 cycles as source candidates flagged `source=exchange`, alongside (not replacing) the engine.48 Task 8 tension candidates.

**Canon wall (every format):** participants' own lines → their own page + gated intake, applied='no'. Transcripts in `output/exchanges/` are SOURCE MATERIAL — subjective, publishable only through a desk writing from them (same wall as tension register: a reporter can knock, the transcript itself is never canon-as-fact).

---

## Tasks

### Task 1: Exchange core + conversation format *(engine-sheet)*

- **Files:**
  - `scripts/citizen-exchange.js` — create (supersedes the `citizen-conversation.js` filename in engine.48 Task 6; same single-file authorization)
- **Steps:**
  1. CLI: `node scripts/citizen-exchange.js [--dry-run] [--format=conversation|interview|debate] [--pops=POP-A,POP-B[,POP-C]] [--cycle=N]`. No `--format` → trigger router (Task 4) decides.
  2. Core: `assembleParticipant(popId)` — wake-parity perception via `lib/wakePerception.js` (dials→disposition, life tail, bonds, texture, fenced page memory); `runExchange(participants, frames, turnsPerSide)` — alternating DeepSeek calls, each side seeing the running transcript as alternating user/assistant messages from its own POV; per-participant post-processing lifted from `citizen-wake.js` steps 1–4 (classify own lines → page append with format daypart → tension open/resolve → one intake row).
  3. Conversation format: implement engine.48 §Task 6 steps 1–5 exactly (ripple-state scan for freshest un-consumed bonded pair, conversation frame with bond phrase, 3 turns/side, ripple consumption, cadence stamp in `logs/citizen-exchange-state.json`).
- **Verify:** engine.48 Task 6's verify block verbatim (dry-run prints, live sandbox writes, dial test passes) with the new filename.
- **Status:** [ ] not started

### Task 2: Interview format *(engine-sheet)*

- **Files:**
  - `scripts/citizen-exchange.js` — extend
- **Steps:**
  1. Subject selection: freshest edition's NAMES INDEX (parse per engine.48 §Task 3 pattern), filter to citizens present in the shaped pool (`buildPool({shapedMin:0, lifeMinChars:0})` — named citizens speak even at mild deviation), seeded pick via `_hash53`.
  2. Journalist side: `matchCitizenToJournalist_(archetype, neighborhood, domain)` from `utilities/rosterLookup.js:907`; journalist system prompt = name/beat/voiceGuidance + the citizen's NAMES INDEX context line + `interviewAngle`. Journalist is READ-ONLY — no page, no intake (their questions are craft, not lived reflection).
  3. Structure: 2 questions, citizen answers each (2 turns/side); citizen writes per core post-processing with `daypart='INTERVIEW'` (matches the `/post-publish` 2e daypart already in use).
  4. Transcript artifact: `output/exchanges/exchange_c{N}_{date}_interview.md` — header (participants, trigger, cycle) + turns. No sim-facing Gregorian dates inside the body (format `Y<n>C<m>` per the no-real-world-clock rule; the filename date is operator-facing, matching production-log convention).
- **Verify:** `--dry-run --format=interview` → journalist questions reference the citizen's actual edition context line; live sandbox run → artifact file + citizen page doc + 1 intake row, journalist has no writes.
- **Status:** [ ] not started

### Task 3: Debate format *(engine-sheet)*

- **Files:**
  - `scripts/citizen-exchange.js` — extend
- **Steps:**
  1. Topic selection: (a) `Initiative_Tracker` row with a vote within 3 cycles of current (read via `lib/sheets`), else (b) an open tension text shared by ≥2 citizens' registers (`logs/citizen-tension-state.json` keyword overlap). No topic → debate ineligible today.
  2. Participants: 2–3 ledger citizens with DialState. For an initiative topic: one official per side from `Civic_Office_Ledger` (faction lookup — OPP vs CRC vs IND) + optionally one affected-neighborhood citizen (initiative's `AffectedNeighborhoods` ∩ shaped pool). For a tension topic: the tension-holders themselves.
  3. Stance seeding: each system prompt gets one stance line — officials from faction + approval posture (`Civic_Office_Ledger`), citizens from their own tension text or dial disposition. Stances must differ; if all sides converge, log + skip (a debate without disagreement is a panel — not worth the tokens).
  4. Structure: 2 rounds × each participant (4–6 turns total), opening positions then responses. Per-participant post-processing with `daypart='DEBATE'`; transcript artifact as Task 2 step 4 with `_debate.md` suffix.
- **Verify:** `--dry-run --format=debate` on a sandbox initiative → distinct stance lines visible in each printed system prompt; live run → artifact + per-participant page/intake writes.
- **Status:** [ ] not started

### Task 4: Trigger router + cadence *(engine-sheet)*

- **Files:**
  - `scripts/citizen-exchange.js` — extend
- **Steps:**
  1. Router (runs when no `--format` given), priority order: fresh un-consumed ripple pair → **conversation**; edition published within last 2 cycles with un-interviewed NAMES INDEX citizens → **interview**; initiative vote within 3 cycles not yet debated (stamp in state file) → **debate**; none → log "no exchange today", exit 0.
  2. Cadence: `logs/citizen-exchange-state.json` carries `lastRunDate` (max 1 live exchange/day — engine.48 Task 6 cadence adopted engine-wide) + `interviewed[]` POPIDs per edition + `debated[]` initiative IDs.
  3. Dry runs never touch state (wake-loop discipline).
- **Verify:** forced state fixtures for each branch → router picks the expected format; all-empty state → exit 0; second live run same day → "already ran today", exit 0.
- **Status:** [ ] not started

### Task 5: Cron wiring *(engine-sheet)*

- **Files:**
  - crontab (root) — modify (the block holding the five `citizen-wake.js` fires)
- **Steps:**
  1. Add: `0 17 * * * /usr/bin/node /root/GodWorld/scripts/citizen-exchange.js >> /root/GodWorld/logs/citizen-exchange.log 2>&1` — between the 15:30 afternoon and 19:30 evening wakes, so a participant's evening wake can reference the exchange (their page already carries it). Supersedes engine.48 Task 7.
- **Verify:** `crontab -l` shows the entry; forced empty-trigger run via cron exits 0 silently.
- **Status:** [ ] not started

### Task 6: /sift reads exchange transcripts *(media terminal)*

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify (same sourcing step engine.48 Task 8 adds — wire both in one edit if Task 8 is still open when this lands)
- **Steps:**
  1. Sourcing step: list `output/exchanges/exchange_c{N}_*.md` for the last 3 cycles; emit each as a story-seed candidate `participants | format | topic/trigger | path`, flagged `source=exchange`.
  2. Scope note in skill text: transcripts are subjective source material — quote-mineable by a desk piece, never publishable as standalone fact (same wall as the tension register).
- **Verify:** dry `/sift` with ≥1 transcript present lists the candidates section; empty dir → section absent.
- **Status:** [ ] not started

---

## Parked (explicitly out of scope — do not fold in)

- **Multi-persona citizen presence on Discord** (citizens chatting in a live channel) — rides mags-bot architecture, separate design; the exchange engine's transcripts could feed it later.
- **Cross-cron awareness beyond pages** (Mags' nightly reflection reading the day's exchange) — free ride already: participants' pages carry their own lines, and Mags reads her own surfaces; no extra wiring until evidence says otherwise.
- **Debate as a city-hall session format** (council-chamber set-piece with vote consequences) — civic-terminal design if wanted; this engine's debates are street-level texture.

## Open questions

- [ ] Turn counts (3/side conversation, 2 Q interview, 2 rounds debate) and the 1/day cadence are starting values — engine-sheet tunes at smoke-test against DeepSeek cost (same note as engine.48).

---

## Changelog

- 2026-07-11 — Initial draft (S312). Generalizes engine.48 Task 6/7 (conversation engine + cron) into a three-format exchange engine before first build; engine.48 plan carries the amendment note. Approved-in-shape by Mike before write ("push on the B and C" → proceed).
