# Adversarial Review — pipeline.111 Pass 2: Morning Tool Loop, `ask_worker`, Graye, and Trimmed Records

**Reviewer:** Antigravity (`agy`) · **Date:** 2026-11-23 · **Brief:** [2026-11-23-rb-brief-agy-morning-tools-ask-worker-graye.md](file:///root/GodWorld/docs/for-claude-review/2026-11-23-rb-brief-agy-morning-tools-ask-worker-graye.md) · **Range reviewed:** `d504b94cd^..7109f6cf7` (`scripts/`, `.claude/agents/`) · **Code edits:** none (read-only)

**Verdict: HOLD**

Two HIGH blockers affect `ask_worker` quotes at Rhea and morning `seatMorningPlan` invariants, plus a HIGH resilience/cap leak in `scripts/workerAsk.js`. Jordan's Monday wake (`business-desk`, 18:15) already uses `seatMorningPlan` (`cron-desk-run.js:1660`); Graye (`elliot-graye`, Thu 11-26) exercises `ask_worker` end-to-end.

---

## Findings

### 1. [HIGH] `ask_worker` verbatim quotes fail Rhea's `intake-quoted-source` blocker (`packet.json` vs `state.json`)

- **Locations:**
  - `scripts/livedExperiencePacketV2.js:741-766` (`appendWorkerQuotes`)
  - `scripts/cron-desk-writer.js:489-512` (`renderPacketIntake`), `:1668-1675`
  - `scripts/cron-desk-run.js:3379-3388`
  - `scripts/cron-rhea-gate.js:636-652, 687, 795, 822`
- **Mechanism:**
  At W3 compose (`cron-desk-writer.js:1668-1675`), `appendWorkerQuotes` appends `ask_worker` answers to `packet.manifest.approvedQuotes`, `packet.exposure.sources` (`sourceKind: 'worker-answer'`), and `packet.manifest.approvedSubjects`, then writes the amended Packet to `STATE_FILE` (`*.state.json`). Immediately after (`:1674`), `renderPacketIntake` (`:490-501`) inspects `packet.exposure.sources` and emits `NAMES: <Worker> | quoted-source` whenever the article text contains `meta.quote.slice(0, Math.min(48, meta.quote.length))`.
  Then `cron-desk-run.js:3379-3385` invokes `cron-rhea-gate.js` with **both** `--article-packet <state.json>` (amended W3 manifest) and `--packet <packet.json>` (unamended W2 packet).
  Inside `cron-rhea-gate.js`, Rhea's prompt (`buildPrompt` `:131`, `buildApiPrompt` `:531-535`) reads `reviewContext.manifest.approvedQuotes` from `ARTICLE_PACKET_FILE` (`state.json`) and sees the `worker-answer` quote as authorized speech. **However**, the deterministic `intakeBlockers` check (`cron-rhea-gate.js:636-652`) reads **only `PACKET_FILE` (`packet.json` from W2)** to build `const quoted = new Set()`:
  `unbackedQuoted = parsed.names.filter(n => n.role === 'quoted-source' && !quoted.has(String(n.name).toLowerCase())).map(n => n.name)` (`:652`), pushing a `high` blocker (`intake-quoted-source`, `:687`) into `detBlockers` (`:795`) and forcing `gatePass = false` (`:822`) even when Rhea passes the piece.
- **Failure scenario:**
  `input` (W3 reporter calls `ask_worker`, gets a multi-sentence reply from Brenda Okoro, and quotes the opening sentence verbatim ≥48 chars) → `renderPacketIntake` writes `NAMES: Brenda Okoro | quoted-source` → `cron-rhea-gate.js:638-652` loads W2 `packet.json` which lacks `Okoro` → **deterministic HIGH failure: `intake-quoted-source: quoted-source with no wake-2 packet backing: Brenda Okoro`**.
  *(Converse side-effect when quoting a middle sentence or `<48` chars from the start: `renderPacketIntake` at `:499-500` falls back to `NAMES: <Worker> | mentioned`, masking the check, while `:509-511` emits `CLAIM: <quote> | citizenVoice PRESS <Worker>`, mislabeling `sourceKind: 'worker-answer'` as `citizenVoice PRESS`.)*

---

### 2. [HIGH] `seatMorningPlan` disables `canon_recall` cycle filtering, drops W1 `ask_worker` quotes from W3's manifest, and leaks `GODWORLD_SEAT_TOOLS=1`

- **Locations:**
  - `scripts/cron-desk-run.js:1660-1681` (`seatMorningPlan`), `:2268-2269`
  - `scripts/cron-desk-writer.js:809-811` (`SHEET_READ_ALLOWLIST`), `:920, 927-965` (`toolCanonRecall`, `CANON_RECALL_CYCLE`), `:1156`, `:1540` (`SEAT_ASK`)
- **Three defects in the morning loop:**
  1. **`CANON_RECALL_CYCLE` stays `null` (`cron-desk-run.js:1670`, `cron-desk-writer.js:920, 932, 946, 965`):**
     `seatMorningPlan` calls `W.toolCanonRecall(input)` without passing `cycleNow` (`toolCanonRecall(input, cycle)`). In `cron-desk-writer.js`, `CANON_RECALL_CYCLE` initializes to `null` (`:920`) and is assigned only inside `main()` (`:1156`), which does not run on `require('./cron-desk-writer')`. Consequently `now` at `:932` is `null`: `if (c != null && now != null && c >= now) continue;` (`:946`) is bypassed (on a rerun, `canon_recall` returns pieces from the current cycle), and an empty search prints `'No published piece from before Cnull came back...'` (`:965`).
  2. **W1 `ask_worker` answers never reach W3's manifest (`cron-desk-run.js:1668, 1679`, `cron-desk-writer.js:1540`):**
     `seatMorningPlan` constructs a local `asks = require('./workerAsk').askExecutor(...)` (`:1668`) and discards `asks.answers` on return (`:1679`). Meanwhile W3 constructs a separate `SEAT_ASK = askExecutor(...)` (`cron-desk-writer.js:1540`). Result: (a) the 2-asks cap is **per stage/attempt** (up to 2 per W1 attempt × `ANGLE_ATTEMPTS = 2` + 2 at W3), not 2 per wake; and (b) if a reporter quotes or paraphrases a worker answered during W1 without re-asking the worker in W3, `SEAT_ASK.answers` in W3 does not contain that answer, `appendWorkerQuotes` omits it from `manifest.approvedQuotes`, and Rhea flags the speech as fabricated.
  3. **`process.env.GODWORLD_SEAT_TOOLS = '1'` leaks to downstream processes (`cron-desk-run.js:1661`, `cron-desk-writer.js:811`):**
     `seatMorningPlan` mutates `process.env.GODWORLD_SEAT_TOOLS = '1'` (`:1661`) and never restores or deletes it. In `--fanout`, every child process spawned afterwards by `cron-desk-run.js` (`runCitizenQuotePass`, `runWrite` spawning `cron-desk-writer.js` for non-seat reporters, `cron-rhea-gate.js`) inherits `GODWORLD_SEAT_TOOLS=1`, expanding `SHEET_READ_ALLOWLIST` with `'Cultural_Ledger'` (`cron-desk-writer.js:811`) for non-seat `WRITER_TOOLS` runs that follow a seat reporter in the same fan-out.
- **Failure scenario:**
  `input` (Jordan or Graye calls `canon_recall` in W1 on a C118 rerun or calls `ask_worker` in W1 and quotes the worker's phrasing in W3 without re-asking; then a non-seat writer runs later in `--fanout`) → `canon_recall` reads `C118` or prints `before Cnull`; W1 worker speech is omitted from W3 `approvedQuotes`; subsequent non-seat writer inherits `Cultural_Ledger` access on `sheet_read`.

---

### 3. [HIGH] `workerAsk.js` crashes the reporter wake on transient worker errors and leaves truncated (`length`) / failed calls uncounted and unmanifested

- **Locations:**
  - `scripts/workerAsk.js:52-73` (`askWorker`, `askExecutor`)
  - `scripts/cron-desk-writer.js:1027-1028` (`openRouterToolLoop`)
- **Mechanism:**
  1. **Uncaught worker loop failures (`workerAsk.js:52-60, 68`):** Neither `askWorker` nor `askExecutor.run` wraps `W.buildWake` or `dw.openRouterToolLoop` in `try/catch`, and `openRouterToolLoop` does not catch `opts.exec` (`cron-desk-writer.js:1028`). Any transient OpenRouter error (429, 5xx, parse error, `150000`ms socket timeout) or missing beat dump inside a worker call rejects directly out of the reporter's W1 or W3 tool loop, aborting the entire reporter wake instead of returning a soft unavailable string to the reporter.
  2. **Truncated (`length`) / `tool-turns-exhausted` answers returned to reporter but omitted from `answers` and cap count (`workerAsk.js:67-71`):**
     `askExecutor.run` checks `if (answers.length >= ASKS_PER_WAKE) return 'no more asks this wake'` (`:67`), and only pushes to `answers` when `a.popid && a.text && ['stop', 'end_turn'].includes(a.finish)` (`:69`). However, line `:71` returns `a.name + ', ' + a.title + ', answered:\n' + a.text` even when `a.finish === 'length'` (partial reply!). Because it was not pushed to `answers`: (a) it does **not** increment `answers.length` against `ASKS_PER_WAKE = 2` (same for `unknown-office`, `no-question`, or `tool-turns-exhausted`, allowing up to all 6 reporter tool calls to trigger `ask_worker`), and (b) at W3 `appendWorkerQuotes(packet, SEAT_ASK.answers)` never manifests the cut-off reply, so quoting it in the article creates an unapproved quote at Rhea.
- **Failure scenario:**
  `input` (worker hits `2400` tokens on DeepSeek and returns `finish: 'length'` with usable partial text, OR worker OpenRouter call returns HTTP 502) → on 502, `askWorker` throws and kills the reporter's W1/W3 wake outright; on `finish: 'length'`, reporter sees `{name}, {title}, answered: <partial text>`, `answers.length` stays `0` (cap bypassed), and quoting the reply produces an unmanifested quote rejected at Rhea.

---

### 4. [MEDIUM] `seatMorningPlan` has no HTTP timeout, misses `tool-turns-exhausted` cap hits, and drops `SEAT_MORNING_TRACE`

- **Locations:**
  - `scripts/cron-desk-run.js:1509-1512` (`angleCapHit`), `:1675-1682` (`seatMorningPlan`, `SEAT_MORNING_TRACE`), `:2355-2464` (`angle.json` write)
  - `scripts/cron-desk-writer.js:611, 637, 1049`
- **Mechanism:**
  1. `seatMorningPlan` calls `W.openRouterToolLoop` (`:1675-1676`) without `timeoutMs`. In `callOpenRouterRaw` (`cron-desk-writer.js:611, 637`), `if (timeoutMs) req.setTimeout(...)` is skipped when `timeoutMs` is omitted — unlike the old `execFileSync` (`timeout: 300000` at `:2282`) and `workerAsk` (`timeoutMs: 150000` at `workerAsk.js:59`) — leaving a hung socket able to stall the morning cron indefinitely.
  2. When `openRouterToolLoop` exits the `turn < maxCalls + 2` loop (`cron-desk-writer.js:1049`), it returns `{ text: '', ..., finishReason: 'tool-turns-exhausted' }`. `angleCapHit` (`cron-desk-run.js:1509-1512`) only treats `finish === 'length' || completion >= maxTokens` as a cap hit, so tool exhaustion misclassifies as a JSON parse error (`parseJsonObject`) without recording `angleCapHits`.
  3. `SEAT_MORNING_TRACE` is assigned at `:1678` (`cron-desk-run.js:1682` global) and never read or persisted into `angle.json` (`:2355-2464`) or `storyDocOpen` (`:2469`), losing W1 tool provenance after the stdout log line.
- **Failure scenario:**
  `input` (morning loop hits stalled OpenRouter socket, or exhausts `maxCalls + 2` turns on tool calls) → hung cron with no timeout, or `parseJsonObject` throw without incrementing `SEAT_CHECKS.capHits`/`angleCapHits`; on normal runs, morning tool calls never appear in `angle.json`.

---

### 5. [MEDIUM] Trimmed record edge cases in Jordan (`ECONOMY-SLICE-3`), Maria (`HOOD-SLICE-6`), and Graye (`FAITH-SLICE-3`)

- **Locations:**
  - `scripts/buildEconomySlice.js:35, 71-86, 141`
  - `scripts/buildNeighborhoodSlice.js:56, 79-80, 92-99`
  - `scripts/buildFaithSlice.js:32, 112-120`
- **Details:**
  1. **Stale `prev/` dump unchecked & mover tie truncation (`buildEconomySlice.js:35, 74-75, 85`; `buildNeighborhoodSlice.js:56, 79-80`):**
     Neither `buildEconomySlice` nor `buildNeighborhoodSlice` checks `prev.vs === cycle - 1` before setting `hasPrev` / comparing `prevDemo` (e.g., if `output/beats/prev/` is left over from `cycle - 3`, deltas compare `cycle` against `cycle - 3` while `buildEconomySlice.js:85` still tags `src: 'output/beats/Business_Ledger.jsonl @C' + cycle + ' vs prev/'`). Also at `buildEconomySlice.js:74-75`, `.slice(0, MOVERS_EACH_WAY)` cuts strictly at 10 entries even when business #11 ties #10's `dg`, dropping tied movers by arbitrary pre-sort tie order.
  2. **`buildFaithSlice.js:112-120` leader event overwrite & non-POPID fallback:**
     `eventBy` (`:112`) is built by iterating `weekEvents` (sorted crisis/holy_day first) and executing `eventBy.set(org.toLowerCase(), e)`, so if one congregation has 2+ events in the 7-cycle window, `Map.set` overwrites the higher-priority event with the **last/lowest-priority** event for the leader's `why` note (`:114`) while `facts` leads with the highest-priority event. Separately, `:113-117` filters `.filter(o => o.LeaderPOPID)` without checking `/^POP-\d+$/i`: if `LeaderPOPID` contains a placeholder like `"TBD"`, `personFromProfile` returns `null` and `K.person(popid, ...)` (`:117`) emits `"TBD"` as `p.popid`.
  3. **`buildNeighborhoodSlice.js:94-98` blank-neighborhood key mismatch:**
     Line `:94` keys `perHood` on `r.Neighborhood` (`LifeHistory_Log`), whereas `:98` displays `p.Neighborhood || hood`. If `LifeHistory_Log` rows omit `Neighborhood`, multiple distinct neighborhoods collapse under `perHood.get('')` and cap at 1 total resident across all blank rows.
- **Failure scenario:**
  `input` (`prev/` left from C114 on C117 run; or an org has a `crisis` at C117 and an `ordinary` event at C114 in `Faith_Ledger`, or `LeaderPOPID = 'TBD'`) → Jordan/Maria compute multi-cycle drift while labeling `vs prev/`; Graye's leader line cites the C114 routine event instead of the C117 crisis, or emits `popid: "TBD"` into `people`.

---

### 6. [LOW] `require('./cron-desk-writer')` top-level CLI parsing side-effects inside `cron-desk-run.js`

- **Locations:**
  - `scripts/cron-desk-writer.js:57-65, 190-208, 255-260, 811, 917-920`
  - `scripts/cron-desk-run.js:1662, 2268-2269`
- **Mechanism:**
  Requiring `cron-desk-writer.js` from `cron-desk-run.js:1662` evaluates `cron-desk-writer.js` top-level `process.argv` parsers (`DESK`, `PERSONA`, `PROVIDER`, `MODEL`, `SEAT_FILE_PATH`, `TEST_SEAT`, `CANON_RECALL`). Under `--fanout` (no `--desk`, `--persona`, `--seat-file`), `DESK` defaults to `'sports'`, `PERSONA` to `null`, and `TEST_SEAT` to `false` (which is why `seatMorningPlan` must mutate `process.env.GODWORLD_SEAT_TOOLS = '1'`). Currently no morning helper reads `DESK`/`MODEL`/`PROVIDER`/`TEST_SEAT`, **except** `toolCanonRecall` reading `CANON_RECALL_CYCLE` (Finding #2.1) and `SHEET_READ_ALLOWLIST` reading `GODWORLD_SEAT_TOOLS` (Finding #2.3). Worth keeping explicit if more helpers are exported later.

---

## Checked Clean Against the Brief

- **Attack 2 (`ask_worker` write isolation & `/_set$/` filter):** Verified clean. `workerAsk.js:52-60` builds the wake with `question` + `askerLine`, filters `/_set$/` (`patrol_set`) via `.filter((t) => !/_set$/.test(t.function.name))` (`:54`), and runs `W.toolExecutor({ popid: who.popid, cycle: Number(cycle), stage: { patrol: [] }, records: w.records, dw })` (`:58`). None of the worker tools write to citizen pages, `Reflection_Intake`, `Moves`, or Sheets; `ask_worker` causes zero writes.
- **Attack 3 (`appendWorkerQuotes` manifest structural contract):** Verified clean on `assertBase('W3')`, unique SHA-256 `Q-WORKER-...` ids, `speakerId` registration on `manifest.approvedSubjects` with `quotationEligible: true`, `manifestId(next)` recomputation, and write order before `renderPacketIntake` (`livedExperiencePacketV2.js:741-766`, `cron-desk-writer.js:1668-1675`). The break is downstream at Rhea (`cron-rhea-gate.js:636-652`, Finding #1) and W1→W3 continuity (Finding #2.2).
- **Attack 4 (W3 early pass fix, `cron-desk-run.js:3098-3101`):** Verified clean across normal W3, `--regate`, and `--test-shell`: checks `anglePath` (`passedAngle && passedAngle.pass`) before `requireUnspentArtifact` so a W1 pass exits 0 without failing on a missing `packet.json`. On a malformed `angle.json`, `readJson` (`:259`) returns `null`, passing through `:3100` to `requireUnspentArtifact` / `readJson` / `validateWakeHandoff` (`:3103, 3115, 3137`) and failing loudly as expected.
- **Attack 5 (Maria staff-only hood, Graye package wiring):** Verified clean on Maria's staff/self filter (`buildNeighborhoodSlice.js:95` skips staff/self before incrementing `perHood`, so staff-only hoods safely return 0 residents) and Graye's package/slice (`FAITH-SLICE-3` uses `POP-00012`, 7-cycle window `Cycle > cycle - 7 && Cycle <= cycle`, no focus/angle/hook; `newsroom-wake-packages.json:678-728` wires `graye-faith-v2`, `writerTools.maxToolCalls: 6`, `seatFile`, `Sonnet 5.5` on morning & write).
- **Attack 6 (Worst-case call & token ceiling):**
  - Reporter tool turns obey `maxCalls + 2` (`cron-desk-writer.js:1008`): at `maxCalls = 6`, up to `8` reporter turns (`maxTokens: 4000` in W1; `MAX_TOKENS: 16000` in W3).
  - Worker `ask_worker` turns obey `maxToolCalls: 4` (`workerAsk.js:59`) with `maxTokens: 2400` (`deepseek-v4*`) or `6000` (e.g. `DA-01` `moonshotai/kimi-k3.1-pro`), up to `6` worker turns per call (`4 + 2`).
  - **Normal worst case:** W1 (`ANGLE_ATTEMPTS = 2` attempts × (`7` reporter turns + `2 × 5` worker turns) = `34` calls) + W3 (`7` writer turns + `2 × 5` worker turns + Rhea + contract = `~19` calls) = **~53 OpenRouter calls** for one seat wake.
  - **Pathological worst case (Finding #3.2):** Because `length`, `tool-turns-exhausted`, `unknown-office`, and empty `question` calls do not increment `answers.length`, a reporter that spends all `6` tool calls on truncated/failing `ask_worker` calls across 2 W1 attempts + W3 can trigger up to `18` worker sub-loops (`6 × 2 + 6`).

---

## Offline Checks Run

All offline tests executed against repository code with zero network/Sheets/OpenRouter writes:
- `node scripts/beatSlices.test.js` — PASS
- `node scripts/buildEconomySlice.test.js` — PASS
- `node scripts/newsroomWakePackages.test.js` — PASS
- `node scripts/cron-desk-writer.test.js` — PASS
- `node scripts/cron-rhea-gate.test.js` — PASS
- `node --test scripts/workerWake.test.js` — 31/31 PASS
- `node scripts/livedExperiencePacketV2.test.js` — PASS
- `node scripts/cronRheaPersonaGate.test.js` — PASS
- `node scripts/cronDeskFanoutHandoff.test.js` — PASS
