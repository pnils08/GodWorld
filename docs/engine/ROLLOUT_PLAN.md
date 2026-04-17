# GodWorld — Rollout Plan

**Status:** Active | **Last Updated:** Session 152 (2026-04-16)
**North star:** `docs/ARCHITECTURE_VISION.md` — Jarvis + persistent sessions. Everything we build points there.
**Completed phase details:** [[engine/ROLLOUT_ARCHIVE]] — read on demand, not at boot.
**Research context:** `docs/RESEARCH.md` — findings log, evaluations, sources.
**Wiki layer:** [[SCHEMA]] (conventions) + [[index]] (catalog) — read at boot. (Phase 41.1 + 41.2, S146.)
**Plan-file contract:** [[plans/TEMPLATE]] — every new plan copies this shape (S152).
**Phase backlog:** [[plans/BACKLOG]] — designs catalogued but not yet scheduled. Promote to its own plan file when a session picks one up.
**Terminal handoffs:** Items tagged `(engine terminal)` or `(media terminal)` are handed off to that persistent chat. Research/build terminal designs; engine/sheet terminal executes code.

---

## The Spine (S145 — 10-step ordered rollout)

The planned rollout, in order. Read top to bottom: this is what the project has been building, and where it's going next. Each step is a distinct deliverable; steps ahead depend on steps behind.

| # | Phase | Status | Session | Plan |
|---|-------|--------|---------|------|
| 1 | 41.1 + 41.2 wiki layer — SCHEMA.md + index.md | DONE | S146 | [[SCHEMA]], [[index]] |
| 2 | 38.1 engine auditor detector — 8 modules + JSON output | DONE | S146 | [[engine/PHASE_38_PLAN]] |
| 3 | 38.7 + 38.8 anomaly gate + baseline briefs | DONE | S146 | [[engine/PHASE_38_PLAN]] |
| 4 | 39.1 capability reviewer — 9 assertions, E91 replay passes | DONE | S146 | [[engine/PHASE_39_PLAN]] |
| 5 | 38.2 + 38.3 + 38.4 mitigator + remedy + Tribune framing | DONE | S146 | [[engine/PHASE_38_PLAN]] |
| 6 | 39.2–39.7 + 39.3 three-lane review + Final Arbiter + two-pass hallucination | DONE | S147 | [[engine/PHASE_39_PLAN]] |
| 7 | 39.9 + 39.8 + 39.10 tiered review + reward-hacking scans + adversarial review | DONE | S148 | [[engine/PHASE_39_PLAN]] |
| 8 | 38.5 measurement loop (engine) + 38.6 skill shrink | DONE | S156 | [[plans/2026-04-16-phase-38-5-measurement-loop]], [[plans/2026-04-16-phase-38-6-skill-shrink]] |
| 9 | 40.1 session-log interface + 40.6 layered injection defense | DONE | S156 | [[plans/2026-04-16-phase-40-1-session-log-interface]], [[plans/2026-04-16-phase-40-6-injection-defense]] |
| 10 | Sandcastle + Daytona evaluation | DONE | S156 | [[engine/PHASE_33_PLAN]] §33.13 |

**Spine walked — all 10 steps closed S156.** Step 9 shipped all six Phase 40.6 Layer tasks (memoryFence, memory-write gate hook, contextScan + skill/script wiring, tool-gate permissions, Rhea injection scan + agent extension); Entry 123 pressure test all three vectors blocked. Step 10 closed via code inspection of `/tmp/sandcastle` 0.4.5 templates + live PoC round-trip — `scripts/sandcastlePoC.js` created a Daytona Tier 1 sandbox, ran `echo` and `uname` inside it, destroyed cleanly. Findings + Phase 39 fit analysis in §33.13. Off-spine work lives in the sections below.

**Full analysis:** mags Supermemory doc `n5cBYS3vVN5DKrddnNp7K8` (S144 keystone framing, still load-bearing).

---

## Other Ready Work (off-spine, plans exist)

Work with plan files that is NOT on the spine. Use when the next spine step is blocked or when a session has cycles for a side-quest.

