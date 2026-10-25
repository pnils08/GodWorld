# Adversarial Review: World-Born Holidays Reach the Desks With Their Meaning (pipeline.86)

- **Reviewer:** antigravity
- **Date:** 2026-10-25
- **Target:** `/tmp/claude-0/-root-GodWorld/78b343cd-2ce6-49d7-ac3f-26f773f60c33/scratchpad/pipeline86.patch` (uncommitted working-tree diff of `scripts/beatSliceKit.js`, `scripts/buildWorldSummary.js`, `scripts/buildWorldSummary.test.js`, `scripts/livedExperiencePacket.js`, `scripts/livedExperiencePacket.test.js`, 160 lines)
- **Task Spec:** `docs/for-claude-review/2026-10-25-pipeline86-holiday-meaning-review-TASK.md`

---

## Findings

### 1. [MEDIUM] Hunt 2 (Fact-ID / Manifest Contract & Off-Assignment Gate): `Calendar:` fact in `known` loosens `chaseReplacesAssignment` on every live cycle (and severely on `SecondDawn` / `CreationDay`), and injects `<simYear>` and `<cycleOfYear>` into `auditArticle` / `selectUsedToolLines` approved numbers
- **Location:** `pipeline86.patch:138-139` (`scripts/livedExperiencePacket.js:381-382`) interacting with `scripts/livedExperiencePacket.js:515-545` (`chaseReplacesAssignment`) and `scripts/livedExperiencePacketV2.js:608-638, 667-677` (`selectUsedToolLines`, `auditArticle`)
- **Issue:**
  1. **`chaseReplacesAssignment` loosening:** `chaseReplacesAssignment` (`scripts/livedExperiencePacket.js:524-531, 544`) builds its 5+-character anchor token list from every `known` claim and passes any chase containing **any single token** as a substring (`!tokens.some(t => c.indexOf(t) >= 0)`).
     - On every non-holiday live cycle (e.g., C112: `Calendar: Y3C8, Winter, holiday=none`), `Calendar:` injects `['calendar', 'winter', 'holiday']` (or `'spring'`, `'summer'`) into `tokens` for every seat. An off-assignment chase mentioning `"winter"`, `"holiday"`, or `"calendar"` bypasses the off-assignment gate.
     - On `SecondDawn` (C131) and `CreationDay` (C152), the meaning sentence injects 13–15 generic city/reporting tokens (`'oakland'`, `'record'`, `'second'`, `'voice'`, `'found'`, `'started'`, `'began'`, `'words'`, `'citizens'`, `'tribune'`, `'marks'`, `'carrying'`, `'hearing'`, `'itself'`, `'civis'`, `'systems'`, `'online'`, `'tracking'`, `'keeping'`) into `tokens` for every seat in the newsroom. Any off-assignment chase containing `"Oakland"`, `"record"`, `"second"`, `"voice"`, etc. automatically passes `chaseReplacesAssignment`.
  2. **`auditArticle` and `selectUsedToolLines` number approval:**
     - `attachFactIds` (`scripts/livedExperiencePacketV2.js:58-63`) and `Current cycle: C<N>` (`:130-134`) do not collide with `Calendar:` (`claimId` hashes `t + '\n' + text + '\n' + src`, which differ on both `text` and `src`).
     - However, in `auditArticle` (`scripts/livedExperiencePacketV2.js:670-677`), `numericTokens("Calendar: Y3C8, ...")` extracts `"3"` (`simYear`) and `"8"` (`cycleOfYear`, `1..52`) from `Y<n>C<m>` into `allowedNumbers` (whereas `Current cycle: C112` only approved `"112"`). Any invented `"3"` or `<cycleOfYear>` count in an article body is no longer flagged as `UNAPPROVED_NUMBER`.
     - In `selectUsedToolLines` (`scripts/livedExperiencePacketV2.js:610-635`), for the 43 cycles per year where `cycleOfYear >= 10` (`Y3C10`..`Y3C52`), `cycleOfYear` is a two-digit number that enters `allowed`, preventing that number from counting toward the `"at least one significant number not already approved"` requirement (`!allowed.has(v)` at `:635`).
