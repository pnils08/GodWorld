# Adversarial Review — Seat-file interviews wake the citizen as their own cron (`c4260bb48`)

**Verdict:** `SHIP-WITH-FIXES`  
**Target:** Commit `c4260bb48` (`lib/citizenWakePrompt.js`, `scripts/citizen-wake.js`, `scripts/citizenVoice.js`, `scripts/cron-desk-run.js`, `scripts/newsroomInterviewContract.js`)  
**Brief:** `docs/for-claude-review/2026-11-25-rb-brief-agy-interview-own-wake.md`  
**Scope:** Strictly read-only on repository code and docs. No live Sheets, Supermemory, Discord, or model API calls were run.

---

## Checks Run

- `node --check /root/GodWorld/lib/citizenWakePrompt.js /root/GodWorld/scripts/citizen-wake.js /root/GodWorld/scripts/citizenVoice.js /root/GodWorld/scripts/cron-desk-run.js /root/GodWorld/scripts/newsroomInterviewContract.js` → exit `0`.
- `node /root/GodWorld/scripts/newsroomInterviewContract.test.js` → PASS (`newsroomInterviewContract.test.js: PASS`, `newsroomInterviewContract own-life tests: PASS`).
- `node /root/GodWorld/scripts/livedExperiencePacketV2.test.js` → PASS (`livedExperiencePacketV2.test.js: PASS`, `livedExperiencePacketV2 canon_recall manifest tests: PASS`).
- `node /root/GodWorld/scripts/cron-desk-writer.test.js` → PASS (all 6 test suites passed).
- `node /root/GodWorld/scripts/cron-rhea-gate.test.js` → PASS (`cron-rhea-gate tests passed`).
- Offline `node -e` repro against `ownWakeClaims`, `buildAnglePacket`, `buildWritePacket`, `auditArticle`, and `renderPacketIntake` for stage-direction and partial-sentence quote attribution (see Finding 1).

---

## Findings

### 1. Medium — `renderPacketIntake` downgrades stage-directed or later-clause `ownWake` quotes from `quoted-source` to `mentioned` (`scripts/cron-desk-writer.js:506-515`)

`ownWakeClaims` (`scripts/newsroomInterviewContract.js:161-170`) accepts free-form cron prose (up to 340 tokens / 1400 chars) without the 1–4 sentence / plain-prose JSON checks. `auditArticle` (`scripts/livedExperiencePacketV2.js:826-838`) explicitly allows quoting any contiguous fragment inside `approvedQuoteNorms`. `renderPacketIntake`, however, checks attribution with:

- `whole` stripping `[*_#|>]` only from `s.quote`, splitting ONLY on `(?<=[.!?"”])\s+`, and testing ONLY the first 48 characters (`t.slice(0, Math.min(48, t.length))`) of each `>=25`-char chunk against `body`.

**Input → wrong output:**
1. *Stage direction before dialogue:* Citizen replies `*sets down the mug* Yeah, the streetlights on 14th went out again Tuesday.` and the reporter quotes `"Yeah, the streetlights on 14th went out again Tuesday."` (dropping the stage direction). `whole` collapses to `'sets down the mug Yeah, the streetlights on 14th went out again Tuesday.'` (no period inside the stage beat), `t.slice(0, 48)` starts with `'sets down the mug ...'`, `quotedIn` returns `false`, and `renderPacketIntake` emits `NAMES: <citizen> | mentioned` instead of `quoted-source`. Downstream (`scripts/cron-saturday-run.js:105`), the citizen receives `mentioned` usage credit instead of `quoted`. (Verified with local `node -e` run; `CLAIM:` at `scripts/cron-desk-writer.js:523` also emits `'sets down the mug Yeah...'`.)
2. *Later-clause attribution on a long sentence:* If a 340-token cron answer contains a compound sentence and the writer quotes a contiguous clause after the opening 48 characters (valid in `auditArticle`), `t.slice(0, 48)` misses it and likewise downgrades `quoted-source` to `mentioned`.

*(Note on short denials: if the citizen replies `"Hasn't happened to me."`, `< 25` chars, `scripts/cron-desk-writer.js:509` strips trailing `[.!?]+$` after the opening quote mark, so `"Hasn't happened to me," Neilon said` still matches.)*

---

### 2. Medium — Double `memoryFence.wrap` on UNDOCKED `showBlock` leaves an unclosed inner `<memory-context>` tag (`scripts/citizenVoice.js:145, 166-167`)

`showFor(popId, cycle)` (`scripts/citizenVoice.js:145`) already returns `memoryFence.wrap(t, 'undocked-show:' + String(popId).toUpperCase())`. `wakeForInterview` (`scripts/citizenVoice.js:166-167`) calls `memoryFence.wrap(showText, 'undocked-show:' + c.popId)` a second time.

