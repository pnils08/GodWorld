# Adversarial Review — Lives Thread Slice (`c0ffd241`)

- **Reviewer:** `antigravity`
- **Date:** 2026-10-25
- **Target commit:** `c0ffd241` (`scripts/buildLivesSlice.js`, `scripts/buildLivesSlice.test.js`)
- **Task brief:** `docs/for-claude-review/2026-10-25-lives-thread-slice-review-TASK.md`
- **Mode:** Read-only adversarial review (no code edits, no Sheet/cron calls)

---

## Executive Summary

| Hunt | Surface | Verdict | Highest-Severity Finding |
|---|---|---|---|
| **1** | Covered list (`lives_covered.json`) | **REAL** | `covered[f.id]` stamps the slice-build `cycle` (`C112`) instead of the event's own `e.cycle` (`C111`), so `threadFor`'s `"Lives already wrote this person: <kind> (C<cycle>)"` misstates when the event happened (`buildLivesSlice.js:159, 266`). Also, when all events/moments/stays are covered (`!todays.length && !moments.length && !stays.length`), `build()` returns `K.emptySlice(...)` at `:217` before `writeCovered` at `:267`, skipping the 2-cycle prune on empty days. Thread facts themselves lacking `id` is **FALSE-POSITIVE** for external consumers (`buildVoicesSlice.js:106` only reads `{ popid, cycle }`). |
| **2** | Wrong person / subject vs survivor | **REAL** (3 bugs) | (2a) `leadName` fallback at `buildLivesSlice.js:270` falls back to `lead.subjectName` (or `undefined`) when the survivor (`personFor(lead)`) is absent from `Simulation_Ledger` `profiles` — and `dumpBeatTabs.js:107-118` sets `deceasedName` (not `subjectName`) on death rows while omitting `recipients[0].name`, handing the deceased's name or `undefined` to `hookLine` (`:278`). (2b) `seenPop` (`:185`) tracks `personFor(e)` (the survivor), not `e.subject` (the deceased), and `stays` (`:204-214`) never checks whether a citizen is living/in `profiles`, so a deceased citizen with an unclosed `Hospital_Ledger` row is selected as `"still in hospital care"` alongside their own death. (2c) `stays` uses `s.name || 'a citizen'` in the lead fact (`:251`) but `nameOf(s.pop, s.name)` (`profiles.get(pop).Name || fallback`) in `threadFor` (`:252`), emitting two different names for the same person when `Hospital_Ledger.Name` is blank or lags `Simulation_Ledger.Name`. |
| **3** | Gate leak in `tribuneByPop` | **REAL** (3 leaks) | (3a) `buildLivesSlice.js:122` checks `(a.canon === true || a.published === true) && a.stage !== 'canon-violation'`, which admits **51 `stage: 'passed-gate-not-printed'` staged drafts** (cut at Saturday compile, never printed, and governed by the S332 probation wall at `cron-desk-run.js:3124`), plus `stage: 'passed-gate-cycle-open'`, `source: 'lore'` (`stage: 'lore-passed-gate'`), `source: 'profile'`, and `source: 'shelf-only'`. (3b) `buildArticleIndex.js:400` falls back to the first body paragraph when a file lacks a `#` headline, and `buildLivesSlice.js:161` slices `a.title` at 90 chars — verified live on C112 Day 2 (`POP-00280`), which emits `the Tribune named them in “It was 7:40 a.m. at 12th Street Oakland City Center Station when Eleanor Rivera noticed th” (Civic, C108)` (`b9d69e5ad7c746b3`). (3c) `archive/ARTICLE_INDEX.jsonl` contains `canon: true, published: true` rows whose `title` is `“######################################################”` (`c498070d7a415087`) or fourth-wall builder instructions (`a314379b360d4908`: `"Here’s a quick, plug‑and‑play way to make your 2030s A’s legends feel as “real” as Reggie and Giambi..."`). |
| **4** | Slice size (~40 facts) vs downstream caps | **REAL** (critical) | On live C112 Day 1, `buildLivesSlice` produces **40 facts across 7 people** (8 facts for person #1, 5 for person #2, etc.). Downstream, `livedExperiencePacket.js:210` (`creativeBriefFromSlice`) and `cron-desk-run.js:888` (`### YOUR BEAT SLICE`) both hard-cap `prewrite.anchorFacts.slice(0, 12)`. Because thread facts are interleaved directly under each person's event (`[event1, thread1_1..7, event2, thread2_1..4, ...]`), **the first 2 people consume all 12 slots and people #3 through #7 (5 of 7 people on C112 Day 1) are completely cut off** from `creativeBrief.facts` and `### YOUR BEAT SLICE`. Worse, W2 (`buildReportPacket` at `livedExperiencePacket.js:785`) caps `known` at `.slice(0, 8)` (2 header facts + 6 facts from person #1), so interviewees #2–#4 receive zero facts about themselves during W2 interviews. |
| **5** | Rhea / `auditArticle` / `SOURCE_BRIEF` | **REAL** (3 traps) | (5a) In `livedExperiencePacketV2.js:693-694`, when `manifest.approvedQuotes` is empty (`!approvedQuoteNorms.length`, i.e., no W2 quote landed or no citizen wrote a page), line 693 (`if (!approvedQuoteNorms.length && norm.split(' ').length >= 5 && !isSignage(quote, bodyText)) return true`) executes **before** line 694 (`if (approvedRecordNorm.includes(norm)) return false`). Because `threadFor` wraps Tribune titles in `“...”` (`buildLivesSlice.js:161`), **if Tamsin repeats any 5+-word Tribune headline from a thread fact in quotation marks when `approvedQuotes` is empty, `auditArticle` deterministically fails with `UNAPPROVED_QUOTE`**. (5b) `pageVoices` (`ownPageLines`, `buildLivesSlice.js:256-260`) is never added to `facts` (`approvedFacts`) or `approvedQuotes`, and carries no `citizen_pages/index.jsonl cp-<id>` `src` tag in `facts` for `cron-rhea-gate.js:380` (`pageLinesFromManifest`). Quoting a citizen's own page from `pageVoices` (as `newsroom-wake-packages.json:1560` instructs Tamsin to do) trips `UNAPPROVED_QUOTE` / `UNAPPROVED_NUMBER` in `auditArticle` and misses Rhea's `pageLinesFromManifest` check. (5c) Truncating `a.title` at `.slice(0, 90)` (`buildLivesSlice.js:161`) can cleave a multi-digit number at character 90, putting the truncated fragment into `allowedNumbers` (`livedExperiencePacketV2.js:675`). |
| **6** | Sort / filter / window in `threadFor` | **REAL** (4 bugs) | (6a) **Live C112 tier-contamination bug:** `threadFor` (`buildLivesSlice.js:150-153`) checks `!OWN_EVENT_TAG` and `!NOISE_TAG` (`^(Daily|Micro-Event)/i`) but **omits `!LOG_NOISE.test(t)`** (`^(Emerged into Tier-|Intake\b|Tier-\d|Roster\b)/i`, which IS checked in `cameNext` at `:71` and `moments` at `:195`). Worse, `SIGNAL_TAG` (`:110`) includes `Advancement`, which is the tag used on `Intake at Tier N. Media usage...` rows. On live C112 Day 2, `buildLivesSlice` injects `on the log, C111: Intake at Tier 3...` (`POP-00280`, facts #2 and #5) and `Intake at Tier 4...` (`POP-00241`, fact #12) directly into Tamsin's slice! (6b) **Dropped promotion detail:** `kindLine` for `promotion` (`:65`) only prints `roleType`, while `OWN_EVENT_TAG` (`:108, :152`) strips `EventTag === 'Promotion'` from the thread — deleting the actual promotion text (`"Got the nod for the lead role at AC Transit after 14 years as a Janitor"`, `POP-00280`). Meanwhile `SIGNAL_TAG` (`:110`) lists `Promotion` (dead code because `OWN_EVENT_TAG` already stripped it) and `LifeEvent-Promotion` (which is a mood/composure dial tag `LifeEvent-Promotion-Up-S`, not a job promotion). (6c) **Un-deduplicated log lines & pre-sort slice:** `threadFor` (`:155-156`) does not deduplicate identical `EventText` rows for the same citizen (35 citizens in C112 `LifeHistory_Log.jsonl` have duplicate `EventText` rows, e.g. `POP-00003`) and slices `.slice(0, 4)` *before* `.sort((a, b) => Number(a.Cycle) - Number(b.Cycle))`. (6d) **Unconditional `OWN_EVENT_TAG` across event kinds:** `OWN_EVENT_TAG` strips `Recovery|Hospitalized|Critical|Birth|Retirement|Promotion|Death` even when today's passage for that citizen is a `moment` or a different event kind. |
| **7** | Test suite (`buildLivesSlice.test.js`) | **REAL** (4 gaps) | (7a) `buildLivesSlice.test.js:105` uses `findIndex` (which only checks the *first* `thread` fact for `POP-90004` sits at `hospitalIdx + 1`); if the remaining thread facts for `POP-90004` were appended at the bottom of `day1.facts`, the assertion still passes. (7b) `buildLivesSlice.js:158-159` (`'Lives already wrote this person: ...'`) has **0% test coverage** despite the comment at `buildLivesSlice.test.js:65` claiming `"what Lives wrote earlier"` is tested. (7c) `buildLivesSlice.test.js:76` injects a `cycle + 1` (`112`) row into a `cycle = 111` dump to test `cameNext`, an impossible state in production because `dumpBeatTabs.js:100` filters `c <= stamp`. (7d) The test fixture uses bare `EventTag: 'Strain'` / `'Promotion'` instead of production pipe-delimited tags and never tests `LOG_NOISE` (`Intake at Tier 3`) inside `threadFor` or `stage: 'passed-gate-not-printed'` inside `tribuneByPop`. |

---

## Detailed Findings by Hunt

### Hunt 1 — Covered List (`lives_covered.json`)

- **Verdict:** **REAL** (for `before` cycle attribution inside `threadFor` and empty-day pruning; **FALSE-POSITIVE** for external consumer `buildVoicesSlice.js`).
- **Locations:**
  - `scripts/buildLivesSlice.js:47-53` (`writeCovered`)
  - `scripts/buildLivesSlice.js:158-159` (`before` in `threadFor`)
  - `scripts/buildLivesSlice.js:216-217` (early return before `writeCovered`)
  - `scripts/buildLivesSlice.js:240-253, 266-267` (`covered` population)
  - `scripts/buildVoicesSlice.js:73, 106` (only external consumer of `lives_covered.json`)

#### 1a. External consumer impact of thread facts having no `id` — `FALSE-POSITIVE`
- Thread facts returned by `threadFor` (`scripts/buildLivesSlice.js:136-163`) have `{ text, src }` and are pushed at lines `242`, `247`, and `252` as `{ ...t, kind: 'thread', popid }` with no `id`.
- At `scripts/buildLivesSlice.js:266`:
  ```js
  for (const f of facts) if (f.id) covered[f.id] = { popid: f.popid, kind: f.kind, cycle: Number(cycle), day };
  ```
- Only lead facts (`todays`, `moments`, `stays`) carry `f.id`, so thread facts are not written to `output/cron-compare/lives_covered.json`.
- A repo-wide search confirms the only external consumer of `lives_covered.json` / `coveredPath` is `scripts/buildVoicesSlice.js:73, 106`:
  ```js
  const byLives = Object.values(livesCovered).find(v => v && v.popid === d.popid && Number(v.cycle) >= Number(cycle) - 1);
  ```
  Because every `thread` fact on a slice shares its `popid` with the parent lead fact (which *does* have `f.id` and *is* written to `covered`), `buildVoicesSlice.js` sees the exact same set of `popid`s.

#### 1b. `covered[f.id].cycle` records the slice-run cycle instead of `e.cycle`, corrupting `threadFor`'s `"Lives already wrote this person"` line — `REAL`
- **Where:** `scripts/buildLivesSlice.js:266` and `scripts/buildLivesSlice.js:158-159`.
- **Mechanism:** Line 266 writes `cycle: Number(cycle)` (the current slice build cycle, e.g., `112`) rather than the event's own cycle (`e.cycle`, e.g., `111`). In live `output/cron-compare/lives_covered.json:8-13`:
  ```json
  "birth:POP-00892:111": {
    "popid": "POP-00892",
    "kind": "birth",
    "cycle": 112,
    "day": "2026-10-19"
  }
  ```
  When `POP-00892` later appears in a `moment` or `stay` (e.g., on Day 2 or in C113), `threadFor` (`scripts/buildLivesSlice.js:158-159`) formats:
  ```js
  if (before.length) out.push({ text: who + 'Lives already wrote this person: ' + before.map(([, v]) => v.kind + ' (C' + v.cycle + ')').join(', '), src: 'output/cron-compare/lives_covered.json' });
  ```
  This emits `Geneva Zhou — Lives already wrote this person: birth (C112)` for a birth that happened in `C111` (`birth:POP-00892:111`), creating a direct cycle-number contradiction against the C111 birth log/event record.
- **Concrete input that breaks it:**
  - Day 1 at `cycle = 112`: `Lived_Events` has `{ id: 'birth:POP-00892:111', kind: 'birth', cycle: 111, subject: 'POP-00892', subjectName: 'Geneva Zhou' }`. `covered['birth:POP-00892:111']` is saved with `cycle: 112`.
  - Day 2 at `cycle = 112`: `LifeHistory_Log` has a `Relationship` row for `POP-00892` at `Cycle: '112'`, picking `POP-00892` as a `moment`. `threadFor` emits:
    `Geneva Zhou — Lives already wrote this person: birth (C112)` even though her birth was in C111.

#### 1c. Empty-day early return skips `writeCovered` pruning — `REAL` (minor)
- **Where:** `scripts/buildLivesSlice.js:216-217` vs `scripts/buildLivesSlice.js:47-53, 267`.
- **Mechanism:** When `!todays.length && !moments.length && !stays.length` (e.g., Day 3 in `buildLivesSlice.test.js:126` or any late-cycle day after events are exhausted), `build()` returns `K.emptySlice(...)` at line 217 before reaching `writeCovered(root, covered, cycle)` at line 267. Entries in `lives_covered.json` older than `Number(cycle) - 2` are not pruned on empty days.

---

### Hunt 2 — Wrong Person (Subject vs Survivor, Missing Profile, Deceased in Stays)

- **Verdict:** **REAL** (3 distinct bugs).
- **Locations:**
  - `scripts/buildLivesSlice.js:62-66` (`kindLine`)
  - `scripts/buildLivesSlice.js:76-79` (`personFor`)
  - `scripts/buildLivesSlice.js:185` (`seenPop`)
  - `scripts/buildLivesSlice.js:204-214` (`stays` filter)
  - `scripts/buildLivesSlice.js:226, 234-253, 270-278` (`nameOf`, `leadName`, `hookLine`)
  - `scripts/dumpBeatTabs.js:107-118` (`Lived_Events.jsonl` serialization)
  - `lib/wakePerception.js:755-778` (`livedEventsFrom` death event shape)

#### 2a. Death event `leadName` / `kindLine` mismatch with `dumpBeatTabs.js` and `profiles` fallback — `REAL`
- **Where:** `scripts/buildLivesSlice.js:63, 76-79, 270, 278` and `scripts/dumpBeatTabs.js:107-118`.
- **Mechanism:**
  1. Look at how `scripts/dumpBeatTabs.js:107-118` actually writes a `death` row to `output/beats/Lived_Events.jsonl`:
     ```js
     return {
       id: e.id, kind: e.kind, cycle: e.cycle, subject: e.subject,
       subjectName: [p[iFirst], p[iLast]].filter(Boolean).join(' ').trim(),
       neighborhood: p[iHood] || '', roleType: p[iRole] || '',
       ...(e.phase ? { phase: e.phase } : {}),
       ...(e.cause ? { cause: e.cause } : {}),
       ...(e.deceasedName ? { deceasedName: e.deceasedName } : {}),
       recipients: e.recipients
     };
     ```
     And in `lib/wakePerception.js:777`:
     ```js
     out.push({ id: uid(`death:${d.pop}:${d.c}`), kind: 'death', cycle: d.c, subject: d.pop, recipients: cand, deceasedName: name });
     ```
     Notice two things in `dumpBeatTabs.js:107-118`:
     - First, `byPop` in `dumpBeatTabs.js:104` only indexes `Simulation_Ledger` (and for a deceased citizen who was moved to `Citizen_Archive`, `p` in `Simulation_Ledger` may be empty or still present with `Status: 'Deceased'`), while `e.recipients` from `livedEventsFrom` (`lib/wakePerception.js:759`) is `[{ pop: 'POP-XXXXX', rel: 'spouse' }]` — **it has NO `.name` property on `recipients[0]`**!
     - Yet `kindLine(e)` at `scripts/buildLivesSlice.js:63` reads:
       ```js
       if (e.kind === 'death') { const r = (e.recipients || [])[0]; return `${(r && r.name) || 'Someone'} lost ${e.deceasedName || name} (${r ? r.rel : 'close'}, C${e.cycle})`; }
       ```
       Because `dumpBeatTabs.js` never populates `r.name` on `e.recipients[0]`, `(r && r.name)` is always `undefined` in real beat dumps! Thus `kindLine(e)` always emits **`"Someone lost <deceasedName> (spouse, C112)"`** even when the survivor is in `Simulation_Ledger`! (The unit test at `buildLivesSlice.test.js:29` hand-crafted `recipients: [{ pop: 'POP-90005', name: 'Test Widow', rel: 'spouse' }]`, masking the fact that `dumpBeatTabs.js` never writes `r.name`.)
  2. Now look at `leadName` at `scripts/buildLivesSlice.js:270`:
     ```js
     const leadName = lead ? ((people.find(p => p.popid === String(personFor(lead) || '').toUpperCase()) || {}).name || lead.subjectName) : ...
     ```
     When `lead` is a `death` event and the survivor (`personFor(lead)` = `e.recipients[0].pop`) is **not** in `profiles` (`Simulation_Ledger.jsonl` snapshot), `people.find(...)` returns `undefined`, so `:270` falls back to `lead.subjectName` — which is the **deceased's** name (`subject` is `d.pop`, the deceased)!
     Then `hookLine` (`:278`) becomes:
     `"<Deceased Name> first. The event is the lead; one true detail; what came next only if the record says."` — instructing Tamsin to lead with the dead citizen while `threadFor` (`:242`) emitted the thread for the survivor (`personFor(e)`).
- **Concrete input that breaks it:**
  - Real `dumpBeatTabs.js` output for a death event:
    `{ id: 'death:POP-90099:112', kind: 'death', cycle: 112, subject: 'POP-90099', subjectName: 'Test Departed', deceasedName: 'Test Departed', recipients: [{ pop: 'POP-90005', rel: 'spouse' }] }`.
  - Even if `POP-90005` (`Test Widow`) IS in `Simulation_Ledger.jsonl`, `kindLine(e)` at `buildLivesSlice.js:63` evaluates `(r && r.name) || 'Someone'` → **`"Someone lost Test Departed (spouse, C112)"`**.
  - And if `POP-90005` is missing from `Simulation_Ledger.jsonl`, `leadName` at `buildLivesSlice.js:270` evaluates to `'Test Departed'` (the deceased), while `threadFor` pulls log/Tribune lines for `POP-90005` under the name `'This person — '`.

#### 2b. Deceased citizen can be selected in `stays` (or `moments`) alongside their own death — `REAL`
- **Where:** `scripts/buildLivesSlice.js:185` (`seenPop`) and `scripts/buildLivesSlice.js:204-214` (`stays`).
- **Mechanism:**
  - Line 185 initializes `seenPop` with `personFor(e)`:
    ```js
    const seenPop = new Set(todays.map(e => String(personFor(e) || '').toUpperCase()));
    ```
    For a `death` event, `personFor(e)` is `e.recipients[0].pop` (the survivor), **not** `e.subject` (the deceased). `e.subject` is never added to `seenPop`.
  - At lines 204–214, `stays` iterates `beats.Hospital_Ledger`:
    ```js
    for (const r of beats.Hospital_Ledger || []) {
      const pop = String(r.POPID || '').toUpperCase();
      if (!/^POP-\d{5}$/.test(pop) || seenPop.has(pop)) continue;
      if (String(r.DischargeCycle || '').trim()) continue;
      if (/^(discharged|recovered|deceased)$/i.test(String(r.StatusNow || '').trim())) continue;
    ```
    Notice `stays` never checks whether `pop` is alive in `profiles` (or whether `events.some(e => e.kind === 'death' && e.subject === pop)`). If a citizen dies in `C112` while having an unclosed prior `Hospital_Ledger` row (`DischargeCycle: ''`, `StatusNow: 'critical'` or `' hospitalized'`), `stays` selects the deceased citizen as `"<Deceased> is still in hospital care"` in the very same slice that reports their death!
- **Concrete input that breaks it:**
  - `Lived_Events`: `[{ id: 'death:POP-90099:112', kind: 'death', cycle: 112, subject: 'POP-90099', deceasedName: 'Test Departed', recipients: [{ pop: 'POP-90005', name: 'Test Widow', rel: 'spouse' }] }]`
  - `Hospital_Ledger`: `[{ AdmissionId: 'H-C110-POP-90099', POPID: 'POP-90099', Name: 'Test Departed', AdmitCycle: '110', DischargeCycle: '', StatusNow: 'critical', Cause: 'stroke' }]`
  - Result: Fact #1 says `"Test Widow lost Test Departed (spouse, C112)"`, and the `stay` fact in the same slice says `"Test Departed is still in hospital care — admitted C110 for stroke, 2 cycles so far"`.

#### 2c. Name discrepancy between lead `stay` fact and its `threadFor` facts — `REAL`
- **Where:** `scripts/buildLivesSlice.js:212, 226, 251-252`.
- **Mechanism:**
  - Line 212 stores `name: String(r.Name || '').trim()` from `Hospital_Ledger`.
  - Line 251 formats the lead stay fact using `(s.name || 'a citizen')`.
  - Line 252 calls `threadFor(s.pop, { name: nameOf(s.pop, s.name), ... })`, where `nameOf` (`:226`) prefers `profiles.get(pop).Name` over `s.name`, and `threadFor` (`:137`) falls back to `'This person'` if `name` is `''`.
- **Concrete input that breaks it:**
  - `Hospital_Ledger` row has `POPID: 'POP-00500', Name: ''` (blank name on the hospital tab) and `POP-00500` is not in `profiles`:
    - Lead fact (`:251`): `"a citizen is still in hospital care — admitted C109..."`
    - Thread fact (`:252` / `:137`): `"This person — on the log, C111: ..."`
    - `label` (`:270-271` when `stays[0]` is lead): `" still in hospital care"` (leading space, empty `leadName` because `:270` uses `stays[0].name` directly without `nameOf` or `'a citizen'` fallback!).

---

### Hunt 3 — Gate Leak in `tribuneByPop` (`archive/ARTICLE_INDEX.jsonl`)

- **Verdict:** **REAL** (verified against live `archive/ARTICLE_INDEX.jsonl` and live C112 slice runs).
- **Locations:**
  - `scripts/buildLivesSlice.js:116-131` (`indexTribuneByPop`)
  - `scripts/buildLivesSlice.js:160-161` (Tribune thread emission in `threadFor`)
  - `scripts/buildArticleIndex.js:399-413` (`indexStaged`, `headerTitle`)
  - `scripts/cron-desk-run.js:3114-3126` (S332 probation wall contract)

#### 3a. `passed-gate-not-printed` and `passed-gate-cycle-open` staged drafts leak across the S332 probation wall — `REAL`
- **Where:** `scripts/buildLivesSlice.js:122`:
  ```js
  if (!(a.canon === true || a.published === true) || a.stage === 'canon-violation') continue;
  ```
- **Mechanism:**
  In `scripts/buildArticleIndex.js:407`, every staged weekday draft in `output/cron-compare/staged/*.staged.json` that passed Rhea is indexed with:
  ```js
  canon: !violation,
  published: false,
  source: 'staged',
  stage: violation ? 'canon-violation' : (printed ? 'printed' : (c !== null && c < latestEditionCycle ? 'passed-gate-not-printed' : 'passed-gate-cycle-open'))
  ```
  And `scripts/cron-desk-run.js:3124` explicitly states the S332 contract on those staged sidecars:
  > `note: 'M–F probation wall (S332): retrievable by the Saturday compile ONLY; NOT canon fact. Reporters/sift must not cite staged drafts.'`
  Because `buildArticleIndex.js` sets `canon: true` on all non-violating staged drafts, `buildLivesSlice.js:122` (`a.canon === true || a.published === true`) admits:
  - **51 rows** with `stage: 'passed-gate-not-printed', published: false` (drafts that were **cut at Saturday compile and never printed in The Bay Tribune**),
  - Any `stage: 'passed-gate-cycle-open', published: false` weekday drafts from the open cycle,
  - **9 rows** with `source: 'lore', stage: 'lore-passed-gate', published: false`,
  - **28 rows** with `source: 'profile', type: 'profile'` (internal citizen dossiers, `desk: null` → `(desk unknown)`),
  - **13 rows** with `source: 'shelf-only', published: false`.
  For all of these, `threadFor` (`buildLivesSlice.js:161`) tells Tamsin: `'the Tribune named them in “...”'` — claiming the paper printed a piece that was never published!
- **Concrete input that breaks it:**
  - Live `archive/ARTICLE_INDEX.jsonl` row `id: "1a07a11e7c9e6b70"` (`cycle: 112`, `desk: "Civic"`, `published: false`, `canon: true`, `stage: "passed-gate-not-printed"`, naming `POP-00199` Jackson Sift):
    If `POP-00199` has a moment/event, `tribuneByPop` emits:
    `Jackson Sift — the Tribune named them in “Jackson Sift is one of four residents whose days sit inside this cycle’s weather record. S” (Civic, C112)` — citing an unprinted C112 staged draft whose "title" is its truncated opening body sentence.

#### 3b. Body-sentence fallback titles and mid-word 90-char truncation in live C112 slices — `REAL`
- **Where:** `scripts/buildArticleIndex.js:400` (`headerTitle`) and `scripts/buildLivesSlice.js:161` (`String(a.title || '').slice(0, 90)`).
- **Mechanism:** When an archived or staged markdown file has no `# ` heading, `headerTitle` (`buildArticleIndex.js:50-58`) grabs the first non-meta body line up to 200 chars. `buildLivesSlice.js:161` then blindly slices `a.title` at 90 characters and wraps it in `“...”`.
- **Concrete input that breaks it (verified on live C112 Day 2):**
  - On live C112 Day 2, `POP-00280` (Jerald Jensen) matches `archive/ARTICLE_INDEX.jsonl` entry `b9d69e5ad7c746b3` (`cycle: 108`, `desk: "Civic"`, `published: true`, `canon: true`, `title: "It was 7:40 a.m. at 12th Street Oakland City Center Station when Eleanor Rivera noticed the platform display flickering..."`).
  - `buildLivesSlice(112, { day: '2026-10-20' })` emits Fact #8:
    `Jerald Jensen — the Tribune named them in “It was 7:40 a.m. at 12th Street Oakland City Center Station when Eleanor Rivera noticed th” (Civic, C108)`

#### 3c. Hash-divider and fourth-wall builder prompt "titles" in `canon: true, published: true` rows — `REAL`
- **Where:** `archive/ARTICLE_INDEX.jsonl` rows `c498070d7a415087` and `a314379b360d4908`, read by `scripts/buildLivesSlice.js:121-126`.
- **Concrete inputs in live `archive/ARTICLE_INDEX.jsonl` that break it:**
  1. Row `c498070d7a415087` (`published: true, canon: true, desk: "Sports"`): `title` is `"######################################################"` (54 `#` characters) and `citizens` includes `POP-00018`, `POP-00024`, `POP-00025`, `POP-00033`, `POP-00527`, `POP-00533`. Any event/moment for those citizens emits:
     `<Name> — the Tribune named them in “######################################################” (Sports)`
  2. Row `a314379b360d4908` (`published: true, canon: true, desk: "Sports"`): `title` is `"Here’s a quick, plug‑and‑play way to make your 2030s A’s legends feel as “real” as Reggie and Giambi—by translating your fiction stats into era‑neutral benchmarks..."` and `citizens` includes `POP-00001`, `POP-00018`, `POP-00019`. Any event/moment for those citizens injects fourth-wall meta-instructions (`"your fiction stats"`, `"Reggie and Giambi"`) directly into Tamsin's slice facts.

---

### Hunt 4 — Slice Size (~40 Facts) vs Downstream Caps

- **Verdict:** **REAL** (Critical — silently drops 5 of 7 citizens on live C112 Day 1 from `creativeBrief.facts` and `### YOUR BEAT SLICE`, and drops interviewees #2–#4 from W2 `packet.known`).
- **Locations:**
  - `scripts/buildLivesSlice.js:234-253` (interleaved `[event, ...thread]` push order in `facts`)
  - `scripts/beatSliceKit.js:219` (`anchorFacts = facts.map(f => f.text)`)
  - `scripts/livedExperiencePacket.js:210` (`creativeBriefFromSlice`: `facts: uniq(prewrite.anchorFacts).slice(0, 12)`)
  - `scripts/cron-desk-run.js:888` (W3 prompt `### YOUR BEAT SLICE`: `bs.prewrite.anchorFacts.slice(0, 12)`)
  - `scripts/cron-desk-run.js:1993` (legacy W1 prompt: `bs.prewrite.anchorFacts.slice(0, 12)`)
  - `scripts/livedExperiencePacket.js:785` (W2 `buildReportPacket`: `known = ... .slice(0, 8)`)

#### 4a. `.slice(0, 12)` in `creativeBriefFromSlice` and `### YOUR BEAT SLICE` starves citizens #3–#9 — `REAL`
- **Mechanism:**
  - Before `c0ffd241`, `buildLivesSlice.js` produced 1 fact per person (up to `4 + 3 + 2 = 9` facts total), so all 9 people fit comfortably inside `.slice(0, 12)` at `scripts/livedExperiencePacket.js:210` and `scripts/cron-desk-run.js:888`.
  - After `c0ffd241`, `buildLivesSlice.js:240-253` pushes up to 9 thread facts (`1 stay + 4 log + 1 covered + 3 tribune`) **immediately after each person's lead fact** before moving to the next person:
    `[Person1_Event, Person1_Thread1..7, Person2_Event, Person2_Thread1..4, Person3_Event, ...]`.
  - Downstream:
    1. `scripts/livedExperiencePacket.js:210` builds `packet.task.creativeBrief.facts` (used in W1 and W3 packets) via:
       ```js
       facts: uniq(prewrite.anchorFacts).slice(0, 12),
       ```
    2. `scripts/cron-desk-run.js:888` renders the `### YOUR BEAT SLICE` markdown block in the W3 writer prompt via:
       ```js
       for (const f of bs.prewrite.anchorFacts.slice(0, 12)) L.push('  - ' + f);
       ```
  - Because `Person1` + `Person2` alone occupy 12–16 lines of `prewrite.anchorFacts`, **every person from #3 onward (and all `moments` and `stays`) is completely cut off at index 12** in both `creativeBrief.facts` and `### YOUR BEAT SLICE`!
  - Meanwhile, `story.angle` (`buildLivesSlice.js:277`) still tells the writer `'7 people — ...'` and `packet.people` / `packet.manifest.approvedSubjects` still lists all 7 people, while `### YOUR BEAT SLICE` and `creativeBrief.facts` only show the first 2!
- **Concrete input that breaks it (verified on live C112 Day 1):**
  - Running `buildLivesSlice(112, { day: '2026-10-19' })` on the live C112 dump produces **40 facts for 7 people**:
    - Facts 1–8 (8 facts): `POP-00801` (Maurice Franklin — hospital + 7 thread facts)
    - Facts 9–13 (5 facts): `POP-00892` (Geneva Zhou — birth + 4 thread facts)
    - Facts 14–18 (5 facts): `POP-00470` (Maren Johns — retirement + 4 thread facts)
    - Facts 19–25 (7 facts): `POP-00755` (Antoine Vermeer — retirement + 6 thread facts)
    - Facts 26–30 (5 facts): `POP-00181` (Xavier Ramington — moment + 4 thread facts)
    - Facts 31–35 (5 facts): `POP-00233` (Mason Walt — moment + 4 thread facts)
    - Facts 36–40 (5 facts): `POP-00237` (Jerry Nelson — moment + 4 thread facts)
  - `prewrite.anchorFacts.slice(0, 12)` keeps only Facts 1–12 (Maurice Franklin + 4 of Geneva Zhou's 5 facts). **Maren Johns, Antoine Vermeer, Xavier Ramington, Mason Walt, and Jerry Nelson (Facts 14–40) are 100% absent from `creativeBrief.facts` and `### YOUR BEAT SLICE`.**

#### 4b. W2 `buildReportPacket` `.slice(0, 8)` gives interviewees #2–#4 only Person #1's thread — `REAL`
- **Where:** `scripts/livedExperiencePacket.js:356-395` (`buildAnglePacket`) and `scripts/livedExperiencePacket.js:785` (`buildReportPacket`).
- **Mechanism:**
  - In W1 (`buildAnglePacket`), `known` starts with `story.label` and `story.hookLine` (plus `'Current cycle: C112'` in V2 at `livedExperiencePacketV2.js:130`), followed by `prewrite.anchorFacts`.
  - In W2 (`buildReportPacket`, `livedExperiencePacket.js:785`), the reporter's `known` context for interviewing up to 4 citizens (`askLimit: 4` for Tamsin) is:
    ```js
    known = (angleInput && angleInput.known || []).filter(c => c.t === 'FACT').slice(0, 8);
    ```
  - On live C112 Day 1, the first 8 `FACT` items in `angleInput.known` are the header lines plus Maurice Franklin's hospital event and Maurice Franklin's thread facts. When W2 interviews Geneva Zhou (`POP-00892`), Maren Johns (`POP-00470`), or Antoine Vermeer (`POP-00755`), `packet.known` contains **zero facts about their own event or thread** — only Maurice Franklin's record!

---

### Hunt 5 — Rhea / `auditArticle` (`UNAPPROVED_NUMBER` / `UNAPPROVED_QUOTE` / `SOURCE_BRIEF`)

- **Verdict:** **REAL** (3 distinct verification/gate traps).
- **Locations:**
  - `scripts/livedExperiencePacketV2.js:414-428, 430-442, 667-708` (`auditArticle`)
  - `scripts/buildLivesSlice.js:161, 256-260` (Tribune `“...”` quotes and `pageVoices`)
  - `scripts/cron-rhea-gate.js:378-388` (`pageLinesFromManifest`)
  - `scripts/newsroom-wake-packages.json:1545-1575` (`tamsin-pruitt` `articleContract`)
  - `scripts/cron-desk-run.js:1411-1440` (`verbatimSliceRuns`)

#### 5a. Quoting any 5+-word Tribune headline from a thread fact when `approvedQuotes` is empty deterministically fails `auditArticle` (`UNAPPROVED_QUOTE`) — `REAL`
- **Where:** `scripts/livedExperiencePacketV2.js:685-698` and `scripts/buildLivesSlice.js:161`.
- **Mechanism:**
  Look at `auditArticle` in `scripts/livedExperiencePacketV2.js:685-698`:
  ```js
  const approvedQuoteNorms = cleanList(manifest.approvedQuotes).map(normalizedSpeech).filter(Boolean);
  const approvedRecordNorm = normalizedSpeech(approvedText);
  const unknownQuotes = quotedSpans(bodyText)
    .map(v => v.trim())
    .filter(Boolean)
    .filter(quote => {
      const norm = normalizedSpeech(quote);
      if (!norm) return false;
      if (!approvedQuoteNorms.length && norm.split(' ').length >= 5 && !isSignage(quote, bodyText)) return true;
      if (approvedRecordNorm.includes(norm)) return false;
      return !approvedQuoteNorms.some(approved => approved.includes(norm) || norm.includes(approved));
    });
  ```
  Look closely at the order of lines **693** and **694**:
  1. When `manifest.approvedQuotes` is empty (`!approvedQuoteNorms.length` — which occurs whenever W2 yields no usable quotes or no citizen wrote a page that cycle, a state `buildLivesSlice.js:282` explicitly anticipates with `'none of today\'s people has written their own page this Cycle — no quotes'`), line 693 runs **before** line 694 (`if (approvedRecordNorm.includes(norm)) return false`).
  2. `isSignage(quote, bodyText)` (`livedExperiencePacketV2.js:430-442`) returns `false` whenever `words.length > 3 || quote.length > 24`.
  3. Meanwhile, `threadFor` (`buildLivesSlice.js:161`) hands the writer Tribune titles wrapped in quotation marks:
     `the Tribune named them in “Six Names for 142 Sick Residents” (Civic, C112)`
  4. If the writer quotes that headline in the article (e.g., `The Tribune had named him in "Six Names for 142 Sick Residents"`), `quotedSpans(bodyText)` extracts `"Six Names for 142 Sick Residents"` (6 words, 32 chars). Because `!approvedQuoteNorms.length` is true, `norm.split(' ').length >= 5` is true (`6 >= 5`), and `isSignage` is false (`6 > 3`), **line 693 immediately returns `true` (`unknownQuotes`) without ever checking `approvedRecordNorm.includes(norm)` at line 694!**
  5. Result: `auditArticle` fails the draft with `UNAPPROVED_QUOTE: Six Names for 142 Sick Residents`, triggering a deterministic repair/failure even though the exact quoted string came verbatim from `manifest.approvedFacts`!
- **Concrete input that breaks it:**
  - `manifest.approvedQuotes = []` (no W2 quotes landed).
  - `manifest.approvedFacts` includes Day 1 Fact #6 from live C112:
    `{ text: 'Maurice Franklin — the Tribune named them in “Six Names for 142 Sick Residents” (Civic, C112)' }`.
  - Article draft contains:
    `Maurice Franklin came home to Rockridge after five cycles in the hospital for severe seasonal flu; The Bay Tribune had named him in "Six Names for 142 Sick Residents" before his discharge.`
  - `auditArticle(bodyText, packet)` returns `passed: false`, `failures: ['UNAPPROVED_QUOTE: Six Names for 142 Sick Residents']`.

#### 5b. `pageVoices` (`ownPageLines`) is excluded from `approvedFacts`, `approvedQuotes`, and Rhea's `pageLinesFromManifest` — `REAL`
- **Where:** `scripts/buildLivesSlice.js:256-260`, `scripts/livedExperiencePacketV2.js:670-677, 685-700`, `scripts/cron-rhea-gate.js:378-388`, and `scripts/newsroom-wake-packages.json:1560`.
- **Mechanism:**
  - Tamsin's wake package (`scripts/newsroom-wake-packages.json:1560`) instructs her:
    `"a quote appears only verbatim from the person's own supplied page; nothing paraphrased into quotation marks"`.
  - `buildLivesSlice.js:256-260` puts citizen page lines into `pageVoices` (`slice.prewrite.pageVoices`), **not** into `facts` (`slice.prewrite.anchorFacts`) and **not** into `approvedQuotes`.
  - Consequently:
    1. In `livedExperiencePacketV2.js:670-674`, `approvedText` is built from `manifest.approvedFacts`, `manifest.approvedQuotes`, and `manifest.approvedSubjects` — **`pageVoices` is not in any of them**. Any verbatim quote or number taken from `pageVoices` fails `auditArticle` with `UNAPPROVED_QUOTE` or `UNAPPROVED_NUMBER`.
    2. In `scripts/cron-rhea-gate.js:378-388`, `pageLinesFromManifest` looks for `facts` entries matching `/citizen_pages\/index\.jsonl (cp-\S+)/.exec(String(f.src || ''))`. Because `buildLivesSlice.js` never pushes page entries into `facts` with `src: 'output/citizen_pages/index.jsonl cp-...'`, `pageLinesFromManifest` returns `[]` for every Lives article, so Rhea never receives the authoritative citizen page lines in ` CITIZEN PAGES CITED IN MANIFEST`.
- **Concrete input that breaks it:**
  - `output/citizen_pages/index.jsonl` has `{ id: 'cp-112-1', cycle: 112, popId: 'POP-00801', citizen: 'Maurice Franklin', lines: ['I kept the hospital wristband in the kitchen drawer beside the 2029 lease.'] }`.
  - `buildLivesSlice` puts that line in `pageVoices` only.
  - If Tamsin quotes `"I kept the hospital wristband in the kitchen drawer beside the 2029 lease"` in her draft, `auditArticle` fails with both `UNAPPROVED_QUOTE` and `UNAPPROVED_NUMBER: 2029`.

#### 5c. 90-character title truncation can split a number in half and trip `UNAPPROVED_NUMBER` — `REAL`
- **Where:** `scripts/buildLivesSlice.js:161` (`String(a.title || '').slice(0, 90)`) and `scripts/livedExperiencePacketV2.js:675-683`.
- **Mechanism:** If an article title has a multi-digit number or year straddling character index 90 (e.g., `"2041"` at indices 88–91), `.slice(0, 90)` puts `"20"` into `approvedFacts` (`allowedNumbers`), so if the writer writes the full number or if the truncated fragment differs, `auditArticle` flags `UNAPPROVED_NUMBER`.

---

### Hunt 6 — Sort / Filter / Window in `threadFor`

- **Verdict:** **REAL** (4 distinct bugs, including a live C112 engine-tier contamination leak).
- **Locations:**
  - `scripts/buildLivesSlice.js:65` (`kindLine` for `promotion`)
  - `scripts/buildLivesSlice.js:97` (`LOG_NOISE`)
  - `scripts/buildLivesSlice.js:108-111` (`OWN_EVENT_TAG`, `NOISE_TAG`, `SIGNAL_TAG`, ` cleanTag`)
  - `scripts/buildLivesSlice.js:150-157` (`threadFor` log filtering, slicing, and sorting)

#### 6a. `threadFor` omits `!LOG_NOISE.test(t)` and promotes `Intake at Tier N` rows via `SIGNAL_TAG` (`Advancement`) — `REAL` (Live in C112)
- **Where:** `scripts/buildLivesSlice.js:97, 110, 150-156`.
- **Mechanism:**
  - Line 97 defines `const LOG_NOISE = /^(Emerged into Tier-|Intake\b|Tier-\d|Roster\b)/i;`.
  - `cameNext` (line 71) and `moments` (line 195) both filter `!LOG_NOISE.test(...)`.
  - **Line 150 (`threadFor`) forgot `!LOG_NOISE.test(t)`:**
    ```js
    const lines = (logByPop.get(P) || []).filter(r => {
      const t = String(r.EventText || '').trim();
      return t && !skip.has(t) && !OWN_EVENT_TAG.test(cleanTag(r.EventTag)) && !NOISE_TAG.test(cleanTag(r.EventTag));
    });
    ```
  - Worse, in `output/beats/LifeHistory_Log.jsonl`, engine tier-intake rows (`"Intake at Tier 3. Media usage C110 (mentioned): a Bay Tribune civic desk piece, C109"`) carry `EventTag: "Advancement"`. And line 110 puts `Advancement` inside `SIGNAL_TAG`:
    ```js
    const SIGNAL_TAG = /^(Strain|Friction|Relationship|Work|Career|Advancement|...)/i;
    ```
    So `threadFor` not only lets `Intake at Tier N` through, it **prioritizes** those rows ahead of real life-history lines! And if the writer echoes `"Tier 3"` or `"Tier 4"` from that fact, `articleContamination.js` / Rhea kills the draft for engine-language contamination.
- **Concrete input that breaks it (verified on live C112 Day 2):**
  - On live C112 Day 2 (`2026-10-20`), `buildLivesSlice` emits:
    - Fact #2 (`POP-00280`): `Jerald Jensen — on the log, C111: Intake at Tier 3. Media usage C110 (mentioned): a Bay Tribune civic desk piece, C109`
    - Fact #5 (`POP-00280`): `Jerald Jensen — on the log, C112: Intake at Tier 3. Media usage C111 (quoted): a Bay Tribune civic desk piece, C110`
    - Fact #12 (`POP-00241`): `Marc Allie — on the log, C111: Intake at Tier 4. Media usage C110 (quoted): a Bay Tribune culture desk piece, C109`

#### 6b. `OWN_EVENT_TAG` deletes the actual promotion detail (`EventTag: 'Promotion'`) that `kindLine` never printed — `REAL` (Live in C112)
- **Where:** `scripts/buildLivesSlice.js:65, 108, 110, 152` and `scripts/dumpBeatTabs.js:107-118`.
- **Mechanism:**
  - In `lib/wakePerception.js:732`, `livedEventsFrom` sets `text` on `promotion` events (e.g., `"Got the nod for the lead role at AC Transit after 14 years as a Janitor."`), but `scripts/dumpBeatTabs.js:107-118` drops `e.text` when writing `Lived_Events.jsonl`, and `kindLine(e)` at `buildLivesSlice.js:65` only prints:
    `Jerald Jensen was promoted; the record lists their work as Janitor, West Oakland (C111)`
  - Meanwhile, `LifeHistory_Log.jsonl` has the actual promotion detail on the `EventTag: 'Promotion'` row (`"Got the nod for the lead role at AC Transit after 14 years as a Janitor."` for `POP-00280`, and `"Promoted at West Oakland Community Center after 40 years as a Mutual Aid Network Organizer."` for `POP-00488`).
  - Because `OWN_EVENT_TAG` (`buildLivesSlice.js:108`) includes `Promotion` and `threadFor` (`:152`) filters `!OWN_EVENT_TAG.test(cleanTag(r.EventTag))`, **`threadFor` deletes the `Promotion` row from the citizen's thread**, leaving the slice with neither the employer (`AC Transit` / `West Oakland Community Center`) nor the tenure (`14 years` / `40 years`)!
  - Note also the regex contradiction between line 108 and line 110:
    - Line 108: `const OWN_EVENT_TAG = /^(Recovery|Hospitalized|Critical|Birth|Retirement|Promotion|Death)$/i;`
    - Line 110: `const SIGNAL_TAG = /^(...|Promotion|LifeEvent-Promotion|...)/i;`
    `Promotion` in `SIGNAL_TAG` is dead code because `OWN_EVENT_TAG` already rejected every row where `cleanTag(r.EventTag)` is `Promotion`. Conversely, `LifeEvent-Promotion` in `LifeHistory_Log.jsonl` only appears as suffixed dial tags like `LifeEvent-Promotion-Up-S` / `LifeEvent-Promotion-Down-S` (composure/mood dial shifts), which match `SIGNAL_TAG` (prefix regex) while true `Promotion` rows are stripped by `OWN_EVENT_TAG`.
- **Concrete input that breaks it (verified on live C112 Day 2):**
  - `POP-00488` (Rupert Ochoa) has `C111` log row `{ EventTag: 'Promotion', EventText: 'Promoted at West Oakland Community Center after 40 years as a Mutual Aid Network Organizer.' }`.
  - On live C112 Day 2, `buildLivesSlice` strips that row via `OWN_EVENT_TAG` and emits only:
    - Fact #9: `Rupert Ochoa was promoted; the record lists their work as Mutual Aid Network Organizer, Fruitvale (C111). Since then, on the record: caught the coffee order coming out of their mouth before deciding to order it (C112)`
    - Fact #10: `Rupert Ochoa — on the log, C111: wondered if a decision from years back had been the right one near the station plaza`
    The employer (`West Oakland Community Center`) and `40 years` tenure are completely lost.

#### 6c. `threadFor` does not deduplicate identical `EventText` rows for a citizen and slices `.slice(0, 4)` before sorting by `Cycle` — `REAL`
- **Where:** `scripts/buildLivesSlice.js:150-156`:
  ```js
  const kept = lines.filter(signal).concat(lines.filter(r => !signal(r)))
    .slice(0, THREAD_MAX.log).sort((a, b) => Number(a.Cycle) - Number(b.Cycle));
  ```
- **Mechanism:**
  1. `skip` is initialized from `opts.skipTexts` (`:138`), and `lines.filter(...)` checks `!skip.has(t)` (`:152`), but **never adds `t` to `skip` as it iterates**. In live C112 `LifeHistory_Log.jsonl`, **35 citizens** have duplicate identical `EventText` rows across C111 and C112 (e.g., `POP-00003` Mark Aitken has `EventText: "saw their name in the sports pages again"` in both C111 and C112). Both duplicate rows are emitted into the citizen's 4-line thread budget.
  2. Conversely, if a citizen has identical `EventText` in C111 and C112 and the C112 row is chosen as `cameNext` (`skipTexts: [next.EventText]`) or `m.text` (`skipTexts: [m.text]`), `!skip.has(t)` silently drops the C111 occurrence too.
  3. Because `.slice(0, THREAD_MAX.log)` runs *before* `.sort((a, b) => Number(a.Cycle) - Number(b.Cycle))`, when a citizen has >4 signal rows across C111 and C112, `kept` takes whichever 4 appear first in file order (C111 first) and discards newer C112 signal rows.
- **Concrete input that breaks it:**
  - Citizen `POP-00003` has `EventText: 'saw their name in the sports pages again'` at C111 (`EventTag: "Sports|..."`) and again at C112 (`EventTag: "Sports-Sociability-Up-S|..."`). `threadFor('POP-00003', ...)` emits both:
    - `Mark Aitken — on the log, C111: saw their name in the sports pages again`
    - `Mark Aitken — on the log, C112: saw their name in the sports pages again`

#### 6d. `OWN_EVENT_TAG` strips prior-cycle life events even when today's passage is a `moment` or `stay` — `REAL`
- **Where:** `scripts/buildLivesSlice.js:108, 152`.
- **Mechanism:** `OWN_EVENT_TAG` (`Recovery|Hospitalized|Critical|Birth|Retirement|Promotion|Death`) is applied unconditionally in `threadFor` regardless of what kind of passage the citizen is in today. If a citizen had a `Recovery` or `Hospitalized` or `Promotion` log line in C111 (or already covered in C111) and is selected for a `Relationship` `moment` in C112, `threadFor` strips their C111 `Recovery`/`Hospitalized`/`Promotion` log line even though it is not today's event.
- **Concrete input that breaks it:**
  - Citizen `POP-00950` has C111 log row `{ Cycle: '111', EventTag: 'Hospitalized', EventText: 'Admitted to Highland Hospital after a workshop fall.' }` and C112 log row `{ Cycle: '112', EventTag: 'Relationship', EventText: 'reconnected with an old friend' }`.
  - Selected as a C112 `moment` (`reconnected with an old friend`), `threadFor` strips the C111 `Hospitalized` row via `OWN_EVENT_TAG`, hiding the hospitalization that preceded the moment.

---

### Hunt 7 — Tests (`scripts/buildLivesSlice.test.js`)

- **Verdict:** **REAL** (4 test-suite weaknesses that allowed the bugs above to pass).
- **Locations:**
  - `scripts/buildLivesSlice.test.js:29, 65-77, 105, 118-130`

#### 7a. Line 105 adjacency check only verifies the *first* thread fact (`findIndex`) — `REAL`
- **Where:** `scripts/buildLivesSlice.test.js:105`:
  ```js
  assert.ok(day1.facts.findIndex(f => f.kind === 'thread' && f.popid === 'POP-90004') === day1.facts.findIndex(f => f.kind === 'hospital') + 1, 'the thread sits directly under its person\'s event');
  ```
- **Mechanism:** `Array.prototype.findIndex` returns only the first matching index (`1 === 0 + 1`). If facts 2, 3, and 4 of `POP-90004`'s thread were pushed at the very end of `day1.facts` (after `moment` and `stay`), or interleaved under another citizen, this assertion still passes.
- **Concrete input that breaks it:**
  - Mutate `buildLivesSlice.js:242` to push `threadFor(...)[0]` immediately after the event and push `threadFor(...).slice(1)` at the end of `facts` after line 253: `buildLivesSlice.test.js` still prints `buildLivesSlice.test.js OK`.

#### 7b. Zero test coverage of `lives_covered.json` thread emission (`buildLivesSlice.js:158-159`) despite test comment claiming it is tested — `REAL`
- **Where:** `scripts/buildLivesSlice.test.js:65` vs `scripts/buildLivesSlice.js:158-159`.
- **Mechanism:** Line 65 of `buildLivesSlice.test.js` comments:
  `// Thread fixture: earlier log lines, a passed Tribune piece (kept), a failed piece (skipped),`
  And the task brief notes thread facts include `"what Lives wrote earlier"`. However, in `buildLivesSlice.test.js`, no citizen (`POP-90001`..`POP-90007`) ever appears on both Day 1 and Day 2. Thus `before.length` at `buildLivesSlice.js:159` is `0` for every single call in the test suite, leaving line 159 (`'Lives already wrote this person: ...'`) at **0% coverage** (which is why Hunt 1b went uncaught).
- **Concrete input that breaks it:**
  - Delete lines 158–159 of `scripts/buildLivesSlice.js` (`const before = ...; if (before.length) out.push(...);`) and run `node scripts/buildLivesSlice.test.js`: the test passes (`buildLivesSlice.test.js OK`).

#### 7c. Test fixture injects an impossible future-cycle row (`cycle + 1`) to test `cameNext` — `REAL`
- **Where:** `scripts/buildLivesSlice.test.js:76`:
  ```js
  { POPID: 'POP-90004', Cycle: String(cycle + 1), EventTag: 'Neighborhood', EventText: 'walked to the corner store without stopping to rest', Neighborhood: 'Temescal' },
  ```
- **Mechanism:** In the test, `cycle` is `111`, `POP-90004`'s hospital event is at `cycle: 111` (`buildLivesSlice.test.js:25`), and line 76 injects a `LifeHistory_Log` row at `Cycle: '112'` (`cycle + 1`). In production, `scripts/dumpBeatTabs.js:100` filters `LifeHistory_Log` with `c >= lo && c <= stamp` (`c <= cycle`), so a `cycle + 1` row can **never** exist in `LifeHistory_Log.jsonl`! In production, `cameNext` (`Cycle > ev.cycle`) can only ever match when `ev.cycle === cycle - 1` and the log row is at `Cycle === cycle`.

#### 7d. Test fixture omits production tag shapes (`Advancement` + `Intake at Tier N`, `passed-gate-not-printed`, `dumpBeatTabs` death recipient shape) — `REAL`
- **Where:** `scripts/buildLivesSlice.test.js:29, 68-77`.
- **Mechanism:**
  1. Line 29 hand-crafts `recipients: [{ pop: 'POP-90005', name: 'Test Widow', rel: 'spouse' }]` with a `.name` field that `dumpBeatTabs.js:116` never produces (masking Hunt 2a).
  2. Lines 68–69 only test `{ canon: true, published: false }` vs `{ canon: false, stage: 'canon-violation' }`, treating `{ canon: true, published: false }` as if it were a valid printed Tribune article (masking Hunt 3a).
  3. Lines 72–77 never include an `Advancement` / `Intake at Tier 3` log row (which exists in `baseBeats()` at line 36 ONLY on `Cycle: 111` for `POP-90002` with `EventTag: 'Promotion'`, where `OWN_EVENT_TAG` happened to strip `EventTag: 'Promotion'`, masking the fact that real `Intake at Tier N` rows in `LifeHistory_Log.jsonl` have `EventTag: 'Advancement'` — Hunt 6a!).
