---
title: SESSION_CONTEXT Header Mechanization Plan
created: 2026-06-14
updated: 2026-06-14
type: plan
tags: [infrastructure, architecture, draft]
sources:
  - docs/engine/ROLLOUT_PLAN.md §governance.26 (parent — on-demand log redesign, Tasks 2 + 6)
  - docs/plans/2026-05-29-session-context-on-demand.md (sibling — the on-demand flip this completes)
  - .claude/hooks/session-startup-hook.sh lines 33-35 (the drift vector)
  - scripts/writeShippedBlock.js (existing partial-automation precedent)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout; governance.26 + new pointer row"
  - "[[plans/2026-05-29-session-context-on-demand]] — sibling on-demand redesign"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# SESSION_CONTEXT Header Mechanization Plan

> **REDUCED S260 by ADR-0009 §loop-tightening.** The loop-tightening pass retired the Shipped block + STATUS narrative entirely and reduced the SESSION_CONTEXT carried set to `{PIN, NEXT[terminal]}`. That **obsoletes** this plan's Task 4 (single-writer of the Shipped block) and Task 5 (Recent-Sessions automation) — there is no Shipped block or Recent-Sessions log to mechanize anymore, and the one hand-authored slot is now the per-terminal `NEXT` line, not a STATUS paragraph. **What survives:** the core idea that the PIN's *mechanical* fields (Cycle, Edition-stage) should **self-derive from `output/` artifacts** so the hand-typed PIN can't drift (the C96-vs-C97 boot bug). That is Tasks 1–3 below, reframed as "PIN self-derive," and it stays **engine-sheet substrate** with the Day-counter + increment-trigger open questions unresolved. Pick it up as a follow-on to loop-tightening, not before. Boot today still greps the PIN from the hand-typed header line (works; just drift-prone until this lands).

**Goal (reduced):** Make the PIN's mechanical fields (Cycle, Edition-stage, Session counter) self-derive from authoritative on-disk sources so the boot display never drifts from hand-edits. (Originally: mechanize every SESSION_CONTEXT field + keep a STATUS slot — that broader scope is retired; the carried set is now `{PIN, NEXT[terminal]}` per ADR-0009 §loop-tightening.)

**Architecture:** Today the SESSION_CONTEXT header line is hand-typed and the `session-startup-hook.sh` greps Cycle/Session/Day out of it for the boot `<godworld-state>` display. When the prose lags (it lagged a full cycle across S256–S257), the boot display lies. This plan splits the file into **mechanical** (cycle, date, engine version, edition-stage status, session/day counters — all already on disk) and **authored** (one bounded STATUS paragraph). A single writer stamps the mechanical fields at session-close; the boot hook reads cycle/session/day from source files, not from the prose. Completes governance.26 Tasks 2 (thin header reset) + 6 (single-writer protocol) and closes the S258 header-mechanization fold.

**Terminal:** engine/sheet (execution) — designed by research-build (this plan). Touches the boot hook + `sessionEndMechanical.js`, both engine-sheet/infra substrate.

**Pointers:**
- Prior work: `scripts/writeShippedBlock.js` (already splices the `## Shipped Last Session` block + commits SESSION_CONTEXT — the precedent pattern to extend)
- Related plan: [[plans/2026-05-29-session-context-on-demand]] (Tasks 2 + 6 are this work)
- Parent rollout: [[engine/ROLLOUT_PLAN]] §governance.26 (S258 fold) + new pointer row
- Drift evidence: boot showed `Cycle 96` while live cycle was C97 (S258); §Recent Sessions in SESSION_CONTEXT stale at S221 (37 sessions) — proof the manual sections rot

**Field disposition (the contract):**

| Field | Class | Authoritative source | Notes |
|-------|-------|----------------------|-------|
| Cycle | mechanical | latest `output/run_manifest_c*.json` → `"cycle"` | confirmed `97` at write-time; max-N filename is equivalent |
| Last Updated | mechanical | `date +%Y-%m-%d` | trivial |
| Engine version | mechanical (static) | single config constant | changes only on engine version bump; read from one place, don't hand-type per session |
| Edition status | mechanical | presence-scan `output/{sift_proposals,dispatch,edition_seal,final_arbiter,intake_published_entities}_c<XX>` | derive the "C<XX> /sift COMPLETE + …" string from which artifacts exist |
| Session | mechanical | new counter file `.claude/state/session-counter.txt` | increments once per session boot (see T1) |
| Day | **authored (no mechanical source — S261 finding)** | NONE on disk | S261 data: Day held `161` across Sessions 254→261 AND Cycles 95→97 — neither per-session nor per-cycle. Sim calendar (`buildWorldSummary.js`) is a *different* concept (`SimYear 2 Month 11 Day 1` = day-of-month). PIN Day = a hand-bumped project-day counter with NO on-disk truth; stale ≥1 real week / 3 cycles unnoticed. Do NOT mechanize — stays authored alongside NEXT, OR Mike decides (define epoch / retire). Engine-sheet must not invent a source. |
| STATUS paragraph | **authored** | human/agent at close | the ONLY hand-typed field; bounded handoff note |

