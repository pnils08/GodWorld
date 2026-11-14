# Adversarial Review — `AGENT_BOOT_TEMPLATES.md` (pipeline.110 Task 9)

- **Target:** `docs/reference/AGENT_BOOT_TEMPLATES.md` (draft, lines 1–239)
- **Evidence reviewed:** `docs/research/2026-11-13-boot-templates-test-runs.md` (lines 1–190) and raw transcripts `output/engine-sheet/2026-11-13-boot-three-way.md`, `…-boot-three-way-run2.md`, `…-ask-dry-run.md`, `…-seat-asks-worker-dry-run.md`, plus live code and C115 beat/ledger snapshots
- **Brief:** `docs/for-claude-review/2026-11-13-es-brief-agy-agent-boot-templates.md`
- **Reviewer lane:** agy (Antigravity)
- **Date:** 2026-11-13 (filed 2026-11-14)

## Verdict: HOLD

Do not approve this draft as the build contract for `pipeline.110`, `civic.47 W1`, or `.claude/agents/*` retirement until the specification gaps below are settled:

1. **§3 Worker specifies a loader (`loadOwnPageReadback`) that explicitly drops `'office-position'` docs in production code (`lib/wakePerception.js:410`), mismatches `moves_c115.jsonl` keys, and relies on empty/partial tabs (`Judicial_Ledger = 0`, `Hospital_Ledger = 0` deaths, `promises.jsonl = 0` for workers).**
2. **§4 Reporter claims `TEST_LIGHT` isolated the `~500`-char written background, whereas `scripts/cron-desk-writer.js:1258-1355` still injected `TANYA/KAI STANCE (hard)` (including `"Short."`), sideline/arts bags, full `.claude/agents` `SKILL`, `cascadeRateRule`, and `TYPED PACKET OUTPUT CONTRACT` — and §4's Tanya `C` word-count/paragraph/last-name claims fail against the saved transcript (`output/engine-sheet/2026-11-13-boot-three-way-run2.md:401-450`).**
3. **§3.1 Roster and §3.2 Chaos-Car Routing contain structural errors against `Civic_Office_Ledger.jsonl`, `scripts/civic-office-map.json`, `utilities/chaosCarsConfig.js`, and the slice builders (`STAFF-*` vs `PROJ-*` key break, `Hospital_Ledger` death count, `Care_Justice_Census` 77.8% hospital split, omitted `buildWorldSummary.js` / `buildHealthSlice.js`, and 7 of 12 vehicles misrouted).**
4. **§5 Gate treats deterministic `scripts/finalArbiter.js` as a prompt-loaded candidate while omitting the live LLM gate `scripts/cron-civic-gate.js`, and §7 misses 8 repo scripts plus active skills reading `.claude/agents/*` and `docs/media/voices/*`.**

**Evidence boundary (Verified vs. Inferred):** Every `file:line`, row count, word count, quoted run line, and code path labeled **Verified** below was directly read or measured in this review session (including the attached Haiku engine wiring card over `128/128` engine phase files). Statements labeled **Inferred** explain downstream failure modes if this draft were approved/implemented as written.

---

## Numbered Findings

### Area 1 — Evidence Against Claim (§1–§4)

#### 1. [HIGH] §4 Reporter misattributes `TEST_LIGHT` outputs, misreports Tanya Cruz word counts, and states two false `3 of 3` style claims

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:185-188`
  - `docs/research/2026-11-13-boot-templates-test-runs.md:56-58, 152`
  - `scripts/cron-desk-writer.js:243, 444, 1258-1282, 1315-1323, 1344-1355, 1474-1477`
  - `docs/media/TANYA_SIDELINE_BAG.md:16`
  - `output/engine-sheet/2026-11-13-boot-three-way-run2.md:237-450`
  - `output/engine-sheet/2026-11-13-boot-three-way.md:124-157`
- **Verified:**
  - `scripts/cron-desk-writer.js:243` sets `TEST_LIGHT` from `GODWORLD_TEST_PROMPT === 'light'`. In `cron-desk-writer.js`, `TEST_LIGHT` ONLY clears `rubricBlock(packet)` (`line 444`), shortens the first sentence of `system` (`lines 1321-1323`), and swaps `composeUser` (`lines 1474-1477`).
  - `cron-desk-writer.js:1344-1355` STILL unconditionally injects `firebrandHeat` (`lines 1258-1262`: `KAI STANCE (hard)` + `loadKaiArtsBag()`; `lines 1278-1282`: `TANYA STANCE (hard)` — containing `'sideline dispatch'`, `'You file from the clubhouse'`, `'Short.'` — + `loadTanyaSidelineBag()` from `docs/media/TANYA_SIDELINE_BAG.md:16`, containing `'Short paragraphs. Present when live.'`), PLUS `cascadeRateRule` (`lines 1315-1319`), `'=== YOUR SKILL (.claude/agents/...) ==='` (`line 1347`), and `'=== TYPED PACKET OUTPUT CONTRACT ==='` (`lines 1349-1355`). Thus neither `A-light`, `B`, nor `C` removed persona/style directives from the system prompt.
  - `AGENT_BOOT_TEMPLATES.md:186` states: `"Tanya Cruz ×3 each: today's folder and the sheet line alone both give long scene prose (305–607 words); with the written part, her dispatch 3 of 3 (265–327 words, one-line paragraphs, last names)"`.
    - Those `305–607` and `265–327` numbers include the ~100–140-word `**INTAKE**` + `CLAIM:` footer, not article prose. Measured prose word counts (body before `**INTAKE**`) in `output/engine-sheet/2026-11-13-boot-three-way-run2.md:237-450` are:
      - `A` (`237-300`): `[470, 470, 375]` (`[606, 606, 514]` full; matching `test-shell` `.wake.json` `wordCount` `[469, 468, 375]`).
      - `A-light` (`302-352`): `[438, 290, 173]` (`[574, 429, 304]` full; `A-light run 3` at `173` prose / `304` full is omitted from `test-runs.md:152` and lumped into `305–607`, even though `173` prose words is **shorter** than `C run 1` (`189`) and `C run 2` (`192`)).
      - `B` (`354-400`): `[310, 235, 272]` (`[446, 366, 408]` full).
      - `C` (`401-450`): `[189, 192, 156]` (`[264, 326, 292]` full).
    - `"one-line paragraphs, last names"` `3 of 3` is false: `C run 2` (`lines 418-426`) uses full names (`"Vinnie Keane"`, `"Mike Paulson"`) and has paragraph word counts `[17, 21, 17, 127, 10]`; `C run 3` (`lines 436-444`) uses full names (`"Vinnie Keane"`, `"Benji Dillon"`, `"Mike Paulson"`) across multi-sentence paragraphs `[16, 51, 45, 34, 10]` (zero one-line quote paragraphs); `C run 1` (`lines 403-411`) has paragraph word counts `[24, 9, 131, 14, 11]`.
    - Kai Marston `C` (`boot-three-way.md:124-157`) ran `n=1` and failed its own written voice constraint `"How you talk: Present tense."` (`line 25`): `"Dillon said on the record"` (`line 134`), `"Raines ... put it another way"` (`line 138`), `"Darrin Davis ... offered a more cautious read"` (`line 142`).
- **Inferred:** `input:` Approve §4 (`~500`-char voice file + remove `IDENTITY/LENS/RULES`) believing the C block drove dispatch form → `wrong output:` behavior in the test actually rode on `TANYA STANCE (hard)` (`"Short."`) + `TANYA_SIDELINE_BAG` (`"Short paragraphs. Present when live."`) injected by `cron-desk-writer.js:1278-1282`, and `n=1` (Kai) + `n=3` (Tanya) under `TEST_LIGHT` do not support the §4 claim.

#### 2. [MEDIUM] §1–§3 promote narrow single-subject runs to `"State: tested"` and miscount City Hall runs (`27` vs `21`)

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:52-55, 69-72, 90-91`
  - `docs/research/2026-11-13-boot-templates-test-runs.md:50-55, 127, 133-135, 144, 148-152, 166-176`
  - `output/engine-sheet/2026-11-13-boot-three-way.md:159-205, 368-386`
  - `output/engine-sheet/2026-11-13-boot-three-way-run2.md:9-215`
