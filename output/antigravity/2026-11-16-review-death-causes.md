# Review — Deaths: Canon Record and Engine Write Paths (`pipeline.110` → `engine.348`)

**Lane:** agy (Antigravity)
**Date:** 2026-11-16
**Brief:** `docs/for-claude-review/2026-11-16-es-brief-agy-death-causes.md`
**Scope:** Read-only code and local archive/mirror review. No code or sheet edits, no model or engine runs.

---

## 1. Canon — Was a Cause of Death Ever Published or Ingested?

**Search method:** The `godworld` MCP tools (`search_canon`, `search_articles`) are not mounted in this CLI session's tool declarations, and external network/API scripts were not run per the read-only local constraint. All local canon and newsroom mirrors were searched directly via `grep` across `editions/` (all `cycle_pulse_c*.txt`, `cycle_pulse_edition_*.txt`, and `supplemental_*.txt`), `archive/ARTICLE_INDEX.jsonl`, `archive/articles/`, `archive/editions/`, `docs/media/ARTICLE_INDEX_BY_POPID.md`, `output/citizen_pages/index.jsonl`, and cron/desk output under `output/`.

**Finding 1A — None of the nine archived deceased residents has a published or canon-ingested death or cause of death.**
Zero published editions in `editions/` and zero canon entries in `archive/ARTICLE_INDEX.jsonl` mention the death or cause of death of any of the nine residents on `Citizen_Archive`.

### Per-Resident Record Across `editions/`, `archive/ARTICLE_INDEX.jsonl`, and `output/`

1. **`POP-00331` — Isabelle Louis** (ExitCycle `106`)
   - **`editions/` & `archive/ARTICLE_INDEX.jsonl`:** No hit.
   - **`output/` hits:**
     - `output/citizen_archive_snapshot.jsonl:47` — Cycle `106` archive snapshot: `Status: "deceased"`, `ArchiveReason: "deceased"`, `ExitCycle: "106"`, `SourceEventId: "death:C106:POP-00331"`, `HealthCause: ""`, `LifeHistory` contains no `[Death]` line (`"2026-06-20 23:35 — [PrevEvening] noticed neighbors being more watchful today\nY2C48 — [Lifestyle] checked out a new shop that just opened nearby"`), while `TraitProfile` reads `"Archetype:Caretaker|Mods:family-minded|drive:57|sociability:50|warmth:57|openness:50|composure:53|integrity:50|family:73|outabout:50|Conduct:b0|TopTags:Death,Birth,Background,Household,Career|Entries:6|V:2.0|Hash:7df417|Updated:c95"`.
     - `output/cron-civic/datawake/worker-med-exam_2026-11-16.json:10` (and `output/cron-compare/civic_domain_slice_c116.json:1836, 1843`) — Cycle `116`, Medical Examiner Jonas Patel (`POP-00142`): `"Those nine names — Isabelle Louis, Dune Topez, Marcello Ramas, Lilo Belton, Margarita Tanaka, Sumiko Mensah, Marisela Rios, Antwan Warren, Florencia Shah — are flagged defects-at-exit, and the only defect noted is schoolQualityUnusable. That's a data-quality rejection, not a death certificate."`
   - **Historical repair log (`docs/engine/archive/ENGINE_REPAIR.md:93, 148`):** Documents that prior to the S256 `LifeHistory` column clear, `POP-00331` carried two `[Death]` lines on `Simulation_Ledger.LifeHistory` (`2026-01-30` and `2026-06-01`, Cycle `96`), both with the exact words `"died after a sudden illness"`.

2. **`POP-00492` — Dune Topez** (ExitCycle `106`)
   - **`editions/` & `archive/ARTICLE_INDEX.jsonl`:** No hit.
   - **`output/` hits:**
     - `output/world_summary_c104.md:134-135` (mirrored in `output/notebooklm/daily/c104/*/source-pack.md:149` and `bounded-newsroom-source.md:139`) — Cycle `104`, Dune Topez (`POP-00492`), exact words: `- POP-00492  — passed away peacefully`.
     - `output/citizen_archive_snapshot.jsonl:48` — Cycle `106` archive snapshot: `ExitCycle: "106"`, `HealthCause: ""`, `LifeHistory` final line: `C104 — [Death] passed away peacefully`.
     - `output/cron-civic/datawake/worker-med-exam_2026-11-16.json:10` / `output/cron-compare/civic_domain_slice_c116.json:1836, 1843` — Cycle `116` Jonas Patel statement (quoted under `POP-00331`).

3. **`POP-00694` — Marcello Ramas** (ExitCycle `106`)
   - **`editions/` & `archive/ARTICLE_INDEX.jsonl`:** No hit.
   - **`output/` hits:**
     - `output/citizen_archive_snapshot.jsonl:49` — Cycle `106` archive snapshot: `ExitCycle: "106"`, `HealthCause: ""`, `LifeHistory` final line: `C101 — [Death] was lost to the community`.
     - `output/cron-civic/datawake/worker-med-exam_2026-11-16.json:10` / `output/cron-compare/civic_domain_slice_c116.json:1836, 1843` — Cycle `116` Jonas Patel statement.

