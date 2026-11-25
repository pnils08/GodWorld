# Adversarial Review — Anthony Raines Step 4 (Live Switch + Test Day)

- **Reviewer:** Antigravity (`agy`)
- **Date:** 2026-11-25
- **Brief:** `docs/for-claude-review/2026-11-25-rb-brief-agy-anthony-step4-switch.md`
- **Targets inspected:**
  - Switch commits & config: `scripts/newsroom-wake-packages.json` (`ANTHONY-LEP2-4`), `scripts/cron-desk-run.js`, `scripts/cron-desk-writer.js`, `scripts/newsroom-fanout.js`, `scripts/buildAnthonyRecord.js`, `scripts/beatSliceKit.js`, `scripts/livedExperiencePacketV2.js`, `scripts/reporterIdentity.js`, `scripts/citizenVoice.js`, `lib/citizenPage.js`, `lib/articleIntake.js`, `scripts/cron-rhea-gate.js`, `scripts/canon-name-check.js`, `scripts/gridiron.js`
  - Test day (`c117`): `output/test-shell/20261125-001635-anthony-raines-day-today-1064834/` (`angle.log`, `report.log`, `write.log`, `sports_c117_anthony-raines_packet-v2_anthropic-claude-sonnet-5-5.state.json`, `samples/*.sample.{md,json}`, `sports_c117_packet-v2_anthony-raines.tooltrace.json`, `sports_c117_anthony-raines_packet-v2_angle.json`) and `output/research-build/2026-11-24-anthony/c117-test-thursday.md`
- **Verdict:** **SHIP-WITH-FIXES**

The core Step 4 switch cleanly replaces `buildAnthonySlice` with `buildAnthonyRecord` across `cron-desk-run.js` and `newsroom-fanout.js`, puts `anthony-raines` on both Monday (`WEEK_GRID[1]`) and Thursday (`WEEK_GRID[4]`), preserves Monday's staged headline inside C117's live feed record, and handles `-HHMM` staged filenames cleanly. However, one high severity INTAKE bug on `ask_worker` quotes, two live-path prompt leaks (`voices/anthony.md` essence + `FACTS_TAIL`/`limits.rule`), and the fact that the test day ran `--no-gate` (never touching Rhea on `"At 27"` vs ledger `BirthYear: 2016` or unpromoted `dossier_read` ratings) should be fixed before relying on clean Thursday canon intake.

---

## Findings

### 1. [HIGH] `renderPacketIntake` demotes partial `ask_worker` quotes to `mentioned` and dumps the full 2,071-char reply into `CLAIM:`

- **Where:** `scripts/cron-desk-writer.js:500-515`, `output/research-build/2026-11-24-anthony/c117-test-thursday.md:15, 28-29`
- **Mechanism (`input -> wrong output`):**
  1. At `write.log:20`, Dawson Nguyen's `ask_worker(GRIDIRON)` reply enters `state.manifest.approvedQuotes` (`exposure.sources`) as a 2,071-character Markdown block starting with `"**Vladimir Gonzalez — seasons before 2041** (from my hitter record):"`.
  2. In `c117-test-thursday.md:15`, Anthony quotes Dawson accurately from near the end of that reply (`"priced on the assumption that 2041 is the new level, not the outlier"`).
  3. `renderPacketIntake` checks `body.includes(String(meta.quote).slice(0, Math.min(48, meta.quote.length)))` (`scripts/cron-desk-writer.js:502-503`). Because the quoted substring is not the first 48 characters of Dawson's 2,071-char Markdown reply, `renderPacketIntake` flips Dawson's role from `quoted-source` to **`mentioned`** (`c117-test-thursday.md:28`: `NAMES: Dawson Nguyen | mentioned`).
  4. Immediately after, `scripts/cron-desk-writer.js:512-514` writes the *entire* `quoted.quote` verbatim onto a single `CLAIM:` line with `|` replaced by `—`, producing a 2,071-character Markdown table/bullet dump in `c117-test-thursday.md:29` (`CLAIM: **Vladimir Gonzalez — seasons before 2041** ... | ask_worker Dawson Nguyen`).
- **Observed check:** Verified via `lib/articleIntake.parse(draft)` (`found: true`, `errors: []`, `names: [{name: "Dawson Nguyen", role: "mentioned"}]`, `claims[0].claim.length === 2071`). Syntactically valid to `articleIntake`, semantically wrong for Saturday citizen-usage provenance (`mentioned` instead of `quoted-source`) and noisy in `CLAIM` / `.staged.json`.

---

### 2. [MEDIUM] Old voice file (`docs/media/voices/anthony.md`) still prepended at W1 and W3

