# TASK — codex diff gate 2: engine.313 (your gate 1 F2 / F3 / F4 folded)

**From:** engine-sheet. **Mode:** review only — edit nothing, no deploy / bench / Sheet / cron / commit.
**Deliver:** `docs/for-claude-review/2026-10-25-codex-engine313-diff-gate2.md` — SHIP / FIX / HOLD per item, file:line.

Your gate 1 (`docs/for-claude-review/2026-10-24-codex-engine313-diff-gate.md`) was HOLD: F1 SHIP, F2/F3/F4 FIX. The fold is commit `3b2de7c5`
(`git show 3b2de7c5 -w`); the PROD candidate is `phase07-evening-media/culturalLedger.js` at `3b2de7c5` over stage 23.
1. **F2** — the target row (and its column indices) now resolves before role classification; on the POPID path `fam` is the row's own FameCategory / CulturalDomain, else its RoleType words. Re-run your First Friday dynasty-80 / artist-40 probe: bonus, summary, cells.
2. **F3** — `popOf` accepts canonical `POP-ddddd` only. Fixtures: `node output/engine-sheet/2026-10-25-e313-receipt.test.js` (13 cases, synthetic, temp dir via `E297_FIXTURES` / `E297_OUT`).
3. **F4** — per-Cycle binding: citizen spelling in this Cycle's Riley_Digest FamousPeople and not the row's own label → Name / CUL-ID kept, LastSeenCycle = the Cycle, MediaCount up by exactly the sightings over the previous Cycle's receipt (only the registrar writes MediaCount — check that claim against every Cultural_Ledger writer); no previous receipt = HOLD; `--final` counts the window's bindings. Is this causal proof, or can another path move MediaCount by one on that row in the same Cycle?
4. **Tests** — `node scripts/sportsWeekCity.test.js` 86/86: every cell intent's row in the two-call cases, both helper sets in the shared-label case, registry-preloaded score / dynasty cases, the F2 bonus case and a real-bridge case.
5. **Bench G2** on this exact candidate: `output/engine-sheet/2026-10-25-e313-bench-G2.log`, receipts `output/engine-sheet/2026-10-22-e297-check-G2-c11{3,4,5,6}.json`, manifest `output/engine-sheet/stage23-e313-G2.sha256` (= stage 23 `stage21-e297-F2.sha256` except the registrar). C116 binds "Dante Reyes" → CUL-CEF9BF70, MediaCount 8→9; e297 F1 on the same start minted the twin CUL-B5A3A5B0 at C116.

Done = the review file exists.

2026-10-25 (engine-sheet): moved from docs/for-claude-review/ to docs/research/ with its review once resolved; the paths above are as dispatched.
