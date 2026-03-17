# Desk Packet Pipeline v2.0

**Purpose:** The definitive process for generating The Cycle Pulse using per-desk JSON packets, autonomous desk workspaces, and parallel desk agents.

**Key change (v2.0, S95-96):** All 21 agents are autonomous. Each reads from its own workspace folder instead of receiving data through the orchestrator. Three workspace builders (`buildDeskFolders.js`, `buildVoiceWorkspaces.js` v2.0, `buildInitiativeWorkspaces.js`) populate workspaces with zero LLM tokens. Voice agents now receive domain-specific engine data (crime→chief, displacement→OPP, fiscal→CRC) via `domain_briefing.md`. Orchestrator context before agent launch dropped from ~180K to ~6K tokens.

---

## The Pipeline (11 Stages)

```
1. ENGINE COMPLETES CYCLE
   ↓
2. GENERATE PACKETS
   node scripts/buildDeskPackets.js [cycle]
   node scripts/buildInitiativePackets.js [cycle]
   ↓
3. BUILD WORKSPACES (zero LLM tokens)
   node scripts/buildInitiativeWorkspaces.js [cycle]  → output/initiative-workspace/
   node scripts/buildVoiceWorkspaces.js [cycle]        → output/civic-voice-workspace/
   node scripts/buildDeskFolders.js [cycle]             → output/desks/
   ↓
4. INITIATIVE AGENTS (parallel, optional — 5 agents)
   Each reads: output/initiative-workspace/{init}/current/
   Each outputs: civic docs + decisions to output/city-civic-database/initiatives/
   ↓
5. VOICE AGENTS (parallel — 7 agents)
   Mayor first, then factions + extended
   Each reads: output/civic-voice-workspace/{office}/current/
   Each outputs: JSON statements to output/civic-voice/
   ↓
6. LAUNCH DESK AGENTS (parallel — 6 agents)
   Each reads: output/desks/{desk}/ (briefing, summary, errata, voice statements, archive)
   Each reads identity: .claude/agents/{desk}-desk/IDENTITY.md + RULES.md
   Each outputs: articles + evidence to output/desk-output/{desk}_c{XX}.md
   ↓
7. COMPILE (Mags Corliss role)
   Calls front page, orders sections, resolves overlap
   Produces unified edition
   ↓
8. VERIFY (Rhea Morgan agent)
   21 checks against canon. Produces error list or CLEAN.
   ↓
9. FIX + FINALIZE
   Apply Rhea's corrections. Final edition saved to editions/.
   ↓
10. PUBLISH
    Drive upload, Supermemory ingest, photos, PDF, Discord refresh.
    ↓
11. ENGINE INTAKE
    node -r dotenv/config scripts/editionIntake.js <edition-file> [cycle]
```

---

## Stage 2: Generate Desk Packets

### Script

```bash
cd /root/GodWorld && node scripts/buildDeskPackets.js 79
```

### Data Sources (16 Google Sheets + local files)

| Sheet | What's Pulled | Filtering |
|-------|--------------|-----------|
| `Story_Seed_Deck` | Seeds with SeedType, Domain, Priority, SeedText | Current cycle only |
| `Story_Hook_Deck` | Hooks with HookType, Domain, Priority, HookText | Current cycle only |
| `WorldEvents_V3_Ledger` | Events with Domain, Severity, Neighborhood | Current cycle only |
| `Event_Arc_Ledger` | Active arcs with Phase, Tension, DomainTag | Active (not resolved) |
| `Civic_Office_Ledger` | Council members, factions, districts | All active |
| `Initiative_Tracker` | Pending votes, projections, swing voters | **Excludes status="proposed"** |
| `Simulation_Ledger` | Named citizens with Tier, RoleType, Neighborhood | All (526 rows) |
| `Generic_Citizens` | Tier 3-4 citizens with Age, Neighborhood, Occupation | Active only, by neighborhood |
| `Chicago_Citizens` | Chicago citizens | All (90 rows) |
| `Cultural_Ledger` | Cultural entities with FameScore, Domain | Active, FameScore >= 20 |
| `Oakland_Sports_Feed` | A's game data, trades, community events | Current cycle (fallback: all) |
| `Chicago_Sports_Feed` | Bulls game data, trades, signings | Current cycle (fallback: all) |
| `Storyline_Tracker` | Active/new/developing storylines | Active status only, deduped |
| `Cycle_Packet` | Raw cycle packet text | Current cycle |
| `Press_Drafts` | Previous cycle coverage | Previous cycle |
| `LifeHistory_Log` | Recent quotes (EventTag='quoted') | Current cycle |

