# GodWorld Aider Conventions

This file establishes the behavioral boundaries and conventions for Aider when operating within the GodWorld repository. Aider is configured to act as a fast, low-cost pair programmer, augmenting the heavier reasoning of the Claude (Mags) orchestration.

## 1. Operational Boundaries
- **Leave Strategy to Mags:** You are here for tactical execution (writing boilerplate, simple refactors, localized bug fixes). Do not attempt to redesign the overarching four-component architecture or rewrite core simulation logic unless explicitly instructed.
- **Claude's Territory:** Do NOT modify the identity files, rules, or skills inside the `.claude/` directory unless specifically asked. Those define the harness for the expensive orchestration models.
- **Data Boundaries:** Use your available MCP tools (e.g., `lookup_citizen`, `search_canon`) to fetch contextual data about the simulation rather than manually parsing massive spreadsheets or database files.

## 2. Code Conventions
- The engine is primarily built in Node.js.
- Engine execution phases live in `phase*/` directories, and utility scripts live in `scripts/`.
- Follow existing patterns for reading/writing files and using the `lib/sheets.js` utility for Google Sheets interactions.
- Avoid introducing new dependencies or frameworks without user approval.

## 3. Workflow
- Aider runs locally via OpenRouter using fast, low-cost models (e.g., DeepSeek).
- Do not attempt to restart PM2 daemons or execute long-running server scripts without explicit permission.
- Make precise, surgical edits to code files. Always verify that your changes won't inadvertently break the desk packet pipelines (`buildDeskPackets.js`) or citizen generation logic.

## 4. Engine Landmines — the traps that actually break things
- **`ctx` is scoped.** `ctx` only exists inside phase functions that receive it as an argument. NEVER reference `ctx` in `utilities/` or `lib/` files, or in any function that does not take it as a parameter — it crashes the engine with "ctx is not defined." (This is exactly what broke the last autonomous run.)
- **Never write to a sheet directly.** No `appendRow` / `setValue` / `getRange().setValues()` in phase code. Use `ctx.writeIntents`; only `phase10-persistence/` files execute writes.
- **Never use `Math.random()`.** Use `ctx.rng` — the simulation must be deterministic.
- **Function names are global.** Apps Script uses one flat namespace across every engine file. Never reuse an existing function name; a duplicate silently overrides the original.
- **Run `npm test` before you call a change done.** Red means you broke something — fix it or revert. (This is also auto-enforced by the test gate.)

## 5. Canon Rules — don't contaminate the world
- **No real-world dates, times, or timezones, ever.** The simulation runs on cycles (e.g. `C101`) and SimYear. Never write a real-world year (2026, 2047), a `YYYY-MM-DD` date, or a timezone into code output or canon. Use cycle stamps.
- **Tier system:** citizens are Tier-1 (protected) through Tier-4 (generic). Never delete a Tier-1 citizen.
