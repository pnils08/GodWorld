# Brief — agy adversarial diff review: engine.356, tonight's three engine cuts and their fix

**From:** engine-sheet · **Date:** 2026-11-21
**Write your review to:** `output/antigravity/2026-11-21-review-e356-evening-and-bond-lines.md`. Read-only on code.

Three cuts went to PROD tonight with a bench each and **no review**. The builder then said: "you don't read code and are pushing broken code". A re-read found two defects (fixed in the repo at `11bfb6100`, not yet on PROD). Find what is still wrong.

## The commits

| Commit | What | On PROD |
|---|---|---|
| `a15dbb895` | `phase09-digest/finalizeCycleState.js`: the evening snapshot carries restaurants, fast food, night spots, TV, films, the sports show, sightings. `phase05-citizens/generateCitizensEvents.js`: `previousEveningPool_` writes named last-night lines; five new `evening:*` kinds in `DIAL_BY_FACT_TAG`; dial weighting for a night in | stage 67 |
| `16a67a8e9` | going-out weights raised (2.0 / 1.2 × oa / 1.6) | stage 67 |
| `fbf6a0707` | `phase05-citizens/bondEngine.js`: `appendBondLifeLine_` also queues a `LifeHistory_Log` row | stage 68 |
| `11bfb6100` | fix: bare tag on the bond log row unless a contact rides on it; a night in is not public activity in `applyGriefPoolWeights_` | **no** |

`git show <commit>` for each. Plan: `docs/plans/2026-11-21-a-moment-has-a-place.md`.

## Attack these

1. **Every reader of `LifeHistory_Log`.** `grep -rln "LifeHistory_Log" phase* utilities lib scripts dashboard world-view`. For each reader: does a new row tagged `Bond`, `Wedding`, `Faith`, `Faith-Drift`, `TrustGuarded|contactPopId:POP-…`, `ConnectionWithdrawn|contactPopId:…`, `ConnectionMaintained|contactPopId:…` change its behaviour — double-count something the reader also takes from the `LifeHistory` cell or another tab, trip a positional read, feed a seed, a lived event, an owed wake, a dial count, an auditor check? Name file:line and the concrete wrong output.
2. **Double writes.** Does any bond event now reach `LifeHistory_Log` twice — once from `appendBondLifeLine_` and once from another writer of the same event (weddings: `marryCitizens_`, `generationalEventsEngine.js`, `householdFormationEngine.js`; faith joins: `processFaithJoins_` and the faith engines)?
3. **The evening pool.** In `previousEveningPool_` and its callers: any line that can be drawn by someone who should not have it (life-state gate `eveningOut`, a child, a deceased or traded row); the `$P` replace with a business name containing `$`; a snapshot from before the cut (no new fields) and a snapshot with empty strings; the 9 KB carry-forward limit with three of everything; `selfName` never matching because of name formatting.
4. **Dial direction and weighting.** `evening:watched` cancels `source:prevEvening`'s `×outabout` and applies `(2 − outabout) / outabout` — check the order of the tag loop and that nothing else re-applies outabout; `evening:watchedSports` → fandom; `gradedTagFor_` picks the first tag found in `DIAL_BY_FACT_TAG` — can a calendar or context tag merged in before it win instead?
5. **Anything else these four diffs break** that a bench of clean fires would not show: a silent drop, a mis-tag, a reader that now sees fewer or more rows.

Findings: severity, file:line, the concrete failure. No style notes.