4. **`POP-00713` — Lilo Belton** (ExitCycle `106`)
   - **`editions/` & `archive/ARTICLE_INDEX.jsonl`:** No hit.
   - **`output/` hits:**
     - `output/citizen_archive_snapshot.jsonl:50` — Cycle `106` archive snapshot: `ExitCycle: "106"`, `HealthCause: ""`, `LifeHistory` final line: `C102 — [Death] passed away unexpectedly`.
     - `output/cron-civic/datawake/worker-med-exam_2026-11-16.json:10` / `output/cron-compare/civic_domain_slice_c116.json:1836, 1843` — Cycle `116` Jonas Patel statement.

5. **`POP-00814` — Margarita Tanaka** (ExitCycle `106`)
   - **`editions/` & `archive/ARTICLE_INDEX.jsonl`:** No hit.
   - **`output/` hits:**
     - `output/world_summary_c106.md:160-161` — Cycle `106`, Margarita Tanaka (`POP-00814`), exact words: `- POP-00814  — concluded their life's journey`.
     - `output/desk-packets/culture_c106.json:33662` (also `letters_c106.json:41611`, `sports_c106.json:30530`, `chicago_c106.json:30004`, `business_c106.json:28373`, `civic_c106.json:33587`) — Cycle `106` severed bond note: `"notes": "seeded [Margarita Tanaka deceased C106]"`.
     - `output/citizen_archive_snapshot.jsonl:52` — Cycle `106` archive snapshot: `ExitCycle: "106"`, `HealthCause: ""`, `LifeHistory` final line: `C106 — [Death] concluded their life's journey`.
     - `output/cron-civic/datawake/worker-med-exam_2026-11-16.json:10` / `output/cron-compare/civic_domain_slice_c116.json:1836, 1843` — Cycle `116` Jonas Patel statement.

6. **`POP-00828` — Sumiko Mensah** (ExitCycle `106`)
   - **`editions/` & `archive/ARTICLE_INDEX.jsonl`:** No hit.
   - **`output/` hits:**
     - `output/citizen_archive_snapshot.jsonl:53` — Cycle `106` archive snapshot: `ExitCycle: "106"`, `HealthCause: ""`, `LifeHistory` first line: `C99 — [Death] was lost to the community`.
     - `output/cron-civic/datawake/worker-med-exam_2026-11-16.json:10` / `output/cron-compare/civic_domain_slice_c116.json:1836, 1843` — Cycle `116` Jonas Patel statement.

7. **`POP-00622` — Marisela Rios** (ExitCycle `107`)
   - **`editions/` & `archive/ARTICLE_INDEX.jsonl`:** No hit.
   - **`output/` hits:**
     - `output/world_summary_c107.md:163-164` — Cycle `107`, Marisela Rios (`POP-00622`), exact words: `- POP-00622  — died after a sudden illness`.
     - `output/execution_log_c107.txt:200` — Cycle `107`: `archiveCitizenExits_ engine.90: POP-00622 archived (deceased, C107)`.
     - `output/desk-packets/letters_c107.json:38444, 41224` (also `culture_c107.json:31261, 34011`, `sports_c107.json:27564, 30294`, `civic_c107.json:31459, 34199`) — Cycle `107` severed bond note: `"notes": "seeded [Marisela Rios deceased C107]"`.
     - `output/citizen_archive_snapshot.jsonl:55` — Cycle `107` archive snapshot: `ExitCycle: "107"`, `HealthCause: ""`, `LifeHistory` final line: `C107 — [Death] died after a sudden illness`.
     - `output/cron-civic/datawake/worker-med-exam_2026-11-16.json:10` / `output/cron-compare/civic_domain_slice_c116.json:1836, 1843` — Cycle `116` Jonas Patel statement.

8. **`POP-00655` — Antwan Warren** (ExitCycle `109`)
   - **`editions/` & `archive/ARTICLE_INDEX.jsonl`:** No hit (note: `docs/media/ARTICLE_INDEX_BY_POPID.md:2301` lists `POP-00655 — Andre Ward (T4) — Container Yard Supervisor` from C69 prior to a name true-up, with no death reference).
   - **`output/` hits:**
     - `output/world_summary_c109.md:165-166` — Cycle `109`, Antwan Warren (`POP-00655`), exact words: `- POP-00655  — passed away unexpectedly`.
     - `output/execution_log_c109.txt:236` — Cycle `109`: `archiveCitizenExits_ engine.90: POP-00655 archived (deceased, C109)`.
     - `output/desk-packets/business_c109.json:27870, 30280, 30450` (also `chicago_c109.json:28210, 30760`, `letters_c109.json:37640, 40100, 40280`, `culture_c109.json:33427, 35857, 36027`, `sports_c109.json:29648, 32058, 32228`, `civic_c109.json:31603, 34043, 34223`) — Cycle `109` severed bond note: `"notes": "seeded [Antwan Warren deceased C109]"`.
     - `output/citizen_archive_snapshot.jsonl:56` — Cycle `109` archive snapshot: `ExitCycle: "109"`, `HealthCause: ""`, `LifeHistory` final line: `C109 — [Death] passed away unexpectedly`.
     - `output/cron-civic/datawake/worker-med-exam_2026-11-16.json:10` / `output/cron-compare/civic_domain_slice_c116.json:1836, 1843` — Cycle `116` Jonas Patel statement.