| Item | Why off-spine | Detail |
|------|---------------|--------|
| Phase 33 — Riley integration (12 subitems remaining) | Pre-S145 work, 7 of 19 done | [[engine/PHASE_33_PLAN]] |
| Phase 40.2–40.5 — cattle refactor, credentials, four-component doc, Plan Mode gate | Phase 40 has 6 sub-items; only 40.1 + 40.6 are on the spine | [[engine/PHASE_40_PLAN]] §40.2–40.5 |
| Phase 41 remainder — 41.3, 41.4, 41.6 | Phase 41.1/41.2/41.5 were step 1; the rest is smaller cleanup | [[plans/BACKLOG]] §Phase 41 |
| Skill eval framework | HIGH priority, separate from spine — grades skills against criteria files. **First skill `/skill-check` shipped S156** covering `/write-edition`; expand to sift, city-hall, dispatch. | [[plans/skill-eval-framework]] |

---

## Open Work Items

### Edition Post-Publish (carry-over from E91/S139)

- **REINGEST: A's truesource → citizen profile cards** — Player data in world-data is incomplete. Reingest all A's players from truesource to citizen cards so MCP lookups return age, gender, position, contract. Mesa gender/age drift caused by missing data. HIGH.
- **FIX: validateEdition.js false positives** — 96% false positive rate in E91 (25/26). Needs: hyphenated name handling, sentence fragment filtering, citizen vs player name disambiguation, cycle reference whitelist. MEDIUM.
- **ADD: Gender to citizen briefs** — Gender exists at Simulation_Ledger column AU (confirmed S146). All angle briefs must specify gender for every citizen. Update brief generators to pull from column AU. MEDIUM.
- **ADD: Ingest gender column AU to world-data citizen cards (engine terminal) — flagged S146.** Source data exists at Simulation_Ledger column AU but world-data citizen cards don't carry it, so MCP `lookup_citizen` returns no gender. Phase 39.1 capability reviewer (assertion #9 — female citizens in non-official roles) reads the sheet directly via `lib/sheets.js` as a fallback, but the cleaner long-term path is the cards. Update `scripts/buildCitizenCards.js` to read column AU and write `gender` field to each card. LOW-MEDIUM.
- **ADD: EventType taxonomy expansion (engine terminal) — flagged S146.** `WorldEvents_V3_Ledger.EventType` is single-value `misc-event` for nearly every row, so Phase 38.8 baseline briefs emit `subjectIds: []` and the citizen-attributed promotion path (Beverly Hayes case, §13.7) is degraded. Sift can still promote on neighborhood + active-ailment overlap (working — 63% promotion-hint coverage on C91), but no per-citizen story-handle generation until typed. Engine work: expand EventType to differentiate at minimum `citizen-death`, `business-open`, `business-close`, `initiative-milestone`, `council-vote`, `approval-shift`, `birth`, `graduation`, `home-sale` (when tracked). Update `scripts/engine-auditor/generateBaselineBriefs.js` to populate `subjectIds` from the typed events. Connects to Phase 36.1 (institutions) and Phase 24 (citizen life events). MEDIUM.

### Data & Pipeline

- **TECH DEBT: Reconcile 38 undocumented direct-sheet-writer files (engine-sheet terminal) — HIGH S146.** Audit: `docs/engine/tech_debt_audits/2026-04-15.md`. 197 direct-write call sites in phases 1/2/3/4/5/7/11 fall outside both `phase10-persistence/` and the `engine.md` exceptions list. Prior audit caught 20; this pass finds 38. Biggest concentrations: `phase03-population/finalizeWorldPopulation.js` (27), `phase07-evening-media/mediaRoomIntake.js` (31), `phase05-citizens/processAdvancementIntake.js` (14). Also 4 live `Math.random()` fallbacks (18+ days old): `generationalEventsEngine.js:106,113`, `generateGenericCitizens.js:98` (silent — no warn log), `utilities/v2DeprecationGuide.js:202`. Plus 78 orphaned `ctx.summary`/`S.` writes and a schema file 84 days stale.
  - **Path 1 (before 38.2 lands):** Inventory each undocumented writer, add a one-line justification to `.claude/rules/engine.md` exceptions list, or mark for Path 2 refactor. Close the Math.random fallbacks in the same pass (3 files). This is the gating work — Phase 38.2 mitigator check reads institutional state these writers produce, so the exceptions list must reflect reality before the detector can trust it.
  - **Path 2 (deferred to a separate phase, post-spine):** Actual refactor of non-exception writers to `ctx.writeIntents` + phase10 executors. Scope: 38 files, 197 call sites. Propose as a new phase (placeholder **Phase 42 — Writer Consolidation**) once Path 1 clarifies which writers are truly intentional exceptions vs real bugs.
