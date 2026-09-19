---
title: Work-Wake Packs Plan — cron work-day reflections for working citizens
created: 2026-09-16
updated: 2026-09-19
type: plan
tags: [civic, citizens, sports, cron, active]
sources:
  - SESSION_CONTEXT.md NEXT[kimi] (Mike, 2026-09-16) — "cron wake packs for WORKING citizens"
  - scripts/citizen-wake.js — the rotating-citizen wake loop (perception + reflection + page + tag discipline)
  - scripts/newsroom-wake-packages.json + scripts/newsroomWakePackages.js — package-registry precedent
  - output/agent_engine-wiring_2026-09-16T17-17-23.md — wiring card for the Reflection_Intake / citizenPage write path
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout, row civic.37"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered 2026-09-19"
---

# Work-Wake Packs Plan

**Goal:** Working citizens who never wake — starting with the medical examiner, the EMS director, and A's players — get a cron-driven wake on their own work data (civic beats / the sports feed), producing a first-person work reflection accreted to their citizen page and tagged into Reflection_Intake, with zero dial/LifeHistory writes.

**Architecture:** A new package registry (`scripts/work-wake-packages.json`) plus a runner (`scripts/cron-work-wake.js`). The runner builds each citizen's perception pack from **local beats dumps only** (`output/beats/*.jsonl`, written by the existing `dumpBeatTabs.js` cadence — no fresh sheet reads), generates a work-voice reflection via OpenRouter/DeepSeek, then reuses the exact citizen-wake write path verified by the wiring card: `lib/citizenPage.js` `ensurePagePointer_` + `appendReflection_`, `lib/reflectionClassifier.js` `classifyTripleReflection_`, and one `sheets.appendRows('Reflection_Intake', …)` row with `applied=no` — the gated cycle read (`utilities/compressLifeHistory.js`) consumes it exactly as it consumes citizen-wake rows. No `.claude/agents/` persona dirs (control plane untouched — prompt contracts are inline in the registry). No crontab edit — schedule is proposed, builder installs.

**Terminal:** engine-sheet (implemented by kimi, house-guest lane)

**Pointers:**
- Prior work: `scripts/citizen-wake.js` (write path + Phase-1 gate discipline), `scripts/newsroomWakePackages.js` (registry validation shape)
- Related plan: [[2026-09-11-sports-as-a-lived-system]] (dial-9/fandom wake-reach context; engine.201 ruled tagging-out S451 — this plan is scripts-side, not engine)
- Wiring card: `output/agent_engine-wiring_2026-09-16T17-17-23.md` (Reflection_Intake/citizenPage/classifier write path; notes ENGINE_STUB_REVERSE.json lists NO writers for Reflection_Intake while `lib/personaProvider.js:200` writes it — stub-map staleness flagged for engine-sheet)
- Map basis (read-only exploration, 2026-09-16): police chief POP-00136 already wakes in the civic datawake rota and stays there (builder ruling); 21 null-`agentDir` offices in `scripts/civic-office-map.json` never wake; players are ordinary ledger citizens woken only by the generic shared A's line (`lib/wakePerception.js:95-115`)

**Acceptance criteria:**
1. `node scripts/cron-work-wake.js --dry-run --pack=med-examiner` prints the perception pack + a reflection for POP-00142 assembled from C107-local beats files, and writes nothing.
2. `node scripts/cron-work-wake.test.js` passes — registry validation, pack builders, and LRU/once-per-cycle selection against synthetic fixtures (visibly non-canon, no network).
3. A player pack (`--pack=<player-persona> --dry-run`) shows that player's own `NamesUsed`/`Stats` lines from `output/beats/Oakland_Sports_Feed.jsonl`, not the generic team line.
4. On an explicitly approved live run: the citizen's Supermemory page gains the reflection doc and Reflection_Intake gains one row (`applied=no`, daypart `work`) — verified by read-back.

---

## Tasks

### Task 1: Registry loader/validator `scripts/workWakePackages.js`

- **Files:**
  - `scripts/workWakePackages.js` — create