- **Verified:**
  - **§1 Citizen (`lines 52-54`):** `"State: tested; matches what runs today"` cites `Vinnie Keane` `n=2` per version (`A` vs `B`, `boot-three-way.md:368-386`) and `n=1` uncompared observation of Kai Marston (`test-runs.md:50`). Keane is a Tier-1 baseball icon with deep page memory and card anchor; low-record Tier-3/4 citizens and the other 3 `citizen-voice-*` holders were not tested (as `test-runs.md:50` notes: `"Not tested: More citizens; a low-record citizen"`). Line `53` `"matches what runs today"` also sits beside line `54`'s three open defects (`G-EC53`, `G-EC54`, `G-EC55`).
  - **§2 Council / Mayor (`lines 69-70`):** Claims `"tested (27 runs, three people, both wakes)"` (repeated in `test-runs.md:55`: `"in 27 city-hall runs"`). Actual runs in the raw logs: Mayor Santana `1 × 3 = 3` (`boot-three-way.md:159-205`) + Leonard Tran `3 × 3 = 9` (`boot-three-way-run2.md:9-80`) + Janae Rivers `3 × 3 = 9` (`boot-three-way-run2.md:81-215`) = **`21` runs**, not `27`. Further, Santana ran `n=1` per arm; both test harnesses dropped `cron-civic-run.js`'s live retry and `readRequests` loop (`test-runs.md:127, 144`); and **zero** Sunday project-director runs (`37–46k` files noted in `AGENT_BOOT_TEMPLATES.md:93`) were tested (`test-runs.md:53, 189`).
  - **§3 Worker (`lines 78, 90-91`):** Only **1** worker (`Rafael Montez`), on **1** sheet (`Crime_Metrics`), answering **1** asker (`Rose Delgado`), ran (`3` answers in Run 3 + `2` answers in Run 4 = `5` total answers). In Run 4 (`1 of 2`), Montez misread the table; in Run 3 (`3 of 3`), he promised a non-existent extract; **zero** initiative directors, DA, EMS director, ME, or unagented offices were tested under the ask loop.
- **Inferred:** `input:` Lock §2 or §3 from `21` simplified single-call City Hall runs (counted as `27`) and `5` single-chief crime replies → `wrong output:` multi-turn `readRequests` loops, Sunday project-director prompts (`37–46k`), and non-police workers with sparse/heterogeneous tables remain unvalidated.

---

### Area 2 — Direction Smuggled In

#### 3. [HIGH] §3 and §4 template specifications and tested `C` prompts smuggle in output genre, decision rules, and procedural choreography

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:24, 37, 89, 181`
  - `docs/media/voices/tanya_cruz.md:9-28`, `docs/media/voices/kai_marston.md:9-25`
  - `.claude/agents/civic-project-stabilization-fund/IDENTITY.md:35`
  - `scripts/work-wake-packages.json:24-25, 176-177, 201-202`
  - `scripts/cron-work-wake.js:273-286`
  - `scripts/citizen-wake.js:229`, `lib/wakePerception.js:159-165`
  - `scripts/cron-desk-writer.js:1186-1311`
  - `output/engine-sheet/2026-11-13-boot-three-way.md:19-25, 173-175, 213, 297-366`, `…-run2.md:21-25, 93-97`
- **Verified:**
  - `AGENT_BOOT_TEMPLATES.md:37` states: `"a written part ... never states what to say, how to open or how to close"`. Yet:
    1. **§4 (`line 181`)** takes written background from `docs/media/voices/<name>.md`. Those files explicitly prescribe form, openings, closings, tense, and paragraph rhythm — e.g., `docs/media/voices/tanya_cruz.md:9-28` (`"Timestamp or breaking tag first"`, `'Uses "Mood in the room is [X]" as a one-line paragraph'`, `"Ends pieces with an observation that invites inference"`) and `docs/media/voices/kai_marston.md:9-25` (`"Present-tense immersion"`, `"Ends with the night still going — refuses to close the scene"`). Notice §4 (`line 188`) blames `"The harness and the package contract"` for saying `"how to open and close"`, ignoring that `cron-desk-writer.js:1186-1311` (`firebrandHeat`) ALSO hardcodes explicit format/opening rules (`"Open in a SPECIFIC in-world place"`, `"Short."`, `"Write SHORT and HOT"`) for ~18 named reporters, while `docs/media/TANYA_SIDELINE_BAG.md:16` adds `"Short paragraphs. Present when live."`.
    2. **§3 (`line 89`)** authorizes a written part holding `"how they decide"`. Every tested `C` boot encoded behavioral directives: Santana `"When you are blocked you escalate rather than wait"` (`boot-three-way.md:173`), Tran `"when you cross from where people expect you, you say what moved you"` (`boot-three-way-run2.md:23`), Rivers `"You go public first and ask permission later... when the Mayor moves too slowly you move without her"` (`boot-three-way-run2.md:95`), and Webb `"You write memos."` (`boot-three-way.md:213`), which forced `3 of 3` `MEMORANDUM` filings to invented council committees with fabricated wall-clock dates (`"November 12th"`, `"March 12, 2026"`, `"[Current Date]"`, `lines 297-366`). Note `.claude/agents/civic-project-stabilization-fund/IDENTITY.md:35` still carries `"- **You write memos.**"` inside `## Your Voice`, which `cron-work-wake.js:283-286` (`agentIdentityNotes`) scrapes verbatim!
    3. **`cron-work-wake` & `citizen-wake` today (`§1` & `§3` gaps):** `scripts/work-wake-packages.json` embeds task/talk bans into `roleLine`/`voiceNotes` (`"Your work is the disbursement queue"`, `"You comment on the record, not on politics"`, `"not speeches"`, `lines 24-25, 176-177, 201-202`), AND `ems-director` (`lines 158, 176`) drops Narang's first name (`name: "Narang"`) and omits her name from `roleLine` (`"You are the city's EMS director."`). In `scripts/citizen-wake.js:229`, the daily wake instructs output form/voice (`"In 4-5 sentences, think on the page the way you actually would — private, honest, first person. Don't narrate events like a story; just sit with it."`) — undocumented under `§1` `"Differs today"` (`line 54`), alongside `lib/wakePerception.js:164-165` (`"You are not a writer."` / `"You are an ordinary person, not a writer."`).
