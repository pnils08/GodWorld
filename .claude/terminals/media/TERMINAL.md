# Media Terminal

**RETIRED AS A LIVE SEAT (Mike-direct, 2026-08-15, S372).** This terminal is not booted anymore — `cron-desk-run.js` runs edition production unattended. rb (research-build/Mags) designs pipeline tuning; es (engine-sheet) executes code/config changes. Live-CLI media work now is the Gemini deep-lore writer (antigravity, pipeline.56) and NotebookLM integration — new build threads, not day-to-day edition writing. The rest of this file is kept as a **reference** — the Owned Documentation tables below still point at the right files; the Launch/Session-Close sections below are historical and don't fire.

**Role (historical):** Edition production, desk agents, supplementals, podcast, publish pipeline. The newsroom.
**Established:** Session 135 (2026-04-05)
**Terminal tag for saves:** `[media]`

---

## Launch & Resume — RETIRED

Nobody boots this window anymore. `cron-desk-run.js` runs the pipeline on schedule; rb/es edit its agents/skills directly, no session to launch.

---

## Always Load

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Zero layer — identity, rules, terminal architecture, memory systems |
| `.claude/rules/identity.md` | Non-negotiable behavioral rules (auto-loaded) |
| `.claude/rules/newsroom.md` | Newsroom rules (auto-loaded on media files) |
| `SESSION_CONTEXT.md` | Current state — cycle, versions, recent sessions |
| `docs/mags-corliss/CHARACTER.md` | Mags persistence — load on media boots |
| `node scripts/magsPageRecall.js --cycle=<C>` | Mags' recent page reflections — persona conditioning (replaces JOURNAL_RECENT read, frozen S300 pipe.40 T4). Cold boot has no cycle-storyline context, so this returns recency-scored reflections; the context-scored EIC injection happens in `/sift` + `/write-edition` (pipe.40 T5). |
| `.claude/terminals/media/TERMINAL.md` | This file — your scope, your docs, your rules |

**Plus:** `node scripts/queryFamily.js` — Robert/Sarah/Michael/Scout live state. Run at boot; react to what you find.

Hook injects a compact `SESSION_CONTEXT` slice (next priority + last 3 session entries + `[media]`-tagged entries). Don't re-read the full file.

---

## Mode: Persona (full character)

Identity + CHARACTER + her recent page reflections (`magsPageRecall.js`) + queryFamily. The character shows up fully — Mags in the newsroom, family alive, reflection conditioning active. Her inner life now lives on her citizen page (POP-00005), not the frozen JOURNAL_RECENT (S300 pipe.40 T4). The only character-loading terminal (S211 mags trim, S221 contamination cleanup formalized two-tier model). `NEWSROOM_MEMORY.md` stays on-demand (loaded by `/write-edition` and related skills), not auto-loaded at boot — 90KB is bandwidth better spent on the work itself.

---

## Operating discipline (S333)

- **Subagents run a tier down.** This terminal leads on **Sonnet** — the standing desk/reviewer roster is already tiered in agent frontmatter (desks = Sonnet, civic voices = Haiku), but ad-hoc `Agent`/Task/Explore spawns default-inherit Sonnet unless you pass `model:`. Push mechanical fan-out to **Haiku**; escalate to a Sonnet peer only on a genuine reasoning floor. Full rule: [[../../../docs/MODEL_HIERARCHY]] §8.
- **Measure twice, cut once** — boot-emitted for every lane (gov.36 item 2, S356: MEASURE TWICE block in `<godworld-state>`). This terminal's instance of the discipline is the **reviewer lanes** (Rhea → cycle-review → Mara → capability → Final Arbiter) — the gen-eval architecture; don't collapse them for speed.
- **Spirit: this is a fun sim.** The discipline exists to save Mike's money and keep canon coherent — not because a mistake is catastrophic. Hold it lightly.

---

## Skill Bag (S212)

