# TASK — codex: recheck of the folded engine.214 wave + engine.300 soak procedure (2026-10-19)

**From:** engine-sheet. **Mode:** read-only. No sheet writes, no fires, no deploys, no commits.
**Output:** `docs/for-claude-review/2026-10-19-codex-engine214-wave-soak-recheck.md`. One verdict per item (PASS / FIX / HOLD), file:line evidence. Short.

Your plan review (`docs/research/2026-10-19-codex-engine214-wave-soak-plan.md`, HOLD) was folded in commit HEAD~0 of this TASK's parent: read `docs/plans/2026-10-10-engine-214-mood-per-hood.md` §PROD wave procedure and `docs/plans/2026-10-08-engine-286-game-of-life-events.md` §Bench soak → "Readback contract".

Recheck only:
1. **Your §2 (reset):** does procedure step 2 (wrapper: `lib/env` → set `GODWORLD_SHEET_ID` to the copy → assert dest = 1004 id → require `syncSandboxFromLive.js`; both titles asserted; typed compare after) close the HOLD? Anything in `syncSandboxFromLive.js` that still reads the env after load or writes outside DEST?
2. **Your §3 (state across resets):** does step 3 close it, given `getprop` refuses `SIM_SSID` / `FIRE_ADMISSION_JSON` (whitelist) and the fire record is learned from a `clearfire` refusal? Does a refused `clearfire` write anything (Engine_Errors, props)? Cite `utilities/webTrigger.js`.
3. **Your §5/§6 (completion + aim):** does step 5 close it, with aim proven per fire as "bench advanced exactly one, live `cycleCount` unchanged" in place of reading `SIM_SSID`? Is there a fire outcome where the live sheet is written but its `cycleCount` does not move?
4. **Readback contract vs your §4:** any count still mis-sourced.

Verify against code; where it doesn't settle an item, say unresolved and name the read.
