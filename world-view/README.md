# world-view

A hands-off 3D flight through the 22 neighborhoods, drawn from one week of engine output. Started 2026-11-10 (builder: "this has promise"). ROLLOUT row: infrastructure.19. What to add next: §To add.

## What it is

- `build.js` — reads `output/beats/` (read-only; also the ledger snapshot, the world summary and `output/exchanges/`), writes one self-contained page `oakland-week.html` (gitignored; regenerate, don't commit). Look-test switches: `WX=`, `CHAOS_TEST=`, `SCALE=`.
- `template.html` — the page: three.js r128 from cdnjs plus its bloom add-on from jsdelivr, everything else inline. No art files; all geometry and textures are drawn in the browser.
- `places.js` — the shapes of landmark businesses, inlined into the page.
- `hoods.js` — how each neighborhood is drawn, tied to canon phrases.
- Run: `node world-view/build.js [dest]`.
- Published copy: https://claude.ai/artifact/RyjhthcNoP7JXGmmVYv8WK (private to the builder). Update it by publishing with that `url`.
- When it is rebuilt: at the end of every cycle run (`/run-cycle`, the section after Close; builder 2026-11-14: "the cleanest is to attach it to the end of the cycle run in that skill"), by the session that ran the cycle, which rebuilds, checks and republishes. Nothing rebuilds it between fires: a cron cannot publish to the link (publishing is a session tool, not an API call), and nearly everything on the page is written once a week. The reflections citizens add on the days between are therefore up to a week behind (228 were written between the C115 dump and 2026-11-14).

## To add (builder 2026-11-14)

Builder 2026-11-14, on the sheet review: "lets record these as items to add and we can do neighborhoods next". The review: 85 tabs on the live sheet, 27 in `output/beats/`, 6 of those read by `build.js` (plus the ledger snapshot and the world summary). Counts are C115. What each item looks like on the street is the builder's call; the source column is where it would come from.

| # | Item | Source | C115 | In `output/beats/` | State |
|---|---|---|---|---|---|
| 1 | Neighborhood state on the street: how lit, loud and busy; growing or steady; holiday and First Friday | `Neighborhood_Map` (NightlifeProfile, NoiseIndex, RetailVitality, Sentiment, NeighborhoodTrajectory, TrajectoryMomentum, HousingPressure, MigrationFlow, Holiday, FirstFriday) | 22 rows, one a street | yes, from 2026-11-14 (`scripts/dumpBeatTabs.js` `BEAT_TABS`) | direction built (§The direction scale); nightlife, retail, noise, mood and the holiday flags open |
| 2 | Staff at their own business, not only the owner | `Employment_Roster` (BIZ_ID, POP_ID, RoleType, Status) | 971 rows, 921 with a BIZ_ID | yes | open |
| 3 | The week's faith events at the house of worship | `Faith_Ledger` (Organization, EventDescription, Neighborhood, Attendance) | 5 | yes | second in line after homes (builder 2026-11-15: "And the faith add and the sports week After") |
| 4 | Deaths, retirements, promotions marked on the person or their shop | `Lived_Events` (kind, subject, neighborhood, recipients) | 3, and one death at C114 with its mourners | yes | open |
| 5 | Initiatives on the streets they affect | `Initiative_Tracker` (AffectedNeighborhoods, ImplementationPhase, Stage, BizID) | 14 | yes | open |
| 6 | Station ridership: how often trains run, how full | `Transit_Metrics` Station rows (RidershipVolume, OnTimePerformance, Notes) | 8 stations | yes | open |
| 7 | Game night on the home street | `Oakland_Sports_Feed` (HomeNeighborhood, EventType, Streak, WeekRecord) | 7 | yes | third in line, after faith (builder 2026-11-15) |
| 8 | Community programs where they run | `Community_Programs` (Name, Neighborhood, Founder_POPID, Status) | 33 | yes | open |
| 9 | Cultural figures on their street | `Cultural_Ledger` (Name, Neighborhood, FameScore, TrendTrajectory) | 51 | yes | open |
| 10 | Crime numbers | `Crime_Metrics` | 22 | yes | open: what it shows, if anything, is the builder's |
| 11 | Busy shop fronts and quiet ones | `Business_Ledger` Growth_Rate, Annual_Revenue | 283 | yes | open |
| 12 | Homes by rent or own | `Household_Ledger` HousingType, MonthlyRent, HouseholdIncome | 677 active households | yes | built (§Homes); people leaving their own door is open |
| 13 | World events on the street (roadworks, incidents) | `WorldEvents_V3_Ledger` (EventDescription, Severity, Neighborhood) | 10 | no | open |
| 14 | People who know each other stop to talk | `Relationship_Bonds` (CitizenA, CitizenB, BondType, Intensity) | 697 rows | yes, from 2026-11-15 | built (§People who know each other) |
| 15 | A street under strain | `Event_Arc_Ledger` (Type, Phase, Tension, Neighborhood) | 0 stamped C115; newest C114 `CRISIS-114-DOWNTOWN` at onset | no | open |
| 16 | Shop rush and street life | `Texture_Trigger_Log` (TextureKey, Neighborhood, Intensity) | 13 | no | open |

Left out: `Youth_Events` (no row since C102; `dumpBeatTabs.js` already leaves it out as dead by ruling) and the `Transit_Metrics` Corridor rows (no Neighborhood column, so a corridor on a street would be a guess).

## Builder rulings (2026-11-10)

- Layout latitude: "The landmass doesn't need to be a 1 for 1 with real Oakland, who you set the hood parcel and where landmarks appear is your call based on fit." Where a street runs and where a set piece stands are drawing choices; names and character still come from canon.
- Addresses (direction given, NOT built, needs its own ROLLOUT row — it adds ledger columns and a parcels tab, engine substrate): "we would just need to add these to the ledger and create the parcels that with server addresses we give out. We can preattach the parcel by size and price."

- Authority: "This isn't a canon breaking build so you can take authority on the coding elements and the quality."
- Baylight: "the As and the Oaks have stadiums going up in the Baylight." Both are drawn under construction. The ledger rows are `Civis Systems Field "The Town"` (sector `As Stadium`) and `Oakland Oaks`; INSTITUTIONS.md names only the A's stadium so far.
- Homes (direction given 2026-11-15, NOT built, needs its own ROLLOUT row: parcel ids on households are ledger work): "if I want to be able to have their homes eventually mapped out we would need more street or to be able to turn into a residential area", "the streets wouldn't need to connect you just need to hit next or places to move about", "like the business , we would start to give the parcels and ID/address attached to the household , maybe renters are on the Main Street or a seperate block ? This way we can eventually move towards parcels carrying value in the home buying system on the sheets". The portal: "we can decide later". Order agreed: this build on the streets as they are, then residential streets inside each neighborhood, the portal last.
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
- On screen: a label rides with each (the engine's own display name, and its seed line or its outcome); the top line counts them; tapping the car or its label (the label is a button) rides beside it and opens a panel with the name, what it came for, the seed line, the outcome, the metric and magnitude, and a link to the business or citizen. Every word is the engine's.
- `CHAOS_TEST=<street> node world-view/build.js <dest>` puts one of every vehicle on a street to look at shapes (the build warns, the panel says so, and `worldViewCheck.js` fails such a build). `WV_DEBUG.ride = <n>` opens on the nth chaos car.
- Check: `scripts/worldViewCheck.js` matches every chaos car on a street to a row of the summary's table and its seed line to the summary's text, and fails if a row is neither on a street nor listed elsewhere.

## The direction scale (2026-11-14)

Builder 2026-11-14: "Declining on a scale . Whatever the next week builds on shifts the scale . A decline on a decline is a Notch a scale may be the easiest way . The scale slides 5 to -5 . This could work for all things your building , but if the code itself can alter that could be a good way." and "You can add a tab if needed".

- The scale is the engine's and the engine moves it. `Neighborhood_Map.TrajectoryMomentum` runs 0–10 with 5 neutral: a growth cycle is a notch up, a decay cycle a notch down, a steady cycle a notch back toward 5 (`phase05-citizens/neighborhoodTrajectoryEngine.js`, which also reads a blank cell as 5). The page shows it as −5..+5: `build.js` puts `h.state = { dir, scale, since }` on each street (`NeighborhoodTrajectory`, `TrajectoryMomentum − 5`, `TrajectoryStartCycle`) from the row stamped with the dumped cycle. No tab was added and nothing on the page moves the scale.
- The dump: `Neighborhood_Map` is in `scripts/dumpBeatTabs.js` `BEAT_TABS` from 2026-11-14, so every cycle run writes it. The C115 file was written once, on its own, from the live tab (22 rows, all Cycle 115), in the dump's own row format; no other dump file or `meta.json` was touched. No dump file, no state: the build says so and draws the streets as before.
- C115: +5 Downtown, Fruitvale, Jack London, Uptown; +4 West Oakland; +3 Grand Lake; +1 Rockridge, KONO; 0 Temescal, Piedmont Ave, Chinatown, Lake Merritt, East Oakland; −1 Laurel; −3 Dimond; −4 Eastlake; −5 Adams Point, Brooklyn, Glenview, Ivy Hill, San Antonio, Baylight District. Ten of 22 sit at an end (gap log G-EC67).
- What it draws (drawing choices; the builder's call):
  - Lit windows: 14% of the street's own share a notch (`layout()`; 0.3 of it at −5, 1.7 at +5), in steps of 0.05 so streets share wall tiles.
  - Buildings no ledger business stands in (`plainFront()` in `template.html`): below zero, 9% of them a notch have an empty ground floor, a shutter down over each window with a notice on it (no words); from −3 some of those are boarded instead. Above zero, 10% a notch carry window boxes. From +3, up to three (5% a notch, none over 20 m) stand under scaffolding: poles, boarded decks, sheeting.
  - A ledger business is never drawn shut, and no person is added or removed.
  - Top line: the scale, the engine's own word (`decay | steady | growth`) and the cycle it began.
- Look-test: `SCALE=<-5..5> node world-view/build.js <dest>` puts every street at that notch (the build warns, the top line says so, `worldViewCheck.js` fails such a build).
- Check: `worldViewCheck.js` matches every street's `state` to its `Neighborhood_Map` row for the cycle (`STATE` line) and fails a state with no row, a row with no state, last cycle's row, and a look-test scale.
- Not on a scale yet: nightlife, retail, noise, mood. The engine holds this cycle's number for each on the same row, not a notch counter. Either the page places each street against the city's middle that cycle, or the engine keeps a counter for each (engine work, its own row): the builder's.
- Checked: Temescal at −5, −2, 0, +3, +5 on look-test builds; Adams Point, Glenview, San Antonio (−5) and Uptown, Fruitvale (+5) as the cycle has them; a shuttered and a boarded front, a scaffolded building; all 22 streets open without error; page check and 24 tests pass. Not checked: a real phone.

## People who know each other (2026-11-15)

Builder 2026-11-15: "People who know each other ...", then on the plan: "this is good , the reflection ledger often holds the conversations that happened , I like you ideas here and there should be a reaction for a bad bond".

- Source: `Relationship_Bonds`, the bond engine's master state, one row a pair (`BondType`, `Intensity` 0–10, `Status`). In `scripts/dumpBeatTabs.js` `BEAT_TABS` from 2026-11-15, so every cycle run writes it. The C115 file was written once, on its own, from the live tab while the live cycle was still 115 (697 rows); no other dump file or `meta.json` was touched. No dump file, no ties: the build says so.
- What the page carries (`build.js` → `data.ties`, `data.offStreet`): every `active` row between two citizen ids where at least one is on a street this week, in the row's own order: `{ a, b, t, i, note, since, up, talk }`. Active only, as a citizen's own wake is told (`lib/wakePerception.js` `loadBonds`). `note` is the row's `Notes` less the seeding mark. Someone tied to a person on a street but with no week on record is named from the ledger in `data.offStreet` and greyed. C115: 665 ties; 359 with both on one street (219 friendship, 61 family, 52 professional, 15 neighbor, 8 rivalry, 2 romantic, 1 alliance, 1 tension), 298 of them not of one household; 13 streets have some, nine have none. Two active rows name someone who is not a citizen id and are not shown (gap log G-EC69).
- The sim holds the tie, not a meeting. Two people stopping on a street is drawn from the tie, the way a household walking together is; nothing on the page says they met this week.
- What did happen: a saved conversation. `scripts/citizen-exchange.js` runs one bonded pair a day and saves it to `output/exchanges/exchange_c<N>_<date>_conversation.md` (the same lines each of them carries on `Reflection_Intake` as `CONVO`). `build.js` `talksRead()` takes each pair's latest one at or before the dumped cycle and puts it on their tie, word for word, with its week. C115: 47 ties carry one, 28 of them with both people on one street; two saved conversations are between people whose bond is no longer active and are not shown. The dump's `Reflection_Intake` cannot say who a conversation was with: the tab's counterpart column has no header (gap log G-EC71).
- Words for a tie (`tieWords()` in `template.html`): the ones a citizen's wake uses (`BOND_PHRASE`, "close" from intensity 5), in the third person: a friend / a close friend, family / close family, someone they know through work, an ally / someone they count on, someone they butt heads with, someone they love / their partner in life. A type the wake has no phrase for is the tab's own word (a neighbor, a sports rival, tension, mentorship).
- On the street (`life-people.js`, drawing choices):
  - Same side: nobody on the page crosses the road, so `build()` in `template.html` puts each knot of people tied to one another, households included, on one side along one stretch of it (outside the business one of them runs, else where the middle one of them stood), each changing places with a person tied to nobody there, so the street keeps its spacing and people who know each other are within a walk of each other; someone posted outside their business stays there. A busy street is 300 m long, and before this the two ends of a tie stood about 110 m apart.
  - A good tie: now and then one of them walks over to the other, or the two stop as they pass; they stand a pace apart facing each other and talk, taking turns, the one talking with a hand up, the other nodding; then they go on. A stronger tie means more often and longer (6 to 26 seconds). A household comes along and turns to whoever stopped. Some pairs are already mid-conversation when the flight arrives.
  - A bad tie (`rivalry`, `tension`, `sports_rival`), the builder's "reaction for a bad bond": no stopping and no argument (the engine records a confrontation as its own event; the page does not add one). Each looks at the other, then pointedly away; whoever is walking takes the far edge of the pavement and picks up the pace; whoever is standing turns their back until the other has gone by.
- On screen: a card gets a line while it lasts, "With Genevieve Martinez, a close friend." (and "They talked in week 115." when a saved conversation is on the tie), or "Passing Devon Hale, someone they butt heads with."; people in either state are first in line for a card. The person panel has "People they know": strongest tie first, each name a link when they are on a street this week (and which street), the tie in words, the cycle the row dates from, the engine's note when it has one, and the saved conversation under "They talked in week N".
- Check: `worldViewCheck.js` (`TIES` line) matches every tie to its active row (order, type, intensity, note, cycles), every such row to the page, an off-street name to the ledger, and a conversation to the pair's latest saved file, line for line; it fails a faded bond, a bare name, a missing tie, and a conversation from a later cycle.
- Checked (headless, the clock stepped): West Oakland for 80 s: 4 pairs talking on arrival, 2 to 6 at a time after, 12 people walked over to someone in 40 s; the closest two strangers came 0.36 m (someone walking past someone standing) and 0.49 m, against 0.49 to 0.55 m on the page as last committed, measured the same way on three streets. Stills: a pair talking with a hand up, a household stopped with a friend, the card line on a flight card, the panel with a conversation open, and a rival pass on Rockridge (forced for the still: one of the two was moved up the street; none happened unprompted in the minutes stepped). All 22 streets open without error on the final build, 33 pairs talking on arrival across them; 287 of the 298 ties stand on one side of their street (the other 11 had nobody to change places with and stay across the road, undrawn). Page check, 25 page tests and 18 dump tests pass. Not checked: a real phone, motion at a real frame rate, a pass between two walking rivals.
- Look-test: `WV_DEBUG` leaves `window.__wvLinks` (each tie on the street and its state: 1 one is on the way over, 2 stopping, 3 talking, 5 a bad-tie pass) and `__wv.withLine(person)`, `__wv.visit(id)`, `__wv.data`.

## Homes (2026-11-15)

Builder 2026-11-15 (§Builder rulings, Homes), then: "File the row and go on the build … I can always change things after". This is the page's side: households on parcels drawn by `layout()`, the way businesses are. Parcel ids on the ledger and parcels carrying value are ROLLOUT engine.345, not this.

- Source: `Household_Ledger` (in the dump): `Status` active, `Neighborhood`, `HousingType` (rented 551 / owned 126 of the 677 active), `HouseholdType`, `Members`, `HeadOfHousehold`, `MonthlyRent`, `FormedCycle`. Every active household's neighborhood is one of the 22 streets, and no citizen's ledger neighborhood differs from their household's. C115: West Oakland 80 rented / 14 owned, Lake Merritt 56 / 18, Fruitvale 57 / 8, Rockridge 43 / 20, Downtown 39 / 19; eleven streets have under ten households.
- A home is a parcel, or a unit of one, with an id, and one household on it: `data.hoods[].homes = [{ hh, lot (parcel id), unit, own, head, names, type, rent, since }]`, and the parcel carries `hm` (indexes into it). Ids are not shown on screen: they are not addresses until engine.345 puts them on the ledger. When the ledger carries a parcel per household, read it in `layout()` and drop the choosing.
- Who goes where (drawing choices; the builder's to change):
  - Renters: units over the shops and in the plain buildings of the main street (upper floors by the building's height, units by its width; a building with no business also has its ground floor), spread evenly down the street, dearer rent higher up.
  - Owners: houses. Where the street already has houses between its businesses (`fill: 'house'`), owners take those first, spread evenly. Everywhere else, and for whoever is left over, the street runs on past the last business into a residential stretch: house lots, one household each, with a few untracked houses among them (the ledger is the tracked share of the city, never all of it).
  - Renters a street has no unit for take a house on the residential stretch (the builder's "or a seperate block").
- The street: `lay.L` grows by the residential stretch; `lay.Lm` is where the main street ends. Landmarks, businesses and the people keep to the main street as before; the stretch has its own seeded numbers, so the main street is laid out exactly as it was (926 parcels compared with the layout as last committed, none different; the 30 m of buildings that stood behind the old gate as a backdrop are where the houses now begin). Scenery that stands at a share of the street's length (the market stall, the pergola, boats) moves with a longer street. Stretch lots are narrow to keep it walkable: terraced where the street is dense, brick, glass or along water, a house street's own lots at 0.8 of their width, detached elsewhere; a sixth more lots than households, at least two, are houses nobody on record lives in.
- C115: 677 active households on parcels, 551 renting and 126 owning; 14 streets have a stretch, 17 to 80 m on twelve of them, 140 m on Lake Merritt (18 households, houses on one side of the water only) and 178 m on Rockridge (25 households: 20 owners and five renters its shops had no unit for). Eight streets needed none.
- People: unchanged in this cut, except that someone whose week names no place (`noPlace`) and whose home is on this street stands at their own door. People coming out of their door and walking to the main street is not in this cut.
- On screen: tap a house, or a building with tracked homes in it, for who lives there (head, members with links, couple / family / single / solo, rents or owns, the rent for a renter, the week the household formed); a business panel lists the tracked households upstairs; the person panel links to their home; the top line counts the households on the street. A tracked house has its porch light on.
- Check: `worldViewCheck.js` matches every home to its active `Household_Ledger` row (neighborhood, housing type, head, members, rent, cycle), every active household of a shown street to exactly one home, and every home to a lot that exists with room for it.
- Checked (headless, the clock stepped): the stretch on West Oakland, Rockridge, Lake Merritt and Downtown as stills; a house panel (one household, owns), a building panel (two households, each with its rent and floor), the person panel's link to a home in a building, the top line's household count; five people on West Oakland and two on Lake Merritt stand at their own door; all 22 streets open without error; page check (`HOMES` line), 26 page tests and 18 dump tests pass. Not checked: a real phone; a tap on a house with a finger; the look of the stretch on the ten streets not pictured.
- Open: people coming out of their own door and walking to the main street; a household that moves between cycles keeps no lot (lots are re-chosen every build until engine.345); whether an owner in a tower district should own a unit instead of a house (the builder's).
- Order after this (builder 2026-11-15: "And the faith add and the sports week After"): add-list 3, the week's faith events at the house of worship; then add-list 7, game night on the home street.

## Boats (2026-11-14)

Builder 2026-11-14, after watching the flight on his phone: "the boats are still not very defined and hard to tell they are boats".

- Before: every boat was one blunt hull with plain boxes stacked on it. Now each kind of vessel is one whole shape (`life-water.js` `SHAPES`, built by `shaper()`): a hull lofted from stem to stern with sheer, flare, a raked stem and a transom; houses with raked fronts and a band of glass; spars, rigging, rails and gear. Fifteen kinds: `sloop`, `sloopTan` (moored, the main under its cover, the jib rolled on the stay), `sloopSet` (under sail), `cruiser` (flybridge), `express`, `launch`, `workboat`, `tug`, `tow` (the tug with her barge), `pilot`, `ferry`, `kayak`, `scull`, `buoy`, `ship`. About 500 triangles a boat, one draw per kind on the water.
- Paint (`boatMat()`): a colour in a shape is `[r, g, b, paint, glass]`. `paint` 1 takes the boat's own hull colour (per boat, `v.hull`); `glass` 1 is lit from inside on a boat whose lights are on (`v.glass`). Paint keeps a little of its own colour after dark so a white hull stays pale against the water.
- A vessel is `F.vessel(kind, length, { hull, glass, ... })`: the shape and its lights are scaled to the length. Paddles and oars are still moving box parts (`v.parts`).
- The anchored ships and the week's chaos ship are the same lofted ship (`shipShape()`): a raked bow, four decks of windows and the bridge aft, the stack, boxes on deck. The ship berthed at the port (`places.js`) is still boxes: the container yard stands between it and the street.
- The flight looks at them: `life-water.js` leaves `k.sights` (`{ z, half }` a stretch of water, `{ v, half }` a vessel under way) and the flight turns toward the water and slows a little as it passes each (§The camera). Baylight: the marina and the ferry's berth. Jack London: the tug at the wharf, the tug and barge. Brooklyn: the float, the two kayaks. Lake Merritt: the two sculls.
- Someone at a wheel, a paddle or a pair of oars is a generic figure, not a citizen.
- Look-test: `LIFE.water.look` (`SHAPES`, `shaper`, `boatMat`) lets a bare page draw one shape in daylight. Checked: each shape in daylight; the marina, the float, the tug, the ferry, a kayak, a scull, the open water and the chaos ship in the page; the real flight stepped past the marina, the wharf and the float on a 500x900 screen; all 22 streets open without error; rain and fog. Not checked: a real phone.

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
| `life-water.js` | `LIFE.water = { surface(k) -> true if it drew the water, life(k), look }` | `surface` where the page would draw the water plane (only when `k.water` is -1 or 1); `life` with the others, leaving `k.sights` for the flight; `look` is for look-tests (§Boats) |
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

- `life-traffic.js` — (cars reshaped 2026-11-14: each kind of vehicle — saloon, hatchback, tall car, van, box truck — is one shape lofted from nose to tail with raked glass painted into it; wheels have hubs and turn with the distance covered; the body dips on its springs under braking; the parked cars at `k.carSpots` are the same shapes and are drawn by this file, `LIFE.traffic.parks`, the page keeping plain boxes only for a build without it. The bus is one shape too: a long rounded body with a domed roof, the operator's colour in a band over a dark skirt, two doors on the kerb side, a pod on the roof, mirrors, riders in the lit windows; it leans to the kerb while it stands at its stop. Its boards still carry the ledger row's name and nothing else.) Two lanes of car-following traffic, amount read off the place's `hoods.js` numbers and canon line; Downtown buses lettered from the ledger row `AC Transit` that pull in to two kerb stops (`k.busStops`). A bus needs a non-rail Public Transit row in `k.H.biz`; no other place has one.
- `life-nature.js` — takes over tree drawing (six shapes, vertex-shader sway), adds back-garden trees on house lots and a shore row at Lake Merritt; one instanced bird mesh for pigeons, sparrows, gulls, ducks, geese; perched birds lift off when the viewer nears; a dusk flock; leaves. Its moths are off while `life-street.js` is loaded (that module circles its own).
- `life-water.js` — the water surface (own shader, sky colours, light streaks, rain pocks) and its edge; Baylight marina, ferry terminal and a ferry on a 150 s loop; Jack London tug, barge, pilot boat; Brooklyn float and kayaks (ledger: Shoreline Kayak & Paddle); Lake Merritt sculls (ledger: Lakeside Rowing Club). Every vessel is a whole shape (§Boats, 2026-11-14). Reads the page's sky material directly and leaves `k._water` for others — both outside the contract above.
- `life-street.js` — live window quads registered over the baked wall textures (it carries a copy of the page's `hash`/`rng` and the grid in `WALLS`, and reads each lot's `p.B`, `p.F`, `p.doorZ`: see §Building fronts), house windows and doors, wordless neon, steam and smoke, aircraft and meteors, moths, rain ripples and gutters, porch lights and shop doors that react, a cat.
- `life-people.js` (2026-11-14) — the citizens as jointed figures: hips, chest, head with a painted face, hair, two-part arms and legs, shoes, hands, a jacket or skirt, a soft shadow on the ground, and the light of their week overhead. Walking is solved from the feet up (each foot planted where it lands, knee from hip and ankle, stride and arm swing from speed), so nothing slides. People walk to a shop front or along their stretch, stop, look in or look at the street, turn and go on; households keep together and turn to each other when they stand; an owner stands outside their business facing the street; walkers pick a clear line past everyone ahead, two meeting head-on each give half, and nobody stops on top of anybody. Read off the sim: sex, age band (size, grey hair, a senior's pace and stoop, a child's short quick steps), household, business, the week's weather (jackets under 62 degrees, bare forearms from 70). Clothes, build and where a walk turns round are drawing choices. The record a figure is built from (`s`, `x`, `z0`, `amp`, `sc`, `long`, `post`, `lead`, `rank`, `kc`) is set in the page's `build()`.
- `sound.js` — a bed whose mode, register and density come from the place's `hoods.js` entry, plus layers picked from water, trees, weather, people count and the landmark types on the street. Measured for level, clicks, node count and silence; not yet listened to by a person.

Drawn but not named in canon (generic fittings — cut on the builder's word): Baylight breakwater with entrance lights, a waiting room on the ferry pier, far-shore skylines, boat side lights.

People (2026-11-14): filmed frame by frame from the side, front, above and in the stand-with-someone view; two minutes of the four busiest streets stepped with no two strangers closer than 0.54 m; about 1 ms a frame for 124 people on the server.

Not verified for any module: motion at a real frame rate, a real phone, the quality-0 path (headless never drops quality), the walk-up reactions with real key input.

## The camera (2026-11-14)

- The flight (`step()` in `template.html`) is filmed rather than slid. It eases away from a standstill at the top of each street and after Pause. It turns to look at whoever the cards are about, at a chaos car close by, at a landmark on one side and at boats as it passes (`W.gaze`; boats are `W.sights`, §Boats), and slows by up to a quarter for the car, the landmark and the boats, never for the cards. It leans a little into its own drift (`W.bank`) and carries a small hand-held unevenness.
- Walk-it-yourself gathers pace and comes to rest instead of starting and stopping dead, turns the same way, and lifts a little with each step.
- A viewer whose device asks for reduced motion (`STILL`) gets none of the sway, lean or step; the flight also starts paused for them, as before.
- Pace, Pause, the gate crossing, the stand-with-someone view and the business view are unchanged.

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
| Where a street stands: its scale, word and since-when; how many windows are lit; shut units, window boxes, scaffolding | `Neighborhood_Map.jsonl` NeighborhoodTrajectory, TrajectoryMomentum, TrajectoryStartCycle (§The direction scale). Which building is dressed is seeded by the neighborhood name — not sim data |
| Sex, age band, role on a card; figure size, grey hair | `output/simulation_ledger_snapshot.jsonl` Gender, BirthYear, RoleType. Bands and the sim year mirror the engine (`deriveLifeState_`, `simYearFromCycle_`); the card folds them to youth (22 and under) / adult / senior |
| Who lives in a home, renting or owning, the rent, since when | `Household_Ledger.jsonl` active rows (§Homes). Which lot or unit a household is on is the page's layout, not sim data, until the ledger carries parcels (ROLLOUT engine.345) |
| Who a person knows, in what way, since when; the conversation on a tie | `Relationship_Bonds.jsonl` (active rows) and the pair's latest `output/exchanges/` conversation (§People who know each other). That two of them are standing together at a given moment is drawn, not sim data |
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