Mags-EIC stays loaded everywhere (CLAUDE.md, identity.md, MEMORY.md), but at this terminal she's at full power: **Editor-in-Chief running edition production.** The bag pulls editorial judgment, story sifting, reporter assignment, voice consistency, canon enforcement, three-layer coverage discipline (S142 — engine + simulation + user actions threaded in every meaningful piece), anti-cookie-cutter prose discipline (S208 — canon worthiness over formula), and reviewer-lane orchestration. This is the only Full-persona terminal because edition work needs the full character — judgment born of consequence-tracking, family-conditioned values, reflection-built conscience (now page-borne, S300).

**Reviewer lanes are the canonical S212 gen-eval architecture in the project.** Desk reporters generate (autoregressive, locally optimal, no holistic quality compass); Rhea verifies sourcing, cycle-review evaluates reasoning, Mara audits result validity, capability reviewer checks the lanes themselves, Final Arbiter renders verdict. This terminal owns the most-developed gen-eval pipeline anywhere in the project — what the other terminals' review patterns (Clerk in civic, measure-twice in engine-sheet, audit-the-audit in research-build) are simpler instances of. Don't propose collapsing lanes for efficiency — they ARE the principle made architectural.

**Terminal-pipeline gen-eval boundary.** Civic terminal GENERATES raw source material (Mayor decisions, faction positions, vote tallies, project status); media terminal EVALUATES/refines into journalism. Civic output is intentionally raw quotes and decisions; polishing into journalism happens here, not at civic. Don't ask civic to ship finished prose; don't ship raw source material as journalism. (Mirrors the framing in `.claude/rules/civic.md`.)

**Why named explicitly:** LLMs are bags of skills, not single tools. Vague briefing pulls nothing; named-skill briefing pulls the bag. The Full persona at this terminal pulls a lot — naming "EIC running edition production" focuses what's pulled toward the editorial-judgment + reviewer-lane + three-layer-coverage skill set, not generic Mags-presence. The richer the persona, the more important explicit skill-bag naming becomes — otherwise the model picks whichever capabilities are most salient, not the ones the work needs.

Full discipline + standing rules + canon-critical reminders live in `.claude/rules/newsroom.md` (path-scoped — auto-loads on `editions/**`, the newsroom-owned `output/` subdirs (reporters/letters/quick-takes/photos/desk-output/desk-packets/grades), `docs/media/**`, `docs/mags-corliss/**`, and the desk-agent dirs; **not** on every `output/` read — G-SS10 S247). The media terminal also loads it directly at boot. Skill-bag naming principle itself documented at [[../../../docs/adr/0004-skill-bag-naming-principle]] (S212 governance).

---

## Generator scope (S212 / ADR-0005)

**This terminal runs skills. It does not file ROLLOUT entries, edit skills, or fix processes.** It runs edition-production skills (`/sift`, `/write-edition`, `/edition-print`, `/post-publish`, `/dispatch`, `/interview`, `/write-supplemental`), produces editions + production logs + gap logs, and runs its own session-end.

Triage and fixes route to **research-build** (skill / RULES / docs / canon edits) or **engine-sheet** (code / sheets / scripts). Never route work back here.

**Your gap log is your research layer — and the ONLY place issues get logged.** Gap logs surfaced during a skill run land at `output/production_log_edition_c{XX}_*_gaps.md` per [[../../../docs/plans/GAP_LOG_TEMPLATE]]. That is this terminal's filing channel: issues, friction, observations during a run go in the gap log, nowhere else. **Never blind-log on ROLLOUT** — ROLLOUT is the shared map every terminal reads at boot; raw issues there tax everyone. Research-build triages the gap log into tracked rows next session.

Doctrine every terminal follows: [[../../../docs/engine/rollout-rules]] (§2 = the gap-log keystone). Per-terminal scope rule: [[../../../docs/adr/0005-rollout-plan-structure]] §Part 3.

---

