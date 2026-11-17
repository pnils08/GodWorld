# Brief to agy — deaths: was a cause ever recorded to canon, and what the code writes (pipeline.110 → engine.348)

Read-only review. Write your findings to `output/antigravity/2026-11-16-review-death-causes.md`. Do not edit code or sheets, do not run any model, do not run the cron or the engine.

## Why

The city's medical examiner (a worker agent) refuses to certify a cause for the nine residents the archive holds as deceased, because no cause is on file. Live read 2026-11-16 of `Citizen_Archive` (mirror: `output/citizen_archive_snapshot.jsonl`): nine rows Status `deceased`, ArchiveReason `deceased`, `HealthCause` blank on all nine. The only wording of how each died is a `[Death]` line in their own `LifeHistory`:

| POPID | Name | ExitCycle | Death line in LifeHistory |
|---|---|---|---|
| POP-00331 | Isabelle Louis | 106 | (none) |
| POP-00492 | Dune Topez | 106 | C104 — passed away peacefully |
| POP-00694 | Marcello Ramas | 106 | C101 — was lost to the community |
| POP-00713 | Lilo Belton | 106 | C102 — passed away unexpectedly |
| POP-00814 | Margarita Tanaka | 106 | C106 — concluded their life's journey |
| POP-00828 | Sumiko Mensah | 106 | C99 — was lost to the community |
| POP-00622 | Marisela Rios | 107 | C107 — died after a sudden illness |
| POP-00655 | Antwan Warren | 109 | C109 — passed away unexpectedly |
| POP-00934 | Florencia Shah | 114 | C114 — died surrounded by family |

## Questions

1. **Canon.** Was a cause of death for any of these nine — or for any resident's death, any Cycle — ever published or ingested? Canon is what the ingest paths send. Search the published record: `editions/` (every `cycle_pulse_c*.txt` and any other edition files), `archive/ARTICLE_INDEX.jsonl`, the cron desk output under `output/` (grep for the names, the POPIDs, "died", "death", "passed away", "cause of death", "obituar"). If you have the godworld MCP `search_canon` / `search_articles`, use them too and say which you used. For each hit: file:line (or doc id), the Cycle, the person, and the exact words about how they died. Say plainly if a person has no hit.
2. **Code — what writes a death.** Trace every path that makes a resident dead: `grep -rn` across all five dirs (`phase* utilities scripts lib dashboard`) for `deceased`, `Deceased`, `[Death]`, `Death`, `HealthCause`, `deathRate`, `Citizen_Archive`, `Health_Cause_Queue`, `AssignedCause`, `Hospital_Ledger` `Outcome`. For each path: file:line, what triggers it, what it writes (which tab, which column), and whether it writes or carries a cause.
3. **Why `HealthCause` is blank on all nine.** Which code is meant to fill `HealthCause` (on `Simulation_Ledger` and on the archive row), when, and why none of these nine carries one. Whether a cause assigned on `Health_Cause_Queue` or `Hospital_Ledger` ever reaches a death.
4. **The Cycles.** Several death lines are Cycles before the exit Cycle (Mensah C99 → exit 106; Ramas C101 → 106; Belton C102 → 106; Topez C104 → 106), and six exit at 106 together. From the code: what writes the `[Death]` line's Cycle, what writes `ExitCycle`, and why they differ.
5. Isabelle Louis has no death line at all. From the code and the mirrors (`output/beats/LifeHistory_Log.jsonl`, `output/beats/prev/`), where would hers have been written.

Each finding: file:line, what is there, the evidence. No proposals for what to build, what the examiner should say, or what any citizen's record should hold.
