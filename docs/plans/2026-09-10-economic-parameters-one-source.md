---
title: Economic_Parameters — collapse to one runtime source
created: 2026-09-10
updated: 2026-09-10
type: plan
tags: [plan, engine, economy, active]
sources:
  - Mike-direct 2026-09-10 (S443): "why couldn't the list be in a ledger? why does it have to
    be scattered in a million places and wrong and stale in each situation?" — correction to
    research-build's own overclaim that a baked-in Apps Script copy was technically required.
pointers:
  - "[[../engine/ROLLOUT_PLAN]] engine.198 — the immediate stopgap (push the 108 missing rows),
    still needed regardless of this plan"
---

# Economic_Parameters — collapse to one runtime source

**Verdict: adopt.** Mike is right and my prior explanation overstated necessity. Correcting
the record here so the fix, not the excuse, is what ships.

## What's actually true (verified, not inferred)

Apps Script has exactly one hard constraint: it cannot `require()` or open an external file
(`scripts/syncEconomicParameters.js` header, verified). That's it. It does **not** follow that
a second, hand-baked copy of the catalog has to live inside the engine's own code.

Proof it doesn't: `buildIntakeSalaryPools_` (`phase01-config/godWorldEngine2.js:1533-1558`,
read live 2026-09-10) already reads the `Economic_Parameters` sheet tab directly, **once**,
into memory, then loops the in-memory array for the rest of its work. One sheet call, not
hundreds. This is the pattern; it already exists in this codebase and already works.

What's actually scattered:
1. `data/economic_parameters.json` — 306 entries, git-tracked, the place edits are actually made.
2. `utilities/citizenDerivation.js` — a hand-baked JS array literal, regenerated from #1 by
   `syncEconomicParameters.js`, read as the global `ECONOMIC_PARAMETERS` by
   `phase05-citizens/generationalWealthEngine.js`, `runCareerEngine.js`, `educationCareerEngine.js`.
3. `Economic_Parameters` sheet tab — the human-visible copy, read live only by
   `buildIntakeSalaryPools_`. Currently 198/306 rows (engine.198).

\#2 exists only because whoever wrote the career/wealth/education engines reached for a
constant instead of the single-read-and-cache pattern \#1's own sibling function already
proved out. Not a platform requirement — an inconsistency that accumulated across separate
build sessions.

## Target shape

One live source: the `Economic_Parameters` sheet tab, read once per cycle run (not per
citizen, not per lookup) and cached in memory for that run's duration — the same shape
`jobPayTable_()` already caches the embedded array today, just fed from a single sheet read
instead of a JS literal.

`data/economic_parameters.json` stays as the git-tracked edit point (diffable, testable
offline, the actual place a new role gets added) and becomes a **push-only** source: a script
writes it to the sheet tab. The embedded JS array in `utilities/citizenDerivation.js` and
`syncEconomicParameters.js`'s Apps-Script-sync mode retire entirely — nothing reads them once
the engine reads the sheet directly.

Net: two representations instead of three. One file you edit, one place the engine reads,
one push between them, one direction.

## Blast radius (measure twice)

Reader-side changes: `generationalWealthEngine.js` (`jobPayTable_`, the embedded-array
fallback path), `runCareerEngine.js`, `educationCareerEngine.js` — swap the global
`ECONOMIC_PARAMETERS` reference for a single per-run sheet read passed through `ctx`, same
caching shape as `buildIntakeSalaryPools_`/`jobPayTable_` already use. Node-side
(`lib/citizenDerivation.js`, tests) is unaffected — it already reads the JSON file directly
and has no Apps Script constraint to work around.

Retire: the `ECONOMIC_PARAMETERS_START`/`_END` embedded block in
`utilities/citizenDerivation.js`, and `syncEconomicParameters.js`'s write-to-Apps-Script mode
(keep or repurpose its JSON-diff/validation logic — `validateIntakeDerivation.js` Gate 5 needs
a new parity check, JSON vs. live sheet instead of JSON vs. embedded block).

## Acceptance

- `Economic_Parameters` sheet tab always matches `data/economic_parameters.json` row-for-row
  after any edit + push (no more silent drift — this is what let 108 rows go missing unnoticed).
- No Apps Script file carries a second embedded copy of the catalog.
- Live cycle fire, engine reads the sheet once per run (verify via execution log / no
  per-citizen `Economic_Parameters` sheet calls).

## Status log

- 2026-09-10 (research-build, S443) — Plan filed. engine.199 opened for engine-sheet. engine.198
  (push the missing 108 rows) stays as the immediate stopgap — do it regardless of when this
  lands, citizens are being authored against the stale list right now.
