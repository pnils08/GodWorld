# REVIEW — pipeline.100 diff: citizen Mags off the old `mags` store (engine-sheet 2026-11-08)

Adversarial diff review, SHIP / SHIP-WITH-FIXES / HOLD, per AGENTS.md. Write to `docs/for-claude-review/2026-11-08-codex-pipeline100-diff-review.md`. Candidate: commit `abb82f458` (`git show abb82f458`). Plan: `docs/plans/2026-11-03-mags-memory-one-home.md` — rescoped after your plan review on the builder's correction (11-08): "Mags discord and cron behaves like every other citizen … Cli mags are a completely different agent"; and on what citizen Mags gives the builder sessions: "what does that serve the CLIs ?" (nothing). Your plan-review findings F1/F2/F6 fell away with the rescope (citizens keep no chat on the page and no store search); see the plan's Reviews reconciled row.

The cut: `scripts/mags-discord-bot.js` — the whole-store "About This Person" block (`fetchUserProfile`) and the per-exchange `mags` write out; the `[NOTE_TO_SELF:]` sink (prompt instruction, notes read, extract/save, `NOTES_FILE`, `notesEnabled`) out, tag strip kept. `scripts/discord-reflection.js` — the `mags` search, the `mags` write and the claude-mem save out; page write, intake row, Moltbook advance unchanged. `lib/mags.js` — `searchSupermemory`, `saveToSupermemory`, `loadNotesToSelf` and their constants removed. `lib/personaProvider.js` — `notesEnabled` field gone. `scripts/daily-reflection.js` deleted (no cron since S187).

Hunt, with file:line and the failure it causes:
1. Any remaining caller of a removed function or field anywhere (scripts/, lib/, dashboard/, tests, `.claude/agents`, pm2 `ecosystem.config.js`, crontab) — a throw at require or at first message.
2. The reflection run order after the cut: page write → intake row → Moltbook advance. Did removing the awaited claude-mem save change a failure path (a step that used to be skipped or retried now advancing, or the reverse)? `discord-reflection.js` main flow.
3. `magsAugment` result indexing after the `Promise.all` shrank — family / dashboard / archive land in the right slots.
4. Anything in the bot that still writes or reads `mags` or `NOTES_TO_SELF.md`, or a citizen-voice provider path changed by the `notesEnabled` removal.
5. Weakest spot in the diff.
Do not restart the bot, run the reflection, touch Supermemory, the sheet or any cron. Findings the code does not back are not findings.
