# Adversarial Review — Classifier Cut (`engine.347` Task 4)

**Reviewed:** `output/research-build/2026-11-17-rb-brief-agy-classifier-cut.md`, `docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md` (§Task 4), `lib/reflectionClassifier.js`, `lib/reflectionClassifier.test.js`, `scripts/classifierGate.js`, `utilities/citizenDialMap.js`, `utilities/citizenMemory.js`, `utilities/compressLifeHistory.js`, and all readers of `Reflection_Intake`, `extra.affect`, and `extra.event` across `scripts/`, `lib/`, `dashboard/`, `utilities/`, `phase*/`, and `world-view/`.
**Reviewer:** Antigravity (`agy` lane, read-only, no model runs, no commits).
**Verdict:** **HOLD**

All five new event tags already resolve in `DIAL_MAP`, and no engine path outside `accreteReflectionsIntoBase_` reads `Reflection_Intake` col E (`Tag`). However, the cut has three concrete defects to settle before shipping: (1) keeping `Flat` as `affect: null` (blank) gives flat reflections *higher* `affectWeight` (`0.5`) than `Calm`/`Content` (`0.4`) in `lib/resonanceRecall.js:73`, shrinks `citizen-signal-detector.js` denominators against a `Calm`/`Content`-heavy historical baseline, hides valid `Flat` when `event` is `null` behind `if (cls.event || cls.affect)`, turns bond ripples into `"they seemed preoccupied"` (`citizen-wake.js:461`), and rests on a false `CONTENT_RULES` dichotomy that `'Flat': {}` in `DIAL_MAP` already avoids; (2) `Disappointment` (`{ composure: -2 }`) contributes `{}` on `nudgesForReflection_` (`citizenDialMap.js:425`), creating a zero-delta trap bucket for setbacks (and stalling `drainReflectionBacklog.js:72-75`); and (3) the unqualified speaker rule interacts badly with Task 5 work-wakes and bereavement reflections where no matching `EVENT_VOCAB` tag exists.

---

## 1. Blank vs a recorded `Flat` (every reader of `Reflection_Intake` affect and `extra.affect`)

Every reader found across `scripts/`, `lib/`, `dashboard/`, `utilities/`, `phase*/`, and `world-view/`:

