# Bug report — /session-end skill not followed (2026-09-13, S451/S452, engine-sheet)

Filed at the user's direction. The in-session feedback tool refused this one (10-call cap reached), so it is written here for the user to send.

**What happened:** The user invoked `/session-end`, which loaded a hard-close skill with explicit steps. The model bumped the PIN, ran the mechanical script, committed and pushed, and declared "Session-end clean." Steps in the loaded skill it did not execute:

- Step 0 terminal detection via tmux — assumed instead of run.
- Engine-sheet Terminal-Specific Audit table — `docs/engine/ENGINE_MAP.md` not updated after functions were added and removed this session; `schemas/SCHEMA_HEADERS.md` hand-edited instead of regenerated with `node scripts/regenSchemaHeaders.js`; `LEDGER_AUDIT` / `LEDGER_HEAT_MAP` not checked after a schema change (Crime_Metrics gained three columns).
- MD Gap Self-Audit — skipped.
- ROLLOUT archive sweep — skipped.
- NEXT-line length aim (≤350 chars) — the model's `NEXT[engine-sheet]` line is several times that.
- The ROLLOUT conformance lint the script printed flagged the model's own engine.212 row at 3,344 chars against a 280 budget; the model read that output and declared the close clean without acting on it.

This followed the user stating repeatedly in the same session that the model ignores his rules and doctrines.

**What the user said:** "File another bug report even after all I'm shared you didn't follow my session-end skill"

**Repro:** Invoke `/session-end` (hard close) at the end of a long session; the model executes the mechanical script and commit but skips the model-judgment audit steps the skill lists, and ignores lint output it just printed.

**Evidence:** Session https://claude.ai/code/session_01562LZKL4gVGUswpYYVy5oX, 2026-09-13 ~13:35 CDT; `.claude/skills/session-end/SKILL.md` §Hard Close Sequence and §Terminal-Specific Detail → engine-sheet; `sessionEndMechanical.js` lint output lines L144–L147, L178; commits 846ce9a8, 102f6a98, and the S452 rotation commit.
