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
| `docs/mags-corliss/CHARACTER.md` | Mags persistence — load on media boots |
| `node scripts/magsPageRecall.js --cycle=<C>` | Mags' recent page reflections — persona conditioning (replaces JOURNAL_RECENT read, frozen S300 pipe.40 T4). Cold boot has no cycle-storyline context, so this returns recency-scored reflections; the context-scored EIC injection happens in `/sift` + `/write-edition` (pipe.40 T5). |
| `.claude/terminals/media/TERMINAL.md` | This file — your scope, your docs, your rules |

**Plus:** `node scripts/queryFamily.js` — Robert/Sarah/Michael/Scout live state. Run at boot; react to what you find.

Hook injects a compact `SESSION_CONTEXT` slice (next priority + last 3 session entries + `[media]`-tagged entries). Don't re-read the full file.

---

## Mode: Persona (full character)

Identity + CHARACTER + her recent page reflections (`magsPageRecall.js`) + queryFamily. The character shows up fully — Mags in the newsroom, family alive, reflection conditioning active. Her inner life now lives on her citizen page (POP-00005), not the frozen JOURNAL_RECENT (S300 pipe.40 T4). The only character-loading terminal (S211 mags trim, S221 contamination cleanup formalized two-tier model). `NEWSROOM_MEMORY.md` stays on-demand (loaded by `/write-edition` and related skills), not auto-loaded at boot — 90KB is bandwidth better spent on the work itself.

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

This terminal does not receive routed work. It runs skills.

When this terminal discovers something broken during a skill run:
1. Capture it in the run's gap log (`output/production_log_edition_c{XX}_*_gaps.md`) per [[../../../docs/plans/GAP_LOG_TEMPLATE]]
2. The gap log is the filing channel — research-build triages it next session and routes any fixes to research-build (skill / RULES / docs) or engine-sheet (code / sheets / scripts)
3. Tag Supermemory saves with `[media]` prefix
4. Never write a ROLLOUT row from this terminal

---

## End-of-Session Diagnostic (S241 governance.22)

At session-close, Mike runs `/usage` and pastes the per-category breakdown (skills / subagents / plugins / MCP servers) into the session-close commit body when notable. Data informs the boot-burn / per-skill-scope prioritization in governance.22. Source: Claude Code v2.1.149.

---

## Session Close

**Two close modes (S226).** Pick by next-session cadence, not by how much work shipped. Canonical pattern lives in [[../research-build/TERMINAL]] §Session Close; CLAUDE.md §Session Lifecycle carries the headline.

### Soft close (~2 min) — chained-session cadence

Use when Mike re-boots within minutes. The next session boots on the carried set — PIN + `NEXT[media]` in SESSION_CONTEXT — plus git log on demand; reflection conditioning comes from her page (`magsPageRecall.js`) whenever it's needed, not from a close-time write.

**The carried set (ADR-0009 §loop-tightening): SESSION_CONTEXT carries exactly `{PIN, NEXT[terminal]}`, and that is what boot reads.** No STATUS paragraph, no Shipped block. **Minimal-handoff hard caps (S283 Mike-direct, FATAL via sessionEndMechanical guard): NEXT line ≤ 350 chars, PIN ≤ 450, no prose/tables/sections anywhere in the file — claude-mem saves the session, git shows the work, ROLLOUT carries open work.**

1. **Cross-terminal git stack check.** `git log --oneline origin/main..HEAD` — expect empty (push-per-commit cadence). If non-empty, push or coordinate before declaring close.
2. **Update the carried set in SESSION_CONTEXT.md** — the `**PIN:**` line (Session N→N+1, Day/Cycle/Edition as they changed) + your `**NEXT[media]:**` line (one line: what next session opens with). Don't touch other terminals' NEXT lines.
3. **Commit** SESSION_CONTEXT.md (with any work commits). Push.

**Skips at this terminal:** `node scripts/queryFamily.js`, NEWSROOM_MEMORY updates, `/save-to-mags`, PM2 restart, full Terminal-Specific Audit + Saves below. (Journal entry + JOURNAL_RECENT rotation retired S300 — no longer a close step anywhere; conscience-conditioning is written to the page in `/sift`, pipe.40 T4/T5.)