Local files read:
- `output/mara_directive_c{XX}.txt` — Mara Vance editorial guidance
- `schemas/bay_tribune_roster.json` — Journalist voice profiles
- `editions/cycle_pulse_edition_{XX-1}.txt` — Previous edition (for continuity)

### Local Archive (Searchable Reference)

All agents have Grep access to the **local Drive mirror** at `output/drive-files/` (6.9 MB, 614 files). This is institutional memory — every article ever written, every player data card, every edition ever published.

| Archive | Files | Content | Primary Desks |
|---------|-------|---------|---------------|
| `Tribune Media Archive` | 101 | 20 journalist desks — full body of work | All desks (past coverage, voice reference) |
| `Sports Desk Archive` | 155 | Hal, Anthony, P Slayer features + analytics + interviews | Sports, Letters |
| `Publications Archive` | 67 | Cycle Pulse editions 1-81, supplementals, Paulson pressers | All desks (continuity) |
| `As Universe Database` | 100 | TrueSource player cards, rosters, transactions, season stats | Sports, Letters |
| `Bulls Universe Database` | 9 | Chicago player profiles, contracts, financials | Chicago, Letters |
| `Stats CSV` | 4 | Batting stats, master stats (2039-2040 seasons) | Sports, Chicago |

**How agents use this:** `buildDeskFolders.js` copies archive context into each desk's `archive/` subfolder. Agents can also Grep the archive directly during writing for voice reference, historical context, or stat verification.

**Search examples:**
```bash
# Find all past coverage of a citizen
Grep: pattern="Vinnie Keane" path="output/drive-files" output_mode="files_with_matches"

# Find a player's TrueSource data card
Grep: pattern="TrueSource DataPage" path="output/drive-files/_As Universe Database" output_mode="files_with_matches"

# Find past Cycle Pulse editions mentioning a topic
Grep: pattern="Stabilization Fund" path="output/drive-files/_Publications Archive" output_mode="files_with_matches"

# Check a reporter's past articles for voice reference
Grep: pattern="Carmen Delaine" path="output/drive-files/_Tribune Media Archive" output_mode="files_with_matches"
```

**Manifest:** `output/drive-manifest.json` (full index), `docs/media/DRIVE_MANIFEST.md` (human-readable)

### Domain-to-Desk Routing

```
CIVIC, INFRASTRUCTURE, HEALTH, CRIME, SAFETY, GOVERNMENT, TRANSIT → civic
SPORTS → sports + chicago (filtered by team keywords)
CULTURE, FAITH, COMMUNITY, FESTIVAL, ARTS, EDUCATION, WEATHER → culture
ECONOMIC, NIGHTLIFE, RETAIL, LABOR → business
CHICAGO → chicago
GENERAL → civic + culture (both get it)
```

Storylines route via keyword matching on Description + RelatedCitizens fields.

### Output

```
output/desk-packets/
  civic_c79.json      (~36KB)
  sports_c79.json     (~21KB)
  culture_c79.json    (~47KB)
  business_c79.json   (~10KB)
  chicago_c79.json    (~13KB)
  letters_c79.json    (~64KB)
  base_context.json   (shared canon + context)
  manifest.json       (index of all packets)
```

Note: `output/` is in `.gitignore` — packets are generated locally, not committed.

### What Each Packet Contains

```json
{
  "meta": { "desk", "cycle", "generated" },
  "baseContext": { "cycle", "season", "holiday", "weather", "sentiment" },
  "deskBrief": { "name", "coverageDomains", "articleBudget" },
  "reporters": [ { "name", "role", "tone", "openingStyle", "themes", "samplePhrases" } ],
  "events": [ { "domain", "severity", "neighborhood", "description" } ],
  "seeds": [ { "seedType", "domain", "priority", "text" } ],
  "hooks": [ { "hookType", "domain", "priority", "text" } ],
  "arcs": [ { "arcId", "domain", "phase", "tension", "summary" } ],
  "storylines": [ { "type", "description", "status", "relatedCitizens" } ],
  "culturalEntities": [ { "name", "roleType", "domain", "fameScore" } ],
  "interviewCandidates": [ { "name", "age", "neighborhood", "occupation" } ],
  "canonReference": { "reporters", "council?", "pendingVotes?", "asRoster?", "bullsRoster?" },
  "sportsFeeds": [ ... ],
  "maraDirective": "...",
  "previousCoverage": [ ... ],
  "recentQuotes": [ ... ]
}
```

