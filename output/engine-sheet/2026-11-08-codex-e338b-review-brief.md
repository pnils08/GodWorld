# Codex review brief — engine.338 Tasks 2b–2d + 3, deploy candidate `506ca6b28` (research-build, 2026-11-08)

Adversarial diff review of the exact PROD candidate. Read-only. Write the review to
`docs/for-claude-review/2026-11-08-codex-engine338b-diff-review.md`. Keep it under 150 lines: numbered findings
F1…, each with file:line, severity (blocks / should-fix / note), a one-line fix; end SHIP / HOLD.

## The change (three commits by research-build; the other files in the range are engine-sheet's)

`git show bd2c0e574 39eccc129 506ca6b28 --stat` — then the diffs:
- engine (clasp, stage 43 = stage 42 + six files): `utilities/setupSportsFeedValidation.js`, `utilities/citizenDialMap.js`,
  `phase02-world-state/applySportsSeason.js`, `phase05-citizens/applyGameNightMoments.js`,
  `phase05-citizens/processAdvancementIntake.js`, `phase05-citizens/educationCareerEngine.js`
- Node (crons): `lib/nextChapter.js` (new), `lib/wakePerception.js`, `scripts/citizen-wake.js`, `data/economic_parameters.json` (+6 rows)
- tests: `scripts/intakeExistingRowDoor.test.js`, `scripts/nextChapter.test.js` (new); `gameNightMoments`, `sportsFeedTriggers`,
  `sportsFeedContract`, `wakeOwedMilestone`, `householdIntake`, `educationLoop` extended / moved to the new contract

Plan: `docs/plans/2026-11-07-former-player-next-chapter.md` (Design 0b, 1, 2, 3; the agy plan review F1–F8 is folded).
Builder rulings at the cut (2026-11-08): the question is PRIVATE until he answers (no story hook, no sports seed); ONLY
the answer moves him (`Question` is a no-dial tag).

What it does, in one breath: the builder puts a `question` row on the sports feed (Notes = the question, NamesUsed = the
citizen, team gate exempt); the engine writes `[Question] <text>` as the citizen's only line under a bare `Question` log
tag; the owed wake carries the question as its provocation and the citizen closes with `MOVE: role=<pool title|none> |
where=<place>`; the wake files an Advancement_Intake1 row (exact catalog title, clock by category, employer by rule); the
next fire's intake door moves EmployerBizId / ClockMode / EconomicProfileKey on the EXISTING row, re-prices Income, grows
the business's Employee_Count by one.

## Check against the code

1. `readOaklandFeedEntries_` (applySportsSeason.js:262-270): `citizenOnly` lets `question` past the team gate. Does a
   blank-TeamsUsed row anywhere downstream of `S.sportsFeedEntries` assume a club — `processFeedSheet_` (story hooks),
   `feedMoments_`, `sportsWeekForEntry_`, the household / citizens-events game-night readers, the dashboard preview?
   `feedMoments_` drops citizen-only words — is that the only path to `S.sportsEventTriggers`?
2. `applyGameNightMoments_` NAMED loop: the question branch `continue`s before the type line. The `write()` helper marks
   `touched` but not `reached` for a Question — `touchedIds.length` still gates the LifeHistory_Log write and `ctx.ledger.dirty`;
   the Ripple uses `reachedIds`. Any reader of the Ripple that expected `magnitude == touched`? A Cycle whose only named
   lines are questions: `logRows` written, `reachedIds` empty → no Ripple — correct?
3. `sportsQuestionText_` folds whitespace; the life line is `stamp — [Question] <text>`. Can a question containing ` — ` or
   `[`…`]` break `lineTag` / `pinMatches` / `lifeTailOf` / the `Now:` strip regex (`sportsBioNow_`) or the Phase-9 fold's tag
   parse? Does `nudgesForEvent_('Question', …)` really return `{}` through `baseTag_` (the dash split) — `'Question': {}` sits
   in DIAL_MAP; is `scale_({})` `{}` and does `gradedNudges_` ever match a bare `Question`?