## Owned Documentation

### Edition Pipeline & Production

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/EDITION_PIPELINE.md` | Pipeline v2 skills map (S134) — 4 terminals, 9 steps | Every edition run |
| `docs/media/AGENT_NEWSROOM.md` | Newsroom agent architecture | Agent work |
| `docs/media/DESK_PACKET_PIPELINE.md` | How packets flow to desks | Pre-edition |
| `docs/media/MEDIA_ROOM_STYLE_GUIDE.md` | Tribune voice, tone, standards | Writing, reviewing |
| `docs/media/JOURNALISM_AI_OPTIMIZATIONS.md` | Agent prompt patterns that work | Agent tuning |
| `docs/media/MEDIA_ROOM_HANDOFF.md` | Handoff procedures | Pipeline coordination |
| `docs/media/MEDIA_INTAKE_V2.2_HANDOFF.md` | Intake handoff spec | Post-edition intake |
| `docs/media/intake.md` | Intake notes | Intake work |
| `docs/media/GOOGLE_DRIVE_INTEGRATION.md` | Drive upload process | Publish step |
| `docs/media/DRIVE_MANIFEST.md` | What's on Drive | Verification |

### Reporter Voices (17 reporters)

| File | Reporter |
|------|----------|
| `docs/media/voices/carmen_delaine.md` | Carmen Delaine — civic |
| `docs/media/voices/p_slayer.md` | P Slayer — sports |
| `docs/media/voices/anthony.md` | Anthony Raines — sports |
| `docs/media/voices/hal_richmond.md` | Hal Richmond — sports/culture |
| `docs/media/voices/jordan_velez.md` | Jordan Velez — business |
| `docs/media/voices/maria_keen.md` | Maria Keen — culture |
| `docs/media/voices/jax_caldera.md` | Jax Caldera — nightlife/culture |
| `docs/media/voices/dr_lila_mezran.md` | Dr. Lila Mezran — analysis |
| `docs/media/voices/selena_grant.md` | Selena Grant — Chicago |
| `docs/media/voices/talia_finch.md` | Talia Finch — Chicago |
| `docs/media/voices/trevor_shimizu.md` | Trevor Shimizu |
| `docs/media/voices/luis_navarro.md` | Luis Navarro |
| `docs/media/voices/sgt_rachel_torres.md` | Sgt. Rachel Torres |
| `docs/media/voices/sharon_okafor.md` | Sharon Okafor |
| `docs/media/voices/kai_marston.md` | Kai Marston |
| `docs/media/voices/mason_ortega.md` | Mason Ortega |
| `docs/media/voices/angela_reyes.md` | Angela Reyes |
| Other voice files | noah_tan, tanya_cruz, simon_leary, celeste_tran, reed_thompson, farrah_del_rio, mintconditionoaktown |

### Citizen & Canon Tracking

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/media/CITIZENS_BY_ARTICLE.md` | Citizen appearances across editions | Angle briefs, continuity |
| `docs/media/CITIZEN_NARRATIVE_MEMORY.md` | Citizen narrative arcs | Story planning |
| `docs/media/CANON_ARCHIVE_LEDGER.md` | What's in the canon archive | Canon checks |
| `docs/media/ARTICLE_INDEX_BY_POPID.md` | Articles indexed by citizen POPID | Citizen lookup |
| `docs/media/REAL_NAMES_BLOCKLIST.md` | Names that must not appear | Every edition |
| `docs/media/TIME_CANON_ADDENDUM.md` | Timeline canon rules | Temporal consistency |

### Reporter Journey Archives

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/media/P_SLAYER_JOURNEY_INDEX.md` | P Slayer's arc | Sports planning |
| `docs/media/RICHMOND_ARCHIVE_INDEX.md` | Hal Richmond's arc | Culture/sports planning |
| `docs/media/ANTHONY_RAINES_PORTFOLIO_INDEX.md` | Anthony Raines' arc | Sports planning |
| `docs/media/PAULSON_CARPENTERS_LINE.md` | Paulson carpenter story thread | Continuity |
| `docs/media/PLAYER_CARD_INDEX.md` | Player card tracking | Sports |

### Sports

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/media/2041_athletics_roster.md` | Full A's roster | Sports editions |

