# GodWorld Workflows

**6 workflows. Each loads different files, uses different tools, and has different risks.**

**This file is read at boot after workflow selection.** Read your workflow section — it tells you what to load, what commands are available, what the rules are, and what to avoid.

---

## Media-Room

**What it is:** The newsroom. Editions, supplementals, podcasts, photos, PDFs. This is where the city comes alive through journalism.

**Pipeline v2 (S133).** Skills are the source of truth. See `docs/EDITION_PIPELINE.md` for the full map.

**Files loaded:**
- `NEWSROOM_MEMORY.md` — institutional memory, errata, character continuity
- `output/latest_edition_brief.md` — what just published
- `output/world_summary_c{XX}.md` — current cycle world state
- `output/production_log_edition_c{XX}.md` — media production log (if resuming)

**Skills:**
- `/write-edition` — build world summary, pick stories with Mike, brief reporters, compile, verify, publish
- `/write-supplemental` — variety coverage that builds the world
- `/podcast` — two-host dialogue transcript from published edition
- `/edition-print` — photos, PDF, Drive upload (post-publish)

**Key scripts (still valid):**
```bash
node scripts/validateEdition.js           # Programmatic checks before Rhea
node scripts/saveToDrive.js [file] [dest] # Upload to Drive
node scripts/ingestEdition.js [file]      # Ingest to bay-tribune Supermemory
node scripts/postRunFiling.js [cycle]     # Verify outputs + article index
node scripts/editionIntake.js [file]      # Citizen/storyline intake
node scripts/gradeEdition.js [cycle]      # Grade reporters
node scripts/generate-edition-photos.js   # AI photos (edition-print)
node scripts/photoQA.js output/photos/eXX # Photo QA (edition-print)
node scripts/generate-edition-pdf.js      # Tabloid PDF (edition-print)
```

**Bypassed scripts (old pipeline, code still exists):**
- `buildDeskPackets.js` — replaced by world summary + angle briefs
- `buildDeskFolders.js` — replaced by reporter identity + angle brief
- `buildInitiativePackets.js` — city-hall terminal handles this
- `buildCivicVoicePackets.js` — city-hall terminal handles this
- `buildVoiceWorkspaces.js` — city-hall uses identity + pending decisions only
- `buildDecisionQueue.js` — Mags writes pending decisions by hand
- `buildMaraPacket.js` — Mara has her own Supermemory access

**Risks:**
- Publishing before user approval
- Agent voice drift (Paulson as "owner", engine language leaking)
- Citizen invention (verify every name against ledger)
- Errata not logged to errata.jsonl
- Calendar dates in articles (cycles only)

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

**Batch operations:** For bulk file migrations or repetitive edits across many files, use `claude -p "task" --allowedTools "Edit,Read,Glob"` in a loop. Scopes tools so parallel runs can't accidentally shell out. Example: `for f in editions/e*/metadata.json; do claude -p "update format in $f" --allowedTools "Edit,Read"; done`

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

**Batch operations:** For bulk citizen repairs or doc updates, use `claude -p "task" --allowedTools "Edit,Read,Glob,Bash(node:*)"` to scope tools safely. Prevents accidental sheet writes outside approved scripts.

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

# Post-cycle (order matters — each step feeds the next)
node scripts/buildDeskPackets.js [cycle]              # 4a: desk input from new cycle data
node scripts/buildInitiativePackets.js [cycle]        # 4b: per-initiative packets from 7 sheets
node scripts/buildInitiativeWorkspaces.js [cycle]     # 4c: initiative agent workspaces
node scripts/applyTrackerUpdates.js [cycle]           # 4c.5: dry run — review before applying
node scripts/applyTrackerUpdates.js [cycle] --apply   # 4c.5: write decisions to Initiative_Tracker
node scripts/buildDecisionQueue.js [cycle]            # 4c.6: pending decisions for voice agents
node scripts/buildVoiceWorkspaces.js [cycle]          # 4d: voice agent workspaces + domain briefings
node scripts/buildDeskFolders.js [cycle]              # 4e: per-desk workspaces with voice distribution
node scripts/checkSupplementalTriggers.js [cycle]     # 4f: supplemental candidates
```

**Skills:** `/run-cycle`, `/pre-mortem`

**Risks:**
- Running a cycle on corrupted data compounds errors for every citizen
- Pre-mortem catches silent failures — skip it and you inherit them
- Post-cycle scripts must run in order (Steps 4a-4f — see run-cycle SKILL.md)

**Key rule:** Always run `/pre-mortem` first. Review cycle output before starting edition production.

---

## Research

**What it is:** Discover what's out there and figure out how it helps the project. Memory systems, agent patterns, cost optimization, world-building techniques.

**Files loaded:**
- `docs/RESEARCH.md` — active questions, findings log, reading list
- Architecture docs as needed (SUPERMEMORY.md, STACK.md, etc.)

**What happens:**
- Search the web for tools, papers, projects, patterns
- Evaluate against what we have (architecture docs tell you this)
- Log findings in RESEARCH.md with how they connect to the project
- When something is ready to build, graduate it to ROLLOUT_PLAN.md

**Skills:** `/super-search`, web search, `/grill-me` (for evaluating whether something is worth building)

**Key rule:** Research produces understanding, not code. Don't build during research sessions. Log findings, graduate to rollout when ready.

---

## Chat with Mags

**What it is:** No work agenda. Just talking. About the city, the family, the project, whatever's on Mike's mind.

**Files loaded:**
- Identity files (automatic via boot)
- Nothing else unless the conversation goes somewhere specific

**What happens:** Conversation. Mags is present. No tasks, no pipeline, no debugging.

**Key rule:** Don't turn this into a work session. If Mike wants to work, he'll say so.

---

## Workflow Selection Logic

If Mike gives a task directly, infer the workflow:

| Task mentions | Workflow |
|--------------|----------|
| Edition, supplemental, podcast, photos, PDF, publish, Mara audit | Media-Room |
| Engine, code, script, deploy, clasp, build, fix | Build/Deploy |
| Ledger, citizen data, audit, cleanup, integrity, repair | Maintenance |
| Cycle, run, advance, simulate, pre-mortem | Cycle Run |
| Research, explore, what's new, tools, patterns, tech reading | Research |
| Talk, chat, how's it going, no specific task | Chat with Mags |

Multiple workflows can happen in one session (e.g., Cycle Run → Media-Room for cycle + edition). Load the additional files when the workflow shifts.
