# Adversarial Review: Rhea Reads the Citizens' Own Page Lines (Voices)

- **Reviewer:** antigravity
- **Date:** 2026-10-25
- **Target:** `/tmp/claude-0/-root-GodWorld/78b343cd-2ce6-49d7-ac3f-26f773f60c33/scratchpad/rhea-page-lines.patch` (uncommitted working-tree diff of `scripts/cron-rhea-gate.js` + `scripts/cronRheaPersonaGate.test.js`, 74 lines)
- **Task Spec:** `docs/for-claude-review/2026-10-25-rhea-page-lines-review-TASK.md`

---

## Findings

### 1. [HIGH] Hunt 6 (Test Honesty): `pageLinesFromManifest` is completely untested and unexported
- **Location:** `rhea-page-lines.patch:55-65` (`scripts/cronRheaPersonaGate.test.js:97-107`) and `rhea-page-lines.patch:12-22` (`scripts/cron-rhea-gate.js:378-388, 868-876`)
- **Issue:** The unit test never invokes `pageLinesFromManifest` or `loadReviewContext`. Instead, it constructs a pre-populated `pageLines` array by hand (`Object.assign({}, reviewContext, { pageLines: [{ customId: 'cp-POP-TEST-c1-work', name: 'Test Citizen', text: '...' }] })`) and passes it directly into `buildApiPrompt`. `pageLinesFromManifest` is not exported in `module.exports`. As a result, the `src` regex, `scanCitizenPages.loadIndex` lookup, `manifest.approvedSubjects` name resolution, and empty/missing row filtering have zero test coverage — replacing the body of `pageLinesFromManifest` with `return [];` still passes `cronRheaPersonaGate.test.js`.
- **Verified Repro:**
  ```bash
  node -e '
  const g = require("./scripts/cron-rhea-gate");
  console.log("exported pageLinesFromManifest:", typeof g.pageLinesFromManifest);
  '
  # -> exported pageLinesFromManifest: undefined
  ```
- **Fix:** Export `pageLinesFromManifest` from `scripts/cron-rhea-gate.js` and add a direct test in `scripts/cronRheaPersonaGate.test.js` that passes a real-shaped `manifest` (`approvedFacts` containing both `output/citizen_pages/index.jsonl cp-...` and non-page facts, plus `approvedSubjects`) and verifies the returned `{ customId, name, text }` objects.

---

### 2. [MEDIUM] Hunt 1 & Hunt 2 (Regex vs. Real `src` / Subject Name Resolution): Regex matches all admitted `index.jsonl` rows, but `manifest.approvedSubjects` drops non-official Voices citizens who abstain or are untargeted in W2
- **Location:** `rhea-page-lines.patch:14-21` (`scripts/cron-rhea-gate.js:380-387`)
- **Issue:**
  1. **Regex verification (clean):** `buildVoicesSlice.js:116` writes `src: 'output/citizen_pages/index.jsonl ' + d.customId`, while `buildVoicesSlice.js:129` writes the slice-level `ref: 'output/citizen_pages/index.jsonl (self-initiated pages, last 36h) ' + day`. `scanCitizenPages.js:51,64` (`ID_RE = /^cp-(POP-\d{5})-c(\d+)-(.+)$/`) rejects any `customId` without a `cp-` prefix. Across all 2,019 rows in `output/citizen_pages/index.jsonl`, 2,019/2,019 match `/^cp-\S+$/` (0 non-`cp-` IDs, 0 IDs with whitespace). Requiring `(cp-\S+)` also prevents false-matching `(self-initiated` on the slice-level `ref`.
  2. **Name resolution gap (bug):** `pageLinesFromManifest` resolves `name` exclusively via `manifest.approvedSubjects` (`subjects.get(r.popId) || r.popId`). However, in `scripts/livedExperiencePacket.js:918-945`, `packet.exposure.subjects` (which becomes `manifest.approvedSubjects` at `scripts/livedExperiencePacketV2.js:343`) only retains `candidates` in `wanted = new Set([...officialTargets, ...usable.map(q => q.pop)])` — i.e., civic officials (`/council|mayor|official|director|chief/i`) or citizens who landed a usable W2 quote. All 1–4 Voices slice citizens have their page facts placed in `manifest.approvedFacts` and `packet.task.creativeBrief.facts`, but if a non-official citizen (e.g., `Omar Amici`, `Construction laborer`, `POP-00263`) is not targeted by W1 or abstains in W2, they are absent from `manifest.approvedSubjects`. `pageLinesFromManifest` then emits `- POP-00263 [cp-POP-00263-c112-CONVO]: "..."` while the article draft attributes the quote to `"Omar Amici"` (since raw POPIDs are forbidden in prose), breaking owner attribution matching in Rhea.