9. **`POP-00934` — Florencia Shah** (ExitCycle `114`)
   - **`editions/` & `archive/ARTICLE_INDEX.jsonl`:** No hit for her death (she appeared while alive in C112 unprinted staged draft `output/cron-compare/staged/civic_c112_freelance-firebrand_packet-v2_anthropic-claude-sonnet-5-5.staged.md:17, 41`, indexed at `archive/ARTICLE_INDEX.jsonl:855` with `published: false, canon: false, stage: "canon-violation"`).
   - **`output/` death hits:**
     - `output/world_summary_c114.md:170-171` — Cycle `114`, Florencia Shah (`POP-00934`), exact words: `- POP-00934  — died surrounded by family`.
     - `output/execution_log_c114.txt:294` — Cycle `114`: `archiveCitizenExits_ engine.90: POP-00934 archived (deceased, C114)`.
     - `output/beats/prev/LifeHistory_Log.jsonl:2329` — Cycle `114`: `{"Timestamp":"Y3C10","POPID":"POP-00934","Name":"","EventTag":"Death","EventText":"died surrounded by family","Neighborhood":"","Cycle":"114"}`.
     - `output/beats/prev/Lived_Events.jsonl:4` — Cycle `114`: `{"id":"death:POP-00934:114","kind":"death","cycle":114,"subject":"POP-00934","subjectName":"Florencia Shah","neighborhood":"KONO","roleType":"Independent Bookstore Owner","deceasedName":"Florencia Shah","recipients":[{"pop":"POP-00867","rel":"bond","name":"Makayla Wu"},{"pop":"POP-00889","rel":"bond","name":"Noor Ng"},{"pop":"POP-00239","rel":"bond","name":"Xiu Cello"}]}`.
     - `output/beats/prev/Story_Hook_Deck.jsonl:2106-2107` (and `output/beats/Story_Hook_Deck.jsonl:2106-2107`) — Cycle `114`: `"HookText":"Early signals in KONO: Questions arise about Florencia Shah's legacy and estate."`.
     - `output/cron-compare/fanout-2026-11-02.json:827-828, 867, 875, 878, 946-951` — Cycle `114` Lives prewrite for Tamsin Pruitt: `"Makayla Wu lost Florencia Shah (bond), KONO (C114). What came next: the record does not say yet"` (`id: "death:POP-00934:114"`). (Tamsin Pruitt's staged C114 draft at `output/cron-compare/staged/culture_c114_tamsin-pruitt_packet-v2_anthropic-claude-sonnet-5-5.staged.md:1-41`, indexed at `archive/ARTICLE_INDEX.jsonl:939` with `canon: false, stage: "canon-violation"`, did not include Florencia Shah or Makayla Wu; `output/slices/c114/ines-sorensen.md:194` and `output/slices/c115/ines-sorensen.md:250` carry the roster annotation `Makayla Wu, Electrician, KONO (POP-00867) — 2 pages; latest to a reporter, a question they carry, C112; Lives carried the death in the house this Cycle`).
     - `output/citizen_archive_snapshot.jsonl:57` — Cycle `114` archive snapshot: `ExitCycle: "114"`, `HealthCause: ""`, `LifeHistory` final line: `C114 — [Death] died surrounded by family`.
     - `output/cron-civic/datawake/worker-med-exam_2026-11-16.json:10` / `output/cron-compare/civic_domain_slice_c116.json:1836, 1843` — Cycle `116` Jonas Patel statement.

### Other Deaths Mentioned Anywhere in `editions/` and `archive/` (All Cycles)

Across the entire published and archived corpus, only two mentions of a person's death exist, neither of which is a tracked `Simulation_Ledger` death event:
- **Rick Dillon Sr.** (non-ledger backstory father of Oakland A's pitcher Benji Dillon, `POP-00018`) — `archive/articles/c89_culture_the-rhythm-and-the-tide-benji-dillon_maria-keen.txt:12, 36, 110` (`archive/ARTICLE_INDEX.jsonl:625`, doc id `b83a4760863a84a8`, Cycle `89`): `"He died in a shark accident during Benji’s junior year at UC San Diego, and the ocean has meant something different ever since."` (`Names Index: ... Rick Dillon Sr. (Father, deceased)`).
- **Unnamed husband of Isla Sike (`POP-00612`)** — `editions/cycle_pulse_c113.txt:13, 251-255` (`archive/ARTICLE_INDEX.jsonl:879`, doc id `40f012bc1fb18bb9`, Cycle `113`): `"**Isla Sike** moved into a rented place of her own in West Oakland. She directs a domestic violence shelter there. She is widowed, and she says so herself. ... The record doesn't say when her husband died or how long she looked for the place."`

---

## 2. Code — What Writes a Death

Every code path across `phase*`, `utilities`, `scripts`, `lib`, and `dashboard` that sets a citizen to `deceased` or writes death records:

### Path 1: Health-Lifecycle Critical Deterioration (`processHealthLifecycle_`)
- **Location:** `phase04-events/generationalEventsEngine.js:424-502` and `phase04-events/generationalEventsEngine.js:815-837` (transition weights `HEALTH_TRANSITIONS.critical` at `:110-113`: `short: { hospitalized: 0.30, deceased: 0.40, stay: 0.30 }`, `long: { hospitalized: 0.20, deceased: 0.60, stay: 0.20 }`).
- **Trigger:** During Phase 4 (`runGenerationalEngine_`), a citizen whose `Simulation_Ledger.Status` is `"critical"` (`:424`, `:815`) and who was not admitted in the current Cycle (`statusStartCycle !== cycle`, `:430`) rolls `out2 === "deceased"` via weighted outcome (`probs.deceased * ageMod * seasonMod`, `:816-820`) or via forced resolution after 3+ cycles in critical (`duration >= 3`, 60% `deceased` / 40% `hospitalized`, `:823-826`).
- **Writes:**
  - `Simulation_Ledger.Status` (`row[iStatus]`): `"deceased"` (`:444-445, 829`).
  - `Simulation_Ledger.HealthCause` (`row[iHealthCause]`): if blank on a legacy patient, backfills `row[iHealthCause] = buildAdmissionCause_(ctx, causeClass102, null, calendarContext)` (`:451-456`). Because `:480-482` only clears `row[iHealthCause] = ""` when `discharged` (`healthResult.newStatus === 'active'`, `:439`), `row[iHealthCause]` remains populated on `Simulation_Ledger` when `newStatus === "deceased"`.
  - `Simulation_Ledger.StatusStartCycle` (`row[iStatusStart]`): cleared to `""` (`:473-477`).
  - `Simulation_Ledger.LifeHistory` (`row[iLife]`) and `LastUpdated` (`row[iLastU]`): via `applyMilestone_` (`:484-487` → `:1761-1767`), appends `C<cycle> — [Death] <name> has passed away due to complications from <cause>` (or `<name> has passed away` if `cause` is empty, `:830-831`).
  - `LifeHistory_Log`: via `applyMilestone_` → `queueAppendIntent_` (`:1772-1778`), appends `[inWorldStamp_(ctx), popId, '', 'Death', milestone.description, '', cycle]`.
  - `Hospital_Ledger`: pushes `{ popId, name, neighborhood, cause: healthCause, from: status, to: 'deceased', cycle, kind: 'transition' }` to `ctx.summary.hospitalEvents` (`:460-466`). Phase 10 `persistHospitalLedger_` (`phase10-persistence/buildCyclePacket.js:979-992`) writes `StatusNow = "deceased"`, `LastTransitionCycle = cycle`, `DischargeCycle = cycle`, `Outcome = "deceased"`, `CyclesInCare = Math.max(0, ev.cycle - admitCycle)` to `Hospital_Ledger` columns G–K (`:982-987`).
  - `Relationship_Bonds`, `Event_Arc_Ledger`, `Simulation_Ledger.MemoryRegisters` / `DialState` / `MaritalStatus`: calls `triggerDeathCascade_` (`:494-496` → `:1614-1685`), which marks bonds `status = "severed"` with `notes += " [<name> deceased C<cycle>]"` (`:1623-1625`), queues `grief` cascades on `ctx.summary.pendingCascades` (`:1627-1645`, drained in Phase 9 by `utilities/compressLifeHistory.js:434-462, 640-647, 719-725` into survivors' `MemoryRegisters.grief` and `DialState.grief`), pushes `power-vacuum` / `inheritance` arcs to `ctx.summary.eventArcs` (`:1650-1682`), and calls `widowSurvivingSpouse_` (`:1684, 1701-1719`) to set a surviving married spouse's `Simulation_Ledger.MaritalStatus = "widowed"`.
- **Carries/writes a cause?** **Yes.** Reads `row[iHealthCause]` (or backfills via `buildAdmissionCause_` at `:451-456`), formats `" due to complications from " + cause` into the `[Death]` line (`:830`), retains `row[iHealthCause]` on `Simulation_Ledger`, and passes `cause: healthCause` to `Hospital_Ledger` (`:463`).

### Path 2: Actuarial / Direct Milestone Death (`checkDeath_`)
- **Location:** `phase04-events/generationalEventsEngine.js:641-652` and `phase04-events/generationalEventsEngine.js:1353-1380`.
- **Trigger:** During Phase 4 (`runGenerationalEngine_`), for a citizen not in the hospital/health-status branch (`:424-502`), whose `ClockMode` is `"ENGINE"` or `"CIVIC"` (`:506`), when `counts.deaths < limits.deaths` (`limits.deaths = 1` per cycle, `:936`) and `birthYear` is non-zero (`:641`). `checkDeath_` (`:1353-1367`) rolls against probability `c` (`0.0001` base; `0.001` at age ≥ 65; `0.005` at ≥ 75; `0.01` at ≥ 80; `0.02` at ≥ 85; `0.05` at ≥ 90; `×1.5` if `lifeHistory.indexOf("[Health]") >= 0`; `×1.3` in winter; `×1.2` on stress holidays at age ≥ 70; `0.01` on a `0.0002` shock override).
- **Writes:**
  - `Simulation_Ledger.Status` (`row[iStatus]`): `"deceased"` (`:647`).
  - `Simulation_Ledger.LifeHistory` (`row[iLife]`) and `LastUpdated` (`row[iLastU]`): via `applyMilestone_` (`:644-646` → `:1761-1767`), appends `C<cycle> — [Death] <description>`, where `description` is drawn from two age-gated generic arrays (`:1369-1377`):
    - `age >= 75`: `"passed away peacefully"`, `"died surrounded by family"`, `"concluded their life's journey"`.
    - `age < 75`: `"passed away unexpectedly"`, `"died after a sudden illness"`, `"was lost to the community"`.
  - `LifeHistory_Log`: via `applyMilestone_` → `queueAppendIntent_` (`:1772-1778`), appends `[inWorldStamp_(ctx), popId, '', 'Death', milestone.description, '', cycle]`.
  - `Relationship_Bonds`, `Event_Arc_Ledger`, `Simulation_Ledger.MemoryRegisters` / `DialState` / `MaritalStatus`: calls `triggerDeathCascade_` (`:648` → `:1614-1685`), identical to Path 1.
- **Carries/writes a cause?** **No.** `checkDeath_` (`:641-652, 1353-1380`) never reads or writes `Simulation_Ledger.HealthCause`, never pushes to `ctx.summary.hospitalEvents`, and writes only the generic euphemistic `description` string to `LifeHistory` and `LifeHistory_Log`.

### Path 3: Phase 11 Cold-Storage Exit Mover (`archiveCitizenExits_`)
- **Location:** `utilities/archiveCitizenExits.js:53, 95-97, 134-282` (wired at `phase01-config/godWorldEngine2.js:907` and `:2602`).
- **Trigger:** Runs in Phase 11 when `Number(ctx.config.citizenArchiveEnabled) === 1` (`:57-59, 180`). Selects every committed `Simulation_Ledger` row whose lowercased `Status` matches `CITIZEN_ARCHIVE_REASON_BY_STATUS` (`{ deceased: 'deceased', traded: 'traded-away' }`, `:53, 150-175`).
- **Writes:**
  - Appends to `Citizen_Archive` (`:244-248`): the 55 `Simulation_Ledger` columns verbatim (`:135-136`) followed by the 7 metadata columns (`ArchiveReason = "deceased"`, `ExitCycle = cycle`, `SourceEventId = "death:C" + cycle + ":" + popId`, `LastActiveStatus = slRow[iStatus]`, `ReturnEligible = "FALSE"`, `SchemaVersion = slHeader.length`, `ArchiveNote = citizenArchiveNote_(...)`, `:16, 95-97, 134-143`).
  - Deletes verified rows from `Simulation_Ledger` (`sl.deleteRows(topQ + 2, n)`, `:260-270`).
- **Carries/writes a cause?** **Copies verbatim, never generates.** Copies `Simulation_Ledger.HealthCause` positionally into `Citizen_Archive.HealthCause` (`:136`).

### Secondary / Downstream Propagators of `deceased` (Never Originate a Death)
- **Hospital ghost-bed reconcile (`persistHospitalLedger_`):** `phase10-persistence/buildCyclePacket.js:1008-1039`. If an open row on `Hospital_Ledger` (`DischargeCycle` empty) belongs to a POPID whose `Simulation_Ledger.Status` is `"deceased"` without a transition event, writes `StatusNow = "deceased"`, `LastTransitionCycle = cycle`, `DischargeCycle = cycle`, `Outcome = "deceased-reconciled"`, `CyclesInCare = Math.max(0, cycle - gAdmit)` to `Hospital_Ledger` columns G–K (`:1026-1031`).
- **Judicial open-case reconcile (`reconcileJudicialWithLedger_`):** `phase05-citizens/judicialLifecycle.js:629-650` and `phase10-persistence/buildCyclePacket.js:1325-1346`. Closes open `Judicial_Ledger` rows for `deceased` citizens with `Outcome = "deceased"`, `StatusNow = "deceased"`, `ResolveCycle = cycle`.
- **Civic office holder replacement (`updateCivicApprovalRatings_`):** `phase05-citizens/updateCivicApprovalRatings.js:598-625`. Replaces an officeholder whose status is `"deceased"` (`fillVerb = "died in office"`).
- **Income zeroing and estate inheritance (`calculateCitizenIncomes_`, `processInheritance_`):** `phase05-citizens/generationalWealthEngine.js:621, 1327-1405, 1535-1585`. Zeroes `Simulation_Ledger.Income` for `deceased` citizens (`:621`) and distributes `NetWorth` to heirs/household survivors on `e.tag === 'Death' || e.newStatus === 'deceased'` (`:1328`), writing `InheritanceFrom` and `InheritanceLog` on `Family_Relationships` (`:1573-1577`).
- **Macro population drift (`finalizeWorldPopulation_`):** `phase01-config/godWorldEngine2.js:1322-1344`. Computes citywide aggregate `deaths = Math.round(total * baseDeathRate)` for `World_Population` (`baseDeathRate = 0.008` + winter/weather/illness modifiers); does not touch `Simulation_Ledger`.
- **Chaos Cars outcome validator (`validateOutcome`):** `utilities/chaosCarsConfig.js:39-40, 52-70`. Lists `'deceased'` and `'dead'` in `FORBIDDEN_OUTCOMES`; Chaos Cars cannot set `Status = "deceased"`.

---

## 3. Why `HealthCause` Is Blank on All Nine

1. **Which code is meant to fill `Simulation_Ledger.HealthCause` and when:**
   - **Heat-wave admission (Phase 4):** `phase04-events/generationalEventsEngine.js:339-341` sets `vRow[iHealthCause] = 'heat exhaustion during the heat wave'` when hospitalizing a senior (`70+`) during a salient `heat_wave`.
   - **Health-event admission (Phase 4):** `phase04-events/generationalEventsEngine.js:702-703` sets `row[iHealthCause] = buildAdmissionCause_(ctx, admitStatus, healthResult2, calendarContext)` (`:1493-1518`) when `checkHealthEvent_` admits a citizen to `"hospitalized"`, `"serious-condition"`, or `"injured"`.
   - **Legacy patient backfill (Phase 4):** `phase04-events/generationalEventsEngine.js:451-456` sets `row[iHealthCause] = buildAdmissionCause_(ctx, causeClass102, null, calendarContext)` inside `processHealthLifecycle_` when an already-admitted patient transitions with a blank `HealthCause`.
   - **Chaos Cars ambulance admission (Phase 4):** `phase04-events/chaosCarsEngine.js:538-540` sets `row[iHealthCauseW] = 'a workplace accident'` (on `workplace_accident` → `'hospitalized'`) or `'a sudden medical emergency'` (on `medical_emergency` → `'critical'`).
   - **Sports injury admission (Phase 5 / Dashboard):** `phase05-citizens/applyGameNightMoments.js:367-370` (`sportsInjure_`) sets `row[cols.iHealthCause] = 'injured playing for ' + club`, or preserves the operator-submitted `HealthCause` written by `scripts/sportsFeedWriter.js:34` / `scripts/sportsFeedContract.js:202` (`dashboard/src/components/SportsIntakeWorkspace.jsx:808`).
   - **Cleared on recovery/discharge:** `generationalEventsEngine.js:480-482` (`if (discharged && iHealthCause >= 0) row[iHealthCause] = "";`), `applyGameNightMoments.js:393`, and `utilities/archiveCitizenExits.js:355`.

2. **Why none of the nine carries a `HealthCause`:**
   - Every one of the nine died through **Path 2 (`checkDeath_`, `phase04-events/generationalEventsEngine.js:641-652, 1353-1380`)**, not Path 1 (`processHealthLifecycle_`, `:815-837`).
   - **Evidence:**
     - Path 1 (`:830`) always writes `[Death] <Name> has passed away...`, whereas all eight residents with a surviving `[Death]` line in `output/citizen_archive_snapshot.jsonl:48-57` (and Isabelle Louis's pre-clear C96 line in `docs/engine/archive/ENGINE_REPAIR.md:93`) carry the exact nameless strings from `checkDeath_` (`:1369-1377`): `"passed away peacefully"` (`POP-00492`), `"was lost to the community"` (`POP-00694`, `POP-00828`), `"passed away unexpectedly"` (`POP-00713`, `POP-00655`), `"concluded their life's journey"` (`POP-00814`), `"died after a sudden illness"` (`POP-00622`, and `POP-00331` pre-clear), and `"died surrounded by family"` (`POP-00934`).
     - None of the nine has a row in `output/beats/Hospital_Ledger.jsonl:1-3` (which holds only `POP-00194`, `POP-00528`, and `POP-00801`, all `Outcome: "recovered"`), and `persistHospitalLedger_` logged `deaths 0` in C107 (`output/execution_log_c107.txt:184`), C109 (`output/execution_log_c109.txt:218`), and C114 (`output/execution_log_c114.txt:269`).
     - Because all nine were healthy (`Active`) when `checkDeath_` rolled them, their `Simulation_Ledger.HealthCause` cell was `""`, `checkDeath_` (`:641-652`) never writes `HealthCause`, and `archiveCitizenExits_` (`utilities/archiveCitizenExits.js:136`) copied the blank `HealthCause` cell to `Citizen_Archive`.

3. **Whether a cause on `Health_Cause_Queue` or `Hospital_Ledger` ever reaches a death:**
   - **`Health_Cause_Queue` → never.** The Phase 11 intake file `phase11-media-intake/healthCauseIntake.js` that formerly copied `Health_Cause_Queue.AssignedCause` onto `Simulation_Ledger.HealthCause` was deleted whole on 2026-09-09 (`docs/SPREADSHEET.md:249`, `docs/plans/2026-09-09-health-slice-freshness.md:108, 137`, `phase04-events/generationalEventsEngine.js:698-701`). No code in `phase*`, `utilities`, or `scripts` writes to `Health_Cause_Queue` or reads `AssignedCause` back into `Simulation_Ledger`. The three rows in `output/beats/Health_Cause_Queue.jsonl:1-3` (`POP-00036`, `POP-00044`, `POP-00168`, all `StatusStartCycle: "0"`) are fossil rows read only by wake/slice scripts (`scripts/cron-work-wake.js:112-114`, `scripts/workerWake.js:399, 410`, `scripts/buildHealthSlice.js:113-123`).
   - **`Hospital_Ledger` → never flows upstream to `Simulation_Ledger`; only `Simulation_Ledger.HealthCause` flows downstream to `Hospital_Ledger` and Path 1 deaths.** `persistHospitalLedger_` (`phase10-persistence/buildCyclePacket.js:948, 968, 1062`) writes `Hospital_Ledger.Cause` from `ctx.summary.hospitalEvents[e].cause` / `Simulation_Ledger.HealthCause`; nothing in the engine reads `Hospital_Ledger.Cause` back onto `Simulation_Ledger`. A cause reaches a death **only** when `Simulation_Ledger.HealthCause` is already set on a hospitalized patient (at admission or via the `:451-456` `buildAdmissionCause_` backfill) and that patient dies via Path 1 (`processHealthLifecycle_` critical deterioration, `generationalEventsEngine.js:828-831`), which embeds `" due to complications from " + cause` in the `[Death]` line and leaves `row[iHealthCause]` intact when `archiveCitizenExits_` copies the row to `Citizen_Archive`.

---

## 4. The Cycles — Why `[Death]` Cycle and `ExitCycle` Differ (and Why Six Exit at C106)

1. **What writes the `[Death]` line's Cycle:**
   - `applyMilestone_` (`phase04-events/generationalEventsEngine.js:1761-1767`), called at the moment of death in Phase 4 (`:484, 644`), stamps `var stamp = "C" + cycle;` using the engine's current Cycle (`var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;` at `:249`). The `C<N>` prefix on the `[Death]` line in `LifeHistory` is therefore the **Cycle in which the citizen died in Phase 4** (`C99` for Mensah, `C101` for Ramas, `C102` for Belton, `C104` for Topez, `C106` for Tanaka, `C107` for Rios, `C109` for Warren, `C114` for Shah).

2. **What writes `ExitCycle` (and `SourceEventId`):**
   - `archiveCitizenExits_` (`utilities/archiveCitizenExits.js:177-282`), running in Phase 11 (`Phase11-CitizenArchive`), reads the current Cycle (`var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;` at `:183`) and passes `cycle` into `citizenArchiveRow_(header, body[moves[b].q], moves[b].reason, cycle, exitYear)` (`:246`).
   - `citizenArchiveRow_` (`utilities/archiveCitizenExits.js:134-143`) sets `ExitCycle = cycle` and `SourceEventId = citizenArchiveSourceEventId_(reason, cycle, popId)` (`"death:C" + cycle + ":" + popId`, `:95-97`). It does not parse `LifeHistory` for the death Cycle; `ExitCycle` is always **the Cycle in which `archiveCitizenExits_` moved the row from `Simulation_Ledger` to `Citizen_Archive`**.

3. **Why they differ for the pre-C106 deaths and why six exit together at C106:**
   - `archiveCitizenExits_` is gated on `Number(ctx.config.citizenArchiveEnabled) === 1` (`utilities/archiveCitizenExits.js:57-59, 180`).
   - Before Cycle 106, `Citizen_Archive` did not exist and `citizenArchiveEnabled` was `0` (`docs/plans/2026-08-21-citizen-archive.md:135, 853, 915, 917`; `output/engine_review_c106.md:10`).
   - All five citizens who died prior to C106 — Isabelle Louis (`POP-00331`, C96), Sumiko Mensah (`POP-00828`, C99), Marcello Ramas (`POP-00694`, C101), Lilo Belton (`POP-00713`, C102), and Dune Topez (`POP-00492`, C104) — remained on `Simulation_Ledger` with `Status = "deceased"` through C105 (`docs/plans/2026-08-21-citizen-archive.md:67-71, 853`).
   - In Cycle 106, Margarita Tanaka (`POP-00814`) died in Phase 4 (`C106 — [Death] concluded their life's journey`), bringing the `Status = "deceased"` rows on `Simulation_Ledger` to six; when `Phase11-CitizenArchive` ran with `citizenArchiveEnabled = 1` for the first time in Cycle 106 (`output/engine_review_c106.md:10`, `docs/plans/2026-08-21-citizen-archive.md:915`), it moved all six `deceased` rows off `Simulation_Ledger` in a single batch and stamped all six with `ExitCycle = 106` and `SourceEventId = "death:C106:<POPID>"`.
   - From Cycle 106 onward (`citizenArchiveEnabled = 1`), each new Phase 4 death (`POP-00622` at C107, `POP-00655` at C109, `POP-00934` at C114) was archived in Phase 11 of the same Cycle, so `ExitCycle` equals the `[Death]` line's Cycle.

---

## 5. Why Isabelle Louis (`POP-00331`) Has No `[Death]` Line in `LifeHistory` or the Local Beat Mirrors

1. **Where her `[Death]` line was originally written:**
   - Per `docs/engine/archive/ENGINE_REPAIR.md:93, 148`, `POP-00331` (Isabelle Louis) was rolled by `checkDeath_` (`phase04-events/generationalEventsEngine.js:641-652, 1353-1380`) on `2026-01-30` (when the `Status = "deceased"` cell write was lost to the pre-S204 `runNeighborhoodEngine` clobber) and again on `2026-06-01` in **Cycle 96** (when `Status = "deceased"` persisted), both times with the text `"died after a sudden illness"`.
   - `applyMilestone_` (`phase04-events/generationalEventsEngine.js:1761-1778`) wrote those `[Death]` entries to:
     1. `Simulation_Ledger` column O (`LifeHistory`), and
     2. `LifeHistory_Log`.

2. **Why it is missing from her `Citizen_Archive.LifeHistory` cell (`output/citizen_archive_snapshot.jsonl:47`):**
   - During the `engine.31` live dial seed deploy at S256 (`SEED_CYCLE = 95`, `docs/plans/2026-05-31-compression-tag-triage.md:146, 149`), `scripts/backdateCitizenDials.js --apply --live` (`scripts/backdateCitizenDials.js:123-143, 180-215`) executed the "A-style clear-O" migration on the live `Simulation_Ledger`:
     - It parsed all 904 citizens' `Simulation_Ledger.LifeHistory` (column O) entries (`:126-127`),
     - Appended all 4,051 column-O entries into the **`LifeHistory_Archive`** sheet tab (`:133-143, 181-193`),
     - Computed `DialState` and `TraitProfile` (`:148-154, 206-207`) — leaving `TopTags:Death,Birth,Background,Household,Career|Entries:6|V:2.0|Hash:7df417|Updated:c95` on `POP-00331`'s `TraitProfile` (`output/citizen_archive_snapshot.jsonl:47`),
     - And **cleared `Simulation_Ledger.LifeHistory` (column O) to `""` for every row** (`:132, 211-215`).
   - After her `LifeHistory` cell was wiped blank, two texture events were appended to her row before deceased-exclusion guards landed across all texture generators (S277/S325, e.g. `phase05-citizens/generateCitizensEvents.js:473, 2614-2621`): `2026-06-20 23:35 — [PrevEvening] noticed neighbors being more watchful today` (C99) and `Y2C48 — [Lifestyle] checked out a new shop that just opened nearby` (C100). Those two lines are what `archiveCitizenExits_` copied to `Citizen_Archive` at C106.

3. **Why it is not in `output/beats/LifeHistory_Log.jsonl` or `output/beats/prev/LifeHistory_Log.jsonl`, and where it is stored:**
   - **On the spreadsheet (`LifeHistory_Log` → `LifeHistory_Archive`):** Phase 11 `maintainLifeHistoryLog_` (`utilities/archiveLifeHistory.js:44-45, 76-84, 167-227`) moves all `LifeHistory_Log` rows with `Cycle <= maxCycle - 12` (`CYCLE_RETAIN_CYCLES = 12`, `:45`) to the **`LifeHistory_Archive`** tab and deletes them from `LifeHistory_Log` (`:203-227`). In addition, `scripts/backdateCitizenDials.js:181-193` appended her column-O `[Death]` entries directly to **`LifeHistory_Archive`** (where `scripts/buildCitizenCards.js:916-944` reads `LifeHistory_Archive!A:G` to recover pre-clear `[Death]` milestones).
   - **In the local disk mirrors (`output/beats/` and `output/beats/prev/`):** `scripts/dumpBeatTabs.js:47-89` does not dump `LifeHistory_Archive`, and `lifeWindowRows(logRaw, stamp)` (`scripts/dumpBeatTabs.js:105-110, 223, 231`) filters `LifeHistory_Log` to `[stamp - LIVED_WINDOW, stamp]` where `LIVED_WINDOW = 1` (`lib/wakePerception.js:877`). Consequently:
     - `output/beats/LifeHistory_Log.jsonl` (`output/beats/meta.json:2-4`, stamped `cycle: 116`) holds only Cycles **115–116**.
     - `output/beats/prev/LifeHistory_Log.jsonl` (`output/beats/prev/meta.json:2-4`, stamped `cycle: 115`) holds only Cycles **114–115** (containing only `POP-00934` Florencia Shah's C114 `[Death]` row at line `2329`).
   - Isabelle Louis's `[Death]` entries therefore reside only on the live **`LifeHistory_Archive`** sheet tab, which has no local mirror under `output/`.