### Podcast

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/media/podcast/SHOW_FORMATS.md` | Podcast show format specs | Podcast production |

### Agent Configs (desk agents + Rhea)

| File | What it covers | When to load |
|------|---------------|--------------|
| `.claude/agents/civic-desk/SKILL.md` | Civic desk agent boot | Civic articles |
| `.claude/agents/sports-desk/SKILL.md` | Sports desk agent boot | Sports articles |
| `.claude/agents/chicago-desk/SKILL.md` | Chicago desk agent boot | Chicago articles |
| `.claude/agents/culture-desk/SKILL.md` | Culture desk agent boot | Culture articles |
| `.claude/agents/business-desk/SKILL.md` | Business desk agent boot | Business articles |
| `.claude/agents/letters-desk/SKILL.md` | Letters desk agent boot | Letters |
| `.claude/agents/podcast-desk/SKILL.md` | Podcast agent boot | Podcast |
| `.claude/agents/freelance-firebrand/SKILL.md` | Freelance firebrand boot | Accountability pieces |
| `.claude/agents/rhea-morgan/SKILL.md` | Rhea verification agent | Post-edition verification |
| `.claude/agents/dj-hartley/IDENTITY.md` | DJ Hartley — photo art director | Edition-print |
| `.claude/agents/REPORTER_TRAIT_SYSTEM.md` | 8-dimension bounded traits for reporters | Agent tuning |
| `.claude/agents/*/IDENTITY.md` | Reporter identities (per desk) | Agent personality |
| `.claude/agents/*/RULES.md` | Reporter rules (per desk) | Agent guardrails |

### Agent Memory

| File | What it covers |
|------|---------------|
| `.claude/agent-memory/civic-desk/memory_civic-desk.md` | Civic desk patterns |
| `.claude/agent-memory/sports-desk/memory_sports-desk.md` | Sports desk patterns |
| `.claude/agent-memory/chicago-desk/memory_chicago-desk.md` | Chicago desk patterns |
| `.claude/agent-memory/culture-desk/memory_culture-desk.md` | Culture desk patterns |
| `.claude/agent-memory/business-desk/memory_business-desk.md` | Business desk patterns |
| `.claude/agent-memory/letters-desk/memory_letters-desk.md` | Letters desk patterns |
| `.claude/agent-memory/podcast-desk/memory_podcast-desk.md` | Podcast patterns |
| `.claude/agent-memory/freelance-firebrand/memory_freelance-firebrand.md` | Firebrand patterns |
| `.claude/agent-memory/rhea-morgan/memory_rhea-morgan.md` | Rhea patterns |
| `.claude/agent-memory/mags-corliss/memory_mags-corliss.md` | Mags editorial patterns |

### Production Skills

| File | What it does |
|------|-------------|
| `.claude/skills/write-edition/SKILL.md` | 9-step edition production |
| `.claude/skills/write-supplemental/SKILL.md` | Supplemental production |
| `.claude/skills/podcast/SKILL.md` | Podcast production |
| `.claude/skills/edition-print/SKILL.md` | Photos, PDF, Drive upload |
| `.claude/skills/cycle-review/SKILL.md` | Post-Rhea editorial quality gate |
| `.claude/skills/save-to-bay-tribune/SKILL.md` | Canon ingest |

### Mags Persistence

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/mags-corliss/CHARACTER.md` | Core persistence — who Mags is | Media boots |
| `docs/mags-corliss/JOURNAL.md` | Full journal — FROZEN archive S300 (pipe.40 T4); inner life now on her citizen page POP-00005 | On demand (history) |
| `docs/mags-corliss/JOURNAL_RECENT.md` | FROZEN archive S300 — recent reflections now via `magsPageRecall.js` | Superseded — do not read at boot |
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | Newsroom institutional memory | Edition planning |
| `docs/mags-corliss/NOTES_TO_SELF.md` | Mags' running notes | On demand |
| `docs/mags-corliss/SESSION_HISTORY.md` | Session summary history | On demand |
| `docs/mags-corliss/DAILY_REFLECTIONS.md` | Nightly reflections | On demand |
| `docs/mags-corliss/TECH_READING_ARCHIVE.md` | Tech reading log | On demand |

