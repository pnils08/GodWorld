# Storyline_Tracker retirement — ruling (research-build, 2026-09-28)

engine.266 open item. Traced every live writer of the discontinued `Storyline_Tracker` tab (Mike-direct 2026-08-05, superseded by `Storyline_Ledger`) plus the one outside consumer. Ruling below is final — implement and deploy at engine-sheet's convenience, no further sim judgment needed.

## Findings

- Engine-side readers of `Storyline_Tracker` are already gone (engine.141/S419 deleted `storylineHealthEngine.js` and `storyHook.js`'s `loadStorylines_` — both were processing 0/239 rows).
- `Storyline_Ledger`'s pipeline (`cron-saturday-run.js` step 6b) is a **separate intake path** — reporter-authored kebab slugs pulled from article sidecars, never from a Sheets tab. It does not read `Storyline_Intake` and cannot be starved by anything below. 12-col schema: `StorylineId, FirstCycle, LastCycle, Status, Advanced, Opened, Closed, Referenced, Articles, Citizens, Hoods, Desks` (`Citizens` = comma-list of POPIDs, capped 15).
- Remaining `Storyline_Tracker` writers, traced one by one:

| Function | File | Status | Ruling |
|---|---|---|---|
| `createChaosArcs_` | `phase07-evening-media/storylineWeavingEngine.js:156` (called `godWorldEngine2.js:475,2193`, Phase7-ChaosArcs) | Conditional — fires only when `S.tier1ChaosEvents` is non-empty; currently inert, but a live write path when it does fire | **Drop.** Even when it fired historically, nothing ever read the row (same 0/239-processed readers engine.141 already removed). Don't build a new write into `Storyline_Ledger` for it — the Ledger's contract is strictly reporter-authored slugs from sidecars (anti-pigeonhole, Mike-direct 2026-08-05); forcing a mechanical chaos-cars event through that pipeline breaks the contract for a feature with zero observed payoff. Delete the function + both call sites. |
| `assignCitizenRoles_` | `storylineWeavingEngine.js:306` | Dead since inception — targets a `CitizenRoles` column that has never existed in `Storyline_Tracker`'s real schema; hits its own "column not found" guard every call | **Drop.** Not a discontinued-tab casualty — never worked. |
| `updateCrossStorylineLinks_` | `storylineWeavingEngine.js:570` | Same shape — targets nonexistent `CrossStorylineLinks` | **Drop.** |
| `processStorylineIntake_` | `phase07-evening-media/mediaRoomIntake.js:275` (Phase 11, called from `processMediaIntake_`) | Active — reads the manually-pasted `Storyline_Intake` sheet, appends/resolves rows in `Storyline_Tracker` | **Drop**, function + call site (`:151`) + `ensureStorylineTracker_` tab-creation (`:772`, `:879-881`). This is the *old* manual-paste intake channel for the discontinued system — Mike's 2026-08-05 ruling replaced it wholesale with the reporter-slug pipeline; it doesn't feed or compete with `Storyline_Ledger`, it's just a dead parallel channel nobody's pasted into productively since the replacement shipped. |
| `bindStorylineReporters.js` (T3.5b evidence logger) | `scripts/bindStorylineReporters.js` | Live, reads `Storyline_Tracker` active+dormant rows for `RelatedCitizens` as reporter-binding evidence; invoked from `/post-publish` | **Retarget, don't drop.** Repoint to `Storyline_Ledger`: use column `Citizens` (POPID list) in place of `RelatedCitizens`; derive dormancy from `Status`/`LastCycle` age (Ledger's documented reader-derived-dormancy contract) in place of the tracker's stored active/dormant `Status`. This is the only function still doing useful work — it was just pointed at the wrong (dead) tab. |

## Once the above lands

- `Storyline_Tracker` and `Storyline_Intake` have zero writers left → drop the `STORYLINE_TRACKER` / `STORYLINE_INTAKE` constants in `utilities/sheetNames.js`, delete the tabs, close the `docs/engine/SHEETS_MANIFEST.md` entry.
- Regenerate `ENGINE_STUB_MAP` in the same commit (engine structure changed).
