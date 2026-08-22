---
title: Citizen Archive ledger
created: 2026-08-21
updated: 2026-08-22
type: plan
tags: [engine, ledger, citizens, active]
sources:
  - docs/research/2026-07-29-citizen-archive.md
  - docs/engine/ROLLOUT_PLAN.md engine.90
  - Mike-direct 2026-08-21 — design Citizen_Archive for Traded / deceased / migrated; POPIDs never reissued; full row for heritage
  - Mike-direct 2026-08-22 — v1 = deceased + Traded only; file this plan; rerun live Status pull before treating 2026-08-17 true-up counts as current
  - output/simulation_ledger_snapshot.meta.json — dumpLedger C104 2026-08-22T04:41Z
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.90"
  - "[[../research/2026-07-29-citizen-archive]] — adopted research"
  - "[[2026-08-17-ledger-trueup-sweep]] — true-up sequencing sibling (engine.117)"
  - "[[2026-08-01-business-lifecycle-generator]] — Business_Archive + bizIdHighWater sibling"
  - "[[SCHEMA]] — doc conventions"
---

# Citizen Archive ledger (engine.90)

**Goal:** Terminal exits (`deceased`, `Traded`) leave `Simulation_Ledger` with a full-row copy on `Citizen_Archive`; POPIDs are never reissued; traded-away returns use the same POPID.

**Architecture:** `Simulation_Ledger` is the active Oakland cohort. `Citizen_Archive` is the cold full-row home (A–BB snapshot plus exit metadata). Movement is copy → read-back → remove, as `Phase11-CitizenArchive` after MediaIntake. `popIdHighWater` (World_Config, same contract as shipped `bizIdHighWater`) is the mint authority. Heritage resolves archived POPIDs without putting ghosts on the event loop.

**Terminal:** engine-sheet (substrate). Grok authored the spec; kimi/codex may land `scripts/**` / `docs/**` inside ordinary writable scope.

**Research basis:** [[../research/2026-07-29-citizen-archive]] (verdict `adopt`).

**Acceptance criteria:**
1. No cycle-path POPID minter reads max(Simulation_Ledger) alone; `popIdHighWater` is seeded and monotonic.
2. Sandbox: deceased copy-verify-remove; next mint ≠ archived id; trade-away → archive → restore-action → same POPID Active; ordinary sports `call-up` of a still-Active affiliate unchanged.
3. Live backfill only after builder approval, restore function exists, and inventory of the live eligible set. Active snapshot no longer contains those POPIDs; archive snapshot does; `canon-name-check` still matches their names.
4. Event engines never iterate `Citizen_Archive`. Heritage `FounderPopId` / `MembersList` still resolve.

---

## Builder decisions (2026-08-22)

- **v1 ArchiveReason set = `deceased` + `traded-away` only.** Permanent-migration reserved until an out-of-Oakland writer exists. Intra-city `migrationTrackingEngine.js` stays on Simulation_Ledger. Herbert Jones / Los Angeles is already `Traded`.
- **Return trigger (Mike 2026-08-22):** changing a traded player to `Status=Active` moves them back to Oakland under the same POPID. That flip is the intent; restore is the mechanism once the row lives on `Citizen_Archive`. Deceased is not ReturnEligible.
- **File this plan** as the engine.90 pointer. Scratch `/tmp` is not the spec.
- **True-up sequencing:** do not use the 2026-08-17 “53 all defective” claim as current. Live dump first (done below). Inventory script still runs before repair/`ArchiveNote`. Citywide engine.117 (SchoolQuality Task 1, 348-row sweep) is **not** a gate on allocator/schema/sandbox. Live backfill still waits on measured defects on the eligible set, not on the whole ledger.

---

## Live inventory (dumpLedger C104, 2026-08-22T04:41Z)

964 rows. Max POPID **POP-01079**. Counts **unchanged** from the 2026-08-21 11:15Z snapshot.

| Status (exact) | Count | Archive-eligible? |
|---|---|---|
| `Active` | 864 | No |
| `active` (POP-01028 Wendell Carter Jr., GAME) | 1 | No — case drift, stays on SL |
| `Retired` | 45 | No — still Oakland |
| `Traded` | 49 | Yes — v1 |
| `deceased` | 5 | Yes — v1 |
| `Migrated` / `pending` / `inactive` / `injured` / `hospitalized` / `critical` / `recovering` | **0** | — |

