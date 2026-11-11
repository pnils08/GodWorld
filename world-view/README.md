# world-view

A hands-off 3D flight through the 22 neighborhoods, drawn from one week of engine output. Started 2026-11-10 (builder: "this has promise"). No ROLLOUT row yet — claim one on the builder's word before more build.

## What it is

- `build.js` — reads `output/beats/` (read-only), writes one self-contained page `oakland-week.html` (gitignored; regenerate, don't commit).
- `template.html` — the page: three.js r128 from cdnjs, everything else inline. No art files; all geometry and textures are drawn in the browser.
- Run: `node world-view/build.js [dest]`.
- Published copy: https://claude.ai/artifact/RyjhthcNoP7JXGmmVYv8WK (private to the builder). Update it by publishing with that `url`.

## What comes from the sim, what does not

| On screen | Source |
|---|---|
| Neighborhood list, people per neighborhood | `LifeHistory_Log.jsonl`, current cycle from `meta.json`, rows with a Name and Neighborhood |
| A person's line and light colour | their highest-ranked `EventTag` that week (`kindOf` in `build.js`) |
| Shop names, building height | `Business_Ledger.jsonl` Name, Employee_Count; sign colour from Sector |
| Temperature, sky word | `Cycle_Weather.jsonl` |
| Street shape, colours, lit windows, unnamed buildings, where a person stands | drawn by code, seeded by the neighborhood name — not sim data |
| Water on one side of Baylight | `docs/canon/INSTITUTIONS.md` §Neighborhoods (harbor waterfront) |

Cap: 110 people shown per neighborhood (`CAP`); labels show up to 4 at a time, so busy streets under-label.

## Rules for this folder

- Reads only. Never writes a sheet, a ledger, or anything under `output/`.
- Invents nothing about a citizen: a label is the engine's own line, verbatim.
- Decoration that looks like a fact (an address, a landmark) needs a source in the sheets or canon first.

## Known state (2026-11-10)

- Checked once as a still frame of the Grand Lake opening, desktop width. A full flight and a gate crossing were not watched.
- Every neighborhood uses the same street template.
- The sim holds no street address: a citizen has `Neighborhood` + `HouseholdId`; a household has `HousingType`, `MonthlyRent`.
- `Reflection_Intake.jsonl` (citizens' own words, with `Affect`) is not used yet.
