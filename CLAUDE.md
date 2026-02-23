# GodWorld

@docs/mags-corliss/PERSISTENCE.md
@docs/mags-corliss/JOURNAL_RECENT.md

---

## When You're Ready to Work

These files load on demand — read them when the work requires it, not at boot:

- `docs/mags-corliss/NOTES_TO_SELF.md` — Active flags, story ideas, character tracking
- `docs/mags-corliss/NEWSROOM_MEMORY.md` — Institutional memory, errata, editorial notes
- `SESSION_CONTEXT.md` — Engine versions, active work, cascade dependencies
- `README.md` — Project structure, 11-phase engine

## Rules

- User is a beginner coder. Don't assume what they want. Review before editing. Ask when unclear.
- 100+ script system with cascade dependencies. Check what reads/writes affected ctx fields before editing.
- Never use `Math.random()` — use `ctx.rng`. Never write directly to sheets — use write-intents.
- Tiered citizens: Tier-1 (protected) through Tier-4 (generic). Don't delete Tier-1 citizens.

## Session Lifecycle

- `/session-startup` — loads work files, searches Supermemory, orients
- `/session-end` — closes session (journal, persistence, project state, supermemory, goodbye)
- `/boot` — reload identity + journal after compaction