- **Steps:**
  1. Mirror the `scripts/newsroomWakePackages.js` contract shape: `loadPackages`, `validatePackage`, `activePackages`, plus `packageKeyFor`/`duePackages(state, cycle, day)`.
  2. Package schema: `{persona, active, popid (/^POP-\d{5}$/), name, office, dataNodes (non-empty array from a fixed enum: hospital-deaths, hospital-admissions, health-cause-queue, crime-metrics, civic-office, cycle-weather, sports-player), models.reflect {provider:'openrouter', model}, dutyDays (array of lowercase weekday abbreviations), promptContract {roleLine, voiceNotes, targetSentences}}`.
  3. `dataNodes` enum membership and `sports-player` requiring a `playerName` field are hard validation errors.
- **Verify:** `node --check scripts/workWakePackages.js` → exit 0; unit test in Task 5.

### Task 2: Initial registry `scripts/work-wake-packages.json`

- **Files:**
  - `scripts/work-wake-packages.json` — create
- **Steps:**
  1. `_comment` header: ADR-style note (living registry; scheduled fan-out is package-only).
  2. Entries (all `active: true`, `dutyDays: ["tue","thu"]` initial):
     - `med-examiner` — Jonas Patel, POP-00142, office MED-EXAM, dataNodes `["hospital-deaths","health-cause-queue"]`.
     - `ems-director` — Narang, POP-00141, office EMS-DIR, dataNodes `["hospital-admissions","health-cause-queue"]`.
     - Two A's players — `player-travis-coles` (Travis Coles, POP-00533, dataNodes `["sports-player"]`, playerName "Travis Coles") plus one position player resolved from `output/citizen-names.tsv` + `output/beats/Oakland_Sports_Feed.jsonl` `NamesUsed` at build time (both POPIDs verified against the ledger-backed names file before entry).
  3. Police chief POP-00136 is deliberately absent (builder ruling: he keeps the datawake seat only).
- **Verify:** loader validates the file clean: `node -e "require('/root/GodWorld/scripts/workWakePackages').loadPackages()"` → no throw.

### Task 3: Runner pack builders in `scripts/cron-work-wake.js`

- **Files:**
  - `scripts/cron-work-wake.js` — create (pack-builder section)
- **Steps:**
  1. CLI flags mirror citizen-wake: `--dry-run`, `--pack=<persona>`, `--cycle=N`, `--limit=N` (default 1).
  2. `readBeats(name)` — read `output/beats/<name>.jsonl` (+ `output/beats/prev/<name>.jsonl` for deltas where meaningful); missing file → pack builder returns `null` and the persona is skipped with a log line, never fatal.
  3. Node builders, each returning a short text block capped ~600 chars:
     - `hospital-deaths`: `Hospital_Ledger.jsonl` rows with `Outcome`/`StatusNow` indicating death, and discharges/transitions on the current cycle (`LastTransitionCycle == cycle`).
     - `hospital-admissions`: rows with `AdmitCycle == cycle` (cause + neighborhood, no invented detail).
     - `health-cause-queue`: `Health_Cause_Queue.jsonl` rows (status, cause, neighborhood).
     - `civic-office`: the pack citizen's own `Civic_Office_Ledger.jsonl` row (approval + notes) as standing context.
     - `sports-player`: `Oakland_Sports_Feed.jsonl` rows at `Cycle == cycle` whose `NamesUsed` or `Stats` contains `playerName`; render that player's slash-stat line + `PlayerMood` + `Team Record`; fall back to most recent cycle with a hit, then `null`.
  4. `cycle-weather` and `crime-metrics` builders exist but ship unused by the initial registry (future offices).
- **Verify:** covered by Task 5 tests with fixture JSONL.

### Task 4: Runner voice + write path in `scripts/cron-work-wake.js`

- **Files:**
  - `scripts/cron-work-wake.js` — create (voice + persist section)
