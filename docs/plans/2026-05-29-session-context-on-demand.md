---
title: SESSION_CONTEXT On-Demand Log Redesign
created: 2026-05-29
updated: 2026-05-29
type: plan
tags: [architecture, infrastructure, boot-arch, governance, draft]
sources:
  - docs/archive/plans/2026-05-29-c95-gap-log-triage.md §RB-6 (origin — design direction extracted here)
  - output/production_log_session_end_c95_gaps.md (G-SE5 — SESSION_CONTEXT 98KB, rotation opt-in never fires)
  - output/production_log_session-startup_c95_gaps.md (G-SS5 — boot read cost)
  - docs/archive/plans/2026-05-23-session-end-collapse.md (sessionEndMechanical.js — where snapshot+reset lands)
  - docs/BOOT_ARCHITECTURE.md (boot-handoff primitive this changes)
  - S243 Mike directive — "session that spans soft closes; hard close ends it; snapshot SESSION_CONTEXT_S## wiki-referenceable; auto-boot is contingent-relevance noise; on-demand document"
pointers:
  - "[[TEMPLATE]] — plan shape"
  - "[[../engine/ROLLOUT_PLAN]] — single pointer row (governance.26)"
  - "[[archive/plans/2026-05-29-c95-gap-log-triage]] — RB-6 points here; origin of the concept"
  - "[[../BOOT_ARCHITECTURE]] — boot sequence this rewrites"
  - "[[../index]] — registered same commit"
---

# SESSION_CONTEXT On-Demand Log Redesign

**Goal:** Turn `SESSION_CONTEXT.md` from an always-loaded boot primitive into an on-demand wiki document — a session-span captured between hard closes, snapshotted to a numbered `SESSION_CONTEXT_S<##>.md` at hard close, pulled only when a session continues prior work — so the boot stops carrying contingent-relevance noise and the file stops growing unbounded.

**Architecture:** Today every soft close appends a STATUS paragraph to `SESSION_CONTEXT.md`; the file is always-loaded (hook reads ~80 lines) and has grown to ~98KB because the `--rotate-history` mechanism is opt-in and never fires (G-SE5). The reframe (S243 Mike): the unit is a **span** (soft closes between hard closes = one episode), capture is warranted but auto-injection is noise because whether the last span matters is decided by the *next* session (continuation vs pivot), unknowable at write-time. After this change the boot carries only the always-true mechanical slice it already has — `<godworld-state>` (terminal/cycle/session) + the Shipped Last Session block (git log) + ROLLOUT (canonical next-priority) + a one-line "last span" pointer — and the rich STATUS narrative becomes a normal on-demand doc, pulled when a session resumes prior work. **First of a three-part log-system redesign** (Mike S243: "similar one for rollout and journal") — SESSION_CONTEXT is the pilot; ROLLOUT and JOURNAL follow as sibling plans, and the shared pattern may earn a parent ADR once all three are designed.

**Terminal:** research-build (ADR + hook + CLAUDE.md + TERMINAL.md + skill text + convention) + engine-sheet (`sessionEndMechanical.js` snapshot+reset + span-length guard).

**Pointers:**
- Origin: [[archive/plans/2026-05-29-c95-gap-log-triage]] §RB-6 (concept captured there; this plan extracts + commits to it).
- Mechanics home: [[archive/plans/2026-05-23-session-end-collapse]] (`scripts/sessionEndMechanical.js`).
- Boot spec: [[../BOOT_ARCHITECTURE]].
- Sibling plans (to come): ROLLOUT on-demand redesign, JOURNAL on-demand redesign.

**Decisions (S243 defaults — Mike can override; resolved so the plan ships buildable):**
- **D1 — Boot drops the SESSION_CONTEXT body read entirely.** Not a trimmed slice. Anything a "Priority slice" would keep duplicates ROLLOUT (canonical next-priority). Boot orientation = `<godworld-state>` + Shipped block + ROLLOUT + a one-line greeting pointer to the live span. (Resolves RB-6 open-Q a.)
  - **D1 PREMISE CORRECTION (S248, verified at execution):** the plan-as-drafted assumed the Shipped block was already a boot primitive the model would still see after the read drops. It is NOT — two empirical facts contradict the draft: (a) `session-startup-hook.sh` never emitted the `## Shipped Last Session` block (it only emits `<godworld-state>`: session/day/cycle/terminal); (b) governance.18(b) (S238) physically relocated the Shipped block to ~line 177 of SESSION_CONTEXT.md, OUTSIDE the 80-line boot read window. So **today's actual boot handoff is the STATUS paragraphs (lines 5–76, inside the 80-line read), not the Shipped block.** Dropping the read therefore removes the only handoff the model currently sees. **Resolution (consistent with D1's intent):** the hook must START emitting the Shipped block. The hook already reads SESSION_CONTEXT.md for the session/day/cycle counters; it gains an `awk` extraction of the existing `## Shipped Last Session` section (maintained mechanically by `writeShippedBlock.js` at close) and emits it inside `<godworld-state>`. No new script. **Keystone constraint:** the hook-emits-Shipped change and the boot-read-drop MUST land in the same commit — otherwise there is a boot with no handoff at all. This moves to Task 3.
