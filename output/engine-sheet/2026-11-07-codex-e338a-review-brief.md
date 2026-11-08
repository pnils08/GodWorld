# Codex review brief — engine.338 Task 2a, deploy candidate `673e8be44` (research-build, 2026-11-07)

Adversarial diff review of the exact PROD candidate. Read-only. Write the review to
`docs/for-claude-review/2026-11-07-codex-engine338a-diff-review.md`. Keep it under 120 lines: numbered findings
F1…, each with file:line, severity (blocks / should-fix / note), a one-line fix; end SHIP / HOLD.

## The change (one commit, three engine files + one test)

`git show 673e8be44 -- phase01-config/engine94SheetContract.js phase01-config/godWorldEngine2.js phase05-citizens/applyGameNightMoments.js scripts/gameNightMoments.test.js`

Builder ruling 2026-11-07: at the sports retirement flip (engine.333's `sportsRetire_`, live on PROD since this morning,
first live fire tomorrow C115 on Vinnie Keane's own feed row) a Tier 1–2 player's Income becomes a per-tier post-career
figure — appearances, events, the name; not a job (Tier 1 250,000 · Tier 2 120,000). Tier 3–4 untouched (the hiring
pools re-price them; the pools never touch Tier 1–2, so nothing else would ever re-price a former star). The figures
live in World_Config (`postCareerIncomeTier1/2`), seeded at open by `ensureEngine338Config_` (copy of
`ensureEngine276Config_`), read fail-loud by `postCareerIncome_` (copy of `debtConfig_`, ADR-0015). The `[Retirement]`
line names the figure. Ships tonight before the C115 fire so Vinnie does not keep a 1.5M playing salary with no path
back (the flip refuses an off-clock row, so a later deploy would never touch him).

## Check against the code

1. `ensureEngine338Config_` is called inside the open's try block (`godWorldEngine2.js:504-505`) — before
   `Phase1-LoadConfig` (`:549`) reads World_Config into `ctx.config`? Is `ctx.config[key]` the parsed number there
   (compare how `debtConfig_` reads the engine.276 keys)? Is the second runner (`godWorldEngine2.js:2287+`) on the
   same open path, or does it need the call too?
2. `postCareerIncome_` throws on a missing key inside `applyGameNightMoments_`. What does `safePhaseCall_` do with that
   throw — does the Cycle continue, and which named lines of that Cycle are lost? Is the throw the right call under
   ADR-0015 given the self-arm, or should the retirement write the flip and skip only the Income with a logged line?
3. `row[cols.iIncome] = postPay` lands on `ctx.ledger.rows` at `Phase5-GameNightMoments` (`:623`), before
   `Phase5-GenerationalWealth` (`:670`) accrues `Income/52 × SavingsRate` — intended. Anything between 623 and 670
   that re-reads Income on a GAME→ENGINE row this Cycle and would undo or double it (`Phase5-Universe` 635,
   `Phase5-Career` 644, `Phase5-Advancement` 668, the pay floor `applyTrackedEmployerFloor_` skips Tier 1–2 — confirm)?
4. `Number(row[cols.iTier])` on a blank Tier → `NaN` → `ENGINE338_KEYS[NaN]` undefined → null → untouched. A Tier
   stored as the string `'1'` → 1. Any live GAME row whose Tier cell is not 1–4 (read the snapshot
   `output/simulation_ledger_snapshot.jsonl`)?
5. `toLocaleString('en-US')` in the Apps Script V8 runtime — formats 250000 as `250,000`? (The test proves Node.)
6. The `[Retirement]` line text changed for Tier 1–2 (`… announced C115 — the playing salary ends; appearances and the
   name pay $250,000 a year`). Readers of that line: the owed-wake pin `/^\[Retirement\]/` (`lib/wakePerception.js:938`),
   `SALIENT_TAG`, the bio `Now:` sentence (built from RoleType, not the line), the Rhea gate, engine.336's reader.
   Does any reader parse the tail of the line or match its exact old text?
7. The test (`scripts/gameNightMoments.test.js` 7b, 7c3): does it prove the Tier 3 path, the off-clock row's Income
   untouched, the re-fire idempotence on Income, and the missing-key throw? Any assertion that passes for the wrong reason?

Not in scope: the rest of engine.338 (question trigger, intake door, catalog pool) — plan
`docs/plans/2026-11-07-former-player-next-chapter.md`, agy review already folded.
