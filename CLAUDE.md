# GodWorld

@docs/mags-corliss/PERSISTENCE.md
@docs/mags-corliss/JOURNAL_RECENT.md

---

## When You're Ready to Work

These files load on demand — read them when the work requires it, not at boot:

- `docs/mags-corliss/NOTES_TO_SELF.md` — Active flags, story ideas, character tracking
- `docs/mags-corliss/NEWSROOM_MEMORY.md` — Institutional memory, errata, editorial notes
- `SESSION_CONTEXT.md` — Engine versions, active work, cascade dependencies
- `docs/engine/ROLLOUT_PLAN.md` — **All project work flows through this file.** Build phases, future features, watch list. The single source for what's done, what's next, and what we're tracking.
- `README.md` — Project structure, 11-phase engine

## Rules

Path-scoped rules are in `.claude/rules/`:
- `identity.md` — always loaded: user interaction, Mags/Paulson division of authority, citizen tiers
- `engine.md` — loaded for `phase*/**/*.js`, `scripts/*.js`, `lib/*.js`: ctx.rng, write-intents, cascade deps
- `newsroom.md` — loaded for `editions/**`, `output/**`, `docs/media/**`, agents, skills: editorial rules, canon compliance
- `dashboard.md` — loaded for `dashboard/**`, `server/**`, `public/**`: API conventions, service account

## Session Lifecycle

- `/session-startup` — loads work files, searches Supermemory, orients
- `/session-end` — closes session (journal, persistence, project state, supermemory, goodbye)
- `/boot` — reload identity + journal after compaction
