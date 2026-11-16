---
title: Pipeline 100 citizen Mags diff review
created: 2026-11-08
updated: 2026-11-08
type: reference
tags: [pipeline, mags, review, active]
sources:
  - output/codex/TASK-2026-11-08-pipeline100-diff-review.md
  - docs/plans/2026-11-03-mags-memory-one-home.md
  - git show abb82f458
pointers:
  - "[[../plans/2026-11-03-mags-memory-one-home]] — rescoped plan and remaining tasks"
  - "[[2026-11-08-codex-pipeline100-plan-review]] — prior plan review"
---

# Pipeline.100 citizen Mags diff review

**Verdict: SHIP for Tasks 1–2 in commit `abb82f458`.** No code-backed finding in this cut. This is a source and local-check verdict; the bot restart, actual prompt read-back, old-store count check, and Saturday narrator work in plan Tasks 3–4 remain unverified here.

## Requested hunts

1. **Removed callers — clear in the runtime paths searched.** Repository search found no remaining `mags.searchSupermemory`, `mags.saveToSupermemory`, `mags.loadNotesToSelf`, or `notesEnabled` caller in `scripts/`, `lib/`, `dashboard/`, tests, `.claude/agents/`, or `ecosystem.config.js`. `lib/mags.js:869` exports none of those symbols. The bot's `searchSupermemory` is its own function and still targets only `world-data` and `bay-tribune` (`scripts/mags-discord-bot.js:321-332`). The live crontab has three `discord-reflection.js` entries and only a disabled comment for the deleted `daily-reflection.js`. CLI Mags still names `NOTES_TO_SELF.md` (`.claude/agents/mags-corliss/SKILL.md:48`), as the rescoped plan explicitly permits; that path is not a citizen bot caller.

2. **Reflection order — preserved for the durable citizen outputs.** Page append is awaited first (`scripts/discord-reflection.js:501-502`); the evening intake row is classified, spooled, appended and read back (`:392-411`; `lib/wakePerception.js:1250-1271,1311-1337`); Moltbook is marked consumed afterward (`scripts/discord-reflection.js:506-513`). In the parent commit, `saveToClaudeMem` resolved on both non-200 responses and request errors (`abb82f458^:scripts/discord-reflection.js:423-464`), so removing its await does not turn those failures into newly advancing cursor cases. The old `mags` save was fire-and-forget. The existing limitation remains: intake exceptions are caught at `scripts/discord-reflection.js:507`, and a spool-write failure returns at `:407-409`; either can be followed by cursor advancement at `:511-513`. That ordering predates this diff and is not a regression from the cut.

3. **`magsAugment` indexing — correct.** The three `Promise.all` inputs are archive search, family, dashboard; `results[0]`, `[1]`, `[2]` are assigned in that order and each is inserted under its matching heading (`scripts/mags-discord-bot.js:262-284`). The removed whole-store profile has no remaining call or prompt block.

4. **Bot writes, notes, and voices — clear in the changed flow.** The Mags provider now persists through `magsTalk.persist` alone (`scripts/mags-discord-bot.js:287-303`); the response is stripped before send, local conversation log, and provider persistence (`:760-775`). `NOTES_FILE`, note extraction/save, and prompt instruction/read are absent. `stripNotes` remains (`:599-607`). The other citizen provider retains its prompt/augment/talk functions; only its unused `notesEnabled: false` property was removed (`lib/personaProvider.js:450-491`). `lib/mags.js` still gives the bot `loadIdentity`, page-independent local context, and `searchDisk`, whose allowed shelves exclude `docs/mags-corliss` (`lib/mags.js:535-561`).

5. **Weakest spot — verification, not an identified defect.** No focused test in this cut constructs the full bot prompt and asserts the store-profile and notes blocks are absent. Source inspection supports their removal; the plan's post-restart prompt read-back and old-store count check are still needed to prove the running process is this candidate. The header test comment at `scripts/discordReflectionHeader.test.js:4` still says the reflection writes the `mags` container; that comment should be corrected when the test is next touched.

## Wiring and evidence boundary

**Source-traced `Reflection_Intake` wiring:** `discord-reflection.js:392-411` makes one evening row with `wake.nightlyIntakeRow`, writes a local spool, and injects `sheets.getRawSheetData` / `sheets.appendRows` for the tab. `lib/wakePerception.js:1250-1262` shapes and validates the row; `:1314-1337` holds a file lock, scans for the night, appends only when absent, and removes the spool only after read-back finds it. The required `engine-wiring` Haiku command for `Reflection_Intake` returned `[FATAL] Connection error`; no model card was available, and I did not retry it.

**Checks:** `node --check` passed on the four changed live JavaScript files; `node scripts/discordReflectionHeader.test.js` passed; `git diff --check abb82f458^ abb82f458` passed. `node lib/mags.searchDisk.test.js` could not complete in this sandbox: its child `grep` failed with `spawnSync grep EPERM`, causing the assertion at line 107. I did not run the bot or reflection, contact Supermemory or Sheets, alter cron, or restart PM2. The reviewed runtime files have no working-tree delta from `abb82f458`; unrelated dirty files were left alone.
