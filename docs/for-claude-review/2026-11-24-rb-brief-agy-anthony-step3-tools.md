# Brief for agy — adversarial review: Anthony Raines, step 3 (his tools)

**From:** research-build · **Date:** 2026-11-24 · **Your output:** `output/antigravity/2026-11-24-review-anthony-step3-tools.md` · read-only on code.

## What this step is

The tools his seat file names (`.claude/agents/anthony-raines/SEAT.md` §Your tools) made reachable — your step 1 review (`output/antigravity/2026-11-24-review-anthony-step1-seat.md` §1) listed what was missing. Plan: `docs/plans/2026-11-21-reporters-wake-as-themselves.md` §The sports seats. His package is NOT switched yet (step 4 sets `seatFile`, `seatMemory`, `seatDossier`, models): review the code paths as they will run once it is.

## The diff

Commits `19b287b62` and the one after it (`git log --oneline -3 -- scripts/gridiron.js scripts/cron-desk-writer.js scripts/cron-desk-run.js scripts/newsroomWakePackages.js`):
- `scripts/gridiron.js`: `cardFor(name)` / `cardLines(card, season)` — one player's whole card as lines; the roster record reads the options line under any of its three wordings.
- `scripts/cron-desk-writer.js`: `toolDossierRead` reads the team cards first (`output/gridiron/cards.json`), falls back to the older dossiers (`output/player_truesource_mirror.json`); `DOSSIER_TOOL` description; `As_Player_Data` on `SHEET_READ_ALLOWLIST`; `SEAT_DOSSIER` (`--seat-dossier`) adds `DOSSIER_TOOL` to the seat writer's toolset.
- `scripts/cron-desk-run.js`: `seatMorningPlan` offers `dossier_read` and executes it when the package has `seatDossier: true`; the writer is passed `--seat-dossier`.
- `scripts/newsroomWakePackages.js`: `seatDossier` allowed only with a `seatFile`.
Sample reads printed in session: Ramos (full card, 11 lines), Horn 2041, Mesa (fallback to the older dossier), `sheet_read` As_Player_Data.

## Attack these — each against the code

1. **Who else changes.** `toolDossierRead` and `DOSSIER_TOOL` serve Hal Richmond and Elliot Marbury on their legacy paths (`writerToolset`, the HAL/MARBURY tool frames in `cron-desk-writer.js`, `buildMarburySlice.js`). Any of their behaviour that changes now the team card answers first: a player on both sources, the line format their prompts expect ("the rates already worked from it"), `lines[].src` that a gate or the canon blockers read, Marbury's slice reading the mirror directly.
2. **Facts and the gate.** The tool's `lines` become approved facts for the writer (`openRouterToolLoop` keepResults / trace). A card line carries 2042 age, contract years, ratings and the game's attribute words — any check (Rhea `cron-rhea-gate.js`, `auditArticle`, capability reviewer `assertCanonNamesNotInvented`) that would now pass or fail wrongly on these lines; any card text that leaks how a card was made (screens, Drive, steward) that `gridironCards.js` MAKING did not strip.
3. **Names.** `cardFor`: exact, then a unique partial; a partial that fits two returns `ambiguous`. A name on the feed spelled differently from the card; a player on both teams' cards; a non-player (a coach on the staff record) asked for.
4. **The seat path.** With `seatDossier` true: the morning's exec returns `.text` only — does the morning trace or the angle artifact expect `{ text, lines }`; the writer's `execOpenRouterTool` path for `dossier_read` under `TEST_SEAT`; the tool-call caps (`SEAT_MORNING_CALLS`, writer maxToolCalls) now that one more tool competes.
5. **As_Player_Data on the allowlist.** It is on the shared allowlist (every reporter, legacy and seat). Any reporter who should not reach it; the read with no `match` (oldest 40 rows — the tab is not kept by Cycle).

Each finding: file:line, the failure scenario, severity. Verify every claim against the code. Do not propose a different goal or design.