- **Inferred:** `input:` Implement §3/§4 written parts copied from `voices/*.md` (`docs/media/voices/*`) or `IDENTITY.md` `Decision signature`/`Voice` → `wrong output:` models keep executing stylistic and behavioral stage directions (`memorandum` output, escalation commands, formulaic openings/closings) rather than letting ledger state and assignment drive action.

#### 4. [MEDIUM] Ask-step harness omits Montez's age in Run 4, steers toward `"data"`, and leaks real-world `"East 14th corridor"`

- **Locations:**
  - `output/engine-sheet/2026-11-13-seat-asks-worker-dry-run.md:5, 17, 77`
  - `output/engine-sheet/2026-11-13-ask-dry-run.md:7, 9, 17, 19, 33, 41, 66, 91`
- **Verified:**
  - In Run 4 (`seat-asks-worker-dry-run.md:17, 77`), Montez's raw boot reads: `You are Rafael Montez, Police Chief, living in Piedmont Ave, Oakland.` — omitting age `45` present in Run 3 (`ask-dry-run.md:7`: `You are Rafael Montez, 45, Police Chief...`), breaking `AGENT_BOOT_TEMPLATES.md:30` (`name, age, role, hood`).
  - Run 3 (`ask-dry-run.md:9`) told Delgado: `"You can put one question to Police Chief Rafael Montez. He answers from the department's own data."`, nudging a metric-interrogation prompt rather than an open civic question; Delgado then invented `"East 14th corridor"` (`lines 17, 19`, real-world Oakland geography), and Montez echoed `"East 14th corridor"` / `"East 14th commercial corridor"` in **all 3** answers (`lines 33, 41, 66, 91`). Run 4 (`seat-asks-worker-dry-run.md:5`) mapped each worker 1:1 to a tabular source (`"the police chief: the crime sheet; the five project directors: their project record"`).
- **Inferred:** `input:` Carry Run 4's prototype ask wording and helper builder into `civic.47 W1` → `wrong output:` workers drop required sheet fields (`age`) and treat real-world Oakland street names introduced by a seat as confirmed civic geography.

---

### Area 3 — The Worker Template (§3)

#### 5. [CRITICAL] §3 specifies `loadOwnPageReadback` for `"statements, past answers, work docs"`, but production code explicitly excludes `'office-position'` docs from `loadOwnPageReadback`

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:83`
  - `lib/wakePerception.js:399-427`
  - `scripts/officeWall.js:74-98`
  - `scripts/cron-work-wake.js:150-154, 322, 357-397`
  - `scripts/work-wake-packages.json:10-276`
- **Verified:**
  - `AGENT_BOOT_TEMPLATES.md:83` defines Worker Part 2 as: `"Their page memory: statements, past answers, work docs | page readback (loadOwnPageReadback), not only the six statements loadPositionWall returns"`.
  - In `lib/wakePerception.js:399-412`, `loadOwnPageReadback` caps output at `PAGE_READBACK_N = 3` docs (each sliced to `PAGE_REFLECTION_CAP = 320` chars) AND **explicitly filters out** `'office-position'` documents (`line 410`):
    `.filter((r) => !['tension', 'show', 'office-position'].includes(String((r && r.metadata && r.metadata.type) || '')))`
    with the comment (`lines 408-409`): `"pipeline.110 — an office-position doc is a public statement of the office, not a private reflection: it reaches the holder as their record (officeWall / the work wake's office-week block), never under this label"`.
  - Meanwhile, `scripts/officeWall.js:74-94` (`loadPositionWall`) filters for `daypart === 'CIVIC' || /^stated:|^datawake:/i` (default `limit = 6`), and `cron-work-wake.js:357-397` (`loadOfficeWeek`) pulls up to `24` current-cycle `'office-position'` docs — **yet not one of the 8 active workers in `scripts/work-wake-packages.json` includes `'office-week'` in `dataNodes`!**
- **Inferred:** `input:` Build `civic.47 W1` against §3 line 83 expecting `loadOwnPageReadback` to supply a worker's statements, past answers, and work docs → `wrong output:` `'office-position'` statements and answers stored under `office-position` are deterministically stripped out at `lib/wakePerception.js:410`, leaving at most 3 `<=320`-char private reflections.

#### 6. [HIGH] Dual boots per person, disjoint move keys (`proj-*` vs `STAFF-*` vs `civic-project-*`), and zero worker promises break §3 identity and history loading

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:84-86, 93`
  - `scripts/cron-work-wake.js:273-328, 351`
  - `scripts/work-wake-packages.json:2, 8-127`
  - `scripts/civic-office-map.json:348-363, 610-666`
  - `output/cron-civic/moves/moves_c115.jsonl`
  - `output/mara-directives/promises.jsonl`