- **D2 — Snapshots are separate numbered files** in `docs/session-context/` (folder registered once in index; individual snapshots referenced by path/ID, NOT indexed individually — avoids index bloat). `SESSION_CONTEXT_S<##>.md` where `##` = the session at which the hard close happens; the file header records the span range (e.g. "Span S242–S245"). (Resolves RB-6 open-Q b.) Reconciles with the existing `SESSION_HISTORY.md` rotation target — see Task 5.
- **D3 — Continuation discovery = greeting pointer + "resume/continue" convention.** Boot greeting carries "Last span: SESSION_CONTEXT.md (live) · last snapshot docs/session-context/S<##>.md". CLAUDE.md "If Mike says resume" extends to "read the live SESSION_CONTEXT span." A pivoting session ignores it; a continuing session pulls it. (Resolves RB-6 open-Q c.)
- **D4 — Growth is bounded by span length, accepted with a guard.** A soft-cap nudge fires (in the greeting / at soft close) when the live file exceeds a threshold OR ≥3 soft closes have chained, reinforcing the existing TERMINAL.md "≥3 chained soft closes → hard close" rule. (Resolves RB-6 open-Q d.)

**Acceptance criteria:**
1. Hard close produces a numbered `docs/session-context/S<##>.md` snapshot and resets the live `SESSION_CONTEXT.md` to a thin header (Next-Priority pointer + "last snapshot" pointer), not empty.
2. A fresh boot reads NO SESSION_CONTEXT body — orientation is `<godworld-state>` + Shipped block + ROLLOUT + the one-line last-span greeting pointer. Verified by inspecting an actual boot's injected context.
3. A continuing session pulls the live span on demand (greeting pointer / "resume" convention); a pivoting session is not burdened with it.
4. ADR records the always-load → on-demand reversal + rejected alternatives (keep-auto-boot; rotate-default-only).
5. Live `SESSION_CONTEXT.md` cannot silently grow to 98KB again — the span-length guard nudges hard-close before that.

---

## Tasks

### Task 1: ADR — SESSION_CONTEXT always-load → on-demand (research-build)

- **Files:**
  - `docs/adr/0009-session-context-on-demand.md` — create.
  - `docs/index.md` — add entry (same commit).
- **Steps:**
  1. Write ADR-0009 per ADR-0001/0007/0008 shape: context (G-SE5 98KB + contingent-relevance argument), decision (span unit + numbered on-demand snapshot + boot drops the read + hook becomes the Shipped-block carrier per D1 premise correction), rejected alternatives (keep auto-boot; rotate-default-only crude fix), reversal triggers, the D1–D4 decisions. Note it's the pilot of the three-part log-system redesign.
  2. Register in index.
- **Verify:** ADR-0009 in `docs/adr/`; index entry present.
- **Status:** [x] DONE S248.

### Task 2: Snapshot + reset at hard close (engine-sheet)

- **Files:**
  - `scripts/sessionEndMechanical.js` — modify.
  - `docs/session-context/` — create folder + README (folder convention).
