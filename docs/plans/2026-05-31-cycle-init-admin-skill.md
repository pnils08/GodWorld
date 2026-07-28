---
title: Cycle-Init Admin Skill + One-True-Cycle-Source Plan
created: 2026-05-31
updated: 2026-05-31
type: plan
tags: [pipeline, edition-pipeline, architecture, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md §pipeline.35 (this row) + §pipeline.32 (path-cascade tail this absorbs)
  - docs/EDITION_PIPELINE.md §Architecture + §Master Chain + §Production Log Lifecycle (S230 G-EPD3/G-EPD4)
  - docs/media/production_log_template.md (per-section unified-log spec)
  - .claude/skills/run-cycle/SKILL.md (cycle stage order; build-world-summary is Step 5, before city-hall-prep)
  - scripts/buildVoiceWorkspaces.js, buildDeskPackets.js, buildDecisionQueue.js, buildInitiativePackets.js (existing deterministic packet builders)
  - claude-mem 26024 (S248 — packet builder scripts & skill structure mapped)
  - Mike S248 directive (2026-05-31): admin skill should start the run, lay uniform templates/packets to a folder, one true prose-free cycle source
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (pipeline.35)"
  - "[[2026-05-24-governance-14-edition-pipeline-rewrite]] — production-log convention source (governance.14)"
  - "[[../EDITION_PIPELINE]] §Production Log Lifecycle — convention this implements"
  - "[[../media/production_log_template]] — per-section log spec the admin skill opens against"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Cycle-Init Admin Skill + One-True-Cycle-Source Plan

**Goal:** One cycle-init "admin" skill runs first each cycle — opens the single prose-free production log, lays a per-cycle folder + uniform packet/template scaffolds, reads carry-over + NEWSROOM_MEMORY — so every cycle-active skill writes its section into one canonical cycle source instead of scattered files.

**Architecture:** Today the cycle's artifacts scatter across `output/` (a civic split log `production_log_city_hall_c{XX}.md`, a media log `production_log_c{XX}.md`, plus packet dirs `civic-voice-workspace/`, `desk-packets/`, `initiative-packets/`) and four deterministic packet scripts (`buildVoiceWorkspaces`, `buildDeskPackets`, `buildDecisionQueue`, `buildInitiativePackets`) are invoked piecemeal inside `/city-hall-prep` + `/sift`. This plan adds a single cycle-init step that establishes the cycle's home (`output/cycle_c{XX}/`), opens the one true `production_log_c{XX}.md`, loads carry-over + standing newsroom conventions, and lays the uniform scaffolds the downstream skills fill. It does **not** replace the engine half of `/run-cycle`; it sits at the cycle-open boundary the log-opener belongs to. `pipeline.32` (the per-skill path swap to the unified log) is the forward-compatible execution tail of this design and ships first/interim.

**Terminal:** research-build / engine-sheet

**Pointers:**
- Prior work: `pipeline.32` (path-swap tail — ships interim, city-hall-prep stays opener until this skill relieves it); `governance.14` edition-pipeline rewrite (convention source); `governance.26` SESSION_CONTEXT log redesign (sibling "log smarter" theme — *different* log, same discipline)
- Related plan: [[2026-05-24-governance-14-edition-pipeline-rewrite]]
- Research basis: claude-mem 26024 (packet builders mapped, S248); EDITION_PIPELINE §Master Chain

**Locked decision (Mike S248):** **City-hall stays post-engine.** The engine runs cycle N → `/build-world-summary` produces cycle-N truth → city-hall reacts to *that fresh* summary → its voice outputs feed cycle N+1's run math. The pre-engine alternative (city-hall votes, then the engine simulates consequences same-cycle) was considered and rejected: it would have city-hall reacting to the *stale prior* summary, which is the nonsense case. Cycle order is unchanged by this plan — only the log-opener and the scaffolding move.

**Acceptance criteria:**
1. A cycle-init skill exists and, run at cycle-open, creates `output/cycle_c{XX}/`, opens `production_log_c{XX}.md` with the §Cycle Header per `docs/media/production_log_template.md`, and writes the §Carry-Forward + §Tracker/Approval snapshots.
2. The four existing packet scripts run from (or are orchestrated by) the cycle-init skill where their inputs are available at cycle-open (initiative packets are prior-cycle-fed → run at T0); voice/desk packets remain filled by their owning skills when this-cycle inputs land (world summary, sift picks).
3. Every cycle-active skill (civic + media, incl. `/dispatch` `/interview` `/write-supplemental` `/podcast`) appends its named section to the one `production_log_c{XX}.md`; no separate `production_log_city_hall_c{XX}.md` or `production_log_edition_c{XX}.md` is created (legacy dual-read fallback retained for the transition window per pipeline.32 item (d)).
4. NEWSROOM_MEMORY standing conventions are loaded once at cycle-open rather than re-derived per skill.
5. One run of a full cycle produces a single per-cycle folder + single production log a fresh session can read top-to-bottom to reconstruct the whole cycle without prose.

---

## The T0-availability constraint (design-shaping — read before tasking)

The admin skill **cannot build all packets up front** — some inputs don't exist at cycle-open:

| Artifact | Input source | Available at cycle-open (T0)? |
|---|---|---|
| Initiative packets (`buildInitiativePackets`) | *prior*-cycle outputs (`mara_directive_c{XX-1}`, `decisions_c{XX-1}`, `civic-voice/*_c{XX-1}`) | ✅ yes — runs at T0 |
| §Carry-Forward + tracker/approval snapshots | prior-cycle log §Closing Block + sheets | ✅ yes |
| Voice packets / workspaces (`buildVoiceWorkspaces`, `buildDecisionQueue`) | this-cycle world summary + engine review | ❌ no — produced by `/build-world-summary` (run-cycle Step 5) |
| Desk packets (`buildDeskPackets`) | this-cycle sift story picks | ❌ no — produced by `/sift` |

So the admin skill lays the **uniform containers + carry-over + folder + log + T0-ready packets**; each downstream skill fills its content packet when its inputs land. The design is "prep the uniform shells up front," not "build all content up front."

---

## Tasks

> Tasks are research-build's to refine at design-review — this plan is the spec handoff Mike asked for, not a frozen execution order. Granularity is coarser than the 2–5 min ideal where a step is a genuine design decision (flagged ⚙). Concrete edits are sized normally.

### Task 1: Decide the cycle-init skill's seat ⚙
- **Files:** `.claude/skills/run-cycle/SKILL.md` (read), `docs/EDITION_PIPELINE.md` §Master Chain (read)
- **Steps:**
  1. Decide: is cycle-init a **new first step of `/run-cycle`** (engine-sheet hosts run-cycle; cycle-open is engine-adjacent), or a **standalone skill** that fires before `/city-hall-prep` (civic-adjacent)? The log-opener moving off `/city-hall-prep` is the forcing function either way.
  2. Record the decision + rationale in this plan + EDITION_PIPELINE Master Chain.
- **Verify:** Master Chain shows the cycle-init step at the correct position with a terminal tag.
- **Status:** [ ] not started

### Task 2: Define the per-cycle folder layout ⚙
- **Files:** this plan (spec), `docs/media/production_log_template.md` (cross-ref)
- **Steps:**
  1. Decide `output/cycle_c{XX}/` contents: `production_log.md`, `voice-packets/`, `desk-packets/`, `initiative-packets/`, the cycle gap log — vs keeping current top-level `output/` dirs and only unifying the log. (Trade-off: a per-cycle folder is cleaner "one home" but touches every script's output path; log-only unification is lower-blast-radius.) **Gap-log naming is NOT an open question (RB-1/RB-2, S256):** the cycle gap log is the pinned one-true-log `output/production_log_run_cycle_c{XX}_gaps.md` (sidecar naming retired) — see [[GAP_LOG_TEMPLATE]] §Migration. The only decision here is its *location* (top-level vs inside the per-cycle folder), and whether this admin skill opens it (it currently is opened by the engine cycle audit). Adopt the convention; don't re-spec it.
  2. Spec the chosen layout here.
- **Verify:** layout table in this plan; every packet script's output path accounted for.
- **Status:** [ ] not started

### Task 3: Author the cycle-init skill
- **Files:** `.claude/skills/cycle-init/SKILL.md` — create (name per Task 1 decision)
- **Steps:**
  1. Open `production_log_c{XX}.md` (or `cycle_c{XX}/production_log.md`) with §Cycle Header + §Carry-Forward + §Tracker Snapshot + §Approval Ratings Snapshot per `docs/media/production_log_template.md`.
  2. Read carry-over: prior cycle's §Closing Block (with legacy split-log fallback per pipeline.32 item (d)).
  3. Load NEWSROOM_MEMORY standing conventions (`docs/mags-corliss/NEWSROOM_MEMORY.md` §Standing Editorial Conventions).
  4. Run the T0-ready packet build (`buildInitiativePackets.js`) and lay the uniform template skeletons for the not-yet-fillable packets.
- **Verify:** skill runs against a test cycle → folder + log + header + carry-forward + initiative packets present; `/reload-skills` clean.
- **Status:** [ ] not started

### Task 4: Re-point `/city-hall-prep` from opener to appender
- **Files:** `.claude/skills/city-hall-prep/SKILL.md` — modify
- **Steps:**
  1. Remove the "create `production_log_*`" step (now owned by cycle-init); change to "append §/city-hall-prep section to the log cycle-init opened."
  2. Keep its voice-packet build (`buildVoiceWorkspaces`/`buildDecisionQueue`) — those need the world summary, fill post-build-world-summary as today.
- **Verify:** city-hall-prep no longer creates a log; appends a conforming section.
- **Status:** [ ] not started

### Task 5: Extend the unified-log section to the non-edition skills
- **Files:** `.claude/skills/dispatch/SKILL.md`, `interview/SKILL.md`, `write-supplemental/SKILL.md`, `podcast/SKILL.md` — modify
- **Steps:**
  1. Repoint each from `production_log_edition_c{XX}.md` → unified `production_log_c{XX}.md`, append a named section (legacy dual-read fallback during transition).
  2. `/interview` already has the fallback pattern — align the others to it.
- **Verify:** grep shows no `production_log_edition_c` / `production_log_city_hall_c` write-targets remain in cycle-active skills (reads may retain fallback).
- **Status:** [x] DONE S248 (folded out of pipeline.35 into the pipeline.32 sweep, Mike-directed). All 4 repointed to unified `production_log_c{XX}.md` with named sections (`## /dispatch — {slug}`, `## /interview`, `## /write-supplemental`, `## /podcast — {format}`); civic reads → `## /city-hall` section + legacy fallback; NEWSROOM_MEMORY reads added to /dispatch + /podcast (interview + supplemental already had them); template add-on-sections block added. Gap-log sidecars left = pipeline.34.

### Task 6: NEWSROOM_MEMORY tie-in ⚙
- **Files:** `docs/mags-corliss/NEWSROOM_MEMORY.md` (read; media-owned — coordinate), this plan
- **Steps:**
  1. Decide what (if anything) the cycle-init load writes *back* to NEWSROOM_MEMORY vs read-only-at-open. Per Mike: the goal is stories cohering in a cycle — confirm whether per-cycle coherence is a read (conventions in) or also a write (the closing block feeds NEWSROOM_MEMORY errata, which `/post-publish` may already do).
  2. Spec the read/write contract.
- **Verify:** contract documented; no duplicate-write with `/post-publish`'s existing NEWSROOM_MEMORY errata append.
- **Status:** [ ] not started

### Task 7: Update EDITION_PIPELINE + production_log_template
- **Files:** `docs/EDITION_PIPELINE.md`, `docs/media/production_log_template.md` — modify
- **Steps:**
  1. EDITION_PIPELINE Master Chain + §Production Log Lifecycle: record cycle-init as the opener, demote `/city-hall-prep` to appender, mark the convention as implemented (not just target).
  2. production_log_template: change "/city-hall-prep at open writes the §Cycle Header" → "cycle-init at open writes the §Cycle Header."
- **Verify:** both docs name cycle-init as opener; no residual "city-hall-prep opens" claim.
- **Status:** [ ] not started

---

## Open questions

- [ ] Cycle-init seat: new `/run-cycle` first step vs standalone pre-`/city-hall-prep` skill? (blocks Task 1, cascades to 3)
- [ ] Per-cycle folder (`output/cycle_c{XX}/`) vs log-only unification keeping current top-level dirs? (blocks Task 2 — blast-radius trade-off)
- [ ] Does NEWSROOM_MEMORY get a *write* from the cycle (closing-block coherence), or is `/post-publish`'s existing errata append the only write surface? (blocks Task 6)
- [ ] Sequencing vs `governance.26`: both are "log smarter" redesigns. Confirm no collision between the per-cycle production log home and the SESSION_CONTEXT/session-context folder convention.

---

## Status log

### pipeline.35 — status (drained from ROLLOUT, 2026-06-26 / S274)

Cycle-init "admin" skill + one-true-cycle-source — a single skill runs first each cycle: opens the one prose-free `production_log_c{XX}.md`, creates a per-cycle folder, lays uniform packet/template scaffolds, reads carry-over + NEWSROOM_MEMORY standing conventions, runs the T0-ready packet build. Every cycle-active skill (civic + media incl. /dispatch /interview /write-supplemental /podcast) appends its named section to the one log; no separate `production_log_city_hall`/`_edition` files. Consolidates 4 existing deterministic packet scripts (`buildVoiceWorkspaces`/`buildDeskPackets`/`buildDecisionQueue`/`buildInitiativePackets`). Surfaced during the `pipeline.32` audit — uncovered the **log-opener conflict** (`/build-world-summary` is run-cycle Step 5, before `/city-hall-prep`, so city-hall-prep can't own "open"). **Cycle order LOCKED (Mike S248): city-hall stays post-engine** (reacts to fresh cycle-N world summary, feeds N+1 — pre-engine rejected as the stale-summary nonsense case). T0-availability constraint: admin skill preps uniform shells + carry-over + initiative packets (prior-cycle-fed); voice/desk packets fill when this-cycle inputs land (world summary, sift picks). **`pipeline.32` is the forward-compatible path-swap tail that ships interim** (city-hall-prep stays opener until this skill relieves it). Plan handed to research-build for design-review (4 open questions: skill seat / folder layout / NEWSROOM_MEMORY read-vs-write / governance.26 collision).

## Changelog

- 2026-05-31 — Initial draft (S248, engine-sheet authored at Mike's direction for research-build review). Surfaced during `pipeline.32` audit: the path-cascade uncovered (a) the log-opener conflict (build-world-summary runs before city-hall-prep, so city-hall-prep can't own "open"), and (b) Mike's directive to make the one production log the true prose-free cycle source with uniform packet scaffolding via an admin skill. Cycle order (city-hall post-engine) locked by Mike same session. `pipeline.32` proceeds as the interim path-swap tail; this plan is the consolidation it folds into.

---

## Relocated ROLLOUT_PLAN row detail — 2026-07-02 (S286 pointer-collapse)

Verbatim rows moved out of ROLLOUT_PLAN.md when it collapsed to pointer-only. This is the working detail for the open job(s); the rollout row is one line pointing here.

### pipeline.35

| pipeline.35 | Cycle-init "admin" skill + one-true-cycle-source — a single skill runs first each cycle: opens the one prose-free `production_log_c{XX}.md`, creates a per-cycle folder, lays uniform packet/template scaffolds, reads carry-over + NEWSROOM_MEMORY standing conventions, runs the T0-ready packet build. Every cycle-active skill (civic + media incl. /dispatch /interview /write-supplemental /podcast) appends its named section to the one log; no separate `production_log_city_hall`/`_edition` files. Consolidates 4 existing deterministic packet scripts (`buildVoiceWorkspaces`/`buildDeskPackets`/`buildDecisionQueue`/`buildInitiativePackets`). Surfaced during the `pipeline.32` audit — uncovered the **log-opener conflict** (`/build-world-summary` is run-cycle Step 5, before `/city-hall-prep`, so city-hall-prep can't own "open"). **Cycle order LOCKED (Mike S248): city-hall stays post-engine** (reacts to fresh cycle-N world summary, feeds N+1 — pre-engine rejected as the stale-summary nonsense case). T0-availability constraint: admin skill preps uniform shells + carry-over + initiative packets (prior-cycle-fed); voice/desk packets fill when this-cycle inputs land (world summary, sift picks). **`pipeline.32` is the forward-compatible path-swap tail that ships interim** (city-hall-prep stays opener until this skill relieves it). Plan handed to research-build for design-review (4 open questions: skill seat / folder layout / NEWSROOM_MEMORY read-vs-write / governance.26 collision). | ready | research-build / engine-sheet | [[../plans/2026-05-31-cycle-init-admin-skill]]; absorbs [[../plans/2026-05-24-governance-14-edition-pipeline-rewrite]] convention; folds `pipeline.32` as execution tail. |

