---
title: Audit Run Registry
created: 2026-05-06
updated: 2026-05-24
type: reference
tags: [architecture, infrastructure, active]
sources:
  - .claude/skills/disk-audit/SKILL.md
  - .claude/skills/disk-rotate/SKILL.md
  - .claude/skills/md-audit/SKILL.md
  - .claude/skills/doc-audit/SKILL.md
pointers:
  - "[[engine/ROLLOUT_PLAN]] — open work; this file is for *standing* maintenance jobs"
  - "[[index]] — registers each audit skill's plan file"
---

# Audit Run Registry

**The single index of when each maintenance audit was run, what it found, and what (if anything) was acted on.**

Standing maintenance jobs (`/disk-audit`, `/disk-rotate`, `/md-audit`, `/doc-audit`) are NOT rollout items — they're recurring health checks. This registry tracks their cadence + outcomes so any session can answer "when did we last sweep X?" without grepping commit history.

**Update protocol:** every audit-skill run that produces a report (or executes an action) appends a row to the table below. Inline at the end of the skill's last step. Format: one row per run.

---

## Run history

| Date | Skill | Findings (1-line) | Action taken | Commit / artifact |
|---|---|---|---|---|
| 2026-05-06 | `/disk-audit` | 7,195 files / 1.95 GB → 912 orphans / 270 MB; headline: 263 MB stale claude-mem logs | report only | `output/disk_audit_2026-05-06.md` (commit `20790e1`) |
| 2026-05-06 | `/disk-rotate` (manual) | claude-mem logs 5/01–5/03 (247 MB), bun cache (899 MB), claude versions .126+.128 (497 MB) | deleted; uv cache (1.1 GB) deferred — locked by active MCPs | manual S203; ~1.2 GB recovered, disk 84% → 79% |
| 2026-05-07 | `/doc-audit boot` | 14 docs audited (full v2.0 scope, closes S176 partial); 3 stale, 0 inconsistent, 0 dead refs | report only — all 3 stale findings owned by /session-end ritual (PERSISTENCE session counter, SESSION_CONTEXT 821-line bloat, CLAUDE.md population stamp) | S205 session note |
| 2026-05-08 | `/doc-audit engine` | 25 engine + engine-sheet-handoff docs surveyed; 6 stale, 1 inconsistent, 1 dead ref, 10 healthy | fixes applied: 7 (ENGINE_MAP S185→S206 stamp + Phase5-GenericCitizens disable annotations; ROLLOUT_PLAN Last Updated bump; engine.md rule annotations for disabled/deleted exception writers; SHEETS_MANIFEST staleness header; PHASE_42_INVENTORY snapshot-frozen header; ROLLOUT_PLAN_backup_S147 → docs/archive/; tracker row) | S206 commit (this) |
| 2026-05-08 | `/doc-audit media` | 28 media docs re-audited (~26 sessions after S180/S181 baseline); 3 research-build fixes + 4 prior-flagged handoffs still pending media-terminal | fixes applied: 3 (EDITION_PIPELINE.md S206 routing-foundation entry + Four-terminals → Five-terminals correction; AGENT_NEWSROOM.md S156→S206 stamp + content-verified note; output/DISK_MAP.md S180/181→S206 with new S206 artifact families catalogued) | S206 session-end commit |
| 2026-05-09 | `/doc-audit plans` | 31 plan files (10 new since S186 baseline); 7 frontmatter tag drifts (all changelog-says-shipped-but-tag-didn't-follow); 0 inconsistent / 0 dead refs / 24 healthy | fixes applied: 7 frontmatter tag flips (engine-routing-foundation + chaos-cars-engine draft→active; disk-inventory + phase-40-3-credential-audit + md-audit-skill active→complete; vote-trigger-mechanism + run-cycle-gap-log-surface draft→active) + meta-pattern followup filed in ROLLOUT (post-execution gate to catch tag drift between changelog status verbs and frontmatter tags) | S212 plans-audit commit |
| 2026-05-09 | `/doc-audit persona` | 18 docs surveyed; 0 stale in research-build lane; 2 mara-handoff drifts growing (AUDIT_HISTORY now 9 editions un-audited E85-E93, README Week-2/3/4 plans 73 days unlanded); 1 light flag Mike's lane (NOTES_TO_SELF "E92 Forward" anchor stale by 1 edition); 16 healthy | report only — research-build lane clean, mara-handoff drifts already-flagged S187 (staleness count bumped, work remains Mara's claude.ai authority + Mike's paste-in lane); S187 prior fixes (TECH_READING_ARCHIVE backfill, DAILY_REFLECTIONS Superseded banner) verified intact | S212 persona-audit tracker update |
| 2026-05-09 | `/doc-audit boot` | 14 docs surveyed (re-verify after S207 trim + S212 work); 1 actionable (docs/index.md stamp); 2 light flags decision-required (MEMORY.md 26.6KB over 24.4KB CLAUDE.md spec, CLAUDE.md population stamp 26 sessions stale within tolerance); S205 prior findings resolved (SESSION_CONTEXT trim, PERSISTENCE counter); 11 healthy | fixes applied: 1 (docs/index.md updated 2026-04-30→2026-05-09 — content current with all S204+ docs registered) | S212 boot+infra+data audit commit |
| 2026-05-09 | `/doc-audit infra` | 14 docs surveyed (~25 sessions after S187); 4 stale fixes applied + 9 healthy + 1 engine-sheet handoff preserved | fixes applied: 4 (STACK.md "Last updated" S187→S212 stamp + skill count 43→47 + 4-terminal post-S211 note; STACK.md "## Skills (41 total)" → "## Skills (47 total, S212)"; FOUR_COMPONENT_MAP.md `updated:` 2026-04-29→2026-05-09 + skill count 41→47 + path-scoped rules row expanded to civic.md / research-build.md / identity.md) | S212 boot+infra+data audit commit |
| 2026-05-09 | `/doc-audit data` | 6 docs surveyed (~25 sessions after S187); 0 actionable / 1 light within tolerance (SIMULATION_LEDGER ~837 vs live 836) / 5 healthy | report only — engine-sheet-lane LEDGER_HEAT_MAP / LEDGER_REPAIR / LEDGER_AUDIT all current per S206 audit; SCHEMA_HEADERS auto-regenerated 2026-05-08 | S212 boot+infra+data audit commit |
| 2026-05-24 | `/doc-audit engine` | 22 engine + 4 cross-terminal docs surveyed (~28 sessions after S206); my-lane fixes: ENGINE_MAP S207-S233 touches block missing, ENGINE_REPAIR frontmatter 17 sessions stale + Row 8 §3.5 closure not reflected, LEDGER_AUDIT S199 → S234 needed major refresh (S232 canon.3 T9 backfill + new pending-Status + lowercase 'active' drift), LEDGER_HEAT_MAP stamp-pass only (within tolerance); ENGINE_STUB_MAP flagged (S205 regen, file count drift ~6 deletes — not regen'd this pass, needs dedicated `/stub-engine`); SHEETS_MANIFEST accepts staleness per security-key gate; DOCUMENTATION_LEDGER sunset; LEDGER_REPAIR DO-NOT-re-analyze intact; cross-terminal docs (ROLLOUT, PHASE_*_PLAN, REVIEWER_LANE_SCHEMA, INSTITUTIONAL_VOICE_AGENTS, CYCLE_SEPARATION, ENGINE_CONNECTIVITY_ROLLOUT, phase19_agent_personas, PHASE_DATA_AUDIT) — research-build's lane | fixes applied: 4 (ENGINE_MAP S207-S233 touches + S234 stamp; ENGINE_REPAIR frontmatter + 3 new log entries S229/S229/S232 + Row 8 fix-pointer §3.5 closure update; LEDGER_AUDIT new §Current State S234 refresh + tier matrix + 4 drift classes + S94 recovery re-verification; LEDGER_HEAT_MAP S234 stamp-pass with delta note) + 1 follow-up flagged (ENGINE_STUB_MAP regen pending) | S234 audit-pass commit |
| 2026-05-24 | `/doc-audit data` | 6 docs surveyed (~22 sessions after S212); my-lane fixes: SIMULATION_LEDGER row count 836 → 858 + tier breakdown + Status drift + audit-stamp; SPREADSHEET row count + audit-stamp; engine-sheet-lane LEDGER_HEAT_MAP / LEDGER_REPAIR / LEDGER_AUDIT handled in /doc-audit engine same session; SCHEMA_HEADERS auto-regenerated 2026-05-12 (S213) current | fixes applied: 2 (SIMULATION_LEDGER headline rows 837 → 858 / max POPID POP-00951 → POP-00973 / tier breakdown from S234 audit / S187 → S234 stamp; SPREADSHEET S187 → S234 stamp + Simulation_Ledger row count bumped + SCHEMA_HEADERS 2026-04-27 → 2026-05-12 stamp update) | S234 audit-pass commit |
| 2026-05-31 | `/doc-audit plans` | 61 plan files surveyed (S248, ~36 sessions after S212). Built tag-vs-ROLLOUT-vs-archive-vs-index matrix. 11 stale frontmatter tags (active/draft) where ROLLOUT row is closed-and-archived AND plan-body status is DONE/closed/superseded. 1 held deliberately (skill-eval-framework = parent framework, own status "not built/HIGH" — flipping would mislabel aspirational design). 7 complete-tagged false-positives correctly untouched (Spine-table/Changelog refs, not open-work). index.md confirmed to not encode plan-state → no index edits. No body drift / no dead refs. | fixes applied: 11 frontmatter tag flips active/draft→complete (dispatch-gap-followups, c93-gap-triage-execution, run-cycle-gap-log-surface, vote-trigger-mechanism, skill-eval-expansion, civic-tracker-collision-schema, canon-2-faith-scrub, boot-persona-contamination, supermemory-profile-leverage, pipeline-29-research-build, session-end-collapse) | S248 plans doc-audit commit (push held — cross-terminal stack) |
| 2026-05-31 | `/doc-audit media` | ~30 media docs surveyed (S248, ~42 sessions after S206). 1 real drift: `civic-office-okoro` (Deputy Mayor) added since S206 — 26 agent dirs live, docs said 25. Changelog-growth check PASS (story_evaluation/brief_template/citizen_selection carry fresh C95 entries — resolves recurring "post-publish Step 10 not running" flag). Prior-flagged handoffs (2041_athletics_roster, Richmond/Raines/P_Slayer index stamps) unchanged — media-terminal lane. buildVoiceWorkspaces.js "7 civic offices" undercounts okoro — engine-sheet flag. | fixes applied: 1 finding / 2 docs (AGENT_NEWSROOM 25→26 + civic-office 7→8 + okoro named + stamp; EDITION_PIPELINE Layer-2 list + okoro) | S248 media doc-audit commit (push held — cross-terminal stack) |
| 2026-05-30 | `/doc-audit engine` | 7 my-lane engine docs surveyed (S248, same-session as the engine.5 lifecycle/fame design work). Same-session drift caught: ENGINE_REPAIR frontmatter 2026-05-24 stale (Rows 24/25 added + Row 22 corrected this session); ENGINE_MAP touch-log + "Last verified" stamp didn't reflect the S248 generationalEventsEngine v2.7 Track 1 change (deploy-held). Healthy/no-fix: LEDGER_AUDIT + LEDGER_HEAT_MAP + SHEETS_MANIFEST (S248 added 0 ledger rows — Track 1 deploy-held, no cycle ran — still current at S234). Deferred findings (report-only, not engine-sheet-fix-now): ROLLOUT_PLAN "Last Updated S238" stale (shared research-build spine header — engine.29 content correct, stamp bump owed at close); ENGINE_STUB_MAP regen still pending from S234 (S248 added no new functions, didn't worsen). | fixes applied: 2 (ENGINE_REPAIR frontmatter 2026-05-24→2026-05-30 + S248 log entry [Track 1 ship + Rows 24/25 filed + Row 22 reclassification]; ENGINE_MAP "Last verified" S234→S248 + S207→S248 touch-log entry for generationalEventsEngine v2.7 deploy-held) + 2 findings deferred (ROLLOUT stamp = research-build close; STUB_MAP regen = dedicated /stub-engine) | S248 doc-audit commit (push held — cross-terminal stack) |
| 2026-06-01 | `/doc-audit boot` | 14 docs surveyed (S251, ~39 sessions after S212 — oldest group, picked over tied infra/persona for boot-criticality + heaviest churn). Big finding: `BOOT_ARCHITECTURE.md` carried 3 epochs of drift — S221 (PERSISTENCE→CHARACTER rename, unregistered-window fallback line still said "research-build" contradicting the correct Mags-only statement lower in the same doc, Persona Levels table on the dead Light+PERSISTENCE tier) + S248 (Decision 2 still described the pre-ADR-0009 `limit 80`/231-line boot read of SESSION_CONTEXT). `SCHEMA.md` folder map missing `docs/canon/` (S174) + `docs/adr/` (S187). Mike's-lane flag: MEMORY.md 25.4KB over 24.4KB ceiling (~419B) — not touched, identity rule. 8 healthy (SESSION_CONTEXT 169 lines, rules/=6 matches CLAUDE.md, CHARACTER identity-only + family POPIDs, CANON_RULES/INSTITUTIONS current, identity.md, index.md S251 entries registered, POST_MORTEM frozen). | fixes applied: 3 docs + 1 skill (BOOT_ARCHITECTURE.md full drift correction + ADR-0009 sources/pointers + stamp; SCHEMA.md §7 tree + placement rules + changelog for canon/ + adr/; doc-audit/SKILL.md SESSION_CONTEXT criterion → span model so next audit doesn't false-flag) + 1 flag (MEMORY.md over-limit → Mike) | S251 boot doc-audit commit |