**Acceptance criteria:**
1. After a cycle runs, `node scripts/<writer>.js` regenerates the SESSION_CONTEXT header with the correct Cycle/date/edition-status pulled from `output/` — zero hand-editing of those fields.
2. A fresh boot's `<godworld-state>` block shows the true current cycle even if no one touched the SESSION_CONTEXT prose since last cycle (boot hook reads run_manifest, not the header line).
3. The only field a human edits at session-close is the STATUS paragraph; the shipped-block + header + recent-sessions are all script-written.

---

## Tasks

### Task 1: Session counter state file + reader

- **Files:**
  - `.claude/state/session-counter.txt` — create (single integer, seed to the current PIN value at implementation time, e.g. `260`)
  - `.claude/hooks/session-startup-hook.sh` — modify (read + increment per boot)
- **Steps:**
  1. Seed `.claude/state/session-counter.txt` with the current PIN Session number (read it from `SESSION_CONTEXT.md`'s `**PIN:**` line at implementation time — do NOT hardcode 258).
  2. Increment trigger — **RESOLVED (boot odometer, Mike S260):** bump once per genuine fresh boot, on `SessionStart source=startup`; do NOT bump on `/clear` or compaction. No soft/hard-close gating (that distinction is ritual-depth-only now). Document the rule inline in the hook.
  3. Boot hook reads+increments this file for `SESSION_NUM` instead of grepping the PIN line. Then write the new value back into the PIN line (so the on-demand file stays true) — this is the "self-derive" half.
- **Verify:** reboot (real new session) → counter advances by 1, PIN Session matches `<godworld-state>` Session; `/clear` within a context → no advance.
- **Status:** [ ] not started — boot odometer model locked S260; remaining = wire it (engine-sheet, gov.35 remnant)

### Task 2: Cycle + edition-status deriver

- **Files:**
  - `scripts/sessionContextHeader.js` — create (or fold into `writeShippedBlock.js`)
- **Steps:**
  1. `cycle` = max N from `output/run_manifest_c*.json` filenames (cross-check the `"cycle"` field of the latest).
  2. `editionStatus` = scan presence of `output/sift_proposals_c<N>.json`, `dispatch_c<N>.json`, `edition_seal_c<N>.json`, `final_arbiter_c<N>.json`, `intake_published_entities_c<N>_e<N>.json`; emit the canonical "C<N> /sift COMPLETE + /write-edition COMPLETE + … + E<N> PUBLISHED …" string from which exist. Map the artifact→phrase table explicitly in the script.
  3. `lastUpdated` = `date +%Y-%m-%d`.
- **Verify:** `node scripts/sessionContextHeader.js --dry-run` against C97 outputs prints `Cycle: 97` + an edition-status string matching the artifacts on disk.
- **Status:** [ ] not started

### Task 3: Boot hook derives Cycle from source

- **Files:**
  - `.claude/hooks/session-startup-hook.sh` — modify lines 33-35
- **Steps:**
  1. Replace `CYCLE_NUM=$(grep … SESSION_CONTEXT.md)` with a derive from latest `output/run_manifest_c*.json` (the file is the truth; the prose is not).
  2. `SESSION_NUM` ← `.claude/state/session-counter.txt` (Task 1). `DAY_NUM` ← Day source once resolved (Open Q); until then keep grepping the header as a fallback and comment it as interim.
  3. Preserve the `|| echo "?"` fallbacks so a missing file degrades gracefully, never blocks boot.
- **Verify:** delete/stale the SESSION_CONTEXT header value, boot → display still shows correct Cycle (proves source-derivation). **HAZARD: boot-critical file — verify offline (`bash -n` + a dry stdout run) before any live boot; revert = `git revert` the single commit.**
- **Status:** [ ] not started

### Task 4: Thin-header reset + single-writer wiring (governance.26 Tasks 2 + 6)

- **Files:**
  - `scripts/sessionEndMechanical.js` — modify (call the Task 2 deriver; stamp the mechanical header)
  - `SESSION_CONTEXT.md` — the writer rewrites the header line + Shipped block; leaves the STATUS slot authored
- **Steps:**
  0. **First, enumerate every current writer:** `grep -rl SESSION_CONTEXT scripts/ .claude/` — the "single-writer" claim is only safe once you know all paths that touch the file today (known: `writeShippedBlock.js` + the close skill; confirm there are no others before asserting single-writer).
  1. At close, `sessionEndMechanical.js` calls the Task 2 deriver and writes the full mechanical header line (Cycle/Session/Day/date/engine/edition-status) — no hand-typing.
  2. Confirm single-writer: only `sessionEndMechanical.js` (via the deriver + `writeShippedBlock.js`) writes mechanical regions; the close skill writes ONLY the STATUS paragraph. Document the boundary in the skill + script headers.
  3. (Defer the on-demand snapshot-to-`docs/session-context/S<##>.md` half of governance.26 Task 2 if not already shipped — cross-check before duplicating.)
- **Verify:** run `sessionEndMechanical.js --terminal=research-build` on a test branch → header line fully regenerated, STATUS untouched, git diff shows only mechanical fields changed.
- **Status:** [ ] not started

### Task 5: Recent-Sessions log automation (optional, stretch)

- **Files:**
  - `scripts/sessionContextHeader.js` — extend
- **Steps:**
  1. Derive the `## Recent Sessions` entries from git-log session boundaries (the data writeShippedBlock already walks), so the section can't go 37 sessions stale again. If non-trivial, file as a follow-up row instead of forcing it here.
- **Verify:** generated Recent-Sessions head matches the last N session-close commits.
- **Status:** [ ] not started

---

## Open questions

- [x] **Day counter semantics** — **RESOLVED S261 (research-build, data-first).** Investigated all candidate sources: `run_manifest_c*.json` carries no day field (keys: cycle/type/slug/checkedAt/summary/files/uploads); the only `simDay` in the repo is `buildWorldSummary.js`'s sim-calendar day-of-month (`SimYear 2 Month 11 Day 1` at C97) — a *different* concept from PIN Day. Git history: PIN Day held `161` across **Sessions 254→261** and **Cycles 95→97**, so it is neither per-session, per-cycle, nor sim-calendar-derived. **Verdict: PIN "Day" has NO on-disk authoritative source — it is a hand-bumped project-day counter that has been stale ≥1 real week / 3 cycles unnoticed.** Therefore it is **NOT mechanizable** and is reclassified **authored** (table above). Engine-sheet should NOT invent a source. The residual is a **Mike decision, not an engine-sheet investigation:** (a) keep Day hand-typed/authored alongside NEXT (cheapest; matches reality), (b) redefine it as real-days-since a fixed project-epoch and mechanize from `date` (changes its value — it would jump off 161), or (c) retire Day from the PIN (the staleness-unnoticed signal suggests it may not be load-bearing). Until Mike picks, Day stays hand-typed and the hook keeps grepping it (already the interim behavior — no change needed to ship the rest).
- [x] **Increment-trigger for the session counter** (Task 1) — **RESOLVED S260 (Mike-approved, ADR-0009 §loop-tightening refinement 1):** the Session number is a **boot odometer** — bump once per genuine fresh boot, mechanically, zero judgment. Soft vs hard close no longer governs it (that distinction is now ritual-depth-only). Increment on `SessionStart source=startup` (real new boot); **do NOT** bump on `/clear` or compaction within one working context. Confirm the exact `source` enum against the hook env before wiring, but the rule is locked: per-boot odometer, startup-only. Seed `.claude/state/session-counter.txt` to the current PIN value at implementation time (260+), not 258.

---

## Status log

### governance.35 — status (drained from ROLLOUT, 2026-06-26 / S274)

**REDUCED S260 by governance.36 §loop-tightening** to the PIN-self-derive remnant. The Shipped-block + STATUS-paragraph + Recent-Sessions mechanization is OBSOLETE (those are retired — carried set is now `{PIN, NEXT[terminal]}`). **Surviving scope:** make the PIN's mechanical fields (Cycle ← `output/run_manifest_c*.json`, edition-stage ← `output/` artifact scan, Session ← counter state) self-derive in the boot hook + at close, so the hand-typed PIN can't drift (the C96-vs-C97 boot bug). Boot today still greps the PIN from the header line (works; drift-prone until this lands). Touches `.claude/hooks/session-startup-hook.sh` (boot-critical hazard) + `scripts/sessionEndMechanical.js`. **S261: BOTH open Qs resolved (design DONE, handoff clean) — wire 3 mechanizable fields, no investigation left.** Increment-trigger = boot-odometer/startup-only (S260). Day = data-traced to NO on-disk source (frozen 161 across Sessions 254→261 / Cycles 95→97; run_manifest has no day field; sim-calendar day is a different concept) → reclassified **authored**, NOT mechanized; its fate (keep-authored / epoch-redefine / retire) is a **Mike decision, not engine-sheet work** — Day stays hand-typed meanwhile (interim unchanged). Engine-sheet wires only: Cycle←`run_manifest_c*.json`, Edition-stage←`output/` scan, Session←boot-odometer counter file. Plan Tasks 1–4 ready (Task 5 optional).

## Changelog

- 2026-06-15 — **Day open question RESOLVED + design finalized for handoff (S261, research-build, data-first).** Empirically traced every candidate Day source (run_manifest = no day field; `buildWorldSummary.js` simDay = sim-calendar day-of-month, a different concept; git history shows Day frozen at 161 across Sessions 254→261 / Cycles 95→97). Finding: PIN Day has NO on-disk source — a stale hand-bumped project counter — so it's reclassified **authored**, not mechanical, and the residual is a Mike decision (keep-authored / redefine-from-epoch / retire), not engine-sheet work. **Both open Qs now closed** (increment-trigger resolved S260; Day resolved S261). Engine-sheet handoff is unblocked: wire the **3 mechanizable fields only** — Cycle (latest `run_manifest_c*.json`), Edition-stage (`output/` artifact presence-scan), Session (boot-odometer counter file, startup-only). Day stays hand-typed (interim behavior unchanged). Tasks 1–4 ready; Task 5 optional. ROLLOUT gov.35 row updated to `ready (handoff — 3 fields, no open Qs)`.
- 2026-06-14 — Initial draft (S258, research-build). Sources verified on disk before write: run_manifest cycle field, boot-hook lines 33-35, `.claude/state/` counter dir, writeShippedBlock precedent. Day semantics + counter-trigger flagged as open questions rather than guessed. Completes governance.26 Tasks 2 + 6; closes the S258 header-mechanization fold.

---

## Relocated ROLLOUT_PLAN row detail — 2026-07-02 (S286 pointer-collapse)

Verbatim rows moved out of ROLLOUT_PLAN.md when it collapsed to pointer-only. This is the working detail for the open job(s); the rollout row is one line pointing here.

### governance.35

| governance.35 | **REDUCED S260 by governance.36 §loop-tightening** to the PIN-self-derive remnant. The Shipped-block + STATUS-paragraph + Recent-Sessions mechanization is OBSOLETE (those are retired — carried set is now `{PIN, NEXT[terminal]}`). **Surviving scope:** make the PIN's mechanical fields (Cycle ← `output/run_manifest_c*.json`, edition-stage ← `output/` artifact scan, Session ← counter state) self-derive in the boot hook + at close, so the hand-typed PIN can't drift (the C96-vs-C97 boot bug). Boot today still greps the PIN from the header line (works; drift-prone until this lands). Touches `.claude/hooks/session-startup-hook.sh` (boot-critical hazard) + `scripts/sessionEndMechanical.js`. **S261: BOTH open Qs resolved (design DONE, handoff clean) — wire 3 mechanizable fields, no investigation left.** Increment-trigger = boot-odometer/startup-only (S260). Day = data-traced to NO on-disk source (frozen 161 across Sessions 254→261 / Cycles 95→97; run_manifest has no day field; sim-calendar day is a different concept) → reclassified **authored**, NOT mechanized; its fate (keep-authored / epoch-redefine / retire) is a **Mike decision, not engine-sheet work** — Day stays hand-typed meanwhile (interim unchanged). Engine-sheet wires only: Cycle←`run_manifest_c*.json`, Edition-stage←`output/` scan, Session←boot-odometer counter file. Plan Tasks 1–4 ready (Task 5 optional). | ready | engine-sheet (design: research-build DONE) | [[../plans/2026-06-14-session-context-mechanization]] |

