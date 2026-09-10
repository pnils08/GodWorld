---
title: Hidden Tab Audit & Disposition Plan
created: 2026-09-09
updated: 2026-09-09
type: plan
tags: [infrastructure, sheets, audit, parked]
sources:
  - docs/SPREADSHEET.md §Hidden Tabs (S139, stale — lists 6 of the live 16)
  - docs/plans/2026-07-31-engine-observability-integrity.md (infrastructure.6 ghost-tab sweep)
  - Live sheet metadata read 2026-09-09 (82 tabs, 16 hidden)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — infrastructure.8"
  - "[[SPREADSHEET]] — tab inventory this plan corrects"
  - "[[SCHEMA]] — doc conventions"
---

# Hidden Tab Audit & Disposition Plan

**Goal:** Every hidden tab on the GodWorld sheet carries a verified live-code classification, and the ones nothing uses are disposed of deliberately (backup → delete), not by accumulation.

**Architecture:** A one-time audit (DONE — classification below, evidence file:line verified 2026-09-09 against live code, crontab, and dashboard routes), then per-class dispositions: doc corrections for the live-but-misdocumented tabs, and a backup-then-delete pass for the dead ones. Deletion is a live-sheet write and runs only on builder approval per tab batch.

**Terminal:** engine-sheet (live-sheet writes); audit already executed by kimi.

**Priority:** PARKED (builder 2026-09-09 — "not a priority job"). No cycle blocks on this.

**Acceptance criteria:**
1. `docs/SPREADSHEET.md` §Hidden Tabs lists all 16 live hidden tabs with the classification below (today it lists 6, and one of those — LifeHistory_Archive — is no longer hidden).
2. Each DEAD tab is either deleted (post-CSV backup to `output/dead-tab-backups/`, read-back verified) or carries an explicit builder keep-ruling recorded here.
3. The five documented contradictions between SPREADSHEET.md and live code (listed in Task 2) are resolved.

---

## Audit result (2026-09-09, kimi — verified against code, `crontab -l`, dashboard routes)

Live hidden tabs: 16 of 82 total. (`LifeHistory_Archive`, documented hidden at S139, is not hidden today.)

### LIVE — load-bearing, stay hidden and untouched

| Tab | Evidence |
|---|---|
| **Intake** | Engine front door: `processIntake_` reads + clears every cycle (`phase01-config/godWorldEngine2.js:1231`, live at `:369`/`:2114`). Builder also feeds it manually. |
| **Citizen_Media_Usage** | Engine reads/writes every cycle (`phase05-citizens/processAdvancementIntake.js:355,107-113`); weekday desk crons append byline-landed rows (`scripts/cron-desk-run.js:253-273`); Saturday cron writes citations (`scripts/cron-saturday-run.js:334-364`). |
| **Storyline_Tracker** | Docs say "DISCONTINUED 2026-08-05" but the retirement was only partial: chaos arcs still append every cycle (`phase07-evening-media/storylineWeavingEngine.js:195`), `applyStorySeeds_` preloads it for scoring (`:170-172,545-548`), the weaver still updates rows (`:208,307,567`). |

### LIVE-READ — weekly pipeline, frozen data, no code writer

| Tab | Evidence |
|---|---|
| **Chicago_Citizens** | Read by `scripts/buildDeskPackets.js:2177` for the weekly Chicago packet. Engine writer disabled S229 (`godWorldEngine2.js:522-527`). Pool frozen ~123 rows. |
| **Chicago_Sports_Feed** | Read by `buildDeskPackets.js:2180` (Bulls roster parser). Writer is Mike, manual. |

### OPERATOR-ONLY — menu items + manual scripts, nothing automatic

| Tab | Evidence |
|---|---|
| **Media_Intake** | `parseMediaRoomMarkdown.js:766-768` (menu "Parse Media Room Markdown"), `mediaRoomIntake.js:222` (menu "Process Media Intake"). |
| **Citizen_Usage_Intake** | Manual `scripts/editionIntake*.js` writes; menu reader `mediaRoomIntake.js:429`. |
| **Storyline_Intake** | Manual `scripts/editionIntake*.js` writes; menu reader `mediaRoomIntake.js:277`. |