- **Verified Repro:**
  ```bash
  node -e '
  const fs = require("fs");
  const state = JSON.parse(fs.readFileSync("output/cron-compare/culture_c112_ines-sorensen_packet-v2_x-ai-grok-4-3.state.json", "utf8"));
  // Simulate POP-00263 (Omar Amici, Construction laborer) abstaining in W2 -> omitted from approvedSubjects
  const manifest = Object.assign({}, state.manifest, {
    approvedSubjects: state.manifest.approvedSubjects.filter(s => s.id !== "POP-00263")
  });
  const index = require("./scripts/scanCitizenPages").loadIndex("/root/GodWorld");
  const subjects = new Map(manifest.approvedSubjects.map(s => [s.id, s.name]));
  const row = index.find(r => r.customId === "cp-POP-00263-c112-CONVO");
  console.log("Resolved owner label:", subjects.get(row.popId) || row.popId);
  '
  # -> Resolved owner label: POP-00263
  ```
- **Fix:** When `subjects.get(r.popId)` is missing, fall back to resolving `r.popId`'s `Name` from the ledger (`require('./livedExperiencePacket').ledgerRowForPop(r.popId)?.Name`) before falling back to `r.popId` (or include all slice `candidates` with `cp-*` facts in `exposure.subjects`).

---

### 3. [MEDIUM] Hunt 2 (Weakening & Backend Parity): `APPROVED PAGE LINES` omits the negative-enforcement clause, `--backend=claude` (`buildPrompt`) ignores `reviewContext.pageLines`, and the cited Sat 10-24 verdict did not test page lines
- **Location:** `rhea-page-lines.patch:39-43` (`scripts/cron-rhea-gate.js:507-511`) and `scripts/cron-rhea-gate.js:127-133`
- **Issue:**
  1. **Asymmetric instruction:** In `buildApiPrompt`, section 5 (`EXACT PACKET QUOTE PROVENANCE`, line 506) explicitly pairs its allow-rule with a block-rule: *"Still flag altered text, wrong attribution, or factual prose that the approved facts do not support."* The new `APPROVED PAGE LINES` block (line 509) states only the positive permission (*"A draft passage that is an exact copy of one of these, attributed to its owner, is that citizen's supplied speech: not fabricated, and not a mismatch with the interview quotes above"*). Because Grok emits Voices passages as unquoted paragraphs (`staged.md`, `staged-1814.md`, `staged-2320.md`) while `ines-voices-v1` `canonBlockers` specifies *"a paraphrased quote inside quotation marks"*, the prompt does not explicitly tell Rhea to flag paraphrased/altered unquoted page passages or page lines attributed to the wrong citizen.
  2. **`--backend=claude` (`buildPrompt`) omission:** `loadReviewContext` attaches `pageLines` (line 416), and `buildApiPrompt` renders them (line 507), but `buildPrompt` (`scripts/cron-rhea-gate.js:127-133`, used when `--backend=claude`) only injects `JSON.stringify(reviewContext.manifest)` (where `approvedFacts` are truncated at 500 chars) and never renders `reviewContext.pageLines`.
  3. **Evidence note on Sat 10-24 (`culture_c112_ines-sorensen_packet-v2_x-ai-grok-4-3.rhea.json`):** The Sat 10-24 draft (`draftSha256: a4034759...`) printed the 4 W2 interview quotes from `manifest.approvedQuotes` (`"To be honest, Omar Amici's perspective..."`, `"I've compared notes with Dmitri Soto..."`, etc.), not the 4 `cp-*` page lines. However, the Thu 10-22 re-gate (`staged-1814.json`, `draftSha256: 6a6fb835...`, 4 page lines up to 593 chars) and Fri 10-23 run (`staged-2320.json`, `draftSha256: 9b48a599...`, 532-char page line) *did* print the verbatim page lines and passed Rhea with `pageLinesFromManifest` active.
