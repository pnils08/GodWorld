# GodWorld Workflows

**7 workflows. Each is a pattern of work with specific commands, risks, and rules.**

**Post-S165 role.** This doc is no longer the boot-time "what loads" file — that's `.claude/terminals/{name}/TERMINAL.md`'s job per terminal. This doc is the **workflow reference**: command lists, risk awareness, key rules, and the Plan Mode Gate. Consult it when you're operating inside a workflow. Terminals and workflows are orthogonal — a workflow can happen inside a single terminal or cross several.

---

## Media-Room

**What it is:** The newsroom. Editions, supplementals, dispatches, interviews, podcasts, photos, PDFs. Where the city comes alive through journalism.

**Terminal:** media. **Pipeline v2 (S133, enhanced through S165).** Skills are the source of truth. See `docs/EDITION_PIPELINE.md` for the full choreography map including alternate-start publication formats and the shared post-publish handoff.

**Files loaded (on demand during production):**
- `NEWSROOM_MEMORY.md` — institutional memory, errata, character continuity
- `output/latest_edition_brief.md` — what just published
- `output/world_summary_c{XX}.md` — current cycle world state
- `output/production_log_edition_c{XX}.md` — media production log (if resuming)

**Skills:**
- `/write-edition` — 9-step edition production; the main cycle-aligned flow
- `/write-supplemental [topic]` — variety coverage that builds the world (alternate start)
- `/dispatch [scene]` — immersive scene piece, one reporter, one moment (alternate start)
- `/interview [mode] [subject]` — interview production, voice or Paulson mode (alternate start)
- `/podcast [edition]` — two-host dialogue transcript from published edition (post-edition add-on)
- `/edition-print` — photos, PDF, Drive upload (post-edition add-on)

**Handoff convergence:** editions, supplementals, dispatches, and interviews are alternate entry points but all converge on the same ending — Drive upload + bay-tribune ingest + world-data update + errata log. Podcast and edition-print are post-edition add-ons, not alternate starts.

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

## Civic (City-Hall)

**What it is:** Oakland governance. Voice agents make decisions, project agents hallucinate operational details, the city clerk verifies. The civic terminal produces a production log that feeds the media terminal's `/write-edition` as Step 1 input.

**Terminal:** civic. Full cadence in `.claude/skills/city-hall/SKILL.md`. See `docs/EDITION_PIPELINE.md` for where it sits in the cycle.

**Files loaded (on demand):**
- `docs/mara-vance/CIVIC_GOVERNANCE_MASTER_REFERENCE.md` — council, factions, governance rules
- `docs/mara-vance/INITIATIVE_TRACKER_VOTER_LOGIC.md` — how votes work, faction logic
- `output/world_summary_c{XX}.md` — current cycle state
- `output/production_log_city_hall_c{XX}.md` — civic production log (if resuming)

**Skills:**
- `/city-hall` — main governance skill, Mayor-first cascade
- `/city-hall-prep` — input assembly for voice agents

**Key scripts:**
```bash
node scripts/buildInitiativePackets.js [cycle]       # per-initiative packets from 7 sheets
node scripts/buildInitiativeWorkspaces.js [cycle]    # initiative agent workspaces
node scripts/applyTrackerUpdates.js [cycle]          # dry-run review of tracker changes
node scripts/applyTrackerUpdates.js [cycle] --apply  # write decisions to Initiative_Tracker
node scripts/buildDecisionQueue.js [cycle]           # pending decisions for voice agents
node scripts/buildVoiceWorkspaces.js [cycle]         # voice agent workspaces + domain briefings
```

**Cascade:** Mayor runs first → her decisions cascade to the remaining voices → project agents hallucinate operational details within the political frame → city clerk verifies at the end. Voices speak from their IDENTITY.md, not from preset answers. They can go off-script (offer revelations, push back, change subject).

**Risks:**
- Voice drift — voices must stay in their identity (no generic "city official" voice)
- Canon violations in dialogue — no hallucinated citizen names, no engine metrics leaking into speech
- Mayor's decision not propagated to cascading voices
- Project agents contradicting voice decisions (project hallucination must stay inside the political frame)