- **Verified Repro:**
  ```bash
  node -e '
  const p = require("./scripts/livedExperiencePacket");
  const story = { ref: "output/TEST.json", label: "TEST-ONLY signal changed", angle: "why the TEST-ONLY signal changed", hood: "TEST-HOOD" };
  const w1_999 = p.buildAnglePacket({ cycle: 999, desk: "civic", reporter: { name: "R" }, story, approach: "x" });
  const w1_112 = p.buildAnglePacket({ cycle: 112, desk: "civic", reporter: { name: "R" }, story, approach: "x" });
  const offChase = {
    chase: "The no-hitter downtown this winter is the only story worth chasing tonight.",
    focus: "x", why: "x", checks: [], targets: [], interpretation: "x", unverifiedLead: [], closeQuestion: "x"
  };
  try { p.validateAngleOutput(offChase, w1_999); } catch (e) { console.log("C999:", e.message); }
  try { p.validateAngleOutput(offChase, w1_112); console.log("C112: PASSED (off-assignment chase admitted via winter)"); } catch (e) { console.log("C112:", e.message); }
  '
  # -> C999: invalid W1 output: chase replaces the assignment
  # -> C112: PASSED (off-assignment chase admitted via winter)
  ```
- **Fix:**
  1. In `chaseReplacesAssignment` (`scripts/livedExperiencePacket.js:527`), filter ambient cycle/calendar claims out of `known` before tokenizing: `known.filter(k => k && !/^(?:Calendar|Current cycle):/i.test(k.text || k.t || ''))`.
  2. In `selectUsedToolLines` (`scripts/livedExperiencePacketV2.js:611`) and `auditArticle` (`:671`), strip `^Calendar:\s*Y\d+C\d+` (or filter out the `Calendar:` fact from number extraction, since neither `CreationDay` nor `SecondDawn` carries digits in its meaning sentence) so `Y<n>C<m>` does not approve `<n>` and `<m>` as standalone article counts.

---

### 2. [MEDIUM] Hunt 2, Hunt 3 & Hunt 5 (Deterministic Brief Renderers): `renderRecordsBrief` and `renderSourceBrief` (`publicBriefFacts`) do not filter out `Calendar:`, printing raw `Calendar: Y3C8, Winter, holiday=none.` into article prose
- **Location:** `pipeline86.patch:138-139` (`scripts/livedExperiencePacket.js:381-382`) interacting with `scripts/livedExperiencePacketV2.js:464-489` (`renderRecordsBrief`) and `scripts/livedExperiencePacketV2.js:513-540, 550-590` (`publicBriefFacts`, `renderSourceBrief`)
- **Issue:** Both deterministic W3 renderers (`renderRecordsBrief` at `:464-465` and `publicBriefFacts` at `:515`) explicitly filter out `row.src === 'cron-desk-run explicit cycle argument'` so `Current cycle: C112` is not printed as an article bullet/paragraph. Neither filters out the new `Calendar:` fact (`publicBriefFacts` at `:518` tests `/world_summary/i` against `row.text`, not `row.src`, and its prefix filter at `:521` does not include `CALENDAR`). On any cycle with a world summary on disk, `renderSourceBrief` prints `Calendar: Y3C8, Winter, holiday=none.` as a body paragraph and `renderRecordsBrief` prints `- Calendar: Y3C8, Winter, holiday=none` as a bullet.
- **Verified Repro:**
  ```bash
  node -e '
  const p = require("./scripts/livedExperiencePacketV2");
  const reporter = { popid: "TEST-LILA", name: "Lila Mezran" };
  const story = { ref: "INIT-TEST-HEALTH", label: "Construction is active for Test Health Center.", angle: "Construction is active for Test Health Center.", kind: "initiative", hood: "TEST-HOOD", popids: [], citizens: [] };
  const slice = { kind: "civic-domain", packetSeat: { seat: { domain: "health" }, prewrite: { method: "ACCESS_TIMELINE_HUMAN_COST", missing: ["a named affected resident"], humanConsequence: { state: "UNESTABLISHED", subjects: [], facts: [], src: null }, forbidden: [] } } };
  const w1 = p.buildAnglePacket({ cycle: 112, desk: "civic", reporter, story, approach: "x", slice, lane: [] });
  const plan = p.validateAngleOutput({ chase: "Chase the active construction for Test Health Center on this block.", focus: "f", why: "w", checks: [], targets: [], interpretation: "i", unverifiedLead: [], closeQuestion: "q?" }, w1);
  const w3 = p.buildWritePacket({ cycle: 112, desk: "civic", reporter, story, approach: "x", angleInput: w1, anglePlan: plan, interviews: [], lane: [], reviewProfile: { id: "T", canonPolicy: "load-bearing", articleContract: { renderMode: "SOURCE_BRIEF" } } });
  console.log(p.renderSourceBrief(w3));
  '
  # Prints in body:
  # Construction is active for Test Health Center.
  #
  # Calendar: Y3C8, Winter, holiday=none.
  ```