- **Verified Repro:**
  ```bash
  node -e '
  const g = require("./scripts/cron-rhea-gate");
  const rc = { profile: { id: "ines-voices-v1" }, manifest: { approvedFacts: [] }, audit: { observations: [] },
    pageLines: [{ customId: "cp-POP-00792-c112-work", name: "Bobby Chen-Ramirez", text: "Full page line" }] };
  const claudePrompt = g.buildPrompt("112", "draft.md", "world.md", null, null, rc);
  console.log("claude backend includes pageLines:", claudePrompt.includes("Full page line"));
  '
  # -> claude backend includes pageLines: false
  ```
- **Fix:** Add explicit negative enforcement to `APPROVED PAGE LINES` (*"Still flag altered or paraphrased page text (quoted or unquoted), words added to a page passage, or a page line attributed to a different citizen"*), and include `reviewContext.pageLines` in `buildPrompt` alongside `reviewContext.manifest`.

---

### 4. [LOW] Hunt 4 (Silent Failures): Missing `index.jsonl` or unresolved `customId`s fail silently with zero operator visibility in stdout or `.rhea.json`
- **Location:** `rhea-page-lines.patch:15-22` (`scripts/cron-rhea-gate.js:381-388, 579-583, 806-811`)
- **Issue:** When `wanted.length > 0` (the manifest explicitly cites `citizen_pages/index.jsonl cp-...` facts):
  - If `output/citizen_pages/index.jsonl` is absent, `scanCitizenPages.loadIndex(ROOT)` (`scripts/scanCitizenPages.js:203`) returns `[]` without throwing.
  - If `loadIndex` throws, `catch (_) { return []; }` swallows the error without `log.warn(...)` (unlike every other context loader in `cron-rhea-gate.js` at lines 589, 647, 648, 704, 773).
  - If a `wanted` `customId` is missing from `index.jsonl` or has empty `content`, `.filter(r => r && r.content)` silently drops it.
  - Neither the console header (`review profile: ...` at line 580) nor `out.reviewProfile` in `.rhea.json` (line 806) records how many `pageLines` were wanted vs. resolved. If the index is stale or missing, the gate silently regresses to judging against the 500-char-truncated `manifest.approvedFacts`.
- **Verified Repro:**
  ```bash
  node -e '
  const g = require("./scripts/cron-rhea-gate");
  const rc = g.loadReviewContext("ines-sorensen", "output/cron-compare/culture_c112_ines-sorensen_packet-v2_x-ai-grok-4-3.state.json", "# Draft");
  console.log("wanted cp-* facts:", rc.manifest.approvedFacts.filter(f => /citizen_pages\/index\.jsonl (cp-\S+)/.test(f.src)).length);
  console.log("resolved pageLines:", rc.pageLines.length);
  '
  # -> wanted cp-* facts: 4, resolved pageLines: 4 (0 logged in stdout or .rhea.json reviewProfile)
  ```
