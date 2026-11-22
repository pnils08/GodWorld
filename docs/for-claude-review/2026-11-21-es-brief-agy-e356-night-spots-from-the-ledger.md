# Brief — agy adversarial read: engine.356, night spots from the ledger + the two unread fix commits

**From:** engine-sheet · **Date:** 2026-11-21
**Write your review to:** `output/antigravity/2026-11-21-review-e356-night-spots-from-the-ledger.md`. Read-only on code.

None of this is on PROD. No sandbox run and no test run backs it or will: the builder has blocked both ("code logic is the test"). Your read is the check. The builder: "no session produces working code unless agy or codex reviews it since they read code".

## Read these three commits (`git show <commit>`)

| Commit | What |
|---|---|
| `4559c9d18` | `citizenContextBuilder.js`: class `barNight` (adults only) for `evening:nightOut`, checked before the source tag. `generateCitizensEvents.js`: place name inserted by split/join. `finalizeCycleState.js`: a sighting carries its venue's `bizId` |
| `170e05444` | `bondEngine.js`: the triangle's two `TrustGuarded` lines pass the named person as `contactPopId` |
| the newest commit on `phase07-evening-media/buildNightLife.js` (`git log -1 -- phase07-evening-media/buildNightLife.js`) | every name list removed; the night's spots are a weighted draw without replacement over `buildEveningFoodIndex_(ctx).nightlife` (Business_Ledger rows), leaned by hood |

Builder ruling the last one implements, verbatim: "The businesses should come from the ledger and their success should stem from how the hood performs". Only the first half is built here.

## Attack these

1. **`buildNightLife.js` end to end.** Any reference left to a removed list or helper; any path where `spots` is undefined, not an array, or holds an item without `name` / `neighborhood`; `count` larger than the candidate list; an empty ledger read; the `typeof` guards against helpers that live in `buildEveningFood.js` — Phase7-Nightlife runs BEFORE Phase7-Food (`godWorldEngine2.js:765,767`): does anything `buildEveningFoodIndex_` needs not exist yet at that point?
2. **Every reader of `S.nightlife`** — `buildMediaPacket.js:313`, `applyStorySeeds.js:1458`, `buildCyclePacket.js:445-455`, `cityEveningSystems.js:159,363-365`, `finalizeCycleState.js` (`snapshot.nightSpots`), `generateCitizensEvents.js` `previousEveningPool_`, and any other (`grep -rn "nightlife\\.spots\\|spotDetails\\|S\\.nightlife\\b"`). Does a spot shaped `{ bizId, name, neighborhood, sector }` break one; does a hood the ledger writes differently from `Neighborhood_Map` (a child area, `City-wide`, `Telegraph corridor`) mis-key the crowd map or a seed?
3. **The same business twice in one evening.** `buildEveningFood_`'s `addNightlife()` can add nightlife rows to the restaurant draw; a row can be both restaurant and nightlife. Can one business now be tonight's night spot AND tonight's restaurant, and does a reader double-count it (seeds: "Out late at X" and "Dinner crowd at X")?
4. **What the dropped conditions used to do elsewhere.** The lists carried season / weather / holiday venue kinds. Does any other file read those venue names as strings (`grep` the removed names: "Civic Watch Patio", "Open-Air Night Plaza", "Dive & Dash", "The Members' Club", "Skybar", …)?
5. **RNG.** The draw now consumes `rng()` a different number of times than `pickRandomSet_` did. Name any later Phase-7 consumer whose behaviour depends on a fixed draw count rather than on the stream.
6. **`4559c9d18` and `170e05444`.** Anything wrong in them; in particular `eventClassFromTags_` now returns `barNight` for a line that also carries `source:prevEvening` — is any caller relying on `eveningOut` for those lines?

Known and stated: `scripts/hoodBlindTables.test.js` T12 asserts the removed invented budget venues open in the weakest economies; it describes the old design and will fail. Tests are not run or edited here.

Findings: severity, file:line, the concrete wrong output. No style notes.
