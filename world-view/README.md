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

## Ambient modules

One file each, inlined by `build.js` after `places.js`. Each is plain browser JS (three.js r128 global `THREE`, no modules, ES5-style like the page) and may define only its own hook:

| File | Hook | Called |
|---|---|---|
| `life-traffic.js` | `LIFE.traffic = function (k) {}` | once per place, after the street, cars and lamps exist |
| `life-nature.js` | `LIFE.nature = { trees(k, list) -> true if it drew them, ambient(k) }` | `trees` where the page would draw trees (`list` = `[x, z, trunkHeight]`); `ambient` with the others |
| `life-water.js` | `LIFE.water = { surface(k) -> true if it drew the water, life(k) }` | `surface` where the page would draw the water plane (only when `k.water` is -1 or 1); `life` with the others |
| `life-street.js` | `LIFE.street = function (k) {}` | once per place |
| `sound.js` | `SOUND = { supported(), start(), stop(), enter(info), tick(state) }` | `enter` on each place, `tick` every frame; nothing may sound before `start()` (the Sound button) |

The kit `k` (one per place, rebuilt on every crossing — everything added under `k.root` is disposed with the place):

- Scene: `k.THREE`, `k.root` (add everything here), `k.ground` (group that tilts with a hill; children use z relative to 10), `k.camera`.
- The place: `k.H` (`name`, `people`, `biz`), `k.ST` (its `hoods.js` entry: `q`, `wall`, `trees`, `neon`, `water`, `set`…), `k.LAY` (`L`, `water`, `slope`, `parcels[{s,z,w,d,h,k,b}]`, `places[{type,s,z,half}]`), `k.L` street length, `k.gz` gate z (street runs from z≈40 behind the start, past the camera start at z=10, to `k.gz`), `k.water` (-1/0/1 side the water is on), `k.slope`, `k.WX` (`clear|rain|fog|overcast`), `k.warm` (sky hue).
- Street geometry: road is |x| < `k.ROAD` (6.4); travel lanes are centred on x = ±`k.LANE` (2.4), parked cars sit at ±(ROAD-1.05), pavement runs from ROAD to `k.WALK` (10.2), buildings start at WALK. The flight camera rides the centre line about 2.5 high; a walking viewer is 1.7 high anywhere on road or pavement. `k.yAt(z)` is ground height (non-zero only on hill streets).
- Already placed: `k.carSpots [[side, z]]`, `k.lampSpots [[x, z]]`, `k.signs [[side, z]]`, `k.trees [[x, z, trunkHeight]]`, `k.held(side, zA, zB)` true if a landmark holds that ground.
- Drawing helpers: `k.box(w,h,d,x,y,z,[h,s,l],basic)`, `k.flat([h,s,l],basic)` cached material, `k.walled(...)`, `k.blade(text,hue,side,y,z,width)`, `k.glow(x,y,z,color,size)` a static additive light sprite (call during the hook, before it returns), `k.glowTex`, `k.canvasTex(w,h,draw)`, `k.crane(x,z,h)`, `k.beacons` (push x,y,z for a blinking red light).
- Animation: `k.ticks.push(function (t, dt, cam) {})` — `t` seconds since the place was built, `cam = {x,y,z,walking}`. Keep per-frame work small.
- `k.r()` seeded random for layout (same place looks the same every visit). `k.quality()` 2/1/0 — skip the expensive part at 0.

Rules for every module: add meshes only under `k.root`; use `InstancedMesh` for anything repeated more than about 20 times and keep a module to roughly a dozen draw calls; mark textures you create with `material.userData.own = true`; paint no words except names that are on a ledger row in `k.H.biz`; nothing solid on the centre line of the road at camera height. Draw only what the place's canon line, its `hoods.js` entry, its ledger businesses, or the week's weather supports.

Looking at it: `tools/view.sh <place> <out.png> [--cam "x,y,z" --look "x,y,z"] [--t0 s] [--ms n] [--size WxH] [--wx rain]` (see its header). For key presses and clicks use puppeteer from `/root/GodWorld/node_modules` with Chrome at `/opt/google/chrome/chrome` and `--no-sandbox --enable-unsafe-swiftshader --use-angle=swiftshader`.

### What each module draws (2026-11-11)

- `life-traffic.js` — two lanes of car-following traffic, amount read off the place's `hoods.js` numbers and canon line; Downtown buses lettered from the ledger row `AC Transit` that pull in to two kerb stops (`k.busStops`). A bus needs a non-rail Public Transit row in `k.H.biz`; no other place has one.
- `life-nature.js` — takes over tree drawing (six shapes, vertex-shader sway), adds back-garden trees on house lots and a shore row at Lake Merritt; one instanced bird mesh for pigeons, sparrows, gulls, ducks, geese; perched birds lift off when the viewer nears; a dusk flock; leaves. Its moths are off while `life-street.js` is loaded (that module circles its own).
- `life-water.js` — the water surface (own shader, sky colours, light streaks, rain pocks) and its edge; Baylight marina, ferry terminal and a ferry on a 150 s loop; Jack London tug, barge, pilot boat; Brooklyn float and kayaks (ledger: Shoreline Kayak & Paddle); Lake Merritt sculls (ledger: Lakeside Rowing Club). Reads the page's sky material directly and leaves `k._water` for others — both outside the contract above.
- `life-street.js` — live window quads registered over the baked wall textures (it carries a copy of the page's `hash`/`rng`/`WALLS` table: change `wallPair()` in the page and this must follow), house windows and doors, wordless neon, steam and smoke, aircraft and meteors, moths, rain ripples and gutters, porch lights and shop doors that react, a cat.
- `sound.js` — a bed whose mode, register and density come from the place's `hoods.js` entry, plus layers picked from water, trees, weather, people count and the landmark types on the street. Measured for level, clicks, node count and silence; not yet listened to by a person.

Drawn but not named in canon (generic fittings — cut on the builder's word): Baylight breakwater with entrance lights, a waiting room on the ferry pier, far-shore skylines, boat side lights.

Not verified for any module: motion at a real frame rate, a real phone, the quality-0 path (headless never drops quality), the walk-up reactions with real key input.

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
- In: People finder and the stand-with-someone view (`#who-<name>`), households on one street walking together, an owner standing outside their own business, five ambient modules.
- Not yet: overview map; a citizen's own Supermemory page (`SMPageId`) in the person view.
- The sim holds no street address: a citizen has `Neighborhood` + `HouseholdId`; a household has `HousingType`, `MonthlyRent`.
- Reflections in the dump stop at the week before the fire (C115 dump: newest rows are week 114), so a card says which week the words are from. 455 of 980 shown people have any.
- 36 of 980 shown people have no sex on the ledger; their card leaves it out.
