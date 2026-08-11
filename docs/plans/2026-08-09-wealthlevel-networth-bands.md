---
title: WealthLevel — replace income proxy with GodWorld net-worth bands
created: 2026-08-09
updated: 2026-08-09
type: plan
tags: [engine, citizens, active]
sources:
  - phase05-citizens/generationalWealthEngine.js (deriveWealthLevel_, calculateCitizenWealth_)
  - output/simulation_ledger_snapshot.jsonl (S363 audit)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.* row"
  - "[[../SIM_DOCTRINE]] — no real-world calibration imports"
---

# WealthLevel — net-worth bands (S363, Mike-direct)

**One function rewrite. No new column. No backfill. Self-heals on next cycle fire.**

## Problem (every claim verified S363, commands + outputs below)

`deriveWealthLevel_` (generationalWealthEngine.js) ranks citizens by
`effectiveIncome = Income + 0.05 × NetWorth` and stores the result as
**WealthLevel** — an income proxy wearing a wealth label. Verified effects:

1. **Tier compression at the top.** WL 10 spans $67K (POP-00081 Carmen Mesa)
   to $10.0B (POP-00789 Elias Varek) — 148,854×. Mike's report ("300K and
   300M same tier") confirmed.
2. **Millionaires rank as working class.** POP-00208 Patrick When, NetWorth
   $1.5M, no salary → effectiveIncome $75K → WL 5 ("Working+").
3. **Unreachable rungs.** Base ladder emits only {0,2,4,5,6,7,9,10}; tiers
   1/3/8 exist solely via inheritance/debt modifiers. Live data S363: WL 8
   has zero citizens; every tier's NW range overlaps its neighbors.
4. **Doctrine violation.** Function comment: "Recalibrated for 2041 Oakland
   role-based income distribution" — real-world Oakland calibration imported
   into GodWorld, against canon rules (no real-world priors).
5. **Blast radius of the lie:** WealthLevel is a causal input read by
   `loadEventContentLedger.js`, `migrationTrackingEngine.js`,
   `educationCareerEngine.js`, `generateCitizensEvents.js`, and seeds
   `SavingsRate` via `SAVINGS_RATE_BY_WEALTH`.

### Verifying commands (run S363, outputs in session record)

```bash
# tier-vs-networth spread (shows compression + WL8 empty)
node -e '<per-tier min/max scan of output/simulation_ledger_snapshot.jsonl>'
# → WL 10: min=67K max=10000.5M spread=148854x ; WL 5 max=1.5M ; WL 8 absent

# formula + per-cycle recompute proof
sed -n '/function deriveWealthLevel_/,/^}/p' phase05-citizens/generationalWealthEngine.js
sed -n '530,585p' phase05-citizens/generationalWealthEngine.js
# → calculateCitizenWealth_ loops ALL living rows EVERY cycle → column is derived, not history
```

## Design

Replace the body of `deriveWealthLevel_` with contiguous NetWorth bands,
GodWorld-native. Proposed bands (vetting lane tunes against the live NW
distribution — target roughly monotonic deciles, keep 0–10 contiguous):

| WL | NetWorth |
|----|----------|
| 0  | < $1K |
| 1  | < $10K |
| 2  | < $25K |
| 3  | < $50K |
| 4  | < $100K |
| 5  | < $250K |
| 6  | < $500K |
| 7  | < $1M |
| 8  | < $5M |
| 9  | < $50M |
| 10 | ≥ $50M |

- Drop income and inheritance from the formula entirely (Income remains its
  own column; any engine wanting income class bands Income at read time).
- Keep the debt penalty? **No** — debt is already reflected in NetWorth.
  Formula becomes a pure band lookup. Delete the modifiers.
- `SAVINGS_RATE_BY_WEALTH` mapping stays 0–10 — no change needed.
- **Reader semantics shift** (income-class → wealth-stock): vetting lane
  eyeballs the four reader files for uses that assumed income semantics and
  flags any that need a band constant adjusted. Expected: none structural.

## Execution

1. **kimi** (or codex): rewrite `deriveWealthLevel_`, delete dead modifier
   branches, tune bands against snapshot deciles.
2. Bench-prove on SANDBOX 0720 via the §Groundhog carve-out (AGENTS.md,
   S363): one fire, then re-run the tier-spread scan against the bench sheet.
3. **Acceptance:** per-tier NW ranges monotonic and non-overlapping
   (boundary rows excepted); all tiers 0–10 reachable; Varek=10;
   Patrick When ≥ 7; zero rows unassigned.
4. Live deploy rides the next normal engine wave — NOT a solo live push.

## Approval state

- Designed: research-build S363 (this doc). Vetting per S362: kimi or codex
  sign-off required before any Claude lane touches the code — or kimi simply
  executes it as their own lane work, which needs no Claude involvement at all.
- Mike-direct constraints honored: no new column (sheet bloat), no backfill
  (self-healing derived column), GodWorld-native bands (no Oakland import).

## Reader-file eyeball (S364, research-build — closes the open item)

Result: **no structural changes needed, no band constants adjusted.**

- `migrationTrackingEngine.js`, `educationCareerEngine.js` — WealthLevel in
  header comments only; neither reads the column. Clean.
- `loadEventContentLedger.js` — `wealth` is a semantics-agnostic DSL field;
  thresholds live in sheet-authored Conditions (`wealth<=3`, one
  `wealth<=5`), retunable without a deploy. Clean.
- `generateCitizensEvents.js` (~2443) + `citizenContextBuilder.js`
  `wealthBand` (~90) — the one real threshold pair, `<=3` tight / `>=8`
  comfortable. Shift measured on the S363 snapshot (940 rows, WL recomputed
  from NetWorth with v15 bands): tight 173→120 (18.4%→12.8%); comfortable
  156→235 (16.6%→25.0%); `>=9` would capture only 31 (3.3%) and starve the
  pool. Verdict: constants stay.
- New-band distribution (n=940): 90/7/15/8/46/149/201/189/204/13/18 for
  WL 0–10 — all rungs reachable, WL8 no longer empty.

Live C103 (2026-08-10) ran the old formula and re-clobbered the S363
direct-written column — the cost of the "rides next wave" gate, retired
project-wide same night (Mike-direct S364: no code ever waits). Column
self-heals next live fire.

## Changelog

- 2026-08-09 — Designed + code landed (eda94abd); bench C117 confirm 952/956; live column direct-written.
- 2026-08-10 — Reader eyeball closed (no constant changes); LIVE DEPLOYED S364 (`clasp push`), wave gate retired.
- 2026-08-10 — Restored after repo deletion (original commits 78edbd23/5465834a lost with local clone).
