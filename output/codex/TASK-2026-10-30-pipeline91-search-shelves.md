# TASK 2026-10-30 — codex: adversarial diff review, pipeline.91

Commit `a3b791ef` (one commit). Review the diff: `git show a3b791ef`.

**What it claims.** `lib/mags.js searchDisk` served the build's own papers to in-world callers (Rule 2: never reveal the builder). All three callers are in-world: `cron-desk-writer.js` canon_search, `mags-discord-bot.js` search_world (every persona, citizens too), `discord-reflection.js`. Before: grep over output/ docs/ editions/ archive/, filtered only for the compare sandbox. After: deny by default. `isCanonSearchPath` admits named shelves (`SEARCH_SHELF_DIRS`, `SEARCH_SHELF_FILE_RE`), `BUILD_PAPER_RE` shuts 29 papers filed on published shelves, and grep walks only `searchRoots()`. `SANDBOX_EXCLUDE_DIRS` is gone because grep no longer walks cron-compare/ root. Evidence: plan `docs/plans/2026-10-11-media-extension.md` §Changelog, top entry.

Live state: crons load this file at each run, so it is already what they read. `mags-bot` is long-running and holds the old code until it restarts after this review.

**Hunt.**
- A build paper still reachable: a shelf in `SEARCH_SHELF_DIRS` that holds working papers, prompts, gate output or lane text. Open files, name the path and the query that surfaces it. Look at `output/slices`, `output/desk-packets`, `output/citizen_pages`, `output/beats/prev`.
- A record wrongly shut: something a seat's tool frame in `cron-desk-writer.js` tells the writer canon_search will find (Hal's Origins, Anthony's PANDAS / Paper Cuts / Statcast cards, Jax's own columns, Carmen's prior coverage) that no longer comes back. Also anything the writers, Mags or a citizen persona relied on under the shut folders. `BUILD_PAPER_RE` overmatch: name an in-world article it swallows, including any `.md` under `archive/non-articles/` or `editions/`.
- Grep mechanics: `searchRoots()` feeding execFileSync. Exit code 2 on a path removed between readdir and grep, `--include` applied to command-line files, argv length, the phrase and AND fallbacks when every hit is filtered. Does any path now return "(disk search error...)" where it used to return results?
- The AND filter runs `grep -Ili` on the filtered list, and the snippet step reads `rel` directly. Any way an off-shelf path re-enters? Any query value that escapes (leading dash, empty term, regex chars in `-i` first-term mode vs `-F`)?
- `rank()` and the numeric sort: does any admitted shelf now outrank published canon in a way it did not before?
- Other readers of `isCanonSearchPath` or of the removed names. Tests: weakened assertions, a regex that accepts either branch, a live query that cannot fail, the path parser in `pathsOf`.

**Out of scope.** Moving the papers (pipeline.98), builder words inside the world summary line and a tracker cell (pipeline.99), wall-clock dates (pipeline.92), the MCP's `disk_search` (builder-session shelf, checked), and whether writers should see more of the sim.

**Write to:** `docs/for-claude-review/2026-10-30-codex-pipeline91-search-shelves-review.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, each finding with file:line and input → wrong output. Register it in `docs/index.md` in the same commit. No code edits, no network calls, no live runs.