- **Where:** `scripts/newsroom-wake-packages.json:293-347`, `scripts/reporterIdentity.js:25-36, 80-90`, `scripts/cron-desk-run.js:1697-1699, 2324, 3333`, `scripts/cron-desk-writer.js:1395-1401`, `output/test-shell/20261125-001635-anthony-raines-day-today-1064834/write.log:14`
- **Mechanism (`input -> wrong output`):**
  - `anthony-raines` in `newsroom-wake-packages.json:343-346` sets `seatFile`, `seatMemory`, `seatDossier`, `seatReasoning`, but **omits `"seatEssence": false`**.
  - Consequently both `seatMorningPlan` (`cron-desk-run.js:1697-1699`) at W1 and `cron-desk-writer.js:1395-1401` at W3 pass `agentDir` to `reporterIdentity`, which follows `.claude/agents/anthony-raines/`'s voice ref (`docs/media/voices/anthony.md`) and logs `identity: sheetChars=323 essenceChars=247 voice=anthony.md` (`write.log:14`).
  - That injects `docs/media/voices/anthony.md:7` (`"A former ballplayer who changed positions."` + `"Treats every column like a film study."`) ahead of `.claude/agents/anthony-raines/SEAT.md:1` (`"A Berkeley kid who played on a full scholarship for the Berkeley Owls and reached AA in the A's system"`), which conflicts with the canonical bio in `SEAT.md`.

---

### 3. [MEDIUM] Old "paint / unnamed voices are yours" instructions still reach him on the live Thursday path

- **Where:** `scripts/beatSliceKit.js:22-25, 222`, `scripts/livedExperiencePacketV2.js:382, 394, 409-416`, `output/test-shell/20261125-001635-anthony-raines-day-today-1064834/sports_c117_anthony-raines_packet-v2_anthropic-claude-sonnet-5-5.state.json`
- **Mechanism (`input -> wrong output`):**
  1. **Live-only leak (`FACTS_TAIL` + `roomIsYours`):** `scripts/buildAnthonyRecord.js:26-27` passes `approach: ''` and `roomIsYours: ''`, but `scripts/beatSliceKit.js:222` unconditionally concatenates `seat.approach + ' ' + FACTS_TAIL`, where `FACTS_TAIL` (`:24-25`) reads `"Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint."` Only `test-shell`'s `--free` flag sets `args.bare: true`, which strips `packet.task.approach = null` and `creativeBrief.roomIsYours` (`scripts/livedExperiencePacketV2.js:409-415`). On **live Thursday** (`!FREE_ANGLE`), `args.bare` is `false`, so `FACTS_TAIL` remains inside `inputPacket.task.approach` / `writePacket.task.approach`.
  2. **Both live and test-shell leak (`limits.rule`):** Verified verbatim in `sports_c117_..._state.json` (`limits.rule`, matching `livedExperiencePacketV2.js:382, 394`): W3 injects `"Everything else — the scene, the street, the weather in the room, unnamed people and what they say... is yours to invent... No named ledger citizen spoke for this piece (manifest.approvedQuotes is empty): put no words in a named citizen's mouth. Unnamed voices are yours."` Meanwhile `.claude/agents/anthony-raines/SEAT.md:3` forbids citizen quotes/scene padding (`"You do not interview citizens; what Gridiron's analysts tell you, you may quote"`).
- **What IS cleanly cut off (verified across live fanout + W1/W3):** `BEAT_BUILDERS['anthony-raines']` (`'buildAnthonyRecord'`) properly gates off `ANTHONY STANCE`, `ANTHONY ANALYTIC SLICE`, `loadAnthonySlice`, `buildAnthonySlice`, `loadAnthonyAnalyticsBag()`, `priorArcSystem`, `cascadeRateRule`, and `RECORDS_PIECE` kickoff across `scripts/newsroom-fanout.js:651, 736, 790`, `scripts/cron-desk-run.js:824, 1832, 2052`, and `scripts/cron-desk-writer.js:1401, 1502`. Note also `cron-desk-run.js:2281` skips the W1 `rewardLoop` grade read only when `FREE_ANGLE` is set; live Thursday (`!FREE_ANGLE`) reads Monday's grade into W1 as intended by `rewardLoop: true`.

---

### 4. [MEDIUM] `c117-test-thursday.md` vs Gate: Rhea never ran (`--no-gate`), while ledger age conflict (`BirthYear: 2016` vs `age 27`), unpromoted `dossier_read` ratings, and `UNAPPROVED_NUMBER` sit in the live path