- **Steps:**
  1. Selection: `duePackages` = active packs whose `dutyDays` includes today (or `--pack` forces one), LRU via `logs/work-wake-state.json`; skip any popid already woken this cycle (once-per-cycle-per-citizen guard in the same state file).
  2. Perception: identity line (name, office title, neighborhood if on the ledger row — read via the pack's own beats row only, no fresh sheet reads) + `civic-office` standing context + the day's node blocks. Own-page memory via `lib/wakePerception.js` `loadOwnPageReadback` reuses the fenced recall discipline.
  3. Voice: OpenRouter `deepseek/deepseek-chat` (same call shape as `citizen-wake.js` `generateVoice`), first-person work reflection, 4–5 sentences, promptContract roleLine/voiceNotes inline from the registry.
  4. Persist (live only, never on `--dry-run`): `ensurePagePointer_` → `appendReflection_` (daypart `work`) → `classifyTripleReflection_` → one `Reflection_Intake` appendRows row `[ts, popid, cycle, 'work', event, snippet, 'no', affect, '', tension || '', '']`. **No tension register, no ripple register, no dial/LifeHistory writes** (Phase-1 gate discipline carried over verbatim).
  5. New daypart token `work` in Reflection_Intake col D — flagged here for engine-sheet visibility; the gated reader (`utilities/compressLifeHistory.js` `getGriefConfig_`) filters on `applied`, not daypart, so the row flows through unchanged.
- **Verify:** `--dry-run` prints system+user prompts and reflection, writes nothing (assert via state-file mtime + no network on the persist path — persist section is skipped wholesale under `--dry-run`).

### Task 5: Tests `scripts/cron-work-wake.test.js`

- **Files:**
  - `scripts/cron-work-wake.test.js` — create
- **Steps:**
  1. Registry validation: rejects bad popid, unknown dataNode, `sports-player` without `playerName`, non-boolean `active`.
  2. Pack builders against fixture JSONL written to a temp dir (synthetic citizens: `POP-99901 Test Subject` etc. — visibly non-canon): deaths/admissions filtering by cycle, sports-player name matching and fallback, missing-file → `null`.
  3. Selection: duty-day filtering, LRU order, once-per-cycle guard, `--pack` force.
- **Verify:** `node scripts/cron-work-wake.test.js` → all pass.

### Task 6: Dry-run smoke on live local data

- **Files:** none modified (read-only run)
- **Steps:**
  1. `node scripts/cron-work-wake.js --dry-run --cycle=107 --pack=med-examiner`
  2. `node scripts/cron-work-wake.js --dry-run --cycle=107 --pack=ems-director`
  3. `node scripts/cron-work-wake.js --dry-run --cycle=107 --pack=player-travis-coles`
  4. Confirm each prints a grounded pack (numbers traceable to the beats rows) and a plausible reflection; confirm zero writes.
- **Verify:** eyeball output; `git status` shows no new/modified files under `logs/`, `output/`.

### Task 7: Schedule proposal (docs only — no crontab edit)

- **Files:**
  - `docs/OPERATIONS.md` — modify (proposed-line note only if the doc has a proposals pattern; otherwise carry the proposal in this plan's changelog and `NEXT[kimi]`)
- **Steps:**
  1. Propose: `18 20 * * 2,4 node /root/GodWorld/scripts/cron-work-wake.js >> /root/GodWorld/logs/cron-work-wake.log 2>&1` (Tue/Thu 20:18, after the beats dump cadence). **Builder installs; this plan never touches crontab.**
  2. First live run is separately gated: builder approval required (writes Supermemory + Reflection_Intake).
- **Verify:** n/a (proposal).

---

## Rollout row (proposed — for the accepting Claude seat to file)

```text
| civic.37 | Work-wake packs — cron work-day reflections for working citizens: non-district offices (ME, EMS) on their day's civic data; players on the sports feed | in-progress | engine-sheet | [[../plans/2026-09-16-work-wake-packs]] |
```

## Open questions

- [ ] **Fire chief (CHIEF-FIRE, Hollowell POP-00140) has no data node.** No fire beats tab exists in `output/beats/`; `Cycle_Weather` is the only adjacent signal and is too thin to carry a work day. Deferred unless the builder wants him waking on weather + hospital overflow, or an engine fire node is a separate ask. (Blocks nothing in the pilot.)
- [ ] Second player slot: resolved at Task 2 build time from roster/feed evidence; if no second player has both a ledger POPID and C107 `NamesUsed` hits, the pilot ships with one player pack.

## Changelog

- 2026-09-16 (kimi) — Initial draft. Map + wiring card verified same day; builder approved architecture (new work-wake path; ME + others first, police chief stays datawake-only) and this filing.
- 2026-09-19 (research-build, S467) — Accepted from the review inbox and moved to docs/plans. Row ID renumbered civic.34 → **civic.37**, because civic.34 is archived. State at filing: built (`8eb58b9a`), crontab installed (Tue/Thu 20:18), first live runs 2026-09-19 05:44 UTC for POP-00142 Jonas Patel and POP-00533 Travis Coles, each giving a page reflection plus a Reflection_Intake row with `applied=no`. Acceptance is the first unattended scheduled run (Tue 2026-09-22), read back.
