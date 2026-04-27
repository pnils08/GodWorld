# Edition Production Pipeline v2

**Redesigned S133. S144 added sift/post-publish/reviewer chain. S148 shipped Phase 39 reviewer lanes + Final Arbiter. S165 added dispatch/interview alternate starts. S170 refresh to match shipped skills.** Skills are the source of truth. This doc is the map. When they disagree, the skills win.

---

## Architecture

Four terminals. Two production logs. One world.

| Terminal | Focus | Production Log |
|----------|-------|---------------|
| **Civic** | `/city-hall-prep` → `/city-hall` — voices govern, projects hallucinate | `production_log_city_hall_c{XX}.md` |
| **Media** | `/sift` → `/write-edition` → `/post-publish` + `/edition-print`; also `/write-supplemental`, `/dispatch`, `/interview`, `/podcast` | `production_log_edition_c{XX}.md` |
| **Engine** | Engine code, ledger maintenance, ingest scripts, `clasp push`, trait profile generation. Hosts `/run-cycle`, `/pre-flight`, `/pre-mortem`, `/engine-review`, `/build-world-summary` | None |
| **Research/Build** | Skills, docs, research, architecture | None |

---

## Master Chain

```
/run-cycle (orchestrator)
    ├── /pre-flight            — verify manual inputs (sports feed, intakes, tracker, ratings)
    ├── /pre-mortem            — engine code health scan
    ├── Mike runs cycle in GAS — engine runs in Google's cloud
    ├── /engine-review         — Phase 38 auditor → 7-field pattern briefs
    └── /build-world-summary   — factual world summary, ingest to world-data
                │
                ▼
/city-hall-prep                — reads world summary + engine review + sheets → pending_decisions.md per voice
                │
                ▼
/city-hall                     — voices govern, projects hallucinate, tracker updates (locked canon)
                │
                ▼
/sift                          — editorial planning, the game moment (Mags proposes, Mike picks)
                │
                ▼
/write-edition                 — executes sift output: launch reporters, review, compile, reviewer chain, publish
                │
                ├──▶ /edition-print      (parallel — DJ Hartley art direction, photos, PDF, Drive)
                ├──▶ /post-publish       (feedback loop close — canon, ratings, grading, criteria)
                └──▶ /podcast            (optional post-edition add-on — audio)
```

**Handoff:** every stage leaves on-disk output the next stage reads. No in-memory handoffs.

---

## Published `.txt` Format Contract

**The keystone.** All publishable artifacts — edition, interview, supplemental, dispatch — converge on one canonical `.txt` shape with the Bay Tribune masthead and five structural sections. The skills expect uniformity; the ingest scripts depend on it; the format IS the API between authoring and downstream pipeline.

Source: [[plans/2026-04-26-non-edition-publishing-pipeline]] T1.

### Filename convention

```
editions/cycle_pulse_<type>_<cycle>_<slug>.txt
```

- `<type>` ∈ `{edition, interview, supplemental, dispatch}`
- `<cycle>` is the engine cycle number (e.g., `92`)
- `<slug>` is omitted for `edition` (editions are already cycle-unique); required for the other three
- Slug is 1–3 words, lowercase, underscore-separated, editorial pick at authoring time

Companion artifact: interviews emit a second `.txt` with `<type>=interview-transcript` carrying the full transcript, masthead identical except for the type label.

### Masthead block

Every type carries the same five-line masthead. No exceptions.

```
============================================================
THE CYCLE PULSE — <TYPE> <CYCLE> "<descriptor>"
Bay Tribune | Cycle <N> | Y<n>C<m> | <Season>, <Week>
Weather: <weather phrase> | City Mood: <mood phrase>
============================================================
```

