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
- Every other business whose `Neighborhood` is one of the 22 streets takes an ordinary parcel: candidates spread evenly down the street, biggest employer on the widest lot. 14 ledger businesses have no street (10 `City-wide`, and `Brooklyn Basin`, `Old Oakland`, `Coliseum`, `Telegraph corridor`); they are listed in `data.unplacedBiz` and the build log, not guessed onto a street.
- Parcel ids are deterministic for the same inputs, not durable: street length follows the week's headcount and business count, so an id can move between weeks. Real addresses need a persisted lot table and a separate business-to-lot assignment (the addresses job), not this layout.
- When the ledger carries a parcel or address per business, read it in `layout()` and drop the choosing. Parcel ids are not shown on screen: they are not addresses.

## Neighborhood character

- `hoods.js` — one entry per neighborhood: a phrase copied from `docs/canon/INSTITUTIONS.md` (`q`) and the drawing choices read off it (wall material, heights, density, lit windows, houses or blocks, trees, hill, water side, set pieces). The phrase is shown on screen under the name.
- `build.js` exits non-zero if a neighborhood has no entry, or a phrase or painted landmark name is no longer in INSTITUTIONS.md.
- Scenery in `hoods.js` `set` is only what is not a business: cranes, the Lake Merritt pergola. Landmark businesses come from the ledger (§Parcels).
- These numbers are drawing choices off the cycle path. They are not a hood table for the engine and nothing in `phase*/` may read them.
- Links: `#west-oakland` opens on a place; `#west-oakland-at-40` opens 40% of the way down its street.

## Building fronts (2026-11-14)

- Walls: `wallPair()` in `template.html` paints one tile per wall kind and share of lit windows (brick courses, render with string courses, cast concrete panels, a glass curtain wall, boarded houses), with windows set back into the wall: head, sill, frame, bars, glass with a little sky in it, and rooms behind the lit ones (curtains, blinds, a lamp; office floors behind glass). A building repeats the tile by whole bays across and whole floors up from the pavement (`walled()`; the counts are left on the lot as `p.B`, `p.F`).
- `life-street.js` lays its living windows over these and draws the same frame and bars in its shader. It copies the grid only (`n`, `win`, `tile` in `WALLS`) and reads `p.B`, `p.F`: change the grid in one file and the other must follow; what is painted inside the grid is free.
- Ground floors: `frontSheet()` paints one sheet of parts and `build()` assembles every street's ground floors from it into two meshes. A building with no business gets a street door with a light over it in one bay and a window in each of the others (a glass building gets lobby glazing). A business gets a shop front that stands 30 cm proud of the wall, with the glass cut out so the room behind is seen at its own depth, a board over the window with no words on it (the name is on the hanging sign, from the ledger row), and an awning. Panes keep their size; a wider lot gets more of them. The door's place is left on the lot as `p.doorZ` for the light `life-street.js` spills from it.
- What stands behind a shop's glass is read off the ledger row's own `Sector`: goods on shelves for retail, tables and hanging lamps for food and drink, a plain front room with a desk for everything else. The goods and the furniture are generic shapes; nothing is lettered.
- Houses: a pitched roof (gable to the street on most), a chimney on some, a step at the door; windows and door are still `life-street.js`'s.
- Landmark places (`places.js`): doors and windows are painted panels lit from inside (`doorsTex`, `archTex`, `posterTex`, `masonTex`, `panel()`), with no words and no emblems. A theater has glass doors on a lit lobby and posters in their cases; city hall has tall doors behind its columns; a house of worship is dressed stone or brick with its gable end to the street, tall round-headed windows of plain leaded glass, buttresses and timber doors (still no symbol: the name says whose it is); which stone and which glass comes off the name's own seed. The station, market, coliseum, arena, ballpark, port and cultural center are as they were.

## Chaos cars (2026-11-14)

Builder 2026-11-14: "a cool thing we can add is showing the chaos cars that hit a neighborhood or the citizen in that neighborhood. Like on the street they could be apart of the vehicle loop".