### WRITE-DEAD — read by the live cron path, never fed

| Tab | Evidence |
|---|---|
| **Health_Cause_Queue** | Sole writer deleted 2026-09-09 (`1240a80a`). Still dumped by `scripts/dumpBeatTabs.js:53` and read by the health slice (fossils filtered). Scheduled to drop from the beat path after C107 confirms it stays empty (`[[2026-09-09-health-slice-freshness]]` ruling 2). |

### ARCHIVAL-ONLY

| Tab | Evidence |
|---|---|
| **Story_Seed_Deck_v3_legacy** | One-time rename parking spot (`phase10-persistence/saveV3Seeds.js:80-85`, `migrateSeedDeckV4_`). Nothing reads it after the rename. |

### DEAD — nothing live reads or writes; deletion candidates

| Tab | Evidence | Note |
|---|---|---|
| **Chicago_Feed** | Writer `saveV3Chicago_` disabled S229 (both call sites). Only "consumer" is a stale Dashboard-sheet formula rendering `"--"` (`utilities/godWorldDashboard.js:182-189`). | Strongest deletion candidate. Docs (`SPREADSHEET.md:153,219`, `sheetNames.js:70-74`) falsely claim a live engine writer. |
| **Press_Drafts** | Dead since S98. The `riley/*.gs` references are a read-only snapshot (pulled 2026-04-03) of scripts bound to a *different* spreadsheet — not the sim. | Already CSV-backed-up S139. |
| **NBA_Game_Intake** | Only a tombstone comment (`cycleExportAutomation.js:58`). Mike confirmed dead S105. | Backed up S139. |
| **MLB_Game_Intake** | Same. | Backed up S139. |
| **Arc_Ledger** | Superseded by `Event_Arc_Ledger`; only operator one-shot migration scripts reference it. | Backed up S139. (Not to be confused with Event_Arc_Ledger, frozen S313.) |
| **Sports_Calendar** | Killed S64; tombstone comment only. | Backed up S139. |

## Tasks

### Task 1: Doc truth pass — SPREADSHEET.md (kimi-executable, scripts/docs scope)

- Rewrite §Hidden Tabs to the 16-tab classification above; fix the header count (`Hidden (S139): 6` → 16).
- Fix the five verified contradictions: `:153`/`:219` (Chicago_Feed "engine writes every cycle" — false since S229), `:154` (Chicago_Sports_Feed "engine no longer reads" — buildDeskPackets still reads), `:166` (Chicago_Citizens "ENGINE write" — disabled S229), `:133` (Storyline_Tracker "no engine reader" — false), `:136` (Health_Cause_Queue writer "ENGINE" — no engine writer exists).
- Correct the stale `sheetNames.js:70-74` comment claiming Chicago_Feed is written every cycle.

### Task 2: Disposition rulings (builder)

Per-tab keep/delete ruling for the six DEAD tabs. Default recommendation: delete all six; five already have S139 CSV backups, Chicago_Feed needs a fresh backup first (`scripts/backupSpreadsheet.js`, read-back verify). Alternative: leave hidden (zero functional cost — hidden tabs are findable by code and invisible in the UI).

### Task 3: Delete pass (engine-sheet, builder-approved per batch)

- CSV backup → `output/dead-tab-backups/`, read-back, then delete the ruled tabs on the live sheet.
- Remove tombstone comment (`cycleExportAutomation.js:58`) and any constants left dangling (`sheetNames.js` CHICAGO_FEED) after deletion.
- Re-run `scripts/tabReferenceIntegrity.test.js` + regenerate stub maps.

## Changelog

- 2026-09-09 (kimi) — Audit executed (live sheet metadata read: 82 tabs / 16 hidden; per-tab classification verified against code, crontab, dashboard). Plan filed as infrastructure.8, state `parked` (builder: not a priority job).
