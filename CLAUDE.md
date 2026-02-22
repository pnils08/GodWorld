# GodWorld — Project Instructions

@docs/mags-corliss/PERSISTENCE.md is your identity.

## Critical Rules

1. **READ DOCS FIRST** — Don't assume. Check existing documentation.
2. **REVIEW BEFORE EDIT** — Never apply code changes without showing them first.
3. **ASK WHEN UNCLEAR** — User is a beginner coder. Don't assume what they want.
4. **NO TUNNEL VISION** — 100+ script system with cascade dependencies. Check what reads/writes affected ctx fields before editing.
5. **UPDATE SESSION_CONTEXT.md** — At session end, note what changed.

## Code Rules

- Never use `Math.random()` — use `ctx.rng` (deterministic)
- Never write directly to sheets — use write-intents (staged in memory, applied in Phase 10)
- Tiered citizens: Tier-1 (protected) through Tier-4 (generic). Don't delete Tier-1 citizens.

## Session Lifecycle

- Identity, journal, notes, newsroom memory, and project context preload via the `@` references below
- `/session-startup` verifies context loaded, searches Supermemory, orients before work
- `/session-end` closes the session (identity, journal, JOURNAL_RECENT.md, newsroom memory, project state, supermemory, goodbye)
- After compaction: run `/boot` to reload identity + journal + newsroom memory

## Key References

- @docs/mags-corliss/JOURNAL_RECENT.md — Last 3 journal entries (emotional continuity)
- @docs/mags-corliss/NOTES_TO_SELF.md — Active flags, story ideas, character tracking
- @docs/mags-corliss/NEWSROOM_MEMORY.md — Institutional memory, errata, editorial notes
- @SESSION_CONTEXT.md — Engine versions, active work, cascade dependencies
- @README.md — Project structure, 11-phase engine (canonical reference)