- **Fix:** Exclude `Calendar:` facts (`!/^Calendar:/i.test(row.text)`) in `renderRecordsBrief` (`scripts/livedExperiencePacketV2.js:464`) and `publicBriefFacts` (`scripts/livedExperiencePacketV2.js:521`).

---

### 3. [LOW] Hunt 3 (Ordering and Caps): `Calendar:` is pushed before `prewrite.anchorFacts` / `prewrite.presentFacts` in `buildAnglePacket`, displacing a slice fact from W2 `buildReportPacket`'s 8-fact cap
- **Location:** `pipeline86.patch:138-139` (`scripts/livedExperiencePacket.js:381-382`) interacting with `scripts/livedExperiencePacket.js:791-797` (`buildReportPacket`) and `scripts/cron-desk-writer.js:479-485`
- **Issue:**
  - **`cron-desk-writer.js:479` (`facts[0]` for INTAKE `CLAIM:`) and `task.assignment` (500-char cap):** Clean. `known[0]` in V1 (`known[1]` in V2 after `Current cycle:`) is always `story.label || story.angle` (`assertBase` throws if empty), so `Calendar:` is never `facts[0]` in `renderPacketIntake`, and `Calendar:` goes into `known`, not `task.assignment`.
  - **W2 `buildReportPacket` 8-fact cap (`scripts/livedExperiencePacket.js:796`):** In `buildAnglePacket`, `Calendar:` is pushed at line 382 — **before** `slice.scene.neighborhoodTexture` (`:384`), `prewrite.anchorFacts` (`:392`), and `prewrite.presentFacts` (`:407`). In `buildReportPacket` (`:796`), non-street interviewee `known` claims are capped at 8 (`mine.concat(facts.filter(c => !mine.includes(c))).slice(0, Math.max(8, mine.length))`). For any candidate with `mine.length < 8`, inserting `Calendar:` ahead of `anchorFacts` / `presentFacts` pushes the last slice fact past index 7 and drops it from the W2 interview packet.
- **Verified Repro:**
  ```bash
  node -e '
  const v2 = require("./scripts/livedExperiencePacketV2");
  const story = { ref: "s", label: "L", hookLine: "H" };
  const slice = { prewrite: { anchorFacts: ["Fact 1", "Fact 2", "Fact 3", "Fact 4", "Fact 5", "Fact 6"] } };
  const cand = { pop: "POP-00001", name: "Test Citizen", role: "Worker", hood: "Temescal", profile: "Test Citizen — Worker" };
  const w2_999 = v2.buildReportPacket({ cycle: 999, desk: "business", reporter: { name: "R" }, angleInput: v2.buildAnglePacket({ cycle: 999, desk: "business", reporter: { name: "R" }, story, approach: "a", slice }), anglePlan: {}, story, candidate: cand });
  const w2_112 = v2.buildReportPacket({ cycle: 112, desk: "business", reporter: { name: "R" }, angleInput: v2.buildAnglePacket({ cycle: 112, desk: "business", reporter: { name: "R" }, story, approach: "a", slice }), anglePlan: {}, story, candidate: cand });
  console.log("C999 has Fact 5:", w2_999.known.some(k => k.text === "Fact 5"));
  console.log("C112 has Fact 5:", w2_112.known.some(k => k.text === "Fact 5"));
  '
  # -> C999 has Fact 5: true
  # -> C112 has Fact 5: false
  ```