- **Where:** `scripts/livedExperiencePacketV2.js:420-422, 658-765, 809-813, 881`, `scripts/cron-rhea-gate.js:520-535`, `scripts/gridiron.js:290-298`, `output/simulation_ledger_snapshot.jsonl` (`POP-00598`), `output/gridiron/cards.json`, `output/world_summary_c117.md:224-225`, `output/test-shell/.../write.log:19, 21, 45`, `output/research-build/2026-11-24-anthony/c117-test-thursday.md:11-12, 15, 17, 19`
- **Mechanism (`input -> wrong output`):**
  1. **`auditArticle` leading-dot decimal bug (`write.log:21`):** `numericTokens` (`livedExperiencePacketV2.js:421`) uses `/[+-]?\d+(?:\.\d+)?.../` starting on `\d+`. Writing OPS without a leading zero (`.762`, `.874` at `c117-test-thursday.md:11-12`) extracts `762` and `874`, whereas Dawson's `approvedQuotes` holds `0.762` and `0.874` (`cards.json`), generating false-positive `UNAPPROVED_NUMBER=762,874`. Meanwhile `2.87` (`8.6 / 3 = 2.866...`, `c117-test-thursday.md:15`) is genuine unapproved arithmetic (`Dawson` gave `2.9/yr`). Conversely, `"99"` (`clutch rating`), `"84"` (`arm`), and `"7"` (`+7 CON R`, `+7 POW R`) escaped `auditArticle` only by cross-player token collision with Rosales (`84 mph`, `C117`, `7th World Series`) and Horn (`99 overall`), while `5.06` / `8.30` matched Dawson's quote. Note these are non-blocking `observations` deferred to Rhea (`livedExperiencePacketV2.js:881`).
  2. **Unpromoted `dossier_read` attributes invisible to Rhea:** `selectUsedToolLines` (`write.log:19`) promoted only 2 lines from `tool:dossier_read:Vladimir Gonzalez` (`2041 ATH` hitting stats + `roster status`), leaving `CON R 94 (+7)`, `POW R 72 (+7)`, `CLT 99`, and `ARM 84` out of `state.manifest.approvedFacts` and out of Rhea's prompt (`cron-rhea-gate.js:523-534`, which does not receive raw `cards.json` or `world_summary` attribute blocks). On a strict live `--backend=api` Rhea pass, `"power against right-handers up 7 points and contact against right-handers up 7"`, `"clutch rating is 99"`, `"arm is 84"`, and `"2.87"` look unsupported to the gate.
  3. **Three-way age mismatch on Vladimir Gonzalez (`POP-00598`):** `Oakland_Sports_Feed row 290` / `world_summary_c117.md:224-225` says **`age 27`** (`c117-test-thursday.md:19, 23` prints `"At 27"` / `"27-year-old"`). `output/gridiron/cards.json` says **`Age: 28`** (which `gridiron.js:296` `ageWord` intentionally strips from `dossier_read` because `28 !== 2042 - 2016`). And `output/simulation_ledger_snapshot.jsonl` (`POP-00598`) has **`BirthYear: "2016"`** (`2042 - 2016 = 26`). At live Rhea, `cron-rhea-gate.js:520-522` injects `born: 2016` from `canon-name-check.profilesFor` with the rule `"any age... contradicting these is HIGH-severity misrepresentation"`. Because `test-shell` ran `--no-gate` (`write.log:45`, `samples/`), whether Rhea treats `born: 2016` + `At 27` or unpromoted `CON R +7` / `CLT 99` as a pass or HIGH fail is **untested** ahead of live Thursday.
  4. **Other gate checks verified clean on `c117-test-thursday.md`:** `canon-name-check.checkText` verified all 7 candidate names (`Danny Horn`, `Dawson Nguyen`, `Desmond Morton`, `Frank Reyna`, `Kevin Clark`, `Mark Aitken`, `Vladimir Gonzalez`; 0 unverified — note `JR Rosado` exists as `POP-00054` in the ledger and wasn't flagged). `s344ArticleGate.evaluate` returned `fail: false` (1 non-blocking observation `missing-unanswered-question`, matching `write.log:44`). Prose accuracy vs `c117`: table (`127/.762/0.9`, `81/.874/3.0`, `138/.905/4.7`), `$5.06M`, `$8.30M`, `48 walks in 81 games`, `.403 OBP`, `37 BB / 138 G`, `$23.8M` (`+$21.1M` raise), Aitken `$21.0M` vs `$21.4M`, Horn `$37.8M` / `13.3 WAR` / through 2044 all match `world_summary_c117.md`, `state.json`, or Dawson's `approvedQuotes` — except `At 27` vs `born: 2016` and unpromoted `cards.json` attributes above.

---

### 5. [LOW] Same-Cycle Monday + Thursday `gradeRecord` reuses the same `customId`

- **Where:** `scripts/cron-desk-run.js:1572-1595, 3610-3617`, `scripts/citizenVoice.js:267-274`, `lib/citizenPage.js:153-155`
- **Mechanism (`input -> wrong output`):**
  - `gradeRecord` (`cron-desk-run.js:3613-3616`) passes `--record-kind=graded --cycle=<cycle> --page-key=graded-anthony-raines`.
  - When `graded === true`, `citizenVoice.js:267` drops `slot` (`{ day, ref }`), so `lib/citizenPage.js:153-155` constructs `cp-POP-00017-c<N>-PRESS-graded-anthony-raines` with **no weekday or ref**.
  - `lastGradedLine` (`cron-desk-run.js:1573-1592`) handles Monday -> Thursday W1 reads (`hits[hits.length - 1]` + `metadata.score`), so live Thursday W1 reads Monday's grade safely. However, when Thursday finishes W3 in the same Cycle (`C<N>`), Thursday's `gradeRecord` upserts Monday's `customId`, overwriting Monday's `metadata` (`score`, `scoreMax`) on the citizen page rather than retaining two separate graded records for a twice-weekly seat.

---

## Remaining Audit Checks (Verified Clean)

1. **Thursday scheduling & duplicate-filing guards (Attack 3):**
   - `scripts/newsroom-fanout.js:50, 53`: `anthony-raines` sits in both `WEEK_GRID[1]` (Monday) and `WEEK_GRID[4]` (Thursday).
   - `scripts/buildAnthonyRecord.js:57-68`: `mine` regex `/^sports_c<N>_anthony-raines_.*\.staged(-\d+)?\.md$/` matches both Monday's plain `.staged.md` (verified against `output/cron-compare/staged/sports_c117_anthony-raines_packet-v2_anthropic-claude-sonnet-5-5.staged.md`, headline `# The A's Pay for a Closer They Already Had` -> injected as `F-1dc7f1cce5f0` in C117 `angle.json`) and any `-HHMM` `.staged-NNNN.md` suffix. `story.ref` includes `read <America/Chicago date>`, so Thursday has a distinct `ref` from Monday and is not dropped by `priorBeatRefs` / `staleBeatRef` (`scripts/newsroom-fanout.js:175-195, 475-482`).
   - `scripts/cron-desk-run.js:1461-1470, 3485, 3516` + `lib/articleIntake.js:249-256`: `uniqueDest` writes `.staged-HHMM.md` on collision and pairs the sidecar at `.staged-HHMM.json`, which `parseStagedSidecar` supports.
2. **Morning W1 `0 reasoning tokens, 0 tool calls` (Attack 4):**
   - `scripts/cron-desk-run.js:1704-1721` passes `body: { reasoning: { effort: 'medium' } }`, `maxTokens: 8000` (`:2320`), and all tools (`canon_search`, `citizen_lookup`, `sheet_read`, `canon_recall`, `ask_worker`, `dossier_read({ cards: true })`, `memory_recall`), and `scripts/cron-desk-writer.js:1042-1052` forwards `opts.body` identically in W1 and W3 (where W3 spent `432` reasoning tokens on `write.log:17`). Nothing in code blocks W1 reasoning or tools; W1 received all 11 feed rows + Monday's headline upfront and was instructed `"Return ONLY the JSON requested by packet.output"` (`:1717`), so Sonnet 5.5 deferred `dossier_read` and `ask_worker` to W3.
3. **Other seats (Attack 5):**
   - `scripts/cron-desk-run.js:61-108` (`BEAT_BUILDERS`, `BEAT_NAME_RE`, `beatSlugForName`) and `scripts/newsroom-fanout.js:433-456` add `'anthony-raines': 'buildAnthonyRecord'` cleanly without altering regex matching or paths for `p-slayer`, `hal-richmond`, `tanya-cruz`, `simon-leary`, `elliot-marbury`, or `farrah-del-rio`.

---

## Recommended Fixes Before / Right After Live Thursday

1. Fix `renderPacketIntake` (`scripts/cron-desk-writer.js:500-514`) for `worker-answer` quotes: check quoted substring overlap instead of only `quote.slice(0, 48)` before demoting `quoted-source -> mentioned`, and do not dump an entire 2,000-char Markdown table reply into `CLAIM:`.
2. Add `"seatEssence": false` to `anthony-raines` in `scripts/newsroom-wake-packages.json:293-347` so `voices/anthony.md` stops overriding `SEAT.md`.
3. Suppress `FACTS_TAIL` / `"Unnamed voices are yours"` for records seats (`scripts/beatSliceKit.js:222`, `scripts/livedExperiencePacketV2.js:382, 394`) even when `args.bare` is `false`.
4. Run `cron-rhea-gate.js` once against `output/research-build/2026-11-24-anthony/c117-test-thursday.md` (with the test-shell's `.state.json` and `.packet.json`) to verify whether Rhea clears `"At 27"` (`born: 2016` on `POP-00598`) and unpromoted `dossier_read` ratings, and update `numericTokens` (`livedExperiencePacketV2.js:421`) to match leading-dot decimals (`(?:\d+\.\d+|\.\d+|\d+)`).
