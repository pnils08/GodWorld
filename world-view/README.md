# world-view

A hands-off 3D flight through the 22 neighborhoods, drawn from one week of engine output. Started 2026-11-10 (builder: "this has promise"). No ROLLOUT row yet — claim one on the builder's word before more build.

## What it is

- `build.js` — reads `output/beats/` (read-only), writes one self-contained page `oakland-week.html` (gitignored; regenerate, don't commit).
- `template.html` — the page: three.js r128 from cdnjs, everything else inline. No art files; all geometry and textures are drawn in the browser.
- Run: `node world-view/build.js [dest]`.
- Published copy: https://claude.ai/artifact/RyjhthcNoP7JXGmmVYv8WK (private to the builder). Update it by publishing with that `url`.

## Builder rulings (2026-11-10)

- Layout latitude: "The landmass doesn't need to be a 1 for 1 with real Oakland, who you set the hood parcel and where landmarks appear is your call based on fit." Where a street runs and where a set piece stands are drawing choices; names and character still come from canon.
- Addresses (direction given, NOT built, needs its own ROLLOUT row — it adds ledger columns and a parcels tab, engine substrate): "we would just need to add these to the ledger and create the parcels that with server addresses we give out. We can preattach the parcel by size and price."

## Neighborhood character

- `hoods.js` — one entry per neighborhood: a phrase copied from `docs/canon/INSTITUTIONS.md` (`q`) and the drawing choices read off it (wall material, heights, density, lit windows, houses or blocks, trees, hill, water side, set pieces). The phrase is shown on screen under the name.
- `build.js` exits non-zero if a neighborhood has no entry, or a phrase or painted landmark name is no longer in INSTITUTIONS.md.
- Set pieces: cranes (West Oakland, East Oakland), City Hall (Downtown), Oakland Asian Cultural Center (Chinatown), Heinold's (Jack London), elevated station with a train (Fruitvale), Oakland Coliseum lit (East Oakland), market stalls (Grand Lake), Fox Theater Oakland (KONO), pergola on the lake (Lake Merritt), the Baylight stadium drawn under construction (canon: the A's have not moved yet).
- These numbers are drawing choices off the cycle path. They are not a hood table for the engine and nothing in `phase*/` may read them.
- Links: `#west-oakland` opens on a place; `#west-oakland-mid` opens partway down its street.

## What comes from the sim, what does not

| On screen | Source |
|---|---|
| Neighborhood list, people per neighborhood | `LifeHistory_Log.jsonl`, current cycle from `meta.json`, rows with a Name and Neighborhood |
| A person's line and light colour | their highest-ranked `EventTag` that week (`kindOf` in `build.js`) |
| Shop names, building height | `Business_Ledger.jsonl` Name, Employee_Count; sign colour from Sector |
| Temperature, sky word | `Cycle_Weather.jsonl` |
| Street shape, colours, lit windows, unnamed buildings, where a person stands | drawn by code, seeded by the neighborhood name — not sim data |
| How a neighborhood looks, its landmarks, water, hill | `hoods.js`, each entry tied to a phrase in `docs/canon/INSTITUTIONS.md` |

Cap: 110 people shown per neighborhood (`CAP`); labels show up to 4 at a time, so busy streets under-label.

## Rules for this folder

- Reads only. Never writes a sheet, a ledger, or anything under `output/`.
- Invents nothing about a citizen: a label is the engine's own line, verbatim.
- Decoration that looks like a fact (an address, a landmark) needs a source in the sheets or canon first.

## Known state (2026-11-10)

- Checked as still frames only: ten neighborhoods, desktop width, before the last round of fixes (shopfronts, trees, house windows, label collisions, sky). A full flight, a gate crossing, the train, and the twelve other neighborhoods were not watched.
- Not yet: steering by hand, pick-a-citizen, reflections, overview map.
- The sim holds no street address: a citizen has `Neighborhood` + `HouseholdId`; a household has `HousingType`, `MonthlyRent`.
- `Reflection_Intake.jsonl` (citizens' own words, with `Affect`) is not used yet.
