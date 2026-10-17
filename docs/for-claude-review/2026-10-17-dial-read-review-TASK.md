# TASK — codex adversarial review: why the dials don't represent the citizens

**Target:** `docs/plans/2026-09-10-inactivity-is-regression.md` §Dial read 2026-10-17 (engine-sheet's read of live C111). Read-only: code + `output/` dumps only; no cron, model, Sheet write, bench or canon run. Do not edit the plan.
**Also read:** the same plan's ruling 1b (line ~258) and §engine.201b; `docs/SIM_DOCTRINE.md` §1–§8.
**Write to:** `docs/for-claude-review/2026-10-17-codex-dial-read-review.md` — SHIP / FIX / HOLD per hunt, file:line evidence, under ~150 lines.

Builder 2026-10-17: "make sure codex reviews it so it actually works and isn't trick code based on assumptions." Engine-sheet already got two causes wrong in this session (row-label cut, the `neighbor` content rule) before reading ruling 1b. Assume the read is wrong until the code proves it.

## Hunts
1. **The three ruled-out causes.** Confirm or refute each with file:line: (a) row `[PrimaryTag]` vs log full tag is irrelevant to the fold under ruling 1b; (b) `citizenDialMap.js:274` is never reached by the Phase-9 fold with a full log tag; (c) `Y3C7` → 111 matches `DialState.folded`'s scale on every writer (check every place a stamp is produced and parsed, including reflections and LifeHistory_Log `Cycle`).
2. **The fold path itself.** `compressLifeHistory.js` foldNewEntries_ / applyCycleEffects_ / applyEvent_ / settleCycle_ (`citizenMemory.js`): can a real event (Household, Birth, Wedding, Promotion, Strain…) on a citizen's row reach base at all under MOOD_DECAY 0.8, the 0.5 zero-floor, HARDEN_STREAK 3, HARDEN_FRACTION 0.4 and roomScaled_? Give the minimum event pattern that moves a base off 50, and whether any live citizen's row shows that pattern while base stays 50 (that would be a real defect, not starvation).
3. **The reflection path.** Where Reflection_Intake rows come from (the wake loop / cron that writes them), how a citizen is selected to reflect, and why 613 of 988 active never did in C102–C111 (Mags POP-00005: 0 ever). How the reflection's event Tag is chosen — why family life lands as Household only 48 of 1,740. How `accreteReflectionsIntoBase_` maps tag + affect to dials, and why Sports reflections reach fandom 0 when engine.208 made fandom Dial 9.
4. **The second dial cell.** TraitProfile (col 18) is rewritten only on the 5-cycle compress cadence with ≥3 events; 342 of 967 active TraitProfiles lack `fandom`. Name every reader of TraitProfile vs DialState (wakes, slices, agents, bands) and whether any of them reads stale or missing dials as a result.
5. **Anything the read missed.** Any other writer of DialState base (reflections direct-to-base, wear, chaos break, seeds, mints, back-date) and whether its share explains the stuck numbers better than the read does.

Done = the md exists.