- `<TYPE>` uppercase: `EDITION` / `INTERVIEW` / `SUPPLEMENTAL` / `DISPATCH` / `INTERVIEW-TRANSCRIPT`
- `<descriptor>`: subject for interview ("Santana / OARI"), headline for supplemental/dispatch; omitted for edition
- `Y<n>C<m>` math: `n = floor((cycle-1) / 52) + 1`, `m = ((cycle-1) % 52) + 1` → cycle 92 = `Y2C40`. Replaces all month references (real-world calendar months don't align with the cycle clock and confuse cross-references with sports-time)
- Season + Week emitted by engine (e.g., `Fall, First Friday`) — kept; only month names are forbidden
- Weather + City Mood line is on every type (uniformity rule)

### Structural sections — order is law

```
HEADER (masthead)
    ↓
BODY (article prose)
    ↓
------------------------------------------------------------
NAMES INDEX
------------------------------------------------------------
CITIZEN USAGE LOG
------------------------------------------------------------
BUSINESSES NAMED
------------------------------------------------------------
ARTICLE TABLE
============================================================
```

- All five tracking sections appear AFTER the article body. Never inline. (S172 metadata-leak constraint encoded as format law — the leak source was desk reporters appending audit blocks inside article body; this rule prevents recurrence.)
- Section headers always present even when empty (uniformity for ingest scripts — empty sections still parse).

### Per-section content spec

| Section | Row format | Inclusion rule |
|---|---|---|
| **NAMES INDEX** | `<POP-ID> \| <Name> \| <Role/Title>` | Citizens explicitly named in body |
| **CITIZEN USAGE LOG** | `<POP-ID> \| <mention count> \| <quoted? Y/N>` | Any citizen explicitly named (1+ mention) |
| **BUSINESSES NAMED** | `<BIZ-ID or NEW> \| <Name> \| <Sector> \| <Neighborhood>` | Any business explicitly named in body |
| **ARTICLE TABLE** | `<slug> \| <reporter> \| <section> \| <word count>` | Multi-row for edition; single-row for interview/supplemental/dispatch |

**BUSINESSES NAMED maps to Business_Ledger columns A–D** (BIZ_ID, Name, Sector, Neighborhood). E–I (Employee_Count, Avg_Salary, Annual_Revenue, Growth_Rate, Key_Personnel) left for the engine to populate. New businesses (no existing BIZ_ID) marked `NEW` for ingest pickup.

### Per-type variants

The artifact differs only in body shape and Article Table row count. Section headers + masthead + Names/Citizen/Business sections are identical across types.

| Type | Article Table rows | Body shape | Companion artifacts |
|---|---|---|---|
| Edition | multi (1 per article) | section-by-section, multi-article | none |
| Interview | single | one Q&A or framed conversation | transcript `.txt` (same masthead, `type=interview-transcript`) |
| Supplemental | single or multi | topic deep-dive | none |
| Dispatch | single | one scene, one moment | none |

### Slug discipline — the retrieval-token rule

The slug is the canonical search keyword set for the artifact. Once published, **never changes**. Treat as immutable.

Replicated identically across every query surface:

- Filename
- Masthead descriptor (human-readable form)
- `/sift` queries when next cycle references the artifact
- MCP `search_canon` queries
- Mara audit references
- Desk packet citations
- Production log pointers
- bay-tribune Supermemory metadata

Editorial picks at authoring time. The authoring skill proposes a default derived from the brief's theme; Mags overrides if needed. Slug examples:
- Interview: `santana_oari` (subject + topic)
- Supplemental: `health_center_unstuck` (theme phrase)
- Dispatch: `temescal_47th_dawn` (location + time)

### Engine-canon ingest triggers

Published artifacts are not just print canon — they trigger engine state writes. Naming a citizen or business in a published artifact causes that entity to enter engine canon.

| Section | Existing path | Status |
|---|---|---|
| NAMES INDEX | `buildCitizenCards.js` refreshes world-data citizen cards + `scripts/ingestPublishedEntities.js` (S180) appends genuinely-new citizens to Simulation_Ledger | Active — both card refresh and sheet-level intake operational; new citizens land with `Status=pending` for engine demographic fill next cycle |
| BUSINESSES NAMED | `scripts/ingestPublishedEntities.js` (S180, engine-sheet) | Active — writes Business_Ledger cols A–D for new entities; cols E–I left blank for engine fill next cycle. Existing businesses are matched, never modified. Same script also handles NAMES INDEX → Simulation_Ledger appends (Status=`pending`, Tier=4). |

**Editorial implication:** reporters and Mags must cite businesses with care — naming a business in a published artifact promotes that business to engine canon. Same discipline already applies to citizens. The format makes the trigger explicit and machine-readable.

---

## /write-edition — Internal Reviewer Chain

Write-edition is not atomic. It launches reporters, then runs a **four-lane review + deterministic arbiter** before publishing. The reviewer "skills" (`/adversarial-review`, `/capability-review`, `/cycle-review`) are not separate pipeline entries — they are **internal sub-steps** invoked from within write-edition.

| Step | Action | Skill / Script | Gate |
|------|--------|---------------|------|
| 1 | Launch reporter agents (assignments from sift) | desk agents | — |
| 2 | Mags reads every article | — | manual |
| 3 | Compile edition (story-driven, no fixed sections) | — | Mike review |
| 3.25 | Adversarial review + tier classification + reward hacking scan (parallel) | `/adversarial-review`, `tierClassifier.js`, `rewardHackingScanner.js` | HALT if adversarial recommends it |
| 3.5 | **Capability review (Phase 39.1)** — deterministic editorial gate | `/capability-review` → `capabilityReviewer.js` | blocking failures halt |
| 4 | Validation + **Rhea (Sourcing Lane, weight 0.3)** | `validateEdition.js` + `rheaTwoPass.js` → `rheaJsonReport.js` | PASS / REVISE / FAIL |
| 4.1 | **Cycle-review (Reasoning Lane, weight 0.5)** | `/cycle-review` | PASS / REVISE / FAIL |
| 5 | **Mara audit (Result Validity Lane, weight 0.2)** — external, claude.ai | Mara on claude.ai → `maraJsonReport.js` | PASS / REVISE / FAIL |
| 5.5 | **Final Arbiter (Phase 39.7)** — reads the four lane JSONs, applies weights, emits single verdict | `finalArbiter.js` | PROCEED / PROCEED-WITH-NOTES / HALT |
| 6 | Publish — `saveToDrive.js` + `ingestEdition.js` | — | after Arbiter PROCEED |

**Weights:** reasoning 0.5 + sourcing 0.3 + result-validity 0.2 = 1.0. Capability is a hard gate, not weighted. Weighted score ≥ 0.75 = PROCEED, 0.60–0.75 = PROCEED-WITH-NOTES, below = HALT.

**Tier classification** (Step 3.25) controls downstream review depth:
- Tier A — front page, Tier-1 citizens, engine ailments, contested civic → all three lanes + capability + two-pass hallucination
- Tier B — neighborhood features, routine council, sports recaps → Rhea + cycle-review only
- Tier C — letters, baseline briefs, box-score equivalents → Rhea regex + anomaly flag only

---

## /city-hall — Internal Layers

City-hall is not atomic either. Internal order matters because Mayor's decisions cascade.

| Step | Layer | Agents | Output |
|------|-------|--------|--------|
| 0 | — | — | production log created |
| 1 | — | — | read Initiative_Tracker + Civic_Office_Ledger approvals |
| 2 | — | Mags writes | `pending_decisions.md` per voice |
| 3 | **Layer 1: Mayor first** | `civic-office-mayor` | `mayor_c{XX}.json` |
| — | cascade | — | update each remaining voice's pending_decisions with Mayor's relevant decisions |
| 4 | **Layer 2: Voices parallel** | police-chief, opp, crc, ind-swing, baylight-authority, district-attorney | `{voice}_c{XX}.json` |
| 5 | **Layer 3: Project agents** | civic-project-stabilization-fund, oari, health-center, transit-hub | `{project}_c{XX}.json` |
| 5.5 | — | — | verify all outputs exist |
| 5.6 | **City Clerk (closer)** | `city-clerk` | `clerk_audit_c{XX}.json` |
| 6 | — | Mags + Mike | review all decisions, apply tracker updates via `applyTrackerUpdates.js --apply` |
| 7 | — | Mags | Close city hall — write Media Handoff section to production log (canon-locked) |

**`city-hall-prep` runs before Step 0** as its own skill — reads world summary + engine review + sheets, writes the pending_decisions skeleton per voice.

**City Clerk is NOT a participant** — it's a closer that verifies tracker updates saved, all voice/project outputs landed, production log is complete, media handoff is ready.

---

## /post-publish — Feedback Loop Closer

Edition is published but not canonized and not fed back to the engine. This skill makes the next cycle smarter than the last. **13 steps.**

| # | Step | Key script |
|---|------|-----------|
| 1 | Bay-tribune ingest — wiki (primary) + edition text (backup) | `ingestEditionWiki.js`, `ingestEdition.js` |
| 2 | World-data updates — citizen cards, new businesses, world summary ingest | `buildCitizenCards.js`, `supermemory add` |
| 3 | Civic wiki — per-official records (script not built yet) | — |
| 4 | Coverage ratings to Edition_Coverage_Ratings sheet | `rateEditionCoverage.js --apply` |
| 5 | Citizen + business intake to sheets (not wired — needs engine session) | — |
| 6 | Grade edition — per-desk + per-reporter | `gradeEdition.js` |
| 7 | Update grade history (rolling 5-edition window) | `gradeHistory.js` |
| 8 | Extract exemplars (A-grade articles → desk workspaces) | `extractExemplars.js` |
| 9 | Update `NEWSROOM_MEMORY.md` — errata, coverage patterns, arcs | — |
| 10 | Update criteria files (story_evaluation, brief_template, citizen_selection) after `/skill-check write-edition {XX}` | `/skill-check`, `gradeEdition.js` |
| 11 | Filing + cleanup; restart mags-bot | `postRunFiling.js`, `pm2 restart mags-bot` |
| 12 | Finalize production log — wiki pattern with inline Supermemory doc IDs | — |
| 13 | Completion checklist | — |

**Loop closes:** post-publish writes ratings → next `/pre-flight` reads them → engine Phase 2 reflects them → next cycle's world state is shaped by what the newspaper published.

---

## Alternate-Start Publication Formats

Not cycle-dependent. Their own entry points. Share the media production log. Converge on the same publish handoff (bay-tribune + world-data + errata log).

```
/write-supplemental [topic]    — supplemental edition on a specific topic
    ├── Pick topic, design coverage plan
    ├── Write brief (world summary as context)
    ├── Launch reporters → compile → validate
    └── Publish + intake (same handoff as /write-edition end)

/dispatch [scene]              — immersive scene piece
    ├── One reporter, one location, one moment
    ├── Scene brief → reporter agent → compile → validate
    └── User approval on concept + reporter before write

/interview [mode] [subject]    — interview production
    ├── Mode: voice (reporter interviews a civic voice agent)
    ├── Mode: paulson (reporter interviews Mike as GM Paulson)
    ├── Transcript + published article in one run
    └── Canon gateway — what gets said becomes world-altering
```

---

## Post-Edition Add-Ons

Not alternate starts. Run AFTER an edition publishes. Append to the media production log.

```
/podcast                       — audio companion
    ├── Select format (Morning Edition / Postgame / Debrief)
    ├── Pick hosts → launch podcast-desk agent
    ├── Review transcript
    └── Audio render (Phase 30 pending) + own bay-tribune ingest

/edition-print                 — print assets (DJ Hartley art director)
    ├── Photos (generate-edition-photos.js)
    ├── Photo QA (photoQA.js — Haiku Vision)
    ├── PDF (generate-edition-pdf.js)
    └── Upload to Drive
```

---

## Inputs

| Input | Source | Used by |
|-------|--------|---------|
| Riley_Digest (3 cycles) | Simulation_Narrative sheet | `/build-world-summary` |
| Oakland_Sports_Feed (3 cycles) | Simulation_Narrative sheet | `/build-world-summary` |
| `engine_audit_c{XX}.json` | Phase 38 auditor (inside `/engine-review`) | `/sift` for storyHandles + capabilityHooks |
| `baseline_briefs_c{XX}.json` | Phase 38.8 generator | `/sift` Step 2b triage |
| `engine_anomalies_c{XX}.json` | Phase 38.7 anomaly gate | `/sift`, `/write-edition` Tier C flagging |
| Civic production log | `/city-hall` Step 7 | `/sift` Step 1 |
| World summary | `/build-world-summary` output | All media skills |
| Truesource | `truesource_reference.json` | Citizen/player verification |
| Bay-tribune Supermemory | Canon archive | Verification, continuity |
| World-data Supermemory | Citizen cards, cycle summaries | Verification, context |
| `NEWSROOM_MEMORY.md` | `/post-publish` Step 9 | `/sift` Step 1 |

---

## Reporters (9 core)

| Reporter | Section | Voice | Traits |
|----------|---------|-------|--------|
| Carmen Delaine | CIVIC AFFAIRS | Civic lead, investigations | 8 bounded |
| P Slayer | SPORTS / OPINION | Fan voice, emotional, reactive | 8 bounded |
| Anthony | SPORTS | Beat, stats, analytical | 8 bounded |
| Hal Richmond | SPORTS / FEATURES | Legacy, dynasty, farewell | 8 bounded |
| Jordan Velez | BUSINESS | Economics, labor, development | 8 bounded |
| Maria Keen | CITY LIFE | Culture, neighborhoods, texture | 8 bounded |
| Jax Caldera | ACCOUNTABILITY | Gaps, contradictions, silence | 8 bounded, conditional |
| Dr. Lila Mezran | HEALTH | Health events in engine data | 8 bounded, conditional |
| Letters | LETTERS | Citizen voices, always last | No traits |

Secondary reporters launch only when assigned. Chicago bureau (Grant, Finch) is supplemental-only.

---

## Civic Voices (12 agents)

| Agent | Role | Traits |
|-------|------|--------|
| Mayor Santana | Executive authority | 8 bounded civic |
| Chief Montez | Public safety | 8 bounded civic |
| OPP (Rivers) | Progressive caucus | 8 bounded civic |
| CRC (Ashford) | Reform coalition | 8 bounded civic |
| Vega (IND) | Council President | 8 bounded civic |
| Tran (IND) | Swing voter | 8 bounded civic |
| DA Dane | Legal framework | 8 bounded civic |
| Baylight (Ramos) | Stadium project | 8 bounded civic |
| OARI (Tran-Muñoz) | Crisis response | 8 bounded civic |
| Stab Fund (Webb) | Disbursement | 8 bounded civic |
| Health Ctr (Chen-Ramirez) | Facility design | 8 bounded civic |
| Transit Hub (Soria D.) | CBA framework | 8 bounded civic |

Voices govern. Projects hallucinate operational details within the political frame. City Clerk verifies at the end.

---

## Verification — Four Gates

| Gate | Phase | Access | When |
|------|-------|--------|------|
| `validateEdition.js` | pre-39 programmatic | Local | Step 4, before Rhea |
| Capability review | 39.1, hard gate | `capabilityReviewer.js` | Step 3.5 |
| Rhea (Sourcing Lane, 0.3) | 39.2 | Scoped Bash — dashboard API, Supermemory, ledger | Step 4 |
| Cycle-review (Reasoning Lane, 0.5) | 39.4 | Edition text + briefs | Step 4.1 |
| Mara (Result Validity Lane, 0.2) | 39.5, external | Own Supermemory MCP (mara + bay-tribune + world-data) on claude.ai | Step 5 |
| Final Arbiter | 39.7 | Reads the four lane JSONs | Step 5.5 |

Lane schema contract: `docs/engine/REVIEWER_LANE_SCHEMA.md` — four fields (process / outcome / controllableFailures / uncontrollableFailures) every reviewer JSON must satisfy.

---

## Key Principles

- **World summary is the foundation.** Built from Riley_Digest + Sports Feed + civic log. Ingested to world-data. Everything reads from it.
- **Mike and Mags pick stories together.** Mags proposes, Mike picks in `/sift`. No one decides alone.
- **Every name verified.** Ledger, truesource, bay-tribune, world-data. No exceptions.
- **Story-driven layout.** No fixed sections. If there's no business story, there's no business section.
- **Cycles only.** Edition numbers FORBIDDEN in article text. "Cycle" allowed and encouraged (per `.claude/rules/newsroom.md`, S146 reversal).
- **Ages: `2041 − BirthYear`.** Every citizen age uses the 2041 anchor. Don't trust `Age` in derived docs.
- **Agents get identity + assignment.** No 170K char data dumps. Bounded input. Memory Fence (Layer 2) + Context Scan (Layer 4) before every brief handoff.
- **One production log per terminal.** Civic has its own. Media skills all append to one.
- **City-hall is mandatory — never skippable.** No alternate path. Voices govern every cycle (when decisions are due); the edition reports FROM city-hall's output.
- **The world runs on cycles.** The newspaper covers what the engine produced. The engine doesn't simulate sports — Mike does.

---

## Skill Files (authoritative)

| Skill | Path | Role |
|-------|------|------|
| `/run-cycle` | `.claude/skills/run-cycle/SKILL.md` | Orchestrator |
| `/pre-flight` | `.claude/skills/pre-flight/SKILL.md` | Engine gate 1 |
| `/pre-mortem` | `.claude/skills/pre-mortem/SKILL.md` | Engine gate 2 |
| `/engine-review` | `.claude/skills/engine-review/SKILL.md` | Post-cycle auditor |
| `/build-world-summary` | `.claude/skills/build-world-summary/SKILL.md` | Factual summary |
| `/city-hall-prep` | `.claude/skills/city-hall-prep/SKILL.md` | Pending decisions builder |
| `/city-hall` | `.claude/skills/city-hall/SKILL.md` | Civic government |
| `/sift` | `.claude/skills/sift/SKILL.md` | Editorial planning |
| `/write-edition` | `.claude/skills/write-edition/SKILL.md` | Edition execution |
| `/adversarial-review` | `.claude/skills/adversarial-review/SKILL.md` | Internal Step 3.25 |
| `/capability-review` | `.claude/skills/capability-review/SKILL.md` | Internal Step 3.5 (hard gate) |
| `/cycle-review` | `.claude/skills/cycle-review/SKILL.md` | Internal Step 4.1 (reasoning lane) |
| `/style-pass` | `.claude/skills/style-pass/SKILL.md` | On-demand per-article voice review |
| `/save-to-bay-tribune` | `.claude/skills/save-to-bay-tribune/SKILL.md` | Publish handoff |
| `/post-publish` | `.claude/skills/post-publish/SKILL.md` | Feedback loop close |
| `/skill-check` | `.claude/skills/skill-check/SKILL.md` | Skill-vs-assertion grader |
| `/write-supplemental` | `.claude/skills/write-supplemental/SKILL.md` | Alternate start |
| `/dispatch` | `.claude/skills/dispatch/SKILL.md` | Alternate start |
| `/interview` | `.claude/skills/interview/SKILL.md` | Alternate start |
| `/podcast` | `.claude/skills/podcast/SKILL.md` | Post-edition add-on |
| `/edition-print` | `.claude/skills/edition-print/SKILL.md` | Post-edition add-on |

**The skills are the pipeline.** This doc is the map. When they disagree, the skill wins.