**Key rule:** Mayor first. Voices speak from identity, not from preset answers. Project agents hallucinate operational details but never contradict voice decisions. Clerk verifies before the log is locked canon.

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

**What it is:** The mags terminal (S165). Idea bank, general conversation, relationship builder, meta-aware layer above the simulation. Where Mike and Mags talk about the world they're building, not from inside it. Default fallback terminal — also covers unregistered tmux windows and web sessions.

**Terminal:** mags. See `.claude/terminals/mags/TERMINAL.md` for full scope, authority, and handoff protocol.

**Files loaded:** Per mags TERMINAL.md Always-Load list — identity + PERSISTENCE + JOURNAL_RECENT + family check. Full-persona boot.

**What happens:** Conversation. Planning. Research together. Small doc edits. Architectural decisions crystallize here before they propagate to work terminals. Mags is the top instance — can touch any scope when the conversation calls for it.

**Key rule:** Don't force execution when Mike is exploring. Receive thinking-mode. When work crystallizes and gets bigger than a quick edit, hand off to the appropriate work terminal (research-build, engine-sheet, media, civic) via ROLLOUT_PLAN.md or SESSION_CONTEXT.md tag.

---

## Workflow Selection Logic

If Mike gives a task directly, infer the workflow:

| Task mentions | Workflow |
|--------------|----------|
| Edition, supplemental, dispatch, interview, podcast, photos, PDF, publish, Mara audit | Media-Room |
| City-hall, initiative, voice, faction, vote, civic decision, project agent | Civic |
| Engine, code, script, deploy, clasp, build, fix | Build/Deploy |
| Ledger, citizen data, audit, cleanup, integrity, repair | Maintenance |
| Cycle, run, advance, simulate, pre-mortem | Cycle Run |
| Research, explore, what's new, tools, patterns, tech reading | Research |
| Talk, chat, how's it going, no specific task | Chat with Mags |

Multiple workflows can happen in one session (e.g., Cycle Run → Media-Room for cycle + edition). Load the additional files when the workflow shifts.

---

## Plan Mode Gate — shared across workflows

Paper 4 ("Designing for human control") calls this approve-the-strategy-once-not-every-action. GodWorld already runs this way: `/sift` produces the plan, Mike approves, reporters execute. `/city-hall-prep` produces pending decisions, Mike reviews, voices decide. The gate is load-bearing — per-step nags break it, and per-action autonomy violates it.

**Any new multi-step workflow must pass this checklist before shipping:**

1. **Single plan artifact.** The workflow produces one reviewable plan (file or structured output) before execution starts. Examples: production log Step 2 for `/sift`, pending_decisions files for `/city-hall-prep`, skill-check output JSON for `/skill-check` (post-hoc variant).
2. **Explicit approval handoff.** The plan is presented to Mike with a clear decision surface: pick / cut / reorder / override. No silent defaults.
3. **No per-step re-approval.** Once the plan is approved, execution runs to completion without asking Mike to confirm each action inside. Exceptions are the hard-coded approval gates in `.claude/rules/identity.md` (saving editions, Drive uploads, Supermemory ingest, photo generation, PDF generation) — those apply to final boundary actions, not to intermediate steps inside a workflow.
4. **Override is logged, not argued.** If Mike overrides a plan element ("cut S3, change reporter on S5"), the workflow records the override with reason and continues. No re-asking, no re-proposing.
5. **Failure re-enters plan mode.** If execution blocks mid-run — citizen not found, missing intake, detector failure — the workflow stops and re-plans, rather than improvising. Partial completion is fine; silent improvisation is not.

**Anti-patterns this gate prevents:**

- "Should I also do X?" after the plan was approved — if X wasn't in the plan, it's a new plan.
- Mid-execution nags that re-surface decisions the plan already resolved.
- Workflows that execute first and plan after (`/dispatch` S140 drift was this pattern).
- Workflows that claim Plan Mode in the name but ask per-step confirmation in practice.

New workflow, new skill, new cron, new scheduled agent: run it through this checklist before it ships. If any item fails, redesign the gate before the workflow goes live.