- **Verified:**
  - **Undocumented Thursday `autoPackages` dual-boot (`cron-work-wake.js:299-328`):** Every Thursday, `autoPackages` wakes EVERY `civic-office-map.json` entry with `agentDir != null` not present in `work-wake-packages.json` (`MAYOR-01`, `D1–D9`, `STAFF-DM-COMM` Okoro, AND `CHIEF-POLICE` Rafael Montez — even though `work-wake-packages.json:2` states `"Police chief POP-00136 is deliberately absent"`!) using `agentIdentityNotes(IDENTITY.md <= 700)` + `loadVoiceTexture` + `dispositionOf` + `office-week` + `civic-office` + `loadOwnPageReadback`. That directly contradicts §3 (`line 92`) and `boot-templates-test-runs.md:79`.
  - **One person, two conflicting boots:** Under the current split, `5` initiative directors and `Rafael Montez` wake on the `37–46k` `readPersonaDir` Sunday/weekday boot (`cron-civic-run.js:1735, 3730`), where `.claude/agents/civic-project-stabilization-fund/IDENTITY.md:8, 10` says Webb is age `52` in `Laurel` and `"You write memos."`, while Tuesday/Thursday wakes (or §3) boot Webb as age `42` in `Downtown` (`G-EC52`).
  - **Move history key mismatch (`moves_c115.jsonl`):** In `output/cron-civic/moves/moves_c115.jsonl`, weekday project `work` moves use `work-wake-packages.json` persona keys (`proj-stabilization-fund`, `proj-oari`, `proj-health-center`, `proj-transit-hub`, `proj-baylight`), whereas Sunday/map use `civic-project-*` / `civic-office-baylight-authority` and `Civic_Office_Ledger` uses `STAFF-*`. Querying `moves/` by `OfficeId` or `civic-office-map.json` `agentDir` misses all weekday director `work` moves; DA (`clarissa-dane`), EMS (`ems-director`), ME (`med-examiner`), and `21` non-agent offices have `0` rows in `moves_c115.jsonl`.
  - **Promises (`output/mara-directives/promises.jsonl`):** Holds `8` rows (`civic-office-mayor ×2, d1, d2, d3, d5, d8, d9`), **`0`** for any §3 worker.
- **Inferred:** `input:` Join worker history by `OfficeId` or `agentDir` when building `civic.47 W1` → `wrong output:` director `work` moves under `proj-*` are missed unless keyed by `POPID` or normalized alias table; switching Thursday `cron-work-wake.js` vs Sunday `cron-civic-run.js` leaves `POP-00136` and directors waking with incompatible identities until `autoPackages` is reconciled.

#### 7. [HIGH] A wrong worker comparison propagates unchecked into public statements and legislation, and ask-step replies burn orphan `answer` moves

- **Locations:**
  - `output/engine-sheet/2026-11-13-seat-asks-worker-dry-run.md:23, 44, 53, 61-65, 113-118`
  - `output/beats/Crime_Metrics.jsonl`
  - `output/engine-sheet/2026-11-13-ask-dry-run.md:33, 69-70, 91`
  - `docs/research/2026-11-13-boot-templates-test-runs.md:178`
- **Verified:**
  - In `seat-asks-worker-dry-run.md:23` (Run 4 Run 1), Montez is handed the full `Crime_Metrics` sheet and states: `**Response time:** 11.7 minutes — that's the slowest in the city this cycle.` Checked directly against `output/beats/Crime_Metrics.jsonl`: slowest 4 `ResponseTimeAvg` values are `Rockridge: 11.8`, `San Antonio: 11.7`, `Adams Point: 11.6`, `East Oakland: 11.3`. San Antonio (`11.7`) is **second-slowest**, not slowest.
  - Delgado trusted Montez's unverified ranking and repeated `"11.7 minutes, the slowest in the city"` in her public `Statement` (`line 44`) and her `propose` move JSON `purpose` (`line 53`: `"San Antonio Safety Load and Commercial Footing Response"`, `$12.5M`). Notice the harness's deterministic figure check (`"Figures not in what she was handed or told: []"`, `line 42`) passed because the `11.7` digit was in the sheet — it does **not** catch ordinal/comparative misreads (`"slowest"`).
  - In both asking runs (`lines 61-65` and `113-118`), Delgado spent `moves[1]` as `{"type": "answer", "confrontationId": "CONF-115-civic-office-council-d3", ...}` replying to Montez when C115 had no D3 confrontation (as `test-runs.md:178` notes, live `cron-civic-run.js` discards unmatched `answer` moves).
  - In Run 3 (`ask-dry-run.md:33, 69-70, 91`), Montez promised `3 of 3` times a `"CAD call origin by beat"` / `"median and 90th-percentile response times"` extract that has `0` backing rows in any tab (`Judicial_Ledger = 0`).
- **Inferred:** `input:` Forward natural-language worker prose into a seat's prompt without deterministic rank/max/min verification or a closed ask protocol (`ask` ≠ Mara `confrontationId`) → `wrong output:` false comparative claims pass numeric grounding checks (`ungroundedNumbers`) and enter legislation (`propose`), while seats burn `answer` moves on non-existent confrontations.

