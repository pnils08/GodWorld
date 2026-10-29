# Adversarial Read — engine.299 Task 7 Writer-Side Premise Sweep

**Target:** `docs/plans/2026-10-18-event-engines-move-dials.md` Task 7 (writer-side commits `d1877af0`, `7eb7fd5a`, `074c0959`, `6a25bcde`, live `Event_Content_Ledger` R130 & R219 rewrites, and full grep of `phase07-evening-media/` + `utilities/`).
**Rule:** No displacement, gentrification, priced-out, encampment, blight, crime-ranking, or decline premise; places are the land mass and landmarks; intra-city move is income fit (`SIM_DOCTRINE.md` §14, §17).

## 1. Reviewed Commits & Live ECL Rewrites

| Target | Verdict | One-line reason |
|---|---|---|
| `d1877af0` — `phase07-evening-media/buildContractSeeds.js:38,144` & `buildContractSeeds.test.js:259` | **AGREE** | Cuts dead `'gentrification'` causeType and `/rent\|landlord\|lease\|moving\|displac\|evict\|housing\|develop/i` regex hints; fixture moves to `'migration'` (`'Move-ins +0.2'`) without inventing facts. |
| `7eb7fd5a` — `phase07-evening-media/storyHook.js:979` (fire hook) | **AGREE** | Replaces `'displacement'` with `'who was affected'`, removing housing-displacement framing while staying grounded in the fire event. |
| `7eb7fd5a` — `phase07-evening-media/storyHook.js:1067` (`seniors_shift` down hook) | **FLAG** | Cuts `'Displacement?'` well (`'Where did they go — closer to family, another part of the city?'`), but retains `'% decline'` wording on `storyHook.js:1067` alongside untouched `'population decline'` (`:1044`) and `'decline in student population'` (`:1090`). |
| `074c0959` — `phase07-evening-media/applyStorySeeds.js:856` (`suppress_hotspots` seed) | **AGREE** | Replaces `'Displacement concerns?'` with `'Does activity shift to the zones next door?'`, stating enforcement spillover without housing-displacement wording or invented facts. |
| `6a25bcde` — `utilities/rippleLedger.js:101` (`recordHookRipple_` JSDoc) | **AGREE** | Updates comment from `(gentrification/migration shape)` to `(trajectory/migration/household shape)` to match live callers. |
| Live `Event_Content_Ledger` **R130** (`'ran the numbers on the bigger apartment and decided to wait another year'`) | **AGREE** | Cuts `'priced out'` premise and expresses a household budget check without claiming a move or inventing an off-row fact. |
| Live `Event_Content_Ledger` **R219** (`'walked the Mandela Parkway median under the trees and took the long way home'`) | **AGREE** | Cuts `'old Mandela Parkway encampment site'` and development-tension framing, anchoring strictly to the physical Parkway median landmark. |

## 2. Grep Sweep of `phase07-evening-media/` and `utilities/`

Pattern: `gentrif|displac|priced out|encampment|blight|crime rank|urban decay|decline|eviction` (plus `utilities/ensureCrimeMetrics.js` profile check).

| File:Line | Match / Context | Verdict | One-line reason |
|---|---|---|---|
| `utilities/tier1EssenceEvents.js:619` | `POP-00791` (Elena Soria Dominguez): `'Reads the anti-displacement and workforce mechanics end to end.'` | **FLAG** | Active Tier-1 emitter still carries `'anti-displacement'` premise text; properly held in `overnight_autonomy_session.md` §6 for builder decision due to published Edition 79/80/85/93 canon. |
| `utilities/compressLifeHistory.js:1603` | `UNLIVED_BRANCH_TAGS = { ..., displacementmove: 1 }` | **FLAG** | Retains `'displacementmove'` tag key (paired with `phase05-citizens/generateCitizensEvents.js:1056,1064`); must be renamed/cut alongside `es` Task 4 so the Task 2 offender scan clears. |
| `phase07-evening-media/applyStorySeeds.js:1013` | `"Gradual population decline noted. Long-term trend or temporary dip?"` | **FLAG** | Frames `drift < -15` as `'population decline'` rather than normal residential outflow/turnover and trips the `'decline'` premise scan. |
| `utilities/ensureNeighborhoodDemographics.js:548,555` | `var direction = totalChange > 0 ? 'growth' : 'decline';` / `'% population ' + direction` | **FLAG** | Emits `'decline'` as the demographic shift direction value and description string feeding Phase 7 hooks; rename to `'outflow'` or `'dip'` so downstream hooks don't cue decline framing. |
| `phase07-evening-media/storyHook.js:1039,1044,1067,1090,1469` | `shiftDir === 'decline'`, `'% population decline'`, `'% decline'`, `'% decline in student population'` | **FLAG** | Demographic hook strings use `'decline'` four times (`:1044,1067,1090,1469`); rewording to `'outflow'` / `'drop'` avoids urban-decline framing for desks and clears the Task 2 `/decline/i` scan. |
| `utilities/ensureCrimeMetrics.js:59-220,248,582,734` | `NEIGHBORHOOD_CRIME_PROFILES` (`West Oakland` `:94-100`, `East Oakland` `:101-107`) | **FLAG** | Engine-side (`es` Task 7) table in `utilities/` still encodes 2020s Oakland crime priors (`West Oakland` `propertyCrimeMod: 1.2, responseMod: 0.85, baseIncidents: 10` despite canon first-wave boom wealth) and stale `'the Baylight frontier'` on `East Oakland` (`:106`, contradicting S525 D2 Baylight canon). |
| `utilities/tier1EssenceEvents.js:683` | `POP-00799` (Hal Richmond): `'Reverent even about decline; a measured, elegiac calm on the page.'` | **AGREE** | Sports-historian literary voice note (aging dynasties/players), not an Oakland urban-decline premise (note: mechanical `/decline/i` scan in Task 2 will need a word tweak or allowlist). |
| `phase07-evening-media/textureTriggers.js:302` & `storyHook.js:336` | `if (a.phase === 'decline')` | **AGREE** | Storyline arc tension lifecycle state (`rising → peak → decline → resolved`), not neighborhood or urban decline. |
| `phase07-evening-media/buildContractSeeds.js:188,385,495` & `.test.js:99` | `'never displaced'` / `'Never displaces exacts'` | **AGREE** | Code comments describing array slot priority (exact citizen targets are not bumped by hood fill), not housing displacement. |
| `utilities/citizenDialMap.js:210` | `'// an ordinary chance to cut a corner, declined'` | **AGREE** | Code comment using `'declined'` in the sense of refused (`BoundaryKept`), not urban decline. |