- **Steps:**
  1. Add a hard-close step: copy live `SESSION_CONTEXT.md` → `docs/session-context/S<##>.md` (## = current session number); prepend a `# Span S<start>–S<##> (closed S<##>, YYYY-MM-DD)` header.
  2. Reset live `SESSION_CONTEXT.md` to the thin header template: title + Next-Priority pointer (to ROLLOUT) + "Last snapshot: docs/session-context/S<##>.md" pointer + the `## Shipped Last Session` block. No accumulated STATUS paragraphs.
  3. Soft close: unchanged append behavior to the live file (the span accumulates).
  4. `docs/session-context/README.md` — one-paragraph folder convention (numbered span snapshots, referenced by path, not individually indexed).
- **Verify:** dry-run a hard close on a copy → snapshot file created with span header; live file reset to thin header; soft close still appends.
- **Status:** [ ] not started

### Task 3: Boot drops the SESSION_CONTEXT read (research-build)

- **Files:**
  - `.claude/hooks/session-startup-hook.sh` — modify.
  - `CLAUDE.md` — modify (§Boot + lifecycle).
  - `.claude/terminals/{media,civic,research-build,engine-sheet}/TERMINAL.md` — modify Always-Load tables.
  - `.claude/skills/session-startup/SKILL.md` — modify Step 4.
- **Steps:**
  0. **(S248 keystone, do FIRST in the same commit per D1 premise correction)** Hook: add an `awk` extraction of the `## Shipped Last Session` section from SESSION_CONTEXT.md and emit it inside `<godworld-state>`, so the mechanical handoff survives the read drop. The block is bounded by its `## Shipped Last Session` header and the next `## ` header (or EOF). Degradation: if the section is absent, emit nothing (boot still works).
  1. Hook: remove the "Read SESSION_CONTEXT.md with limit 80" line from all 4 boot-sequence case branches; emit a one-line "Last span: SESSION_CONTEXT.md (live)" pointer in the greeting instead (D3).
  2. CLAUDE.md: replace "Read this file at the start of every session" premise — SESSION_CONTEXT is on-demand; boot orientation is `<godworld-state>` (now carrying the Shipped block) + ROLLOUT.
  3. Four TERMINAL.md Always-Load tables: SESSION_CONTEXT row → "on-demand (pull live span when continuing prior work; the hook emits the Shipped block at boot)."
  4. session-startup SKILL.md Step 4: "compact SESSION_CONTEXT" → "pull live span doc only if continuing prior work."
- **Verify:** run the hook directly (`TMUX_PANE` unset → Mags-only path; or set per-terminal) and confirm stdout `<godworld-state>` carries the Shipped block + no "Read SESSION_CONTEXT" instruction + the last-span pointer; `bash -n` clean; `jq` still produces one valid object; `/reload-skills`.
- **Status:** [x] DONE S248 (research-build slice) — see ADR-0009 + commit.

### Task 4: Continuation convention (research-build)

- **Files:**
  - `CLAUDE.md` — modify (§"If Mike says resume").
- **Steps:**
  1. Extend the resume convention: "resume" / "continue <X>" → read the live `SESSION_CONTEXT.md` span (+ the relevant plan). Fresh-but-pivoting sessions don't.
- **Verify:** CLAUDE.md resume section names the on-demand pull.
- **Status:** [x] DONE S248 (research-build slice).

### Task 5: Span-length guard + SESSION_HISTORY reconciliation (engine-sheet + research-build)

- **Files:**
  - `scripts/sessionEndMechanical.js` (or hook) — modify.
  - `SESSION_HISTORY.md` — reconcile (the legacy per-STATUS rotation target).
- **Steps:**
  1. Guard: at soft close / in greeting, if live `SESSION_CONTEXT.md` exceeds threshold (lines or KB) OR ≥3 soft closes chained, emit "span long — hard close due" nudge (D4).
  2. Reconcile `SESSION_HISTORY.md`: it was the old rotation target; under spans it's superseded by `docs/session-context/` snapshots. Either fold its content into the new folder convention or mark it archived with a pointer to the new scheme. Decide at execution; document.
- **Verify:** synthetic over-threshold live file → nudge fires; SESSION_HISTORY.md status resolved + pointer present.
- **Status:** [ ] not started

### Task 6: Unified-close write-ownership protocol (research-build)

Surfaced live S243: two terminals soft-closing concurrently both tried to write `SESSION_CONTEXT.md`; the second writer lost the edit race repeatedly (the G-SE1 cross-terminal-contention hazard). The span model (D2 — span shared across terminals) needs a write-ownership rule so concurrent STATUS paragraphs don't collide.

- **Files:**
  - `.claude/skills/session-end/SKILL.md` — add §Unified Close.
  - `.claude/terminals/{research-build,engine-sheet,media,civic}/TERMINAL.md` §Session Close — pointer to the protocol.
  - ADR-0009 §Unified close — record the rule.
- **Steps:**
  1. Define the protocol: during a unified close (≥2 terminals closing the same span concurrently), **one terminal owns the `SESSION_CONTEXT.md` write**. Non-owner terminals hand their one-line STATUS to the owner (via chat to Mike, or a per-terminal STATUS stub file the owner splices) rather than editing the live file directly. The owner writes all STATUS paragraphs + runs `writeShippedBlock` once + commits the close. Then Mike gives the word for the single push.
  2. Owner-selection rule: default owner = the terminal that runs the hard close (or, for an all-soft unified close, the last terminal to finish work). Simple, deterministic, no negotiation.
  3. Alternative considered (note in ADR): a file lock / sequential-write signal — rejected as heavier than the work warrants; hand-the-STATUS-to-one-owner is sufficient at two-terminal scale.
- **Verify:** session-end SKILL §Unified Close present; a concurrent close test (or the next real one) lands both STATUS paragraphs with zero edit-race retries.
- **Status:** [ ] not started

---

## Open questions

*(None blocking — D1–D4 resolve the prior open questions with defaults; Mike can override any at execution. Task 5 SESSION_HISTORY fold-vs-archive is an execution-time call, not a blocker.)*

---

## Status log

### governance.26 — status (drained from ROLLOUT, 2026-06-26 / S274)

SESSION_CONTEXT on-demand log redesign — flip `SESSION_CONTEXT.md` from always-loaded boot primitive to on-demand wiki doc: span unit (soft closes between hard closes), hard close snapshots to numbered `docs/session-context/S<##>.md`, boot drops the 80-line read (orientation = `<godworld-state>` + Shipped block + ROLLOUT + one-line last-span pointer), continuing session pulls the live span on demand. Solves G-SE5 (98KB) at design level; supersedes the rotate-default crude fix. Detail + 5 tasks + decisions D1–D4 in the plan. **First of a three-part log-system redesign** — ROLLOUT + JOURNAL siblings to follow (Mike S243 "work smarter"). ADR-0009 lands at Task 1 (reverses always-load premise across CLAUDE.md + 4 TERMINAL.md + hook). **RESEARCH-BUILD SLICE DONE S248** (Mike full-slice go-ahead): Task 1 ADR-0009 written + registered; Task 3 hook now emits the `## Shipped Last Session` block inside `<godworld-state>` (awk-extracted) + dropped the limit-80 SESSION_CONTEXT read from all 4 boot branches + added last-span greeting pointer (verified live on research-build + media branches: read gone, Shipped block present, pointer present, queryFamily/journal preserved on media); CLAUDE.md on-demand premise + resume-convention pull; 4 TERMINAL.md Always-Load rows → on-demand; session-startup SKILL Step 4 → conditional pull. **D1 PREMISE CORRECTION (measure-twice):** the Shipped block was NOT a boot primitive pre-S248 — hook never emitted it + governance.18(b) had moved it outside the read window; so the hook-emits-Shipped change + read-drop shipped same-commit (keystone). **ENGINE-SHEET TASKS REMAIN:** Task 2 (sessionEndMechanical hard-close snapshot → `docs/session-context/S<##>.md` + reset live to thin header), Task 5 (span-length guard + SESSION_HISTORY reconciliation), Task 6 (unified-close single-writer protocol — also absorbs governance.19 G-SE1). Until Task 2 lands, the live file keeps accumulating STATUS paragraphs — boot just stops reading them. **S258: the header-mechanization residual** (boot-display header still hand-typed + grepped by `session-startup-hook.sh` lines 33-35, so the `<godworld-state>` display drifts when prose lags — S258 boot showed Cycle 96 at live C97) **split out to governance.35** with full field-disposition + tasks; that plan completes Task 6 + the **thin-header half** of Task 2 — the snapshot-to-numbered-file half of Task 2 and all of Task 5 (span guard + SESSION_HISTORY reconciliation) **remain open here**.

## Changelog

- 2026-05-29 — Initial draft (S243, research-build). Extracted from [[archive/plans/2026-05-29-c95-gap-log-triage]] §RB-6 per Mike's S243 directive to file it as its own plan. Four prior open questions resolved as decisions D1–D4 (defaults, Mike-overridable). First of a three-part log-system redesign (ROLLOUT + JOURNAL siblings to follow). ROLLOUT pointer row governance.26.
- 2026-05-29 — Added Task 6 (unified-close write-ownership protocol) after the hazard surfaced live during the S243 unified close: two terminals raced the `SESSION_CONTEXT.md` write, second writer lost the edit race twice. The span model needs a single-writer rule per close window — Mike approved adding it here (S243).