#### 8. [MEDIUM] §3 and §3.1 misstate what `cron-work-wake.js` feeds workers and cite non-existent `Hospital_Ledger` deaths and un-read `LifeHistory_Log` deaths

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:92, 116, 128-130`
  - `scripts/cron-work-wake.js:87-102, 133-140`
  - `scripts/buildCivicOfficeSlice.js:310-332, 1408, 1423-1429`
  - `output/beats/Hospital_Ledger.jsonl`, `output/beats/LifeHistory_Log.jsonl`, `output/beats/Judicial_Ledger.jsonl`
- **Verified:**
  - `AGENT_BOOT_TEMPLATES.md:92, 116` writes `"the chief's pack lacks ResponseTimeAvg and ClearanceRate (G-EC56)"` / `"part: no response time, clearance"`. That is true of `buildCivicOfficeSlice.js:318-325` (`loadTurfMetrics` emits only `PropertyCrimeIndex`, `ViolentCrimeIndex`, `IncidentCount` — and `buildPack` at `line 1408` sets `turf = []` for `kind === 'role'` unless `turn.pulse.hood` triggers `1426`!). However, `scripts/cron-work-wake.js:139` (`crime-metrics` node, fed to `Clarissa Dane` DA) **DOES include `ClearanceRate`** (`clearance ${r.ClearanceRate}`), while omitting `ResponseTimeAvg`, `PropertyCrimeIndex`, `PressureRatio`, `Trend`, `Hotspot`, and truncating to the top 5 by `ViolentCrimeIndex`.
  - `AGENT_BOOT_TEMPLATES.md:130` states: `"Jonas Patel, medical examiner | Hospital_Ledger deaths; deaths in LifeHistory_Log | 3"`. Verified directly:
    - `output/beats/Hospital_Ledger.jsonl` has `3` rows total, **all 3** `Outcome: "recovered"`, `StatusNow: "active"` (**`0` deaths**).
    - `output/beats/LifeHistory_Log.jsonl` has **`1`** row matching `/death/i` (`EventTag: "Death"`, `POP-00934`, `C114`), NOT `3`.
    - `scripts/cron-work-wake.js:87-102` (`hospital-deaths` node, Patel's sole death source) **only** reads `Hospital_Ledger` and **never** reads `LifeHistory_Log`!
- **Inferred:** `input:` Wake `Jonas Patel` under §3's current `hospital-deaths` node when a citizen dies in `LifeHistory_Log` without an `Outcome` death stamp in `Hospital_Ledger` → `wrong output:` `cron-work-wake.js:100` tells the Medical Examiner `'No deaths or transitions on the books this cycle.'`

---

### Area 4 — The Roster (§3.1 vs `Civic_Office_Ledger` & `scripts/civic-office-map.json`)

#### 9. [HIGH] Roster joins break between `STAFF-*` and `PROJ-*`, `RoleType` mismatches contradict internally (`2` vs `6`+), `Okoro` shares `INIT-001` with `Webb`, and `Care_Justice_Census` (`77.8%` hospital) is misfiled exclusively to justice

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:72, 97, 103-110, 122, 128-143, 237`
  - `output/beats/Civic_Office_Ledger.jsonl`
  - `scripts/civic-office-map.json:20-670`
  - `output/simulation_ledger_snapshot.jsonl`
  - `output/beats/Care_Justice_Census.jsonl`, `output/beats/City_Treasury.jsonl`, `output/beats/Cultural_Ledger.jsonl`
  - `scripts/buildCivicDomainSlice.js:934-945`
- **Verified:**
  - **`STAFF-*` vs `PROJ-*` join break:** `output/beats/Civic_Office_Ledger.jsonl` holds `39` non-blank rows (`999` total lines), using `OfficeId` `STAFF-OARI`, `STAFF-HEALTHCTR`, `STAFF-STABFUND`, `STAFF-TRANSITHUB` for the four project directors. `scripts/civic-office-map.json` holds `35` `"offices"` + `4` `"projects"` (`39` total), using `projectId` `PROJ-STABFUND`, `PROJ-OARI`, `PROJ-HEALTHCTR`, `PROJ-TRANSITHUB` (`lines 611-665`). `AGENT_BOOT_TEMPLATES.md:97` claims `civic-office-map.json` `"holds the same 39"` without flagging that `4` primary IDs do not match (`scripts/work-wake-packages.json:8, 108` even mixes `PROJ-STABFUND` with `STAFF-BAYLIGHT`).
  - **Self-contradictory `RoleType` mismatch count + missed Okoro diff:** `AGENT_BOOT_TEMPLATES.md:72` says `"two holders' RoleType disagrees with their office"`, `lines 105-110` list `6` holders (`Marcus Osei`, `Ramon Vega`, `Denise Carter`, `Janae Rivers`, `Elliott Crane`, `Rose Delgado`), and `line 237` says `"six"`. Checking all `39` against `output/simulation_ledger_snapshot.jsonl`: all `39` are `Status: "Active"`, `CIV (y/n): "yes"`, `ClockMode: "CIVIC"`, and `POP-00037` (`Brenda Okoro`) also differs (`Civic_Office_Ledger.Title = "Deputy Mayor (Community)"` vs `RoleType = "Deputy Mayor (Community Affairs)"`), besides casing/title variants on `MAYOR-01`, `DA-01`, `PD-01`, `STAFF-BAYLIGHT`, `CHIEF-FIRE`, `DCOP-*`, `IAD-LEAD`, `EMS-DIR`, `MED-EXAM`, `EMERG-DIR`, `ADA-*`, `DPD-DEPUTY`, `COURT-LIAISON`, `CPRB-CHAIR`, `REENTRY-DIR`.
  - **Duplicate ownership (`Okoro`) & missing `Community_Programs`:** `scripts/civic-office-map.json:260-275` (`STAFF-DM-COMM`, Brenda Okoro) declares `Initiative_Tracker (stabilization-fund)` (`INIT-001`), so §3.1 (`line 122`) classifies her `"Fits now"` `"shared with Webb"`, giving her no distinct tab while filing `Community_Programs` (`33` rows) under `"Tabs with no office declared"` (`line 143`).
  - **`Care_Justice_Census` (`1,296` rows) misfiled:** §3.1 (`line 139`) assigns `Care_Justice_Census (1,296)` strictly to the `6` unagented `"justice"` positions (`PD-01`, `DPD-DEPUTY`, `COURT-LIAISON`, `REENTRY-DIR`, `ADA-MAJOR`, `ADA-SAFETY`), omitting `District Attorney` (`Clarissa Dane`, listed as `"0"` rows at `line 128`) and omitting `EMS Director` (`Priya Narang`, `line 129`) — even though `output/beats/Care_Justice_Census.jsonl` contains **`1,008` `System: "hospital"` rows (`77.8%`)** vs only **`288` `System: "judicial"` rows (`22.2%`)**.
  - **Omitted treasury / culture links:** `buildCivicDomainSlice.js:934-945` ALREADY joins `City_Treasury` (`19` rows) + `Judicial_Ledger` (`0` rows) for civic reporting, and `Cultural_Ledger` (`51` rows) / `Neighborhood_Demographics` (`22` rows) exist on disk without worker attribution in §3.1 (`line 143`).
- **Inferred:** `input:` Join `Civic_Office_Ledger` to `civic-office-map.json` on ID, or route `Care_Justice_Census` solely to justice seats → `wrong output:` all 4 project directors drop out of an ID join, `Okoro` duplicates `Webb` on `INIT-001` instead of holding community/neighborhood tabs, and `EMS` / `DA` remain `"thin"` while justice workers receive 78% hospital census rows.

---

### Area 5 — Chaos-Car Routing (§3.2 vs `buildCivicOfficeSlice.js`, `cron-work-wake.js`, slice builders, `utilities/chaosCarsConfig.js`)

