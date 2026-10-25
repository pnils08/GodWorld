# Adversarial Review — EIC Audit Lived-Events Record, Lives Empty-Day Drop & Reconcile Thin-Flag Hold (`22e9cc34`)

- **Reviewer:** `antigravity`
- **Date:** 2026-10-25
- **Target commit:** `22e9cc34` (`scripts/cron-saturday-run.js`, `scripts/reconcileRheaDisposition.js`, `scripts/newsroom-fanout.js`, `scripts/buildLivesSlice.js`, `scripts/cronSaturdayRun.test.js`, `scripts/reconcileRheaDisposition.test.js`, `scripts/buildLivesSlice.test.js`, `output/eic_scorecard_c112.{json,md}`)
- **Task brief:** `docs/for-claude-review/2026-10-25-eic-lived-events-review-TASK.md`
- **Mode:** Read-only adversarial review (no code edits, no Sheet/Supermemory/cron calls)

---

## Executive Summary

| Hunt | Surface | Verdict | Highest-Severity Finding |
|---|---|---|---|
| **1** | Window honesty (`livedEventsGroundTruth` vs `dumpBeatTabs.js` / crontab) | **REAL** | In normal Saturday `16:00` crontab order (`docs/OPERATIONS.md:64`), `output/beats/` holds `N-1..N` because `dumpBeatTabs.js` runs inside `/run-cycle` Step 5.56 on Sunday. **However, `livedEventsGroundTruth(cycle, profiles, root)` (`scripts/cron-saturday-run.js:913-948`) never uses its `cycle` parameter**, never checks `output/beats/meta.json`, never filters rows by `Number(cycle) - 1 <= c <= Number(cycle)`, and never falls back to `output/beats/prev/`. If `stepAudit` is run (or re-run) for Cycle `N` after a Sunday `N+1` fire (or if `output/beats/` is stale at `N-1`), it blindly injects `N..N+1` (or `N-2..N-1`) under `=== LIVED EVENTS (authoritative for person events, this Cycle and the one before) ===` (`:1038`) and drops `C(N-1)`! |
| **2** | Over-grounding / dropped events in `LIVED EVENTS` | **REAL** (4 bugs) | (2a) **Live C112 bookkeeping leak (`Promotion: Emerged into Tier-4` / `Added to Simulation_Ledger as Tier 4`):** `livedEventsGroundTruth` (`cron-saturday-run.js:933-941`) filters `LifeHistory_Log.jsonl` by `LIVED_TAG` (`Promotion`) without filtering `BOOKKEEPING_PREFIX` (`lib/wakePerception.js:56, 726`). On the live C112 dump, **18 of 24 log lines** emitted by `livedEventsGroundTruth` are `Promotion: Emerged into Tier-4...` and `Promotion: Added to Simulation_Ledger as Tier 4...` — over-grounding fake job-promotion claims for newly emerged/seeded citizens AND burning 18 of the 80 cap slots! (2b) **Missing ongoing hospital stays (`Hospital_Ledger.jsonl`):** `buildLivesSlice.js:204-214` (`stays`) assigns citizens admitted in `C < N-1` (`DischargeCycle === ''`), and `threadFor` (`buildLivesSlice.js:145`) gives `AdmitCycle` and stay length from `Hospital_Ledger.jsonl`. `livedEventsGroundTruth` never reads `Hospital_Ledger.jsonl`, so any ongoing stay admitted before `N-1` (or Maurice Franklin's `admitted C106, 5 cycles in care` detail) is absent from `LIVED EVENTS`. (2c) **Missing `SMALL_TAGS` (`Wedding`, `Marriage`, `Graduation`, `Stabilized`, `Relationship`, `Household`) and `Recovering` / `Health`:** Tamsin's `moments` slot (`buildLivesSlice.js:99`) and thread rows use tags excluded by `LIVED_TAG` (`cron-saturday-run.js:912`). (2d) **Un-seeded `seen` + 80-line cap order:** `seen` (`:933`) is not seeded from `Lived_Events.jsonl` (duplicating every birth/retirement/promotion), and `LifeHistory_Log.jsonl` is ordered `C(N-1)` then `C(N)` — so hitting the 80-line cap (`:941`) drops the newest `C(N)` events at the tail of the file. |
| **3** | Reporter row (`s.bylinePopid` / `THE REPORTER`) | **REAL** (first-name collision) / **FALSE-POSITIVE** (legacy sidecar crash & surname bending) | Legacy/missing/lowercase `s.bylinePopid` (`cron-saturday-run.js:1033-1034`) will not throw (`String(s.bylinePopid || '').toUpperCase()` safely skips when absent from `profiles`, and all 131 live sidecars in `staged/` carry `bylinePopid`). Bending a citizen with the reporter's *surname* is not excused because `AUDIT_CHARGE` (`:976`) specifies `"their own first name"`. **However (`REAL`):** `AUDIT_CHARGE` (`:976`) states unconditionally `"their own first name in the prose is themselves, never an invented person"`, which instructs the auditor to excuse an invented third-person citizen who happens to share the reporter's first name (if omitted from `intake.names`). |
| **4** | Null drop (`buildLivesSlice.enrichAssignment` → `newsroom-fanout.js`) | **REAL** (twin `buildVoicesSlice` & `--persona` path missed) / **FALSE-POSITIVE** (`staleBeatRef` & `DAILY_QUOTAS`) | In `newsroom-fanout.js:721-728`, `continue` prevents `staleBeatRef` from ever being called with `null`, none of the other 14 builders in `BEAT_BUILDERS` return `null` today, and `DAILY_QUOTAS` is bypassed on `WEEK_GRID` fanouts (`cron-desk-run.js:3493`). **However (`REAL`):** (4a) Ines Sorensen (`buildVoicesSlice.js:155-159`), the twin `pipeline.73` daily Voices seat (`Wed–Sun`), still returns `assign` (not `null`) on an empty slice, leaving her exposed to the exact same empty-slice generic-culture-packet failure on Wed–Fri fanouts and Sat/Sun `--persona` crons. (4b) Direct `--persona tamsin-pruitt` runs in `cron-desk-run.js:1730-1771` call `loadSlice(cycle)` (not `enrichAssignment`), so an empty slice still falls through to the generic culture packet. |
| **5** | Reconcile (`reconcileRheaDisposition.js` `heldFlags`) | **REAL** (critical SHA-mismatch clobber on multi-day / re-run seats) | In `scripts/reconcileRheaDisposition.js:168-174`, `heldFlags` checks `f.draft === path.basename(draftAbs)` — comparing **only the filename (`<base>.md`), never `draftSha256` or the hash of `flagged/<base>.md`!** Because `cron-desk-run.js:3086-3138` does **not** remove `flagged/<base>.flags.json` when a later write of the same `base` (e.g., Day 2 of `tamsin-pruitt` / `ines-sorensen` / `nia-rook`, or a same-day recovery re-write) passes cleanly and stages to `staged/<base>.staged.md`, `reconcileVerdict` reads Day 1's leftover `flagged/<base>.flags.json`, sees `f.draft === "<base>.md"`, sets `effectivePass = false`, and **un-stages and archives Day 2's clean, full-length staged article as `failed-rereview` (`:274-277`), overwriting `flagged/<base>.md` with the good article and stamping Day 1's `thin` flag onto it!** |
| **6** | Scorecard override (`eic_scorecard_c112.json`) | **FALSE-POSITIVE** (`stepSweep` / `buildArticleIndex` logic) / **REAL** (operational: `ARTICLE_INDEX.jsonl` not yet rebuilt on disk & re-running `stepAudit` clobbers `overridden`) | `excludeCanonViolations` (`cron-saturday-run.js:332`), `retractionIds` (`:430`), `stepCurate` (`:1235`), and `buildArticleIndex.js:370` all inspect `a.verdict === 'canon-violation'` only; nothing in `--step sweep` reads `failures.length` or `overridden` to re-retract Tamsin's piece. **Two operational notes (`REAL`):** (6a) `archive/ARTICLE_INDEX.jsonl` on disk was not rebuilt in `22e9cc34`, so row `culture_c112_tamsin-pruitt_packet-v2_x-ai-grok-4-3` (`id: "ca6b5f5c6443d324"`) still sits at `canon: false, stage: "canon-violation"` on disk until `node scripts/buildArticleIndex.js --write` runs. (6b) `stepAudit` (`cron-saturday-run.js:1087-1089`) writes `eic_scorecard_c<N>.json` unconditionally (even without `--apply`) and does not preserve `overridden` blocks if re-run. |
| **7** | Tests (`cronSaturdayRun.test.js`, `buildLivesSlice.test.js`, `reconcileRheaDisposition.test.js`) | **REAL** (3 gaps) | (7a) `cronSaturdayRun.test.js:282-296` tests `livedEventsGroundTruth` in isolation; `auditOne`'s injection of `=== LIVED EVENTS ===` (`:1038`) and `— THE REPORTER (byline)` (`:1034`) has **0% test coverage** (deleting both lines in `auditOne` still passes all 114 assertions). (7b) `newsroom-fanout.js:722-726` (`if (next === null)` seat drop) has **0% test coverage** (`buildLivesSlice.test.js:177` only calls `L.enrichAssignment` directly; deleting lines 722–726 of `newsroom-fanout.js` passes all 5 test files). (7c) `reconcileRheaDisposition.test.js:141-151` only tests a single thin draft and never tests a subsequent clean write of the same `base` (missing Hunt 5a). |

---

## Detailed Findings by Hunt

### Hunt 1 — Window Honesty (`livedEventsGroundTruth` vs `dumpBeatTabs.js` & Crontab Order)

- **Verdict:** **REAL** (`livedEventsGroundTruth` ignores its `cycle` argument and never checks `meta.json` or `prev/`; normal Saturday crontab order is `N-1..N`).
- **Locations:**
  - `scripts/cron-saturday-run.js:913-948` (`livedEventsGroundTruth`)
  - `scripts/cron-saturday-run.js:973-975` (`AUDIT_CHARGE`)
  - `scripts/cron-saturday-run.js:1038, 1070` (`auditOne`, `stepAudit`)
  - `scripts/dumpBeatTabs.js:96-101, 149-160` (`lifeWindowRows`, `publishGeneration`)
  - `docs/OPERATIONS.md:46-88` (crontab schedule)
  - `.claude/skills/run-cycle/SKILL.md:123-129` (`dumpBeatTabs.js` execution in `/run-cycle`)

#### 1a. Crontab order on normal Saturdays — Verified `N-1..N`
- `scripts/dumpBeatTabs.js` is not in `crontab`; it runs as Step 5.56 of `/run-cycle` immediately after the Sunday cycle fire (`.claude/skills/run-cycle/SKILL.md:123-126`), writing `output/beats/Lived_Events.jsonl` and `output/beats/LifeHistory_Log.jsonl` for `[stamp - LIVED_WINDOW, stamp]` = `[N - 1, N]` (`scripts/dumpBeatTabs.js:96-101`, `LIVED_WINDOW = 1`).
- `scripts/cron-saturday-run.js --apply` runs on Saturday at `16:00` (`0 16 * * 6`, `docs/OPERATIONS.md:64`), before Sunday's `N+1` cycle fire. On a normal Saturday, `output/beats/` on disk holds `N-1..N`.

#### 1b. `livedEventsGroundTruth(cycle, profiles, root)` completely ignores its `cycle` parameter — `REAL`
- **Where:** `scripts/cron-saturday-run.js:913-948`.
- **Mechanism:**
  Look at `livedEventsGroundTruth(cycle, profiles, root = ROOT)`:
  - The parameter `cycle` is **never referenced anywhere in the function body**.
  - Unlike `beatSliceKit.js` (`loadBeatTabs`), it never reads `output/beats/meta.json` to verify `meta.cycle === Number(cycle)`.
  - It never filters `e.cycle` or `r.Cycle` to `[Number(cycle) - 1, Number(cycle)]`.
  - When `dumpBeatTabs.js` advances to `N+1` (`scripts/dumpBeatTabs.js:157-158`), it copies `output/beats/*.jsonl` (including Cycle `N`'s `Lived_Events.jsonl` and `LifeHistory_Log.jsonl`) into `output/beats/prev/`, and overwrites `output/beats/` with `N..N+1`. `livedEventsGroundTruth` never checks `output/beats/prev/` when `meta.cycle === Number(cycle) + 1`.
- **What happens if a late/early fire precedes the audit, or `--step audit --cycle N` is re-run on Sunday after `dumpBeatTabs.js (N+1)`:**
  1. `output/beats/` holds `C(N)` and `C(N+1)`; all `C(N-1)` rows are gone from `output/beats/`.
  2. `livedEventsGroundTruth(112, profiles)` emits:
     `Person events on the record for C112 and C113. The paper reports last Cycle's life events through the following week...`
     under the prompt header (`cron-saturday-run.js:1038`):
     `=== LIVED EVENTS (authoritative for person events, this Cycle and the one before) ===`
     and `AUDIT_CHARGE` (`cron-saturday-run.js:974`):
     `it spans this Cycle and the one before, because the paper reports last Cycle's events through the week.`
  3. **Result:** The auditor for a `C112` article is handed `C112 and C113` as `"this Cycle and the one before"`, loses all `C111` rows (so Tamsin's C112 piece fails `canon-violation` ×3 again on Maren Johns, Geneva Zhou, and Maurice Franklin!), and treats future `C113` events as grounded for `C112`!
- **Concrete input that breaks it:**
  - `output/beats/meta.json` has `{ "cycle": 113 }`, `output/beats/Lived_Events.jsonl` has `C112..C113` rows, and `output/beats/prev/Lived_Events.jsonl` has the `C111..C112` rows.
  - Call `livedEventsGroundTruth(112, profiles)`: it ignores `112` and `output/beats/prev/`, returning `Person events on the record for C112 and C113...` with zero `C111` events.

---

### Hunt 2 — Over-Grounding & Dropped Real Events in `livedEventsGroundTruth`

- **Verdict:** **REAL** (4 distinct bugs verified against live C112 `output/beats/` data).
- **Locations:**
  - `scripts/cron-saturday-run.js:912-948` (`LIVED_TAG`, `livedEventsGroundTruth`)
  - `lib/wakePerception.js:56, 726-733` (`BOOKKEEPING_PREFIX`, `livedEventsFrom`)
  - `scripts/buildLivesSlice.js:99, 140-146, 204-214` (`SMALL_TAGS`, `Hospital_Ledger` stays and thread lines)

#### 2a. `livedEventsGroundTruth` fails to filter `BOOKKEEPING_PREFIX` on `LifeHistory_Log.jsonl`, emitting 18 `Promotion: Emerged into Tier-4` / `Added to Simulation_Ledger as Tier 4` lines in live C112 — `REAL`
- **Where:** `scripts/cron-saturday-run.js:933-941` vs `lib/wakePerception.js:56, 726`.
- **Mechanism:**
  In `lib/wakePerception.js:726`, `livedEventsFrom` explicitly filters out `BOOKKEEPING_PREFIX`:
  ```js
  const BOOKKEEPING_PREFIX = /^(Updated to Tier|Added to Simulation_Ledger|Emerged into Tier|Neighborhood council|Local civic|Development civic)/i;
  ...
  if (BOOKKEEPING_PREFIX.test(text)) continue; // "Emerged into Tier-4 in …" rides the Promotion tag; it is the ledger's bookkeeping, not a raise
  ```
  And for `Birth`, `lib/wakePerception.js:728` checks `if (/^Birth$/i.test(tag) && /welcomed a new child/i.test(text))` so a newborn's `"born to"` bookkeeping row is not treated as the newborn giving birth.
  In `scripts/cron-saturday-run.js:933-940`, `livedEventsGroundTruth` reads `LifeHistory_Log.jsonl` and checks **only** `!r.POPID || !LIVED_TAG.test(tag)` — with **no `BOOKKEEPING_PREFIX` filter**!
- **Concrete input that breaks it (verified on live C112 `output/beats/LifeHistory_Log.jsonl`):**
  Running `livedEventsGroundTruth(112, profiles)` on the live C112 dump outputs **30 lines**, of which **18 lines** are engine tier bookkeeping tagged `Promotion`:
  ```text
  C111 — Victor Baker (POP-01198) — Promotion: Emerged into Tier-4 in Ivy Hill
  C111 — Patrick Clark (POP-01199) — Promotion: Emerged into Tier-4 in Dimond
  ...
  C112 — Tamsin Pruitt (POP-01210) — Promotion: Added to Simulation_Ledger as Tier 4. Joined the Bay Tribune to write the Lives page.
  C112 — Marisol Quintero (POP-01212) — Promotion: Added to Simulation_Ledger as Tier 4. Joined BART as a train conductor.
  ```
  This causes two failures:
  1. **Over-grounding fake promotions:** The header tells the EIC auditor `"a birth, death, hospital stay or discharge, retirement or promotion listed here is real"`. If an article falsely claims `"Victor Baker was promoted at work"` or `"Marisol Quintero received a promotion at BART"`, the auditor sees `— Promotion:` next to their name in `LIVED EVENTS` and passes a fabricated promotion claim (and sees raw engine strings `"Tier-4"` / `"Simulation_Ledger"` in authoritative ground truth).
  2. **Burning the 80-line cap (`cron-saturday-run.js:941`):** Every citizen emergence or seeding wave burns `Promotion` slots in `lines` before real `C(N)` life events at the end of `LifeHistory_Log.jsonl` are reached.

#### 2b. `livedEventsGroundTruth` never reads `Hospital_Ledger.jsonl` — dropping ongoing hospital stays (`stays`) and admission cycles (`AdmitCycle`) that `buildLivesSlice.js` feeds Tamsin — `REAL`
- **Where:** `scripts/cron-saturday-run.js:913-942` vs `scripts/buildLivesSlice.js:140-146, 204-214`.
- **Mechanism:**
  - `Lived_Events.jsonl` (`lib/wakePerception.js:741-742`) only emits hospital events whose `AdmitCycle` or `DischargeCycle` is in `[N-1, N]`.
  - However, `scripts/buildLivesSlice.js` reads `output/beats/Hospital_Ledger.jsonl` in two places:
    1. `stays` (`buildLivesSlice.js:204-214`): selects up to 2 citizens with open hospital stays (`DischargeCycle === ''`), including citizens admitted in earlier cycles (`AdmitCycle < N - 1`) who have **no** row in `Lived_Events.jsonl` and **no** `C(N-1)..C(N)` row in `LifeHistory_Log.jsonl`.
    2. `threadFor` (`buildLivesSlice.js:140-146`): gives Tamsin the admission cycle and stay duration (`"on the hospital record: admitted C106 for severe seasonal flu, discharged C111 after 5 cycles in care, recovered"`).
  - Because `livedEventsGroundTruth` never reads `Hospital_Ledger.jsonl`, neither ongoing stays admitted before `N-1` nor the `AdmitCycle` / duration of a discharged stay (`admitted C106`, `5 cycles in care`) appears in `=== LIVED EVENTS ===`.
- **Concrete input that breaks it:**
  - On live C112 Day 1, Tamsin's slice Fact #2 (`buildLivesSlice.js:145`) tells her:
    `Maurice Franklin — on the hospital record: admitted C106 for severe seasonal flu, discharged C111 after 5 cycles in care, recovered`
  - `livedEventsGroundTruth(112, profiles)` emits only:
    `C111 — Maurice Franklin (POP-00801) — hospital discharged, severe seasonal flu, Drone Fleet Coordinator, Rockridge`
    `C111 — Maurice Franklin (POP-00801) — Recovery: Maurice Franklin has made a full recovery and returned to their duties`
  - If Tamsin writes `"Maurice Franklin was admitted in Cycle 106 and spent five cycles in hospital care before coming home"`, or writes about an open `stay` admitted in `C108`, `=== LIVED EVENTS ===` has no record of `C106`, `5 cycles`, or the `C108` open stay.

#### 2c. `LIVED_TAG` omits `SMALL_TAGS` (`Wedding`, `Marriage`, `Graduation`, `Stabilized`, `Relationship`, `Household`) and `Recovering` / `Health` — `REAL`
- **Where:** `scripts/cron-saturday-run.js:912` vs `scripts/buildLivesSlice.js:99`.
- **Mechanism:**
  - `buildLivesSlice.js:99, 191-202` selects up to 3 `moments` per day from `LifeHistory_Log.jsonl` matching:
    `const SMALL_TAGS = /^(Wedding|Marriage|Graduation|Relationship|Household|Stabilized)$/i;`
  - And in live C112 `LifeHistory_Log.jsonl`, there are also `Graduation` (2 rows), `Recovering` (2 rows), and `Health` (3 rows).
  - `LIVED_TAG` at `cron-saturday-run.js:912` is only `/^(Birth|Retirement|Promotion|Hospitalized|Critical|Recovery|Death)$/i`. None of Tamsin's `moments` (`Wedding`, `Marriage`, `Graduation`, `Stabilized`, `Relationship`, `Household`) or `Recovering`/`Health` rows are included in `livedEventsGroundTruth`.
- **Concrete input that breaks it:**
  - In live C112 `LifeHistory_Log.jsonl`, `Graduation` occurs twice (`C111..C112`) and `Relationship` / `Household` moments were assigned to Tamsin across C112 Days 1–4 (`POP-00181`, `POP-00233`, `POP-00237`, `POP-00241`, `POP-00244`, `POP-00246`, `POP-00258`, `POP-00272`, `POP-00182`, `POP-00235` in `output/cron-compare/lives_covered.json`). None of those 10 covered moments appear in `livedEventsGroundTruth(112, profiles)`.

#### 2d. `seen` is not seeded from `Lived_Events.jsonl`, and hitting the 80-line cap drops `C(N)` rows first — `REAL`
- **Where:** `scripts/cron-saturday-run.js:922-942`.
- **Mechanism:**
  1. Every `birth`, `retirement`, and `promotion` in `Lived_Events.jsonl` (`:922-932`) is emitted once, and then emitted a **second time** from `LifeHistory_Log.jsonl` (`:934-942`) because `seen` is only populated inside the second loop (verified on live C112: Jerald Jensen, Rupert Ochoa, Maren Johns, Geneva Zhou, Antoine Vermeer, and Maurice Franklin all appear twice in the 30-line output).
  2. `LifeHistory_Log.jsonl` is dumped in sheet row order (`C(N-1)` first, `C(N)` second). Because `if (lines.length >= 80) break;` (`:941`) stops iterating in file order, any heavy window (e.g. a flu wave or tier-emergence batch where `Lived_Events` + duplicated `C(N-1)` log rows + `BOOKKEEPING_PREFIX` rows reach 80 lines) **truncates the tail of `LifeHistory_Log.jsonl` — which is Cycle `N`'s own events**!
  3. Also, for `death` events (`:924-927`), `livedEventsGroundTruth` only prints `(e.recipients || [])[0]` and omits `e.subject` (the deceased's POPID) and `e.recipients.slice(1)` (other household/family survivors who also receive the death wake in `lib/wakePerception.js:760-777`).

---

### Hunt 3 — Reporter Row (`s.bylinePopid` & `THE REPORTER`)

- **Verdict:** **FALSE-POSITIVE** for legacy sidecar crashes and surname citizen-bending; **REAL** (minor) for same-first-name third-person invention.
- **Locations:**
  - `scripts/cron-saturday-run.js:975-976` (`AUDIT_CHARGE`)
  - `scripts/cron-saturday-run.js:1033-1034` (`auditOne` `ownPop` lookup)

#### 3a. Legacy sidecar safety (`s.bylinePopid` missing / lowercase / not in `profiles`) — `FALSE-POSITIVE`
- At `scripts/cron-saturday-run.js:1033-1034`:
  ```js
  const ownPop = String(s.bylinePopid || '').toUpperCase();
  if (profiles[ownPop]) groundProfiles = [groundProfiles, profileLine(ownPop, profiles[ownPop]) + ' — THE REPORTER (byline)'].filter(Boolean).join('\n');
  ```
- If `s.bylinePopid` is `undefined`, `null`, `''`, or not in `profiles`, `profiles[ownPop]` is `undefined` and nothing is appended or thrown. Lowercase IDs are normalized via `.toUpperCase()`. All 131 existing `*.staged.json` sidecars in `output/cron-compare/staged/` carry a populated `bylinePopid`.

#### 3b. Can `THE REPORTER` ground a reporter who bends a citizen with their own surname or first name? — `REAL` (first-name collision when omitted from `intake.names`)
- **Where:** `scripts/cron-saturday-run.js:975-976`:
  ```text
  The reporter named in LEDGER PROFILES as THE REPORTER is the byline: their own first name in the prose is themselves, never an invented person.
  ```
- **Mechanism:**
  - **Surname bending (`FALSE-POSITIVE`):** The charge explicitly scopes the rule to `"their own first name in the prose is themselves"`, and `profileLine` gives the reporter's full name, role, neighborhood, and birth year. A bent citizen with a different first name and the reporter's surname is not excused by this rule (and if listed in `intake.names`, the deterministic check at `cron-saturday-run.js:1003-1010, 1056-1059` overrides the verdict to `canon-violation`).
  - **First-name collision (`REAL`):** Because `AUDIT_CHARGE` states unconditionally that `"their own first name in the prose is themselves, never an invented person"`, if a reporter (e.g. `Angela Reyes` or `Luis Navarro`) invents a third-person citizen in prose who happens to share their **first name** (e.g. `"Angela, a Fruitvale shopkeeper, stood by the counter"`) and omits them from `intake.names` (bypassing the deterministic `nameFails` loop at `:1003-1010`), the prompt instructs the auditor that the first name in prose is the reporter and `"never an invented person"`.
- **Concrete input that breaks it:**
  - Article by `Angela Reyes` (`bylinePopid: 'POP-00592'`) with `intake.names: []` and prose: `"Down on International Boulevard, Angela locked the bakery grates and said her family had run the oven for thirty years."` The `AUDIT_CHARGE` rule (`"their own first name in the prose is themselves, never an invented person"`) instructs the auditor not to flag `"Angela"` as an invented person.

---

### Hunt 4 — Null Drop (`buildLivesSlice.enrichAssignment` & `newsroom-fanout.js`)

- **Verdict:** **FALSE-POSITIVE** for `staleBeatRef` and `DAILY_QUOTAS`; **REAL** for the twin daily seat `buildVoicesSlice.js` (`ines-sorensen`) and direct `--persona` invocations in `cron-desk-run.js`.
- **Locations:**
  - `scripts/buildLivesSlice.js:310-316` (`enrichAssignment`)
  - `scripts/newsroom-fanout.js:38-55, 513-518, 696-736, 844-847` (`WEEK_GRID`, `BEAT_BUILDERS`, `staleBeatRef`, `shortfalls`)
  - `scripts/buildVoicesSlice.js:155-159` (`enrichAssignment` for `ines-sorensen`)
  - `scripts/cron-desk-run.js:1730-1771, 3493` (`loadSlice` in `--persona` mode; `boundDailyAssignments` guard)

#### 4a. Other `BEAT_BUILDERS`, `staleBeatRef`, and `DAILY_QUOTAS` — `FALSE-POSITIVE`
- All 13 kit-wired builders in `BEAT_BUILDERS` use `beatSliceKit.wire` (`scripts/beatSliceKit.js:344-348`), which returns `assign` on an empty slice; `buildVoicesSlice.js:158` also returns `assign`. Only `buildLivesSlice.js:312` returns `null`.
- In `scripts/newsroom-fanout.js:721-728`, `if (next === null)` logs, records `beatEnrich.dropped`, splices `assignments[i]`, and executes `continue` at line 726 — so `staleBeatRef(next, filedBeats)` at line 728 is never reached with `null` (and `staleBeatRef` itself handles `null` safely, as tested in `newsroom-fanout-beat-stale.test.js`).
- `DAILY_QUOTAS` (`newsroom-fanout.js:38`) is only applied by `boundDailyAssignments` on legacy non-grid fanouts (`scripts/cron-desk-run.js:3493`: `if (!only && !(fanout.quotas && Array.isArray(fanout.quotas.grid)))`). On `WEEK_GRID`, dropping `tamsin-pruitt` simply adds `{ desk: 'tamsin-pruitt', wanted: 1, got: 0 }` to `fanout.shortfalls` (`newsroom-fanout.js:844-845`), matching the existing `staleBeatRef` drop behavior.

#### 4b. Twin `pipeline.73` daily seat `buildVoicesSlice.js` (`ines-sorensen`) still returns `assign` (not `null`) on an empty slice, and `--persona` mode in `cron-desk-run.js` bypasses `enrichAssignment` — `REAL`
- **Where:** `scripts/buildVoicesSlice.js:155-159` and `scripts/cron-desk-run.js:1730-1771`.
- **Mechanism:**
  1. `Ines Sorensen` (`buildVoicesSlice.js`, seated Wed–Fri on `WEEK_GRID` plus Saturday/Sunday `--persona ines-sorensen` crons at `docs/OPERATIONS.md:83-84`) is the other `pipeline.73` daily record seat with a covered-list (`voices_covered.json`) that can exhaust its pool mid-week. Yet `scripts/buildVoicesSlice.js:155-159` still reads:
     ```js
     function enrichAssignment(assign, cycle, root = K.ROOT) {
       if (!W.isSeat(assign)) return assign;
       const slice = loadSlice(cycle, root);
       return slice ? W.assignmentFromSlice(slice, assign) : assign;
     }
     ```
     When `loadSlice` returns `null` (empty slice), `buildVoicesSlice.enrichAssignment` still returns the bare `assign` (which also consumed a generic `culture` seed at `newsroom-fanout.js:515`), sending Ines to the generic culture packet!
  2. When `cron-desk-run.js` is invoked via `--persona tamsin-pruitt` (or `--persona ines-sorensen` on Sat/Sun crons) without `--fanout`, `cron-desk-run.js:1730-1771` calls `loadSlice(cycle)` directly, never `enrichAssignment`. When `loadSlice(cycle)` returns `null` (empty slice), line 1734 sets `beatSlice = null`, line 1761 (`if (!beatSlice && personaSlug && BEAT_BUILDERS[personaSlug])`) calls `loadSlice(cycle)` a second time, gets `null` again, and proceeds with the generic desk packet instead of aborting/skipping the wake.
- **Concrete input that breaks it:**
  - All non-media citizen pages for Cycle `N` are already in `output/cron-compare/voices_covered.json` by Friday.
  - Friday's `buildFanout` calls `buildVoicesSlice.enrichAssignment(assign, cycle)`: `loadSlice` returns `null`, `enrichAssignment` returns `assign` (with a generic `culture` seed from `lanes.culture`), and Ines Sorensen writes a generic culture piece instead of sitting the day out.

---

### Hunt 5 — Reconcile (`scripts/reconcileRheaDisposition.js` `heldFlags`)

- **Verdict:** **REAL** (Critical bug: `f.draft === path.basename(draftAbs)` matches by filename only, not SHA-256, causing an earlier thin failure on a base stem to un-stage and clobber a later clean staged filing of the same base!).
- **Locations:**
  - `scripts/reconcileRheaDisposition.js:168-174` (`heldFlags` and `effectivePass`)
  - `scripts/reconcileRheaDisposition.js:272-296` (flag branch un-staging `pairs.filter(p => p.sha === draftSha256)`)
  - `scripts/cron-desk-run.js:3073-3150` (`runWrite` routing to `STAGED` vs `FLAGGED`)

#### 5a. Leftover `flagged/<base>.flags.json` from Day 1 (or an initial thin run) poisons Day 2's (or a recovery run's) clean staged article because `heldFlags` checks `f.draft === path.basename(draftAbs)` instead of `draftSha256` — `REAL` (Critical)
- **Where:** `scripts/reconcileRheaDisposition.js:168-174` and `274-296`.
- **Mechanism:**
  Look at `scripts/reconcileRheaDisposition.js:168-174`:
  ```js
  const heldFlags = (() => {
    try {
      const f = readJson(path.join(flagged, base + '.flags.json'));
      return f.draft === path.basename(draftAbs) && Array.isArray(f.checkFlags) ? f.checkFlags.filter(Boolean) : [];
    } catch (_) { return []; }
  })();
  const effectivePass = verdict.pass && !contamination.fail && !heldFlags.length;
  ```
  Now trace how `cron-desk-run.js` writes files across days (or across a recovery re-run) for the same `base` (e.g. `culture_c113_tamsin-pruitt_packet-v2_x-ai-grok-4-3`, or `ines-sorensen`, or `nia-rook`, or any reporter re-run with `--only`):
  1. **Run 1 (e.g. Monday, or initial write): Draft is 45 words (thin), Rhea passes (`pass: true`).**
     - `cron-desk-run.js:3070` flips `pass = false` because `checkFlags` is `['thin: 45 words (floor 150, seat target 450-750)']`.
     - `cron-desk-run.js:3077` copies the 45-word draft to `output/cron-compare/flagged/<base>.md`.
     - `cron-desk-run.js:3141` writes `output/cron-compare/flagged/<base>.flags.json` with:
       `{ "draft": "<base>.md", "checkFlags": ["thin: 45 words (floor 150, seat target 450-750)"], ... }`.
       (Note: `cron-desk-run.js:3141` does **not** write `draftSha256` into `.flags.json`!)
  2. **Run 2 (e.g. Tuesday for a daily seat, or a same-day `--only` recovery re-run): Reporter writes a clean 600-word article (`sha = H_clean`), Rhea passes (`pass: true`), `checkFlags` is `[]`.**
     - `cron-desk-run.js` overwrites root `output/cron-compare/<base>.md` (now 600 words, `H_clean`) and root `output/cron-compare/<base>.rhea.json` (`pass: true`, `draftSha256: H_clean`).
     - `cron-desk-run.js:3077, 3115` copies the 600-word draft to `output/cron-compare/staged/<base>.staged.md` and writes `staged/<base>.staged.json`.
     - **Crucially, `cron-desk-run.js` NEVER deletes or archives `output/cron-compare/flagged/<base>.md` or `output/cron-compare/flagged/<base>.flags.json` when `pass === true`!** Run 1's `flagged/<base>.flags.json` remains in `output/cron-compare/flagged/`.
  3. **Saturday `12:00` (`preSaturdayCoverageSweep.js` → `reconcileRheaDisposition.js --cycle 113 --apply`):**
     - `reconcileVerdict` inspects root `<base>.rhea.json` (`pass: true, draftSha256: H_clean`) and root `<base>.md` (the 600-word article, `H_clean`).
     - `heldFlags` (`reconcileRheaDisposition.js:170-171`) reads `flagged/<base>.flags.json` (from Run 1's 45-word draft!).
     - Because `f.draft` (`"<base>.md"`) equals `path.basename(draftAbs)` (`"<base>.md"`), **and `heldFlags` never checks whether `flagged/<base>.md` (or `f.draftSha256`) matches `draftSha256` (`H_clean`)**, `heldFlags` returns `["thin: 45 words (floor 150, seat target 450-750)"]`!
     - `effectivePass` becomes **`false`**!
     - `reconcileVerdict` enters the `else` branch (`reconcileRheaDisposition.js:272-296`):
       ```js
       for (const p of pairs.filter(p => p.sha === draftSha256)) {
         archiveFile(p.md, history, 'failed-rereview', stamp, actions, apply);
         archiveFile(p.json, history, 'failed-rereview', stamp, actions, apply);
       }
       ```
       Because `staged/<base>.staged.md` has `p.sha === H_clean === draftSha256`, **`reconcileVerdict` un-stages and retires the clean 600-word article into `flagged/history/<base>.staged.failed-rereview.<stamp>.md`, overwrites `flagged/<base>.md` with the 600-word article, and writes `flagged/<base>.flags.json` binding `draftSha256: H_clean` to Run 1's `thin: 45 words` flag!**
- **Concrete input that breaks it:**
  - In `reconcileRheaDisposition.test.js` right after `Test 5b`:
    Suppose `civic_c999_test-thin` is re-run and produces a new 600-word draft (`fs.writeFileSync(thin.draft, '600 words...')`), a new passing verdict (`draftSha256` of the 600-word draft), and stages `staged/civic_c999_test-thin.staged.{md,json}`, while `flagged/civic_c999_test-thin.flags.json` from the earlier thin run is still in `flagged/`.
    Calling `reconcileVerdict({ root, verdictPath: thin.verdict, apply: true })` returns `disposition: 'flagged'`, **deletes `staged/civic_c999_test-thin.staged.{md,json}`**, and flags the 600-word draft as `'thin: 45 words'`.
  - **Fix requirement:** `heldFlags` must verify that the flagged artifact on disk is for the **same draft bytes** as `draftAbs` — e.g. `(f.draftSha256 ? f.draftSha256 === draftSha256 : (fs.existsSync(flaggedArticle) && sha256File(flaggedArticle) === draftSha256))`!

#### 5b. Other `.flags.json` writers and re-run idempotence — Verified (`FALSE-POSITIVE` on writer format; minor archive churn on re-run)
- All three `.flags.json` writers in `scripts/cron-desk-run.js` (`:3142`, `:3366`, `:3439`) write `draft: draftName` (`<base>.md`), matching `path.basename(draftAbs)`.
- On a second `reconcileVerdict` pass against the same failed draft, `checkFlags: heldFlags` (`reconcileRheaDisposition.js:288`) is preserved on the rewritten `.flags.json`, and `flags` (`:287`) does not duplicate `heldFlags` because it concatenates onto `verdict.flags` (from `.rhea.json`), not the prior `.flags.json`. (Note: each `--apply` re-run on a flagged verdict still archives the existing `flagged/<base>.{md,flags.json}` into `flagged/history/*.superseded-failure.<stamp>.*` before rewriting identical content.)

---

### Hunt 6 — Scorecard Override (`output/eic_scorecard_c112.json`)

- **Verdict:** **FALSE-POSITIVE** for `--step sweep` re-retraction; **REAL** (operational) for `archive/ARTICLE_INDEX.jsonl` not yet rebuilt on disk and `stepAudit` clobbering `overridden` if re-run.
- **Locations:**
  - `output/eic_scorecard_c112.json:221-250`
  - `scripts/cron-saturday-run.js:330-334` (`excludeCanonViolations`)
  - `scripts/cron-saturday-run.js:426-436` (`retractionIds`)
  - `scripts/cron-saturday-run.js:1087-1089, 1119-1132, 1235` (`stepAudit`, `curationScore`, `stepCurate`)
  - `scripts/buildArticleIndex.js:367-383, 407` (`violationSet`, `indexStaged`)

#### 6a. `--step sweep` (`excludeCanonViolations` & `retractionIds`) — `FALSE-POSITIVE`
- `excludeCanonViolations` (`scripts/cron-saturday-run.js:332`) filters `scorecard.articles.filter(a => a.verdict === 'canon-violation')`.
- `retractionIds` (`scripts/cron-saturday-run.js:430`) checks `if (a.verdict === 'canon-violation')`.
- `curationScore` (`scripts/cron-saturday-run.js:1131`) and `stepCurate` (`:1235`) check `verdict` only.
- Nothing in `scripts/` reads `failures.length` or `overridden` to exclude or retract an article. With `verdict: "accurate"` and `failures: []` on `culture_c112_tamsin-pruitt_packet-v2_x-ai-grok-4-3`, the next `--step sweep` includes the stem in `canonSet` (and `keep`) and will re-upsert it to Supermemory rather than retracting it.

#### 6b. `buildArticleIndex.js` flips the row in memory, but `archive/ARTICLE_INDEX.jsonl` on disk was not rebuilt in `22e9cc34` (and `stepAudit` does not preserve `overridden`) — `REAL` (operational)
- **Where:** `scripts/buildArticleIndex.js:368-371, 407`, `archive/ARTICLE_INDEX.jsonl`, and `scripts/cron-saturday-run.js:1087-1089`.
- **Mechanism:**
  1. `buildArticleIndex.js:370` builds `violationSet` from `a.verdict === 'canon-violation'`, so running `node scripts/buildArticleIndex.js --write` will flip `culture_c112_tamsin-pruitt_packet-v2_x-ai-grok-4-3` from `canon: false, stage: 'canon-violation'` to `canon: true, stage: 'passed-gate-not-printed'`.
  2. **However**, `archive/ARTICLE_INDEX.jsonl` on disk was **not** updated in commit `22e9cc34`: right now on disk, row `id: "ca6b5f5c6443d324"` (`output/cron-compare/staged/culture_c112_tamsin-pruitt_packet-v2_x-ai-grok-4-3.staged.md`) still has `"canon": false, "stage": "canon-violation"` until `node scripts/buildArticleIndex.js --write` (or `cron-saturday-run.js --step index --apply`) is executed.
  3. Also note: in `scripts/cron-saturday-run.js:1087-1089`, `stepAudit` writes `output/eic_scorecard_c<N>.json` unconditionally (even without `--apply`) and overwrites the file from scratch without preserving any manual `overridden` objects.

---

### Hunt 7 — Tests (`cronSaturdayRun.test.js`, `buildLivesSlice.test.js`, `reconcileRheaDisposition.test.js`)

- **Verdict:** **REAL** (3 test gaps where a broken implementation passes the suite).
- **Locations:**
  - `scripts/cronSaturdayRun.test.js:282-296`
  - `scripts/buildLivesSlice.test.js:173-177`
  - `scripts/reconcileRheaDisposition.test.js:141-151`

#### 7a. `auditOne`'s `=== LIVED EVENTS ===` and `— THE REPORTER (byline)` wiring has 0% test coverage — `REAL`
- **Where:** `scripts/cron-saturday-run.js:1033-1034, 1038, 1070-1074` vs `scripts/cronSaturdayRun.test.js:282-296`.
- **Mechanism:** `cronSaturdayRun.test.js:282-296` tests `X.livedEventsGroundTruth(...)` as a standalone helper, but never calls `auditOne` or `stepAudit`.
- **Concrete input that breaks it:**
  - Delete lines 1033–1034 (`const ownPop = ...`) and line 1038 (`...(livedText ? ... : [])`) in `scripts/cron-saturday-run.js`: `node scripts/cronSaturdayRun.test.js` still passes all 114 tests (`114 passed, 0 failed`).
  - Furthermore, in `cronSaturdayRun.test.js:291`, passing `X.livedEventsGroundTruth(999, ...)` (wrong cycle) against the `C111..C112` fixture still passes the test because `livedEventsGroundTruth` ignores its `cycle` argument (Hunt 1b).

#### 7b. `newsroom-fanout.js:722-726` (`if (next === null)` seat drop) has 0% test coverage — `REAL`
- **Where:** `scripts/newsroom-fanout.js:722-726` vs `scripts/buildLivesSlice.test.js:173-177` and `scripts/newsroom-fanout-beat-stale.test.js`.
- **Mechanism:** `buildLivesSlice.test.js:177` asserts `L.enrichAssignment(...) === null`, and `newsroom-fanout-beat-stale.test.js` tests `staleBeatRef` in isolation, but **no test exercises the `BEAT_BUILDERS` loop in `newsroom-fanout.js:716-746`** when `enrichAssignment` returns `null`.
- **Concrete input that breaks it:**
  - Delete lines 722–726 of `scripts/newsroom-fanout.js` (`if (next === null) { ... continue; }`): when `enrichAssignment` returns `null`, `staleBeatRef(null, filedBeats)` returns `null`, `if (next && next.beatSlice)` is false, `assignments[i]` remains in `assignments` as the bare un-enriched assignment (re-introducing the exact C112 Friday bug!), and **all 5 test files still pass**.

#### 7c. `reconcileRheaDisposition.test.js` (`Test 5b`) never tests a subsequent clean write of the same `base` — `REAL`
- **Where:** `scripts/reconcileRheaDisposition.test.js:141-151`.
- **Mechanism:** `Test 5b` tests only the single-filing case where `flagged/<base>.flags.json` belongs to the exact same draft as `thin.draft`. It never tests a second write of `<base>` where `thin.draft` has been overwritten with a passing 600-word article and new `draftSha256` while the old `.flags.json` remains in `flagged/` (Hunt 5a).