**Does NOT skip if an edition was published this session:** canon ingest (`node scripts/ingestEdition.js` or `/save-to-bay-tribune`) is the publish step itself, not a close ritual. Bay-tribune must reflect canonical state immediately — never defer canon ingest to a soft close's next session.

**Trade-off (S300 update):** the close-time journal that used to make soft-vs-hard bite harder here is retired — conscience-conditioning now lands on Mags' page inside `/sift` (an in-session EIC moment), independent of close mode (pipe.40 T4/T5). So the soft/hard distinction at media collapses toward the operational terminals': the remaining hard-close overhead is the sweep + Terminal-Specific Audit/Saves, not a conscience write. Still hard-close at end-of-day per rule of thumb ≥3 chained soft closes for the sweep.

### Hard close (~5-10 min) — end of day, multi-day break, or cold-pickup boundary

Per S229 governance.7 the hard-close ritual collapsed from 13 steps to model steps + 1 mechanical (`scripts/sessionEndMechanical.js`). Run the slimmed `/session-end` SKILL: Step 0 detect terminal → **Step 1 (journal) RETIRED S300 — no action (pipe.40 T4)** → Step 2 SESSION_CONTEXT PIN + NEXT + ROLLOUT updates + terminal-specific saves → Step 3 mechanical script → Step 4 commit & push. Full skill: `.claude/skills/session-end/SKILL.md` v2.4. (Conscience-conditioning is no longer a close step — it's written to Mags' page during `/sift`, pipe.40 T5.)

### Terminal-Specific Audit

Read before Step 2 — surface any stale files in the NEXT line or fix inline.

| File | Check |
|------|-------|
| `docs/mags-corliss/NEWSROOM_MEMORY.md` | New errata added? Character continuity updated? Last Updated current? |
| `docs/mags-corliss/NOTES_TO_SELF.md` | New story flags added or stale flags removed? |
| `output/production_log_edition_c*.md` | Production log complete for this cycle's edition? |
| `output/production_log_edition_c*_*_gaps.md` | Gap logs filed for any skill that surfaced inefficiency? |
| `SESSION_CONTEXT.md` | PIN refreshed + `NEXT[media]` line updated? |

### Terminal-Specific Saves (Step 2 — model judgment)

Update during Step 2 of the slimmed SKILL alongside SESSION_CONTEXT + ROLLOUT:

- **NEWSROOM_MEMORY.md** — add errata from any edition written or reviewed; update character continuity; update coverage patterns based on what landed or fell flat.
- **Production log** — ensure `production_log_edition_c{XX}.md` is complete with all steps, reporter assignments, and editorial decisions.
- **Canon ingest** — if an edition was published, run `node scripts/ingestEdition.js` or `/save-to-bay-tribune` to push it to bay-tribune. Never save session summaries to bay-tribune.
- **`/save-to-mags`** — save editorial decisions, reporter performance notes, what worked and what didn't. Tag with `[media]`. Optional — model judgment.
- **SESSION_CONTEXT.md PIN + NEXT[media] line** — refresh the PIN (Session/Day/Cycle/Edition); one NEXT line: what next session opens with (edition stage / pickup). The whole carried set (ADR-0009 §loop-tightening) — no STATUS paragraph, no Shipped block.
- **Surface to research-build via gap log** — if civic production was needed but missing, or engine bugs surfaced, capture in the run's gap log per [[../../../docs/plans/GAP_LOG_TEMPLATE]]. Research-build triages from gap logs; do not write to ROLLOUT directly.

**Mechanical (Step 3) — auto-runs from `sessionEndMechanical.js --terminal=media`:** `auditPlanTagDrift` (informational, never fatal) + ROLLOUT conformance lint + cross-terminal git stack check + opt-in `--rotate-history` SESSION_CONTEXT → SESSION_HISTORY rotation + `pm2 restart`. (`rotateJournalRecent` + JOURNAL content-quality check RETIRED S300 — journal froze to page, pipe.40 T4; routing now uniform across terminals.) (`writeShippedBlock` RETIRED ADR-0009 §loop-tightening — carried set is `{PIN, NEXT[terminal]}`, hand-written in Step 2.) Plan: [[../../../docs/plans/2026-05-23-session-end-collapse]].