- **Fix:** Push `calendar` after the `prewrite.presentFacts` loop (`scripts/livedExperiencePacket.js:413`) so all story and slice facts precede `Calendar:` in `known`.

---

### 4. [LOW] Hunt 6 (Test Honesty): `livedExperiencePacket.test.js` only asserts the negative case (`cycle: 999`); deleting the `buildAnglePacket` wiring in `livedExperiencePacket.js` leaves all tests passing
- **Location:** `pipeline86.patch:151-158` (`scripts/livedExperiencePacket.test.js:375-382`) and `pipeline86.patch:90-121` (`scripts/buildWorldSummary.test.js:178-209`)
- **Issue:**
  - **`buildWorldSummary.test.js` (Test 4b):** Uses `fs.mkdtempSync(path.join(os.tmpdir(), 'ws-cal-'))` (never touches repo `output/`) and anchors assertions on the real strings (`K.HOLIDAY_MEANING.SecondDawn`, `'holiday=Creation Day — Creation Day marks the week Civis Systems came online'`). Minor hygiene: `fs.rmSync(tmp, ...)` at line 208 is not in a `try / finally`, and `OpenCourtWeek` (`phase02-world-state/getSimHoliday.js:9`, which also has `type: 'godworld'` but no `HOLIDAY_MEANING` entry) is not explicitly asserted to return `null`.
  - **`livedExperiencePacket.test.js`:** The added block (`:375-382`) only tests `cycle: 999` (`!w1.known.some(c => /^Calendar:/.test(c.text))` and `K.calendarContext(999) === null`). It never tests the positive case that `buildAnglePacket` adds a `Calendar:` claim when a summary exists — even though `moneyW1` at `scripts/livedExperiencePacket.test.js:124` already runs at `cycle: 110`. If lines 381–382 of `scripts/livedExperiencePacket.js` are deleted, both `buildWorldSummary.test.js` and `livedExperiencePacket.test.js` still pass 100%.
- **Verified Repro:**
  ```bash
  node -e '
  const p = require("./scripts/livedExperiencePacket");
  const m110 = p.buildAnglePacket({ cycle: 110, desk: "business", reporter: { name: "T" }, story: { label: "S" }, approach: "a" });
  console.log("C110 calendar claim in moneyW1:", m110.known.find(c => /^Calendar:/.test(c.text)));
  '
  # -> C110 calendar claim in moneyW1: { t: "FACT", text: "Calendar: Y3C6, Winter, holiday=none", src: "output/world_summary_c110.md Calendar context (Simulation_Calendar)" }
  ```
- **Fix:** Assert the positive `Calendar:` claim on `buildAnglePacket` in `scripts/livedExperiencePacket.test.js` (either via a temp root option `slice && slice.root` or guarded on `fs.existsSync('output/world_summary_c110.md')` for `moneyW1`), add `assertEqual('holidayMeaning: OpenCourtWeek carries none', K.holidayMeaning('OpenCourtWeek'), null)` in Test 4b, and wrap `fs.rmSync(tmp, ...)` in `try / finally`.

---

## Clean Hunts (Verified)

### 5. [CLEAN] Hunt 1 (Regex on the Summary Line)
- **Location:** `pipeline86.patch:45` (`scripts/beatSliceKit.js:687`)
- **Verification:** Tested `/^\*\*Calendar context:\*\*\s*(.+?)\s*(?:\|\s*Sports season:.*)?$/m` against all four probes:
  1. Meaning sentence containing `|` (`"... — a | b | Sports season: Oaks | First Friday: false"`) -> `"Y3C27, Summer, holiday=Second Dawn — a | b"` (because the optional group requires literal `|\s*Sports season:`, a bare `|` inside the meaning sentence does not truncate `m[1]`).
  2. Summary line without `| Sports season:` -> `"Y3C27, Summer, holiday=Second Dawn — meaning"` (the optional group takes its empty branch at `$`, so `(.+?)` advances to end-of-line without swallowing `Sports season:` when present).
  3. CRLF (`\r\n`) -> `"Y3C8, Winter, holiday=none"` (`.` does not match `\r`, `$` in `/m` mode matches before `\r`, and `m[1].trim()` strips any trailing whitespace).
  4. Second `**Calendar context:**` line -> `md.match(/.../m)` (non-global) matches only the first header line.