### What's NOT in Desk Packets (vs. Old Monolithic Handoff)

- **NO** Front Page Recommendation — Mags decides after reading all desk output
- **NO** Story Assignments — desks choose what to cover from their data
- **NO** Section Assignments — desks are autonomous
- **NO** Full canon dump to every desk — each desk gets only its relevant canon
- **NO** "Proposed" initiatives — excluded from all packets
- **NO** Engine analytics (Riley Digest, raw metrics)

---

## Stage 2.5: Build Desk Workspaces

### Script

```bash
cd /root/GodWorld && node scripts/buildDeskFolders.js 87
```

### What It Does (Zero LLM Tokens)

1. Creates `output/desks/{desk}/current/`, `archive/`, `reference/` for all 6 desks
2. Copies packets, summaries, base_context to each desk's `current/`
3. Copies truesource and citizen_archive to `reference/`
4. Copies last 3 desk outputs from `output/desk-output/` to `archive/`
5. Copies archive context from `output/desk-briefings/`
6. Filters `output/errata.jsonl` by desk — writes `errata.md`
7. Extracts Mara forward guidance from previous audit — writes `mara_guidance.md`
8. Distributes voice statement files per desk (see table below)
9. Distributes interview transcript files per desk
10. Generates `briefing.md` from structured data (guardian warnings, canon, story priorities, citizen cards)

### Voice Statement Distribution

| Desk | Gets Statements From |
|------|---------------------|
| civic | all 7 voice agents (mayor, opp, crc, ind, police chief, baylight, DA) |
| letters | mayor, opp, crc, ind |
| business | mayor, crc, baylight |
| sports | mayor, baylight |
| culture | opp |
| chicago | none |

### Output

```
output/desks/{desk}/
  README.md              <- static workspace navigation
  current/
    packet.json          <- copy from desk-packets/{desk}_c{XX}.json
    summary.json         <- copy from desk-packets/{desk}_summary_c{XX}.json
    base_context.json    <- copy from desk-packets/base_context.json
    briefing.md          <- SCRIPT-GENERATED (not LLM-written)
    mara_guidance.md     <- extracted from previous Mara audit
    errata.md            <- desk-filtered guardian warnings
    voice_statements/    <- relevant civic voice JSONs
    interviews/          <- relevant interview transcripts
  archive/
    {desk}_c{N-1}.md     <- last 3 editions of this desk's output
    {desk}_c{N-2}.md
    {desk}_c{N-3}.md
    archive_context.md   <- from buildArchiveContext.js
  reference/
    truesource.json      <- player/citizen reference data
    citizen_archive.json <- citizen archive data
```

### CLI Options

```bash
node scripts/buildDeskFolders.js {cycle}              # standard build
node scripts/buildDeskFolders.js {cycle} --skip-voice  # skip voice statement copy
node scripts/buildDeskFolders.js {cycle} --skip-mara   # skip Mara guidance extraction
node scripts/buildDeskFolders.js {cycle} --clean        # wipe and rebuild from scratch
```

---

## Stage 3: Desk Agents

### Agent Architecture (v2.0)

Each desk agent has three files at `.claude/agents/{desk}-desk/`:
- **SKILL.md** (~30 lines) — boot sequence only. Points to IDENTITY.md, RULES.md, and workspace.
- **IDENTITY.md** (~60 lines) — reporter personas, voice descriptions, examples.
- **RULES.md** (~50 lines) — hard rules, output format, domain lock.

Agents read their own workspace at `output/desks/{desk}/` — the orchestrator does not inject briefing content.

### Desk Activation Rules

| Cycle Type | Active Desks | Agents |
|------------|-------------|--------|
| Quiet | Sports + Culture + Letters | 3 |
| Normal | + Civic + Business | 5 |
| Hot | All 5 content desks + Letters | 6 |

### Desk Lineup