#### 10. [HIGH] §3.2 `"Where an event goes today"` omits the primary markdown emitter (`buildWorldSummary.js`), omits `buildHealthSlice.js`, overstates `buildCivicDomainSlice.js`, and misses `kind === 'role'` & `known.length >= 10` cutoffs

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:151-157`
  - `scripts/buildWorldSummary.js:528-553`
  - `scripts/buildHealthSlice.js:6-8, 130-137`
  - `scripts/buildCivicDomainSlice.js:209-211`
  - `scripts/buildCivicOfficeSlice.js:90-115, 666-670, 1408-1429`
  - `scripts/buildTransitSlice.js:125, 199`
  - `scripts/buildJaxSlice.js:123-133`
- **Verified:**
  - `buildWorldSummary.js:528-553` (`emitChaosCars`) is the reader of `Chaos_Cars` that produces `## Chaos Events` in `world_summary_c{N}.md` (every slice builder reads that markdown section). It is missing from §3.2 `lines 151-155`.
  - Verified C113–C115 `## Chaos Events` rows in `output/world_summary_c113..115.md`: C113 = `13` (`5` neighborhood, `4` business, `4` citizen), C114 = `12` (`7` neighborhood, `5` business, `0` citizen), C115 = `5` (`2` neighborhood, `3` business, `0` citizen) → `30` total (`14` hood, `12` biz, `4` citizen).
  - `buildHealthSlice.js:130-137` calls `loadHealthEntries()` (imported from `buildCivicDomainSlice.js:23`) — §3.2 `line 154` omits Health slice from the reporter readers.
  - `buildCivicDomainSlice.js:209-211` checks ONLY `/^Hospitalized$/i.test(cells[4] || '')`, ignoring non-`Hospitalized` chaos medical events (e.g., `ambulance` `medical_emergency` / `workplace_accident` in C113/C114, `bart_train` `medical_hold_on_board`).
  - `buildCivicOfficeSlice.js:1410` sets `chaos = []` for `kind === 'role'` (`Mayor`, `DA`, `Police Chief`), populating `chaos` only if `turn.pulse.hood` triggers the secondary `loadCycleEvents(root, cycle, [turn.pulse.hood])` block at `lines 1423-1429`; then `pickTurn` (`lines 666-668`) filters by `pickHood` and **stops adding once `known.length >= 10`**. Meanwhile `buildTransitSlice.js:125, 199` DOES parse non-hood `bart_train` and `citizen` `POP-` chaos rows directly.
- **Inferred:** `input:` Rely on §3.2 `line 153-154` assuming every neighborhood event reaches Mayor/council or every health chaos event reaches reporters → `wrong output:` citywide seats skip `chaos` whenever no single-hood pulse wins `pickTurn` or when earlier facts reach `10` items, and ambulance/transit medical calls without `Metric === 'Hospitalized'` never reach health or civic-domain slices.

