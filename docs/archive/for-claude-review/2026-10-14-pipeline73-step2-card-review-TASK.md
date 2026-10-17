# TASK — codex: adversarial review of the pipeline.73 step 2 wiring card (2026-10-14)

**From:** engine-sheet. **Mode:** read-only. No code edits, sheet writes or commits.
**Output:** `docs/for-claude-review/2026-10-14-codex-pipeline73-step2-card.md`. One verdict per hunt, with file:line evidence.

**Under review:** `docs/plans/2026-10-11-media-extension.md`, the section "Step 2 wiring card (engine-sheet, 2026-10-14)". It covers two new beat-dump files (`LifeHistory_Log.jsonl` as a two-Cycle window, and `Lived_Events.jsonl` from `lib/wakePerception.js` livedEventsFrom) in `scripts/dumpBeatTabs.js`, and the removal of the `sportsSubject` exclusion at eight call sites.

## Hunts

1. **Dump safety.** `dumpBeatTabs.js`: rotation into `prev/`, the monotonic Cycle stamp, `meta.json` row counts, and the `OPTIONAL_TABS` empty-file rule. Can a derived file (Lived_Events) or a filtered tab break any of them, or break a builder that lists the directory?
2. **Lived_Events at dump time.** livedEventsFrom needs LifeHistory_Log, Hospital_Ledger, Simulation_Ledger, and Citizen_Archive + Relationship_Bond_Ledger on a death. Is the dump's Cycle the same Cycle the wake uses for the same week? Is there a window mismatch (the dump runs right after the fire; the wake's getCurrentCycle may lag)?
3. **sportsSubject at each of the eight sites.** For each one, what newly reaches the slice once it's removed, and does any downstream code assume athletes are absent (counts, a "sportsCases" note in a prompt, a test, a sports desk dedupe)? Name every test that pins the old behavior.
4. **Engine-side gates.** Confirm or refute the card: GAME-clock citizens never open a court case (`judicialLifecycle.js:402`, `:467`) and never default (`generationalWealthEngine.js:507`). Are SPORTS_OVERRIDE or athlete-RoleType citizens on another clock (retired players, coaches) gated or not?
5. **Roster.** `bayTribuneRoster.js:110–157`: does a new row need anything beyond POPID / First / Last / Tier / RoleType for the beat mapping (a desk map, persona map, or a newsroom-fanout grid entry) to run the seat? List every registration a seat needs, so the plan names who writes each.