- Source: `Chaos_Cars` is not a beats tab. `build.js` reads the cycle's rows from the table `buildWorldSummary.js` prints under `## Chaos Events` in `output/world_summary_c<N>.md`, and the seed lines under it. No summary for the cycle, no chaos cars drawn (the build log says so).
- Which street: a `neighborhood` row goes on that neighborhood's street; a `business` row on the street its ledger row names (and stops outside its lot when it has one); a `citizen` row on the street that citizen is shown on, else the street the ledger says they live on. A row that lands on none of the 22 streets is kept in `data.chaos.elsewhere` and not drawn. Each street's rows are `h.chaos`.
- On the street (`life-traffic.js`): each row is one vehicle in the traffic loop, up one side and back down the other. It stops where its row points (outside the business; beside the citizen wherever they are standing when it arrives; part way down for a neighborhood row). A garbage truck works down the street in short stops, a sweeper crawls without stopping, an ice cream truck idles along at about the pace of the flight. Traffic behind waits. Ten of the engine's twelve are road vehicles and have a shape and livery of their own, nothing lettered: cop car, fire engine, ambulance, OARI van, building inspector, garbage truck, mail truck, ice cream truck, street sweeper, the utility's truck.
- The train (`life-rail.js`): a `bart_train` row rides the rail line on its street (§The rail line). It takes every other run: it comes in and holds on the span over the street with an amber lamp turning on its lead car, for a time scaled from the row's own delay (a stalled train sits dark and longest; a clean run goes through). A citizen row goes on the citizen's home street when the line crosses it. A train row on a street with no line is listed in `data.chaos.elsewhere`.
- The ship (`life-water.js` `chaosShips`): a `cargo_ship` row targets the port, so it goes on the street whose ledger has that business (Jack London). One container ship out beyond the wharf does what the row says: steaming in loaded for a cargo surge, riding at anchor for a berth delay, steaming out light for a slowdown or a carrier leaving.
- A thing overhead or far off sets its own ride view (`ev.cam`) and how far its label carries (`ev.far`).
- On screen: a label rides with each (the engine's own display name, and its seed line or its outcome); the top line counts them; tapping the car or its label rides beside it and opens a panel with the name, what it came for, the seed line, the outcome, the metric and magnitude, and a link to the business or citizen. Every word is the engine's.
- `CHAOS_TEST=<street> node world-view/build.js <dest>` puts one of every vehicle on a street to look at shapes (the build warns, the panel says so, and `worldViewCheck.js` fails such a build). `WV_DEBUG.ride = <n>` opens on the nth chaos car.
- Check: `scripts/worldViewCheck.js` matches every chaos car on a street to a row of the summary's table and its seed line to the summary's text, and fails if a row is neither on a street nor listed elsewhere.

## The rail line (2026-11-14)

- Which streets: the engine's own list, `utilities/ensureTransitMetrics.js` `OAKLAND_BART_STATIONS` (the list the chaos train's `transit-served` filter reads). `build.js` loads it and puts the station names on the hood (`h.rail`). This week's page: West Oakland, Fruitvale, Rockridge, Downtown, Temescal, East Oakland. Lake Merritt is on the engine's list and gets no line: it is a waterside street and the line would have to bridge the water.
- What is drawn: where the ledger has the station as a business (Fruitvale's Transit Hub, `PLACES.station`) the station stands round the line and trains call at it. On the other streets `layout()` holds 14 m of ground for a bare crossing (`PLACES.rail`: the guideway on its piers, no platform, no name) and trains run through. Holding that ground lengthens those streets a little and moves their other places along.
- Trains are `life-rail.js` (`LIFE.rail`): one at a time, turn about in each direction; windows lit, riders' heads in them, white lamps at the front and red at the back. No name is painted.
- Check: `worldViewCheck.js` fails a street whose `h.rail` differs from the engine list, a crossing on a street the list does not name, and a chaos train on a street with no line.

## Ambient modules

One file each, inlined by `build.js` after `places.js`. Each is plain browser JS (three.js r128 global `THREE`, no modules, ES5-style like the page) and may define only its own hook:

| File | Hook | Called |
|---|---|---|
| `life-traffic.js` | `LIFE.traffic = function (k) {}` | once per place, after the street, cars and lamps exist |
| `life-nature.js` | `LIFE.nature = { trees(k, list) -> true if it drew them, ambient(k) }` | `trees` where the page would draw trees (`list` = `[x, z, trunkHeight]`); `ambient` with the others |
| `life-water.js` | `LIFE.water = { surface(k) -> true if it drew the water, life(k) }` | `surface` where the page would draw the water plane (only when `k.water` is -1 or 1); `life` with the others |
| `life-street.js` | `LIFE.street = function (k) {}` | once per place |
| `life-rail.js` | `LIFE.rail = function (k) {}` | once per place, after the places; draws nothing unless a place left `k.railLine` |
| `life-people.js` | `LIFE.people = function (k, list) {}` | once per place, last, with the page's people records (one per citizen shown). It draws and moves every figure and keeps `x`, `z` on each record current; the page's cards, taps and the stand-with-someone view read those, and set `hold` on whoever is being visited |
| `sound.js` | `SOUND = { supported(), start(), stop(), enter(info), tick(state) }` | `enter` on each place, `tick` every frame; nothing may sound before `start()` (the Sound button) |

The kit `k` (one per place, rebuilt on every crossing — everything added under `k.root` is disposed with the place):

- Scene: `k.THREE`, `k.root` (add everything here), `k.ground` (group that tilts with a hill; children use z relative to 10), `k.camera`.
- The place: `k.temp` (the week's temperature, a number or NaN), `k.H` (`name`, `people`, `biz`), `k.ST` (its `hoods.js` entry: `q`, `wall`, `trees`, `neon`, `water`, `set`…), `k.LAY` (`L`, `water`, `slope`, `parcels[{s,z,w,d,h,k,b}]`, `places[{type,s,z,half}]`), `k.L` street length, `k.gz` gate z (street runs from z≈40 behind the start, past the camera start at z=10, to `k.gz`), `k.water` (-1/0/1 side the water is on), `k.slope`, `k.WX` (`clear|rain|fog|overcast`), `k.warm` (sky hue).
- Street geometry: road is |x| < `k.ROAD` (6.4); travel lanes are centred on x = ±`k.LANE` (2.4), parked cars sit at ±(ROAD-1.05), pavement runs from ROAD to `k.WALK` (10.2), buildings start at WALK. The flight camera rides the centre line about 2.5 high; a walking viewer is 1.7 high anywhere on road or pavement. `k.yAt(z)` is ground height (non-zero only on hill streets).
- Already placed: `k.carSpots [[side, z]]`, `k.lampSpots [[x, z]]`, `k.signs [[side, z]]`, `k.trees [[x, z, trunkHeight]]`, `k.held(side, zA, zB)` true if a landmark holds that ground.
- Drawing helpers: `k.box(w,h,d,x,y,z,[h,s,l],basic)`, `k.flat([h,s,l],basic)` cached material, `k.walled(...)`, `k.blade(text,hue,side,y,z,width)`, `k.glow(x,y,z,color,size)` a static additive light sprite (call during the hook, before it returns), `k.glowTex`, `k.canvasTex(w,h,draw)`, `k.crane(x,z,h)`, `k.beacons` (push x,y,z for a blinking red light).
- Animation: `k.ticks.push(function (t, dt, cam) {})` — `t` seconds since the place was built, `cam = {x,y,z,walking}`. Keep per-frame work small.
- `k.r()` seeded random for layout (same place looks the same every visit). `k.quality()` 2/1/0 — skip the expensive part at 0.

Rules for every module: add meshes only under `k.root`; use `InstancedMesh` for anything repeated more than about 20 times and keep a module to roughly a dozen draw calls; mark textures you create with `material.userData.own = true`; paint no words except names that are on a ledger row in `k.H.biz`; nothing solid on the centre line of the road at camera height. Draw only what the place's canon line, its `hoods.js` entry, its ledger businesses, or the week's weather supports.

Looking at it: `tools/view.sh <place> <out.png> [--cam "x,y,z" --look "x,y,z"] [--t0 s] [--ms n] [--size WxH] [--wx rain]` (see its header). Filming it: set `window.WV_DEBUG = { manual: true }` and call `__wv.step(dt)` once per frame from puppeteer, one screenshot each (the clock then only moves when stepped, so every frame is exact); `follow: { who: <name or index>, off: [x,y,z], aim: <height> }` rides the camera beside one person; `people: true` logs to `window.__wvPeople` anyone who stops within a pace of someone else. For key presses and clicks use puppeteer from `/root/GodWorld/node_modules` with Chrome at `/opt/google/chrome/chrome` and `--no-sandbox --enable-unsafe-swiftshader --use-angle=swiftshader`.

### What each module draws (2026-11-11)

- `life-traffic.js` — (cars reshaped 2026-11-14: each kind of vehicle — saloon, hatchback, tall car, van, box truck — is one shape lofted from nose to tail with raked glass painted into it; wheels have hubs and turn with the distance covered; the body dips on its springs under braking; the parked cars at `k.carSpots` are the same shapes and are drawn by this file, `LIFE.traffic.parks`, the page keeping plain boxes only for a build without it. The bus is still a lettered box.) Two lanes of car-following traffic, amount read off the place's `hoods.js` numbers and canon line; Downtown buses lettered from the ledger row `AC Transit` that pull in to two kerb stops (`k.busStops`). A bus needs a non-rail Public Transit row in `k.H.biz`; no other place has one.
- `life-nature.js` — takes over tree drawing (six shapes, vertex-shader sway), adds back-garden trees on house lots and a shore row at Lake Merritt; one instanced bird mesh for pigeons, sparrows, gulls, ducks, geese; perched birds lift off when the viewer nears; a dusk flock; leaves. Its moths are off while `life-street.js` is loaded (that module circles its own).
- `life-water.js` — the water surface (own shader, sky colours, light streaks, rain pocks) and its edge; Baylight marina, ferry terminal and a ferry on a 150 s loop; Jack London tug, barge, pilot boat; Brooklyn float and kayaks (ledger: Shoreline Kayak & Paddle); Lake Merritt sculls (ledger: Lakeside Rowing Club). Reads the page's sky material directly and leaves `k._water` for others — both outside the contract above.
- `life-street.js` — live window quads registered over the baked wall textures (it carries a copy of the page's `hash`/`rng` and the grid in `WALLS`, and reads each lot's `p.B`, `p.F`, `p.doorZ`: see §Building fronts), house windows and doors, wordless neon, steam and smoke, aircraft and meteors, moths, rain ripples and gutters, porch lights and shop doors that react, a cat.
- `life-people.js` (2026-11-14) — the citizens as jointed figures: hips, chest, head with a painted face, hair, two-part arms and legs, shoes, hands, a jacket or skirt, a soft shadow on the ground, and the light of their week overhead. Walking is solved from the feet up (each foot planted where it lands, knee from hip and ankle, stride and arm swing from speed), so nothing slides. People walk to a shop front or along their stretch, stop, look in or look at the street, turn and go on; households keep together and turn to each other when they stand; an owner stands outside their business facing the street; walkers pick a clear line past everyone ahead, two meeting head-on each give half, and nobody stops on top of anybody. Read off the sim: sex, age band (size, grey hair, a senior's pace and stoop, a child's short quick steps), household, business, the week's weather (jackets under 62 degrees, bare forearms from 70). Clothes, build and where a walk turns round are drawing choices. The record a figure is built from (`s`, `x`, `z0`, `amp`, `sc`, `long`, `post`, `lead`, `rank`, `kc`) is set in the page's `build()`.
- `sound.js` — a bed whose mode, register and density come from the place's `hoods.js` entry, plus layers picked from water, trees, weather, people count and the landmark types on the street. Measured for level, clicks, node count and silence; not yet listened to by a person.

Drawn but not named in canon (generic fittings — cut on the builder's word): Baylight breakwater with entrance lights, a waiting room on the ferry pier, far-shore skylines, boat side lights.

People (2026-11-14): filmed frame by frame from the side, front, above and in the stand-with-someone view; two minutes of the four busiest streets stepped with no two strangers closer than 0.54 m; about 1 ms a frame for 124 people on the server.

Not verified for any module: motion at a real frame rate, a real phone, the quality-0 path (headless never drops quality), the walk-up reactions with real key input.

## Art

- The sky is painted in code (`paintSky()` in `template.html`): one 1024x512 canvas per sky hue and weather, brushed in layers and wrapped on the dome. It is the slot for real art: a painted image with the same mapping (far end of the street at 3/4 across, horizon halfway down, edges that wrap) can replace the canvas. Builder 2026-11-11: "an painted sky seems like nice start".
- Next candidates in the order discussed: painted building fronts for one neighborhood, portraits on person panels, modeled landmarks, a whole-frame style pass. What the art looks like is the builder's call.

## Saved copies

- The code is the saved version: everything in this folder is committed. `oakland-week.html` is the built page on disk (gitignored, rebuilt by `node world-view/build.js`); `COMMITTED=life-water.js node world-view/build.js` builds with a module as last committed while a helper is mid-edit on it.

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

Cap: 140 people per neighborhood (`CAP`; the busiest street has 124, so nobody is cut today). Anyone the page cannot show goes to `data.notShown` and the People finder says so; it never says nobody was recorded.

## Who a person is on the page

- Where they stand: the street their week's rows name (`LifeHistory_Log.Neighborhood`). Where they live: the ledger's `Neighborhood`. When the two differ the panel says both. A person whose rows name no neighborhood stands on their ledger home street and the panel says so.
- Their lead line: the top-ranked line of their whole week (`kindOf`), rows with and without a neighborhood together. `CareerState` rows (a state stamp, `industry=…|level=…`) are left out as not an event.
- "Before this week": `LifeHistory` cell lines older than the dumped cycle only.
- People carry their POPID (`id`); a person link is `#who-<name>-<digits>`.
- Check: `node scripts/worldViewCheck.js` (codex) fails loudly when a line, a quote, a business or a family tie on the page is not in the source files. Review that produced these rules: `docs/for-claude-review/2026-11-10-codex-world-view-review.md`.

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
- Reflections: only rows with Cycle at or before the dumped cycle are used (the tab holds 12 rows stamped C119 — left out, not repaired), and a reporter's `filed:` / `graded:` receipts are not treated as something said. Newest usable rows are week 114; a card says which week the words are from.
- 36 shown people have no sex on the ledger; their card leaves it out.
