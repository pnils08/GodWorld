# TASK — codex: re-check wakes-have-no-rules Rev 3 before any code

Read-only: code + `output/` dumps; no cron, model, Sheet write, bench or canon run. Write to `docs/for-claude-review/2026-10-17-codex-wake-no-rules-rev3-recheck.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~60 lines. The builder's two open readings (P "Open with the builder") are his — do not gate on them; review the mechanics.
Plan: `docs/plans/2026-09-10-inactivity-is-regression.md` §Wakes have no rules — build plan, Revision 3. Your Rev 2 review: `docs/for-claude-review/2026-10-17-codex-wake-no-rules-rev2-recheck.md`.

## Hunts
1. **Your Rev 2 FIX items.** For each: closed by Rev 3, or still open? Cite the Rev 3 line.
2. **M2 write-once.** Evening-only append, scan-then-append, never update, fail closed. Any remaining duplicate, lost-row, or drain-interleaving path? Is "Central hour ≥ 18" a sound evening test against the live crontab and `getCentralDate`?
3. **M1 at the read layer.** Scrub inside `citizenPage.recentPage_` / `readPage_` for NIGHTLY + metadata-less results, `raw` opt-out for `loadPageTail` only. Any reader that bypasses those two functions? Any non-Mags consumer whose output changes?
4. **L per-recipient spend.** `livedFor` + `eventId:POPID` keys + bare-key back-compat: any double-render or never-render path?

Done = the md exists.