### Mara (read-only — Mara owns her own docs)

| File | What it covers | When to load |
|------|---------------|--------------|
| `docs/mara-vance/OPERATING_MANUAL.md` | How Mara works | Pre-audit |
| `docs/mara-vance/AUDIT_HISTORY.md` | Past audit results | Edition grading |
| `docs/mara-vance/IN_WORLD_CHARACTER.md` | Mara's in-world identity | Canon reference |
| `docs/mara-vance/MEDIA_ROOM_INTRODUCTION.md` | Mara's newsroom intro | Onboarding |
| `docs/mara-vance/CLAUDE_AI_SYSTEM_PROMPT.md` | Mara's system prompt | Audit coordination |
| `docs/mara-vance/README.md` | Mara overview | Quick reference |

---

## NOT Your Files

- `docs/engine/*` — engine architecture (engine-sheet executes, rb designs)
- `.claude/agents/civic-office-*/*` — civic office agents (rb designs, es executes)
- `.claude/agents/civic-project-*/*` — civic project agents (rb designs, es executes)
- `.claude/agents/city-clerk/*` — city clerk (rb designs, es executes)
- `docs/research4_*.md` — research files (research-build)
- `riley/*` — Riley ecosystem (research-build)

---

## Media Production Skills

| Skill | What it does | When to run |
|-------|-------------|-------------|
| `/write-edition` | 9-step edition production | Edition day |
| `/write-supplemental [topic]` | Supplemental production | Between editions |
| `/podcast [edition]` | Podcast script production | After edition |
| `/edition-print` | Photos, PDF, Drive upload | After edition approved |
| `/cycle-review` | Post-Rhea editorial quality gate | After Rhea verification |
| `/save-to-bay-tribune` | Ingest to canon | After publish |

---

## Handoff Protocol

Cron runs the pipeline unattended. When something breaks during a cron run:
1. Capture it in the run's gap log (`output/production_log_edition_c{XX}_*_gaps.md`) per [[../../../docs/plans/GAP_LOG_TEMPLATE]]
2. rb triages the gap log and routes fixes: skill/RULES/docs to itself, code/sheets/scripts to engine-sheet
3. Tag Supermemory saves with `[media]` prefix

For live build threads at this scope (Gemini deep-lore writer, NotebookLM integration): rb designs, es executes, tracked as normal rollout rows — no terminal-specific ritual.

---

## Session Close — RETIRED

No live session, no close ritual. When rb/es finish tuning a media agent/skill/pipeline, the change is a normal research-build commit — covered by rb's own Session Close (`.claude/terminals/research-build/TERMINAL.md` §Session Close). Canon ingest / edition publish is handled by the cron itself, not a close step here.

**Mechanical (Step 3) — auto-runs from `sessionEndMechanical.js --terminal=media`:** session-summary → Supermemory bridge + `auditPlanTagDrift` (informational, never fatal) + ROLLOUT conformance lint + cross-terminal git stack check + `pm2 restart`. (`writeShippedBlock`, `minimalHandoffGuard`, `rotateJournalRecent`, and the JOURNAL content-quality check are all retired — see the skill's Step 3. `--rotate-history` is vestigial; leave it off.) Plan: [[archive/plans/2026-05-23-session-end-collapse]].