- **Verified Repro:**
  ```bash
  node -e '
  const re = /^\*\*Calendar context:\*\*\s*(.+?)\s*(?:\|\s*Sports season:.*)?$/m;
  for (const [k, s] of [
    ["normal", "**Calendar context:** Y3C27, Summer, holiday=Second Dawn — meaning | Sports season: Oaks | First Friday: false"],
    ["pipe", "**Calendar context:** Y3C27, Summer, holiday=Second Dawn — a | b | Sports season: Oaks | First Friday: false"],
    ["no-sports", "**Calendar context:** Y3C27, Summer, holiday=Second Dawn — meaning"],
    ["crlf+second", "# H\r\n**Calendar context:** Y3C8, Winter, holiday=none | Sports season: off\r\n**Calendar context:** SECOND\r\n"]
  ]) console.log(k, "=>", JSON.stringify(s.match(re)[1].trim()));
  '
  ```

### 6. [CLEAN] Hunt 4 (Require Cycle)
- **Location:** `pipeline86.patch:8-9, 65, 138` (`scripts/beatSliceKit.js:16-17`, `scripts/buildWorldSummary.js:65`, `scripts/livedExperiencePacket.js:381`, `scripts/buildEconomicSlice.js:605, 854`)
- **Verification:** No circular load-order hazard exists across any entry point:
  - `buildEconomicSlice.js` has zero top-level local `require`s and assigns `module.exports = { ..., loadBeatTabs, ... }` at line 854 **before** `if (require.main === module)` at line 878, and requires `./beatSliceKit` lazily inside `buildEconomicSlice()` at line 605.
  - `getSimHoliday.js` has zero `require` calls.
  - `livedExperiencePacket.js` requires `./beatSliceKit` lazily inside `buildAnglePacket()` at line 381.
- **Verified Repro:**
  ```bash
  node -e 'const K = require("./scripts/beatSliceKit"); console.log(typeof K.loadBeatTabs, typeof K.holidayMeaning, typeof K.calendarContext);' && \
  node -e 'const E = require("./scripts/buildEconomicSlice"); const K = require("./scripts/beatSliceKit"); console.log(typeof E.loadBeatTabs, typeof K.calendarContext);' && \
  node -e 'const v2 = require("./scripts/livedExperiencePacketV2"); console.log(v2.buildAnglePacket({ cycle: 112, desk: "civic", reporter: { name: "R" }, story: { label: "S", ref: "r" }, approach: "a" }).known.some(k => /^Calendar:/.test(k.text)));' && \
  node -e 'const ws = require("./scripts/buildWorldSummary"); console.log(ws.emitHeader(131, { Weather: "{}" }, [["3", "27", "x", "Summer", "SecondDawn"]], []).find(l => l.startsWith("**Calendar context:**")));'
  # -> function function function / function function / true / **Calendar context:** Y3C27, Summer, holiday=Second Dawn — ...
  ```

### 7. [CLEAN] Hunt 5 (Canon Leak in Meaning Sentences and `src`)
- **Location:** `pipeline86.patch:23-26, 47` (`scripts/beatSliceKit.js:665-668, 689`)
- **Verification:**
  - Both sentences in `HOLIDAY_MEANING` match the builder-approved 2026-10-07 working lines in `docs/plans/2026-09-29-sim-holiday-calendar.md:257` verbatim. `"Civis Systems"` and `"the Tribune"` are canonical in-world names; no engine/CLI/cron/builder terms appear.
  - `calendar.src` (`output/world_summary_c<cycle>.md Calendar context (Simulation_Calendar)`) matches existing packet `src` conventions (`World_Config/weather snapshot for C<cycle>`, `Simulation_Ledger profile for <pop>`) and stays inside packet metadata / `## INTAKE`, which is stripped before `articleContamination.proseOnly` and `validateEdition` prose checks (once Finding 2 is fixed so `renderRecordsBrief` / `renderSourceBrief` do not print `calendar.text` in the article body).

---

## Verdict

**SHIP-WITH-FIXES**
