# Edition Production Pipeline v2

**Redesigned S133. Updated S144 (new pipeline skills).** Skills are the source of truth. This doc is the map.

---

## Architecture

Four terminals. Two production logs. One world.

| Terminal | Focus | Production Log |
|----------|-------|---------------|
| **Civic** | `/city-hall` — voices govern, projects hallucinate | `production_log_city_hall_c{XX}.md` |
| **Media** | `/write-edition`, `/write-supplemental`, `/podcast`, `/edition-print` | `production_log_edition_c{XX}.md` |
| **Engine** | Engine code, ledger maintenance, ingest scripts, `clasp push`, trait profile generation | None |
| **Research/Build** | Skills, docs, research, architecture | None |

---

## Cycle Flow

```
/run-cycle (orchestrator)
    │
    ├── Step 1: /pre-flight — verify manual inputs (sports feed, intakes, tracker, ratings)
    ├── Step 2: /pre-mortem — engine code health scan
    ├── Step 3: Mike runs cycle (engine in GAS)
    ├── Step 4: /engine-review — post-cycle world state diagnostic (Phase 38)
    └── Step 5: /build-world-summary — reads sheets + engine review → world summary doc
    │
    ├── Terminal 1: /city-hall
    │   ├── Read tracker (3 columns)
    │   ├── Mike provides pressure
    │   ├── Mags writes pending decisions
    │   ├── Mayor runs first → decisions cascade
    │   ├── Remaining voices parallel
    │   ├── Project agents hallucinate details
    │   ├── Apply tracker updates
    │   └── Output: civic production log (locked canon)
    │
    ├── Terminal 2: /write-edition
    │   ├── Step 0: Production log
    │   ├── Step 1: Read the world (civic log, Riley_Digest 3 cycles, Sports Feed 3 cycles → world summary → ingest to world-data)
    │   ├── Step 2: Pick stories together (Mike + Mags)
    │   ├── Step 3: Verify citizens + write angle briefs
    │   ├── Step 4: Launch 9 reporter agents
    │   ├── Step 4.5: Read every article
    │   ├── Step 5: Compile (story-driven, no fixed sections)
    │   ├── Step 6: Validation + Rhea (scoped Bash, real data access)
    │   ├── Step 7: Mara audit (external, her own Supermemory)
    │   ├── Step 8: Publish (Drive + ingest to bay-tribune)
    │   └── Step 9: Post-publish
    │
    ├── /write-supplemental (same terminal, appends to production log)
    │   ├── Pick topic
    │   ├── Design coverage plan
    │   ├── Write brief (world summary as context)
    │   ├── Launch reporters
    │   ├── Compile + validate
    │   ├── Publish + intake
    │   └── Reflects current world state
    │
    ├── /podcast (same terminal, appends to production log)
    │   ├── Select format (Morning Edition / Postgame / Debrief)
    │   ├── Pick hosts
    │   ├── Launch podcast-desk agent
    │   ├── Review transcript
    │   └── Audio render (Phase 30 pending)
    │
    └── /edition-print (same terminal, appends to production log)
        ├── Photos (generate-edition-photos.js)
        ├── Photo QA (photoQA.js — Haiku Vision)
        ├── PDF (generate-edition-pdf.js)
        └── Upload to Drive
```

---

## Inputs

| Input | Source | Used by |
|-------|--------|---------|
| Riley_Digest (3 cycles) | Simulation_Narrative sheet | write-edition Step 1 |
| Oakland_Sports_Feed (3 cycles) | Simulation_Narrative sheet | write-edition Step 1 |
| Civic production log | city-hall output | write-edition Step 1 |
| World summary | Built from above, ingested to world-data | All media skills |
| Truesource | `truesource_reference.json` | Citizen/player verification |
| Bay-tribune Supermemory | Canon archive | Verification, continuity |
| World-data Supermemory | Citizen state, cycle summaries | Verification, context |

---

## Reporters (9 core + secondaries)