| Reader | `file:line` | Behavior on blank affect (`''` / `null`, with non-empty `event`) | Impact vs recorded `'Flat'` |
|---|---|---|---|
| `compressLifeHistory.js` (`readPendingReflections_`) | `utilities/compressLifeHistory.js:430-432` | `if (!event && !affect) continue;` — keeps row when `event` is non-empty; `nudgesForReflection_` (`citizenDialMap.js:427,384`) returns `{}` for `''` (`0` composure). | Same as `'Flat': {}` in `DIAL_MAP`. (Blank `event` + `Flat` is skipped as off-vocab by every writer's `if (cls.event \|\| cls.affect)` check.) |
| `compressLifeHistory.js` (`AFFECT_VALENCE`) | `utilities/compressLifeHistory.js:146-149,844-845` | `AFFECT_VALENCE[''] \|\| 0` → `0`, skips `nudgeBondIntensity_`. | Same as unmapped `'Flat'`. Stops neutral reflections naming a bonded citizen from inflating bond intensity via default `Calm`/`Content` (`+0.25`). |
| `drainReflectionBacklog.js` | `scripts/drainReflectionBacklog.js:51,68-75` | `if (!event && !affect) continue;` keeps row; **bug if composite delta is `{}`** (`Background \| ''`, `Civic \| ''`, `Disappointment \| ''`): `accreteReflectionsIntoBase_` returns `m = 0`, so `if (m > 0)` at `:72` **never flips `applied='yes'`** on citizens whose pending rows are all zero-delta. | Same for `'Flat': {}` — `if (m > 0)` gates `appliedFlips` instead of `pend[pid].length > 0`. |
| `lib/resonanceRecall.js` (`affectWeight`) | `lib/resonanceRecall.js:71-77`; `lib/citizenPage.js:176` | `citizenPage.js:176` deletes `meta.affect` when `null`. `affectWeight` hits `if (!affect) return 0.5;` (`:73`). **`Calm` (`{ composure: 2 }`) and `Content` (`{ composure: 2 }`) score `2 / 5 = 0.4` (`:74-76`).** Thus every `Flat` doc outscores genuinely `Calm`/`Content` docs (`0.5 > 0.4`, `+0.025` at `W.affect = 0.25`) in wake memory recall. | With `'Flat'` recorded in `meta.affect` + `'Flat': {}` in `DIAL_MAP`, `nudgesForEvent_('Flat', 1, '')` returns `{}` → `affectWeight = 0.0`, below `Calm`/`Content` (`0.4`) and unlabelled pre-Task-2 docs (`0.5`). |
| `citizen-signal-detector.js` (`normAffect`, `compute`) | `scripts/citizen-signal-detector.js:54-75,116-135` | `normAffect` returns `null` for `''` (`:63`); `distinctCitizens(rows, null)` (`:70`) excludes blank rows from both `winTotal` (`:121`) and `baseTotal` (`:122`). **Denominator skew:** historical `baseTotal` (~2,834 rows; 10 blank of 2,844) is ~61% `Calm`/`Content` (`174/284` in C115–C116). Moving neutral rows to blank shrinks `winTotal` while `baseTotal` stays diluted by old `Calm`/`Content`, inflating `observed = dW / winTotal` (`:127`) relative to `baseline = dB / baseTotal` (`:128`) and creating phantom `>= 0.15` share-lifts (`:42,130`) on `Anxious`/`Frustrated`, or dropping `winTotal` below `MIN_CORPUS_DEPTH = 40` (`:43,260`). | Unmapped `'Flat'` behaves identically unless `AFFECT_POLE` includes `flat` (which would preserve pre-cut denominators at the cost of counting `Flat` as an emotional pole for lift). |
| `buildCitizenWeekDigest.js` | `scripts/buildCitizenWeekDigest.js:144,149,227,309` | Does NOT skip the row (`:144` checks `!popid \|\| !text`). At `:227`, `if (rfs.some((r) => r.affect)) score += 2;` — a citizen whose reflections in the window are all `Flat` (blank) loses the `+2` vignette-ranking bonus vs any non-blank affect. | Recorded `'Flat'` is truthy, so `:227` would award `+2` to flat reflections (undesirable for vignette picking unless `'Flat'` is excluded there). |
| `civicPetitions.js` | `scripts/civicPetitions.js:119,132-135` | Counts row in `civicRows` (`:132`) and `uniqueCitizens`; `negative.has('')` (`:133`) is `false` (`complaint = false`, `affect: ''`). | Identical to `'Flat': {}`. |
| `buildCivicOfficeSlice.js` (`loadPetitionPool`) | `scripts/buildCivicOfficeSlice.js:26,1058,1067-1068` | Blank affect fails `NEGATIVE_AFFECTS.has('')`, so `Civic \| Flat` enters `participation` (`Constructive civic participation`, `:1080`) alongside `Calm`/`Content`. | Identical to unmapped `'Flat'`. |
| `scanCitizenPages.js` | `scripts/scanCitizenPages.js:148-163,275` | Stores `affect: md.affect \|\| null` in `index.jsonl` (`:275`). `POSITIVE_AFFECT`/`NEGATIVE_AFFECT` (`:148-149`) are unused by `polarityOfDoc` (`:157-163`, text-only). | Blank `null` loses the distinction between "classified `Flat`" and "classifier missed / pre-Task-2 doc". |
| `extractBondsFromWakes.js` | `scripts/extractBondsFromWakes.js:262-271` | Never reads `Tag` or `Affect`. | Unaffected. |
| `citizen-wake.js` (T4 ripple) | `scripts/citizen-wake.js:461,627` | `:627` stores `affect: cls.affect \|\| ''`; `:461` renders `"they seemed ${String(e.affect \|\| '').toLowerCase() \|\| 'preoccupied'}"` → a flat/matter-of-fact exchange prints `"they seemed preoccupied"` to the bond partner. | Recorded `'Flat'` would print `"they seemed flat"` unless `:461` maps `'flat'` to a neutral phrase. |
| `world-view/build.js` | `world-view/build.js:63-70` | `mood: s.r.Affect \|\| ''` (`:70`) — keeps row, renders empty mood. | Blank is cleaner UI than showing `"Flat"`. |
| `scripts/loreWriter.js` | `scripts/loreWriter.js:323` | `(r.affect ? ' · ' + r.affect : '')` — omits affect when `null`. | Blank is cleaner than `"· Flat"`. |
| `scripts/classifierGate.js` | `scripts/classifierGate.js:137,168,202-216` | `runFlat_` (`:202-216`) checks `pred.affectFlat` cleanly, and `runSet_`/`runCombined_` (`:137,168`) reject `Flat` via `!pred.affect`. | However, `runOrdinaryBad_` (`:189-196`) passes `{}` tags (`Disappointment`, `Background`) because `up.length === 0`, and `runSpeaker_` (`:224-228`) passes `Career` (`drive +4`) on the ER pileup item (`:105`). |
| `dashboard/` | `dashboard/server.js`, `dashboard/src/` | No reader of `Reflection_Intake` or `extra.affect` found. | Unaffected. |

**Note on the brief's stated reason for blank (`citizenMemory.js:202` / `CONTENT_RULES`):** The brief says *"an affect word with no `DIAL_MAP` key would be word-matched against the snippet by `CONTENT_RULES`"* via `nudgesForReflection_` (`utilities/citizenDialMap.js:427`). That is true **only** if `'Flat'` is omitted from `DIAL_MAP`. `DIAL_MAP` already defines explicit empty-object keys (`'Background': {}`, `'Daily': {}`, `'Civic': {}`, `'Intake': {}` at `citizenDialMap.js:76,195-196,227`) specifically to return `{}` at `:390` before `CONTENT_RULES` (`:404-407`). Adding `'Flat': {}` to `DIAL_MAP` would block `CONTENT_RULES` identically while preserving `'Flat'` in `Reflection_Intake` and `meta.affect` (so `resonanceRecall.js:75` returns `0.0` instead of `0.5`, and `Reflection_Intake` audits can tell `Flat` from off-vocab/error nulls).

---

## 2. The five tags, engine side (`Stumble`, `Spat`, `TrustGuarded`, `ConnectionWithdrawn`, `Disappointment`)

**None found** outside `accreteReflectionsIntoBase_` (`utilities/citizenMemory.js:197-214`). Every engine path checked:

- **`compressLifeHistory.js` (`readPendingReflections_`, `:419-445`):** The only engine reader of `Reflection_Intake` (`phase*/`, `utilities/`). Feeds `accreteReflectionsIntoBase_` (`:819`), which calls `nudgesForReflection_` (`utilities/citizenDialMap.js:421-432`) and mutates `c.base[d]` only (`utilities/citizenMemory.js:204-210`).
- **LifeHistory cell / `LifeHistory_Log`:** Never written from `Reflection_Intake`.
- **Pressure run counter (`PRESSURE_RE`, `utilities/citizenDialMap.js:458`):** Only `pressureState_` (`:477`) and `pressureRun_` (`:509`) scan `PRESSURE_RE`, and both read `LifeHistory` (`row[iLife]`), never `Reflection_Intake`. Note one latent path inside `nudgesForEvent_` (`:391-399`): when `nudgesForReflection_` calls `nudgesForEvent_('Stumble', severityMult, rfl.text)` (`:423`), `PRESSURE_STATE_TAGS['Stumble']` is `true` (`:256`), so `pressureCauseOfText_(rfl.text)` (`:392`) runs on the reflection snippet — safe in practice because `pressureCauseOfText_` (`:258-268`) requires exact trimmed equality to one of the 15 hardcoded strings in `PRESSURE_TEXT` (`:576-582`).
- **`bondEngine.js` dormant/active & confrontation logic (`phase05-citizens/bondEngine.js:849-855,1558`):** Runs in Phase 5 from `ctx.summary.relationshipBonds` and `activeCitizens`; never reads `Reflection_Intake`. (Phase 9 `compressLifeHistory.js:840-850` can nudge `bond.intensity` in `S.relationshipBonds` for Phase 10, which next-cycle `bondEngine_` sees, **but** that reads `col I` `bondTarget` + `AFFECT_VALENCE[col H]`, never `col E` event tags.)
- **`runConductEngine_` (`phase05-citizens/runConductEngine.js:189,198,214`):** Reads `DialState` bands (`composure`, `integrity`) only; never reads `Reflection_Intake` or any of the five tags. (None of the five tags move `integrity` or `composure` via `nudgesForReflection_` anyway.)
- **`Dial_Moves` "Why" (`utilities/compressLifeHistory.js:383-394,821`):** `noteDialStep_(stepTally, 'voice', stepBase, c.base)` (`:821`) records all reflection-drain moves under the fixed label `'voice'` without enumerating `Reflection_Intake` tags (only `'lines'` prints `moveKinds` from `foldNewEntries_` `:388-392,1846`).
- **Dedupe keys:** No engine dedupe key in `phase*/` or `utilities/` reads `Reflection_Intake` col E.

---

## 3. Event-tag readers on the cron side

Only **two** cron/build readers switch on `Reflection_Intake`'s `Tag` column; **zero** readers switch on page docs' `extra.event` (`output/citizen_pages/index.jsonl`):

| Reader | `file:line` | What it checks | Behavior on unseen tags (`Spat`, `TrustGuarded`, `ConnectionWithdrawn`, `Disappointment`, `Stumble`) |
|---|---|---|---|
| `scripts/civicPetitions.js` (`visibility`) | `scripts/civicPetitions.js:121-122` | `if (key(row.Tag) !== 'civic') continue;` | Skips non-`Civic` rows silently. *(Secondary risk: a civic grievance tagged `Spat` / `TrustGuarded` / `Disappointment` instead of `Civic` drops out of petition visibility.)* |
| `scripts/buildCivicOfficeSlice.js` (`loadPetitionPool`) | `scripts/buildCivicOfficeSlice.js:1047-1049` | `if (tag !== 'Civic') continue;` | Same: skips non-`Civic` rows silently. |
| `scripts/buildCitizenWeekDigest.js` | `scripts/buildCitizenWeekDigest.js:133,148` | Reads `Tag` into `rf.event`, then **never reads `rf.event`**. (`LIFE_EVENT_PATTERNS` `:29-36` and `/daily/i` `:193` run on `LifeHistory_Log.EventTag`.) | Passes through ignored. |
| `scripts/scanCitizenPages.js` | `scripts/scanCitizenPages.js:275` | Copies `md.event \|\| null` to `index.jsonl`. | Passes through; no downstream consumer (`buildVoicesSlice.js`, `buildLivesSlice.js`, `buildPulseSlice.js`, `loreWriter.js`) reads `.event` on `index.jsonl`. |
| `lib/wakePerception.js` | `lib/wakePerception.js:55,449-474,557,1075` | `MILESTONE_TAGS` / `SALIENT_TAG` / `OWED_MILESTONES` read `LifeHistory_Log` / `LifeHistory`. `planNightlyIntake` (`:1373`) checks truthiness only. | Never reads `Reflection_Intake` `Tag` or `meta.event` by name. |
| `scripts/livedExperiencePacket.js`, `livedExperiencePacketV2.js`, `buildDeskPackets.js`, `cron-desk-run.js`, `cron-desk-writer.js` | — | Do not read `Reflection_Intake` or `index.jsonl` `.event`. | Unaffected. |
| `scripts/drainReflectionBacklog.js` | `scripts/drainReflectionBacklog.js:50,68` | Passes `event` to `nudgesForReflection_`. | Resolves via `DIAL_MAP`. |

*(Note: `scripts/citizen-signal-detector.js:15,44` reserves `'event-tag'` as future-gated and currently reads `I_AFFECT` only.)*

---

## 4. Composure drift (`Calm 96, Content 78, Anxious 60, Frustrated 18, others 32`)

In `DIAL_MAP` (`utilities/citizenDialMap.js:167-175`), `Calm` and `Content` carry `+2` composure, while `Anxious` and `Frustrated` carry `-3` (so before this cut, C115–C116's `174` `Calm`/`Content` rows supplied `+348` raw composure against `-234` from `Anxious`+`Frustrated`).

- **Why composure going net down can be either the ruling working OR a defect of the cut:**
  1. **Ruling working:** Previously, matter-of-fact prose — especially the ~`152` `filed:`/`graded:` newsroom records across C115–C116 (~38 + ~38 per Cycle, plan `:73`) and dry factual answers — had no zero-affect tag and defaulted to `Calm`/`Content`, manufacturing synthetic `+0.45` permanent composure per row (`2 × 0.225`). Stripping those false `+2`s to `Flat` (`0`) leaves genuine emotional distress (`Anxious`/`Frustrated`/etc.) visible, so reflection composure dropping is expected if citizens genuinely voiced more strain than ease.
  2. **Defect of the cut (asymmetric threshold):** `AFFECT_TAGS` has 5 negative tags (`-3`/`-4`) and 4 positive tags (`+2`/`+3`), where `Excited`/`Energized` require high arousal and `Calm`/`Content` are quiet, low-arousal moods. Because `nudgesForReflection_` (`citizenDialMap.js:425`) makes `affect` the **sole** source of composure on reflections, if `"no feeling showing is Flat"` causes the model to reclassify genuinely peaceful/satisfied reflections into `Flat` while keeping mild complaints as `Anxious`/`Frustrated`, the reflection channel becomes a one-way downward ratchet on composure.
- **What numbers from the C115–C116 replay tell them apart:**
  1. **Split `Calm`/`Content` → `Flat` transitions between `filed:`/`graded:` rows and genuine citizen/interview rows (`!/^(filed|graded):/i`).** If `~100%` of `filed:`/`graded:` rows move to `Flat` while genuine `Calm`/`Content` citizen reflections mostly stay `Calm`/`Content` (say, positive vs negative affect counts on non-`filed:`/`graded:` rows stay balanced and net composure on non-bookkeeping rows is near neutral or matches text valence), the overall net-down shift is the ruling working.
  2. **Check negative leakage (`Anxious`/`Frustrated` → `Flat`) vs positive leakage (non-bookkeeping `Calm`/`Content` → `Flat`) and net composure on non-`filed:`/`graded:` rows.** If non-`filed:`/`graded:` `Calm`/`Content` collapses into `Flat` at a far higher rate than mild `Anxious`/`Frustrated` rows — driving net composure strongly negative on genuine citizen prose alone — `Flat` is over-eating quiet positive affects (defect of the cut).

---

## 5. Three realistic texts where the speaker rule misfires (and `Background` swallowing)

Under `"tag what happened to the speaker or what the speaker did, never the subject they talk about"`:

1. **Reporter whose own event IS the story:**
   *"My piece on the Waterfront budget vote made the front page of Saturday's Cycle Pulse, and the council chair called me out by name on the floor this morning."*
   - **What misfires:** Because the text is framed around the Waterfront council coverage, "never the subject they talk about" pushes the model away from `Civic` (`{}` anyway) and can push a journalist's personal milestone (`Public`, `sociability +4`) or conflict (`Spat` / `TrustGuarded`, `warmth -1`) into generic `Media` (`sociability +4`) or `Background` (`{}`), or — on `filed: Waterfront budget stalls` — still lands `Media` (`sociability +4`) for routine filing until Task 3 removes `filed:` rows.
2. **City worker whose job IS the subject (Task 5 / `cron-work-wake.js`):**
   *"Twelve new admissions at Highland overnight and two transfers that didn't make it; we had to divert three ambulances from Fruitvale while I stayed past midnight trying to clear the intake board."*
   - **What misfires:** The hospital admissions and deaths are "the subject" (correctly NOT `Hospitalized`/`Critical` for the director), leaving the speaker's own action as "worked a shift". In `EVENT_VOCAB` (`lib/reflectionClassifier.js:35-88`), that forces either **`Career`** (`drive +4` — rewarding a brutal crisis shift with positive drive!) or **`Civic` / `Background`** (`{}` — zero event delta, contradicting Task 5's goal at `docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md:18,20` that worker statements move dials up or down; worse if paired with `Flat`, moving nothing at all).
3. **Citizen grieving someone else's loss:**
   *"Still can't believe Marcus is gone. I sat on the porch with his sister for two hours tonight trying to figure out who's going to keep the corner shop open."*
   - **What misfires:** Losing a close friend/partner IS something happening to the speaker, yet `VOCAB` (`lib/reflectionClassifier.js:35-88`) has **no bereavement/grief tag**, and `"never the subject they talk about"` tells the model Marcus's death happened to Marcus while the speaker only "sat on the porch". It gets pushed into `Personal` (`{}`), `Daily` (`{}`), or `Background` (`{}`).

**Does `Background` then swallow real events?** **Yes — along with `Daily`, `Personal`, and `Civic` (all `{}` in `citizenDialMap.js:76,195-200`), plus `Disappointment` (effectively `{}` on `nudgesForReflection_`).** Any reflection where the speaker is reacting to a civic breakdown, a portfolio failure at work, or someone close to them dying/being hospitalized has no matching personal-action tag in `EVENT_VOCAB` once `"the subject"` is excluded, so it lands in `{}` (or mis-signs as `Career` `drive +4`), and when spoken matter-of-factly (`Flat`) produces zero movement on all 9 dials.

---

## 6. Weakest two choices in the cut

### Weak Choice 1 — Recording `Flat` as `affect: null` (blank) instead of `'Flat'` with `'Flat': {}` in `DIAL_MAP`
- **What breaks:**
  1. `lib/resonanceRecall.js:71-77` + `lib/citizenPage.js:176`: `null` deletes `meta.affect`, so `affectWeight` returns `0.5` (`:73`) — **outranking `Calm` (`0.4`) and `Content` (`0.4`)** in citizen wake memory selection (`0.25 * 0.5 > 0.25 * 0.4`).
  2. `scripts/citizen-signal-detector.js:61-75,121-132`: Blank rows leave `winTotal` while historical `baseTotal` retains `Calm`/`Content`-tagged flat rows, inflating `observed` and risking phantom share-lifts (`>= 0.15`).
  3. `scripts/citizen-wake.js:461,627`: Blank `affect` renders T4 bond ripples as `"they seemed preoccupied"`.
  4. **Auditability & off-vocab-event drops:** `Reflection_Intake` and `output/citizen_pages/index.jsonl` cannot tell a `Flat` classification apart from a pre-Task-2 doc or an off-vocab/error null (`affect: null` in both), and every writer's `if (cls.event || cls.affect)` silently drops a valid `Flat` row whenever `event` is `null` (whereas `parseDualRaw_` at `lib/reflectionClassifier.js:249` already avoids the whole-line rescan trap via `&& !aff.flat`).
- **Why the justification fails:** The brief says blank avoids `CONTENT_RULES` word-matching the snippet (`citizenMemory.js:202` → `citizenDialMap.js:427`). Adding `'Flat': {}` to `DIAL_MAP` (the same mechanism already used for `'Background': {}`, `'Daily': {}`, `'Civic': {}`, `'Intake': {}` at `citizenDialMap.js:76,195-196,227`) blocks `CONTENT_RULES` at `:390` without erasing `'Flat'` from `Reflection_Intake` or `meta.affect`.

### Weak Choice 2 — Adding `Disappointment` (`{ composure: -2 }`) to `EVENT_VOCAB`
- **What breaks:**
  1. `utilities/citizenDialMap.js:190,421-432`: `DIAL_MAP['Disappointment']` is `{ composure: -2 }`, and `nudgesForReflection_` (`:425`) **strips `composure` from `eventTag`**. Therefore `Disappointment` contributes **`{}` (zero delta on every dial)** on every reflection (`nudgesForReflection_('Disappointment', null, 1, text)` → `{}`; paired with `Frustrated`, it yields `{ composure: -3 }`, identical to `Background | Frustrated`). *(Note: `Setback` at `:129` already suffers the same `{ composure: -5 }` stripping on reflections.)*
  2. **Siphons real negative events to zero:** Setbacks at work or in relationships that should hit `Stumble` (`drive -1`), `Spat` (`warmth -1`), or `TrustGuarded` (`warmth -1`) are absorbed by `Disappointment` into a zero-delta event bucket; when paired with `Flat` (`Disappointment | Flat`), a real negative reflection writes a `Reflection_Intake` row that moves **zero dials** (and stalls `scripts/drainReflectionBacklog.js:72-75`, which skips flipping `applied='yes'` when `m === 0`).

*(Also note in `lib/reflectionClassifier.js:282`: `buildDualPrompt_` still uses the bare literal `EventTag | AffectTag` that caused S282 verbatim-echo misses in `buildTriplePrompt_` `:328-329`; aligning it with `<placeholders>` requires updating `lib/reflectionClassifier.test.js:104`.)*