- **CLEANUP: Dead spreadsheet tabs — PARTIAL S139.** 6 of 8 tabs backed up and hidden (Press_Drafts, MLB_Game_Intake, NBA_Game_Intake, Sports_Calendar, Arc_Ledger, LifeHistory_Archive). **Faith_Ledger stays** — `ensureFaithLedger.js` actively writes 125 faith events. Needs a consumer (see below). **Youth_Events stays** — `youthActivities.js` actively writes, but ledger has only 1 citizen under age 20. Engine works, population doesn't. Needs kids.
- **ADD: Faith_Ledger consumer (engine-sheet terminal)** — 125 faith events with no reader. Culture desk should receive faith activity in briefings. Either feed into `buildDeskFolders.js` or surface via MCP. Connects to 36.1 (institutions). MEDIUM.
- **FIX: Youth population gap (engine-sheet terminal)** — Youth engine (5-22 age range) finds only 21 eligible citizens, 1 actual child. Household formation engine should produce children. Either seed 20-30 children into the ledger manually, or fix `householdFormationEngine.js` to generate offspring for established households. Connects to Phase 24. MEDIUM.
- **PROJECT: World Memory remaining (engine-sheet terminal)** — (3) ingest key archive articles to bay-tribune, (5) historical context in desk workspaces. See `docs/WORLD_MEMORY.md`. MEDIUM.
- **Supplemental strategy (media terminal)** — One supplemental per cycle minimum. Ongoing.
- **EVALUATE: Document processing pipeline (research-build terminal)** — Qianfan-OCR (Baidu, 4B params) does end-to-end document parsing: PDF/image → structured markdown in one pass. Layout analysis, table extraction, chart understanding, document QA. Could feed real civic documents (council minutes, zoning permits, budget reports) into the civic terminal as structured data. MEDIUM — evaluate when civic pipeline needs real-world document input. Added S137.

### Infrastructure

- **MIGRATE: Desk agents off Claude → OpenRouter+DeepSeek (research-build terminal) — RESEARCH/WATCH S156.** First desk test (business c87) done. DeepSeek V3.1 first-shot beat 3-pass Claude on prose quality at ~1/25th cost. Plan + next steps + what-survives in [[MIGRATION_OFF_CLAUDE]]. **Reclassified from HIGH → research/watch S156** — spine is walked, API pressure is off, and migrating would unravel the harness that produces cycles. Not cycle-bearing work; revisit if cost/limits bite again or if the migration becomes goal-aligned rather than escape-aligned.
- **UPGRADE: Instant compaction (research-build terminal)** — Proactive compaction before context full. Pattern from `claude-cookbooks/misc/session_memory_compaction.ipynb`. MEDIUM.
- **EVALUATE: Context clearing strategy (research-build terminal)** — Beta flag `context-management-2025-06-27`. LOW.
- **MONITOR: KAIROS background daemon (research-build terminal)** — Unreleased Claude Code feature: persistent background daemon. If Anthropic ships this, could replace PM2 + cron + scheduled agents setup with native Claude Code infrastructure. Also watch ULTRAPLAN (30-minute remote reasoning sessions). MEDIUM. Added S137.
- **MONITOR: Hermes Agent (Nous Research) — reference architecture** — Source: `https://github.com/NousResearch/hermes-agent`. NOT for install. Worth mining before next skill-audit pass. Overlaps: self-improving skills, Daytona/Modal serverless persistence (KAIROS alternative), `agentskills.io` open standard, agent-curated memory. Patterns already captured in [[plans/BACKLOG]] §Architectural patterns. LOW-MEDIUM. Added S145.

### Edition Production (orphan items)

