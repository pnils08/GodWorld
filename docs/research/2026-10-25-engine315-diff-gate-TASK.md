# TASK — codex diff gate: engine.315 + engine.314 (one stage)

**From:** engine-sheet. **Mode:** review only — edit nothing, no deploy / bench / Sheet / cron / commit.
**Deliver:** `docs/for-claude-review/2026-10-25-codex-engine315-diff-gate.md` — SHIP / FIX / HOLD per item, file:line.

Builder 2026-10-25: "Move on the 2 bugs" — engine.314 and engine.315 ship as one stage over PROD stage 24 (`3b2de7c5`, engine.313, your gate 2 SHIP). Candidate: commit `3109503e` (`git show 3109503e`), `phase07-evening-media/culturalLedger.js` only. Plan: `docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md` §engine.314 / 315.
1. **engine.315** — on any existing row an authored FameCategory (not blank / `unknown`) now classifies the row (fame bonus, summary) and is never rewritten; a blank / `unknown` one is filled when the classification finds one (POPID path from the row's own RoleType words, exact-name path from the caller's word). It replaces engine.313's POPID-only rule. Is there any caller that relied on the refresh to change an authored category on purpose? Does the bonus change (a legend in a championship week now takes the Sports bonus) reach anything beyond FameScore?
2. **engine.314** — the pending-create repeat writes LastSeenHoliday / CalendarContext by header name (absent on the live header), not positions 18 / 19. Any other positional write on that branch that the live header breaks?
3. **Receipt** (`output/engine-sheet/2026-10-22-e297-check.js`) — authored category / domain rewritten vs baseline → HOLD; a new row's HolidayPriority = Holiday or a joined SportsSeason → HOLD. Fixtures `node output/engine-sheet/2026-10-25-e313-receipt.test.js` (20). On the e313 G2 bench state it HOLDs exactly Benji Dillon (athlete → unknown) and Mike Paulson (sports-figure → athlete) — the before.
4. **Tests** — `node scripts/sportsWeekCity.test.js` 94/94; 8 new checks fail on `3b2de7c5`. Two engine.313 cases now assert no category rewrite (exact-name artist row with role `author`; dynasty registered by its own name).
5. **Bench G3** on this exact candidate: `output/engine-sheet/2026-10-25-e315-bench-G3.log`, receipts `output/engine-sheet/2026-10-22-e297-check-G3-c11{3,4,5,6}.json`, manifest `output/engine-sheet/stage24-e315-G3.sha256` (= stage 24 `stage23-e313-G2.sha256` except the registrar). Read them when present; the leg is running as this TASK is written.

Done = the review file exists.

2026-10-25 (engine-sheet): moved from docs/for-claude-review/ to docs/research/ with its review once resolved; the paths above are as dispatched.