| Desk | Reporters | Article Budget | Canon Access |
|------|-----------|---------------|--------------|
| **Civic** | Carmen Delaine, Luis Navarro, Dr. Lila Mezran, Trevor Shimizu, Sgt. Rachel Torres | 2-4 articles | Council, pending votes, status alerts |
| **Sports** | Anthony, P Slayer, Hal Richmond, Tanya Cruz, DJ Hartley | 2-5 articles | A's roster, Oakland sports feeds |
| **Culture** | Maria Keen, Kai Marston, Mason Ortega, Angela Reyes, Noah Tan | 2-4 articles | Cultural entities |
| **Business** | Jordan Velez | 1-2 articles | (Business Ticker format) |
| **Chicago** | Selena Grant, Talia Finch | 2-3 articles | Bulls roster, Chicago sports feeds |
| **Letters** | (citizen voices) | 2-4 letters | Full canon access |

### What Each Agent Reads (Self-Service)

1. **IDENTITY.md** (~60 lines) — Reporter personas, voice, examples
2. **RULES.md** (~50 lines) — Hard rules, output format, domain lock
3. **Workspace README.md** — Navigation guide for the desk folder
4. **current/briefing.md** — Script-generated briefing (guardian warnings, canon, priorities, citizen cards)
5. **current/summary.json** — Desk packet summary (top events, seeds, hooks, storylines)
6. **current/errata.md** — Desk-filtered errata from previous editions
7. **archive/** — Last 3 desk outputs for continuity reference
8. **Agent memory** (auto-loaded) — `.claude/agent-memory/{desk}-desk/MEMORY.md`

### What Each Agent Returns

1. **Formatted articles** with bylines, Names Index footers
2. **Partial ARTICLE TABLE** rows for this desk's articles
3. **Partial STORYLINES UPDATED** (new + resolved from this desk's coverage)
4. **Partial CITIZEN USAGE LOG** for citizens used
5. **Partial CONTINUITY NOTES** (quotes, records, new canon)

---

## Stage 4: Compile (Mags Corliss)

Mags receives all desk outputs and:

1. Calls the **front page lead** (best article gets front page placement)
2. Orders sections: FRONT PAGE > CIVIC > BUSINESS > CULTURE > SPORTS > CHICAGO > LETTERS
3. Resolves overlap (if two desks touched same storyline — keeps both if angles differ)
4. Writes the **edition header** (weather/sentiment/migration)
5. Merges all partial returns into unified ARTICLE TABLE, STORYLINES, CITIZEN USAGE, CONTINUITY
6. Optionally writes an editorial or human-interest piece

---

## Stage 5: Verify (Rhea Morgan)

Rhea receives the compiled edition + canon sources:

- `bay_tribune_roster.json` — Reporter names and roles
- `Civic_Office_Ledger` — Council members, factions, districts
- `Initiative_Tracker` — Vote positions, projections
- `Simulation_Ledger` — A's/named citizens (526 rows)
- `Generic_Citizens` — Tier 3-4 Oakland citizens (225 rows)
- `Cultural_Ledger` — Cultural entities (25 rows)
- `Chicago_Citizens` — Chicago citizens (90 rows)
- `ARTICLE_INDEX_BY_POPID.md` — 326+ citizens with POP-IDs

**Checks:** Name spelling, vote positions, records, no engine metrics, reporter accuracy, citizen details (age/neighborhood/occupation match ledger data).

**Output:** Numbered error list or CLEAN.

---

## Stage 5.5: Programmatic Validation

```bash
node scripts/validateEdition.js editions/cycle_pulse_edition_{XX}.txt
```

11 checks (8 static + 3 live sheet): council names, vote math, vote breakdowns, player positions, player first names, mayor name, real-name blocklist, engine language, citizen names vs Simulation_Ledger, initiative facts vs Initiative_Tracker, civic office names vs Civic_Office_Ledger. Fix CRITICALs before Rhea. Use `--no-sheets` for offline mode.

---

## Stage 6: Mara Vance Canon Audit (External — claude.ai)

Mara reads the edition clean — no engine context, no Rhea report, no validation results. She reads journalism and judges realism, canon advancement, and narrative quality.

1. Generate audit packet: `node scripts/buildMaraPacket.js {XX} editions/cycle_pulse_edition_{XX}.txt`
2. Upload to Drive: `node scripts/saveToDrive.js output/mara-audit/edition_c{XX}_for_review.txt mara`
3. User hands edition to Mara on claude.ai
4. Mara reviews, approves or corrects, writes canon audit
5. Save audit to `output/mara_canon_audit_c{XX}.txt`

**Mara's audit packet contains:** Edition text + AUDIT_HISTORY.md (her memory). Nothing else. She already has the past 8 editions, media rosters, civic rosters, and initiative data in her claude.ai project.

**Separate from the Mara Directive:** The directive is pre-edition, in-world — from City Planning Director to Editor-in-Chief. The canon audit is post-edition — editorial quality gate.

---

## Stage 7: Finalize + Upload + Engine Intake

1. Apply Rhea's corrections and Mara's corrections
2. Save to `editions/cycle_pulse_edition_{XX}.txt`
3. **Upload to Google Drive:**
   ```bash
   node scripts/saveToDrive.js editions/cycle_pulse_edition_{XX}.txt edition
   node scripts/saveToDrive.js output/mara_canon_audit_c{XX}.txt mara
   node scripts/saveToDrive.js editions/oakland_supplemental_c{XX}.txt supplement  # if supplemental
   node scripts/saveToDrive.js editions/chicago_supplemental_c{XX}.txt chicago     # if supplemental
   ```
4. **Refresh local mirror** (picks up the file we just uploaded):
   ```bash
   node scripts/buildCombinedManifest.js && node scripts/downloadDriveArchive.js --refresh
   ```
5. Parse edition returns into intake sheets, then process into final ledgers

### Scripts

```bash
# v2.0: Single script, direct writes to final sheets
node -r dotenv/config scripts/editionIntake.js --dry-run <edition-file> [cycle]
node -r dotenv/config scripts/editionIntake.js <edition-file> [cycle]
# Writes: new citizens → Intake (16 cols), existing → Advancement_Intake1 (10 cols),
#         storylines → Storyline_Tracker, businesses → Business_Intake

# Then promote businesses and enrich citizen profiles:
node -r dotenv/config scripts/processBusinessIntake.js
node -r dotenv/config scripts/enrichCitizenProfiles.js --edition [cycle]
```

### Calendar Context (v1.1)

Calendar data is parsed from the `--- CALENDAR ---` section in the `Cycle_Packet` sheet's PacketText field — NOT from `World_Population` (which has no calendar columns). Extracted fields: Season, Holiday, HolidayPriority, IsFirstFriday, IsCreationDay, SportsSeason, Month.

### Citizen Routing (v1.1)

Citizens in `Citizen_Media_Usage` are checked against `Simulation_Ledger`:
- **New citizens** → `Intake` sheet (16 cols) with demographics extracted from name field format `"Name, Age, Neighborhood, Occupation"` → populates BirthYear, Neighborhood, RoleType
- **Existing citizens** → `Advancement_Intake1` sheet (10 cols) with RoleType from demographics and media usage notes
- Writes use explicit column ranges (`Intake!A:P`, `Advancement_Intake1!A:J`) to prevent Sheets API table-detection column shift

---

## Key Rules (All Desks)

1. **NEVER invent citizen names.** Use ONLY names from packet data or canon.
2. **No engine metrics in article text.** No "tension score," "severity level," "high-severity civic event."
3. **The world is real.** No simulation, no engine, no sheets. Only Oakland and Chicago.
4. **Max 2 articles per reporter per cycle.**
5. **Names Index footer on every article.** Lists all citizens/journalists referenced.
6. **Proposed initiatives are embargoed.** Status="proposed" items are NOT for media coverage.

---

## Version History

| Version | Cycle | Changes |
|---------|-------|---------|
| v2.0 | 87 | Desk agent autonomy: Stage 2.5 (`buildDeskFolders.js`), agent SKILL.md split into IDENTITY.md + RULES.md, workspace folders at `output/desks/`, orchestrator context reduced from ~180K to ~6K tokens. S95. |
| v1.1 | 79 | Stage 7 documented with editionIntake.js + processIntake.js v1.1. Calendar from Cycle_Packet, demographic extraction, citizen routing with explicit ranges. |
| v1.0 | 79 | Initial creation. Per-desk JSON packets, parallel agent architecture, 7-stage pipeline. |
