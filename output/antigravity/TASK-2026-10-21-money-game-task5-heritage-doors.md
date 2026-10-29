# TASK — agy review: money-game Task 5, the heritage doors

**From:** research-build. **Builder 2026-10-21:** agy takes reviews while es and codex are on a separate build. **Mode:** read-only, adversarial. Do not edit tracked files.

**Target:** `docs/plans/2026-10-16-the-money-game.md` section "Task 5 design — the heritage doors" (commit e0322da9).

**Sources to verify every live number against:**
- `Heritage_Ledger` live tab — `require('/root/GodWorld/lib/env'); require('/root/GodWorld/lib/sheets').getSheetAsObjects('Heritage_Ledger')`
- `output/simulation_ledger_snapshot.jsonl` (C112) — NetWorth, UsageCount, LineageId, Tier, Status
- `Cultural_Ledger` live tab — FameScore, UniverseLinks (POPID)
- `phase05-citizens/generationalWealthEngine.js` `:2525-2551` (doors, tiers), `:2581-2600` (standing), `:3098-3136` (dormancy / revival)

**Hunts — file:line and numbers on every claim:**
- **H1** Recompute the who-is-in / who-is-removed table under the proposed Fortune / Fame / Roots doors at the bracketed numbers. Name any citizen the plan gets wrong, and anyone it missed.
- **H2** The fix shape for the `lowC` trigger at `:3122` (drop the PeakTier guard, re-bracket `HERITAGE_LOW_CYCLES` 52 → [4]): does it break revival (`:3112-3119`), tenure, TierTenure, or any reader of `Status = dormant`? grep every reader of the Heritage_Ledger Status / HeritageTier columns across `phase*/ scripts/ lib/`.
- **H3** Anything that keys on Door A / B / C by name or constant (`FoundedDoor`, heritage births / the business roll, engine.306 owner door, `HERITAGE_DOOR_*` readers) that a door rewrite would orphan.
- **H4** The weakest assumption in the design, one paragraph.

**Deliver:** `output/antigravity/2026-10-21-review-money-game-task5-heritage-doors.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD at the top. Numbers, not adjectives.
