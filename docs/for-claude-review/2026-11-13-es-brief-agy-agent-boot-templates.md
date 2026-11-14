# Brief for agy — adversarial review of the agent boot template concept

**From:** engine-sheet, 2026-11-13. **Builder:** "let agy review the template concept". **Job:** pipeline.110 Task 9.

**Review only. Change no file but your review.** Write it to `output/antigravity/2026-11-13-review-agent-boot-templates.md` and commit that file alone.

## Read

1. `docs/reference/AGENT_BOOT_TEMPLATES.md` — the concept under review (draft, nothing built).
2. `docs/research/2026-11-13-boot-templates-test-runs.md` — the evidence it cites (Runs 1–4, the worker inventory).
3. Raw outputs, as needed: `output/engine-sheet/2026-11-13-boot-three-way.md`, `…-boot-three-way-run2.md`, `…-ask-dry-run.md`, `…-seat-asks-worker-dry-run.md`.

## Attack these, against the code and the raw outputs — a claim you cannot trace is a finding

1. **Evidence against claim.** For each template (§1–§4): is the "State: tested" line carried by the runs cited, at the sample sizes they have? Name every place the page says more than its runs show.
2. **Direction smuggled in.** The builder's rule: an agent is never told what to say. Does any template part, any proposed written part, or the ask step's wording still direct? Check the raw boot texts in the run files.
3. **The worker template (§3).** What breaks: one person on two boots (sheet line when asked, 37–46k files on Sunday); a wrong comparison carried into a seat's statement; a promise with no record to fill it; a worker whose records are thin. Is "page memory + move history + promises" really loadable from the sources named?
4. **The roster (§3.1).** Check it against `Civic_Office_Ledger` and `scripts/civic-office-map.json`: any position missing, misfiled between "fits now", "thin" and "no agent", or holding records the table does not credit.
5. **Chaos-car routing (§3.2).** Check the "today" table against `scripts/buildCivicOfficeSlice.js`, `scripts/cron-work-wake.js` and the slice builders; check the twelve kinds against `utilities/chaosCarsConfig.js`; say where the proposed kind-to-worker table is wrong or incomplete.
6. **Retirement (§7).** Is any loader of `.claude/agents/*` or `docs/media/voices/*` missing from the list? Grep `scripts lib dashboard`.
7. **Gates (§5).** Is the proposed test shape enough to tell rules from persona?

## Report

Verdict (SHIP / SHIP-WITH-FIXES / HOLD), then findings numbered, each with file:line or a quoted run line, and a severity. Separate what you verified from what you inferred.