In `lib/memoryFence.js:19, 28`, `FENCE_TAG_RE = /<\/?\s*memory-context\s*>/gi` strips `</memory-context>` (no attributes) but does **not** match `<memory-context source="...">`.

**Input → wrong output:** When an UNDOCKED pilot with nights on record is interviewed via `wakeForInterview`, the second `wrap` strips the inner closing `</memory-context>` while keeping the inner `<memory-context source="undocked-show:POP-XXXXX">` and duplicate `[System note: ...]` inside the outer `<memory-context>` block. (`scripts/citizen-wake.js:347-348` calls `showRecord.showBlockFor` once and wraps once.)

---

### 3. Medium — Daily brief router drops all `ownWake` quotes because `factIds` is empty (`scripts/notebooklmDailyRouter.js:120-133`)

`ownWakeClaims` (`scripts/newsroomInterviewContract.js:167`) returns `factIds: []`, `basis: 'own-wake'`. W3 (`scripts/livedExperiencePacketV2.js:80-105, 304-350`), Rhea (`scripts/cron-rhea-gate.js:530-535, 640-662`), `buildIntakeSidecar` (`scripts/cron-desk-run.js:3143-3162`), and `cron-saturday-run.js` all handle `factIds: []` cleanly.

However, `notebooklmDailyRouter.js:123-124` (`packetQuotes`, called by `collectNewsroomPulse()` for `scripts/notebooklmDailyNews.js:1163`) still requires:
`Array.isArray(factIds) && factIds.length > 0`

**Input → wrong output:** A seat-file `w2` `packet.json` whose quotes came from `ownWakeClaims` lands in W3 and passes Rhea/staging, yet `packetQuotes()` filters every quote out, so the daily brief (`scripts/notebooklmDailyNews.js:542-545`) reports `counts.w2Ready = 0`, `counts.quotes = 0`, and `_No Packet-backed quotes were available._`.

---

### 4. Low — `voiceOne` executes legacy perception assembly and Supermemory calls before `wakeForInterview` discards them (`scripts/citizenVoice.js:200-257`)

`voiceOne` runs `coResidents`, `loadSportsSlice`, `loadLifeArc`, `loadBonds`, `loadFamily`, `loadHealthState`, `loadNeighborhoodTexture`, `loadOwnPageReadback`, `showFor`, `loadOwnFeedLines`, and `officeWall.loadPositionWall` (`scripts/citizenVoice.js:200-245`) **before** line 257 checks `ownWake && interviewMode && !REPORTER_WAKE` and calls `wakeForInterview(c, ownWake, cycle)`.

**Input → wrong output:** Every `ownWake` interview issues two Supermemory `recentPage_` calls (`loadOwnPageReadback`, first with full `PACKET_JSON` in `contextText`, then discarded), duplicate Sheets reads (`loadBonds`, `loadFamily`, `loadHealthState`, `loadLifeArc`, `loadSportsSlice`), plus an unused `officeWall` Supermemory fetch for officeholders — only `bondPairs` (`line 205`, used at `line 357`) and `disp` from the first pass are kept. (Additionally, `wakeForInterview` runs `loadCardAnchor` with up to 8 Supermemory list pages / 30s timeout sequentially per citizen in `runBatch`.)

---

### 5. Low — Perception discrepancies between `citizen-wake.js` and `wakeForInterview` (`scripts/citizenVoice.js:152-191`)

Verified point-by-point against `scripts/citizen-wake.js:323-400`:

- **Owed pins missing from `c.life`:** `citizen-wake.js:327-329` calls `owedFor(c.popId, owed, owedView)` and re-slices `c.life = lifeTailOf(c.lifeLines || [], pins)` so unspent owed/question/hospital pins enter the 5-line tail. `wakeForInterview` does not load owed records, leaving `c.life` as `buildPool`'s default 3-milestone + 2-texture tail (`lib/wakePerception.js:685`).
- **`livedFor(c.popId, livedEvents, {})` with empty state (`scripts/citizenVoice.js:163-164`):** Correct for staying read-only (no `livedSpent` read/write), with the consequence that a citizen who already spent this Cycle's lived event on a cron wake still sees it during an interview, and `owedLivedPrefer(owedAdmit)` is omitted.
- **No `MIN_WAKE_AGE = 7` pool filter (`scripts/citizenVoice.js:385` vs `scripts/citizen-wake.js:257-258`):** Only matters if an ask explicitly targets an under-7 citizen.
- *Intended / matching differences verified clean:*
  - `office`: `wakeForInterview` (`scripts/citizenVoice.js:161-162`) loads `W.loadOfficeHolders()` and sets `c.office`, and drops `officeWall` position posts — matching `scripts/citizen-wake.js:323-325`.
  - `rippleLine`: passes `''` (`scripts/citizenVoice.js:189`) so no ripple is consumed.
  - `dayMoments` + `wake`: `partOfDay()` (`scripts/citizenVoice.js:152-155`) maps current `America/Chicago` hour to the 5 `WAKE_FRAME` keys and sets `c.dayMoments` before `buildVoicePrompts` (`biasReadback` sees it), matching `scripts/citizen-wake.js:354-356`.
  - `resonance contextText` (`scripts/citizenVoice.js:184`): prepends `question` to bias recall toward the interview topic while passing the same `extraCandidates` (`tensionCandidates` + `unlivedCandidates(c.memReg)`) from `buildPool({ shapedMin: 0, lifeMinChars: 0 })` (`c.memReg` and `c.lifeLines` shapes match).