**Traded (49):** 47 GAME + 2 ENGINE (`POP-00027` Philly Rodriguez Casino Manager; `POP-00032` Anthony Casto 1B Oakland A's). Several GAME rows have `RoleType=traded` (Haskett, Ciccone, McCloud, Ramos, Seymour, Thomas, Hand, Mullins, Ono). Destinations still include A's/affiliate/Yankees/Giants/Oaks labels — Status is the eligibility bit, not RoleType.

**Deceased (5), all ENGINE, all blank LineageId, MigrationIntent empty:**

| POPID | Name | CareerStage | SchoolQuality | NetWorth |
|---|---|---|---|---|
| POP-00331 | Isabelle Louis | retired | 5 | 1331000 |
| POP-00492 | Dune Topez | retired | 5 | 604231 |
| POP-00694 | Marcello Ramas | mid-career | 5 | 112000 |
| POP-00713 | Lilo Belton | retired | 5 | 1810000 |
| POP-00828 | Sumiko Mensah | `mid` (non-canonical) | blank | 493000 |

SchoolQuality default-`5` is still common on this set. That is **not** proof every row is still as defective as 2026-08-17; Commit 7 inventories, Commit 8 repairs only what that inventory measures.

Eligible share: **54 / 964 = 5.6%**.

---

## This document

Implementation spec for engine.90. Originated as a Grok design (rev 4, reviewed to 0 open issues). Engine-sheet implements from **this file**, not `/tmp`.

---

## Overview

`Simulation_Ledger` currently retains every citizen who has left Oakland's active life. Status skip-gates (`deceased`, `traded`, `pending`, `inactive`) prevent most engines from generating new events, but the rows still load into `ctx.ledger` every Cycle, still occupy the consolidated Phase 10 write, and still confuse "who is in Oakland" with "who ever had a POPID."

This design adds `Citizen_Archive`: a full-row historical home for **terminal exits** (deceased, traded-away, and — when a writer exists — permanent migration). `Simulation_Ledger` becomes the active Oakland cohort. POPIDs are permanent and never reissued. Movement is copy → read-back by POPID → remove; a failed archive write leaves the Simulation_Ledger row intact. Traded or migrated citizens who return re-enter Simulation_Ledger under the **same POPID**; prior archive rows stay as append-only history.

Shrinking the ledger is **not** the browser-freeze lever (54 archive-eligible rows are 5.6% of 964; Simulation_Ledger was 1.46 MB of a 14.53 MB workbook). It **is** the correct lifecycle boundary and the write-economy for engines that still scan skipped rows. Deaths and trades accumulate; this is the growth brake.

---

## Background & Motivation

### Adopted research (do not reopen)

`docs/research/2026-07-29-citizen-archive.md` (verdict `adopt`, 2026-07-29; generalized 2026-08-01; allocator pattern answered 2026-08-05 via the BIZ-ID sibling). Builder decisions already on the books:

- A POPID identifies one citizen forever; never reuse.
- Simulation_Ledger = active Oakland cohort; Citizen_Archive = full-row historical home.
- Archive only terminal exits. Health states stay on Simulation_Ledger + `Hospital_Ledger`.
- Retired living in Oakland stays on Simulation_Ledger.
- Consequence first, archive last. Copy, verify, then remove.
- Shared POPID resolver: active first, archive second.
- Return uses the same POPID; prior archive record stays as history.
- Central allocation cannot be `max(current Simulation_Ledger)` once rows leave.
- `LifeHistory_Archive` is a 7-column event log (schema dump currently 9 cols with two empty) — do not reuse it for citizen rows.
- Mike 2026-08-01: every sim exit lands on an archive ledger; IDs never reissued (`Business_Archive` is the sibling; `bizIdHighWater` shipped S357, commit `81dd7bff`).
- Gate axis for newsroom is real-world-vs-in-world, **not** ledger membership — archived citizens remain historical canon, never current-state.

### Current state (measured, not guessed)

| Source | Count | Note |
|---|---|---|
| `SESSION_CONTEXT.md` PIN S387 | Ledger **964** rows, C104 | Claim |
| `output/simulation_ledger_snapshot.jsonl` meta 2026-08-21T11:15Z | **964** rows, cycle 104 | `dumpLedger.js` — this is what `canon-name-check` reads |
| `docs/engine/LEDGER_AUDIT.md` headline S386 (2026-08-21) | **964** rows live, max **POP-01079** | Almanzar POP-01078, Brooks POP-01079 |
| `schemas/SCHEMA_HEADERS.md` `## Simulation_Ledger` | **962** rows, **54** cols A–BB | **Stale vs snapshot by 2 rows** |
| `docs/SIMULATION_LEDGER.md` banner | 940 / max POP-01055 (S360) | **Stale** |
| True-up audit 2026-08-17 (`docs/plans/2026-08-17-ledger-trueup-sweep.md`) | 961 rows; Active 861, Traded 49, Retired 46, deceased 4, injured 1 | Pre-mint baseline |

**Live snapshot Status (2026-08-21, 964 rows):**

| Status | Count | Archive-eligible? |
|---|---|---|
| `Active` | 864 | No |
| `active` (lowercase; POP-01028 Wendell Carter Jr.) | 1 | No — treat as Active; do not archive a case-drift living row |
| `Retired` | 45 | No (still lives in Oakland) |
| `Traded` | 49 (47 GAME + 2 ENGINE) | **Yes** — `traded-away` |
| `deceased` | 5 | **Yes** — `deceased` |
| `pending` / `inactive` / `injured` / `hospitalized` / `Migrated` | **0** on snapshot | pending/inactive stay open (research); health stays on SL; **no `Status=Migrated` exists** |

Archive-eligible today: **49 + 5 = 54 / 964 = 5.6%**. The 2026-08-17 figure was 53 / 961 = 5.5% (one additional deceased since that audit). All five current deceased rows (`POP-00331`, `POP-00492`, `POP-00694`, `POP-00713`, `POP-00828`) have **blank `LineageId`** — Heritage_Ledger is not established for those families. The true-up plan’s “all 53 carry ≥1 defect” measurement covers the 2026-08-17 set only; the fifth deceased is **not** proven defective until the dry-run inventory.

`Heritage_Ledger` schema dump: **6 rows, 16 cols**, keys `FounderPopId` + `MembersList` (JSON array of POPIDs). Snapshot LineageId occupancy: 11 Simulation_Ledger citizens across 5 distinct `LIN-0000x` values.

### Pain points

1. **Status skip is not a lifecycle.** Every Phase 5 engine still walks the full `ctx.ledger.rows` array and `continue`s on terminal status. The skip list is copy-pasted and incomplete. Verified hole: `educationCareerEngine.js` L216 / L356 / L474 skip only `deceased` — `Traded` GAME rows still enter education/career fill loops. (`runCareerEngine.js` L740–744 and `bondEngine.js` L468–469 **do** skip `traded`/`pending`/`deceased`; those two are not the hole.) Removing terminal rows is the lifecycle fix; skip-gates will keep drifting.
2. **POPID mint is `max(Simulation_Ledger)+1` in at least six live writers.** Safe only while the highest POPID never leaves the sheet. After archive, that allocator reissues identities.
3. **Heritage and inheritance currently require the deceased row to still sit on Simulation_Ledger.** `findHeirs_`, `getCitizenWealth_`, and `updateHeritage_` all scan `ctx.ledger.rows`. The five deceased citizens have no LineageId; the archive row is the only durable source of NetWorth / family pointers until a line is founded.
4. **Sports intake already stops at `Status=Traded`.** `docs/OAKLAND_SPORTS_FEED.md` and `docs/plans/2026-08-02-sports-stat-event-intake.md`: `trade-away` writes Status, does not delete or archive; engine.90 owns the later move.
5. **Workbook freeze is a different problem.** `docs/plans/2026-08-17-sheet-weight-reduction.md` measured Simulation_Ledger at 1.46 MB of ~14.53 MB text. Engine_Errors was 4.33 MB; LifeHistory_Log 2.18 MB. Do not sell this project as a freeze fix.

---

## Goals & Non-Goals

### Goals

1. Tab `Citizen_Archive` with a full Simulation_Ledger snapshot plus explicit movement metadata.
2. Archive only terminal exits: `deceased` \| `traded-away` \| `permanent-migration`.
3. Movement protocol at a proven post-commit point that does not invalidate `ctx.ledger` for later phases (death/health already ran in Phase 5).
4. `popIdHighWater` mirroring `bizIdHighWater`; every mint site on the contract before the first move.
5. Shared resolver: Simulation_Ledger first, Citizen_Archive second; callers classified (full row / identity-only / must-not-treat-as-living).
6. Heritage and inheritance resolve archived POPIDs without putting ghosts on the event loop.
7. Bidirectional return: same POPID, one active row max, append-only historical exits.
8. Honest size accounting.
9. True-up sequencing: inventory first; do not bury measured defects; subset vs full true-up is a builder question; repair and row-removal are separate commits.
10. Fail-loud on duplicates, missing copy, dangling identity, high-water regression.
11. NBA POPID-reuse debt as audit only — no invented replacement canon.
12. Tests: synthetic fixtures; Node VM harness (`griefPeriod.test.js` pattern); sandbox-bench for movement including restore-action round trip; no live `--apply` on first land.
13. Restore before any live Traded row leaves Simulation_Ledger. **Trigger = Status becomes Active** (same POPID, back in Oakland). Sports `call-up` stays Active→Active and does not restore. Sports `return` stays injury-only (`injured`/`serious-condition`/`recovering` → Active) and does not restore.

### Non-goals

- Do not change faction routing or tracker writes.
- Do not archive `Generic_Citizens` / Tier-5.
- Do not delete `LifeHistory_Log` events for archived citizens.
- Do not archive health states (`injured`, `serious-condition`, `hospitalized`, `critical`, `recovering`).
- Do not archive `Retired` Oakland residents.
- Do not archive `pending` / `inactive` in this design (research left them open).
- Do not implement in this task.
- Do not create isolated Markdown in the GodWorld git tree.
- Do not reuse `LifeHistory_Archive`.
- Do not fold Business_Archive shipping into this project (sibling pattern only).

---

## Key Decisions

1. **Tab name is `Citizen_Archive`.** Matches adopted research and the Business_Archive sibling. Add `SHEET_NAMES.CITIZEN_ARCHIVE` in the schema commit. `utilities/sheetNames.js` already has `SIMULATION_LEDGER` and `LIFEHISTORY_LOG`; it does **not** currently register `LIFEHISTORY_ARCHIVE` or `BUSINESS_ARCHIVE` — do not imply those siblings are already there. Registering `LIFEHISTORY_ARCHIVE` in the same commit is optional hygiene; `BUSINESS_ARCHIVE` is out of scope.

2. **Schema = Simulation_Ledger A–BB in the same order, plus six research-minimum metadata columns, plus `ArchiveNote`.** Exact columns in §Data Model. `SchemaVersion` is the integer column count of the snapshot portion (54 today). Extra metadata is not part of that count. **Standing invariant while this archive exists:** Simulation_Ledger column adds are **append-only** (AY/AZ S312, BA LineageId, BB SkillTags S336). Restore with `SchemaVersion < current` pads blank cells on the right. A mid-schema insert or reorder would misalign every archived A–BB snapshot; that change, if it ever happens, must header-map on restore — it is not the pad-blank path.

3. **`ArchiveReason` enum is exactly `deceased` \| `traded-away` \| `permanent-migration`.** Mapped from live Status `deceased` / `Traded`. There is **no** live `Status=Migrated` (grep across `*.js`/`*.md` is empty). Permanent-migration is reserved for a future writer; do not infer it from intra-city `MigrationDestination` (those are Oakland hoods). See Open Questions.

4. **Movement runs as `Phase11-CitizenArchive` after `Phase11-MediaIntake` and before `Phase11-MaintainLifeHistoryLog`.** Direct writes (post-`Phase10-ExecuteIntents`). Same transactional class as `utilities/archiveLifeHistory.js`. `ctx.ledger` is **not** mutated mid-cycle. Copy source is the **committed sheet row** after Phase 10, not in-memory rows that Phase 11 might still be reading.

5. **POPID allocator is `popIdHighWater` in `World_Config`, identical contract to `bizIdHighWater`.** Hot path: `next = max(highWater || 0, activeSimulationLedgerMax) + 1`. **Do not scan Citizen_Archive on the mint path.** Reconciliation audit asserts `max(archive numeric) ≤ highWater`. This is the 2026-08-05 adopted answer in the research changelog, not a reopening. **Two artifacts, one contract** (`.claspignore` excludes `lib/**`): Node `lib/sheets.js` helpers for scripts; clasp-deployed `nextPopIdLocked_(ctx)` in `utilities/popIdAllocator.js`. They must not drift. Same split as shipped BIZ-ID (`lib/sheets.js` vs `generationalWealthEngine.js` L1691–1717).

6. **Archive is append-only snapshots, not one mutable tombstone per POPID.** Settled by Mike-direct 2026-08-17 (bidirectional; same POPID on return; prior record stays) plus the research return protocol. Global invariant: ≤1 active Simulation_Ledger row per POPID. Multiple archive rows per POPID are legal (leave / return / leave).

7. **No separate POPID directory.** High-water + Simulation_Ledger ∪ Citizen_Archive is the identity authority. A tombstone index is optional later, not required to ship.

8. **`dumpLedger.js` stays the active-cohort snapshot and, in the same invocation, writes the archive sibling when the tab exists.** Files: `output/simulation_ledger_snapshot.jsonl` (active) + `output/citizen_archive_ledger_snapshot.jsonl` (historical). Both metas. **Always abort if Simulation_Ledger is empty** (unchanged). Citizen_Archive:
   - Tab present, zero body rows → empty JSONL + `rowCount: 0`; active dump succeeds.
   - Tab **absent** and live ensure has **not** run → **log loud, skip the archive file, still write the active JSONL, exit 0.** Commit 4 can land before live tab ensure without halting `/city-hall-prep`.
   - Abort on missing tab **only after** `SHEET_NAMES.CITIZEN_ARCHIVE` is registered **and** the live tab has been ensured (Commit 3 live ensure writes World_Config `citizenArchiveTabLive=1`; dumpLedger aborts missing-tab iff that flag is 1).
   `canon-name-check` unions both files when the archive snapshot exists. `/city-hall-prep` (`cron-civic-run.js` ~L519) stays one exec. Desk-packet `citizen_archive.json` is unrelated. Dashboard Layer 1b = Citizen_Archive **sheet**.

9. **Do not bury defects; inventory first.** Repair vs `ArchiveNote` on the archive-eligible set, and whether subset-true-up satisfies the 2026-08-17 “archive after true-up” letter, are builder questions (Open Questions 5 and 8). Do not pre-stamp the fifth deceased. Do not pair defect repair and `deleteRows` in one commit.

10. **First land is allocator + schema + resolver + sandbox movement. No live sheet writes in those commits.** Live World_Config seed, live empty-tab ensure, live repair, and live backfill are each separately approved. **Restore (Status→Active on a ReturnEligible POPID) lands and sandbox-proves before any live Traded row leaves Simulation_Ledger.** Sports `call-up` is not that restore. Sports `return` is injury recovery, not trade-return.

---

## Proposed Design

### 1. Engine order (proved from `phase01-config/godWorldEngine2.js`)

Source file for health/death is `phase04-events/generationalEventsEngine.js`; **cycle wiring is Phase 5**, not Phase 4. Both entry points call `runGenerationalEngine_` as `Phase5-Generational` (production ~L351, `runCyclePhases_` ~L1953). There is no Phase 4 call of that function. Consequence-first still holds because `Phase5-Generational` runs **before** `Phase5-GenerationalWealth` (~L372 / ~L1974) and before Phase 10 persist.

Production cycle (same shape on `runCyclePhases_`):

```text
Phase 1   initSimulationLedger_  → ctx.ledger = { headers, rows, dirty }
          loadConfig_            → ctx.config.* including future popIdHighWater
                                  (parseFloat on numeric World_Config values)
…
Phase 5   Phase5-Generational        runGenerationalEngine_
            health lifecycle + triggerDeathCascade_
            (Status → deceased in ctx.ledger.rows; hospitalEvents queued)
          Phase5-Bonds / HouseholdFormation  (still see the row)
          Phase5-GenerationalWealth  findHeirs_, distributeInheritance_, updateHeritage_
          Phase5-EducationCareer     (skip hole: deceased-only; traded still enter)
…
Phase 7   evening / culturalLedger / buildEveningFamous_  (ctx.ledger)
Phase 10  commitSimulationLedger_   queueRangeIntent_(Simulation_Ledger, row 2, ALL ctx.ledger.rows)
          executePersistIntents_    ← last intent executor; then clearAllIntents_
Phase 11  processMediaIntake_       cycle path: ctx.ledger; manual: sheet
          ★ archiveCitizenExits_    NEW — direct sheet copy/verify/delete
          maintainLifeHistoryLog_   MUST remain last among LifeHistory_Log rewriters
```

```mermaid
sequenceDiagram
  participant P5g as Phase5-Generational
  participant P5w as Phase5-GenerationalWealth
  participant P10c as Phase10-CommitLedger
  participant P10e as Phase10-ExecuteIntents
  participant P11m as Phase11-MediaIntake
  participant P11a as Phase11-CitizenArchive
  participant P11h as Phase11-MaintainLifeHistoryLog
  participant SL as Simulation_Ledger
  participant CA as Citizen_Archive

  P5g->>P5g: Status=deceased in ctx.ledger; death cascade
  P5w->>P5w: inheritance, heritage while row still in ctx.ledger
  P10c->>P10c: queueRangeIntent full ctx.ledger.rows
  P10e->>SL: persist terminal Status
  P11m->>P11m: name-match via ctx.ledger (this-cycle dead still in memory)
  P11a->>CA: append full row + metadata (direct)
  P11a->>CA: read-back by POPID
  alt read-back ok
    P11a->>SL: delete/rewrite those rows (direct)
  else read-back fail
    P11a->>SL: leave row intact; Engine_Errors
  end
  P11h->>P11h: LifeHistory_Log trim (unchanged; does not need SL row)
```

**Why not archive inside Phase 10?** `commitSimulationLedger_` writes the entire `ctx.ledger.rows` range starting at sheet row 2. It does **not** `deleteRows`. Removing from `ctx.ledger.rows` before commit would leave orphan tail rows on the sheet and skip the copy-verify-remove contract.

**Why not archive immediately after ExecuteIntents, before MediaIntake?** Cycle-path `processMediaIntake_` (`phase07-evening-media/mediaRoomIntake.js` L537–540 and L1069–1072) uses `ctx.ledger` when present and **does not write Simulation_Ledger** (routes to Intake / Advancement_Intake1). `ctx.cache.flush()` after Phase 11 queues World_Config / World_Population, not SL. So **cycle-path** archive immediately after ExecuteIntents would not drop this-cycle deaths from name-routing **if** `ctx.ledger` is left intact — which this design already requires. Post-MediaIntake is still the slot: (1) operator/manual intake re-reads the sheet; (2) avoid interleaving two Phase-11 direct-write systems; (3) keep `maintainLifeHistoryLog_` last among log rewriters.

**Why direct writes?** engine.md: any write after `Phase10-ExecuteIntents` MUST be direct — queued intents would land in `ctx.persist` with nothing left to commit them. `archiveLifeHistory.js` is the existing copy-then-trim / `clearContent` / `deleteRows` carve-out, transactional, post-read. Citizen_Archive is the same class.

**Operator trades** (`scripts/sportsFeedContract.js`: `trade-away` requires `citizen.status.before` Active, after `Traded`) happen **between** cycles, not inside Phase 5. Those rows sit on Simulation_Ledger with `Status=Traded` at the next cycle start and are picked up by the same Phase 11 pass. Sports intake does not archive. **`call-up` is not return-from-archive.** The sports-stat-event-intake plan: `call-up` requires an existing ledger POPID with **current Status Active**; it writes Active and changes team/position/RoleType — “No citizen creation, salary inference, or roster-row append.” After archive, a missing SL POPID on `call-up` **fail-louds** (optionally “archived — use restore”), it does **not** silently restore. Return uses a separate restore function (and, if sports later needs a writer, a new action such as `trade-return` — not `call-up`). That restore must exist **before** any live Traded move.

### 2. Movement protocol

Per eligible POPID, fail-loud, one citizen at a time (or a small verified batch with per-row abort):

```text
1. Eligibility: Status lowercased ∈ {deceased, traded}
   — permanent-migration: only if/when a writer exists (Open Question)
   — skip lowercase-`active`, Retired, health states, pending, inactive
2. Assert POPID matches /^POP-\d+$/ and is not already an *active* duplicate on SL
3. Snapshot the committed Simulation_Ledger row (54 cells, header-mapped)
4. Stamp metadata (ArchiveReason, ExitCycle=this cycle, SourceEventId, LastActiveStatus,
   ReturnEligible, SchemaVersion=54, ArchiveNote if stamped)
5. Append to Citizen_Archive (direct)
6. Read back by POPID + ExitCycle (the new snapshot, not an older exit)
   — required fields present, SchemaVersion matches, POPID exact
7. Only then remove the Simulation_Ledger row (rewrite remaining body + delete excess rows,
   same pattern as archiveLifeHistory.js L184–200)
8. Reconcile: POPID absent from SL; present on archive; high-water ≥ numeric POPID
9. Do not mutate ctx.ledger.rows this cycle (Phase 11 consumers already finished)
```

`commitSimulationLedger_` cannot be the remover. Remover = `deleteRows` / full-body rewrite, which is why LifeHistory archival already lives in Phase 11.

**Failed archive write leaves the Simulation_Ledger row intact.** Never delete first.

### 3. Return protocol (traded-away / permanent-migration only)

**Trigger:** `Status` becomes `Active` for a POPID whose latest terminal exit is ReturnEligible (`traded-away`, later `permanent-migration`). That is the Oakland-return. Not a new identity. Not sports `call-up`. Not sports `return` (that action is injury recovery: `injured`/`serious-condition`/`recovering` → Active on an existing SL row — `sportsFeedContract.js` L447–460).

**Two surfaces, one intent:**

| Where the row is | What “set Active” does |
|---|---|
| Still on Simulation_Ledger (`Status=Traded`, pre-archive or flag off) | Write `Status=Active` on that row. They never left the active cohort; event gates open again. Stamp `ReturnedCycle`. |
| On Citizen_Archive (post copy-verify-remove) | There is no SL row to edit. Restore copies the latest archive snapshot onto Simulation_Ledger with `Status=Active`, then the engines see an Oaklander again. |

Do not flip Status on the archive row and leave them there — archive is history. Active belongs on Simulation_Ledger.

```text
1. Resolve POPID: Simulation_Ledger first, else Citizen_Archive (latest exit snapshot)
2. If already Active on SL → no-op (idempotent)
3. If Traded (or ReturnEligible) on SL → Status=Active + ReturnedCycle; do not touch archive
4. If only in archive:
   a. Fail-loud if Simulation_Ledger already has that POPID
   b. Fail-loud if latest ArchiveReason is deceased (not ReturnEligible)
   c. Restore a current-state Simulation_Ledger row from the latest snapshot:
      Status=Active; ReturnedCycle=this cycle (column AQ — first cycle-path writer;
      COL_MAP today lists no engine touch); LastUpdated stamped;
      HealthCause/StatusStartCycle cleared;
      MigrationDestination cleared if they are back in a canon Neighborhood_Map hood
      (so `undockedDraw.js` `ReturnedCycle >= MigratedCycle` / empty-dest “resides in Oakland” holds)
   d. Append Return/Arrival LifeHistory line + LifeHistory_Log row + Ripple
   e. Keep every prior archive row (do not delete, do not flip to a tombstone)
```

**Callers:** any writer that sets a traded POPID to Active — sheet edit, operator restore helper, or a later sports action that means “back on an Oakland roster.” **`call-up` is not a caller** (Active affiliate → Active major-leaguer; before must already be Active). **Sports `return` is not a caller** (injury). After archive, `call-up` of a missing POPID fail-louds; a dedicated trade-return / “set Active” path is what restores. Restore ships **before** any live Traded backfill.

### 4. Eligibility matrix (unchanged from research, confirmed against code)

| Condition | Simulation_Ledger | Owner today | Archive? |
|---|---|---|---|
| Active / `active` case-drift | Remains | Engines | No |
| injured / serious-condition / hospitalized / critical / recovering | Remains | `processHealthLifecycle_` + `Hospital_Ledger` (`phase10-persistence/buildCyclePacket.js` `persistHospitalLedger_`) | No |
| Retired in Oakland | Remains | Daily-life engines | No |
| Roster bench/call-up without leaving Oakland | Remains | Sports intake | No |
| `Status=Traded` | Leaves after consequences (already applied by sports writer) | Sports intake + this mover | **Yes** (`traded-away`) |
| `Status=deceased` after death cascade + Phase 5 inheritance | Leaves after Phase 10 persist | `generationalEventsEngine.js` `triggerDeathCascade_` + `generationalWealthEngine.js` | **Yes** (`deceased`) |
| Permanent leave of Oakland | No Status value today | Intra-city only in `migrationTrackingEngine.js` | Reserved (`permanent-migration`) |
| pending / inactive | Remains | Intake / skip gates | **No** (research left open) |
| Generic_Citizens / Chicago_Citizens | Out of scope | Tier-5 / frozen Chicago | **No** |

### 5. Size: does shrinking the ledger matter?

**Short answer: not as a freeze fix; yes as a lifecycle and scan-economy.**

| Metric | Number | Source |
|---|---|---|
| Archive-eligible share (2026-08-17) | 49 Traded + 4 deceased = **53 / 961 = 5.5%** | true-up plan (Mike-direct sequencing) |
| Archive-eligible share (2026-08-21) | 49 Traded + 5 deceased = **54 / 964 = 5.6%** | snapshot JSONL |
| Simulation_Ledger text payload | **1.46 MB** of **14.53 MB** workbook text (~10%) | sheet-weight plan S378 |
| Implied payload of 54 rows | ~5.6% of 1.46 MB ≈ **0.08 MB** of the workbook | arithmetic on measured payload |
| Freeze cause | 2.29M allocated-empty cells; Engine_Errors **4.33 MB**; LifeHistory_Log **2.18 MB** | same plan |
| Grid reclaim already shipped | 2,853,341 → 1,288,488 allocated cells (−54.8%) | sheet-weight Task 1 |
| `getDataRange` at cycle start | 965 rows × 54 cols (header + 964) vs 911 after a full backfill | `initSimulationLedger.js` |
| Phase 10 write | `queueRangeIntent_` of **all** `ctx.ledger.rows` when dirty — 54 fewer rows is a small range shrink, not a different write shape | `commitSimulationLedger.js` |
| Per-cycle CPU | Every Phase 5 engine (and several Phase 4 micro-event generators) iterates all rows and status-skips. Skip sites are numerous (`generateCitizensEvents`, `runHouseholdEngine`, `runRelationshipEngine`, `runNeighborhoodEngine`, `runEducationEngine`, `generateMediaModeEvents`, `generateCivicModeEvents`, `generateGenericCitizenMicroEvent`, `commuteFlowEngine`, `citizenContextBuilder.isEventEligible_`, `bondEngine`, …). Removing 54 rows removes 54 iterations **per engine**, not 54 writes. | grep Status skip gates |
| Long-term | Deaths + trades accumulate. This is the **growth brake**. 5.6% today; the share only grows. | research + true-up |

Do not oversell size. The true-up plan already said it: archive is worth building for write-economy and a clean active roster; it does not meaningfully shrink the 348-row defect surface.

---

## API / Interface Changes

### `World_Config` key `popIdHighWater`

Mirror `bizIdHighWater` (`lib/sheets.js` L260–300; Apps Script write-back in `generationalWealthEngine.js` L1691–1717).

Contract for every minter:

```text
next = Math.max(highWater || 0, activeSimulationLedgerMax) + 1
… mint the batch …
setPopIdHighWater(lastNumberUsed)   // monotonic; never lowers
```

- Never scan Citizen_Archive on the mint path.
- **Persist is a no-op while the World_Config `popIdHighWater` row is missing.** Allocation still uses `max(0, activeSimulationLedgerMax)+1`. Commit 2 **creates** the row (sandbox then approved live). Commit 1 deploy must **not** self-seed live World_Config on the next birth/promotion (unlike shipped BIZ-ID Apps Script write-back, which self-seeds). After the row exists, mint write-back is monotonic as specified.
- Seed value when Commit 2 writes the row: **1079** (snapshot max POP-01079), then `max(seed, that spreadsheet’s SL max)`.
- Crash-safety **after the row exists**: lost write-back heals via next run's active max **until the first archive move**. After the first move, the mark is load-bearing — fail-loud if missing.
- Archive mover bumps the mark if it moves a row whose numeric ID exceeds it (hand-appended-then-archived leak; same as Business_Archive step c).
- Fail-loud if a write would lower the mark.
- **Seed writes World_Config only in Commit 2.** Do not bake a live seed into the code-only allocator commit.

Two artifacts, shared contract (must not drift; one pure helper both can call conceptually, duplicated in Apps Script because `lib/**` is claspignored):

```js
// Node — lib/sheets.js (scripts, dumpLedger, operator minters)
async function getPopIdHighWater()
async function setPopIdHighWater(lastUsed)  // monotonic; **no-op if row missing** (Commit 2 creates it)
function nextPopIdNumber({ highWater, activeMax }) // pure; next = max(hw, activeMax)+1

// Apps Script — utilities/popIdAllocator.js (DEPLOYED; not lib/)
function nextPopIdLocked_(ctx)
  // reads Number(ctx.config.popIdHighWater) after loadConfig_ parseFloat
  // scans ctx.ledger.rows once, caches ctx._maxPopN, only incrementer on cycle path
  // persist write-back: no-op if World_Config row missing (Commit 2 creates it)
```

`loadConfig_` (`godWorldEngine2.js` L612–628) `parseFloat`s numeric World_Config values. `popIdHighWater` 1079 loads as a number. Feature flag `citizenArchiveEnabled`: store `0`/`1`; mover tests `Number(ctx.config.citizenArchiveEnabled) === 1`, **not** `=== '1'`. Missing flag = off (0), no throw, until after the first live move.

A single `nextPopIdLocked_` also **de-races same-cycle** births vs promotions vs advancement vs bond spouses vs civic challengers — six local max-scans today can collide in one Cycle. That is a current hazard, not only a post-archive one.

### Live mint sites that must switch **before** the first move

Cycle-path (must change in engine-sheet gated `phase*` files):

| Site | Current allocator | Notes |
|---|---|---|
| `phase04-events/generationalEventsEngine.js` `createChildRow_` L1028–1038 | `ctx._maxPopN` from `ctx.ledger.rows` max | Births |
| `phase05-citizens/checkForPromotions.js` L165–180 `nextPopId()` | scans `lRows` | Promotion mint |
| `phase05-citizens/processAdvancementIntake.js` L575–662 | `maxPop` from `ledgerRows` | GC emergence / advancement |
| `phase05-citizens/bondEngine.js` L2139–2144 (GC courtship) | scans `ctx.ledger.rows` | Spouse materialization |
| `phase05-citizens/bondEngine.js` L2328 (GC marriage lottery) | `++maxN` (second site) | Spouse materialization |
| `phase05-citizens/updateCivicApprovalRatings.js` `nextChallengerPopId_` L939–946 | scans rows | Civic challenger mint |

Not on cycle path today, still a reuse hazard if invoked:

| Site | Current | Action |
|---|---|---|
| `phase05-citizens/processIntakeV3.js` L55, `getMaxPopIdFromValues_` L187 | sheet max+1 | **Not wired** (`godWorldEngine2.js` calls `processIntake_`, which since engine.58 routes unknown names to Generic_Citizens and does **not** mint POPIDs). Convert or delete in the same allocator commit so a future wiring cannot skip the contract. |
| `phase01-config/godWorldEngine2.js` `getMaxPopId_` L1420 | leftover helper | Comment at L1095 says it is unused by `processIntake_`. Delete or wrap `nextPopIdLocked_`. |

Operator / Node minters (scripts — kimi/codex writable). Every file in the allocator commit:

| Site | Action |
|---|---|
| `scripts/ingestPublishedEntities.js` L574–585, L1336 | `getPopIdHighWater` + SL max |
| `scripts/integrateFaithLeaders.js` | same |
| `scripts/integrateCelebrities.js` | same |
| `scripts/seedYouthBalance.js` | same |
| `scripts/ingestFemaleCitizensBalance.js` | same |
| `maintenance/repairSimulationLedger.js` L294 | same |
| `scripts/migrations/engine57_kids_backfill.js` | historical; if ever re-run, must use high-water |
| `scripts/migrations/engine57_spouse_backfill.js` | same |
| `scripts/canon3_backfill_t9.js` | same max+1 pattern; historical; same rule |

`scripts/ingestPlayerTrueSource.js` only **normalizes** existing POPID strings; not a minter.

### Resolver

One shared function, two runtimes, same semantics. **Apps Script** lives in clasp-deployed `utilities/resolveCitizen.js` (not `lib/`). **Node** lives in `lib/resolveCitizen.js` (or a function exported from `lib/sheets.js`). Contract tests must assert both produce the same `location` / `living` / POPID for synthetic fixtures. Do not put the cycle-path resolver only in `lib/` — it will not deploy.

```text
resolveCitizen(popId | name) →
  { location: 'active' | 'archive' | 'missing',
    living: boolean,          // true only if active AND status not terminal
    row: object,              // full header-mapped row (archive includes metadata)
    archiveHistory: array }   // all exit snapshots, newest last; empty if active-only
```

Search order: Simulation_Ledger exact POPID → Citizen_Archive all snapshots for that POPID. Name lookup: active exact First+Last first; archive second; fail-loud on ambiguity (same as `processAdvancementIntake_` name index).

**Do not** put archived rows into `ctx.ledger.rows`. Event-loop consumers keep iterating Simulation_Ledger only.

### Consumer classification (inventory)

Adopted research requires measuring these classes **before** rows move. After-archive rule: pointers **into archive are legal**; engines **must not recreate a living Simulation_Ledger row** from leftover HeadOfHousehold / bond / MembersList.

**Must NOT treat archived as living** (event loop only sees Simulation_Ledger / `ctx.ledger`; after the mover they simply stop seeing the row). Verify skip gates do not throw when the row is *absent* rather than `continue`d:

| File | Function | After archive |
|---|---|---|
| Phase 5 event generators | `generateCitizensEvents_`, `runHouseholdEngine_`, `runRelationshipEngine_`, `runNeighborhoodEngine_`, `runEducationEngine_`, `generateMediaModeEvents_`, `generateCivicModeEvents_`, `runCareerEngine_`, `runBondEngine_` | Ignore (row gone). `educationCareerEngine` traded-skip hole disappears with the row. |
| `phase04-events/generateGenericCitizenMicroEvent.js` | micro-event skip | Ignore |
| `phase02-world-state/commuteFlowEngine.js` L132 | `traded`/`deceased`/`departed` | Ignore |
| `phase05-citizens/citizenContextBuilder.js` | `isEventEligible_` L121; `findInSimulationLedger_` L334 (direct sheet) | Living context: miss is correct. Historical context uses resolver. |
| `phase07-evening-media/buildEveningFamous.js` | current sightings | Ignore (not a living celebrity) |
| `scripts/undockedDraw.js` | Oakland-resident gate | Ignore unless restored (`ReturnedCycle` stamped) |

**Identity-only (historical canon, not current-state):**

| File | Function | After archive |
|---|---|---|
| `scripts/dumpLedger.js` | C104 refresh from `/city-hall-prep` (`cron-civic-run.js` L519) | One invocation. Abort iff SL empty, **or** (`citizenArchiveTabLive=1` **and** tab missing). Tab absent before live ensure: log loud, skip archive file, write active JSONL, exit 0. Tab present, 0 body rows → empty archive JSONL + `rowCount: 0`. |
| `scripts/canon-name-check.js` | `loadCanonNames()` | Union of both snapshots. Else published dead/traded names fail Rhea. |
| `scripts/godworld-mcp.py` | `lookup_citizen` | Derived `wd-citizens` cards + published canon. Do not delete cards. |
| `scripts/buildCitizenCards.js` L629–632, L809–821, L15–20, L56 | Today: Simulation_Ledger **only**; write path is **`--apply`** (without it L1080–1141 is dry-run, `Written: 0`). Active Status is implicit (no Status line). | **Teach the script** to union Simulation_Ledger + Citizen_Archive (or both dumpLedger JSONLs). Archive rows emit `Status: deceased` or `Status: Traded` from `LastActiveStatus` / `ArchiveReason` (`deceased` → deceased, `traded-away` → Traded). Live-backfill window runs **`node scripts/buildCitizenCards.js --apply --from-archive`** (or `--popids` of the moved set) — **not** a 964-card burst, **not** a dry-run. `--from-archive` = only Citizen_Archive POPIDs. Dry-run is **not** the gate. Supermemory write is the existing paid path; it needs the **same live-write approval** as the backfill. Do not depend on `wd-cards-daemon`. **Live backfill is blocked until `--apply` has written those archived cards.** |
| Desk packets `output/desk-packets/citizen_archive.json` | article-appearance index | Unrelated object. Do not reuse the path. |
| Newsroom Names Index / Rhea | snapshot + packets | Identity remains valid via union dump |
| `Cultural_Ledger` | person keys | Identity-only; not a living celebrity |

**Need full archived row (resolver):**

| File | Function | After archive |
|---|---|---|
| `generationalWealthEngine.js` | `getCitizenWealth_`, `findHeirs_`, `findHouseholdSurvivors_` L759, `updateHeritage_`, `heritageTierByPop_` | Same-cycle death: deceased still on `ctx.ledger`. Later cycles: resolver. `findHouseholdSurvivors_` must not require the deceased SL row next cycle — HouseholdId lives on remaining members / `Household_Ledger`. |
| `householdFormationEngine.js` | reconcile HeadOfHousehold / Members | Archive POPID may remain in Members as history. If head is archived, promote a **living** member or dissolve if none. **Never mint a living SL row from leftover HeadOfHousehold.** |
| `bondPersistence.js` / `loadRelationshipBonds_` | citizenA / citizenB | Keep bond rows. Death cascade already severs. Engines skip if neither side is on SL. Do not recreate a living person from a leftover bond id. Grief is on **survivors’** `MemoryRegisters` (engine.94) — no archive lookup needed. |
| `bondEngine.js` | `Faith_Organizations.MembersList` | Archived POPID may stay on the org list (historical membership). Do not count as a living congregant. |
| `Family_Relationships` | writers in `generationalEventsEngine.js`, `householdFormationEngine.js`, `bondEngine.js`, `generationalWealthEngine.js` | Keep historical rows. Do not require SL presence. |
| `scripts/sportsFeedWriter.js` | `citizenSnapshot` for trade-away / **call-up** / (future) **trade-return** | trade-away: SL row still present (pre-archive). **call-up:** existing SL row, Status Active→Active; if POPID missing from SL, **fail-loud** (“archived — use restore”), **do not restore**. Restore is `utilities/archiveCitizenExits.js` (and optional later `trade-return` action), not call-up. |
| `scripts/queryLedger.js` | operator | Resolver; include archive location |
| `dashboard/server.js` `GET /api/citizens/:popId` | L2009 live SL, then cycle TSV | **Layer 1b = Citizen_Archive sheet** (`living: false`). Layer 2 remains desk-packet appearances. Do not name Layer 1b “citizen archive” in comments. |
| `phase11-media-intake/healthCauseIntake.js` | operator `runProcessHealthCauseIntake` POPID map | Operator path. After archive: resolver or skip with a loud miss — do not 404 as “unknown citizen.” |
| SpouseId / ParentIds / ChildrenIds / HouseholdId / FounderPopId | family display | Pointers into archive expected; dangling to **neither** ledger is fail-loud |

`findHouseholdSurvivors_` L759 looks up the deceased **row** on `ctx.ledger` for HouseholdId. That is same-cycle only (Phase5-GenerationalWealth before Phase 11). After archive, household membership is `Household_Ledger.Members` plus living SL HouseholdId — not a ghost SL row.

### Heritage without ghosts

Today:

- `updateHeritage_` L1327: `living = status !== 'deceased'`; membership growth skips the dead but they must still be **present** on `ctx.ledger` for `rowByPop`.
- All five current deceased have blank LineageId — no Heritage_Ledger line.
- `findHeirs_` scans living children via `ParentIds` JSON on Simulation_Ledger.
- Inheritance runs **same Cycle** as death (Phase 5, before Phase 11 archive). That stays: consequence first.

After archive:

```text
Same Cycle as death:
  Phase5-Generational then Phase5-GenerationalWealth (row still on ctx.ledger)
  Phase 10 persists Status=deceased + inheritance mutations on heirs
  Phase 11 copies the deceased row. distributeInheritance_ credits heirs and
           does NOT clear the deceased NetWorth cell; archive stores that
           pre-death fortune as history.

Later Cycles:
  updateHeritage_ iterates Simulation_Ledger only (no ghosts on the event loop)
  When MembersList or FounderPopId is not in rowByPop, resolveCitizen(popId)
    → archive row for name / last NetWorth / EmployerBizId / neighborhood
  LivingMembers count = members whose resolver.location === 'active'
  TotalNetWorth (v1) = sum of **active** members' SL NetWorth only.
           Do not add archived NetWorth into Heritage_Ledger.TotalNetWorth.
           There is no durable estate-settled flag (Open Question 3). Adding
           archived NetWorth would double-count after heirs were paid.
  Do not enqueue LifeHistory, bonds, career, or events for archive hits
```

Unestablished family (no Heritage_Ledger row): the Citizen_Archive row **is** the inheritance source for a later founding pass (`ensureHeritageSchema_` / `updateHeritage_` founder door). Do not auto-found a line from an archive row in this project.

---

## Data Model Changes

### `Citizen_Archive` columns

Simulation_Ledger today (`schemas/SCHEMA_HEADERS.md` L1102–1162): 54 columns A–BB.

| Col | Header | Source |
|---|---|---|
| A–BB | POPID … SkillTags | Exact Simulation_Ledger snapshot, **same order, same headers** |
| BC | `ArchiveReason` | `deceased` \| `traded-away` \| `permanent-migration` |
| BD | `ExitCycle` | Cycle number of this exit |
| BE | `SourceEventId` | Durable id if one exists; else deterministic placeholder (below) |
| BF | `LastActiveStatus` | Status cell as it was on Simulation_Ledger at copy (`deceased` / `Traded`) |
| BG | `ReturnEligible` | `TRUE` iff ArchiveReason ∈ {traded-away, permanent-migration} |
| BH | `SchemaVersion` | `54` (count of A–BB). Snapshots are **positional A–BB at ExitCycle**. Simulation_Ledger column adds are append-only for as long as this archive exists. `SchemaVersion < current` → restore pads blank cells on the **right**. A reorder/insert is not this path — restore must header-map. |
| BI | `ArchiveNote` | Optional. Known-defect stamp for the true-up-era backfill (`schoolquality-default` etc.). Empty on clean exits |

No `ArchiveRowId` column required: uniqueness of a snapshot is `(POPID, ExitCycle, ArchiveReason)`. Fail-loud if that triple duplicates.

`SourceEventId` honesty: `LifeHistory_Log` has no stable event id (Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle). Sports intake carries source hashes. Until a durable Event Content Ledger id is attached to the death/trade:

- traded-away: sports feed source hash when present; else `trade:C{cycle}:{POPID}`
- deceased: `death:C{cycle}:{POPID}`
- These are **bookkeeping keys**, never published copy.

### `LifeHistory_Archive` (do not touch)

Schema dump L743–759: Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle, plus two empty columns. Research required 7; dump shows 9 with H/I empty. Irrelevant — different contract, different mover (`maintainLifeHistoryLog_`).

### Simulation_Ledger

No new columns. `ReturnedCycle` (AQ) already exists. `docs/engine/SIMULATION_LEDGER_COL_MAP.md` lists it with **no engine writer**; readers are `scripts/undockedDraw.js` and `queryLedger.js`. Restore is the first cycle-path writer (and must update COL_MAP in that commit). `MigrationReason` / `MigrationDestination` / `MigratedCycle` / `ReturnedCycle` are **not dead**: `migrationTrackingEngine.js` (engine.61 / S321) made them the intra-city relocation writers; `undockedDraw.js` uses dest empty OR `ReturnedCycle >= MigratedCycle` as "resides in Oakland." Snapshot: 599 rows have MigratedCycle set. **Most of those dest cells are blank.** Non-blank dests are canon hoods except `POP-01052` Herbert Jones → `Los Angeles`, **Status already `Traded`**, ClockMode `GAME`. That row archives as `traded-away`, not as a new Migrated status.

### `World_Config`

New rows (machine-written, same class as `cycleCount` / `bizIdHighWater`):

| Key | Value | Load |
|---|---|---|
| `popIdHighWater` | max numeric POPID ever issued | `parseFloat` → number |
| `citizenArchiveEnabled` | `0` (off) / `1` (on) | `Number(ctx.config.citizenArchiveEnabled) === 1`. Missing = 0, no throw. |
| `citizenArchiveTabLive` | `0` / `1` | Set `1` when the live Citizen_Archive tab is ensured (Commit 3 live). dumpLedger aborts on missing tab only when this is 1. |

Sandbox seed first; live seed is a separately approved World_Config write.

### Registration (Commit 3, with the empty tab)

Same commit as the tab: `utilities/sheetNames.js`, `schemas/SCHEMA_HEADERS.md`, `docs/SPREADSHEET.md`, `docs/engine/SHEETS_MANIFEST.md`, `docs/SIMULATION_LEDGER.md` pointer. This plan is already registered in `docs/index.md`. No isolated Markdown.

### Migration / backfill strategy

```text
Code-only: allocator (Node + Apps Script) + tests — no sheet writes
Sandbox: seed popIdHighWater; ensure empty Citizen_Archive tab; mover flag on
Approved live: seed popIdHighWater; ensure empty tab; flag still 0
Resolver + dumpLedger both files (empty archive is fine)
Dry-run inventory of live candidates (read-only)
Repair or ArchiveNote — own commit, no deletes; sandbox then approved live
Restore function (+ optional later sports `trade-return`, not `call-up`); COL_MAP ReturnedCycle
Sandbox: trade-away → archive → restore action → same POPID on SL; ordinary call-up of still-Active affiliate unchanged; deceased copy-verify-remove
Builder-approved live backfill of inventory-cleared rows (Traded only after restore exists)
Steady state: Phase 11 mover; dumpLedger writes both snapshots every prep
```

Never pair defect repair and Simulation_Ledger `deleteRows` in one commit. Never live-move Traded before restore + sports hook.

---

## Alternatives Considered

### A. Keep every row on Simulation_Ledger (status-gate only)

**Pros:** All references stay resolvable; no allocator change; zero mover risk.
**Cons:** Rejected by adopted research and by Mike-direct 2026-08-17. Skip-gates already drift (`educationCareerEngine` deceased-only vs engines that also skip `traded`). POPID permanence depends on every consumer understanding terminal Status. Growth is unbounded.

### B. Tombstone directory only (POPID, name, Status)

**Pros:** Cheap; prevents reuse.
**Cons:** Research rejected this as the *only* store. Cannot restore a traded player, cannot inherit, cannot answer "where the money came from." Useful later as an optional index in front of the full archive — not instead of it.

### C. Reuse `LifeHistory_Archive`

**Pros:** Tab already exists.
**Cons:** Event log, 7-col contract, different mover, cannot reconstruct identity/family/economics. Research rejected.

### D. Mutable one-row-per-POPID tombstone

**Pros:** Simple uniqueness.
**Cons:** Deletes history of a leave/return/leave. Contradicts Mike-direct bidirectional + "prior archive record stays." Rejected.

### E. Full `Citizen_Archive` + high-water allocator + shared resolver (this design)

**Pros:** Matches adopted research, Business_Archive sibling, true-up bidirectional rule, fail-loud copy-verify-remove.
**Cons:** More surface (mint sites, dumpLedger sibling, dashboard, heritage). Allocator must land first. First live move gated on true-up of the 54.

---

## Security & Privacy Considerations

- Citizen_Archive is the same sensitivity as Simulation_Ledger (full citizen row, including DialState / MemoryRegisters / SMPageId / NetWorth). Same spreadsheet ACL; no new export.
- Do not dump archive rows into Supermemory as a bulk ingest (AGENTS.md: one fact per save; no session-log pipes). Resolver reads the sheet / local snapshot.
- Tests use synthetic `POP-9xxxx` only. Never copy live rows into fixtures.
- Dashboard `GET /api/citizens/:popId` must label archived records so a client cannot present them as living.
- Credentials / `.env` unused by this design beyond existing `lib/sheets.js` loaders on approved Node reads.

Threat: a minter that still scans Simulation_Ledger max after rows have left → silent POPID reuse → two people, one identity. Mitigation: allocator commit before first move; audit `max(archive) ≤ highWater`; fail-loud on duplicate POPID across SL∪archive.

---

## Observability

- `Logger.log` / `Engine_Errors` on: read-back mismatch, duplicate POPID, high-water missing after first move, high-water regression, ineligible Status presented to mover, restore of a deceased row.
- Cycle summary counters on `ctx.summary`: `citizensArchived`, `archiveFailures`, `citizensRestored` (0 unless a return path ran).
- Dry-run mode (operator + sandbox): logs POPID list, reasons, would-remove count; writes nothing.
- `scripts/auditSimulationLedger.js`: add archive-eligible remaining on SL (should be 0 in steady state except same-cycle deaths not yet moved — those exist only mid-cycle). Cross-ledger uniqueness check.
- `dumpLedger.js` meta: `rowCount` is **active** count; archive meta is a second file when the tab exists (`rowCount: 0` when body is empty). Tab absent before `citizenArchiveTabLive=1`: log, skip archive file, still write active. `/city-hall-prep` must not fail that exec.

No new paid API. No Discord. No live `--apply` in the first land.

---

## Rollout Plan

Feature flag: `World_Config` `citizenArchiveEnabled` numeric `0`/`1`, default missing=off. Mover tests `Number(ctx.config.citizenArchiveEnabled) === 1`. Allocator high-water is independent of the mover flag.

Stages (sandbox before live at every sheet-mutating step):

1. Allocator **code** (Node `lib/sheets.js` + Apps Script `utilities/popIdAllocator.js`) + tests. No sheet writes.
2. Seed `popIdHighWater` on **sandbox** World_Config; then **approved** live seed (1079 vs live scan).
3. Empty `Citizen_Archive` tab ensure on sandbox; then approved live ensure. Flag stays 0 on live.
4. Resolver + dumpLedger emits both JSONLs in one run (empty archive OK).
5. Phase 11 mover code, live flag 0.
6. Heritage resolver (TotalNetWorth = active members only).
7. Consumer patches that must exist before live Traded move (sports restore hook can wait until step 10; household/bonds “do not recreate living row” should land with the mover).
8. Dry-run inventory of live candidates (read-only).
9. Repair or `ArchiveNote` — **own commit, no deletes**; sandbox then approved live.
10. Restore function (`utilities/archiveCitizenExits.js`) + `ReturnedCycle` writer + COL_MAP. Sports `call-up` fail-loud if POPID missing from SL (“archived — use restore”). Optional later `trade-return` action — **not** hooked to `call-up`. Sandbox proof: trade-away → archive → **restore action** → same POPID on SL; plus ordinary call-up of a still-Active affiliate unchanged.
11. Builder-approved live backfill of inventory-cleared rows. **No live Traded row leaves SL before step 10.** Deceased-only live backfill may share this step; it does not unblock Traded.
12. Flag on for per-cycle mover. Same window: **`node scripts/buildCitizenCards.js --apply --from-archive`** (union SL+archive already in the script; filter = moved POPIDs). Dry-run is not the gate. Supermemory `--apply` shares the backfill live-write approval. Not `wd-cards-daemon`.

Rollback: set `citizenArchiveEnabled=0`. Already-moved rows stay on Citizen_Archive (do not automatically reverse). Reverse of a bad batch is a copy-back-to-SL script, same verify-then-write, never a sheet undelete guess. High-water is never rolled back.

---

## True-up sequencing (engine.117)

`docs/plans/2026-08-17-ledger-trueup-sweep.md` (Mike-direct): archive **after** true-up, not before. The 2026-08-17 set (49 Traded + 4 deceased = 53) all carried ≥1 defect. Archiving first buries defects; a returning player would carry them back.

engine.117 state: Tasks 2, 3, 4 shipped S380 (MigrationIntent-on-inactive cleared; `worldYearBase`; POP-00173 BirthYear). Task 1 SchoolQuality still awaiting Mike (causal vs retire). CareerStage lives on engine.82, not this row.

**Inventory first.** Live dump 2026-08-22 still shows 54 eligible; do not treat all 54 as defect-bearing without measuring (the fifth deceased was not in the 2026-08-17 “all 53 defective” set). **Do not wait on the 348-row engine.117 sweep** (Mike 2026-08-22). SchoolQuality citywide stays engine.117 Task 1. Repair vs `ArchiveNote` on **measured** defects on these rows is Open Question 5.

Mechanically:

1. Dry-run inventory: POPIDs, defect classes, Heritage_Ledger membership (currently none of the 5 deceased have LineageId).
2. Repair what is mechanical on **those measured rows**, **or** stamp `ArchiveNote` — **no deletes in that commit**.
3. Then live move (after restore exists for Traded).

Prefer repair for fields the return path would restore (CareerStage, EmployerBizId, Income on GAME/Traded) **if** the builder chooses repair.

---

## Fail-loud invariants

| Condition | Response |
|---|---|
| Same POPID twice on Simulation_Ledger | Throw; do not archive either |
| POPID on Simulation_Ledger **and** a *current* (unreturned) implication — actually: POPID on SL while latest archive snapshot exists is **legal** after return. Illegal: two SL rows, or archive append that still has the SL row after a successful remove | Throw |
| Copy append succeeded, read-back missing POPID+ExitCycle | Do **not** delete SL row; Engine_Errors |
| `SpouseId` / `ParentIds` / `ChildrenIds` / `HouseholdId` / `FounderPopId` pointing at a POPID in **neither** SL nor archive | Engine_Errors (dangling). Pointers **into archive** are expected, not errors |
| `popIdHighWater` would decrease | Refuse write |
| `popIdHighWater` missing after first archive move | Throw at next mint |
| Restore of `ArchiveReason=deceased` | Throw |
| Restore while SL already has the POPID | Throw |
| SchemaVersion on snapshot > current SL column count | Throw (code older than data) |
| SchemaVersion < current **and** SL columns were append-only | Restore pads blank cells on the right; log loud |
| SchemaVersion < current **because of insert/reorder** | Throw unless a header-map restore path exists |

---

## NBA historical POPID-reuse debt (audit, not rewrite)

`docs/engine/LEDGER_REPAIR.md` and `docs/engine/LEDGER_AUDIT.md` §4 (S68): 18 NBA-player POPIDs were **intentionally** reused for new Oakland citizens. Current occupants (e.g. POP-00556 Renata Voss, POP-00573 Calvin Mwangi, … POP-00715 Nadine Beckett) **are** the canon citizens. The NBA names at those identifiers are not restored, not archived as the athletes, and not given new POPIDs in this project.

This design's uniqueness invariant is **prospective**: from high-water seed onward, a POPID means one person. Historical collision is documented debt. A later audit may list "this POPID once named X in a pre-S68 sheet"; it must not invent replacement canon or dual-identity rows.

Chicago_Citizens (~124 frozen rows, phase disabled S229) is out of scope.

---

## Tests

`**/*.test.js` is claspignored (C98 `require is not defined`). Do **not** put Apps Script tests next to deployed files as a clasp entry. Follow `scripts/griefPeriod.test.js`: Node harness, `fs.readFileSync` + `new Function(...)` extraction of clasp files, synthetic `POP-9xxxx`, no live JSONL fixtures.

- Allocator: `scripts/popIdAllocator.test.js` — high-water wins over lower active max; active max wins over stale lower high-water; never emits an id ≤ high-water; monotonic set; same-cycle second call increments.
- Mover: `scripts/archiveCitizenExits.test.js` — copy → read-back → remove; failed read-back leaves source; duplicate POPID throws; deceased ReturnEligible false.
- Resolver: active hits first; archive second; missing; name ambiguity; Node and Apps Script contract fixtures agree.
- Heritage: MembersList POPID in archive does not re-enter event eligibility; TotalNetWorth excludes archived NetWorth.
- Household: leftover HeadOfHousehold in archive does not mint a living SL row.
- Sports sandbox: trade-away → archive → **restore action** → same POPID Active on SL; `ReturnedCycle` stamped. Separate: ordinary `call-up` of a still-Active affiliate unchanged; `call-up` of a missing/archived POPID fail-louds and does not restore.
- Sandbox-bench (AGENTS.md proving-loop): ACTIVE sandbox only. No live `--apply` in the first land.

---

## Open Questions

Doctrine / builder-only. Not silently picked.

1. **`permanent-migration` — answered 2026-08-22 (Mike):** v1 = deceased + Traded only. Enum value stays reserved. No inference from out-of-Oakland dest. Jones/LA already Traded.

2. **`pending` / `inactive`:** research left them open. Live dump 2026-08-22 has **zero**. If they return (canon.3 T9-class intake), do they stay on Simulation_Ledger forever as "never arrived," or is there a terminal timeout? Not folded into v1 eligibility.

3. **Estate drain on death:** `distributeInheritance_` credits heirs and does **not** zero the deceased `NetWorth`. Archive therefore stores the pre-death fortune. Should a later heritage/economy plan zero the estate on the archived row once heirs are paid, so TotalNetWorth does not double-count? Out of scope here; flag for engine.104 / heritage owners. v1 heritage TotalNetWorth = active members only.

4. **Restore-before-Traded — answered by PR order. Restore is not `call-up`.** Restore is its own function (optional later sports action `trade-return`). `call-up` stays Active→Active on an existing SL row and fail-louds if the POPID is missing from SL (“archived — use restore”). Not a sports-feed freeze.

5. **SchoolQuality on the archive-eligible set:** engine.117 Task 1 is still Mike's call (causal vs retire). Repair vs `ArchiveNote` on **measured** defects from Commit 7. Not a citywide SchoolQuality backfill.

6. **Dump filename:** settled as `output/citizen_archive_ledger_snapshot.jsonl` (desk-packet `citizen_archive.json` unchanged).

7. **Heritage_Ledger 6th row:** SCHEMA_HEADERS says 6 heritage rows; snapshot LineageId occupancy is 5 distinct LIN ids. Confirm before heritage resolver tests against live. Does not block Commits 1–5.

8. **Subset true-up vs full engine.117 — answered 2026-08-22 (Mike):** rerun the live pull rather than trust 2026-08-17. Dump 2026-08-22: still 49 Traded + 5 deceased, no other terminal statuses. **Do not wait on the 348-row engine.117 sweep.** Inventory the 54; repair/`ArchiveNote` only what that inventory measures. Citywide SchoolQuality stays engine.117.

---

## References

- `docs/research/2026-07-29-citizen-archive.md` — adopted research
- `docs/engine/ROLLOUT_PLAN.md` `engine.90` (blocked)
- `docs/plans/2026-08-17-ledger-trueup-sweep.md` — bidirectional; sequence after true-up; 5.5%
- `docs/plans/2026-08-01-business-lifecycle-generator.md` Task 7 — Business_Archive sibling; `bizIdHighWater`
- `docs/plans/2026-08-17-sheet-weight-reduction.md` — 1.46 MB / 14.53 MB
- `docs/plans/2026-08-02-sports-stat-event-intake.md` — trade-away does not archive
- `docs/OAKLAND_SPORTS_FEED.md` — engine.90 owns departure archive
- `docs/SIMULATION_LEDGER.md`, `schemas/SCHEMA_HEADERS.md`, `docs/engine/SIMULATION_LEDGER_COL_MAP.md`
- `docs/engine/LEDGER_AUDIT.md` / `LEDGER_REPAIR.md` — NBA reuse debt; 964-row headline
- `phase01-config/initSimulationLedger.js`, `phase01-config/godWorldEngine2.js`
- `phase10-persistence/commitSimulationLedger.js`
- `utilities/archiveLifeHistory.js`
- `phase04-events/generationalEventsEngine.js` — source file; **wired as `Phase5-Generational`**
- `phase05-citizens/generationalWealthEngine.js` — `updateHeritage_`, `findHeirs_`, `findHouseholdSurvivors_`, `bizIdHighWater`
- `phase05-citizens/bondEngine.js`, `processAdvancementIntake.js`, `checkForPromotions.js`, `processIntakeV3.js`
- `lib/sheets.js` — `getBizIdHighWater` / `setBizIdHighWater`
- `scripts/dumpLedger.js`, `scripts/canon-name-check.js`
- `output/simulation_ledger_snapshot.jsonl` (C104, 964 rows, 2026-08-21)

---

## PR Plan

These are **ordered landable commits** for engine-sheet. No GitHub pull requests unless the builder asks. `phase*/`, `utilities/` (engine substrate), `lib/` land through engine-sheet. `scripts/**` and `docs/**` may be authored by kimi/codex inside ordinary writable scope, then landed. Control plane (`.claude/**`, `CLAUDE.md`, `SESSION_CONTEXT.md`) is untouched except a later `NEXT[grok]` handoff.

**Recommended order for Issue 2:** **(a)** restore function **before** any live Traded move, with sandbox proof of trade-away → archive → **restore action** → same POPID. Do not live-backfill Traded first. Do not implement restore as sports `call-up`. Deceased-only live backfill may share the later live `--apply` (deceased are not ReturnEligible) but does not unblock Traded.

This plan is the engine.90 pointer. The commits below are implementation, not this filing.

### Commit 1 — Allocator code only (no sheet writes)

- **Title:** `engine.90: popIdHighWater contract; route every POPID minter`
- **Files:** `lib/sheets.js` (`getPopIdHighWater`, `setPopIdHighWater`, `nextPopIdNumber`); `utilities/popIdAllocator.js` (`nextPopIdLocked_`); `phase04-events/generationalEventsEngine.js` `createChildRow_`; `phase05-citizens/checkForPromotions.js`; `phase05-citizens/processAdvancementIntake.js`; `phase05-citizens/bondEngine.js` (both spouse sites); `phase05-citizens/updateCivicApprovalRatings.js` `nextChallengerPopId_`; `phase05-citizens/processIntakeV3.js`; `phase01-config/godWorldEngine2.js` `getMaxPopId_` (delete or wrap); `scripts/ingestPublishedEntities.js`; `scripts/integrateFaithLeaders.js`; `scripts/integrateCelebrities.js`; `scripts/seedYouthBalance.js`; `scripts/ingestFemaleCitizensBalance.js`; `maintenance/repairSimulationLedger.js`; `scripts/migrations/engine57_kids_backfill.js`; `scripts/migrations/engine57_spouse_backfill.js`; `scripts/canon3_backfill_t9.js`; `docs/engine/ENGINE_STUB_MAP.md` (`ctx.config.popIdHighWater`); `scripts/popIdAllocator.test.js`
- **Depends on:** none
- **Changes:** Shared contract; cycle-path only incrementer (de-races same-cycle mints). **Does not write live or sandbox World_Config.** `setPopIdHighWater` / Apps Script persist is **no-op while the World_Config row is missing**. Do not self-seed on the next live mint. Commit 2 creates the row.

### Commit 2 — Sandbox then approved live `popIdHighWater` seed

- **Title:** `engine.90: seed World_Config popIdHighWater`
- **Files:** none required beyond Commit 1 helpers; operator/sandbox write of World_Config
- **Depends on:** Commit 1
- **Changes:** **Creates** the World_Config `popIdHighWater` row (it does not exist until this commit). Sandbox first (`max(1079, sandbox SL max)`). Then **explicitly approved** live create/seed (`max(1079, live SL max)`). After this row exists, mint persist is monotonic. Not bundled with row movement. Not a Commit 1 self-seed.

### Commit 3 — Schema registration + empty tab (sandbox then live)

- **Title:** `engine.90: register Citizen_Archive schema (empty tab)`
- **Files:** `utilities/sheetNames.js` (`CITIZEN_ARCHIVE`; optional `LIFEHISTORY_ARCHIVE`); `schemas/SCHEMA_HEADERS.md`; `docs/SPREADSHEET.md`; `docs/engine/SHEETS_MANIFEST.md`; `docs/SIMULATION_LEDGER.md` (pointer); `docs/index.md` only if a new registered doc is added
- **Depends on:** Commit 1
- **Changes:** Headers A–BB + BC–BI. Zero body rows. Ensure on **sandbox**, then approved live ensure (schema-setup §1.1, ≤1×). Live ensure sets World_Config `citizenArchiveTabLive=1`. `citizenArchiveEnabled` missing or `0` on live. **Not** a live row move.

### Commit 4 — Resolver + dumpLedger both snapshots

- **Title:** `engine.90: resolveCitizen; dumpLedger writes active+archive JSONL`
- **Files:** `utilities/resolveCitizen.js` (Apps Script); `lib/resolveCitizen.js` or `lib/sheets.js` export (Node); `scripts/dumpLedger.js`; `scripts/canon-name-check.js`; `scripts/buildCitizenCards.js` (union SL + Citizen_Archive / both JSONLs; emit archive Status; add `--from-archive` / `--popids` — **no live `--apply` in this commit**); `dashboard/server.js` `/api/citizens/:popId` **Layer 1b = Citizen_Archive sheet**; `scripts/resolveCitizen.test.js`
- **Depends on:** Commit 3 (schema/code). **Does not depend on live tab ensure.**
- **Changes:** SL then archive. One `dumpLedger.js` run: always write active JSONL. If Citizen_Archive tab present → archive JSONL (0 body rows → `rowCount: 0`). If tab **absent** and `citizenArchiveTabLive` is not 1 → log loud, skip archive file, exit 0 (civic prep continues). Abort missing-tab only when `citizenArchiveTabLive=1`. `loadCanonNames()` unions both files when the archive snapshot exists. Dashboard Layer 2 remains desk-packet appearances. MCP `lookup_citizen` unchanged. Card **code** can land here; **`--apply` is Commit 11**.

### Commit 5 — Phase 11 mover (live flag off)

- **Title:** `engine.90: Phase11-CitizenArchive copy-verify-remove`
- **Files:** `utilities/archiveCitizenExits.js`; `phase01-config/godWorldEngine2.js` both cycle entry points (after MediaIntake, before `maintainLifeHistoryLog_`); household/bond “do not recreate living SL row” guards if they would mint from leftover HeadOfHousehold / citizenA; `scripts/archiveCitizenExits.test.js` (`griefPeriod.test.js` Node VM pattern)
- **Depends on:** Commits 1–4
- **Changes:** Direct writes. `Number(ctx.config.citizenArchiveEnabled) === 1` or no-op. Failed read-back does not delete. High-water bump if needed. **No live `--apply`.**

### Commit 6 — Heritage archive resolve

- **Title:** `engine.90: heritage resolve archived POPIDs; TotalNetWorth active-only`
- **Files:** `phase05-citizens/generationalWealthEngine.js` (`updateHeritage_`, `getCitizenWealth_`, `findHeirs_`, `findHouseholdSurvivors_`, `heritageTierByPop_`); tests
- **Depends on:** Commit 4
- **Changes:** MembersList / FounderPopId miss on SL → resolver. No ghosts on `ctx.ledger`. LivingMembers = active. **TotalNetWorth = sum of active members only** (do not add archived NetWorth; Open Question 3 stays for estate-settled flag).

### Commit 7 — Dry-run inventory (read-only)

- **Title:** `engine.90: dry-run archive inventory (read-only)`
- **Files:** `scripts/inventoryCitizenArchiveCandidates.js`
- **Depends on:** Commit 3
- **Changes:** POPID, Status, ClockMode, defect flags, LineageId, SpouseId/ParentIds, ArchiveReason mapping. **Do not assume the fifth deceased is defective.** No sheet writes.

### Commit 8 — Repair or ArchiveNote only (no deletes)

- **Title:** `engine.90: repair or ArchiveNote archive-eligible rows`
- **Files:** targeted repair script or mover metadata-only stamp; **not** `deleteRows`
- **Depends on:** Commit 7; **Open Questions 5 and 8 answered by the builder**
- **Changes:** Sandbox then **approved** live repair/`ArchiveNote` of **measured** defective rows. SchoolQuality/CareerStage live writes are their own mutation (S366 off-by-one history) — header-asserted `updateRangeByPosition`. **Zero Simulation_Ledger row removals in this commit.**

### Commit 9 — Restore function (before live Traded move)

- **Title:** `engine.90: restore archived POPID (not sports call-up)`
- **Files:** `utilities/archiveCitizenExits.js` restore; `scripts/sportsFeedWriter.js` **call-up fail-loud** if `citizenSnapshot`/SL POPID missing (“archived — use restore”) — **no restore from call-up**; optional stub or later `trade-return` action only if sports needs a writer; `docs/engine/SIMULATION_LEDGER_COL_MAP.md` (`ReturnedCycle` writer); `scripts/archiveCitizenRestore.test.js`
- **Depends on:** Commits 5–6
- **Changes:** Same-POPID restore as its **own** function; archive history retained; fail-loud on deceased and on duplicate active row. Writes `ReturnedCycle`; clears `MigrationDestination` if back in a canon hood. Call-up remains Active→Active. **This commit is the return-path gate.** No live Traded `deleteRows` yet.

### Commit 10 — Sandbox proving (including clone of eligible rows)

- **Title:** `engine.90: sandbox-bench movement + restore-action round trip`
- **Files:** sandbox-only; Groundhog (`docs/reference/DEPLOY.md`). No live sheet.
- **Depends on:** Commits 5, 9
- **Changes:** Flag on in sandbox. Proofs: (1) deceased copy-verify-remove; next mint ≠ archived id; (2) **trade-away → archive → restore action → same POPID Active on SL**; (3) ordinary **call-up of a still-Active affiliate unchanged**; (4) call-up of missing/archived POPID fail-louds and does not restore; (5) optional clone of the live eligible set, not live 54 mutation.

### Commit 11 — Builder-approved live backfill (after restore exists)

- **Title:** `engine.90: first live Citizen_Archive backfill`
- **Files:** mover `--apply` path; `scripts/buildCitizenCards.js` (union already in Commit 4)
- **Depends on:** Commits 8–10; **explicit builder approval** (Sheets **and** Supermemory)
- **Changes:** Flag on. Copy-verify-remove inventory-cleared rows. **Traded rows only because Commit 9 restore exists.** Read-back. dumpLedger both files. **Gate command (not dry-run):** `node scripts/buildCitizenCards.js --apply --from-archive` — rebuilds **only** archived POPIDs (not a 964-card burst); cards must show `Status: deceased` / `Traded`. Dry-run (`Written: 0`) is **not** the gate. Supermemory write is the existing paid path under the same live-write approval. Confirm active row count ≈ 964 − N moved ± same-cycle births. **Not** the first land. **Not** bundled with Commit 8 repair.

### Commit 12 — Remaining operator readers

- **Title:** `engine.90: queryLedger/audit/healthCauseIntake resolve archived POPIDs`
- **Files:** `scripts/queryLedger.js`; `scripts/auditSimulationLedger.js` uniqueness (`max(archive) ≤ highWater`, no duplicate active); `phase11-media-intake/healthCauseIntake.js` miss path
- **Depends on:** Commit 4
- **Changes:** Audits and operator tools. Still no faction/tracker edits. Can land any time after Commit 4; must exist before operators hit 404s post-Commit 11.

**Independently reviewable rule:** Commits 1, 3 (docs/code), 4, 5, 6, 7, 9 (code), 12 are coherent without live mutation. Commit 4 dumpLedger **must not** abort civic prep if the live Citizen_Archive tab is not yet ensured. Commits 2, 3 (tab ensure + `citizenArchiveTabLive=1`), 8, 10, 11 require AGENTS.md proving-loop / explicit live-write approval (Commit 11 includes Supermemory `--apply`). Commit 11 must not precede Commit 9.

---

## Changelog

- 2026-08-21 (grok) — Design rev 1–4 (scratch). Review loop closed at 0 open issues.
- 2026-08-22 (grok) — Filed as engine.90 plan. Mike: v1 = deceased + Traded only; live Status dump rerun (`dumpLedger.js` C104, 964 rows, 49 Traded + 5 deceased, no Migrated/pending/inactive); citywide engine.117 is not a gate. `Wendell Carter Jr.` POP-01028 remains lowercase `active` (not archive-eligible).
- 2026-08-22 (grok) — Return trigger locked: Status→Active on a traded POPID moves them back to Oakland (same POPID). Pre-archive = in-place flip; post-archive = restore copy onto SL. Sports `return` stays injury-only.
