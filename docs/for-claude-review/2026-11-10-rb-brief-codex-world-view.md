# Brief to codex-rb — world-view: a second set of eyes, and one check script

Date: 2026-11-10. From: research-build. The builder asked for codex on this ("Give codex some stuff to work on to give a different set of eyes").

## What it is

`world-view/` builds one self-contained HTML page: a street-level flight (or walk) through the 22 neighborhoods, drawn from one week of engine output. It reads; it writes nothing to a sheet, a ledger or `output/`. Start at `world-view/README.md` (sources table, parcels, ambient-module contract, builder rulings), then `build.js` (all the data decisions), `hoods.js`, `template.html`, `places.js`.

- Build: `node world-view/build.js <dest.html>`. As a module it writes nothing: `require('./world-view/build.js')` → `{ data, hoods, canonProblems, layout, placeType, kindOf, band, SIM_YEAR, CYCLE, STYLE }`.
- Look: `world-view/tools/view.sh` (headless Chrome screenshot, local file, no network service contacted except the page's own font/CDN tags — skip it if that is outside your approval).
- In flight right now, do not review yet and do not edit: `world-view/life-traffic.js`, `life-nature.js`, `life-water.js`, `life-street.js`, `sound.js` (five Claude subagents are writing them). Everything else in `world-view/` is committed as of `b6adb0148` plus the module-export change on top.

Two jobs. Do Job 1 first.

## Job 1 — adversarial review (read-only on `world-view/`)

File: `docs/for-claude-review/2026-11-10-codex-world-view-review.md`. Verdict SHIP / SHIP-WITH-FIXES / HOLD, every finding `file:line` + input → wrong output.

The page's one promise is that nothing about a citizen, a business or a place is invented: a label is the engine's own line, a painted name is a ledger name, a neighborhood's look hangs off a phrase in `docs/canon/INSTITUTIONS.md`. Hunt where that promise is broken or only looks kept:

1. `build.js` — every field that reaches the screen, traced to its source row. In particular:
   - `kindOf()` ranks a person's week and picks the one line the card leads with: any tag family ranked so a real turning point (death, birth, hospital, arrest, job loss, a move) is buried under texture, or coloured as the wrong kind? Compare against the tag vocabulary actually present in `output/beats/LifeHistory_Log.jsonl`, not against the regexes.
   - `band()` and `SIM_YEAR` claim to mirror `deriveLifeState_` (`phase05-citizens/citizenContextBuilder.js`) and `simYearFromCycle_` (`phase01-config/advanceSimulationCalendar.js`). Do they, at every boundary? The engine reads `S.simYear` when the calendar has run — can that differ from the cycle formula for the dumped cycle?
   - `who()`: sex normalisation, `spouse` parsed out of `SpouseId`, `home.with` from `Household_Ledger.Members`, `emp` from `EmployerBizId`, `runs` from `Business_Ledger.Key_Personnel`, `hist` parsed from the `LifeHistory` cell, `said`/`saidMore` from `Reflection_Intake` (ordering by Cycle then Timestamp; legacy `C99`-style timestamps; `trimSaid` cutting mid-thought; `SAID_HOW` mapping a Daypart to words that claim a setting the row does not support — `DISCORD` → "in conversation", `PRESS` → "to a reporter").
   - The panel says "Lives in <the street they were seen on>" — is `LifeHistory_Log.Neighborhood` the person's home, or where the event happened? Find a person whose ledger `Neighborhood` differs from the hood their rows carry and say what the page shows.
   - People whose rows carry no neighborhood (`loose`) and people over the 110 cap: who silently disappears?
   - `placeType()` decides by regex on Sector/Name that a business is a stadium, a theater, a house of worship, a market… List every business it classifies and flag any wrong call (false positive or miss), and any business that ends up with no parcel.
   - `layout()`: parcel ids are meant to be stable. What makes them move between weeks (a business added, a person count changing `L`, a `hoods.js` tweak)? They are a placeholder for addresses the builder intends to add to the ledger — say what would have to be true for an id to survive.
2. `hoods.js` — each entry's numbers are "drawing choices read off the phrase". Flag entries where the drawing contradicts the phrase or imports real-world Oakland rather than the canon line.
3. `template.html` — bugs, not taste: state that survives a place change, listeners that stack, anything reading `DATA` that can be undefined for a thin neighborhood, `innerHTML` fed by ledger text, the visit view (`startVisit`/`endVisit`, held figures, the hash), the quality step-down, touch handling. Performance traps on a phone.
4. Anything the README claims that the code does not do.

Out of scope: whether the sim should produce these lines (builder's call), the visual design, the five in-flight module files.

## Job 2 — bounded coding: `scripts/worldViewCheck.js` (+ `scripts/worldViewCheck.test.js`)

Inside your write scope (`scripts/**`). No network, no sheet reads — files on disk only. It requires `world-view/build.js` as a module and fails loudly (non-zero exit, one line per failure) when the page would show something the sim does not hold:

- every line on a person (`people[].x`, every `people[].all[][1]`) is the verbatim `EventText` of a `LifeHistory_Log` row with that person's Name in cycle `CYCLE`;
- every `said.x` / `saidMore[].x` is a prefix (allowing the trim rule) of a `ReflectionExcerpt` for that POPID, and its week matches that row;
- every business on a parcel or a place is a `Business_Ledger` row for that neighborhood; no business appears twice; report businesses with no parcel;
- every neighborhood has a `hoods.js` entry whose phrase is in INSTITUTIONS.md (`canonProblems` empty);
- parcel ids are unique and two builds in a row give identical layouts;
- sex / age band / role on a person match the ledger snapshot row under the engine's own band rule;
- `home.with`, `spouse`, `emp`, `runs` each resolve to a real ledger / household / business row.

The people records carry no POPID today; if you need it to check exactly, say so in the review and check by Name + neighborhood meanwhile — do not edit `world-view/` to add it. The test uses visibly synthetic fixtures. `node --check` clean; commit as `codex: …` inside `scripts/**` and `docs/**` only; no push.

## Not approved

No edits under `world-view/`, no sheet/Drive/Discord/model-API contact, no engine fire, no dependency installs. If something needs a change in `world-view/`, write it as a finding.