#### 11. [HIGH] Proposed 12-vehicle kind-to-worker routing table disagrees with `utilities/chaosCarsConfig.js` scopes, targets, and downstream engine effects on 7 of 12 vehicles

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:159-173`
  - `utilities/chaosCarsConfig.js:220-373`
- **Verified against `utilities/chaosCarsConfig.js`:**
  1. `cargo_ship` (`Container ship`, `lines 352-372`): §3.2 `line 171` routes it solely to `"Baylight director (the harbor)"`. Code `runChaosShip_` + `CHAOS_SHIP_PORT_SECTORS` applies **citywide episodic business `Growth_Rate` shocks** (`peakPp` `-15` to `+4` pp across Port, Logistics, Retail, Food, Grocery, Wholesale, Manufacturing, Construction, and echo share across every remaining business citywide) — primarily hitting `Business_Ledger` / `Employment_Roster` (`Deputy Mayor, Econ Dev` + `City Manager`), not just Baylight.
  2. `building_inspector` (`lines 234-243`): `scopes: ['business']` only (modifies `bizEvent` / `Growth_Rate`). §3.2 `line 167` routes to `City Planning Director or City Manager`, omitting `Deputy Mayor (Econ Dev)` (assigned `Business_Ledger` at `line 137`).
  3. `mail_truck` (`lines 260-280`): §3.2 `line 169` reduces it to `"a lawsuit or a contract landing on a business"` → `Deputy Mayor (Econ Dev)`. Config defines `scopes: ['citizen', 'business']` including `citizen` events (`vital_document_delivered`, `lost_package`, `mail_theft_reported`) and `business` events (`overdue_payment_arrives`, `insurance_premium_hike`, `tax_audit_notice`).
  4. `street_sweeper` (`lines 295-305`): `scopes: ['neighborhood', 'citizen']`; `parking_ticket` writes citizen `Setback` and `City_Treasury` `REVENUE TICKETS`, and neighborhood sweeps move `RetailVitality`/`Sentiment`. §3.2 `line 168` routes only to `City Manager`, omitting District seats / Econ Dev.
  5. `garbage_truck` (`lines 246-257`) & `pge_truck` (`Estuary Power & Gas truck`, `lines 308-319`): both hit `scopes: ['neighborhood', 'business']` (`bizEvent` + `Sentiment`/`RetailVitality`). §3.2 `line 168` routes only to `City Manager`, omitting `Deputy Mayor (Econ Dev)` and District seats.
  6. `bart_train` (`lines 331-343`): §3.2 `line 170` says `"no office holds transit"`, ignoring `scopes: ['neighborhood', 'citizen']`, `hoodFilter: 'transit-served'` (`District` seats), `delay` rolled into `previousCycleState.chaosTransit` affecting `Transit_Metrics` (which `Transit Hub Planning Lead` `INIT-003` or `City Manager` borders on).
- **Inferred:** `input:` Build §3.2's proposed router verbatim → `wrong output:` `cargo_ship` economic contractions hit only Baylight instead of Econ Dev/City Manager, `building_inspector` business closures miss Econ Dev, and `street_sweeper` `parking_ticket` revenue (`City_Treasury`) + citizen `mail_truck` / `bart_train` hits remain unrouted.

---

### Area 6 — Retirement (§7 Grep `scripts/`, `lib/`, `dashboard/`, and `.claude/skills/`)

#### 12. [HIGH] §7 retirement checklist misses 8 active scripts, multiple active `.claude/skills/*` entrypoints, and `cron-desk-writer.js` `VOICE_DIR`/`SKILL_PATH` loading

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:188, 207-209`
  - `scripts/refreshVoiceDispositionCache.js:5, 34-49`
  - `scripts/cron-civic-eval.js:75-87`
  - `scripts/modelFitRun.js:54-69, 139`
  - `scripts/freezeModelFitInputs.js:32, 88-94`
  - `scripts/runEngineAgent.js:31, 61-68`
  - `scripts/djDirect.js:437, 705`
  - `scripts/mdStalenessDetector.js:245-247, 320-322`
  - `scripts/auditCanonDrift.js:175`
  - `scripts/buildPSlayerSlice.js:612`
  - `scripts/cron-desk-writer.js:286-287, 1127, 1347`
  - `.claude/skills/{make-citizen-voice,interview,post-publish,write-edition,desk-slice,doc-audit,context-budget}/SKILL.md`
- **Verified (via `grep` across `scripts/`, `lib/`, `dashboard/`, `.claude/skills/` and direct reads):**
  - Missing from `AGENT_BOOT_TEMPLATES.md:209` (`"Loaders to check before a move"`):
    1. `scripts/refreshVoiceDispositionCache.js:34-49` (live `run-cycle` Step 5.7 reads `.claude/agents/citizen-voice-*/IDENTITY.md`; throws at `line 58` if empty).
    2. `scripts/cron-civic-eval.js:75-87` (reads `.claude/agents/<OFFICE>` or `civic-office-<OFFICE>` `IDENTITY/LENS/RULES.md`).
    3. `scripts/modelFitRun.js:54-69, 139` (replicated `readPersonaDir('civic-office-council-d' + n)`).
    4. `scripts/freezeModelFitInputs.js:32, 88-94` (reads `.claude/agents/citizen-voice-elias-varek/{IDENTITY,LENS,RULES}.md`).
    5. `scripts/runEngineAgent.js:31, 61-68` (`--agent <name>` reads `.claude/agents/<name>/{IDENTITY,LENS,RULES,SKILL}.md`).
    6. `scripts/djDirect.js:437, 705` (embeds `.claude/agents/dj-hartley/LENS.md` instruction in visual prompts).
    7. `scripts/mdStalenessDetector.js:245-247, 320-322` (auto-discovery stability pattern for `.claude/agents/*/IDENTITY|LENS|RULES|SKILL.md` and `docs/media/voices/` path rules).
    8. `scripts/buildPSlayerSlice.js:612` (`docs/media/voices/p_slayer.md` reference) + `scripts/auditCanonDrift.js:175` (persona source note).
    9. `scripts/cron-desk-writer.js:286-287, 1127, 1347`: line `209` names only `AGENT_DIR`, overlooking `VOICE_DIR` and `SKILL_PATH` (`IDENTITY.md` vs desk `SKILL.md` switch). Also `line 188` undercounts solo reporters (`"about 20 reporter folders"` — verified on disk: **25** solo reporter folders + `dj-hartley` + `freelance-firebrand` + `6` `-desk` folders inside `66` total `.claude/agents/` directories).
    10. Active `.claude/skills/*` paths referencing `.claude/agents/*`: `make-citizen-voice/SKILL.md:37, 59`, `interview/SKILL.md:62-63, 350`, `post-publish/SKILL.md:171` (Step 2e scans `.claude/agents/citizen-voice-*/IDENTITY.md` for `--type interview`!), `write-edition/SKILL.md:119, 155` (`.claude/agents/REPORTER_DESK_INDEX.md` and `civic-office-*/` grep fallback), `desk-slice/SKILL.md:66`, `doc-audit/SKILL.md:57, 75, 108`, `context-budget/SKILL.md:3, 40`.
- **Inferred:** `input:` Retire `.claude/agents/*` or `docs/media/voices/*` after only checking the scripts named in `line 209` → `wrong output:` `run-cycle` Step 5.7 (`refreshVoiceDispositionCache.js`), `/post-publish` Step 2e, `cron-civic-eval.js`, `modelFitRun.js`, `djDirect.js`, and `mdStalenessDetector.js` fail or silently drift.

---

### Area 7 — Gates (§5)

#### 13. [HIGH] §5 misidentifies deterministic `finalArbiter.js` as a prompt-loaded gate, omits live LLM gate `cron-civic-gate.js`, and proposes an insufficient verdict-only A/B test shape

- **Locations:**
  - `docs/reference/AGENT_BOOT_TEMPLATES.md:191-197`
  - `scripts/finalArbiter.js:15-17`
  - `scripts/cron-civic-gate.js:354-360`
  - `scripts/cron-rhea-gate.js:116, 318-357, 463-485, 736-758, 786-795`
  - `scripts/cron-civic-run.js:2526-2564`
  - `.claude/agents/city-clerk/IDENTITY.md:1-14`, `.claude/agents/city-clerk/RULES.md:1-65`, `.claude/agents/final-arbiter/RULES.md:95-115`
- **Verified:**
  - **`finalArbiter.js` is not a prompt gate:** `scripts/finalArbiter.js:15-17` explicitly states: `"The computation is deterministic (see .claude/agents/final-arbiter/RULES.md §Computation). No LLM call is required for the base judgment."`. `.claude/agents/final-arbiter/` (`16,409` bytes) is never loaded by `finalArbiter.js`.
  - **`cron-civic-gate.js` omitted:** `scripts/cron-civic-gate.js:354-356` IS a live LLM gate (`sanity-read`) and ALREADY runs rules-only without any `.claude/agents/` folder (`sys = 'You are a neutral records auditor for a city government...'`), contradicting §5's implicit premise that all gates load persona folders.
  - **`Rhea` vs `City Clerk` test-shape defects (`line 197`):**
    1. `cron-rhea-gate.js` (`30,028` chars `IDENTITY+RULES` measured) combines: (a) an LLM call (`api` mode lines `466-467, 737-739` OR `claude -p` tool mode lines `116, 747-758`), (b) an independent rules-only **contract judge** (`buildContractPrompt`, lines `318-340`, which loads ZERO Rhea persona), AND (c) **deterministic overrides** (`detBlockers`: `intakeBlockers` + `scanStructuralJunk` + fail-closed `high`-severity flag scan at `lines 786-795`). Comparing only `"verdicts"` (`pass/fail`) conflates LLM output with `detBlockers`, ignores `flags[]` precision/recall, false-positive rate, `review.canonIntegrity` / `review.texture`, and fails to test both backends (`api` vs `claude -p`).
    2. `cron-civic-run.js:2526-2564` loads `city-clerk` (`15,535` chars `IDENTITY+RULES` measured — full of legacy filesystem audit paths `output/city-civic-database/clerk/` and `Read`/`Bash` self-checks in `RULES.md:5-52`), while ALREADY putting the rules in `clerkUser` (`lines 2538-2557`). §5's test shape (`"held and passed drafts"`) does not even match Clerk's input (`arrived` voice JSONs + `clerkCandidates` + `missingVoices`).
- **Inferred:** `input:` Run `"the same held and passed drafts through today's files and through the rules alone; compare verdicts"` → `wrong output:` deterministic blockers (`detBlockers`) mask LLM sensitivity shifts on Rhea, `city-clerk` has no draft corpus matching that test harness, and `final-arbiter` requires no boot template at all.

---

## Pre-Approval Checklist (What Must Be Settled Before Lifting HOLD)

1. **Fix §3 Worker contract:** Reconcile `loadOwnPageReadback` (`'office-position'` exclusion) vs `loadOfficeWeek` / `loadPositionWall`, unify `POPID` / `STAFF-*` / `PROJ-*` / `proj-*` / `agentDir` move lookup, resolve Thursday `autoPackages` (`cron-work-wake.js`) vs weekday/Sunday `readPersonaDir`, add deterministic rank/comparator checks for asks, remove `CONF-*` hijacking, and route `LifeHistory_Log` deaths + `Care_Justice_Census` (`hospital` + `judicial`) to matching health/justice desks.
2. **Fix §4 Reporter evidence:** Rerun Kai/Tanya without `firebrandHeat` (`TANYA STANCE` / `KAI STANCE`) and `TANYA_SIDELINE_BAG` active in the `light` prompt so the `~500`-char written block is genuinely isolated; correct word-count ranges (prose vs `**INTAKE**`) and remove false `3 of 3` claims (`one-line paragraphs`, `last names`).
3. **Strip smuggled direction from proposed templates & crons:** Remove genre/opening/closing prescriptions from §4 `voices/*.md` imports and `"You write memos."` / procedural rules from §3 `"how they decide"` + `cron-work-wake` `IDENTITY.md` scraping; fix `ems-director` `name`/`roleLine` and Montez's missing age in ask boots.
4. **Fix §3.1 & §3.2:** Document `STAFF-*` ↔ `PROJ-*`, fix `Okoro` (`INIT-001` vs `Community_Programs`), fix `Hospital_Ledger` `0` deaths (`vs 3`), reconcile `RoleType` mismatch count (`2` vs `6`), and update §3.2 for `buildWorldSummary.js`, `buildHealthSlice.js`, `kind === 'role'`, and `cargo_ship`/`building_inspector`/`mail_truck`/`street_sweeper`/`garbage_truck`/`pge_truck`/`bart_train`.
5. **Fix §5 & §7:** Drop `finalArbiter.js` from LLM gate testing, include `cron-civic-gate.js`, measure `flags[]` + pre-override LLM output separately from `detBlockers` for Rhea and structured Sunday write-sets for `city-clerk`, and add the missing 8 scripts + `.claude/skills/*` dependencies to §7.

---

## Attached Engine Wiring Card Summary

Ran pre-approved Haiku wiring card: `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: Chaos_Cars, Civic_Office_Ledger, Hospital_Ledger, Judicial_Ledger, Crime_Metrics, City_Treasury"` → saved to `output/agent_engine-wiring_2026-11-14T06-07-37.md` (**128 / 128** engine phase files opened, 100%).

| Tab | Writer / Definition | Phase Position & Write Path | Mapped Engine Readers & Notes |
|---|---|---|---|
| `Chaos_Cars` | `phase10-persistence/saveChaosCars.js:33` `writeChaosCarsRow_` | Phase10-CyclePacket (`godWorldEngine2.js:839, 2549`), BEFORE ExecuteIntents; `queueEnsureTabIntent_` (`:35`), `queueAppendIntent_` (`:52`) | Self-read only in engine (`writeChaosCarsRow_`); `12` cols ending in `CycleStamp` |
| `Crime_Metrics` | `utilities/ensureCrimeMetrics.js:306, 353` `updateCrimeMetrics_`, `batchUpdateCrimeMetrics_` | Phase3-Crime (`godWorldEngine2.js:596, 2316`); dual path: `queueRangeIntent_` / `queueAppendIntent_` / `queueBatchAppendIntent_` or direct `setValues` / `appendRow` | `ensureCrimeMetrics.js` (`batchUpdateCrimeMetrics_`, `getCrimeMetrics_`, `updateCrimeMetrics_`); `14` cols incl. `ResponseTimeAvg`, `ClearanceRate`, `Trend`, `Hotspot`, `PressureRatio` |
| `Civic_Office_Ledger` | `phase05-citizens/updateCivicApprovalRatings.js:375`; `phase05-citizens/generationalWealthEngine.js` `updateHeritage_` | Phase5-ApprovalRatings (`godWorldEngine2.js:638, 2358`, `queueCellIntent_` `:1045, :1053`); Phase5-GenerationalWealth (direct full-table own-tab rewrite) | `engine94SheetContract_`, `applyBusinessDynamics`, `civicInitiativeEngine`, `generateCivicModeEvents`, `runCivicRoleEngine`, `updateCivicLedgerFactions`, `buildCyclePacket`, `cycleRollback`, `exportCitizensSnapshot`, `setupCivicLedgerColumns` |
| `Hospital_Ledger` | `phase10-persistence/buildCyclePacket.js:856` `persistHospitalLedger_` | Phase10-CyclePacket (`godWorldEngine2.js:839, 2549`), direct `persistWithRetry_` / `setValues` (`:949`) & `appendRowWithRetry_` (`:961`) | `generationalEventsEngine.js::hospitalPriorStatusForDischarge_`, `persistCareJusticeCensus_`, `persistHospitalLedger_` (`16` cols A–U; engine map lists `writers: []` because `buildCyclePacket` is Phase10 persistence) |
| `Judicial_Ledger` | `phase10-persistence/buildCyclePacket.js:1258` `persistJudicialLedger_` | Phase10-CyclePacket (`godWorldEngine2.js:839, 2549`), direct `appendRowWithRetry_` (`:1307`) | **Missing from `ENGINE_STUB_REVERSE.json` (map 2026-11-08)**; grep-verified engine readers: `phase05-citizens/generateCitizensEvents.js:553`, `phase05-citizens/judicialLifecycle.js:290` (`21` cols) |
| `City_Treasury` | `phase02-world-state/applyInitiativeImplementationEffects.js:227, 1139` (`postTreasuryRevenue_`) | Phase2-InitiativeEffects (`godWorldEngine2.js:576, 2296`, `queueAppendIntent_` `:826, :1153`), plus Phase4 `writeCitizenEvent_` & Phase5 `runJudicialLifecycle_` | `applyInitiativeImplementationEffects_`, `postTreasuryRevenue_` (`7` cols: `Cycle`, `Entry`, `Amount`, `Counterparty`, `BalanceAfter`, `Note`, optional `SourceEvent`) |