4. The intake pre-pass (processAdvancementIntake.js ~:808-830): the clock check now runs for existing names BEFORE the
   name-index lookup; `bizBook_()` is lazy inside the pre-pass. A re-home row whose EmployerBizId is a `BIZ-` not on the
   ledger throws for the whole queue — is that the right blast radius vs. the mint rows behind it (the mint used to fall
   through to a pick)? `pvEmp` sentinels are matched upper-cased; the branch below writes `empCell.toUpperCase()` for a
   sentinel but keeps a `BIZ-` id as typed — a lowercase `biz-00005` would pass the pre-pass? (It would not — `indexOf('BIZ-')`
   — but check `ADV_EMPLOYER_SENTINELS_` vs. `'biz-00005'`: refused as "not a BIZ- id"?)
5. The existing-row branch: order of writes — Tier, RoleType + SkillTags, role-price (needs `advSalaryPools`), then clock,
   employer (+ headcount intent + ripple delta), key (needs `roleChanged`, skipped on GAME), employer/key re-price (only
   when `!roleChanged`), `moved` line. Cases to break: role unchanged + clock → GAME only (no re-price, key untouched —
   should a move onto GAME clear a stale key?); role changed + clock GAME (no key written — but the OLD key stays; e.g.
   'Accountant / CPA' on a man now coaching on the GAME clock — `isSportsLayerRow_` reads GAME first, so the money loop skips
   him; any reader that reads the key before the clock?); `incomeBefore` captured after `tierBefore` — an Income the role
   path set is named on the line, but a NaN Income → `Number(incomeBefore) !== Number(after)` false-positive?
6. Headcount: `bizRec.stated += 1` and the cell intent land `stated+1` even when `reconcileBusinessHeadcounts_` already ran
   this Cycle (Career is phase 645, Advancement 669): the Phase-10 write of `stated+1` is from a fresh read of the tab — can
   Career's own write-back intent for the same cell (queued earlier the same Cycle) collide: two intents on one cell, last
   wins — which is last, and is the result `stated + careerNet + 1` or just `+1`? Read `queueCellIntent_` /
   `executePersistIntents_` ordering.
7. `catalogRoleKey_` now sits under `settleAdulthood_` (`educationCareerEngine.js:1244`): same result for every settlement
   title (SETTLE_ROLES_BY_FIELD titles) as before — confirm none of them is ALSO an exact catalog title with a different
   casing (the key would change casing).
8. `lib/nextChapter.js parseMove`: the last `MOVE:` line wins; the text with the line removed is what goes to the page,
   Reflection_Intake, the classifier and `matchBondTargets_`. A model that puts the MOVE line first, or splits `role=` and
   `where=` across lines, or writes `role: Scout` — refused as intended, or silently `none`? `where` is folded by name only —
   two businesses with the same Name?
9. `citizen-wake.js`: the question replaces the provocation (`prov.id='question'`) — anything downstream keyed on
   `prov.id` / `prov.route` (`selectProvocation` bookkeeping, the offered-names log)? `fileNextChapter` runs after the page
   append and before Reflection_Intake, and never throws — a failed `appendRows` leaves a `held` ledger line while the owed
   receipt is already spent: is that the right order (the plan says the row is written "the moment a valid move lands")?
   `c.first` / `c.last` come from the pool row (new fields) — `--pop` on a citizen outside the pool falls back to the draw
   (existing behaviour); `cycle` null → `fileNextChapter` skipped (`parsedMove && cycle`) — the dry log still prints.
10. Tests: does `intakeExistingRowDoor.test.js` prove the headcount intent's ROW (sheet row 3 = Bay Tribune) and not just a
    value? Does any assertion pass for the wrong reason (the stubbed `jobReferencePay_` returns the median for three titles
    only — `Junior Accountant` falls to `rederiveIncomeForRole_({}, …)` → null → "untouched" is asserted loosely in §6)?

Not in scope: Task 2a (live @178, reviewed twice), engine.336, the `applied` ledger stamp (plan Open questions).
