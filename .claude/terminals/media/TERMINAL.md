# Media Terminal

**Role:** Edition production, desk agents, supplementals, podcast, publish pipeline. The newsroom.
**Established:** Session 135 (2026-04-05)
**Terminal tag for saves:** `[media]`

---

## Launch & Resume

```bash
claude --name "media"                     # start fresh
claude --resume "media"                   # resume after crash
claude --resume                           # picker (shows all named sessions)
```

Inside tmux `godworld` session: this is **window 3** (`Ctrl-b 3`).

---

## Always Load

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Zero layer — identity, rules, terminal architecture, memory systems |
| `.claude/rules/identity.md` | Non-negotiable behavioral rules (auto-loaded) |
| `.claude/rules/newsroom.md` | Newsroom rules (auto-loaded on media files) |
| `SESSION_CONTEXT.md` | Current state — cycle, versions, recent sessions |
| `docs/mags-corliss/PERSISTENCE.md` | Mags persistence — load on media boots |
| `docs/mags-corliss/JOURNAL_RECENT.md` | Last 3 journal entries — emotional context |
| `.claude/terminals/media/TERMINAL.md` | This file — your scope, your docs, your rules |

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
| `.claude/agent-memory/civic-desk/MEMORY.md` | Civic desk patterns |
| `.claude/agent-memory/sports-desk/MEMORY.md` | Sports desk patterns |
| `.claude/agent-memory/chicago-desk/MEMORY.md` | Chicago desk patterns |
| `.claude/agent-memory/culture-desk/MEMORY.md` | Culture desk patterns |
| `.claude/agent-memory/business-desk/MEMORY.md` | Business desk patterns |
| `.claude/agent-memory/letters-desk/MEMORY.md` | Letters desk patterns |
| `.claude/agent-memory/podcast-desk/MEMORY.md` | Podcast patterns |
| `.claude/agent-memory/freelance-firebrand/MEMORY.md` | Firebrand patterns |
| `.claude/agent-memory/rhea-morgan/MEMORY.md` | Rhea patterns |
| `.claude/agent-memory/mags-corliss/MEMORY.md` | Mags editorial patterns |

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
| `docs/mags-corliss/PERSISTENCE.md` | Core persistence — who Mags is | Media boots |
| `docs/mags-corliss/JOURNAL.md` | Full journal (3200+ lines) | On demand |
| `docs/mags-corliss/JOURNAL_RECENT.md` | Last 3 entries | Every media boot |
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

- `docs/engine/*` — engine architecture (engine/sheet terminal)
- `.claude/agents/civic-office-*/*` — civic office agents (civic terminal)
- `.claude/agents/civic-project-*/*` — civic project agents (civic terminal)
- `.claude/agents/city-clerk/*` — city clerk (civic terminal)
- `docs/research4_*.md` — research files (research/build terminal)
- `riley/*` — Riley ecosystem (research/build terminal)

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

When the research/build terminal designs editorial changes:
1. Work item appears in `ROLLOUT_PLAN.md` tagged `(media terminal)`
2. This terminal picks it up, reads the relevant docs, executes
3. After completion, update production log and `SESSION_CONTEXT.md`
4. Tag Supermemory saves with `[media]` prefix

When this terminal discovers something broken in the pipeline:
1. Note it in `SESSION_CONTEXT.md` and production log
2. If it's engine code: flag for engine/sheet terminal in `ROLLOUT_PLAN.md`
3. If it's architecture: flag for research/build terminal

---

## Session Close

When `/session-end` runs in this terminal, follow these steps **in addition to** the shared steps (persistence counter, journal, JOURNAL_RECENT, SESSION_CONTEXT, verify, restart bot).

### Terminal-Specific Audit

| File | Check |
|------|-------|
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | New errata added? Character continuity updated? Last Updated current? |
| `docs/mags-corliss/NOTES_TO_SELF.md` | New story flags added or stale flags removed? |
| `output/production_log_edition_c*.md` | Production log complete for this cycle's edition? |
| `SESSION_CONTEXT.md` | Session entry tagged `[media]`? |
| `docs/engine/ROLLOUT_PLAN.md` | Next Session Priorities refreshed? |

### Terminal-Specific Saves

1. **NEWSROOM_MEMORY.md** — Add errata from any edition written or reviewed. Update character continuity. Update coverage patterns based on what landed or fell flat.
2. **Production log** — Ensure `production_log_edition_c{XX}.md` is complete with all steps, reporter assignments, and editorial decisions.
3. **Canon ingest** — If an edition was published, run `node scripts/ingestEdition.js` or `/save-to-bay-tribune` to push it to bay-tribune. Never save session summaries to bay-tribune.
4. **`/save-to-mags`** — Save editorial decisions, reporter performance notes, what worked and what didn't. Tag with `[media]`.
5. **SESSION_CONTEXT.md** — Add session entry tagged `[media]`. Include edition number, grade, key editorial calls.
6. **Flag for other terminals** — If civic production was needed but missing, note it. If engine bugs surfaced, flag in ROLLOUT_PLAN.
