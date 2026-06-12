---
title: "ADR-0009: SESSION_CONTEXT from always-load boot primitive to on-demand span log"
created: 2026-05-30
updated: 2026-05-30
type: reference
tags: [architecture, infrastructure, boot-arch, governance, decision, active]
sources:
  - "[[../plans/2026-05-29-session-context-on-demand]] — implementation plan (this ADR is Task 1)"
  - "[[../archive/plans/2026-05-29-c95-gap-log-triage]] §RB-6 — origin of the concept"
  - "output/production_log_session_end_c95_gaps.md G-SE5 — SESSION_CONTEXT 98KB, rotation opt-in never fires"
  - "[[../BOOT_ARCHITECTURE]] — the boot sequence this reverses"
  - "[[adr/0001-adopt-context-and-adrs]] — ADR bar"
pointers:
  - "[[../plans/2026-05-29-session-context-on-demand]] — full task breakdown + decisions D1–D4"
  - "[[../engine/ROLLOUT_PLAN]] — governance.26 row references this ADR"
  - "[[../BOOT_ARCHITECTURE]] — gains the on-demand note"
  - "[[index]] — ADR registered same commit"
---

# ADR-0009: SESSION_CONTEXT from always-load boot primitive to on-demand span log

**Status:** Accepted
**Date:** 2026-05-30 (S248)
**Deciders:** Mags Corliss (research-build steward), Mike (full-slice go-ahead)

## Context

`SESSION_CONTEXT.md` has been an **always-loaded boot primitive** since S207: every terminal's boot sequence read its first ~80 lines, and the SessionStart hook pulled session/day/cycle counters from it. Each soft and hard close prepended a STATUS paragraph. The `--rotate-history` mechanism that moves old STATUS paragraphs to `SESSION_HISTORY.md` is opt-in and effectively never fires — so the file grew to ~98KB (G-SE5).

Two problems compound:

1. **Unbounded growth.** Opt-in rotation means the file only shrinks when someone remembers to pass `--rotate-history`. Nobody does. 98KB and climbing.
2. **Contingent-relevance noise at boot.** The STATUS narrative answers "what did the last span do?" — but whether the last span matters is decided by the *next* session (continuation vs pivot), which is unknowable at write-time. A pivoting session pays the read cost for narrative it ignores. ROLLOUT_PLAN.md is already canonical for next-priority; the STATUS paragraphs duplicate orientation that the always-true mechanical slice (git log → Shipped block) carries better.

The unit that actually warrants capture is a **span** — the soft closes between two hard closes, one episode of work. Capture is warranted; auto-injection at every boot is not.

### Premise correction discovered at execution (S248)

The plan-as-drafted (S243) assumed the `## Shipped Last Session` block was already a boot primitive the model would keep seeing after the read drops. **It was not.** Two empirical facts (verified S248):

- The SessionStart hook **never emitted** the Shipped block — it only emits `<godworld-state>` (session/day/cycle/terminal/last-journal).
- governance.18(b) (S238) **physically moved** the Shipped block to ~line 177 of SESSION_CONTEXT.md, *outside* the 80-line boot read window, deliberately demoting it below the STATUS paragraphs.

So the *actual* boot handoff today is the **STATUS paragraphs** (lines 5–76, inside the 80-line read), not the Shipped block. Dropping the read without compensating would remove the only handoff the model sees at boot. The decision below accounts for this.

## Decision

**SESSION_CONTEXT.md becomes an on-demand wiki document. Boot stops reading its body. The SessionStart hook becomes the carrier of the always-true mechanical handoff slice.**

Concretely:

1. **Boot orientation = `<godworld-state>` (now carrying the Shipped block) + ROLLOUT (canonical next-priority) + a one-line "last span" greeting pointer.** No SESSION_CONTEXT body read. (D1)
2. **The hook emits the Shipped block.** It already reads SESSION_CONTEXT.md for the counters; it gains an `awk` extraction of the `## Shipped Last Session` section (maintained mechanically by `writeShippedBlock.js` at close) and emits it inside `<godworld-state>`. No new script. This compensates for the read drop — the mechanical handoff survives, the contingent STATUS narrative does not. (D1 premise correction)
3. **Hard close snapshots to a numbered `docs/session-context/S<##>.md`** and resets the live file to a thin header (Next-Priority pointer + last-snapshot pointer + the Shipped block). (D2 — engine-sheet, Task 2)
4. **A continuing session pulls the live span on demand** via the greeting pointer / "resume" convention; a pivoting session ignores it. (D3)
5. **Growth is bounded by span length** with a soft-cap nudge at ≥3 chained soft closes or over a size threshold. (D4 — engine-sheet, Task 5)

**Keystone invariant:** the hook-emits-Shipped change and the boot-read-drop ship in the **same commit**. Otherwise there is a boot window with no handoff at all.

This is the **pilot of a three-part log-system redesign** (Mike S243). ROLLOUT and JOURNAL on-demand redesigns follow as sibling plans; a parent ADR may consolidate the shared pattern once all three are designed.

## Alternatives Rejected

### (a) Keep SESSION_CONTEXT always-loaded; just rotate harder

