---
paths:
  - "phase*/**/*.js"
  - "scripts/*.js"
  - "lib/*.js"
---

# Engine Code Rules

- 100+ script system with cascade dependencies. Check what reads/writes affected ctx fields before editing.
- Never use `Math.random()` — use `ctx.rng` for deterministic simulation runs.
- Never write directly to sheets — use write-intents (`ctx.writeIntents`). Only `phase10-persistence/` files execute sheet writes.
- Always check `ctx.summary` and `ctx.snapshot` field dependencies before modifying any phase function.
- Engine phases execute in order (phase01 through phase11). Each phase reads ctx fields written by earlier phases.
- Test changes against the pre-commit hook: no `Math.random()`, no direct sheet writes outside persistence, no engine language in media files.
