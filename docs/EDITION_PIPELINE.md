# Edition Production Pipeline — 27 Steps

**This is the full sequence from cycle data to published canon.** Each step has a script, a dependency, and a failure mode. Steps marked with a gate require user approval before proceeding.

Skill files define the detailed instructions: `/write-edition` (steps 1-21), `/write-supplemental` (subset).

---

## Pre-Production (Steps 1-7)

| # | Step | Command / Action | Depends On | Failure Mode |
|---|------|-----------------|------------|-------------|
| 1 | Init production log | Write `output/production_log_c{XX}.md` | Cycle data exists | Without this, compaction recovery loses the thread |
| 2 | Initiative packets | `node scripts/buildInitiativePackets.js [cycle]` | Initiative_Tracker sheet data | Missing packets = initiative agents have no data |
| 3 | Voice workspaces | `node scripts/buildVoiceWorkspaces.js [cycle]` | Step 2 + base context | Voice agents can't find their workspace |
| 4 | Voice agents | Launch 7 civic voice agents (Mayor, OPP, CRC, IND, Police Chief, Baylight, DA) | Step 3 | Missing institutional voices in desk briefings |
| 5 | Supplemental triggers | Check if civic/sports events warrant a supplemental | Step 4 output | Missed coverage opportunities |
| 6 | Desk packets | `node scripts/buildDeskPackets.js` | Cycle_Packet on sheet | Agents write from stale or missing data. ~90% of engine output depends on this. |
| 7 | Desk folders | `node scripts/buildDeskFolders.js [cycle]` | Step 6 | Agents can't find briefings, errata, voice statements, archive context |

## Production (Steps 8-13)

| # | Step | Command / Action | Depends On | Failure Mode |
|---|------|-----------------|------------|-------------|
| 8 | 6 desk agents | Launch civic, sports, culture, business, chicago, letters agents | Step 7 (workspaces built) | Agent reads empty workspace, writes generic copy |
| 9 | Compile | Assemble desk output into single edition file | All 6 agents complete | Missing sections, duplicate citizens across desks |
| 10 | Validate | `node scripts/validateEdition.js` | Step 9 | Engine language, phantom reporters, vote errors pass through to publication |
| 11 | Rhea verification | Launch Rhea agent for 5-category scoring | Step 10 (validation clean) | Factual errors, canon violations, voice drift undetected |
| 12 | Mara audit | `node scripts/buildMaraPacket.js [cycle] [file]` → upload to Drive → Mara reviews on claude.ai | Step 11 | Canon errors, citizen attribute violations pass through |
| 13 | **USER APPROVAL GATE** | Mike reviews edition text, Mara's audit, Rhea's score | Step 12 | **Publishing unapproved work is the #1 historical failure mode** |

## Post-Production (Steps 14-21)

| # | Step | Command / Action | Depends On | Failure Mode |
|---|------|-----------------|------------|-------------|
| 14 | Save edition | Write final .txt to `editions/` | Step 13 (approved) | Edition not in canon archive |
| 15 | Photos | `node scripts/generate-edition-photos.js` | Step 14 | No visual content. Uses Together AI (FLUX.1-schnell). Use `--credits-only` for supplementals. |
| 16 | PDF | `node scripts/generate-edition-pdf.js` | Step 15 | No print edition. Check that all articles render (S66 bug: `---` separator dropped an article). |
| 17 | Drive upload | `node scripts/saveToDrive.js --type edition` | Steps 14-16 | Edition not archived off-disk |
| 18 | Edition brief | Update `output/latest_edition_brief.md` | Step 14 | Discord bot and agents reference stale brief |
| 19 | Discord refresh | Restart bot to pick up new brief | Step 18 | Bot discusses old edition |
| 20 | Supermemory ingest | `node scripts/ingestEdition.js [file]` | Step 14 | Edition not searchable in future sessions |
| 21 | Newsroom memory | Update `NEWSROOM_MEMORY.md` with errata, character threads, editorial notes | Step 13 (Mara + Rhea results) | Institutional memory gaps, repeated errors |

## Post-Edition (Steps 22-27)

| # | Step | Command / Action | Depends On | Failure Mode |
|---|------|-----------------|------------|-------------|
| 22 | Post-run filing | `node scripts/postRunFiling.js [cycle] --upload` | Steps 14-17 | Missing files, wrong names, Drive gaps. **Also auto-rebuilds article-index.json.** |
| 23 | Edition intake | `node scripts/editionIntake.js [file] [cycle]` | Step 14 | **FIXED S106** — v2.1. Citizens → Citizen_Usage_Intake, businesses → Storyline_Intake, storylines → Storyline_Tracker. |
| 24 | Citizen enrichment | `node scripts/enrichCitizenProfiles.js --edition [cycle]` | Step 23 | Edition quotes don't flow back to LifeHistory |
| 25 | Grade edition | `node scripts/gradeEdition.js [cycle]` | Step 14 + errata.jsonl | No performance data for agents |
| 26 | Grade history | `node scripts/gradeHistory.js` | Step 25 | Rolling averages not updated, roster recommendations stale |
| 27 | Extract exemplars | `node scripts/extractExemplars.js [cycle]` | Step 25 | A-grade articles not available as desk workspace examples |

---

## Known Broken Steps

| Step | Issue | Impact | Tracked In |
|------|-------|--------|-----------|
| ~~23 — Edition intake~~ | **FIXED S106.** v2.1 remapped to actual tabs. Citizens → `Citizen_Usage_Intake`, businesses → `Storyline_Intake`, storylines → `Storyline_Tracker`. | — | — |
| **24 — Enrichment** | Depends on step 23 landing data. With intake broken, enrichment has nothing to process. | Edition quotes and appearances don't flow back to citizen LifeHistory. | Blocked by step 23 fix |
| **25 — Grading** | `gradeEdition.js` doesn't support supplemental section headers. Desk/reporter mapping wrong for supplementals. | Supplemental grades incomplete (found 2 of 4 articles in S101). | ROLLOUT_PLAN open item |

---

## Supplemental Pipeline (Subset)

Supplementals skip steps 2-7 (no initiative/voice/desk packet pipeline — they're cycle-independent) and steps 23-27 (no intake/grading for supplementals yet). The core flow is:

1. Topic brief → 2. Reporter assignment → 3. Write (skill agent or manual) → 4. Compile → 5. Validate → 6. Rhea (optional) → 7. Mara audit (optional for civic/investigative) → **8. USER APPROVAL** → 9. Save → 10. Photos (`--credits-only`) → 11. PDF → 12. Drive → 13. Edition brief update → 14. Discord refresh

---

## Production Log

During active production, write `output/production_log_c{XX}.md` at every pipeline step. After compaction, read this FIRST — it tells you exactly where you are in the pipeline, what decisions you made, and what's next. This is the primary compaction recovery file during edition production.