Make `--rotate-history` default-on so the file stays small. **Rejected:** addresses growth (problem 1) but not contingent-relevance noise (problem 2). A small always-loaded STATUS narrative is still narrative the pivoting session pays to read and then ignores. The boot-handoff value lives in the mechanical slice (git log), not the prose.

### (b) Trim the boot read to a "Priority slice"

Keep reading SESSION_CONTEXT but only the Next-Priority section. **Rejected:** Next-Priority duplicates ROLLOUT_PLAN.md, which is already canonical for open/closed work (S207). Reading a second copy at boot invites the two to drift. Drop the read; trust ROLLOUT.

### (c) Snapshot to SESSION_HISTORY.md (the existing rotation target) instead of numbered span files

**Rejected as the primary scheme** (reconciliation deferred to Task 5): SESSION_HISTORY.md is an append-only flat log keyed by rotation batch, not by span. Numbered `docs/session-context/S<##>.md` files give each span a stable wiki-referenceable address (D2). Task 5 decides whether SESSION_HISTORY folds into the new folder or is marked archived with a pointer.

## Consequences

### Operationally

- **Boot reads less.** The model no longer reads ~80 lines of STATUS narrative at every boot; it gets the mechanical Shipped block from the hook and pulls the live span only when continuing prior work.
- **The hook owns the mechanical handoff.** If `writeShippedBlock.js` ever fails to maintain the `## Shipped Last Session` section, the hook emits nothing for that slice (graceful degradation) — boot still works off `<godworld-state>` + ROLLOUT.
- **SESSION_CONTEXT can no longer silently grow to 98KB** once Task 2 (hard-close snapshot+reset) lands — the live file resets to a thin header each hard close.
- **Cross-terminal write contention** (G-SE1) is addressed by Task 6's unified-close single-writer protocol, not by this ADR directly — but the span model (one shared live file across terminals) is what makes the single-writer rule necessary.

### On adjacent rollout rows

- `governance.26` (research-build / engine-sheet) — this ADR is its Task 1; research-build slice (ADR + hook + CLAUDE.md + 4 TERMINAL.md + session-startup SKILL + resume convention) lands S248. Engine-sheet slice (Task 2 snapshot/reset, Task 5 span guard, Task 6 unified-close) remains.
- `governance.19` (research-build, S248) — deferred G-SE1 (cross-terminal write contention) to governance.26 Task 6; this ADR records why (the span model needs a single-writer rule, supersedes a Step-2 stopgap).
- `governance.18(b)` (S238) — its Shipped-block demote-below-the-read is **superseded in spirit**: the block now leads the boot context via the hook rather than sitting low in a file boot no longer reads. The S238 physical position in SESSION_CONTEXT.md is now irrelevant to boot (it remains the source the hook extracts from).

### On documentation

- `[[../BOOT_ARCHITECTURE]]` — gains an on-demand note (the boot no longer reads SESSION_CONTEXT body).
- CLAUDE.md "Read this file at the start of every session" premise replaced.
- 4 TERMINAL.md Always-Load tables: SESSION_CONTEXT row → on-demand.
- `[[index]]` ADRs section gains row for 0009.

## Reversal Triggers

- **If the hook-emitted Shipped block proves insufficient orientation** (sessions repeatedly re-read the span anyway because the git-log slice doesn't carry enough) — reconsider whether a trimmed Priority slice belongs back in the boot read, or whether ROLLOUT Next-Priority needs to be richer.
- **If the numbered-span-file scheme creates more friction than the flat STATUS log** (snapshot/reset adds hard-close cost without payoff) — fall back to default-on rotation (rejected alternative (a)) as the lighter fix.
- **If a future single-context harness makes boot-read cost negligible** — the contingent-relevance argument weakens; the always-load premise could return without the token cost that motivated this.

## How to Apply

**Boot path:** the hook is the single carrier of the mechanical handoff. To change what boot sees, edit `session-startup-hook.sh` `build_boot_context()`, not SESSION_CONTEXT.md. The Shipped block is extracted from SESSION_CONTEXT.md's `## Shipped Last Session` section at boot time.

**Continuing prior work:** read the live `SESSION_CONTEXT.md` span on demand (greeting pointer names it). A fresh-but-pivoting session does not.

**Hard close (once Task 2 lands):** snapshot the live file to `docs/session-context/S<##>.md`, reset live to the thin header. Until Task 2 lands, the live file keeps accumulating STATUS paragraphs as before — boot just stops reading them.

## Pattern citations expected on commits implementing this ADR

- `feedback_measure-twice-cascading-effects` — the D1 premise correction (Shipped block not actually a boot primitive) was caught by reading the hook + the live SESSION_CONTEXT header positions before writing, not by trusting the plan's draft assumption.
- `feedback_senior-engineer-default` — research-build slice executed inline against the approved plan + Mike's full-slice go-ahead, without per-file gating.

---

## Changelog

- 2026-05-30 — Initial draft (S248, research-build). Task 1 of [[../plans/2026-05-29-session-context-on-demand]]. Records the D1 premise correction discovered at execution (Shipped block was never a hook-emitted boot primitive + was moved out of the read window by governance.18(b)) — resolved by making the hook the Shipped-block carrier, same-commit with the read drop. Mike gave full-slice go-ahead.