---

### 6. Low — 1400-char quote cap vs uncapped PRESS page, and `PACKET_JSON` in `extra.ask` (`scripts/newsroomInterviewContract.js:164`, `scripts/citizenVoice.js:316, 325`)

- `ownWakeClaims` truncates `publishableQuote` via `clean(said.spoken, 1400)` while `citizenVoice.js:317` stores uncapped `said.spoken` on the citizen's PRESS page. A 340-token answer >1400 chars can clip mid-word in the packet while sitting whole on the page.
- `voiceOne` passes `ask` (`livedPacket.prompt(inputPacket)` from `scripts/cron-desk-run.js:554`) to `page.pageRefOf(ask)` (unique SHA-1 ref per packet, safe) and `extra.ask = String(ask).slice(0, 120)` (`'PACKET_JSON\n{"v":"LEP/2",...'`), rather than the reporter's question text (pre-existing for LEP/2 interviews).

---

## Verified Clean Under Attack

1. **Citizen cron parity (`scripts/citizen-wake.js` & `lib/citizenWakePrompt.js`):** `path.join(__dirname, '..', 'editions')` in `lib/citizenWakePrompt.js:26` resolves identically to `scripts/` (`<repo>/editions`). `scripts/citizen-wake.js:134` (`buildVoicePromptsFor(...args, WAKE)`) shifts the 18 arguments of `scripts/citizen-wake.js:400` onto parameters 1–18 with `WAKE` landing cleanly on parameter 19 (`wake`) for `selectProvocation`, `WAKE_FRAME[wake]`, and the engine.338 `questionText` branch. *(Unused `selectProvocation` import at `scripts/citizen-wake.js:44` is harmless dead code.)*
2. **Read-only contract (Attack 3):** `wakeForInterview` never touches `livedSpent` (`citizen-wake-state.json`), `citizen-ripple-state.json`, `citizen-wake-owed.jsonl`, `resonance.markRecalled`, or `citizen-wake-offered.jsonl` (`OFFERED_FILE`). `loadTensionState()`/`openTensionsFor()` (`scripts/citizenVoice.js:177-178`) stays in-memory inside `wakeForInterview`; only `voiceOne` (`scripts/citizenVoice.js:295-373`) writes the existing PRESS record (`appendReflection_`, tension register + `saveTensionState`, gated `Reflection_Intake` row with `applied='no'`) when `record && !DRY && !said.abstain` (`--dry-run` sets `record: false` at line 395).
3. **Puppeting (Attack 5):** `scripts/citizenVoice.js:187` constructs `asked` strictly from `reporter`, sanitized `question` (`"` → `'`), and `"Answer in your own words; if it has not happened to you, say so."`. In the `woke` branch (`scripts/citizenVoice.js:257-269`), neither `signal.focus`, `citizenEvidenceGuard`, `"one to three first-person sentences"`, nor JSON/basis instructions reach the model. *(Behavioral note: if a citizen follows `"if it has not happened to you, say so"` in prose, `extractSpoken` returns `abstain: false`, so PRESS records their denial and `ownWakeClaims` passes those real words as `publishableQuote`.)*
4. **Scope (Attack 6):** `scripts/cron-desk-run.js:549-553` sets `ownWake` only inside `if (SEAT_FILE)` under `if (PACKET_ACTIVE)`; `scripts/cron-desk-run.js:616` uses `ownWakeClaims` only for `ownWakeByPop.has(q.pop)`. Non-seat-file seats keep `ownWake = null` (`validateInterviewOutput` + legacy `voiceOne`). `REPORTER_WAKE` (`--seat-file` at `scripts/citizenVoice.js:61, 257`) is explicitly excluded by `!REPORTER_WAKE`. `records` seats return `[]` at `scripts/cron-desk-run.js:490-493`.