---

## Cadence guidance

| Skill | When to run | Trigger heuristic |
|---|---|---|
| `/disk-audit` | On demand | Droplet >85% disk OR after large `output/` accumulation |
| `/disk-rotate` | Per-target on demand | Always after `/disk-audit` flags a recoverable bucket; never schedule |
| `/md-audit` | Monthly-ish | Or after large doc churn (post-archive sweep, post-plan retirement wave) |
| `/doc-audit` | Per-group on demand | Quarterly per group; or after architectural shifts touch a group's surface |

No skill in this registry runs on a schedule. All are manually invoked. Each gets verification gates before destructive action.

---

## Pattern — every audit skill MUST

1. **Produce a dated artifact** — either an MD report (`output/<skill>_<DATE>.md`) or a JSON manifest. Never log results only to stdout.
2. **Append a row to this file** — at the end of the skill's run, before declaring done. Mike-readable summary in 1 line.
3. **Never auto-delete** — destructive actions in `/disk-rotate` etc. require explicit `--apply --target X` per-target invocation.

---

## Changelog

- 2026-05-06 — Initial registry (S203, research-build). Pattern adopted to give standing maintenance jobs a home outside ROLLOUT_PLAN (which is for in-progress / open work). Bootstrapped with the `/disk-audit` first-run record + the manual `/disk-rotate` cleanup of S203.
