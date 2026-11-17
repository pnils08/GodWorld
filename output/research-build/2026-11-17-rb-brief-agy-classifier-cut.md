# Brief for agy — adversarial review of the classifier cut (engine.347 Task 4)

From research-build, 2026-11-17. Read-only: no edits to code, sheets or docs; no model runs. Write your review to `output/antigravity/2026-11-17-review-classifier-cut.md`.

Plan: `docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md` Task 4. The builder's rulings there are fixed. Attack the cut below, not the rulings.

## The cut as designed (not yet built)

All in `lib/reflectionClassifier.js`, its test, and `scripts/classifierGate.js`. No engine file changes; no writer changes.

1. **Five event tags join `VOCAB`**, each already an exact `DIAL_MAP` key (`utilities/citizenDialMap.js:186-243`). On the reflection path the event tag gives its non-composure dials only (`nudgesForReflection_` `:421-432`), × `dialReflectionShare` 0.225:
   - `Spat` (a quarrel, a sharp exchange) → warmth −1
   - `TrustGuarded` (snubbed, slighted or wronged by someone they know) → warmth −1
   - `ConnectionWithdrawn` (pulling away, a tie gone quiet) → sociability −1
   - `Disappointment` (a hoped-for thing did not happen) → no event move; the mood carries it
   - `Stumble` (a small setback at work or toward a goal) → drive −1
2. **A flat affect.** The prompt's affect list gains `Flat` (matter-of-fact, no feeling showing). It is NOT added to `VOCAB` / `AFFECT_TAGS`. The parser returns `affect: null, affectFlat: true`; every writer already writes `cls.affect || ''`, so the sheet cell is blank and the fold gives zero composure (`citizenDialMap.js:420`, pinned by `scripts/citizenReflectionWriteback.test.js:53-56`). An off-vocab affect stays `affect: null, affectFlat: false` (the drift tripwire). Reason for blank over a recorded `Flat`: the fold passes the row's snippet as `text` (`citizenMemory.js:202`), so an affect word with no `DIAL_MAP` key would be word-matched against the snippet by `CONTENT_RULES`.
3. **Prompt wording** (dual and triple, one shared rule block):
   - opening: "something a person said or wrote — a private reflection, an answer to a reporter, their side of a conversation, or a statement made in their job" (was "a person's short reflection on their day");
   - speaker rule: tag what happened to the speaker or what the speaker did, never the subject they talk about. Live C115–C116 rows: three citizens who said "I've seen Vinnie Keane around since he retired" were tagged `Retirement` (drive −4, family +4);
   - flat rule: Calm and Content are feelings the person shows; a text with no feeling showing is Flat.
4. **Tests and gate.** Offline test: the five tags resolve by exact key and move no dial up; `Civic | Flat` parses to event Civic, affect null, flat true; `Banana | Splat` stays affect null, flat false; no prompt says "reflection on their day". Live gate (`classifierGate.js`): the three existing sets unchanged and green, plus an ordinary-bad set, a flat set (matter-of-fact texts incl. an office statement and a `filed:` string), and a speaker set (bystander texts must not take Retirement / Hospitalized / Transgression / Wedding).
5. **Replay.** The 284 live C115–C116 rows re-classified with the new prompt; report old → new tag and affect counts and the net per-dial change.
6. `AFFECT_VALENCE` (`compressLifeHistory.js:146`) and the signal detector's `AFFECT_POLE` (`citizen-signal-detector.js:54`) are left as they are: a flat row carries a blank affect cell, which both already read as no mood.

## The job

1. **Blank vs a recorded `Flat`.** Find every reader of the Reflection_Intake affect cell and of the page docs' `extra.affect` (`scripts/`, `lib/`, `dashboard/`, `utilities/`, `phase*/`). Does any reader treat a blank affect on a row WITH an event tag as an error, skip the row, or change a count that matters (signal detector denominators `citizen-signal-detector.js:63-75,113-129`, `buildCitizenWeekDigest.js`, `civicPetitions.js`, `buildCivicOfficeSlice.js`, `lib/resonanceRecall.js:71-77`, `scanCitizenPages.js`, `extractBondsFromWakes.js`)? All-time today: 10 blank of 2,844.
2. **The five tags, engine side.** `Stumble` is also a pressure-state tag (`PRESSURE_STATE_TAGS` `:256`, `PRESSURE_RE` `:458`). Can a Reflection_Intake row tagged `Stumble`, `Spat`, `TrustGuarded` or `ConnectionWithdrawn` reach any path besides `accreteReflectionsIntoBase_` — a LifeHistory cell, the pressure run counter, the bond engine's dormant/active logic, the conduct engine, Dial_Moves "why", a dedupe key? Name the path with file:line or say none found.
3. **Event-tag readers on the cron side.** Who reads the Tag column or a page doc's `extra.event` and enumerates or switches on tag names (digest, packets, lived-experience packet, wake perception, desk prompts)? What do they do with a tag they have not seen?
4. **Composure drift.** C115–C116 affect: Calm 96, Content 78, Anxious 60, Frustrated 18, others 32. If Flat takes most Calm / Content rows and the negatives stay, composure by reflection goes net down. Is that a defect of the cut or the ruling working ("down as often as up")? What number from the replay would tell them apart?
5. **The speaker rule.** Give three realistic texts where "tag the speaker's life, not the subject" produces the wrong tag (a reporter whose own event IS the story; a worker whose job is the subject; a citizen grieving someone else's loss). Does `Background` then swallow real events?
6. **Weakest two choices in the cut.** Name them and what breaks.

## Not wanted

No rewritten code. No new mechanics beyond what a finding needs. No real-world Oakland. A claim without a file:line or a number you produced is not a finding. If you could not open or run something, say so.
