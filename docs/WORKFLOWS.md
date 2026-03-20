# GodWorld Workflows

**4 workflows. Each loads different files, uses different tools, and has different risks.**

At session start, Mike picks a workflow. This determines what gets loaded into context and what kind of work happens. The workflows are defined in CLAUDE.md's Session Boot section — this doc expands on what each one actually involves.

---

## Media-Room

**What it is:** The newsroom. Editions, supplementals, podcasts, photos, PDFs. This is where the city comes alive through journalism.

**Files loaded:**
- `NEWSROOM_MEMORY.md` — institutional memory, errata, character continuity
- `NOTES_TO_SELF.md` — editorial flags, story tracking
- `output/latest_edition_brief.md` — what just published

**Key commands:**
```bash
node scripts/buildDeskPackets.js          # Step 6: desk input data
node scripts/buildDeskFolders.js [cycle]  # Step 7: per-desk workspaces
node scripts/generate-edition-photos.js   # Step 15: AI photos
node scripts/generate-edition-pdf.js      # Step 16: tabloid PDF
node scripts/saveToDrive.js --type edition # Step 17: Drive upload
node scripts/buildMaraPacket.js [cycle] [file] # Step 12: Mara audit packet
node scripts/validateEdition.js           # Step 10: 11 programmatic checks
node scripts/postRunFiling.js [cycle]     # Step 22: verify outputs + auto-rebuild article-index.json
node scripts/editionIntake.js [file]      # Step 23: citizen/storyline intake
node scripts/gradeEdition.js [cycle]      # Step 25: grade agents + auto-append edition_scores.json
```

**Skills:** `/write-edition`, `/write-supplemental`, `/podcast`, `/cycle-review`

**Risks:**
- Publishing before user approval (happened 7 sessions in a row — S84 era)
- Agent voice drift (Paulson as "owner", engine language leaking)
- Citizen reuse (same 8 reporters across editions)
- Errata not logged to errata.jsonl (fixes lost)

**Key rule:** USER APPROVAL GATE before save, upload, ingest, photos, PDF. Text file approved first.

---

## Build/Deploy

**What it is:** Engine work. Building, shipping, or fixing the simulation that creates the world.

**Files loaded:**
- `SESSION_CONTEXT.md` — engine versions, tools, cascade dependencies
- `docs/engine/ROLLOUT_PLAN.md` — single source for all project work
- `docs/engine/ENGINE_MAP.md` — every function in execution order

**Key commands:**
```bash
clasp push                    # Deploy all 153 files to Google Apps Script
node scripts/queryLedger.js   # Query live ledger data
```

**Skills:** `/pre-mortem`, `/tech-debt-audit`, `/stub-engine`, `/grill-me`

**Risks:**
- One bad write to the ledger corrupts hundreds of citizens (S68 proved this)
- Cascade dependencies — editing one engine affects others (see SESSION_CONTEXT.md)
- `clasp push` deploys ALL 153 files, no partial deploy
- Changes to Phase 5 engines can affect 675 citizens simultaneously

**Key rule:** Read ENGINE_MAP.md before touching code. Check cascade deps. Review before edit. Never edit without showing Mike first.

---

## Maintenance

**What it is:** Data integrity. The citizens ARE the world — if the ledger is wrong, everything downstream is fiction.

**Files loaded:**
- `SESSION_CONTEXT.md` — engine context
- `docs/engine/LEDGER_REPAIR.md` — recovery history, column reference
- `docs/engine/LEDGER_AUDIT.md` — audit history, decisions
- `docs/engine/ENGINE_MAP.md` — function reference

**Key commands:**
```bash
node scripts/queryLedger.js              # Query citizens, initiatives, council
node scripts/queryFamily.js              # Quick family check
node scripts/backupSpreadsheet.js        # Backup before changes
node scripts/cleanCitizenMediaUsage.js   # Clean media usage data
node scripts/applyCitizenBios.js         # Write citizen bios
node scripts/buildMaraReference.js       # Regenerate reference files
```

**Additional reference docs:**
- `docs/SIMULATION_LEDGER.md` — citizen architecture, column data flow
- `docs/SPREADSHEET.md` — all 65 tabs, dead tab flags

**Risks:**
- Writing to the live sheet without testing on practice sheet first (S92-S94 recovery was 3 sessions)
- Service account CANNOT create new spreadsheets
- Maintenance scripts have historically skipped rows silently (integrateAthletes.js skipped 38 birth years)

**Key rule:** Practice sheet → verify → replay on live. Verify live data after every write. Back up before any major changes.

---

## Cycle Run

**What it is:** Advance the world. Run the engine, review what happened, prepare for the newsroom to cover it.

**Files loaded:**
- `SESSION_CONTEXT.md` — engine versions
- `docs/engine/ROLLOUT_PLAN.md` — what's pending
- `docs/engine/ENGINE_MAP.md` — function reference
- Then run `/pre-mortem` before the cycle

**Key commands:**
```bash
# Pre-flight
node scripts/buildDeskPackets.js   # Verify data pipeline works

# The cycle itself runs in Google Apps Script:
# Open script.google.com → Run runWorldCycle()

# Post-cycle
node scripts/buildDeskPackets.js   # Build desk input from new cycle data
node scripts/buildDeskFolders.js [cycle]
node scripts/buildVoiceWorkspaces.js [cycle]
node scripts/buildInitiativeWorkspaces.js [cycle]
node scripts/buildInitiativePackets.js [cycle]
node scripts/buildCivicVoicePackets.js [cycle]
```

**Skills:** `/run-cycle`, `/pre-mortem`

**Risks:**
- Running a cycle on corrupted data compounds errors for every citizen
- Pre-mortem catches silent failures — skip it and you inherit them
- Post-cycle scripts must run in order (packets → folders → workspaces)

**Key rule:** Always run `/pre-mortem` first. Review cycle output before starting edition production.

---

## Workflow Selection Logic

If Mike gives a task directly, infer the workflow:

| Task mentions | Workflow |
|--------------|----------|
| Edition, supplemental, podcast, photos, PDF, publish, Mara audit | Media-Room |
| Engine, code, script, deploy, clasp, build, fix | Build/Deploy |
| Ledger, citizen data, audit, cleanup, integrity, repair | Maintenance |
| Cycle, run, advance, simulate, pre-mortem | Cycle Run |

Multiple workflows can happen in one session (e.g., Cycle Run → Media-Room for cycle + edition). Load the additional files when the workflow shifts.
