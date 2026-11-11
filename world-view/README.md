# world-view

A hands-off 3D flight through the 22 neighborhoods, drawn from one week of engine output. Started 2026-11-10 (builder: "this has promise"). No ROLLOUT row yet — claim one on the builder's word before more build.

## What it is

- `build.js` — reads `output/beats/` (read-only), writes one self-contained page `oakland-week.html` (gitignored; regenerate, don't commit).
- `template.html` — the page: three.js r128 from cdnjs plus its bloom add-on from jsdelivr, everything else inline. No art files; all geometry and textures are drawn in the browser.
- `places.js` — the shapes of landmark businesses, inlined into the page.
- `hoods.js` — how each neighborhood is drawn, tied to canon phrases.
- Run: `node world-view/build.js [dest]`.
- Published copy: https://claude.ai/artifact/RyjhthcNoP7JXGmmVYv8WK (private to the builder). Update it by publishing with that `url`.

## Builder rulings (2026-11-10)

- Layout latitude: "The landmass doesn't need to be a 1 for 1 with real Oakland, who you set the hood parcel and where landmarks appear is your call based on fit." Where a street runs and where a set piece stands are drawing choices; names and character still come from canon.
- Addresses (direction given, NOT built, needs its own ROLLOUT row — it adds ledger columns and a parcels tab, engine substrate): "we would just need to add these to the ledger and create the parcels that with server addresses we give out. We can preattach the parcel by size and price."

- Authority: "This isn't a canon breaking build so you can take authority on the coding elements and the quality."
- Baylight: "the As and the Oaks have stadiums going up in the Baylight." Both are drawn under construction. The ledger rows are `Civis Systems Field "The Town"` (sector `As Stadium`) and `Oakland Oaks`; INSTITUTIONS.md names only the A's stadium so far.
- Parcels: "The building parcels would eventually be coded with addresses so the businesses occupy a parcel more deliberately than just the names on buildings randomly."

## Parcels

- `build.js` `layout()` lays every street out as parcels with stable ids (`west-oakland-e07`: neighborhood, side, number down the street) and decides which business sits on which, so the page draws a layout, it does not roll one.
- A ledger business that is a place in its own right gets its own kind of parcel (`placeType()`): stadium, arena, coliseum, city hall, theater, cultural center, saloon, house of worship, farmers market, transit hub, port. Their names come from the ledger row; nothing is painted that the ledger does not hold.
- Every other business takes an ordinary parcel: candidates spread evenly down the street, biggest employer on the widest lot.
- When the ledger carries a parcel or address per business, read it in `layout()` and drop the choosing. Parcel ids are not shown on screen: they are not addresses.

## Neighborhood character

- `hoods.js` — one entry per neighborhood: a phrase copied from `docs/canon/INSTITUTIONS.md` (`q`) and the drawing choices read off it (wall material, heights, density, lit windows, houses or blocks, trees, hill, water side, set pieces). The phrase is shown on screen under the name.
- `build.js` exits non-zero if a neighborhood has no entry, or a phrase or painted landmark name is no longer in INSTITUTIONS.md.
- Scenery in `hoods.js` `set` is only what is not a business: cranes, the Lake Merritt pergola. Landmark businesses come from the ledger (§Parcels).
- These numbers are drawing choices off the cycle path. They are not a hood table for the engine and nothing in `phase*/` may read them.
- Links: `#west-oakland` opens on a place; `#west-oakland-at-40` opens 40% of the way down its street.

## What comes from the sim, what does not

| On screen | Source |
|---|---|
| Neighborhood list, people per neighborhood | `LifeHistory_Log.jsonl`, current cycle from `meta.json`, rows with a Name and Neighborhood |
| A person's line and light colour | their highest-ranked `EventTag` that week (`kindOf` in `build.js`) |
| Shop names, building height | `Business_Ledger.jsonl` Name, Employee_Count; sign colour from Sector |
| Temperature, sky word | `Cycle_Weather.jsonl` |
| Sex, age band, role on a card; figure size, grey hair | `output/simulation_ledger_snapshot.jsonl` Gender, BirthYear, RoleType. Bands and the sim year mirror the engine (`deriveLifeState_`, `simYearFromCycle_`); the card folds them to youth (22 and under) / adult / senior |
| "Their words" on a card | `Reflection_Intake.jsonl`: the person's most recent row, trimmed to 300 characters, with its week, where it was said (Daypart) and Affect |
| Street shape, colours, lit windows, unnamed buildings, where a person stands | drawn by code, seeded by the neighborhood name — not sim data |
| How a neighborhood looks, its landmarks, water, hill | `hoods.js`, each entry tied to a phrase in `docs/canon/INSTITUTIONS.md` |

Cap: 110 people shown per neighborhood (`CAP`); labels show up to 4 at a time, so busy streets under-label.

## Rules for this folder

- Reads only. Never writes a sheet, a ledger, or anything under `output/`.
- Invents nothing about a citizen: a label is the engine's own line, verbatim.
- Decoration that looks like a fact (an address, a landmark) needs a source in the sheets or canon first.

## Known state (2026-11-10)

- Checked as still frames only: ten neighborhoods, desktop width, before the last round of fixes (shopfronts, trees, house windows, label collisions, sky). A full flight, a gate crossing, the train, and the twelve other neighborhoods were not watched.
- In: walk-it-yourself steering (keys, drag, on-screen pad), names for everyone nearby, glow, shadows, weather from `Cycle_Weather` (`WX=rain node build.js` to look-test a kind the week did not have), quality that steps down on slow devices.
- In: sex, age band and role on every card; reflections on cards, and a "Their words" switch that leads with them.
- Not yet: pick-a-citizen, overview map.
- The sim holds no street address: a citizen has `Neighborhood` + `HouseholdId`; a household has `HousingType`, `MonthlyRent`.
- Reflections in the dump stop at the week before the fire (C115 dump: newest rows are week 114), so a card says which week the words are from. 455 of 980 shown people have any.
- 36 of 980 shown people have no sex on the ledger; their card leaves it out.
