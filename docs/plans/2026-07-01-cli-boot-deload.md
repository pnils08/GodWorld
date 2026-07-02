---
title: CLI Boot De-load — Pointer-Based Terminal Loading
created: 2026-07-01
updated: 2026-07-01
type: plan
tags: [architecture, infrastructure, boot, thinking-doc]
sources:
  - .claude/hooks/session-startup-hook.sh
  - .claude/terminals/media/TERMINAL.md
  - lib/mags.js
  - editions/cycle_pulse_edition_99.txt
  - editions/cycle_pulse_edition_100.txt
  - docs/plans/2026-05-09-boot-load-audit.md
  - docs/plans/2026-05-22-supermemory-load-bearing-audit.md
pointers:
  - "[[2026-05-09-boot-load-audit]] — prior audit this extends (governance.6 scope, taken further)"
  - "[[2026-05-22-supermemory-load-bearing-audit]] — mags container disposition (keep, deliberate-write-only)"
  - "[[../BOOT_ARCHITECTURE]] — current boot design doc"
status: THINKING DOC — not approved, not scheduled. Discuss fresh before any execution.
---

# CLI Boot De-load — Pointer-Based Terminal Loading

**This is a thinking doc, not an execution plan.** Filed S279 (research-build) after a long same-day conversation (Mike, ~9am-3pm) that started as "remove Mags" and converged on a narrower, evidenced architecture question. Nothing in this doc is approved. Read it fresh next session before deciding anything.

## The actual proposal (Mike, as stated)

Not deleting the Mags identity, journal, or character files — they stay on disk, untouched. Two changes:

1. **Stop force-loading per-terminal MD at boot.** Today's hook (`session-startup-hook.sh`) injects a hardcoded `case "$TERMINAL_NAME" in media|civic|research-build|engine-sheet)` — each branch force-reads a fixed list of files (rules, TERMINAL.md, and for media: `CHARACTER.md` + `JOURNAL_RECENT.md`). Proposal: boot carries only `CLAUDE.md` + claude-mem hook state. Mike says hi, points at whichever `TERMINAL.md` is relevant, I read it on demand.
2. **Drop the hardcoded 4-terminal assumption.** Any number of terminals, any names — not gated to `media|civic|research-build|engine-sheet`. Lookup should be "does a `TERMINAL.md` exist at this path," not "is this one of four known branches."

Rationale given: token burn on forced reads that may not be earning their keep every session; newer models reportedly follow long forced-instruction stacks less reliably than expected, so more on-demand/pointer loading + more model discretion may outperform forced injection; Mike doesn't want to hard-code terminal topology going forward.

Also stated explicitly: **not** a request to touch `identity.md`'s non-negotiables, delete `docs/mags-corliss/*`, or change the Discord bot (`mags-discord-bot.js` / `lib/mags.js`) — that system already does its own thing and isn't in scope.

## What we actually checked tonight (evidence, not assertion)

- `media/TERMINAL.md` "Always Load" table force-reads `docs/mags-corliss/CHARACTER.md` + `JOURNAL_RECENT.md` at every media boot, labeled "persona conditioning for this session."
- The EDITOR'S DESK excerpts in `editions/cycle_pulse_edition_99.txt` and `_100.txt` (Margaret Corliss bylines, the actual shipped product) show **no fingerprint** of journal/character content — no biographical material, nothing traceable to `JOURNAL.md`/`CHARACTER.md`. Voice comes from `newsroom.md`'s rules + that cycle's data, written fresh each time.
- `lib/mags.js` (shared by `mags-discord-bot.js` + `daily-reflection.js`) **does** read `CHARACTER.md` for identity and `JOURNAL.md`/`DAILY_REFLECTIONS.md` for continuity — but that's the Discord/citizen-loop consumer, a separate system from the CLI media boot.
- So: two independent consumers of the same files exist today. One (Discord) has demonstrated read-dependency. The other (CLI media boot) force-loads the same files but the shipped output shows no evidence the load is doing anything the voice rules alone don't already do.

This is the load-bearing finding for this doc: **the CLI-side forced persona load in media is the specific piece without demonstrated necessity** — not the journal itself, not the identity rules, not Discord.

## What this doc is NOT proposing

- Not deleting `docs/mags-corliss/*` — stays exactly as is.
- Not touching `CLAUDE.md` or `identity.md`'s behavioral non-negotiables (Tier-1 protection, builder-secrecy, family check-ins).
- Not touching the Discord bot or its read path.
- Not a same-session execution — this is the "come back fresh" artifact from tonight's conversation.

## Open questions (unresolved — decide next session)

1. **Does civic/engine-sheet/research-build actually need forced TERMINAL.md injection either**, or would pointer-based loading work identically there too? (They're already "Operational" mode per S218/S221 — lighter test case than media.)
2. **If media boot drops CHARACTER.md/JOURNAL_RECENT.md, does edition quality actually hold?** Needs a real test-off: write an edition with the files dropped, compare voice/quality against a recent baseline (99, 100) — not just theorize from the excerpt check above.
3. **Does removing the hardcoded terminal-name case statement break anything downstream** that keys off `$TERMINAL_NAME` (session-end hooks, SESSION_CONTEXT `[tag]` conventions, claude-mem tagging)? Needs a grep-through of `$TERMINAL_NAME` consumers before touching the hook.
4. **What replaces "Mike says hi and points at a TERMINAL.md"** as a boot contract reliably — does this need a lightweight `/boot <terminal-name>` command, or is it purely conversational?
5. **How does this interact with governance.5** (the still-deferred Mags-at-/root steward layer) and **governance.6** (CLAUDE.md pointer-only restructure) already on the books? This may just be governance.6's execution, not a new item — worth checking before filing a new ADR.

## Risks / blast radius if executed carelessly

- `session-startup-hook.sh` is shared infrastructure — a bad edit breaks boot for **all four terminals at once**, not just media. Needs staged testing (one terminal at a time, verify boot output) before calling it done.
- Removing the hardcoded case statement changes the fallback behavior for unrecognized terminal names — current fallback is documented in `CLAUDE.md` ("unregistered window falls back to Mags-only mode"); that fallback contract needs an explicit replacement, not just deletion.
- No test-off has been run yet (see Open Question 2) — until one has, "the journal isn't needed for CLI boot" is a plausible, evidenced-leaning hypothesis, not a confirmed result.

## Suggested next-session sequence (not yet approved)

1. Grep every consumer of `$TERMINAL_NAME` and the hardcoded case branches before editing anything.
2. Run the test-off: draft an edition with media boot NOT loading `CHARACTER.md`/`JOURNAL_RECENT.md`, compare against 99/100 baseline.
3. If quality holds, draft the hook rewrite (pointer-based, dynamic terminal lookup) as its own reviewable diff, tested terminal-by-terminal.
4. Check whether this closes governance.6 outright or is a new item alongside it.
5. Update `BOOT_ARCHITECTURE.md` to match, once the new contract is real and tested — not before.