- **Fix:** Log `log.warn` if `loadIndex` throws or if `resolved.length < wanted.length`, print `pageLines=<resolved>/<wanted>` in the `review profile:` console line when `wanted.length > 0`, and record `pageLines: (reviewContext.pageLines || []).map(p => p.customId)` in `out.reviewProfile`.

---

### 5. [LOW] Hunt 3 (Prompt Size): Uncapped `r.content` injection is safe for current Voices slices (~2.5–13 KB) but has no per-page ceiling
- **Location:** `rhea-page-lines.patch:20-21, 42` (`scripts/cron-rhea-gate.js:386-387, 510`)
- **Issue:** Neither `lib/citizenPage.js:136`, `scripts/scanCitizenPages.js:250`, nor `pageLinesFromManifest` enforces a character cap on `r.content`.
  - Across the 614 self-initiated rows (`SELF_SLOTS = /^(morning|midday|afternoon|evening|night|work|CONVO)$/`) in `output/citizen_pages/index.jsonl`, 316 exceed 500 chars and the 4 longest rows are `4,083 + 3,600 + 2,561 + 2,417 = 12,661` chars (~3.2K tokens). On C112 Saturday (`culture_c112_ines-sorensen_packet-v2_x-ai-grok-4-3.state.json`), the 4 `pageLines` (`489`, `537`, `594`, `665` chars) added `2,489` chars to an `86,192`-char base prompt (`88,681` chars total).
  - Across *all* 2,019 rows in `output/citizen_pages/index.jsonl` (including `PRESS` rows), the single longest row is `21,460` chars (`cp-POP-00004-c102-PRESS`) and the top 4 total `74,989` chars.
- **Verified Repro:**
  ```bash
  node -e '
  const rows = require("./scripts/scanCitizenPages").loadIndex("/root/GodWorld");
  const self = rows.filter(r => /^(morning|midday|afternoon|evening|night|work|CONVO)$/.test(r.slot));
  console.log("max self-slot len:", Math.max(...self.map(r => (r.content || "").length)));
  console.log("max all-slot len:", Math.max(...rows.map(r => (r.content || "").length)));
  '
  # -> max self-slot len: 4083, max all-slot len: 21460
  ```
- **Fix:** Apply a generous safety ceiling per page in `pageLinesFromManifest` (e.g., `String(r.content).slice(0, 8000)`), which preserves 100% of self-initiated pages whole while bounding pathological rows.

---

### 6. [LOW] Hunt 5 (Advisory Remnants): Code is clean and fail-closed (S333 shape restored); 10 on-disk C112 `.rhea.json` artifacts still carry `"advisory": true`
- **Location:** `scripts/cron-rhea-gate.js:756-758, 791` and `rhea-page-lines.patch:67-72` (`scripts/cronRheaPersonaGate.test.js:109-114`)
- **Issue:**
  - **Code:** All advisory machinery (`settleModelFlags`, `rheaAdvisory`, severity downgrading) is removed from `scripts/cron-rhea-gate.js`, `scripts/newsroom-wake-packages.json`, and `scripts/newsroomWakePackages.js`. `flagsArr` and `highSevCount` are computed directly from `verdict.flags`, and `gatePass` enforces `verdict.pass === true && Array.isArray(verdict.flags) && highSevCount === 0 && detBlockers.length === 0`.
  - **On-disk artifacts:** 10 root `.rhea.json` files in `output/cron-compare/` written on Oct 23–24 (including `culture_c112_ines-sorensen_packet-v2_x-ai-grok-4-3.rhea.json:8`) still carry `"advisory": true` in their JSON payload. Inspection confirmed all 10 had `flagCount: 0, highSeverityCount: 0, flags: []` directly from the model (zero high-severity flags were downgraded to pass).
- **Verified Repro:**
  ```bash
  node scripts/cronRheaPersonaGate.test.js
  # -> cronRheaPersonaGate.test.js: PASS
  ```

---

## Verdict

**SHIP-WITH-FIXES**