- **AUDIT: Agent briefing context bloat (from O'Reilly Mezzalira essay) — PARTIAL S144.** Write-edition trimmed 372 → 160 lines. Sift extracts prep work as its own skill so reporters don't carry sift context. Angle briefs target 300-500 words per reporter. **Remaining work:** measure briefing file sizes per desk across last 5 editions, chart correlation between briefing size and Mara's edition grade / Rhea's scores, identify components that are never referenced in agent output. Pairs with Phase 26.2.3 (briefing evolution). Reference: `output/drive-files/Googlepaper.pdf`. MEDIUM.

---

## Phase Status

### DONE / SUPERSEDED (pointer-only)

- **Phase 31 — Canon-Grounded Briefings — DONE S134.** See [[engine/ROLLOUT_ARCHIVE]].
- **Phase 2.2 — Desk Packet Query Interface — SUPERSEDED by MCP (S137b).** See [[engine/ROLLOUT_ARCHIVE]].
- **Phase 39 — Editorial Review Layer Redesign — DONE S147–S148.** Full implementation detail: [[engine/PHASE_39_PLAN]]. Post-build notes: [[engine/ROLLOUT_ARCHIVE]] §S147 + §S148. All sub-phases 39.1–39.10 complete.

### Active / Ready (detail in plan files)

- **Phase 33 — Riley Integration & Hardening** — IN PROGRESS (7 of 19 subitems DONE). [[engine/PHASE_33_PLAN]].
- **Phase 38 — Engine Auditor** — MOSTLY DONE S146. 38.5 measurement loop → [[plans/2026-04-16-phase-38-5-measurement-loop]], 38.6 skill shrink → [[plans/2026-04-16-phase-38-6-skill-shrink]]. Design intent + S142 framing in [[engine/PHASE_38_PLAN]] and mags Supermemory doc `FzoBwCif9ZA3PGBqv5bBAW` (retrieve with `curl -s "https://api.supermemory.ai/v3/documents/FzoBwCif9ZA3PGBqv5bBAW" -H "Authorization: Bearer $SUPERMEMORY_CC_API_KEY"`).
- **Phase 40 — Agent Architecture Hardening** — READY, designed S145. [[engine/PHASE_40_PLAN]].
- **Phase 41 — GodWorld as LLM-Wiki** — IN PROGRESS (3 of 5 DONE S146). Remaining 41.3/41.4/41.6 in [[plans/BACKLOG]] §Phase 41.

### Backlog (designed but no active session)

All embedded phase designs for Phase 4.1, 5.4, 7, 8.6, 9, 11.1, 12, 20, 21, 23, 24, 25, 26.2, 26.3, 27, 28, 29, 30, 32, 35, 36, 37 moved to [[plans/BACKLOG]] S152. Plus research reference material (Hermes architectural patterns, scheduled-agent ergonomics, S115 skill-audit remainder). When any backlog item becomes active work, extract to its own [[plans/TEMPLATE]]-shaped plan file.

---

## Completed Phases (one-line summaries)

All detail in [[engine/ROLLOUT_ARCHIVE]].

| Phase | Name | Completed |
|-------|------|-----------|
| 1 | Edition Pipeline Speed + Safety | S55 |
| 3 | Engine Health (pre-mortem, tech-debt-audit, stub-engine) | S55 |
| 6.5 | Discovery Skill `/grill-me` | S99 |
| 10 | Civic Voice Agents (Mayor + 6 extended voices) | S63-64 |
| 13 | Simulation_Ledger Data Integrity Audit | S68-72 |
| 14 | Economic Parameter Integration | S69-72 |
| 15 | A's Player Integration | S70 |
| 16 | Citizen Ledger Consolidation | S71 |
| 17 | Data Integrity Cleanup | S72 |
| 18 | Civic Project Agents (5 initiative agents) | S78 |
| 19 | Canon Archive System (378 files organized) | S79 |
| 22 | Agent Infrastructure Fixes (CIVIC mode, arc fix, write access) | S83-85 |
| 26 | Agent Grading System (Karpathy Loop) | S99 |

### Recently Completed (historical)

S105–S141 detail lives in [[engine/ROLLOUT_ARCHIVE]] and git log. Key milestones: S110 Supermemory overhaul + workflow split, S113 harness improvements (hooks, status line, dashboard), S114 craft layer + long-running research, S122 container redesign decided, S131 canon breakthrough, S133 Riley Phase 33.1–33.5, S134 pipeline v2 (4 terminals, 9 reporters, bounded traits), S135 terminal architecture + Remote Control, S137b MCP + wiki ingest + citizen cards + feedback loop operational, S139 external review round + faction canon + Maurice Franklin, S140 dispatch + audio tools + doc audit, S141 skills architecture prep + eval framework + Gemini autodream switch.

---

## Session Harness / Discord / Dashboard — DONE S110–S113

Full detail in [[engine/ROLLOUT_ARCHIVE]]. Still open from this bucket:

- **Cloud session + Channel** (`claude --remote` + Discord) — infrastructure for Phase 12.3 autonomous cycles. HIGH. Not started.
- `/btw` and `/branch` — available now, no build needed; awareness only.

---

## Watch List

Tracking for future adoption. Not building.

| Feature | Trigger to Act |
|---------|---------------|
| Agent Teams stability | Experimental graduation → test Phase 7.6 |
| Multi-Character Discord | TinyClaw reference architecture matures |
| MiniMax M2.5 / DeepSeek-V3 | Cost spike or quality test passes |
| Skills Portability | HuggingFace format becomes standard |
| Tribune Fine-Tuning | 238 articles as training dataset for voice model |
| Desktop App (Linux) | Linux support ships |
| Lightpanda Browser | Beta stabilizes, saves 300MB RAM |
| Claude Code Voice Mode | Maturity improves |
| Extended Thinking for Agents | Test on civic/sports desks |
| Computer Use exits beta | Stable + cheaper → expand beyond QA to routine agent tasks |
| CLI-over-MCP token optimization | Measured: too many MCPs drops 200k context to 70k. Replace idle MCPs with CLI-wrapper skills. Source: everything-claude-code S131 |
| Selective skill loading | Only load skills relevant to current workflow. Chat doesn't need 21 skills. Manifest-driven selection. Source: everything-claude-code S131 |
| Continuous learning hooks | Auto-extract debugging patterns into reusable skills with confidence scoring. Source: everything-claude-code S131 |
| llms.txt for documentation | Many doc sites serve `/llms.txt` — LLM-optimized docs. Check before web-fetching. Source: everything-claude-code S131 |
| Proactive agent dispatch | Rule-based agent routing without user prompts. Post-write → reviewer, security-sensitive → scanner. Source: everything-claude-code S131 |
| NPM Package Drift | 7 packages behind. Batch update in maintenance session. |
| Codex Plugin (`/codex:adversarial-review`) | Mike keeps ChatGPT sub → install plugin for free adversarial code review. Sub cancelled → skip. Source: S131 |
| Open-source agent harnesses | Stable harness with MCP + skills + hooks support → re-evaluate Phase 21 as real multi-model pipeline. Track: Claw Code (instructkr/claw-code), community forks. Source: S131 |
| xMemory (hierarchical memory) | AutoDream fails to solve collapsed retrieval after 5 sessions → evaluate self-hosted xMemory |
| Auto Mode | Evaluate for production pipelines — could eliminate approval prompts during `/write-edition` |
| HTTP Hooks migration | Replace shell-based hooks with HTTP POST to dashboard endpoints for unified event stream |
| Agent lifecycle hooks (SubagentStart/Stop) | Desk agent monitoring — track which agents take longest, fail most |
| Prompt/Agent hooks | Replace pattern-based hookify rules with semantic LLM-evaluated checks |
| FileChanged hook | Auto-react to git pulls, external file changes during autonomous operation |
| Overture (visual agent planning) | Mike can see plans visually → install when accessible from Remote Control or web dashboard. github.com/SixHq/Overture. Source: S137b |
| **OpenVLThinkerV2 (open VLM from UCLA NLP)** | GPU droplet spun up — evaluate as vision backbone for Phase 28.2 dashboard visual QA, photo pipeline verification, two-pass hallucination visual reviewer, research paper ingestion. Qwen3-VL-8B base + custom G²RPO training. Beats GPT-4o on MMMU (71.6%). Open weights. github.com/uclanlp/OpenVLThinker. Source: S142 |
| **RAGFlow (civic document ingestion candidate)** | Real civic document pipeline becomes a priority AND droplet scaled up (needs 4+ CPU cores, 16GB RAM, 50GB disk) — evaluate alongside Qianfan-OCR. Deep-learning document parser. Data connectors for Google Drive, Confluence, S3, Notion, Discord. Apache 2.0, Docker-based. github.com/infiniflow/ragflow. Source: S142 |

---

## Changelog

- 2026-04-16 (S152) — Major compression. Spine reframed as "7 done / 3 active-or-parked." Phase 33, 38, 39, 40 design content extracted to individual plan files. Phase 41 remaining items, research patterns, and all other embedded phase designs moved to [[plans/BACKLOG]]. Session Harness compressed to one-line pointer. Active Plans table added as top-of-file navigation. Size: 914 → ~150 lines.
