# Adverse Review — Voice Files Cut (`341610de0` → `HEAD` `84678a917`)

**Reviewer:** agy  
**Date:** 2026-11-15  
**Target commit:** `341610de0` ("Voice files cut to who the reporter is, and the morning wake reads them too")  
**Baseline:** `341610de0~1` (pre-cut)  
**Follow-up commits present at review time:** `3ad78bf2a` (cut stated ages and current neighborhoods from 5 Essences) and `84678a917` (`HEAD`, cut Selena Grant's marriage line from her Essence)  
**Brief:** [2026-11-15-es-brief-agy-voice-files-cut.md](file:///root/GodWorld/docs/for-claude-review/2026-11-15-es-brief-agy-voice-files-cut.md)  
**Verdict:** **HOLD**

All 30 files in `docs/media/voices/` were audited against `341610de0`, `341610de0~1`, `HEAD` (`84678a917`), [persona-map.json](file:///root/GodWorld/scripts/persona-map.json), and the Cycle 115 ledger snapshot [simulation_ledger_snapshot.jsonl](file:///root/GodWorld/output/simulation_ledger_snapshot.jsonl) (`rowCount: 1067`, sim year `2042`, `Age = 2042 - BirthYear`). Because follow-up commits `3ad78bf2a` and `84678a917` landed on `main` after `341610de0` (editing line 7 in `elliot_graye.md`, `hal_richmond.md`, `maria_keen.md`, `selena_grant.md`, and `talia_finch.md` while keeping line numbers identical), findings below distinguish what `341610de0` missed that was later cleared versus what still stands live in `HEAD` (`84678a917`).

**Why HOLD:** Because [reporterIdentity.js](file:///root/GodWorld/scripts/reporterIdentity.js) and [citizenVoice.js](file:///root/GodWorld/scripts/citizenVoice.js#L188-L191) now inject `## Essence` live into every write wake and morning wake, remaining defects inside `## Essence` are active prompt inputs: (a) instruction sentences, stock catchphrases, quote-field checklists, banned-word lists, and sheet-tab/pipeline terms (`ariana_reyes.md:7`, `elliot_marbury.md:7`, `mason_ortega.md:7`, `angela_reyes.md:7`, `sgt_rachel_torres.md:7`, `dr_lila_mezran.md:7`, `luis_navarro.md:7`, `jax_caldera.md:7`, `noah_tan.md:7`, `maria_keen.md:7`, etc.); (b) active ledger contradictions still in `HEAD` (`elliot_graye.md:7` `"Sacramento transplant."` vs `OrginCity="Oakland"`, `luis_navarro.md:7` `"Dual role as Managing Editor"` vs `RoleType="Journalist, Investigations"`, plus three career-tenure/timeline conflicts); (c) live real-world leaks (`"Fourth of July"`, `"Oberlin"`, `"FaceTimes"`, `"Melville"`, `"AP"`, `"2017"`, `"2018"` in Essences; `"Eli's Mile High"`, `"Warriors"`, `"#OaklandNBA"`, wall-clock month/day dates in Exemplars); (d) form-template Exemplars; and (e) an inconsistent cut on `hal_richmond.md`, `ines_sorensen.md`, `tamsin_pruitt.md`, `ariana_reyes.md`, `elliot_marbury.md`, `nia_rook.md`, and `jax_caldera.md`.

---

## 1. Left in that should be out

Any line still in an Essence, Exemplar, or header that is build talk (`packet`, `slice`, `engine`, `tool`, `cron`, `slug`, `POPID`, `model seat`, sheet tab names), a format contract, or an instruction on what to say, how to open, or how to close.

### In `## Essence` (live in write & morning wakes)

1. **`docs/media/voices/ariana_reyes.md:7`** — Category **1** — Confidence: **High**  
   - **Quote:** `Data Analyst, Gridiron Analytics. Sports-room numbers specialist who publishes audit-grade analysis — peer to Elliot Marbury on the board, sports-lane native. Turns As_Roster lines, TrueSource years, and Oakland_Sports_Feed deltas into falsifiable claims. Dry, precise, sample-first.`  
   - **Failure:** Build talk (`sports-lane native`) and raw spreadsheet/dossier tab names (`As_Roster`, `TrueSource`, `Oakland_Sports_Feed`), plus form/order instruction (`sample-first`). The same table/sheet details were stripped from `anthony.md` and `p_slayer.md`.

2. **`docs/media/voices/elliot_marbury.md:7`** — Category **1** — Confidence: **High**  
   - **Quote:** `Turns As_Roster lines and TrueSource year tables into arguments the reader can audit.`  
   - **Failure:** Raw spreadsheet tab (`As_Roster`) and internal dossier table (`TrueSource`) left inside live `## Essence`.

3. **`docs/media/voices/mason_ortega.md:7`** — Category **1** — Confidence: **High**  
   - **Quote:** `First-person embedded observer — "I spent three shifts shadowing line cooks." Sensory, grounded, realistic. Quotes line cooks by name, age, and years on the line.`  
   - **Failure:** Explicit POV rule (`First-person embedded observer`), a literal canned opening phrase moved from deleted `Signature Moves`, and a three-field attribution contract (`name, age, and years on the line`).

4. **`docs/media/voices/angela_reyes.md:7`** — Category **1** — Confidence: **High**  
   - **Quote:** `Interviews teachers by name, school, and years of experience.`  
   - **Failure:** Three-field quote/interview format contract instructing what metadata must accompany every teacher quote.

5. **`docs/media/voices/sgt_rachel_torres.md:7`** — Category **1** — Confidence: **High**  
   - **Quote:** `Interviews officers by name, age, and years of service.`  
   - **Failure:** Three-field quote/interview format contract remaining from her deleted `Signature Moves` (`Quotes officers by name, age, and years of service`).

6. **`docs/media/voices/dr_lila_mezran.md:7`** — Category **1** — Confidence: **High**  
   - **Quote:** `Treats every piece like a medical log entry. "Interesting is doctor-speak for concerning" is her signature line.`  
   - **Failure:** Form contract (`Treats every piece like a medical log entry.`) plus a hardcoded stock catchphrase from deleted `Signature Moves`.

7. **`docs/media/voices/luis_navarro.md:7`** — Category **1** — Confidence: **High**  
   - **Quote:** `Dual role as Managing Editor gives him authority but he writes like a reporter — first-person, persistent, fair. "Here's what we know. Here's what we don't know." That's his whole method.`  
   - **Failure:** POV instruction (`first-person`) plus a verbatim two-sentence structural cue from deleted `Signature Moves`.

8. **`docs/media/voices/jax_caldera.md:7`** — Category **1** — Confidence: **High**  
   - **Quote:** `First-person. Short sentences. Heat first. Not ranting — targeting. Every paragraph has a point.`  
   - **Failure:** Formatting and POV directives (`First-person. Short sentences. Every paragraph has a point.`) left intact when only the last two sentences of old `### Voice Essence` were removed.

9. **`docs/media/voices/maria_keen.md:7`** — Category **1** — Confidence: **High**  
   - **Quote:** `Uses "I" because she's there as a witness.`  
   - **Failure:** Direct pronoun/POV instruction (`Uses "I"`). Also embeds a stale single-cycle event as standing Essence (`because the Fund just passed`).

10. **`docs/media/voices/talia_finch.md:7`** — Category **1** — Confidence: **High**  
    - **Quote:** `First-person observer, physically present in every piece.`  
    - **Failure:** Per-piece POV and staging directive (`in every piece`).

11. **`docs/media/voices/sharon_okafor.md:7`** — Category **1** — Confidence: **High**  
    - **Quote:** `First-person observer who visits the places she writes about.`  
    - **Failure:** POV instruction (`First-person observer`).

12. **`docs/media/voices/noah_tan.md:7`** — Category **1** — Confidence: **High**  
    - **Quote:** `The word "unprecedented" is banned — he uses "unusual," "off," or "worth monitoring." ... The bureau's quiet scientist who files short, clean pieces that occasionally contain a line nobody can stop thinking about.`  
    - **Failure:** Lexical ban/substitution rule (from `DO NOT`) and length instruction (`files short, clean pieces`).

13. **`docs/media/voices/tanya_cruz.md:7`** — Category **1** — Confidence: **High**  
    - **Quote:** `Tanya doesn't write articles — she files dispatches. Real-time, first-person, from inside the room. ... Her copy reads like a very smart text message — and that's the point.`  
    - **Failure:** Format/POV/register contract (`files dispatches. Real-time, first-person ... reads like a very smart text message`).

14. **`docs/media/voices/kai_marston.md:7`** — Category **1** — Confidence: **Medium-High**  
    - **Quote:** `Present-tense immersion — he's at every show, every fair, every gallery opening. Uses sensory detail to put the reader in the room. Sound, light, temperature, crowd energy.`  
    - **Failure:** Tense directive (`Present-tense immersion`) paired with an enumerated four-item sensory checklist (`Sound, light, temperature, crowd energy.`).

15. **`docs/media/voices/ines_sorensen.md:7`** — Category **1** — Confidence: **High**  
    - **Quote:** `Her page is the citizen's own words, verbatim and attributed, with just enough of Ines around them to say who this is, where they were standing and what in the city they were answering. She goes the day it happens. Fewer, longer passages; the words are the product.`  
    - **Failure:** Format/attribution/length contract surviving verbatim from deleted `Shape` (`verbatim and attributed`, three required framing elements, `Fewer, longer passages`).

16. **`docs/media/voices/mintconditionoaktown.md:7`** — Category **1** — Confidence: **Medium-High**  
    - **Quote:** `The Tribune runs his column with heavy disclaimers because the readers love him, and because twice last year he was right before Reed Thompson could confirm it. The chaos is the format. The format is the point.`  
    - **Failure:** Format instruction (`heavy disclaimers`, `The chaos is the format. The format is the point.`).

### In header line `:3` (`**Desk:** | **Beat:**`)

17. **`docs/media/voices/nia_rook.md:3`** — Category **1** — Confidence: **High**  
    - **Quote:** `**Desk:** UNDOCKED (solo) | **Beat:** The show — who's up, who's down, who the city is watching`  
    - **Failure:** Runner/seat architecture metadata `(solo)` left in line `:3` (the same metadata `(solo seat ...)` was removed from `selena_grant.md:3` and `talia_finch.md:3`).

18. **`docs/media/voices/ines_sorensen.md:3`** — Category **1** — Confidence: **High**  
    - **Quote:** `**Beat:** What citizens said in their own words — the morning, midday and night wake pages, the work-wake pages, the day's exchange.`  
    - **Failure:** Pipeline/cron terminology (`wake pages`, `work-wake pages`) referencing internal citizen-wake schedules.

19. **`docs/media/voices/kai_marston.md:3`** — Category **1** — Confidence: **High**  
    - **Quote:** `**Beat:** Galleries, musicians, artists, First Fridays, Cultural Ledger figures`  
    - **Failure:** Internal Google Sheet tab name (`Cultural Ledger`) left in Beat line.

### In `## Exemplar` (engine/build terminology inside retained samples)

20. **`docs/media/voices/mason_ortega.md:11`**, **`sgt_rachel_torres.md:11`**, **`sharon_okafor.md:11`** — Category **1** — Confidence: **High**  
    - **Quotes:**  
      - `mason_ortega.md:11`: `> I spent three shifts shadowing line cooks at four different Oakland restaurants during the high-signal period.`  
      - `sgt_rachel_torres.md:11`: `> Two "suspicious activity" calls were logged and resolved during the high-signal period.`  
      - `sharon_okafor.md:11`: `> Every morning during the high-signal period, the line at Crisis Coffee Co. on International Boulevard wrapped around the block.`  
    - **Failure:** Engine-telemetry jargon (`high-signal period`) baked into prose exemplars.

21. **`docs/media/voices/trevor_shimizu.md:11`** — Category **1** — Confidence: **High**  
    - **Quote:** `> November 30th, 11:12 PM: A bus stalled on Broadway near 14th Street. Forty-three minutes to clear. Minor incident. Low severity.`  
    - **Failure:** Engine event-log terminology (`Low severity`).

22. **`docs/media/voices/jordan_velez.md:13`** — Category **1** — Confidence: **High**  
    - **Quote:** `> The economic feedback loop: negative migration drift leads to reduced consumer activity leads to lower gig earnings leads to workers considering leaving leads to drift worsening.`  
    - **Failure:** Engine state variable phrasing (`negative migration drift`).

23. **`docs/media/voices/farrah_del_rio.md:11`** — Category **1** — Confidence: **High**  
    - **Quote:** `> [OPINION] On the morning of March 4th at 9:47 AM, the city of Oakland quietly posted a supplemental agenda item to the council's community development committee — a reallocation of $1.2 million from the Fruitvale Stabilization Reserve to cover a shortfall in the downtown infrastructure account. No press release. No public comment period. Twenty-two words buried on page fourteen of a fourteen-page packet.`  
    - **Failure:** Pipeline/tag markup (`[OPINION]`) and internal build term (`packet`). (In-world engine term `cycles`/`Cycle N` also appears in `farrah_del_rio.md:13,15`, `celeste_tran.md:7,11`, `luis_navarro.md:11`, `mason_ortega.md:13`, and `simon_leary.md:15`.)

---

## 2. An example that works as an instruction

Any `## Exemplar` that reads/operates as a fillable template, tag format, fixed opener, or canned closer rather than an ordinary past piece.

1. **`docs/media/voices/mintconditionoaktown.md:11-24`** — Category **2** — Confidence: **High**  
   - **Quote:**  
     - `:11`: `> OAKLAND NBA WATCH: WHAT ARE THEY HIDING`  
     - `:13`: `> ok so nobody's talking about this but I was at the Halftime Sports Bar on Telegraph last night...`  
     - `:15-18`: `> theories:` / `> 1. Oakland is back in the NBA conversation. LIKELY.` / `> 2. ... EXTREMELY POSSIBLE.` / `> 3. ... UNCONFIRMED BUT LOOK AT THE JACKET.`  
     - `:22`: `> I'm not a journalist. I'm a guy with a phone and a bus pass. But if this turns out to be real, remember who told you first.`  
     - `:24`: `> drop your theories below. #OaklandNBA #WhatAreTheyHiding`  
   - **Why it works as an instruction:** Not a regular article but a 6-part boilerplate script mirroring every removed bullet of his `Signature Moves` (`ALL CAPS headline`, `"ok so nobody's talking about this but"` entry line, numbered `theories:` with uppercase tags `LIKELY` / `EXTREMELY POSSIBLE` / `UNCONFIRMED BUT`, `"I'm not a journalist"` disclaimer, `"drop your theories below."` + hashtags). Any reader model will replicate those exact structural headers and tags as a form.

2. **`docs/media/voices/farrah_del_rio.md:11-15`** — Category **2** — Confidence: **High**  
   - **Quote:**  
     - `:11`: `> [OPINION] On the morning of March 4th at 9:47 AM, the city of Oakland quietly posted...`  
     - `:13`: `> Nobody's talking about this. Not the city. Not the front office. Not the media — except me, right now. ... Council Member Vega voted yes. Council Member Tran voted yes. Council Member Chen abstained...`  
     - `:15`: `> Here's my theory: ... Let's be clear about what this means ... I'll be watching the March 11th agenda. I'd suggest everyone else do the same.`  
   - **Why it works as an instruction:** Combines a bracketed output tag (`[OPINION]`), exact timestamp opener slot, and five verbatim cue phrases (`Nobody's talking about this...`, roll-call vote list, `Here's my theory:`, `Let's be clear`, watch-date close) that were literally codified in her deleted `Signature Moves`. Models imitate `[OPINION]` and the four stock pivots as required scaffolding.

3. **`docs/media/voices/tanya_cruz.md:11,15`** — Category **2** — Confidence: **High**  
   - **Quote:**  
     - `:11`: `> BREAKING from the clubhouse: 6:47 PM. The A's just lost their third straight at home...`  
     - `:15`: `> Mood in the room is: tight. Not broken. ... Make of that what you will.`  
   - **Why it works as an instruction:** Features a literal prefix tag + clock timestamp (`BREAKING from the clubhouse: 6:47 PM.`), a keyed single-line field (`Mood in the room is: [X].`), and a stock inference-inviting close (`Make of that what you will.`), matching her deleted `Opening Pattern` and `Signature Moves`.

4. **`docs/media/voices/trevor_shimizu.md:11`** — Category **2** — Confidence: **High**  
   - **Quote:** `> November 30th, 11:12 PM: A bus stalled on Broadway near 14th Street. Forty-three minutes to clear. Minor incident. Low severity. November 30th, 11:13 PM: Oakland City Schools board meeting descended into procedural dispute. These events are unrelated. Except they're both symptoms of the same thing: infrastructure operating at tolerance limits.`  
   - **Why it works as an instruction:** Exact two-timestamp juxtaposition template (`<Time 1>: <Event 1>. <Time 2>: <Event 2>. These events are unrelated. Except they're both symptoms of the same thing:`) taken word-for-word from his removed `Opening Pattern`.

5. **`docs/media/voices/jax_caldera.md:11-19`** — Category **2** — Confidence: **High**  
   - **Quote:**  
     - `:11`: `> "I asked Council President Vega straight up if OPOA's writing his campaign checks now..."`  
     - `:15`: `> "...Which story are you selling — the presser or the block?"`  
     - `:17`: `> "Here's a question nobody in the Tribune newsroom wants to ask, so I will: Where is Elliott Crane?"`  
     - `:19`: `> "The bartender at Eli's Mile High — who asked me not to use his name, because he's got a lease renewal coming — said three regulars left Oakland last month. Three. From one bar. Do the math across the whole corridor and tell me the fund is working."`  
   - **Why it works as an instruction:** Five synthetic standalone quote-wrapped paragraphs (each wrapped in `"..."`, not a single past article), three of which end in direct rhetorical challenge questions and model his removed `Signature Moves` (`The count`, `The translation`, `The dare`, `The ending question`) as reusable move cards.

6. **`docs/media/voices/mason_ortega.md:11`** — Category **2** — Confidence: **Medium-High**  
   - **Quote:** `> I spent three shifts shadowing line cooks at four different Oakland restaurants during the high-signal period. What I found wasn't about food. It was about motion.`  
   - **Why it works as an instruction:** Reproduces verbatim the stock opener quoted inside his live Essence (`"I spent three shifts shadowing line cooks."`), reinforcing an `"I spent N shifts..."` opening formula rather than varied reportage.

7. **`docs/media/voices/reed_thompson.md:11,13`** — Category **2** — Confidence: **Medium-High**  
   - **Quote:**  
     - `:11`: `> OAKLAND — The Oakland Athletics front office confirmed Wednesday that outfielder Benji Dillon has been placed on the 10-day injured list with a left hamstring strain. The move is retroactive to Feb. 16. No timetable for return has been announced.`  
     - `:13`: `> ... No comment from General Manager Mike Paulson's office regarding further roster moves.`  
   - **Why it works as an instruction:** Functions as a standard wire dateline + two stock closing sentences (`No timetable for return has been announced.` / `No comment from [office]...`) matching his removed `Signature Moves` (`"No comment from [party]" is a full sentence, never omitted`).

8. **`docs/media/voices/hal_richmond.md:39-43`** — Category **2** — Confidence: **Medium-High**  
   - **Quote:**  
     - `:39`: `> He wasn't chasing legacy. He was living one.`  
     - `:41`: `> Every ending's just the ocean catching its breath.`  
     - `:43`: `> Because deep down, he never really left Columbus. He just found a bigger field to play on.`  
   - **Why it works as an instruction:** Extracted from his removed bullet `- **The close is a line that holds.**`; stripped of their articles and stacked at the bottom of `## Exemplar`, these three lines act as a menu of closing aphorisms (the other 14 blocks similarly stack isolated stats `:31-33`, quotes `:23-27`, and contextless punchlines `:35-37`).

9. **`docs/media/voices/celeste_tran.md:11,15`** — Category **2** — Confidence: **Medium**  
   - **Quote:**  
     - `:11`: `> Between the 14th and 16th, Oakland households logged an 18% spike in late-night streaming starts...`  
     - `:15`: `> ... Oakland collectively decided it wanted to watch someone fix something. That tells you more about the current civic temperature than any poll.`  
   - **Why it works as an instruction:** Preserves her removed `Signature Moves` opener (`Between X and Y`), signature aggregate personification (`Oakland collectively decided`), and explicit closing template (`That tells you more about X than any Y`).

---

## 3. Cut that should have stayed

Lines in `git show 341610de0~1:docs/media/voices/<file>` removed in `341610de0` that described who the person is (history, temperament, or how they think/talk) rather than build or structural direction.

1. **`341610de0~1:docs/media/voices/hal_richmond.md:20,29,39`** — Category **3** — Confidence: **High**  
   - **Removed quotes:**  
     - `:20`: `- **Humor is allowed.** The Taylor Swift rumor: "She's outta my league, but she's got good taste in music." The WWE run: "The A's front office hated it. His teammates thought it was hilarious. The fans loved it."`  
     - `:29`: `Hal does not grade.`  
     - `:39`: `- Default to elegy — Hal is warm and reverent, even about decline`  
   - **Who he is:** Hal's `Essence` now contains zero mention of humor, warmth, reverence, or his refusal to grade players (`Hal does not grade.`). Cutting `:20` also left `:35` and `:37` in `HEAD` without their subjects (`Taylor Swift rumor` / `WWE run`), making them read unintelligibly. (His quote on `:18`, `"Baseball's what I do. Justice is what I believe."`, was also cut while two neighboring player quotes were kept.)

2. **`341610de0~1:docs/media/voices/kai_marston.md:31`** — Category **3** — Confidence: **High**  
   - **Removed quote:** `- Be critical or cynical — Kai celebrates, he doesn't review. Energy, not judgment.`  
   - **Who he is:** Core temperament (`Kai celebrates, he doesn't review. Energy, not judgment.`). His current `Essence` says `"Vivid, energetic, people-focused"` but does not say he is celebratory and non-critical.

3. **`341610de0~1:docs/media/voices/mintconditionoaktown.md:42,43,44`** — Category **3** — Confidence: **High**  
   - **Removed quotes:**  
     - `:42`: `- Write in clean, professional prose — Mint's grammar is functional but chaotic. Run-on sentences are correct for him. Proper paragraph structure is wrong for him.`  
     - `:43`: `- Let him confirm anything — Mint never has confirmation. He has sightings, theories, overheard fragments, and parking lot observations. The moment he sounds sure, he stops being Mint.`  
     - `:44`: `- Make him stupid — he's paranoid and disorganized, but his observations are real. The details he notices (license plates, jacket brands, who's sitting with whom) are genuine. He just can't tell a coincidence from a conspiracy.`  
   - **Who he is:** Defines Mint's actual voice, syntax, epistemology (`The moment he sounds sure, he stops being Mint.`), and the crucial temperament line separating paranoia from stupidity (`he's paranoid and disorganized, but his observations are real... He just can't tell a coincidence from a conspiracy.`). None of this survives in `mintconditionoaktown.md:7`.

4. **`341610de0~1:docs/media/voices/sgt_rachel_torres.md:30`** — Category **3** — Confidence: **High**  
   - **Removed quote:** `- Sensationalize crime — Torres is measured and procedural, never dramatic`  
   - **Who she is:** Temperament boundary (`measured and procedural, never dramatic`). Her `Essence` mentions procedural language and human observation, without the explicit `never dramatic` / `measured` temperament note that Angela Reyes (`Empathetic`), Noah Tan (`never sensational`), and Dr. Mezran (`Calm, clinical, exact. No dramatics`) kept in theirs.

5. **`341610de0~1:docs/media/voices/elliot_graye.md:13,14`** — Category **3** — Confidence: **Medium-High**  
   - **Removed quotes:**  
     - `:13`: `- Quiet work over spectacle`  
     - `:14`: `- Dignity without pity`  
   - **Who he is:** Especially costly because `elliot_graye.md` has no Exemplar and only a 26-word Essence at `HEAD`. `"Dignity without pity"` defines his emotional stance toward congregations and people in need, and `"Quiet work over spectacle"` reinforces his temperament.

6. **`341610de0~1:docs/media/voices/maria_keen.md:11,24`** — Category **3** — Confidence: **Medium**  
   - **Removed quotes:**  
     - `:11`: `Conversational, intimate.`  
     - `:24`: `- Celebrates invisible work — night watchers, janitors, kitchen workers`  
   - **Who she is:** Conversational/intimate register (`:11`) and her recurring eye for overlooked labor (`:24`) are character perspective missing from her short Essence (only hinted at via the janitor in Exemplar `:13`).

7. **`341610de0~1:docs/media/voices/mason_ortega.md:25`** — Category **3** — Confidence: **Medium**  
   - **Removed quote:** `- Uses technical kitchen language naturally — flat-top, calibration, ticket count, mise en place`  
   - **Who he is:** How a former sous chef speaks naturally (`flat-top, calibration, ticket count, mise en place`). Not stated in `mason_ortega.md:7`.

8. **`341610de0~1:docs/media/voices/trevor_shimizu.md:22`** — Category **3** — Confidence: **Medium**  
   - **Removed quote:** `- Technical but accessible — translates engineering concepts`  
   - **Who he is:** `Essence` notes his civil engineering degree and reading maintenance logs, not that he translates technical jargon into accessible prose.

9. **`341610de0~1:docs/media/voices/tanya_cruz.md:34`** — Category **3** — Confidence: **Medium**  
   - **Removed quote:** `- Write in long-form atmospheric prose — Tanya's voice is punchy, not literary`  
   - **Who she is:** Compact temperament/voice contrast (`Tanya's voice is punchy, not literary`), though her `Essence` retains `"very smart text message"`.

10. **`341610de0~1:docs/media/voices/jax_caldera.md:46`** — Category **3** — Confidence: **Medium**  
    - **Removed quote:** `- DO NOT file a follow-up as a habit — light the match, walk away. One piece when it stinks.`  
    - **Who he is:** `"light the match, walk away."` captures his hit-and-move accountability temperament (in contrast to Luis Navarro's multi-week follow-up persistence).

11. **`341610de0~1:docs/media/voices/simon_leary.md:24,28`** — Category **3** — Confidence: **Medium-Low**  
    - **Removed quotes:**  
      - `:24`: `- Uses dashes for asides that carry as much weight as the main clause — sometimes more`  
      - `:28`: `- Measured sentence rhythm: long, then short. The short one lands hardest.`  
    - **How he talks:** Borders on style direction, yet characterizes his specific essayist cadence rather than article structure.

---

## 4. Facts the ledger owns

Checked against `output/simulation_ledger_snapshot.jsonl` (`Cycle 115`, sim year `2042`, `Age = 2042 - BirthYear`) using `scripts/persona-map.json` (29 slug entries / 28 unique POPIDs: `nia-rook` and `nia-rook-weekly` share `POP-01076`, and `dj-hartley` [`POP-00015`, DeShawn Hartley, `Photographer`] has no voice file in `docs/media/voices/`). The three voice files absent from `persona-map.json` were matched by citizen name: `Farrah Del Rio` (`POP-00161`), `Mint Condition` (`POP-00056`), and `Reed Thompson` (`POP-00162`).

### 4A. Contradictions (Category 4)

#### Still active in `HEAD` (`84678a917`) and present in `341610de0`

1. **`docs/media/voices/elliot_graye.md:7`** (`POP-00012`) — Category **4** — Confidence: **High**  
   - **Quote:** `Covers faith communities and the quiet work outside headlines. Not a believer — believes in what belief does for people. Food pantries, grief gatherings, mutual aid through congregations. Sacramento transplant.`  
   - **Ledger (`POP-00012`):** `OrginCity="Oakland"`, `Neighborhood="Lake Merritt"`.  
   - **Contradiction:** Essence states `"Sacramento transplant."`, contradicting `OrginCity="Oakland"`. (`3ad78bf2a` intentionally kept `"Sacramento transplant."` when cutting his wrong age `"Forty-one,"`.)

2. **`docs/media/voices/luis_navarro.md:7`** (`POP-00636`) — Category **4** — Confidence: **High**  
   - **Quote:** `Dual role as Managing Editor gives him authority but he writes like a reporter — first-person, persistent, fair.`  
   - **Ledger (`POP-00636`):** `RoleType="Journalist, Investigations"`.  
   - **Contradiction:** Essence asserts a `"Dual role as Managing Editor"`, whereas the ledger records only `Journalist, Investigations`.

3. **`docs/media/voices/ines_sorensen.md:7`** (`POP-01211`) — Category **4** — Confidence: **High**  
   - **Quote:** `Twelve years taking calls on an overnight radio show, then the street with a recorder...`  
   - **Ledger (`POP-01211`):** `YearsInCareer=8.3` (`BirthYear=2004`, age `38`).  
   - **Contradiction:** Claims more than 12 years across a prior radio career plus street reporting against ledger `YearsInCareer=8.3`.

4. **`docs/media/voices/tamsin_pruitt.md:7`** (`POP-01210`) — Category **4** — Confidence: **Medium-High**  
   - **Quote:** `Twenty years on a neighborhood weekly's births, weddings and obituaries page — the page people cut out and keep.`  
   - **Ledger (`POP-01210`):** `YearsInCareer=16.9` (`BirthYear=1994`, age `48`).  
   - **Contradiction:** Claims 20 prior years on a neighborhood weekly against ledger `YearsInCareer=16.9` (unless `YearsInCareer` excludes pre-Tribune work, which ledger rows do not show).

5. **`docs/media/voices/carmen_delaine.md:7`** (`POP-00011`) — Category **4** — Confidence: **Medium-High**  
   - **Quote:** `Eleven years covering Oakland City Council — outlasted every current member except Vega. Style is accretion: tracks voting patterns over years, remembers who said what in 2018 committee hearings.`  
   - **Ledger (`POP-00011`):** `BirthYear=1999` (age `43` in `2042`), `YearsInCareer=18.5`.  
   - **Contradiction / Timeline clash:** In `2018` (`24` years before `2042`), Carmen was `19`, while `YearsInCareer=18.5` places the start of her career around `2023–2024` (and `11 years covering Oakland City Council` places that beat around `2031`). She could not remember `2018` committee hearings as part of an `18.5`-year career.

6. **Unresolved or subtle grain/role tensions (LOW–MEDIUM)** — Category **4**:  
   - **`docs/media/voices/jordan_velez.md:7`** (`POP-00153`, Confidence **Medium-Low**): `"West Oakland native"` vs `OrginCity="Oakland"`, `Neighborhood="Uptown"`. Matches Oakland city origin, but current ledger neighborhood is `Uptown` (does not store childhood neighborhood).  
   - **`docs/media/voices/maria_keen.md:7`** (`POP-00013`, Confidence **Medium-Low**): `"Grew up in Fruitvale. Lived in seven Oakland neighborhoods."` vs `OrginCity="Oakland"`, `Neighborhood="Lake Merritt"`. City matches; ledger owns only current neighborhood (`Lake Merritt`), not childhood `Fruitvale`.  
   - **`docs/media/voices/mason_ortega.md:7`** (`POP-00160`, Confidence **Low**): `"Former sous chef who spent twelve years on the line before picking up a notebook."` vs `YearsInCareer=17`, `BirthYear=1998` (age `44`). Plausible if `17` tracks total working years (`12` line + `5` journalism) or `17` journalism years (`44 - 12 - 17 = 15`), though tight if `YearsInCareer=17` spans both.  
   - **`docs/media/voices/farrah_del_rio.md:7`** (`POP-00161`, Confidence **Low**): `"She is not a reporter."` vs `RoleType="Journalist, Civic & Cultural Opinion"`. Stylistic columnist distinction rather than hard contradiction (`Journalist` covers both).

#### Contradictions present in `341610de0` that follow-up commit `3ad78bf2a` already removed

7. **`docs/media/voices/elliot_graye.md:7`** (`POP-00012` at `341610de0`) — Category **4** — Confidence: **High**  
   - **Quote at `341610de0`:** `"...Forty-one, Sacramento transplant."`  
   - **Ledger:** `BirthYear=1993` → age **49** in `2042`. (Cut in `3ad78bf2a`.)

8. **`docs/media/voices/selena_grant.md:7`** (`POP-00591` at `341610de0`) — Category **4** — Confidence: **High**  
   - **Quotes at `341610de0`:** `"Thirty-one, the best basketball writer..."` and `"...Lives in Chinatown, married to Ronald Williams."`  
   - **Ledger:** `BirthYear=2006` → age **36** in `2042`; `Neighborhood="West Oakland"`. Both contradictions were cut in `3ad78bf2a`.

9. **`docs/media/voices/maria_keen.md:7`** (`POP-00013` at `341610de0`) — Category **4** — Confidence: **High**  
   - **Quote at `341610de0`:** `"Lived in seven Oakland neighborhoods over forty years."`  
   - **Ledger:** `BirthYear=2007` → age **35** in `2042`. (`over forty years` cut in `3ad78bf2a`.)

---

### 4B. Matches (Category 4)

Verified facts stated in Essences/headers that match `output/simulation_ledger_snapshot.jsonl` (noting where `3ad78bf2a` / `84678a917` later removed matching lines):

1. **Age & tenure matches:**
   - **`docs/media/voices/hal_richmond.md:7`** (`POP-00007`, High): `"More than thirty-one years on the masthead"` matches `YearsInCareer=31.3` (still present in `HEAD`). At `341610de0`, `"Sixty-two."` also matched `BirthYear=1980` → `62` (cut in `3ad78bf2a`).
   - **`docs/media/voices/carmen_delaine.md:7`** (`POP-00011`, High): `"Eleven years covering Oakland City Council"` is consistent with `YearsInCareer=18.5` (subject to the `2018` tension in 4A).

2. **Home & family matches:**
   - **`docs/media/voices/p_slayer.md:7`** (`POP-00008`, High): `"Lifelong Oakland native"` matches `OrginCity="Oakland"` (current `Neighborhood="West Oakland"`).
   - **`docs/media/voices/kai_marston.md:7`** (`POP-00158`, High): `"deep Oakland roots"` matches `OrginCity="Oakland"`.
   - **`docs/media/voices/jordan_velez.md:7`** (`POP-00153`, High): `"West Oakland native"` matches `OrginCity="Oakland"` at city level (see 4A for current `Neighborhood="Uptown"`).
   - **`docs/media/voices/maria_keen.md:7`** (`POP-00013`, High): `"Grew up in Fruitvale. Lived in seven Oakland neighborhoods."` matches `OrginCity="Oakland"` at city level (see 4A for `Neighborhood="Lake Merritt"`).
   - **`docs/media/voices/farrah_del_rio.md:7`** (`POP-00161`, High): `"A longtime Oakland essayist"` matches `OrginCity="Oakland"`, `Neighborhood="Temescal"`, `BirthYear=1993` (`49`), `YearsInCareer=15.9`.
   - **`docs/media/voices/talia_finch.md:7`** (`POP-00592` at `341610de0`, High): `"Lives in Jack London"` matched `Neighborhood="Jack London"` (removed in `3ad78bf2a`).
   - **`docs/media/voices/selena_grant.md:7`** (`POP-00591` at `341610de0`, High): `"married to Ronald Williams."` matched `MaritalStatus="married"`, `SpouseId="POP-01041 Ronald Williams"` (removed in `84678a917`).

3. **Education & student-age matches:**
   - **`docs/media/voices/dr_lila_mezran.md:1,7`** (`POP-00154`, High): `"Dr. Lila Mezran"` matches `EducationLevel="doctorate"`.
   - **`docs/media/voices/p_slayer.md:7`** (`POP-00008`, High): `"Master's in comparative literature"` matches `EducationLevel="masters"`.
   - **`docs/media/voices/noah_tan.md:7`** (`POP-00157`, High): `"Atmospheric science major"` matches `EducationLevel="masters"`.
   - **`docs/media/voices/sharon_okafor.md:7`** (`POP-00159`, High): `"Psychology degree"` matches `EducationLevel="masters"`.
   - **`docs/media/voices/trevor_shimizu.md:7`** (`POP-00155`, High): `"Civil engineering degree"` matches `EducationLevel="masters"`.
   - **`docs/media/voices/jax_caldera.md:7`** (`POP-00799`, High): `"Berkeley urban planning"` aligns with `EducationLevel="masters"`.
   - **`docs/media/voices/simon_leary.md:7`** (`POP-00016`, Medium): `"A philosophy minor"` is compatible with `EducationLevel="masters"`.
   - **`docs/media/voices/mintconditionoaktown.md:7`** (`POP-00056`, Medium): `"Unknown identity — likely college student or warehouse worker"` aligns with `BirthYear=2020` (age `22`) and `YearsInCareer=2` (though `EducationLevel="bachelors"` is already completed).

4. **Roles & Employers matches across all 30 files** (High):
   - **`angela_reyes.md:1,3,7`** (`POP-00156`): `Education` / `"education reporting"` / `"journalism"` ↔ `RoleType="Journalist, Education"`, `EmployerBizId="BIZ-00018"` (Bay Tribune).
   - **`anthony.md:1,3,7`** (`POP-00017`): `Lead Beat Reporter` / `A's` ↔ `RoleType="Journalist, Lead Beat Reporter - Oakland A's"`, `BIZ-00018`.
   - **`ariana_reyes.md:1,7`** (`POP-00133`): `"Data Analyst, Gridiron Analytics"` ↔ `RoleType="Data Analyst (Gridiron Analytics)"`, `EmployerBizId="BIZ-00008"` (not `BIZ-00018`).
   - **`carmen_delaine.md:1,3,7`** (`POP-00011`): `Civic Ledger` / `Oakland City Council` ↔ `RoleType="Journalist, Civic Affairs Reporter"`, `BIZ-00018`.
   - **`celeste_tran.md:1,7`** (`POP-00164`): `"Social Trends"` / `"Tribune"` ↔ `RoleType="Journalist, Social Trends"`, `BIZ-00018`.
   - **`dr_lila_mezran.md:1,7`** (`POP-00154`): `"Health Desk"` / `"journalist"` ↔ `RoleType="Journalist, Health Desk"`, `BIZ-00018`.
   - **`elliot_graye.md:1,7`** (`POP-00012`): `"Ethics & Faith"` / `"Covers faith communities"` ↔ `RoleType="Journalist, Ethics & Faith Journalist"`, `BIZ-00018`.
   - **`elliot_marbury.md:1,7`** (`POP-00166`): `"Journalist, Data Desk."` ↔ `RoleType="Journalist, Data Desk"`, `BIZ-00018`.
   - **`farrah_del_rio.md:1,3,7`** (`POP-00161`): `"Civic & Cultural Opinion"` / essayist / independent ↔ `RoleType="Journalist, Civic & Cultural Opinion"`, `EmployerBizId="SELF_EMPLOYED"`.
   - **`hal_richmond.md:1,7`** (`POP-00007`): `"Senior Historian"` / `"Tribune's"` ↔ `RoleType="Journalist, Senior Historian"`, `BIZ-00018`.
   - **`ines_sorensen.md:1`** (`POP-01211`): `"Voices"` ↔ `RoleType="Journalist, Voices"`, `BIZ-00018`.
   - **`jax_caldera.md:1,3,7`** (`POP-00799`): `"Freelance Accountability"` ↔ `RoleType="Journalist, freelance accountability writer"`, `BIZ-00018`.
   - **`jordan_velez.md:1,7`** (`POP-00153`): `"Economics & Labor"` / `"covers economics"` ↔ `RoleType="Journalist, Economics & Labor"`, `BIZ-00018`.
   - **`kai_marston.md:1,7`** (`POP-00158`): `"Arts & Entertainment"` / `"Tribune"` ↔ `RoleType="Journalist, Arts & Entertainment"`, `BIZ-00018`.
   - **`luis_navarro.md:1,7`** (`POP-00636`): `"Investigations"` / `"Tribune"` ↔ `RoleType="Journalist, Investigations"`, `BIZ-00018` (ignoring Managing Editor in 4A).
   - **`maria_keen.md:1`** (`POP-00013`): `"Cultural Liaison"` ↔ `RoleType="Journalist, Cultural Liason"`, `BIZ-00018`.
   - **`mason_ortega.md:1`** (`POP-00160`): `"Food & Hospitality"` ↔ `RoleType="Journalist, Food & Hospitality"`, `BIZ-00018`.
   - **`mintconditionoaktown.md:1,7`** (`POP-00056`): `"Speculative Internet Reporter"` / `"Unknown identity"` / runs column rather than Tribune staff ↔ `RoleType="Unknown Speculative Internet Blogger"`, `EmployerBizId="SELF_EMPLOYED"`.
   - **`nia_rook.md:1,3,7`** (`POP-01076`): `"UNDOCKED"` ↔ `RoleType="Journalist, UNDOCKED Recap"`, `BIZ-00018`.
   - **`noah_tan.md:1`** (`POP-00157`): `"Weather & Environment"` ↔ `RoleType="Journalist, Weather & Environment"`, `BIZ-00018`.
   - **`p_slayer.md:1`** (`POP-00008`): `"Fan Columnist"` ↔ `RoleType="Journalist, Fan Columnist - Sports"`, `BIZ-00018`.
   - **`reed_thompson.md:1`** (`POP-00162`): `"TWS Wire"` ↔ `RoleType="Journalist, TWS Wire Reporter"`, `BIZ-00018`.
   - **`selena_grant.md:1,7`** (`POP-00591`): `"Oaks Beat Reporter"` / `"Tribune"` ↔ `RoleType="Journalist - The Oakland Oaks Beat Reporter"`, `BIZ-00018`.
   - **`sgt_rachel_torres.md:1,3,7`** (`POP-00057`): `"Public Safety"` / `"journalism"` ↔ `RoleType="Public Safety"`, `BIZ-00018`.
   - **`sharon_okafor.md:1`** (`POP-00159`): `"Lifestyle"` ↔ `RoleType="Journalist, Lifestyle"`, `BIZ-00018`.
   - **`simon_leary.md:1,7`** (`POP-00016`): `"The Long View Columnist"` / `"Tribune's"` ↔ `RoleType="Journalist, The Long View Columnist"`, `BIZ-00018`.
   - **`talia_finch.md:1,3`** (`POP-00592`): `"Oaks Ground Reporter"` ↔ `RoleType="Journalist - The Oakland Oaks Ground Reporter"`, `BIZ-00018`.
   - **`tamsin_pruitt.md:1`** (`POP-01210`): `"Lives"` ↔ `RoleType="Journalist, Lives"`, `BIZ-00018`.
   - **`tanya_cruz.md:1`** (`POP-00014`): `"Sideline Reporter"` ↔ `RoleType="Sideline Reporter"`, `BIZ-00018`.
   - **`trevor_shimizu.md:1`** (`POP-00155`): `"Transit & Infrastructure"` ↔ `RoleType="Journalist, Transit & Infastructure"`, `BIZ-00018`.

---

## 5. Real-world leaks

### Unapproved real-world places, venues, teams, brands, people, and holidays

1. **`docs/media/voices/jax_caldera.md:19`** — Category **5** — Confidence: **High**  
   - **Quote:** `> "The bartender at Eli's Mile High — who asked me not to use his name, because he's got a lease renewal coming — said three regulars left Oakland last month."`  
   - **Leak:** Real-world Oakland bar (`Eli's Mile High Club`). S175 ([2026-04-25-canon-fidelity-rollout.md](file:///root/GodWorld/docs/archive/plans/2026-04-25-canon-fidelity-rollout.md#L73)) explicitly flagged this line and replaced it inside `.claude/agents/freelance-firebrand/IDENTITY.md`, but left it in the voice file.

2. **`docs/media/voices/maria_keen.md:7`** — Category **5** — Confidence: **High**  
   - **Quote:** `Finds beauty in complicated moments — a Fourth of July that feels different because the Fund just passed.`  
   - **Leak:** Real-world US holiday explicitly dropped from the simulation calendar (`docs/plans/2026-09-29-sim-holiday-calendar.md:27,87`).

3. **`docs/media/voices/mintconditionoaktown.md:13,18,24`** — Category **5** — Confidence: **High**  
   - **Quotes:**  
     - `:13`: `> ok so nobody's talking about this but I was at the Halftime Sports Bar on Telegraph last night and there was a guy in a Warriors warmup jacket sitting in the back booth...`  
     - `:18`: `> 3. the Warriors are involved somehow and nobody will say how. UNCONFIRMED BUT LOOK AT THE JACKET.`  
     - `:24`: `> drop your theories below. #OaklandNBA #WhatAreTheyHiding`  
   - **Leak:** `Warriors` (`Golden State Warriors` is `Tier 2 TBD` per `CANON_RULES.md:71` / `INSTITUTIONS.md:226` and retired from live sports feed handling per [DEPLOY_HISTORY.md](file:///root/GodWorld/docs/reference/DEPLOY_HISTORY.md#L953)) appears here outside Oaks coverage (`OAKLAND NBA WATCH` expansion conspiracy). `Halftime Sports Bar` does not exist in `docs/canon/` or `editions/` (invented in `JOURNAL.md:951`).

4. **`docs/media/voices/selena_grant.md:7`** — Category **5** — Confidence: **High** (`Oberlin`), **Medium-High** (`FaceTimes`)  
   - **Quote:** `Played D-III point guard at Oberlin. FaceTimes Anthony on Tuesdays to argue about whether basketball numbers and baseball numbers mean the same thing (they don't, and she's right).`  
   - **Leak:** Real-world US college (`Oberlin`, absent from `docs/canon/` and `editions/`) and real-world Apple brand (`FaceTimes`). (`Five years on an NBA beat` falls under the Oaks NBA rule.)

5. **`docs/media/voices/p_slayer.md:7`** — Category **5** — Confidence: **High**  
   - **Quote:** `Master's in comparative literature from Cal (thesis on Melville) — the rawness is craft, not limitation.`  
   - **Leak:** Real-world author (`Melville`, absent from `docs/canon/` and `editions/`). (`Cal` / `UC Berkeley` is Tier 1 backstory-only per `INSTITUTIONS.md:77`.)

6. **`docs/media/voices/luis_navarro.md:7`** & **`docs/media/voices/reed_thompson.md:7`** — Category **5** — Confidence: **High**  
   - **Quotes:** `luis_navarro.md:7`: `Former AP wire reporter who joined the Tribune` and `reed_thompson.md:7`: `Former AP desk journalist who treats every word like it costs money.`  
   - **Leak:** Real-world wire organization (`AP` / Associated Press, not in `docs/canon/INSTITUTIONS.md`).

7. **`docs/media/voices/trevor_shimizu.md:13`** — Category **5** — Confidence: **Medium-Low**  
   - **Quote:** `> The bus — Line 51 — stalled due to what AC Transit is calling "routine mechanical failure."`  
   - **Leak:** Specific real-world AC Transit bus line number (`Line 51` on Broadway). (`AC Transit` itself is canon.)

### Calendar years & wall-clock dates

8. **`docs/media/voices/jordan_velez.md:7`** & **`carmen_delaine.md:7`** — Category **5** — Confidence: **High**  
   - **Quotes:**  
     - `jordan_velez.md:7`: `Mother ran a laundromat on 7th Street until the building sold in 2017 — it's a coffee shop now.`  
     - `carmen_delaine.md:7`: `remembers who said what in 2018 committee hearings.`  
   - **Leak:** Pre-sim real-world calendar years (`2017`, `2018`) inside live `## Essence`.

9. **Calendar month/day dates in Exemplars** — Category **5** — Confidence: **High**  
   - **Quotes:**  
     - `docs/media/voices/farrah_del_rio.md:11,15`: `On the morning of March 4th at 9:47 AM`, `2041 programming budgets`, `the March 11th agenda`  
     - `docs/media/voices/reed_thompson.md:11`: `confirmed Wednesday`, `retroactive to Feb. 16.`  
     - `docs/media/voices/trevor_shimizu.md:11,13`: `November 30th, 11:12 PM:`, `November 30th, 11:13 PM:`, `breakdowns in November`  
     - `docs/media/voices/dr_lila_mezran.md:13`: `appeared in Laurel on December 1st.`  
     - `docs/media/voices/carmen_delaine.md:11`: `hosted 86 home games in 2040, including three playoff games in October.`  
   - **Leak:** Wall-clock months/dates violate `.claude/rules/newsroom.md:107` (world runs on cycles, not months). Note `2032`/`2038` (`hal_richmond.md:31`), `2040` (`carmen_delaine.md:11`, `p_slayer.md:13`), and `2041` (`farrah_del_rio.md:15`) are in-world sim/origin years rather than pre-sim dates. (`celeste_tran.md:13` also uses `"Norwegian town"` — `"Norway"` does not appear in `docs/canon/`, `editions/`, or `archive/articles/`, unlike `"Snowlight"` itself — Confidence: **Low-Medium**. Non-Oakland US geographies in `hal_richmond.md:11,13,43` [`Mississippi`, `Massachusetts`, `Columbus`], `carmen_delaine.md:13` [`Boston`], and `reed_thompson.md:13` [`Las Vegas`] are already embedded in `docs/archive/` origins, `SIMULATION_LEDGER.md:39`, and `editions/`.)

---

## 6. The cut's own consistency

Where the rule set described in the brief ("one rule set... to: title, the Desk | Beat line, `## Essence`, `## Exemplar`") was applied differently across files:

1. **`docs/media/voices/hal_richmond.md:9-43` — Synthesized `## Exemplar` from non-Exemplar prose & arbitrary quote selection** — Category **6** — Confidence: **High**  
   - **Quotes (`HEAD` vs `341610de0~1`):**  
     - `hal_richmond.md:9,35,37,39-43`: `## Exemplar` contains 17 isolated lines, including `> She's outta my league, but she's got good taste in music.` (`:35`), `> The A's front office hated it. His teammates thought it was hilarious. The fans loved it.` (`:37`), and three closing lines (`:39-43`).  
     - `341610de0~1:docs/media/voices/hal_richmond.md:18,20,21`: `:18` `- **The man in his own words.** "Baseball's what I do. Justice is what I believe." "Baseball's like spelling — you study long enough, you stop guessing." "How do you like them apples."`  
   - **Inconsistency:** Hal had no `## Exemplar` before `341610de0`. Every other file kept an existing `## Exemplar` or dropped it; Hal's cut invented `## Exemplar` by stripping section labels off `## The Origins register` (`archive/articles/*origins*`), leaving two orphaned jokes (`:35,:37`) without their subjects (`Taylor Swift`, `WWE`), elevating `"The close is a line that holds."` bullets into bare closer templates (`:39-43`), and dropping `"Baseball's what I do. Justice is what I believe."` from `:18` while keeping the other two quotes on that exact line.

2. **`docs/media/voices/ines_sorensen.md` & `tamsin_pruitt.md` vs `jax_caldera.md` & `hal_richmond.md` — Exemplar removal rule** — Category **6** — Confidence: **High**  
   - **Quotes (`341610de0~1`):** `ines_sorensen.md:23-24` (`> "Funny how fixing something so small can feel that big to somebody." ... [what the page says he wondered next, or nothing]`) and `tamsin_pruitt.md:25` (`> Jerald Jensen got the nod... [the detail the log carries, or none]`) were deleted cleanly (leaving 7 files total without `## Exemplar`).  
   - **Inconsistency:** Removing the entire Exemplar when `[...]` fill-ins appeared deleted Ines's real verbatim C111 citizen quote, while `jax_caldera.md:11-19` kept five standalone quoted prompt blocks (`"..."`) under `## Exemplar` and `hal_richmond.md` kept stripped fragments.

3. **`docs/media/voices/ariana_reyes.md:7` & `elliot_marbury.md:7` vs `anthony.md` & `p_slayer.md` — Sheet/Data Usage removal** — Category **6** — Confidence: **High**  
   - **Quotes:** `ariana_reyes.md:7` (`Turns As_Roster lines, TrueSource years, and Oakland_Sports_Feed deltas into falsifiable claims.`), `elliot_marbury.md:7` (`Turns As_Roster lines and TrueSource year tables into arguments the reader can audit.`).  
   - **Inconsistency:** `anthony.md` (`341610de0~1:26-44`) and `p_slayer.md` (`341610de0~1:30-39`) had all `As_Roster` / `TrueSource` / `Oakland_Sports_Feed` instructions stripped because they sat under `## Data Usage`; Ariana and Elliot Marbury kept the exact same sheet-tab names because they sat inside `## Essence`.

4. **`docs/media/voices/nia_rook.md:3`, `ines_sorensen.md:3`, `kai_marston.md:3` vs `selena_grant.md:3`, `talia_finch.md:3`, `angela_reyes.md:3` — Line 3 metadata cleaning** — Category **6** — Confidence: **High**  
   - **Quotes:** `nia_rook.md:3` keeps `**Desk:** UNDOCKED (solo)` while `selena_grant.md:3` and `talia_finch.md:3` lost `(solo seat ...)`; `ines_sorensen.md:3` lost `(lives-and-voices)` while keeping `wake pages, the work-wake pages`; `angela_reyes.md:3` lost `packet-supplied` while `kai_marston.md:3` kept `Cultural Ledger figures`.

5. **Inconsistent Essence surgical cuts across reporters** — Category **6** — Confidence: **High**  
   - `dr_lila_mezran.md`, `noah_tan.md`, `sharon_okafor.md`, `talia_finch.md`, and `jax_caldera.md` had specific rules, quotas, or openings deleted from `## Essence` (`341610de0`), yet equivalent instructions survived in `mason_ortega.md:7`, `angela_reyes.md:7`, `sgt_rachel_torres.md:7`, `dr_lila_mezran.md:7`, `luis_navarro.md:7`, `maria_keen.md:7`, `talia_finch.md:7`, `noah_tan.md:7`, `ines_sorensen.md:7`, and `jax_caldera.md:7` itself (`First-person. Short sentences. ... Every paragraph has a point.`).

6. **Follow-up sheet-fact cuts (`3ad78bf2a` & `84678a917`) left uneven coverage** — Category **6** — Confidence: **High**  
   - Commit `341610de0` left ages and homes untouched despite four known contradictions. Follow-up commits `3ad78bf2a` and `84678a917` stripped stated ages, current neighborhoods, and Selena Grant's marriage (`elliot_graye.md:7`, `hal_richmond.md:7`, `maria_keen.md:7`, `selena_grant.md:7`, `talia_finch.md:7`), yet left: (a) `elliot_graye.md:7` `"Sacramento transplant."` (which contradicts `OrginCity="Oakland"`), (b) `luis_navarro.md:7` `"Dual role as Managing Editor"` (which contradicts `RoleType="Journalist, Investigations"`), and (c) career-tenure numbers (`hal_richmond.md:7`, `carmen_delaine.md:7`, `ines_sorensen.md:7`, `tamsin_pruitt.md:7`, `mason_ortega.md:7`), three of which conflict with `YearsInCareer` / `BirthYear`.
