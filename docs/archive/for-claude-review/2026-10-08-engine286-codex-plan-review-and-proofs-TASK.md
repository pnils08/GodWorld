# Codex task — review the engine.286 plan against your report, then settle five proof items (research-build, 2026-10-08)

Output: `docs/for-claude-review/2026-10-08-codex-engine286-plan-review-and-proofs.md` (new file; leave your earlier report untouched). Read-only: no code edits, no sheet writes, no commits. The independence rule is lifted — read anything, including the plan and the rb read-before.

Plan to review: `docs/plans/2026-10-08-engine-286-game-of-life-events.md`. The builder's concern: **no idea from your report may be minimised or dropped to keep the plan tidy.** The plan sorts every item into Agreed / Needs proof / New concepts with pointers.

## Part 1 — fidelity review (the main job)

Read your report, then the plan's three tables, Tasks and Acceptance.
1. List every substantive item, finding, recommendation, test, risk, caveat or builder call in your report that is MISSING from the plan, or present but weakened, merged into something it does not mean, or sorted into the wrong table (e.g. something you proved sitting under Needs proof, or an idea marked held that you meant as required). One line each: your report § / line, what the plan says instead, the fix.
2. Check the plan's Tasks ordering against your amendment (§Revised implementation priority): is anything out of order, or does a task drift back to "tidy generic events" instead of "game for the crons"?
3. Anything in the plan attributed to you that you did not say.
Result line: SHIP / SHIP-WITH-FIXES / HOLD.

## Part 2 — five proof items (plan §Needs proof; evidence file:line or data, same standard as your report)

- **P1** — per engine (`runCivicRoleEngine_`, `runAsUniversePipeline_`, `generateCivicModeEvents_`, `generateMediaModeEvents_`): list every ledger-row field its per-citizen loop reads (the trace), so the "conditions on nothing from the citizen's own row" claim is settled either way.
- **P9** — are the daily generator's direct `LifeHistory_Log` / `Generic_Citizens` writes and the Universe pipeline's direct log write listed in `docs/engine/SHEETS_MANIFEST.md` §9 (the direct-write carve-out table)? Quote the rows or say absent.
- **P10** — Work, Money and Career line counts against Neighborhood and Daily over C106–C110 (your live aggregate read, same method as before). Compare to the weights the engine.67 design sets (`docs/plans/2026-07-18-event-pools-design.md`, rarity ruling). Is the small share a defect or the design?
- **P11** — sample twenty citizens across life states (retiree, renter, household with children, high earner, minor, MEDIA/GAME/CIVIC clock). Does `generateCitizensEvents_` output differ by life state the way engine.67 designed? Same read-only data as before; no raw log saved.
- **P13** — is the local checkout what is deployed at C110? Read `docs/reference/DEPLOY_HISTORY.md` and the PROD pointer in `docs/reference/DEPLOY.md`; state the deployed version and whether any commit after it touches the eight scoped files.

Rules: a plan's own text is a claim, not evidence. "No evidence found" is an allowed answer — say where you looked.