| Reporter | Role | Traits System |
|----------|------|--------------|
| Carmen Delaine | Civic lead | 8 bounded reporter traits |
| P Slayer | Sports opinion | 8 bounded reporter traits |
| Anthony | Sports beat | 8 bounded reporter traits |
| Hal Richmond | Sports legacy | 8 bounded reporter traits |
| Jordan Velez | Business | 8 bounded reporter traits |
| Maria Keen | Culture | 8 bounded reporter traits |
| Jax Caldera | Accountability | 8 bounded reporter traits (conditional) |
| Dr. Lila Mezran | Health | 8 bounded reporter traits (conditional) |
| Letters | Citizen voices | No traits — citizen voices |

Secondary reporters launch only when assigned. Chicago bureau (Grant, Finch) is supplemental-only.

---

## Civic Voices (11 agents with bounded traits)

| Agent | Role | Traits System |
|-------|------|--------------|
| Mayor Santana | Executive authority | 8 bounded civic traits |
| Chief Montez | Public safety | 8 bounded civic traits |
| OPP (Rivers) | Progressive caucus | 8 bounded civic traits |
| CRC (Ashford) | Reform coalition | 8 bounded civic traits |
| Vega (IND) | Council President | 8 bounded civic traits |
| Tran (IND) | Swing voter | 8 bounded civic traits |
| DA Dane | Legal framework | 8 bounded civic traits |
| Baylight (Ramos) | Stadium project | 8 bounded civic traits |
| OARI (Tran-Muñoz) | Crisis response | 8 bounded civic traits |
| Stab Fund (Webb) | Disbursement | 8 bounded civic traits |
| Health Ctr (Chen-Ramirez) | Facility design | 8 bounded civic traits |
| Transit Hub (Soria D.) | CBA framework | 8 bounded civic traits |

Voices govern. Projects hallucinate operational details within the political frame. City Clerk verifies at the end.

---

## Verification

| Verifier | Access | When |
|----------|--------|------|
| Rhea Morgan | Scoped Bash — dashboard API, Supermemory, ledger queries | Step 6, after compile |
| Mara Vance | Own Supermemory MCP (mara + bay-tribune + world-data) | Step 7, external on claude.ai |
| validateEdition.js | Programmatic checks | Step 6, before Rhea |

---

## Key Principles

- **World summary is the foundation.** Built from Riley_Digest + Sports Feed + civic log. Ingested to world-data. Everything reads from it.
- **Mike and Mags pick stories together.** Mags proposes, Mike picks. No one decides alone.
- **Every name verified.** Ledger, truesource, bay-tribune, world-data. No exceptions.
- **Story-driven layout.** No fixed sections. If there's no business story, there's no business section.
- **No calendar dates.** Cycles only.
- **Agents get identity + assignment.** No 170K char data dumps. Bounded input.
- **One production log per terminal.** Civic has its own. Media skills all append to one.
- **The world runs on cycles.** The newspaper covers what the engine produced. The engine doesn't simulate sports — Mike does.

---

## Skill Files (authoritative)

| Skill | Path |
|-------|------|
| `/run-cycle` | `.claude/skills/run-cycle/SKILL.md` |
| `/pre-flight` | `.claude/skills/pre-flight/SKILL.md` |
| `/pre-mortem` | `.claude/skills/pre-mortem/SKILL.md` |
| `/engine-review` | `.claude/skills/engine-review/SKILL.md` |
| `/build-world-summary` | `.claude/skills/build-world-summary/SKILL.md` |
| `/city-hall` | `.claude/skills/city-hall/SKILL.md` |
| `/write-edition` | `.claude/skills/write-edition/SKILL.md` |
| `/write-supplemental` | `.claude/skills/write-supplemental/SKILL.md` |
| `/podcast` | `.claude/skills/podcast/SKILL.md` |
| `/edition-print` | `.claude/skills/edition-print/SKILL.md` |

**The skills are the pipeline.** This doc is the map. When they disagree, the skill wins.
